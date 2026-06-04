---
name: Inbound SMS/email reply matching
description: How inbound replies are attributed to inquiries/referrals and when a CDI trust event is allowed to fire.
---

# Inbound reply matching (context-based)

Inbound replies are attributed by INQUIRY CONTEXT, not phone alone. Matching logic
lives in `server/inboundMatcher.ts` (`resolveInboundMatch`). The whole inbound
pipeline (match + store + idempotency + trust-event) is in ONE shared function
`processInboundSms` in `server/inboundProcessor.ts`. Both the real Twilio webhook
(`POST /api/sms/inbound`, after signature validation) AND the admin test simulator
call it — there is intentionally no second copy. If you change inbound behavior,
change it there, not in a route.

**Why:** an admin-only SMS test simulator was added that must exercise the EXACT
real path. Duplicating the logic would let the simulator and production drift.

## Admin SMS test simulator
`POST /api/admin/sms-test/simulate` (+ `GET /api/admin/sms-test/status`) push a fake
inbound payload through `processInboundSms`. Double-gated: admin role AND env flag
`ENABLE_SMS_TEST_TOOLS=true`. When the flag is off, simulate returns 404 and status
returns `{enabled:false}` so the UI panel (in `AdminInboundReplies.tsx`) stays
hidden. Never relax the Twilio signature check on the real webhook to enable testing
— the simulator is the supported way to test without a signed request.

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

## Surfacing trust events to admins (Trust Timeline)
The inquiry detail page (`InquiryThread.tsx`, route `/inquiry/:threadToken`) loads
from `GET /api/public/inquiry/:threadToken`. That route's `isArtist` flag is TRUE
ONLY for the owning vendor (viewerUserId === inquiry.vendorId), so admins get
isArtist=false. Any authenticated admin-visible section must gate on a SEPARATE
flag, not isArtist. The Trust Timeline uses `canViewTrustTimeline` (vendor OR
role==='admin') returned from that route, and its data comes from the
authenticated-only `GET /api/inquiries/:threadToken/trust-timeline`.

**Why:** gating admin UI on isArtist silently hides it from admins even though the
backend permits access. **How to apply:** for new admin surfaces on client/vendor
shared pages, add an explicit privileged flag rather than reusing isArtist.
