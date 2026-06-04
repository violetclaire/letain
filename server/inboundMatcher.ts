// ============================================================================
// Inbound reply matcher (context-based, additive)
// ----------------------------------------------------------------------------
// The core object is the INQUIRY for the service needed — not the phone number.
// A phone match is only ONE signal. This resolver attributes an inbound reply
// to the right service inquiry/referral using, in order:
//   1. Exact Twilio MessageSid / reply-to context  (dedupe handled by caller)
//   2. Recent outbound message thread context        (communication_logs)
//   3. Sender phone matched to a known person/contact (users / client_contacts)
//   4. Active inquiry/referral involving that person  (inquiries / thread_referrals)
//   5. Calendar/date/service/location parameters      (parsed from body)
//   6. Otherwise: unmatched (admin review)
//
// A trust event ("person responded to this inquiry/referral/service need") is
// only emitted when the reply can be CONFIDENTLY attributed to BOTH a person
// AND an inquiry/referral. Partial confidence -> needs_review with suggestions.
// ============================================================================

import type { IStorage } from "./storage";
import type { InboundSuggestedMatch } from "@shared/schema";

export type InboundMatchResult = {
  status: "matched" | "needs_review" | "unmatched";
  confidence: number; // 0-100
  // Confident links (only populated when status === 'matched')
  matchedUserId: string | null; // client's users.id if known
  matchedContactId: string | null; // client_contacts.id if known
  matchedInquiryId: string | null;
  matchedReferralId: string | null;
  // Who the trust event should be attributed to (the operator/artist). Null
  // means "do not write a trust event."
  trustUserId: string | null;
  inquiryIdForEvidence: string | null; // for trust-event metadata context
  // Ranked candidates surfaced to the admin when not confident.
  suggestions: InboundSuggestedMatch[];
};

const ACTIVE_INQUIRY_STATUSES = new Set([
  "pending", "accepted", "auto_responded", "referred", "deposit_paid",
]);
const ACTIVE_REFERRAL_STATUSES = new Set(["pending", "accepted"]);

// Confidence thresholds. A candidate must clear MATCH_MIN and also be clearly
// ahead of the runner-up by MATCH_MARGIN to auto-link.
const MATCH_MIN = 60;
const MATCH_MARGIN = 20;
const REVIEW_MIN = 25; // below this a candidate is too weak even to suggest

const OUTBOUND_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type Scored = {
  candidate: InboundSuggestedMatch;
  artistId: string | null;
  clientUserId: string | null;
  inquiryId: string | null;
  referralId: string | null;
  contactId: string | null;
  // True when this specific candidate was corroborated by a person-identifying
  // signal (sender phone or email matches THIS inquiry/referral). Required
  // before we will auto-link: "person responded to this service need".
  hasPersonSignal: boolean;
};

function norm(s: unknown): string {
  return (s ?? "").toString().trim().toLowerCase();
}

function fullName(u: { firstName: string | null; lastName: string | null; username: string | null; email: string | null }): string {
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.email || "Unknown";
}

// Does the message body reference this event's date (month name or M/D)?
function bodyMentionsDate(body: string, date: Date | null): boolean {
  if (!date) return false;
  const b = norm(body);
  if (!b) return false;
  const months = ["january","february","march","april","may","june","july","august","september","october","november","december"];
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  if (b.includes(months[m])) return true;
  if (b.includes(months[m].slice(0, 3))) return true;
  // numeric M/D or M-D
  const re = new RegExp(`\\b${m + 1}[\\/\\-]${d}\\b`);
  return re.test(b);
}

// Does the body mention a service/location keyword from the candidate?
function bodyMentionsToken(body: string, token: unknown): boolean {
  const t = norm(token);
  if (!t || t.length < 3) return false;
  return norm(body).includes(t);
}

