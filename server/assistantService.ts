import { storage } from "./storage";
import * as smsService from "./smsService";
import { sendEmail } from "./emailService";
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
  | "possible_conflict"
  | "possible_network_route"
  | "unknown";

export interface AvailabilityAnalysis {
  status: AvailabilityStatus; // operator-level (never possible_network_route here)
  detail: string | null; // short human-readable reason
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

// Analyze the operator's own availability for an inquiry's date using existing
// calendar data only. If the data is incomplete, return 'unknown' rather than
// guessing. Falls back to the same "no record means open" rule the live app
// already uses, so this does not contradict the operator's calendar view.
export async function analyzeInquiryAvailability(
  operatorId: string,
  eventDate: Date | null | undefined,
): Promise<AvailabilityAnalysis> {
  if (!eventDate || isNaN(eventDate.getTime())) {
    return { status: "unknown", detail: "No event date provided" };
  }
  try {
    const dateStr = toDateStr(eventDate);
    const blocked = await storage.getBlockedDateForArtist(operatorId, dateStr);
    if (blocked) {
      const reason = (blocked.reason || "").toLowerCase();
      if (reason === "booked") {
        return { status: "operator_unavailable", detail: "Date already booked" };
      }
      // A blocked row means the date is taken in some way, so we never report it
      // as freely available. 'Pending' is an explicit soft hold; any other
      // reason is treated the same (a conflict worth reviewing) rather than
      // guessing the date is open.
      const detail = reason === "pending" ? "Date has a pending hold" : "Date is blocked";
      return { status: "possible_conflict", detail };
    }
    const available = await storage.checkAvailability(operatorId, eventDate);
    return available
      ? { status: "operator_available", detail: null }
      : { status: "operator_unavailable", detail: "Marked unavailable" };
  } catch {
    return { status: "unknown", detail: null };
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
  availabilityStatus: AvailabilityStatus;
  suggestions: RoutingSuggestion[];
}

function availabilityPhrase(status: AvailabilityStatus): string {
  switch (status) {
    case "operator_available":
      return "You appear available.";
    case "operator_unavailable":
      return "You appear unavailable.";
    case "possible_conflict":
      return "You may have a conflict (a pending hold is on this date).";
    case "possible_network_route":
      return "You appear unavailable, but your circle may be able to cover this.";
    default:
      return "Your availability for this date is unclear.";
  }
}

// Compose the upgraded "new inquiry" prompt: the structured facts, an honest
// availability read, any routing options, and a suggested next action.
export async function buildInquiryAssistantPrompt(
  input: InquiryPromptInput,
): Promise<BuiltInquiryPrompt> {
  const analysis = await analyzeInquiryAvailability(input.operatorId, input.eventDate);

  let suggestions: RoutingSuggestion[] = [];
  if (analysis.status === "operator_unavailable" || analysis.status === "possible_conflict") {
    suggestions = await getRoutingSuggestions(input.operatorId, input.eventDate);
  }

  const hasRoute = suggestions.length > 0;
  const finalStatus: AvailabilityStatus =
    (analysis.status === "operator_unavailable" || analysis.status === "possible_conflict") && hasRoute
      ? "possible_network_route"
      : analysis.status;

  const multiPerson = (input.partySize ?? 0) > 1;

  // Suggested next actions, primary action first.
  let recommendedActions: string[];
  switch (finalStatus) {
    case "operator_available":
      recommendedActions = ["ACCEPT", "SEND_PRICING"];
      if (multiPerson) recommendedActions.push("BUILD_SCHEDULE");
      break;
    case "possible_network_route":
      recommendedActions = ["ROUTE", "REVIEW", "SEND_PRICING"];
      break;
    case "operator_unavailable":
      recommendedActions = ["REVIEW", "ROUTE"];
      break;
    case "possible_conflict":
      recommendedActions = ["REVIEW", "ACCEPT"];
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
  lines.push(availabilityPhrase(finalStatus));
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
    suggestions,
  };
}
