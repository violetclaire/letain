import { Link } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Folder, ArrowLeft, Calendar, Clock, FileText, DollarSign, Image as ImageIcon, Check, X, AlertCircle, Plus, Search, CreditCard, Send, Instagram, Globe, MessageCircle, MessageSquare, UserPlus, LogOut, Upload, Settings, User, Wallet, BookUser, Info, ChevronDown, ChevronUp, Camera, Paperclip, Mic, Loader2, Eye, ShieldAlert, ThumbsUp, ThumbsDown, Flag, Mail, XCircle, Copy, RefreshCw } from "lucide-react";
import VoiceDictation from "../components/VoiceDictation";
import AvailabilityCalendar from "../components/AvailabilityCalendar";
import AIChatPanel from "../components/AIChatPanel";
import BusinessChatPanel from "../components/BusinessChatPanel";
import ComposeEmailModal from "../components/ComposeEmailModal";
import DeclineReferralModal from "../components/DeclineReferralModal";
import { useDashboard } from "@/hooks/useDashboard";
import Uppy from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";
import DOMPurify from "dompurify";

export default function ArtistDashboard() {
  const { user, authLoading, isAuthenticated, toast, queryClient, setLocation, isDateInquiry } = useDashboard("artist");
  
  const [view, setView] = useState<"overview" | "folder">("overview");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [showMobileInfo, setShowMobileInfo] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const [thankYouMessage, setThankYouMessage] = useState("");
  const [thankYouRecipient, setThankYouRecipient] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteClientName, setInviteClientName] = useState("");
  const [showComposeEmail, setShowComposeEmail] = useState(false);
  const [selectedContact, setSelectedContact] = useState<string>("Client");
  const [loading, setLoading] = useState(true);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [showManageSection, setShowManageSection] = useState(false);
  
  // Create Booking Modal state
  const [showCreateBooking, setShowCreateBooking] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    eventDate: "",
    eventLocation: "",
    serviceType: "Bridal Beauty",
    amount: "",
    notes: "",
  });
  const [creatingBooking, setCreatingBooking] = useState(false);
  
  // Invoice Modal state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceBookingId, setInvoiceBookingId] = useState<string | null>(null);
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceDescription, setInvoiceDescription] = useState("");
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [invoiceLink, setInvoiceLink] = useState<string | null>(null);
  const [sendingInvoiceEmail, setSendingInvoiceEmail] = useState(false);
  const [sendingInvoiceSms, setSendingInvoiceSms] = useState(false);
  const [invoiceScheduleMode, setInvoiceScheduleMode] = useState<"now" | "schedule">("now");
  const [invoiceScheduleDate, setInvoiceScheduleDate] = useState("");
  const [invoiceScheduleTime, setInvoiceScheduleTime] = useState("09:00");
  const [schedulingInvoice, setSchedulingInvoice] = useState(false);
  
  // Square Connect state
  const [squareStatus, setSquareStatus] = useState<{
    connected: boolean;
    paymentsEnabled: boolean;
    merchantId?: string;
  } | null>(null);
  const [squareLoading, setSquareLoading] = useState(false);
  
  // Portfolio state
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>([]);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const portfolioInputRef = useRef<HTMLInputElement>(null);
  
  // IQS (Interaction Quality Scoring) state
  const [iqsWarnings, setIqsWarnings] = useState<Array<{
    leadScore: {
      id: string;
      score: number;
      riskLevel: string;
      aiSummary?: string;
      vendorRating?: string;
      clientUserId?: string;
      clientContactId?: string;
    };
    topRedFlags: Array<{
      type: string;
      severity: number;
      description: string;
      aiConfidence: number;
    }>;
    recentEvents: any[];
  }>>([]);
  const [iqsLoading, setIqsLoading] = useState(false);
  const [showIqsPanel, setShowIqsPanel] = useState(true);
  const [submittingFeedback, setSubmittingFeedback] = useState<string | null>(null);
  
  // Activity feed state
  const [activityFeed, setActivityFeed] = useState<Array<{
    id: string;
    action: string;
    description: string;
    resourceType: string;
    resourceId?: string;
    emailSent: boolean;
    createdAt: string;
    metadata?: Record<string, any>;
  }>>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState(false);
  
  // Inquiry inbox state
  const [inquiries, setInquiries] = useState<Array<{
    id: string;
    clientName: string;
    clientEmail: string;
    clientPhone?: string;
    eventDate: string;
    eventType?: string;
    serviceType: string;
    partySize?: number;
    message?: string;
    budget?: number;
    status: string;
    createdAt: string;
    // New hold struct (source of truth)
    hold?: {
      placedAt: string | null;
      expiresAt: string | null;
      ownerId: string | null;
      reason: string | null;
    };
    // Legacy hold fields (backward compatibility)
    holdPlacedAt?: string;
    holdExpiresAt?: string;
    holdReason?: string;
    // Ownership tracking
    ownerId?: string;
    ownerName?: string;
    firstResponseAt?: string;
    proposedDates?: string[];
    escalationState?: string;
    // SLA countdown fields (Stanley Tang schema sprint)
    nextAction?: string;
    nextActionDueAt?: string;
    breachFlags?: string[];
    statusReason?: string;
  }>>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const [respondingInquiry, setRespondingInquiry] = useState<string | null>(null);
  const [sendingChatInvite, setSendingChatInvite] = useState<string | null>(null);
  const [decliningInquiry, setDecliningInquiry] = useState<string | null>(null);
  const [expandedInquiry, setExpandedInquiry] = useState<string | null>(null);
  const [confirmingInquiry, setConfirmingInquiry] = useState<string | null>(null);
  const [holdingInquiry, setHoldingInquiry] = useState<string | null>(null);
  const [proposingDates, setProposingDates] = useState<string | null>(null);
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [proposeInquiryId, setProposeInquiryId] = useState<string | null>(null);
  const [proposedDateInputs, setProposedDateInputs] = useState<string[]>(['']);
  const [showDeclineReferralModal, setShowDeclineReferralModal] = useState(false);
  const [declineReferralInquiry, setDeclineReferralInquiry] = useState<{
    id: string;
    clientName: string;
    clientEmail: string;
    eventDate: string;
    eventType?: string;
    serviceType: string;
  } | null>(null);
  const [showTimelineId, setShowTimelineId] = useState<string | null>(null);
  const [timelineData, setTimelineData] = useState<{
    receivedAt?: string;
    firstResponseAt?: string;
    lastActionAt?: string;
    nextSlaDue?: string;
    slaBreached?: boolean;
    holdExpiresAt?: string;
    ownerId?: string;
    ownerName?: string;
    events: Array<{
      id: string;
      action: string;
      performedBy?: string;
      actorRole?: string;
      changes?: any;
      createdAt: string;
    }>;
  } | null>(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  
  // Quick Reply state
  const [showQuickReplyModal, setShowQuickReplyModal] = useState(false);
  const [quickReplyInquiry, setQuickReplyInquiry] = useState<{
    id: string;
    clientName: string;
    clientEmail: string;
  } | null>(null);
  const [quickReplyMessage, setQuickReplyMessage] = useState("");
  const [sendingQuickReply, setSendingQuickReply] = useState(false);
  
  // Appointment email state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingAppointmentConfirmation, setSendingAppointmentConfirmation] = useState(false);
  
  // E-Signature state (OpenSign)
  const [sendingForSigning, setSendingForSigning] = useState(false);
  const [contractSigningUrl, setContractSigningUrl] = useState<string | null>(null);
  
  // Booking contracts state
  const [bookingContracts, setBookingContracts] = useState<Array<{
    id: string;
    bookingId: string;
    fileUrl?: string;
    status: string;
    packageDetails?: string;
    totalAmount?: number;
    createdAt: string;
    signingToken?: string;
    signedAt?: string;
    signedByName?: string;
    clientEmail?: string;
    clientName?: string;
  }>>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [uploadingContract, setUploadingContract] = useState(false);
  const [sendingContractForSignature, setSendingContractForSignature] = useState<string | null>(null);
  
  // Contract Creation Modal state
  const [showContractCreationModal, setShowContractCreationModal] = useState(false);
  const [viewingContract, setViewingContract] = useState<any | null>(null);
  const [contractServiceItems, setContractServiceItems] = useState<Array<{
    id: string;
    clientType: string;
    qty: number;
    service: string;
    price: number;
  }>>([{ id: crypto.randomUUID(), clientType: 'Bride', qty: 1, service: '', price: 0 }]);
  const [contractDepositAmount, setContractDepositAmount] = useState<number>(0);
  const [contractDepositPercent, setContractDepositPercent] = useState<number>(50);
  const [savingContract, setSavingContract] = useState(false);
  
  const [messages, setMessages] = useState([
    { from: "other", text: "Select a client to start chatting." }
  ]);
  const [inputText, setInputText] = useState("");

  useEffect(() => {
    // CRITICAL: On dateinquiry.com, NEVER show this dashboard - redirect to simplified admin
    if (isDateInquiry && !authLoading && isAuthenticated && user?.role === 'artist') {
      const slug = (user as any).artistSlug;
      if (slug) {
        window.location.href = `/admin/${slug}`;
        return;
      }
      // If no slug, redirect to artist-login
      window.location.href = '/artist-login';
      return;
    }
    
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Access Required",
        description: "Please log in to access your dashboard.",
        variant: "destructive",
      });
      setTimeout(() => {
        // On dateinquiry.com, redirect to artist-login; otherwise /login
        const loginPath = isDateInquiry ? "/artist-login" : "/login";
        window.location.href = loginPath;
      }, 1000);
      return;
    }
    
    if (user && user.role !== 'artist') {
      // If user has no role yet, redirect to registration to pick a role
      if (!user.role) {
        setLocation("/register");
        return;
      }
      toast({
        title: "Access Denied",
        description: "This dashboard is for vendors/artists.",
        variant: "destructive",
      });
      setLocation("/");
      return;
    }
    
    if (user) {
      fetchArtistData();
    }
  }, [authLoading, isAuthenticated, user, isDateInquiry]);

  // Load profile image from user data
  useEffect(() => {
    if (user?.profileImageUrl) {
      setProfileImage(user.profileImageUrl);
    }
  }, [user?.profileImageUrl]);
  
  const fetchArtistData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Use new vendor bookings endpoint that includes client contact info
      const bookingsRes = await fetch('/api/vendor/bookings', { credentials: "include" });
      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        if (Array.isArray(data) && data.length > 0) {
          setClients(data.map((b: any) => {
            const eventDateObj = b.eventDate ? new Date(b.eventDate) : null;
            const rawEventDate = eventDateObj 
              ? `${eventDateObj.getFullYear()}-${String(eventDateObj.getMonth() + 1).padStart(2, '0')}-${String(eventDateObj.getDate()).padStart(2, '0')}`
              : '';
            const eventTime = eventDateObj
              ? `${String(eventDateObj.getHours()).padStart(2, '0')}:${String(eventDateObj.getMinutes()).padStart(2, '0')}`
              : '';
            
            return {
              id: b.id,
              name: b.clientInfo?.name || b.clientName || b.serviceType || 'Client Event',
              date: eventDateObj?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || '',
              rawEventDate,
              eventTime,
              location: b.location,
              serviceType: b.serviceType,
              status: b.status,
              clientEmail: b.clientInfo?.email || b.clientEmail,
              clientPhone: b.clientInfo?.phone,
              isContact: b.clientInfo?.isContact || false,
              dayOfReminders: b.dayOfReminders || "",
            };
          }));
          
          // Build contacts list from bookings (unique clients)
          const uniqueClients = new Map();
          data.forEach((b: any) => {
            const clientKey = b.clientContactId || b.clientId;
            const clientName = b.clientInfo?.name || b.clientName;
            if (clientName && clientKey && !uniqueClients.has(clientKey)) {
              uniqueClients.set(clientKey, {
                id: clientKey,
                name: clientName,
                email: b.clientInfo?.email || b.clientEmail,
                role: 'Client'
              });
            }
          });
          setContacts(Array.from(uniqueClients.values()));
        } else {
          // Clear state on empty response
          setClients([]);
          setContacts([]);
        }
      }
      
      // Fetch Square Connect status
      const squareRes = await fetch('/api/square/connect/status', { credentials: 'include' });
      if (squareRes.ok) {
        const squareData = await squareRes.json();
        setSquareStatus(squareData);
      }
      
      // Fetch artist profile for portfolio
      const profileRes = await fetch(`/api/artist-profiles/${user.id}`, { credentials: 'include' });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData.portfolioUrls && Array.isArray(profileData.portfolioUrls)) {
          setPortfolioUrls(profileData.portfolioUrls);
        }
      }
      
      // Fetch IQS warnings (high-risk leads)
      setIqsLoading(true);
      const iqsRes = await fetch('/api/iqs/warnings', { credentials: 'include' });
      if (iqsRes.ok) {
        const iqsData = await iqsRes.json();
        setIqsWarnings(iqsData || []);
      }
      setIqsLoading(false);
      
      // Fetch vendor inquiries
      setInquiriesLoading(true);
      const inquiriesRes = await fetch('/api/vendor/inquiries', { credentials: 'include' });
      if (inquiriesRes.ok) {
        const inquiriesData = await inquiriesRes.json();
        setInquiries(inquiriesData || []);
      }
      setInquiriesLoading(false);
      
      // Fetch coaching nudges (invisible CDI - Stanley Tang approach)
      setNudgesLoading(true);
      try {
        const nudgesRes = await fetch('/api/vendor/coaching-nudges', { credentials: 'include' });
        if (nudgesRes.ok) {
          const nudgesData = await nudgesRes.json();
          setCoachingNudges(nudgesData || []);
        }
      } catch (nudgeErr) {
        console.error("Error fetching nudges:", nudgeErr);
      } finally {
        setNudgesLoading(false);
      }
      
      // Fetch trust badges
      setBadgesLoading(true);
      try {
        const badgesRes = await fetch('/api/vendor/badges', { credentials: 'include' });
        if (badgesRes.ok) {
          const badgesData = await badgesRes.json();
          setTrustBadges(badgesData || []);
        }
      } catch (badgeErr) {
        console.error("Error fetching badges:", badgeErr);
      } finally {
        setBadgesLoading(false);
      }

      // Fetch all contracts for this artist
      try {
        const contractsRes = await fetch(`/api/contracts/artist/${user.id}`, { credentials: 'include' });
        if (contractsRes.ok) {
          const contractsData = await contractsRes.json();
          console.log("[Dashboard] Contracts fetched:", contractsData);
          setBookingContracts(contractsData || []);
        } else {
          const errorText = await contractsRes.text();
          console.error("[Dashboard] Contracts fetch failed:", contractsRes.status, errorText);
        }
      } catch (err) {
        console.error("[Dashboard] Error fetching artist contracts:", err);
      }
      
      // Fetch activity feed
      setActivityLoading(true);
      setActivityError(false);
      try {
        const activityRes = await fetch('/api/activity/today', { credentials: 'include' });
        if (activityRes.ok) {
          const activityData = await activityRes.json();
          setActivityFeed(activityData || []);
        } else {
          setActivityError(true);
        }
      } catch (actErr) {
        console.error("[Dashboard] Error fetching activity:", actErr);
        setActivityError(true);
      } finally {
        setActivityLoading(false);
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
    }
    
    setLoading(false);
  };
  
  const handleIqsFeedback = async (leadScoreId: string, rating: 'trustworthy' | 'weird' | 'scam' | 'normal') => {
    setSubmittingFeedback(leadScoreId);
    try {
      const res = await fetch('/api/iqs/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          leadScoreId,
          feedbackType: 'lead_rating',
          rating,
        }),
      });
      
      if (res.ok) {
        toast({
          title: "Feedback Recorded",
          description: `Lead marked as "${rating}". This helps improve future predictions.`,
        });
        // Refresh IQS data
        const iqsRes = await fetch('/api/iqs/warnings', { credentials: 'include' });
        if (iqsRes.ok) {
          const iqsData = await iqsRes.json();
          setIqsWarnings(iqsData || []);
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to submit feedback",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive",
      });
    }
    setSubmittingFeedback(null);
  };
  
  // Toggle badge display on profile
  const handleToggleBadge = async (badgeId: string, display: boolean) => {
    setTogglingBadge(badgeId);
    try {
      const res = await fetch(`/api/vendor/badges/${badgeId}/display`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ display }),
      });
      
      if (res.ok) {
        setTrustBadges(prev => prev.map(b => 
          b.id === badgeId ? { ...b, displayOnProfile: display } : b
        ));
        toast({
          title: display ? "Badge Added to Profile" : "Badge Removed from Profile",
          description: display 
            ? "This badge is now visible on your public profile." 
            : "This badge is no longer shown on your public profile.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update badge display",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update badge display",
        variant: "destructive",
      });
    }
    setTogglingBadge(null);
  };
  
  // Get icon component for nudges and badges
  const getNudgeIcon = (iconName: string) => {
    const iconProps = { size: 14, className: "flex-shrink-0" };
    switch (iconName) {
      case 'clock': return <Clock {...iconProps} />;
      case 'zap': return <AlertCircle {...iconProps} className="text-yellow-600" />;
      case 'calendar': return <Calendar {...iconProps} />;
      case 'calendar-check': return <Calendar {...iconProps} />;
      case 'target': return <DollarSign {...iconProps} />;
      case 'message-circle': return <MessageCircle {...iconProps} />;
      case 'image': return <ImageIcon {...iconProps} />;
      case 'check-circle': return <Check {...iconProps} />;
      case 'shield-check': return <ShieldAlert {...iconProps} />;
      case 'trending-up': return <DollarSign {...iconProps} />;
      default: return <Info {...iconProps} />;
    }
  };
  
  // Inquiry action handlers
  const handleRespondToInquiry = async (inquiryId: string) => {
    setRespondingInquiry(inquiryId);
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}/respond`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (res.ok) {
        toast({
          title: "Response Sent",
          description: "Your info sheet has been sent to the client.",
        });
        // Refresh inquiries
        const inquiriesRes = await fetch('/api/vendor/inquiries', { credentials: 'include' });
        if (inquiriesRes.ok) {
          setInquiries(await inquiriesRes.json());
        }
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "Failed to respond to inquiry",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to respond to inquiry",
        variant: "destructive",
      });
    }
    setRespondingInquiry(null);
  };
  
  const handleSendChatInvite = async (inquiryId: string) => {
    setSendingChatInvite(inquiryId);
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}/chat-invite`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (res.ok) {
        toast({
          title: "Chat Invite Sent",
          description: "A chat invitation email has been sent to the client.",
        });
        // Refresh inquiries
        const inquiriesRes = await fetch('/api/vendor/inquiries', { credentials: 'include' });
        if (inquiriesRes.ok) {
          setInquiries(await inquiriesRes.json());
        }
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "Failed to send chat invite",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to send chat invite",
        variant: "destructive",
      });
    }
    setSendingChatInvite(null);
  };
  
  const handleQuickReply = async () => {
    if (!quickReplyInquiry || !quickReplyMessage.trim()) return;
    
    setSendingQuickReply(true);
    try {
      const res = await fetch(`/api/inquiries/${quickReplyInquiry.id}/quick-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: quickReplyMessage }),
      });
      
      if (res.ok) {
        toast({
          title: "Message Sent",
          description: `Your reply has been sent to ${quickReplyInquiry.clientName}.`,
        });
        setShowQuickReplyModal(false);
        setQuickReplyMessage("");
        setQuickReplyInquiry(null);
        // Refresh inquiries
        const inquiriesRes = await fetch('/api/vendor/inquiries', { credentials: 'include' });
        if (inquiriesRes.ok) {
          setInquiries(await inquiriesRes.json());
        }
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "Failed to send reply",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive",
      });
    }
    setSendingQuickReply(false);
  };
  
  const handleDeclineInquiry = async (inquiryId: string) => {
    setDecliningInquiry(inquiryId);
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: 'Not available for this date' }),
      });
      
      if (res.ok) {
        toast({
          title: "Inquiry Declined",
          description: "The inquiry has been marked as declined.",
        });
        // Refresh inquiries
        const inquiriesRes = await fetch('/api/vendor/inquiries', { credentials: 'include' });
        if (inquiriesRes.ok) {
          setInquiries(await inquiriesRes.json());
        }
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "Failed to decline inquiry",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to decline inquiry",
        variant: "destructive",
      });
    }
    setDecliningInquiry(null);
  };
  
  // Confirm inquiry - convert to booking
  const handleConfirmInquiry = async (inquiryId: string) => {
    setConfirmingInquiry(inquiryId);
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      
      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Booking Confirmed!",
          description: "The inquiry has been converted to a confirmed booking.",
        });
        const inquiriesRes = await fetch('/api/vendor/inquiries', { credentials: 'include' });
        if (inquiriesRes.ok) setInquiries(await inquiriesRes.json());
        setCalendarRefreshKey(prev => prev + 1);
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to confirm", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to confirm inquiry", variant: "destructive" });
    }
    setConfirmingInquiry(null);
  };

  // Hold inquiry - tentative reservation
  const handleHoldInquiry = async (inquiryId: string, expiresInHours: number = 24) => {
    setHoldingInquiry(inquiryId);
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ expiresInHours, reason: 'Tentatively reserved' }),
      });
      
      if (res.ok) {
        toast({
          title: "Date Held",
          description: `Tentatively reserved for ${expiresInHours} hours.`,
        });
        const inquiriesRes = await fetch('/api/vendor/inquiries', { credentials: 'include' });
        if (inquiriesRes.ok) setInquiries(await inquiriesRes.json());
        setCalendarRefreshKey(prev => prev + 1);
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to hold", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to hold inquiry", variant: "destructive" });
    }
    setHoldingInquiry(null);
  };

  // Propose alternative dates
  const handleProposeAlternative = async () => {
    if (!proposeInquiryId) return;
    setProposingDates(proposeInquiryId);
    const validDates = proposedDateInputs.filter(d => d.trim());
    if (validDates.length === 0) {
      toast({ title: "Error", description: "Please add at least one date", variant: "destructive" });
      setProposingDates(null);
      return;
    }
    try {
      const res = await fetch(`/api/inquiries/${proposeInquiryId}/propose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ proposedDates: validDates }),
      });
      if (res.ok) {
        toast({ title: "Dates Proposed", description: "Alternative dates sent to client." });
        const inquiriesRes = await fetch('/api/vendor/inquiries', { credentials: 'include' });
        if (inquiriesRes.ok) setInquiries(await inquiriesRes.json());
        setShowProposeModal(false);
        setProposeInquiryId(null);
        setProposedDateInputs(['']);
      } else {
        const error = await res.json();
        toast({ title: "Error", description: error.error || "Failed to propose", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to propose dates", variant: "destructive" });
    }
    setProposingDates(null);
  };

  // Calculate countdown for hold expiration
  const getHoldCountdown = (expiresAt: string) => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    if (diffMs <= 0) return 'Expired';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`;
  };
  
  // Format nextAction for display (Stanley Tang schema sprint)
  const formatNextAction = (nextAction: string | undefined) => {
    if (!nextAction) return null;
    const actionLabels: Record<string, { label: string; owner: string; buttonLabel: string }> = {
      'vendor_first_response': { label: 'Respond to inquiry', owner: 'You', buttonLabel: 'Respond' },
      'vendor_confirm': { label: 'Confirm or decline', owner: 'You', buttonLabel: 'Confirm' },
      'client_payment': { label: 'Awaiting payment', owner: 'Client', buttonLabel: 'Send Reminder' },
      'client_reply': { label: 'Awaiting client reply', owner: 'Client', buttonLabel: 'Follow Up' },
    };
    return actionLabels[nextAction] || { label: nextAction, owner: 'Unknown', buttonLabel: 'Action' };
  };
  
  // Get SLA countdown with urgency level
  const getSlaCountdown = (dueAt: string | undefined) => {
    if (!dueAt) return null;
    const due = new Date(dueAt);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const isOverdue = diffMs <= 0;
    // Fix: compute hours/mins from absolute diff to avoid negative truncation bugs
    const absDiffMs = Math.abs(diffMs);
    const hours = Math.floor(absDiffMs / (1000 * 60 * 60));
    const mins = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));
    const isUrgent = !isOverdue && hours < 4;
    return {
      text: isOverdue 
        ? (hours > 0 ? `${hours}h ${mins}m overdue` : `${mins}m overdue`)
        : (hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`),
      isOverdue,
      isUrgent,
    };
  };

  // Fetch inquiry timeline with race condition handling
  const timelineRequestRef = useRef<string | null>(null);
  
  const fetchInquiryTimeline = async (inquiryId: string) => {
    if (showTimelineId === inquiryId) {
      setShowTimelineId(null);
      setTimelineData(null);
      timelineRequestRef.current = null;
      return;
    }
    
    const requestId = inquiryId;
    timelineRequestRef.current = requestId;
    setTimelineData(null);
    setLoadingTimeline(true);
    setShowTimelineId(inquiryId);
    
    try {
      const res = await fetch(`/api/inquiries/${inquiryId}/timeline`, { credentials: 'include' });
      
      if (timelineRequestRef.current !== requestId) {
        return;
      }
      
      if (res.ok) {
        const data = await res.json();
        setTimelineData(data);
      } else {
        setShowTimelineId(null);
        setTimelineData(null);
        toast({ title: "Error", description: "Failed to load timeline", variant: "destructive" });
      }
    } catch (err) {
      if (timelineRequestRef.current === requestId) {
        setShowTimelineId(null);
        setTimelineData(null);
        toast({ title: "Error", description: "Failed to load timeline", variant: "destructive" });
      }
    }
    
    if (timelineRequestRef.current === requestId) {
      setLoadingTimeline(false);
    }
  };

  const formatTimelineAction = (action: string) => {
    const actionMap: Record<string, string> = {
      // Standardized vocabulary (Stanley Tang schema sprint)
      'inquiry_created': 'Inquiry received',
      'first_response': 'First response sent',
      'hold_placed': 'Date held',
      'hold_expired': 'Hold expired',
      'proposal_sent': 'Alternative dates proposed',
      'proposal_viewed': 'Proposal viewed',
      'confirm_clicked': 'Confirmed by vendor',
      'booking_created': 'Booking created',
      'declined': 'Inquiry declined',
      'auto_escalated': 'Auto-escalated',
      'reminder_sent': 'Reminder sent',
      // Legacy mappings (backward compatibility)
      'inquiry_responded': 'Info sheet sent',
      'inquiry_hold': 'Hold placed',
      'inquiry_confirmed': 'Booking confirmed',
      'inquiry_declined': 'Inquiry declined',
      'inquiry_propose_dates': 'Alternative dates proposed',
      'chat_invite_sent': 'Chat invite sent',
    };
    return actionMap[action] || action.replace(/_/g, ' ');
  };
  
  const formatActorRole = (role?: string) => {
    if (!role) return '';
    const roleMap: Record<string, string> = {
      'artist': 'Vendor',
      'planner': 'Planner',
      'client': 'Client',
      'system': 'System',
      'admin': 'Admin',
    };
    return roleMap[role] || role;
  };

  const getInquiryStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'hold': return 'bg-orange-100 text-orange-800';
      case 'responded': return 'bg-blue-100 text-blue-800';
      case 'chatting': return 'bg-purple-100 text-purple-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-gray-100 text-gray-600';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high_risk': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium_risk': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low_risk': return 'bg-green-100 text-green-800 border-green-300';
      case 'trustworthy': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };
  
  const getRiskLevelLabel = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical': return 'Critical Risk';
      case 'high_risk': return 'High Risk';
      case 'medium_risk': return 'Medium Risk';
      case 'low_risk': return 'Low Risk';
      case 'trustworthy': return 'Trustworthy';
      default: return 'Unknown';
    }
  };

  const handleSquareConnect = async () => {
    setSquareLoading(true);
    try {
      const res = await fetch('/api/square/connect/authorize', {
        credentials: 'include',
      });
      
      if (res.ok) {
        const data = await res.json();
        // Redirect to Square OAuth
        window.location.href = data.url;
      } else {
        try {
          const err = await res.json();
          toast({
            title: "Square Setup Error",
            description: err.error || "Failed to start Square setup. Please try again.",
            variant: "destructive",
          });
        } catch {
          toast({
            title: "Error",
            description: "Failed to connect to Square. Please refresh and try again.",
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to connect to Square",
        variant: "destructive",
      });
    }
    setSquareLoading(false);
  };

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    console.log("[Portfolio] Upload triggered, files:", files?.length, "user:", user?.id);
    if (!files || files.length === 0 || !user) {
      console.log("[Portfolio] Early return - no files or no user");
      return;
    }
    
    setUploadingPortfolio(true);
    let successCount = 0;
    
    try {
      for (const file of Array.from(files)) {
        console.log("[Portfolio] Processing file:", file.name, file.type);
        const compressed = await compressImage(file);
        const base64 = compressed.split(',')[1];
        const mimeType = file.type || 'image/jpeg';
        
        console.log("[Portfolio] Sending to:", `/api/artist-profiles/${user.id}/portfolio`);
        const res = await fetch(`/api/artist-profiles/${user.id}/portfolio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ imageData: base64, mimeType })
        });
        
        console.log("[Portfolio] Response status:", res.status);
        if (res.ok) {
          const data = await res.json();
          console.log("[Portfolio] Response data:", data);
          if (data.portfolioUrls) {
            setPortfolioUrls(data.portfolioUrls);
          }
          successCount++;
        } else {
          const errorText = await res.text();
          console.error("[Portfolio] Error response:", errorText);
        }
      }
      
      if (successCount > 0) {
        toast({
          title: "Success",
          description: `Added ${successCount} photo${successCount > 1 ? 's' : ''} to your portfolio!`,
        });
      }
    } catch (err) {
      console.error("[Portfolio] Upload error:", err);
      toast({
        title: "Error",
        description: "Failed to upload photos. Please try again.",
        variant: "destructive",
      });
    }
    
    setUploadingPortfolio(false);
    if (portfolioInputRef.current) {
      portfolioInputRef.current.value = '';
    }
  };
  
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxSize = 800;
          let { width, height } = img;
          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleDeletePortfolioPhoto = async (urlToDelete: string) => {
    if (!user) return;
    
    try {
      const updatedUrls = portfolioUrls.filter(url => url !== urlToDelete);
      const res = await fetch(`/api/artist-profiles/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ portfolioUrls: updatedUrls })
      });
      
      if (res.ok) {
        setPortfolioUrls(updatedUrls);
        toast({
          title: "Removed",
          description: "Photo removed from portfolio.",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to remove photo.",
        variant: "destructive",
      });
    }
  };

  const handleSendAppointmentConfirmation = async () => {
    if (!selectedBooking?.id || !selectedBooking?.clientEmail) {
      toast({
        title: "Missing Information",
        description: "Client email is required to send confirmation",
        variant: "destructive",
      });
      return;
    }
    
    setSendingAppointmentConfirmation(true);
    try {
      const res = await fetch('/api/booking/send-appointment-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ bookingId: selectedBooking.id }),
      });
      
      if (res.ok) {
        toast({
          title: "Confirmation Sent!",
          description: "Appointment details have been sent to the client",
        });
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "Failed to send confirmation",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to send confirmation email",
        variant: "destructive",
      });
    }
    setSendingAppointmentConfirmation(false);
  };

  const [showDocusignModal, setShowDocusignModal] = useState(false);
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);

  const handleSendForSigning = async (bookingId: string) => {
    setPendingBookingId(bookingId);
    setShowDocusignModal(true);
  };

  const submitDocusignContract = async () => {
    if (!pendingBookingId) return;
    
    setSendingForSigning(true);
    try {
      const res = await fetch(`/api/bookings/${pendingBookingId}/send-for-signing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      
      if (res.ok) {
        const data = await res.json();
        setContractSigningUrl(data.signingUrl);
        toast({
          title: "Contract Tracked!",
          description: "Your DocuSign contract is now being tracked.",
        });
        setShowDocusignModal(false);
        setPendingBookingId(null);
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "Failed to update contract status",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update contract status",
        variant: "destructive",
      });
    }
    setSendingForSigning(false);
  };

  // Contract creation helpers
  const calculateContractTotal = () => {
    return contractServiceItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
  };
  
  const addServiceItem = () => {
    setContractServiceItems(prev => [...prev, { 
      id: crypto.randomUUID(), 
      clientType: 'Guest', 
      qty: 1, 
      service: '',
      price: 0 
    }]);
  };
  
  const removeServiceItem = (id: string) => {
    if (contractServiceItems.length > 1) {
      setContractServiceItems(prev => prev.filter(item => item.id !== id));
    }
  };
  
  const updateServiceItem = (id: string, field: string, value: string | number) => {
    setContractServiceItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };
  
  const openContractCreationModal = () => {
    // Reset form with default service item from booking
    setContractServiceItems([{ 
      id: crypto.randomUUID(), 
      clientType: 'Bride', 
      qty: 1, 
      service: selectedBooking?.serviceType || '',
      price: 0 
    }]);
    setContractDepositPercent(50);
    setShowContractCreationModal(true);
  };
  
  const handleCreateAndSendContract = async () => {
    if (!selectedBooking?.id) return;
    
    const total = calculateContractTotal();
    const deposit = Math.round(total * (contractDepositPercent / 100));
    
    if (total <= 0) {
      toast({
        title: "Missing Information",
        description: "Please add at least one service with a price",
        variant: "destructive",
      });
      return;
    }
    
    setSavingContract(true);
    try {
      // Create contract with service details matching schema
      const res = await fetch(`/api/bookings/${selectedBooking.id}/create-contract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          serviceItems: contractServiceItems.map(item => ({
            clientType: item.clientType,
            qty: item.qty,
            service: item.service,
            price: item.price,
            total: item.qty * item.price
          })),
          totalAmount: total,
          depositAmount: deposit,
          depositPercent: contractDepositPercent,
          clientName: selectedBooking.name || selectedBooking.clientName,
          clientEmail: selectedBooking.clientEmail,
          eventDate: selectedBooking.eventDate || selectedBooking.date,
          eventLocation: selectedBooking.location || selectedBooking.eventLocation,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Contract Created & Sent!",
          description: `Contract sent to ${selectedBooking.clientEmail} for signature`,
        });
        setShowContractCreationModal(false);
        // Refresh contracts list
        fetchBookingContracts(selectedBooking.id);
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "Failed to create contract",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create contract",
        variant: "destructive",
      });
    }
    setSavingContract(false);
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;
    setMessages(prev => [...prev, { from: "me", text: inputText }]);
    setInputText("");
  };

  const handleVoiceMessage = (transcript: string) => {
    setInputText(prev => prev + " " + transcript);
  };

  const [requests, setRequests] = useState<any[]>([]);

  const [clients, setClients] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState("");

  const [unavailableDates, setUnavailableDates] = useState<number[]>([6, 9, 12]);
  
  // Edit booking state
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isEditingBooking, setIsEditingBooking] = useState(false);
  const [editBookingForm, setEditBookingForm] = useState({
    clientName: "",
    clientEmail: "",
    serviceType: "",
    eventDate: "",
    eventTime: "",
    location: "",
  });
  const [savingBooking, setSavingBooking] = useState(false);
  
  // Day of Reminders state
  const [dayOfReminders, setDayOfReminders] = useState("");
  const [savingReminders, setSavingReminders] = useState(false);
  const [remindersSaved, setRemindersSaved] = useState(false);
  
  // Coaching Nudges state (invisible CDI - Stanley Tang approach)
  const [coachingNudges, setCoachingNudges] = useState<Array<{
    id: string;
    type: string;
    message: string;
    action: string;
    priority: 'tip' | 'suggestion' | 'opportunity';
    icon: string;
  }>>([]);
  const [nudgesLoading, setNudgesLoading] = useState(false);
  
  // Trust Badges state
  const [trustBadges, setTrustBadges] = useState<Array<{
    id: string;
    name: string;
    description: string;
    earned: boolean;
    icon: string;
    displayOnProfile: boolean;
  }>>([]);
  const [badgesLoading, setBadgesLoading] = useState(false);
  const [togglingBadge, setTogglingBadge] = useState<string | null>(null);
  
  const filteredClients = clients.filter(c => 
    c.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.date?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.location?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const fetchBookingContracts = async (bookingId: string) => {
    setLoadingContracts(true);
    try {
      const res = await fetch(`/api/contracts/booking/${bookingId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setBookingContracts(data || []);
      }
    } catch (err) {
      console.error("Error fetching contracts:", err);
    }
    setLoadingContracts(false);
  };

  const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedBooking?.id) return;
    
    const bookingId = selectedBooking.id;
    setUploadingContract(true);
    
    const file = files[0];
    const reader = new FileReader();
    
    reader.onload = async () => {
      try {
        if (!reader.result || typeof reader.result !== 'string') {
          throw new Error("Failed to read file");
        }
        
        const base64 = reader.result.split(',')[1];
        const res = await fetch(`/api/bookings/${bookingId}/upload-contract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            fileContent: base64,
            fileName: file.name,
            mimeType: file.type,
          }),
        });
        
        if (res.ok) {
          toast({
            title: "Contract Uploaded",
            description: "Your contract file has been saved.",
          });
          fetchBookingContracts(bookingId);
        } else {
          const error = await res.json();
          toast({
            title: "Upload Failed",
            description: error.error || "Failed to upload contract",
            variant: "destructive",
          });
        }
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to upload contract",
          variant: "destructive",
        });
      } finally {
        setUploadingContract(false);
      }
    };
    
    reader.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to read file",
        variant: "destructive",
      });
      setUploadingContract(false);
    };
    
    reader.readAsDataURL(file);
    
    if (e.target) {
      e.target.value = '';
    }
  };

  const sendContractForSignature = async (contractId: string, clientEmail?: string, clientName?: string) => {
    if (!clientEmail) {
      toast({
        title: "Missing Email",
        description: "This contract needs a client email address to send for signature.",
        variant: "destructive",
      });
      return;
    }
    
    setSendingContractForSignature(contractId);
    try {
      const res = await fetch(`/api/contracts/${contractId}/send-for-signing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ clientEmail, clientName }),
      });
      
      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Contract Sent!",
          description: `Signing link sent to ${clientEmail}`,
        });
        if (selectedBooking?.id) {
          fetchBookingContracts(selectedBooking.id);
        }
      } else {
        const error = await res.json();
        toast({
          title: "Send Failed",
          description: error.error || "Failed to send contract for signing",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to send contract for signing",
        variant: "destructive",
      });
    } finally {
      setSendingContractForSignature(null);
    }
  };

  const [cancellingContract, setCancellingContract] = useState<string | null>(null);
  
  const cancelContract = async (contractId: string) => {
    setCancellingContract(contractId);
    try {
      const res = await fetch(`/api/contracts/${contractId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (res.ok) {
        toast({
          title: "Contract Cancelled",
          description: "The contract has been cancelled. You can now create a new one.",
        });
        if (selectedBooking?.id) {
          fetchBookingContracts(selectedBooking.id);
        }
      } else {
        const error = await res.json();
        toast({
          title: "Cancel Failed",
          description: error.error || "Failed to cancel contract",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to cancel contract",
        variant: "destructive",
      });
    } finally {
      setCancellingContract(null);
    }
  };

  const openClientFolder = (clientId: string) => {
    const booking = clients.find(c => c.id === clientId);
    if (booking) {
      setSelectedClient(booking.name);
      setSelectedBooking(booking);
      setEditBookingForm({
        clientName: booking.name || "",
        clientEmail: booking.clientEmail || "",
        serviceType: booking.serviceType || "Bridal Beauty",
        eventDate: booking.rawEventDate || "",
        eventTime: booking.eventTime || "",
        location: booking.location || "",
      });
      setDayOfReminders(booking.dayOfReminders || "");
      setRemindersSaved(false);
      setBookingContracts([]);
      fetchBookingContracts(booking.id);
      setView("folder");
    }
  };
  
  const handleSaveBookingEdit = async () => {
    if (!selectedBooking?.id) return;
    
    setSavingBooking(true);
    try {
      const res = await fetch(`/api/bookings/${selectedBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          clientName: editBookingForm.clientName,
          clientEmail: editBookingForm.clientEmail,
          serviceType: editBookingForm.serviceType,
          eventDate: editBookingForm.eventDate,
          eventTime: editBookingForm.eventTime,
          location: editBookingForm.location,
        }),
      });
      
      if (res.ok) {
        // Immediately update UI with new values
        const updatedBooking = {
          ...selectedBooking,
          name: editBookingForm.clientName,
          clientName: editBookingForm.clientName,
          clientEmail: editBookingForm.clientEmail,
          serviceType: editBookingForm.serviceType,
          rawEventDate: editBookingForm.eventDate,
          eventTime: editBookingForm.eventTime,
          location: editBookingForm.location,
        };
        setSelectedBooking(updatedBooking);
        
        // Also update in clients list
        setClients(prev => prev.map(c => 
          c.id === selectedBooking.id ? updatedBooking : c
        ));
        
        toast({
          title: "Saved",
          description: "Booking details updated successfully.",
        });
        setIsEditingBooking(false);
      } else {
        toast({
          title: "Error",
          description: "Failed to update booking.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to save changes.",
        variant: "destructive",
      });
    }
    setSavingBooking(false);
  };
  
  const handleSaveDayOfReminders = async () => {
    if (!selectedBooking?.id) return;
    
    setSavingReminders(true);
    try {
      const res = await fetch(`/api/bookings/${selectedBooking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          dayOfReminders: dayOfReminders,
        }),
      });
      
      if (res.ok) {
        setRemindersSaved(true);
        toast({
          title: "Saved",
          description: "Day of reminders saved successfully.",
        });
        // Update selectedBooking with the new value
        setSelectedBooking((prev: any) => ({ ...prev, dayOfReminders }));
        // Also update in clients list
        setClients(prev => prev.map(c => 
          c.id === selectedBooking.id ? { ...c, dayOfReminders } : c
        ));
        setTimeout(() => setRemindersSaved(false), 3000);
      } else {
        toast({
          title: "Error",
          description: "Failed to save reminders.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to save reminders.",
        variant: "destructive",
      });
    }
    setSavingReminders(false);
  };

  const acceptRequest = (req: any) => {
    setClients(prev => [...prev, { id: Date.now().toString(), name: `${req.name.split(' ')[1]} Wedding`, date: req.date, location: req.location }]);
    setRequests(prev => prev.filter(r => r.id !== req.id));
    setUnavailableDates(prev => [...prev, Math.floor(Math.random() * 10) + 15]); 
  };

  const declineRequest = (id: number) => {
    setRequests(prev => prev.filter(r => r.id !== id));
  };

  const handleSendThankYou = () => {
    if (!thankYouMessage.trim() || !thankYouRecipient) return;
    toast({ title: "Thank You Sent", description: `Thank you note sent to ${thankYouRecipient}!` });
    setThankYouMessage("");
    setThankYouRecipient("");
    setShowThankYouModal(false);
  };

  const handleCreateBooking = async () => {
    if (!bookingForm.clientName || !bookingForm.clientEmail || !bookingForm.eventDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in client name, email, and event date.",
        variant: "destructive",
      });
      return;
    }
    
    setCreatingBooking(true);
    try {
      const res = await fetch('/api/vendor/create-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...bookingForm,
          amount: bookingForm.amount ? parseFloat(bookingForm.amount) : undefined,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Booking Created",
          description: `Appointment for ${bookingForm.clientName} on ${new Date(bookingForm.eventDate).toLocaleDateString()} has been created.`,
        });
        
        // Refresh data
        fetchArtistData();
        setCalendarRefreshKey(prev => prev + 1);
        
        // Reset form and close modal
        setBookingForm({
          clientName: "",
          clientEmail: "",
          clientPhone: "",
          eventDate: "",
          eventLocation: "",
          serviceType: "Bridal Beauty",
          amount: "",
          notes: "",
        });
        setShowCreateBooking(false);
        
        // Ask if they want to send invoice
        if (bookingForm.amount) {
          setInvoiceBookingId(data.booking.id);
          setInvoiceAmount(bookingForm.amount);
          setInvoiceDescription(bookingForm.serviceType);
          setTimeout(() => setShowInvoiceModal(true), 500);
        }
      } else {
        const err = await res.json();
        toast({
          title: "Error",
          description: err.error || "Failed to create booking",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create booking",
        variant: "destructive",
      });
    }
    setCreatingBooking(false);
  };

  const handleGenerateInvoice = async () => {
    if (!invoiceAmount || parseFloat(invoiceAmount) < 1) {
      toast({
        title: "Invalid Amount",
        description: "Please enter an amount of at least $1.00",
        variant: "destructive",
      });
      return;
    }
    
    setGeneratingInvoice(true);
    try {
      const selectedBooking = clients.find(c => c.id === invoiceBookingId);
      
      const res = await fetch('/api/square/create-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          bookingId: invoiceBookingId,
          amount: Math.round(parseFloat(invoiceAmount) * 100),
          description: invoiceDescription || 'Beauty Services',
          clientEmail: selectedBooking?.clientEmail,
          clientName: selectedBooking?.name,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setInvoiceLink(data.paymentLink);
        toast({
          title: "Invoice Created",
          description: `Payment link generated. You'll receive $${(data.vendorReceives / 100).toFixed(2)} after platform fee.`,
        });
      } else {
        const err = await res.json();
        toast({
          title: "Error",
          description: err.error || "Failed to create invoice",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to generate invoice link",
        variant: "destructive",
      });
    }
    setGeneratingInvoice(false);
  };

  const copyInvoiceLink = () => {
    if (invoiceLink) {
      navigator.clipboard.writeText(invoiceLink);
      toast({
        title: "Copied!",
        description: "Payment link copied to clipboard. Send it to your client!",
      });
    }
  };

  const handleSendInvoiceEmail = async () => {
    const selectedBooking = clients.find(c => c.id === invoiceBookingId);
    if (!invoiceLink || !selectedBooking?.clientEmail) {
      toast({
        title: "Missing Email",
        description: "No email address found for this client.",
        variant: "destructive",
      });
      return;
    }

    const amountCents = invoiceAmount ? Math.round(parseFloat(invoiceAmount) * 100) : 0;
    if (!amountCents || isNaN(amountCents)) {
      toast({
        title: "Missing Amount",
        description: "Invoice amount is required.",
        variant: "destructive",
      });
      return;
    }

    const vendorName = user?.firstName && user?.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user?.firstName || 'Your Vendor';

    setSendingInvoiceEmail(true);
    try {
      const res = await fetch('/api/invoice/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          toEmail: selectedBooking.clientEmail,
          clientName: selectedBooking.name || 'Client',
          vendorName,
          amount: amountCents,
          description: invoiceDescription || 'Beauty Services',
          paymentLink: invoiceLink,
        }),
      });

      if (res.ok) {
        toast({
          title: "Email Sent!",
          description: `Invoice sent to ${selectedBooking.clientEmail}`,
        });
      } else {
        const err = await res.json();
        toast({
          title: "Error",
          description: err.error || "Failed to send email",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to send invoice email",
        variant: "destructive",
      });
    }
    setSendingInvoiceEmail(false);
  };

  const handleScheduleInvoiceEmail = async () => {
    const selectedBooking = clients.find(c => c.id === invoiceBookingId);
    if (!invoiceLink || !selectedBooking?.clientEmail) {
      toast({
        title: "Missing Email",
        description: "No email address found for this client.",
        variant: "destructive",
      });
      return;
    }

    if (!invoiceScheduleDate || !invoiceScheduleTime) {
      toast({
        title: "Missing Schedule",
        description: "Please select a date and time to schedule the email.",
        variant: "destructive",
      });
      return;
    }

    const amountCents = invoiceAmount ? Math.round(parseFloat(invoiceAmount) * 100) : 0;
    if (!amountCents || isNaN(amountCents)) {
      toast({
        title: "Missing Amount",
        description: "Invoice amount is required.",
        variant: "destructive",
      });
      return;
    }

    const vendorName = user?.firstName && user?.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user?.firstName || 'Your Vendor';

    const scheduledFor = new Date(`${invoiceScheduleDate}T${invoiceScheduleTime}`).toISOString();

    setSchedulingInvoice(true);
    try {
      const res = await fetch('/api/scheduled-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          emailType: 'invoice',
          recipientEmail: selectedBooking.clientEmail,
          recipientName: selectedBooking.name || 'Client',
          scheduledFor,
          bookingId: invoiceBookingId,
          vendorName,
          amount: amountCents,
          description: invoiceDescription || 'Beauty Services',
          paymentLink: invoiceLink,
        }),
      });

      if (res.ok) {
        const scheduledDate = new Date(scheduledFor);
        toast({
          title: "Email Scheduled!",
          description: `Invoice will be sent on ${scheduledDate.toLocaleDateString()} at ${scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        });
        setShowInvoiceModal(false);
        setInvoiceLink(null);
        setInvoiceAmount("");
        setInvoiceDescription("");
        setInvoiceScheduleDate("");
        setInvoiceScheduleTime("09:00");
        setInvoiceScheduleMode("now");
      } else {
        const err = await res.json();
        toast({
          title: "Error",
          description: err.error || "Failed to schedule email",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to schedule invoice email",
        variant: "destructive",
      });
    }
    setSchedulingInvoice(false);
  };

  const handleSendInvoiceSms = async () => {
    const selectedBooking = clients.find(c => c.id === invoiceBookingId);
    if (!invoiceLink || !selectedBooking?.clientPhone) {
      toast({
        title: "Missing Phone",
        description: "No phone number found for this client.",
        variant: "destructive",
      });
      return;
    }

    const amountCents = invoiceAmount ? Math.round(parseFloat(invoiceAmount) * 100) : 0;
    if (!amountCents || isNaN(amountCents)) {
      toast({
        title: "Missing Amount",
        description: "Invoice amount is required.",
        variant: "destructive",
      });
      return;
    }

    const vendorName = user?.firstName && user?.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user?.firstName || 'Your Vendor';

    setSendingInvoiceSms(true);
    try {
      const res = await fetch('/api/invoice/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          toPhone: selectedBooking.clientPhone,
          clientName: selectedBooking.name || 'Client',
          vendorName,
          amount: amountCents,
          paymentLink: invoiceLink,
        }),
      });

      if (res.ok) {
        toast({
          title: "Text Sent!",
          description: `Invoice sent to ${selectedBooking.clientPhone}`,
        });
      } else {
        const err = await res.json();
        toast({
          title: "Error",
          description: err.error || "Failed to send text. Make sure Twilio is configured.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to send invoice text",
        variant: "destructive",
      });
    }
    setSendingInvoiceSms(false);
  };

  const handleSendAppointmentEmail = async () => {
    if (!selectedBooking?.clientEmail) {
      toast({
        title: "Missing Email",
        description: "No email address found for this client.",
        variant: "destructive",
      });
      return;
    }

    if (!emailSubject.trim() || !emailBody.trim()) {
      toast({
        title: "Missing Content",
        description: "Please enter both subject and message.",
        variant: "destructive",
      });
      return;
    }

    setSendingEmail(true);
    try {
      const res = await fetch('/api/booking/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          toEmail: selectedBooking.clientEmail,
          clientName: selectedBooking.name || 'Client',
          subject: emailSubject,
          body: emailBody,
          eventDate: selectedBooking.date,
          eventLocation: selectedBooking.location,
        }),
      });

      if (res.ok) {
        toast({
          title: "Email Sent!",
          description: `Appointment email sent to ${selectedBooking.clientEmail}`,
        });
        setShowEmailModal(false);
        setEmailSubject("");
        setEmailBody("");
      } else {
        const err = await res.json();
        toast({
          title: "Error",
          description: err.error || "Failed to send email",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to send appointment email",
        variant: "destructive",
      });
    }
    setSendingEmail(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4 border-black"></div>
          <p className="text-sm text-black/60">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingImage(true);
    
    try {
      // Create Uppy instance for this upload
      const uppy = new Uppy({
        restrictions: { maxNumberOfFiles: 1 },
        autoProceed: true,
      });

      uppy.use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: async (file) => {
          const res = await fetch("/api/objects/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              filename: file.name,
              contentType: file.type,
            }),
          });
          const data = await res.json();
          return {
            method: "PUT",
            url: data.uploadURL,
            headers: { "Content-Type": file.type || "application/octet-stream" },
          };
        },
      });

      uppy.on("complete", async (result) => {
        if (result.successful && result.successful.length > 0) {
          const uploadedUrl = result.successful[0].response?.uploadURL?.split("?")[0] || "";
          
          // Save the image path to profile
          const saveRes = await fetch("/api/profile-image", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ imageUrl: uploadedUrl }),
          });
          
          if (saveRes.ok) {
            const saveData = await saveRes.json();
            setProfileImage(saveData.objectPath);
            
            // Update user in database
            await fetch(`/api/users/${user.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ profileImageUrl: saveData.objectPath }),
            });
            
            // Refresh user data
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            
            toast({
              title: "Photo Updated",
              description: "Your profile picture has been saved.",
            });
          }
        }
        setUploadingImage(false);
        uppy.destroy();
      });

      uppy.on("error", (error) => {
        console.error("Upload error:", error);
        toast({
          title: "Upload Failed",
          description: "Could not upload your photo. Please try again.",
          variant: "destructive",
        });
        setUploadingImage(false);
        uppy.destroy();
      });

      // Add the file to Uppy
      uppy.addFile({
        name: file.name,
        type: file.type,
        data: file,
        source: "Local",
      });
    } catch (err) {
      console.error("Profile upload error:", err);
      toast({
        title: "Upload Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setUploadingImage(false);
    }
  };

  return (
    <div className="font-sans min-h-screen overflow-y-auto p-2 sm:p-4 bg-cream">
      <div className="max-w-full sm:max-w-full lg:max-w-6xl mx-auto frame-outer shadow-sm">
        <div className="frame-inner">
          {/* HEADER - Desktop */}
          <header className="hidden md:flex items-baseline justify-between mb-6">
            <div className="flex items-center gap-4">
              <div 
                onClick={() => !uploadingImage && profileInputRef.current?.click()}
                className="w-16 h-16 rounded-full bg-gray-200 border-2 border-[#c5ccd8] cursor-pointer overflow-hidden flex items-center justify-center hover:border-black transition-colors group"
                data-testid="button-profile-image"
              >
                {uploadingImage ? (
                  <Loader2 size={20} className="text-gray-400 animate-spin" />
                ) : profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={20} className="text-gray-400 group-hover:text-black transition-colors" />
                )}
              </div>
              <input 
                type="file" 
                ref={profileInputRef} 
                onChange={handleProfileImageChange}
                accept="image/*" 
                className="hidden" 
              />
              <div>
                <h1 className="font-serif text-3xl tracking-tight ink-main">
                  Your Secretary
                </h1>
                <p className="mt-1 text-[0.7rem] uppercase tracking-[0.22em] ink-soft">
                  Private Booking Assistant
                </p>
                <p className="mt-2 font-serif text-xl ink-main">
                  Bonjour, {user?.firstName || 'there'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowComposeEmail(true)}
                className="px-4 py-2 bg-[#6B4A55] text-white text-sm rounded-lg hover:bg-[#8a6270] transition-colors flex items-center gap-2 shadow-sm"
                data-testid="button-compose-email"
              >
                <Mail size={16} />
                Send Email
              </button>
              <div className="flex items-center gap-2">
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full hover:bg-black/10 transition-colors" data-testid="link-instagram">
                  <Instagram size={16} className="ink-soft" />
                </a>
                <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full hover:bg-black/10 transition-colors" data-testid="link-tiktok">
                  <span className="text-sm font-bold ink-soft">TT</span>
                </a>
                <a href="https://pinterest.com" target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-full hover:bg-black/10 transition-colors" data-testid="link-pinterest">
                  <span className="text-sm font-bold ink-soft">P</span>
                </a>
              </div>
              <Link href={`/${user?.artistSlug || user?.id}`} className="text-xs ink-soft hover:ink-main flex items-center gap-1 transition-colors" data-testid="link-my-profile">
                <Eye size={14} /> My Public Profile
              </Link>
              <Link href="/artist/schedules" className="text-xs ink-soft hover:ink-main flex items-center gap-1 transition-colors" data-testid="link-schedule-maker">
                <Clock size={14} /> Day-Of Schedule
              </Link>
              <Link href="/artist/contracts" className="text-xs ink-soft hover:ink-main flex items-center gap-1 transition-colors" data-testid="link-contracts">
                <FileText size={14} /> Contracts
              </Link>
              <Link href="/settings" className="text-xs ink-soft hover:ink-main flex items-center gap-1 transition-colors" data-testid="link-settings">
                <Settings size={14} /> Settings
              </Link>
              <a href="/api/logout" className="text-xs ink-soft hover:ink-main flex items-center gap-1 transition-colors">
                <LogOut size={14} /> Logout
              </a>
              <Link href="/" className="text-[0.7rem] ink-soft underline">
                Back to home
              </Link>
            </div>
          </header>

          {/* HEADER - Mobile */}
          <header className="md:hidden mb-4">
            <div className="flex items-center gap-3 mb-3">
              <div 
                onClick={() => !uploadingImage && profileInputRef.current?.click()}
                className="w-14 h-14 rounded-full bg-gray-200 border-2 border-[#c5ccd8] cursor-pointer overflow-hidden flex items-center justify-center flex-shrink-0"
              >
                {uploadingImage ? (
                  <Loader2 size={18} className="text-gray-400 animate-spin" />
                ) : profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={18} className="text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <h1 className="font-serif text-2xl tracking-tight ink-main">Your Secretary</h1>
                <p className="font-serif text-lg ink-main">Bonjour, {user?.firstName || 'there'}</p>
              </div>
              <button
                onClick={() => setShowComposeEmail(true)}
                className="px-3 py-2 bg-[#6B4A55] text-white text-xs rounded-lg flex items-center gap-1"
                data-testid="button-compose-email-mobile"
              >
                <Mail size={14} />
                Email
              </button>
            </div>
            
            {/* Mobile Info Menu */}
            <div className="card-frame rounded-md overflow-hidden">
              <button
                onClick={() => setShowMobileInfo(!showMobileInfo)}
                className="w-full px-4 py-3 flex items-center justify-between bg-white"
                data-testid="button-mobile-info"
              >
                <span className="flex items-center gap-2 text-sm font-medium ink-main">
                  <Info size={16} /> Info & Settings
                </span>
                {showMobileInfo ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {showMobileInfo && (
                <div className="border-t border-[#e5e8f2] bg-[#fbfcff]">
                  <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 border-b border-[#e5e8f2]">
                    <Settings size={16} className="ink-soft" /> 
                    <span>Settings</span>
                  </Link>
                  <Link 
                    href={`/${user?.artistSlug || user?.id}`}
                    className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 border-b border-[#e5e8f2]"
                    data-testid="link-view-as-client"
                  >
                    <Eye size={16} className="ink-soft" /> 
                    <span>View as Client</span>
                  </Link>
                  <Link href="/artist/profile" className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 border-b border-[#e5e8f2]">
                    <User size={16} className="ink-soft" /> 
                    <span>Personal Info</span>
                  </Link>
                  <Link href="/artist/rolodex" className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 border-b border-[#e5e8f2]">
                    <BookUser size={16} className="ink-soft" /> 
                    <span>Your Network</span>
                  </Link>
                  <Link href="/artist/proposals" className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 border-b border-[#e5e8f2]">
                    <Send size={16} className="ink-soft" /> 
                    <span>Proposals</span>
                  </Link>
                  <Link href="/artist/messages" className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 border-b border-[#e5e8f2]">
                    <MessageSquare size={16} className="ink-soft" /> 
                    <span>Client Messages</span>
                  </Link>
                  <Link href="/artist/schedules" className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 border-b border-[#e5e8f2]">
                    <Clock size={16} className="ink-soft" /> 
                    <span>Day-Of Schedule</span>
                  </Link>
                  <Link href="/artist/contracts" className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 border-b border-[#e5e8f2]">
                    <FileText size={16} className="ink-soft" /> 
                    <span>Contracts</span>
                  </Link>
                  <a href="/api/logout" className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 text-red-600">
                    <LogOut size={16} /> 
                    <span>Logout</span>
                  </a>
                </div>
              )}
            </div>
          </header>

          {/* MY SCHEDULE LINK - Hero Section */}
          <section className="mb-6" data-testid="section-schedule-link-hero">
            <div className="card-frame rounded-md px-5 py-4 bg-gradient-to-r from-[#FAF7F2] to-[#F5F0EA] border-2 border-[#6B4A55]/30">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="font-header text-lg ink-main flex items-center gap-2">
                    <Globe size={18} className="text-[#6B4A55]" />
                    My Schedule Link
                  </h2>
                  <p className="text-xs ink-soft mt-1">Share this link so clients can book with you directly</p>
                  <p className="text-xs font-mono bg-white px-2 py-1 rounded mt-2 border border-[#e5e8f2] inline-block" data-testid="text-schedule-url">
                    atbriarwood.com/{user?.artistSlug || user?.id}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const url = `https://atbriarwood.com/${user?.artistSlug || user?.id}`;
                    navigator.clipboard.writeText(url);
                    toast({
                      title: "Link Copied!",
                      description: "Share this link with clients to let them book with you.",
                    });
                  }}
                  className="px-4 py-2 bg-[#6B4A55] text-white text-sm rounded-lg hover:bg-[#8a6270] transition-colors flex items-center gap-2 shadow-sm"
                  data-testid="button-copy-schedule-link"
                >
                  <Copy size={14} />
                  Copy Link
                </button>
              </div>
            </div>
          </section>

          {/* GRID LAYOUT */}
          <section className="grid md:grid-cols-3 gap-4 md:gap-6 items-start">
            
            {/* LEFT COLUMN */}
            <div className="md:col-span-2 space-y-6">
              
              {view === "overview" ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Inbox - Combined requests and inquiries */}
                    <div className="space-y-4">
                      <div className="card-frame rounded-md px-5 py-4" data-testid="section-inbox">
                        <h2 className="font-header text-md ink-main mb-3 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Mail size={14} /> Inbox
                          </span>
                          {(requests.length + inquiries.filter(i => i.status === 'pending').length) > 0 && (
                            <span className="bg-pink/20 text-pink text-[0.6rem] px-2 py-1 rounded-full font-sans uppercase tracking-wide font-semibold">
                              {requests.length + inquiries.filter(i => i.status === 'pending').length} New
                            </span>
                          )}
                        </h2>
                        
                        {/* Quick Actions */}
                        <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-[#e5e8f2]">
                          <Link 
                            href="/artist/import" 
                            className="px-2.5 py-1 bg-[#6B4A55] text-white text-[0.6rem] rounded hover:bg-[#8a6270] transition-colors flex items-center gap-1"
                            data-testid="link-add-inquiry"
                          >
                            <Plus size={10} />
                            Add
                          </Link>
                          <Link 
                            href="/artist/proposals" 
                            className="px-2.5 py-1 bg-white border border-gray-200 text-gray-600 text-[0.6rem] rounded hover:bg-gray-50 transition-colors flex items-center gap-1"
                            data-testid="link-new-proposal"
                          >
                            <FileText size={10} />
                            Proposal
                          </Link>
                          <Link 
                            href="/artist/messages" 
                            className="px-2.5 py-1 bg-white border border-gray-200 text-gray-600 text-[0.6rem] rounded hover:bg-gray-50 transition-colors flex items-center gap-1"
                            data-testid="link-send-info"
                          >
                            <Send size={10} />
                            Send Info
                          </Link>
                          <Link 
                            href="/inquiry-workspace" 
                            className="px-2.5 py-1 bg-white border border-gray-200 text-gray-600 text-[0.6rem] rounded hover:bg-gray-50 transition-colors flex items-center gap-1"
                            data-testid="link-inquiry-workspace"
                          >
                            <Mail size={10} />
                            Inquiry Workspace
                          </Link>
                        </div>

                        {inquiriesLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 size={16} className="animate-spin text-gray-400" />
                          </div>
                        ) : (requests.length === 0 && inquiries.length === 0) ? (
                          <p className="text-xs ink-soft italic">No messages yet. New requests will appear here.</p>
                        ) : (
                          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                            {/* Service Requests */}
                            {requests.map(req => (
                              <div key={`req-${req.id}`} className="border border-[#e5e8f2] bg-[#fbfcff] p-2 rounded-md text-xs">
                                <div className="flex justify-between items-start mb-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-header text-xs ink-main">{req.name}</h3>
                                    <span className="bg-[#6B4A55]/10 text-[#6B4A55] text-[0.5rem] px-1.5 py-0.5 rounded-full font-semibold uppercase">Request</span>
                                  </div>
                                  <p className="text-[0.6rem] ink-soft">{req.date}</p>
                                </div>
                                <p className="text-[0.65rem] ink-soft mb-2">{req.service}</p>
                                <div className="flex gap-1">
                                  <button 
                                    onClick={() => declineRequest(req.id)}
                                    className="flex-1 py-1 rounded-md border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-600 transition-colors flex justify-center"
                                    title="Decline"
                                  >
                                    <X size={12} />
                                  </button>
                                  <button 
                                    onClick={() => acceptRequest(req)}
                                    className="flex-1 py-1 rounded-md bg-[#6B4A55] text-white hover:bg-[#5A1F2B] transition-colors flex justify-center"
                                    title="Accept"
                                  >
                                    <Check size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            
                            {/* Inquiries */}
                            {inquiries.map(inquiry => {
                              // Compute status info for inline display
                              const isHold = inquiry.status === 'hold' && (inquiry.hold?.expiresAt || inquiry.holdExpiresAt);
                              const hasNextAction = inquiry.nextAction && inquiry.nextActionDueAt;
                              const actionInfo = formatNextAction(inquiry.nextAction);
                              const slaCountdown = getSlaCountdown(isHold ? (inquiry.hold?.expiresAt || inquiry.holdExpiresAt) : inquiry.nextActionDueAt);
                              const isActionable = inquiry.status === 'pending' || inquiry.status === 'hold';
                              
                              // Countdown colors
                              const countdownColor = isHold 
                                ? 'text-orange-600 bg-orange-50' 
                                : slaCountdown?.isOverdue 
                                  ? 'text-red-600 bg-red-50' 
                                  : slaCountdown?.isUrgent 
                                    ? 'text-yellow-700 bg-yellow-50' 
                                    : 'text-blue-600 bg-blue-50';
                              
                              return (
                              <div 
                                key={inquiry.id} 
                                className="border border-[#e5e8f2] bg-[#fbfcff] rounded-md text-xs overflow-hidden"
                                data-testid={`inquiry-card-${inquiry.id}`}
                              >
                                {/* One-Tap Card Header - Always visible with inline actions */}
                                <div className="p-2.5">
                                  {/* Row 1: Client name, date, service + status badge */}
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <h3 className="font-header text-xs ink-main truncate">{inquiry.clientName}</h3>
                                      {inquiry.status === 'pending' && (
                                        <span className="bg-[#6B4A55]/10 text-[#6B4A55] text-[0.5rem] px-1.5 py-0.5 rounded-full font-semibold uppercase flex-shrink-0">New</span>
                                      )}
                                      {inquiry.status === 'hold' && (
                                        <span className="bg-orange-100 text-orange-700 text-[0.5rem] px-1.5 py-0.5 rounded-full font-semibold uppercase flex-shrink-0">Hold</span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => setExpandedInquiry(expandedInquiry === inquiry.id ? null : inquiry.id)}
                                      className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                                      data-testid={`button-expand-inquiry-${inquiry.id}`}
                                    >
                                      <ChevronDown size={12} className={`ink-soft transition-transform ${expandedInquiry === inquiry.id ? 'rotate-180' : ''}`} />
                                    </button>
                                  </div>
                                  
                                  {/* Row 2: Date, service, owner & countdown inline */}
                                  <div className="flex items-center gap-2 text-[0.6rem] ink-soft mb-2 flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <Calendar size={9} />
                                      {new Date(inquiry.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                    <span className="text-gray-300">•</span>
                                    <span className="truncate max-w-[80px]">{inquiry.serviceType}</span>
                                    {inquiry.createdAt && (
                                      <>
                                        <span className="text-gray-300">•</span>
                                        <span className="text-[0.55rem] ink-soft">
                                          Received {new Date(inquiry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                      </>
                                    )}
                                    {inquiry.breachFlags && inquiry.breachFlags.length > 0 && (
                                      <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[0.5rem] font-bold uppercase flex items-center gap-0.5">
                                        <AlertCircle size={8} />
                                        SLA!
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Row 3: One-Tap Action Buttons - Always visible for actionable inquiries */}
                                  {isActionable && (
                                    <div className="flex gap-1.5">
                                      {/* Confirm - Primary */}
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleConfirmInquiry(inquiry.id); }}
                                        disabled={confirmingInquiry === inquiry.id}
                                        className="flex-1 py-1.5 rounded bg-[#6B4A55] text-white text-[0.6rem] font-medium hover:bg-[#5A1F2B] transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                                        data-testid={`button-confirm-inquiry-${inquiry.id}`}
                                      >
                                        {confirmingInquiry === inquiry.id ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />}
                                        Confirm
                                      </button>
                                      
                                      {/* Hold - Only if not already on hold */}
                                      {inquiry.status !== 'hold' && (
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleHoldInquiry(inquiry.id, 24); }}
                                          disabled={holdingInquiry === inquiry.id}
                                          className="flex-1 py-1.5 rounded bg-orange-500 text-white text-[0.6rem] font-medium hover:bg-orange-600 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                                          data-testid={`button-hold-inquiry-${inquiry.id}`}
                                        >
                                          {holdingInquiry === inquiry.id ? <Loader2 size={10} className="animate-spin" /> : <Clock size={10} />}
                                          Hold
                                        </button>
                                      )}
                                      
                                      {/* Propose */}
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setProposeInquiryId(inquiry.id); setShowProposeModal(true); }}
                                        className="flex-1 py-1.5 rounded bg-[#B8D4E3] text-[#5A1F2B] text-[0.6rem] font-medium hover:bg-[#a8c4d3] transition-colors flex items-center justify-center gap-1"
                                        data-testid={`button-propose-dates-${inquiry.id}`}
                                      >
                                        <Calendar size={10} />
                                        Propose
                                      </button>
                                      
                                      {/* Decline - Icon only */}
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeclineReferralInquiry({
                                            id: inquiry.id,
                                            clientName: inquiry.clientName,
                                            clientEmail: inquiry.clientEmail,
                                            eventDate: inquiry.eventDate,
                                            eventType: inquiry.eventType,
                                            serviceType: inquiry.serviceType,
                                          });
                                          setShowDeclineReferralModal(true);
                                        }}
                                        className="py-1.5 px-2 rounded border border-gray-200 text-gray-400 hover:border-[#5A1F2B] hover:text-[#5A1F2B] transition-colors"
                                        title="Decline & Refer"
                                        data-testid={`button-decline-inquiry-${inquiry.id}`}
                                      >
                                        <UserPlus size={10} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Expanded Details - Additional info on tap */}
                                {expandedInquiry === inquiry.id && (
                                  <div className="px-2.5 pb-2.5 border-t border-[#e5e8f2]">
                                    <div className="pt-2.5 space-y-2">
                                      <p className="text-[0.65rem] ink-soft">{inquiry.clientEmail}</p>
                                      {inquiry.clientPhone && (
                                        <p className="text-[0.65rem] ink-soft">{inquiry.clientPhone}</p>
                                      )}
                                      <div className="flex flex-wrap gap-2 text-[0.65rem] ink-soft">
                                        {inquiry.partySize && <span>Party of {inquiry.partySize}</span>}
                                        {inquiry.budget && <span>• Budget: ${inquiry.budget}</span>}
                                      </div>
                                      {inquiry.message && (
                                        <p className="text-[0.65rem] ink-soft italic bg-[#FAF9F7] p-2 rounded">"{inquiry.message}"</p>
                                      )}
                                      
                                      {/* Quick Reply Button */}
                                      <button
                                        onClick={() => {
                                          setQuickReplyInquiry({
                                            id: inquiry.id,
                                            clientName: inquiry.clientName,
                                            clientEmail: inquiry.clientEmail,
                                          });
                                          setShowQuickReplyModal(true);
                                        }}
                                        className="w-full py-2 bg-[#5A1F2B] text-white text-[0.7rem] font-medium rounded flex items-center justify-center gap-2 hover:bg-[#4a1923] transition-colors"
                                        data-testid={`button-quick-reply-${inquiry.id}`}
                                      >
                                        <MessageCircle size={12} />
                                        Reply to {inquiry.clientName.split(' ')[0]}
                                      </button>
                                      
                                      {/* Timeline Toggle Button */}
                                      <button
                                        onClick={() => fetchInquiryTimeline(inquiry.id)}
                                        className="mt-3 w-full py-1.5 text-[0.6rem] text-gray-500 hover:text-gray-700 border border-gray-200 rounded flex items-center justify-center gap-1 transition-colors"
                                        data-testid={`button-timeline-${inquiry.id}`}
                                      >
                                        {loadingTimeline && showTimelineId === inquiry.id ? (
                                          <Loader2 size={10} className="animate-spin" />
                                        ) : (
                                          <FileText size={10} />
                                        )}
                                        <span>{showTimelineId === inquiry.id ? 'Hide Timeline' : 'View Timeline'}</span>
                                      </button>
                                      
                                      {/* Timeline Pane */}
                                      {showTimelineId === inquiry.id && (
                                        <div className="mt-2 border-t border-gray-100 pt-2">
                                          {loadingTimeline ? (
                                            <div className="flex items-center justify-center py-4">
                                              <Loader2 size={16} className="animate-spin text-gray-400" />
                                              <span className="ml-2 text-[0.6rem] text-gray-400">Loading timeline...</span>
                                            </div>
                                          ) : timelineData ? (
                                            <div className="space-y-2">
                                              {/* SLA Summary Banner */}
                                              <div className="text-[0.55rem] font-semibold uppercase tracking-wider text-gray-500 mb-1">Inquiry Timeline</div>
                                              
                                              {/* Key timestamps */}
                                              <div className="grid grid-cols-2 gap-2 text-[0.6rem]">
                                                <div className="bg-gray-50 rounded p-1.5">
                                                  <span className="text-gray-500">Received:</span>
                                                  <span className="ml-1 text-gray-700">
                                                    {timelineData.receivedAt ? new Date(timelineData.receivedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'N/A'}
                                                  </span>
                                                </div>
                                                <div className={`rounded p-1.5 ${timelineData.firstResponseAt ? 'bg-blue-50' : 'bg-yellow-50'}`}>
                                                  <span className={timelineData.firstResponseAt ? 'text-blue-600' : 'text-yellow-600'}>1st Response:</span>
                                                  <span className={`ml-1 ${timelineData.firstResponseAt ? 'text-blue-700' : 'text-yellow-700'}`}>
                                                    {timelineData.firstResponseAt 
                                                      ? new Date(timelineData.firstResponseAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                                                      : 'Pending'}
                                                  </span>
                                                </div>
                                              </div>
                                              
                                              {/* SLA Status */}
                                              {timelineData.slaBreached ? (
                                                <div className="bg-red-50 border border-red-200 rounded p-1.5 flex items-center gap-1">
                                                  <AlertCircle size={10} className="text-red-500" />
                                                  <span className="text-[0.6rem] text-red-600 font-medium">SLA Breached - Response overdue</span>
                                                </div>
                                              ) : timelineData.nextSlaDue ? (
                                                <div className="bg-green-50 border border-green-200 rounded p-1.5 flex items-center gap-1">
                                                  <Check size={10} className="text-green-500" />
                                                  <span className="text-[0.6rem] text-green-600">SLA on track - Next due: {new Date(timelineData.nextSlaDue).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                                                </div>
                                              ) : null}
                                              
                                              {/* Event timeline */}
                                              {timelineData.events.length > 0 ? (
                                                <div className="space-y-1 pt-1">
                                                  <div className="text-[0.55rem] font-semibold uppercase tracking-wider text-gray-400">Activity</div>
                                                  {timelineData.events.slice(0, 5).map((event, idx) => (
                                                    <div key={event.id || idx} className="flex items-start gap-2 text-[0.6rem]">
                                                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1 flex-shrink-0" />
                                                      <div className="flex-1">
                                                        <span className="text-gray-700">{formatTimelineAction(event.action)}</span>
                                                        {event.actorRole && (
                                                          <span className="text-gray-500 ml-1">by {formatActorRole(event.actorRole)}</span>
                                                        )}
                                                        <span className="text-gray-400 ml-1">
                                                          {new Date(event.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                                        </span>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                <p className="text-[0.6rem] text-gray-400 text-center py-2">No activity events recorded yet</p>
                                              )}
                                            </div>
                                          ) : null}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Manage Section - Collapsible */}
                      <div className="card-frame rounded-md overflow-hidden" data-testid="section-manage-collapsible">
                        <button
                          onClick={() => setShowManageSection(!showManageSection)}
                          className="w-full px-5 py-3 flex items-center justify-between bg-[#FAF7F2] hover:bg-[#F5F0EA] transition-colors"
                          data-testid="button-toggle-manage"
                        >
                          <span className="flex items-center gap-2 font-header text-md ink-main">
                            <Settings size={16} className="text-[#6B4A55]" />
                            Manage
                            <span className="text-[0.65rem] font-normal ink-soft">(Portfolio, Contracts, Payments)</span>
                          </span>
                          {showManageSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                        
                        {showManageSection && (
                          <div className="border-t border-[#e5e8f2] bg-white">
                            {/* Portfolio Gallery */}
                            <div className="px-5 py-4 border-b border-[#e5e8f2]">
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-header text-sm ink-main flex items-center gap-2">
                                  <ImageIcon size={14} /> My Portfolio
                                </h3>
                                <label className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-black text-white rounded hover:bg-gray-800 transition-colors cursor-pointer">
                                  {uploadingPortfolio ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : (
                                    <Plus size={14} />
                                  )}
                                  <span>{uploadingPortfolio ? 'Uploading...' : 'Add Photo'}</span>
                                  <input
                                    ref={portfolioInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handlePortfolioUpload}
                                    className="hidden"
                                    disabled={uploadingPortfolio}
                                    data-testid="input-portfolio-upload"
                                  />
                                </label>
                              </div>
                              
                              {portfolioUrls.length === 0 ? (
                                <div className="bg-[#fbfcff] border border-dashed border-[#c5ccd8] rounded-md p-4 flex flex-col items-center justify-center text-center">
                                  <ImageIcon size={20} className="text-gray-400 mb-2" />
                                  <p className="text-xs ink-soft">No portfolio photos yet</p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-4 gap-2 max-h-[120px] overflow-y-auto">
                                  {portfolioUrls.map((url, index) => (
                                    <div key={index} className="relative group aspect-square">
                                      <img
                                        src={url}
                                        alt={`Portfolio ${index + 1}`}
                                        className="w-full h-full object-cover rounded-md border border-[#c5ccd8]"
                                        data-testid={`img-portfolio-${index}`}
                                      />
                                      <button
                                        onClick={() => handleDeletePortfolioPhoto(url)}
                                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Remove photo"
                                        data-testid={`button-delete-portfolio-${index}`}
                                      >
                                        <X size={10} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Contracts & Payments - Compact Row */}
                            <div className="px-5 py-4 grid grid-cols-2 gap-4">
                              {/* Contracts */}
                              <div>
                                <h3 className="font-header text-sm ink-main mb-2 flex items-center gap-2">
                                  <FileText size={14} /> Contracts
                                </h3>
                                <Link 
                                  href="/artist/contracts"
                                  className="bg-[#fbfcff] border border-dashed border-[#c5ccd8] rounded-md p-3 flex items-center justify-center gap-2 text-center cursor-pointer hover:bg-white hover:border-black transition-colors group"
                                  data-testid="link-create-contract"
                                >
                                  <Plus size={14} className="group-hover:text-black" />
                                  <span className="text-xs font-medium ink-main">New Contract</span>
                                </Link>
                              </div>

                              {/* Payments */}
                              <div>
                                <h3 className="font-header text-sm ink-main mb-2 flex items-center gap-2">
                                  <DollarSign size={14} /> Payments
                                </h3>
                                <div className="flex gap-2">
                                  <button 
                                    className="flex-1 flex items-center justify-center gap-1.5 p-2.5 border border-[#c5ccd8] rounded bg-white hover:border-black transition-colors text-xs"
                                    onClick={() => setShowInvoiceModal(true)}
                                    data-testid="button-send-invoice"
                                  >
                                    <Send size={12} />
                                    Invoice
                                  </button>
                                  
                                  <button 
                                    onClick={handleSquareConnect}
                                    disabled={squareLoading}
                                    className="flex-1 flex items-center justify-center gap-1.5 p-2.5 border border-[#c5ccd8] rounded bg-white hover:border-black transition-colors disabled:opacity-50 text-xs"
                                    data-testid="button-square-connect"
                                  >
                                    <CreditCard size={12} />
                                    {squareLoading ? '...' : 'Setup'}
                                  </button>
                                </div>
                                {squareStatus?.connected && squareStatus.paymentsEnabled && (
                                  <div className="flex items-center gap-1 mt-2 text-[0.6rem] text-green-600">
                                    <Check size={10} />
                                    Square ready
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Client Folders */}
                    <div className="card-frame rounded-md px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="font-header text-md ink-main">
                          Client Folders
                        </h2>
                        <button
                          onClick={() => setShowCreateBooking(true)}
                          className="flex items-center justify-center gap-0 md:gap-1 p-2 md:px-2.5 md:py-1.5 text-xs bg-black text-white rounded-full md:rounded hover:bg-gray-800 transition-colors"
                          data-testid="button-open-create-booking"
                          title="Add Booking"
                        >
                          <Plus size={16} className="md:w-3.5 md:h-3.5" />
                          <span className="hidden md:inline">Add Booking</span>
                        </button>
                      </div>
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="Search clients by name..." 
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="w-full pl-10 pr-10 py-2.5 text-sm border border-[#c5ccd8] rounded-lg bg-[#fbfcff] focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                          data-testid="input-client-search"
                        />
                        <button
                          onClick={() => {
                            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                              const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
                              const recognition = new SpeechRecognition();
                              recognition.lang = 'en-US';
                              recognition.onresult = (event: any) => {
                                const transcript = event.results[0][0].transcript;
                                setClientSearch(transcript);
                              };
                              recognition.start();
                            }
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                          title="Voice search"
                          data-testid="button-voice-search"
                        >
                          <Mic size={16} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                        {filteredClients.map((client) => (
                          <div 
                            key={client.id}
                            className="border border-[#c5ccd8] bg-[#fbfcff] rounded-lg p-3 hover:border-black hover:bg-white transition-all group cursor-pointer aspect-square flex flex-col items-center justify-center text-center"
                            onClick={() => openClientFolder(client.id)}
                            data-testid={`folder-client-${client.id}`}
                          >
                            <div className="bg-pink/10 p-2 rounded-full mb-2">
                              <Folder className="text-pink group-hover:text-black transition-colors" size={20} />
                            </div>
                            <h3 className="font-header text-xs ink-main leading-tight px-1 break-words">{client.name}</h3>
                            <p className="text-[0.6rem] ink-soft mt-1">{client.date}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* IQS Lead Quality Warnings Panel - HIDDEN FOR NOW */}
                  {false && showIqsPanel && (
                    <div className="card-frame rounded-md px-5 py-4">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="font-header text-md ink-main flex items-center gap-2">
                          <ShieldAlert size={14} className="text-orange-500" /> Lead Quality Alerts
                        </h2>
                        <button
                          onClick={() => setShowIqsPanel(false)}
                          className="text-xs ink-soft hover:ink-main"
                          data-testid="button-hide-iqs-panel"
                        >
                          Hide
                        </button>
                      </div>
                      
                      {iqsLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="animate-spin text-gray-400" size={20} />
                          <span className="ml-2 text-xs ink-soft">Analyzing leads...</span>
                        </div>
                      ) : iqsWarnings.length === 0 ? (
                        <div className="bg-green-50 border border-green-200 rounded-md p-4 text-center">
                          <Check size={20} className="mx-auto text-green-600 mb-2" />
                          <p className="text-xs text-green-800 font-medium">All Clear!</p>
                          <p className="text-[0.65rem] text-green-700 mt-1">No red flags detected in your current leads</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                          {iqsWarnings.map((warning) => (
                            <div 
                              key={warning.leadScore.id}
                              className={`border rounded-md p-3 ${getRiskLevelColor(warning.leadScore.riskLevel)}`}
                              data-testid={`iqs-warning-${warning.leadScore.id}`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Flag size={14} />
                                  <span className="text-xs font-semibold">{getRiskLevelLabel(warning.leadScore.riskLevel)}</span>
                                  <span className="text-[0.65rem] opacity-70">Score: {warning.leadScore.score}/100</span>
                                </div>
                                {warning.leadScore.vendorRating && (
                                  <span className="text-[0.6rem] px-2 py-0.5 bg-black/10 rounded">
                                    Marked: {warning.leadScore.vendorRating}
                                  </span>
                                )}
                              </div>
                              
                              {warning.topRedFlags.length > 0 && (
                                <div className="mb-2">
                                  <p className="text-[0.65rem] font-medium mb-1">Red Flags Detected:</p>
                                  <ul className="space-y-1">
                                    {warning.topRedFlags.map((flag, idx) => (
                                      <li key={idx} className="text-[0.65rem] flex items-start gap-1">
                                        <AlertCircle size={10} className="mt-0.5 flex-shrink-0" />
                                        <span>{flag.description}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {warning.leadScore.aiSummary && (
                                <p className="text-[0.65rem] italic mb-2 opacity-80">
                                  "{warning.leadScore.aiSummary}"
                                </p>
                              )}
                              
                              {!warning.leadScore.vendorRating && (
                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-current/20">
                                  <span className="text-[0.6rem]">Was this accurate?</span>
                                  <button
                                    onClick={() => handleIqsFeedback(warning.leadScore.id, 'weird')}
                                    disabled={submittingFeedback === warning.leadScore.id}
                                    className="flex items-center gap-1 px-2 py-1 text-[0.6rem] bg-white/50 hover:bg-white/80 rounded border border-current/30 transition-colors disabled:opacity-50"
                                    data-testid={`button-iqs-weird-${warning.leadScore.id}`}
                                  >
                                    <ThumbsUp size={10} /> Yes, Weird
                                  </button>
                                  <button
                                    onClick={() => handleIqsFeedback(warning.leadScore.id, 'trustworthy')}
                                    disabled={submittingFeedback === warning.leadScore.id}
                                    className="flex items-center gap-1 px-2 py-1 text-[0.6rem] bg-white/50 hover:bg-white/80 rounded border border-current/30 transition-colors disabled:opacity-50"
                                    data-testid={`button-iqs-trustworthy-${warning.leadScore.id}`}
                                  >
                                    <ThumbsDown size={10} /> No, Trustworthy
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <p className="text-[0.6rem] ink-soft mt-3 text-center">
                        AI analyzes interaction patterns to help you spot potential time-wasters
                      </p>
                    </div>
                  )}

                  {/* Thank You Note Button */}
                  <div 
                    onClick={() => setShowThankYouModal(true)}
                    className="card-frame rounded-md px-5 py-4 cursor-pointer hover:border-black transition-colors group"
                    data-testid="button-thank-you"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-pink/20 rounded-full group-hover:bg-pink/40 transition-colors">
                        <Send size={20} className="text-pink" />
                      </div>
                      <div>
                        <h3 className="font-header text-sm ink-main">Send a Thank You Note</h3>
                        <p className="text-[0.7rem] ink-soft">Voice or text — show appreciation to your clients and planners</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* VIEW: INDIVIDUAL CLIENT FOLDER */
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => { setView("overview"); setSelectedBooking(null); setIsEditingBooking(false); }} className="text-xs flex items-center gap-1 hover:underline ink-soft">
                      <ArrowLeft size={12} /> Back to Overview
                    </button>
                    <span className="text-xs text-gray-300">|</span>
                    <span className="text-xs font-semibold">{selectedClient} Folder</span>
                  </div>

                  {/* Booking Details - Editable */}
                  <div className="card-frame rounded-md px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-header text-md ink-main flex items-center gap-2">
                        <User size={14} /> Booking Details
                      </h3>
                      {!isEditingBooking ? (
                        <button 
                          onClick={() => setIsEditingBooking(true)}
                          className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                          data-testid="button-edit-booking"
                        >
                          <Settings size={12} /> Edit
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              // Reset form to original booking data
                              setEditBookingForm({
                                clientName: selectedBooking?.name || "",
                                clientEmail: selectedBooking?.clientEmail || "",
                                serviceType: selectedBooking?.serviceType || "Bridal Beauty",
                                eventDate: selectedBooking?.rawEventDate || "",
                                eventTime: selectedBooking?.eventTime || "",
                                location: selectedBooking?.location || "",
                              });
                              setIsEditingBooking(false);
                            }}
                            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleSaveBookingEdit}
                            disabled={savingBooking}
                            className="px-3 py-1 text-xs bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 transition-colors"
                            data-testid="button-save-booking"
                          >
                            {savingBooking ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {isEditingBooking ? (
                      <div className="space-y-3 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block mb-1 ink-soft uppercase tracking-wide text-[0.65rem]">Client Name</label>
                            <input 
                              type="text" 
                              value={editBookingForm.clientName}
                              onChange={(e) => setEditBookingForm(prev => ({ ...prev, clientName: e.target.value }))}
                              className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-2 py-1.5 focus:outline-none focus:border-black"
                              data-testid="input-edit-client-name"
                            />
                          </div>
                          <div>
                            <label className="block mb-1 ink-soft uppercase tracking-wide text-[0.65rem]">Client Email</label>
                            <input 
                              type="email" 
                              value={editBookingForm.clientEmail}
                              onChange={(e) => setEditBookingForm(prev => ({ ...prev, clientEmail: e.target.value }))}
                              className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-2 py-1.5 focus:outline-none focus:border-black"
                              data-testid="input-edit-client-email"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block mb-1 ink-soft uppercase tracking-wide text-[0.65rem]">Service Type</label>
                            <select 
                              value={editBookingForm.serviceType}
                              onChange={(e) => setEditBookingForm(prev => ({ ...prev, serviceType: e.target.value }))}
                              className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-2 py-1.5 focus:outline-none focus:border-black"
                              data-testid="select-edit-service-type"
                            >
                              <option value="Bridal Beauty">Bridal Beauty</option>
                              <option value="Hair Only">Hair Only</option>
                              <option value="Makeup Only">Makeup Only</option>
                              <option value="Hair & Makeup">Hair & Makeup</option>
                              <option value="Engagement Shoot">Engagement Shoot</option>
                              <option value="Trial Session">Trial Session</option>
                              <option value="Wedding Party">Wedding Party</option>
                            </select>
                          </div>
                          <div>
                            <label className="block mb-1 ink-soft uppercase tracking-wide text-[0.65rem]">Event Date</label>
                            <input 
                              type="date" 
                              value={editBookingForm.eventDate}
                              onChange={(e) => setEditBookingForm(prev => ({ ...prev, eventDate: e.target.value }))}
                              className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-2 py-1.5 focus:outline-none focus:border-black"
                              data-testid="input-edit-event-date"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block mb-1 ink-soft uppercase tracking-wide text-[0.65rem]">Event Time</label>
                            <input 
                              type="time" 
                              value={editBookingForm.eventTime}
                              onChange={(e) => setEditBookingForm(prev => ({ ...prev, eventTime: e.target.value }))}
                              className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-2 py-1.5 focus:outline-none focus:border-black"
                              data-testid="input-edit-event-time"
                            />
                          </div>
                          <div>
                            <label className="block mb-1 ink-soft uppercase tracking-wide text-[0.65rem]">Location</label>
                            <input 
                              type="text" 
                              value={editBookingForm.location}
                              onChange={(e) => setEditBookingForm(prev => ({ ...prev, location: e.target.value }))}
                              className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-2 py-1.5 focus:outline-none focus:border-black"
                              data-testid="input-edit-location"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-[#fbfcff] border border-[#e5e8f2] p-2 rounded">
                            <p className="text-[0.65rem] ink-soft uppercase tracking-wide mb-1">Client</p>
                            <p className="font-medium">{selectedBooking?.name || 'N/A'}</p>
                            <p className="text-gray-500">{selectedBooking?.clientEmail || 'No email'}</p>
                          </div>
                          <div className="bg-[#fbfcff] border border-[#e5e8f2] p-2 rounded">
                            <p className="text-[0.65rem] ink-soft uppercase tracking-wide mb-1">Service</p>
                            <p className="font-medium">{selectedBooking?.serviceType || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-[#fbfcff] border border-[#e5e8f2] p-2 rounded">
                            <p className="text-[0.65rem] ink-soft uppercase tracking-wide mb-1">Date</p>
                            <p className="font-medium">{selectedBooking?.date || 'N/A'}</p>
                          </div>
                          <div className="bg-[#fbfcff] border border-[#e5e8f2] p-2 rounded">
                            <p className="text-[0.65rem] ink-soft uppercase tracking-wide mb-1">Location</p>
                            <p className="font-medium">{selectedBooking?.location || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Schedule Creator Link */}
                  <Link 
                    href={`/artist/schedule-creator${selectedBooking?.id ? `?bookingId=${selectedBooking.id}` : ''}`}
                    className="card-frame rounded-md px-5 py-4 block hover:border-black transition-colors group"
                    data-testid="link-create-schedule"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-powder-blue rounded-full group-hover:bg-black transition-colors">
                          <Calendar size={18} className="text-black group-hover:text-white transition-colors" />
                        </div>
                        <div>
                          <h3 className="font-header text-sm ink-main">Create Day-of Schedule</h3>
                          <p className="text-[0.65rem] ink-soft">Build a detailed timeline for this event</p>
                        </div>
                      </div>
                      <ArrowLeft size={16} className="rotate-180 ink-soft group-hover:ink-main transition-colors" />
                    </div>
                  </Link>

                  <div className="card-frame rounded-md px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-header text-md ink-main flex items-center gap-2">
                        <ImageIcon size={14} /> Desired Looks & Photos
                      </h3>
                      <label className="flex items-center gap-1 px-2 py-1 text-xs bg-black text-white rounded cursor-pointer hover:bg-gray-800 transition-colors">
                        <Paperclip size={12} /> Upload
                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                          if (e.target.files) {
                            toast({ title: "Photos uploaded", description: `${e.target.files.length} file(s) added` });
                          }
                        }} />
                      </label>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="aspect-square bg-gray-100 rounded border border-[#e5e8f2] flex items-center justify-center text-[0.6rem] text-gray-400 hover:border-black cursor-pointer transition-colors">
                          Look {i}
                        </div>
                      ))}
                      <div className="aspect-square bg-gray-50 rounded border-2 border-dashed border-[#c5ccd8] flex flex-col items-center justify-center text-[0.6rem] text-gray-400 hover:border-black cursor-pointer transition-colors">
                        <Plus size={16} />
                        <span className="mt-1">Add</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="card-frame rounded-md px-4 py-3">
                      <h3 className="font-header text-sm ink-main mb-2 flex items-center gap-2">
                        <FileText size={12} /> Contract & E-Signature
                      </h3>
                      <div className="text-xs bg-[#fbfcff] border border-[#e5e8f2] p-2 rounded mb-2">
                        <p><strong>Package:</strong> {selectedBooking?.serviceType || 'Not set'}</p>
                        <p><strong>Status:</strong> {selectedBooking?.status || 'Pending'}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={openContractCreationModal}
                          className="text-[0.65rem] uppercase tracking-wide underline text-blue-600"
                          data-testid="button-create-contract"
                        >
                          Create Contract
                        </button>
                        <button
                          onClick={() => {
                            if (selectedBooking?.id) {
                              handleSendForSigning(selectedBooking.id);
                            }
                          }}
                          disabled={sendingForSigning || !selectedBooking?.clientEmail}
                          className="text-[0.65rem] uppercase tracking-wide underline text-blue-600 disabled:opacity-50 text-left flex items-center gap-1"
                          data-testid="button-send-for-signing"
                        >
                          {sendingForSigning ? (
                            <>
                              <Loader2 size={10} className="animate-spin" />
                              Sending...
                            </>
                          ) : (
                            'Send for E-Signature'
                          )}
                        </button>
                        {contractSigningUrl && (
                          <a 
                            href={contractSigningUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[0.65rem] uppercase tracking-wide text-green-600 flex items-center gap-1"
                          >
                            <Check size={10} /> View Signing Link
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="card-frame rounded-md px-4 py-3">
                      <h3 className="font-header text-sm ink-main mb-2 flex items-center gap-2">
                        <Mail size={12} /> Communication
                      </h3>
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => {
                            if (selectedBooking?.id) {
                              setInvoiceBookingId(selectedBooking.id);
                              setShowInvoiceModal(true);
                            }
                          }}
                          className="text-[0.65rem] uppercase tracking-wide underline text-blue-600"
                        >
                          Send Invoice
                        </button>
                        <button 
                          onClick={() => setShowEmailModal(true)}
                          className="text-[0.65rem] uppercase tracking-wide underline text-blue-600"
                          data-testid="button-send-appointment-email"
                        >
                          Send Email
                        </button>
                        <button 
                          onClick={handleSendAppointmentConfirmation}
                          disabled={sendingAppointmentConfirmation || !selectedBooking?.clientEmail}
                          className="text-[0.65rem] uppercase tracking-wide underline text-blue-600 disabled:opacity-50 flex items-center gap-1"
                          data-testid="button-send-appointment-confirmation"
                        >
                          {sendingAppointmentConfirmation ? (
                            <>
                              <Loader2 size={10} className="animate-spin" />
                              Sending...
                            </>
                          ) : (
                            'Send Appointment Details'
                          )}
                        </button>
                        {/* Add Planner to Thread - Magic link for coordination */}
                        <button 
                          onClick={() => {
                            if (selectedBooking?.id) {
                              const plannerLink = `${window.location.origin}/planner-view/${selectedBooking.id}`;
                              navigator.clipboard.writeText(plannerLink);
                              toast({
                                title: "Planner Link Copied!",
                                description: "Share this magic link with the wedding planner. No account needed to view.",
                              });
                            }
                          }}
                          className="text-[0.65rem] uppercase tracking-wide text-purple-600 flex items-center gap-1 hover:underline"
                          data-testid="button-add-planner-thread"
                        >
                          <UserPlus size={10} />
                          Add Planner to Thread
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Contracts Section */}
                  <div className="card-frame rounded-md px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-header text-md ink-main flex items-center gap-2">
                        <FileText size={14} /> Contracts
                      </h3>
                      <label 
                        className={`flex items-center gap-1 px-2 py-1 text-xs bg-black text-white rounded cursor-pointer hover:bg-gray-800 transition-colors ${uploadingContract ? 'opacity-50 cursor-wait' : ''}`}
                        data-testid="button-upload-contract"
                      >
                        {uploadingContract ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload size={12} /> Upload Contract
                          </>
                        )}
                        <input 
                          type="file" 
                          accept=".pdf,.doc,.docx,.html" 
                          className="hidden" 
                          onChange={handleContractUpload}
                          disabled={uploadingContract}
                          data-testid="input-upload-contract"
                        />
                      </label>
                    </div>
                    
                    {loadingContracts ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 size={20} className="animate-spin text-gray-400" />
                      </div>
                    ) : bookingContracts.length === 0 ? (
                      <div className="text-center py-4 bg-[#fbfcff] border border-[#e5e8f2] rounded">
                        <FileText size={24} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-xs text-gray-500">No contracts uploaded yet</p>
                        <p className="text-[0.65rem] text-gray-400 mt-1">Upload a PDF, DOC, or HTML contract file</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {bookingContracts.map((contract) => (
                          <div 
                            key={contract.id} 
                            className={`p-3 rounded border transition-colors ${
                              contract.signedAt 
                                ? 'bg-green-50 border-green-200' 
                                : contract.signingToken 
                                  ? 'bg-amber-50 border-amber-200' 
                                  : 'bg-[#fbfcff] border-[#e5e8f2] hover:border-black'
                            }`}
                            data-testid={`contract-item-${contract.id}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 flex-1">
                                <FileText size={14} className={`mt-0.5 ${contract.signedAt ? 'text-green-600' : 'text-gray-500'}`} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{contract.packageDetails || 'Contract'}</p>
                                  <p className="text-[0.65rem] text-gray-500">
                                    {new Date(contract.createdAt).toLocaleDateString()}
                                  </p>
                                  {contract.signedAt ? (
                                    <div className="flex items-center gap-1 mt-1">
                                      <Check size={10} className="text-green-600" />
                                      <span className="text-[0.65rem] text-green-700 font-medium">
                                        Signed by {contract.signedByName || 'Client'} on {new Date(contract.signedAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  ) : contract.signingToken ? (
                                    <div className="flex items-center gap-1 mt-1">
                                      <Send size={10} className="text-amber-600" />
                                      <span className="text-[0.65rem] text-amber-700">Sent for signature - awaiting client</span>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => setViewingContract(contract)}
                                  className="flex items-center gap-1 px-2 py-1 text-[0.65rem] text-blue-600 hover:underline"
                                  data-testid={`button-view-contract-${contract.id}`}
                                >
                                  <Eye size={12} /> View
                                </button>
                                {!contract.signedAt && !contract.signingToken && (
                                  <button
                                    onClick={() => sendContractForSignature(
                                      contract.id, 
                                      contract.clientEmail || selectedBooking?.clientEmail,
                                      contract.clientName || selectedBooking?.name
                                    )}
                                    disabled={sendingContractForSignature === contract.id}
                                    className="flex items-center gap-1 px-2 py-1 text-[0.65rem] bg-[#6B4A55] text-white rounded hover:bg-[#8a6270] disabled:opacity-50"
                                    data-testid={`button-send-for-signature-${contract.id}`}
                                  >
                                    {sendingContractForSignature === contract.id ? (
                                      <>
                                        <Loader2 size={10} className="animate-spin" />
                                        Sending...
                                      </>
                                    ) : (
                                      <>
                                        <Send size={10} /> Send for Signature
                                      </>
                                    )}
                                  </button>
                                )}
                                {contract.signingToken && !contract.signedAt && contract.status !== 'cancelled' && (
                                  <>
                                    <button
                                      onClick={() => {
                                        const link = `${window.location.origin}/sign/${contract.signingToken}`;
                                        navigator.clipboard.writeText(link);
                                        toast({ title: "Link Copied", description: "Signing link copied to clipboard" });
                                      }}
                                      className="flex items-center gap-1 px-2 py-1 text-[0.65rem] text-gray-600 hover:text-black"
                                      data-testid={`button-copy-signing-link-${contract.id}`}
                                    >
                                      <Copy size={10} /> Copy Link
                                    </button>
                                    <button
                                      onClick={() => sendContractForSignature(
                                        contract.id, 
                                        contract.clientEmail || selectedBooking?.clientEmail,
                                        contract.clientName || selectedBooking?.name
                                      )}
                                      disabled={sendingContractForSignature === contract.id}
                                      className="flex items-center gap-1 px-2 py-1 text-[0.65rem] text-blue-600 hover:text-blue-800"
                                      data-testid={`button-resend-contract-${contract.id}`}
                                    >
                                      <RefreshCw size={10} /> Resend
                                    </button>
                                    <button
                                      onClick={() => cancelContract(contract.id)}
                                      disabled={cancellingContract === contract.id}
                                      className="flex items-center gap-1 px-2 py-1 text-[0.65rem] text-red-500 hover:text-red-700"
                                      data-testid={`button-cancel-contract-${contract.id}`}
                                    >
                                      {cancellingContract === contract.id ? (
                                        <Loader2 size={10} className="animate-spin" />
                                      ) : (
                                        <X size={10} />
                                      )}
                                      Cancel
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="card-frame rounded-md px-5 py-4">
                    <h3 className="font-header text-md ink-main mb-2">Day of Reminders Memo</h3>
                    <div className="flex gap-2">
                      <textarea 
                        value={dayOfReminders}
                        onChange={(e) => setDayOfReminders(e.target.value)}
                        className="flex-1 border border-[#c5ccd8] bg-[#f5f7fc] rounded p-2 text-xs h-20 focus:outline-none focus:border-black"
                        placeholder="Add notes for the team (e.g., Gate code is 1234, Parking in rear...)"
                        data-testid="input-day-of-reminders"
                      ></textarea>
                      <VoiceDictation onTranscript={(text) => setDayOfReminders(prev => prev + " " + text)} size="md" />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      {remindersSaved && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <Check size={12} /> Saved
                        </span>
                      )}
                      {!remindersSaved && <span />}
                      <button
                        onClick={handleSaveDayOfReminders}
                        disabled={savingReminders}
                        className="flex items-center gap-1 px-3 py-1.5 bg-black text-white text-xs rounded hover:bg-gray-800 disabled:opacity-50"
                        data-testid="button-save-reminders"
                      >
                        {savingReminders ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check size={12} />
                            Save
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: AI ASSISTANT + CALENDAR */}
            <div className="space-y-4">
              
              {/* Client Chat - AI Assistant (Top) */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-xs font-playfair font-medium text-black/70">Client Chat</span>
                  <span className="text-[10px] text-pink">(AI-Powered)</span>
                </div>
                {user && (
                  <AIChatPanel 
                    userId={user.id} 
                    userName={user.firstName || user.email?.split('@')[0] || 'there'}
                    onAvailabilityUpdate={(dates, isAvailable) => {
                      setCalendarRefreshKey(prev => prev + 1);
                      toast({
                        title: isAvailable ? "Marked Available" : "Marked Unavailable",
                        description: `Updated ${dates.length} date(s) via AI assistant`
                      });
                    }}
                    onInviteClick={() => setShowInviteModal(true)}
                  />
                )}
              </div>
              
              {/* Business Chat - Internal Team (Below) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-playfair font-medium text-black/70">Team Chat</span>
                  <button 
                    onClick={() => setShowInviteModal(true)}
                    className="text-xs px-3 py-1.5 bg-pink/10 text-pink border border-pink/30 rounded hover:bg-pink/20 transition-colors flex items-center gap-1"
                    data-testid="button-invite-clients-chat"
                  >
                    <UserPlus size={12} />
                    Invite Your Clients
                  </button>
                </div>
                {user && (
                  <BusinessChatPanel 
                    userId={user.id}
                    userName={user.firstName || user.email?.split('@')[0] || 'there'}
                  />
                )}
              </div>
              
              {/* Today's Activity Feed */}
              <div className="card-frame rounded-md px-4 py-3" data-testid="section-activity-feed">
                <h3 className="font-header text-sm ink-main mb-3 flex items-center gap-2">
                  <Clock size={14} className="text-[#6B4A55]" />
                  Today's Activity
                </h3>
                {activityLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 size={16} className="animate-spin text-gray-400" />
                  </div>
                ) : activityError ? (
                  <p className="text-xs text-red-500 py-2">Unable to load activity. Please refresh the page.</p>
                ) : activityFeed.length === 0 ? (
                  <p className="text-xs ink-soft italic py-2">No activity yet today. Actions you take (contracts sent, bookings confirmed, etc.) will appear here.</p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                    {activityFeed.map((activity) => (
                      <div 
                        key={activity.id}
                        className="border border-[#e5e8f2] bg-[#fbfcff] p-2.5 rounded-md"
                        data-testid={`activity-item-${activity.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs ink-main leading-relaxed">{activity.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[0.6rem] ink-soft">
                                {new Date(activity.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </span>
                              {activity.emailSent && (
                                <span className="flex items-center gap-0.5 text-[0.55rem] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                                  <Mail size={8} />
                                  Notified
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`text-[0.5rem] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide ${
                            activity.action.includes('signed') ? 'bg-green-100 text-green-700' :
                            activity.action.includes('sent') ? 'bg-blue-100 text-blue-700' :
                            activity.action.includes('created') ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {activity.action.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Coaching Nudges - Private tips from invisible CDI - HIDDEN FOR NOW */}
              {false && coachingNudges.length > 0 && (
                <div className="card-frame rounded-md px-4 py-3" data-testid="section-coaching-nudges">
                  <h3 className="font-header text-sm ink-main mb-3 flex items-center gap-2">
                    <Info size={14} className="text-purple-600" />
                    Tips for You
                  </h3>
                  <div className="space-y-2">
                    {coachingNudges.map(nudge => (
                      <div 
                        key={nudge.id}
                        className={`rounded-md p-3 text-xs ${
                          nudge.priority === 'opportunity' 
                            ? 'bg-green-50 border border-green-200' 
                            : nudge.priority === 'suggestion' 
                              ? 'bg-blue-50 border border-blue-200'
                              : 'bg-gray-50 border border-gray-200'
                        }`}
                        data-testid={`nudge-card-${nudge.id}`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`mt-0.5 ${
                            nudge.priority === 'opportunity' 
                              ? 'text-green-600' 
                              : nudge.priority === 'suggestion' 
                                ? 'text-blue-600'
                                : 'text-gray-600'
                          }`}>
                            {getNudgeIcon(nudge.icon)}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium ink-main mb-1">{nudge.message}</p>
                            <p className="text-[0.65rem] ink-soft leading-relaxed">{nudge.action}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Trust Badges - HIDDEN FOR NOW */}
              {false && trustBadges.filter(b => b.earned).length > 0 && (
                <div className="card-frame rounded-md px-4 py-3" data-testid="section-trust-badges">
                  <h3 className="font-header text-sm ink-main mb-3 flex items-center gap-2">
                    <ShieldAlert size={14} className="text-amber-600" />
                    Your Earned Badges
                  </h3>
                  <div className="space-y-2">
                    {trustBadges.filter(b => b.earned).map(badge => (
                      <div 
                        key={badge.id}
                        className="flex items-center justify-between p-2 rounded-md bg-amber-50/50 border border-amber-100"
                        data-testid={`badge-card-${badge.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                            {getNudgeIcon(badge.icon)}
                          </div>
                          <div>
                            <p className="text-xs font-medium ink-main">{badge.name}</p>
                            <p className="text-[0.6rem] ink-soft">{badge.description}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleBadge(badge.id, !badge.displayOnProfile)}
                          disabled={togglingBadge === badge.id}
                          className={`text-[0.6rem] px-2 py-1 rounded transition-colors ${
                            badge.displayOnProfile
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          data-testid={`button-toggle-badge-${badge.id}`}
                        >
                          {togglingBadge === badge.id ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : badge.displayOnProfile ? (
                            <span className="flex items-center gap-1"><Eye size={10} /> On Profile</span>
                          ) : (
                            <span className="flex items-center gap-1"><Plus size={10} /> Show</span>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                  {trustBadges.filter(b => !b.earned).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-[0.6rem] ink-soft mb-2">Badges to earn:</p>
                      <div className="flex flex-wrap gap-1">
                        {trustBadges.filter(b => !b.earned).map(badge => (
                          <span 
                            key={badge.id}
                            className="text-[0.55rem] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500"
                            title={badge.description}
                          >
                            {badge.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Availability Calendar */}
              <div className="card-frame rounded-md px-4 py-3" data-testid="section-availability-calendar">
                <h3 className="font-header text-sm ink-main mb-3 flex items-center gap-2">
                  <Calendar size={14} /> Your Schedule
                </h3>
                {user && <AvailabilityCalendar 
                  userId={user.id} 
                  refreshKey={calendarRefreshKey} 
                  onCreateBooking={(date) => {
                    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                    setBookingForm(prev => ({ ...prev, eventDate: dateStr }));
                    setShowCreateBooking(true);
                  }}
                />}
              </div>

            </div>
          </section>

          {/* Mobile Footer - Social Links */}
          <footer className="md:hidden mt-6 pt-4 border-t border-[#e5e8f2]">
            <div className="flex items-center justify-center gap-4 mb-3">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-black/10 transition-colors" data-testid="link-instagram-mobile">
                <Instagram size={20} className="ink-soft" />
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-black/10 transition-colors" data-testid="link-tiktok-mobile">
                <span className="text-lg font-bold ink-soft">TT</span>
              </a>
              <a href="https://pinterest.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-black/10 transition-colors" data-testid="link-pinterest-mobile">
                <span className="text-lg font-bold ink-soft">P</span>
              </a>
            </div>
            <div className="text-center">
              <Link href="/" className="text-xs ink-soft underline">
                Back to home
              </Link>
            </div>
          </footer>
        </div>
      </div>

      {/* Email Modal */}
      {showEmailModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-powder-blue rounded-full">
                <Mail size={24} className="text-black" />
              </div>
              <h3 className="font-header text-lg ink-main">Send Appointment Email</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[0.7rem] uppercase tracking-wide ink-soft mb-1">To:</label>
                <p className="text-sm font-medium">{selectedBooking.clientEmail}</p>
              </div>

              <div>
                <label className="block text-[0.7rem] uppercase tracking-wide ink-soft mb-1">Subject *</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="E.g., Your appointment details"
                  className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  data-testid="input-email-subject"
                />
              </div>

              <div>
                <label className="block text-[0.7rem] uppercase tracking-wide ink-soft mb-1">Message *</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Write your message here..."
                  className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-sm h-32 focus:outline-none focus:ring-1 focus:ring-black"
                  data-testid="textarea-email-body"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button 
                onClick={() => {
                  setShowEmailModal(false);
                  setEmailSubject("");
                  setEmailBody("");
                }}
                className="px-4 py-2 text-xs rounded border border-gray-300 hover:bg-gray-50"
                data-testid="button-cancel-email"
              >
                Cancel
              </button>
              <button 
                onClick={handleSendAppointmentEmail}
                disabled={sendingEmail}
                className="px-4 py-2 text-xs rounded bg-black text-white hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                data-testid="button-send-email"
              >
                {sendingEmail ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Email"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contract Creation Modal */}
      {showContractCreationModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full shadow-xl my-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-pink/20 rounded-full">
                <FileText size={20} className="text-pink" />
              </div>
              <div>
                <h3 className="font-header text-lg ink-main">Create Contract</h3>
                <p className="text-xs ink-soft">For {selectedBooking.name || selectedBooking.clientName}</p>
              </div>
            </div>
            
            {/* Event Info */}
            <div className="bg-[#fbfcff] border border-[#e5e8f2] rounded p-3 mb-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <p><strong>Event Date:</strong> {selectedBooking.eventDate || selectedBooking.date || 'TBD'}</p>
                <p><strong>Email:</strong> {selectedBooking.clientEmail}</p>
                <p><strong>Location:</strong> {selectedBooking.location || selectedBooking.eventLocation || 'TBD'}</p>
                <p><strong>Package:</strong> {selectedBooking.serviceType || 'Custom'}</p>
              </div>
            </div>

            {/* Service Line Items */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[0.7rem] uppercase tracking-wide ink-soft font-semibold">Service Items</label>
                <button 
                  onClick={addServiceItem}
                  className="text-xs text-blue-600 underline flex items-center gap-1"
                  data-testid="button-add-service-item"
                >
                  <Plus size={12} /> Add Item
                </button>
              </div>
              
              <div className="space-y-2">
                {contractServiceItems.map((item, index) => (
                  <div key={item.id} className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                    <select
                      value={item.clientType}
                      onChange={(e) => updateServiceItem(item.id, 'clientType', e.target.value)}
                      className="w-24 border border-[#c5ccd8] bg-[#fbfcff] rounded px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                      data-testid={`select-client-type-${index}`}
                    >
                      <option value="Bride">Bride</option>
                      <option value="Groom">Groom</option>
                      <option value="Bridesmaid">Bridesmaid</option>
                      <option value="MOB">MOB</option>
                      <option value="MOG">MOG</option>
                      <option value="Guest">Guest</option>
                      <option value="Flower Girl">Flower Girl</option>
                      <option value="Other">Other</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Service (e.g., Hair & Makeup)"
                      value={item.service}
                      onChange={(e) => updateServiceItem(item.id, 'service', e.target.value)}
                      className="flex-1 min-w-[140px] border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                      data-testid={`input-service-${index}`}
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={(e) => updateServiceItem(item.id, 'qty', parseInt(e.target.value) || 1)}
                      className="w-14 border border-[#c5ccd8] bg-[#fbfcff] rounded px-2 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-black"
                      min="1"
                      data-testid={`input-qty-${index}`}
                    />
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">$</span>
                      <input
                        type="number"
                        placeholder="Price"
                        value={item.price || ''}
                        onChange={(e) => updateServiceItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                        className="w-24 border border-[#c5ccd8] bg-[#fbfcff] rounded pl-5 pr-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                        min="0"
                        step="0.01"
                        data-testid={`input-price-${index}`}
                      />
                    </div>
                    {contractServiceItems.length > 1 && (
                      <button 
                        onClick={() => removeServiceItem(item.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                        data-testid={`button-remove-service-${index}`}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-gray-50 rounded p-3 mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Total:</span>
                <span className="font-semibold">${calculateContractTotal().toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs ink-soft">Retainer:</label>
                <select
                  value={contractDepositPercent}
                  onChange={(e) => setContractDepositPercent(parseInt(e.target.value))}
                  className="border border-[#c5ccd8] bg-white rounded px-2 py-1 text-sm"
                  data-testid="select-deposit-percent"
                >
                  <option value={25}>25%</option>
                  <option value={50}>50%</option>
                  <option value={75}>75%</option>
                  <option value={100}>100%</option>
                </select>
                <span className="text-sm">
                  = ${(calculateContractTotal() * contractDepositPercent / 100).toFixed(2)} due to book
                </span>
              </div>
            </div>

            {/* Contract Preview Note */}
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
              <p className="text-[0.65rem] text-blue-900">
                <strong>What happens next:</strong><br />
                Contract will be created with your standard terms and sent to {selectedBooking.clientEmail} for electronic signature.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowContractCreationModal(false)}
                disabled={savingContract}
                className="px-4 py-2 text-xs rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                data-testid="button-cancel-contract"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateAndSendContract}
                disabled={savingContract || calculateContractTotal() <= 0}
                className="px-4 py-2 text-xs rounded bg-black text-white hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                data-testid="button-send-contract"
              >
                {savingContract ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send size={12} /> Create & Send Contract
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Contract Modal */}
      {viewingContract && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full shadow-xl my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <FileText size={20} className="text-green-700" />
                </div>
                <div>
                  <h3 className="font-header text-lg ink-main">Contract Details</h3>
                  <p className="text-xs ink-soft">
                    {viewingContract.signedAt ? (
                      <span className="text-green-600">Signed on {new Date(viewingContract.signedAt).toLocaleDateString()}</span>
                    ) : viewingContract.signingToken ? (
                      <span className="text-amber-600">Awaiting signature</span>
                    ) : (
                      <span className="text-gray-500">Draft</span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingContract(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Contract Summary */}
            <div className="space-y-4">
              <div className="bg-[#fbfcff] border border-[#e5e8f2] rounded p-4">
                <h4 className="text-xs uppercase tracking-wide ink-soft font-semibold mb-2">Summary</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Client</p>
                    <p className="font-medium">{viewingContract.clientName || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium">{viewingContract.clientEmail || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Event Date</p>
                    <p className="font-medium">{viewingContract.eventDates || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="font-medium">{viewingContract.eventLocation || 'Not specified'}</p>
                  </div>
                </div>
              </div>
              
              {/* Service Items */}
              {viewingContract.serviceItems && viewingContract.serviceItems.length > 0 && (
                <div className="bg-[#fbfcff] border border-[#e5e8f2] rounded p-4">
                  <h4 className="text-xs uppercase tracking-wide ink-soft font-semibold mb-2">Services</h4>
                  <div className="space-y-2">
                    {viewingContract.serviceItems.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                        <div>
                          <span className="font-medium">{item.clientType}</span>
                          <span className="text-gray-500"> - {item.service}</span>
                          <span className="text-gray-400 text-xs ml-2">x{item.qty}</span>
                        </div>
                        <span className="font-medium">${((item.price || 0) / 100).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Amounts */}
              <div className="bg-[#fbfcff] border border-[#e5e8f2] rounded p-4">
                <h4 className="text-xs uppercase tracking-wide ink-soft font-semibold mb-2">Payment Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Amount</span>
                    <span className="font-semibold">${((viewingContract.totalAmount || 0) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Retainer Required</span>
                    <span className="font-medium">${((viewingContract.depositAmount || 0) / 100).toFixed(2)}</span>
                  </div>
                  {viewingContract.depositPaidAt && (
                    <div className="flex justify-between text-green-600">
                      <span>Retainer Paid</span>
                      <span>{new Date(viewingContract.depositPaidAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Signature Info */}
              {viewingContract.signedAt && (
                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <h4 className="text-xs uppercase tracking-wide text-green-700 font-semibold mb-2">Signature</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Signed By</span>
                      <span className="font-medium">{viewingContract.signedByName || 'Client'}</span>
                    </div>
                    {viewingContract.signedOnBehalfOf && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">On Behalf Of</span>
                        <span className="font-medium">{viewingContract.signedOnBehalfOf}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Signed At</span>
                      <span className="font-medium">{new Date(viewingContract.signedAt).toLocaleString()}</span>
                    </div>
                    {viewingContract.clientSignature && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <p className="text-xs text-gray-500 mb-2">Signature</p>
                        <img 
                          src={viewingContract.clientSignature} 
                          alt="Client Signature" 
                          className="max-h-16 border border-gray-200 rounded bg-white p-2"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Contract HTML Content */}
              {viewingContract.contractHtml && (
                <div className="border border-[#e5e8f2] rounded p-4">
                  <h4 className="text-xs uppercase tracking-wide ink-soft font-semibold mb-2">Contract Terms</h4>
                  <div 
                    className="prose prose-sm max-w-none text-xs"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(viewingContract.contractHtml) }}
                  />
                </div>
              )}
              
              {/* File URL */}
              {viewingContract.fileUrl && (
                <div className="flex justify-center">
                  <a
                    href={viewingContract.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <Eye size={16} /> Open Contract File
                  </a>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <button
                onClick={() => setViewingContract(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-black"
              >
                Close
              </button>
              {!viewingContract.signedAt && viewingContract.signingToken && (
                <button
                  onClick={() => {
                    const link = `${window.location.origin}/sign/${viewingContract.signingToken}`;
                    navigator.clipboard.writeText(link);
                    toast({ title: "Link Copied", description: "Signing link copied to clipboard" });
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-black text-white rounded hover:bg-gray-800"
                >
                  <Copy size={14} /> Copy Signing Link
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DocuSign Contract Modal */}
      {showDocusignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-pink/20 rounded-full">
                <FileText size={20} className="text-pink" />
              </div>
              <h3 className="font-header text-lg ink-main">DocuSign Contract</h3>
            </div>
            <p className="text-xs ink-soft mb-4">
              Have you created and sent this envelope in DocuSign? Click "Confirm" to track this contract.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
              <p className="text-[0.65rem] text-blue-900">
                <strong>What happens next:</strong><br />
                DocuSign sends the signing email → Client signs → Update status here when complete
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => {
                  setShowDocusignModal(false);
                  setPendingBookingId(null);
                }}
                disabled={sendingForSigning}
                className="px-4 py-2 text-xs rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={submitDocusignContract}
                disabled={sendingForSigning}
                className="px-4 py-2 text-xs rounded bg-black text-white hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
              >
                {sendingForSigning ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Confirming...
                  </>
                ) : (
                  "Confirm Sent"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-pink/20 rounded-full">
                <UserPlus size={20} className="text-pink" />
              </div>
              <h3 className="font-header text-lg ink-main">Invite Your Clients</h3>
            </div>
            <p className="text-xs ink-soft mb-4">
              Invite your current clients to chat and collaborate. They'll receive an invite link to join and start chatting with you about their events.
            </p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-[0.7rem] uppercase tracking-wide ink-soft mb-1">Client Name (Optional)</label>
                <input
                  type="text"
                  value={inviteClientName}
                  onChange={(e) => setInviteClientName(e.target.value)}
                  placeholder="Client name"
                  className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-[0.7rem] uppercase tracking-wide ink-soft mb-1">Email Address *</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail("");
                  setInviteClientName("");
                }}
                disabled={sendingInvite}
                className="px-4 py-2 text-xs rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (!inviteEmail) {
                    toast({
                      title: "Error",
                      description: "Email address is required",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  setSendingInvite(true);
                  try {
                    const res = await fetch("/api/send-client-invite", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({
                        clientEmail: inviteEmail,
                        clientName: inviteClientName || "Client",
                      }),
                    });
                    
                    if (res.ok) {
                      const data = await res.json();
                      toast({
                        title: "Invite Sent!",
                        description: `${inviteEmail} will receive an email with a link to chat and collaborate with you.`,
                      });
                      setInviteEmail("");
                      setInviteClientName("");
                      setShowInviteModal(false);
                    } else {
                      const error = await res.json();
                      toast({
                        title: "Error",
                        description: error.error || "Failed to send invite",
                        variant: "destructive",
                      });
                    }
                  } catch (err) {
                    toast({
                      title: "Error",
                      description: "Failed to send invite",
                      variant: "destructive",
                    });
                  }
                  setSendingInvite(false);
                }}
                disabled={sendingInvite || !inviteEmail}
                className="px-4 py-2 text-xs rounded bg-black text-white hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
              >
                {sendingInvite ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Invite Link"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Reply Modal */}
      {showQuickReplyModal && quickReplyInquiry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#5A1F2B]/10 rounded-full">
                <MessageCircle size={20} className="text-[#5A1F2B]" />
              </div>
              <h3 className="font-header text-lg ink-main">Reply to {quickReplyInquiry.clientName}</h3>
            </div>
            <p className="text-xs ink-soft mb-4">
              Send a message to {quickReplyInquiry.clientEmail}. They can reply directly to this email.
            </p>
            <div className="mb-4">
              <label className="block text-[0.7rem] uppercase tracking-wide ink-soft mb-1">Your Message</label>
              <textarea
                value={quickReplyMessage}
                onChange={(e) => setQuickReplyMessage(e.target.value)}
                placeholder="Hi! Thank you for reaching out. I wanted to let you know..."
                rows={5}
                className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#5A1F2B]"
                data-testid="textarea-quick-reply"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => {
                  setShowQuickReplyModal(false);
                  setQuickReplyMessage("");
                  setQuickReplyInquiry(null);
                }}
                disabled={sendingQuickReply}
                className="px-4 py-2 text-xs rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleQuickReply}
                disabled={sendingQuickReply || !quickReplyMessage.trim()}
                className="px-4 py-2 text-xs rounded bg-[#5A1F2B] text-white hover:bg-[#4a1923] disabled:opacity-50 flex items-center gap-2"
                data-testid="button-send-quick-reply"
              >
                {sendingQuickReply ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    Send Reply
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thank You Modal */}
      {showThankYouModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-pink/20 rounded-full">
                <Send size={24} className="text-pink" />
              </div>
              <h3 className="font-header text-lg ink-main">Send a Thank You Note</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[0.7rem] uppercase tracking-wide ink-soft mb-1">To:</label>
                <select
                  value={thankYouRecipient}
                  onChange={(e) => setThankYouRecipient(e.target.value)}
                  className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-sm"
                  data-testid="select-thank-you-recipient"
                >
                  <option value="">Select recipient...</option>
                  {contacts.map(c => (
                    <option key={c.id} value={c.name}>{c.name} ({c.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[0.7rem] uppercase tracking-wide ink-soft mb-1">Your Message:</label>
                <div className="flex gap-2">
                  <textarea
                    value={thankYouMessage}
                    onChange={(e) => setThankYouMessage(e.target.value)}
                    placeholder="Write your thank you message..."
                    rows={4}
                    className="flex-1 border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-sm"
                  />
                  <VoiceDictation onTranscript={(t) => setThankYouMessage(prev => prev + " " + t)} size="md" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowThankYouModal(false)} className="px-4 py-2 text-xs rounded border border-gray-300 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSendThankYou} className="px-4 py-2 text-xs rounded bg-pink text-white hover:bg-pink/80 flex items-center gap-2">
                <Send size={12} /> Send Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Booking Modal */}
      {showCreateBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-xl my-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gold/20 rounded-full">
                <Calendar size={24} className="text-gold" />
              </div>
              <h3 className="font-header text-lg ink-main">Create New Booking</h3>
            </div>
            
            <p className="text-xs ink-soft mb-4">
              Add an appointment for an existing client. They'll appear in your folder and calendar.
            </p>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[0.7rem] uppercase tracking-wide ink-soft mb-1">Client Name *</label>
                  <input
                    type="text"
                    value={bookingForm.clientName}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, clientName: e.target.value }))}
                    placeholder="e.g., Mikayla Pierce"
                    className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-sm"
                    data-testid="input-client-name"
                  />
                </div>
                
                <div>
                  <label className="block text-[0.7rem] uppercase tracking-wide ink-soft mb-1">Client Email *</label>
                  <input
                    type="email"
                    value={bookingForm.clientEmail}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, clientEmail: e.target.value }))}
                    placeholder="client@email.com"
                    className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-sm"
                    data-testid="input-client-email"
                  />
                </div>
                
                <div>
                  <label className="block text-[0.7rem] uppercase tracking-wide ink-soft mb-1">Phone (Optional)</label>
                  <input
                    type="tel"
                    value={bookingForm.clientPhone}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, clientPhone: e.target.value }))}
                    placeholder="(555) 123-4567"
                    className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-sm"
                    data-testid="input-client-phone"
                  />
                </div>
                
                <div>
                  <label className="block text-[0.7rem] uppercase tracking-wide ink-soft mb-1">Event Date *</label>
                  <input
                    type="date"
                    value={bookingForm.eventDate}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, eventDate: e.target.value }))}
                    className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-sm"
                    data-testid="input-event-date"
                  />
                </div>
                
                <div>
                  <label className="block text-[0.7rem] uppercase tracking-wide ink-soft mb-1">Service Type</label>
                  <select
                    value={bookingForm.serviceType}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, serviceType: e.target.value }))}
                    className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-sm"
                    data-testid="select-service-type"
                  >
                    <option value="Bridal Beauty">Bridal Beauty</option>
                    <option value="Bridesmaid">Bridesmaid</option>
                    <option value="Mother of Bride">Mother of Bride</option>
                    <option value="Trial Session">Trial Session</option>
                    <option value="Engagement Session">Engagement Session</option>
                    <option value="Special Event">Special Event</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div className="col-span-2">
                  <label className="block text-[0.7rem] uppercase tracking-wide ink-soft mb-1">Location</label>
                  <input
                    type="text"
                    value={bookingForm.eventLocation}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, eventLocation: e.target.value }))}
                    placeholder="Venue or address"
                    className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-sm"
                    data-testid="input-location"
                  />
                </div>
                
                <div>
                  <label className="block text-[0.7rem] uppercase tracking-wide ink-soft mb-1">Amount ($)</label>
                  <input
                    type="number"
                    value={bookingForm.amount}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="1500.00"
                    step="0.01"
                    min="0"
                    className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-sm"
                    data-testid="input-amount"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="block text-[0.7rem] uppercase tracking-wide ink-soft mb-1">Notes</label>
                  <textarea
                    value={bookingForm.notes}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any special notes about this booking..."
                    rows={2}
                    className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-sm"
                    data-testid="input-notes"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button 
                onClick={() => setShowCreateBooking(false)} 
                className="px-4 py-2 text-xs rounded border border-gray-300 hover:bg-gray-50"
                disabled={creatingBooking}
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateBooking} 
                disabled={creatingBooking}
                className="px-4 py-2 text-xs rounded bg-black text-white hover:bg-gray-800 flex items-center gap-2 disabled:opacity-50"
                data-testid="button-create-booking"
              >
                {creatingBooking ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Calendar size={12} /> Create Booking
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-forest/20 rounded-full">
                <DollarSign size={24} className="text-forest" />
              </div>
              <h3 className="font-header text-lg ink-main">
                {invoiceLink ? 'Payment Link Ready!' : 'Create Invoice'}
              </h3>
            </div>
            
            {!invoiceLink ? (
              <>
                <p className="text-xs ink-soft mb-4">
                  Generate a payment link to send to your client. 1.5% platform fee applies, Square processing fees are separate.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[0.7rem] uppercase tracking-wide ink-soft mb-1">Amount ($) *</label>
                    <input
                      type="number"
                      value={invoiceAmount}
                      onChange={(e) => setInvoiceAmount(e.target.value)}
                      placeholder="1500.00"
                      step="0.01"
                      min="1"
                      className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-sm"
                      data-testid="input-invoice-amount"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[0.7rem] uppercase tracking-wide ink-soft mb-1">Description</label>
                    <input
                      type="text"
                      value={invoiceDescription}
                      onChange={(e) => setInvoiceDescription(e.target.value)}
                      placeholder="e.g., Wedding Day Beauty Package"
                      className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-sm"
                      data-testid="input-invoice-description"
                    />
                  </div>
                  
                  {invoiceAmount && parseFloat(invoiceAmount) > 0 && (
                    <div className="bg-cream p-3 rounded text-xs">
                      <div className="flex justify-between mb-1">
                        <span className="ink-soft">Amount:</span>
                        <span className="ink-main">${parseFloat(invoiceAmount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span className="ink-soft">Platform Fee (1.5%):</span>
                        <span className="text-pink">-${(parseFloat(invoiceAmount) * 0.015).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium pt-1 border-t border-black/10">
                        <span className="ink-main">You Receive:</span>
                        <span className="text-forest">${(parseFloat(invoiceAmount) * 0.985).toFixed(2)}</span>
                      </div>
                      <p className="text-[0.65rem] ink-soft mt-2">
                        * Square processing fees (~2.6% + $0.10) are separate
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 justify-end mt-6">
                  <button 
                    onClick={() => { setShowInvoiceModal(false); setInvoiceLink(null); }} 
                    className="px-4 py-2 text-xs rounded border border-gray-300 hover:bg-gray-50"
                    disabled={generatingInvoice}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleGenerateInvoice} 
                    disabled={generatingInvoice || !invoiceAmount}
                    className="px-4 py-2 text-xs rounded bg-forest text-white hover:bg-forest/80 flex items-center gap-2 disabled:opacity-50"
                    data-testid="button-generate-invoice"
                  >
                    {generatingInvoice ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <DollarSign size={12} /> Generate Link
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs ink-soft mb-4">
                  Copy this link and send it to your client. They can pay using card, Apple Pay, or other methods.
                </p>
                
                <div className="bg-cream p-3 rounded mb-4">
                  <label className="block text-[0.65rem] uppercase tracking-wide ink-soft mb-1">Payment Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={invoiceLink}
                      readOnly
                      className="flex-1 bg-white border border-[#c5ccd8] rounded px-2 py-1 text-xs"
                    />
                    <button
                      onClick={copyInvoiceLink}
                      className="px-3 py-1 bg-black text-white rounded text-xs hover:bg-gray-800"
                      data-testid="button-copy-link"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Send Now vs Schedule Toggle */}
                <div className="mb-4">
                  <label className="block text-[0.65rem] uppercase tracking-wide ink-soft mb-2">Send Options</label>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setInvoiceScheduleMode("now")}
                      className={`flex-1 px-3 py-2 text-xs rounded border flex items-center justify-center gap-2 ${invoiceScheduleMode === "now" ? "bg-forest text-white border-forest" : "border-gray-300 hover:bg-gray-50"}`}
                      data-testid="button-send-now"
                    >
                      <Send size={12} />
                      Send Now
                    </button>
                    <button
                      onClick={() => setInvoiceScheduleMode("schedule")}
                      className={`flex-1 px-3 py-2 text-xs rounded border flex items-center justify-center gap-2 ${invoiceScheduleMode === "schedule" ? "bg-forest text-white border-forest" : "border-gray-300 hover:bg-gray-50"}`}
                      data-testid="button-schedule"
                    >
                      <Clock size={12} />
                      Schedule
                    </button>
                  </div>

                  {invoiceScheduleMode === "schedule" && (
                    <div className="bg-cream p-3 rounded space-y-3">
                      <div>
                        <label className="block text-[0.65rem] uppercase tracking-wide ink-soft mb-1">Date *</label>
                        <input
                          type="date"
                          value={invoiceScheduleDate}
                          onChange={(e) => setInvoiceScheduleDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full border border-[#c5ccd8] bg-white rounded px-3 py-2 text-sm"
                          data-testid="input-schedule-date"
                        />
                      </div>
                      <div>
                        <label className="block text-[0.65rem] uppercase tracking-wide ink-soft mb-1">Time *</label>
                        <input
                          type="time"
                          value={invoiceScheduleTime}
                          onChange={(e) => setInvoiceScheduleTime(e.target.value)}
                          className="w-full border border-[#c5ccd8] bg-white rounded px-3 py-2 text-sm"
                          data-testid="input-schedule-time"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Send via Email/SMS buttons */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={invoiceScheduleMode === "now" ? handleSendInvoiceEmail : handleScheduleInvoiceEmail}
                    disabled={sendingInvoiceEmail || schedulingInvoice || (invoiceScheduleMode === "schedule" && !invoiceScheduleDate)}
                    className="flex-1 px-3 py-2 text-xs rounded bg-forest text-white hover:bg-forest/80 flex items-center justify-center gap-2 disabled:opacity-50"
                    data-testid="button-send-invoice-email"
                  >
                    {sendingInvoiceEmail || schedulingInvoice ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        {invoiceScheduleMode === "schedule" ? "Scheduling..." : "Sending..."}
                      </>
                    ) : (
                      <>
                        {invoiceScheduleMode === "schedule" ? <Clock size={12} /> : <Send size={12} />}
                        {invoiceScheduleMode === "schedule" ? "Schedule Email" : "Send via Email"}
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleSendInvoiceSms}
                    disabled={sendingInvoiceSms || invoiceScheduleMode === "schedule"}
                    className="flex-1 px-3 py-2 text-xs rounded bg-pink text-white hover:bg-pink/80 flex items-center justify-center gap-2 disabled:opacity-50"
                    data-testid="button-send-invoice-sms"
                    title={invoiceScheduleMode === "schedule" ? "SMS scheduling not supported" : ""}
                  >
                    {sendingInvoiceSms ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <MessageCircle size={12} />
                        Send via Text
                      </>
                    )}
                  </button>
                </div>

                {/* Venmo Alternative */}
                {user?.venmoHandle && (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded mb-4">
                    <p className="text-xs text-blue-800 font-medium mb-2 flex items-center gap-1">
                      <Wallet size={12} /> Alternative: Venmo Payment
                    </p>
                    <p className="text-[0.65rem] text-blue-700 mb-2">
                      You can also share your Venmo handle with clients who prefer not to use card payment:
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="bg-white px-3 py-1.5 rounded text-sm font-medium text-blue-900 border border-blue-200" data-testid="text-venmo-handle">
                        {user.venmoHandle}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(user.venmoHandle || "");
                          toast({ title: "Copied", description: "Venmo handle copied to clipboard" });
                        }}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        data-testid="button-copy-venmo"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="text-[0.6rem] text-blue-600 mt-2">
                      Note: Venmo payments are direct and do not include platform fees
                    </p>
                  </div>
                )}
                
                <div className="flex gap-3 justify-end">
                  <button 
                    onClick={() => { setShowInvoiceModal(false); setInvoiceLink(null); setInvoiceAmount(""); setInvoiceDescription(""); setInvoiceScheduleMode("now"); setInvoiceScheduleDate(""); setInvoiceScheduleTime("09:00"); }} 
                    className="px-4 py-2 text-xs rounded bg-black text-white hover:bg-gray-800"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Compose Email Modal */}
      <ComposeEmailModal
        isOpen={showComposeEmail}
        onClose={() => setShowComposeEmail(false)}
        contacts={contacts.filter(c => c.email).map(c => ({ name: c.name, email: c.email, role: c.role }))}
      />

      {/* Decline with Referrals Modal */}
      <DeclineReferralModal
        open={showDeclineReferralModal}
        onOpenChange={setShowDeclineReferralModal}
        inquiry={declineReferralInquiry}
        onSuccess={async () => {
          const inquiriesRes = await fetch('/api/vendor/inquiries', { credentials: 'include' });
          if (inquiriesRes.ok) {
            setInquiries(await inquiriesRes.json());
          }
        }}
      />
    </div>
  );
}
