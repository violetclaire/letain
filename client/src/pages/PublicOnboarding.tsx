import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Instagram, Globe, ArrowRight, ArrowLeft, Calendar, Share2, Copy, ExternalLink, Upload, FileText, Loader2, KeyRound, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import VintageCalendar from "@/components/VintageCalendar";

interface OnboardingData {
  name: string;
  email: string;
  businessName: string;
  customSlug: string;
  instagramHandle: string;
  tiktokHandle: string;
  pinterestHandle: string;
  websiteUrl: string;
  bookedDates: Date[];
  pendingDates: Date[];
  referralArtists: string[];
  infoSheetFile: File | null;
  infoSheetUploaded: boolean;
}

export default function PublicOnboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [hasShared, setHasShared] = useState(false);
  const [artistSlug, setArtistSlug] = useState("");
  const [settingsUrl, setSettingsUrl] = useState("");
  const [referralResults, setReferralResults] = useState<Array<{ handle: string; isOnPlatform: boolean; inviteLink?: string }>>([]);
  
  const [data, setData] = useState<OnboardingData>({
    name: "",
    email: "",
    businessName: "",
    customSlug: "",
    instagramHandle: "",
    tiktokHandle: "",
    pinterestHandle: "",
    websiteUrl: "",
    bookedDates: [],
    pendingDates: [],
    referralArtists: ["", "", ""],
    infoSheetFile: null,
    infoSheetUploaded: false
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const totalSteps = 8;

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (step) {
      case 1: return data.name.trim().length > 0;
      case 2: return data.email.trim().length > 0 && data.email.includes('@');
      case 3: return data.businessName.trim().length > 0 && data.customSlug.trim().length > 0;
      case 4: return true; // Instagram is now optional
      case 5: return true;
      case 6: return true;
      case 7: return data.referralArtists.filter(a => a.trim()).length > 0;
      case 8: return true; // Info sheet is optional
      default: return false;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, image, or Word document.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }
    
    updateData("infoSheetFile", file);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // First create the profile
      const response = await fetch("/api/public/artists/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email.trim().toLowerCase(),
          businessName: data.businessName,
          customSlug: data.customSlug,
          instagramHandle: data.instagramHandle.replace("@", ""),
          tiktokHandle: data.tiktokHandle.replace("@", ""),
          pinterestHandle: data.pinterestHandle.replace("@", ""),
          websiteUrl: data.websiteUrl,
          bookedDates: data.bookedDates.map(d => d.toISOString()),
          pendingDates: data.pendingDates.map(d => d.toISOString()),
          referralArtists: data.referralArtists.filter(a => a.trim())
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to create profile");
      }
      
      // If there's an info sheet file, upload it
      if (data.infoSheetFile && result.artistId) {
        try {
          const formData = new FormData();
          formData.append("file", data.infoSheetFile);
          formData.append("artistId", result.artistId);
          
          await fetch("/api/public/artists/upload-info-sheet", {
            method: "POST",
            body: formData
          });
        } catch (uploadError) {
          console.error("Info sheet upload failed:", uploadError);
          // Don't fail the whole onboarding if info sheet upload fails
        }
      }
      
      setArtistSlug(result.artistSlug);
      if (result.settingsUrl) {
        setSettingsUrl(result.settingsUrl);
      }
      if (result.referralResults) {
        setReferralResults(result.referralResults);
      }
      setIsComplete(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create your profile. Please try again.",
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
              <h2 className="font-header text-2xl text-[#2C2C2C] mb-2">What's your email?</h2>
              <p className="text-sm text-[#666]">We'll send you your calendar link and booking notifications</p>
            </div>
            <input
              type="email"
              value={data.email}
              onChange={(e) => updateData("email", e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 text-lg border border-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#2C2C2C]"
              autoFocus
              data-testid="input-email"
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
              <h2 className="font-header text-2xl text-[#2C2C2C] mb-2">What's your business name?</h2>
              <p className="text-sm text-[#666]">Your brand or company name</p>
            </div>
            <input
              type="text"
              value={data.businessName}
              onChange={(e) => {
                updateData("businessName", e.target.value);
                if (!data.customSlug) {
                  updateData("customSlug", e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                }
              }}
              placeholder="Your business name"
              className="w-full px-4 py-3 text-lg border border-[#2C2C2C] bg-[#FAF9F7] text-[#2C2C2C] focus:outline-none focus:ring-1 focus:ring-[#2C2C2C]"
              autoFocus
              data-testid="input-business-name"
            />
            <div>
              <label className="text-xs text-[#666] mb-1 block">Your personal link (you can customize this)</label>
              <div className="flex items-center border border-[#2C2C2C] bg-[#FAF9F7]">
                <span className="px-3 py-3 text-[#999] text-sm border-r border-[#2C2C2C]">dateinquiry.com/</span>
                <input
                  type="text"
                  value={data.customSlug}
                  onChange={(e) => updateData("customSlug", e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                  placeholder="yourbusiness"
                  className="flex-1 px-3 py-3 text-lg bg-transparent text-[#2C2C2C] focus:outline-none"
                  data-testid="input-custom-slug"
                />
              </div>
              <p className="text-xs text-[#999] mt-1">Letters and numbers only, no spaces</p>
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
              <h2 className="font-header text-2xl text-[#2C2C2C] mb-2">What dates are you already booked?</h2>
              <p className="text-sm text-[#666]">Mark your 2026 and 2027 bookings (tap once for pending, twice for confirmed)</p>
            </div>
            <VintageCalendar
              bookedDates={data.bookedDates}
              pendingDates={data.pendingDates}
              onDatesChange={(booked, pending) => {
                updateData("bookedDates", booked);
                updateData("pendingDates", pending);
              }}
              minYear={2026}
              maxYear={2027}
            />
          </motion.div>
        );

      case 7:
        return (
          <motion.div
            key="step7"
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

      case 8:
        return (
          <motion.div
            key="step8"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="font-header text-2xl text-[#2C2C2C] mb-2">Upload your info sheet</h2>
              <p className="text-sm text-[#666]">Share pricing, services, or any document clients should see (optional)</p>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-info-sheet"
            />
            
            {data.infoSheetFile ? (
              <div className="border border-[#2C2C2C] p-4 bg-[#FAF9F7]">
                <div className="flex items-center gap-3">
                  <FileText size={24} className="text-[#2C2C2C]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#2C2C2C] truncate">{data.infoSheetFile.name}</p>
                    <p className="text-xs text-[#666]">{(data.infoSheetFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    onClick={() => updateData("infoSheetFile", null)}
                    className="text-[#666] hover:text-[#2C2C2C]"
                    data-testid="button-remove-file"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-[#2C2C2C] p-8 flex flex-col items-center gap-3 hover:bg-[#FAF9F7] transition-colors"
                data-testid="button-upload-info-sheet"
              >
                <Upload size={32} className="text-[#2C2C2C]" />
                <span className="text-sm text-[#666]">Click to upload PDF, Word doc, or image</span>
              </button>
            )}
            
            <p className="text-xs text-[#666] text-center">
              You can skip this step and add it later from your settings.
            </p>
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
            <div className="text-center mb-8">
              <div className="w-16 h-16 border border-[#2C2C2C] flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-[#2C2C2C]" />
              </div>
              <h2 className="font-header text-2xl text-[#2C2C2C] mb-2">Welcome!</h2>
              <p className="text-[#666] leading-relaxed">Your inquiry link for social media and email signatures:</p>
            </div>

            <div className="bg-[#FAF9F7] p-4 mb-6 border border-[#2C2C2C]">
              <p className="text-center font-medium text-[#2C2C2C] break-all text-sm">{calendarUrl}</p>
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

            <p className="text-xs text-[#666] text-center mb-6">
              Use this link for inquiries that don't come through your website contact form.
            </p>

            {settingsUrl && (
              <button
                onClick={() => window.open(settingsUrl, '_blank')}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#2C2C2C] text-white hover:bg-[#1a1a1a] transition-colors"
                data-testid="button-go-to-dashboard"
              >
                My Dashboard
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F7] flex flex-col">
      <header className="px-6 py-4 bg-[#FFFEF9] border-b border-[#2C2C2C]">
        <h1 className="font-script text-2xl text-[#2C2C2C] text-center">Your Private Secretary</h1>
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
