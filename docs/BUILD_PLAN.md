# Briarwood Build Plan

This plan breaks Briarwood implementation into small PR-sized tasks. It uses `docs/ARCHITECTURE.md` and `docs/PRODUCT_SPEC.md` as source context.

The plan intentionally starts with the safest implementation work: a read-only, owner-scoped Inquiry Workspace foundation that reuses existing authenticated data and avoids schema, auth, public token, payment, schedule-sharing, email, SMS, and contract-signing changes.

## Hard Constraints

Every implementation PR must respect these constraints unless a later product decision explicitly changes them:

- No destructive migrations.
- No unsafe auth refactor.
- No public token changes.
- No email, SMS, payment, or real external side effects.
- No broad `server/routes.ts` rewrite.
- No marketplace, public directory, booking-platform, or generic CRM drift.
- Owner-scoped operator data only.
- Inquiry Workspace stays the center of the product.
- External actions are approval-gated and out of scope until a later safe-sending phase.
- Trust/CDI events start observational and must not over-score early behavior.

## PR Sizing Rules

Each PR should have one product outcome, a narrow touched-file set, and a clear rollback story.

Prefer:

- Read-only before writes.
- Existing tables before new tables.
- Existing endpoints before new endpoints.
- Narrow endpoint additions before route-file reorganization.
- Owner-scoped queries before UI expansion.
- Dry-run/preview before any real sending.
- Metadata records before external integrations.

Avoid:

- Auth rewrites.
- Public token carry-forward.
- Payment processing.
- Email/SMS sends.
- Contract signing changes.
- Public schedule sharing.
- Runtime migration edits unless the PR is explicitly a migration-safety PR.
- Large cross-domain refactors.

## Recommended Build Sequence

### PR 1: Read-Only Inquiry Workspace Shell

Goal: establish the Inquiry Workspace as the center without changing behavior.

Scope:

- Add an authenticated operator-only Inquiry Workspace entry point in the frontend.
- Show a read-only list of owner-scoped inquiries using existing data access where possible.
- Add a read-only inquiry detail shell with core fields: client name, email, phone, requested date, location/venue, request details, source, status, and notes.
- If an API gap exists, add only a narrow authenticated GET endpoint that returns inquiries for the current operator; do not add public routes.
- Keep data owner-scoped by session user, not URL slug.

Non-goals:

- No writes.
- No schema changes.
- No auth changes.
- No public token changes.
- No email/SMS/payment/contract/schedule side effects.
- No route-file reorganization.

Verification:

- Unauthenticated users cannot access operator inquiry data.
- Operator sees only their own inquiries.
- UI renders empty, loading, error, and populated states.
- No side-effect services are called.

Why this is first: it creates the product center while avoiding the risky systems called out in the architecture audit.

### PR 2: Inquiry Detail Read Model And Linked-Record Placeholders

Goal: make the inquiry detail page the hub for linked work without creating or changing linked records yet.

Scope:

- Add read-only sections for linked client/contact, routing/delegation, contract record, payment-state record, schedule draft, and timeline.
- Show placeholders when linked records do not exist.
- Use existing relationships if available; otherwise show safe empty states.
- Keep all sections read-only.

Non-goals:

- No create/edit/delete.
- No schema changes.
- No sending.
- No public links.

Verification:

- Detail page handles missing linked records without errors.
- Linked sections never fetch another operator's data.
- Existing public thread/token behavior is untouched.

### PR 3: Clients/Contacts Read Model

Goal: let the Inquiry Workspace display and search private clients/contacts without changing contact ownership semantics.

Scope:

- Add owner-scoped contact search/read support for the operator workspace.
- Surface contact matches from inquiry detail.
- Show read-only contact detail summary: name, email, phone, notes, source, and related inquiries if available.

Non-goals:

- No contact creation yet.
- No contact merge/dedupe.
- No public contact routes.
- No user-account linking changes.

Verification:

- Contact search is owner-scoped.
- Contact search does not expose public or cross-operator data.
- Inquiry detail remains usable when no contact is linked.

### PR 4: Client/Contact Link Action

Goal: allow an operator to link an inquiry to an existing private contact or create a minimal private contact from inquiry data.

Scope:

- Add a narrow owner-scoped link action from Inquiry Workspace.
- If creating a contact, copy only inquiry client name/email/phone and operator notes.
- Record a timeline/audit-style local event if an existing safe mechanism exists.

Non-goals:

- No account creation.
- No auth/profile linking changes.
- No public route changes.
- No contact import/dedupe engine.

