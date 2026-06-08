# Briarwood Product Specification

This document defines the product boundary for Briarwood so future Codex build tasks can preserve the intended product shape. It is a documentation-only specification. It does not authorize app-code changes, route changes, schema changes, environment variable changes, publishing, refactors, or feature builds.

## Product Definition

Briarwood is private operator infrastructure for inquiry-to-execution coordination.

It helps an independent operator capture an incoming inquiry, understand the context, decide what should happen, coordinate trusted people, record contract/payment/schedule state, and preserve a timeline of coordination behavior over time.

Core product spine:

`Inquiry -> client/contact -> trusted network -> routing/delegation -> contract record -> payment state -> schedule draft -> coordination timeline -> trust record`

### What Briarwood Is

Briarwood is:

- An operator-owned workspace for managing real-world service inquiries.
- A coordination layer for trusted handoffs, delegation, follow-through, and execution state.
- A private record of clients, contacts, trusted network members, candidate routing, contracts, payment state, schedule drafts, notes, and trust behavior.
- A product centered on the Inquiry Workspace, because each inquiry is the work object that gathers context, decisions, linked people, linked records, timeline events, and eventual outcomes.
- A system for making invisible coordination visible without turning it into a public directory or marketplace.

### What Briarwood Is Not

Briarwood is not:

- A marketplace.
- Booking software.
- A generic CRM.
- A chatbot.
- A public directory.
- A social network.
- A beauty or wedding app.
- A ratings system.
- A lead-generation platform.
- An AI auto-sending tool.

### Why The Inquiry Workspace Is The Center

The Inquiry Workspace is the center because the inquiry is the first concrete unit of work. A client/contact, trusted network search, routing candidate, contract record, payment-state record, schedule draft, note, timeline event, and trust record all become meaningful because they relate to a specific request.

The product should not begin as a Rolodex, public profile, calendar, contract tool, payment tool, or AI assistant. Those modules support the inquiry-to-execution loop. The inquiry is the spine that prevents the product from drifting into a generic platform.

### Why The Trusted Network Supports The Workflow

The trusted network is important, but it is not the whole product. It is private operator-owned data used when an inquiry needs routing, delegation, backup coverage, review, or execution support.

The trusted network should support inquiry decisions. It should not become a public vendor directory, marketplace, discovery feed, social graph, or ratings product.

## Primary User

The primary user is an independent operator or service business owner.

This person coordinates real-world delegated work across clients, vendors, providers, assistants, and trusted contacts. They need a private operating layer for deciding what should happen next and tracking whether that decision was executed.

Examples of primary-user responsibilities:

- Receive and evaluate inquiries.
- Decide whether to accept, decline, route, delegate, or hold work.
- Coordinate with trusted people before involving the client.
- Keep client/contact context attached to the work.
- Track contract, payment, schedule, and outcome state.
- Preserve trust behavior over time without creating public ratings.

## Core Workflow

The intended inquiry-to-execution loop is:

1. Inquiry arrives.
2. Context is captured: who, what, when, where, source, notes, status, and urgency.
3. Operator decides whether the inquiry is viable, needs review, should be routed, should be declined, or should move forward.
4. Client/contact is linked or created.
5. Trusted network can be searched from the inquiry.
6. Routing/delegation records can be created for selected candidates.
7. Outreach messages can be previewed before any external action.
8. Candidate status is tracked as draft, pending, accepted, declined, assigned, or closed.
9. Contract record can be created/opened from the inquiry.
10. Payment-link/payment-state record can be created/opened from the inquiry or contract.
11. Schedule draft can be created/opened from the inquiry or contract.
12. All meaningful changes appear in the coordination timeline.
13. Trust behavior is captured over time as observational coordination history.

The loop should remain operator-led. No external sending, AI action, payment processing, public sharing, or tokenized client access should be introduced without explicit approval in a later build task.

## Core Modules

### Dashboard

The dashboard should orient the operator to active work, recent inquiries, pending routing/delegation, upcoming dates, unpaid or incomplete payment states, incomplete contract records, open schedule drafts, and recent timeline activity.

The dashboard should not become a marketing home page or public profile surface.

### Inquiry Workspace

The Inquiry Workspace is the main product surface. It should gather inquiry details, linked people, linked records, route/delegation candidates, timeline events, and notes into one operator-owned view.

