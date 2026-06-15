import { Express, Request, Response, NextFunction } from "express";
import { createHash, randomBytes } from "crypto";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  agents,
  agentApiKeys,
  agentWebhooks,
  agentActionLogs,
  agentEvents,
  artistProfiles,
  users,
  inquiries,
  availability,
  trustedCircle,
  bookings,
  contracts,
  schedules,
  scheduleAppointments,
  type Agent,
  type AgentApiKey,
  insertInquirySchema,
} from "@shared/schema";
import { storage } from "./storage";
import { ObjectStorageService } from "./objectStorage";
import {
  getBriarwoodPublicBaseUrl,
  getLegacyDateInquiryPublicBaseUrl,
} from "./config/publicUrl";

const objectStorage = new ObjectStorageService();

const ACTION_POLICY: Record<string, { minAutonomy: string; scopes: string[] }> = {
  "availability.check": { minAutonomy: "restricted", scopes: ["read:availability"] },
  "artist.discover": { minAutonomy: "restricted", scopes: ["read:artists"] },
  "artist.cdi": { minAutonomy: "restricted", scopes: ["read:cdi"] },
  "inquiry.submit": { minAutonomy: "conditional", scopes: ["write:inquiries"] },
  "inquiry.read": { minAutonomy: "conditional", scopes: ["read:inquiries"] },
  "hold.place": { minAutonomy: "conditional", scopes: ["write:holds"] },
  "pricing.request": { minAutonomy: "restricted", scopes: ["read:pricing"] },
  "referral.query": { minAutonomy: "restricted", scopes: ["read:referrals"] },
  "contract.create": { minAutonomy: "full", scopes: ["write:contracts"] },
  "invoice.create": { minAutonomy: "full", scopes: ["write:invoices"] },
  "schedule.read": { minAutonomy: "conditional", scopes: ["read:schedules"] },
  "webhook.manage": { minAutonomy: "restricted", scopes: ["manage:webhooks"] },
  "proof.service": { minAutonomy: "conditional", scopes: ["read:proof"] },
};

const AUTONOMY_LEVELS: Record<string, number> = {
  restricted: 0,
  conditional: 1,
  full: 2,
};

function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function generateApiKey(): { key: string; prefix: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  const key = `toile_${raw}`;
  const prefix = key.substring(0, 12);
  const hash = hashApiKey(key);
  return { key, prefix, hash };
}

interface AgentRequest extends Request {
  agent?: Agent;
  agentKey?: AgentApiKey;
}

async function agentAuthMiddleware(req: AgentRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "missing_api_key",
      message: "Provide API key as Bearer token in Authorization header",
      docs: "/api/agent/manifest",
    });
  }

  const apiKey = authHeader.replace("Bearer ", "");
  const keyHash = hashApiKey(apiKey);

  const [keyRecord] = await db
    .select()
    .from(agentApiKeys)
    .where(and(eq(agentApiKeys.keyHash, keyHash), eq(agentApiKeys.isActive, true)));

  if (!keyRecord) {
    return res.status(401).json({ error: "invalid_api_key", message: "API key not recognized or deactivated" });
  }

  if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
    return res.status(401).json({ error: "expired_api_key", message: "API key has expired. Generate a new one." });
  }

  const [agent] = await db.select().from(agents).where(and(eq(agents.id, keyRecord.agentId), eq(agents.isActive, true)));

  if (!agent) {
    return res.status(403).json({ error: "agent_deactivated", message: "Agent account is not active" });
  }

  await db.update(agentApiKeys).set({ lastUsedAt: new Date() }).where(eq(agentApiKeys.id, keyRecord.id));
  await db.update(agents).set({ lastActiveAt: new Date() }).where(eq(agents.id, agent.id));

  req.agent = agent;
  req.agentKey = keyRecord;
  next();
}

function requireAutonomy(action: string) {
  return (req: AgentRequest, res: Response, next: NextFunction) => {
    const policy = ACTION_POLICY[action];
    if (!policy) {
      return res.status(500).json({ error: "unknown_action", message: `No policy for action: ${action}` });
    }

    const agent = req.agent!;
    const agentLevel = AUTONOMY_LEVELS[agent.autonomyLevel || "restricted"] ?? 0;
    const requiredLevel = AUTONOMY_LEVELS[policy.minAutonomy] ?? 0;

    if (agentLevel < requiredLevel) {
      return res.status(403).json({
        error: "insufficient_autonomy",
        message: `Action '${action}' requires '${policy.minAutonomy}' autonomy. Your agent has '${agent.autonomyLevel}' (CDI: ${agent.cdiScore}).`,
        currentCdi: agent.cdiScore,
        currentAutonomy: agent.autonomyLevel,
        requiredAutonomy: policy.minAutonomy,
        hint: "Improve your CDI score by demonstrating reliable coordination patterns.",
      });
    }

    const keyScopes = req.agentKey?.scopes || [];
    const agentScopes = agent.scopes || [];
    const allScopes = new Set([...keyScopes, ...agentScopes]);

    if (!allScopes.has("*")) {
      const missing = policy.scopes.filter((s) => !allScopes.has(s));
      if (missing.length > 0) {
        return res.status(403).json({
          error: "insufficient_scope",
          message: `Missing required scopes: ${missing.join(", ")}`,
          requiredScopes: policy.scopes,
          yourScopes: Array.from(allScopes),
        });
      }
    }

    next();
  };
}

