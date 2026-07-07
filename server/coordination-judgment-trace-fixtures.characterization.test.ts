import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { evaluateCoordinationJudgmentCase } from "./coordination-judgment-eval-harness";
import { traceCaptureToDraftEvalCase, validateCoordinationJudgmentTraceCapture } from "./coordination-judgment-trace-capture";
import {
  bridalHairMakeupWeddingTraceFixture,
  coordinationJudgmentTraceFixtures,
} from "./coordination-judgment-trace-fixtures";

const fixturesSource = readFileSync("server/coordination-judgment-trace-fixtures.ts", "utf8");
const fixturesTestSource = readFileSync("server/coordination-judgment-trace-fixtures.characterization.test.ts", "utf8");
const routesSource = readFileSync("server/routes.ts", "utf8");
const schemaSource = readFileSync("shared/schema.ts", "utf8");
const inquiryWorkspaceSource = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");

function draftFixtureEvalCase() {
  return traceCaptureToDraftEvalCase(bridalHairMakeupWeddingTraceFixture);
}

test("bridal hair and makeup wedding trace fixture validates as a trace capture", () => {
  const validation = validateCoordinationJudgmentTraceCapture(bridalHairMakeupWeddingTraceFixture);

  assert.equal(validation.valid, true, validation.issues.join("\n"));
  assert.equal(coordinationJudgmentTraceFixtures.length, 1);
  assert.equal(
    bridalHairMakeupWeddingTraceFixture.evalCaseCandidateId,
    "trace-candidate-bridal-hmu-wedding-operator-review",
  );
  assert.match(bridalHairMakeupWeddingTraceFixture.inquiryEvidenceSummary, /bridal hair and makeup wedding inquiry/);
  assert.match(
    bridalHairMakeupWeddingTraceFixture.observedCoordinationState.nonAuthoritativeSignals.join("\n"),
    /bridal hair and makeup \/ wedding/,
  );
});

test("fixture converts into a draft eval case compatible with the judgment harness", () => {
  const draftEvalCase = draftFixtureEvalCase();
  const result = evaluateCoordinationJudgmentCase(draftEvalCase);

  assert.equal(draftEvalCase.id, "trace-candidate-bridal-hmu-wedding-operator-review");
  assert.equal(draftEvalCase.synthetic, true);
  assert.equal(draftEvalCase.redacted, true);
  assert.equal(draftEvalCase.rawTranscriptIncluded, false);
  assert.equal(
    draftEvalCase.coreQuestion,
    "Did the system preserve the human judgment needed before moving real-world coordination forward?",
  );
  assert.equal(result.passed, true, JSON.stringify(result.findings, null, 2));
});

test("converted draft preserves operator judgment, permission state, and human approval", () => {
  const draftEvalCase = draftFixtureEvalCase();
  const answer = draftEvalCase.candidate.queryAnswer;

  assert.equal(answer.requiresHumanApproval, true);
  assert.equal(draftEvalCase.expected.requiresHumanApproval, true);
  assert.match(answer.recommendedOperatorReview.join("\n"), /enough evidence to review a private response draft/);
  assert.match(answer.authoritativeSignals.join("\n"), /permission outcome: PROCEED_WITH_OVERSIGHT/);
  assert.match(answer.authoritativeSignals.join("\n"), /operator decision: keep as private operator review before outreach/);
  assert.match(answer.authoritativeSignals.join("\n"), /human judgment required/);
  assert.equal(answer.safeNextStepLabel, "Review private response draft before outreach");
});

test("converted draft preserves blocked reasons, private-only signals, and forbidden actions", () => {
  const draftEvalCase = draftFixtureEvalCase();
  const answer = draftEvalCase.candidate.queryAnswer;

  for (const blockedReason of bridalHairMakeupWeddingTraceFixture.blockedReasons) {
    assert.ok(answer.blockingIssues.includes(blockedReason), `missing blocked reason: ${blockedReason}`);
    assert.ok(
      draftEvalCase.expected.requiredBlockingIssues.includes(blockedReason),
      `missing expected blocked reason: ${blockedReason}`,
    );
  }

  for (const privateSignal of bridalHairMakeupWeddingTraceFixture.privateOnlySignals) {
    assert.ok(answer.sourceArtifacts.operatorOnly.includes(privateSignal), `missing private signal: ${privateSignal}`);
    assert.ok(
      draftEvalCase.expected.privateFieldsThatMustNotBecomePublic.includes(privateSignal),
      `missing private field expectation: ${privateSignal}`,
    );
  }

  for (const forbiddenAction of bridalHairMakeupWeddingTraceFixture.forbiddenActions) {
    assert.ok(answer.forbiddenActions.includes(forbiddenAction), `missing forbidden action: ${forbiddenAction}`);
    assert.ok(
      draftEvalCase.expected.requiredForbiddenActions.includes(forbiddenAction),
      `missing expected forbidden action: ${forbiddenAction}`,
    );
  }
});

