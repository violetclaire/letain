import {
  runCoordinationJudgmentTraceEvalSuite,
  type CoordinationJudgmentTraceEvalSuiteResult,
} from "./coordination-judgment-trace-eval-suite";

export const COORDINATION_JUDGMENT_EVAL_COVERAGE_TAXONOMY_VERSION =
  "coordination-judgment-eval-coverage-v1";

export const COORDINATION_JUDGMENT_COVERAGE_JUDGMENT_STATES = [
  "ready_for_operator_review",
  "blocked_not_ready_for_external_action",
  "escalation_required",
  "conflict_requires_human_resolution",
  "recovery_needed",
  "authority_attempt_blocked",
] as const;

export const COORDINATION_JUDGMENT_COVERAGE_PERMISSION_BOUNDARIES = [
  "evidence_does_not_mean_approval",
  "review_does_not_mean_send_authority",
  "no_invoice_contract_payment_without_authority",
  "private_context_not_public",
  "no_public_or_client_link_without_authority",
  "no_provider_acceptance_without_authority",
  "no_ai_action_without_human_approval",
] as const;

export const COORDINATION_JUDGMENT_COVERAGE_COORDINATION_SIGNALS = [
  "date_time_confirmation",
  "location_scope",
  "service_scope",
  "decision_maker_clarity",
  "pricing_availability_confirmation",
  "private_schedule_context",
  "operator_approval_required",
  "missing_authority",
  "provider_acceptance_state",
  "recovery_capacity",
  "conflict_resolution",
] as const;

export type CoordinationJudgmentCoverageJudgmentState =
  typeof COORDINATION_JUDGMENT_COVERAGE_JUDGMENT_STATES[number];

export type CoordinationJudgmentCoveragePermissionBoundary =
  typeof COORDINATION_JUDGMENT_COVERAGE_PERMISSION_BOUNDARIES[number];

export type CoordinationJudgmentCoverageCoordinationSignal =
  typeof COORDINATION_JUDGMENT_COVERAGE_COORDINATION_SIGNALS[number];

export type CoordinationJudgmentCoverageItem =
  | CoordinationJudgmentCoverageJudgmentState
  | CoordinationJudgmentCoveragePermissionBoundary
  | CoordinationJudgmentCoverageCoordinationSignal;

export type CoordinationJudgmentEvalCoverageReport = {
  taxonomyVersion: typeof COORDINATION_JUDGMENT_EVAL_COVERAGE_TAXONOMY_VERSION;
  suiteId: CoordinationJudgmentTraceEvalSuiteResult["suiteId"];
  suiteVersion: CoordinationJudgmentTraceEvalSuiteResult["suiteVersion"];
  totalRequiredCoverageItems: number;
  coveredItems: CoordinationJudgmentCoverageItem[];
  missingItems: CoordinationJudgmentCoverageItem[];
  coveredJudgmentStates: CoordinationJudgmentCoverageJudgmentState[];
  missingJudgmentStates: CoordinationJudgmentCoverageJudgmentState[];
  coveredPermissionBoundaries: CoordinationJudgmentCoveragePermissionBoundary[];
  missingPermissionBoundaries: CoordinationJudgmentCoveragePermissionBoundary[];
  coveredCoordinationSignals: CoordinationJudgmentCoverageCoordinationSignal[];
  missingCoordinationSignals: CoordinationJudgmentCoverageCoordinationSignal[];
  fixtureCount: number;
  sourceTraceIds: string[];
  evalCaseCandidateIds: string[];
  coveragePercent: number;
  readyForExpandedEvalSuite: boolean;
};

function normalize(values: string[]): string[] {
  return values.map((value) => value.toLowerCase());
}

function includesAny(values: string[], needles: string[]): boolean {
  const normalizedValues = normalize(values);
  return needles.some((needle) => {
    const normalizedNeedle = needle.toLowerCase();
    return normalizedValues.some((value) => value.includes(normalizedNeedle));
  });
}

function includesFailureMode(
  suiteReport: CoordinationJudgmentTraceEvalSuiteResult,
  failureMode: string,
): boolean {
  return suiteReport.failureModeTagsCovered.includes(failureMode);
}

