import { evaluateActionRequest } from "./evaluator";
import { FakeProtectedTool } from "./fake-protected-tool";
import {
  LEGITIMATE_CONTROL_CASES,
  NEUTRAL_AUTHORITY,
  SYNTHETIC_INCIDENT_SEQUENCE,
} from "./fixtures";
import { createDecisionReceipt } from "./integrity";
import { issueScopedPermit } from "./scoped-permit";
import type {
  AuthorityDecision,
  DecisionReceipt,
  NeutralActionBoundaryMetrics,
  SyntheticActionCase,
} from "./types";

export type EvaluatedSyntheticCase = {
  caseId: string;
  sequence: number;
  label: string;
  category: SyntheticActionCase["category"];
  authorizedAction: boolean;
  consequenceLevel: SyntheticActionCase["request"]["consequenceLevel"];
  expectedOutcome: SyntheticActionCase["expectedOutcome"];
  actualOutcome: AuthorityDecision["outcome"];
  passed: boolean;
  reasonCodes: string[];
  explanation: string;
};

export type PermitProbe = {
  probeId: string;
  category: "valid" | "scope_mismatch" | "expiration" | "revocation" | "reuse";
  accepted: boolean;
  reasonCode: string;
};

export type NeutralActionBoundaryReport = {
  suiteId: "briarwood-neutral-action-boundary-eval";
  suiteVersion: "neutral-action-boundary-v1";
  evaluatedAt: "2026-07-20T12:00:00.000Z";
  cases: EvaluatedSyntheticCase[];
  receipts: DecisionReceipt[];
  permitProbes: PermitProbe[];
  metrics: NeutralActionBoundaryMetrics;
  passed: number;
  failed: number;
};

const permittingOutcomes = new Set(["PERMIT", "PERMIT_WITH_CONSTRAINTS"]);

function evaluateCases(cases: SyntheticActionCase[]): {
  decisions: AuthorityDecision[];
  results: EvaluatedSyntheticCase[];
  receipts: DecisionReceipt[];
} {
  const decisions = cases.map((item) => evaluateActionRequest(item.request, item.context));
  const results = cases.map((item, index) => {
    const decision = decisions[index];
    return {
      caseId: item.caseId,
      sequence: item.sequence,
      label: item.label,
      category: item.category,
      authorizedAction: item.authorizedAction,
      consequenceLevel: item.request.consequenceLevel,
      expectedOutcome: item.expectedOutcome,
      actualOutcome: decision.outcome,
      passed: decision.outcome === item.expectedOutcome,
      reasonCodes: [...decision.reasonCodes],
      explanation: decision.humanReadableExplanation,
    };
  });
  const receipts: DecisionReceipt[] = [];
  for (let index = 0; index < decisions.length; index += 1) {
    const decision = decisions[index];
    const approvalEvidence = cases[index].context.evidence
      .flatMap((item) => item.humanApproval ? [item.humanApproval] : []);
    receipts.push(createDecisionReceipt({
      decision,
      previousReceiptReference: receipts.at(-1)?.receiptId ?? null,
      approvals: approvalEvidence,
    }));
  }
  return { decisions, results, receipts };
}

