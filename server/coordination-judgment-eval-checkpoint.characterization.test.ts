import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  COORDINATION_JUDGMENT_EVAL_CHECKPOINT_GENERATED_AT_POLICY,
  COORDINATION_JUDGMENT_EVAL_CHECKPOINT_ID,
  COORDINATION_JUDGMENT_EVAL_CHECKPOINT_PROHIBITED_RUNTIME_BEHAVIOR,
  COORDINATION_JUDGMENT_EVAL_CHECKPOINT_READINESS_LABEL,
  COORDINATION_JUDGMENT_EVAL_CHECKPOINT_SAFE_CONCLUSION,
  COORDINATION_JUDGMENT_EVAL_CHECKPOINT_VERSION,
  summarizeCoordinationJudgmentEvalCheckpoint,
} from "./coordination-judgment-eval-checkpoint";
import {
  COORDINATION_JUDGMENT_EVAL_COVERAGE_TAXONOMY_VERSION,
  assessCoordinationJudgmentEvalCoverage,
} from "./coordination-judgment-eval-coverage";
import {
  COORDINATION_JUDGMENT_TRACE_EVAL_SUITE_ID,
  COORDINATION_JUDGMENT_TRACE_EVAL_SUITE_VERSION,
  runCoordinationJudgmentTraceEvalSuite,
} from "./coordination-judgment-trace-eval-suite";

const checkpointSource = readFileSync("server/coordination-judgment-eval-checkpoint.ts", "utf8");
const checkpointTestSource = readFileSync(
  "server/coordination-judgment-eval-checkpoint.characterization.test.ts",
  "utf8",
);
const routesSource = readFileSync("server/routes.ts", "utf8");
const schemaSource = readFileSync("shared/schema.ts", "utf8");
const inquiryWorkspaceSource = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");

test("checkpoint consumes the current trace-derived eval suite report", () => {
  const suiteReport = runCoordinationJudgmentTraceEvalSuite();
  const checkpoint = summarizeCoordinationJudgmentEvalCheckpoint({ suiteReport });

  assert.equal(checkpoint.checkpointId, COORDINATION_JUDGMENT_EVAL_CHECKPOINT_ID);
  assert.equal(checkpoint.checkpointVersion, COORDINATION_JUDGMENT_EVAL_CHECKPOINT_VERSION);
  assert.equal(checkpoint.suiteId, COORDINATION_JUDGMENT_TRACE_EVAL_SUITE_ID);
  assert.equal(checkpoint.suiteVersion, COORDINATION_JUDGMENT_TRACE_EVAL_SUITE_VERSION);
  assert.equal(checkpoint.fixtureCount, 6);
  assert.equal(checkpoint.passedCount, 6);
  assert.equal(checkpoint.failedCount, 0);
  assert.deepEqual(checkpoint.sourceTraceIds, suiteReport.sourceTraceIds);
  assert.deepEqual(checkpoint.evalCaseCandidateIds, suiteReport.evalCaseCandidateIds);
});

test("checkpoint consumes the current coverage report", () => {
  const suiteReport = runCoordinationJudgmentTraceEvalSuite();
  const coverageReport = assessCoordinationJudgmentEvalCoverage(suiteReport);
  const checkpoint = summarizeCoordinationJudgmentEvalCheckpoint({ suiteReport, coverageReport });

  assert.equal(checkpoint.taxonomyVersion, COORDINATION_JUDGMENT_EVAL_COVERAGE_TAXONOMY_VERSION);
  assert.deepEqual(checkpoint.coveredJudgmentStates, coverageReport.coveredJudgmentStates);
  assert.deepEqual(checkpoint.missingJudgmentStates, coverageReport.missingJudgmentStates);
  assert.deepEqual(checkpoint.coveredPermissionBoundaries, coverageReport.coveredPermissionBoundaries);
  assert.deepEqual(checkpoint.missingPermissionBoundaries, coverageReport.missingPermissionBoundaries);
  assert.deepEqual(checkpoint.coveredCoordinationSignals, coverageReport.coveredCoordinationSignals);
  assert.deepEqual(checkpoint.missingCoordinationSignals, coverageReport.missingCoordinationSignals);
});

test("checkpoint reports the completed planned judgment-state taxonomy", () => {
  const checkpoint = summarizeCoordinationJudgmentEvalCheckpoint();

  assert.deepEqual(checkpoint.coveredJudgmentStates, [
    "ready_for_operator_review",
    "blocked_not_ready_for_external_action",
    "authority_attempt_blocked",
    "escalation_required",
    "conflict_requires_human_resolution",
    "recovery_needed",
  ]);
  assert.deepEqual(checkpoint.missingJudgmentStates, []);
  assert.equal(checkpoint.readinessLabel, COORDINATION_JUDGMENT_EVAL_CHECKPOINT_READINESS_LABEL);
});

test("checkpoint preserves remaining non-judgment coordination signal gaps", () => {
  const checkpoint = summarizeCoordinationJudgmentEvalCheckpoint();

  assert.deepEqual(checkpoint.missingCoordinationSignals, [
    "provider_acceptance_state",
  ]);
  assert.deepEqual(checkpoint.remainingNonJudgmentGaps, checkpoint.missingCoordinationSignals);
});

