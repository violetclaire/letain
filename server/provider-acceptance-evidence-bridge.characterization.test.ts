import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  PROVIDER_ACCEPTANCE_FORBIDDEN_ACTIONS,
  PROVIDER_ACCEPTANCE_STATES,
} from "./provider-acceptance-state-characterization";
import {
  PROVIDER_ACCEPTANCE_CAPTURE_SOURCE_BASES,
  ProviderAcceptanceEvidenceBridgeValidationError,
  buildPrivateProviderAcceptanceReview,
  validateProviderAcceptanceEvidenceBridgeInput,
  type ProviderAcceptanceEvidenceBridgeInput,
} from "./provider-acceptance-evidence-bridge";
import {
  providerAcceptanceEvidenceBridgeFixtures,
  runProviderAcceptanceEvidenceBridgeFixtureSuite,
} from "./provider-acceptance-evidence-bridge.fixtures";

const bridgeSource = readFileSync("server/provider-acceptance-evidence-bridge.ts", "utf8");
const fixtureSource = readFileSync("server/provider-acceptance-evidence-bridge.fixtures.ts", "utf8");
const routesSource = readFileSync("server/routes.ts", "utf8");
const schemaSource = readFileSync("shared/schema.ts", "utf8");
const inquiryWorkspaceSource = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");
const scheduleBuilderSource = readFileSync("client/src/pages/ScheduleDraftBuilder.tsx", "utf8");

function fixture(fixtureId: string) {
  const found = providerAcceptanceEvidenceBridgeFixtures.find((candidate) => candidate.fixtureId === fixtureId);
  assert.ok(found, `fixture should exist: ${fixtureId}`);
  return found;
}

function validInput(fixtureId = "bridge-direct-provider-acceptance"): ProviderAcceptanceEvidenceBridgeInput {
  return structuredClone(fixture(fixtureId).input);
}

test("bridge fixtures cover every required state and fail-closed input deterministically", () => {
  const first = runProviderAcceptanceEvidenceBridgeFixtureSuite();
  const second = runProviderAcceptanceEvidenceBridgeFixtureSuite();

  assert.deepEqual(first, second);
  assert.equal(first.totalFixtures, 20);
  assert.equal(first.validFixtures, 16);
  assert.equal(first.invalidFixtures, 4);
  assert.equal(first.passed, 20);
  assert.equal(first.failed, 0);
  assert.deepEqual(first.failures, []);
  assert.deepEqual(first.statesCovered, [...PROVIDER_ACCEPTANCE_STATES]);
  assert.equal(first.authorityBoundaryPreserved, true);
});

test("direct provider captures map into the existing seven-state characterizer", () => {
  const expected = new Map([
    ["bridge-direct-provider-acceptance", "explicit_acceptance_signal"],
    ["bridge-direct-provider-decline", "explicit_decline_signal"],
    ["bridge-direct-conditional-acceptance", "conditional_acceptance_signal"],
    ["bridge-direct-provider-withdrawal", "withdrawn_or_superseded_signal"],
    ["bridge-conflicting-direct-provider-messages", "conflicting_provider_signals"],
    ["bridge-acceptance-relevant-material-change", "stale_signal_requires_review"],
  ]);

  for (const [fixtureId, expectedState] of expected) {
    const review = buildPrivateProviderAcceptanceReview(fixture(fixtureId).input);
    assert.equal(review.characterization.state, expectedState, fixtureId);
  }
  assert.equal(
    buildPrivateProviderAcceptanceReview(fixture("bridge-invitation-without-response").input).characterization.state,
    "unresolved_no_explicit_signal",
  );
});

