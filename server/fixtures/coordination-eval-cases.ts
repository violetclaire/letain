export type CoordinationEvalDecision =
  | "PROCEED"
  | "PROCEED_WITH_OVERSIGHT"
  | "CLARIFY"
  | "REROUTE"
  | "ESCALATE"
  | "STOP";

export interface CoordinationEvalCaseFixture {
  id: string;
  scenarioType: string;
  description: string;
  redacted: true;
  synthetic: true;
  rawContentIncluded: false;
  contentHash: `sha256:${string}`;
  subject: "coordination_path";
  operatorScope: "private";
  expectedDecision: CoordinationEvalDecision;
  expectedRiskFactors: string[];
  expectedMissingSignals: string[];
  expectedHumanReview: boolean;
  sourceSignals: string[];
}

export const coordinationEvalCases: CoordinationEvalCaseFixture[] = [
  {
    id: "eval-missing-event-date",
    scenarioType: "missing_event_date",
    description: "Inquiry context lacks the date needed to judge readiness.",
    redacted: true,
    synthetic: true,
    rawContentIncluded: false,
    contentHash: "sha256:synthetic-missing-event-date",
    subject: "coordination_path",
    operatorScope: "private",
    expectedDecision: "CLARIFY",
    expectedRiskFactors: ["MISSING_CONTEXT"],
    expectedMissingSignals: ["context_captured"],
    expectedHumanReview: true,
    sourceSignals: ["coordination_path", "inquiry_redacted_summary"],
  },
  {
    id: "eval-route-target-no-response",
    scenarioType: "route_target_no_response",
    description: "A route target exists, but the handoff has not been confirmed.",
    redacted: true,
    synthetic: true,
    rawContentIncluded: false,
    contentHash: "sha256:synthetic-route-target-no-response",
    subject: "coordination_path",
    operatorScope: "private",
    expectedDecision: "PROCEED_WITH_OVERSIGHT",
    expectedRiskFactors: ["UNCONFIRMED_HANDOFF"],
    expectedMissingSignals: [],
    expectedHumanReview: true,
    sourceSignals: ["coordination_path", "route_target_redacted_summary"],
  },
  {
    id: "eval-unavailable-route-target",
    scenarioType: "schedule_understaffed",
    description: "The selected route target is unavailable for the path.",
    redacted: true,
    synthetic: true,
    rawContentIncluded: false,
    contentHash: "sha256:synthetic-unavailable-route-target",
    subject: "coordination_path",
    operatorScope: "private",
    expectedDecision: "REROUTE",
    expectedRiskFactors: ["UNAVAILABLE_ROUTE_TARGET"],
    expectedMissingSignals: [],
    expectedHumanReview: true,
    sourceSignals: ["coordination_path", "route_target_redacted_summary"],
  },
  {
    id: "eval-authority-denied",
    scenarioType: "operator_review_required",
    description: "The path lacks authority to continue without human judgment.",
    redacted: true,
    synthetic: true,
    rawContentIncluded: false,
    contentHash: "sha256:synthetic-authority-denied",
    subject: "coordination_path",
    operatorScope: "private",
    expectedDecision: "ESCALATE",
    expectedRiskFactors: ["UNCLEAR_AUTHORITY"],
    expectedMissingSignals: ["authority_state"],
    expectedHumanReview: true,
    sourceSignals: ["coordination_path", "operator_review_redacted_summary"],
  },
  {
    id: "eval-insufficient-time-buffer",
    scenarioType: "conflicting_context",
    description: "The path has too little timing buffer and no recovery capacity.",
    redacted: true,
    synthetic: true,
    rawContentIncluded: false,
    contentHash: "sha256:synthetic-insufficient-time-buffer",
    subject: "coordination_path",
    operatorScope: "private",
    expectedDecision: "STOP",
    expectedRiskFactors: ["INSUFFICIENT_TIME_BUFFER", "LOW_RECOVERY_CAPACITY"],
    expectedMissingSignals: [],
    expectedHumanReview: true,
    sourceSignals: ["coordination_path", "timing_redacted_summary"],
  },
  {
    id: "eval-low-risk-complete-path",
    scenarioType: "high_trust_recovery_after_failure",
    description: "Required state is present and recovery capacity is sufficient.",
    redacted: true,
    synthetic: true,
    rawContentIncluded: false,
    contentHash: "sha256:synthetic-low-risk-complete-path",
    subject: "coordination_path",
    operatorScope: "private",
    expectedDecision: "PROCEED",
    expectedRiskFactors: [],
    expectedMissingSignals: [],
    expectedHumanReview: false,
    sourceSignals: ["coordination_path", "inquiry_redacted_summary", "coordination_events"],
  },
];
