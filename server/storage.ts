import {
  users,
  artistProfiles,
  artistServices,
  clientContacts,
  bookings,
  bookingChecklists,
  messages,
  contracts,
  contractTemplates,
  payments,
  availability,
  schedules,
  eventDaySchedules,
  scheduleTeamMembers,
  scheduleAppointments,
  scheduleChatMessages,
  chatInvites,
  chatInviteMessages,
  conversations,
  conversationParticipants,
  teamMembers,
  businessChatMessages,
  businessChatInsights,
  clientIntakes,
  artistIntakes,
  plannerIntakes,
  supportCases,
  invitations,
  cdiEvents,
  cdiScores,
  cdiAiInsights,
  cdiThresholds,
  cdiAdminOverrides,
  cdiBehavioralEvents,
  cdiDimensionScores,
  cdiCompositeScores,
  cdiFeedbackEvents,
  cdiLearningRuns,
  cdiPatternLibrary,
  auditLogs,
  aiChatConversations,
  aiChatMessages,
  analyticsEvents,
  threads,
  threadMessages,
  threadReferrals,
  type AnalyticsEvent,
  type InsertAnalyticsEvent,
  type User,
  type UpsertUser,
  type ArtistProfile,
  type InsertArtistProfile,
  type ArtistService,
  type InsertArtistService,
  type ClientContact,
  type InsertClientContact,
  type Booking,
  type InsertBooking,
  type BookingChecklist,
  type InsertBookingChecklist,
  type Message,
  type InsertMessage,
  type Contract,
  type InsertContract,
  type ContractTemplate,
  type InsertContractTemplate,
  type Payment,
  type InsertPayment,
  type Availability,
  type InsertAvailability,
  type Schedule,
  type InsertSchedule,
  type EventDaySchedule,
  type InsertEventDaySchedule,
  type ScheduleTeamMember,
  type InsertScheduleTeamMember,
  type ScheduleAppointment,
  type InsertScheduleAppointment,
  type ScheduleChatMessage,
  type InsertScheduleChatMessage,
  type ChatInvite,
  type InsertChatInvite,
  type ChatInviteMessage,
  type InsertChatInviteMessage,
  type Conversation,
  type InsertConversation,
  type ConversationParticipant,
  type TeamMember,
  type InsertTeamMember,
  type BusinessChatMessage,
  type InsertBusinessChatMessage,
  type BusinessChatInsight,
  type InsertBusinessChatInsight,
  type ClientIntake,
  type InsertClientIntake,
  type ArtistIntake,
  type InsertArtistIntake,
  type PlannerIntake,
  type InsertPlannerIntake,
  type SupportCase,
  type InsertSupportCase,
  type Invitation,
  type InsertInvitation,
  type CdiEvent,
  type InsertCdiEvent,
  type CdiScore,
  type InsertCdiScore,
  type CdiAiInsight,
  type InsertCdiAiInsight,
  type CdiThreshold,
  type InsertCdiThreshold,
  type CdiAdminOverride,
  type InsertCdiAdminOverride,
  type CdiBehavioralEvent,
  type InsertCdiBehavioralEvent,
  type CdiDimensionScore,
  type InsertCdiDimensionScore,
  type CdiCompositeScore,
  type InsertCdiCompositeScore,
  type CdiFeedbackEvent,
  type InsertCdiFeedbackEvent,
  type CdiLearningRun,
  type InsertCdiLearningRun,
  type CdiPatternLibrary,
  type InsertCdiPatternLibrary,
  type AuditLog,
  profileReports,
  type InsertProfileReport,
  type AiChatConversation,
  type InsertAiChatConversation,
  type AiChatMessage,
  type InsertAiChatMessage,
  iqsLeadScores,
  iqsInteractionEvents,
  iqsPatterns,
  iqsVendorFeedback,
  iqsLearningRuns,
  type IqsLeadScore,
  type InsertIqsLeadScore,
  type IqsInteractionEvent,
  type InsertIqsInteractionEvent,
  type IqsPattern,
  type InsertIqsPattern,
  type IqsVendorFeedback,
  type InsertIqsVendorFeedback,
  type IqsLearningRun,
  type InsertIqsLearningRun,
  communicationLogs,
  type CommunicationLog,
  type InsertCommunicationLog,
  scheduledEmails,
  type ScheduledEmail,
  type InsertScheduledEmail,
  inquiries,
  inquiryNotifications,
  type Inquiry,
  type InsertInquiry,
  type InquiryNotification,
  type InsertInquiryNotification,
  proposals,
  type Proposal,
  type InsertProposal,
  waitlistSignups,
  type WaitlistSignup,
  type Thread,
  type InsertThread,
  type ThreadMessage,
  type InsertThreadMessage,
  type ThreadReferral,
  type InsertThreadReferral,
  artistFormConfigs,
  type ArtistFormConfig,
  type InsertArtistFormConfig,
  type FormConfig,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, or, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // Users (including Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  updateUsername(id: string, username: string): Promise<User | undefined>;
  isUsernameAvailable(username: string): Promise<boolean>;
  createUser(user: { email: string; password: string; firstName?: string | null; lastName?: string | null }): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User | undefined>;
  updateUser(id: string, data: Partial<{ email: string; firstName: string; lastName: string; phone: string; profileImageUrl: string; squareMerchantId: string; squareAccessToken: string; squareRefreshToken: string; squareTokenExpiresAt: Date; cdiConsentGiven: boolean; cdiConsentDate: Date; cdiOptOut: boolean }>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  
  // Intakes
  createClientIntake(intake: InsertClientIntake): Promise<ClientIntake>;
  getClientIntake(userId: string): Promise<ClientIntake | undefined>;
  createArtistIntake(intake: InsertArtistIntake): Promise<ArtistIntake>;
  getArtistIntake(userId: string): Promise<ArtistIntake | undefined>;
  createPlannerIntake(intake: InsertPlannerIntake): Promise<PlannerIntake>;
  getPlannerIntake(userId: string): Promise<PlannerIntake | undefined>;
  
  // Artist Profiles
  getArtistProfile(userId: string): Promise<ArtistProfile | undefined>;
  getArtistProfileByInstagram(instagramHandle: string): Promise<ArtistProfile | undefined>;
  getArtistProfileByEmail(email: string): Promise<ArtistProfile | undefined>;
  createArtistProfile(profile: InsertArtistProfile): Promise<ArtistProfile>;
  updateArtistProfile(userId: string, profile: Partial<ArtistProfile>): Promise<ArtistProfile | undefined>;
  searchArtists(location?: string, eventDate?: Date, service?: string): Promise<Array<User & { profile: ArtistProfile }>>;
  
  // Artist Services
  getArtistServices(artistId: string): Promise<ArtistService[]>;
  getArtistService(id: string): Promise<ArtistService | undefined>;
  createArtistService(service: InsertArtistService): Promise<ArtistService>;
  updateArtistService(id: string, service: Partial<InsertArtistService>): Promise<ArtistService | undefined>;
  deleteArtistService(id: string): Promise<void>;
  
  // Client Contacts (for vendors to store existing clients)
  getClientContactsByArtist(artistId: string): Promise<ClientContact[]>;
  getClientContact(id: string): Promise<ClientContact | undefined>;
  createClientContact(contact: InsertClientContact): Promise<ClientContact>;
  updateClientContact(id: string, contact: Partial<InsertClientContact>): Promise<ClientContact | undefined>;
  deleteClientContact(id: string): Promise<void>;
  getClientContactByEmail(artistId: string, email: string): Promise<ClientContact | undefined>;
  
  // Bookings
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingsByClient(clientId: string): Promise<Booking[]>;
  getBookingsByArtist(artistId: string): Promise<Booking[]>;
  getBookingsByPlanner(plannerId: string): Promise<Booking[]>;
  getBookingBySquareOrderId(orderId: string): Promise<Booking | undefined>;
  getBookingBySquareInvoiceId(invoiceId: string): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, booking: Partial<InsertBooking>): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<void>;
  getAllBookings(): Promise<Booking[]>;
  
  // Booking Checklists (day-of readiness)
  getBookingChecklist(bookingId: string, vendorId: string): Promise<BookingChecklist | undefined>;
  createBookingChecklist(data: InsertBookingChecklist): Promise<BookingChecklist>;
  updateBookingChecklist(id: string, data: Partial<InsertBookingChecklist>): Promise<BookingChecklist | undefined>;
  getBookingChecklistsByVendor(vendorId: string): Promise<BookingChecklist[]>;
  
  // Messages
  getMessage(id: string): Promise<Message | undefined>;
  getMessagesByBooking(bookingId: string): Promise<Message[]>;
  getMessagesBetweenUsers(user1Id: string, user2Id: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Contracts
  getContract(id: string): Promise<Contract | undefined>;
  getContractBySigningToken(token: string): Promise<Contract | undefined>;
  getContractsByBooking(bookingId: string): Promise<Contract[]>;
  getContractsByArtist(artistId: string): Promise<Contract[]>;
  createContract(contract: InsertContract): Promise<Contract>;
  getAllContracts(): Promise<Contract[]>;
  updateContract(id: string, contract: Partial<InsertContract>): Promise<Contract | undefined>;
  deleteContract(id: string): Promise<void>;
  
  // Contract Templates
  getContractTemplatesByArtist(artistId: string): Promise<ContractTemplate[]>;
  getContractTemplate(id: string): Promise<ContractTemplate | undefined>;
  createContractTemplate(template: InsertContractTemplate): Promise<ContractTemplate>;
  updateContractTemplate(id: string, template: Partial<InsertContractTemplate>): Promise<ContractTemplate | undefined>;
  deleteContractTemplate(id: string): Promise<void>;
  getDefaultContractTemplate(artistId: string): Promise<ContractTemplate | undefined>;
  
  // Payments
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByContract(contractId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  getAllPayments(): Promise<Payment[]>;
  
  // Availability
  getUserAvailability(userId: string, startDate: Date, endDate: Date): Promise<Availability[]>;
  setAvailability(availability: InsertAvailability): Promise<Availability>;
  deleteAvailability(userId: string, date: Date): Promise<void>;
  checkAvailability(userId: string, date: Date): Promise<boolean>;
  
  // Schedules (legacy)
  getScheduleByBooking(bookingId: string): Promise<Schedule | undefined>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: string, schedule: Partial<InsertSchedule>): Promise<Schedule | undefined>;
  
  // Event Day Schedules (smart scheduling grid)
  getEventDaySchedule(id: string): Promise<EventDaySchedule | undefined>;
  getEventDaySchedulesByArtist(artistId: string): Promise<EventDaySchedule[]>;
  getEventDayScheduleByShareToken(shareToken: string): Promise<EventDaySchedule | undefined>;
  createEventDaySchedule(schedule: InsertEventDaySchedule): Promise<EventDaySchedule>;
  updateEventDaySchedule(id: string, schedule: Partial<InsertEventDaySchedule>): Promise<EventDaySchedule | undefined>;
  deleteEventDaySchedule(id: string): Promise<void>;
  
  // Schedule Team Members
  getScheduleTeamMember(id: string): Promise<ScheduleTeamMember | undefined>;
  getScheduleTeamMembers(scheduleId: string): Promise<ScheduleTeamMember[]>;
  createScheduleTeamMember(member: InsertScheduleTeamMember): Promise<ScheduleTeamMember>;
  updateScheduleTeamMember(id: string, member: Partial<InsertScheduleTeamMember>): Promise<ScheduleTeamMember | undefined>;
  deleteScheduleTeamMember(id: string): Promise<void>;
  
  // Schedule Appointments
  getScheduleAppointment(id: string): Promise<ScheduleAppointment | undefined>;
  getScheduleAppointments(scheduleId: string): Promise<ScheduleAppointment[]>;
  createScheduleAppointment(appointment: InsertScheduleAppointment): Promise<ScheduleAppointment>;
  updateScheduleAppointment(id: string, appointment: Partial<InsertScheduleAppointment>): Promise<ScheduleAppointment | undefined>;
  deleteScheduleAppointment(id: string): Promise<void>;
  bulkCreateScheduleAppointments(appointments: InsertScheduleAppointment[]): Promise<ScheduleAppointment[]>;
  
  // Schedule Chat Messages (guest chat on public schedule)
  getScheduleChatMessages(scheduleId: string): Promise<ScheduleChatMessage[]>;
  createScheduleChatMessage(message: InsertScheduleChatMessage): Promise<ScheduleChatMessage>;
  
  // Chat Invites
  getChatInvitesByUser(userId: string): Promise<ChatInvite[]>;
  getChatInviteByToken(token: string): Promise<ChatInvite | undefined>;
  getChatInvite(id: string): Promise<ChatInvite | undefined>;
  createChatInvite(invite: InsertChatInvite): Promise<ChatInvite>;
  updateChatInvite(id: string, invite: Partial<InsertChatInvite>): Promise<ChatInvite | undefined>;
  
  // Chat Invite Messages
  getChatInviteMessages(chatInviteId: string): Promise<ChatInviteMessage[]>;
  createChatInviteMessage(message: InsertChatInviteMessage): Promise<ChatInviteMessage>;
  
  // Conversations
  getConversation(id: string): Promise<Conversation | undefined>;
  getConversationsByUser(userId: string): Promise<Array<Conversation & { participants: User[] }>>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  addParticipantToConversation(conversationId: string, userId: string): Promise<ConversationParticipant>;
  getConversationParticipants(conversationId: string): Promise<User[]>;
  
  // Contacts
  getContactsForUser(userId: string): Promise<User[]>;
  
  // Team Members (for business chat)
  getTeamMembers(ownerId: string): Promise<TeamMember[]>;
  getTeamMember(id: string): Promise<TeamMember | undefined>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: string, member: Partial<InsertTeamMember>): Promise<TeamMember | undefined>;
  deleteTeamMember(id: string): Promise<void>;
  
  // Business Chat Messages
  getBusinessChatMessages(conversationId: string): Promise<BusinessChatMessage[]>;
  createBusinessChatMessage(message: InsertBusinessChatMessage): Promise<BusinessChatMessage>;
  markBusinessChatMessagesRead(conversationId: string, userId: string): Promise<void>;
  
  // Business Chat AI Insights (Invisible Labor)
  createBusinessChatInsight(insight: InsertBusinessChatInsight): Promise<BusinessChatInsight>;
  getBusinessChatInsightsByConversation(conversationId: string): Promise<BusinessChatInsight[]>;
  getBusinessChatInsightsByUser(userId: string): Promise<BusinessChatInsight[]>;
  getInvisibleLaborStats(ownerId: string): Promise<{ totalPivots: number; totalLaborMinutes: number; crisesPrevented: number }>;
  getRecentPivots(limit?: number): Promise<BusinessChatInsight[]>;
  
  // Business Conversations
  getBusinessConversations(ownerId: string): Promise<Conversation[]>;
  createBusinessConversation(title: string, ownerId: string): Promise<Conversation>;
  
  // Support Cases
  createSupportCase(supportCase: InsertSupportCase): Promise<SupportCase>;
  getSupportCasesByUser(userId: string): Promise<SupportCase[]>;
  getAllSupportCases(): Promise<SupportCase[]>;
  updateSupportCase(id: string, supportCase: Partial<InsertSupportCase>): Promise<SupportCase | undefined>;
  
  // Invitations
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
  getInvitationByToken(token: string): Promise<Invitation | undefined>;
  getInvitationsByInviter(inviterId: string): Promise<Invitation[]>;
  getInvitationsByBooking(bookingId: string): Promise<Invitation[]>;
  updateInvitation(id: string, invitation: Partial<InsertInvitation>): Promise<Invitation | undefined>;
  acceptInvitation(token: string, userId: string): Promise<Invitation | undefined>;
  
  // CDI
  createCdiEvent(event: InsertCdiEvent): Promise<CdiEvent>;
  getCdiEventsByUser(userId: string): Promise<CdiEvent[]>;
  createOrUpdateCdiScore(score: InsertCdiScore): Promise<CdiScore>;
  getCdiScore(userId: string): Promise<CdiScore | undefined>;
  getAllCdiScores(): Promise<CdiScore[]>;
  getAllUsers(): Promise<User[]>;
  
  // CDI AI (HACO Framework)
  createCdiAiInsight(insight: InsertCdiAiInsight): Promise<CdiAiInsight>;
  getCdiAiInsightsByUser(userId: string): Promise<CdiAiInsight[]>;
  getLatestCdiAiInsight(userId: string): Promise<CdiAiInsight | undefined>;
  getCdiThresholds(): Promise<CdiThreshold[]>;
  getActiveCdiThreshold(): Promise<CdiThreshold | undefined>;
  createCdiThreshold(threshold: InsertCdiThreshold): Promise<CdiThreshold>;
  updateCdiThreshold(id: string, threshold: Partial<InsertCdiThreshold>): Promise<CdiThreshold | undefined>;
  createCdiAdminOverride(override: InsertCdiAdminOverride): Promise<CdiAdminOverride>;
  getCdiAdminOverrides(): Promise<CdiAdminOverride[]>;
  
  // CDI Three-Dimension Model
  createCdiBehavioralEvent(event: InsertCdiBehavioralEvent): Promise<CdiBehavioralEvent>;
  getCdiBehavioralEventsByUser(userId: string): Promise<CdiBehavioralEvent[]>;
  getCdiBehavioralEventsByBooking(bookingId: string): Promise<CdiBehavioralEvent[]>;
  createCdiDimensionScore(score: InsertCdiDimensionScore): Promise<CdiDimensionScore>;
  getCdiDimensionScoresByUser(userId: string): Promise<CdiDimensionScore[]>;
  getLatestCdiDimensionScores(userId: string): Promise<CdiDimensionScore[]>;
  createCdiCompositeScore(score: InsertCdiCompositeScore): Promise<CdiCompositeScore>;
  getCdiCompositeScoresByUser(userId: string): Promise<CdiCompositeScore[]>;
  getLatestCdiCompositeScore(userId: string): Promise<CdiCompositeScore | undefined>;
  getAllCdiCompositeScores(): Promise<CdiCompositeScore[]>;
  createCdiFeedbackEvent(feedback: InsertCdiFeedbackEvent): Promise<CdiFeedbackEvent>;
  getUnprocessedCdiFeedbackEvents(): Promise<CdiFeedbackEvent[]>;
  markCdiFeedbackEventProcessed(id: string): Promise<void>;
  createCdiLearningRun(run: InsertCdiLearningRun): Promise<CdiLearningRun>;
  completeCdiLearningRun(id: string, results: Partial<InsertCdiLearningRun>): Promise<CdiLearningRun | undefined>;
  getCdiPatternLibrary(dimension?: string): Promise<CdiPatternLibrary[]>;
  createCdiPattern(pattern: InsertCdiPatternLibrary): Promise<CdiPatternLibrary>;
  updateCdiPatternStrength(id: string, strengthDelta: number): Promise<CdiPatternLibrary | undefined>;
  
  // Audit Logs - standardized action vocabulary:
  // inquiry_created, first_response, hold_placed, hold_expired, proposal_sent, proposal_viewed,
  // confirm_clicked, booking_created, declined, auto_escalated, reminder_sent
  createAuditLog(log: { 
    action: string; 
    entityType: string; 
    entityId: string; 
    performedBy: string; 
    actorRole?: 'artist' | 'planner' | 'client' | 'system' | 'admin';
    changes?: Record<string, any>;
    diff?: Record<string, { from: any; to: any }>;
  }): Promise<AuditLog>;
  
  // AI Chat Conversations
  getAiChatConversations(userId: string): Promise<AiChatConversation[]>;
  createAiChatConversation(userId: string, title?: string): Promise<AiChatConversation>;
  updateAiChatConversationTitle(conversationId: string, title: string): Promise<AiChatConversation | undefined>;
  deleteAiChatConversation(conversationId: string): Promise<void>;
  
  // AI Chat Messages
  getAiChatMessages(userId: string, limit?: number): Promise<AiChatMessage[]>;
  getAiChatMessagesByConversation(conversationId: string, limit?: number): Promise<AiChatMessage[]>;
  createAiChatMessage(message: InsertAiChatMessage): Promise<AiChatMessage>;
  clearAiChatMessages(userId: string): Promise<void>;
  clearAiChatMessagesByConversation(conversationId: string): Promise<void>;
  
  // Messaging security
  checkBookingRelationship(user1Id: string, user2Id: string): Promise<boolean>;
  
  // Vendor Verification
  getPendingVendors(): Promise<Array<User & { profile: ArtistProfile }>>;
  getAllVendorsWithStatus(): Promise<Array<User & { profile: ArtistProfile }>>;
  
  // Profile Reports
  createProfileReport(report: InsertProfileReport): Promise<{ id: string; reportedUserId: string; reporterId: string; reason: string; description: string | null; status: string | null; createdAt: Date | null }>;
  getAllProfileReports(): Promise<Array<{ id: string; reportedUserId: string; reporterId: string; reason: string; description: string | null; status: string | null; reviewedBy: string | null; reviewedAt: Date | null; actionTaken: string | null; createdAt: Date | null }>>;
  updateProfileReport(id: string, data: Partial<{ status: string; actionTaken: string; reviewedBy: string; reviewedAt: Date }>): Promise<{ id: string } | undefined>;
  
  // IQS (Interaction Quality Scoring)
  createIqsLeadScore(score: InsertIqsLeadScore): Promise<IqsLeadScore>;
  getIqsLeadScore(id: string): Promise<IqsLeadScore | undefined>;
  getIqsLeadScoresByVendor(vendorId: string): Promise<IqsLeadScore[]>;
  getIqsLeadScoreByClient(vendorId: string, clientUserId?: string, clientContactId?: string): Promise<IqsLeadScore | undefined>;
  updateIqsLeadScore(id: string, data: Partial<InsertIqsLeadScore>): Promise<IqsLeadScore | undefined>;
  
  createIqsInteractionEvent(event: InsertIqsInteractionEvent): Promise<IqsInteractionEvent>;
  getIqsInteractionEvents(leadScoreId: string): Promise<IqsInteractionEvent[]>;
  getRecentIqsInteractionEvents(vendorId: string, limit?: number): Promise<IqsInteractionEvent[]>;
  
  getActiveIqsPatterns(): Promise<IqsPattern[]>;
  getIqsPattern(id: string): Promise<IqsPattern | undefined>;
  createIqsPattern(pattern: InsertIqsPattern): Promise<IqsPattern>;
  updateIqsPattern(id: string, data: Partial<InsertIqsPattern>): Promise<IqsPattern | undefined>;
  incrementIqsPatternTrigger(id: string, confirmed: boolean): Promise<void>;
  
  createIqsVendorFeedback(feedback: InsertIqsVendorFeedback): Promise<IqsVendorFeedback>;
  getUnprocessedIqsFeedback(): Promise<IqsVendorFeedback[]>;
  markIqsFeedbackProcessed(id: string): Promise<void>;
  
  createIqsLearningRun(run: InsertIqsLearningRun): Promise<IqsLearningRun>;
  completeIqsLearningRun(id: string, results: Partial<InsertIqsLearningRun>): Promise<IqsLearningRun | undefined>;
  getIqsLearningRuns(limit?: number): Promise<IqsLearningRun[]>;
  
  // Waitlist
  createWaitlistSignup(data: { email: string; source?: string; eventDate?: Date; location?: string; servicesNeeded?: string[]; inspirationImages?: string[]; notes?: string }): Promise<WaitlistSignup>;
  upsertWaitlistSignup(data: { email: string; source?: string; eventDate?: Date; location?: string; servicesNeeded?: string[]; inspirationImages?: string[]; notes?: string }): Promise<WaitlistSignup>;
  getAllWaitlistSignups(): Promise<WaitlistSignup[]>;
  
  // Private Coordination Threads
  createThread(data: Omit<InsertThread, 'id'>): Promise<Thread>;
  getThreadByToken(token: string): Promise<Thread | undefined>;
  getThreadsByArtist(artistProfileId: string): Promise<Thread[]>;
  updateThread(id: string, data: Partial<InsertThread>): Promise<Thread | undefined>;
  createThreadMessage(data: { threadId: string; actorType: string; body: string }): Promise<ThreadMessage>;
  getThreadMessages(threadId: string): Promise<ThreadMessage[]>;
  createThreadReferral(data: InsertThreadReferral): Promise<ThreadReferral>;
  getThreadReferrals(threadId: string): Promise<ThreadReferral[]>;
  getArtistProfileById(id: string): Promise<ArtistProfile | undefined>;
  getArtistProfileBySlug(slug: string): Promise<ArtistProfile | undefined>;
  
  // Communication Logs
  createCommunicationLog(log: InsertCommunicationLog): Promise<CommunicationLog>;
  getCommunicationLogsByArtist(artistId: string, limit?: number): Promise<CommunicationLog[]>;
  getCommunicationLogsByRecipient(artistId: string, recipientEmail: string): Promise<CommunicationLog[]>;
  getCommunicationLog(id: string): Promise<CommunicationLog | undefined>;
  
  // Scheduled Emails
  createScheduledEmail(email: InsertScheduledEmail): Promise<ScheduledEmail>;
  getScheduledEmail(id: string): Promise<ScheduledEmail | undefined>;
  getScheduledEmailsByArtist(artistId: string): Promise<ScheduledEmail[]>;
  getPendingScheduledEmails(): Promise<ScheduledEmail[]>;
  updateScheduledEmail(id: string, data: Partial<InsertScheduledEmail>): Promise<ScheduledEmail | undefined>;
  markScheduledEmailSent(id: string): Promise<ScheduledEmail | undefined>;
  markScheduledEmailFailed(id: string, errorMessage: string): Promise<ScheduledEmail | undefined>;
  cancelScheduledEmail(id: string): Promise<ScheduledEmail | undefined>;
  
  // Inquiries
  createInquiry(data: InsertInquiry): Promise<Inquiry>;
  getInquiry(id: string): Promise<Inquiry | undefined>;
  getInquiryByThreadToken(threadToken: string): Promise<Inquiry | undefined>;
  getInquiriesByVendor(vendorId: string): Promise<Inquiry[]>;
  getInquiriesByClient(clientEmail: string): Promise<Inquiry[]>;
  updateInquiry(id: string, data: Partial<InsertInquiry>): Promise<Inquiry | undefined>;
  deleteInquiry(id: string): Promise<void>;
  getExpiredHolds(now: Date): Promise<Inquiry[]>;
  getActiveInquiries(): Promise<Inquiry[]>;
  
  // Inquiry Notifications
  createInquiryNotification(data: InsertInquiryNotification): Promise<InquiryNotification>;
  getInquiryNotifications(inquiryId: string): Promise<InquiryNotification[]>;
  
  // Proposals
  createProposal(data: InsertProposal): Promise<Proposal>;
  getProposal(id: string): Promise<Proposal | undefined>;
  getProposalsByArtist(artistId: string): Promise<Proposal[]>;
  updateProposal(id: string, data: Partial<InsertProposal>): Promise<Proposal | undefined>;
  deleteProposal(id: string): Promise<void>;
  
  // Vendor Metrics (Proving Ground)
  getVendorMetrics(vendorId: string, sinceDays?: number): Promise<{
    vendorId: string;
    avgTimeToFirstResponseMinutes: number | null;
    terminalStateUnder24hPercent: number;
    holdExpiryRate: number;
    confirmSuccessCount: number;
    confirmFailedCount: number;
    totalInquiries: number;
  }>;
  getTopVendorMetrics(limit?: number, sinceDays?: number): Promise<Array<{
    vendorId: string;
    vendorName: string;
    avgTimeToFirstResponseMinutes: number | null;
    terminalStateUnder24hPercent: number;
    holdExpiryRate: number;
    confirmSuccessCount: number;
    confirmFailedCount: number;
    totalInquiries: number;
  }>>;
  
  // Artist Form Configs
  getArtistFormConfig(artistId: string): Promise<ArtistFormConfig | undefined>;
  upsertArtistFormConfig(artistId: string, config: FormConfig): Promise<ArtistFormConfig>;
}

