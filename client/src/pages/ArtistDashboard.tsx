import { Link, useLocation } from "wouter";
import { useState, useEffect, useRef } from "react";
import { Folder, ArrowLeft, Calendar, Clock, FileText, DollarSign, Image as ImageIcon, Check, X, AlertCircle, Plus, Search, CreditCard, Send, Instagram, Globe, MessageCircle, UserPlus, LogOut, Upload, Settings, User, Wallet, BookUser, Info, ChevronDown, ChevronUp, Camera, Paperclip, Mic, Loader2, Eye, ShieldAlert, ThumbsUp, ThumbsDown, Flag } from "lucide-react";
import VoiceDictation from "../components/VoiceDictation";
import AvailabilityCalendar from "../components/AvailabilityCalendar";
import AIChatPanel from "../components/AIChatPanel";
import BusinessChatPanel from "../components/BusinessChatPanel";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import Uppy from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";

export default function ArtistDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
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
  const [selectedContact, setSelectedContact] = useState<string>("Client");
  const [loading, setLoading] = useState(true);
  
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
  
  // Stripe Connect state
  const [stripeStatus, setStripeStatus] = useState<{
    connected: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
  } | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  
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
  
  const [messages, setMessages] = useState([
    { from: "other", text: "Select a client to start chatting." }
  ]);
  const [inputText, setInputText] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Access Required",
        description: "Please log in to access your dashboard.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1000);
      return;
    }
    
    if (user && user.role !== 'artist') {
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
  }, [authLoading, isAuthenticated, user]);

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
      
      // Fetch Stripe Connect status
      const stripeRes = await fetch('/api/stripe/connect/status', { credentials: 'include' });
      if (stripeRes.ok) {
        const stripeData = await stripeRes.json();
        setStripeStatus(stripeData);
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

  const handleStripeConnect = async () => {
    setStripeLoading(true);
    try {
      const res = await fetch('/api/stripe/connect/onboard', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.url;
      } else {
        const err = await res.json();
        toast({
          title: "Error",
          description: err.error || "Failed to start Stripe setup",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to connect to Stripe",
        variant: "destructive",
      });
    }
    setStripeLoading(false);
  };

  const handleStripeDashboard = async () => {
    try {
      const res = await fetch('/api/stripe/connect/dashboard', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        window.open(data.url, '_blank');
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to open Stripe dashboard",
        variant: "destructive",
      });
    }
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
  
  const filteredClients = clients.filter(c => 
    c.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.date?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.location?.toLowerCase().includes(clientSearch.toLowerCase())
  );

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
        toast({
          title: "Saved",
          description: "Booking details updated successfully.",
        });
        setIsEditingBooking(false);
        fetchArtistData();
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
      
      const res = await fetch('/api/stripe/create-invoice-link', {
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-powder-blue flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
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
    <div className="font-sans min-h-screen overflow-y-auto p-4 bg-powder-blue">
      <div className="max-w-6xl mx-auto frame-outer shadow-sm">
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
                <h1 className="font-script text-3xl ink-main">
                  Beauvette
                </h1>
                <p className="mt-1 text-[0.7rem] uppercase tracking-[0.22em] ink-soft">
                  For Life's Most Important Days
                </p>
                <p className="mt-2 font-script text-xl ink-main">
                  Bonjour, {user?.firstName || 'there'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
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
              <Link href={`/vendor/${user?.id}`} className="text-xs ink-soft hover:ink-main flex items-center gap-1 transition-colors" data-testid="link-my-profile">
                <Eye size={14} /> My Public Profile
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
                <h1 className="font-script text-2xl ink-main">Beauvette</h1>
                <p className="font-script text-lg ink-main">Bonjour, {user?.firstName || 'there'}</p>
              </div>
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
                  <Link href={`/vendor/${user?.id}`} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 border-b border-[#e5e8f2]">
                    <Eye size={16} className="ink-soft" /> 
                    <span>View My Public Profile</span>
                  </Link>
                  <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 border-b border-[#e5e8f2]">
                    <Settings size={16} className="ink-soft" /> 
                    <span>Settings</span>
                  </Link>
                  <Link href="/artist/profile" className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 border-b border-[#e5e8f2]">
                    <User size={16} className="ink-soft" /> 
                    <span>Personal Info</span>
                  </Link>
                  <Link href="/artist/rolodex" className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 border-b border-[#e5e8f2]">
                    <BookUser size={16} className="ink-soft" /> 
                    <span>Your Network</span>
                  </Link>
                  <a href="/api/logout" className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 text-red-600">
                    <LogOut size={16} /> 
                    <span>Logout</span>
                  </a>
                </div>
              )}
            </div>
          </header>

          {/* GRID LAYOUT */}
          <section className="grid md:grid-cols-3 gap-6 items-start">
            
            {/* LEFT COLUMN */}
            <div className="md:col-span-2 space-y-6">
              
              {view === "overview" ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Service Requests - Compact */}
                    <div className="space-y-4">
                      <div className="card-frame rounded-md px-5 py-4">
                        <h2 className="font-header text-md ink-main mb-3 flex items-center justify-between">
                          Service Requests
                          <span className="bg-red-50 text-red-600 text-[0.6rem] px-2 py-1 rounded-full font-sans uppercase tracking-wide font-semibold">{requests.length} New</span>
                        </h2>
                        
                        {requests.length === 0 ? (
                          <p className="text-xs ink-soft italic">No pending requests.</p>
                        ) : (
                          <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                            {requests.map(req => (
                              <div key={req.id} className="border border-[#e5e8f2] bg-[#fbfcff] p-2 rounded-md text-xs">
                                <div className="flex justify-between items-start mb-1">
                                  <h3 className="font-header text-xs ink-main">{req.name}</h3>
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
                                    className="flex-1 py-1 rounded-md bg-black text-white border border-black hover:bg-gray-800 transition-colors flex justify-center"
                                    title="Accept & Book"
                                  >
                                    <Check size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Quick Actions Row - Stack on mobile */}
                        <div className="flex flex-col sm:flex-row gap-1.5 mt-3 pt-3 border-t border-[#e5e8f2]">
                          <Link 
                            href="/artist/manage-bookings" 
                            className="px-3 py-1.5 bg-black text-white text-[0.6rem] rounded hover:bg-gray-800 transition-colors flex items-center justify-center gap-1"
                            data-testid="link-manage-bookings"
                          >
                            <FileText size={10} />
                            <span>Manage</span>
                          </Link>
                          <Link 
                            href="/artist/import" 
                            className="px-3 py-1.5 bg-black text-white text-[0.6rem] rounded hover:bg-gray-800 transition-colors flex items-center justify-center gap-1"
                            data-testid="link-import-bookings"
                          >
                            <Upload size={10} />
                            <span>Import</span>
                          </Link>
                        </div>
                      </div>

                      {/* Day-of Schedules - Under Service Requests */}
                      <Link 
                        href="/artist/schedules"
                        className="card-frame rounded-md px-5 py-4 block hover:border-black transition-colors group"
                        data-testid="link-day-schedules"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-powder-blue rounded-full group-hover:bg-black transition-colors">
                            <Clock size={18} className="text-black group-hover:text-white transition-colors" />
                          </div>
                          <div>
                            <h3 className="font-header text-sm ink-main">Day-of Schedules</h3>
                            <p className="text-[0.65rem] ink-soft">View or create event timelines</p>
                          </div>
                        </div>
                      </Link>

                      {/* Portfolio Gallery */}
                      <div className="card-frame rounded-md px-5 py-4">
                        <div className="flex items-center justify-between mb-3">
                          <h2 className="font-header text-md ink-main flex items-center gap-2">
                            <ImageIcon size={16} /> My Portfolio
                          </h2>
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
                          <div className="bg-[#fbfcff] border border-dashed border-[#c5ccd8] rounded-md p-6 flex flex-col items-center justify-center text-center">
                            <ImageIcon size={24} className="text-gray-400 mb-2" />
                            <p className="text-xs ink-soft">No portfolio photos yet</p>
                            <p className="text-[0.65rem] ink-soft mt-1">Upload photos to showcase your work</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
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
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-[0.6rem] ink-soft mt-2">Tip: You can also say "add to my portfolio" in the AI chat when sharing photos!</p>
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

                  {/* Contracts & Payments */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="card-frame rounded-md px-5 py-4">
                      <h2 className="font-header text-md ink-main mb-3 flex items-center gap-2">
                        <FileText size={14} /> Contracts
                      </h2>
                      <Link 
                        href="/artist/contracts"
                        className="bg-[#fbfcff] border border-dashed border-[#c5ccd8] rounded-md p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white hover:border-black transition-colors group h-[120px]"
                        data-testid="link-create-contract"
                      >
                        <div className="bg-gray-100 p-2 rounded-full mb-2 group-hover:bg-black group-hover:text-white transition-colors">
                          <Plus size={16} />
                        </div>
                        <span className="text-xs font-medium ink-main">Create New Contract</span>
                        <span className="text-[0.65rem] ink-soft mt-1">Standard or Custom</span>
                      </Link>
                    </div>

                    <div className="card-frame rounded-md px-5 py-4">
                      <h2 className="font-header text-md ink-main mb-3 flex items-center gap-2">
                        <DollarSign size={14} /> Payments
                      </h2>
                      
                      <div className="space-y-3">
                        {/* Stripe Status Banner */}
                        {stripeStatus?.connected && stripeStatus.chargesEnabled ? (
                          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                            <Check size={12} className="text-green-600" />
                            <span className="text-green-800">Stripe Connected - Ready to accept payments</span>
                          </div>
                        ) : stripeStatus?.connected ? (
                          <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                            <AlertCircle size={12} className="text-yellow-600" />
                            <span className="text-yellow-800">Stripe setup incomplete</span>
                          </div>
                        ) : null}

                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            className="flex flex-col items-center justify-center gap-1 p-2 border border-[#c5ccd8] rounded bg-white hover:border-black transition-colors disabled:opacity-50"
                            disabled={!stripeStatus?.chargesEnabled}
                            onClick={() => setShowInvoiceModal(true)}
                            data-testid="button-send-invoice"
                          >
                            <Send size={14} />
                            <span className="text-[0.65rem] font-medium">Send Invoice</span>
                          </button>
                          
                          {stripeStatus?.connected && stripeStatus.chargesEnabled ? (
                            <button 
                              onClick={handleStripeDashboard}
                              className="flex flex-col items-center justify-center gap-1 p-2 border border-[#c5ccd8] rounded bg-white hover:border-black transition-colors"
                              data-testid="button-stripe-dashboard"
                            >
                              <Wallet size={14} />
                              <span className="text-[0.65rem] font-medium">Stripe Dashboard</span>
                            </button>
                          ) : (
                            <button 
                              onClick={handleStripeConnect}
                              disabled={stripeLoading}
                              className="flex flex-col items-center justify-center gap-1 p-2 border border-[#c5ccd8] rounded bg-white hover:border-black transition-colors disabled:opacity-50"
                              data-testid="button-stripe-connect"
                            >
                              <CreditCard size={14} />
                              <span className="text-[0.65rem] font-medium">
                                {stripeLoading ? 'Loading...' : 'Connect Stripe'}
                              </span>
                            </button>
                          )}
                        </div>
                        
                        <p className="text-[0.6rem] text-center ink-soft">
                          Accept Apple Pay, Link, Klarna, PayPal & cards
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* IQS Lead Quality Warnings Panel */}
                  {showIqsPanel && (
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
                            onClick={() => setIsEditingBooking(false)}
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
                        <FileText size={12} /> Contract
                      </h3>
                      <div className="text-xs bg-[#fbfcff] border border-[#e5e8f2] p-2 rounded mb-2">
                        <p><strong>Package:</strong> {selectedBooking?.serviceType || 'Not set'}</p>
                        <p><strong>Status:</strong> {selectedBooking?.status || 'Pending'}</p>
                      </div>
                      <Link href="/artist/contracts" className="text-[0.65rem] uppercase tracking-wide underline text-blue-600">Create Contract</Link>
                    </div>
                    <div className="card-frame rounded-md px-4 py-3">
                      <h3 className="font-header text-sm ink-main mb-2 flex items-center gap-2">
                        <DollarSign size={12} /> Payment
                      </h3>
                      <div className="text-xs bg-[#fbfcff] border border-[#e5e8f2] p-2 rounded mb-2">
                        <p><strong>Status:</strong> Pending</p>
                      </div>
                      <button 
                        onClick={() => {
                          if (selectedBooking?.id) {
                            setInvoiceBookingId(selectedBooking.id);
                            setShowInvoiceModal(true);
                          }
                        }}
                        className="text-[0.65rem] uppercase tracking-wide underline text-blue-600"
                      >
                        Create Invoice
                      </button>
                    </div>
                  </div>

                  <div className="card-frame rounded-md px-5 py-4">
                    <h3 className="font-header text-md ink-main mb-2">Day of Reminders Memo</h3>
                    <div className="flex gap-2">
                      <textarea 
                        className="flex-1 border border-[#c5ccd8] bg-[#f5f7fc] rounded p-2 text-xs h-20 focus:outline-none focus:border-black"
                        placeholder="Add notes for the team (e.g., Gate code is 1234, Parking in rear...)"
                      ></textarea>
                      <VoiceDictation onTranscript={() => {}} size="md" />
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
                  />
                )}
              </div>
              
              {/* Business Chat - Internal Team (Below) */}
              {user && (
                <BusinessChatPanel 
                  userId={user.id}
                  userName={user.firstName || user.email?.split('@')[0] || 'there'}
                />
              )}
              
              {/* Availability Calendar */}
              {user && <AvailabilityCalendar userId={user.id} key={`calendar-${calendarRefreshKey}`} />}

              {/* Quick Actions */}
              <div className="card-frame rounded-md px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-header text-sm ink-main">Quick Actions</h3>
                  <button 
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-1 text-[0.7rem] ink-soft hover:ink-main transition-colors"
                  >
                    <UserPlus size={14} /> Invite
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {contacts.slice(0, 3).map(contact => (
                    <button
                      key={contact.id}
                      onClick={() => setSelectedContact(contact.name)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors border bg-white border-gray-200 text-gray-600 hover:border-black hover:text-black"
                    >
                      <MessageCircle size={10} />
                      {contact.name}
                    </button>
                  ))}
                </div>
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

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="font-header text-lg ink-main mb-4">Invite Someone to Chat</h3>
            <p className="text-xs ink-soft mb-4">
              Enter their email. They'll receive an invite link to create a Beauvette profile.
            </p>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowInviteModal(false)} className="px-4 py-2 text-xs rounded border border-gray-300 hover:bg-gray-50">
                Cancel
              </button>
              <button 
                onClick={() => { alert(`Invite sent to ${inviteEmail}`); setInviteEmail(""); setShowInviteModal(false); }}
                className="px-4 py-2 text-xs rounded bg-black text-white hover:bg-gray-800"
              >
                Send Invite Link
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
                  Generate a payment link to send to your client. Beauvette takes 1%, Stripe fees are separate.
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
                        <span className="ink-soft">Platform Fee (1%):</span>
                        <span className="text-pink">-${(parseFloat(invoiceAmount) * 0.01).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium pt-1 border-t border-black/10">
                        <span className="ink-main">You Receive:</span>
                        <span className="text-forest">${(parseFloat(invoiceAmount) * 0.99).toFixed(2)}</span>
                      </div>
                      <p className="text-[0.65rem] ink-soft mt-2">
                        * Stripe processing fees (~2.9% + $0.30) are separate
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

                {/* Send via Email/SMS buttons */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={handleSendInvoiceEmail}
                    disabled={sendingInvoiceEmail}
                    className="flex-1 px-3 py-2 text-xs rounded bg-forest text-white hover:bg-forest/80 flex items-center justify-center gap-2 disabled:opacity-50"
                    data-testid="button-send-invoice-email"
                  >
                    {sendingInvoiceEmail ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={12} />
                        Send via Email
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleSendInvoiceSms}
                    disabled={sendingInvoiceSms}
                    className="flex-1 px-3 py-2 text-xs rounded bg-pink text-white hover:bg-pink/80 flex items-center justify-center gap-2 disabled:opacity-50"
                    data-testid="button-send-invoice-sms"
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
                
                <div className="flex gap-3 justify-end">
                  <button 
                    onClick={() => { setShowInvoiceModal(false); setInvoiceLink(null); setInvoiceAmount(""); setInvoiceDescription(""); }} 
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
    </div>
  );
}
