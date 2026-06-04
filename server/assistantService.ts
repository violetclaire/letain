import { storage } from "./storage";
import * as smsService from "./smsService";
import { sendEmail } from "./emailService";
import * as cdiEngine from "./cdiEngine";
import type { AssistantPrompt } from "@shared/schema";

// The headless assistant delivery layer.
//
// Briarwood records an actionable prompt for the operator whenever an important
// business event happens, then pushes it over the operator's preferred channel
// (SMS, email, or both). Every prompt is persisted in the assistant_prompts
// queue regardless of whether it was delivered, so it can be listed, digested,
// or re-delivered later. This file is additive and never alters existing
// DateInquiry flows.

export interface CreateAssistantPromptParams {
  operatorId: string; // users.id of the operator/artist
  inquiryId?: string | null;
  referralId?: string | null;
  contactId?: string | null;
  promptType: string; // e.g. 'new_inquiry'
  title: string;
  body: string;
  recommendedActions?: string[];
}

type EffectivePrefs = {
  channel: "sms" | "email" | "both";
  phoneEnabled: boolean;
  emailEnabled: boolean;
  quietStart: number | null;
  quietEnd: number | null;
  timezone: string | null;
  mode: "immediate" | "digest";
};

// Is the current moment inside the operator's quiet-hours window? Hours are
// local 0-23 integers; the window may wrap past midnight (e.g. 22 -> 7).
function isWithinQuietHours(prefs: EffectivePrefs, now: Date = new Date()): boolean {
  const { quietStart, quietEnd } = prefs;
  if (quietStart == null || quietEnd == null) return false;
  if (quietStart === quietEnd) return false;

  let hour: number;
  try {
    if (prefs.timezone) {
      const parts = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone: prefs.timezone,
      }).formatToParts(now);
      const hourPart = parts.find((p) => p.type === "hour")?.value ?? "0";
      hour = parseInt(hourPart, 10) % 24;
    } else {
      hour = now.getHours();
    }
  } catch {
    hour = now.getHours();
  }

  if (quietStart < quietEnd) {
    return hour >= quietStart && hour < quietEnd;
  }
  // Wrapping window (e.g. 22:00 -> 07:00)
  return hour >= quietStart || hour < quietEnd;
}

// Plain-text version of the prompt for SMS.
function buildSmsText(prompt: { title: string; body: string; recommendedActions?: string[] | null }): string {
  const lines = [prompt.title, prompt.body];
  if (prompt.recommendedActions && prompt.recommendedActions.length > 0) {
    lines.push(`Reply ${prompt.recommendedActions.join(", ")}.`);
  }
  return lines.filter(Boolean).join("\n");
}

