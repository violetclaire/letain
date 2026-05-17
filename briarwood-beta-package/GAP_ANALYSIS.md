# Briarwood Brief vs. Existing Build — Gap Analysis

Generated from the existing Replit codebase (dateinquiry.com beta) against `PRODUCT_BRIEF.md`.

Legend:
- ✅ **Built** — exists and working in production
- 🟡 **Partial** — foundation exists, needs work to match brief
- ❌ **Missing** — not built, needs to be built fresh
- ⚠️ **Different than brief** — built but with a different choice (e.g. Square vs. Stripe)

---

## 1. Onboarding (Brief §1)
✅ **Built — but multiple competing flows.** The codebase has SecretaryOnboarding, VendorOnboarding, PublicOnboarding, ToileOnboarding, and an `intake/` folder with ArtistIntake. Tables: `artist_intakes`, `client_intakes`, `planner_intakes`. **For Dundy:** consolidate to ONE onboarding path matching brief's 5-minute target. Today's flows ask for too much up front (info sheet, pricing, contract template all at once).

## 2. Inquiry Intake (Brief §2)
✅ **Built.** `inquiries` table has all brief fields (clientName, clientEmail, clientPhone, eventDate, eventLocation, eventType, message, source, status). Status set is close but not identical:
- **Brief:** new, needs_review, available, unavailable, proposal_sent, contract_sent, payment_pending, booked, routed, declined, completed
- **Current:** pending, auto_responded, accepted, declined, referred, contract_sent, deposit_paid (≈ booked), completed, expired
- **Gap:** add `needs_review`, `available`, `unavailable`, `proposal_sent`, `payment_pending`. Rename `pending` → `new`, `deposit_paid` → `booked`, `referred` → `routed`.

## 3. Calendar Logic (Brief §3)
🟡 **Partial.** `blocked_dates` + `availability` tables exist, plus `ArtistAvailability.tsx`. **Missing:** tentative holds as a distinct state, service-area conflict detection, and a single "is this date available?" check function. Today availability is mostly manual blocks; the brief wants the calendar to be **the first source of truth**.

## 4. Operator Decision Prompt (Brief §4)
🟡 **Partial.** `server/smsService.ts` exists with Twilio installed (`twilio ^5.10.7`). Email prompts via Resend work. **Missing:** the brief's specific SMS template with one-tap action buttons (Send proposal / Ask follow-up / Route to trusted network / Decline / Save for later). Today the artist gets an email and clicks through to the dashboard. **For Dundy:** build SMS templates with magic-link action URLs that perform the action on a single click.

## 5. Proposal, Contract, Payment (Brief §5)
🟡 **Partial.**
- **Proposals:** `proposals` table + `Proposals.tsx` + `Proposal.tsx` exist. ✅
- **Contracts:** `contracts` + `contract_templates` tables, `ContractEditor.tsx`, OpenSign integration. ✅
- **Pricing sheet upload:** `artist_pricing` table + `pricingInfo` text field exist. ✅
- **Payment:** ⚠️ **Square, not Stripe.** Brief says "connect Stripe or payment provider" so Square satisfies the requirement. Full retainer/final/invoice/paid-timestamps flow exists.
- **Gap:** Brief's **Option C "hybrid"** (upload template + auto-fill client/date/services/pricing) is not cleanly implemented. The contract editor exists but auto-merge from inquiry data into an uploaded template is patchy. **For Dundy:** build the template-with-merge-fields pattern.

## 6. Schedule Maker (Brief §6)
✅ **Built, strong.** Tables: `schedules`, `event_day_schedules`, `schedule_team_members`, `schedule_appointments`, `schedule_chat_messages`. Pages: ScheduleBuilder, ScheduleCreator, ScheduleList, SimpleScheduleBuilder, MultiDaySchedule, PublicSchedule. `scheduleAI.ts` + `timelineParser.ts` do AI-assisted generation. Inputs match brief (event date, ready time, services, providers, location, duration, buffer, preferences). Outputs: shareable link, client/internal versions. **PDF export status uncertain** — verify before assuming.

## 7. Trusted Network (Brief §7)
✅ **Built.** `trusted_circle` table + `TrustedCircle.tsx` + `ArtistRolodex.tsx`. Also `client_contacts` table. **Gap vs. brief:** brief wants categories (service_providers, assistants, admin, referral_partners, venue_vendor, emergency_backup, staffing, contractors, agencies, private_network). Current schema doesn't expose all these categories cleanly. Brief also wants `past_handoffs`, `accepted_rejected_referrals`, `completed_outcomes` per contact — partially captured via `thread_referrals` + CDI events but not surfaced on the contact record.

## 8. Routing Workflow / Handoffs (Brief §8)
✅ **Built.** `thread_referrals` table + referral creation in routes. Records original inquiry, referring operator, referred provider, timestamp. **Gap:** brief wants explicit `accepted? / declined? / no_response? / booked? / completed? / payment_happened? / outcome_notes` columns on the handoff record. Today these are inferred from related inquiry/contract status — not always reliably. **For Dundy:** model handoff as its own first-class object with explicit outcome columns.

## 9. CDI / Trust Signal Logging (Brief §9)
✅ **Built, over-built relative to brief.** Tables: `cdi_events`, `cdi_scores`, `cdi_behavioral_events`, `cdi_dimension_scores`, `cdi_composite_scores`, `cdi_feedback_events`, `cdi_learning_runs`, `cdi_pattern_library`, `cdi_ai_insights`, `cdi_thresholds`, `cdi_admin_overrides`. Plus `cdiService.ts`, `cdiEngine.ts`, `cdiAgent.ts`, `cdiRealtime.ts`. Also IQS (`iqs_*` tables) which is a parallel scoring system. **For Dundy:** the brief says "do not overbuild CDI yet." Recommend **scrapping IQS** and **slimming CDI to just event logging + a simple composite score** for v1. Keep the table; cut the AI insights, learning runs, pattern library, admin overrides for MVP.

