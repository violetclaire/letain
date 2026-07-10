import {
  formatScheduleClock,
  parseScheduleClock,
  parseScheduleRequest,
  type ParsedSchedulePerson,
  type ScheduleQuoteScenario,
  type ScheduleServiceKind,
} from "./schedulingIntelligence";

export type ScheduleEvidenceSourceKind = "thread" | "spreadsheet" | "count_only";

export type ScheduleEvidenceMessage = {
  id: string;
  sequence: number;
  dayContext?: string;
  text: string;
};

export type ScheduleSpreadsheetRowKind =
  | "service"
  | "hotel"
  | "subtotal"
  | "total"
  | "cost";

export type ScheduleSpreadsheetRow = {
  id: string;
  kind: ScheduleSpreadsheetRowKind;
  highlighted?: boolean;
  section?: "original" | "additions";
  personName?: string;
  role?: string;
  services?: ScheduleServiceKind[];
  dayContext?: string;
  pricingMetadata?: Record<string, string | number>;
  note?: string;
};

export type CandidateScheduleBlock = {
  id: string;
  personName: string;
  service: ScheduleServiceKind;
  startTime: string;
  endTime: string;
  artistName?: string;
  dayContext?: string;
  locationContext?: "main" | "separate_room";
  order?: number;
};

export type ScheduleEvidenceInput = {
  id: string;
  sourceKind: ScheduleEvidenceSourceKind;
  eventName?: string;
  messages?: ScheduleEvidenceMessage[];
  spreadsheetRows?: ScheduleSpreadsheetRow[];
  selectedDay?: string;
  highlightedRowsAreActive?: boolean;
  readyTime?: string;
  candidateBlocks?: CandidateScheduleBlock[];
  candidateScheduleScope?: "provided_only" | "all_active";
};

export type ScheduleServiceContext = {
  dayContext?: string;
  services: ScheduleServiceKind[];
  sourceId: string;
};

export type ReducedScheduleParticipant = ParsedSchedulePerson & {
  dayContexts: string[];
  serviceContexts: ScheduleServiceContext[];
  sourceIds: string[];
  locationContexts: string[];
  separateRoom: boolean;
  preferredPlacement?: "early" | "late" | "end";
  explicitStartTime?: string;
};

export type RemovedScheduleParticipant = {
  name: string;
  sourceId: string;
  reason: string;
};

export type ScheduleReadyConstraint = {
  scope: "person" | "group" | "event";
  personName?: string;
  personLabel?: string;
  dayContext?: string;
  kind: "hard" | "preferred" | "latest";
  time: string;
  minutes: number;
  sourceId: string;
  detail: string;
};

export type ScheduleEvidenceQuestion = {
  id: string;
  prompt: string;
  blocking: true;
};

export type ScheduleEvidenceWarning = {
  code:
    | "ready_time_conflict"
    | "group_ready_time_conflict"
    | "missing_person"
    | "removed_person_present"
    | "separate_room_conflict"
    | "placement_conflict"
    | "duplicate_service_candidate"
    | "count_changed"
    | "count_inconsistency";
  message: string;
  sourceIds: string[];
};

export type ScheduleableSpreadsheetRow = ScheduleSpreadsheetRow & {
  active: boolean;
};

export type ReducedScheduleEvidence = {
  sourceId: string;
  sourceKind: ScheduleEvidenceSourceKind;
  eventName?: string;
  selectedDay?: string;
  people: ReducedScheduleParticipant[];
  confirmedPeople: ReducedScheduleParticipant[];
  optionalPeople: ReducedScheduleParticipant[];
  removedPeople: RemovedScheduleParticipant[];
  quoteOnlyRequests: ScheduleQuoteScenario[];
  dayContexts: string[];
  readyConstraints: ScheduleReadyConstraint[];
  artistCount: number | null;
  declaredPeopleCount: number | null;
  locations: Array<{ kind: "venue" | "getting_ready"; value: string; sourceId: string }>;
  arrivalGuidance: string[];
  scheduleableSpreadsheetRows: ScheduleableSpreadsheetRow[];
  ignoredSpreadsheetRowIds: string[];
  candidateBlocks: CandidateScheduleBlock[];
  warnings: ScheduleEvidenceWarning[];
  questions: ScheduleEvidenceQuestion[];
  scheduleReadiness: "ready_for_operator_review" | "needs_operator_input" | "conflict_requires_resolution";
  placeholderScheduleAllowed: boolean;
  placeholderLabel?: string;
  externalLinksIgnored: boolean;
  sourceMessageIds: string[];
};

