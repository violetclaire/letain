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