async function logAgentAction(agentId: string, action: string, req: AgentRequest, statusCode: number, responseBody?: any) {
  try {
    await db.insert(agentActionLogs).values({
      agentId,
      action,
      endpoint: req.originalUrl,
      method: req.method,
      statusCode,
      autonomyLevel: req.agent?.autonomyLevel || "unknown",
      cdiScoreAtTime: req.agent?.cdiScore || 0,
      requestBody: req.body || null,
      responseBody: responseBody ? JSON.stringify(responseBody).substring(0, 5000) : null,
      ipAddress: req.ip || req.socket.remoteAddress || null,
    });
  } catch (e) {
    console.error("[Agent Audit] Failed to log action:", e);
  }
}

async function emitAgentEvent(eventType: string, payload: any, artistId?: string, inquiryId?: string) {
  try {
    await db.insert(agentEvents).values({ eventType, payload, artistId, inquiryId });
  } catch (e) {
    console.error("[Agent Event] Failed to emit:", e);
  }
}

export function registerAgentRoutes(app: Express) {

  // ============================================================
  // A2A AGENT CARD - Discovery endpoint for agent-to-agent protocol
  // ============================================================
  app.get("/.well-known/ai-agent", (_req, res) => {
    const publicBaseUrl = getBriarwoodPublicBaseUrl();

    res.json({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Toile Coordination Engine",
      description: "Agentic commerce gateway for high-trust service coordination. Provides real-time availability, trust verification (CDI), booking orchestration, and proof-of-service for the beauty and events industry.",
      url: publicBaseUrl,
      version: "1.0.0",
      provider: {
        "@type": "Organization",
        name: "Toile",
        url: publicBaseUrl,
      },
      capabilities: [
        {
          id: "availability_check",
          name: "Real-Time Availability",
          description: "Instant availability query for any artist on any date. No form filling, no waiting.",
          inputSchema: { artistSlug: "string", date: "ISO 8601 date" },
          autonomyRequired: "restricted",
        },
        {
          id: "artist_discovery",
          name: "Artist Discovery",
          description: "Find verified beauty artists by location, service type, and CDI trust score.",
          inputSchema: { serviceType: "string?", location: "string?", minCdi: "number?" },
          autonomyRequired: "restricted",
        },
        {
          id: "cdi_trust_verification",
          name: "CDI Trust Verification",
          description: "Query the Choreography Depth Index (0-100) for any artist. Measures responsiveness, adaptability, attention, and reliability.",
          inputSchema: { artistSlug: "string" },
          autonomyRequired: "restricted",
        },
        {
          id: "inquiry_submission",
          name: "Structured Inquiry",
          description: "Submit a machine-readable booking inquiry with instant routing to the right artist.",
          inputSchema: { artistId: "string", clientName: "string", clientEmail: "string", eventDate: "ISO date", serviceType: "string" },
          autonomyRequired: "conditional",
        },
        {
          id: "soft_hold",
          name: "Date Hold",
          description: "Place a temporary soft hold on an artist's calendar date. Expires automatically.",
          inputSchema: { inquiryId: "string", holdHours: "number?" },
          autonomyRequired: "conditional",
        },
        {
          id: "pricing_request",
          name: "Pricing & Info Sheet",
          description: "Request artist's current pricing, packages, and info sheet.",
          inputSchema: { artistSlug: "string" },
          autonomyRequired: "restricted",
        },
        {
          id: "referral_network",
          name: "Trusted Circle Referrals",
          description: "Query an artist's verified referral network when they're unavailable.",
          inputSchema: { artistSlug: "string", date: "ISO date?" },
          autonomyRequired: "restricted",
        },
        {
          id: "proof_of_service",
          name: "Proof of Service",
          description: "Verification signal for completed bookings. Used for ACP escrow release.",
          inputSchema: { bookingId: "string" },
          autonomyRequired: "conditional",
        },
        {
          id: "schedule_coordination",
          name: "Day-of Schedule",
          description: "Access event day timelines with appointment details for coordination.",
          inputSchema: { scheduleToken: "string" },
          autonomyRequired: "conditional",
        },
        {
          id: "acp_checkout",
          name: "ACP Checkout",
          description: "Create an ACP-compliant payment session with Square payment link. Zero-login payments via shared payment tokens.",
          inputSchema: { artistSlug: "string", amount: "number (dollars)", description: "string?", clientName: "string?", clientEmail: "string?" },
          autonomyRequired: "conditional",
        },
        {
          id: "coordination_challenge",
          name: "Coordination Proof of Work",
          description: "Request and solve a bridal-industry coordination puzzle to prove computational competence. Successful solutions earn CDI points and TOILE_VERIFIED_ tokens.",
          inputSchema: {},
          autonomyRequired: "restricted",
        },
      ],
      acpProtocol: {
        version: "1.0.0",
        description: "Agentic Commerce Protocol endpoints for machine-to-machine payments. Square-backed with CDI-gated escrow.",
        endpoints: {
          checkout: "POST /api/acp/checkout",
          update: "GET /api/acp/update?sessionId=<id>",
          complete: "POST /api/acp/complete",
          cancel: "POST /api/acp/cancel",
        },
        features: [
          "Zero-login payments via shared payment tokens",
          "CDI-gated escrow (funds held until coordination verified)",
          "Proof of service verification for fund release",
          "Platform fee: 1.5% via Square appFeeMoney",
        ],
      },
      coordinationChallenge: {
        description: "Agents must solve industry-specific coordination puzzles to prove computational competence. Solving challenges earns CDI points and TOILE_VERIFIED_ tokens for elevated access.",
        endpoint: "POST /api/agent/challenge",
        puzzleTypes: ["travel_buffer", "schedule_optimization", "conflict_resolution"],
        reward: "CDI points + TOILE_VERIFIED_ bearer token",
      },
      authentication: {
        type: "bearer",
        registrationEndpoint: "/api/agent/register",
        description: "Register your agent to receive API keys. CDI trust scoring determines autonomy level. Solve coordination challenges to raise CDI.",
      },
      endpoints: {
        manifest: "/api/agent/manifest",
        register: "/api/agent/register",
        availability: "/api/agent/availability/:artistSlug",
        artists: "/api/agent/artists",
        cdi: "/api/agent/cdi/:artistSlug",
        inquiry: "/api/agent/inquiries",
        hold: "/api/agent/inquiries/:id/hold",
        pricing: "/api/agent/pricing/:artistSlug",
        referrals: "/api/agent/referrals/:artistSlug",
        proof: "/api/agent/proof/:bookingId",
        schedule: "/api/agent/schedule/:token",
        webhooks: "/api/agent/webhooks",
        acpCheckout: "/api/acp/checkout",
        acpUpdate: "/api/acp/update",
        acpComplete: "/api/acp/complete",
        acpCancel: "/api/acp/cancel",
        challenge: "/api/agent/challenge",
        challengeSolve: "/api/agent/challenge/:id/solve",
        challengeHistory: "/api/agent/challenges",
      },
      trustModel: {
        name: "Choreography Depth Index (CDI)",
        description: "Trust score (0-100) computed from observed coordination behavior. Higher scores unlock greater autonomy.",
        components: ["responsiveness (25%)", "adaptability (25%)", "attention (25%)", "reliability (25%)"],
        levels: {
          full: { minScore: 80, description: "Full autonomy - can submit inquiries, place holds, create contracts" },
          conditional: { minScore: 50, description: "Can submit inquiries and place holds with audit logging" },
          restricted: { minScore: 0, description: "Read-only access - availability, pricing, CDI lookup" },
        },
        dataPolicy: {
          principle: "LLMs can interpret the trust record. They cannot create the trust record.",
          headlineSource: "behavioral_events_only",
          aiRole: "interpretation_only_never_source_of_truth",
          headlineInputs: [
            "response_latency_timestamps",
            "booking_status_transitions",
            "payment_webhook_events",
            "holds_honored",
            "handoffs_completed",
            "service_completion_signals",
            "verified_follow_through",
          ],
          aiCommentary: {
            description: "Gemini-derived analysis of message text is stored separately as AI Commentary and is never weighted into the headline CDI score.",
            storage: "cdi_ai_insights",
            visibilityToAgents: "available via per-artist commentary endpoints; clearly tagged as 'ai_annotation'",
          },
          rationale: "Designed to avoid LLM self-preference bias contaminating trust scoring. Headline CDI is behavior, not language.",
        },
      },
    });
  });

  // ============================================================
  // AGENT MANIFEST - Structured tool definitions for AI agents
  // ============================================================
  app.get("/api/agent/manifest", (_req, res) => {
    res.json({
      name: "Toile Coordination Engine",
      version: "1.0.0",
      description: "Agent-addressable API for high-trust service coordination. Book beauty artists, verify trust, coordinate events.",
      baseUrl: getLegacyDateInquiryPublicBaseUrl(),
      authentication: {
        type: "bearer",
        header: "Authorization: Bearer <api_key>",
        registration: "POST /api/agent/register",
      },
      tools: Object.entries(ACTION_POLICY).map(([action, policy]) => ({
        name: action,
        minAutonomy: policy.minAutonomy,
        requiredScopes: policy.scopes,
      })),
      actionPolicies: ACTION_POLICY,
      autonomyLevels: {
        restricted: { cdiRange: [0, 49], capabilities: "Read-only: availability, pricing, CDI, artist discovery, referrals" },
        conditional: { cdiRange: [50, 79], capabilities: "Read + Write: submit inquiries, place holds, read schedules, proof of service" },
        full: { cdiRange: [80, 100], capabilities: "Full access: create contracts, invoices, all conditional actions" },
      },
      endpoints: [
        { method: "POST", path: "/api/agent/register", description: "Register a new agent and receive API key", auth: false },
        { method: "GET", path: "/api/agent/me", description: "Get your agent profile and CDI score", auth: true },
        { method: "GET", path: "/api/agent/availability/:artistSlug", description: "Check artist availability for a date", auth: true, params: { artistSlug: "string", date: "query:ISO date" } },
        { method: "GET", path: "/api/agent/artists", description: "Discover artists by service type, location, CDI", auth: true, params: { serviceType: "query?", location: "query?", minCdi: "query:number?" } },
        { method: "GET", path: "/api/agent/cdi/:artistSlug", description: "Get artist's CDI trust score and history", auth: true },
        { method: "POST", path: "/api/agent/inquiries", description: "Submit a booking inquiry", auth: true, body: { artistSlug: "string", clientName: "string", clientEmail: "string", eventDate: "ISO date", serviceType: "string", message: "string?" } },
        { method: "GET", path: "/api/agent/inquiries/:id", description: "Get inquiry status", auth: true },
        { method: "POST", path: "/api/agent/inquiries/:id/hold", description: "Place a soft hold on a date", auth: true, body: { holdHours: "number?" } },
        { method: "GET", path: "/api/agent/pricing/:artistSlug", description: "Get artist info sheet and coordination requirements. Pricing is bespoke — submit an inquiry to start the conversation.", auth: true },
        { method: "GET", path: "/api/agent/referrals/:artistSlug", description: "Get artist's Trusted Circle referrals", auth: true, params: { date: "query:ISO date?" } },
        { method: "GET", path: "/api/agent/proof/:bookingId", description: "Get proof of service for escrow release", auth: true },
        { method: "GET", path: "/api/agent/schedule/:token", description: "Access event day schedule", auth: true },
        { method: "POST", path: "/api/agent/webhooks", description: "Register webhook for events", auth: true, body: { url: "string", events: "string[]" } },
        { method: "GET", path: "/api/agent/webhooks", description: "List your registered webhooks", auth: true },
        { method: "DELETE", path: "/api/agent/webhooks/:id", description: "Remove a webhook", auth: true },
        { method: "POST", path: "/api/acp/checkout", description: "Create ACP payment session with Square payment link", auth: true, body: { artistSlug: "string", amount: "number (dollars)", description: "string?", clientName: "string?", clientEmail: "string?" } },
        { method: "GET", path: "/api/acp/update", description: "Check ACP session payment status", auth: true, params: { sessionId: "query:string" } },
        { method: "POST", path: "/api/acp/complete", description: "Complete ACP session, verify payment, trigger CDI update", auth: true, body: { sessionId: "string", squarePaymentId: "string?" } },
        { method: "POST", path: "/api/acp/cancel", description: "Cancel ACP session", auth: true, body: { sessionId: "string", reason: "string?" } },
        { method: "POST", path: "/api/agent/challenge", description: "Request a coordination puzzle (Proof of Work)", auth: true },
        { method: "POST", path: "/api/agent/challenge/:id/solve", description: "Submit answer to coordination puzzle", auth: true, body: { answer: "object" } },
        { method: "GET", path: "/api/agent/challenges", description: "View your challenge history", auth: true },
      ],
      events: [
        "inquiry.created", "inquiry.accepted", "inquiry.declined", "inquiry.referred",
        "hold.placed", "hold.expired",
        "booking.confirmed", "booking.completed",
        "contract.created", "contract.signed",
        "invoice.created", "invoice.paid",
        "schedule.updated",
      ],
    });
  });

  // ============================================================
  // AGENT REGISTRATION - Self-service API key provisioning
  // ============================================================
  app.post("/api/agent/register", async (req: Request, res: Response) => {
    try {
      const { name, description, ownerEmail, platform, scopes } = req.body;

      if (!name || !ownerEmail) {
        return res.status(400).json({ error: "name and ownerEmail are required" });
      }

      const validScopes = scopes?.filter((s: string) =>
        ["read:availability", "read:artists", "read:cdi", "read:pricing", "read:referrals",
         "read:inquiries", "read:schedules", "read:proof",
         "write:inquiries", "write:holds",
         "write:contracts", "write:invoices",
         "manage:webhooks"].includes(s)
      ) || ["read:availability", "read:artists", "read:cdi", "read:pricing", "read:referrals"];

      const [agent] = await db.insert(agents).values({
        name,
        description: description || null,
        ownerEmail,
        platform: platform || null,
        scopes: validScopes,
        cdiScore: 0,
        autonomyLevel: "restricted",
      }).returning();

      const { key, prefix, hash } = generateApiKey();

      await db.insert(agentApiKeys).values({
        agentId: agent.id,
        keyHash: hash,
        keyPrefix: prefix,
        label: "default",
        scopes: validScopes,
      });

      res.status(201).json({
        agent: {
          id: agent.id,
          name: agent.name,
          autonomyLevel: agent.autonomyLevel,
          cdiScore: agent.cdiScore,
          scopes: validScopes,
        },
        apiKey: key,
        warning: "Save this API key now. It cannot be retrieved again.",
        gettingStarted: {
          step1: "Add 'Authorization: Bearer <your_key>' to all requests",
          step2: "GET /api/agent/manifest to see all available tools",
          step3: "GET /api/agent/artists to discover artists",
          step4: "GET /api/agent/availability/:slug?date=YYYY-MM-DD to check dates",
          step5: "POST /api/agent/inquiries to submit a booking request",
          cdiNote: "Your CDI score starts at 0 (restricted). Demonstrate reliable coordination to unlock more capabilities.",
        },
      });
    } catch (err: any) {
      console.error("[Agent Register] Error:", err);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // ============================================================
  // AGENT PROFILE - Get your own agent info
  // ============================================================
  app.get("/api/agent/me", agentAuthMiddleware, async (req: AgentRequest, res: Response) => {
    const agent = req.agent!;

    const [actionCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(agentActionLogs)
      .where(eq(agentActionLogs.agentId, agent.id));

    const webhookList = await db
      .select()
      .from(agentWebhooks)
      .where(and(eq(agentWebhooks.agentId, agent.id), eq(agentWebhooks.isActive, true)));

    await logAgentAction(agent.id, "agent.profile", req, 200);

    res.json({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      platform: agent.platform,
      cdiScore: agent.cdiScore,
      autonomyLevel: agent.autonomyLevel,
      scopes: agent.scopes,
      rateLimitPerMinute: agent.rateLimitPerMinute,
      totalActions: actionCount?.count || 0,
      webhooks: webhookList.length,
      lastActiveAt: agent.lastActiveAt,
      createdAt: agent.createdAt,
      capabilities: Object.entries(ACTION_POLICY)
        .filter(([_, policy]) => {
          const agentLevel = AUTONOMY_LEVELS[agent.autonomyLevel || "restricted"] ?? 0;
          const requiredLevel = AUTONOMY_LEVELS[policy.minAutonomy] ?? 0;
          return agentLevel >= requiredLevel;
        })
        .map(([action]) => action),
      lockedCapabilities: Object.entries(ACTION_POLICY)
        .filter(([_, policy]) => {
          const agentLevel = AUTONOMY_LEVELS[agent.autonomyLevel || "restricted"] ?? 0;
          const requiredLevel = AUTONOMY_LEVELS[policy.minAutonomy] ?? 0;
          return agentLevel < requiredLevel;
        })
        .map(([action, policy]) => ({ action, requiredAutonomy: policy.minAutonomy })),
    });
  });

  // ============================================================
  // AVAILABILITY CHECK - Instant, no form filling
  // ============================================================
  app.get("/api/agent/availability/:artistSlug", agentAuthMiddleware, requireAutonomy("availability.check"), async (req: AgentRequest, res: Response) => {
    try {
      const { artistSlug } = req.params;
      const { date } = req.query;

      const [profile] = await db
        .select()
        .from(artistProfiles)
        .where(eq(artistProfiles.artistSlug, artistSlug));

      if (!profile) {
        return res.status(404).json({ error: "artist_not_found", message: `No artist with slug '${artistSlug}'` });
      }

      let isAvailable = true;
      let conflictReason: string | null = null;

      if (date) {
        const queryDate = new Date(date as string);
        const dateStr = queryDate.toISOString().split('T')[0];

        const blockedDates = await db
          .select()
          .from(availability)
          .where(eq(availability.userId, profile.userId));

        for (const entry of blockedDates) {
          const entryDate = new Date(entry.date);
          if (entryDate.toDateString() === queryDate.toDateString() && !entry.isAvailable) {
            isAvailable = false;
            conflictReason = "blocked";
            break;
          }
        }

        if (isAvailable) {
          const allInquiries = await db
            .select()
            .from(inquiries)
            .where(eq(inquiries.vendorId, profile.userId));

          const confirmedOnDate = allInquiries.filter((i) => {
            if (!i.eventDate) return false;
            const iDate = new Date(i.eventDate).toDateString();
            return iDate === queryDate.toDateString() && ["accepted", "deposit_paid", "confirmed"].includes(i.status);
          });

          if (confirmedOnDate.length > 0) {
            isAvailable = false;
            conflictReason = "booked";
          }
        }
      }

      const result = {
        artist: {
          slug: artistSlug,
          name: profile.businessName,
          cdiScore: profile.cdiScore || 0,
        },
        date: date || null,
        available: isAvailable,
        conflictReason,
        nextAction: isAvailable
          ? { action: "inquiry.submit", endpoint: "POST /api/agent/inquiries" }
          : { action: "referral.query", endpoint: `GET /api/agent/referrals/${artistSlug}` },
      };

      await logAgentAction(req.agent!.id, "availability.check", req, 200, result);
      res.json(result);
    } catch (err: any) {
      console.error("[Agent Availability] Error:", err);
      res.status(500).json({ error: "availability_check_failed" });
    }
  });

  // ============================================================
  // ARTIST DISCOVERY - Find artists by service, location, CDI
  // ============================================================
  app.get("/api/agent/artists", agentAuthMiddleware, requireAutonomy("artist.discover"), async (req: AgentRequest, res: Response) => {
    try {
      const { serviceType, location, minCdi } = req.query;

      let allProfiles = await db
        .select()
        .from(artistProfiles)
        .where(sql`${artistProfiles.artistSlug} IS NOT NULL`);

      if (serviceType) {
        allProfiles = allProfiles.filter((p) =>
          p.serviceTypes?.some((s: string) => s.toLowerCase().includes((serviceType as string).toLowerCase()))
        );
      }

      if (location) {
        allProfiles = allProfiles.filter((p) =>
          p.location?.toLowerCase().includes((location as string).toLowerCase())
        );
      }

      if (minCdi) {
        allProfiles = allProfiles.filter((p) => (p.cdiScore || 0) >= Number(minCdi));
      }

      const result = allProfiles
        .filter((p) => p.artistSlug)
        .map((p) => ({
          slug: p.artistSlug,
          name: p.businessName,
          location: p.location,
          services: p.serviceTypes,
          cdiScore: p.cdiScore || 0,
          hasPricing: p.infoSheetEnabled,
          autoResponder: p.autoResponderMode,
          endpoints: {
            availability: `/api/agent/availability/${p.artistSlug}`,
            pricing: `/api/agent/pricing/${p.artistSlug}`,
            cdi: `/api/agent/cdi/${p.artistSlug}`,
            referrals: `/api/agent/referrals/${p.artistSlug}`,
          },
        }));

      await logAgentAction(req.agent!.id, "artist.discover", req, 200);
      res.json({ artists: result, count: result.length });
    } catch (err: any) {
      console.error("[Agent Artists] Error:", err);
      res.status(500).json({ error: "artist_discovery_failed" });
    }
  });

  // ============================================================
  // CDI TRUST SCORE - Verify artist coordination quality
  // ============================================================
  app.get("/api/agent/cdi/:artistSlug", agentAuthMiddleware, requireAutonomy("artist.cdi"), async (req: AgentRequest, res: Response) => {
    try {
      const { artistSlug } = req.params;

      const [profile] = await db
        .select()
        .from(artistProfiles)
        .where(eq(artistProfiles.artistSlug, artistSlug));

      if (!profile) {
        return res.status(404).json({ error: "artist_not_found" });
      }

      const metrics = await storage.getVendorMetrics(profile.userId);

      const result = {
        artist: { slug: artistSlug, name: profile.businessName },
        cdi: {
          score: profile.cdiScore || 0,
          autonomyLevel: (profile.cdiScore || 0) >= 80 ? "full" : (profile.cdiScore || 0) >= 50 ? "conditional" : "restricted",
          components: {
            responsiveness: {
              weight: 0.25,
              signal: metrics.avgTimeToFirstResponseMinutes != null
                ? `${Math.round(metrics.avgTimeToFirstResponseMinutes)} min avg first response`
                : "No data",
            },
            adaptability: { weight: 0.25, signal: "Iterations to alignment" },
            attention: {
              weight: 0.25,
              signal: `${metrics.totalInquiries} total inquiries handled`,
            },
            reliability: {
              weight: 0.25,
              signal: `${metrics.confirmSuccessCount} confirmed, ${metrics.holdExpiryRate}% hold expiry rate`,
            },
          },
        },
        metrics: {
          avgResponseMinutes: metrics.avgTimeToFirstResponseMinutes,
          totalInquiries: metrics.totalInquiries,
          confirmations: metrics.confirmSuccessCount,
          holdExpiryRate: metrics.holdExpiryRate,
          under24hRate: metrics.terminalStateUnder24hPercent,
        },
        interpretation: {
          trustLevel: (profile.cdiScore || 0) >= 80 ? "HIGH" : (profile.cdiScore || 0) >= 50 ? "MEDIUM" : "LOW",
          recommendation: (profile.cdiScore || 0) >= 80
            ? "This artist demonstrates excellent coordination. Safe for autonomous booking."
            : (profile.cdiScore || 0) >= 50
              ? "This artist shows good coordination. Recommend human confirmation before payment."
              : "Limited coordination data. Recommend human oversight for all interactions.",
        },
      };

      await logAgentAction(req.agent!.id, "artist.cdi", req, 200);
      res.json(result);
    } catch (err: any) {
      console.error("[Agent CDI] Error:", err);
      res.status(500).json({ error: "cdi_lookup_failed" });
    }
  });

  // ============================================================
  // SUBMIT INQUIRY - Machine-readable booking request
  // ============================================================
  app.post("/api/agent/inquiries", agentAuthMiddleware, requireAutonomy("inquiry.submit"), async (req: AgentRequest, res: Response) => {
    try {
      const { artistSlug, clientName, clientEmail, eventDate, serviceType, eventLocation, message, partySize } = req.body;

      if (!artistSlug || !clientName || !clientEmail || !eventDate) {
        return res.status(400).json({
          error: "missing_fields",
          required: ["artistSlug", "clientName", "clientEmail", "eventDate"],
        });
      }

      const [profile] = await db
        .select()
        .from(artistProfiles)
        .where(eq(artistProfiles.artistSlug, artistSlug));

      if (!profile) {
        return res.status(404).json({ error: "artist_not_found" });
      }

      const inquiry = await storage.createInquiry({
        vendorId: profile.userId,
        clientName,
        clientEmail,
        eventDate: new Date(eventDate),
        serviceType: serviceType || null,
        eventLocation: eventLocation || null,
        message: message || null,
        partySize: partySize || null,
      } as any);

      const vendor = await storage.getUser(profile.userId);
      if (vendor?.email) {
        const baseUrl = process.env.PUBLIC_BASE_URL || "https://dateinquiry.com";
        import("./emailService").then(async (emailService) => {
          await emailService.sendInquiryNotificationEmail({
            toEmail: vendor.email!,
            vendorName: profile.businessName || vendor.firstName || "Artist",
            clientName,
            clientEmail,
            eventDate: new Date(eventDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
            eventLocation,
            serviceType,
            inquiryLink: `${baseUrl}/inquiry/${inquiry.threadToken}`,
          });
        }).catch((e) => console.error("[Agent Inquiry] Email error:", e));
      }

      await emitAgentEvent("inquiry.created", {
        inquiryId: inquiry.id,
        artistSlug,
        clientName,
        clientEmail,
        eventDate,
        serviceType,
        submittedByAgent: req.agent!.id,
      }, profile.userId, inquiry.id);

      const result = {
        inquiry: {
          id: inquiry.id,
          status: inquiry.status,
          artist: { slug: artistSlug, name: profile.businessName },
          client: { name: clientName, email: clientEmail },
          eventDate: inquiry.eventDate,
          serviceType: inquiry.serviceType,
        },
        nextActions: [
          { action: "Check status", endpoint: `GET /api/agent/inquiries/${inquiry.id}` },
          { action: "Place hold", endpoint: `POST /api/agent/inquiries/${inquiry.id}/hold` },
        ],
      };

      await logAgentAction(req.agent!.id, "inquiry.submit", req, 201, result);
      res.status(201).json(result);
    } catch (err: any) {
      console.error("[Agent Inquiry] Error:", err);
      res.status(500).json({ error: "inquiry_submission_failed" });
    }
  });

  // ============================================================
  // INQUIRY STATUS - Check on an inquiry
  // ============================================================
  app.get("/api/agent/inquiries/:id", agentAuthMiddleware, requireAutonomy("inquiry.read"), async (req: AgentRequest, res: Response) => {
    try {
      const inquiry = await storage.getInquiry(req.params.id);
      if (!inquiry) {
        return res.status(404).json({ error: "inquiry_not_found" });
      }

      const [profile] = await db
        .select()
        .from(artistProfiles)
        .where(eq(artistProfiles.userId, inquiry.vendorId));

      res.json({
        id: inquiry.id,
        status: inquiry.status,
        statusReason: inquiry.statusReason,
        artist: { name: profile?.businessName, slug: profile?.artistSlug },
        client: { name: inquiry.clientName, email: inquiry.clientEmail },
        eventDate: inquiry.eventDate,
        serviceType: inquiry.serviceType,
        hold: inquiry.hold ? { active: true, expiresAt: inquiry.holdExpiresAt } : null,
        infoSheetSent: !!inquiry.infoSheetSentAt,
        firstResponseAt: inquiry.firstResponseAt,
        sentiment: inquiry.sentiment,
        sentimentScore: inquiry.sentimentScore,
        createdAt: inquiry.createdAt,
        updatedAt: inquiry.updatedAt,
      });
    } catch (err: any) {
      res.status(500).json({ error: "inquiry_read_failed" });
    }
  });

  // ============================================================
  // PLACE HOLD - Temporary date reservation
  // ============================================================
  app.post("/api/agent/inquiries/:id/hold", agentAuthMiddleware, requireAutonomy("hold.place"), async (req: AgentRequest, res: Response) => {
    try {
      const inquiry = await storage.getInquiry(req.params.id);
      if (!inquiry) {
        return res.status(404).json({ error: "inquiry_not_found" });
      }

      if (inquiry.hold) {
        return res.status(409).json({ error: "hold_exists", message: "A hold is already placed on this inquiry", expiresAt: inquiry.holdExpiresAt });
      }

      const holdHours = req.body.holdHours || 72;
      const holdExpiresAt = new Date(Date.now() + holdHours * 60 * 60 * 1000);

      await storage.updateInquiry(inquiry.id, {
        hold: true,
        holdPlacedAt: new Date(),
        holdExpiresAt,
        holdOwnerId: req.agent!.id,
        holdReason: `Agent hold by ${req.agent!.name}`,
      } as any);

      await emitAgentEvent("hold.placed", {
        inquiryId: inquiry.id,
        holdHours,
        holdExpiresAt,
        placedByAgent: req.agent!.id,
      }, inquiry.vendorId, inquiry.id);

      const result = {
        inquiryId: inquiry.id,
        hold: { active: true, expiresAt: holdExpiresAt, holdHours },
        message: `Hold placed for ${holdHours} hours. Will auto-expire at ${holdExpiresAt.toISOString()}.`,
      };

      await logAgentAction(req.agent!.id, "hold.place", req, 200, result);
      res.json(result);
    } catch (err: any) {
      console.error("[Agent Hold] Error:", err);
      res.status(500).json({ error: "hold_failed" });
    }
  });

  // ============================================================
  // PRICING & INFO SHEET - Get artist's rates
  // ============================================================
  app.get("/api/agent/pricing/:artistSlug", agentAuthMiddleware, requireAutonomy("pricing.request"), async (req: AgentRequest, res: Response) => {
    try {
      const { artistSlug } = req.params;

      const [profile] = await db
        .select()
        .from(artistProfiles)
        .where(eq(artistProfiles.artistSlug, artistSlug));

      if (!profile) {
        return res.status(404).json({ error: "artist_not_found" });
      }

      const baseUrl = getLegacyDateInquiryPublicBaseUrl();
      const pdfUrl = profile.infoSheetPdfUrl
        ? (profile.infoSheetPdfUrl.startsWith("http") ? profile.infoSheetPdfUrl : `${baseUrl}${profile.infoSheetPdfUrl}`)
        : null;

      const result = {
        artist: { slug: artistSlug, name: profile.businessName },
        pricing: {
          structured: false,
          reason: "Bridal beauty pricing is bespoke. Every artist prices differently based on party size, location, travel, services, and add-ons. There is no universal rate card — pricing requires a conversation.",
          infoSheet: profile.infoSheetEnabled ? {
            type: profile.infoSheetType,
            pdfUrl: pdfUrl,
            text: profile.infoSheetContent || null,
            note: "This info sheet is a starting point only. Final pricing is determined through the inquiry conversation.",
          } : null,
          pricingInfo: profile.pricingInfo || null,
        },
        coordination: {
          required: true,
          why: "This artist needs to know your client's event details before quoting. Submit an inquiry to start the coordination process.",
          endpoint: "POST /api/agent/inquiries",
          body: {
            artistSlug,
            clientName: "string (required)",
            clientEmail: "string (required)",
            eventDate: "ISO date (required)",
            eventType: "string (e.g. wedding, editorial, prom)",
            partySize: "number (how many people need services)",
            location: "string (venue or city)",
            servicesNeeded: "string (e.g. bridal makeup, bridesmaids, hair)",
            notes: "string (any details that help the artist quote accurately)",
          },
        },
        cdiNote: "Agents that provide detailed inquiry context earn higher CDI scores. Vague inquiries signal low coordination quality.",
      };

      await logAgentAction(req.agent!.id, "pricing.request", req, 200);
      res.json(result);
    } catch (err: any) {
      console.error("[Agent Pricing] Error:", err);
      res.status(500).json({ error: "pricing_failed" });
    }
  });

  // ============================================================
  // TRUSTED CIRCLE REFERRALS - Get artist's network
  // ============================================================
  app.get("/api/agent/referrals/:artistSlug", agentAuthMiddleware, requireAutonomy("referral.query"), async (req: AgentRequest, res: Response) => {
    try {
      const { artistSlug } = req.params;
      const { date } = req.query;

      const [profile] = await db
        .select()
        .from(artistProfiles)
        .where(eq(artistProfiles.artistSlug, artistSlug));

      if (!profile) {
        return res.status(404).json({ error: "artist_not_found" });
      }

      const circle = await storage.getTrustedCircleByReferrer(profile.userId);
      const activeMembers = circle.filter((m) => m.status === "accepted");

      const referrals = [];
      for (const member of activeMembers) {
        const memberUser = await storage.getUserByEmail(member.refereeEmail);
        if (memberUser) {
          const memberProfile = await storage.getArtistProfile(memberUser.id);
          referrals.push({
            name: memberProfile?.businessName || member.refereeName,
            slug: memberProfile?.artistSlug || null,
            cdiScore: memberProfile?.cdiScore || 0,
            services: memberProfile?.serviceTypes || [],
            location: memberProfile?.location || null,
            endpoints: memberProfile?.artistSlug ? {
              availability: `/api/agent/availability/${memberProfile.artistSlug}`,
              pricing: `/api/agent/pricing/${memberProfile.artistSlug}`,
              cdi: `/api/agent/cdi/${memberProfile.artistSlug}`,
            } : null,
          });
        }
      }

      const result = {
        artist: { slug: artistSlug, name: profile.businessName },
        referrals,
        count: referrals.length,
        message: referrals.length > 0
          ? `${profile.businessName} recommends ${referrals.length} trusted colleagues.`
          : "No referrals available in this artist's Trusted Circle.",
      };

      await logAgentAction(req.agent!.id, "referral.query", req, 200);
      res.json(result);
    } catch (err: any) {
      console.error("[Agent Referrals] Error:", err);
      res.status(500).json({ error: "referral_query_failed" });
    }
  });

  // ============================================================
  // PROOF OF SERVICE - Verification for escrow/ACP release
  // ============================================================
  app.get("/api/agent/proof/:bookingId", agentAuthMiddleware, requireAutonomy("proof.service"), async (req: AgentRequest, res: Response) => {
    try {
      const [booking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, req.params.bookingId));

      if (!booking) {
        return res.status(404).json({ error: "booking_not_found" });
      }

      const [profile] = await db
        .select()
        .from(artistProfiles)
        .where(eq(artistProfiles.userId, booking.vendorId));

      const result = {
        bookingId: booking.id,
        status: booking.status,
        verified: booking.status === "completed",
        artist: { name: profile?.businessName, slug: profile?.artistSlug, cdiScore: profile?.cdiScore || 0 },
        event: {
          date: booking.eventDate,
          type: booking.eventType,
          location: booking.eventLocation,
        },
        service: {
          type: booking.serviceType,
          completedAt: booking.status === "completed" ? booking.updatedAt : null,
        },
        proofSignature: booking.status === "completed"
          ? createHash("sha256").update(`${booking.id}:${booking.vendorId}:completed:${booking.updatedAt}`).digest("hex").substring(0, 16)
          : null,
        acpStatus: booking.status === "completed" ? "RELEASE_FUNDS" : "HOLD",
      };

      await logAgentAction(req.agent!.id, "proof.service", req, 200);
      res.json(result);
    } catch (err: any) {
      console.error("[Agent Proof] Error:", err);
      res.status(500).json({ error: "proof_failed" });
    }
  });

  // ============================================================
  // SCHEDULE ACCESS - Day-of event coordination
  // ============================================================
  app.get("/api/agent/schedule/:token", agentAuthMiddleware, requireAutonomy("schedule.read"), async (req: AgentRequest, res: Response) => {
    try {
      const [schedule] = await db
        .select()
        .from(schedules)
        .where(eq(schedules.shareToken, req.params.token));

      if (!schedule) {
        return res.status(404).json({ error: "schedule_not_found" });
      }

      const appointments = await db
        .select()
        .from(scheduleAppointments)
        .where(eq(scheduleAppointments.scheduleId, schedule.id));

      res.json({
        schedule: {
          id: schedule.id,
          title: schedule.title,
          eventDate: schedule.eventDate,
          venue: schedule.venue,
        },
        appointments: appointments.map((a) => ({
          id: a.id,
          personName: a.personName,
          serviceType: a.serviceType,
          startTime: a.startTime,
          endTime: a.endTime,
          notes: a.notes,
        })),
        totalAppointments: appointments.length,
      });
    } catch (err: any) {
      res.status(500).json({ error: "schedule_read_failed" });
    }
  });

  // ============================================================
  // WEBHOOK MANAGEMENT - Subscribe to platform events
  // ============================================================
  app.post("/api/agent/webhooks", agentAuthMiddleware, requireAutonomy("webhook.manage"), async (req: AgentRequest, res: Response) => {
    try {
      const { url, events } = req.body;

      if (!url || !events || !Array.isArray(events)) {
        return res.status(400).json({ error: "url and events[] are required" });
      }

      const validEvents = [
        "inquiry.created", "inquiry.accepted", "inquiry.declined", "inquiry.referred",
        "hold.placed", "hold.expired",
        "booking.confirmed", "booking.completed",
        "contract.created", "contract.signed",
        "invoice.created", "invoice.paid",
        "schedule.updated",
      ];

      const invalidEvents = events.filter((e: string) => !validEvents.includes(e));
      if (invalidEvents.length > 0) {
        return res.status(400).json({ error: "invalid_events", invalid: invalidEvents, valid: validEvents });
      }

      const secret = randomBytes(32).toString("hex");

      const [webhook] = await db.insert(agentWebhooks).values({
        agentId: req.agent!.id,
        url,
        events,
        secret,
      }).returning();

      res.status(201).json({
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        secret,
        warning: "Save the webhook secret. It's used to verify payloads via HMAC-SHA256.",
      });
    } catch (err: any) {
      console.error("[Agent Webhook] Error:", err);
      res.status(500).json({ error: "webhook_registration_failed" });
    }
  });

  app.get("/api/agent/webhooks", agentAuthMiddleware, async (req: AgentRequest, res: Response) => {
    const webhookList = await db
      .select({ id: agentWebhooks.id, url: agentWebhooks.url, events: agentWebhooks.events, isActive: agentWebhooks.isActive, createdAt: agentWebhooks.createdAt })
      .from(agentWebhooks)
      .where(eq(agentWebhooks.agentId, req.agent!.id));

    res.json({ webhooks: webhookList });
  });

  app.delete("/api/agent/webhooks/:id", agentAuthMiddleware, async (req: AgentRequest, res: Response) => {
    const [webhook] = await db
      .select()
      .from(agentWebhooks)
      .where(and(eq(agentWebhooks.id, req.params.id), eq(agentWebhooks.agentId, req.agent!.id)));

    if (!webhook) {
      return res.status(404).json({ error: "webhook_not_found" });
    }

    await db.update(agentWebhooks).set({ isActive: false }).where(eq(agentWebhooks.id, req.params.id));
    res.json({ deleted: true });
  });

  console.log("[Agent] Agentic Commerce Layer registered - A2A card, manifest, and agent endpoints active");
}
