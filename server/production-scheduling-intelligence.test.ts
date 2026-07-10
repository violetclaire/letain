import assert from "node:assert/strict";
import test from "node:test";
import {
  generateProductionSchedule,
  getScheduleProductionQuestions,
  parseScheduleRequest,
  type ParsedScheduleRequest,
  type ScheduleProductionConfig,
} from "../shared/schedulingIntelligence";

const SAMPLE_REQUEST = `Breakdown:

1. Alejandra Zamora (Bridesmaid) Makeup + Hair
2. Bani Bedi (Bridesmaid) Makeup only
3. Cindy Moreno (Bridesmaid) Makeup + Hair
4. Gehan Atalla (Mother of the Groom) Makeup + Hair
5. Benita Lopez (Grandma of the bride) Makeup + Hair
6. Hanan Basta (Aunt to the Groom) Makeup + Hair
   *Doesn't speak English so will stick with mom the entire time*
7. Bride

8. Yesenia (Maybe depending on timeline)
9. Virginia (Maybe depending on timeline)

The mother in law has requested a touchup before the ceremony. I would also like a quote for touchups on me and the mother in law vs touchups for everyone.`;

function parsedWithBrideServices(): ParsedScheduleRequest {
  const parsed = parseScheduleRequest(SAMPLE_REQUEST);
  const people = parsed.people.map((person) =>
    person.role === "bride" ? { ...person, services: ["hair", "makeup"] as const } : person,
  );
  return {
    ...parsed,
    people,
    confirmedPeople: people.filter((person) => person.status === "confirmed"),
    optionalPeople: people.filter((person) => person.status === "optional"),
  };
}

function completeConfig(): ScheduleProductionConfig {
  return {
    readyTime: "12:30 PM",
    earliestStartTime: "7:30 AM",
    providers: [
      {
        id: "violet",
        name: "Violet",
        capability: "ALL",
        isLead: true,
        serviceDurations: { hair: 30, makeup: 30, hairMakeup: 60, primaryClient: 120, touchup: 15 },
      },
      {
        id: "makeup-artist",
        name: "Makeup Artist",
        capability: "MAKEUP_ONLY",
        serviceDurations: { makeup: 45, touchup: 15 },
      },
      {
        id: "hair-artist",
        name: "Hair Artist",
        capability: "HAIR_ONLY",
        serviceDurations: { hair: 45, touchup: 15 },
      },
    ],
    assignPrimaryToLead: true,
    protectLeadBeforePrimary: true,
    preferMinimumStaff: true,
    fixedBlocksReviewed: true,
    fixedBlocks: [
      {
        id: "fixed-bride",
        personName: "Bride",
        role: "bride",
        service: "hair_makeup",
        providerId: "violet",
        providerName: "Violet",
        startTime: "10:30 AM",
        endTime: "12:30 PM",
      },
    ],
    optionalPeopleMode: "exclude",
    touchupMode: "quote_only",
  };
}

test("messy inbound request is reduced into confirmed, optional, service, role, and constraint state", () => {
  const parsed = parseScheduleRequest(SAMPLE_REQUEST);

  assert.equal(parsed.people.length, 9);
  assert.equal(parsed.confirmedPeople.length, 7);
  assert.deepEqual(parsed.optionalPeople.map((person) => person.name), ["Yesenia", "Virginia"]);
  assert.deepEqual(parsed.people.find((person) => person.name === "Alejandra Zamora")?.services, ["hair", "makeup"]);
  assert.deepEqual(parsed.people.find((person) => person.name === "Bani Bedi")?.services, ["makeup"]);
  assert.equal(parsed.people.find((person) => person.name === "Gehan Atalla")?.role, "mother_of_groom");
  assert.equal(parsed.people.find((person) => person.name === "Benita Lopez")?.role, "grandmother_of_bride");

  const hanan = parsed.people.find((person) => person.name === "Hanan Basta");
  assert.ok(hanan?.constraints.some((constraint) => constraint.type === "language_support"));
  assert.ok(hanan?.constraints.some((constraint) => constraint.type === "stay_near" && constraint.relatedPersonName === "Gehan Atalla"));
});

test("touchup alternatives stay quote-only and do not silently become schedule services", () => {
  const parsed = parseScheduleRequest(SAMPLE_REQUEST);

  assert.deepEqual(parsed.quoteOnlyRequests.map((scenario) => scenario.label), [
    "Touchups for bride + mother-in-law",
    "Touchups for everyone",
  ]);
  assert.ok(parsed.quoteOnlyRequests.every((scenario) => scenario.mode === "quote_only"));
  assert.ok(parsed.quoteOnlyRequests.every((scenario) => scenario.timingRequiredBeforeScheduling));
  assert.equal(parsed.confirmedPeople.some((person) => person.services.includes("touchup")), false);
});

test("bulleted request lines are parsed without treating special-note bullets as people", () => {
  const parsed = parseScheduleRequest(`
- Maya (Bride) Hair + Makeup
- Lena (Bridesmaid) Makeup only
* Doesn't speak English and should stay with Maya
`);

  assert.equal(parsed.people.length, 2);
  assert.deepEqual(parsed.people.map((person) => person.name), ["Maya", "Lena"]);
  assert.ok(parsed.people[1].notes.some((note) => note.includes("Doesn't speak English")));
});

