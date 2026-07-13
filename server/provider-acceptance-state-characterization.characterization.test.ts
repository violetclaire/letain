import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  PROVIDER_ACCEPTANCE_FORBIDDEN_ACTIONS,
  PROVIDER_ACCEPTANCE_STATES,
  characterizeProviderAcceptanceState,
  validateProviderAcceptanceStateInput,
  type ProviderAcceptanceStateCharacterizationResult,
} from "./provider-acceptance-state-characterization";
import {
  providerAcceptanceStateFixtures,
  runProviderAcceptanceStateFixtureSuite,
} from "./provider-acceptance-state-characterization.fixtures";

const source = readFileSync("server/provider-acceptance-state-characterization.ts", "utf8");
const fixtureSource = readFileSync("server/provider-acceptance-state-characterization.fixtures.ts", "utf8");
const routesSource = readFileSync("server/routes.ts", "utf8");
const schemaSource = readFileSync("shared/schema.ts", "utf8");
const scheduleBuilderSource = readFileSync("client/src/pages/ScheduleDraftBuilder.tsx", "utf8");

test("provider acceptance fixtures cover all required evidence states deterministically", () => {
  const first = runProviderAcceptanceStateFixtureSuite();
  const second = runProviderAcceptanceStateFixtureSuite();

  assert.deepEqual(first, second);
  assert.equal(first.totalFixtures, 9);
  assert.equal(first.passed, 9);
  assert.equal(first.failed, 0);
  assert.deepEqual(first.failures, []);
  assert.deepEqual(first.statesCovered, [...PROVIDER_ACCEPTANCE_STATES]);
  assert.equal(first.authorityBoundaryPreserved, true);
});

test("only explicit provider-authored messages create acceptance or decline signals", () => {
  const results = new Map(
    providerAcceptanceStateFixtures.map((fixture) => [
      fixture.fixtureId,
      characterizeProviderAcceptanceState(fixture.input),
    ]),
  );

  assert.equal(results.get("provider-explicit-acceptance")?.state, "explicit_acceptance_signal");
  assert.equal(results.get("provider-explicit-decline")?.state, "explicit_decline_signal");
  assert.equal(results.get("provider-silence-no-response")?.state, "unresolved_no_explicit_signal");
  assert.equal(results.get("provider-route-schedule-context-only")?.state, "unresolved_no_explicit_signal");
  assert.equal(results.get("provider-acceptance-claimed-by-others")?.state, "unresolved_no_explicit_signal");
  assert.equal(results.get("provider-explicit-acceptance")?.explicitProviderAuthoredSignal, true);
  assert.equal(results.get("provider-silence-no-response")?.explicitProviderAuthoredSignal, false);
  assert.equal(results.get("provider-acceptance-claimed-by-others")?.explicitProviderAuthoredSignal, false);
});

test("conditional acceptance preserves the provider-authored condition", () => {
  const fixture = providerAcceptanceStateFixtures.find(
    (candidate) => candidate.fixtureId === "provider-conditional-acceptance",
  );
  assert.ok(fixture);

  const result = characterizeProviderAcceptanceState(fixture.input);
  assert.equal(result.state, "conditional_acceptance_signal");
  assert.deepEqual(result.conditions, ["Start time remains 8:00 AM"]);
  assert.equal(result.requiresHumanReview, true);
  assert.equal(result.grantsRuntimeAuthority, false);
});

test("conflict, withdrawal, and stale context do not leave acceptance current", () => {
  const results = Object.fromEntries(
    providerAcceptanceStateFixtures.map((fixture) => [
      fixture.fixtureId,
      characterizeProviderAcceptanceState(fixture.input),
    ]),
  );

  assert.equal(results["provider-conflicting-signals"].state, "conflicting_provider_signals");
  assert.equal(results["provider-acceptance-withdrawn"].state, "withdrawn_or_superseded_signal");
  assert.equal(results["provider-acceptance-stale-after-change"].state, "stale_signal_requires_review");
  assert.deepEqual(results["provider-acceptance-withdrawn"].characterizingEvidenceIds, ["evidence-withdrawal"]);
  assert.ok(
    results["provider-acceptance-stale-after-change"].characterizingEvidenceIds.includes("evidence-material-change"),
  );
});

test("a provider-authored decline may explicitly supersede provider acceptance", () => {
  const fixture = providerAcceptanceStateFixtures.find(
    (candidate) => candidate.fixtureId === "provider-conflicting-signals",
  );
  assert.ok(fixture);

  const input = structuredClone(fixture.input);
  input.evidence[1].supersedesEvidenceIds = [input.evidence[0].evidenceId];
  const result = characterizeProviderAcceptanceState(input);

  assert.equal(result.state, "explicit_decline_signal");
  assert.deepEqual(result.characterizingEvidenceIds, ["evidence-conflict-decline"]);
  assert.equal(result.grantsRuntimeAuthority, false);
});

