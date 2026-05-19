# Briarwood — Target Stack & Architecture Direction

For Dundy / clean build. **Do not retrofit into the live dateinquiry.com beta.**

---

## Product Direction (Reminder)

Briarwood is a **headless SaaS workflow layer for trusted service operators.**

Core workflow:

> Inquiry → availability/calendar check → operator prompted by SMS/email → operator chooses (respond / proposal / contract / payment / schedule / route / decline) → if routed, trusted network handoff tracked → outcome captured → trust event logged

The stack must support:

1. Inbound inquiry capture
2. Operator alerts by SMS/email
3. Calendar/availability logic
4. Proposal / contract / payment workflow
5. Schedule generation
6. Trusted network / contact routing
7. Event logging for future CDI / trust signal
8. Clean API-first / headless architecture
9. Agent-readable records

---

## Stack Decisions Up Front

| Layer | Choice | Why |
|---|---|---|
| **Primary AI reasoning** | OpenAI GPT-5 (default) | Fast, cheap, structured outputs reliable |
| **Long coding / complex workflow logic** | Claude Opus 4.5 | Better long-context reasoning + agentic tool use |
| **Tool integration meta-layer** | Composio | Replaces ~10 custom integrations with one SDK |
| **Agent-native email** | Agent Mail | Inquiry capture + agent reply threading |
| **Email (transactional)** | Resend | Already proven in beta. Keep. |
| **SMS** | Twilio | Already proven in beta. Keep. |
| **Payment** | Square OR Stripe | **DECISION NEEDED** (see Risks below) |
| **E-signature** | OpenSign | Already proven in beta. Keep. |
| **Calendar** | Google Calendar via OAuth | Already proven. Keep. Add internal calendar table as source of truth. |
| **Object storage** | Object Storage (GCS-backed) | Already proven. Keep. |
| **DB** | Postgres (Neon) + Drizzle ORM | Already proven. Keep. |

---

## Tool-by-Tool Target Stack

### 1. OpenAI (GPT-5)

- **API/auth reality:** ✅ REST API + official Node SDK. `OPENAI_API_KEY`. No OAuth.
- **Briarwood use:**
  - Inbound inquiry parsing (extract date, location, service, party size from messy email/form text)
  - Polite auto-response drafting
  - Operator SMS action-prompt summarization
  - Quick classification (priority, urgency, sentiment)
- **MVP or later:** **MVP.** Core to inquiry → action loop.
- **Risks:** Cost at scale. Mitigate by caching parses; only run on new/changed inputs.
- **Note:** "GPT-5.5" referenced in original ask **does not exist as of May 2026.** Using GPT-5.

### 2. Claude Opus 4.5 (Anthropic)

