import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

export default function Landing() {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();

  const openElevator = () => {
    setIsOpen(true);
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

        <main className="px-4 py-12 max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-header text-2xl md:text-3xl ink-main mb-4">
              Share your availability.
            </h2>
            <p className="text-lg ink-soft mb-2">
              Stop answering "are you available?" emails.
            </p>
          </div>

          <div className="bg-cream rounded-2xl shadow-xl p-8 border-2 border-[#c5ccd8] text-center">
            <p className="text-sm ink-soft mb-6">
              Create your public calendar in 2 minutes. Share it in your Instagram bio.
              Clients can see your availability and reach out instantly.
            </p>
            
            <button
              onClick={() => setLocation("/onboarding")}
              className="px-8 py-4 rounded-xl text-lg font-medium bg-pink text-white hover:bg-pink/90 transition-colors shadow-lg"
              data-testid="button-create-calendar"
            >
              Create My Calendar
            </button>
            
            <div className="mt-8 pt-6 border-t border-[#c5ccd8]">
              <p className="text-xs ink-soft mb-4">
                Looking for an artist? Browse calendars below:
              </p>
              <button
                onClick={() => setLocation("/analytics")}
                className="text-sm text-gold hover:underline"
                data-testid="button-browse-artists"
              >
                View Top Responsive Artists
              </button>
            </div>
          </div>
        </main>

        <footer className="w-full px-6 py-6 mt-8 border-t border-[#c5ccd8] text-center bg-cream">
          <p className="text-xs ink-soft mb-4">
            © 2025 Beauvette. For life's most important days.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setLocation("/login")}
              className="text-xs ink-soft hover:ink-main transition-colors"
            >
              Already using Beauvette? Sign in
            </button>
            <span className="text-gold">|</span>
            <button
              onClick={() => setLocation("/analytics")}
              className="text-xs ink-soft hover:ink-main transition-colors"
            >
              Leaderboard
            </button>
          </div>
        </footer>
      </motion.div>
    </div>
  );
}
