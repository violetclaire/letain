# Briarwood Beta — Clean Transfer Package

This folder contains only the files needed for the Briarwood beta. Per the user's instruction, **nothing has been refactored, renamed, or rebuilt** — files are byte-for-byte copies from the live repo, except for the seven root config files which come from the user-provided scaffold (see §Configs).

Hand this folder to Claude Code as the starting point for the Briarwood rebuild.

---

## Beta scope (KEEP)

Landing → provider login/onboarding → provider settings → private inquiry link → inquiry submission → provider inbox → availability/conflict check → hold/accept/decline/refer → contract/payment/schedule actions.

CDI runs **behind the scenes only** (behavioral events). No public CDI surface, no marketplace, no agent commerce, no demo/investor pages, no debug routes.

---

## Configs (root)

These came from the user's attached scaffold and **replace** the current repo's configs:

- `components.json` — shadcn new-york, neutral baseColor
- `drizzle.config.ts` — reads `DATABASE_URL` (rename `NEON_DATABASE_URL` → `DATABASE_URL` in the new project)
- `package.json` — minimal scaffold (see §Dependencies to add)
- `postcss.config.js`
- `tailwind.config.ts` — needs Briarwood theme tokens added (see §Theme tokens)
- `tsconfig.json`
- `vite.config.ts`

---

## Dependencies to add to `package.json`

The scaffold `package.json` is missing runtime deps used by the transferred code. Add before `npm install`:

```json
{
  "@neondatabase/serverless": "^0.10.0",
  "@google-cloud/storage": "^7.0.0",
  "@google/genai": "^0.3.0",
  "@uppy/core": "^4.0.0",
  "@uppy/dashboard": "^4.0.0",
  "@uppy/react": "^4.0.0",
  "@uppy/aws-s3": "^4.0.0",
  "bcryptjs": "^2.4.3",
  "cors": "^2.8.5",
  "dompurify": "^3.0.0",
  "express-rate-limit": "^7.0.0",
  "googleapis": "^144.0.0",
  "helmet": "^7.0.0",
  "memoizee": "^0.4.17",
  "nanoid": "^5.0.0",
  "openai": "^4.0.0",
  "openid-client": "^5.0.0",
  "p-limit": "^5.0.0",
  "p-retry": "^6.0.0",
  "passport-local": "^1.0.0",
  "square": "^38.0.0",
  "tailwindcss-animate": "^1.0.7"
}
```

Plus dev types: `@types/bcryptjs`, `@types/cors`, `@types/dompurify`, `@types/memoizee`, `@types/passport-local`.

**Do NOT add:** `twilio`, `stripe`, `@capacitor/*`, native `bcrypt` — out of beta scope.

---

## Theme tokens — `tailwind.config.ts` additions

The scaffold tailwind config uses generic shadcn tokens. The transferred pages reference `bg-bg`, `text-ink`, `text-brass`, `border-hairline`, `text-oxblood`, `font-serif` (Fraunces), etc. Without these tokens, every page renders unstyled.

Add to `theme.extend.colors`:

```ts
bg: "hsl(var(--bg) / <alpha-value>)",
surface: "hsl(var(--surface) / <alpha-value>)",
"surface-2": "hsl(var(--surface-2) / <alpha-value>)",
ink: "hsl(var(--ink) / <alpha-value>)",
"muted-ink": "hsl(var(--muted-ink) / <alpha-value>)",
"faint-ink": "hsl(var(--faint-ink) / <alpha-value>)",
brass: "hsl(var(--brass) / <alpha-value>)",
oxblood: "hsl(var(--oxblood) / <alpha-value>)",
hairline: "hsl(var(--hairline) / <alpha-value>)",
"hairline-2": "hsl(var(--hairline-2) / <alpha-value>)",
```

Add to `theme.extend.fontFamily`:

```ts
sans: ["Inter", "sans-serif"],
serif: ["Fraunces", "Georgia", "serif"],
```

The actual HSL values for these CSS variables live in `client/src/index.css` (transferred unchanged).

---

## Environment variables required

```
DATABASE_URL=
SESSION_SECRET=
RESEND_API_KEY=
SQUARE_APPLICATION_ID=
SQUARE_APPLICATION_SECRET=
SQUARE_ENVIRONMENT=
SQUARE_WEBHOOK_SIGNATURE_KEY=
OPENSIGN_API_TOKEN=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALENDAR_REDIRECT_URI=
GEMINI_API_KEY=
OPENAI_API_KEY=
PUBLIC_BASE_URL=https://briarwood.ai
PUBLIC_OBJECT_SEARCH_PATHS=
PRIVATE_OBJECT_DIR=
```

---

## What's in this package

### Server (26 files)
`activityService.ts, aiChat.ts, cdiAgent.ts, cdiEngine.ts, cdiRealtime.ts, cdiService.ts, cronJobs.ts, dataImport.ts, db.ts, emailService.ts, googleCalendarClient.ts, googleCalendarService.ts, index.ts, objectAcl.ts, objectStorage.ts, openSignService.ts, routes.ts, scheduleAI.ts, scheduledEmailJob.ts, seed.ts, squareClient.ts, squareRoutes.ts, static.ts, storage.ts, timelineParser.ts, vite.ts`

### Shared
`schema.ts, types.ts, models/chat.ts`

