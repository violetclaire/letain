import {
  assessCoordinationJudgmentEvalCoverage,
  type CoordinationJudgmentCoverageCoordinationSignal,
  type CoordinationJudgmentCoverageJudgmentState,
  type CoordinationJudgmentCoveragePermissionBoundary,
  type CoordinationJudgmentEvalCoverageReport,
} from "./coordination-judgment-eval-coverage";
import {
  runCoordinationJudgmentTraceEvalSuite,
  type CoordinationJudgmentTraceEvalSuiteResult,
} from "./coordination-judgment-trace-eval-suite";

export const COORDINATION_JUDGMENT_EVAL_CHECKPOINT_ID =
  "coordination-judgment-eval-taxonomy-checkpoint";
export const COORDINATION_JUDGMENT_EVAL_CHECKPOINT_VERSION =
  "coordination-judgment-eval-taxonomy-checkpoint-v2";
export const COORDINATION_JUDGMENT_EVAL_CHECKPOINT_GENERATED_AT_POLICY =
  "deterministic:static-checkpoint-v1";
export const COORDINATION_JUDGMENT_EVAL_CHECKPOINT_READINESS_LABEL =
  "planned_judgment_taxonomy_and_provider_acceptance_signal_covered";

export const COORDINATION_JUDGMENT_EVAL_CHECKPOINT_SAFE_CONCLUSION =
  "The planned judgment-state taxonomy and provider acceptance evidence signal are covered by deterministic source-level fixtures, but this does not grant runtime authority or product behavior.";

export const COORDINATION_JUDGMENT_EVAL_CHECKPOINT_PROHIBITED_RUNTIME_BEHAVIOR = [
  "no sends",
  "no SMS/email",
  "no invoices",
  "no contracts",
  "no payments",
  "no public/client links",
  "no AI execution",
  "no route/preflight/provider acceptance",
  "no client-create behavior",
  "no self-improving harness behavior",
  "no automated harness mutation",
  "no /assess calls",
] as const;

export type CoordinationJudgmentEvalCheckpointReadinessLabel =
  typeof COORDINATION_JUDGMENT_EVAL_CHECKPOINT_READINESS_LABEL;

export type CoordinationJudgmentEvalCheckpointProhibitedRuntimeBehavior =
  typeof COORDINATION_JUDGMENT_EVAL_CHECKPOINT_PROHIBITED_RUNTIME_BEHAVIOR[number];

export type CoordinationJudgmentEvalCheckpointSummary = {
  checkpointId: typeof COORDINATION_JUDGMENT_EVAL_CHECKPOINT_ID;
  checkpointVersion: typeof COORDINATION_JUDGMENT_EVAL_CHECKPOINT_VERSION;
  suiteId: CoordinationJudgmentTraceEvalSuiteResult["suiteId"];
  suiteVersion: CoordinationJudgmentTraceEvalSuiteResult["suiteVersion"];
  taxonomyVersion: CoordinationJudgmentEvalCoverageReport["taxonomyVersion"];
  fixtureCount: number;
  sourceTraceIds: string[];
  evalCaseCandidateIds: string[];
  passedCount: number;
  failedCount: number;
  providerAcceptanceSuiteVersion: CoordinationJudgmentEvalCoverageReport["providerAcceptanceSuiteVersion"];
  providerAcceptanceFixtureCount: number;
  providerAcceptancePassedCount: number;
  providerAcceptanceFailedCount: number;
  providerAcceptanceSourceTraceIds: string[];
  providerAcceptanceStatesCovered: CoordinationJudgmentEvalCoverageReport["providerAcceptanceStatesCovered"];
  providerAcceptanceAuthorityBoundaryPreserved: boolean;
  coveredJudgmentStates: CoordinationJudgmentCoverageJudgmentState[];
  missingJudgmentStates: CoordinationJudgmentCoverageJudgmentState[];
  coveredPermissionBoundaries: CoordinationJudgmentCoveragePermissionBoundary[];
  missingPermissionBoundaries: CoordinationJudgmentCoveragePermissionBoundary[];
  coveredCoordinationSignals: CoordinationJudgmentCoverageCoordinationSignal[];
  missingCoordinationSignals: CoordinationJudgmentCoverageCoordinationSignal[];
  readinessLabel: CoordinationJudgmentEvalCheckpointReadinessLabel;
  safeConclusion: typeof COORDINATION_JUDGMENT_EVAL_CHECKPOINT_SAFE_CONCLUSION;
  remainingNonJudgmentGaps: CoordinationJudgmentCoverageCoordinationSignal[];
  prohibitedRuntimeBehavior: CoordinationJudgmentEvalCheckpointProhibitedRuntimeBehavior[];
  generatedAtPolicy: typeof COORDINATION_JUDGMENT_EVAL_CHECKPOINT_GENERATED_AT_POLICY;
};

