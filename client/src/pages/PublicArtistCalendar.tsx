import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, Instagram, Globe, MessageCircle, Clock, Award, Send, ArrowLeft, X, User, Mail, CalendarDays, MessageSquare } from "lucide-react";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface ArtistPublicProfile {
  id: string;
  name: string;
  businessName: string;
  instagramHandle: string;
  tiktokHandle?: string;
  pinterestHandle?: string;
  websiteUrl?: string;
  responsiveBadge: boolean;
  avgResponseTimeMinutes?: number;
  bookedDates: string[];
  referralArtists?: Array<{
    name: string;
    instagramHandle?: string;
    slug?: string;
    isOnPlatform: boolean;
  }>;
}

interface InquiryForm {
  clientName: string;
  clientEmail: string;
  eventDate: Date | null;
  message: string;
}

export default function PublicArtistCalendar() {
  const [, params] = useRoute("/:artistSlug");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const artistSlug = params?.artistSlug || "";

  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 0, 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [form, setForm] = useState<InquiryForm>({
    clientName: "",
    clientEmail: "",
    eventDate: null,
    message: ""
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
    mutationFn: async (data: InquiryForm) => {
      const res = await fetch(`/api/public/inquiries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistSlug,
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          eventDate: data.eventDate?.toISOString(),
          message: data.message
        })
      });
      if (!res.ok) throw new Error("Failed to send inquiry");
      return res.json();
    },
    onSuccess: () => {
      setInquirySubmitted(true);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send your inquiry. Please try again.",
        variant: "destructive"
      });
    }
  });

  const bookedDates = artist?.bookedDates?.map(d => new Date(d)) || [];
  
  const isDateBooked = (date: Date) => {
    return bookedDates.some(bd => isSameDay(bd, date));
  };

  const days = (() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  })();

  const startDay = startOfMonth(currentMonth).getDay();
  const emptyDays = Array(startDay).fill(null);

  const handleDateClick = (date: Date) => {
    if (isDateBooked(date)) {
      setSelectedDate(date);
    } else {
      setSelectedDate(date);
      setForm(prev => ({ ...prev, eventDate: date }));
      setShowInquiryForm(true);
    }
  };

  const handleSubmitInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientName || !form.clientEmail || !form.eventDate) return;
    submitInquiry.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-powder-blue flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-pink/20 rounded-full mx-auto mb-4" />
          <p className="ink-soft">Loading calendar...</p>
        </div>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="min-h-screen bg-powder-blue flex items-center justify-center p-4">
        <div className="bg-cream rounded-2xl shadow-xl p-8 border-2 border-[#c5ccd8] text-center max-w-md">
          <Calendar className="w-16 h-16 text-pink/40 mx-auto mb-4" />
          <h2 className="font-header text-2xl ink-main mb-2">Artist Not Found</h2>
          <p className="ink-soft mb-6">This calendar doesn't exist or has been removed.</p>
          <button
            onClick={() => setLocation("/")}
            className="px-6 py-3 bg-pink text-white rounded-xl hover:bg-pink/90 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (inquirySubmitted) {
    return (
      <div className="min-h-screen bg-powder-blue flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-cream rounded-2xl shadow-xl p-8 border-2 border-[#c5ccd8] text-center max-w-md"
        >
          <div className="w-16 h-16 bg-pink/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-pink" />
          </div>
          <h2 className="font-header text-2xl ink-main mb-2">Message Sent!</h2>
          <p className="ink-soft mb-6">
            We notified <span className="font-medium">{artist.name}</span>! They'll respond soon.
          </p>
          <button
            onClick={() => {
              setInquirySubmitted(false);
              setShowInquiryForm(false);
              setForm({ clientName: "", clientEmail: "", eventDate: null, message: "" });
            }}
            className="px-6 py-3 bg-pink text-white rounded-xl hover:bg-pink/90 transition-colors"
          >
            Back to Calendar
          </button>
        </motion.div>
      </div>
    );
  }

  if (showInquiryForm) {
    return (
      <div className="min-h-screen bg-powder-blue flex flex-col">
        <header className="px-6 py-4 bg-cream border-b border-[#c5ccd8] flex items-center gap-4">
          <button
            onClick={() => setShowInquiryForm(false)}
            className="p-2 rounded-full hover:bg-powder-blue/50 transition-colors"
          >
            <ArrowLeft size={20} className="ink-main" />
          </button>
          <h1 className="font-script text-2xl ink-main">Beauvette</h1>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-cream rounded-2xl shadow-xl p-8 border-2 border-[#c5ccd8]"
          >
            <div className="text-center mb-6">
              <h2 className="font-header text-xl ink-main mb-1">Chat with {artist.name}</h2>
              <p className="text-sm ink-soft">Send an inquiry about your event</p>
            </div>

            <form onSubmit={handleSubmitInquiry} className="space-y-4">
              <div>
                <label className="block text-sm font-medium ink-main mb-1">Your Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gold" size={18} />
                  <input
                    type="text"
                    value={form.clientName}
                    onChange={(e) => setForm(prev => ({ ...prev, clientName: e.target.value }))}
                    placeholder="Your name"
                    className="w-full pl-10 pr-4 py-3 border-2 border-[#c5ccd8] rounded-xl focus:outline-none focus:border-pink bg-white ink-main"
                    required
                    data-testid="input-client-name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium ink-main mb-1">Your Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gold" size={18} />
                  <input
                    type="email"
                    value={form.clientEmail}
                    onChange={(e) => setForm(prev => ({ ...prev, clientEmail: e.target.value }))}
                    placeholder="your@email.com"
                    className="w-full pl-10 pr-4 py-3 border-2 border-[#c5ccd8] rounded-xl focus:outline-none focus:border-pink bg-white ink-main"
                    required
                    data-testid="input-client-email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium ink-main mb-1">Event Date</label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-gold" size={18} />
                  <input
                    type="date"
                    value={form.eventDate ? format(form.eventDate, "yyyy-MM-dd") : ""}
                    onChange={(e) => setForm(prev => ({ ...prev, eventDate: e.target.value ? new Date(e.target.value + "T12:00:00") : null }))}
                    className="w-full pl-10 pr-4 py-3 border-2 border-[#c5ccd8] rounded-xl focus:outline-none focus:border-pink bg-white ink-main"
                    required
                    data-testid="input-event-date"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium ink-main mb-1">Message</label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 text-gold" size={18} />
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Tell them about your event..."
                    rows={4}
                    className="w-full pl-10 pr-4 py-3 border-2 border-[#c5ccd8] rounded-xl focus:outline-none focus:border-pink bg-white ink-main resize-none"
                    data-testid="input-message"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitInquiry.isPending}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-pink text-white rounded-xl hover:bg-pink/90 transition-colors disabled:opacity-50"
                data-testid="button-send-inquiry"
              >
                {submitInquiry.isPending ? "Sending..." : "Send Inquiry"}
                <Send size={18} />
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  const bookedDateSelected = selectedDate && isDateBooked(selectedDate);

  return (
    <div className="min-h-screen bg-powder-blue flex flex-col">
      <header className="px-6 py-4 bg-cream border-b border-[#c5ccd8]">
        <h1 className="font-script text-2xl ink-main text-center">Beauvette</h1>
      </header>

      <div className="flex-1 p-4 max-w-md mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-cream rounded-2xl shadow-xl border-2 border-[#c5ccd8] overflow-hidden"
        >
          <div className="p-6 border-b border-[#c5ccd8]">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-pink/20 rounded-full flex items-center justify-center shrink-0">
                <span className="text-2xl font-header text-pink">{artist.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-header text-xl ink-main truncate">{artist.name}</h2>
                <p className="text-sm ink-soft truncate">{artist.businessName}</p>
                
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {artist.instagramHandle && (
                    <a
                      href={`https://instagram.com/${artist.instagramHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-pink hover:underline"
                    >
                      <Instagram size={14} />
                      @{artist.instagramHandle}
                    </a>
                  )}
                  {artist.websiteUrl && (
                    <a
                      href={artist.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-gold hover:underline"
                    >
                      <Globe size={14} />
                      Website
                    </a>
                  )}
                </div>

                {artist.responsiveBadge && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-gold">
                    <Award size={14} />
                    <span>Typically replies in under 10 minutes</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 rounded-full hover:bg-powder-blue/50 transition-colors"
              >
                <ArrowLeft size={20} className="text-forest" />
              </button>
              <div className="text-center">
                <span className="text-lg font-header ink-main">
                  {format(currentMonth, "MMMM yyyy")}
                </span>
              </div>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 rounded-full hover:bg-powder-blue/50 transition-colors rotate-180"
              >
                <ArrowLeft size={20} className="text-forest" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                <div key={`${day}-${i}`} className="text-center text-xs font-medium py-2 text-gold">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {emptyDays.map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {days.map(day => {
                const booked = isDateBooked(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDateClick(day)}
                    className={`
                      aspect-square flex items-center justify-center text-sm rounded-lg
                      transition-all duration-200 min-h-[40px]
                      ${booked 
                        ? "bg-pink/20 text-pink cursor-pointer" 
                        : "ink-main hover:bg-powder-blue/50 cursor-pointer"
                      }
                      ${isSelected ? "ring-2 ring-pink" : ""}
                    `}
                    data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 mt-4 text-xs ink-soft justify-center">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-pink/20" />
                <span>Booked</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-powder-blue/50" />
                <span>Available</span>
              </div>
            </div>
          </div>

          {bookedDateSelected && artist.referralArtists && artist.referralArtists.length > 0 && (
            <div className="p-4 border-t border-[#c5ccd8] bg-powder-blue/20">
              <p className="text-sm ink-main mb-3">
                {artist.name} is booked on {format(selectedDate!, "MMMM d")}. 
                Here are artists in their network:
              </p>
              <div className="space-y-2">
                {artist.referralArtists.map((ref, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-cream rounded-lg">
                    <div>
                      <p className="text-sm font-medium ink-main">{ref.name}</p>
                      {ref.instagramHandle && (
                        <p className="text-xs text-pink">@{ref.instagramHandle}</p>
                      )}
                    </div>
                    {ref.isOnPlatform && ref.slug ? (
                      <button
                        onClick={() => setLocation(`/${ref.slug}`)}
                        className="px-3 py-1 text-xs bg-pink text-white rounded-full"
                      >
                        View Calendar
                      </button>
                    ) : (
                      <span className="text-xs ink-soft">Not on Beauvette yet</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 border-t border-[#c5ccd8]">
            <button
              onClick={() => setShowInquiryForm(true)}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-pink text-white rounded-xl hover:bg-pink/90 transition-colors"
              data-testid="button-chat-with-artist"
            >
              <MessageCircle size={18} />
              Chat with {artist.name}
            </button>
          </div>
        </motion.div>
      </div>

      <footer className="px-6 py-4 bg-cream border-t border-[#c5ccd8] text-center">
        <p className="text-xs ink-soft mb-2">
          © 2025 Beauvette. For life's most important days.
        </p>
        <a href="/login" className="text-xs text-gold hover:underline">
          Already using Beauvette? Sign in
        </a>
      </footer>
    </div>
  );
}
