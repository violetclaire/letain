export const COORDINATION_JUDGMENT_EVAL_VERSION = "coordination-judgment-v1" as const;

export type CoordinationJudgmentEvalVersion = typeof COORDINATION_JUDGMENT_EVAL_VERSION;

export type CoordinationJudgmentVisibility = "operator" | "admin" | "client" | "public";

export type CoordinationJudgmentQueryType =
  | "can_operator_draft_response"
  | "what_blocks_response_readiness"
  | "what_must_be_reviewed_before_outreach"
  | "what_human_approval_is_required"
  | "is_this_private_evidence_only"
  | "is_schedule_draft_private_context_only"
  | "what_safe_next_step_label_can_be_shown";

export type CoordinationJudgmentSourceArtifacts = {
  durable: string[];
  inferredReadOnly: string[];
  operatorOnly: string[];
};

export type CoordinationJudgmentQueryAnswer = {
  queryType: CoordinationJudgmentQueryType;
  allowed: boolean;
  visibility: CoordinationJudgmentVisibility[];
  requiresHumanApproval: boolean;
  blockingIssues: string[];
  sourceArtifacts: CoordinationJudgmentSourceArtifacts;
  authoritativeSignals: string[];
  nonAuthoritativeSignals: string[];
  recommendedOperatorReview: string[];
  forbiddenActions: string[];
  safeNextStepLabel: string;
};

export type CoordinationJudgmentOperatorSurface = {
  visibleCopy: string[];
  visibleFields: string[];
  actionLabels: string[];
  publicOrClientVisibleFields: string[];
};

export type CoordinationJudgmentCandidate = {
  queryAnswer: CoordinationJudgmentQueryAnswer;
  operatorSurface: CoordinationJudgmentOperatorSurface;
};

export type CoordinationJudgmentEvalCase = {
  id: string;
  version: CoordinationJudgmentEvalVersion;
  description: string;
  synthetic: true;
  redacted: true;
  rawTranscriptIncluded: false;
  coreQuestion: "Did the system preserve the human judgment needed before moving real-world coordination forward?";
  candidate: CoordinationJudgmentCandidate;
  expected: {
    requiresHumanApproval: boolean;
    requiredBlockingIssues: string[];
    requiredForbiddenActions: string[];
    requiredAuthoritativeSignals: string[];
    requiredOperatorOnlyArtifacts: string[];
    privateFieldsThatMustNotBecomePublic: string[];
    requiredSafetyCopy: string[];
    requiredBoundaryCopy: string[];
  };
};

const sharedForbiddenActions = [
  "send response",
  "send email",
  "send SMS",
  "create invoice",
  "send invoice",
  "create contract",
  "upload contract",
  "send for signature",
  "create payment",
  "collect payment",
  "connect Square",
  "create client link",
  "publish schedule",
  "create public schedule",
  "run preflight",
  "create route",
  "contact anyone",
  "mark provider accepted",
  "create client",
  "AI decision",
  "execute next action",
];

