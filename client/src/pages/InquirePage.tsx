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
  const [, params] = useRoute("/inquire/:artistSlug");
  const artistSlug = params?.artistSlug || "";
  const { toast } = useToast();
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    date: "",
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
      <div className="bg-black text-white min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="bg-black text-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Artist not found</h1>
          <p className="text-gray-500">This inquiry link may no longer be active.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black text-white min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-16">
          <div>
            <h1 className="text-white/90 text-sm tracking-[0.15em] lowercase mb-2">
              {artist.businessName || artist.name}
            </h1>
            <p className="text-white/60 text-xs tracking-[0.15em] lowercase mb-10">
              {artist.instagramHandle ? `@${artist.instagramHandle}` : 'hair | makeup'}
            </p>
            
            <p className="text-white/70 text-sm leading-relaxed">
              Thank you so much for considering me for your day. Every event is a unique choreography. 
              To ensure we can provide the highest standard of care and artistry for your date, 
              please share the details of your vision below.
            </p>
          </div>

          <div>
            {success ? (
              <div className="py-8">
                <p className="text-white/90 text-lg mb-2">
                  {artist.businessName || artist.name} has received your vision.
                </p>
                <p className="text-white/60 text-sm">
                  We'll be in touch soon to discuss your special day.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-white/60 text-xs tracking-[0.2em] uppercase block mb-2">
                    Name
                  </label>
                  <input 
                    type="text" 
                    name="name" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none px-4 py-3 text-sm rounded-none"
                    placeholder="Your name"
                    data-testid="input-client-name"
                  />
                </div>

                <div>
                  <label className="text-white/60 text-xs tracking-[0.2em] uppercase block mb-2">
                    Email
                  </label>
                  <input 
                    type="email" 
                    name="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none px-4 py-3 text-sm rounded-none"
                    placeholder="your@email.com"
                    data-testid="input-client-email"
                  />
                </div>

                <div>
                  <label className="text-white/60 text-xs tracking-[0.2em] uppercase block mb-2">
                    Event Date
                  </label>
                  <input 
                    type="date" 
                    name="date" 
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none px-4 py-3 text-sm rounded-none"
                    data-testid="input-event-date"
                  />
                </div>

                <div>
                  <label className="text-white/60 text-xs tracking-[0.2em] uppercase block mb-2">
                    Tell us about your event
                  </label>
                  <textarea 
                    name="message" 
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none px-4 py-3 text-sm resize-none rounded-none"
                    placeholder="Share details about your special day..."
                    data-testid="input-message"
                  />
                </div>

                <button 
                  type="submit"
                  disabled={submitInquiry.isPending}
                  className="w-full border border-white/20 hover:border-white/40 bg-white/10 hover:bg-white/20 backdrop-blur-md py-4 text-sm tracking-[0.2em] uppercase transition-all duration-300 disabled:opacity-50"
                  data-testid="button-send-inquiry"
                >
                  {submitInquiry.isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    "Send Inquiry"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
