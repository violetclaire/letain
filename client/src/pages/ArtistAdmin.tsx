import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useSearch, Link, useLocation } from "wouter";
import { format } from "date-fns";
import { Loader2, Settings, Calendar, Users, Copy, Check, Mail, CheckCircle, LogOut, FileText, DollarSign, Clock, ChevronDown, ChevronUp, Menu, X, HelpCircle, Trash2, AlertTriangle, MessageSquare, Send, CalendarDays, Moon, Sun } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import QuickGuide from "@/components/QuickGuide";
import { useTheme } from "@/contexts/ThemeContext";
import { SecretaryChatbox } from "@/components/SecretaryChatbox";

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      data-testid="button-theme-toggle"
      className="p-2 rounded-md border border-hairline hover:bg-surface transition-colors"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-brass" />
      ) : (
        <Moon className="w-4 h-4 text-ink" />
      )}
    </button>
  );
}

interface Inquiry {
  id: string;
  threadToken: string;
  clientName: string;
  clientEmail: string;
  eventDate: string;
  eventLocation?: string;
  status: string;
  createdAt: string;
  depositPaidAt?: string;
  hasDateConflict?: boolean;
  conflictSource?: string;
}

interface ArtistProfile {
  id: string;
  businessName: string;
  artistSlug: string;
  autoResponderMode: 'off' | 'info_sheet' | 'smart' | 'paused' | 'paused_with_referral' | 'availability_smart';
  editToken?: string;
}

