import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  COORDINATION_JUDGMENT_EVAL_VERSION,
  coordinationJudgmentEvalCases,
  type CoordinationJudgmentEvalCase,
} from "./coordination-judgment-eval-cases";
import {
  COORDINATION_JUDGMENT_FAILURE_MODES,
  evaluateCoordinationJudgmentCase,
  evaluateCoordinationJudgmentCases,
} from "./coordination-judgment-eval-harness";

const casesSource = readFileSync("server/coordination-judgment-eval-cases.ts", "utf8");
const harnessSource = readFileSync("server/coordination-judgment-eval-harness.ts", "utf8");
const testSource = readFileSync("server/coordination-judgment-eval.characterization.test.ts", "utf8");
const routesSource = readFileSync("server/routes.ts", "utf8");
const schemaSource = readFileSync("shared/schema.ts", "utf8");
const inquiryWorkspaceSource = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");

function withCandidateMutation(
  evalCase: CoordinationJudgmentEvalCase,
  mutate: (copy: CoordinationJudgmentEvalCase) => void,
): CoordinationJudgmentEvalCase {
  const copy = structuredClone(evalCase);
  mutate(copy);
  return copy;
}

function modesFor(evalCase: CoordinationJudgmentEvalCase): string[] {
  return evaluateCoordinationJudgmentCase(evalCase).findings.map((finding) => finding.mode);
}

test("coordination judgment eval fixtures are versioned, synthetic, and transcript-free", () => {
  assert.equal(COORDINATION_JUDGMENT_EVAL_VERSION, "coordination-judgment-v1");
  assert.ok(coordinationJudgmentEvalCases.length >= 3);

  for (const evalCase of coordinationJudgmentEvalCases) {
    assert.equal(evalCase.version, COORDINATION_JUDGMENT_EVAL_VERSION);
    assert.equal(evalCase.synthetic, true);
    assert.equal(evalCase.redacted, true);
    assert.equal(evalCase.rawTranscriptIncluded, false);
    assert.equal(
      evalCase.coreQuestion,
      "Did the system preserve the human judgment needed before moving real-world coordination forward?",
    );
  }

  assert.doesNotMatch(casesSource, /raw transcript|full transcript|message history replay/i);
  assert.doesNotMatch(casesSource, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  assert.doesNotMatch(casesSource, /\b\d{3}[-.)\s]?\d{3}[-.\s]?\d{4}\b/);
});

test("failure-mode taxonomy is stable and covers authority-boundary drift", () => {
  assert.deepEqual([...COORDINATION_JUDGMENT_FAILURE_MODES], [
    "EVIDENCE_BECAME_APPROVAL",
    "REVIEW_BECAME_SEND_AUTHORITY",
    "PERMISSIONED_STEP_LEFT_OPERATOR_SCOPE",
    "HUMAN_APPROVAL_DROPPED",
    "BLOCKED_REASON_DROPPED",
    "PRIVATE_FIELD_EXPOSED",
    "PUBLIC_VISIBILITY_TOO_EARLY",
    "FORBIDDEN_ACTION_ENABLED",
    "FORBIDDEN_ACTION_NOT_PRESERVED",
    "CONTRACTED_WORK_LANGUAGE_DROPPED",
  ]);

  assert.match(harnessSource, /EVIDENCE_BECAME_APPROVAL/);
  assert.match(harnessSource, /REVIEW_BECAME_SEND_AUTHORITY/);
  assert.match(harnessSource, /PUBLIC_VISIBILITY_TOO_EARLY/);
  assert.match(harnessSource, /CONTRACTED_WORK_LANGUAGE_DROPPED/);
});

test("deterministic checker passes the current safe coordination judgment cases", () => {
  const results = evaluateCoordinationJudgmentCases(coordinationJudgmentEvalCases);

  assert.ok(results.every((result) => result.passed), JSON.stringify(results, null, 2));
  assert.ok(results.every((result) => result.findings.length === 0));
});

test("checker rejects evidence or review becoming approval, acceptance, or send authority", () => {
  const base = coordinationJudgmentEvalCases[0];

  assert.ok(modesFor(withCandidateMutation(base, (copy) => {
    copy.candidate.queryAnswer.safeNextStepLabel = "Provider accepted; ready to send";
  })).includes("EVIDENCE_BECAME_APPROVAL"));

  assert.ok(modesFor(withCandidateMutation(base, (copy) => {
    copy.candidate.queryAnswer.safeNextStepLabel = "Send response now";
  })).includes("REVIEW_BECAME_SEND_AUTHORITY"));

  assert.ok(modesFor(withCandidateMutation(base, (copy) => {
    copy.candidate.queryAnswer.requiresHumanApproval = false;
  })).includes("HUMAN_APPROVAL_DROPPED"));
});