type MutableParticipant = ReducedScheduleParticipant & { lastSequence: number };

const TIME_PATTERN = "(\\d{1,2}(?::\\d{2})?\\s*(?:AM|PM))";

function normalize(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\r\n?/g, "\n")
    .trim();
}

function key(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function uniqueBy<T>(values: T[], identity: (value: T) => string): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const id = identity(value);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function mergeParticipant(
  map: Map<string, MutableParticipant>,
  person: ParsedSchedulePerson,
  sourceId: string,
  sequence: number,
  dayContext?: string,
): void {
  const personKey = key(person.name);
  if (!personKey) return;
  const existing = map.get(personKey);
  const serviceContext: ScheduleServiceContext = {
    ...(dayContext ? { dayContext } : {}),
    services: [...person.services],
    sourceId,
  };
  if (!existing) {
    map.set(personKey, {
      ...person,
      notes: [...person.notes],
      constraints: [...person.constraints],
      dayContexts: dayContext ? [dayContext] : [],
      serviceContexts: [serviceContext],
      sourceIds: [sourceId],
      locationContexts: [],
      separateRoom: false,
      lastSequence: sequence,
    });
    return;
  }

  const newer = sequence >= existing.lastSequence;
  existing.role = newer && person.role !== "unspecified" ? person.role : existing.role;
  existing.roleLabel = newer && person.role !== "unspecified" ? person.roleLabel : existing.roleLabel;
  existing.relationship = newer && person.relationship ? person.relationship : existing.relationship;
  existing.status = newer ? person.status : existing.status;
  existing.services = unique([...existing.services, ...person.services]);
  existing.notes = unique([...existing.notes, ...person.notes]);
  existing.constraints = uniqueBy(
    [...existing.constraints, ...person.constraints],
    (constraint) => JSON.stringify(constraint),
  );
  existing.dayContexts = unique([...existing.dayContexts, ...(dayContext ? [dayContext] : [])]);
  existing.serviceContexts = uniqueBy(
    [...existing.serviceContexts, serviceContext],
    (context) => `${context.dayContext ?? "unspecified"}:${context.services.join("+")}:${context.sourceId}`,
  );
  existing.sourceIds = unique([...existing.sourceIds, sourceId]);
  existing.lastSequence = Math.max(existing.lastSequence, sequence);
}

function personFromAddition(name: string, serviceText: string, index: number): ParsedSchedulePerson {
  if (/^bride$/i.test(serviceText.trim())) {
    return {
      id: `${key(name).replace(/ /g, "-") || "person"}-${index + 1}`,
      name: name.trim(),
      role: "bride",
      roleLabel: "Bride",
      status: "confirmed",
      services: [],
      notes: [],
      constraints: [],
    };
  }
  const parsed = parseScheduleRequest(`- ${name} ${serviceText}`);
  return parsed.people[0] ?? {
    id: `${key(name).replace(/ /g, "-") || "person"}-${index + 1}`,
    name,
    role: /grandma|grandmother/i.test(name) ? "grandmother" : "unspecified",
    roleLabel: /grandma|grandmother/i.test(name) ? "Grandmother" : "Role to confirm",
    status: "confirmed",
    services: [],
    notes: [],
    constraints: [],
  };
}

function rosterTextOnly(text: string): string {
  return normalize(text)
    .split("\n")
    .filter((line) => !new RegExp(`^\\s*${TIME_PATTERN}\\s*[-to]+`, "i").test(line))
    .join("\n");
}

function parseReadyConstraints(message: ScheduleEvidenceMessage): ScheduleReadyConstraint[] {
  const constraints: ScheduleReadyConstraint[] = [];
  const lines = normalize(message.text).split("\n").map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    const personMatch = line.match(
      new RegExp(`^([^:,.]{2,90}?)\\s+(?:must|needs? to|has to)\\s+(?:have\\s+hair\\s+and\\s+makeup\\s+)?(?:be\\s+)?(?:completed?|complete|done|ready)\\s+(?:by|at)\\s+${TIME_PATTERN}`, "i"),
    );
    if (personMatch) {
      const label = personMatch[1].trim();
      const time = personMatch[2].trim();
      const minutes = parseScheduleClock(time);
      if (minutes !== null) {
        constraints.push({
          scope: "person",
          personName: label.split("/")[0].trim(),
          personLabel: label,
          ...(message.dayContext ? { dayContext: message.dayContext } : {}),
          kind: "hard",
          time: formatScheduleClock(minutes),
          minutes,
          sourceId: message.id,
          detail: line,
        });
      }
    }

    const groupPreferred = line.match(
      new RegExp(`(?:everyone else|the rest|main group).*?(?:ideally|preferred).*?(?:by|at)\\s+${TIME_PATTERN}.*?(?:latest|no later|also works).*?${TIME_PATTERN}`, "i"),
    );
    if (groupPreferred) {
      const preferred = parseScheduleClock(groupPreferred[1]);
      const latest = parseScheduleClock(groupPreferred[2]);
      if (preferred !== null) {
        constraints.push({
          scope: "group",
          ...(message.dayContext ? { dayContext: message.dayContext } : {}),
          kind: "preferred",
          time: formatScheduleClock(preferred),
          minutes: preferred,
          sourceId: message.id,
          detail: line,
        });
      }
      if (latest !== null) {
        constraints.push({
          scope: "group",
          ...(message.dayContext ? { dayContext: message.dayContext } : {}),
          kind: "latest",
          time: formatScheduleClock(latest),
          minutes: latest,
          sourceId: message.id,
          detail: line,
        });
      }
    }

    const groupHard = line.match(new RegExp(`(?:all\\s+\\d+|everyone|the group).*?(?:done|ready).*?(?:by|at)\\s+${TIME_PATTERN}`, "i"));
    if (groupHard) {
      const minutes = parseScheduleClock(groupHard[1]);
      if (minutes !== null) {
        constraints.push({
          scope: "group",
          ...(message.dayContext ? { dayContext: message.dayContext } : {}),
          kind: "hard",
          time: formatScheduleClock(minutes),
          minutes,
          sourceId: message.id,
          detail: line,
        });
      }
    }

    const eventReady = line.match(new RegExp(`(?:ready[- ]?by(?:\\s+time)?|hard\\s+finish)\\s*[:=]?\\s*${TIME_PATTERN}`, "i"));
    if (eventReady) {
      const minutes = parseScheduleClock(eventReady[1]);
      if (minutes !== null) {
        constraints.push({
          scope: "event",
          ...(message.dayContext ? { dayContext: message.dayContext } : {}),
          kind: "hard",
          time: formatScheduleClock(minutes),
          minutes,
          sourceId: message.id,
          detail: line,
        });
      }
    }
  }
  return constraints;
}

