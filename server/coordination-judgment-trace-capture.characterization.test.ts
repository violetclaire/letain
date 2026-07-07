import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { evaluateCoordinationJudgmentCase } from "./coordination-judgment-eval-harness";
import {
  CoordinationJudgmentTraceCaptureValidationError,
  traceCaptureToDraftEvalCase,
  validateCoordinationJudgmentTraceCapture,
  type CoordinationJudgmentTraceCapture,
} from "./coordination-judgment-trace-capture";

const traceCaptureSource = readFileSync("server/coordination-judgment-trace-capture.ts", "utf8");
const traceCaptureTestSource = readFileSync("server/coordination-judgment-trace-capture.characterization.test.ts", "utf8");
const evalCaseSource = readFileSync("server/coordination-judgment-eval-cases.ts", "utf8");
const routesSource = readFileSync("server/routes.ts", "utf8");
const schemaSource = readFileSync("shared/schema.ts", "utf8");
const inquiryWorkspaceSource = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");

function baseTraceCapture(): CoordinationJudgmentTraceCapture {
  return {
    sourceTraceId: "trace-demo-inquiry-fairmont-review",
    capturedAt: "2026-07-07T00:00:00.000Z",
    inquiryEvidenceSummary: "Redacted inquiry summary with handoff and recovery signals reviewed by the operator.",
    observedCoordinationState: {
      sourceArtifacts: {
        durable: ["inquiries", "coordination_assessments", "coordination_events"],
        inferredReadOnly: ["permissioned next step", "availability readiness", "route contact readiness"],
        operatorOnly: ["operator review checklist", "private review log"],
      },
      authoritativeSignals: [
        "permission decision: PROCEED_WITH_OVERSIGHT",
        "backend risk factor: UNCONFIRMED_HANDOFF",
        "backend risk factor: LOW_RECOVERY_CAPACITY",
      ],
      nonAuthoritativeSignals: [
        "route contact readiness: 1 reachable option(s)",
        "conflict signal: no conflict surfaced",
      ],
    },
    operatorJudgment: "Operator reviewed handoff and recovery evidence; outreach still requires human approval.",
    operatorDecision: "keep as operator review before outreach",
    permissionOutcome: "PROCEED_WITH_OVERSIGHT",
    blockedReasons: [
      "Missing signal: Route target acceptance",
      "Missing signal: Recovery provider confirmation",
    ],
    privateOnlySignals: [
      "private review log",
      "private route/recovery evidence log",
      "operator review checklist",
    ],
    forbiddenActions: [
      "send response",
      "send email",
      "send SMS",
      "create invoice",
      "send invoice",
      "create contract",
      "create payment",
      "create client link",
      "publish schedule",
      "run preflight",
      "create route",
      "contact anyone",
      "mark provider accepted",
      "AI decision",
      "execute next action",
    ],
    humanApprovalRequired: true,
    safeNextStep: "Review before outreach",
    failureModeTags: [
      "EVIDENCE_BECAME_APPROVAL",
      "REVIEW_BECAME_SEND_AUTHORITY",
      "BLOCKED_REASON_DROPPED",
    ],
    shouldBecomeEvalCase: true,
    evalCaseCandidateId: "trace-candidate-fairmont-operator-review",
    notes: "Candidate should protect the evidence-not-approval boundary.",
    contractedWorkSafetyLanguage: [
      "No contracted work is created.",
    ],
  };
}

function cloneTrace(mutate?: (trace: CoordinationJudgmentTraceCapture) => void): CoordinationJudgmentTraceCapture {
  const trace = structuredClone(baseTraceCapture());
  mutate?.(trace);
  return trace;
}

test("captured operator judgment becomes a draft eval case compatible with the judgment harness", () => {
  const trace = baseTraceCapture();
  const draftEvalCase = traceCaptureToDraftEvalCase(trace);
  const result = evaluateCoordinationJudgmentCase(draftEvalCase);

  assert.equal(draftEvalCase.id, "trace-candidate-fairmont-operator-review");
  assert.equal(draftEvalCase.version, "coordination-judgment-v1");
  assert.equal(draftEvalCase.synthetic, true);
  assert.equal(draftEvalCase.redacted, true);
  assert.equal(draftEvalCase.rawTranscriptIncluded, false);
  assert.equal(
    draftEvalCase.coreQuestion,
    "Did the system preserve the human judgment needed before moving real-world coordination forward?",
  );
  assert.equal(result.passed, true, JSON.stringify(result.findings, null, 2));
});

