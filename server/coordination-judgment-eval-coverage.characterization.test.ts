import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  COORDINATION_JUDGMENT_COVERAGE_COORDINATION_SIGNALS,
  COORDINATION_JUDGMENT_COVERAGE_JUDGMENT_STATES,
  COORDINATION_JUDGMENT_COVERAGE_PERMISSION_BOUNDARIES,
  COORDINATION_JUDGMENT_EVAL_COVERAGE_TAXONOMY_VERSION,
  assessCoordinationJudgmentEvalCoverage,
} from "./coordination-judgment-eval-coverage";
import { runCoordinationJudgmentTraceEvalSuite } from "./coordination-judgment-trace-eval-suite";

const coverageSource = readFileSync("server/coordination-judgment-eval-coverage.ts", "utf8");
const coverageTestSource = readFileSync("server/coordination-judgment-eval-coverage.characterization.test.ts", "utf8");
const routesSource = readFileSync("server/routes.ts", "utf8");
const schemaSource = readFileSync("shared/schema.ts", "utf8");
const inquiryWorkspaceSource = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");

test("coverage assessor consumes the current trace-derived eval suite report", () => {
  const suiteReport = runCoordinationJudgmentTraceEvalSuite();
  const coverage = assessCoordinationJudgmentEvalCoverage(suiteReport);

  assert.equal(coverage.taxonomyVersion, COORDINATION_JUDGMENT_EVAL_COVERAGE_TAXONOMY_VERSION);
  assert.equal(coverage.suiteId, suiteReport.suiteId);
  assert.equal(coverage.suiteVersion, suiteReport.suiteVersion);
  assert.equal(coverage.fixtureCount, 2);
  assert.deepEqual(coverage.sourceTraceIds, [
    "trace-demo-bridal-hmu-wedding-operator-review",
    "trace-demo-bridal-hmu-wedding-blocked-not-ready",
  ]);
  assert.deepEqual(coverage.evalCaseCandidateIds, [
    "trace-candidate-bridal-hmu-wedding-operator-review",
    "trace-candidate-bridal-hmu-wedding-blocked-not-ready",
  ]);
});

test("coverage assessor reports covered judgment states from current trace fixtures", () => {
  const coverage = assessCoordinationJudgmentEvalCoverage();

  assert.deepEqual(coverage.coveredJudgmentStates, [
    "ready_for_operator_review",
    "blocked_not_ready_for_external_action",
  ]);
  assert.deepEqual(coverage.missingJudgmentStates, [
    "escalation_required",
    "conflict_requires_human_resolution",
    "recovery_needed",
    "authority_attempt_blocked",
  ]);
});

test("coverage assessor reports covered permission boundaries from current trace fixtures", () => {
  const coverage = assessCoordinationJudgmentEvalCoverage();

  assert.deepEqual(coverage.coveredPermissionBoundaries, [
    "evidence_does_not_mean_approval",
    "review_does_not_mean_send_authority",
    "no_invoice_contract_payment_without_authority",
    "private_context_not_public",
    "no_public_or_client_link_without_authority",
    "no_provider_acceptance_without_authority",
    "no_ai_action_without_human_approval",
  ]);
  assert.deepEqual(coverage.missingPermissionBoundaries, []);
});

test("coverage assessor reports covered and missing real-world coordination signals", () => {
  const coverage = assessCoordinationJudgmentEvalCoverage();

  assert.deepEqual(coverage.coveredCoordinationSignals, [
    "date_time_confirmation",
    "location_scope",
    "service_scope",
    "decision_maker_clarity",
    "pricing_availability_confirmation",
    "private_schedule_context",
    "operator_approval_required",
    "missing_authority",
  ]);
  assert.deepEqual(coverage.missingCoordinationSignals, [
    "provider_acceptance_state",
    "recovery_capacity",
    "conflict_resolution",
  ]);
});

test("coverage assessor returns deterministic aggregate counts and coverage percent", () => {
  const first = assessCoordinationJudgmentEvalCoverage();
  const second = assessCoordinationJudgmentEvalCoverage();
  const expectedTotal =
    COORDINATION_JUDGMENT_COVERAGE_JUDGMENT_STATES.length +
    COORDINATION_JUDGMENT_COVERAGE_PERMISSION_BOUNDARIES.length +
    COORDINATION_JUDGMENT_COVERAGE_COORDINATION_SIGNALS.length;

  assert.deepEqual(first, second);
  assert.equal(first.totalRequiredCoverageItems, expectedTotal);
  assert.equal(first.coveredItems.length, 17);
  assert.equal(first.missingItems.length, 7);
  assert.equal(first.coveragePercent, 70.83);
  assert.equal(first.readyForExpandedEvalSuite, true);
});

