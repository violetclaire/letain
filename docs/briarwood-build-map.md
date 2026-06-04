# Briarwood Current Build Map

A snapshot of what exists in the Replit prototype today. Plain English first, then the technical detail. No code was changed to produce this document.

Two names to keep straight:

- **Briarwood** is the permanent product: the trusted coordination and execution layer that lives behind the scenes for an operator (an artist).
- **DateInquiry** (dateinquiry.com) is a temporary intake bridge that is live right now. It catches inquiries from the operator's real website (The Makeup Dolls) and feeds them into Briarwood. It is meant to be replaced later, so nothing permanent should be designed around it.

---

## 1. Live intake / DateInquiry bridge

**Plain English:** A bride fills out the inquiry form on the operator's website. That submission lands in the system as a new inquiry. This is live and must never break.

**Technical:**
- Public inquiry creation endpoint: `POST /api/inquiries` (server/routes.ts ~10415). No login required, since the client is a member of the public filling out a form.
- The operator's branded form lives at `/inquire/{slug}`; each operator has a unique slug.
- DateInquiry is the current front door. Treat it as a throwaway bridge: keep it working, do not extend its shape, design new logic to accept future intake sources too (email, SMS, manual entry, other operators' sites).

---

## 2. Inquiry object and where inquiries are created

**Plain English:** Every booking request becomes one "inquiry" record. It holds the client's name, contact, event date, location, service, party size, and message.

**Technical:**
- Table: `inquiries` (shared/schema.ts).
- Created by `POST /api/inquiries`. After the legacy vendor email is sent, a fire-and-forget call records an assistant prompt (see #4). That call never blocks or fails inquiry creation.
- Read by owner: `GET /api/inquiries/:id` (session-auth, scoped to `inquiry.vendorId`).
- Private client thread: `GET /api/public/inquiry/:threadToken` (magic-link token, zero-login for the client).

---

## 3. Assistant settings and delivery preferences

**Plain English:** Each operator can choose how they want to be nudged (text, email, both, or off), set quiet hours, a timezone, and whether prompts arrive immediately or as a digest. By default notifications are OFF so nobody gets newly spammed.

**Technical:**
- Stored as columns on `artist_profiles`: preferredDeliveryChannel, assistantPhoneEnabled, assistantEmailEnabled, assistantQuietHoursStart/End, assistantTimezone, assistantPromptMode.
- Destination address comes from `users.phone` / `users.email`.
- Endpoints: `GET/PATCH /api/assistant/settings` (session-auth only, strict zod validation, quiet hours bounded 0..23).
- UI: client/src/pages/AssistantControl.tsx (route `/admin/:slug/assistant`).
- Both channel switches default false on purpose so the live DateInquiry email behavior is unchanged. Operators opt in.

---

## 4. Assistant prompt queue

**Plain English:** When something happens (today: a new inquiry arrives), the system writes a short actionable note for the operator and, if they opted in, delivers it by text or email. The note is always saved even if delivery is off.

**Technical:**
- Table: `assistant_prompts`.
- Helper: `createAssistantPromptAndDeliver()` in server/assistantService.ts.
- Endpoint: `GET /api/assistant/prompts` (operator sees own via getAssistantPromptsByOperator; admin role sees all).
- Status meanings: `skipped` (no enabled channel/address), `sent` (delivered on at least one channel), `failed` (all attempts failed, see deliveryError), `queued` (held for digest mode or quiet hours).
- Known gap: there is **no flush job** yet, so `queued` prompts sit until a future digest/quiet-hours release worker exists. Intentional and scoped.
- Wiring: only the "new inquiry received" event is wired so far. Reply, schedule-needed, invoice-due, referral, and routing are intended future callers of the same helper.

---

## 5. Structured prompt metadata / availability snapshot

**Plain English:** Beyond the human-readable note, each prompt also carries a machine-readable record of *why* a recommendation was made: was the operator free that day, what is the conflict, what should they do next, who could it be routed to.

**Technical:**
- Nullable typed jsonb column `assistant_prompts.metadata` (types AssistantPromptMetadata / AssistantPromptAvailability in shared/schema.ts).
- Holds: availabilityStatus, availabilityReason, evidenceSource, conflictingRecordIds, confidence, suggestedNextActions, possibleRoutes, plus a context snapshot (client/service/eventDate ISO/location/partySize/referral).
- Built in `buildInquiryAssistantPrompt()`, persisted via createAssistantPromptAndDeliver. Does not touch CDI.
- Migration quirk: drizzle.config.ts points at DATABASE_URL but the app runs on NEON_DATABASE_URL. `db:push` targets the wrong database. This column (and the new tables) were created directly via `npx tsx` importing server/db. Any production deploy must apply the same change on the prod DB.

---

## 6. Inquiry availability + contract/calendar check

**Plain English:** When a new inquiry arrives, the system reads existing calendar, contract, and booking data to honestly say: are they free, busy, or is it unclear. It never guesses. If data is incomplete it says "unknown" rather than claiming "available."

**Technical:**
- `analyzeInquiryAvailability(operatorId, eventDate)` in server/assistantService.ts. Read-only and additive.
- Precedence (strongest "booked" signal wins): signed contract on date > active booking (accepted/confirmed/completed) > calendar block reason 'booked' > soft conflicts (sent/draft contract, pending booking, pending/other block, competing live inquiry) > calendar fallback (storage.checkAvailability).
- 8 statuses including booked_by_contract, blocked_on_calendar, needs_review.
- Contract dates are FREE TEXT (`contracts.eventDates`), matched conservatively via date-token substring matching; never guesses without a token match.
- Partial-data rule: if any source fetch failed and no conflict was found, returns `unknown`, not `operator_available`.

---

## 7. SMS outbound

**Plain English:** The system can send texts to people (operator-initiated): reminders, confirmations, payment nudges, schedule notices, and custom messages.

**Technical:**
- server/smsService.ts: sendSms, sendBulkSms, sendBookingReminder, sendBookingConfirmation, sendPaymentReminder, sendScheduleNotification, sendCustomNotification, plus normalizePhoneNumber and isSmsConfigured.
- Endpoints (all session-auth): `POST /api/sms/send`, `/booking-reminder`, `/booking-confirmation`, `/payment-reminder`, `/schedule-notification`, `/bulk`; status at `GET /api/sms/status`.
- Twilio env already present: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER.

---

## 8. SMS inbound capture

**Plain English:** When someone texts back, the message is captured and stored so it can be matched to the right inquiry.

**Technical:**
- Public webhook: `POST /api/sms/inbound` (server/routes.ts ~3584). Must validate `X-Twilio-Signature` before doing any work, fail-closed (403 if unconfigured or invalid).
- URL reconstruction gotcha behind Replit's proxy: rebuild the exact URL Twilio posted to using x-forwarded-proto and req.get('host'); a mismatch 403s legit messages.
- Table: `inbound_sms_messages` (unique `message_sid` for idempotency).
- Recent feed: `GET /api/sms/inbound/recent`.

---

## 9. Inquiry-context SMS matching

**Plain English:** An incoming text is matched to an inquiry by context, not just the phone number, because numbers can be shared or spoofed. A trust event is only recorded when the system is confident about both the person and the inquiry.

**Technical:**
- Matching: `resolveInboundMatch` in server/inboundMatcher.ts.
- Single shared pipeline `processInboundSms` in server/inboundProcessor.ts (used by both the real webhook and the admin test simulator, so they can never drift).
- Gating rule for an auto-`matched` result and a `response_received` trust event: top score >= MATCH_MIN, margin >= MATCH_MARGIN over runner-up, an artist to attribute to, AND `hasPersonSignal` (sender phone/email matches that specific inquiry/referral). Without the person link the result is `needs_review`, never `matched`.
- Idempotency: inbound row inserted first; unique message_sid guards the race; trust event only after a successful dedup insert, then row patched with trustEventId.
- Status meanings: `matched` (trust event fires), `needs_review` (ranked suggestions, no trust event), `unmatched` (stored, no trust event).
- Admin test simulator: `POST /api/admin/sms-test/simulate` and `GET /api/admin/sms-test/status`, double-gated by admin role AND env flag `ENABLE_SMS_TEST_TOOLS=true`. Off by default (returns 404/`{enabled:false}`).

---

## 10. Admin review / manual matching

**Plain English:** When the system is not sure who a text belongs to, an admin can review the candidates and pick the right one by hand.

**Technical:**
- Search candidates: `GET /api/sms/inbound/match-search`.
- Assign manually: `POST /api/sms/inbound/:id/match`.
- UI: client/src/pages/AdminInboundReplies.tsx (route /admin/inbound-replies), with the SMS test panel hidden unless the env flag is on.

---

## 11. Trust timeline

**Plain English:** Each inquiry has a timeline of coordination events so the operator (and admins) can see what has happened around it.

**Technical:**
- Data: `GET /api/inquiries/:threadToken/trust-timeline` (authenticated only).
- Visibility flag: `canViewTrustTimeline` (vendor OR role==='admin'), returned from `GET /api/public/inquiry/:threadToken`. Do not gate admin sections on `isArtist` (that flag is true only for the owning vendor).
- Note: operator-level availability trust events (see #16) do not currently surface in the per-inquiry timeline, because that timeline links events via booking or inbound-SMS only, and a fresh inquiry has neither. Linking inquiry-direct events would need schema/query changes (not additive-safe), so it is intentionally left out for now.

---

## 12. Inquiry Response Composer

**Plain English:** Inside the assistant page, on any inquiry, the operator clicks "Respond" and gets three ways to reply: send pricing/info, decline, or refer/route/delegate. Each comes with a ready-to-edit draft, an optional personal note on top, and a live preview. Nothing goes out until the operator approves.

**Technical:**
- Drafts/templates: server/routingService.ts (buildPricingDraft, buildDeclineDraft, buildReferralDraft, applyPersonalNote).
- One-stop context load: `GET /api/inquiries/:id/composer` (returns context, default drafts, existing routes/responses, and the operator's route targets). Scoped behind `inquiry.vendorId === userId`.
- Save draft (does not send): `POST /api/inquiries/:id/responses`.
- Approve and send to client: `POST /api/inquiry-responses/:id/send` (sends via emailService.sendGeneralEmail).
- UI: the InquiryComposer component in client/src/pages/AssistantControl.tsx, surfaced per prompt that has an inquiryId.

---

## 13. Generic routing / delegation preflight

**Plain English:** Before a client ever sees a referral, the operator asks people in their network first ("are you available/interested?"). Only people who accept are included in the message to the client. The "ask first" step is the preflight.

**Technical:**
- Create routes from selected targets: `POST /api/inquiries/:id/routes`.
- Send preflight to a target: `POST /api/inquiry-routes/:id/preflight` (chooses SMS or email by available contact info; SMS via smsService.sendSms, email via emailService.sendGeneralEmail).
- Record a target's reply: `PATCH /api/inquiry-routes/:id` (status accepted / declined / needs_review).
- Preflight copy is built by `buildPreflightMessage()` in routingService and is generic across route types (referral, delegation, review, scheduling, agent, follow_up).
- Server-side guard: a referral response can only be sent once at least one route for that inquiry is `accepted`. Enforced in the send endpoint, not just the UI, so a direct API call cannot bypass it.

---

## 14. Route target model / status

**Plain English:** A generic address book of people or agents the operator can route work to: a name, contact, a role label, tags, and flags for whether they are internal team or an agent.

**Technical:**
- Table: `route_targets` (operatorId, name, email, phone, roleLabel, tags, capabilities, isInternal, isAgent, active, preferred, availabilitySource, trustedCircleId, linkedUserId, notes).
- Endpoints: `GET /api/route-targets`, `POST /api/route-targets`, `PATCH /api/route-targets/:id` (all session-auth, scoped to operatorId).
- A routing of one inquiry to one target is `inquiry_routes` (routeType, status, preflightChannel/message/sentAt, responseRaw, respondedAt). Statuses seen in the flow: draft, pending (preflight sent), accepted, declined, needs_review, sent_to_client, completed.

---

## 15. Client response drafts

**Plain English:** The actual messages prepared for the client. Each is a type (pricing, decline, referral), an optional personal note, the body, and whether it has been sent.

**Technical:**
- Table: `inquiry_responses` (operatorId, inquiryId, responseType, channel, personalNote, body, status, sentAt).
- Lifecycle: created as `draft` via POST responses, moved to `sent` via the send endpoint. Pricing/decline send freely; referral send is gated on at least one accepted route.
- On a referral send, accepted routes are flipped to `sent_to_client`.

---

## 16. Observational trust events

**Plain English:** As the operator coordinates (drafts a reply, sends pricing, preflights a route, gets an acceptance), the system quietly records what happened to build a history. These are observations only and never change the operator's trust score (CDI).

**Technical:**
- `recordRoutingEvent()` in server/routingService.ts and `recordAvailabilityTrustEvents()` in assistantService both call cdiEngine.recordBehavioralEvent with `signalStrength: 0`, so they appear in the behavioral log but never move CDI.
- This is a hard rule for this layer: routing/composer/availability events stay score-neutral.

---

## 17. Briarwood core vs temporary DateInquiry bridge

**Briarwood core (permanent, keep channel-agnostic):**
- Inquiry object and lifecycle
- Assistant settings, prompt queue, structured metadata/availability snapshot
- Availability + contract/calendar check
- SMS outbound, inbound capture, context matching, admin manual matching
- Trust timeline and observational trust events
- Inquiry Response Composer, generic routing/delegation preflight, route targets, client response drafts

**Temporary DateInquiry bridge (replaceable):**
- The dateinquiry.com intake front door and the `/inquire/{slug}` branded form as the *current* single source of inquiries from The Makeup Dolls site.
- Rule: keep it working, do not over-invest in it, and design new logic to accept future intake sources (email, SMS, manual, other operators), not just this bridge.

---

## 18. Critical files / tables / routes

**Files:**
- server/routes.ts — all HTTP endpoints (intake, inquiry, assistant, SMS, composer, routing)
- server/assistantService.ts — prompts, availability analysis, availability trust events
- server/routingService.ts — composer drafts, preflight copy, score-neutral routing events
- server/smsService.ts — outbound SMS + Twilio signature validation
- server/inboundMatcher.ts and server/inboundProcessor.ts — inbound match + shared pipeline
- server/storage.ts — data access (IStorage + DatabaseStorage)
- server/db.ts — DB connection (prefers NEON_DATABASE_URL)
- shared/schema.ts — all tables and types
- client/src/pages/AssistantControl.tsx — assistant control center + composer UI
- client/src/pages/AdminInboundReplies.tsx — inbound review / manual matching

**Tables:**
- inquiries, artist_profiles, users
- assistant_prompts (+ metadata jsonb)
- inbound_sms_messages
- trusted_circle, thread_referrals
- route_targets, inquiry_routes, inquiry_responses

**Routes (most load-bearing):**
- `POST /api/inquiries` (public intake), `GET /api/inquiries/:id`
- `GET/PATCH /api/assistant/settings`, `GET /api/assistant/prompts`
- `POST /api/sms/inbound` (signed webhook), `GET /api/sms/inbound/recent`, `POST /api/sms/inbound/:id/match`
- `GET /api/inquiries/:threadToken/trust-timeline`
- `GET /api/inquiries/:id/composer`, `POST /api/inquiries/:id/responses`, `POST /api/inquiry-responses/:id/send`
- `POST /api/inquiries/:id/routes`, `POST /api/inquiry-routes/:id/preflight`, `PATCH /api/inquiry-routes/:id`
- `GET/POST /api/route-targets`, `PATCH /api/route-targets/:id`

---

## 19. Known technical debt

- **DB target mismatch:** drizzle.config.ts uses DATABASE_URL but the app runs on NEON_DATABASE_URL, so `db:push` and the executeSql tool point at the WRONG database. New columns/tables must be applied directly against the NEON DB (via a one-off `npx tsx` importing server/db), and the same change must be applied to production on deploy.
- **No queued-prompt flush job:** prompts in `queued` (digest mode / quiet hours) are never released automatically yet.
- **Availability trust events are not on the per-inquiry timeline:** the timeline links events via booking or inbound-SMS only; fresh-inquiry events do not appear without non-additive schema/query changes.
- **Schema/DB drift on blocked_dates:** the live table lacks the `created_at` the schema declares, so reads must project explicit columns or they throw.
- **users has no businessName/displayName:** display names must be derived from firstName/lastName/username/email; some older queries referenced users.businessName as latent bugs.
- **Large pre-existing tsc noise:** the repo runs via tsx without typechecking and has roughly a thousand pre-existing type errors (commonly `string | null` not assignable). Match existing patterns rather than fixing in isolation.
- **Delivery still off by default:** operators must opt in to SMS/email prompts; this is intentional but means no nudges go out until configured.

---

## 20. Safest next build options

These are additive, low-risk, and consistent with the standing constraints (additive only, no renames, never break live DateInquiry, operator approves all sends, CDI stays observational). Listed as options, not a commitment, and nothing here is built.

1. **Queued-prompt release worker** — a small scheduled job that flushes `queued` assistant prompts when quiet hours end or a digest window opens. Fills a known gap without changing existing behavior.
2. **Wire more events into the existing prompt queue** — reply-received, schedule-needed, route-accepted. Reuses createAssistantPromptAndDeliver; no new surface area.
3. **Surface route/composer activity on the trust timeline** — read-only display of the observational events already being recorded, if it can be done without non-additive schema changes.
4. **Route target management UI** — a simple screen to add/edit route targets (the data model and endpoints already exist; only UI is missing).
5. **Production DB reconciliation checklist** — a documented, repeatable way to apply the manual schema changes to the prod NEON DB so deploys do not drift.

Explicitly out of scope per the current direction: payments, inbound email, AI, marketplace/search, voice, schedule-builder rebuild, and refactors.

---

## Full current product loop

```
external inquiry source (The Makeup Dolls site via the DateInquiry bridge today;
  future: email, SMS, manual entry, other operators)
  -> Briarwood inquiry object (inquiries table; POST /api/inquiries)
  -> availability / contract / calendar check (analyzeInquiryAvailability, read-only, honest)
  -> assistant prompt recorded (+ structured metadata) and delivered if operator opted in
  -> operator opens the Response Composer on that inquiry
  -> pricing / decline / route decision (operator picks, edits draft, adds a personal note)
  -> route / delegation preflight if needed (ask each network target first; SMS or email)
  -> accepted route target included and the message sent to the client only if the
     operator approves (referral send is server-side gated on at least one acceptance)
  -> trust / coordination events recorded (observational, signalStrength 0, never moves CDI)
  -> trust timeline updated (and the operator's execution-trust history grows over time)
```

Throughout the loop: the operator approves every client-facing send, the live DateInquiry behavior is never altered, and all coordination events stay observational so they never inflate the CDI score.
