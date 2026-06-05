---
name: Briarwood response composer + routing/delegation layer
description: Design rules for the operator-approved response composer and generic routing/preflight layer
---

## What it is
Briarwood core layer letting an operator respond to an inquiry (pricing/info,
decline, or refer/route/delegate) and route work to a generic network of "route
targets" (humans or agents) with a preflight handshake before any client sees them.
Three additive tables: route_targets (address book), inquiry_routes (a routing of
one inquiry to one target), inquiry_responses (a drafted/sent client message).
Drafts/templates live in server/routingService.ts; endpoints in server/routes.ts;
UI is the InquiryComposer in client/src/pages/AssistantControl.tsx (surfaced per
assistant prompt that has an inquiryId, behind a "Respond" toggle).

## Non-negotiable design rules (constraints that drove this build)
- **Operator approves every client-facing send.** Nothing auto-sends. Saving a
  draft (POST responses) never sends; sending is a separate explicit endpoint
  (POST inquiry-responses/:id/send). Preflight to a target is also explicit.
- **Referral acceptance gate is enforced SERVER-SIDE, not just in the UI.** A
  referral response may only be sent if at least one inquiry_route for that inquiry
  has status "accepted". The UI also disables the button, but a direct API call
  must be rejected (400). **Why:** code review flagged that a UI-only gate is
  bypassable; the rule "referral only includes accepted people" must hold at the API.
- **All routing/composer events are CDI-neutral.** recordRoutingEvent() forces
  signalStrength 0 via cdiEngine.recordBehavioralEvent. These are observational
  only and must never move a CDI score.
- **Never touch the live DateInquiry inquiry status/flow.** This layer only writes
  its own three tables; it does not mutate the inquiry row or its status.
- **All endpoints operator-authenticated, none public.** Each checks getAuthUserId
  then ownership (operatorId on the resource, or inquiry.vendorId for inquiry-scoped
  reads/writes). Composer reads (routes/responses) are scoped behind the inquiry
  ownership check.

## Generic by design
route_type and the targets are channel/role-agnostic (referral, delegation, review,
scheduling, agent, follow_up; targets can be internal team, trusted circle, or
agents). Keep new routing logic channel-agnostic per the Briarwood architecture rule.

## Trust Timeline visibility (read-only)
Composer/routing activity is surfaced on the inquiry Trust Timeline by DERIVING
entries from the inquiry-scoped inquiry_responses + inquiry_routes records inside
storage.getTrustTimeline, NOT from cdi_behavioral_events.
**Why:** routing/composer behavioral events are operator-scoped (recordRoutingEvent
passes operatorId only, no inquiryId/bookingId), so they cannot be reliably linked
to one inquiry. The route/response tables are inquiry-keyed, so derivation is exact
with no guessing. Derived rows are read-only and hardcode signalStrength 0 to match
how the system records them.
