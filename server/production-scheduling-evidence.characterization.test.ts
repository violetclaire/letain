import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { reduceScheduleEvidence } from "../shared/schedulingEvidence";
import {
  emilyMultiDayFixture,
  hannahCountOnlyFixture,
  juliaReadinessCorrectionFixture,
  kellyLargePartyCorrectionFixture,
  productionScheduleEvidenceFixtures,
  rachelSpreadsheetFixture,
} from "./production-scheduling-evidence.fixtures";

test("Julia thread preserves the final planner constraint and refuses a conflicting proposed schedule", () => {
  const state = reduceScheduleEvidence(juliaReadinessCorrectionFixture);

  assert.deepEqual(
    state.confirmedPeople.map((person) => person.name).sort(),
    ["Elizabeth", "Julia", "Kiran", "Rashmi", "Sheila"],
  );
  assert.deepEqual(state.people.find((person) => person.name === "Kiran")?.services, ["hair"]);
  assert.equal(state.quoteOnlyRequests.length, 0);
  assert.ok(
    state.readyConstraints.some(
      (constraint) =>
        constraint.personName === "Elizabeth" &&
        constraint.kind === "hard" &&
        constraint.time === "12:30 PM" &&
        constraint.sourceId === "julia-planner-final",
    ),
  );
  assert.ok(state.readyConstraints.some((constraint) => constraint.scope === "group" && constraint.kind === "preferred" && constraint.time === "2:15 PM"));
  assert.ok(state.readyConstraints.some((constraint) => constraint.scope === "group" && constraint.kind === "latest" && constraint.time === "2:30 PM"));
  assert.ok(
    state.warnings.some(
      (warning) =>
        warning.code === "ready_time_conflict" &&
        warning.message.includes("Elizabeth / Julia's mom") &&
        warning.message.includes("12:30 PM") &&
        warning.message.includes("12:30 PM-1:00 PM") &&
        warning.message.includes("Move Elizabeth's makeup earlier"),
    ),
  );
  assert.equal(state.scheduleReadiness, "conflict_requires_resolution");
});

test("Kelly thread applies later roster corrections and audits the candidate schedule without duplicating people", () => {
  const state = reduceScheduleEvidence(kellyLargePartyCorrectionFixture);
  const names = state.people.map((person) => person.name);
  const lisa = state.people.find((person) => person.name === "Lisa");
  const phoebe = state.people.find((person) => person.name === "Phoebe");

  assert.equal(names.filter((name) => name === "Phoebe").length, 1);
  assert.ok(phoebe?.services.includes("hair"));
  assert.equal(phoebe?.preferredPlacement, "early");
  assert.equal(names.includes("Ellen"), false);
  assert.deepEqual(state.removedPeople.map((person) => person.name), ["Ellen"]);
  assert.equal(lisa?.separateRoom, true);
  assert.equal(lisa?.preferredPlacement, "end");
  assert.ok(state.arrivalGuidance.some((guidance) => /15-20 minutes before setup/i.test(guidance)));
  assert.ok(state.readyConstraints.some((constraint) => constraint.personName === "Kelly" && constraint.time === "12:30 PM"));
  assert.ok(state.readyConstraints.some((constraint) => constraint.kind === "preferred" && constraint.time === "1:30 PM"));
  assert.ok(state.readyConstraints.some((constraint) => constraint.kind === "latest" && constraint.time === "2:00 PM"));
  for (const code of ["ready_time_conflict", "missing_person", "removed_person_present", "separate_room_conflict", "placement_conflict"] as const) {
    assert.ok(state.warnings.some((warning) => warning.code === code), `expected ${code}`);
  }
  assert.ok(state.warnings.some((warning) => warning.code === "missing_person" && warning.message.includes("Phoebe")));
  assert.ok(state.warnings.some((warning) => warning.code === "removed_person_present" && warning.message.includes("Ellen")));
  assert.equal(state.scheduleReadiness, "conflict_requires_resolution");
});

test("Rachel spreadsheet separates active highlighted services from billing and unselected additions", () => {
  const state = reduceScheduleEvidence(rachelSpreadsheetFixture);
  const activeRows = state.scheduleableSpreadsheetRows.filter((row) => row.active);

  assert.equal(activeRows.length, 8);
  assert.ok(activeRows.every((row) => row.highlighted === true && row.kind === "service"));
  assert.ok(state.ignoredSpreadsheetRowIds.includes("hotel-row"));
  assert.ok(state.ignoredSpreadsheetRowIds.includes("subtotal-row"));
  assert.equal(state.people.some((person) => person.name === "Auntie Elaine"), false);
  assert.equal(state.people.some((person) => person.name === "Linda Pancratz"), false);
  assert.ok(state.dayContexts.includes("trial"));
  assert.ok(state.dayContexts.includes("friday"));
  assert.ok(state.dayContexts.includes("saturday"));
  assert.ok(state.readyConstraints.some((constraint) => constraint.scope === "event" && constraint.time === "1:00 PM"));
  assert.ok(state.questions.some((question) => question.id === "schedule_day"));
  assert.ok(state.questions.some((question) => question.id === "additions_inclusion"));
  assert.ok(state.questions.some((question) => question.id === "artist_count"));
  assert.ok(state.questions.some((question) => question.id === "lead_artist"));
  assert.ok(state.questions.some((question) => question.id === "provider_timing"));
  assert.ok(
    state.warnings.some(
      (warning) => warning.code === "duplicate_service_candidate" && warning.message.includes("Dana Outcalt"),
    ),
  );
});

