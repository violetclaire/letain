# Architecture

This document captures the current repository architecture from a read-only audit. It is descriptive, not prescriptive: it does not change product behavior, and it should not be treated as approval to refactor sensitive flows without tests and product review.

## System Overview

`beauvette` is a full-stack TypeScript application with a React/Vite single-page frontend, an Express backend, and a Postgres database accessed through Drizzle ORM. The current codebase contains multiple product generations side by side:

- Beauvette artist/client/planner marketplace and booking surfaces.
- DateInquiry public inquiry and artist admin surfaces.
- Briarwood private coordination infrastructure for routing, trusted handoffs, assistant prompts, and trust-event logging.
- Demo, AI, agent, ACP, and experimental features.

The app is Replit-first in its deployment assumptions. The production build creates a Vite client bundle under `dist/public` and an Express server bundle at `dist/index.cjs`.

## Frontend Structure

Frontend code lives under `client/src`.

Key entry points:

- `client/index.html` is the Vite HTML shell.
- `client/src/main.tsx` mounts the React app.
- `client/src/App.tsx` owns the top-level route map using `wouter`.
- `client/src/lib/queryClient.ts` defines shared TanStack Query fetch behavior and the `apiRequest` helper.
- `client/src/hooks/useAuth.ts` reads `/api/auth/user` and derives logged-in state.

The frontend is route-heavy. Important route groups include:

- Auth and access: `/login`, `/artist-login`, `/signup`, `/forgot-password`, `/reset-password`, `/access/:code`.
- Artist operations: `/artist`, `/artist/inbox`, `/artist/availability`, `/artist/schedules`, `/artist/contracts`, `/settings`.
- Slug-based artist admin: `/admin/:slug`, `/admin/:slug/assistant`, `/admin/:slug/network`, `/admin/:slug/rolodex`, `/admin/:slug/contracts/:contractId`, `/admin/:slug/schedules/:scheduleId`.
- Inquiry and thread views: `/inquiry/:threadToken`, `/thread/:clientToken`, `/t/:token`.
- Public profile/inquiry and schedule views: `/:artistSlug`, `/schedule/:shareToken`, `/schedules/:tokens`, `/quote/:shareToken`.
- Demo and setup surfaces mixed into the same app route tree.

The UI is mostly page-driven rather than feature-module driven. Many pages call API endpoints directly. This makes route-level behavior easy to find but creates coupling between page components and backend route names.

## Backend Structure

Backend code lives under `server`.

Main entry points:

- `server/index.ts` creates the Express app, configures middleware, runs startup schema checks/DDL, registers route groups, serves the Vite app in development, serves static assets in production, and starts cron jobs.
- `server/routes.ts` is the primary route registry. It is a large kitchen-sink file containing auth, profiles, inquiries, routing, schedules, bookings, contracts, payments, SMS, email, admin, CDI, AI, import, and chat endpoints.
- `server/storage.ts` defines the large database storage abstraction and exports a singleton `storage`.
- `server/db.ts` initializes Neon/Postgres pooling and Drizzle.
- `server/replitAuth.ts` owns Replit OIDC session setup and `isAuthenticated`.
- `server/static.ts` and `server/vite.ts` switch between production static serving and Vite middleware.

Important service modules include:

- `server/routingService.ts`: Briarwood response composer and generic routing/delegation helpers.
- `server/inboundMatcher.ts` and `server/inboundProcessor.ts`: inbound SMS matching and trust-event creation.
- `server/smsService.ts`: Twilio send and webhook verification helpers.
- `server/emailService.ts`: Resend/Replit connector email sending.
- `server/scheduledEmailJob.ts`: in-process scheduled email loop.
- `server/cronJobs.ts`: hold expiration and SLA enforcement jobs.
- `server/objectStorage.ts`: Replit object storage access and ACL handling.
- `server/squareClient.ts` and `server/squareRoutes.ts`: Square API/OAuth/payment surfaces.
- `server/agentRoutes.ts` and `server/acpHandler.ts`: agent and ACP surfaces.

