# Briarwood Codex Rebuild / Extraction Plan

Companion to `docs/briarwood-codex-handoff.md`. This is a planning document only. No code, schema, env, or domains were changed to produce it.

Direction: Briarwood is the permanent product. The Makeup Dolls website is separate and is not part of this app. DateInquiry and Beauvette are legacy bridges/brands. This Replit repo is the prototype and source-of-truth for what was built; Codex extracts the durable Briarwood core into a cleaner architecture.

Planning rules honored here: no code changes, no destructive operations, no broad refactor, no new features, no marketplace, no AI auto-sending, no payment processing, no public sharing.

---

## 1. What the current repo contains

### App structure (top-level)
- `client/` React frontend (Vite).
- `server/` Express/Node backend (TypeScript, run via `tsx`).
- `shared/` shared types and the Drizzle schema (`shared/schema.ts`).
- `migrations/` Drizzle migration output.
- `briarwood-landing/` static landing page assets served for Briarwood hosts.
- `briarwood-beta-package/` duplicate copy of the whole app (about 5.8 MB), not served or running.
- `docs/`, `scripts/`, `script/`, `public/`, `attached_assets/`, `erika_export/`, `dist/`.

### Frontend framework
- React 19 with Vite 7.
- Routing: `wouter`.
- Data fetching: TanStack Query 5.
- Styling: Tailwind CSS 4 with shadcn/ui; Framer Motion for animation.
- Roughly 110+ page components in `client/src/pages` (including `demo/` and `intake/` subfolders), most are product pages, some are demo/pitch/marketing.

### Backend framework
- Express 4 on Node, written in TypeScript, executed with `tsx` in dev.
- Build: `tsx script/build.ts` bundling to `dist/index.cjs`; production runs `node dist/index.cjs`.
- Roughly 40 server modules. The main API lives in `server/routes.ts`; data access in `server/storage.ts`; DB connection in `server/db.ts`.
- Integrations: Google Calendar, Square, OpenSign, Resend, object storage, Gemini/OpenAI.

### Database / schema setup
- PostgreSQL via Drizzle ORM (`drizzle-orm` 0.39, `drizzle-kit` 0.31).
- Live app reads `NEON_DATABASE_URL` (Neon serverless).
- Important drift: `drizzle.config.ts` points at `DATABASE_URL`, not `NEON_DATABASE_URL`. This is why `db:push` is unsafe in this repo: it can target the wrong database and propose destructive changes.
- Additive self-healing migrations run on boot in `server/index.ts` (boot logs show `[DB] Migration OK: ...`, expected and benign).
- About 80 tables in `shared/schema.ts` spanning auth, intake, rolodex, contracts/payments, scheduling, assistant/routing, messaging, and the agent/CDI legacy layer.

### Routing
- Frontend: `wouter` route map in `client/src/App.tsx`, including operator routes (`/admin/:slug/*`), auth routes, public intake, and zero-login token routes (thread, signing, quote, schedule).
- Backend: REST under `/api/*`, plus the agent commerce surface (`/api/agent/*`, `/api/acp/*`).

### Auth
- Operator/session auth in `server/replitAuth.ts`; sessions table in the schema; session store uses `NEON_DATABASE_URL`.
- Clients never log in; they use private magic-link/bearer tokens.
- Some login/redirect behavior still branches on the `dateinquiry.com` hostname.

### Known build / typecheck issues
- `check` runs `tsc` and surfaces roughly 1000 pre-existing, mostly benign TypeScript errors. Not a build blocker, but it hides real type errors. A clean Codex baseline should not inherit this.
- Drizzle config/database mismatch (DATABASE_URL vs NEON_DATABASE_URL) noted above.

---

## 2. What to keep for Briarwood v1

- Auth / operator accounts (owner-scoped sessions).
- Rolodex / universal search.
- Contract Vault.
- Contract payment-status foundation (status, method, amount paid, due date, link, notes).
- Schedule Draft Builder (provider-lane Quick Add parser, editable provider-lane layout, preview/print overlay).
- Assistant + Routing (prompt queue with delivery off by default, route targets, Inquiry Response Composer).
- Coordination Timeline.
- Dry-run safety (enforced before any real send path exists).

Behavioral invariants to keep: operator approves every send; referral-acceptance gate enforced server-side; observational/inbound events are CDI-neutral (signal strength 0).

---

## 3. What to leave behind or archive

- DateInquiry public branding (visible copy already swapped; legacy hostname checks remain as plumbing).
- Beauvette demo branding and the `client/src/pages/demo/*` set, plus pitch/marketing pages (`Pitch`, `Memo`, `Oracle`, `ContextGraph`, `Sandbox`, `Terminal`, `CDIArchitecture`, `BriarwoodSpec`, `DemoLandingPreview`, `OperatorDemo`, `BriarwoodDemo`).
- `briarwood-beta-package/` duplicate app folder (not served; do not carry forward).
- Obsolete public intake bridge (`/inquire` form and embed-code generator) if Briarwood v1 does not need public intake yet.
- Unsafe/unused legacy routes, documented before removal. Do not delete in this repo; archive decisions belong in Codex.
- The agent commerce layer (A2A / ACP / CDI / IQS) unless explicitly in scope for v1; treat as legacy/optional.

---

## 4. Proposed target architecture

### Frontend structure
- React + Vite + TypeScript, `wouter` routing, TanStack Query, Tailwind + shadcn/ui (same stack, cleaner layout).
- Organize by feature, not by page dump: `features/{auth,rolodex,contracts,schedules,assistant,routing,timeline}` each with its own components, hooks, and API client.
- A single typed API client layer; no direct fetch scattered across pages.
- Carry forward only product pages; leave demo/marketing/pitch pages out of v1.

