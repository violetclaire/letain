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
    <div className="min-h-screen overflow-y-auto overflow-x-hidden bg-[#FAF9F7] font-sans">

      <AnimatePresence>
        {!isOpen && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
            onClick={openElevator}
            exit={{ opacity: 0, pointerEvents: "none" }}
            transition={{ duration: 0.5, delay: 1 }}
          >
            <motion.div
              className="absolute left-0 top-0 w-1/2 h-full border-r border-[#2C2C2C]/20 overflow-hidden gingham-check"
              initial={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            />

            <motion.div
              className="absolute right-0 top-0 w-1/2 h-full border-l border-[#2C2C2C]/20 overflow-hidden gingham-check"
              initial={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            />

            <motion.div 
              className="relative z-10 flex flex-col items-center justify-center text-center pointer-events-none"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-[#FFFEF9] p-1 border border-[#2C2C2C]">
                <div className="border border-[#2C2C2C] px-16 py-10">
                  <h1 className="font-script text-5xl text-[#2C2C2C] mb-4">
                    Beauvette
                  </h1>
                  <p className="text-[0.6rem] uppercase tracking-[0.2em] text-[#666] font-normal max-w-[260px] leading-relaxed border-t border-[#2C2C2C]/30 pt-4 mt-2 mx-auto">
                    We answer the question: are you available for my date?
                  </p>
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
        <header className="w-full px-6 py-4 flex items-center justify-between border-b border-[#2C2C2C] bg-[#FFFEF9]">
          <h1 className="font-script text-2xl text-[#2C2C2C]">Beauvette</h1>
          <button
            onClick={() => setLocation("/login")}
            className="text-sm px-4 py-2 text-[#666] hover:text-[#2C2C2C] transition-colors"
            data-testid="button-sign-in"
          >
            Sign in
          </button>
        </header>

        <main className="px-4 py-16 max-w-lg mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-script text-6xl md:text-7xl text-[#2C2C2C] mb-6">
              Beauvette
            </h2>
            <p className="text-xl text-[#2C2C2C] mb-2">
              Are you available?
            </p>
            <p className="text-lg text-[#666] italic mb-2">
              Wonderful. Let's talk.
            </p>
            <p className="text-lg text-[#666] italic mb-6">
              If not, who do you trust?
            </p>
            <p className="text-sm text-[#666] tracking-wide">
              For life's most important days, the details matter.
            </p>
          </div>

          <div className="bg-[#FFFEF9] p-1 border border-[#2C2C2C]">
            <div className="border border-[#2C2C2C] p-8 text-center">
              <button
                onClick={() => setLocation("/onboarding")}
                className="px-10 py-4 text-base font-medium bg-[#FAF9F7] text-[#2C2C2C] border border-[#2C2C2C] hover:bg-[#f0efe9] transition-colors tracking-wide"
                data-testid="button-create-calendar"
              >
                Join Beauvette
              </button>
            </div>
          </div>
        </main>

        <footer className="w-full px-6 py-6 mt-8 border-t border-[#2C2C2C] text-center bg-[#FFFEF9]">
          <p className="text-xs text-[#666] mb-4">
            © 2025 Beauvette. For life's most important days.
          </p>
          <button
            onClick={() => setLocation("/login")}
            className="text-xs text-[#666] hover:text-[#2C2C2C] transition-colors"
          >
            Already using Beauvette? Sign in
          </button>
        </footer>
      </motion.div>
    </div>
  );
}
