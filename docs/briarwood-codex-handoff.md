# Briarwood Codex Handoff Package

Purpose: move the durable Briarwood work out of this Replit prototype and into Codex, where the permanent product core will be extracted and rebuilt. This document is the source of truth for that migration. It describes what was built, what to keep, what to retire, and the safety rules that must survive the move.

Status of this Replit project: prototype and source-of-truth for what was built. It is not the final production codebase. Codex will rebuild the durable core from here.

Hard rules that apply to anyone reading this (including Codex):
- Additive and non-destructive only. Archive, retire, hide, or redirect before deleting.
- Do not break login, Rolodex, Contract Vault, Schedule Draft Builder, Assistant, Routing, or the zero-login signing/thread/quote/schedule flows.
- The operator approves every outbound send. Nothing auto-sends.
- No em dashes in product copy (use a hyphen or parentheses).

---

## 1. Current product map

### Briarwood-only direction
Briarwood is the permanent product: a white-label coordination layer for bridal and event artists. An operator (the artist or their secretary) manages inquiries, contracts, schedules, and a referral network from a private dashboard. Clients never log in; they interact only through private magic links.

### What DateInquiry used to do
DateInquiry was the original public brand and intake bridge. It provided the public inquiry form (`/inquire/{slug}`), the shareable artist link, and the email-link domain. It is now a legacy bridge: the public domain and routes still work, but the brand is being retired. Most server links were built from `PUBLIC_BASE_URL` with a `dateinquiry.com` fallback, so the brand switch was largely an environment change, not a code rewrite.

### What Beauvette used to be
Beauvette was an earlier brand and product concept ("Beauvette Secretary"). It now survives only as demo-page branding and a few legacy support email strings. It is being retired as a public brand. Internal storage keys named after it (for example `beauvette-theme`, `beauvette_guides_seen`) were intentionally left untouched so users do not lose saved state.

### What should be kept (permanent product)
- Operator auth and accounts
- Rolodex / universal search
- Contract Vault and contract payment-status foundation
- Schedule Draft Builder, provider-lane Quick Add parser, editable provider-lane layout, schedule preview/print overlay
- Assistant prompt queue and dry-run/demo mode
- Routing network / route targets and the Inquiry Response Composer
- Coordination Timeline
- Inbound/outbound SMS pieces
- Availability / contract / calendar checks
- Zero-login client flows: thread, signing, countersign, quote, schedule

### What should be retired
- DateInquiry public branding (visible copy already swapped to Briarwood / atbriarwood.com in earlier phases)
- Beauvette demo branding (visible copy already swapped to Briarwood)
- Old demo and pitch/investor pages not needed for the product
- The duplicate beta package folder
- Legacy/unused public routes, after they are documented

### Legacy plumbing versus permanent product
- Permanent product: the modules listed under "What should be kept".
- Legacy plumbing: `dateinquiry.com` hostname checks, the public intake bridge, email from-address on the old domain, agent commerce layer (A2A/ACP/CDI) if not part of Briarwood v1, the marketing/demo/pitch pages, and any duplicate package folders.

---

## 2. Current app domains and environment

- Current app base URL: `https://atbriarwood.com`.
- `PUBLIC_BASE_URL`: set to `https://atbriarwood.com` (shared scope, applies to dev and prod). Server links and email links are built from this value. Do not change it during the handoff.
- Domains attached / reserved: `atbriarwood.com` (current base, serving the app), `dateinquiry.com` (legacy bridge, still attached), and `briarwood.ai` / `www.briarwood.ai` (reserved, not yet the base URL).
- Do not detach yet: `dateinquiry.com` (legacy intake/links still resolve), `briarwood.ai` (reserved for the future base). Detaching either now can break live inquiry links and email links.
- The Makeup Dolls website (`themakeupdolls.com`) is external and separate. It is the user's real public site. It must no longer depend on DateInquiry/Replit, and it must not be treated as part of this app or touched during the migration.
- Email from-address: still `notifications@dateinquiry.com` (Resend-verified sender). Do not change it until a Briarwood sending domain is verified in Resend.

---

## 3. Database rules

