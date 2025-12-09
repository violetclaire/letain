import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import * as googleCalendar from "./googleCalendarService";
import { registerStripeRoutes } from "./stripeRoutes";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { GoogleGenAI, Modality } from "@google/genai";
import * as smsService from "./smsService";
import * as iqsService from "./iqsService";

// Rate limiter for auth endpoints to prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { message: "Too many login attempts, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts
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

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "",
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || "",
  },
});
import {
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
} from "@shared/schema";

// Dynamic CDI imports to avoid bundling issues
let cdiAgent: any = null;
let cdiEngine: any = null;
let cdiRealtime: any = null;
let aiChat: any = null;
let businessChatAgent: any = null;

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

// Helper to get authenticated user ID from either email/password session or Replit OAuth
function getAuthUserId(req: any): string | null {
  // Check email/password session first
  if (req.session?.userId) {
    return req.session.userId;
  }
  // Fall back to Replit OAuth
  if (req.user?.claims?.sub) {
    return req.user.claims.sub;
  }
  return null;
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

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Setup Replit Auth
  await setupAuth(app);
  
  // Load CDI modules
  await loadCDI();

  // Register Stripe payment routes
  registerStripeRoutes(app, isAuthenticated);

  // ========== AUTH ROUTES ==========
  // This endpoint returns null if not authenticated (doesn't require isAuthenticated)
  // so the client can gracefully detect logged-out state without 401 loops
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Check for email/password session first
      if (req.session?.userId) {
        const user = await storage.getUser(req.session.userId);
        return res.json(user);
      }
      // Fall back to Replit OAuth
      if (!req.user || !req.user.claims || !req.user.claims.sub) {
        return res.json(null);
      }
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
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
      (req.session as any).userId = user.id;

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
        const firstError = parseResult.error.errors[0];
        return res.status(400).json({ message: firstError.message });
      }

      const { email, password } = parseResult.data;

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check if user has a password (might be Replit OAuth user)
      if (!user.password) {
        return res.status(401).json({ message: "Please use your original login method" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Set session
      (req.session as any).userId = user.id;

      res.json({ 
        message: "Login successful", 
        user: { ...user, password: undefined }
      });
    } catch (error: any) {
      console.error("Login error:", error);
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

  // ========== USER ROLE UPDATE ==========
  app.patch("/api/users/:id/role", isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update user profile (email, name, phone)
  app.patch("/api/users/:id", isAuthenticated, async (req: any, res) => {
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
      const updateData: any = {};
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // CDI Consent Management
  app.post("/api/users/:id/cdi-consent", isAuthenticated, async (req: any, res) => {
    try {
      const requesterId = req.user.claims.sub;
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== INTAKE FORMS ==========
  app.post("/api/intakes/client", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/intakes/client/:userId", isAuthenticated, async (req, res) => {
    try {
      const intake = await storage.getClientIntake(req.params.userId);
      if (!intake) {
        return res.status(404).json({ error: "Intake not found" });
      }
      res.json(intake);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/intakes/artist", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { cdiConsent, ...intakeData } = req.body;
      const data = insertArtistIntakeSchema.parse({ ...intakeData, userId });
      const intake = await storage.createArtistIntake(data);
      await storage.updateUserRole(userId, 'artist');
      
      // Also create artist profile from intake data
      await storage.createArtistProfile({
        userId,
        businessName: data.businessName,
        location: data.serviceAreas?.[0] || null,
        specialties: data.serviceTypes,
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
      
      res.json(intake);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/intakes/artist/:userId", isAuthenticated, async (req, res) => {
    try {
      const intake = await storage.getArtistIntake(req.params.userId);
      if (!intake) {
        return res.status(404).json({ error: "Intake not found" });
      }
      res.json(intake);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/intakes/planner", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/intakes/planner/:userId", isAuthenticated, async (req, res) => {
    try {
      const intake = await storage.getPlannerIntake(req.params.userId);
      if (!intake) {
        return res.status(404).json({ error: "Intake not found" });
      }
      res.json(intake);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== PUBLIC VENDOR PROFILE ==========
  // Publicly accessible vendor profile (no auth required)
  // Only shows approved vendors to prevent spam/scam profiles from being visible
  app.get("/api/vendor-public/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user || user.role !== 'artist') {
        return res.status(404).json({ error: "Vendor not found" });
      }

      const profile = await storage.getArtistProfile(req.params.id);
      
      // Only show approved vendors publicly
      if (!profile || profile.verificationStatus !== 'approved') {
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== ARTIST PROFILES ==========
  app.post("/api/artist-profiles", isAuthenticated, async (req: any, res) => {
    try {
      const data = insertArtistProfileSchema.parse(req.body);
      const profile = await storage.createArtistProfile(data);
      res.json(profile);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/artist-profiles/:userId", async (req, res) => {
    try {
      const profile = await storage.getArtistProfile(req.params.userId);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.json(profile);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/artist-profiles/:userId", isAuthenticated, async (req, res) => {
    try {
      const profile = await storage.updateArtistProfile(req.params.userId, req.body);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.json(profile);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Direct portfolio photo upload
  app.post("/api/artist-profiles/:userId/portfolio", isAuthenticated, async (req: any, res) => {
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
  app.delete("/api/artist-profiles/:userId/portfolio", isAuthenticated, async (req: any, res) => {
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
  app.patch("/api/artist-profiles/:userId/portfolio/order", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  // ========== ARTIST SERVICES (Menu) ==========
  app.get("/api/artist-services/:artistId", async (req, res) => {
    try {
      const services = await storage.getArtistServices(req.params.artistId);
      res.json(services);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/artist-services", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const service = await storage.createArtistService({ ...req.body, artistId: userId });
      res.json(service);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/artist-services/:id", isAuthenticated, async (req: any, res) => {
    try {
      const service = await storage.getArtistService(req.params.id);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      // Verify ownership
      const userId = req.user.claims.sub;
      if (service.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized to update this service" });
      }
      const updated = await storage.updateArtistService(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/artist-services/:id", isAuthenticated, async (req: any, res) => {
    try {
      const service = await storage.getArtistService(req.params.id);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      // Verify ownership
      const userId = req.user.claims.sub;
      if (service.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized to delete this service" });
      }
      await storage.deleteArtistService(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== BOOKINGS ==========
  app.post("/api/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      
      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/bookings/:id", isAuthenticated, async (req, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/bookings/:id", isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/bookings/:id", isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/bookings/client/:clientId", isAuthenticated, async (req, res) => {
    try {
      const bookings = await storage.getBookingsByClient(req.params.clientId);
      res.json(bookings);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/bookings/artist/:artistId", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      let bookings = await storage.getBookingsByArtist(req.params.artistId);
      
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/bookings/planner/:plannerId", isAuthenticated, async (req, res) => {
    try {
      const bookings = await storage.getBookingsByPlanner(req.params.plannerId);
      res.json(bookings);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== MESSAGES ==========
  app.post("/api/messages", isAuthenticated, async (req: any, res) => {
    try {
      const senderId = req.user.claims.sub;
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
        cdiEngine.analyzeForCDI(senderId, message.content, {
          actorRole: (sender.role as 'client' | 'artist' | 'planner') || 'client',
          targetRole: data.recipientId ? undefined : undefined,
          bookingId: data.bookingId || undefined,
          bookingStatus: booking?.status || undefined,
        }, dynamicWeights).then(async (result: any) => {
          console.log(`[CDI] ${sender.role} ${senderId}: Score ${result.compositeScore} (${result.trustLevel})`);
          console.log(`[CDI] Dimensions - EF: ${result.dimensions.emotionalFidelity.score}, CA: ${result.dimensions.choreographyAwareness.score}, RSR: ${result.dimensions.roleSpecificRecall.score}`);
          
          // Store composite score for tracking
          await cdiEngine.storeCdiCompositeScore(senderId, result);
          
          // Record behavioral event for communication
          await cdiEngine.recordBehavioralEvent(
            senderId,
            (sender.role as 'client' | 'artist' | 'planner') || 'client',
            'communication',
            'message_sent',
            'emotional_fidelity',
            result.dimensions.emotionalFidelity.score > 70 ? 10 : result.dimensions.emotionalFidelity.score > 50 ? 0 : -10,
            {
              bookingId: data.bookingId || undefined,
              evidenceText: message.content.substring(0, 100),
            }
          );
        }).catch((err: Error) => {
          console.error('[CDI Engine] Analysis error:', err);
        });
        
        // Also run legacy sentiment analysis for backward compatibility
        if (sender.role === 'client') {
          cdiAgent.analyzeMessage(senderId, message.content).catch((err: Error) => {
            console.error('[CDI Agent] Analysis error:', err);
          });
        }
      }
      
      res.json(message);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/messages/booking/:bookingId", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getMessagesByBooking(req.params.bookingId);
      res.json(messages);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/messages/between/:user1Id/:user2Id", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getMessagesBetweenUsers(
        req.params.user1Id,
        req.params.user2Id
      );
      res.json(messages);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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

  app.post("/api/sms/send", isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sms/booking-reminder", isAuthenticated, async (req: any, res) => {
    try {
      const { clientPhone, clientName, vendorName, serviceName, appointmentDate, appointmentTime } = req.body;
      
      if (!clientPhone || !clientName || !vendorName || !serviceName || !appointmentDate || !appointmentTime) {
        return res.status(400).json({ error: 'All booking details are required' });
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
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sms/booking-confirmation", isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sms/payment-reminder", isAuthenticated, async (req: any, res) => {
    try {
      const { clientPhone, clientName, vendorName, amount, dueDate } = req.body;
      
      if (!clientPhone || !clientName || !vendorName || !amount || !dueDate) {
        return res.status(400).json({ error: 'All payment details are required' });
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
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sms/schedule-notification", isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sms/bulk", isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== INVOICE SENDING (Email/SMS) ==========
  app.post("/api/invoice/send-email", isAuthenticated, async (req: any, res) => {
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
  app.post("/api/booking/send-email", isAuthenticated, async (req: any, res) => {
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
              <h1>Beauvette</h1>
              <p>For Life's Most Important Days</p>
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
              Sent via Beauvette - Beauty services for life's most important days
            </div>
          </div>
        </body>
        </html>
      `;

      const result = await resendClient.emails.send({
        from: 'Beauvette <noreply@beauvette.com>',
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
  app.post("/api/booking/send-appointment-confirmation", isAuthenticated, async (req: any, res) => {
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

      // Build chat link
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : process.env.REPLIT_DEPLOYMENT_URL || 'https://beauvette.com';
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
        paymentLink: booking.stripePaymentLinkUrl || undefined,
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

  app.post("/api/invoice/send-sms", isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const contract = await storage.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/contracts/:id", isAuthenticated, async (req, res) => {
    try {
      const contract = await storage.updateContract(req.params.id, req.body);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      res.json(contract);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Send contract via email
  app.post("/api/contracts/:id/send-email", isAuthenticated, async (req: any, res) => {
    try {
      const contract = await storage.getContract(req.params.id);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }

      const userId = req.user.claims.sub;
      if (contract.artistId !== userId) {
        return res.status(403).json({ error: "You can only send your own contracts" });
      }

      const { recipientEmail } = req.body;
      if (!recipientEmail || !recipientEmail.includes('@')) {
        return res.status(400).json({ error: "Valid email address required" });
      }

      const { sendContractEmail } = await import('../server/emailService');
      const result = await sendContractEmail({
        toEmail: recipientEmail,
        clientName: contract.clientName || "Client",
        packageDetails: contract.packageDetails || "Beauty Services",
        totalAmount: contract.totalAmount ? contract.totalAmount / 100 : 0,
        depositAmount: contract.depositAmount ? contract.depositAmount / 100 : 0,
        senderName: `${req.user.claims.email}`
      });

      res.json({ success: true, message: "Contract email sent successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/contracts/booking/:bookingId", isAuthenticated, async (req, res) => {
    try {
      const contracts = await storage.getContractsByBooking(req.params.bookingId);
      res.json(contracts);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Upload contract file to object storage
  app.post("/api/contracts/:id/upload-file", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.post("/api/bookings/:bookingId/upload-contract", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookingId = req.params.bookingId;
      
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      
      if (booking.artistId !== userId) {
        return res.status(403).json({ error: "You can only upload contracts for your own bookings" });
      }
      
      const { fileContent, fileName, mimeType, packageDetails, totalAmount, depositAmount } = req.body;
      if (!fileContent) {
        return res.status(400).json({ error: "File content is required" });
      }
      
      const objectService = new ObjectStorageService();
      const timestamp = Date.now();
      const safeName = (fileName || 'contract').replace(/[^a-zA-Z0-9.-]/g, '_');
      const objectPath = `.private/contracts/${userId}/${bookingId}/${timestamp}-${safeName}`;
      
      const buffer = Buffer.from(fileContent, 'base64');
      const servingUrl = await objectService.uploadBuffer(objectPath, buffer, mimeType || 'application/pdf', userId);
      
      // Create or update contract
      let existingContracts = await storage.getContractsByBooking(bookingId);
      let contract;
      
      if (existingContracts.length > 0) {
        contract = await storage.updateContract(existingContracts[0].id, { 
          fileUrl: servingUrl,
          packageDetails: packageDetails || existingContracts[0].packageDetails,
          totalAmount: totalAmount || existingContracts[0].totalAmount,
          depositAmount: depositAmount || existingContracts[0].depositAmount,
        });
      } else {
        contract = await storage.createContract({
          bookingId,
          artistId: userId,
          clientId: booking.clientId,
          packageDetails: packageDetails || 'Beauty Services',
          totalAmount: totalAmount || 0,
          depositAmount: depositAmount || 0,
          status: 'draft',
          fileUrl: servingUrl,
        });
      }
      
      res.json({ 
        success: true, 
        fileUrl: servingUrl,
        contract 
      });
    } catch (error: any) {
      console.error("Booking contract upload error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/contracts/artist/:artistId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== CONTRACT TEMPLATES ==========
  app.get("/api/contract-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templates = await storage.getContractTemplatesByArtist(userId);
      res.json(templates);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/contract-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const template = await storage.getContractTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      if (template.artistId !== userId) {
        return res.status(403).json({ error: "You can only view your own templates" });
      }
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/contract-templates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const templateData = { ...req.body, artistId: userId };
      const template = await storage.createContractTemplate(templateData);
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/contract-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getContractTemplate(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Template not found" });
      }
      if (existing.artistId !== userId) {
        return res.status(403).json({ error: "You can only edit your own templates" });
      }
      const template = await storage.updateContractTemplate(req.params.id, req.body);
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/contract-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const existing = await storage.getContractTemplate(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Template not found" });
      }
      if (existing.artistId !== userId) {
        return res.status(403).json({ error: "You can only delete your own templates" });
      }
      await storage.deleteContractTemplate(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/contract-templates/default", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const template = await storage.getDefaultContractTemplate(userId);
      res.json(template || null);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== OPENSIGN E-SIGNATURE ==========
  app.post("/api/bookings/:bookingId/send-for-signing", isAuthenticated, async (req: any, res) => {
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
        const clientId = booking.clientId || booking.clientContactId;
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
      
      if (!client?.email) {
        return res.status(400).json({ error: "Client email is required for signing" });
      }
      
      const { createSigningDocument, generateContractPdfHtml } = await import("./openSignService");
      
      const eventDate = booking.eventDate 
        ? new Date(booking.eventDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        : "TBD";
      
      const pdfHtml = generateContractPdfHtml(
        artist?.firstName ? `${artist.firstName} ${artist.lastName || ""}`.trim() : "Service Provider",
        client?.firstName ? `${client.firstName} ${client.lastName || ""}`.trim() : "Client",
        contract.packageDetails,
        contract.totalAmount,
        contract.depositAmount || 0,
        eventDate,
        booking.serviceType || "Beauty Services",
        req.body.additionalTerms
      );
      
      const pdfBase64 = Buffer.from(pdfHtml).toString("base64");
      
      const result = await createSigningDocument(
        contractId,
        `Contract - ${booking.serviceType || "Beauty Services"} - ${eventDate}`,
        pdfBase64,
        [
          { name: artist?.firstName ? `${artist.firstName} ${artist.lastName || ""}`.trim() : "Artist", email: artist?.email || "", role: "Service Provider" },
          { name: client?.firstName ? `${client.firstName} ${client.lastName || ""}`.trim() : "Client", email: client.email, role: "Client" },
        ]
      );
      
      if (!result.success) {
        return res.status(500).json({ error: result.error || "Failed to create signing document" });
      }
      
      res.json({ 
        success: true, 
        documentId: result.documentId,
        signingUrl: result.signingUrl,
        message: "Contract sent for e-signature" 
      });
    } catch (error: any) {
      console.error("[OpenSign] Error sending for signing:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/contracts/:id/signing-status", isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/contracts/:id/resend-signing", isAuthenticated, async (req: any, res) => {
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
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ========== PAYMENTS ==========
  app.post("/api/payments", isAuthenticated, async (req, res) => {
    try {
      const data = insertPaymentSchema.parse(req.body);
      const payment = await storage.createPayment(data);
      res.json(payment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/payments/:id", isAuthenticated, async (req, res) => {
    try {
      const payment = await storage.getPayment(req.params.id);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json(payment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/payments/:id", isAuthenticated, async (req, res) => {
    try {
      const payment = await storage.updatePayment(req.params.id, req.body);
      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }
      res.json(payment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/payments/contract/:contractId", isAuthenticated, async (req, res) => {
    try {
      const payments = await storage.getPaymentsByContract(req.params.contractId);
      res.json(payments);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== AI CHAT ==========
  // Get chat history
  app.get("/api/ai/chat/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messages = await storage.getAiChatMessages(userId);
      res.json(messages);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Clear chat history
  app.delete("/api/ai/chat/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.clearAiChatMessages(userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/ai/chat", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { message, attachments } = req.body;
      
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
          } else {
            result.response = "I had trouble creating that booking. Please try again.";
            console.error("Booking creation failed:", bookingResult.error);
          }
        } catch (bookingError) {
          console.error("Booking creation error:", bookingError);
          result.response = "I had trouble creating that booking. Please try again.";
        }
      }
      
      // Handle contract creation
      if (result?.createContract?.clientName && result?.createContract?.packageDetails) {
        console.log("Processing contract creation:", result.createContract);
        try {
          const contractResult = await aiChat.createContractFromAI(userId, result.createContract);
          if (contractResult.success) {
            (result as any).contractCreated = true;
            (result as any).contractId = contractResult.contractId;
            console.log("Contract created successfully:", contractResult.contractId);
          } else {
            result.response = "I had trouble creating that contract. Please try again.";
            console.error("Contract creation failed:", contractResult.error);
          }
        } catch (contractError) {
          console.error("Contract creation error:", contractError);
          result.response = "I had trouble creating that contract. Please try again.";
        }
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
      
      res.json(result);
    } catch (error: any) {
      console.error("AI Chat error:", error);
      res.status(500).json({ 
        response: "I'm having trouble right now. Please try again in a moment."
      });
    }
  });

  // Get communication logs for artist (only accessible by artists)
  app.get("/api/communication-logs", isAuthenticated, async (req: any, res) => {
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
  app.post("/api/communication-logs/:id/forward", isAuthenticated, async (req: any, res) => {
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

  // AI Schedule Creation Chat
  app.post("/api/ai/schedule-chat", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message required" });
      }
      
      const currentDate = new Date();
      const schedulePrompt = `You are a schedule creation assistant for Beauvette, a wedding beauty services platform.
      
Your job is to extract schedule details from the user's natural language input and return structured JSON.

Current date: ${currentDate.toISOString().split('T')[0]}

EXTRACT THE FOLLOWING from the user's message:
- eventName: The name of the event (e.g., "Smith Wedding", "Jones Engagement Party")
- dates: Array of date strings in YYYY-MM-DD format
- location: The venue/location (if mentioned)
- readyByTime: The time the client needs to be ready (in HH:MM format, 24-hour)
- sessionDetails: Any details about the session
- recipientEmails: Emails to send the schedule to (if mentioned)

RESPOND WITH JSON ONLY in this exact format:
{
  "scheduleData": {
    "eventName": "Smith Wedding",
    "dates": ["2025-12-14", "2025-12-15"],
    "location": "Grand Ballroom Hotel",
    "readyByTime": "14:00",
    "sessionDetails": "Bride and bridal party",
    "recipientEmails": ""
  },
  "response": "I'll create a 2-day schedule for the Smith Wedding on December 14-15 at the Grand Ballroom Hotel, with the bride ready by 2:00 PM.",
  "needsMoreInfo": false,
  "missingFields": []
}

If critical information is missing (eventName or dates), set needsMoreInfo to true and list the missing fields.

Example inputs and outputs:
- "Create a schedule for the Johnson wedding on December 20th" → Extract eventName="Johnson Wedding", dates=["2025-12-20"]
- "Spanish Days event on Jan 5-7 at the Hilton, bride ready at 3pm" → Extract eventName="Spanish Days", dates=["2026-01-05","2026-01-06","2026-01-07"], location="Hilton", readyByTime="15:00"
- "3 day wedding for Sarah Dec 10, 11 and 12" → Extract eventName="Sarah's Wedding", dates=["2025-12-10","2025-12-11","2025-12-12"]

User message: ${message}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: schedulePrompt }] }],
        config: { maxOutputTokens: 1024 }
      });

      const responseText = response.text || "";
      
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          res.json(parsed);
        } else {
          res.json({
            response: "I couldn't understand that. Try something like: 'Create a schedule for the Smith Wedding on December 15th at the Grand Hotel'",
            needsMoreInfo: true,
            missingFields: ["eventName", "dates"]
          });
        }
      } catch (parseErr) {
        res.json({
          response: "I had trouble processing that. Please try again with details like: event name, dates, and location.",
          needsMoreInfo: true,
          missingFields: ["eventName", "dates"]
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
  app.post("/api/ai/generate-image", isAuthenticated, async (req: any, res) => {
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
  app.post("/api/availability", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = insertAvailabilitySchema.parse({ ...req.body, userId });
      const availability = await storage.setAvailability(data);
      res.json(availability);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Sync Google Calendar availability for a vendor
  app.post("/api/availability/sync-google-calendar", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/availability", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { date } = req.body;
      await storage.deleteAvailability(userId, new Date(date));
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== SCHEDULES ==========
  app.post("/api/schedules", isAuthenticated, async (req, res) => {
    try {
      const data = insertScheduleSchema.parse(req.body);
      const schedule = await storage.createSchedule(data);
      res.json(schedule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/schedules/booking/:bookingId", isAuthenticated, async (req, res) => {
    try {
      const schedule = await storage.getScheduleByBooking(req.params.bookingId);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      res.json(schedule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/schedules/:id", isAuthenticated, async (req, res) => {
    try {
      const schedule = await storage.updateSchedule(req.params.id, req.body);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      res.json(schedule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== ARTIST NETWORK (Your Network / Rolodex) ==========
  
  // Get artist's network contacts
  app.get("/api/artist-network", isAuthenticated, async (req: any, res) => {
    try {
      // For now, return empty array - will be populated as artists add contacts
      res.json([]);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Invite someone to network
  app.post("/api/artist-network/invite", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== EVENT DAY SCHEDULES (Smart Scheduling Grid) ==========
  
  // Get all schedules for current user (artist/vendor)
  app.get("/api/event-schedules", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const schedules = await storage.getEventDaySchedulesByArtist(userId);
      res.json(schedules);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get single schedule with all team members and appointments
  app.get("/api/event-schedules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const schedule = await storage.getEventDaySchedule(req.params.id);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      // Verify ownership
      const userId = req.user.claims.sub;
      if (schedule.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const teamMembers = await storage.getScheduleTeamMembers(schedule.id);
      const appointments = await storage.getScheduleAppointments(schedule.id);
      
      res.json({ ...schedule, teamMembers, appointments });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Send schedule via email
  app.post("/api/event-schedules/send-email", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      
      // Build share link - use the published Replit URL
      const baseUrl = 'https://code-paste-html--violetherod.replit.app';
      
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

  // Send schedule via SMS
  app.post("/api/event-schedules/send-sms", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const baseUrl = 'https://code-paste-html--violetherod.replit.app';
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
  app.post("/api/event-schedules/import/parse", isAuthenticated, async (req: any, res) => {
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
  app.post("/api/event-schedules/import/confirm", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.post("/api/event-schedules", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { eventName, eventDate, eventLocation, readyByTime, notes, bookingId } = req.body;
      
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
        status: 'draft',
      });
      
      res.json(schedule);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update schedule
  app.patch("/api/event-schedules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const schedule = await storage.getEventDaySchedule(req.params.id);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      const userId = req.user.claims.sub;
      if (schedule.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const updated = await storage.updateEventDaySchedule(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete schedule
  app.delete("/api/event-schedules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const schedule = await storage.getEventDaySchedule(req.params.id);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      const userId = req.user.claims.sub;
      if (schedule.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      await storage.deleteEventDaySchedule(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== SCHEDULE TEAM MEMBERS ==========
  
  // Add team member to schedule
  app.post("/api/event-schedules/:scheduleId/team", isAuthenticated, async (req: any, res) => {
    try {
      const schedule = await storage.getEventDaySchedule(req.params.scheduleId);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      const userId = req.user.claims.sub;
      if (schedule.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const { name, role, serviceType, color, displayOrder } = req.body;
      const member = await storage.createScheduleTeamMember({
        scheduleId: req.params.scheduleId,
        name,
        role: role || 'stylist',
        serviceType,
        color,
        displayOrder: displayOrder || 0,
      });
      
      res.json(member);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update team member
  app.patch("/api/event-schedules/team/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete team member
  app.delete("/api/event-schedules/team/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== SCHEDULE APPOINTMENTS ==========
  
  // Add appointment to schedule
  app.post("/api/event-schedules/:scheduleId/appointments", isAuthenticated, async (req: any, res) => {
    try {
      const schedule = await storage.getEventDaySchedule(req.params.scheduleId);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      const userId = req.user.claims.sub;
      if (schedule.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const { clientName, serviceType, startTime, endTime, teamMemberId, isVip, isBuffer, notes, displayOrder } = req.body;
      const appointment = await storage.createScheduleAppointment({
        scheduleId: req.params.scheduleId,
        teamMemberId,
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Bulk create appointments (for smart generation)
  app.post("/api/event-schedules/:scheduleId/appointments/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const schedule = await storage.getEventDaySchedule(req.params.scheduleId);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      const userId = req.user.claims.sub;
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update appointment
  app.patch("/api/event-schedules/appointments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const appointment = await storage.getScheduleAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      
      const schedule = await storage.getEventDaySchedule(appointment.scheduleId);
      if (!schedule || schedule.artistId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      const updated = await storage.updateScheduleAppointment(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Appointment not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Delete appointment
  app.delete("/api/event-schedules/appointments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== CHAT INVITES ==========
  app.post("/api/chat-invites", isAuthenticated, async (req: any, res) => {
    try {
      const senderId = req.user.claims.sub;
      const data = insertChatInviteSchema.parse({ ...req.body, senderId, status: 'pending' });
      
      const existingUser = await storage.getUserByEmail(data.inviteeEmail);
      const inviteData = {
        ...data,
        inviteeUserId: existingUser?.id || null,
      };
      
      const invite = await storage.createChatInvite(inviteData);
      res.json(invite);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/chat-invites/user/:userId", isAuthenticated, async (req, res) => {
    try {
      const invites = await storage.getChatInvitesByUser(req.params.userId);
      res.json(invites);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/chat-invites/:id", isAuthenticated, async (req, res) => {
    try {
      const invite = await storage.updateChatInvite(req.params.id, req.body);
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }
      res.json(invite);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== CONVERSATIONS ==========
  app.post("/api/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/conversations/user/:userId", isAuthenticated, async (req, res) => {
    try {
      const conversations = await storage.getConversationsByUser(req.params.userId);
      res.json(conversations);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/conversations/:id/participants", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.body;
      const participant = await storage.addParticipantToConversation(req.params.id, userId);
      res.json(participant);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== BUSINESS CHAT (Internal Team Communication) ==========
  // Get vendor/planner's business conversations
  app.get("/api/business-chat/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'artist' && user.role !== 'planner')) {
        return res.status(403).json({ error: "Only vendors and planners can access business chat" });
      }
      
      const conversations = await storage.getBusinessConversations(userId);
      res.json(conversations);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Create a new business conversation
  app.post("/api/business-chat/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'artist' && user.role !== 'planner')) {
        return res.status(403).json({ error: "Only vendors and planners can create business chats" });
      }
      
      const { title } = req.body;
      const conversation = await storage.createBusinessConversation(title || "Team Chat", userId);
      
      // Add owner as participant
      await storage.addParticipantToConversation(conversation.id, userId);
      
      res.json(conversation);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get messages in a business conversation
  app.get("/api/business-chat/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Send a message in a business conversation
  app.post("/api/business-chat/conversations/:id/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== TEAM MEMBERS ==========
  // Get team members for a vendor/planner
  app.get("/api/team-members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'artist' && user.role !== 'planner')) {
        return res.status(403).json({ error: "Only vendors and planners can manage team members" });
      }
      
      const members = await storage.getTeamMembers(userId);
      res.json(members);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Add a team member
  app.post("/api/team-members", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      
      // Check if the person has a Beauvette account
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update a team member
  app.patch("/api/team-members/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Remove a team member
  app.delete("/api/team-members/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const member = await storage.getTeamMember(req.params.id);
      
      if (!member || member.ownerId !== userId) {
        return res.status(404).json({ error: "Team member not found" });
      }
      
      await storage.deleteTeamMember(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Add participant to business conversation
  app.post("/api/business-chat/conversations/:id/participants", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== CONTACTS ==========
  app.get("/api/contacts/:userId", isAuthenticated, async (req, res) => {
    try {
      const contacts = await storage.getContactsForUser(req.params.userId);
      res.json(contacts);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== DATA IMPORT ==========
  // Import clients and message history in bulk
  app.post("/api/admin/import/clients-and-messages", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Import clients only
  app.post("/api/admin/import/clients", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Import messages only
  app.post("/api/admin/import/messages", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== CDI REALTIME COMPUTATION ==========
  // New realtime CDI endpoint using white paper framework
  app.post("/api/admin/cdi/compute-realtime/:bookingId", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get realtime CDI components for a booking
  app.get("/api/admin/cdi/realtime/:bookingId", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== SUPPORT CASES ==========
  app.post("/api/support-cases", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/support-cases/user/:userId", isAuthenticated, async (req, res) => {
    try {
      const cases = await storage.getSupportCasesByUser(req.params.userId);
      res.json(cases);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/support-cases/:id", isAuthenticated, async (req, res) => {
    try {
      const supportCase = await storage.updateSupportCase(req.params.id, req.body);
      if (!supportCase) {
        return res.status(404).json({ error: "Support case not found" });
      }
      res.json(supportCase);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== INVITATIONS ==========
  // Create invitation (admin only)
  app.post("/api/invitations", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get all invitations (admin only)
  app.get("/api/invitations", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const invitations = await storage.getInvitationsByInviter(user.id);
      res.json(invitations);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Accept invitation (authenticated user)
  app.post("/api/invitations/accept/:token", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const invitation = await storage.acceptInvitation(req.params.token, userId);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }
      
      // Update user role based on invitation
      await storage.updateUserRole(userId, invitation.role);
      
      res.json({ success: true, invitation });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== OBJECT STORAGE ==========
  // Serve objects (profile images, etc.) - public access for visibility="public" objects
  app.get("/objects/:objectPath(*)", async (req: any, res) => {
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
  app.post("/api/objects/upload", isAuthenticated, async (req: any, res) => {
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
  app.put("/api/profile-image", isAuthenticated, async (req: any, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    const userId = req.user.claims.sub;

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
  app.post("/api/admin/import-booking", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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
      
      // Create or get client user (placeholder for now - they'll claim via invitation)
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
  app.post("/api/vendor/import-booking", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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
  app.get("/api/vendor/contacts", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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

  app.post("/api/vendor/contacts", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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
  app.post("/api/vendor/create-booking", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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
  app.get("/api/vendor/bookings", isAuthenticated, async (req: any, res) => {
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
  app.post("/api/planner/import-booking", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/admin/users", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/admin/bookings", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const allBookings = await storage.getAllBookings();
      res.json(allBookings);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/admin/contracts", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const allContracts = await storage.getAllContracts();
      res.json(allContracts);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/admin/payments", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const allPayments = await storage.getAllPayments();
      res.json(allPayments);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/admin/support-cases", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const allCases = await storage.getAllSupportCases();
      res.json(allCases);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== VENDOR VERIFICATION (Admin) ==========
  // Get all vendors pending verification
  app.get("/api/admin/vendors/pending", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const pendingVendors = await storage.getPendingVendors();
      res.json(pendingVendors);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get all vendors with their verification status
  app.get("/api/admin/vendors", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const allVendors = await storage.getAllVendorsWithStatus();
      res.json(allVendors);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Approve a vendor
  app.post("/api/admin/vendors/:userId/approve", isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.claims.sub);
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Reject a vendor
  app.post("/api/admin/vendors/:userId/reject", isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.claims.sub);
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Suspend a vendor (e.g., after reports)
  app.post("/api/admin/vendors/:userId/suspend", isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.claims.sub);
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== PROFILE REPORTS (Admin) ==========
  // Get all profile reports
  app.get("/api/admin/reports", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const reports = await storage.getAllProfileReports();
      res.json(reports);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Review a profile report
  app.post("/api/admin/reports/:id/review", isAuthenticated, async (req: any, res) => {
    try {
      const adminUser = await storage.getUser(req.user.claims.sub);
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Submit a profile report (any authenticated user can report)
  app.post("/api/reports", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { reportedUserId, reason, description } = req.body;
      
      const report = await storage.createProfileReport({
        reportedUserId,
        reporterId: userId,
        reason,
        description,
        status: 'pending',
      });
      
      res.json({ message: "Report submitted", report });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== CDI (Choreography Depth Index) ==========
  app.get("/api/admin/cdi/scores", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const scores = await storage.getAllCdiScores();
      res.json(scores);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/admin/cdi/events/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const events = await storage.getCdiEventsByUser(req.params.userId);
      res.json(events);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/admin/cdi/calculate/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== CDI AI (HACO Framework) ==========
  // Get AI insights for a client
  app.get("/api/admin/cdi/ai/insights/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const insights = await storage.getCdiAiInsightsByUser(req.params.userId);
      res.json(insights);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get latest AI insight for a client
  app.get("/api/admin/cdi/ai/insights/:userId/latest", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const insight = await storage.getLatestCdiAiInsight(req.params.userId);
      res.json(insight || null);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get threshold policies
  app.get("/api/admin/cdi/thresholds", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const thresholds = await storage.getCdiThresholds();
      res.json(thresholds);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Create threshold policy
  app.post("/api/admin/cdi/thresholds", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const data = insertCdiThresholdSchema.parse({
        ...req.body,
        createdBy: req.user.claims.sub,
      });
      const threshold = await storage.createCdiThreshold(data);
      res.json(threshold);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Update threshold policy
  app.patch("/api/admin/cdi/thresholds/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const threshold = await storage.updateCdiThreshold(req.params.id, req.body);
      if (!threshold) {
        return res.status(404).json({ error: "Threshold not found" });
      }
      res.json(threshold);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Record admin override (for HACO adaptive learning)
  app.post("/api/admin/cdi/overrides", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const data = insertCdiAdminOverrideSchema.parse({
        ...req.body,
        adminId: req.user.claims.sub,
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get all admin overrides
  app.get("/api/admin/cdi/overrides", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const overrides = await storage.getCdiAdminOverrides();
      res.json(overrides);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Trigger AI analysis for a specific client
  app.post("/api/admin/cdi/ai/analyze/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== INVISIBLE LABOR API ==========
  
  // Get invisible labor stats for the current user (vendor/planner)
  app.get("/api/invisible-labor/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'artist' && user.role !== 'planner')) {
        return res.status(403).json({ error: "Only vendors and planners can view labor stats" });
      }
      
      const stats = await storage.getInvisibleLaborStats(userId);
      res.json(stats);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get recent pivots (admin view)
  app.get("/api/admin/invisible-labor/pivots", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const limit = parseInt(req.query.limit as string) || 50;
      const pivots = await storage.getRecentPivots(limit);
      res.json(pivots);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get insights for a conversation
  app.get("/api/business-chat/conversations/:id/insights", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== CDI THREE-DIMENSION API ==========
  
  // Get all composite scores with dimension breakdown
  app.get("/api/admin/cdi/composite-scores", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const scores = await storage.getAllCdiCompositeScores();
      res.json(scores);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get latest composite score for a user
  app.get("/api/admin/cdi/composite-scores/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const score = await storage.getLatestCdiCompositeScore(req.params.userId);
      res.json(score || null);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get dimension scores history for a user
  app.get("/api/admin/cdi/dimension-scores/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const scores = await storage.getCdiDimensionScoresByUser(req.params.userId);
      res.json(scores);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get behavioral events for a user
  app.get("/api/admin/cdi/behavioral-events/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      const events = await storage.getCdiBehavioralEventsByUser(req.params.userId);
      res.json(events);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Trigger three-dimension CDI analysis
  app.post("/api/admin/cdi/analyze-dimensions/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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
      
      // Store the composite score with the weights that were used
      await storage.createCdiCompositeScore({
        userId,
        compositeScore: result.compositeScore,
        trustLevel: result.trustLevel,
        emotionalFidelityScore: result.dimensions.emotionalFidelity.score,
        choreographyAwarenessScore: result.dimensions.choreographyAwareness.score,
        roleSpecificRecallScore: result.dimensions.roleSpecificRecall.score,
        emotionalFidelityWeight: result.weightsUsed.emotionalFidelity,
        choreographyAwarenessWeight: result.weightsUsed.choreographyAwareness,
        roleSpecificRecallWeight: result.weightsUsed.roleSpecificRecall,
        hacoOverallDecision: result.hacoOverallDecision,
        predictedSuccess: result.predictedSuccess,
        interventionRecommended: result.interventionRecommended,
        interventionReason: result.interventionReason,
      });
      
      // Store dimension scores
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
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Submit feedback for evolutionary learning
  app.post("/api/admin/cdi/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Get learning runs history
  app.get("/api/admin/cdi/learning-runs", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ error: "Admin access required" });
      }
      // For now return empty - would need to add getLearningRuns to storage
      res.json([]);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Template download endpoint (server-side generation to avoid antivirus false positives)
  app.get("/api/template/booking-csv", isAuthenticated, async (req: any, res) => {
    try {
      const template = `Client First Name,Client Last Name,Client Email,Event Date,Location,Total Amount,Deposit Amount,Planner First Name,Planner Last Name,Planner Email
Sarah,Johnson,sarah@email.com,2026-05-15,The Grand Ballroom,2500,500,Emily,Davis,emily@planner.com
Jessica,Williams,jess@email.com,2026-06-20,Sunset Gardens,3000,600,,,
Maria,Garcia,maria@email.com,March 15 2026,Beach Resort,2800,500,Amy,Chen,amy@events.com`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="beauvette-booking-template.csv"');
      res.send(template);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ========== CDI TEST ENDPOINT ==========
  // Test CDI analysis with raw text - useful for analyzing message threads
  app.post("/api/admin/cdi/test-analyze", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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
  app.get("/api/iqs/lead-scores", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.get("/api/iqs/warnings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.get("/api/iqs/lead-scores/:id", isAuthenticated, async (req: any, res) => {
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
  app.post("/api/iqs/analyze", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.post("/api/iqs/analyze-message", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.post("/api/iqs/events", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.post("/api/iqs/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.get("/api/iqs/patterns", isAuthenticated, async (req: any, res) => {
    try {
      const patterns = await storage.getActiveIqsPatterns();
      res.json(patterns);
    } catch (error: any) {
      console.error("[IQS] Error fetching patterns:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Admin: Trigger learning cycle
  app.post("/api/admin/iqs/learn", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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
  app.get("/api/admin/iqs/learning-runs", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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
  app.patch("/api/admin/iqs/patterns/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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
  app.post("/api/inquiries", async (req: any, res) => {
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
      
      // Auto-send info sheet if vendor has one enabled and mode is auto
      const artistProfile = await storage.getArtistProfile(data.vendorId);
      const hasInfoSheet = artistProfile?.infoSheetEnabled && (
        artistProfile?.infoSheetContent || 
        (artistProfile?.infoSheetType === 'pdf' && artistProfile?.infoSheetPdfUrl)
      );
      
      if (hasInfoSheet && (artistProfile?.infoSheetType !== 'manual' || data.responseMode === 'auto')) {
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
            // Update inquiry with info sheet sent timestamp
            await storage.updateInquiry(inquiry.id, { infoSheetSentAt: new Date() } as any);
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
      
      // Notify vendor of new inquiry
      if (vendor.email) {
        import('./emailService').then(async (emailService) => {
          // Log vendor notification
          await storage.createInquiryNotification({
            inquiryId: inquiry.id,
            type: 'vendor_alert',
            channel: 'email',
            recipientEmail: vendor.email!,
            subject: `New inquiry from ${data.clientName}`,
            content: `Inquiry for ${data.serviceType} on ${data.eventDate}`,
            status: 'pending',
          });
        });
      }
      
      res.json(inquiry);
    } catch (error: any) {
      console.error("[Inquiry] Error creating inquiry:", error);
      res.status(400).json({ error: error.message });
    }
  });
  
  // Get inquiries for a vendor
  app.get("/api/vendor/inquiries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'artist') {
        return res.status(403).json({ error: "Vendor access required" });
      }
      
      const inquiries = await storage.getInquiriesByVendor(userId);
      res.json(inquiries);
    } catch (error: any) {
      console.error("[Inquiry] Error fetching vendor inquiries:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get single inquiry
  app.get("/api/inquiries/:id", isAuthenticated, async (req: any, res) => {
    try {
      const inquiry = await storage.getInquiry(req.params.id);
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      
      // Check access - vendor or admin only
      const userId = req.user.claims.sub;
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
  
  // Vendor responds to inquiry (send info sheet manually if not auto-sent)
  app.post("/api/inquiries/:id/respond", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.post("/api/inquiries/:id/chat-invite", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      
      // Build chat link
      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : process.env.REPLIT_DEPLOYMENT_URL || 'https://beauvette.com';
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
  
  // Decline inquiry
  app.post("/api/inquiries/:id/decline", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const inquiry = await storage.getInquiry(req.params.id);
      
      if (!inquiry) {
        return res.status(404).json({ error: "Inquiry not found" });
      }
      
      if (inquiry.vendorId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { reason } = req.body;
      
      await storage.updateInquiry(inquiry.id, { 
        status: 'declined',
        declinedReason: reason 
      });
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Inquiry] Error declining inquiry:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