## Database and Schema Structure

Schema lives in `shared/schema.ts`, with Drizzle configured by `drizzle.config.ts`.

The schema is broad and includes these main table families:

- Auth/session: `sessions`, `users`.
- Role/intake/profile: client, artist, planner intakes; artist profiles; form configs; services; contacts.
- Availability and bookings: availability, blocked dates, bookings, booking checklists, messages.
- Contracts and payment state: contracts, contract templates, payments, proposals, vault metadata.
- Scheduling: legacy schedules, event-day schedules, schedule team members, schedule appointments, public schedule chat, schedule drafts.
- Inquiry and routing: inquiries, inquiry notifications, route targets, inquiry routes, inquiry responses.
- Trusted network and threads: trusted circle, threads, thread messages, thread referrals.
- Communication: communication logs, scheduled emails, inbound SMS messages.
- Trust/CDI/audit: CDI events, behavioral events, scores, AI insights, thresholds, admin overrides, audit logs.
- Assistant/AI: assistant prompts, AI chat conversations/messages.
- Agent/ACP: agents, API keys, webhooks, action logs, events, checkout sessions, challenges.

Important schema caveat: `server/index.ts` also performs many `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` and `CREATE TABLE IF NOT EXISTS` statements at startup. This means the codebase currently has two schema mechanisms: Drizzle schema files and runtime additive DDL. That can hide migration failures and cause drift between expected and actual production database shape.

## Auth and Session Models

The app has several auth/session models active at once.

### Replit OIDC

`server/replitAuth.ts` configures OIDC via `openid-client` and Passport. Login starts at `/api/login`, callback is `/api/callback`, and logout is `/api/logout`. The callback URL is derived from the request hostname.

Sessions are stored in Postgres using `connect-pg-simple` and the `sessions` table. Session cookies are HTTP-only, one week long, `sameSite: lax`, and `secure` in production.

### Email and Password

`server/routes.ts` also implements signup/login/logout/password reset endpoints. These set `req.session.userId` and share the same session middleware as OIDC.

A fragile behavior exists in artist login: the code can auto-link an artist profile to a user by matching email prefix/slug/business name, and may fall back to the first available profile in single-user setups. This should be treated as a high-risk multi-tenant ownership path.

### Magic/Edit Tokens

Some artist/admin surfaces support token-based access, including edit tokens on artist profiles and demo access tokens. These bypass normal session assumptions for specific workflows.

### Public Share Tokens

Several client-facing surfaces are intentionally tokenized rather than session-based: inquiry/client threads, public schedule shares, quotes, contracts, chat invites, and invitations.

### Agent API Keys

Agent routes use bearer tokens with `toile_...` API keys hashed in the database. Agent capabilities are checked against action policies and autonomy levels.

## Public Token Flows

Current public/tokenized flows include:

- Artist edit token: used for settings, availability, form configuration, and some simplified admin access.
- Demo access token: sets a session for demo/profile access.
- Inquiry thread token: `/inquiry/:threadToken` for artist-side inquiry thread views.
- Client thread token: `/thread/:clientToken` for client-side inquiry conversation views.
- Private thread token: `/t/:token` for white-label/private coordination thread views.
- Schedule share token: `/schedule/:shareToken` and `/schedules/:tokens` for public event-day schedules.
- Quote share token: `/quote/:shareToken`.
- Contract signing/countersign tokens: public signing flows separate from authenticated contract vault routes.
- Chat invite token: public client chat invite validation and message posting.
- Invitation token: public invite acceptance flow.
- Square OAuth state: stored in DB with expiration for Square connection callbacks.

These flows are expected product surfaces, not bugs by themselves. They should still be reviewed for expiry, scope, token entropy, object access, and data leakage before any broad refactor.

## Current Inquiry, Routing, Schedule, Contract, and Trust Modules

### Inquiry

Inquiry functionality is split across older DateInquiry/public artist flows and newer Briarwood routing infrastructure.

