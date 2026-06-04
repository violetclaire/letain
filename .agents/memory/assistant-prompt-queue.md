---
name: Assistant prompt queue (headless delivery layer)
description: How Briarwood records business-event prompts for operators and pushes them over SMS/email.
---

# Assistant prompt queue + delivery preferences

Briarwood's "headless assistant" records an actionable prompt in `assistant_prompts`
whenever a business event happens, then delivers it over the operator's preferred
channel. Helper: `createAssistantPromptAndDeliver()` in `server/assistantService.ts`.
Operator prefs live as columns on `artist_profiles` (preferredDeliveryChannel,
assistantPhoneEnabled, assistantEmailEnabled, quiet-hours start/end, timezone,
assistantPromptMode). The operator's destination address is `users.phone`/`users.email`.

## Delivery defaults OFF by design
Both channel switches default false, so existing operators are NOT newly notified
(avoids double-emailing on top of the legacy vendor inquiry email). The prompt is
ALWAYS persisted in the queue regardless of delivery.
**Why:** the live DateInquiry email behavior must not change; operators opt in.

## Status semantics
`skipped` (no enabled channel / no address), `sent` (>=1 channel delivered),
`failed` (all attempts failed, see deliveryError), `queued` (held: digest mode OR
within quiet hours). **There is no flush job** — `queued` prompts sit in the queue
until a future digest/quiet-hours release worker is built. This is intentional and
scoped; do not assume queued prompts auto-deliver.

## Wiring
Only the "new inquiry received" event is wired so far: fire-and-forget call at the
end of `POST /api/inquiries` (after the existing vendor email), never blocks or
fails inquiry creation. Other events (reply, schedule needed, invoice due, referral,
routing) are intended future callers of the same helper.

## Availability analysis + trusted-circle routing (decision layer)
`analyzeInquiryAvailability(operatorId, eventDate)` reads ONLY existing calendar
data: a blocked_dates row with reason 'Booked' => operator_unavailable; any other
blocked row (Pending/other) => possible_conflict (a blocked row is never reported
as available); no block => fall back to checkAvailability; missing date or any
throw => unknown (never guess). `getRoutingSuggestions()` returns active trusted-circle
+ accepted (non-removed) team members, resolves each to a user to check their
date availability, prefers available, capped at 3 - SUGGESTION ONLY, never auto-routes.
`buildInquiryAssistantPrompt()` composes the upgraded new-inquiry prompt and upgrades
status to possible_network_route when the operator is unavailable/conflict AND a
route exists. Suggested actions: ACCEPT/SEND_PRICING/(BUILD_SCHEDULE if partySize>1),
ROUTE/REVIEW when routing, REVIEW-first when unknown/unavailable-with-no-route.
**Why:** honest reads over optimistic guesses; operator always approves routing.

## Control surface (internal Assistant page) - settings + queue
Operator-facing control center at route /admin/:slug/assistant (page
client/src/pages/AssistantControl.tsx, linked from ArtistAdmin nav). Three endpoints,
SESSION-AUTH ONLY (getAuthUserId; no magic-link token, no public path - they 401
unauthenticated): GET/PATCH /api/assistant/settings (read+write the artist_profiles
assistant pref columns via a strict zod schema - only channel/phone/email/mode/quiet
hours/timezone; quiet hours bounded 0..23) and GET /api/assistant/prompts (operator
sees own via getAssistantPromptsByOperator; users.role==='admin' sees all via
getAllAssistantPrompts). Queue is read-only display (no delivery toggling here).
**Why:** user wanted one internal control center, no public access; admin-all kept
simple via role check. Delivery still OFF until operator turns phone/email on here.

## Inquiry availability + contract/calendar check (analyzeInquiryAvailability)
Deep availability read run on each new inquiry, READ-ONLY and additive. Precedence
(strongest booked signal wins): signed contract on date > active booking
(accepted/confirmed/completed) > calendar block reason 'booked' > soft conflicts
(sent/draft contract, pending booking, pending/other block, competing live inquiry)
> calendar fallback (storage.checkAvailability). 8 statuses incl booked_by_contract,
blocked_on_calendar, needs_review. Result is structured: status, reason,
evidenceSource, conflictingRecordIds, confidence, suggestedAction (+ detail alias).
**Contract dates are FREE TEXT** (contracts.eventDates) - matched conservatively via
dateTokens() substring tokens (ISO, M/D/Y, "Month D, YYYY", etc, all UTC to match
toDateStr); never guesses if no token matches. **Partial-data rule:** per-source
fetch failures are tracked (sourceFailed flag); if any source failed and no conflict
found, return 'unknown' NOT operator_available - do not claim available off
incomplete data. buildInquiryAssistantPrompt escalates unavailable-like + has-route
to possible_network_route.
**Why:** task demanded honest availability without guessing; architect flagged that
swallowing source failures to [] could falsely report available.

## Availability trust events (score-neutral)
recordAvailabilityTrustEvents writes availability_checked, fit_evaluated, and
route_suggested (last only when possible_network_route) via
cdiEngine.recordBehavioralEvent with signalStrength 0 so they appear in the operator's
behavioral log but NEVER move CDI. They are operator-level (userId=vendorId); they do
NOT surface in the inquiry trust timeline because that timeline only links events via
booking or inbound-SMS, and a fresh inquiry has neither - adding an inquiry-direct link
would require schema/query changes (not additive-safe), so intentionally left out.
