# Beauvette - Technical Specification

## Platform Overview

**Beauvette** is a B2B2C beauty services marketplace connecting **clients** (brides, event hosts), **beauty artists/vendors** (makeup artists, hairstylists), **wedding planners**, and **platform administrators** for special event bookings.

The platform focuses on:
- Facilitating service discovery and booking
- Managing vendor profiles and availability
- Coordinating multi-party event workflows
- Converting "invisible labor" into structured reputation signals
- Ensuring safe, reliable interactions through AI-powered monitoring

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, TypeScript |
| **Routing** | Wouter |
| **State/Data** | TanStack Query |
| **Styling** | Tailwind CSS, shadcn/ui components |
| **Animations** | Framer Motion |
| **Backend** | Express.js, Node.js, TypeScript |
| **Database** | PostgreSQL (Neon serverless) |
| **ORM** | Drizzle ORM |
| **Authentication** | Email/Password + Replit OAuth (OpenID Connect) |
| **Payments** | Stripe Connect |
| **SMS** | Twilio |
| **Email** | Resend |
| **AI** | Google Gemini |
| **E-Signatures** | OpenSign API |
| **Object Storage** | Replit Object Storage (GCS-backed) |

---

## User Roles

| Role | Description |
|------|-------------|
| **Client** | Books beauty services for events (weddings, photoshoots, etc.) |
| **Artist** | Beauty vendors who provide services (makeup, hair, nails, etc.) |
| **Planner** | Wedding/event planners who coordinate between clients and artists |
| **Admin** | Platform administrators for verification, moderation, analytics |

---

## Core Database Tables

### User Management
| Table | Purpose |
|-------|---------|
| `users` | All users with role-based access, auth credentials, Stripe account IDs, notification preferences |
| `sessions` | PostgreSQL session store for authentication |
| `client_intakes` | Onboarding data from clients (event type, date, budget, preferences) |
| `artist_intakes` | Onboarding data from artists (experience, service types, pricing) |
| `planner_intakes` | Onboarding data from planners (company, specialization, network size) |

### Vendor Profiles
| Table | Purpose |
|-------|---------|
| `artist_profiles` | Extended vendor profiles (bio, portfolio, pricing, verification status, SLA targets, Google Calendar ID) |
| `artist_services` | Individual services offered by artists with pricing |
| `availability` | Vendor availability calendar slots |

### Booking Flow
| Table | Purpose |
|-------|---------|
| `inquiries` | Lead management - client requests before conversion to bookings |
| `bookings` | Confirmed service appointments with dates, locations, payment status |
| `proposals` | Formal proposals sent to clients with pricing and terms |
| `contracts` | Formal agreements with package details, amounts, e-signature tracking |
| `payments` | Payment records tied to contracts with Stripe integration |

### Communication
| Table | Purpose |
|-------|---------|
| `messages` | In-app messaging between parties with sentiment scoring |
| `chat_invites` | Invitation tokens for clients to join booking chats |
| `client_contacts` | CRM-style contact records for vendors |

### Day-of Coordination
| Table | Purpose |
|-------|---------|
| `schedules` | Day-of event schedules with shareable links |
| `schedule_items` | Individual timeline items within schedules |

### Analytics & Safety
| Table | Purpose |
|-------|---------|
| `cdi_scores` | Choreography Depth Index scores per user |
| `cdi_events` | Individual events contributing to CDI calculation |
| `cdi_thresholds` | Configurable risk thresholds for CDI |
| `iqs_lead_scores` | Interaction Quality Scores for lead assessment |
| `support_cases` | Customer support tickets |
| `audit_logs` | Full audit trail of all platform actions |

---

## Unique AI Architecture: "Toile"

The Toile architecture is a dual-layer AI system designed to quantify invisible labor and ensure platform safety.

### 1. Memory Layer (Invisible Labor Tracking)

**Purpose**: Capture and quantify the coordination work that vendors perform but that typically goes unrecognized.

**Components**:
- **Episodic Memory**: Raw coordination events (messages, calls, follow-ups, reschedules)
- **Semantic Memory**: Vendor-specific trust signals derived from event patterns
- **Business Chat Analysis**: AI-powered sentiment and task extraction from messages

**Tracked Metrics**:
- Response time to inquiries
- Message quality and helpfulness
- Problem-solving instances
- Client accommodation efforts
- Follow-through on commitments

### 2. Safety Layer (CDI - Choreography Depth Index)

**Purpose**: Predict coordination complexity and detect potential workflow failures before they occur.

**Scoring System** (0-100):

| Score Range | Risk Level | Description |
|-------------|------------|-------------|
| 0-20 | Low | Smooth coordination, no concerns |
| 21-40 | Medium | Minor issues, monitoring recommended |
| 41-60 | High | Attention needed, potential problems |
| 61-80 | Critical | Intervention required |
| 81-100 | Severe | Immediate escalation needed |

