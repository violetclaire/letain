import { Express, Request, Response } from "express";
import { createHash, randomBytes } from "crypto";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import {
  acpCheckoutSessions,
  agentChallenges,
  agents,
  agentApiKeys,
  agentActionLogs,
  artistProfiles,
  type Agent,
  type AgentApiKey,
} from "@shared/schema";
import { getMerchantSquare } from "./squareClient";

const PLATFORM_FEE_PERCENT = 1.5;

interface AgentRequest extends Request {
  agent?: Agent;
  agentKey?: AgentApiKey;
}

function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

async function acpAuthMiddleware(req: AgentRequest, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "missing_api_key",
      message: "Provide agent API key as Bearer token",
    });
  }

  const apiKey = authHeader.replace("Bearer ", "");

  if (apiKey.startsWith("TOILE_VERIFIED_")) {
    const [challenge] = await db
      .select()
      .from(agentChallenges)
      .where(and(
        eq(agentChallenges.verificationToken, apiKey),
        eq(agentChallenges.status, "solved")
      ));

    if (!challenge) {
      return res.status(401).json({ error: "invalid_verification_token", message: "Token not found, expired, or already used." });
    }

    const tokenAge = Date.now() - new Date(challenge.solvedAt || challenge.createdAt!).getTime();
    const TOKEN_MAX_AGE = 24 * 60 * 60 * 1000;
    if (tokenAge > TOKEN_MAX_AGE) {
      return res.status(401).json({ error: "verification_token_expired", message: "TOILE_VERIFIED_ tokens expire after 24 hours. Solve a new challenge." });
    }

    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, challenge.agentId));

    if (!agent || !agent.isActive) {
      return res.status(403).json({ error: "agent_not_found" });
    }

    req.agent = agent;
    return next();
  }

  const keyHash = hashApiKey(apiKey);
  const [keyRecord] = await db
    .select()
    .from(agentApiKeys)
    .where(and(eq(agentApiKeys.keyHash, keyHash), eq(agentApiKeys.isActive, true)));

  if (!keyRecord) {
    return res.status(401).json({ error: "invalid_api_key" });
  }

  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, keyRecord.agentId), eq(agents.isActive, true)));

  if (!agent) {
    return res.status(403).json({ error: "agent_deactivated" });
  }

  req.agent = agent;
  next();
}

async function logAcpAction(agentId: string, action: string, req: AgentRequest, statusCode: number) {
  try {
    await db.insert(agentActionLogs).values({
      agentId,
      action: `acp.${action}`,
      endpoint: req.originalUrl,
      method: req.method,
      statusCode,
      autonomyLevel: req.agent?.autonomyLevel || "unknown",
      cdiScoreAtTime: req.agent?.cdiScore || 0,
      requestBody: req.body || null,
      ipAddress: req.ip || req.socket.remoteAddress || null,
    });
  } catch (e) {
    console.error("[ACP Audit] Failed to log:", e);
  }
}

function generateChallenges() {
  const challenges = [
    generateTravelBufferChallenge(),
    generateScheduleOptimizationChallenge(),
    generateConflictResolutionChallenge(),
  ];
  return challenges[Math.floor(Math.random() * challenges.length)];
}