function extractNamedAdditions(text: string): Array<{ name: string; serviceText: string }> {
  const additions: Array<{ name: string; serviceText: string }> = [];
  const pattern = /\b(?:add|adds|added|restore|include)\s+(.+?)(?=\s+(?:for\s+)?(?:hair\s*(?:\+|and|&)\s*makeup|makeup\s*(?:\+|and|&)\s*hair|hair only|makeup only|hair|makeup)\b)\s+(?:for\s+)?((?:hair\s*(?:\+|and|&)\s*makeup)|(?:makeup\s*(?:\+|and|&)\s*hair)|hair only|makeup only|hair|makeup)\b/gi;
  for (const match of text.matchAll(pattern)) {
    const name = match[1].trim().replace(/^[:,-]+|[:,-]+$/g, "");
    if (!name || /^(?:her|his|the)\s+/i.test(name) || name.split(/\s+/).length > 4) continue;
    additions.push({ name, serviceText: match[2].trim() });
  }
  return additions;
}

function extractRemovalNames(text: string): string[] {
  const names: string[] = [];
  const pattern = /\b(?:remove|removed|exclude|drop)\s+([A-Za-z][A-Za-z'-]*(?:\s+[A-Za-z][A-Za-z'-]*){0,2})(?=\s*[.,;]|$)/gi;
  for (const match of text.matchAll(pattern)) names.push(match[1].trim());
  return unique(names);
}

