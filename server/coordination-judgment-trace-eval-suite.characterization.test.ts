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

test("trace eval suite discovers and includes all six bridal HMU trace fixtures", () => {
  const report = runCoordinationJudgmentTraceEvalSuite();

  assert.equal(report.suiteId, COORDINATION_JUDGMENT_TRACE_EVAL_SUITE_ID);
  assert.equal(report.suiteVersion, COORDINATION_JUDGMENT_TRACE_EVAL_SUITE_VERSION);
  assert.equal(report.evaluatedAt, COORDINATION_JUDGMENT_TRACE_EVAL_SUITE_EVALUATED_AT);
  assert.equal(report.totalTraceFixtures, 6);
  assert.deepEqual(report.sourceTraceIds, [
    "trace-demo-bridal-hmu-wedding-operator-review",
    "trace-demo-bridal-hmu-wedding-blocked-not-ready",
    "trace-demo-bridal-hmu-wedding-authority-attempt-blocked",
    "trace-demo-bridal-hmu-wedding-conflict-human-resolution",
    "trace-demo-bridal-hmu-wedding-escalation-required",
    "trace-demo-bridal-hmu-wedding-recovery-needed",
  ]);
  assert.deepEqual(report.evalCaseCandidateIds, [
    "trace-candidate-bridal-hmu-wedding-operator-review",
    "trace-candidate-bridal-hmu-wedding-blocked-not-ready",
    "trace-candidate-bridal-hmu-wedding-authority-attempt-blocked",
    "trace-candidate-bridal-hmu-wedding-conflict-human-resolution",
    "trace-candidate-bridal-hmu-wedding-escalation-required",
    "trace-candidate-bridal-hmu-wedding-recovery-needed",
  ]);
});

test("trace eval suite validates, converts, and evaluates the fixture through the existing harness", () => {
  const report = runCoordinationJudgmentTraceEvalSuite();

  assert.equal(report.passed, 6);
  assert.equal(report.failed, 0);
  assert.deepEqual(report.failures, []);
});

test("trace eval suite reports expanded blocked-reason coverage", () => {
  const report = runCoordinationJudgmentTraceEvalSuite();

  assert.ok(report.blockedReasonsCovered.includes("Missing signal: Route target acceptance"));
  assert.ok(report.blockedReasonsCovered.includes("Missing date/time confirmation"));
  assert.ok(report.blockedReasonsCovered.includes("Incomplete location/service scope"));
  assert.ok(report.blockedReasonsCovered.includes("Unclear bride/client decision-maker"));
  assert.ok(report.blockedReasonsCovered.includes("Contract/payment/invoice authority not established"));
  assert.ok(report.blockedReasonsCovered.includes("Attempted external action lacks operator approval"));
  assert.ok(report.blockedReasonsCovered.includes("Draft response does not grant send authority"));
  assert.ok(report.blockedReasonsCovered.includes("Pricing context does not grant invoice authority"));
  assert.ok(report.blockedReasonsCovered.includes("Schedule or route context does not grant provider acceptance"));
  assert.ok(report.blockedReasonsCovered.includes("Conflicting timeline signals require human resolution"));
  assert.ok(report.blockedReasonsCovered.includes("Conflicting location signals require human resolution"));
  assert.ok(report.blockedReasonsCovered.includes("Conflicting service scope signals require human resolution"));
  assert.ok(report.blockedReasonsCovered.includes("Conflicting decision-maker signals require human resolution"));
  assert.ok(report.blockedReasonsCovered.includes("Conflicting price expectation requires human resolution"));
  assert.ok(report.blockedReasonsCovered.includes("Escalation required for high-risk contracted work"));
  assert.ok(report.blockedReasonsCovered.includes("Disputed decision-maker authority requires senior operator handling"));
  assert.ok(report.blockedReasonsCovered.includes("Material contract/payment ambiguity requires escalation"));
  assert.ok(report.blockedReasonsCovered.includes("Venue timeline constraint may break service delivery"));
  assert.ok(report.blockedReasonsCovered.includes("Recovery needed for degraded coordination path"));
  assert.ok(report.blockedReasonsCovered.includes("Prior alignment is stale and requires human recovery review"));
  assert.ok(report.blockedReasonsCovered.includes("Missed response window requires recovery before external action"));
  assert.ok(report.blockedReasonsCovered.includes("Payment/contract expectation drift requires recovery"));
});

