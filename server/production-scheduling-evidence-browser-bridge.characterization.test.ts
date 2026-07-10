import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  reduceScheduleEvidence,
  scheduleEvidenceInputFromText,
} from "../shared/schedulingEvidence";

function reduce(raw: string, options: Parameters<typeof scheduleEvidenceInputFromText>[1] = {}) {
  const input = scheduleEvidenceInputFromText(raw, options);
  assert.ok(input);
  return reduceScheduleEvidence(input);
}

test("pasted readiness correction excludes proposed blocks from the roster and surfaces the hard conflict", () => {
  const state = reduce(`
Message 1 - roster
- Julia (Bride) Hair + Makeup
- Elizabeth (Julia's mom / Mother of Bride) Hair + Makeup
- Sheila (Mother in law) Hair + Makeup
- Rashmi (Sister in law) Hair + Makeup
- Kiran (Flower girl) Hair only

Message 2 - proposed schedule
- 11:00 AM-11:45 AM Sheila Hair
- 11:45 AM-12:30 PM Elizabeth Hair
- 12:30 PM-1:00 PM Elizabeth Makeup
- 12:30 PM-1:15 PM Rashmi Hair
- 1:00 PM-1:30 PM Sheila Makeup
- 1:15 PM-1:30 PM Kiran Hair
- 1:30 PM-2:00 PM Rashmi Makeup

Message 3 - final planner correction
Elizabeth / Julia's mom must have hair and makeup completed by 12:30 PM for getting-ready photos.
The rest of the family should ideally be done by 2:15 PM and no later than 2:30 PM.
`);

  assert.deepEqual(state.people.map((person) => person.name), ["Elizabeth", "Julia", "Kiran", "Rashmi", "Sheila"]);
  assert.equal(state.candidateBlocks.length, 7);
  assert.ok(state.warnings.some((warning) => warning.code === "ready_time_conflict" && warning.message.includes("Move Elizabeth's makeup earlier")));
  assert.equal(state.scheduleReadiness, "conflict_requires_resolution");
});

test("pasted large-party correction removes superseded people and preserves restore and room evidence", () => {
  const state = reduce(`
Original roster
- Kelly (Bride) Hair + Makeup
- Phoebe Hair only
- Jessica Hair + Makeup
- Lisa (Mom's friend) Hair only
- Ellen (Mom's friend) Hair only

Correction
Actually just Lisa. Remove Ellen. Lisa is hair only, at the end, in her separate hotel room.
Kelly needs to be ready by 12:30 PM.
Phoebe is missing from the hair schedule. Restore Phoebe for hair only. Phoebe is on East Coast time, so earlier placement is preferred.

Proposed schedule
- 10:45 AM-12:45 PM Kelly Hair + Makeup
- 9:00 AM-10:30 AM Jessica Hair + Makeup
- 11:00 AM-11:45 AM Lisa Hair
- 1:00 PM-1:45 PM Ellen Hair
`);

  assert.equal(state.people.some((person) => person.name === "Ellen"), false);
  assert.equal(state.people.filter((person) => person.name === "Phoebe").length, 1);
  assert.equal(state.people.find((person) => person.name === "Phoebe")?.preferredPlacement, "early");
  assert.equal(state.people.find((person) => person.name === "Lisa")?.separateRoom, true);
  assert.equal(state.people.find((person) => person.name === "Kelly")?.separateRoom, false);
  assert.equal(state.people.find((person) => person.name === "Phoebe")?.separateRoom, false);
  assert.ok(state.removedPeople.some((person) => person.name === "Ellen"));
  assert.ok(state.warnings.some((warning) => warning.code === "ready_time_conflict"));
  assert.ok(state.warnings.some((warning) => warning.code === "missing_person" && warning.message.includes("Phoebe")));
  assert.ok(state.warnings.some((warning) => warning.code === "removed_person_present" && warning.message.includes("Ellen")));
  assert.ok(state.warnings.some((warning) => warning.code === "separate_room_conflict" && warning.message.includes("Lisa")));
});

test("pasted normalized spreadsheet rows preserve highlights, row kinds, days, and additions", () => {
  const state = reduce(`
Highlighted | Row type | Section | Day | Person | Role | Services | Amount | Notes
No | Service | Original | Trial | Rachel Tagle | Bride | Hair + Makeup | 500 |
No | Service | Original | Friday | Rachel Tagle | Bride | Hair + Makeup | 600 |
Yes | Service | Original | Saturday | Rachel Tagle | Bride | Hair + Makeup | 900 |
Yes | Service | Original | Saturday | Kim Tagle | Mother of Bride | Hair + Makeup | 350 |
Yes | Service | Original | Saturday | Dana Outcalt | Bridesmaid | Hair + Makeup | 350 |
Yes | Hotel | Original | Saturday | | | | 900 | Hotel
Yes | Subtotal | Original | Saturday | | | | 2500 |
No | Service | Additions | Saturday | Dana Outcalt | Bridesmaid | Hair | 175 | Hair added
No | Service | Additions | Saturday | Linda Pancratz | Officiant | Hair + Makeup | 350 |
`, { readyTime: "1:00 PM" });

  assert.equal(state.sourceKind, "spreadsheet");
  assert.deepEqual(state.people.map((person) => person.name), ["Dana Outcalt", "Kim Tagle", "Rachel Tagle"]);
  assert.ok(state.ignoredSpreadsheetRowIds.length === 2);
  assert.ok(state.dayContexts.includes("trial") && state.dayContexts.includes("friday") && state.dayContexts.includes("saturday"));
  assert.ok(state.questions.some((question) => question.id === "schedule_day"));
  assert.ok(state.questions.some((question) => question.id === "additions_inclusion"));
  assert.ok(state.warnings.some((warning) => warning.code === "duplicate_service_candidate" && warning.message.includes("Dana Outcalt")));
});