test("checkpoint includes all six source traces and draft eval candidates", () => {
  const checkpoint = summarizeCoordinationJudgmentEvalCheckpoint();

  assert.deepEqual(checkpoint.sourceTraceIds, [
    "trace-demo-bridal-hmu-wedding-operator-review",
    "trace-demo-bridal-hmu-wedding-blocked-not-ready",
    "trace-demo-bridal-hmu-wedding-authority-attempt-blocked",
    "trace-demo-bridal-hmu-wedding-conflict-human-resolution",
    "trace-demo-bridal-hmu-wedding-escalation-required",
    "trace-demo-bridal-hmu-wedding-recovery-needed",
  ]);
  assert.deepEqual(checkpoint.evalCaseCandidateIds, [
    "trace-candidate-bridal-hmu-wedding-operator-review",
    "trace-candidate-bridal-hmu-wedding-blocked-not-ready",
    "trace-candidate-bridal-hmu-wedding-authority-attempt-blocked",
    "trace-candidate-bridal-hmu-wedding-conflict-human-resolution",
    "trace-candidate-bridal-hmu-wedding-escalation-required",
    "trace-candidate-bridal-hmu-wedding-recovery-needed",
  ]);
});

test("checkpoint safe conclusion does not imply runtime authority", () => {
  const checkpoint = summarizeCoordinationJudgmentEvalCheckpoint();

  assert.equal(checkpoint.safeConclusion, COORDINATION_JUDGMENT_EVAL_CHECKPOINT_SAFE_CONCLUSION);
  assert.match(checkpoint.safeConclusion, /does not grant runtime authority or product behavior/);
  assert.doesNotMatch(checkpoint.safeConclusion, /safe to send|approved to send|authority granted|product behavior enabled/i);
});

test("checkpoint prohibits runtime behavior categories", () => {
  const checkpoint = summarizeCoordinationJudgmentEvalCheckpoint();

  assert.deepEqual(
    checkpoint.prohibitedRuntimeBehavior,
    [...COORDINATION_JUDGMENT_EVAL_CHECKPOINT_PROHIBITED_RUNTIME_BEHAVIOR],
  );
  assert.deepEqual(checkpoint.prohibitedRuntimeBehavior, [
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
  ]);
});

test("checkpoint output is deterministic across repeated calls", () => {
  const first = summarizeCoordinationJudgmentEvalCheckpoint();
  const second = summarizeCoordinationJudgmentEvalCheckpoint();

  assert.deepEqual(first, second);
  assert.equal(first.generatedAtPolicy, COORDINATION_JUDGMENT_EVAL_CHECKPOINT_GENERATED_AT_POLICY);
  assert.doesNotMatch(first.generatedAtPolicy, /\d{4}-\d{2}-\d{2}|Date|wall-clock/i);
});

test("checkpoint remains source/test eval reporting infrastructure only", () => {
  assert.doesNotMatch(routesSource, /coordination-judgment-eval-checkpoint|summarizeCoordinationJudgmentEvalCheckpoint/);
  assert.doesNotMatch(schemaSource, /coordination_judgment_eval_checkpoint|checkpointVersion|readinessLabel/);
  assert.doesNotMatch(inquiryWorkspaceSource, /coordinationJudgmentEvalCheckpoint|summarizeCoordinationJudgmentEvalCheckpoint/);
  assert.doesNotMatch(checkpointSource, /fetch\(|useQuery|useMutation|method: "POST"|method: "PATCH"|method: "PUT"|method: "DELETE"/);
  assert.doesNotMatch(checkpointSource, /Date\.now|new Date\(/);
  assert.doesNotMatch(checkpointSource, /\/api\/assess|assessCoordinationPath|createCoordinationAssessment/);
  assert.doesNotMatch(checkpointSource, /sendEmail|sendSMS|sendInfoSheetEmail|sendGeneralEmail|\/api\/sms|\/api\/emails?/);
  assert.doesNotMatch(checkpointSource, /createInvoice\(|sendInvoice\(|\/api\/invoices?/);
  assert.doesNotMatch(checkpointSource, /createContract\(|sendForSignature\(|\/api\/contracts?/);
  assert.doesNotMatch(checkpointSource, /createPayment\(|collectPayment\(|\/api\/square|\/api\/payments?|SquareClient|new Square/i);
  assert.doesNotMatch(checkpointSource, /ObjectUploader|\/api\/objects|uploadURL|getUploadParameters/);
  assert.doesNotMatch(checkpointSource, /OpenAI|Anthropic|GoogleGenAI|generateContent|chat\.completions|scheduleAI|processScheduleChat/);
  assert.doesNotMatch(checkpointSource, /createClientLink|client link ready|public link ready/i);
  assert.doesNotMatch(checkpointSource, /provider acceptance created|provider accepted by system|route accepted by system/i);
  assert.doesNotMatch(checkpointSource, /writeFile|appendFile|rmSync|unlinkSync|execSync|spawn|git push|pull request/i);
  assert.match(checkpointTestSource, /remainingNonJudgmentGaps/);
  assert.match(checkpointTestSource, /does not grant runtime authority or product behavior/);
});