test("checker rejects dropped blockers, forbidden actions, and operator-only privacy leaks", () => {
  const base = coordinationJudgmentEvalCases[0];

  assert.ok(modesFor(withCandidateMutation(base, (copy) => {
    copy.candidate.queryAnswer.blockingIssues = [];
  })).includes("BLOCKED_REASON_DROPPED"));

  assert.ok(modesFor(withCandidateMutation(base, (copy) => {
    copy.candidate.queryAnswer.forbiddenActions = copy.candidate.queryAnswer.forbiddenActions
      .filter((action) => action !== "create invoice");
  })).includes("FORBIDDEN_ACTION_NOT_PRESERVED"));

  assert.ok(modesFor(withCandidateMutation(base, (copy) => {
    copy.candidate.operatorSurface.actionLabels = ["create invoice"];
  })).includes("FORBIDDEN_ACTION_ENABLED"));

  assert.ok(modesFor(withCandidateMutation(base, (copy) => {
    copy.candidate.operatorSurface.publicOrClientVisibleFields = ["private route/recovery evidence log"];
  })).includes("PRIVATE_FIELD_EXPOSED"));
});

test("checker keeps permissioned next steps operator-facing and public visibility forbidden too early", () => {
  const base = coordinationJudgmentEvalCases[2];

  assert.ok(modesFor(withCandidateMutation(base, (copy) => {
    copy.candidate.queryAnswer.visibility = ["operator", "client"];
  })).includes("PERMISSIONED_STEP_LEFT_OPERATOR_SCOPE"));

  assert.ok(modesFor(withCandidateMutation(base, (copy) => {
    copy.candidate.operatorSurface.visibleCopy = ["Public link is ready for the client."];
  })).includes("PUBLIC_VISIBILITY_TOO_EARLY"));
});

test("checker preserves contracted-work language where applicable", () => {
  const availabilityCase = coordinationJudgmentEvalCases[1];

  assert.ok(modesFor(withCandidateMutation(availabilityCase, (copy) => {
    copy.candidate.operatorSurface.visibleCopy = copy.candidate.operatorSurface.visibleCopy
      .filter((copyLine) => copyLine !== "No contracted work is created.");
  })).includes("CONTRACTED_WORK_LANGUAGE_DROPPED"));
});

test("eval harness remains infrastructure only and introduces no product authority", () => {
  const evalSources = [casesSource, harnessSource].join("\n");

  assert.doesNotMatch(routesSource, /coordination-judgment-eval|judgment-eval|eval-harness/);
  assert.doesNotMatch(schemaSource, /coordination_judgment_eval|judgmentEval|evalHarness/);
  assert.doesNotMatch(inquiryWorkspaceSource, /coordinationJudgmentEval|judgmentEval|evalHarness/);
  assert.doesNotMatch(evalSources, /fetch\(|useQuery|useMutation|method: "POST"|method: "PATCH"|method: "PUT"|method: "DELETE"/);
  assert.doesNotMatch(evalSources, /\/assess|assessCoordinationPath|createCoordinationAssessment/);
  assert.doesNotMatch(evalSources, /sendEmail|sendSMS|sendInfoSheetEmail|sendGeneralEmail|\/api\/sms|\/api\/emails?/);
  assert.doesNotMatch(evalSources, /createInvoice\(|sendInvoice\(|\/api\/invoices?/);
  assert.doesNotMatch(evalSources, /createContract\(|sendForSignature\(|\/api\/contracts?/);
  assert.doesNotMatch(evalSources, /createPayment\(|collectPayment\(|\/api\/square|\/api\/payments?|SquareClient|new Square/i);
  assert.doesNotMatch(evalSources, /ObjectUploader|\/api\/objects|uploadURL|getUploadParameters/);
  assert.doesNotMatch(evalSources, /OpenAI|Anthropic|GoogleGenAI|generateContent|chat\.completions|scheduleAI|processScheduleChat/);
  assert.doesNotMatch(evalSources, /createClientLink|client link ready|public link ready/i);
  assert.doesNotMatch(evalSources, /provider acceptance created|provider accepted by system|route accepted by system/i);
});
