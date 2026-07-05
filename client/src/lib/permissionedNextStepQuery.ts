import type { InquiryCoordinationState, InquiryCoordinationVisibility } from "./inquiryCoordinationState";

export const PERMISSIONED_NEXT_STEP_QUERY_TYPES = [
  "can_operator_draft_response",
  "what_blocks_response_readiness",
  "what_must_be_reviewed_before_outreach",
  "what_human_approval_is_required",
  "is_this_private_evidence_only",
  "is_schedule_draft_private_context_only",
  "what_safe_next_step_label_can_be_shown",
] as const;

export type PermissionedNextStepQueryType = typeof PERMISSIONED_NEXT_STEP_QUERY_TYPES[number];

export const PERMISSIONED_NEXT_STEP_FORBIDDEN_ACTIONS = [
  "send response",
  "confirm availability",
  "create hold",
  "create contracted work",
  "approve provider route",
  "mark provider accepted",
  "run preflight",
  "contact anyone",
  "create contract",
  "collect/take payment",
  "publish schedule",
  "create client link",
  "autonomously decide next action",
  "execute next action",
] as const;

export const PERMISSIONED_NEXT_STEP_PROTECTED_BOUNDARIES = [
  "review is not approval",
  "evidence is not acceptance",
  "route reachable is not provider accepted",
  "no conflict surfaced is not date available",
  "pricing ready is not safe to send",
  "schedule draft exists is not client-visible schedule",
  "PROCEED is not autonomous action",
  "next-step query is not external action",
] as const;

export const PERMISSIONED_NEXT_STEP_VIOLET_REVIEW_NEEDED_AREAS = [
  "what counts as enough service context",
  "when drafting a response is safe",
  'what "availability reviewed" means',
  "what counts as reachable route option",
  "recovery capacity interpretation",
  "HMU schedule assumptions",
  "when a soft yes remains unresolved",
] as const;

export type PermissionedNextStepQueryAnswer = {
  queryType: PermissionedNextStepQueryType;
  allowed: boolean;
  visibility: InquiryCoordinationVisibility[];
  requiresHumanApproval: boolean;
  blockingIssues: string[];
  sourceArtifacts: {
    durable: string[];
    inferredReadOnly: string[];
    operatorOnly: string[];
  };
  authoritativeSignals: string[];
  nonAuthoritativeSignals: string[];
  recommendedOperatorReview: string[];
  forbiddenActions: string[];
  safeNextStepLabel: string;
};

function list(value: string | number | null | undefined): string[] {
  return value === null || value === undefined || value === "" ? [] : [String(value)];
}

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim().length > 0))));
}

function authoritativeSignalsFrom(state: InquiryCoordinationState): string[] {
  return unique([
    ...list(state.coordinationPermission.decision).map((decision) => `permission decision: ${decision}`),
    ...list(state.coordinationPermission.confidence).map((confidence) => `confidence: ${confidence}`),
    ...state.coordinationPermission.riskFactors.map((risk) => `backend risk factor: ${risk}`),
    ...state.coordinationPermission.missingSignals.map((signal) => `backend missing signal: ${signal}`),
    ...list(state.coordinationPermission.recommendedNextAction).map((action) => `recommended next action: ${action}`),
    state.operatorReviewState.humanJudgmentRequired ? "human judgment required" : null,
  ]);
}

function nonAuthoritativeSignalsFrom(state: InquiryCoordinationState): string[] {
  return unique([
    state.availabilityState.datePresent ? "date signal: present" : "date signal: missing",
    state.availabilityState.conflictSurfaced ? "conflict signal: surfaced" : "conflict signal: no conflict surfaced",
    state.availabilityState.sourceOfTruthReviewRequired ? "calendar/source-of-truth review required" : null,
    state.pricingInfoState.ready ? "pricing/info readiness: ready" : "pricing/info readiness: missing",
    state.routeReadiness.reachableOptions > 0
      ? `route contact readiness: ${state.routeReadiness.reachableOptions} reachable option(s)`
      : "route contact readiness: no reachable option",
    state.routeEvidenceState.routeOptionReviewed ? "private route evidence exists" : null,
    state.recoveryEvidenceState.recoveryReviewed ? "private recovery evidence exists" : null,
    state.operatorReviewState.latestReview ? "operator review log present" : null,
    state.timelineState.privateReviews > 0 ? "private timeline review marker present" : null,
    state.scheduleDraftState.exists ? "schedule draft linked/private status present" : null,
  ]);
}

