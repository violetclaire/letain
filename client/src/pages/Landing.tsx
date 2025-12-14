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
    <div className="min-h-screen overflow-y-auto overflow-x-hidden bg-[#FCF9F4] font-sans">

      <AnimatePresence>
        {!isOpen && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
            onClick={openElevator}
            exit={{ opacity: 0, pointerEvents: "none" }}
            transition={{ duration: 0.5, delay: 1 }}
          >
            <motion.div
              className="absolute left-0 top-0 w-1/2 h-full border-r border-[#5A1F2B]/20 overflow-hidden gingham-check"
              initial={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            />

            <motion.div
              className="absolute right-0 top-0 w-1/2 h-full border-l border-[#5A1F2B]/20 overflow-hidden gingham-check"
              initial={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            />

            <motion.div 
              className="relative z-10 flex flex-col items-center justify-center text-center pointer-events-none"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-[#FCF9F4] p-1 border border-[#5A1F2B]">
                <div className="border border-[#5A1F2B] px-16 py-10">
                  <h1 className="font-script text-5xl text-[#5A1F2B]">
                    Beauvette
                  </h1>
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
        <header className="w-full px-6 py-4 flex items-center justify-between border-b border-[#5A1F2B]/30 bg-[#FCF9F4]">
          <h1 className="font-script text-2xl text-[#5A1F2B]">Beauvette</h1>
          <button
            onClick={() => setLocation("/login")}
            className="text-sm px-4 py-2 text-[#5A1F2B]/70 hover:text-[#5A1F2B] transition-colors"
            data-testid="button-sign-in"
          >
            Sign in
          </button>
        </header>

        <main className="px-4 py-16 max-w-lg mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-script text-6xl md:text-7xl text-[#5A1F2B] mb-4">
              Beauvette
            </h2>
            <p className="font-elegant text-2xl md:text-3xl text-[#5A1F2B] mb-2">
              Are you available?
            </p>
            <p className="font-elegant text-xl text-[#5A1F2B]/70 italic mb-6">
              If not, who do you trust?
            </p>
            <p className="font-elegant text-base text-[#5A1F2B]/60 tracking-wide leading-relaxed">
              Beauvette is an operational assistant that manages availability and inquiries based on how you work.
            </p>
          </div>

          <div className="space-y-6">
            <div className="border border-[#5A1F2B] p-1">
              <div className="border border-[#FCF9F4] p-1">
                <div className="border border-[#5A1F2B] p-6 text-center bg-[#FCF9F4]">
                  <div className="w-full bg-[#5A1F2B] p-1 mb-4">
                    <button
                      onClick={() => setLocation("/onboarding")}
                      className="w-full px-6 py-3 text-base font-medium bg-[#5A1F2B] text-[#FCF9F4] border border-[#FCF9F4]/40 hover:bg-[#4a1923] transition-colors tracking-wide"
                      data-testid="button-artist-cta"
                    >
                      Set up your availability calendar, link it in your bio
                    </button>
                  </div>
                  <p className="text-sm text-[#5A1F2B]/70 leading-relaxed mb-3">
                    Think of Beauvette as your personal secretary. It's trained on your responsiveness and communication style. It handles availability, sends pricing when appropriate, and reduces coordination while you remain fully in control.
                  </p>
                  <p className="text-sm text-[#5A1F2B]/80 font-medium">
                    Welcome to Beauvette, the first platform built for artists and their clients.
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-[#5A1F2B] p-1">
              <div className="border border-[#FCF9F4] p-1">
                <div className="border border-[#5A1F2B] p-6 text-center bg-[#FCF9F4]">
                  <button
                    onClick={() => setLocation("/waitlist")}
                    className="w-full px-8 py-4 text-base font-medium bg-transparent text-[#5A1F2B] border border-[#5A1F2B]/50 hover:bg-[#FCF9F4] transition-colors tracking-wide mb-3"
                    data-testid="button-client-waitlist"
                  >
                    Join the Client Waitlist
                  </button>
                  <p className="text-xs text-[#5A1F2B]/60 leading-relaxed">
                    We'll notify you as artists become available in your area.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="w-full px-6 py-6 mt-8 border-t border-[#5A1F2B]/20 text-center bg-[#FCF9F4]">
          <p className="text-xs text-[#5A1F2B]/50 mb-4">
            © 2025 Beauvette. For life's most important days.
          </p>
          <button
            onClick={() => setLocation("/login")}
            className="text-xs text-[#5A1F2B]/50 hover:text-[#5A1F2B] transition-colors"
          >
            Already using Beauvette? Sign in
          </button>
        </footer>
      </motion.div>
    </div>
  );
}