**CDI Event Types**:
- `negative_message` - Negative sentiment detected in communications
- `late_payment` - Payment deadline missed
- `cancellation` - Booking or service cancelled
- `reschedule` - Date/time changes requested
- `support_case` - Support ticket opened
- `response_delay` - Slow response to client/vendor
- `contract_dispute` - Disagreement over contract terms
- `no_show` - Party failed to appear

**Dynamic Weighting**:
CDI uses adaptive learning to adjust event weights based on:
- Historical outcomes
- Vendor-specific patterns
- Event recency
- Cumulative impact

### 3. IQS (Interaction Quality Scoring)

**Purpose**: Early warning system for problematic client patterns.

**Factors Analyzed**:
- Lead quality indicators
- Communication patterns
- Red flag detection (unrealistic expectations, pricing disputes)
- Historical outcome correlation
- Vendor rating integration

---

## Key Features by Role

### For Artists/Vendors

| Feature | Description |
|---------|-------------|
| **Inquiry Inbox** | One-tap actions (Confirm/Hold/Propose/Decline) with SLA countdown timers |
| **AI Chat Assistant** | Gemini-powered helper for drafting responses and managing communications |
| **Calendar Integration** | Two-way Google Calendar sync with availability blocking |
| **Smart Buttons** | Quick actions for sending proposals, contracts, and payment requests |
| **Day-of Schedules** | Create shareable timeline schedules for event day coordination |
| **Referral System** | Decline inquiries while referring trusted colleagues |
| **Public Booking Page** | Shareable calendar page for direct client bookings |
| **Responsive Badge** | Earned through consistent fast response times |
| **Portfolio Management** | Upload photos, link social media, showcase work |
| **Contract Templates** | Reusable contract templates with e-signature integration |

### For Clients

| Feature | Description |
|---------|-------------|
| **Vendor Discovery** | Browse verified beauty artists by specialty and location |
| **Booking Flow** | Streamlined Inquiry → Proposal → Contract → Payment workflow |
| **Event Dashboard** | Central view of all booked vendors and schedules |
| **Direct Messaging** | Secure communication with vendors |
| **Contract Signing** | Electronic signature for contracts |
| **Payment Portal** | Secure payment processing via Stripe |

### For Planners

| Feature | Description |
|---------|-------------|
| **Multi-Vendor Coordination** | Manage multiple artists across events |
| **Thread Access** | Magic link access to booking conversations |
| **Overview Dashboard** | See all events, vendors, and statuses at a glance |
| **Import Tools** | Bulk import existing client and booking data |

### For Admins

| Feature | Description |
|---------|-------------|
| **User Management** | Approve/suspend vendors, manage user roles |
| **Vendor Verification** | Review and approve vendor profiles |
| **CDI Monitoring** | Platform-wide risk dashboard with alerts |
| **Audit Logs** | Complete activity history for compliance |
| **Import Tools** | Bulk data import capabilities |
| **Analytics** | Platform usage and performance metrics |

---

## API Design

RESTful API with 100+ endpoints organized by resource:

### Authentication
```
POST   /api/auth/signup           - Create new account
POST   /api/auth/login            - Email/password login
POST   /api/auth/logout           - End session
POST   /api/auth/forgot-password  - Request password reset
POST   /api/auth/reset-password   - Reset password with token
GET    /api/auth/user             - Get current user
```

### Users
```
GET    /api/users/:id             - Get user by ID
PATCH  /api/users/:id             - Update user profile
PATCH  /api/users/:id/role        - Update user role (admin only)
DELETE /api/users/:id             - Delete user account
```

### Inquiries
```
GET    /api/inquiries             - List inquiries for vendor
POST   /api/inquiries             - Create new inquiry
GET    /api/inquiries/:id         - Get inquiry details
PATCH  /api/inquiries/:id         - Update inquiry
POST   /api/inquiries/:id/confirm - Confirm inquiry to booking
POST   /api/inquiries/:id/hold    - Place inquiry on hold
POST   /api/inquiries/:id/decline - Decline inquiry
POST   /api/inquiries/:id/decline-with-referrals - Decline and refer
```

### Bookings
```
GET    /api/bookings              - List bookings
POST   /api/bookings              - Create booking
GET    /api/bookings/:id          - Get booking details
PATCH  /api/bookings/:id          - Update booking
DELETE /api/bookings/:id          - Cancel booking
```

### Contracts & Payments
```
GET    /api/contracts             - List contracts
POST   /api/contracts             - Create contract
POST   /api/contracts/:id/send    - Send for signature
GET    /api/payments              - List payments
POST   /api/payments              - Create payment request
```