test("pasted count-only request offers explicit placeholders without inventing a final roster", () => {
  const raw = `
Hannah + Kyle wedding
Wedding venue: Villa.
Getting-ready location: The Toll House in Los Gatos.
Ready-by time: 1:00 PM.
Bride + 8 need services, 9 services total.
3 artists confirmed.
Reference schedule: https://example.invalid/redacted-google-doc
`;
  const initial = reduce(raw);
  const placeholders = reduce(raw, { usePlaceholders: true });

  assert.equal(initial.declaredPeopleCount, 9);
  assert.equal(initial.artistCount, 3);
  assert.deepEqual(initial.people.map((person) => person.name), ["Hannah"]);
  assert.equal(initial.placeholderScheduleAllowed, true);
  assert.ok(initial.questions.some((question) => question.id === "roster"));
  assert.ok(initial.questions.some((question) => question.id === "placeholder_mode"));
  assert.equal(placeholders.people.length, 9);
  assert.equal(placeholders.people.filter((person) => /^Guest \d+$/.test(person.name)).length, 8);
  assert.equal(placeholders.placeholderLabel, "Working schedule using placeholders - final names/services needed.");
  assert.equal(placeholders.scheduleReadiness, "needs_operator_input");
});

test("pasted multi-day thread deduplicates repeated rosters and preserves later corrections by day", () => {
  const state = reduce(`
Friday / Welcome Party
All 4 people need hair and makeup and must be done by 3:15 PM.
Push Friday start back 30 minutes from 11:30 AM.
Emily needs to be ready by 3:00 PM only; confirm whether everyone shares that ready time.
Add her sister for Friday hair and makeup.
Weather-dependent touchups after rehearsal around 5:00 PM are quote-only unless confirmed.

Saturday / Wedding Day
9 people need services Saturday.
1. Sydney Gelber
2. Sydney Agona
3. Amanda
4. Caroline
5. Nina
6. Amy (Mother of Bride)
7. Diane (Mother of Groom)
8. Emily (Bride)
9. Kira

Quoted repeat
1. Sydney Gelber
2. Sydney Agona
3. Amanda
4. Caroline
5. Nina
6. Amy (Mother of Bride)
7. Diane (Mother of Groom)
8. Emily (Bride)
9. Kira

Emily needs to be ready by 12:30 PM. 3 artists arrive at 8:00 AM.
Kira should go after the bride and start at 1:30 PM.
Add Grandma for hair and makeup. Grandma is elderly and will receive services in her separate room.
Confirm whether the bride blowout is inside hair and makeup timing or a separate prep block.
`);

  assert.equal(state.people.filter((person) => person.name === "Sydney Gelber").length, 1);
  assert.equal(state.people.filter((person) => person.name === "Kira").length, 1);
  assert.equal(state.people.find((person) => person.name === "Grandma")?.separateRoom, true);
  assert.equal(state.people.find((person) => person.name === "Kira")?.explicitStartTime, "1:30 PM");
  assert.ok(state.dayContexts.includes("friday_welcome_party") && state.dayContexts.includes("saturday_wedding_day"));
  assert.ok(state.questions.some((question) => question.id === "schedule_day"));
  assert.ok(state.questions.some((question) => question.id === "corrected_start_time"));
  assert.ok(state.questions.some((question) => question.id === "separate_room_assignment"));
  assert.ok(state.questions.some((question) => question.id === "blowout_scope"));
  assert.ok(state.quoteOnlyRequests.every((request) => request.mode === "quote_only"));
});

test("Schedule Draft Builder renders private reduced evidence and blocks unresolved preview application", () => {
  const builderSource = readFileSync("client/src/pages/ScheduleDraftBuilder.tsx", "utf8");
  const routeSource = readFileSync("server/routes.ts", "utf8");

  assert.match(builderSource, /scheduleEvidenceInputFromText/);
  assert.match(builderSource, /reduceScheduleEvidence/);
  assert.match(builderSource, /parsedScheduleRequestFromEvidence/);
  assert.match(builderSource, /data-testid="section-schedule-evidence-review"/);
  assert.match(builderSource, /data-testid="list-evidence-warnings"/);
  assert.match(builderSource, /data-testid="list-removed-evidence-people"/);
  assert.match(builderSource, /data-testid="select-evidence-day"/);
  assert.match(builderSource, /data-testid="select-evidence-placeholders"/);
  assert.match(builderSource, /evidenceBlocksPreview/);
  assert.match(builderSource, /blockingProductionWarnings/);
  assert.match(builderSource, /productionBlocksPreview/);
  assert.match(builderSource, /!productionBlocksPreview/);
  assert.match(builderSource, /data-testid="list-production-blockers"/);
  assert.match(builderSource, /Resolve production blockers before applying/);
  assert.match(builderSource, /Evidence review does not approve, send, publish, create a client link, or make a provider commitment\./);
  assert.doesNotMatch(builderSource, /GoogleGenAI|OpenAI|chat\.completions|responses\.create|\/assess/);
  assert.doesNotMatch(builderSource, /sendEmail|sendSMS|sendInfoSheet|createClientLink|\/api\/(?:contracts|payments|square|emails|sms)/);
  assert.doesNotMatch(routeSource.slice(routeSource.indexOf("scheduleEngineBooleanFields"), routeSource.indexOf("// Reusable operator scheduling defaults")), /sendEmail|sendSMS|preflight|provider.*accepted/i);
});
