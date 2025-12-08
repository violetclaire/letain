# Beauvette (Toile Platform)

## Overview

Beauvette is a beauty services marketplace connecting clients, beauty vendors/artists, wedding planners, and administrators for special event bookings. The platform aims to facilitate service booking, manage vendor profiles, coordinate schedules, and enable communication. It also focuses on converting "invisible labor" into structured reputation and ensuring safe, reliable interactions through a dual-layer AI architecture.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions

The platform uses a design language inspired by Marie Antoinette aesthetics. The color palette is based on "Plum Check" by Claremont (from Lily Allen's NYC apartment), featuring: Ivory/Cream (#F7F4EF, #FAF8F5), Dusty Plum/Lavender (#A8929C), Sage/Olive Green (#9A9472), and Brown/Taupe (#6B5A50). Typography combines Playfair Display (serif for headers) and Inter (sans-serif for body text). The landing page features an elevator-style split panel animation with a plum check pattern.

### Technical Implementations

Beauvette is a full-stack TypeScript application. The frontend uses React 18 with Vite, Wouter for routing, TanStack Query for data fetching, Tailwind CSS with shadcn/ui for styling, and Framer Motion for animations. The backend is built with Express.js and Node.js. PostgreSQL is used for data persistence via Drizzle ORM, with Neon Database as the serverless provider.

**Key Features:**

*   **Toile Architecture Philosophy:**
    *   **Memory Layer:** Captures raw coordination events (episodic memory) and transforms them into vendor-specific trust signals (semantic memory) to quantify "invisible labor." This includes AI-powered analysis of business chat and tracking coordination events.
    *   **Safety Layer:** Implements a Mental Loop Simulation using CDI (Choreography Depth Index) scores to predict coordination failure, detect risk, and ensure safe agent behavior in multi-party workflows. It utilizes the HACO (Human-AI Collaborative Uncertainty Quantification) framework for sentiment analysis and IQS (Interaction Quality Scoring) for early warning detection of problematic client patterns.
*   **Authentication:** Replit Auth (OpenID Connect) with role-based access control (client, artist, planner, admin) and a PostgreSQL session store.
*   **Booking Management:** Facilitates booking services, managing vendor availability, and provides editing functionality for existing bookings.
*   **Messaging:** Includes direct messaging between parties and AI-powered chat assistants for vendors (Gemini AI integration).
*   **Platform Safety:** Vendor verification, chat restrictions (only between confirmed bookings), and a profile reporting system.
*   **Choreography Depth Index (CDI):** A system to measure coordination complexity and detect workflow risk based on various events (negative messages, late payments, cancellations, support cases, response delays), scoring from 0-100 (higher = more coordination depth/complexity) with defined risk levels.
*   **Admin Dashboard:** Provides tools for managing users, bookings, and monitoring CDI scores.

### System Design Choices

*   **API Design:** RESTful API with conventional CRUD endpoints organized by resource.
*   **Data Storage:** PostgreSQL database with Drizzle ORM for type-safe queries. Uses UUID v4 for primary keys and JSONB columns for flexible data storage (e.g., specialties, portfolio URLs).
*   **Multi-tenant architecture** with a role-based user model.
*   **Environment Variables:** Relies on `DATABASE_URL`, `SESSION_SECRET`, and `REPL_ID`, along with PostgreSQL-specific variables.

## External Dependencies

*   **Payment Processing:** Stripe for handling payments.
*   **SMS Messaging:** Twilio for sending SMS notifications (booking reminders, confirmations, etc.).
*   **AI Integration:** Google Gemini AI (via Replit AI Integrations) for chat assistants and sentiment analysis within the CDI system.
*   **Authentication:** Replit Auth (OpenID Connect) for user authentication.
*   **Database:** Neon Database (serverless PostgreSQL provider).
*   **Voice Input:** Browser Web Speech API (client-side only).