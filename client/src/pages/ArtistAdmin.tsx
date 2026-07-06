import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useSearch, Link } from "wouter";
import { format } from "date-fns";
import { Loader2, Settings, Calendar, Users, Copy, Check, Mail, CheckCircle, LogOut, Clock, ChevronDown, ChevronUp, Menu, X, HelpCircle, Trash2, AlertTriangle, MessageSquare, Send, CalendarDays, Moon, Sun, Search } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { ArtistProfile } from "@shared/schema";
import type { InquiryUI } from "@shared/types";
import QuickGuide from "@/components/QuickGuide";
import { useTheme } from "@/contexts/ThemeContext";

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

interface Inquiry extends InquiryUI {
  hasDateConflict?: boolean;
  conflictSource?: string;
}

interface ScheduleDraftSnapshot {
  id: string;
  status?: string | null;
}

interface RouteTargetSnapshot {
  email?: string | null;
  phone?: string | null;
  active?: boolean | null;
}

interface ArtistProfileReadinessSnapshot {
  infoSheetEnabled?: boolean | null;
  infoSheetContent?: string | null;
  infoSheetPdfUrl?: string | null;
  pricingInfo?: string | null;
  plannerInfoSheet?: string | null;
  plannerPricing?: string | null;
}

interface ArtistServiceSnapshot {
  id?: string;
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function plural(count: number, singular: string, pluralLabel = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralLabel}`;
}

function isReachableRouteTarget(target: RouteTargetSnapshot): boolean {
  return target.active !== false && (hasText(target.email) || hasText(target.phone));
}

function hasReusableInfoMaterial(
  profile: ArtistProfileReadinessSnapshot | null | undefined,
  services: ArtistServiceSnapshot[],
): boolean {
  return Boolean(
    services.length > 0 ||
    hasText(profile?.pricingInfo) ||
    hasText(profile?.infoSheetContent) ||
    hasText(profile?.infoSheetPdfUrl) ||
    hasText(profile?.plannerInfoSheet) ||
    hasText(profile?.plannerPricing)
  );
}

export default function ArtistAdmin() {
  const [, params] = useRoute("/admin/:slug");
  const searchString = useSearch();
  const slug = params?.slug;
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const inquiriesRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [deletingInquiryToken, setDeletingInquiryToken] = useState<string | null>(null);
  
  // Client list collapse state (show only 3 on mobile initially)
  const [showAllClients, setShowAllClients] = useState(false);
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
    navigator.clipboard.writeText(`https://briarwood.ai/${getActualSlug()}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };
  
