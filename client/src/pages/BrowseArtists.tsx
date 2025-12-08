import { HouseSketch } from "../components/HouseSketch";
import { Link, useLocation } from "wouter";
import { Calendar, MapPin, DollarSign, MessageSquare } from "lucide-react";

export default function BrowseArtists() {
  const [, setLocation] = useLocation();
  
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
            {[
                { name: "Elena Rossi", specialty: "Bridal Hair & Makeup", price: "$850", location: "Napa Valley", reviewCount: 12, available: true },
                { name: "Sarah Jenkins", specialty: "Natural Glamour", price: "$600", location: "Sonoma", reviewCount: 8, available: false },
                { name: "Marc Andre", specialty: "High Fashion Style", price: "$1,200", location: "San Francisco", reviewCount: 15, available: true },
                { name: "Beauty Collective", specialty: "Large Bridal Parties", price: "$2,500", location: "Bay Area", reviewCount: 6, available: true },
            ].map((vendor, i) => (
                <div key={i} className="group overflow-hidden rounded-xl border-2 border-powder-blue bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-pink hover:shadow-md" data-testid={`card-vendor-${i}`}>
                    <div className="relative bg-gradient-to-br from-powder-blue to-[#8fb5d9] p-6 text-center">
                        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-gold to-[#E8D5C4] text-3xl">
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
                            onClick={() => setLocation("/search")}
                            className="mt-2 w-full rounded-md bg-powder-blue py-3 text-sm font-medium uppercase tracking-widest text-black transition-colors hover:bg-[#8fb5d9]" 
                            data-testid={`button-message-${i}`}
                        >
                            Message
                        </button>
                    </div>
                </div>
            ))}
          </div>

          <div className="my-8 text-center text-lg text-black/20">❦</div>
        </div>
      </div>
    </div>
  );
}
