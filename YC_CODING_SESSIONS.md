# Beauvette Secretary - AI Coding Session Highlights
## For YC Spring 2026 Application

---

## Session 1: CDI (Choreography Depth Index) Trust Scoring API

**What was built:** A novel trust scoring algorithm that quantifies human-AI coordination quality for autonomous agent permission systems.

**The problem:** How do you know when an AI agent should operate independently vs. require human approval? We needed a metric based on real coordination patterns.

**Technical approach:**
- Built `server/cdiService.ts` with 4-component weighted scoring algorithm
- Components: Responsiveness (25%), Adaptability (25%), Attention (25%), Reliability (25%)
- Temporal weighting to prioritize recent behavior
- Complexity-adjusted thresholds (simple/medium/complex transactions)

**API endpoints created:**
```
POST /api/calculate-cdi     - Submit behavioral data, get trust score
GET  /api/cdi/samples       - Example calculations across complexity levels
GET  /api/cdi/docs          - Full algorithm documentation
```

**Sample output:**
```json
{
  "score": 92.6,
  "autonomyLevel": "full",
  "components": {
    "responsiveness": { "score": 100, "explanation": "4.0min avg, highly consistent" },
    "adaptability": { "score": 100, "explanation": "aligned in 1 iteration" },
    "attention": { "score": 72.5, "explanation": "75% proactive updates" },
    "reliability": { "score": 98, "explanation": "98% historical completion" }
  },
  "trustSignals": ["Fast, consistent response times", "Quick alignment", "Strong track record"],
  "riskSignals": []
}
```

**Why this matters:** This is infrastructure for the next generation of AI agents - letting them earn autonomy through demonstrated coordination quality rather than hardcoded permissions.

---

## Session 2: Time Display Bug Fix (AM/PM Parsing)

**The bug:** Wedding schedules showed "Ready by 1:00 AM" when the bride meant 1:00 PM.

**Root cause:** The system had "wedding-smart" time interpretation (1-7 = PM, 8-11 = AM), but when times came in 24-hour format (13:00), the parsing broke.

**The fix:** Updated time parsing to detect 24-hour format first, then fall back to wedding-smart interpretation for 12-hour inputs.

**Impact:** Critical for a booking platform - wrong times on wedding day would be catastrophic.

---

## Session 3: Contract Viewing System

**What was built:** Full contract lifecycle management with viewing, printing, and navigation.

**Components:**
- `ViewSignedContract.tsx` - Display signed contracts with signature details
- Added "Contracts" navigation to dashboard (desktop + mobile)
- Print-friendly styling for physical copies

**Architecture decision:** Contracts use magic links (threadToken as bearer token) - no login required for clients to view their signed agreements.

---

## Session 4: Data Recovery After Rollback

**The situation:** After a checkpoint rollback, a signed contract (Laura Fiasche - $3,750 wedding booking) was lost from the database.

**Solution:** Manually recreated the contract record using email proof as source of truth, preserving:
- Service details (Bridesmaid x9 + Extra Artists x2)
- Pricing breakdown
- Signature timestamp (Dec 18, 2025)
- Thread relationship

**Lesson:** Rollbacks affect database state, not just code. Critical business data needs backup verification.

---

## Architecture Highlights

### Zero-Login Magic Links
Every client interaction uses private links:
- `/inquiry/{threadToken}` - Manage booking inquiry
- Contract signing via link
- Invoice payment via link

Clients never create accounts. The link IS the authentication.

### White-Label Design
Zero Beauvette branding visible to clients. Artists get their own branded:
- Inquiry forms: `beauvette.app/inquire/{artist-slug}`
- Embed code for existing websites
- Auto-responder emails

Beauvette is invisible infrastructure.

### The Secretary Architecture
```
Artist signs up → gets unique slug
↓
Two distribution methods:
1. Direct link (for emails)
2. Embed code (for existing website - preserves their branding)
↓
All inquiries route to artist dashboard
↓
Thread-based conversation with magic link access
```

### Square Integration with Platform Fee
```typescript
appFeeMoney: {
  amount: BigInt(Math.round(subtotal * 0.015)), // 1.5% platform fee
  currency: 'USD'
}
```
Artist retains 98.5% of every transaction.

---

## Tech Stack

- **Frontend:** React 18, Vite, Wouter, TanStack Query, Tailwind + shadcn/ui
- **Backend:** Express.js, Node.js
- **Database:** PostgreSQL via Drizzle ORM (Neon serverless)
- **AI:** Google Gemini for chat assistants
- **Payments:** Square OAuth with platform fee
- **Email:** Resend

---

## Key Innovation: CDI for Agent Autonomy

The Choreography Depth Index represents a novel approach to AI agent permission systems:

1. **Observe behavior patterns** - Response times, iteration counts, proactivity
2. **Calculate trust score** - Weighted 4-component algorithm
3. **Adjust autonomy dynamically** - Full/conditional/restricted based on demonstrated coordination
4. **Learn from history** - Temporal weighting prioritizes recent behavior

This lets AI agents earn trust through performance rather than being constrained by static rules.

---

*Beauvette Secretary: "We were taught to do it all ourselves. That was never independence - it was exhaustion. This is real independence."*