### Clients/Contacts

Clients/Contacts should hold private operator-owned people records. Contacts are support data for inquiries and coordination; they are not public accounts by default.

### Trusted Network / Rolodex

Trusted Network/Rolodex should hold private operator-owned network contacts. It should support search, tagging, capabilities, trust notes, preferred/backup marking, and later route history.

### Routing/Delegation

Routing/Delegation should let an operator select trusted candidates from an inquiry, create candidate records, preview messages, and track candidate state.

### Contract Records

Contract Records should capture business-state metadata for an inquiry or client engagement: status, amount fields, services/package, date/location, URL or signing-link placeholder, notes, and linked inquiry.

### Payment-Link / Payment-State Records

Payment records should capture payment state, external payment link placeholders, due dates, amount paid, method, and notes. V1 should not process real payments unless explicitly approved later.

### Schedule Drafts

Schedule Drafts should capture editable planning state tied to an inquiry or contract. They should remain private operator drafts in V1 unless public sharing is explicitly approved later.

### Coordination Timeline

The Coordination Timeline should show real product activity around the inquiry. It must distinguish drafts/previews from real sent or externally visible actions.

### Search

Search should eventually cover inquiries, clients/contacts, trusted network, contracts, payment records, schedule drafts, notes, tags, dates, and locations.

Example use case: `Find Laura Fischer contract 6/26.`

### Settings Later

Settings are needed, but they should not lead the product. Settings should come after the core inquiry workspace has stable owner-scoping, module boundaries, and safe defaults.

### AI / Assistant Later

AI/assistant behavior should be suggestion-first. It can help draft, summarize, search, or identify next actions later, but it must not auto-send, auto-route, auto-charge, auto-share, or auto-score without explicit approval.

### Sending Later

Sending can be added later behind preview, confirmation, audit, dry-run, and safety gates. V1 should prefer preview/draft state over live external messages.

### Public Links Later

Public links for schedules, contracts, payment, or client views should be reviewed separately. Public token safety must be explicit before any token flow is carried forward or expanded.

## Inquiry Workspace Requirements

Each inquiry should support:

- Client name.
- Client email.
- Client phone.
- Requested date.
- Location/venue.
- Service/request details.
- Notes.
- Source.
- Status.
- Linked client/contact.
- Linked routing/delegation records.
- Linked contract record.
- Linked payment-link/payment-state record.
- Linked schedule draft.
- Coordination timeline.

Suggested inquiry statuses:

- `new`
- `needs_review`
- `active`
- `routed`
- `waiting_on_response`
- `contracted`
- `scheduled`
- `completed`
- `declined`
- `archived`

Status changes should create timeline entries. Status changes should not imply that external messages were sent unless a separate approved send action actually happened.

## Trusted Network Requirements

Each private trusted network contact should support:

- Name.
- Business name.
- Role.
- Phone.
- Email.
- Location/region.
- Capabilities.
- Tags.
- Notes.
- Trust notes.
- Preferred/backup/external marker.
- Active/inactive state.
- Response/route history later.

This is private operator-owned data, not a public marketplace. The trusted network should be searchable from an inquiry but should not expose public profiles, public rankings, public ratings, or public discovery.

## Routing / Delegation Requirements

From an inquiry, the operator should be able to:

- Search trusted network contacts.
- Select candidates.
- Create routing/delegation records.
- Preview outreach messages.
- Track candidate status.

Candidate statuses:

- `draft`
- `previewed`
- `pending`
- `accepted`
- `declined`
- `no_response`
- `backup`
- `assigned`
- `cancelled`

No automatic sending should happen in V1 unless explicitly approved later. Previewing a message must not create a fake sent event. A sent event should only exist when a real external action occurred through an approved sending path.

## Contract Record Requirements

From an inquiry, the operator can create/open a contract record with:

- Client name/contact.
- Event/work date.
- Location.
- Services/package.
- Status.
- Total amount.
- Deposit amount.
- Balance amount.
- Contract URL/signing-link placeholder.
- Notes.
- Linked inquiry.

Contract statuses:

- `draft`
- `sent`
- `signed`
- `completed`
- `cancelled`

Real e-signature/token signing is later and must preserve token safety. Signing tokens must never leak into ordinary contract list/detail responses, search results, timeline entries, logs, assistant prompts, or public pages.