export class DatabaseStorage implements IStorage {
  // Users (including Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username.toLowerCase()));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.passwordResetToken, token));
    return user || undefined;
  }

  async createUser(userData: { email: string; password: string; firstName?: string | null; lastName?: string | null }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
      })
      .returning();
    return user;
  }

  async createPublicArtistUser(userData: { firstName?: string | null; lastName?: string | null; email?: string | null; role: string; password?: string | null }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        email: userData.email || null,
        role: userData.role,
        password: userData.password || null,
      })
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async updateUsername(id: string, username: string): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ username: username.toLowerCase(), updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async isUsernameAvailable(username: string): Promise<boolean> {
    const normalized = username.toLowerCase();
    const [existing] = await db.select().from(users).where(eq(users.username, normalized));
    return !existing;
  }

  async updateUser(id: string, data: Partial<{ email: string; firstName: string; lastName: string; phone: string; profileImageUrl: string; squareMerchantId: string; squareAccessToken: string; squareRefreshToken: string; squareTokenExpiresAt: Date; cdiConsentGiven: boolean; cdiConsentDate: Date; cdiOptOut: boolean; password: string; passwordResetToken: string | null; passwordResetExpires: Date | null }>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteUser(id: string): Promise<void> {
    // Delete related data first (in order of dependencies)
    // Chat and messaging data
    await db.delete(aiChatMessages).where(eq(aiChatMessages.userId, id));
    await db.delete(businessChatMessages).where(eq(businessChatMessages.senderId, id));
    await db.delete(businessChatInsights).where(eq(businessChatInsights.senderId, id));
    await db.update(businessChatInsights).set({ relatedClientId: null }).where(eq(businessChatInsights.relatedClientId, id));
    await db.delete(messages).where(or(eq(messages.senderId, id), eq(messages.recipientId, id)));
    
    // Chat invites (both sender and invitee)
    await db.delete(chatInvites).where(or(eq(chatInvites.senderId, id), eq(chatInvites.inviteeUserId, id)));
    
    // Intake forms
    await db.delete(clientIntakes).where(eq(clientIntakes.userId, id));
    await db.delete(artistIntakes).where(eq(artistIntakes.userId, id));
    await db.delete(plannerIntakes).where(eq(plannerIntakes.userId, id));
    
    // Artist-specific data
    await db.delete(artistServices).where(eq(artistServices.artistId, id));
    await db.update(artistProfiles).set({ verifiedBy: null }).where(eq(artistProfiles.verifiedBy, id));
    await db.delete(artistProfiles).where(eq(artistProfiles.userId, id));
    await db.delete(contractTemplates).where(eq(contractTemplates.artistId, id));
    
    // Profile reports
    await db.delete(profileReports).where(or(eq(profileReports.reportedUserId, id), eq(profileReports.reporterId, id)));
    await db.update(profileReports).set({ reviewedBy: null }).where(eq(profileReports.reviewedBy, id));
    
    // Scheduling data
    await db.delete(availability).where(eq(availability.userId, id));
    await db.delete(eventDaySchedules).where(eq(eventDaySchedules.artistId, id));
    
    // Contacts and team
    await db.delete(clientContacts).where(eq(clientContacts.artistId, id));
    await db.update(clientContacts).set({ linkedUserId: null }).where(eq(clientContacts.linkedUserId, id));
    await db.delete(teamMembers).where(or(eq(teamMembers.ownerId, id), eq(teamMembers.memberId, id)));
    
    // CDI and IQS scoring data
    await db.delete(cdiEvents).where(eq(cdiEvents.userId, id));
    await db.delete(cdiScores).where(eq(cdiScores.userId, id));
    await db.delete(cdiAiInsights).where(eq(cdiAiInsights.userId, id));
    await db.delete(cdiBehavioralEvents).where(or(eq(cdiBehavioralEvents.userId, id), eq(cdiBehavioralEvents.targetUserId, id)));
    await db.delete(cdiDimensionScores).where(eq(cdiDimensionScores.userId, id));
    await db.delete(cdiCompositeScores).where(eq(cdiCompositeScores.userId, id));
    await db.update(cdiThresholds).set({ createdBy: null }).where(eq(cdiThresholds.createdBy, id));
    await db.delete(cdiAdminOverrides).where(eq(cdiAdminOverrides.adminId, id));
    
    // Communication logs
    await db.delete(communicationLogs).where(eq(communicationLogs.artistId, id));
    await db.delete(scheduledEmails).where(eq(scheduledEmails.artistId, id));
    
    // Support cases
    await db.delete(supportCases).where(eq(supportCases.userId, id));
    await db.update(supportCases).set({ assignedTo: null }).where(eq(supportCases.assignedTo, id));
    
    // Conversation participants (remove from conversations)
    await db.delete(conversationParticipants).where(eq(conversationParticipants.userId, id));
    
    // Nullify conversation owner references
    await db.update(conversations).set({ ownerId: null }).where(eq(conversations.ownerId, id));
    
    // Nullify references in bookings rather than delete (preserve booking history for other party)
    await db.update(bookings).set({ clientId: null }).where(eq(bookings.clientId, id));
    await db.update(bookings).set({ artistId: null }).where(eq(bookings.artistId, id));
    await db.update(bookings).set({ plannerId: null }).where(eq(bookings.plannerId, id));
    
    // First get user's contracts to delete payments linked to them
    const userContracts = await db.select({ id: contracts.id })
      .from(contracts)
      .where(or(eq(contracts.artistId, id), eq(contracts.clientId, id)));
    
    // Delete payments for user's contracts
    for (const contract of userContracts) {
      await db.delete(payments).where(eq(payments.contractId, contract.id));
    }
    
    // Delete contracts where user is artist or client (contracts have NOT NULL constraints)
    await db.delete(contracts).where(or(eq(contracts.artistId, id), eq(contracts.clientId, id)));
    
    // Delete inquiries where user is vendor (vendorId is NOT NULL)
    await db.delete(inquiries).where(eq(inquiries.vendorId, id));
    // Nullify inquiries clientId (it's nullable)
    await db.update(inquiries).set({ clientId: null }).where(eq(inquiries.clientId, id));
    
    // Delete invitations where user is inviter (invitedBy is NOT NULL)
    await db.delete(invitations).where(eq(invitations.invitedBy, id));
    // Nullify invitation acceptedUserId (it's nullable)
    await db.update(invitations).set({ acceptedUserId: null }).where(eq(invitations.acceptedUserId, id));
    
    // Nullify audit log references (preserve audit trail)
    await db.update(auditLogs).set({ userId: null }).where(eq(auditLogs.userId, id));
    
    // Delete the user
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Intakes
  async createClientIntake(intake: InsertClientIntake): Promise<ClientIntake> {
    const [newIntake] = await db.insert(clientIntakes).values(intake as any).returning();
    await db.update(users).set({ intakeCompleted: true, updatedAt: new Date() }).where(eq(users.id, intake.userId));
    return newIntake;
  }

  async getClientIntake(userId: string): Promise<ClientIntake | undefined> {
    const [intake] = await db.select().from(clientIntakes).where(eq(clientIntakes.userId, userId));
    return intake || undefined;
  }

  async createArtistIntake(intake: InsertArtistIntake): Promise<ArtistIntake> {
    const [newIntake] = await db.insert(artistIntakes).values(intake as any).returning();
    await db.update(users).set({ intakeCompleted: true, updatedAt: new Date() }).where(eq(users.id, intake.userId));
    return newIntake;
  }

  async getArtistIntake(userId: string): Promise<ArtistIntake | undefined> {
    const [intake] = await db.select().from(artistIntakes).where(eq(artistIntakes.userId, userId));
    return intake || undefined;
  }

  async createPlannerIntake(intake: InsertPlannerIntake): Promise<PlannerIntake> {
    const [newIntake] = await db.insert(plannerIntakes).values(intake as any).returning();
    await db.update(users).set({ intakeCompleted: true, updatedAt: new Date() }).where(eq(users.id, intake.userId));
    return newIntake;
  }

  async getPlannerIntake(userId: string): Promise<PlannerIntake | undefined> {
    const [intake] = await db.select().from(plannerIntakes).where(eq(plannerIntakes.userId, userId));
    return intake || undefined;
  }

  // Artist Profiles
  async getArtistProfile(userId: string): Promise<ArtistProfile | undefined> {
    const [profile] = await db.select().from(artistProfiles).where(eq(artistProfiles.userId, userId));
    return profile || undefined;
  }
  
  async getArtistProfileByInstagram(instagramHandle: string): Promise<ArtistProfile | undefined> {
    const cleanHandle = instagramHandle.replace('@', '').toLowerCase();
    const [profile] = await db.select().from(artistProfiles)
      .where(sql`LOWER(${artistProfiles.instagramHandle}) = ${cleanHandle}`);
    return profile || undefined;
  }

  async getArtistProfileByEmail(email: string): Promise<ArtistProfile | undefined> {
    const lowerEmail = email.toLowerCase();
    // First try to find user by email, then get their profile
    const [user] = await db.select().from(users).where(sql`LOWER(${users.email}) = ${lowerEmail}`);
    if (user) {
      // Try to get profile by this user's ID first
      const [profileByUser] = await db.select().from(artistProfiles).where(eq(artistProfiles.userId, user.id));
      if (profileByUser) return profileByUser;
    }
    // Also search artist_profiles directly by any email-like field if they have one
    // Some profiles might have businessEmail or similar
    return undefined;
  }

  async createArtistProfile(profile: InsertArtistProfile): Promise<ArtistProfile> {
    const [newProfile] = await db.insert(artistProfiles).values(profile as any).returning();
    return newProfile;
  }

  async updateArtistProfile(userId: string, profile: Partial<ArtistProfile>): Promise<ArtistProfile | undefined> {
    const [updated] = await db
      .update(artistProfiles)
      .set(profile as any)
      .where(eq(artistProfiles.userId, userId))
      .returning();
    return updated || undefined;
  }

  async searchArtists(location?: string, eventDate?: Date, service?: string): Promise<Array<User & { profile: ArtistProfile }>> {
    const results = await db
      .select()
      .from(users)
      .leftJoin(artistProfiles, eq(users.id, artistProfiles.userId))
      .where(eq(users.role, 'artist'));
    
    let filtered = results
      .filter(r => r.artist_profiles !== null)
      // Show approved vendors, pending vendors, and newly signed up vendors (no status yet)
      .filter(r => r.artist_profiles!.verificationStatus === 'approved' || r.artist_profiles!.verificationStatus === 'pending' || !r.artist_profiles!.verificationStatus);
    
    // Filter by location (case-insensitive partial match)
    if (location) {
      const locationLower = location.toLowerCase();
      filtered = filtered.filter(r => {
        const profileLocation = r.artist_profiles?.location?.toLowerCase() || '';
        return profileLocation.includes(locationLower) || locationLower.includes(profileLocation.split(',')[0]?.trim() || '');
      });
    }
    
    // Filter by service category (matches against specialties)
    if (service) {
      const serviceLower = service.toLowerCase();
      filtered = filtered.filter(r => {
        const specialties = r.artist_profiles?.specialties || [];
        return specialties.some(s => s.toLowerCase().includes(serviceLower) || serviceLower.includes(s.toLowerCase()));
      });
    }
    
    return filtered.map(r => ({
      ...r.users,
      profile: r.artist_profiles!
    }));
  }

  // Artist Services
  async getArtistServices(artistId: string): Promise<ArtistService[]> {
    return await db
      .select()
      .from(artistServices)
      .where(eq(artistServices.artistId, artistId))
      .orderBy(artistServices.sortOrder);
  }

  async getArtistService(id: string): Promise<ArtistService | undefined> {
    const [service] = await db.select().from(artistServices).where(eq(artistServices.id, id));
    return service || undefined;
  }

  async createArtistService(service: InsertArtistService): Promise<ArtistService> {
    const [newService] = await db.insert(artistServices).values(service as any).returning();
    return newService;
  }

  async updateArtistService(id: string, service: Partial<InsertArtistService>): Promise<ArtistService | undefined> {
    const [updated] = await db
      .update(artistServices)
      .set(service as any)
      .where(eq(artistServices.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteArtistService(id: string): Promise<void> {
    await db.delete(artistServices).where(eq(artistServices.id, id));
  }

  // Client Contacts
  async getClientContactsByArtist(artistId: string): Promise<ClientContact[]> {
    return db.select().from(clientContacts).where(eq(clientContacts.artistId, artistId));
  }

  async getClientContact(id: string): Promise<ClientContact | undefined> {
    const [contact] = await db.select().from(clientContacts).where(eq(clientContacts.id, id));
    return contact || undefined;
  }

  async createClientContact(contact: InsertClientContact): Promise<ClientContact> {
    const [created] = await db.insert(clientContacts).values(contact).returning();
    return created;
  }

  async updateClientContact(id: string, contact: Partial<InsertClientContact>): Promise<ClientContact | undefined> {
    const [updated] = await db.update(clientContacts).set(contact).where(eq(clientContacts.id, id)).returning();
    return updated || undefined;
  }

  async deleteClientContact(id: string): Promise<void> {
    await db.delete(clientContacts).where(eq(clientContacts.id, id));
  }

  async getClientContactByEmail(artistId: string, email: string): Promise<ClientContact | undefined> {
    const [contact] = await db.select().from(clientContacts)
      .where(and(eq(clientContacts.artistId, artistId), eq(clientContacts.email, email)));
    return contact || undefined;
  }

  // Bookings
  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking || undefined;
  }

  async getBookingsByClient(clientId: string): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.clientId, clientId));
  }

  async getBookingsByArtist(artistId: string): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.artistId, artistId));
  }

  async getBookingsByPlanner(plannerId: string): Promise<Booking[]> {
    return await db.select().from(bookings).where(eq(bookings.plannerId, plannerId));
  }

  async getBookingBySquareOrderId(orderId: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.squareOrderId, orderId));
    return booking || undefined;
  }

  async getBookingBySquareInvoiceId(invoiceId: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.squareInvoiceId, invoiceId));
    return booking || undefined;
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    // Convert eventDate string to Date object if it's a string
    const insertData = { ...booking };
    if (insertData.eventDate && typeof insertData.eventDate === 'string') {
      const dateStr = insertData.eventDate as string;
      // If date-only string (YYYY-MM-DD), add noon to avoid timezone shift
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        (insertData as any).eventDate = new Date(`${dateStr}T12:00:00`);
      } else {
        (insertData as any).eventDate = new Date(dateStr);
      }
    }
    
    const [newBooking] = await db.insert(bookings).values(insertData as any).returning();
    return newBooking;
  }

  async updateBooking(id: string, booking: Partial<InsertBooking>): Promise<Booking | undefined> {
    // Convert eventDate string to Date object if it's a string
    const updateData = { ...booking };
    if (updateData.eventDate && typeof updateData.eventDate === 'string') {
      const dateStr = updateData.eventDate as string;
      // If date-only string (YYYY-MM-DD), add noon to avoid timezone shift
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        updateData.eventDate = new Date(`${dateStr}T12:00:00`);
      } else {
        updateData.eventDate = new Date(dateStr);
      }
    }
    
    const [updated] = await db
      .update(bookings)
      .set({ ...updateData, updatedAt: new Date() } as any)
      .where(eq(bookings.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteBooking(id: string): Promise<void> {
    // Delete related records first to avoid foreign key constraint violations
    // Order matters due to dependencies between tables
    
    // Delete schedule-related records
    const relatedSchedules = await db.select().from(eventDaySchedules).where(eq(eventDaySchedules.bookingId, id));
    for (const schedule of relatedSchedules) {
      await db.delete(scheduleAppointments).where(eq(scheduleAppointments.scheduleId, schedule.id));
      await db.delete(scheduleTeamMembers).where(eq(scheduleTeamMembers.scheduleId, schedule.id));
    }
    await db.delete(eventDaySchedules).where(eq(eventDaySchedules.bookingId, id));
    await db.delete(schedules).where(eq(schedules.bookingId, id));
    
    // Delete conversation-related records
    const relatedConversations = await db.select().from(conversations).where(eq(conversations.bookingId, id));
    for (const conv of relatedConversations) {
      // Delete business chat insights first (references messages)
      await db.delete(businessChatInsights).where(eq(businessChatInsights.conversationId, conv.id));
      await db.delete(businessChatMessages).where(eq(businessChatMessages.conversationId, conv.id));
      await db.delete(conversationParticipants).where(eq(conversationParticipants.conversationId, conv.id));
    }
    await db.delete(conversations).where(eq(conversations.bookingId, id));
    
    // Delete messages
    await db.delete(messages).where(eq(messages.bookingId, id));
    
    // Delete contract-related records
    const relatedContracts = await db.select().from(contracts).where(eq(contracts.bookingId, id));
    for (const contract of relatedContracts) {
      await db.delete(payments).where(eq(payments.contractId, contract.id));
    }
    await db.delete(contracts).where(eq(contracts.bookingId, id));
    
    // Delete other related records
    await db.delete(invitations).where(eq(invitations.bookingId, id));
    await db.delete(chatInvites).where(eq(chatInvites.bookingId, id));
    await db.delete(supportCases).where(eq(supportCases.bookingId, id));
    await db.delete(cdiEvents).where(eq(cdiEvents.bookingId, id));
    
    // Finally delete the booking itself
    await db.delete(bookings).where(eq(bookings.id, id));
  }

  async getAllBookings(): Promise<Booking[]> {
    return await db.select().from(bookings).orderBy(desc(bookings.createdAt));
  }

  // Booking Checklists (day-of readiness)
  async getBookingChecklist(bookingId: string, vendorId: string): Promise<BookingChecklist | undefined> {
    const [checklist] = await db
      .select()
      .from(bookingChecklists)
      .where(and(eq(bookingChecklists.bookingId, bookingId), eq(bookingChecklists.vendorId, vendorId)));
    return checklist || undefined;
  }

  async createBookingChecklist(data: InsertBookingChecklist): Promise<BookingChecklist> {
    const [checklist] = await db.insert(bookingChecklists).values({
      bookingId: data.bookingId,
      vendorId: data.vendorId,
      checklistType: data.checklistType,
      items: data.items as any,
      allCompleted: data.allCompleted,
      completedAt: data.completedAt,
    }).returning();
    return checklist;
  }

  async updateBookingChecklist(id: string, data: Partial<InsertBookingChecklist>): Promise<BookingChecklist | undefined> {
    const updateData: any = { updatedAt: new Date() };
    if (data.checklistType !== undefined) updateData.checklistType = data.checklistType;
    if (data.items !== undefined) updateData.items = data.items;
    if (data.allCompleted !== undefined) updateData.allCompleted = data.allCompleted;
    if (data.completedAt !== undefined) updateData.completedAt = data.completedAt;
    
    const [updated] = await db
      .update(bookingChecklists)
      .set(updateData)
      .where(eq(bookingChecklists.id, id))
      .returning();
    return updated || undefined;
  }

  async getBookingChecklistsByVendor(vendorId: string): Promise<BookingChecklist[]> {
    return await db
      .select()
      .from(bookingChecklists)
      .where(eq(bookingChecklists.vendorId, vendorId))
      .orderBy(desc(bookingChecklists.createdAt));
  }

  // Messages
  async getMessage(id: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message || undefined;
  }

  async getMessagesByBooking(bookingId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.bookingId, bookingId))
      .orderBy(desc(messages.createdAt));
  }

  async getMessagesBetweenUsers(user1Id: string, user2Id: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        or(
          and(eq(messages.senderId, user1Id), eq(messages.recipientId, user2Id)),
          and(eq(messages.senderId, user2Id), eq(messages.recipientId, user1Id))
        )
      )
      .orderBy(desc(messages.createdAt));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  // Contracts
  async getContract(id: string): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, id));
    return contract || undefined;
  }

  async getContractBySigningToken(token: string): Promise<Contract | undefined> {
    const [contract] = await db.select().from(contracts).where(eq(contracts.signingToken, token));
    return contract || undefined;
  }

  async getContractsByBooking(bookingId: string): Promise<Contract[]> {
    return await db.select().from(contracts).where(eq(contracts.bookingId, bookingId));
  }

  async getContractsByArtist(artistId: string): Promise<Contract[]> {
    return await db.select().from(contracts).where(eq(contracts.artistId, artistId)).orderBy(desc(contracts.createdAt));
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const [newContract] = await db.insert(contracts).values(contract).returning();
    return newContract;
  }

  async getAllContracts(): Promise<Contract[]> {
    return await db.select().from(contracts).orderBy(desc(contracts.createdAt));
  }

  async updateContract(id: string, contract: Partial<InsertContract>): Promise<Contract | undefined> {
    const [updated] = await db
      .update(contracts)
      .set({ ...contract, updatedAt: new Date() })
      .where(eq(contracts.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteContract(id: string): Promise<void> {
    await db.delete(contracts).where(eq(contracts.id, id));
  }

  // Contract Templates
  async getContractTemplatesByArtist(artistId: string): Promise<ContractTemplate[]> {
    return await db.select().from(contractTemplates).where(eq(contractTemplates.artistId, artistId)).orderBy(desc(contractTemplates.createdAt));
  }

  async getContractTemplate(id: string): Promise<ContractTemplate | undefined> {
    const [template] = await db.select().from(contractTemplates).where(eq(contractTemplates.id, id));
    return template || undefined;
  }

  async createContractTemplate(template: InsertContractTemplate): Promise<ContractTemplate> {
    const [newTemplate] = await db.insert(contractTemplates).values(template as any).returning();
    return newTemplate;
  }

  async updateContractTemplate(id: string, template: Partial<InsertContractTemplate>): Promise<ContractTemplate | undefined> {
    const [updated] = await db
      .update(contractTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(contractTemplates.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteContractTemplate(id: string): Promise<void> {
    await db.delete(contractTemplates).where(eq(contractTemplates.id, id));
  }

  async getDefaultContractTemplate(artistId: string): Promise<ContractTemplate | undefined> {
    const [template] = await db.select().from(contractTemplates)
      .where(and(eq(contractTemplates.artistId, artistId), eq(contractTemplates.isDefault, true)));
    return template || undefined;
  }

  // Payments
  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async getPaymentsByContract(contractId: string): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.contractId, contractId));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  async updatePayment(id: string, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    const [updated] = await db
      .update(payments)
      .set(payment)
      .where(eq(payments.id, id))
      .returning();
    return updated || undefined;
  }

  async getAllPayments(): Promise<Payment[]> {
    return await db.select().from(payments).orderBy(desc(payments.createdAt));
  }

  // Availability
  async getUserAvailability(userId: string, startDate: Date, endDate: Date): Promise<Availability[]> {
    return await db
      .select()
      .from(availability)
      .where(
        and(
          eq(availability.userId, userId),
          gte(availability.date, startDate),
          lte(availability.date, endDate)
        )
      );
  }

  async setAvailability(avail: InsertAvailability): Promise<Availability> {
    // First, try to find existing record for this user and date
    const existingRecords = await db
      .select()
      .from(availability)
      .where(
        and(
          eq(availability.userId, avail.userId),
          eq(availability.date, avail.date)
        )
      );
    
    if (existingRecords.length > 0) {
      // Update existing record
      const [updated] = await db
        .update(availability)
        .set({ isAvailable: avail.isAvailable, notes: avail.notes })
        .where(eq(availability.id, existingRecords[0].id))
        .returning();
      return updated;
    } else {
      // Insert new record
      const [newAvail] = await db.insert(availability).values(avail).returning();
      return newAvail;
    }
  }

  async deleteAvailability(userId: string, date: Date): Promise<void> {
    await db
      .delete(availability)
      .where(
        and(
          eq(availability.userId, userId),
          eq(availability.date, date)
        )
      );
  }

  async getAvailabilityByUser(userId: string): Promise<Availability[]> {
    return await db
      .select()
      .from(availability)
      .where(eq(availability.userId, userId));
  }

  async checkAvailability(userId: string, date: Date): Promise<boolean> {
    const dateOnly = new Date(date.toISOString().split('T')[0]);
    const result = await db
      .select()
      .from(availability)
      .where(
        and(
          eq(availability.userId, userId),
          eq(availability.date, dateOnly)
        )
      );
    // If there's a record and it's marked available, return true
    // If no record exists, they haven't set availability (assume available)
    if (result.length === 0) return true;
    return result[0].isAvailable;
  }

  // Schedules
  async getScheduleByBooking(bookingId: string): Promise<Schedule | undefined> {
    const [schedule] = await db.select().from(schedules).where(eq(schedules.bookingId, bookingId));
    return schedule || undefined;
  }

  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const [newSchedule] = await db.insert(schedules).values(schedule as any).returning();
    return newSchedule;
  }

  async updateSchedule(id: string, schedule: Partial<InsertSchedule>): Promise<Schedule | undefined> {
    const [updated] = await db
      .update(schedules)
      .set(schedule as any)
      .where(eq(schedules.id, id))
      .returning();
    return updated || undefined;
  }

  // Event Day Schedules (smart scheduling grid)
  async getEventDaySchedule(id: string): Promise<EventDaySchedule | undefined> {
    const [schedule] = await db.select().from(eventDaySchedules).where(eq(eventDaySchedules.id, id));
    return schedule || undefined;
  }

  async getEventDaySchedulesByArtist(artistId: string): Promise<EventDaySchedule[]> {
    return await db
      .select()
      .from(eventDaySchedules)
      .where(eq(eventDaySchedules.artistId, artistId))
      .orderBy(desc(eventDaySchedules.eventDate));
  }

  async getEventDayScheduleByShareToken(shareToken: string): Promise<EventDaySchedule | undefined> {
    const [schedule] = await db
      .select()
      .from(eventDaySchedules)
      .where(eq(eventDaySchedules.shareToken, shareToken));
    return schedule || undefined;
  }

  async createEventDaySchedule(schedule: InsertEventDaySchedule): Promise<EventDaySchedule> {
    const [newSchedule] = await db.insert(eventDaySchedules).values(schedule as any).returning();
    return newSchedule;
  }

  async updateEventDaySchedule(id: string, schedule: Partial<InsertEventDaySchedule>): Promise<EventDaySchedule | undefined> {
    const [updated] = await db
      .update(eventDaySchedules)
      .set({ ...schedule, updatedAt: new Date() } as any)
      .where(eq(eventDaySchedules.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteEventDaySchedule(id: string): Promise<void> {
    await db.delete(eventDaySchedules).where(eq(eventDaySchedules.id, id));
  }

  // Schedule Team Members
  async getScheduleTeamMember(id: string): Promise<ScheduleTeamMember | undefined> {
    const [member] = await db.select().from(scheduleTeamMembers).where(eq(scheduleTeamMembers.id, id));
    return member || undefined;
  }

  async getScheduleTeamMembers(scheduleId: string): Promise<ScheduleTeamMember[]> {
    return await db
      .select()
      .from(scheduleTeamMembers)
      .where(eq(scheduleTeamMembers.scheduleId, scheduleId))
      .orderBy(scheduleTeamMembers.displayOrder);
  }

  async createScheduleTeamMember(member: InsertScheduleTeamMember): Promise<ScheduleTeamMember> {
    const [newMember] = await db.insert(scheduleTeamMembers).values(member as any).returning();
    return newMember;
  }

  async updateScheduleTeamMember(id: string, member: Partial<InsertScheduleTeamMember>): Promise<ScheduleTeamMember | undefined> {
    const [updated] = await db
      .update(scheduleTeamMembers)
      .set(member as any)
      .where(eq(scheduleTeamMembers.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteScheduleTeamMember(id: string): Promise<void> {
    await db.delete(scheduleTeamMembers).where(eq(scheduleTeamMembers.id, id));
  }

  // Schedule Appointments
  async getScheduleAppointment(id: string): Promise<ScheduleAppointment | undefined> {
    const [appointment] = await db.select().from(scheduleAppointments).where(eq(scheduleAppointments.id, id));
    return appointment || undefined;
  }

  async getScheduleAppointments(scheduleId: string): Promise<ScheduleAppointment[]> {
    return await db
      .select()
      .from(scheduleAppointments)
      .where(eq(scheduleAppointments.scheduleId, scheduleId))
      .orderBy(scheduleAppointments.startTime, scheduleAppointments.displayOrder);
  }

  async createScheduleAppointment(appointment: InsertScheduleAppointment): Promise<ScheduleAppointment> {
    const [newAppointment] = await db.insert(scheduleAppointments).values(appointment as any).returning();
    return newAppointment;
  }

  async updateScheduleAppointment(id: string, appointment: Partial<InsertScheduleAppointment>): Promise<ScheduleAppointment | undefined> {
    const [updated] = await db
      .update(scheduleAppointments)
      .set(appointment as any)
      .where(eq(scheduleAppointments.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteScheduleAppointment(id: string): Promise<void> {
    await db.delete(scheduleAppointments).where(eq(scheduleAppointments.id, id));
  }

  async bulkCreateScheduleAppointments(appointments: InsertScheduleAppointment[]): Promise<ScheduleAppointment[]> {
    if (appointments.length === 0) return [];
    return await db.insert(scheduleAppointments).values(appointments as any).returning();
  }

  // Schedule Chat Messages (guest chat on public schedule)
  async getScheduleChatMessages(scheduleId: string): Promise<ScheduleChatMessage[]> {
    return await db.select().from(scheduleChatMessages).where(eq(scheduleChatMessages.scheduleId, scheduleId)).orderBy(scheduleChatMessages.createdAt);
  }

  async createScheduleChatMessage(message: InsertScheduleChatMessage): Promise<ScheduleChatMessage> {
    const [created] = await db.insert(scheduleChatMessages).values(message as any).returning();
    return created;
  }

  // Chat Invites
  async getChatInvitesByUser(userId: string): Promise<ChatInvite[]> {
    return await db
      .select()
      .from(chatInvites)
      .where(
        or(
          eq(chatInvites.senderId, userId),
          eq(chatInvites.inviteeUserId, userId)
        )
      );
  }

  async createChatInvite(invite: InsertChatInvite): Promise<ChatInvite> {
    const [newInvite] = await db.insert(chatInvites).values(invite).returning();
    return newInvite;
  }

  async updateChatInvite(id: string, invite: Partial<InsertChatInvite>): Promise<ChatInvite | undefined> {
    const [updated] = await db
      .update(chatInvites)
      .set(invite)
      .where(eq(chatInvites.id, id))
      .returning();
    return updated || undefined;
  }

  async getChatInviteByToken(token: string): Promise<ChatInvite | undefined> {
    const [invite] = await db
      .select()
      .from(chatInvites)
      .where(eq(chatInvites.token, token));
    return invite || undefined;
  }

  async getChatInvite(id: string): Promise<ChatInvite | undefined> {
    const [invite] = await db
      .select()
      .from(chatInvites)
      .where(eq(chatInvites.id, id));
    return invite || undefined;
  }

  // Chat Invite Messages
  async getChatInviteMessages(chatInviteId: string): Promise<ChatInviteMessage[]> {
    return await db
      .select()
      .from(chatInviteMessages)
      .where(eq(chatInviteMessages.chatInviteId, chatInviteId))
      .orderBy(chatInviteMessages.createdAt);
  }

  async createChatInviteMessage(message: InsertChatInviteMessage): Promise<ChatInviteMessage> {
    const [created] = await db.insert(chatInviteMessages).values(message as any).returning();
    return created;
  }

  // Conversations
  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async getConversationsByUser(userId: string): Promise<Array<Conversation & { participants: User[] }>> {
    const participantRecords = await db
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));
    
    const results: Array<Conversation & { participants: User[] }> = [];
    
    for (const record of participantRecords) {
      const [conversation] = await db.select().from(conversations).where(eq(conversations.id, record.conversationId));
      if (conversation) {
        const participants = await this.getConversationParticipants(conversation.id);
        results.push({ ...conversation, participants });
      }
    }
    
    return results;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db.insert(conversations).values(conversation).returning();
    return newConversation;
  }

  async addParticipantToConversation(conversationId: string, userId: string): Promise<ConversationParticipant> {
    const [participant] = await db.insert(conversationParticipants).values({
      conversationId,
      userId
    }).returning();
    return participant;
  }

  async getConversationParticipants(conversationId: string): Promise<User[]> {
    const participants = await db
      .select()
      .from(conversationParticipants)
      .leftJoin(users, eq(conversationParticipants.userId, users.id))
      .where(eq(conversationParticipants.conversationId, conversationId));
    
    return participants.map(p => p.users).filter((u): u is User => u !== null);
  }

  // Contacts
  async getContactsForUser(userId: string): Promise<User[]> {
    const userBookings = await db
      .select()
      .from(bookings)
      .where(
        or(
          eq(bookings.clientId, userId),
          eq(bookings.artistId, userId),
          eq(bookings.plannerId, userId)
        )
      );
    
    const contactIds = new Set<string>();
    for (const booking of userBookings) {
      if (booking.clientId && booking.clientId !== userId) contactIds.add(booking.clientId);
      if (booking.artistId && booking.artistId !== userId) contactIds.add(booking.artistId);
      if (booking.plannerId && booking.plannerId !== userId) contactIds.add(booking.plannerId);
    }
    
    const contacts: User[] = [];
    for (const contactId of Array.from(contactIds)) {
      const user = await this.getUser(contactId);
      if (user) contacts.push(user);
    }
    
    return contacts;
  }

  // Team Members (for business chat)
  async getTeamMembers(ownerId: string): Promise<TeamMember[]> {
    return await db.select().from(teamMembers).where(eq(teamMembers.ownerId, ownerId));
  }

  async getTeamMember(id: string): Promise<TeamMember | undefined> {
    const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return member || undefined;
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [newMember] = await db.insert(teamMembers).values(member).returning();
    return newMember;
  }

  async updateTeamMember(id: string, member: Partial<InsertTeamMember>): Promise<TeamMember | undefined> {
    const [updated] = await db.update(teamMembers).set(member).where(eq(teamMembers.id, id)).returning();
    return updated || undefined;
  }

  async deleteTeamMember(id: string): Promise<void> {
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
  }

  // Business Chat Messages
  async getBusinessChatMessages(conversationId: string): Promise<BusinessChatMessage[]> {
    return await db
      .select()
      .from(businessChatMessages)
      .where(eq(businessChatMessages.conversationId, conversationId))
      .orderBy(businessChatMessages.createdAt);
  }

  async createBusinessChatMessage(message: InsertBusinessChatMessage): Promise<BusinessChatMessage> {
    const [newMessage] = await db.insert(businessChatMessages).values(message as any).returning();
    return newMessage;
  }

  async markBusinessChatMessagesRead(conversationId: string, userId: string): Promise<void> {
    await db
      .update(businessChatMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(businessChatMessages.conversationId, conversationId),
          eq(businessChatMessages.senderId, userId)
        )
      );
  }

  // Business Chat AI Insights (Invisible Labor)
  async createBusinessChatInsight(insight: InsertBusinessChatInsight): Promise<BusinessChatInsight> {
    const [newInsight] = await db.insert(businessChatInsights).values(insight).returning();
    return newInsight;
  }

  async getBusinessChatInsightsByConversation(conversationId: string): Promise<BusinessChatInsight[]> {
    return await db
      .select()
      .from(businessChatInsights)
      .where(eq(businessChatInsights.conversationId, conversationId))
      .orderBy(desc(businessChatInsights.createdAt));
  }

  async getBusinessChatInsightsByUser(userId: string): Promise<BusinessChatInsight[]> {
    return await db
      .select()
      .from(businessChatInsights)
      .where(eq(businessChatInsights.senderId, userId))
      .orderBy(desc(businessChatInsights.createdAt));
  }

  async getInvisibleLaborStats(ownerId: string): Promise<{ totalPivots: number; totalLaborMinutes: number; crisesPrevented: number }> {
    const ownedConversations = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(eq(conversations.ownerId, ownerId));
    
    const conversationIds = ownedConversations.map(c => c.id);
    
    if (conversationIds.length === 0) {
      return { totalPivots: 0, totalLaborMinutes: 0, crisesPrevented: 0 };
    }

    const insights = await db
      .select()
      .from(businessChatInsights)
      .where(sql`${businessChatInsights.conversationId} IN (${sql.raw(conversationIds.map(id => `'${id}'`).join(','))})`);
    
    let totalPivots = 0;
    let totalLaborMinutes = 0;
    let crisesPrevented = 0;

    for (const insight of insights) {
      if (insight.pivotType) totalPivots++;
      if (insight.estimatedLaborMinutes) totalLaborMinutes += insight.estimatedLaborMinutes;
      if (insight.clientImpact === 'saved_disaster' || insight.clientImpact === 'crisis_averted') {
        crisesPrevented++;
      }
    }

    return { totalPivots, totalLaborMinutes, crisesPrevented };
  }

  async getRecentPivots(limit: number = 20): Promise<BusinessChatInsight[]> {
    return await db
      .select()
      .from(businessChatInsights)
      .where(sql`${businessChatInsights.pivotType} IS NOT NULL`)
      .orderBy(desc(businessChatInsights.createdAt))
      .limit(limit);
  }

  // Business Conversations
  async getBusinessConversations(ownerId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.channelType, "business"),
          eq(conversations.ownerId, ownerId)
        )
      )
      .orderBy(desc(conversations.createdAt));
  }

  async createBusinessConversation(title: string, ownerId: string): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values({
        title,
        ownerId,
        channelType: "business",
      })
      .returning();
    return newConversation;
  }

  // Support Cases
  async createSupportCase(supportCase: InsertSupportCase): Promise<SupportCase> {
    const [newCase] = await db.insert(supportCases).values(supportCase).returning();
    return newCase;
  }

  async getSupportCasesByUser(userId: string): Promise<SupportCase[]> {
    return await db.select().from(supportCases).where(eq(supportCases.userId, userId)).orderBy(desc(supportCases.createdAt));
  }

  async getAllSupportCases(): Promise<SupportCase[]> {
    return await db.select().from(supportCases).orderBy(desc(supportCases.createdAt));
  }

  async updateSupportCase(id: string, supportCase: Partial<InsertSupportCase>): Promise<SupportCase | undefined> {
    const [updated] = await db
      .update(supportCases)
      .set({ ...supportCase, updatedAt: new Date() })
      .where(eq(supportCases.id, id))
      .returning();
    return updated || undefined;
  }

  // Invitations
  async createInvitation(invitation: InsertInvitation): Promise<Invitation> {
    const [newInvitation] = await db.insert(invitations).values(invitation).returning();
    return newInvitation;
  }

  async getInvitationByToken(token: string): Promise<Invitation | undefined> {
    const [invitation] = await db.select().from(invitations).where(eq(invitations.token, token));
    return invitation || undefined;
  }

  async getInvitationsByInviter(inviterId: string): Promise<Invitation[]> {
    return await db.select().from(invitations).where(eq(invitations.invitedBy, inviterId)).orderBy(desc(invitations.createdAt));
  }

  async getInvitationsByBooking(bookingId: string): Promise<Invitation[]> {
    return await db.select().from(invitations).where(eq(invitations.bookingId, bookingId));
  }

  async updateInvitation(id: string, invitation: Partial<InsertInvitation>): Promise<Invitation | undefined> {
    const [updated] = await db
      .update(invitations)
      .set(invitation)
      .where(eq(invitations.id, id))
      .returning();
    return updated || undefined;
  }

  async acceptInvitation(token: string, userId: string): Promise<Invitation | undefined> {
    const [updated] = await db
      .update(invitations)
      .set({ 
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedUserId: userId
      })
      .where(eq(invitations.token, token))
      .returning();
    return updated || undefined;
  }

  // CDI
  async createCdiEvent(event: InsertCdiEvent): Promise<CdiEvent> {
    const [newEvent] = await db.insert(cdiEvents).values(event).returning();
    return newEvent;
  }

  async getCdiEventsByUser(userId: string): Promise<CdiEvent[]> {
    return await db.select().from(cdiEvents).where(eq(cdiEvents.userId, userId)).orderBy(desc(cdiEvents.createdAt));
  }

  async createOrUpdateCdiScore(score: InsertCdiScore): Promise<CdiScore> {
    const existing = await this.getCdiScore(score.userId);
    if (existing) {
      const [updated] = await db
        .update(cdiScores)
        .set({ ...score, calculatedAt: new Date() })
        .where(eq(cdiScores.userId, score.userId))
        .returning();
      return updated;
    }
    const [newScore] = await db.insert(cdiScores).values(score).returning();
    return newScore;
  }

  async getCdiScore(userId: string): Promise<CdiScore | undefined> {
    const [score] = await db.select().from(cdiScores).where(eq(cdiScores.userId, userId));
    return score || undefined;
  }

  async getAllCdiScores(): Promise<CdiScore[]> {
    return await db.select().from(cdiScores).orderBy(desc(cdiScores.score));
  }

  // CDI AI (HACO Framework) Implementation
  async createCdiAiInsight(insight: InsertCdiAiInsight): Promise<CdiAiInsight> {
    const [newInsight] = await db.insert(cdiAiInsights).values(insight as any).returning();
    return newInsight;
  }

  async getCdiAiInsightsByUser(userId: string): Promise<CdiAiInsight[]> {
    return await db.select().from(cdiAiInsights)
      .where(eq(cdiAiInsights.userId, userId))
      .orderBy(desc(cdiAiInsights.createdAt));
  }

  async getLatestCdiAiInsight(userId: string): Promise<CdiAiInsight | undefined> {
    const [insight] = await db.select().from(cdiAiInsights)
      .where(eq(cdiAiInsights.userId, userId))
      .orderBy(desc(cdiAiInsights.createdAt))
      .limit(1);
    return insight || undefined;
  }

  async getCdiThresholds(): Promise<CdiThreshold[]> {
    return await db.select().from(cdiThresholds).orderBy(desc(cdiThresholds.createdAt));
  }

  async getActiveCdiThreshold(): Promise<CdiThreshold | undefined> {
    const [threshold] = await db.select().from(cdiThresholds)
      .where(eq(cdiThresholds.isActive, true))
      .limit(1);
    return threshold || undefined;
  }

  async createCdiThreshold(threshold: InsertCdiThreshold): Promise<CdiThreshold> {
    const [newThreshold] = await db.insert(cdiThresholds).values(threshold).returning();
    return newThreshold;
  }

  async updateCdiThreshold(id: string, threshold: Partial<InsertCdiThreshold>): Promise<CdiThreshold | undefined> {
    const [updated] = await db
      .update(cdiThresholds)
      .set({ ...threshold, updatedAt: new Date() })
      .where(eq(cdiThresholds.id, id))
      .returning();
    return updated || undefined;
  }

  async createCdiAdminOverride(override: InsertCdiAdminOverride): Promise<CdiAdminOverride> {
    const [newOverride] = await db.insert(cdiAdminOverrides).values(override).returning();
    return newOverride;
  }

  async getCdiAdminOverrides(): Promise<CdiAdminOverride[]> {
    return await db.select().from(cdiAdminOverrides).orderBy(desc(cdiAdminOverrides.createdAt));
  }

  // CDI Three-Dimension Model Implementation
  async createCdiBehavioralEvent(event: InsertCdiBehavioralEvent): Promise<CdiBehavioralEvent> {
    const [newEvent] = await db.insert(cdiBehavioralEvents).values(event as any).returning();
    return newEvent;
  }

  async getCdiBehavioralEventsByUser(userId: string): Promise<CdiBehavioralEvent[]> {
    return await db.select().from(cdiBehavioralEvents)
      .where(eq(cdiBehavioralEvents.userId, userId))
      .orderBy(desc(cdiBehavioralEvents.createdAt));
  }

  async getCdiBehavioralEventsByBooking(bookingId: string): Promise<CdiBehavioralEvent[]> {
    return await db.select().from(cdiBehavioralEvents)
      .where(eq(cdiBehavioralEvents.bookingId, bookingId))
      .orderBy(desc(cdiBehavioralEvents.createdAt));
  }

  async createCdiDimensionScore(score: InsertCdiDimensionScore): Promise<CdiDimensionScore> {
    const [newScore] = await db.insert(cdiDimensionScores).values(score as any).returning();
    return newScore;
  }

  async getCdiDimensionScoresByUser(userId: string): Promise<CdiDimensionScore[]> {
    return await db.select().from(cdiDimensionScores)
      .where(eq(cdiDimensionScores.userId, userId))
      .orderBy(desc(cdiDimensionScores.calculatedAt));
  }

  async getLatestCdiDimensionScores(userId: string): Promise<CdiDimensionScore[]> {
    const dimensions = ['emotional_fidelity', 'choreography_awareness', 'role_specific_recall'];
    const results: CdiDimensionScore[] = [];
    
    for (const dimension of dimensions) {
      const [score] = await db.select().from(cdiDimensionScores)
        .where(and(
          eq(cdiDimensionScores.userId, userId),
          eq(cdiDimensionScores.dimension, dimension)
        ))
        .orderBy(desc(cdiDimensionScores.calculatedAt))
        .limit(1);
      if (score) results.push(score);
    }
    
    return results;
  }

  async createCdiCompositeScore(score: InsertCdiCompositeScore): Promise<CdiCompositeScore> {
    const [newScore] = await db.insert(cdiCompositeScores).values(score as any).returning();
    return newScore;
  }

  async getCdiCompositeScoresByUser(userId: string): Promise<CdiCompositeScore[]> {
    return await db.select().from(cdiCompositeScores)
      .where(eq(cdiCompositeScores.userId, userId))
      .orderBy(desc(cdiCompositeScores.calculatedAt));
  }

  async getLatestCdiCompositeScore(userId: string): Promise<CdiCompositeScore | undefined> {
    const [score] = await db.select().from(cdiCompositeScores)
      .where(eq(cdiCompositeScores.userId, userId))
      .orderBy(desc(cdiCompositeScores.calculatedAt))
      .limit(1);
    return score || undefined;
  }

  async getAllCdiCompositeScores(): Promise<CdiCompositeScore[]> {
    return await db.select().from(cdiCompositeScores)
      .orderBy(desc(cdiCompositeScores.calculatedAt));
  }

  async createCdiFeedbackEvent(feedback: InsertCdiFeedbackEvent): Promise<CdiFeedbackEvent> {
    const [newFeedback] = await db.insert(cdiFeedbackEvents).values(feedback as any).returning();
    return newFeedback;
  }

  async getUnprocessedCdiFeedbackEvents(): Promise<CdiFeedbackEvent[]> {
    return await db.select().from(cdiFeedbackEvents)
      .where(eq(cdiFeedbackEvents.processed, false))
      .orderBy(desc(cdiFeedbackEvents.createdAt));
  }

  async markCdiFeedbackEventProcessed(id: string): Promise<void> {
    await db.update(cdiFeedbackEvents)
      .set({ processed: true })
      .where(eq(cdiFeedbackEvents.id, id));
  }

  async createCdiLearningRun(run: InsertCdiLearningRun): Promise<CdiLearningRun> {
    const [newRun] = await db.insert(cdiLearningRuns).values(run as any).returning();
    return newRun;
  }

  async completeCdiLearningRun(id: string, results: Partial<InsertCdiLearningRun>): Promise<CdiLearningRun | undefined> {
    const [updated] = await db.update(cdiLearningRuns)
      .set({ ...results, completedAt: new Date() } as any)
      .where(eq(cdiLearningRuns.id, id))
      .returning();
    return updated || undefined;
  }

  async getCdiPatternLibrary(dimension?: string): Promise<CdiPatternLibrary[]> {
    if (dimension) {
      return await db.select().from(cdiPatternLibrary)
        .where(and(
          eq(cdiPatternLibrary.dimension, dimension),
          eq(cdiPatternLibrary.isActive, true)
        ))
        .orderBy(desc(cdiPatternLibrary.successWeight));
    }
    return await db.select().from(cdiPatternLibrary)
      .where(eq(cdiPatternLibrary.isActive, true))
      .orderBy(desc(cdiPatternLibrary.successWeight));
  }

  async createCdiPattern(pattern: InsertCdiPatternLibrary): Promise<CdiPatternLibrary> {
    const [newPattern] = await db.insert(cdiPatternLibrary).values(pattern as any).returning();
    return newPattern;
  }

  async updateCdiPatternStrength(id: string, strengthDelta: number): Promise<CdiPatternLibrary | undefined> {
    const [existing] = await db.select().from(cdiPatternLibrary).where(eq(cdiPatternLibrary.id, id));
    if (!existing) return undefined;
    
    const newStrength = Math.max(0, Math.min(200, existing.successWeight + strengthDelta));
    const [updated] = await db.update(cdiPatternLibrary)
      .set({ 
        successWeight: newStrength,
        sampleSize: existing.sampleSize + 1,
        updatedAt: new Date()
      })
      .where(eq(cdiPatternLibrary.id, id))
      .returning();
    return updated || undefined;
  }

  // Audit Logs - standardized action vocabulary:
  // inquiry_created, first_response, hold_placed, hold_expired, proposal_sent, proposal_viewed,
  // confirm_clicked, booking_created, declined, auto_escalated, reminder_sent
  async createAuditLog(log: { 
    action: string; 
    entityType: string; 
    entityId: string; 
    performedBy: string; 
    actorRole?: 'artist' | 'planner' | 'client' | 'system' | 'admin';
    changes?: Record<string, any>;
    diff?: Record<string, { from: any; to: any }>;
  }): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values({
      userId: log.performedBy !== 'system' ? log.performedBy : null,
      actorRole: log.actorRole || (log.performedBy === 'system' ? 'system' : null),
      action: log.action,
      actionVersion: 1,
      resourceType: log.entityType,
      resourceId: log.entityId,
      metadata: {
        ...log.changes,
        diff: log.diff,
      },
    } as any).returning();
    return newLog;
  }

  // AI Chat Conversations
  async getAiChatConversations(userId: string): Promise<AiChatConversation[]> {
    return await db
      .select()
      .from(aiChatConversations)
      .where(eq(aiChatConversations.userId, userId))
      .orderBy(desc(aiChatConversations.updatedAt));
  }

  async createAiChatConversation(userId: string, title: string = "New Chat"): Promise<AiChatConversation> {
    const [newConversation] = await db.insert(aiChatConversations).values({
      userId,
      title,
    } as any).returning();
    return newConversation;
  }

  async updateAiChatConversationTitle(conversationId: string, title: string): Promise<AiChatConversation | undefined> {
    const [updated] = await db
      .update(aiChatConversations)
      .set({ title, updatedAt: new Date() })
      .where(eq(aiChatConversations.id, conversationId))
      .returning();
    return updated || undefined;
  }

  async deleteAiChatConversation(conversationId: string): Promise<void> {
    await db.delete(aiChatMessages).where(eq(aiChatMessages.conversationId, conversationId));
    await db.delete(aiChatConversations).where(eq(aiChatConversations.id, conversationId));
  }

  // AI Chat Messages
  async getAiChatMessages(userId: string, limit: number = 50): Promise<AiChatMessage[]> {
    const messages = await db
      .select()
      .from(aiChatMessages)
      .where(eq(aiChatMessages.userId, userId))
      .orderBy(desc(aiChatMessages.createdAt))
      .limit(limit);
    return messages.reverse();
  }

  async getAiChatMessagesByConversation(conversationId: string, limit: number = 100): Promise<AiChatMessage[]> {
    const messages = await db
      .select()
      .from(aiChatMessages)
      .where(eq(aiChatMessages.conversationId, conversationId))
      .orderBy(desc(aiChatMessages.createdAt))
      .limit(limit);
    return messages.reverse();
  }

  async createAiChatMessage(message: InsertAiChatMessage): Promise<AiChatMessage> {
    const [newMessage] = await db.insert(aiChatMessages).values(message as any).returning();
    
    // Update conversation's updatedAt timestamp
    if (message.conversationId) {
      await db
        .update(aiChatConversations)
        .set({ updatedAt: new Date() })
        .where(eq(aiChatConversations.id, message.conversationId));
    }
    
    return newMessage;
  }

  async clearAiChatMessages(userId: string): Promise<void> {
    await db.delete(aiChatMessages).where(eq(aiChatMessages.userId, userId));
  }

  async clearAiChatMessagesByConversation(conversationId: string): Promise<void> {
    await db.delete(aiChatMessages).where(eq(aiChatMessages.conversationId, conversationId));
  }
  
  // Messaging security - check if two users have a confirmed booking relationship
  async checkBookingRelationship(user1Id: string, user2Id: string): Promise<boolean> {
    // Check if users are admins (admins can message anyone)
    const [user1, user2] = await Promise.all([
      this.getUser(user1Id),
      this.getUser(user2Id)
    ]);
    
    if (user1?.role === 'admin' || user2?.role === 'admin') {
      return true; // Admins can message anyone
    }
    
    // Check for confirmed bookings where both users are involved
    const userBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          or(
            eq(bookings.status, 'accepted'),
            eq(bookings.status, 'confirmed'),
            eq(bookings.status, 'completed')
          ),
          or(
            // User1 is client, user2 is artist or planner
            and(
              eq(bookings.clientId, user1Id),
              or(eq(bookings.artistId, user2Id), eq(bookings.plannerId, user2Id))
            ),
            // User1 is artist, user2 is client or planner
            and(
              eq(bookings.artistId, user1Id),
              or(eq(bookings.clientId, user2Id), eq(bookings.plannerId, user2Id))
            ),
            // User1 is planner, user2 is client or artist
            and(
              eq(bookings.plannerId, user1Id),
              or(eq(bookings.clientId, user2Id), eq(bookings.artistId, user2Id))
            ),
            // Reverse - User2 is client
            and(
              eq(bookings.clientId, user2Id),
              or(eq(bookings.artistId, user1Id), eq(bookings.plannerId, user1Id))
            ),
            // Reverse - User2 is artist
            and(
              eq(bookings.artistId, user2Id),
              or(eq(bookings.clientId, user1Id), eq(bookings.plannerId, user1Id))
            ),
            // Reverse - User2 is planner
            and(
              eq(bookings.plannerId, user2Id),
              or(eq(bookings.clientId, user1Id), eq(bookings.artistId, user1Id))
            )
          )
        )
      );
    
    return userBookings.length > 0;
  }
  
  // Vendor Verification
  async getPendingVendors(): Promise<Array<User & { profile: ArtistProfile }>> {
    const results = await db
      .select()
      .from(users)
      .leftJoin(artistProfiles, eq(users.id, artistProfiles.userId))
      .where(eq(users.role, 'artist'));
    
    return results
      .filter(r => r.artist_profiles !== null)
      .filter(r => r.artist_profiles!.verificationStatus === 'pending' || r.artist_profiles!.verificationStatus === null)
      .map(r => ({
        ...r.users,
        profile: r.artist_profiles!
      }));
  }
  
  async getAllVendorsWithStatus(): Promise<Array<User & { profile: ArtistProfile }>> {
    const results = await db
      .select()
      .from(users)
      .leftJoin(artistProfiles, eq(users.id, artistProfiles.userId))
      .where(eq(users.role, 'artist'));
    
    return results
      .filter(r => r.artist_profiles !== null)
      .map(r => ({
        ...r.users,
        profile: r.artist_profiles!
      }));
  }
  
  // Profile Reports
  async createProfileReport(report: InsertProfileReport): Promise<{ id: string; reportedUserId: string; reporterId: string; reason: string; description: string | null; status: string | null; createdAt: Date | null }> {
    const [newReport] = await db.insert(profileReports).values(report as any).returning();
    return newReport;
  }
  
  async getAllProfileReports(): Promise<Array<{ id: string; reportedUserId: string; reporterId: string; reason: string; description: string | null; status: string | null; reviewedBy: string | null; reviewedAt: Date | null; actionTaken: string | null; createdAt: Date | null }>> {
    return await db.select().from(profileReports).orderBy(desc(profileReports.createdAt));
  }
  
  async updateProfileReport(id: string, data: Partial<{ status: string; actionTaken: string; reviewedBy: string; reviewedAt: Date }>): Promise<{ id: string } | undefined> {
    const [updated] = await db
      .update(profileReports)
      .set(data as any)
      .where(eq(profileReports.id, id))
      .returning();
    return updated || undefined;
  }
  
  // IQS (Interaction Quality Scoring)
  async createIqsLeadScore(score: InsertIqsLeadScore): Promise<IqsLeadScore> {
    const [newScore] = await db.insert(iqsLeadScores).values(score as any).returning();
    return newScore;
  }
  
  async getIqsLeadScore(id: string): Promise<IqsLeadScore | undefined> {
    const [score] = await db.select().from(iqsLeadScores).where(eq(iqsLeadScores.id, id));
    return score || undefined;
  }
  
  async getIqsLeadScoresByVendor(vendorId: string): Promise<IqsLeadScore[]> {
    return await db
      .select()
      .from(iqsLeadScores)
      .where(eq(iqsLeadScores.vendorId, vendorId))
      .orderBy(desc(iqsLeadScores.updatedAt));
  }
  
  async getIqsLeadScoreByClient(vendorId: string, clientUserId?: string, clientContactId?: string): Promise<IqsLeadScore | undefined> {
    if (clientUserId) {
      const [score] = await db
        .select()
        .from(iqsLeadScores)
        .where(and(eq(iqsLeadScores.vendorId, vendorId), eq(iqsLeadScores.clientUserId, clientUserId)));
      return score || undefined;
    }
    if (clientContactId) {
      const [score] = await db
        .select()
        .from(iqsLeadScores)
        .where(and(eq(iqsLeadScores.vendorId, vendorId), eq(iqsLeadScores.clientContactId, clientContactId)));
      return score || undefined;
    }
    return undefined;
  }
  
  async updateIqsLeadScore(id: string, data: Partial<InsertIqsLeadScore>): Promise<IqsLeadScore | undefined> {
    const [updated] = await db
      .update(iqsLeadScores)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(iqsLeadScores.id, id))
      .returning();
    return updated || undefined;
  }
  
  async createIqsInteractionEvent(event: InsertIqsInteractionEvent): Promise<IqsInteractionEvent> {
    const [newEvent] = await db.insert(iqsInteractionEvents).values(event as any).returning();
    return newEvent;
  }
  
  async getIqsInteractionEvents(leadScoreId: string): Promise<IqsInteractionEvent[]> {
    return await db
      .select()
      .from(iqsInteractionEvents)
      .where(eq(iqsInteractionEvents.leadScoreId, leadScoreId))
      .orderBy(desc(iqsInteractionEvents.occurredAt));
  }
  
  async getRecentIqsInteractionEvents(vendorId: string, limit: number = 50): Promise<IqsInteractionEvent[]> {
    return await db
      .select()
      .from(iqsInteractionEvents)
      .where(eq(iqsInteractionEvents.vendorId, vendorId))
      .orderBy(desc(iqsInteractionEvents.occurredAt))
      .limit(limit);
  }
  
  async getActiveIqsPatterns(): Promise<IqsPattern[]> {
    return await db
      .select()
      .from(iqsPatterns)
      .where(eq(iqsPatterns.isActive, true))
      .orderBy(desc(iqsPatterns.baseSeverity));
  }
  
  async getIqsPattern(id: string): Promise<IqsPattern | undefined> {
    const [pattern] = await db.select().from(iqsPatterns).where(eq(iqsPatterns.id, id));
    return pattern || undefined;
  }
  
  async createIqsPattern(pattern: InsertIqsPattern): Promise<IqsPattern> {
    const [newPattern] = await db.insert(iqsPatterns).values(pattern as any).returning();
    return newPattern;
  }
  
  async updateIqsPattern(id: string, data: Partial<InsertIqsPattern>): Promise<IqsPattern | undefined> {
    const [updated] = await db
      .update(iqsPatterns)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(iqsPatterns.id, id))
      .returning();
    return updated || undefined;
  }
  
  async incrementIqsPatternTrigger(id: string, confirmed: boolean): Promise<void> {
    const pattern = await this.getIqsPattern(id);
    if (!pattern) return;
    
    const updates: Partial<IqsPattern> = {
      timesTriggered: (pattern.timesTriggered || 0) + 1,
      updatedAt: new Date(),
    };
    if (confirmed) {
      updates.timesConfirmedByVendor = (pattern.timesConfirmedByVendor || 0) + 1;
    } else {
      updates.timesRejectedByVendor = (pattern.timesRejectedByVendor || 0) + 1;
    }
    
    await db.update(iqsPatterns).set(updates as any).where(eq(iqsPatterns.id, id));
  }
  
  async createIqsVendorFeedback(feedback: InsertIqsVendorFeedback): Promise<IqsVendorFeedback> {
    const [newFeedback] = await db.insert(iqsVendorFeedback).values(feedback as any).returning();
    return newFeedback;
  }
  
  async getUnprocessedIqsFeedback(): Promise<IqsVendorFeedback[]> {
    return await db
      .select()
      .from(iqsVendorFeedback)
      .where(eq(iqsVendorFeedback.processedForLearning, false))
      .orderBy(iqsVendorFeedback.createdAt);
  }
  
  async markIqsFeedbackProcessed(id: string): Promise<void> {
    await db
      .update(iqsVendorFeedback)
      .set({ processedForLearning: true, processedAt: new Date() })
      .where(eq(iqsVendorFeedback.id, id));
  }
  
  async createIqsLearningRun(run: InsertIqsLearningRun): Promise<IqsLearningRun> {
    const [newRun] = await db.insert(iqsLearningRuns).values(run as any).returning();
    return newRun;
  }
  
  async completeIqsLearningRun(id: string, results: Partial<InsertIqsLearningRun>): Promise<IqsLearningRun | undefined> {
    const [updated] = await db
      .update(iqsLearningRuns)
      .set({ ...results, completedAt: new Date(), status: 'completed' } as any)
      .where(eq(iqsLearningRuns.id, id))
      .returning();
    return updated || undefined;
  }
  
  async getIqsLearningRuns(limit: number = 10): Promise<IqsLearningRun[]> {
    return await db
      .select()
      .from(iqsLearningRuns)
      .orderBy(desc(iqsLearningRuns.startedAt))
      .limit(limit);
  }
  
  // Communication Logs
  async createCommunicationLog(log: InsertCommunicationLog): Promise<CommunicationLog> {
    const [newLog] = await db.insert(communicationLogs).values(log as any).returning();
    return newLog;
  }
  
  async getCommunicationLogsByArtist(artistId: string, limit: number = 50): Promise<CommunicationLog[]> {
    return await db
      .select()
      .from(communicationLogs)
      .where(eq(communicationLogs.artistId, artistId))
      .orderBy(desc(communicationLogs.createdAt))
      .limit(limit);
  }
  
  async getCommunicationLogsByRecipient(artistId: string, recipientEmail: string): Promise<CommunicationLog[]> {
    return await db
      .select()
      .from(communicationLogs)
      .where(and(
        eq(communicationLogs.artistId, artistId),
        eq(communicationLogs.recipientEmail, recipientEmail)
      ))
      .orderBy(desc(communicationLogs.createdAt));
  }
  
  async getCommunicationLog(id: string): Promise<CommunicationLog | undefined> {
    const [log] = await db.select().from(communicationLogs).where(eq(communicationLogs.id, id));
    return log || undefined;
  }
  
  // Scheduled Emails
  async createScheduledEmail(email: InsertScheduledEmail): Promise<ScheduledEmail> {
    const [newEmail] = await db.insert(scheduledEmails).values(email as any).returning();
    return newEmail;
  }
  
  async getScheduledEmail(id: string): Promise<ScheduledEmail | undefined> {
    const [email] = await db.select().from(scheduledEmails).where(eq(scheduledEmails.id, id));
    return email || undefined;
  }
  
  async getScheduledEmailsByArtist(artistId: string): Promise<ScheduledEmail[]> {
    return await db
      .select()
      .from(scheduledEmails)
      .where(eq(scheduledEmails.artistId, artistId))
      .orderBy(desc(scheduledEmails.scheduledFor));
  }
  
  async getPendingScheduledEmails(): Promise<ScheduledEmail[]> {
    const now = new Date();
    return await db
      .select()
      .from(scheduledEmails)
      .where(and(
        eq(scheduledEmails.status, 'pending'),
        sql`${scheduledEmails.scheduledFor} <= ${now}`
      ))
      .orderBy(scheduledEmails.scheduledFor);
  }
  
  async updateScheduledEmail(id: string, data: Partial<InsertScheduledEmail>): Promise<ScheduledEmail | undefined> {
    const [updated] = await db
      .update(scheduledEmails)
      .set(data as any)
      .where(eq(scheduledEmails.id, id))
      .returning();
    return updated || undefined;
  }
  
  async markScheduledEmailSent(id: string): Promise<ScheduledEmail | undefined> {
    const [updated] = await db
      .update(scheduledEmails)
      .set({ status: 'sent', sentAt: new Date() })
      .where(eq(scheduledEmails.id, id))
      .returning();
    return updated || undefined;
  }
  
  async markScheduledEmailFailed(id: string, errorMessage: string): Promise<ScheduledEmail | undefined> {
    const [updated] = await db
      .update(scheduledEmails)
      .set({ status: 'failed', errorMessage })
      .where(eq(scheduledEmails.id, id))
      .returning();
    return updated || undefined;
  }
  
  async cancelScheduledEmail(id: string): Promise<ScheduledEmail | undefined> {
    const [updated] = await db
      .update(scheduledEmails)
      .set({ status: 'cancelled' })
      .where(eq(scheduledEmails.id, id))
      .returning();
    return updated || undefined;
  }
  
  // Inquiries
  async createInquiry(data: InsertInquiry): Promise<Inquiry> {
    const [inquiry] = await db.insert(inquiries).values(data as any).returning();
    return inquiry;
  }
  
  async getInquiry(id: string): Promise<Inquiry | undefined> {
    const [inquiry] = await db.select().from(inquiries).where(eq(inquiries.id, id));
    return inquiry || undefined;
  }
  
  async getInquiryByThreadToken(threadToken: string): Promise<Inquiry | undefined> {
    const [inquiry] = await db.select().from(inquiries).where(eq(inquiries.threadToken, threadToken));
    return inquiry || undefined;
  }
  
  async getInquiriesByVendor(vendorId: string): Promise<Inquiry[]> {
    return await db
      .select()
      .from(inquiries)
      .where(eq(inquiries.vendorId, vendorId))
      .orderBy(desc(inquiries.createdAt));
  }
  
  async getInquiriesByClient(clientEmail: string): Promise<Inquiry[]> {
    return await db
      .select()
      .from(inquiries)
      .where(eq(inquiries.clientEmail, clientEmail))
      .orderBy(desc(inquiries.createdAt));
  }
  
  async updateInquiry(id: string, data: Partial<InsertInquiry>): Promise<Inquiry | undefined> {
    const [updated] = await db
      .update(inquiries)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(inquiries.id, id))
      .returning();
    return updated || undefined;
  }
  
  async deleteInquiry(id: string): Promise<void> {
    await db.delete(inquiryNotifications).where(eq(inquiryNotifications.inquiryId, id));
    await db.delete(inquiries).where(eq(inquiries.id, id));
  }
  
  async getExpiredHolds(now: Date): Promise<Inquiry[]> {
    return await db
      .select()
      .from(inquiries)
      .where(
        and(
          eq(inquiries.status, 'hold'),
          or(
            sql`${inquiries.holdExpiresAt} <= ${now}`,
            sql`(${inquiries.hold}->>'expiresAt')::timestamp <= ${now}`
          )
        )
      );
  }
  
  async getActiveInquiries(): Promise<Inquiry[]> {
    return await db
      .select()
      .from(inquiries)
      .where(
        inArray(inquiries.status, ['pending', 'responded', 'hold', 'confirmed'])
      )
      .orderBy(desc(inquiries.updatedAt));
  }
  
  // Inquiry Notifications
  async createInquiryNotification(data: InsertInquiryNotification): Promise<InquiryNotification> {
    const [notification] = await db.insert(inquiryNotifications).values(data as any).returning();
    return notification;
  }
  
  async getInquiryNotifications(inquiryId: string): Promise<InquiryNotification[]> {
    return await db
      .select()
      .from(inquiryNotifications)
      .where(eq(inquiryNotifications.inquiryId, inquiryId))
      .orderBy(desc(inquiryNotifications.createdAt));
  }
  
  // Analytics Events
  async createAnalyticsEvent(data: InsertAnalyticsEvent): Promise<AnalyticsEvent> {
    const [event] = await db.insert(analyticsEvents).values(data as any).returning();
    return event;
  }
  
  async getAnalyticsEvents(eventType?: string, sinceDate?: Date): Promise<AnalyticsEvent[]> {
    let query = db.select().from(analyticsEvents);
    const conditions: any[] = [];
    
    if (eventType) {
      conditions.push(eq(analyticsEvents.eventType, eventType));
    }
    if (sinceDate) {
      conditions.push(sql`${analyticsEvents.createdAt} >= ${sinceDate}`);
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(analyticsEvents.createdAt));
  }
  
  async getAnalyticsMetrics24h(): Promise<{
    calendarsCreated: number;
    chatsStarted: number;
    artistActivationRate: number;
    chatsPerCalendar: number;
  }> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const calendars = await db
      .select({ count: sql<number>`count(*)` })
      .from(analyticsEvents)
      .where(and(
        eq(analyticsEvents.eventType, 'calendar_created'),
        sql`${analyticsEvents.createdAt} >= ${since}`
      ));
    
    const chats = await db
      .select({ count: sql<number>`count(*)` })
      .from(analyticsEvents)
      .where(and(
        eq(analyticsEvents.eventType, 'chat_started'),
        sql`${analyticsEvents.createdAt} >= ${since}`
      ));
    
    const activations = await db
      .select({ count: sql<number>`count(*)` })
      .from(analyticsEvents)
      .where(and(
        eq(analyticsEvents.eventType, 'artist_signup_from_chat'),
        sql`${analyticsEvents.createdAt} >= ${since}`
      ));
    
    const calendarsCreated = Number(calendars[0]?.count || 0);
    const chatsStarted = Number(chats[0]?.count || 0);
    const artistSignups = Number(activations[0]?.count || 0);
    
    return {
      calendarsCreated,
      chatsStarted,
      artistActivationRate: chatsStarted > 0 ? Math.round((artistSignups / chatsStarted) * 100) : 0,
      chatsPerCalendar: calendarsCreated > 0 ? chatsStarted / calendarsCreated : 0
    };
  }
  
  // Artist Profile by Slug
  async getArtistProfileBySlug(slug: string): Promise<ArtistProfile | undefined> {
    const [profile] = await db
      .select()
      .from(artistProfiles)
      .where(eq(artistProfiles.artistSlug, slug));
    return profile || undefined;
  }
  
  // Artist Profile by Edit Token
  async getArtistProfileByEditToken(token: string): Promise<ArtistProfile | undefined> {
    const [profile] = await db
      .select()
      .from(artistProfiles)
      .where(eq(artistProfiles.editToken, token));
    return profile || undefined;
  }
  
  // Leaderboard
  async getArtistLeaderboard(): Promise<Array<{
    rank: number;
    artistName: string;
    instagramHandle?: string;
    artistSlug: string;
    badge: 'quick_responder' | null;
    avgResponseMinutes: number;
    totalChats: number;
    responseRate: number;
  }>> {
    const profiles = await db
      .select()
      .from(artistProfiles)
      .where(sql`${artistProfiles.totalChatsAnswered} > 0`)
      .orderBy(artistProfiles.avgResponseTimeMinutes)
      .limit(10);
    
    const result = [];
    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];
      const user = await this.getUser(profile.userId);
      result.push({
        rank: i + 1,
        artistName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || profile.businessName || 'Artist',
        instagramHandle: profile.instagramHandle || undefined,
        artistSlug: profile.artistSlug || profile.id,
        badge: profile.responsiveBadge ? 'quick_responder' as const : null,
        avgResponseMinutes: profile.avgResponseTimeMinutes || 0,
        totalChats: profile.totalChatsAnswered || 0,
        responseRate: profile.responseRate || 0
      });
    }
    
    return result;
  }
  
  // Update artist response metrics
  async updateArtistResponseMetrics(userId: string, responseTimeMinutes: number): Promise<void> {
    const profile = await this.getArtistProfile(userId);
    if (!profile) return;
    
    const currentTotal = profile.totalChatsAnswered || 0;
    const currentAvg = profile.avgResponseTimeMinutes || 0;
    
    const newTotal = currentTotal + 1;
    const newAvg = (currentAvg * currentTotal + responseTimeMinutes) / newTotal;
    
    const responsiveBadge = newAvg < 10 && newTotal >= 3;
    
    await db
      .update(artistProfiles)
      .set({
        totalChatsAnswered: newTotal,
        avgResponseTimeMinutes: Math.round(newAvg),
        responsiveBadge,
        responseRate: 100,
        lastChatResponseAt: new Date()
      })
      .where(eq(artistProfiles.userId, userId));
  }
  
  // Proposals
  async createProposal(data: InsertProposal): Promise<Proposal> {
    const [proposal] = await db.insert(proposals).values(data as any).returning();
    return proposal;
  }
  
  async getProposal(id: string): Promise<Proposal | undefined> {
    const [proposal] = await db.select().from(proposals).where(eq(proposals.id, id));
    return proposal || undefined;
  }
  
  async getProposalsByArtist(artistId: string): Promise<Proposal[]> {
    return db.select().from(proposals).where(eq(proposals.artistId, artistId)).orderBy(desc(proposals.createdAt));
  }
  
  async updateProposal(id: string, data: Partial<InsertProposal>): Promise<Proposal | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };
    const [proposal] = await db.update(proposals).set(updateData).where(eq(proposals.id, id)).returning();
    return proposal || undefined;
  }
  
  async deleteProposal(id: string): Promise<void> {
    await db.delete(proposals).where(eq(proposals.id, id));
  }
  
  // Vendor Metrics (Proving Ground) - compute from inquiries and audit logs
  async getVendorMetrics(vendorId: string, sinceDays: number = 14): Promise<{
    vendorId: string;
    avgTimeToFirstResponseMinutes: number | null;
    terminalStateUnder24hPercent: number;
    holdExpiryRate: number;
    confirmSuccessCount: number;
    confirmFailedCount: number;
    totalInquiries: number;
  }> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - sinceDays);
    
    // Get all inquiries for this vendor in the time period
    const vendorInquiries = await db
      .select()
      .from(inquiries)
      .where(
        and(
          eq(inquiries.vendorId, vendorId),
          gte(inquiries.createdAt, sinceDate)
        )
      );
    
    const totalInquiries = vendorInquiries.length;
    if (totalInquiries === 0) {
      return {
        vendorId,
        avgTimeToFirstResponseMinutes: null,
        terminalStateUnder24hPercent: 0,
        holdExpiryRate: 0,
        confirmSuccessCount: 0,
        confirmFailedCount: 0,
        totalInquiries: 0,
      };
    }
    
    // Compute avg time to first response
    const inquiriesWithResponse = vendorInquiries.filter(i => i.firstResponseAt);
    const avgTimeToFirstResponseMinutes = inquiriesWithResponse.length > 0
      ? Math.round(
          inquiriesWithResponse.reduce((sum, i) => {
            const diffMs = new Date(i.firstResponseAt!).getTime() - new Date(i.createdAt).getTime();
            return sum + diffMs / (1000 * 60);
          }, 0) / inquiriesWithResponse.length
        )
      : null;
    
    // Compute terminal state under 24h %
    const terminalStates = ['confirmed', 'declined', 'completed'];
    const terminalInquiries = vendorInquiries.filter(i => {
      if (!terminalStates.includes(i.status)) return false;
      const lastAction = i.lastActionAt || i.updatedAt || i.createdAt;
      const diffMs = new Date(lastAction).getTime() - new Date(i.createdAt).getTime();
      return diffMs < 24 * 60 * 60 * 1000; // Under 24 hours
    });
    const terminalStateUnder24hPercent = Math.round((terminalInquiries.length / totalInquiries) * 100);
    
    // Compute hold expiry rate (from statusReason)
    const holdExpiredInquiries = vendorInquiries.filter(i => i.statusReason === 'hold_expired');
    const holdInquiries = vendorInquiries.filter(i => i.status === 'hold' || i.statusReason === 'hold_expired');
    const holdExpiryRate = holdInquiries.length > 0
      ? Math.round((holdExpiredInquiries.length / holdInquiries.length) * 100)
      : 0;
    
    // Get confirm success/failed from audit logs
    const confirmLogs = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.resourceType, 'inquiry'),
          inArray(auditLogs.action, ['confirm_clicked', 'confirm_failed']),
          gte(auditLogs.createdAt, sinceDate)
        )
      );
    
    // Filter to this vendor's inquiries
    const vendorInquiryIds = new Set(vendorInquiries.map(i => i.id));
    const vendorConfirmLogs = confirmLogs.filter(l => l.resourceId && vendorInquiryIds.has(l.resourceId));
    
    const confirmSuccessCount = vendorConfirmLogs.filter(l => l.action === 'confirm_clicked').length;
    const confirmFailedCount = vendorConfirmLogs.filter(l => l.action === 'confirm_failed').length;
    
    return {
      vendorId,
      avgTimeToFirstResponseMinutes,
      terminalStateUnder24hPercent,
      holdExpiryRate,
      confirmSuccessCount,
      confirmFailedCount,
      totalInquiries,
    };
  }
  
  async getTopVendorMetrics(limit: number = 10, sinceDays: number = 14): Promise<Array<{
    vendorId: string;
    vendorName: string;
    avgTimeToFirstResponseMinutes: number | null;
    terminalStateUnder24hPercent: number;
    holdExpiryRate: number;
    confirmSuccessCount: number;
    confirmFailedCount: number;
    totalInquiries: number;
  }>> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - sinceDays);
    
    // Get vendors with inquiries in the time period
    const vendorInquiryCounts = await db
      .select({
        vendorId: inquiries.vendorId,
        count: sql<number>`count(*)::int`,
      })
      .from(inquiries)
      .where(gte(inquiries.createdAt, sinceDate))
      .groupBy(inquiries.vendorId)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);
    
    const results = [];
    for (const { vendorId } of vendorInquiryCounts) {
      const metrics = await this.getVendorMetrics(vendorId, sinceDays);
      const vendor = await this.getUser(vendorId);
      const profile = await this.getArtistProfile(vendorId);
      
      results.push({
        ...metrics,
        vendorName: profile?.businessName || `${vendor?.firstName || ''} ${vendor?.lastName || ''}`.trim() || 'Unknown',
      });
    }
    
    return results;
  }
  
  async createWaitlistSignup(data: { email: string; source?: string; eventDate?: Date; location?: string; servicesNeeded?: string[]; inspirationImages?: string[]; notes?: string }): Promise<WaitlistSignup> {
    const [signup] = await db
      .insert(waitlistSignups)
      .values({
        email: data.email,
        source: data.source || null,
        eventDate: data.eventDate || null,
        location: data.location || null,
        servicesNeeded: data.servicesNeeded || null,
        inspirationImages: data.inspirationImages || null,
        notes: data.notes || null,
      })
      .returning();
    return signup;
  }
  
  async upsertWaitlistSignup(data: { email: string; source?: string; eventDate?: Date; location?: string; servicesNeeded?: string[]; inspirationImages?: string[]; notes?: string }): Promise<WaitlistSignup> {
    const [signup] = await db
      .insert(waitlistSignups)
      .values({
        email: data.email,
        source: data.source || null,
        eventDate: data.eventDate || null,
        location: data.location || null,
        servicesNeeded: data.servicesNeeded || null,
        inspirationImages: data.inspirationImages || null,
        notes: data.notes || null,
      })
      .onConflictDoUpdate({
        target: waitlistSignups.email,
        set: {
          source: data.source || null,
          eventDate: data.eventDate || null,
          location: data.location || null,
          servicesNeeded: data.servicesNeeded || null,
          inspirationImages: data.inspirationImages || null,
          notes: data.notes || null,
        },
      })
      .returning();
    return signup;
  }
  
  async getAllWaitlistSignups(): Promise<WaitlistSignup[]> {
    return await db.select().from(waitlistSignups).orderBy(desc(waitlistSignups.createdAt));
  }
  
  // Private Coordination Threads
  async createThread(data: Omit<InsertThread, 'id'>): Promise<Thread> {
    const [thread] = await db
      .insert(threads)
      .values(data as InsertThread)
      .returning();
    return thread;
  }
  
  async getThreadByToken(token: string): Promise<Thread | undefined> {
    const [thread] = await db
      .select()
      .from(threads)
      .where(eq(threads.threadPublicToken, token));
    return thread;
  }
  
  async getThreadsByArtist(artistProfileId: string): Promise<Thread[]> {
    return await db
      .select()
      .from(threads)
      .where(eq(threads.artistProfileId, artistProfileId))
      .orderBy(desc(threads.createdAt));
  }
  
  async updateThread(id: string, data: Partial<InsertThread>): Promise<Thread | undefined> {
    const [thread] = await db
      .update(threads)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(threads.id, id))
      .returning();
    return thread;
  }
  
  async createThreadMessage(data: { threadId: string; actorType: string; body: string }): Promise<ThreadMessage> {
    const [message] = await db
      .insert(threadMessages)
      .values({
        threadId: data.threadId,
        actorType: data.actorType,
        body: data.body,
      })
      .returning();
    return message;
  }
  
  async getThreadMessages(threadId: string): Promise<ThreadMessage[]> {
    return await db
      .select()
      .from(threadMessages)
      .where(eq(threadMessages.threadId, threadId))
      .orderBy(threadMessages.createdAt);
  }
  
  async createThreadReferral(data: InsertThreadReferral): Promise<ThreadReferral> {
    const [referral] = await db
      .insert(threadReferrals)
      .values(data)
      .returning();
    return referral;
  }
  
  async getThreadReferrals(threadId: string): Promise<ThreadReferral[]> {
    return await db
      .select()
      .from(threadReferrals)
      .where(eq(threadReferrals.threadId, threadId));
  }
  
  async getArtistProfileById(id: string): Promise<ArtistProfile | undefined> {
    const [profile] = await db
      .select()
      .from(artistProfiles)
      .where(eq(artistProfiles.id, id));
    return profile;
  }
  
  async getArtistProfileBySlug(slug: string): Promise<ArtistProfile | undefined> {
    const [profile] = await db
      .select()
      .from(artistProfiles)
      .where(eq(artistProfiles.artistSlug, slug));
    return profile;
  }
  
  // Artist Form Configs
  async getArtistFormConfig(artistId: string): Promise<ArtistFormConfig | undefined> {
    const [config] = await db
      .select()
      .from(artistFormConfigs)
      .where(eq(artistFormConfigs.artistId, artistId));
    return config;
  }
  
  async upsertArtistFormConfig(artistId: string, config: FormConfig): Promise<ArtistFormConfig> {
    const existing = await this.getArtistFormConfig(artistId);
    if (existing) {
      const [updated] = await db
        .update(artistFormConfigs)
        .set({ config, updatedAt: new Date() })
        .where(eq(artistFormConfigs.artistId, artistId))
        .returning();
      return updated;
    }
    const [created] = await db
      .insert(artistFormConfigs)
      .values({ artistId, config })
      .returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
