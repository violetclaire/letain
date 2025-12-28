import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useSearch, Link, useLocation } from "wouter";
import { format } from "date-fns";
import { Loader2, Settings, Calendar, Users, Copy, Check, Mail, CheckCircle, LogOut, FileText, DollarSign, Clock, ChevronDown } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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
}

interface ArtistProfile {
  id: string;
  businessName: string;
  artistSlug: string;
  autoResponderMode: 'off' | 'info_sheet' | 'smart' | 'paused' | 'paused_with_referral';
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
  const queryClient = useQueryClient();
  
  // Get auth state for session-based login
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  
  // Extract token from query string
  const urlParams = new URLSearchParams(searchString);
  const token = urlParams.get('token');
  
  // Determine auth method: session (logged in user) or token
  const useSessionAuth = isAuthenticated && user?.role === 'artist';

  const requestLink = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/public/artists/resend-settings-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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

  // Fetch data using token OR session auth
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/artist-admin/${slug}`, token, useSessionAuth],
    queryFn: async () => {
      // If using session auth, call the authenticated endpoint
      if (useSessionAuth) {
        const res = await fetch(`/api/artist/admin-data`, {
          credentials: 'include'
        });
        if (!res.ok) {
          if (res.status === 401) throw new Error("Access denied");
          throw new Error("Failed to load dashboard");
        }
        return res.json();
      }
      // Otherwise use token auth
      const res = await fetch(`/api/public/artist-admin/${slug}?token=${token}`);
      if (!res.ok) {
        if (res.status === 401) throw new Error("Access denied");
        throw new Error("Artist not found");
      }
      return res.json();
    },
    enabled: !!slug && (!!token || useSessionAuth),
  });

  // Show loading while checking auth
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#F5F0E8]/30" />
      </div>
    );
  }

  // If not authenticated via token or session, show login form
  if (!token && !useSessionAuth) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-[#222] p-8 border border-[#F5F0E8]/10 rounded">
          {emailSent ? (
            <div className="text-center">
              <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-5" />
              <h2 className="text-xl text-[#F5F0E8] mb-2" style={{ fontFamily: "'Fraunces', serif" }}>Check Your Email</h2>
              <p className="text-sm text-[#F5F0E8]/60 mb-4">
                Your dashboard link is on its way. Check your inbox (and spam folder).
              </p>
              <button
                onClick={() => { setEmailSent(false); setEmail(""); }}
                className="text-sm text-[#F5F0E8]/60 underline"
              >
                Try different email
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl text-[#F5F0E8] mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Your Secretary</h1>
                <p className="text-xs text-[#F5F0E8]/50">Access your dashboard</p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); if (email.trim()) requestLink.mutate(); }} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full border border-[#F5F0E8]/20 bg-transparent px-4 py-3 text-sm text-[#F5F0E8] focus:outline-none focus:border-[#F5F0E8]/50 placeholder:text-[#F5F0E8]/30 rounded"
                  data-testid="input-admin-email"
                />
                <button
                  type="submit"
                  disabled={requestLink.isPending || !email.trim()}
                  className="w-full bg-[#F5F0E8] text-[#1A1A1A] py-3 text-sm uppercase tracking-wide hover:bg-[#F5F0E8]/90 disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="button-send-dashboard-link"
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
                <Link href="/artist-login" className="text-xs text-[#F5F0E8]/50 underline">
                  Or sign in with password
                </Link>
              </div>

              {/* Inquiry Link Section */}
              <div className="mt-6 pt-5 border-t border-[#F5F0E8]/10">
                <p className="text-[10px] uppercase tracking-wide text-[#F5F0E8]/50 mb-2">Your Inquiry Link</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-[#F5F0E8]/5 px-3 py-2 text-xs text-[#F5F0E8]/70 rounded truncate">
                    dateinquiry.com/{getActualSlug()}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyInquiryLink}
                    className="px-3 py-2 bg-[#F5F0E8] text-[#1A1A1A] text-xs rounded flex items-center gap-1"
                    data-testid="button-copy-inquiry-link"
                  >
                    {linkCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <p className="text-[10px] text-[#F5F0E8]/40 mt-2">Share this link on social media</p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (error || !data) {
    const message = error?.message === "Access denied" 
      ? "Invalid or expired access link"
      : "Artist not found";
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center px-8">
        <div className="text-center">
          <p className="text-sm text-[#F5F0E8]/50 mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
            {message}
          </p>
          <Link href="/artist-login" className="text-xs text-[#F5F0E8]/60 underline">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const { artist, inquiries }: { artist: ArtistProfile; inquiries: Inquiry[] } = data;
  const authParam = useSessionAuth ? '' : `?token=${token}`;

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending": return "bg-yellow-900/30 text-yellow-300";
      case "accepted": return "bg-green-900/30 text-green-300";
      case "auto_responded": return "bg-blue-900/30 text-blue-300";
      case "deposit_paid": return "bg-green-800/40 text-green-200";
      case "referred": return "bg-purple-900/30 text-purple-300";
      case "declined": return "bg-[#F5F0E8]/10 text-[#F5F0E8]/50";
      default: return "bg-[#F5F0E8]/10 text-[#F5F0E8]/50";
    }
  };

  const getVelocity = (inquiry: Inquiry) => {
    if (!inquiry.createdAt) return { text: "—", color: "text-[#F5F0E8]/40" };
    if (inquiry.depositPaidAt) {
      const start = new Date(inquiry.createdAt);
      const end = new Date(inquiry.depositPaidAt);
      const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60) * 10) / 10;
      return {
        text: `${hours}h`,
        color: hours < 48 ? "text-green-400 font-bold" : "text-[#F5F0E8]/60"
      };
    }
    const start = new Date(inquiry.createdAt);
    const now = new Date();
    const hours = Math.round((now.getTime() - start.getTime()) / (1000 * 60 * 60));
    return { text: `${hours}h active`, color: "text-[#F5F0E8]/40" };
  };

  const pendingCount = inquiries.filter(i => i.status.toLowerCase() === 'pending').length;
  const acceptedCount = inquiries.filter(i => ['accepted', 'auto_responded'].includes(i.status.toLowerCase())).length;
  const depositCount = inquiries.filter(i => i.status.toLowerCase() === 'deposit_paid').length;

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="px-8 md:px-16 py-8 border-b border-[#F5F0E8]/10">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#F5F0E8]/40 mb-1">Your Secretary</p>
            <h1 className="text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
              {artist.businessName}
            </h1>
            <p className="text-sm text-[#F5F0E8]/50">Inquiries Dashboard</p>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link 
              href={`/${getActualSlug()}/calendar${authParam}`}
              className="flex items-center gap-2 text-[#F5F0E8]/60 hover:text-[#F5F0E8] transition-colors"
              data-testid="nav-calendar"
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Calendar</span>
            </Link>
            <Link 
              href={`/${getActualSlug()}/circle${authParam}`}
              className="flex items-center gap-2 text-[#F5F0E8]/60 hover:text-[#F5F0E8] transition-colors"
              data-testid="nav-circle"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Circle</span>
            </Link>
            <Link 
              href={`/${getActualSlug()}/settings${authParam}`}
              className="flex items-center gap-2 text-[#F5F0E8]/60 hover:text-[#F5F0E8] transition-colors"
              data-testid="nav-settings"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
            {useSessionAuth && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-[#F5F0E8]/40 hover:text-[#F5F0E8]/70 transition-colors"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8 md:px-16 py-12">
        {/* Quick Actions */}
        <div className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#F5F0E8]/40 mb-4">Quick Actions</p>
          <div className="grid grid-cols-3 gap-3">
            <Link
              href={`/artist/schedules${authParam}`}
              className="flex items-center justify-center gap-2 p-4 border border-[#F5F0E8]/20 bg-[#222] hover:border-[#F5F0E8]/40 transition-colors text-sm"
              data-testid="action-create-schedule"
            >
              <Clock className="w-4 h-4 text-[#F5F0E8]/60" />
              <span>Create Schedule</span>
            </Link>
            <button
              onClick={() => {
                setPendingAction('payment');
                if (inquiries.length > 0) {
                  inquiriesRef.current?.scrollIntoView({ behavior: 'smooth' });
                } else {
                  toast({ title: "Select a client", description: "Add a client inquiry first, then select them to send an invoice" });
                }
              }}
              className={`flex items-center justify-center gap-2 p-4 border bg-[#222] transition-colors text-sm ${pendingAction === 'payment' ? 'border-green-500/50 bg-green-900/20' : 'border-[#F5F0E8]/20 hover:border-[#F5F0E8]/40'}`}
              data-testid="action-send-payment"
            >
              <DollarSign className="w-4 h-4 text-[#F5F0E8]/60" />
              <span>Create Invoice</span>
            </button>
            <button
              onClick={() => {
                setPendingAction('contract');
                if (inquiries.length > 0) {
                  inquiriesRef.current?.scrollIntoView({ behavior: 'smooth' });
                } else {
                  toast({ title: "Select a client", description: "Add a client inquiry first, then select them to send a contract" });
                }
              }}
              className={`flex items-center justify-center gap-2 p-4 border bg-[#222] transition-colors text-sm ${pendingAction === 'contract' ? 'border-blue-500/50 bg-blue-900/20' : 'border-[#F5F0E8]/20 hover:border-[#F5F0E8]/40'}`}
              data-testid="action-send-contract"
            >
              <FileText className="w-4 h-4 text-[#F5F0E8]/60" />
              <span>Create Contract</span>
            </button>
          </div>
        </div>

        {/* Response Settings - Quick Toggle */}
        {useSessionAuth && (
          <div className="mb-10">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#F5F0E8]/40 mb-4">Response Mode</p>
            <div className="grid grid-cols-5 gap-2">
              <label 
                className={`cursor-pointer p-3 border text-center transition-colors ${
                  artist.autoResponderMode === 'smart' 
                    ? 'bg-[#F5F0E8] border-[#F5F0E8] text-[#1A1A1A]' 
                    : 'bg-[#222] border-[#F5F0E8]/20 hover:border-[#F5F0E8]/40'
                }`}
                data-testid="mode-smart"
              >
                <input 
                  type="radio" 
                  name="autoResponderMode" 
                  value="smart" 
                  checked={artist.autoResponderMode === 'smart'} 
                  onChange={() => updateAutoResponder.mutate('smart')} 
                  className="sr-only" 
                />
                <p className={`font-medium text-sm ${artist.autoResponderMode === 'smart' ? 'text-[#1A1A1A]' : 'text-[#F5F0E8]'}`}>Smart</p>
                <p className={`text-[10px] mt-0.5 ${artist.autoResponderMode === 'smart' ? 'text-[#1A1A1A]/60' : 'text-[#F5F0E8]/50'}`}>Calendar-aware</p>
              </label>
              <label 
                className={`cursor-pointer p-3 border text-center transition-colors ${
                  artist.autoResponderMode === 'info_sheet' 
                    ? 'bg-[#F5F0E8] border-[#F5F0E8] text-[#1A1A1A]' 
                    : 'bg-[#222] border-[#F5F0E8]/20 hover:border-[#F5F0E8]/40'
                }`}
                data-testid="mode-info-sheet"
              >
                <input 
                  type="radio" 
                  name="autoResponderMode" 
                  value="info_sheet" 
                  checked={artist.autoResponderMode === 'info_sheet'} 
                  onChange={() => updateAutoResponder.mutate('info_sheet')} 
                  className="sr-only" 
                />
                <p className={`font-medium text-sm ${artist.autoResponderMode === 'info_sheet' ? 'text-[#1A1A1A]' : 'text-[#F5F0E8]'}`}>Info Sheet</p>
                <p className={`text-[10px] mt-0.5 ${artist.autoResponderMode === 'info_sheet' ? 'text-[#1A1A1A]/60' : 'text-[#F5F0E8]/50'}`}>Auto-send always</p>
              </label>
              <label 
                className={`cursor-pointer p-3 border text-center transition-colors ${
                  artist.autoResponderMode === 'paused_with_referral' 
                    ? 'bg-[#F5F0E8] border-[#F5F0E8] text-[#1A1A1A]' 
                    : 'bg-[#222] border-[#F5F0E8]/20 hover:border-[#F5F0E8]/40'
                }`}
                data-testid="mode-paused-referral"
              >
                <input 
                  type="radio" 
                  name="autoResponderMode" 
                  value="paused_with_referral" 
                  checked={artist.autoResponderMode === 'paused_with_referral'} 
                  onChange={() => updateAutoResponder.mutate('paused_with_referral')} 
                  className="sr-only" 
                />
                <p className={`font-medium text-sm ${artist.autoResponderMode === 'paused_with_referral' ? 'text-[#1A1A1A]' : 'text-[#F5F0E8]'}`}>Paused + Refer</p>
                <p className={`text-[10px] mt-0.5 ${artist.autoResponderMode === 'paused_with_referral' ? 'text-[#1A1A1A]/60' : 'text-[#F5F0E8]/50'}`}>Send to circle</p>
              </label>
              <label 
                className={`cursor-pointer p-3 border text-center transition-colors ${
                  artist.autoResponderMode === 'paused' 
                    ? 'bg-[#F5F0E8] border-[#F5F0E8] text-[#1A1A1A]' 
                    : 'bg-[#222] border-[#F5F0E8]/20 hover:border-[#F5F0E8]/40'
                }`}
                data-testid="mode-paused"
              >
                <input 
                  type="radio" 
                  name="autoResponderMode" 
                  value="paused" 
                  checked={artist.autoResponderMode === 'paused'} 
                  onChange={() => updateAutoResponder.mutate('paused')} 
                  className="sr-only" 
                />
                <p className={`font-medium text-sm ${artist.autoResponderMode === 'paused' ? 'text-[#1A1A1A]' : 'text-[#F5F0E8]'}`}>Paused</p>
                <p className={`text-[10px] mt-0.5 ${artist.autoResponderMode === 'paused' ? 'text-[#1A1A1A]/60' : 'text-[#F5F0E8]/50'}`}>No response</p>
              </label>
              <label 
                className={`cursor-pointer p-3 border text-center transition-colors ${
                  (artist.autoResponderMode === 'off' || !artist.autoResponderMode)
                    ? 'bg-[#F5F0E8] border-[#F5F0E8] text-[#1A1A1A]' 
                    : 'bg-[#222] border-[#F5F0E8]/20 hover:border-[#F5F0E8]/40'
                }`}
                data-testid="mode-off"
              >
                <input 
                  type="radio" 
                  name="autoResponderMode" 
                  value="off" 
                  checked={artist.autoResponderMode === 'off' || !artist.autoResponderMode} 
                  onChange={() => updateAutoResponder.mutate('off')} 
                  className="sr-only" 
                />
                <p className={`font-medium text-sm ${(artist.autoResponderMode === 'off' || !artist.autoResponderMode) ? 'text-[#1A1A1A]' : 'text-[#F5F0E8]'}`}>Off</p>
                <p className={`text-[10px] mt-0.5 ${(artist.autoResponderMode === 'off' || !artist.autoResponderMode) ? 'text-[#1A1A1A]/60' : 'text-[#F5F0E8]/50'}`}>Manual only</p>
              </label>
            </div>
          </div>
        )}

        <div className="space-y-4" ref={inquiriesRef}>
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
            <div className="text-center py-16 border border-dashed border-[#F5F0E8]/20 bg-[#222]">
              <p className="text-[#F5F0E8]/50">No inquiries yet</p>
              <p className="text-sm text-[#F5F0E8]/30 mt-2">Share your form link to start receiving inquiries</p>
            </div>
          ) : (
            inquiries.map((inquiry) => {
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
                  className={`block p-6 border bg-[#222] transition-all ${pendingAction ? (pendingAction === 'payment' ? 'border-green-500/30 hover:border-green-500/60 hover:bg-green-900/10' : 'border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-900/10') : 'border-[#F5F0E8]/10 hover:border-[#F5F0E8]/30'}`}
                  data-testid={`inquiry-row-${inquiry.id}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg" style={{ fontFamily: "'Fraunces', serif" }}>
                        {inquiry.clientName}
                      </h3>
                      <p className="text-sm text-[#F5F0E8]/50 mt-1">{inquiry.clientEmail}</p>
                      {inquiry.eventLocation && (
                        <p className="text-xs text-[#F5F0E8]/40 mt-1">{inquiry.eventLocation}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm" style={{ fontFamily: "'Fraunces', serif" }}>
                        {format(new Date(inquiry.eventDate), "MMM d, yyyy")}
                      </p>
                      <span className={`inline-block mt-2 px-2 py-1 text-[10px] tracking-[0.1em] uppercase ${getStatusStyle(inquiry.status)}`}>
                        {inquiry.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#F5F0E8]/5">
                    <p className="text-xs text-[#F5F0E8]/40">
                      Received {format(new Date(inquiry.createdAt), "MMM d 'at' h:mm a")}
                    </p>
                    <p className={`text-xs ${velocity.color}`}>
                      {velocity.text}
                    </p>
                  </div>
                </a>
              );
            })
          )}
        </div>

        <div className="mt-12 p-6 border border-dashed border-[#F5F0E8]/20 text-center bg-[#222]">
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#F5F0E8]/40 mb-2">Your Form Link</p>
          <div className="flex items-center justify-center gap-3">
            <p className="text-sm text-[#F5F0E8]/70 font-mono">dateinquiry.com/{artist.artistSlug}</p>
            <button
              onClick={handleCopyLink}
              className="p-2 rounded hover:bg-[#F5F0E8]/5 transition-colors"
              data-testid="button-copy-link"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4 text-[#F5F0E8]/40" />
              )}
            </button>
          </div>
          {copied && (
            <p className="text-xs text-green-400 mt-2">Link copied!</p>
          )}
        </div>
      </main>
    </div>
  );
}