function generateTravelBufferChallenge() {
  const venues = [
    { name: "The Grand Ballroom", lat: 40.7580, lng: -73.9855, city: "Midtown" },
    { name: "Brooklyn Winery", lat: 40.7128, lng: -73.9563, city: "Williamsburg" },
    { name: "The Plaza Hotel", lat: 40.7645, lng: -73.9744, city: "Central Park South" },
    { name: "Liberty House", lat: 40.7178, lng: -74.0386, city: "Jersey City" },
  ];

  const startTimes = ["08:00", "09:30", "10:00", "11:00", "12:00", "13:30"];

  const numStylists = 2 + Math.floor(Math.random() * 3);
  const numVenues = 2 + Math.floor(Math.random() * 2);
  const selectedVenues = venues.sort(() => Math.random() - 0.5).slice(0, numVenues);

  const appointments: Array<{
    stylist: string;
    venue: string;
    startTime: string;
    serviceDurationMinutes: number;
  }> = [];

  for (let i = 0; i < numStylists; i++) {
    const venue = selectedVenues[i % selectedVenues.length];
    const time = startTimes[i % startTimes.length];
    appointments.push({
      stylist: `Stylist ${String.fromCharCode(65 + i)}`,
      venue: venue.name,
      startTime: time,
      serviceDurationMinutes: 60 + Math.floor(Math.random() * 3) * 15,
    });
  }

  const distanceMatrix: Record<string, Record<string, number>> = {};
  for (const v1 of selectedVenues) {
    distanceMatrix[v1.name] = {};
    for (const v2 of selectedVenues) {
      if (v1.name === v2.name) {
        distanceMatrix[v1.name][v2.name] = 0;
      } else {
        const dist = Math.sqrt(
          Math.pow((v1.lat - v2.lat) * 69, 2) +
          Math.pow((v1.lng - v2.lng) * 54.6, 2)
        );
        distanceMatrix[v1.name][v2.name] = Math.round(dist * 3);
      }
    }
  }

  const expectedBuffers = appointments.map((appt) => {
    const venueDistances = distanceMatrix[appt.venue] || {};
    const maxTravel = Math.max(...Object.values(venueDistances).filter(d => d > 0), 0);
    const bufferMinutes = maxTravel + 15;
    return {
      stylist: appt.stylist,
      venue: appt.venue,
      travelBufferMinutes: bufferMinutes,
      earliestDeparture: subtractMinutes(appt.startTime, bufferMinutes),
    };
  });

  return {
    type: "travel_buffer" as const,
    difficulty: numStylists,
    data: {
      instruction: "Calculate the travel-time buffer for each stylist to reach their venue. Buffer = max distance from any other venue (in minutes) + 15 minutes setup time. Return each stylist's buffer and earliest departure time.",
      appointments,
      distanceMatrix,
      setupTimeMinutes: 15,
    },
    answer: { buffers: expectedBuffers },
    cdiReward: 5 + numStylists,
  };
}

function generateScheduleOptimizationChallenge() {
  const services = [
    { name: "Bridal Makeup", duration: 75 },
    { name: "Bridesmaid Makeup", duration: 45 },
    { name: "Hair Styling", duration: 60 },
    { name: "Touch-up Kit", duration: 15 },
  ];

  const partySize = 3 + Math.floor(Math.random() * 4);
  const ceremonyTime = "14:00";
  const photoTime = "12:30";

  const party: Array<{ name: string; services: string[]; priority: number }> = [];
  const allNames = ["Bride", "MOH", "Bridesmaid 1", "Bridesmaid 2", "Bridesmaid 3", "Mother of Bride"];
  for (let i = 0; i < partySize; i++) {
    const numServices = i === 0 ? 2 : 1;
    const selectedServices = services.sort(() => Math.random() - 0.5).slice(0, numServices);
    party.push({
      name: allNames[i],
      services: selectedServices.map(s => s.name),
      priority: i === 0 ? 1 : (i <= 1 ? 2 : 3),
    });
  }

  const totalDuration = party.reduce((sum, p) => {
    return sum + p.services.reduce((s, svc) => {
      const found = services.find(sv => sv.name === svc);
      return s + (found?.duration || 45);
    }, 0);
  }, 0);

  const photoMinutes = timeToMinutes(photoTime);
  const latestStart = photoMinutes - totalDuration;

  return {
    type: "schedule_optimization" as const,
    difficulty: Math.min(partySize, 5),
    data: {
      instruction: "Given a bridal party, ceremony time, and photo time, calculate: (1) total service duration, (2) latest possible start time to finish before photos, (3) optimal service order (highest priority first). Return totalMinutes, latestStartTime (HH:MM), and orderedSchedule.",
      party,
      ceremonyTime,
      photoTime,
      serviceMenu: services,
    },
    answer: {
      totalMinutes: totalDuration,
      latestStartTime: minutesToTime(latestStart),
      orderedSchedule: [...party].sort((a, b) => a.priority - b.priority).map(p => p.name),
    },
    cdiReward: 5 + partySize,
  };
}

