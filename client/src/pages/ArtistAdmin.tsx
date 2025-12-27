import { useQuery } from "@tanstack/react-query";
import { useRoute, useSearch } from "wouter";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

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
  
  // Extract token from query string
  const urlParams = new URLSearchParams(searchString);
  const token = urlParams.get('token');

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
      <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center px-8">
        <div className="text-center max-w-md">
          <h2 className="text-xl mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Access Required
          </h2>
          <p className="text-sm text-[#2D2D2D]/50" style={{ fontFamily: "'Inter', sans-serif" }}>
            This dashboard requires a secure link. Check your email for the admin link, or use the "Resend settings link" option on the settings page.
          </p>
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
        <h1 className="text-2xl mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          {artist.businessName}
        </h1>
        <p className="text-sm text-[#2D2D2D]/50">Your inquiries dashboard</p>
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
          <p className="text-sm text-[#2D2D2D]/70 font-mono">dateinquiry.com/{artist.artistSlug}</p>
        </div>
      </main>
    </div>
  );
}
