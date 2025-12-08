import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, Upload, Search } from "lucide-react";
import VoiceDictation from "../components/VoiceDictation";

export default function Landing() {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const [searchDate, setSearchDate] = useState("");
  const [searchLocation, setSearchLocation] = useState("");

  const openElevator = () => {
    setIsOpen(true);
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchLocation) params.append("location", searchLocation);
    if (searchDate) params.append("eventDate", searchDate);
    setLocation(`/search?${params.toString()}`);
  };

  const handleVoiceSearch = (transcript: string) => {
    setSearchLocation(prev => prev ? prev + " " + transcript : transcript);
  };

  return (
    <div className="min-h-screen overflow-y-auto overflow-x-hidden bg-powder-blue font-sans flex items-center justify-center p-4">
      {/* ELEVATOR DOOR CONTAINER */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
            onClick={openElevator}
            exit={{ opacity: 0, pointerEvents: "none" }}
            transition={{ duration: 0.5, delay: 1 }}
          >
            {/* Left Elevator Panel */}
            <motion.div
              className="absolute left-0 top-0 w-1/2 h-full border-r border-black/20 overflow-hidden gingham-check"
              initial={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Subtle border frame */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 h-1 bg-cream/80" />
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-cream/80" />
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-cream/80" />
                <div className="absolute top-0 right-0 bottom-0 w-1 bg-cream/80" />
              </div>
            </motion.div>

            {/* Right Elevator Panel */}
            <motion.div
              className="absolute right-0 top-0 w-1/2 h-full border-l border-black/20 overflow-hidden gingham-check"
              initial={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Subtle border frame */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 h-1 bg-cream/80" />
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-cream/80" />
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-cream/80" />
                <div className="absolute top-0 right-0 bottom-0 w-1 bg-cream/80" />
              </div>
            </motion.div>

            {/* Center Content (on top of panels) */}
            <motion.div 
              className="relative z-10 flex flex-col items-center justify-center text-center pointer-events-none"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Outer cream frame */}
              <div className="bg-cream p-3 rounded-sm shadow-xl">
                {/* Inner decorative border */}
                <div className="border-[3px] border-powder-blue/40 p-1">
                  {/* Main content box - blue background, wider rectangle */}
                  <div className="bg-powder-blue px-20 py-8 border-2 border-cream/60">
                    <h1 className="font-script text-6xl text-black drop-shadow-sm mb-4">
                      Beauvette
                    </h1>

                    <p className="text-[0.55rem] uppercase tracking-[0.15em] text-black font-medium max-w-[280px] leading-relaxed border-t border-black/20 pt-4 mt-2 mx-auto">
                      The First Platform for Vendors <em className="italic">and</em> Clients
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Elevator door frame */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 right-0 h-4 bg-black/10" />
              <div className="absolute bottom-0 left-0 right-0 h-4 bg-black/10" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT (revealed after elevator opens) */}
      <motion.div 
        className={`w-full max-w-3xl transition-opacity duration-1000 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: isOpen ? 1 : 0, y: isOpen ? 0 : 20 }}
        transition={{ delay: 0.8, duration: 0.8 }}
      >
        {/* Cream Mat Border - like a picture frame */}
        <div className="bg-cream p-4 rounded-sm shadow-lg border border-black/20">
          <div className="frame-outer shadow-sm w-full border border-black/30">
            <div className="frame-inner relative flex flex-col items-center">
            
            {/* HEADER */}
            <header className="text-center mb-6 relative w-full">
              <p className="text-[0.65rem] uppercase tracking-[0.2em] ink-soft font-medium mb-2">
                Welcome to the World of
              </p>
              <h1 className="font-script text-5xl ink-main relative z-10 mb-2">
                Beauvette
              </h1>
              <p className="text-xs uppercase tracking-[0.18em] ink-soft relative z-10">
                For Life's Most Important Days
              </p>
            </header>

            {/* 1. SEARCH SECTION (Primary) */}
            <div className="w-full max-w-2xl mb-10 relative z-10">
              <div className="card-frame rounded-md px-6 py-6 bg-white/50">
                <h2 className="font-header text-lg ink-main mb-4 text-center">Start Your Search</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Date */}
                  <div className="space-y-1">
                    <label className="text-[0.65rem] uppercase tracking-wide ink-soft flex items-center gap-1">
                      <Calendar size={10} /> Event Date
                    </label>
                    <input 
                      type="date" 
                      value={searchDate}
                      onChange={(e) => setSearchDate(e.target.value)}
                      className="w-full border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-black"
                      data-testid="input-event-date"
                    />
                  </div>

                  {/* Location with Voice */}
                  <div className="space-y-1">
                     <label className="text-[0.65rem] uppercase tracking-wide ink-soft flex items-center gap-1">
                      <MapPin size={10} /> Location
                    </label>
                    <div className="flex gap-1">
                      <input 
                        type="text" 
                        placeholder="City, Venue, or Zip" 
                        value={searchLocation}
                        onChange={(e) => setSearchLocation(e.target.value)}
                        className="flex-1 border border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-black"
                        data-testid="input-location"
                      />
                      <div className="flex flex-col items-center">
                        <VoiceDictation onTranscript={handleVoiceSearch} />
                        <span className="text-[0.5rem] text-gray-400 mt-0.5">Voice</span>
                      </div>
                    </div>
                  </div>

                  {/* Upload */}
                  <div className="space-y-1">
                     <label className="text-[0.65rem] uppercase tracking-wide ink-soft flex items-center gap-1">
                      <Upload size={10} /> Inspiration
                    </label>
                    <div className="w-full border border-dashed border-[#c5ccd8] bg-[#fbfcff] rounded px-3 py-1.5 text-xs text-gray-400 cursor-pointer hover:border-black hover:text-black transition-colors flex items-center justify-center h-[34px]" data-testid="button-upload-photos">
                      Upload Photos
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleSearch}
                  className="w-full bg-black text-white text-xs uppercase tracking-widest py-3 rounded hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                  data-testid="button-search-vendors"
                >
                  <Search size={14} /> Search Vendors
                </button>
              </div>
            </div>

            {/* 2. PERSONAS - Create Account */}
            <div className="w-full max-w-2xl mb-8 relative z-10">
              <p className="text-center text-[0.65rem] uppercase tracking-widest ink-soft mb-3">— Create Your Account —</p>
              <div className="grid grid-cols-3 gap-3">
                <div 
                  onClick={() => setLocation("/register?role=client")}
                  className="card-frame rounded-md p-3 text-center cursor-pointer hover:border-black hover:shadow-sm transition group"
                  data-testid="button-client-register"
                >
                  <h3 className="font-header text-sm ink-main group-hover:text-black">Client</h3>
                  <p className="text-[0.6rem] ink-soft mt-1">Request Services</p>
                </div>

                <div 
                  onClick={() => setLocation("/register?role=artist")}
                  className="card-frame rounded-md p-3 text-center cursor-pointer hover:border-black hover:shadow-sm transition group"
                  data-testid="button-artist-register"
                >
                  <h3 className="font-header text-sm ink-main group-hover:text-black">Vendor</h3>
                  <p className="text-[0.6rem] ink-soft mt-1">Offer your Services</p>
                </div>

                <div 
                  onClick={() => setLocation("/register?role=planner")}
                  className="card-frame rounded-md p-3 text-center cursor-pointer hover:border-black hover:shadow-sm transition group"
                  data-testid="button-planner-register"
                >
                  <h3 className="font-header text-sm ink-main group-hover:text-black">Planner</h3>
                  <p className="text-[0.6rem] ink-soft mt-1">Coordinate Events</p>
                </div>
              </div>
              
              <p className="text-center text-[0.6rem] ink-soft mt-4">
                Already have an account?{" "}
                <a href="/login" className="underline hover:text-black transition-colors">
                  Log in here
                </a>
              </p>
            </div>

            {/* 3. ADMIN LINK (Footer) */}
            <div className="mt-auto pt-4 relative z-10">
              <button 
                onClick={() => setLocation("/admin")}
                className="text-[0.6rem] uppercase tracking-widest text-gray-400 hover:text-[#dc2626] transition-colors border-b border-transparent hover:border-[#dc2626]"
                data-testid="button-admin-login"
              >
                Admin Console
              </button>
            </div>

            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