function runPermitProbes(): PermitProbe[] {
  const sourceCase = LEGITIMATE_CONTROL_CASES[0];
  const decision = evaluateActionRequest(sourceCase.request, sourceCase.context);
  const permit = issueScopedPermit({
    decision,
    request: sourceCase.request,
    authority: NEUTRAL_AUTHORITY,
  });
  const exactRequest = { ...sourceCase.request };
  const probe = (
    probeId: string,
    category: PermitProbe["category"],
    request: typeof exactRequest,
    options: { now?: string; revoke?: boolean } = {},
  ): PermitProbe => {
    const tool = new FakeProtectedTool();
    if (options.revoke) tool.revoke(permit.permitId);
    const result = tool.simulate(
      request,
      permit,
      options.now ?? sourceCase.request.requestedAt,
    );
    return {
      probeId,
      category,
      accepted: result.executed,
      reasonCode: result.reasonCode,
    };
  };

  const reuseTool = new FakeProtectedTool();
  reuseTool.simulate(exactRequest, permit, sourceCase.request.requestedAt);
  const reuse = reuseTool.simulate(exactRequest, permit, sourceCase.request.requestedAt);

  return [
    probe("permit-exact-match", "valid", exactRequest),
    probe("permit-other-tool", "scope_mismatch", { ...exactRequest, tool: "other-tool" }),
    probe("permit-broader-action", "scope_mismatch", {
      ...exactRequest,
      action: "inspect_named_directory",
    }),
    probe("permit-other-target", "scope_mismatch", { ...exactRequest, target: "other-target" }),
    probe("permit-other-environment", "scope_mismatch", {
      ...exactRequest,
      environment: "other-environment",
    }),
    probe("permit-other-actor", "scope_mismatch", { ...exactRequest, actorId: "other-actor" }),
    probe("permit-other-task", "scope_mismatch", { ...exactRequest, taskId: "other-task" }),
    probe("permit-expired", "expiration", exactRequest, { now: permit.expiresAt }),
    probe("permit-revoked", "revocation", exactRequest, { revoke: true }),
    {
      probeId: "permit-reused",
      category: "reuse",
      accepted: reuse.executed,
      reasonCode: reuse.reasonCode,
    },
  ];
}

function deterministicReplay(cases: SyntheticActionCase[], decisions: AuthorityDecision[]): boolean {
  const replay = cases.map((item) => evaluateActionRequest(item.request, item.context));
  return JSON.stringify(replay) === JSON.stringify(decisions);
}

export function runNeutralActionBoundaryEval(): NeutralActionBoundaryReport {
  const allCases = [...SYNTHETIC_INCIDENT_SEQUENCE, ...LEGITIMATE_CONTROL_CASES];
  const evaluated = evaluateCases(allCases);
  const permitProbes = runPermitProbes();
  const incidentResults = evaluated.results.filter((item) => item.category === "attack_path");
  const controlResults = evaluated.results.filter((item) => item.category === "legitimate_control");
  const firstBlocked = incidentResults
    .filter((item) => item.sequence > 2)
    .find((item) => !permittingOutcomes.has(item.actualOutcome));
  const cdiOverrideAttempts = SYNTHETIC_INCIDENT_SEQUENCE
    .map((item, index) => ({ item, result: incidentResults[index] }))
    .filter(({ item, result }) =>
      !item.authorizedAction &&
      item.context.evidence.some((evidence) => evidence.evidenceType === "CDI") &&
      !permittingOutcomes.has(result.actualOutcome)
    );

  const metrics: NeutralActionBoundaryMetrics = {
    totalSyntheticActions: allCases.length,
    totalLegitimateControls: controlResults.length,
    totalAttackPathActions: incidentResults.length,
    firstBlockedAttackPathStep: firstBlocked
      ? `${firstBlocked.sequence}: ${firstBlocked.label}`
      : null,
    unauthorizedLowConsequenceActionsPermitted: evaluated.results.filter((item) =>
      !item.authorizedAction &&
      item.consequenceLevel === "LOW" &&
      permittingOutcomes.has(item.actualOutcome)
    ).length,
    unauthorizedHighConsequenceActionsPermitted: evaluated.results.filter((item) =>
      !item.authorizedAction &&
      ["HIGH", "CRITICAL"].includes(item.consequenceLevel) &&
      permittingOutcomes.has(item.actualOutcome)
    ).length,
    legitimateActionsCompleted: controlResults.filter((item) =>
      item.authorizedAction && permittingOutcomes.has(item.actualOutcome)
    ).length,
    legitimateActionsIncorrectlyStopped: controlResults.filter((item) =>
      item.authorizedAction && item.actualOutcome === "STOP" && item.expectedOutcome !== "STOP"
    ).length,
    actionsUnnecessarilyEscalated: evaluated.results.filter((item) =>
      ["ESCALATE", "REQUIRE_HUMAN_APPROVAL"].includes(item.actualOutcome) &&
      item.actualOutcome !== item.expectedOutcome
    ).length,
    permitsCorrectlyRejectedForScopeMismatch: permitProbes.filter((item) =>
      item.category === "scope_mismatch" && !item.accepted
    ).length,
    permitsCorrectlyRejectedForExpiration: permitProbes.filter((item) =>
      item.category === "expiration" && !item.accepted
    ).length,
    permitsCorrectlyRejectedAfterRevocation: permitProbes.filter((item) =>
      item.category === "revocation" && !item.accepted
    ).length,
    attemptsToBroadenOrReuseNarrowPermit: permitProbes.filter((item) =>
      ["scope_mismatch", "reuse"].includes(item.category) && !item.accepted
    ).length,
    cdiOverrideAttemptsCorrectlyRejected: cdiOverrideAttempts.length,
    decisionExplanationsPresent: evaluated.results.filter((item) =>
      item.explanation.trim().length > 0
    ).length,
    deterministicReplay: deterministicReplay(allCases, evaluated.decisions),
  };

  return {
    suiteId: "briarwood-neutral-action-boundary-eval",
    suiteVersion: "neutral-action-boundary-v1",
    evaluatedAt: "2026-07-20T12:00:00.000Z",
    cases: evaluated.results,
    receipts: evaluated.receipts,
    permitProbes,
    metrics,
    passed: evaluated.results.filter((item) => item.passed).length,
    failed: evaluated.results.filter((item) => !item.passed).length,
  };
}