function addPersonContext(person: MutableParticipant, message: ScheduleEvidenceMessage): void {
  const text = normalize(message.text);
  const namePattern = new RegExp(`\\b${person.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  if (!namePattern.test(text)) return;
  if (/hotel room|separate room|her room|their room/i.test(text)) {
    person.separateRoom = true;
    person.locationContexts = unique([...person.locationContexts, "separate_room"]);
    person.notes = unique([...person.notes, "Separate-room service"]);
  }
  if (new RegExp(`${namePattern.source}[^.\n]*(?:at the end|to the end)`, "i").test(text)) {
    person.preferredPlacement = "end";
  }
  if (new RegExp(`${namePattern.source}[^.\n]*(?:earlier|east coast)`, "i").test(text)) {
    person.preferredPlacement = "early";
  }
  if (new RegExp(`${namePattern.source}[^.\n]*(?:later|after (?:the )?bride)`, "i").test(text)) {
    person.preferredPlacement = "late";
  }
  const startMatch = text.match(new RegExp(`${namePattern.source}[^.\n]*(?:start|starts|at)\\s+${TIME_PATTERN}`, "i"));
  if (startMatch) {
    const start = parseScheduleClock(startMatch[1]);
    if (start !== null) person.explicitStartTime = formatScheduleClock(start);
  }
}

function extractLocations(message: ScheduleEvidenceMessage): Array<{ kind: "venue" | "getting_ready"; value: string; sourceId: string }> {
  const locations: Array<{ kind: "venue" | "getting_ready"; value: string; sourceId: string }> = [];
  const text = normalize(message.text);
  const gettingReady = text.match(/getting[- ]ready (?:location\s*[:=]|location is|at)\s*([^\n.]+)/i);
  if (gettingReady) locations.push({ kind: "getting_ready", value: gettingReady[1].trim(), sourceId: message.id });
  const venue = text.match(/(?:wedding )?venue\s*(?:[:=]|is)\s*([^\n.]+)/i);
  if (venue) locations.push({ kind: "venue", value: venue[1].trim(), sourceId: message.id });
  return locations;
}

function participantFromSpreadsheetRow(row: ScheduleSpreadsheetRow, index: number): ParsedSchedulePerson | null {
  if (!row.personName || !row.services || row.services.length === 0) return null;
  const serviceText = row.services.includes("hair") && row.services.includes("makeup")
    ? "Hair + Makeup"
    : row.services.includes("hair")
      ? "Hair only"
      : row.services.includes("makeup")
        ? "Makeup only"
        : row.services.includes("touchup")
          ? "Touchup"
          : "Service";
  const roleText = row.role ? ` (${row.role})` : "";
  return personFromAddition(`${row.personName}${roleText}`, serviceText, index);
}

function addQuestion(questions: ScheduleEvidenceQuestion[], id: string, prompt: string): void {
  if (questions.some((question) => question.id === id)) return;
  questions.push({ id, prompt, blocking: true });
}

function candidateWarnings(
  people: ReducedScheduleParticipant[],
  removedPeople: RemovedScheduleParticipant[],
  constraints: ScheduleReadyConstraint[],
  blocks: CandidateScheduleBlock[],
  scope: ScheduleEvidenceInput["candidateScheduleScope"],
): ScheduleEvidenceWarning[] {
  if (blocks.length === 0) return [];
  const warnings: ScheduleEvidenceWarning[] = [];
  const blockNameKeys = new Set(blocks.map((block) => key(block.personName)));

  for (const constraint of constraints.filter((item) => item.kind === "hard" && item.scope === "person" && item.personName)) {
    const matching = blocks.filter((block) => key(block.personName) === key(constraint.personName ?? "") && (!constraint.dayContext || block.dayContext === constraint.dayContext));
    const lateBlock = matching
      .map((block) => ({ block, end: parseScheduleClock(block.endTime) }))
      .filter((entry): entry is { block: CandidateScheduleBlock; end: number } => entry.end !== null)
      .sort((a, b) => b.end - a.end)[0];
    if (lateBlock && lateBlock.end > constraint.minutes) {
      const service = lateBlock.block.service === "makeup" ? "makeup" : lateBlock.block.service === "hair" ? "hair" : "service";
      const label = constraint.personLabel ?? constraint.personName ?? lateBlock.block.personName;
      warnings.push({
        code: "ready_time_conflict",
        message: `${label} must be hair and makeup complete by ${constraint.time} for the recorded readiness requirement, but the proposed ${service} time is ${lateBlock.block.startTime}-${lateBlock.block.endTime}. Move ${constraint.personName}'s ${service} earlier or assign it to another artist before ${constraint.time}.`,
        sourceIds: [constraint.sourceId, lateBlock.block.id],
      });
    }
  }

  for (const constraint of constraints.filter((item) => item.scope === "group" && (item.kind === "hard" || item.kind === "latest"))) {
    const matching = blocks.filter((block) => !constraint.dayContext || block.dayContext === constraint.dayContext);
    const latestEnd = Math.max(...matching.map((block) => parseScheduleClock(block.endTime) ?? -1));
    if (latestEnd > constraint.minutes) {
      warnings.push({
        code: "group_ready_time_conflict",
        message: `The proposed ${constraint.dayContext ?? "group"} schedule finishes after the ${constraint.time} ${constraint.kind} readiness limit.`,
        sourceIds: [constraint.sourceId, ...matching.map((block) => block.id)],
      });
    }
  }

  if (scope === "all_active") {
    for (const person of people.filter((candidate) => candidate.status === "confirmed" && candidate.services.length > 0)) {
      if (!blockNameKeys.has(key(person.name))) {
        warnings.push({
          code: "missing_person",
          message: `${person.name} is confirmed in the current roster but missing from the candidate schedule.`,
          sourceIds: person.sourceIds,
        });
      }
    }
  }

  for (const removed of removedPeople) {
    if (blockNameKeys.has(key(removed.name))) {
      warnings.push({
        code: "removed_person_present",
        message: `${removed.name} was removed by a later correction but still appears in the candidate schedule.`,
        sourceIds: [removed.sourceId, ...blocks.filter((block) => key(block.personName) === key(removed.name)).map((block) => block.id)],
      });
    }
  }

  for (const person of people.filter((candidate) => candidate.separateRoom)) {
    const personBlocks = blocks.filter((block) => key(block.personName) === key(person.name));
    if (personBlocks.some((block) => block.locationContext !== "separate_room")) {
      warnings.push({
        code: "separate_room_conflict",
        message: `${person.name} has a separate-room service constraint but appears in the main schedule location.`,
        sourceIds: [...person.sourceIds, ...personBlocks.map((block) => block.id)],
      });
    }
    if (person.preferredPlacement === "end" && personBlocks.length > 0) {
      const maxOrder = Math.max(...blocks.map((block, index) => block.order ?? index));
      const personOrder = Math.max(...personBlocks.map((block, index) => block.order ?? index));
      if (personOrder < maxOrder) {
        warnings.push({
          code: "placement_conflict",
          message: `${person.name} is marked for end-of-schedule placement but is not last in the candidate schedule.`,
          sourceIds: [...person.sourceIds, ...personBlocks.map((block) => block.id)],
        });
      }
    }
  }

  return uniqueBy(warnings, (warning) => `${warning.code}:${warning.message}`);
}

