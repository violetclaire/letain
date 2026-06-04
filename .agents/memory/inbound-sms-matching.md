---
name: Inbound SMS/email reply matching
description: How inbound replies are attributed to inquiries/referrals and when a CDI trust event is allowed to fire.
---

# Inbound reply matching (context-based)

Inbound replies are attributed by INQUIRY CONTEXT, not phone alone. Logic lives in
`server/inboundMatcher.ts` (`resolveInboundMatch`), wired into the inbound webhook
in `server/routes.ts`.

## The gating rule (product intent)
A CDI trust event (`response_received`) may ONLY be written when the reply is
confidently attributed to BOTH a person AND an inquiry/referral. In code that means
the auto-`matched` branch requires ALL of: top score >= MATCH_MIN, margin >=
MATCH_MARGIN over the runner-up, an artist to attribute to, AND `hasPersonSignal`
on the winning candidate.

**Why:** phone-only attribution is wrong here — multiple people can share/spoof a
number, and a high score from circumstantial signals (active status, date mention,
service) must never alone mint trust. `hasPersonSignal` is set true only when the
sender's phone or email matches THAT specific inquiry/referral. Without it the
result is `needs_review` (suggestions shown, no trust event), never `matched`.

**How to apply:** if you add new scoring signals, do NOT let them flip a candidate
to `matched` on their own — they can raise confidence but the person link
(phone/email to that candidate) is mandatory before any trust event.

## Idempotency
The inbound row is inserted FIRST; the unique `message_sid` constraint is the race
guard. Only after a successful (deduped) insert is the trust event created, then the
row patched with `trustEventId` via `updateInboundSmsMatch`. A duplicate concurrent
delivery throws Postgres code `23505` on insert and we bail before any trust event,
so coordination can never be double-counted.

## Status meanings
- `matched`: confident person + inquiry/referral -> trust event fires.
- `needs_review`: plausible candidates but not confident -> ranked `suggestedMatches`
  shown on /admin/inbound-replies with "Use" buttons (POST /api/sms/inbound/:id/match);
  no trust event.
- `unmatched`: nothing plausible -> stored, no trust event.