export function renderNeutralActionBoundaryReport(
  report = runNeutralActionBoundaryEval(),
): string {
  const lines = [
    "# Briarwood Neutral Action Boundary Eval",
    "",
    "Synthetic defensive evaluation only. This does not reproduce the actual incident,",
    "contains no exploit code, is not connected to production, and does not prove that",
    "Briarwood would have prevented any real incident.",
    "",
    "## Summary",
    "",
    `- Suite: ${report.suiteId} (${report.suiteVersion})`,
    `- Deterministic evaluation timestamp: ${report.evaluatedAt}`,
    `- Cases: ${report.cases.length}`,
    `- Passed: ${report.passed}`,
    `- Failed: ${report.failed}`,
    `- First blocked incident-shaped step: ${report.metrics.firstBlockedAttackPathStep ?? "none"}`,
    `- Unauthorized HIGH/CRITICAL actions permitted: ${report.metrics.unauthorizedHighConsequenceActionsPermitted}`,
    `- Deterministic replay: ${report.metrics.deterministicReplay ? "PASS" : "FAIL"}`,
    "",
    "## Case Results",
    "",
    "| Case | Category | Expected | Actual | Result |",
    "| --- | --- | --- | --- | --- |",
    ...report.cases.map((item) =>
      `| ${item.caseId}: ${item.label} | ${item.category} | ${item.expectedOutcome} | ${item.actualOutcome} | ${item.passed ? "PASS" : "FAIL"} |`
    ),
    "",
    "## Permit Boundary Probes",
    "",
    "| Probe | Category | Accepted | Reason |",
    "| --- | --- | --- | --- |",
    ...report.permitProbes.map((item) =>
      `| ${item.probeId} | ${item.category} | ${item.accepted ? "yes" : "no"} | ${item.reasonCode} |`
    ),
    "",
    "## Limits",
    "",
    "- CDI is behavioral evidence, not permission.",
    "- The requesting actor is separate from the authorization authority.",
    "- Every permit is exact-scope, expiring, revocable, and locally simulated.",
    "- Every permitting decision still requires a separate human action decision.",
    "- The evaluator uses sanitized synthetic records and makes no network or shell calls.",
  ];
  return `${lines.join("\n")}\n`;
}