### Backend / API structure
- Express + TypeScript, but split the monolithic `routes.ts` into per-feature routers (`routes/auth`, `routes/rolodex`, `routes/contracts`, `routes/schedules`, `routes/assistant`, `routes/routing`, `routes/timeline`).
- Keep the storage-interface pattern (`IStorage`) so business logic is testable and routes stay thin.
- Validate every request body with Zod (drizzle-zod insert schemas), no raw mass-assignment.
- Centralize owner-scoping in a middleware/guard rather than per-query.

### Database schema baseline
- Start from a minimal additive baseline containing only the tables v1 modules need: sessions, users/operators, artist profiles, client contacts (Rolodex), contracts + templates + payment-status fields, schedules + appointments + drafts, assistant prompts, route targets, inquiry routes, inquiry responses, inbound SMS, communication logs, audit logs.
- Defer agent/CDI/IQS and marketing/analytics tables until needed.
- Generate migrations with drizzle-kit configured against the correct database; never inherit the existing DATABASE_URL/NEON mismatch.

### Auth / session model
- Operator email + session-cookie auth, server-side sessions in Postgres.
- Brand-agnostic: no hostname-based branching for login. Behavior driven by config/env, not by `includes('dateinquiry')`.
- Clients remain zero-login via signed bearer tokens.

### Owner-scoping model
- Every operator-owned row carries an owner/artist id.
- A single authorization guard resolves the current operator and constrains all queries; resource handlers receive an already-scoped context.
- Token-scoped client routes resolve a specific resource from the token only, never list across owners.

### Environment variable strategy
- One documented config module that reads env once and validates at boot (fail fast on missing critical values).
- Database URL is a single explicit variable; do not keep two competing names. Decide on one (Neon) and make drizzle-kit and the app read the same one.
- Keep `PUBLIC_BASE_URL` as the single source for outbound links. Keep the email from-address as config, switched only after the sender domain is verified.

### Migration strategy
- Additive and idempotent only. No destructive `db:push`.
- For data already in the live Neon DB, prefer read-only export plus controlled import into the new baseline rather than in-place destructive transforms.
- Keep boot-time additive guards during transition; remove once the schema is stable.

---

## 5. Migration / extraction order (safest path)

1. Clean app shell + auth (operator accounts, sessions, owner-scoping guard, config/env validation).
2. Schema baseline (only v1 tables, additive, correct DB target).
3. Rolodex / search.
4. Contract Vault (then the payment-status foundation fields).
5. Schedule Draft Builder (lane parser, editable lanes, preview/print).
6. Assistant + Routing (queue with delivery off, route targets, response composer).
7. Coordination Timeline.
8. Dry-run safety (enforce before any send path is wired).
9. Optional later: real sends, payments, and public links once contract/payment records are clean and internal flows are stable.

---

## 6. Risk register

### Security risks
- Owner-scoping must be centralized and enforced server-side; UI-only gating is bypassable (the referral gate already proved this).
- Bearer/share tokens (thread, signing, countersign, quote, schedule) must validate fail-closed and never be logged or listed.
- Operator tools must never be publicly reachable.
- No raw mass-assignment; validate and whitelist fields.

### Data migration risks
- Live data lives in Neon. Exporting/importing must not mutate the live DB. Use read-only access for extraction.
- Tables added incrementally on boot mean the live schema may be ahead of any static snapshot; reconcile from the live DB, not from old migration files.

### Schema drift
- `drizzle.config.ts` targets `DATABASE_URL` while the app uses `NEON_DATABASE_URL`. Running `db:push` can hit the wrong database and propose destructive changes. Fix the config target in Codex before using drizzle-kit.
- `users` has no `businessName`/`displayName` columns; do not assume legacy fields exist.

### TypeScript debt
- About 1000 pre-existing tsc errors. Do not carry them into the new baseline; start strict and clean.

### Replit-specific assumptions
- Boot-time self-healing migrations, Neon serverless pooling, proxy host handling for webhooks, object storage and integration wiring, and the Replit auth module. Each needs an explicit equivalent or replacement in Codex.

### Email / domain risks
- From-address is still `notifications@dateinquiry.com` (Resend-verified). Switching senders requires verifying a Briarwood domain first or emails will fail.
- Keep `dateinquiry.com` and `briarwood.ai` attached until Codex flows are live; detaching early breaks live inquiry and email links.
- Do not change `PUBLIC_BASE_URL` during planning/extraction.

### Token route risks
- The zero-login token routes (section 7 of the handoff doc) must keep working if carried forward. Any rebuild must preserve token validation semantics and terminal-state rules (cannot modify declined/completed/expired; accept only from pending).

---

## 7. First actual build task (after this planning step)

Build the clean app shell with operator auth and a centralized owner-scoping guard, backed by the minimal schema baseline (sessions, operators/users, artist profiles). Deliverables:
- Vite + React + TypeScript shell with `wouter`, TanStack Query, Tailwind, and a single typed API client.
- Express + TypeScript backend with per-feature router scaffolding, the `IStorage` interface, Zod validation, and one auth/owner-scoping middleware.
- drizzle-kit configured against the single correct database variable, generating an additive baseline migration for the three foundation tables only.
- A login flow with no hostname-based branding and server-side sessions.

This is small, non-destructive, introduces no product features, and gives every later module a safe, owner-scoped foundation.

---

## Summary blockers / missing information
- Decide the single canonical database env var name and point drizzle-kit at it (resolve the DATABASE_URL vs NEON mismatch) before any drizzle-kit use.
- Confirm whether the agent commerce layer (A2A/ACP/CDI/IQS) and the public intake bridge are in scope for v1 or legacy.
- Confirm the future Briarwood sending domain for Resend before any from-address change.
- Confirm the exact set of attached deployment domains (the Deployments tab is the authority).
