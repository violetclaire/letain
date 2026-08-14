import { useState, useEffect, useMemo } from "react";
import { useRoute, useSearch, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, Trash2, Copy, X, Save, Eye, Printer } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  generateProductionSchedule,
  serviceLabel,
  type FixedScheduleBlock,
  type ProductionScheduleResult,
  type ProviderServiceDurations,
  type ScheduleOperatorDefaults,
  type ScheduleServiceKind,
  type SchedulingProvider,
} from "@shared/schedulingIntelligence";
import {
  parsedScheduleRequestFromEvidence,
  reduceScheduleEvidence,
  scheduleEvidenceInputFromText,
} from "@shared/schedulingEvidence";

type Column = { id: string; label: string; type: string };
type Row = { id: string; sortOrder: number; cells: Record<string, string> };
// durationMinutes is null until the operator enters a real number. A null
// duration is visibly unknown and blocks time planning — it is never filled in.
type ServiceDefault = { id: string; label: string; durationMinutes: number | null };
type ProviderCapability = "ALL" | "HAIR_ONLY" | "MAKEUP_ONLY";
type Provider = {
  id: string;
  name: string;
  capability?: ProviderCapability | "";
  isPrimary?: boolean;
  serviceDurations?: ProviderServiceDurations;
};
type ScheduleEngineMetadata = {
  venueAccessTime?: string;
  photographerArrivalTime?: string;
  readyByTime?: string;
  ceremonyTime?: string;
  firstLookTime?: string;
  sourceRequest?: string;
  optionalPeopleMode?: "undecided" | "exclude" | "include";
  touchupMode?: "undecided" | "quote_only" | "schedule_fixed_only";
  assignPrimaryToLead?: boolean;
  protectLeadBeforePrimary?: boolean;
  fixedBlocksReviewed?: boolean;
  evidenceDay?: string;
  useEvidencePlaceholders?: boolean;
  evidenceAdditionsMode?: "undecided" | "exclude" | "include";
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

type ScheduleReadinessState =
  | "Ready to draft"
  | "Needs schedule details"
  | "Ready with assumptions"
  | "Needs operator review";

type ScheduleReadiness = {
  state: ScheduleReadinessState;
  prompts: string[];
  nextPrompt: string;
};

type PreviewServiceKind = "hair" | "makeup" | "both" | "other";
type PreviewCategory = "attendant" | "bride" | "mother" | "flower" | "other";

type PreviewSourceBlock = {
  id: string;
  name: string;
  service: string;
  notes: string;
  originalProvider: string;
  kind: PreviewServiceKind;
  category: PreviewCategory;
  duration: number | null;
  // Where the duration came from: the row the operator filled ("row"), the
  // operator's baseline service default ("baseline"), or the assigned
  // provider's own saved timing ("provider"). A baseline value is the
  // operator's own number — never proof the assigned provider agreed to that
  // timing for this event.
  durationSource: "row" | "baseline" | "provider" | null;
  order: number;
};

type PreviewBlock = PreviewSourceBlock & {
  provider: string;
  start: number | null;
  end: number | null;
  isSetup?: boolean;
  isFixed?: boolean;
};

type PreviewLane = {
  provider: string;
  label: string;
  capability?: ProviderCapability;
  isPrimary: boolean;
  blocks: PreviewBlock[];
};

type FirstDraftPreview = {
  lanes: PreviewLane[];
  warnings: string[];
  // Issues that must be resolved by the operator before the preview can be
  // applied — e.g. a block whose duration exists in no record.
  blockingIssues: string[];
  readyBy: number | null;
  setupMinutes: number | null;
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

const SCHEDULE_READINESS_STYLES: Record<ScheduleReadinessState, string> = {
  "Ready to draft": "border-sage/40 bg-sage/10 text-ink",
  "Needs schedule details": "border-brass/40 bg-brass/10 text-ink",
  "Ready with assumptions": "border-brass/40 bg-brass/10 text-ink",
  "Needs operator review": "border-oxblood/40 bg-oxblood/10 text-oxblood",
};

const PROVIDER_CAPABILITY_LABELS: Record<ProviderCapability, string> = {
  ALL: "Hair + makeup",
  HAIR_ONLY: "Hair",
  MAKEUP_ONLY: "Makeup",
};
const UNKNOWN_PROVIDER_CAPABILITY_LABEL = "Unknown / needs operator confirmation";

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

const PROVIDER_DURATION_FIELDS: Array<{
  id: keyof ProviderServiceDurations;
  label: string;
}> = [
  { id: "hair", label: "Hair" },
  { id: "makeup", label: "Makeup" },
  { id: "hairMakeup", label: "Hair + makeup" },
  { id: "primaryClient", label: "Primary client" },
  { id: "touchup", label: "Touchup" },
];

// Starter service labels for a new draft. Durations are intentionally unknown:
// a duration exists only once the operator enters it (on a row or here as a
// service default). Coded numbers must never masquerade as operator judgment.
const STARTER_SERVICE_DEFAULTS: ServiceDefault[] = [
  { id: "bride-hair-makeup", label: "Bride Hair + Makeup", durationMinutes: null },
  { id: "bride-makeup", label: "Bride Makeup", durationMinutes: null },
  { id: "bride-hair", label: "Bride Hair", durationMinutes: null },
  { id: "bridesmaid-makeup", label: "Bridesmaid Makeup", durationMinutes: null },
  { id: "bridesmaid-hair", label: "Bridesmaid Hair", durationMinutes: null },
  { id: "mother-makeup", label: "Mother Makeup", durationMinutes: null },
  { id: "mother-hair", label: "Mother Hair", durationMinutes: null },
  { id: "flower-girl", label: "Flower Girl", durationMinutes: null },
  { id: "touch-ups", label: "Touch-Ups", durationMinutes: null },
  { id: "setup", label: "Setup", durationMinutes: null },
];

// Old code-injected duration tables. Kept ONLY to detect saved drafts still
// carrying an untouched code seed so those durations can be cleared back to
// unknown — none of these numbers were operator-entered.
const LEGACY_SERVICE_DEFAULTS: Record<string, number> = {
  makeup: 30,
  hair: 30,
  "hair + makeup": 60,
  "bride hair + makeup": 120,
};

const CODE_SEEDED_SERVICE_DURATIONS: Record<string, number> = {
  "bride hair + makeup": 120,
  "bride makeup": 60,
  "bride hair": 45,
  "bridesmaid makeup": 30,
  "bridesmaid hair": 45,
  "mother makeup": 30,
  "mother hair": 45,
  "flower girl": 45,
  "touch-ups": 15,
  setup: 15,
};

interface Draft {
  id: string;
  inquiryId?: string | null;
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
  updatedAt?: string | null;
}

interface LinkedInquiryContext {
  id: string;
  serviceType?: string | null;
  eventType?: string | null;
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

function providerCapabilityLabel(capability?: ProviderCapability | ""): string {
  return capability ? PROVIDER_CAPABILITY_LABELS[capability] : UNKNOWN_PROVIDER_CAPABILITY_LABEL;
}

// Decide how many coordination lanes do makeup vs hair, proportional to how many
// blocks each kind has. When both kinds exist on a single service role, that one lane
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

// Build a coordination-lane schedule, not flat person rows. The core model:
//   - service roles/providers are lanes (the Provider column on each row)
//   - services are coordination blocks placed inside those lanes
//   - people are a NAME POOL the operator assigns into blocks later
// Handles "Bride, MOB, MOG, 5 bridesmaids, 8 makeup, 5 hair, 3 providers":
//   - 3 providers -> 3 coordination lanes (split makeup vs hair by demand)
//   - 8 makeup / 5 hair -> service blocks, NOT extra people
//   - Bride present + services -> one special "Bride Hair + Makeup" block
//   - people stay a name pool (added to notes); only Bride is auto-placed
// Never throws. Service counts are never turned into people.
function buildScheduleFromInput(
  text: string,
  serviceDefaults: ServiceDefault[],
): {
  providers: Array<{ name: string; capability?: ProviderCapability | "" }>;
  blocks: Array<{ name: string; service: string; provider: string; duration: string }>;
  personRows: Array<{ name: string }>;
  namePool: string[];
} {
  const durationFor = (label: string): string => {
    const sd = serviceDefaults.find((s) => s.label.toLowerCase() === label.toLowerCase());
    return sd && sd.durationMinutes !== null ? String(sd.durationMinutes) : "";
  };

  let providerCount = 0;
  // Setup length comes only from the operator's Setup service default. An
  // empty value stays empty (visibly unknown) — no invented 15/30 fallback.
  const setupDurationFor = () => durationFor("Setup");
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
    // "3 providers" / "3 stylists" / "3 artists" -> a lane count, not people.
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
    const provs: Array<{ name: string; capability: "" }> = [];
    // Lane slots reflect the operator's typed provider COUNT; the names are
    // unknown until entered, so lanes are neutral "Provider N" slots — never
    // invented artist identities.
    for (let i = 0; i < providerCount; i++) provs.push({ name: `Provider ${i + 1}`, capability: "" });
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

  // Create lane records, makeup lanes first then hair lanes (Provider 1..N).
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

  const laneLabel = (rec: Lane): string => `Provider ${rec.artistNum}`;
  const laneCapability = (rec: Lane): ProviderCapability => {
    if (rec.role === "both") return "ALL";
    if (rec.role === "makeup") return "MAKEUP_ONLY";
    return "HAIR_ONLY";
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

  const providers = laneRecords.map((rec) => ({ name: laneLabel(rec), capability: laneCapability(rec) }));
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
// trailing number, e.g. "Guest 1", "Bridesmaid 2", "Provider 1", "Person 1",
// "Client 1", "Flower Girl 1". Real names ("Jane Doe") have no trailing number,
// so they style normally. Purely a visual cue, never blocks saving.
function isPlaceholderName(value: string): boolean {
  return /^[A-Za-z][A-Za-z .'+/&-]*\s+\d+$/.test(value.trim());
}

function isStarterScheduleName(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || isPlaceholderName(trimmed)) return true;
  return /^(bride|bridal|mob|mog|mother|mother of bride|mother of groom|flower girl|setup)$/i.test(trimmed);
}

function isEmptyOrPlaceholderOnlyRows(rows: Row[], providerColId: string): boolean {
  if (rows.length === 0) return true;
  const allowedStarterCells = new Set(["name", "service", "duration", providerColId]);
  return rows.every((row) => {
    const cells = row.cells ?? {};
    if (cells._fixed === "true") return true;
    const name = (cells.name ?? "").trim();
    if (!isStarterScheduleName(name)) return false;
    return Object.entries(cells).every(([key, value]) => {
      const cellValue = (value ?? "").trim();
      if (!cellValue) return true;
      if (key === "name") return isStarterScheduleName(cellValue);
      return allowedStarterCells.has(key);
    });
  });
}

function firstDraftHasMeaningfulServiceBlocks(preview: FirstDraftPreview): boolean {
  return preview.lanes.some((lane) =>
    lane.blocks.some((block) => !block.isSetup && isApplyableFirstDraftBlock(block)),
  );
}

function isApplyableFirstDraftBlock(block: PreviewBlock): boolean {
  return Boolean(block.isSetup || block.service.trim() || block.notes.trim() || (block.name.trim() && !isStarterScheduleName(block.name)));
}

function firstDraftPreviewToRows(preview: FirstDraftPreview, columns: Column[], providerColId: string): Row[] {
  const rows: Row[] = [];
  for (const lane of preview.lanes) {
    for (const block of lane.blocks) {
      if (!isApplyableFirstDraftBlock(block)) continue;
      const cells: Record<string, string> = {};
      for (const column of columns) cells[column.id] = "";
      cells.name = block.name;
      cells.service = block.service;
      cells[providerColId] = block.provider;
      cells.start = block.start === null ? "" : formatClockTime(block.start);
      cells.end = block.end === null ? "" : formatClockTime(block.end);
      cells.duration = block.duration === null ? "" : String(block.duration);
      cells.notes = block.notes;
      if (block.isFixed) cells._fixed = "true";
      rows.push({
        id: uid("row"),
        sortOrder: rows.length,
        cells,
      });
    }
  }
  return rows;
}

function scheduleServiceKindFromText(value: string): ScheduleServiceKind {
  const text = value.toLowerCase().replace(/make\s+up/g, "makeup");
  if (/touch\s*-?\s*up/.test(text)) return "touchup";
  const hasHair = /\bhair\b|\bhmu\b/.test(text);
  const hasMakeup = /\bmakeup\b|\bhmu\b/.test(text);
  if (hasHair && hasMakeup) return "hair_makeup";
  if (hasHair) return "hair";
  if (hasMakeup) return "makeup";
  return "other";
}

function fixedScheduleBlocksFromRows(rows: Row[], providers: Provider[], providerColId: string): FixedScheduleBlock[] {
  const providersByName = new Map(providers.map((provider) => [provider.name.trim().toLowerCase(), provider]));
  return rows.flatMap((row) => {
    const cells = row.cells ?? {};
    if (cells._fixed !== "true") return [];
    const personName = (cells.name ?? "").trim();
    const providerName = (cells[providerColId] ?? "").trim();
    const provider = providersByName.get(providerName.toLowerCase());
    const start = parseClockTime(cells.start ?? "");
    const explicitEnd = parseClockTime(cells.end ?? "");
    const duration = parseDurationMinutes(cells.duration ?? "");
    const end = explicitEnd ?? (start !== null && duration !== null ? start + duration : null);
    if (!personName || !provider || start === null || end === null || end <= start) return [];
    return [{
      id: row.id,
      personName,
      service: scheduleServiceKindFromText(`${cells.service ?? ""} ${cells.notes ?? ""}`),
      providerId: provider.id,
      providerName: provider.name,
      startTime: formatClockTime(start),
      endTime: formatClockTime(end),
      notes: (cells.notes ?? "").trim(),
    }];
  });
}

function schedulingProviders(providers: Provider[]): SchedulingProvider[] {
  return providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    capability: provider.capability,
    isLead: provider.isPrimary,
    serviceDurations: provider.serviceDurations,
  }));
}

function productionScheduleToPreview(result: ProductionScheduleResult): FirstDraftPreview {
  return {
    lanes: result.lanes.map((lane) => ({
      provider: lane.providerName,
      label: lane.providerName,
      capability: lane.capability || undefined,
      isPrimary: lane.isLead,
      blocks: lane.blocks.map((block, order) => ({
        id: block.id,
        name: block.personName,
        service: block.serviceLabel,
        notes: uniquePreviewNotes([...block.notes, block.optional ? "Optional person included for this event" : ""]),
        originalProvider: block.providerName,
        kind: block.service === "hair_makeup" ? "both" : block.service === "hair" || block.service === "makeup" ? block.service : "other",
        category: firstDraftCategory(`${block.roleLabel} ${block.personName}`),
        duration: block.durationMinutes,
        durationSource: "provider" as const,
        order,
        provider: block.providerName,
        start: block.startMinutes,
        end: block.endMinutes,
        isFixed: block.fixed,
      })),
    })),
    warnings: result.warnings.map((warning) => warning.message),
    blockingIssues: [],
    readyBy: result.readyTimeMinutes,
    setupMinutes: 0,
  };
}

function uniquePreviewNotes(notes: string[]): string {
  return Array.from(new Set(notes.map((note) => note.trim()).filter(Boolean))).join("; ");
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

function readHandoffField(notes: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = notes.match(new RegExp(`^[ \\t]*${escaped}:[ \\t]*(.*)$`, "im"));
  return match?.[1]?.trim() ?? "";
}

function readHandoffNotes(notes: string): string {
  const match = notes.match(/(?:^|\n)Inquiry notes:[ \t]*\n([\s\S]*)$/i);
  return match?.[1]?.trim() ?? "";
}

function cleanText(value?: string | null): string {
  return value?.trim() ?? "";
}

function buildLinkedInquiryScheduleContext(inquiry?: LinkedInquiryContext | null): string {
  return [inquiry?.serviceType, inquiry?.eventType].map(cleanText).filter(Boolean).join(" / ");
}

function buildInquiryHandoffContext(input: {
  eventDate: string;
  location: string;
  notesBody: string;
  linkedScheduleContext?: string | null;
  linkedScheduleContextLoading?: boolean;
}): { date: string; location: string; scheduleContext: string; notes: string } {
  const notes = input.notesBody.trim();
  const inquiryNotes = readHandoffNotes(notes);
  const parsedScheduleContext = readHandoffField(notes, "Schedule context");
  const linkedScheduleContext = cleanText(input.linkedScheduleContext);
  const scheduleContext = parsedScheduleContext
    || (input.linkedScheduleContextLoading ? "Checking linked inquiry context" : "")
    || linkedScheduleContext
    || "Confirm from inquiry";
  return {
    date: readHandoffField(notes, "Event date") || input.eventDate.trim() || "Not captured yet",
    location: readHandoffField(notes, "Location / venue") || input.location.trim() || "Not captured yet",
    scheduleContext,
    notes: inquiryNotes || notes || "No inquiry notes captured yet",
  };
}

function normalizeProviderCapability(value: unknown): ProviderCapability | undefined {
  return value === "ALL" || value === "HAIR_ONLY" || value === "MAKEUP_ONLY" ? value : undefined;
}

function normalizeProviders(providers?: Provider[] | null): Provider[] {
  return (providers ?? []).map((provider) => {
    const capability = normalizeProviderCapability(provider.capability);
    const serviceDurations = Object.fromEntries(
      Object.entries(provider.serviceDurations ?? {}).filter(([, value]) => typeof value === "number" && value > 0),
    ) as ProviderServiceDurations;
    return {
      id: provider.id,
      name: provider.name,
      ...(capability ? { capability } : {}),
      ...(provider.isPrimary ? { isPrimary: true } : {}),
      ...(Object.keys(serviceDurations).length > 0 ? { serviceDurations } : {}),
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
    sourceRequest: metadata?.sourceRequest ?? "",
    optionalPeopleMode: metadata?.optionalPeopleMode ?? "undecided",
    touchupMode: metadata?.touchupMode ?? "undecided",
    assignPrimaryToLead: metadata?.assignPrimaryToLead,
    protectLeadBeforePrimary: metadata?.protectLeadBeforePrimary,
    fixedBlocksReviewed: metadata?.fixedBlocksReviewed ?? false,
    evidenceDay: metadata?.evidenceDay ?? "",
    useEvidencePlaceholders: metadata?.useEvidencePlaceholders ?? false,
    evidenceAdditionsMode: metadata?.evidenceAdditionsMode ?? "undecided",
  };
}

function starterServiceDefaults(): ServiceDefault[] {
  return STARTER_SERVICE_DEFAULTS.map((service) => ({ ...service }));
}

// Detecting an untouched code-injected table requires an EXACT complete-table
// match: same row count as the seed, every seeded label present exactly once,
// every duration equal to the seeded value. Anything less — a subset, a
// duplicate, one edited number — is treated as operator data and kept, so a
// real saved entry that happens to equal a seed value is never wiped.
function matchesEntireSeedTable(defaults: ServiceDefault[], seedTable: Record<string, number>): boolean {
  const seedLabels = Object.keys(seedTable);
  if (defaults.length !== seedLabels.length) {
    return false;
  }

  const seen = new Set<string>();
  for (const service of defaults) {
    const label = service.label.trim().toLowerCase();
    if (seen.has(label)) return false;
    seen.add(label);
    if (seedTable[label] !== service.durationMinutes) return false;
  }
  return true;
}

function usesLegacyServiceDefaults(defaults: ServiceDefault[]): boolean {
  return matchesEntireSeedTable(defaults, LEGACY_SERVICE_DEFAULTS);
}

// An untouched code seed is not an operator decision: when the stored table is
// exactly the old code-injected table, the durations are cleared back to
// unknown. Any operator edit anywhere keeps the whole table.
function usesCodeSeededServiceDefaults(defaults: ServiceDefault[]): boolean {
  return matchesEntireSeedTable(defaults, CODE_SEEDED_SERVICE_DURATIONS);
}

function normalizeServiceDefaults(defaults?: ServiceDefault[] | null): ServiceDefault[] {
  const current = defaults ?? [];
  if (current.length === 0 || usesLegacyServiceDefaults(current) || usesCodeSeededServiceDefaults(current)) {
    return starterServiceDefaults();
  }
  // Older saves stored 0 for "no duration"; 0 is not a real duration.
  return current.map((service) => ({
    ...service,
    durationMinutes:
      typeof service.durationMinutes === "number" && Number.isFinite(service.durationMinutes) && service.durationMinutes > 0
        ? service.durationMinutes
        : null,
  }));
}

function auditText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function auditId(value: string): string {
  return auditText(value).replace(/\s+/g, "-") || "item";
}

function serviceCapabilityLaneLabel(raw: string, capability?: ProviderCapability | ""): string | null {
  const text = auditText(raw);
  if (capability === "ALL") return "Hair + Makeup";
  if (capability === "HAIR_ONLY") return "Hair";
  if (capability === "MAKEUP_ONLY") return "Makeup";
  if (!text) return null;
  if (/\btouch\s*ups?\b|\btouchups?\b/.test(text)) return "Touch-ups";
  if (/\b(hm|hmu|hair\s*(and|\+|\/|&)\s*makeup|makeup\s*(and|\+|\/|&)\s*hair)\b/.test(text)) return "Hair + Makeup";
  if (/\bhair\b/.test(text)) return "Hair";
  if (/\b(makeup|make\s*up)\b/.test(text)) return "Makeup";
  return null;
}

function isServiceLikeLaneHeader(raw: string): boolean {
  const text = auditText(raw);
  if (!text) return false;
  if (/^(hair|makeup|make up|hm|hmu|hair and makeup|hair makeup|hair \+ makeup|makeup hair|makeup \+ hair|touch ups?|touchups?)$/.test(text)) {
    return true;
  }
  if (STARTER_SERVICE_DEFAULTS.some((service) => auditText(service.label) === text)) return true;
  return /\b(bride|bridal|bridesmaid|bm|mother|mob|mog|flower|fg|attendant|party|guest|person)\b/.test(text) &&
    /\b(hair|makeup|make up|hm|hmu|touch\s*ups?|touchups?)\b/.test(text);
}

function normalizeScheduleLaneLabel(raw: string, capability?: ProviderCapability | "", fallbackArtistNumber?: number): string {
  const name = raw.trim();
  if (!name) return fallbackArtistNumber ? `Provider ${fallbackArtistNumber}` : "Needs provider assignment";
  const artistMatch = name.match(/^Artist\s+(\d+)(?:\s*[-–]\s*.+)?$/i);
  if (artistMatch) return `Provider ${artistMatch[1]}`;
  const providerMatch = name.match(/^Provider\s+(\d+)(?:\s*-\s*.+)?$/i);
  if (providerMatch) return `Provider ${providerMatch[1]}`;
  if (/^unassigned$/i.test(name)) return "Needs provider assignment";
  const serviceLabel = serviceCapabilityLaneLabel(name, capability);
  if (serviceLabel && isServiceLikeLaneHeader(name)) return serviceLabel;
  return name;
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

function previewIntervalsOverlap(a: PreviewBlock, b: PreviewBlock): boolean {
  return a.start !== null && a.end !== null && b.start !== null && b.end !== null && a.start < b.end && b.start < a.end;
}

function previewServiceSequenceRank(block: PreviewBlock): number {
  const text = auditText([block.service, block.name, block.notes].join(" "));
  const hasHair = auditHasHairService(text);
  const hasMakeup = auditHasMakeupService(text);
  if (hasHair && !hasMakeup) return 0;
  if (hasHair && hasMakeup) return 0;
  if (hasMakeup) return 1;
  return 2;
}

function sequenceSamePersonPreviewBlocks(lanes: PreviewLane[], warnings: string[]) {
  const groups = new Map<string, PreviewBlock[]>();
  for (const block of lanes.flatMap((lane) => lane.blocks)) {
    if (block.isSetup || block.start === null || block.end === null) continue;
    const key = auditNameKey(block.name);
    if (!key) continue;
    const current = groups.get(key) ?? [];
    current.push(block);
    groups.set(key, current);
  }

  for (const blocks of groups.values()) {
    if (blocks.length < 2) continue;
    let hasOverlap = false;
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        if (previewIntervalsOverlap(blocks[i], blocks[j])) hasOverlap = true;
      }
    }
    if (!hasOverlap) continue;

    const ordered = [...blocks].sort((a, b) => previewServiceSequenceRank(a) - previewServiceSequenceRank(b) || a.order - b.order);
    let cursor = Math.max(...ordered.map((block) => block.end ?? 0));
    for (let i = ordered.length - 1; i >= 0; i--) {
      const block = ordered[i];
      block.end = cursor;
      block.start = cursor - (block.duration ?? 0);
      cursor = block.start;
    }
    const name = ordered.find((block) => block.name.trim())?.name.trim() ?? "This person";
    warnings.push(`${name} hair/makeup preview blocks were sequenced so the same person is not overlapping across providers.`);
  }

  for (const lane of lanes) {
    lane.blocks.sort((a, b) => {
      if (a.start !== null && b.start !== null) return a.start - b.start || a.order - b.order;
      if (a.isSetup && !b.isSetup) return -1;
      if (!a.isSetup && b.isSetup) return 1;
      return a.order - b.order;
    });
  }
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
      detail: `${auditBlockLabel(block)} is ${block.duration} min; your saved record expects at least ${min} min.`,
    });
  }
}

function firstDraftCategory(text: string): PreviewCategory {
  if (hasAuditWord(text, /\bbride\b|\bbridal\b/)) return "bride";
  if (hasAuditWord(text, /\bmother\b|\bmob\b|\bmog\b|mother of bride|mother of groom/)) return "mother";
  if (hasAuditWord(text, /\bflower\s*girl\b|\bflowergirl\b/)) return "flower";
  if (hasAuditWord(text, /\bbridesmaid\b|\bmaid of honor\b|\bmoh\b|\battendant\b/)) return "attendant";
  return "other";
}

function firstDraftServiceKind(text: string): PreviewServiceKind {
  const hasHair = auditHasHairService(text);
  const hasMakeup = auditHasMakeupService(text);
  if (hasHair && hasMakeup) return "both";
  if (hasHair) return "hair";
  if (hasMakeup) return "makeup";
  return "other";
}

// A preview duration comes only from a real record: the row's explicit
// duration first, then an operator-entered service default. When neither
// exists the duration is null — visibly unknown and blocking — never a number
// this code made up.
function defaultPreviewDuration(
  category: PreviewCategory,
  kind: PreviewServiceKind,
  serviceLabel: string,
  explicitDuration: number | null,
  serviceDefaults: ServiceDefault[],
): number | null {
  if (explicitDuration !== null) return explicitDuration;

  const defaults = new Map<string, number>();
  for (const service of serviceDefaults) {
    if (service.durationMinutes !== null) {
      defaults.set(service.label.trim().toLowerCase(), service.durationMinutes);
    }
  }
  const exactDefault = serviceLabel.trim() ? defaults.get(serviceLabel.trim().toLowerCase()) : undefined;
  if (exactDefault !== undefined) return exactDefault;
  const byLabel = (label: string) => defaults.get(label.toLowerCase()) ?? null;

  if (category === "bride" && kind === "both") return byLabel("Bride Hair + Makeup");
  if (category === "bride" && kind === "makeup") return byLabel("Bride Makeup");
  if (category === "bride" && kind === "hair") return byLabel("Bride Hair");
  if (category === "mother" && kind === "makeup") return byLabel("Mother Makeup");
  if (category === "mother" && kind === "hair") return byLabel("Mother Hair");
  if (category === "flower") return byLabel("Flower Girl");
  if (category === "attendant" && kind === "makeup") return byLabel("Bridesmaid Makeup");
  if (category === "attendant" && kind === "hair") return byLabel("Bridesmaid Hair");
  if (kind === "makeup") return byLabel("Bridesmaid Makeup");
  if (kind === "hair") return byLabel("Bridesmaid Hair");
  if (kind === "both") return byLabel("Bride Hair + Makeup");
  return null;
}

// The assigned provider's own saved timing for a block's service, or null
// when they have none. Used to tell "this provider's record" apart from "the
// operator's baseline standing in for them".
function providerTimingForBlock(
  provider: Provider,
  block: { kind: PreviewServiceKind; category: PreviewCategory },
): number | null {
  const timings = provider.serviceDurations;
  if (!timings) return null;
  const value =
    block.kind === "both"
      ? block.category === "bride"
        ? timings.primaryClient ?? timings.hairMakeup
        : timings.hairMakeup
      : block.kind === "hair"
        ? timings.hair
        : block.kind === "makeup"
          ? timings.makeup
          : undefined;
  return typeof value === "number" && value > 0 ? value : null;
}

function firstDraftProviderCanTake(provider: Provider, kind: PreviewServiceKind): boolean {
  const capability = normalizeProviderCapability(provider.capability);
  if (!capability || kind === "other") return true;
  if (kind === "both") return capability === "ALL";
  if (kind === "hair") return capability === "ALL" || capability === "HAIR_ONLY";
  if (kind === "makeup") return capability === "ALL" || capability === "MAKEUP_ONLY";
  return true;
}

function firstDraftCategoryRank(category: PreviewCategory): number {
  if (category === "attendant") return 0;
  if (category === "other") return 1;
  if (category === "bride") return 2;
  if (category === "mother") return 3;
  return 4;
}

function buildFirstDraftPreview(input: {
  rows: Row[];
  providers: Provider[];
  serviceDefaults: ServiceDefault[];
  engineMetadata: ScheduleEngineMetadata;
  providerColId: string;
}): FirstDraftPreview {
  const warnings: string[] = [];
  const blockingIssues: string[] = [];
  const providerMap = new Map<string, Provider>();
  for (const provider of input.providers) {
    const name = provider.name.trim();
    if (!name || providerMap.has(name)) continue;
    providerMap.set(name, provider);
    if (!normalizeProviderCapability(provider.capability)) {
      warnings.push(`${name} has no capability selected, so the preview treats them as flexible.`);
    }
  }
  for (const row of input.rows) {
    const providerName = (row.cells?.[input.providerColId] ?? "").trim();
    if (providerName && !providerMap.has(providerName)) {
      providerMap.set(providerName, { id: providerName, name: providerName });
      warnings.push(`${providerName} is used on rows but is not in the provider list, so capability is unknown.`);
    }
  }

  if (providerMap.size === 0) {
    providerMap.set("Unassigned", { id: "preview-unassigned", name: "Unassigned" });
    warnings.push("Add providers before relying on this preview.");
  }

  const readyByRaw = input.engineMetadata.readyByTime?.trim() ?? "";
  const readyBy = readyByRaw ? parseClockTime(readyByRaw) : null;
  if (!readyByRaw) {
    warnings.push("Add a ready-by / hard stop time to generate backward-planned times.");
  } else if (readyBy === null) {
    warnings.push(`Ready-by time "${readyByRaw}" could not be parsed, so preview times are omitted.`);
  }

  const sourceBlocks: PreviewSourceBlock[] = [];
  input.rows.forEach((row, order) => {
    const cells = row.cells ?? {};
    const name = (cells.name ?? "").trim();
    const service = (cells.service ?? "").trim();
    const notes = (cells.notes ?? "").trim();
    const originalProvider = (cells[input.providerColId] ?? "").trim();
    const text = auditText([name, service, notes].join(" "));
    if ((!name && !service && !notes) || hasAuditWord(text, /\b(setup|set up|station setup|stations)\b/)) return;
    const category = firstDraftCategory(text);
    const kind = firstDraftServiceKind(text);
    const explicitDuration = parseDurationMinutes(cells.duration ?? "");
    const duration = defaultPreviewDuration(category, kind, service, explicitDuration, input.serviceDefaults);
    if (duration === null) {
      blockingIssues.push(
        `${name || service || "A service row"} has no duration from any record — enter a duration on the row or set a matching service default.`,
      );
    }
    sourceBlocks.push({
      id: row.id,
      name,
      service,
      notes,
      originalProvider,
      kind,
      category,
      duration,
      durationSource: explicitDuration !== null ? "row" : duration !== null ? "baseline" : null,
      order,
    });
  });

  if (sourceBlocks.length === 0) {
    warnings.push("Add service rows before generating a first draft preview.");
  }

  const providers = Array.from(providerMap.values());
  const assignmentCounts = new Map(providers.map((provider) => [provider.name.trim() || provider.id, 0]));
  const lanes = new Map<string, PreviewLane>();
  const ensureLane = (provider: Provider) => {
    const name = provider.name.trim() || "Unassigned";
    if (!lanes.has(name)) {
      lanes.set(name, {
        provider: name,
        label: normalizeScheduleLaneLabel(name, provider.capability, lanes.size + 1),
        capability: normalizeProviderCapability(provider.capability),
        isPrimary: Boolean(provider.isPrimary),
        blocks: [],
      });
    }
    return lanes.get(name) as PreviewLane;
  };

  let brideProvider = providers.find((provider) => provider.isPrimary && firstDraftProviderCanTake(provider, "both")) ?? providers.find((provider) => provider.isPrimary);
  const chooseProvider = (block: PreviewSourceBlock) => {
    const original = block.originalProvider ? providerMap.get(block.originalProvider) : undefined;
    if (original && firstDraftProviderCanTake(original, block.kind)) return original;
    if (original && !firstDraftProviderCanTake(original, block.kind)) {
      warnings.push(`${block.originalProvider} cannot take ${block.service || block.name || "a service"} based on capability, so the preview reassigns it.`);
    }

    let candidates = providers.filter((provider) => firstDraftProviderCanTake(provider, block.kind));
    if (candidates.length === 0) {
      candidates = providers;
      warnings.push(`No provider capability matches ${block.service || block.name || "a service"}; preview assigns it for review.`);
    }

    if (block.category === "bride") {
      const primary = candidates.find((provider) => provider.isPrimary);
      const chosen = primary ?? candidates[0];
      brideProvider = chosen;
      return chosen;
    }

    if (block.category === "mother" && brideProvider && candidates.some((provider) => provider.name === brideProvider?.name)) {
      return brideProvider;
    }

    return [...candidates].sort((a, b) => {
      const aName = a.name.trim() || a.id;
      const bName = b.name.trim() || b.id;
      return (assignmentCounts.get(aName) ?? 0) - (assignmentCounts.get(bName) ?? 0);
    })[0];
  };

  for (const block of sourceBlocks) {
    const provider = chooseProvider(block);
    const providerName = provider.name.trim() || "Unassigned";
    assignmentCounts.set(providerName, (assignmentCounts.get(providerName) ?? 0) + 1);
    ensureLane(provider).blocks.push({ ...block, provider: providerName, start: null, end: null });

    // A baseline duration is the operator's own number — it is never proof
    // that the assigned provider agreed to that timing for this event. Say so
    // whenever the provider has no saved timing of their own, and flag any
    // mismatch when they do.
    if (block.durationSource === "baseline" && providerName !== "Unassigned" && block.kind !== "other") {
      const ownTiming = providerTimingForBlock(provider, block);
      const label = block.name || block.service || "A block";
      if (ownTiming === null) {
        warnings.push(
          `${label} uses your baseline timing — ${providerName} has no saved duration for this service and has not confirmed this timing for this event.`,
        );
      } else if (ownTiming !== block.duration) {
        warnings.push(
          `${label} uses your baseline timing (${block.duration} min), but ${providerName}'s own saved timing is ${ownTiming} min — confirm which applies for this event.`,
        );
      }
    }
  }

  // Setup length comes only from the operator's "Setup" service default. No
  // 15/30-minute station heuristic: an unknown setup time is a blocking issue.
  const setupDuration = input.serviceDefaults.find((service) => service.label.trim().toLowerCase() === "setup")?.durationMinutes ?? null;
  if (setupDuration === null && sourceBlocks.length > 0) {
    blockingIssues.push('Setup time is not set — enter a "Setup" service default before times can be planned.');
  }
  const venueAccess = input.engineMetadata.venueAccessTime?.trim() ? parseClockTime(input.engineMetadata.venueAccessTime) : null;

  for (const lane of lanes.values()) {
    lane.blocks.sort((a, b) => firstDraftCategoryRank(a.category) - firstDraftCategoryRank(b.category) || a.order - b.order);
    const setupBlock: PreviewBlock = {
      id: `setup-${auditId(lane.provider)}`,
      name: "Setup",
      service: "Setup",
      notes: setupDuration === null ? "Duration unknown — set a Setup service default" : "Setup default (operator-entered)",
      originalProvider: lane.provider,
      kind: "other",
      category: "other",
      duration: setupDuration,
      durationSource: setupDuration === null ? null : "baseline",
      order: -1,
      provider: lane.provider,
      start: null,
      end: null,
      isSetup: true,
    };
    lane.blocks.unshift(setupBlock);

    if (readyBy !== null) {
      // Backward planning only runs on fully sourced durations; any unknown
      // block leaves the lane untimed instead of quietly inventing minutes.
      if (lane.blocks.some((block: PreviewBlock) => block.duration === null)) {
        warnings.push(`${lane.provider} has blocks with unknown durations, so preview times are omitted for that lane.`);
      } else {
        const totalMinutes = lane.blocks.reduce((sum, block) => sum + (block.duration ?? 0), 0);
        let cursor = readyBy - totalMinutes;
        if (venueAccess !== null && cursor < venueAccess) {
          warnings.push(`${lane.provider} preview begins before venue access.`);
        }
        for (const block of lane.blocks) {
          block.start = cursor;
          block.end = cursor + (block.duration ?? 0);
          cursor = block.end;
        }
      }
    }
  }

  sequenceSamePersonPreviewBlocks(Array.from(lanes.values()), warnings);

  const previewBlocks = Array.from(lanes.values()).flatMap((lane) => lane.blocks).filter((block) => !block.isSetup);
  const brideBlocks = previewBlocks.filter((block) => block.category === "bride");
  if (brideBlocks.length === 0 && sourceBlocks.length > 0) {
    warnings.push("No bride block was detected; mark the bride row clearly before relying on this preview.");
  }
  if (brideBlocks.some((block) => block.end === readyBy) && !previewBlocks.some((block) => block.category === "mother" || block.category === "flower")) {
    warnings.push("Bride is last in this preview because there are no mother or flower girl tail-end blocks.");
  }

  for (let i = 0; i < previewBlocks.length; i++) {
    for (let j = i + 1; j < previewBlocks.length; j++) {
      const a = previewBlocks[i];
      const b = previewBlocks[j];
      const sameName = auditNameKey(a.name) && auditNameKey(a.name) === auditNameKey(b.name);
      if (sameName && previewIntervalsOverlap(a, b)) {
        warnings.push(`${a.name} has overlapping preview blocks across providers.`);
      }
    }
  }

  return {
    lanes: Array.from(lanes.values()),
    warnings: Array.from(new Set(warnings)),
    blockingIssues: Array.from(new Set(blockingIssues)),
    readyBy,
    setupMinutes: setupDuration,
  };
}

function buildScheduleAudit(input: {
  title: string;
  notes: string;
  rows: Row[];
  providers: Provider[];
  serviceDefaults: ServiceDefault[];
  providerColId: string;
  engineMetadata: ScheduleEngineMetadata;
}): ScheduleAuditIssue[] {
  const issues: ScheduleAuditIssue[] = [];
  const usesProductionRequest = Boolean(input.engineMetadata.sourceRequest?.trim());
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
  // Duration expectations may come only from operator-entered service
  // defaults; a label with no entered duration yields no expectation.
  const savedDefaultMinutes = (label: string): number | null => {
    const match = input.serviceDefaults.find((service) => service.label.trim().toLowerCase() === label.toLowerCase());
    return match && match.durationMinutes !== null ? match.durationMinutes : null;
  };
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
        ? `${providerName} has no capability selected. Choose Hair, Makeup, or Hair + makeup.`
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

    if (usesProductionRequest) {
      const provider = providersByName.get(block.provider);
      const timings = provider?.serviceDurations;
      const expected =
        isBride && hasHair && hasMakeup
          ? timings?.primaryClient ?? timings?.hairMakeup
          : hasHair && hasMakeup
            ? timings?.hairMakeup
            : hasHair
              ? timings?.hair
              : hasMakeup
                ? timings?.makeup
                : undefined;
      if (expected) {
        addDurationIssue(issues, block, expected, `${auditBlockLabel(block)} is under ${provider?.name ?? "the assigned artist"}'s baseline timing`);
      }
    } else {
      // Expected minimums come only from the operator's saved service
      // defaults. When no default is entered there is no rule to check
      // against — this audit never invents an expected duration.
      const expectedFromDefaults =
        isBride && hasHair && hasMakeup
          ? savedDefaultMinutes("Bride Hair + Makeup")
          : isBride && hasMakeup
            ? savedDefaultMinutes("Bride Makeup")
            : isBride && hasHair
              ? savedDefaultMinutes("Bride Hair")
              : isMother && hasMakeup
                ? savedDefaultMinutes("Mother Makeup")
                : isMother && hasHair
                  ? savedDefaultMinutes("Mother Hair")
                  : isBridesmaid && hasMakeup
                    ? savedDefaultMinutes("Bridesmaid Makeup")
                    : isBridesmaid && hasHair
                      ? savedDefaultMinutes("Bridesmaid Hair")
                      : null;
      if (expectedFromDefaults !== null) {
        addDurationIssue(issues, block, expectedFromDefaults, `${auditBlockLabel(block)} is under your saved service default`);
      }
    }
  }

  const setupBlocks = blocks.filter(isSetupBlock);
  const setupMin = savedDefaultMinutes("Setup");
  if (setupBlocks.length === 0 && !usesProductionRequest) {
    issues.push({
      id: "missing-setup",
      severity: "warning",
      title: "No setup block found",
      detail: "Add a setup block before services begin; its length comes from your Setup service default.",
    });
  } else {
    for (const block of setupBlocks) {
      if (block.duration === null) {
        issues.push({
          id: `setup-duration-${block.id}`,
          severity: "warning",
          title: "Setup block has no duration",
          detail: setupMin === null
            ? "Enter a setup duration or set a Setup service default — no setup length is assumed."
            : `Your saved Setup default is ${setupMin} minutes; enter a duration on the block.`,
        });
      } else if (setupMin !== null) {
        addDurationIssue(issues, block, setupMin, "Setup block is shorter than your saved Setup default");
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

  if (!usesProductionRequest) {
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

function getScheduleMissingInfo(input: {
  eventDate: string;
  notes: string;
  rows: Row[];
  providers: Provider[];
  serviceDefaults: ServiceDefault[];
  engineMetadata: ScheduleEngineMetadata;
  providerColId: string;
  auditIssues: ScheduleAuditIssue[];
}): ScheduleReadiness {
  const missing: string[] = [];
  const confirmations: string[] = [];
  const addMissing = (message: string) => {
    if (!missing.includes(message)) missing.push(message);
  };
  const addConfirmation = (message: string) => {
    if (!confirmations.includes(message)) confirmations.push(message);
  };

  const blocks = auditBlocksFromRows(input.rows, input.providerColId);
  const serviceBlocks = blocks.filter(isServiceBlock);
  const hasEventDate = Boolean(input.eventDate.trim());
  const hasReadyTime = Boolean(input.engineMetadata.readyByTime?.trim());
  const hasServiceWindow = Boolean(
    input.engineMetadata.readyByTime?.trim() ||
      input.engineMetadata.ceremonyTime?.trim() ||
      input.engineMetadata.firstLookTime?.trim() ||
      input.engineMetadata.photographerArrivalTime?.trim() ||
      serviceBlocks.some((block) => block.end !== null),
  );
  const hasPeople = serviceBlocks.length > 0 || parsePeoplePool(input.notes).length > 0;
  const hasServiceCounts = serviceBlocks.some((block) => auditHasHairService(block.text) || auditHasMakeupService(block.text) || Boolean(block.service));
  const providerNames = new Set(
    [
      ...input.providers.map((provider) => provider.name.trim()),
      ...serviceBlocks.map((block) => block.provider.trim()),
    ].filter(Boolean),
  );

  if (!hasReadyTime) addMissing("Need ready time before finalizing the schedule.");
  if (!hasEventDate) addMissing("Need event date before drafting the schedule.");
  if (!hasServiceWindow) addMissing("Need end time or service window before finalizing the schedule.");
  if (!hasPeople) addMissing("Need number of people receiving services.");
  if (!hasServiceCounts) addMissing("Need service counts before assigning provider lanes.");
  if (hasServiceCounts && providerNames.size === 0) addMissing("Need provider count before assigning lanes.");

  const hasBrideBlock = serviceBlocks.some((block) => hasAuditWord(block.text, /\bbride\b|\bbridal\b/));
  const brideDefault = input.serviceDefaults.find(
    (service) => service.label.trim().toLowerCase() === "bride hair + makeup" && service.durationMinutes !== null,
  );
  if (hasBrideBlock && brideDefault) {
    addConfirmation(`Bride hair + makeup uses your saved ${brideDefault.durationMinutes}-minute default -- confirm.`);
  }
  if (hasBrideBlock) addConfirmation("Bride placement follows the near-end draft rule -- confirm for this event.");

  // A duration with no source is missing information that blocks drafting —
  // never a soft confirmation. Saved operator defaults still get confirmed.
  const hasMakeupDefault = input.serviceDefaults.some((service) => /makeup/i.test(service.label) && service.durationMinutes !== null);
  const hasHairDefault = input.serviceDefaults.some((service) => /\bhair\b/i.test(service.label) && service.durationMinutes !== null);
  const makeupNeedsDuration = serviceBlocks.some((block) => auditHasMakeupService(block.text) && block.duration === null);
  const hairNeedsDuration = serviceBlocks.some((block) => auditHasHairService(block.text) && block.duration === null);
  if (makeupNeedsDuration) {
    if (hasMakeupDefault) addConfirmation("Saved makeup duration default will be used -- confirm.");
    else addMissing("Need makeup durations -- enter them on rows or set a makeup service default.");
  }
  if (hairNeedsDuration) {
    if (hasHairDefault) addConfirmation("Saved hair duration default will be used -- confirm.");
    else addMissing("Need hair durations -- enter them on rows or set a hair service default.");
  }

  // The operator's baseline is their current operating number, not another
  // provider's agreement. When it stands in on a block assigned to a provider
  // who has no saved timing of their own, that provider's confirmation is
  // still outstanding for this event.
  const providersByTrimmedName = new Map(input.providers.map((provider) => [provider.name.trim(), provider]));
  const providerLacksOwnTiming = (block: AuditBlock): boolean => {
    const provider = providersByTrimmedName.get(block.provider.trim());
    const timings = provider?.serviceDurations;
    const hasHair = auditHasHairService(block.text);
    const hasMakeup = auditHasMakeupService(block.text);
    const value = hasHair && hasMakeup ? timings?.hairMakeup : hasHair ? timings?.hair : hasMakeup ? timings?.makeup : undefined;
    return !(typeof value === "number" && value > 0);
  };
  const baselineStandsInForProvider = serviceBlocks.some(
    (block) =>
      Boolean(block.provider.trim()) &&
      block.duration === null &&
      ((auditHasMakeupService(block.text) && hasMakeupDefault) || (auditHasHairService(block.text) && hasHairDefault)) &&
      providerLacksOwnTiming(block),
  );
  if (baselineStandsInForProvider) {
    addConfirmation(
      "Your baseline duration stands in for a provider with no saved timing of their own -- confirm that provider's timing for this event.",
    );
  }

  if (serviceBlocks.some((block) => !block.name.trim() || isStarterScheduleName(block.name) || isPlaceholderName(block.name))) {
    addConfirmation("Missing names are okay; blank/placeholders can be confirmed later.");
  }

  const hasCriticalAuditIssue = input.auditIssues.some((issue) => issue.severity === "critical");
  if (hasCriticalAuditIssue) addConfirmation("Review critical schedule audit issues before finalizing.");

  const prompts = [...missing, ...confirmations];
  const state: ScheduleReadinessState =
    missing.length > 0
      ? "Needs schedule details"
      : hasCriticalAuditIssue
        ? "Needs operator review"
        : confirmations.length > 0
          ? "Ready with assumptions"
          : "Ready to draft";

  return {
    state,
    prompts,
    nextPrompt: prompts[0] ?? "Schedule has enough details to draft. Review before finalizing.",
  };
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
  const [requestText, setRequestText] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showFirstDraftPreview, setShowFirstDraftPreview] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [loadedUpdatedAt, setLoadedUpdatedAt] = useState<string | null>(null);

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
  const linkedInquiryId = draftQuery.data?.inquiryId ?? null;
  const operatorScheduleDefaultsQuery = useQuery<ScheduleOperatorDefaults>({
    queryKey: ["/api/vendor/schedule-defaults"],
    queryFn: async () => {
      const res = await fetch("/api/vendor/schedule-defaults", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load schedule defaults");
      return res.json();
    },
    enabled: isAuthenticated,
    retry: false,
  });
  const linkedInquiryQuery = useQuery<LinkedInquiryContext | null>({
    queryKey: ["/api/inquiries", linkedInquiryId, "schedule-context"],
    queryFn: async () => {
      if (!linkedInquiryId) return null;
      const res = await fetch(`/api/inquiries/${encodeURIComponent(linkedInquiryId)}`, { credentials: "include" });
      if (res.status === 401 || res.status === 403 || res.status === 404) return null;
      if (!res.ok) return null;
      return res.json();
    },
    enabled: Boolean(linkedInquiryId && isAuthenticated),
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
      setRequestText(normalizedEngineMetadata.sourceRequest ?? "");
      setLoadedUpdatedAt(d.updatedAt ?? null);
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
        expectedUpdatedAt: loadedUpdatedAt,
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
      const data = await res.json() as Draft;
      return { data, snapshot };
    },
    onSuccess: ({ data, snapshot }) => {
      setSavedSnapshot(snapshot);
      setLoadedUpdatedAt(data.updatedAt ?? null);
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-drafts", scheduleId] });
      toast({ title: "Schedule saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Could not save", description: err.message, variant: "destructive" });
    },
  });

  const saveOperatorDefaultsMutation = useMutation({
    mutationFn: async () => {
      const payload: ScheduleOperatorDefaults = {
        providers: schedulingProviders(providers),
        protectLeadBeforePrimary: engineMetadata.protectLeadBeforePrimary ?? operatorScheduleDefaultsQuery.data?.protectLeadBeforePrimary ?? true,
        assignPrimaryToLead: engineMetadata.assignPrimaryToLead ?? operatorScheduleDefaultsQuery.data?.assignPrimaryToLead ?? true,
        preferredLayout: "artist_columns",
        allowUnrequestedBuffers: false,
      };
      const res = await fetch("/api/vendor/schedule-defaults", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save schedule defaults");
      }
      return payload;
    },
    onSuccess: (payload) => {
      queryClient.setQueryData(["/api/vendor/schedule-defaults"], payload);
      toast({ title: "Operator defaults saved", description: "New drafts can start from these artist timings. This event remains editable." });
    },
    onError: (err: Error) => {
      toast({ title: "Could not save operator defaults", description: err.message, variant: "destructive" });
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

  // Provider column id used to group rows (blocks) into coordination lanes.
  const providerColId = columns.find((c) => c.type === "provider")?.id ?? "provider";
  const scheduleEvidenceInput = useMemo(
    () =>
      scheduleEvidenceInputFromText(requestText, {
        selectedDay: engineMetadata.evidenceDay || undefined,
        readyTime: engineMetadata.readyByTime || undefined,
        usePlaceholders: engineMetadata.useEvidencePlaceholders,
        includeUnselectedAdditions:
          engineMetadata.evidenceAdditionsMode === "include"
            ? true
            : engineMetadata.evidenceAdditionsMode === "exclude"
              ? false
              : undefined,
      }),
    [
      requestText,
      engineMetadata.evidenceDay,
      engineMetadata.readyByTime,
      engineMetadata.useEvidencePlaceholders,
      engineMetadata.evidenceAdditionsMode,
    ],
  );
  const scheduleEvidenceState = useMemo(
    () => (scheduleEvidenceInput ? reduceScheduleEvidence(scheduleEvidenceInput) : null),
    [scheduleEvidenceInput],
  );
  const parsedScheduleRequest = useMemo(
    () => (scheduleEvidenceState ? parsedScheduleRequestFromEvidence(scheduleEvidenceState) : null),
    [scheduleEvidenceState],
  );
  const fixedScheduleBlocks = useMemo(
    () => fixedScheduleBlocksFromRows(rows, providers, providerColId),
    [rows, providers, providerColId],
  );
  const markedFixedRowCount = useMemo(
    () => rows.filter((row) => row.cells?._fixed === "true").length,
    [rows],
  );
  const productionSchedule = useMemo(
    () =>
      parsedScheduleRequest
        ? generateProductionSchedule(parsedScheduleRequest, {
            readyTime: engineMetadata.readyByTime ?? "",
            earliestStartTime: engineMetadata.venueAccessTime ?? "",
            providers: schedulingProviders(providers),
            assignPrimaryToLead:
              engineMetadata.assignPrimaryToLead ??
              operatorScheduleDefaultsQuery.data?.assignPrimaryToLead ??
              null,
            protectLeadBeforePrimary:
              engineMetadata.protectLeadBeforePrimary ??
              operatorScheduleDefaultsQuery.data?.protectLeadBeforePrimary ??
              true,
            fixedBlocksReviewed:
              Boolean(engineMetadata.fixedBlocksReviewed) && markedFixedRowCount === fixedScheduleBlocks.length,
            fixedBlocks: fixedScheduleBlocks,
            optionalPeopleMode: engineMetadata.optionalPeopleMode ?? "undecided",
            touchupMode: engineMetadata.touchupMode ?? "undecided",
          })
        : null,
    [parsedScheduleRequest, engineMetadata, providers, fixedScheduleBlocks, markedFixedRowCount, operatorScheduleDefaultsQuery.data],
  );
  const unresolvedEvidenceQuestions = (scheduleEvidenceState?.questions ?? []).filter((question) => {
    if (question.id === "ready_time") return !engineMetadata.readyByTime?.trim();
    if (question.id === "artist_count") return providers.length === 0;
    if (question.id === "lead_artist") {
      return !providers.some((provider) => provider.isPrimary) || engineMetadata.assignPrimaryToLead === undefined;
    }
    if (question.id === "provider_timing") {
      return Boolean(productionSchedule?.questions.some((productionQuestion) => productionQuestion.id === "provider_timing"));
    }
    if (question.id === "primary_fixed_block") return !engineMetadata.fixedBlocksReviewed;
    if (question.id === "schedule_day") return !engineMetadata.evidenceDay;
    if (question.id === "additions_inclusion") return (engineMetadata.evidenceAdditionsMode ?? "undecided") === "undecided";
    if (question.id === "placeholder_mode") return !engineMetadata.useEvidencePlaceholders;
    return true;
  });
  const visibleEvidenceReadiness = scheduleEvidenceState?.scheduleReadiness === "conflict_requires_resolution"
    ? "conflict_requires_resolution"
    : unresolvedEvidenceQuestions.length > 0
      ? "needs_operator_input"
      : "ready_for_operator_review";
  const legacyFirstDraftPreview = useMemo(
    () => buildFirstDraftPreview({ rows, providers, serviceDefaults, engineMetadata, providerColId }),
    [rows, providers, serviceDefaults, engineMetadata, providerColId],
  );
  const firstDraftPreview = useMemo(
    () => (productionSchedule ? productionScheduleToPreview(productionSchedule) : legacyFirstDraftPreview),
    [productionSchedule, legacyFirstDraftPreview],
  );
  const hasFirstDraftPreview = firstDraftPreview.lanes.length > 0;
  const hasFirstDraftServiceBlocks = firstDraftHasMeaningfulServiceBlocks(firstDraftPreview);
  const rowsCanAcceptFirstDraftPreview = isEmptyOrPlaceholderOnlyRows(rows, providerColId);
  const evidenceBlocksPreview = Boolean(
    scheduleEvidenceState && (
      visibleEvidenceReadiness === "conflict_requires_resolution" ||
      unresolvedEvidenceQuestions.some((question) => [
        "schedule_day",
        "roster",
        "service_breakdown",
        "additions_inclusion",
        "corrected_start_time",
        "ready_time_scope",
        "separate_room_assignment",
        "blowout_scope",
      ].includes(question.id))
    ),
  );
  const blockingProductionWarnings = productionSchedule?.warnings.filter((warning) => warning.blocking) ?? [];
  const advisoryFirstDraftWarnings = productionSchedule
    ? productionSchedule.warnings.filter((warning) => !warning.blocking).map((warning) => warning.message)
    : firstDraftPreview.warnings;
  const productionBlocksPreview = blockingProductionWarnings.length > 0;
  // Sourceless durations are a hard stop, not a confirmation: a preview built
  // on unknown durations can never be applied to editable rows.
  const unsourcedPreviewIssues = productionSchedule ? [] : firstDraftPreview.blockingIssues;
  const unsourcedBlocksPreview = unsourcedPreviewIssues.length > 0;
  const canApplyFirstDraftPreview =
    hasFirstDraftPreview &&
    hasFirstDraftServiceBlocks &&
    rowsCanAcceptFirstDraftPreview &&
    !evidenceBlocksPreview &&
    !productionBlocksPreview &&
    !unsourcedBlocksPreview;
  const firstDraftApplyMessage = evidenceBlocksPreview
    ? "Resolve the private evidence warnings and blocking questions before applying a preview."
    : productionBlocksPreview
      ? `Resolve production blockers before applying: ${blockingProductionWarnings[0].message}`
      : unsourcedBlocksPreview
        ? `Blocked until every duration has a source: ${unsourcedPreviewIssues[0]}`
        : !hasFirstDraftPreview
          ? "Generate a first draft preview before applying it."
          : !hasFirstDraftServiceBlocks
            ? "Add service blocks before applying a preview."
            : !rowsCanAcceptFirstDraftPreview
              ? "Apply is locked because editable rows already contain manual details."
              : "Ready to copy preview blocks into editable rows. Save draft after review.";

  // Name pool ("People to assign") lives inside notes as one delimited line so
  // no schema changes are needed. Parse it out for its own section and keep the
  // rest of the notes clean in the Notes box.
  const peopleToAssign = parsePeoplePool(notes);
  const notesBody = stripPeoplePool(notes);
  const setNotesBody = (body: string) => setNotes(composeNotes(body, peopleToAssign));
  const setPeopleToAssign = (names: string[]) => setNotes(composeNotes(notesBody, names));
  const isInquiryHandoffDraft = Boolean(draftQuery.data?.inquiryId);
  const linkedInquiryScheduleContext = buildLinkedInquiryScheduleContext(linkedInquiryQuery.data);
  const linkedInquiryScheduleContextLoading = Boolean(linkedInquiryId && linkedInquiryQuery.status === "pending");
  const inquiryHandoffContext = useMemo(
    () => buildInquiryHandoffContext({
      eventDate,
      location,
      notesBody,
      linkedScheduleContext: linkedInquiryScheduleContext,
      linkedScheduleContextLoading: linkedInquiryScheduleContextLoading,
    }),
    [eventDate, location, notesBody, linkedInquiryScheduleContext, linkedInquiryScheduleContextLoading],
  );

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

  const applyFirstDraftPreviewToRows = () => {
    if (!canApplyFirstDraftPreview) return;
    if (!window.confirm("Apply this preview to editable rows? This only changes the local draft. Save draft is still required.")) return;
    const nextRows = firstDraftPreviewToRows(firstDraftPreview, columns, providerColId);
    if (nextRows.length === 0) return;
    setRows(nextRows);
    toast({ title: "Preview applied", description: "Review and save when ready." });
  };

  const updateRequestText = (value: string) => {
    setRequestText(value);
    setEngineMetadata((prev) => ({
      ...prev,
      sourceRequest: value,
      evidenceDay: "",
      useEvidencePlaceholders: false,
      evidenceAdditionsMode: "undecided",
    }));
  };

  const applyPaste = () => {
    const built = buildScheduleFromInput(pasteText, serviceDefaults);
    const { providers: laneDefs, blocks, personRows, namePool } = built;
    if (laneDefs.length === 0 && blocks.length === 0 && personRows.length === 0) {
      toast({ title: "Nothing to add", description: "Try adding a schedule type and counts, like: wedding beauty, 8 makeup, 5 hair, 3 providers" });
      return;
    }
    // Provider lanes (Provider 1, Provider 2, etc.; capability stays separate).
    if (laneDefs.length > 0) {
      const newProviders: Provider[] = laneDefs.map((l) => ({ id: uid("prov"), name: l.name, capability: l.capability ?? "" }));
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
    setServiceDefaults((prev) => [...prev, { id: uid("svc"), label: "Custom service", durationMinutes: null }]);
  const updateServiceDefault = (id: string, patch: Partial<ServiceDefault>) =>
    setServiceDefaults((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const deleteServiceDefault = (id: string) =>
    setServiceDefaults((prev) => prev.filter((s) => s.id !== id));

  // Providers editing
  const addProvider = () =>
    setProviders((prev) => [...prev, { id: uid("prov"), name: `Service Role ${prev.length + 1}`, capability: "", isPrimary: false }]);
  const updateProvider = (id: string, patch: Partial<Provider>) =>
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const updateProviderDuration = (id: string, field: keyof ProviderServiceDurations, value: string) => {
    const minutes = Number(value);
    setProviders((prev) =>
      prev.map((provider) => {
        if (provider.id !== id) return provider;
        const serviceDurations = { ...(provider.serviceDurations ?? {}) };
        if (Number.isFinite(minutes) && minutes > 0) serviceDurations[field] = Math.floor(minutes);
        else delete serviceDurations[field];
        return { ...provider, serviceDurations };
      }),
    );
  };
  const deleteProvider = (id: string) => setProviders((prev) => prev.filter((p) => p.id !== id));
  const loadOperatorDefaults = () => {
    const defaults = operatorScheduleDefaultsQuery.data;
    if (!defaults) return;
    setProviders(
      defaults.providers.map((provider) => ({
        id: provider.id,
        name: provider.name,
        capability: provider.capability,
        isPrimary: provider.isLead,
        serviceDurations: provider.serviceDurations,
      })),
    );
    setEngineMetadata((prev) => ({
      ...prev,
      assignPrimaryToLead: defaults.assignPrimaryToLead,
      protectLeadBeforePrimary: defaults.protectLeadBeforePrimary,
    }));
    toast({ title: "Operator defaults loaded", description: "These values are event overrides until you save the draft." });
  };

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
          <Link href={`/admin/${slug}${authParam}`} className="underline text-ink" data-testid="link-back-workspace">
            Back to workspace
          </Link>
        </div>
      </div>
    );
  }

  // Group rows into coordination lanes. Order: providers list first, then any extra
  // provider values seen on rows, then an "Unassigned" lane for blocks with no
  // provider. Fields shown per block are all columns except the provider column
  // (the provider is the lane itself, edited via the block's Lane field).
  const laneFields = columns.filter((c) => c.id !== providerColId);
  const laneSlug = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "lane";
  const laneNames: string[] = [];
  const laneSeen = new Set<string>();
  const providersByName = new Map(providers.map((provider) => [provider.name.trim(), provider]));
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
  const laneList = laneNames.map((name, index) => ({
    key: laneSlug(name),
    label: normalizeScheduleLaneLabel(name, providersByName.get(name)?.capability, index + 1),
    provider: name,
    rows: rows.filter((r) => (r.cells[providerColId] ?? "").trim() === name),
  }));
  const unassignedRows = rows.filter((r) => !(r.cells[providerColId] ?? "").trim());
  if (unassignedRows.length > 0) {
    laneList.push({ key: "unassigned", label: "Needs provider assignment", provider: "", rows: unassignedRows });
  }
  const auditIssues = buildScheduleAudit({ title, notes, rows, providers, serviceDefaults, providerColId, engineMetadata });
  const scheduleReadiness = getScheduleMissingInfo({
    eventDate,
    notes,
    rows,
    providers,
    serviceDefaults,
    engineMetadata,
    providerColId,
    auditIssues,
  });

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-10 py-8 sm:py-10">
        <Link
          href={`/admin/${slug}${authParam}`}
          onClick={confirmLeaveIfDirty}
          className="inline-flex items-center gap-2 text-sm text-ink/70 hover:text-ink mb-6"
          data-testid="link-back-workspace"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to workspace
        </Link>

        <header className="mb-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-serif text-3xl tracking-tight mb-2" data-testid="text-page-title">
              Schedule coordination draft
            </h1>
            <p className="text-ink/70 max-w-[70ch]">
              Map the day as editable coordination lanes for the service roles involved. Nothing is
              sent and there is no client link. Add blocks, adjust timing, and save when ready.
            </p>
          </div>
          <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end sm:shrink-0">
            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <button
                onClick={() => setShowPreview(true)}
                className="inline-flex flex-1 items-center justify-center gap-2 border border-hairline px-4 py-2 hover:bg-surface sm:flex-none"
                data-testid="button-preview"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="inline-flex flex-1 items-center justify-center gap-2 bg-ink text-bg px-4 py-2 disabled:opacity-60 sm:flex-none"
                data-testid="button-save"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save draft
              </button>
            </div>
            {isDirty ? (
              <span className="text-xs text-oxblood sm:text-right" data-testid="status-unsaved">
                Unsaved changes
              </span>
            ) : (
              <span className="text-xs text-ink/45 sm:text-right" data-testid="status-saved">
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

            {isInquiryHandoffDraft && (
              <section className="border border-hairline bg-surface p-6" data-testid="section-inquiry-schedule-handoff">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-serif text-xl tracking-tight">Inquiry schedule handoff</h2>
                    <p className="mt-1 text-sm text-ink/60">
                      This private draft was opened from an inquiry. Treat carried context as draft context to confirm, not final schedule truth.
                    </p>
                  </div>
                  <span className="inline-flex w-fit border border-hairline bg-bg px-2.5 py-1 text-xs uppercase tracking-wide text-ink/55">
                    Private draft
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div className="border border-hairline bg-bg px-3 py-2">
                    <dt className="text-xs uppercase tracking-wide text-ink/45">Date</dt>
                    <dd className="mt-1 text-ink/75 break-words">{inquiryHandoffContext.date}</dd>
                  </div>
                  <div className="border border-hairline bg-bg px-3 py-2">
                    <dt className="text-xs uppercase tracking-wide text-ink/45">Location</dt>
                    <dd className="mt-1 text-ink/75 break-words">{inquiryHandoffContext.location}</dd>
                  </div>
                  <div className="border border-hairline bg-bg px-3 py-2">
                    <dt className="text-xs uppercase tracking-wide text-ink/45">Schedule context</dt>
                    <dd className="mt-1 text-ink/75 break-words">{inquiryHandoffContext.scheduleContext}</dd>
                  </div>
                  <div className="border border-hairline bg-bg px-3 py-2">
                    <dt className="text-xs uppercase tracking-wide text-ink/45">Notes</dt>
                    <dd className="mt-1 text-ink/75 whitespace-pre-wrap break-words">{inquiryHandoffContext.notes}</dd>
                  </div>
                </dl>
                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-ink/55 sm:grid-cols-2">
                  <div className="border border-hairline bg-bg px-3 py-2">
                    Missing schedule details are still expected; ready time is usually the next key schedule detail.
                  </div>
                  <div className="border border-hairline bg-bg px-3 py-2">
                    Nothing sends from this draft and no client link exists.
                  </div>
                </div>
              </section>
            )}

            <section className="border border-hairline bg-surface p-6 sm:p-8" data-testid="section-request-intake">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-serif text-xl tracking-tight">Request intake</h2>
                  <p className="mt-1 max-w-[70ch] text-sm text-ink/60">
                    Paste the inbound request as it arrived. Briarwood separates confirmed people, optional people, services, constraints, and quote-only requests before it builds a schedule.
                  </p>
                </div>
                <span className="inline-flex w-fit border border-hairline bg-bg px-2.5 py-1 text-xs uppercase tracking-wide text-ink/55">
                  Private draft input
                </span>
              </div>
              <textarea
                value={requestText}
                onChange={(event) => updateRequestText(event.target.value)}
                rows={10}
                placeholder="Paste the email, text thread summary, or service request here."
                className="mt-5 w-full border border-hairline bg-bg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                data-testid="input-source-request"
              />
              <p className="mt-2 text-xs text-ink/50">
                Extraction is deterministic and editable through the source request. It does not send, contact anyone, create contracted work, or publish a schedule.
              </p>

              {scheduleEvidenceState && (
                <div className="mt-5 border-t border-hairline pt-5" data-testid="section-schedule-evidence-review">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-medium">Evidence review</h3>
                      <p className="mt-1 text-xs text-ink/55">
                        Current private state reduced from the pasted evidence. Review corrections and blockers before applying a schedule preview.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wide text-ink/55">
                      <span className="border border-hairline bg-bg px-2 py-1">{scheduleEvidenceState.sourceKind.replace(/_/g, " ")}</span>
                      <span className="border border-hairline bg-bg px-2 py-1" data-testid="status-evidence-readiness">
                        {visibleEvidenceReadiness.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>

                  {(scheduleEvidenceState.dayContexts.length > 1 || scheduleEvidenceState.placeholderScheduleAllowed || scheduleEvidenceState.scheduleableSpreadsheetRows.some((row) => row.section === "additions")) && (
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3" data-testid="section-evidence-decisions">
                      {scheduleEvidenceState.dayContexts.length > 1 && (
                        <label className="block">
                          <span className="text-xs uppercase tracking-wide text-ink/50">Schedule day</span>
                          <select
                            value={engineMetadata.evidenceDay ?? ""}
                            onChange={(event) => setEngineMetadata((prev) => ({ ...prev, evidenceDay: event.target.value }))}
                            className="mt-1 w-full border border-hairline bg-bg px-3 py-2 text-sm"
                            data-testid="select-evidence-day"
                          >
                            <option value="">Choose a day</option>
                            {scheduleEvidenceState.dayContexts.map((day) => (
                              <option key={day} value={day}>{day.replace(/_/g, " ")}</option>
                            ))}
                          </select>
                        </label>
                      )}
                      {scheduleEvidenceState.placeholderScheduleAllowed && (
                        <label className="block">
                          <span className="text-xs uppercase tracking-wide text-ink/50">Count-only roster</span>
                          <select
                            value={engineMetadata.useEvidencePlaceholders ? "include" : "undecided"}
                            onChange={(event) => setEngineMetadata((prev) => ({ ...prev, useEvidencePlaceholders: event.target.value === "include" }))}
                            className="mt-1 w-full border border-hairline bg-bg px-3 py-2 text-sm"
                            data-testid="select-evidence-placeholders"
                          >
                            <option value="undecided">Names and services required</option>
                            <option value="include">Use working placeholders</option>
                          </select>
                          {engineMetadata.useEvidencePlaceholders && scheduleEvidenceState.placeholderLabel && (
                            <span className="mt-1 block text-xs text-ink/55">{scheduleEvidenceState.placeholderLabel}</span>
                          )}
                        </label>
                      )}
                      {scheduleEvidenceState.scheduleableSpreadsheetRows.some((row) => row.section === "additions") && (
                        <label className="block">
                          <span className="text-xs uppercase tracking-wide text-ink/50">Spreadsheet additions</span>
                          <select
                            value={engineMetadata.evidenceAdditionsMode ?? "undecided"}
                            onChange={(event) => setEngineMetadata((prev) => ({ ...prev, evidenceAdditionsMode: event.target.value as ScheduleEngineMetadata["evidenceAdditionsMode"] }))}
                            className="mt-1 w-full border border-hairline bg-bg px-3 py-2 text-sm"
                            data-testid="select-evidence-additions"
                          >
                            <option value="undecided">Review additions</option>
                            <option value="exclude">Keep unselected</option>
                            <option value="include">Include additions</option>
                          </select>
                        </label>
                      )}
                    </div>
                  )}

                  <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3" data-testid="summary-schedule-evidence">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-ink/45">Current people</dt>
                      <dd className="mt-0.5 text-ink/75">{scheduleEvidenceState.confirmedPeople.length} confirmed, {scheduleEvidenceState.optionalPeople.length} optional</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-ink/45">Source count</dt>
                      <dd className="mt-0.5 text-ink/75">{scheduleEvidenceState.declaredPeopleCount ?? "Not stated"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-ink/45">Artist count</dt>
                      <dd className="mt-0.5 text-ink/75">{scheduleEvidenceState.artistCount ?? "Not stated"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-ink/45">Candidate blocks</dt>
                      <dd className="mt-0.5 text-ink/75">{scheduleEvidenceState.candidateBlocks.length}</dd>
                    </div>
                    {scheduleEvidenceState.scheduleableSpreadsheetRows.length > 0 && (
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-ink/45">Spreadsheet rows</dt>
                        <dd className="mt-0.5 text-ink/75">
                          {scheduleEvidenceState.scheduleableSpreadsheetRows.filter((row) => row.active).length} active services; {scheduleEvidenceState.ignoredSpreadsheetRowIds.length} non-service rows ignored
                        </dd>
                      </div>
                    )}
                    {scheduleEvidenceState.externalLinksIgnored && (
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-ink/45">External references</dt>
                        <dd className="mt-0.5 text-ink/75">Link recorded as evidence only; nothing fetched</dd>
                      </div>
                    )}
                  </dl>

                  {scheduleEvidenceState.readyConstraints.length > 0 && (
                    <div className="mt-4" data-testid="list-evidence-ready-constraints">
                      <h4 className="text-xs uppercase tracking-wide text-ink/45">Readiness constraints</h4>
                      <ul className="mt-2 space-y-1.5 text-sm text-ink/70">
                        {scheduleEvidenceState.readyConstraints.map((constraint, index) => (
                          <li key={`${constraint.sourceId}-${constraint.kind}-${index}`}>
                            {constraint.personLabel ?? constraint.personName ?? constraint.scope}: {constraint.kind} by {constraint.time}
                            {constraint.dayContext ? ` (${constraint.dayContext.replace(/_/g, " ")})` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {scheduleEvidenceState.locations.length > 0 && (
                    <div className="mt-4" data-testid="list-evidence-locations">
                      <h4 className="text-xs uppercase tracking-wide text-ink/45">Locations</h4>
                      <ul className="mt-2 space-y-1.5 text-sm text-ink/70">
                        {scheduleEvidenceState.locations.map((entry) => (
                          <li key={`${entry.kind}-${entry.value}`}>{entry.kind.replace(/_/g, " ")}: {entry.value}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {scheduleEvidenceState.removedPeople.length > 0 && (
                    <div className="mt-4" data-testid="list-removed-evidence-people">
                      <h4 className="text-xs uppercase tracking-wide text-ink/45">Removed by later correction</h4>
                      <ul className="mt-2 space-y-1.5 text-sm text-ink/70">
                        {scheduleEvidenceState.removedPeople.map((person) => (
                          <li key={`${person.sourceId}-${person.name}`}>{person.name}: {person.reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {scheduleEvidenceState.warnings.length > 0 && (
                    <div className="mt-4 border-l-2 border-oxblood pl-3" data-testid="list-evidence-warnings">
                      <h4 className="text-xs uppercase tracking-wide text-oxblood">Warnings and conflicts</h4>
                      <ul className="mt-2 space-y-2 text-sm text-ink/75">
                        {scheduleEvidenceState.warnings.map((warning, index) => (
                          <li key={`${warning.code}-${index}`}>{warning.message}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {unresolvedEvidenceQuestions.length > 0 && (
                    <div className="mt-4" data-testid="list-evidence-questions">
                      <h4 className="text-xs uppercase tracking-wide text-ink/45">Missing evidence to confirm</h4>
                      <ul className="mt-2 space-y-1.5 text-sm text-ink/70">
                        {unresolvedEvidenceQuestions.map((question) => (
                          <li key={question.id}>{question.prompt}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="mt-4 text-xs text-ink/50">
                    Evidence review does not approve, send, publish, create a client link, or make a provider commitment.
                  </p>
                </div>
              )}

              {parsedScheduleRequest && (
                <div className="mt-6 space-y-6" data-testid="panel-parsed-request">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="border border-hairline bg-bg p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-medium">Confirmed people</h3>
                        <span className="text-xs text-ink/50">{parsedScheduleRequest.confirmedPeople.length}</span>
                      </div>
                      <ul className="mt-3 space-y-2" data-testid="list-confirmed-people">
                        {parsedScheduleRequest.confirmedPeople.map((person) => (
                          <li key={person.id} className="border-t border-hairline pt-2 first:border-0 first:pt-0">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <span className="text-sm font-medium">{person.name}</span>
                              <span className="text-xs text-ink/50">{person.roleLabel}</span>
                            </div>
                            <p className="mt-0.5 text-xs text-ink/60">
                              {person.services.length > 0 ? person.services.map(serviceLabel).join(" + ") : "Service details to confirm"}
                            </p>
                            {(person.notes.length > 0 || person.constraints.length > 0) && (
                              <p className="mt-1 text-xs text-ink/50">
                                {Array.from(new Set([...person.notes, ...person.constraints.map((constraint) => constraint.detail)])).join("; ")}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="border border-hairline bg-bg p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-medium">Optional people</h3>
                        <span className="text-xs text-ink/50">{parsedScheduleRequest.optionalPeople.length}</span>
                      </div>
                      {parsedScheduleRequest.optionalPeople.length === 0 ? (
                        <p className="mt-3 text-sm text-ink/50">No optional people detected.</p>
                      ) : (
                        <ul className="mt-3 space-y-2" data-testid="list-optional-people">
                          {parsedScheduleRequest.optionalPeople.map((person) => (
                            <li key={person.id} className="border-t border-hairline pt-2 text-sm first:border-0 first:pt-0">
                              <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <span className="font-medium">{person.name}</span>
                                <span className="text-xs text-ink/50">{person.roleLabel}</span>
                              </div>
                              <p className="mt-0.5 text-xs text-ink/60">
                                {person.services.length > 0 ? person.services.map(serviceLabel).join(" + ") : "Service details to confirm"}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {parsedScheduleRequest.quoteOnlyRequests.length > 0 && (
                    <div className="border border-hairline bg-bg p-4" data-testid="section-quote-only-scenarios">
                      <h3 className="text-sm font-medium">Quote-only add-on scenarios</h3>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {parsedScheduleRequest.quoteOnlyRequests.map((scenario) => (
                          <div key={scenario.id} className="border border-hairline bg-surface px-3 py-2">
                            <p className="text-sm font-medium">{scenario.label}</p>
                            <p className="mt-1 text-xs text-ink/55">
                              {scenario.participants.length > 0 ? scenario.participants.join(", ") : "Participants to confirm"}
                            </p>
                            <p className="mt-1 text-xs text-ink/50">Not placed on the schedule without a fixed time and duration.</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="section-production-decisions">
                    <label className="block">
                      <span className="text-xs uppercase tracking-wide text-ink/50">Primary client assignment</span>
                      <select
                        value={
                          engineMetadata.assignPrimaryToLead === undefined
                            ? operatorScheduleDefaultsQuery.data?.assignPrimaryToLead === undefined
                              ? "undecided"
                              : operatorScheduleDefaultsQuery.data.assignPrimaryToLead ? "lead" : "flexible"
                            : engineMetadata.assignPrimaryToLead ? "lead" : "flexible"
                        }
                        onChange={(event) =>
                          setEngineMetadata((prev) => ({
                            ...prev,
                            assignPrimaryToLead: event.target.value === "undecided" ? undefined : event.target.value === "lead",
                          }))
                        }
                        className="mt-1 w-full border border-hairline bg-bg px-3 py-2 text-sm"
                        data-testid="select-primary-assignment"
                      >
                        <option value="undecided">Confirm assignment</option>
                        <option value="lead">Assign to lead artist</option>
                        <option value="flexible">Operator will assign</option>
                      </select>
                    </label>
                    {parsedScheduleRequest.optionalPeople.length > 0 && (
                      <label className="block">
                        <span className="text-xs uppercase tracking-wide text-ink/50">Optional people</span>
                        <select
                          value={engineMetadata.optionalPeopleMode ?? "undecided"}
                          onChange={(event) => setEngineMetadata((prev) => ({ ...prev, optionalPeopleMode: event.target.value as ScheduleEngineMetadata["optionalPeopleMode"] }))}
                          className="mt-1 w-full border border-hairline bg-bg px-3 py-2 text-sm"
                          data-testid="select-optional-people-mode"
                        >
                          <option value="undecided">Choose for this event</option>
                          <option value="exclude">Keep as quote add-ons</option>
                          <option value="include">Include in schedule</option>
                        </select>
                      </label>
                    )}
                    {parsedScheduleRequest.quoteOnlyRequests.length > 0 && (
                      <label className="block">
                        <span className="text-xs uppercase tracking-wide text-ink/50">Touchups</span>
                        <select
                          value={engineMetadata.touchupMode ?? "undecided"}
                          onChange={(event) => setEngineMetadata((prev) => ({ ...prev, touchupMode: event.target.value as ScheduleEngineMetadata["touchupMode"] }))}
                          className="mt-1 w-full border border-hairline bg-bg px-3 py-2 text-sm"
                          data-testid="select-touchup-mode"
                        >
                          <option value="undecided">Choose for this event</option>
                          <option value="quote_only">Quote only</option>
                          <option value="schedule_fixed_only">Schedule fixed blocks only</option>
                        </select>
                      </label>
                    )}
                    <label className="inline-flex items-start gap-2 border border-hairline bg-bg px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(engineMetadata.fixedBlocksReviewed)}
                        onChange={(event) => setEngineMetadata((prev) => ({ ...prev, fixedBlocksReviewed: event.target.checked }))}
                        className="mt-0.5 h-4 w-4 accent-oxblood"
                        data-testid="checkbox-fixed-blocks-reviewed"
                      />
                      <span>
                        Fixed blocks reviewed
                        <span className="mt-0.5 block text-xs text-ink/50">
                          {markedFixedRowCount > fixedScheduleBlocks.length
                            ? "Complete the name, service, lane, start, and end for every marked fixed row."
                            : "Mark any fixed row below with its Fixed time checkbox."}
                        </span>
                      </span>
                    </label>
                    <label className="inline-flex items-start gap-2 border border-hairline bg-bg px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={engineMetadata.protectLeadBeforePrimary ?? operatorScheduleDefaultsQuery.data?.protectLeadBeforePrimary ?? true}
                        onChange={(event) => setEngineMetadata((prev) => ({ ...prev, protectLeadBeforePrimary: event.target.checked }))}
                        className="mt-0.5 h-4 w-4 accent-oxblood"
                        data-testid="checkbox-protect-lead"
                      />
                      <span>Protect the lead artist before the primary client block</span>
                    </label>
                  </div>

                  {productionSchedule && productionSchedule.questions.length > 0 && (
                    <div className="border border-brass/40 bg-brass/10 p-4" data-testid="section-production-questions">
                      <h3 className="text-sm font-medium">Needed before scheduling</h3>
                      <ul className="mt-2 space-y-1.5 text-sm text-ink/70">
                        {productionSchedule.questions.map((question, index) => (
                          <li key={`${question.id}-${index}`}>{question.prompt}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="border border-hairline bg-surface p-6" data-testid="section-schedule-readiness">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-serif text-xl tracking-tight">Schedule readiness</h2>
                  <p className="mt-1 text-sm text-ink/60">
                    Briarwood starts with the schedule type, then checks timing anchors, people, services, provider lanes, and assumptions before finalizing a schedule. Nothing sends from this card.
                  </p>
                </div>
                <span className={`inline-flex w-fit border px-2.5 py-1 text-xs uppercase tracking-wide ${SCHEDULE_READINESS_STYLES[scheduleReadiness.state]}`} data-testid="status-schedule-readiness">
                  {scheduleReadiness.state}
                </span>
              </div>

              <div className="mt-4 border border-hairline bg-bg px-4 py-3" data-testid="text-schedule-next-prompt">
                <p className="text-xs uppercase tracking-wide text-ink/45">Next schedule detail</p>
                <p className="mt-1 text-sm text-ink/75">{scheduleReadiness.nextPrompt}</p>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-ink/55 sm:grid-cols-2" data-testid="list-schedule-readiness-rules">
                <div className="border border-hairline bg-bg px-3 py-2">
                  Ready time is the anchor; the final service ends there by default.
                </div>
                <div className="border border-hairline bg-bg px-3 py-2">
                  Optional: finish 15 minutes early for touch-ups and notes.
                </div>
                <div className="border border-hairline bg-bg px-3 py-2">
                  Missing names are allowed; blanks and placeholders stay editable.
                </div>
                <div className="border border-hairline bg-bg px-3 py-2">
                  Bride timing comes only from your entries; placement is a draft rule to confirm, not a universal rule.
                </div>
                <div className="border border-hairline bg-bg px-3 py-2">
                  Same-person service blocks are checked so they do not overlap.
                </div>
                <div className="border border-hairline bg-bg px-3 py-2">
                  Unknown provider capability means operator confirmation is still needed.
                </div>
              </div>

              {scheduleReadiness.prompts.length > 1 && (
                <ul className="mt-3 space-y-2" data-testid="list-schedule-readiness-prompts">
                  {scheduleReadiness.prompts.slice(1).map((prompt) => (
                    <li key={prompt} className="border border-hairline bg-bg px-3 py-2 text-sm text-ink/65">
                      {prompt}
                    </li>
                  ))}
                </ul>
              )}
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

            <section className="border border-hairline bg-surface p-6" data-testid="section-first-draft-preview">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-serif text-xl tracking-tight">
                    {productionSchedule ? "Production schedule preview" : "First draft preview"}
                  </h2>
                  <p className="mt-1 text-sm text-ink/60">
                    {productionSchedule
                      ? "Each artist column is an independent timeline. Times stay inside each service block; rows are only visual stacking. The preview uses the pasted request, artist-specific timing, fixed blocks, and ready time without inventing staff, gaps, or buffers."
                      : "Preview works backward from ready time. Lane headers use provider/service-lane metadata; role, person, and service details stay inside timed blocks. Domain-specific rules apply when the schedule type is known or inferred. Preview stays separate until applied."}
                  </p>
                </div>
                <button
                  onClick={() => setShowFirstDraftPreview((value) => !value)}
                  className="inline-flex items-center justify-center gap-2 border border-hairline px-3 py-2 text-sm hover:bg-bg"
                  data-testid="button-first-draft-preview"
                >
                  <Eye className="w-4 h-4" />
                  {showFirstDraftPreview ? "Hide preview" : "Generate preview"}
                </button>
              </div>

              {showFirstDraftPreview && (
                <div className="mt-5 space-y-5" data-testid="panel-first-draft-preview">
                  <div className="flex flex-wrap gap-2 text-xs text-ink/55">
                    <span className="border border-hairline bg-bg px-2.5 py-1">
                      Ready by: {firstDraftPreview.readyBy === null ? "Pending" : formatClockTime(firstDraftPreview.readyBy)}
                    </span>
                    {!productionSchedule && (
                      <span className="border border-hairline bg-bg px-2.5 py-1">
                        {firstDraftPreview.setupMinutes === null
                          ? "Setup: unknown — set a Setup service default"
                          : `Setup: ${firstDraftPreview.setupMinutes} min`}
                      </span>
                    )}
                  </div>

                  {productionSchedule && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="production-schedule-summary">
                      <div className="border border-hairline bg-bg p-4">
                        <h3 className="text-sm font-medium">Service count</h3>
                        {Object.keys(productionSchedule.serviceCounts).length === 0 ? (
                          <p className="mt-2 text-sm text-ink/50">Answer the production questions to calculate services.</p>
                        ) : (
                          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            {Object.entries(productionSchedule.serviceCounts).map(([label, count]) => (
                              <div key={label} className="contents">
                                <dt className="text-ink/60">{label}</dt>
                                <dd className="text-right font-medium">{count}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </div>
                      <div className="border border-hairline bg-bg p-4">
                        <h3 className="text-sm font-medium">Artist assignments</h3>
                        <ul className="mt-2 space-y-1 text-sm">
                          {productionSchedule.assignmentSummary.map((assignment) => (
                            <li key={assignment.providerId} className="flex items-baseline justify-between gap-3">
                              <span className="text-ink/60">{assignment.providerName}</span>
                              <span>{assignment.serviceCount} blocks / {assignment.totalServiceMinutes} min</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 border border-hairline bg-bg px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-ink/60" data-testid="text-first-draft-apply-status">
                      {firstDraftApplyMessage}
                    </p>
                    <button
                      onClick={applyFirstDraftPreviewToRows}
                      disabled={!canApplyFirstDraftPreview}
                      className="inline-flex items-center justify-center gap-2 border border-hairline px-3 py-2 text-sm hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                      data-testid="button-apply-first-draft-preview"
                    >
                      <Plus className="w-4 h-4" />
                      Apply preview to editable rows
                    </button>
                  </div>

                  {unsourcedPreviewIssues.length > 0 && (
                    <div className="border border-oxblood/40 bg-oxblood/10 p-4" data-testid="list-unsourced-duration-blockers">
                      <h3 className="text-sm font-medium text-oxblood">Blocked — durations without a source</h3>
                      <ul className="mt-2 space-y-1.5 text-sm text-ink/75">
                        {unsourcedPreviewIssues.map((issue, index) => (
                          <li key={`${issue}-${index}`} data-testid={`unsourced-duration-blocker-${index}`}>
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {blockingProductionWarnings.length > 0 && (
                    <div className="border border-oxblood/40 bg-oxblood/10 p-4" data-testid="list-production-blockers">
                      <h3 className="text-sm font-medium text-oxblood">Resolve before applying</h3>
                      <ul className="mt-2 space-y-1.5 text-sm text-ink/75">
                        {blockingProductionWarnings.map((warning, index) => (
                          <li key={`${warning.code}-${warning.message}`} data-testid={`production-blocker-${index}`}>
                            {warning.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {advisoryFirstDraftWarnings.length > 0 && (
                    <ul className="space-y-2" data-testid="list-first-draft-warnings">
                      {advisoryFirstDraftWarnings.map((warning, index) => (
                        <li
                          key={`${warning}-${index}`}
                          className="border border-brass/40 bg-brass/10 px-3 py-2 text-sm text-ink/70"
                          data-testid={`first-draft-warning-${index}`}
                        >
                          {warning}
                        </li>
                      ))}
                    </ul>
                  )}

                  {firstDraftPreview.lanes.length === 0 ? (
                    <p className="border border-hairline bg-bg px-4 py-3 text-sm text-ink/50" data-testid="text-first-draft-empty">
                      No preview blocks yet.
                    </p>
                  ) : (
                    <div className="grid grid-flow-col auto-cols-[minmax(270px,1fr)] gap-5 items-start overflow-x-auto pb-2" data-testid="grid-first-draft-lanes">
                      {firstDraftPreview.lanes.map((lane) => (
                        <div key={lane.provider} className="border border-hairline bg-bg rounded-sm" data-testid={`first-draft-lane-${auditId(lane.provider)}`}>
                          <div className="border-b border-hairline px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="font-serif text-lg tracking-tight">{lane.label}</h3>
                              <div className="flex flex-wrap justify-end gap-1.5">
                                <span className="border border-hairline px-2 py-0.5 text-[10px] uppercase tracking-wide text-ink/50">
                                  {providerCapabilityLabel(lane.capability)}
                                </span>
                                {lane.isPrimary && (
                                  <span className="border border-brass/40 bg-brass/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ink/60">
                                    Primary
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="p-3 space-y-3">
                            {lane.blocks.map((block) => (
                              <div
                                key={block.id}
                                className={`rounded-sm border px-3 py-2.5 ${
                                  block.category === "bride"
                                    ? "border-brass bg-surface"
                                    : block.isSetup
                                      ? "border-ink/20 bg-surface"
                                      : "border-hairline bg-surface"
                                }`}
                                data-testid={`first-draft-block-${auditId(block.id)}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-medium text-ink">{block.name || block.service || "Unassigned"}</p>
                                    {block.service && block.service !== block.name && (
                                      <p className="text-xs text-ink/55">{block.service}</p>
                                    )}
                                  </div>
                                  <div className="text-right text-xs text-ink/55 whitespace-nowrap">
                                    {block.start === null || block.end === null ? (
                                      <span>Time pending</span>
                                    ) : (
                                      <span>
                                        {formatClockTime(block.start)} - {formatClockTime(block.end)}
                                      </span>
                                    )}
                                    <div>{block.duration === null ? "Duration unknown" : `${block.duration} min`}</div>
                                  </div>
                                </div>
                                {block.isFixed && (
                                  <span className="mt-2 inline-flex border border-brass/40 bg-brass/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ink/60">
                                    Fixed block
                                  </span>
                                )}
                                {block.notes && <p className="mt-1.5 text-xs text-ink/55 whitespace-pre-wrap">{block.notes}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Quick add from list */}
            <section data-testid="section-paste">
              <h2 className="font-serif text-xl tracking-tight mb-3">Quick add</h2>
              <div className="border border-hairline bg-surface p-6">
                <p className="text-sm font-medium text-ink mb-2">
                  What type of business or service schedule are you making?
                </p>
                <p className="text-ink/70 text-sm mb-3 max-w-[70ch]">
                  Add the schedule context first, then paste counts, services, roles, and provider count. For a wedding beauty or HMU schedule, Briarwood can infer ready-time logistics, provider capabilities, missing names, and overlap checks. Missing names are allowed; everything stays editable.
                </p>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={3}
                  placeholder="e.g. wedding beauty: 8 makeup, 5 hair, 3 providers"
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
                Grouped by service role. Enter a start time and duration to auto-fill the end time.
                Change a block's Lane field to move it to another coordination lane.
              </p>

              {laneList.length === 0 && (
                <div
                  className="border border-hairline bg-bg px-4 py-6 text-center text-ink/40"
                  data-testid="text-empty"
                >
                  No schedule yet. Use Quick add above to create coordination lanes and blocks.
                </div>
              )}

              <div className="grid min-w-0 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
                {laneList.map((lane) => (
                  <div
                    key={lane.key}
                    className="min-w-0 border border-hairline bg-surface rounded-sm flex flex-col"
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
                            className={`min-w-0 rounded-sm p-3 bg-bg border ${isBride ? "border-brass" : "border-hairline"}`}
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
                            <div className="grid min-w-0 grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
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
                            <div className="flex flex-col gap-2 mt-3 pt-2 border-t border-hairline/60 sm:flex-row sm:items-center sm:justify-between">
                              <label className="flex min-w-0 flex-col gap-1 text-[10px] uppercase tracking-wide text-ink/45 sm:flex-row sm:items-center sm:gap-1.5">
                                Lane
                                <input
                                  value={row.cells[providerColId] ?? ""}
                                  onChange={(e) => setCell(row.id, providerColId, e.target.value)}
                                  list="provider-options"
                                  placeholder="Unassigned"
                                  className="w-full min-w-0 bg-transparent border border-hairline rounded-sm px-2 py-1 text-xs normal-case tracking-normal text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70 sm:w-40"
                                  data-testid={`input-cell-${row.id}-${providerColId}`}
                                />
                              </label>
                              <div className="flex flex-wrap items-center gap-3 sm:gap-2">
                                <label className="inline-flex items-center gap-1.5 text-xs text-ink/60">
                                  <input
                                    type="checkbox"
                                    checked={row.cells._fixed === "true"}
                                    onChange={(event) => setCell(row.id, "_fixed", event.target.checked ? "true" : "")}
                                    className="h-4 w-4 accent-oxblood"
                                    data-testid={`checkbox-fixed-row-${row.id}`}
                                  />
                                  Fixed time
                                </label>
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
            {!parsedScheduleRequest && <section data-testid="section-service-defaults">
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
                  <div key={s.id} className="px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center" data-testid={`row-service-${s.id}`}>
                    <input
                      value={s.label}
                      onChange={(e) => updateServiceDefault(s.id, { label: e.target.value })}
                      className="w-full min-w-0 flex-1 bg-bg border border-hairline px-2 py-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                      data-testid={`input-service-label-${s.id}`}
                    />
                    <div className="flex items-center gap-2 sm:gap-1">
                      <input
                        type="number"
                        min={1}
                        value={s.durationMinutes ?? ""}
                        placeholder="not set"
                        onChange={(e) => {
                          const parsed = parseInt(e.target.value, 10);
                          updateServiceDefault(s.id, {
                            durationMinutes: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
                          });
                        }}
                        className="w-24 bg-bg border border-hairline px-2 py-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70 sm:w-20"
                        data-testid={`input-service-minutes-${s.id}`}
                      />
                      <span className="text-ink/50 text-sm">min</span>
                      {s.durationMinutes === null && (
                        <span className="border border-brass/40 bg-brass/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ink/60">
                          Unknown
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => deleteServiceDefault(s.id)}
                      className="w-fit text-ink/40 hover:text-oxblood"
                      data-testid={`button-delete-service-${s.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-ink/50 mt-2">
                Durations start unknown on purpose. A duration is only used once you enter it
                here or on a row — nothing is ever filled in for you. Entered defaults fill the
                Duration column when you quick-add a matching service, and no buffer is added
                unless you add one.
              </p>
            </section>}

            {/* Providers */}
            <section data-testid="section-providers">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-serif text-xl tracking-tight">Service roles and timing</h2>
                  <p className="mt-1 text-xs text-ink/50">Durations belong to each artist, not to the service globally.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={loadOperatorDefaults}
                    disabled={!operatorScheduleDefaultsQuery.data}
                    className="inline-flex items-center gap-1 border border-hairline px-2.5 py-1.5 text-sm hover:bg-surface disabled:opacity-50"
                    data-testid="button-load-schedule-defaults"
                  >
                    Load saved defaults
                  </button>
                  <button
                    onClick={() => saveOperatorDefaultsMutation.mutate()}
                    disabled={saveOperatorDefaultsMutation.isPending || providers.length === 0}
                    className="inline-flex items-center gap-1 border border-hairline px-2.5 py-1.5 text-sm hover:bg-surface disabled:opacity-50"
                    data-testid="button-save-schedule-defaults"
                  >
                    Save as operator defaults
                  </button>
                  <button
                    onClick={addProvider}
                    className="inline-flex items-center gap-1 border border-hairline px-2.5 py-1.5 text-sm hover:bg-surface"
                    data-testid="button-add-provider"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Artist
                  </button>
                </div>
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
                        <option value="">{UNKNOWN_PROVIDER_CAPABILITY_LABEL}</option>
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
                      Lead artist
                    </label>
                    <button
                      onClick={() => deleteProvider(p.id)}
                      className="text-ink/40 hover:text-oxblood md:mt-4 md:justify-self-end"
                      data-testid={`button-delete-provider-${p.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="md:col-span-4">
                      <span className="text-[10px] uppercase tracking-wide text-ink/45">Baseline timing for this artist</span>
                      <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                        {PROVIDER_DURATION_FIELDS.map((field) => (
                          <label key={field.id} className="block border border-hairline bg-bg px-2 py-1.5">
                            <span className="block text-[10px] text-ink/50">{field.label}</span>
                            <span className="mt-0.5 flex items-center gap-1">
                              <input
                                type="number"
                                min={1}
                                max={480}
                                value={p.serviceDurations?.[field.id] ?? ""}
                                onChange={(event) => updateProviderDuration(p.id, field.id, event.target.value)}
                                className="w-full min-w-0 bg-transparent text-sm focus-visible:outline-none"
                                placeholder="--"
                                data-testid={`input-provider-${p.id}-${field.id}-minutes`}
                              />
                              <span className="text-xs text-ink/40">min</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-ink/50 mt-2">
                Use Capability to mark what each provider handles for this schedule type. Wedding beauty or HMU schedules can use Hair, Makeup, or Hair + makeup capabilities. Saved defaults start future private drafts, and every timing remains editable for this event. The scheduler uses only the artists listed here and warns when the requested scope cannot fit; it never adds staff automatically.
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
              #schedule-lanes { grid-auto-columns: minmax(0, 1fr) !important; overflow: visible !important; }
              .no-print { display: none !important; }
            }
          `}</style>

          <div className="min-h-screen flex items-start justify-center p-4 sm:p-8">
            <div
              id="schedule-print"
              className="w-full max-w-[1200px] bg-bg border border-hairline rounded-sm shadow-sm"
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

                <div
                  id="schedule-lanes"
                  className="mt-8 grid grid-flow-col auto-cols-[minmax(270px,1fr)] items-start gap-6 overflow-x-auto pb-2"
                  data-testid="preview-artist-columns"
                >
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