// Minimal branded-neutral HTML for email (white-label: no Briarwood branding).
function buildEmailHtml(prompt: { title: string; body: string; recommendedActions?: string[] | null }): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const actions =
    prompt.recommendedActions && prompt.recommendedActions.length > 0
      ? `<p style="margin:16px 0 0;font-size:14px;color:#333;">Reply <strong>${prompt.recommendedActions
          .map(esc)
          .join(", ")}</strong>.</p>`
      : "";
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
      <h2 style="font-size:18px;margin:0 0 8px;">${esc(prompt.title)}</h2>
      <p style="font-size:15px;line-height:1.5;margin:0;white-space:pre-line;">${esc(prompt.body)}</p>
      ${actions}
    </div>
  `;
}

/**
 * Create an assistant prompt and deliver it via the operator's preferred channel.
 *
 * Always records the prompt in the queue. Delivery is best-effort and never
 * throws: callers can fire-and-forget. Delivery status is recorded on the row:
 *  - 'sent'    at least one channel delivered
 *  - 'failed'  every attempted channel failed
 *  - 'skipped' no channel is enabled / no destination address on file
 *  - 'queued'  held for later (quiet hours, or digest mode) — stays in the queue
 */
export async function createAssistantPromptAndDeliver(
  params: CreateAssistantPromptParams,
): Promise<AssistantPrompt> {
  const operator = await storage.getUser(params.operatorId);
  const profile = await storage.getArtistProfile(params.operatorId);

  const prefs: EffectivePrefs = {
    channel: (profile?.preferredDeliveryChannel as EffectivePrefs["channel"]) || "email",
    phoneEnabled: profile?.assistantPhoneEnabled ?? false,
    emailEnabled: profile?.assistantEmailEnabled ?? false,
    quietStart: profile?.assistantQuietHoursStart ?? null,
    quietEnd: profile?.assistantQuietHoursEnd ?? null,
    timezone: profile?.assistantTimezone ?? null,
    mode: (profile?.assistantPromptMode as EffectivePrefs["mode"]) || "immediate",
  };

  // Resolve which channels we will actually use: must be both selected in the
  // preferred channel AND enabled by the master switch AND have a destination.
  const wantSms =
    (prefs.channel === "sms" || prefs.channel === "both") &&
    prefs.phoneEnabled &&
    !!operator?.phone;
  const wantEmail =
    (prefs.channel === "email" || prefs.channel === "both") &&
    prefs.emailEnabled &&
    !!operator?.email;

  const resolvedChannel: string =
    wantSms && wantEmail ? "both" : wantSms ? "sms" : wantEmail ? "email" : "none";

  // Persist the prompt first (the queue), then attempt delivery.
  const prompt = await storage.createAssistantPrompt({
    operatorId: params.operatorId,
    inquiryId: params.inquiryId ?? null,
    referralId: params.referralId ?? null,
    contactId: params.contactId ?? null,
    promptType: params.promptType,
    title: params.title,
    body: params.body,
    recommendedActions: params.recommendedActions ?? null,
    deliveryChannel: resolvedChannel,
    deliveryStatus: "pending",
    deliveryError: null,
  } as any);

  // Nothing to deliver to.
  if (resolvedChannel === "none") {
    return (
      (await storage.updateAssistantPrompt(prompt.id, { deliveryStatus: "skipped" })) || prompt
    );
  }

  // Held for later: digest mode or inside quiet hours. Remains in the queue for
  // a future digest pass to deliver (digest delivery not built yet).
  if (prefs.mode === "digest" || isWithinQuietHours(prefs)) {
    return (
      (await storage.updateAssistantPrompt(prompt.id, { deliveryStatus: "queued" })) || prompt
    );
  }

  const errors: string[] = [];
  let anySent = false;

  if (wantSms) {
    try {
      const result = await smsService.sendSms(operator!.phone!, buildSmsText(params));
      if (result.success) anySent = true;
      else errors.push(`sms: ${result.error || "failed"}`);
    } catch (err: any) {
      errors.push(`sms: ${err?.message || "error"}`);
    }
  }

  if (wantEmail) {
    try {
      await sendEmail({
        to: operator!.email!,
        subject: params.title,
        html: buildEmailHtml(params),
      });
      anySent = true;
    } catch (err: any) {
      errors.push(`email: ${err?.message || "error"}`);
    }
  }

  const updated = await storage.updateAssistantPrompt(prompt.id, {
    deliveryStatus: anySent ? "sent" : "failed",
    sentAt: anySent ? new Date() : null,
    deliveryError: errors.length > 0 ? errors.join("; ") : null,
  });

  return updated || prompt;
}

// Determine how the operator currently "appears" relative to an event date.
// Returns 'available' | 'unavailable' | 'unknown' for use in prompt copy.
export async function getOperatorAvailabilityLabel(
  operatorId: string,
  eventDate: Date | null | undefined,
): Promise<"available" | "unavailable" | "unknown"> {
  if (!eventDate) return "unknown";
  try {
    const available = await storage.checkAvailability(operatorId, eventDate);
    return available ? "available" : "unavailable";
  } catch {
    return "unknown";
  }
}

// ---------------------------------------------------------------------------
// Inquiry availability analysis + trusted-circle routing
//
// The decision layer: when an inquiry arrives, work out whether the operator
// appears available, whether there is a conflict, and (if not available) who in
// their trusted circle or team might fit. This NEVER auto-routes and never sends
// a client response. It only produces an honest read for the operator's prompt.
// ---------------------------------------------------------------------------

export type AvailabilityStatus =
  | "operator_available"
  | "operator_unavailable"
  | "booked_by_contract"
  | "blocked_on_calendar"
  | "possible_conflict"
  | "possible_network_route"
  | "unknown"
  | "needs_review";

// Where the conclusion came from, so the operator can verify it.
export type EvidenceSource =
  | "contract"
  | "calendar"
  | "inquiry"
  | "booking"
  | "trusted_circle"
  | "unknown";

export type AvailabilityConfidence = "high" | "medium" | "low";

// The single suggested next action carried by a structured result. (The prompt
// still composes a short ordered list of actions for the operator separately.)
export type SuggestedAction = "ACCEPT" | "SEND_PRICING" | "ROUTE" | "REVIEW" | "DECLINE";

export interface AvailabilityAnalysis {
  status: AvailabilityStatus; // operator-level (never possible_network_route here)
  reason: string; // short human-readable explanation
  evidenceSource: EvidenceSource;
  conflictingRecordIds: string[]; // IDs of the contracts/bookings/inquiries that conflict
  confidence: AvailabilityConfidence;
  suggestedAction: SuggestedAction;
  detail: string | null; // backwards-compatible alias of reason
}

export interface RoutingSuggestion {
  name: string;
  email: string | null;
  source: "circle" | "team";
  availability: "available" | "unavailable" | "unknown";
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

// Small constructor so every return path carries the full structured shape.
function mkAnalysis(
  status: AvailabilityStatus,
  reason: string,
  evidenceSource: EvidenceSource,
  conflictingRecordIds: string[],
  confidence: AvailabilityConfidence,
  suggestedAction: SuggestedAction,
): AvailabilityAnalysis {
  return {
    status,
    reason,
    evidenceSource,
    conflictingRecordIds,
    confidence,
    suggestedAction,
    detail: reason,
  };
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Build the date strings a free-text contract field ("eventDates") might use, so
// we can match conservatively. We never guess: a contract is only treated as
// covering the date if one of these tokens literally appears in its text.
function dateTokens(d: Date): string[] {
  const iso = d.toISOString().split("T")[0]; // YYYY-MM-DD (UTC)
  const [y, m, day] = iso.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");
  const monthLong = MONTH_NAMES[m - 1];
  const monthShort = monthLong.slice(0, 3);
  return [
    iso, // 2027-08-21
    `${m}/${day}/${y}`, // 8/21/2027
    `${pad(m)}/${pad(day)}/${y}`, // 08/21/2027
    `${monthLong} ${day}, ${y}`, // August 21, 2027
    `${monthShort} ${day}, ${y}`, // Aug 21, 2027
    `${monthLong} ${day}`, // August 21
  ];
}

function contractCoversDate(c: { eventDates?: string | null }, tokens: string[]): boolean {
  const text = (c.eventDates || "").toString();
  if (!text) return false;
  return tokens.some((t) => text.includes(t));
}

const TERMINAL_INQUIRY_STATUSES = new Set(["declined", "expired", "completed"]);
const BOOKED_BOOKING_STATUSES = new Set(["accepted", "confirmed", "completed"]);

// Analyze the operator's availability for an inquiry's date by comparing it
// against every existing signal: signed contracts, booked/blocked calendar
// dates, pending holds, active bookings, and other live inquiries competing for
// the same date. Strongest "booked" signal wins; softer conflicts fall through
// to review. If the data is incomplete we return 'unknown' rather than guessing,
// and we never contradict the operator's own calendar view (same fallback the
// live app uses: no record means open). Read-only: this never writes anything.
export async function analyzeInquiryAvailability(
  operatorId: string,
  eventDate: Date | null | undefined,
  currentInquiryId?: string | null,
): Promise<AvailabilityAnalysis> {
  if (!eventDate || isNaN(eventDate.getTime())) {
    return mkAnalysis("unknown", "No event date provided", "unknown", [], "low", "REVIEW");
  }
  try {
    const dateStr = toDateStr(eventDate);
    const tokens = dateTokens(eventDate);

    // Gather every signal in parallel. Each source degrades to empty on failure
    // so a positive conflict on one source is never missed, but we remember that
    // a source failed: if no conflict is found we must NOT claim "available" off
    // incomplete data — we return 'unknown' instead of guessing.
    let sourceFailed = false;
    const safe = async <T>(p: Promise<T>, fallback: T): Promise<T> => {
      try {
        return await p;
      } catch {
        sourceFailed = true;
        return fallback;
      }
    };
    const [blocked, contracts, bookings, inquiries] = await Promise.all([
      safe(storage.getBlockedDateForArtist(operatorId, dateStr), null as any),
      safe(storage.getContractsByArtist(operatorId), [] as any[]),
      safe(storage.getBookingsByArtist(operatorId), [] as any[]),
      safe(storage.getInquiriesByVendor(operatorId), [] as any[]),
    ]);

    const contractMatches = (contracts as any[]).filter((c) => contractCoversDate(c, tokens));
    const sameDayBookings = (bookings as any[]).filter(
      (b) => b.eventDate && toDateStr(new Date(b.eventDate)) === dateStr,
    );

    // 1. Signed contract on the date — the strongest "booked" signal.
    const signedContract = contractMatches.find(
      (c) => (c.status || "").toLowerCase() === "signed",
    );
    if (signedContract) {
      return mkAnalysis(
        "booked_by_contract",
        "A signed contract already covers this date",
        "contract",
        [signedContract.id],
        "high",
        "ROUTE",
      );
    }

    // 2. An active (accepted/confirmed/completed) booking on the date.
    const activeBooking = sameDayBookings.find((b) =>
      BOOKED_BOOKING_STATUSES.has((b.status || "").toLowerCase()),
    );
    if (activeBooking) {
      return mkAnalysis(
        "operator_unavailable",
        "An existing booking is on this date",
        "booking",
        [activeBooking.id],
        "high",
        "ROUTE",
      );
    }

    // 3. Calendar explicitly marked booked.
    if (blocked && (blocked.reason || "").toLowerCase() === "booked") {
      return mkAnalysis(
        "blocked_on_calendar",
        "This date is marked booked on your calendar",
        "calendar",
        [blocked.id],
        "high",
        "ROUTE",
      );
    }

    // --- Softer conflicts (medium confidence): worth a review, not certain. ---

    // 3b. A contract in progress (sent or draft) covering the date.
    const pendingContract = contractMatches.find((c) =>
      ["sent", "draft"].includes((c.status || "").toLowerCase()),
    );
    if (pendingContract) {
      return mkAnalysis(
        "possible_conflict",
        "A contract in progress covers this date",
        "contract",
        [pendingContract.id],
        "medium",
        "REVIEW",
      );
    }

    // 3c. A pending booking on the date.
    const pendingBooking = sameDayBookings.find(
      (b) => (b.status || "").toLowerCase() === "pending",
    );
    if (pendingBooking) {
      return mkAnalysis(
        "possible_conflict",
        "A pending booking is on this date",
        "booking",
        [pendingBooking.id],
        "medium",
        "REVIEW",
      );
    }

    // 3d. A calendar block for another reason (e.g. a pending soft hold).
    if (blocked) {
      const reason = (blocked.reason || "").toLowerCase();
      const detail =
        reason === "pending"
          ? "This date has a pending hold on your calendar"
          : "This date is blocked on your calendar";
      return mkAnalysis("possible_conflict", detail, "calendar", [blocked.id], "medium", "REVIEW");
    }

    // 3e. Another live inquiry competing for the same date.
    const competing = (inquiries as any[]).filter((i) => {
      if (currentInquiryId && i.id === currentInquiryId) return false;
      if (!i.eventDate || toDateStr(new Date(i.eventDate)) !== dateStr) return false;
      return !TERMINAL_INQUIRY_STATUSES.has((i.status || "").toLowerCase());
    });
    if (competing.length > 0) {
      return mkAnalysis(
        "needs_review",
        competing.length === 1
          ? "Another inquiry is competing for this date"
          : `${competing.length} other inquiries are competing for this date`,
        "inquiry",
        competing.slice(0, 5).map((i) => i.id),
        "medium",
        "REVIEW",
      );
    }

    // 4. No conflicts found — defer to the calendar check the live app uses.
    const available = await storage.checkAvailability(operatorId, eventDate);
    if (available) {
      // A clean "available" is only honest if every evidence source actually
      // answered. If one failed we could be sitting on a hidden conflict, so we
      // report 'unknown' rather than guess the date is open.
      if (sourceFailed) {
        return mkAnalysis(
          "unknown",
          "Some records could not be checked, so availability is unconfirmed",
          "unknown",
          [],
          "low",
          "REVIEW",
        );
      }
      return mkAnalysis(
        "operator_available",
        "No contract, booking, or calendar block found for this date",
        "calendar",
        [],
        "high",
        "ACCEPT",
      );
    }
    return mkAnalysis(
      "operator_unavailable",
      "Your calendar shows this date as unavailable",
      "calendar",
      [],
      "medium",
      "ROUTE",
    );
  } catch {
    return mkAnalysis("unknown", "Could not complete the availability check", "unknown", [], "low", "REVIEW");
  }
}

// Suggest trusted-circle and team members who might cover the inquiry. Suggestion
// only: the operator approves any route. Where a member can be resolved to a
// registered user, their availability for the date is checked too.
export async function getRoutingSuggestions(
  operatorId: string,
  eventDate: Date | null | undefined,
  limit: number = 3,
): Promise<RoutingSuggestion[]> {
  const candidates: { name: string; email: string | null; source: "circle" | "team" }[] = [];

  try {
    const circle = await storage.getTrustedCircleByReferrer(operatorId);
    for (const m of circle) {
      if (m.status === "active" && !m.quietlyRemoved && m.refereeName) {
        candidates.push({ name: m.refereeName, email: m.refereeEmail ?? null, source: "circle" });
      }
    }
  } catch {
    // ignore - circle is optional
  }

  try {
    const team = await storage.getTeamMembers(operatorId);
    for (const t of team) {
      const status = (t.status || "").toLowerCase();
      const removed =
        status === "removed" ||
        status === "declined" ||
        status === "inactive" ||
        status === "revoked";
      const active = !removed && (!!t.acceptedAt || status === "active" || status === "accepted");
      if (active && t.memberName) {
        candidates.push({ name: t.memberName, email: t.memberEmail ?? null, source: "team" });
      }
    }
  } catch {
    // ignore - team is optional
  }

  // Resolve availability for all candidates so "prefer available" holds globally,
  // with a sane upper bound to avoid pathological work for very large circles.
  const bounded = candidates.slice(0, 25);
  const resolved: RoutingSuggestion[] = [];
  for (const c of bounded) {
    let availability: RoutingSuggestion["availability"] = "unknown";
    if (eventDate && !isNaN(eventDate.getTime()) && c.email) {
      try {
        const user = await storage.getUserByEmail(c.email);
        if (user) {
          const blocked = await storage.getBlockedDateForArtist(user.id, toDateStr(eventDate));
          if (blocked) {
            availability =
              (blocked.reason || "").toLowerCase() === "booked" ? "unavailable" : "unknown";
          } else {
            availability = (await storage.checkAvailability(user.id, eventDate))
              ? "available"
              : "unavailable";
          }
        }
      } catch {
        // leave as unknown
      }
    }
    resolved.push({ ...c, availability });
  }

  // Prefer available, then unknown, then unavailable.
  const rank = (a: RoutingSuggestion["availability"]) =>
    a === "available" ? 0 : a === "unknown" ? 1 : 2;
  resolved.sort((a, b) => rank(a.availability) - rank(b.availability));
  return resolved.slice(0, limit);
}

export interface InquiryPromptInput {
  operatorId: string;
  clientName: string;
  serviceType?: string | null;
  eventDate?: Date | null;
  eventLocation?: string | null;
  partySize?: number | null;
  message?: string | null;
  referralSourceName?: string | null; // resolved name of the referring vendor, if any
}

export interface BuiltInquiryPrompt {
  title: string;
  body: string;
  recommendedActions: string[];
  availabilityStatus: AvailabilityStatus; // final status (may be possible_network_route)
  analysis: AvailabilityAnalysis; // the raw operator-level read, before route escalation
  suggestions: RoutingSuggestion[];
}

// The operator-level statuses that mean "you probably cannot take this", which
// trigger a trusted-circle route lookup and may escalate to network routing.
function isUnavailableLike(status: AvailabilityStatus): boolean {
  return (
    status === "operator_unavailable" ||
    status === "booked_by_contract" ||
    status === "blocked_on_calendar" ||
    status === "possible_conflict" ||
    status === "needs_review"
  );
}

function availabilityPhrase(status: AvailabilityStatus, reason: string): string {
  switch (status) {
    case "operator_available":
      return "You appear available.";
    case "possible_network_route":
      return "You appear unavailable for this date, but your circle may be able to cover it.";
    case "booked_by_contract":
      return "You appear unavailable because you have a signed contract on this date.";
    case "unknown":
      return "Your availability for this date is unclear.";
    default:
      // Use the specific structured reason for unavailable/blocked/conflict/review.
      return reason ? `${reason}.` : "You may not be available for this date.";
  }
}

// Compose the upgraded "new inquiry" prompt: the structured facts, an honest
// availability read (contracts, calendar, bookings, other inquiries), any
// routing options, and a suggested next action.
export async function buildInquiryAssistantPrompt(
  input: InquiryPromptInput & { inquiryId?: string | null },
): Promise<BuiltInquiryPrompt> {
  const analysis = await analyzeInquiryAvailability(
    input.operatorId,
    input.eventDate,
    input.inquiryId ?? null,
  );

  let suggestions: RoutingSuggestion[] = [];
  if (isUnavailableLike(analysis.status)) {
    suggestions = await getRoutingSuggestions(input.operatorId, input.eventDate);
  }

  const hasRoute = suggestions.length > 0;
  const finalStatus: AvailabilityStatus =
    isUnavailableLike(analysis.status) && hasRoute ? "possible_network_route" : analysis.status;

  const multiPerson = (input.partySize ?? 0) > 1;

  // Suggested next actions, primary action first.
  let recommendedActions: string[];
  switch (finalStatus) {
    case "operator_available":
      recommendedActions = ["ACCEPT", "SEND_PRICING"];
      if (multiPerson) recommendedActions.push("BUILD_SCHEDULE");
      break;
    case "possible_network_route":
      recommendedActions = ["ROUTE", "REVIEW"];
      break;
    case "booked_by_contract":
    case "operator_unavailable":
    case "blocked_on_calendar":
      recommendedActions = ["REVIEW", "ROUTE", "DECLINE"];
      break;
    case "possible_conflict":
      recommendedActions = ["REVIEW", "ACCEPT"];
      break;
    case "needs_review":
      recommendedActions = ["REVIEW"];
      break;
    default:
      recommendedActions = ["REVIEW", "SEND_PRICING"];
  }

  const service = input.serviceType || "services";
  const location = input.eventLocation || "an unspecified location";
  const dateLabel =
    input.eventDate && !isNaN(input.eventDate.getTime())
      ? input.eventDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "a date to be confirmed";

  const lines: string[] = [];
  lines.push(`New inquiry from ${input.clientName} for ${service} on ${dateLabel} in ${location}.`);
  if (input.partySize && input.partySize > 0) {
    lines.push(`Party size: ${input.partySize}.`);
  }
  if (input.referralSourceName) {
    lines.push(`Referred by ${input.referralSourceName}.`);
  }
  if (input.message && input.message.trim()) {
    const note = input.message.trim().replace(/\s+/g, " ").slice(0, 140);
    lines.push(`Note: "${note}"`);
  }
  lines.push(availabilityPhrase(finalStatus, analysis.reason));
  if (hasRoute) {
    const routeText = suggestions
      .map((s) => (s.availability === "available" ? `${s.name} (available)` : s.name))
      .join(", ");
    lines.push(`Possible routes: ${routeText}.`);
  }
  lines.push(`Suggested: ${recommendedActions.join(", ")}.`);

  return {
    title: `New inquiry from ${input.clientName}`,
    body: lines.join("\n"),
    recommendedActions,
    availabilityStatus: finalStatus,
    analysis,
    suggestions,
  };
}

// Record structured, score-neutral trust events for the availability check so
// the operator's coordination history reflects that the work was done. These
// are observational only (signalStrength 0) so they never move the CDI score,
// and they never auto-route or message anyone. Fire-and-forget; never throws.
//
//  - availability_checked: always, once a check has run
//  - fit_evaluated:        always, carrying the suggested next action
//  - route_suggested:      only when unavailable AND a trusted route exists
export async function recordAvailabilityTrustEvents(params: {
  operatorId: string;
  inquiryId: string;
  built: BuiltInquiryPrompt;
}): Promise<void> {
  const { operatorId, inquiryId, built } = params;
  const { analysis, availabilityStatus: finalStatus, suggestions } = built;

  const record = (eventType: string, evidenceText: string, contextualFactors: string[]) =>
    cdiEngine.recordBehavioralEvent(
      operatorId,
      "artist",
      "coordination",
      eventType,
      "choreography_awareness",
      0, // score-neutral: observational, never inflates CDI
      { evidenceText, contextualFactors: contextualFactors.filter(Boolean) },
    );

  try {
    await record(
      "availability_checked",
      `Availability check for inquiry ${inquiryId}: ${analysis.status} (${analysis.confidence} confidence)`,
      [analysis.reason, `source:${analysis.evidenceSource}`],
    );
    await record(
      "fit_evaluated",
      `Evaluated fit for inquiry ${inquiryId}: suggested ${analysis.suggestedAction}`,
      [`final_status:${finalStatus}`, `action:${analysis.suggestedAction}`],
    );
    if (finalStatus === "possible_network_route" && suggestions.length > 0) {
      await record(
        "route_suggested",
        `Possible trusted-circle routes for inquiry ${inquiryId}: ${suggestions
          .map((s) => s.name)
          .join(", ")}`,
        suggestions.map((s) => `${s.source}:${s.name}:${s.availability}`),
      );
    }
  } catch (err) {
    console.error("[Assistant] Failed to record availability trust events:", err);
  }
}
