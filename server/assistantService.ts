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
