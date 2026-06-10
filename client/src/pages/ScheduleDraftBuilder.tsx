import { useState, useEffect, useMemo } from "react";
import { useRoute, useSearch, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, Trash2, Copy, X, Save, Eye, Printer } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type Column = { id: string; label: string; type: string };
type Row = { id: string; sortOrder: number; cells: Record<string, string> };
type ServiceDefault = { id: string; label: string; durationMinutes: number };
type ProviderCapability = "ALL" | "HAIR_ONLY" | "MAKEUP_ONLY";
type Provider = { id: string; name: string; capability?: ProviderCapability | ""; isPrimary?: boolean };
type ScheduleEngineMetadata = {
  venueAccessTime?: string;
  photographerArrivalTime?: string;
  readyByTime?: string;
  ceremonyTime?: string;
  firstLookTime?: string;
};
type AuditSeverity = "info" | "warning" | "critical";

type ScheduleAuditIssue = {
  id: string;
  severity: AuditSeverity;
  title: string;
  detail: string;
};

type AuditBlock = {
  id: string;
  name: string;
  service: string;
  provider: string;
  notes: string;
  text: string;
  start: number | null;
  end: number | null;
  duration: number | null;
};

const AUDIT_SEVERITY_LABELS: Record<AuditSeverity, string> = {
  info: "Info",
  warning: "Warning",
  critical: "Critical",
};

const AUDIT_SEVERITY_STYLES: Record<AuditSeverity, string> = {
  info: "border-ink/20 bg-bg text-ink/60",
  warning: "border-brass/40 bg-brass/10 text-ink",
  critical: "border-oxblood/40 bg-oxblood/10 text-oxblood",
};

const PROVIDER_CAPABILITY_LABELS: Record<ProviderCapability, string> = {
  ALL: "ALL",
  HAIR_ONLY: "HAIR_ONLY",
  MAKEUP_ONLY: "MAKEUP_ONLY",
};

const SCHEDULE_ENGINE_METADATA_FIELDS: Array<{
  id: keyof ScheduleEngineMetadata;
  label: string;
}> = [
  { id: "venueAccessTime", label: "Venue access" },
  { id: "photographerArrivalTime", label: "Photographer arrival" },
  { id: "readyByTime", label: "Ready by / hard stop" },
  { id: "ceremonyTime", label: "Ceremony" },
  { id: "firstLookTime", label: "First look" },
];

const VIOLET_SERVICE_DEFAULTS: ServiceDefault[] = [
  { id: "bride-hair-makeup", label: "Bride Hair + Makeup", durationMinutes: 120 },
  { id: "bride-makeup", label: "Bride Makeup", durationMinutes: 60 },
  { id: "bride-hair", label: "Bride Hair", durationMinutes: 45 },
  { id: "bridesmaid-makeup", label: "Bridesmaid Makeup", durationMinutes: 30 },
  { id: "bridesmaid-hair", label: "Bridesmaid Hair", durationMinutes: 45 },
  { id: "mother-makeup", label: "Mother Makeup", durationMinutes: 30 },
  { id: "mother-hair", label: "Mother Hair", durationMinutes: 45 },
  { id: "flower-girl", label: "Flower Girl", durationMinutes: 45 },
  { id: "touch-ups", label: "Touch-Ups", durationMinutes: 15 },
  { id: "setup", label: "Setup", durationMinutes: 15 },
];

const LEGACY_SERVICE_DEFAULTS: Record<string, number> = {
  makeup: 30,
  hair: 30,
  "hair + makeup": 60,
  "bride hair + makeup": 120,
};

