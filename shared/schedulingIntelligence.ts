export type ScheduleServiceKind = "hair" | "makeup" | "hair_makeup" | "touchup" | "other";

export type ScheduleParticipantStatus = "confirmed" | "optional";

export type ScheduleConstraint =
  | {
      type: "language_support";
      detail: string;
    }
  | {
      type: "stay_near";
      detail: string;
      relatedPersonName?: string;
      relatedRole?: string;
    };

export type ParsedSchedulePerson = {
  id: string;
  name: string;
  role: string;
  roleLabel: string;
  relationship?: string;
  status: ScheduleParticipantStatus;
  services: ScheduleServiceKind[];
  notes: string[];
  constraints: ScheduleConstraint[];
};

export type ScheduleQuoteScenario = {
  id: string;
  label: string;
  service: "touchup";
  participants: string[];
  mode: "quote_only";
  timingRequiredBeforeScheduling: true;
  notes: string[];
};

export type ParsedScheduleRequest = {
  sourceKind: "pasted_request";
  people: ParsedSchedulePerson[];
  confirmedPeople: ParsedSchedulePerson[];
  optionalPeople: ParsedSchedulePerson[];
  quoteOnlyRequests: ScheduleQuoteScenario[];
  touchupNotes: string[];
  uncertainties: string[];
};

export type ProviderCapability = "ALL" | "HAIR_ONLY" | "MAKEUP_ONLY";

export type ProviderServiceDurations = {
  hair?: number;
  makeup?: number;
  hairMakeup?: number;
  primaryClient?: number;
  touchup?: number;
};

export type SchedulingProvider = {
  id: string;
  name: string;
  capability?: ProviderCapability | "";
  isLead?: boolean;
  serviceDurations?: ProviderServiceDurations;
};

export type ScheduleOperatorDefaults = {
  providers: SchedulingProvider[];
  protectLeadBeforePrimary: boolean;
  assignPrimaryToLead: boolean;
  preferredLayout: "artist_columns";
  allowUnrequestedBuffers: false;
};

export type FixedScheduleBlock = {
  id: string;
  personName: string;
  role?: string;
  service: ScheduleServiceKind;
  providerId: string;
  providerName: string;
  startTime: string;
  endTime: string;
  notes?: string;
};

export type OptionalPeopleMode = "undecided" | "exclude" | "include";
export type TouchupMode = "undecided" | "quote_only" | "schedule_fixed_only";

export type ScheduleProductionConfig = {
  readyTime: string;
  earliestStartTime?: string;
  providers: SchedulingProvider[];
  assignPrimaryToLead: boolean | null;
  protectLeadBeforePrimary: boolean;
  fixedBlocksReviewed: boolean;
  fixedBlocks: FixedScheduleBlock[];
  optionalPeopleMode: OptionalPeopleMode;
  touchupMode: TouchupMode;
};

export type ScheduleProductionQuestion = {
  id:
    | "ready_time"
    | "artist_count"
    | "lead_artist"
    | "primary_assignment"
    | "provider_timing"
    | "fixed_blocks"
    | "optional_people"
    | "touchups"
    | "service_details";
  prompt: string;
  blocking: boolean;
};

export type ProductionScheduleBlock = {
  id: string;
  personId: string;
  personName: string;
  roleLabel: string;
  service: ScheduleServiceKind;
  serviceLabel: string;
  providerId: string;
  providerName: string;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  fixed: boolean;
  optional: boolean;
  notes: string[];
};

export type ProductionScheduleLane = {
  providerId: string;
  providerName: string;
  capability?: ProviderCapability | "";
  isLead: boolean;
  blocks: ProductionScheduleBlock[];
  totalServiceMinutes: number;
};

export type ProductionScheduleWarning = {
  code:
    | "missing_production_input"
    | "provider_capability"
    | "provider_timing"
    | "fixed_block"
    | "starts_before_access"
    | "special_constraint"
    | "touchup_timing"
    | "missing_required_service"
    | "missing_confirmed_person"
    | "ready_time_violation"
    | "schedule_overlap";
  message: string;
  blocking: boolean;
};

export type ProductionScheduleResult = {
  lanes: ProductionScheduleLane[];
  questions: ScheduleProductionQuestion[];
  warnings: ProductionScheduleWarning[];
  serviceCounts: Record<string, number>;
  assignmentSummary: Array<{
    providerId: string;
    providerName: string;
    serviceCount: number;
    totalServiceMinutes: number;
  }>;
  optionalScenarios: ScheduleQuoteScenario[];
  includedPeople: string[];
  excludedOptionalPeople: string[];
  readyTimeMinutes: number | null;
  earliestScheduledMinute: number | null;
};

type RoleDefinition = {
  role: string;
  label: string;
  pattern: RegExp;
};

