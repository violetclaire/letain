import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Loader2, MousePointer, Ban, CalendarCheck } from "lucide-react";
import AvailabilityCalendar from "../components/AvailabilityCalendar";
import QuickGuide from "@/components/QuickGuide";

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
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-black" />
      </div>
    );
  }

  // Use token-based artist data or session-based user
  const effectiveUser = token && artistData ? artistData : user;

  if (!effectiveUser || (user && user.role !== 'artist')) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-black/60">Please log in as an artist to view this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream text-black" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="px-8 md:px-16 py-8 border-b border-[#E8E2D9]">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-black/60 hover:text-black transition-colors mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>
          Availability readiness
        </h1>
        <p className="text-sm text-black/50 mt-1">
          Mark unavailable dates and confirmed commitments so inquiry readiness checks can flag conflicts before you respond.
        </p>
      </header>

      <main className="max-w-2xl mx-auto px-8 md:px-16 py-12">
        <div className="bg-[#F5F2ED] border border-[#E8E2D9] rounded-lg p-6">
          <AvailabilityCalendar userId={effectiveUser.id} authToken={token || undefined} />
        </div>
        
        <div className="mt-8 text-sm text-black/50 space-y-2">
          <p className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#C4A35A]"></span>
            Confirmed commitment - work already occupies the date
          </p>
          <p className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#C4A35A]/40 border border-[#C4A35A]/60"></span>
            Held inquiry - inquiry on hold
          </p>
          <p className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#8B2942]"></span>
            Unavailable - blocked for new inquiries
          </p>
        </div>
      </main>

      <QuickGuide
        guideId="artist-calendar"
        title="Availability readiness"
        steps={[
          {
            title: "Mark Unavailable Dates",
            description: "Tap any open date to mark it unavailable for new inquiries.",
            icon: <MousePointer className="h-5 w-5" />,
          },
          {
            title: "Track Confirmed Commitments",
            description: "Use confirmed commitments for dates already occupied by contracted work or another obligation.",
            icon: <Ban className="h-5 w-5" />,
          },
          {
            title: "Feed Inquiry Readiness",
            description: "These records help Inquiry Workspace show whether a requested date is clear before you draft a response.",
            icon: <CalendarCheck className="h-5 w-5" />,
          },
        ]}
      />
    </div>
  );
}
