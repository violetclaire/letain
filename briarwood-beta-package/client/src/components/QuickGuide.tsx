import { useState, useEffect, type ReactNode } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface GuideStep {
  title: string;
  description: string;
  icon?: ReactNode;
}

interface QuickGuideProps {
  guideId: string;
  title: string;
  steps: GuideStep[];
  onComplete?: () => void;
}

const GUIDE_STORAGE_KEY = "beauvette_guides_seen";

function getSeenGuides(): string[] {
  try {
    const stored = localStorage.getItem(GUIDE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function markGuideSeen(guideId: string) {
  try {
    const seen = getSeenGuides();
    if (!seen.includes(guideId)) {
      seen.push(guideId);
      localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(seen));
    }
  } catch {
    // Ignore storage errors
  }
}

function hasSeenGuide(guideId: string): boolean {
  return getSeenGuides().includes(guideId);
}

function resetGuide(guideId: string) {
  try {
    const seen = getSeenGuides().filter(id => id !== guideId);
    localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(seen));
  } catch {
    // Ignore storage errors
  }
}

export default function QuickGuide({ guideId, title, steps, onComplete }: QuickGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!hasSeenGuide(guideId)) {
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [guideId]);

  const handleClose = () => {
    setIsOpen(false);
    markGuideSeen(guideId);
    onComplete?.();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.85)" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-md bg-[#1A1A1A] border border-[#333] overflow-hidden"
          data-testid="quick-guide-modal"
        >
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-[#666] hover:text-[#F5F0E8] transition-colors"
            data-testid="quick-guide-close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="p-6 pb-4 border-b border-[#333]">
            <p className="text-xs uppercase tracking-widest text-[#C4A35A] mb-2">Quick Guide</p>
            <h2 className="text-xl font-serif text-[#F5F0E8]">{title}</h2>
          </div>

          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {step.icon && (
                  <div className="w-12 h-12 rounded-full bg-[#C4A35A]/10 flex items-center justify-center mb-4 text-[#C4A35A]">
                    {step.icon}
                  </div>
                )}
                <h3 className="text-lg text-[#F5F0E8] mb-2 font-medium">{step.title}</h3>
                <p className="text-[#888] leading-relaxed">{step.description}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between p-6 pt-4 border-t border-[#333]">
            <div className="flex gap-1.5">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === currentStep ? "bg-[#C4A35A]" : "bg-[#444]"
                  }`}
                  data-testid={`quick-guide-dot-${idx}`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-[#888] hover:text-[#F5F0E8] transition-colors"
                  data-testid="quick-guide-prev"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-2 bg-[#C4A35A] text-[#1A1A1A] text-sm font-medium hover:bg-[#D4B36A] transition-colors"
                data-testid="quick-guide-next"
              >
                {isLastStep ? "Got it" : "Next"}
                {!isLastStep && <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
