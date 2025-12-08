import { useEffect, useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { ArrowLeft, Instagram, Globe, Calendar, ChevronLeft, ChevronRight, DollarSign } from "lucide-react";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import GooglePlacesInput from "@/components/GooglePlacesInput";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface VendorData {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profileImageUrl: string | null;
  role: string;
  profile: {
    businessName?: string | null;
    bio?: string | null;
    location?: string | null;
    specialties?: string[] | null;
    portfolioUrls?: string[] | null;
    priceRange?: string | null;
    instagramHandle?: string | null;
    websiteUrl?: string | null;
  } | null;
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number | null;
    duration: number | null;
    category: string;
  }>;
}

export default function VendorProfile() {
  const [, params] = useRoute("/vendor/:id");
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingDate, setBookingDate] = useState<Date | null>(null);
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingLocation, setBookingLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (params?.id) {
      fetchVendor(params.id);
    }
  }, [params?.id]);

  const fetchVendor = async (vendorId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vendor-public/${vendorId}`);
      if (res.ok) {
        const data = await res.json();
        setVendor(data);
      } else {
        toast({
          title: "Vendor Not Found",
          description: "This vendor profile doesn't exist or has been removed.",
          variant: "destructive",
        });
        setLocation("/browse");
      }
    } catch (err) {
      console.error("Error fetching vendor:", err);
      toast({
        title: "Error",
        description: "Failed to load vendor profile.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleRequestBooking = (date: Date) => {
    if (!isAuthenticated) {
      toast({
        title: "Account Required",
        description: "Please create an account or log in to request a booking.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1500);
      return;
    }
    setBookingDate(date);
    setShowCalendar(false);
    setShowBookingModal(true);
  };

  const submitBookingRequest = async () => {
    if (!vendor || !bookingDate || !bookingLocation.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a location for your event.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Format date as YYYY-MM-DD to avoid timezone issues
      const year = bookingDate.getFullYear();
      const month = String(bookingDate.getMonth() + 1).padStart(2, '0');
      const day = String(bookingDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}T12:00:00.000Z`;
      
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          artistId: vendor.id,
          eventDate: formattedDate,
          location: bookingLocation,
          notes: bookingNotes,
          serviceType: "Bridal Services",
          status: "pending",
        }),
      });

      if (response.ok) {
        toast({
          title: "Request Sent!",
          description: `Your booking request has been sent to ${getVendorName()}. Once they approve, you'll be connected to chat.`,
        });
        setShowBookingModal(false);
        setBookingNotes("");
        setBookingLocation("");
        setBookingDate(null);
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.error || "Failed to send booking request",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    }
    setSubmitting(false);
  };

  const getVendorName = () => {
    if (vendor?.profile?.businessName) return vendor.profile.businessName;
    if (vendor?.firstName || vendor?.lastName) {
      return `${vendor.firstName || ''} ${vendor.lastName || ''}`.trim();
    }
    return "Vendor";
  };

  const portfolioImages = vendor?.profile?.portfolioUrls || [];
  
  // Auto-scroll the carousel slowly
  useEffect(() => {
    if (portfolioImages.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % portfolioImages.length);
    }, 5000); // Change every 5 seconds
    
    return () => clearInterval(interval);
  }, [portfolioImages.length]);
  
  const nextImage = () => {
    if (portfolioImages.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % portfolioImages.length);
    }
  };

  const prevImage = () => {
    if (portfolioImages.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + portfolioImages.length) % portfolioImages.length);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-powder-blue flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-black/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-powder-blue flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium mb-4">Vendor not found</p>
          <Link href="/browse" className="text-sm underline">Browse all vendors</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Floating Back Button */}
      <button
        onClick={() => window.history.back()}
        className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full text-sm text-black/80 hover:bg-white transition-all shadow-lg"
        data-testid="button-back"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Editorial 2x2 Grid Carousel */}
      {portfolioImages.length > 0 && (
        <div className="relative">
          {/* Vendor Name Header */}
          <div className="bg-black py-6 px-6">
            <h1 
              className="text-white text-3xl sm:text-4xl text-center"
              style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', Georgia, serif", fontWeight: 300, fontStyle: 'italic', letterSpacing: '0.02em' }}
            >
              {getVendorName()}
            </h1>
            {vendor.profile?.location && (
              <p 
                className="text-white/60 text-xs tracking-[0.25em] uppercase mt-2 text-center"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 400 }}
              >
                {vendor.profile.location}
              </p>
            )}
          </div>
          
          {/* 2x2 Photo Grid */}
          <div className="grid grid-cols-2 gap-0.5 bg-black p-0.5">
            {[0, 1, 2, 3].map((gridIdx) => {
              const imageIdx = (currentImageIndex + gridIdx) % portfolioImages.length;
              return (
                <div
                  key={gridIdx}
                  className="aspect-square overflow-hidden"
                >
                  <img
                    src={portfolioImages[imageIdx]}
                    alt={`${getVendorName()} portfolio ${imageIdx + 1}`}
                    className="w-full h-full object-cover transition-opacity duration-700"
                    data-testid={`img-portfolio-${gridIdx}`}
                  />
                </div>
              );
            })}
          </div>
          
          {/* Minimalist Navigation Dots */}
          {portfolioImages.length > 4 && (
            <div className="bg-black py-4 flex justify-center gap-2">
              {Array.from({ length: Math.ceil(portfolioImages.length / 4) }).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx * 4)}
                  className={`transition-all duration-300 rounded-full ${
                    Math.floor(currentImageIndex / 4) === idx 
                      ? 'w-6 h-1.5 bg-white' 
                      : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/60'
                  }`}
                  data-testid={`button-dot-${idx}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content Section */}
      <div className="bg-cream p-6 space-y-6">
        
        {/* Price Range */}
        {vendor.profile?.priceRange && (
          <div className="flex items-center justify-center gap-2 text-center">
            <DollarSign size={18} className="text-black/50" />
            <span className="text-lg font-medium">{vendor.profile.priceRange}</span>
          </div>
        )}

        {/* Social Links */}
        <div className="flex justify-center gap-4">
          {vendor.profile?.instagramHandle && (
            <a
              href={`https://instagram.com/${vendor.profile.instagramHandle.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-full border border-black/10 text-sm hover:bg-black hover:text-white transition-colors"
              data-testid="link-instagram"
            >
              <Instagram size={18} /> {vendor.profile.instagramHandle.startsWith('@') ? vendor.profile.instagramHandle : `@${vendor.profile.instagramHandle}`}
            </a>
          )}
          {vendor.profile?.websiteUrl && (
            <a
              href={vendor.profile.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-full border border-black/10 text-sm hover:bg-black hover:text-white transition-colors"
              data-testid="link-website"
            >
              <Globe size={18} /> Website
            </a>
          )}
        </div>

        {/* Calendar Button */}
        <button
          onClick={() => setShowCalendar(true)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-black/20 rounded text-sm hover:bg-black/5 transition-colors"
          data-testid="button-view-calendar"
        >
          <Calendar size={18} /> View Calendar
        </button>

        {/* Inquire Button */}
        <button
          onClick={() => {
            if (!isAuthenticated) {
              toast({
                title: "Account Required",
                description: "Please create an account or log in to inquire about services.",
                variant: "destructive",
              });
              setTimeout(() => {
                window.location.href = "/api/login";
              }, 1500);
              return;
            }
            setShowCalendar(true);
          }}
          className="w-full flex items-center justify-center gap-2 bg-[#6B4A55] text-white py-4 rounded text-sm uppercase tracking-widest font-medium hover:bg-[#5a3d47] transition-colors"
          data-testid="button-inquire"
        >
          Inquire for More Information
        </button>

        {/* Info Text */}
        <p className="text-xs text-center text-black/50 leading-relaxed max-w-sm mx-auto">
          This date is available to request services for. We will reach out to the vendor for confirmation and if so you can both chat more and/or secure services. The Beauvette assistant will help facilitate.
        </p>
      </div>

      {/* Availability Calendar Modal */}
      {showCalendar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-header text-lg">{getVendorName()}'s Availability</h3>
              <button onClick={() => setShowCalendar(false)} className="p-1 hover:bg-black/5 rounded-full text-xl">
                ×
              </button>
            </div>
            <AvailabilityCalendar
              userId={vendor.id}
              viewOnly={true}
              onRequestBooking={handleRequestBooking}
            />
            <p className="text-xs text-black/50 mt-4 text-center">
              Click on an available date to request a booking
            </p>
          </div>
        </div>
      )}

      {/* Booking Request Modal */}
      {showBookingModal && bookingDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="font-header text-lg mb-4">Request Booking</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-black/60">Vendor</p>
                <p className="font-medium">{getVendorName()}</p>
              </div>
              <div>
                <p className="text-sm text-black/60">Date</p>
                <p className="font-medium">{bookingDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <div>
                <label className="block text-sm text-black/60 mb-1">Event Location *</label>
                <GooglePlacesInput
                  value={bookingLocation}
                  onChange={setBookingLocation}
                  placeholder="Start typing venue name or address..."
                  className="border-black/20 text-sm"
                  data-testid="input-booking-location"
                />
              </div>
              <div>
                <label className="block text-sm text-black/60 mb-1">Notes (optional)</label>
                <textarea
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="Any special requests or details..."
                  rows={3}
                  className="w-full border border-black/20 rounded px-3 py-2 text-sm resize-none"
                  data-testid="input-booking-notes"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowBookingModal(false);
                    setBookingDate(null);
                  }}
                  className="flex-1 px-4 py-2 border border-black/20 rounded text-sm hover:bg-black/5"
                >
                  Cancel
                </button>
                <button
                  onClick={submitBookingRequest}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-black text-white rounded text-sm hover:bg-gray-800 disabled:opacity-50"
                  data-testid="button-submit-booking"
                >
                  {submitting ? "Sending..." : "Send Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
