import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Loader2 } from "lucide-react";
import AvailabilityCalendar from "../components/AvailabilityCalendar";

export default function ArtistAvailability() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const token = urlParams.get('token');

  // Fetch artist data using token if not using session auth
  const { data: artistData, isLoading: artistLoading } = useQuery({
    queryKey: ["/api/artist/availability-auth", token],
    queryFn: async () => {
      if (token) {
        const res = await fetch(`/api/artist/availability-auth?token=${token}`);
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      }
      return null;
    },
    enabled: !!token,
  });

  const isLoading = authLoading || (token && artistLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#F5F0E8]" />
      </div>
    );
  }

  // Use token-based artist data or session-based user
  const effectiveUser = token && artistData ? artistData : user;

  if (!effectiveUser || (user && user.role !== 'artist')) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center">
        <p className="text-[#F5F0E8]/60">Please log in as an artist to view this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-[#F5F0E8]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="px-8 md:px-16 py-8 border-b border-[#F5F0E8]/10">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-[#F5F0E8]/60 hover:text-[#F5F0E8] transition-colors mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>
          Your Availability
        </h1>
        <p className="text-sm text-[#F5F0E8]/50 mt-1">
          Click dates to toggle between available, pending, and booked
        </p>
      </header>

      <main className="max-w-2xl mx-auto px-8 md:px-16 py-12">
        <div className="bg-[#222] border border-[#F5F0E8]/10 rounded-lg p-6">
          <AvailabilityCalendar userId={effectiveUser.id} authToken={token || undefined} />
        </div>
        
        <div className="mt-8 text-sm text-[#F5F0E8]/50 space-y-2">
          <p className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#2D5A3D]"></span>
            Booked - You have a confirmed booking
          </p>
          <p className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#8B6914]"></span>
            Pending - Inquiry on hold
          </p>
          <p className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#4A3728]"></span>
            Blocked - Marked as unavailable
          </p>
        </div>
      </main>
    </div>
  );
}