function missingFromRequired<T extends string>(required: readonly T[], covered: T[]): T[] {
  return required.filter((item) => !covered.includes(item));
}

function roundPercent(coveredCount: number, requiredCount: number): number {
  if (requiredCount === 0) return 0;
  return Math.round((coveredCount / requiredCount) * 10000) / 100;
}

function coveredJudgmentStates(
  suiteReport: CoordinationJudgmentTraceEvalSuiteResult,
): CoordinationJudgmentCoverageJudgmentState[] {
  const covered: CoordinationJudgmentCoverageJudgmentState[] = [];

  if (includesAny(suiteReport.safeNextStepsCovered, ["review private response draft before outreach"])) {
    covered.push("ready_for_operator_review");
  }

  if (
    includesAny(suiteReport.safeNextStepsCovered, ["request missing information"]) ||
    includesAny(suiteReport.blockedReasonsCovered, ["missing date/time confirmation", "authority not established"])
  ) {
    covered.push("blocked_not_ready_for_external_action");
  }

  if (
    includesAny(suiteReport.safeNextStepsCovered, ["block attempted external action"]) ||
    includesAny(suiteReport.blockedReasonsCovered, ["attempted external action"])
  ) {
    covered.push("authority_attempt_blocked");
  }

  if (
    includesAny(suiteReport.safeNextStepsCovered, ["escalate high-risk coordination issue"]) ||
    includesAny(suiteReport.blockedReasonsCovered, ["escalation required"])
  ) {
    covered.push("escalation_required");
  }

  if (
    includesAny(suiteReport.safeNextStepsCovered, ["resolve conflicting coordination signals"]) ||
    includesAny(suiteReport.blockedReasonsCovered, ["conflicting"])
  ) {
    covered.push("conflict_requires_human_resolution");
  }

  if (
    includesAny(suiteReport.safeNextStepsCovered, ["human recovery review"]) ||
    includesAny(suiteReport.blockedReasonsCovered, ["recovery needed", "requires recovery"])
  ) {
    covered.push("recovery_needed");
  }

  return covered;
}

function coveredPermissionBoundaries(
  suiteReport: CoordinationJudgmentTraceEvalSuiteResult,
): CoordinationJudgmentCoveragePermissionBoundary[] {
  const covered: CoordinationJudgmentCoveragePermissionBoundary[] = [];

  if (includesFailureMode(suiteReport, "EVIDENCE_BECAME_APPROVAL")) {
    covered.push("evidence_does_not_mean_approval");
  }

  if (includesFailureMode(suiteReport, "REVIEW_BECAME_SEND_AUTHORITY")) {
    covered.push("review_does_not_mean_send_authority");
  }

  if (
    includesAny(suiteReport.forbiddenActionsCovered, ["create invoice", "create contract", "create payment"]) &&
    includesAny(suiteReport.blockedReasonsCovered, ["contract/payment/invoice authority not established"])
  ) {
    covered.push("no_invoice_contract_payment_without_authority");
  }

  if (
    includesAny(suiteReport.privateOnlySignalsCovered, ["private schedule handoff", "operator review checklist"]) &&
    includesAny(suiteReport.blockedReasonsCovered, ["private schedule context cannot be exposed"])
  ) {
    covered.push("private_context_not_public");
  }

  if (includesAny(suiteReport.forbiddenActionsCovered, ["create client link", "publish schedule", "public schedule"])) {
    covered.push("no_public_or_client_link_without_authority");
  }

  if (includesAny(suiteReport.forbiddenActionsCovered, ["mark provider accepted"])) {
    covered.push("no_provider_acceptance_without_authority");
  }

  if (
    suiteReport.humanApprovalRequiredCount > 0 &&
    includesAny(suiteReport.forbiddenActionsCovered, ["AI decision", "execute next action"])
  ) {
    covered.push("no_ai_action_without_human_approval");
  }

  return covered;
}