test("non-provider context remains unresolved even when its text or status says accepted", () => {
  for (const fixtureId of [
    "bridge-operator-claims-provider-accepted",
    "bridge-client-claims-provider-accepted",
    "bridge-route-status-accepted",
    "bridge-schedule-placement",
    "bridge-availability-context",
    "bridge-invitation-without-response",
    "bridge-relationship-prior-history",
    "bridge-commercial-context",
  ]) {
    const review = buildPrivateProviderAcceptanceReview(fixture(fixtureId).input);
    assert.equal(review.characterization.state, "unresolved_no_explicit_signal", fixtureId);
    assert.equal(review.characterization.explicitProviderAuthoredSignal, false, fixtureId);
  }
});

test("only a complete direct-provider-message envelope normalizes as provider-message evidence", () => {
  const direct = buildPrivateProviderAcceptanceReview(validInput());
  assert.equal(direct.normalizedCharacterizationInput.evidence[0]?.source, "provider_message");
  assert.equal(direct.normalizedCharacterizationInput.evidence[0]?.authorType, "provider");

  const route = buildPrivateProviderAcceptanceReview(fixture("bridge-route-status-accepted").input);
  assert.equal(route.normalizedCharacterizationInput.evidence[0]?.source, "route_record");
  assert.notEqual(route.normalizedCharacterizationInput.evidence[0]?.source, "provider_message");
  assert.equal(PROVIDER_ACCEPTANCE_CAPTURE_SOURCE_BASES.includes("direct_provider_message"), true);
  assert.equal((PROVIDER_ACCEPTANCE_CAPTURE_SOURCE_BASES as readonly string[]).includes("coordination_event"), false);
});

test("missing required direct-message provenance fails closed", () => {
  const mutations: Array<[string, (input: ProviderAcceptanceEvidenceBridgeInput) => void]> = [
    ["claimed original author identity is required", (input) => { input.captures[0].claimedOriginalAuthor.authorId = ""; }],
    ["originalAuthoredAt must be a fixed ISO timestamp", (input) => { input.captures[0].originalAuthoredAt = ""; }],
    ["contextVersion is required", (input) => { input.captures[0].contextVersion = ""; }],
    ["statement is required", (input) => { input.captures[0].statement = ""; }],
    ["source artifact is required", (input) => { input.captures[0].sourceArtifact.artifactId = ""; }],
    ["source channel is required", (input) => { input.captures[0].sourceArtifact.channel = ""; }],
    ["capturedBy operator identity is required", (input) => { input.captures[0].capturedBy.authorId = ""; }],
    ["claimed original author type is required", (input) => {
      (input.captures[0] as unknown as { claimedOriginalAuthor?: unknown }).claimedOriginalAuthor = undefined;
    }],
    ["signalKind is invalid", (input) => {
      (input.captures[0] as unknown as { signalKind: string }).signalKind = "accepted_route_status";
    }],
  ];

  for (const [expectedIssue, mutate] of mutations) {
    const input = validInput();
    mutate(input);
    const validation = validateProviderAcceptanceEvidenceBridgeInput(input);
    assert.equal(validation.valid, false, expectedIssue);
    assert.ok(validation.issues.some((issue) => issue.includes(expectedIssue)), expectedIssue);
    assert.throws(
      () => buildPrivateProviderAcceptanceReview(input),
      (error) => error instanceof ProviderAcceptanceEvidenceBridgeValidationError,
    );
  }
});

test("source basis cannot relabel operator or client captures as direct provider voice", () => {
  const directClaimedByOperator = validInput();
  directClaimedByOperator.captures[0].claimedOriginalAuthor.authorType = "operator";
  assert.ok(
    validateProviderAcceptanceEvidenceBridgeInput(directClaimedByOperator).issues.some((issue) =>
      issue.includes("direct provider message requires claimed provider authorship")),
  );

  const operatorNoteClaimedByProvider = validInput("bridge-operator-claims-provider-accepted");
  operatorNoteClaimedByProvider.captures[0].claimedOriginalAuthor.authorType = "provider";
  assert.ok(
    validateProviderAcceptanceEvidenceBridgeInput(operatorNoteClaimedByProvider).issues.some((issue) =>
      issue.includes("operator note requires claimed operator authorship")),
  );

  const clientMessageClaimedByProvider = validInput("bridge-client-claims-provider-accepted");
  clientMessageClaimedByProvider.captures[0].claimedOriginalAuthor.authorType = "provider";
  assert.ok(
    validateProviderAcceptanceEvidenceBridgeInput(clientMessageClaimedByProvider).issues.some((issue) =>
      issue.includes("client message requires claimed client authorship")),
  );
});