export type CoordinationJudgmentEvalCheckpointOptions = {
  suiteReport?: CoordinationJudgmentTraceEvalSuiteResult;
  coverageReport?: CoordinationJudgmentEvalCoverageReport;
};

export function summarizeCoordinationJudgmentEvalCheckpoint(
  options: CoordinationJudgmentEvalCheckpointOptions = {},
): CoordinationJudgmentEvalCheckpointSummary {
  const suiteReport = options.suiteReport ?? runCoordinationJudgmentTraceEvalSuite();
  const coverageReport = options.coverageReport ?? assessCoordinationJudgmentEvalCoverage(suiteReport);

  return {
    checkpointId: COORDINATION_JUDGMENT_EVAL_CHECKPOINT_ID,
    checkpointVersion: COORDINATION_JUDGMENT_EVAL_CHECKPOINT_VERSION,
    suiteId: suiteReport.suiteId,
    suiteVersion: suiteReport.suiteVersion,
    taxonomyVersion: coverageReport.taxonomyVersion,
    fixtureCount: suiteReport.totalTraceFixtures,
    sourceTraceIds: suiteReport.sourceTraceIds,
    evalCaseCandidateIds: suiteReport.evalCaseCandidateIds,
    passedCount: suiteReport.passed,
    failedCount: suiteReport.failed,
    providerAcceptanceSuiteVersion: coverageReport.providerAcceptanceSuiteVersion,
    providerAcceptanceFixtureCount: coverageReport.providerAcceptanceFixtureCount,
    providerAcceptancePassedCount: coverageReport.providerAcceptancePassedCount,
    providerAcceptanceFailedCount: coverageReport.providerAcceptanceFailedCount,
    providerAcceptanceSourceTraceIds: coverageReport.providerAcceptanceSourceTraceIds,
    providerAcceptanceStatesCovered: coverageReport.providerAcceptanceStatesCovered,
    providerAcceptanceAuthorityBoundaryPreserved: coverageReport.providerAcceptanceAuthorityBoundaryPreserved,
    coveredJudgmentStates: coverageReport.coveredJudgmentStates,
    missingJudgmentStates: coverageReport.missingJudgmentStates,
    coveredPermissionBoundaries: coverageReport.coveredPermissionBoundaries,
    missingPermissionBoundaries: coverageReport.missingPermissionBoundaries,
    coveredCoordinationSignals: coverageReport.coveredCoordinationSignals,
    missingCoordinationSignals: coverageReport.missingCoordinationSignals,
    readinessLabel: COORDINATION_JUDGMENT_EVAL_CHECKPOINT_READINESS_LABEL,
    safeConclusion: COORDINATION_JUDGMENT_EVAL_CHECKPOINT_SAFE_CONCLUSION,
    remainingNonJudgmentGaps: coverageReport.missingCoordinationSignals,
    prohibitedRuntimeBehavior: [...COORDINATION_JUDGMENT_EVAL_CHECKPOINT_PROHIBITED_RUNTIME_BEHAVIOR],
    generatedAtPolicy: COORDINATION_JUDGMENT_EVAL_CHECKPOINT_GENERATED_AT_POLICY,
  };
}
