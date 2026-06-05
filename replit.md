# Beauvette Secretary

## Overview

Beauvette Secretary is a completely white-label booking system where bridal artists get their own contact forms without needing to build websites. It's designed to give beauty artists real independence by handling admin work while keeping them in control.

**Core Philosophy:** "We were taught to do it all ourselves. That was never independence—it was exhaustion. This is real independence."

**White-Label Mandate:** Zero Beauvette branding visible to clients. All client-facing emails, forms, and communications show ONLY the artist's brand. The embed code approach keeps artists' existing website branding intact. Beauvette is the invisible infrastructure—clients never see our name.

## User Preferences

- Preferred communication style: Simple, everyday language
- Design aesthetic: "Private Secretary Office" - parchment backgrounds, ink text, brass/oxblood accents
- Typography: Fraunces for headlines, Inter for body
- No em dashes, minimal UI, editorial single-column layout, underlined links

## Standing Database Rule (permanent)

The live app uses NEON_DATABASE_URL, NOT DATABASE_URL. Before any schema change, migration, database check, or verification:

1. Confirm the live app DB host/provider first, without exposing secrets.
2. Apply changes only to the same DB the running app uses (Neon).
3. Avoid db:push if it targets DATABASE_URL or proposes destructive rename/drop changes.
4. Use additive/idempotent SQL only: CREATE TABLE IF NOT EXISTS, ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
5. Restart the app and verify it can read/write the new table/column.
6. Add or update startup self-healing migrations (server/index.ts) when appropriate.
7. Never rename or drop tables without explicit approval.

## The Secretary Architecture

### Core Flow
1. Artist signs up → gets a unique slug (business name becomes URL)
2. Gets two things:
   - **Direct Link:** beauvette.app/inquire/their-business-name (for emails)
   - **Embed Code:** A form action URL they add to their existing website (invisible, keeps their branding)
3. All inquiries route to their dashboard

### Zero-Login Architecture
- Clients never create accounts
- Everything uses private links (thread links, contract signing, invoice payment)
- Client clicks link in email → web form → done

### The Triple Flywheel (Trusted Circle)
- Artist A is booked → refers client to Artist B
- Artist B gets new client → signs up for Secretary → invites Artist C
- Network grows: More artists → More referrals → More bookings → More artists

### What Each Artist Gets
- `/inquire/{slug}` - Their branded inquiry form
- `/inquiry/{threadToken}` - Private thread for managing each inquiry (magic link)
- `/admin/{slug}` - Their dashboard
- `/admin/{slug}/settings` - Auto-responder, info sheet, pricing
- `/admin/{slug}/calendar` - Block dates
- `/admin/{slug}/circle` - Manage referral network

### Progressive Onboarding
When artist gets first booking, they see in-thread setup for:
- Connect Square (OAuth)
- Contract template
- Pretty links

### Data Isolation
All queries scoped by artist_id - artists only see their own data.

## Technical Architecture

### Frontend
- React 18 with Vite
- Wouter for routing
- TanStack Query for data fetching
- Tailwind CSS with shadcn/ui for styling
- Framer Motion for animations

### Backend
- Express.js and Node.js
- PostgreSQL via Drizzle ORM
- Neon Database (serverless provider)

### Key Routes
- Thread token acts as bearer token (magic link) - sent only to artist's email for inquiry access
- State transitions: Can't modify terminal states (declined, completed, expired); accept only works from pending

## External Dependencies

- **Payment Processing:** Square (1% platform fee via appFeeMoney)
- **AI Integration:** Google Gemini AI for chat assistants
- **E-Signature:** OpenSign API (requires OPENSIGN_API_TOKEN)
- **Email:** Resend for notifications
- **Database:** Neon Database (serverless PostgreSQL)

## Design System - Private Secretary Office Theme