interface Draft {
  id: string;
  title?: string | null;
  eventDate?: string | null;
  location?: string | null;
  notes?: string | null;
  columns?: Column[] | null;
  rows?: Row[] | null;
  serviceDefaults?: ServiceDefault[] | null;
  providers?: Provider[] | null;
  engineMetadata?: ScheduleEngineMetadata | null;
  status?: string | null;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

type QuickAddServiceKind = "makeup" | "hair" | "setup";
type QuickAddBlock = {
  name: string;
  service: string;
  kind: QuickAddServiceKind;
  provider: string;
  isBride?: boolean;
  durationOverride?: string;
};

function hasQuickAddWord(raw: string, pattern: RegExp): boolean {
  return pattern.test(raw);
}

function hasMakeupScope(raw: string): boolean {
  return hasQuickAddWord(raw, /\b(makeup|mua|mu)\b/i);
}

function hasHairScope(raw: string): boolean {
  return hasQuickAddWord(raw, /\b(hair|styling|style|curls?|waves?)\b/i);
}

function hasCombinedScope(raw: string): boolean {
  return hasQuickAddWord(raw, /\b(hair\s*(\+|and|&|\/)\s*makeup|makeup\s*(\+|and|&|\/)\s*hair|h\s*(\+|and|&|\/)?\s*m|hm)\b/i);
}

function isBrideToken(raw: string): boolean {
  return hasQuickAddWord(raw, /\bbride\b/i);
}

function isMotherToken(raw: string): boolean {
  return hasQuickAddWord(raw, /\b(mob|mog|mother|mother of bride|mother of groom)\b/i);
}

function isFlowerGirlToken(raw: string): boolean {
  return hasQuickAddWord(raw, /\bflower\s*girls?\b/i);
}

function isSetupToken(raw: string): boolean {
  return hasQuickAddWord(raw, /\b(setup|set up|station setup|stations setup)\b/i);
}

function explicitNameForService(raw: string): string | null {
  if (hasQuickAddWord(raw, /\bmob\b/i)) return "MOB";
  if (hasQuickAddWord(raw, /\bmog\b/i)) return "MOG";
  if (isBrideToken(raw)) return "Bride";
  if (isMotherToken(raw)) return "Mother";
  if (isFlowerGirlToken(raw)) return "Flower Girl";
  return null;
}

function quickAddBlockNameBase(service: string): string {
  if (service === "Bridesmaid Makeup") return "Makeup";
  if (service === "Bridesmaid Hair") return "Hair";
  return service;
}

// Decide how many provider lanes do makeup vs hair, proportional to how many
// blocks each kind has. When both kinds exist on a single artist, that one lane
// is "combined" (does both). Never leaves a needed kind without a lane.
function buildLanes(
  providerCount: number,
  makeupBlocks: number,
  hairBlocks: number,
): { makeupLanes: number; hairLanes: number; combined: boolean } {
  if (providerCount <= 0) return { makeupLanes: 0, hairLanes: 0, combined: false };
  const hasM = makeupBlocks > 0;
  const hasH = hairBlocks > 0;
  if (hasM && hasH) {
    if (providerCount === 1) return { makeupLanes: 0, hairLanes: 0, combined: true };
    let hairLanes = Math.round((hairBlocks / (makeupBlocks + hairBlocks)) * providerCount);
    hairLanes = Math.max(1, Math.min(hairLanes, providerCount - 1));
    return { makeupLanes: providerCount - hairLanes, hairLanes, combined: false };
  }
  if (hasM) return { makeupLanes: providerCount, hairLanes: 0, combined: false };
  if (hasH) return { makeupLanes: 0, hairLanes: providerCount, combined: false };
  return { makeupLanes: providerCount, hairLanes: 0, combined: false };
}

// Build a PROVIDER-LANE schedule, not flat person rows. The core model:
//   - artists/providers are lanes (the Provider column on each row)
//   - services are appointment blocks placed inside those lanes
//   - people are a NAME POOL the operator assigns into blocks later
// Handles "Bride, MOB, MOG, 5 bridesmaids, 8 makeup, 5 hair, 3 artists":
//   - 3 artists -> 3 provider lanes (split makeup vs hair by demand)
//   - 8 makeup / 5 hair -> service blocks, NOT extra people
//   - Bride present + services -> one special "Bride Hair + Makeup" block
//   - people stay a name pool (added to notes); only Bride is auto-placed
// Never throws. Service counts are never turned into people.
function buildScheduleFromInput(
  text: string,
  serviceDefaults: ServiceDefault[],
): {
  providers: Array<{ name: string }>;
  blocks: Array<{ name: string; service: string; provider: string; duration: string }>;
  personRows: Array<{ name: string }>;
  namePool: string[];
} {
  const durationFor = (label: string): string => {
    const sd = serviceDefaults.find((s) => s.label.toLowerCase() === label.toLowerCase());
    return sd ? String(sd.durationMinutes) : "";
  };

  let providerCount = 0;
  const setupDurationFor = () => (providerCount >= 3 ? "30" : durationFor("Setup") || "15");
  let brideAutoPlaced = false;
  const serviceBlocks: QuickAddBlock[] = [];
  const people: string[] = [];

  const serviceBlocksForToken = (raw: string, count: number): QuickAddBlock[] => {
    if (isSetupToken(raw)) {
      return Array.from({ length: count }, (_, i) => ({
        name: count === 1 ? "Setup" : `Setup ${i + 1}`,
        service: "Setup",
        kind: "setup",
        provider: "",
      }));
    }

    const combined = hasCombinedScope(raw) || (hasHairScope(raw) && hasMakeupScope(raw));
    const hasHair = combined || hasHairScope(raw);
    const hasMakeup = combined || hasMakeupScope(raw);
    const hasServiceScope = hasHair || hasMakeup;
    const explicitName = explicitNameForService(raw);
    const services: Array<{ service: string; kind: QuickAddServiceKind; isBride?: boolean }> = [];

    if (isBrideToken(raw)) {
      if (combined) services.push({ service: "Bride Hair + Makeup", kind: "makeup", isBride: true });
      else if (hasMakeup) services.push({ service: "Bride Makeup", kind: "makeup", isBride: true });
      else if (hasHair) services.push({ service: "Bride Hair", kind: "hair", isBride: true });
    } else if (isMotherToken(raw)) {
      if (combined) {
        services.push({ service: "Mother Makeup", kind: "makeup" }, { service: "Mother Hair", kind: "hair" });
      } else if (hasMakeup) services.push({ service: "Mother Makeup", kind: "makeup" });
      else if (hasHair) services.push({ service: "Mother Hair", kind: "hair" });
    } else if (isFlowerGirlToken(raw)) {
      services.push({ service: "Flower Girl", kind: hasMakeup && !hasHair ? "makeup" : "hair" });
    } else if (hasServiceScope) {
      if (combined) {
        services.push({ service: "Bridesmaid Makeup", kind: "makeup" }, { service: "Bridesmaid Hair", kind: "hair" });
      } else if (hasMakeup) services.push({ service: "Bridesmaid Makeup", kind: "makeup" });
      else if (hasHair) services.push({ service: "Bridesmaid Hair", kind: "hair" });
    }

    return services.flatMap((service) =>
      Array.from({ length: count }, (_, i) => {
        const base = explicitName ?? quickAddBlockNameBase(service.service);
        const shouldNumber = count > 1 || !explicitName;
        return {
          name: shouldNumber ? `${base} ${i + 1}` : base,
          service: service.service,
          kind: service.kind,
          provider: "",
          ...(service.isBride ? { isBride: true } : {}),
        };
      }),
    );
  };

  const tokens = text
    .split(/[,\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  for (const token of tokens) {
    // "3 artists" / "3 providers" / "3 stylists" -> a lane count, not people.
    const providerMatch = token.match(/^(\d+)\s*(artists?|providers?|stylists?)$/i);
    if (providerMatch) {
      providerCount += parseInt(providerMatch[1], 10);
      continue;
    }

    // "<n> <something>" -> either a service count (blocks) or a named group.
    const countMatch = token.match(/^(\d+)\s+(.+)$/);
    if (countMatch) {
      const n = Math.min(parseInt(countMatch[1], 10), 100);
      const rest = countMatch[2].trim();
      const blocks = serviceBlocksForToken(rest, n);
      if (blocks.length > 0) {
        serviceBlocks.push(...blocks);
      } else {
        // group name like "bridesmaids" -> "Bridesmaid 1".."Bridesmaid n" (people)
        const singular = rest.replace(/s$/i, "");
        const labelBase = singular.charAt(0).toUpperCase() + singular.slice(1);
        for (let i = 0; i < n; i++) people.push(`${labelBase} ${i + 1}`);
      }
      continue;
    }

    // Plain token: either an explicit service ("MOB makeup") or a person/name.
    const blocks = serviceBlocksForToken(token, 1);
    if (blocks.length > 0) {
      serviceBlocks.push(...blocks);
    } else {
      people.push(token);
    }
  }

  const hasBride = people.some((p) => /^bride$/i.test(p.trim()));

  const removeServiceBlock = (service: string): boolean => {
    const index = serviceBlocks.findIndex((block) => block.service === service && !block.isBride);
    if (index === -1) return false;
    serviceBlocks.splice(index, 1);
    return true;
  };
  const renumberGeneratedBlocks = (service: string, base: string) => {
    let index = 1;
    for (const block of serviceBlocks) {
      if (block.service === service && new RegExp(`^${base} \\d+$`).test(block.name)) {
        block.name = `${base} ${index++}`;
      }
    }
  };

  // Bride present + generic hair/makeup demand becomes the correct Violet bride
  // service. It consumes the matching generic service slots so counts stay honest.
  if (hasBride && !serviceBlocks.some((block) => block.isBride)) {
    const hasGenericMakeup = serviceBlocks.some((block) => block.service === "Bridesmaid Makeup");
    const hasGenericHair = serviceBlocks.some((block) => block.service === "Bridesmaid Hair");
    if (hasGenericMakeup && hasGenericHair) {
      removeServiceBlock("Bridesmaid Makeup");
      removeServiceBlock("Bridesmaid Hair");
      serviceBlocks.unshift({ name: "Bride", service: "Bride Hair + Makeup", kind: "makeup", provider: "", isBride: true });
      brideAutoPlaced = true;
    } else if (hasGenericMakeup) {
      removeServiceBlock("Bridesmaid Makeup");
      serviceBlocks.unshift({ name: "Bride", service: "Bride Makeup", kind: "makeup", provider: "", isBride: true });
      brideAutoPlaced = true;
    } else if (hasGenericHair) {
      removeServiceBlock("Bridesmaid Hair");
      serviceBlocks.unshift({ name: "Bride", service: "Bride Hair", kind: "hair", provider: "", isBride: true });
      brideAutoPlaced = true;
    }
    renumberGeneratedBlocks("Bridesmaid Makeup", "Makeup");
    renumberGeneratedBlocks("Bridesmaid Hair", "Hair");
  }

  if (serviceBlocks.some((block) => block.isBride)) {
    brideAutoPlaced = true;
  }

  if (serviceBlocks.length > 0 && !serviceBlocks.some((block) => block.service === "Setup")) {
    serviceBlocks.unshift({ name: "Setup", service: "Setup", kind: "setup", provider: "", durationOverride: setupDurationFor() });
  }

  // No services at all -> just a roster of people (names in the Name column).
  if (serviceBlocks.length === 0) {
    const provs: Array<{ name: string }> = [];
    for (let i = 0; i < providerCount; i++) provs.push({ name: `Artist ${i + 1}` });
    return {
      providers: provs,
      blocks: [],
      personRows: people.map((name) => ({ name })),
      namePool: [],
    };
  }

  const setupGroup = serviceBlocks.filter((block) => block.kind === "setup");
  const makeupGroup = serviceBlocks.filter((block) => block.kind === "makeup");
  const hairGroup = serviceBlocks.filter((block) => block.kind === "hair");

  // Create lane records, makeup lanes first then hair lanes (Artist 1..N).
  type Lane = { role: "makeup" | "hair" | "both"; artistNum: number; holdsBride: boolean };
  const { makeupLanes, hairLanes, combined } = buildLanes(providerCount, makeupGroup.length, hairGroup.length);
  const laneRecords: Lane[] = [];
  const makeupTargets: Lane[] = [];
  const hairTargets: Lane[] = [];
  let artistNum = 1;
  if (providerCount > 0) {
    if (combined) {
      const rec: Lane = { role: "both", artistNum: artistNum++, holdsBride: false };
      laneRecords.push(rec);
      makeupTargets.push(rec);
      hairTargets.push(rec);
    } else {
      for (let i = 0; i < makeupLanes; i++) {
        const rec: Lane = { role: "makeup", artistNum: artistNum++, holdsBride: false };
        laneRecords.push(rec);
        makeupTargets.push(rec);
      }
      for (let i = 0; i < hairLanes; i++) {
        const rec: Lane = { role: "hair", artistNum: artistNum++, holdsBride: false };
        laneRecords.push(rec);
        hairTargets.push(rec);
      }
    }
  }

  const laneLabel = (rec: Lane): string => {
    let svc: string;
    if (rec.role === "both") svc = rec.holdsBride ? "Makeup / Hair / Bride" : "Makeup / Hair";
    else if (rec.role === "makeup") svc = rec.holdsBride ? "Makeup / Bride" : "Makeup";
    else svc = "Hair";
    return `Artist ${rec.artistNum} - ${svc}`;
  };

  // Distribute blocks across their lanes round-robin (balanced). The lane that
  // gets the bride block is flagged so its label reads "/ Bride".
  const blockLane = new Map<QuickAddBlock, Lane>();
  makeupGroup.forEach((b, k) => {
    if (makeupTargets.length === 0) return;
    const lane = makeupTargets[k % makeupTargets.length];
    blockLane.set(b, lane);
    if (b.isBride) lane.holdsBride = true;
  });
  hairGroup.forEach((b, k) => {
    if (hairTargets.length === 0) return;
    blockLane.set(b, hairTargets[k % hairTargets.length]);
  });

  setupGroup.forEach((b) => {
    if (laneRecords.length > 0) blockLane.set(b, laneRecords[0]);
  });

  const providers = laneRecords.map((rec) => ({ name: laneLabel(rec) }));
  const blocks = [...setupGroup, ...makeupGroup, ...hairGroup].map((b) => {
    const lane = blockLane.get(b);
    return {
      name: b.name,
      service: b.service,
      provider: lane ? laneLabel(lane) : "",
      duration: b.durationOverride ?? (b.service === "Setup" ? setupDurationFor() : durationFor(b.service)),
    };
  });
  // Bride is auto-placed into her block, so drop her from the editable pool to
  // avoid a duplicate assignment. The rest stay as the name pool.
  const poolPeople = brideAutoPlaced ? people.filter((p) => !/^bride$/i.test(p.trim())) : people;

  return { providers, blocks, personRows: [], namePool: poolPeople };
}

// Parse a start time into minutes-since-midnight. Tolerant of common formats:
// "9", "9am", "9:00", "9:00 AM", "14:00". Returns null if it cannot parse.
function parseClockTime(raw: string): number | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let hours = parseInt(m[1], 10);
  const minutes = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = m[3];
  if (minutes > 59) return null;
  if (ampm) {
    if (hours < 1 || hours > 12) return null;
    if (ampm === "pm" && hours !== 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;
  } else {
    if (hours > 23) return null;
  }
  return hours * 60 + minutes;
}

// Parse a duration into minutes. Tolerant: "30", "45", "30 min", "1 hour",
// "2 hours", "1 hour 30 min". Returns null if it cannot parse.
function parseDurationMinutes(raw: string): number | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  let total = 0;
  let matched = false;
  const h = s.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\b/);
  if (h) {
    total += parseFloat(h[1]) * 60;
    matched = true;
  }
  const mm = s.match(/(\d+)\s*(m|min|mins|minute|minutes)\b/);
  if (mm) {
    total += parseInt(mm[1], 10);
    matched = true;
  }
  return matched ? Math.round(total) : null;
}

// Format minutes-since-midnight back into a readable "9:30 AM". Wraps past
// midnight so a late start + long duration still shows a valid clock time.
function formatClockTime(totalMinutes: number): string {
  const mins = ((totalMinutes % 1440) + 1440) % 1440;
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

// Canonical serialization of the editable schedule state. Used to detect unsaved
// changes by comparing the current form against the last-saved snapshot. Rows are
// normalized with their index as sortOrder so it matches what Save sends.
function serializeScheduleState(s: {
  title: string;
  eventDate: string;
  location: string;
  notes: string;
  columns: Column[];
  rows: Row[];
  serviceDefaults: ServiceDefault[];
  providers: Provider[];
  engineMetadata: ScheduleEngineMetadata;
}): string {
  return JSON.stringify({
    title: s.title,
    eventDate: s.eventDate,
    location: s.location,
    notes: s.notes,
    columns: s.columns,
    rows: s.rows.map((r, i) => ({ ...r, sortOrder: i })),
    serviceDefaults: s.serviceDefaults,
    providers: s.providers,
    engineMetadata: s.engineMetadata,
  });
}

// A name "looks like a placeholder" if it is one or more words followed by a
// trailing number, e.g. "Guest 1", "Bridesmaid 2", "Artist 1", "Person 1",
// "Client 1", "Flower Girl 1". Real names ("Jane Doe") have no trailing number,
// so they style normally. Purely a visual cue, never blocks saving.
function isPlaceholderName(value: string): boolean {
  return /^[A-Za-z][A-Za-z .'+/&-]*\s+\d+$/.test(value.trim());
}

// The "People to assign" pool is persisted inside the notes string as one
// delimited line (no schema change). These helpers read/write that line so the
// pool can be surfaced as its own section while the rest of the notes stay clean.
const POOL_PREFIX = "People to assign:";
const POOL_LINE_RE = /^[ \t]*People to assign:[ \t]*(.*)$/im;

function parsePeoplePool(notes: string): string[] {
  const m = notes.match(POOL_LINE_RE);
  return m ? m[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
}

function stripPeoplePool(notes: string): string {
  return notes.replace(POOL_LINE_RE, "").replace(/\n{3,}/g, "\n\n").trim();
}

function composeNotes(body: string, names: string[]): string {
  const clean = stripPeoplePool(body);
  const line = names.length > 0 ? `${POOL_PREFIX} ${names.join(", ")}` : "";
  return [clean, line].filter(Boolean).join("\n\n");
}

function normalizeProviderCapability(value: unknown): ProviderCapability | undefined {
  return value === "ALL" || value === "HAIR_ONLY" || value === "MAKEUP_ONLY" ? value : undefined;
}

function normalizeProviders(providers?: Provider[] | null): Provider[] {
  return (providers ?? []).map((provider) => {
    const capability = normalizeProviderCapability(provider.capability);
    return {
      id: provider.id,
      name: provider.name,
      ...(capability ? { capability } : {}),
      ...(provider.isPrimary ? { isPrimary: true } : {}),
    };
  });
}

function normalizeScheduleEngineMetadata(metadata?: ScheduleEngineMetadata | null): ScheduleEngineMetadata {
  return {
    venueAccessTime: metadata?.venueAccessTime ?? "",
    photographerArrivalTime: metadata?.photographerArrivalTime ?? "",
    readyByTime: metadata?.readyByTime ?? "",
    ceremonyTime: metadata?.ceremonyTime ?? "",
    firstLookTime: metadata?.firstLookTime ?? "",
  };
}

function violetServiceDefaults(): ServiceDefault[] {
  return VIOLET_SERVICE_DEFAULTS.map((service) => ({ ...service }));
}

function usesLegacyServiceDefaults(defaults: ServiceDefault[]): boolean {
  const legacyLabels = Object.keys(LEGACY_SERVICE_DEFAULTS);
  if (defaults.length === 0 || defaults.length > legacyLabels.length) {
    return false;
  }

  return defaults.every((service) => {
    const label = service.label.trim().toLowerCase();
    return LEGACY_SERVICE_DEFAULTS[label] === service.durationMinutes;
  });
}

function normalizeServiceDefaults(defaults?: ServiceDefault[] | null): ServiceDefault[] {
  const current = defaults ?? [];
  if (current.length === 0 || usesLegacyServiceDefaults(current)) {
    return violetServiceDefaults();
  }
  return current;
}

function auditText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function auditId(value: string): string {
  return auditText(value).replace(/\s+/g, "-") || "item";
}

function hasAuditWord(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

function auditHasHairService(text: string): boolean {
  return hasAuditWord(text, /\bhair\b|\bupdo\b|\bstyling\b|\bstyle\b|\bh\b/);
}

function auditHasMakeupService(text: string): boolean {
  return hasAuditWord(text, /\bmakeup\b|\bmua\b|\bmu\b|\bm\b/);
}

function auditNameKey(value: string): string {
  return auditText(value)
    .replace(/\b(bride|bridal|bridesmaid|maid of honor|moh|mother|mob|mog|flower girl)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function auditBlockLabel(block: AuditBlock): string {
  return [block.name, block.service].filter(Boolean).join(" / ") || "Unnamed block";
}

function intervalsOverlap(a: AuditBlock, b: AuditBlock): boolean {
  return a.start !== null && a.end !== null && b.start !== null && b.end !== null && a.start < b.end && b.start < a.end;
}

function hasShortSimpleLabel(text: string): boolean {
  return hasAuditWord(text, /\b(short|simple|quick|soft|light|easy)\b/);
}

function isSetupBlock(block: AuditBlock): boolean {
  return hasAuditWord(block.text, /\b(setup|set up|station setup|stations)\b/);
}

function isServiceBlock(block: AuditBlock): boolean {
  return Boolean(block.service || block.name) && !isSetupBlock(block);
}

function auditBlocksFromRows(rows: Row[], providerColId: string): AuditBlock[] {
  return rows.map((row) => {
    const cells = row.cells ?? {};
    const start = parseClockTime(cells.start ?? "");
    const duration = parseDurationMinutes(cells.duration ?? "");
    const explicitEnd = parseClockTime(cells.end ?? "");
    const end = explicitEnd ?? (start !== null && duration !== null ? start + duration : null);
    const name = (cells.name ?? "").trim();
    const service = (cells.service ?? "").trim();
    const provider = (cells[providerColId] ?? "").trim();
    const notes = (cells.notes ?? "").trim();
    return {
      id: row.id,
      name,
      service,
      provider,
      notes,
      text: auditText(Object.values(cells).join(" ")),
      start,
      end,
      duration,
    };
  });
}

function addDurationIssue(
  issues: ScheduleAuditIssue[],
  block: AuditBlock,
  min: number,
  title: string,
  severity: AuditSeverity = "warning",
) {
  if (block.duration !== null && block.duration < min) {
    issues.push({
      id: `duration-${block.id}-${min}`,
      severity,
      title,
      detail: `${auditBlockLabel(block)} is ${block.duration} min; Violet's rule expects at least ${min} min.`,
    });
  }
}

function buildScheduleAudit(input: {
  title: string;
  notes: string;
  rows: Row[];
  providers: Provider[];
  providerColId: string;
  engineMetadata: ScheduleEngineMetadata;
}): ScheduleAuditIssue[] {
  const issues: ScheduleAuditIssue[] = [];
  const blocks = auditBlocksFromRows(input.rows, input.providerColId);
  const providerNames = new Set<string>();
  const providersByName = new Map<string, Provider>();
  const primaryProviderNames: string[] = [];
  for (const provider of input.providers) {
    const name = provider.name.trim();
    if (name) {
      providerNames.add(name);
      providersByName.set(name, provider);
      if (provider.isPrimary) primaryProviderNames.push(name);
    }
  }
  for (const block of blocks) {
    if (block.provider) providerNames.add(block.provider);
  }
  const providerCount = providerNames.size;
  const missingCapabilityWarnings = new Set<string>();
  const addMissingCapabilityWarning = (providerName: string) => {
    if (!providerName || missingCapabilityWarnings.has(providerName)) return;
    missingCapabilityWarnings.add(providerName);
    const knownProvider = providersByName.has(providerName);
    issues.push({
      id: `provider-capability-missing-${auditId(providerName)}`,
      severity: "warning",
      title: "Provider capability missing",
      detail: knownProvider
        ? `${providerName} has no capability selected. Choose ALL, HAIR_ONLY, or MAKEUP_ONLY.`
        : `${providerName} is used on the schedule but is not in the provider list with a capability.`,
    });
  };

  for (const [providerName, provider] of providersByName) {
    if (!normalizeProviderCapability(provider.capability)) {
      addMissingCapabilityWarning(providerName);
    }
  }

  if (primaryProviderNames.length > 1) {
    issues.push({
      id: "multiple-primary-providers",
      severity: "info",
      title: "Multiple primary providers",
      detail: `${primaryProviderNames.join(", ")} are marked primary.`,
    });
  }

  for (const block of blocks) {
    const text = auditText([block.name, block.service, block.notes].join(" ")) || block.text;
    const isBride = hasAuditWord(text, /\bbride\b|\bbridal\b/);
    const isBridesmaid = hasAuditWord(text, /\bbridesmaid\b|\bmaid of honor\b|\bmoh\b|\battendant\b/);
    const isMother = hasAuditWord(text, /\bmother\b|\bmob\b|\bmog\b|mother of bride|mother of groom/);
    const hasHair = auditHasHairService(text);
    const hasMakeup = auditHasMakeupService(text);

    if (isServiceBlock(block) && block.provider) {
      const provider = providersByName.get(block.provider);
      const capability = normalizeProviderCapability(provider?.capability);
      if (!capability) {
        addMissingCapabilityWarning(block.provider);
      } else {
        if (hasHair && capability === "MAKEUP_ONLY") {
          issues.push({
            id: `provider-capability-hair-${block.id}`,
            severity: "critical",
            title: "Hair service assigned to makeup-only provider",
            detail: `${block.provider} is MAKEUP_ONLY, but ${auditBlockLabel(block)} includes hair.`,
          });
        }
        if (hasMakeup && capability === "HAIR_ONLY") {
          issues.push({
            id: `provider-capability-makeup-${block.id}`,
            severity: "critical",
            title: "Makeup service assigned to hair-only provider",
            detail: `${block.provider} is HAIR_ONLY, but ${auditBlockLabel(block)} includes makeup.`,
          });
        }
      }

      if (isBride && !provider?.isPrimary) {
        issues.push({
          id: `bride-non-primary-${block.id}`,
          severity: "warning",
          title: "Bride is not assigned to a primary provider",
          detail: `${auditBlockLabel(block)} is assigned to ${block.provider}, which is not marked primary.`,
        });
      }
    }

    if (isBride && hasHair && hasMakeup) {
      addDurationIssue(issues, block, 120, "Bride hair + makeup is under 120 minutes", "critical");
    } else if (isBride && hasMakeup) {
      addDurationIssue(issues, block, 60, "Bride makeup-only block is under 60 minutes", "critical");
    } else if (isBride && hasHair) {
      const min = hasShortSimpleLabel(text) ? 35 : 45;
      addDurationIssue(issues, block, min, "Bride hair-only block is under the expected duration", min === 35 ? "warning" : "critical");
    } else {
      if (isMother && hasMakeup) {
        addDurationIssue(issues, block, 30, "Mother makeup block is under 30 minutes");
      }
      if (isMother && hasHair) {
        const min = hasShortSimpleLabel(text) ? 30 : 45;
        addDurationIssue(issues, block, min, "Mother hair block is under the expected duration");
      }
      if (isBridesmaid && hasMakeup) {
        addDurationIssue(issues, block, 30, "Bridesmaid makeup block is under 30 minutes");
      }
      if (isBridesmaid && hasHair) {
        addDurationIssue(issues, block, 45, "Bridesmaid hair block is under 45 minutes");
      }
    }
  }

  const setupBlocks = blocks.filter(isSetupBlock);
  const setupMin = providerCount >= 3 ? 30 : 15;
  if (setupBlocks.length === 0) {
    issues.push({
      id: "missing-setup",
      severity: "warning",
      title: "No setup block found",
      detail: providerCount >= 3 ? "Schedules with 3+ provider stations should show a 30-minute setup buffer." : "Add a 15-minute setup buffer before services begin.",
    });
  } else {
    for (const block of setupBlocks) {
      if (block.duration === null) {
        issues.push({
          id: `setup-duration-${block.id}`,
          severity: "warning",
          title: "Setup block has no duration",
          detail: `Setup should show at least ${setupMin} minutes for this provider count.`,
        });
      } else {
        addDurationIssue(issues, block, setupMin, "Setup block is shorter than Violet's setup rule");
      }
    }
  }

  const timedBlocks = blocks.filter((block) => block.start !== null && block.end !== null);
  for (let i = 0; i < timedBlocks.length; i++) {
    for (let j = i + 1; j < timedBlocks.length; j++) {
      const a = timedBlocks[i];
      const b = timedBlocks[j];
      if (!intervalsOverlap(a, b)) continue;

      const sameProvider = a.provider && b.provider && a.provider === b.provider;
      if (sameProvider) {
        issues.push({
          id: `provider-overlap-${a.id}-${b.id}`,
          severity: "critical",
          title: "Provider has overlapping blocks",
          detail: `${a.provider} is assigned to both ${auditBlockLabel(a)} and ${auditBlockLabel(b)} at overlapping times.`,
        });
      }

      const aName = auditNameKey(a.name);
      const bName = auditNameKey(b.name);
      if (aName && bName && aName === bName && a.provider !== b.provider) {
        issues.push({
          id: `client-overlap-${a.id}-${b.id}`,
          severity: "critical",
          title: "Client is double-booked across providers",
          detail: `${a.name} appears in overlapping blocks for ${a.provider || "one provider"} and ${b.provider || "another provider"}.`,
        });
      }
    }
  }

  for (const provider of providerNames) {
    const laneBlocks = timedBlocks
      .filter((block) => block.provider === provider && isServiceBlock(block))
      .sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
    let chain = 1;
    for (let i = 1; i < laneBlocks.length; i++) {
      if (laneBlocks[i - 1].end === laneBlocks[i].start) {
        chain += 1;
        if (chain === 3) {
          issues.push({
            id: `zero-buffer-${auditId(provider)}`,
            severity: "warning",
            title: "0-buffer cascade",
            detail: `${provider} has 3+ service blocks back-to-back with no visible buffer.`,
          });
          break;
        }
      } else {
        chain = 1;
      }
    }
  }

  const hasEngineTimingContext = [
    input.engineMetadata.venueAccessTime,
    input.engineMetadata.photographerArrivalTime,
    input.engineMetadata.readyByTime,
    input.engineMetadata.ceremonyTime,
    input.engineMetadata.firstLookTime,
  ].some((value) => Boolean(value?.trim()));
  const contextText = auditText([
    input.title,
    input.notes,
    ...input.rows.flatMap((row) => Object.values(row.cells ?? {})),
  ].join(" "));
  if (!hasEngineTimingContext && !hasAuditWord(contextText, /\b(hard stop|ready by|ready-by|photographer|photo time|first look|ceremony|dress|dressing)\b/)) {
    issues.push({
      id: "missing-hard-stop-context",
      severity: "info",
      title: "No hard-stop context found",
      detail: "Add ready-by, photographer, ceremony, first-look, or venue timing so the schedule can be checked backward.",
    });
  }

  return issues;
}

export default function ScheduleDraftBuilder() {
  const [, params] = useRoute("/admin/:slug/schedules/:scheduleId");
  const slug = params?.slug ?? "";
  const scheduleId = params?.scheduleId ?? "";
  const searchString = useSearch();
  const authParam = searchString ? `?${searchString}` : "";
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [serviceDefaults, setServiceDefaults] = useState<ServiceDefault[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [engineMetadata, setEngineMetadata] = useState<ScheduleEngineMetadata>(normalizeScheduleEngineMetadata());
  const [pasteText, setPasteText] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = `/artist-login?redirect=${encodeURIComponent(`/admin/${slug}/schedules/${scheduleId}`)}`;
    }
  }, [authLoading, isAuthenticated, slug, scheduleId]);

  const draftQuery = useQuery<Draft>({
    queryKey: ["/api/schedule-drafts", scheduleId],
    queryFn: async () => {
      const res = await fetch(`/api/schedule-drafts/${scheduleId}`, { credentials: "include" });
      if (res.status === 401) throw new Error("401");
      if (res.status === 403) throw new Error("403");
      if (res.status === 404) throw new Error("404");
      if (!res.ok) throw new Error("Failed to load schedule");
      return res.json();
    },
    enabled: !!scheduleId && isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    const d = draftQuery.data;
    if (d && !loaded) {
      const sortedRows = [...(d.rows ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      const normalizedDefaults = normalizeServiceDefaults(d.serviceDefaults);
      const normalizedProviders = normalizeProviders(d.providers);
      const normalizedEngineMetadata = normalizeScheduleEngineMetadata(d.engineMetadata);
      setTitle(d.title ?? "");
      setEventDate(d.eventDate ?? "");
      setLocation(d.location ?? "");
      setNotes(d.notes ?? "");
      setColumns(d.columns ?? []);
      setRows(sortedRows);
      setServiceDefaults(normalizedDefaults);
      setProviders(normalizedProviders);
      setEngineMetadata(normalizedEngineMetadata);
      // Capture the baseline so we can detect unsaved edits from here on.
      setSavedSnapshot(
        serializeScheduleState({
          title: d.title ?? "",
          eventDate: d.eventDate ?? "",
          location: d.location ?? "",
          notes: d.notes ?? "",
          columns: d.columns ?? [],
          rows: sortedRows,
          serviceDefaults: normalizedDefaults,
          providers: normalizedProviders,
          engineMetadata: normalizedEngineMetadata,
        }),
      );
      setLoaded(true);
    }
  }, [draftQuery.data, loaded]);

  // Current editable state, serialized. Compared against savedSnapshot for dirty.
  const currentSnapshot = useMemo(
    () => serializeScheduleState({ title, eventDate, location, notes, columns, rows, serviceDefaults, providers, engineMetadata }),
    [title, eventDate, location, notes, columns, rows, serviceDefaults, providers, engineMetadata],
  );

  const isDirty = loaded && savedSnapshot !== null && currentSnapshot !== savedSnapshot;

  // Warn on browser refresh / tab close / external navigation while there are
  // unsaved edits. The browser shows its own generic confirmation dialog.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Confirm before following an in-app link while there are unsaved edits.
  const confirmLeaveIfDirty = (e: React.MouseEvent) => {
    if (isDirty && !window.confirm("You have unsaved changes. Leave without saving?")) {
      e.preventDefault();
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        eventDate,
        location,
        notes,
        columns,
        rows: rows.map((r, i) => ({ ...r, sortOrder: i })),
        serviceDefaults,
        providers,
        engineMetadata,
      };
      // Snapshot exactly what we are sending so the dirty baseline matches.
      const snapshot = serializeScheduleState({ title, eventDate, location, notes, columns, rows, serviceDefaults, providers, engineMetadata });
      const res = await fetch(`/api/schedule-drafts/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      const data = await res.json();
      return { data, snapshot };
    },
    onSuccess: ({ snapshot }) => {
      setSavedSnapshot(snapshot);
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-drafts", scheduleId] });
      toast({ title: "Schedule saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Could not save", description: err.message, variant: "destructive" });
    },
  });

  // --- Table editing helpers ---
  const emptyCells = useMemo(() => {
    const c: Record<string, string> = {};
    for (const col of columns) c[col.id] = "";
    return c;
  }, [columns]);

  const deleteRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  // Insert a copy of a row immediately below it. Keeps the same cell values
  // (including Name) so the operator can tweak the copy. New id, fresh sortOrder.
  const duplicateRow = (id: string) => {
    setRows((prev) => {
      const index = prev.findIndex((r) => r.id === id);
      if (index === -1) return prev;
      const copy: Row = { id: uid("row"), sortOrder: index + 1, cells: { ...prev[index].cells } };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  const hasEndColumn = useMemo(() => columns.some((c) => c.id === "end"), [columns]);

  const setCell = (rowId: string, colId: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const cells = { ...r.cells, [colId]: value };
        // Auto-fill End from Start + Duration. Only when Start or Duration was the
        // edited field, both parse cleanly, and an End column exists. If parsing
        // fails we leave End untouched (no error, no blocking). End stays editable.
        if ((colId === "start" || colId === "duration") && hasEndColumn) {
          const startMin = parseClockTime(cells["start"] ?? "");
          const durMin = parseDurationMinutes(cells["duration"] ?? "");
          if (startMin !== null && durMin !== null) {
            cells["end"] = formatClockTime(startMin + durMin);
          }
        }
        return { ...r, cells };
      }),
    );
  };

  // Provider column id used to group rows (blocks) into provider lanes.
  const providerColId = columns.find((c) => c.type === "provider")?.id ?? "provider";

  // Name pool ("People to assign") lives inside notes as one delimited line so
  // no schema changes are needed. Parse it out for its own section and keep the
  // rest of the notes clean in the Notes box.
  const peopleToAssign = parsePeoplePool(notes);
  const notesBody = stripPeoplePool(notes);
  const setNotesBody = (body: string) => setNotes(composeNotes(body, peopleToAssign));
  const setPeopleToAssign = (names: string[]) => setNotes(composeNotes(notesBody, names));

  // Add an empty block already assigned to a given lane (provider value).
  const addBlock = (providerName: string) =>
    setRows((prev) => [
      ...prev,
      { id: uid("row"), sortOrder: prev.length, cells: { ...emptyCells, [providerColId]: providerName } },
    ]);

  // Assign a person from the "People to assign" pool into a block's Name field.
  // Replaces any existing name, keeps the block editable, and removes that person
  // from the pool. Operator-driven only, never automatic.
  const assignPerson = (rowId: string, name: string) => {
    if (!name) return;
    setCell(rowId, "name", name);
    setPeopleToAssign(peopleToAssign.filter((n) => n !== name));
  };

  const applyPaste = () => {
    const built = buildScheduleFromInput(pasteText, serviceDefaults);
    const { providers: laneDefs, blocks, personRows, namePool } = built;
    if (laneDefs.length === 0 && blocks.length === 0 && personRows.length === 0) {
      toast({ title: "Nothing to add", description: "Try something like: Bride, 8 makeup, 5 hair, 3 artists" });
      return;
    }
    // Provider lanes (Artist 1 - Makeup, Artist 2 - Hair, etc.).
    if (laneDefs.length > 0) {
      const newProviders: Provider[] = laneDefs.map((l) => ({ id: uid("prov"), name: l.name }));
      setProviders((prev) => [...prev, ...newProviders]);
    }
    // Rows are service blocks placed in lanes; if there were no services, fall
    // back to a plain roster of people in the Name column.
    const source =
      blocks.length > 0
        ? blocks
        : personRows.map((p) => ({ name: p.name, service: "", provider: "", duration: "" }));
    if (source.length > 0) {
      const baseLen = rows.length;
      const newRows: Row[] = source.map((b, i) => {
        const cells: Record<string, string> = { ...emptyCells };
        cells["name"] = b.name;
        cells["service"] = b.service;
        cells["provider"] = b.provider;
        cells["duration"] = b.duration;
        return { id: uid("row"), sortOrder: baseLen + i, cells };
      });
      setRows((prev) => [...prev, ...newRows]);
    }
    // Keep the people as an editable name pool the operator assigns into blocks.
    // Persisted inside notes as one delimited line (no schema change) and shown
    // as the "People to assign" section. Merge with any existing pool, dedupe.
    if (namePool.length > 0) {
      setNotes((prev) => {
        const merged = [...parsePeoplePool(prev)];
        for (const n of namePool) if (!merged.includes(n)) merged.push(n);
        return composeNotes(prev, merged);
      });
    }
    setPasteText("");
    toast({ title: "Schedule drafted", description: "Edit lanes, blocks, names, and times as needed." });
  };

  // Service defaults editing
  const addServiceDefault = () =>
    setServiceDefaults((prev) => [...prev, { id: uid("svc"), label: "Custom service", durationMinutes: 30 }]);
  const updateServiceDefault = (id: string, patch: Partial<ServiceDefault>) =>
    setServiceDefaults((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const deleteServiceDefault = (id: string) =>
    setServiceDefaults((prev) => prev.filter((s) => s.id !== id));

  // Providers editing
  const addProvider = () =>
    setProviders((prev) => [...prev, { id: uid("prov"), name: `Artist ${prev.length + 1}`, capability: "", isPrimary: false }]);
  const updateProvider = (id: string, patch: Partial<Provider>) =>
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const deleteProvider = (id: string) => setProviders((prev) => prev.filter((p) => p.id !== id));

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-bg text-ink flex items-center justify-center px-6">
        <div className="flex items-center gap-2 text-ink/60" data-testid="status-auth-loading">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading
        </div>
      </div>
    );
  }

  const errMsg = (draftQuery.error as Error)?.message;
  if (errMsg === "403" || errMsg === "404" || errMsg === "401") {
    return (
      <div className="min-h-screen bg-bg text-ink flex items-center justify-center px-6">
        <div className="max-w-md text-center" data-testid="text-not-available">
          <h1 className="font-serif text-2xl tracking-tight mb-3">Schedule not available</h1>
          <p className="text-ink/70 mb-6">This schedule does not exist or is not one of yours.</p>
          <Link href={`/admin/${slug}/rolodex${authParam}`} className="underline text-ink" data-testid="link-back-rolodex">
            Back to Rolodex
          </Link>
        </div>
      </div>
    );
  }

  // Group rows into provider lanes. Order: providers list first, then any extra
  // provider values seen on rows, then an "Unassigned" lane for blocks with no
  // provider. Fields shown per block are all columns except the provider column
  // (the provider is the lane itself, edited via the block's Lane field).
  const laneFields = columns.filter((c) => c.id !== providerColId);
  const laneSlug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "lane";
  const laneNames: string[] = [];
  const laneSeen = new Set<string>();
  for (const p of providers) {
    const n = p.name.trim();
    if (n && !laneSeen.has(n)) {
      laneNames.push(n);
      laneSeen.add(n);
    }
  }
  for (const r of rows) {
    const v = (r.cells[providerColId] ?? "").trim();
    if (v && !laneSeen.has(v)) {
      laneNames.push(v);
      laneSeen.add(v);
    }
  }
  const laneList = laneNames.map((name) => ({
    key: laneSlug(name),
    label: name,
    provider: name,
    rows: rows.filter((r) => (r.cells[providerColId] ?? "").trim() === name),
  }));
  const unassignedRows = rows.filter((r) => !(r.cells[providerColId] ?? "").trim());
  if (unassignedRows.length > 0) {
    laneList.push({ key: "unassigned", label: "Unassigned", provider: "", rows: unassignedRows });
  }
  const auditIssues = buildScheduleAudit({ title, notes, rows, providers, providerColId, engineMetadata });

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="max-w-[1100px] mx-auto px-6 sm:px-10 py-10">
        <Link
          href={`/admin/${slug}/rolodex${authParam}`}
          onClick={confirmLeaveIfDirty}
          className="inline-flex items-center gap-2 text-sm text-ink/70 hover:text-ink mb-6"
          data-testid="link-back-rolodex"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Rolodex
        </Link>

        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl tracking-tight mb-2" data-testid="text-page-title">
              Schedule builder
            </h1>
            <p className="text-ink/70 max-w-[70ch]">
              Plan the day as editable provider lanes, like a document. Nothing is sent and
              there is no client link. Add blocks, edit names and times, and save when ready.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreview(true)}
                className="inline-flex items-center gap-2 border border-hairline px-4 py-2 hover:bg-surface"
                data-testid="button-preview"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-2 bg-ink text-bg px-4 py-2 disabled:opacity-60"
                data-testid="button-save"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save draft
              </button>
            </div>
            {isDirty ? (
              <span className="text-xs text-oxblood" data-testid="status-unsaved">
                Unsaved changes
              </span>
            ) : (
              <span className="text-xs text-ink/45" data-testid="status-saved">
                All changes saved
              </span>
            )}
          </div>
        </header>

        {draftQuery.isLoading && (
          <div className="flex items-center gap-2 text-ink/60" data-testid="status-loading">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading
          </div>
        )}

        {loaded && (
          <div className="space-y-10">
            {/* Schedule meta */}
            <section className="border border-hairline bg-surface p-6 sm:p-8" data-testid="section-meta">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <label className="block">
                  <span className="text-xs uppercase tracking-wide text-ink/50">Title</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 w-full border border-hairline bg-bg px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                    data-testid="input-title"
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-wide text-ink/50">Event date</span>
                  <input
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    placeholder="e.g. Saturday, June 14"
                    className="mt-1 w-full border border-hairline bg-bg px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                    data-testid="input-event-date"
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-wide text-ink/50">Location</span>
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Getting-ready location, venue"
                    className="mt-1 w-full border border-hairline bg-bg px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                    data-testid="input-location"
                  />
                </label>
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {SCHEDULE_ENGINE_METADATA_FIELDS.map((field) => (
                    <label key={field.id} className="block">
                      <span className="text-xs uppercase tracking-wide text-ink/50">{field.label}</span>
                      <input
                        value={engineMetadata[field.id] ?? ""}
                        onChange={(e) => setEngineMetadata((prev) => ({ ...prev, [field.id]: e.target.value }))}
                        placeholder="12:45 PM"
                        className="mt-1 w-full border border-hairline bg-bg px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                        data-testid={`input-engine-${field.id}`}
                      />
                    </label>
                  ))}
                </div>
                <label className="block sm:col-span-2">
                  <span className="text-xs uppercase tracking-wide text-ink/50">Notes (parking, playlist link, etc.)</span>
                  <textarea
                    value={notesBody}
                    onChange={(e) => setNotesBody(e.target.value)}
                    rows={3}
                    className="mt-1 w-full border border-hairline bg-bg px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                    data-testid="input-notes"
                  />
                </label>
              </div>
            </section>

            <section className="border border-hairline bg-surface p-6" data-testid="section-schedule-audit">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-serif text-xl tracking-tight">Schedule rules audit</h2>
                  <p className="mt-1 text-sm text-ink/60">
                    Advisory only. These checks never block saving.
                  </p>
                </div>
                <span className="text-xs uppercase tracking-wide text-ink/45" data-testid="text-audit-count">
                  {auditIssues.length === 0 ? "No issues" : `${auditIssues.length} issue${auditIssues.length === 1 ? "" : "s"}`}
                </span>
              </div>

              {auditIssues.length === 0 ? (
                <p className="mt-4 border border-hairline bg-bg px-4 py-3 text-sm text-ink/70" data-testid="text-audit-clean">
                  No issues found.
                </p>
              ) : (
                <ul className="mt-4 space-y-3" data-testid="list-audit-issues">
                  {auditIssues.map((issue) => (
                    <li key={issue.id} className="border border-hairline bg-bg px-4 py-3" data-testid={`audit-issue-${auditId(issue.id)}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex border px-2 py-0.5 text-[11px] uppercase tracking-wide ${AUDIT_SEVERITY_STYLES[issue.severity]}`}>
                          {AUDIT_SEVERITY_LABELS[issue.severity]}
                        </span>
                        <p className="text-sm font-medium text-ink">{issue.title}</p>
                      </div>
                      <p className="mt-1 text-sm text-ink/60">{issue.detail}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Quick add from list */}
            <section data-testid="section-paste">
              <h2 className="font-serif text-xl tracking-tight mb-3">Quick add</h2>
              <div className="border border-hairline bg-surface p-6">
                <p className="text-ink/70 text-sm mb-3 max-w-[70ch]">
                  Paste counts and people. "3 artists" makes 3 provider lanes, split between makeup
                  and hair by demand. Service counts become appointment blocks in those lanes: "8
                  makeup, 5 hair" makes 8 makeup blocks and 5 hair blocks (not extra people). If
                  Bride is listed, she gets her own bridal block. People like "Bride, MOB, MOG, 5
                  bridesmaids" become a name pool added to Notes, ready to assign into blocks.
                  Everything stays editable.
                </p>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={3}
                  placeholder="8 makeup, 5 hair, 3 artists"
                  className="w-full border border-hairline bg-bg px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                  data-testid="input-paste"
                />
                <button
                  onClick={applyPaste}
                  className="mt-3 inline-flex items-center gap-2 border border-hairline px-3 py-2 hover:bg-surface-2"
                  data-testid="button-apply-paste"
                >
                  <Plus className="w-4 h-4" />
                  Add rows from list
                </button>
              </div>
            </section>

            {/* People to assign */}
            {peopleToAssign.length > 0 && (
              <section data-testid="section-people-pool">
                <h2 className="font-serif text-xl tracking-tight mb-3">People to assign</h2>
                <div className="border border-hairline bg-surface p-6">
                  <p className="text-ink/70 text-sm mb-4 max-w-[70ch]">
                    These guests still need a provider and a time. Type a name into any block
                    below to place them, then remove the name here once it is assigned.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {peopleToAssign.map((name, i) => (
                      <span
                        key={`${name}-${i}`}
                        className="inline-flex items-center gap-1.5 border border-hairline bg-bg px-2.5 py-1 text-sm"
                        data-testid={`chip-person-${i}`}
                      >
                        {name}
                        <button
                          onClick={() => setPeopleToAssign(peopleToAssign.filter((_, idx) => idx !== i))}
                          className="text-ink/40 hover:text-oxblood"
                          title="Remove from list"
                          data-testid={`button-remove-person-${i}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => navigator.clipboard?.writeText(peopleToAssign.join(", "))}
                    className="inline-flex items-center gap-2 border border-hairline px-3 py-2 text-sm hover:bg-surface"
                    data-testid="button-copy-pool"
                  >
                    <Copy className="w-4 h-4" />
                    Copy list
                  </button>
                </div>
              </section>
            )}

            {/* Provider lanes */}
            <section data-testid="section-lanes">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-xl tracking-tight">Schedule</h2>
                <button
                  onClick={() => addBlock("")}
                  className="inline-flex items-center gap-1 text-sm border border-hairline px-2.5 py-1.5 hover:bg-surface"
                  data-testid="button-add-block"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Block
                </button>
              </div>
              <p className="text-xs text-ink/50 mb-3" data-testid="text-lane-hint">
                Grouped by provider. Enter a start time and duration to auto-fill the end time.
                Change a block's Lane field to move it to another provider.
              </p>

              {laneList.length === 0 && (
                <div
                  className="border border-hairline bg-bg px-4 py-6 text-center text-ink/40"
                  data-testid="text-empty"
                >
                  No schedule yet. Use Quick add above to create provider lanes and blocks.
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
                {laneList.map((lane) => (
                  <div
                    key={lane.key}
                    className="border border-hairline bg-surface rounded-sm flex flex-col"
                    data-testid={`lane-${lane.key}`}
                  >
                    <div className="px-4 py-3 border-b border-hairline">
                      <h3
                        className="font-serif text-lg tracking-tight"
                        data-testid={`lane-title-${lane.key}`}
                      >
                        {lane.label}
                      </h3>
                      <span className="text-xs text-ink/50">
                        {lane.rows.length} block{lane.rows.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="p-3 space-y-3 flex-1">
                      {lane.rows.length === 0 && (
                        <p className="text-ink/40 text-sm px-1 py-2">No blocks yet.</p>
                      )}
                      {lane.rows.map((row) => {
                        const isBride = /bride/i.test(row.cells["service"] ?? "");
                        return (
                          <div
                            key={row.id}
                            className={`rounded-sm p-3 bg-bg border ${isBride ? "border-brass" : "border-hairline"}`}
                            data-testid={`block-${row.id}`}
                          >
                            {isBride && (
                              <div
                                className="text-[10px] uppercase tracking-wide text-brass mb-2"
                                data-testid={`label-bride-${row.id}`}
                              >
                                Bridal
                              </div>
                            )}
                            {peopleToAssign.length > 0 && (
                              <div className="mb-2">
                                <select
                                  value=""
                                  onChange={(e) => assignPerson(row.id, e.target.value)}
                                  className="w-full bg-bg border border-hairline rounded-sm px-2 py-1.5 text-xs text-ink/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                                  data-testid={`select-assign-${row.id}`}
                                >
                                  <option value="">Assign person...</option>
                                  {peopleToAssign.map((p, i) => (
                                    <option key={`${p}-${i}`} value={p}>
                                      {p}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                              {laneFields.map((col) => {
                                const wide =
                                  col.id === "name" || col.id === "service" || col.id === "notes";
                                return (
                                  <label key={col.id} className={wide ? "col-span-2 block" : "block"}>
                                    <span className="text-[10px] uppercase tracking-wide text-ink/45">
                                      {col.label}
                                    </span>
                                    <input
                                      value={row.cells[col.id] ?? ""}
                                      onChange={(e) => setCell(row.id, col.id, e.target.value)}
                                      list={col.type === "service" ? "service-options" : undefined}
                                      className={`mt-0.5 w-full bg-transparent border border-hairline rounded-sm px-2 py-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70 focus-visible:bg-bg ${
                                        col.id === "name" && isPlaceholderName(row.cells[col.id] ?? "")
                                          ? "italic text-ink/40"
                                          : ""
                                      }`}
                                      data-testid={`input-cell-${row.id}-${col.id}`}
                                    />
                                  </label>
                                );
                              })}
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-hairline/60">
                              <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-ink/45">
                                Lane
                                <input
                                  value={row.cells[providerColId] ?? ""}
                                  onChange={(e) => setCell(row.id, providerColId, e.target.value)}
                                  list="provider-options"
                                  placeholder="Unassigned"
                                  className="bg-transparent border border-hairline rounded-sm px-2 py-1 text-xs normal-case tracking-normal text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                                  data-testid={`input-cell-${row.id}-${providerColId}`}
                                />
                              </label>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => duplicateRow(row.id)}
                                  className="text-ink/50 hover:text-ink"
                                  title="Duplicate block"
                                  data-testid={`button-duplicate-row-${row.id}`}
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteRow(row.id)}
                                  className="text-ink/50 hover:text-oxblood"
                                  title="Delete block"
                                  data-testid={`button-delete-row-${row.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="px-3 pb-3">
                      <button
                        onClick={() => addBlock(lane.provider)}
                        className="w-full inline-flex items-center justify-center gap-1 text-sm border border-dashed border-hairline px-2.5 py-2 hover:bg-surface"
                        data-testid={`button-add-block-${lane.key}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add block
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* datalists offer service + provider suggestions while editing cells */}
              <datalist id="service-options">
                {serviceDefaults.map((s) => (
                  <option key={s.id} value={s.label} />
                ))}
              </datalist>
              <datalist id="provider-options">
                {providers.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </section>

            {/* Service defaults */}
            <section data-testid="section-service-defaults">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-xl tracking-tight">Default durations</h2>
                <button
                  onClick={addServiceDefault}
                  className="inline-flex items-center gap-1 text-sm border border-hairline px-2.5 py-1.5 hover:bg-surface"
                  data-testid="button-add-service"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Service
                </button>
              </div>
              <div className="border border-hairline bg-surface divide-y divide-hairline">
                {serviceDefaults.length === 0 && (
                  <div className="px-4 py-4 text-ink/40 text-sm">No services yet.</div>
                )}
                {serviceDefaults.map((s) => (
                  <div key={s.id} className="px-4 py-3 flex items-center gap-3" data-testid={`row-service-${s.id}`}>
                    <input
                      value={s.label}
                      onChange={(e) => updateServiceDefault(s.id, { label: e.target.value })}
                      className="flex-1 bg-bg border border-hairline px-2 py-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                      data-testid={`input-service-label-${s.id}`}
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        value={s.durationMinutes}
                        onChange={(e) => updateServiceDefault(s.id, { durationMinutes: parseInt(e.target.value || "0", 10) })}
                        className="w-20 bg-bg border border-hairline px-2 py-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                        data-testid={`input-service-minutes-${s.id}`}
                      />
                      <span className="text-ink/50 text-sm">min</span>
                    </div>
                    <button
                      onClick={() => deleteServiceDefault(s.id)}
                      className="text-ink/40 hover:text-oxblood"
                      data-testid={`button-delete-service-${s.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-ink/50 mt-2">
                These are starting durations only. Edit them anytime. They fill the Duration
                column when you quick-add a matching service.
              </p>
            </section>

            {/* Providers */}
            <section data-testid="section-providers">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-xl tracking-tight">Providers / artists</h2>
                <button
                  onClick={addProvider}
                  className="inline-flex items-center gap-1 text-sm border border-hairline px-2.5 py-1.5 hover:bg-surface"
                  data-testid="button-add-provider"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Provider
                </button>
              </div>
              <div className="border border-hairline bg-surface divide-y divide-hairline">
                {providers.length === 0 && (
                  <div className="px-4 py-4 text-ink/40 text-sm">No providers yet.</div>
                )}
                {providers.map((p) => (
                  <div
                    key={p.id}
                    className="px-4 py-3 grid grid-cols-1 md:grid-cols-[minmax(180px,1fr)_180px_auto_auto] gap-3 md:items-center"
                    data-testid={`row-provider-${p.id}`}
                  >
                    <label className="block">
                      <span className="text-[10px] uppercase tracking-wide text-ink/45">Name</span>
                      <input
                        value={p.name}
                        onChange={(e) => updateProvider(p.id, { name: e.target.value })}
                        className="mt-0.5 w-full bg-bg border border-hairline px-2 py-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                        data-testid={`input-provider-${p.id}`}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] uppercase tracking-wide text-ink/45">Capability</span>
                      <select
                        value={p.capability ?? ""}
                        onChange={(e) => updateProvider(p.id, { capability: normalizeProviderCapability(e.target.value) ?? "" })}
                        className="mt-0.5 w-full bg-bg border border-hairline px-2 py-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                        data-testid={`select-provider-capability-${p.id}`}
                      >
                        <option value="">Unknown</option>
                        {Object.entries(PROVIDER_CAPABILITY_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-ink/70 md:mt-4">
                      <input
                        type="checkbox"
                        checked={Boolean(p.isPrimary)}
                        onChange={(e) => updateProvider(p.id, { isPrimary: e.target.checked })}
                        className="h-4 w-4 accent-oxblood"
                        data-testid={`checkbox-provider-primary-${p.id}`}
                      />
                      Primary
                    </label>
                    <button
                      onClick={() => deleteProvider(p.id)}
                      className="text-ink/40 hover:text-oxblood md:mt-4 md:justify-self-end"
                      data-testid={`button-delete-provider-${p.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-ink/50 mt-2">
                Add the people working the day. Assign them in the Provider column per row.
              </p>
            </section>

            <div className="pt-2">
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-2 bg-ink text-bg px-4 py-2 disabled:opacity-60"
                data-testid="button-save-bottom"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save draft
              </button>
            </div>
          </div>
        )}
      </div>

      {showPreview && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 backdrop-blur-sm print:bg-bg print:static print:overflow-visible"
          data-testid="overlay-preview"
        >
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #schedule-print, #schedule-print * { visibility: visible !important; }
              #schedule-print { position: absolute !important; left: 0; top: 0; width: 100%; }
              .no-print { display: none !important; }
            }
          `}</style>

          <div className="min-h-screen flex items-start justify-center p-4 sm:p-8">
            <div
              id="schedule-print"
              className="w-full max-w-[820px] bg-bg border border-hairline rounded-sm shadow-sm"
            >
              <div className="no-print flex items-center justify-between gap-2 px-6 py-3 border-b border-hairline">
                <span className="text-xs uppercase tracking-wide text-ink/45">Read-only preview</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 border border-hairline px-3 py-1.5 text-sm hover:bg-surface"
                    data-testid="button-print"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="inline-flex items-center gap-2 border border-hairline px-3 py-1.5 text-sm hover:bg-surface"
                    data-testid="button-close-preview"
                  >
                    <X className="w-4 h-4" />
                    Close
                  </button>
                </div>
              </div>

              <div className="px-8 py-10 sm:px-12">
                <h1
                  className="font-serif tracking-tight text-3xl text-ink"
                  data-testid="text-preview-title"
                >
                  {title.trim() || "Untitled schedule"}
                </h1>
                {(eventDate.trim() || location.trim()) && (
                  <div className="mt-2 text-ink/70 space-y-0.5">
                    {eventDate.trim() && (
                      <div data-testid="text-preview-date">{eventDate.trim()}</div>
                    )}
                    {location.trim() && (
                      <div data-testid="text-preview-location">{location.trim()}</div>
                    )}
                  </div>
                )}

                {notesBody.trim() && (
                  <p className="mt-5 text-ink/80 whitespace-pre-wrap max-w-[70ch]" data-testid="text-preview-notes">
                    {notesBody.trim()}
                  </p>
                )}

                <div className="mt-8 space-y-8">
                  {laneList.length === 0 && (
                    <p className="text-ink/50 italic" data-testid="text-preview-empty">
                      No appointment blocks yet.
                    </p>
                  )}
                  {laneList.map((lane) => (
                    <section key={lane.key} data-testid={`preview-lane-${lane.key}`}>
                      <h2 className="font-serif tracking-tight text-lg text-ink border-b border-hairline pb-1.5">
                        {lane.label}
                      </h2>
                      <div className="mt-3 space-y-2.5">
                        {lane.rows.map((row) => {
                          const cv = (id: string) => (row.cells[id] ?? "").trim();
                          const isBride = /bride/i.test(cv("service"));
                          const name = cv("name");
                          const namePlaceholder = isPlaceholderName(name);
                          const start = cv("start");
                          const end = cv("end");
                          const duration = cv("duration");
                          const service = cv("service");
                          const blockNotes = cv("notes");
                          const timeParts = [start, end].filter(Boolean).join(" - ");
                          const extras = laneFields.filter(
                            (c) =>
                              !["name", "service", "start", "end", "duration", "notes"].includes(c.id) &&
                              cv(c.id),
                          );
                          return (
                            <div
                              key={row.id}
                              className={`rounded-sm px-4 py-3 ${
                                isBride ? "border border-brass bg-surface" : "border border-hairline"
                              }`}
                              data-testid={`preview-block-${row.id}`}
                            >
                              {isBride && (
                                <div className="text-[10px] uppercase tracking-wide text-brass mb-1.5">
                                  Bridal
                                </div>
                              )}
                              <div className="flex items-baseline justify-between gap-3">
                                <span
                                  className={`text-base ${
                                    name
                                      ? namePlaceholder
                                        ? "italic text-ink/40"
                                        : "text-ink font-medium"
                                      : "italic text-ink/40"
                                  }`}
                                >
                                  {name || "Unfinished"}
                                </span>
                                {(timeParts || duration) && (
                                  <span className="text-sm text-ink/60 whitespace-nowrap">
                                    {timeParts}
                                    {timeParts && duration ? "  " : ""}
                                    {duration ? `(${duration} min)` : ""}
                                  </span>
                                )}
                              </div>
                              {service && <div className="text-sm text-ink/70 mt-0.5">{service}</div>}
                              {blockNotes && (
                                <div className="text-sm text-ink/55 mt-1 whitespace-pre-wrap">{blockNotes}</div>
                              )}
                              {extras.map((c) => (
                                <div key={c.id} className="text-xs text-ink/55 mt-1">
                                  <span className="uppercase tracking-wide text-ink/40">{c.label}: </span>
                                  {cv(c.id)}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ))}

                  {peopleToAssign.length > 0 && (
                    <section data-testid="preview-unassigned">
                      <h2 className="font-serif tracking-tight text-lg text-oxblood border-b border-hairline pb-1.5">
                        Still unassigned
                      </h2>
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {peopleToAssign.map((p, i) => (
                          <li
                            key={`${p}-${i}`}
                            className="border border-hairline rounded-sm px-2.5 py-1 text-sm text-ink/70"
                          >
                            {p}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
