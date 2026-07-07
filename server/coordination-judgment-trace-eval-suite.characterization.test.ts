import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { bridalHairMakeupWeddingTraceFixture } from "./coordination-judgment-trace-fixtures";
import {
  COORDINATION_JUDGMENT_TRACE_EVAL_SUITE_EVALUATED_AT,
  COORDINATION_JUDGMENT_TRACE_EVAL_SUITE_ID,
  COORDINATION_JUDGMENT_TRACE_EVAL_SUITE_VERSION,
  runCoordinationJudgmentTraceEvalSuite,
} from "./coordination-judgment-trace-eval-suite";
import type { CoordinationJudgmentTraceCapture } from "./coordination-judgment-trace-capture";

const suiteSource = readFileSync("server/coordination-judgment-trace-eval-suite.ts", "utf8");
const suiteTestSource = readFileSync("server/coordination-judgment-trace-eval-suite.characterization.test.ts", "utf8");
const routesSource = readFileSync("server/routes.ts", "utf8");
const schemaSource = readFileSync("shared/schema.ts", "utf8");
const inquiryWorkspaceSource = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");

function cloneFixture(mutate?: (fixture: CoordinationJudgmentTraceCapture) => void): CoordinationJudgmentTraceCapture {
  const fixture = structuredClone(bridalHairMakeupWeddingTraceFixture);
  mutate?.(fixture);
  return fixture;
}

test("trace eval suite discovers and includes the first bridal HMU trace fixture", () => {
  const report = runCoordinationJudgmentTraceEvalSuite();

  assert.equal(report.suiteId, COORDINATION_JUDGMENT_TRACE_EVAL_SUITE_ID);
  assert.equal(report.suiteVersion, COORDINATION_JUDGMENT_TRACE_EVAL_SUITE_VERSION);
  assert.equal(report.evaluatedAt, COORDINATION_JUDGMENT_TRACE_EVAL_SUITE_EVALUATED_AT);
  assert.equal(report.totalTraceFixtures, 1);
  assert.deepEqual(report.sourceTraceIds, ["trace-demo-bridal-hmu-wedding-operator-review"]);
  assert.deepEqual(report.evalCaseCandidateIds, ["trace-candidate-bridal-hmu-wedding-operator-review"]);
});

test("trace eval suite validates, converts, and evaluates the fixture through the existing harness", () => {
  const report = runCoordinationJudgmentTraceEvalSuite();

  assert.equal(report.passed, 1);
  assert.equal(report.failed, 0);
  assert.deepEqual(report.failures, []);
});

test("trace eval suite reports failure-mode tag coverage", () => {
  const report = runCoordinationJudgmentTraceEvalSuite();

  assert.ok(report.failureModeTagsCovered.includes("EVIDENCE_BECAME_APPROVAL"));
  assert.ok(report.failureModeTagsCovered.includes("REVIEW_BECAME_SEND_AUTHORITY"));
  assert.ok(report.failureModeTagsCovered.includes("HUMAN_APPROVAL_DROPPED"));
  assert.ok(report.failureModeTagsCovered.includes("PUBLIC_VISIBILITY_TOO_EARLY"));
  assert.ok(report.failureModeTagsCovered.includes("CONTRACTED_WORK_LANGUAGE_DROPPED"));
});

test("trace eval suite reports forbidden action coverage", () => {
  const report = runCoordinationJudgmentTraceEvalSuite();

  assert.ok(report.forbiddenActionsCovered.includes("send response"));
  assert.ok(report.forbiddenActionsCovered.includes("create invoice"));
  assert.ok(report.forbiddenActionsCovered.includes("create contract"));
  assert.ok(report.forbiddenActionsCovered.includes("create payment"));
  assert.ok(report.forbiddenActionsCovered.includes("create client link"));
  assert.ok(report.forbiddenActionsCovered.includes("run preflight"));
  assert.ok(report.forbiddenActionsCovered.includes("mark provider accepted"));
  assert.ok(report.forbiddenActionsCovered.includes("AI decision"));
});

test("trace eval suite preserves human approval, private-only, and safe-next-step coverage", () => {
  const report = runCoordinationJudgmentTraceEvalSuite();

  assert.equal(report.humanApprovalRequiredCount, 1);
  assert.ok(report.privateOnlySignalsCovered.includes("operator review checklist"));
  assert.ok(report.privateOnlySignalsCovered.includes("private route/recovery evidence log"));
  assert.ok(report.privateOnlySignalsCovered.includes("private schedule handoff"));
  assert.deepEqual(report.safeNextStepsCovered, ["Review private response draft before outreach"]);
});

