# Beauvette Secretary

## Overview

Beauvette Secretary is a white-label booking system where bridal artists get their own contact forms without needing to build websites. It's designed to give beauty artists real independence by handling admin work while keeping them in control.

**Core Philosophy:** "We were taught to do it all ourselves. That was never independence, it was exhaustion. This is real independence."

## User Preferences

- Preferred communication style: Simple, everyday language
- Design aesthetic: "Quiet Luxury" - cream (#F9F8F6) background, charcoal (#2D2D2D) or garnet (#5A1F2B) text
- Typography: Playfair Display for titles, Inter for forms
- No em dashes, minimal UI, letterhead feel with double frame borders

## The Secretary Architecture

### Core Flow
1. Artist signs up → gets a unique slug (business name becomes URL)
2. Gets two things:
   - **Direct Link:** beauvette.app/inquire/their-business-name (for emails)
   - **Embed Code:** A form action URL they add to their existing website (invisible, keeps their branding)
3. All inquiries route to their dashboard

### Zero-Login Architecture
- Clients never create accounts
- Everything uses tokenized URLs (thread links, contract signing, invoice payment)
- Client clicks link in email → web form → done

### The Triple Flywheel (Trusted Circle)
- Artist A is booked → refers client to Artist B
- Artist B gets new client → signs up for Secretary → invites Artist C
- Network grows: More artists → More referrals → More bookings → More artists

### What Each Artist Gets
- `/inquire/{slug}` - Their branded inquiry form
- `/inquiry/{threadToken}` - Private thread for managing each inquiry (tokenized, magic link)
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

## Design System

### Colors
- Cream background: #F9F8F6
- Charcoal text: #2D2D2D
- Garnet accent: #5A1F2B

### Typography
- Titles: Playfair Display (serif)
- Body/Forms: Inter (sans-serif)

### UI Patterns
- Bottom-line-only inputs (no borders)
- Generous margins and whitespace
- Chateau Marmont double frame borders for letterhead feel
- Quiet, elegant, professional
