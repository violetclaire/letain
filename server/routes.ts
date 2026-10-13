import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { randomUUID, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { storage } from "./storage";
import { setupAuth } from "./replitAuth";
import { isAuthenticated } from "./auth/current";
import { getAuthUserId } from "./auth/identity";
import * as googleCalendar from "./googleCalendarService";
import { registerSquareRoutes } from "./squareRoutes";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { GoogleGenAI, Modality } from "@google/genai";
import {
  coordinationRiskFactorValues,
  coordinationJudgmentLifecycleActionValues,
  humanAttestationKnowledgeBasisValues,
  humanAttestationLifecycleActionValues,
  scopedPermissionAuthorizationStateValues,
  scopedPermissionCapabilityFitValues,
  scopedPermissionDecisionValues,
  scopedPermissionLifecycleActionValues,
  humanActionDecisionChoiceValues,
  humanActionDecisionLifecycleActionValues,
} from "@shared/schema";
import {
  defaultScheduleOperatorDefaults,
  type ScheduleOperatorDefaults,
} from "@shared/schedulingIntelligence";
import {
  checkExpectedRevision,
  normalizeMemberId,
  stableContentId,
  stripRevisionFields,
  validateLegacyAppointmentWrite,
  validateSchedulePatchBody,
} from "./scheduleValidation";
import * as smsService from "./smsService";
import { processInboundSms } from "./inboundProcessor";
import * as iqsService from "./iqsService";
import { logActivity, getRecentActivity, getTodayActivity } from "./activityService";
import { calculateCDI, runSampleCalculations, CDIInput, SAMPLE_TRANSACTIONS } from "./cdiService";
import { assessCoordinationPath } from "./coordinationAssessment";
import { buildInquiryDecisionChain } from "./inquiry-decision-chain";

// Rate limiter for auth endpoints to prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window (increased to prevent lockouts)
  message: { message: "Too many login attempts, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts
  // trust proxy is set in index.ts, so express-rate-limit will use the correct client IP
  validate: { trustProxy: false, xForwardedForHeader: false },
});

// Zod schemas for auth input validation
const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/\d/, "Password must contain a number")
    .regex(/[A-Z]/, "Password must contain an uppercase letter"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const LOCAL_DEMO_OPERATOR_ID = "demo-operator-briarwood";
const LOCAL_DEMO_ARTIST_SLUG = "briarwood-demo";
const LOCAL_DEMO_ALLOWED_REDIRECT_PREFIXES = [
  `/admin/${LOCAL_DEMO_ARTIST_SLUG}`,
  "/inquiry-workspace",
  "/settings",
  "/artist/availability",
];

function isLocalDemoAccessEnabled(req: Request): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  const forwardedHost = Array.isArray(req.headers["x-forwarded-host"])
    ? req.headers["x-forwarded-host"][0]
    : req.headers["x-forwarded-host"];
  const rawHost = `${forwardedHost || req.headers.host || ""}`.split(",")[0].trim().toLowerCase();
  const host = rawHost.startsWith("[::1]") ? "::1" : rawHost.split(":")[0];

  return (
    process.env.BRIARWOOD_DEMO_MODE === "true" ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1"
  );
}

function safeLocalDemoRedirect(redirectTo: unknown): string {
  if (typeof redirectTo !== "string" || !redirectTo.startsWith("/")) {
    return `/admin/${LOCAL_DEMO_ARTIST_SLUG}`;
  }

  return LOCAL_DEMO_ALLOWED_REDIRECT_PREFIXES.some((prefix) => redirectTo === prefix || redirectTo.startsWith(`${prefix}/`))
    ? redirectTo
    : `/admin/${LOCAL_DEMO_ARTIST_SLUG}`;
}

const coordinationPathCreateSchema = z.object({
  routeTargetId: z.string().optional().nullable(),
  candidateRouteId: z.string().optional().nullable(),
  contextCaptured: z.boolean().optional(),
  timingConstraints: z.record(z.unknown()).optional(),
  authorityState: z.string().optional(),
  availabilityState: z.string().optional(),
  handoffState: z.string().optional(),
  escalationState: z.string().optional(),
  recoveryCapacity: z.string().optional(),
  commitmentState: z.string().optional(),
  outcomeVerificationState: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const coordinationPathUpdateSchema = coordinationPathCreateSchema.extend({
  status: z.string().optional(),
  pathRisk: z.array(z.enum(coordinationRiskFactorValues)).optional(),
  signalProvenance: z.array(z.string()).optional(),
}).partial();

const coordinationEventCreateSchema = z.object({
  eventType: z.string().min(1),
  eventSource: z.string().optional(),
  summary: z.string().min(1),
  signalProvenance: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || "",
  },
});
import { 
  User, ArtistProfile, Inquiry, Booking, Contract, ClientContact, BookingChecklist, Proposal, type FormConfig, artistProfiles, inquiries, users, blockedDates, availability, trustedCircle,
  insertArtistProfileSchema,
  insertBookingSchema,
  insertMessageSchema,
  insertContractSchema,
  insertPaymentSchema,
  insertAvailabilitySchema,
  insertScheduleSchema,
  insertChatInviteSchema,
  insertClientIntakeSchema,
  insertArtistIntakeSchema,
  insertPlannerIntakeSchema,
  insertSupportCaseSchema,
  insertCdiEventSchema,
  insertCdiThresholdSchema,
  insertCdiAdminOverrideSchema,
  insertInquirySchema,
  insertRouteTargetSchema,
  insertInquiryRouteSchema,
  insertInquiryResponseSchema,
  threadReferrals,
  threads,
  type DeliveryPreview
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, inArray, isNotNull } from "drizzle-orm";

// Default form configuration for new artists
function getDefaultFormConfig(): FormConfig {
  return {
    fields: [
      { id: 'name', type: 'text', label: 'Your Name', placeholder: 'Full name', required: true, order: 0, isCore: true },
      { id: 'email', type: 'email', label: 'Email', placeholder: 'your@email.com', required: true, order: 1, isCore: true },
      { id: 'phone', type: 'phone', label: 'Phone Number', placeholder: '(555) 123-4567', required: false, order: 2 },
      { id: 'eventDate', type: 'date', label: 'Event Date', required: true, order: 3, isCore: true },
      { id: 'eventLocation', type: 'text', label: 'Event Location', placeholder: 'City, State or Venue', required: false, order: 4 },
      { id: 'serviceType', type: 'select', label: 'Service Type', required: true, order: 5, options: ['Bridal Makeup', 'Bridal Hair', 'Both Hair & Makeup', 'Trial Session', 'Other'] },
      { id: 'partySize', type: 'text', label: 'Wedding Party Size', placeholder: 'Number of people needing services', required: false, order: 6 },
      { id: 'message', type: 'textarea', label: 'Tell me about your vision', placeholder: 'Share any details about your event, style preferences, or questions...', required: false, order: 7 },
    ],
    submitButtonText: 'Send Inquiry',
    successMessage: 'Thank you! Your inquiry has been received. You will hear back within 24-48 hours.',
  };
}

// Dynamic CDI imports to avoid bundling issues
interface CdiAgentModule {
  analyzeMessage: (message: string, context?: any) => Promise<any>;
  applyAdaptiveLearning: (feedback: any) => Promise<void>;
}

interface CdiEngineModule {
  recordBehavioralEvent: (event: any) => Promise<void>;
  getDynamicWeights: () => Promise<{ emotionalFidelity: number; choreographyAwareness: number; roleSpecificRecall: number }>;
  analyzeForCDI: (userId: string, bookingId?: string) => Promise<any>;
  storeCdiCompositeScore: (userId: string, score: number, riskLevel: string, factors: any) => Promise<void>;
}

interface CdiRealtimeModule {
  computeCDIRealtime: (data: any) => any;
}

interface AiChatModule {
  processAIChatMessage: (userId: string, message: string, conversationId?: string) => Promise<{ response: string }>;
  updateAvailabilityFromAI: (userId: string, availabilityData: any) => Promise<void>;
  createBookingFromAI: (data: any) => Promise<{ success: boolean; error?: string }>;
  createContractFromAI: (data: any) => Promise<{ success: boolean; error?: string }>;
  sendThankYouEmailFromAI: (data: any) => Promise<{ success: boolean; error?: string }>;
  generateImageFromAI: (data: any) => Promise<{ success: boolean; error?: string }>;
  searchFromAI: (data: any) => Promise<{ success: boolean; error?: string }>;
  forwardCommunicationToArtist: (data: any) => Promise<{ success: boolean; error?: string }>;
}

interface BusinessChatAgentModule {
  analyzeBusinessChatMessage: (message: string, context: any) => Promise<any>;
}

let cdiAgent: CdiAgentModule | null = null;
let cdiEngine: CdiEngineModule | null = null;
let cdiRealtime: CdiRealtimeModule | null = null;
let aiChat: AiChatModule | null = null;
let businessChatAgent: BusinessChatAgentModule | null = null;

async function loadCDI() {
  if (!cdiAgent) {
    try {
      cdiAgent = await import("./cdiAgent");
    } catch (err) {
      console.warn("[CDI] Failed to load cdiAgent:", err);
      cdiAgent = { analyzeMessage: () => {}, applyAdaptiveLearning: () => {} };
    }
  }
  if (!cdiEngine) {
    try {
      cdiEngine = await import("./cdiEngine");
    } catch (err) {
      console.warn("[CDI] Failed to load cdiEngine:", err);
      cdiEngine = { recordBehavioralEvent: () => {}, getDynamicWeights: async () => ({ emotionalFidelity: 40, choreographyAwareness: 30, roleSpecificRecall: 30 }), analyzeForCDI: () => {}, storeCdiCompositeScore: () => {} };
    }
  }
  if (!cdiRealtime) {
    try {
      cdiRealtime = await import("./cdiRealtime");
    } catch (err) {
      console.warn("[CDI Realtime] Failed to load cdiRealtime:", err);
      cdiRealtime = { computeCDIRealtime: () => ({}) };
    }
  }
  if (!aiChat) {
    try {
      aiChat = await import("./aiChat");
    } catch (err) {
      console.warn("[AI Chat] Failed to load aiChat:", err);
      aiChat = { 
        processAIChatMessage: async () => ({ response: "AI chat is currently unavailable." }), 
        updateAvailabilityFromAI: async () => {}, 
        createBookingFromAI: async () => ({ success: false, error: "AI unavailable" }),
        createContractFromAI: async () => ({ success: false, error: "AI unavailable" }),
        sendThankYouEmailFromAI: async () => ({ success: false, error: "AI unavailable" }),
        generateImageFromAI: async () => ({ success: false, error: "AI unavailable" }),
        searchFromAI: async () => ({ success: false, error: "AI unavailable" }),
        forwardCommunicationToArtist: async () => ({ success: false, error: "AI unavailable" })
      };
    }
  }
  if (!businessChatAgent) {
    try {
      businessChatAgent = await import("./businessChatAgent");
    } catch (err) {
      console.warn("[Business Chat AI] Failed to load businessChatAgent:", err);
      businessChatAgent = { analyzeBusinessChatMessage: async () => ({ pivotType: null, urgencyLevel: 1, clientImpact: null, clientImpactScore: 0, taskType: null, estimatedLaborMinutes: null, sentiment: 'neutral', confidenceScore: 0, aiSummary: 'Analysis unavailable', shouldCreateCdiEvent: false }) };
    }
  }
}

export { getAuthUserId };

// Helper to analyze sentiment of inquiry messages using CDI agent
// DISABLED: Automatic analysis disabled to save AI costs. Will be re-enabled with manual "liaison" button later.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function analyzeInquirySentiment(_inquiryId: string, _message: string, _context?: { clientName?: string; eventDate?: Date }) {
  // Feature disabled for now - can be re-enabled when liaison button is added
  return;
}

// Helper to parse date strings as local time to avoid timezone issues
// When a date string like "2026-01-01" is passed to new Date(), it's interpreted as UTC midnight
// which can shift to the previous day in local time for timezones behind UTC
function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  // If already has time component, parse as-is
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  // Add noon time to avoid timezone day-shift issues
  return new Date(dateStr + 'T12:00:00');
}

// Helper to generate contract HTML for the signing page
function generateContractHtml(contract: Contract, client: User | null, artistName: string): string {
  const formatCurrency = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const clientName = contract.clientName || client?.firstName || 'Client';
  const clientLastName = client?.lastName || '';
  const fullClientName = `${clientName} ${clientLastName}`.trim();
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  
  // Build service items table (Attachment A)
  let serviceItemsHtml = '';
  if (contract.serviceItems && Array.isArray(contract.serviceItems) && contract.serviceItems.length > 0) {
    serviceItemsHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background: #f5f1e8;">
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Client</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">QTY</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Service</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Price</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${(contract.serviceItems as any[]).map((item: any) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${item.clientType || ''}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.qty || 1}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${item.service || ''}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(item.price || 0)}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(item.total || 0)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="font-weight: bold;">
            <td colspan="4" style="padding: 8px; border: 1px solid #ddd; text-align: right;">Total</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${formatCurrency(contract.totalAmount)}</td>
          </tr>
        </tfoot>
      </table>
    `;
  }

  return `
    <div style="font-family: 'Georgia', serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="font-size: 24px; color: #6B4A55; margin-bottom: 8px;">${artistName}</h1>
        <h2 style="font-size: 18px; color: #333; font-weight: normal;">Service Contract</h2>
      </div>
      
      <p>This service contract is entered into as of ${today} between ${fullClientName} (Client) and ${artistName} (Artist). The Client and the Artist agree as follows:</p>
      
      <h3 style="border-bottom: 2px solid #6B4A55; padding-bottom: 8px; margin-top: 32px;">1. SERVICE to be PROVIDED</h3>
      <p>Artist will provide services to client as specified in Attachment A.</p>
      
      <h3 style="border-bottom: 2px solid #6B4A55; padding-bottom: 8px; margin-top: 32px;">2. LOCATION of SERVICE</h3>
      <p>The service will take place at the following location: ${contract.eventLocation || 'To be determined'}</p>
      
      <h3 style="border-bottom: 2px solid #6B4A55; padding-bottom: 8px; margin-top: 32px;">3. DATE and TIME of SERVICE</h3>
      <p>The date of Service: ${contract.eventDates || 'To be determined'}</p>
      <p>Service Begins: ${contract.serviceStartTime || 'TBD'} (We will arrive a few minutes early to set up)</p>
      <p>Service Completion: ${contract.serviceEndTime || 'TBD'}</p>
      
      <h3 style="border-bottom: 2px solid #6B4A55; padding-bottom: 8px; margin-top: 32px;">4. PARKING</h3>
      <p>Valet parking is required for all hotel getting ready locations. The amount of equipment required for day of services is extensive and to ensure ease for the artist and timely arrival, valet parking will be charged to the room at the time of arrival.</p>
      
      <h3 style="border-bottom: 2px solid #6B4A55; padding-bottom: 8px; margin-top: 32px;">5. PAYMENT</h3>
      <p>In full consideration for all services rendered by Artist at the location, the Client agrees to make deposit and payment in U.S. funds to the Artist, as provided in Attachment A.</p>
      
      <h3 style="border-bottom: 2px solid #6B4A55; padding-bottom: 8px; margin-top: 32px;">6. CANCELLATION</h3>
      <p>Cancellations can be made 30 days prior to the event without penalty other than loss of the retainer amount. In case of cancellations less than two calendar weeks retainer and final payment will not be refunded. The retainer is non refundable.</p>
      <p>The Artist's obligation is to give services as provided in Attachment A. If Artist is unavailable as a result of sickness, accidents, acts of God or other reasons beyond the Artist's control, artist will make all commercially reasonable efforts to arrange for comparable services agreed upon within this contract.</p>
      
      <h3 style="border-bottom: 2px solid #6B4A55; padding-bottom: 8px; margin-top: 32px;">7. MISCELLANEOUS</h3>
      <p>The service contract and specified attachments set forth the entire agreement between the Artist and Client, and may not be amended except in writing signed by both parties. This service contract will be governed by and construed in accordance with the laws of the State of California.</p>
      
      <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #ccc;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
          <div style="width: 45%;">
            <p style="border-bottom: 1px solid #000; padding-bottom: 8px; margin-bottom: 4px;">Client Signature</p>
            <p style="font-size: 12px; color: #666;">Date: _______________</p>
          </div>
          <div style="width: 45%;">
            <p style="border-bottom: 1px solid #000; padding-bottom: 8px; margin-bottom: 4px;">Artist Signature</p>
            <p style="font-size: 12px; color: #666;">${artistName}</p>
            <p style="font-size: 12px; color: #666;">Date: _______________</p>
          </div>
        </div>
      </div>
      
      <h3 style="border-bottom: 2px solid #6B4A55; padding-bottom: 8px; margin-top: 48px;">Attachment A</h3>
      ${serviceItemsHtml || `<p>${contract.packageDetails || 'Services as agreed'}</p>`}
      
      <div style="margin-top: 24px;">
        <p><strong>Client Contact:</strong> ${contract.clientContact || client?.email || ''}</p>
        ${contract.photographerInfo ? `<p><strong>Photographer:</strong> ${contract.photographerInfo}</p>` : ''}
      </div>
      
      <div style="margin-top: 24px;">
        <p><strong>Payment:</strong></p>
        <p>A Square invoice will be sent for payment</p>
        <ul style="margin-top: 8px;">
          <li>Retainer amount is to hold the date: ${formatCurrency(contract.depositAmount || 0)}. No date is guaranteed without the signed contract and retainer amount. Retainer is non refundable and required at the same time.</li>
          <li>Payment of Balance: Two weeks before wedding date the Client will pay the Artist the remaining balance of ${formatCurrency((contract.totalAmount || 0) - (contract.depositAmount || 0))} via Square invoice</li>
        </ul>
      </div>
    </div>
  `;
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Setup Replit Auth
  await setupAuth(app);
  
  // Load CDI modules
  await loadCDI();

  // Register Square payment routes
  registerSquareRoutes(app, isAuthenticated, getAuthUserId);

  // ========== AUTH ROUTES ==========
  // This endpoint returns null if not authenticated (doesn't require isAuthenticated)
  // so the client can gracefully detect logged-out state without 401 loops
  app.get('/api/auth/user', async (req: Request, res: Response) => {
    try {
      let user = null;
      const hasCookie = !!req.headers.cookie?.includes('connect.sid');
      const sessionId = req.session?.userId;
      console.log(`[/api/auth/user] hasCookie=${hasCookie}, sessionUserId=${sessionId || 'none'}`);
      
      // Check for email/password session first
      if (req.session?.userId) {
        user = await storage.getUser(req.session.userId);
        console.log(`[/api/auth/user] Found user by session:`, user?.id);
      } else if (req.user?.claims?.sub) {
        // Fall back to Replit OAuth
        const userId = getAuthUserId(req);
        user = await storage.getUser(userId);
        console.log(`[/api/auth/user] Found user by OAuth:`, user?.id);
      }
      
      if (!user) {
        console.log(`[/api/auth/user] No user found, returning null`);
        return res.json(null);
      }
      
      // Include artist_slug for artists
      if (user.role === 'artist') {
        const artistProfile = await storage.getArtistProfile(user.id);
        return res.json({ ...user, artistSlug: artistProfile?.artistSlug || null });
      }
      
      res.json(user);
    } catch (error: any) {
      console.error("Error fetching user:", error);
      res.json(null);
    }
  });

  // Email/Password Signup (with rate limiting and Zod validation)
  app.post('/api/auth/signup', authLimiter, async (req, res) => {
    try {
      // Validate input with Zod
      const parseResult = signupSchema.safeParse(req.body);
      if (!parseResult.success) {
        const firstError = parseResult.error.errors[0];
        return res.status(400).json({ message: firstError.message });
      }

      const { email, password, firstName, lastName } = parseResult.data;

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
      });

      // Set session
      req.session.userId = user.id;

      res.json({ 
        message: "Account created successfully", 
        user: { ...user, password: undefined }
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Email/Password Login (with rate limiting and Zod validation)
  app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
      // Validate input with Zod
      const parseResult = loginSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: parseResult.error.errors[0].message });
      }

      const { email, password } = parseResult.data;

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check if user has a password set
      if (!user.password) {
        return res.status(401).json({ message: "No password set for this account. Click 'Get a login link instead' below." });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Set session
      req.session.userId = user.id;

      // Try to get artist profile for redirect (check for ALL users, not just role='artist')
      let artistSlug: string | null = null;
      let artistProfileDebug: string | null = null;
      // Always check for artist profile regardless of role
      console.log("[Login] Checking for artist profile, userId:", user.id, "role:", user.role);
      let artistProfile = await storage.getArtistProfile(user.id);
      
      // If no profile found by userId, search ALL profiles and link the first matching one
      if (!artistProfile) {
        const allProfiles = await db.select().from(artistProfiles);
        
        // Find any profile that might belong to this user
        const emailPrefix = email.split('@')[0].toLowerCase();
        let matchedProfile = allProfiles.find(p => {
          const slug = p.artistSlug?.toLowerCase() || '';
          const bizName = p.businessName?.toLowerCase() || '';
          return slug.includes(emailPrefix) || bizName.includes(emailPrefix);
        });
        
        // If no match by email, just take the first available profile (for single-user setups)
        if (!matchedProfile && allProfiles.length > 0) {
          matchedProfile = allProfiles[0];
        }
        
        if (matchedProfile) {
          // Link the profile to the user and approve it
          await db.update(artistProfiles)
            .set({ 
              userId: user.id,
              verificationStatus: 'approved',
              onboardingCompleted: true
            })
            .where(eq(artistProfiles.id, matchedProfile.id));
          
          // Also ensure user role is artist
          await db.update(users)
            .set({ role: 'artist' })
            .where(eq(users.id, user.id));
          
          artistProfile = matchedProfile;
          artistSlug = matchedProfile.artistSlug || null;
        }
      } else {
        artistSlug = artistProfile.artistSlug || null;
        
        // Also auto-approve if pending
        if ((artistProfile as any).verificationStatus === 'pending') {
          await db.update(artistProfiles)
            .set({ verificationStatus: 'approved' })
            .where(eq(artistProfiles.id, artistProfile.id));
        }
      }
      
      if (!artistSlug) {
        artistProfileDebug = `No artist profile found for userId=${user.id} or email=${email}`;
        console.log("[Login]", artistProfileDebug);
      }

      console.log("[Login] Success for user:", user.id);
      
      // Save session before responding (critical for production)
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log("[Login] Session saved successfully");
      
      res.json({ 
        message: "Login successful", 
        user: { ...user, password: undefined },
        artistSlug,
        artistProfileDebug
      });
    } catch (error: any) {
      console.error("[Login] Error:", error.message, error.stack);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Email/Password Logout
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // ========== DEMO ACCESS (Magic Link - No Login Required) ==========
  app.get('/api/demo/access/:token', async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      // Find the demo profile with this edit_token
      const [profile] = await db.select().from(artistProfiles)
        .where(eq(artistProfiles.editToken, token));
      
      if (!profile) {
        return res.status(404).json({ message: "Demo not found" });
      }
      
      // Get the user associated with this profile
      const user = await storage.getUser(profile.userId);
      if (!user) {
        return res.status(404).json({ message: "Demo user not found" });
      }
      
      // Set up session for the demo user
      req.session.userId = user.id;
      
      // Save session
      await new Promise<void>((resolve, reject) => {
        req.session.save((err: Error) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      console.log("[Demo] Magic link access granted for:", profile.artistSlug);
      
      // Redirect to admin page
      res.redirect(`/admin/${profile.artistSlug}`);
    } catch (error: any) {
      console.error("[Demo] Error:", error.message);
      res.status(500).json({ message: "Failed to access demo" });
    }
  });

  app.post('/api/demo/local-access', async (req: Request, res: Response) => {
    try {
      if (!isLocalDemoAccessEnabled(req)) {
        return res.status(404).json({ message: "Local demo access is unavailable" });
      }

      const [profile] = await db.select().from(artistProfiles)
        .where(eq(artistProfiles.artistSlug, LOCAL_DEMO_ARTIST_SLUG));

      if (!profile || profile.userId !== LOCAL_DEMO_OPERATOR_ID) {
        return res.status(404).json({ message: "Local demo operator profile not found" });
      }

      const user = await storage.getUser(profile.userId);
      if (!user || user.id !== LOCAL_DEMO_OPERATOR_ID || user.role !== "artist") {
        return res.status(404).json({ message: "Local demo operator not found" });
      }

      req.session.userId = user.id;

      await new Promise<void>((resolve, reject) => {
        req.session.save((err: Error) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({
        message: "Local demo session started",
        user: { ...user, password: undefined },
        artistSlug: profile.artistSlug,
        redirectTo: safeLocalDemoRedirect(req.body?.redirectTo),
      });
    } catch (error: any) {
      console.error("[LocalDemoAccess] Error:", error.message);
      res.status(500).json({ message: "Failed to start local demo session" });
    }
  });

  // Password reset flow
  app.post('/api/auth/request-password-reset', authLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      
      // Find user by email
      let user = await storage.getUserByEmail(normalizedEmail);
      
      // Also check if there's an artist profile with this email
      const profile = user ? await storage.getArtistProfile(user.id) : null;
      
      // If no user but there's a matching artist profile by slug pattern, find it
      let matchedProfile = profile;
      if (!user) {
        const allProfiles = await db.select().from(artistProfiles);
        const emailPrefix = normalizedEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        matchedProfile = allProfiles.find(p => {
          const slug = p.artistSlug?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
          // Match if slug contains email prefix or vice versa
          return slug.includes(emailPrefix) || emailPrefix.includes(slug);
        });
      }
      
      // Always return success (don't reveal if email exists)
      // But only send email if we found a matching profile
      if (matchedProfile) {
        const resetToken = randomUUID();
        const tokenExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        
        // Store token in the profile
        await db.update(artistProfiles)
          .set({ loginCode: resetToken, loginCodeExpiresAt: tokenExpires })
          .where(eq(artistProfiles.id, matchedProfile.id));
        
        // Send password reset email
        const baseUrl = process.env.PUBLIC_BASE_URL || 'https://dateinquiry.com';
        const resetUrl = `${baseUrl}/reset-password/${resetToken}`;
        
        const { sendEmail } = await import('./emailService');
        await sendEmail({
          to: normalizedEmail,
          subject: 'Reset Your Password',
          html: `
            <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <h1 style="font-family: Fraunces, Georgia, serif; font-size: 24px; margin-bottom: 24px;">Reset Your Password</h1>
              <p style="margin-bottom: 24px;">Click the link below to set a new password. This link expires in 30 minutes.</p>
              <a href="${resetUrl}" style="display: inline-block; background: #1A1A1A; color: #F5F0E8; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Set New Password</a>
              <p style="margin-top: 24px; color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
          `
        });
      }
      
      // Always return success to prevent email enumeration
      res.json({ message: "If an account exists with that email, a reset link has been sent." });
    } catch (error: any) {
      console.error("[PasswordReset] Error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  app.post('/api/auth/complete-password-reset', authLimiter, async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      
      // Find profile with this token
      const [profile] = await db.select().from(artistProfiles)
        .where(eq(artistProfiles.loginCode, token));
      
      if (!profile) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }
      
      if (profile.loginCodeExpiresAt && new Date(profile.loginCodeExpiresAt) < new Date()) {
        return res.status(400).json({ message: "Reset link has expired. Please request a new one." });
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Find or create user - profile.userId links to the user
      let user = profile.userId ? await storage.getUser(profile.userId) : null;
      
      // Get the email from the request (stored when the reset was requested)
      // We need to pass it through, or look up the user by the profile's userId
      const userEmail = user?.email || `${profile.artistSlug}@dateinquiry.com`;
      
      if (!user) {
        // Create new user with email based on artistSlug
        user = await storage.createUser({
          email: userEmail,
          password: hashedPassword,
        });
        await storage.updateUserRole(user.id, 'artist');
        
        // Link to profile
        await db.update(artistProfiles)
          .set({ userId: user.id, verificationStatus: 'approved', onboardingCompleted: true })
          .where(eq(artistProfiles.id, profile.id));
      } else {
        // Update existing user's password
        await storage.updateUser(user.id, { password: hashedPassword });
      }
      
      // Clear the reset token IMMEDIATELY (before session setup) to prevent reuse
      await db.update(artistProfiles)
        .set({ loginCode: null, loginCodeExpiresAt: null })
        .where(eq(artistProfiles.id, profile.id));
      
      // Log them in - set session
      req.session.userId = user.id;
      
      // Save session and wait for it to complete
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      
      res.json({ 
        message: "Password set successfully",
        artistSlug: profile.artistSlug
      });
    } catch (error: any) {
      console.error("[PasswordReset] Error:", error);
      res.status(500).json({ message: "Failed to set password" });
    }
  });

  // Password reset - traditional flow
  app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      let user = await storage.getUserByEmail(normalizedEmail);
      
      // If user doesn't exist but there's a matching artist profile, create the user
      if (!user) {
        const allProfiles = await db.select().from(artistProfiles);
        const emailPrefix = normalizedEmail.split('@')[0].toLowerCase();
        
        const matchedProfile = allProfiles.find(p => {
          const slug = p.artistSlug?.toLowerCase() || '';
          return slug.includes(emailPrefix) || normalizedEmail.includes(slug);
        });
        
        if (matchedProfile) {
          user = await storage.createUser({
            email: normalizedEmail,
            password: '', // Will be set via reset flow
          });
          await storage.updateUserRole(user.id, 'artist');
          
          await db.update(artistProfiles)
            .set({ userId: user.id, verificationStatus: 'approved' })
            .where(eq(artistProfiles.id, matchedProfile.id));
        }
      }
      
      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ message: "If an account exists with this email, a reset link has been sent" });
      }
      
      // Generate reset token
      const resetToken = randomUUID();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      
      // Save token to user
      await storage.updateUser(user.id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      });
      
      // Send reset email
      try {
        const { sendPasswordResetEmail } = await import('./emailService');
        const baseUrl = process.env.PUBLIC_BASE_URL || 'https://briarwood.ai';
        
        await sendPasswordResetEmail({
          toEmail: user.email!,
          userName: user.firstName || 'there',
          resetLink: `${baseUrl}/reset-password?token=${resetToken}`,
        });
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError);
        // Still return success to prevent enumeration
      }
      
      res.json({ message: "If an account exists with this email, a reset link has been sent" });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  });

  // Verify reset token is valid
  app.get('/api/auth/verify-reset-token', async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.json({ valid: false });
      }
      
      const user = await storage.getUserByResetToken(token);
      
      if (!user || !user.passwordResetExpires || new Date(user.passwordResetExpires) < new Date()) {
        return res.json({ valid: false });
      }
      
      res.json({ valid: true });
    } catch (error: any) {
      console.error("Verify reset token error:", error);
      res.json({ valid: false });
    }
  });

  // Reset password with token
  app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }
      
      // Validate password
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      if (!/\d/.test(password)) {
        return res.status(400).json({ message: "Password must contain a number" });
      }
      if (!/[A-Z]/.test(password)) {
        return res.status(400).json({ message: "Password must contain an uppercase letter" });
      }
      
      const user = await storage.getUserByResetToken(token);
      
      if (!user || !user.passwordResetExpires || new Date(user.passwordResetExpires) < new Date()) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }
      
      // Hash new password and clear reset token
      const hashedPassword = await bcrypt.hash(password, 10);
      await storage.updateUser(user.id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      });
      
      res.json({ message: "Password reset successfully" });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  });

  // ========== USERNAME MANAGEMENT ==========
  app.get("/api/users/check-username/:username", async (req, res) => {
    try {
      const { username } = req.params;
      
      // Validate username format: 3-30 chars, alphanumeric and underscores only
      const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({ 
          available: false, 
          error: "Username must be 3-30 characters, using only letters, numbers, and underscores" 
        });
      }
      
      // Check for reserved words
      const reservedWords = ['admin', 'artist', 'client', 'planner', 'api', 'login', 'signup', 'register', 'settings', 'profile', 'briarwood', 'support', 'help', 'browse', 'search', 'waitlist', 'onboarding'];
      if (reservedWords.includes(username.toLowerCase())) {
        return res.status(400).json({ available: false, error: "This username is reserved" });
      }
      
      const isAvailable = await storage.isUsernameAvailable(username);
      res.json({ available: isAvailable });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });

  app.patch("/api/users/:id/username", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const requesterId = getAuthUserId(req);
      const targetId = req.params.id;
      const { username } = req.body;
      
      if (!requesterId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Users can only update their own username unless they're admin
      const requester = await storage.getUser(requesterId);
      if (requesterId !== targetId && requester?.role !== 'admin') {
        return res.status(403).json({ error: "You can only update your own username" });
      }
      
      // Validate username format
      const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({ 
          error: "Username must be 3-30 characters, using only letters, numbers, and underscores" 
        });
      }
      
      // Check for reserved words
      const reservedWords = ['admin', 'artist', 'client', 'planner', 'api', 'login', 'signup', 'register', 'settings', 'profile', 'briarwood', 'support', 'help', 'browse', 'search', 'waitlist', 'onboarding'];
      if (reservedWords.includes(username.toLowerCase())) {
        return res.status(400).json({ error: "This username is reserved" });
      }
      
      // Check availability
      const isAvailable = await storage.isUsernameAvailable(username);
      if (!isAvailable) {
        // Check if it's the user's current username
        const targetUser = await storage.getUser(targetId);
        if (targetUser?.username?.toLowerCase() !== username.toLowerCase()) {
          return res.status(400).json({ error: "This username is already taken" });
        }
      }
      
      const user = await storage.updateUsername(targetId, username);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== ACTIVITY TRACKING ==========
  app.get("/api/activity/recent", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const limit = parseInt(req.query.limit as string) || 20;
      const activity = await getRecentActivity(userId, limit);
      res.json(activity);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/activity/today", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const activity = await getTodayActivity(userId);
      res.json(activity);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== USER ROLE UPDATE ==========
  app.patch("/api/users/:id/role", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { role } = req.body;
      if (!['client', 'artist', 'planner', 'admin'].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      const user = await storage.updateUserRole(req.params.id, role);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Update user profile (email, name, phone)
  app.patch("/api/users/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const requesterId = getAuthUserId(req);
      const targetId = req.params.id;
      
      if (!requesterId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Users can only update their own profile unless they're admin
      const requester = await storage.getUser(requesterId);
      if (requesterId !== targetId && requester?.role !== 'admin') {
        return res.status(403).json({ error: "You can only update your own profile" });
      }
      
      const { email, firstName, lastName, phone, profileImageUrl, notificationPreferences } = req.body;
      const updateData: Partial<User> = {};
      if (email !== undefined) updateData.email = email;
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (phone !== undefined) updateData.phone = phone;
      if (profileImageUrl !== undefined) updateData.profileImageUrl = profileImageUrl;
      if (notificationPreferences !== undefined) updateData.notificationPreferences = notificationPreferences;
      
      const user = await storage.updateUser(targetId, updateData);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Delete user account
  app.delete("/api/users/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const requesterId = getAuthUserId(req);
      const targetId = req.params.id;
      
      if (!requesterId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Users can only delete their own account unless they're admin
      const requester = await storage.getUser(requesterId);
      if (requesterId !== targetId && requester?.role !== 'admin') {
        return res.status(403).json({ error: "You can only delete your own account" });
      }
      
      // Check if user exists
      const userToDelete = await storage.getUser(targetId);
      if (!userToDelete) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Create audit log before deletion
      await storage.createAuditLog({
        action: 'account_deleted',
        entityType: 'user',
        entityId: targetId,
        performedBy: requesterId,
        changes: {
          deletedEmail: userToDelete.email,
          deletedRole: userToDelete.role,
          deletedBy: requesterId === targetId ? 'self' : 'admin',
        },
      });
      
      // Delete the user and all related data
      await storage.deleteUser(targetId);
      
      // Destroy session if user deleted their own account
      if (requesterId === targetId && req.session) {
        req.session.destroy(() => {});
      }
      
      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error: any) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: error.message || "Failed to delete account" });
    }
  });

  // CDI Consent Management
  app.post("/api/users/:id/cdi-consent", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const requesterId = getAuthUserId(req);
      const targetId = req.params.id;
      
      // Users can only update their own consent unless they're admin
      const requester = await storage.getUser(requesterId);
      if (requesterId !== targetId && requester?.role !== 'admin') {
        return res.status(403).json({ error: "You can only update your own consent" });
      }
      
      const { optOut } = req.body;
      const existingUser = await storage.getUser(targetId);
      
      const updateData: any = {
        cdiOptOut: optOut === true,
      };
      
      // If enabling (opting in), also set consent if not already given
      if (!optOut && !existingUser?.cdiConsentGiven) {
        updateData.cdiConsentGiven = true;
        updateData.cdiConsentDate = new Date();
      }
      
      const user = await storage.updateUser(targetId, updateData);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Audit log the consent change
      await storage.createAuditLog({
        action: optOut ? 'cdi_opt_out' : 'cdi_opt_in',
        entityType: 'cdi_consent',
        entityId: targetId,
        performedBy: requesterId,
        changes: {
          previousOptOut: existingUser?.cdiOptOut,
          newOptOut: optOut,
          previousConsent: existingUser?.cdiConsentGiven,
          newConsent: user.cdiConsentGiven,
          timestamp: new Date().toISOString(),
        },
      });
      
      res.json({ success: true, cdiOptOut: user.cdiOptOut, cdiConsentGiven: user.cdiConsentGiven });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== CDI (Choreography Depth Index) API ==========
  
  // CDI Calculation Endpoint
  // POST /api/calculate-cdi
  // Calculates trust score from coordination behavioral data
  app.post("/api/calculate-cdi", async (req, res) => {
    try {
      const { behavior, complexity, customThresholds } = req.body;
      
      // Validate required fields
      if (!behavior) {
        return res.status(400).json({ 
          error: "Missing required field: behavior",
          required: {
            behavior: {
              responseTimesMinutes: "number[] - Response times in minutes",
              communicationFrequency: "number - Messages per hour during active coordination",
              iterationsToAlignment: "number - Number of iterations to reach alignment",
              proactiveRatio: "number (0-1) - Ratio of proactive vs reactive communication",
              historicalCompletionRate: "number (0-100) - Historical completion quality",
            },
            complexity: "string - 'simple' | 'medium' | 'complex'"
          }
        });
      }
      
      if (!complexity || !['simple', 'medium', 'complex'].includes(complexity)) {
        return res.status(400).json({ 
          error: "Invalid or missing complexity field",
          validValues: ['simple', 'medium', 'complex'],
          description: {
            simple: "1-artist, 2hr engagement",
            medium: "3-artists, 4hr engagement",
            complex: "Wedding, 6+ artists, 8hr"
          }
        });
      }
      
      // Validate behavior fields
      const requiredBehaviorFields = [
        'responseTimesMinutes',
        'communicationFrequency',
        'iterationsToAlignment',
        'proactiveRatio',
        'historicalCompletionRate'
      ];
      
      const missingFields = requiredBehaviorFields.filter(f => behavior[f] === undefined);
      if (missingFields.length > 0) {
        return res.status(400).json({
          error: `Missing required behavior fields: ${missingFields.join(', ')}`,
        });
      }
      
      // Validate numeric ranges
      if (behavior.proactiveRatio < 0 || behavior.proactiveRatio > 1) {
        return res.status(400).json({ error: "proactiveRatio must be between 0 and 1" });
      }
      if (behavior.historicalCompletionRate < 0 || behavior.historicalCompletionRate > 100) {
        return res.status(400).json({ error: "historicalCompletionRate must be between 0 and 100" });
      }
      
      const input: CDIInput = {
        behavior,
        complexity,
        customThresholds,
      };
      
      const result = calculateCDI(input);
      
      res.json(result);
    } catch (error: any) {
      console.error("[CDI API] Calculation error:", error);
      res.status(500).json({ error: error.message || "CDI calculation failed" });
    }
  });
  
  // CDI Sample Calculations Endpoint
  // GET /api/cdi/samples
  // Returns sample calculations demonstrating the algorithm across complexity levels
  app.get("/api/cdi/samples", async (req, res) => {
    try {
      const samples = runSampleCalculations();
      res.json({
        description: "Sample CDI calculations demonstrating trust scoring across transaction complexities",
        samples,
        sampleInputs: SAMPLE_TRANSACTIONS,
      });
    } catch (error: any) {
      console.error("[CDI API] Samples error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // CDI Algorithm Documentation Endpoint
  // GET /api/cdi/docs
  // Returns documentation about the CDI scoring algorithm
  app.get("/api/cdi/docs", async (req, res) => {
    res.json({
      name: "Choreography Depth Index (CDI)",
      version: "1.0.0",
      description: "Trust scoring API that quantifies coordination quality for autonomous agent permission systems. Based on 16 years of high-stakes coordination patterns.",
      
      components: {
        responsiveness: {
          weight: 0.25,
          description: "Response time patterns - fast and consistent responses indicate high trust",
          scoring: "< 5min avg = excellent, < 15min = good, < 60min = acceptable, > 60min = needs improvement",
        },
        adaptability: {
          weight: 0.25,
          description: "Number of iterations to alignment - fewer iterations = better understanding",
          scoring: "Compared to expected iterations by complexity level",
        },
        attention: {
          weight: 0.25,
          description: "Proactive updates vs reactive responses",
          scoring: "Higher proactive ratio = higher score, optimal communication frequency bonus",
        },
        reliability: {
          weight: 0.25,
          description: "Historical completion quality with stress penalty",
          scoring: "Based on completion rate, penalized for high stress indicators",
        },
      },
      
      autonomyLevels: {
        full: {
          threshold: ">= 85 (adjusted by complexity)",
          description: "Agent can operate independently",
        },
        conditional: {
          threshold: ">= 70 and < 85 (adjusted by complexity)",
          description: "Agent should check in at key decision points",
        },
        restricted: {
          threshold: "< 70 (adjusted by complexity)",
          description: "Human approval required for significant actions",
        },
      },
      
      complexityAdjustments: {
        simple: "Thresholds reduced by 5% - lower stakes",
        medium: "Standard thresholds",
        complex: "Thresholds increased by 5% - higher stakes require higher trust",
      },
      
      endpoints: {
        "POST /api/calculate-cdi": "Calculate CDI score from behavioral data",
        "GET /api/cdi/samples": "View sample calculations across complexity levels",
        "GET /api/cdi/docs": "This documentation",
      },
    });
  });

  // ========== INTAKE FORMS ==========
  app.post("/api/intakes/client", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const { cdiConsent, ...intakeData } = req.body;
      const data = insertClientIntakeSchema.parse({ ...intakeData, userId });
      const intake = await storage.createClientIntake(data);
      await storage.updateUserRole(userId, 'client');
      
      if (cdiConsent) {
        await storage.updateUser(userId, { 
          cdiConsentGiven: true, 
          cdiConsentDate: new Date(),
          cdiOptOut: false 
        });
        await storage.createAuditLog({
          action: 'cdi_consent_given',
          entityType: 'cdi_consent',
          entityId: userId,
          performedBy: userId,
          changes: { source: 'client_intake', timestamp: new Date().toISOString() },
        });
      }
      
      res.json(intake);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/intakes/client/:userId", isAuthenticated, async (req, res) => {
    try {
      const intake = await storage.getClientIntake(req.params.userId);
      if (!intake) {
        return res.status(404).json({ error: "Intake not found" });
      }
      res.json(intake);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.post("/api/intakes/artist", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { cdiConsent, ...intakeData } = req.body;
      const data = insertArtistIntakeSchema.parse({ ...intakeData, userId });
      const intake = await storage.createArtistIntake(data);
      await storage.updateUserRole(userId, 'artist');
      
      // Also create artist profile from intake data
      // Generate artistSlug from Instagram handle or business name
      const instagramHandle = (data as any).instagramHandle || null;
      let artistSlug = null;
      if (instagramHandle) {
        artistSlug = instagramHandle.replace('@', '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      } else if (data.businessName) {
        artistSlug = data.businessName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 30);
      }
      
      const profile = await storage.createArtistProfile({
        userId,
        businessName: data.businessName,
        location: data.serviceAreas?.[0] || null,
        specialties: data.serviceTypes,
        instagramHandle: instagramHandle,
        artistSlug: artistSlug,
      });
      
      if (cdiConsent) {
        await storage.updateUser(userId, { 
          cdiConsentGiven: true, 
          cdiConsentDate: new Date(),
          cdiOptOut: false 
        });
        await storage.createAuditLog({
          action: 'cdi_consent_given',
          entityType: 'cdi_consent',
          entityId: userId,
          performedBy: userId,
          changes: { source: 'artist_intake', timestamp: new Date().toISOString() },
        });
      }
      
      res.json({ ...intake, artistSlug: profile?.slug || artistSlug });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/intakes/artist/:userId", isAuthenticated, async (req, res) => {
    try {
      const intake = await storage.getArtistIntake(req.params.userId);
      if (!intake) {
        return res.status(404).json({ error: "Intake not found" });
      }
      res.json(intake);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.post("/api/intakes/planner", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { cdiConsent, ...intakeData } = req.body;
      const data = insertPlannerIntakeSchema.parse({ ...intakeData, userId });
      const intake = await storage.createPlannerIntake(data);
      await storage.updateUserRole(userId, 'planner');
      
      if (cdiConsent) {
        await storage.updateUser(userId, { 
          cdiConsentGiven: true, 
          cdiConsentDate: new Date(),
          cdiOptOut: false 
        });
        await storage.createAuditLog({
          action: 'cdi_consent_given',
          entityType: 'cdi_consent',
          entityId: userId,
          performedBy: userId,
          changes: { source: 'planner_intake', timestamp: new Date().toISOString() },
        });
      }
      
      res.json(intake);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/intakes/planner/:userId", isAuthenticated, async (req, res) => {
    try {
      const intake = await storage.getPlannerIntake(req.params.userId);
      if (!intake) {
        return res.status(404).json({ error: "Intake not found" });
      }
      res.json(intake);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== PRIVATE VENDOR PROFILE (authenticated) ==========
  // Users can view their own profile while building it (even if not approved)
  app.get("/api/vendor-profile/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getAuthUserId(req);
      const targetId = req.params.id;
      
      // Users can only view their own profile or if it's public/approved
      const isOwnProfile = userId === targetId;
      
      const user = await storage.getUser(targetId);
      if (!user || user.role !== 'artist') {
        return res.status(404).json({ error: "Vendor not found" });
      }

      const profile = await storage.getArtistProfile(targetId);
      const services = await storage.getArtistServices(targetId);

      // If viewing someone else's profile, only show if approved
      if (!isOwnProfile && (!profile || profile.verificationStatus !== 'approved')) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      
      res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: isOwnProfile ? user.email : null,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
        profile: profile ? {
          businessName: profile.businessName,
          bio: profile.bio,
          location: profile.location,
          specialties: profile.specialties,
          portfolioUrls: profile.portfolioUrls,
          priceRange: profile.priceRange,
          instagramHandle: profile.instagramHandle,
          websiteUrl: profile.websiteUrl,
          verificationStatus: profile.verificationStatus,
        } : null,
        services: services.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          price: s.price,
          duration: s.duration,
          category: s.category,
        })),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== PUBLIC VENDOR PROFILE ==========
  // Publicly accessible vendor profile (no auth required)
  // Only shows approved vendors to prevent spam/scam profiles from being visible
  // BUT owners can view their own unapproved profiles
  app.get("/api/vendor-public/:id", async (req, res) => {
    try {
      const authId = getAuthUserId(req); // Get auth user if logged in
      const targetId = req.params.id;
      const user = await storage.getUser(targetId);
      if (!user || user.role !== 'artist') {
        return res.status(404).json({ error: "Vendor not found" });
      }

      const profile = await storage.getArtistProfile(targetId);
      
      // Allow if: (1) approved, OR (2) it's the owner viewing their own profile
      const isOwner = authId === targetId;
      if (!profile || (profile.verificationStatus !== 'approved' && !isOwner)) {
        return res.status(404).json({ error: "Vendor not found" });
      }
      
      const services = await storage.getArtistServices(req.params.id);

      // Return public-safe vendor data (no sensitive info)
      res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: null, // Don't expose email publicly
        profileImageUrl: user.profileImageUrl,
        role: user.role,
        profile: profile ? {
          businessName: profile.businessName,
          bio: profile.bio,
          location: profile.location,
          specialties: profile.specialties,
          portfolioUrls: profile.portfolioUrls,
          priceRange: profile.priceRange,
          instagramHandle: profile.instagramHandle,
          websiteUrl: profile.websiteUrl,
          verificationStatus: profile.verificationStatus,
        } : null,
        services: services.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          price: s.price,
          duration: s.duration,
          category: s.category,
        })),
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== ARTIST PROFILES ==========
  app.post("/api/artist-profiles", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const data = insertArtistProfileSchema.parse(req.body);
      const profile = await storage.createArtistProfile(data);
      res.json(profile);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/artist-profiles/:userId", async (req, res) => {
    try {
      const profile = await storage.getArtistProfile(req.params.userId);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.json(profile);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.patch("/api/artist-profiles/:userId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.params.userId;
      const requesterId = getAuthUserId(req);
      
      // Authorization: Users can only update their own profile
      if (!requesterId || requesterId !== userId) {
        return res.status(403).json({ error: "You can only update your own profile" });
      }
      
      // Security: Remove userId from body to prevent parameter override attacks
      const { userId: _ignoredUserId, ...safeBody } = req.body;
      
      // Check if profile exists
      let profile = await storage.getArtistProfile(userId);
      
      if (!profile) {
        // Create a new profile if one doesn't exist (for new artists who haven't done intake)
        profile = await storage.createArtistProfile({
          ...safeBody,
          userId, // Always use route param, not body
        });
      } else {
        // Update existing profile
        profile = await storage.updateArtistProfile(userId, safeBody);
      }
      
      if (!profile) {
        return res.status(500).json({ error: "Failed to save profile" });
      }
      res.json(profile);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== ASSISTANT CONTROL SURFACE (headless prompt queue) ==========
  // Internal control center for the headless assistant. Two concerns:
  //   1. Settings: how Briarwood talks to the operator (channels, mode, quiet hours)
  //   2. Queue: read-only view of what the assistant thinks needs attention
  // Access rules: authenticated session ONLY (no public, no magic-link token).
  //   - Operators see only their own settings + their own prompts.
  //   - Admins (users.role === 'admin') can see every operator's prompts.
  // Additive only: settings write through to the existing artist_profiles assistant
  // preference columns; nothing here changes delivery behavior on its own.

  function assistantSettingsView(profile: ArtistProfile) {
    return {
      preferredDeliveryChannel: profile.preferredDeliveryChannel ?? "email",
      assistantPhoneEnabled: profile.assistantPhoneEnabled ?? false,
      assistantEmailEnabled: profile.assistantEmailEnabled ?? false,
      assistantPromptMode: profile.assistantPromptMode ?? "immediate",
      assistantQuietHoursStart: profile.assistantQuietHoursStart ?? null,
      assistantQuietHoursEnd: profile.assistantQuietHoursEnd ?? null,
      assistantTimezone: profile.assistantTimezone ?? null,
      assistantDryRun: profile.assistantDryRun ?? false,
    };
  }

  const assistantSettingsSchema = z.object({
    preferredDeliveryChannel: z.enum(["sms", "email", "both"]).optional(),
    assistantPhoneEnabled: z.boolean().optional(),
    assistantEmailEnabled: z.boolean().optional(),
    assistantPromptMode: z.enum(["immediate", "digest"]).optional(),
    assistantQuietHoursStart: z.number().int().min(0).max(23).nullable().optional(),
    assistantQuietHoursEnd: z.number().int().min(0).max(23).nullable().optional(),
    assistantTimezone: z.string().max(64).nullable().optional(),
    assistantDryRun: z.boolean().optional(),
  }).strict();

  app.get("/api/assistant/settings", async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      const profile = await storage.getArtistProfile(userId);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.json({
        ...assistantSettingsView(profile),
        isAdmin: user?.role === "admin",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: message });
    }
  });

  app.patch("/api/assistant/settings", async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const parsed = assistantSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid settings" });
      }
      const profile = await storage.getArtistProfile(userId);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      const updated = await storage.updateArtistProfile(userId, parsed.data);
      if (!updated) {
        return res.status(500).json({ error: "Failed to save settings" });
      }
      const user = await storage.getUser(userId);
      res.json({
        ...assistantSettingsView(updated),
        isAdmin: user?.role === "admin",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: message });
    }
  });

  app.get("/api/assistant/prompts", async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      const isAdmin = user?.role === "admin";
      const prompts = isAdmin
        ? await storage.getAllAssistantPrompts(200)
        : await storage.getAssistantPromptsByOperator(userId, 200);
      res.json({ isAdmin, prompts });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: message });
    }
  });

  // =====================================================================
  // Rolodex / Universal Search: READ-ONLY, operator-scoped, authenticated.
  // Lets an operator find their own people and records (clients, network,
  // inquiries, contracts, bookings, assistant prompts). Not public. Scopes
  // strictly by the session user id (getAuthUserId) - the URL slug is never
  // trusted for data access. Performs no writes.
  // =====================================================================
  app.get("/api/rolodex/search", async (req: Request, res: Response) => {
    try {
      const operatorId = getAuthUserId(req);
      if (!operatorId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const q = typeof req.query.q === "string" ? req.query.q : "";
      if (!q.trim()) {
        return res.json({ query: "", groups: [], total: 0 });
      }
      const results = await storage.searchRolodex(operatorId, q);
      const groupDefs = [
        { type: "contact", label: "Clients & contacts" },
        { type: "route_target", label: "Routing network" },
        { type: "inquiry", label: "Inquiries" },
        { type: "contract", label: "Contracts" },
        { type: "booking", label: "Bookings" },
        { type: "assistant_prompt", label: "Assistant prompts" },
      ] as const;
      const groups = groupDefs
        .map((g) => ({
          type: g.type,
          label: g.label,
          results: results.filter((r) => r.type === g.type),
        }))
        .filter((g) => g.results.length > 0);
      res.json({ query: q.trim(), groups, total: results.length });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[rolodex] search error:", message);
      res.status(500).json({ error: "Search failed" });
    }
  });

  // =====================================================================
  // Briarwood core: Response Composer + generic Routing / Delegation layer.
  //
  // All endpoints below are operator-authenticated (session, getAuthUserId).
  // None are public. Nothing sends a client-facing message without the
  // operator explicitly approving (the /send and /preflight endpoints).
  // None of this touches the live DateInquiry inquiry status or flow.
  // =====================================================================

  // Build the human-readable composer context for an inquiry (operator name,
  // formatted date, pricing link if any). Shared by composer endpoints.
  const buildComposerContextFor = async (inquiry: any, operatorId: string) => {
    const vendor = await storage.getUser(operatorId);
    const profile = await storage.getArtistProfile(operatorId);
    const operatorName =
      profile?.businessName ||
      `${vendor?.firstName || ""} ${vendor?.lastName || ""}`.trim() ||
      vendor?.email ||
      "Your artist";
    const eventDate = inquiry.eventDate
      ? new Date(inquiry.eventDate).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null;
    const pricingLink = profile?.infoSheetPdfUrl || null;
    return {
      clientName: inquiry.clientName,
      serviceType: inquiry.serviceType,
      eventDate,
      eventLocation: inquiry.eventLocation,
      venue: null,
      referralSourceName: null,
      operatorName,
      pricingLink,
    };
  };

  // --- Route targets (generic address book) ---
  app.get("/api/route-targets", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const targets = await storage.getRouteTargetsByOperator(userId);
      res.json({ targets });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/route-targets", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const parsed = insertRouteTargetSchema.safeParse({ ...req.body, operatorId: userId });
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid route target" });
      }
      const target = await storage.createRouteTarget({ ...parsed.data, operatorId: userId });
      res.json({ target });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/route-targets/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const existing = await storage.getRouteTarget(req.params.id);
      if (!existing) return res.status(404).json({ error: "Route target not found" });
      if (existing.operatorId !== userId) return res.status(403).json({ error: "Access denied" });
      const { name, email, phone, roleLabel, tags, capabilities, isInternal, isAgent, active, preferred, availabilitySource, notes } = req.body;
      const updated = await storage.updateRouteTarget(req.params.id, {
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(roleLabel !== undefined ? { roleLabel } : {}),
        ...(tags !== undefined ? { tags } : {}),
        ...(capabilities !== undefined ? { capabilities } : {}),
        ...(isInternal !== undefined ? { isInternal } : {}),
        ...(isAgent !== undefined ? { isAgent } : {}),
        ...(active !== undefined ? { active } : {}),
        ...(preferred !== undefined ? { preferred } : {}),
        ...(availabilitySource !== undefined ? { availabilitySource } : {}),
        ...(notes !== undefined ? { notes } : {}),
      });
      res.json({ target: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const draftRouteCandidateSchema = z.object({
    routeTargetId: z.string().min(1),
    status: z.literal("draft").optional(),
    matchScore: z.number().int().min(0).max(100).nullable().optional(),
    matchReasons: z.array(z.string()).nullable().optional(),
    matchedCapabilities: z.array(z.string()).nullable().optional(),
    matchedTags: z.array(z.string()).nullable().optional(),
  });

  const loadDraftCandidateContext = async (req: Request, res: Response) => {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return null;
    }

    const user = await storage.getUser(userId);
    if (!user || user.role !== "artist") {
      res.status(403).json({ error: "Operator access required" });
      return null;
    }

    const inquiry = await storage.getInquiry(req.params.id);
    if (!inquiry) {
      res.status(404).json({ error: "Inquiry not found" });
      return null;
    }

    if (inquiry.vendorId !== userId) {
      res.status(403).json({ error: "Access denied" });
      return null;
    }

    return { userId, inquiry };
  };

  // --- Inquiry Workspace: internal draft route candidates (no route creation) ---
  app.get("/api/inquiries/:id/draft-route-candidates", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const context = await loadDraftCandidateContext(req, res);
      if (!context) return;

      const candidates = await storage.listDraftRouteCandidates(context.userId, context.inquiry.id);
      res.json({ candidates });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/inquiries/:id/draft-route-candidates", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const context = await loadDraftCandidateContext(req, res);
      if (!context) return;

      const parsed = draftRouteCandidateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid draft route candidate" });
      }

      const target = await storage.getRouteTarget(parsed.data.routeTargetId);
      if (!target || target.operatorId !== context.userId) {
        return res.status(400).json({ error: "Invalid route target" });
      }

      const candidate = await storage.upsertDraftRouteCandidate(
        context.userId,
        context.inquiry.id,
        parsed.data.routeTargetId,
        {
          ...(parsed.data.matchScore !== undefined ? { matchScore: parsed.data.matchScore } : {}),
          ...(parsed.data.matchReasons !== undefined ? { matchReasons: parsed.data.matchReasons } : {}),
          ...(parsed.data.matchedCapabilities !== undefined ? { matchedCapabilities: parsed.data.matchedCapabilities } : {}),
          ...(parsed.data.matchedTags !== undefined ? { matchedTags: parsed.data.matchedTags } : {}),
        },
      );

      res.json({ candidate });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/inquiries/:id/draft-route-candidates/:routeTargetId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const context = await loadDraftCandidateContext(req, res);
      if (!context) return;

      if (!req.params.routeTargetId) {
        return res.status(400).json({ error: "Route target is required" });
      }

      await storage.deleteDraftRouteCandidate(context.userId, context.inquiry.id, req.params.routeTargetId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const loadCoordinationPathContext = async (req: Request, res: Response) => {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return null;
    }

    const user = await storage.getUser(userId);
    if (!user || user.role !== "artist") {
      res.status(403).json({ error: "Operator access required" });
      return null;
    }

    const path = await storage.getCoordinationPath(req.params.pathId);
    if (!path) {
      res.status(404).json({ error: "Coordination path not found" });
      return null;
    }

    if (path.operatorId !== userId) {
      res.status(403).json({ error: "Access denied" });
      return null;
    }

    const inquiry = await storage.getInquiry(path.inquiryId);
    if (!inquiry || inquiry.vendorId !== userId) {
      res.status(403).json({ error: "Access denied" });
      return null;
    }

    return { userId, path, inquiry };
  };

  // --- Coordination permission engine: inquiry-rooted internal path state ---
  app.get("/api/inquiries/:id/coordination-paths", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const context = await loadDraftCandidateContext(req, res);
      if (!context) return;

      const paths = await storage.listCoordinationPathsByInquiry(context.userId, context.inquiry.id);
      const latestAssessments = await Promise.all(
        paths.map((path) => storage.getLatestCoordinationAssessment(path.id)),
      );

      res.json({
        paths: paths.map((path, index) => ({
          path,
          latestAssessment: latestAssessments[index] ?? null,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/inquiries/:id/coordination-paths", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const context = await loadDraftCandidateContext(req, res);
      if (!context) return;

      const parsed = coordinationPathCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid coordination path" });
      }

      if (parsed.data.routeTargetId) {
        const target = await storage.getRouteTarget(parsed.data.routeTargetId);
        if (!target || target.operatorId !== context.userId) {
          return res.status(400).json({ error: "Invalid route target" });
        }
      }

      const path = await storage.createCoordinationPath({
        ...parsed.data,
        operatorId: context.userId,
        inquiryId: context.inquiry.id,
      });

      await storage.createCoordinationEvent({
        pathId: path.id,
        operatorId: context.userId,
        inquiryId: context.inquiry.id,
        eventType: "path_created",
        eventSource: "system",
        summary: "Coordination path created from inquiry.",
        signalProvenance: [`inquiry:${context.inquiry.id}`],
        metadata: {},
      });

      res.json({ path });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/coordination-paths/:pathId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const context = await loadCoordinationPathContext(req, res);
      if (!context) return;

      const [events, latestAssessment] = await Promise.all([
        storage.listCoordinationEvents(context.path.id),
        storage.getLatestCoordinationAssessment(context.path.id),
      ]);

      res.json({
        path: context.path,
        inquiry: context.inquiry,
        events,
        latestAssessment: latestAssessment ?? null,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/coordination-paths/:pathId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const context = await loadCoordinationPathContext(req, res);
      if (!context) return;

      const parsed = coordinationPathUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid coordination path update" });
      }

      if (parsed.data.routeTargetId) {
        const target = await storage.getRouteTarget(parsed.data.routeTargetId);
        if (!target || target.operatorId !== context.userId) {
          return res.status(400).json({ error: "Invalid route target" });
        }
      }

      const path = await storage.updateCoordinationPath(context.path.id, parsed.data as any);
      res.json({ path });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/coordination-paths/:pathId/events", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const context = await loadCoordinationPathContext(req, res);
      if (!context) return;

      const parsed = coordinationEventCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid coordination event" });
      }

      const event = await storage.createCoordinationEvent({
        ...parsed.data,
        pathId: context.path.id,
        operatorId: context.userId,
        inquiryId: context.inquiry.id,
        eventSource: parsed.data.eventSource ?? "manual",
        signalProvenance: parsed.data.signalProvenance ?? [`coordination_path:${context.path.id}`],
        metadata: parsed.data.metadata ?? {},
      });

      res.json({ event });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/coordination-paths/:pathId/assess", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const context = await loadCoordinationPathContext(req, res);
      if (!context) return;

      const assessment = await assessCoordinationPath(context.path.id);
      res.json({ assessment });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const internalNoteSchema = z.object({
    body: z.string().max(20000),
  }).strict();

  const humanAttestationCreateSchema = z.object({
    claimText: z.string().trim().min(1).max(20000),
    authorCapacity: z.string().trim().min(1).max(500),
    knowledgeBasis: z.enum(humanAttestationKnowledgeBasisValues),
    lifecycleAction: z.enum(humanAttestationLifecycleActionValues).default("attestation"),
    relatedAttestationId: z.string().trim().min(1).max(255).nullable().optional(),
  }).strict().superRefine((value, context) => {
    const hasRelatedAttestation = Boolean(value.relatedAttestationId);
    if (value.lifecycleAction === "attestation" && hasRelatedAttestation) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["relatedAttestationId"],
        message: "An original attestation cannot link to an earlier attestation",
      });
    }
    if (value.lifecycleAction !== "attestation" && !hasRelatedAttestation) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["relatedAttestationId"],
        message: `${value.lifecycleAction} requires a related attestation`,
      });
    }
  });

  const coordinationJudgmentCreateSchema = z.object({
    subjectText: z.string().trim().min(1).max(1000),
    scopeText: z.string().trim().min(1).max(5000),
    judgmentText: z.string().trim().min(1).max(20000),
    rationaleText: z.string().trim().min(1).max(20000),
    evidenceBasis: z.string().trim().min(1).max(20000),
    lifecycleAction: z.enum(coordinationJudgmentLifecycleActionValues).default("judgment"),
    relatedJudgmentId: z.string().trim().min(1).max(255).nullable().optional(),
    supportingAttestationIds: z.array(z.string().trim().min(1).max(255)).max(100).default([]),
  }).strict().superRefine((value, context) => {
    const hasRelatedJudgment = Boolean(value.relatedJudgmentId);
    if (value.lifecycleAction === "judgment" && hasRelatedJudgment) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["relatedJudgmentId"],
        message: "An original judgment cannot link to an earlier judgment",
      });
    }
    if (value.lifecycleAction !== "judgment" && !hasRelatedJudgment) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["relatedJudgmentId"],
        message: `${value.lifecycleAction} requires a related judgment`,
      });
    }
    if (new Set(value.supportingAttestationIds).size !== value.supportingAttestationIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["supportingAttestationIds"],
        message: "Supporting attestation links must be unique",
      });
    }
  });

  const scopedPermissionDecisionCreateSchema = z.object({
    actorReference: z.string().trim().min(1).max(1000),
    actorDescription: z.string().trim().min(1).max(5000),
    proposedAction: z.string().trim().min(1).max(5000),
    taskContext: z.string().trim().min(1).max(5000),
    environmentContext: z.string().trim().min(1).max(5000),
    scopeText: z.string().trim().min(1).max(5000),
    consequenceLevel: z.string().trim().min(1).max(1000),
    demonstratedCapability: z.string().trim().min(1).max(10000),
    capabilityEvidenceBasis: z.string().trim().min(1).max(10000),
    capabilityScopeAssessment: z.string().trim().min(1).max(10000),
    capabilityFit: z.enum(scopedPermissionCapabilityFitValues),
    authorizationSource: z.string().trim().min(1).max(10000),
    authorizationState: z.enum(scopedPermissionAuthorizationStateValues),
    judgmentCurrencyBasis: z.string().trim().min(1).max(10000),
    blockers: z.array(z.string().trim().min(1).max(5000)).max(100).default([]),
    requiredConditions: z.array(z.string().trim().min(1).max(5000)).max(100).default([]),
    decision: z.enum(scopedPermissionDecisionValues),
    expiresAt: z.coerce.date().nullable().optional(),
    mandatoryReviewTrigger: z.string().trim().min(1).max(5000).nullable().optional(),
    lifecycleAction: z.enum(scopedPermissionLifecycleActionValues).default("decision"),
    relatedPermissionDecisionId: z.string().trim().min(1).max(255).nullable().optional(),
    linkedJudgmentIds: z.array(z.string().trim().min(1).max(255)).min(1).max(100),
  }).strict().superRefine((value, context) => {
    const hasRelatedDecision = Boolean(value.relatedPermissionDecisionId);
    if (value.lifecycleAction === "decision" && hasRelatedDecision) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["relatedPermissionDecisionId"],
        message: "An original permission decision cannot link to an earlier permission decision",
      });
    }
    if (value.lifecycleAction !== "decision" && !hasRelatedDecision) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["relatedPermissionDecisionId"],
        message: `${value.lifecycleAction} requires a related permission decision`,
      });
    }
    if (value.lifecycleAction === "withdrawal" && value.decision !== "not_permitted") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["decision"],
        message: "A withdrawn permission decision must remain not permitted",
      });
    }
    if (new Set(value.linkedJudgmentIds).size !== value.linkedJudgmentIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["linkedJudgmentIds"],
        message: "Linked judgment records must be unique",
      });
    }
    if (!value.expiresAt && !value.mandatoryReviewTrigger) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mandatoryReviewTrigger"],
        message: "A permission decision requires expiration or a mandatory review trigger",
      });
    }

    const grantsPermission = value.decision === "permitted" || value.decision === "permitted_with_conditions";
    if (grantsPermission && value.capabilityFit !== "within_scope") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["capabilityFit"],
        message: "Demonstrated capability outside this exact scope cannot support permission",
      });
    }
    if (grantsPermission && !["established", "conditional"].includes(value.authorizationState)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["authorizationState"],
        message: "Capability does not replace a separate source of authorization",
      });
    }
    if (grantsPermission && value.blockers.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["blockers"],
        message: "A permitted decision cannot hide unresolved blockers",
      });
    }
    if (value.decision === "permitted" && value.authorizationState !== "established") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["authorizationState"],
        message: "Unconditional permission requires established authorization",
      });
    }
    if (value.decision === "permitted" && value.requiredConditions.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requiredConditions"],
        message: "Permission with conditions must remain conditional",
      });
    }
    if (value.decision === "permitted_with_conditions" && value.requiredConditions.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["requiredConditions"],
        message: "Conditional permission requires explicit conditions",
      });
    }
    if (!grantsPermission && value.blockers.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["blockers"],
        message: `${value.decision} requires an explicit blocker`,
      });
    }
  });

  const humanActionDecisionCreateSchema = z.object({
    permissionDecisionId: z.string().trim().min(1).max(255),
    choice: z.enum(humanActionDecisionChoiceValues),
    permissionReviewSummary: z.string().trim().min(1).max(10000),
    rationaleText: z.string().trim().min(1).max(10000),
    conditionConfirmations: z.array(z.string().trim().min(1).max(5000)).max(100).default([]),
    lifecycleAction: z.enum(humanActionDecisionLifecycleActionValues).default("decision"),
    relatedHumanActionDecisionId: z.string().trim().min(1).max(255).nullable().optional(),
  }).strict().superRefine((value, context) => {
    const hasRelatedDecision = Boolean(value.relatedHumanActionDecisionId);
    if (value.lifecycleAction === "decision" && hasRelatedDecision) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["relatedHumanActionDecisionId"],
        message: "An original human action decision cannot link to an earlier human action decision",
      });
    }
    if (value.lifecycleAction !== "decision" && !hasRelatedDecision) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["relatedHumanActionDecisionId"],
        message: `${value.lifecycleAction} requires a related human action decision`,
      });
    }
    if (value.lifecycleAction === "withdrawal" && value.choice !== "stop") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["choice"],
        message: "A withdrawn human action decision must stop",
      });
    }
    if (new Set(value.conditionConfirmations).size !== value.conditionConfirmations.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["conditionConfirmations"],
        message: "Condition confirmations must be unique",
      });
    }
    if (value.choice !== "proceed" && value.conditionConfirmations.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["conditionConfirmations"],
        message: "Only a proceed choice may confirm permission conditions",
      });
    }
  });

  const loadPrivateInquiryContext = async (req: Request, res: Response) => {
    const userId = getAuthUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return null;
    }

    const user = await storage.getUser(userId);
    if (!user || user.role !== "artist") {
      res.status(403).json({ error: "Operator access required" });
      return null;
    }

    const inquiry = await storage.getInquiry(req.params.id);
    if (!inquiry) {
      res.status(404).json({ error: "Inquiry not found" });
      return null;
    }

    if (inquiry.vendorId !== userId) {
      res.status(403).json({ error: "Access denied" });
      return null;
    }

    return { userId, inquiry };
  };

  // --- Inquiry Workspace: private internal notes (no client-visible effects) ---
  app.get("/api/inquiries/:id/internal-note", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const context = await loadPrivateInquiryContext(req, res);
      if (!context) return;

      const note = await storage.getInquiryInternalNote(context.userId, context.inquiry.id);
      res.json({ note: note ?? null });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/inquiries/:id/internal-note", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const context = await loadPrivateInquiryContext(req, res);
      if (!context) return;

      const parsed = internalNoteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid internal note" });
      }

      const note = await storage.upsertInquiryInternalNote(context.userId, context.inquiry.id, parsed.data.body);
      res.json({ note });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Inquiry Workspace: private append-only human attestations ---
  app.get("/api/inquiries/:id/human-attestations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const context = await loadPrivateInquiryContext(req, res);
      if (!context) return;

      const attestations = await storage.listHumanAttestations(context.userId, context.inquiry.id);
      res.json({ attestations });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/inquiries/:id/human-attestations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const context = await loadPrivateInquiryContext(req, res);
      if (!context) return;

      const parsed = humanAttestationCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.errors[0]?.message || "Invalid human attestation",
        });
      }

      if (parsed.data.relatedAttestationId) {
        const related = await storage.getHumanAttestation(
          context.userId,
          context.inquiry.id,
          parsed.data.relatedAttestationId,
        );
        if (!related) {
          return res.status(400).json({
            error: "Related attestation must belong to this inquiry",
          });
        }
      }

      const attestation = await storage.createHumanAttestation({
        operatorId: context.userId,
        authorUserId: context.userId,
        inquiryId: context.inquiry.id,
        claimText: parsed.data.claimText,
        authorCapacity: parsed.data.authorCapacity,
        knowledgeBasis: parsed.data.knowledgeBasis,
        lifecycleAction: parsed.data.lifecycleAction,
        relatedAttestationId: parsed.data.relatedAttestationId ?? null,
      });

      res.status(201).json({ attestation });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Inquiry Workspace: private append-only coordination judgments ---
  app.get("/api/inquiries/:id/coordination-judgments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const context = await loadPrivateInquiryContext(req, res);
      if (!context) return;

      const judgments = await storage.listCoordinationJudgments(context.userId, context.inquiry.id);
      res.json({ judgments });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/inquiries/:id/coordination-judgments/:judgmentId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const context = await loadPrivateInquiryContext(req, res);
      if (!context) return;

      const judgment = await storage.getCoordinationJudgment(
        context.userId,
        context.inquiry.id,
        req.params.judgmentId,
      );
      if (!judgment) {
        return res.status(404).json({ error: "Coordination judgment not found" });
      }

      res.json({ judgment });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/inquiries/:id/coordination-judgments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const context = await loadPrivateInquiryContext(req, res);
      if (!context) return;

      const parsed = coordinationJudgmentCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.errors[0]?.message || "Invalid coordination judgment",
        });
      }

      if (parsed.data.relatedJudgmentId) {
        const related = await storage.getCoordinationJudgment(
          context.userId,
          context.inquiry.id,
          parsed.data.relatedJudgmentId,
        );
        if (!related) {
          return res.status(400).json({
            error: "Related judgment must belong to this inquiry",
          });
        }
      }

      for (const attestationId of parsed.data.supportingAttestationIds) {
        const attestation = await storage.getHumanAttestation(
          context.userId,
          context.inquiry.id,
          attestationId,
        );
        if (!attestation) {
          return res.status(400).json({
            error: "Supporting attestations must belong to this inquiry",
          });
        }
      }

      const judgment = await storage.createCoordinationJudgment({
        operatorId: context.userId,
        authorUserId: context.userId,
        inquiryId: context.inquiry.id,
        subjectText: parsed.data.subjectText,
        scopeText: parsed.data.scopeText,
        judgmentText: parsed.data.judgmentText,
        rationaleText: parsed.data.rationaleText,
        evidenceBasis: parsed.data.evidenceBasis,
        lifecycleAction: parsed.data.lifecycleAction,
        relatedJudgmentId: parsed.data.relatedJudgmentId ?? null,
      }, parsed.data.supportingAttestationIds);

      res.status(201).json({ judgment });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Inquiry Workspace: private append-only scoped permission decisions ---
  app.get("/api/inquiries/:id/scoped-permission-decisions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const context = await loadPrivateInquiryContext(req, res);
      if (!context) return;

      const permissionDecisions = await storage.listScopedPermissionDecisions(
        context.userId,
        context.inquiry.id,
      );
      res.json({ permissionDecisions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/inquiries/:id/scoped-permission-decisions/:permissionDecisionId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const context = await loadPrivateInquiryContext(req, res);
      if (!context) return;

      const permissionDecision = await storage.getScopedPermissionDecision(
        context.userId,
        context.inquiry.id,
        req.params.permissionDecisionId,
      );
      if (!permissionDecision) {
        return res.status(404).json({ error: "Scoped permission decision not found" });
      }

      res.json({ permissionDecision });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/inquiries/:id/scoped-permission-decisions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const context = await loadPrivateInquiryContext(req, res);
      if (!context) return;

      const parsed = scopedPermissionDecisionCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.errors[0]?.message || "Invalid scoped permission decision",
        });
      }

      if (parsed.data.relatedPermissionDecisionId) {
        const related = await storage.getScopedPermissionDecision(
          context.userId,
          context.inquiry.id,
          parsed.data.relatedPermissionDecisionId,
        );
        if (!related) {
          return res.status(400).json({
            error: "Related permission decision must belong to this inquiry",
          });
        }
      }

      for (const judgmentId of parsed.data.linkedJudgmentIds) {
        const judgment = await storage.getCoordinationJudgment(
          context.userId,
          context.inquiry.id,
          judgmentId,
        );
        if (!judgment) {
          return res.status(400).json({
            error: "Linked judgments must belong to this inquiry",
          });
        }
      }

      const permissionDecision = await storage.createScopedPermissionDecision({
        operatorId: context.userId,
        decisionMakerUserId: context.userId,
        inquiryId: context.inquiry.id,
        actorReference: parsed.data.actorReference,
        actorDescription: parsed.data.actorDescription,
        proposedAction: parsed.data.proposedAction,
        taskContext: parsed.data.taskContext,
        environmentContext: parsed.data.environmentContext,
        scopeText: parsed.data.scopeText,
        consequenceLevel: parsed.data.consequenceLevel,
        demonstratedCapability: parsed.data.demonstratedCapability,
        capabilityEvidenceBasis: parsed.data.capabilityEvidenceBasis,
        capabilityScopeAssessment: parsed.data.capabilityScopeAssessment,
        capabilityFit: parsed.data.capabilityFit,
        authorizationSource: parsed.data.authorizationSource,
        authorizationState: parsed.data.authorizationState,
        judgmentCurrencyBasis: parsed.data.judgmentCurrencyBasis,
        blockers: parsed.data.blockers,
        requiredConditions: parsed.data.requiredConditions,
        decision: parsed.data.decision,
        expiresAt: parsed.data.expiresAt ?? null,
        mandatoryReviewTrigger: parsed.data.mandatoryReviewTrigger ?? null,
        lifecycleAction: parsed.data.lifecycleAction,
        relatedPermissionDecisionId: parsed.data.relatedPermissionDecisionId ?? null,
      }, parsed.data.linkedJudgmentIds);

      res.status(201).json({ permissionDecision });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Inquiry Workspace: private append-only human action decisions ---
  app.get("/api/inquiries/:id/human-action-decisions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const context = await loadPrivateInquiryContext(req, res);
      if (!context) return;

      const humanActionDecisions = await storage.listHumanActionDecisions(
        context.userId,
        context.inquiry.id,
      );
      res.json({ humanActionDecisions });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/inquiries/:id/human-action-decisions/:humanActionDecisionId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const context = await loadPrivateInquiryContext(req, res);
      if (!context) return;

      const humanActionDecision = await storage.getHumanActionDecision(
        context.userId,
        context.inquiry.id,
        req.params.humanActionDecisionId,
      );
      if (!humanActionDecision) {
        return res.status(404).json({ error: "Human action decision not found" });
      }

      res.json({ humanActionDecision });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/inquiries/:id/human-action-decisions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const context = await loadPrivateInquiryContext(req, res);
      if (!context) return;

      const parsed = humanActionDecisionCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.errors[0]?.message || "Invalid human action decision",
        });
      }

      const permissionDecision = await storage.getScopedPermissionDecision(
        context.userId,
        context.inquiry.id,
        parsed.data.permissionDecisionId,
      );
      if (!permissionDecision) {
        return res.status(400).json({
          error: "Reviewed permission decision must belong to this inquiry",
        });
      }

      if (parsed.data.relatedHumanActionDecisionId) {
        const related = await storage.getHumanActionDecision(
          context.userId,
          context.inquiry.id,
          parsed.data.relatedHumanActionDecisionId,
        );
        if (!related || related.permissionDecisionId !== permissionDecision.id) {
          return res.status(400).json({
            error: "Related human action decision must belong to this inquiry and permission decision",
          });
        }
      }

      if (parsed.data.choice === "proceed") {
        const grantsPermission = permissionDecision.decision === "permitted"
          || permissionDecision.decision === "permitted_with_conditions";
        if (!grantsPermission) {
          return res.status(400).json({
            error: "A proceed choice requires a permission decision that permits the proposed action",
          });
        }

        if (permissionDecision.expiresAt && permissionDecision.expiresAt.getTime() <= Date.now()) {
          return res.status(400).json({ error: "An expired permission decision cannot support proceed" });
        }

        const permissionHistory = await storage.listScopedPermissionDecisions(
          context.userId,
          context.inquiry.id,
        );
        if (permissionHistory.some((candidate) =>
          candidate.relatedPermissionDecisionId === permissionDecision.id
        )) {
          return res.status(400).json({
            error: "A superseded, corrected, or withdrawn permission decision cannot support proceed",
          });
        }

        const requiredConditions = permissionDecision.requiredConditions ?? [];
        const confirmedConditions = parsed.data.conditionConfirmations;
        const confirmationsMatch = requiredConditions.length === confirmedConditions.length
          && requiredConditions.every((condition) => confirmedConditions.includes(condition));
        if (!confirmationsMatch) {
          return res.status(400).json({
            error: "Proceed must preserve and confirm every condition on the reviewed permission decision",
          });
        }
      }

      const humanActionDecision = await storage.createHumanActionDecision({
        operatorId: context.userId,
        decisionMakerUserId: context.userId,
        inquiryId: context.inquiry.id,
        permissionDecisionId: permissionDecision.id,
        decisionOrigin: "authenticated_human",
        choice: parsed.data.choice,
        permissionReviewSummary: parsed.data.permissionReviewSummary,
        rationaleText: parsed.data.rationaleText,
        conditionConfirmations: parsed.data.conditionConfirmations,
        lifecycleAction: parsed.data.lifecycleAction,
        relatedHumanActionDecisionId: parsed.data.relatedHumanActionDecisionId ?? null,
      });

      res.status(201).json({ humanActionDecision });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Inquiry Workspace: private read-only inquiry decision chain ---
  app.get("/api/inquiries/:id/decision-chain", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const context = await loadPrivateInquiryContext(req, res);
      if (!context) return;

      const [attestations, judgments, permissionDecisions, humanActionDecisions] = await Promise.all([
        storage.listHumanAttestations(context.userId, context.inquiry.id),
        storage.listCoordinationJudgments(context.userId, context.inquiry.id),
        storage.listScopedPermissionDecisions(context.userId, context.inquiry.id),
        storage.listHumanActionDecisions(context.userId, context.inquiry.id),
      ]);
      const decisionChain = buildInquiryDecisionChain({
        operatorId: context.userId,
        inquiryId: context.inquiry.id,
        knownAttestationIds: attestations.map((attestation) => attestation.id),
        judgments,
        permissionDecisions,
        humanActionDecisions,
      });

      res.json({ decisionChain });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Composer: one-stop context for an inquiry ---
  // Returns inquiry context, default drafts, existing routes + responses, and
  // the operator's route targets, so the UI can render the composer in one call.
  app.get("/api/inquiries/:id/composer", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const inquiry = await storage.getInquiry(req.params.id);
      if (!inquiry) return res.status(404).json({ error: "Inquiry not found" });
      if (inquiry.vendorId !== userId) return res.status(403).json({ error: "Access denied" });

      const routing = await import("./routingService");
      const ctx = await buildComposerContextFor(inquiry, userId);
      const routes = await storage.getInquiryRoutesByInquiry(inquiry.id);
      const responses = await storage.getInquiryResponsesByInquiry(inquiry.id);
      const targets = await storage.getRouteTargetsByOperator(userId);
      // Seed the composer's dry-run toggle from the operator's saved preference.
      const profile = await storage.getArtistProfile(userId);
      const acceptedNames: string[] = [];
      for (const r of routes) {
        if (r.status === "accepted") {
          const t = await storage.getRouteTarget(r.routeTargetId);
          if (t) acceptedNames.push(t.name);
        }
      }

      res.json({
        context: { ...ctx, dryRun: profile?.assistantDryRun ?? false },
        defaults: {
          pricing: routing.buildPricingDraft(ctx),
          decline: routing.buildDeclineDraft(ctx),
          referral: routing.buildReferralDraft(ctx, acceptedNames),
        },
        routes,
        responses,
        targets,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Composer: save a draft response (does NOT send) ---
  app.post("/api/inquiries/:id/responses", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const inquiry = await storage.getInquiry(req.params.id);
      if (!inquiry) return res.status(404).json({ error: "Inquiry not found" });
      if (inquiry.vendorId !== userId) return res.status(403).json({ error: "Access denied" });

      const parsed = insertInquiryResponseSchema.safeParse({
        ...req.body,
        operatorId: userId,
        inquiryId: inquiry.id,
        status: "draft",
      });
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid response" });
      }
      const response = await storage.createInquiryResponse({
        ...parsed.data,
        operatorId: userId,
        inquiryId: inquiry.id,
        status: "draft",
      });
      const routing = await import("./routingService");
      await routing.recordRoutingEvent({
        operatorId: userId,
        eventType: "response_drafted",
        evidenceText: `Drafted ${response.responseType} response for inquiry ${inquiry.id}`,
        contextualFactors: [`type:${response.responseType}`],
      });
      res.json({ response });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Composer: approve + send a draft to the client ---
  app.post("/api/inquiry-responses/:id/send", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const response = await storage.getInquiryResponse(req.params.id);
      if (!response) return res.status(404).json({ error: "Response not found" });
      if (response.operatorId !== userId) return res.status(403).json({ error: "Access denied" });
      if (response.status === "sent") {
        return res.status(400).json({ error: "This response was already sent" });
      }
      const inquiry = await storage.getInquiry(response.inquiryId);
      if (!inquiry) return res.status(404).json({ error: "Inquiry not found" });

      // Server-enforced dry run: if the operator has assistant dry run ON, never
      // send and never write. This protects the core composer loop even if this
      // route is hit directly (not just through the UI's preview path).
      const dryRunProfile = await storage.getArtistProfile(userId);
      if (dryRunProfile?.assistantDryRun) {
        const routing = await import("./routingService");
        const ctx = await buildComposerContextFor(inquiry, userId);
        const finalBody = routing.applyPersonalNote(
          (req.body?.body ?? response.body) as string,
          (req.body?.personalNote ?? response.personalNote) as string | null,
        );
        const subjectMap: Record<string, string> = {
          pricing: `Information from ${ctx.operatorName}`,
          decline: `Thank you from ${ctx.operatorName}`,
          referral: `A few trusted recommendations from ${ctx.operatorName}`,
        };
        let blockedReason: string | null = null;
        if (response.responseType === "referral") {
          const existingRoutes = await storage.getInquiryRoutesByInquiry(inquiry.id);
          const hasAccepted = existingRoutes.some((r) => r.status === "accepted");
          if (!hasAccepted) {
            blockedReason = "At least one routed person must accept before this referral can be sent.";
          }
        }
        const preview: DeliveryPreview = {
          dryRun: true,
          action: `Send ${response.responseType} response to client`,
          channel: "email",
          recipientName: inquiry.clientName ?? null,
          recipientEmail: inquiry.clientEmail ?? null,
          recipientPhone: null,
          subject: subjectMap[response.responseType] || `Message from ${ctx.operatorName}`,
          body: finalBody,
          inquiry: {
            id: inquiry.id,
            clientName: inquiry.clientName ?? null,
            eventDate: ctx.eventDate ?? null,
            serviceType: inquiry.serviceType ?? null,
          },
          routeTarget: null,
          recordEffect: "Nothing was sent or saved. Dry run is on, so no email was sent, the response was not marked sent, and no events were recorded.",
          blockedReason,
        };
        return res.json({
          dryRun: true,
          blocked: true,
          message: "Dry run is on. Nothing was sent and no records were changed.",
          preview,
        });
      }

      // Referral messages may only go out once at least one routed person has
      // accepted. Enforced server-side so a direct API call cannot bypass the UI.
      if (response.responseType === "referral") {
        const existingRoutes = await storage.getInquiryRoutesByInquiry(inquiry.id);
        const hasAccepted = existingRoutes.some((r) => r.status === "accepted");
        if (!hasAccepted) {
          return res.status(400).json({
            error: "At least one routed person must accept before sending a referral",
          });
        }
      }

      const routing = await import("./routingService");
      const ctx = await buildComposerContextFor(inquiry, userId);
      // Operator may have edited body/note client-side; honor the latest values.
      const finalBody = routing.applyPersonalNote(
        (req.body?.body ?? response.body) as string,
        (req.body?.personalNote ?? response.personalNote) as string | null,
      );
      const subjectMap: Record<string, string> = {
        pricing: `Information from ${ctx.operatorName}`,
        decline: `Thank you from ${ctx.operatorName}`,
        referral: `A few trusted recommendations from ${ctx.operatorName}`,
      };
      const subject = subjectMap[response.responseType] || `Message from ${ctx.operatorName}`;

      const { sendGeneralEmail } = await import("./emailService");
      await sendGeneralEmail({
        to: inquiry.clientEmail,
        subject,
        body: finalBody,
        senderName: ctx.operatorName,
      });

      const updated = await storage.updateInquiryResponse(response.id, {
        body: finalBody,
        personalNote: (req.body?.personalNote ?? response.personalNote) as string | null,
        status: "sent",
        sentAt: new Date(),
      });

      const eventType =
        response.responseType === "pricing"
          ? "pricing_sent"
          : response.responseType === "decline"
            ? "declined"
            : "referral_sent_to_client";
      await routing.recordRoutingEvent({
        operatorId: userId,
        eventType,
        evidenceText: `Sent ${response.responseType} response to client for inquiry ${inquiry.id}`,
        contextualFactors: [`type:${response.responseType}`],
      });

      // If this was a referral message, mark accepted routes as sent_to_client.
      if (response.responseType === "referral") {
        const routes = await storage.getInquiryRoutesByInquiry(inquiry.id);
        for (const r of routes) {
          if (r.status === "accepted") {
            await storage.updateInquiryRoute(r.id, { status: "sent_to_client" });
          }
        }
      }

      res.json({ response: updated });
    } catch (error: any) {
      console.error("[Composer] Send error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- Composer: DRY RUN preview of a client send (sends nothing, writes nothing) ---
  // Mirrors the /send path's recipient/subject/body logic but stops before any
  // email is sent or any record is created/updated. Safe to call any number of
  // times. Operator-authenticated and scoped to their own inquiry.
  app.post("/api/inquiries/:id/responses/preview", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const inquiry = await storage.getInquiry(req.params.id);
      if (!inquiry) return res.status(404).json({ error: "Inquiry not found" });
      if (inquiry.vendorId !== userId) return res.status(403).json({ error: "Access denied" });

      const responseType = String(req.body?.responseType || "");
      if (!["pricing", "decline", "referral"].includes(responseType)) {
        return res.status(400).json({ error: "Invalid response type" });
      }

      const routing = await import("./routingService");
      const ctx = await buildComposerContextFor(inquiry, userId);
      const finalBody = routing.applyPersonalNote(
        (req.body?.body ?? "") as string,
        (req.body?.personalNote ?? null) as string | null,
      );
      const subjectMap: Record<string, string> = {
        pricing: `Information from ${ctx.operatorName}`,
        decline: `Thank you from ${ctx.operatorName}`,
        referral: `A few trusted recommendations from ${ctx.operatorName}`,
      };

      // Reflect the server-side referral gate so the preview is honest.
      let blockedReason: string | null = null;
      if (responseType === "referral") {
        const existingRoutes = await storage.getInquiryRoutesByInquiry(inquiry.id);
        const hasAccepted = existingRoutes.some((r) => r.status === "accepted");
        if (!hasAccepted) {
          blockedReason = "At least one routed person must accept before this referral can be sent.";
        }
      }

      const preview: DeliveryPreview = {
        dryRun: true,
        action: `Send ${responseType} response to client`,
        channel: "email",
        recipientName: inquiry.clientName ?? null,
        recipientEmail: inquiry.clientEmail ?? null,
        recipientPhone: null,
        subject: subjectMap[responseType] || `Message from ${ctx.operatorName}`,
        body: finalBody,
        inquiry: {
          id: inquiry.id,
          clientName: inquiry.clientName ?? null,
          eventDate: ctx.eventDate ?? null,
          serviceType: inquiry.serviceType ?? null,
        },
        routeTarget: null,
        recordEffect: blockedReason
          ? "Nothing. In real mode this send would be refused (see reason below)."
          : "In real mode: marks the response as sent, records a score-neutral routing event, and (for referrals) marks accepted routes as sent to client.",
        blockedReason,
      };
      res.json({ dryRun: true, preview });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Routing: create routes (select one or more targets) ---
  app.post("/api/inquiries/:id/routes", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const inquiry = await storage.getInquiry(req.params.id);
      if (!inquiry) return res.status(404).json({ error: "Inquiry not found" });
      if (inquiry.vendorId !== userId) return res.status(403).json({ error: "Access denied" });

      const { targetIds, routeType } = req.body as { targetIds?: string[]; routeType?: string };
      if (!Array.isArray(targetIds) || targetIds.length === 0) {
        return res.status(400).json({ error: "Select at least one route target" });
      }
      const type = routeType || "referral";
      const created = [];
      for (const targetId of targetIds) {
        const target = await storage.getRouteTarget(targetId);
        if (!target || target.operatorId !== userId) {
          return res.status(400).json({ error: `Invalid route target: ${targetId}` });
        }
        const route = await storage.createInquiryRoute({
          operatorId: userId,
          inquiryId: inquiry.id,
          routeTargetId: targetId,
          routeType: type,
          status: "draft",
          targetLabelSnapshot: target.roleLabel || null,
        });
        created.push(route);
      }
      const routing = await import("./routingService");
      await routing.recordRoutingEvent({
        operatorId: userId,
        eventType: type === "referral" ? "routed" : "delegated",
        evidenceText: `Created ${created.length} ${type} route(s) for inquiry ${inquiry.id}`,
        contextualFactors: [`type:${type}`, `count:${created.length}`],
      });
      res.json({ routes: created });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Routing: send preflight to a route target (asks before client sees them) ---
  app.post("/api/inquiry-routes/:id/preflight", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const route = await storage.getInquiryRoute(req.params.id);
      if (!route) return res.status(404).json({ error: "Route not found" });
      if (route.operatorId !== userId) return res.status(403).json({ error: "Access denied" });
      const target = await storage.getRouteTarget(route.routeTargetId);
      if (!target) return res.status(404).json({ error: "Route target not found" });

      const inquiry = route.inquiryId ? await storage.getInquiry(route.inquiryId) : null;
      const ctx = inquiry ? await buildComposerContextFor(inquiry, userId) : null;
      const routing = await import("./routingService");
      const message = routing.buildPreflightMessage({
        operatorName: ctx?.operatorName || "Your colleague",
        targetName: target.name,
        serviceType: inquiry?.serviceType,
        eventDate: ctx?.eventDate,
        eventLocation: inquiry?.eventLocation,
        routeType: route.routeType as any,
      });

      // Server-enforced dry run: if the operator has assistant dry run ON, never
      // send (no Resend, no Twilio) and never mark the route pending. Protects the
      // core routing loop even if this route is hit directly.
      const dryRunProfile = await storage.getArtistProfile(userId);
      if (dryRunProfile?.assistantDryRun) {
        const wantChannel = (req.body?.channel as string) || (target.phone ? "sms" : "email");
        const usedChannel: "sms" | "email" =
          wantChannel === "sms" && target.phone ? "sms" : target.email ? "email" : (target.phone ? "sms" : "email");
        let blockedReason: string | null = null;
        if (!target.email && !target.phone) {
          blockedReason = "This route target has no email or phone to preflight.";
        }
        const preview: DeliveryPreview = {
          dryRun: true,
          action: `Send ${route.routeType} preflight to route target`,
          channel: usedChannel,
          recipientName: target.name ?? null,
          recipientEmail: usedChannel === "email" ? (target.email ?? null) : null,
          recipientPhone: usedChannel === "sms" ? (target.phone ?? null) : null,
          subject: usedChannel === "email"
            ? `${ctx?.operatorName || "A colleague"} would like to send you an inquiry`
            : null,
          body: message,
          inquiry: inquiry
            ? {
                id: inquiry.id,
                clientName: inquiry.clientName ?? null,
                eventDate: ctx?.eventDate ?? null,
                serviceType: inquiry.serviceType ?? null,
              }
            : null,
          routeTarget: { id: target.id, name: target.name ?? null },
          recordEffect: "Nothing was sent or saved. Dry run is on, so no email or text was sent, the route was not marked pending, and no events were recorded.",
          blockedReason,
        };
        return res.json({
          dryRun: true,
          blocked: true,
          message: "Dry run is on. Nothing was sent and no records were changed.",
          preview,
        });
      }

      // Choose channel by available contact info (operator can prefer one).
      const wantChannel = (req.body?.channel as string) || (target.phone ? "sms" : "email");
      let delivered = false;
      let usedChannel = wantChannel;
      if (wantChannel === "sms" && target.phone) {
        const { sendSms } = await import("./smsService");
        const result = await sendSms(target.phone, message);
        delivered = result.success;
        usedChannel = "sms";
      } else if (target.email) {
        const { sendGeneralEmail } = await import("./emailService");
        await sendGeneralEmail({
          to: target.email,
          subject: `${ctx?.operatorName || "A colleague"} would like to send you an inquiry`,
          body: message,
          senderName: ctx?.operatorName || "Briarwood",
        });
        delivered = true;
        usedChannel = "email";
      } else {
        return res.status(400).json({ error: "This route target has no email or phone to preflight" });
      }

      const updated = await storage.updateInquiryRoute(route.id, {
        status: "pending",
        preflightChannel: usedChannel,
        preflightMessage: message,
        preflightSentAt: new Date(),
      });
      await routing.recordRoutingEvent({
        operatorId: userId,
        eventType: "route_preflight_sent",
        evidenceText: `Preflighted ${route.routeType} to ${target.name} via ${usedChannel}`,
        contextualFactors: [`channel:${usedChannel}`, `delivered:${delivered}`],
      });
      res.json({ route: updated, delivered });
    } catch (error: any) {
      console.error("[Routing] Preflight error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- Routing: DRY RUN preview of a preflight (sends nothing, writes nothing) ---
  // Mirrors the /preflight path's channel + message logic but stops before any
  // email/SMS is sent or the route is marked pending. Safe to call repeatedly.
  app.post("/api/inquiry-routes/:id/preflight/preview", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const route = await storage.getInquiryRoute(req.params.id);
      if (!route) return res.status(404).json({ error: "Route not found" });
      if (route.operatorId !== userId) return res.status(403).json({ error: "Access denied" });
      const target = await storage.getRouteTarget(route.routeTargetId);
      if (!target) return res.status(404).json({ error: "Route target not found" });

      const inquiry = route.inquiryId ? await storage.getInquiry(route.inquiryId) : null;
      const ctx = inquiry ? await buildComposerContextFor(inquiry, userId) : null;
      const routing = await import("./routingService");
      const message = routing.buildPreflightMessage({
        operatorName: ctx?.operatorName || "Your colleague",
        targetName: target.name,
        serviceType: inquiry?.serviceType,
        eventDate: ctx?.eventDate,
        eventLocation: inquiry?.eventLocation,
        routeType: route.routeType as any,
      });

      const wantChannel = (req.body?.channel as string) || (target.phone ? "sms" : "email");
      const usedChannel: "sms" | "email" =
        wantChannel === "sms" && target.phone ? "sms" : target.email ? "email" : (target.phone ? "sms" : "email");

      let blockedReason: string | null = null;
      if (!target.email && !target.phone) {
        blockedReason = "This route target has no email or phone to preflight.";
      }

      const preview: DeliveryPreview = {
        dryRun: true,
        action: `Send ${route.routeType} preflight to route target`,
        channel: usedChannel,
        recipientName: target.name ?? null,
        recipientEmail: usedChannel === "email" ? (target.email ?? null) : null,
        recipientPhone: usedChannel === "sms" ? (target.phone ?? null) : null,
        subject: usedChannel === "email"
          ? `${ctx?.operatorName || "A colleague"} would like to send you an inquiry`
          : null,
        body: message,
        inquiry: inquiry
          ? {
              id: inquiry.id,
              clientName: inquiry.clientName ?? null,
              eventDate: ctx?.eventDate ?? null,
              serviceType: inquiry.serviceType ?? null,
            }
          : null,
        routeTarget: { id: target.id, name: target.name ?? null },
        recordEffect: blockedReason
          ? "Nothing. In real mode this preflight would be refused (see reason below)."
          : "In real mode: marks this route as pending, saves the preflight message, and records a score-neutral routing event.",
        blockedReason,
      };
      res.json({ dryRun: true, preview });
    } catch (error: any) {
      console.error("[Routing] Preflight preview error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- Routing: record a route target's response (operator captures the reply) ---
  app.patch("/api/inquiry-routes/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const route = await storage.getInquiryRoute(req.params.id);
      if (!route) return res.status(404).json({ error: "Route not found" });
      if (route.operatorId !== userId) return res.status(403).json({ error: "Access denied" });

      const { status, responseRaw } = req.body as { status?: string; responseRaw?: string };
      const allowed = ["accepted", "declined", "needs_review", "completed", "pending", "draft"];
      if (status && !allowed.includes(status)) {
        return res.status(400).json({ error: `Invalid status: ${status}` });
      }
      const updated = await storage.updateInquiryRoute(route.id, {
        ...(status ? { status } : {}),
        ...(responseRaw !== undefined ? { responseRaw } : {}),
        ...(status === "accepted" || status === "declined" || status === "needs_review"
          ? { respondedAt: new Date() }
          : {}),
      });
      if (status === "accepted" || status === "declined" || status === "needs_review") {
        const routing = await import("./routingService");
        await routing.recordRoutingEvent({
          operatorId: userId,
          eventType:
            status === "accepted"
              ? "route_preflight_accepted"
              : status === "declined"
                ? "route_preflight_declined"
                : "response_received",
          evidenceText: `Route ${route.id} marked ${status}`,
          contextualFactors: [`status:${status}`],
        });
      }
      res.json({ route: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Direct portfolio photo upload
  app.post("/api/artist-profiles/:userId/portfolio", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (req.params.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { imageData, mimeType } = req.body;
      if (!imageData || !mimeType) {
        return res.status(400).json({ error: "Image data and mime type required" });
      }

      const artistProfile = await storage.getArtistProfile(userId);
      if (!artistProfile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      const currentUrls: string[] = (artistProfile.portfolioUrls as string[]) || [];
      const objectService = new ObjectStorageService();
      
      const objectId = randomUUID();
      const extension = mimeType.split('/')[1] || 'jpg';
      const objectPath = `portfolio/${userId}/${objectId}.${extension}`;
      
      const buffer = Buffer.from(imageData, 'base64');
      // uploadBuffer now returns the serving URL directly
      const servingUrl = await objectService.uploadBuffer(objectPath, buffer, mimeType, userId);
      const updatedUrls = [...currentUrls, servingUrl];
      
      const updatedProfile = await storage.updateArtistProfile(userId, { 
        portfolioUrls: updatedUrls 
      });

      res.json({ success: true, url: servingUrl, portfolioUrls: updatedUrls });
    } catch (error: any) {
      console.error("Portfolio upload error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Delete portfolio photo
  app.delete("/api/artist-profiles/:userId/portfolio", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      if (req.params.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { imageUrl } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ error: "Image URL required" });
      }

      const artistProfile = await storage.getArtistProfile(userId);
      if (!artistProfile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      const currentUrls: string[] = (artistProfile.portfolioUrls as string[]) || [];
      const updatedUrls = currentUrls.filter(url => url !== imageUrl);
      
      await storage.updateArtistProfile(userId, { 
        portfolioUrls: updatedUrls 
      });

      res.json({ success: true, portfolioUrls: updatedUrls });
    } catch (error: any) {
      console.error("Portfolio delete error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Reorder portfolio photos
  app.patch("/api/artist-profiles/:userId/portfolio/order", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (req.params.userId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const { portfolioUrls } = req.body;
      if (!Array.isArray(portfolioUrls)) {
        return res.status(400).json({ error: "portfolioUrls must be an array" });
      }

      // Validate all entries are non-empty strings
      if (!portfolioUrls.every((url: unknown) => typeof url === 'string' && url.length > 0)) {
        return res.status(400).json({ error: "All portfolio URLs must be non-empty strings" });
      }

      // Check for duplicates in the incoming array
      const incomingSet = new Set(portfolioUrls);
      if (incomingSet.size !== portfolioUrls.length) {
        return res.status(400).json({ error: "Duplicate URLs not allowed" });
      }

      const artistProfile = await storage.getArtistProfile(userId);
      if (!artistProfile) {
        return res.status(404).json({ error: "Profile not found" });
      }

      // Validate that all URLs in the new order exist in the current portfolio
      const currentUrls: string[] = (artistProfile.portfolioUrls as string[]) || [];
      const currentSet = new Set(currentUrls);
      
      // Check that sets are exactly equal (same items, possibly different order)
      if (currentUrls.length !== portfolioUrls.length || 
          !portfolioUrls.every((url: string) => currentSet.has(url)) ||
          !currentUrls.every((url: string) => incomingSet.has(url))) {
        return res.status(400).json({ error: "Invalid portfolio URLs - must contain same photos" });
      }

      await storage.updateArtistProfile(userId, { 
        portfolioUrls: portfolioUrls 
      });

      res.json({ success: true, portfolioUrls });
    } catch (error: any) {
      console.error("Portfolio reorder error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // ========== FORM DESIGNER ==========
  
  // Get artist form configuration
  app.get("/api/artist-form-config/:artistId", async (req, res) => {
    try {
      const { artistId } = req.params;
      const config = await storage.getArtistFormConfig(artistId);
      
      if (!config) {
        // Return default form config
        return res.json({
          config: getDefaultFormConfig()
        });
      }
      
      res.json(config);
    } catch (error: any) {
      console.error("Error getting form config:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update artist form configuration (supports both auth and magic link token)
  app.put("/api/artist-form-config/:artistId", async (req: Request, res: Response) => {
    try {
      const { artistId } = req.params;
      const token = req.query.token as string;
      
      // Authorize via token or session - derive artistId from token, not URL
      let authorizedUserId: string | null = null;
      
      if (token) {
        // Magic link token authentication - ignore URL artistId, use token owner
        const profile = await storage.getArtistProfileByEditToken(token);
        if (!profile) {
          return res.status(403).json({ error: "Invalid or expired token" });
        }
        // Security: always use profile.userId from token, ignore URL parameter
        authorizedUserId = profile.userId;
      } else {
        // Session-based authentication
        const userId = getAuthUserId(req);
        if (!userId || artistId !== userId) {
          return res.status(403).json({ error: "Not authorized" });
        }
        authorizedUserId = userId;
      }
      
      const { config } = req.body;
      if (!config || !config.fields) {
        return res.status(400).json({ error: "Invalid form configuration" });
      }
      
      const result = await storage.upsertArtistFormConfig(authorizedUserId, config);
      res.json(result);
    } catch (error: any) {
      console.error("Error updating form config:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // PUBLIC form config endpoint (for external form integrations by slug)
  app.get("/api/public/form-config/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      
      // Find artist profile by slug
      const profile = await storage.getArtistProfileBySlug(slug);
      if (!profile) {
        return res.status(404).json({ error: "Artist not found" });
      }
      
      // Get their form config
      const configData = await storage.getArtistFormConfig(profile.userId);
      
      if (!configData) {
        // Return default form config
        return res.json({
          fields: getDefaultFormConfig().fields
        });
      }
      
      // Return only fields (public info)
      res.json({
        fields: configData.config.fields
      });
    } catch (error: any) {
      console.error("Error getting public form config:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========== VENDOR ONBOARDING ==========
  
  // Get onboarding status and preferences
  app.get("/api/vendor/onboarding", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const profile = await storage.getArtistProfile(userId);
      
      if (!profile) {
        return res.json({
          onboardingCompleted: false,
          calendarConnected: false,
          defaultHoldHours: 72,
          slaTargets: {
            firstResponseHours: 24,
            terminalStateHours: 48,
            holdWindowHours: 72
          },
          onboardingPreferences: null
        });
      }
      
      res.json({
        onboardingCompleted: profile.onboardingCompleted || false,
        calendarConnected: profile.calendarConnected || false,
        googleCalendarId: profile.googleCalendarId || null,
        defaultHoldHours: profile.defaultHoldHours || 72,
        slaTargets: profile.slaTargets || {
          firstResponseHours: 24,
          terminalStateHours: 48,
          holdWindowHours: 72
        },
        onboardingPreferences: profile.onboardingPreferences || null
      });
    } catch (error: any) {
      console.error("Error getting onboarding status:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update onboarding preferences
  app.patch("/api/vendor/onboarding", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const { defaultHoldHours, slaTargets, onboardingPreferences, calendarConnected, googleCalendarId } = req.body;
      
      let profile = await storage.getArtistProfile(userId);
      
      const updateData: Partial<ArtistProfile> = {};
      if (defaultHoldHours !== undefined) updateData.defaultHoldHours = defaultHoldHours;
      if (slaTargets !== undefined) updateData.slaTargets = slaTargets;
      if (onboardingPreferences !== undefined) updateData.onboardingPreferences = onboardingPreferences;
      if (calendarConnected !== undefined) updateData.calendarConnected = calendarConnected;
      if (googleCalendarId !== undefined) updateData.googleCalendarId = googleCalendarId;
      
      if (!profile) {
        // Create a new profile with onboarding data
        profile = await storage.createArtistProfile({
          userId,
          ...updateData
        });
      } else {
        profile = await storage.updateArtistProfile(userId, updateData);
      }
      
      res.json(profile);
    } catch (error: any) {
      console.error("Error updating onboarding:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Complete onboarding
  app.post("/api/vendor/onboarding/complete", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      
      let profile = await storage.getArtistProfile(userId);
      
      if (!profile) {
        profile = await storage.createArtistProfile({
          userId,
          onboardingCompleted: true
        });
      } else {
        profile = await storage.updateArtistProfile(userId, {
          onboardingCompleted: true
        });
      }
      
      res.json({ success: true, profile });
    } catch (error: any) {
      console.error("Error completing onboarding:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Seed test inquiries for new vendors
  app.post("/api/vendor/onboarding/seed-test-inquiries", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'artist') {
        return res.status(403).json({ error: "Only vendors can seed test inquiries" });
      }
      
      // Create 3 test inquiries with different scenarios
      const testInquiries = [
        {
          vendorId: userId,
          clientEmail: "test-bride@briarwood.test",
          clientName: "Test Client - Emily (Confirm Practice)",
          clientPhone: null,
          eventDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
          eventType: "wedding",
          eventLocation: "The Grand Ballroom, NYC",
          serviceType: "beauty",
          partySize: 8,
          message: "Hi! I'm getting married in 2 months and need a hair and makeup team for my bridal party of 8. I love your work! Are you available?",
          budget: "$2,000 - $3,000",
          status: "pending",
          metadata: { isTestInquiry: true, testScenario: "confirm" }
        },
        {
          vendorId: userId,
          clientEmail: "test-client2@briarwood.test",
          clientName: "Test Client - Sarah (Hold Practice)",
          clientPhone: null,
          eventDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
          eventType: "engagement",
          eventLocation: "Central Park, NYC",
          serviceType: "beauty",
          partySize: 2,
          message: "Looking for engagement photo hair and makeup. Your style is exactly what I want! What are your rates?",
          budget: "$500 - $800",
          status: "pending",
          metadata: { isTestInquiry: true, testScenario: "hold" }
        },
        {
          vendorId: userId,
          clientEmail: "test-client3@briarwood.test",
          clientName: "Test Client - Amanda (Propose Practice)",
          clientPhone: null,
          eventDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          eventType: "bridal_shower",
          eventLocation: "Private Residence, Brooklyn",
          serviceType: "beauty",
          partySize: 5,
          message: "Planning my bridal shower and would love your services for me and 4 guests. Can you do on-site?",
          budget: "$800 - $1,200",
          status: "pending",
          metadata: { isTestInquiry: true, testScenario: "propose" }
        }
      ];
      
      const createdInquiries = [];
      for (const inquiry of testInquiries) {
        const created = await storage.createInquiry(inquiry);
        createdInquiries.push(created);
      }
      
      res.json({ 
        success: true, 
        message: "3 test inquiries created for practice",
        inquiries: createdInquiries 
      });
    } catch (error: any) {
      console.error("Error seeding test inquiries:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========== COACHING NUDGES (Private CDI-powered tips) ==========
  
  // Get coaching nudges for the vendor - plain language tips based on their behavior
  app.get("/api/vendor/coaching-nudges", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const nudges: Array<{
        id: string;
        type: 'response_time' | 'conversion' | 'availability' | 'handoff' | 'weekend';
        message: string;
        action: string;
        priority: 'tip' | 'suggestion' | 'opportunity';
        icon: string;
      }> = [];
      
      // Get vendor's recent metrics (last 30 days)
      const metrics = await storage.getVendorMetrics(userId, 30);
      const profile = await storage.getArtistProfile(userId);
      
      // Generate contextual nudges based on behavior patterns
      
      // 1. Response time nudge
      if (metrics.avgTimeToFirstResponseMinutes && metrics.avgTimeToFirstResponseMinutes > 240) {
        nudges.push({
          id: 'response_time',
          type: 'response_time',
          message: 'Faster replies = more bookings',
          action: 'Responding within 2 hours on weekdays can increase your confirm rate by up to 18%.',
          priority: 'suggestion',
          icon: 'clock'
        });
      } else if (metrics.avgTimeToFirstResponseMinutes && metrics.avgTimeToFirstResponseMinutes < 60) {
        nudges.push({
          id: 'fast_responder',
          type: 'response_time',
          message: 'You\'re a fast responder!',
          action: 'Your quick replies are helping you book more clients. Keep it up!',
          priority: 'tip',
          icon: 'zap'
        });
      }
      
      // 2. Weekend opportunity nudge
      const dayOfWeek = new Date().getDay();
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        nudges.push({
          id: 'weekend_tip',
          type: 'weekend',
          message: 'Weekend inquiries are hot leads',
          action: 'Brides browsing on weekends are often ready to decide. Quick replies this weekend could land you a booking.',
          priority: 'opportunity',
          icon: 'calendar'
        });
      }
      
      // 3. Conversion rate nudge
      const totalInquiries = metrics.totalInquiries || 0;
      const confirmRate = totalInquiries > 0 
        ? (metrics.confirmSuccessCount / totalInquiries) * 100 
        : 0;
      
      if (totalInquiries >= 5 && confirmRate < 30) {
        nudges.push({
          id: 'conversion_tip',
          type: 'conversion',
          message: 'Turn more inquiries into bookings',
          action: 'Try using the "Hold" feature to give clients time to decide while securing their date.',
          priority: 'suggestion',
          icon: 'target'
        });
      }
      
      // 4. Hold expiry nudge (holdExpiryRate is 0-100 scale)
      if (metrics.holdExpiryRate > 30) {
        nudges.push({
          id: 'hold_follow_up',
          type: 'handoff',
          message: 'Follow up before holds expire',
          action: 'Some holds are expiring without converting. A friendly check-in 24 hours before expiry often seals the deal.',
          priority: 'suggestion',
          icon: 'message-circle'
        });
      }
      
      // 5. Calendar connection nudge
      if (!profile?.calendarConnected) {
        nudges.push({
          id: 'calendar_connect',
          type: 'availability',
          message: 'Connect your calendar',
          action: 'Syncing your calendar shows clients real availability and prevents double-bookings.',
          priority: 'tip',
          icon: 'calendar-check'
        });
      }
      
      // 6. Profile completion nudge
      if (!profile?.portfolioUrls || (profile.portfolioUrls as string[]).length < 3) {
        nudges.push({
          id: 'portfolio_tip',
          type: 'availability',
          message: 'Add more portfolio photos',
          action: 'Vendors with 5+ portfolio images get 40% more inquiries on average.',
          priority: 'opportunity',
          icon: 'image'
        });
      }
      
      // Sort by priority (opportunities first, then suggestions, then tips)
      const priorityOrder = { opportunity: 0, suggestion: 1, tip: 2 };
      nudges.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      
      // Limit to top 3 most relevant nudges
      res.json(nudges.slice(0, 3));
    } catch (error: any) {
      console.error("Error generating coaching nudges:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========== TRUST BADGES ==========
  
  // Get vendor's earned trust badges
  // BADGE SAFEGUARDS: Badges require sustained regression (60+ days below threshold) before removal
  // This prevents penalizing vendors publicly for temporary dips
  app.get("/api/vendor/badges", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      
      // Get metrics over different time windows for badge safeguards
      const metrics30 = await storage.getVendorMetrics(userId, 30);  // Recent performance
      const metrics90 = await storage.getVendorMetrics(userId, 90);  // Extended history for safeguards
      const profile = await storage.getArtistProfile(userId);
      
      const badges: Array<{
        id: string;
        name: string;
        description: string;
        earned: boolean;
        icon: string;
        displayOnProfile: boolean;
      }> = [];
      
      // BADGE SAFEGUARD LOGIC:
      // To EARN a badge: meet threshold in last 30 days OR 90 days
      // To LOSE a badge: must be below threshold in BOTH 30-day AND 90-day windows
      // This prevents temporary dips from removing earned badges (sustained regression required)
      
      // Fast Responder badge: avg response under 2 hours
      const fastResponder30 = metrics30.avgTimeToFirstResponseMinutes !== null && 
                              metrics30.avgTimeToFirstResponseMinutes < 120;
      const fastResponder90 = metrics90.avgTimeToFirstResponseMinutes !== null && 
                              metrics90.avgTimeToFirstResponseMinutes < 120;
      // Safeguard: Keep badge if EITHER window meets threshold (sustained regression required to lose)
      const fastResponderEarned = fastResponder30 || fastResponder90;
      badges.push({
        id: 'fast_responder',
        name: 'Fast Responder',
        description: 'Typically responds within 2 hours',
        earned: fastResponderEarned,
        icon: 'zap',
        displayOnProfile: profile?.responsiveBadge || false
      });
      
      // Great Handoffs badge: high terminal state rate
      const greatHandoffs30 = metrics30.terminalStateUnder24hPercent >= 70;
      const greatHandoffs90 = metrics90.terminalStateUnder24hPercent >= 70;
      // Safeguard: Keep badge if EITHER window meets threshold
      const greatHandoffsEarned = greatHandoffs30 || greatHandoffs90;
      badges.push({
        id: 'great_handoffs',
        name: 'Great Handoffs',
        description: 'Moves inquiries to decisions quickly',
        earned: greatHandoffsEarned,
        icon: 'check-circle',
        displayOnProfile: false
      });
      
      // Reliable badge: low hold expiry rate (holdExpiryRate is 0-100 percent)
      const reliable30 = metrics30.holdExpiryRate < 10 && metrics30.totalInquiries >= 3;
      const reliable90 = metrics90.holdExpiryRate < 10 && metrics90.totalInquiries >= 5;
      // Safeguard: Keep badge if EITHER window meets threshold
      const reliableEarned = reliable30 || reliable90;
      badges.push({
        id: 'reliable',
        name: 'Reliable',
        description: 'Follows through on holds',
        earned: reliableEarned,
        icon: 'shield-check',
        displayOnProfile: false
      });
      
      // High Booker badge: good confirm rate
      const confirmRate30 = metrics30.totalInquiries > 0 
        ? (metrics30.confirmSuccessCount / metrics30.totalInquiries) * 100 
        : 0;
      const confirmRate90 = metrics90.totalInquiries > 0 
        ? (metrics90.confirmSuccessCount / metrics90.totalInquiries) * 100 
        : 0;
      const highBooker30 = confirmRate30 >= 50 && metrics30.totalInquiries >= 3;
      const highBooker90 = confirmRate90 >= 50 && metrics90.totalInquiries >= 5;
      // Safeguard: Keep badge if EITHER window meets threshold
      const highBookerEarned = highBooker30 || highBooker90;
      badges.push({
        id: 'high_booker',
        name: 'High Booker',
        description: 'Excellent conversion rate',
        earned: highBookerEarned,
        icon: 'trending-up',
        displayOnProfile: false
      });
      
      res.json(badges);
    } catch (error: any) {
      console.error("Error getting badges:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Toggle badge display on profile
  app.patch("/api/vendor/badges/:badgeId/display", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const { badgeId } = req.params;
      const { display } = req.body;
      
      // For now, only support the responsive badge toggle
      if (badgeId === 'fast_responder') {
        await storage.updateArtistProfile(userId, {
          responsiveBadge: display
        });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error toggling badge display:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========== ARTIST SERVICES (Menu) ==========
  app.get("/api/artist-services/:artistId", async (req, res) => {
    try {
      const services = await storage.getArtistServices(req.params.artistId);
      res.json(services);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.post("/api/artist-services", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const service = await storage.createArtistService({ ...req.body, artistId: userId });
      res.json(service);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.patch("/api/artist-services/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const service = await storage.getArtistService(req.params.id);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      // Verify ownership
      const userId = getAuthUserId(req);
      if (service.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized to update this service" });
      }
      const updated = await storage.updateArtistService(req.params.id, req.body);
      res.json(updated);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.delete("/api/artist-services/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const service = await storage.getArtistService(req.params.id);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      // Verify ownership
      const userId = getAuthUserId(req);
      if (service.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized to delete this service" });
      }
      await storage.deleteArtistService(req.params.id);
      res.json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== VENDOR/ARTIST SEARCH ==========
  app.get("/api/search/vendors", async (req, res) => {
    try {
      const { location, date, service, eventDate } = req.query;
      // Support both 'date' and 'eventDate' parameters
      const searchDate = date || eventDate;
      const parsedDate = searchDate ? parseLocalDate(searchDate as string) : undefined;
      const results = await storage.searchArtists(
        location as string | undefined,
        parsedDate,
        service as string | undefined
      );
      res.json(results);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Keep backward compatibility
  app.get("/api/search/artists", async (req, res) => {
    try {
      const { location, date, service, eventDate } = req.query;
      const searchDate = date || eventDate;
      const parsedDate = searchDate ? parseLocalDate(searchDate as string) : undefined;
      const results = await storage.searchArtists(
        location as string | undefined,
        parsedDate,
        service as string | undefined
      );
      res.json(results);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== BOOKINGS ==========
  app.post("/api/bookings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      // Normalize eventDate to avoid timezone day-shift issues
      const normalizedBody = {
        ...req.body,
        clientId: userId,
        eventDate: req.body.eventDate ? parseLocalDate(req.body.eventDate) : undefined,
      };
      const data = insertBookingSchema.parse(normalizedBody);
      const booking = await storage.createBooking(data);
      
      // Record CDI behavioral event for booking request (choreography awareness dimension)
      cdiEngine.recordBehavioralEvent(
        userId,
        'client',
        'booking',
        'booking_requested',
        'choreography_awareness',
        20,
        {
          bookingId: booking.id,
          targetUserId: booking.artistId || undefined,
          targetRole: 'artist',
          evidenceText: `Booking for ${booking.serviceType} on ${booking.eventDate}`,
          contextualFactors: ['new_booking', 'client_initiated'],
        }
      ).catch((err: any) => console.error('[CDI] Booking event error:', err));
      
      // Auto-send info sheet email if vendor has one enabled
      if (booking.artistId) {
        const artistProfile = await storage.getArtistProfile(booking.artistId);
        const clientUser = await storage.getUser(userId);
        
        // Check if vendor has info sheet enabled and has content (text or PDF)
        const hasInfoSheet = artistProfile?.infoSheetEnabled && (
          artistProfile?.infoSheetContent || 
          (artistProfile?.infoSheetType === 'pdf' && artistProfile?.infoSheetPdfUrl)
        );
        
        if (hasInfoSheet && clientUser?.email) {
          const vendor = await storage.getUser(booking.artistId);
          const vendorName = artistProfile.businessName || vendor?.firstName || 'The Vendor';
          const eventDate = booking.eventDate 
            ? new Date(booking.eventDate).toLocaleDateString('en-US', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
              })
            : 'Date TBD';
          
          // Send info sheet email asynchronously (don't block the response)
          import('./emailService').then(({ sendInfoSheetEmail }) => {
            sendInfoSheetEmail({
              toEmail: clientUser.email!,
              vendorName,
              vendorEmail: vendor?.email || undefined,
              infoSheetContent: artistProfile.infoSheetContent || undefined,
              infoSheetPdfUrl: artistProfile.infoSheetPdfUrl || undefined,
              infoSheetType: (artistProfile.infoSheetType as 'template' | 'custom' | 'pdf') || 'template',
              eventDate,
              serviceType: booking.serviceType || 'Beauty Services'
            }).catch((err: any) => console.error('[Info Sheet Email] Error:', err));
          });
          
          console.log('[Info Sheet] Queued email for', clientUser.email);
        }
      }
      
      // Log activity for the artist
      if (booking.artistId) {
        try {
          const clientUser = await storage.getUser(userId);
          await logActivity({
            userId: booking.artistId,
            actorRole: 'client',
            action: 'booking_created',
            resourceType: 'booking',
            resourceId: booking.id,
            description: `New booking from ${clientUser?.firstName || 'client'} for ${booking.serviceType || 'services'} on ${booking.eventDate ? new Date(booking.eventDate).toLocaleDateString() : 'date TBD'}`,
            metadata: {
              clientName: clientUser?.firstName || 'Client',
              clientEmail: clientUser?.email,
              serviceType: booking.serviceType,
              eventDate: booking.eventDate,
            },
            sendEmail: true,
          });
        } catch (activityErr) {
          console.error('[Booking] Activity logging failed:', activityErr);
        }
      }
      
      res.json(booking);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/bookings/:id", isAuthenticated, async (req, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      res.json(booking);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Public planner view endpoint - allows planners to view shared booking details
  app.get("/api/bookings/:id/planner-view", async (req, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      // Get client info
      let clientName = "Client";
      let clientEmail = "";
      let clientPhone = "";
      
      if (booking.clientId) {
        const client = await storage.getUser(booking.clientId);
        if (client) {
          clientName = `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Client";
          clientEmail = client.email || "";
          clientPhone = client.phone || "";
        }
      }
      
      if (booking.clientContactId) {
        const contact = await storage.getClientContact(booking.clientContactId);
        if (contact) {
          clientName = contact.name || clientName;
          clientEmail = contact.email || clientEmail;
          clientPhone = contact.phone || clientPhone;
        }
      }
      
      // Get artist info
      let artistName = "Beauty Artist";
      if (booking.artistId) {
        const artist = await storage.getUser(booking.artistId);
        const artistProfile = await storage.getArtistProfile(booking.artistId);
        if (artistProfile?.businessName) {
          artistName = artistProfile.businessName;
        } else if (artist) {
          artistName = `${artist.firstName || ""} ${artist.lastName || ""}`.trim() || "Beauty Artist";
        }
      }
      
      // Return sanitized booking info for planner view
      res.json({
        id: booking.id,
        clientName,
        clientEmail,
        clientPhone,
        artistName,
        eventDate: booking.eventDate,
        eventTime: booking.eventDate ? new Date(booking.eventDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null,
        eventLocation: booking.eventLocation,
        eventType: booking.eventType,
        packageType: booking.serviceType || booking.packageType,
        notes: booking.notes,
        totalAmount: booking.totalAmount,
        depositAmount: booking.depositAmount,
        status: booking.status,
      });
    } catch (error: any) {
      console.error("[PlannerView] Error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/bookings/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const previousBooking = await storage.getBooking(req.params.id);
      if (!previousBooking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      // Extract client contact fields if provided
      // Also remove readonly fields that shouldn't be updated
      const { clientName, clientEmail, eventTime, id, createdAt, updatedAt, ...bookingFields } = req.body;
      
      // If updating client name or email, update or create the client contact record
      if (clientName || clientEmail) {
        if (previousBooking.clientContactId) {
          // Update existing client contact
          await storage.updateClientContact(previousBooking.clientContactId, {
            ...(clientName && { name: clientName }),
            ...(clientEmail && { email: clientEmail }),
          });
        } else if (clientName) {
          // Create a new client contact and link to booking
          const userId = getAuthUserId(req);
          if (!userId) {
            return res.status(401).json({ error: "Not authenticated" });
          }
          const user = await storage.getUser(userId);
          if (user) {
            const newContact = await storage.createClientContact({
              artistId: user.id,
              name: clientName,
              email: clientEmail || `${clientName.toLowerCase().replace(/\s+/g, '.')}@pending.com`,
            });
            // Link the new contact to the booking
            bookingFields.clientContactId = newContact.id;
          }
        }
        // Also update the booking's direct email field
        if (clientEmail) {
          bookingFields.clientEmail = clientEmail;
        }
      }
      
      // If eventTime is provided (not empty) and eventDate exists, combine them
      // Only modify eventDate if a valid time was provided to avoid losing existing time data
      if (eventTime && eventTime.trim() !== '' && bookingFields.eventDate) {
        const datePart = bookingFields.eventDate.split('T')[0];
        bookingFields.eventDate = new Date(`${datePart}T${eventTime}:00`).toISOString();
      }
      
      const booking = await storage.updateBooking(req.params.id, bookingFields);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      // Record CDI behavioral events for status changes
      const userId = getAuthUserId(req);
      if (userId && previousBooking && previousBooking.status !== booking.status) {
        const user = await storage.getUser(userId);
        const actorRole = (user?.role as 'client' | 'artist' | 'planner') || 'client';
        
        let signalStrength = 0;
        let eventType = 'status_changed';
        
        // Determine signal strength based on status transition
        if (booking.status === 'confirmed') {
          signalStrength = 30;
          eventType = 'booking_confirmed';
        } else if (booking.status === 'completed') {
          signalStrength = 50;
          eventType = 'booking_completed';
        } else if (booking.status === 'cancelled') {
          signalStrength = -40;
          eventType = 'booking_cancelled';
        }
        
        cdiEngine.recordBehavioralEvent(
          userId,
          actorRole,
          'booking',
          eventType,
          'choreography_awareness',
          signalStrength,
          {
            bookingId: booking.id,
            evidenceText: `Status changed from ${previousBooking.status} to ${booking.status}`,
            roleTransition: { from: previousBooking.status, to: booking.status },
            contextualFactors: ['status_transition', `${actorRole}_action`],
          }
        ).catch((err: any) => console.error('[CDI] Booking update event error:', err));
        
        // Auto-send SMS notification when booking is confirmed
        if (booking.status === 'confirmed' && smsService.isSmsConfigured()) {
          try {
            let clientPhone: string | null = null;
            let clientName = 'Client';
            let vendorName = 'Your vendor';
            
            // Get client info
            if (booking.clientId) {
              const client = await storage.getUser(booking.clientId);
              if (client?.phone) {
                clientPhone = client.phone;
                clientName = client.firstName || 'Client';
              }
            } else if (booking.clientContactId) {
              const contact = await storage.getClientContact(booking.clientContactId);
              if (contact?.phone) {
                clientPhone = contact.phone;
                clientName = contact.name || 'Client';
              }
            }
            
            // Get vendor info
            if (booking.artistId) {
              const artistProfile = await storage.getArtistProfile(booking.artistId);
              const vendor = await storage.getUser(booking.artistId);
              vendorName = artistProfile?.businessName || vendor?.firstName || 'Your vendor';
            }
            
            if (clientPhone) {
              const eventDate = booking.eventDate 
                ? new Date(booking.eventDate).toLocaleDateString('en-US', { 
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
                  })
                : 'Date TBD';
              const eventTime = booking.eventDate
                ? new Date(booking.eventDate).toLocaleTimeString('en-US', {
                    hour: 'numeric', minute: '2-digit', hour12: true
                  })
                : 'Time TBD';
              
              smsService.sendBookingConfirmation(
                clientPhone,
                clientName,
                vendorName,
                booking.serviceType || 'Beauty Service',
                eventDate,
                eventTime
              ).then(result => {
                if (result.success) {
                  console.log('[SMS] Booking confirmation sent to', clientPhone);
                } else {
                  console.warn('[SMS] Failed to send confirmation:', result.error);
                }
              }).catch(err => console.error('[SMS] Error sending confirmation:', err));
            }
          } catch (smsErr) {
            console.error('[SMS] Error in confirmation trigger:', smsErr);
          }
        }
      }
      
      res.json(booking);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.delete("/api/bookings/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      // Check authorization - only artist or admin can delete their own bookings
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (user?.role !== 'artist' && user?.role !== 'admin') {
        return res.status(403).json({ error: "Only vendors and admins can delete bookings" });
      }
      if (user?.role === 'artist' && booking.artistId !== user.id) {
        return res.status(403).json({ error: "You can only delete your own bookings" });
      }
      
      await storage.deleteBooking(req.params.id);
      res.json({ success: true, message: "Booking deleted" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/bookings/client/:clientId", isAuthenticated, async (req, res) => {
    try {
      const bookings = await storage.getBookingsByClient(req.params.clientId);
      res.json(bookings);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/bookings/artist/:artistId", async (req: Request, res: Response) => {
    try {
      // Support token-based auth for calendar component
      const token = req.query.token as string;
      let artistId = req.params.artistId;
      
      if (token) {
        const artist = await storage.getArtistProfileByEditToken(token);
        if (!artist || artist.userId !== artistId) {
          return res.status(401).json({ error: "Invalid token" });
        }
      } else {
        // Fall back to session auth
        const userId = getAuthUserId(req);
        if (!userId) {
          return res.status(401).json({ error: "Not authenticated" });
        }
      }
      
      const { startDate, endDate } = req.query;
      let bookings = await storage.getBookingsByArtist(artistId);
      
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        bookings = bookings.filter(b => {
          const eventDate = new Date(b.eventDate);
          return eventDate >= start && eventDate <= end;
        });
      }
      
      const enrichedBookings = await Promise.all(bookings.map(async (booking) => {
        let clientName = 'Unknown Client';
        let clientEmail: string | null = null;
        
        if (booking.clientId) {
          const client = await storage.getUser(booking.clientId);
          if (client) {
            clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.email || 'Unknown Client';
            clientEmail = client.email;
          }
        } else if (booking.clientContactId) {
          const contact = await storage.getClientContact(booking.clientContactId);
          if (contact) {
            clientName = contact.name;
            clientEmail = contact.email;
          }
        }
        
        return {
          ...booking,
          clientName,
          clientEmail,
        };
      }));
      res.json(enrichedBookings);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/bookings/planner/:plannerId", isAuthenticated, async (req, res) => {
    try {
      const bookings = await storage.getBookingsByPlanner(req.params.plannerId);
      res.json(bookings);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== BOOKING CHECKLISTS (Day-of Readiness) ==========
  // Get or create a checklist for a booking
  app.get("/api/bookings/:bookingId/checklist", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const { bookingId } = req.params;
      const { type = 'day_of_readiness' } = req.query;
      
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      // Only vendor (artist) of the booking can access checklist
      if (booking.artistId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      let checklist = await storage.getBookingChecklist(bookingId, userId);
      
      // If no checklist exists, create one with default items
      if (!checklist) {
        const defaultItems = [
          { id: 'prep_notes', label: 'Review prep notes and client preferences', completed: false },
          { id: 'arrival_window', label: 'Confirm arrival time and location details', completed: false },
          { id: 'contact_on_site', label: 'Have on-site contact number ready', completed: false },
          { id: 'supplies_packed', label: 'All supplies and equipment packed', completed: false },
          { id: 'travel_route', label: 'Confirm travel route and parking', completed: false },
        ];
        
        checklist = await storage.createBookingChecklist({
          bookingId,
          vendorId: userId,
          checklistType: type as string,
          items: defaultItems,
          allCompleted: false,
        });
        
        // Audit log
        await storage.createAuditLog({
          action: 'checklist_created',
          entityType: 'booking_checklist',
          entityId: checklist.id,
          performedBy: userId,
          actorRole: 'artist',
          changes: { bookingId, checklistType: type, itemCount: defaultItems.length },
        });
      }
      
      res.json(checklist);
    } catch (error: any) {
      console.error("[Checklist] Error getting checklist:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update checklist items
  app.patch("/api/bookings/:bookingId/checklist", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const { bookingId } = req.params;
      const { items, allCompleted } = req.body;
      
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      if (booking.artistId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const checklist = await storage.getBookingChecklist(bookingId, userId);
      if (!checklist) {
        return res.status(404).json({ error: "Checklist not found. GET first to create." });
      }
      
      const now = new Date();
      const updateData: Partial<BookingChecklist> = {};
      
      if (items !== undefined) {
        updateData.items = items;
      }
      
      if (allCompleted !== undefined) {
        updateData.allCompleted = allCompleted;
        if (allCompleted) {
          updateData.completedAt = now;
        }
      }
      
      const updated = await storage.updateBookingChecklist(checklist.id, updateData);
      
      // Audit log for each item change
      const previousItems = checklist.items as any[];
      const newItems = items || previousItems; // Use existing items if not provided
      for (const newItem of newItems) {
        const prevItem = previousItems.find((p: any) => p.id === newItem.id);
        if (prevItem && prevItem.completed !== newItem.completed) {
          await storage.createAuditLog({
            action: newItem.completed ? 'checklist_item_completed' : 'checklist_item_unchecked',
            entityType: 'booking_checklist',
            entityId: checklist.id,
            performedBy: userId,
            actorRole: 'artist',
            diff: { [`item_${newItem.id}`]: { from: prevItem.completed, to: newItem.completed } },
            changes: { itemId: newItem.id, itemLabel: newItem.label, bookingId },
          });
          
          // Silent CDI event for completed items
          if (newItem.completed) {
            await storage.createCdiEvent({
              userId: userId,
              eventType: 'checklist_item_completed',
              bookingId: bookingId,
              eventData: { checklistId: checklist.id, itemId: newItem.id, timestamp: now.toISOString() },
              magnitude: 2, // Positive - completing prep work is good
            });
          }
        }
      }
      
      // CDI event and audit log for full checklist completion state change
      if (allCompleted !== undefined && allCompleted !== checklist.allCompleted) {
        await storage.createAuditLog({
          action: allCompleted ? 'checklist_fully_completed' : 'checklist_completion_reverted',
          entityType: 'booking_checklist',
          entityId: checklist.id,
          performedBy: userId,
          actorRole: 'artist',
          diff: { allCompleted: { from: checklist.allCompleted, to: allCompleted } },
          changes: { bookingId },
        });
        
        if (allCompleted) {
          await storage.createCdiEvent({
            userId: userId,
            eventType: 'checklist_fully_completed',
            bookingId: bookingId,
            eventData: { checklistId: checklist.id, timestamp: now.toISOString() },
            magnitude: 5, // Higher positive for full completion
          });
        }
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("[Checklist] Error updating checklist:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all checklists for vendor
  app.get("/api/vendor/checklists", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const checklists = await storage.getBookingChecklistsByVendor(userId);
      res.json(checklists);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });

  // ========== MESSAGES ==========
  app.post("/api/messages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const senderId = getAuthUserId(req);
      const data = insertMessageSchema.parse({ ...req.body, senderId });
      
      // Security: Only allow messaging between users with confirmed bookings
      const recipientId = data.recipientId;
      const hasBookingRelationship = await storage.checkBookingRelationship(senderId, recipientId);
      
      if (!hasBookingRelationship) {
        return res.status(403).json({ 
          error: "You can only message users you have a confirmed booking with" 
        });
      }
      
      const message = await storage.createMessage(data);
      
      // Analyze message with CDI Engine (three-dimension scoring) - non-blocking
      const sender = await storage.getUser(senderId);
      if (sender) {
        // Get booking context if available
        const booking = data.bookingId ? await storage.getBooking(data.bookingId) : null;
        
        // Get dynamic weights from evolutionary learning
        const dynamicWeights = await cdiEngine.getDynamicWeights();
        
        // Run three-dimension CDI analysis with dynamic weights
        // BEHAVIORAL CDI: record the ground-truth event (message sent) with a
        // fixed signal derived from observable facts only (it happened, length).
        // The AI interpretation below is annotation, not score input.
        cdiEngine.recordBehavioralEvent(
          senderId,
          (sender.role as 'client' | 'artist' | 'planner') || 'client',
          'communication',
          'message_sent',
          'emotional_fidelity',
          message.content && message.content.trim().length > 0 ? 5 : 0,
          {
            bookingId: data.bookingId || undefined,
            evidenceText: message.content.substring(0, 100),
          }
        ).catch((err: Error) => console.error('[CDI Engine] Behavioral event error:', err));

        // AI COMMENTARY (annotation only — never written to headline CDI).
        cdiEngine.analyzeForCDI(senderId, message.content, {
          actorRole: (sender.role as 'client' | 'artist' | 'planner') || 'client',
          targetRole: data.recipientId ? undefined : undefined,
          bookingId: data.bookingId || undefined,
          bookingStatus: booking?.status || undefined,
        }, dynamicWeights).then(async (result: any) => {
          console.log(`[CDI Commentary] ${sender.role} ${senderId}: AI read=${result.compositeScore} (${result.trustLevel}) — annotation only`);
          await cdiEngine.storeAiInterpretation(senderId, result, { messageId: message.id });
        }).catch((err: Error) => {
          console.error('[CDI Engine] Analysis error:', err);
        });
      }
      
      res.json(message);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/messages/booking/:bookingId", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getMessagesByBooking(req.params.bookingId);
      res.json(messages);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/messages/between/:user1Id/:user2Id", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getMessagesBetweenUsers(
        req.params.user1Id,
        req.params.user2Id
      );
      res.json(messages);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== SMS MESSAGING ==========
  app.get("/api/sms/status", isAuthenticated, async (req, res) => {
    res.json({ 
      configured: smsService.isSmsConfigured(),
      message: smsService.isSmsConfigured() 
        ? 'SMS service is ready' 
        : 'SMS service not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.'
    });
  });

  // ===== INBOUND SMS (Step 1: headless coordination) =====
  // Twilio posts here (application/x-www-form-urlencoded) whenever someone
  // replies to a Briarwood text. Purely additive: stores the reply, matches it
  // to a known sender/inquiry when possible, and writes a response_received
  // trust event. Always returns 200 + empty TwiML so Twilio doesn't retry.
  app.post("/api/sms/inbound", async (req: Request, res: Response) => {
    const replyTwiml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
    const sendOk = () => res.status(200).type("text/xml").send(replyTwiml);
    try {
      const body = req.body || {};

      // Verify the request really came from Twilio before doing anything else.
      // Without this, anyone could spoof a "From" number and inject fake trust
      // events. Reconstruct the exact public URL Twilio signed over.
      const signature = req.header("X-Twilio-Signature");
      const proto = (req.headers["x-forwarded-proto"] as string)?.split(",")[0] || req.protocol;
      const fullUrl = `${proto}://${req.get("host")}${req.originalUrl}`;
      if (!smsService.validateTwilioRequest(signature, fullUrl, body)) {
        console.warn(`[SMS Inbound] Rejected: invalid/missing Twilio signature (url=${fullUrl}).`);
        return res.status(403).type("text/xml").send(replyTwiml);
      }
      // Hand the authenticated payload to the SINGLE shared inbound path that
      // does matching, storage, idempotency, and the trust-event write. The
      // admin SMS test simulator calls this exact same function — there is no
      // duplicate logic. (See server/inboundProcessor.ts.)
      const result = await processInboundSms(storage, {
        messageSid: body.MessageSid || body.SmsSid || "",
        fromRaw: body.From || "",
        toRaw: body.To || "",
        text: (body.Body ?? "").toString(),
        rawPayload: { ...body },
      });

      if (result.outcome === "ignored_missing_fields") {
        console.warn("[SMS Inbound] Missing MessageSid or From; ignoring.");
      } else if (result.outcome === "duplicate") {
        console.log(`[SMS Inbound] Duplicate MessageSid ignored (existing=${result.savedId || "?"}).`);
      } else {
        console.log(`[SMS Inbound] Stored ${result.savedId} (status=${result.matchStatus}, conf=${result.matchConfidence}, trustEvent=${result.trustEventId || "none"})`);
      }
      return sendOk();
    } catch (error: any) {
      console.error("[SMS Inbound] Handler error:", error?.message, error?.stack);
      // Still return 200 so Twilio doesn't hammer retries on a transient failure.
      return sendOk();
    }
  });

  // Admin-visible verification log for inbound SMS.
  app.get("/api/sms/inbound/recent", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10) || 50, 200);
      const rows = await storage.getRecentInboundSmsEnriched(limit);
      res.json({ count: rows.length, messages: rows });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Failed to load inbound SMS" });
    }
  });

  // Admin search to help manually match an unmatched inbound reply.
  // type = user | contact | inquiry | referral
  app.get("/api/sms/inbound/match-search", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      const type = String(req.query.type || "");
      const q = String(req.query.q || "").trim();
      if (!q) return res.json({ results: [] });

      let results: any[] = [];
      switch (type) {
        case "user":
          results = await storage.searchUsersForMatch(q);
          break;
        case "contact":
          results = await storage.searchClientContactsForMatch(q);
          break;
        case "inquiry":
          results = await storage.searchInquiriesForMatch(q);
          break;
        case "referral":
          results = await storage.searchThreadReferralsForMatch(q);
          break;
        default:
          return res.status(400).json({ error: "Invalid search type" });
      }
      res.json({ results });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Search failed" });
    }
  });

  // Admin: manually match an inbound reply to a person/contact/inquiry/referral.
  // Idempotent: if the message already has a trust event, it will not create another.
  app.post("/api/sms/inbound/:id/match", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id } = req.params;
      const { matchedUserId, matchedContactId, matchedInquiryId, matchedReferralId } = req.body || {};

      if (!matchedUserId && !matchedContactId && !matchedInquiryId && !matchedReferralId) {
        return res.status(400).json({ error: "Select at least one person, contact, inquiry, or referral to match." });
      }

      const row = await storage.getInboundSmsById(id);
      if (!row) {
        return res.status(404).json({ error: "Inbound reply not found" });
      }

      // Resolve the user this trust event should attribute to. Prefer an
      // explicitly selected user, then fall back through contact -> inquiry ->
      // referral owners so the response_received event always has a real userId.
      let trustUserId: string | undefined = matchedUserId || undefined;
      if (!trustUserId && matchedContactId) {
        const contact = await storage.getClientContact(matchedContactId);
        trustUserId = contact?.linkedUserId || contact?.artistId || undefined;
      }
      if (!trustUserId && matchedInquiryId) {
        const inquiry = await storage.getInquiry(matchedInquiryId);
        trustUserId = inquiry?.vendorId || undefined;
      }
      if (!trustUserId && matchedReferralId) {
        const referral = await storage.getThreadReferralById(matchedReferralId);
        trustUserId = referral?.referredArtistId || undefined;
      }

      // Atomic + idempotent: link IDs + (at most one) trust event, under a row lock.
      const result = await storage.matchInboundSmsAtomic({
        id,
        links: { matchedUserId, matchedContactId, matchedInquiryId, matchedReferralId },
        trustUserId,
        evidenceText: (row.body || "").slice(0, 280),
        contextualFactors: [
          "channel:sms_inbound",
          "match:manual",
          matchedInquiryId ? `inquiry:${matchedInquiryId}` : "inquiry:none",
        ],
      });

      if (!result.found) {
        return res.status(404).json({ error: "Inbound reply not found" });
      }

      const enriched = await storage.getInboundSmsEnrichedById(id);
      console.log(`[SMS Inbound] Manual match on ${id} (trustEvent=${result.trustEventId || "none"}, created=${result.createdNewEvent})`);
      res.json({ message: enriched, createdNewEvent: result.createdNewEvent });
    } catch (error: any) {
      console.error("[SMS Inbound] Manual match error:", error?.message);
      res.status(500).json({ error: error?.message || "Match failed" });
    }
  });

  // ===== ADMIN-ONLY SMS INBOUND TEST TOOL =====
  // A safe simulator that pushes a FAKE inbound payload through the exact same
  // internal path as the real Twilio webhook (server/inboundProcessor.ts):
  // matching, storage, idempotency, and the trust-event write. It does NOT touch
  // the real /api/sms/inbound route or its Twilio signature validation, and it
  // is gated behind BOTH an admin role AND the ENABLE_SMS_TEST_TOOLS env flag.
  const smsTestToolsEnabled = () => process.env.ENABLE_SMS_TEST_TOOLS === "true";

  // Lets the admin UI know whether to render the test panel at all.
  app.get("/api/admin/sms-test/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      res.json({ enabled: smsTestToolsEnabled() });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || "Failed" });
    }
  });

  app.post("/api/admin/sms-test/simulate", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // When the flag is off, behave as if the route does not exist.
      if (!smsTestToolsEnabled()) {
        return res.status(404).json({ error: "Not found" });
      }
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { from, body, messageSid, to } = req.body || {};
      if (!from || typeof from !== "string") {
        return res.status(400).json({ error: "A 'from' phone number is required." });
      }

      // Reuse a provided MessageSid (so the duplicate-delivery case can be
      // tested) or generate a clearly-marked simulated one.
      const sid = (messageSid && String(messageSid).trim())
        || `SIMTEST-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const toNumber = to ? String(to) : (process.env.TWILIO_PHONE_NUMBER || "+10000000000");

      const result = await processInboundSms(storage, {
        messageSid: sid,
        fromRaw: String(from),
        toRaw: toNumber,
        text: body ? String(body) : "",
        rawPayload: { From: String(from), To: toNumber, Body: body ? String(body) : "", MessageSid: sid, _simulated: true },
      });

      const enriched = result.savedId ? await storage.getInboundSmsEnrichedById(result.savedId) : null;
      console.log(`[SMS Test] Simulated inbound (sid=${sid}, outcome=${result.outcome}, status=${result.matchStatus}, trustEvent=${result.trustEventId || "none"})`);
      res.json({ simulated: true, messageSid: sid, result, message: enriched });
    } catch (error: any) {
      console.error("[SMS Test] Simulate error:", error?.message);
      res.status(500).json({ error: error?.message || "Simulation failed" });
    }
  });

  app.post("/api/sms/send", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { to, message } = req.body;
      
      if (!to || !message) {
        return res.status(400).json({ error: 'Phone number and message are required' });
      }
      
      const result = await smsService.sendSms(to, message);
      
      if (result.success) {
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/sms/booking-reminder", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { bookingId, clientPhone, clientName, vendorName, serviceName, appointmentDate, appointmentTime } = req.body;
      
      if (!clientPhone || !clientName || !vendorName || !serviceName || !appointmentDate || !appointmentTime) {
        return res.status(400).json({ error: 'All booking details are required' });
      }

      // Defect #8: only the artist who owns the booking may send reminders
      // for it. bookingId is required so ownership can be verified.
      if (!bookingId) {
        return res.status(400).json({ error: 'bookingId is required' });
      }
      const reminderUserId = getAuthUserId(req);
      const reminderBooking = await storage.getBooking(bookingId);
      if (!reminderBooking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      if (reminderBooking.artistId !== reminderUserId) {
        return res.status(403).json({ error: 'Not authorized' });
      }
      
      const result = await smsService.sendBookingReminder(
        clientPhone,
        clientName,
        vendorName,
        serviceName,
        appointmentDate,
        appointmentTime
      );
      
      if (result.success) {
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/sms/booking-confirmation", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { clientPhone, clientName, vendorName, serviceName, appointmentDate, appointmentTime } = req.body;
      
      if (!clientPhone || !clientName || !vendorName || !serviceName || !appointmentDate || !appointmentTime) {
        return res.status(400).json({ error: 'All booking details are required' });
      }
      
      const result = await smsService.sendBookingConfirmation(
        clientPhone,
        clientName,
        vendorName,
        serviceName,
        appointmentDate,
        appointmentTime
      );
      
      if (result.success) {
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/sms/payment-reminder", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { bookingId, clientPhone, clientName, vendorName, amount, dueDate } = req.body;
      
      if (!clientPhone || !clientName || !vendorName || !amount || !dueDate) {
        return res.status(400).json({ error: 'All payment details are required' });
      }

      // Defect #8: only the artist who owns the booking may send reminders
      // for it. bookingId is required so ownership can be verified.
      if (!bookingId) {
        return res.status(400).json({ error: 'bookingId is required' });
      }
      const paymentUserId = getAuthUserId(req);
      const paymentBooking = await storage.getBooking(bookingId);
      if (!paymentBooking) {
        return res.status(404).json({ error: 'Booking not found' });
      }
      if (paymentBooking.artistId !== paymentUserId) {
        return res.status(403).json({ error: 'Not authorized' });
      }
      
      const result = await smsService.sendPaymentReminder(
        clientPhone,
        clientName,
        vendorName,
        amount,
        dueDate
      );
      
      if (result.success) {
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/sms/schedule-notification", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { recipientPhone, senderName, eventName, scheduleLink } = req.body;
      
      if (!recipientPhone || !senderName || !eventName || !scheduleLink) {
        return res.status(400).json({ error: 'All schedule notification details are required' });
      }
      
      const result = await smsService.sendScheduleNotification(
        recipientPhone,
        senderName,
        eventName,
        scheduleLink
      );
      
      if (result.success) {
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/sms/bulk", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { recipients, message } = req.body;
      
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0 || !message) {
        return res.status(400).json({ error: 'Recipients array and message are required' });
      }
      
      if (recipients.length > 100) {
        return res.status(400).json({ error: 'Maximum 100 recipients per bulk send' });
      }
      
      const result = await smsService.sendBulkSms(recipients, message);
      
      res.json({ 
        success: true, 
        successful: result.successful, 
        failed: result.failed,
        total: recipients.length 
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });

  // ========== INVOICE SENDING (Email/SMS) ==========
  app.post("/api/invoice/send-email", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { toEmail, clientName, vendorName, amount, description, paymentLink } = req.body;
      
      if (!toEmail || !clientName || !vendorName || !amount || !paymentLink) {
        return res.status(400).json({ error: 'All invoice details are required' });
      }
      
      const emailService = await import("./emailService");
      const result = await emailService.sendInvoiceEmail({
        toEmail,
        clientName,
        vendorName,
        amount,
        description: description || 'Beauty Services',
        paymentLink
      });
      
      if (result.success) {
        res.json({ success: true, message: 'Invoice sent via email' });
      } else {
        res.status(400).json({ error: result.error || 'Failed to send email' });
      }
    } catch (error: any) {
      console.error("Invoice email error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========== BOOKING EMAIL ==========
  app.post("/api/booking/send-email", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { bookingId, toEmail, clientName, subject, body, eventDate, eventLocation } = req.body;
      const userId = getAuthUserId(req);

      if (!bookingId || !toEmail || !clientName || !subject || !body) {
        return res.status(400).json({ error: 'Booking ID, email, client name, subject, and message are required' });
      }

      // Get booking to verify artist ownership
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Verify the user is the artist on this booking
      if (booking.artistId !== userId) {
        return res.status(403).json({ error: 'Not authorized to send email for this booking' });
      }

      // Send email via Resend
      const emailService = await import("./emailService");
      const { client: resendClient } = await emailService.getResendClient();

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Georgia', serif; background-color: #f5f1e8; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .header { 
              background-color: #FAF7F2;
              background-image:
                repeating-linear-gradient(0deg, transparent, transparent 12px, rgba(107, 74, 85, 0.35) 12px, rgba(107, 74, 85, 0.35) 24px),
                repeating-linear-gradient(90deg, transparent, transparent 12px, rgba(107, 74, 85, 0.35) 12px, rgba(107, 74, 85, 0.35) 24px);
              padding: 28px; 
              text-align: center;
              border-bottom: 1px solid rgba(107, 74, 85, 0.2);
            }
            .header h1 { font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-size: 28px; margin: 0; font-weight: normal; color: #6B4A55; }
            .header p { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; margin: 8px 0 0 0; color: #6B4A55; opacity: 0.8; }
            .content { padding: 32px; }
            .message { line-height: 1.6; color: #333; white-space: pre-wrap; }
            .details { margin-top: 24px; padding-top: 24px; border-top: 1px solid #eee; font-size: 13px; color: #666; }
            .footer { text-align: center; padding: 20px; color: #888; font-size: 12px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Private Secretary</h1>
              </div>
            <div class="content">
              <p>Hi ${clientName},</p>
              <div class="message">${body}</div>
              ${eventDate || eventLocation ? `<div class="details">
                ${eventDate ? `<p><strong>Event Date:</strong> ${eventDate}</p>` : ''}
                ${eventLocation ? `<p><strong>Location:</strong> ${eventLocation}</p>` : ''}
              </div>` : ''}
            </div>
            <div class="footer">
              Your Private Secretary
            </div>
          </div>
        </body>
        </html>
      `;

      const result = await resendClient.emails.send({
        from: 'Your Secretary <notifications@dateinquiry.com>',
        to: toEmail.trim(),
        subject: subject,
        html: htmlContent
      });

      // Log the communication
      await storage.createCommunicationLog({
        artistId: userId,
        recipientName: clientName,
        recipientEmail: toEmail,
        communicationType: 'appointment_email',
        subject: subject,
        content: body,
        metadata: {
          bookingId,
          eventDate,
          eventLocation
        }
      });

      res.json({ success: true, message: 'Email sent successfully' });
    } catch (error: any) {
      console.error("Booking email error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========== BRANDED APPOINTMENT CONFIRMATION EMAIL ==========
  app.post("/api/booking/send-appointment-confirmation", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { bookingId, personalMessage } = req.body;
      const userId = getAuthUserId(req);

      if (!bookingId) {
        return res.status(400).json({ error: 'Booking ID is required' });
      }

      // Get booking
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      // Verify the user is the artist on this booking
      if (booking.artistId !== userId) {
        return res.status(403).json({ error: 'Not authorized to send email for this booking' });
      }

      // Get client info
      let clientEmail = '';
      let clientName = '';
      
      if (booking.clientId) {
        const client = await storage.getUser(booking.clientId);
        if (client) {
          clientEmail = client.email || '';
          clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Client';
        }
      } else if (booking.clientContactId) {
        const contact = await storage.getClientContact(booking.clientContactId);
        if (contact) {
          clientEmail = contact.email || '';
          clientName = contact.name || 'Client';
        }
      }

      if (!clientEmail) {
        return res.status(400).json({ error: 'Client email not found for this booking' });
      }

      // Get artist profile for branding
      const artistProfile = await storage.getArtistProfile(userId);
      const artist = await storage.getUser(userId);
      const businessName = artistProfile?.businessName || 
        (artist ? `${artist.firstName || ''} ${artist.lastName || ''}`.trim() : 'Beauty Artist');
      const logoUrl = artistProfile?.logoUrl || '';

      // Format date
      const eventDate = booking.eventDate 
        ? new Date(booking.eventDate).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })
        : 'TBD';

      const eventTime = booking.eventDate
        ? new Date(booking.eventDate).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
        : undefined;

      // Build chat link - use production URL for client-facing links
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://briarwood.ai';
      const chatLink = `${baseUrl}/messages`;

      // Send branded email
      const emailService = await import("./emailService");
      const result = await emailService.sendAppointmentConfirmationEmail({
        toEmail: clientEmail,
        clientName,
        artistBusinessName: businessName,
        artistLogoUrl: logoUrl,
        eventDate,
        eventTime,
        eventLocation: booking.location || undefined,
        serviceType: booking.serviceType || undefined,
        paymentLink: booking.squarePaymentLinkUrl || undefined,
        chatLink,
        personalMessage
      });

      if (result.success) {
        // Log the communication
        await storage.createCommunicationLog({
          artistId: userId,
          recipientName: clientName,
          recipientEmail: clientEmail,
          communicationType: 'appointment_confirmation',
          subject: `Appointment Confirmation - ${eventDate}`,
          content: personalMessage || 'Appointment confirmation sent',
          metadata: {
            bookingId,
            eventDate,
            eventLocation: booking.location
          }
        });

        res.json({ success: true, message: 'Appointment confirmation sent!' });
      } else {
        res.status(400).json({ error: result.error || 'Failed to send email' });
      }
    } catch (error: any) {
      console.error("Appointment confirmation email error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/invoice/send-sms", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { toPhone, clientName, vendorName, amount, paymentLink } = req.body;
      
      if (!toPhone || !clientName || !vendorName || !amount || !paymentLink) {
        return res.status(400).json({ error: 'All invoice details are required' });
      }
      
      if (!smsService.isSmsConfigured()) {
        return res.status(400).json({ error: 'SMS service not configured. Please set up Twilio credentials.' });
      }
      
      const formattedAmount = (amount / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
      const message = `Hi ${clientName}! ${vendorName} has sent you an invoice for ${formattedAmount}. Pay securely here: ${paymentLink}`;
      
      const result = await smsService.sendSms(toPhone, message);
      
      if (result.success) {
        res.json({ success: true, message: 'Invoice sent via SMS', messageId: result.messageId });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error: any) {
      console.error("Invoice SMS error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========== CONTRACTS ==========
  app.post("/api/contracts", isAuthenticated, async (req, res) => {
    try {
      const data = insertContractSchema.parse(req.body);
      const contract = await storage.createContract(data);
      res.json(contract);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const contract = await storage.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }

      // Ownership/admin scoping: only the owning artist (or an admin) may read a
      // contract by id. Closes an IDOR where any logged-in artist could fetch
      // another artist's contract. Response shape is intentionally unchanged.
      // The public signing/countersign flows use separate token routes and are
      // not affected by this check.
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const requester = await storage.getUser(userId);
      const isAdmin = requester?.role === "admin";
      if (contract.artistId !== userId && !isAdmin) {
        return res.status(403).json({ error: "You can only view your own contracts" });
      }

      const booking = await storage.getBooking(contract.bookingId);
      let clientName = "";
      let eventDate = null;
      let eventLocation = "";
      
      if (booking) {
        eventDate = booking.eventDate;
        eventLocation = booking.location || "";
        const client = await storage.getUser(booking.clientId);
        if (client) {
          clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim();
        }
      }
      
      res.json({
        ...contract,
        clientName,
        eventDate,
        eventLocation,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.patch("/api/contracts/:id", isAuthenticated, async (req, res) => {
    try {
      // Owner/admin scoping: fetch first, then authorize. Closes a write-side
      // IDOR + mass-assignment. Sensitive fields (signingToken, signatures,
      // openSign*, amounts, ids, timestamps, contractHtml) are never accepted.
      // Public token signing/countersign routes are separate and untouched.
      const contract = await storage.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const requester = await storage.getUser(userId);
      const isAdmin = requester?.role === "admin";
      if (contract.artistId !== userId && !isAdmin) {
        return res.status(403).json({ error: "You can only edit your own contracts" });
      }

      // Strict whitelist of safe, editable metadata fields. Anything else in the
      // request body is ignored (no raw req.body pass-through).
      const body = req.body ?? {};
      const updates: Record<string, unknown> = {};
      const textFields = [
        "clientName",
        "clientContact",
        "eventDates",
        "eventLocation",
        "packageDetails",
        "contractUrl",
        "contractSource",
        "contractNotes",
      ];
      for (const f of textFields) {
        if (typeof body[f] === "string") updates[f] = body[f];
      }
      // Status is metadata only here. Flow states (sent/signed/completed/paid)
      // are reached only through the real send/sign/payment flows, never here.
      if (typeof body.status === "string" && VAULT_EDITABLE_STATUSES.includes(body.status)) {
        updates.status = body.status;
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No editable fields provided" });
      }

      const updated = await storage.updateContract(req.params.id, updates as any);
      if (!updated) {
        return res.status(404).json({ error: "Contract not found" });
      }
      // Sanitized response (no signing tokens, signatures, or openSign fields).
      res.json(toVaultContractDto(updated));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[contracts] patch error:", message);
      res.status(500).json({ error: "Failed to update contract" });
    }
  });

  // =====================================================================
  // Contract Vault: READ-ONLY detail + safe metadata edit. Operator-scoped
  // (own contracts only; admin role may view/edit all). No emails, no
  // signing flows, no payments, no deletes. Edits are an additive metadata
  // whitelist only - it never touches signing tokens, amounts, or signatures.
  //
  // toVaultContractDto: explicit allow-list of display-safe fields. Never
  // includes signing tokens, signatures, OpenSign ids/urls, contract HTML, or
  // payment handles - those must not leak to the client.
  // =====================================================================
  const toVaultContractDto = (c: any) => ({
    id: c.id,
    clientName: c.clientName ?? null,
    clientContact: c.clientContact ?? null,
    eventDates: c.eventDates ?? null,
    eventLocation: c.eventLocation ?? null,
    packageDetails: c.packageDetails ?? null,
    status: c.status ?? null,
    totalAmount: c.totalAmount ?? null,
    depositAmount: c.depositAmount ?? null,
    remainingAmount: c.remainingAmount ?? null,
    depositPaidAt: c.depositPaidAt ?? null,
    contractUrl: c.contractUrl ?? null,
    contractSource: c.contractSource ?? null,
    contractNotes: c.contractNotes ?? null,
    fileUrl: c.fileUrl ?? null,
    serviceItems: c.serviceItems ?? null,
    bookingId: c.bookingId ?? null,
    inquiryId: c.inquiryId ?? null,
    // Payment status tracking (business state only; no money is processed here)
    paymentStatus: c.paymentStatus ?? null,
    paymentMethod: c.paymentMethod ?? null,
    amountPaid: c.amountPaid ?? null,
    paymentDueDate: c.paymentDueDate ?? null,
    paymentLink: c.paymentLink ?? null,
    paymentNotes: c.paymentNotes ?? null,
  });

  // Vault status edits are metadata only and must NOT cross into send/signing
  // flow states (sent/signed/completed). Only these non-flow values are allowed.
  const VAULT_EDITABLE_STATUSES = ["draft", "cancelled"];

  // Payment tracking is observational business state only - it never moves money,
  // calls a payment API, or sends anything. Values are validated against these
  // allow-lists; anything else is ignored.
  const PAYMENT_STATUSES = [
    "payment_not_requested",
    "payment_requested",
    "deposit_due",
    "deposit_paid",
    "balance_due",
    "balance_paid",
    "overdue",
    "manually_confirmed_paid",
  ];
  const PAYMENT_METHODS = [
    "square",
    "zelle",
    "venmo",
    "paypal",
    "stripe",
    "check",
    "cash",
    "bank_transfer",
    "other",
  ];

  app.get("/api/vault/contracts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const contract = await storage.getContract(req.params.id);
      if (!contract) return res.status(404).json({ error: "Contract not found" });
      const user = await storage.getUser(userId);
      const isAdmin = user?.role === "admin";
      if (contract.artistId !== userId && !isAdmin) {
        return res.status(403).json({ error: "You can only view your own contracts" });
      }
      // Read-only enrichment from linked records (no writes)
      const booking = contract.bookingId ? await storage.getBooking(contract.bookingId) : undefined;
      const inquiry = contract.inquiryId ? await storage.getInquiry(contract.inquiryId) : undefined;
      res.json({
        contract: toVaultContractDto(contract),
        linked: {
          inquiry: inquiry
            ? {
                id: inquiry.id,
                threadToken: inquiry.threadToken,
                clientName: inquiry.clientName,
                clientEmail: inquiry.clientEmail,
                clientPhone: inquiry.clientPhone,
                eventDate: inquiry.eventDate,
                eventLocation: inquiry.eventLocation,
                partySize: inquiry.partySize,
                status: inquiry.status,
              }
            : null,
          booking: booking
            ? {
                id: booking.id,
                eventDate: booking.eventDate,
                location: booking.location,
                serviceType: booking.serviceType,
                status: booking.status,
                paymentStatus: booking.paymentStatus,
              }
            : null,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[vault] get contract error:", message);
      res.status(500).json({ error: "Failed to load contract" });
    }
  });

  app.patch("/api/vault/contracts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const contract = await storage.getContract(req.params.id);
      if (!contract) return res.status(404).json({ error: "Contract not found" });
      const user = await storage.getUser(userId);
      const isAdmin = user?.role === "admin";
      if (contract.artistId !== userId && !isAdmin) {
        return res.status(403).json({ error: "You can only edit your own contracts" });
      }
      // Whitelist of safe, editable metadata fields only. Everything else
      // (amounts, signing tokens, signatures, openSign ids) is ignored.
      const body = req.body ?? {};
      const updates: Record<string, unknown> = {};
      const textFields = [
        "clientName",
        "clientContact",
        "eventDates",
        "eventLocation",
        "packageDetails",
        "contractUrl",
        "contractSource",
        "contractNotes",
        // Payment tracking metadata (external links/notes only, no processing)
        "paymentDueDate",
        "paymentLink",
        "paymentNotes",
      ];
      for (const f of textFields) {
        if (typeof body[f] === "string") updates[f] = body[f];
      }
      // Status is metadata only here - it does NOT send or trigger signing, and
      // flow states (sent/signed/completed) are intentionally NOT accepted here.
      if (typeof body.status === "string" && VAULT_EDITABLE_STATUSES.includes(body.status)) {
        updates.status = body.status;
      }
      // Payment status / method: validated against allow-lists. Empty string
      // clears the value. Invalid values are ignored, never written.
      if (typeof body.paymentStatus === "string" && PAYMENT_STATUSES.includes(body.paymentStatus)) {
        updates.paymentStatus = body.paymentStatus;
      }
      if (typeof body.paymentMethod === "string") {
        if (body.paymentMethod === "") updates.paymentMethod = null;
        else if (PAYMENT_METHODS.includes(body.paymentMethod)) updates.paymentMethod = body.paymentMethod;
      }
      // Money amounts are operator-tracked business state in cents. Accept only
      // non-negative integers; null clears. No payment is processed.
      const amountFields = ["depositAmount", "remainingAmount", "amountPaid"];
      for (const f of amountFields) {
        if (!(f in body)) continue;
        const v = body[f];
        if (v === null || v === "") {
          updates[f] = null;
        } else if (typeof v === "number" && Number.isInteger(v) && v >= 0) {
          updates[f] = v;
        }
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No editable fields provided" });
      }
      const updated = await storage.updateContract(req.params.id, updates as any);
      res.json(updated ? toVaultContractDto(updated) : updated);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("[vault] update contract error:", message);
      res.status(500).json({ error: "Failed to update contract" });
    }
  });

  // Send contract via email
  app.post("/api/contracts/:id/send-email", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const contract = await storage.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }

      const userId = getAuthUserId(req);
      if (contract.artistId !== userId) {
        return res.status(403).json({ error: "You can only send your own contracts" });
      }

      const { recipientEmail } = req.body;
      if (!recipientEmail || !recipientEmail.includes('@')) {
        return res.status(400).json({ error: "Valid email address required" });
      }

      const { sendContractEmail } = await import('../server/emailService');
      const artist = await storage.getUser(userId);
      const result = await sendContractEmail({
        toEmail: recipientEmail,
        clientName: contract.clientName || "Client",
        packageDetails: contract.packageDetails || "Beauty Services",
        totalAmount: contract.totalAmount ? contract.totalAmount / 100 : 0,
        depositAmount: contract.depositAmount ? contract.depositAmount / 100 : 0,
        senderName: artist?.email || "Artist"
      });

      res.json({ success: true, message: "Contract email sent successfully" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/contracts/booking/:bookingId", isAuthenticated, async (req, res) => {
    try {
      const contracts = await storage.getContractsByBooking(req.params.bookingId);
      res.json(contracts);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Upload contract file to object storage
  app.post("/api/contracts/:id/upload-file", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const contractId = req.params.id;
      
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      
      if (contract.artistId !== userId) {
        return res.status(403).json({ error: "You can only upload to your own contracts" });
      }
      
      const { fileContent, fileName, mimeType } = req.body;
      if (!fileContent) {
        return res.status(400).json({ error: "File content is required" });
      }
      
      const objectService = new ObjectStorageService();
      const timestamp = Date.now();
      const safeName = (fileName || 'contract').replace(/[^a-zA-Z0-9.-]/g, '_');
      const objectPath = `.private/contracts/${userId}/${contractId}/${timestamp}-${safeName}`;
      
      const buffer = Buffer.from(fileContent, 'base64');
      const servingUrl = await objectService.uploadBuffer(objectPath, buffer, mimeType || 'text/html', userId);
      
      const updatedContract = await storage.updateContract(contractId, { 
        fileUrl: servingUrl 
      });
      
      res.json({ 
        success: true, 
        fileUrl: servingUrl,
        contract: updatedContract 
      });
    } catch (error: any) {
      console.error("Contract file upload error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Upload contract file for a booking (create contract if needed)
  app.post("/api/bookings/:bookingId/upload-contract", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const bookingId = req.params.bookingId;
      
      console.log("[CONTRACT UPLOAD] Starting upload for booking:", bookingId);
      
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        console.error("[CONTRACT UPLOAD] Booking not found:", bookingId);
        return res.status(404).json({ error: "Booking not found" });
      }
      
      if (booking.artistId !== userId) {
        console.error("[CONTRACT UPLOAD] Unauthorized - artist mismatch");
        return res.status(403).json({ error: "You can only upload contracts for your own bookings" });
      }
      
      const { fileContent, fileName, mimeType, packageDetails, totalAmount, depositAmount } = req.body;
      
      if (!fileContent) {
        console.error("[CONTRACT UPLOAD] No file content");
        return res.status(400).json({ error: "File content is required" });
      }
      
      console.log("[CONTRACT UPLOAD] Uploading to object storage");
      const objectService = new ObjectStorageService();
      const timestamp = Date.now();
      const safeName = (fileName || 'contract').replace(/[^a-zA-Z0-9.-]/g, '_');
      const objectPath = `.private/contracts/${userId}/${bookingId}/${timestamp}-${safeName}`;
      
      const buffer = Buffer.from(fileContent, 'base64');
      const servingUrl = await objectService.uploadBuffer(objectPath, buffer, mimeType || 'application/pdf', userId);
      console.log("[CONTRACT UPLOAD] File uploaded successfully:", servingUrl);
      
      // Get existing contracts or create new one
      const existingContracts = await storage.getContractsByBooking(bookingId);
      const signingToken = randomUUID();
      
      const contractPayload = {
        fileUrl: servingUrl,
        packageDetails: packageDetails || 'Beauty Services',
        totalAmount: totalAmount || 0,
        depositAmount: depositAmount || 0,
        signingToken,
        status: 'draft' as const,
      };
      
      let contract;
      if (existingContracts.length > 0) {
        console.log("[CONTRACT UPLOAD] Updating existing contract");
        contract = await storage.updateContract(existingContracts[0].id, contractPayload);
      } else {
        console.log("[CONTRACT UPLOAD] Creating new contract");
        contract = await storage.createContract({
          bookingId,
          artistId: userId,
          clientId: booking.clientId || userId,
          ...contractPayload,
        });
      }
      
      console.log("[CONTRACT UPLOAD] Contract saved successfully:", contract.id);
      res.json({ 
        success: true, 
        fileUrl: servingUrl,
        contract,
        signingUrl: `/sign/${signingToken}`
      });
    } catch (error: any) {
      console.error("[CONTRACT UPLOAD] Error:", error);
      res.status(500).json({ error: error.message || "Failed to upload contract" });
    }
  });

  app.get("/api/contracts/artist/:artistId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (userId !== req.params.artistId) {
        return res.status(403).json({ error: "You can only view your own contracts" });
      }
      const contracts = await storage.getContractsByArtist(req.params.artistId);
      
      const enrichedContracts = await Promise.all(contracts.map(async (contract) => {
        const booking = await storage.getBooking(contract.bookingId);
        let clientName = "";
        let eventDate = null;
        let eventLocation = "";
        
        if (booking) {
          eventDate = booking.eventDate;
          eventLocation = booking.location || "";
          const client = await storage.getUser(booking.clientId);
          if (client) {
            clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim();
          }
        }
        
        return {
          ...contract,
          clientName,
          eventDate,
          eventLocation,
        };
      }));
      
      res.json(enrichedContracts);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== CONTRACT TEMPLATES ==========
  app.get("/api/contract-templates", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const templates = await storage.getContractTemplatesByArtist(userId);
      res.json(templates);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/contract-templates/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const template = await storage.getContractTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      if (template.artistId !== userId) {
        return res.status(403).json({ error: "You can only view your own templates" });
      }
      res.json(template);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.post("/api/contract-templates", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const templateData = { ...req.body, artistId: userId };
      const template = await storage.createContractTemplate(templateData);
      res.json(template);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.patch("/api/contract-templates/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const existing = await storage.getContractTemplate(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Template not found" });
      }
      if (existing.artistId !== userId) {
        return res.status(403).json({ error: "You can only edit your own templates" });
      }
      const template = await storage.updateContractTemplate(req.params.id, req.body);
      res.json(template);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.delete("/api/contract-templates/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const existing = await storage.getContractTemplate(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Template not found" });
      }
      if (existing.artistId !== userId) {
        return res.status(403).json({ error: "You can only delete your own templates" });
      }
      await storage.deleteContractTemplate(req.params.id);
      res.json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/contract-templates/default", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const template = await storage.getDefaultContractTemplate(userId);
      res.json(template || null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== BUILT-IN E-SIGNATURE ==========
  
  // Create contract from form with service items and send for signing
  app.post("/api/bookings/:bookingId/create-contract", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const bookingId = req.params.bookingId;
      const { serviceItems, totalAmount, depositAmount, depositPercent, clientName, clientEmail, eventDate, eventLocation, confirmSend } = req.body;

      if (!confirmSend) {
        return res.status(400).json({ error: "Contract send must be explicitly confirmed" });
      }
      
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      if (booking.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      if (!serviceItems || serviceItems.length === 0) {
        return res.status(400).json({ error: "At least one service item is required" });
      }
      
      // Build package details from service items
      const packageDetails = serviceItems.map((item: any) => 
        `${item.clientType}: ${item.service} (${item.qty}x @ $${item.price})`
      ).join(', ');
      
      // Get or create client
      let clientId = booking.clientId;
      
      if (!clientId && booking.clientContactId) {
        const contact = await storage.getClientContact(booking.clientContactId);
        if (!contact) {
          return res.status(400).json({ error: "Client contact not found" });
        }
        
        const existingUser = await storage.getUserByEmail(contact.email);
        if (existingUser) {
          clientId = existingUser.id;
        } else {
          const tempPassword = Math.random().toString(36).substring(2, 15);
          const newUser = await storage.createUser({
            email: contact.email,
            password: tempPassword,
            firstName: contact.name?.split(' ')[0] || contact.name || "Client",
            lastName: contact.name?.split(' ').slice(1).join(' ') || "",
          });
          clientId = newUser.id;
        }
      }
      
      if (!clientId) {
        return res.status(400).json({ error: "No client associated with this booking" });
      }
      
      // Delete any existing draft contracts for this booking
      const existingContracts = await storage.getContractsByBooking(bookingId);
      for (const existing of existingContracts) {
        if (existing.status === 'draft') {
          await storage.deleteContract(existing.id);
        }
      }
      
      // Convert service items to cents for storage
      const serviceItemsInCents = serviceItems.map((item: any) => ({
        clientType: item.clientType,
        qty: item.qty,
        service: item.service,
        price: Math.round(item.price * 100), // Convert to cents
        total: Math.round(item.qty * item.price * 100), // Convert to cents
      }));
      
      // Create contract with the service items (as JSONB array, not string)
      const contract = await storage.createContract({
        bookingId,
        artistId: userId,
        clientId,
        packageDetails,
        totalAmount: Math.round(totalAmount * 100), // Convert to cents
        depositAmount: Math.round(depositAmount * 100), // Convert to cents
        status: "draft",
        serviceItems: serviceItemsInCents, // Pass as array with cents values
        clientName,
        clientEmail,
        eventLocation,
      });
      
      // Now send for signing
      const artist = await storage.getUser(contract.artistId);
      const client = await storage.getUser(contract.clientId);
      const artistProfile = await storage.getArtistProfile(contract.artistId);
      
      if (!client?.email && !clientEmail) {
        return res.status(400).json({ error: "Client email is required for signing" });
      }
      
      // Generate unique signing token
      const signingToken = randomUUID();
      
      // Generate contract HTML for signing page with service items
      const contractHtml = generateContractHtml(contract, client, artistProfile?.businessName || (artist?.firstName ? `${artist.firstName} ${artist.lastName || ""}`.trim() : "Your beauty artist"));
      
      // Update contract with signing token and HTML
      await storage.updateContract(contract.id, {
        signingToken,
        contractHtml,
        status: "sent",
        sentForSigningAt: new Date(),
      });
      
      // Send signing email
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://briarwood.ai';
      const signingUrl = `${baseUrl}/sign/${signingToken}`;
      
      const { sendContractSigningEmail } = await import("./emailService");
      await sendContractSigningEmail({
        toEmail: client?.email || clientEmail,
        clientName: client?.firstName || clientName || "Client",
        artistName: artistProfile?.businessName || (artist?.firstName ? `${artist.firstName} ${artist.lastName || ""}`.trim() : "Service Provider"),
        packageDetails,
        totalAmount: totalAmount,
        depositAmount: depositAmount,
        signingUrl,
      });
      
      res.json({ 
        success: true, 
        contractId: contract.id,
        signingUrl,
        message: "Contract created and sent for signature"
      });
    } catch (error: any) {
      console.error("[Contract] Error creating contract:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/bookings/:bookingId/send-for-signing", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const bookingId = req.params.bookingId;
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      if (booking.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const existingContracts = await storage.getContractsByBooking(bookingId);
      let contract = existingContracts.length > 0 ? existingContracts[0] : null;
      
      if (!contract) {
        // Use clientId if available (it's a user), otherwise create/find user from contact
        let clientId = booking.clientId;
        
        if (!clientId && booking.clientContactId) {
          // Get the contact details
          const contact = await storage.getClientContact(booking.clientContactId);
          if (!contact) {
            return res.status(400).json({ error: "Client contact not found" });
          }
          
          // Try to find existing user by email
          const existingUser = await storage.getUserByEmail(contact.email);
          if (existingUser) {
            clientId = existingUser.id;
          } else {
            // Create a new user from the contact with a temporary password
            const tempPassword = Math.random().toString(36).substring(2, 15);
            const newUser = await storage.createUser({
              email: contact.email,
              password: tempPassword,
              firstName: contact.name?.split(' ')[0] || contact.name || "Client",
              lastName: contact.name?.split(' ').slice(1).join(' ') || "",
            });
            clientId = newUser.id;
          }
        }
        
        if (!clientId) {
          return res.status(400).json({ error: "No client associated with this booking" });
        }
        
        contract = await storage.createContract({
          bookingId,
          artistId: userId,
          clientId,
          packageDetails: booking.serviceType || "Beauty Services",
          totalAmount: booking.amount || 0,
          depositAmount: Math.round((booking.amount || 0) * 0.5),
          status: "draft",
        });
      }
      
      const artist = await storage.getUser(contract.artistId);
      const client = await storage.getUser(contract.clientId);
      const artistProfile = await storage.getArtistProfile(contract.artistId);
      
      if (!client?.email) {
        return res.status(400).json({ error: "Client email is required for signing" });
      }
      
      // Generate unique signing token
      const signingToken = randomUUID();
      
      // Generate contract HTML for signing page
      const contractHtml = generateContractHtml(contract, client, artistProfile?.businessName || (artist?.firstName ? `${artist.firstName} ${artist.lastName || ""}`.trim() : "Your beauty artist"));
      
      // Update contract with signing token and HTML
      await storage.updateContract(contract.id, {
        signingToken,
        contractHtml,
        status: "sent",
        sentForSigningAt: new Date(),
      });
      
      // Send signing email - use production URL for client-facing links
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://briarwood.ai';
      const signingUrl = `${baseUrl}/sign/${signingToken}`;
      
      const { sendContractSigningEmail } = await import("./emailService");
      await sendContractSigningEmail({
        toEmail: client.email,
        clientName: client.firstName || contract.clientName || "Client",
        artistName: artistProfile?.businessName || (artist?.firstName ? `${artist.firstName} ${artist.lastName || ""}`.trim() : "Service Provider"),
        packageDetails: contract.packageDetails,
        totalAmount: contract.totalAmount / 100,
        depositAmount: (contract.depositAmount || 0) / 100,
        signingUrl,
      });
      
      res.json({ 
        success: true, 
        signingUrl,
        message: "Contract sent for signature"
      });
    } catch (error: any) {
      console.error("[Sign] Error sending for signing:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/contracts/:id/signing-status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const contractId = req.params.id;
      
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      
      if (contract.artistId !== userId && contract.clientId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      if (!contract.openSignDocumentId) {
        return res.json({ status: contract.status, signed: contract.status === "signed" });
      }
      
      const { syncContractSigningStatus } = await import("./openSignService");
      const result = await syncContractSigningStatus(contractId);
      
      const updatedContract = await storage.getContract(contractId);
      res.json({ 
        success: result.success,
        status: updatedContract?.status,
        signed: result.signed,
        certificateUrl: updatedContract?.openSignCertificateUrl,
        signingUrl: updatedContract?.openSignSigningUrl,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/contracts/:id/resend-signing", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const contractId = req.params.id;
      
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      
      if (contract.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      if (!contract.openSignDocumentId) {
        return res.status(400).json({ error: "Contract not sent for signing yet" });
      }
      
      const client = await storage.getUser(contract.clientId);
      if (!client?.email) {
        return res.status(400).json({ error: "Client email not found" });
      }
      
      const { resendSigningEmail } = await import("./openSignService");
      const result = await resendSigningEmail(contract.openSignDocumentId, client.email);
      
      if (!result.success) {
        return res.status(500).json({ error: result.error || "Failed to resend" });
      }
      
      res.json({ success: true, message: "Signing reminder sent" });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });

  // ========== BUILT-IN E-SIGNATURE (PUBLIC ROUTES) ==========
  
  // Public: Get contract for signing (no auth required)
  app.get("/api/contracts/sign/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const contract = await storage.getContractBySigningToken(token);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found or signing link has expired" });
      }
      
      // Return contract details for signing page
      res.json({
        id: contract.id,
        status: contract.status,
        contractHtml: contract.contractHtml,
        clientName: contract.clientName,
        packageDetails: contract.packageDetails,
        totalAmount: contract.totalAmount,
        depositAmount: contract.depositAmount,
        signedAt: contract.signedAt,
        signedByName: contract.signedByName,
        signedOnBehalfOf: contract.signedOnBehalfOf,
        clientSignature: contract.clientSignature,
        eventDates: contract.eventDates,
        eventLocation: contract.eventLocation,
      });
    } catch (error: any) {
      console.error("[Sign] Error fetching contract:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Public: Submit signature (no auth required)
  app.post("/api/contracts/sign/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { signedByName, signedByEmail, clientSignature, signedOnBehalfOf } = req.body;
      
      if (!signedByName || !signedByEmail || !clientSignature) {
        return res.status(400).json({ message: "Name, email, and signature are required" });
      }
      
      const contract = await storage.getContractBySigningToken(token);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found or signing link has expired" });
      }
      
      if (contract.status === "signed") {
        return res.status(400).json({ message: "This contract has already been signed" });
      }
      
      if (contract.status === "cancelled") {
        return res.status(400).json({ message: "This contract has been cancelled" });
      }
      
      // Update contract with signature
      await storage.updateContract(contract.id, {
        status: "signed",
        signedAt: new Date(),
        signedByName,
        signedByEmail,
        clientSignature,
        signedOnBehalfOf: signedOnBehalfOf || null,
      });
      
      // Notify artist via email
      const artist = await storage.getUser(contract.artistId);
      const artistProfile = await storage.getArtistProfile(contract.artistId);
      const artistName = artistProfile?.businessName || artist?.firstName || "Artist";
      
      if (artist?.email) {
        try {
          const baseUrl = process.env.PUBLIC_BASE_URL || 'https://briarwood.ai';
          const countersignUrl = `${baseUrl}/countersign/${token}`;
          const { sendContractSignedNotification } = await import("./emailService");
          await sendContractSignedNotification({
            toEmail: artist.email,
            artistName: artist.firstName || "Artist",
            clientName: signedByName,
            packageDetails: contract.packageDetails,
            signedAt: new Date().toISOString(),
            countersignUrl,
          });
        } catch (emailError) {
          console.error("[Sign] Failed to send notification email:", emailError);
        }
      }
      
      // Send copy of signed contract to client
      if (signedByEmail) {
        try {
          const { sendSignedContractCopyToClient } = await import("./emailService");
          // Safely get eventDates as string
          const eventDatesStr = contract.eventDates 
            ? (typeof contract.eventDates === 'string' ? contract.eventDates : String(contract.eventDates))
            : undefined;
          
          await sendSignedContractCopyToClient({
            toEmail: signedByEmail,
            clientName: signedByName,
            artistName,
            packageDetails: contract.packageDetails || "Beauty Services",
            totalAmount: contract.totalAmount || 0,
            depositAmount: contract.depositAmount || 0,
            eventDates: eventDatesStr,
            signedAt: new Date().toISOString(),
          });
          console.log("[Sign] Sent contract copy to client:", signedByEmail);
        } catch (emailError) {
          console.error("[Sign] Failed to send contract copy to client:", emailError);
        }
      }
      
      // Log activity for the artist
      if (contract.artistId) {
        try {
          await logActivity({
            userId: contract.artistId,
            actorRole: 'client',
            action: 'contract_signed',
            resourceType: 'contract',
            resourceId: contract.id,
            description: `${signedByName} signed the contract for ${contract.packageDetails || 'services'}`,
            metadata: {
              clientName: signedByName,
              clientEmail: signedByEmail,
              amount: contract.totalAmount,
              packageDetails: contract.packageDetails,
            },
            sendEmail: true,
          });
        } catch (activityErr) {
          console.error("[Sign] Activity logging failed:", activityErr);
        }
      }
      
      res.json({ success: true, message: "Contract signed successfully" });
    } catch (error: any) {
      console.error("[Sign] Error signing contract:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Artist countersign: GET contract details by signing token
  app.get("/api/contracts/countersign/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const contract = await storage.getContractBySigningToken(token);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      const artist = await storage.getUser(contract.artistId);
      const artistProfile = await storage.getArtistProfile(contract.artistId);
      res.json({
        id: contract.id,
        status: contract.status,
        contractHtml: contract.contractHtml,
        clientName: contract.clientName,
        clientSignature: contract.clientSignature,
        signedAt: contract.signedAt,
        signedByName: contract.signedByName,
        artistSignature: contract.artistSignature,
        artistSignedAt: contract.artistSignedAt,
        packageDetails: contract.packageDetails,
        totalAmount: contract.totalAmount,
        depositAmount: contract.depositAmount,
        eventDates: contract.eventDates,
        eventLocation: contract.eventLocation,
        artistName: artistProfile?.businessName || artist?.firstName || "Artist",
        artistEmail: artist?.email,
      });
    } catch (error: any) {
      console.error("[Countersign] Error fetching contract:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Artist countersign: POST artist signature
  app.post("/api/contracts/countersign/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { artistSignature } = req.body;

      if (!artistSignature) {
        return res.status(400).json({ message: "Signature is required" });
      }

      const contract = await storage.getContractBySigningToken(token);
      if (!contract) {
        return res.status(404).json({ message: "Contract not found" });
      }

      if (contract.artistSignature) {
        return res.status(400).json({ message: "Contract has already been countersigned" });
      }

      if (contract.status !== "signed") {
        return res.status(400).json({ message: "Client must sign the contract first" });
      }

      await storage.updateContract(contract.id, {
        artistSignature,
        artistSignedAt: new Date(),
        status: "fully_executed",
      });

      // Send fully executed contract copy to artist
      const artist = await storage.getUser(contract.artistId);
      const artistProfile = await storage.getArtistProfile(contract.artistId);
      const artistName = artistProfile?.businessName || artist?.firstName || "Artist";

      if (artist?.email) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(process.env.RESEND_API_KEY);

          const fmtCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
          const now = new Date();
          const signedBanner = `
            <div style="background: #f0fdf4; border: 2px solid #16a34a; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
              <h2 style="color: #16a34a; margin: 0 0 12px 0; font-family: serif;">Fully Executed Contract</h2>
              <p style="margin: 0; color: #333;">Client: <strong>${contract.clientSignature}</strong> - Signed ${contract.signedAt ? new Date(contract.signedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}</p>
              <p style="margin: 4px 0 0 0; color: #333;">Artist: <strong>${artistSignature}</strong> - Signed ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
          `;

          await resend.emails.send({
            from: `${artistName} <notifications@dateinquiry.com>`,
            to: artist.email,
            subject: `Fully Executed Contract - ${contract.clientName || 'Client'} - ${contract.eventDates || ''}`,
            html: signedBanner + (contract.contractHtml || ''),
          });
          console.log("[Countersign] Sent fully executed contract to artist:", artist.email);
        } catch (emailErr) {
          console.error("[Countersign] Failed to send email:", emailErr);
        }
      }

      res.json({ success: true, message: "Contract countersigned successfully" });
    } catch (error: any) {
      console.error("[Countersign] Error:", error);
      res.status(500).json({ message: error.message });
    }
  });
  
  // Artist: Cancel a contract
  app.post("/api/contracts/:id/cancel", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const contractId = req.params.id;
      
      const contract = await storage.getContract(contractId);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      
      if (contract.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      if (contract.status === "signed") {
        return res.status(400).json({ error: "Cannot cancel a signed contract" });
      }
      
      await storage.updateContract(contractId, {
        status: "cancelled",
      });
      
      res.json({ success: true, message: "Contract cancelled" });
    } catch (error: any) {
      console.error("[Contract] Error cancelling contract:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Artist: Send contract for signing
  app.post("/api/contracts/:id/send-for-signing", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const contractId = req.params.id;
      
      console.log("[SEND CONTRACT] Starting for contract:", contractId);
      
      const contract = await storage.getContract(contractId);
      if (!contract) {
        console.error("[SEND CONTRACT] Contract not found:", contractId);
        return res.status(404).json({ error: "Contract not found" });
      }
      
      if (contract.artistId !== userId) {
        console.error("[SEND CONTRACT] Not authorized");
        return res.status(403).json({ error: "Not authorized to send this contract" });
      }
      
      const client = await storage.getUser(contract.clientId);
      if (!client?.email) {
        console.error("[SEND CONTRACT] Client email not found");
        return res.status(400).json({ error: "Client email not found" });
      }
      
      const signingToken = contract.signingToken || randomUUID();
      console.log("[SEND CONTRACT] Using signing token:", signingToken);
      
      // Update contract status to 'sent'
      const updated = await storage.updateContract(contractId, {
        status: "sent",
        sentForSigningAt: new Date(),
        signingToken,
      });
      
      console.log("[SEND CONTRACT] Contract status updated to sent");
      
      // Get artist info for email
      const artist = await storage.getUser(contract.artistId);
      const artistProfile = await storage.getArtistProfile(contract.artistId);
      const artistName = artistProfile?.businessName || (artist?.firstName ? `${artist.firstName} ${artist.lastName || ""}`.trim() : "Beauty Artist");
      
      // Build signing URL - ALWAYS use production URL for client-facing links
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://briarwood.ai';
      const signingUrl = `${baseUrl}/sign/${signingToken}`;
      
      console.log("[SEND CONTRACT] Signing URL:", signingUrl);
      
      // Send email
      try {
        const { sendContractSigningEmail } = await import("./emailService");
        await sendContractSigningEmail({
          toEmail: client.email,
          clientName: client.firstName || contract.clientName || "Client",
          artistName,
          packageDetails: contract.packageDetails,
          totalAmount: (contract.totalAmount || 0) / 100,
          depositAmount: (contract.depositAmount || 0) / 100,
          signingUrl,
        });
        console.log("[SEND CONTRACT] Email sent successfully");
      } catch (emailErr) {
        console.error("[SEND CONTRACT] Email send failed (continuing):", emailErr);
      }
      
      // Log activity and send notification to artist
      try {
        await logActivity({
          userId,
          actorRole: 'artist',
          action: 'contract_sent',
          resourceType: 'contract',
          resourceId: contractId,
          description: `Contract sent to ${client.firstName || 'client'} (${client.email}) for ${contract.packageDetails || 'services'}`,
          metadata: {
            clientName: client.firstName || 'Client',
            clientEmail: client.email,
            amount: contract.totalAmount,
            packageDetails: contract.packageDetails,
          },
          sendEmail: true,
        });
        console.log("[SEND CONTRACT] Activity logged and notification sent");
      } catch (activityErr) {
        console.error("[SEND CONTRACT] Activity logging failed:", activityErr);
      }
      
      res.json({ 
        success: true, 
        message: "Contract sent for signature",
        signingUrl,
        contract: updated
      });
    } catch (error: any) {
      console.error("[SEND CONTRACT] Error:", error);
      res.status(500).json({ error: error.message || "Failed to send contract" });
    }
  });

  // ========== PAYMENTS ==========
  app.post("/api/payments", isAuthenticated, async (req, res) => {
    try {
      const data = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(data);
      res.json(payment);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/payments/:id", isAuthenticated, async (req, res) => {
    try {
      const payment = await storage.getPayment(req.params.id);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json(payment);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.patch("/api/payments/:id", isAuthenticated, async (req, res) => {
    try {
      const payment = await storage.updatePayment(req.params.id, req.body);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json(payment);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/payments/contract/:contractId", isAuthenticated, async (req, res) => {
    try {
      const payments = await storage.getPaymentsByContract(req.params.contractId);
      res.json(payments);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== AI CHAT ==========
  // Get all conversations
  app.get("/api/ai/chat/conversations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const conversations = await storage.getAiChatConversations(userId);
      res.json(conversations);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Create new conversation
  app.post("/api/ai/chat/conversations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const { title } = req.body;
      const conversation = await storage.createAiChatConversation(userId, title || "New Chat");
      res.json(conversation);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Get messages for a specific conversation
  app.get("/api/ai/chat/conversations/:conversationId/messages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const messages = await storage.getAiChatMessagesByConversation(req.params.conversationId);
      res.json(messages);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Update conversation title
  app.patch("/api/ai/chat/conversations/:conversationId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      const conversation = await storage.updateAiChatConversationTitle(req.params.conversationId, title);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Delete conversation
  app.delete("/api/ai/chat/conversations/:conversationId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      await storage.deleteAiChatConversation(req.params.conversationId);
      res.json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Get chat history
  app.get("/api/ai/chat/history", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const messages = await storage.getAiChatMessages(userId);
      res.json(messages);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Clear chat history
  app.delete("/api/ai/chat/history", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      await storage.clearAiChatMessages(userId);
      res.json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.post("/api/ai/chat", isAuthenticated, async (req: Request, res: Response) => {
    console.log("[AI Chat] Received request");
    try {
      const userId = getAuthUserId(req);
      console.log("[AI Chat] User:", userId, "Message:", req.body?.message?.substring(0, 50));
      const { message, attachments, conversationId } = req.body;
      
      if (!message && (!attachments || attachments.length === 0)) {
        return res.status(400).json({ error: "Message or attachments required" });
      }
      
      const validAttachments = Array.isArray(attachments) 
        ? attachments.filter((a: any) => a?.mimeType && a?.data)
        : [];

      // Save user message to history
      const userAttachments = validAttachments.map((a: any, i: number) => ({
        type: "image",
        url: `data:${a.mimeType};base64,${a.data.substring(0, 50)}...`,
        name: `Image ${i + 1}`
      }));
      
      await storage.createAiChatMessage({
        userId,
        conversationId: conversationId || null,
        role: "user",
        content: message || "(Image attached)",
        attachments: userAttachments.length > 0 ? userAttachments : null,
      });
      
      const result = await aiChat.processAIChatMessage(
        userId,
        message || "",
        validAttachments
      );

      // Save assistant response to history
      await storage.createAiChatMessage({
        userId,
        conversationId: conversationId || null,
        role: "assistant",
        content: result.response,
        attachments: null,
      });
      
      if (result?.availabilityUpdates?.dates?.length > 0 && typeof result.availabilityUpdates.isAvailable === 'boolean') {
        await aiChat.updateAvailabilityFromAI(
          userId,
          result.availabilityUpdates.dates,
          result.availabilityUpdates.isAvailable
        );
      }
      
      // Handle portfolio upload
      console.log("AI result:", JSON.stringify({ addToPortfolio: result?.addToPortfolio, hasAttachments: validAttachments.length }));
      
      if (result?.addToPortfolio && validAttachments.length > 0) {
        console.log("Processing portfolio upload for user:", userId);
        try {
          const artistProfile = await storage.getArtistProfile(userId);
          console.log("Artist profile found:", !!artistProfile);
          
          if (artistProfile) {
            const currentUrls: string[] = (artistProfile.portfolioUrls as string[]) || [];
            const newUrls: string[] = [];
            
            const objectService = new ObjectStorageService();
            
            for (const att of validAttachments) {
              // Save to object storage
              const objectId = randomUUID();
              const extension = att.mimeType.split('/')[1] || 'jpg';
              const objectPath = `portfolio/${userId}/${objectId}.${extension}`;
              
              console.log("Uploading to:", objectPath);
              
              // Convert base64 to buffer and upload - returns serving URL directly
              const buffer = Buffer.from(att.data, 'base64');
              const servingUrl = await objectService.uploadBuffer(objectPath, buffer, att.mimeType, userId);
              console.log("Serving URL:", servingUrl);
              newUrls.push(servingUrl);
            }
            
            // Update the artist profile with new portfolio URLs
            const updatedUrls = [...currentUrls, ...newUrls];
            await storage.updateArtistProfile(userId, { 
              portfolioUrls: updatedUrls 
            });
            
            console.log("Portfolio updated. Total photos:", updatedUrls.length);
            result.response = `Added ${newUrls.length} photo${newUrls.length > 1 ? 's' : ''} to your portfolio!`;
            (result as any).portfolioUrls = updatedUrls;
          } else {
            result.response = "I couldn't find your artist profile. Please set up your profile first.";
          }
        } catch (portfolioError) {
          console.error("Portfolio upload error:", portfolioError);
          result.response = "I had trouble adding to your portfolio. Please try again.";
        }
      }
      
      // Handle booking creation
      if (result?.createBooking?.clientName && result?.createBooking?.date) {
        console.log("Processing booking creation:", result.createBooking);
        try {
          const bookingResult = await aiChat.createBookingFromAI(userId, result.createBooking);
          if (bookingResult.success) {
            (result as any).bookingCreated = true;
            (result as any).bookingId = bookingResult.bookingId;
            console.log("Booking created successfully:", bookingResult.bookingId);
            
            let extras: string[] = [];
            if (bookingResult.calendarEventId) {
              (result as any).calendarEventCreated = true;
              extras.push("added to your Google Calendar");
            }
            if (bookingResult.emailSent) {
              (result as any).emailSent = true;
              extras.push("sent a confirmation email");
            }
            if (extras.length > 0) {
              result.response = result.response.replace(/!$/, '') + " - " + extras.join(" and ") + "!";
            }
          } else {
            result.response = "I had trouble creating that booking. Please try again.";
            console.error("Booking creation failed:", bookingResult.error);
          }
        } catch (bookingError) {
          console.error("Booking creation error:", bookingError);
          result.response = "I had trouble creating that booking. Please try again.";
        }
      }
      
      // Handle contract/proposal creation - return as pending for preview instead of auto-creating
      if (result?.createContract?.clientName && result?.createContract?.packageDetails) {
        console.log("Returning proposal for preview:", result.createContract);
        // Return the FULL proposal data for frontend preview instead of auto-creating
        (result as any).pendingProposal = {
          clientName: result.createContract.clientName,
          clientEmail: result.createContract.clientEmail || null,
          packageDetails: result.createContract.packageDetails,
          totalAmount: result.createContract.totalAmount || 0,
          depositAmount: result.createContract.depositAmount || Math.round((result.createContract.totalAmount || 0) * 0.5),
          bookingId: result.createContract.bookingId || null,
          eventDate: result.createContract.eventDate || null,
          location: result.createContract.location || null
        };
        // Update response to indicate preview is ready
        result.response = `I've prepared a proposal for ${result.createContract.clientName}. Please review the details and confirm to send.`;
      }
      
      // Handle thank you email
      if (result?.sendThankYou?.recipientEmail && result?.sendThankYou?.message) {
        console.log("Processing thank you email:", result.sendThankYou);
        try {
          const emailResult = await aiChat.sendThankYouEmailFromAI(userId, result.sendThankYou);
          if (emailResult.success) {
            (result as any).emailSent = true;
            console.log("Thank you email sent successfully");
          } else {
            result.response = "I had trouble sending that email. Please try again.";
            console.error("Email sending failed:", emailResult.error);
          }
        } catch (emailError) {
          console.error("Email sending error:", emailError);
          result.response = "I had trouble sending that email. Please try again.";
        }
      }
      
      // Handle payment link / invoice sending
      if (result?.sendPaymentLink?.clientEmail && result?.sendPaymentLink?.amount) {
        console.log("Processing payment link:", result.sendPaymentLink);
        try {
          const paymentResult = await aiChat.sendPaymentLinkFromAI(userId, result.sendPaymentLink);
          if (paymentResult.success && paymentResult.paymentLink) {
            (result as any).paymentSent = true;
            (result as any).paymentLink = paymentResult.paymentLink;
            console.log("Payment link sent successfully:", paymentResult.paymentLink);
          } else {
            result.response = paymentResult.error || "I had trouble sending that payment link. Please try again or check your Square connection in Settings.";
            console.error("Payment link sending failed:", paymentResult.error);
          }
        } catch (paymentError: any) {
          console.error("Payment link error:", paymentError);
          result.response = "I had trouble sending that payment link. Please check your Square connection in Settings.";
        }
      }
      
      // Handle image generation
      if (result?.generateImage?.prompt) {
        console.log("Processing image generation:", result.generateImage);
        try {
          const imageResult = await aiChat.generateImageFromAI(result.generateImage.prompt);
          if (imageResult.success && imageResult.imageUrl) {
            (result as any).imageGenerated = true;
            (result as any).generatedImageUrl = imageResult.imageUrl;
            console.log("Image generated successfully");
          } else {
            result.response = "I had trouble generating that image. Please try again.";
            console.error("Image generation failed:", imageResult.error);
          }
        } catch (imageError) {
          console.error("Image generation error:", imageError);
          result.response = "I had trouble generating that image. Please try again.";
        }
      }
      
      // Handle search
      if (result?.searchQuery?.type && result?.searchQuery?.query) {
        console.log("Processing search:", result.searchQuery);
        try {
          const searchResult = await aiChat.searchFromAI(userId, result.searchQuery.type, result.searchQuery.query);
          if (searchResult.success) {
            (result as any).searchResults = searchResult.results;
            const count = searchResult.results?.length || 0;
            if (count === 0) {
              result.response = `No ${result.searchQuery.type} found matching "${result.searchQuery.query}".`;
            } else {
              result.response = `Found ${count} ${result.searchQuery.type} matching "${result.searchQuery.query}".`;
            }
            console.log("Search completed:", count, "results");
          } else {
            result.response = "I had trouble searching. Please try again.";
            console.error("Search failed:", searchResult.error);
          }
        } catch (searchError) {
          console.error("Search error:", searchError);
          result.response = "I had trouble searching. Please try again.";
        }
      }
      
      // Handle schedule creation
      if (result?.createSchedule?.eventDate || result?.createSchedule?.clientName || result?.createSchedule?.eventName) {
        console.log("Processing schedule creation:", result.createSchedule);
        try {
          const scheduleData = result.createSchedule;
          
          // Use the AI schedule creation function
          const scheduleResult = await aiChat.createScheduleFromAI(userId, {
            eventName: scheduleData.eventName || scheduleData.clientName,
            clientName: scheduleData.clientName,
            eventDate: scheduleData.eventDate,
            startTime: scheduleData.startTime,
            numArtists: scheduleData.numArtists || scheduleData.partySize,
            partySize: scheduleData.partySize,
            location: scheduleData.location,
            notes: scheduleData.notes,
            clients: scheduleData.clients,
          });
          
          if (scheduleResult.success && scheduleResult.scheduleId) {
            // Return schedule info to frontend
            (result as any).scheduleCreated = true;
            (result as any).scheduleId = scheduleResult.scheduleId;
            (result as any).scheduleLink = `/artist/schedule/${scheduleResult.scheduleId}`;
            
            // Update response with link
            const eventName = scheduleData.eventName || scheduleData.clientName || "your event";
            const clientCount = scheduleData.clients?.length || 0;
            result.response = clientCount > 0
              ? `Created the ${eventName} schedule with ${clientCount} clients filled in! You can view and edit it here: /artist/schedule/${scheduleResult.scheduleId}`
              : `Created a schedule for ${eventName}! You can view and edit it here: /artist/schedule/${scheduleResult.scheduleId}`;
            
            console.log("Schedule created successfully:", scheduleResult.scheduleId);
          } else {
            throw new Error(scheduleResult.error || "Failed to create schedule");
          }
        } catch (scheduleError: any) {
          console.error("Schedule creation error:", scheduleError);
          result.response = "I had trouble creating that schedule. Please try again or use the Create Schedule button in the inquiry thread.";
        }
      }
      
      // Handle quote/proposal creation
      if (result?.createQuote?.lineItems?.length > 0) {
        console.log("Processing quote creation:", result.createQuote);
        try {
          const quote = result.createQuote;
          const subtotal = quote.lineItems.reduce((sum: number, item: any) => sum + (item.unitPrice * item.quantity), 0);
          const total = subtotal + (quote.travelFee || 0);
          const shareToken = randomUUID();
          
          const proposal = await storage.createProposal({
            artistId: userId,
            shareToken,
            clientName: quote.clientName || "Quote Request",
            clientEmail: quote.clientEmail || "",
            eventDate: quote.eventDate ? new Date(quote.eventDate) : null,
            eventLocation: quote.eventLocation || null,
            eventType: quote.eventType || "wedding",
            lineItems: quote.lineItems,
            subtotal,
            travelFee: quote.travelFee || 0,
            total,
            notes: quote.notes || null,
            status: "draft",
          });
          
          if (proposal) {
            const shareUrl = `${process.env.PUBLIC_BASE_URL || 'https://briarwood.ai'}/quote/${shareToken}`;
            (result as any).quoteCreated = true;
            (result as any).quoteId = proposal.id;
            (result as any).shareUrl = shareUrl;
            // Update response to include the share link
            result.response = result.response.replace('[LINK_WILL_BE_GENERATED]', shareUrl);
            if (!result.response.includes(shareUrl)) {
              result.response += `\n\nShare this link with your client: ${shareUrl}`;
            }
            console.log("Quote created successfully:", proposal.id, "Share URL:", shareUrl);
          }
        } catch (quoteError) {
          console.error("Quote creation error:", quoteError);
          result.response = "I created the quote details but had trouble saving it. Please try again.";
        }
      }
      
      res.json(result);
    } catch (error: any) {
      console.error("AI Chat error:", error);
      res.status(500).json({ 
        response: "I'm having trouble right now. Please try again in a moment."
      });
    }
  });

  // Confirm and send a proposal that was previewed in chat
  app.post("/api/ai/confirm-proposal", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { clientName, clientEmail, packageDetails, totalAmount, depositAmount, eventDate, location, bookingId } = req.body;

      if (!clientName || !packageDetails) {
        return res.status(400).json({ error: "Missing required fields (clientName and packageDetails are required)" });
      }

      // Create the contract using the existing function with ALL fields
      const contractResult = await aiChat.createContractFromAI(userId, {
        clientName,
        clientEmail: clientEmail || undefined,
        bookingId: bookingId || undefined,
        packageDetails,
        totalAmount: totalAmount || 0,
        depositAmount: depositAmount || undefined,
        eventDate: eventDate || undefined,
        location: location || undefined
      });

      if (!contractResult.success) {
        return res.status(500).json({ error: contractResult.error || "Failed to create proposal" });
      }

      console.log(`[Confirm Proposal] Created contract for ${clientName} (email: ${clientEmail || 'not provided'}):`, contractResult.contractId);

      res.json({ 
        success: true, 
        contractId: contractResult.contractId,
        message: `Proposal created for ${clientName}${clientEmail ? ` (will be sent to ${clientEmail})` : ''}`
      });
    } catch (error: any) {
      console.error("Confirm proposal error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get communication logs for artist (only accessible by artists)
  app.get("/api/communication-logs", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Verify user is an artist
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'artist') {
        return res.status(403).json({ error: "Only artists can access communication logs" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getCommunicationLogsByArtist(userId, limit);
      res.json(logs);
    } catch (error: any) {
      console.error("Error fetching communication logs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Forward communication to artist email
  app.post("/api/communication-logs/:id/forward", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const logId = req.params.id;
      const log = await storage.getCommunicationLog(logId);
      
      if (!log) {
        return res.status(404).json({ error: "Communication log not found" });
      }
      
      if (log.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Get artist email
      const artist = await storage.getUser(userId);
      if (!artist?.email) {
        return res.status(400).json({ error: "No email on file" });
      }

      // Forward via AI chat module
      const result = await aiChat.forwardCommunicationToArtist(userId, logId, artist.email);
      res.json(result);
    } catch (error: any) {
      console.error("Error forwarding communication:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // AI Schedule Creation Chat - Enhanced with full time slot generation
  app.post("/api/ai/schedule-chat", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const { message, conversationHistory = [], collectedData = null } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message required" });
      }
      
      const currentDate = new Date();

      // Build conversation context
      const historyContext = conversationHistory.length > 0 
        ? `\nPrevious conversation:\n${conversationHistory.map((m: any) => `${m.role}: ${m.content}`).join('\n')}\n`
        : '';
      
      // Include previously collected data context
      const collectedDataContext = collectedData 
        ? `\nPREVIOUSLY COLLECTED DATA (use this!):\n${JSON.stringify(collectedData, null, 2)}\n`
        : '';
      
      const schedulePrompt = `You are Briarwood, an intelligent schedule creation assistant for wedding beauty artists.

Your job is to have a natural conversation with the artist to gather schedule details, then generate a complete schedule with calculated time slots.

Current date: ${currentDate.toISOString().split('T')[0]}
${historyContext}${collectedDataContext}
Current user message: ${message}

INFORMATION YOU NEED TO CREATE A SCHEDULE (every value must come from the artist — NEVER assume, infer, or fill in any of them yourself):
1. eventName - Name of the event (e.g., "Smith Wedding")
2. eventDate - The date in YYYY-MM-DD format. If the artist gives a date without a year, ASK which year — do not assume one.
3. numPeople - How many people/clients need services (e.g., bride + 5 bridesmaids = 6 people)
4. artistNames - The actual names of the artists working, one per column. NEVER invent placeholder names like "Artist 1".
5. serviceDurationMinutes - How many minutes one service takes, stated by the artist. NEVER assume a duration.
6. startTime - When to start services (in HH:MM 24-hour format)
7. readyByTime - When everyone needs to be done (in HH:MM 24-hour format)
8. location - Venue/location (optional)

CONVERSATION RULES:
- If any REQUIRED info is missing (eventName, eventDate including year, numPeople, artistNames, serviceDurationMinutes, startTime, readyByTime), ask for it naturally
- Ask ONE question at a time to get missing info
- Be friendly and conversational, not robotic
- NEVER fill in a value the artist did not give. No assumed durations, dates, times, artist counts, or artist names. Missing information is a question, not a guess.
- When you have ALL required info, generate the schedule

TIME SLOT CALCULATION:
- Each service takes exactly serviceDurationMinutes (the artist's stated number — never a built-in default)
- Calculate how many time slots fit between startTime and readyByTime
- Generate timeSlots array with times in "HH:MM AM/PM" format
- artistColumns must be the provided artistNames verbatim, one column per named artist
- grid is a 2D array: grid[slotIndex][artistIndex] = { clientName: "", service: "" }

RESPONSE FORMAT (JSON only):
If you need more info:
{
  "response": "Your friendly question here",
  "needsMoreInfo": true,
  "collectedData": { ...any data you've gathered so far... }
}

If you have everything and can build the schedule:
{
  "response": "Great! I'm creating your schedule with X time slots for Y people across the artists you named.",
  "needsMoreInfo": false,
  "scheduleData": {
    "eventName": "Smith Wedding",
    "eventDate": "2026-03-15",
    "location": "Grand Hotel",
    "readyByTime": "11:00 AM",
    "startTime": "7:00 AM",
    "numPeople": 6,
    "numArtists": 2,
    "serviceDurationMinutes": 40,
    "timeSlots": ["7:00 AM", "7:40 AM", "8:20 AM", "9:00 AM", "9:40 AM"],
    "artistColumns": ["<first artist's name>", "<second artist's name>"],
    "grid": [
      [{"clientName": "", "service": ""}, {"clientName": "", "service": ""}],
      [{"clientName": "", "service": ""}, {"clientName": "", "service": ""}],
      ...
    ]
  }
}

EXAMPLES:
User: "I need a schedule for the Johnson wedding next Saturday, 6 people, 2 artists, starting at 7am ready by noon"
→ Still missing the artists' names and the per-service duration. Ask: "Who are the two artists working, and how many minutes does one service take?"

User: "Create a schedule for a wedding"
→ Ask: "I'd love to help! What's the name of the wedding and what date is it (including the year)?"

User: "It's the Martinez wedding on February 8th"
→ Ask: "Perfect! Which year is that? And how many people will need services?"

User: "Me and Dana are working, each service is 40 minutes"
→ You now have artistNames ["<the artist's own name>", "Dana"] and serviceDurationMinutes 40; keep gathering whatever is still missing.

IMPORTANT: Always respond with valid JSON only. No markdown, no extra text.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: schedulePrompt }] }],
        config: { maxOutputTokens: 4096 }
      });

      const responseText = response.text || "";
      
      try {
        // Clean up response - remove markdown code blocks if present
        let cleanedResponse = responseText
          .replace(/```json\s*/gi, '')
          .replace(/```\s*/g, '')
          .trim();
        
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          
          // If we have complete schedule data with grid, ensure it's properly formatted
          if (parsed.scheduleData && !parsed.needsMoreInfo) {
            const sd = parsed.scheduleData;
            
            // Ensure timeSlots exist and are properly calculated if missing
            if (!sd.timeSlots && sd.startTime && sd.readyByTime) {
              const slots = [];
              const parseTime = (t: string) => {
                const match = t.match(/(\d+):(\d+)\s*(AM|PM)?/i);
                if (!match) return null;
                let hours = parseInt(match[1]);
                const mins = parseInt(match[2]);
                const period = match[3]?.toUpperCase();
                if (period === 'PM' && hours !== 12) hours += 12;
                if (period === 'AM' && hours === 12) hours = 0;
                return hours * 60 + mins;
              };
              
              const formatTime = (mins: number) => {
                const h = Math.floor(mins / 60);
                const m = mins % 60;
                const period = h >= 12 ? 'PM' : 'AM';
                const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
              };
              
              const startMins = parseTime(sd.startTime);
              const endMins = parseTime(sd.readyByTime);
              
              if (startMins !== null && endMins !== null) {
                let current = startMins;
                while (current < endMins) {
                  slots.push(formatTime(current));
                  current += 45;
                }
                sd.timeSlots = slots;
              }
            }
            
            // Ensure artistColumns exist
            if (!sd.artistColumns && sd.numArtists) {
              sd.artistColumns = Array.from(
                { length: sd.numArtists }, 
                (_, i) => `Artist ${i + 1}`
              );
            }
            
            // Ensure grid exists
            if (!sd.grid && sd.timeSlots && sd.artistColumns) {
              sd.grid = sd.timeSlots.map(() => 
                sd.artistColumns.map(() => ({ clientName: "", service: "" }))
              );
            }
          }
          
          res.json(parsed);
        } else {
          res.json({
            response: "I'd be happy to help you create a schedule! What's the name of the event and when is it?",
            needsMoreInfo: true
          });
        }
      } catch (parseErr) {
        console.error("Parse error:", parseErr, "Response:", responseText);
        res.json({
          response: "Tell me about the schedule you need - event name, date, number of people, and when everyone needs to be ready.",
          needsMoreInfo: true
        });
      }
    } catch (error: any) {
      console.error("AI Schedule Chat error:", error);
      res.status(500).json({ 
        response: "I'm having trouble right now. Please try again in a moment."
      });
    }
  });

  // ========== AI IMAGE GENERATION (Nano Banana) ==========
  app.post("/api/ai/generate-image", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: "Prompt is required" });
      }
      
      const weddingPrompt = `Wedding planning mockup: ${prompt}. 
Style: Elegant, romantic, sophisticated wedding aesthetics. High quality, professional photography style.`;
      
      console.log("Generating image with prompt:", weddingPrompt);
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [{ role: "user", parts: [{ text: weddingPrompt }] }],
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });

      console.log("Image generation response candidates:", response.candidates?.length);
      
      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      
      console.log("Parts received:", parts.length, parts.map((p: any) => p.inlineData ? 'IMAGE' : 'TEXT'));
      
      const imagePart = parts.find((part: any) => part.inlineData?.data);
      
      if (!imagePart?.inlineData?.data) {
        console.error("No image data in response. Parts:", JSON.stringify(parts.map((p: any) => ({ hasInlineData: !!p.inlineData, hasText: !!p.text }))));
        return res.status(500).json({ error: "No image was generated. Try a different description." });
      }

      const mimeType = imagePart.inlineData.mimeType || "image/png";
      const imageData = `data:${mimeType};base64,${imagePart.inlineData.data}`;
      
      console.log("Image generated successfully, size:", imagePart.inlineData.data.length);
      
      res.json({ 
        imageUrl: imageData,
        message: "Image generated successfully!"
      });
    } catch (error: any) {
      console.error("Image generation error:", error);
      res.status(500).json({ 
        error: "Failed to generate image. Please try again with a different description."
      });
    }
  });

  // ========== AVAILABILITY ==========
  
  // Token-based auth endpoint for availability page
  app.get("/api/artist/availability-auth", async (req, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(401).json({ error: "Token required" });
      }
      
      const artist = await storage.getArtistProfileByEditToken(token);
      if (!artist) {
        return res.status(401).json({ error: "Invalid token" });
      }
      
      res.json({ id: artist.userId, artistSlug: artist.artistSlug, role: 'artist' });
    } catch (error: any) {
      console.error('[AvailabilityAuth] Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/availability", async (req: Request, res: Response) => {
    try {
      let userId: string;
      
      // Check for token-based auth first
      const token = req.query.token as string;
      if (token) {
        const artist = await storage.getArtistProfileByEditToken(token);
        if (!artist) {
          return res.status(401).json({ error: "Invalid token" });
        }
        userId = artist.userId;
      } else {
        // Fall back to session auth
        userId = getAuthUserId(req);
        if (!userId) {
          return res.status(401).json({ error: "Not authenticated" });
        }
      }
      
      console.log('[Availability] POST request body:', req.body, 'userId:', userId);
      // Convert date string to Date object for schema validation
      const bodyWithDate = {
        ...req.body,
        userId,
        date: new Date(req.body.date)
      };
      const data = insertAvailabilitySchema.parse(bodyWithDate);
      console.log('[Availability] Parsed data:', data);
      const availability = await storage.setAvailability(data);
      console.log('[Availability] Saved:', availability);
      res.json(availability);
    } catch (error: any) {
      console.error('[Availability] Error:', error.message);
      res.status(400).json({ error: error.message });
    }
  });

  // Sync Google Calendar availability for a vendor
  app.post("/api/availability/sync-google-calendar", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'artist') {
        return res.status(403).json({ error: "Only vendors can sync their calendar" });
      }
      
      const { startDate, endDate, workingHoursStart = 9, workingHoursEnd = 18 } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Get available slots from Google Calendar for each day in the range
      const availableSlots: any[] = [];
      const currentDate = new Date(start);
      
      while (currentDate <= end) {
        const slots = await googleCalendar.getVendorAvailableSlots(
          userId, 
          currentDate, 
          workingHoursStart, 
          workingHoursEnd,
          60 // 60-minute slots
        );
        availableSlots.push(...slots);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      res.json({ 
        vendorId: userId,
        availableSlots,
        totalSlots: availableSlots.length,
        syncedAt: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('[Google Calendar Sync Error]:', error);
      res.status(400).json({ error: error.message || "Failed to sync calendar" });
    }
  });

  app.get("/api/availability/:userId", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      const availability = await storage.getUserAvailability(
        req.params.userId,
        start,
        end
      );
      res.json(availability);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.delete("/api/availability", async (req: Request, res: Response) => {
    try {
      let userId: string;
      
      // Check for token-based auth first
      const token = req.query.token as string;
      if (token) {
        const artist = await storage.getArtistProfileByEditToken(token);
        if (!artist) {
          return res.status(401).json({ error: "Invalid token" });
        }
        userId = artist.userId;
      } else {
        // Fall back to session auth
        userId = getAuthUserId(req);
        if (!userId) {
          return res.status(401).json({ error: "Not authenticated" });
        }
      }
      
      const { date } = req.body;
      await storage.deleteAvailability(userId, new Date(date));
      res.json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Check availability for a specific vendor on a specific date
  app.get("/api/availability/:userId/check", async (req, res) => {
    try {
      const { date } = req.query;
      if (!date) {
        return res.status(400).json({ error: "Date is required" });
      }
      const checkDate = new Date(date as string);
      const isAvailable = await storage.checkAvailability(req.params.userId, checkDate);
      res.json({ isAvailable, date: checkDate.toISOString() });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== SCHEDULES ==========
  app.post("/api/schedules", isAuthenticated, async (req, res) => {
    try {
      const data = insertScheduleSchema.parse(req.body);
      const schedule = await storage.createSchedule(data);
      res.json(schedule);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/schedules/booking/:bookingId", isAuthenticated, async (req, res) => {
    try {
      const schedule = await storage.getScheduleByBooking(req.params.bookingId);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      res.json(schedule);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.patch("/api/schedules/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = getAuthUserId(req);
      const existing = await storage.getSchedule(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Schedule not found" });
      }

      // Defect #8: ownership check. The legacy schedules table carries no
      // artistId; ownership flows through the linked booking.
      const booking = await storage.getBooking(existing.bookingId);
      if (!booking || booking.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const body: any = req.body || {};

      // Defect #7: optimistic concurrency.
      const revisionError = checkExpectedRevision(body, (existing as any).revision);
      if (revisionError) {
        return res.status(409).json({ error: revisionError });
      }

      // Defect #7: semantic validation.
      const semanticError = validateSchedulePatchBody(body, []);
      if (semanticError) {
        return res.status(400).json({ error: semanticError });
      }

      const schedule = await storage.updateSchedule(req.params.id, stripRevisionFields(body));
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      res.json(schedule);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== SCHEDULE DRAFTS (Google-Docs-style editable table builder) ==========
  // Foundation only: operator-only, owner-scoped editable table tied to an
  // inquiry/contract/booking. NO public access, NO sending, NO emails/SMS, NO
  // payments, NO signing/CDI changes. Isolated from the legacy eventDaySchedules
  // appointment-grid + public-share system above.

  // Default table shape for a brand new draft. Columns use stable ids so cells map.
  function defaultScheduleColumns() {
    return [
      { id: "name", label: "Name", type: "name" },
      { id: "service", label: "Service", type: "service" },
      { id: "provider", label: "Provider", type: "provider" },
      { id: "start", label: "Start", type: "time" },
      { id: "end", label: "End", type: "time" },
      { id: "duration", label: "Duration", type: "duration" },
      { id: "notes", label: "Notes", type: "notes" },
    ];
  }

  // Starter service labels for a brand-new draft. Durations are intentionally
  // null (unknown): only operator-entered numbers may drive schedule math —
  // coded defaults must never masquerade as operator judgment.
  function defaultServiceDefaults() {
    return [
      { id: "makeup", label: "Makeup", durationMinutes: null },
      { id: "hair", label: "Hair", durationMinutes: null },
      { id: "hairmakeup", label: "Hair + Makeup", durationMinutes: null },
      { id: "bride", label: "Bride Hair + Makeup", durationMinutes: null },
    ];
  }

  function sanitizeScheduleProviderCapability(value: unknown) {
    return value === "ALL" || value === "HAIR_ONLY" || value === "MAKEUP_ONLY" ? value : undefined;
  }

  function sanitizeScheduleProviderDurations(value: unknown) {
    const sanitized: Record<string, number> = {};
    if (!value || typeof value !== "object" || Array.isArray(value)) return sanitized;
    const source = value as Record<string, unknown>;
    for (const field of ["hair", "makeup", "hairMakeup", "primaryClient", "touchup"] as const) {
      const minutes = Number(source[field]);
      if (Number.isFinite(minutes) && minutes > 0 && minutes <= 480) {
        sanitized[field] = Math.floor(minutes);
      }
    }
    return sanitized;
  }

  function sanitizeScheduleProviders(providers: unknown) {
    if (!Array.isArray(providers)) return [];
    return providers
      .filter((p: any) => p && typeof p === "object")
      .map((p: any) => {
        const capability = sanitizeScheduleProviderCapability(p.capability);
        const serviceDurations = sanitizeScheduleProviderDurations(p.serviceDurations);
        return {
          id: String(p.id ?? "").slice(0, 64) || stableContentId("prov", p.name, p.capability),
          name: String(p.name ?? "").slice(0, 120),
          ...(capability ? { capability } : {}),
          isPrimary: p.isPrimary === true,
          ...(Object.keys(serviceDurations).length > 0 ? { serviceDurations } : {}),
        };
      })
      .slice(0, 24);
  }

  function sanitizeScheduleOperatorDefaults(value: unknown): ScheduleOperatorDefaults {
    const fallback = defaultScheduleOperatorDefaults();
    if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
    const source = value as Record<string, unknown>;
    const providers = Array.isArray(source.providers)
      ? source.providers
          .filter((provider: any) => provider && typeof provider === "object")
          .map((provider: any) => {
            const capability = sanitizeScheduleProviderCapability(provider.capability);
            const serviceDurations = sanitizeScheduleProviderDurations(provider.serviceDurations);
            return {
              id: String(provider.id ?? "").slice(0, 64) || stableContentId("provider", provider.name, provider.capability),
              name: String(provider.name ?? "").trim().slice(0, 120),
              ...(capability ? { capability } : {}),
              isLead: provider.isLead === true,
              ...(Object.keys(serviceDurations).length > 0 ? { serviceDurations } : {}),
            };
          })
          .filter((provider) => provider.name)
          .slice(0, 24)
      : [];
    return {
      providers,
      protectLeadBeforePrimary: source.protectLeadBeforePrimary !== false,
      assignPrimaryToLead: source.assignPrimaryToLead !== false,
      preferredLayout: "artist_columns",
      allowUnrequestedBuffers: false,
    };
  }

  const scheduleEngineMetadataFields = [
    "venueAccessTime",
    "photographerArrivalTime",
    "readyByTime",
    "ceremonyTime",
    "firstLookTime",
  ] as const;

  const scheduleEngineBooleanFields = [
    "assignPrimaryToLead",
    "protectLeadBeforePrimary",
    "fixedBlocksReviewed",
    "useEvidencePlaceholders",
  ] as const;

  function sanitizeScheduleEngineMetadata(metadata: unknown) {
    const sanitized: Record<string, string | boolean> = {};
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return sanitized;
    const source = metadata as Record<string, unknown>;
    for (const field of scheduleEngineMetadataFields) {
      const value = source[field];
      if (value === null) {
        sanitized[field] = "";
      } else if (typeof value === "string") {
        sanitized[field] = value.trim().slice(0, 40);
      }
    }
    if (typeof source.sourceRequest === "string") {
      sanitized.sourceRequest = source.sourceRequest.slice(0, 20000);
    }
    if (source.optionalPeopleMode === "undecided" || source.optionalPeopleMode === "exclude" || source.optionalPeopleMode === "include") {
      sanitized.optionalPeopleMode = source.optionalPeopleMode;
    }
    if (source.touchupMode === "undecided" || source.touchupMode === "quote_only" || source.touchupMode === "schedule_fixed_only") {
      sanitized.touchupMode = source.touchupMode;
    }
    if (typeof source.evidenceDay === "string") {
      sanitized.evidenceDay = source.evidenceDay.trim().slice(0, 80);
    }
    if (source.evidenceAdditionsMode === "undecided" || source.evidenceAdditionsMode === "exclude" || source.evidenceAdditionsMode === "include") {
      sanitized.evidenceAdditionsMode = source.evidenceAdditionsMode;
    }
    for (const field of scheduleEngineBooleanFields) {
      if (typeof source[field] === "boolean") sanitized[field] = source[field];
    }
    return sanitized;
  }

  function scheduleDraftVersionChanged(currentUpdatedAt: unknown, expectedUpdatedAt: string) {
    const current =
      currentUpdatedAt instanceof Date
        ? currentUpdatedAt.toISOString()
        : typeof currentUpdatedAt === "string"
          ? currentUpdatedAt
          : null;
    if (!current) return false;

    const currentTime = Date.parse(current);
    const expectedTime = Date.parse(expectedUpdatedAt);
    if (!Number.isFinite(currentTime) || !Number.isFinite(expectedTime)) return true;

    return currentTime !== expectedTime;
  }

  // Always start with a few placeholder rows so a draft is never empty / never
  // fails because names were not provided. Ids are deterministic per position
  // (defect #6): re-running this for the same draft shape yields the same ids.
  function placeholderRows(count: number) {
    const n = Math.max(1, Math.min(count || 3, 50));
    const rows = [];
    for (let i = 0; i < n; i++) {
      rows.push({
        id: `row_placeholder_${i + 1}`,
        sortOrder: i,
        cells: { name: `Guest ${i + 1}`, service: "", provider: "", start: "", end: "", duration: "", notes: "" },
      });
    }
    return rows;
  }

  // Generic owner/admin guard for a draft id.
  async function loadOwnedScheduleDraft(req: Request, res: Response) {
    const draft = await storage.getScheduleDraft(req.params.id);
    if (!draft) {
      res.status(404).json({ error: "Schedule not found" });
      return null;
    }
    const userId = getAuthUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return null;
    }
    const requester = await storage.getUser(userId);
    const isAdmin = requester?.role === "admin";
    if (draft.artistId !== userId && !isAdmin) {
      res.status(403).json({ error: "You can only access your own schedules" });
      return null;
    }
    return draft;
  }

  // Reusable operator scheduling defaults. These are private, owner-scoped, and
  // stored inside the existing onboarding_preferences JSON object. Event drafts
  // remain free to override every value.
  app.get("/api/vendor/schedule-defaults", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const profile = await storage.getArtistProfile(userId);
      const saved = (profile?.onboardingPreferences as any)?.scheduleDefaults;
      res.json(sanitizeScheduleOperatorDefaults(saved));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.patch("/api/vendor/schedule-defaults", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });
      const scheduleDefaults = sanitizeScheduleOperatorDefaults(req.body);
      const profile = await storage.getArtistProfile(userId);
      const onboardingPreferences = {
        ...((profile?.onboardingPreferences as any) ?? {}),
        scheduleDefaults,
      };
      const updated = profile
        ? await storage.updateArtistProfile(userId, { onboardingPreferences } as any)
        : await storage.createArtistProfile({ userId, onboardingPreferences } as any);
      res.json({ scheduleDefaults: (updated?.onboardingPreferences as any)?.scheduleDefaults ?? scheduleDefaults });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Create a new schedule draft (owner = current user). Optional links to
  // inquiry/contract/booking. Starts as a usable placeholder table.
  app.post("/api/schedule-drafts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const body = req.body || {};

      // Optional links are stored as-is (loose coupling). We do not verify the
      // linked records here beyond a contract ownership check when provided, so
      // an operator cannot attach a draft to someone else's contract.
      let contractId: string | null = typeof body.contractId === "string" ? body.contractId : null;
      let inquiryId: string | null = typeof body.inquiryId === "string" ? body.inquiryId : null;
      let bookingId: string | null = typeof body.bookingId === "string" ? body.bookingId : null;

      const requester = await storage.getUser(userId);
      const isAdmin = requester?.role === "admin";
      let requestedProviders = Array.isArray(body.providers) ? sanitizeScheduleProviders(body.providers) : [];
      if (!Array.isArray(body.providers)) {
        try {
          const profile = await storage.getArtistProfile(userId);
          const savedScheduleDefaults = sanitizeScheduleOperatorDefaults((profile?.onboardingPreferences as any)?.scheduleDefaults);
          requestedProviders = savedScheduleDefaults.providers.map((provider) => ({
            id: provider.id,
            name: provider.name,
            capability: provider.capability,
            isPrimary: provider.isLead === true,
            serviceDurations: provider.serviceDurations,
          }));
        } catch {
          requestedProviders = [];
        }
      }

      if (contractId) {
        const contract = await storage.getContract(contractId);
        if (!contract) {
          return res.status(404).json({ error: "Linked contract not found" });
        }
        if (contract.artistId !== userId && !isAdmin) {
          return res.status(403).json({ error: "You can only link your own contracts" });
        }
        if (!bookingId && contract.bookingId) bookingId = contract.bookingId;
      }

      // Validate any directly-supplied links belong to the operator. Prevents
      // cross-tenant poisoning (attaching a draft to a victim's inquiry/booking).
      if (inquiryId) {
        const inquiry = await storage.getInquiry(inquiryId);
        if (!inquiry || (inquiry.vendorId !== userId && !isAdmin)) {
          return res.status(403).json({ error: "You can only link your own inquiries" });
        }
      }
      if (bookingId) {
        const booking = await storage.getBooking(bookingId);
        if (!booking || (booking.artistId !== userId && !isAdmin)) {
          return res.status(403).json({ error: "You can only link your own bookings" });
        }
      }

      const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Untitled schedule";

      const draft = await storage.createScheduleDraft({
        artistId: userId,
        inquiryId,
        contractId,
        bookingId,
        title,
        eventDate: typeof body.eventDate === "string" ? body.eventDate : null,
        location: typeof body.location === "string" ? body.location : null,
        notes: typeof body.notes === "string" ? body.notes : null,
        columns: defaultScheduleColumns(),
        rows: placeholderRows(3),
        serviceDefaults: defaultServiceDefaults(),
        providers: requestedProviders,
        engineMetadata: sanitizeScheduleEngineMetadata(body.engineMetadata),
        status: "draft",
      } as any);

      res.json(draft);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // List the current operator's schedule drafts.
  app.get("/api/schedule-drafts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const drafts = await storage.getScheduleDraftsByArtist(userId);
      res.json(drafts);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Find a draft linked to a contract (owner-scoped). Returns 404 if none, so the
  // UI can decide between "Create Schedule Draft" and "Open Schedule".
  app.get("/api/schedule-drafts/by-contract/:contractId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      // Owner-scoped at query time: a non-owner simply gets 404 (no existence leak).
      const draft = await storage.getScheduleDraftByContract(req.params.contractId, userId);
      if (!draft) {
        return res.status(404).json({ error: "No schedule linked to this contract" });
      }
      res.json(draft);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Find a draft linked to an inquiry (owner-scoped).
  app.get("/api/schedule-drafts/by-inquiry/:inquiryId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      // Owner-scoped at query time: a non-owner simply gets 404 (no existence leak).
      const draft = await storage.getScheduleDraftByInquiry(req.params.inquiryId, userId);
      if (!draft) {
        return res.status(404).json({ error: "No schedule linked to this inquiry" });
      }
      res.json(draft);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Read a single draft (owner/admin only).
  app.get("/api/schedule-drafts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const draft = await loadOwnedScheduleDraft(req, res);
      if (!draft) return;
      res.json(draft);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Update a draft (owner/admin only). Strict whitelist + light validation.
  // Never accepts artistId/links/timestamps. status limited to 'draft' (no
  // sending state exists in this foundation).
  app.patch("/api/schedule-drafts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const draft = await loadOwnedScheduleDraft(req, res);
      if (!draft) return;

      const body = req.body || {};
      const update: Record<string, any> = {};

      if (
        typeof body.expectedUpdatedAt === "string" &&
        scheduleDraftVersionChanged(draft.updatedAt, body.expectedUpdatedAt)
      ) {
        return res.status(409).json({
          error: "This schedule draft changed elsewhere. Refresh before saving.",
        });
      }

      if (typeof body.title === "string") update.title = body.title.slice(0, 300);
      if (body.eventDate === null || typeof body.eventDate === "string") update.eventDate = body.eventDate;
      if (body.location === null || typeof body.location === "string") update.location = body.location;
      if (body.notes === null || typeof body.notes === "string") update.notes = body.notes;

      // Table data: accept arrays only; sanitize each item to the known shape.
      if (Array.isArray(body.columns)) {
        update.columns = body.columns
          .filter((c: any) => c && typeof c === "object")
          .map((c: any) => ({
            id: String(c.id ?? "").slice(0, 64) || stableContentId("col", c.label, c.type),
            label: String(c.label ?? "").slice(0, 120),
            type: String(c.type ?? "text").slice(0, 32),
          }));
      }

      if (Array.isArray(body.rows)) {
        update.rows = body.rows
          .filter((r: any) => r && typeof r === "object")
          .map((r: any, idx: number) => {
            const cells: Record<string, string> = {};
            if (r.cells && typeof r.cells === "object") {
              for (const [k, v] of Object.entries(r.cells)) {
                cells[String(k).slice(0, 64)] = v == null ? "" : String(v).slice(0, 2000);
              }
            }
            return {
              id: String(r.id ?? "").slice(0, 64) || stableContentId("row", JSON.stringify(cells), idx),
              sortOrder: Number.isFinite(r.sortOrder) ? Number(r.sortOrder) : idx,
              cells,
            };
          });
      }

      if (Array.isArray(body.serviceDefaults)) {
        update.serviceDefaults = body.serviceDefaults
          .filter((s: any) => s && typeof s === "object")
          .map((s: any) => {
            const minutes = Number(s.durationMinutes);
            return {
              id: String(s.id ?? "").slice(0, 64) || stableContentId("svc", s.label),
              label: String(s.label ?? "").slice(0, 120),
              // null = unknown (operator has not entered a duration). 0 is not
              // a real duration and must not be invented on save.
              durationMinutes: Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes) : null,
            };
          });
      }

      if (Array.isArray(body.providers)) {
        update.providers = sanitizeScheduleProviders(body.providers);
      }

      if (
        body.engineMetadata === null ||
        (body.engineMetadata && typeof body.engineMetadata === "object" && !Array.isArray(body.engineMetadata))
      ) {
        update.engineMetadata = sanitizeScheduleEngineMetadata(body.engineMetadata);
      }

      // status: foundation only supports 'draft'. Reject anything that looks like
      // a sending/published state to keep this surface non-sending.
      if (typeof body.status === "string") {
        if (body.status !== "draft") {
          return res.status(400).json({ error: "Only 'draft' status is supported" });
        }
        update.status = "draft";
      }

      if (Object.keys(update).length === 0) {
        return res.json(draft);
      }

      const updated = await storage.updateScheduleDraft(draft.id, update as any);
      res.json(updated);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== ARTIST NETWORK (Your Network / Rolodex) ==========
  
  // Get artist's network contacts - CDI-powered ranking (invisible to vendor)
  // Sorts contacts by CDI/fit/availability so best referrals appear first
  app.get("/api/artist-network", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get vendor's profile for their referral artists
      const myProfile = await storage.getArtistProfile(userId);
      
      // Build network from multiple sources
      const networkContacts: Array<{
        id: string;
        name: string;
        businessName?: string;
        email: string;
        phone?: string;
        instagram?: string;
        specialty: string;
        isFavorite: boolean;
        timesWorkedTogether: number;
        lastWorkedDate?: string;
        notes?: string;
        profileImageUrl?: string;
        isOnPlatform: boolean;
        _fitScore: number; // CDI-powered ranking (invisible)
      }> = [];
      
      // 1. Get artists I've invited (from invitations table)
      const invitations = await storage.getInvitationsByInviter(userId);
      const artistInvites = invitations.filter(inv => inv.role === 'artist');
      
      for (const invite of artistInvites) {
        let fitScore = 50; // Base score
        let isOnPlatform = false;
        let profileData: any = null;
        let vendorMetrics: any = null;
        
        // Check if they've joined the platform
        if (invite.acceptedUserId) {
          isOnPlatform = true;
          const vendorUser = await storage.getUser(invite.acceptedUserId);
          profileData = await storage.getArtistProfile(invite.acceptedUserId);
          
          // Get their CDI metrics for ranking (invisible to current user)
          vendorMetrics = await storage.getVendorMetrics(invite.acceptedUserId, 30);
          
          // CDI-powered fit score calculation
          // Fast responders rank higher
          if (vendorMetrics.avgTimeToFirstResponseMinutes !== null) {
            if (vendorMetrics.avgTimeToFirstResponseMinutes < 60) fitScore += 30;
            else if (vendorMetrics.avgTimeToFirstResponseMinutes < 120) fitScore += 20;
            else if (vendorMetrics.avgTimeToFirstResponseMinutes < 240) fitScore += 10;
          }
          
          // High converters rank higher
          if (vendorMetrics.totalInquiries > 0) {
            const conversionRate = vendorMetrics.confirmSuccessCount / vendorMetrics.totalInquiries;
            if (conversionRate > 0.5) fitScore += 25;
            else if (conversionRate > 0.3) fitScore += 15;
            else if (conversionRate > 0.1) fitScore += 5;
          }
          
          // Reliable vendors rank higher (low hold expiry)
          if (vendorMetrics.holdExpiryRate < 10) fitScore += 15;
          else if (vendorMetrics.holdExpiryRate < 25) fitScore += 5;
          
          // Experience bonus
          if (vendorMetrics.totalInquiries >= 10) fitScore += 10;
          
          networkContacts.push({
            id: invite.id,
            name: vendorUser?.firstName 
              ? `${vendorUser.firstName}${vendorUser.lastName ? ' ' + vendorUser.lastName : ''}`
              : invite.firstName || 'Unknown',
            businessName: profileData?.businessName || undefined,
            email: invite.email,
            phone: vendorUser?.phone || undefined,
            instagram: profileData?.instagramHandle || undefined,
            specialty: profileData?.specialties?.[0] || 'Beauty Artist',
            isFavorite: false, // Can be toggled by user
            timesWorkedTogether: 0, // Would come from booking history
            profileImageUrl: vendorUser?.profileImageUrl || undefined,
            isOnPlatform: true,
            _fitScore: fitScore,
          });
        } else {
          // Not yet on platform - lower ranking
          networkContacts.push({
            id: invite.id,
            name: invite.firstName 
              ? `${invite.firstName}${invite.lastName ? ' ' + invite.lastName : ''}`
              : invite.email.split('@')[0],
            email: invite.email,
            specialty: 'Pending', // Don't know their specialty yet
            isFavorite: false,
            timesWorkedTogether: 0,
            isOnPlatform: false,
            _fitScore: 20, // Lower score for pending invites
          });
        }
      }
      
      // 2. Add referral artists from profile (if they're on platform, look them up)
      if (myProfile?.referralArtists && Array.isArray(myProfile.referralArtists)) {
        for (const refHandle of myProfile.referralArtists as string[]) {
          if (!refHandle || refHandle.trim() === '') continue;
          
          // Check if already in network (avoid duplicates)
          const alreadyAdded = networkContacts.some(c => 
            c.instagram?.toLowerCase() === refHandle.toLowerCase() ||
            c.email?.toLowerCase() === refHandle.toLowerCase()
          );
          if (alreadyAdded) continue;
          
          // Try to find this artist on platform by Instagram handle or name
          const cleanHandle = refHandle.replace('@', '').trim();
          const matchingProfile = await storage.getArtistProfileByInstagram(cleanHandle);
          
          if (matchingProfile) {
            const vendorUser = await storage.getUser(matchingProfile.userId);
            const vendorMetrics = await storage.getVendorMetrics(matchingProfile.userId, 30);
            
            // CDI-powered fit score
            let fitScore = 60; // Referrals get base bonus
            if (vendorMetrics.avgTimeToFirstResponseMinutes !== null && 
                vendorMetrics.avgTimeToFirstResponseMinutes < 120) fitScore += 20;
            if (vendorMetrics.totalInquiries > 0 && 
                (vendorMetrics.confirmSuccessCount / vendorMetrics.totalInquiries) > 0.3) fitScore += 20;
            
            networkContacts.push({
              id: matchingProfile.userId,
              name: vendorUser?.firstName 
                ? `${vendorUser.firstName}${vendorUser.lastName ? ' ' + vendorUser.lastName : ''}`
                : cleanHandle,
              businessName: matchingProfile.businessName || undefined,
              email: vendorUser?.email || '',
              phone: vendorUser?.phone || undefined,
              instagram: matchingProfile.instagramHandle || cleanHandle,
              specialty: matchingProfile.specialties?.[0] || 'Beauty Artist',
              isFavorite: true, // Referral artists are favorites
              timesWorkedTogether: 0,
              profileImageUrl: vendorUser?.profileImageUrl || undefined,
              isOnPlatform: true,
              _fitScore: fitScore,
            });
          } else {
            // Not on platform yet
            networkContacts.push({
              id: `ref-${cleanHandle}`,
              name: cleanHandle,
              email: '',
              instagram: cleanHandle,
              specialty: 'Referral',
              isFavorite: true,
              timesWorkedTogether: 0,
              isOnPlatform: false,
              _fitScore: 40, // Referrals rank higher than random invites
            });
          }
        }
      }
      
      // Sort by CDI-powered fit score (highest first)
      networkContacts.sort((a, b) => b._fitScore - a._fitScore);
      
      // Remove internal fit score before sending (vendors don't see scores)
      const result = networkContacts.map(({ _fitScore, ...contact }) => contact);
      
      res.json(result);
    } catch (error: any) {
      console.error("[Artist Network] Error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Invite someone to network
  app.post("/api/artist-network/invite", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const { name, email, specialty, notes } = req.body;
      
      // Create an invitation for this contact
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const invitation = await storage.createInvitation({
        email,
        firstName: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' ') || null,
        role: 'artist',
        invitedBy: userId,
        token,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });
      
      res.json({ success: true, invitation });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== EVENT DAY SCHEDULES (Smart Scheduling Grid) ==========
  
  // Get all schedules for current user (artist/vendor)
  app.get("/api/event-schedules", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const schedules = await storage.getEventDaySchedulesByArtist(userId);
      res.json(schedules);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Get single schedule with all team members and appointments
  app.get("/api/event-schedules/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const schedule = await storage.getEventDaySchedule(req.params.id);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      // Verify ownership
      const userId = getAuthUserId(req);
      if (schedule.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const teamMembers = await storage.getScheduleTeamMembers(schedule.id);
      const appointments = await storage.getScheduleAppointments(schedule.id);
      
      res.json({ ...schedule, teamMembers, appointments });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Public shareable schedule view (no auth required)
  app.get("/api/event-schedules/share/:shareToken", async (req, res) => {
    try {
      const schedule = await storage.getEventDayScheduleByShareToken(req.params.shareToken);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      const teamMembers = await storage.getScheduleTeamMembers(schedule.id);
      const appointments = await storage.getScheduleAppointments(schedule.id);
      
      res.json({ ...schedule, teamMembers, appointments });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Guest notes submission (no auth required - guests can add notes)
  app.post("/api/event-schedules/share/:shareToken/guest-note", async (req, res) => {
    try {
      const { guestNote } = req.body;
      const schedule = await storage.getEventDayScheduleByShareToken(req.params.shareToken);
      
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      // Append new note to existing notes with timestamp
      const timestamp = new Date().toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      const existingNotes = schedule.guestNotes || "";
      const newNotes = existingNotes 
        ? `${existingNotes}\n\n[${timestamp}]\n${guestNote}`
        : `[${timestamp}]\n${guestNote}`;
      
      await storage.updateEventDaySchedule(schedule.id, { guestNotes: newNotes });
      
      res.json({ success: true, message: "Note saved" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Appointment notes submission (no auth required - guests can add notes to their appointments)
  app.post("/api/event-schedules/share/:shareToken/appointment/:appointmentId/notes", async (req, res) => {
    try {
      const { notes } = req.body;
      const { shareToken, appointmentId } = req.params;
      
      const schedule = await storage.getEventDayScheduleByShareToken(shareToken);
      
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      // Update the appointment notes
      await storage.updateScheduleAppointment(appointmentId, { notes });
      
      res.json({ success: true, message: "Note saved" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Update appointment time via share token.
  //
  // AUTH DECISION (defect #8): changing appointment times is restricted to the
  // authenticated schedule owner. The share-link model has no "writable" scope
  // concept (shareToken is a bare token), so guest time edits are not allowed:
  // guests keep notes/photos as the only guest-writable fields. Only
  // startTime/endTime are honored here; name/service changes are never applied
  // through this route (defect #5).
  app.post("/api/event-schedules/share/:shareToken/appointment/:appointmentId/time", isAuthenticated, async (req, res) => {
    try {
      const { appointmentId, shareToken } = req.params;
      const { startTime, endTime } = req.body;

      const schedule = await storage.getEventDayScheduleByShareToken(shareToken);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }

      const userId = getAuthUserId(req);
      if (schedule.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const appointment = await storage.getScheduleAppointment(appointmentId);
      if (!appointment || appointment.scheduleId !== schedule.id) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      // Defect #5: duration/overlap validation on the new times.
      const members = await storage.getScheduleTeamMembers(schedule.id);
      const peers = await storage.getScheduleAppointments(schedule.id);
      const validationError = validateLegacyAppointmentWrite({
        input: { startTime, endTime },
        existing: appointment,
        peers,
        members,
        readyByTime: schedule.readyByTime,
        isCreate: false,
      });
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const updates: any = {};
      if (startTime !== undefined) updates.startTime = startTime;
      if (endTime !== undefined) updates.endTime = endTime;

      await storage.updateScheduleAppointment(appointmentId, updates);
      res.json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Update appointment name.
  //
  // AUTH DECISION (defect #8): same as the time route above. The share-link
  // model has no "writable" scope, so name changes require the authenticated
  // schedule owner; guests keep notes/photos only.
  app.post("/api/event-schedules/share/:shareToken/appointment/:appointmentId/name", isAuthenticated, async (req, res) => {
    try {
      const { clientName } = req.body;
      const { shareToken, appointmentId } = req.params;
      
      if (!clientName || typeof clientName !== 'string' || clientName.trim().length === 0) {
        return res.status(400).json({ error: "Name is required" });
      }
      
      const schedule = await storage.getEventDayScheduleByShareToken(shareToken);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      const appointment = await storage.getScheduleAppointment(appointmentId);
      if (!appointment || appointment.scheduleId !== schedule.id) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      await storage.updateScheduleAppointment(appointmentId, { clientName: clientName.trim() });
      res.json({ success: true, message: "Name updated" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Upload inspiration photos for an appointment
  app.post("/api/event-schedules/share/:shareToken/appointment/:appointmentId/photos", async (req, res) => {
    try {
      const { photos } = req.body;
      const { shareToken, appointmentId } = req.params;
      
      if (!photos || !Array.isArray(photos)) {
        return res.status(400).json({ error: "Photos array is required" });
      }
      
      if (photos.length > 10) {
        return res.status(400).json({ error: "Maximum 10 photos per upload" });
      }
      
      const schedule = await storage.getEventDayScheduleByShareToken(shareToken);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      const appointment = await storage.getScheduleAppointment(appointmentId);
      if (!appointment || appointment.scheduleId !== schedule.id) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      const existingPhotos = appointment.inspirationPhotos || [];
      if (existingPhotos.length + photos.length > 20) {
        return res.status(400).json({ error: "Maximum 20 photos per appointment" });
      }
      
      const updatedPhotos = [...existingPhotos, ...photos];
      
      await storage.updateScheduleAppointment(appointmentId, { inspirationPhotos: updatedPhotos });
      res.json({ success: true, photos: updatedPhotos });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Delete inspiration photo from appointment
  app.delete("/api/event-schedules/share/:shareToken/appointment/:appointmentId/photos", async (req, res) => {
    try {
      const { photoUrl } = req.body;
      const { shareToken, appointmentId } = req.params;
      
      const schedule = await storage.getEventDayScheduleByShareToken(shareToken);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }

      const nameUserId = getAuthUserId(req);
      if (schedule.artistId !== nameUserId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const appointment = await storage.getScheduleAppointment(appointmentId);
      if (!appointment || appointment.scheduleId !== schedule.id) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      const existingPhotos = appointment.inspirationPhotos || [];
      const updatedPhotos = existingPhotos.filter(p => p !== photoUrl);
      
      await storage.updateScheduleAppointment(appointmentId, { inspirationPhotos: updatedPhotos });
      res.json({ success: true, photos: updatedPhotos });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Add appointment to schedule via share token
  app.post("/api/event-schedules/share/:shareToken/appointment", async (req, res) => {
    try {
      const schedule = await storage.getEventDayScheduleByShareToken(req.params.shareToken);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }

      const { teamMemberId, clientName, startTime, endTime, serviceType } = req.body;

      // Defects #2, #3, #5, #7: validate like the authenticated create path.
      // (Auth for this public route is unchanged: guests can still add
      // appointments via a share link; see the time/name routes for the
      // defect #8 decision on structural edits.)
      const members = await storage.getScheduleTeamMembers(schedule.id);
      const peers = await storage.getScheduleAppointments(schedule.id);
      const validationError = validateLegacyAppointmentWrite({
        input: { clientName, serviceType, startTime, endTime, teamMemberId },
        peers,
        members,
        readyByTime: schedule.readyByTime,
        isCreate: true,
      });
      if (validationError) {
        const status = /cannot perform|not created|unknown teamMemberId/i.test(validationError) ? 422 : 400;
        return res.status(status).json({ error: validationError });
      }

      const appointment = await storage.createScheduleAppointment({
        scheduleId: schedule.id,
        teamMemberId: teamMemberId || null,
        clientName: clientName || "",
        startTime: startTime || "",
        endTime: endTime || "",
        serviceType: serviceType || "HM",
        isVip: false,
        isBuffer: false,
      });

      res.json(appointment);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Delete appointment from schedule via share token
  app.delete("/api/event-schedules/share/:shareToken/appointment/:appointmentId", async (req, res) => {
    try {
      const schedule = await storage.getEventDayScheduleByShareToken(req.params.shareToken);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }

      const appointment = await storage.getScheduleAppointment(req.params.appointmentId);
      if (!appointment || appointment.scheduleId !== schedule.id) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      await storage.deleteScheduleAppointment(req.params.appointmentId);
      res.json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== SCHEDULE CHAT (Guest chat on public schedule - no auth required) ==========
  
  // Rate limiter for schedule chat to prevent abuse
  const scheduleChatLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 messages per minute per IP
    message: { error: "Too many messages, please slow down" },
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  // Zod schema for chat message validation
  const scheduleChatSchema = z.object({
    senderName: z.string().min(1, "Name is required").max(50, "Name too long").transform(s => s.trim()),
    content: z.string().min(1, "Message is required").max(500, "Message too long").transform(s => s.trim()),
  });
  
  // Get schedule chat messages
  app.get("/api/event-schedules/share/:shareToken/chat", async (req, res) => {
    try {
      const schedule = await storage.getEventDayScheduleByShareToken(req.params.shareToken);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      const messages = await storage.getScheduleChatMessages(schedule.id);
      res.json(messages);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Post a new chat message (guest or AI) - with rate limiting and validation
  app.post("/api/event-schedules/share/:shareToken/chat", scheduleChatLimiter, async (req, res) => {
    try {
      // Validate input with Zod
      const parseResult = scheduleChatSchema.safeParse(req.body);
      if (!parseResult.success) {
        const firstError = parseResult.error.errors[0];
        return res.status(400).json({ error: firstError.message });
      }
      
      const { senderName, content } = parseResult.data;
      const schedule = await storage.getEventDayScheduleByShareToken(req.params.shareToken);
      
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      // Create the guest message (sanitized)
      const guestMessage = await storage.createScheduleChatMessage({
        scheduleId: schedule.id,
        senderName,
        senderType: 'guest',
        content,
      });
      
      // Get schedule data for AI context
      const appointments = await storage.getScheduleAppointments(schedule.id);
      const teamMembers = await storage.getScheduleTeamMembers(schedule.id);
      
      // Process with AI and get response (AI is read-only - cannot modify schedule)
      try {
        const scheduleAI = await import("./scheduleAI");
        const aiResponse = await scheduleAI.processScheduleChat({
          message: content,
          senderName,
          schedule,
          appointments,
          teamMembers,
        });
        
        // Create AI response message (read-only - no metadata, no changes)
        if (aiResponse?.response) {
          await storage.createScheduleChatMessage({
            scheduleId: schedule.id,
            senderName: 'AI Assistant',
            senderType: 'ai',
            content: aiResponse.response,
          });
        }
      } catch (aiError) {
        console.error("[Schedule AI] Error processing chat:", aiError);
        // Create fallback AI response
        await storage.createScheduleChatMessage({
          scheduleId: schedule.id,
          senderName: 'AI Assistant',
          senderType: 'ai',
          content: "Thanks for your message! I've noted that down. Feel free to add any other notes or questions about the schedule.",
        });
      }
      
      // Send email notification to artist about new chat message
      try {
        if (schedule.artistId) {
          const artist = await storage.getUser(schedule.artistId);
          const artistProfile = await storage.getArtistProfile(schedule.artistId);
          if (artist?.email) {
            const { sendGeneralEmail } = await import("./emailService");
            await sendGeneralEmail({
              toEmail: artist.email,
              subject: `New message on ${schedule.eventName} schedule from ${senderName}`,
              content: `You have a new message on your schedule for ${schedule.eventName}:\n\n"${content}"\n\n- ${senderName}`,
              senderName: artistProfile?.businessName || "Your Private Secretary",
            });
            console.log("[Schedule Chat] Email notification sent to artist:", artist.email);
          }
        }
      } catch (emailErr) {
        console.log("[Schedule Chat] Could not send email notification:", emailErr);
      }
      
      // Return all messages
      const messages = await storage.getScheduleChatMessages(schedule.id);
      res.json({ success: true, messages });
    } catch (error: any) {
      console.error("[Schedule Chat] Error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // Parse a pasted client list into a full schedule grid
  app.post("/api/schedule/parse-clients", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { rawText, startTime, numArtists, artistNames } = req.body;
      if (!rawText) return res.status(400).json({ error: "rawText required" });
      // No silent defaults: start time and artist count are operator facts,
      // never assumed server-side.
      if (!startTime) return res.status(400).json({ error: "startTime required — no default start time is assumed" });
      const parsedNumArtists = Number(numArtists);
      if (!Number.isFinite(parsedNumArtists) || parsedNumArtists < 1) {
        return res.status(400).json({ error: "numArtists required — the artist count is never assumed" });
      }
      const scheduleAI = await import("./scheduleAI");
      const result = await scheduleAI.parseClientList({
        rawText,
        startTime,
        numArtists: Math.floor(parsedNumArtists),
        artistNames: artistNames || [],
      });
      res.json(result);
    } catch (err: any) {
      console.error("[Schedule AI] parse-clients error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Process a voice/text command and return updated grid
  app.post("/api/schedule/voice-command", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { command, artists, grid, startTime } = req.body;
      if (!command) return res.status(400).json({ error: "command required" });
      if (!startTime) return res.status(400).json({ error: "startTime required — no default start time is assumed" });
      const scheduleAI = await import("./scheduleAI");
      const result = await scheduleAI.processVoiceCommand({
        command,
        artists: artists || [],
        grid: grid || [],
        startTime,
      });
      res.json(result);
    } catch (err: any) {
      console.error("[Schedule AI] voice-command error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Send schedule via email
  app.post("/api/event-schedules/send-email", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const { toEmails, shareTokens, personalMessage } = req.body;
      
      if (!toEmails || !Array.isArray(toEmails) || toEmails.length === 0) {
        return res.status(400).json({ error: "At least one email address is required" });
      }
      
      if (!shareTokens || !Array.isArray(shareTokens) || shareTokens.length === 0) {
        return res.status(400).json({ error: "At least one schedule is required" });
      }
      
      // Get user info for sender name
      const user = await storage.getUser(userId);
      const senderName = user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user?.firstName || 'Your beauty vendor';
      
      // Get schedule details for email
      const schedules = await Promise.all(
        shareTokens.map((token: string) => storage.getEventDayScheduleByShareToken(token))
      );
      const validSchedules = schedules.filter(Boolean);
      
      if (validSchedules.length === 0) {
        return res.status(400).json({ error: "No valid schedules found" });
      }
      
      // Build event info
      const eventNames = [...new Set(validSchedules.map(s => s.eventName))].join(', ');
      const eventDates = validSchedules
        .map(s => new Date(s.eventDate).toLocaleDateString('en-US', { 
          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
        }))
        .join(' • ');
      
      // Build share link
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://briarwood.ai';
      
      const shareLink = shareTokens.length === 1
        ? `${baseUrl}/schedule/${shareTokens[0]}`
        : `${baseUrl}/schedules/${shareTokens.join(',')}`;
      
      console.log("=== SENDING SCHEDULE EMAIL ===");
      console.log("To emails:", toEmails);
      console.log("Share link:", shareLink);
      console.log("Event:", eventNames);
      
      // Send emails
      const emailService = await import("./emailService");
      const result = await emailService.sendScheduleEmail({
        toEmails,
        scheduleLink: shareLink,
        eventName: eventNames,
        eventDates,
        senderName,
        personalMessage
      });
      
      console.log("Email result:", result);
      
      res.json({ 
        success: true, 
        message: `Schedule sent to ${result.successful} of ${result.total} recipients`,
        ...result
      });
    } catch (error: any) {
      console.error("Send schedule email error:", error);
      res.status(400).json({ error: error.message || "Failed to send email" });
    }
  });

  // ========== COMPOSE EMAIL (Unified email sender) ==========
  const composeEmailSchema = z.object({
    to: z.string().email("Invalid email address"),
    subject: z.string().min(1, "Subject is required").max(200),
    body: z.string().min(1, "Message body is required").max(10000),
    templateType: z.enum(['general', 'invoice', 'schedule', 'confirmation']).optional(),
  });

  app.post("/api/emails/compose", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const parseResult = composeEmailSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        const firstError = parseResult.error.errors[0];
        return res.status(400).json({ error: firstError.message });
      }
      
      const { to, subject, body } = parseResult.data;
      
      // Get sender info
      const user = await storage.getUser(userId);
      const senderName = user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user?.firstName || 'Your Secretary';
      
      // Send the email
      const emailService = await import("./emailService");
      await emailService.sendGeneralEmail({
        to,
        subject,
        body,
        senderName,
      });
      
      res.json({ success: true, message: "Email sent successfully" });
    } catch (error: any) {
      console.error("[Compose Email] Error:", error);
      res.status(400).json({ error: error.message || "Failed to send email" });
    }
  });

  // Send schedule via SMS
  app.post("/api/event-schedules/send-sms", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const { toPhones, shareTokens } = req.body;
      
      if (!toPhones || !Array.isArray(toPhones) || toPhones.length === 0) {
        return res.status(400).json({ error: "At least one phone number is required" });
      }
      
      if (!shareTokens || !Array.isArray(shareTokens) || shareTokens.length === 0) {
        return res.status(400).json({ error: "At least one schedule is required" });
      }
      
      if (!smsService.isSmsConfigured()) {
        return res.status(400).json({ 
          error: "SMS service not configured", 
          configured: false,
          message: "Please set up Twilio credentials to enable SMS notifications"
        });
      }
      
      // Get user info for sender name
      const user = await storage.getUser(userId);
      const senderName = user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user?.firstName || 'Your beauty vendor';
      
      // Get schedule details and verify ownership
      const schedules = await Promise.all(
        shareTokens.map((token: string) => storage.getEventDayScheduleByShareToken(token))
      );
      const validSchedules = schedules.filter(Boolean);
      
      if (validSchedules.length === 0) {
        return res.status(400).json({ error: "No valid schedules found" });
      }
      
      // Verify the user owns all schedules
      const unauthorizedSchedules = validSchedules.filter(s => s!.artistId !== userId);
      if (unauthorizedSchedules.length > 0) {
        return res.status(403).json({ error: "You don't have permission to share one or more of these schedules" });
      }
      
      // Build event info
      const eventNames = [...new Set(validSchedules.map(s => s!.eventName))].join(', ');
      
      // Build share link
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://briarwood.ai';
      const shareLink = shareTokens.length === 1
        ? `${baseUrl}/schedule/${shareTokens[0]}`
        : `${baseUrl}/schedules/${shareTokens.join(',')}`;
      
      console.log("=== SENDING SCHEDULE SMS ===");
      console.log("To phones:", toPhones);
      console.log("Share link:", shareLink);
      
      // Send SMS to each phone number
      const results = await Promise.all(
        toPhones.map((phone: string) => 
          smsService.sendScheduleNotification(phone, senderName, eventNames, shareLink)
        )
      );
      
      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;
      
      console.log("SMS result: successful:", successful, "failed:", failed);
      
      res.json({ 
        success: true, 
        message: `Schedule SMS sent to ${successful} of ${toPhones.length} recipients`,
        successful,
        failed,
        total: toPhones.length
      });
    } catch (error: any) {
      console.error("Send schedule SMS error:", error);
      res.status(400).json({ error: error.message || "Failed to send SMS" });
    }
  });

  // ========== TIMELINE IMPORT (AI-powered parsing) ==========
  
  // Parse timeline text and return structured data for review
  app.post("/api/event-schedules/import/parse", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { timelineText } = req.body;
      
      if (!timelineText || typeof timelineText !== 'string') {
        return res.status(400).json({ error: "Timeline text is required" });
      }
      
      if (timelineText.length < 50) {
        return res.status(400).json({ error: "Timeline text is too short. Please paste the full timeline." });
      }
      
      const timelineParser = await import("./timelineParser");
      const parsed = await timelineParser.parseTimelineDocument(timelineText);
      
      if (parsed.error) {
        return res.status(400).json({ error: parsed.error, suggestions: parsed.suggestions });
      }
      
      res.json(parsed);
    } catch (error: any) {
      console.error("Timeline parse error:", error);
      res.status(400).json({ error: error.message || "Failed to parse timeline" });
    }
  });

  // Confirm and save parsed timeline as a new schedule
  app.post("/api/event-schedules/import/confirm", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const { eventName, eventDate, eventLocation, readyByTime, notes, teamMembers, appointments } = req.body;
      
      if (!eventName || !eventDate) {
        return res.status(400).json({ error: "Event name and date are required" });
      }
      
      // Generate share token
      const shareToken = `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create the schedule
      const schedule = await storage.createEventDaySchedule({
        artistId: userId,
        eventName,
        eventDate: parseLocalDate(eventDate),
        eventLocation,
        readyByTime,
        notes,
        shareToken,
        status: 'draft',
      });
      
      // Create team members and map their IDs
      // TODO (defect #9): members are keyed by NAME here, so two members with
      // the same name collide and appointments mis-assign. Prefer a
      // client-supplied stable key (or the member id when re-confirming) over
      // name-based lookup.
      const teamMemberMap: Record<string, string> = {};
      if (Array.isArray(teamMembers)) {
        for (let i = 0; i < teamMembers.length; i++) {
          const tm = teamMembers[i];
          const created = await storage.createScheduleTeamMember({
            scheduleId: schedule.id,
            name: tm.name,
            role: tm.role || 'stylist',
            serviceType: tm.serviceType,
            displayOrder: i,
          });
          teamMemberMap[tm.name] = created.id;
        }
      }
      
      // Create appointments
      if (Array.isArray(appointments)) {
        for (let i = 0; i < appointments.length; i++) {
          const apt = appointments[i];
          await storage.createScheduleAppointment({
            scheduleId: schedule.id,
            teamMemberId: apt.teamMemberName ? teamMemberMap[apt.teamMemberName] : null,
            clientName: apt.clientName,
            serviceType: apt.serviceType || 'HM',
            startTime: apt.startTime,
            endTime: apt.endTime,
            isVip: apt.isVip || false,
            isBuffer: apt.isBuffer || false,
            blockType: apt.blockType || 'service',
            locationName: apt.locationName,
            locationAddress: apt.locationAddress,
            notes: apt.notes,
            displayOrder: i,
          });
        }
      }
      
      // Fetch the complete schedule with all data
      const createdTeamMembers = await storage.getScheduleTeamMembers(schedule.id);
      const createdAppointments = await storage.getScheduleAppointments(schedule.id);
      
      res.json({ ...schedule, teamMembers: createdTeamMembers, appointments: createdAppointments });
    } catch (error: any) {
      console.error("Timeline confirm error:", error);
      res.status(400).json({ error: error.message || "Failed to save schedule" });
    }
  });

  // Create new schedule
  app.post("/api/event-schedules", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const { 
        eventName, 
        eventDate, 
        eventLocation, 
        readyByTime, 
        notes, 
        bookingId,
        sessionDetails,
        recipientEmails,
        timeSlots,
        artistColumns,
        grid
      } = req.body;
      
      // Generate share token
      const shareToken = `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
      
      const schedule = await storage.createEventDaySchedule({
        artistId: userId,
        eventName,
        eventDate: parseLocalDate(eventDate),
        eventLocation,
        readyByTime,
        notes,
        bookingId,
        shareToken,
        sessionDetails,
        recipientEmails,
        status: 'draft',
      });
      
      // If AI provided timeSlots and artistColumns, create the grid structure
      if (timeSlots && timeSlots.length > 0 && artistColumns && artistColumns.length > 0) {
        // Create team members (artist columns)
        const createdMembers = [];
        for (let i = 0; i < artistColumns.length; i++) {
          const member = await storage.createScheduleTeamMember({
            scheduleId: schedule.id,
            name: artistColumns[i],
            role: 'stylist',
            displayOrder: i,
          });
          createdMembers.push(member);
        }
        
        // Create appointments for each time slot and artist
        for (let slotIdx = 0; slotIdx < timeSlots.length; slotIdx++) {
          const startTime = timeSlots[slotIdx];
          
          // Calculate end time (45 mins later)
          const parseTime = (t: string) => {
            const match = t.match(/(\d+):(\d+)\s*(AM|PM)?/i);
            if (!match) return null;
            let hours = parseInt(match[1]);
            const mins = parseInt(match[2]);
            const period = match[3]?.toUpperCase();
            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
            return hours * 60 + mins;
          };
          
          const formatTime = (mins: number) => {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            const period = h >= 12 ? 'PM' : 'AM';
            const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
            return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
          };
          
          const startMins = parseTime(startTime);
          const endTime = startMins !== null ? formatTime(startMins + 45) : startTime;
          
          for (let artistIdx = 0; artistIdx < createdMembers.length; artistIdx++) {
            const gridCell = grid?.[slotIdx]?.[artistIdx];
            
            // Only create appointments with actual client names, not empty placeholders
            if (gridCell?.clientName && gridCell.clientName.trim()) {
              await storage.createScheduleAppointment({
                scheduleId: schedule.id,
                teamMemberId: createdMembers[artistIdx].id,
                clientName: gridCell.clientName.trim(),
                serviceType: gridCell?.service || 'H',
                startTime: startTime,
                endTime: endTime,
                displayOrder: slotIdx,
              });
            }
          }
        }
      }
      
      res.json(schedule);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Update schedule
  app.patch("/api/event-schedules/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const schedule = await storage.getEventDaySchedule(req.params.id);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      const userId = getAuthUserId(req);
      if (schedule.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const body: any = req.body || {};

      // Defect #7: optimistic concurrency.
      const revisionError = checkExpectedRevision(body, (schedule as any).revision);
      if (revisionError) {
        return res.status(409).json({ error: revisionError });
      }

      // Defect #7: semantic validation against the schedule's team members.
      const members = await storage.getScheduleTeamMembers(schedule.id);
      const semanticError = validateSchedulePatchBody(body, members);
      if (semanticError) {
        return res.status(400).json({ error: semanticError });
      }
      
      const updated = await storage.updateEventDaySchedule(req.params.id, stripRevisionFields(body));
      res.json(updated);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Delete schedule
  app.delete("/api/event-schedules/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const schedule = await storage.getEventDaySchedule(req.params.id);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      const userId = getAuthUserId(req);
      if (schedule.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      await storage.deleteEventDaySchedule(req.params.id);
      res.json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== SCHEDULE TEAM MEMBERS ==========
  
  // Add team member to schedule
  app.post("/api/event-schedules/:scheduleId/team", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const schedule = await storage.getEventDaySchedule(req.params.scheduleId);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      const userId = getAuthUserId(req);
      if (schedule.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const { name, role, serviceType, color, displayOrder } = req.body;

      // Defect #1: never silently default the role. The client always sends it;
      // a missing role is a caller bug, not a default.
      if (typeof role !== "string" || role.trim() === "") {
        return res.status(400).json({ error: "Team member role is required." });
      }

      const member = await storage.createScheduleTeamMember({
        scheduleId: req.params.scheduleId,
        name,
        role,
        serviceType,
        color,
        displayOrder: displayOrder || 0,
      });
      
      res.json(member);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Update team member
  app.patch("/api/event-schedules/team/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const member = await storage.getScheduleTeamMember(req.params.id);
      if (!member) {
        return res.status(404).json({ error: "Team member not found" });
      }
      
      const schedule = await storage.getEventDaySchedule(member.scheduleId);
      if (!schedule || schedule.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const updated = await storage.updateScheduleTeamMember(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Team member not found" });
      }
      res.json(updated);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Delete team member
  app.delete("/api/event-schedules/team/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const member = await storage.getScheduleTeamMember(req.params.id);
      if (!member) {
        return res.status(404).json({ error: "Team member not found" });
      }
      
      const schedule = await storage.getEventDaySchedule(member.scheduleId);
      if (!schedule || schedule.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      await storage.deleteScheduleTeamMember(req.params.id);
      res.json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== SCHEDULE APPOINTMENTS ==========
  
  // Add appointment to schedule
  app.post("/api/event-schedules/:scheduleId/appointments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const schedule = await storage.getEventDaySchedule(req.params.scheduleId);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      const userId = getAuthUserId(req);
      if (schedule.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const { clientName, serviceType, startTime, endTime, teamMemberId, isVip, isBuffer, notes, displayOrder } = req.body;

      // Defects #2, #3, #5, #7: the legacy create path must enforce the same
      // invariants as the engine (duration, ready-time deadline, capability /
      // placeability, overlap) instead of silently creating bad appointments.
      const members = await storage.getScheduleTeamMembers(schedule.id);
      const peers = await storage.getScheduleAppointments(schedule.id);
      const validationError = validateLegacyAppointmentWrite({
        input: { clientName, serviceType, startTime, endTime, teamMemberId },
        peers,
        members,
        readyByTime: schedule.readyByTime,
        isCreate: true,
      });
      if (validationError) {
        // 422 when the service cannot be placed; 400 for malformed input.
        const status = /cannot perform|not created|unknown teamMemberId/i.test(validationError) ? 422 : 400;
        return res.status(status).json({ error: validationError });
      }

      const appointment = await storage.createScheduleAppointment({
        scheduleId: req.params.scheduleId,
        teamMemberId: normalizeMemberId(teamMemberId),
        clientName,
        serviceType,
        startTime,
        endTime,
        isVip: isVip || false,
        isBuffer: isBuffer || false,
        notes,
        displayOrder: displayOrder || 0,
      });
      
      res.json(appointment);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Bulk create appointments (for smart generation)
  app.post("/api/event-schedules/:scheduleId/appointments/bulk", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const schedule = await storage.getEventDaySchedule(req.params.scheduleId);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      const userId = getAuthUserId(req);
      if (schedule.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const { appointments } = req.body;
      if (!Array.isArray(appointments)) {
        return res.status(400).json({ error: "Appointments must be an array" });
      }
      
      const appointmentsWithScheduleId = appointments.map((apt: any) => ({
        ...apt,
        scheduleId: req.params.scheduleId,
      }));
      
      const created = await storage.bulkCreateScheduleAppointments(appointmentsWithScheduleId);
      res.json(created);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Update appointment
  app.patch("/api/event-schedules/appointments/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const appointment = await storage.getScheduleAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      const schedule = await storage.getEventDaySchedule(appointment.scheduleId);
      if (!schedule || schedule.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Defects #2 / #5: swaps, moves, and retimes are re-validated against
      // capability, duration, overlap, and the ready-time deadline instead of
      // passing the body straight through.
      const members = await storage.getScheduleTeamMembers(schedule.id);
      const peers = await storage.getScheduleAppointments(schedule.id);
      const validationError = validateLegacyAppointmentWrite({
        input: req.body || {},
        existing: appointment,
        peers,
        members,
        readyByTime: schedule.readyByTime,
        isCreate: false,
      });
      if (validationError) {
        const status = /cannot perform|unknown teamMemberId/i.test(validationError) ? 422 : 400;
        return res.status(status).json({ error: validationError });
      }
      
      const updated = await storage.updateScheduleAppointment(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      res.json(updated);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Delete appointment
  app.delete("/api/event-schedules/appointments/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const appointment = await storage.getScheduleAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      const schedule = await storage.getEventDaySchedule(appointment.scheduleId);
      if (!schedule || schedule.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      await storage.deleteScheduleAppointment(req.params.id);
      res.json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Schedule chat with email notification
  app.post("/api/schedule-chat", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const { scheduleId, recipientEmail, message, shareToken } = req.body;
      
      if (!scheduleId || !recipientEmail || !message) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const schedule = await storage.getEventDaySchedule(scheduleId);
      if (!schedule || schedule.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const profile = await storage.getArtistProfile(userId);
      const artistName = profile?.businessName || "Your Artist";
      
      // getBaseUrl() was referenced here but never defined in this module
      // (pre-existing breakage); mirror emailService's base-URL logic inline.
      const scheduleBaseUrl = process.env.PUBLIC_BASE_URL || "https://dateinquiry.com";
      const scheduleUrl = shareToken
        ? `${scheduleBaseUrl}/schedule/${shareToken}`
        : `${scheduleBaseUrl}/artist/schedules`;

      const emailSubject = `Schedule Update: ${schedule.eventName}`;
      const emailHtml = `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #FAF8F5; padding: 24px; border-radius: 8px;">
            <h2 style="font-family: Fraunces, serif; color: #1A1A1A; margin-bottom: 16px;">Schedule Update</h2>
            <p style="color: #1A1A1A; margin-bottom: 16px;">${artistName} sent you a message about <strong>${schedule.eventName}</strong>:</p>
            <div style="background: #F5F0E8; padding: 16px; border-radius: 8px; margin-bottom: 24px; border-left: 3px solid #1A1A1A;">
              <p style="color: #1A1A1A; margin: 0;">"${message}"</p>
            </div>
            <a href="${scheduleUrl}" style="display: inline-block; background: #1A1A1A; color: #F5F0E8; padding: 12px 24px; border-radius: 6px; text-decoration: none;">View Schedule</a>
          </div>
        `;

      // Defect #10: wire delivery tracking through scheduled_emails. Insert as
      // pending, then mark sent/failed after the send attempt.
      const trackedEmail = await storage.createScheduledEmail({
        artistId: userId,
        bookingId: schedule.bookingId ?? null,
        emailType: "schedule_chat",
        recipientEmail,
        recipientName: recipientEmail,
        subject: emailSubject,
        emailData: { scheduleId: schedule.id },
        scheduledFor: new Date(),
        status: "pending",
      });

      const emailService = await import("./emailService");
      try {
        await emailService.sendEmail({
          to: recipientEmail,
          subject: emailSubject,
          html: emailHtml,
          fromName: artistName,
        });
        await storage.markScheduledEmailSent(trackedEmail.id);
      } catch (sendError: unknown) {
        const sendMessage = sendError instanceof Error ? sendError.message : String(sendError);
        await storage.markScheduledEmailFailed(trackedEmail.id, sendMessage);
        throw sendError;
      }
      
      res.json({ success: true, message: "Chat message sent with email notification" });
    } catch (error: any) {
      console.error("[Schedule Chat] Error:", error);
      res.status(500).json({ error: error.message || "Failed to send chat message" });
    }
  });

  // ========== CHAT INVITES ==========
  app.post("/api/chat-invites", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const senderId = getAuthUserId(req);
      const data = insertChatInviteSchema.parse({ ...req.body, senderId, status: 'pending' });
      
      const existingUser = await storage.getUserByEmail(data.inviteeEmail);
      const inviteData = {
        ...data,
        inviteeUserId: existingUser?.id || null,
      };
      
      const invite = await storage.createChatInvite(inviteData);
      res.json(invite);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/chat-invites/user/:userId", isAuthenticated, async (req, res) => {
    try {
      const invites = await storage.getChatInvitesByUser(req.params.userId);
      res.json(invites);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.patch("/api/chat-invites/:id", isAuthenticated, async (req, res) => {
    try {
      const invite = await storage.updateChatInvite(req.params.id, req.body);
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }
      res.json(invite);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Public chat invite validation (no auth required - for clients clicking email links)
  app.get("/api/chat-invite/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const invite = await storage.getChatInviteByToken(token);
      
      if (!invite) {
        return res.status(404).json({ error: "Chat invite not found" });
      }
      
      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        return res.status(410).json({ error: "This chat invite has expired" });
      }
      
      // Get vendor info
      const vendor = await storage.getUser(invite.senderId);
      const artistProfile = await storage.getArtistProfile(invite.senderId);
      const vendorName = artistProfile?.businessName || vendor?.firstName || 'The Artist';
      
      // Get inquiry info if linked
      let eventDate = null;
      let serviceType = null;
      let clientName = invite.inviteeEmail?.split('@')[0] || 'Client';
      
      if (invite.inquiryId) {
        const inquiry = await storage.getInquiry(invite.inquiryId);
        if (inquiry) {
          eventDate = inquiry.eventDate;
          serviceType = inquiry.serviceType;
          clientName = inquiry.clientName || clientName;
        }
      }
      
      res.json({
        id: invite.id,
        vendorName,
        clientName,
        clientEmail: invite.inviteeEmail,
        eventDate,
        serviceType,
        status: invite.status,
        artistSlug: artistProfile?.artistSlug,
      });
    } catch (error: any) {
      console.error("[Chat Invite] Error validating token:", error);
      res.status(500).json({ error: "Failed to validate chat invite" });
    }
  });

  // Send message via chat invite (no auth required)
  app.post("/api/chat-invite/:token/message", async (req, res) => {
    try {
      const { token } = req.params;
      const { message } = req.body;
      
      if (!message?.trim()) {
        return res.status(400).json({ error: "Message is required" });
      }
      
      const invite = await storage.getChatInviteByToken(token);
      
      if (!invite) {
        return res.status(404).json({ error: "Chat invite not found" });
      }
      
      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        return res.status(410).json({ error: "This chat invite has expired" });
      }
      
      // Get vendor info for email
      const vendor = await storage.getUser(invite.senderId);
      const artistProfile = await storage.getArtistProfile(invite.senderId);
      
      // Get client info and event details
      let clientName = invite.inviteeEmail?.split('@')[0] || 'A Client';
      let eventDate: string | undefined;
      let serviceType: string | undefined;
      
      if (invite.inquiryId) {
        const inquiry = await storage.getInquiry(invite.inquiryId);
        if (inquiry?.clientName) {
          clientName = inquiry.clientName;
        }
        if (inquiry?.eventDate) {
          eventDate = new Date(inquiry.eventDate).toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
          });
        }
        serviceType = inquiry?.serviceType || undefined;
      }
      
      const vendorName = artistProfile?.businessName || vendor?.firstName || 'Your Beauty Artist';
      
      // Save client message to database
      await storage.createChatInviteMessage({
        chatInviteId: invite.id,
        senderType: 'client',
        senderName: clientName,
        content: message.trim(),
      });
      
      // Log CDI behavioral event - client sent a message (communication signal)
      try {
        // Get last message from vendor to calculate response latency
        const messages = await storage.getChatInviteMessages(invite.id);
        const lastVendorMessage = messages
          .filter((m: any) => m.senderType === 'artist' || m.senderType === 'ai')
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        
        let responseLatencyMs: number | undefined;
        if (lastVendorMessage) {
          responseLatencyMs = Date.now() - new Date(lastVendorMessage.createdAt).getTime();
        }
        
        // Signal strength based on response time (quick = positive, slow = neutral)
        const signalStrength = responseLatencyMs 
          ? (responseLatencyMs < 3600000 ? 30 : responseLatencyMs < 86400000 ? 15 : 5) // <1hr: 30, <24hr: 15, else: 5
          : 20;
        
        // Use inquiry ID as client surrogate (clients don't have user accounts in zero-login architecture)
        const clientSurrogateId = invite.inquiryId || `chat_invite_${invite.id}`;
        
        await cdiEngine.recordBehavioralEvent(
          clientSurrogateId, // Client surrogate ID (inquiry or chat invite)
          'client',
          'communication',
          'client_message_sent',
          'choreography_awareness',
          signalStrength,
          {
            targetUserId: invite.senderId, // Artist receiving the message
            targetRole: 'artist',
            responseLatencyMs,
            evidenceText: `Client sent message in chat thread`,
          }
        );
      } catch (cdiError) {
        console.error('[CDI] Error logging chat message event:', cdiError);
      }
      
      // Generate AI response on behalf of vendor
      const { generateClientResponse } = await import('./aiChat');
      const aiResponse = await generateClientResponse(invite.senderId, message, {
        clientName,
        clientEmail: invite.inviteeEmail || '',
        eventDate,
        serviceType,
      });
      
      console.log('[AI Secretary] Generated response:', aiResponse.response.substring(0, 100));
      
      // Save AI response to database
      await storage.createChatInviteMessage({
        chatInviteId: invite.id,
        senderType: 'ai',
        senderName: vendorName + ' (AI Assistant)',
        content: aiResponse.response,
      });
      
      // Note: We don't send a confirmation email to the client after they send a message
      // This avoids confusion as it could imply the artist responded when they haven't yet
      
      // Send notification email to the vendor with client message and folder link
      if (vendor?.email) {
        const baseUrl = process.env.PUBLIC_BASE_URL || 'https://dateinquiry.com';
        
        // Get thread token from inquiry for direct folder link
        let folderLink = `${baseUrl}/${artistProfile?.artistSlug || 'dashboard'}`;
        if (invite.inquiryId) {
          const inquiry = await storage.getInquiry(invite.inquiryId);
          if (inquiry?.threadToken) {
            folderLink = `${baseUrl}/inquiry/${inquiry.threadToken}`;
          }
        }
        
        const vendorNotification = `Hi ${vendor.firstName || vendorName},\n\n${clientName} sent you a message:\n\n"${message}"\n\n${aiResponse.isBookingConfirmation ? 'This looks like a booking confirmation. Consider sending a contract!\n\n' : ''}View conversation: ${folderLink}\n\nClient email: ${invite.inviteeEmail}`;
        
        import('./emailService').then(({ sendGeneralEmail }) => {
          sendGeneralEmail({
            to: vendor.email,
            subject: `New message from ${clientName}`,
            body: vendorNotification,
            senderName: 'Date Inquiry',
          }).catch((err: any) => console.error('[Chat Message Email] Error:', err));
        });
      }
      
      // Update invite status to show it's been used
      await storage.updateChatInvite(invite.id, { status: 'accepted' });
      
      res.json({ 
        success: true, 
        message: "Message sent successfully",
        aiResponse: aiResponse.response,
        isBookingConfirmation: aiResponse.isBookingConfirmation,
      });
    } catch (error: any) {
      console.error("[Chat Invite] Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // ========== ARTIST CLIENT CHATS ==========
  // Get all client chats for the current artist
  app.get("/api/client-chats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const chatInvites = await storage.getChatInvitesByUser(userId);
      
      // Get inquiries in one batch for all chats that have inquiryId
      const inquiryIds = chatInvites.filter(c => c.inquiryId).map(c => c.inquiryId!);
      const inquiries: Record<string, any> = {};
      for (const id of inquiryIds) {
        const inquiry = await storage.getInquiry(id);
        if (inquiry) inquiries[id] = inquiry;
      }
      
      // Enrich chats with summary info (no full message fetch - just get counts)
      const enrichedChats = chatInvites.map((chat) => {
        const inquiry = chat.inquiryId ? inquiries[chat.inquiryId] : null;
        return {
          id: chat.id,
          inviteeEmail: chat.inviteeEmail,
          status: chat.status,
          createdAt: chat.createdAt,
          clientName: inquiry?.clientName || chat.inviteeEmail?.split('@')[0] || 'Client',
          eventDate: inquiry?.eventDate || null,
        };
      });
      
      res.json(enrichedChats);
    } catch (error: any) {
      console.error("[Client Chats] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get messages for a specific client chat
  app.get("/api/client-chats/:id/messages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const chatInvite = await storage.getChatInvite(req.params.id);
      if (!chatInvite) {
        return res.status(404).json({ error: "Chat not found" });
      }
      
      if (chatInvite.senderId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const messages = await storage.getChatInviteMessages(chatInvite.id);
      res.json(messages);
    } catch (error: any) {
      console.error("[Client Chat Messages] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Artist sends message to client
  app.post("/api/client-chats/:id/messages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Validate request body
      const bodySchema = z.object({ content: z.string().min(1, "Message content is required") });
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid request" });
      }
      const { content } = parsed.data;
      
      const chatInvite = await storage.getChatInvite(req.params.id);
      if (!chatInvite) {
        return res.status(404).json({ error: "Chat not found" });
      }
      
      if (chatInvite.senderId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      // Get artist info
      const user = await storage.getUser(userId);
      const artistProfile = await storage.getArtistProfile(userId);
      const artistName = artistProfile?.businessName || user?.firstName || 'Artist';
      
      // Save message to database
      const message = await storage.createChatInviteMessage({
        chatInviteId: chatInvite.id,
        senderType: 'artist',
        senderName: artistName,
        content: content.trim(),
      });
      
      // Get base URL for chat link - use production URL
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://briarwood.ai';
      const chatLink = `${baseUrl}/chat-invite/${chatInvite.token}`;
      
      // Send email to client
      if (chatInvite.inviteeEmail) {
        const { sendGeneralEmail } = await import('./emailService');
        await sendGeneralEmail({
          to: chatInvite.inviteeEmail,
          subject: `Message from ${artistName}`,
          body: content.trim(),
          senderName: artistName,
          chatLink,
        });
      }
      
      res.json({ success: true, message });
    } catch (error: any) {
      console.error("[Send Client Message] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========== CONVERSATIONS ==========
  app.post("/api/conversations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const { bookingId, participantIds } = req.body;
      
      const conversation = await storage.createConversation({ bookingId: bookingId || null });
      
      // Add current user as participant
      await storage.addParticipantToConversation(conversation.id, userId);
      
      if (participantIds && Array.isArray(participantIds)) {
        for (const participantId of participantIds) {
          if (participantId !== userId) {
            await storage.addParticipantToConversation(conversation.id, participantId);
          }
        }
      }
      
      const participants = await storage.getConversationParticipants(conversation.id);
      res.json({ ...conversation, participants });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/conversations/user/:userId", isAuthenticated, async (req, res) => {
    try {
      const conversations = await storage.getConversationsByUser(req.params.userId);
      res.json(conversations);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/conversations/:id", isAuthenticated, async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const participants = await storage.getConversationParticipants(conversation.id);
      res.json({ ...conversation, participants });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.post("/api/conversations/:id/participants", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.body;
      const participant = await storage.addParticipantToConversation(req.params.id, userId);
      res.json(participant);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== BUSINESS CHAT (Internal Team Communication) ==========
  // Get vendor/planner's business conversations
  app.get("/api/business-chat/conversations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'artist' && user.role !== 'planner')) {
        return res.status(403).json({ error: "Only vendors and planners can access business chat" });
      }
      
      const conversations = await storage.getBusinessConversations(userId);
      res.json(conversations);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Create a new business conversation
  app.post("/api/business-chat/conversations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'artist' && user.role !== 'planner')) {
        return res.status(403).json({ error: "Only vendors and planners can create business chats" });
      }
      
      const { title } = req.body;
      const conversation = await storage.createBusinessConversation(title || "Team Chat", userId);
      
      // Add owner as participant
      await storage.addParticipantToConversation(conversation.id, userId);
      
      res.json(conversation);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Get messages in a business conversation
  app.get("/api/business-chat/conversations/:id/messages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const conversation = await storage.getConversation(req.params.id);
      
      if (!conversation || conversation.channelType !== 'business') {
        return res.status(404).json({ error: "Business conversation not found" });
      }
      
      // Verify user is a participant
      const participants = await storage.getConversationParticipants(conversation.id);
      const isParticipant = participants.some(p => p.id === userId) || conversation.ownerId === userId;
      
      if (!isParticipant) {
        return res.status(403).json({ error: "Not a participant of this conversation" });
      }
      
      const messages = await storage.getBusinessChatMessages(req.params.id);
      
      // Mark messages as read
      await storage.markBusinessChatMessagesRead(req.params.id, userId);
      
      res.json(messages);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Send a message in a business conversation
  app.post("/api/business-chat/conversations/:id/messages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const conversation = await storage.getConversation(req.params.id);
      
      if (!conversation || conversation.channelType !== 'business') {
        return res.status(404).json({ error: "Business conversation not found" });
      }
      
      // Verify user is a participant
      const participants = await storage.getConversationParticipants(conversation.id);
      const isParticipant = participants.some(p => p.id === userId) || conversation.ownerId === userId;
      
      if (!isParticipant) {
        return res.status(403).json({ error: "Not a participant of this conversation" });
      }
      
      const { content, messageType, metadata } = req.body;
      
      if (!content || content.trim() === '') {
        return res.status(400).json({ error: "Message content is required" });
      }
      
      const message = await storage.createBusinessChatMessage({
        conversationId: req.params.id,
        senderId: userId,
        content: content.trim(),
        messageType: messageType || 'text',
        metadata: metadata || null,
      });
      
      // Send response immediately - AI analysis happens in background
      res.json(message);
      
      // Run AI analysis in background (non-blocking, after response sent)
      const conversationId = req.params.id;
      const messageContent = content.trim();
      const conversationTitle = conversation.title || 'Team Chat';
      const conversationOwnerId = conversation.ownerId;
      const messageMetadata = metadata;
      
      setImmediate(async () => {
        try {
          // Fetch context inside the background task
          const sender = await storage.getUser(userId);
          const recentMessages = await storage.getBusinessChatMessages(conversationId);
          const previousMessages = recentMessages.slice(-5).map(m => m.content);
          
          const analysis = await businessChatAgent.analyzeBusinessChatMessage(messageContent, {
            senderName: sender?.firstName || sender?.email?.split('@')[0] || 'Unknown',
            senderRole: sender?.role || 'team_member',
            conversationTitle,
            previousMessages
          });
          
          // Store the insight
          await storage.createBusinessChatInsight({
            messageId: message.id,
            conversationId,
            senderId: userId,
            pivotType: analysis.pivotType,
            pivotSeverity: analysis.pivotSeverity,
            urgencyLevel: analysis.urgencyLevel,
            clientImpact: analysis.clientImpact,
            clientImpactScore: analysis.clientImpactScore,
            taskType: analysis.taskType,
            estimatedLaborMinutes: analysis.estimatedLaborMinutes,
            sentiment: analysis.sentiment,
            confidenceScore: analysis.confidenceScore,
            aiSummary: analysis.aiSummary,
            relatedClientId: null,
            relatedBookingId: messageMetadata?.bookingRef || null,
            cdiEventId: null
          });
          
          // If this should create a CDI event (significant pivot affecting client)
          if (analysis.shouldCreateCdiEvent && analysis.cdiEventType) {
            const cdiEvent = await storage.createCdiEvent({
              userId: conversationOwnerId || userId,
              bookingId: messageMetadata?.bookingRef || null,
              eventType: analysis.cdiEventType,
              severity: analysis.cdiEventSeverity || 3,
              metadata: {
                source: 'business_chat',
                messageId: message.id,
                pivotType: analysis.pivotType,
                aiSummary: analysis.aiSummary
              }
            });
            
            console.log(`[Business Chat AI] Created CDI event: ${cdiEvent.id} (${analysis.cdiEventType})`);
          }
          
          if (analysis.pivotType) {
            console.log(`[Business Chat AI] Detected pivot: ${analysis.pivotType} (severity: ${analysis.pivotSeverity})`);
          }
        } catch (err) {
          console.error("[Business Chat AI] Analysis error:", err);
        }
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== TEAM MEMBERS ==========
  // Get team members for a vendor/planner
  app.get("/api/team-members", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'artist' && user.role !== 'planner')) {
        return res.status(403).json({ error: "Only vendors and planners can manage team members" });
      }
      
      const members = await storage.getTeamMembers(userId);
      res.json(members);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Add a team member
  app.post("/api/team-members", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'artist' && user.role !== 'planner')) {
        return res.status(403).json({ error: "Only vendors and planners can add team members" });
      }
      
      const { memberEmail, memberName, role } = req.body;
      
      if (!memberEmail || !memberName) {
        return res.status(400).json({ error: "Email and name are required" });
      }
      
      // Check if member already exists
      const existingMembers = await storage.getTeamMembers(userId);
      const alreadyExists = existingMembers.some(m => m.memberEmail.toLowerCase() === memberEmail.toLowerCase());
      
      if (alreadyExists) {
        return res.status(400).json({ error: "This team member already exists" });
      }
      
      // Check if the person has a Briarwood account
      const existingUser = await storage.getUserByEmail(memberEmail);
      
      const member = await storage.createTeamMember({
        ownerId: userId,
        memberId: existingUser?.id || null,
        memberEmail,
        memberName,
        role: role || 'team_member',
        status: existingUser ? 'active' : 'invited',
      });
      
      res.json(member);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Update a team member
  app.patch("/api/team-members/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const member = await storage.getTeamMember(req.params.id);
      
      if (!member || member.ownerId !== userId) {
        return res.status(404).json({ error: "Team member not found" });
      }
      
      const { memberName, role, status } = req.body;
      
      const updated = await storage.updateTeamMember(req.params.id, {
        memberName,
        role,
        status,
      });
      
      res.json(updated);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Remove a team member
  app.delete("/api/team-members/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const member = await storage.getTeamMember(req.params.id);
      
      if (!member || member.ownerId !== userId) {
        return res.status(404).json({ error: "Team member not found" });
      }
      
      await storage.deleteTeamMember(req.params.id);
      res.json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Add participant to business conversation
  app.post("/api/business-chat/conversations/:id/participants", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const conversation = await storage.getConversation(req.params.id);
      
      if (!conversation || conversation.channelType !== 'business') {
        return res.status(404).json({ error: "Business conversation not found" });
      }
      
      // Only owner can add participants
      if (conversation.ownerId !== userId) {
        return res.status(403).json({ error: "Only the owner can add participants" });
      }
      
      const { participantId } = req.body;
      
      if (!participantId) {
        return res.status(400).json({ error: "Participant ID is required" });
      }
      
      const participant = await storage.addParticipantToConversation(req.params.id, participantId);
      res.json(participant);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== CONTACTS ==========
  app.get("/api/contacts/:userId", isAuthenticated, async (req, res) => {
    try {
      const contacts = await storage.getContactsForUser(req.params.userId);
      res.json(contacts);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== DATA IMPORT ==========
  // Import clients and message history in bulk
  app.post("/api/admin/import/clients-and-messages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { clients, messages } = req.body;
      
      if (!Array.isArray(clients) || !Array.isArray(messages)) {
        return res.status(400).json({ error: "clients and messages must be arrays" });
      }

      const dataImport = await import("./dataImport");
      const result = await dataImport.importConversationHistory(clients, messages);
      
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Import clients only
  app.post("/api/admin/import/clients", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { clients } = req.body;
      
      if (!Array.isArray(clients)) {
        return res.status(400).json({ error: "clients must be an array" });
      }

      const dataImport = await import("./dataImport");
      const result = await dataImport.importClients(clients);
      
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Import messages only
  app.post("/api/admin/import/messages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { messages } = req.body;
      
      if (!Array.isArray(messages)) {
        return res.status(400).json({ error: "messages must be an array" });
      }

      const dataImport = await import("./dataImport");
      const result = await dataImport.importMessages(messages);
      
      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== CDI REALTIME COMPUTATION ==========
  // New realtime CDI endpoint using white paper framework
  app.post("/api/admin/cdi/compute-realtime/:bookingId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { bookingId } = req.params;
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Compute realtime CDI using white paper framework
      const cdiRealtime_ = cdiRealtime as any;
      const result = await cdiRealtime_.computeCDIRealtime(
        bookingId,
        booking.clientId,
        booking.artistId,
        booking.plannerId
      );

      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Get realtime CDI components for a booking
  app.get("/api/admin/cdi/realtime/:bookingId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { bookingId } = req.params;
      const booking = await storage.getBooking(bookingId);
      
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      const cdiRealtime_ = cdiRealtime as any;
      const result = await cdiRealtime_.computeCDIRealtime(
        bookingId,
        booking.clientId,
        booking.artistId,
        booking.plannerId
      );

      res.json(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== SUPPORT CASES ==========
  app.post("/api/support-cases", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const data = insertSupportCaseSchema.parse({ ...req.body, userId });
      const supportCase = await storage.createSupportCase(data);
      
      // Create a CDI event for the support case
      await storage.createCdiEvent({
        userId,
        bookingId: data.bookingId,
        eventType: 'support_case',
        severity: data.priority === 'emergency' ? 10 : data.priority === 'high' ? 7 : data.priority === 'medium' ? 4 : 2,
        metadata: { caseId: supportCase.id, subject: data.subject } as any,
      });
      
      res.json(supportCase);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/support-cases/user/:userId", isAuthenticated, async (req, res) => {
    try {
      const cases = await storage.getSupportCasesByUser(req.params.userId);
      res.json(cases);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.patch("/api/support-cases/:id", isAuthenticated, async (req, res) => {
    try {
      const supportCase = await storage.updateSupportCase(req.params.id, req.body);
      if (!supportCase) {
        return res.status(404).json({ error: "Support case not found" });
      }
      res.json(supportCase);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== INVITATIONS ==========
  // Create invitation (admin only)
  app.post("/api/invitations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      // Generate unique token
      const token = randomUUID();
      
      const invitation = await storage.createInvitation({
        token,
        email: req.body.email,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        role: req.body.role,
        bookingId: req.body.bookingId,
        invitedBy: user.id,
        status: 'pending',
        expiresAt: null, // Invitations never expire
      });
      
      res.json(invitation);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Get invitation by token (public for invite acceptance)
  app.get("/api/invitations/token/:token", async (req, res) => {
    try {
      const invitation = await storage.getInvitationByToken(req.params.token);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found or expired" });
      }
      if (invitation.status !== 'pending') {
        return res.status(400).json({ error: "Invitation already used" });
      }
      // Invitations never expire - they can be shared freely
      res.json(invitation);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Get all invitations (admin only)
  app.get("/api/invitations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const invitations = await storage.getInvitationsByInviter(user.id);
      res.json(invitations);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Accept invitation (authenticated user)
  app.post("/api/invitations/accept/:token", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const invitation = await storage.acceptInvitation(req.params.token, userId);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }
      
      // Update user role based on invitation
      await storage.updateUserRole(userId, invitation.role);
      
      res.json({ success: true, invitation });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== OBJECT STORAGE ==========
  // Serve objects (profile images, etc.) - public access for visibility="public" objects
  app.get("/objects/:objectPath(*)", async (req: Request, res: Response) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const userId = req.user?.claims?.sub;
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Get upload URL for object storage
  app.post("/api/objects/upload", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error: any) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update profile image after upload
  app.put("/api/profile-image", isAuthenticated, async (req: Request, res: Response) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.imageURL,
        {
          owner: userId,
          visibility: "public", // Profile images are publicly accessible
        },
      );

      // Update user's profile image URL in database
      await storage.updateUser(userId, { profileImageUrl: objectPath });

      res.status(200).json({
        objectPath: objectPath,
        success: true,
      });
    } catch (error: any) {
      console.error("Error setting profile image:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========== ADMIN IMPORT ==========
  // Import a pre-existing booking with client/planner info
  app.post("/api/admin/import-booking", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { 
        clientEmail, 
        clientFirstName, 
        clientLastName,
        plannerEmail,
        plannerFirstName,
        plannerLastName,
        eventDate,
        eventLocation,
        serviceType,
        notes,
        totalAmount,
        depositAmount,
        depositPaid,
        contractFileUrl,
        packageDetails
      } = req.body;
      
      // Create or get client user
      let clientUser = await storage.getUserByEmail(clientEmail);
      if (!clientUser) {
        clientUser = await storage.upsertUser({
          id: randomUUID(),
          email: clientEmail,
          firstName: clientFirstName,
          lastName: clientLastName,
          role: 'client',
        });
      }
      
      // Create or get planner user if provided
      let plannerUser = null;
      if (plannerEmail) {
        plannerUser = await storage.getUserByEmail(plannerEmail);
        if (!plannerUser) {
          plannerUser = await storage.upsertUser({
            id: randomUUID(),
            email: plannerEmail,
            firstName: plannerFirstName,
            lastName: plannerLastName,
            role: 'planner',
          });
        }
      }
      
      // Create booking
      const booking = await storage.createBooking({
        clientId: clientUser.id,
        artistId: user.id, // Violet is the artist
        plannerId: plannerUser?.id,
        status: 'accepted',
        eventDate: parseLocalDate(eventDate),
        location: eventLocation,
        serviceType: serviceType || 'Bridal Beauty',
        notes,
      });
      
      // Create contract with deposit info
      const remainingAmount = totalAmount - (depositPaid ? depositAmount : 0);
      const contract = await storage.createContract({
        bookingId: booking.id,
        artistId: user.id,
        clientId: clientUser.id,
        packageDetails: packageDetails || serviceType || 'Custom Package',
        totalAmount: totalAmount, // already in cents
        depositAmount: depositAmount, // in cents
        depositPaidAt: depositPaid ? new Date() : undefined,
        remainingAmount: remainingAmount,
        status: 'signed',
        signedAt: new Date(),
        fileUrl: contractFileUrl,
      });
      
      // Generate invitation tokens for client and planner
      const clientToken = randomUUID();
      const clientExpiresAt = new Date();
      clientExpiresAt.setDate(clientExpiresAt.getDate() + 90); // 90 day expiry
      
      const clientInvitation = await storage.createInvitation({
        token: clientToken,
        email: clientEmail,
        firstName: clientFirstName,
        lastName: clientLastName,
        role: 'client',
        bookingId: booking.id,
        invitedBy: user.id,
        status: 'pending',
        expiresAt: clientExpiresAt,
      });
      
      let plannerInvitation = null;
      if (plannerEmail) {
        const plannerToken = randomUUID();
        const plannerExpiresAt = new Date();
        plannerExpiresAt.setDate(plannerExpiresAt.getDate() + 90);
        
        plannerInvitation = await storage.createInvitation({
          token: plannerToken,
          email: plannerEmail,
          firstName: plannerFirstName,
          lastName: plannerLastName,
          role: 'planner',
          bookingId: booking.id,
          invitedBy: user.id,
          status: 'pending',
          expiresAt: plannerExpiresAt,
        });
      }
      
      res.json({
        booking,
        contract,
        clientInvitation,
        plannerInvitation,
        clientInviteLink: `/invite/${clientToken}`,
        plannerInviteLink: plannerInvitation ? `/invite/${plannerInvitation.token}` : null,
      });
    } catch (error: any) {
      console.error('Import booking error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // ========== VENDOR SELF-SERVICE IMPORT ==========
  app.post("/api/vendor/import-booking", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (!user || (user.role !== 'artist' && user.role !== 'admin')) {
        return res.status(403).json({ error: "Vendor access required" });
      }
      
      const { 
        clientEmail, 
        clientFirstName, 
        clientLastName,
        plannerEmail,
        plannerFirstName,
        plannerLastName,
        eventDate,
        eventLocation,
        serviceType,
        notes,
        totalAmount,
        depositAmount,
        depositPaid,
        contractFileUrl,
        packageDetails
      } = req.body;
      
      // Create or get client user
      let clientUser = await storage.getUserByEmail(clientEmail);
      if (!clientUser) {
        clientUser = await storage.upsertUser({
          id: randomUUID(),
          email: clientEmail,
          firstName: clientFirstName,
          lastName: clientLastName,
          role: 'client',
        });
      }
      
      // Create or get planner user if provided
      let plannerUser = null;
      if (plannerEmail) {
        plannerUser = await storage.getUserByEmail(plannerEmail);
        if (!plannerUser) {
          plannerUser = await storage.upsertUser({
            id: randomUUID(),
            email: plannerEmail,
            firstName: plannerFirstName,
            lastName: plannerLastName,
            role: 'planner',
          });
        }
      }
      
      const parsedEventDate = parseLocalDate(eventDate);
      
      // Create booking
      const booking = await storage.createBooking({
        clientId: clientUser.id,
        artistId: user.id,
        plannerId: plannerUser?.id,
        status: 'accepted',
        eventDate: parsedEventDate,
        location: eventLocation,
        serviceType: serviceType || 'Bridal Beauty',
        notes,
      });
      
      // Create contract with deposit info
      const remainingAmount = totalAmount - (depositPaid ? depositAmount : 0);
      const contract = await storage.createContract({
        bookingId: booking.id,
        artistId: user.id,
        clientId: clientUser.id,
        packageDetails: packageDetails || serviceType || 'Custom Package',
        totalAmount: totalAmount,
        depositAmount: depositAmount,
        depositPaidAt: depositPaid ? new Date() : undefined,
        remainingAmount: remainingAmount,
        status: 'signed',
        signedAt: new Date(),
        fileUrl: contractFileUrl,
      });
      
      // Create conversation with descriptive title
      const eventDateObj = parsedEventDate;
      const dateStr = eventDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const conversationTitle = `${clientFirstName} ${clientLastName} - ${dateStr}`;
      const conversation = await storage.createConversation({
        bookingId: booking.id,
        title: conversationTitle,
      });
      
      // Add Violet (vendor) to conversation
      await storage.addParticipantToConversation(conversation.id, user.id);
      await storage.addParticipantToConversation(conversation.id, clientUser.id);
      if (plannerUser) {
        await storage.addParticipantToConversation(conversation.id, plannerUser.id);
      }
      
      // Block the booking date on Violet's calendar (unavailable)
      await storage.setAvailability({
        userId: user.id,
        date: eventDateObj,
        isAvailable: false,
      });
      
      // Generate invitation tokens
      const clientToken = randomUUID();
      const clientExpiresAt = new Date();
      clientExpiresAt.setDate(clientExpiresAt.getDate() + 90);
      
      const clientInvitation = await storage.createInvitation({
        token: clientToken,
        email: clientEmail,
        firstName: clientFirstName,
        lastName: clientLastName,
        role: 'client',
        bookingId: booking.id,
        invitedBy: user.id,
        status: 'pending',
        expiresAt: clientExpiresAt,
      });
      
      let plannerInvitation = null;
      if (plannerEmail) {
        const plannerToken = randomUUID();
        const plannerExpiresAt = new Date();
        plannerExpiresAt.setDate(plannerExpiresAt.getDate() + 90);
        
        plannerInvitation = await storage.createInvitation({
          token: plannerToken,
          email: plannerEmail,
          firstName: plannerFirstName,
          lastName: plannerLastName,
          role: 'planner',
          bookingId: booking.id,
          invitedBy: user.id,
          status: 'pending',
          expiresAt: plannerExpiresAt,
        });
      }
      
      res.json({
        booking,
        contract,
        conversation,
        clientInvitation,
        plannerInvitation,
        clientInviteLink: `/invite/${clientToken}`,
        plannerInviteLink: plannerInvitation ? `/invite/${plannerInvitation.token}` : null,
      });
    } catch (error: any) {
      console.error('Vendor import booking error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // ========== VENDOR CLIENT CONTACTS ==========
  app.get("/api/vendor/contacts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (!user || (user.role !== 'artist' && user.role !== 'admin')) {
        return res.status(403).json({ error: "Vendor access required" });
      }
      
      const contacts = await storage.getClientContactsByArtist(user.id);
      res.json(contacts);
    } catch (error: any) {
      console.error('Get contacts error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/vendor/contacts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (!user || (user.role !== 'artist' && user.role !== 'admin')) {
        return res.status(403).json({ error: "Vendor access required" });
      }
      
      const { name, email, phone, notes } = req.body;
      
      // Check if contact already exists
      const existing = await storage.getClientContactByEmail(user.id, email);
      if (existing) {
        return res.status(400).json({ error: "A contact with this email already exists" });
      }
      
      const contact = await storage.createClientContact({
        artistId: user.id,
        name,
        email,
        phone,
        notes,
      });
      
      res.json(contact);
    } catch (error: any) {
      console.error('Create contact error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // ========== VENDOR CREATE BOOKING FOR CLIENT ==========
  app.post("/api/vendor/create-booking", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (!user || (user.role !== 'artist' && user.role !== 'admin')) {
        return res.status(403).json({ error: "Vendor access required" });
      }
      
      const { 
        clientName,
        clientEmail,
        clientPhone,
        eventDate,
        eventLocation,
        serviceType,
        amount,
        notes,
      } = req.body;
      
      // Create or get client contact
      let contact = await storage.getClientContactByEmail(user.id, clientEmail);
      if (!contact) {
        contact = await storage.createClientContact({
          artistId: user.id,
          name: clientName,
          email: clientEmail,
          phone: clientPhone,
        });
      }
      
      const parsedEventDate = parseLocalDate(eventDate);
      
      // Create booking with client contact (not user account)
      const booking = await storage.createBooking({
        clientContactId: contact.id,
        artistId: user.id,
        status: 'confirmed',
        eventDate: parsedEventDate,
        location: eventLocation || 'TBD',
        serviceType: serviceType || 'Beauty Services',
        amount: amount ? Math.round(amount * 100) : undefined, // Convert to cents
        notes,
      });
      
      // Block the booking date on vendor's calendar
      await storage.setAvailability({
        userId: user.id,
        date: parsedEventDate,
        isAvailable: false,
      });
      
      res.json({ booking, contact });
    } catch (error: any) {
      console.error('Vendor create booking error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Get vendor's bookings including client contact info
  app.get("/api/vendor/bookings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'artist' && user.role !== 'admin')) {
        return res.status(403).json({ error: "Vendor access required" });
      }
      
      const bookings = await storage.getBookingsByArtist(user.id);
      
      // Enrich with client contact info for contact-based bookings
      const enrichedBookings = await Promise.all(bookings.map(async (booking) => {
        let clientInfo = null;
        
        if (booking.clientContactId) {
          const contact = await storage.getClientContact(booking.clientContactId);
          clientInfo = contact ? {
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            isContact: true,
          } : null;
        } else if (booking.clientId) {
          const client = await storage.getUser(booking.clientId);
          clientInfo = client ? {
            name: `${client.firstName || ''} ${client.lastName || ''}`.trim(),
            email: client.email,
            phone: client.phone,
            isContact: false,
          } : null;
        }
        
        return { ...booking, clientInfo };
      }));
      
      res.json(enrichedBookings);
    } catch (error: any) {
      console.error('Get vendor bookings error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Planner self-service import endpoint
  app.post("/api/planner/import-booking", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'planner' && user.role !== 'admin')) {
        return res.status(403).json({ error: "Planner access required" });
      }
      
      const { 
        clientEmail, 
        clientFirstName, 
        clientLastName,
        vendorEmail,
        vendorFirstName,
        vendorLastName,
        eventDate,
        eventLocation,
        serviceType,
        notes,
        totalAmount,
        depositAmount,
        depositPaid,
      } = req.body;
      
      // Create or get client user
      let clientUser = await storage.getUserByEmail(clientEmail);
      if (!clientUser) {
        clientUser = await storage.upsertUser({
          id: randomUUID(),
          email: clientEmail,
          firstName: clientFirstName,
          lastName: clientLastName,
          role: 'client',
        });
      }
      
      // Create or get vendor user
      let vendorUser = await storage.getUserByEmail(vendorEmail);
      if (!vendorUser) {
        vendorUser = await storage.upsertUser({
          id: randomUUID(),
          email: vendorEmail,
          firstName: vendorFirstName,
          lastName: vendorLastName,
          role: 'artist',
        });
      }
      
      // Create booking
      const booking = await storage.createBooking({
        clientId: clientUser.id,
        artistId: vendorUser.id,
        plannerId: user.id,
        status: 'accepted',
        eventDate: parseLocalDate(eventDate),
        location: eventLocation,
        serviceType: serviceType || 'Bridal Beauty',
        notes,
      });
      
      // Create contract
      const remainingAmount = totalAmount - (depositPaid ? depositAmount : 0);
      const contract = await storage.createContract({
        bookingId: booking.id,
        artistId: vendorUser.id,
        clientId: clientUser.id,
        packageDetails: serviceType || 'Custom Package',
        totalAmount: totalAmount,
        depositAmount: depositAmount,
        depositPaidAt: depositPaid ? new Date() : undefined,
        remainingAmount: remainingAmount,
        status: 'signed',
        signedAt: new Date(),
      });
      
      // Generate invitation tokens
      const clientToken = randomUUID();
      const clientExpiresAt = new Date();
      clientExpiresAt.setDate(clientExpiresAt.getDate() + 90);
      
      const clientInvitation = await storage.createInvitation({
        token: clientToken,
        email: clientEmail,
        firstName: clientFirstName,
        lastName: clientLastName,
        role: 'client',
        bookingId: booking.id,
        invitedBy: user.id,
        status: 'pending',
        expiresAt: clientExpiresAt,
      });
      
      const vendorToken = randomUUID();
      const vendorExpiresAt = new Date();
      vendorExpiresAt.setDate(vendorExpiresAt.getDate() + 90);
      
      const vendorInvitation = await storage.createInvitation({
        token: vendorToken,
        email: vendorEmail,
        firstName: vendorFirstName,
        lastName: vendorLastName,
        role: 'artist',
        bookingId: booking.id,
        invitedBy: user.id,
        status: 'pending',
        expiresAt: vendorExpiresAt,
      });
      
      res.json({
        booking,
        contract,
        clientInvitation,
        vendorInvitation,
        clientInviteLink: `/invite/${clientToken}`,
        vendorInviteLink: `/invite/${vendorToken}`,
      });
    } catch (error: any) {
      console.error('Planner import booking error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // ========== ADMIN ROUTES ==========
  app.get("/api/admin/users", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/admin/bookings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const allBookings = await storage.getAllBookings();
      res.json(allBookings);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/admin/contracts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const allContracts = await storage.getAllContracts();
      const stats = {
        total: allContracts.length,
        byStatus: {
          draft: allContracts.filter(c => c.status === 'draft').length,
          sent: allContracts.filter(c => c.status === 'sent').length,
          signed: allContracts.filter(c => c.status === 'signed').length,
        },
        totalValue: allContracts.reduce((sum, c) => sum + (c.totalAmount || 0), 0),
      };
      res.json(stats);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/admin/payments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const allPayments = await storage.getAllPayments();
      res.json(allPayments);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/admin/support-cases", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const allCases = await storage.getAllSupportCases();
      res.json(allCases);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== VENDOR VERIFICATION (Admin) ==========
  // Get all vendors pending verification
  app.get("/api/admin/vendors/pending", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const pendingVendors = await storage.getPendingVendors();
      res.json(pendingVendors);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Get all vendors with their verification status
  app.get("/api/admin/vendors", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const allVendors = await storage.getAllVendorsWithStatus();
      res.json(allVendors);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Approve a vendor
  app.post("/api/admin/vendors/:userId/approve", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const adminUser = await storage.getUser(getAuthUserId(req));
      if (adminUser?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const profile = await storage.updateArtistProfile(req.params.userId, {
        verificationStatus: 'approved',
        verifiedAt: new Date(),
        verifiedBy: adminUser.id,
        rejectionReason: null,
      });
      
      if (!profile) {
        return res.status(404).json({ error: "Vendor profile not found" });
      }
      
      // Log the action
      await storage.createAuditLog({
        action: 'vendor_approved',
        entityType: 'artist_profile',
        entityId: req.params.userId,
        performedBy: adminUser.id,
        changes: { status: 'approved' },
      });
      
      res.json({ message: "Vendor approved successfully", profile });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Reject a vendor
  app.post("/api/admin/vendors/:userId/reject", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const adminUser = await storage.getUser(getAuthUserId(req));
      if (adminUser?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { reason } = req.body;
      
      const profile = await storage.updateArtistProfile(req.params.userId, {
        verificationStatus: 'rejected',
        verifiedAt: new Date(),
        verifiedBy: adminUser.id,
        rejectionReason: reason || 'Profile did not meet platform standards',
      });
      
      if (!profile) {
        return res.status(404).json({ error: "Vendor profile not found" });
      }
      
      // Log the action
      await storage.createAuditLog({
        action: 'vendor_rejected',
        entityType: 'artist_profile',
        entityId: req.params.userId,
        performedBy: adminUser.id,
        changes: { status: 'rejected', reason },
      });
      
      res.json({ message: "Vendor rejected", profile });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Suspend a vendor (e.g., after reports)
  app.post("/api/admin/vendors/:userId/suspend", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const adminUser = await storage.getUser(getAuthUserId(req));
      if (adminUser?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { reason } = req.body;
      
      const profile = await storage.updateArtistProfile(req.params.userId, {
        verificationStatus: 'suspended',
        rejectionReason: reason || 'Account suspended for policy violation',
      });
      
      if (!profile) {
        return res.status(404).json({ error: "Vendor profile not found" });
      }
      
      // Log the action
      await storage.createAuditLog({
        action: 'vendor_suspended',
        entityType: 'artist_profile',
        entityId: req.params.userId,
        performedBy: adminUser.id,
        changes: { status: 'suspended', reason },
      });
      
      res.json({ message: "Vendor suspended", profile });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== PROFILE REPORTS (Admin) ==========
  // Get all profile reports
  app.get("/api/admin/reports", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const reports = await storage.getAllProfileReports();
      res.json(reports);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Review a profile report
  app.post("/api/admin/reports/:id/review", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const adminUser = await storage.getUser(getAuthUserId(req));
      if (adminUser?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { status, actionTaken } = req.body;
      
      const report = await storage.updateProfileReport(req.params.id, {
        status,
        actionTaken,
        reviewedBy: adminUser.id,
        reviewedAt: new Date(),
      });
      
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      
      res.json({ message: "Report reviewed", report });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Submit a profile report (any authenticated user can report)
  app.post("/api/reports", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const { reportedUserId, reason, description } = req.body;
      
      const report = await storage.createProfileReport({
        reportedUserId,
        reporterId: userId,
        reason,
        description,
        status: 'pending',
      });
      
      res.json({ message: "Report submitted", report });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== Proving Ground Metrics ==========
  app.get("/api/admin/vendor-metrics", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const limit = parseInt(req.query.limit as string) || 10;
      const sinceDays = parseInt(req.query.sinceDays as string) || 14;
      const metrics = await storage.getTopVendorMetrics(limit, sinceDays);
      res.json({ metrics, period: `${sinceDays} days` });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/admin/vendor-metrics/:vendorId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const sinceDays = parseInt(req.query.sinceDays as string) || 14;
      const metrics = await storage.getVendorMetrics(req.params.vendorId, sinceDays);
      res.json({ metrics, period: `${sinceDays} days` });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== CDI (Choreography Depth Index) ==========
  app.get("/api/admin/cdi/scores", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const scores = await storage.getAllCdiScores();
      res.json(scores);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/admin/cdi/events/:userId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const events = await storage.getCdiEventsByUser(req.params.userId);
      res.json(events);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  app.post("/api/admin/cdi/calculate/:userId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const userId = req.params.userId;
      const events = await storage.getCdiEventsByUser(userId);
      const supportCases = await storage.getSupportCasesByUser(userId);
      
      // Calculate CDI score based on events
      let messageSentiment = 0;
      let paymentIssues = 0;
      let supportCasesScore = 0;
      let cancellations = 0;
      let responseDelays = 0;
      
      for (const event of events) {
        switch (event.eventType) {
          case 'message_negative':
            messageSentiment += event.severity;
            break;
          case 'payment_late':
          case 'payment_failed':
            paymentIssues += event.severity;
            break;
          case 'support_case':
          case 'escalation':
            supportCasesScore += event.severity;
            break;
          case 'cancellation_request':
            cancellations += event.severity;
            break;
          case 'response_delay':
            responseDelays += event.severity;
            break;
        }
      }
      
      // Add support cases weight
      supportCasesScore += supportCases.filter(c => c.status !== 'resolved' && c.status !== 'closed').length * 5;
      
      // Calculate total score (0-100)
      const totalScore = Math.min(100, Math.round(
        (messageSentiment * 0.2) +
        (paymentIssues * 0.25) +
        (supportCasesScore * 0.3) +
        (cancellations * 0.15) +
        (responseDelays * 0.1)
      ));
      
      const riskLevel = totalScore >= 70 ? 'critical' : 
                        totalScore >= 50 ? 'high' : 
                        totalScore >= 25 ? 'medium' : 'low';
      
      const score = await storage.createOrUpdateCdiScore({
        userId,
        score: totalScore,
        riskLevel,
        factors: {
          messageSentiment,
          paymentIssues,
          supportCases: supportCasesScore,
          cancellations,
          responseDelays,
        },
      });
      
      res.json(score);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== CDI AI (HACO Framework) ==========
  // Get AI insights for a client
  app.get("/api/admin/cdi/ai/insights/:userId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const insights = await storage.getCdiAiInsightsByUser(req.params.userId);
      res.json(insights);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Get latest AI insight for a client
  app.get("/api/admin/cdi/ai/insights/:userId/latest", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const insight = await storage.getLatestCdiAiInsight(req.params.userId);
      res.json(insight || null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Get threshold policies
  app.get("/api/admin/cdi/thresholds", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const thresholds = await storage.getCdiThresholds();
      res.json(thresholds);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Create threshold policy
  app.post("/api/admin/cdi/thresholds", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const data = insertCdiThresholdSchema.parse({
        ...req.body,
        createdBy: getAuthUserId(req),
      });
      const threshold = await storage.createCdiThreshold(data);
      res.json(threshold);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Update threshold policy
  app.patch("/api/admin/cdi/thresholds/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const threshold = await storage.updateCdiThreshold(req.params.id, req.body);
      if (!threshold) {
        return res.status(404).json({ error: "Threshold not found" });
      }
      res.json(threshold);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Record admin override (for HACO adaptive learning)
  app.post("/api/admin/cdi/overrides", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const data = insertCdiAdminOverrideSchema.parse({
        ...req.body,
        adminId: getAuthUserId(req),
      });
      const override = await storage.createCdiAdminOverride(data);
      
      // Apply adaptive learning
      cdiAgent.applyAdaptiveLearning({
        insightId: override.insightId,
        action: override.overrideDecision,
        originalPrediction: override.originalDecision,
        adminDecision: override.overrideDecision,
        reason: override.reason || undefined,
      }).catch((err: Error) => {
        console.error('Adaptive learning error:', err);
      });
      
      res.json(override);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Get all admin overrides
  app.get("/api/admin/cdi/overrides", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const overrides = await storage.getCdiAdminOverrides();
      res.json(overrides);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Trigger AI analysis for a specific client
  app.post("/api/admin/cdi/ai/analyze/:userId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const userId = req.params.userId;
      const messages = await storage.getMessagesBetweenUsers(userId, ''); // Get all messages for user
      const recentMessages = messages.slice(0, 10); // Last 10 messages
      
      // Analyze recent message patterns
      for (const message of recentMessages) {
        await cdiAgent.analyzeMessage(userId, message.content);
      }
      
      const insight = await storage.getLatestCdiAiInsight(userId);
      res.json(insight || { message: "Analysis complete" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== INVISIBLE LABOR API ==========
  
  // Get invisible labor stats for the current user (vendor/planner)
  app.get("/api/invisible-labor/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'artist' && user.role !== 'planner')) {
        return res.status(403).json({ error: "Only vendors and planners can view labor stats" });
      }
      
      const stats = await storage.getInvisibleLaborStats(userId);
      res.json(stats);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Get recent pivots (admin view)
  app.get("/api/admin/invisible-labor/pivots", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const limit = parseInt(req.query.limit as string) || 50;
      const pivots = await storage.getRecentPivots(limit);
      res.json(pivots);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Get insights for a conversation
  app.get("/api/business-chat/conversations/:id/insights", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const conversation = await storage.getConversation(req.params.id);
      
      if (!conversation || conversation.channelType !== 'business') {
        return res.status(404).json({ error: "Business conversation not found" });
      }
      
      // Verify user is a participant
      const participants = await storage.getConversationParticipants(conversation.id);
      const isParticipant = participants.some(p => p.id === userId) || conversation.ownerId === userId;
      
      if (!isParticipant) {
        return res.status(403).json({ error: "Not a participant of this conversation" });
      }
      
      const insights = await storage.getBusinessChatInsightsByConversation(req.params.id);
      res.json(insights);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== CDI THREE-DIMENSION API ==========
  
  // Get all composite scores with dimension breakdown
  app.get("/api/admin/cdi/composite-scores", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const scores = await storage.getAllCdiCompositeScores();
      res.json(scores);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Get latest composite score for a user
  app.get("/api/admin/cdi/composite-scores/:userId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const score = await storage.getLatestCdiCompositeScore(req.params.userId);
      res.json(score || null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Get dimension scores history for a user
  app.get("/api/admin/cdi/dimension-scores/:userId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const scores = await storage.getCdiDimensionScoresByUser(req.params.userId);
      res.json(scores);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Get behavioral events for a user
  app.get("/api/admin/cdi/behavioral-events/:userId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const events = await storage.getCdiBehavioralEventsByUser(req.params.userId);
      res.json(events);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Trigger three-dimension CDI analysis
  app.post("/api/admin/cdi/analyze-dimensions/:userId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const userId = req.params.userId;
      const targetUser = await storage.getUser(userId);
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message content required" });
      }
      
      // Get dynamic weights from evolutionary learning
      const dynamicWeights = await cdiEngine.getDynamicWeights();
      
      const result = await cdiEngine.analyzeForCDI(userId, message, {
        actorRole: (targetUser?.role as 'client' | 'artist' | 'planner') || 'client',
      }, dynamicWeights);

      // BOUNDARY: AI dimension analysis is annotation, not headline CDI.
      // Per-dimension scores are kept (useful as commentary) but the composite
      // is routed to cdi_ai_insights, NOT cdi_composite_scores. Headline CDI
      // is reserved for behavioral aggregation only.
      await cdiEngine.storeAiInterpretation(userId, result);

      // Store dimension scores (commentary; tagged in evidence so consumers
      // know they came from the AI annotator).
      for (const [dimKey, dimValue] of Object.entries(result.dimensions)) {
        const dimension = dimKey.replace(/([A-Z])/g, '_$1').toLowerCase();
        const dim = dimValue as { score: number; confidence: number; hacoDecision: string; components: any; evidence: any };
        await storage.createCdiDimensionScore({
          userId,
          dimension,
          score: dim.score,
          confidence: dim.confidence,
          hacoDecision: dim.hacoDecision,
          components: dim.components,
          evidencePayload: dim.evidence,
        });
      }

      res.json({
        ...result,
        source: 'ai_annotation',
        boundary: 'AI commentary only. Headline CDI is computed from behavioral events.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Submit feedback for evolutionary learning
  app.post("/api/admin/cdi/feedback", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin' && user?.role !== 'planner') {
        return res.status(403).json({ error: "Admin or planner access required" });
      }
      
      const { compositeScoreId, bookingId, feedbackType, outcomeSuccess, satisfactionScore, dimension, notes, failureReasons } = req.body;
      
      await storage.createCdiFeedbackEvent({
        compositeScoreId,
        bookingId,
        feedbackType,
        feedbackSource: user.role === 'admin' ? 'admin' : 'planner',
        sourceUserId: user.id,
        outcomeSuccess,
        satisfactionScore,
        dimension,
        actualOutcome: {
          success: outcomeSuccess,
          notes: notes || '',
          failureReasons: failureReasons || [],
        },
        learningSignal: outcomeSuccess ? 20 : -20,
      });
      
      res.json({ success: true });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Get learning runs history
  app.get("/api/admin/cdi/learning-runs", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      // For now return empty - would need to add getLearningRuns to storage
      res.json([]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // Template download endpoint (server-side generation to avoid antivirus false positives)
  app.get("/api/template/booking-csv", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const template = `Client First Name,Client Last Name,Client Email,Event Date,Location,Total Amount,Deposit Amount,Planner First Name,Planner Last Name,Planner Email
Sarah,Johnson,sarah@email.com,2026-05-15,The Grand Ballroom,2500,500,Emily,Davis,emily@planner.com
Jessica,Williams,jess@email.com,2026-06-20,Sunset Gardens,3000,600,,,
Maria,Garcia,maria@email.com,March 15 2026,Beach Resort,2800,500,Amy,Chen,amy@events.com`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="briarwood-booking-template.csv"');
      res.send(template);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).json({ error: message });
    }
  });

  // ========== CDI TEST ENDPOINT ==========
  // Test CDI analysis with raw text - useful for analyzing message threads
  app.post("/api/admin/cdi/test-analyze", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      const authorizedAdmins = ['49899480', '50616407'];
      if (user?.role !== 'admin' && !authorizedAdmins.includes(user?.id || '')) {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { messages, actorRole = 'planner' } = req.body;
      
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Messages array required" });
      }
      
      const results = [];
      
      for (const message of messages.slice(0, 20)) { // Limit to 20 messages
        try {
          // Use cdiAgent for quick sentiment analysis
          const agentResult = await cdiAgent.analyzeChatMessage(message, {
            previousMessages: messages.slice(0, messages.indexOf(message)).slice(-3),
          });
          
          // Also get three-dimension analysis
          const engineResult = await cdiEngine.analyzeForCDI('test-user', message, {
            actorRole: actorRole as 'client' | 'artist' | 'planner',
          });
          
          results.push({
            message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
            sentiment: agentResult.sentiment,
            confidenceScore: agentResult.confidenceScore,
            distressSignals: agentResult.distressSignals,
            hacoDecision: agentResult.hacoDecision,
            suggestedAction: agentResult.suggestedAction,
            rawMetrics: agentResult.rawMetrics,
            dimensions: {
              emotionalFidelity: engineResult.dimensions.emotionalFidelity.score,
              choreographyAwareness: engineResult.dimensions.choreographyAwareness.score,
              roleSpecificRecall: engineResult.dimensions.roleSpecificRecall.score,
            },
            compositeScore: engineResult.compositeScore,
            trustLevel: engineResult.trustLevel,
            interventionRecommended: engineResult.interventionRecommended,
          });
        } catch (msgError: any) {
          results.push({
            message: message.substring(0, 100),
            error: msgError.message,
          });
        }
      }
      
      // Calculate summary stats
      const validResults = results.filter(r => !r.error);
      const avgComposite = validResults.reduce((sum, r) => sum + (r.compositeScore || 0), 0) / validResults.length;
      const distressCount = validResults.filter(r => r.sentiment === 'distressed' || r.sentiment === 'negative').length;
      
      res.json({
        summary: {
          totalMessages: messages.length,
          analyzed: results.length,
          averageCompositeScore: Math.round(avgComposite * 100) / 100,
          distressSignalCount: distressCount,
          overallHealth: avgComposite >= 0.7 ? 'healthy' : avgComposite >= 0.5 ? 'moderate' : 'at_risk',
        },
        results,
      });
    } catch (error: any) {
      console.error("[CDI Test] Error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  // ========== IQS (INTERACTION QUALITY SCORING) ROUTES ==========
  
  // Initialize default IQS patterns on first request
  let iqsInitialized = false;
  
  // Get all lead scores for a vendor
  app.get("/api/iqs/lead-scores", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'artist' && user.role !== 'admin')) {
        return res.status(403).json({ error: "Vendor access required" });
      }
      
      // Initialize patterns if not done
      if (!iqsInitialized) {
        await iqsService.initializeDefaultPatterns();
        iqsInitialized = true;
      }
      
      const leadScores = await storage.getIqsLeadScoresByVendor(userId);
      res.json(leadScores);
    } catch (error: any) {
      console.error("[IQS] Error fetching lead scores:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get high-risk warnings for vendor dashboard
  app.get("/api/iqs/warnings", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'artist' && user.role !== 'admin')) {
        return res.status(403).json({ error: "Vendor access required" });
      }
      
      const warnings = await iqsService.getLeadWarningsForVendor(userId);
      res.json(warnings);
    } catch (error: any) {
      console.error("[IQS] Error fetching warnings:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get a specific lead score
  app.get("/api/iqs/lead-scores/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const leadScore = await storage.getIqsLeadScore(id);
      
      if (!leadScore) {
        return res.status(404).json({ error: "Lead score not found" });
      }
      
      // Get interaction events for this lead
      const events = await storage.getIqsInteractionEvents(id);
      
      res.json({ leadScore, events });
    } catch (error: any) {
      console.error("[IQS] Error fetching lead score:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Analyze a lead (create or update score)
  app.post("/api/iqs/analyze", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'artist' && user.role !== 'admin')) {
        return res.status(403).json({ error: "Vendor access required" });
      }
      
      const { clientUserId, clientContactId, bookingId, context } = req.body;
      
      if (!clientUserId && !clientContactId) {
        return res.status(400).json({ error: "Either clientUserId or clientContactId required" });
      }
      
      const leadScore = await iqsService.analyzeAndScoreLead(
        userId,
        clientUserId,
        clientContactId,
        bookingId,
        context
      );
      
      res.json(leadScore);
    } catch (error: any) {
      console.error("[IQS] Error analyzing lead:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Analyze a message for red flags
  app.post("/api/iqs/analyze-message", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'artist' && user.role !== 'admin')) {
        return res.status(403).json({ error: "Vendor access required" });
      }
      
      const { clientUserId, clientContactId, messageContent, bookingId } = req.body;
      
      if (!messageContent) {
        return res.status(400).json({ error: "messageContent required" });
      }
      
      const result = await iqsService.analyzeMessageForRedFlags(
        userId,
        { userId: clientUserId, contactId: clientContactId },
        messageContent,
        bookingId
      );
      
      res.json(result);
    } catch (error: any) {
      console.error("[IQS] Error analyzing message:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Log an interaction event
  app.post("/api/iqs/events", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const { leadScoreId, eventType, details, occurredAt, expectedAt } = req.body;
      
      if (!leadScoreId || !eventType) {
        return res.status(400).json({ error: "leadScoreId and eventType required" });
      }
      
      const event = await iqsService.logInteractionEvent(
        leadScoreId,
        userId,
        eventType,
        details,
        occurredAt ? new Date(occurredAt) : undefined,
        expectedAt ? new Date(expectedAt) : undefined
      );
      
      res.json(event);
    } catch (error: any) {
      console.error("[IQS] Error logging event:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Submit vendor feedback on a lead
  app.post("/api/iqs/feedback", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const { leadScoreId, feedbackType, rating, notes, patternId, eventId, wasAccurate, actualOutcome } = req.body;
      
      if (!leadScoreId || !feedbackType) {
        return res.status(400).json({ error: "leadScoreId and feedbackType required" });
      }
      
      await iqsService.submitVendorFeedback(
        userId,
        leadScoreId,
        feedbackType,
        { rating, notes, patternId, eventId, wasAccurate, actualOutcome }
      );
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("[IQS] Error submitting feedback:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get all active patterns
  app.get("/api/iqs/patterns", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const patterns = await storage.getActiveIqsPatterns();
      res.json(patterns);
    } catch (error: any) {
      console.error("[IQS] Error fetching patterns:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Admin: Trigger learning cycle
  app.post("/api/admin/iqs/learn", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const result = await iqsService.runLearningCycle();
      res.json(result);
    } catch (error: any) {
      console.error("[IQS] Error running learning cycle:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Admin: Get learning run history
  app.get("/api/admin/iqs/learning-runs", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const runs = await storage.getIqsLearningRuns(20);
      res.json(runs);
    } catch (error: any) {
      console.error("[IQS] Error fetching learning runs:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Admin: Update a pattern
  app.patch("/api/admin/iqs/patterns/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(getAuthUserId(req));
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { id } = req.params;
      const updates = req.body;
      
      const updated = await storage.updateIqsPattern(id, updates);
      if (!updated) {
        return res.status(404).json({ error: "Pattern not found" });
      }
      
      res.json(updated);
    } catch (error: any) {
      console.error("[IQS] Error updating pattern:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========== INQUIRIES ==========
  
  // Submit a new inquiry (public - no auth required for prospective clients)
  app.post("/api/inquiries", async (req: Request, res: Response) => {
    try {
      // Convert eventDate string to Date object before validation
      const body = {
        ...req.body,
        eventDate: req.body.eventDate ? new Date(req.body.eventDate) : undefined,
      };
      const data = insertInquirySchema.parse(body);
      
      // Verify vendor exists
      const vendor = await storage.getUser(data.vendorId);
      if (!vendor || vendor.role !== 'artist') {
        return res.status(404).json({ error: "Vendor not found" });
      }
      
      const inquiry = await storage.createInquiry(data);
      
      // Log CDI behavioral event - new inquiry submitted (client initiated contact)
      try {
        // Use inquiry ID as client surrogate (zero-login architecture)
        await cdiEngine.recordBehavioralEvent(
          inquiry.id, // Client surrogate = inquiry ID (created above)
          'client',
          'booking',
          'inquiry_submitted',
          'choreography_awareness',
          25, // Positive signal - client is engaging
          {
            targetUserId: data.vendorId,
            targetRole: 'artist',
            evidenceText: `New inquiry from ${data.clientName} for ${data.serviceType || 'event'}`,
          }
        );
      } catch (cdiError) {
        console.error('[CDI] Error logging new inquiry event:', cdiError);
      }
      
      // Analyze sentiment of client message (async - don't block response)
      if (data.message) {
        analyzeInquirySentiment(inquiry.id, data.message, {
          clientName: data.clientName,
          eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
        }).catch(err => console.error('[Sentiment] Background analysis failed:', err));
      }
      
      // Check auto-responder mode (off, info_sheet, smart, paused)
      const artistProfile = await storage.getArtistProfile(data.vendorId);
      const autoResponderMode = artistProfile?.autoResponderMode || 'off';
      const hasInfoSheet = artistProfile?.infoSheetContent || 
        (artistProfile?.infoSheetType === 'pdf' && artistProfile?.infoSheetPdfUrl);
      
      // Only auto-send info sheet if mode is explicitly 'info_sheet'
      // 'smart' mode means artist reviews each inquiry and decides manually
      const shouldAutoRespond = autoResponderMode === 'info_sheet' && hasInfoSheet;
      
      if (shouldAutoRespond) {
        const vendorName = artistProfile.businessName || vendor.firstName || 'The Vendor';
        const eventDate = data.eventDate 
          ? new Date(data.eventDate).toLocaleDateString('en-US', { 
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            })
          : 'Date TBD';
        
        // Send info sheet email asynchronously
        import('./emailService').then(({ sendInfoSheetEmail }) => {
          sendInfoSheetEmail({
            toEmail: data.clientEmail,
            vendorName,
            vendorEmail: vendor.email || undefined,
            infoSheetContent: artistProfile.infoSheetContent || undefined,
            infoSheetPdfUrl: artistProfile.infoSheetPdfUrl || undefined,
            infoSheetType: (artistProfile.infoSheetType as 'template' | 'custom' | 'pdf') || 'template',
            eventDate,
            serviceType: data.serviceType || 'Beauty Services'
          }).then(async () => {
            // Update inquiry with info sheet sent timestamp and auto_responded status
            await storage.updateInquiry(inquiry.id, { 
              infoSheetSentAt: new Date(),
              status: 'auto_responded',
              statusReason: 'Auto-responded with info sheet',
              firstResponseAt: new Date(),
            } as any);
            // Log notification
            await storage.createInquiryNotification({
              inquiryId: inquiry.id,
              type: 'info_sheet',
              channel: 'email',
              recipientEmail: data.clientEmail,
              subject: `Information from ${vendorName}`,
              content: 'Auto-sent info sheet based on vendor settings',
              status: 'sent',
              sentAt: new Date(),
            });
          }).catch((err: any) => console.error('[Inquiry Info Sheet] Error:', err));
        });
        
        console.log('[Inquiry] Auto-sent info sheet to', data.clientEmail);
      }
      
      // Notify vendor of new inquiry via email
      if (vendor.email) {
        import('./emailService').then(async (emailService) => {
          try {
            const baseUrl = process.env.PUBLIC_BASE_URL || 'https://dateinquiry.com';
            const artistProfile = await storage.getArtistProfile(data.vendorId);
            
            // Actually send the email to the artist
            await emailService.sendInquiryNotificationEmail({
              toEmail: vendor.email!,
              vendorName: vendor.firstName || artistProfile?.businessName || 'Artist',
              clientName: data.clientName,
              clientEmail: data.clientEmail,
              eventDate: data.eventDate ? new Date(data.eventDate).toLocaleDateString('en-US', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
              }) : 'Date TBD',
              eventLocation: data.eventLocation,
              serviceType: data.serviceType,
              inquiryLink: `${baseUrl}/inquiry/${inquiry.threadToken}`,
            });
            
            // Log vendor notification
            await storage.createInquiryNotification({
              inquiryId: inquiry.id,
              type: 'vendor_alert',
              channel: 'email',
              recipientEmail: vendor.email!,
              subject: `New inquiry from ${data.clientName}`,
              content: `Inquiry for ${data.serviceType} on ${data.eventDate}`,
              status: 'sent',
              sentAt: new Date(),
            });
            
            console.log(`[Inquiry] Sent notification email to artist: ${vendor.email}`);
          } catch (err) {
            console.error('[Inquiry] Failed to send artist notification:', err);
          }
        });
      }

      // Headless assistant prompt — record an actionable prompt in the operator's
      // unified queue and deliver it over their preferred channel (SMS/email).
      // Fire-and-forget: never block or fail the inquiry submission. Delivery is
      // OFF by default (operator opts in via assistant preferences), so this does
      // not change existing DateInquiry email behavior.
      import('./assistantService').then(async (assistant) => {
        try {
          // Resolve the referring vendor's name for context, if this lead came
          // through a referral.
          let referralSourceName: string | null = null;
          if (inquiry.referralSourceVendorId) {
            try {
              const refVendor = await storage.getUser(inquiry.referralSourceVendorId);
              const refProfile = await storage.getArtistProfile(inquiry.referralSourceVendorId);
              referralSourceName =
                refProfile?.businessName || refVendor?.firstName || null;
            } catch {
              referralSourceName = null;
            }
          }

          const built = await assistant.buildInquiryAssistantPrompt({
            operatorId: inquiry.vendorId,
            inquiryId: inquiry.id,
            clientName: inquiry.clientName,
            serviceType: inquiry.serviceType,
            eventDate: inquiry.eventDate ? new Date(inquiry.eventDate) : null,
            eventLocation: inquiry.eventLocation,
            partySize: inquiry.partySize,
            message: inquiry.message,
            referralSourceName,
          });

          await assistant.createAssistantPromptAndDeliver({
            operatorId: inquiry.vendorId,
            inquiryId: inquiry.id,
            promptType: 'new_inquiry',
            title: built.title,
            body: built.body,
            recommendedActions: built.recommendedActions,
            metadata: built.metadata,
          });

          // Record score-neutral trust events (availability_checked, fit_evaluated,
          // and route_suggested when a network route exists). Observational only:
          // never auto-routes, never messages the client, never moves CDI.
          await assistant.recordAvailabilityTrustEvents({
            operatorId: inquiry.vendorId,
            inquiryId: inquiry.id,
            built,
          });
        } catch (err) {
          console.error('[Assistant] Failed to create new-inquiry prompt:', err);
        }
      });

      res.json(inquiry);
    } catch (error: any) {
      console.error("[Inquiry] Error creating inquiry:", error);
      res.status(400).json({ error: error.message });
    }
  });
  
  // Get inquiries for a vendor
  // CDI-powered lead routing: prioritizes hot inquiries based on vendor metrics (invisible to vendor)
  app.get("/api/vendor/inquiries", async (req: Request, res: Response) => {
    try {
      // Support token-based auth for calendar component
      const token = req.query.token as string;
      let userId: string;
      
      if (token) {
        const artist = await storage.getArtistProfileByEditToken(token);
        if (!artist) {
          return res.status(401).json({ error: "Invalid token" });
        }
        userId = artist.userId;
      } else {
        userId = getAuthUserId(req);
        if (!userId) {
          return res.status(401).json({ error: "Not authenticated" });
        }
      }
      
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'artist') {
        return res.status(403).json({ error: "Vendor access required" });
      }
      
      const inquiries = await storage.getInquiriesByVendor(userId);
      
      // Get vendor metrics for CDI-powered routing (invisible to vendor)
      const metrics = await storage.getVendorMetrics(userId, 30);
      const isFastResponder = metrics.avgTimeToFirstResponseMinutes !== null && 
                              metrics.avgTimeToFirstResponseMinutes < 120;
      const isHighConverter = metrics.totalInquiries > 0 && 
                              (metrics.confirmSuccessCount / metrics.totalInquiries) > 0.3;
      
      // Calculate lead priority score for each inquiry (CDI-powered, invisible)
      const calculateLeadPriority = (inq: any): number => {
        let priority = 0;
        
        // 1. Status urgency (new/pending inquiries first)
        if (inq.status === 'new' || inq.status === 'pending') priority += 50;
        else if (inq.status === 'responded') priority += 30;
        else if (inq.status === 'hold') priority += 40; // Holds need attention
        
        // 2. Event date urgency (closer dates = hotter leads)
        if (inq.eventDate) {
          const daysUntilEvent = Math.ceil(
            (new Date(inq.eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          if (daysUntilEvent <= 14) priority += 30; // Very urgent
          else if (daysUntilEvent <= 30) priority += 20;
          else if (daysUntilEvent <= 60) priority += 10;
        }
        
        // 3. Lead quality signals
        if (inq.budget && inq.budget > 0) priority += 15; // Budget provided = serious lead
        if (inq.clientPhone) priority += 10; // Phone provided = ready to talk
        if (inq.message && inq.message.length > 50) priority += 5; // Detailed message
        if (inq.partySize && inq.partySize > 5) priority += 10; // Larger party = bigger booking
        
        // 4. SLA urgency (breach flags)
        if (inq.breachFlags && inq.breachFlags.length > 0) priority += 25;
        if (inq.nextActionDueAt) {
          const hoursUntilDue = (new Date(inq.nextActionDueAt).getTime() - Date.now()) / (1000 * 60 * 60);
          if (hoursUntilDue < 2) priority += 20; // SLA due soon
          else if (hoursUntilDue < 6) priority += 10;
        }
        
        // 5. CDI-powered boost for vendors who can handle hot leads
        // Fast responders get hot leads surfaced higher
        if (isFastResponder && priority > 60) priority += 10;
        // High converters get quality leads surfaced higher
        if (isHighConverter && inq.budget && inq.budget > 0) priority += 10;
        
        // 6. Hold expiry urgency
        const holdExpiresAt = inq.hold?.expiresAt || inq.holdExpiresAt;
        if (holdExpiresAt) {
          const hoursUntilExpiry = (new Date(holdExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60);
          if (hoursUntilExpiry > 0 && hoursUntilExpiry < 12) priority += 25; // Expiring soon
          else if (hoursUntilExpiry > 0 && hoursUntilExpiry < 24) priority += 15;
        }
        
        return priority;
      };
      
      // Pre-fetch all bookings and availability for this artist (O(1) instead of O(N) per inquiry)
      const allBookings = await storage.getBookingsByArtist(userId);
      
      // Build a Set of date strings that have confirmed bookings
      const confirmedBookingDates = new Set<string>();
      for (const b of allBookings) {
        if (!b.eventDate) continue;
        if (['confirmed', 'deposit_paid', 'paid'].includes((b.status || '').toLowerCase())) {
          const d = new Date(b.eventDate);
          confirmedBookingDates.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
        }
      }
      
      // Fetch availability records (marked as unavailable/booked) - get all for the year
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      const endOfNextYear = new Date(new Date().getFullYear() + 2, 11, 31);
      const allAvailability = await storage.getAvailability(userId, startOfYear, endOfNextYear);
      
      // Build a Set of date strings where artist marked as booked/unavailable
      const blockedAvailabilityDates = new Set<string>();
      for (const a of allAvailability) {
        if (!a.isAvailable || a.notes === 'BOOKED') {
          const d = new Date(a.date);
          blockedAvailabilityDates.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
        }
      }
      
      // Helper to check if artist is booked on a specific date (uses pre-fetched data)
      const checkDateConflict = (eventDate: Date | string | null): { hasConflict: boolean; conflictSource?: string } => {
        if (!eventDate) return { hasConflict: false };
        
        const dateToCheck = new Date(eventDate);
        const dateKey = `${dateToCheck.getFullYear()}-${String(dateToCheck.getMonth() + 1).padStart(2, '0')}-${String(dateToCheck.getDate()).padStart(2, '0')}`;
        
        if (blockedAvailabilityDates.has(dateKey)) {
          return { hasConflict: true, conflictSource: 'You marked this date as booked in your calendar' };
        }
        
        if (confirmedBookingDates.has(dateKey)) {
          return { hasConflict: true, conflictSource: 'You have a confirmed booking on this date' };
        }
        
        return { hasConflict: false };
      };
      
      // Enrich with owner names, conflict detection, and sort by CDI-powered priority
      const enrichedInquiries = await Promise.all(inquiries.map(async (inq) => {
        let ownerName: string | null = null;
        if (inq.ownerId) {
          const owner = await storage.getUser(inq.ownerId);
          if (owner) {
            ownerName = owner.firstName 
              ? `${owner.firstName}${owner.lastName ? ' ' + owner.lastName : ''}`
              : owner.email || 'Unknown';
          }
        }
        
        // Check for date conflicts (uses pre-fetched data, synchronous)
        const conflictCheck = checkDateConflict(inq.eventDate);
        
        const leadPriority = calculateLeadPriority(inq);
        return { 
          ...inq, 
          ownerName, 
          _priority: leadPriority,
          hasDateConflict: conflictCheck.hasConflict,
          conflictSource: conflictCheck.conflictSource,
        };
      }));
      
      // Sort by priority (highest first), then by createdAt (newest first)
      enrichedInquiries.sort((a, b) => {
        const priorityDiff = (b._priority || 0) - (a._priority || 0);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      // Remove internal priority field before sending (vendors don't see scores)
      const result = enrichedInquiries.map(({ _priority, ...inq }) => inq);
      
      res.json(result);
    } catch (error: any) {
      console.error("[Inquiry] Error fetching vendor inquiries:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get single inquiry
  app.get("/api/inquiries/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const inquiry = await storage.getInquiry(req.params.id);
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      
      // Check access - vendor or admin only
      const userId = getAuthUserId(req);
      const user = await storage.getUser(userId);
      if (inquiry.vendorId !== userId && user?.role !== 'admin') {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Get associated notifications
      const notifications = await storage.getInquiryNotifications(inquiry.id);
      
      res.json({ ...inquiry, notifications });
    } catch (error: any) {
      console.error("[Inquiry] Error fetching inquiry:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update inquiry client info (via threadToken for magic link access)
  app.patch("/api/inquiries/:threadToken", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { threadToken } = req.params;
      const { clientName, clientEmail, clientPhone } = req.body;
      
      const inquiry = await storage.getInquiryByThreadToken(threadToken);
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      
      // Check access - vendor only
      const userId = getAuthUserId(req);
      if (inquiry.vendorId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updateData: Partial<Inquiry> = {};
      if (clientName !== undefined) updateData.clientName = clientName;
      if (clientEmail !== undefined) updateData.clientEmail = clientEmail;
      if (clientPhone !== undefined) updateData.clientPhone = clientPhone;
      
      const updated = await storage.updateInquiry(inquiry.id, updateData);
      res.json(updated);
    } catch (error: any) {
      console.error("[Inquiry] Error updating inquiry:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Trust Timeline for one inquiry — the CDI behavioral events (e.g. an inbound
  // SMS reply that produced a response_received event) connected to this inquiry,
  // shown in the inquiry's own context. Authenticated + vendor/admin only; the
  // threadToken is the artist's admin token, never exposed to clients.
  app.get("/api/inquiries/:threadToken/trust-timeline", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { threadToken } = req.params;
      const inquiry = await storage.getInquiryByThreadToken(threadToken);
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      const userId = getAuthUserId(req);
      const user = await storage.getUser(userId);
      if (inquiry.vendorId !== userId && user?.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }
      const timeline = await storage.getTrustTimeline({ inquiryId: inquiry.id });
      res.json({ timeline });
    } catch (error: any) {
      console.error("[Trust Timeline] Error:", error?.message);
      res.status(500).json({ error: error?.message || "Failed to load trust timeline" });
    }
  });

  // Vendor responds to inquiry (send info sheet manually if not auto-sent)
  app.post("/api/inquiries/:id/respond", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const inquiry = await storage.getInquiry(req.params.id);
      
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      
      if (inquiry.vendorId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Mark as responded
      await storage.updateInquiry(inquiry.id, { status: 'responded' });
      
      // Send info sheet if not already sent
      if (!inquiry.infoSheetSentAt) {
        const vendor = await storage.getUser(userId);
        const artistProfile = await storage.getArtistProfile(userId);
        
        if (artistProfile?.infoSheetContent || artistProfile?.infoSheetPdfUrl) {
          const vendorName = artistProfile.businessName || vendor?.firstName || 'The Vendor';
          const eventDate = inquiry.eventDate 
            ? new Date(inquiry.eventDate).toLocaleDateString('en-US', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
              })
            : 'Date TBD';
          
          import('./emailService').then(({ sendInfoSheetEmail }) => {
            sendInfoSheetEmail({
              toEmail: inquiry.clientEmail,
              vendorName,
              vendorEmail: vendor?.email || undefined,
              infoSheetContent: artistProfile.infoSheetContent || undefined,
              infoSheetPdfUrl: artistProfile.infoSheetPdfUrl || undefined,
              infoSheetType: (artistProfile.infoSheetType as 'template' | 'custom' | 'pdf') || 'template',
              eventDate,
              serviceType: inquiry.serviceType || 'Beauty Services'
            }).then(async () => {
              await storage.updateInquiry(inquiry.id, { infoSheetSentAt: new Date() } as any);
              await storage.createInquiryNotification({
                inquiryId: inquiry.id,
                type: 'info_sheet',
                channel: 'email',
                recipientEmail: inquiry.clientEmail,
                subject: `Information from ${vendorName}`,
                content: 'Info sheet sent by vendor',
                status: 'sent',
                sentAt: new Date(),
              });
            }).catch((err: any) => console.error('[Inquiry Respond] Error:', err));
          });
        }
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Inquiry] Error responding to inquiry:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Send chat invite to client
  app.post("/api/inquiries/:id/chat-invite", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const inquiry = await storage.getInquiry(req.params.id);
      
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      
      if (inquiry.vendorId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Create a chat invite with a signed token
      const token = randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry
      
      const chatInvite = await storage.createChatInvite({
        senderId: userId,
        inviteeEmail: inquiry.clientEmail,
        status: 'pending',
        inquiryId: inquiry.id,
        token,
        expiresAt,
      });
      
      // Update inquiry status
      await storage.updateInquiry(inquiry.id, { 
        status: 'chatting',
        chatInviteSentAt: new Date()
      } as any);
      
      // Build chat link - use production URL
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://briarwood.ai';
      const chatLink = `${baseUrl}/chat-invite/${token}`;
      
      // Get vendor info
      const vendor = await storage.getUser(userId);
      const artistProfile = await storage.getArtistProfile(userId);
      const vendorName = artistProfile?.businessName || vendor?.firstName || 'The Vendor';
      
      const eventDate = inquiry.eventDate 
        ? new Date(inquiry.eventDate).toLocaleDateString('en-US', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
          })
        : undefined;
      
      // Send chat invite email
      import('./emailService').then(({ sendChatInviteEmail }) => {
        sendChatInviteEmail({
          toEmail: inquiry.clientEmail,
          vendorName,
          clientName: inquiry.clientName,
          chatLink,
          eventDate,
          serviceType: inquiry.serviceType || undefined,
          expiresAt,
        }).catch((err: any) => console.error('[Chat Invite Email] Error:', err));
      });
      
      // Log notification
      await storage.createInquiryNotification({
        inquiryId: inquiry.id,
        type: 'chat_invite',
        channel: 'email',
        recipientEmail: inquiry.clientEmail,
        subject: `${vendorName} wants to connect with you`,
        content: `Chat invite link: ${chatLink}`,
        status: 'sent',
        sentAt: new Date(),
        metadata: { chatInviteToken: token },
      });
      
      res.json({ success: true, chatInviteId: chatInvite.id });
    } catch (error: any) {
      console.error("[Inquiry] Error sending chat invite:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Send direct chat invite to client (from artist dashboard)
  app.post("/api/send-client-invite", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const { clientEmail, clientName, clientPhone } = req.body;
      
      if (!clientEmail) {
        return res.status(400).json({ error: "Client email is required" });
      }
      
      // Create a chat invite with a signed token
      const token = randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry
      
      const chatInvite = await storage.createChatInvite({
        senderId: userId,
        inviteeEmail: clientEmail,
        status: 'pending',
        token,
        expiresAt,
      });
      
      // Get vendor info
      const vendor = await storage.getUser(userId);
      const artistProfile = await storage.getArtistProfile(userId);
      const vendorName = artistProfile?.businessName || vendor?.firstName || 'The Vendor';
      
      // Build chat link - use production URL
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://briarwood.ai';
      const chatLink = `${baseUrl}/chat-invite/${token}`;
      
      // Send chat invite email
      import('./emailService').then(({ sendChatInviteEmail }) => {
        sendChatInviteEmail({
          toEmail: clientEmail,
          vendorName,
          clientName: clientName || 'Client',
          chatLink,
          expiresAt,
        }).catch((err: any) => console.error('[Chat Invite Email] Error:', err));
      });
      
      res.json({ 
        success: true, 
        message: `Invite sent to ${clientEmail}`,
        chatInviteId: chatInvite.id 
      });
    } catch (error: any) {
      console.error("[Client Invite] Error sending invite:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Invite additional participant to thread (planner, etc.) - using thread token auth
  app.post("/api/public/inquiry/:threadToken/invite-participant", async (req, res) => {
    try {
      const { threadToken } = req.params;
      const { email, name, role } = req.body; // role: 'planner' | 'client' | 'other'
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const inquiry = await storage.getInquiryByThreadToken(threadToken);
      if (!inquiry) {
        return res.status(404).json({ error: "Thread not found" });
      }
      
      // Create a chat invite for the participant
      const token = randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 day expiry for participants
      
      const chatInvite = await storage.createChatInvite({
        senderId: inquiry.vendorId,
        inviteeEmail: email,
        status: 'pending',
        inquiryId: inquiry.id,
        token,
        expiresAt,
      });
      
      // Get vendor info
      const artistProfile = await storage.getArtistProfile(inquiry.vendorId);
      const vendorName = artistProfile?.businessName || 'The Artist';
      
      // Build chat link
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://briarwood.ai';
      const chatLink = `${baseUrl}/chat-invite/${token}`;
      
      const eventDate = inquiry.eventDate 
        ? new Date(inquiry.eventDate).toLocaleDateString('en-US', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
          })
        : undefined;
      
      // Send invite email
      import('./emailService').then(({ sendChatInviteEmail }) => {
        sendChatInviteEmail({
          toEmail: email,
          vendorName,
          clientName: name || (role === 'planner' ? 'Wedding Planner' : 'Guest'),
          chatLink,
          eventDate,
          expiresAt,
        }).catch((err: any) => console.error('[Participant Invite Email] Error:', err));
      });
      
      // Log notification
      await storage.createInquiryNotification({
        inquiryId: inquiry.id,
        type: 'participant_invite',
        channel: 'email',
        recipientEmail: email,
        subject: `${vendorName} invited you to a conversation`,
        content: `Chat invite for ${inquiry.clientName}'s event`,
        status: 'sent',
        sentAt: new Date(),
        metadata: { chatInviteToken: token, participantRole: role || 'other' },
      });
      
      res.json({ 
        success: true, 
        message: `Invite sent to ${email}`,
        chatLink,
      });
    } catch (error: any) {
      console.error("[Participant Invite] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Quick reply to inquiry (send email to client)
  app.post("/api/inquiries/:id/quick-reply", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const user = await storage.getUser(userId);
      const inquiry = await storage.getInquiry(req.params.id);
      
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      
      if (inquiry.vendorId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { message } = req.body;
      if (!message?.trim()) {
        return res.status(400).json({ error: "Message is required" });
      }
      
      // Get artist profile for name
      const artistProfile = await storage.getArtistProfile(userId);
      const vendorName = artistProfile?.businessName || user?.firstName || 'The Artist';
      
      // Send reply email to client
      import('./emailService').then(({ sendGeneralEmail }) => {
        const emailBody = `Hi ${inquiry.clientName},\n\n${vendorName} has sent you a message about your inquiry:\n\n"${message}"\n\nYou can reply directly to this email to continue the conversation.`;
        
        sendGeneralEmail({
          to: inquiry.clientEmail,
          subject: `Message from ${vendorName} about your inquiry`,
          body: emailBody,
          senderName: vendorName,
        }).catch((err: any) => console.error('[Quick Reply Email] Error:', err));
      });
      
      // Update inquiry with first response timestamp if not set
      const now = new Date();
      const updates: any = {
        lastActionAt: now,
        status: inquiry.status === 'pending' ? 'responded' : inquiry.status,
      };
      if (!inquiry.firstResponseAt) {
        updates.firstResponseAt = now;
      }
      await storage.updateInquiry(inquiry.id, updates);
      
      // Create audit log
      await storage.createAuditLog({
        action: 'quick_reply_sent',
        entityType: 'inquiry',
        entityId: inquiry.id,
        performedBy: userId,
        actorRole: 'artist',
        changes: { 
          message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
          sentAt: now.toISOString(),
        },
      });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Inquiry] Error sending quick reply:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Decline inquiry
  app.post("/api/inquiries/:id/decline", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const user = await storage.getUser(userId);
      const inquiry = await storage.getInquiry(req.params.id);
      
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      
      if (inquiry.vendorId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Enforce valid state transitions - only allow from pending|responded|hold
      const validFromStates = ['pending', 'responded', 'hold'];
      if (!validFromStates.includes(inquiry.status)) {
        return res.status(400).json({ error: `Cannot decline from status: ${inquiry.status}` });
      }
      
      const { reason } = req.body;
      const now = new Date();
      const previousStatus = inquiry.status;
      const previousDeclinedReason = inquiry.declinedReason;
      const actorRole = user?.role === 'artist' ? 'artist' : user?.role === 'planner' ? 'planner' : 'artist';
      
      await storage.updateInquiry(inquiry.id, { 
        status: 'declined',
        declinedReason: reason,
        lastActionAt: now,
      });
      
      // Create audit log with diff
      await storage.createAuditLog({
        action: 'inquiry_declined',
        entityType: 'inquiry',
        entityId: inquiry.id,
        performedBy: userId,
        actorRole: actorRole as any,
        diff: {
          status: { from: previousStatus, to: 'declined' },
          declinedReason: previousDeclinedReason !== reason ? { from: previousDeclinedReason, to: reason } : undefined,
        },
        changes: { 
          declinedAt: now.toISOString(),
          reason: reason || null,
        },
      });
      
      // Log CDI behavioral event - booking outcome (declined)
      try {
        await cdiEngine.recordBehavioralEvent(
          userId,
          'artist',
          'booking',
          'inquiry_declined',
          'role_specific_recall',
          -10, // Neutral signal
          {
            evidenceText: reason || 'Inquiry declined by artist',
          }
        );
      } catch (cdiError) {
        // CDI error shouldn't fail the response
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Inquiry] Error declining inquiry:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Decline inquiry with referrals - decline and automatically create forked inquiries for recommended vendors
  const declineWithReferralsSchema = z.object({
    declineReason: z.string().min(1, "Decline reason is required"),
    referralMessage: z.string().optional(),
    referralVendorIds: z.array(z.string()).min(1, "At least one referral vendor is required").max(5),
    notifyClient: z.boolean().default(true),
  });

  app.post("/api/inquiries/:id/decline-with-referrals", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const user = await storage.getUser(userId);
      const inquiry = await storage.getInquiry(req.params.id);
      
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      
      if (inquiry.vendorId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Enforce valid state transitions - only allow from pending|responded|hold
      const validFromStates = ['pending', 'responded', 'hold'];
      if (!validFromStates.includes(inquiry.status)) {
        return res.status(400).json({ error: `Cannot decline from status: ${inquiry.status}` });
      }
      
      // Validate request body
      const parseResult = declineWithReferralsSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0].message });
      }
      
      const { declineReason, referralMessage, referralVendorIds, notifyClient } = parseResult.data;
      const now = new Date();
      const previousStatus = inquiry.status;
      const actorRole = user?.role === 'artist' ? 'artist' : user?.role === 'planner' ? 'planner' : 'artist';
      
      // Validate referral vendors exist and are active artists
      const referralVendors: Array<{ id: string; name: string; email: string; businessName?: string }> = [];
      for (const vendorId of referralVendorIds) {
        const vendor = await storage.getUser(vendorId);
        if (!vendor || vendor.role !== 'artist') {
          return res.status(400).json({ error: `Invalid referral vendor: ${vendorId}` });
        }
        const vendorProfile = await storage.getArtistProfile(vendorId);
        referralVendors.push({
          id: vendor.id,
          name: `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim() || vendor.email || 'Vendor',
          email: vendor.email || '',
          businessName: vendorProfile?.businessName || undefined,
        });
      }
      
      // Get referrer's info for the client message
      const referrerProfile = await storage.getArtistProfile(userId);
      const referrerName = referrerProfile?.businessName || 
        `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Your vendor';
      
      // Calculate CDI fit scores for referral vendors (for ranking in response)
      const referralSummaries: Array<{
        vendorId: string;
        vendorName: string;
        businessName?: string;
        inquiryId: string;
        fitScore: number;
      }> = [];
      
      // Create forked inquiries for each referral vendor
      for (const vendor of referralVendors) {
        // Calculate fit score for this vendor (with defensive defaults)
        const vendorMetrics = await storage.getVendorMetrics(vendor.id, 30) || {
          vendorId: vendor.id,
          avgTimeToFirstResponseMinutes: null,
          terminalStateUnder24hPercent: 0,
          holdExpiryRate: 50,
          confirmSuccessCount: 0,
          confirmFailedCount: 0,
          totalInquiries: 0,
        };
        let fitScore = 60; // Base score for referrals
        
        if (vendorMetrics.avgTimeToFirstResponseMinutes !== null) {
          if (vendorMetrics.avgTimeToFirstResponseMinutes < 60) fitScore += 30;
          else if (vendorMetrics.avgTimeToFirstResponseMinutes < 120) fitScore += 20;
          else if (vendorMetrics.avgTimeToFirstResponseMinutes < 240) fitScore += 10;
        }
        
        if (vendorMetrics.totalInquiries > 0) {
          const conversionRate = vendorMetrics.confirmSuccessCount / vendorMetrics.totalInquiries;
          if (conversionRate > 0.5) fitScore += 25;
          else if (conversionRate > 0.3) fitScore += 15;
          else if (conversionRate > 0.1) fitScore += 5;
        }
        
        if (vendorMetrics.holdExpiryRate < 10) fitScore += 15;
        else if (vendorMetrics.holdExpiryRate < 25) fitScore += 5;
        
        // Create forked inquiry for this referral vendor
        const forkedInquiry = await storage.createInquiry({
          vendorId: vendor.id,
          clientId: inquiry.clientId,
          clientEmail: inquiry.clientEmail,
          clientName: inquiry.clientName,
          clientPhone: inquiry.clientPhone,
          eventDate: inquiry.eventDate,
          eventType: inquiry.eventType,
          eventLocation: inquiry.eventLocation,
          serviceType: inquiry.serviceType,
          partySize: inquiry.partySize,
          message: referralMessage 
            ? `[Referred by ${referrerName}] ${referralMessage}\n\nOriginal message: ${inquiry.message || ''}`
            : `[Referred by ${referrerName}] ${inquiry.message || ''}`,
          budget: inquiry.budget,
          status: 'pending',
          referralSourceInquiryId: inquiry.id,
          referralSourceVendorId: userId,
          referralSentAt: now,
          metadata: {
            ...inquiry.metadata as any,
            source: 'referral',
            referredBy: userId,
          },
        });
        
        referralSummaries.push({
          vendorId: vendor.id,
          vendorName: vendor.name,
          businessName: vendor.businessName,
          inquiryId: forkedInquiry.id,
          threadToken: forkedInquiry.threadToken,
          clientThreadToken: forkedInquiry.clientThreadToken,
          fitScore,
        });
        
        // Send email notification to receiving artist about the referral
        try {
          const { sendInquiryNotificationEmail } = await import('./emailService');
          const baseUrl = process.env.PUBLIC_BASE_URL || 'https://dateinquiry.com';
          const vendorProfile = await storage.getArtistProfile(vendor.id);
          
          await sendInquiryNotificationEmail({
            toEmail: vendor.email,
            vendorName: vendor.name || vendorProfile?.businessName || 'Artist',
            clientName: inquiry.clientName,
            clientEmail: inquiry.clientEmail,
            eventDate: inquiry.eventDate ? new Date(inquiry.eventDate).toLocaleDateString('en-US', { 
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            }) : 'Date TBD',
            eventLocation: inquiry.eventLocation || undefined,
            serviceType: inquiry.serviceType || undefined,
            inquiryLink: `${baseUrl}/inquiry/${forkedInquiry.threadToken}`,
            isReferral: true,
            referredBy: referrerName,
          });
          
          console.log(`[Referral] Sent notification email to receiving artist: ${vendor.email}`);
        } catch (emailErr: any) {
          console.error('[Referral] Failed to send artist notification:', emailErr);
        }
        
        // Emit CDI event for referral inquiry created
        await storage.createCdiEvent({
          userId: vendor.id,
          eventType: 'referral_inquiry_created',
          bookingId: null,
          eventData: {
            inquiryId: forkedInquiry.id,
            sourceInquiryId: inquiry.id,
            referredBy: userId,
            timestamp: now.toISOString(),
          },
          magnitude: 3, // Positive - receiving referral is good
        });
        
        // Create audit log for forked inquiry
        await storage.createAuditLog({
          action: 'referral_inquiry_created',
          entityType: 'inquiry',
          entityId: forkedInquiry.id,
          performedBy: userId,
          actorRole: actorRole as any,
          changes: {
            sourceInquiryId: inquiry.id,
            referralVendorId: vendor.id,
            referrerVendorId: userId,
            createdAt: now.toISOString(),
          },
        });
      }
      
      // Update original inquiry to declined
      await storage.updateInquiry(inquiry.id, { 
        status: 'declined',
        declinedReason: declineReason,
        statusReason: 'declined_by_vendor',
        lastActionAt: now,
      });
      
      // Create audit log for decline with diff
      await storage.createAuditLog({
        action: 'inquiry_declined_with_referrals',
        entityType: 'inquiry',
        entityId: inquiry.id,
        performedBy: userId,
        actorRole: actorRole as any,
        diff: {
          status: { from: previousStatus, to: 'declined' },
        },
        changes: { 
          declinedAt: now.toISOString(),
          reason: declineReason,
          referralCount: referralVendors.length,
          referralVendorIds: referralVendorIds,
        },
      });
      
      // Emit CDI event for decline
      await storage.createCdiEvent({
        userId: userId,
        eventType: 'declined',
        bookingId: null,
        eventData: {
          inquiryId: inquiry.id,
          reason: declineReason,
          referralsSent: referralVendors.length,
          timestamp: now.toISOString(),
        },
        magnitude: -1, // Slight negative for declining
      });
      
      // Emit CDI event for referrals sent
      await storage.createCdiEvent({
        userId: userId,
        eventType: 'referrals_sent',
        bookingId: null,
        eventData: {
          sourceInquiryId: inquiry.id,
          referralVendorIds: referralVendorIds,
          referralCount: referralVendors.length,
          timestamp: now.toISOString(),
        },
        magnitude: 5, // Positive - sending referrals is valuable collaboration
      });
      
      // Send notification emails if requested
      if (notifyClient) {
        try {
          const { sendReferralNotificationEmail } = await import('./emailService');
          const baseUrl = process.env.PUBLIC_BASE_URL || 'https://dateinquiry.com';
          
          // Build vendor list with thread links and info sheets for clients
          const vendorsWithLinks = await Promise.all(referralSummaries.map(async (r) => {
            const vendorProfile = await storage.getArtistProfile(r.vendorId);
            return {
              name: r.businessName || r.vendorName,
              threadLink: r.clientThreadToken ? `${baseUrl}/thread/${r.clientThreadToken}` : undefined,
              infoSheet: vendorProfile?.infoSheetEnabled && vendorProfile?.infoSheetContent 
                ? vendorProfile.infoSheetContent 
                : undefined,
              infoSheetPdfUrl: vendorProfile?.infoSheetEnabled && vendorProfile?.infoSheetPdfUrl
                ? vendorProfile.infoSheetPdfUrl
                : undefined,
              pricingInfo: vendorProfile?.pricingInfo || undefined,
            };
          }));
          
          await sendReferralNotificationEmail({
            toEmail: inquiry.clientEmail,
            clientName: inquiry.clientName,
            referrerName: referrerName,
            declineReason: declineReason,
            referralMessage: referralMessage,
            referralVendors: vendorsWithLinks,
          }).catch((err: any) => console.error('[Referral Email] Error:', err));
        } catch (emailErr: any) {
          console.error('[Referral Email] Failed to send:', emailErr);
          // Don't fail the whole operation for email errors
        }
      }
      
      // Sort referral summaries by fit score (best first)
      referralSummaries.sort((a, b) => b.fitScore - a.fitScore);
      
      res.json({ 
        success: true,
        declinedInquiryId: inquiry.id,
        referralsCreated: referralSummaries.length,
        referrals: referralSummaries.map(({ fitScore, ...r }) => r), // Remove fitScore from response (invisible)
      });
    } catch (error: any) {
      console.error("[Inquiry] Error declining with referrals:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Hold inquiry - place a tentative hold on a date
  app.post("/api/inquiries/:id/hold", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const user = await storage.getUser(userId);
      const inquiry = await storage.getInquiry(req.params.id);
      
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      
      if (inquiry.vendorId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Enforce valid state transitions
      const validFromStates = ['pending', 'responded'];
      if (!validFromStates.includes(inquiry.status)) {
        return res.status(400).json({ error: `Cannot hold from status: ${inquiry.status}` });
      }
      
      const { reason, expiresInHours = 24 } = req.body;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);
      const holdReason = reason || 'Tentatively reserved';
      
      // Build hold struct (new schema) while maintaining legacy fields
      const holdStruct = {
        placedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        ownerId: userId,
        reason: holdReason,
      };
      
      const previousStatus = inquiry.status;
      
      await storage.updateInquiry(inquiry.id, { 
        status: 'hold',
        ownerId: userId, // Current responsible user
        hold: holdStruct as any, // New consolidated hold struct
        // Legacy fields for backward compatibility
        holdPlacedAt: now,
        holdExpiresAt: expiresAt,
        holdOwnerId: userId,
        holdReason: holdReason,
        lastActionAt: now,
        firstResponseAt: inquiry.firstResponseAt || now,
      } as any);
      
      // Determine actor role
      const actorRole = user?.role === 'artist' ? 'artist' : user?.role === 'planner' ? 'planner' : 'artist';
      
      // Create audit log with standardized action and diff
      await storage.createAuditLog({
        action: 'hold_placed', // Standardized vocabulary
        entityType: 'inquiry',
        entityId: inquiry.id,
        performedBy: userId,
        actorRole: actorRole as any,
        diff: {
          status: { from: previousStatus, to: 'hold' },
          hold: { from: null, to: holdStruct },
        },
        changes: { 
          expiresInHours,
          reason: holdReason,
        },
      });
      
      res.json({ success: true, expiresAt: expiresAt.toISOString() });
    } catch (error: any) {
      console.error("[Inquiry] Error placing hold:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Confirm inquiry - convert to booking and lock date (atomic transaction)
  app.post("/api/inquiries/:id/confirm", isAuthenticated, async (req: Request, res: Response) => {
    const userId = getAuthUserId(req);
    const user = await storage.getUser(userId);
    const inquiry = await storage.getInquiry(req.params.id);
    
    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found" });
    }
    
    if (inquiry.vendorId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    // Enforce valid state transitions - only allow from pending, responded, hold
    const validFromStates = ['pending', 'responded', 'hold'];
    if (!validFromStates.includes(inquiry.status)) {
      return res.status(400).json({ error: `Cannot confirm from status: ${inquiry.status}` });
    }
    
    const { notes, amount } = req.body;
    const now = new Date();
    const previousStatus = inquiry.status;
    const previousHold = inquiry.hold;
    const actorRole = user?.role === 'artist' ? 'artist' : user?.role === 'planner' ? 'planner' : 'artist';
    
    // Best-effort pseudo-transaction: booking first, then inquiry patch
    // If booking fails, hold stays intact. If inquiry patch fails, booking exists but inquiry unchanged.
    let booking: any = null;
    
    try {
      // Create booking first (this is the critical write)
      booking = await storage.createBooking({
        clientId: inquiry.clientId,
        artistId: userId,
        eventDate: inquiry.eventDate,
        location: inquiry.eventLocation || '',
        serviceType: inquiry.serviceType,
        notes: notes || inquiry.message || '',
        amount: amount || null,
        status: 'confirmed',
      });
    } catch (bookingError: any) {
      // Booking failed - hold stays intact, emit confirm_failed
      console.error("[Inquiry] Booking creation failed:", bookingError);
      
      try {
        await storage.createAuditLog({
          action: 'confirm_failed',
          entityType: 'inquiry',
          entityId: inquiry.id,
          performedBy: userId,
          actorRole: actorRole as any,
          diff: {
            status: { from: previousStatus, to: previousStatus }, // No change
          },
          changes: { 
            error: bookingError.message,
            failedAt: 'booking_creation',
            attemptedAt: now.toISOString(),
            holdIntact: true,
          },
        });
      } catch (logError) {
        console.error("[Inquiry] Failed to log confirm_failed event:", logError);
      }
      
      return res.status(500).json({ error: "Failed to create booking" });
    }
    
    try {
      // Patch inquiry with bookingId and status=confirmed
      await storage.updateInquiry(inquiry.id, { 
        status: 'confirmed',
        bookingId: booking.id, // New field for calendar locking
        convertedToBookingId: booking.id, // Legacy field
        ownerId: userId,
        hold: null as any, // Clear hold struct
        holdPlacedAt: null,
        holdExpiresAt: null,
        holdOwnerId: null,
        holdReason: null,
        escalationState: 'none',
        lastActionAt: now,
      } as any);
      
      // Lock the date on calendar (availability record)
      await storage.createAvailability({
        userId,
        date: inquiry.eventDate,
        isAvailable: false,
        notes: `Booked: ${inquiry.clientName}`,
      });
      
      // Audit logs (non-critical, best-effort)
      await storage.createAuditLog({
        action: 'confirm_clicked',
        entityType: 'inquiry',
        entityId: inquiry.id,
        performedBy: userId,
        actorRole: actorRole as any,
        diff: {
          status: { from: previousStatus, to: 'confirmed' },
          bookingId: { from: null, to: booking.id },
          hold: previousHold ? { from: previousHold, to: null } : undefined,
        },
        changes: { 
          confirmedAt: now.toISOString(),
        },
      });
      
      await storage.createAuditLog({
        action: 'booking_created',
        entityType: 'booking',
        entityId: booking.id,
        performedBy: userId,
        actorRole: actorRole as any,
        changes: { 
          fromInquiryId: inquiry.id,
          clientName: inquiry.clientName,
          eventDate: inquiry.eventDate.toISOString(),
        },
      });
      
      res.json({ success: true, bookingId: booking.id });
    } catch (error: any) {
      // Inquiry patch failed after booking was created
      // Log this partial state for manual recovery
      console.error("[Inquiry] Error patching inquiry after booking created:", error);
      
      try {
        await storage.createAuditLog({
          action: 'confirm_failed',
          entityType: 'inquiry',
          entityId: inquiry.id,
          performedBy: userId,
          actorRole: actorRole as any,
          diff: {
            status: { from: previousStatus, to: previousStatus },
          },
          changes: { 
            error: error.message,
            failedAt: 'inquiry_patch',
            bookingCreatedId: booking.id, // Track orphaned booking for cleanup
            attemptedAt: now.toISOString(),
          },
        });
      } catch (logError) {
        console.error("[Inquiry] Failed to log confirm_failed event:", logError);
      }
      
      // Return success with warning since booking exists
      res.status(207).json({ 
        success: true, 
        bookingId: booking.id,
        warning: "Booking created but inquiry status update failed. Please retry or contact support.",
      });
    }
  });

  // Propose alternative dates
  app.post("/api/inquiries/:id/propose", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const user = await storage.getUser(userId);
      const inquiry = await storage.getInquiry(req.params.id);
      
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      
      if (inquiry.vendorId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Enforce valid state transitions
      const validFromStates = ['pending', 'responded', 'hold'];
      if (!validFromStates.includes(inquiry.status)) {
        return res.status(400).json({ error: `Cannot propose dates from status: ${inquiry.status}` });
      }
      
      const { proposedDates, message } = req.body;
      const now = new Date();
      
      if (!proposedDates || !Array.isArray(proposedDates) || proposedDates.length === 0) {
        return res.status(400).json({ error: "Please provide at least one alternative date" });
      }
      
      const previousStatus = inquiry.status;
      const previousProposedDates = inquiry.proposedDates;
      const isFirstResponse = !inquiry.firstResponseAt;
      
      await storage.updateInquiry(inquiry.id, { 
        status: 'responded',
        ownerId: inquiry.clientId, // Ball now in client's court
        proposedDates,
        lastActionAt: now,
        firstResponseAt: inquiry.firstResponseAt || now,
      } as any);
      
      // Determine actor role
      const actorRole = user?.role === 'artist' ? 'artist' : user?.role === 'planner' ? 'planner' : 'artist';
      
      // Log first_response if applicable
      if (isFirstResponse) {
        await storage.createAuditLog({
          action: 'first_response', // Standardized vocabulary
          entityType: 'inquiry',
          entityId: inquiry.id,
          performedBy: userId,
          actorRole: actorRole as any,
          changes: { 
            responseType: 'proposal',
            firstResponseAt: now.toISOString(),
          },
        });
      }
      
      // Create audit log with standardized action
      await storage.createAuditLog({
        action: 'proposal_sent', // Standardized vocabulary
        entityType: 'inquiry',
        entityId: inquiry.id,
        performedBy: userId,
        actorRole: actorRole as any,
        diff: {
          status: { from: previousStatus, to: 'responded' },
          proposedDates: { from: previousProposedDates || [], to: proposedDates },
          ownerId: { from: inquiry.ownerId, to: inquiry.clientId },
        },
        changes: { 
          message,
          dateCount: proposedDates.length,
        },
      });
      
      // Emit owner_transferred event when responsibility shifts to client (only if both are non-null and different)
      if (inquiry.ownerId && inquiry.clientId && inquiry.ownerId !== inquiry.clientId) {
        await storage.createAuditLog({
          action: 'owner_transferred',
          entityType: 'inquiry',
          entityId: inquiry.id,
          performedBy: userId,
          actorRole: actorRole as any,
          diff: {
            ownerId: { from: inquiry.ownerId, to: inquiry.clientId },
          },
          changes: { 
            reason: 'proposal_sent',
            transferredAt: now.toISOString(),
          },
        });
      }
      
      res.json({ success: true, proposedDates });
    } catch (error: any) {
      console.error("[Inquiry] Error proposing dates:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get inquiry timeline/audit trail
  app.get("/api/inquiries/:id/timeline", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      const inquiry = await storage.getInquiry(req.params.id);
      
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      
      if (inquiry.vendorId !== userId && inquiry.clientId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Get audit logs for this inquiry
      const logs = await db.select()
        .from(auditLogs)
        .where(sql`resource_type = 'inquiry' AND resource_id = ${inquiry.id}`)
        .orderBy(desc(auditLogs.createdAt));
      
      // Format events for UI with actorRole properly exposed
      const formattedEvents = logs.map(log => ({
        id: log.id,
        action: log.action,
        performedBy: log.userId,
        actorRole: log.actorRole || (log.metadata as any)?.actorRole || null,
        changes: log.metadata,
        createdAt: log.createdAt,
      }));
      
      // Get owner name for responsibility display
      let ownerName: string | null = null;
      if (inquiry.ownerId) {
        const owner = await storage.getUser(inquiry.ownerId);
        if (owner) {
          ownerName = owner.firstName 
            ? `${owner.firstName}${owner.lastName ? ' ' + owner.lastName : ''}`
            : owner.email || 'Unknown';
        }
      }
      
      // Build timeline with SLA info
      const timeline = {
        receivedAt: inquiry.createdAt,
        firstResponseAt: inquiry.firstResponseAt,
        lastActionAt: inquiry.lastActionAt,
        nextSlaDue: inquiry.nextSlaDue,
        slaBreached: (inquiry as any).slaBreached,
        holdExpiresAt: inquiry.hold?.expiresAt || inquiry.holdExpiresAt,
        ownerId: inquiry.ownerId,
        ownerName,
        events: formattedEvents,
      };
      
      res.json(timeline);
    } catch (error: any) {
      console.error("[Inquiry] Error getting timeline:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========== SCHEDULED EMAILS ==========
  // Create a scheduled email (for invoice scheduling)
  app.post("/api/scheduled-emails", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { emailType, recipientEmail, recipientName, subject, 
              scheduledFor, bookingId, vendorName, amount, description, paymentLink } = req.body;
      
      if (!emailType || !recipientEmail || !recipientName || !scheduledFor) {
        return res.status(400).json({ error: "Missing required fields: emailType, recipientEmail, recipientName, scheduledFor" });
      }
      
      const scheduledEmail = await storage.createScheduledEmail({
        emailType,
        recipientEmail,
        recipientName,
        subject: subject || null,
        scheduledFor: new Date(scheduledFor),
        status: 'pending',
        bookingId: bookingId || null,
        artistId: userId,
        emailData: { vendorName, amount, description, paymentLink },
      });
      
      res.json(scheduledEmail);
    } catch (error: any) {
      console.error("[Scheduled Emails] Error creating:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get user's scheduled emails
  app.get("/api/scheduled-emails", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const scheduledEmails = await storage.getScheduledEmailsByArtist(userId);
      
      res.json(scheduledEmails);
    } catch (error: any) {
      console.error("[Scheduled Emails] Error fetching:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Cancel a scheduled email
  app.delete("/api/scheduled-emails/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const scheduledEmail = await storage.getScheduledEmail(req.params.id);
      if (!scheduledEmail) {
        return res.status(404).json({ error: "Scheduled email not found" });
      }
      
      if (scheduledEmail.artistId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      if (scheduledEmail.status !== 'pending') {
        return res.status(400).json({ error: "Can only cancel pending emails" });
      }
      
      await storage.updateScheduledEmail(req.params.id, { status: 'cancelled' });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Scheduled Emails] Error cancelling:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Resend an invoice email for a booking
  app.post("/api/bookings/:id/resend-invoice", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      if (booking.artistId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Get the payment link from the booking
      const payments = await storage.getPaymentsByBooking(booking.id);
      const pendingPayment = payments.find(p => p.status === 'pending' && p.paymentLinkUrl);
      
      if (!pendingPayment || !pendingPayment.paymentLinkUrl) {
        return res.status(400).json({ error: "No pending payment link found for this booking" });
      }
      
      // Get client info
      let clientEmail = '';
      let clientName = '';
      
      if (booking.clientContactId) {
        const contact = await storage.getClientContact(booking.clientContactId);
        if (contact) {
          clientEmail = contact.email || '';
          clientName = contact.name;
        }
      } else if (booking.clientId) {
        const client = await storage.getUser(booking.clientId);
        if (client) {
          clientEmail = client.email || '';
          clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim();
        }
      }
      
      if (!clientEmail) {
        return res.status(400).json({ error: "No client email found for this booking" });
      }
      
      // Get vendor info
      const vendor = await storage.getUser(userId);
      const artistProfile = await storage.getArtistProfile(userId);
      const vendorName = artistProfile?.businessName || `${vendor?.firstName || ''} ${vendor?.lastName || ''}`.trim() || 'Your Vendor';
      
      // Send the invoice email
      const { sendInvoiceEmail } = await import('./emailService');
      await sendInvoiceEmail({
        toEmail: clientEmail,
        clientName: clientName || 'Client',
        vendorName,
        amount: pendingPayment.amount,
        description: `Payment for ${booking.serviceType || 'services'}`,
        paymentLink: pendingPayment.paymentLinkUrl,
        eventDate: booking.eventDate ? new Date(booking.eventDate).toLocaleDateString('en-US', { 
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        }) : undefined,
      });
      
      res.json({ success: true, message: `Invoice resent to ${clientEmail}` });
    } catch (error: any) {
      console.error("[Resend Invoice] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========== PUBLIC ROUTES (No Auth Required) ==========
  
  // Public quote view - shareable quote page
  app.get("/api/public/quote/:shareToken", async (req, res) => {
    try {
      const { shareToken } = req.params;
      
      const proposal = await storage.getProposalByShareToken(shareToken);
      if (!proposal) {
        return res.status(404).json({ error: "Quote not found" });
      }
      
      // Mark as viewed if first time
      if (!proposal.viewedAt) {
        await storage.updateProposal(proposal.id, { viewedAt: new Date() } as any);
      }
      
      // Get artist info for display
      const artist = await storage.getUser(proposal.artistId);
      const artistProfile = await storage.getArtistProfile(proposal.artistId);
      
      res.json({
        id: proposal.id,
        clientName: proposal.clientName,
        eventDate: proposal.eventDate,
        eventLocation: proposal.eventLocation,
        eventType: proposal.eventType,
        lineItems: proposal.lineItems,
        subtotal: proposal.subtotal,
        travelFee: proposal.travelFee,
        discount: proposal.discount,
        total: proposal.total,
        notes: proposal.notes,
        terms: proposal.terms,
        validUntil: proposal.validUntil,
        status: proposal.status,
        createdAt: proposal.createdAt,
        artist: {
          businessName: artistProfile?.businessName || `${artist?.firstName || ''} ${artist?.lastName || ''}`.trim() || 'Artist',
          email: artist?.email,
          phone: artistProfile?.phone,
          logo: artistProfile?.logoUrl,
        }
      });
    } catch (error: any) {
      console.error("[Public Quote] Error:", error);
      res.status(500).json({ error: "Failed to load quote" });
    }
  });
  
  // Secretary link creation - simplified artist onboarding
  app.post("/api/public/secretary", async (req, res) => {
    try {
      const { businessName, email, instagram, password } = req.body;
      
      if (!businessName || !email) {
        return res.status(400).json({ error: "Business name and email are required" });
      }
      
      if (password && password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      
      // Generate URL-safe slug from business name (no dashes, just letters/numbers)
      function generateSlug(name: string): string {
        let slug = name.toLowerCase().trim();
        slug = slug.replace(/'/g, "").replace(/\s+/g, ""); // Remove spaces entirely
        slug = slug.replace(/[^a-z0-9]/g, ""); // Only letters and numbers
        return slug;
      }
      
      const artistSlug = generateSlug(businessName);
      
      if (!artistSlug) {
        return res.status(400).json({ error: "Could not generate a valid slug from business name" });
      }
      
      // Check if slug already exists
      const existingProfile = await storage.getArtistProfileBySlug(artistSlug);
      if (existingProfile) {
        return res.status(400).json({ error: "This business name is already taken. Please try a different name." });
      }
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      let user;
      
      if (existingUser) {
        // User exists - check if they have an artist profile
        const existingArtistProfile = await storage.getArtistProfile(existingUser.id);
        if (existingArtistProfile) {
          const baseUrl = process.env.PUBLIC_BASE_URL || 'https://dateinquiry.com';
          return res.json({
            success: true,
            secretaryLink: `${baseUrl}/${existingArtistProfile.artistSlug}`,
            artistSlug: existingArtistProfile.artistSlug,
            editToken: existingArtistProfile.editToken,
            baseUrl,
            message: "You already have an account! Here's your existing secretary link."
          });
        }
        // User exists but no artist profile - reuse the existing user
        user = existingUser;
      } else {
        // Create new user with password
        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
        user = await storage.createPublicArtistUser({
          firstName: businessName.split(' ')[0],
          lastName: businessName.split(' ').slice(1).join(' ') || null,
          email,
          role: 'artist',
          password: hashedPassword,
        });
      }
      
      // Generate edit token for settings access
      const editToken = randomUUID();
      
      // Clean instagram handle
      const cleanInstagram = instagram ? instagram.replace('@', '').trim() : null;
      
      // Create artist profile with auto_responder off by default
      await storage.createArtistProfile({
        userId: user.id,
        businessName,
        instagramHandle: cleanInstagram,
        artistSlug,
        verificationStatus: 'approved',
        editToken,
      });
      
      // Track analytics event
      await storage.createAnalyticsEvent({
        eventType: 'secretary_link_created',
        artistId: user.id,
        metadata: { artistSlug, businessName }
      });
      
      // Build the secretary link
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://dateinquiry.com';
      const secretaryLink = `${baseUrl}/${artistSlug}`;
      
      // Send welcome email
      try {
        const { sendArtistWelcomeEmail } = await import('./emailService');
        const settingsUrl = `${baseUrl}/${artistSlug}/settings?token=${editToken}`;
        await sendArtistWelcomeEmail({
          toEmail: email,
          artistName: businessName,
          businessName,
          calendarUrl: secretaryLink,
          settingsUrl
        });
        console.log(`[Secretary] Welcome email sent to ${email}`);
      } catch (emailError) {
        console.error("[Secretary] Failed to send welcome email:", emailError);
      }
      
      res.json({
        success: true,
        secretaryLink,
        artistSlug,
        editToken,
        baseUrl,
        message: "Your secretary link has been created!"
      });
    } catch (error: any) {
      console.error("[Secretary] Error:", error);
      res.status(500).json({ error: error.message || "Failed to create secretary link" });
    }
  });

  // ===== ARTIST LOGIN (Magic Link) =====
  
  // Request login link - sends email with short-lived login token
  app.post("/api/public/artist/request-login", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      const user = await storage.getUserByEmail(normalizedEmail);
      
      // Always return success to prevent email enumeration
      if (!user) {
        console.log(`[Login] No user found for ${normalizedEmail}`);
        return res.json({ success: true });
      }
      
      const profile = await storage.getArtistProfile(user.id);
      if (!profile) {
        console.log(`[Login] No artist profile for user ${user.id}`);
        return res.json({ success: true });
      }
      
      // Generate a short login code (8 chars, alphanumeric)
      const loginCode = randomUUID().replace(/-/g, '').substring(0, 12);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Store in artistProfiles.loginToken field (we'll use editToken for now and add loginCode)
      // For simplicity, we'll encode loginCode:artistSlug in the URL
      await storage.updateArtistProfile(user.id, { 
        loginCode,
        loginCodeExpiresAt: expiresAt
      });
      
      // Send login email
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://dateinquiry.com';
      const loginUrl = `${baseUrl}/access/${loginCode}`;
      
      try {
        const { sendLoginLinkEmail } = await import('./emailService');
        await sendLoginLinkEmail({
          toEmail: normalizedEmail,
          artistName: profile.businessName || 'there',
          loginUrl
        });
        console.log(`[Login] Sent login link to ${normalizedEmail}`);
      } catch (emailError) {
        console.error("[Login] Failed to send email:", emailError);
        return res.status(500).json({ error: "Failed to send email" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Login] Error:", error.message || error);
      console.error("[Login] Stack:", error.stack);
      res.status(500).json({ error: "Something went wrong", details: error.message });
    }
  });
  
  // Verify login code and create session
  app.get("/api/public/artist/login/:code", async (req, res) => {
    try {
      const { code } = req.params;
      
      if (!code || code.length < 8) {
        return res.redirect('/login?error=invalid');
      }
      
      // Find artist by login code
      const profile = await db.query.artistProfiles.findFirst({
        where: eq(artistProfiles.loginCode, code)
      });
      
      if (!profile) {
        console.log(`[Login] Invalid code: ${code}`);
        return res.redirect('/login?error=invalid');
      }
      
      // Check expiration
      if (profile.loginCodeExpiresAt && new Date(profile.loginCodeExpiresAt) < new Date()) {
        console.log(`[Login] Expired code for artist ${profile.artistSlug}`);
        return res.redirect('/login?error=expired');
      }
      
      // Get user for session - auto-create if missing
      let user = await storage.getUser(profile.userId);
      if (!user) {
        console.log(`[Login] No user found for profile ${profile.artistSlug}, checking by edit token lookup`);
        
        // Try to find any user that might own this profile
        const allUsers = await db.select().from(users);
        console.log(`[Login] Found ${allUsers.length} total users in database`);
        
        // If there are no users, we can't log in - need to go through signup
        if (allUsers.length === 0) {
          console.log(`[Login] No users in database, redirecting to signup`);
          return res.redirect('/login?error=no_account');
        }
        
        // Recovery mechanism for profile-user links
        const firstUser = allUsers[0];
        console.log(`[Login] Linking profile ${profile.artistSlug} to user ${firstUser.id} (${firstUser.email})`);
        
        await db.update(artistProfiles)
          .set({ userId: firstUser.id })
          .where(eq(artistProfiles.id, profile.id));
        
        user = firstUser;
      }
      
      // Clear the login code (one-time use)
      await db.update(artistProfiles)
        .set({ loginCode: null, loginCodeExpiresAt: null })
        .where(eq(artistProfiles.id, profile.id));
      
      
      // Create session
      req.session.userId = user.id;
      (req.session as any).artistId = user.id;
      
      console.log(`[Login] Session created for artist ${profile.artistSlug}, userId: ${user.id}`);
      
      // CRITICAL: Save session before redirect so the cookie is set
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error("[Login] Session save error:", err);
            reject(err);
          } else {
            console.log(`[Login] Session saved successfully, redirecting to /admin/${profile.artistSlug}`);
            resolve();
          }
        });
      });
      
      // Redirect to dashboard
      res.redirect(`/admin/${profile.artistSlug}`);
    } catch (error: any) {
      console.error("[Login] Verify error:", error);
      res.redirect('/login?error=error');
    }
  });

  // ===== ARTIST ACCESS RECOVERY =====
  
  // Resend artist dashboard access link
  app.post("/api/public/artist/resend-access", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const user = await storage.getUserByEmail(email.toLowerCase().trim());
      if (!user) {
        // Don't reveal if email exists
        return res.json({ success: true, message: "If we found your account, we've sent you access links." });
      }
      
      const profile = await storage.getArtistProfile(user.id);
      if (!profile) {
        return res.json({ success: true, message: "If we found your account, we've sent you access links." });
      }
      
      // Generate new edit token if needed
      let editToken = profile.editToken;
      if (!editToken) {
        editToken = randomUUID();
        await storage.updateArtistProfile(user.id, { editToken });
      }
      
      // Send access email
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://dateinquiry.com';
      const settingsUrl = `${baseUrl}/${profile.artistSlug}/settings?token=${editToken}`;
      const calendarUrl = `${baseUrl}/${profile.artistSlug}`;
      
      try {
        const { sendArtistWelcomeEmail } = await import('./emailService');
        await sendArtistWelcomeEmail({
          toEmail: email,
          artistName: profile.businessName || 'Artist',
          businessName: profile.businessName || 'Your Business',
          calendarUrl,
          settingsUrl
        });
        console.log(`[AccessRecovery] Sent access email to ${email}`);
      } catch (emailError) {
        console.error("[AccessRecovery] Failed to send email:", emailError);
        return res.status(500).json({ error: "Failed to send email" });
      }
      
      res.json({ success: true, message: "Access link sent to your email!" });
    } catch (error: any) {
      console.error("[AccessRecovery] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Simple admin page to approve profiles
  app.get("/api/admin/approve-page", async (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <head><title>Approve Profile</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 20px; }
      input, button { padding: 10px; margin: 5px 0; width: 100%; font-size: 16px; }
      button { background: #4CAF50; color: white; border: none; cursor: pointer; }
      button:hover { background: #45a049; }
      #result { margin-top: 20px; padding: 15px; border-radius: 5px; }
      .success { background: #d4edda; color: #155724; }
      .error { background: #f8d7da; color: #721c24; }
    </style>
    </head>
    <body>
      <h1>Approve Artist Profile</h1>
      <input type="text" id="slug" placeholder="Artist slug (e.g. themakeupdolls)" value="themakeupdolls">
      <input type="email" id="email" placeholder="Your email (optional)">
      <button onclick="approve()">Approve Profile</button>
      <div id="result"></div>
      <script>
        async function approve() {
          const slug = document.getElementById('slug').value;
          const email = document.getElementById('email').value;
          const result = document.getElementById('result');
          try {
            const resp = await fetch('/api/public/artist/approve-profile', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({artistSlug: slug, email: email || undefined})
            });
            const data = await resp.json();
            if (data.success) {
              result.className = 'success';
              result.innerHTML = '<strong>Success!</strong><br>' + data.message + 
                '<br><br><a href="' + data.loginUrl + '">Go to Login</a>';
            } else {
              result.className = 'error';
              result.innerHTML = '<strong>Error:</strong> ' + (data.error || 'Unknown error');
            }
          } catch(e) {
            result.className = 'error';
            result.innerHTML = '<strong>Error:</strong> ' + e.message;
          }
        }
      </script>
    </body>
    </html>`;
    res.type('html').send(html);
  });

  // Approve a pending artist profile (for recovering hidden profiles)
  app.post("/api/public/artist/approve-profile", async (req, res) => {
    try {
      const { artistSlug, email } = req.body;
      
      if (!artistSlug) {
        return res.status(400).json({ error: "artistSlug is required" });
      }
      
      // Find the profile (even if pending)
      const profile = await storage.getArtistProfileBySlug(artistSlug);
      
      if (!profile) {
        return res.status(404).json({ error: `No profile found with slug "${artistSlug}"` });
      }
      
      // Update to approved status
      const updated = await storage.updateArtistProfile(profile.id, {
        verificationStatus: 'approved',
        onboardingCompleted: true
      });
      
      // If email provided, link user account
      if (email) {
        const user = await storage.getUserByEmail(email.toLowerCase().trim());
        if (user && profile.userId !== user.id) {
          await storage.updateArtistProfile(profile.id, { userId: user.id });
          console.log(`[ApproveProfile] Linked profile ${artistSlug} to user ${user.id}`);
        }
      }
      
      console.log(`[ApproveProfile] Approved profile "${artistSlug}"`);
      
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://dateinquiry.com';
      res.json({ 
        success: true,
        message: `Profile "${artistSlug}" is now approved and visible!`,
        dashboardUrl: `${baseUrl}/admin/${artistSlug}`,
        publicUrl: `${baseUrl}/${artistSlug}`,
        loginUrl: `${baseUrl}/artist-login`
      });
    } catch (error: any) {
      console.error("[ApproveProfile] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Quick profile creation (for rebuilding lost profiles)
  app.post("/api/public/artist/quick-create", async (req, res) => {
    try {
      const { email, businessName, password } = req.body;
      
      if (!email || !businessName) {
        return res.status(400).json({ error: "Email and businessName are required" });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      const artistSlug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Check if profile already exists
      const existingProfile = await storage.getArtistProfileBySlug(artistSlug);
      if (existingProfile) {
        return res.status(409).json({ error: `Profile with slug "${artistSlug}" already exists` });
      }
      
      // Check if user exists, create if not
      let user = await storage.getUserByEmail(normalizedEmail);
      if (!user) {
        // Create user
        const bcrypt = await import('bcryptjs');
        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
        user = await storage.createUser({
          email: normalizedEmail,
          password: hashedPassword,
          role: 'artist',
          firstName: businessName.split(' ')[0],
        });
      } else {
        // Update user role to artist
        await storage.updateUser(user.id, { role: 'artist' });
      }
      
      // Create artist profile
      const editToken = randomUUID();
      const profile = await storage.createArtistProfile({
        userId: user.id,
        businessName: businessName,
        artistSlug: artistSlug,
        editToken: editToken,
        onboardingCompleted: true,
      });
      
      console.log(`[QuickCreate] Created profile "${artistSlug}" for user ${user.id}`);
      
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://dateinquiry.com';
      res.json({ 
        success: true,
        message: `Profile "${businessName}" created successfully!`,
        artistSlug: artistSlug,
        dashboardUrl: `${baseUrl}/admin/${artistSlug}`,
        publicUrl: `${baseUrl}/${artistSlug}`,
        loginUrl: `${baseUrl}/artist-login`
      });
    } catch (error: any) {
      console.error("[QuickCreate] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Search for artist profiles (helps find profiles for linking)
  app.get("/api/public/artist/search", async (req, res) => {
    try {
      const query = (req.query.q as string || '').toLowerCase().trim();
      if (!query || query.length < 2) {
        return res.status(400).json({ error: "Search query must be at least 2 characters" });
      }
      
      const allProfiles = await db.query.artistProfiles.findMany();
      const matches = allProfiles.filter(p => {
        const slug = (p.artistSlug || '').toLowerCase();
        const name = (p.businessName || '').toLowerCase();
        const nameSlug = name.replace(/[^a-z0-9]/g, '');
        const querySlug = query.replace(/[^a-z0-9]/g, '');
        
        return slug.includes(query) || 
               name.includes(query) || 
               nameSlug.includes(querySlug) ||
               slug.includes(querySlug);
      }).slice(0, 10);
      
      res.json({ 
        results: matches.map(p => ({
          id: p.id,
          businessName: p.businessName,
          artistSlug: p.artistSlug,
          hasSlug: !!p.artistSlug
        })),
        count: matches.length
      });
    } catch (error: any) {
      console.error("[ArtistSearch] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Link artist profile to user account (for fixing orphaned profiles)
  app.post("/api/public/artist/link-profile", async (req, res) => {
    try {
      const { email, artistSlug, confirmLink } = req.body;
      
      if (!email || !artistSlug) {
        return res.status(400).json({ error: "Email and artistSlug are required" });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      const normalizedSlug = artistSlug.toLowerCase().trim();
      
      // Find the user by email
      const user = await storage.getUserByEmail(normalizedEmail);
      if (!user) {
        return res.status(404).json({ error: "No user account found with this email. Please create an account first at /artist-login." });
      }
      
      // Find the artist profile by slug (try multiple lookup methods)
      let profile = await storage.getArtistProfileBySlug(normalizedSlug);
      
      // Fallback 1: Try finding by username in users table
      if (!profile) {
        const userByUsername = await storage.getUserByUsername(normalizedSlug);
        if (userByUsername) {
          profile = await storage.getArtistProfile(userByUsername.id);
        }
      }
      
      // Fallback 2: Try finding by business name (case insensitive partial match)
      if (!profile) {
        const allProfiles = await db.query.artistProfiles.findMany();
        const matchingProfile = allProfiles.find(p => {
          const businessNameSlug = p.businessName?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
          const querySlug = normalizedSlug.replace(/[^a-z0-9]/g, '');
          return businessNameSlug === querySlug || businessNameSlug.includes(querySlug) || querySlug.includes(businessNameSlug);
        });
        if (matchingProfile) {
          profile = matchingProfile;
        }
      }
      
      // Fallback 3: Partial match on business name
      if (!profile) {
        const allProfiles = await db.query.artistProfiles.findMany();
        const matchingProfile = allProfiles.find(p => {
          const name = (p.businessName || '').toLowerCase();
          return name.includes(normalizedSlug) || normalizedSlug.includes(name.replace(/[^a-z0-9]/g, ''));
        });
        if (matchingProfile) {
          profile = matchingProfile;
        }
      }
      
      if (!profile) {
        // List any profiles we found for debugging
        const allProfiles = await db.query.artistProfiles.findMany();
        const profileList = allProfiles.slice(0, 5).map(p => p.businessName || p.artistSlug || 'unnamed').join(', ');
        return res.status(404).json({ 
          error: `No artist profile found matching "${artistSlug}".`,
          hint: allProfiles.length > 0 ? `Found ${allProfiles.length} profiles including: ${profileList}` : "No profiles exist in the database."
        });
      }
      
      // Check if profile is already linked to a different user
      if (profile.userId && profile.userId !== user.id) {
        // If not confirming, ask for confirmation
        if (!confirmLink) {
          return res.status(409).json({ 
            error: "This profile is linked to a different account",
            needsConfirmation: true,
            message: `The "${profile.businessName}" profile is currently linked to a different user. Do you want to link it to your account instead?`
          });
        }
      }
      
      // Update the artist profile to link to this user
      await storage.updateArtistProfile(profile.userId, { userId: user.id } as any);
      
      // Also update the user's role to artist if not already
      if (user.role !== 'artist') {
        await storage.updateUser(user.id, { role: 'artist' });
      }
      
      console.log(`[LinkProfile] Linked profile "${profile.artistSlug}" to user ${user.id} (${user.email})`);
      
      res.json({ 
        success: true, 
        message: `Successfully linked "${profile.businessName}" to your account. You can now log in at /artist-login.`,
        artistSlug: profile.artistSlug
      });
    } catch (error: any) {
      console.error("[LinkProfile] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== INQUIRY THREAD ROUTES =====
  
  // Request access to inquiry threads by email (sends magic links to client)
  app.post("/api/public/inquiry/request-access", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Find all inquiries for this email
      const inquiries = await db.query.inquiries.findMany({
        where: eq(inquiries.clientEmail, email.toLowerCase().trim()),
        orderBy: (inquiries, { desc }) => [desc(inquiries.createdAt)],
        limit: 10,
      });
      
      if (inquiries.length === 0) {
        // Don't reveal if email exists or not for privacy
        return res.json({ success: true, message: "If we found any threads, we've sent you access links." });
      }
      
      // Send email with thread access links
      try {
        const { sendClientThreadAccessEmail } = await import('./emailService');
        
        // Get artist info for each inquiry
        const threadsWithArtists = await Promise.all(
          inquiries.map(async (inquiry) => {
            const artist = await storage.getArtistProfile(inquiry.vendorId);
            return {
              threadToken: inquiry.threadToken,
              artistName: artist?.businessName || 'Artist',
              eventDate: inquiry.eventDate,
              status: inquiry.status,
            };
          })
        );
        
        await sendClientThreadAccessEmail({
          toEmail: email,
          clientName: inquiries[0].clientName || 'there',
          threads: threadsWithArtists,
        });
        
        console.log(`[ThreadAccess] Sent access links to ${email} for ${inquiries.length} threads`);
      } catch (emailError) {
        console.error("[ThreadAccess] Failed to send email:", emailError);
      }
      
      res.json({ success: true, message: "If we found any threads, we've sent you access links." });
    } catch (error: any) {
      console.error("[ThreadAccess] Error:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  });
  
  // Get inquiry by thread token (public - for artist viewing inquiry details)
  app.get("/api/public/inquiry/:threadToken", async (req, res) => {
    try {
      const { threadToken } = req.params;
      
      const inquiry = await storage.getInquiryByThreadToken(threadToken);
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      
      const artist = await storage.getArtistProfile(inquiry.vendorId);
      const notifications = await storage.getInquiryNotifications(inquiry.id);
      
      // Check if viewer is the artist (logged in as this artist)
      const viewerUserId = getAuthUserId(req);
      const isArtist = viewerUserId && viewerUserId === inquiry.vendorId;

      // Privileged viewers (the owning vendor OR an admin) may see the Trust
      // Timeline. Admins are not the vendor so isArtist is false for them; this
      // separate flag lets the authenticated timeline section render for them too.
      let canViewTrustTimeline = !!isArtist;
      if (!canViewTrustTimeline && viewerUserId) {
        const viewer = await storage.getUser(viewerUserId);
        if (viewer?.role === "admin") canViewTrustTimeline = true;
      }
      
      // Get messages from notifications
      const notificationMessages = notifications
        .filter(n => ['artist_reply', 'client_reply', 'info_sheet', 'referral_list', 'polite_decline'].includes(n.type))
        .map(n => ({
          id: n.id,
          type: n.type,
          content: n.content || '',
          sentAt: n.sentAt || n.createdAt,
          sentBy: n.type === 'artist_reply' 
            ? (isArtist ? 'You' : artist?.businessName || 'Artist') 
            : n.type === 'client_reply' 
              ? inquiry.clientName 
              : 'System',
        }));
      
      // Also get chat invite messages for this inquiry
      const chatInvites = await storage.getChatInvitesByInquiryId(inquiry.id);
      let chatInviteMessages: any[] = [];
      for (const invite of chatInvites) {
        const inviteMessages = await storage.getChatInviteMessages(invite.id);
        chatInviteMessages = chatInviteMessages.concat(
          inviteMessages.map(m => ({
            id: m.id,
            type: m.senderType === 'client' ? 'client_reply' : m.senderType === 'ai' ? 'ai_reply' : 'artist_reply',
            content: m.content || '',
            sentAt: m.createdAt,
            sentBy: m.senderType === 'client' 
              ? (m.senderName || inquiry.clientName)
              : m.senderType === 'ai'
                ? `${artist?.businessName || 'Artist'} (AI)`
                : (isArtist ? 'You' : artist?.businessName || 'Artist'),
          }))
        );
      }
      
      // Combine and sort all messages by date
      const messages = [...notificationMessages, ...chatInviteMessages]
        .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
      
      // For clients, only send limited data
      const inquiryData = isArtist ? {
        id: inquiry.id,
        threadToken: inquiry.threadToken,
        clientName: inquiry.clientName,
        clientEmail: inquiry.clientEmail,
        clientPhone: inquiry.clientPhone,
        eventDate: inquiry.eventDate,
        eventType: inquiry.eventType,
        eventLocation: inquiry.eventLocation,
        message: inquiry.message,
        status: inquiry.status,
        createdAt: inquiry.createdAt,
        depositPaidAt: (inquiry as any).depositPaidAt,
        infoSheetSentAt: inquiry.infoSheetSentAt,
        // AI sentiment analysis (artist only)
        sentiment: (inquiry as any).sentiment,
        sentimentScore: (inquiry as any).sentimentScore,
        sentimentAnalysis: (inquiry as any).sentimentAnalysis,
      } : {
        id: inquiry.id,
        threadToken: inquiry.threadToken,
        clientName: inquiry.clientName,
        eventDate: inquiry.eventDate,
        eventLocation: inquiry.eventLocation,
        status: inquiry.status,
      };
      
      // For clients, only send public artist info
      const artistData = artist ? (isArtist ? {
        id: artist.id,
        userId: artist.userId,
        businessName: artist.businessName,
        artistSlug: artist.artistSlug,
        squareAccessToken: artist.squareAccessToken ? true : false,
        contractTemplate: artist.contractTemplate ? true : false,
        prettyLinks: artist.prettyLinks,
        onboardingCompleted: artist.onboardingCompleted,
        infoSheetContent: artist.infoSheetContent,
        pricingInfo: (artist as any).pricingInfo,
        politeDeclineTemplate: artist.politeDeclineTemplate,
        referralListTemplate: artist.referralListTemplate,
        plannerInfoSheet: (artist as any).plannerInfoSheet,
        plannerPricing: (artist as any).plannerPricing,
      } : {
        businessName: artist.businessName,
      }) : null;
      
      res.json({
        inquiry: inquiryData,
        artist: artistData,
        messages,
        isArtist,
        canViewTrustTimeline,
      });
    } catch (error: any) {
      console.error("[Inquiry Thread] Error fetching inquiry:", error);
      res.status(500).json({ error: error.message || "Failed to fetch inquiry" });
    }
  });

  // Send message on inquiry thread
  app.post("/api/public/inquiry/:threadToken/message", async (req, res) => {
    try {
      const { threadToken } = req.params;
      const { message, cc } = req.body;
      
      if (!message?.trim()) {
        return res.status(400).json({ error: "Message is required" });
      }
      
      // Parse CC emails
      const ccEmails = Array.isArray(cc) ? cc.filter((e: string) => e && e.includes('@')) : [];
      
      const inquiry = await storage.getInquiryByThreadToken(threadToken);
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      
      // Get artist profile for sender info
      const artist = await storage.getArtistProfile(inquiry.vendorId);
      const artistUser = await storage.getUser(inquiry.vendorId);
      
      // Store the message in notifications
      await storage.createInquiryNotification({
        inquiryId: inquiry.id,
        type: 'artist_reply',
        channel: 'thread',
        recipientEmail: inquiry.clientEmail,
        content: message,
        status: 'pending',
        sentAt: null,
      });
      
      // Update inquiry last action and status
      const now = new Date();
      const updates: any = { lastActionAt: now };
      
      // Mark as responded when artist replies (from pending)
      if (inquiry.status === 'pending') {
        updates.status = 'responded';
      }
      // Set first response time if not already set
      if (!inquiry.firstResponseAt) {
        updates.firstResponseAt = now;
      }
      
      await storage.updateInquiry(inquiry.id, updates);
      
      // Log CDI behavioral event - artist responded to client
      try {
        // Calculate response latency from last client message
        const notifications = await storage.getInquiryNotifications(inquiry.id);
        const lastClientMsg = notifications
          .filter((n: any) => n.type === 'client_reply')
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        
        let responseLatencyMs: number | undefined;
        if (lastClientMsg) {
          responseLatencyMs = Date.now() - new Date(lastClientMsg.createdAt).getTime();
        }
        
        // Artist response is a positive choreography signal
        const signalStrength = responseLatencyMs 
          ? (responseLatencyMs < 3600000 ? 40 : responseLatencyMs < 86400000 ? 25 : 10)
          : 30;
        
        await cdiEngine.recordBehavioralEvent(
          inquiry.vendorId,
          'artist',
          'communication',
          'artist_reply_sent',
          'emotional_fidelity',
          signalStrength,
          {
            responseLatencyMs,
            evidenceText: `Artist sent reply to client inquiry`,
          }
        );
      } catch (cdiError) {
        console.error('[CDI] Error logging artist reply event:', cdiError);
      }
      
      // Actually send the email to the client (use clientThreadToken for client-only access)
      try {
        const { sendThreadReplyEmail } = await import('./emailService');
        const clientThreadLink = `https://dateinquiry.com/thread/${inquiry.clientThreadToken}`;
        
        await sendThreadReplyEmail({
          toEmail: inquiry.clientEmail,
          clientName: inquiry.clientName,
          artistName: artistUser?.firstName || artist?.businessName || 'Your Artist',
          businessName: artist?.businessName || undefined,
          message: message,
          replyLink: clientThreadLink,
          cc: ccEmails
        });
        
        // Update notification status to sent
        console.log(`[Inquiry Thread] Email sent to ${inquiry.clientEmail} for inquiry ${inquiry.id}`);
      } catch (emailError: any) {
        console.error("[Inquiry Thread] Failed to send email:", emailError.message);
        // Continue anyway - message is saved in database
      }
      
      console.log(`[Inquiry Thread] Message saved for ${inquiry.id}`);
      
      res.json({ success: true, message: "Message sent" });
    } catch (error: any) {
      console.error("[Inquiry Thread] Error sending message:", error);
      res.status(500).json({ error: error.message || "Failed to send message" });
    }
  });

  // Inquiry action (accept-client, accept-planner, refer, decline)
  // Note: Thread token acts as bearer token (magic link) - sent only to artist's email
  app.post("/api/public/inquiry/:threadToken/action/:action", async (req, res) => {
    try {
      const { threadToken, action } = req.params;
      
      const inquiry = await storage.getInquiryByThreadToken(threadToken);
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      
      // State transition validation - prevent invalid transitions
      const terminalStates = ['declined', 'completed', 'expired'];
      if (terminalStates.includes(inquiry.status)) {
        return res.status(400).json({ error: `Cannot modify inquiry in ${inquiry.status} state` });
      }
      
      let newStatus = inquiry.status;
      let statusReason = "";
      
      switch (action) {
        case "resend-info-sheet": {
          const artist = await storage.getArtistProfile(inquiry.vendorId);
          const vendor = await storage.getUser(inquiry.vendorId);
          const vendorName = artist?.businessName || vendor?.firstName || 'Your Artist';
          const eventDate = inquiry.eventDate 
            ? new Date(inquiry.eventDate).toLocaleDateString('en-US', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
              })
            : 'Date TBD';
          const baseUrl = process.env.PUBLIC_BASE_URL || 'https://dateinquiry.com';
          const chatLink = `${baseUrl}/thread/${inquiry.clientThreadToken}`;
          
          const { sendInfoSheetEmail } = await import('./emailService');
          const result = await sendInfoSheetEmail({
            toEmail: inquiry.clientEmail,
            vendorName,
            vendorEmail: vendor?.email || undefined,
            infoSheetContent: artist?.infoSheetContent || undefined,
            infoSheetPdfUrl: artist?.infoSheetPdfUrl || undefined,
            infoSheetType: (artist?.infoSheetType as 'template' | 'custom' | 'pdf') || 'template',
            eventDate,
            serviceType: inquiry.serviceType || 'Beauty Services',
            chatLink
          });
          
          if (result.success) {
            await storage.updateInquiry(inquiry.id, { infoSheetSentAt: new Date() } as any);
            return res.json({ success: true, message: 'Info sheet resent successfully' });
          } else {
            return res.status(400).json({ error: result.error || 'Failed to send info sheet' });
          }
        }
        case "accept-client":
          if (inquiry.status !== 'pending') {
            return res.status(400).json({ error: "Can only accept pending inquiries" });
          }
          newStatus = "accepted";
          statusReason = "Accepted as direct client";
          break;
        case "accept-planner":
          if (inquiry.status !== 'pending') {
            return res.status(400).json({ error: "Can only accept pending inquiries" });
          }
          newStatus = "accepted";
          statusReason = "Accepted as planner inquiry";
          break;
        case "refer":
          newStatus = "referred";
          statusReason = "Vendor unavailable - referred";
          break;
        case "decline":
          newStatus = "declined";
          statusReason = "Politely declined";
          break;
        case "deposit":
          if (!['accepted', 'auto_responded'].includes(inquiry.status)) {
            return res.status(400).json({ error: "Can only mark deposit for accepted inquiries" });
          }
          newStatus = "deposit_paid";
          statusReason = "Retainer received";
          break;
        default:
          return res.status(400).json({ error: "Invalid action" });
      }
      
      const updateData: any = {
        status: newStatus,
        statusReason,
        lastActionAt: new Date(),
      };
      
      if (action === 'deposit') {
        updateData.depositPaidAt = new Date();
      }
      
      if (action === 'accept-client' || action === 'accept-planner') {
        // Only set infoSheetSentAt if there's actually content to send
        const artistProfile = await storage.getArtistProfile(inquiry.vendorId);
        const hasInfoSheet = action === 'accept-planner'
          ? !!((artistProfile as any)?.plannerInfoSheet || artistProfile?.infoSheetContent || artistProfile?.infoSheetPdfUrl)
          : !!(artistProfile?.infoSheetContent || artistProfile?.infoSheetPdfUrl);
        
        if (hasInfoSheet) {
          updateData.infoSheetSentAt = new Date();
        }
        updateData.firstResponseAt = updateData.firstResponseAt || new Date();
      }
      
      await storage.updateInquiry(inquiry.id, updateData);
      
      // Record notification for the action taken
      const artist = await storage.getArtistProfile(inquiry.vendorId);
      
      // SEND the info sheet email to the CLIENT (not just record it!)
      if (action === 'accept-client' || action === 'accept-planner') {
        const vendor = await storage.getUser(inquiry.vendorId);
        const vendorName = artist?.businessName || vendor?.firstName || 'Your Artist';
        const eventDate = inquiry.eventDate 
          ? new Date(inquiry.eventDate).toLocaleDateString('en-US', { 
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            })
          : 'Date TBD';
        
        // Build inquiry link for client to respond (use clientThreadToken for client-only access)
        const baseUrl = process.env.PUBLIC_BASE_URL || 'https://dateinquiry.com';
        const chatLink = `${baseUrl}/thread/${inquiry.clientThreadToken}`;
        
        // Determine which content to send based on action type
        const infoContent = action === 'accept-planner' 
          ? ((artist as any)?.plannerInfoSheet || artist?.infoSheetContent)
          : artist?.infoSheetContent;
        
        import('./emailService').then(({ sendInfoSheetEmail }) => {
          sendInfoSheetEmail({
            toEmail: inquiry.clientEmail, // Send to CLIENT
            vendorName,
            vendorEmail: vendor?.email || undefined,
            infoSheetContent: infoContent || undefined,
            infoSheetPdfUrl: artist?.infoSheetPdfUrl || undefined,
            infoSheetType: (artist?.infoSheetType as 'template' | 'custom' | 'pdf') || 'template',
            eventDate,
            serviceType: inquiry.serviceType || 'Beauty Services',
            chatLink
          }).then((result) => {
            if (result.success) {
              console.log(`[Inquiry Action] Info sheet email sent to ${inquiry.clientEmail}`);
            } else {
              console.warn(`[Inquiry Action] Info sheet NOT sent - ${result.error}`);
              // Add a warning message to the thread
              storage.createInquiryMessage({
                inquiryId: inquiry.id,
                senderType: 'system',
                content: 'Note: Your info sheet was not sent because it has no content. Please add your info sheet in Settings.',
                timestamp: new Date(),
              }).catch(e => console.error('[Inquiry Action] Failed to add system message:', e));
            }
          }).catch((err: any) => {
            console.error('[Inquiry Action] Failed to send info sheet email:', err);
          });
        });
      }
      let notificationType = 'status_change';
      let notificationContent = statusReason;
      
      if (action === 'accept-client') {
        notificationType = 'info_sheet';
        notificationContent = artist?.infoSheetContent || 'Info sheet sent';
      } else if (action === 'accept-planner') {
        notificationType = 'info_sheet';
        notificationContent = (artist as any)?.plannerInfoSheet || (artist as any)?.plannerPricing || 'Planner info sent';
      } else if (action === 'refer') {
        notificationType = 'referral_list';
        
        // Fetch Trusted Circle members and build referral content with their links
        const trustedCircle = await storage.getTrustedCircleByReferrer(inquiry.vendorId);
        const baseUrl = process.env.PUBLIC_BASE_URL || 'https://dateinquiry.com';
        
        let referralLinks: string[] = [];
        for (const member of trustedCircle.filter(m => m.status === 'accepted')) {
          // Try to find the artist's profile by email
          const memberUser = await storage.getUserByEmail(member.refereeEmail);
          if (memberUser) {
            const memberProfile = await storage.getArtistProfile(memberUser.id);
            if (memberProfile?.artistSlug) {
              referralLinks.push(`${member.refereeName}: ${baseUrl}/${memberProfile.artistSlug}`);
            } else {
              referralLinks.push(`${member.refereeName} - ${member.refereeEmail}`);
            }
          } else {
            referralLinks.push(`${member.refereeName} - ${member.refereeEmail}`);
          }
        }
        
        const referralListText = referralLinks.length > 0 
          ? referralLinks.join('\n')
          : 'No referrals available at this time.';
        
        notificationContent = artist?.referralListTemplate 
          ? `${artist.referralListTemplate}\n\n${referralListText}`
          : `Thank you so much for reaching out! Unfortunately I am not available for your date. Please contact my trusted colleague for availability:\n\n${referralListText}\n\nThank you!`;
        
        // Send referral email to client
        const vendor = await storage.getUser(inquiry.vendorId);
        const vendorName = artist?.businessName || vendor?.firstName || 'Your Artist';
        
        // Build referral vendors array for email with info sheets
        const referralVendorsForEmail: Array<{ name: string; threadLink?: string; infoSheet?: string; infoSheetPdfUrl?: string; pricingInfo?: string }> = [];
        for (const member of trustedCircle.filter(m => m.status === 'accepted')) {
          const memberUser = await storage.getUserByEmail(member.refereeEmail);
          if (memberUser) {
            const memberProfile = await storage.getArtistProfile(memberUser.id);
            referralVendorsForEmail.push({ 
              name: memberProfile?.businessName || member.refereeName,
              infoSheet: memberProfile?.infoSheetEnabled && memberProfile?.infoSheetContent 
                ? memberProfile.infoSheetContent 
                : undefined,
              infoSheetPdfUrl: memberProfile?.infoSheetEnabled && memberProfile?.infoSheetPdfUrl
                ? memberProfile.infoSheetPdfUrl
                : undefined,
              pricingInfo: memberProfile?.pricingInfo || undefined,
            });
          } else {
            referralVendorsForEmail.push({ name: `${member.refereeName} (${member.refereeEmail})` });
          }
        }
        
        import('./emailService').then(({ sendReferralNotificationEmail }) => {
          sendReferralNotificationEmail({
            toEmail: inquiry.clientEmail,
            clientName: inquiry.clientName,
            referrerName: vendorName,
            declineReason: 'unavailable for your date',
            referralMessage: artist?.referralListTemplate || undefined,
            referralVendors: referralVendorsForEmail,
          }).then(() => {
            console.log(`[Inquiry Action] Referral email sent to ${inquiry.clientEmail}`);
          }).catch((err: any) => {
            console.error('[Inquiry Action] Failed to send referral email:', err);
          });
        });
        
        // CREATE FORKED INQUIRIES for each trusted circle member
        for (const member of trustedCircle.filter(m => m.status === 'accepted')) {
          const memberUser = await storage.getUserByEmail(member.refereeEmail);
          if (memberUser) {
            // Create forked inquiry for this referral vendor
            const forkedInquiry = await storage.createInquiry({
              vendorId: memberUser.id,
              clientId: inquiry.clientId,
              clientEmail: inquiry.clientEmail,
              clientName: inquiry.clientName,
              clientPhone: inquiry.clientPhone,
              eventDate: inquiry.eventDate,
              eventType: inquiry.eventType,
              eventLocation: inquiry.eventLocation,
              serviceType: inquiry.serviceType,
              partySize: inquiry.partySize,
              message: `[Referral from ${vendorName}] ${inquiry.message || ''}`,
              budget: inquiry.budget,
              status: 'pending',
              referralSourceInquiryId: inquiry.id,
              referralSourceVendorId: inquiry.vendorId,
              referralSentAt: new Date(),
              metadata: {
                ...inquiry.metadata as any,
                source: 'referral',
                referredBy: inquiry.vendorId,
              },
            });
            
            // Send email notification to the referral artist with direct link to respond
            const threadLink = `${baseUrl}/inquiry/${forkedInquiry.threadToken}`;
            const eventDateFormatted = inquiry.eventDate 
              ? new Date(inquiry.eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) 
              : 'TBD';
            
            import('./emailService').then(async ({ sendEmail }) => {
              try {
                await sendEmail({
                  to: member.refereeEmail,
                  subject: `Referral from ${vendorName}: ${inquiry.clientName} - ${eventDateFormatted}`,
                  html: `
                    <p>Hi ${member.refereeName},</p>
                    <p><strong>${vendorName}</strong> has referred a client to you! Your info has been shared with them.</p>
                    
                    <h3 style="margin-top: 20px;">Client Details:</h3>
                    <ul>
                      <li><strong>Name:</strong> ${inquiry.clientName}</li>
                      <li><strong>Email:</strong> ${inquiry.clientEmail}</li>
                      <li><strong>Event Date:</strong> ${eventDateFormatted}</li>
                      <li><strong>Location:</strong> ${inquiry.eventLocation || 'Not specified'}</li>
                      <li><strong>Service:</strong> ${inquiry.serviceType || 'Beauty Services'}</li>
                    </ul>
                    
                    ${inquiry.message ? `<p><strong>Their message:</strong> ${inquiry.message}</p>` : ''}
                    
                    <p style="margin-top: 20px;"><strong>Ready to send your pricing?</strong></p>
                    <p>
                      <a href="${threadLink}" style="display: inline-block; background-color: #1A1A1A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 10px;">
                        View Inquiry & Send Info Sheet
                      </a>
                    </p>
                    
                    <p style="margin-top: 20px; color: #666; font-size: 12px;">
                      Click the button above to view the full inquiry and send your pricing sheet with one click.
                    </p>
                  `,
                });
                console.log(`[Inquiry Action] Referral notification sent to ${member.refereeEmail}`);
              } catch (err) {
                console.error(`[Inquiry Action] Failed to notify ${member.refereeEmail}:`, err);
              }
            });
            
            console.log(`[Inquiry Action] Created forked inquiry ${forkedInquiry.id} for ${member.refereeName}`);
          }
        }
        
      } else if (action === 'decline') {
        notificationType = 'polite_decline';
        notificationContent = artist?.politeDeclineTemplate || 'Thank you for reaching out. Unfortunately, I am not available for your date.';
      }
      
      try {
        await storage.createInquiryNotification({
          inquiryId: inquiry.id,
          type: notificationType,
          channel: 'thread',
          recipientEmail: inquiry.clientEmail,
          content: notificationContent,
          status: 'sent',
          sentAt: new Date(),
        });
      } catch (e) {
        console.error("[Inquiry Thread] Failed to create notification:", e);
      }
      
      // Log activity
      try {
        await logActivity({
          action: 'inquiry_responded',
          resourceType: 'inquiry',
          resourceId: inquiry.id,
          userId: inquiry.vendorId,
          description: `${action === 'accept-client' ? 'Accepted' : action === 'accept-planner' ? 'Accepted (planner)' : action === 'refer' ? 'Referred' : action === 'decline' ? 'Declined' : 'Responded to'} inquiry from ${inquiry.clientName}`,
          sendEmail: false, // Don't send activity emails for inquiry actions
          metadata: {
            action,
            clientName: inquiry.clientName,
            clientEmail: inquiry.clientEmail,
          },
        });
      } catch (e) {
        console.error("[Inquiry Thread] Activity log error:", e);
      }
      
      // Log CDI behavioral event for inquiry outcome
      try {
        let eventType: string;
        let dimension: 'emotional_fidelity' | 'choreography_awareness' | 'role_specific_recall';
        let signalStrength: number;
        
        switch (action) {
          case 'accept-client':
          case 'accept-planner':
            eventType = 'inquiry_accepted';
            dimension = 'role_specific_recall';
            signalStrength = 50; // Strong positive signal
            break;
          case 'deposit':
            eventType = 'deposit_received';
            dimension = 'role_specific_recall';
            signalStrength = 60; // Very strong positive signal
            break;
          case 'refer':
            eventType = 'inquiry_referred';
            dimension = 'choreography_awareness';
            signalStrength = 20; // Positive coordination signal
            break;
          case 'decline':
            eventType = 'inquiry_declined';
            dimension = 'role_specific_recall';
            signalStrength = -10; // Neutral (valid business decision)
            break;
          default:
            eventType = 'inquiry_action';
            dimension = 'choreography_awareness';
            signalStrength = 10;
        }
        
        await cdiEngine.recordBehavioralEvent(
          inquiry.vendorId,
          'artist',
          'booking',
          eventType,
          dimension,
          signalStrength,
          {
            evidenceText: `${action} action on inquiry from ${inquiry.clientName}`,
          }
        );
      } catch (cdiError) {
        console.error('[CDI] Error logging inquiry action event:', cdiError);
      }
      
      res.json({ success: true, message: `Inquiry ${action} successfully`, status: newStatus });
    } catch (error: any) {
      console.error("[Inquiry Thread] Error processing action:", error);
      res.status(500).json({ error: error.message || "Failed to process action" });
    }
  });

  // Delete inquiry (artist only)
  app.delete("/api/public/inquiry/:threadToken", async (req, res) => {
    try {
      const { threadToken } = req.params;
      
      const inquiry = await storage.getInquiryByThreadToken(threadToken);
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      
      // Delete the inquiry
      await storage.deleteInquiry(inquiry.id);
      
      res.json({ success: true, message: "Inquiry deleted" });
    } catch (error: any) {
      console.error("[Inquiry] Error deleting inquiry:", error);
      res.status(500).json({ error: error.message || "Failed to delete inquiry" });
    }
  });

  // AI-powered contract preparation: reads thread conversation, extracts service items, checks availability
  app.post("/api/public/inquiry/:threadToken/prepare-contract", async (req, res) => {
    try {
      const { threadToken } = req.params;
      
      const inquiry = await storage.getInquiryByThreadToken(threadToken);
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      
      const viewerUserId = getAuthUserId(req);
      if (!viewerUserId || viewerUserId !== inquiry.vendorId) {
        return res.status(403).json({ error: "Only the artist can prepare contracts" });
      }
      
      // 1. Check calendar availability for the event date
      let availabilityStatus = { available: true, conflictReason: null as string | null };
      if (inquiry.eventDate) {
        const queryDate = new Date(inquiry.eventDate);
        const blockedDates = await db
          .select()
          .from(availability)
          .where(eq(availability.userId, inquiry.vendorId));
        
        for (const entry of blockedDates) {
          const entryDate = new Date(entry.date);
          if (entryDate.toDateString() === queryDate.toDateString() && !entry.isAvailable) {
            availabilityStatus = { available: false, conflictReason: "Date is blocked on your calendar" };
            break;
          }
        }
        
        if (availabilityStatus.available) {
          const allInquiries = await db
            .select()
            .from(inquiries)
            .where(eq(inquiries.vendorId, inquiry.vendorId));
          
          const confirmedOnDate = allInquiries.filter((i) => {
            if (!i.eventDate || i.id === inquiry.id) return false;
            const iDate = new Date(i.eventDate).toDateString();
            return iDate === queryDate.toDateString() && ["accepted", "deposit_paid", "confirmed", "contract_sent"].includes(i.status);
          });
          
          if (confirmedOnDate.length > 0) {
            availabilityStatus = { available: false, conflictReason: `You have ${confirmedOnDate.length} other booking(s) on this date` };
          }
        }
      }
      
      // 2. Get all thread messages
      const notifications = await storage.getInquiryNotifications(inquiry.id);
      const threadMessages = notifications
        .filter(n => ['artist_reply', 'client_reply', 'info_sheet'].includes(n.type))
        .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime())
        .map(n => ({
          from: n.type === 'artist_reply' ? 'Artist' : n.type === 'client_reply' ? inquiry.clientName : 'System',
          content: n.content || '',
          date: n.sentAt || n.createdAt,
        }));
      
      // Include original inquiry message
      const conversationText = [
        `ORIGINAL INQUIRY from ${inquiry.clientName} (${inquiry.clientEmail}):\nEvent Date: ${inquiry.eventDate ? new Date(inquiry.eventDate).toLocaleDateString() : 'TBD'}\nLocation: ${inquiry.eventLocation || 'TBD'}\nMessage: ${inquiry.message || 'No message'}`,
        ...threadMessages.map(m => `${m.from}: ${m.content}`)
      ].join('\n\n');
      
      // 3. Get artist's pricing info for context
      const artistProfile = await storage.getArtistProfile(inquiry.vendorId);
      const pricingContext = artistProfile?.pricingInfo || artistProfile?.infoSheetContent || '';
      
      // 4. Use AI to extract contract details from conversation
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
        httpOptions: {
          apiVersion: "",
          baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || "",
        },
      });
      
      const extractionPrompt = `You are a contract preparation assistant for a bridal beauty artist. Read this inquiry thread conversation and extract the agreed-upon services, quantities, and prices.

CONVERSATION:
${conversationText}

${pricingContext ? `ARTIST'S PRICING REFERENCE:\n${pricingContext}\n` : ''}

Extract the contract details into this exact JSON format. Be precise about what was discussed:

{
  "serviceItems": [
    {
      "clientType": "Bride|Bridesmaid|Mother of Bride|Mother of Groom|Flower Girl|Guest|Other",
      "service": "description of service",
      "qty": 1,
      "price": 0.00
    }
  ],
  "travelFee": 0.00,
  "depositAmount": 0.00,
  "eventLocation": "location if mentioned",
  "notes": "any TBD items or notes about the pricing"
}

Rules:
- clientType must be one of: Bride, Bridesmaid, Mother of Bride, Mother of Groom, Flower Girl, Guest, Other
- All prices are in DOLLARS (not cents)
- If deposit wasn't explicitly discussed, set it to 50% of total
- If something is marked TBD, include it with $0 price and note it
- Extract additional artist fees (extra artists, travel) as separate line items with clientType "Other"
- Only include services that were actually discussed/agreed upon in the conversation
- Be accurate to what was said, don't make up prices`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: extractionPrompt,
        config: {
          responseMimeType: "application/json",
        },
      });
      
      let extracted;
      try {
        const responseText = response.text || '';
        extracted = JSON.parse(responseText);
      } catch (parseErr) {
        console.error("[Prepare Contract] AI response parse error:", parseErr);
        return res.status(500).json({ error: "Failed to parse contract details from conversation" });
      }
      
      console.log("[Prepare Contract] Extracted:", JSON.stringify(extracted));
      
      res.json({
        success: true,
        availability: availabilityStatus,
        client: {
          name: inquiry.clientName,
          email: inquiry.clientEmail,
          phone: inquiry.clientPhone,
          eventDate: inquiry.eventDate,
        },
        draft: {
          serviceItems: extracted.serviceItems || [],
          travelFee: extracted.travelFee || 0,
          depositAmount: extracted.depositAmount || 0,
          eventLocation: extracted.eventLocation || inquiry.eventLocation || '',
          notes: extracted.notes || null,
        },
      });
    } catch (error: any) {
      console.error("[Prepare Contract] Error:", error);
      res.status(500).json({ error: error.message || "Failed to prepare contract" });
    }
  });

  // Create contract from inquiry thread (optionally with retainer invoice)
  app.post("/api/public/inquiry/:threadToken/create-contract", async (req, res) => {
    try {
      const { threadToken } = req.params;
      const { packageDetails, totalAmount, depositAmount, eventLocation, sendRetainerInvoice, serviceItems, travelFee, confirmSend } = req.body;

      if (!confirmSend) {
        return res.status(400).json({ error: "Contract send must be explicitly confirmed. Set confirmSend: true to proceed." });
      }
      
      const inquiry = await storage.getInquiryByThreadToken(threadToken);
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      
      const artist = await storage.getArtistProfile(inquiry.vendorId);
      if (!artist) {
        return res.status(404).json({ error: "Artist not found" });
      }

      const artistUser = await storage.getUser(inquiry.vendorId);
      const artistName = artist.businessName || (artistUser?.firstName ? `${artistUser.firstName} ${artistUser.lastName || ""}`.trim() : 'Your Artist');
      
      const signingToken = randomBytes(32).toString('hex');
      const depositAmountNum = parseFloat(depositAmount) || 0;
      const totalAmountNum = parseFloat(totalAmount) || 0;
      const travelFeeCents = travelFee || 0;

      const contractServiceItems = serviceItems && Array.isArray(serviceItems) && serviceItems.length > 0
        ? serviceItems
        : undefined;

      const contractData: any = {
        bookingId: inquiry.bookingId || undefined,
        inquiryId: inquiry.id,
        clientId: inquiry.clientId || inquiry.vendorId,
        artistId: inquiry.vendorId,
        totalAmount: totalAmountNum,
        depositAmount: depositAmountNum,
        status: "pending",
        packageDetails: packageDetails || artist.contractTemplate || "",
        eventLocation: eventLocation || inquiry.eventLocation || "",
        eventDate: inquiry.eventDate,
        eventDates: inquiry.eventDate ? new Date(inquiry.eventDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : undefined,
        clientName: inquiry.clientName,
        clientEmail: inquiry.clientEmail,
        clientContact: inquiry.clientEmail,
        signingToken: signingToken,
        sentForSigningAt: new Date(),
        serviceItems: contractServiceItems,
      };

      const contract = await storage.createContract(contractData);

      const contractForHtml = {
        ...contract,
        serviceItems: contractServiceItems,
        totalAmount: Math.round(totalAmountNum * 100),
        depositAmount: Math.round(depositAmountNum * 100),
        eventLocation: eventLocation || inquiry.eventLocation || '',
        eventDates: inquiry.eventDate ? new Date(inquiry.eventDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'To be determined',
        clientName: inquiry.clientName,
        clientContact: inquiry.clientEmail,
        packageDetails: packageDetails || 'Beauty Services',
      };
      const contractHtml = generateContractHtml(contractForHtml, null, artistName);

      await storage.updateContract(contract.id, { contractHtml });
      
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://dateinquiry.com';
      const signingUrl = `${baseUrl}/sign/${signingToken}`;
      
      let paymentLinkUrl: string | undefined;
      let retainerInvoiceSent = false;
      let retainerError: string | null = null;

      if (sendRetainerInvoice && depositAmountNum > 0) {
        try {
          const { getMerchantSquare } = await import('./squareClient');
          const crypto = await import('crypto');
          
          if (!artist.squareAccessToken) {
            retainerError = "Square account not connected. Please connect Square in Settings first.";
          } else {
            const locationId = process.env.SQUARE_LOCATION_ID;
            if (!locationId) {
              retainerError = "Square location not configured";
            } else {
              const square = getMerchantSquare(artist.squareAccessToken);
              const retainerAmountCents = Math.round(depositAmountNum * 100);
              
              const checkoutResponse = await (square.checkout as any).paymentLinks.create({
                idempotencyKey: crypto.randomUUID(),
                quickPay: {
                  name: `Retainer for ${packageDetails || 'Beauty Services'}`,
                  priceMoney: {
                    amount: BigInt(retainerAmountCents),
                    currency: 'USD',
                  },
                  locationId,
                },
                checkoutOptions: {
                  redirectUrl: `${baseUrl}/payment-success?bookingId=${inquiry.bookingId || inquiry.id}`,
                  askForShippingAddress: false,
                },
              });
              
              const checkoutResult = checkoutResponse as any;
              if (checkoutResult.paymentLink?.url) {
                paymentLinkUrl = checkoutResult.paymentLink.url;
                retainerInvoiceSent = true;
                console.log(`[Contract] Payment link created: ${paymentLinkUrl}`);
                
                if (inquiry.bookingId) {
                  await storage.updateBooking(inquiry.bookingId, {
                    squarePaymentLinkUrl: paymentLinkUrl,
                  });
                }
                
                await storage.createCommunicationLog({
                  artistId: inquiry.vendorId,
                  recipientEmail: inquiry.clientEmail,
                  recipientName: inquiry.clientName,
                  communicationType: 'invoice',
                  subject: `Retainer for ${packageDetails || 'Beauty Services'}`,
                  bookingId: inquiry.bookingId || undefined,
                });
              } else {
                retainerError = "Failed to create Square payment link";
              }
            }
          }
        } catch (invoiceErr: any) {
          console.error('[Contract] Error creating payment link:', invoiceErr);
          retainerError = invoiceErr.message || "Failed to create retainer invoice";
        }
      }
      
      try {
        const { sendContractAndPaymentEmail } = await import('./emailService');
        await sendContractAndPaymentEmail({
          toEmail: inquiry.clientEmail,
          clientName: inquiry.clientName,
          artistName,
          serviceItems: contractServiceItems,
          travelFee: travelFeeCents,
          totalAmount: totalAmountNum,
          depositAmount: depositAmountNum,
          signingUrl,
          paymentUrl: paymentLinkUrl,
          eventDate: inquiry.eventDate ? new Date(inquiry.eventDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : undefined,
          eventLocation: eventLocation || inquiry.eventLocation || undefined,
        });
        console.log(`[Contract] Combined contract+payment email sent to ${inquiry.clientEmail}`);

        if (artistUser?.email) {
          try {
            const { Resend } = await import("resend");
            const resend = new Resend(process.env.RESEND_API_KEY);
            const baseUrl = process.env.PUBLIC_BASE_URL || 'https://briarwood.ai';
            const threadUrl = `${baseUrl}/inquiry/${inquiry.threadToken}`;

            const fmtCurrency = (val: number) => `$${val.toFixed(2)}`;
            const itemRows = contractServiceItems ? contractServiceItems.map((item: any) => 
              `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${item.clientType || ''}</td><td style="padding:8px;border-bottom:1px solid #eee;">${item.service || ''}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.qty || 1}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${fmtCurrency((item.price || 0) / 100)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${fmtCurrency((item.total || 0) / 100)}</td></tr>`
            ).join('') : `<tr><td style="padding:8px;" colspan="5">${packageDetails || 'Services'}</td></tr>`;

            await resend.emails.send({
              from: `Your Secretary <notifications@dateinquiry.com>`,
              to: artistUser.email,
              subject: `Contract Sent to ${inquiry.clientName}`,
              html: `
                <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden;">
                  <div style="background: #FAF7F2; padding: 24px; text-align: center; border-bottom: 1px solid #eee;">
                    <h1 style="font-size: 20px; margin: 0; color: #1a1a1a;">Contract Sent</h1>
                  </div>
                  <div style="padding: 24px;">
                    <p style="margin-bottom: 16px;">Hi ${artistUser.firstName || 'there'},</p>
                    <p style="margin-bottom: 16px;">Your contract has been sent to <strong>${inquiry.clientName}</strong> at ${inquiry.clientEmail}.</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
                      <thead><tr style="background: #f9f7f4;">
                        <th style="padding:8px;text-align:left;">Client</th>
                        <th style="padding:8px;text-align:left;">Service</th>
                        <th style="padding:8px;text-align:center;">Qty</th>
                        <th style="padding:8px;text-align:right;">Price</th>
                        <th style="padding:8px;text-align:right;">Total</th>
                      </tr></thead>
                      <tbody>${itemRows}</tbody>
                      <tfoot>
                        ${travelFeeCents > 0 ? `<tr><td colspan="4" style="padding:8px;border-top:1px solid #ddd;">Travel Fee</td><td style="padding:8px;border-top:1px solid #ddd;text-align:right;">${fmtCurrency(travelFeeCents / 100)}</td></tr>` : ''}
                        <tr style="font-weight:bold;"><td colspan="4" style="padding:8px;border-top:2px solid #333;">Grand Total</td><td style="padding:8px;border-top:2px solid #333;text-align:right;">${fmtCurrency(totalAmountNum)}</td></tr>
                        <tr><td colspan="4" style="padding:8px;color:#666;">Retainer Due</td><td style="padding:8px;text-align:right;color:#666;">${fmtCurrency(depositAmountNum)}</td></tr>
                      </tfoot>
                    </table>
                    ${eventLocation || inquiry.eventLocation ? `<p style="font-size:13px;color:#666;">Location: ${eventLocation || inquiry.eventLocation}</p>` : ''}
                    ${inquiry.eventDate ? `<p style="font-size:13px;color:#666;">Event Date: ${new Date(inquiry.eventDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>` : ''}
                    <div style="text-align:center;margin:24px 0;">
                      <a href="${threadUrl}" style="display:inline-block;padding:12px 28px;background:#1A1A1A;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;">View Thread</a>
                    </div>
                    <p style="font-size:12px;color:#999;text-align:center;">You'll be notified when ${inquiry.clientName} signs.</p>
                  </div>
                </div>
              `,
            });
            console.log(`[Contract] Artist copy sent to ${artistUser.email}`);
          } catch (artistEmailErr) {
            console.error('[Contract] Failed to send artist copy:', artistEmailErr);
          }
        }
      } catch (emailErr) {
        console.error('[Contract] Failed to send email:', emailErr);
      }
      
      await storage.updateInquiry(inquiry.id, {
        status: "contract_sent",
        convertedToContractId: contract.id,
        lastActionAt: new Date(),
      });
      
      let message: string;
      if (sendRetainerInvoice && depositAmountNum > 0 && !retainerInvoiceSent) {
        message = "Contract sent, but retainer invoice failed (Square may not be connected)";
      } else if (retainerInvoiceSent) {
        message = "Contract and retainer invoice sent to client in one email";
      } else {
        message = "Contract sent to client for signing";
      }
      
      res.json({ success: true, contractId: contract.id, retainerInvoiceSent, retainerError, message });
    } catch (error: any) {
      console.error("[Inquiry Thread] Error creating contract:", error);
      res.status(500).json({ error: error.message || "Failed to create contract" });
    }
  });

  // Create invoice from inquiry thread - creates Square payment link and sends email
  app.post("/api/public/inquiry/:threadToken/create-invoice", async (req, res) => {
    try {
      const { threadToken } = req.params;
      const { type, amount, description } = req.body;
      
      const inquiry = await storage.getInquiryByThreadToken(threadToken);
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      
      const artist = await storage.getArtistProfile(inquiry.vendorId);
      if (!artist) {
        return res.status(404).json({ error: "Artist not found" });
      }
      
      // Use the sendPaymentLinkFromAI function to create Square link and send email
      const { sendPaymentLinkFromAI } = await import('./aiChat');
      
      const amountInCents = Math.round((parseFloat(amount) || 0) * 100);
      const invoiceDescription = description || `${type === "deposit" ? "Retainer" : type === "balance" ? "Final Balance" : "Invoice"} for ${inquiry.clientName}`;
      
      const result = await sendPaymentLinkFromAI(inquiry.vendorId, {
        clientName: inquiry.clientName,
        clientEmail: inquiry.clientEmail,
        amount: amountInCents,
        description: invoiceDescription,
        bookingId: inquiry.bookingId || inquiry.id,
      });
      
      if (!result.success) {
        return res.status(400).json({ error: result.error || "Failed to create payment link" });
      }
      
      // Update inquiry status
      await storage.updateInquiry(inquiry.id, {
        status: "invoice_sent",
        lastActionAt: new Date(),
      });
      
      res.json({ success: true, paymentLink: result.paymentLink, message: "Invoice sent successfully" });
    } catch (error: any) {
      console.error("[Inquiry Thread] Error creating invoice:", error);
      res.status(500).json({ error: error.message || "Failed to create invoice" });
    }
  });

  // ========================================
  // CLIENT-FACING ENDPOINTS (limited access)
  // ========================================
  
  // Get inquiry by client token (read-only view for clients)
  app.get("/api/public/inquiry/client/:clientToken", async (req, res) => {
    try {
      const { clientToken } = req.params;
      
      const inquiry = await storage.getInquiryByClientThreadToken(clientToken);
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      
      // Get artist info (limited)
      const artist = await storage.getArtistProfile(inquiry.vendorId);
      
      // Get messages
      const notifications = await storage.getInquiryNotifications(inquiry.id);
      const messages = notifications
        .filter((n: any) => ['artist_reply', 'client_reply', 'info_sheet', 'chat_invite'].includes(n.type))
        .map((n: any) => ({
          id: n.id,
          type: n.type,
          content: n.content,
          sentAt: n.sentAt || n.createdAt,
          sentBy: n.type.includes('client') ? 'client' : 'artist',
          attachments: n.metadata?.attachments || []
        }));
      
      // Return limited client-view data
      res.json({
        inquiry: {
          id: inquiry.id,
          clientName: inquiry.clientName,
          clientEmail: inquiry.clientEmail,
          eventDate: inquiry.eventDate,
          eventType: inquiry.eventType,
          eventLocation: inquiry.eventLocation,
          status: inquiry.status,
        },
        artist: artist ? {
          businessName: artist.businessName,
        } : null,
        messages,
        isClient: true,
      });
    } catch (error: any) {
      console.error("[Client Inquiry] Error fetching inquiry:", error);
      res.status(500).json({ error: error.message || "Failed to fetch inquiry" });
    }
  });
  
  // Client uploads inspiration photo
  app.post("/api/public/inquiry/client/:clientToken/upload", async (req, res) => {
    try {
      const { clientToken } = req.params;
      const { fileContent, fileName, mimeType } = req.body;
      
      if (!fileContent || !fileName) {
        return res.status(400).json({ error: "File content and name are required" });
      }
      
      const inquiry = await storage.getInquiryByClientThreadToken(clientToken);
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      
      const buffer = Buffer.from(fileContent, 'base64');
      
      // Validate actual file content using magic numbers (first bytes)
      // JPEG: FF D8 FF, PNG: 89 50 4E 47, GIF: 47 49 46, WebP: 52 49 46 46 ... 57 45 42 50
      const detectMimeType = (buf: Buffer): string | null => {
        if (buf.length < 12) return null;
        
        // JPEG: starts with FF D8 FF
        if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) {
          return 'image/jpeg';
        }
        // PNG: starts with 89 50 4E 47 0D 0A 1A 0A
        if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
          return 'image/png';
        }
        // GIF: starts with 47 49 46 38 (GIF8)
        if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
          return 'image/gif';
        }
        // WebP: RIFF....WEBP format
        if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
            buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) {
          return 'image/webp';
        }
        return null;
      };
      
      const detectedType = detectMimeType(buffer);
      if (!detectedType) {
        return res.status(400).json({ error: "Only image files are allowed (JPEG, PNG, GIF, WebP)" });
      }
      
      // Limit file size to 10MB
      if (buffer.length > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "File size must be under 10MB" });
      }
      
      // Upload to object storage using detected (verified) MIME type
      const { ObjectStorageService } = await import('./objectStorage');
      const objectService = new ObjectStorageService();
      const timestamp = Date.now();
      const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const objectPath = `inquiries/${inquiry.id}/inspiration/${timestamp}_${safeFileName}`;
      
      const photoUrl = await objectService.uploadBuffer(objectPath, buffer, detectedType);
      
      console.log(`[Client Upload] Photo uploaded for inquiry ${inquiry.id}: ${photoUrl}`);
      
      res.json({ success: true, url: photoUrl });
    } catch (error: any) {
      console.error("[Client Upload] Error:", error);
      res.status(500).json({ error: error.message || "Failed to upload photo" });
    }
  });

  // Client sends a reply message
  app.post("/api/public/inquiry/client/:clientToken/message", async (req, res) => {
    try {
      const { clientToken } = req.params;
      const { message, attachments } = req.body;
      
      if (!message?.trim() && (!attachments || attachments.length === 0)) {
        return res.status(400).json({ error: "Message or attachment is required" });
      }
      
      const inquiry = await storage.getInquiryByClientThreadToken(clientToken);
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      
      // Get artist info for email notification
      const artist = await storage.getArtistProfile(inquiry.vendorId);
      const artistUser = await storage.getUser(inquiry.vendorId);
      
      // Build content with attachment info
      const attachmentUrls = attachments || [];
      const contentWithAttachments = attachmentUrls.length > 0 
        ? `${message || ''}\n\n[${attachmentUrls.length} inspiration photo${attachmentUrls.length > 1 ? 's' : ''} attached]`
        : message;
      
      // Store the message in notifications
      const notification = await storage.createInquiryNotification({
        inquiryId: inquiry.id,
        type: 'client_reply',
        channel: 'thread',
        recipientEmail: artistUser?.email || '',
        content: contentWithAttachments,
        status: 'pending',
        sentAt: null,
        metadata: attachmentUrls.length > 0 ? { attachments: attachmentUrls } : undefined,
      });
      
      // Update inquiry last action
      await storage.updateInquiry(inquiry.id, { lastActionAt: new Date() });
      
      // Log CDI behavioral event - client replied in thread
      try {
        // Calculate response latency from last artist message
        const notifications = await storage.getInquiryNotifications(inquiry.id);
        const lastArtistMsg = notifications
          .filter((n: any) => n.type === 'artist_reply')
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        
        let responseLatencyMs: number | undefined;
        if (lastArtistMsg) {
          responseLatencyMs = Date.now() - new Date(lastArtistMsg.createdAt).getTime();
        }
        
        // Client response signals engagement
        const signalStrength = responseLatencyMs 
          ? (responseLatencyMs < 3600000 ? 35 : responseLatencyMs < 86400000 ? 20 : 10)
          : 25;
        
        // Use inquiry ID as client surrogate (zero-login architecture)
        await cdiEngine.recordBehavioralEvent(
          inquiry.id, // Client surrogate = inquiry ID
          'client',
          'communication',
          'client_reply_sent',
          'choreography_awareness',
          signalStrength,
          {
            targetUserId: inquiry.vendorId,
            targetRole: 'artist',
            responseLatencyMs,
            evidenceText: `Client replied to artist in inquiry thread`,
          }
        );
      } catch (cdiError) {
        console.error('[CDI] Error logging client reply event:', cdiError);
      }
      
      // Send email notification to artist
      try {
        const { sendClientReplyNotification } = await import('./emailService');
        const adminThreadLink = `https://dateinquiry.com/inquiry/${inquiry.threadToken}`;
        
        if (artistUser?.email) {
          await sendClientReplyNotification({
            toEmail: artistUser.email,
            artistName: artistUser.firstName || artist?.businessName || 'Artist',
            clientName: inquiry.clientName,
            message: message,
            threadLink: adminThreadLink
          });
          
          // Update notification status to sent
          await storage.updateInquiryNotification(notification.id, {
            status: 'sent',
            sentAt: new Date()
          });
          
          console.log(`[Client Reply] Email sent to artist ${artistUser.email} for inquiry ${inquiry.id}`);
        }
      } catch (emailError: any) {
        console.error("[Client Reply] Failed to send email:", emailError.message);
        // Update notification with failure
        await storage.updateInquiryNotification(notification.id, {
          status: 'failed'
        });
      }
      
      res.json({ success: true, message: "Message sent" });
    } catch (error: any) {
      console.error("[Client Reply] Error sending message:", error);
      res.status(500).json({ error: error.message || "Failed to send message" });
    }
  });

  // Standalone invoice creation (token-based auth)
  app.post("/api/public/standalone-invoice", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token) {
        return res.status(401).json({ error: "Access token required" });
      }
      
      const profile = await storage.getArtistProfileByEditToken(token as string);
      if (!profile) {
        return res.status(401).json({ error: "Invalid access token" });
      }
      
      const { clientName, clientEmail, amount, description } = req.body;
      
      if (!clientName || !clientEmail || !amount) {
        return res.status(400).json({ error: "Client name, email, and amount are required" });
      }
      
      // Create a payment record without linking to a booking
      const payment = await storage.createPayment({
        bookingId: `standalone-${Date.now()}`,
        amount: parseFloat(amount) || 0,
        type: "custom",
        status: "pending",
        method: "square",
        description: description || `Invoice for ${clientName}`,
      });
      
      // Check if artist has Square connected
      if (profile.squareAccessToken && profile.squareLocationId) {
        // Generate Square checkout link
        const squareService = new (await import('./squareService')).SquareService(
          profile.squareAccessToken,
          profile.squareLocationId,
          profile.squareEnvironment || 'production'
        );
        
        const result = await squareService.createCheckoutLink({
          amount: Math.round(parseFloat(amount) * 100),
          description: description || `Invoice for ${clientName}`,
          clientEmail,
          referenceId: payment.id,
          artistId: profile.userId,
        });
        
        if (result.paymentLink) {
          res.json({ 
            success: true, 
            paymentId: payment.id, 
            paymentLink: result.paymentLink,
            message: "Invoice created with payment link" 
          });
          return;
        }
      }
      
      res.json({ success: true, paymentId: payment.id, message: "Invoice created successfully" });
    } catch (error: any) {
      console.error("[Standalone Invoice] Error:", error);
      res.status(500).json({ error: error.message || "Failed to create invoice" });
    }
  });

  // Standalone invoice creation (session-based auth)
  app.post("/api/artist/standalone-invoice", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'artist') {
        return res.status(403).json({ error: "Not an artist" });
      }
      
      const profile = await storage.getArtistProfile(userId);
      if (!profile) {
        return res.status(404).json({ error: "Artist profile not found" });
      }
      
      const { clientName, clientEmail, amount, description } = req.body;
      
      if (!clientName || !clientEmail || !amount) {
        return res.status(400).json({ error: "Client name, email, and amount are required" });
      }
      
      const payment = await storage.createPayment({
        bookingId: `standalone-${Date.now()}`,
        amount: parseFloat(amount) || 0,
        type: "custom",
        status: "pending",
        method: "square",
        description: description || `Invoice for ${clientName}`,
      });
      
      if (profile.squareAccessToken && profile.squareLocationId) {
        const squareService = new (await import('./squareService')).SquareService(
          profile.squareAccessToken,
          profile.squareLocationId,
          profile.squareEnvironment || 'production'
        );
        
        const result = await squareService.createCheckoutLink({
          amount: Math.round(parseFloat(amount) * 100),
          description: description || `Invoice for ${clientName}`,
          clientEmail,
          referenceId: payment.id,
          artistId: userId,
        });
        
        if (result.paymentLink) {
          res.json({ 
            success: true, 
            paymentId: payment.id, 
            paymentLink: result.paymentLink,
            message: "Invoice created with payment link" 
          });
          return;
        }
      }
      
      res.json({ success: true, paymentId: payment.id, message: "Invoice created successfully" });
    } catch (error: any) {
      console.error("[Standalone Invoice] Error:", error);
      res.status(500).json({ error: error.message || "Failed to create invoice" });
    }
  });

  // Standalone contract creation (token-based auth)
  app.post("/api/public/standalone-contract", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token) {
        return res.status(401).json({ error: "Access token required" });
      }
      
      const profile = await storage.getArtistProfileByEditToken(token as string);
      if (!profile) {
        return res.status(401).json({ error: "Invalid access token" });
      }
      
      const { clientName, clientEmail, totalAmount, description } = req.body;
      
      if (!clientName || !clientEmail) {
        return res.status(400).json({ error: "Client name and email are required" });
      }
      
      // For standalone contracts, we'll send an email to the client with a contract link
      // The contract will be generated when they access the link
      res.json({ 
        success: true, 
        message: `Contract details saved for ${clientName}. Send them a message with your contract terms.` 
      });
    } catch (error: any) {
      console.error("[Standalone Contract] Error:", error);
      res.status(500).json({ error: error.message || "Failed to create contract" });
    }
  });

  // Standalone contract creation (session-based auth)
  app.post("/api/artist/standalone-contract", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'artist') {
        return res.status(403).json({ error: "Not an artist" });
      }
      
      const { clientName, clientEmail, totalAmount, description } = req.body;
      
      if (!clientName || !clientEmail) {
        return res.status(400).json({ error: "Client name and email are required" });
      }
      
      res.json({ 
        success: true, 
        message: `Contract details saved for ${clientName}. Send them a message with your contract terms.` 
      });
    } catch (error: any) {
      console.error("[Standalone Contract] Error:", error);
      res.status(500).json({ error: error.message || "Failed to create contract" });
    }
  });

  // Create manual client/inquiry (artist-initiated thread)
  app.post("/api/artist/create-client", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'artist') {
        return res.status(403).json({ error: "Not an artist" });
      }
      
      const profile = await storage.getArtistProfile(userId);
      if (!profile) {
        return res.status(404).json({ error: "Artist profile not found" });
      }
      
      const { clientName, clientEmail, clientPhone, eventDate, notes } = req.body;
      
      if (!clientName || !clientEmail) {
        return res.status(400).json({ error: "Client name and email are required" });
      }
      
      // Create an inquiry for this client (artist-initiated)
      const inquiry = await storage.createInquiry({
        vendorId: userId,
        clientName,
        clientEmail,
        clientPhone: clientPhone || null,
        eventDate: eventDate ? new Date(eventDate) : null,
        message: notes || "Manually added client",
        status: "pending",
        source: "manual",
        serviceType: "Consultation", // Default service type for manual clients
      });
      
      res.json({ 
        success: true, 
        inquiry,
        threadToken: inquiry.threadToken,
        message: `Client ${clientName} added successfully` 
      });
    } catch (error: any) {
      console.error("[Create Client] Error:", error);
      res.status(500).json({ error: error.message || "Failed to create client" });
    }
  });

  // Token-based create client (for Settings page with magic link)
  app.post("/api/public/artists/settings/create-client", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token) {
        return res.status(401).json({ error: "Access token required" });
      }
      
      const profile = await storage.getArtistProfileByEditToken(token as string);
      if (!profile) {
        return res.status(401).json({ error: "Invalid access token" });
      }
      
      const { clientName, clientEmail, clientPhone, eventDate, notes } = req.body;
      
      if (!clientName || !clientEmail) {
        return res.status(400).json({ error: "Client name and email are required" });
      }
      
      // Create an inquiry for this client (artist-initiated)
      const inquiry = await storage.createInquiry({
        vendorId: profile.userId,
        clientName,
        clientEmail,
        clientPhone: clientPhone || null,
        eventDate: eventDate ? new Date(eventDate) : null,
        message: notes || "Manually added client",
        status: "pending",
        source: "manual",
        serviceType: "Consultation",
      });
      
      res.json({ 
        success: true, 
        inquiry,
        threadToken: inquiry.threadToken,
        message: `Client ${clientName} added successfully` 
      });
    } catch (error: any) {
      console.error("[Create Client Token] Error:", error);
      res.status(500).json({ error: error.message || "Failed to create client" });
    }
  });

  // ========== DIRECT CHATS (Quick Chat) ==========
  
  // Create a new direct chat
  app.post("/api/artist/direct-chats", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'artist') {
        return res.status(403).json({ error: "Not an artist" });
      }
      
      const { participantName, participantEmail, participantRole, subject, initialMessage } = req.body;
      
      if (!participantName || !participantEmail) {
        return res.status(400).json({ error: "Name and email are required" });
      }
      
      // Create the direct chat
      const chat = await storage.createDirectChat({
        artistId: userId,
        participantName,
        participantEmail,
        participantRole: participantRole || "contact",
        subject: subject || null,
      });
      
      // If there's an initial message, add it
      if (initialMessage) {
        await storage.createDirectChatMessage({
          directChatId: chat.id,
          senderType: "artist",
          senderName: user.displayName || user.username || "Artist",
          content: initialMessage,
        });
      }
      
      const origin = process.env.CUSTOM_DOMAIN ? `https://${process.env.CUSTOM_DOMAIN}` : 'https://dateinquiry.com';
      const participantLink = `${origin}/chat/${chat.participantToken}`;
      
      // Send email to participant
      const artistProfile = await storage.getArtistProfile(userId);
      const artistName = artistProfile?.businessName || user.displayName || "Your contact";
      
      import('./emailService').then(({ sendQuickChatInviteEmail }) => {
        sendQuickChatInviteEmail({
          toEmail: participantEmail,
          artistName,
          participantName,
          chatLink: participantLink,
          initialMessage: initialMessage || null,
        }).catch((err: any) => console.error('[Quick Chat Email] Error:', err));
      });
      
      res.json({ 
        success: true, 
        chat,
        threadToken: chat.threadToken,
        participantLink,
      });
    } catch (error: any) {
      console.error("[Direct Chat] Error:", error);
      res.status(500).json({ error: error.message || "Failed to create chat" });
    }
  });

  // Create direct chat (public endpoint with token auth for magic-link access)
  app.post("/api/public/direct-chats", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token) {
        return res.status(401).json({ error: "Access token required" });
      }
      
      const profile = await storage.getArtistProfileByEditToken(token as string);
      if (!profile) {
        return res.status(401).json({ error: "Invalid access token" });
      }
      
      const { participantName, participantEmail, participantRole, subject, initialMessage } = req.body;
      
      if (!participantName || !participantEmail) {
        return res.status(400).json({ error: "Name and email are required" });
      }
      
      const chat = await storage.createDirectChat({
        artistId: profile.userId,
        participantName,
        participantEmail,
        participantRole: participantRole || "contact",
        subject: subject || null,
      });
      
      if (initialMessage) {
        await storage.createDirectChatMessage({
          directChatId: chat.id,
          senderType: "artist",
          senderName: profile.businessName || "Artist",
          content: initialMessage,
        });
      }
      
      const origin = process.env.CUSTOM_DOMAIN ? `https://${process.env.CUSTOM_DOMAIN}` : 'https://dateinquiry.com';
      const participantLink = `${origin}/chat/${chat.participantToken}`;
      
      // Send email to participant
      const artistName = profile.businessName || "Your contact";
      
      import('./emailService').then(({ sendQuickChatInviteEmail }) => {
        sendQuickChatInviteEmail({
          toEmail: participantEmail,
          artistName,
          participantName,
          chatLink: participantLink,
          initialMessage: initialMessage || null,
        }).catch((err: any) => console.error('[Quick Chat Email] Error:', err));
      });
      
      res.json({ 
        success: true, 
        chat,
        threadToken: chat.threadToken,
        participantLink,
      });
    } catch (error: any) {
      console.error("[Public Direct Chat] Error:", error);
      res.status(500).json({ error: error.message || "Failed to create chat" });
    }
  });

  // Get artist's direct chats (public endpoint with token auth)
  app.get("/api/public/direct-chats", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token) {
        return res.status(401).json({ error: "Access token required" });
      }
      
      const profile = await storage.getArtistProfileByEditToken(token as string);
      if (!profile) {
        return res.status(401).json({ error: "Invalid access token" });
      }
      
      const chats = await storage.getDirectChatsByArtist(profile.userId);
      res.json(chats);
    } catch (error: any) {
      console.error("[Public Direct Chats] Error:", error);
      res.status(500).json({ error: error.message || "Failed to get chats" });
    }
  });

  // Get direct chat by artist's chat token (public endpoint with auth token)
  app.get("/api/public/direct-chat/:chatToken", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token) {
        return res.status(401).json({ error: "Access token required" });
      }
      
      const profile = await storage.getArtistProfileByEditToken(token as string);
      if (!profile) {
        return res.status(401).json({ error: "Invalid access token" });
      }
      
      const chat = await storage.getDirectChatByToken(req.params.chatToken);
      if (!chat || chat.artistId !== profile.userId) {
        return res.status(404).json({ error: "Chat not found" });
      }
      
      const messages = await storage.getDirectChatMessages(chat.id);
      res.json({ chat, messages });
    } catch (error: any) {
      console.error("[Public Direct Chat] Error:", error);
      res.status(500).json({ error: error.message || "Failed to get chat" });
    }
  });

  // Post message to direct chat (artist - public endpoint with auth token)
  app.post("/api/public/direct-chat/:chatToken/messages", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token) {
        return res.status(401).json({ error: "Access token required" });
      }
      
      const profile = await storage.getArtistProfileByEditToken(token as string);
      if (!profile) {
        return res.status(401).json({ error: "Invalid access token" });
      }
      
      const chat = await storage.getDirectChatByToken(req.params.chatToken);
      if (!chat || chat.artistId !== profile.userId) {
        return res.status(404).json({ error: "Chat not found" });
      }
      
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ error: "Message content required" });
      }
      
      const message = await storage.createDirectChatMessage({
        directChatId: chat.id,
        senderType: "artist",
        senderName: profile.businessName || "Artist",
        content,
      });
      
      res.json(message);
    } catch (error: any) {
      console.error("[Public Direct Chat Message] Error:", error);
      res.status(500).json({ error: error.message || "Failed to send message" });
    }
  });
  
  // Get artist's direct chats (session auth)
  app.get("/api/artist/direct-chats", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const chats = await storage.getDirectChatsByArtist(userId);
      res.json(chats);
    } catch (error: any) {
      console.error("[Direct Chats] Error:", error);
      res.status(500).json({ error: error.message || "Failed to get chats" });
    }
  });
  
  // Get direct chat by artist's token (session auth)
  app.get("/api/artist/direct-chat/:token", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const chat = await storage.getDirectChatByToken(req.params.token);
      if (!chat || chat.artistId !== userId) {
        return res.status(404).json({ error: "Chat not found" });
      }
      
      const messages = await storage.getDirectChatMessages(chat.id);
      res.json({ chat, messages });
    } catch (error: any) {
      console.error("[Direct Chat] Error:", error);
      res.status(500).json({ error: error.message || "Failed to get chat" });
    }
  });
  
  // Post message to direct chat (artist - session auth)
  app.post("/api/artist/direct-chat/:token/messages", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      const chat = await storage.getDirectChatByToken(req.params.token);
      if (!chat || chat.artistId !== userId) {
        return res.status(404).json({ error: "Chat not found" });
      }
      
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ error: "Message content required" });
      }
      
      const message = await storage.createDirectChatMessage({
        directChatId: chat.id,
        senderType: "artist",
        senderName: user?.displayName || user?.username || "Artist",
        content,
      });
      
      res.json(message);
    } catch (error: any) {
      console.error("[Direct Chat Message] Error:", error);
      res.status(500).json({ error: error.message || "Failed to send message" });
    }
  });
  
  // Public: Get direct chat by participant token (magic link)
  app.get("/api/public/chat/:token", async (req, res) => {
    try {
      const chat = await storage.getDirectChatByParticipantToken(req.params.token);
      if (!chat) {
        return res.status(404).json({ error: "Chat not found" });
      }
      
      const artist = await storage.getUser(chat.artistId);
      const profile = await storage.getArtistProfile(chat.artistId);
      
      const messages = await storage.getDirectChatMessages(chat.id);
      res.json({ 
        chat, 
        messages,
        artist: {
          name: profile?.businessName || artist?.displayName || "Your Artist",
          slug: profile?.slug,
        }
      });
    } catch (error: any) {
      console.error("[Public Chat] Error:", error);
      res.status(500).json({ error: error.message || "Failed to get chat" });
    }
  });
  
  // Delete a direct chat (artist only - session or token auth)
  app.delete("/api/artist/direct-chat/:chatId", async (req, res) => {
    try {
      // Support both session and token auth
      const token = req.query.token as string;
      let userId: string;
      
      if (token) {
        const profile = await storage.getArtistProfileByEditToken(token);
        if (!profile) {
          return res.status(401).json({ error: "Invalid token" });
        }
        userId = profile.userId;
      } else {
        userId = (req.session as any)?.userId;
        if (!userId) {
          return res.status(401).json({ error: "Not authenticated" });
        }
      }
      
      const chatId = req.params.chatId;
      
      // Verify the chat belongs to this artist
      const chat = await storage.getDirectChat(chatId);
      if (!chat) {
        return res.status(404).json({ error: "Chat not found" });
      }
      
      if (chat.artistId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Delete the chat and its messages
      await storage.deleteDirectChat(chatId);
      
      console.log(`[Direct Chat] Deleted chat ${chatId} for artist ${userId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Direct Chat] Delete error:", error);
      res.status(500).json({ error: error.message || "Failed to delete chat" });
    }
  });
  
  // Public: Post message to direct chat (participant)
  app.post("/api/public/chat/:token/messages", async (req, res) => {
    try {
      const chat = await storage.getDirectChatByParticipantToken(req.params.token);
      if (!chat) {
        return res.status(404).json({ error: "Chat not found" });
      }
      
      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ error: "Message content required" });
      }
      
      const message = await storage.createDirectChatMessage({
        directChatId: chat.id,
        senderType: "participant",
        senderName: chat.participantName,
        content,
      });
      
      // Send email notification to artist
      try {
        const artist = await storage.getUser(chat.artistId);
        const profile = await storage.getArtistProfile(chat.artistId);
        const artistEmail = profile?.contactEmail || artist?.email;
        const artistName = profile?.businessName || artist?.displayName || "Artist";
        
        if (artistEmail) {
          const chatUrl = `https://dateinquiry.com/artist/chat/${chat.threadToken}`;
          await emailService.sendEmail({
            to: artistEmail,
            subject: `New message from ${chat.participantName}`,
            html: `
              <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="font-family: Fraunces, serif; color: #1a1a1a;">New Chat Message</h2>
                <p style="color: #333;">${chat.participantName} sent you a message:</p>
                <div style="background: #f5f0e8; padding: 16px; border-radius: 8px; margin: 16px 0;">
                  <p style="color: #1a1a1a; margin: 0;">"${content}"</p>
                </div>
                <a href="${chatUrl}" style="display: inline-block; background: #1a1a1a; color: #f5f0e8; padding: 12px 24px; border-radius: 4px; text-decoration: none; margin-top: 16px;">Reply to ${chat.participantName}</a>
                <p style="color: #666; font-size: 14px; margin-top: 24px;">Your Private Secretary</p>
              </div>
            `,
            fromName: artistName,
          });
          console.log(`[Direct Chat] Email notification sent to ${artistEmail}`);
        }
      } catch (emailError) {
        console.error("[Direct Chat] Failed to send email notification:", emailError);
        // Don't fail the request if email fails
      }
      
      res.json(message);
    } catch (error: any) {
      console.error("[Public Chat Message] Error:", error);
      res.status(500).json({ error: error.message || "Failed to send message" });
    }
  });

  // Setup flow - Connect Square
  app.post("/api/public/setup/:artistSlug/square", async (req, res) => {
    try {
      const { artistSlug } = req.params;
      const { accessToken, locationId, environment } = req.body;
      
      const profile = await storage.getArtistProfileBySlug(artistSlug);
      if (!profile) {
        return res.status(404).json({ error: "Artist not found" });
      }
      
      // Update artist profile with Square settings using storage layer
      await storage.updateArtistProfile(profile.userId, {
        squareAccessToken: accessToken,
        squareLocationId: locationId,
        squareEnvironment: environment || 'sandbox',
      });
      
      res.json({ success: true, message: "Square settings saved" });
    } catch (error: any) {
      console.error("[Setup Square] Error:", error);
      res.status(500).json({ error: error.message || "Failed to save Square settings" });
    }
  });

  // Setup flow - Contract Template
  app.post("/api/public/setup/:artistSlug/contract", async (req, res) => {
    try {
      const { artistSlug } = req.params;
      const { contractTemplate } = req.body;
      
      const profile = await storage.getArtistProfileBySlug(artistSlug);
      if (!profile) {
        return res.status(404).json({ error: "Artist not found" });
      }
      
      // Update artist profile with contract template using storage layer
      await storage.updateArtistProfile(profile.userId, {
        contractTemplate,
      });
      
      res.json({ success: true, message: "Contract template saved" });
    } catch (error: any) {
      console.error("[Setup Contract] Error:", error);
      res.status(500).json({ error: error.message || "Failed to save contract template" });
    }
  });

  // Pretty Links setup
  app.post("/api/public/setup/:artistSlug/links", async (req, res) => {
    try {
      const { artistSlug } = req.params;
      const { prettyLinks } = req.body;
      
      const profile = await storage.getArtistProfileBySlug(artistSlug);
      if (!profile) {
        return res.status(404).json({ error: "Artist not found" });
      }
      
      // Update artist profile with pretty links and mark onboarding complete using storage layer
      await storage.updateArtistProfile(profile.userId, {
        prettyLinks,
        onboardingCompleted: true,
      });
      
      res.json({ success: true, message: "Setup complete" });
    } catch (error: any) {
      console.error("[Setup Links] Error:", error);
      res.status(500).json({ error: error.message || "Failed to save links" });
    }
  });
  
  // Public artist onboarding
  app.post("/api/public/artists/onboard", async (req, res) => {
    try {
      const { name, email, businessName, customSlug, instagramHandle, tiktokHandle, pinterestHandle, 
              websiteUrl, bookedDates, pendingDates, referralArtists } = req.body;
      
      if (!name || !businessName) {
        return res.status(400).json({ error: "Name and business name are required" });
      }
      
      // Use custom slug if provided, otherwise generate from business name or Instagram
      let artistSlug = customSlug 
        ? customSlug.toLowerCase().replace(/[^a-z0-9]/g, '')
        : (instagramHandle 
            ? instagramHandle.toLowerCase().replace(/[^a-z0-9]/g, '')
            : businessName.toLowerCase().replace(/[^a-z0-9]/g, ''));
      
      // Validate slug is not empty and has valid length
      if (!artistSlug || artistSlug.length < 3) {
        return res.status(400).json({ error: "Your URL must be at least 3 characters long" });
      }
      if (artistSlug.length > 40) {
        return res.status(400).json({ error: "Your URL must be 40 characters or less" });
      }
      
      // Check if slug already exists
      const existingProfile = await storage.getArtistProfileBySlug(artistSlug);
      if (existingProfile) {
        return res.status(400).json({ error: "This URL is already taken. Please choose a different one." });
      }
      
      // Create user and profile using the public artist method
      const user = await storage.createPublicArtistUser({
        firstName: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' ') || null,
        email: email || null,
        role: 'artist',
      });
      
      // Generate edit token for settings access
      const editToken = randomUUID();
      
      // Create artist profile
      const profile = await storage.createArtistProfile({
        userId: user.id,
        businessName,
        instagramHandle,
        tiktokHandle: tiktokHandle || null,
        pinterestHandle: pinterestHandle || null,
        websiteUrl: websiteUrl || null,
        artistSlug,
        referralArtists: referralArtists || [],
        verificationStatus: 'approved',
        editToken,
      });
      
      // Save availability (booked dates - confirmed)
      if (bookedDates && bookedDates.length > 0) {
        for (const dateStr of bookedDates) {
          await storage.setAvailability({
            userId: user.id,
            date: new Date(dateStr),
            isAvailable: false,
            notes: 'booked',
          });
        }
      }
      
      // Save availability (pending dates)
      if (pendingDates && pendingDates.length > 0) {
        for (const dateStr of pendingDates) {
          await storage.setAvailability({
            userId: user.id,
            date: new Date(dateStr),
            isAvailable: false,
            notes: 'pending',
          });
        }
      }
      
      // Track analytics event
      await storage.createAnalyticsEvent({
        eventType: 'calendar_created',
        artistId: user.id,
        metadata: { artistSlug, bookedDatesCount: bookedDates?.length || 0 }
      });
      
      // Send welcome email if email provided
      if (email) {
        try {
          const { sendArtistWelcomeEmail } = await import('./emailService');
          const baseUrl = process.env.PUBLIC_BASE_URL || 'https://briarwood.ai';
          const calendarUrl = `${baseUrl}/${artistSlug}`;
          const settingsUrl = `${baseUrl}/${artistSlug}/settings?token=${editToken}`;
          await sendArtistWelcomeEmail({
            toEmail: email,
            artistName: name,
            businessName,
            calendarUrl,
            settingsUrl
          });
          console.log(`[Public Onboarding] Welcome email sent to ${email}`);
        } catch (emailError) {
          console.error("[Public Onboarding] Failed to send welcome email:", emailError);
        }
      }
      
      // Check referral artists - see which ones are not on platform yet
      const referralResults: Array<{ handle: string; isOnPlatform: boolean; inviteLink?: string }> = [];
      if (referralArtists && referralArtists.length > 0) {
        const baseUrl = process.env.PUBLIC_BASE_URL || 'https://briarwood.ai';
        
        for (const refHandle of referralArtists) {
          if (!refHandle || refHandle.trim() === '') continue;
          const cleanHandle = refHandle.replace('@', '').toLowerCase().replace(/[^a-z0-9]/g, '');
          
          // Check if artist exists on platform
          const existingProfile = await storage.getArtistProfileBySlug(cleanHandle);
          
          if (existingProfile) {
            referralResults.push({ handle: refHandle, isOnPlatform: true });
          } else {
            // Generate invite token and persist it
            const inviteToken = randomUUID();
            
            // Store the invitation in the database
            try {
              await storage.createInvitation({
                token: inviteToken,
                email: cleanHandle + '@referral.dateinquiry.com', // Placeholder email since we only have handle
                firstName: cleanHandle,
                role: 'artist',
                invitedBy: user.id,
                status: 'pending',
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
              });
            } catch (inviteError) {
              console.error(`[Public Onboarding] Failed to create invitation for ${cleanHandle}:`, inviteError);
            }
            
            const inviteLink = `${baseUrl}/onboarding?ref=${artistSlug}&invite=${inviteToken}`;
            referralResults.push({ handle: refHandle, isOnPlatform: false, inviteLink });
          }
        }
        console.log(`[Public Onboarding] Referral check: ${referralResults.filter(r => r.isOnPlatform).length} on platform, ${referralResults.filter(r => !r.isOnPlatform).length} not on platform`);
      }
      
      // Build settings URL for the response
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://dateinquiry.com';
      const settingsUrl = `${baseUrl}/${artistSlug}/settings?token=${editToken}`;
      
      res.json({ artistSlug, userId: user.id, artistId: user.id, referralResults, settingsUrl });
    } catch (error: any) {
      console.error("[Public Onboarding] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Upload info sheet during onboarding (multipart form)
  app.post("/api/public/artists/upload-info-sheet", async (req: Request, res: Response) => {
    try {
      // Handle multipart form data manually using raw body
      const contentType = req.headers['content-type'] || '';
      if (!contentType.includes('multipart/form-data')) {
        return res.status(400).json({ error: "Multipart form data required" });
      }
      
      // For now, we'll store the info that an info sheet was uploaded
      // The actual file upload will be handled by the object storage integration
      const objectStorage = new ObjectStorageService();
      
      // Parse multipart form data
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      
      // Extract artistId and file from form data (simplified parsing)
      const boundary = contentType.split('boundary=')[1];
      if (!boundary) {
        return res.status(400).json({ error: "Invalid multipart form data" });
      }
      
      // For simplicity, just acknowledge the upload for now
      // The full implementation would parse the multipart data and upload to object storage
      console.log("[Info Sheet Upload] Received upload request");
      
      res.json({ success: true, message: "Info sheet upload acknowledged" });
    } catch (error: any) {
      console.error("[Info Sheet Upload] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Confirm Instagram share
  app.post("/api/public/artists/confirm-share", async (req, res) => {
    try {
      const { artistSlug } = req.body;
      const profile = await storage.getArtistProfileBySlug(artistSlug);
      if (profile) {
        await storage.updateUser(profile.userId, { sharedToInstagram: true });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Confirm Share] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get artist settings by edit token (no login required)
  app.get("/api/public/artists/settings", async (req, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ error: "Edit token is required" });
      }
      
      const profile = await storage.getArtistProfileByEditToken(token);
      if (!profile) {
        return res.status(404).json({ error: "Invalid or expired token" });
      }
      
      const user = await storage.getUser(profile.userId);
      
      res.json({
        userId: profile.userId,
        artistSlug: profile.artistSlug,
        businessName: profile.businessName,
        artistName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : profile.businessName,
        contactEmail: user?.email,
        infoSheetType: profile.infoSheetType || 'template',
        infoSheetContent: profile.infoSheetContent,
        infoSheetPdfUrl: profile.infoSheetPdfUrl,
        infoSheetEnabled: profile.infoSheetEnabled ?? true,
        formSuccessMessage: profile.formSuccessMessage,
        autoResponderMode: (profile as any).autoResponderMode || 'off',
        pauseMessage: (profile as any).customResponse,
        politeDeclineTemplate: (profile as any).politeDeclineTemplate,
        referralListTemplate: (profile as any).referralListTemplate,
        pricingInfo: (profile as any).pricingInfo,
        plannerInfoSheet: (profile as any).plannerInfoSheet,
        plannerPricing: (profile as any).plannerPricing,
      });
    } catch (error: any) {
      console.error("[Artist Settings Get] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update artist settings by edit token (no login required)
  app.patch("/api/public/artists/settings", async (req, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ error: "Edit token is required" });
      }
      
      const profile = await storage.getArtistProfileByEditToken(token);
      if (!profile) {
        return res.status(404).json({ error: "Invalid or expired token" });
      }
      
      const { infoSheetType, infoSheetContent, infoSheetPdfUrl, infoSheetEnabled, formSuccessMessage, autoResponderMode, customResponse, politeDeclineTemplate, referralListTemplate, pricingInfo, plannerInfoSheet, plannerPricing } = req.body;
      
      console.log(`[Settings Update] Artist: ${profile.artistSlug}, infoSheetType: ${infoSheetType}, hasContent: ${!!infoSheetContent}, contentLength: ${infoSheetContent?.length || 0}`);
      
      const updateData: Partial<ArtistProfile> = {};
      if (infoSheetType !== undefined) updateData.infoSheetType = infoSheetType;
      if (infoSheetContent !== undefined) updateData.infoSheetContent = infoSheetContent;
      if (infoSheetPdfUrl !== undefined) updateData.infoSheetPdfUrl = infoSheetPdfUrl;
      if (infoSheetEnabled !== undefined) updateData.infoSheetEnabled = infoSheetEnabled;
      if (formSuccessMessage !== undefined) updateData.formSuccessMessage = formSuccessMessage;
      if (autoResponderMode !== undefined) updateData.autoResponderMode = autoResponderMode;
      if (customResponse !== undefined) updateData.customResponse = customResponse;
      if (politeDeclineTemplate !== undefined) updateData.politeDeclineTemplate = politeDeclineTemplate;
      if (referralListTemplate !== undefined) updateData.referralListTemplate = referralListTemplate;
      if (pricingInfo !== undefined) updateData.pricingInfo = pricingInfo;
      if (plannerInfoSheet !== undefined) updateData.plannerInfoSheet = plannerInfoSheet;
      if (plannerPricing !== undefined) updateData.plannerPricing = plannerPricing;
      
      const updatedProfile = await storage.updateArtistProfile(profile.userId, updateData);
      console.log(`[Settings Update] Saved for ${profile.artistSlug}. New content length: ${updatedProfile?.infoSheetContent?.length || 0}`);
      
      res.json({
        success: true,
        infoSheetType: updatedProfile?.infoSheetType,
        infoSheetPdfUrl: updatedProfile?.infoSheetPdfUrl,
        infoSheetEnabled: updatedProfile?.infoSheetEnabled,
        formSuccessMessage: updatedProfile?.formSuccessMessage,
      });
    } catch (error: any) {
      console.error("[Artist Settings Update] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Upload info sheet file - session-based auth
  app.post("/api/artist/settings/upload", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'artist') {
        return res.status(403).json({ error: "Not an artist" });
      }
      
      const profile = await storage.getArtistProfile(userId);
      if (!profile) {
        return res.status(404).json({ error: "Artist profile not found" });
      }
      
      const { fileName, fileData, mimeType } = req.body;
      if (!fileName || !fileData || !mimeType) {
        return res.status(400).json({ error: "fileName, fileData, and mimeType are required" });
      }
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(mimeType)) {
        return res.status(400).json({ error: "Only PDF and image files are allowed" });
      }
      
      const objectService = new ObjectStorageService();
      const timestamp = Date.now();
      const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const objectPath = `public/info-sheets/${profile.artistSlug}/${timestamp}-${safeName}`;
      
      // Decode base64 and upload
      const fileBuffer = Buffer.from(fileData, 'base64');
      const publicUrl = await objectService.uploadBuffer(objectPath, fileBuffer, mimeType);
      
      // Update profile with new info sheet URL
      await storage.updateArtistProfile(userId, {
        infoSheetPdfUrl: publicUrl,
        infoSheetType: 'pdf',
      });
      
      res.json({
        success: true,
        url: publicUrl,
      });
    } catch (error: any) {
      console.error("[Artist Info Sheet Upload Session] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Upload info sheet file by edit token (no login required)
  app.post("/api/public/artists/settings/upload", async (req, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ error: "Edit token is required" });
      }
      
      const profile = await storage.getArtistProfileByEditToken(token);
      if (!profile) {
        return res.status(404).json({ error: "Invalid or expired token" });
      }
      
      const { fileName, fileData, mimeType } = req.body;
      if (!fileName || !fileData || !mimeType) {
        return res.status(400).json({ error: "fileName, fileData, and mimeType are required" });
      }
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(mimeType)) {
        return res.status(400).json({ error: "Only PDF and image files are allowed" });
      }
      
      const objectService = new ObjectStorageService();
      const timestamp = Date.now();
      const extension = mimeType.split('/')[1] || 'pdf';
      const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const objectPath = `public/info-sheets/${profile.artistSlug}/${timestamp}-${safeName}`;
      
      // Decode base64 and upload
      const fileBuffer = Buffer.from(fileData, 'base64');
      const publicUrl = await objectService.uploadBuffer(objectPath, fileBuffer, mimeType);
      
      // Update profile with new info sheet URL
      console.log(`[Info Sheet Upload] Uploading for artist: ${profile.artistSlug}, userId: ${profile.userId}`);
      await storage.updateArtistProfile(profile.userId, {
        infoSheetPdfUrl: publicUrl,
        infoSheetType: 'pdf',
      });
      console.log(`[Info Sheet Upload] Saved. URL: ${publicUrl}`);
      
      res.json({
        success: true,
        url: publicUrl,
      });
    } catch (error: any) {
      console.error("[Artist Info Sheet Upload] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Resend settings link to artist (for when they forget their admin link)
  // Now uses session-based login codes instead of tokens for reliability
  app.post("/api/public/artists/resend-settings-link", async (req, res) => {
    try {
      const { email, slug } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      console.log("[Resend Settings Link] Looking up email:", normalizedEmail, "slug:", slug);
      
      let profile = null;
      let user = null;
      
      // First try: look up by email in users table
      user = await storage.getUserByEmail(normalizedEmail);
      console.log("[Resend Settings Link] User by email:", user ? user.id : "not found");
      
      if (user) {
        profile = await storage.getArtistProfile(user.id);
        console.log("[Resend Settings Link] Profile by userId:", profile ? profile.artistSlug : "not found");
      }
      
      // Second try: if slug provided and no profile yet, look up by slug
      if (!profile && slug) {
        profile = await storage.getArtistProfileBySlug(slug);
        console.log("[Resend Settings Link] Profile by slug:", profile ? profile.artistSlug : "not found");
        if (profile) {
          // Get or create user for the provided email
          let emailUser = await storage.getUserByEmail(normalizedEmail);
          if (!emailUser) {
            // Create user for this email
            console.log("[Resend Settings Link] Creating user for email:", normalizedEmail);
            emailUser = await storage.createUser({
              email: normalizedEmail,
              role: 'artist',
            });
          }
          
          // Link profile to this user if not already linked or if different
          if (profile.userId !== emailUser.id) {
            console.log("[Resend Settings Link] Relinking profile from", profile.userId, "to", emailUser.id);
            // Direct update to change profile ownership
            await db.update(artistProfiles)
              .set({ userId: emailUser.id })
              .where(eq(artistProfiles.id, profile.id));
            // Reload profile with new userId
            profile = await storage.getArtistProfileBySlug(slug);
          }
          
          user = emailUser;
          console.log("[Resend Settings Link] User linked:", user?.email);
        }
      }
      
      if (!profile) {
        console.log("[Resend Settings Link] No profile found");
        return res.json({ success: true, message: "If this email is registered, you'll receive your settings link shortly." });
      }
      
      // Send to the email they entered
      const targetEmail = normalizedEmail;
      console.log("[Resend Settings Link] Will send to:", targetEmail);
      
      // Generate a login code that creates a session (more reliable than tokens)
      const loginCode = randomUUID().replace(/-/g, '').substring(0, 12);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await storage.updateArtistProfile(profile.userId, {
        loginCode,
        loginCodeExpiresAt: expiresAt
      });
      
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://dateinquiry.com';
      const loginUrl = `${baseUrl}/access/${loginCode}`;
      
      console.log("[Resend Settings Link] Sending login link to:", targetEmail, "for slug:", profile.artistSlug);
      
      // Send the login email to the profile owner's registered email
      const { sendLoginLinkEmail } = await import('./emailService');
      const result = await sendLoginLinkEmail({
        toEmail: targetEmail,
        artistName: profile.businessName || 'there',
        loginUrl
      });
      
      console.log("[Resend Settings Link] Email result:", JSON.stringify(result));
      
      res.json({ success: true, message: "If this email is registered, you'll receive your settings link shortly." });
    } catch (error: any) {
      console.error("[Resend Settings Link] Error:", error);
      res.status(500).json({ error: "Failed to send settings link" });
    }
  });
  
  // Trusted Circle API - get artist's trusted circle members
  app.get("/api/public/trusted-circle", async (req, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(401).json({ error: "Token required" });
      }
      
      const profile = await storage.getArtistProfileByEditToken(token);
      if (!profile) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }
      
      // Fetch trusted circle members from database
      const members = await db.select()
        .from(trustedCircle)
        .where(eq(trustedCircle.referrerId, profile.userId));
      
      res.json({
        artistProfile: {
          id: profile.id,
          businessName: profile.businessName,
          artistSlug: profile.artistSlug,
        },
        members: members.map(m => ({
          id: m.id,
          name: m.refereeName,
          email: m.refereeEmail,
          status: m.status,
          addedAt: m.createdAt,
        })),
      });
    } catch (error: any) {
      console.error("[Trusted Circle Get] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Add member to trusted circle
  const addTrustedCircleMemberSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required"),
    note: z.string().optional(),
  });
  
  app.post("/api/public/trusted-circle", async (req, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(401).json({ error: "Token required" });
      }
      
      const profile = await storage.getArtistProfileByEditToken(token);
      if (!profile) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }
      
      const parseResult = addTrustedCircleMemberSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0]?.message || "Invalid input" });
      }
      
      const { name, email, note } = parseResult.data;
      
      const inviteToken = randomUUID();
      
      // Create the trusted circle entry
      const [newMember] = await db.insert(trustedCircle)
        .values({
          referrerId: profile.userId,
          refereeName: name,
          refereeEmail: email,
          status: 'pending',
          inviteToken,
        })
        .returning();
      
      // Send invite email to the new member
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://briarwood.ai';
      const inviteLink = `${baseUrl}/join?invite=${inviteToken}`;
      
      const { sendCircleInviteEmail } = await import('./emailService');
      const emailResult = await sendCircleInviteEmail({
        toEmail: email,
        inviteeName: name,
        inviterName: profile.artistName || profile.businessName || 'An artist',
        inviterBusinessName: profile.businessName,
        inviteLink,
        personalNote: note,
      });
      
      if (!emailResult.success) {
        console.error("[Trusted Circle Add] Failed to send invite email:", emailResult.error);
        return res.status(500).json({ error: "Failed to send invite email. Please try again." });
      }
      
      res.json({
        success: true,
        member: {
          id: newMember.id,
          name: newMember.refereeName,
          email: newMember.refereeEmail,
          status: newMember.status,
          addedAt: newMember.createdAt,
        },
      });
    } catch (error: any) {
      console.error("[Trusted Circle Add] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Remove member from trusted circle
  app.delete("/api/public/trusted-circle/:memberId", async (req, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(401).json({ error: "Token required" });
      }
      
      const profile = await storage.getArtistProfileByEditToken(token);
      if (!profile) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }
      
      const { memberId } = req.params;
      
      // Delete only if the member belongs to this artist
      await db.delete(trustedCircle)
        .where(
          and(
            eq(trustedCircle.id, memberId),
            eq(trustedCircle.referrerId, profile.userId)
          )
        );
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Trusted Circle Remove] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Session-based Trusted Circle endpoints (for logged-in artists)
  app.get("/api/artist/trusted-circle", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'artist') {
        return res.status(401).json({ error: "Not authorized" });
      }
      
      const profile = await storage.getArtistProfile(userId);
      if (!profile) {
        return res.status(404).json({ error: "Artist profile not found" });
      }
      
      const members = await db.select()
        .from(trustedCircle)
        .where(eq(trustedCircle.referrerId, userId));
      
      res.json({
        artistProfile: {
          id: profile.id,
          businessName: profile.businessName,
          artistSlug: profile.artistSlug,
        },
        members: members.map(m => ({
          id: m.id,
          name: m.refereeName,
          email: m.refereeEmail,
          status: m.status,
          addedAt: m.createdAt,
        })),
      });
    } catch (error: any) {
      console.error("[Session Trusted Circle Get] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.post("/api/artist/trusted-circle", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'artist') {
        return res.status(401).json({ error: "Not authorized" });
      }
      
      const parseResult = addTrustedCircleMemberSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0]?.message || "Invalid input" });
      }
      
      const { name, email, note } = parseResult.data;
      
      const inviteToken = randomUUID();
      
      // Get artist profile for email
      const profile = await storage.getArtistProfile(userId);
      
      const [newMember] = await db.insert(trustedCircle)
        .values({
          referrerId: userId,
          refereeName: name,
          refereeEmail: email,
          status: 'pending',
          inviteToken,
        })
        .returning();
      
      // Send invite email to the new member
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://briarwood.ai';
      const inviteLink = `${baseUrl}/join?invite=${inviteToken}`;
      
      const { sendCircleInviteEmail } = await import('./emailService');
      const emailResult = await sendCircleInviteEmail({
        toEmail: email,
        inviteeName: name,
        inviterName: profile?.artistName || profile?.businessName || user.email || 'An artist',
        inviterBusinessName: profile?.businessName,
        inviteLink,
        personalNote: note,
      });
      
      if (!emailResult.success) {
        console.error("[Session Trusted Circle Add] Failed to send invite email:", emailResult.error);
        return res.status(500).json({ error: "Failed to send invite email. Please try again." });
      }
      
      res.json({
        success: true,
        member: {
          id: newMember.id,
          name: newMember.refereeName,
          email: newMember.refereeEmail,
          status: newMember.status,
          addedAt: newMember.createdAt,
        },
      });
    } catch (error: any) {
      console.error("[Session Trusted Circle Add] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  app.delete("/api/artist/trusted-circle/:memberId", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'artist') {
        return res.status(401).json({ error: "Not authorized" });
      }
      
      const { memberId } = req.params;
      
      await db.delete(trustedCircle)
        .where(
          and(
            eq(trustedCircle.id, memberId),
            eq(trustedCircle.referrerId, userId)
          )
        );
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Session Trusted Circle Remove] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Blocked Dates API - get artist's blocked dates (admin only)
  app.get("/api/public/blocked-dates", async (req, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(401).json({ error: "Token required" });
      }
      
      const profile = await storage.getArtistProfileByEditToken(token);
      if (!profile) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }
      
      const dates = await db.select()
        .from(blockedDates)
        .where(eq(blockedDates.artistId, profile.userId));
      
      res.json({
        dates: dates.map(d => ({
          date: d.blockedDate,
          reason: d.reason,
        })),
      });
    } catch (error: any) {
      console.error("[Blocked Dates Get] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Blocked Dates API - toggle date status
  const blockedDateSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
    status: z.enum(['available', 'pending', 'booked']),
  });
  
  app.post("/api/public/blocked-dates", async (req, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(401).json({ error: "Token required" });
      }
      
      const profile = await storage.getArtistProfileByEditToken(token);
      if (!profile) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }
      
      const parseResult = blockedDateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0]?.message || "Invalid input" });
      }
      
      const { date, status } = parseResult.data;
      
      if (status === 'available') {
        // Remove from blocked dates
        await db.delete(blockedDates)
          .where(
            and(
              eq(blockedDates.artistId, profile.userId),
              eq(blockedDates.blockedDate, date)
            )
          );
      } else {
        // Upsert: delete existing then insert
        await db.delete(blockedDates)
          .where(
            and(
              eq(blockedDates.artistId, profile.userId),
              eq(blockedDates.blockedDate, date)
            )
          );
        
        const reason = status === 'booked' ? 'Booked' : 'Pending';
        await db.insert(blockedDates)
          .values({
            artistId: profile.userId,
            blockedDate: date,
            reason,
          });
      }
      
      res.json({ success: true, date, status });
    } catch (error: any) {
      console.error("[Blocked Dates Update] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get public artist profile (supports both artistSlug and username)
  app.get("/api/public/artists/:artistSlug", async (req, res) => {
    try {
      const slug = req.params.artistSlug;
      
      // First try to find by artist slug
      let profile = await storage.getArtistProfileBySlug(slug);
      
      // If not found by slug, try to find by username
      if (!profile) {
        const userByUsername = await storage.getUserByUsername(slug);
        if (userByUsername && userByUsername.role === 'artist') {
          profile = await storage.getArtistProfile(userByUsername.id);
        }
      }
      
      if (!profile) {
        return res.status(404).json({ error: "Artist not found" });
      }
      
      const user = await storage.getUser(profile.userId);
      const availability = await storage.getAvailabilityByUser(profile.userId);
      // Normalize dates to YYYY-MM-DD format to avoid timezone issues
      const unavailableDates = availability
        .filter(a => !a.isAvailable)
        .map(a => {
          const d = new Date(a.date);
          return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        });
      
      // Also get dates from actual bookings
      const bookings = await storage.getBookingsByArtist(profile.userId);
      const bookedFromBookings = bookings
        .filter(b => b.status !== 'cancelled' && b.eventDate)
        .map(b => {
          const d = new Date(b.eventDate!);
          return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
        });
      
      // Combine both sources and remove duplicates
      const bookedDates = [...new Set([...unavailableDates, ...bookedFromBookings])];
      
      // Get referral artist info
      let referralArtistsInfo: any[] = [];
      if (profile.referralArtists && Array.isArray(profile.referralArtists)) {
        for (const refHandle of profile.referralArtists as string[]) {
          const cleanHandle = refHandle.replace('@', '').toLowerCase();
          const refProfile = await storage.getArtistProfileBySlug(cleanHandle);
          referralArtistsInfo.push({
            name: refHandle,
            instagramHandle: cleanHandle,
            slug: refProfile?.artistSlug || null,
            isOnPlatform: !!refProfile
          });
        }
      }
      
      res.json({
        id: profile.id,
        name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || profile.businessName,
        businessName: profile.businessName,
        instagramHandle: profile.instagramHandle,
        tiktokHandle: profile.tiktokHandle,
        pinterestHandle: profile.pinterestHandle,
        websiteUrl: profile.websiteUrl,
        responsiveBadge: profile.responsiveBadge,
        avgResponseTimeMinutes: profile.avgResponseTimeMinutes,
        bookedDates,
        referralArtists: referralArtistsInfo
      });
    } catch (error: any) {
      console.error("[Public Artist] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  if (process.env.NODE_ENV !== "production") {
    // Debug endpoint to check token lookup AND full admin flow (no auth required)
    app.get("/api/debug/token-check", async (req, res) => {
      try {
        const token = req.query.token as string;
        const slug = req.query.slug as string;
        const fullTest = req.query.full === 'true';

        if (!token && !slug) {
          return res.json({ error: "Provide ?token=xxx or ?slug=xxx. Add &full=true to test full flow." });
        }

        let profileByToken = null;
        let profileBySlug = null;

        if (token) {
          profileByToken = await storage.getArtistProfileByEditToken(token);
        }
        if (slug) {
          profileBySlug = await storage.getArtistProfileBySlug(slug);
        }

        const result: any = {
          tokenProvided: !!token,
          slugProvided: !!slug,
          foundByToken: profileByToken ? {
            slug: profileByToken.artistSlug,
            bizName: profileByToken.businessName,
            hasUserId: !!profileByToken.userId,
            userId: profileByToken.userId
          } : null,
          foundBySlug: profileBySlug ? {
            slug: profileBySlug.artistSlug,
            bizName: profileBySlug.businessName,
            hasUserId: !!profileBySlug.userId,
            storedTokenPrefix: profileBySlug.editToken?.substring(0, 8) + "...",
            providedTokenPrefix: token?.substring(0, 8) + "...",
            tokensMatch: profileBySlug.editToken === token
          } : null
        };

        // Full test: try to load inquiries and threads like the admin route does
        if (fullTest && profileByToken) {
          try {
            const inquiries = await storage.getInquiriesByVendor(profileByToken.userId!);
            result.inquiriesCount = inquiries?.length || 0;
          } catch (e: any) {
            result.inquiriesError = e.message;
          }

          try {
            const threads = await storage.getThreadsByArtist(profileByToken.id);
            result.threadsCount = threads?.length || 0;
          } catch (e: any) {
            result.threadsError = e.message;
          }

          result.fullTestPassed = !result.inquiriesError && !result.threadsError;
        }

        res.json(result);
      } catch (error: any) {
        res.json({ error: error.message });
      }
    });

    // Debug endpoint to test admin-data directly - full flow
    app.get("/api/debug/admin-test", async (req, res) => {
      try {
        const userId = (req.session as any)?.userId;
        if (!userId) {
          return res.json({ error: "NO SESSION", step: "session check" });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.json({ error: "USER NOT FOUND", userId, step: "user lookup" });
        }

        const profile = await storage.getArtistProfile(userId);
        if (!profile) {
          const allProfiles = await db.select().from(artistProfiles);
          return res.json({
            error: "NO PROFILE BY USERID",
            userId,
            userEmail: user.email,
            step: "profile lookup",
            allProfileUserIds: allProfiles.map(p => ({ slug: p.artistSlug, usrId: p.userId }))
          });
        }

        // Try to get inquiries and threads like admin-data does
        let inquiries, threads;
        try {
          inquiries = await storage.getInquiriesByVendor(userId);
        } catch (e: any) {
          return res.json({ error: e.message, step: "getInquiriesByVendor", userId });
        }
        
        try {
          threads = await storage.getThreadsByArtist(profile.id);
        } catch (e: any) {
          return res.json({ error: e.message, step: "getThreadsByArtist", profileId: profile.id });
        }
        
        return res.json({ 
          success: true,
          step: "complete",
          profile: { slug: profile.artistSlug, bizName: profile.businessName, userId: profile.userId },
          inquiryCount: inquiries?.length || 0,
          threadCount: threads?.length || 0
        });
      } catch (error: any) {
        res.json({ error: error.message, step: "exception", stack: error.stack?.substring(0, 500) });
      }
    });

    // Debug endpoint to check database state (temporary)
    app.get("/api/debug/db-state", async (req, res) => {
      try {
        const userId = (req.session as any)?.userId;
        const allProfiles = await db.select({
          id: artistProfiles.id,
          slug: artistProfiles.artistSlug,
          bizName: artistProfiles.businessName,
          userId: artistProfiles.userId,
          status: artistProfiles.verificationStatus
        }).from(artistProfiles);

        const allUsers = await db.select({
          id: users.id,
          email: users.email,
          role: users.role
        }).from(users);

        res.json({
          sessionUserId: userId || "NO SESSION",
          profiles: allProfiles,
          users: allUsers
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: errorMessage });
      }
    });
  }

  // Artist admin dashboard - session-based auth (for logged in artists)
  app.get("/api/artist/admin-data", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(403).json({ error: "User not found" });
      }
      
      // Get requested slug from query parameter
      const requestedSlug = req.query.slug as string | undefined;
      console.log("[AdminData] userId:", userId, "email:", user.email, "requestedSlug:", requestedSlug);
      
      let profile = null;
      
      // If slug provided, look up by slug first
      if (requestedSlug) {
        profile = await storage.getArtistProfileBySlug(requestedSlug);
        if (profile) {
          console.log("[AdminData] Found profile by slug:", requestedSlug, "profile.userId:", profile.userId, "session userId:", userId);
          
          // Check if this profile can be claimed by this user
          const profileUserId = profile.userId;
          const isUnclaimed = !profileUserId || profileUserId === '';
          const isAlreadyOwned = profileUserId === userId;
          
          // Check if user's email matches the profile (for legacy data)
          const emailPrefix = user.email?.split('@')[0]?.toLowerCase() || '';
          const bizName = profile.businessName?.toLowerCase() || '';
          const slugLower = profile.artistSlug?.toLowerCase() || '';
          const emailMatches = emailPrefix && (slugLower.includes(emailPrefix) || bizName.includes(emailPrefix) || emailPrefix.includes(slugLower));
          
          console.log("[AdminData] isUnclaimed:", isUnclaimed, "isAlreadyOwned:", isAlreadyOwned, "emailMatches:", emailMatches);
          
          if (isAlreadyOwned) {
            // Already linked correctly, continue
            console.log("[AdminData] Profile already owned by this user");
          } else if (isUnclaimed || emailMatches) {
            // Unclaimed or email matches - link to this user
            console.log("[AdminData] Linking profile to user:", requestedSlug);
            await db.update(artistProfiles)
              .set({ 
                userId: userId,
                verificationStatus: 'approved',
                onboardingCompleted: true
              })
              .where(eq(artistProfiles.id, profile.id));
            
            // Also ensure user role is artist
            await db.update(users)
              .set({ role: 'artist' })
              .where(eq(users.id, userId));
            
            // Reload profile with updated data
            profile = await storage.getArtistProfileBySlug(requestedSlug);
            console.log("[AdminData] Profile linked successfully");
          } else {
            // Profile belongs to someone else
            console.log("[AdminData] Access denied - profile belongs to different user");
            return res.status(403).json({ error: "Access denied - this profile belongs to another user" });
          }
        }
      }
      
      // Fallback: look up by userId if no slug or slug lookup failed
      if (!profile) {
        console.log("[AdminData] Looking up profile by userId:", userId);
        profile = await storage.getArtistProfile(userId);
      }
      
      if (!profile) {
        // Try various fallback methods to find the profile
        console.log("[AdminData] No profile by userId, trying fallbacks...");
        
        // Method 1: Try by email (searches users table first)
        let foundProfile = await storage.getArtistProfileByEmail(user.email!);
        
        // Method 2: Search all profiles for one that might belong to this user
        if (!foundProfile) {
          console.log("[AdminData] Email lookup failed, scanning all profiles...");
          const allProfiles = await db.select().from(artistProfiles);
          const emailPrefix = user.email?.split('@')[0]?.toLowerCase() || '';
          const firstName = user.firstName?.toLowerCase() || '';
          const lastName = user.lastName?.toLowerCase() || '';
          
          // First try: exact email prefix or name matching
          foundProfile = allProfiles.find(p => {
            const bizName = p.businessName?.toLowerCase() || '';
            const slug = p.artistSlug?.toLowerCase() || '';
            return slug.includes(emailPrefix) || 
                   bizName.includes(emailPrefix) ||
                   (firstName && (bizName.includes(firstName) || slug.includes(firstName))) ||
                   (lastName && (bizName.includes(lastName) || slug.includes(lastName)));
          });
          
          // Second try: find any unlinked profile (userId is null or matches)
          if (!foundProfile) {
            foundProfile = allProfiles.find(p => 
              p.userId === userId || p.userId === null || p.userId === ''
            );
            if (foundProfile) {
              console.log("[AdminData] Found unlinked profile:", foundProfile.artistSlug);
            }
          }
          
          // Third try: if only one profile exists and user is an artist, it's probably theirs
          if (!foundProfile && allProfiles.length === 1) {
            foundProfile = allProfiles[0];
            console.log("[AdminData] Only one profile exists, assuming ownership:", foundProfile.artistSlug);
          }
          
          if (foundProfile) {
            console.log("[AdminData] Found likely match:", foundProfile.businessName, foundProfile.artistSlug);
          }
        }
        
        if (foundProfile) {
          console.log("[AdminData] Found profile! Fixing userId mismatch:", foundProfile.userId, "→", userId);
          // Fix the mismatch by updating the profile's userId AND approve it
          await db.update(artistProfiles)
            .set({ 
              userId: userId,
              verificationStatus: 'approved',
              onboardingCompleted: true
            })
            .where(eq(artistProfiles.id, foundProfile.id));
          console.log("[AdminData] Fixed userId and approved profile:", foundProfile.artistSlug);
          
          // Also ensure user role is artist
          await db.update(users)
            .set({ role: 'artist' })
            .where(eq(users.id, userId));
          console.log("[AdminData] Updated user role to artist");
          
          // Continue with the fixed profile
          profile = await storage.getArtistProfile(userId);
        }
        
        if (!profile) {
          return res.status(404).json({ error: `Artist profile not found for userId=${userId}, email=${user.email}. Tried email lookup and name matching.` });
        }
      }
      
      // Get all inquiries for this artist
      const inquiries = await storage.getInquiriesByVendor(userId);
      
      // Also get threads (from embed form submissions)
      const threads = await storage.getThreadsByArtist(profile.id);
      
      // Convert threads to inquiry-like format and combine
      const threadItems = threads.map(thread => ({
        id: thread.id,
        threadToken: thread.threadPublicToken,
        clientName: thread.clientName,
        clientEmail: thread.clientEmail,
        eventDate: thread.eventDate,
        eventLocation: null,
        status: thread.status || 'inquiry',
        createdAt: thread.createdAt,
        depositPaidAt: null,
        isThread: true,
      }));
      
      const inquiryItems = inquiries.map(inq => ({
        id: inq.id,
        threadToken: inq.threadToken,
        clientName: inq.clientName,
        clientEmail: inq.clientEmail,
        eventDate: inq.eventDate,
        eventLocation: inq.eventLocation,
        status: inq.status,
        createdAt: inq.createdAt,
        depositPaidAt: (inq as any).depositPaidAt,
        isThread: false,
      }));
      
      // Combine and sort by createdAt descending
      const allItems = [...threadItems, ...inquiryItems].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      res.json({
        artist: {
          id: profile.id,
          businessName: profile.businessName,
          artistSlug: profile.artistSlug,
          autoResponderMode: (profile as any).autoResponderMode || 'off',
          editToken: profile.editToken,
        },
        inquiries: allItems
      });
    } catch (error: any) {
      console.error("[Artist Admin Session] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Artist settings - session-based auth (for logged in artists)
  app.get("/api/artist/settings", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'artist') {
        return res.status(403).json({ error: "Not an artist" });
      }
      
      const profile = await storage.getArtistProfile(userId);
      if (!profile) {
        return res.status(404).json({ error: "Artist profile not found" });
      }
      
      res.json({
        userId: profile.userId,
        artistSlug: profile.artistSlug,
        businessName: profile.businessName,
        artistName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || profile.businessName,
        contactEmail: user.email,
        infoSheetType: profile.infoSheetType || 'template',
        infoSheetContent: profile.infoSheetContent,
        infoSheetPdfUrl: profile.infoSheetPdfUrl,
        infoSheetEnabled: profile.infoSheetEnabled ?? true,
        formSuccessMessage: profile.formSuccessMessage,
        autoResponderMode: (profile as any).autoResponderMode || 'off',
        pauseMessage: (profile as any).customResponse,
        politeDeclineTemplate: (profile as any).politeDeclineTemplate,
        referralListTemplate: (profile as any).referralListTemplate,
        pricingInfo: (profile as any).pricingInfo,
        plannerInfoSheet: (profile as any).plannerInfoSheet,
        plannerPricing: (profile as any).plannerPricing,
      });
    } catch (error: any) {
      console.error("[Artist Settings Session] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update artist contact email - token-based auth (for magic link users)
  app.patch("/api/public/artist/email", async (req, res) => {
    try {
      const { token } = req.query;
      const { email } = req.body;
      
      if (!token) {
        return res.status(401).json({ error: "Access token required" });
      }
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: "Email is required" });
      }
      
      // Find artist by edit token
      const profile = await storage.getArtistProfileByEditToken(token as string);
      if (!profile) {
        return res.status(401).json({ error: "Invalid access token" });
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      
      // Update the user's email
      await storage.updateUser(profile.userId, { email: email.toLowerCase().trim() });
      
      res.json({
        success: true,
        email: email.toLowerCase().trim(),
        message: "Contact email updated successfully"
      });
    } catch (error: any) {
      console.error("[Public Artist Email Update] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update artist contact email - session-based auth
  app.patch("/api/artist/email", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'artist') {
        return res.status(403).json({ error: "Not an artist" });
      }
      
      const { email } = req.body;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: "Email is required" });
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      
      // Update the user's email
      await storage.updateUser(userId, { email: email.toLowerCase().trim() });
      
      res.json({
        success: true,
        email: email.toLowerCase().trim(),
        message: "Contact email updated successfully"
      });
    } catch (error: any) {
      console.error("[Artist Email Update] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update artist settings - session-based auth
  app.patch("/api/artist/settings", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'artist') {
        return res.status(403).json({ error: "Not an artist" });
      }
      
      const profile = await storage.getArtistProfile(userId);
      if (!profile) {
        return res.status(404).json({ error: "Artist profile not found" });
      }
      
      const { infoSheetType, infoSheetContent, infoSheetPdfUrl, infoSheetEnabled, formSuccessMessage, autoResponderMode, customResponse, politeDeclineTemplate, referralListTemplate, pricingInfo, plannerInfoSheet, plannerPricing } = req.body;
      
      const updateData: Partial<ArtistProfile> = {};
      if (infoSheetType !== undefined) updateData.infoSheetType = infoSheetType;
      if (infoSheetContent !== undefined) updateData.infoSheetContent = infoSheetContent;
      if (infoSheetPdfUrl !== undefined) updateData.infoSheetPdfUrl = infoSheetPdfUrl;
      if (infoSheetEnabled !== undefined) updateData.infoSheetEnabled = infoSheetEnabled;
      if (formSuccessMessage !== undefined) updateData.formSuccessMessage = formSuccessMessage;
      if (autoResponderMode !== undefined) updateData.autoResponderMode = autoResponderMode;
      if (customResponse !== undefined) updateData.customResponse = customResponse;
      if (politeDeclineTemplate !== undefined) updateData.politeDeclineTemplate = politeDeclineTemplate;
      if (referralListTemplate !== undefined) updateData.referralListTemplate = referralListTemplate;
      if (pricingInfo !== undefined) updateData.pricingInfo = pricingInfo;
      if (plannerInfoSheet !== undefined) updateData.plannerInfoSheet = plannerInfoSheet;
      if (plannerPricing !== undefined) updateData.plannerPricing = plannerPricing;
      
      const updatedProfile = await storage.updateArtistProfile(userId, updateData);
      
      res.json({
        success: true,
        infoSheetType: updatedProfile?.infoSheetType,
        infoSheetPdfUrl: updatedProfile?.infoSheetPdfUrl,
        infoSheetEnabled: updatedProfile?.infoSheetEnabled,
        formSuccessMessage: updatedProfile?.formSuccessMessage,
      });
    } catch (error: any) {
      console.error("[Artist Settings Update Session] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update artist slug - session-based auth
  app.patch("/api/artist/slug", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'artist') {
        return res.status(403).json({ error: "Not an artist" });
      }
      
      const profile = await storage.getArtistProfile(userId);
      if (!profile) {
        return res.status(404).json({ error: "Artist profile not found" });
      }
      
      const { newSlug } = req.body;
      if (!newSlug || typeof newSlug !== 'string') {
        return res.status(400).json({ error: "New slug is required" });
      }
      
      // Sanitize slug - lowercase, alphanumeric only
      const sanitizedSlug = newSlug.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (sanitizedSlug.length < 3) {
        return res.status(400).json({ error: "Slug must be at least 3 characters" });
      }
      
      // Check if slug is already taken by another artist
      const existingProfile = await storage.getArtistProfileBySlug(sanitizedSlug);
      if (existingProfile && String(existingProfile.userId) !== String(userId)) {
        console.log(`[Slug Conflict] Slug "${sanitizedSlug}" requested by userId: ${userId} but owned by userId: ${existingProfile.userId}`);
        return res.status(409).json({ 
          error: "This link is registered to another account. Contact support if you believe this is an error.",
          debug: { requestedSlug: sanitizedSlug }
        });
      }
      
      // If user is trying to set the same slug they already have, that's fine
      if (profile.artistSlug === sanitizedSlug) {
        return res.json({
          success: true,
          artistSlug: sanitizedSlug,
          message: `Your link is already: dateinquiry.com/${sanitizedSlug}`
        });
      }
      
      const updatedProfile = await storage.updateArtistProfile(userId, { artistSlug: sanitizedSlug });
      
      res.json({
        success: true,
        artistSlug: updatedProfile?.artistSlug,
        message: `Your new link is: dateinquiry.com/${sanitizedSlug}`
      });
    } catch (error: any) {
      console.error("[Artist Slug Update] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update artist slug - token-based auth (for magic link users)
  app.patch("/api/public/artist/slug", async (req, res) => {
    try {
      const { token } = req.query;
      const { newSlug } = req.body;
      
      if (!token) {
        return res.status(401).json({ error: "Access token required" });
      }
      
      if (!newSlug || typeof newSlug !== 'string') {
        return res.status(400).json({ error: "New slug is required" });
      }
      
      // Find artist by edit token
      const profile = await storage.getArtistProfileByEditToken(token as string);
      if (!profile) {
        return res.status(401).json({ error: "Invalid access token" });
      }
      
      // Sanitize slug - lowercase, alphanumeric only
      const sanitizedSlug = newSlug.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (sanitizedSlug.length < 3) {
        return res.status(400).json({ error: "Slug must be at least 3 characters" });
      }
      
      // Check if slug is already taken by another artist
      const existingProfile = await storage.getArtistProfileBySlug(sanitizedSlug);
      if (existingProfile && String(existingProfile.userId) !== String(profile.userId)) {
        return res.status(409).json({ 
          error: "This link is already taken. Try a different name."
        });
      }
      
      // If same slug, just return success
      if (profile.artistSlug === sanitizedSlug) {
        return res.json({
          success: true,
          artistSlug: sanitizedSlug,
          editToken: profile.editToken,
          message: `Your link is already: dateinquiry.com/${sanitizedSlug}`
        });
      }
      
      const updatedProfile = await storage.updateArtistProfile(profile.userId, { artistSlug: sanitizedSlug });
      
      res.json({
        success: true,
        artistSlug: updatedProfile?.artistSlug,
        editToken: profile.editToken,
        message: `Your new link is: dateinquiry.com/${sanitizedSlug}`
      });
    } catch (error: any) {
      console.error("[Public Artist Slug Update] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Artist admin dashboard (slug + token required for security)
  app.get("/api/public/artist-admin/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const { token } = req.query;
      
      console.log("[ArtistAdmin] Looking up slug:", slug, "token:", token ? "provided" : "missing");
      
      if (!token) {
        return res.status(401).json({ error: "Access token required" });
      }
      
      // Look up profile by token directly (more reliable than slug + token verification)
      let profile = await storage.getArtistProfileByEditToken(token as string);
      
      // Fallback: try by slug and verify token
      if (!profile) {
        profile = await storage.getArtistProfileBySlug(slug);
        if (profile && profile.editToken !== token) {
          console.log("[ArtistAdmin] Token mismatch for slug:", slug);
          return res.status(401).json({ error: "Invalid access token" });
        }
      }
      
      if (!profile) {
        console.log("[ArtistAdmin] No profile found for token or slug:", slug);
        return res.status(404).json({ error: `Artist not found` });
      }
      
      console.log("[ArtistAdmin] Found profile:", profile.id, "actualSlug:", profile.artistSlug);
      
      // Get all inquiries for this artist
      const inquiries = await storage.getInquiriesByVendor(profile.userId);
      
      // Also get threads (from embed form submissions)
      const threads = await storage.getThreadsByArtist(profile.id);
      
      // Convert threads to inquiry-like format and combine
      const threadItems = threads.map(thread => ({
        id: thread.id,
        threadToken: thread.threadPublicToken,
        clientName: thread.clientName,
        clientEmail: thread.clientEmail,
        eventDate: thread.eventDate,
        eventLocation: null,
        status: thread.status || 'inquiry',
        createdAt: thread.createdAt,
        depositPaidAt: null,
        isThread: true,
      }));
      
      const inquiryItems = inquiries.map(inq => ({
        id: inq.id,
        threadToken: inq.threadToken,
        clientName: inq.clientName,
        clientEmail: inq.clientEmail,
        eventDate: inq.eventDate,
        eventLocation: inq.eventLocation,
        status: inq.status,
        createdAt: inq.createdAt,
        depositPaidAt: (inq as any).depositPaidAt,
        isThread: false,
      }));
      
      // Combine and sort by createdAt descending
      const allItems = [...threadItems, ...inquiryItems].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      res.json({
        artist: {
          id: profile.id,
          businessName: profile.businessName,
          artistSlug: profile.artistSlug,
        },
        inquiries: allItems
      });
    } catch (error: any) {
      console.error("[Artist Admin] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ARCHIVE: All clients + all contracts for an artist (read-only folder view)
  app.get("/api/public/artist-archive/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const { token } = req.query;
      const sessionUserId = (req.session as any)?.userId;

      // Resolve profile by slug first (slug is the requested identity)
      const profile = await storage.getArtistProfileBySlug(slug);
      if (!profile) {
        return res.status(404).json({ error: "Artist not found" });
      }

      // Authorize: token MUST match the slug's editToken, OR session user must own the profile.
      // If both are present they must agree.
      const tokenOk = token && profile.editToken && token === profile.editToken;
      const sessionOk = sessionUserId && profile.userId === sessionUserId;
      if (!tokenOk && !sessionOk) {
        return res.status(401).json({ error: "Access denied" });
      }
      if (token && sessionUserId && !tokenOk) {
        return res.status(401).json({ error: "Token does not match this account" });
      }

      const inquiriesRaw = await storage.getInquiriesByVendor(profile.userId);
      const contractsRaw = await storage.getContractsByArtist(profile.userId);

      const inquiries = inquiriesRaw
        .map((inq: any) => ({
          id: inq.id,
          threadToken: inq.threadToken,
          clientName: inq.clientName,
          clientEmail: inq.clientEmail,
          clientPhone: inq.clientPhone || null,
          eventDate: inq.eventDate,
          eventLocation: inq.eventLocation || null,
          eventType: inq.eventType || null,
          message: inq.message || null,
          status: inq.status,
          createdAt: inq.createdAt,
          depositPaidAt: inq.depositPaidAt || null,
          infoSheetSentAt: inq.infoSheetSentAt || null,
        }))
        .sort((a: any, b: any) => {
          const dA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dB - dA;
        });

      const contracts = contractsRaw.map((c: any) => ({
        id: c.id,
        inquiryId: c.inquiryId || null,
        bookingId: c.bookingId || null,
        clientName: c.clientName || c.signedByName || null,
        clientEmail: c.signedByEmail || c.clientContact || null,
        totalAmount: c.totalAmount,
        depositAmount: c.depositAmount,
        status: c.status,
        eventDates: c.eventDates || null,
        eventLocation: c.eventLocation || null,
        sentForSigningAt: c.sentForSigningAt || null,
        signedAt: c.signedAt || null,
        artistSignedAt: c.artistSignedAt || null,
        hasSigningLink: !!c.signingToken,
        fileUrl: c.fileUrl || null,
        openSignCertificateUrl: c.openSignCertificateUrl || null,
        createdAt: c.createdAt,
      }));

      res.json({
        artist: {
          id: profile.id,
          businessName: profile.businessName,
          artistSlug: profile.artistSlug,
        },
        inquiries,
        contracts,
      });
    } catch (error: any) {
      console.error("[Artist Archive] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Public inquiry submission (supports both artistSlug and username)
  app.post("/api/public/inquiries", async (req, res) => {
    try {
      const { artistSlug, clientName, clientEmail, eventDate, location, message } = req.body;
      
      if (!artistSlug || !clientName || !clientEmail || !eventDate) {
        return res.status(400).json({ error: "Artist, name, email, and event date are required" });
      }
      
      // First try to find by artist slug
      let profile = await storage.getArtistProfileBySlug(artistSlug);
      
      // If not found by slug, try to find by username
      if (!profile) {
        const userByUsername = await storage.getUserByUsername(artistSlug);
        if (userByUsername && userByUsername.role === 'artist') {
          profile = await storage.getArtistProfile(userByUsername.id);
        }
      }
      
      if (!profile) {
        return res.status(404).json({ error: "Artist not found" });
      }
      
      // Create inquiry
      const inquiry = await storage.createInquiry({
        vendorId: profile.userId,
        clientName,
        clientEmail,
        eventDate: new Date(eventDate),
        eventLocation: location || null,
        message: message || null,
        serviceType: 'beauty',
        status: 'pending',
        metadata: { source: 'public_calendar', artistSlug }
      });
      
      // Analyze sentiment (async)
      if (message) {
        analyzeInquirySentiment(inquiry.id, message, { clientName, eventDate: new Date(eventDate) })
          .catch(err => console.error('[Sentiment] Background analysis failed:', err));
      }
      
      // Track analytics event
      await storage.createAnalyticsEvent({
        eventType: 'chat_started',
        artistId: profile.userId,
        inquiryId: inquiry.id,
        metadata: { clientEmail, artistSlug }
      });
      
      // Send immediate SMS and email notifications
      const artist = await storage.getUser(profile.userId);
      const artistProfile = await storage.getArtistProfile(profile.userId);
      
      // Use production URL for notifications
      const prodUrl = process.env.PUBLIC_BASE_URL || 'https://briarwood.ai';
      
      // Dry-run: when the operator has assistant dry-run enabled, suppress the
      // real operator alert SMS/email so nothing leaves the system during a demo.
      // The inquiry is still created above; only delivery is skipped and logged.
      const operatorDryRun = !!artistProfile?.assistantDryRun;

      // Try to send SMS notification
      if (artist?.phone) {
        if (operatorDryRun) {
          console.log(`[Public Inquiry] Dry-run: skipped operator SMS alert to ${artist.phone}`);
        } else {
          try {
            await smsService.sendSms(
              artist.phone,
              `${clientName} wants to chat about booking ${new Date(eventDate).toLocaleDateString()}. Respond here: ${prodUrl}/artist`
            );
          } catch (smsError) {
            console.error("[Public Inquiry] SMS send failed:", smsError);
          }
        }
      }
      
      // Send email notification to artist
      if (artist?.email) {
        if (operatorDryRun) {
          console.log(`[Public Inquiry] Dry-run: skipped operator email alert to ${artist.email}`);
        } else {
          try {
            const { sendInquiryNotificationEmail } = await import('./emailService');
            await sendInquiryNotificationEmail({
              toEmail: artist.email,
              vendorName: artistProfile?.businessName || artist.firstName || 'Artist',
              clientName,
              clientEmail,
              eventDate: new Date(eventDate).toLocaleDateString('en-US', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
              }),
              location: location || undefined,
              message: message || 'No message provided',
              inquiryLink: `${prodUrl}/inquiry/${inquiry.threadToken}`
            });
          } catch (emailError) {
            console.error("[Public Inquiry] Email send failed:", emailError);
          }
        }
      }
      
      // Auto-send info sheet with chat link to client if vendor has info sheet enabled
      const hasInfoSheet = artistProfile?.infoSheetEnabled && (
        artistProfile?.infoSheetContent || 
        (artistProfile?.infoSheetType === 'pdf' && artistProfile?.infoSheetPdfUrl)
      );
      
      if (hasInfoSheet) {
        try {
          // Create chat invite token for the client
          const chatToken = randomUUID();
          const chatExpiresAt = new Date();
          chatExpiresAt.setDate(chatExpiresAt.getDate() + 30); // 30 day expiry
          
          await storage.createChatInvite({
            senderId: profile.userId,
            inviteeEmail: clientEmail,
            status: 'pending',
            inquiryId: inquiry.id,
            token: chatToken,
            expiresAt: chatExpiresAt,
          });
          
          const chatLink = `${prodUrl}/chat-invite/${chatToken}`;
          const vendorName = artistProfile?.businessName || artist?.firstName || 'Your Artist';
          const formattedEventDate = new Date(eventDate).toLocaleDateString('en-US', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
          });
          
          // Send info sheet email with chat link
          const { sendInfoSheetEmail } = await import('./emailService');
          await sendInfoSheetEmail({
            toEmail: clientEmail,
            vendorName,
            vendorEmail: artist?.email || undefined,
            infoSheetContent: artistProfile?.infoSheetContent || undefined,
            infoSheetPdfUrl: artistProfile?.infoSheetPdfUrl || undefined,
            infoSheetType: (artistProfile?.infoSheetType as 'template' | 'custom' | 'pdf') || 'template',
            eventDate: formattedEventDate,
            serviceType: 'Beauty Services',
            chatLink
          });
          
          // Update inquiry with info sheet sent timestamp
          await storage.updateInquiry(inquiry.id, { infoSheetSentAt: new Date() } as any);
          console.log('[Public Inquiry] Info sheet with chat link sent to', clientEmail);
        } catch (infoSheetError) {
          console.error("[Public Inquiry] Info sheet send failed:", infoSheetError);
        }
      }
      
      res.json({ success: true, inquiryId: inquiry.id });
    } catch (error: any) {
      console.error("[Public Inquiry] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // External form submission endpoint (slug in URL for HTML forms)
  app.post("/api/public/inquiries/:artistSlug", async (req, res) => {
    try {
      const artistSlug = req.params.artistSlug;
      const { clientName, clientEmail, clientPhone, eventDate, eventLocation, message, redirectUrl } = req.body;
      
      if (!clientName || !clientEmail || !eventDate) {
        // If there's a redirect URL, redirect with error
        if (redirectUrl) {
          return res.redirect(`${redirectUrl}?error=missing_fields`);
        }
        return res.status(400).json({ error: "Name, email, and event date are required" });
      }
      
      // Find artist by slug
      let profile = await storage.getArtistProfileBySlug(artistSlug);
      if (!profile) {
        const userByUsername = await storage.getUserByUsername(artistSlug);
        if (userByUsername && userByUsername.role === 'artist') {
          profile = await storage.getArtistProfile(userByUsername.id);
        }
      }
      
      if (!profile) {
        if (redirectUrl) {
          return res.redirect(`${redirectUrl}?error=artist_not_found`);
        }
        return res.status(404).json({ error: "Artist not found" });
      }
      
      // Create inquiry
      const inquiry = await storage.createInquiry({
        vendorId: profile.userId,
        clientName,
        clientEmail,
        eventDate: new Date(eventDate),
        eventLocation: eventLocation || null,
        message: message || null,
        serviceType: 'beauty',
        status: 'pending',
        metadata: { source: 'external_form', artistSlug }
      });
      
      // Analyze sentiment (async)
      if (message) {
        analyzeInquirySentiment(inquiry.id, message, { clientName, eventDate: new Date(eventDate) })
          .catch(err => console.error('[Sentiment] Background analysis failed:', err));
      }
      
      // Track analytics
      await storage.createAnalyticsEvent({
        eventType: 'chat_started',
        artistId: profile.userId,
        inquiryId: inquiry.id,
        metadata: { clientEmail, artistSlug, source: 'external_form' }
      });
      
      // Send notifications to artist
      const artist = await storage.getUser(profile.userId);
      const artistProfile = await storage.getArtistProfile(profile.userId);
      const prodUrl = process.env.PUBLIC_BASE_URL || 'https://briarwood.ai';
      
      // Dry-run: when the operator has assistant dry-run enabled, suppress the
      // real operator alert SMS/email so nothing leaves the system during a demo.
      // The inquiry is still created above; only delivery is skipped and logged.
      const operatorDryRun = !!artistProfile?.assistantDryRun;

      if (artist?.phone) {
        if (operatorDryRun) {
          console.log(`[External Form] Dry-run: skipped operator SMS alert to ${artist.phone}`);
        } else {
          try {
            await smsService.sendSms(
              artist.phone,
              `${clientName} wants to chat about booking ${new Date(eventDate).toLocaleDateString()}. Respond here: ${prodUrl}/artist`
            );
          } catch (smsError) {
            console.error("[External Form] SMS send failed:", smsError);
          }
        }
      }
      
      if (artist?.email) {
        if (operatorDryRun) {
          console.log(`[External Form] Dry-run: skipped operator email alert to ${artist.email}`);
        } else {
          try {
            const { sendInquiryNotificationEmail } = await import('./emailService');
            await sendInquiryNotificationEmail({
              toEmail: artist.email,
              vendorName: artistProfile?.businessName || artist.firstName || 'Artist',
              clientName,
              clientEmail,
              eventDate: new Date(eventDate).toLocaleDateString('en-US', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
              }),
              location: eventLocation || undefined,
              message: message || 'No message provided',
              inquiryLink: `${prodUrl}/inquiry/${inquiry.threadToken}`
            });
          } catch (emailError) {
            console.error("[External Form] Email send failed:", emailError);
          }
        }
      }
      
      // Auto-send info sheet if enabled
      const hasInfoSheet = artistProfile?.infoSheetEnabled && (
        artistProfile?.infoSheetContent || 
        (artistProfile?.infoSheetType === 'pdf' && artistProfile?.infoSheetPdfUrl)
      );
      
      if (hasInfoSheet) {
        try {
          const chatToken = randomUUID();
          const chatExpiresAt = new Date();
          chatExpiresAt.setDate(chatExpiresAt.getDate() + 30);
          
          await storage.createChatInvite({
            senderId: profile.userId,
            inviteeEmail: clientEmail,
            status: 'pending',
            inquiryId: inquiry.id,
            token: chatToken,
            expiresAt: chatExpiresAt,
          });
          
          const chatLink = `${prodUrl}/chat-invite/${chatToken}`;
          const vendorName = artistProfile?.businessName || artist?.firstName || 'Your Artist';
          const formattedEventDate = new Date(eventDate).toLocaleDateString('en-US', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
          });
          
          const { sendInfoSheetEmail } = await import('./emailService');
          await sendInfoSheetEmail({
            toEmail: clientEmail,
            vendorName,
            vendorEmail: artist?.email || undefined,
            infoSheetContent: artistProfile?.infoSheetContent || undefined,
            infoSheetPdfUrl: artistProfile?.infoSheetPdfUrl || undefined,
            infoSheetType: (artistProfile?.infoSheetType as 'template' | 'custom' | 'pdf') || 'template',
            eventDate: formattedEventDate,
            serviceType: 'Beauty Services',
            chatLink
          });
          
          await storage.updateInquiry(inquiry.id, { infoSheetSentAt: new Date() } as any);
        } catch (infoSheetError) {
          console.error("[External Form] Info sheet send failed:", infoSheetError);
        }
      }
      
      // Redirect to thank you page or return JSON
      if (redirectUrl) {
        return res.redirect(`${redirectUrl}?success=true`);
      }
      
      res.json({ success: true, inquiryId: inquiry.id });
    } catch (error: any) {
      console.error("[External Form Inquiry] Error:", error);
      const redirectUrl = req.body.redirectUrl;
      if (redirectUrl) {
        return res.redirect(`${redirectUrl}?error=server_error`);
      }
      res.status(500).json({ error: error.message });
    }
  });
  
  // Public analytics metrics
  app.get("/api/public/analytics/metrics", async (req, res) => {
    try {
      const metrics = await storage.getAnalyticsMetrics24h();
      res.json({
        calendarsCreated: metrics.calendarsCreated || 0,
        chatsStarted: metrics.chatsStarted || 0,
        artistActivationRate: metrics.artistActivationRate || 0,
        chatsPerCalendar: metrics.chatsPerCalendar || 0,
        lastUpdated: new Date().toISOString()
      });
    } catch (error: any) {
      console.error("[Analytics Metrics] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Public leaderboard
  app.get("/api/public/analytics/leaderboard", async (req, res) => {
    try {
      const leaderboard = await storage.getArtistLeaderboard();
      res.json(leaderboard);
    } catch (error: any) {
      console.error("[Analytics Leaderboard] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // =====================
  // PROPOSALS
  // =====================
  
  // Create proposal
  app.post("/api/proposals", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { clientName, clientEmail, clientPhone, clientCompany, eventDate, eventLocation, completionTime, lineItems, travelFee, discount, notes, terms, validUntil } = req.body;
      
      if (!clientName || !clientEmail) {
        return res.status(400).json({ error: "Client name and email are required" });
      }
      
      const subtotal = (lineItems || []).reduce((sum: number, item: any) => 
        sum + ((item.unitPrice || 0) * (item.quantity || 1)), 0);
      const total = subtotal + (travelFee || 0) - (discount || 0);
      
      const proposal = await storage.createProposal({
        artistId: userId,
        clientName,
        clientEmail,
        clientPhone: clientPhone || null,
        clientCompany: clientCompany || null,
        eventDate: eventDate ? new Date(eventDate) : null,
        eventLocation: eventLocation || null,
        completionTime: completionTime || null,
        lineItems: lineItems || [],
        subtotal,
        travelFee: travelFee || 0,
        discount: discount || 0,
        total,
        notes: notes || null,
        terms: terms || null,
        validUntil: validUntil ? new Date(validUntil) : null,
        status: 'draft'
      });
      res.json(proposal);
    } catch (error: any) {
      console.error("[Create Proposal] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get all proposals for current user
  app.get("/api/proposals", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const proposals = await storage.getProposalsByArtist(userId);
      res.json(proposals);
    } catch (error: any) {
      console.error("[Get Proposals] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get single proposal
  app.get("/api/proposals/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const proposal = await storage.getProposal(req.params.id);
      if (!proposal) return res.status(404).json({ error: "Proposal not found" });
      if (proposal.artistId !== userId) return res.status(403).json({ error: "Not authorized" });
      res.json(proposal);
    } catch (error: any) {
      console.error("[Get Proposal] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update proposal
  app.patch("/api/proposals/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const existing = await storage.getProposal(req.params.id);
      if (!existing) return res.status(404).json({ error: "Proposal not found" });
      if (existing.artistId !== userId) return res.status(403).json({ error: "Not authorized" });
      
      const { clientName, clientEmail, clientPhone, clientCompany, eventDate, eventLocation, completionTime, lineItems, travelFee, discount, notes, terms, validUntil, status } = req.body;
      
      const updateData: Partial<Proposal> = {};
      if (clientName !== undefined) updateData.clientName = clientName;
      if (clientEmail !== undefined) updateData.clientEmail = clientEmail;
      if (clientPhone !== undefined) updateData.clientPhone = clientPhone || null;
      if (clientCompany !== undefined) updateData.clientCompany = clientCompany || null;
      if (eventDate !== undefined) updateData.eventDate = eventDate ? new Date(eventDate) : null;
      if (eventLocation !== undefined) updateData.eventLocation = eventLocation || null;
      if (completionTime !== undefined) updateData.completionTime = completionTime || null;
      if (notes !== undefined) updateData.notes = notes || null;
      if (terms !== undefined) updateData.terms = terms || null;
      if (validUntil !== undefined) updateData.validUntil = validUntil ? new Date(validUntil) : null;
      if (status !== undefined) updateData.status = status;
      
      if (lineItems !== undefined) {
        updateData.lineItems = lineItems;
        const subtotal = (lineItems || []).reduce((sum: number, item: any) => 
          sum + ((item.unitPrice || 0) * (item.quantity || 1)), 0);
        updateData.subtotal = subtotal;
        updateData.travelFee = travelFee ?? existing.travelFee ?? 0;
        updateData.discount = discount ?? existing.discount ?? 0;
        updateData.total = subtotal + updateData.travelFee - updateData.discount;
      } else if (travelFee !== undefined || discount !== undefined) {
        updateData.travelFee = travelFee ?? existing.travelFee ?? 0;
        updateData.discount = discount ?? existing.discount ?? 0;
        updateData.total = (existing.subtotal || 0) + updateData.travelFee - updateData.discount;
      }
      
      const proposal = await storage.updateProposal(req.params.id, updateData);
      res.json(proposal);
    } catch (error: any) {
      console.error("[Update Proposal] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Send proposal via email
  app.post("/api/proposals/:id/send", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const proposal = await storage.getProposal(req.params.id);
      if (!proposal) return res.status(404).json({ error: "Proposal not found" });
      if (proposal.artistId !== userId) return res.status(403).json({ error: "Not authorized" });
      
      // Get artist profile and user info
      const user = await storage.getUser(userId);
      const artistProfile = await storage.getArtistProfile(userId);
      
      // Create a chat invite token for the client
      const token = randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 day expiry for proposal chat links
      
      await storage.createChatInvite({
        senderId: userId,
        inviteeEmail: proposal.clientEmail,
        status: 'pending',
        token,
        expiresAt,
      });
      
      // Build chat link using production URL
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://briarwood.ai';
      const chatLink = `${baseUrl}/chat-invite/${token}`;
      
      // Send email
      const { sendProposalEmail } = await import('./emailService');
      const result = await sendProposalEmail({
        toEmail: proposal.clientEmail,
        clientName: proposal.clientName,
        artistName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || artistProfile?.businessName || 'Your Beauty Artist',
        businessName: artistProfile?.businessName || '',
        proposal,
        chatLink
      });
      
      if (result.success) {
        await storage.updateProposal(proposal.id, { 
          status: 'sent',
          sentAt: new Date()
        });
        res.json({ success: true });
      } else {
        res.status(500).json({ error: result.error || 'Failed to send email' });
      }
    } catch (error: any) {
      console.error("[Send Proposal] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Delete proposal
  app.delete("/api/proposals/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const existing = await storage.getProposal(req.params.id);
      if (!existing) return res.status(404).json({ error: "Proposal not found" });
      if (existing.artistId !== userId) return res.status(403).json({ error: "Not authorized" });
      
      await storage.deleteProposal(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Delete Proposal] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Resend chat link for a proposal (sends a follow-up email with working chat link)
  app.post("/api/proposals/:id/resend-chat-link", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const proposal = await storage.getProposal(req.params.id);
      if (!proposal) return res.status(404).json({ error: "Proposal not found" });
      if (proposal.artistId !== userId) return res.status(403).json({ error: "Not authorized" });
      
      // Get artist profile and user info
      const user = await storage.getUser(userId);
      const artistProfile = await storage.getArtistProfile(userId);
      const vendorName = artistProfile?.businessName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Your Beauty Artist';
      
      // Create a new chat invite token
      const token = randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      await storage.createChatInvite({
        senderId: userId,
        inviteeEmail: proposal.clientEmail,
        status: 'pending',
        token,
        expiresAt,
      });
      
      // Build chat link - use production URL
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://briarwood.ai';
      const chatLink = `${baseUrl}/chat-invite/${token}`;
      
      // Send chat invite email
      const { sendChatInviteEmail } = await import('./emailService');
      const result = await sendChatInviteEmail({
        toEmail: proposal.clientEmail,
        vendorName,
        clientName: proposal.clientName,
        chatLink,
        eventDate: proposal.eventDate ? new Date(proposal.eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : undefined,
      });
      
      if (result.success) {
        res.json({ success: true, message: "Chat link sent!" });
      } else {
        res.status(500).json({ error: result.error || 'Failed to send email' });
      }
    } catch (error: any) {
      console.error("[Resend Chat Link] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // PUBLIC WEBHOOK - External Contact Form Submissions
  // This endpoint allows external websites to submit contact forms
  // directly to Briarwood as inquiries. The "invisible secretary."
  // ============================================================
  
  // CORS preflight for external form submissions
  app.options("/api/public/contact-webhook", (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
    res.status(204).end();
  });
  
  app.post("/api/public/contact-webhook", async (req, res) => {
    // Allow cross-origin requests from artist websites
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    try {
      const { 
        artistSlug,         // Required: identifies which artist receives the inquiry
        clientName,         // Required: client's name
        clientEmail,        // Required: client's email
        clientPhone,        // Optional: client's phone
        eventDate,          // Optional: event date (ISO string or parseable date)
        serviceType,        // Optional: type of service requested
        message,            // Optional: client's message
        source,             // Optional: source identifier (e.g., "makeup-dolls", "website")
        partySize,          // Optional: number of people
        budget,             // Optional: mentioned budget
        apiKey              // Optional: for future rate limiting/auth
      } = req.body;
      
      // Validate required fields
      if (!artistSlug) {
        return res.status(400).json({ error: "artistSlug is required" });
      }
      if (!clientName) {
        return res.status(400).json({ error: "clientName is required" });
      }
      if (!clientEmail) {
        return res.status(400).json({ error: "clientEmail is required" });
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clientEmail)) {
        return res.status(400).json({ error: "Invalid email format" });
      }
      
      // Find the artist by slug
      const artistProfile = await storage.getArtistProfileBySlug(artistSlug);
      if (!artistProfile) {
        return res.status(404).json({ error: "Artist not found" });
      }
      
      // Parse event date - default to 1 month from now if not provided (eventDate is required in schema)
      let parsedEventDate: Date;
      if (eventDate) {
        try {
          const parsed = new Date(eventDate);
          if (!isNaN(parsed.getTime())) {
            parsedEventDate = parsed;
          } else {
            parsedEventDate = new Date();
            parsedEventDate.setMonth(parsedEventDate.getMonth() + 1);
          }
        } catch {
          parsedEventDate = new Date();
          parsedEventDate.setMonth(parsedEventDate.getMonth() + 1);
        }
      } else {
        parsedEventDate = new Date();
        parsedEventDate.setMonth(parsedEventDate.getMonth() + 1);
      }
      
      // Build message with source info
      const fullMessage = source 
        ? `[Source: ${source}] ${message || ''}`
        : message || '';
      
      // Create the inquiry
      const inquiry = await storage.createInquiry({
        vendorId: artistProfile.userId,
        clientName,
        clientEmail,
        clientPhone: clientPhone || null,
        eventDate: parsedEventDate,
        serviceType: serviceType || 'Beauty Services',
        message: fullMessage || null,
        partySize: partySize ? parseInt(String(partySize), 10) : null,
        budget: budget ? String(budget) : null, // budget is text type in schema
        status: 'pending',
      });
      
      console.log(`[Public Webhook] Created inquiry ${inquiry.id} for artist ${artistSlug} from ${source || 'external'}`);
      console.log(`[Public Webhook] Inquiry threadToken: ${inquiry.threadToken}`);
      
      // Analyze sentiment (async)
      if (fullMessage) {
        analyzeInquirySentiment(inquiry.id, fullMessage, { clientName, eventDate: parsedEventDate })
          .catch(err => console.error('[Sentiment] Background analysis failed:', err));
      }
      
      // Get the artist for notifications
      const artist = await storage.getUser(artistProfile.userId);
      
      // Check auto-responder mode (off, info_sheet, smart, paused, availability_smart)
      // 'smart' = artist manually reviews each inquiry before responding
      // 'info_sheet' = automatically send pricing sheet immediately
      // 'paused' = vacation mode, no auto-responses
      // 'availability_smart' = check availability first, send referrals if booked, info sheet if available
      const autoResponderMode = artistProfile?.autoResponderMode || 'off';
      const hasInfoSheet = artistProfile?.infoSheetContent || 
        (artistProfile?.infoSheetType === 'pdf' && artistProfile?.infoSheetPdfUrl);
      
      // Handle availability_smart mode - check calendar before auto-responding
      if (autoResponderMode === 'availability_smart') {
        console.log(`[Public Webhook] Availability-smart mode for ${artistSlug}`);
        
        // Check if the requested date is blocked/booked
        (async () => {
          try {
            // Get blocked dates and confirmed bookings
            const allBookings = await storage.getBookingsByArtist(artistProfile.userId);
            const confirmedBookingDates = new Set<string>();
            for (const b of allBookings) {
              if (!b.eventDate) continue;
              if (['confirmed', 'deposit_paid', 'paid'].includes((b.status || '').toLowerCase())) {
                const d = new Date(b.eventDate);
                confirmedBookingDates.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
              }
            }
            
            // Check availability records
            const startOfYear = new Date(new Date().getFullYear(), 0, 1);
            const endOfNextYear = new Date(new Date().getFullYear() + 2, 11, 31);
            const allAvailability = await storage.getUserAvailability(artistProfile.userId, startOfYear, endOfNextYear);
            const blockedAvailabilityDates = new Set<string>();
            for (const a of allAvailability) {
              if (!a.isAvailable || a.notes === 'BOOKED') {
                const d = new Date(a.date);
                blockedAvailabilityDates.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
              }
            }
            
            // Check if requested date has conflict
            const dateKey = `${parsedEventDate.getFullYear()}-${String(parsedEventDate.getMonth() + 1).padStart(2, '0')}-${String(parsedEventDate.getDate()).padStart(2, '0')}`;
            const hasConflict = blockedAvailabilityDates.has(dateKey) || confirmedBookingDates.has(dateKey);
            
            const referrerName = artistProfile.businessName || artist?.firstName || 'The Artist';
            
            if (hasConflict) {
              // Date is unavailable - send referral list from trusted circle
              console.log(`[Public Webhook] Date ${dateKey} is unavailable, sending referrals`);
              
              const circleMembers = await storage.getTrustedCircle(artistProfile.userId);
              const activeMembers = circleMembers.filter(m => m.status === 'active');
              
              if (activeMembers.length > 0) {
                const { sendReferralNotificationEmail } = await import('./emailService');
                
                // Build referral vendors with info sheets
                const referralVendorsWithInfo = await Promise.all(activeMembers.map(async (m) => {
                  const memberUser = await storage.getUserByEmail(m.refereeEmail);
                  if (memberUser) {
                    const memberProfile = await storage.getArtistProfile(memberUser.id);
                    return {
                      name: memberProfile?.businessName || m.refereeName,
                      infoSheet: memberProfile?.infoSheetEnabled && memberProfile?.infoSheetContent 
                        ? memberProfile.infoSheetContent 
                        : undefined,
                      infoSheetPdfUrl: memberProfile?.infoSheetEnabled && memberProfile?.infoSheetPdfUrl
                        ? memberProfile.infoSheetPdfUrl
                        : undefined,
                      pricingInfo: memberProfile?.pricingInfo || undefined,
                    };
                  }
                  return { name: m.refereeName };
                }));
                
                await sendReferralNotificationEmail({
                  toEmail: clientEmail,
                  clientName,
                  referrerName,
                  declineReason: `Unfortunately, I'm already booked on ${parsedEventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.`,
                  referralMessage: artistProfile.referralListTemplate || `I've personally worked with these talented artists and can vouch for their work. I hope one of them can help make your day beautiful!`,
                  referralVendors: referralVendorsWithInfo,
                });
                
                // Update inquiry status
                await storage.updateInquiry(inquiry.id, { 
                  status: 'declined',
                  statusReason: 'Auto-declined with referrals (date unavailable)',
                  firstResponseAt: new Date(),
                } as any);
                
                // Log notification
                await storage.createInquiryNotification({
                  inquiryId: inquiry.id,
                  type: 'auto_referral',
                  channel: 'email',
                  recipientEmail: clientEmail,
                  subject: `Artist Recommendations from ${referrerName}`,
                  content: `Auto-sent referral list (${activeMembers.length} artists) - date was unavailable`,
                  status: 'sent',
                  sentAt: new Date(),
                });
                
                console.log(`[Public Webhook] Referral list sent to ${clientEmail} with ${activeMembers.length} artists`);
              } else {
                // No circle members - leave as pending for manual follow-up
                console.log(`[Public Webhook] Date unavailable but no circle members - left as pending`);
                await storage.updateInquiry(inquiry.id, { 
                  statusReason: 'Date unavailable, no circle members for referral - needs manual review',
                } as any);
              }
            } else if (hasInfoSheet) {
              // Date is available - send info sheet
              console.log(`[Public Webhook] Date ${dateKey} is available, sending info sheet`);
              const { sendInfoSheetEmail } = await import('./emailService');
              
              await sendInfoSheetEmail({
                toEmail: clientEmail,
                vendorName: referrerName,
                vendorEmail: artist?.email || undefined,
                infoSheetContent: artistProfile.infoSheetContent || undefined,
                infoSheetPdfUrl: artistProfile.infoSheetPdfUrl || undefined,
                infoSheetType: (artistProfile.infoSheetType as 'template' | 'custom' | 'pdf') || 'template',
                eventDate: parsedEventDate.toLocaleDateString('en-US', { 
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                }),
                serviceType: serviceType || 'Beauty Services'
              });
              
              await storage.updateInquiry(inquiry.id, { 
                infoSheetSentAt: new Date(),
                status: 'auto_responded',
                statusReason: 'Auto-responded with info sheet (date available)',
                firstResponseAt: new Date(),
              } as any);
              
              await storage.createInquiryNotification({
                inquiryId: inquiry.id,
                type: 'info_sheet',
                channel: 'email',
                recipientEmail: clientEmail,
                subject: `Information from ${referrerName}`,
                content: 'Auto-sent info sheet (availability check passed)',
                status: 'sent',
                sentAt: new Date(),
              });
              
              console.log(`[Public Webhook] Info sheet sent to ${clientEmail}`);
            } else {
              // Date available but no info sheet - leave as pending
              console.log(`[Public Webhook] Date ${dateKey} available but no info sheet configured`);
            }
          } catch (err: any) {
            console.error('[Public Webhook] Availability-smart error:', err);
            // On error, leave inquiry as pending for manual handling
          }
        })();
      }
      
      // Only auto-respond if mode is explicitly 'info_sheet' (not 'smart')
      // 'smart' mode requires artist to manually choose how to respond
      const shouldAutoRespond = autoResponderMode === 'info_sheet' && hasInfoSheet;
      
      if (shouldAutoRespond) {
        console.log(`[Public Webhook] Auto-responding with info sheet for ${artistSlug}`);
        import('./emailService').then(async ({ sendInfoSheetEmail }) => {
          try {
            await sendInfoSheetEmail({
              toEmail: clientEmail,
              vendorName: artistProfile.businessName || artist?.firstName || 'The Artist',
              vendorEmail: artist?.email || undefined,
              infoSheetContent: artistProfile.infoSheetContent || undefined,
              infoSheetPdfUrl: artistProfile.infoSheetPdfUrl || undefined,
              infoSheetType: (artistProfile.infoSheetType as 'template' | 'custom' | 'pdf') || 'template',
              eventDate: parsedEventDate.toLocaleDateString('en-US', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
              }),
              serviceType: serviceType || 'Beauty Services'
            });
            // Update inquiry status to auto_responded
            await storage.updateInquiry(inquiry.id, { 
              infoSheetSentAt: new Date(),
              status: 'auto_responded',
              statusReason: 'Auto-responded with info sheet',
              firstResponseAt: new Date(),
            } as any);
            // Log notification
            await storage.createInquiryNotification({
              inquiryId: inquiry.id,
              type: 'info_sheet',
              channel: 'email',
              recipientEmail: clientEmail,
              subject: `Information from ${artistProfile.businessName || 'Artist'}`,
              content: 'Auto-sent info sheet based on artist settings',
              status: 'sent',
              sentAt: new Date(),
            });
            console.log(`[Public Webhook] Info sheet sent to ${clientEmail}`);
          } catch (err: any) {
            console.error('[Public Webhook] Info sheet error:', err);
          }
        });
      }
      
      // Dry-run: when the operator has assistant dry-run enabled, suppress the
      // real operator alert SMS/email so nothing leaves the system during a demo.
      // The inquiry is still created above; only delivery is skipped and logged.
      const operatorDryRun = !!artistProfile?.assistantDryRun;

      // Send email notification to artist
      if (artist?.email) {
        if (operatorDryRun) {
          console.log(`[Public Webhook] Dry-run: skipped operator email alert to ${artist.email}`);
        } else {
          console.log(`[Public Webhook] Sending email notification to ${artist.email}`);
          try {
            const { sendInquiryNotificationEmail } = await import('./emailService');
            // Always use dateinquiry.com for white-label links
            const baseUrl = process.env.PUBLIC_BASE_URL || 'https://dateinquiry.com';
            
            const emailResult = await sendInquiryNotificationEmail({
              toEmail: artist.email,
              vendorName: artist.firstName || artistProfile.businessName || 'Artist',
              clientName,
              clientEmail,
              eventDate: parsedEventDate?.toLocaleDateString('en-US', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
              }) || 'Date TBD',
              message: message || `New ${serviceType || 'beauty'} inquiry from ${source || 'external form'}`,
              inquiryLink: `${baseUrl}/inquiry/${inquiry.threadToken}`
            });
            console.log(`[Public Webhook] Email result:`, JSON.stringify(emailResult));
          } catch (emailErr: any) {
            console.error('[Public Webhook] Email notification error:', emailErr.message, emailErr.stack);
          }
        }
      } else {
        console.log(`[Public Webhook] No email found for artist ${artistSlug}`);
      }
      
      // Send SMS notification if artist has phone
      if (artist?.phone) {
        if (operatorDryRun) {
          console.log(`[Public Webhook] Dry-run: skipped operator SMS alert to ${artist.phone}`);
        } else {
          try {
            await smsService.sendSMS(
              artist.phone,
              `New inquiry from ${clientName} (${source || 'external form'}) for ${parsedEventDate ? new Date(parsedEventDate).toLocaleDateString() : 'TBD'}. Check your dashboard!`
            );
          } catch (smsError) {
            console.error('[Public Webhook] SMS notification error:', smsError);
          }
        }
      }
      
      res.json({ 
        success: true, 
        inquiryId: inquiry.id,
        message: "Inquiry received successfully"
      });
    } catch (error: any) {
      console.error("[Public Webhook] Error:", error);
      res.status(500).json({ error: "Failed to process contact form" });
    }
  });
  
  // Public endpoint to get artist slug info (for external form integration)
  app.get("/api/public/artist/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const profile = await storage.getArtistProfileBySlug(slug);
      
      if (!profile) {
        return res.status(404).json({ error: "Artist not found" });
      }
      
      // Return only public info needed for form integration
      res.json({
        slug: profile.slug,
        businessName: profile.businessName || 'Beauty Artist',
        specialties: profile.specialties || [],
        location: profile.location || null
      });
    } catch (error: any) {
      console.error("[Public Artist Info] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // AUDIT LOGGING - Smart Button Actions from AI Chat
  // ============================================================
  const smartActionSchema = z.object({
    actionType: z.enum(['proposal', 'contract', 'payment']),
    source: z.string().optional().default('chat_smart_button'),
  });

  app.post("/api/audit/smart-action", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      
      const parseResult = smartActionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0].message });
      }
      
      const { actionType, source } = parseResult.data;
      
      await storage.createAuditLog({
        id: randomUUID(),
        action: `smart_button_${actionType}_clicked`,
        entityType: 'chat',
        entityId: null,
        performedBy: userId,
        changes: { 
          actionType, 
          source,
          timestamp: new Date().toISOString()
        },
        createdAt: new Date(),
      });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Audit] Smart action log error:", error);
      res.status(500).json({ error: "Failed to log action" });
    }
  });

  // ============================================================
  // WAITLIST - Client discovery waitlist signups
  // ============================================================
  app.post("/api/waitlist", async (req, res) => {
    try {
      const { email, eventDate, location, servicesNeeded, inspirationImages, notes, source } = req.body;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
      }
      
      const parsedEventDate = eventDate ? new Date(eventDate) : undefined;
      
      const signup = await storage.upsertWaitlistSignup({
        email: email.toLowerCase().trim(),
        source: source || 'waitlist',
        eventDate: parsedEventDate,
        location: location || undefined,
        servicesNeeded: servicesNeeded || undefined,
        inspirationImages: inspirationImages || undefined,
        notes: notes || undefined,
      });
      
      // Send confirmation email
      try {
        const { sendWaitlistConfirmationEmail } = await import('./emailService');
        await sendWaitlistConfirmationEmail({
          toEmail: email.toLowerCase().trim(),
          eventDate: parsedEventDate,
          location: location || undefined,
          servicesNeeded: servicesNeeded || undefined,
        });
      } catch (emailErr) {
        console.error("[Waitlist] Failed to send confirmation email:", emailErr);
      }
      
      res.json({ success: true, message: "Added to waitlist" });
    } catch (error: any) {
      console.error("[Waitlist] Error:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  });
  
  // Admin view of waitlist signups
  app.get("/api/admin/waitlist", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const signups = await storage.getAllWaitlistSignups();
      res.json(signups);
    } catch (error: any) {
      console.error("[Admin Waitlist] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // PRIVATE COORDINATION THREADS (White-Label)
  // ============================================================
  
  // CORS preflight for intake endpoint (allows external websites to submit)
  app.options("/api/intake", (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    res.sendStatus(204);
  });
  
  // POST /api/intake - Create a new thread from embedded form
  app.post("/api/intake", async (req, res) => {
    // Enable CORS for external website embeds
    res.header("Access-Control-Allow-Origin", "*");
    try {
      const { artistSlug, clientName, clientEmail, clientPhone, eventDate, eventType, serviceType, message } = req.body;
      
      if (!artistSlug || !clientName || !clientEmail) {
        return res.status(400).json({ error: "Artist slug, client name, and email are required" });
      }
      
      // Find artist by slug
      const artistProfile = await storage.getArtistProfileBySlug(artistSlug);
      if (!artistProfile) {
        return res.status(404).json({ error: "Artist not found" });
      }
      
      // Generate unique thread token (128-bit entropy)
      const threadPublicToken = randomUUID() + randomUUID().slice(0, 8);
      
      // Create thread
      const thread = await storage.createThread({
        threadPublicToken,
        artistProfileId: artistProfile.id,
        clientName,
        clientEmail,
        clientPhone: clientPhone || null,
        eventDate: eventDate ? new Date(eventDate) : null,
        eventType: eventType || null,
        serviceType: serviceType || null,
        message: message || null,
        source: 'embed',
        status: 'inquiry',
      });
      
      // Create system message
      await storage.createThreadMessage({
        threadId: thread.id,
        actorType: 'system',
        body: 'Inquiry received. The artist will respond shortly.',
      });
      
      // Send notification email to artist. Dry-run: when the operator has assistant
      // dry-run enabled, suppress the real operator alert so nothing leaves the
      // system during a demo. The thread is still created above; only delivery is
      // skipped and logged.
      try {
        const operatorDryRun = !!(artistProfile as any)?.assistantDryRun;
        const artistUser = await storage.getUser(artistProfile.userId);
        if (artistUser?.email) {
          if (operatorDryRun) {
            console.log(`[Intake] Dry-run: skipped operator email alert to ${artistUser.email}`);
          } else {
            const { sendInquiryNotificationEmail } = await import('./emailService');
            const baseUrl = process.env.PUBLIC_BASE_URL || 'https://dateinquiry.com';
            await sendInquiryNotificationEmail({
              toEmail: artistUser.email,
              vendorName: artistProfile.businessName || 'Artist',
              clientName,
              clientEmail,
              eventDate: eventDate ? new Date(eventDate).toLocaleDateString() : 'Not specified',
              message: message || 'No message provided',
              inquiryLink: `${baseUrl}/t/${threadPublicToken}`,
            });
            console.log(`[Intake] Sent notification email to ${artistUser.email}`);
          }
        }
      } catch (emailError) {
        console.error('[Intake] Failed to send notification email:', emailError);
        // Don't fail the request if email fails
      }
      
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://dateinquiry.com';
      
      res.json({
        success: true,
        threadUrl: `${baseUrl}/t/${threadPublicToken}`,
        message: (artistProfile as any).formSuccessMessage || "Thank you! We'll be in touch soon.",
      });
    } catch (error: any) {
      console.error("[Intake] Error:", error);
      res.status(500).json({ error: error.message || "Failed to submit inquiry" });
    }
  });
  
  // GET /new - Create thread from invite link and redirect
  app.get("/new", async (req, res) => {
    try {
      const artistSlug = req.query.artist as string;
      
      if (!artistSlug) {
        return res.status(400).send("Artist parameter is required");
      }
      
      // Find artist by slug
      const artistProfile = await storage.getArtistProfileBySlug(artistSlug);
      if (!artistProfile) {
        return res.status(404).send("Artist not found");
      }
      
      // Generate unique thread token
      const threadPublicToken = randomUUID() + randomUUID().slice(0, 8);
      
      // Create thread with minimal info (client will fill in details)
      const thread = await storage.createThread({
        threadPublicToken,
        artistProfileId: artistProfile.id,
        clientName: 'Guest',
        clientEmail: 'pending@example.com',
        source: 'invite_link',
        status: 'inquiry',
      });
      
      // Create system message
      await storage.createThreadMessage({
        threadId: thread.id,
        actorType: 'system',
        body: 'Thread created from invite link.',
      });
      
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://dateinquiry.com';
      res.redirect(`${baseUrl}/t/${threadPublicToken}`);
    } catch (error: any) {
      console.error("[New Thread] Error:", error);
      res.status(500).send("Failed to create thread");
    }
  });
  
  // GET /api/threads/:token - Get thread by public token
  app.get("/api/threads/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const thread = await storage.getThreadByToken(token);
      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }
      
      const messages = await storage.getThreadMessages(thread.id);
      const artistProfile = await storage.getArtistProfileById(thread.artistProfileId);
      
      res.json({
        thread,
        messages,
        artist: {
          businessName: artistProfile?.businessName || 'Artist',
          logoUrl: artistProfile?.logoUrl || null,
        },
      });
    } catch (error: any) {
      console.error("[Thread] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // POST /api/threads/:token/messages - Add message to thread (public endpoint - client only)
  app.post("/api/threads/:token/messages", async (req, res) => {
    try {
      const { token } = req.params;
      const { body } = req.body;
      
      if (!body || typeof body !== 'string' || !body.trim()) {
        return res.status(400).json({ error: "Message body is required" });
      }
      
      const thread = await storage.getThreadByToken(token);
      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }
      
      // Security: This is a public endpoint - only allow client messages
      // Artist messages require authentication via a separate endpoint
      const message = await storage.createThreadMessage({
        threadId: thread.id,
        actorType: 'client',
        body: body.trim(),
      });
      
      res.json(message);
    } catch (error: any) {
      console.error("[Thread Message] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Simple schedule builder - photos API
  app.get("/api/photos", async (req, res) => {
    try {
      const photos = await storage.getSimplePhotos();
      res.json(photos);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/photos", async (req, res) => {
    try {
      const { personName, imageUrl } = req.body;
      if (!personName || !imageUrl) {
        return res.status(400).json({ error: "personName and imageUrl required" });
      }
      const photo = await storage.createSimplePhoto({ personName, imageUrl });
      res.status(201).json(photo);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });

  // Simple schedule builder - messages API
  app.get("/api/messages", async (req, res) => {
    try {
      const messages = await storage.getSimpleMessages();
      res.json(messages);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const { senderName, message } = req.body;
      if (!senderName || !message) {
        return res.status(400).json({ error: "senderName and message required" });
      }
      const msg = await storage.createSimpleMessage({ senderName, message });
      res.status(201).json(msg);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: errorMessage });
    }
  });

  app.get("/api/context-graph/export", async (_req, res) => {
    try {
      const allInquiries = await db.select().from(inquiries).orderBy(inquiries.createdAt);

      const contextTraces = allInquiries.map((inq: any) => {
        const createdAt = inq.createdAt ? new Date(inq.createdAt) : null;
        const firstResponse = inq.firstResponseAt ? new Date(inq.firstResponseAt) : null;
        const responseLatencyMs = createdAt && firstResponse ? firstResponse.getTime() - createdAt.getTime() : null;
        const responseLatencyMin = responseLatencyMs ? Math.round(responseLatencyMs / 60000) : null;

        let decisionTrace: string[] = [];
        decisionTrace.push(`inquiry_created: ${createdAt?.toISOString() || "unknown"}`);
        if (inq.status === "auto_responded") decisionTrace.push("auto_response_sent");
        if (firstResponse) decisionTrace.push(`first_response: ${firstResponse.toISOString()}`);
        if (inq.infoSheetSentAt) decisionTrace.push(`info_sheet_sent: ${new Date(inq.infoSheetSentAt).toISOString()}`);
        if (inq.chatInviteSentAt) decisionTrace.push(`chat_invite_sent: ${new Date(inq.chatInviteSentAt).toISOString()}`);
        if (inq.holdPlacedAt) decisionTrace.push(`hold_placed: ${new Date(inq.holdPlacedAt).toISOString()}`);
        if (inq.depositPaidAt) decisionTrace.push(`deposit_paid: ${new Date(inq.depositPaidAt).toISOString()}`);
        decisionTrace.push(`current_status: ${inq.status}`);
        if (inq.statusReason) decisionTrace.push(`status_reason: ${inq.statusReason}`);

        return {
          inquiryId: `INQ-${inq.id}`,
          surrogateIdentity: {
            clientName: inq.clientName || "Anonymous",
            eventType: inq.eventType,
            eventDate: inq.eventDate,
            eventLocation: inq.eventLocation,
            serviceType: inq.serviceType,
            partySize: inq.partySize,
          },
          decisionTrace,
          behavioralSignals: {
            responseLatencyMinutes: responseLatencyMin,
            sentiment: inq.sentiment,
            sentimentScore: inq.sentimentScore,
            sentimentAnalysis: inq.sentimentAnalysis,
            nextAction: inq.nextAction,
          },
          groundTruth: {
            finalStatus: inq.status,
            depositPaid: !!inq.depositPaidAt,
            holdPlaced: !!inq.holdPlacedAt,
            declinedReason: inq.declinedReason || null,
          },
          timestamps: {
            created: createdAt?.toISOString(),
            firstResponse: firstResponse?.toISOString() || null,
            lastAction: inq.lastActionAt ? new Date(inq.lastActionAt).toISOString() : null,
            updated: inq.updatedAt ? new Date(inq.updatedAt).toISOString() : null,
          },
        };
      });

      const summary = {
        totalInquiries: contextTraces.length,
        statusBreakdown: contextTraces.reduce((acc: Record<string, number>, t: any) => {
          const s = t.groundTruth.finalStatus;
          acc[s] = (acc[s] || 0) + 1;
          return acc;
        }, {}),
        avgResponseLatencyMin: Math.round(
          contextTraces
            .filter((t: any) => t.behavioralSignals.responseLatencyMinutes != null)
            .reduce((sum: number, t: any, _: number, arr: any[]) => sum + t.behavioralSignals.responseLatencyMinutes / arr.length, 0)
        ),
        depositsCollected: contextTraces.filter((t: any) => t.groundTruth.depositPaid).length,
        holdsPlaced: contextTraces.filter((t: any) => t.groundTruth.holdPlaced).length,
        sentimentDistribution: contextTraces.reduce((acc: Record<string, number>, t: any) => {
          const s = t.behavioralSignals.sentiment || "unscored";
          acc[s] = (acc[s] || 0) + 1;
          return acc;
        }, {}),
      };

      res.json({
        exportDate: new Date().toISOString(),
        platform: "Briarwood / briarwood.ai",
        description: "CDI Context Graph Export - Decision Traces with Behavioral Signals",
        summary,
        traces: contextTraces,
      });
    } catch (error: any) {
      console.error("Context graph export error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================
  // HANDOFF ACCOUNTABILITY LOOP (YC submission slice)
  // The line: "the original operator needs visibility into whether
  // the client was actually protected when they routed them to a peer."
  //
  // Access model: every handoff endpoint is gated by ?token=<threadPublicToken>
  // matching the parent thread's opaque token. This is the existing zero-login
  // pattern used everywhere else in the app — the helper gets the token via the
  // email notification, the originator already has it from their thread.
  // ============================================================

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Resolves a handoff and verifies the caller has the matching thread token.
  // Returns { handoff, thread } on success or sends an error response.
  async function authorizeHandoff(req: Request, res: Response) {
    if (!UUID_RE.test(req.params.id)) {
      res.status(404).json({ error: "Handoff not found" });
      return null;
    }
    const token = (req.query.token as string) || (req.headers["x-thread-token"] as string);
    if (!token) {
      res.status(401).json({ error: "Missing thread token" });
      return null;
    }
    const handoff = await db.query.threadReferrals.findFirst({
      where: (r, { eq }) => eq(r.id, req.params.id),
    });
    if (!handoff) {
      res.status(404).json({ error: "Handoff not found" });
      return null;
    }
    const thread = await db.query.threads.findFirst({
      where: (t, { eq }) => eq(t.id, handoff.threadId),
    });
    if (!thread || thread.threadPublicToken !== token) {
      res.status(403).json({ error: "Invalid thread token for this handoff" });
      return null;
    }
    return { handoff, thread };
  }

  // Strips fields the originator must never see (consent-gated coaching guarantee).
  function publicHandoffView(h: any) {
    return {
      id: h.id,
      threadId: h.threadId,
      referredArtistId: h.referredArtistId,
      status: h.status,
      urgencyHours: h.urgencyHours,
      paymentSecuredStatus: h.paymentSecuredStatus,
      contractAttachedId: h.contractAttachedId,
      scopeSummary: h.scopeSummary,
      helperReportedOutcome: h.helperReportedOutcome,
      helperPaidAt: h.helperPaidAt,
      helperOutcomeReportedAt: h.helperOutcomeReportedAt,
      helperWantsToShareAdvice: !!h.helperWantsToShareAdvice,
      // Excluded: helperPrivateNote, helperPaymentNote, helperAdviceDraft,
      // originatorAdviceConsent details. These are exposed only via the
      // dedicated coaching-prompt endpoint, with consent gating.
      createdAt: h.createdAt,
    };
  }

  // POST /api/handoffs - Create an attested handoff (originator).
  // Enforces the originator's attestations at creation time. This is the moat:
  // the system asks the awkward questions upfront so the helper never has to.
  app.post("/api/handoffs", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        threadId: z.string().uuid(),
        threadToken: z.string().min(1),
        referredArtistId: z.string().uuid(),
        // Required attestations
        paymentSecuredStatus: z.enum([
          "secured_2plus_weeks",
          "secured_1_to_2_weeks",
          "secured_under_1_week",
          "not_yet_secured",
        ]),
        scopeSummary: z.string().min(10, "Document the full scope of services"),
        contractAttachedId: z.string().optional(),
      });
      const data = schema.parse(req.body);

      // Verify the originator owns the thread (via token)
      const thread = await db.query.threads.findFirst({
        where: (t, { eq }) => eq(t.id, data.threadId),
      });
      if (!thread || thread.threadPublicToken !== data.threadToken) {
        return res.status(403).json({ error: "Invalid thread token" });
      }

      // Compute urgency from event date
      let urgencyHours: number | undefined;
      if (thread.eventDate) {
        urgencyHours = Math.max(
          0,
          Math.round((new Date(thread.eventDate).getTime() - Date.now()) / 36e5)
        );
      }

      const [created] = await db
        .insert(threadReferrals)
        .values({
          threadId: data.threadId,
          referredArtistId: data.referredArtistId,
          paymentSecuredStatus: data.paymentSecuredStatus,
          scopeSummary: data.scopeSummary,
          contractAttachedId: data.contractAttachedId,
          urgencyHours,
        })
        .returning();

      res.json({ ok: true, handoff: publicHandoffView(created) });
    } catch (err: any) {
      console.error("[handoff] create error:", err);
      res.status(400).json({ error: err.message });
    }
  });

  // GET /api/handoffs/:id?token=... - Helper-facing handoff view.
  // Token-gated. Returns the originator's attestations and a "gaps" list so
  // the helper sees what wasn't secured before they accept.
  app.get("/api/handoffs/:id", async (req: Request, res: Response) => {
    try {
      const auth = await authorizeHandoff(req, res);
      if (!auth) return;
      const { handoff } = auth;

      const gaps: string[] = [];
      if (!handoff.paymentSecuredStatus || handoff.paymentSecuredStatus === "not_yet_secured") {
        gaps.push("payment_not_secured");
      }
      if (!handoff.contractAttachedId) gaps.push("no_contract_attached");
      if (!handoff.scopeSummary) gaps.push("scope_not_documented");

      res.json({
        handoff: publicHandoffView(handoff),
        gaps,
        acceptAtOwnRisk: gaps.length > 0,
      });
    } catch (err: any) {
      console.error("[handoff] get error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/handoffs/:id/helper-outcome - Helper reports outcome after the job.
  // 5 outcome buckets calibrated to the real failure modes Erika described:
  // clean | paid_as_agreed_but_scope_off | paid_late_or_partial |
  // scope_and_payment_both_off | cancellation_no_fault.
  // The private note + advice draft stay with the helper unless the originator
  // explicitly opts in (consent-gated coaching).
  app.post("/api/handoffs/:id/helper-outcome", async (req: Request, res: Response) => {
    try {
      const auth = await authorizeHandoff(req, res);
      if (!auth) return;
      const schema = z.object({
        outcome: z.enum([
          "clean",
          "paid_as_agreed_but_scope_off",
          "paid_late_or_partial",
          "scope_and_payment_both_off",
          "cancellation_no_fault",
        ]),
        helperPaidAt: z.string().datetime().optional(),
        paymentNote: z.string().max(2000).optional(),
        privateNote: z.string().max(4000).optional(),
        wantsToShareAdvice: z.boolean().default(false),
        adviceDraft: z.string().max(4000).optional(),
      });
      const data = schema.parse(req.body);

      const [updated] = await db
        .update(threadReferrals)
        .set({
          helperReportedOutcome: data.outcome,
          helperPaidAt: data.helperPaidAt ? new Date(data.helperPaidAt) : undefined,
          helperPaymentNote: data.paymentNote,
          helperPrivateNote: data.privateNote,
          helperWantsToShareAdvice: data.wantsToShareAdvice,
          helperAdviceDraft: data.wantsToShareAdvice ? data.adviceDraft : null,
          helperOutcomeReportedAt: new Date(),
        })
        .where(eq(threadReferrals.id, req.params.id))
        .returning();

      if (!updated) return res.status(404).json({ error: "Handoff not found" });
      res.json({ ok: true, handoff: publicHandoffView(updated) });
    } catch (err: any) {
      console.error("[handoff] outcome error:", err);
      res.status(400).json({ error: err.message });
    }
  });

  // GET /api/handoffs/:id/coaching-prompt - Originator-facing prompt.
  // Returns { hasAdviceWaiting: true } only if helper opted to share.
  // The originator never sees the advice text until they actively consent.
  app.get("/api/handoffs/:id/coaching-prompt", async (req: Request, res: Response) => {
    try {
      const auth = await authorizeHandoff(req, res);
      if (!auth) return;
      const h = auth.handoff;

      const hasAdviceWaiting = !!(h.helperWantsToShareAdvice && h.helperAdviceDraft);
      const consent = h.originatorAdviceConsent;

      res.json({
        hasAdviceWaiting,
        promptCopy: hasAdviceWaiting
          ? "Your last handoff partner has some feedback that could improve future bookings. Want to hear it?"
          : null,
        consent,
        adviceVisible: consent === "yes" ? h.helperAdviceDraft : null,
      });
    } catch (err: any) {
      console.error("[handoff] coaching-prompt error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/handoffs/:id/coaching-consent - Originator's answer.
  // 'yes' | 'no' | 'not_yet'. We record every response — a pattern of 'no'
  // over time is itself a meaningful signal (without ever surfacing the
  // underlying advice to them).
  app.post("/api/handoffs/:id/coaching-consent", async (req: Request, res: Response) => {
    try {
      const auth = await authorizeHandoff(req, res);
      if (!auth) return;
      const schema = z.object({ consent: z.enum(["yes", "no", "not_yet"]) });
      const { consent } = schema.parse(req.body);

      const [updated] = await db
        .update(threadReferrals)
        .set({
          originatorAdviceConsent: consent,
          originatorAdviceConsentAt: new Date(),
          originatorAdvicePromptedAt: sql`COALESCE(originator_advice_prompted_at, NOW())`,
        })
        .where(eq(threadReferrals.id, req.params.id))
        .returning();

      if (!updated) return res.status(404).json({ error: "Handoff not found" });
      res.json({
        ok: true,
        adviceVisible: consent === "yes" ? updated.helperAdviceDraft : null,
      });
    } catch (err: any) {
      console.error("[handoff] coaching-consent error:", err);
      res.status(400).json({ error: err.message });
    }
  });

  // GET /api/handoffs/originator/:userId/mirror - Originator's pattern mirror.
  // Aggregate-only. Never identifies which helper said what.
  // Requires authenticated session matching :userId (originator looking at self).
  app.get("/api/handoffs/originator/:userId/mirror", isAuthenticated, async (req: any, res: Response) => {
    try {
      const sessionUserId = req.user?.claims?.sub || req.user?.id;
      if (sessionUserId !== req.params.userId) {
        return res.status(403).json({ error: "Can only view your own mirror" });
      }

      // userId → artistProfile → threads (via artistProfileId) → handoffs
      const profile = await db.query.artistProfiles.findFirst({
        where: (p, { eq }) => eq(p.userId, req.params.userId),
        columns: { id: true },
      });
      if (!profile) return res.json({ total: 0, patterns: {} });

      const userThreads = await db.query.threads.findMany({
        where: (t, { eq }) => eq(t.artistProfileId, profile.id),
        columns: { id: true },
      });
      const threadIds = userThreads.map(t => t.id);
      if (threadIds.length === 0) return res.json({ total: 0, patterns: {} });

      const handoffs = await db.query.threadReferrals.findMany({
        where: (r) =>
          and(inArray(r.threadId, threadIds), isNotNull(r.helperReportedOutcome)),
      });

      const total = handoffs.length;
      const patterns = {
        clean: handoffs.filter(h => h.helperReportedOutcome === "clean").length,
        scope_concerns: handoffs.filter(h =>
          ["paid_as_agreed_but_scope_off", "scope_and_payment_both_off"].includes(h.helperReportedOutcome || "")
        ).length,
        payment_concerns: handoffs.filter(h =>
          ["paid_late_or_partial", "scope_and_payment_both_off"].includes(h.helperReportedOutcome || "")
        ).length,
        cancellation_no_fault: handoffs.filter(h => h.helperReportedOutcome === "cancellation_no_fault").length,
        coaching_waiting: handoffs.filter(h => h.helperWantsToShareAdvice && !h.originatorAdviceConsent).length,
      };

      res.json({ total, patterns });
    } catch (err: any) {
      console.error("[handoff] mirror error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/trusted-circle/:memberId/quietly-remove - Compassionate exit.
  // The peer is never notified. They simply stop appearing in default routing.
  // The reason note is private to the remover. Reversible (POST again with
  // restore: true).
  app.post("/api/trusted-circle/:memberId/quietly-remove", isAuthenticated, async (req: any, res: Response) => {
    try {
      const sessionUserId = req.user?.claims?.sub || req.user?.id;
      const schema = z.object({
        reason: z.string().max(2000).optional(),
        restore: z.boolean().optional(),
      });
      const data = schema.parse(req.body);

      const member = await db.query.trustedCircle.findFirst({
        where: (c, { eq }) => eq(c.id, req.params.memberId),
      });
      if (!member) return res.status(404).json({ error: "Circle member not found" });
      if (member.referrerId !== sessionUserId) {
        return res.status(403).json({ error: "Can only update your own circle" });
      }

      const [updated] = await db
        .update(trustedCircle)
        .set({
          quietlyRemoved: !data.restore,
          removedAt: data.restore ? null : new Date(),
          removedReason: data.restore ? null : (data.reason ?? member.removedReason),
        })
        .where(eq(trustedCircle.id, req.params.memberId))
        .returning();

      res.json({ ok: true, member: updated });
    } catch (err: any) {
      console.error("[trusted-circle] quietly-remove error:", err);
      res.status(400).json({ error: err.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
