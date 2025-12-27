import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useSearch, Link } from "wouter";
import { format } from "date-fns";
import { Loader2, Settings, Calendar, Users, Copy, Check, Mail, CheckCircle } from "lucide-react";
import { useState } from "react";

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
  const searchString = useSearch();
  const slug = params?.slug;
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  
  // Extract token from query string
  const urlParams = new URLSearchParams(searchString);
  const token = urlParams.get('token');

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

  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/public/artist-admin/${slug}`, token],
    queryFn: async () => {
      const res = await fetch(`/api/public/artist-admin/${slug}?token=${token}`);
      if (!res.ok) {
        if (res.status === 401) throw new Error("Access denied");
        throw new Error("Artist not found");
      }
      return res.json();
    },
    enabled: !!slug && !!token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#2D2D2D]/30" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#3d1a22] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-[#f5f3ef] p-8 shadow-2xl">
          {emailSent ? (
            <div className="text-center">
              <CheckCircle className="w-14 h-14 text-green-600 mx-auto mb-5" />
              <h2 className="text-xl font-serif text-[#3d1a22] mb-2">Check Your Email</h2>
              <p className="text-sm text-[#3d1a22]/60 mb-4">
                Your dashboard link is on its way. Check your inbox (and spam folder).
              </p>
              <button
                onClick={() => { setEmailSent(false); setEmail(""); }}
                className="text-sm text-[#3d1a22] underline"
              >
                Try different email
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <Mail className="w-10 h-10 text-[#3d1a22]/60 mx-auto mb-3" />
                <h2 className="text-xl font-serif text-[#3d1a22] mb-1">Artist Login</h2>
                <p className="text-xs text-[#3d1a22]/50">Enter your email to access your dashboard</p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); if (email.trim()) requestLink.mutate(); }} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full border border-[#3d1a22]/20 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#3d1a22]/40"
                  data-testid="input-admin-email"
                />
                <button
                  type="submit"
                  disabled={requestLink.isPending || !email.trim()}
                  className="w-full bg-[#3d1a22] text-[#f5f3ef] py-3 text-sm uppercase tracking-wide hover:bg-[#2d1018] disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="button-send-dashboard-link"
                >
                  {requestLink.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send My Dashboard Link"
                  )}
                </button>
              </form>

              {/* Inquiry Link Section */}
              <div className="mt-6 pt-5 border-t border-[#3d1a22]/10">
                <p className="text-[10px] uppercase tracking-wide text-[#3d1a22]/50 mb-2">Your Inquiry Link</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-[#3d1a22]/5 px-3 py-2 text-xs text-[#3d1a22]/70 rounded truncate">
                    dateinquiry.com/{slug}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyInquiryLink}
                    className="px-3 py-2 bg-[#3d1a22] text-[#f5f3ef] text-xs rounded flex items-center gap-1"
                    data-testid="button-copy-inquiry-link"
                  >
                    {linkCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <p className="text-[10px] text-[#3d1a22]/40 mt-2">Share this link on social media</p>
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
      <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center px-8">
        <div className="text-center">
          <p className="text-sm text-[#2D2D2D]/50 mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
            {message}
          </p>
        </div>
      </div>
    );
  }

  const { artist, inquiries }: { artist: ArtistProfile; inquiries: Inquiry[] } = data;

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "accepted": return "bg-green-100 text-green-800";
      case "auto_responded": return "bg-blue-100 text-blue-800";
      case "deposit_paid": return "bg-green-200 text-green-900";
      case "referred": return "bg-purple-100 text-purple-800";
      case "declined": return "bg-gray-100 text-gray-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const getVelocity = (inquiry: Inquiry) => {
    if (!inquiry.createdAt) return { text: "—", color: "text-[#2D2D2D]/40" };
    if (inquiry.depositPaidAt) {
      const start = new Date(inquiry.createdAt);
      const end = new Date(inquiry.depositPaidAt);
      const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60) * 10) / 10;
      return {
        text: `${hours}h`,
        color: hours < 48 ? "text-green-600 font-bold" : "text-[#2D2D2D]/60"
      };
    }
    const start = new Date(inquiry.createdAt);
    const now = new Date();
    const hours = Math.round((now.getTime() - start.getTime()) / (1000 * 60 * 60));
    return { text: `${hours}h active`, color: "text-[#2D2D2D]/40" };
  };

  const pendingCount = inquiries.filter(i => i.status.toLowerCase() === 'pending').length;
  const acceptedCount = inquiries.filter(i => ['accepted', 'auto_responded'].includes(i.status.toLowerCase())).length;
  const depositCount = inquiries.filter(i => i.status.toLowerCase() === 'deposit_paid').length;

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#2D2D2D]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="px-8 md:px-16 py-8 border-b border-[#2D2D2D]/10">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              {artist.businessName}
            </h1>
            <p className="text-sm text-[#2D2D2D]/50">Your inquiries dashboard</p>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <Link 
              href={`/${slug}/calendar?token=${token}`}
              className="flex items-center gap-2 text-[#2D2D2D]/60 hover:text-[#2D2D2D] transition-colors"
              data-testid="nav-calendar"
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Calendar</span>
            </Link>
            <Link 
              href={`/${slug}/circle?token=${token}`}
              className="flex items-center gap-2 text-[#2D2D2D]/60 hover:text-[#2D2D2D] transition-colors"
              data-testid="nav-circle"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Circle</span>
            </Link>
            <Link 
              href={`/${slug}/settings?token=${token}`}
              className="flex items-center gap-2 text-[#2D2D2D]/60 hover:text-[#2D2D2D] transition-colors"
              data-testid="nav-settings"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8 md:px-16 py-12">
        <div className="grid grid-cols-3 gap-4 mb-12">
          <div className="p-6 border border-[#2D2D2D]/10 text-center">
            <p className="text-3xl font-light" style={{ fontFamily: "'Playfair Display', serif" }}>{pendingCount}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#2D2D2D]/50 mt-2">Pending</p>
          </div>
          <div className="p-6 border border-[#2D2D2D]/10 text-center">
            <p className="text-3xl font-light" style={{ fontFamily: "'Playfair Display', serif" }}>{acceptedCount}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#2D2D2D]/50 mt-2">Accepted</p>
          </div>
          <div className="p-6 border border-[#2D2D2D]/10 text-center">
            <p className="text-3xl font-light text-green-600" style={{ fontFamily: "'Playfair Display', serif" }}>{depositCount}</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#2D2D2D]/50 mt-2">Booked</p>
          </div>
        </div>

        <div className="space-y-4">
          {inquiries.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[#2D2D2D]/20">
              <p className="text-[#2D2D2D]/50">No inquiries yet</p>
              <p className="text-sm text-[#2D2D2D]/30 mt-2">Share your form link to start receiving inquiries</p>
            </div>
          ) : (
            inquiries.map((inquiry) => {
              const velocity = getVelocity(inquiry);
              return (
                <a
                  key={inquiry.id}
                  href={`/inquiry/${inquiry.threadToken}`}
                  className="block p-6 border border-[#2D2D2D]/10 hover:border-[#2D2D2D]/30 transition-all"
                  data-testid={`inquiry-row-${inquiry.id}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>
                        {inquiry.clientName}
                      </h3>
                      <p className="text-sm text-[#2D2D2D]/50 mt-1">{inquiry.clientEmail}</p>
                      {inquiry.eventLocation && (
                        <p className="text-xs text-[#2D2D2D]/40 mt-1">{inquiry.eventLocation}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>
                        {format(new Date(inquiry.eventDate), "MMM d, yyyy")}
                      </p>
                      <span className={`inline-block mt-2 px-2 py-1 text-[10px] tracking-[0.1em] uppercase ${getStatusStyle(inquiry.status)}`}>
                        {inquiry.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#2D2D2D]/5">
                    <p className="text-xs text-[#2D2D2D]/40">
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

        <div className="mt-12 p-6 border border-dashed border-[#2D2D2D]/20 text-center">
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#2D2D2D]/40 mb-2">Your Form Link</p>
          <div className="flex items-center justify-center gap-3">
            <p className="text-sm text-[#2D2D2D]/70 font-mono">dateinquiry.com/{artist.artistSlug}</p>
            <button
              onClick={handleCopyLink}
              className="p-2 rounded hover:bg-[#2D2D2D]/5 transition-colors"
              data-testid="button-copy-link"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-[#2D2D2D]/40" />
              )}
            </button>
          </div>
          {copied && (
            <p className="text-xs text-green-600 mt-2">Link copied!</p>
          )}
        </div>
      </main>
    </div>
  );
}