- Public inquiry form pages fetch public artist data and submit client inquiry details.
- Artist inquiry thread pages support accept/refer/decline-style workflows, messages, participant invites, contract preparation, and schedule creation.
- Client inquiry thread pages support client messages and photo uploads through tokenized access.
- Cron jobs enforce hold expiration and SLA-style next actions.

### Routing and Referral

Briarwood routing is centered on:

- `route_targets`: private operator network targets, not a public directory.
- `inquiry_routes`: route/delegation attempts tied to an inquiry and target.
- `inquiry_responses`: operator-drafted client responses.
- `server/routingService.ts`: default draft builders, preflight message builder, and score-neutral routing event logger.

Core rules currently embedded in the code:

- Default responses are drafts for the operator to personalize.
- Nothing in `routingService.ts` sends messages.
- Actual send/preflight endpoints require authenticated operator action.
- Assistant dry-run mode blocks sends server-side.
- Referral client responses require at least one accepted route before they can be sent.
- Routing events are observational and score-neutral.

### Schedule

Schedule functionality has multiple layers:

- `/api/schedules`: older booking-linked schedule records.
- `/api/schedule-drafts`: operator-only, owner-scoped editable schedule drafts. This is explicitly documented in code as foundation-only: no public access, no sending, no email/SMS, no payments, no signing, and no CDI changes.
- `/api/event-schedules`: event-day schedule grid with team members and appointments.
- `/api/event-schedules/share/:shareToken`: public schedule view and guest edits/notes/photos/chat.
- `/api/schedule/parse-clients`, `/api/schedule/voice-command`, `/api/ai/schedule-chat`: AI-assisted schedule creation/parsing helpers.
- Schedule sending endpoints use email/SMS and currently include hardcoded public base URLs in some paths.

### Contract

Contract functionality includes:

- Authenticated contract CRUD and list routes.
- Contract vault routes with explicit owner/admin scoping and safe metadata allowlists.
- Contract upload routes using object storage.
- Built-in signing/countersign token flows.
- Contract templates.
- Square/payment link and invoice integrations.

The vault code has useful security-oriented comments and allowlists. Contract signing/payment behavior should not be casually refactored until tests exist.

### Trust and CDI

Trust/CDI behavior exists in several forms:

- Behavioral CDI events from bookings, messages, checklists, business chat, routing, and inbound SMS.
- Score-neutral routing events from Briarwood coordination.
- Inbound SMS matching that only creates trust events when a sender can be confidently matched to both a person and an inquiry/referral.
- Admin CDI APIs, calculations, insights, thresholds, overrides, and sample/documentation endpoints.
- Audit logs for certain state changes.

There are both score-moving and score-neutral trust concepts. Future work should preserve that distinction.

## Briarwood Core vs Legacy Surfaces

### 1. Core Briarwood Infrastructure

These are the pieces most aligned with Briarwood's private coordination model:

- `route_targets` and `/api/route-targets`: private operator network targets.
- `inquiry_routes` and routing preflight endpoints: ask trusted people before the client sees a referral.
- `inquiry_responses` and response composer endpoints: operator-approved client messages.
- `server/routingService.ts`: channel/role-agnostic draft and preflight helpers.
- Assistant control surface: `/admin/:slug/assistant`, `/api/assistant/settings`, `/api/assistant/prompts`.
- Rolodex/universal search: authenticated, operator-scoped search across contacts, route targets, inquiries, contracts, bookings, and prompts.
- Inbound SMS storage/matching: `inbound_sms_messages`, `inboundMatcher`, `inboundProcessor`.
- Score-neutral trust/routing event logging for coordination observations.
- Operator-only schedule drafts, if kept constrained to private coordination and not merged with public event schedule publishing.
- Contract vault metadata, if kept as observational business state and not mixed with signing/payment side effects.

### 2. Legacy Beauvette/DateInquiry Surfaces

These appear to predate or sit adjacent to Briarwood's narrower trusted-network loop:

- General artist/client/planner dashboards and intakes.
- Public artist profiles and public inquiry pages.
- Vendor search and marketplace-like artist discovery routes.
- Booking CRUD, checklist, messaging, planner, and client account flows.
- Older `trusted_circle` referral surface.
- Legacy event-day schedule grid and public schedule share flow.
- DateInquiry-branded admin pages and public inquiry threads.
- Square, invoice, and payment link flows attached to broader Beauvette/DateInquiry operations.

These may remain necessary for current operations, but they should not be confused with the Briarwood core routing layer.

### 3. Demo or Experimental Surfaces

These should be treated as experimental until proven otherwise:

- Broad AI chat that can create bookings, schedules, quotes, images, portfolio uploads, and payment links.
- AI image generation.
- AI schedule parsing, schedule chat, and voice command helpers.
- CDI sample/docs endpoints and some admin-only CDI analysis APIs.
- Onboarding test inquiry seeding.
- Agent API and ACP checkout/challenge surfaces.
- Demo pages and prototype route variants in the frontend route map.

### 4. Areas That Should Not Be Refactored Yet

Do not refactor these until tests and product boundaries are in place:

- Auth/session/profile ownership behavior.
- Public token routes and token access models.
- Contract signing, countersigning, vault, payment, and Square flows.
- Inbound SMS webhook/matching/trust-event path.
- Runtime startup migrations and Drizzle schema drift.
- `routingService.ts` and the operator-approval/referral-gate rules.
- Object storage access for contracts, client photos, and schedule images.
- Public schedule share routes and guest-edit behavior.
- The large `storage.ts` abstraction, unless extracting behind tests and unchanged behavior.

## Known Fragile Areas

- Runtime schema changes in `server/index.ts` can hide migration failures and cause schema drift.
- `server/routes.ts`, `server/storage.ts`, and `shared/schema.ts` are very large and highly coupled.
- Multiple auth models coexist: OIDC, email/password, magic links, public tokens, demo tokens, and agent API keys.
- Artist-profile auto-linking during login is risky in multi-tenant contexts.
- Public token flows need a systematic expiry/scope/leakage review.
- `HandoffOutcome` appears mismatched: the frontend route does not provide the token the backend handoff endpoint expects, and its `apiRequest` call appears to use the wrong signature.
- Google Calendar availability failures may return no busy slots, which can overstate availability.
- In-process cron and scheduled email jobs assume a single running instance.
- Schedule email/SMS sending contains hardcoded Replit/public URLs in some paths.
- Side effects such as email, SMS, contracts, payments, and trust events are often embedded directly in route handlers.
- Error middleware in `server/index.ts` sends JSON and then throws, which can crash/restart the process on request errors.
- Square debug credential endpoint exposes credential prefixes/lengths and should be reviewed.
- Object storage upload paths and ACL policy need review, especially for contracts and private client assets.
- The frontend `apiRequest` helper has a narrow signature and at least one observed misuse.
- No automated test suite is configured.

## Deployment Assumptions

Observed deployment assumptions:

- Replit is the primary target.
- `.replit` uses Node.js 20, Python 3.11, Postgres 16, web module, and Chromium.
- Dev command is `npm run dev`, which runs `tsx server/index.ts`.
- Production deployment runs `npm run build` then `npm run start`.
- `npm run build` runs `script/build.ts`, building the Vite client and bundling the server with esbuild.
- Production server entry is `dist/index.cjs`.
- Static client assets are expected at `dist/public`.
- Main app port is `PORT` or `5000`; `.replit` maps local `5000` to external `80`.
- Replit autoscale is configured, but in-process cron jobs and scheduled email jobs are not distributed-lock safe.
- Client-facing links assume `PUBLIC_BASE_URL` or hardcoded production URLs in several places.

## Environment Variables

Observed or implied environment variables:

| Variable | Purpose | Notes |
| --- | --- | --- |
| `NODE_ENV` | Runtime mode | Controls production session cookie security and build/runtime behavior. |
| `PORT` | Express port | `.replit` sets `5000`. |
| `DATABASE_URL` | Postgres connection | Used by Drizzle config and as DB fallback. |
| `NEON_DATABASE_URL` | Preferred Neon/Postgres connection | Used before `DATABASE_URL` by `server/db.ts` and sessions. |
| `SESSION_SECRET` | Express session signing | Required by session middleware. |
| `REPL_ID` | Replit OIDC client id | Required by OIDC discovery/auth. |
| `ISSUER_URL` | OIDC issuer override | Defaults to `https://replit.com/oidc`. |
| `PUBLIC_BASE_URL` | Client-facing link base | `.replit` shared env sets `https://atbriarwood.com`; some code falls back to `https://dateinquiry.com`. |
| `REPLIT_DEPLOYMENT_URL` | Deployment URL fallback | Used in some share-link generation. |
| `REPLIT_CONNECTORS_HOSTNAME` | Replit connector host | Used for Resend connector lookup. |
| `REPL_IDENTITY` | Replit connector auth token source | Used for connector access in dev. |
| `WEB_REPL_RENEWAL` | Replit connector auth token source | Used for connector access in deployment. |
| `RESEND_API_KEY` | Direct Resend credential fallback | Used if Replit connector credentials are unavailable. |
| `TWILIO_ACCOUNT_SID` | Twilio account | Required for SMS. |
| `TWILIO_AUTH_TOKEN` | Twilio auth and webhook validation | Required for SMS and inbound signature validation. |
| `TWILIO_PHONE_NUMBER` | Twilio sender number | Required for SMS. |
| `ENABLE_SMS_TEST_TOOLS` | Admin SMS simulator flag | Must equal `true` to expose simulator behavior. |
| `SQUARE_ACCESS_TOKEN` | Platform Square access token | Used by Square client. |
| `SQUARE_APP_ID` | Square OAuth application id | Preferred app id variable. |
| `SQUARE_APPLICATION_ID` | Square OAuth application id fallback | Alternative app id variable. |
| `SQUARE_APP_SECRET` | Square OAuth secret | Preferred secret variable. |
| `SQUARE_APPLICATION_SECRET` | Square OAuth secret fallback | Alternative secret variable. |
| `SQUARE_LOCATION_ID` | Square location | Shared in `.replit`. |
| `PUBLIC_OBJECT_SEARCH_PATHS` | Object storage public search paths | Required by object storage service. |
| `PRIVATE_OBJECT_DIR` | Object storage private root | Required by object storage service. |
| `AI_INTEGRATIONS_GEMINI_API_KEY` | Gemini API key | Used by AI chat helpers. |
| `AI_INTEGRATIONS_GEMINI_BASE_URL` | Gemini base URL | Used by AI chat helpers. |

Replit integrations listed in `.replit` also include database, Gemini AI, Google Calendar, object storage, Resend, OpenAI, and Stripe. Some connector-provided variables may be injected by Replit rather than declared directly in source.

## Recommended Order of Work

1. Freeze product boundaries: define what is Briarwood core, what is legacy Beauvette/DateInquiry, and what is experimental.
2. Add tests for auth/session/profile ownership before changing login or token behavior.
3. Remove or constrain risky artist-profile auto-linking in login.
4. Add tests for public token access: inquiry thread, client thread, schedule share, quote, contract signing, chat invite, and edit tokens.
5. Move runtime startup DDL into explicit migrations and document database setup.
6. Fix the handoff outcome route/client mismatch after adding a test around the intended token flow.
7. Add tests for the routing/composer core: dry run, preflight, accepted-referral gate, and score-neutral trust events.
8. Audit object storage ACL behavior for contracts, client photos, portfolio images, and schedule uploads.
9. Review cron/scheduled-email behavior for autoscale and duplicate-send risk.
10. Only after the above, start modular extraction from `routes.ts`, `storage.ts`, and `shared/schema.ts` by domain, keeping behavior unchanged.