export function reduceScheduleEvidence(input: ScheduleEvidenceInput): ReducedScheduleEvidence {
  const messages = uniqueBy(
    [...(input.messages ?? [])].sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id)),
    (message) => `${message.dayContext ?? "unspecified"}:${normalize(message.text)}`,
  );
  const people = new Map<string, MutableParticipant>();
  const removed = new Map<string, RemovedScheduleParticipant>();
  const readyConstraints: ScheduleReadyConstraint[] = [];
  const quoteOnlyRequests: ScheduleQuoteScenario[] = [];
  const locations: Array<{ kind: "venue" | "getting_ready"; value: string; sourceId: string }> = [];
  const arrivalGuidance: string[] = [];
  const declaredCounts: number[] = [];
  let artistCount: number | null = null;
  let unnamedAdditions = 0;
  let externalLinksIgnored = false;

  for (const message of messages) {
    const text = normalize(message.text);
    externalLinksIgnored ||= /https?:\/\//i.test(text);
    const parsed = parseScheduleRequest(rosterTextOnly(text));
    for (const person of parsed.people) {
      removed.delete(key(person.name));
      mergeParticipant(people, person, message.id, message.sequence, message.dayContext);
    }
    quoteOnlyRequests.push(...parsed.quoteOnlyRequests.map((scenario) => ({ ...scenario, id: `${message.id}:${scenario.id}` })));
    readyConstraints.push(...parseReadyConstraints(message));
    locations.push(...extractLocations(message));

    for (const addition of extractNamedAdditions(text)) {
      const person = personFromAddition(addition.name, addition.serviceText, people.size);
      removed.delete(key(person.name));
      mergeParticipant(people, person, message.id, message.sequence, message.dayContext);
    }
    if (/\badd(?:ed|s)?\s+(?:her|his|the)\s+(?:sister|friend|aunt|grandma)\b/i.test(text)) unnamedAdditions += 1;

    for (const name of extractRemovalNames(text)) {
      people.delete(key(name));
      removed.set(key(name), { name, sourceId: message.id, reason: "Removed by a later schedule correction." });
    }

    const countMatch = text.match(/\b(?:bride\s*\+\s*(\d+)|(\d+)\s+people\s+need)\b/i);
    if (countMatch) declaredCounts.push(countMatch[1] ? Number(countMatch[1]) + 1 : Number(countMatch[2]));
    const artistMatch = text.match(/\b(\d+)\s+artists?\b/i);
    if (artistMatch) artistCount = Number(artistMatch[1]);
    if (/\b(?:arrive|arrival)[^.\n]*\d+\s*[-to]+\s*\d+\s+minutes?\s+before\s+setup/i.test(text)) {
      arrivalGuidance.push(text.match(/[^.\n]*(?:arrive|arrival)[^.\n]*before\s+setup[^.\n]*/i)?.[0]?.trim() ?? text);
    }
  }

  if (input.readyTime) {
    const minutes = parseScheduleClock(input.readyTime);
    if (minutes !== null) {
      readyConstraints.push({
        scope: "event",
        ...(input.selectedDay ? { dayContext: input.selectedDay } : {}),
        kind: "hard",
        time: formatScheduleClock(minutes),
        minutes,
        sourceId: input.id,
        detail: `Operator-provided ready time: ${formatScheduleClock(minutes)}`,
      });
    }
  }

  const spreadsheetRows = input.spreadsheetRows ?? [];
  const scheduleableSpreadsheetRows = spreadsheetRows
    .filter((row) => row.kind === "service")
    .map((row) => ({
      ...row,
      active:
        (!input.highlightedRowsAreActive || row.highlighted === true) &&
        (!input.selectedDay || !row.dayContext || key(row.dayContext) === key(input.selectedDay)),
    }));
  const ignoredSpreadsheetRowIds = spreadsheetRows.filter((row) => row.kind !== "service").map((row) => row.id);
  for (const [index, row] of scheduleableSpreadsheetRows.filter((candidate) => candidate.active).entries()) {
    const person = participantFromSpreadsheetRow(row, index);
    if (person) mergeParticipant(people, person, row.id, messages.length + index + 1, row.dayContext);
  }

  for (const person of people.values()) {
    for (const message of messages) addPersonContext(person, message);
  }

  if (input.sourceKind === "count_only" && input.eventName) {
    const brideName = input.eventName.split(/\s*(?:\+|&| and )\s*/i)[0]?.trim();
    if (brideName && !people.has(key(brideName))) {
      mergeParticipant(
        people,
        personFromAddition(brideName, "Bride", people.size),
        input.id,
        messages.length + 1,
        input.selectedDay,
      );
      const bride = people.get(key(brideName));
      if (bride) {
        bride.role = "bride";
        bride.roleLabel = "Bride";
        bride.services = [];
      }
    }
  }

  const activePeople = [...people.values()]
    .map(({ lastSequence: _lastSequence, ...person }) => person)
    .sort((a, b) => a.name.localeCompare(b.name));
  const removedPeople = [...removed.values()].sort((a, b) => a.name.localeCompare(b.name));
  const warnings = candidateWarnings(
    activePeople,
    removedPeople,
    readyConstraints,
    input.candidateBlocks ?? [],
    input.candidateScheduleScope,
  );

  const originalRows = scheduleableSpreadsheetRows.filter((row) => row.section === "original");
  const additionRows = scheduleableSpreadsheetRows.filter((row) => row.section === "additions");
  for (const addition of additionRows) {
    const duplicate = originalRows.find(
      (original) =>
        key(original.personName ?? "") === key(addition.personName ?? "") &&
        (addition.services ?? []).some((service) => (original.services ?? []).includes(service)),
    );
    if (duplicate) {
      warnings.push({
        code: "duplicate_service_candidate",
        message: `${addition.personName} appears in both the original services and additions with overlapping service scope. Confirm what changed before scheduling.`,
        sourceIds: [duplicate.id, addition.id],
      });
    }
  }

  const declaredPeopleCount = declaredCounts.at(-1) ?? null;
  if (declaredCounts.length > 0 && unnamedAdditions > 0) {
    const original = declaredCounts[0];
    warnings.push({
      code: "count_changed",
      message: `The stated count changed from ${original} to ${original + unnamedAdditions} after later additions. Confirm the active roster before scheduling.`,
      sourceIds: messages.map((message) => message.id),
    });
  }
  if (declaredPeopleCount !== null && activePeople.length > 1 && activePeople.length !== declaredPeopleCount) {
    warnings.push({
      code: "count_inconsistency",
      message: `The stated count is ${declaredPeopleCount}, while ${activePeople.length} named people are currently extracted. Confirm the active roster.`,
      sourceIds: messages.map((message) => message.id),
    });
  }

  const questions: ScheduleEvidenceQuestion[] = [];
  if (input.sourceKind === "spreadsheet" && !input.selectedDay) {
    addQuestion(questions, "schedule_day", "Which service day is being scheduled: trial, Friday, Saturday, or all selected days?");
  }
  if (!readyConstraints.some((constraint) => constraint.kind === "hard")) {
    addQuestion(questions, "ready_time", "What is the hard ready time for this schedule?");
  }
  if (artistCount === null) addQuestion(questions, "artist_count", "How many artists are assigned to this schedule?");
  addQuestion(questions, "lead_artist", "Who is the lead artist, and is the primary client assigned to them?");
  addQuestion(questions, "provider_timing", "What are the per-artist service durations for this event?");
  if (activePeople.some((person) => person.role === "bride" || person.role === "client_primary")) {
    addQuestion(questions, "primary_fixed_block", "Is there a fixed bride or primary-client service block?");
  }
  if (activePeople.some((person) => person.services.length === 0)) {
    addQuestion(questions, "service_breakdown", "Confirm the missing hair, makeup, or mixed service breakdown before generating a final schedule.");
  }
  if (declaredPeopleCount !== null && activePeople.length < declaredPeopleCount) {
    addQuestion(questions, "roster", "Provide the missing names and service breakdown for the confirmed count.");
    addQuestion(questions, "placeholder_mode", "Should a clearly labeled working placeholder schedule be used until names are known?");
  }
  if (additionRows.some((row) => !row.active)) {
    addQuestion(questions, "additions_inclusion", "Should unselected additions be included in the active schedule?");
  }
  if (messages.some((message) => /push\s+(?:friday|the start|start).*?\d+\s+minutes/i.test(message.text))) {
    addQuestion(questions, "corrected_start_time", "Confirm the corrected start time before changing the schedule.");
  }
  if (messages.some((message) => /ready by[^.\n]*(?:only|everyone|all)/i.test(message.text))) {
    addQuestion(questions, "ready_time_scope", "Does the corrected ready time apply to the primary client only or to the full group?");
  }
  if (activePeople.some((person) => person.name.toLowerCase() === "grandma" && person.separateRoom)) {
    addQuestion(questions, "separate_room_assignment", "Should Grandma be part of the main schedule or a separate-room assignment scenario?");
  }
  if (messages.some((message) => /blowout/i.test(message.text))) {
    addQuestion(questions, "blowout_scope", "Is the blowout included in the primary hair timing or a separate prep block?");
  }

  const conflict = warnings.some((warning) =>
    ["ready_time_conflict", "group_ready_time_conflict", "removed_person_present", "separate_room_conflict"].includes(warning.code),
  );
  const placeholderScheduleAllowed = input.sourceKind === "count_only" && declaredPeopleCount !== null;

  return {
    sourceId: input.id,
    sourceKind: input.sourceKind,
    ...(input.eventName ? { eventName: input.eventName } : {}),
    ...(input.selectedDay ? { selectedDay: input.selectedDay } : {}),
    people: activePeople,
    confirmedPeople: activePeople.filter((person) => person.status === "confirmed"),
    optionalPeople: activePeople.filter((person) => person.status === "optional"),
    removedPeople,
    quoteOnlyRequests: uniqueBy(quoteOnlyRequests, (request) => `${request.label}:${request.participants.join("|")}`),
    dayContexts: unique([
      ...messages.map((message) => message.dayContext).filter((value): value is string => Boolean(value)),
      ...scheduleableSpreadsheetRows.map((row) => row.dayContext).filter((value): value is string => Boolean(value)),
    ]),
    readyConstraints: uniqueBy(readyConstraints, (constraint) => `${constraint.scope}:${constraint.personName ?? "group"}:${constraint.dayContext ?? "all"}:${constraint.kind}:${constraint.minutes}`),
    artistCount,
    declaredPeopleCount,
    locations: uniqueBy(locations, (location) => `${location.kind}:${key(location.value)}`),
    arrivalGuidance: unique(arrivalGuidance),
    scheduleableSpreadsheetRows,
    ignoredSpreadsheetRowIds,
    candidateBlocks: [...(input.candidateBlocks ?? [])],
    warnings: uniqueBy(warnings, (warning) => `${warning.code}:${warning.message}`),
    questions,
    scheduleReadiness: conflict ? "conflict_requires_resolution" : questions.length > 0 ? "needs_operator_input" : "ready_for_operator_review",
    placeholderScheduleAllowed,
    ...(placeholderScheduleAllowed ? { placeholderLabel: "Working schedule using placeholders - final names/services needed." } : {}),
    externalLinksIgnored,
    sourceMessageIds: messages.map((message) => message.id),
  };
}
