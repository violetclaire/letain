import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ArtistPublicProfile {
  id: string;
  name: string;
  businessName: string;
  instagramHandle?: string;
}

export default function InquirePage() {
  const [, params] = useRoute("/:artistSlug");
  const artistSlug = params?.artistSlug || "";
  const { toast } = useToast();
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    date: "",
    location: "",
    message: "",
  });

  const { data: artist, isLoading, error } = useQuery<ArtistPublicProfile>({
    queryKey: ["/api/public/artists", artistSlug],
    queryFn: async () => {
      const res = await fetch(`/api/public/artists/${artistSlug}`);
      if (!res.ok) throw new Error("Artist not found");
      return res.json();
    },
    enabled: !!artistSlug
  });

  const submitInquiry = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/public/inquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistSlug,
          clientName: formData.name,
          clientEmail: formData.email,
          eventDate: formData.date,
          location: formData.location,
          message: formData.message,
        })
      });
      if (!res.ok) throw new Error("Failed to send inquiry");
      return res.json();
    },
    onSuccess: () => {
      setSuccess(true);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send your inquiry. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitInquiry.mutate();
  };

  if (isLoading) {
    return (
      <div className="bg-[#F9F8F6] min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#2D2D2D]/30" />
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="bg-[#F9F8F6] min-h-screen flex items-center justify-center px-8">
        <div className="text-center">
          <h1 className="text-2xl text-[#2D2D2D] mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            Artist not found
          </h1>
          <p className="text-[#2D2D2D]/50 text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
            This inquiry link may no longer be active.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F9F8F6] text-[#2D2D2D] min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-2xl mx-auto px-8 md:px-16 py-20 md:py-32">
        
        <header className="text-center mb-20">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#2D2D2D]/40 mb-6">
            {artist.businessName || artist.name}
          </p>
          <h1 className="text-3xl md:text-4xl text-[#2D2D2D] mb-8" style={{ fontFamily: "'Playfair Display', serif" }}>
            Inquire for Services
          </h1>
          <p className="text-sm text-[#2D2D2D]/60 leading-relaxed max-w-md mx-auto">
            We look forward to hearing about your details. Please enter them below and we will get back to you shortly.
          </p>
        </header>

        {success ? (
          <div className="text-center py-16">
            <h2 className="text-2xl text-[#2D2D2D] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Thank You
            </h2>
            <p className="text-sm text-[#2D2D2D]/60">
              We will get back to you shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-12">
            <div>
              <label className="text-[10px] tracking-[0.3em] uppercase text-[#2D2D2D]/50 block mb-4">
                Name
              </label>
              <input 
                type="text" 
                name="name" 
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-transparent border-0 border-b border-[#2D2D2D]/20 text-[#2D2D2D] placeholder:text-[#2D2D2D]/30 focus:border-[#2D2D2D]/50 focus:outline-none focus:ring-0 px-0 py-4 text-base"
                placeholder="Your name"
                data-testid="input-client-name"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
            </div>

            <div>
              <label className="text-[10px] tracking-[0.3em] uppercase text-[#2D2D2D]/50 block mb-4">
                Email
              </label>
              <input 
                type="email" 
                name="email" 
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-transparent border-0 border-b border-[#2D2D2D]/20 text-[#2D2D2D] placeholder:text-[#2D2D2D]/30 focus:border-[#2D2D2D]/50 focus:outline-none focus:ring-0 px-0 py-4 text-base"
                placeholder="your@email.com"
                data-testid="input-client-email"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
            </div>

            <div>
              <label className="text-[10px] tracking-[0.3em] uppercase text-[#2D2D2D]/50 block mb-4">
                Event Day
              </label>
              <input 
                type="date" 
                name="date" 
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-transparent border-0 border-b border-[#2D2D2D]/20 text-[#2D2D2D] placeholder:text-[#2D2D2D]/30 focus:border-[#2D2D2D]/50 focus:outline-none focus:ring-0 px-0 py-4 text-base"
                data-testid="input-event-date"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
            </div>

            <div>
              <label className="text-[10px] tracking-[0.3em] uppercase text-[#2D2D2D]/50 block mb-4">
                Location
              </label>
              <input 
                type="text" 
                name="location" 
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-transparent border-0 border-b border-[#2D2D2D]/20 text-[#2D2D2D] placeholder:text-[#2D2D2D]/30 focus:border-[#2D2D2D]/50 focus:outline-none focus:ring-0 px-0 py-4 text-base"
                placeholder="Event location"
                data-testid="input-location"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
            </div>

            <div>
              <label className="text-[10px] tracking-[0.3em] uppercase text-[#2D2D2D]/50 block mb-4">
                Message
              </label>
              <textarea 
                name="message" 
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full bg-transparent border-0 border-b border-[#2D2D2D]/20 text-[#2D2D2D] placeholder:text-[#2D2D2D]/30 focus:border-[#2D2D2D]/50 focus:outline-none focus:ring-0 px-0 py-4 text-base resize-none"
                placeholder="Tell us about your event..."
                data-testid="input-message"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
            </div>

            <div className="pt-8">
              <button 
                type="submit"
                disabled={submitInquiry.isPending}
                className="w-full border border-[#2D2D2D] hover:bg-[#2D2D2D] hover:text-[#F9F8F6] py-5 text-xs tracking-[0.3em] uppercase transition-all duration-500 disabled:opacity-50"
                data-testid="button-send-inquiry"
              >
                {submitInquiry.isPending ? (
                  <span className="flex items-center justify-center gap-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  "Send Vision"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