- **API/auth reality:** ✅ REST API + official Node SDK. `ANTHROPIC_API_KEY`. No OAuth.
- **Briarwood use:**
  - Long-context coding/refactoring sessions (Dundy's pair-programmer)
  - Multi-step workflow reasoning (e.g. "given this inquiry + this calendar + this network, what's the optimal route?")
  - Contract/proposal generation with structured merge fields
  - Voice action parsing (Phase 4) — "send to Sarah and note Napa wedding June 8" → structured action
- **MVP or later:** **MVP** for the agentic workflow loop. Required for Phase 4 voice.
- **Risks:** Higher cost per call than GPT-5. Use only for tasks where reasoning quality matters.

### 3. Composio

- **API/auth reality:** ✅ Composio SDK (Python + TypeScript). Auth via Composio API key + per-tool OAuth flows it brokers for you. 200+ integrations under one interface.
- **Briarwood use:** **The integration backbone.** Instead of writing custom clients for Trello/Asana/Loom/Calendly/Slack/etc., wire them through Composio. Operators connect their accounts via Composio's hosted OAuth, and Briarwood calls them through one SDK.
- **Specifically use Composio for:**
  - Trello/Asana writes (when operator wants tasks created)
  - Slack notifications (operator-side, optional)
  - Loom video embed creation
  - Future CRM/ops tools without rebuilding integration code
- **MVP or later:** **MVP.** Adopt early so future integrations are free.
- **Risks:**
  - Composio is a third-party dependency — if it goes down, all those integrations go down. Have a "direct API" fallback path for the 2-3 most critical tools.
  - Per-tool latency adds a hop. Acceptable for non-realtime actions; bad for inbound.
  - Pricing model — check current $/action or seat-based pricing before committing.
- **Question for Violet/Dundy:** Confirm budget tolerance for Composio's pricing tier at expected operator count.

### 4. Agent Mail (agentmail.dev)

- **API/auth reality:** ✅ REST API + SDK. Provides agent-native inboxes (each operator/agent gets a real `*@inbox.agentmail.dev` address, or custom domain). Send, receive, thread, reply, parse — designed for AI agents to handle email as a first-class workflow.
- **Briarwood use:**
  - Each operator gets an Agent Mail inbox (e.g. `themakeupdolls@briarwood.ai` routed to Agent Mail)
  - Inbound emails parse automatically into structured Inquiry records
  - Operator's AI secretary can reply on-thread directly through Agent Mail
  - Better separation than the current Resend-only setup: Resend stays for transactional sends; Agent Mail handles operator inbox + agent-driven replies
- **MVP or later:** **MVP if** the value-prop is "your inbox becomes your secretary." Otherwise Phase 2.
- **Risks:**
  - New-ish service — watch for deliverability quirks vs established providers.
  - Domain authentication: still need SPF/DKIM/DMARC for `briarwood.ai`. Make sure Agent Mail's setup doesn't conflict with Resend's.
  - Cost per message at scale.
- **Question for Violet/Dundy:** Should ALL inbound go through Agent Mail (replace Resend inbound), or is Agent Mail only for AI-assisted operator inboxes?

### 5. Trello

- **API/auth reality:** ✅ REST API. OAuth or API-key + token. Can be accessed directly OR through Composio.
- **Briarwood use:**
  - Optional operator integration: "push booked jobs as Trello cards on my workflow board"
  - Not a core inquiry/payment surface
- **MVP or later:** **Later (Phase 3+).** Through Composio when added.
- **Risks:** Low. Atlassian-owned, stable API.

### 6. Asana

- **API/auth reality:** ✅ REST API. OAuth. Through Composio.
- **Briarwood use:** Same as Trello — optional operator-side task export.
- **MVP or later:** **Later (Phase 3+).** Through Composio when added.
- **Risks:** Low. Stable.

### 7. Loom

- **API/auth reality:** ✅ API for embed creation, video listing, SDK for embedded recording. OAuth. Through Composio.
- **Briarwood use:**
  - "Record a video proposal" — operator clicks button, records walkthrough of proposal, Loom embed is attached to proposal email
  - "Day-of intro video" — operator sends Loom intro to client
- **MVP or later:** **Later (Phase 2-3).** Nice differentiator, not core.
- **Risks:** Low.

### 8. Orgo (orgo.ai)

- **API/auth reality:** ✅ SDK for computer-use agents (browser automation + desktop control).
- **Briarwood use:** Future automation of operator's non-API tools (e.g. logging into a venue's portal to confirm availability, scraping a vendor calendar with no API).
- **MVP or later:** **Phase 4 — future optional.** Powerful but unreliable for production-critical paths today.
- **Risks:**
  - Computer-use agents fail unpredictably. Don't put on critical workflow paths.
  - Cost per session can be high.
  - Privacy/security concerns (handles credentials).
- **Note:** Mention in roadmap. Do not build against in MVP.

### 9. Hermes

- **API/auth reality:** ❓ **TBD — name is ambiguous.**
- **Possible meanings:**
  - Nous Research's Hermes-2/3 open-source LLM (would compete with GPT-5/Claude)
  - Internal codename for an agent orchestration layer
  - A third-party agent messaging product
- **Violet's intent:** "Agent orchestration / agent messaging layer"
- **Recommended placeholder:**
  - For "agent orchestration": use **LangGraph** (open source, Python+TS) or **Mastra** (TS-native agent framework). Both are battle-tested.
  - For "agent-to-agent messaging": A2A protocol (already implemented in the beta via `.well-known/ai-agent`).
- **MVP or later:** Decide what Hermes actually means before committing. **TBD.**
- **Question for Violet/Dundy:** Pin down: is this an existing product, an open-source library, or a name for our own internal layer? Answer drives the build.

### 10. Granola

- **API/auth reality:** ❌ **No public API.** Consumer AI meeting-notes app.
- **Briarwood use:** **Not integratable.** Reference only.
- **MVP or later:** N/A.
- **Note:** If Violet uses Granola personally for sales/customer notes, those notes can be pasted into Briarwood manually. No automation possible today.

### 11. Superhuman

- **API/auth reality:** ❌ **No public API.** Closed email client.
- **Briarwood use:** **Not integratable.** Reference only.
- **MVP or later:** N/A.
- **Note:** Operators who use Superhuman as their inbox can still BCC/forward into Agent Mail or set up forwarding rules. That's a workaround, not an integration.

### 12. Codex