### Messaging
```
GET    /api/messages/:bookingId   - Get messages for booking
POST   /api/messages              - Send message
POST   /api/ai-chat               - AI assistant chat
```

### Vendor Profiles
```
GET    /api/artist-profiles       - List verified artists
GET    /api/vendor-profile/:id    - Get vendor profile
PATCH  /api/artist-profiles/:id   - Update profile
```

### Schedules
```
GET    /api/schedules             - List schedules
POST   /api/schedules             - Create schedule
GET    /api/schedules/:id         - Get schedule
PATCH  /api/schedules/:id         - Update schedule
GET    /api/public/schedule/:token - Public schedule view
```

### Stripe Integration
```
POST   /api/stripe/connect        - Create Stripe Connect account
POST   /api/stripe/payment-link   - Create payment link
POST   /api/stripe/webhook        - Stripe webhook handler
```

### Calendar Integration
```
GET    /api/calendar/events       - Get calendar events
POST   /api/calendar/sync         - Sync with Google Calendar
```

### Admin
```
GET    /api/admin/users           - List all users
GET    /api/admin/pending-vendors - Vendors awaiting approval
POST   /api/admin/verify/:id      - Approve/reject vendor
GET    /api/admin/cdi-scores      - CDI scores dashboard
```

---

## Security Features

### Authentication & Authorization
- **Rate Limiting**: 5 attempts per 15 minutes on auth endpoints
- **Password Requirements**: Minimum 8 characters, 1 uppercase, 1 number
- **Session Management**: PostgreSQL-backed session store with secure cookies
- **Role-Based Access**: Middleware checks for role permissions

### Data Protection
- **Vendor Verification**: Manual approval required before search visibility
- **Chat Restrictions**: Messaging only allowed between confirmed bookings
- **Profile Reporting**: Users can flag suspicious accounts
- **Audit Trail**: All actions logged with actor, timestamp, and changes

### Privacy
- **CDI Consent**: Users can opt-out of AI behavior analysis
- **Data Deletion**: Full account deletion with cascade
- **Email Enumeration Protection**: Consistent responses on password reset

---

## External Integrations

### Stripe Connect
- Split payments between platform and vendors
- Vendor onboarding flow
- Payment links for invoicing
- Webhook handling for payment status

### Twilio
- SMS booking confirmations
- Reminder notifications
- Two-way messaging support

### Resend
- Transactional emails (confirmations, contracts, invoices)
- Branded email templates
- Password reset emails

### Google Calendar
- Two-way sync for vendor availability
- Automatic event creation on booking confirmation
- Calendar blocking for held dates

### Google Gemini AI
- Chat assistant for vendors
- Message sentiment analysis
- Task extraction from communications
- Smart response suggestions

### OpenSign
- Electronic contract signing
- Signature tracking
- Signed document storage

### Replit Object Storage
- Profile photo uploads
- Portfolio image storage
- Contract PDF storage
- Info sheet attachments

---

## Design System

### Aesthetic
Marie Antoinette / French Rococo inspired design language emphasizing elegance and sophistication.

### Color Palette
Based on "Plum Check" by Claremont (from Lily Allen's NYC apartment):

| Color | Hex Code | Usage |
|-------|----------|-------|
| Ivory/Cream | `#F7F4EF`, `#FAF8F5` | Backgrounds |
| Dusty Plum | `#5A1F2B` | Accents, headers |
| Sage Green | `#9A9472` | Secondary actions |
| Brown/Taupe | `#6B5A50` | Text, borders |
| Pink | `#C9A961` | Highlights |

### Typography
| Type | Font | Usage |
|------|------|-------|
| Headers | Playfair Display | Page titles, section headers |
| Body | Inter | Body text, buttons, forms |
| Script | Custom | Logo, decorative elements |

### Components
Built on shadcn/ui with custom styling:
- Cards with subtle shadows and cream backgrounds
- Plum check pattern for decorative headers
- Elegant form inputs with understated borders
- Toast notifications with brand colors

---

## Deployment

### Environment Variables Required
```
DATABASE_URL          - PostgreSQL connection string
SESSION_SECRET        - Session encryption key
STRIPE_SECRET_KEY     - Stripe API key
STRIPE_PUBLISHABLE_KEY - Stripe public key
TWILIO_ACCOUNT_SID    - Twilio account
TWILIO_AUTH_TOKEN     - Twilio auth
TWILIO_PHONE_NUMBER   - Twilio phone
OPENSIGN_API_TOKEN    - OpenSign e-signature
```

### Build & Deploy
```bash
npm run build         - Build frontend and backend
npm run db:push       - Sync database schema
npm start             - Start production server
```

---

## Version History

- **Current Version**: 1.0.0
- **Last Updated**: December 2025
- **Status**: Production Ready

---

*Document generated from Beauvette codebase analysis.*