export default function ArtistAdmin() {
  const [, params] = useRoute("/admin/:slug");
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const slug = params?.slug;
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [pendingAction, setPendingAction] = useState<'payment' | 'contract' | null>(null);
  const inquiriesRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Standalone creation modals
  const [showStandaloneInvoice, setShowStandaloneInvoice] = useState(false);
  const [showStandaloneContract, setShowStandaloneContract] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [standaloneClientName, setStandaloneClientName] = useState("");
  const [standaloneClientEmail, setStandaloneClientEmail] = useState("");
  const [standaloneAmount, setStandaloneAmount] = useState("");
  const [standaloneDescription, setStandaloneDescription] = useState("");
  const [creatingStandalone, setCreatingStandalone] = useState(false);
  const [deletingInquiryToken, setDeletingInquiryToken] = useState<string | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientData, setNewClientData] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    eventDate: "",
    notes: "",
  });
  const [creatingClient, setCreatingClient] = useState(false);
  
  // Secretary chatbox state
  const [secretaryChatOpen, setSecretaryChatOpen] = useState(false);
  
  // Client list collapse state (show only 3 on mobile initially)
  const [showAllClients, setShowAllClients] = useState(false);
  
  // Quick Chat state
  const [showQuickChat, setShowQuickChat] = useState(false);
  const [quickChatData, setQuickChatData] = useState({
    participantName: "",
    participantEmail: "",
    participantRole: "planner" as "planner" | "client" | "vendor" | "contact",
    initialMessage: "",
  });
  const [creatingQuickChat, setCreatingQuickChat] = useState(false);
  const [quickChatLink, setQuickChatLink] = useState<string | null>(null);
  const queryClient = useQueryClient();
  
  // Delete inquiry mutation
  const deleteInquiry = useMutation({
    mutationFn: async (threadToken: string) => {
      const res = await fetch(`/api/public/inquiry/${threadToken}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artists", slug] });
      toast({ title: "Client removed" });
      setDeletingInquiryToken(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove", description: error.message, variant: "destructive" });
    },
  });

  const createClient = useMutation({
    mutationFn: async (data: typeof newClientData) => {
      const res = await fetch("/api/artist/create-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create client");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/artists", slug] });
      toast({ title: "Client added" });
      setShowAddClient(false);
      setNewClientData({ clientName: "", clientEmail: "", clientPhone: "", eventDate: "", notes: "" });
      // Navigate to the new thread
      if (data.threadToken) {
        window.location.href = `/inquiry/${data.threadToken}`;
      }
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add client", description: error.message, variant: "destructive" });
    },
  });
  
  // Get auth state for session-based login
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  
  // Extract token from query string
  const urlParams = new URLSearchParams(searchString);
  const token = urlParams.get('token');
  
  // Determine auth method: session (logged in user) or token
  // Allow any authenticated user to try - backend will check role and auto-fix if needed
  const useSessionAuth = isAuthenticated;

  const requestLink = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/public/artists/resend-settings-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, slug }),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: () => setEmailSent(true),
  });

  const updateAutoResponder = useMutation({
    mutationFn: async (mode: string) => {
      const res = await fetch(`/api/artist/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ autoResponderMode: mode }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/artist-admin/${slug}`] });
      toast({ title: "Response mode updated" });
    },
  });

  // Get the actual artistSlug from loaded data (or fallback to URL slug)
  const getActualSlug = () => {
    if (data?.artist?.artistSlug) return data.artist.artistSlug;
    return slug;
  };

  const handleCopyInquiryLink = () => {
    navigator.clipboard.writeText(`https://dateinquiry.com/${getActualSlug()}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };
  
  const handleCopyLink = () => {
    const link = `https://dateinquiry.com/${getActualSlug()}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      window.location.href = '/artist-login';
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  // Fetch direct chats (quick chats) using token or session auth
  const { data: directChats = [] } = useQuery<Array<{id: string; threadToken: string; participantName: string; participantEmail: string; participantRole: string; lastMessageAt?: string; createdAt: string}>>({
    queryKey: ['/api/direct-chats', token],
    queryFn: async () => {
      const endpoint = token 
        ? `/api/public/direct-chats?token=${encodeURIComponent(token)}`
        : `/api/artist/direct-chats`;
      const res = await fetch(endpoint, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!slug && (!!token || useSessionAuth),
  });

  // Fetch data using token OR session auth
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/artist-admin/${slug}`, token, useSessionAuth],
    queryFn: async () => {
      // If using session auth, call the authenticated endpoint WITH the slug
      if (useSessionAuth) {
        const res = await fetch(`/api/artist/admin-data?slug=${encodeURIComponent(slug || '')}`, {
          credentials: 'include'
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 401) throw new Error("Access denied");
          throw new Error(data.error || "Failed to load dashboard");
        }
        return res.json();
      }
      // Otherwise use token auth
      const res = await fetch(`/api/public/artist-admin/${slug}?token=${token}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) throw new Error("Access denied");
        throw new Error(data.error || "Artist not found");
      }
      return res.json();
    },
    enabled: !!slug && (!!token || useSessionAuth),
  });

  // Show loading while checking auth
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-ink/30" />
      </div>
    );
  }

  // If not authenticated via token or session, redirect to login page
  if (!token && !useSessionAuth) {
    // Use useEffect pattern to avoid redirect loop issues
    if (typeof window !== 'undefined') {
      window.location.href = `/artist-login?redirect=${encodeURIComponent(`/admin/${slug}`)}`;
    }
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center flex-col gap-4">
        <Loader2 className="h-6 w-6 animate-spin text-ink/30" />
        <p className="text-ink/50 text-sm">Redirecting to login...</p>
      </div>
    );
  }

  if (error || !data) {
    // If we had a token but it failed, show error with retry option
    const hadToken = !!token;
    const errorMessage = error?.message || "Unable to load dashboard";
    
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-surface p-8 border border-ink/10 rounded">
          {hadToken && !emailSent ? (
            <div className="text-center">
              <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-lg text-ink mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
                Link Expired
              </h2>
              <p className="text-sm text-ink/60 mb-6">
                This dashboard link may have expired or is no longer valid. Request a new one below.
              </p>
              <form onSubmit={(e) => { e.preventDefault(); if (email.trim()) requestLink.mutate(); }} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full border border-ink/20 bg-transparent px-4 py-3 text-sm text-ink focus:outline-none focus:border-ink/50 placeholder:text-ink/30 rounded"
                />
                <button
                  type="submit"
                  disabled={requestLink.isPending || !email.trim()}
                  className="w-full bg-[#F5F0E8] text-[#1A1A1A] py-3 text-sm uppercase tracking-wide hover:bg-ink/90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {requestLink.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Send New Link
                </button>
              </form>
            </div>
          ) : emailSent ? (
            <div className="text-center">
              <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-5" />
              <h2 className="text-xl text-ink mb-2" style={{ fontFamily: "'Fraunces', serif" }}>Check Your Email</h2>
              <p className="text-sm text-ink/60 mb-4">
                Your dashboard link is on its way. Check your inbox (and spam folder).
              </p>
              <button
                onClick={() => { setEmailSent(false); setEmail(""); }}
                className="text-sm text-ink/60 underline"
              >
                Try different email
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl text-ink mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Your Secretary</h1>
                <p className="text-xs text-ink/50">Access your dashboard</p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); if (email.trim()) requestLink.mutate(); }} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full border border-ink/20 bg-transparent px-4 py-3 text-sm text-ink focus:outline-none focus:border-ink/50 placeholder:text-ink/30 rounded"
                  data-testid="input-admin-email-error"
                />
                <button
                  type="submit"
                  disabled={requestLink.isPending || !email.trim()}
                  className="w-full bg-[#F5F0E8] text-[#1A1A1A] py-3 text-sm uppercase tracking-wide hover:bg-ink/90 disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="button-send-dashboard-link-error"
                >
                  {requestLink.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Dashboard Link"
                  )}
                </button>
              </form>
              
              <div className="mt-4 text-center">
                <Link href="/artist-login" className="text-xs text-ink/50 underline">
                  Or sign in with password
                </Link>
              </div>

              <div className="mt-6 pt-5 border-t border-ink/10">
                <p className="text-[10px] uppercase tracking-wide text-ink/50 mb-2">Your Inquiry Link</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-[#F5F0E8]/5 px-3 py-2 text-xs text-ink/70 rounded truncate">
                    dateinquiry.com/{slug}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`https://dateinquiry.com/${slug}`);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    }}
                    className="px-3 py-2 bg-[#F5F0E8] text-[#1A1A1A] text-xs rounded flex items-center gap-1"
                  >
                    {linkCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const { artist, inquiries }: { artist: ArtistProfile; inquiries: Inquiry[] } = data;
  // Always use token for links - session cookies don't persist in production
  const effectiveToken = token || artist.editToken;
  const authParam = effectiveToken ? `?token=${effectiveToken}` : '';

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending": return "bg-yellow-900/30 text-yellow-300";
      case "accepted": return "bg-green-900/30 text-green-300";
      case "auto_responded": return "bg-blue-900/30 text-blue-300";
      case "deposit_paid": return "bg-green-800/40 text-green-200";
      case "referred": return "bg-purple-900/30 text-purple-300";
      case "declined": return "bg-[#F5F0E8]/10 text-ink/50";
      default: return "bg-[#F5F0E8]/10 text-ink/50";
    }
  };

  const getVelocity = (inquiry: Inquiry) => {
    if (!inquiry.createdAt) return { text: "—", color: "text-ink/40" };
    if (inquiry.depositPaidAt) {
      const start = new Date(inquiry.createdAt);
      const end = new Date(inquiry.depositPaidAt);
      const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60) * 10) / 10;
      return {
        text: `${hours}h`,
        color: hours < 48 ? "text-green-400 font-bold" : "text-ink/60"
      };
    }
    const start = new Date(inquiry.createdAt);
    const now = new Date();
    const hours = Math.round((now.getTime() - start.getTime()) / (1000 * 60 * 60));
    return { text: `${hours}h active`, color: "text-ink/40" };
  };

  const pendingCount = inquiries.filter(i => i.status.toLowerCase() === 'pending').length;
  const acceptedCount = inquiries.filter(i => ['accepted', 'auto_responded'].includes(i.status.toLowerCase())).length;
  const depositCount = inquiries.filter(i => i.status.toLowerCase() === 'deposit_paid').length;

  return (
    <div className="min-h-screen bg-bg text-ink" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="px-8 md:px-16 py-8 border-b border-hairline relative">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink/40 mb-1">Your Secretary</p>
            <h1 className="text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
              {artist.businessName}
            </h1>
            <p className="text-sm text-ink/50">Inquiries Dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggleButton />
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-ink/60 hover:text-ink transition-colors"
              data-testid="button-menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
          
          {menuOpen && (
            <div className="absolute top-full right-8 md:right-16 mt-2 w-56 bg-surface border border-ink/20 shadow-lg z-50">
              <Link 
                href={`/artist/availability${authParam}`}
                className="flex items-center gap-3 px-4 py-3 text-sm text-ink/80 hover:bg-ink/10 transition-colors border-b border-ink/10"
                onClick={() => setMenuOpen(false)}
                data-testid="nav-calendar"
              >
                <Calendar className="w-4 h-4" />
                Availability
              </Link>
              <Link 
                href={`/${getActualSlug()}/circle${authParam}`}
                className="flex items-center gap-3 px-4 py-3 text-sm text-ink/80 hover:bg-ink/10 transition-colors border-b border-ink/10"
                onClick={() => setMenuOpen(false)}
                data-testid="nav-circle"
              >
                <Users className="w-4 h-4" />
                Network
              </Link>
              <Link 
                href={`/${getActualSlug()}/revenue${authParam}`}
                className="flex items-center gap-3 px-4 py-3 text-sm text-ink/80 hover:bg-ink/10 transition-colors border-b border-ink/10"
                onClick={() => setMenuOpen(false)}
                data-testid="nav-revenue"
              >
                <DollarSign className="w-4 h-4" />
                Revenue
              </Link>
              <Link 
                href={`/${getActualSlug()}/settings${authParam}`}
                className="flex items-center gap-3 px-4 py-3 text-sm text-ink/80 hover:bg-ink/10 transition-colors border-b border-ink/10"
                onClick={() => setMenuOpen(false)}
                data-testid="nav-settings"
              >
                <Settings className="w-4 h-4" />
                Update Settings
              </Link>
              <a 
                href="mailto:violet@beauvette.com"
                className="flex items-center gap-3 px-4 py-3 text-sm text-ink/80 hover:bg-ink/10 transition-colors border-b border-ink/10"
                onClick={() => setMenuOpen(false)}
                data-testid="nav-help"
              >
                <HelpCircle className="w-4 h-4" />
                Help
              </a>
              {useSessionAuth && (
                <button
                  onClick={() => { setMenuOpen(false); handleLogout(); }}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-ink/50 hover:bg-ink/10 transition-colors w-full text-left"
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8 md:px-16 py-12">
        {/* Quick Actions */}
        <div className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink/40 mb-4">Quick Actions</p>
          <div className="grid grid-cols-3 gap-3">
            <Link
              href={`/artist/schedules${authParam}`}
              className="flex items-center justify-center gap-2 p-4 border border-ink/20 bg-surface hover:border-ink/40 transition-colors text-sm"
              data-testid="action-create-schedule"
            >
              <Clock className="w-4 h-4 text-ink/60" />
              <span>Create Schedule</span>
            </Link>
            <button
              onClick={() => {
                if (inquiries.length > 0) {
                  setPendingAction('payment');
                  inquiriesRef.current?.scrollIntoView({ behavior: 'smooth' });
                } else {
                  setShowStandaloneInvoice(true);
                }
              }}
              className={`flex items-center justify-center gap-2 p-4 border bg-surface transition-colors text-sm ${pendingAction === 'payment' ? 'border-green-500/50 bg-green-900/20' : 'border-ink/20 hover:border-ink/40'}`}
              data-testid="action-send-payment"
            >
              <DollarSign className="w-4 h-4 text-ink/60" />
              <span>Create Invoice</span>
            </button>
            <button
              onClick={() => {
                if (inquiries.length > 0) {
                  setPendingAction('contract');
                  inquiriesRef.current?.scrollIntoView({ behavior: 'smooth' });
                } else {
                  setShowStandaloneContract(true);
                }
              }}
              className={`flex items-center justify-center gap-2 p-4 border bg-surface transition-colors text-sm ${pendingAction === 'contract' ? 'border-blue-500/50 bg-blue-900/20' : 'border-ink/20 hover:border-ink/40'}`}
              data-testid="action-send-contract"
            >
              <FileText className="w-4 h-4 text-ink/60" />
              <span>Create Contract</span>
            </button>
          </div>
        </div>

        {/* Response Settings - Quick Toggle */}
        {useSessionAuth && (
          <div className="mb-10">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink/40 mb-4">Response Mode</p>
            <div className="grid grid-cols-3 gap-3">
              <label 
                className={`cursor-pointer p-4 border transition-colors ${
                  (artist.autoResponderMode === 'smart' || artist.autoResponderMode === 'off' || !artist.autoResponderMode)
                    ? 'bg-[#F5F0E8] border-ink text-[#1A1A1A]' 
                    : 'bg-surface border-ink/20 hover:border-ink/40'
                }`}
                data-testid="mode-smart"
                title="You review each inquiry and decide how to respond"
              >
                <input 
                  type="radio" 
                  name="autoResponderMode" 
                  value="smart" 
                  checked={artist.autoResponderMode === 'smart' || artist.autoResponderMode === 'off' || !artist.autoResponderMode} 
                  onChange={() => updateAutoResponder.mutate('smart')} 
                  className="sr-only" 
                />
                <p className={`font-medium text-sm ${(artist.autoResponderMode === 'smart' || artist.autoResponderMode === 'off' || !artist.autoResponderMode) ? 'text-[#1A1A1A]' : 'text-ink'}`}>Manual</p>
                <p className={`text-xs mt-1 ${(artist.autoResponderMode === 'smart' || artist.autoResponderMode === 'off' || !artist.autoResponderMode) ? 'text-[#1A1A1A]/60' : 'text-ink/50'}`}>Review each inquiry</p>
              </label>
              <label 
                className={`cursor-pointer p-4 border transition-colors ${
                  artist.autoResponderMode === 'availability_smart'
                    ? 'bg-[#F5F0E8] border-ink text-[#1A1A1A]' 
                    : 'bg-surface border-ink/20 hover:border-ink/40'
                }`}
                data-testid="mode-availability-smart"
                title="Checks your calendar first. If available, sends your pricing. If booked, sends referrals to your circle."
              >
                <input 
                  type="radio" 
                  name="autoResponderMode" 
                  value="availability_smart" 
                  checked={artist.autoResponderMode === 'availability_smart'} 
                  onChange={() => updateAutoResponder.mutate('availability_smart')} 
                  className="sr-only" 
                />
                <p className={`font-medium text-sm ${artist.autoResponderMode === 'availability_smart' ? 'text-[#1A1A1A]' : 'text-ink'}`}>Calendar Smart</p>
                <p className={`text-xs mt-1 ${artist.autoResponderMode === 'availability_smart' ? 'text-[#1A1A1A]/60' : 'text-ink/50'}`}>Auto-send pricing or referrals</p>
              </label>
              <label 
                className={`cursor-pointer p-4 border transition-colors ${
                  (artist.autoResponderMode === 'paused' || artist.autoResponderMode === 'paused_with_referral')
                    ? 'bg-[#F5F0E8] border-ink text-[#1A1A1A]' 
                    : 'bg-surface border-ink/20 hover:border-ink/40'
                }`}
                data-testid="mode-vacation"
                title="Sends your away message to all new inquiries"
              >
                <input 
                  type="radio" 
                  name="autoResponderMode" 
                  value="paused" 
                  checked={artist.autoResponderMode === 'paused' || artist.autoResponderMode === 'paused_with_referral'} 
                  onChange={() => updateAutoResponder.mutate('paused')} 
                  className="sr-only" 
                />
                <p className={`font-medium text-sm ${(artist.autoResponderMode === 'paused' || artist.autoResponderMode === 'paused_with_referral') ? 'text-[#1A1A1A]' : 'text-ink'}`}>Vacation</p>
                <p className={`text-xs mt-1 ${(artist.autoResponderMode === 'paused' || artist.autoResponderMode === 'paused_with_referral') ? 'text-[#1A1A1A]/60' : 'text-ink/50'}`}>Away message</p>
              </label>
            </div>
          </div>
        )}

        <div className="space-y-4" ref={inquiriesRef}>
          {inquiries.length > 0 && (
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm text-ink/60">Your Clients</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowQuickChat(true)}
                  className="text-xs text-[#C4A35A] hover:text-[#C4A35A]/80 flex items-center gap-1"
                  data-testid="button-quick-chat"
                >
                  <MessageSquare className="w-3 h-3" />
                  Quick Chat
                </button>
                <button
                  onClick={() => setShowAddClient(true)}
                  className="text-xs text-[#C4A35A] hover:text-[#C4A35A]/80 flex items-center gap-1"
                  data-testid="button-add-client"
                >
                  <Users className="w-3 h-3" />
                  Add Client
                </button>
              </div>
            </div>
          )}
          {pendingAction && inquiries.length > 0 && (
            <div className={`p-4 border text-center text-sm ${pendingAction === 'payment' ? 'border-green-500/30 bg-green-900/10 text-green-300' : 'border-blue-500/30 bg-blue-900/10 text-blue-300'}`}>
              <span className="flex items-center justify-center gap-2">
                <ChevronDown className="w-4 h-4 animate-bounce" />
                Select a client to {pendingAction === 'payment' ? 'send payment' : 'send contract'}
                <button onClick={() => setPendingAction(null)} className="ml-2 text-xs underline opacity-70 hover:opacity-100">Cancel</button>
              </span>
            </div>
          )}
          {inquiries.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-ink/20 bg-surface">
              <p className="text-ink/50">No inquiries yet</p>
              <p className="text-sm text-ink/30 mt-2">Share your form link or add a client manually</p>
              <button
                onClick={() => setShowAddClient(true)}
                className="mt-4 px-4 py-2 bg-[#C4A35A] text-[#1A1A1A] rounded text-sm hover:bg-[#C4A35A]/90 inline-flex items-center gap-2"
                data-testid="button-add-first-client"
              >
                <Users className="w-4 h-4" />
                Add Client
              </button>
            </div>
          ) : (
            (showAllClients ? inquiries : inquiries.slice(0, 3)).map((inquiry) => {
              const velocity = getVelocity(inquiry);
              const handleInquiryClick = (e: React.MouseEvent) => {
                if (pendingAction) {
                  e.preventDefault();
                  const tab = pendingAction === 'payment' ? 'payment' : 'contract';
                  window.location.href = `/inquiry/${inquiry.threadToken}?tab=${tab}`;
                  setPendingAction(null);
                }
              };
              return (
                <a
                  key={inquiry.id}
                  href={`/inquiry/${inquiry.threadToken}`}
                  onClick={handleInquiryClick}
                  className={`block p-6 border bg-surface transition-all ${pendingAction ? (pendingAction === 'payment' ? 'border-green-500/30 hover:border-green-500/60 hover:bg-green-900/10' : 'border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-900/10') : 'border-ink/10 hover:border-ink/30'}`}
                  data-testid={`inquiry-row-${inquiry.id}`}
                >
                  {inquiry.hasDateConflict && (
                    <div className="flex items-center gap-2 px-3 py-2 mb-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>{inquiry.conflictSource || 'This date conflicts with your calendar'}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg" style={{ fontFamily: "'Fraunces', serif" }}>
                        {inquiry.clientName}
                      </h3>
                      <p className="text-sm text-ink/50 mt-1">{inquiry.clientEmail}</p>
                      {inquiry.eventLocation && (
                        <p className="text-xs text-ink/40 mt-1">{inquiry.eventLocation}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm" style={{ fontFamily: "'Fraunces', serif" }}>
                        {(() => {
                          const dateStr = inquiry.eventDate.split('T')[0];
                          const [year, month, day] = dateStr.split('-').map(Number);
                          return format(new Date(year, month - 1, day), "MMM d, yyyy");
                        })()}
                      </p>
                      <span className={`inline-block mt-2 px-2 py-1 text-[10px] tracking-[0.1em] uppercase ${getStatusStyle(inquiry.status)}`}>
                        {inquiry.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-ink/5">
                    <p className="text-xs text-ink/40">
                      Received {format(new Date(inquiry.createdAt), "MMM d 'at' h:mm a")}
                    </p>
                    <div className="flex items-center gap-3">
                      <p className={`text-xs ${velocity.color}`}>
                        {velocity.text}
                      </p>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeletingInquiryToken(inquiry.threadToken);
                        }}
                        className="p-1.5 rounded hover:bg-red-500/10 text-ink/30 hover:text-red-400 transition-colors"
                        title="Remove client"
                        data-testid={`button-delete-inquiry-${inquiry.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </a>
              );
            })
          )}
          {/* Show more/less toggle for clients */}
          {inquiries.length > 3 && (
            <button
              onClick={() => setShowAllClients(!showAllClients)}
              className="w-full py-3 text-sm text-[#C4A35A] hover:text-[#C4A35A]/80 border border-ink/10 bg-surface hover:bg-surface/80 transition-colors flex items-center justify-center gap-2"
              data-testid="toggle-show-all-clients"
            >
              {showAllClients ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show {inquiries.length - 3} more clients
                </>
              )}
            </button>
          )}
        </div>

        {/* Quick Chats Section */}
        {directChats.length > 0 && (
          <div className="space-y-4 mt-8">
            <h3 className="text-sm text-ink/60">Quick Chats</h3>
            {directChats.map((chat) => {
              const chatLink = token 
                ? `/quick-chat/${chat.threadToken}?token=${encodeURIComponent(token)}`
                : `/quick-chat/${chat.threadToken}`;
              return (
                <Link
                  key={chat.id}
                  href={chatLink}
                  className="block p-4 border border-ink/10 bg-surface hover:border-ink/30 transition-colors"
                  data-testid={`quick-chat-${chat.id}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">{chat.participantName}</p>
                      <p className="text-xs text-ink/50">{chat.participantEmail}</p>
                      <p className="text-xs text-ink/40 mt-1 capitalize">{chat.participantRole}</p>
                    </div>
                    <div className="text-right">
                      {chat.lastMessageAt && (
                        <p className="text-xs text-ink/40">
                          {new Date(chat.lastMessageAt).toLocaleDateString()}
                        </p>
                      )}
                      <p className="text-xs text-[#C4A35A] mt-1">View Chat</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-12 p-6 border border-dashed border-ink/20 text-center bg-surface">
          <p className="text-[10px] tracking-[0.2em] uppercase text-ink/40 mb-2">Your Form Link</p>
          <div className="flex items-center justify-center gap-3">
            <p className="text-sm text-ink/70 font-mono">dateinquiry.com/{artist.artistSlug}</p>
            <button
              onClick={handleCopyLink}
              className="p-2 rounded hover:bg-ink/5 transition-colors"
              data-testid="button-copy-link"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-ink/40" />
              )}
            </button>
          </div>
          {copied && (
            <p className="text-xs text-green-400 mt-2">Link copied!</p>
          )}
        </div>
      </main>

      {/* Standalone Invoice Modal */}
      {showStandaloneInvoice && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-bg border border-ink/20 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg mb-4" style={{ fontFamily: "'Fraunces', serif" }}>Create Invoice</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-ink/60 mb-1">Client Name</label>
                <input
                  type="text"
                  value={standaloneClientName}
                  onChange={(e) => setStandaloneClientName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full px-3 py-2 bg-surface border border-ink/20 rounded text-sm focus:outline-none focus:border-ink/40"
                  data-testid="input-standalone-client-name"
                />
              </div>
              <div>
                <label className="block text-xs text-ink/60 mb-1">Client Email</label>
                <input
                  type="email"
                  value={standaloneClientEmail}
                  onChange={(e) => setStandaloneClientEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full px-3 py-2 bg-surface border border-ink/20 rounded text-sm focus:outline-none focus:border-ink/40"
                  data-testid="input-standalone-client-email"
                />
              </div>
              <div>
                <label className="block text-xs text-ink/60 mb-1">Amount ($)</label>
                <input
                  type="number"
                  value={standaloneAmount}
                  onChange={(e) => setStandaloneAmount(e.target.value)}
                  placeholder="500"
                  className="w-full px-3 py-2 bg-surface border border-ink/20 rounded text-sm focus:outline-none focus:border-ink/40"
                  data-testid="input-standalone-amount"
                />
              </div>
              <div>
                <label className="block text-xs text-ink/60 mb-1">Description</label>
                <input
                  type="text"
                  value={standaloneDescription}
                  onChange={(e) => setStandaloneDescription(e.target.value)}
                  placeholder="Bridal makeup deposit"
                  className="w-full px-3 py-2 bg-surface border border-ink/20 rounded text-sm focus:outline-none focus:border-ink/40"
                  data-testid="input-standalone-description"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowStandaloneInvoice(false);
                  setStandaloneClientName("");
                  setStandaloneClientEmail("");
                  setStandaloneAmount("");
                  setStandaloneDescription("");
                }}
                className="flex-1 px-4 py-2 border border-ink/20 rounded text-sm hover:bg-ink/5"
                data-testid="button-cancel-standalone-invoice"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!standaloneClientName || !standaloneClientEmail || !standaloneAmount) {
                    toast({ title: "Missing info", description: "Please fill in client name, email, and amount", variant: "destructive" });
                    return;
                  }
                  setCreatingStandalone(true);
                  try {
                    const endpoint = token 
                      ? `/api/public/standalone-invoice?token=${encodeURIComponent(token)}`
                      : `/api/artist/standalone-invoice`;
                    const res = await fetch(endpoint, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: 'include',
                      body: JSON.stringify({
                        clientName: standaloneClientName,
                        clientEmail: standaloneClientEmail,
                        amount: standaloneAmount,
                        description: standaloneDescription,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Failed to create invoice");
                    toast({ title: "Invoice created", description: data.paymentLink ? "Payment link is ready" : "Invoice created successfully" });
                    if (data.paymentLink) {
                      navigator.clipboard.writeText(data.paymentLink);
                      toast({ title: "Link copied", description: "Payment link copied to clipboard" });
                    }
                    setShowStandaloneInvoice(false);
                    setStandaloneClientName("");
                    setStandaloneClientEmail("");
                    setStandaloneAmount("");
                    setStandaloneDescription("");
                  } catch (err: any) {
                    toast({ title: "Error", description: err.message, variant: "destructive" });
                  } finally {
                    setCreatingStandalone(false);
                  }
                }}
                disabled={creatingStandalone || !standaloneClientName || !standaloneClientEmail || !standaloneAmount}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="button-create-standalone-invoice"
              >
                {creatingStandalone ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standalone Contract Modal */}
      {showStandaloneContract && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-bg border border-ink/20 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg mb-4" style={{ fontFamily: "'Fraunces', serif" }}>Create Contract</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-ink/60 mb-1">Client Name</label>
                <input
                  type="text"
                  value={standaloneClientName}
                  onChange={(e) => setStandaloneClientName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full px-3 py-2 bg-surface border border-ink/20 rounded text-sm focus:outline-none focus:border-ink/40"
                  data-testid="input-standalone-contract-client-name"
                />
              </div>
              <div>
                <label className="block text-xs text-ink/60 mb-1">Client Email</label>
                <input
                  type="email"
                  value={standaloneClientEmail}
                  onChange={(e) => setStandaloneClientEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full px-3 py-2 bg-surface border border-ink/20 rounded text-sm focus:outline-none focus:border-ink/40"
                  data-testid="input-standalone-contract-client-email"
                />
              </div>
              <div>
                <label className="block text-xs text-ink/60 mb-1">Total Amount ($)</label>
                <input
                  type="number"
                  value={standaloneAmount}
                  onChange={(e) => setStandaloneAmount(e.target.value)}
                  placeholder="1500"
                  className="w-full px-3 py-2 bg-surface border border-ink/20 rounded text-sm focus:outline-none focus:border-ink/40"
                  data-testid="input-standalone-contract-amount"
                />
              </div>
              <div>
                <label className="block text-xs text-ink/60 mb-1">Service Description</label>
                <input
                  type="text"
                  value={standaloneDescription}
                  onChange={(e) => setStandaloneDescription(e.target.value)}
                  placeholder="Bridal makeup for wedding day"
                  className="w-full px-3 py-2 bg-surface border border-ink/20 rounded text-sm focus:outline-none focus:border-ink/40"
                  data-testid="input-standalone-contract-description"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowStandaloneContract(false);
                  setStandaloneClientName("");
                  setStandaloneClientEmail("");
                  setStandaloneAmount("");
                  setStandaloneDescription("");
                }}
                className="flex-1 px-4 py-2 border border-ink/20 rounded text-sm hover:bg-ink/5"
                data-testid="button-cancel-standalone-contract"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!standaloneClientName || !standaloneClientEmail) {
                    toast({ title: "Missing info", description: "Please fill in client name and email", variant: "destructive" });
                    return;
                  }
                  setCreatingStandalone(true);
                  try {
                    const endpoint = token 
                      ? `/api/public/standalone-contract?token=${encodeURIComponent(token)}`
                      : `/api/artist/standalone-contract`;
                    const res = await fetch(endpoint, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: 'include',
                      body: JSON.stringify({
                        clientName: standaloneClientName,
                        clientEmail: standaloneClientEmail,
                        totalAmount: standaloneAmount,
                        description: standaloneDescription,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Failed to create contract");
                    toast({ title: "Contract created", description: data.signingLink ? "Contract sent for signing" : "Contract created successfully" });
                    if (data.signingLink) {
                      navigator.clipboard.writeText(data.signingLink);
                      toast({ title: "Link copied", description: "Signing link copied to clipboard" });
                    }
                    setShowStandaloneContract(false);
                    setStandaloneClientName("");
                    setStandaloneClientEmail("");
                    setStandaloneAmount("");
                    setStandaloneDescription("");
                  } catch (err: any) {
                    toast({ title: "Error", description: err.message, variant: "destructive" });
                  } finally {
                    setCreatingStandalone(false);
                  }
                }}
                disabled={creatingStandalone || !standaloneClientName || !standaloneClientEmail}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="button-create-standalone-contract"
              >
                {creatingStandalone ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Create Contract
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddClient && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-bg border border-ink/20 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg mb-4" style={{ fontFamily: "'Fraunces', serif" }}>Add New Client</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-ink/60 mb-1">Client Name *</label>
                <input
                  type="text"
                  value={newClientData.clientName}
                  onChange={(e) => setNewClientData({ ...newClientData, clientName: e.target.value })}
                  placeholder="Jane Smith"
                  className="w-full px-3 py-2 bg-surface border border-ink/20 rounded text-sm focus:outline-none focus:border-ink/40"
                  data-testid="input-new-client-name"
                />
              </div>
              <div>
                <label className="block text-xs text-ink/60 mb-1">Email *</label>
                <input
                  type="email"
                  value={newClientData.clientEmail}
                  onChange={(e) => setNewClientData({ ...newClientData, clientEmail: e.target.value })}
                  placeholder="jane@example.com"
                  className="w-full px-3 py-2 bg-surface border border-ink/20 rounded text-sm focus:outline-none focus:border-ink/40"
                  data-testid="input-new-client-email"
                />
              </div>
              <div>
                <label className="block text-xs text-ink/60 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newClientData.clientPhone}
                  onChange={(e) => setNewClientData({ ...newClientData, clientPhone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="w-full px-3 py-2 bg-surface border border-ink/20 rounded text-sm focus:outline-none focus:border-ink/40"
                  data-testid="input-new-client-phone"
                />
              </div>
              <div>
                <label className="block text-xs text-ink/60 mb-1">Event Date</label>
                <input
                  type="date"
                  value={newClientData.eventDate}
                  onChange={(e) => setNewClientData({ ...newClientData, eventDate: e.target.value })}
                  className="w-full px-3 py-2 bg-surface border border-ink/20 rounded text-sm focus:outline-none focus:border-ink/40"
                  data-testid="input-new-client-event-date"
                />
              </div>
              <div>
                <label className="block text-xs text-ink/60 mb-1">Notes</label>
                <textarea
                  value={newClientData.notes}
                  onChange={(e) => setNewClientData({ ...newClientData, notes: e.target.value })}
                  placeholder="Any notes about this client..."
                  rows={2}
                  className="w-full px-3 py-2 bg-surface border border-ink/20 rounded text-sm focus:outline-none focus:border-ink/40 resize-none"
                  data-testid="input-new-client-notes"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddClient(false);
                  setNewClientData({ clientName: "", clientEmail: "", clientPhone: "", eventDate: "", notes: "" });
                }}
                className="flex-1 px-4 py-2 border border-ink/20 rounded text-sm hover:bg-ink/5"
                data-testid="button-cancel-add-client"
              >
                Cancel
              </button>
              <button
                onClick={() => createClient.mutate(newClientData)}
                disabled={createClient.isPending || !newClientData.clientName || !newClientData.clientEmail}
                className="flex-1 px-4 py-2 bg-[#C4A35A] hover:bg-[#C4A35A]/90 text-[#1A1A1A] rounded text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="button-create-client"
              >
                {createClient.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                Add Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Chat Modal */}
      {showQuickChat && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-bg border border-ink/20 rounded-lg p-6 max-w-md w-full">
            {quickChatLink ? (
              <div className="space-y-4">
                <h3 className="text-lg" style={{ fontFamily: "'Fraunces', serif" }}>Chat Created!</h3>
                <div className="bg-green-900/20 border border-green-500/30 p-4 rounded">
                  <p className="text-xs text-green-400 mb-2">Share this link with {quickChatData.participantName}:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={quickChatLink}
                      readOnly
                      className="flex-1 px-3 py-2 bg-surface border border-ink/20 rounded text-xs text-ink/80"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(quickChatLink);
                        toast({ title: "Link copied!" });
                      }}
                      className="px-3 py-2 bg-[#C4A35A] text-[#1A1A1A] rounded text-xs hover:bg-[#C4A35A]/90 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setQuickChatLink(null);
                      setQuickChatData({ participantName: "", participantEmail: "", participantRole: "planner", initialMessage: "" });
                    }}
                    className="flex-1 py-2 bg-[#C4A35A] text-[#1A1A1A] rounded text-sm hover:bg-[#C4A35A]/90 flex items-center justify-center gap-2"
                    data-testid="button-start-another-chat"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Start Another
                  </button>
                  <button
                    onClick={() => { 
                      setShowQuickChat(false); 
                      setQuickChatLink(null);
                      setQuickChatData({ participantName: "", participantEmail: "", participantRole: "planner", initialMessage: "" });
                    }}
                    className="flex-1 py-2 border border-ink/20 rounded text-sm hover:bg-ink/5"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-lg mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Quick Chat</h3>
                <p className="text-xs text-ink/50 mb-4">Start a conversation with anyone via their email</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-ink/60 mb-1">Who is this?</label>
                    <select
                      value={quickChatData.participantRole}
                      onChange={(e) => setQuickChatData({ ...quickChatData, participantRole: e.target.value as any })}
                      className="w-full px-3 py-2 bg-surface border border-ink/20 rounded text-sm focus:outline-none focus:border-ink/40"
                      data-testid="select-quick-chat-role"
                    >
                      <option value="planner">Wedding Planner</option>
                      <option value="client">Client</option>
                      <option value="vendor">Other Vendor</option>
                      <option value="contact">Other Contact</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-ink/60 mb-1">Their Name *</label>
                    <input
                      type="text"
                      value={quickChatData.participantName}
                      onChange={(e) => setQuickChatData({ ...quickChatData, participantName: e.target.value })}
                      placeholder="Sarah Johnson"
                      className="w-full px-3 py-2 bg-surface border border-ink/20 rounded text-sm focus:outline-none focus:border-ink/40"
                      data-testid="input-quick-chat-name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-ink/60 mb-1">Their Email *</label>
                    <input
                      type="email"
                      value={quickChatData.participantEmail}
                      onChange={(e) => setQuickChatData({ ...quickChatData, participantEmail: e.target.value })}
                      placeholder="sarah@plannerco.com"
                      className="w-full px-3 py-2 bg-surface border border-ink/20 rounded text-sm focus:outline-none focus:border-ink/40"
                      data-testid="input-quick-chat-email"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-ink/60 mb-1">Initial Message (optional)</label>
                    <textarea
                      value={quickChatData.initialMessage}
                      onChange={(e) => setQuickChatData({ ...quickChatData, initialMessage: e.target.value })}
                      placeholder="Hi! Let's connect about..."
                      rows={2}
                      className="w-full px-3 py-2 bg-surface border border-ink/20 rounded text-sm focus:outline-none focus:border-ink/40 resize-none"
                      data-testid="input-quick-chat-message"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowQuickChat(false);
                      setQuickChatData({ participantName: "", participantEmail: "", participantRole: "planner", initialMessage: "" });
                    }}
                    className="flex-1 px-4 py-2 border border-ink/20 rounded text-sm hover:bg-ink/5"
                    data-testid="button-cancel-quick-chat"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setCreatingQuickChat(true);
                      try {
                        const endpoint = token 
                          ? `/api/public/direct-chats?token=${encodeURIComponent(token)}`
                          : `/api/artist/direct-chats`;
                        const res = await fetch(endpoint, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: 'include',
                          body: JSON.stringify(quickChatData),
                        });
                        const data = await res.json();
                        if (res.ok) {
                          setQuickChatLink(data.participantLink);
                          queryClient.invalidateQueries({ queryKey: ['/api/direct-chats', token] });
                          toast({ title: "Chat created!" });
                        } else {
                          toast({ title: "Error", description: data.error, variant: "destructive" });
                        }
                      } catch (error) {
                        toast({ title: "Error", description: "Failed to create chat", variant: "destructive" });
                      } finally {
                        setCreatingQuickChat(false);
                      }
                    }}
                    disabled={creatingQuickChat || !quickChatData.participantName || !quickChatData.participantEmail}
                    className="flex-1 px-4 py-2 bg-[#C4A35A] hover:bg-[#C4A35A]/90 text-[#1A1A1A] rounded text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    data-testid="button-create-quick-chat"
                  >
                    {creatingQuickChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Start Chat
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Quick Guide for new users */}
      <QuickGuide
        guideId="artist-dashboard"
        title="Your Dashboard"
        steps={[
          {
            title: "Your Client List",
            description: "All your inquiries appear here. Click any client to open their conversation thread.",
            icon: <MessageSquare className="h-5 w-5" />,
          },
          {
            title: "Manage Your Calendar",
            description: "Use the Calendar link to block off dates when you're unavailable or see your bookings at a glance.",
            icon: <CalendarDays className="h-5 w-5" />,
          },
          {
            title: "Share Your Link",
            description: "Copy your inquiry link and add it to your Instagram bio or website. New clients will appear here automatically.",
            icon: <Send className="h-5 w-5" />,
          },
          {
            title: "Build Your Circle",
            description: "Invite other artists you trust. When you're booked, you can refer clients to them instead of turning them away.",
            icon: <Users className="h-5 w-5" />,
          },
        ]}
      />

      {/* Delete Confirmation Modal */}
      {deletingInquiryToken && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-bg border border-ink/20 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg mb-2" style={{ fontFamily: "'Fraunces', serif" }}>Remove Client?</h3>
            <p className="text-sm text-ink/60 mb-6">
              This will permanently delete this inquiry and all related data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingInquiryToken(null)}
                className="flex-1 px-4 py-2 border border-ink/20 rounded text-sm hover:bg-ink/5"
                data-testid="button-cancel-delete"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteInquiry.mutate(deletingInquiryToken)}
                disabled={deleteInquiry.isPending}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                data-testid="button-confirm-delete"
              >
                {deleteInquiry.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* AI Secretary Chatbox */}
      <SecretaryChatbox 
        isOpen={secretaryChatOpen} 
        onToggle={() => setSecretaryChatOpen(!secretaryChatOpen)} 
      />
    </div>
  );
}
