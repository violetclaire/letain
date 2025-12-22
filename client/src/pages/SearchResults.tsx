import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, MapPin, Calendar, X, DollarSign, Instagram, Globe, ChevronLeft, ChevronRight } from "lucide-react";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Vendor {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profile: {
    businessName?: string | null;
    bio?: string | null;
    location?: string | null;
    specialties?: string[] | null;
    portfolioUrls?: string[] | null;
    priceRange?: string | null;
    instagramHandle?: string | null;
    websiteUrl?: string | null;
  };
}

export default function SearchResults() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/search");
  const { user, isAuthenticated } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState<{
    location?: string;
    date?: string;
    service?: string;
  }>({});
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [bookingDate, setBookingDate] = useState<Date | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingLocation, setBookingLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [imageIndexes, setImageIndexes] = useState<Record<string, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const location = urlParams.get("location") || undefined;
    const date = urlParams.get("date") || undefined;
    const service = urlParams.get("service") || undefined;
    
    setSearchParams({ location, date, service });
    
    const query = new URLSearchParams();
    if (location) query.append("location", location);
    if (date) query.append("date", date);
    if (service) query.append("service", service);
    
    fetch(`/api/search/vendors?${query}`)
      .then(res => res.json())
      .then(data => {
        setVendors(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching vendors:", err);
        setVendors([]);
        setLoading(false);
      });
  }, []);

  const handleViewProfile = (vendorId: string) => {
    setLocation(`/vendor/${vendorId}`);
  };

  const handleViewCalendar = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowCalendarModal(true);
  };

  const handleRequestBooking = (date: Date) => {
    setBookingDate(date);
    setShowCalendarModal(false);
    setShowBookingModal(true);
  };

  const submitBookingRequest = async () => {
    if (!selectedVendor || !bookingDate || !bookingLocation.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a location for your event.",
        variant: "destructive",
      });
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          artistId: selectedVendor.id,
          eventDate: bookingDate.toISOString(),
          location: bookingLocation,
          notes: bookingNotes,
          serviceType: "Bridal Services",
          status: "pending",
        }),
      });

      if (response.ok) {
        toast({
          title: "Request Sent!",
          description: `Your booking request for ${bookingDate.toLocaleDateString()} has been sent to ${getVendorName(selectedVendor)}.`,
        });
        setShowBookingModal(false);
        setBookingNotes("");
        setBookingLocation("");
        setBookingDate(null);
        setSelectedVendor(null);
      } else {
        const data = await response.json();
        if (response.status === 401) {
          toast({
            title: "Login Required",
            description: "Please log in as a client to request bookings.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: data.error || "Failed to send booking request",
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to send booking request",
        variant: "destructive",
      });
    }
    setSubmitting(false);
  };

  const getVendorName = (vendor: Vendor) => {
    if (vendor.profile.businessName) return vendor.profile.businessName;
    if (vendor.firstName && vendor.lastName) return `${vendor.firstName} ${vendor.lastName}`;
    if (vendor.firstName) return vendor.firstName;
    return "Vendor";
  };

  const getImageIndex = (vendorId: string) => imageIndexes[vendorId] || 0;
  
  const nextImage = (vendorId: string, totalImages: number) => {
    setImageIndexes(prev => ({
      ...prev,
      [vendorId]: ((prev[vendorId] || 0) + 1) % totalImages
    }));
  };
  
  const prevImage = (vendorId: string, totalImages: number) => {
    setImageIndexes(prev => ({
      ...prev,
      [vendorId]: ((prev[vendorId] || 0) - 1 + totalImages) % totalImages
    }));
  };

  const handleSendInquiry = (vendor: Vendor) => {
    if (!isAuthenticated) {
      toast({
        title: "Account Required",
        description: "Please create an account or log in to send an inquiry.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
      return;
    }
    setSelectedVendor(vendor);
    setShowCalendarModal(true);
  };

  return (
    <div className="min-h-screen bg-powder-blue font-sans p-4">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="frame-outer shadow-sm mb-6">
          <div className="frame-inner">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => window.history.back()}
                className="flex items-center gap-2 text-xs uppercase tracking-widest ink-soft hover:ink-main transition-colors"
                data-testid="button-back"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <h1 className="font-script text-3xl ink-main">
                Beauvette
              </h1>
              <div className="w-16" />
            </div>

            {/* Search Summary */}
            <div className="text-center">
              <p className="text-xs ink-soft uppercase tracking-wide flex items-center justify-center gap-4 flex-wrap">
                {searchParams.service && (
                  <span className="inline-flex items-center gap-1 bg-black text-white px-3 py-1 rounded-full">
                    {searchParams.service}
                  </span>
                )}
                {searchParams.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={10} /> {searchParams.location}
                  </span>
                )}
                {searchParams.date && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={10} /> {new Date(searchParams.date).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* RESULTS */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm ink-soft">Searching for available vendors...</p>
          </div>
        ) : vendors.length === 0 ? (
          <div className="frame-outer shadow-sm">
            <div className="frame-inner text-center py-12">
              <p className="text-lg ink-main mb-2">No vendors found</p>
              <p className="text-sm ink-soft mb-4">
                {searchParams.date 
                  ? "No vendors are available for your selected date. Try a different date."
                  : "Try adjusting your search criteria or location."
                }
              </p>
              <button
                onClick={() => window.history.back()}
                className="text-sm underline ink-main hover:text-black"
              >
                Go back and adjust search
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm ink-soft mb-4 text-center">
              {vendors.length} vendor{vendors.length !== 1 ? 's' : ''} available
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vendors.map((vendor) => {
                const images = vendor.profile.portfolioUrls || [];
                const currentIndex = getImageIndex(vendor.id);
                
                return (
                  <div 
                    key={vendor.id} 
                    className="bg-cream rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-black/10"
                    data-testid={`card-vendor-${vendor.id}`}
                  >
                    {/* Photo Carousel */}
                    <div className="relative aspect-[4/3] bg-gray-100">
                      {images.length > 0 ? (
                        <>
                          <img 
                            src={images[currentIndex]} 
                            alt={`${getVendorName(vendor)} portfolio`}
                            className="w-full h-full object-cover"
                          />
                          {images.length > 1 && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); prevImage(vendor.id, images.length); }}
                                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white"
                                data-testid={`button-prev-${vendor.id}`}
                              >
                                <ChevronLeft size={16} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); nextImage(vendor.id, images.length); }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white"
                                data-testid={`button-next-${vendor.id}`}
                              >
                                <ChevronRight size={16} />
                              </button>
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                                {images.slice(0, 5).map((_, idx) => (
                                  <div key={idx} className={`w-1.5 h-1.5 rounded-full ${idx === currentIndex ? 'bg-white' : 'bg-white/50'}`} />
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-black/30">
                          <span className="text-4xl font-script">{getVendorName(vendor).charAt(0)}</span>
                        </div>
                      )}
                    </div>

                    {/* Vendor Info */}
                    <div className="p-4">
                      <h3 className="font-script text-xl mb-1" data-testid={`text-vendor-name-${vendor.id}`}>
                        {getVendorName(vendor)}
                      </h3>

                      {/* Price Range */}
                      {vendor.profile.priceRange && (
                        <p className="text-sm text-black/70 flex items-center gap-1 mb-2">
                          <DollarSign size={14} /> {vendor.profile.priceRange}
                        </p>
                      )}

                      {/* Social Links */}
                      <div className="flex gap-2 mb-4">
                        {vendor.profile.instagramHandle && (
                          <a
                            href={`https://instagram.com/${vendor.profile.instagramHandle.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs flex items-center gap-1 text-black/60 hover:text-black"
                            data-testid={`link-instagram-${vendor.id}`}
                          >
                            <Instagram size={14} /> {vendor.profile.instagramHandle.startsWith('@') ? vendor.profile.instagramHandle : `@${vendor.profile.instagramHandle}`}
                          </a>
                        )}
                        {vendor.profile.websiteUrl && (
                          <a
                            href={vendor.profile.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs flex items-center gap-1 text-black/60 hover:text-black"
                            data-testid={`link-website-${vendor.id}`}
                          >
                            <Globe size={14} /> Website
                          </a>
                        )}
                      </div>

                      {/* Inquire Button */}
                      <button
                        onClick={() => handleSendInquiry(vendor)}
                        className="w-full bg-black text-white py-3 rounded text-sm font-medium hover:bg-gray-800 transition-colors"
                        data-testid={`button-inquiry-${vendor.id}`}
                      >
                        Inquire for More Information
                      </button>
                      
                      <p className="text-[0.65rem] text-center text-black/50 mt-2 leading-relaxed">
                        Select a date to request services. We'll reach out to the vendor for confirmation. The Beauvette assistant will help facilitate.
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Calendar Modal */}
        {showCalendarModal && selectedVendor && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
              <button
                onClick={() => {
                  setShowCalendarModal(false);
                  setSelectedVendor(null);
                }}
                className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded"
                data-testid="button-close-calendar"
              >
                <X size={20} />
              </button>
              <h3 className="font-header text-xl mb-4">{getVendorName(selectedVendor)}</h3>
              <AvailabilityCalendar
                userId={selectedVendor.id}
                viewOnly={true}
                onRequestBooking={handleRequestBooking}
              />
            </div>
          </div>
        )}

        {/* Booking Request Modal */}
        {showBookingModal && selectedVendor && bookingDate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
              <button
                onClick={() => {
                  setShowBookingModal(false);
                  setBookingDate(null);
                }}
                className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded"
                data-testid="button-close-booking"
              >
                <X size={20} />
              </button>
              <h3 className="font-header text-xl mb-2">Request Booking</h3>
              <p className="text-sm text-gray-600 mb-4">
                Request {getVendorName(selectedVendor)} for {bookingDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              
              <div className="mb-4">
                <label className="block text-xs uppercase tracking-wide mb-2 text-gray-600">
                  Event Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bookingLocation}
                  onChange={(e) => setBookingLocation(e.target.value)}
                  placeholder="Venue name, city, or address"
                  className="w-full border border-gray-300 rounded p-3 text-sm focus:outline-none focus:border-black"
                  data-testid="input-booking-location"
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs uppercase tracking-wide mb-2 text-gray-600">
                  Notes (optional)
                </label>
                <textarea
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="Tell the vendor about your event, service needs, etc."
                  className="w-full border border-gray-300 rounded p-3 text-sm min-h-[80px] focus:outline-none focus:border-black"
                  data-testid="input-booking-notes"
                />
              </div>

              <button
                onClick={submitBookingRequest}
                disabled={submitting}
                className="w-full bg-black text-white py-3 rounded text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50"
                data-testid="button-submit-booking"
              >
                {submitting ? "Sending..." : "Send Booking Request"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