test("conditional acceptance requires explicit non-empty conditions", () => {
  const malformed = fixture("bridge-malformed-conditional-without-conditions").input;
  const validation = validateProviderAcceptanceEvidenceBridgeInput(malformed);
  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some((issue) => issue.includes("conditional acceptance requires conditions")));
});

test("capture chronology and original authored chronology remain separate", () => {
  const input = validInput("bridge-conflicting-direct-provider-messages");
  input.captures[0].capturedAt = "2026-07-12T12:00:00Z";
  input.captures[1].capturedAt = "2026-07-12T11:00:00Z";
  const review = buildPrivateProviderAcceptanceReview(input);

  assert.deepEqual(
    review.captureChronology.map((capture) => capture.captureId),
    ["capture-conflict-decline", "capture-conflict-acceptance"],
  );
  assert.deepEqual(
    review.normalizedCharacterizationInput.evidence.map((evidence) => evidence.evidenceId),
    ["capture-conflict-acceptance", "capture-conflict-decline"],
  );
  assert.deepEqual(
    review.characterization.chronology.map((evidence) => evidence.evidenceId),
    ["capture-conflict-acceptance", "capture-conflict-decline"],
  );
});

test("capture time and capturing operator never replace original authorship", () => {
  const review = buildPrivateProviderAcceptanceReview(validInput());
  const capture = review.captureChronology[0];
  const evidence = review.normalizedCharacterizationInput.evidence[0];
  const provenance = review.captureProvenance[0];

  assert.equal(evidence.authoredAt, capture.originalAuthoredAt);
  assert.notEqual(evidence.authoredAt, capture.capturedAt);
  assert.equal(evidence.authorId, capture.claimedOriginalAuthor.authorId);
  assert.notEqual(evidence.authorId, capture.capturedBy.authorId);
  assert.equal(provenance.capturedByOperatorId, capture.capturedBy.authorId);
  assert.equal(provenance.claimedOriginalAuthor.authorId, evidence.authorId);
});

test("manually captured authorship is explicitly unauthenticated and requires review", () => {
  const review = buildPrivateProviderAcceptanceReview(validInput());
  assert.equal(review.authorshipAuthenticated, false);
  assert.equal(review.provenanceRequiresHumanReview, true);
  assert.equal(review.requiresHumanReview, true);
  assert.deepEqual(review.visibleTo, ["operator", "admin"]);
  assert.ok(review.captureProvenance.every((item) => item.authorshipAuthenticated === false));
  assert.ok(review.normalizationReasons.some((reason) =>
    reason.code === "DIRECT_PROVIDER_MESSAGE_CAPTURED_WITH_UNAUTHENTICATED_AUTHORSHIP"));
  assert.match(review.normalizationReasons[0]?.detail ?? "", /not independently authenticated/i);
});

test("non-provider supersession cannot erase provider voice", () => {
  const review = buildPrivateProviderAcceptanceReview(
    fixture("bridge-non-provider-supersession-attempt").input,
  );
  assert.equal(review.characterization.state, "explicit_acceptance_signal");
  assert.deepEqual(review.characterization.characterizingEvidenceIds, ["capture-provider-before-operator-note"]);
});

