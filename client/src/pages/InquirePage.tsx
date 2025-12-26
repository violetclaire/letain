import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";

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
  const [location] = useLocation();
  
  // Detect if embedded in iframe or has ?theme=dark parameter
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  
  useEffect(() => {
    // Check if in iframe
    const inIframe = window.self !== window.top;
    setIsEmbedded(inIframe);
    
    // Check URL params for theme override
    const urlParams = new URLSearchParams(window.location.search);
    const themeParam = urlParams.get('theme');
    
    // Use dark theme if embedded or explicitly requested
    setIsDarkTheme(inIframe || themeParam === 'dark');
  }, []);
  
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

  // Theme colors
  const theme = isDarkTheme ? {
    bg: "bg-[#1a1a1a]",
    text: "text-white",
    textMuted: "text-white/60",
    textFaint: "text-white/40",
    border: "border-white/20",
    borderFocus: "focus:border-white/50",
    placeholder: "placeholder:text-white/30",
    buttonBorder: "border-white",
    buttonHover: "hover:bg-white hover:text-[#1a1a1a]",
  } : {
    bg: "bg-[#F9F8F6]",
    text: "text-[#2D2D2D]",
    textMuted: "text-[#2D2D2D]/60",
    textFaint: "text-[#2D2D2D]/40",
    border: "border-[#2D2D2D]/20",
    borderFocus: "focus:border-[#2D2D2D]/50",
    placeholder: "placeholder:text-[#2D2D2D]/30",
    buttonBorder: "border-[#2D2D2D]",
    buttonHover: "hover:bg-[#2D2D2D] hover:text-[#F9F8F6]",
  };

  if (isLoading) {
    return (
      <div className={`${theme.bg} min-h-screen flex items-center justify-center`}>
        <Loader2 className={`h-6 w-6 animate-spin ${theme.textFaint}`} />
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className={`${theme.bg} min-h-screen flex items-center justify-center px-8`}>
        <div className="text-center">
          <h1 className={`text-2xl ${theme.text} mb-3`} style={{ fontFamily: "'Inter', sans-serif" }}>
            Artist not found
          </h1>
          <p className={`${theme.textMuted} text-sm`} style={{ fontFamily: "'Inter', sans-serif" }}>
            This inquiry link may no longer be active.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${theme.bg} ${theme.text} min-h-screen`} style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-6xl mx-auto px-6 md:px-12 py-12 md:py-20">
        
        {/* Back button for embedded */}
        {isEmbedded && (
          <button 
            onClick={() => window.history.back()} 
            className={`flex items-center gap-2 ${theme.textMuted} hover:${theme.text} mb-8 text-sm`}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
            BACK
          </button>
        )}

        {/* Two-column layout on desktop, stacked on mobile */}
        <div className="grid md:grid-cols-2 gap-12 md:gap-20">
          
          {/* Left column - Artist info */}
          <div className="md:pr-8">
            <h1 className={`text-xl md:text-2xl ${theme.text} mb-2`} style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>
              {artist.name || artist.businessName}
            </h1>
            <p className={`text-sm ${theme.textMuted} mb-8`}>
              hair | makeup
            </p>
            
            <p className={`text-sm ${theme.textMuted} leading-relaxed`}>
              Thank you for considering me for your day. Every event is a unique choreography. To ensure we can provide the highest standard of care and artistry for your date, please share the details of your vision below.
            </p>
          </div>
          
          {/* Right column - Form */}
          <div>
            {success ? (
              <div className="py-16">
                <h2 className={`text-2xl ${theme.text} mb-4`} style={{ fontFamily: "'Inter', sans-serif" }}>
                  Thank You
                </h2>
                <p className={`text-sm ${theme.textMuted}`}>
                  We will get back to you shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div>
                  <label className={`text-[10px] tracking-[0.3em] uppercase ${theme.textFaint} block mb-3`}>
                    Name
                  </label>
                  <input 
                    type="text" 
                    name="name" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full bg-transparent border-0 border-b ${theme.border} ${theme.text} ${theme.placeholder} ${theme.borderFocus} focus:outline-none focus:ring-0 px-0 py-3 text-base`}
                    placeholder="Your name"
                    data-testid="input-client-name"
                  />
                </div>

                <div>
                  <label className={`text-[10px] tracking-[0.3em] uppercase ${theme.textFaint} block mb-3`}>
                    Email
                  </label>
                  <input 
                    type="email" 
                    name="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full bg-transparent border-0 border-b ${theme.border} ${theme.text} ${theme.placeholder} ${theme.borderFocus} focus:outline-none focus:ring-0 px-0 py-3 text-base`}
                    placeholder="your@email.com"
                    data-testid="input-client-email"
                  />
                </div>

                <div>
                  <label className={`text-[10px] tracking-[0.3em] uppercase ${theme.textFaint} block mb-3`}>
                    Event Date
                  </label>
                  <input 
                    type="date" 
                    name="date" 
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className={`w-full bg-transparent border-0 border-b ${theme.border} ${theme.text} ${theme.placeholder} ${theme.borderFocus} focus:outline-none focus:ring-0 px-0 py-3 text-base`}
                    data-testid="input-event-date"
                  />
                </div>

                <div>
                  <label className={`text-[10px] tracking-[0.3em] uppercase ${theme.textFaint} block mb-3`}>
                    Tell Us About Your Event
                  </label>
                  <textarea 
                    name="message" 
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className={`w-full bg-transparent border-0 border-b ${theme.border} ${theme.text} ${theme.placeholder} ${theme.borderFocus} focus:outline-none focus:ring-0 px-0 py-3 text-base resize-none`}
                    placeholder="Share details about your special day..."
                    data-testid="input-message"
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={submitInquiry.isPending}
                    className={`w-full border ${theme.buttonBorder} ${theme.buttonHover} py-4 text-xs tracking-[0.3em] uppercase transition-all duration-300 disabled:opacity-50`}
                    data-testid="button-send-inquiry"
                  >
                    {submitInquiry.isPending ? (
                      <span className="flex items-center justify-center gap-3">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </span>
                    ) : (
                      "Submit"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
