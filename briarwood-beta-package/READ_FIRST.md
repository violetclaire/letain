# READ THIS FIRST — Briarwood Build Priorities

**To Dundy:** Read this page before anything else in the handoff.

---

## The One Sentence

**The workflow is the moat. The event log is the foundation for CDI. Everything else is secondary.**

If you remember only one thing from this package, remember that.

---

## What "the workflow" means

The core operator loop is the entire product. It is:

> **Inquiry → availability check → operator prompt (SMS/email) → operator chooses (respond / proposal / contract / payment / schedule / route / decline) → if routed, trusted network handoff tracked → outcome captured → trust event logged**

This single loop is what gives Briarwood its right to exist. Word-of-mouth service operators already do every step of this in DMs, texts, memory, and manual coordination. Briarwood makes it legible.

**If the workflow is clunky, nothing else matters.** If the workflow is magical, the rest of the product writes itself.

---

## What "the event log is the foundation for CDI" means

Every step of the workflow above must be logged as a structured **trust event**, even before any CDI scoring logic is written.

| Event | Trigger |
|---|---|
| `inquiry.received` | Inquiry submitted |
| `availability.checked` | Calendar consulted |
| `operator.responded` | Operator acted within SLA |
| `proposal.sent` / `contract.sent` / `payment.received` | Operator follow-through |
| `handoff.created` / `handoff.accepted` / `handoff.declined` | Routing behavior |
| `job.booked` / `job.completed` | Outcome captured |
| `referral.repeated` | Long-term trust signal |

Each event needs: `timestamp, actor, object_id, status, metadata, source`.

**That table — clean, complete, and consistently written — IS the CDI foundation.** Score on top of it later. Don't build scoring before the events are reliably captured.

---

## MVP Build Priority (in order)

Build these in this order. Do not jump ahead.

1. **Simple onboarding** — operator on in under 5 minutes
2. **Inquiry intake** — public form + structured record
3. **Calendar availability** — internal calendar as source of truth, plus blocks/holds
4. **SMS/email operator prompt** — magic-link action buttons (Twilio + Resend)
5. **Proposal / contract / payment flow** — generate, send, sign, charge (Square or Stripe + OpenSign)
6. **Schedule maker** — generate getting-ready/service schedules, shareable link
7. **Trusted network routing** — categorized contacts, handoff as first-class object with outcome columns
8. **Trust event logging** — write every workflow step into the events table

Each of these must work end-to-end before adding anything else.

---

## DO NOT BUILD YET (post-MVP only)

These will tempt you. Resist until the workflow above is solid.

- **CDI scoring layer.** Capture events now. Score them later. The current beta over-built this (10+ CDI tables, learning runs, pattern library, AI insights, admin overrides, IQS). For MVP: one events table, one composite score field. That's it.
- **Voice action parsing.** Phase 4. Dictation is fine; structured action parsing is later.
- **Orgo / computer-use agents.** Phase 4. Too unreliable for production workflows today.
- **Agent challenges / Agentic Commerce Protocol / proof-of-work puzzles.** The current beta has these wired up. Cut them from the clean build. Add back if and when a real agent partner needs them.
- **A2A agent card / public agent endpoints.** The architecture should be API-first and agent-readable from day one, but DO NOT build a public agent marketplace surface in MVP.
- **70+ pages.** The beta has 70+ React pages. Brutal cut. Aim for ~10 screens (see `PRODUCT_BRIEF.md` §13 and `GAP_ANALYSIS.md` §13).
- **Multiple onboarding flows.** The beta has 4. Build ONE.

---

## The Architectural Constraints (non-negotiable)

1. **API-first.** Every domain object (operator, inquiry, job, client, proposal, contract, payment, schedule, contact, handoff, outcome, trust_event) has a REST endpoint from day one, even if the UI is the only consumer initially.
2. **Agent-readable.** Clean semantic fields. No JSON blobs masquerading as structure. Every record has unique ID, timestamps, status, owner.
3. **Headless.** UI is one of several possible clients. Treat it that way.
4. **Event log writes are required, not optional.** Every workflow action writes a trust event in the same transaction. If the event write fails, the action fails.

---

## What's in this package

- `READ_FIRST.md` — this file
- `TRANSFER_README.md` — original handoff notes (configs, deps, setup steps from the live beta)
- `PRODUCT_BRIEF.md` — full product brief from Violet (583 lines, definitive)
- `GAP_ANALYSIS.md` — what to KEEP, REBUILD CLEANER, CUT entirely, and BUILD FRESH from the current live beta
- `STACK_TARGET.md` — target stack (OpenAI GPT-5, Claude Opus 4.5, Composio, Agent Mail, Twilio, Resend, etc.) with honest API/auth realities for each tool
- `client/` `server/` `shared/` — copied source from the live beta as a reference, NOT as a starting commit. Treat as study material. The clean build should pull patterns from here, not fork from here.

---

## How to read the other docs

1. **First:** this file
2. **Second:** `PRODUCT_BRIEF.md` — what we're building, in Violet's words
3. **Third:** `STACK_TARGET.md` — what to build it with
4. **Fourth:** `GAP_ANALYSIS.md` — what the existing beta already proves works (and what it gets wrong)
5. **Fifth:** `TRANSFER_README.md` — operational setup notes from the beta transfer
6. **Sixth (only when implementing):** the actual `client/server/shared` source as a reference

---

## When in doubt

Ask: **"Does this make the operator workflow more magical?"**

- If **yes** — build it.
- If **no** — defer it.

The product is "the secretary I wish I had." Not a CRM. Not an agent marketplace. Not a trust-scoring engine. A workflow that makes private trust networks legible by capturing how operators already work.

Build that loop. Log every step. The rest follows.