test("relevant context changes create stale review while unrelated changes do not", () => {
  const relevant = buildPrivateProviderAcceptanceReview(
    fixture("bridge-acceptance-relevant-material-change").input,
  );
  const unrelated = buildPrivateProviderAcceptanceReview(
    fixture("bridge-acceptance-unrelated-material-change").input,
  );
  assert.equal(relevant.characterization.state, "stale_signal_requires_review");
  assert.equal(unrelated.characterization.state, "explicit_acceptance_signal");
});

test("every valid bridge result remains private, evidence-only, and actionless", () => {
  for (const candidate of providerAcceptanceEvidenceBridgeFixtures.filter(
    (item) => item.expectedValidation === "valid",
  )) {
    const review = buildPrivateProviderAcceptanceReview(candidate.input);
    assert.deepEqual(review.visibleTo, ["operator", "admin"], candidate.fixtureId);
    assert.equal(review.evidenceOnly, true, candidate.fixtureId);
    assert.equal(review.requiresHumanReview, true, candidate.fixtureId);
    assert.equal(review.provenanceRequiresHumanReview, true, candidate.fixtureId);
    assert.equal(review.authorshipAuthenticated, false, candidate.fixtureId);
    assert.equal(review.grantsRuntimeAuthority, false, candidate.fixtureId);
    assert.deepEqual(review.allowedActions, [], candidate.fixtureId);
    assert.deepEqual(review.forbiddenActions, [...PROVIDER_ACCEPTANCE_FORBIDDEN_ACTIONS], candidate.fixtureId);
    assert.deepEqual(review.forbiddenActions, review.characterization.forbiddenActions, candidate.fixtureId);
  }
});

test("the bridge output is stable across repeated runs and does not alter its input", () => {
  const input = validInput("bridge-direct-provider-withdrawal");
  const before = structuredClone(input);
  const first = buildPrivateProviderAcceptanceReview(input);
  const second = buildPrivateProviderAcceptanceReview(input);
  assert.deepEqual(first, second);
  assert.deepEqual(input, before);
});

test("the bridge remains source/test infrastructure with no runtime or external authority", () => {
  const source = bridgeSource + fixtureSource;
  assert.doesNotMatch(routesSource, /provider-acceptance-evidence-bridge|buildPrivateProviderAcceptanceReview/);
  assert.doesNotMatch(schemaSource, /ProviderAcceptanceEvidenceBridge|provider_acceptance_evidence_bridge/);
  assert.doesNotMatch(inquiryWorkspaceSource, /providerAcceptanceEvidenceBridge|buildPrivateProviderAcceptanceReview/);
  assert.doesNotMatch(scheduleBuilderSource, /providerAcceptanceEvidenceBridge|buildPrivateProviderAcceptanceReview/);
  assert.doesNotMatch(source, /fetch\(|apiRequest|useQuery|useMutation|axios|XMLHttpRequest|WebSocket/);
  assert.doesNotMatch(source, /app\.(?:get|post|put|patch|delete)\(|storage\.|db\.(?:insert|update|delete|select)/);
  assert.doesNotMatch(source, /pgTable|drizzle|migration|ALTER TABLE|CREATE TABLE/i);
  assert.doesNotMatch(source, /\b(?:passport|session|isAuthenticated|requireAuth)\b|openid-client/);
  assert.doesNotMatch(source, /gmail|googleapis|oauth/i);
  assert.doesNotMatch(source, /OpenAI|Anthropic|GoogleGenAI|generateContent|chat\.completions|responses\.create/);
  assert.doesNotMatch(source, /sendEmail|sendSMS|sendGeneralEmail|createClientLink|runPreflight|updateInquiryRoute/);
  assert.doesNotMatch(source, /createInvoice\(|createContract\(|collectPayment\(|\/api\/square/);
  assert.doesNotMatch(source, /generateProductionSchedule|applyPreview|saveSchedule|publishSchedule/);
  assert.doesNotMatch(source, /writeFile|appendFile|execSync|spawn|git push|pull request/i);
  assert.doesNotMatch(source, /Date\.now|new Date\(/);
});
