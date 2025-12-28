import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useSearch, Link, useLocation } from "wouter";
import { format } from "date-fns";
import { Loader2, Settings, Calendar, Users, Copy, Check, Mail, CheckCircle, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

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

  const handleCopyInquiryLink = () => {
    navigator.clipboard.writeText(`https://dateinquiry.com/${slug}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };
  
  const handleCopyLink = () => {
    const link = `https://dateinquiry.com/${slug}`;
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
                    dateinquiry.com/{slug}
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
              href={`/${slug}/calendar${authParam}`}
              className="flex items-center gap-2 text-[#F5F0E8]/60 hover:text-[#F5F0E8] transition-colors"
              data-testid="nav-calendar"
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Calendar</span>
            </Link>
            <Link 
              href={`/${slug}/circle${authParam}`}
              className="flex items-center gap-2 text-[#F5F0E8]/60 hover:text-[#F5F0E8] transition-colors"
              data-testid="nav-circle"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Circle</span>
            </Link>
            <Link 
              href={`/${slug}/settings${authParam}`}
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
        <div className="grid grid-cols-3 gap-4 mb-12">
          <div className="p-6 border border-[#F5F0E8]/10 text-center bg-[#222]">
            <p className="text-3xl font-light" style={{ fontFamily: "'Fraunces', serif" }}>{pendingCount}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#F5F0E8]/50 mt-2">Pending</p>
          </div>
          <div className="p-6 border border-[#F5F0E8]/10 text-center bg-[#222]">
            <p className="text-3xl font-light" style={{ fontFamily: "'Fraunces', serif" }}>{acceptedCount}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#F5F0E8]/50 mt-2">Accepted</p>
          </div>
          <div className="p-6 border border-[#F5F0E8]/10 text-center bg-[#222]">
            <p className="text-3xl font-light text-green-400" style={{ fontFamily: "'Fraunces', serif" }}>{depositCount}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#F5F0E8]/50 mt-2">Booked</p>
          </div>
        </div>

        <div className="space-y-4">
          {inquiries.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[#F5F0E8]/20 bg-[#222]">
              <p className="text-[#F5F0E8]/50">No inquiries yet</p>
              <p className="text-sm text-[#F5F0E8]/30 mt-2">Share your form link to start receiving inquiries</p>
            </div>
          ) : (
            inquiries.map((inquiry) => {
              const velocity = getVelocity(inquiry);
              return (
                <a
                  key={inquiry.id}
                  href={`/inquiry/${inquiry.threadToken}`}
                  className="block p-6 border border-[#F5F0E8]/10 hover:border-[#F5F0E8]/30 bg-[#222] transition-all"
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