Verification:

- Operator cannot link another operator's inquiry or contact.
- Linking is reversible only if a safe existing unlink path exists; otherwise omit unlink until specified.
- Link action does not send messages.

### PR 5: Trusted Network / Rolodex Read Model From Inquiry

Goal: make private trusted network search available from the inquiry context.

Scope:

- Reuse the existing private route-target or Rolodex data model where possible.
- Add inquiry-scoped trusted network search UI.
- Show name, business name, role, phone/email availability, location/region, capabilities, tags, preferred/backup/external, active/inactive, and notes where available.

Non-goals:

- No public directory.
- No rankings or ratings.
- No marketplace discovery.
- No candidate creation yet.

Verification:

- Results are owner-scoped.
- Inactive contacts are clearly marked or filtered according to existing behavior.
- Search remains private and authenticated.

### PR 6: Routing/Delegation Draft Records

Goal: let an operator create draft routing/delegation records from an inquiry without sending anything.

Scope:

- Select trusted network candidates from the inquiry.
- Create candidate route/delegation records with status `draft`.
- Show route type and candidate status in the Inquiry Workspace.
- Use existing `inquiry_routes`/`route_targets` concepts if available.

Non-goals:

- No SMS/email sending.
- No preflight send.
- No public token changes.
- No automatic status transitions.

Verification:

- Draft route creation is owner-scoped.
- Draft creation does not call Twilio, Resend, Square, signing, or public schedule code.
- Draft records appear under the originating inquiry.

### PR 7: Routing Message Preview And Candidate Status Tracking

Goal: support preview-only outreach and manual candidate status changes.

Scope:

- Add preview UI for routing/delegation outreach copy.
- Mark preview state as `previewed` only if the product explicitly wants a saved preview marker; otherwise keep preview ephemeral.
- Allow manual candidate statuses: `pending`, `accepted`, `declined`, `no_response`, `backup`, `assigned`, `cancelled`.
- Timeline must distinguish preview/manual status changes from real sends.

Non-goals:

- No automatic sending.
- No inbound SMS matching changes.
- No trust-score changes beyond existing observational behavior.

Verification:

- Preview does not send.
- Manual status updates are owner-scoped.
- No fake sent events are created.

### PR 8: Contract Record Metadata From Inquiry

Goal: let an operator create or open a contract record from an inquiry as metadata only.

Scope:

- Create/open a contract record linked to an inquiry.
- Capture client/contact, event/work date, location, services/package, status, total amount, deposit amount, balance amount, contract URL/signing-link placeholder, and notes.
- Reuse the existing contract/vault safe metadata behavior where possible.

Non-goals:

- No e-signature implementation.
- No signing-token changes.
- No contract email sends.
- No payment processing.

Verification:

- Signing tokens are never exposed in the Inquiry Workspace.
- Owner/admin scoping is preserved.
- Contract metadata changes do not trigger sends or signing flows.

### PR 9: Payment-State Record Metadata

Goal: let an operator track payment state from an inquiry or contract without processing payments.

Scope:

- Add/open payment-state metadata linked to inquiry and/or contract.
- Capture total, deposit, balance, amount paid, due date, status, method, payment link placeholder, and notes.
- Use existing safe contract payment metadata fields if possible before adding new schema.

Non-goals:

- No real payment links.
- No Square API calls.
- No invoices.
- No emails/SMS.
- No automatic payment status changes.

Verification:

- Updating payment state does not call payment providers.
- Owner scoping is preserved.
- Payment state is visibly metadata-only.

### PR 10: Private Schedule Draft From Inquiry Or Contract

Goal: allow an operator to create/open a private schedule draft from the inquiry workflow.

Scope:

- Reuse existing schedule draft endpoints and table if possible.
- Create/open draft with title, event date, location, notes, providers, service defaults, schedule blocks/provider lanes, and editable cells.
- Link draft back to inquiry or contract.

Non-goals:

- No public schedule sharing.
- No schedule email/SMS sends.
- No guest edits.
- No public share token changes.

Verification:

- Schedule draft is operator-only.
- Creating/opening a draft does not create public links.
- Public event schedule behavior is untouched.

### PR 11: Coordination Timeline Read Model

Goal: show inquiry-centered coordination history without inventing fake external actions.

Scope:

- Build a read model that displays existing events and records in chronological order.
- Include inquiry created, contact linked, route created, message previewed if saved, candidate status changed, contract created, payment-state record created, schedule draft created, inquiry status changed, and notes.
- Label each event as draft, preview, internal, or external where possible.

