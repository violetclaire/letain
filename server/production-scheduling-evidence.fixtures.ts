import type { ScheduleEvidenceInput } from "../shared/schedulingEvidence";

export const juliaReadinessCorrectionFixture: ScheduleEvidenceInput = {
  id: "fixture-julia-ilana-readiness-correction",
  sourceKind: "thread",
  eventName: "Julia wedding",
  candidateScheduleScope: "provided_only",
  messages: [
    {
      id: "julia-roster",
      sequence: 1,
      dayContext: "wedding_day",
      text: `
- Julia (Bride) Hair + Makeup
- Elizabeth (Julia's mom / Mother of Bride) Hair + Makeup
- Sheila (Mother in law) Hair + Makeup
- Rashmi (Sister in law) Hair + Makeup
- Kiran (Flower girl) Hair only
`,
    },
    {
      id: "julia-client-timeline",
      sequence: 2,
      dayContext: "wedding_day",
      text: `Getting-ready photos are around 12:30 PM. Bride portraits are at 1:30 PM. Family photos are at 2:45 PM.`,
    },
    {
      id: "julia-planner-final",
      sequence: 3,
      dayContext: "wedding_day",
      text: `
Elizabeth / Julia's mom must have hair and makeup completed by 12:30 PM for getting-ready photos.
The rest of the family should ideally be done by 2:15 PM and no later than 2:30 PM.
`,
    },
  ],
  candidateBlocks: [
    { id: "julia-sheila-hair", personName: "Sheila", service: "hair", startTime: "11:00 AM", endTime: "11:45 AM", artistName: "Lisa", dayContext: "wedding_day", order: 1 },
    { id: "julia-elizabeth-hair", personName: "Elizabeth", service: "hair", startTime: "11:45 AM", endTime: "12:30 PM", artistName: "Lisa", dayContext: "wedding_day", order: 2 },
    { id: "julia-elizabeth-makeup", personName: "Elizabeth", service: "makeup", startTime: "12:30 PM", endTime: "1:00 PM", artistName: "Violet", dayContext: "wedding_day", order: 3 },
    { id: "julia-sheila-makeup", personName: "Sheila", service: "makeup", startTime: "1:00 PM", endTime: "1:30 PM", artistName: "Violet", dayContext: "wedding_day", order: 4 },
    { id: "julia-rashmi-hair", personName: "Rashmi", service: "hair", startTime: "12:30 PM", endTime: "1:15 PM", artistName: "Lisa", dayContext: "wedding_day", order: 5 },
    { id: "julia-rashmi-makeup", personName: "Rashmi", service: "makeup", startTime: "1:30 PM", endTime: "2:00 PM", artistName: "Violet", dayContext: "wedding_day", order: 6 },
    { id: "julia-kiran-hair", personName: "Kiran", service: "hair", startTime: "1:15 PM", endTime: "1:30 PM", artistName: "Lisa", dayContext: "wedding_day", order: 7 },
  ],
};