- **API/auth reality:** ✅ via OpenAI API. Codex is OpenAI's coding-tuned model line — accessed through the standard OpenAI SDK with a Codex-family model name (e.g. `gpt-5-codex` or whatever current naming OpenAI uses at build time).
- **Briarwood use:**
  - Dev-time only: pair-programming, code generation for Dundy
  - Not used at runtime in the product itself (use GPT-5 / Claude Opus for runtime AI)
- **MVP or later:** **Build-time tool only.** Not a product dependency.
- **Risks:** None for the product. Workflow choice for Dundy.

---

## Recommended Service Layout

```
┌────────────────────────────────────────────────────────────────┐
│                    Briarwood Headless Core                     │
│                                                                │
│  Postgres (Neon) + Drizzle ORM  ─  source of truth             │
│                  │                                             │
│       ┌──────────┴──────────┐                                  │
│       │                     │                                  │
│  Inquiry Loop          Trust Event Log                         │
│       │                     │                                  │
│       └──────────┬──────────┘                                  │
└──────────────────┼─────────────────────────────────────────────┘
                   │
        ┌──────────┼──────────────────────────────┐
        │          │                              │
   ┌────▼────┐ ┌───▼─────┐ ┌───────────┐  ┌──────▼──────┐
   │ Inbound │ │ Operator│ │  Workflow │  │  Integration│
   │ Channel │ │ Alerts  │ │  AI       │  │  Layer      │
   ├─────────┤ ├─────────┤ ├───────────┤  ├─────────────┤
   │Agent    │ │ Twilio  │ │ GPT-5     │  │  Composio   │
   │Mail     │ │ Resend  │ │ Claude    │  │  (Trello,   │
   │+ Public │ │         │ │ Opus 4.5  │  │   Asana,    │
   │form     │ │         │ │           │  │   Loom, etc)│
   └─────────┘ └─────────┘ └───────────┘  └─────────────┘
        │
        ▼
   ┌─────────────────────────────────────────┐
   │  Domain Workflows (existing in beta)    │
   │  Square/Stripe + OpenSign + Google Cal  │
   └─────────────────────────────────────────┘
```

---

## Major Risks & Open Questions

### Risks
1. **Composio dependency risk.** If 80% of operator integrations route through Composio and they have an outage, Briarwood looks broken. Mitigate: keep direct API fallback for the 2-3 most critical (probably Calendar + Stripe/Square).
2. **AI cost spiral.** GPT-5 + Claude Opus + Codex all at runtime gets expensive. Set per-operator budget caps from day one.
3. **Email deliverability fragmentation.** Running Resend (outbound transactional) + Agent Mail (operator inbox) on the same domain (`briarwood.ai`) requires careful DNS coordination. Plan DKIM/SPF/DMARC together.
4. **Square vs Stripe lock-in.** Existing beta uses Square. Switching to Stripe means rewriting payment routes AND losing the existing Square integrations for operators already onboarded.

### Open Questions for Violet / Dundy

1. **Hermes** — what is this actually? Open-source Hermes LLM? Internal codename? A product I haven't found? Pin it down before Dundy builds against it.
2. **Square vs Stripe** — keep Square (faster, beta-proven, 1% appFee already wired) or switch to Stripe (more devs know it, larger ecosystem)?
3. **Agent Mail scope** — handle all inbound or just AI-assisted threads?
4. **Composio budget tolerance** — what monthly $ ceiling triggers a switch to direct integrations?
5. **AI runtime model routing** — should the product route requests by task type (GPT-5 for cheap parsing, Opus for reasoning), or use Opus everywhere for consistency?
6. **Voice (Phase 4) preferred stack** — Whisper + Claude Opus (Anthropic-native), or OpenAI Realtime API?

---

## What NOT To Build In MVP

- Granola / Superhuman integrations (impossible)
- Orgo computer-use agents (too unreliable for production)
- "GPT-5.5" (doesn't exist; use GPT-5)
- Custom Trello/Asana/Loom clients (use Composio)
- A full agent challenge / ACP system (the beta over-built this; defer to Phase 3)

---

## Build Order Recommendation

**Phase 1 (Weeks 1–3):** Postgres schema + Drizzle, Resend transactional, Twilio SMS prompts, GPT-5 inquiry parsing, internal calendar, operator dashboard, manual contracts/proposals.

**Phase 2 (Weeks 4–6):** Agent Mail inbound, Square/Stripe payments, OpenSign contracts, Composio with first 2 integrations (Trello + Slack), schedule maker, trusted network routing.

**Phase 3 (Weeks 7–10):** CDI event logging (minimal — events + composite score, nothing more), public API endpoints, agent-readable A2A card, Loom integration, Asana integration.

**Phase 4 (post-launch):** Voice action parsing (Claude Opus), Orgo for legacy-tool automation, full trust-signal query endpoint, agent challenges if needed.
