# Briarwood Safe Demo Spine v1

Status: VERIFIED checkpoint. Date: June 05, 2026.

This is a documentation-only checkpoint. No app behavior, routes, schema, or UI
were changed to produce it. It records what is proven so the true Briarwood core
can later be extracted into Codex.

---

## 1. What Safe Demo Spine v1 includes

Safe Demo Spine v1 is the smallest set of backend protections that make the core
Assistant/Composer coordination loop safe to demo live without any real message
leaving the system.

It includes:

- A per-operator Demo Mode flag (`assistant_dry_run`) on `artist_profiles`.
- Server-enforced dry-run on the two core outbound actions: composer client send
  and routing preflight.
- Read-only preview endpoints that mirror the real actions but never send or write.
- A visual Demo Mode banner on the operator Assistant page (already shipped) that
  appears only for an authenticated operator whose dry-run is ON.
- A complete Outbound Delivery Safety Audit mapping every send path and whether it
  is protected (reference for what is and is not safe).

What it does NOT include: any change to contracts, invoices, payments, info-sheet
sends, thread replies, chat invites, reminders, bulk SMS, transactional/auth
email, AI sends, or schedule sends. Those remain outside the spine.

---

## 2. The product loop it proves

The loop a Briarwood operator can run end to end, safely, in Demo Mode:

1. An inquiry arrives (legacy DateInquiry intake; operator alert is dry-run safe).
2. The operator drafts a client response in the composer (pricing, decline, or
   referral).
3. The operator routes the inquiry to a trusted colleague (route target) and can
   preflight ask them first.
4. With Demo Mode ON, every "send" is intercepted by the backend: the operator
   sees exactly what would go out, but nothing is sent and nothing is recorded.

This proves the coordination choreography (draft, route, preflight, approve) works
without risking a real client or colleague being contacted during a demo.

---

## 3. The exact dry-run protections now verified

When the operator's `assistant_dry_run` is ON, the backend itself (not the UI)
guarantees, for the two core send routes:

- No Resend email call.
- No Twilio SMS call.
- The response is not marked sent and no `sentAt` is set.
- The route is not marked pending and no `preflightSentAt` is set.
- No sent history row is written.
- No trust / coordination (CDI) event is created.
- A clear response is returned: `dryRun: true`, `blocked: true`, plus a preview
  payload describing what would have happened.

When `assistant_dry_run` is OFF, the original real-send behavior is unchanged.

### Runtime verification result (live HTTP test against the running server)

Performed with a throwaway operator (dry-run ON) and disposable fixtures, driving
the real endpoints with a valid authenticated session, then cleaned up.

- 17/17 checks passed.
- Response send route blocked under dry-run (`dryRun: true`, `blocked: true`).
- Preflight route blocked under dry-run (`dryRun: true`, `blocked: true`).
- Preview endpoints wrote nothing.
- No sent history created.
- No route status changes from preview (route stayed `draft`).
- No routing / coordination events created by dry-run sends
  (`cdi_behavioral_events` count unchanged: before 0, after 0).
- No email / SMS sent.
- App booted cleanly (migrations OK, serving on port 5000).
- No public access added (both routes still require authentication and ownership).

---

## 4. The backend endpoints that are dry-run protected (server-enforced)

These block the real send in the backend when dry-run is ON, even if called
directly:

- `POST /api/inquiry-responses/:id/send` (composer client send)
- `POST /api/inquiry-routes/:id/preflight` (routing preflight to a route target)

Also server-enforced from earlier work (part of the broader safety surface, not
the two routes hardened in this milestone):

- Assistant prompt delivery (assistant service): saved as `dry_run`, nothing sent.
- Legacy operator "new inquiry" alerts in the public intake handlers
  (`contact-webhook`, `inquiry-v2`, `intake`, `public/inquiries`): operator
  SMS/email alert suppressed and logged.

---

## 5. The preview endpoints that are read-only