export const kellyLargePartyCorrectionFixture: ScheduleEvidenceInput = {
  id: "fixture-kelly-mateo-large-party",
  sourceKind: "thread",
  eventName: "Kelly + Mateo",
  candidateScheduleScope: "all_active",
  messages: [
    {
      id: "kelly-original-roster",
      sequence: 1,
      dayContext: "wedding_day",
      text: `
- Kelly (Bride) Hair + Makeup
- Phoebe Hair only
- Jessica Hair + Makeup
- Ann Hair + Makeup
- Erika Hair + Makeup
- Isabel Hair only
- Hannah Hair only
- Cassidy Hair + Makeup
- Alex Hair only
- Meghan Hair only
- Haley Makeup only
- Beth (Mother of Groom) Hair + Makeup
- Caroline (Mother of Bride) Hair + Makeup
- Lisa (Mom's friend) Hair only
- Ellen (Mom's friend) Hair only
`,
    },
    {
      id: "kelly-room-correction",
      sequence: 2,
      dayContext: "wedding_day",
      text: `Correction: actually just Lisa. Remove Ellen. Add Lisa for hair only. Lisa should be at the end in her separate hotel room and pays directly in the room.`,
    },
    {
      id: "kelly-ready-correction",
      sequence: 3,
      dayContext: "wedding_day",
      text: `Kelly needs to be ready by 12:30 PM. The rest of the main group should ideally be done by 1:30 PM and no later than 2:00 PM. Team arrival is 15-20 minutes before setup.`,
    },
    {
      id: "kelly-phoebe-correction",
      sequence: 4,
      dayContext: "wedding_day",
      text: `Restore Phoebe for hair only. Phoebe is missing from the hair schedule. Phoebe is on East Coast time, so earlier placement is preferred.`,
    },
  ],
  candidateBlocks: [
    { id: "kelly-block", personName: "Kelly", service: "hair_makeup", startTime: "10:45 AM", endTime: "12:45 PM", dayContext: "wedding_day", order: 1 },
    { id: "jessica-block", personName: "Jessica", service: "hair_makeup", startTime: "9:00 AM", endTime: "10:30 AM", dayContext: "wedding_day", order: 2 },
    { id: "ann-block", personName: "Ann", service: "hair_makeup", startTime: "9:00 AM", endTime: "10:30 AM", dayContext: "wedding_day", order: 3 },
    { id: "erika-block", personName: "Erika", service: "hair_makeup", startTime: "9:30 AM", endTime: "11:00 AM", dayContext: "wedding_day", order: 4 },
    { id: "isabel-block", personName: "Isabel", service: "hair", startTime: "10:30 AM", endTime: "11:15 AM", dayContext: "wedding_day", order: 5 },
    { id: "hannah-block", personName: "Hannah", service: "hair", startTime: "11:00 AM", endTime: "11:45 AM", dayContext: "wedding_day", order: 6 },
    { id: "cassidy-block", personName: "Cassidy", service: "hair_makeup", startTime: "10:30 AM", endTime: "12:00 PM", dayContext: "wedding_day", order: 7 },
    { id: "alex-block", personName: "Alex", service: "hair", startTime: "11:15 AM", endTime: "12:00 PM", dayContext: "wedding_day", order: 8 },
    { id: "meghan-block", personName: "Meghan", service: "hair", startTime: "11:45 AM", endTime: "12:30 PM", dayContext: "wedding_day", order: 9 },
    { id: "haley-block", personName: "Haley", service: "makeup", startTime: "12:00 PM", endTime: "12:45 PM", dayContext: "wedding_day", order: 10 },
    { id: "beth-block", personName: "Beth", service: "hair_makeup", startTime: "12:00 PM", endTime: "1:30 PM", dayContext: "wedding_day", order: 11 },
    { id: "caroline-block", personName: "Caroline", service: "hair_makeup", startTime: "12:15 PM", endTime: "1:45 PM", dayContext: "wedding_day", order: 12 },
    { id: "lisa-block", personName: "Lisa", service: "hair", startTime: "11:00 AM", endTime: "11:45 AM", dayContext: "wedding_day", locationContext: "main", order: 13 },
    { id: "ellen-block", personName: "Ellen", service: "hair", startTime: "1:00 PM", endTime: "1:45 PM", dayContext: "wedding_day", order: 14 },
  ],
};

export const rachelSpreadsheetFixture: ScheduleEvidenceInput = {
  id: "fixture-rachel-tagle-spreadsheet",
  sourceKind: "spreadsheet",
  eventName: "Rachel + Nick's Wedding",
  highlightedRowsAreActive: true,
  readyTime: "1:00 PM",
  spreadsheetRows: [
    { id: "rachel-trial", kind: "service", highlighted: false, section: "original", personName: "Rachel Tagle", role: "Bride", services: ["hair", "makeup"], dayContext: "trial", pricingMetadata: { amount: 500 } },
    { id: "rachel-friday", kind: "service", highlighted: false, section: "original", personName: "Rachel Tagle", role: "Bride", services: ["hair", "makeup"], dayContext: "friday", pricingMetadata: { amount: 600 } },
    { id: "rachel-saturday", kind: "service", highlighted: true, section: "original", personName: "Rachel Tagle", role: "Bride", services: ["hair", "makeup"], dayContext: "saturday", pricingMetadata: { amount: 900 } },
    { id: "kim-saturday", kind: "service", highlighted: true, section: "original", personName: "Kim Tagle", role: "Mother of Bride", services: ["hair", "makeup"], dayContext: "saturday", pricingMetadata: { amount: 350 } },
    { id: "elizabeth-mandor-saturday", kind: "service", highlighted: true, section: "original", personName: "Elizabeth Mandor", role: "Mother-in-Law", services: ["hair", "makeup"], dayContext: "saturday", pricingMetadata: { amount: 350 } },
    { id: "lizzy-saturday", kind: "service", highlighted: true, section: "original", personName: "Lizzy Pancratz", role: "Maid of Honor", services: ["hair", "makeup"], dayContext: "saturday", pricingMetadata: { amount: 350 } },
    { id: "clara-saturday", kind: "service", highlighted: true, section: "original", personName: "Clara Lane", role: "Bridesmaid", services: ["hair", "makeup"], dayContext: "saturday", pricingMetadata: { amount: 350 } },
    { id: "dana-saturday", kind: "service", highlighted: true, section: "original", personName: "Dana Outcalt", role: "Bridesmaid", services: ["hair", "makeup"], dayContext: "saturday", pricingMetadata: { amount: 350 } },
    { id: "elizabeth-bradley-saturday", kind: "service", highlighted: true, section: "original", personName: "Elizabeth Bradley", role: "Bridesmaid", services: ["hair", "makeup"], dayContext: "saturday", pricingMetadata: { amount: 350 } },
    { id: "margaret-saturday", kind: "service", highlighted: true, section: "original", personName: "Margaret Fuller", role: "Bridesmaid", services: ["hair", "makeup"], dayContext: "saturday", pricingMetadata: { amount: 350 } },
    { id: "hotel-row", kind: "hotel", highlighted: true, pricingMetadata: { amount: 900 }, note: "Hotel" },
    { id: "subtotal-row", kind: "subtotal", highlighted: true, pricingMetadata: { amount: 4250 } },
    { id: "dana-hair-added", kind: "service", highlighted: false, section: "additions", personName: "Dana Outcalt", role: "Bridesmaid", services: ["hair"], dayContext: "saturday", pricingMetadata: { amount: 175 }, note: "Hair added" },
    { id: "auntie-elaine-added", kind: "service", highlighted: false, section: "additions", personName: "Auntie Elaine", services: ["makeup"], dayContext: "saturday", pricingMetadata: { amount: 175 } },
    { id: "linda-added", kind: "service", highlighted: false, section: "additions", personName: "Linda Pancratz", role: "Officiant", services: ["hair", "makeup"], dayContext: "saturday", pricingMetadata: { amount: 350 } },
  ],
};

