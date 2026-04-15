export interface ArtistColumn {
  name: string;
  type: string;
  duration: number;
  slots: string[];
  isLead?: boolean;
}

export interface GridCell {
  timeRange: string;
  clientName: string;
  service?: string;
  photoUrl?: string;
}

export interface ServiceItem {
  clientType: string;
  service: string;
  qty: number;
  price: number;
}

export interface ThreadMessageUI {
  id: string;
  type: string;
  content: string;
  sentAt: string;
  sentBy: string;
}

export interface Vendor {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profile: {
    businessName?: string | null;
    bio?: string | null;
    location?: string | null;
    specialties?: string[] | null;
    portfolioUrls?: string[] | null;
    priceRange?: string | null;
    instagramHandle?: string | null;
    websiteUrl?: string | null;
    logoUrl?: string | null;
  };
}

export interface ArtistPublicProfile {
  id: string;
  userId: string;
  businessName: string;
  artistSlug?: string;
  squareAccessToken?: boolean;
  contractTemplate?: boolean;
  prettyLinks?: Record<string, string>;
  onboardingCompleted?: boolean;
  infoSheetContent?: string;
  infoSheetPdfUrl?: string;
  infoSheetType?: string;
  pricingInfo?: string;
  politeDeclineTemplate?: string;
  referralListTemplate?: string;
}

export interface BookingUI {
  id: string;
  clientId: string | null;
  clientName?: string;
  clientEmail?: string;
  artistId: string | null;
  plannerId?: string | null;
  status: string;
  eventDate: string | Date;
  location: string;
  serviceType: string;
  notes?: string | null;
  amount?: number | null;
  paymentStatus?: string | null;
}

export interface InquiryUI {
  id: string;
  threadToken: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  eventDate: string | Date;
  eventType?: string | null;
  eventLocation?: string | null;
  message?: string | null;
  status: string;
  createdAt?: string | Date;
  depositPaidAt?: string | null;
}

export interface NetworkContactUI {
  id: string;
  name: string;
  businessName?: string;
  email: string;
  phone?: string;
  instagram?: string;
  specialty: string;
  isFavorite?: boolean;
  timesWorkedTogether?: number;
  lastWorkedDate?: string;
  notes?: string;
  profileImageUrl?: string;
  isOnPlatform: boolean;
  _fitScore?: number;
  acceptedUserId?: string;
}

export interface AIChatMessageUI {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: { type: string; url: string; name: string }[];
  timestamp: Date | string;
  showCalendar?: boolean;
  calendarPrompt?: string;
}

export interface BusinessChatMessageUI {
  id: string;
  senderId: string;
  content: string;
  messageType: string;
  createdAt: string | Date;
  senderName?: string;
}

export interface InquiryFormUI {
  clientName: string;
  clientEmail: string;
  eventDate: Date | null;
  message: string;
}

export interface InquiryFormDetailedUI {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  eventDate: string;
  eventType: string;
  serviceType: string;
  partySize: string;
  message: string;
  budget: string;
}

export interface ClientChatUI {
  id: string;
  inviteeEmail: string;
  clientName: string;
  status: string;
  eventDate: string | null;
  createdAt: string | Date;
}

export interface ChatMessageUI {
  id: string;
  chatInviteId: string;
  senderType: string;
  senderName: string;
  content: string;
  createdAt: string | Date;
}

export interface ClientDashboardChatMessage {
  from: string;
  text: string;
  senderName?: string;
}

export interface ContactUI {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export interface ViewedVendor {
  id: string;
  name: string;
  service: string;
  rating: number;
}

export interface ChecklistItemUI {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;
}

export interface DayOfReadinessBookingUI {
  id: string;
  clientName: string;
  eventDate: string;
  eventLocation?: string;
  arrivalTime?: string;
  onSiteContact?: string;
  onSiteContactPhone?: string;
  notes?: string;
  serviceType?: string;
}

export interface DirectChatUI {
  id: string;
  artistId: string;
  participantName: string;
  participantEmail: string;
  participantRole?: string;
  subject?: string;
  threadToken?: string;
  createdAt: string | Date;
}

export interface InvoiceUI {
  id: string;
  invoiceNumber?: string;
  title: string;
  status: string;
  createdAt: string | Date;
  dueDate?: string | Date;
  publicUrl?: string;
  clientEmail?: string;
  amount: number;
}

export interface PaymentUI {
  id: string;
  status: string;
  createdAt: string | Date;
  receiptUrl?: string;
  cardBrand?: string;
  last4?: string;
  amount: number;
  tip: number;
  processingFee: number;
}

export interface DirectChatMessageUI {
  id: string;
  directChatId: string;
  senderType: string;
  senderName: string;
  content: string;
  createdAt: string | Date;
}

export interface PendingProposalUI {
  clientName: string;
  clientEmail?: string | null;
  packageDetails: string;
  totalAmount: number;
  depositAmount?: number;
  bookingId?: string | null;
  eventDate?: string | null;
  location?: string | null;
}

declare global {
  namespace Express {
    interface User {
      id?: string;
      claims?: {
        sub: string;
        email?: string;
        [key: string]: any;
      };
      expires_at?: number;
      refresh_token?: string;
      access_token?: string;
    }
  }
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
    intendedRole?: string;
    artistId?: string;
  }
}
