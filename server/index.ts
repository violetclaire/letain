import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import { registerRoutes } from "./routes";
import { registerAgentRoutes } from "./agentRoutes";
import { registerAcpRoutes } from "./acpHandler";
import { startCronJobs } from "./cronJobs";
import { startScheduledEmailJob } from './scheduledEmailJob';
import { db } from "./db";
import { sql } from "drizzle-orm";

// Ensure database schema has required columns (runs on startup)
async function ensureDatabaseSchema() {
  console.log("[DB] Starting schema migration...");
  
  const migrations = [
    { name: 'inquiries.sentiment', sql: sql`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS sentiment text` },
    { name: 'inquiries.sentiment_score', sql: sql`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS sentiment_score integer` },
    { name: 'inquiries.sentiment_analysis', sql: sql`ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS sentiment_analysis jsonb` },
    { name: 'artist_profiles.login_code', sql: sql`ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS login_code varchar(255)` },
    { name: 'artist_profiles.login_code_expires_at', sql: sql`ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS login_code_expires_at timestamp` },
    { name: 'schedule_appointments.inspiration_photos', sql: sql`ALTER TABLE schedule_appointments ADD COLUMN IF NOT EXISTS inspiration_photos text[]` },

    // --- Handoff accountability slice (YC submission session) ---
    { name: 'thread_referrals.urgency_hours', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS urgency_hours integer` },
    { name: 'thread_referrals.payment_secured_status', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS payment_secured_status text` },
    { name: 'thread_referrals.contract_attached_id', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS contract_attached_id varchar(255)` },
    { name: 'thread_referrals.scope_summary', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS scope_summary text` },
    { name: 'thread_referrals.helper_reported_outcome', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS helper_reported_outcome text` },
    { name: 'thread_referrals.helper_paid_at', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS helper_paid_at timestamp` },
    { name: 'thread_referrals.helper_payment_note', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS helper_payment_note text` },
    { name: 'thread_referrals.helper_private_note', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS helper_private_note text` },
    { name: 'thread_referrals.helper_outcome_reported_at', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS helper_outcome_reported_at timestamp` },
    { name: 'thread_referrals.helper_wants_to_share_advice', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS helper_wants_to_share_advice boolean DEFAULT false` },
    { name: 'thread_referrals.helper_advice_draft', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS helper_advice_draft text` },
    { name: 'thread_referrals.originator_advice_prompted_at', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS originator_advice_prompted_at timestamp` },
    { name: 'thread_referrals.originator_advice_consent', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS originator_advice_consent text` },
    { name: 'thread_referrals.originator_advice_consent_at', sql: sql`ALTER TABLE thread_referrals ADD COLUMN IF NOT EXISTS originator_advice_consent_at timestamp` },
    { name: 'trusted_circle.quietly_removed', sql: sql`ALTER TABLE trusted_circle ADD COLUMN IF NOT EXISTS quietly_removed boolean DEFAULT false` },
    { name: 'trusted_circle.removed_at', sql: sql`ALTER TABLE trusted_circle ADD COLUMN IF NOT EXISTS removed_at timestamp` },
    { name: 'trusted_circle.removed_reason', sql: sql`ALTER TABLE trusted_circle ADD COLUMN IF NOT EXISTS removed_reason text` },

    // --- Inbound SMS (Step 1: headless coordination) ---
    { name: 'inbound_sms_messages.table', sql: sql`CREATE TABLE IF NOT EXISTS inbound_sms_messages (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      message_sid varchar UNIQUE NOT NULL,
      from_number text NOT NULL,
      to_number text NOT NULL,
      body text NOT NULL DEFAULT '',
      matched_user_id varchar,
      matched_contact_id varchar,
      matched_inquiry_id varchar,
      matched_referral_id varchar,
      match_status text NOT NULL DEFAULT 'unmatched',
      trust_event_id varchar,
      raw_payload jsonb,
      received_at timestamp NOT NULL DEFAULT now(),
      created_at timestamp NOT NULL DEFAULT now()
    )` },
    // Context-based matching (additive — safe on tables that already exist)
    { name: 'inbound_sms_messages.match_confidence', sql: sql`ALTER TABLE inbound_sms_messages ADD COLUMN IF NOT EXISTS match_confidence integer` },
    { name: 'inbound_sms_messages.suggested_matches', sql: sql`ALTER TABLE inbound_sms_messages ADD COLUMN IF NOT EXISTS suggested_matches jsonb` },

    // --- Square OAuth state storage (additive, optional Square setup support) ---
    { name: 'oauth_states.table', sql: sql`CREATE TABLE IF NOT EXISTS oauth_states (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      state varchar UNIQUE NOT NULL,
      user_id varchar NOT NULL,
      artist_slug text,
      return_base_url text,
      callback_url text,
      provider text NOT NULL DEFAULT 'square',
      expires_at timestamp NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )` },

    // --- Contract Vault: operator-managed metadata (additive only) ---
    { name: 'contracts.contract_url', sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_url text` },
    { name: 'contracts.contract_source', sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_source text` },
    { name: 'contracts.contract_notes', sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_notes text` },
    { name: 'contracts.payment_status', sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'payment_not_requested'` },
    { name: 'contracts.payment_method', sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_method text` },
    { name: 'contracts.amount_paid', sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS amount_paid integer` },
    { name: 'contracts.payment_due_date', sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_due_date text` },
    { name: 'contracts.payment_link', sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_link text` },
    { name: 'contracts.payment_notes', sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_notes text` },

    // --- Assistant delivery preferences + unified prompt queue (headless layer) ---
    { name: 'artist_profiles.preferred_delivery_channel', sql: sql`ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS preferred_delivery_channel text DEFAULT 'email'` },
    { name: 'artist_profiles.assistant_phone_enabled', sql: sql`ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS assistant_phone_enabled boolean DEFAULT false` },
    { name: 'artist_profiles.assistant_email_enabled', sql: sql`ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS assistant_email_enabled boolean DEFAULT false` },
    { name: 'artist_profiles.assistant_quiet_hours_start', sql: sql`ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS assistant_quiet_hours_start integer` },
    { name: 'artist_profiles.assistant_quiet_hours_end', sql: sql`ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS assistant_quiet_hours_end integer` },
    { name: 'artist_profiles.assistant_timezone', sql: sql`ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS assistant_timezone text` },
    { name: 'artist_profiles.assistant_prompt_mode', sql: sql`ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS assistant_prompt_mode text DEFAULT 'immediate'` },
    { name: 'artist_profiles.assistant_dry_run', sql: sql`ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS assistant_dry_run boolean DEFAULT false` },
    { name: 'assistant_prompts.table', sql: sql`CREATE TABLE IF NOT EXISTS assistant_prompts (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      operator_id varchar NOT NULL,
      inquiry_id varchar,
      referral_id varchar,
      contact_id varchar,
      prompt_type text NOT NULL,
      title text NOT NULL,
      body text NOT NULL,
      recommended_actions jsonb,
      delivery_channel text,
      delivery_status text NOT NULL DEFAULT 'pending',
      delivery_error text,
      created_at timestamp NOT NULL DEFAULT now(),
      sent_at timestamp,
      acted_on_at timestamp
    )` },
    { name: 'route_targets.table', sql: sql`CREATE TABLE IF NOT EXISTS route_targets (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      operator_id varchar NOT NULL,
      name text NOT NULL,
      email text,
      phone text,
      role_label text,
      tags text[],
      capabilities text[],
      is_internal boolean DEFAULT false,
      is_agent boolean DEFAULT false,
      active boolean DEFAULT true,
      preferred boolean DEFAULT false,
      availability_source text,
      trusted_circle_id varchar,
      linked_user_id varchar,
      notes text,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )` },
    { name: 'inquiry_routes.table', sql: sql`CREATE TABLE IF NOT EXISTS inquiry_routes (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      operator_id varchar NOT NULL,
      inquiry_id varchar,
      route_target_id varchar NOT NULL,
      route_type text NOT NULL DEFAULT 'referral',
      status text NOT NULL DEFAULT 'draft',
      target_label_snapshot text,
      preflight_channel text,
      preflight_message text,
      preflight_sent_at timestamp,
      response_raw text,
      responded_at timestamp,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )` },
    { name: 'inquiry_route_candidates.table', sql: sql`CREATE TABLE IF NOT EXISTS inquiry_route_candidates (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      operator_id varchar NOT NULL,
      inquiry_id varchar NOT NULL,
      route_target_id varchar NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      match_score integer,
      match_reasons jsonb,
      matched_capabilities jsonb,
      matched_tags jsonb,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )` },
    { name: 'inquiry_route_candidates.unique', sql: sql`CREATE UNIQUE INDEX IF NOT EXISTS inquiry_route_candidates_operator_inquiry_target_unique
      ON inquiry_route_candidates (operator_id, inquiry_id, route_target_id)` },
    { name: 'coordination_paths.table', sql: sql`CREATE TABLE IF NOT EXISTS coordination_paths (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      operator_id varchar NOT NULL,
      inquiry_id varchar NOT NULL,
      route_target_id varchar,
      candidate_route_id varchar,
      status text NOT NULL DEFAULT 'active',
      context_captured boolean NOT NULL DEFAULT false,
      timing_constraints jsonb DEFAULT '{}'::jsonb,
      authority_state text NOT NULL DEFAULT 'unclear',
      availability_state text NOT NULL DEFAULT 'unknown',
      handoff_state text NOT NULL DEFAULT 'not_started',
      escalation_state text NOT NULL DEFAULT 'none',
      recovery_capacity text NOT NULL DEFAULT 'unknown',
      commitment_state text NOT NULL DEFAULT 'uncommitted',
      outcome_verification_state text NOT NULL DEFAULT 'not_ready',
      path_risk jsonb DEFAULT '[]'::jsonb,
      signal_provenance jsonb DEFAULT '[]'::jsonb,
      metadata jsonb DEFAULT '{}'::jsonb,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )` },
    { name: 'coordination_paths.operator_inquiry_idx', sql: sql`CREATE INDEX IF NOT EXISTS coordination_paths_operator_inquiry_idx
      ON coordination_paths (operator_id, inquiry_id)` },
    { name: 'coordination_paths.route_target_idx', sql: sql`CREATE INDEX IF NOT EXISTS coordination_paths_route_target_idx
      ON coordination_paths (route_target_id)` },
    { name: 'coordination_events.table', sql: sql`CREATE TABLE IF NOT EXISTS coordination_events (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      path_id varchar NOT NULL,
      operator_id varchar NOT NULL,
      inquiry_id varchar NOT NULL,
      event_type text NOT NULL,
      event_source text NOT NULL DEFAULT 'manual',
      summary text NOT NULL,
      signal_provenance jsonb DEFAULT '[]'::jsonb,
      metadata jsonb DEFAULT '{}'::jsonb,
      created_at timestamp NOT NULL DEFAULT now()
    )` },
    { name: 'coordination_events.path_idx', sql: sql`CREATE INDEX IF NOT EXISTS coordination_events_path_idx
      ON coordination_events (path_id)` },
    { name: 'coordination_events.operator_inquiry_idx', sql: sql`CREATE INDEX IF NOT EXISTS coordination_events_operator_inquiry_idx
      ON coordination_events (operator_id, inquiry_id)` },
    { name: 'coordination_assessments.table', sql: sql`CREATE TABLE IF NOT EXISTS coordination_assessments (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      path_id varchar NOT NULL,
      operator_id varchar NOT NULL,
      inquiry_id varchar NOT NULL,
      permission_decision text NOT NULL,
      confidence integer NOT NULL,
      risk_factors jsonb DEFAULT '[]'::jsonb,
      missing_signals jsonb DEFAULT '[]'::jsonb,
      recommended_next_action text NOT NULL,
      explanation text NOT NULL,
      signal_provenance jsonb DEFAULT '[]'::jsonb,
      human_judgment_required boolean NOT NULL DEFAULT false,
      escalation_reasons jsonb DEFAULT '[]'::jsonb,
      outcome_verification text NOT NULL DEFAULT 'NOT_READY',
      created_at timestamp NOT NULL DEFAULT now()
    )` },
    { name: 'coordination_assessments.path_idx', sql: sql`CREATE INDEX IF NOT EXISTS coordination_assessments_path_idx
      ON coordination_assessments (path_id)` },
    { name: 'coordination_assessments.operator_inquiry_idx', sql: sql`CREATE INDEX IF NOT EXISTS coordination_assessments_operator_inquiry_idx
      ON coordination_assessments (operator_id, inquiry_id)` },
    { name: 'inquiry_internal_notes.table', sql: sql`CREATE TABLE IF NOT EXISTS inquiry_internal_notes (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      operator_id varchar NOT NULL,
      inquiry_id varchar NOT NULL,
      body text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )` },
    { name: 'inquiry_internal_notes.unique', sql: sql`CREATE UNIQUE INDEX IF NOT EXISTS inquiry_internal_notes_operator_inquiry_unique
      ON inquiry_internal_notes (operator_id, inquiry_id)` },
    { name: 'inquiry_responses.table', sql: sql`CREATE TABLE IF NOT EXISTS inquiry_responses (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      operator_id varchar NOT NULL,
      inquiry_id varchar NOT NULL,
      response_type text NOT NULL,
      channel text DEFAULT 'email',
      personal_note text,
      body text NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      sent_at timestamp,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )` },

    // --- Schedule Drafts: Google-Docs-style editable table builder (additive, isolated) ---
    { name: 'schedule_drafts.table', sql: sql`CREATE TABLE IF NOT EXISTS schedule_drafts (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      artist_id varchar NOT NULL,
      inquiry_id varchar,
      contract_id varchar,
      booking_id varchar,
      title text,
      event_date text,
      location text,
      notes text,
      columns jsonb DEFAULT '[]'::jsonb,
      rows jsonb DEFAULT '[]'::jsonb,
      service_defaults jsonb DEFAULT '[]'::jsonb,
      providers jsonb DEFAULT '[]'::jsonb,
      status text DEFAULT 'draft',
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp DEFAULT now()
    )` },
  ];
  
  for (const migration of migrations) {
    try {
      await db.execute(migration.sql);
      console.log(`[DB] Migration OK: ${migration.name}`);
    } catch (error: any) {
      console.error(`[DB] Migration FAILED: ${migration.name}`, error.message);
    }
  }
  
  console.log("[DB] Schema migration completed");
}

