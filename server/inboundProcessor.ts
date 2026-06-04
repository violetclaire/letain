// ============================================================================
// Inbound SMS processor (additive, shared path)
// ----------------------------------------------------------------------------
// The ONE place that turns an inbound SMS payload into: a context match, a
// stored inbound_sms_messages row, idempotency handling, and (only when
// confidently attributed) a response_received trust event.
//
// Both the real Twilio webhook (after signature validation) AND the admin-only
// SMS test simulator call this. There is intentionally NO second copy of the
// matching/storage/trust-event logic for the simulator.
// ============================================================================

import type { IStorage } from "./storage";
import type { InboundSuggestedMatch } from "@shared/schema";
import { resolveInboundMatch, type InboundMatchResult } from "./inboundMatcher";
import * as smsService from "./smsService";

export type ProcessInboundInput = {
  messageSid: string;
  fromRaw: string;
  toRaw: string;
  text: string;
  rawPayload: Record<string, any>;
};

export type ProcessInboundResult = {
  // What the processor did with this payload.
  outcome: "stored" | "ignored_missing_fields" | "duplicate";
  savedId: string | null;
  fromNumber: string | null;
  toNumber: string | null;
  matchStatus: InboundMatchResult["status"] | null;
  matchConfidence: number | null;
  matchReasons: string[];
  suggestedMatches: InboundSuggestedMatch[] | null;
  trustEventId: string | null;
  trustEventCreated: boolean;
};

export async function processInboundSms(
  storage: IStorage,
  input: ProcessInboundInput,
): Promise<ProcessInboundResult> {
  const messageSid = (input.messageSid || "").toString();
  const fromRaw = (input.fromRaw || "").toString();
  const toRaw = (input.toRaw || "").toString();
  const text = (input.text ?? "").toString();

  const base: ProcessInboundResult = {
    outcome: "stored", savedId: null, fromNumber: null, toNumber: null,
    matchStatus: null, matchConfidence: null, matchReasons: [],
    suggestedMatches: null, trustEventId: null, trustEventCreated: false,
  };

  if (!messageSid || !fromRaw) {
    return { ...base, outcome: "ignored_missing_fields" };
  }

  // Idempotency — never store the same Twilio MessageSid twice.
  const existing = await storage.getInboundSmsByMessageSid(messageSid);
  if (existing) {
    return {
      ...base,
      outcome: "duplicate",
      savedId: existing.id,
      matchStatus: (existing.matchStatus as InboundMatchResult["status"]) ?? null,
      matchConfidence: existing.matchConfidence ?? null,
      trustEventId: existing.trustEventId ?? null,
      trustEventCreated: false,
    };
  }

  const fromNumber = smsService.normalizePhoneNumber(fromRaw) || fromRaw;
  const toNumber = smsService.normalizePhoneNumber(toRaw) || toRaw;

  // Context-based matching: attribute the reply to the SERVICE INQUIRY it
  // belongs to, not just the phone number (see server/inboundMatcher.ts).
  let match: InboundMatchResult;
  try {
    match = await resolveInboundMatch(storage, { fromNumber, body: text });
  } catch (matchErr: any) {
    console.error("[SMS Inbound] Matching error (continuing):", matchErr?.message);
    match = {
      status: "unmatched", confidence: 0,
      matchedUserId: null, matchedContactId: null, matchedInquiryId: null, matchedReferralId: null,
      trustUserId: null, inquiryIdForEvidence: null, matchReasons: [], suggestions: [],
    };
  }

  // Persist the inbound row FIRST. The unique message_sid constraint is the
  // race guard: if two duplicate deliveries slip past the dedupe check above,
  // the second insert throws here and we bail BEFORE writing a trust event, so
  // duplicates can never double-count coordination.
  let saved;
  try {
    saved = await storage.createInboundSms({
      messageSid,
      fromNumber,
      toNumber,
      body: text,
      matchedUserId: match.matchedUserId ?? null,
      matchedContactId: match.matchedContactId ?? null,
      matchedInquiryId: match.matchedInquiryId ?? null,
      matchedReferralId: match.matchedReferralId ?? null,
      matchStatus: match.status,
      matchConfidence: match.confidence,
      suggestedMatches: match.suggestions.length ? match.suggestions : null,
      trustEventId: null,
      rawPayload: { ...input.rawPayload },
    } as any);
  } catch (insErr: any) {
    if (insErr?.code === "23505") {
      const dup = await storage.getInboundSmsByMessageSid(messageSid);
      return {
        ...base,
        outcome: "duplicate",
        savedId: dup?.id ?? null,
        matchStatus: (dup?.matchStatus as InboundMatchResult["status"]) ?? null,
        matchConfidence: dup?.matchConfidence ?? null,
        trustEventId: dup?.trustEventId ?? null,
        trustEventCreated: false,
      };
    }
    throw insErr;
  }

  // Write a response_received trust event ONLY when the reply is confidently
  // attributed to BOTH a person AND an inquiry/referral (status 'matched').
  // 'needs_review' and 'unmatched' never emit a trust event.
  let trustEventId: string | undefined;
  if (match.status === "matched" && match.trustUserId) {
    try {
      const event = await storage.createCdiBehavioralEvent({
        userId: match.trustUserId,
        actorRole: "client",
        eventCategory: "communication",
        eventType: "response_received",
        dimension: "emotional_fidelity",
        signalStrength: 10,
        metadata: {
          evidenceText: text.slice(0, 280),
          contextualFactors: [
            "channel:sms_inbound",
            `confidence:${match.confidence}`,
            match.matchedInquiryId ? `inquiry:${match.matchedInquiryId}` : (match.matchedReferralId ? `referral:${match.matchedReferralId}` : "inquiry:none"),
          ],
        },
      } as any);
      trustEventId = event.id;
      await storage.updateInboundSmsMatch(saved.id, { trustEventId });
    } catch (evtErr: any) {
      console.error("[SMS Inbound] Trust event write failed (continuing):", evtErr?.message);
    }
  }

  return {
    outcome: "stored",
    savedId: saved.id,
    fromNumber,
    toNumber,
    matchStatus: match.status,
    matchConfidence: match.confidence,
    matchReasons: match.matchReasons,
    suggestedMatches: match.suggestions.length ? match.suggestions : null,
    trustEventId: trustEventId ?? null,
    trustEventCreated: !!trustEventId,
  };
}
