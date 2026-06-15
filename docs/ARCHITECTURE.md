# Architecture

This document captures the current repository architecture from a read-only audit. It is descriptive, not prescriptive: it does not change product behavior, and it should not be treated as approval to refactor sensitive flows without tests and product review.

## System Overview

`beauvette` is a full-stack TypeScript application with a React/Vite single-page frontend, an Express backend, and a Postgres database accessed through Drizzle ORM. The current codebase contains multiple product generations side by side:

- Beauvette artist/client/planner marketplace and booking surfaces.
- DateInquiry public inquiry and artist admin surfaces.
- Briarwood private coordination infrastructure for routing, trusted handoffs, assistant prompts, and trust-event logging.
- Demo, AI, agent, ACP, and experimental features.

After PR #36, the product backend no longer serves the React app. The production build still creates a Vite client bundle under `dist/public` and an Express server bundle at `dist/index.cjs`, but those outputs have different hosting responsibilities: the backend starts as an API server, while the React app must be hosted separately or served by a reverse proxy/static host.

For Capacitor/TestFlight, `https://atbriarwood.com` must load the real React app because the iOS wrapper uses that URL as its remote webview target. If that domain points only at the backend API or the marketing landing response, the native app will not show the product.

## Current Platform Dependency Map

This snapshot reflects the platform-foundation work through PR #73. It is a map of current defaults, not approval to switch providers or domains.

| Area | Current default | Replacement status | Notes |
| --- | --- | --- | --- |
| Auth | Replit OIDC remains the concrete login/logout/callback provider. | Neutral session, guard, and identity helpers exist, but provider replacement has not started. | Keep `setupAuth`, `/api/login`, `/api/callback`, and `/api/logout` behavior unchanged until auth migration review. |
| Calendar | `CALENDAR_PROVIDER` defaults to `replit`. | Direct Google Calendar provider skeleton, selector, config-validation docs, and contract tests exist. | Direct calendar is explicit opt-in only and is not wired to live OAuth/token storage. |
| Storage | `OBJECT_STORAGE_PROVIDER` defaults to `replit`. | Direct object storage provider, selector, rollout docs, and contract tests exist. | Direct storage is explicit opt-in only; production rollout is not complete. |
| Email credentials | Direct `RESEND_API_KEY` wins in production. | Replit Resend connector fallback remains non-production legacy behavior only. | Resend client construction is centralized for `server/emailService.ts` and `server/aiChat.ts`. |
| Contract email paths | Existing direct Resend construction in `server/routes.ts` remains. | Intentionally excluded from the Resend factory PR. | These paths are contract-related and should move only in a focused contract/email review PR. |
| Gemini/AI clients | Nine `new GoogleGenAI(...)` construction sites remain. | Characterized by `server/gemini-client.characterization.test.ts`; not centralized yet. | Env usage is intentionally mixed between `|| ""` fallbacks and direct env passing until a focused AI-client cleanup PR. |
| Public URL helper | `server/config/publicUrl.ts` exists. | Wired only to low-risk agent metadata/manifest so far. | Square, payment, contract/token, sender/from, auth, and client-branding references remain intentionally excluded. |
| Domain bridge | `https://atbriarwood.com` is the Briarwood public base fallback. | DateInquiry remains in sensitive legacy paths. | `dateinquiry.com` still appears in sender/from, Square, payment, contract/token, and legacy bridge paths. |

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

- `server/index.ts` creates the Express app, configures middleware, runs startup schema checks/DDL, registers route groups, starts the API server, and starts cron jobs.
- `server/routes.ts` is the primary route registry. It is a large kitchen-sink file containing auth, profiles, inquiries, routing, schedules, bookings, contracts, payments, SMS, email, admin, CDI, AI, import, and chat endpoints.
- `server/storage.ts` defines the large database storage abstraction and exports a singleton `storage`.
- `server/db.ts` initializes Neon/Postgres pooling and Drizzle.
- `server/replitAuth.ts` owns Replit OIDC session setup. Authenticated route guards now pass through `server/auth/current.ts`, which still re-exports the Replit-backed guard.

Important service modules include:

