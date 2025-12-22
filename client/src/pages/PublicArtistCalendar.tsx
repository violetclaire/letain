import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, Instagram, Globe, MessageCircle, Clock, Award, Send, ArrowLeft, User, Mail, CalendarDays, MessageSquare } from "lucide-react";
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

  // Parse date strings as local dates to avoid timezone issues
  // Dates come as YYYY-MM-DD strings, parse them at noon to prevent timezone shift
  const bookedDates = artist?.bookedDates?.map(d => {
    const [year, month, day] = d.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }) || [];
  
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
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border border-[#2C2C2C] mx-auto mb-4" />
          <p className="text-[#666]">Loading calendar...</p>
        </div>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center p-4">
        <div className="bg-[#FFFEF9] p-1 border border-[#2C2C2C] max-w-md">
          <div className="border border-[#2C2C2C] p-8 text-center">
            <Calendar className="w-16 h-16 text-[#ccc] mx-auto mb-4" />
            <h2 className="font-header text-2xl text-[#2C2C2C] mb-2">Artist Not Found</h2>
            <p className="text-[#666] mb-6">This calendar doesn't exist or has been removed.</p>
            <button
              onClick={() => setLocation("/")}
              className="px-6 py-3 bg-[#FAF9F7] text-[#2C2C2C] border border-[#2C2C2C] hover:bg-[#f0efe9] transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (inquirySubmitted) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#FFFEF9] p-1 border border-[#2C2C2C] max-w-md"
        >
          <div className="border border-[#2C2C2C] p-8 text-center">
            <div className="w-16 h-16 border border-[#2C2C2C] flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-[#2C2C2C]" />
            </div>
            <h2 className="font-header text-2xl text-[#2C2C2C] mb-2">Message Sent</h2>
            <p className="text-[#666] mb-6">
              We notified <span className="font-medium text-[#2C2C2C]">{artist.name}</span>. They'll respond soon.
            </p>
            <button
              onClick={() => {
                setInquirySubmitted(false);
                setShowInquiryForm(false);
                setForm({ clientName: "", clientEmail: "", eventDate: null, message: "" });
              }}
              className="px-6 py-3 bg-[#FAF9F7] text-[#2C2C2C] border border-[#2C2C2C] hover:bg-[#f0efe9] transition-colors"
            >
              Back to Calendar
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (showInquiryForm) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex flex-col">
        <header className="px-6 py-4 bg-[#FFFEF9] border-b border-[#2C2C2C] flex items-center gap-4">
          <button
            onClick={() => setShowInquiryForm(false)}
            className="p-2 hover:bg-[#FAF9F7] transition-colors"
          >
            <ArrowLeft size={20} className="text-[#2C2C2C]" />
          </button>
          <h1 className="font-script text-2xl text-[#2C2C2C]">Beauvette</h1>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-[#FFFEF9] p-1 border border-[#2C2C2C]"
          >
            <div className="border border-[#2C2C2C] p-8">
              <div className="text-center mb-6">
                <h2 className="font-header text-xl text-[#2C2C2C] mb-1">Chat with {artist.name}</h2>
                <p className="text-sm text-[#666]">Send an inquiry about your event</p>
              </div>

              <form onSubmit={handleSubmitInquiry} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#2C2C2C] mb-1">Your Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={18} />
                    <input
                      type="text"
                      value={form.clientName}
                      onChange={(e) => setForm(prev => ({ ...prev, clientName: e.target.value }))}
                      placeholder="Your name"
                      className="w-full pl-10 pr-4 py-3 border border-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C]"
                      required
                      data-testid="input-client-name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2C2C2C] mb-1">Your Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={18} />
                    <input
                      type="email"
                      value={form.clientEmail}
                      onChange={(e) => setForm(prev => ({ ...prev, clientEmail: e.target.value }))}
                      placeholder="your@email.com"
                      className="w-full pl-10 pr-4 py-3 border border-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C]"
                      required
                      data-testid="input-client-email"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2C2C2C] mb-1">Event Date</label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" size={18} />
                    <input
                      type="date"
                      value={form.eventDate ? format(form.eventDate, "yyyy-MM-dd") : ""}
                      onChange={(e) => setForm(prev => ({ ...prev, eventDate: e.target.value ? new Date(e.target.value + "T12:00:00") : null }))}
                      className="w-full pl-10 pr-4 py-3 border border-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C]"
                      required
                      data-testid="input-event-date"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2C2C2C] mb-1">Message</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 text-[#666]" size={18} />
                    <textarea
                      value={form.message}
                      onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Tell them about your event..."
                      rows={4}
                      className="w-full pl-10 pr-4 py-3 border border-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C] resize-none"
                      data-testid="input-message"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitInquiry.isPending}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#FAF9F7] text-[#2C2C2C] border border-[#2C2C2C] hover:bg-[#f0efe9] transition-colors disabled:opacity-50"
                  data-testid="button-send-inquiry"
                >
                  {submitInquiry.isPending ? "Sending..." : "Send Inquiry"}
                  <Send size={18} />
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const bookedDateSelected = selectedDate && isDateBooked(selectedDate);

  return (
    <div className="min-h-screen bg-[#FAF9F7] flex flex-col">
      <header className="px-6 py-4 bg-[#FFFEF9] border-b border-[#2C2C2C] flex items-center justify-between">
        <div className="w-16" />
        <h1 className="font-script text-2xl text-[#2C2C2C]">Beauvette</h1>
        <button
          onClick={() => setLocation("/login")}
          className="text-sm text-[#2C2C2C] hover:underline"
          data-testid="button-login"
        >
          Log in
        </button>
      </header>

      <div className="flex-1 p-4 max-w-md mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#FFFEF9] p-1 border border-[#2C2C2C]"
        >
          <div className="border border-[#2C2C2C]">
            <div className="p-6 border-b border-[#2C2C2C]">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 border border-[#2C2C2C] flex items-center justify-center shrink-0">
                  <span className="text-2xl font-header text-[#2C2C2C]">{artist.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-header text-xl text-[#2C2C2C] truncate">{artist.name}</h2>
                  <p className="text-sm text-[#666] truncate">{artist.businessName}</p>
                  
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {artist.instagramHandle && (
                      <a
                        href={`https://instagram.com/${artist.instagramHandle.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-[#2C2C2C] hover:underline"
                      >
                        <Instagram size={14} />
                        @{artist.instagramHandle.replace('@', '')}
                      </a>
                    )}
                    {artist.websiteUrl && (
                      <a
                        href={artist.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-[#666] hover:underline"
                      >
                        <Globe size={14} />
                        Website
                      </a>
                    )}
                  </div>

                  {artist.responsiveBadge && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-[#2C2C2C]">
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
                  className="p-2 hover:bg-[#FAF9F7] transition-colors"
                >
                  <ArrowLeft size={20} className="text-[#2C2C2C]" />
                </button>
                <div className="text-center">
                  <span className="text-lg font-header text-[#2C2C2C]">
                    {format(currentMonth, "MMMM yyyy")}
                  </span>
                </div>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-2 hover:bg-[#FAF9F7] transition-colors rotate-180"
                >
                  <ArrowLeft size={20} className="text-[#2C2C2C]" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                  <div key={`${day}-${i}`} className="text-center text-xs font-medium py-2 text-[#666]">
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
                        aspect-square flex items-center justify-center text-sm
                        transition-all duration-200 min-h-[40px] border
                        ${booked 
                          ? "bg-[#2C2C2C] text-[#FFFEF9] border-[#2C2C2C] cursor-pointer" 
                          : "text-[#2C2C2C] border-transparent hover:border-[#2C2C2C] cursor-pointer"
                        }
                        ${isSelected ? "ring-1 ring-[#2C2C2C] ring-offset-1" : ""}
                      `}
                      data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-4 mt-4 text-xs text-[#666] justify-center">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-[#2C2C2C]" />
                  <span>Booked</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 border border-[#2C2C2C]" />
                  <span>Available</span>
                </div>
              </div>
            </div>

            {bookedDateSelected && artist.referralArtists && artist.referralArtists.length > 0 && (
              <div className="p-4 border-t border-[#2C2C2C] bg-[#FAF9F7]">
                <p className="text-sm text-[#2C2C2C] mb-3">
                  {artist.name} is booked on {format(selectedDate!, "MMMM d")}. 
                  Here are artists in their network:
                </p>
                <div className="space-y-2">
                  {artist.referralArtists.map((ref, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-[#FFFEF9] border border-[#2C2C2C]">
                      <div>
                        <p className="text-sm font-medium text-[#2C2C2C]">{ref.name}</p>
                        {ref.instagramHandle && (
                          <p className="text-xs text-[#666]">@{ref.instagramHandle.replace('@', '')}</p>
                        )}
                      </div>
                      {ref.isOnPlatform && ref.slug ? (
                        <button
                          onClick={() => setLocation(`/${ref.slug}`)}
                          className="px-3 py-1 text-xs bg-[#FAF9F7] text-[#2C2C2C] border border-[#2C2C2C]"
                        >
                          View Calendar
                        </button>
                      ) : (
                        <span className="text-xs text-[#666]">Not on Beauvette yet</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 border-t border-[#2C2C2C]">
              <button
                onClick={() => setShowInquiryForm(true)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#FAF9F7] text-[#2C2C2C] border border-[#2C2C2C] hover:bg-[#f0efe9] transition-colors"
                data-testid="button-chat-with-artist"
              >
                <MessageCircle size={18} />
                Chat with {artist.name}
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      <footer className="px-6 py-4 bg-[#FFFEF9] border-t border-[#2C2C2C] text-center">
        <p className="text-xs text-[#666] mb-2">
          © 2025 Beauvette. Your Private Secretary.
        </p>
        <a href="/login" className="text-xs text-[#2C2C2C] hover:underline">
          Already using Beauvette? Sign in
        </a>
      </footer>
    </div>
  );
}