## Payment-Link / Payment-State Requirements

From an inquiry or contract, the operator can create/open a payment record with:

- Total amount.
- Deposit amount.
- Balance amount.
- Amount paid.
- Due date.
- Payment status.
- Payment method.
- Payment link placeholder.
- Notes.
- Linked inquiry.
- Linked contract.

Payment statuses:

- `not_requested`
- `requested`
- `deposit_due`
- `deposit_paid`
- `balance_due`
- `balance_paid`
- `overdue`
- `manually_confirmed_paid`

No real payment processing should happen in V1 unless explicitly approved later. Payment state can record external business facts, but it should not charge, create real payment links, send invoices, or mark money collected without operator approval.

## Schedule Draft Requirements

From an inquiry or contract, the operator can create/open a schedule draft with:

- Title.
- Event date.
- Location.
- Notes.
- Providers.
- Service defaults.
- Schedule blocks.
- Provider-lane structure.
- Editable name/service/provider/start/end/duration/notes fields.
- Save draft behavior.
- Preview/print later, or sooner if already safely present.

No public schedule sharing should happen in V1 unless explicitly approved later. A schedule draft is private operator planning state, not a public client/team schedule by default.

## Coordination Timeline Requirements

Every inquiry should show a timeline of meaningful coordination events, including:

- Inquiry created.
- Client/contact linked.
- Routing record created.
- Message previewed.
- Candidate status changed.
- Contract created.
- Payment-link/payment-state record created.
- Schedule draft created.
- Inquiry status changed.
- Note added.

The timeline must distinguish draft/preview actions from real sent actions. Do not create fake sent events. Do not imply a client, trusted contact, vendor, provider, or assistant saw something unless a real approved external action occurred.

Timeline entries should be useful evidence for the operator and future trust history. They should avoid over-scoring early behavior and should not become public ratings.

## Search Requirements

Basic operator search should eventually cover:

- Inquiries.
- Clients/contacts.
- Trusted network.
- Contracts.
- Payment records.
- Schedule drafts.
- Notes.
- Tags.
- Dates.
- Locations.

Search should be owner-scoped. It should never expose another operator's private data. Results should prioritize inquiry context and linked records so the operator can answer questions like:

- `Find Laura Fischer contract 6/26.`
- `Show pending routes for June weddings.`
- `Find unpaid deposits for next month.`
- `Find backup hair providers near Nashville.`

## Safety Principles

Hard product safety constraints:

- Operator-only app.
- Owner-scoped data.
- No public operator-data routes.
- No marketplace.
- No auto-send.
- No AI auto-action.
- No real payment processing until explicitly approved.
- No public schedule sharing until explicitly approved.
- No public contract sharing until explicitly approved.
- Every external action must be approval-gated.
- Public token flows must be reviewed before carry-forward.
- Signing tokens must never leak.
- Trust/CDI events should start observational and should not over-score too early.
- Draft and preview actions must remain distinguishable from real sent actions.
- Private trusted network data must not become public discovery data.
- Search must be owner-scoped.
- Assistant suggestions must be explainable and reversible.

## Future Build Order Recommendation

Recommended future build order:

1. App/auth/owner-scoping foundation.
2. Inquiry Workspace.
3. Clients/Contacts.
4. Trusted Network/Rolodex.
5. Routing/Delegation.
6. Contract Records.
7. Payment-State Records.
8. Schedule Drafts.
9. Coordination Timeline.
10. Search.
11. Safe sending/dry-run.
12. AI assistant suggestions.
13. Agent-facing trust layer later.

This order keeps the product centered on the inquiry-to-execution loop. It also delays risky external actions, public token flows, real payments, public sharing, and AI autonomy until the operator-owned core is stable.

## V1 Boundary

For V1, Briarwood should prioritize private operator infrastructure:

- Capture inquiries.
- Link clients/contacts.
- Search trusted network records.
- Create and track routing/delegation records.
- Create contract records as metadata.
- Create payment-state records as metadata.
- Create private schedule drafts.
- Record a coordination timeline.
- Preserve observational trust history.

V1 should not prioritize marketplace discovery, public booking, live payments, public schedule sharing, e-signature expansion, AI sending, or agent autonomy.