const app = express();

// Trust proxy - required for rate limiting behind reverse proxy (Replit deployment)
// This ensures req.ip returns the real client IP, not the proxy IP
app.set('trust proxy', 1);

// CORS configuration for external form submissions
const allowedOrigins = [
  'https://beauvette.app',
  'https://www.beauvette.app',
  'https://themakeupdolls.com',
  'https://www.themakeupdolls.com',
  // Allow localhost for development
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5173',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log rejected origins for debugging
    console.log(`[CORS] Blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Serve attached_assets as static files
app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));

// Briarwood marketing landing — served when host is briarwood.ai (or www.briarwood.ai)
// This runs before everything else so the SPA never claims `/` on this domain.
const BRIARWOOD_LANDING_HOSTS = new Set([
  'briarwood.ai',
  'www.briarwood.ai',
  'briarwood.com',
  'www.briarwood.com',
  'atbriarwood.com',
  'www.atbriarwood.com',
]);
const briarwoodLandingPath = path.join(process.cwd(), 'briarwood-landing', 'index.html');
app.use((req, res, next) => {
  const host = (req.hostname || '').toLowerCase();
  if (!BRIARWOOD_LANDING_HOSTS.has(host)) return next();
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.path === '/' || req.path === '/index.html') {
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.sendFile(briarwoodLandingPath);
  }
  return next();
});

// Health check endpoints - MUST be first, before any middleware
// This ensures deployment health checks can succeed immediately
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// API readiness check endpoint for deployment systems
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: Date.now() });
});

app.get("/_health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"],
      frameSrc: ["'self'"],
      frameAncestors: ["'self'", "https://themakeupdolls.com", "https://www.themakeupdolls.com", "https://beauvette.app"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding external resources
}));

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Apply JSON middleware for all other routes - increased limit for photo uploads
app.use(
  express.json({
    limit: '50mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '50mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  const logResponseBody = process.env.NODE_ENV !== "production";
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    if (logResponseBody) {
      capturedJsonResponse = bodyJson;
    }
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (logResponseBody && capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Run startup migrations to ensure schema is up to date
    await ensureDatabaseSchema();
    
    registerAgentRoutes(app);
    registerAcpRoutes(app);
    const httpServer = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // Headless API server: frontend/static serving is handled outside this process.

    // ALWAYS serve the API on the port specified in the environment variable PORT.
    // Other ports may be firewalled. Default to 5000 if not specified.
    const port = parseInt(process.env.PORT || "5000", 10);
    const devServerHost = process.env.DEV_SERVER_HOST?.trim();
    const host = devServerHost || "0.0.0.0";
    const reusePort = process.env.DEV_SERVER_REUSE_PORT === "true" || !devServerHost;
    const listenOptions = {
      port,
      host,
      ...(reusePort ? { reusePort: true } : {}),
    };
    httpServer.listen(
      listenOptions,
      () => {
        log(`serving on ${host}:${port}${reusePort ? " with reusePort" : ""}`);
        // Start scheduled email job
        startScheduledEmailJob();
        // Start cron jobs (hold-expirer, SLA enforcer)
        startCronJobs();
      },
    );
  } catch (error) {
    console.error('[STARTUP ERROR]', error);
    process.exit(1);
  }
})();