### Client pages — 50 retained
About, AccessVerify, ArtistAdmin, ArtistAvailability, ArtistClientInbox, ArtistDashboard, ArtistLogin, ArtistQuickChat, ArtistRolodex, ArtistSettings, ChatInvite, ClientMessages, ClientThread, ContractCountersign, ContractEditor, ContractSigning, DirectChat, ForgotPassword, InquirePage, InquiryThread, InviteAccept, Landing, Login, ManageBookings, **MultiDaySchedule**, not-found, PaymentSuccess, PlannerView, Privacy, ProfileSettings, Proposal, Proposals, PublicArtistCalendar, PublicOnboarding, PublicQuote, **PublicSchedule**, RecoverAccess, ResetPassword, **ScheduleBuilder**, **ScheduleCreator**, **ScheduleList**, SecretaryOnboarding, SetupComplete, SetupContract, SetupLinks, SetupSquare, Signup, **SimpleScheduleBuilder**, TrustedCircle, VendorOnboarding, ViewSignedContract, intake/ArtistIntake

### Schedule maker (the "schedule maker" the user asked to include)
- Pages: `ScheduleList.tsx`, `ScheduleBuilder.tsx`, `SimpleScheduleBuilder.tsx`, `ScheduleCreator.tsx`, `MultiDaySchedule.tsx`, `PublicSchedule.tsx`
- Component: `ScheduleChat.tsx`
- Server: `scheduleAI.ts`, `timelineParser.ts`
- Schema tables (in `shared/schema.ts`): `event_day_schedules, schedule_team_members, schedule_appointments, schedule_chat_messages, schedules`

### Components — all of `components/ui/*` plus
AIChatPanel, AvailabilityCalendar, ChatCalendar, ComposeEmailModal, DayOfReadiness, DeclineReferralModal, EnvelopeAnimation, FormDesigner, GooglePlacesInput, HouseSketch, ObjectUploader, QuickGuide, **ScheduleChat**, SecretaryChatbox, ThemeToggle, VintageCalendar, VoiceDictation

### Hooks, lib, contexts
All transferred.

---

## What was excluded (do NOT add back unless graduating from beta)

### Server modules dropped
- `agentRoutes.ts`, `acpHandler.ts` — agent commerce
- `businessChatAgent.ts` — team chat insights
- `iqsService.ts` — lead-quality scoring (separate product)
- `replitAuth.ts` — inactive scaffold
- `smsService.ts` — deferred (no provider)

### Pages dropped
AdminDashboard, AdminImport, AgentBrief, Branding, BriarwoodDemo, BriarwoodSpec, BrowseArtists, CDIArchitecture, ClientDashboard, ClientWaitlist, ContextGraph, demo/* (all 9), DemoLandingPreview, Memo, Oracle, Pitch, PlannerDashboard, PlannerImport, PublicAnalytics, Register, Revenue, Sandbox, SearchResults, Terminal, ThreadPage, ToileInbound, ToileOnboarding, VendorImport, VendorProfile, Waitlist, intake/(ClientIntake, ClientDetails, PlannerIntake, ServiceSelection)

---

## Cleanup Claude Code should do (NOT done here per "do not refactor yet")

1. **`server/index.ts`** — remove the registration calls for `agentRoutes` and `acpHandler` (the modules aren't in this package, so the imports will fail until removed).
2. **`server/routes.ts`** — strip endpoints from excluded surfaces: `/api/agent/*`, `/api/acp/*`, `/api/iqs/*`, `/api/business-chat/*`, `/api/admin/import/*`, `/api/admin/cdi/ai/*`, `/api/admin/cdi/learning-runs`, `/api/debug/*`, `/api/public/analytics/*`, `/api/waitlist`, `/api/threads/*`, `/api/sms/*`, `/api/search/vendors`, `/api/search/artists`, etc. (~250 of ~366 routes drop).
3. **`shared/schema.ts`** — drop tables for excluded modules: `agents, agent_api_keys, agent_webhooks, agent_action_logs, agent_events, acp_checkout_sessions, agent_challenges, iqs_*, business_chat_*, conversations, conversation_participants, ai_chat_*, threads, thread_messages, thread_referrals, simple_chat_messages, waitlist_signups, analytics_events, support_cases, profile_reports, planner_intakes`.
4. **`server/storage.ts`** — drop CRUD methods for the dropped tables.
5. **`client/src/App.tsx`** — drop ~30 routes for excluded pages.
6. **`replit.md`** + UI copy — replace "Beauvette" with "Briarwood".
7. (Optional) Rename "Artist" → "Provider" across files/components.

---

## Security fixes Claude Code MUST do before deploy

| Issue | Action |
|---|---|
| `/api/debug/*` routes are unauthenticated and leak DB state | Remove from `routes.ts` entirely |
| `GET /api/admin/approve-page` token-only auth | Gate behind admin role + audit log |
| Square webhook signature | Verify `SQUARE_WEBHOOK_SIGNATURE_KEY` enforcement in `squareRoutes.ts` |
| OpenSign webhook | Confirm signature verification |
| Object storage ACL | Audit per-`artist_id` scope in `objectAcl.ts` |
| CSRF | Add to state-changing routes |
| Rate limit public endpoints | `/api/public/inquiries`, `/api/public/contact-webhook`, magic-link request |
| Magic-link tokens | Confirm 256-bit entropy + expiry on all token columns |

---

## CDI principle (preserved)

Ground-truth events create CDI. AI can explain the record. AI cannot invent trust. The `cdiEngine.ts` boundary block enforces this — `analyzeForCDI` writes only to `cdi_ai_insights` (annotation), never to `cdi_composite_scores` (behavioral aggregation). Do not regress this.