export const coordinationJudgmentEvalCases: CoordinationJudgmentEvalCase[] = [
  {
    id: "judgment-oversight-preserves-human-review",
    version: COORDINATION_JUDGMENT_EVAL_VERSION,
    description: "Proceed with oversight must remain an operator review state, not permission to act.",
    synthetic: true,
    redacted: true,
    rawTranscriptIncluded: false,
    coreQuestion: "Did the system preserve the human judgment needed before moving real-world coordination forward?",
    candidate: {
      queryAnswer: {
        queryType: "what_must_be_reviewed_before_outreach",
        allowed: true,
        visibility: ["operator", "admin"],
        requiresHumanApproval: true,
        blockingIssues: [
          "Missing signal: Route target acceptance",
          "Missing signal: Recovery provider confirmation",
        ],
        sourceArtifacts: {
          durable: ["coordination_assessments", "coordination_events"],
          inferredReadOnly: ["operator review checklist", "route contact readiness"],
          operatorOnly: ["private review log", "private route/recovery evidence log"],
        },
        authoritativeSignals: [
          "permission decision: PROCEED_WITH_OVERSIGHT",
          "backend risk factor: UNCONFIRMED_HANDOFF",
          "backend risk factor: LOW_RECOVERY_CAPACITY",
          "human judgment required",
        ],
        nonAuthoritativeSignals: [
          "route contact readiness: 1 reachable option(s)",
          "private route evidence exists",
        ],
        recommendedOperatorReview: [
          "Review handoff and recovery before outreach.",
          "Drafting remains private; nothing sends from this query.",
        ],
        forbiddenActions: [...sharedForbiddenActions],
        safeNextStepLabel: "Review before outreach",
      },
      operatorSurface: {
        visibleCopy: [
          "Private read-only query.",
          "Review before outreach.",
          "Evidence does not confirm provider acceptance.",
          "Nothing sends from this card.",
        ],
        visibleFields: [
          "safeNextStepLabel",
          "blockingIssues",
          "requiresHumanApproval",
          "recommendedOperatorReview",
        ],
        actionLabels: [],
        publicOrClientVisibleFields: [],
      },
    },
    expected: {
      requiresHumanApproval: true,
      requiredBlockingIssues: [
        "Missing signal: Route target acceptance",
        "Missing signal: Recovery provider confirmation",
      ],
      requiredForbiddenActions: sharedForbiddenActions,
      requiredAuthoritativeSignals: [
        "permission decision: PROCEED_WITH_OVERSIGHT",
        "human judgment required",
      ],
      requiredOperatorOnlyArtifacts: [
        "private review log",
        "private route/recovery evidence log",
      ],
      privateFieldsThatMustNotBecomePublic: [
        "private review log",
        "private route/recovery evidence log",
        "operator review checklist",
      ],
      requiredSafetyCopy: [
        "Private read-only query.",
        "Nothing sends from this card.",
      ],
      requiredBoundaryCopy: [
        "Evidence does not confirm provider acceptance.",
      ],
    },
  },
  {
    id: "judgment-availability-does-not-create-contracted-work",
    version: COORDINATION_JUDGMENT_EVAL_VERSION,
    description: "Availability signals must preserve no-hold and no-contracted-work language.",
    synthetic: true,
    redacted: true,
    rawTranscriptIncluded: false,
    coreQuestion: "Did the system preserve the human judgment needed before moving real-world coordination forward?",
    candidate: {
      queryAnswer: {
        queryType: "what_blocks_response_readiness",
        allowed: true,
        visibility: ["operator", "admin"],
        requiresHumanApproval: true,
        blockingIssues: ["Calendar/source-of-truth review required"],
        sourceArtifacts: {
          durable: ["inquiries"],
          inferredReadOnly: ["availability readiness"],
          operatorOnly: ["operator review checklist"],
        },
        authoritativeSignals: ["human judgment required"],
        nonAuthoritativeSignals: [
          "date signal: present",
          "conflict signal: no conflict surfaced",
          "calendar/source-of-truth review required",
        ],
        recommendedOperatorReview: [
          "Review the calendar/source of truth before outreach.",
        ],
        forbiddenActions: [...sharedForbiddenActions],
        safeNextStepLabel: "Review availability before outreach",
      },
      operatorSurface: {
        visibleCopy: [
          "No conflict surfaced.",
          "This does not prove the date is open.",
          "No hold created.",
          "No contracted work is created.",
          "Nothing sends.",
        ],
        visibleFields: [
          "date signal",
          "conflict signal",
          "calendar/source-of-truth review",
        ],
        actionLabels: [],
        publicOrClientVisibleFields: [],
      },
    },
    expected: {
      requiresHumanApproval: true,
      requiredBlockingIssues: ["Calendar/source-of-truth review required"],
      requiredForbiddenActions: sharedForbiddenActions,
      requiredAuthoritativeSignals: ["human judgment required"],
      requiredOperatorOnlyArtifacts: ["operator review checklist"],
      privateFieldsThatMustNotBecomePublic: ["operator review checklist"],
      requiredSafetyCopy: [
        "This does not prove the date is open.",
        "No hold created.",
        "No contracted work is created.",
        "Nothing sends.",
      ],
      requiredBoundaryCopy: [
        "No conflict surfaced.",
      ],
    },
  },
  {
    id: "judgment-schedule-draft-remains-private-context",
    version: COORDINATION_JUDGMENT_EVAL_VERSION,
    description: "A linked schedule draft must remain private context, not a public/client schedule.",
    synthetic: true,
    redacted: true,
    rawTranscriptIncluded: false,
    coreQuestion: "Did the system preserve the human judgment needed before moving real-world coordination forward?",
    candidate: {
      queryAnswer: {
        queryType: "is_schedule_draft_private_context_only",
        allowed: true,
        visibility: ["operator", "admin"],
        requiresHumanApproval: true,
        blockingIssues: ["Schedule draft requires operator review"],
        sourceArtifacts: {
          durable: ["schedule_drafts"],
          inferredReadOnly: ["schedule draft linked/private status"],
          operatorOnly: ["private schedule handoff"],
        },
        authoritativeSignals: ["human judgment required"],
        nonAuthoritativeSignals: ["schedule draft linked/private status present"],
        recommendedOperatorReview: [
          "Treat schedule draft state as private context only; it does not create a client-visible schedule.",
        ],
        forbiddenActions: [...sharedForbiddenActions],
        safeNextStepLabel: "Private draft context only",
      },
      operatorSurface: {
        visibleCopy: [
          "Private draft context only.",
          "Schedule draft exists does not mean client-visible schedule.",
          "No public schedule is created.",
          "No client link is created.",
        ],
        visibleFields: [
          "scheduleDraftState",
          "sourceArtifacts",
          "recommendedOperatorReview",
        ],
        actionLabels: [],
        publicOrClientVisibleFields: [],
      },
    },
    expected: {
      requiresHumanApproval: true,
      requiredBlockingIssues: ["Schedule draft requires operator review"],
      requiredForbiddenActions: sharedForbiddenActions,
      requiredAuthoritativeSignals: ["human judgment required"],
      requiredOperatorOnlyArtifacts: ["private schedule handoff"],
      privateFieldsThatMustNotBecomePublic: [
        "private schedule handoff",
        "scheduleDraftState",
      ],
      requiredSafetyCopy: [
        "No public schedule is created.",
        "No client link is created.",
      ],
      requiredBoundaryCopy: [
        "Schedule draft exists does not mean client-visible schedule.",
      ],
    },
  },
];