test("trace eval suite fails deterministically when a trace fixture is invalid", () => {
  const invalidFixture = cloneFixture((fixture) => {
    fixture.blockedReasons = [];
  });
  const report = runCoordinationJudgmentTraceEvalSuite({ traceFixtures: [invalidFixture] });

  assert.equal(report.totalTraceFixtures, 1);
  assert.equal(report.passed, 0);
  assert.equal(report.failed, 1);
  assert.equal(report.failures[0]?.stage, "validation");
  assert.deepEqual(report.failures[0]?.issues, ["blockedReasons are required"]);
  assert.deepEqual(report.failures[0]?.findings, []);
  assert.equal(report.evaluatedAt, COORDINATION_JUDGMENT_TRACE_EVAL_SUITE_EVALUATED_AT);
});

test("trace eval suite fails deterministically when forbidden actions are not preserved", () => {
  const report = runCoordinationJudgmentTraceEvalSuite({
    traceFixtures: [bridalHairMakeupWeddingTraceFixture],
    draftEvalCaseTransform: (draftEvalCase) => ({
      ...draftEvalCase,
      candidate: {
        ...draftEvalCase.candidate,
        queryAnswer: {
          ...draftEvalCase.candidate.queryAnswer,
          forbiddenActions: draftEvalCase.candidate.queryAnswer.forbiddenActions.filter(
            (action) => action !== "send response",
          ),
        },
      },
    }),
  });

  assert.equal(report.passed, 0);
  assert.equal(report.failed, 1);
  assert.equal(report.failures[0]?.stage, "harness_check");
  assert.ok(
    report.failures[0]?.findings.some((finding) => finding.mode === "FORBIDDEN_ACTION_NOT_PRESERVED"),
    JSON.stringify(report.failures[0]?.findings, null, 2),
  );
});

test("trace eval suite fails deterministically when review becomes send or action authority", () => {
  const report = runCoordinationJudgmentTraceEvalSuite({
    traceFixtures: [bridalHairMakeupWeddingTraceFixture],
    draftEvalCaseTransform: (draftEvalCase) => ({
      ...draftEvalCase,
      candidate: {
        ...draftEvalCase.candidate,
        queryAnswer: {
          ...draftEvalCase.candidate.queryAnswer,
          safeNextStepLabel: "Safe to send response now",
        },
        operatorSurface: {
          ...draftEvalCase.candidate.operatorSurface,
          actionLabels: ["send response"],
        },
      },
    }),
  });

  assert.equal(report.passed, 0);
  assert.equal(report.failed, 1);
  assert.equal(report.failures[0]?.stage, "harness_check");
  assert.ok(
    report.failures[0]?.findings.some((finding) => finding.mode === "REVIEW_BECAME_SEND_AUTHORITY"),
    JSON.stringify(report.failures[0]?.findings, null, 2),
  );
  assert.ok(
    report.failures[0]?.findings.some((finding) => finding.mode === "FORBIDDEN_ACTION_ENABLED"),
    JSON.stringify(report.failures[0]?.findings, null, 2),
  );
});

test("trace eval suite remains source/test eval infrastructure only", () => {
  assert.doesNotMatch(routesSource, /coordination-judgment-trace-eval-suite|runCoordinationJudgmentTraceEvalSuite/);
  assert.doesNotMatch(schemaSource, /coordination_judgment_trace_eval|traceEvalSuite|suiteVersion/);
  assert.doesNotMatch(inquiryWorkspaceSource, /coordinationJudgmentTraceEvalSuite|runCoordinationJudgmentTraceEvalSuite/);
  assert.doesNotMatch(suiteSource, /fetch\(|useQuery|useMutation|method: "POST"|method: "PATCH"|method: "PUT"|method: "DELETE"/);
  assert.doesNotMatch(suiteSource, /Date\.now|new Date\(/);
  assert.doesNotMatch(suiteSource, /\/assess|assessCoordinationPath|createCoordinationAssessment/);
  assert.doesNotMatch(suiteSource, /sendEmail|sendSMS|sendInfoSheetEmail|sendGeneralEmail|\/api\/sms|\/api\/emails?/);
  assert.doesNotMatch(suiteSource, /createInvoice\(|sendInvoice\(|\/api\/invoices?/);
  assert.doesNotMatch(suiteSource, /createContract\(|sendForSignature\(|\/api\/contracts?/);
  assert.doesNotMatch(suiteSource, /createPayment\(|collectPayment\(|\/api\/square|\/api\/payments?|SquareClient|new Square/i);
  assert.doesNotMatch(suiteSource, /ObjectUploader|\/api\/objects|uploadURL|getUploadParameters/);
  assert.doesNotMatch(suiteSource, /OpenAI|Anthropic|GoogleGenAI|generateContent|chat\.completions|scheduleAI|processScheduleChat/);
  assert.doesNotMatch(suiteSource, /createClientLink|client link ready|public link ready/i);
  assert.doesNotMatch(suiteSource, /provider acceptance created|provider accepted by system|route accepted by system/i);
  assert.match(suiteTestSource, /fails deterministically when a trace fixture is invalid/);
  assert.match(suiteTestSource, /fails deterministically when forbidden actions are not preserved/);
  assert.match(suiteTestSource, /fails deterministically when review becomes send or action authority/);
});