- The live app uses `NEON_DATABASE_URL`, not `DATABASE_URL`. Always confirm the live DB host/provider before any schema work, without exposing secret values.
- Never assume `DATABASE_URL` is the live database.
- Migrations must be additive and idempotent only: `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
- No destructive `db:push`. Never rename or drop tables or columns without explicit approval.
- The app runs additive self-healing migrations on boot (see `server/index.ts`). Boot logs show `[DB] Migration OK: ...` lines, which are expected and benign.
- After any change, restart and verify the app can read and write the new table/column.

Known schema drift / DB quirks:
- The `users` table has no `businessName` / `displayName` columns; do not assume they exist.
- The Neon serverless Pool supports `db.transaction` and `.for("update")`.
- There is a large amount of pre-existing TypeScript noise (roughly 1000 benign tsc errors). It is not a sign of a broken build.
- Several feature tables were added incrementally via boot migrations (for example sentiment columns on inquiries, login-code columns on artist profiles, helper/advice columns on thread referrals, inbound SMS, assistant prompts, route targets, inquiry routes, inquiry responses, schedule drafts). Treat these as the additive baseline.

---

## 4. Core modules to carry into Codex

- Auth / operator accounts: operator login and session auth. Data is owner-scoped.
- Rolodex / universal search: the artist's contact and relationship index with search.
- Contract Vault: stored contracts, templates, and signed-contract viewing.
- Contract payment-status foundation: payment status, method, amount paid, due date, link, and notes on contracts.
- Schedule Draft Builder: day-of schedule drafts.
- Provider-lane Quick Add parser: parses free text into provider-lane appointment rows.
- Editable provider-lane layout: lane-based layout with a people-to-assign pool and assign-person dropdown.
- Schedule preview/print overlay: read-only preview/print view of a schedule.
- Assistant prompt queue: headless prompt layer. Delivery is OFF by default. Queued status has no flush job yet. New-inquiry events are wired with availability analysis and circle/team routing suggestions.
- Dry-run / demo mode: lets the operator see what would be sent without sending.
- Routing network / route targets: channel-agnostic routing to targets (circle, team, generic).
- Inquiry Response Composer: drafts replies the operator approves before sending.
- Coordination Timeline: the event/coordination history view.
- SMS inbound/outbound pieces: inbound matching attributes messages by inquiry context, requires a confident person+inquiry match before trusting an event, and inserts a row first for idempotency.
- Availability / contract / calendar check: availability lookups plus Google Calendar integration.

Behavioral notes that must carry forward:
- The operator approves every send.
- The referral-acceptance gate is enforced server-side (UI-only gating is bypassable).
- Observational/inbound events are CDI-neutral (signal strength 0); they must not move trust scores on their own.

---

## 5. What to leave behind or archive

- DateInquiry public branding (visible copy already replaced; legacy hostname checks and links remain as plumbing).
- Beauvette demo branding (visible copy already replaced; internal storage keys kept).
- Old demo pages if not needed: `client/src/pages/demo/*`, plus `DemoLandingPreview`, `OperatorDemo`, `BriarwoodDemo`, `Pitch`, `Memo`, `Oracle`, `ContextGraph`, `Sandbox`, `Terminal`, `CDIArchitecture`, `BriarwoodSpec`.
- Old public intake bridge if no longer used: the `/inquire/{slug}` public form and the embed-code generator (embed iframe and embed API base still point at `dateinquiry.com`).
- Duplicate beta package folder: `briarwood-beta-package/` is a duplicate copy of the whole app. It is not served or running. Do not carry it forward.
- Unused/unsafe legacy routes: document each before removing. Do not delete routes in this Replit project; archive decisions belong in Codex.

---

## 6. Security constraints (must survive the migration)

- Owner-scoped data: every query is scoped by artist/owner id. Artists only see their own data. Preserve this in every rebuilt module.
- No public access to operator tools: dashboards, settings, Rolodex, Contract Vault, Assistant, and Routing are operator-only.
- Never expose signing tokens: signing/countersign/contract tokens are bearer credentials sent only to the intended party. Do not log them, list them, or leak them through unrelated endpoints.
- Thread/magic-link tokens act as bearer tokens. They are emailed to the artist (or shared with the specific client) only.
- Dry-run enforcement: dry-run/demo mode must never actually send.
- No real send without approval: the operator approves every outbound message, contract, or payment link.
- No CDI score movement from observational events: inbound/observed events are signal-strength 0 and must not change trust scores.
- No raw mass-assignment routes: validate and whitelist fields. Do not bind request bodies directly to records.
- No unsafe contract token leakage: terminal states cannot be modified (declined, completed, expired); accept only works from pending.

---

## 7. Files and routes map

### Key frontend files (`client/src/`)
- App shell and routing: `App.tsx` (route map; also holds DateInquiry hostname-aware login logic).
- Operator dashboards: `ArtistAdmin.tsx`, `ArtistDashboard.tsx`, `AdminDashboard.tsx`, `ArtistSettings.tsx`.
- Rolodex / search: `Rolodex.tsx`, `ArtistRolodex.tsx`, `SearchResults.tsx`.
- Contracts: `ContractDetail.tsx`, `ContractEditor.tsx`, `ContractSigning.tsx`, `ContractCountersign.tsx`, `ViewSignedContract.tsx`, `SetupContract.tsx`.
- Schedules: `ScheduleDraftBuilder.tsx`, `ScheduleBuilder.tsx`, `ScheduleCreator.tsx`, `ScheduleList.tsx`, `SimpleScheduleBuilder.tsx`, `MultiDaySchedule.tsx`, `PublicSchedule.tsx`.
- Assistant / routing: `AssistantControl.tsx`, `RouteTargets.tsx`.
- Inquiry/thread (zero-login client side): `InquiryThread.tsx`, `ThreadPage.tsx`, `ClientThread.tsx`, `InquirePage.tsx`, `PublicQuote.tsx`.
- Theme: `contexts/ThemeContext.tsx` (storage key `beauvette-theme`, intentionally kept).

### Key backend files (`server/`)
- `index.ts` (boot, additive migrations, CORS allowed origins, Briarwood landing hosts, CSP), `routes.ts` (main API), `storage.ts` (storage interface / DB queries), `db.ts` (Neon connection).
- `replitAuth.ts` (auth), `emailService.ts` (Resend; from-address and base-URL fallback), `smsService.ts` / `inboundMatcher.ts` / `inboundProcessor.ts` (SMS), `assistantService.ts` (assistant queue), `routingService.ts` (routing), `timelineParser.ts` (coordination timeline / Quick Add parsing), `scheduleAI.ts` (schedule helpers).
- Integrations: `googleCalendarClient.ts` / `googleCalendarService.ts`, `squareClient.ts` / `squareRoutes.ts`, `openSignService.ts`, `objectStorage.ts` / `objectAcl.ts`, `replit_integrations/`.
- Agent commerce layer (legacy/optional for v1): `agentRoutes.ts`, `acpHandler.ts`, `cdiService.ts` / `cdiEngine.ts` / `cdiRealtime.ts` / `cdiAgent.ts`, `iqsService.ts`.
- Jobs: `cronJobs.ts`, `scheduledEmailJob.ts`, `seed.ts`.

### Key schema tables (`shared/schema.ts`)
- Core/auth: `sessions`, `users`, `artistProfiles`.
- Intake: `clientIntakes`, `artistIntakes`, `plannerIntakes`, `inquiries`, `inquiryNotifications`, `threads`, `threadMessages`, `threadReferrals`.
- Rolodex/relationships: `clientContacts`, `trustedCircle`, `artistServices`, `artistPricing`, `artistFormConfigs`.
- Contracts/payments: `contracts`, `contractTemplates`, `payments`, `proposals`, `invitations`.
- Scheduling: `schedules`, `eventDaySchedules`, `scheduleTeamMembers`, `scheduleAppointments`, `scheduleChatMessages`, `scheduleDrafts`, `availability`, `blockedDates`, `bookings`, `bookingChecklists`.
- Assistant/routing: `assistantPrompts`, `routeTargets`, `inquiryRoutes`, `inquiryResponses`.
- Messaging: `messages`, `conversations`, `conversationParticipants`, `directChats`, `directChatMessages`, `chatInvites`, `simpleChatMessages`, `communicationLogs`, `scheduledEmails`, `inboundSmsMessages`.
- Agent/CDI (legacy/optional): `agents`, `agentApiKeys`, `agentWebhooks`, `agentActionLogs`, `agentEvents`, `acpCheckoutSessions`, `agentChallenges`, the `cdi*` tables, the `iqs*` tables, `auditLogs`, `analyticsEvents`.

### Key routes (frontend, from `App.tsx`)
- Operator: `/admin/:slug`, `/admin/:slug/rolodex`, `/admin/:slug/assistant`, `/admin/:slug/network`, `/admin/:slug/contracts/:contractId`, `/admin/:slug/schedules/:scheduleId`, `/admin/:slug/archive`, plus `/artist`, `/admin`, `/settings`.
- Auth: `/login`, `/artist-login`, `/signup`, `/register`, `/forgot-password`, `/reset-password/:token`, `/recover-access`, `/access/:code`.
- Public intake (legacy bridge): `/:artistSlug`, `/intake/client`, `/intake/artist`, `/intake/planner`.

### Known public token routes that must keep working if carried forward
- `/inquiry/:threadToken` (artist private thread, magic link)
- `/thread/:clientToken` and `/t/:token` (client thread)
- `/sign/:token`, `/countersign/:token` (contract signing)
- `/contract/:contractId` (contract view)
- `/quote/:shareToken` (quote)
- `/schedule/:shareToken` and `/schedules/:tokens` (schedule share)
- `/chat-invite/:token`, `/chat/:token`, `/quick-chat/:chatToken`
- `/setup/:artistSlug/{square,contract,links,complete}`
- `/handoff/:id/outcome`

### Known risky routes / surfaces (review carefully before carrying forward)
- Any endpoint that accepts a bearer/share token: must validate fail-closed and never leak the token.
- Agent commerce endpoints (`/api/agent/*`, `/api/acp/*`): self-service agent registration, CDI-gated autonomy, payment checkout/complete. Optional for v1; if carried forward, preserve CDI gating and audit logging.
- Inbound SMS webhook: validate the provider signature fail-closed and reconstruct the public URL to match the host behind the proxy.
- Admin import/bulk routes (`/admin/import`, `/artist/import`, `/planner/import`, `/admin/inbound-replies`): operator-only; watch for mass-assignment.

---

## 8. Current known technical debt

- Pre-existing TypeScript noise (roughly 1000 benign tsc errors). Not a build blocker, but it hides real errors; a clean Codex baseline should not inherit it.
- Old DateInquiry hostname checks (`includes('dateinquiry')`) still drive some login/dashboard-redirect/chat behavior. Left in place on purpose; rework in Codex with a brand-agnostic approach.
- Email sender is still `notifications@dateinquiry.com`. Verify a Briarwood sending domain in Resend before switching.
- Public intake routes are still alive (the `/inquire`/`/:artistSlug` form and the embed-code generator still reference `dateinquiry.com`). Decide whether to carry the public intake bridge forward.
- Env fallbacks: server links use `process.env.PUBLIC_BASE_URL || 'https://dateinquiry.com'`. They resolve to atbriarwood.com at runtime but the literal fallback remains in code.
- Replit-specific deployment quirks: boot-time self-healing migrations, Neon serverless pooling, proxy host handling for webhooks, object storage and integration wiring.
- Production versus development publish gap: development uses the Neon dev connection; production env values (including `PUBLIC_BASE_URL` in shared scope) must be confirmed before any deploy. Do not publish as part of this handoff.
- The Makeup Dolls website is now separate and must not be treated as the app or as a dependency.

---

## 9. Recommended Codex rebuild order

1. Clean app shell and auth (operator accounts, sessions, owner-scoping baked in).
2. Database schema baseline (additive, no inherited drift; reproduce only the tables a module needs).
3. Rolodex / universal search.
4. Contract Vault (plus the contract payment-status foundation).
5. Schedule Draft Builder (provider-lane parser, editable lanes, preview/print).
6. Assistant + Routing (queue, route targets, response composer; delivery off by default).
7. Coordination Timeline.
8. Dry-run safety (enforce before any send path exists).
9. Then, optionally and later: real sends, payments, and public links once contract/payment records are clean and internal flows are stable.

---

## 10. Explicit do-not-build list for Codex v1

- No marketplace.
- No public sharing until internal flows are stable.
- No payment processing until contract/payment records are clean.
- No AI auto-sending (operator approval always required).
- No deleting historical data.
- No DateInquiry rebrand revival.
- No dependency on The Makeup Dolls website.

---

## Appendix: migration safety checklist
- Confirm live DB is Neon (`NEON_DATABASE_URL`) before any schema action.
- Keep `dateinquiry.com` and `briarwood.ai` attached until Codex flows are live.
- Keep `notifications@dateinquiry.com` until a Briarwood sender is verified.
- Do not change `PUBLIC_BASE_URL` during the handoff.
- Preserve all zero-login token routes listed in section 7.
- Preserve owner-scoping and operator-approval-before-send everywhere.
