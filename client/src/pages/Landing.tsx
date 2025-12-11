import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import AIOnboardingChat from "../components/AIOnboardingChat";
import VintageCalendar from "../components/VintageCalendar";

export default function Landing() {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const [bookedDates, setBookedDates] = useState<Date[]>([]);

  const openElevator = () => {
    setIsOpen(true);
  };

  const handleDatesMentioned = (dates: Date[]) => {
    setBookedDates(prev => {
      const combined = [...prev, ...dates];
      const unique = combined.filter((date, index, self) => 
        self.findIndex(d => d.getTime() === date.getTime()) === index
      );
      return unique.sort((a, b) => a.getTime() - b.getTime());
    });
  };

  return (
    <div className="min-h-screen overflow-y-auto overflow-x-hidden bg-powder-blue font-sans">

      <AnimatePresence>
        {!isOpen && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
            onClick={openElevator}
            exit={{ opacity: 0, pointerEvents: "none" }}
            transition={{ duration: 0.5, delay: 1 }}
          >
            <motion.div
              className="absolute left-0 top-0 w-1/2 h-full border-r border-black/20 overflow-hidden gingham-check"
              initial={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 h-1 bg-cream/80" />
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-cream/80" />
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-cream/80" />
                <div className="absolute top-0 right-0 bottom-0 w-1 bg-cream/80" />
              </div>
            </motion.div>

            <motion.div
              className="absolute right-0 top-0 w-1/2 h-full border-l border-black/20 overflow-hidden gingham-check"
              initial={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 h-1 bg-cream/80" />
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-cream/80" />
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-cream/80" />
                <div className="absolute top-0 right-0 bottom-0 w-1 bg-cream/80" />
              </div>
            </motion.div>

            <motion.div 
              className="relative z-10 flex flex-col items-center justify-center text-center pointer-events-none"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-cream p-3 rounded-sm shadow-xl">
                <div className="border-[3px] border-powder-blue/40 p-1">
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
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        className={`min-h-screen transition-opacity duration-1000 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={{ delay: 0.8, duration: 0.8 }}
      >
        <header className="w-full px-6 py-4 flex items-center justify-between border-b border-[#c5ccd8] bg-cream">
          <h1 className="font-script text-2xl ink-main">Beauvette</h1>
          <button
            onClick={() => setLocation("/login")}
            className="text-sm px-4 py-2 rounded-lg ink-soft hover:ink-main hover:bg-powder-blue/50 transition-colors"
            data-testid="button-sign-in"
          >
            Sign in
          </button>
        </header>

        <main className="px-4 py-8 max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-script text-4xl md:text-5xl ink-main mb-3">Beauvette</h2>
            <p className="text-lg ink-soft mb-2">
              The first concierge for beauty artists and clients
            </p>
            <p className="text-sm italic text-gold">
              We answer the #1 question: "Are you available for my date?"
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="order-1 lg:order-1">
              <AIOnboardingChat onDatesMentioned={handleDatesMentioned} />
            </div>

            <div className="order-2 lg:order-2">
              <VintageCalendar 
                bookedDates={bookedDates}
                onDatesChange={setBookedDates}
                minYear={2026}
                maxYear={2027}
              />
              
              <div className="mt-4 p-4 rounded-lg text-center bg-cream border border-[#c5ccd8]">
                <p className="text-sm mb-3 ink-main">
                  Tap dates on the calendar to mark your availability
                </p>
                <p className="text-xs ink-soft">
                  Or tell the assistant about your event dates
                </p>
              </div>
            </div>
          </div>
        </main>

        <footer className="w-full px-6 py-6 mt-8 border-t border-[#c5ccd8] text-center bg-cream">
          <p className="text-sm mb-4 ink-soft">
            Are you a beauty artist or vendor?
          </p>
          <button
            onClick={() => setLocation("/register?role=artist")}
            className="px-6 py-3 rounded-lg text-sm font-medium bg-pink text-white hover:bg-pink/90 transition-colors"
            data-testid="button-vendor-create-account"
          >
            Create Vendor Account
          </button>
          
          <div className="mt-6 flex items-center justify-center gap-6">
            <button
              onClick={() => setLocation("/register?role=client")}
              className="text-xs ink-soft hover:ink-main transition-colors"
              data-testid="button-client-register"
            >
              Client Registration
            </button>
            <span className="text-gold">|</span>
            <button
              onClick={() => setLocation("/register?role=planner")}
              className="text-xs ink-soft hover:ink-main transition-colors"
              data-testid="button-planner-register"
            >
              Planner Registration
            </button>
            <span className="text-gold">|</span>
            <button
              onClick={() => setLocation("/admin")}
              className="text-xs ink-soft hover:ink-main transition-colors"
              data-testid="button-admin-login"
            >
              Admin
            </button>
          </div>
          
          <p className="mt-6 text-xs ink-soft">
            © 2025 Beauvette. For life's most important days.
          </p>
        </footer>
      </motion.div>
    </div>
  );
}