test("coverage assessor lists all covered and missing items in taxonomy order", () => {
  const coverage = assessCoordinationJudgmentEvalCoverage();

  assert.deepEqual(coverage.coveredItems, [
    "ready_for_operator_review",
    "blocked_not_ready_for_external_action",
    "evidence_does_not_mean_approval",
    "review_does_not_mean_send_authority",
    "no_invoice_contract_payment_without_authority",
    "private_context_not_public",
    "no_public_or_client_link_without_authority",
    "no_provider_acceptance_without_authority",
    "no_ai_action_without_human_approval",
    "date_time_confirmation",
    "location_scope",
    "service_scope",
    "decision_maker_clarity",
    "pricing_availability_confirmation",
    "private_schedule_context",
    "operator_approval_required",
    "missing_authority",
  ]);
  assert.deepEqual(coverage.missingItems, [
    "escalation_required",
    "conflict_requires_human_resolution",
    "recovery_needed",
    "authority_attempt_blocked",
    "provider_acceptance_state",
    "recovery_capacity",
    "conflict_resolution",
  ]);
});

test("coverage assessor reflects empty or failing suite reports without inventing coverage", () => {
  const failedSuiteReport = {
    ...runCoordinationJudgmentTraceEvalSuite(),
    totalTraceFixtures: 1,
    passed: 0,
    failed: 1,
    failures: [
      {
        sourceTraceId: "trace-invalid",
        stage: "validation" as const,
        issues: ["blockedReasons are required"],
        findings: [],
      },
    ],
    evalCaseCandidateIds: [],
    sourceTraceIds: ["trace-invalid"],
    blockedReasonsCovered: [],
    failureModeTagsCovered: [],
    forbiddenActionsCovered: [],
    humanApprovalRequiredCount: 0,
    privateOnlySignalsCovered: [],
    safeNextStepsCovered: [],
  };

  const coverage = assessCoordinationJudgmentEvalCoverage(failedSuiteReport);

  assert.equal(coverage.fixtureCount, 1);
  assert.equal(coverage.coveredItems.length, 0);
  assert.equal(coverage.coveragePercent, 0);
  assert.equal(coverage.readyForExpandedEvalSuite, false);
  assert.deepEqual(coverage.missingJudgmentStates, [...COORDINATION_JUDGMENT_COVERAGE_JUDGMENT_STATES]);
  assert.deepEqual(coverage.missingPermissionBoundaries, [...COORDINATION_JUDGMENT_COVERAGE_PERMISSION_BOUNDARIES]);
  assert.deepEqual(coverage.missingCoordinationSignals, [...COORDINATION_JUDGMENT_COVERAGE_COORDINATION_SIGNALS]);
});

test("coverage taxonomy remains source/test eval infrastructure only", () => {
  assert.doesNotMatch(routesSource, /coordination-judgment-eval-coverage|assessCoordinationJudgmentEvalCoverage/);
  assert.doesNotMatch(schemaSource, /coordination_judgment_eval_coverage|coverageTaxonomy|taxonomyVersion/);
  assert.doesNotMatch(inquiryWorkspaceSource, /coordinationJudgmentEvalCoverage|assessCoordinationJudgmentEvalCoverage/);
  assert.doesNotMatch(coverageSource, /fetch\(|useQuery|useMutation|method: "POST"|method: "PATCH"|method: "PUT"|method: "DELETE"/);
  assert.doesNotMatch(coverageSource, /Date\.now|new Date\(/);
  assert.doesNotMatch(coverageSource, /\/assess|assessCoordinationPath|createCoordinationAssessment/);
  assert.doesNotMatch(coverageSource, /sendEmail|sendSMS|sendInfoSheetEmail|sendGeneralEmail|\/api\/sms|\/api\/emails?/);
  assert.doesNotMatch(coverageSource, /createInvoice\(|sendInvoice\(|\/api\/invoices?/);
  assert.doesNotMatch(coverageSource, /createContract\(|sendForSignature\(|\/api\/contracts?/);
  assert.doesNotMatch(coverageSource, /createPayment\(|collectPayment\(|\/api\/square|\/api\/payments?|SquareClient|new Square/i);
  assert.doesNotMatch(coverageSource, /ObjectUploader|\/api\/objects|uploadURL|getUploadParameters/);
  assert.doesNotMatch(coverageSource, /OpenAI|Anthropic|GoogleGenAI|generateContent|chat\.completions|scheduleAI|processScheduleChat/);
  assert.doesNotMatch(coverageSource, /createClientLink|client link ready|public link ready/i);
  assert.doesNotMatch(coverageSource, /provider acceptance created|provider accepted by system|route accepted by system/i);
  assert.doesNotMatch(coverageSource, /writeFile|appendFile|rmSync|unlinkSync|execSync|spawn|git push|pull request/i);
  assert.match(coverageTestSource, /missingCoordinationSignals/);
  assert.match(coverageTestSource, /readyForExpandedEvalSuite/);
});