- `server/routingService.ts`: Briarwood response composer and generic routing/delegation helpers.
- `server/inboundMatcher.ts` and `server/inboundProcessor.ts`: inbound SMS matching and trust-event creation.
- `server/smsService.ts`: Twilio send and webhook verification helpers.
- `server/emailService.ts`: email sending through the shared Resend client factory and credential resolver.
- `server/scheduledEmailJob.ts`: in-process scheduled email loop.
- `server/cronJobs.ts`: hold expiration and SLA enforcement jobs.
- `server/objectStorage.ts`: object storage access and ACL handling through the current provider facade; default storage remains the Replit sidecar provider.
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
- Schedule/email/SMS and public-link paths still contain sensitive legacy domain fallbacks in some paths.
- Side effects such as email, SMS, contracts, payments, and trust events are often embedded directly in route handlers.
- Error middleware in `server/index.ts` sends JSON and then throws, which can crash/restart the process on request errors.
- Square OAuth, callback, error redirect, and payment redirect domains remain sensitive and should be reviewed before migration.
- Object storage upload paths and ACL policy need review, especially for contracts and private client assets.
- The frontend `apiRequest` helper has a narrow signature and at least one observed misuse.
- Test coverage is currently strongest around characterization/source assertions for platform boundaries; it is not yet a broad product regression suite.

## Deployment Assumptions

Observed deployment assumptions after PR #36:

- The backend is API-only for the product app. It no longer serves the React SPA in development or production.
- `npm run dev` and `npm run dev:server` start the backend API with `tsx server/index.ts`.
- `npm run dev:client` starts the Vite frontend separately on port `5173` to avoid colliding with the backend default port.
- Production deployment still runs `npm run build` then `npm run start`.
- `npm run build` runs `script/build.ts`, building the Vite client to `dist/public` and bundling the server with esbuild.
- Production server entry is `dist/index.cjs`, started by `npm run start`.
- The React bundle in `dist/public` must be deployed to separate frontend hosting or served by an external reverse proxy/static host.
- `https://atbriarwood.com` must load the React app for the Capacitor remote webview. The backend API can sit behind the same domain only if routing/proxy rules still deliver the React app shell for product routes.
- Main backend port is `PORT` or `5000`.
- In-process cron jobs and scheduled email jobs are not distributed-lock safe.
- Client-facing links should use `PUBLIC_BASE_URL`; any remaining hardcoded legacy domains should be removed in small, reviewed PRs.

## Production Environment Inventory

This section describes the current runtime configuration after the direct-provider cleanup work. It is an inventory, not a migration plan. Do not remove legacy variables until the owning provider has replacement tests and an explicit migration PR.

### Required Production Variables Today

| Variable | Purpose | Current status |
| --- | --- | --- |
| `NODE_ENV` | Runtime mode | Set to `production` for production. It controls secure session cookies and production logging behavior. |
| `PORT` | Express API port | Optional when the host injects a port. The server defaults to `5000`. |
| `NEON_DATABASE_URL` | Preferred app/session Postgres connection | Production should use this as the canonical DB URL. `server/db.ts` and `server/auth/session.ts` prefer it over `DATABASE_URL`. |
| `DATABASE_URL` | Postgres fallback / Drizzle default | Still used by `drizzle.config.ts` and as a fallback. Treat the `DATABASE_URL` vs `NEON_DATABASE_URL` mismatch as a migration risk before running schema tools. |
| `SESSION_SECRET` | Express session signing secret | Required for session middleware. Must be long, secret, and stable across deploys. |
| `PUBLIC_BASE_URL` | Product/frontend origin for generated links | Should be `https://atbriarwood.com` for Briarwood production. This must point to the hosted React app, not just the API server. |
| `RESEND_API_KEY` | Direct Resend credential | Required for production email. Direct env now wins before the legacy Replit connector fallback. |
| `REPL_ID` | Current Replit OIDC client id | Still required by the current OIDC login/logout provider in `server/replitAuth.ts`. |
| `ISSUER_URL` | OIDC issuer override | Optional in code because it defaults to `https://replit.com/oidc`, but set it explicitly while Replit OIDC remains the provider. |
| `PUBLIC_OBJECT_SEARCH_PATHS` | Public object storage search roots | Required by `ObjectStorageService` for public object reads. |
| `PRIVATE_OBJECT_DIR` | Private object storage root | Required by `ObjectStorageService` for private uploads and signed object URLs. |

### Conditional Production Variables