function coveredCoordinationSignals(
  suiteReport: CoordinationJudgmentTraceEvalSuiteResult,
): CoordinationJudgmentCoverageCoordinationSignal[] {
  const covered: CoordinationJudgmentCoverageCoordinationSignal[] = [];

  if (includesAny(suiteReport.blockedReasonsCovered, ["date/time confirmation"])) {
    covered.push("date_time_confirmation");
  }

  if (includesAny(suiteReport.blockedReasonsCovered, ["location/service scope"])) {
    covered.push("location_scope");
    covered.push("service_scope");
  }

  if (includesAny(suiteReport.blockedReasonsCovered, ["decision-maker"])) {
    covered.push("decision_maker_clarity");
  }

  if (includesAny(suiteReport.blockedReasonsCovered, ["pricing or availability confirmation"])) {
    covered.push("pricing_availability_confirmation");
  }

  if (
    includesAny(suiteReport.privateOnlySignalsCovered, ["private schedule handoff"]) ||
    includesAny(suiteReport.blockedReasonsCovered, ["private schedule context cannot be exposed"])
  ) {
    covered.push("private_schedule_context");
  }

  if (suiteReport.humanApprovalRequiredCount > 0 || includesAny(suiteReport.blockedReasonsCovered, ["operator approval"])) {
    covered.push("operator_approval_required");
  }

  if (includesAny(suiteReport.blockedReasonsCovered, ["authority not established"])) {
    covered.push("missing_authority");
  }

  if (includesAny(suiteReport.blockedReasonsCovered, ["conflicting"])) {
    covered.push("conflict_resolution");
  }

  if (
    includesAny(suiteReport.blockedReasonsCovered, ["recovery needed", "requires recovery"]) ||
    includesAny(suiteReport.privateOnlySignalsCovered, ["private recovery note"])
  ) {
    covered.push("recovery_capacity");
  }

  return covered;
}

export function assessCoordinationJudgmentEvalCoverage(
  suiteReport: CoordinationJudgmentTraceEvalSuiteResult = runCoordinationJudgmentTraceEvalSuite(),
): CoordinationJudgmentEvalCoverageReport {
  const judgmentStates = coveredJudgmentStates(suiteReport);
  const permissionBoundaries = coveredPermissionBoundaries(suiteReport);
  const coordinationSignals = coveredCoordinationSignals(suiteReport);

  const coveredItems: CoordinationJudgmentCoverageItem[] = [
    ...judgmentStates,
    ...permissionBoundaries,
    ...coordinationSignals,
  ];
  const totalRequiredCoverageItems =
    COORDINATION_JUDGMENT_COVERAGE_JUDGMENT_STATES.length +
    COORDINATION_JUDGMENT_COVERAGE_PERMISSION_BOUNDARIES.length +
    COORDINATION_JUDGMENT_COVERAGE_COORDINATION_SIGNALS.length;
  const missingJudgmentStates = missingFromRequired(
    COORDINATION_JUDGMENT_COVERAGE_JUDGMENT_STATES,
    judgmentStates,
  );
  const missingPermissionBoundaries = missingFromRequired(
    COORDINATION_JUDGMENT_COVERAGE_PERMISSION_BOUNDARIES,
    permissionBoundaries,
  );
  const missingCoordinationSignals = missingFromRequired(
    COORDINATION_JUDGMENT_COVERAGE_COORDINATION_SIGNALS,
    coordinationSignals,
  );
  const missingItems: CoordinationJudgmentCoverageItem[] = [
    ...missingJudgmentStates,
    ...missingPermissionBoundaries,
    ...missingCoordinationSignals,
  ];

  return {
    taxonomyVersion: COORDINATION_JUDGMENT_EVAL_COVERAGE_TAXONOMY_VERSION,
    suiteId: suiteReport.suiteId,
    suiteVersion: suiteReport.suiteVersion,
    totalRequiredCoverageItems,
    coveredItems,
    missingItems,
    coveredJudgmentStates: judgmentStates,
    missingJudgmentStates,
    coveredPermissionBoundaries: permissionBoundaries,
    missingPermissionBoundaries,
    coveredCoordinationSignals: coordinationSignals,
    missingCoordinationSignals,
    fixtureCount: suiteReport.totalTraceFixtures,
    sourceTraceIds: suiteReport.sourceTraceIds,
    evalCaseCandidateIds: suiteReport.evalCaseCandidateIds,
    coveragePercent: roundPercent(coveredItems.length, totalRequiredCoverageItems),
    readyForExpandedEvalSuite: suiteReport.failed === 0 && missingItems.length > 0,
  };
}