const ROLE_DEFINITIONS: RoleDefinition[] = [
  { role: "mother_of_groom", label: "Mother of the Groom", pattern: /\b(mother[- ]in[- ]law|mother of (the )?groom|mog)\b/i },
  { role: "mother_of_bride", label: "Mother of the Bride", pattern: /\b(mother of (the )?bride|mob)\b/i },
  { role: "grandmother_of_bride", label: "Grandmother of the Bride", pattern: /\b(grandma|grandmother) of (the )?bride\b/i },
  { role: "grandmother_of_groom", label: "Grandmother of the Groom", pattern: /\b(grandma|grandmother) of (the )?groom\b/i },
  { role: "maid_of_honor", label: "Maid of Honor", pattern: /\b(maid of honor|moh)\b/i },
  { role: "bridesmaid", label: "Bridesmaid", pattern: /\bbridesmaid\b/i },
  { role: "aunt_of_groom", label: "Aunt of the Groom", pattern: /\baunt (to|of) (the )?groom\b/i },
  { role: "aunt_of_bride", label: "Aunt of the Bride", pattern: /\baunt (to|of) (the )?bride\b/i },
  { role: "flower_girl", label: "Flower Girl", pattern: /\bflower girl\b/i },
  { role: "client_primary", label: "Primary client", pattern: /\b(primary client|client primary)\b/i },
  { role: "bride", label: "Bride", pattern: /\bbride\b/i },
];

const OPTIONAL_PATTERN = /\b(maybe|optional|tentative|depending on (the )?timeline|if (the )?timeline allows)\b/i;
const SERVICE_PATTERN = /\b(hair\s*(?:\+|and|&|\/)?\s*make\s*up|make\s*up\s*(?:\+|and|&|\/)?\s*hair|hair|make\s*up|makeup|hmu|touch\s*-?\s*ups?)\b/i;

function normalizeText(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\r\n?/g, "\n")
    .trim();
}

function stableId(value: string, index: number): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${normalized || "person"}-${index + 1}`;
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function roleFromText(value: string): { role: string; label: string; relationship?: string } {
  const match = ROLE_DEFINITIONS.find((definition) => definition.pattern.test(value));
  if (!match) return { role: "unspecified", label: "Role to confirm" };
  const relationship = value.match(/\(([^)]+)\)/)?.[1]?.trim();
  return { role: match.role, label: match.label, ...(relationship ? { relationship } : {}) };
}

function servicesFromText(value: string): ScheduleServiceKind[] {
  const text = value.toLowerCase().replace(/make\s+up/g, "makeup");
  if (/touch\s*-?\s*up/.test(text)) return ["touchup"];
  const hasHair = /\bhair\b|\bhmu\b/.test(text);
  const hasMakeup = /\bmakeup\b|\bhmu\b/.test(text);
  if (hasHair && hasMakeup) return ["hair", "makeup"];
  if (hasHair) return ["hair"];
  if (hasMakeup) return ["makeup"];
  return [];
}

function cleanPersonName(value: string): string {
  const withoutParentheticals = value.replace(/\([^)]*\)/g, " ");
  const serviceIndex = withoutParentheticals.search(SERVICE_PATTERN);
  const name = (serviceIndex >= 0 ? withoutParentheticals.slice(0, serviceIndex) : withoutParentheticals)
    .replace(/^[-*\s]+|[-:,*\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return name;
}

function parentheticalNotes(value: string): string[] {
  const notes: string[] = [];
  for (const match of Array.from(value.matchAll(/\(([^)]+)\)/g))) {
    const note = match[1].trim();
    if (!note || OPTIONAL_PATTERN.test(note) || ROLE_DEFINITIONS.some((definition) => definition.pattern.test(note))) continue;
    notes.push(note);
  }
  return notes;
}

function findMotherFor(person: ParsedSchedulePerson, people: ParsedSchedulePerson[]): ParsedSchedulePerson | undefined {
  if (/groom/.test(person.role)) {
    return people.find((candidate) => candidate.role === "mother_of_groom");
  }
  if (/bride/.test(person.role)) {
    return people.find((candidate) => candidate.role === "mother_of_bride");
  }
  return people.find((candidate) => candidate.role === "mother_of_groom") ??
    people.find((candidate) => candidate.role === "mother_of_bride");
}

function addConstraintsFromNotes(person: ParsedSchedulePerson, people: ParsedSchedulePerson[]): ParsedSchedulePerson {
  const noteText = person.notes.join(" ");
  const constraints = [...person.constraints];
  if (/does(?:n't| not) speak english|non[- ]english|language support/i.test(noteText)) {
    constraints.push({ type: "language_support", detail: noteText });
  }
  if (/stay|stick|remain|keep/.test(noteText.toLowerCase()) && /near|with|close/.test(noteText.toLowerCase())) {
    const namedTarget = people.find((candidate) => candidate.id !== person.id && new RegExp(`\\b${candidate.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(noteText));
    const motherTarget = /\bmom\b|\bmother\b/i.test(noteText) ? findMotherFor(person, people) : undefined;
    const target = namedTarget ?? motherTarget;
    constraints.push({
      type: "stay_near",
      detail: noteText,
      ...(target ? { relatedPersonName: target.name, relatedRole: target.role } : {}),
    });
  }
  return { ...person, constraints };
}