function generateConflictResolutionChallenge() {
  const existingBookings = [
    { date: "2026-06-20", artist: "Artist A", client: "Smith Wedding", startTime: "07:00", endTime: "12:00" },
    { date: "2026-06-20", artist: "Artist A", client: "Jones Wedding", startTime: "14:00", endTime: "18:00" },
    { date: "2026-06-21", artist: "Artist B", client: "Davis Wedding", startTime: "08:00", endTime: "13:00" },
  ];

  const newRequests = [
    { date: "2026-06-20", requestedArtist: "Artist A", client: "New Client 1", startTime: "11:00", endTime: "15:00" },
    { date: "2026-06-21", requestedArtist: "Artist B", client: "New Client 2", startTime: "12:00", endTime: "16:00" },
  ];

  const conflicts = newRequests.map(req => {
    const overlaps = existingBookings.filter(b =>
      b.date === req.date &&
      b.artist === req.requestedArtist &&
      timeToMinutes(b.startTime) < timeToMinutes(req.endTime) &&
      timeToMinutes(b.endTime) > timeToMinutes(req.startTime)
    );
    return {
      client: req.client,
      hasConflict: overlaps.length > 0,
      conflictsWith: overlaps.map(o => o.client),
      recommendation: overlaps.length > 0 ? "refer_to_trusted_circle" : "accept",
    };
  });

  return {
    type: "conflict_resolution" as const,
    difficulty: 3,
    data: {
      instruction: "Given existing bookings and new requests, identify time conflicts. For each new request, determine: (1) whether it conflicts with existing bookings, (2) which bookings it conflicts with, (3) recommendation: 'accept' if no conflict, 'refer_to_trusted_circle' if conflict. Time overlap = existing.start < new.end AND existing.end > new.start.",
      existingBookings,
      newRequests,
    },
    answer: { conflicts },
    cdiReward: 8,
  };
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function subtractMinutes(time: string, mins: number): string {
  return minutesToTime(timeToMinutes(time) - mins);
}

function validateAnswer(challengeType: string, expected: any, submitted: any): { correct: boolean; score: number; feedback: string } {
  if (!submitted) return { correct: false, score: 0, feedback: "No answer submitted" };

  if (challengeType === "travel_buffer") {
    if (!submitted.buffers || !Array.isArray(submitted.buffers)) {
      return { correct: false, score: 0, feedback: "Expected { buffers: [...] } with travelBufferMinutes for each stylist" };
    }
    const expBuffers = expected.buffers;
    let matches = 0;
    for (const exp of expBuffers) {
      const found = submitted.buffers.find((b: any) => b.stylist === exp.stylist);
      if (found && Math.abs((found.travelBufferMinutes || 0) - exp.travelBufferMinutes) <= 2) {
        matches++;
      }
    }
    const score = Math.round((matches / expBuffers.length) * 100);
    return {
      correct: score >= 80,
      score,
      feedback: score >= 80
        ? "Travel buffer calculations verified."
        : `Only ${matches}/${expBuffers.length} buffers were within tolerance. Check your distance-to-time conversion.`,
    };
  }

  if (challengeType === "schedule_optimization") {
    let score = 0;
    if (Math.abs((submitted.totalMinutes || 0) - expected.totalMinutes) <= 5) score += 40;
    if (submitted.latestStartTime === expected.latestStartTime) score += 30;
    if (submitted.orderedSchedule && JSON.stringify(submitted.orderedSchedule) === JSON.stringify(expected.orderedSchedule)) score += 30;

    return {
      correct: score >= 70,
      score,
      feedback: score >= 70
        ? "Schedule optimization verified."
        : "Check totalMinutes calculation, latestStartTime (photoTime - totalMinutes), and priority ordering.",
    };
  }

  if (challengeType === "conflict_resolution") {
    if (!submitted.conflicts || !Array.isArray(submitted.conflicts)) {
      return { correct: false, score: 0, feedback: "Expected { conflicts: [...] } with hasConflict and recommendation for each request" };
    }
    const expConflicts = expected.conflicts;
    let matches = 0;
    for (const exp of expConflicts) {
      const found = submitted.conflicts.find((c: any) => c.client === exp.client);
      if (found && found.hasConflict === exp.hasConflict && found.recommendation === exp.recommendation) {
        matches++;
      }
    }
    const score = Math.round((matches / expConflicts.length) * 100);
    return {
      correct: score >= 80,
      score,
      feedback: score >= 80
        ? "Conflict resolution verified."
        : `Only ${matches}/${expConflicts.length} conflict assessments correct. Check time overlap logic.`,
    };
  }

  return { correct: false, score: 0, feedback: "Unknown challenge type" };
}

export function registerAcpRoutes(app: Express) {

  // ============================================================
  // ACP CHECKOUT - Create a payment session
  // ============================================================
  app.post("/api/acp/checkout", acpAuthMiddleware, async (req: AgentRequest, res: Response) => {
    try {
      const agent = req.agent!;
      const { artistSlug, amount, currency, description, clientName, clientEmail, inquiryId, bookingId, metadata } = req.body;

      if (!artistSlug || !amount) {
        return res.status(400).json({ error: "artistSlug and amount (in dollars) are required" });
      }

      if (agent.cdiScore < 50) {
        await logAcpAction(agent.id, "checkout.denied", req, 403);
        return res.status(403).json({
          error: "insufficient_cdi",
          message: "ACP checkout requires CDI >= 50 (conditional autonomy).",
          currentCdi: agent.cdiScore,
          requiredCdi: 50,
          hint: "Complete coordination challenges at POST /api/agent/challenge to raise your CDI.",
        });
      }

      const [profile] = await db
        .select()
        .from(artistProfiles)
        .where(eq(artistProfiles.artistSlug, artistSlug));

      if (!profile) {
        return res.status(404).json({ error: "artist_not_found" });
      }

      const amountCents = Math.round(amount * 100);
      if (amountCents < 100) {
        return res.status(400).json({ error: "Amount must be at least $1.00" });
      }

      const platformFeeCents = Math.round(amountCents * (PLATFORM_FEE_PERCENT / 100));
      const paymentToken = `acp_pay_${randomBytes(24).toString("base64url")}`;

      let squarePaymentLinkUrl: string | null = null;
      let squarePaymentLinkId: string | null = null;
      let squareOrderId: string | null = null;

      if (profile.squareAccessToken && profile.squareLocationId) {
        try {
          const square = getMerchantSquare(profile.squareAccessToken);
          const baseUrl = process.env.PUBLIC_BASE_URL || "https://dateinquiry.com";

          const checkoutResponse = await (square.checkout as any).paymentLinks.create({
            idempotencyKey: randomBytes(16).toString("hex"),
            quickPay: {
              name: description || "Beauty Services",
              priceMoney: {
                amount: BigInt(amountCents),
                currency: currency || "USD",
              },
              locationId: profile.squareLocationId,
            },
            checkoutOptions: {
              redirectUrl: `${baseUrl}/payment-success?token=${paymentToken}`,
              askForShippingAddress: false,
              appFeeMoney: {
                amount: BigInt(platformFeeCents),
                currency: currency || "USD",
              },
            },
          });

          const result = checkoutResponse as any;
          squarePaymentLinkUrl = result.paymentLink?.url || null;
          squarePaymentLinkId = result.paymentLink?.id || null;
          squareOrderId = result.relatedResources?.orders?.[0]?.id || null;
        } catch (squareErr: any) {
          console.error("[ACP] Square payment link creation failed:", squareErr.message);
        }
      }

      const [session] = await db.insert(acpCheckoutSessions).values({
        agentId: agent.id,
        artistId: profile.userId,
        inquiryId: inquiryId || null,
        bookingId: bookingId || null,
        status: squarePaymentLinkUrl ? "payment_pending" : "created",
        amountCents,
        currency: currency || "USD",
        platformFeeCents,
        description: description || "Beauty Services",
        squarePaymentLinkUrl,
        squarePaymentLinkId,
        squareOrderId,
        paymentToken,
        clientName: clientName || null,
        clientEmail: clientEmail || null,
        metadata: metadata || null,
        cdiScoreAtCheckout: agent.cdiScore,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }).returning();

      await logAcpAction(agent.id, "checkout.created", req, 201);

      res.status(201).json({
        sessionId: session.id,
        status: session.status,
        paymentToken,
        amount: { cents: amountCents, dollars: amount, currency: currency || "USD" },
        platformFee: { cents: platformFeeCents, percent: PLATFORM_FEE_PERCENT },
        squarePaymentLink: squarePaymentLinkUrl,
        artist: { slug: artistSlug, name: profile.businessName },
        expiresAt: session.expiresAt,
        nextActions: {
          payNow: squarePaymentLinkUrl || null,
          checkStatus: `GET /api/acp/update?sessionId=${session.id}`,
          complete: `POST /api/acp/complete`,
          cancel: `POST /api/acp/cancel`,
        },
      });
    } catch (err: any) {
      console.error("[ACP Checkout] Error:", err);
      res.status(500).json({ error: "checkout_failed", message: err.message });
    }
  });

  // ============================================================
  // ACP UPDATE - Check payment status
  // ============================================================
  app.get("/api/acp/update", acpAuthMiddleware, async (req: AgentRequest, res: Response) => {
    try {
      const { sessionId } = req.query;
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId query parameter required" });
      }

      const [session] = await db
        .select()
        .from(acpCheckoutSessions)
        .where(and(
          eq(acpCheckoutSessions.id, String(sessionId)),
          eq(acpCheckoutSessions.agentId, req.agent!.id)
        ));

      if (!session) {
        return res.status(404).json({ error: "session_not_found" });
      }

      if (session.expiresAt && new Date(session.expiresAt) < new Date() && session.status === "created") {
        await db.update(acpCheckoutSessions)
          .set({ status: "expired", updatedAt: new Date() })
          .where(eq(acpCheckoutSessions.id, session.id));
        session.status = "expired";
      }

      await logAcpAction(req.agent!.id, "checkout.status", req, 200);

      res.json({
        sessionId: session.id,
        status: session.status,
        amount: { cents: session.amountCents, currency: session.currency },
        squarePaymentLink: session.squarePaymentLinkUrl,
        squarePaymentId: session.squarePaymentId,
        completedAt: session.completedAt,
        cancelledAt: session.cancelledAt,
        expiresAt: session.expiresAt,
      });
    } catch (err: any) {
      res.status(500).json({ error: "status_check_failed" });
    }
  });

  // ============================================================
  // ACP COMPLETE - Verify payment + trigger CDI update
  // ============================================================
  app.post("/api/acp/complete", acpAuthMiddleware, async (req: AgentRequest, res: Response) => {
    try {
      const { sessionId, squarePaymentId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
      }

      const [session] = await db
        .select()
        .from(acpCheckoutSessions)
        .where(and(
          eq(acpCheckoutSessions.id, sessionId),
          eq(acpCheckoutSessions.agentId, req.agent!.id)
        ));

      if (!session) {
        return res.status(404).json({ error: "session_not_found" });
      }

      if (session.status === "completed") {
        return res.json({ status: "already_completed", sessionId: session.id });
      }

      if (session.status === "cancelled" || session.status === "expired") {
        return res.status(400).json({ error: `session_${session.status}`, message: `Cannot complete a ${session.status} session.` });
      }

      const [artistProfile] = await db
        .select()
        .from(artistProfiles)
        .where(eq(artistProfiles.userId, session.artistId));

      let paymentVerified = false;

      if (squarePaymentId && artistProfile?.squareAccessToken) {
        try {
          const square = getMerchantSquare(artistProfile.squareAccessToken);
          const paymentResponse = await square.payments.get({ paymentId: squarePaymentId });
          const payment = (paymentResponse as any).payment;
          if (payment && payment.status === "COMPLETED") {
            paymentVerified = true;
          }
        } catch (e: any) {
          console.error("[ACP Complete] Square payment verification failed:", e.message);
        }
      }

      await db.update(acpCheckoutSessions).set({
        status: "completed",
        squarePaymentId: squarePaymentId || null,
        completedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(acpCheckoutSessions.id, session.id));

      const cdiBoost = paymentVerified ? 3 : 1;
      const newCdi = Math.min(100, (req.agent!.cdiScore || 0) + cdiBoost);
      const newAutonomy = newCdi >= 80 ? "full" : newCdi >= 50 ? "conditional" : "restricted";

      await db.update(agents).set({
        cdiScore: newCdi,
        autonomyLevel: newAutonomy,
        updatedAt: new Date(),
      }).where(eq(agents.id, req.agent!.id));

      const proofHash = createHash("sha256")
        .update(`${session.id}:${session.agentId}:${session.artistId}:completed:${new Date().toISOString()}`)
        .digest("hex")
        .substring(0, 24);

      await logAcpAction(req.agent!.id, "checkout.completed", req, 200);

      res.json({
        sessionId: session.id,
        status: "completed",
        paymentVerified,
        proofOfService: {
          hash: proofHash,
          acpStatus: paymentVerified ? "RELEASE_FUNDS" : "HOLD_PENDING_VERIFICATION",
          verifiedAt: new Date().toISOString(),
        },
        cdiUpdate: {
          previousScore: req.agent!.cdiScore,
          newScore: newCdi,
          boost: cdiBoost,
          autonomyLevel: newAutonomy,
          reason: paymentVerified
            ? "Payment verified via Square. CDI boosted."
            : "Session marked complete. CDI incremented. Full boost requires Square payment verification.",
        },
      });
    } catch (err: any) {
      console.error("[ACP Complete] Error:", err);
      res.status(500).json({ error: "completion_failed" });
    }
  });

  // ============================================================
  // ACP CANCEL - Cancel a checkout session
  // ============================================================
  app.post("/api/acp/cancel", acpAuthMiddleware, async (req: AgentRequest, res: Response) => {
    try {
      const { sessionId, reason } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
      }

      const [session] = await db
        .select()
        .from(acpCheckoutSessions)
        .where(and(
          eq(acpCheckoutSessions.id, sessionId),
          eq(acpCheckoutSessions.agentId, req.agent!.id)
        ));

      if (!session) {
        return res.status(404).json({ error: "session_not_found" });
      }

      if (session.status === "completed") {
        return res.status(400).json({ error: "cannot_cancel_completed", message: "Completed sessions cannot be cancelled." });
      }

      await db.update(acpCheckoutSessions).set({
        status: "cancelled",
        cancelledAt: new Date(),
        updatedAt: new Date(),
        metadata: { ...(session.metadata as any || {}), cancelReason: reason },
      }).where(eq(acpCheckoutSessions.id, session.id));

      const cdiPenalty = Math.max(0, (req.agent!.cdiScore || 0) - 1);
      await db.update(agents).set({
        cdiScore: cdiPenalty,
        updatedAt: new Date(),
      }).where(eq(agents.id, req.agent!.id));

      await logAcpAction(req.agent!.id, "checkout.cancelled", req, 200);

      res.json({
        sessionId: session.id,
        status: "cancelled",
        cdiUpdate: {
          previousScore: req.agent!.cdiScore,
          newScore: cdiPenalty,
          penalty: -1,
          reason: "Cancellations reduce CDI. Reliable coordination is rewarded.",
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: "cancellation_failed" });
    }
  });

  // ============================================================
  // COORDINATION CHALLENGE - Proof of Work for agent verification
  // ============================================================
  app.post("/api/agent/challenge", acpAuthMiddleware, async (req: AgentRequest, res: Response) => {
    try {
      const agent = req.agent!;
      const challenge = generateChallenges();

      const [record] = await db.insert(agentChallenges).values({
        agentId: agent.id,
        challengeType: challenge.type,
        challengeData: challenge.data,
        expectedAnswer: challenge.answer,
        status: "issued",
        difficulty: challenge.difficulty,
        cdiReward: challenge.cdiReward,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      }).returning();

      await logAcpAction(agent.id, "challenge.issued", req, 200);

      res.json({
        challengeId: record.id,
        type: challenge.type,
        difficulty: challenge.difficulty,
        cdiReward: challenge.cdiReward,
        expiresAt: record.expiresAt,
        challenge: challenge.data,
        submitEndpoint: `POST /api/agent/challenge/${record.id}/solve`,
        instructions: "Solve the coordination puzzle and POST your answer. Correct solutions earn CDI points and a TOILE_VERIFIED_ token for elevated access.",
      });
    } catch (err: any) {
      console.error("[Challenge] Error:", err);
      res.status(500).json({ error: "challenge_generation_failed" });
    }
  });

  // ============================================================
  // SOLVE CHALLENGE - Submit answer to coordination puzzle
  // ============================================================
  app.post("/api/agent/challenge/:challengeId/solve", acpAuthMiddleware, async (req: AgentRequest, res: Response) => {
    try {
      const { challengeId } = req.params;
      const { answer } = req.body;

      if (!answer) {
        return res.status(400).json({ error: "answer is required" });
      }

      const [challenge] = await db
        .select()
        .from(agentChallenges)
        .where(and(
          eq(agentChallenges.id, challengeId),
          eq(agentChallenges.agentId, req.agent!.id)
        ));

      if (!challenge) {
        return res.status(404).json({ error: "challenge_not_found" });
      }

      if (challenge.status !== "issued") {
        return res.status(400).json({ error: "challenge_already_attempted", status: challenge.status });
      }

      if (new Date(challenge.expiresAt) < new Date()) {
        await db.update(agentChallenges).set({ status: "expired" }).where(eq(agentChallenges.id, challengeId));
        return res.status(400).json({ error: "challenge_expired", message: "Request a new challenge." });
      }

      const validation = validateAnswer(challenge.challengeType, challenge.expectedAnswer, answer);

      if (validation.correct) {
        const verificationToken = `TOILE_VERIFIED_${randomBytes(32).toString("base64url")}`;

        await db.update(agentChallenges).set({
          status: "solved",
          agentAnswer: answer,
          verificationToken,
          solvedAt: new Date(),
        }).where(eq(agentChallenges.id, challengeId));

        const newCdi = Math.min(100, (req.agent!.cdiScore || 0) + challenge.cdiReward);
        const newAutonomy = newCdi >= 80 ? "full" : newCdi >= 50 ? "conditional" : "restricted";

        await db.update(agents).set({
          cdiScore: newCdi,
          autonomyLevel: newAutonomy,
          updatedAt: new Date(),
        }).where(eq(agents.id, req.agent!.id));

        await logAcpAction(req.agent!.id, "challenge.solved", req, 200);

        res.json({
          status: "solved",
          score: validation.score,
          feedback: validation.feedback,
          verificationToken,
          tokenUsage: "Use this token as Bearer auth for elevated ACP access. It proves computational coordination competence.",
          cdiUpdate: {
            previousScore: req.agent!.cdiScore,
            newScore: newCdi,
            reward: challenge.cdiReward,
            autonomyLevel: newAutonomy,
          },
        });
      } else {
        await db.update(agentChallenges).set({
          status: "failed",
          agentAnswer: answer,
        }).where(eq(agentChallenges.id, challengeId));

        await logAcpAction(req.agent!.id, "challenge.failed", req, 200);

        res.json({
          status: "failed",
          score: validation.score,
          feedback: validation.feedback,
          hint: "Request a new challenge and try again. Each solved challenge builds your CDI.",
          retryEndpoint: "POST /api/agent/challenge",
        });
      }
    } catch (err: any) {
      console.error("[Challenge Solve] Error:", err);
      res.status(500).json({ error: "solve_failed" });
    }
  });

  // ============================================================
  // AGENT CDI HISTORY - View challenge history
  // ============================================================
  app.get("/api/agent/challenges", acpAuthMiddleware, async (req: AgentRequest, res: Response) => {
    const history = await db
      .select({
        id: agentChallenges.id,
        type: agentChallenges.challengeType,
        status: agentChallenges.status,
        difficulty: agentChallenges.difficulty,
        cdiReward: agentChallenges.cdiReward,
        score: agentChallenges.agentAnswer,
        solvedAt: agentChallenges.solvedAt,
        createdAt: agentChallenges.createdAt,
      })
      .from(agentChallenges)
      .where(eq(agentChallenges.agentId, req.agent!.id))
      .orderBy(desc(agentChallenges.createdAt))
      .limit(20);

    res.json({
      challenges: history,
      currentCdi: req.agent!.cdiScore,
      autonomyLevel: req.agent!.autonomyLevel,
    });
  });

  console.log("[ACP] Agentic Commerce Protocol endpoints registered - checkout, complete, cancel, challenges");
}