test("production questions ask for missing variables instead of guessing", () => {
  const parsed = parseScheduleRequest(SAMPLE_REQUEST);
  const questions = getScheduleProductionQuestions(parsed, {
    readyTime: "",
    providers: [],
    assignPrimaryToLead: null,
    protectLeadBeforePrimary: true,
    preferMinimumStaff: true,
    fixedBlocksReviewed: false,
    fixedBlocks: [],
    optionalPeopleMode: "undecided",
    touchupMode: "undecided",
  });

  assert.ok(questions.some((question) => question.id === "ready_time"));
  assert.ok(questions.some((question) => question.id === "artist_count"));
  assert.ok(questions.some((question) => question.id === "primary_assignment"));
  assert.ok(questions.some((question) => question.id === "fixed_blocks"));
  assert.ok(questions.some((question) => question.id === "optional_people"));
  assert.ok(questions.some((question) => question.id === "touchups"));
  assert.ok(questions.some((question) => question.id === "service_details"));
});

test("production schedule uses independent artist lanes, per-artist timing, and the fixed primary block", () => {
  const result = generateProductionSchedule(parsedWithBrideServices(), completeConfig());

  assert.equal(result.questions.length, 0, JSON.stringify(result.questions));
  assert.equal(result.lanes.length, 3);
  assert.equal(result.lanes.flatMap((lane) => lane.blocks).some((block) => block.service === "touchup"), false);
  assert.deepEqual(result.excludedOptionalPeople, ["Yesenia", "Virginia"]);

  const bride = result.lanes.flatMap((lane) => lane.blocks).find((block) => block.personName === "Bride");
  assert.ok(bride);
  assert.equal(bride.fixed, true);
  assert.equal(bride.providerName, "Violet");
  assert.equal(bride.startMinutes, 10 * 60 + 30);
  assert.equal(bride.endMinutes, 12 * 60 + 30);

  for (const lane of result.lanes) {
    for (let index = 1; index < lane.blocks.length; index++) {
      assert.ok(lane.blocks[index - 1].endMinutes <= lane.blocks[index].startMinutes, `${lane.providerName} must not overlap`);
    }
  }

  const byPerson = new Map<string, typeof bride[]>();
  for (const block of result.lanes.flatMap((lane) => lane.blocks)) {
    byPerson.set(block.personName, [...(byPerson.get(block.personName) ?? []), block]);
  }
  for (const [personName, personBlocks] of byPerson) {
    const ordered = personBlocks.filter(Boolean).sort((a, b) => (a?.startMinutes ?? 0) - (b?.startMinutes ?? 0));
    for (let index = 1; index < ordered.length; index++) {
      assert.ok((ordered[index - 1]?.endMinutes ?? 0) <= (ordered[index]?.startMinutes ?? 0), `${personName} must not be double-booked`);
    }
  }

  assert.equal(result.lanes.find((lane) => lane.providerName === "Violet")?.blocks.filter((block) => block.personName !== "Bride").length, 0);
  assert.equal(result.lanes.flatMap((lane) => lane.blocks).some((block) => block.serviceLabel.toLowerCase().includes("buffer")), false);

  for (const service of ["Hair", "Makeup"]) {
    const hanan = result.lanes.flatMap((lane) => lane.blocks).find((block) => block.personName === "Hanan Basta" && block.serviceLabel === service);
    const gehan = result.lanes.flatMap((lane) => lane.blocks).find((block) => block.personName === "Gehan Atalla" && block.serviceLabel === service);
    assert.ok(hanan && gehan);
    assert.equal(hanan.providerId, gehan.providerId);
    assert.equal(Math.max(0, hanan.startMinutes - gehan.endMinutes, gehan.startMinutes - hanan.endMinutes), 0);
  }
});

test("overlapping fixed blocks are not emitted as a double-booked production schedule", () => {
  const parsed = parsedWithBrideServices();
  const config = completeConfig();
  config.fixedBlocks.push({
    id: "fixed-overlap",
    personName: "Alejandra Zamora",
    service: "hair",
    providerId: "violet",
    providerName: "Violet",
    startTime: "11:00 AM",
    endTime: "11:30 AM",
  });

  const result = generateProductionSchedule(parsed, config);
  assert.equal(result.lanes.flatMap((lane) => lane.blocks).some((block) => block.id === "fixed-overlap"), false);
  assert.ok(result.warnings.some((warning) => warning.code === "fixed_block" && warning.message.includes("overlaps")));
});

test("the scheduler never invents staff when configured capacity is insufficient", () => {
  const config = completeConfig();
  config.providers = [config.providers[0]];
  const result = generateProductionSchedule(parsedWithBrideServices(), config);

  assert.equal(result.lanes.length, 1);
  assert.ok(result.questions.some((question) => question.id === "provider_timing") || result.warnings.length > 0);
});