These mirror the real action's recipient / subject / body / channel logic but
perform zero sends and zero writes. They always return `dryRun: true`:

- `POST /api/inquiries/:id/responses/preview` (mirror of composer send)
- `POST /api/inquiry-routes/:id/preflight/preview` (mirror of preflight)

The operator UI calls these when Demo Mode is ON. The backend dry-run guard on the
real routes is the second, authoritative layer behind them.

---

## 6. The Coordination Timeline behavior

The coordination timeline is built from routing events recorded as the operator
drafts, routes, preflights, and approves. In normal (non-dry-run) operation each
step records a score-neutral event (see section 7) so the timeline reflects the
real choreography without ever inflating trust.

Under Demo Mode (dry-run ON), the core send actions record NO timeline event.
This is intentional: a demo must not write coordination history that looks like a
real interaction occurred. The timeline therefore stays honest. It only shows
events that correspond to real, non-dry-run actions.

---

## 7. The CDI / signalStrength 0 safety rule

Routing / coordination events are observational only. They are recorded through
the CDI engine with `signalStrength = 0`, which means they are score-neutral: they
document that a coordination step happened, but they never raise or lower an
operator's headline CDI.

Product principle: an LLM (or any agent) can interpret the trust record but cannot
create it. Headline CDI is derived only from genuine behavioral signals
(timestamps, status transitions, payment webhooks, holds honored, completions),
not from observational routing notes. Dry-run sends create no event at all, so they
cannot affect CDI even neutrally.

---

## 8. The database rule: live app uses NEON_DATABASE_URL

The live app reads and writes `NEON_DATABASE_URL` (Neon serverless Postgres), NOT
`DATABASE_URL`. Sessions also use `NEON_DATABASE_URL`. Standing database rules:

- Confirm the live DB host/provider first, without exposing secrets.
- Apply changes only to the same DB the running app uses (Neon).
- Additive / idempotent SQL only (`CREATE TABLE IF NOT EXISTS`,
  `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
- Never rename or drop tables without explicit approval.
- Startup self-healing migrations live in `server/index.ts`.

The runtime verification above ran against the live Neon DB and removed all test
fixtures afterward.

---

## 9. The tables involved

Core spine tables:

- `artist_profiles` — holds the `assistant_dry_run` flag (per operator).
- `inquiries` — the inquiry being responded to / routed.
- `inquiry_responses` — composer drafts; `status` (`draft` -> `sent`) and `sentAt`.
- `inquiry_routes` — routing records; `status` (`draft` -> `pending` -> ...),
  `preflightChannel`, `preflightMessage`, `preflightSentAt`.
- `route_targets` — the colleagues / vendors an inquiry can be routed to.
- `cdi_behavioral_events` — where coordination events are recorded (signalStrength
  0 for routing events).
- `sessions` — auth sessions (Neon-backed).
- `users` — operator identity / ownership.

Supporting (assistant + legacy intake protections): `assistant_prompts`.

---

## 10. The routes involved

Hardened in this milestone (server-enforced dry-run):

- `POST /api/inquiry-responses/:id/send`
- `POST /api/inquiry-routes/:id/preflight`

Read-only previews:

- `POST /api/inquiries/:id/responses/preview`
- `POST /api/inquiry-routes/:id/preflight/preview`

Supporting composer / routing routes (unchanged):

- `POST /api/inquiries/:id/responses` (create draft)
- `POST /api/inquiries/:id/routes` (create routes)
- `PATCH /api/inquiry-routes/:id` (capture a target's reply)

All require authentication and enforce operator ownership (`operatorId` /
`vendorId` === the session user). No public access exists on any of them.

---

## 11. What remains out of scope

Not part of Safe Demo Spine v1, and deliberately untouched:

- Contracts (send, signing, signed copies, executed notifications).
- Invoices and payments (email + SMS, receipts, payment links).
- Info-sheet sends.
- Thread replies and client reply notifications.
- Chat / quick-chat invites.
- Booking reminders, booking confirmations, payment reminders.
- Schedule emails and schedule notification SMS.
- Bulk SMS.
- Transactional / auth email (login, signup, password reset, welcome, waitlist).
- AI-triggered sends.
- Trusted Circle invites.
- Inbound email and inbound AI.

---

## 12. What should not be demoed yet

These send for real and are NOT protected by dry-run. Do not exercise them in a
live demo:

- Any contract path.
- Any invoice / payment path (email or SMS), including payment receipts and
  payment reminders.
- AI-triggered sends.
- Bulk SMS (fan-out risk, up to 100 recipients).
- Trusted Circle invites (reach real colleagues).
- The scheduled invoice email job (sends queued invoice emails every minute).
- Info-sheet, thread reply, chat invite, schedule, and booking reminder sends
  (real client contact).

UI-note: the composer and preflight previews are safe, but only because the UI
chooses the preview path. As of this milestone the real routes are ALSO safe
server-side, so the two core actions are protected either way.

---

## 13. What should be extracted later into Codex as Briarwood core

The durable, channel-agnostic Briarwood concepts worth lifting into Codex:

- The coordination loop: draft -> route -> preflight -> approve, independent of
  inquiry source.
- The dry-run contract: a single operator-level Demo Mode flag that the backend
  honors on every outbound action, returning a uniform `{ dryRun, blocked,
  preview }` shape.
- The preview/real symmetry: every real send has a read-only mirror that produces
  the identical preview payload.
- The CDI boundary: coordination events are observational (signalStrength 0);
  headline trust is derived only from genuine behavioral signals.
- Route targets and the routing record model (referral / delegation / review /
  scheduling / agent / follow-up) as first-class, not inquiry-specific.

Extract these by their behavior and contracts, not by copying DateInquiry-specific
plumbing.

---

## 14. What is temporary DateInquiry bridge behavior

DateInquiry is the live host app and the current intake bridge. Treat as
temporary / not part of permanent Briarwood core:

- The public intake endpoints (`contact-webhook`, `inquiry-v2`, `intake`,
  `public/inquiries`) and their operator-alert wiring.
- Inquiry-centric assumptions where the permanent model should be task/route
  centric (an `inquiry_route` can already point at any task, not just an inquiry).
- DateInquiry branding, domains (dateinquiry.com), and email "from" identities.
- Legacy send paths kept for backward compatibility.

Do not name permanent Briarwood concepts after DateInquiry. Design new logic to be
channel-agnostic and source-agnostic.

---

## 15. The next safest build options

Ordered by safety and value, each additive and reversible:

1. Extend server-enforced dry-run to the next operator-facing send only when
   needed for a demo (e.g. thread reply), using the same `{ dryRun, blocked,
   preview }` contract. One route at a time, verified the same way.
2. Add a single read-only "what would send" preview for any path before hardening
   it, so the preview/real symmetry is established first.
3. Add a lightweight delivery log (observational, no CDI impact) so dry-run and
   real actions are both visible in one timeline view for demos.
4. Make Demo Mode visibility clearer in the operator UI (already banner-backed)
   without touching send logic.
5. Begin the Codex extraction of the coordination loop contracts (section 13) as a
   separate, non-live spike, leaving this live app untouched.

Explicitly avoid, for now: anything touching contracts, payments, invoices,
inbound email, AI, schedules, reminders, or bulk SMS.

---

## Verification appendix (how this was proven)

- Method: live HTTP calls to the running server on port 5000, authenticated as a
  disposable operator with `assistant_dry_run = true`, against disposable
  fixtures (inquiry, draft response, route target, draft route), all deleted after
  the run.
- Assertions covered response shape, row state before/after, and
  `cdi_behavioral_events` counts.
- Outcome: 17/17 checks passed; no residue left in the database; no code, route,
  schema, or UI changes were made for the verification.