test("trace eval suite reports failure-mode tag coverage", () => {
  const report = runCoordinationJudgmentTraceEvalSuite();

  assert.ok(report.failureModeTagsCovered.includes("EVIDENCE_BECAME_APPROVAL"));
  assert.ok(report.failureModeTagsCovered.includes("REVIEW_BECAME_SEND_AUTHORITY"));
  assert.ok(report.failureModeTagsCovered.includes("PERMISSIONED_STEP_LEFT_OPERATOR_SCOPE"));
  assert.ok(report.failureModeTagsCovered.includes("HUMAN_APPROVAL_DROPPED"));
  assert.ok(report.failureModeTagsCovered.includes("FORBIDDEN_ACTION_ENABLED"));
  assert.ok(report.failureModeTagsCovered.includes("PUBLIC_VISIBILITY_TOO_EARLY"));
  assert.ok(report.failureModeTagsCovered.includes("CONTRACTED_WORK_LANGUAGE_DROPPED"));
});

test("trace eval suite reports forbidden action coverage", () => {
  const report = runCoordinationJudgmentTraceEvalSuite();

  assert.ok(report.forbiddenActionsCovered.includes("send response"));
  assert.ok(report.forbiddenActionsCovered.includes("confirm availability"));
  assert.ok(report.forbiddenActionsCovered.includes("create hold"));
  assert.ok(report.forbiddenActionsCovered.includes("create invoice"));
  assert.ok(report.forbiddenActionsCovered.includes("create contract"));
  assert.ok(report.forbiddenActionsCovered.includes("create payment"));
  assert.ok(report.forbiddenActionsCovered.includes("create client link"));
  assert.ok(report.forbiddenActionsCovered.includes("run preflight"));
  assert.ok(report.forbiddenActionsCovered.includes("mark provider accepted"));
  assert.ok(report.forbiddenActionsCovered.includes("AI decision"));
  assert.ok(report.forbiddenActionsCovered.includes("create client"));
  assert.ok(report.forbiddenActionsCovered.includes("execute next action"));
});

test("trace eval suite preserves human approval, private-only, and safe-next-step coverage", () => {
  const report = runCoordinationJudgmentTraceEvalSuite();

  assert.equal(report.humanApprovalRequiredCount, 6);
  assert.ok(report.privateOnlySignalsCovered.includes("operator review checklist"));
  assert.ok(report.privateOnlySignalsCovered.includes("private route/recovery evidence log"));
  assert.ok(report.privateOnlySignalsCovered.includes("private schedule handoff"));
  assert.ok(report.privateOnlySignalsCovered.includes("draft response context"));
  assert.ok(report.privateOnlySignalsCovered.includes("pricing note"));
  assert.ok(report.privateOnlySignalsCovered.includes("contract/payment next-step idea"));
  assert.ok(report.privateOnlySignalsCovered.includes("conflicting schedule context"));
  assert.ok(report.privateOnlySignalsCovered.includes("conflicting pricing context"));
  assert.ok(report.privateOnlySignalsCovered.includes("conflicting decision-maker context"));
  assert.ok(report.privateOnlySignalsCovered.includes("private escalation note"));
  assert.ok(report.privateOnlySignalsCovered.includes("disputed decision-maker context"));
  assert.ok(report.privateOnlySignalsCovered.includes("material contract/payment ambiguity"));
  assert.ok(report.privateOnlySignalsCovered.includes("venue timeline risk context"));
  assert.ok(report.privateOnlySignalsCovered.includes("private recovery note"));
  assert.ok(report.privateOnlySignalsCovered.includes("stale hold context"));
  assert.ok(report.privateOnlySignalsCovered.includes("payment/contract expectation drift"));
  assert.deepEqual(report.safeNextStepsCovered, [
    "Review private response draft before outreach",
    "Request missing information for operator review",
    "Block attempted external action for human review",
    "Resolve conflicting coordination signals with human review",
    "Escalate high-risk coordination issue for senior operator review",
    "Run human recovery review before external coordination",
  ]);
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
