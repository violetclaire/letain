import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Instagram, Globe, ArrowRight, ArrowLeft, Calendar, Share2, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import VintageCalendar from "@/components/VintageCalendar";

interface OnboardingData {
  name: string;
  businessName: string;
  instagramHandle: string;
  tiktokHandle: string;
  pinterestHandle: string;
  websiteUrl: string;
  bookedDates: Date[];
  referralArtists: string[];
}

export default function PublicOnboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [hasShared, setHasShared] = useState(false);
  const [artistSlug, setArtistSlug] = useState("");
  
  const [data, setData] = useState<OnboardingData>({
    name: "",
    businessName: "",
    instagramHandle: "",
    tiktokHandle: "",
    pinterestHandle: "",
    websiteUrl: "",
    bookedDates: [],
    referralArtists: ["", "", ""]
  });

  const totalSteps = 6;

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (step) {
      case 1: return data.name.trim().length > 0;
      case 2: return data.businessName.trim().length > 0;
      case 3: return data.instagramHandle.trim().length > 0;
      case 4: return true;
      case 5: return true;
      case 6: return data.referralArtists.filter(a => a.trim()).length > 0;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/public/artists/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          businessName: data.businessName,
          instagramHandle: data.instagramHandle.replace("@", ""),
          tiktokHandle: data.tiktokHandle.replace("@", ""),
          pinterestHandle: data.pinterestHandle.replace("@", ""),
          websiteUrl: data.websiteUrl,
          bookedDates: data.bookedDates.map(d => d.toISOString()),
          referralArtists: data.referralArtists.filter(a => a.trim())
        })
      });

      if (!response.ok) {
        throw new Error("Failed to create profile");
      }

      const result = await response.json();
      setArtistSlug(result.artistSlug);
      setIsComplete(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create your profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = () => {
    const link = `${window.location.origin}/${artistSlug}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied!",
      description: "Share it on your Instagram bio"
    });
  };

  const shareToInstagram = () => {
    window.open("https://www.instagram.com/", "_blank");
  };

  const handleConfirmShare = async () => {
    setHasShared(true);
    try {
      await fetch("/api/public/artists/confirm-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistSlug })
      });
    } catch (error) {
      console.error("Failed to confirm share:", error);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="font-header text-2xl text-[#2C2C2C] mb-2">What's your name?</h2>
              <p className="text-sm text-[#666]">This is how clients will see you</p>
            </div>
            <input
              type="text"
              value={data.name}
              onChange={(e) => updateData("name", e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3 text-lg border border-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#2C2C2C]"
              autoFocus
              data-testid="input-name"
            />
          </motion.div>
        );
      
      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="font-header text-2xl text-[#2C2C2C] mb-2">What's your business name?</h2>
              <p className="text-sm text-[#666]">Your brand or company name</p>
            </div>
            <input
              type="text"
              value={data.businessName}
              onChange={(e) => updateData("businessName", e.target.value)}
              placeholder="Your business name"
              className="w-full px-4 py-3 text-lg border border-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#2C2C2C]"
              autoFocus
              data-testid="input-business-name"
            />
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="font-header text-2xl text-[#2C2C2C] mb-2">What's your Instagram handle?</h2>
              <p className="text-sm text-[#666]">So clients can find your work</p>
            </div>
            <div className="relative">
              <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2C2C2C]" size={20} />
              <input
                type="text"
                value={data.instagramHandle}
                onChange={(e) => updateData("instagramHandle", e.target.value)}
                placeholder="@yourusername"
                className="w-full pl-12 pr-4 py-3 text-lg border border-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#2C2C2C]"
                autoFocus
                data-testid="input-instagram"
              />
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="font-header text-2xl text-[#2C2C2C] mb-2">Any other socials?</h2>
              <p className="text-sm text-[#666]">Optional - add TikTok, Pinterest, or website</p>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={data.tiktokHandle}
                onChange={(e) => updateData("tiktokHandle", e.target.value)}
                placeholder="TikTok @username (optional)"
                className="w-full px-4 py-3 border border-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#2C2C2C]"
                data-testid="input-tiktok"
              />
              <input
                type="text"
                value={data.pinterestHandle}
                onChange={(e) => updateData("pinterestHandle", e.target.value)}
                placeholder="Pinterest @username (optional)"
                className="w-full px-4 py-3 border border-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#2C2C2C]"
                data-testid="input-pinterest"
              />
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2C2C2C]" size={20} />
                <input
                  type="url"
                  value={data.websiteUrl}
                  onChange={(e) => updateData("websiteUrl", e.target.value)}
                  placeholder="Website URL (optional)"
                  className="w-full pl-12 pr-4 py-3 border border-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#2C2C2C]"
                  data-testid="input-website"
                />
              </div>
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            key="step5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="font-header text-2xl text-[#2C2C2C] mb-2">What dates are you already booked?</h2>
              <p className="text-sm text-[#666]">Mark your 2026 and 2027 bookings</p>
            </div>
            <VintageCalendar
              bookedDates={data.bookedDates}
              onDatesChange={(dates) => updateData("bookedDates", dates)}
              minYear={2026}
              maxYear={2027}
            />
          </motion.div>
        );

      case 6:
        return (
          <motion.div
            key="step6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="font-header text-2xl text-[#2C2C2C] mb-2">Who do you trust?</h2>
              <p className="text-sm text-[#666]">3 artists you refer clients to when you're unavailable</p>
            </div>
            <div className="space-y-4">
              {[0, 1, 2].map((index) => (
                <input
                  key={index}
                  type="text"
                  value={data.referralArtists[index]}
                  onChange={(e) => {
                    const updated = [...data.referralArtists];
                    updated[index] = e.target.value;
                    updateData("referralArtists", updated);
                  }}
                  placeholder={`Artist ${index + 1} @instagram or name`}
                  className="w-full px-4 py-3 border border-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#2C2C2C]"
                  data-testid={`input-referral-${index}`}
                />
              ))}
            </div>
          </motion.div>
        );
    }
  };

  if (isComplete) {
    const calendarUrl = `${window.location.origin}/${artistSlug}`;
    
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-[#FFFEF9] p-1 border border-[#2C2C2C]"
        >
          <div className="border border-[#2C2C2C] p-8">
            {!hasShared ? (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 border border-[#2C2C2C] flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-[#2C2C2C]" />
                  </div>
                  <h2 className="font-header text-2xl text-[#2C2C2C] mb-2">Perfect</h2>
                  <p className="text-[#666]">Your calendar is live at:</p>
                </div>

                <div className="bg-[#FAF9F7] p-4 mb-6 border border-[#2C2C2C]">
                  <p className="text-center font-medium text-[#2C2C2C] break-all text-sm">{calendarUrl}</p>
                </div>

                <div className="bg-[#FAF9F7] p-4 mb-6 border border-[#2C2C2C]">
                  <p className="text-center font-medium text-[#2C2C2C] text-sm tracking-wide uppercase">
                    Add this link to your Instagram bio now
                  </p>
                  <p className="text-center text-xs text-[#666] mt-1">We'll wait.</p>
                </div>

                <div className="flex gap-3 mb-6">
                  <button
                    onClick={copyLink}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#FAF9F7] text-[#2C2C2C] border border-[#2C2C2C] hover:bg-[#f0efe9] transition-colors"
                    data-testid="button-copy-link"
                  >
                    <Copy size={18} />
                    Copy Link
                  </button>
                  <button
                    onClick={shareToInstagram}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-[#2C2C2C] text-[#2C2C2C] hover:bg-[#FAF9F7] transition-colors"
                    data-testid="button-open-instagram"
                  >
                    <Instagram size={18} />
                    Open Instagram
                  </button>
                </div>

                <label className="flex items-start gap-3 p-4 border border-[#2C2C2C] cursor-pointer hover:bg-[#FAF9F7] transition-colors">
                  <input
                    type="checkbox"
                    checked={hasShared}
                    onChange={(e) => {
                      if (e.target.checked) handleConfirmShare();
                    }}
                    className="mt-1 w-5 h-5 accent-[#2C2C2C]"
                    data-testid="checkbox-shared"
                  />
                  <span className="text-[#2C2C2C] text-sm">
                    I shared my link to Instagram
                  </span>
                </label>

                <div className="mt-6 text-center">
                  <a 
                    href="/analytics" 
                    className="text-sm text-[#666] hover:text-[#2C2C2C] underline"
                    data-testid="link-analytics"
                  >
                    Want to be on our Top Responsive Artists leaderboard?
                  </a>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 border border-[#2C2C2C] flex items-center justify-center mx-auto mb-4">
                    <Share2 className="w-8 h-8 text-[#2C2C2C]" />
                  </div>
                  <h2 className="font-header text-2xl text-[#2C2C2C] mb-4">You're all set</h2>
                  <p className="text-[#666] leading-relaxed">
                    Respond to inquiries in under 10 minutes to earn the 
                    <span className="font-medium text-[#2C2C2C]"> Quick Responder </span>
                    badge and rank on our leaderboard.
                  </p>
                </div>

                <p className="text-center text-lg font-header text-[#2C2C2C] mb-8">
                  See you at the top.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setLocation(`/${artistSlug}`)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#FAF9F7] text-[#2C2C2C] border border-[#2C2C2C] hover:bg-[#f0efe9] transition-colors"
                    data-testid="button-view-calendar"
                  >
                    <Calendar size={18} />
                    View My Calendar
                  </button>
                  <button
                    onClick={() => setLocation("/analytics")}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-[#2C2C2C] text-[#2C2C2C] hover:bg-[#FAF9F7] transition-colors"
                    data-testid="button-view-leaderboard"
                  >
                    <ExternalLink size={18} />
                    Leaderboard
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F7] flex flex-col">
      <header className="px-6 py-4 bg-[#FFFEF9] border-b border-[#2C2C2C]">
        <h1 className="font-script text-2xl text-[#2C2C2C] text-center">Beauvette</h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-2 mb-8">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-0.5 transition-all duration-300 ${
                  i + 1 === step
                    ? "w-8 bg-[#2C2C2C]"
                    : i + 1 < step
                    ? "w-2 bg-[#2C2C2C]"
                    : "w-2 bg-[#ccc]"
                }`}
              />
            ))}
          </div>

          <div className="bg-[#FFFEF9] p-1 border border-[#2C2C2C]">
            <div className="border border-[#2C2C2C] p-8">
              <AnimatePresence mode="wait">
                {renderStep()}
              </AnimatePresence>

              <div className="flex gap-4 mt-8">
                {step > 1 && (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="flex items-center gap-2 px-6 py-3 border border-[#2C2C2C] text-[#2C2C2C] hover:bg-[#FAF9F7] transition-colors"
                    data-testid="button-back"
                  >
                    <ArrowLeft size={18} />
                    Back
                  </button>
                )}
                
                {step < totalSteps ? (
                  <button
                    onClick={() => setStep(step + 1)}
                    disabled={!canProceed()}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#FAF9F7] text-[#2C2C2C] border border-[#2C2C2C] hover:bg-[#f0efe9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="button-next"
                  >
                    Next
                    <ArrowRight size={18} />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !canProceed()}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#FAF9F7] text-[#2C2C2C] border border-[#2C2C2C] hover:bg-[#f0efe9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="button-create-calendar"
                  >
                    {isSubmitting ? "Creating..." : "Create My Calendar"}
                    <Check size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="px-6 py-4 bg-[#FFFEF9] border-t border-[#2C2C2C] text-center">
        <p className="text-xs text-[#666]">
          Share your availability. Stop answering "are you available?" emails.
        </p>
      </footer>
    </div>
  );
}