Non-goals:

- No new trust scoring.
- No public timeline.
- No fake sent events.
- No broad audit-log refactor.

Verification:

- Timeline is owner-scoped.
- Timeline distinguishes preview/draft from real sent actions.
- Timeline remains useful when some linked modules are missing.

### PR 12: Owner-Scoped Operator Search

Goal: provide basic search across the private operator workspace.

Scope:

- Search inquiries, clients/contacts, trusted network, contracts, payment records, schedule drafts, notes, tags, dates, and locations as available.
- Prioritize inquiry-centered results.
- Support use cases like `Find Laura Fischer contract 6/26`.

Non-goals:

- No global search across operators.
- No public search.
- No marketplace search.
- No AI search summaries yet.

Verification:

- Search is owner-scoped.
- Search does not expose tokens or signing links.
- Search result links return to authenticated operator pages.

### PR 13: Safe Sending / Dry-Run Foundation

Goal: prepare for later external actions without turning them on by default.

Scope:

- Centralize visible send states in the UI: draft, preview, dry-run, approved send later.
- Add confirmation UX for future send surfaces.
- Ensure no live external send happens in this PR.

Non-goals:

- No email sends.
- No SMS sends.
- No payment links.
- No contract sends.
- No public links.

Verification:

- All send-related controls are disabled, dry-run, or preview-only.
- No external provider APIs are called.
- UI copy does not imply a message was sent.

### PR 14: Assistant Suggestions Only

Goal: introduce AI only as non-authoritative suggestions after the operator workspace is stable.

Scope:

- Assistant can suggest next actions, draft copy, summarize an inquiry, or identify missing fields.
- Suggestions are operator-reviewed and reversible.
- Assistant output cannot create sends, payments, public links, or status changes without explicit operator action.

Non-goals:

- No AI auto-action.
- No AI auto-send.
- No autonomous routing.
- No trust-score automation.

Verification:

- Suggestions are clearly labeled.
- Operator must click an explicit action to accept any suggestion.
- Assistant has no access to cross-operator data.

### PR 15: Agent-Facing Trust Layer Later

Goal: only after the operator workspace, safe sending, and trust boundaries are stable, expose limited agent-facing trust infrastructure.

Scope:

- Define read-only agent-safe surfaces first.
- Keep token/scopes/autonomy policy explicit.
- Preserve owner-scoped access and public-token safety.

Non-goals:

- No agent payment authority.
- No agent sending authority.
- No autonomous public sharing.
- No broad ACP expansion.

Verification:

- Agent actions are scoped, logged, and denied by default.
- Agent-facing outputs do not leak private tokens, signing links, or cross-operator data.

## Migration Strategy

- Prefer existing schema for early PRs.
- If schema is needed, use additive migrations only.
- Never drop, rename, or destructively alter columns/tables in early Briarwood PRs.
- Do not add runtime startup DDL for new Briarwood work.
- Document any new table or column with ownership, access model, and rollback notes.

## Auth Strategy

- Do not refactor login, OIDC, password auth, magic links, or profile auto-linking as part of early product work.
- Treat authenticated session user as the ownership source.
- Do not trust URL slugs for data ownership.
- Add targeted tests around owner scoping before touching auth-sensitive behavior.

## Public Token Strategy

- Do not change public token flows in early Briarwood work.
- Do not carry tokenized schedule, contract, quote, or client-thread behavior into new Briarwood surfaces by default.
- Review token entropy, expiry, scope, and leakage before any public-link feature is included.

## Side-Effect Strategy

Early Briarwood PRs should be side-effect free.

Do not call:

- Resend/email sends.
- Twilio/SMS sends.
- Square/payment APIs.
- Contract signing or countersigning flows.
- Public schedule sharing flows.
- Public object-sharing behavior.

Preview and metadata-only records are allowed when scoped and labeled clearly.

## First Implementation Task

The first implementation task after this build plan should be PR 1: Read-Only Inquiry Workspace Shell.

One-sentence task prompt:

`Create an authenticated, owner-scoped, read-only Inquiry Workspace shell that lists the current operator's inquiries and opens a detail shell using existing data where possible, with no schema changes, no auth refactor, no public token changes, and no external side effects.`

Success criteria:

- The Inquiry Workspace exists as the center of the app experience for Briarwood work.
- It displays owner-scoped inquiry data or safe empty states.
- It does not create, update, delete, send, charge, sign, share, or schedule anything.
- It keeps future modules as linked placeholders rather than building them all at once.