### Color Palette (CSS Variables)
- `--bg`: hsl(36 24% 95%) - Parchment/bone background
- `--surface`: hsl(36 18% 93%) - Deeper parchment for cards
- `--surface-2`: hsl(36 14% 90%) - Panels
- `--ink`: hsl(0 0% 10%) - Near-black ink text
- `--muted-ink`: hsl(0 0% 23%) - Warm charcoal
- `--faint-ink`: hsl(0 0% 35%) - Subtle text
- `--brass`: hsl(42 33% 57%) - Aged brass accent
- `--oxblood`: hsl(0 50% 24%) - Focus rings only
- `--hairline`: hsl(36 10% 84%) - Borders

### Typography
- Headlines: Fraunces (serif) with tracking-tight
- Body/Forms: Inter (sans-serif)

### UI Patterns
- Estate container: max-width 1100px, px-6 sm:px-10
- Estate prose: max-width 70ch, editorial width
- Hairline borders, no heavy shadows
- Underlined links by default (editorial style)
- No SaaS grids, no gradient backgrounds
- Motion: Only opacity + translateY 6-8px, duration 0.25-0.35s, easeOut

### Button Variants
- Primary: bg-ink text-bg (dark on light)
- Secondary: border border-hairline hover:bg-surface
- Quiet: text-ink underline (private office feel)

### Focus Style
- focus-visible:ring-1 ring-oxblood/70 (keyboard only)

## Agentic Commerce Layer (Toile Coordination Engine)

### Overview
The platform is fully agent-addressable. AI agents (like OpenClaw) can discover, query, and transact through structured APIs. CDI (Choreography Depth Index) governs what agents can do based on demonstrated coordination quality.

### A2A Agent Card
- Served at `/.well-known/ai-agent` (JSON-LD)
- Describes all platform capabilities, authentication, trust model
- Follows Agent-to-Agent (A2A) protocol for discovery

### Agent Authentication
- Self-service registration: POST /api/agent/register
- Bearer token API keys (hashed, rotatable)
- All actions audit-logged with CDI score at time of action

### CDI-Gated Autonomy Levels
- **Restricted (CDI 0-49):** Read-only - availability, pricing, CDI lookup, artist discovery, referrals
- **Conditional (CDI 50-79):** Read + Write - submit inquiries, place holds, read schedules, proof of service
- **Full (CDI 80-100):** All actions including contracts and invoices

### Agent API Endpoints
- `GET /api/agent/manifest` - Tool definitions for AI agents
- `GET /api/agent/me` - Agent profile + capabilities
- `GET /api/agent/artists` - Discover artists by service/location/CDI
- `GET /api/agent/availability/:slug` - Instant availability check
- `GET /api/agent/cdi/:slug` - CDI trust verification
- `GET /api/agent/pricing/:slug` - Pricing & info sheet
- `GET /api/agent/referrals/:slug` - Trusted Circle referrals
- `POST /api/agent/inquiries` - Submit booking inquiry
- `POST /api/agent/inquiries/:id/hold` - Place soft hold
- `GET /api/agent/proof/:bookingId` - Proof of service (ACP escrow)
- `GET /api/agent/schedule/:token` - Day-of schedule access
- Webhook management: POST/GET/DELETE /api/agent/webhooks

### Key Files
- `server/agentRoutes.ts` - All agent endpoints, middleware, A2A card
- `server/cdiService.ts` - CDI scoring algorithm
- `server/cdiEngine.ts` - CDI behavioral event engine
- `server/acpHandler.ts` - ACP payment endpoints + coordination challenge system
- Database tables: agents, agent_api_keys, agent_webhooks, agent_action_logs, agent_events, acp_checkout_sessions, agent_challenges

### ACP Payment Flow
1. Agent creates checkout session: POST /api/acp/checkout (requires CDI >= 50)
2. Square payment link generated with 1.5% platform fee
3. Client pays via shared payment token (zero-login)
4. Agent marks complete: POST /api/acp/complete (verifies Square payment, triggers CDI boost)
5. Proof-of-service hash generated for escrow release

### Coordination Challenge (Proof of Work)
- Agents request puzzles: POST /api/agent/challenge
- 3 puzzle types: travel_buffer, schedule_optimization, conflict_resolution
- Correct solutions earn CDI points + TOILE_VERIFIED_ bearer tokens
- Failed solutions don't penalize but don't reward
- Makes spam expensive: each challenge requires industry-specific reasoning