function touchupScenarios(source: string, people: ParsedSchedulePerson[]): {
  scenarios: ScheduleQuoteScenario[];
  notes: string[];
} {
  const normalized = source.replace(/\s+/g, " ");
  if (!/touch\s*-?\s*up/i.test(normalized)) return { scenarios: [], notes: [] };

  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => /touch\s*-?\s*up/i.test(sentence));
  const notes = unique(sentences);
  const scenarios: ScheduleQuoteScenario[] = [];
  const bride = people.find((person) => person.role === "bride");
  const motherInLaw = people.find((person) => person.role === "mother_of_groom");
  const asksForQuote = /quote[^.?!]*touch\s*-?\s*up|quote for touch\s*-?\s*up/i.test(normalized);

  if (asksForQuote && /\b(me|bride)\b[^.?!]*(mother[- ]in[- ]law|mil)|mother[- ]in[- ]law[^.?!]*\b(me|bride)\b/i.test(normalized)) {
    scenarios.push({
      id: "touchups-primary-and-mil",
      label: "Touchups for bride + mother-in-law",
      service: "touchup",
      participants: unique([bride?.name, motherInLaw?.name].filter((name): name is string => Boolean(name))),
      mode: "quote_only",
      timingRequiredBeforeScheduling: true,
      notes,
    });
  }

  if (asksForQuote && /touch\s*-?\s*ups? for everyone|everyone[^.?!]*touch\s*-?\s*up/i.test(normalized)) {
    scenarios.push({
      id: "touchups-everyone",
      label: "Touchups for everyone",
      service: "touchup",
      participants: people.filter((person) => person.status === "confirmed").map((person) => person.name),
      mode: "quote_only",
      timingRequiredBeforeScheduling: true,
      notes,
    });
  }

  if (scenarios.length === 0) {
    const requestedParticipants = unique([
      ...(bride && /\b(me|bride)\b/i.test(normalized) ? [bride.name] : []),
      ...(motherInLaw && /(mother[- ]in[- ]law|mil)/i.test(normalized) ? [motherInLaw.name] : []),
    ]);
    scenarios.push({
      id: "touchups-to-confirm",
      label: "Touchup request to confirm",
      service: "touchup",
      participants: requestedParticipants,
      mode: "quote_only",
      timingRequiredBeforeScheduling: true,
      notes,
    });
  }

  return { scenarios, notes };
}

export function parseScheduleRequest(rawSource: string): ParsedScheduleRequest {
  const source = normalizeText(rawSource);
  const people: ParsedSchedulePerson[] = [];
  const lines = source.split("\n").map((line) => line.trim()).filter(Boolean);
  let lastPersonIndex = -1;

  for (const line of lines) {
    const numbered = line.match(/^\s*(\d+)\s*[.)-]\s*(.+)$/);
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    const bulletBody = bullet?.[1]?.trim() ?? "";
    const isPersonBullet = Boolean(
      bulletBody &&
      (SERVICE_PATTERN.test(bulletBody) || OPTIONAL_PATTERN.test(bulletBody) || ROLE_DEFINITIONS.some((definition) => definition.pattern.test(bulletBody))),
    );
    if (numbered || isPersonBullet) {
      const body = (numbered?.[2] ?? bulletBody).trim();
      const name = cleanPersonName(body);
      if (!name) continue;
      const role = roleFromText(body);
      people.push({
        id: stableId(name, people.length),
        name,
        role: role.role,
        roleLabel: role.label,
        ...(role.relationship ? { relationship: role.relationship } : {}),
        status: OPTIONAL_PATTERN.test(body) ? "optional" : "confirmed",
        services: servicesFromText(body),
        notes: parentheticalNotes(body),
        constraints: [],
      });
      lastPersonIndex = people.length - 1;
      continue;
    }

    const continuation = line.replace(/^[-*]+\s*/, "").replace(/^\*|\*$/g, "").trim();
    if (
      lastPersonIndex >= 0 &&
      continuation &&
      !/^breakdown:?$/i.test(continuation) &&
      !/touch\s*-?\s*up|\bquote\b/i.test(continuation)
    ) {
      people[lastPersonIndex].notes.push(continuation);
    }
  }

  const constrainedPeople = people.map((person) => addConstraintsFromNotes(person, people));
  const touchups = touchupScenarios(source, constrainedPeople);
  const uncertainties: string[] = [];
  for (const person of constrainedPeople) {
    if (person.services.length === 0) {
      uncertainties.push(`${person.name}: service details still need confirmation.`);
    }
    if (person.role === "unspecified") {
      uncertainties.push(`${person.name}: role or relationship still needs confirmation.`);
    }
    for (const constraint of person.constraints) {
      if (constraint.type === "stay_near" && !constraint.relatedPersonName) {
        uncertainties.push(`${person.name}: proximity companion still needs confirmation.`);
      }
    }
  }
  if (touchups.scenarios.length > 0) {
    uncertainties.push("Touchup timing and duration are not scheduled until the operator supplies a fixed block.");
  }

  return {
    sourceKind: "pasted_request",
    people: constrainedPeople,
    confirmedPeople: constrainedPeople.filter((person) => person.status === "confirmed"),
    optionalPeople: constrainedPeople.filter((person) => person.status === "optional"),
    quoteOnlyRequests: touchups.scenarios,
    touchupNotes: touchups.notes,
    uncertainties: unique(uncertainties),
  };
}