test("Hannah count-only request preserves counts and locations without inventing a roster or fetching a link", () => {
  const state = reduceScheduleEvidence(hannahCountOnlyFixture);

  assert.equal(state.artistCount, 3);
  assert.equal(state.declaredPeopleCount, 9);
  assert.deepEqual(state.people.map((person) => person.name), ["Hannah"]);
  assert.equal(state.people[0]?.role, "bride");
  assert.deepEqual(state.people[0]?.services, []);
  assert.ok(state.locations.some((location) => location.kind === "getting_ready" && location.value === "The Toll House in Los Gatos"));
  assert.ok(state.locations.some((location) => location.kind === "venue" && location.value === "Villa"));
  assert.ok(state.readyConstraints.some((constraint) => constraint.time === "1:00 PM" && constraint.kind === "hard"));
  assert.equal(state.externalLinksIgnored, true);
  assert.equal(state.placeholderScheduleAllowed, true);
  assert.equal(state.placeholderLabel, "Working schedule using placeholders - final names/services needed.");
  for (const questionId of ["roster", "service_breakdown", "lead_artist", "provider_timing", "primary_fixed_block", "placeholder_mode"]) {
    assert.ok(state.questions.some((question) => question.id === questionId), `expected ${questionId}`);
  }
  assert.equal(state.scheduleReadiness, "needs_operator_input");
});

test("Emily multi-day thread deduplicates quoted content and preserves later day-scoped corrections", () => {
  const state = reduceScheduleEvidence(emilyMultiDayFixture);
  const grandma = state.people.find((person) => person.name === "Grandma");
  const kira = state.people.find((person) => person.name === "Kira");

  assert.ok(state.dayContexts.includes("friday_welcome_party"));
  assert.ok(state.dayContexts.includes("saturday_wedding_day"));
  assert.equal(state.sourceMessageIds.includes("emily-saturday-order-quoted-repeat"), false);
  assert.equal(state.people.filter((person) => person.name === "Emily").length, 1);
  assert.equal(state.people.filter((person) => person.name === "Kira").length, 1);
  assert.equal(grandma?.separateRoom, true);
  assert.ok(grandma?.services.includes("hair"));
  assert.ok(grandma?.services.includes("makeup"));
  assert.equal(kira?.preferredPlacement, "late");
  assert.equal(kira?.explicitStartTime, "1:30 PM");
  assert.ok(state.readyConstraints.some((constraint) => constraint.personName === "Emily" && constraint.dayContext === "saturday_wedding_day" && constraint.time === "12:30 PM"));
  assert.ok(state.quoteOnlyRequests.every((request) => request.mode === "quote_only" && request.timingRequiredBeforeScheduling));
  assert.ok(state.warnings.some((warning) => warning.code === "count_changed" && warning.message.includes("4 to 5")));
  assert.ok(state.warnings.some((warning) => warning.code === "count_inconsistency"));
  for (const questionId of ["corrected_start_time", "ready_time_scope", "separate_room_assignment", "blowout_scope", "service_breakdown"]) {
    assert.ok(state.questions.some((question) => question.id === questionId), `expected ${questionId}`);
  }
});

test("selected-day reduction excludes other-day readiness and person context", () => {
  const fixture = {
    id: "selected-day-isolation",
    sourceKind: "thread" as const,
    messages: [
      {
        id: "friday-evidence",
        sequence: 1,
        dayContext: "friday_welcome_party",
        text: `
Ready-by time: 3:00 PM
- Maya (Bride) Hair only
Maya receives services in a separate room.
`,
      },
      {
        id: "saturday-evidence",
        sequence: 2,
        dayContext: "saturday_wedding_day",
        text: `
Ready-by time: 12:00 PM
- Maya (Bride) Makeup only
`,
      },
    ],
  };

  const friday = reduceScheduleEvidence({ ...fixture, selectedDay: "friday_welcome_party" });
  const saturday = reduceScheduleEvidence({ ...fixture, selectedDay: "saturday_wedding_day" });

  assert.deepEqual(friday.people[0]?.services, ["hair"]);
  assert.equal(friday.people[0]?.separateRoom, true);
  assert.deepEqual(friday.readyConstraints.map((constraint) => constraint.time), ["3:00 PM"]);
  assert.deepEqual(friday.sourceMessageIds, ["friday-evidence"]);

  assert.deepEqual(saturday.people[0]?.services, ["makeup"]);
  assert.equal(saturday.people[0]?.separateRoom, false);
  assert.deepEqual(saturday.readyConstraints.map((constraint) => constraint.time), ["12:00 PM"]);
  assert.deepEqual(saturday.sourceMessageIds, ["saturday-evidence"]);
  assert.ok(saturday.dayContexts.includes("friday_welcome_party") && saturday.dayContexts.includes("saturday_wedding_day"));
});

test("all five fixtures remain private deterministic source/test inputs", () => {
  assert.equal(productionScheduleEvidenceFixtures.length, 5);
  assert.equal(new Set(productionScheduleEvidenceFixtures.map((fixture) => fixture.id)).size, 5);

  const reducerSource = readFileSync("shared/schedulingEvidence.ts", "utf8");
  const fixtureSource = readFileSync("server/production-scheduling-evidence.fixtures.ts", "utf8");
  const scopedSource = `${reducerSource}\n${fixtureSource}`;

  assert.doesNotMatch(scopedSource, /fetch\s*\(|axios|request\s*\(/);
  assert.doesNotMatch(scopedSource, /sendEmail|sendSMS|sendInfoSheet|createClientLink/);
  assert.doesNotMatch(scopedSource, /GoogleGenAI|OpenAI|chat\.completions|responses\.create|\/assess/);
  assert.doesNotMatch(scopedSource, /\/api\/(?:contracts|payments|square|emails|sms)|preflight.*(?:post|send)|provider.*accepted/i);
});
