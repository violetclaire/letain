// Briarwood core: Response Composer + generic Routing / Delegation layer.
//
// This module is intentionally channel- and role-agnostic. It serves any
// Briarwood intake source (The Makeup Dolls site today, email, SMS, manual
// entry, other operators later), not just the temporary DateInquiry bridge.
//
// Two responsibilities:
//   1. Build editable DEFAULT message drafts for the operator to personalize
//      (pricing/available response, polite decline, client referral list).
//   2. Build preflight messages and record observational coordination events.
//
// Hard rules honored here:
//   - Nothing in this module sends anything. Callers (routes) send, and only
//     after the operator approves. There is no auto-send.
//   - Trust events are observational only (signalStrength 0) so they never move
//     the CDI score.

import * as cdiEngine from "./cdiEngine";

export type ResponseType = "pricing" | "decline" | "referral";

export type RouteType =
  | "referral"
  | "delegation"
  | "review"
  | "scheduling"
  | "agent"
  | "follow_up";

export type RouteStatus =
  | "draft"
  | "pending"
  | "accepted"
  | "declined"
  | "needs_review"
  | "sent_to_client"
  | "completed";

// Minimal inquiry context the composer needs. Kept loose so any intake source
// can supply it without coupling to the inquiries table shape.
export interface ComposerContext {
  clientName: string;
  serviceType?: string | null;
  eventDate?: string | null; // pre-formatted, human-readable
  eventLocation?: string | null;
  venue?: string | null;
  referralSourceName?: string | null;
  operatorName: string; // the artist/operator's display name
  pricingLink?: string | null; // info-sheet / pricing link, if available
}

function greetingName(ctx: ComposerContext): string {
  const first = (ctx.clientName || "").trim().split(/\s+/)[0];
  return first || "there";
}

// 1. AVAILABLE / SEND_PRICING default body.
export function buildPricingDraft(ctx: ComposerContext): string {
  const lines: string[] = [];
  lines.push(`Hi ${greetingName(ctx)},`);
  lines.push("");
  lines.push(
    "Thank you so much for reaching out, and congratulations. I would love to share more information.",
  );
  if (ctx.pricingLink) {
    lines.push("");
    lines.push(`Here is my pricing and details sheet: ${ctx.pricingLink}`);
  } else {
    lines.push("");
    lines.push("I will follow up shortly with my pricing and details.");
  }
  lines.push("");
  lines.push("Please let me know if you have any questions.");
  lines.push("");
  lines.push("Warmly,");
  lines.push(ctx.operatorName);
  return lines.join("\n");
}

// 4. UNAVAILABLE / NO ROUTING polite decline default body.
export function buildDeclineDraft(ctx: ComposerContext): string {
  const lines: string[] = [];
  lines.push(`Hi ${greetingName(ctx)},`);
  lines.push("");
  lines.push(
    "Thank you so much for reaching out, and congratulations. I am so sorry, but I am not available for your date. Thank you so much for thinking of me.",
  );
  lines.push("");
  lines.push("Warmly,");
  lines.push(ctx.operatorName);
  return lines.join("\n");
}

// 3. CLIENT REFERRAL default body. acceptedNames are the route targets who
// accepted the preflight; only they should ever appear to the client.
export function buildReferralDraft(
  ctx: ComposerContext,
  acceptedNames: string[],
): string {
  const lines: string[] = [];
  lines.push(`Hi ${greetingName(ctx)},`);
  lines.push("");
  lines.push(
    "I am so sorry, I am not available for your date, but I would be happy to refer you to trusted colleagues. Here are a few people I recommend:",
  );
  lines.push("");
  for (const name of acceptedNames) {
    lines.push(`- ${name}`);
  }
  lines.push("");
  lines.push("Wishing you all the best with your celebration.");
  lines.push("");
  lines.push("Warmly,");
  lines.push(ctx.operatorName);
  return lines.join("\n");
}

// Apply an optional personal note at the top of any draft, placed naturally
// above the default body.
export function applyPersonalNote(
  body: string,
  personalNote?: string | null,
): string {
  const note = (personalNote || "").trim();
  if (!note) return body;
  return `${note}\n\n${body}`;
}

// Preflight message sent to a route target BEFORE the client ever sees a
// referral list. Generic across route types and targets (human or agent).
export function buildPreflightMessage(params: {
  operatorName: string;
  targetName: string;
  serviceType?: string | null;
  eventDate?: string | null;
  eventLocation?: string | null;
  routeType: RouteType;
}): string {
  const { operatorName, targetName, serviceType, eventDate, eventLocation, routeType } = params;
  const service = serviceType || "an inquiry";
  const when = eventDate ? ` on ${eventDate}` : "";
  const where = eventLocation ? ` in ${eventLocation}` : "";
  const verb =
    routeType === "delegation"
      ? "would like to delegate"
      : routeType === "review"
        ? "would like you to review"
        : routeType === "scheduling"
          ? "would like your scheduling help with"
          : "would like to refer/send you";
  const first = (targetName || "").trim().split(/\s+/)[0] || "there";
  return (
    `Hi ${first}, ${operatorName} ${verb} ${service}${when}${where}. ` +
    `Are you available/interested? Reply YES, NO, or REVIEW.`
  );
}

// Record an observational coordination event. signalStrength is forced to 0 so
// these never move the CDI score. Fire-and-forget; never throws.
export async function recordRoutingEvent(params: {
  operatorId: string;
  eventType: string; // e.g. 'response_drafted','pricing_sent','route_preflight_sent'
  evidenceText: string;
  contextualFactors?: string[];
}): Promise<void> {
  try {
    await cdiEngine.recordBehavioralEvent(
      params.operatorId,
      "artist",
      "coordination",
      params.eventType,
      "choreography_awareness",
      0, // score-neutral: observational, never inflates CDI
      {
        evidenceText: params.evidenceText,
        contextualFactors: (params.contextualFactors || []).filter(Boolean),
      },
    );
  } catch (err) {
    console.error("[Routing] Failed to record routing event:", err);
  }
}