export function parseScheduleClock(raw: string): number | null {
  const value = raw.trim().toLowerCase();
  const match = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || minutes > 59) return null;
  if (match[3]) {
    if (hours < 1 || hours > 12) return null;
    if (match[3] === "pm" && hours !== 12) hours += 12;
    if (match[3] === "am" && hours === 12) hours = 0;
  } else if (hours > 23) {
    return null;
  }
  return hours * 60 + minutes;
}

export function formatScheduleClock(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function positive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function providerCanPerform(provider: SchedulingProvider, service: ScheduleServiceKind): boolean {
  if (service === "touchup" || service === "other") return true;
  if (!provider.capability || provider.capability === "ALL") return true;
  if (service === "hair") return provider.capability === "HAIR_ONLY";
  if (service === "makeup") return provider.capability === "MAKEUP_ONLY";
  return false;
}

function durationForProvider(
  provider: SchedulingProvider,
  service: ScheduleServiceKind,
  primary: boolean,
): number | null {
  const durations = provider.serviceDurations ?? {};
  if (primary && service === "hair_makeup" && positive(durations.primaryClient)) return durations.primaryClient;
  if (service === "hair" && positive(durations.hair)) return durations.hair;
  if (service === "makeup" && positive(durations.makeup)) return durations.makeup;
  if (service === "hair_makeup" && positive(durations.hairMakeup)) return durations.hairMakeup;
  if (service === "touchup" && positive(durations.touchup)) return durations.touchup;
  return null;
}

function requiredServices(parsed: ParsedScheduleRequest, config: ScheduleProductionConfig): ScheduleServiceKind[] {
  const people = [
    ...parsed.confirmedPeople,
    ...(config.optionalPeopleMode === "include" ? parsed.optionalPeople : []),
  ];
  const services = people.flatMap((person) => person.services);
  const hasPrimaryBoth = people.some(
    (person) =>
      (person.role === "bride" || person.role === "client_primary") &&
      person.services.includes("hair") &&
      person.services.includes("makeup"),
  );
  return unique([
    ...services,
    ...(hasPrimaryBoth && config.assignPrimaryToLead ? (["hair_makeup"] as ScheduleServiceKind[]) : []),
  ]);
}

export function getScheduleProductionQuestions(
  parsed: ParsedScheduleRequest,
  config: ScheduleProductionConfig,
): ScheduleProductionQuestion[] {
  const questions: ScheduleProductionQuestion[] = [];
  if (parseScheduleClock(config.readyTime) === null) {
    questions.push({ id: "ready_time", prompt: "What is the ready time?", blocking: true });
  }
  if (config.providers.length === 0) {
    questions.push({ id: "artist_count", prompt: "How many artists are needed for this event?", blocking: true });
  }
  if (config.providers.length > 0 && !config.providers.some((provider) => provider.isLead)) {
    questions.push({ id: "lead_artist", prompt: "Who is the lead artist?", blocking: true });
  }
  if (config.assignPrimaryToLead === null) {
    questions.push({ id: "primary_assignment", prompt: "Is the bride or primary client assigned to the lead artist?", blocking: true });
  }
  if (!config.fixedBlocksReviewed) {
    questions.push({ id: "fixed_blocks", prompt: "Are any service blocks fixed at a specific artist and time?", blocking: true });
  }
  if (parsed.optionalPeople.length > 0 && config.optionalPeopleMode === "undecided") {
    questions.push({ id: "optional_people", prompt: "Should optional people stay as quote add-ons or be included in this schedule?", blocking: true });
  }
  if (parsed.quoteOnlyRequests.length > 0 && config.touchupMode === "undecided") {
    questions.push({ id: "touchups", prompt: "Should touchups remain quote-only, or is there a fixed time and duration to schedule?", blocking: true });
  }
  const peopleInScope = [
    ...parsed.confirmedPeople,
    ...(config.optionalPeopleMode === "include" ? parsed.optionalPeople : []),
  ];
  const missingServices = peopleInScope.filter(
    (person) =>
      person.services.length === 0 &&
      !config.fixedBlocks.some(
        (block) => personKey(block.personName) === personKey(person.name) && block.service !== "other",
      ),
  );
  if (missingServices.length > 0) {
    questions.push({
      id: "service_details",
      prompt: `Confirm service details for ${missingServices.map((person) => person.name).join(", ")}.`,
      blocking: true,
    });
  }

  const services = requiredServices(parsed, config);
  for (const provider of config.providers) {
    const relevant = services.filter((service) => providerCanPerform(provider, service));
    const missing = relevant.filter((service) => {
      const primary = service === "hair_makeup" && provider.isLead === true;
      return durationForProvider(provider, service, primary) === null;
    });
    if (missing.length > 0) {
      questions.push({
        id: "provider_timing",
        prompt: `Confirm ${provider.name || "this artist"}'s baseline timing for ${missing.map(serviceLabel).join(", ")}.`,
        blocking: true,
      });
    }
  }

  return questions;
}

export function serviceLabel(service: ScheduleServiceKind): string {
  if (service === "hair") return "Hair";
  if (service === "makeup") return "Makeup";
  if (service === "hair_makeup") return "Hair + Makeup";
  if (service === "touchup") return "Touchup";
  return "Service";
}

type WorkingTask = {
  id: string;
  person: ParsedSchedulePerson;
  service: ScheduleServiceKind;
  provider?: SchedulingProvider;
  duration?: number;
  priority: number;
  proximityKey?: string;
};

type ReservedInterval = { start: number; end: number };

function isPrimaryPerson(person: ParsedSchedulePerson): boolean {
  return person.role === "bride" || person.role === "client_primary";
}

function taskPriority(person: ParsedSchedulePerson, service: ScheduleServiceKind): number {
  let priority = isPrimaryPerson(person) ? 90 : /mother|grandmother/.test(person.role) ? 70 : person.status === "optional" ? 20 : 50;
  if (service === "touchup") priority = 100;
  if (service === "makeup") priority += 1;
  return priority;
}

function personKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Content-derived working-task key: stable across regenerations for the same
// person + service. The placed block id appends startMinutes at placement time.
function workingTaskKey(personId: string, service: ScheduleServiceKind): string {
  return `task-${personId}-${service}`;
}

function serviceCovers(fixed: ScheduleServiceKind, task: ScheduleServiceKind): boolean {
  return fixed === task || (fixed === "hair_makeup" && (task === "hair" || task === "makeup"));
}

function latestAvailableEnd(end: number, duration: number, intervals: ReservedInterval[]): number {
  let candidateEnd = end;
  for (let attempt = 0; attempt < intervals.length + 2; attempt++) {
    const candidateStart = candidateEnd - duration;
    const conflict = intervals
      .filter((interval) => candidateStart < interval.end && interval.start < candidateEnd)
      .sort((a, b) => b.start - a.start)[0];
    if (!conflict) return candidateEnd;
    candidateEnd = conflict.start;
  }
  return candidateEnd;
}

function addCount(counts: Record<string, number>, label: string) {
  counts[label] = (counts[label] ?? 0) + 1;
}

export function generateProductionSchedule(
  parsed: ParsedScheduleRequest,
  config: ScheduleProductionConfig,
): ProductionScheduleResult {
  const questions = getScheduleProductionQuestions(parsed, config);
  const warnings: ProductionScheduleWarning[] = [];
  const readyTimeMinutes = parseScheduleClock(config.readyTime);
  const emptyResult = (): ProductionScheduleResult => ({
    lanes: config.providers.map((provider) => ({
      providerId: provider.id,
      providerName: provider.name,
      capability: provider.capability,
      isLead: Boolean(provider.isLead),
      blocks: [],
      totalServiceMinutes: 0,
    })),
    questions,
    warnings,
    serviceCounts: {},
    assignmentSummary: [],
    optionalScenarios: parsed.quoteOnlyRequests,
    includedPeople: [],
    excludedOptionalPeople: parsed.optionalPeople.map((person) => person.name),
    readyTimeMinutes,
    earliestScheduledMinute: null,
  });

  if (questions.some((question) => question.blocking) || readyTimeMinutes === null) {
    warnings.push({
      code: "missing_production_input",
      message: "Answer the production questions before generating a schedule. Briarwood will not guess missing timing or authority.",
      blocking: true,
    });
    return emptyResult();
  }

  const includedPeople = [
    ...parsed.confirmedPeople,
    ...(config.optionalPeopleMode === "include" ? parsed.optionalPeople : []),
  ];
  const fixedByProvider = new Map<string, ReservedInterval[]>();
  const fixedByPerson = new Map<string, ReservedInterval[]>();
  const acceptedFixedBlockIds = new Set<string>();
  const blocks: ProductionScheduleBlock[] = [];
  const providerById = new Map(config.providers.map((provider) => [provider.id, provider]));

  for (const fixed of config.fixedBlocks) {
    const start = parseScheduleClock(fixed.startTime);
    const end = parseScheduleClock(fixed.endTime);
    const provider = providerById.get(fixed.providerId);
    const person = includedPeople.find((candidate) => personKey(candidate.name) === personKey(fixed.personName));
    if (start === null || end === null || end <= start || !provider || !person) {
      warnings.push({
        code: "fixed_block",
        message: `Review fixed block ${fixed.personName || fixed.id}; its person, provider, or time is incomplete.`,
        blocking: true,
      });
      continue;
    }
    if (!providerCanPerform(provider, fixed.service)) {
      warnings.push({
        code: "fixed_block",
        message: `${provider.name} cannot take ${fixed.personName}'s fixed ${serviceLabel(fixed.service)} block with the configured capability.`,
        blocking: true,
      });
      continue;
    }
    const interval = { start, end };
    const providerConflict = (fixedByProvider.get(provider.id) ?? []).some(
      (reserved) => interval.start < reserved.end && reserved.start < interval.end,
    );
    const personConflict = (fixedByPerson.get(person.id) ?? []).some(
      (reserved) => interval.start < reserved.end && reserved.start < interval.end,
    );
    if (providerConflict || personConflict) {
      warnings.push({
        code: "fixed_block",
        message: `${fixed.personName}'s fixed block overlaps another fixed ${providerConflict ? "artist" : "person"} block and was left out of the generated draft.`,
        blocking: true,
      });
      continue;
    }
    if (end > readyTimeMinutes) {
      warnings.push({
        code: "fixed_block",
        message: `${fixed.personName}'s fixed block ends after the ready time and was left out of the generated draft. Review the fixed time before using this draft.`,
        blocking: true,
      });
      continue;
    }
    fixedByProvider.set(provider.id, [...(fixedByProvider.get(provider.id) ?? []), interval]);
    fixedByPerson.set(person.id, [...(fixedByPerson.get(person.id) ?? []), interval]);
    acceptedFixedBlockIds.add(fixed.id);
    blocks.push({
      id: fixed.id,
      personId: person.id,
      personName: person.name,
      roleLabel: person.roleLabel,
      service: fixed.service,
      serviceLabel: serviceLabel(fixed.service),
      providerId: provider.id,
      providerName: provider.name,
      startMinutes: start,
      endMinutes: end,
      durationMinutes: end - start,
      fixed: true,
      optional: person.status === "optional",
      notes: unique([...person.notes, fixed.notes ?? "Fixed service block"]).filter(Boolean),
    });
  }

  const tasks: WorkingTask[] = [];
  const proximityByPerson = new Map<string, string>();
  for (const person of includedPeople) {
    for (const constraint of person.constraints) {
      if (constraint.type !== "stay_near" || !constraint.relatedPersonName) continue;
      const related = includedPeople.find((candidate) => personKey(candidate.name) === personKey(constraint.relatedPersonName ?? ""));
      if (!related) continue;
      const pairKey = [person.id, related.id].sort().join("+");
      proximityByPerson.set(person.id, pairKey);
      proximityByPerson.set(related.id, pairKey);
    }
  }
  for (const person of includedPeople) {
    const fixedForPerson = config.fixedBlocks.filter(
      (fixed) => acceptedFixedBlockIds.has(fixed.id) && personKey(fixed.personName) === personKey(person.name),
    );
    const services = unique([...person.services]);
    if (isPrimaryPerson(person) && config.assignPrimaryToLead && services.includes("hair") && services.includes("makeup")) {
      services.splice(0, services.length, "hair_makeup");
    }
    services.forEach((service) => {
      if (fixedForPerson.some((fixed) => serviceCovers(fixed.service, service))) return;
      const proximityNames = proximityByPerson.get(person.id);
      tasks.push({
        id: workingTaskKey(person.id, service),
        person,
        service,
        priority: taskPriority(person, service),
        ...(proximityNames ? { proximityKey: `${proximityNames}:${service}` } : {}),
      });
    });
  }

  if (config.touchupMode === "schedule_fixed_only" && parsed.quoteOnlyRequests.length > 0 && !config.fixedBlocks.some((block) => block.service === "touchup")) {
    warnings.push({
      code: "touchup_timing",
      message: "Touchups remain outside the schedule until a fixed touchup time and duration are entered.",
      blocking: true,
    });
  }

  const providerLoads = new Map(config.providers.map((provider) => [provider.id, blocks.filter((block) => block.providerId === provider.id).reduce((sum, block) => sum + block.durationMinutes, 0)]));
  const lead = config.providers.find((provider) => provider.isLead);
  const proximityAssignments = new Map<string, SchedulingProvider>();

  const chooseProvider = (task: WorkingTask): SchedulingProvider | undefined => {
    if (isPrimaryPerson(task.person) && config.assignPrimaryToLead && lead && providerCanPerform(lead, task.service)) return lead;
    if (task.proximityKey) {
      const assigned = proximityAssignments.get(task.proximityKey);
      if (assigned && providerCanPerform(assigned, task.service)) return assigned;
    }
    const candidates = config.providers.filter((provider) => providerCanPerform(provider, task.service) && durationForProvider(provider, task.service, isPrimaryPerson(task.person)) !== null);
    if (candidates.length === 0) return undefined;
    const selected = [...candidates].sort((a, b) => {
      const leadPenaltyA = config.protectLeadBeforePrimary && lead && a.id === lead.id && !isPrimaryPerson(task.person) ? 100000 : 0;
      const leadPenaltyB = config.protectLeadBeforePrimary && lead && b.id === lead.id && !isPrimaryPerson(task.person) ? 100000 : 0;
      return (providerLoads.get(a.id) ?? 0) + leadPenaltyA - ((providerLoads.get(b.id) ?? 0) + leadPenaltyB) || a.name.localeCompare(b.name);
    })[0];
    if (task.proximityKey) proximityAssignments.set(task.proximityKey, selected);
    return selected;
  };

  for (const task of tasks) {
    const provider = chooseProvider(task);
    if (!provider) {
      warnings.push({
        code: "provider_capability",
        message: `No configured artist can take ${task.person.name}'s ${serviceLabel(task.service)} block with a confirmed duration.`,
        blocking: true,
      });
      continue;
    }
    const duration = durationForProvider(provider, task.service, isPrimaryPerson(task.person));
    if (duration === null) {
      warnings.push({
        code: "provider_timing",
        message: `${provider.name}'s ${serviceLabel(task.service)} duration is missing.`,
        blocking: true,
      });
      continue;
    }
    task.provider = provider;
    task.duration = duration;
    providerLoads.set(provider.id, (providerLoads.get(provider.id) ?? 0) + duration);
  }

  const providerCursor = new Map(config.providers.map((provider) => [provider.id, readyTimeMinutes]));
  const personCursor = new Map(includedPeople.map((person) => [person.id, readyTimeMinutes]));
  const dynamicByProvider = new Map<string, ReservedInterval[]>();
  const dynamicByPerson = new Map<string, ReservedInterval[]>();

  const orderedTasks = tasks
    .filter((task): task is WorkingTask & { provider: SchedulingProvider; duration: number } => Boolean(task.provider && task.duration))
    .map((task, _index, assignedTasks) => {
      if (!task.proximityKey) return task;
      const sharedPriority = Math.max(
        ...assignedTasks.filter((candidate) => candidate.proximityKey === task.proximityKey).map((candidate) => candidate.priority),
      );
      return { ...task, priority: sharedPriority };
    })
    .sort((a, b) =>
      b.priority - a.priority ||
      (a.proximityKey ?? a.person.id).localeCompare(b.proximityKey ?? b.person.id) ||
      a.person.name.localeCompare(b.person.name) ||
      a.service.localeCompare(b.service),
    );

  for (const task of orderedTasks) {
    const provider = task.provider;
    let end = Math.min(providerCursor.get(provider.id) ?? readyTimeMinutes, personCursor.get(task.person.id) ?? readyTimeMinutes);
    const reserved = [
      ...(fixedByProvider.get(provider.id) ?? []),
      ...(fixedByPerson.get(task.person.id) ?? []),
      ...(dynamicByProvider.get(provider.id) ?? []),
      ...(dynamicByPerson.get(task.person.id) ?? []),
    ];
    end = latestAvailableEnd(end, task.duration, reserved);
    const start = end - task.duration;
    const interval = { start, end };
    providerCursor.set(provider.id, start);
    personCursor.set(task.person.id, start);
    dynamicByProvider.set(provider.id, [...(dynamicByProvider.get(provider.id) ?? []), interval]);
    dynamicByPerson.set(task.person.id, [...(dynamicByPerson.get(task.person.id) ?? []), interval]);
    blocks.push({
      id: `${task.id}-${start}`,
      personId: task.person.id,
      personName: task.person.name,
      roleLabel: task.person.roleLabel,
      service: task.service,
      serviceLabel: serviceLabel(task.service),
      providerId: provider.id,
      providerName: provider.name,
      startMinutes: start,
      endMinutes: end,
      durationMinutes: task.duration,
      fixed: false,
      optional: task.person.status === "optional",
      notes: task.person.notes,
    });
  }

  const earliestStart = blocks.length > 0 ? Math.min(...blocks.map((block) => block.startMinutes)) : null;
  const earliestAllowed = config.earliestStartTime ? parseScheduleClock(config.earliestStartTime) : null;
  if (earliestStart !== null && earliestAllowed !== null && earliestStart < earliestAllowed) {
    warnings.push({
      code: "starts_before_access",
      message: `The current artists and timings require a ${formatScheduleClock(earliestStart)} start, before the ${formatScheduleClock(earliestAllowed)} access time. Review staffing or scope; no artist was added automatically.`,
      blocking: true,
    });
  }

  for (const person of includedPeople) {
    const expectedServices = [...person.services];
    if (
      isPrimaryPerson(person) &&
      config.assignPrimaryToLead &&
      expectedServices.includes("hair") &&
      expectedServices.includes("makeup")
    ) {
      expectedServices.splice(0, expectedServices.length, "hair_makeup");
    }
    const personBlocks = blocks.filter((block) => block.personId === person.id);
    for (const service of expectedServices) {
      if (personBlocks.some((block) => serviceCovers(block.service, service))) continue;
      warnings.push({
        code: "missing_required_service",
        message: `${person.name}'s required ${serviceLabel(service)} service is not scheduled.`,
        blocking: true,
      });
    }
    if (person.status === "confirmed" && expectedServices.length > 0 && personBlocks.length === 0) {
      warnings.push({
        code: "missing_confirmed_person",
        message: `${person.name} is confirmed but has no service block in the generated draft.`,
        blocking: true,
      });
    }
  }

  for (const block of blocks) {
    if (block.endMinutes <= readyTimeMinutes) continue;
    warnings.push({
      code: "ready_time_violation",
      message: `${block.personName}'s ${block.serviceLabel} block ends after the hard ready time.`,
      blocking: true,
    });
  }

  const addOverlapWarning = (label: string, groupedBlocks: ProductionScheduleBlock[]) => {
    const ordered = [...groupedBlocks].sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);
    for (let index = 1; index < ordered.length; index++) {
      if (ordered[index - 1].endMinutes <= ordered[index].startMinutes) continue;
      warnings.push({
        code: "schedule_overlap",
        message: `${label} has overlapping service blocks in the generated draft.`,
        blocking: true,
      });
      return;
    }
  };
  for (const provider of config.providers) {
    addOverlapWarning(provider.name, blocks.filter((block) => block.providerId === provider.id));
  }
  for (const person of includedPeople) {
    addOverlapWarning(person.name, blocks.filter((block) => block.personId === person.id));
  }

  for (const person of includedPeople) {
    for (const constraint of person.constraints) {
      if (constraint.type !== "stay_near" || !constraint.relatedPersonName) continue;
      const personBlocks = blocks.filter((block) => block.personId === person.id);
      const relatedBlocks = blocks.filter((block) => personKey(block.personName) === personKey(constraint.relatedPersonName ?? ""));
      if (personBlocks.length === 0 || relatedBlocks.length === 0) continue;
      const closestGap = Math.min(
        ...personBlocks.flatMap((block) => relatedBlocks.map((related) => Math.max(0, related.startMinutes - block.endMinutes, block.startMinutes - related.endMinutes))),
      );
      if (closestGap > 60) {
        warnings.push({
          code: "special_constraint",
          message: `${person.name} is more than 60 minutes from ${constraint.relatedPersonName} in this draft. Review the language/proximity constraint.`,
          blocking: false,
        });
      }
    }
  }

  const lanes = config.providers.map((provider) => {
    const laneBlocks = blocks.filter((block) => block.providerId === provider.id).sort((a, b) => a.startMinutes - b.startMinutes || a.personName.localeCompare(b.personName));
    return {
      providerId: provider.id,
      providerName: provider.name,
      capability: provider.capability,
      isLead: Boolean(provider.isLead),
      blocks: laneBlocks,
      totalServiceMinutes: laneBlocks.reduce((sum, block) => sum + block.durationMinutes, 0),
    };
  });
  const serviceCounts: Record<string, number> = {};
  for (const block of blocks) addCount(serviceCounts, block.serviceLabel);

  return {
    lanes,
    questions,
    warnings: unique(warnings.map((warning) => JSON.stringify(warning))).map((warning) => JSON.parse(warning) as ProductionScheduleWarning),
    serviceCounts,
    assignmentSummary: lanes.map((lane) => ({
      providerId: lane.providerId,
      providerName: lane.providerName,
      serviceCount: lane.blocks.length,
      totalServiceMinutes: lane.totalServiceMinutes,
    })),
    optionalScenarios: parsed.quoteOnlyRequests,
    includedPeople: includedPeople.map((person) => person.name),
    excludedOptionalPeople: config.optionalPeopleMode === "include" ? [] : parsed.optionalPeople.map((person) => person.name),
    readyTimeMinutes,
    earliestScheduledMinute: earliestStart,
  };
}

export function defaultScheduleOperatorDefaults(): ScheduleOperatorDefaults {
  return {
    providers: [],
    protectLeadBeforePrimary: true,
    assignPrimaryToLead: true,
    preferredLayout: "artist_columns",
    allowUnrequestedBuffers: false,
  };
}

// TODO: Add a tested staff-minimization strategy in a separate scheduling-optimization slice.
