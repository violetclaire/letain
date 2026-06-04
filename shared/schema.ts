import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Notification preferences type
export type NotificationPreferences = {
  channels: {
    email: boolean;
    sms: boolean;
  };
  types: {
    newBookings: boolean;
    newMessages: boolean;
    paymentReminders: boolean;
    scheduleUpdates: boolean;
    marketingUpdates: boolean;
  };
};

// Vendor SLA targets type
export type VendorSlaTargets = {
  firstResponseHours: number; // Target hours for first response (default: 24)
  terminalStateHours: number; // Target hours to reach terminal state (default: 48)
  holdWindowHours: number; // Default hold window for this vendor (default: 72)
};

// Vendor onboarding preferences type
export type VendorOnboardingPreferences = {
  calendarConnected: boolean;
  defaultHoldHours: number;
  slaTargets: VendorSlaTargets;
  notificationChannels: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  notificationTypes: {
    newInquiries: boolean;
    holdExpiring: boolean;
    slaWarnings: boolean;
    bookingConfirmations: boolean;
  };
};

// Users - represents all personas (clients, artists, planners, admins)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 50 }).unique(), // custom vanity URL like /themakeupdolls
  email: text("email").unique(),
  password: text("password"), // hashed password for email/password login
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role"), // 'client', 'artist', 'planner', 'admin'
  phone: text("phone"),
  intakeCompleted: boolean("intake_completed").default(false),
  // Stripe Connect (for planners - artists use artistProfiles) - DEPRECATED
  stripeAccountId: varchar("stripe_account_id"),
  // Square Connect (for planners - artists use artistProfiles)
  squareMerchantId: varchar("square_merchant_id"),
  squareAccessToken: text("square_access_token"),
  squareRefreshToken: text("square_refresh_token"),
  squareTokenExpiresAt: timestamp("square_token_expires_at"),
  // Alternative payment methods
  venmoHandle: varchar("venmo_handle"),
  // CDI Privacy & Consent
  cdiConsentGiven: boolean("cdi_consent_given").default(false),
  cdiConsentDate: timestamp("cdi_consent_date"),
  cdiOptOut: boolean("cdi_opt_out").default(false),
  // Notification preferences
  notificationPreferences: jsonb("notification_preferences").$type<NotificationPreferences>(),
  isBetaUser: boolean("is_beta_user").default(false),
  sharedToInstagram: boolean("shared_to_instagram").default(false),
  // Password reset
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client intake form data
export const clientIntakes = pgTable("client_intakes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  serviceType: text("service_type"), // 'beauty', 'photography', 'video', 'florals', 'planner', 'dj', 'catering', 'venue'
  eventType: text("event_type"), // 'wedding', 'engagement', 'corporate', etc.
  eventDate: timestamp("event_date"),
  eventLocation: text("event_location"),
  partySize: integer("party_size"),
  budget: text("budget"),
  preferredStyles: jsonb("preferred_styles").$type<string[]>(),
  specialRequirements: text("special_requirements"),
  howHeard: text("how_heard"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Artist/Vendor intake form data
export const artistIntakes = pgTable("artist_intakes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  businessName: text("business_name"),
  yearsExperience: integer("years_experience"),
  serviceTypes: jsonb("service_types").$type<string[]>(),
  serviceAreas: jsonb("service_areas").$type<string[]>(),
  priceRange: text("price_range"),
  portfolioUrl: text("portfolio_url"),
  instagramHandle: text("instagram_handle"),
  websiteUrl: text("website_url"),
  insuranceInfo: text("insurance_info"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Planner intake form data
export const plannerIntakes = pgTable("planner_intakes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  companyName: text("company_name"),
  yearsExperience: integer("years_experience"),
  specializationType: text("specialization_type"), // 'full-service', 'day-of', 'month-of'
  serviceAreas: jsonb("service_areas").$type<string[]>(),
  typicalBudgetRange: text("typical_budget_range"),
  vendorNetworkSize: integer("vendor_network_size"),
  instagramHandle: text("instagram_handle"),
  websiteUrl: text("website_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Artist profiles - extended info for artists
export const artistProfiles = pgTable("artist_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  businessName: text("business_name"),
  bio: text("bio"),
  location: text("location"),
  priceRange: text("price_range"),
  specialties: jsonb("specialties").$type<string[]>(),
  portfolioUrls: jsonb("portfolio_urls").$type<string[]>(),
  portfolioUrl: text("portfolio_url"),
  instagramHandle: text("instagram_handle"),
  tiktokHandle: text("tiktok_handle"),
  pinterestHandle: text("pinterest_handle"),
  websiteUrl: text("website_url"),
  stripeAccountId: text("stripe_account_id"), // DEPRECATED
  squareMerchantId: text("square_merchant_id"),
  squareAccessToken: text("square_access_token"),
  squareRefreshToken: text("square_refresh_token"),
  squareTokenExpiresAt: timestamp("square_token_expires_at"),
  squareLocationId: text("square_location_id"),
  squareEnvironment: text("square_environment").default("sandbox"), // 'sandbox' or 'production'
  servicesMenuUrl: text("services_menu_url"),
  contractTemplate: text("contract_template"), // Custom contract template for this artist
  prettyLinks: jsonb("pretty_links").$type<Record<string, string>>(), // Custom branded links
  logoUrl: text("logo_url"), // Business logo for branded emails/communications
  // Info sheet content - auto-sent to clients on inquiry
  infoSheetType: text("info_sheet_type").default("template"), // 'template', 'custom', or 'pdf'
  infoSheetContent: text("info_sheet_content"), // Rich text content of vendor's info sheet
  infoSheetPdfUrl: text("info_sheet_pdf_url"), // URL to uploaded PDF/image
  infoSheetEnabled: boolean("info_sheet_enabled").default(true), // Toggle to enable/disable auto-sending
  // Verification status - vendors must be approved before appearing in search
  verificationStatus: text("verification_status").default("pending"), // 'pending', 'approved', 'rejected', 'suspended'
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  artistSlug: varchar("artist_slug").unique(),
  referralArtists: jsonb("referral_artists").$type<string[]>(),
  responsiveBadge: boolean("responsive_badge").default(false),
  avgResponseTimeMinutes: integer("avg_response_time_minutes"),
  totalChatsAnswered: integer("total_chats_answered").default(0),
  responseRate: integer("response_rate").default(0),
  lastChatResponseAt: timestamp("last_chat_response_at"),
  // Vendor onboarding preferences
  onboardingCompleted: boolean("onboarding_completed").default(false),
  calendarConnected: boolean("calendar_connected").default(false),
  googleCalendarId: text("google_calendar_id"), // Connected Google Calendar ID
  defaultHoldHours: integer("default_hold_hours").default(72), // Default: 72 hours
  slaTargets: jsonb("sla_targets").$type<VendorSlaTargets>(),
  onboardingPreferences: jsonb("onboarding_preferences").$type<VendorOnboardingPreferences>(),
  editToken: varchar("edit_token").unique(),
  formSuccessMessage: text("form_success_message"), // Custom success message for embed form
  // Auto-responder settings - modes: 'off', 'info_sheet', 'smart', 'paused', 'availability_smart'
  autoResponderMode: text("auto_responder_mode").default("off"), // 'off', 'info_sheet', 'smart', 'paused', 'availability_smart'
  politeDeclineTemplate: text("polite_decline_template"), // Template for polite decline messages
  referralListTemplate: text("referral_list_template"), // Template for referral messages
  // Additional content fields
  pricingInfo: text("pricing_info"), // Quick summary of rates
  customResponse: text("custom_response"), // Personalized auto-response message
  plannerInfoSheet: text("planner_info_sheet"), // Wedding planner specific info sheet
  plannerPricing: text("planner_pricing"), // Planner-specific pricing sheet
  // Magic link login
  loginCode: varchar("login_code").unique(),
  loginCodeExpiresAt: timestamp("login_code_expires_at"),
  // --- Assistant delivery preferences (headless prompt queue) ---
  // How the operator wants business prompts pushed to them. Delivery is OFF by
  // default (both channel switches false) so existing DateInquiry behavior is
  // unchanged until the operator opts in. The prompt is always recorded in the
  // queue regardless of these switches.
  preferredDeliveryChannel: text("preferred_delivery_channel").default("email"), // 'sms' | 'email' | 'both'
  assistantPhoneEnabled: boolean("assistant_phone_enabled").default(false),
  assistantEmailEnabled: boolean("assistant_email_enabled").default(false),
  assistantQuietHoursStart: integer("assistant_quiet_hours_start"), // 0-23 local hour, null = no quiet hours
  assistantQuietHoursEnd: integer("assistant_quiet_hours_end"), // 0-23 local hour
  assistantTimezone: text("assistant_timezone"), // IANA tz, e.g. 'America/New_York'
  assistantPromptMode: text("assistant_prompt_mode").default("immediate"), // 'immediate' | 'digest'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Trusted Circle - referral network for artists
// Quiet-removal fields support the "compassionate exit" pattern: not a blacklist,
// just "not in my default routing right now." They are never notified.
export const trustedCircle = pgTable("trusted_circle", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").notNull().references(() => users.id),
  refereeName: text("referee_name").notNull(),
  refereeEmail: text("referee_email"),
  refereeInstagram: text("referee_instagram"),
  inviteToken: varchar("invite_token").unique(),
  status: text("status").default("pending"), // 'pending', 'active'
  quietlyRemoved: boolean("quietly_removed").default(false),
  removedAt: timestamp("removed_at"),
  removedReason: text("removed_reason"), // private — your note to yourself
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTrustedCircleSchema = createInsertSchema(trustedCircle).omit({ id: true, createdAt: true });
export type InsertTrustedCircle = z.infer<typeof insertTrustedCircleSchema>;
export type TrustedCircle = typeof trustedCircle.$inferSelect;

// Blocked Dates - calendar availability
export const blockedDates = pgTable("blocked_dates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  artistId: varchar("artist_id").notNull().references(() => users.id),
  blockedDate: text("blocked_date").notNull(), // YYYY-MM-DD format
  reason: text("reason").default("Pending"), // 'Pending' or 'Booked'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBlockedDateSchema = createInsertSchema(blockedDates).omit({ id: true, createdAt: true });
export type InsertBlockedDate = z.infer<typeof insertBlockedDateSchema>;
export type BlockedDate = typeof blockedDates.$inferSelect

// Form field configuration types
export type FormFieldType = 'text' | 'textarea' | 'select' | 'checkbox' | 'date' | 'email' | 'phone';

export type FormField = {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select/checkbox fields
  order: number;
  isCore?: boolean; // Core fields cannot be deleted (name, email, date)
};

export type FormConfig = {
  fields: FormField[];
  submitButtonText: string;
  successMessage: string;
};

// Artist form configurations - custom inquiry form settings
export const artistFormConfigs = pgTable("artist_form_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  artistId: varchar("artist_id").notNull().references(() => users.id),
  config: jsonb("config").$type<FormConfig>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertArtistFormConfigSchema = createInsertSchema(artistFormConfigs).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertArtistFormConfig = z.infer<typeof insertArtistFormConfigSchema>;
export type ArtistFormConfig = typeof artistFormConfigs.$inferSelect;

// Profile reports - for flagging suspicious/inappropriate profiles
export const profileReports = pgTable("profile_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportedUserId: varchar("reported_user_id").notNull().references(() => users.id),
  reporterId: varchar("reporter_id").notNull().references(() => users.id),
  reason: text("reason").notNull(), // 'spam', 'fake', 'inappropriate', 'scam', 'other'
  description: text("description"),
  status: text("status").default("pending"), // 'pending', 'reviewed', 'action_taken', 'dismissed'
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  actionTaken: text("action_taken"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Artist services - individual service offerings
export const artistServices = pgTable("artist_services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  artistId: varchar("artist_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price"), // in cents
  duration: integer("duration"), // in minutes
  category: text("category"), // e.g., 'bridal', 'bridesmaid', 'trial', 'engagement'
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Client contacts - for vendors to add existing clients who aren't on the platform yet
export const clientContacts = pgTable("client_contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  artistId: varchar("artist_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  linkedUserId: varchar("linked_user_id").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Bookings - service requests and confirmed bookings
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => users.id),
  clientContactId: varchar("client_contact_id").references(() => clientContacts.id),
  artistId: varchar("artist_id").references(() => users.id),
  plannerId: varchar("planner_id").references(() => users.id),
  status: text("status").notNull(), // 'pending', 'accepted', 'declined', 'completed', 'confirmed'
  eventDate: timestamp("event_date").notNull(),
  location: text("location").notNull(),
  serviceType: text("service_type").notNull(),
  amount: integer("amount"),
  notes: text("notes"),
  inspirationPhotos: jsonb("inspiration_photos").$type<string[]>(),
  stripePaymentLinkId: text("stripe_payment_link_id"), // DEPRECATED
  stripePaymentLinkUrl: text("stripe_payment_link_url"), // DEPRECATED
  squareInvoiceId: text("square_invoice_id"),
  squarePaymentLinkUrl: text("square_payment_link_url"),
  squareOrderId: text("square_order_id"),
  paymentStatus: text("payment_status").default("pending"),
  dayOfReminders: text("day_of_reminders"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Booking Checklists - day-of readiness tracking for vendors
// Each item completion writes to audit log and feeds CDI signals silently
export type BookingChecklistItem = {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
};

export const bookingChecklists = pgTable("booking_checklists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull().references(() => bookings.id),
  vendorId: varchar("vendor_id").notNull().references(() => users.id),
  checklistType: text("checklist_type").notNull().default("day_of_readiness"), // 'day_of_readiness', 'pre_event', 'post_event'
  items: jsonb("items").$type<BookingChecklistItem[]>().notNull().default([]),
  allCompleted: boolean("all_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messages - communication between parties
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  recipientId: varchar("recipient_id").notNull().references(() => users.id),
  bookingId: varchar("booking_id").references(() => bookings.id),
  content: text("content").notNull(),
  sentimentScore: integer("sentiment_score"), // For CDI calculation
  isEscalated: boolean("is_escalated").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Contracts
export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").references(() => bookings.id), // nullable for inquiry-based contracts
  inquiryId: varchar("inquiry_id").references(() => inquiries.id), // link to inquiry if created from thread
  artistId: varchar("artist_id").notNull().references(() => users.id),
  clientId: varchar("client_id").notNull().references(() => users.id),
  packageDetails: text("package_details").notNull(),
  totalAmount: integer("total_amount").notNull(), // in cents
  depositAmount: integer("deposit_amount"), // in cents
  depositPaidAt: timestamp("deposit_paid_at"),
  remainingAmount: integer("remaining_amount"), // in cents
  status: text("status").default("draft"), // 'draft', 'sent', 'signed', 'cancelled'
  signedAt: timestamp("signed_at"),
  fileUrl: text("file_url"),
  openSignDocumentId: text("open_sign_document_id"),
  openSignSigningUrl: text("open_sign_signing_url"),
  openSignCertificateUrl: text("open_sign_certificate_url"),
  serviceItems: jsonb("service_items").$type<Array<{
    clientType: string;
    qty: number;
    service: string;
    price: number;
    total: number;
  }>>(),
  eventDates: text("event_dates"),
  eventLocation: text("event_location"),
  serviceStartTime: text("service_start_time"),
  serviceEndTime: text("service_end_time"),
  clientName: text("client_name"),
  clientContact: text("client_contact"),
  photographerInfo: text("photographer_info"),
  venmoHandle: text("venmo_handle"),
  paypalEmail: text("paypal_email"),
  balanceDueDate: text("balance_due_date"),
  // Built-in e-signature fields (like Dubsado)
  signingToken: text("signing_token").unique(), // Unique token for signing link
  clientSignature: text("client_signature"), // Typed signature text
  signedByName: text("signed_by_name"), // Name entered when signing
  signedByEmail: text("signed_by_email"), // Email entered when signing
  signedOnBehalfOf: text("signed_on_behalf_of"), // Optional: if signing on behalf of someone else
  contractHtml: text("contract_html"), // Rendered contract HTML for signing page
  sentForSigningAt: timestamp("sent_for_signing_at"), // When the signing link was sent
  artistSignature: text("artist_signature"),
  artistSignedAt: timestamp("artist_signed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contract Templates - reusable contract templates for vendors
export const contractTemplates = pgTable("contract_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  artistId: varchar("artist_id").notNull().references(() => users.id),
  name: text("name").notNull(), // e.g., "Standard Wedding Package", "Engagement Session"
  content: text("content").notNull(), // The template content (HTML/Markdown)
  defaultPackageDetails: text("default_package_details"),
  defaultTotalAmount: integer("default_total_amount"), // in cents
  defaultDepositAmount: integer("default_deposit_amount"), // in cents
  defaultDepositPercent: integer("default_deposit_percent"), // percentage (e.g., 50 for 50%)
  paymentSchedule: text("payment_schedule"), // e.g., "50% deposit, 50% day-of"
  cancellationPolicy: text("cancellation_policy"),
  lateFees: text("late_fees"),
  travelPolicy: text("travel_policy"),
  isDefault: boolean("is_default").default(false), // Default template for new contracts
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Platform Invitations - for inviting clients/planners to create profiles
export const invitations = pgTable("invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: varchar("token").notNull().unique(), // unique invitation token
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").notNull(), // 'client' or 'planner'
  bookingId: varchar("booking_id").references(() => bookings.id),
  invitedBy: varchar("invited_by").notNull().references(() => users.id),
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'expired'
  acceptedAt: timestamp("accepted_at"),
  acceptedUserId: varchar("accepted_user_id").references(() => users.id),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Payments/Invoices
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").references(() => contracts.id), // nullable for standalone invoices
  amount: integer("amount").notNull(), // in cents
  status: text("status").notNull(), // 'pending', 'paid', 'failed', 'refunded'
  stripeInvoiceId: text("stripe_invoice_id"), // DEPRECATED
  stripePaymentIntentId: text("stripe_payment_intent_id"), // DEPRECATED
  squareInvoiceId: text("square_invoice_id"),
  squarePaymentId: text("square_payment_id"),
  dueDate: timestamp("due_date").notNull(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Vendor/Planner availability calendar
export const availability = pgTable("availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  isAvailable: boolean("is_available").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Day-of schedules (legacy - simple timeline)
export const schedules = pgTable("schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull().references(() => bookings.id),
  artistName: text("artist_name").notNull(),
  numArtists: integer("num_artists").notNull(),
  numServices: integer("num_services").notNull(),
  startTime: text("start_time").notNull(),
  timeline: jsonb("timeline").$type<Array<{time: string, description: string}>>(),
  dayOfReminders: text("day_of_reminders"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Event Day Schedules - Smart scheduling grid for wedding day timelines
export const eventDaySchedules = pgTable("event_day_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  artistId: varchar("artist_id").notNull().references(() => users.id), // The vendor who created this
  bookingId: varchar("booking_id").references(() => bookings.id), // Optional link to booking
  eventName: text("event_name").notNull(), // e.g., "Smith Wedding" or client name
  eventDate: timestamp("event_date").notNull(),
  sessionDetails: text("session_details"), // For multiple events same day: "Morning Session", "Afternoon - Bride Only"
  eventLocation: text("event_location"),
  readyByTime: text("ready_by_time"), // When bride/VIP needs to be ready (e.g., "2:00 PM")
  notes: text("notes"),
  recipientEmails: text("recipient_emails"), // Comma-separated emails for sharing
  guestNotes: text("guest_notes"), // Notes from guests (room numbers, questions)
  shareToken: varchar("share_token"), // For public shareable link
  status: text("status").default("draft"), // 'draft', 'finalized', 'sent'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schedule Team Members - Each column in the grid (represents a stylist working that day)
export const scheduleTeamMembers = pgTable("schedule_team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleId: varchar("schedule_id").notNull().references(() => eventDaySchedules.id, { onDelete: 'cascade' }),
  name: text("name").notNull(), // e.g., "Violet", "Lisa"
  role: text("role").notNull().default("stylist"), // 'lead', 'stylist', 'assistant'
  serviceType: text("service_type"), // 'hair', 'makeup', 'both' - what this person does
  color: text("color"), // Optional color for UI display
  displayOrder: integer("display_order").default(0), // Order in the grid
  assignmentLink: text("assignment_link"), // Artist's schedule link for this assignment
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schedule Appointments - Individual time slots for each client
export const scheduleAppointments = pgTable("schedule_appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleId: varchar("schedule_id").notNull().references(() => eventDaySchedules.id, { onDelete: 'cascade' }),
  teamMemberId: varchar("team_member_id").references(() => scheduleTeamMembers.id, { onDelete: 'set null' }), // Which stylist
  clientName: text("client_name").notNull(), // e.g., "Nicole", "Holly"
  serviceType: text("service_type").notNull(), // 'H' (hair), 'M' (makeup), 'HM' (both)
  startTime: text("start_time").notNull(), // e.g., "8:30"
  endTime: text("end_time").notNull(), // e.g., "9:30"
  isVip: boolean("is_vip").default(false), // Bride, MOH, etc.
  isBuffer: boolean("is_buffer").default(false), // Buffer time slot
  blockType: text("block_type").default("service"), // 'service', 'touchup', 'buffer', 'travel', 'setup'
  locationName: text("location_name"), // e.g., "Villa 21", "Pool Cabana"
  locationAddress: text("location_address"), // Full address if different from main venue
  notes: text("notes"),
  inspirationPhotos: text("inspiration_photos").array(), // URLs of uploaded inspiration photos
  displayOrder: integer("display_order").default(0), // Order within the column
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schedule Chat Messages - For guest chat on public schedule pages (no login required)
export const scheduleChatMessages = pgTable("schedule_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleId: varchar("schedule_id").notNull().references(() => eventDaySchedules.id, { onDelete: 'cascade' }),
  senderName: text("sender_name").notNull(), // Guest name or "Beauvette AI"
  senderType: text("sender_type").notNull(), // 'guest', 'ai', 'artist'
  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<{
    aiAction?: string; // 'update_schedule', 'add_note', 'answer_question'
    appointmentId?: string; // If AI modified an appointment
    changeDescription?: string; // What AI changed
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chat invites - for inviting people to chat
export const chatInvites = pgTable("chat_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  inviteeEmail: text("invitee_email").notNull(),
  inviteeUserId: varchar("invitee_user_id").references(() => users.id),
  status: text("status").notNull(), // 'pending', 'accepted', 'declined'
  bookingId: varchar("booking_id").references(() => bookings.id),
  inquiryId: varchar("inquiry_id"), // Link to inquiry that triggered this chat invite (FK added after inquiries table)
  token: varchar("token"), // Single-use signed token for email links
  expiresAt: timestamp("expires_at"), // Token expiry (7 days by default)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chat invite messages - conversation history between artist and client
export const chatInviteMessages = pgTable("chat_invite_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatInviteId: varchar("chat_invite_id").notNull().references(() => chatInvites.id, { onDelete: 'cascade' }),
  senderType: text("sender_type").notNull(), // 'artist', 'client', 'ai'
  senderName: text("sender_name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Direct chats - standalone conversations not tied to client folders/inquiries
export const directChats = pgTable("direct_chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  artistId: varchar("artist_id").notNull().references(() => users.id),
  participantName: text("participant_name").notNull(),
  participantEmail: text("participant_email").notNull(),
  participantRole: text("participant_role").notNull().default("contact"), // 'planner', 'client', 'vendor', 'contact'
  threadToken: varchar("thread_token").unique().default(sql`gen_random_uuid()`), // Artist's access token
  participantToken: varchar("participant_token").unique().default(sql`gen_random_uuid()`), // Participant's magic link token
  subject: text("subject"), // Optional subject/purpose
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Direct chat messages - messages in standalone conversations
export const directChatMessages = pgTable("direct_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  directChatId: varchar("direct_chat_id").notNull().references(() => directChats.id, { onDelete: 'cascade' }),
  senderType: text("sender_type").notNull(), // 'artist', 'participant'
  senderName: text("sender_name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// OAuth states - database-backed OAuth state storage for cross-environment persistence
export const oauthStates = pgTable("oauth_states", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  state: varchar("state").notNull().unique(), // The random state token
  userId: varchar("user_id").notNull(), // User ID this OAuth is for
  artistSlug: text("artist_slug"), // Optional artist slug for public flows
  returnBaseUrl: text("return_base_url"), // URL to redirect after OAuth
  callbackUrl: text("callback_url"), // Exact callback URL used in authorization (must match for token exchange)
  provider: text("provider").notNull().default("square"), // OAuth provider (square, etc)
  expiresAt: timestamp("expires_at").notNull(), // When this state expires
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOAuthStateSchema = createInsertSchema(oauthStates).omit({
  id: true,
  createdAt: true,
});
export type InsertOAuthState = z.infer<typeof insertOAuthStateSchema>;
export type OAuthState = typeof oauthStates.$inferSelect;

// Hold struct type for inquiries
export type InquiryHoldStruct = {
  placedAt: string | null;
  expiresAt: string | null;
  ownerId: string | null;
  reason: string | null;
};

// StatusReason enum values for inquiry state machine
export const InquiryStatusReasons = {
  DECLINED_BY_VENDOR: 'declined_by_vendor',
  DECLINED_BY_CLIENT: 'declined_by_client',
  HOLD_EXPIRED: 'hold_expired',
  AUTO_DECLINED_SLA: 'auto_declined_sla',
} as const;
export type InquiryStatusReason = typeof InquiryStatusReasons[keyof typeof InquiryStatusReasons];

// NextAction enum values for inquiry workflow
export const InquiryNextActions = {
  VENDOR_FIRST_RESPONSE: 'vendor_first_response',
  VENDOR_CONFIRM: 'vendor_confirm',
  CLIENT_PAYMENT: 'client_payment',
  CLIENT_REPLY: 'client_reply',
} as const;
export type InquiryNextAction = typeof InquiryNextActions[keyof typeof InquiryNextActions];

// Inquiries - client inquiries to vendors before booking
export const inquiries = pgTable("inquiries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadToken: varchar("thread_token").unique().default(sql`gen_random_uuid()`), // Artist's admin access token
  clientThreadToken: varchar("client_thread_token").unique().default(sql`gen_random_uuid()`), // Client's read/reply access token
  vendorId: varchar("vendor_id").notNull().references(() => users.id),
  clientId: varchar("client_id").references(() => users.id), // Nullable until client creates account
  clientEmail: text("client_email").notNull(), // Always captured for email follow-up
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone"),
  eventDate: timestamp("event_date").notNull(),
  eventType: text("event_type"), // 'wedding', 'engagement', 'bridal_shower', etc.
  eventLocation: text("event_location"),
  serviceType: text("service_type").notNull(), // 'beauty', 'photography', etc.
  partySize: integer("party_size"), // Number of people needing services
  message: text("message"), // Client's initial message/notes
  budget: text("budget"), // Budget range if provided
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'auto_responded', 'referred', 'declined', 'deposit_paid'
  responseMode: text("response_mode").default("auto"), // 'auto' or 'manual' - how vendor responds
  depositPaidAt: timestamp("deposit_paid_at"), // When deposit was paid (stops velocity clock)
  infoSheetSentAt: timestamp("info_sheet_sent_at"), // When info sheet was sent
  chatInviteSentAt: timestamp("chat_invite_sent_at"), // When chat invite was sent
  bookingId: varchar("booking_id").references(() => bookings.id), // Calendar locking sourced from Booking presence
  convertedToBookingId: varchar("converted_to_booking_id").references(() => bookings.id), // Legacy: If confirmed (use bookingId)
  convertedToContractId: varchar("converted_to_contract_id").references(() => contracts.id), // If confirmed to contract
  declinedReason: text("declined_reason"), // Why vendor declined
  // Referral tracking - when inquiry was created via decline+referral flow
  referralSourceInquiryId: varchar("referral_source_inquiry_id"), // Original inquiry that was declined
  referralSourceVendorId: varchar("referral_source_vendor_id").references(() => users.id), // Vendor who referred this lead
  referralSentAt: timestamp("referral_sent_at"), // When the referral was sent
  // Status metadata for UI "who/what/when" display
  statusReason: text("status_reason"), // Reason for current status (declined, expired, etc.)
  nextAction: text("next_action"), // 'vendor_respond', 'client_decide', 'send_contract', 'collect_deposit', etc.
  nextActionDueAt: timestamp("next_action_due_at"), // When next action is expected
  // Ownership - who's currently responsible for next action
  ownerId: varchar("owner_id").references(() => users.id), // Current responsible user
  // Hold state as consolidated struct (source of truth)
  hold: jsonb("hold").$type<InquiryHoldStruct>(), // Consolidated hold state
  // Legacy hold fields (kept for backward compatibility during migration)
  holdPlacedAt: timestamp("hold_placed_at"), // When hold was placed
  holdExpiresAt: timestamp("hold_expires_at"), // When hold expires (auto-release)
  holdOwnerId: varchar("hold_owner_id").references(() => users.id), // Who placed the hold
  holdReason: text("hold_reason"), // Why they're holding this date
  // SLA tracking fields
  firstResponseAt: timestamp("first_response_at"), // When vendor first responded
  lastActionAt: timestamp("last_action_at"), // Last meaningful action taken
  nextSlaDue: timestamp("next_sla_due"), // Next SLA deadline (computed on state changes)
  // Escalation state machine
  escalationState: text("escalation_state").default("none"), // 'none', 'warned', 'reassigned', 'expired'
  breachFlags: jsonb("breach_flags").$type<string[]>(), // Array of SLA breaches set by worker
  // Proposals
  proposalId: varchar("proposal_id"), // Link to active proposal if sent
  proposedDates: jsonb("proposed_dates").$type<string[]>(), // Alternative dates proposed by vendor
  metadata: jsonb("metadata").$type<{
    source?: string; // 'browse_page', 'direct_link', 'referral'
    referredBy?: string;
    preferredStyles?: string[];
    inspirationUrls?: string[];
  }>(),
  // AI sentiment analysis of client's initial message
  sentiment: text("sentiment"), // 'positive', 'neutral', 'negative', 'distressed'
  sentimentScore: integer("sentiment_score"), // 0-100 confidence score
  sentimentAnalysis: jsonb("sentiment_analysis").$type<{
    anxietyLevel?: number;
    frustrationLevel?: number;
    confusionLevel?: number;
    satisfactionLevel?: number;
    urgencyLevel?: number;
    distressSignals?: Array<{ type: string; severity: number; evidence: string }>;
    aiRationale?: string;
    suggestedAction?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Inquiry Notifications - audit trail for all inquiry-related communications
export const inquiryNotifications = pgTable("inquiry_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inquiryId: varchar("inquiry_id").notNull().references(() => inquiries.id),
  type: text("type").notNull(), // 'inquiry_receipt', 'info_sheet', 'chat_invite', 'vendor_alert', 'reminder', 'follow_up'
  channel: text("channel").notNull(), // 'email', 'sms'
  actorSystem: text("actor_system"), // 'resend', 'twilio', 'cron_worker' - for traceability
  recipientEmail: text("recipient_email"),
  recipientPhone: text("recipient_phone"),
  subject: text("subject"),
  content: text("content"), // Summary of what was sent
  status: text("status").notNull().default("pending"), // 'pending', 'sent', 'delivered', 'failed', 'bounced'
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  errorMessage: text("error_message"), // If failed
  metadata: jsonb("metadata").$type<{
    emailId?: string; // Resend email ID for tracking
    templateUsed?: string;
    chatInviteToken?: string;
    [key: string]: unknown;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Conversations - for managing chat threads
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").references(() => bookings.id),
  title: varchar("title"), // Conversation title (e.g., "Client Name - Date")
  channelType: text("channel_type").notNull().default("client"), // 'client' = client-facing, 'business' = internal team
  ownerId: varchar("owner_id").references(() => users.id), // For business chats, the vendor/planner who owns it
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Conversation participants
export const conversationParticipants = pgTable("conversation_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// Team members - for business/vendor team collaboration
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id), // The vendor/planner who owns the team
  memberId: varchar("member_id").references(() => users.id), // Registered user if they have an account
  memberEmail: text("member_email").notNull(), // Email for invites (can be non-registered)
  memberName: text("member_name").notNull(), // Display name
  role: text("role").notNull().default("team_member"), // 'team_member', 'assistant', 'coordinator'
  status: text("status").notNull().default("invited"), // 'invited', 'active', 'removed'
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
});

// Business chat messages - separate encrypted-ready storage for sensitive team communication
export const businessChatMessages = pgTable("business_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(), // Message content (encrypted at rest in production)
  messageType: text("message_type").notNull().default("text"), // 'text', 'voice_transcript', 'file', 'system'
  metadata: jsonb("metadata").$type<{
    voiceUrl?: string;
    fileName?: string;
    fileUrl?: string;
    mentions?: string[];
    bookingRef?: string;
  }>(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Business chat AI insights - captures "invisible labor" analysis for each message
export const businessChatInsights = pgTable("business_chat_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => businessChatMessages.id),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  // Pivot detection - captures the "invisible labor" moments
  pivotType: text("pivot_type"), // 'schedule_change', 'last_minute_save', 'crisis_averted', 'client_accommodation', 'vendor_coordination', 'problem_resolution', null if no pivot
  pivotSeverity: integer("pivot_severity"), // 1-10, how significant was this pivot
  // Urgency and impact
  urgencyLevel: integer("urgency_level").notNull().default(1), // 1-10
  clientImpact: text("client_impact"), // 'positive', 'neutral', 'negative', 'saved_disaster', 'prevented_issue'
  clientImpactScore: integer("client_impact_score").notNull().default(0), // -100 to +100
  // Task and labor tracking
  taskType: text("task_type"), // 'coordination', 'communication', 'problem_solving', 'scheduling', 'payment', 'logistics'
  estimatedLaborMinutes: integer("estimated_labor_minutes"), // AI estimate of invisible labor time
  // Sentiment and emotional context
  sentiment: text("sentiment").notNull().default("neutral"), // 'positive', 'neutral', 'stressed', 'frustrated', 'relieved'
  confidenceScore: integer("confidence_score").notNull().default(0), // 0-100
  // AI rationale
  aiSummary: text("ai_summary"), // Brief AI explanation of what was detected
  // Link to CDI if client-related
  relatedClientId: varchar("related_client_id").references(() => users.id),
  relatedBookingId: varchar("related_booking_id").references(() => bookings.id),
  // CDI event created from this insight
  cdiEventId: varchar("cdi_event_id").references(() => cdiEvents.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Support cases for emergency escalation
export const supportCases = pgTable("support_cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  bookingId: varchar("booking_id").references(() => bookings.id),
  priority: text("priority").notNull(), // 'low', 'medium', 'high', 'emergency'
  status: text("status").notNull().default("open"), // 'open', 'in_progress', 'resolved', 'closed'
  subject: text("subject").notNull(),
  description: text("description"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CDI Events - for tracking client distress signals
export const cdiEvents = pgTable("cdi_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  bookingId: varchar("booking_id").references(() => bookings.id),
  eventType: text("event_type").notNull(), // 'message_negative', 'payment_late', 'cancellation_request', 'escalation', 'support_case', etc.
  severity: integer("severity").notNull(), // 1-10 scale
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// CDI Scores - aggregated client distress index
export const cdiScores = pgTable("cdi_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  score: integer("score").notNull(), // 0-100, higher = more distress
  riskLevel: text("risk_level").notNull(), // 'low', 'medium', 'high', 'critical'
  factors: jsonb("factors").$type<{
    messageSentiment: number;
    paymentIssues: number;
    supportCases: number;
    cancellations: number;
    responseDelays: number;
  }>(),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
});

// CDI AI Insights - Gemini-powered analysis results (HACO framework)
export const cdiAiInsights = pgTable("cdi_ai_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  messageId: varchar("message_id").references(() => messages.id),
  sentiment: text("sentiment").notNull(), // 'positive', 'neutral', 'negative', 'distressed'
  confidenceScore: integer("confidence_score").notNull(), // 0-100
  hacoDecision: text("haco_decision").notNull(), // 'intuition_aligned', 'complementarity_activated', 'observation_only'
  distressSignals: jsonb("distress_signals").$type<Array<{
    type: string;
    severity: number;
    evidence: string;
  }>>(),
  rawMetrics: jsonb("raw_metrics").$type<{
    anxietyLevel: number;
    frustrationLevel: number;
    confusionLevel: number;
    satisfactionLevel: number;
    urgencyLevel: number;
  }>(),
  suggestedAction: text("suggested_action"),
  aiRationale: text("ai_rationale"),
  quantumState: text("quantum_state"), // 'superposition', 'collapsed_human', 'collapsed_ai', 'entangled'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// CDI HACO Thresholds - admin-configurable policy settings
export const cdiThresholds = pgTable("cdi_thresholds", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // 'default', 'high_touch', 'low_touch', etc.
  epsilon: integer("epsilon").notNull().default(10), // Error tolerance (0-100, represents 0-1)
  delta: integer("delta").notNull().default(80), // Confidence threshold (0-100, represents 0-1)
  emotionalFidelityWeight: integer("emotional_fidelity_weight").notNull().default(40), // Dynamic weight for EF dimension (0-100)
  choreographyAwarenessWeight: integer("choreography_awareness_weight").notNull().default(30), // Dynamic weight for CA dimension (0-100)
  roleSpecificRecallWeight: integer("role_specific_recall_weight").notNull().default(30), // Dynamic weight for RSR dimension (0-100)
  isActive: boolean("is_active").notNull().default(true),
  description: text("description"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CDI Admin Overrides - track when admin overrides AI decisions (for learning)
export const cdiAdminOverrides = pgTable("cdi_admin_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  insightId: varchar("insight_id").notNull().references(() => cdiAiInsights.id),
  adminId: varchar("admin_id").notNull().references(() => users.id),
  originalDecision: text("original_decision").notNull(),
  overrideDecision: text("override_decision").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// CDI Behavioral Events - captures all signals for the three dimensions
// (response times, role transitions, payment behavior, commitment signals, etc.)
export const cdiBehavioralEvents = pgTable("cdi_behavioral_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  actorRole: text("actor_role").notNull(), // 'client', 'artist', 'planner'
  targetUserId: varchar("target_user_id").references(() => users.id),
  targetRole: text("target_role"), // 'client', 'artist', 'planner'
  bookingId: varchar("booking_id").references(() => bookings.id),
  eventCategory: text("event_category").notNull(), // 'communication', 'payment', 'booking', 'coordination', 'delivery'
  eventType: text("event_type").notNull(), // specific event within category
  dimension: text("dimension").notNull(), // 'emotional_fidelity', 'choreography_awareness', 'role_specific_recall'
  signalStrength: integer("signal_strength").notNull(), // -100 to +100 (negative = trust erosion, positive = trust building)
  responseLatencyMs: integer("response_latency_ms"), // for timing-sensitive events
  toneVector: jsonb("tone_vector").$type<number[]>(), // embedding vector for emotional tone
  metadata: jsonb("metadata").$type<{
    evidenceText?: string;
    contextualFactors?: string[];
    roleTransition?: { from: string; to: string };
    sequencePosition?: number;
    expectedPattern?: string;
    actualPattern?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// CDI Dimension Scores - individual scores for each of the three dimensions
export const cdiDimensionScores = pgTable("cdi_dimension_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  dimension: text("dimension").notNull(), // 'emotional_fidelity', 'choreography_awareness', 'role_specific_recall'
  score: integer("score").notNull(), // 0-100
  confidence: integer("confidence").notNull(), // 0-100
  hacoDecision: text("haco_decision").notNull(), // per-dimension HACO decision
  components: jsonb("components").$type<{
    // Emotional Fidelity components
    responseTimeConsistency?: number;
    toneAlignment?: number;
    emotionalPreservation?: number;
    timingSensitivity?: number;
    // Choreography Awareness components
    roleTransitionQuality?: number;
    sequenceIntegrity?: number;
    multiPartySynchronization?: number;
    escalationRecognition?: number;
    // Role-Specific Recall components
    historicalReliability?: number;
    commitmentStrength?: number;
    communicationConsistency?: number;
    deliveryTrackRecord?: number;
  }>(),
  evidencePayload: jsonb("evidence_payload").$type<Array<{
    eventId: string;
    contribution: number;
    evidence: string;
  }>>(),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
});

// CDI Composite Scores - the final CDI score combining all three dimensions
export const cdiCompositeScores = pgTable("cdi_composite_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  compositeScore: integer("composite_score").notNull(), // 0-100 (weighted average)
  trustLevel: text("trust_level").notNull(), // 'exceptional', 'high', 'moderate', 'low', 'at_risk'
  emotionalFidelityScore: integer("emotional_fidelity_score").notNull(),
  choreographyAwarenessScore: integer("choreography_awareness_score").notNull(),
  roleSpecificRecallScore: integer("role_specific_recall_score").notNull(),
  emotionalFidelityWeight: integer("emotional_fidelity_weight").notNull().default(40),
  choreographyAwarenessWeight: integer("choreography_awareness_weight").notNull().default(30),
  roleSpecificRecallWeight: integer("role_specific_recall_weight").notNull().default(30),
  hacoOverallDecision: text("haco_overall_decision").notNull(),
  predictedSuccess: integer("predicted_success"), // 0-100 probability of coordination success
  interventionRecommended: boolean("intervention_recommended").notNull().default(false),
  interventionReason: text("intervention_reason"),
  calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
});

// CDI Feedback Events - captures feedback for the evolutionary loop
export const cdiFeedbackEvents = pgTable("cdi_feedback_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  compositeScoreId: varchar("composite_score_id").references(() => cdiCompositeScores.id),
  bookingId: varchar("booking_id").references(() => bookings.id),
  feedbackType: text("feedback_type").notNull(), // 'outcome', 'admin_override', 'planner_note', 'client_satisfaction'
  feedbackSource: text("feedback_source").notNull(), // 'system', 'admin', 'planner', 'client', 'artist'
  sourceUserId: varchar("source_user_id").references(() => users.id),
  outcomeSuccess: boolean("outcome_success"), // did the coordination succeed?
  satisfactionScore: integer("satisfaction_score"), // 1-10
  dimension: text("dimension"), // which dimension this feedback applies to
  originalPrediction: jsonb("original_prediction").$type<{
    score: number;
    decision: string;
  }>(),
  actualOutcome: jsonb("actual_outcome").$type<{
    success: boolean;
    notes: string;
    failureReasons?: string[];
  }>(),
  learningSignal: integer("learning_signal"), // -100 to +100, how much to adjust
  processed: boolean("processed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// CDI Learning Runs - tracks iterations of the evolutionary loop
export const cdiLearningRuns = pgTable("cdi_learning_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  runType: text("run_type").notNull(), // 'scheduled', 'triggered', 'manual'
  dimension: text("dimension"), // null for overall, or specific dimension
  feedbackEventsProcessed: integer("feedback_events_processed").notNull(),
  thresholdAdjustments: jsonb("threshold_adjustments").$type<{
    epsilonBefore: number;
    epsilonAfter: number;
    deltaBefore: number;
    deltaAfter: number;
  }>(),
  patternLibraryUpdates: jsonb("pattern_library_updates").$type<Array<{
    patternId: string;
    strengthChange: number;
  }>>(),
  accuracy: jsonb("accuracy").$type<{
    before: number;
    after: number;
    improvement: number;
  }>(),
  auditTrail: jsonb("audit_trail").$type<{
    triggeredBy: string;
    reason: string;
    approvedBy?: string;
  }>(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// CDI Pattern Library - stores validated coordination patterns for matching
export const cdiPatternLibrary = pgTable("cdi_pattern_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patternName: text("pattern_name").notNull(),
  patternCategory: text("pattern_category").notNull(), // 'role_transition', 'escalation', 'coordination_sequence'
  dimension: text("dimension").notNull(),
  patternSequence: jsonb("pattern_sequence").$type<Array<{
    step: number;
    actor: string;
    action: string;
    expectedTiming?: string;
  }>>(),
  successWeight: integer("success_weight").notNull().default(100), // how strongly this pattern predicts success
  validatedBy: text("validated_by").notNull(), // 'operational_data', 'admin_verified', 'ml_discovered'
  sampleSize: integer("sample_size").notNull().default(0), // how many transactions validated this
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Standardized action vocabulary for analytics
// inquiry_created, first_response, hold_placed, hold_expired, proposal_sent, proposal_viewed,
// confirm_clicked, booking_created, declined, auto_escalated, reminder_sent

// Audit logs for compliance and activity tracking
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  actorRole: text("actor_role"), // 'artist', 'planner', 'client', 'system', 'admin'
  action: text("action").notNull(), // Use standardized vocabulary above
  actionVersion: integer("action_version").default(1), // Future-proof schema changes
  resourceType: text("resource_type").notNull(),
  resourceId: varchar("resource_id"),
  description: text("description"), // Human-readable description for activity feed
  emailSent: boolean("email_sent").default(false), // Whether notification email was sent
  emailSentTo: text("email_sent_to"), // Email address notification was sent to
  metadata: jsonb("metadata").$type<{
    diff?: Record<string, { from: unknown; to: unknown }>; // Changed fields
    reason?: string;
    previousStatus?: string;
    newStatus?: string;
    clientName?: string;
    clientEmail?: string;
    amount?: number;
    [key: string]: unknown;
  }>(),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  artistProfile: many(artistProfiles),
  sentMessages: many(messages),
  receivedMessages: many(messages),
  bookingsAsClient: many(bookings),
  bookingsAsArtist: many(bookings),
  clientIntake: one(clientIntakes, {
    fields: [users.id],
    references: [clientIntakes.userId],
  }),
  artistIntake: one(artistIntakes, {
    fields: [users.id],
    references: [artistIntakes.userId],
  }),
  plannerIntake: one(plannerIntakes, {
    fields: [users.id],
    references: [plannerIntakes.userId],
  }),
}));

export const artistProfilesRelations = relations(artistProfiles, ({ one }) => ({
  user: one(users, {
    fields: [artistProfiles.userId],
    references: [users.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  client: one(users, {
    fields: [bookings.clientId],
    references: [users.id],
  }),
  artist: one(users, {
    fields: [bookings.artistId],
    references: [users.id],
  }),
  messages: many(messages),
  contracts: many(contracts),
  schedules: many(schedules),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  recipient: one(users, {
    fields: [messages.recipientId],
    references: [users.id],
  }),
  booking: one(bookings, {
    fields: [messages.bookingId],
    references: [bookings.id],
  }),
}));

export const contractsRelations = relations(contracts, ({ one, many }) => ({
  booking: one(bookings, {
    fields: [contracts.bookingId],
    references: [bookings.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  contract: one(contracts, {
    fields: [payments.contractId],
    references: [contracts.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientIntakeSchema = createInsertSchema(clientIntakes).omit({
  id: true,
  createdAt: true,
});

export const insertArtistIntakeSchema = createInsertSchema(artistIntakes).omit({
  id: true,
  createdAt: true,
});

export const insertPlannerIntakeSchema = createInsertSchema(plannerIntakes).omit({
  id: true,
  createdAt: true,
});

export const insertArtistProfileSchema = createInsertSchema(artistProfiles).omit({
  id: true,
  createdAt: true,
  verifiedAt: true,
  verifiedBy: true,
});

export const insertProfileReportSchema = createInsertSchema(profileReports).omit({
  id: true,
  createdAt: true,
  reviewedBy: true,
  reviewedAt: true,
});

export const insertArtistServiceSchema = createInsertSchema(artistServices).omit({
  id: true,
  createdAt: true,
});

export const insertClientContactSchema = createInsertSchema(clientContacts).omit({
  id: true,
  createdAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBookingChecklistSchema = createInsertSchema(bookingChecklists).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContractTemplateSchema = createInsertSchema(contractTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertAvailabilitySchema = createInsertSchema(availability).omit({
  id: true,
  createdAt: true,
});

export const insertScheduleSchema = createInsertSchema(schedules).omit({
  id: true,
  createdAt: true,
});

export const insertEventDayScheduleSchema = createInsertSchema(eventDaySchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertScheduleTeamMemberSchema = createInsertSchema(scheduleTeamMembers).omit({
  id: true,
  createdAt: true,
});

export const insertScheduleAppointmentSchema = createInsertSchema(scheduleAppointments).omit({
  id: true,
  createdAt: true,
});

export const insertScheduleChatMessageSchema = createInsertSchema(scheduleChatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertChatInviteSchema = createInsertSchema(chatInvites).omit({
  id: true,
  createdAt: true,
});

export const insertChatInviteMessageSchema = createInsertSchema(chatInviteMessages).omit({
  id: true,
  createdAt: true,
});

export const insertDirectChatSchema = createInsertSchema(directChats).omit({
  id: true,
  threadToken: true,
  participantToken: true,
  lastMessageAt: true,
  createdAt: true,
});

export const insertDirectChatMessageSchema = createInsertSchema(directChatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertInquirySchema = createInsertSchema(inquiries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInquiryNotificationSchema = createInsertSchema(inquiryNotifications).omit({
  id: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertConversationParticipantSchema = createInsertSchema(conversationParticipants).omit({
  id: true,
  joinedAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  invitedAt: true,
  acceptedAt: true,
});

export const insertBusinessChatMessageSchema = createInsertSchema(businessChatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertBusinessChatInsightSchema = createInsertSchema(businessChatInsights).omit({
  id: true,
  createdAt: true,
});

export const insertSupportCaseSchema = createInsertSchema(supportCases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCdiEventSchema = createInsertSchema(cdiEvents).omit({
  id: true,
  createdAt: true,
});

export const insertCdiScoreSchema = createInsertSchema(cdiScores).omit({
  id: true,
  calculatedAt: true,
});

export const insertCdiAiInsightSchema = createInsertSchema(cdiAiInsights).omit({
  id: true,
  createdAt: true,
});

export const insertCdiThresholdSchema = createInsertSchema(cdiThresholds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCdiAdminOverrideSchema = createInsertSchema(cdiAdminOverrides).omit({
  id: true,
  createdAt: true,
});

export const insertCdiBehavioralEventSchema = createInsertSchema(cdiBehavioralEvents).omit({
  id: true,
  createdAt: true,
});

export const insertCdiDimensionScoreSchema = createInsertSchema(cdiDimensionScores).omit({
  id: true,
  calculatedAt: true,
});

export const insertCdiCompositeScoreSchema = createInsertSchema(cdiCompositeScores).omit({
  id: true,
  calculatedAt: true,
});

export const insertCdiFeedbackEventSchema = createInsertSchema(cdiFeedbackEvents).omit({
  id: true,
  createdAt: true,
});

export const insertCdiLearningRunSchema = createInsertSchema(cdiLearningRuns).omit({
  id: true,
  startedAt: true,
});

export const insertCdiPatternLibrarySchema = createInsertSchema(cdiPatternLibrary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

// ============================================
// IQS (Interaction Quality Scoring) System
// Tracks lead quality, red flags, and learns from vendor intuition
// ============================================

// Red flag pattern types for reference
export type IqsRedFlagType = 
  | 'large_scope_short_notice'    // Many services requested with short timeline
  | 'vague_details'               // Missing key information (budget, specifics)
  | 'delayed_response'            // Long gaps between messages when urgency claimed
  | 'broken_promise'              // Said they'd call/respond but didn't
  | 'ghosting'                    // Complete silence after engagement
  | 'foreign_location_complexity' // Foreign country with complex logistics
  | 'payment_hesitation'          // Avoids payment discussions
  | 'contact_mismatch'            // Third party reaching out (planner vs bride confusion)
  | 'already_married'             // Evidence they already had their event
  | 'too_good_to_be_true'         // Unrealistic budget or scope
  | 'poor_communication_pattern'  // Inconsistent, confusing messages
  | 'custom';                     // Vendor-defined pattern

// Lead quality scores - overall score for each client/lead interaction
export const iqsLeadScores = pgTable("iqs_lead_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => users.id),
  // Can reference a user (registered) or a client contact (not yet registered)
  clientUserId: varchar("client_user_id").references(() => users.id),
  clientContactId: varchar("client_contact_id").references(() => clientContacts.id),
  bookingId: varchar("booking_id").references(() => bookings.id),
  // The score (0-100, lower = more trustworthy, higher = more red flags)
  score: integer("score").notNull().default(50),
  riskLevel: text("risk_level").notNull().default("unknown"), // 'trustworthy', 'low_risk', 'medium_risk', 'high_risk', 'critical', 'unknown'
  // Breakdown of score factors
  factors: jsonb("factors").$type<{
    responseTimeScore: number;      // 0-100 based on response delays
    promiseFulfillmentScore: number; // 0-100 based on broken promises
    scopeUrgencyScore: number;       // 0-100 based on request size vs timeline
    communicationScore: number;      // 0-100 based on clarity and consistency
    verificationScore: number;       // 0-100 based on verified identity/legitimacy
  }>(),
  // Detected red flags
  activeRedFlags: jsonb("active_red_flags").$type<Array<{
    type: string;
    severity: number;      // 1-10
    detectedAt: string;    // ISO date
    description: string;
    aiConfidence: number;  // 0-100
  }>>(),
  // Vendor feedback on this lead
  vendorRating: text("vendor_rating"), // 'trustworthy', 'weird', 'scam', 'normal', null if not rated
  vendorNotes: text("vendor_notes"),
  // Outcome tracking (for learning)
  outcome: text("outcome"), // 'booked', 'ghosted', 'declined', 'scam_confirmed', 'legitimate', null
  outcomeNotes: text("outcome_notes"),
  // AI analysis
  aiSummary: text("ai_summary"), // AI explanation of the score
  lastAnalyzedAt: timestamp("last_analyzed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Interaction events - individual events that contribute to the score
export const iqsInteractionEvents = pgTable("iqs_interaction_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadScoreId: varchar("lead_score_id").notNull().references(() => iqsLeadScores.id),
  vendorId: varchar("vendor_id").notNull().references(() => users.id),
  // Event type
  eventType: text("event_type").notNull(), // 'message_sent', 'message_received', 'promise_made', 'promise_broken', 'call_scheduled', 'call_missed', 'response_delay', 'ghosting_detected', 'red_flag_triggered', 'booking_request', 'booking_confirmed', 'booking_cancelled'
  // Event details
  details: jsonb("details").$type<{
    messageContent?: string;
    promisedAction?: string;
    promisedDate?: string;
    actualDate?: string;
    delayHours?: number;
    redFlagType?: string;
    severity?: number;
    sourceChannel?: string; // 'email', 'platform', 'phone', 'whatsapp', 'text'
  }>(),
  // Timing
  expectedAt: timestamp("expected_at"), // When they said they'd respond
  occurredAt: timestamp("occurred_at").notNull(),
  // Impact on score
  scoreImpact: integer("score_impact").default(0), // positive = worse, negative = better
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Red flag patterns - the learned patterns from vendor feedback
export const iqsPatterns = pgTable("iqs_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patternType: text("pattern_type").notNull(), // matches IqsRedFlagType
  name: text("name").notNull(),
  description: text("description"),
  // Detection criteria (AI uses this to identify the pattern)
  detectionCriteria: jsonb("detection_criteria").$type<{
    conditions: Array<{
      field: string;         // e.g., 'services_count', 'days_until_event', 'response_delay_hours'
      operator: string;      // 'gt', 'lt', 'gte', 'lte', 'eq', 'contains', 'missing'
      value: number | string | boolean;
    }>;
    minimumConditionsToMatch: number;
  }>(),
  // Severity and weights
  baseSeverity: integer("base_severity").notNull().default(5), // 1-10
  baseWeight: integer("base_weight").notNull().default(10), // How much it contributes to score
  // Learning from feedback
  timesTriggered: integer("times_triggered").default(0),
  timesConfirmedByVendor: integer("times_confirmed_by_vendor").default(0),
  timesRejectedByVendor: integer("times_rejected_by_vendor").default(0),
  adjustedWeight: integer("adjusted_weight"), // Learned weight from feedback
  // Status
  isActive: boolean("is_active").default(true),
  isSystemPattern: boolean("is_system_pattern").default(true), // vs custom vendor pattern
  createdBy: varchar("created_by").references(() => users.id), // For custom patterns
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Vendor feedback - used to train the system
export const iqsVendorFeedback = pgTable("iqs_vendor_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").notNull().references(() => users.id),
  leadScoreId: varchar("lead_score_id").references(() => iqsLeadScores.id),
  // What the vendor is giving feedback on
  feedbackType: text("feedback_type").notNull(), // 'lead_rating', 'red_flag_confirm', 'red_flag_reject', 'outcome_report', 'custom_pattern'
  // The feedback
  rating: text("rating"), // 'accurate', 'inaccurate', 'trustworthy', 'weird', 'scam', 'normal'
  notes: text("notes"),
  // For red flag feedback
  patternId: varchar("pattern_id").references(() => iqsPatterns.id),
  eventId: varchar("event_id").references(() => iqsInteractionEvents.id),
  wasAccurate: boolean("was_accurate"),
  // For outcome reporting
  actualOutcome: text("actual_outcome"), // 'booked', 'ghosted', 'declined', 'scam_confirmed', 'legitimate'
  // Learning metadata
  processedForLearning: boolean("processed_for_learning").default(false),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// IQS learning runs - tracks when the system retrains patterns
export const iqsLearningRuns = pgTable("iqs_learning_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  status: text("status").notNull().default("running"), // 'running', 'completed', 'failed'
  // Stats
  feedbackProcessed: integer("feedback_processed").default(0),
  patternsUpdated: integer("patterns_updated").default(0),
  newPatternsDiscovered: integer("new_patterns_discovered").default(0),
  // Results
  results: jsonb("results").$type<{
    patternAdjustments: Array<{
      patternId: string;
      oldWeight: number;
      newWeight: number;
      reason: string;
    }>;
    insights: string[];
  }>(),
});

// Insert schemas for IQS
export const insertIqsLeadScoreSchema = createInsertSchema(iqsLeadScores).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIqsInteractionEventSchema = createInsertSchema(iqsInteractionEvents).omit({
  id: true,
  createdAt: true,
});

export const insertIqsPatternSchema = createInsertSchema(iqsPatterns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIqsVendorFeedbackSchema = createInsertSchema(iqsVendorFeedback).omit({
  id: true,
  createdAt: true,
});

export const insertIqsLearningRunSchema = createInsertSchema(iqsLearningRuns).omit({
  id: true,
  startedAt: true,
});

// Analytics Events - for tracking platform metrics
export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(), // 'calendar_created', 'chat_started', 'artist_signup_from_chat', 'artist_responded', 'response_time_logged', 'chat_7day_retention'
  artistId: varchar("artist_id").references(() => users.id),
  clientId: varchar("client_id").references(() => users.id),
  inquiryId: varchar("inquiry_id"),
  metadata: jsonb("metadata").$type<{
    responseTimeMinutes?: number;
    source?: string;
    artistSlug?: string;
    clientEmail?: string;
    eventDate?: string;
    [key: string]: string | number | boolean | undefined;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [index("idx_analytics_events_type").on(table.eventType), index("idx_analytics_events_created").on(table.createdAt)]);

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({
  id: true,
  createdAt: true,
});

// AI Chat Conversations - groups chat messages into conversations
export const aiChatConversations = pgTable("ai_chat_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").default("New Chat"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAiChatConversationSchema = createInsertSchema(aiChatConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// AI Chat Messages - stores chat history for the AI assistant
export const aiChatMessages = pgTable("ai_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  conversationId: varchar("conversation_id").references(() => aiChatConversations.id),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  attachments: jsonb("attachments").$type<{ type: string; url: string; name: string }[]>(),
  extractedEntities: jsonb("extracted_entities").$type<{
    names?: string[];
    emails?: string[];
    phones?: string[];
    dates?: string[];
    locations?: string[];
    amounts?: number[];
  }>(),
  actionTaken: text("action_taken"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAiChatMessageSchema = createInsertSchema(aiChatMessages).omit({
  id: true,
  createdAt: true,
});

// Communication Logs - tracks all outbound communications (emails, contracts, payment links)
export const communicationLogs = pgTable("communication_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  artistId: varchar("artist_id").notNull().references(() => users.id),
  recipientName: text("recipient_name").notNull(),
  recipientEmail: text("recipient_email"),
  recipientPhone: text("recipient_phone"),
  communicationType: text("communication_type").notNull(), // 'contract', 'payment_link', 'thank_you_email', 'invoice', 'info_sheet', 'inquiry_response'
  subject: text("subject"),
  content: text("content"), // Summary or full content of what was sent
  metadata: jsonb("metadata").$type<{
    contractId?: string;
    paymentLinkUrl?: string;
    amount?: number;
    bookingId?: string;
    templateUsed?: string;
    // Contract-specific fields
    totalAmountCents?: number;
    depositAmountCents?: number;
    // Email-specific fields
    occasion?: string;
    senderName?: string;
    // Forward-specific fields
    originalLogId?: string;
    originalRecipient?: string;
    originalType?: string;
    // Allow additional fields
    [key: string]: string | number | boolean | undefined;
  }>(),
  status: text("status").default("sent"), // 'sent', 'delivered', 'failed', 'bounced'
  sentVia: text("sent_via").default("ai_chat"), // 'ai_chat', 'manual', 'automated'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCommunicationLogSchema = createInsertSchema(communicationLogs).omit({
  id: true,
  createdAt: true,
});

// Scheduled Emails - for scheduling invoice/reminder emails to be sent at a specific time
export const scheduledEmails = pgTable("scheduled_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  artistId: varchar("artist_id").notNull().references(() => users.id),
  bookingId: varchar("booking_id").references(() => bookings.id),
  emailType: text("email_type").notNull(), // 'invoice', 'reminder', 'follow_up'
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name").notNull(),
  subject: text("subject"),
  // Email-specific data
  emailData: jsonb("email_data").$type<{
    vendorName?: string;
    amount?: number;
    description?: string;
    paymentLink?: string;
    personalMessage?: string;
    [key: string]: string | number | boolean | undefined;
  }>(),
  scheduledFor: timestamp("scheduled_for").notNull(), // When to send the email
  status: text("status").default("pending"), // 'pending', 'sent', 'failed', 'cancelled'
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertScheduledEmailSchema = createInsertSchema(scheduledEmails).omit({
  id: true,
  createdAt: true,
  sentAt: true,
  errorMessage: true,
});

// Proposals - formal service proposals sent to clients
export type ProposalLineItem = {
  description: string; // e.g., "Bride - Hair & Makeup"
  quantity: number;
  unitPrice: number; // in cents
  services: string[]; // e.g., ["hair", "makeup"]
};

export const proposals = pgTable("proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  artistId: varchar("artist_id").notNull().references(() => users.id),
  shareToken: varchar("share_token").unique(), // For shareable quote links
  // Client info
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  clientPhone: text("client_phone"),
  clientCompany: text("client_company"),
  // Event details
  eventDate: timestamp("event_date"),
  eventLocation: text("event_location"),
  eventType: text("event_type"), // 'wedding', 'photoshoot', etc.
  completionTime: text("completion_time"), // e.g., "2pm"
  // Service breakdown
  lineItems: jsonb("line_items").$type<ProposalLineItem[]>(),
  subtotal: integer("subtotal"), // in cents
  travelFee: integer("travel_fee").default(0), // in cents
  discount: integer("discount").default(0), // in cents
  total: integer("total"), // in cents
  // Additional info
  notes: text("notes"),
  terms: text("terms"),
  validUntil: timestamp("valid_until"),
  // Status
  status: text("status").default("draft"), // 'draft', 'sent', 'viewed', 'accepted', 'declined', 'expired'
  sentAt: timestamp("sent_at"),
  viewedAt: timestamp("viewed_at"),
  respondedAt: timestamp("responded_at"),
  // Linked booking (if accepted)
  bookingId: varchar("booking_id").references(() => bookings.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Artist pricing menu for quote generation
export type ArtistServicePrice = {
  service: string; // e.g., "bridal_hair_makeup", "bridesmaid_hair", "touch_up_kit"
  label: string; // Display label
  price: number; // Price in cents
  category: "bridal" | "attendant" | "addon" | "travel";
};

export const artistPricing = pgTable("artist_pricing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  artistId: varchar("artist_id").notNull().references(() => users.id),
  services: jsonb("services").$type<ArtistServicePrice[]>().notNull(),
  travelFeePerMile: integer("travel_fee_per_mile").default(0), // cents per mile
  travelFreeRadius: integer("travel_free_radius").default(25), // miles
  minimumBooking: integer("minimum_booking").default(0), // cents
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertArtistPricingSchema = createInsertSchema(artistPricing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProposalSchema = createInsertSchema(proposals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sentAt: true,
  viewedAt: true,
  respondedAt: true,
});

// Waitlist signups for client discovery launch
export const waitlistSignups = pgTable("waitlist_signups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  source: text("source"),
  eventDate: timestamp("event_date"),
  location: text("location"),
  servicesNeeded: jsonb("services_needed").$type<string[]>(),
  inspirationImages: jsonb("inspiration_images").$type<string[]>(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWaitlistSignupSchema = createInsertSchema(waitlistSignups).omit({ id: true, createdAt: true });

// ============================================
// PRIVATE COORDINATION THREADS (White-Label)
// ============================================

// Thread Status enum
export const ThreadStatus = {
  INQUIRY: 'inquiry',
  PROCEEDING: 'proceeding',
  REFERRED: 'referred',
  DECLINED: 'declined',
  CLOSED: 'closed',
} as const;
export type ThreadStatusType = typeof ThreadStatus[keyof typeof ThreadStatus];

// Threads - private coordination workspaces (magic link access, no client accounts)
export const threads = pgTable("threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadPublicToken: varchar("thread_public_token").notNull().unique(), // Opaque, unguessable token for client access
  artistProfileId: varchar("artist_profile_id").notNull().references(() => artistProfiles.id),
  // Client identity - no auth user required
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull(),
  clientPhone: text("client_phone"),
  // Thread status
  status: text("status").notNull().default("inquiry"), // inquiry, proceeding, referred, declined, closed
  // Intake metadata
  eventDate: timestamp("event_date"),
  eventType: text("event_type"), // wedding, engagement, etc.
  serviceType: text("service_type"), // hair, makeup, both
  message: text("message"), // Initial inquiry message
  source: text("source").default("embed"), // embed, invite_link, email
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_threads_token").on(table.threadPublicToken),
  index("idx_threads_artist").on(table.artistProfileId),
]);

// Thread Messages - conversation history within a thread
export const threadMessages = pgTable("thread_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull().references(() => threads.id, { onDelete: 'cascade' }),
  actorType: text("actor_type").notNull(), // artist, client, system
  body: text("body").notNull(),
  attachmentUrls: jsonb("attachment_urls").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Thread Referrals - when artist refers to another artist
// Extended with handoff accountability fields (YC slice: inquiry → trusted handoff → outcome)
export const threadReferrals = pgTable("thread_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull().references(() => threads.id),
  referredArtistId: varchar("referred_artist_id").notNull(),
  status: text("status").default("pending"), // pending, accepted, declined

  // --- Handoff accountability (originator attests at handoff time) ---
  urgencyHours: integer("urgency_hours"), // hours between handoff creation and event date
  paymentSecuredStatus: text("payment_secured_status"), // 'secured_2plus_weeks' | 'secured_1_to_2_weeks' | 'secured_under_1_week' | 'not_yet_secured'
  contractAttachedId: varchar("contract_attached_id"), // FK reference (loose) to contract
  scopeSummary: text("scope_summary"), // full service scope, not just "bridal hair"

  // --- Helper outcome report (helper fills in after the job) ---
  helperReportedOutcome: text("helper_reported_outcome"), // 'clean' | 'paid_as_agreed_but_scope_off' | 'paid_late_or_partial' | 'scope_and_payment_both_off' | 'cancellation_no_fault'
  helperPaidAt: timestamp("helper_paid_at"),
  helperPaymentNote: text("helper_payment_note"), // free text — "two installments, week late"
  helperPrivateNote: text("helper_private_note"), // gut note, never shared with originator
  helperOutcomeReportedAt: timestamp("helper_outcome_reported_at"),

  // --- Consent-gated coaching loop ---
  helperWantsToShareAdvice: boolean("helper_wants_to_share_advice").default(false),
  helperAdviceDraft: text("helper_advice_draft"), // helper's coaching note (only visible if originator opts in)
  originatorAdvicePromptedAt: timestamp("originator_advice_prompted_at"),
  originatorAdviceConsent: text("originator_advice_consent"), // 'yes' | 'no' | 'not_yet'
  originatorAdviceConsentAt: timestamp("originator_advice_consent_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas for Threads
export const insertThreadSchema = createInsertSchema(threads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertThreadMessageSchema = createInsertSchema(threadMessages).omit({
  id: true,
  createdAt: true,
});

export const insertThreadReferralSchema = createInsertSchema(threadReferrals).omit({
  id: true,
  createdAt: true,
});

// Types for Replit Auth
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;

export type InsertClientIntake = z.infer<typeof insertClientIntakeSchema>;
export type ClientIntake = typeof clientIntakes.$inferSelect;

export type InsertArtistIntake = z.infer<typeof insertArtistIntakeSchema>;
export type ArtistIntake = typeof artistIntakes.$inferSelect;

export type InsertPlannerIntake = z.infer<typeof insertPlannerIntakeSchema>;
export type PlannerIntake = typeof plannerIntakes.$inferSelect;

export type InsertArtistProfile = z.infer<typeof insertArtistProfileSchema>;
export type ArtistProfile = typeof artistProfiles.$inferSelect;

export type InsertProfileReport = z.infer<typeof insertProfileReportSchema>;
export type ProfileReport = typeof profileReports.$inferSelect;

export type InsertArtistService = z.infer<typeof insertArtistServiceSchema>;
export type ArtistService = typeof artistServices.$inferSelect;

export type InsertClientContact = z.infer<typeof insertClientContactSchema>;
export type ClientContact = typeof clientContacts.$inferSelect;

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

export type InsertBookingChecklist = z.infer<typeof insertBookingChecklistSchema>;
export type BookingChecklist = typeof bookingChecklists.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;

export type InsertContractTemplate = z.infer<typeof insertContractTemplateSchema>;
export type ContractTemplate = typeof contractTemplates.$inferSelect;

export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = typeof invitations.$inferSelect;

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

export type InsertAvailability = z.infer<typeof insertAvailabilitySchema>;
export type Availability = typeof availability.$inferSelect;

export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedules.$inferSelect;

export type InsertEventDaySchedule = z.infer<typeof insertEventDayScheduleSchema>;
export type EventDaySchedule = typeof eventDaySchedules.$inferSelect;

export type InsertScheduleTeamMember = z.infer<typeof insertScheduleTeamMemberSchema>;
export type ScheduleTeamMember = typeof scheduleTeamMembers.$inferSelect;

export type InsertScheduleAppointment = z.infer<typeof insertScheduleAppointmentSchema>;
export type ScheduleAppointment = typeof scheduleAppointments.$inferSelect;

export type InsertScheduleChatMessage = z.infer<typeof insertScheduleChatMessageSchema>;
export type ScheduleChatMessage = typeof scheduleChatMessages.$inferSelect;

export type InsertChatInvite = z.infer<typeof insertChatInviteSchema>;
export type ChatInvite = typeof chatInvites.$inferSelect;
export type InsertChatInviteMessage = z.infer<typeof insertChatInviteMessageSchema>;
export type ChatInviteMessage = typeof chatInviteMessages.$inferSelect;

export type InsertDirectChat = z.infer<typeof insertDirectChatSchema>;
export type DirectChat = typeof directChats.$inferSelect;

export type InsertDirectChatMessage = z.infer<typeof insertDirectChatMessageSchema>;
export type DirectChatMessage = typeof directChatMessages.$inferSelect;

export type InsertInquiry = z.infer<typeof insertInquirySchema>;
export type Inquiry = typeof inquiries.$inferSelect;

export type InsertInquiryNotification = z.infer<typeof insertInquiryNotificationSchema>;
export type InquiryNotification = typeof inquiryNotifications.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type InsertConversationParticipant = z.infer<typeof insertConversationParticipantSchema>;
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

export type InsertBusinessChatMessage = z.infer<typeof insertBusinessChatMessageSchema>;
export type BusinessChatMessage = typeof businessChatMessages.$inferSelect;
export type InsertBusinessChatInsight = z.infer<typeof insertBusinessChatInsightSchema>;
export type BusinessChatInsight = typeof businessChatInsights.$inferSelect;

export type InsertSupportCase = z.infer<typeof insertSupportCaseSchema>;
export type SupportCase = typeof supportCases.$inferSelect;

export type InsertCdiEvent = z.infer<typeof insertCdiEventSchema>;
export type CdiEvent = typeof cdiEvents.$inferSelect;

export type InsertCdiScore = z.infer<typeof insertCdiScoreSchema>;
export type CdiScore = typeof cdiScores.$inferSelect;

export type InsertCdiAiInsight = z.infer<typeof insertCdiAiInsightSchema>;
export type CdiAiInsight = typeof cdiAiInsights.$inferSelect;

export type InsertCdiThreshold = z.infer<typeof insertCdiThresholdSchema>;
export type CdiThreshold = typeof cdiThresholds.$inferSelect;

export type InsertCdiAdminOverride = z.infer<typeof insertCdiAdminOverrideSchema>;
export type CdiAdminOverride = typeof cdiAdminOverrides.$inferSelect;

export type InsertCdiBehavioralEvent = z.infer<typeof insertCdiBehavioralEventSchema>;
export type CdiBehavioralEvent = typeof cdiBehavioralEvents.$inferSelect;

export type InsertCdiDimensionScore = z.infer<typeof insertCdiDimensionScoreSchema>;
export type CdiDimensionScore = typeof cdiDimensionScores.$inferSelect;

export type InsertCdiCompositeScore = z.infer<typeof insertCdiCompositeScoreSchema>;
export type CdiCompositeScore = typeof cdiCompositeScores.$inferSelect;

export type InsertCdiFeedbackEvent = z.infer<typeof insertCdiFeedbackEventSchema>;
export type CdiFeedbackEvent = typeof cdiFeedbackEvents.$inferSelect;

export type InsertCdiLearningRun = z.infer<typeof insertCdiLearningRunSchema>;
export type CdiLearningRun = typeof cdiLearningRuns.$inferSelect;

export type InsertCdiPatternLibrary = z.infer<typeof insertCdiPatternLibrarySchema>;
export type CdiPatternLibrary = typeof cdiPatternLibrary.$inferSelect;

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

export type InsertAiChatConversation = z.infer<typeof insertAiChatConversationSchema>;
export type AiChatConversation = typeof aiChatConversations.$inferSelect;
export type InsertAiChatMessage = z.infer<typeof insertAiChatMessageSchema>;
export type AiChatMessage = typeof aiChatMessages.$inferSelect;

// IQS Types
export type InsertIqsLeadScore = z.infer<typeof insertIqsLeadScoreSchema>;
export type IqsLeadScore = typeof iqsLeadScores.$inferSelect;

export type InsertIqsInteractionEvent = z.infer<typeof insertIqsInteractionEventSchema>;
export type IqsInteractionEvent = typeof iqsInteractionEvents.$inferSelect;

export type InsertIqsPattern = z.infer<typeof insertIqsPatternSchema>;
export type IqsPattern = typeof iqsPatterns.$inferSelect;

export type InsertIqsVendorFeedback = z.infer<typeof insertIqsVendorFeedbackSchema>;
export type IqsVendorFeedback = typeof iqsVendorFeedback.$inferSelect;

export type InsertIqsLearningRun = z.infer<typeof insertIqsLearningRunSchema>;
export type IqsLearningRun = typeof iqsLearningRuns.$inferSelect;

// Communication Log Types
export type InsertCommunicationLog = z.infer<typeof insertCommunicationLogSchema>;
export type CommunicationLog = typeof communicationLogs.$inferSelect;

// Scheduled Email Types
export type InsertScheduledEmail = z.infer<typeof insertScheduledEmailSchema>;
export type ScheduledEmail = typeof scheduledEmails.$inferSelect;

// Analytics Event Types
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;

// Proposal Types
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposals.$inferSelect;

export type InsertArtistPricing = z.infer<typeof insertArtistPricingSchema>;
export type ArtistPricing = typeof artistPricing.$inferSelect;

export type InsertWaitlistSignup = z.infer<typeof insertWaitlistSignupSchema>;
export type WaitlistSignup = typeof waitlistSignups.$inferSelect;

// Thread Types
export type InsertThread = z.infer<typeof insertThreadSchema>;
export type Thread = typeof threads.$inferSelect;

export type InsertThreadMessage = z.infer<typeof insertThreadMessageSchema>;
export type ThreadMessage = typeof threadMessages.$inferSelect;

export type InsertThreadReferral = z.infer<typeof insertThreadReferralSchema>;
export type ThreadReferral = typeof threadReferrals.$inferSelect;

// Schedule Builder - Inspiration Photos
export const inspirationPhotos = pgTable("inspiration_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personName: text("person_name").notNull(),
  imageUrl: text("image_url").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const insertInspirationPhotoSchema = createInsertSchema(inspirationPhotos).omit({
  id: true,
  uploadedAt: true,
});

export type InsertInspirationPhoto = z.infer<typeof insertInspirationPhotoSchema>;
export type InspirationPhoto = typeof inspirationPhotos.$inferSelect;

// Schedule Builder - Chat Messages
export const simpleChatMessages = pgTable("simple_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderName: text("sender_name").notNull(),
  message: text("message").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
});

export const insertSimpleChatMessageSchema = createInsertSchema(simpleChatMessages).omit({
  id: true,
  sentAt: true,
});

export type InsertSimpleChatMessage = z.infer<typeof insertSimpleChatMessageSchema>;
export type SimpleChatMessage = typeof simpleChatMessages.$inferSelect;

// ============================================================
// AGENTIC COMMERCE LAYER - Agent Identity, API Keys, Webhooks
// ============================================================

export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  ownerEmail: text("owner_email").notNull(),
  platform: text("platform"),
  scopes: text("scopes").array().default(sql`'{}'::text[]`),
  cdiScore: integer("cdi_score").default(0),
  autonomyLevel: text("autonomy_level").default("restricted"),
  isActive: boolean("is_active").default(true),
  rateLimitPerMinute: integer("rate_limit_per_minute").default(60),
  metadata: jsonb("metadata"),
  lastActiveAt: timestamp("last_active_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const agentApiKeys = pgTable("agent_api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  keyHash: text("key_hash").notNull(),
  keyPrefix: varchar("key_prefix", { length: 12 }).notNull(),
  label: text("label"),
  scopes: text("scopes").array().default(sql`'{}'::text[]`),
  isActive: boolean("is_active").default(true),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const agentWebhooks = pgTable("agent_webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  url: text("url").notNull(),
  events: text("events").array().default(sql`'{}'::text[]`),
  secret: text("secret").notNull(),
  isActive: boolean("is_active").default(true),
  failureCount: integer("failure_count").default(0),
  lastDeliveredAt: timestamp("last_delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const agentActionLogs = pgTable("agent_action_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  action: text("action").notNull(),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  statusCode: integer("status_code"),
  autonomyLevel: text("autonomy_level"),
  cdiScoreAtTime: integer("cdi_score_at_time"),
  requestBody: jsonb("request_body"),
  responseBody: jsonb("response_body"),
  durationMs: integer("duration_ms"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_agent_action_logs_agent").on(table.agentId),
  index("idx_agent_action_logs_created").on(table.createdAt),
]);

export const agentEvents = pgTable("agent_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  artistId: varchar("artist_id"),
  inquiryId: varchar("inquiry_id"),
  delivered: boolean("delivered").default(false),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_agent_events_type").on(table.eventType),
  index("idx_agent_events_delivered").on(table.delivered),
]);

// ACP (Agentic Commerce Protocol) Checkout Sessions
export const acpCheckoutSessions = pgTable("acp_checkout_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  artistId: varchar("artist_id").notNull(),
  inquiryId: varchar("inquiry_id"),
  bookingId: varchar("booking_id"),
  status: text("status").notNull().default("created"), // created, payment_pending, completed, cancelled, expired
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  platformFeeCents: integer("platform_fee_cents").notNull(),
  description: text("description"),
  squarePaymentLinkUrl: text("square_payment_link_url"),
  squarePaymentLinkId: text("square_payment_link_id"),
  squareOrderId: text("square_order_id"),
  squarePaymentId: text("square_payment_id"),
  paymentToken: text("payment_token"), // shared payment token for zero-login
  clientName: text("client_name"),
  clientEmail: text("client_email"),
  metadata: jsonb("metadata"),
  cdiScoreAtCheckout: integer("cdi_score_at_checkout").default(0),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_acp_sessions_agent").on(table.agentId),
  index("idx_acp_sessions_artist").on(table.artistId),
  index("idx_acp_sessions_status").on(table.status),
]);

// Agent Coordination Challenges (Proof of Work)
export const agentChallenges = pgTable("agent_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  challengeType: text("challenge_type").notNull(), // 'travel_buffer', 'schedule_optimization', 'conflict_resolution'
  challengeData: jsonb("challenge_data").notNull(),
  expectedAnswer: jsonb("expected_answer").notNull(),
  agentAnswer: jsonb("agent_answer"),
  status: text("status").notNull().default("issued"), // issued, solved, failed, expired
  difficulty: integer("difficulty").notNull().default(1), // 1-5
  cdiReward: integer("cdi_reward").notNull().default(5), // CDI points awarded on solve
  verificationToken: text("verification_token"), // TOILE_VERIFIED_ token issued on success
  solvedAt: timestamp("solved_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_agent_challenges_agent").on(table.agentId),
  index("idx_agent_challenges_status").on(table.status),
]);

export const insertAcpCheckoutSessionSchema = createInsertSchema(acpCheckoutSessions).omit({
  id: true,
  completedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAgentChallengeSchema = createInsertSchema(agentChallenges).omit({
  id: true,
  agentAnswer: true,
  verificationToken: true,
  solvedAt: true,
  createdAt: true,
});

export type InsertAcpCheckoutSession = z.infer<typeof insertAcpCheckoutSessionSchema>;
export type AcpCheckoutSession = typeof acpCheckoutSessions.$inferSelect;

export type InsertAgentChallenge = z.infer<typeof insertAgentChallengeSchema>;
export type AgentChallenge = typeof agentChallenges.$inferSelect;

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  cdiScore: true,
  autonomyLevel: true,
  lastActiveAt: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAgentApiKeySchema = createInsertSchema(agentApiKeys).omit({
  id: true,
  lastUsedAt: true,
  createdAt: true,
});

export const insertAgentWebhookSchema = createInsertSchema(agentWebhooks).omit({
  id: true,
  failureCount: true,
  lastDeliveredAt: true,
  createdAt: true,
});

export const insertAgentActionLogSchema = createInsertSchema(agentActionLogs).omit({
  id: true,
  createdAt: true,
});

export const insertAgentEventSchema = createInsertSchema(agentEvents).omit({
  id: true,
  delivered: true,
  deliveredAt: true,
  createdAt: true,
});

export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

export type InsertAgentApiKey = z.infer<typeof insertAgentApiKeySchema>;
export type AgentApiKey = typeof agentApiKeys.$inferSelect;

export type InsertAgentWebhook = z.infer<typeof insertAgentWebhookSchema>;
export type AgentWebhook = typeof agentWebhooks.$inferSelect;

export type InsertAgentActionLog = z.infer<typeof insertAgentActionLogSchema>;
export type AgentActionLog = typeof agentActionLogs.$inferSelect;

export type InsertAgentEvent = z.infer<typeof insertAgentEventSchema>;
export type AgentEvent = typeof agentEvents.$inferSelect;


// ============================================================================
// Inbound SMS (Step 1: headless coordination — receive Twilio replies)
// Purely additive. Does NOT touch the existing `messages` table (which requires
// internal user FKs). External inbound texts land here, get matched when
// possible, and emit a response_received trust event into cdiBehavioralEvents.
// ============================================================================
// A ranked suggestion for which inquiry/referral/person an inbound reply belongs
// to. Stored when the matcher is not confident enough to auto-link (needs_review).
export type InboundSuggestedMatch = {
  type: "inquiry" | "referral" | "user" | "contact";
  id: string;
  label: string; // human-readable, so admin UI needs no extra lookups
  detail?: string; // secondary line (status, date, service, etc.)
  score: number;
  reasons: string[]; // why this was suggested ("phone match", "active inquiry", ...)
  // attribution hints used when an admin confirms this suggestion
  artistId?: string | null; // the operator to attribute the trust event to
  clientUserId?: string | null; // the client's users.id if known
};

export const inboundSmsMessages = pgTable("inbound_sms_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageSid: varchar("message_sid").unique().notNull(), // Twilio MessageSid — dedupe key
  fromNumber: text("from_number").notNull(), // normalized E.164 sender
  toNumber: text("to_number").notNull(), // our Twilio number that received it
  body: text("body").notNull().default(""),
  // Best-effort matching (all nullable — unmatched replies are logged, not dropped)
  matchedUserId: varchar("matched_user_id"), // resolved sender (users.id) if known
  matchedContactId: varchar("matched_contact_id"), // client_contacts.id if known
  matchedInquiryId: varchar("matched_inquiry_id"), // inquiries.id if linked
  matchedReferralId: varchar("matched_referral_id"), // thread_referrals.id if linked
  matchStatus: text("match_status").notNull().default("unmatched"), // 'matched' | 'needs_review' | 'manual' | 'unmatched'
  matchConfidence: integer("match_confidence"), // 0-100 score from the context matcher
  suggestedMatches: jsonb("suggested_matches").$type<InboundSuggestedMatch[]>(), // ranked candidates for needs_review
  trustEventId: varchar("trust_event_id"), // cdi_behavioral_events.id if one was written
  rawPayload: jsonb("raw_payload"), // full Twilio form body for audit/debug
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInboundSmsMessageSchema = createInsertSchema(inboundSmsMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertInboundSmsMessage = z.infer<typeof insertInboundSmsMessageSchema>;
export type InboundSmsMessage = typeof inboundSmsMessages.$inferSelect;

// Assistant prompts — the unified prompt queue. When a business event happens
// (new inquiry, reply, schedule needed, etc) Briarwood records an actionable
// prompt for the operator here and, per their delivery preferences, pushes it
// over SMS/email. The queue persists every prompt regardless of delivery so it
// can be listed, digested, or re-delivered later. Additive; never mutated by
// existing DateInquiry flows.
// The structured availability snapshot stored alongside an assistant prompt.
// The prompt body is for the human; this is the machine-readable record so
// future actions (ACCEPT/SEND_PRICING/ROUTE/REVIEW/DECLINE) know WHY the
// assistant recommended what it did, without re-parsing the prose body.
export type AssistantPromptAvailability = {
  availabilityStatus: string; // final status, e.g. 'operator_available' | 'possible_network_route'
  availabilityReason: string | null; // short human-readable reason
  evidenceSource: string; // 'contract'|'calendar'|'inquiry'|'booking'|'trusted_circle'|'unknown'
  conflictingRecordIds: string[]; // IDs of conflicting contracts/bookings/inquiries
  confidence: string; // 'high'|'medium'|'low'
  suggestedNextActions: string[]; // ordered, e.g. ['ROUTE','REVIEW']
  possibleRoutes: { name: string; source: string; availability: string }[]; // trusted-circle/team options
  context: {
    clientName: string;
    serviceType: string | null;
    eventDate: string | null; // ISO string snapshot
    eventLocation: string | null;
    partySize: number | null;
    referralSourceName: string | null;
  };
};

export type AssistantPromptMetadata = {
  availability?: AssistantPromptAvailability;
};

export const assistantPrompts = pgTable("assistant_prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  operatorId: varchar("operator_id").notNull(), // users.id of the operator/artist
  inquiryId: varchar("inquiry_id"), // inquiries.id, if relevant
  referralId: varchar("referral_id"), // thread_referrals.id, if relevant
  contactId: varchar("contact_id"), // client/contact id, if relevant
  promptType: text("prompt_type").notNull(), // e.g. 'new_inquiry'
  title: text("title").notNull(),
  body: text("body").notNull(),
  recommendedActions: jsonb("recommended_actions").$type<string[]>(), // e.g. ['ACCEPT','ROUTE','REVIEW']
  metadata: jsonb("metadata").$type<AssistantPromptMetadata>(), // structured availability snapshot
  deliveryChannel: text("delivery_channel"), // resolved channel: 'sms'|'email'|'both'|'none'
  deliveryStatus: text("delivery_status").notNull().default("pending"), // 'pending'|'sent'|'failed'|'skipped'|'queued'
  deliveryError: text("delivery_error"), // failure detail for debugging
  createdAt: timestamp("created_at").defaultNow().notNull(),
  sentAt: timestamp("sent_at"),
  actedOnAt: timestamp("acted_on_at"),
});

export const insertAssistantPromptSchema = createInsertSchema(assistantPrompts).omit({
  id: true,
  createdAt: true,
  sentAt: true,
  actedOnAt: true,
});
export type InsertAssistantPrompt = z.infer<typeof insertAssistantPromptSchema>;
export type AssistantPrompt = typeof assistantPrompts.$inferSelect;

// A single enriched trust event for display in the inquiry/referral "Trust
// Timeline". Built server-side (see storage.getTrustTimeline) so the admin UI
// needs no extra lookups. Read-only/derived; not a table.
export type TrustTimelineEntry = {
  id: string; // cdi_behavioral_events.id
  eventType: string; // e.g. 'response_received'
  eventCategory: string; // e.g. 'communication'
  dimension: string; // CDI dimension
  signalStrength: number; // -100..+100
  createdAt: string; // ISO timestamp
  source: "sms" | "test_tool" | "manual_match" | "system"; // where the event came from
  personName: string | null; // linked person/contact, if resolved
  personType: "user" | "contact" | "phone" | null;
  matchStatus: string | null; // inbound match status if event came from an SMS reply
  matchConfidence: number | null; // 0-100 if available
  matchReason: string | null; // human-readable factors behind the match
  evidenceText: string | null; // short excerpt of the reply, if any
};