function reviewPromptsFor(queryType: PermissionedNextStepQueryType, state: InquiryCoordinationState): string[] {
  const blockers = state.blockingIssues.map((issue) => `Review blocker: ${issue}`);

  switch (queryType) {
    case "can_operator_draft_response":
      return unique([
        ...blockers,
        state.requiresHumanApproval ? "Human approval is required before outreach." : null,
        "Drafting remains private; nothing sends from this query.",
      ]);
    case "what_blocks_response_readiness":
      return blockers.length > 0 ? blockers : ["No blocking issue is surfaced from the current private state."];
    case "what_must_be_reviewed_before_outreach":
      return unique([
        ...state.operatorReviewState.checklist,
        state.recommendedNextStep ? `Recommended next step: ${state.recommendedNextStep}` : null,
      ]);
    case "what_human_approval_is_required":
      return state.requiresHumanApproval
        ? unique(["Human approval is required.", ...state.coordinationPermission.riskFactors, ...state.coordinationPermission.missingSignals])
        : ["No human approval requirement is surfaced from the current private state."];
    case "is_this_private_evidence_only":
      return [
        "Treat private review and route/recovery evidence as evidence only; it does not create approval or acceptance.",
      ];
    case "is_schedule_draft_private_context_only":
      return [
        "Treat schedule draft state as private context only; it does not create a client-visible schedule.",
      ];
    case "what_safe_next_step_label_can_be_shown":
      return unique([
        state.recommendedNextStep ?? "Review current private coordination state.",
        state.requiresHumanApproval ? "Surface as operator review, not external action." : null,
      ]);
  }
}

function safeNextStepLabelFor(queryType: PermissionedNextStepQueryType, state: InquiryCoordinationState): string {
  switch (queryType) {
    case "can_operator_draft_response":
      return state.requiresHumanApproval || state.blockingIssues.length > 0
        ? "Review before drafting response"
        : "Draft privately for operator review";
    case "what_blocks_response_readiness":
      return state.blockingIssues.length > 0 ? "Review response blockers" : "No response blockers surfaced";
    case "what_must_be_reviewed_before_outreach":
      return "Review before outreach";
    case "what_human_approval_is_required":
      return state.requiresHumanApproval ? "Human approval required" : "No human approval requirement surfaced";
    case "is_this_private_evidence_only":
      return "Evidence only";
    case "is_schedule_draft_private_context_only":
      return "Private draft context only";
    case "what_safe_next_step_label_can_be_shown":
      return state.requiresHumanApproval ? "Operator review required" : "Private next step can be reviewed";
  }
}

export function answerPermissionedNextStepQuery(
  state: InquiryCoordinationState,
  queryType: PermissionedNextStepQueryType,
): PermissionedNextStepQueryAnswer {
  return {
    queryType,
    allowed: true,
    visibility: state.visibleTo,
    requiresHumanApproval: state.requiresHumanApproval,
    blockingIssues: state.blockingIssues,
    sourceArtifacts: {
      durable: state.sourceArtifacts.durable,
      inferredReadOnly: state.sourceArtifacts.inferredReadOnly,
      operatorOnly: state.sourceArtifacts.operatorOnly,
    },
    authoritativeSignals: authoritativeSignalsFrom(state),
    nonAuthoritativeSignals: nonAuthoritativeSignalsFrom(state),
    recommendedOperatorReview: reviewPromptsFor(queryType, state),
    forbiddenActions: [...PERMISSIONED_NEXT_STEP_FORBIDDEN_ACTIONS],
    safeNextStepLabel: safeNextStepLabelFor(queryType, state),
  };
}