| Variable | Required when | Notes |
| --- | --- | --- |
| `TWILIO_ACCOUNT_SID` | SMS/inbound SMS is enabled | SMS paths should stay disabled or untested without the full Twilio set. |
| `TWILIO_AUTH_TOKEN` | SMS/inbound SMS is enabled | Also used for inbound webhook validation. |
| `TWILIO_PHONE_NUMBER` | SMS sending or simulator fallback is enabled | Required sender number for real SMS. |
| `ENABLE_SMS_TEST_TOOLS` | Admin SMS simulator is intentionally enabled | Must be `true`; keep disabled in normal production. |
| `SQUARE_ACCESS_TOKEN` | Platform Square API behavior is enabled | Used by `server/squareClient.ts`. |
| `SQUARE_APP_ID` / `SQUARE_APPLICATION_ID` | Square OAuth is enabled | `SQUARE_APP_ID` is preferred; `SQUARE_APPLICATION_ID` remains a fallback. |
| `SQUARE_APP_SECRET` / `SQUARE_APPLICATION_SECRET` | Square OAuth is enabled | `SQUARE_APP_SECRET` is preferred and must match the `sq0csp-` shape expected by current code. |
| `SQUARE_LOCATION_ID` | Square payment link or invoice paths need a default location | Merchant profiles can also supply stored Square location IDs. |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Square webhook validation is enabled | Used by Square webhook handling. |
| `AI_INTEGRATIONS_GEMINI_API_KEY` | Gemini-backed AI helpers are enabled | Used by AI chat, schedule, timeline, CDI, and IQS helpers. |
| `AI_INTEGRATIONS_GEMINI_BASE_URL` | Gemini-backed AI helpers require a custom base URL | Current helpers read this alongside the API key. |
| `OBJECT_STORAGE_PROVIDER` | Direct object storage rollout is intentionally enabled | Defaults to `replit`. Set to `direct` only after direct Google Cloud config is present and storage checks pass. |
| `DIRECT_OBJECT_STORAGE_PROJECT_ID` / `GOOGLE_CLOUD_PROJECT` / `GCLOUD_PROJECT` / `GCP_PROJECT` | Direct object storage uses host-managed ADC/workload identity | Required for direct storage unless a key-file env var is set. |
| `DIRECT_OBJECT_STORAGE_KEY_FILE` / `GOOGLE_APPLICATION_CREDENTIALS` | Direct object storage uses a local credential file outside Git | Required for direct storage unless project/ADC env is set. Do not commit credential files. |

### Legacy / Non-Production Replit Fallbacks That Remain

| Variable or assumption | Current use | Replacement status |
| --- | --- | --- |
| `REPLIT_CONNECTORS_HOSTNAME` | Replit connector hostname for Google Calendar and non-production Resend fallback. | Calendar abstraction exists, but the default provider is still the Replit connector. Email production no longer depends on this when `RESEND_API_KEY` is set. |
| `REPL_IDENTITY` | Replit connector token source for workspace/dev connector calls. | Still used by calendar and non-production email connector fallback. |
| `WEB_REPL_RENEWAL` | Replit connector token source for deployed Replit connector calls. | Still used by calendar and non-production email connector fallback. |
| `REPLIT_DEPLOYMENT_URL` | One intentionally characterized AI/Square payment redirect fallback remains. | Do not remove until Square/domain behavior is migrated under tests. |
| Replit object-storage sidecar at `http://127.0.0.1:1106` | Default object storage provider still signs URLs and obtains GCS credentials through the sidecar. | A direct provider path exists behind `OBJECT_STORAGE_PROVIDER=direct`, but Replit remains the default. |
| `https://dateinquiry.com` fallback domains | Legacy link fallbacks and Square callback/payment behavior remain in selected paths. | Public URL helper and Square/domain characterization tests exist; migrate in small, reviewed PRs. |

### Provider Defaults Today

- Calendar: `getDefaultCalendarProvider()` returns `ReplitCalendarProvider`, which reads Google Calendar credentials from the Replit connector path.
- Storage: `getDefaultObjectStorageProvider()` defaults to `ReplitObjectStorageProvider`, which depends on the Replit object-storage sidecar. `OBJECT_STORAGE_PROVIDER=direct` opts into `DirectObjectStorageProvider` after direct Google Cloud config validation.
- Email: `resolveEmailCredentials()` uses direct `RESEND_API_KEY` first. The Replit Resend connector remains only as a non-production legacy fallback.
- Auth: session helpers and identity helpers are split into neutral modules. Route guards import through the neutral current-auth facade, but login/logout/callback and the concrete Replit-backed guard behavior still live in `server/replitAuth.ts`.
- Public URLs: `server/config/publicUrl.ts` exists and defaults Briarwood links to `https://atbriarwood.com`, with a separate legacy DateInquiry fallback for behavior-preserving migrations.

