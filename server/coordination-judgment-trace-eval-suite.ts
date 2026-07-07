import type { CoordinationJudgmentEvalCase } from "./coordination-judgment-eval-cases";
import {
  evaluateCoordinationJudgmentCase,
  type CoordinationJudgmentEvalFinding,
} from "./coordination-judgment-eval-harness";
import {
  traceCaptureToDraftEvalCase,
  validateCoordinationJudgmentTraceCapture,
  type CoordinationJudgmentTraceCapture,
} from "./coordination-judgment-trace-capture";
import { coordinationJudgmentTraceFixtures } from "./coordination-judgment-trace-fixtures";

export const COORDINATION_JUDGMENT_TRACE_EVAL_SUITE_ID = "coordination-judgment-trace-eval-suite";
export const COORDINATION_JUDGMENT_TRACE_EVAL_SUITE_VERSION = "coordination-judgment-trace-eval-suite-v1";
export const COORDINATION_JUDGMENT_TRACE_EVAL_SUITE_EVALUATED_AT = "deterministic:trace-eval-suite-v1";

type CoordinationJudgmentTraceEvalFailureStage = "validation" | "conversion" | "evaluation";

export type CoordinationJudgmentTraceEvalSuiteFailure = {
  sourceTraceId: string;
  evalCaseCandidateId?: string;
  stage: CoordinationJudgmentTraceEvalFailureStage;
  issues: string[];
  findings: CoordinationJudgmentEvalFinding[];
};

export type CoordinationJudgmentTraceEvalSuiteResult = {
  suiteId: typeof COORDINATION_JUDGMENT_TRACE_EVAL_SUITE_ID;
  suiteVersion: typeof COORDINATION_JUDGMENT_TRACE_EVAL_SUITE_VERSION;
  evaluatedAt: string;
  totalTraceFixtures: number;
  passed: number;
  failed: number;
  failures: CoordinationJudgmentTraceEvalSuiteFailure[];
  evalCaseCandidateIds: string[];
  sourceTraceIds: string[];
  failureModeTagsCovered: string[];
  forbiddenActionsCovered: string[];
  humanApprovalRequiredCount: number;
  privateOnlySignalsCovered: string[];
  safeNextStepsCovered: string[];
};

export type CoordinationJudgmentTraceEvalSuiteOptions = {
  traceFixtures?: CoordinationJudgmentTraceCapture[];
  evaluatedAt?: string;
  draftEvalCaseTransform?: (
    draftEvalCase: CoordinationJudgmentEvalCase,
    traceFixture: CoordinationJudgmentTraceCapture,
  ) => CoordinationJudgmentEvalCase;
};

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function failureFor(
  traceFixture: CoordinationJudgmentTraceCapture,
  stage: CoordinationJudgmentTraceEvalFailureStage,
  issues: string[],
  findings: CoordinationJudgmentEvalFinding[] = [],
): CoordinationJudgmentTraceEvalSuiteFailure {
  return {
    sourceTraceId: traceFixture.sourceTraceId,
    evalCaseCandidateId: traceFixture.evalCaseCandidateId,
    stage,
    issues,
    findings,
  };
}

export function runCoordinationJudgmentTraceEvalSuite(
  options: CoordinationJudgmentTraceEvalSuiteOptions = {},
): CoordinationJudgmentTraceEvalSuiteResult {
  const traceFixtures = options.traceFixtures ?? coordinationJudgmentTraceFixtures;
  const failures: CoordinationJudgmentTraceEvalSuiteFailure[] = [];
  let passed = 0;

  const evalCaseCandidateIds: string[] = [];
  const sourceTraceIds: string[] = [];
  const failureModeTagsCovered: string[] = [];
  const forbiddenActionsCovered: string[] = [];
  const privateOnlySignalsCovered: string[] = [];
  const safeNextStepsCovered: string[] = [];
  let humanApprovalRequiredCount = 0;

  for (const traceFixture of traceFixtures) {
    sourceTraceIds.push(traceFixture.sourceTraceId);
    if (traceFixture.evalCaseCandidateId) evalCaseCandidateIds.push(traceFixture.evalCaseCandidateId);
    failureModeTagsCovered.push(...traceFixture.failureModeTags);
    forbiddenActionsCovered.push(...traceFixture.forbiddenActions);
    privateOnlySignalsCovered.push(...traceFixture.privateOnlySignals);
    if (traceFixture.safeNextStep) safeNextStepsCovered.push(traceFixture.safeNextStep);
    if (traceFixture.humanApprovalRequired) humanApprovalRequiredCount += 1;

    const validation = validateCoordinationJudgmentTraceCapture(traceFixture);
    if (!validation.valid) {
      failures.push(failureFor(traceFixture, "validation", validation.issues));
      continue;
    }

    let draftEvalCase: CoordinationJudgmentEvalCase;
    try {
      draftEvalCase = traceCaptureToDraftEvalCase(traceFixture);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown conversion failure";
      failures.push(failureFor(traceFixture, "conversion", [message]));
      continue;
    }

    const evalCaseToCheck = options.draftEvalCaseTransform
      ? options.draftEvalCaseTransform(draftEvalCase, traceFixture)
      : draftEvalCase;
    const evaluation = evaluateCoordinationJudgmentCase(evalCaseToCheck);

    if (!evaluation.passed) {
      failures.push(failureFor(
        traceFixture,
        "evaluation",
        evaluation.findings.map((finding) => finding.message),
        evaluation.findings,
      ));
      continue;
    }

    passed += 1;
  }

  return {
    suiteId: COORDINATION_JUDGMENT_TRACE_EVAL_SUITE_ID,
    suiteVersion: COORDINATION_JUDGMENT_TRACE_EVAL_SUITE_VERSION,
    evaluatedAt: options.evaluatedAt ?? COORDINATION_JUDGMENT_TRACE_EVAL_SUITE_EVALUATED_AT,
    totalTraceFixtures: traceFixtures.length,
    passed,
    failed: failures.length,
    failures,
    evalCaseCandidateIds: unique(evalCaseCandidateIds),
    sourceTraceIds: unique(sourceTraceIds),
    failureModeTagsCovered: unique(failureModeTagsCovered),
    forbiddenActionsCovered: unique(forbiddenActionsCovered),
    humanApprovalRequiredCount,
    privateOnlySignalsCovered: unique(privateOnlySignalsCovered),
    safeNextStepsCovered: unique(safeNextStepsCovered),
  };
}
