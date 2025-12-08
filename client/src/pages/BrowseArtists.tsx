import { HouseSketch } from "../components/HouseSketch";
import { Link, useLocation } from "wouter";
import { Calendar, MapPin, DollarSign, MessageSquare, X, Send, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface Vendor {
  id: string;
  name: string;
  specialty: string;
  price: string;
  location: string;
  reviewCount: number;
  available: boolean;
  isDemo?: boolean;
}

interface InquiryForm {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  eventDate: string;
  eventType: string;
  serviceType: string;
  partySize: string;
  message: string;
  budget: string;
}

const demoVendors: Vendor[] = [
  { id: "demo-vendor-1", name: "Elena Rossi", specialty: "Bridal Hair & Makeup", price: "$850", location: "Napa Valley", reviewCount: 12, available: true, isDemo: true },
  { id: "demo-vendor-2", name: "Sarah Jenkins", specialty: "Natural Glamour", price: "$600", location: "Sonoma", reviewCount: 8, available: false, isDemo: true },
  { id: "demo-vendor-3", name: "Marc Andre", specialty: "High Fashion Style", price: "$1,200", location: "San Francisco", reviewCount: 15, available: true, isDemo: true },
  { id: "demo-vendor-4", name: "Beauty Collective", specialty: "Large Bridal Parties", price: "$2,500", location: "Bay Area", reviewCount: 6, available: true, isDemo: true },
];

export default function BrowseArtists() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [vendors, setVendors] = useState<Vendor[]>(demoVendors);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [inquiryForm, setInquiryForm] = useState<InquiryForm>({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    eventDate: "",
    eventType: "Wedding",
    serviceType: "Bridal Hair & Makeup",
    partySize: "",
    message: "",
    budget: "",
  });

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await fetch('/api/search/artists');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const realVendors: Vendor[] = data.map((v: any) => ({
              id: v.id,
              name: v.profile?.businessName || `${v.firstName || ''} ${v.lastName || ''}`.trim() || 'Beauty Artist',
              specialty: v.profile?.specialties?.[0] || 'Beauty Services',
              price: v.profile?.priceRange || 'Contact for pricing',
              location: v.profile?.location || 'Bay Area',
              reviewCount: 0,
              available: true,
              isDemo: false,
            }));
            setVendors(realVendors.length > 0 ? realVendors : demoVendors);
          }
        }
      } catch (err) {
        console.error('Error fetching vendors:', err);
      }
      setLoadingVendors(false);
    };
    fetchVendors();
  }, []);

  const openInquiryModal = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setInquiryForm(prev => ({
      ...prev,
      serviceType: vendor.specialty,
    }));
    setShowInquiryModal(true);
  };

  const closeInquiryModal = () => {
    setShowInquiryModal(false);
    setSelectedVendor(null);
    setInquiryForm({
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      eventDate: "",
      eventType: "Wedding",
      serviceType: "Bridal Hair & Makeup",
      partySize: "",
      message: "",
      budget: "",
    });
  };

  const handleSubmitInquiry = async () => {
    if (!inquiryForm.clientName || !inquiryForm.clientEmail || !inquiryForm.eventDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in your name, email, and event date.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedVendor?.id || selectedVendor.isDemo) {
      toast({
        title: "Demo Vendor",
        description: "This is a demo profile. Please browse for real vendors to send an inquiry.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingInquiry(true);
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: selectedVendor.id,
          clientName: inquiryForm.clientName,
          clientEmail: inquiryForm.clientEmail,
          clientPhone: inquiryForm.clientPhone || undefined,
          eventDate: inquiryForm.eventDate,
          eventType: inquiryForm.eventType || undefined,
          serviceType: inquiryForm.serviceType,
          partySize: inquiryForm.partySize ? parseInt(inquiryForm.partySize) : undefined,
          message: inquiryForm.message || undefined,
          budget: inquiryForm.budget ? parseFloat(inquiryForm.budget.replace(/[^0-9.]/g, '')) : undefined,
        }),
      });

      if (res.ok) {
        toast({
          title: "Inquiry Sent!",
          description: `Your inquiry has been sent to ${selectedVendor?.name}. They'll get back to you soon!`,
        });
        closeInquiryModal();
      } else {
        const error = await res.json();
        toast({
          title: "Error",
          description: error.error || "Failed to send inquiry. Please try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to send inquiry. Please try again.",
        variant: "destructive",
      });
    }
    setSubmittingInquiry(false);
  };
  
  return (
    <div className="min-h-screen bg-powder-blue p-5 font-sans">
      <div className="mx-auto max-w-[1600px] border-[3px] border-double border-black bg-cream p-5 shadow-2xl">
        <div className="inner-border silk-texture border border-black bg-cream p-10 relative">
          {/* HEADER */}
          <div className="relative mb-10 text-center">
            <Link href="/" className="absolute top-0 right-0 text-xs text-black underline">
              ← Back to Home
            </Link>
            <HouseSketch className="mx-auto mb-4" size="small" />
            <h1 className="font-script mb-2 text-[42px] tracking-[6px] text-black">
              Browse Vendors
            </h1>
            <p className="text-[10px] font-medium uppercase tracking-[3px] text-black/60">
              Discover trusted beauty professionals
            </p>
          </div>

          <div className="text-center mb-8 text-black/20 text-lg">❦</div>

          {/* FILTERS */}
          <div className="mb-10 rounded-lg border-2 border-powder-blue bg-white p-6 shadow-sm">
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
                <input type="date" className="rounded-md border border-[#d1d5e0] bg-[#fbfcff] p-3 text-sm" placeholder="Event Date" data-testid="input-filter-date" />
                <input type="text" className="rounded-md border border-[#d1d5e0] bg-[#fbfcff] p-3 text-sm" placeholder="Location (Napa, Sonoma...)" data-testid="input-filter-location" />
                <select className="rounded-md border border-[#d1d5e0] bg-[#fbfcff] p-3 text-sm" data-testid="select-filter-service">
                    <option>All Services</option>
                    <option>Bridal Hair & Makeup</option>
                    <option>Bridal Makeup Only</option>
                    <option>Bridal Hair Only</option>
                </select>
                <select className="rounded-md border border-[#d1d5e0] bg-[#fbfcff] p-3 text-sm" data-testid="select-filter-price">
                    <option>Any Price Range</option>
                    <option>Under $500</option>
                    <option>$500 - $1,000</option>
                    <option>$1,000+</option>
                </select>
            </div>
            <div className="flex flex-wrap gap-2">
                {["Available Today", "Eco-Friendly Products", "Luxury Experience"].map(tag => (
                    <span key={tag} className="cursor-pointer rounded-2xl bg-powder-blue px-4 py-1.5 text-[13px] transition-colors hover:bg-pink" data-testid={`tag-${tag.toLowerCase().replace(/\s+/g, '-')}`}>
                        {tag}
                    </span>
                ))}
            </div>
          </div>

          {/* VENDORS GRID */}
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
            {vendors.map((vendor, i) => (
                <div key={i} className="group overflow-hidden rounded-xl border-2 border-powder-blue bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-pink hover:shadow-md" data-testid={`card-vendor-${i}`}>
                    <div className="relative gingham-check p-6 text-center">
                        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-white/90 text-3xl text-black/70">
                            {vendor.name.charAt(0)}
                        </div>
                        <h3 className="font-header text-2xl text-black">{vendor.name}</h3>
                        <div className="text-[13px] uppercase tracking-wide text-[#5f5a61]">{vendor.specialty}</div>
                    </div>
                    
                    <div className="p-6">
                        <p className="mb-5 text-sm leading-relaxed text-[#5f5a61]">
                            Specializing in timeless, elegant looks that enhance your natural beauty. Over 10 years of experience in luxury weddings.
                        </p>
                        
                        <div className="mb-5 grid grid-cols-3 gap-3">
                            <div className="rounded border border-[#e5e8f2] bg-[#fbfcff] p-3 text-center cursor-pointer hover:bg-powder-blue/30 transition-colors">
                                <div className="mb-1 flex justify-center text-pink"><MessageSquare size={14} /></div>
                                <div className="text-xs font-semibold">{vendor.reviewCount} Reviews</div>
                            </div>
                            <div className="rounded border border-[#e5e8f2] bg-[#fbfcff] p-3 text-center">
                                <div className="mb-1 flex justify-center text-black/40"><MapPin size={14} /></div>
                                <div className="text-xs font-semibold">{vendor.location}</div>
                            </div>
                            <div className="rounded border border-[#e5e8f2] bg-[#fbfcff] p-3 text-center">
                                <div className="mb-1 flex justify-center text-black/40"><DollarSign size={14} /></div>
                                <div className="text-sm font-semibold">{vendor.price}</div>
                            </div>
                        </div>

                        <div className="mb-5 grid grid-cols-3 gap-2">
                            {[1, 2, 3].map(p => (
                                <div key={p} className="aspect-square rounded bg-gradient-to-br from-powder-blue to-[#d4d7e0]"></div>
                            ))}
                        </div>

                        <div className="mb-5">
                            <div className="mb-2 text-[13px] font-semibold text-black">Availability</div>
                            <div className="flex flex-wrap gap-2">
                                <span className="rounded-md bg-[#d1fae5] px-3 py-1.5 text-xs font-semibold text-[#065f46]">Sep 12</span>
                                <span className="rounded-md bg-[#d1fae5] px-3 py-1.5 text-xs font-semibold text-[#065f46]">Sep 13</span>
                                <span className="rounded-md bg-[#fef3c7] px-3 py-1.5 text-xs font-semibold text-[#92400e]">Sep 20 (Limited)</span>
                            </div>
                        </div>

                        <button 
                            onClick={() => setLocation("/search")}
                            className="w-full rounded-md bg-black py-3 text-sm font-medium uppercase tracking-widest text-white transition-transform hover:-translate-y-0.5 hover:bg-[#3a363c]" 
                            data-testid={`button-view-profile-${i}`}
                        >
                            View Profile
                        </button>
                        <button 
                            onClick={() => openInquiryModal(vendor)}
                            className="mt-2 w-full rounded-md bg-powder-blue py-3 text-sm font-medium uppercase tracking-widest text-black transition-colors hover:bg-[#8fb5d9]" 
                            data-testid={`button-inquire-${i}`}
                        >
                            Inquire
                        </button>
                    </div>
                </div>
            ))}
          </div>

          <div className="my-8 text-center text-lg text-black/20">❦</div>
        </div>
      </div>

      {/* Inquiry Modal */}
      {showInquiryModal && selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl" data-testid="modal-inquiry">
            <button 
              onClick={closeInquiryModal}
              className="absolute right-4 top-4 text-black/50 hover:text-black"
              data-testid="button-close-inquiry"
            >
              <X size={24} />
            </button>
            
            <div className="p-6">
              <h2 className="font-header text-2xl text-black mb-1">Send an Inquiry</h2>
              <p className="text-sm text-black/60 mb-6">
                Reach out to <span className="font-semibold">{selectedVendor.name}</span> about your event
              </p>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black/80 mb-1">Your Name *</label>
                    <input
                      type="text"
                      value={inquiryForm.clientName}
                      onChange={(e) => setInquiryForm(prev => ({ ...prev, clientName: e.target.value }))}
                      className="w-full rounded-md border border-[#d1d5e0] bg-[#fbfcff] p-3 text-sm"
                      placeholder="Jane Smith"
                      data-testid="input-inquiry-name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black/80 mb-1">Email *</label>
                    <input
                      type="email"
                      value={inquiryForm.clientEmail}
                      onChange={(e) => setInquiryForm(prev => ({ ...prev, clientEmail: e.target.value }))}
                      className="w-full rounded-md border border-[#d1d5e0] bg-[#fbfcff] p-3 text-sm"
                      placeholder="jane@email.com"
                      data-testid="input-inquiry-email"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black/80 mb-1">Phone (optional)</label>
                    <input
                      type="tel"
                      value={inquiryForm.clientPhone}
                      onChange={(e) => setInquiryForm(prev => ({ ...prev, clientPhone: e.target.value }))}
                      className="w-full rounded-md border border-[#d1d5e0] bg-[#fbfcff] p-3 text-sm"
                      placeholder="(555) 123-4567"
                      data-testid="input-inquiry-phone"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black/80 mb-1">Event Date *</label>
                    <input
                      type="date"
                      value={inquiryForm.eventDate}
                      onChange={(e) => setInquiryForm(prev => ({ ...prev, eventDate: e.target.value }))}
                      className="w-full rounded-md border border-[#d1d5e0] bg-[#fbfcff] p-3 text-sm"
                      data-testid="input-inquiry-date"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black/80 mb-1">Event Type</label>
                    <select
                      value={inquiryForm.eventType}
                      onChange={(e) => setInquiryForm(prev => ({ ...prev, eventType: e.target.value }))}
                      className="w-full rounded-md border border-[#d1d5e0] bg-[#fbfcff] p-3 text-sm"
                      data-testid="select-inquiry-event-type"
                    >
                      <option value="Wedding">Wedding</option>
                      <option value="Engagement">Engagement</option>
                      <option value="Bridal Shower">Bridal Shower</option>
                      <option value="Photo Shoot">Photo Shoot</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black/80 mb-1">Service</label>
                    <select
                      value={inquiryForm.serviceType}
                      onChange={(e) => setInquiryForm(prev => ({ ...prev, serviceType: e.target.value }))}
                      className="w-full rounded-md border border-[#d1d5e0] bg-[#fbfcff] p-3 text-sm"
                      data-testid="select-inquiry-service"
                    >
                      <option value="Bridal Hair & Makeup">Bridal Hair & Makeup</option>
                      <option value="Bridal Makeup Only">Bridal Makeup Only</option>
                      <option value="Bridal Hair Only">Bridal Hair Only</option>
                      <option value="Bridal Party">Bridal Party</option>
                      <option value="Natural Glamour">Natural Glamour</option>
                      <option value="High Fashion Style">High Fashion Style</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black/80 mb-1">Party Size (optional)</label>
                    <input
                      type="number"
                      min="1"
                      value={inquiryForm.partySize}
                      onChange={(e) => setInquiryForm(prev => ({ ...prev, partySize: e.target.value }))}
                      className="w-full rounded-md border border-[#d1d5e0] bg-[#fbfcff] p-3 text-sm"
                      placeholder="e.g. 5"
                      data-testid="input-inquiry-party-size"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black/80 mb-1">Budget (optional)</label>
                    <input
                      type="text"
                      value={inquiryForm.budget}
                      onChange={(e) => setInquiryForm(prev => ({ ...prev, budget: e.target.value }))}
                      className="w-full rounded-md border border-[#d1d5e0] bg-[#fbfcff] p-3 text-sm"
                      placeholder="$500 - $1000"
                      data-testid="input-inquiry-budget"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-black/80 mb-1">Message (optional)</label>
                  <textarea
                    value={inquiryForm.message}
                    onChange={(e) => setInquiryForm(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full rounded-md border border-[#d1d5e0] bg-[#fbfcff] p-3 text-sm min-h-[100px]"
                    placeholder="Tell us about your event, any special requests, or questions..."
                    data-testid="textarea-inquiry-message"
                  />
                </div>
                
                <button
                  onClick={handleSubmitInquiry}
                  disabled={submittingInquiry}
                  className="w-full flex items-center justify-center gap-2 rounded-md bg-black py-3 text-sm font-medium uppercase tracking-widest text-white transition-all hover:bg-[#3a363c] disabled:opacity-50"
                  data-testid="button-submit-inquiry"
                >
                  {submittingInquiry ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Send Inquiry
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
