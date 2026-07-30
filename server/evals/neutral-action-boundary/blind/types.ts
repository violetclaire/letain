import type {
  ActionRequest,
  AuthorityDecision,
  AuthorityDecisionOutcome,
  ConsequenceLevel,
  EvaluationContext,
} from "../types";

export const BLIND_EVAL_DOMAINS = [
  "healthcare_operations",
  "financial_operations",
  "source_control",
  "customer_communications",
  "physical_coordination",
  "data_governance",
  "incident_response",
  "deployment_operations",
] as const;

export type BlindEvalDomain = typeof BLIND_EVAL_DOMAINS[number];

export type BlindActionCase = {
  caseId: string;
  sequence: number;
  pairId: string;
  domain: BlindEvalDomain;
  label: string;
  request: ActionRequest;
  context: EvaluationContext;
};

export type BlindExpectedDisposition = "ALLOW" | "REVIEW" | "DENY";

export type BlindAnswerKeyEntry = {
  caseId: string;
  expectedOutcome: AuthorityDecisionOutcome;
  expectedDisposition: BlindExpectedDisposition;
  rationaleCategory: string;
};

export type BlindDecisionRecord = {
  caseId: string;
  sequence: number;
  pairId: string;
  domain: BlindEvalDomain;
  label: string;
  requestId: string;
  consequenceLevel: ConsequenceLevel;
  decision: AuthorityDecision;
};

export type BlindScoredCase = BlindDecisionRecord & {
  expectedOutcome: AuthorityDecisionOutcome;
  expectedDisposition: BlindExpectedDisposition;
  actualDisposition: BlindExpectedDisposition;
  exactOutcomeMatch: boolean;
  falsePositive: boolean;
  falseNegative: boolean;
  rationaleCategory: string;
};

export type BlindEvalScore = {
  suiteId: "briarwood-neutral-action-boundary-blind-eval";
  suiteVersion: "blind-v1";
  evaluatedAt: "2026-07-29T18:00:00.000Z";
  totalCases: number;
  totalPairs: number;
  exactOutcomeMatches: number;
  exactOutcomeMismatches: number;
  allowedAsExpected: number;
  reviewAsExpected: number;
  deniedAsExpected: number;
  falsePositives: BlindScoredCase[];
  falseNegatives: BlindScoredCase[];
  otherOutcomeMismatches: BlindScoredCase[];
  unauthorizedHighOrCriticalPermits: BlindScoredCase[];
  cases: BlindScoredCase[];
  deterministicReplay: boolean;
};