test("converted draft preserves failure-mode tags and contracted-work safety language", () => {
  const draftEvalCase = draftFixtureEvalCase();
  const authoritativeSignals = draftEvalCase.candidate.queryAnswer.authoritativeSignals.join("\n");
  const visibleCopy = draftEvalCase.candidate.operatorSurface.visibleCopy.join("\n");

  for (const failureModeTag of bridalHairMakeupWeddingTraceFixture.failureModeTags) {
    assert.match(authoritativeSignals, new RegExp(`failure mode tag: ${failureModeTag}`));
  }

  assert.match(visibleCopy, /No contracted work is created/);
  assert.ok(draftEvalCase.expected.requiredSafetyCopy.includes("No contracted work is created."));
});

test("converted draft fails when forbidden actions are removed", () => {
  const draftEvalCase = draftFixtureEvalCase();
  draftEvalCase.candidate.queryAnswer.forbiddenActions = draftEvalCase.candidate.queryAnswer.forbiddenActions.filter(
    (action) => action !== "send response",
  );

  const result = evaluateCoordinationJudgmentCase(draftEvalCase);

  assert.equal(result.passed, false);
  assert.ok(
    result.findings.some((finding) => finding.mode === "FORBIDDEN_ACTION_NOT_PRESERVED" &&
      finding.message.includes("send response")),
    JSON.stringify(result.findings, null, 2),
  );
});

test("converted draft fails when review becomes send or action authority", () => {
  const draftEvalCase = draftFixtureEvalCase();
  draftEvalCase.candidate.queryAnswer.safeNextStepLabel = "Safe to send response now";
  draftEvalCase.candidate.operatorSurface.actionLabels = ["send response"];

  const result = evaluateCoordinationJudgmentCase(draftEvalCase);

  assert.equal(result.passed, false);
  assert.ok(
    result.findings.some((finding) => finding.mode === "REVIEW_BECAME_SEND_AUTHORITY"),
    JSON.stringify(result.findings, null, 2),
  );
  assert.ok(
    result.findings.some((finding) => finding.mode === "FORBIDDEN_ACTION_ENABLED"),
    JSON.stringify(result.findings, null, 2),
  );
});

test("trace fixtures remain source/test eval infrastructure only", () => {
  assert.doesNotMatch(routesSource, /coordination-judgment-trace-fixtures|bridalHairMakeupWeddingTraceFixture/);
  assert.doesNotMatch(schemaSource, /coordination_judgment_trace|traceFixture|evalCaseCandidate/);
  assert.doesNotMatch(inquiryWorkspaceSource, /coordinationJudgmentTraceFixtures|bridalHairMakeupWeddingTraceFixture/);
  assert.doesNotMatch(fixturesSource, /fetch\(|useQuery|useMutation|method: "POST"|method: "PATCH"|method: "PUT"|method: "DELETE"/);
  assert.doesNotMatch(fixturesSource, /\/assess|assessCoordinationPath|createCoordinationAssessment/);
  assert.doesNotMatch(fixturesSource, /sendEmail|sendSMS|sendInfoSheetEmail|sendGeneralEmail|\/api\/sms|\/api\/emails?/);
  assert.doesNotMatch(fixturesSource, /createInvoice\(|sendInvoice\(|\/api\/invoices?/);
  assert.doesNotMatch(fixturesSource, /createContract\(|sendForSignature\(|\/api\/contracts?/);
  assert.doesNotMatch(fixturesSource, /createPayment\(|collectPayment\(|\/api\/square|\/api\/payments?|SquareClient|new Square/i);
  assert.doesNotMatch(fixturesSource, /ObjectUploader|\/api\/objects|uploadURL|getUploadParameters/);
  assert.doesNotMatch(fixturesSource, /OpenAI|Anthropic|GoogleGenAI|generateContent|chat\.completions|scheduleAI|processScheduleChat/);
  assert.doesNotMatch(fixturesSource, /createClientLink|client link ready|public link ready/i);
  assert.doesNotMatch(fixturesSource, /provider acceptance created|provider accepted by system|route accepted by system/i);
  assert.match(fixturesTestSource, /converted draft fails when forbidden actions are removed/);
  assert.match(fixturesTestSource, /converted draft fails when review becomes send or action authority/);
});
