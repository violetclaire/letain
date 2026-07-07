import type { CoordinationJudgmentEvalCase } from "./coordination-judgment-eval-cases";

export const COORDINATION_JUDGMENT_FAILURE_MODES = [
  "EVIDENCE_BECAME_APPROVAL",
  "REVIEW_BECAME_SEND_AUTHORITY",
  "PERMISSIONED_STEP_LEFT_OPERATOR_SCOPE",
  "HUMAN_APPROVAL_DROPPED",
  "BLOCKED_REASON_DROPPED",
  "PRIVATE_FIELD_EXPOSED",
  "PUBLIC_VISIBILITY_TOO_EARLY",
  "FORBIDDEN_ACTION_ENABLED",
  "FORBIDDEN_ACTION_NOT_PRESERVED",
  "CONTRACTED_WORK_LANGUAGE_DROPPED",
] as const;

export type CoordinationJudgmentFailureMode = typeof COORDINATION_JUDGMENT_FAILURE_MODES[number];

export type CoordinationJudgmentEvalFinding = {
  mode: CoordinationJudgmentFailureMode;
  message: string;
};

export type CoordinationJudgmentEvalResult = {
  caseId: string;
  passed: boolean;
  findings: CoordinationJudgmentEvalFinding[];
};

const operatorOnlyVisibility = new Set(["operator", "admin"]);

const approvalTerms = [
  "approved",
  "accepted",
  "provider accepted",
  "route accepted",
  "committed",
  "confirmed",
  "ready to send",
];

const sendAuthorityTerms = [
  "send now",
  "safe to send",
  "ready to send",
  "send response",
  "approve outreach",
  "contact provider",
];

const publicVisibilityTerms = [
  "client-visible",
  "public link",
  "public schedule",
  "published schedule",
  "share with client",
];

function includesText(values: string[], expected: string): boolean {
  const normalizedExpected = expected.toLowerCase();
  return values.some((value) => value.toLowerCase().includes(normalizedExpected));
}

function combinedVisibleText(evalCase: CoordinationJudgmentEvalCase): string[] {
  const answer = evalCase.candidate.queryAnswer;
  const surface = evalCase.candidate.operatorSurface;
  return [
    answer.safeNextStepLabel,
    ...answer.blockingIssues,
    ...answer.authoritativeSignals,
    ...answer.nonAuthoritativeSignals,
    ...answer.recommendedOperatorReview,
    ...surface.visibleCopy,
    ...surface.visibleFields,
    ...surface.actionLabels,
    ...surface.publicOrClientVisibleFields,
  ];
}

function addFinding(
  findings: CoordinationJudgmentEvalFinding[],
  mode: CoordinationJudgmentFailureMode,
  message: string,
): void {
  findings.push({ mode, message });
}

function safetyCopyAllowsPublicNegation(value: string): boolean {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("no public schedule") ||
    normalized.includes("does not create a client-visible schedule") ||
    normalized.includes("does not mean client-visible schedule") ||
    normalized.includes("no client link")
  );
}

function containsStandaloneTerm(value: string, term: string): boolean {
  return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(value);
}

export function evaluateCoordinationJudgmentCase(
  evalCase: CoordinationJudgmentEvalCase,
): CoordinationJudgmentEvalResult {
  const findings: CoordinationJudgmentEvalFinding[] = [];
  const { queryAnswer, operatorSurface } = evalCase.candidate;
  const visibleText = combinedVisibleText(evalCase);

  if (evalCase.expected.requiresHumanApproval && !queryAnswer.requiresHumanApproval) {
    addFinding(findings, "HUMAN_APPROVAL_DROPPED", "required human approval was not preserved");
  }

  for (const issue of evalCase.expected.requiredBlockingIssues) {
    if (!includesText(queryAnswer.blockingIssues, issue)) {
      addFinding(findings, "BLOCKED_REASON_DROPPED", `missing blocking issue: ${issue}`);
    }
  }

  for (const signal of evalCase.expected.requiredAuthoritativeSignals) {
    if (!includesText(queryAnswer.authoritativeSignals, signal)) {
      addFinding(findings, "BLOCKED_REASON_DROPPED", `missing authoritative signal: ${signal}`);
    }
  }

  for (const artifact of evalCase.expected.requiredOperatorOnlyArtifacts) {
    if (!includesText(queryAnswer.sourceArtifacts.operatorOnly, artifact)) {
      addFinding(findings, "PRIVATE_FIELD_EXPOSED", `missing operator-only artifact: ${artifact}`);
    }
  }

  for (const forbiddenAction of evalCase.expected.requiredForbiddenActions) {
    if (!includesText(queryAnswer.forbiddenActions, forbiddenAction)) {
      addFinding(findings, "FORBIDDEN_ACTION_NOT_PRESERVED", `missing forbidden action: ${forbiddenAction}`);
    }
  }

  for (const actionLabel of operatorSurface.actionLabels) {
    if (includesText(evalCase.expected.requiredForbiddenActions, actionLabel)) {
      addFinding(findings, "FORBIDDEN_ACTION_ENABLED", `forbidden action is visible: ${actionLabel}`);
    }
  }

  if (queryAnswer.visibility.some((visibility) => !operatorOnlyVisibility.has(visibility))) {
    addFinding(findings, "PERMISSIONED_STEP_LEFT_OPERATOR_SCOPE", "query answer became visible outside operator/admin scope");
  }

  for (const privateField of evalCase.expected.privateFieldsThatMustNotBecomePublic) {
    if (includesText(operatorSurface.publicOrClientVisibleFields, privateField)) {
      addFinding(findings, "PRIVATE_FIELD_EXPOSED", `private field exposed publicly: ${privateField}`);
    }
  }

  for (const value of visibleText) {
    const normalized = value.toLowerCase();
    if (approvalTerms.some((term) => containsStandaloneTerm(value, term))) {
      addFinding(findings, "EVIDENCE_BECAME_APPROVAL", `approval or acceptance language surfaced: ${value}`);
    }
    if (queryAnswer.requiresHumanApproval && sendAuthorityTerms.some((term) => normalized.includes(term))) {
      addFinding(findings, "REVIEW_BECAME_SEND_AUTHORITY", `review state implied send/contact authority: ${value}`);
    }
    if (
      publicVisibilityTerms.some((term) => normalized.includes(term)) &&
      !safetyCopyAllowsPublicNegation(value)
    ) {
      addFinding(findings, "PUBLIC_VISIBILITY_TOO_EARLY", `public/client visibility surfaced too early: ${value}`);
    }
  }

  for (const copy of evalCase.expected.requiredSafetyCopy) {
    if (!includesText(operatorSurface.visibleCopy, copy)) {
      const mode = copy.toLowerCase().includes("contracted work")
        ? "CONTRACTED_WORK_LANGUAGE_DROPPED"
        : "BLOCKED_REASON_DROPPED";
      addFinding(findings, mode, `missing required safety copy: ${copy}`);
    }
  }

  for (const copy of evalCase.expected.requiredBoundaryCopy) {
    if (!includesText(operatorSurface.visibleCopy, copy)) {
      addFinding(findings, "EVIDENCE_BECAME_APPROVAL", `missing boundary copy: ${copy}`);
    }
  }

  return {
    caseId: evalCase.id,
    passed: findings.length === 0,
    findings,
  };
}

export function evaluateCoordinationJudgmentCases(
  evalCases: CoordinationJudgmentEvalCase[],
): CoordinationJudgmentEvalResult[] {
  return evalCases.map(evaluateCoordinationJudgmentCase);
}