test("conversion preserves operator judgment, permission state, blocked reasons, and human approval", () => {
  const trace = baseTraceCapture();
  const draftEvalCase = traceCaptureToDraftEvalCase(trace);
  const answer = draftEvalCase.candidate.queryAnswer;

  assert.equal(answer.requiresHumanApproval, true);
  assert.equal(draftEvalCase.expected.requiresHumanApproval, true);
  assert.deepEqual(answer.blockingIssues, trace.blockedReasons);
  assert.deepEqual(draftEvalCase.expected.requiredBlockingIssues, trace.blockedReasons);
  assert.match(answer.authoritativeSignals.join("\n"), /permission outcome: PROCEED_WITH_OVERSIGHT/);
  assert.match(answer.authoritativeSignals.join("\n"), /operator decision: keep as operator review before outreach/);
  assert.match(answer.recommendedOperatorReview.join("\n"), /Operator reviewed handoff and recovery evidence/);
  assert.match(answer.safeNextStepLabel, /Review before outreach/);
});

test("evidence stays evidence and review does not become send or action authority during conversion", () => {
  const draftEvalCase = traceCaptureToDraftEvalCase(baseTraceCapture());
  const answer = draftEvalCase.candidate.queryAnswer;
  const surface = draftEvalCase.candidate.operatorSurface;

  assert.deepEqual(surface.actionLabels, []);
  assert.deepEqual(surface.publicOrClientVisibleFields, []);
  assert.match(surface.visibleCopy.join("\n"), /Evidence does not confirm provider acceptance/);
  assert.match(surface.visibleCopy.join("\n"), /Review does not create send authority/);
  assert.doesNotMatch(answer.safeNextStepLabel, /send now|safe to send|provider accepted|route accepted/i);
});

test("forbidden actions remain forbidden and private-only signals remain operator-only", () => {
  const trace = baseTraceCapture();
  const draftEvalCase = traceCaptureToDraftEvalCase(trace);
  const answer = draftEvalCase.candidate.queryAnswer;

  for (const forbiddenAction of trace.forbiddenActions) {
    assert.ok(answer.forbiddenActions.includes(forbiddenAction), `missing forbidden action: ${forbiddenAction}`);
    assert.ok(
      draftEvalCase.expected.requiredForbiddenActions.includes(forbiddenAction),
      `missing expected forbidden action: ${forbiddenAction}`,
    );
  }

  for (const privateSignal of trace.privateOnlySignals) {
    assert.ok(answer.sourceArtifacts.operatorOnly.includes(privateSignal), `missing private signal: ${privateSignal}`);
    assert.ok(
      draftEvalCase.expected.privateFieldsThatMustNotBecomePublic.includes(privateSignal),
      `missing private field expectation: ${privateSignal}`,
    );
  }
});

test("contracted-work safety language and failure-mode tags are preserved", () => {
  const draftEvalCase = traceCaptureToDraftEvalCase(baseTraceCapture());
  const visibleCopy = draftEvalCase.candidate.operatorSurface.visibleCopy.join("\n");
  const authoritativeSignals = draftEvalCase.candidate.queryAnswer.authoritativeSignals.join("\n");

  assert.match(visibleCopy, /No contracted work is created/);
  assert.ok(draftEvalCase.expected.requiredSafetyCopy.includes("No contracted work is created."));
  assert.match(authoritativeSignals, /failure mode tag: EVIDENCE_BECAME_APPROVAL/);
  assert.match(authoritativeSignals, /failure mode tag: REVIEW_BECAME_SEND_AUTHORITY/);
  assert.match(authoritativeSignals, /failure mode tag: BLOCKED_REASON_DROPPED/);
});

test("missing blocked reasons cause validation failure", () => {
  const trace = cloneTrace((draft) => {
    draft.blockedReasons = [];
  });

  const validation = validateCoordinationJudgmentTraceCapture(trace);
  assert.equal(validation.valid, false);
  assert.ok(validation.issues.includes("blockedReasons are required"));
  assert.throws(
    () => traceCaptureToDraftEvalCase(trace),
    (error) => error instanceof CoordinationJudgmentTraceCaptureValidationError &&
      error.issues.includes("blockedReasons are required"),
  );
});

test("missing operator judgment causes validation failure", () => {
  const trace = cloneTrace((draft) => {
    draft.operatorJudgment = "";
  });

  const validation = validateCoordinationJudgmentTraceCapture(trace);
  assert.equal(validation.valid, false);
  assert.ok(validation.issues.includes("operatorJudgment is required"));
  assert.throws(
    () => traceCaptureToDraftEvalCase(trace),
    (error) => error instanceof CoordinationJudgmentTraceCaptureValidationError &&
      error.issues.includes("operatorJudgment is required"),
  );
});

test("trace capture stays source/test eval infrastructure only", () => {
  const evalSources = [traceCaptureSource, evalCaseSource].join("\n");

  assert.doesNotMatch(routesSource, /coordination-judgment-trace-capture|trace-capture|captureTrace/);
  assert.doesNotMatch(schemaSource, /coordination_judgment_trace|traceCapture|capturedTrace/);
  assert.doesNotMatch(inquiryWorkspaceSource, /coordinationJudgmentTraceCapture|traceCaptureToDraftEvalCase|captureTrace/);
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
  assert.match(traceCaptureTestSource, /missing blocked reasons cause validation failure/);
  assert.match(traceCaptureTestSource, /missing operator judgment causes validation failure/);
});