export async function resolveInboundMatch(
  storage: IStorage,
  input: { fromNumber: string; body: string },
): Promise<InboundMatchResult> {
  const fromNumber = input.fromNumber || "";
  const body = input.body || "";

  const empty: InboundMatchResult = {
    status: "unmatched", confidence: 0,
    matchedUserId: null, matchedContactId: null, matchedInquiryId: null, matchedReferralId: null,
    trustUserId: null, inquiryIdForEvidence: null, suggestions: [],
  };
  if (!fromNumber) return empty;

  // --- Step 3: resolve the PERSON behind the phone ---------------------------
  const [users, contacts, recentOutbound] = await Promise.all([
    storage.findUsersByPhone(fromNumber),
    storage.findClientContactsByPhone(fromNumber),
    storage.findRecentOutboundByPhone(fromNumber, OUTBOUND_WINDOW_MS),
  ]);

  // Emails we can attribute to this sender (from their user/contact records).
  const knownEmails = new Set<string>();
  for (const u of users) if (u.email) knownEmails.add(norm(u.email));
  for (const c of contacts) if (c.email) knownEmails.add(norm(c.email));

  // Set of artists who recently messaged this phone (soft signal).
  const recentArtistIds = new Set(recentOutbound.map((r) => r.artistId));

  // --- Step 4/5: gather inquiry + referral candidates ------------------------
  const inquiryLists = await Promise.all([
    storage.findInquiriesByPhone(fromNumber),
    ...Array.from(knownEmails).map((e) => storage.findInquiriesByEmail(e)),
  ]);
  const inquiriesById = new Map<string, any>();
  for (const list of inquiryLists) for (const inq of list) inquiriesById.set(inq.id, inq);

  const referralLists = await Promise.all([
    storage.findThreadReferralsByClient({ phone: fromNumber }),
    ...Array.from(knownEmails).map((e) => storage.findThreadReferralsByClient({ email: e })),
  ]);
  const referralsById = new Map<string, any>();
  for (const list of referralLists) for (const ref of list) referralsById.set(ref.id, ref);

  const scored: Scored[] = [];

  // Score inquiry candidates.
  for (const inq of Array.from(inquiriesById.values())) {
    let score = 0;
    let hasPersonSignal = false;
    const reasons: string[] = [];
    if (norm(inq.clientPhone) && norm(inq.clientPhone) === norm(fromNumber)) { score += 50; hasPersonSignal = true; reasons.push("sender phone matches inquiry"); }
    if (inq.clientEmail && knownEmails.has(norm(inq.clientEmail))) { score += 35; hasPersonSignal = true; reasons.push("sender email matches inquiry"); }
    if (ACTIVE_INQUIRY_STATUSES.has(norm(inq.status))) { score += 20; reasons.push("inquiry is active"); }
    else { score -= 10; reasons.push(`inquiry is ${inq.status}`); }
    if (bodyMentionsDate(body, inq.eventDate ? new Date(inq.eventDate) : null)) { score += 15; reasons.push("reply mentions the event date"); }
    if (bodyMentionsToken(body, inq.serviceType)) { score += 10; reasons.push("reply mentions the service"); }
    if (bodyMentionsToken(body, inq.eventLocation)) { score += 10; reasons.push("reply mentions the location"); }
    if (inq.vendorId && recentArtistIds.has(inq.vendorId)) { score += 10; reasons.push("recent outbound from this artist"); }
    // nearest upcoming event nudge
    if (inq.eventDate && new Date(inq.eventDate).getTime() >= Date.now()) { score += 5; reasons.push("event is upcoming"); }

    const detail = [inq.status, inq.serviceType, inq.eventDate ? new Date(inq.eventDate).toISOString().slice(0, 10) : null]
      .filter(Boolean).join(" · ");
    scored.push({
      candidate: {
        type: "inquiry", id: inq.id,
        label: `${inq.clientName || "Client"} — inquiry`, detail,
        score, reasons,
        artistId: inq.vendorId ?? null, clientUserId: inq.clientId ?? null,
      },
      artistId: inq.vendorId ?? null, clientUserId: inq.clientId ?? null,
      inquiryId: inq.id, referralId: null, contactId: null,
      hasPersonSignal,
    });
  }

  // Score referral candidates.
  for (const ref of Array.from(referralsById.values())) {
    let score = 0;
    let hasPersonSignal = false;
    const reasons: string[] = [];
    if (norm(ref.threadClientPhone) && norm(ref.threadClientPhone) === norm(fromNumber)) { score += 50; hasPersonSignal = true; reasons.push("sender phone matches referral thread"); }
    if (ref.threadClientEmail && knownEmails.has(norm(ref.threadClientEmail))) { score += 35; hasPersonSignal = true; reasons.push("sender email matches referral thread"); }
    if (ACTIVE_REFERRAL_STATUSES.has(norm(ref.status))) { score += 20; reasons.push("referral is active"); }
    else { score -= 10; reasons.push(`referral is ${ref.status}`); }
    if (bodyMentionsDate(body, ref.threadEventDate ? new Date(ref.threadEventDate) : null)) { score += 15; reasons.push("reply mentions the event date"); }
    if (bodyMentionsToken(body, ref.threadServiceType)) { score += 10; reasons.push("reply mentions the service"); }
    if (bodyMentionsToken(body, ref.scopeSummary)) { score += 8; reasons.push("reply mentions the scope"); }
    if (ref.referredArtistId && recentArtistIds.has(ref.referredArtistId)) { score += 10; reasons.push("recent outbound from this artist"); }
    if (ref.threadEventDate && new Date(ref.threadEventDate).getTime() >= Date.now()) { score += 5; reasons.push("event is upcoming"); }

    const detail = [ref.status, ref.threadServiceType, ref.threadEventDate ? new Date(ref.threadEventDate).toISOString().slice(0, 10) : null]
      .filter(Boolean).join(" · ");
    scored.push({
      candidate: {
        type: "referral", id: ref.id,
        label: `${ref.threadClientName || "Client"} — referral`, detail,
        score, reasons,
        artistId: ref.referredArtistId ?? null, clientUserId: null,
      },
      artistId: ref.referredArtistId ?? null, clientUserId: null,
      inquiryId: null, referralId: ref.id, contactId: null,
      hasPersonSignal,
    });
  }

  // Pick the contact id (if any) that we can attach for evidence.
  const primaryContactId = contacts[0]?.id ?? null;

  // No inquiry/referral candidates at all -> we may still know the person.
  if (scored.length === 0) {
    const personSuggestions = buildPersonSuggestions(users, contacts, fromNumber);
    if (personSuggestions.length > 0) {
      // We know WHO but not WHICH service need -> needs_review, no trust event.
      return { ...empty, status: "needs_review", confidence: 30, suggestions: personSuggestions };
    }
    return empty; // truly unmatched
  }

  scored.sort((a, b) => b.candidate.score - a.candidate.score);
  const top = scored[0];
  const second = scored[1];
  const topScore = top.candidate.score;
  const margin = second ? topScore - second.candidate.score : topScore;

  const suggestions = scored
    .filter((s) => s.candidate.score >= REVIEW_MIN)
    .slice(0, 5)
    .map((s) => s.candidate);

  // CONFIDENT: clear winner above threshold, with (a) an artist to attribute to,
  // (b) an inquiry/referral (the service need), AND (c) a person-identifying
  // signal tying the SENDER to THIS candidate (phone/email). Without (c) we
  // cannot say "this person responded to this service need" -> needs_review.
  if (topScore >= MATCH_MIN && margin >= MATCH_MARGIN && top.artistId && top.hasPersonSignal) {
    // Prefer a saved contact that actually belongs to the matched artist's book.
    const contactForArtist = contacts.find((c) => c.artistId === top.artistId)?.id ?? null;
    return {
      status: "matched",
      confidence: Math.min(100, topScore),
      matchedUserId: top.clientUserId,
      matchedContactId: contactForArtist,
      matchedInquiryId: top.inquiryId,
      matchedReferralId: top.referralId,
      trustUserId: top.artistId,
      inquiryIdForEvidence: top.inquiryId ?? top.referralId,
      suggestions: [],
    };
  }

  // PARTIAL: we have plausible candidates but not enough confidence to auto-link.
  if (suggestions.length > 0) {
    return {
      ...empty,
      status: "needs_review",
      confidence: Math.min(59, Math.max(REVIEW_MIN, topScore)),
      matchedContactId: primaryContactId,
      suggestions,
    };
  }

  // Candidates existed but all too weak; fall back to person-only review.
  const personSuggestions = buildPersonSuggestions(users, contacts, fromNumber);
  if (personSuggestions.length > 0) {
    return { ...empty, status: "needs_review", confidence: 30, matchedContactId: primaryContactId, suggestions: personSuggestions };
  }
  return empty;
}

function buildPersonSuggestions(
  users: Array<{ id: string; firstName: string | null; lastName: string | null; username: string | null; email: string | null; role: string | null; phone: string | null }>,
  contacts: Array<{ id: string; artistId: string; name: string; email: string | null; phone: string | null; linkedUserId: string | null }>,
  fromNumber: string,
): InboundSuggestedMatch[] {
  const out: InboundSuggestedMatch[] = [];
  for (const u of users) {
    out.push({
      type: "user", id: u.id, label: fullName(u),
      detail: [u.role, u.email].filter(Boolean).join(" · "),
      score: 40, reasons: ["sender phone matches a known user"],
      artistId: u.role === "artist" ? u.id : null, clientUserId: u.id,
    });
  }
  for (const c of contacts) {
    out.push({
      type: "contact", id: c.id, label: c.name,
      detail: c.email || fromNumber,
      score: 40, reasons: ["sender phone matches a saved contact"],
      artistId: c.artistId, clientUserId: c.linkedUserId ?? null,
    });
  }
  return out.slice(0, 5);
}