test("operator, client, route, schedule, and system evidence cannot supersede provider voice", () => {
  const acceptanceFixture = providerAcceptanceStateFixtures.find(
    (candidate) => candidate.fixtureId === "provider-explicit-acceptance",
  );
  assert.ok(acceptanceFixture);

  const nonProviderSupersedingEvidence = [
    {
      authorType: "operator" as const,
      source: "operator_note" as const,
      kind: "acceptance" as const,
      statement: "Operator note claims the provider response is superseded.",
    },
    {
      authorType: "client" as const,
      source: "client_message" as const,
      kind: "decline" as const,
      statement: "Client message claims the provider changed their response.",
    },
    {
      authorType: "operator" as const,
      source: "route_record" as const,
      kind: "route_assignment" as const,
      statement: "A route record claims it replaces provider evidence.",
    },
    {
      authorType: "operator" as const,
      source: "schedule_draft" as const,
      kind: "schedule_placement" as const,
      statement: "A schedule record claims it replaces provider evidence.",
    },
    {
      authorType: "operator" as const,
      source: "invitation_record" as const,
      kind: "invitation_sent" as const,
      statement: "An invitation record claims it replaces provider evidence.",
    },
    {
      authorType: "operator" as const,
      source: "relationship_record" as const,
      kind: "prior_work_history" as const,
      statement: "Relationship history claims it replaces provider evidence.",
    },
    {
      authorType: "operator" as const,
      source: "commercial_record" as const,
      kind: "payment_contract_context" as const,
      statement: "Commercial context claims it replaces provider evidence.",
    },
    {
      authorType: "system" as const,
      source: "material_context" as const,
      kind: "other" as const,
      statement: "System evidence claims it replaces provider evidence.",
    },
  ];

  for (const [index, evidence] of nonProviderSupersedingEvidence.entries()) {
    const input = structuredClone(acceptanceFixture.input);
    input.evidence.push({
      evidenceId: `non-provider-supersession-${index}`,
      authoredAt: `2026-07-10T08:${String(index + 1).padStart(2, "0")}:00Z`,
      authorType: evidence.authorType,
      authorId: `synthetic-non-provider-${index}`,
      source: evidence.source,
      kind: evidence.kind,
      statement: evidence.statement,
      contextVersion: "terms-v1",
      supersedesEvidenceIds: ["evidence-provider-acceptance"],
    });

    const result = characterizeProviderAcceptanceState(input);
    assert.equal(result.state, "explicit_acceptance_signal", evidence.source);
    assert.deepEqual(result.characterizingEvidenceIds, ["evidence-provider-acceptance"]);
    assert.equal(result.grantsRuntimeAuthority, false);
  }
});

test("an unrelated material context record does not stale a current provider signal", () => {
  const fixture = providerAcceptanceStateFixtures.find(
    (candidate) => candidate.fixtureId === "provider-explicit-acceptance",
  );
  assert.ok(fixture);

  const input = structuredClone(fixture.input);
  input.currentContextVersion = "terms-v2";
  input.evidence[0].contextVersion = "terms-v2";
  input.evidence.push({
    evidenceId: "unrelated-material-change",
    authoredAt: "2026-07-10T08:01:00Z",
    authorType: "operator",
    authorId: "synthetic-operator",
    source: "material_context",
    kind: "material_context_change",
    statement: "An older context changed, unrelated to the current provider response.",
    contextVersion: "terms-v1",
  });

  const result = characterizeProviderAcceptanceState(input);
  assert.equal(result.state, "explicit_acceptance_signal");
  assert.deepEqual(result.characterizingEvidenceIds, ["evidence-provider-acceptance"]);
});

test("a relevant later material change makes current-context acceptance stale", () => {
  const fixture = providerAcceptanceStateFixtures.find(
    (candidate) => candidate.fixtureId === "provider-explicit-acceptance",
  );
  assert.ok(fixture);

  const input = structuredClone(fixture.input);
  input.currentContextVersion = "terms-v2";
  input.evidence[0].contextVersion = "terms-v2";
  input.evidence.push({
    evidenceId: "relevant-material-change",
    authoredAt: "2026-07-10T08:01:00Z",
    authorType: "operator",
    authorId: "synthetic-operator",
    source: "material_context",
    kind: "material_context_change",
    statement: "The current timing and terms materially changed after the provider response.",
    contextVersion: "terms-v2",
  });

  const result = characterizeProviderAcceptanceState(input);
  assert.equal(result.state, "stale_signal_requires_review");
  assert.ok(result.characterizingEvidenceIds.includes("relevant-material-change"));
  assert.equal(result.grantsRuntimeAuthority, false);
});