## 10. Headless / API-First (Brief §10)
✅ **Built.** 367 routes total in `server/routes.ts`. Dedicated `server/agentRoutes.ts` with full agent API: discover artists, check availability, get pricing, submit inquiries, place holds, get proof-of-service, manage webhooks. Tables: `agents`, `agent_api_keys`, `agent_webhooks`, `agent_action_logs`, `agent_events`. Every core object has unique ID + timestamps + status + owner. **For Dundy:** keep this architecture but the public-facing agent endpoints (ACP/A2A) are probably **out of scope for MVP** — fold them into Phase 3.

## 11. Agent-Readable / SEO-Ready (Brief §11)
✅ **Built.** `AgentBrief.tsx` page + `.well-known/ai-agent` A2A card. Clean semantic fields throughout schema. Contracts stored as both HTML (searchable text) and PDF (via OpenSign). **Gap:** brief wants "operator can ask 'pull up the contract for Emily on May 20'" — no natural-language retrieval endpoint exists today.

## 12. Voice Layer (Brief §12)
🟡 **Partial.** `client/src/components/VoiceDictation.tsx` exists, `useVoice.ts` hook exists, `server/replit_integrations/audio/` provides STT. Voice **dictation** works (transcribe to text). **Missing:** structured-action parsing ("send to Sarah and note Napa wedding June 8" → executes routing + adds note). Brief correctly says don't bottleneck on voice; treat as Phase 4.

## 13. MVP Screens (Brief §13)
✅ **Built — but cluttered.** Brief asks for 7 screens; codebase has 70+ pages. Many are dead, demo, or duplicate (Sandbox, Terminal, Memo, Oracle, DemoLandingPreview, BriarwoodDemo, BriarwoodSpec, Pitch, CDIArchitecture, ContextGraph, AgentBrief, Branding, Revenue, PublicAnalytics, Waitlist, ClientWaitlist, ToileInbound, ToileOnboarding, PlannerImport, VendorImport, AdminImport, AdminDashboard, SearchResults, BrowseArtists, VendorProfile, demo/). **For Dundy:** brutal cut. Keep ~10 pages: Landing, Login/Signup, Onboarding, Dashboard, InquiryDetail, Calendar, Proposal/Contract/Payment editor, Schedule maker, Trusted Network, Job record.

## 14. UX Feel (Brief §14)
🟡 The "Private Secretary Office" design system in `replit.md` (parchment/ink/brass, Fraunces + Inter, editorial single-column) matches the brief's "secretary I wish I had" vibe. **Keep the design system.** Cut the SaaS-y dashboards.

## 15. Build Order (Brief §15)
- **Phase 1:** ~90% done in this codebase ✅
- **Phase 2:** ~80% done (proposal generator + schedule maker exist; payment uses Square not Stripe; PDF export unclear)
- **Phase 3:** ~70% done (CDI massively over-built; handoff outcome tracking partial; API endpoints comprehensive)
- **Phase 4:** ~20% done (voice dictation only, no action parsing or automation)

---

## Summary for Dundy

**What to KEEP from this codebase (most of the foundation is solid):**
1. Schema: users, inquiries, contracts, schedules, trusted_circle, blocked_dates, proposals, artist_pricing, thread_referrals, agents
2. OpenSign contract integration (`server/openSignService.ts`)
3. Square payment integration (`server/squareClient.ts`, `server/squareRoutes.ts`)
4. Schedule generation (`server/scheduleAI.ts`, `server/timelineParser.ts`)
5. Email system (`server/emailService.ts` — Resend)
6. SMS scaffolding (`server/smsService.ts` — Twilio)
7. The Private Secretary Office design system (parchment/Fraunces/Inter)
8. Object storage + ACL (`server/objectStorage.ts`, `server/objectAcl.ts`)

**What to REBUILD cleaner:**
1. Single onboarding flow (5-min target, not 4 competing flows)
2. Inquiry status state machine matching brief's 11 statuses
3. Handoff as first-class object with explicit outcome columns
4. Trusted Circle with the brief's 10 categories surfaced in UI
5. SMS action-button prompts with magic-link URLs
6. Hybrid proposal template auto-merge

**What to CUT entirely:**
1. IQS scoring (parallel to CDI, redundant)
2. CDI's learning runs / pattern library / AI insights / admin overrides (keep events + composite score only for MVP)
3. ~50 of the 70+ pages (demo, sandbox, terminal, oracle, memo, three separate import pages, etc.)
4. ACP / agent challenges / agentic commerce layer for MVP (Phase 3)

**What's GENUINELY MISSING and needs fresh build:**
1. SMS one-tap action buttons (Send proposal / Route / Decline) with magic-link execution
2. Tentative holds as a distinct calendar state
3. Service-area conflict detection
4. Hybrid proposal: upload template + auto-fill from inquiry data
5. PDF export for schedules (verify before building)
6. Handoff outcome tracking columns
7. Voice action parsing (Phase 4)
8. Natural-language retrieval ("pull up Emily's contract")

**Major architectural decision Dundy needs to make:**
- Brief says "Stripe or payment provider" — current code uses **Square**. Either keep Square (faster, all integration done) or switch to Stripe (brief's default mention). Note: existing app charges a 1% platform fee via Square `appFeeMoney`.