### Gemini / AI Client Boundary

`server/gemini-client.characterization.test.ts` is the current guardrail for Gemini client construction. It records nine current `new GoogleGenAI(...)` sites across:

- `server/aiChat.ts`
- `server/businessChatAgent.ts`
- `server/cdiAgent.ts`
- `server/cdiEngine.ts`
- `server/iqsService.ts`
- `server/scheduleAI.ts`
- `server/timelineParser.ts`
- `server/routes.ts`, with both a module-level client and a route-local contract extraction client

The current environment behavior is mixed by source file. Some sites use `AI_INTEGRATIONS_GEMINI_API_KEY || ""` and `AI_INTEGRATIONS_GEMINI_BASE_URL || ""`; other sites pass the env values directly. This is documented behavior, not a recommended final shape. There is no shared Gemini helper or factory yet.

Do not centralize Gemini construction as a broad sweep. Any future cleanup must preserve model selection, prompts, fallback behavior, request timing, env resolution, and response parsing. Do not touch the `routes.ts` route-local contract extraction client, the `routes.ts` module-level client, `cdiAgent.ts`, `cdiEngine.ts`, assistant/payment-adjacent flows in `aiChat.ts`, or schedule/timeline parsing flows without focused behavior tests. If a first migration is attempted later, `server/timelineParser.ts` is likely the smallest candidate, but only after timeline parsing behavior guards are added or confirmed.

### Required Before First Real Operator Use

- Confirm `NEON_DATABASE_URL`, `SESSION_SECRET`, and `PUBLIC_BASE_URL` in production without exposing secret values.
- Confirm `https://atbriarwood.com` serves the React app and that the app can reach the API with session cookies intact.
- Confirm production email uses direct `RESEND_API_KEY`; do not rely on Replit connector email in production.
- Confirm object storage variables and sidecar behavior for profile images, contracts, client photos, and schedule assets.
- Confirm calendar availability behavior if operator workflows depend on Google Calendar busy data.
- Keep SMS, contracts, Square/payment, and public token flows in their existing tested lanes unless explicitly reviewing those surfaces.

### Required Before Provider Replacement

- Calendar: add a direct Google OAuth/provider implementation behind `CalendarProvider` while keeping PR #43 characterization tests green.
- Storage: roll out `OBJECT_STORAGE_PROVIDER=direct` in a controlled environment while keeping PR #44 characterization tests and direct-provider tests green and preserving ACL behavior.
- Auth: add the replacement auth provider only after the existing session, identity, and login/OIDC characterization tests cover the migration boundary.
- Domains: continue replacing DateInquiry/Replit fallbacks through the public URL helper, excluding Square/payment/public-token-sensitive links until their characterization tests are updated.

### Required Before TestFlight

- `https://atbriarwood.com` must serve the real React app because Capacitor loads it as the remote webview.
- Backend/API and frontend hosting must be validated together, including CORS/cookies/session behavior from the iOS webview.
- Direct production provider variables must be configured in the deployment environment; signing secrets and provisioning profiles must stay out of GitHub.
- The generated `ios/` project should be created on a Mac with Node, Xcode, and CocoaPods, then reviewed in its own PR.

### Do Not Remove Yet

- `server/replitAuth.ts` OIDC behavior, `REPL_ID`, or `ISSUER_URL`.
- Replit Google Calendar connector variables until a direct calendar provider is implemented and tested.
- Replit object-storage sidecar assumptions until the direct storage provider has been rolled out and verified in production-like infrastructure.
- DateInquiry/Square callback domains or the remaining AI/Square `REPLIT_DEPLOYMENT_URL` fallback until Square/domain tests are intentionally updated.
- `DATABASE_URL` fallback or Drizzle config behavior until the DB migration/tooling target is explicitly fixed.

### Do Not Migrate Without Review

These areas are intentionally outside low-risk provider and metadata cleanup PRs:

- Square OAuth callback, success, and error redirects.
- Square/payment redirects and AI-generated Square payment links.
- Contract signing, countersign, vault, and tokenized contract links.
- Public-token links for inquiry threads, client threads, schedule shares, quotes, chat invites, and invitations.
- Sender/from domains, reply handling, and email deliverability configuration.
- Auth provider replacement, including OIDC callback behavior and session-cookie semantics.
- Storage production provider switch from Replit sidecar to direct object storage.
- Google Calendar OAuth routes, token schema, token encryption, and provider default switch.

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
