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

test("an explicit later superseding provider message replaces the earlier signal", () => {
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