  const handleCopyLink = () => {
    const link = `https://briarwood.ai/${getActualSlug()}`;
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
          let errorMsg = "Failed to load dashboard";
          try {
            const data = await res.json();
            errorMsg = data.error || errorMsg;
          } catch (e) {
            console.error("Failed to parse error response:", e);
          }
          if (res.status === 401) throw new Error("Access denied");
          throw new Error(errorMsg);
        }
        return res.json();
      }
      // Otherwise use token auth
      const res = await fetch(`/api/public/artist-admin/${slug}?token=${token}`);
      if (!res.ok) {
        let errorMsg = "Artist not found";
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch (e) {
          console.error("Failed to parse error response:", e);
        }
        if (res.status === 401) throw new Error("Access denied");
        throw new Error(errorMsg);
      }
      return res.json();
    },
    enabled: !!slug && (!!token || useSessionAuth),
  });

  const scheduleDraftsQuery = useQuery<ScheduleDraftSnapshot[]>({
    queryKey: ["/api/schedule-drafts", "command-center"],
    queryFn: async () => {
      const res = await fetch("/api/schedule-drafts", { credentials: "include" });
      if (!res.ok) return [];
      const payload = await res.json();
      return Array.isArray(payload) ? payload : [];
    },
    enabled: useSessionAuth,
    retry: false,
  });

  const routeTargetsQuery = useQuery<{ targets: RouteTargetSnapshot[] }>({
    queryKey: ["/api/route-targets", "command-center"],
    queryFn: async () => {
      const res = await fetch("/api/route-targets", { credentials: "include" });
      if (!res.ok) return { targets: [] };
      const payload = await res.json();
      return { targets: Array.isArray(payload?.targets) ? payload.targets : [] };
    },
    enabled: useSessionAuth,
    retry: false,
  });

  const artistProfileReadinessQuery = useQuery<ArtistProfileReadinessSnapshot | null>({
    queryKey: ["artistProfile", user?.id, "command-center"],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/artist-profiles/${encodeURIComponent(user.id)}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json() as Promise<ArtistProfileReadinessSnapshot>;
    },
    enabled: useSessionAuth && Boolean(user?.id),
    retry: false,
  });

  const artistServicesReadinessQuery = useQuery<ArtistServiceSnapshot[]>({
    queryKey: ["artistServices", user?.id, "command-center"],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/artist-services/${encodeURIComponent(user.id)}`, { credentials: "include" });
      if (!res.ok) return [];
      const payload = await res.json();
      return Array.isArray(payload) ? payload : [];
    },
    enabled: useSessionAuth && Boolean(user?.id),
    retry: false,
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
                    briarwood.ai/{slug}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`https://briarwood.ai/${slug}`);
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
  const activeInquiryCount = inquiries.filter((i) => !["accepted", "declined", "referred", "deposit_paid"].includes(i.status.toLowerCase())).length;
  const dateConflictCount = inquiries.filter((i) => i.hasDateConflict).length;
  const todayAttentionCount = pendingCount + directChats.length + dateConflictCount;
  const scheduleDrafts = scheduleDraftsQuery.data ?? [];
  const routeTargets = routeTargetsQuery.data?.targets ?? [];
  const reachableRouteTargets = routeTargets.filter(isReachableRouteTarget).length;
  const missingContactRouteTargets = routeTargets.filter((target) => target.active !== false && !isReachableRouteTarget(target)).length;
  const profileReadiness = artistProfileReadinessQuery.data ?? null;
  const artistServices = artistServicesReadinessQuery.data ?? [];
  const reusableInfoEnabled = profileReadiness?.infoSheetEnabled === true;
  const pricingInfoReady = reusableInfoEnabled && hasReusableInfoMaterial(profileReadiness, artistServices);
  const settingsHref = useSessionAuth ? "/settings" : `/${getActualSlug()}/settings${authParam}`;

  const needsAttentionSnapshot = todayAttentionCount > 0
    ? `${plural(todayAttentionCount, "bounded review signal")} surfaced: ${plural(pendingCount, "pending inquiry", "pending inquiries")}, ${plural(directChats.length, "direct chat")}, ${plural(dateConflictCount, "date conflict")}.`
    : "No urgent review signals surfaced.";
  const inquiriesSnapshot = `${plural(activeInquiryCount, "active inquiry", "active inquiries")} in the review queue; ${plural(pendingCount, "pending inquiry", "pending inquiries")}.`;
  const scheduleDraftsSnapshot = !useSessionAuth
    ? "Open schedules to review private drafts."
    : scheduleDraftsQuery.isLoading
      ? "Checking private draft count."
      : `${plural(scheduleDrafts.length, "private draft")} available for schedule readiness.`;
  const privateNetworkSnapshot = !useSessionAuth
    ? "Open Private network to review contact readiness."
    : routeTargetsQuery.isLoading
      ? "Checking route target contact readiness."
      : routeTargets.length === 0
        ? "No route targets saved yet; review Private network."
        : reachableRouteTargets > 0
          ? `${plural(reachableRouteTargets, "reachable route option")}; ${plural(missingContactRouteTargets, "target")} missing phone or email.`
          : `${plural(missingContactRouteTargets, "route target")} need phone or email before outreach.`;
  const settingsSnapshot = !useSessionAuth
    ? "Open Settings / Pricing Info to review reusable setup."
    : artistProfileReadinessQuery.isLoading || artistServicesReadinessQuery.isLoading
      ? "Checking reusable Pricing / Info Sheet setup."
      : pricingInfoReady
        ? "Pricing / Info Sheet ready from enabled reusable info."
        : "Review setup: add reusable info and enable it before relying on readiness.";
  const availabilitySnapshot = dateConflictCount > 0
    ? `${plural(dateConflictCount, "inquiry date conflict")} surfaced from calendar checks.`
    : "No inquiry date conflicts surfaced; open Availability to review setup.";

  return (
    <div className="min-h-screen bg-bg text-ink" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="px-8 md:px-16 py-8 border-b border-hairline relative">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink/40 mb-1">Briarwood</p>
            <h1 className="text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
              {artist.businessName}
            </h1>
            <p className="text-sm text-ink/50">Private coordination command center</p>
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
                href="/inquiry-workspace"
                className="flex items-center gap-3 px-4 py-3 text-sm text-ink/80 hover:bg-ink/10 transition-colors border-b border-ink/10"
                onClick={() => setMenuOpen(false)}
                data-testid="nav-inquiry-workspace"
              >
                <Mail className="w-4 h-4" />
                Inquiry Workspace
              </Link>
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
                href={`/admin/${getActualSlug()}/network${authParam}`}
                className="flex items-center gap-3 px-4 py-3 text-sm text-ink/80 hover:bg-ink/10 transition-colors border-b border-ink/10"
                onClick={() => setMenuOpen(false)}
                data-testid="nav-network"
              >
                <Users className="w-4 h-4" />
                Private network
              </Link>
              <Link
                href={`/admin/${getActualSlug()}/rolodex${authParam}`}
                className="flex items-center gap-3 px-4 py-3 text-sm text-ink/80 hover:bg-ink/10 transition-colors border-b border-ink/10"
                onClick={() => setMenuOpen(false)}
                data-testid="nav-rolodex"
              >
                <Search className="w-4 h-4" />
                People / records
              </Link>
              <Link
                href={`/artist/schedules${authParam}`}
                className="flex items-center gap-3 px-4 py-3 text-sm text-ink/80 hover:bg-ink/10 transition-colors border-b border-ink/10"
                onClick={() => setMenuOpen(false)}
                data-testid="nav-schedule-drafts"
              >
                <Clock className="w-4 h-4" />
                Schedule drafts
              </Link>
              <Link 
                href={settingsHref}
                className="flex items-center gap-3 px-4 py-3 text-sm text-ink/80 hover:bg-ink/10 transition-colors border-b border-ink/10"
                onClick={() => setMenuOpen(false)}
                data-testid="nav-settings"
              >
                <Settings className="w-4 h-4" />
                Settings / Pricing Info
              </Link>
              <button
                type="button"
                className="flex items-center gap-3 px-4 py-3 text-sm text-ink/80 hover:bg-ink/10 transition-colors border-b border-ink/10 w-full text-left"
                onClick={() => setMenuOpen(false)}
                data-testid="nav-help"
              >
                <HelpCircle className="w-4 h-4" />
                Contact support
              </button>
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
        <section className="mb-10" data-testid="operator-command-center">
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-ink/40 mb-2">
              Operator Command Center
            </p>
            <h2 className="text-2xl mb-2" style={{ fontFamily: "'Fraunces', serif" }}>
              Needs attention
            </h2>
            <p className="text-sm text-ink/60 max-w-2xl">
              Briarwood is a private coordination system made of bounded service states.
              Review availability, pricing info, contact readiness, route options, operator
              review, and schedule readiness before deciding what can happen next.
            </p>
            <p className="text-xs text-ink/45 mt-2">
              External action stays operator-approved. Nothing here decides, sends, schedules,
              contracts, or collects payment end-to-end.
            </p>
          </div>

          <Link
            href="/inquiry-workspace"
            className="block border border-[#C4A35A]/50 bg-[#C4A35A]/10 p-5 mb-4 hover:border-[#C4A35A] transition-colors"
            data-testid="command-center-inquiry-workspace"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#C4A35A] mb-1">
                  Inquiry Workspace
                </p>
                <h3 className="text-lg" style={{ fontFamily: "'Fraunces', serif" }}>
                  Review live inquiries and decide what can happen next
                </h3>
                <p className="text-sm text-ink/60 mt-1">
                  Open the private work surface for response readiness, operator review,
                  route candidates, pricing info, and schedule handoff.
                </p>
              </div>
              <div className="text-sm text-[#C4A35A]">
                Open workspace
              </div>
            </div>
          </Link>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3" data-testid="command-center-groups">
            <Link
              href="/inquiry-workspace"
              className="border border-ink/10 bg-surface p-4 hover:border-ink/30 transition-colors"
              data-testid="command-center-needs-attention"
            >
              <p className="text-[10px] uppercase tracking-[0.18em] text-ink/40 mb-2">Needs attention</p>
              <p className="text-sm text-ink">Review queue</p>
              <p className="text-xs text-ink/50 mt-1">
                {needsAttentionSnapshot}
              </p>
            </Link>
            <Link
              href="/inquiry-workspace"
              className="border border-ink/10 bg-surface p-4 hover:border-ink/30 transition-colors"
              data-testid="command-center-inquiries"
            >
              <p className="text-[10px] uppercase tracking-[0.18em] text-ink/40 mb-2">Inquiries</p>
              <p className="text-sm text-ink">Response readiness</p>
              <p className="text-xs text-ink/50 mt-1">{inquiriesSnapshot}</p>
              <p className="text-xs text-ink/40 mt-1">Check availability, Pricing / Info Sheet, and operator review.</p>
            </Link>
            <Link
              href={`/artist/schedules${authParam}`}
              className="border border-ink/10 bg-surface p-4 hover:border-ink/30 transition-colors"
              data-testid="command-center-schedule-drafts"
            >
              <p className="text-[10px] uppercase tracking-[0.18em] text-ink/40 mb-2">Schedule drafts</p>
              <p className="text-sm text-ink">Private draft timelines</p>
              <p className="text-xs text-ink/50 mt-1">{scheduleDraftsSnapshot}</p>
              <p className="text-xs text-ink/40 mt-1">Continue schedule readiness and draft review without publishing.</p>
            </Link>
            <Link
              href={`/admin/${getActualSlug()}/network${authParam}`}
              className="border border-ink/10 bg-surface p-4 hover:border-ink/30 transition-colors"
              data-testid="command-center-private-network"
            >
              <p className="text-[10px] uppercase tracking-[0.18em] text-ink/40 mb-2">Private network</p>
              <p className="text-sm text-ink">Contact readiness</p>
              <p className="text-xs text-ink/50 mt-1">{privateNetworkSnapshot}</p>
              <p className="text-xs text-ink/40 mt-1">Review reachable route options and missing contact channels.</p>
            </Link>
            <Link
              href={`/admin/${getActualSlug()}/rolodex${authParam}`}
              className="border border-ink/10 bg-surface p-4 hover:border-ink/30 transition-colors"
              data-testid="command-center-people-records"
            >
              <p className="text-[10px] uppercase tracking-[0.18em] text-ink/40 mb-2">People / records</p>
              <p className="text-sm text-ink">Private records search</p>
              <p className="text-xs text-ink/50 mt-1">Open records when you need context.</p>
              <p className="text-xs text-ink/40 mt-1">Find existing people, dates, venues, and internal records.</p>
            </Link>
            <Link
              href={settingsHref}
              className="border border-ink/10 bg-surface p-4 hover:border-ink/30 transition-colors"
              data-testid="command-center-settings-pricing"
            >
              <p className="text-[10px] uppercase tracking-[0.18em] text-ink/40 mb-2">Settings / Pricing Info</p>
              <p className="text-sm text-ink">Reusable info setup</p>
              <p className="text-xs text-ink/50 mt-1">{settingsSnapshot}</p>
              <p className="text-xs text-ink/40 mt-1">Keep services, pricing details, policies, and reusable info ready.</p>
            </Link>
            <Link
              href={`/artist/availability${authParam}`}
              className="border border-ink/10 bg-surface p-4 hover:border-ink/30 transition-colors"
              data-testid="command-center-availability"
            >
              <p className="text-[10px] uppercase tracking-[0.18em] text-ink/40 mb-2">Availability</p>
              <p className="text-sm text-ink">Calendar-as-truth</p>
              <p className="text-xs text-ink/50 mt-1">{availabilitySnapshot}</p>
              <p className="text-xs text-ink/40 mt-1">Keep blocked dates and confirmed commitments current.</p>
            </Link>
          </div>
        </section>

        <div className="space-y-4" ref={inquiriesRef}>
          {inquiries.length > 0 && (
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm text-ink/60">Recent inquiry intake</h3>
              <Link
                href="/inquiry-workspace"
                className="text-xs text-[#C4A35A] hover:text-[#C4A35A]/80"
                data-testid="link-open-inquiry-workspace-from-intake"
              >
                Open Inquiry Workspace
              </Link>
            </div>
          )}
          {inquiries.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-ink/20 bg-surface">
              <p className="text-ink/50">No inquiries yet</p>
              <p className="text-sm text-ink/30 mt-2">New inquiry intake will appear here for private review.</p>
              <Link
                href="/inquiry-workspace"
                className="mt-4 px-4 py-2 bg-[#C4A35A] text-[#1A1A1A] rounded text-sm hover:bg-[#C4A35A]/90 inline-flex items-center gap-2"
                data-testid="link-empty-inquiry-workspace"
              >
                <Mail className="w-4 h-4" />
                Open Inquiry Workspace
              </Link>
            </div>
          ) : (
            (showAllClients ? inquiries : inquiries.slice(0, 3)).map((inquiry) => {
              const velocity = getVelocity(inquiry);
              return (
                <a
                  key={inquiry.id}
                  href="/inquiry-workspace"
                  className="block p-6 border bg-surface transition-all border-ink/10 hover:border-ink/30"
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

        <div className="mt-12 p-6 border border-dashed border-ink/20 text-center bg-surface">
          <p className="text-[10px] tracking-[0.2em] uppercase text-ink/40 mb-2">Inquiry intake link</p>
          <div className="flex items-center justify-center gap-3">
            <p className="text-sm text-ink/70 font-mono">briarwood.ai/{artist.artistSlug}</p>
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
          <p className="text-xs text-ink/40 mt-3">
            Use intentionally for inbound inquiries. Review live requests in Inquiry Workspace before outreach.
          </p>
        </div>
      </main>

      {/* Quick Guide for new users */}
      <QuickGuide
        guideId="artist-dashboard"
        title="Operator Command Center"
        steps={[
          {
            title: "Needs Attention",
            description: "Start with the private review queue before any outreach.",
            icon: <MessageSquare className="h-5 w-5" />,
          },
          {
            title: "Availability",
            description: "Keep blocked dates and confirmed commitments current for inquiry readiness.",
            icon: <CalendarDays className="h-5 w-5" />,
          },
          {
            title: "Inquiry Workspace",
            description: "Review response readiness, operator review, route options, and schedule handoff in one place.",
            icon: <Send className="h-5 w-5" />,
          },
          {
            title: "Private Network",
            description: "Maintain trusted route targets and contact readiness without making the network public.",
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
    </div>
  );
}