export const hannahCountOnlyFixture: ScheduleEvidenceInput = {
  id: "fixture-hannah-kyle-count-only",
  sourceKind: "count_only",
  eventName: "Hannah + Kyle",
  selectedDay: "wedding_day",
  messages: [
    {
      id: "hannah-planner-request",
      sequence: 1,
      dayContext: "wedding_day",
      text: `
Wedding venue: Villa.
Getting-ready location: The Toll House in Los Gatos.
Ready-by time: 1:00 PM.
Bride + 8 need services, 9 services total.
3 artists confirmed.
Reference schedule: https://example.invalid/redacted-google-doc
`,
    },
  ],
};

const emilySaturdayOrder = `
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
`;

export const emilyMultiDayFixture: ScheduleEvidenceInput = {
  id: "fixture-emily-chris-multi-day",
  sourceKind: "thread",
  eventName: "Emily + Chris",
  messages: [
    {
      id: "emily-friday-initial",
      sequence: 1,
      dayContext: "friday_welcome_party",
      text: `All 4 people need hair and makeup and must be done by 3:15 PM. Suggested start is 11:30 AM.`,
    },
    {
      id: "emily-friday-correction",
      sequence: 2,
      dayContext: "friday_welcome_party",
      text: `Push Friday start back 30 minutes from 11:30 AM. Emily needs to be ready by 3:00 PM only; confirm whether everyone shares that ready time. Add her sister for Friday hair and makeup.`,
    },
    {
      id: "emily-friday-touchups",
      sequence: 3,
      dayContext: "friday_welcome_party",
      text: `Weather-dependent touchups after rehearsal around 5:00 PM are quote-only unless confirmed. Touchup pricing is $200 per hour. Suite 32A is the Friday service location.`,
    },
    {
      id: "emily-saturday-order",
      sequence: 4,
      dayContext: "saturday_wedding_day",
      text: emilySaturdayOrder,
    },
    {
      id: "emily-saturday-order-quoted-repeat",
      sequence: 5,
      dayContext: "saturday_wedding_day",
      text: emilySaturdayOrder,
    },
    {
      id: "emily-saturday-timing",
      sequence: 6,
      dayContext: "saturday_wedding_day",
      text: `Emily needs to be ready by 12:30 PM. 3 artists arrive at 8:00 AM. Kira should go after the bride and start at 1:30 PM.`,
    },
    {
      id: "emily-grandma-addition",
      sequence: 7,
      dayContext: "saturday_wedding_day",
      text: `Add Grandma for hair and makeup. Grandma is elderly and will receive services in her separate room at Stanly Ranch.`,
    },
    {
      id: "emily-blowout-question",
      sequence: 8,
      dayContext: "saturday_wedding_day",
      text: `The bride asks about a blowout. Confirm whether the blowout is inside Emily's hair and makeup timing or a separate prep block.`,
    },
  ],
};

export const productionScheduleEvidenceFixtures = [
  juliaReadinessCorrectionFixture,
  kellyLargePartyCorrectionFixture,
  rachelSpreadsheetFixture,
  hannahCountOnlyFixture,
  emilyMultiDayFixture,
] as const;