test("characterization preserves source provenance and chronological order", () => {
  const fixture = providerAcceptanceStateFixtures.find(
    (candidate) => candidate.fixtureId === "provider-conflicting-signals",
  );
  assert.ok(fixture);

  const reversed = structuredClone(fixture.input);
  reversed.evidence.reverse();
  const result = characterizeProviderAcceptanceState(reversed);

  assert.deepEqual(result.chronology.map((evidence) => evidence.evidenceId), [
    "evidence-conflict-acceptance",
    "evidence-conflict-decline",
  ]);
  assert.deepEqual(result.provenance.map((item) => item.source), ["provider_message", "provider_message"]);
  assert.deepEqual(result.provenance.map((item) => item.authorType), ["provider", "provider"]);
});

test("invalid evidence fails validation before characterization", () => {
  const fixture = structuredClone(providerAcceptanceStateFixtures[0]);
  fixture.input.evidence[0].statement = "";
  fixture.input.evidence.push({ ...fixture.input.evidence[0], statement: "duplicate" });

  const validation = validateProviderAcceptanceStateInput(fixture.input);
  assert.equal(validation.valid, false);
  assert.ok(validation.issues.includes("statement is required: evidence-provider-acceptance"));
  assert.ok(validation.issues.includes("duplicate evidenceId: evidence-provider-acceptance"));
  assert.throws(() => characterizeProviderAcceptanceState(fixture.input), /Invalid provider acceptance evidence/);
});

test("validation rejects impossible characterization and supersession chronology", () => {
  const fixture = structuredClone(
    providerAcceptanceStateFixtures.find(
      (candidate) => candidate.fixtureId === "provider-acceptance-withdrawn",
    ),
  );
  assert.ok(fixture);

  fixture.input.evidence[1].authoredAt = "2026-07-10T08:34:00Z";
  fixture.input.evidence[0].authoredAt = "2026-07-10T12:01:00Z";
  const validation = validateProviderAcceptanceStateInput(fixture.input);

  assert.equal(validation.valid, false);
  assert.ok(validation.issues.includes("evidence cannot occur after characterizedAt: evidence-before-withdrawal"));
  assert.ok(
    validation.issues.includes(
      "superseding evidence must be later: evidence-withdrawal -> evidence-before-withdrawal",
    ),
  );
});

test("every characterized state remains evidence-only and forbids external action", () => {
  for (const fixture of providerAcceptanceStateFixtures) {
    const result = characterizeProviderAcceptanceState(fixture.input);
    assert.equal(result.evidenceOnly, true);
    assert.equal(result.requiresHumanReview, true);
    assert.equal(result.grantsRuntimeAuthority, false);
    assert.deepEqual(result.allowedActions, []);
    assert.deepEqual(result.forbiddenActions, [...PROVIDER_ACCEPTANCE_FORBIDDEN_ACTIONS]);
  }
});

test("fixture suite fails if characterization grants runtime authority", () => {
  const report = runProviderAcceptanceStateFixtureSuite({
    fixtures: [providerAcceptanceStateFixtures[0]],
    resultTransform: (result) => ({
      ...result,
      grantsRuntimeAuthority: true,
      allowedActions: ["route provider"],
    } as unknown as ProviderAcceptanceStateCharacterizationResult),
  });

  assert.equal(report.passed, 0);
  assert.equal(report.failed, 1);
  assert.equal(report.failures[0]?.stage, "authority_boundary");
});

test("provider acceptance characterization remains source/test infrastructure only", () => {
  assert.doesNotMatch(routesSource, /provider-acceptance-state-characterization|characterizeProviderAcceptanceState/);
  assert.doesNotMatch(schemaSource, /provider_acceptance_state_characterization|ProviderAcceptanceStateCharacterization/);
  assert.doesNotMatch(scheduleBuilderSource, /providerAcceptanceStateCharacterization|characterizeProviderAcceptanceState/);
  assert.doesNotMatch(source + fixtureSource, /fetch\(|useQuery|useMutation|method: "POST"|method: "PATCH"|method: "PUT"|method: "DELETE"/);
  assert.doesNotMatch(source + fixtureSource, /Date\.now|new Date\(/);
  assert.doesNotMatch(source + fixtureSource, /\/api\/assess|assessCoordinationPath|createCoordinationAssessment/);
  assert.doesNotMatch(source + fixtureSource, /sendEmail|sendSMS|\/api\/sms|\/api\/emails?/);
  assert.doesNotMatch(source + fixtureSource, /createInvoice\(|createContract\(|collectPayment\(|\/api\/square/);
  assert.doesNotMatch(source + fixtureSource, /OpenAI|Anthropic|GoogleGenAI|generateContent|chat\.completions/);
  assert.doesNotMatch(source + fixtureSource, /writeFile|appendFile|execSync|spawn|git push|pull request/i);
});
