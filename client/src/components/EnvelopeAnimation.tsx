import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface EnvelopeAnimationProps {
  children: React.ReactNode;
  recipientName?: string;
}

export default function EnvelopeAnimation({ children, recipientName }: EnvelopeAnimationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => setIsOpen(true), 800);
    const timer2 = setTimeout(() => setShowContent(true), 1800);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#A7C7E7] flex items-center justify-center p-4 overflow-hidden">
      <AnimatePresence mode="wait">
        {!showContent ? (
          <motion.div
            key="envelope"
            className="relative"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0, y: -50 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative w-[340px] sm:w-[400px] h-[240px] sm:h-[280px]">
              {/* Envelope Body - Cream outside */}
              <div className="absolute inset-0 bg-[#F5F1E8] rounded-lg shadow-xl border border-[#C9A961]/30">
                {/* Inner blue color (visible inside) */}
                <div className="absolute inset-2 rounded overflow-hidden bg-[#A7C7E7]" />
                
                {/* Decorative gold border */}
                <div className="absolute inset-3 border border-[#C9A961]/30 rounded" />
              </div>

              {/* Envelope Flap (Top Triangle) - Cream outside, blue inside */}
              <motion.div
                className="absolute top-0 left-0 right-0 origin-top"
                style={{ 
                  perspective: "1000px",
                  transformStyle: "preserve-3d"
                }}
                animate={isOpen ? { rotateX: 180 } : { rotateX: 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              >
                {/* Front of flap (cream) */}
                <div 
                  className="w-full h-[140px] sm:h-[160px] bg-[#F5F1E8] shadow-md relative"
                  style={{
                    clipPath: "polygon(0 0, 50% 100%, 100% 0)",
                    borderTopLeftRadius: "8px",
                    borderTopRightRadius: "8px",
                    backfaceVisibility: "hidden",
                  }}
                >
                  {/* Gold edge on flap */}
                  <div 
                    className="absolute top-2 left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-[#C9A961]/60 to-transparent"
                  />
                </div>
                {/* Back of flap (blue - visible when open) */}
                <div 
                  className="absolute top-0 left-0 w-full h-[140px] sm:h-[160px] bg-[#A7C7E7]"
                  style={{
                    clipPath: "polygon(0 0, 50% 100%, 100% 0)",
                    transform: "rotateX(180deg)",
                    backfaceVisibility: "hidden",
                  }}
                />
              </motion.div>

              {/* Card peeking out - sharp corners with double frame */}
              <motion.div
                className="absolute left-1/2 -translate-x-1/2 top-12 w-[300px] sm:w-[360px] bg-white shadow-md p-1 text-center border border-[#C9A961]/40"
                initial={{ y: 0 }}
                animate={isOpen ? { y: -80 } : { y: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              >
                {/* Inner frame */}
                <div className="border border-[#C9A961]/30 p-5">
                  {recipientName && (
                    <p className="text-lg text-[#262329]/70" style={{ fontFamily: "'Pinyon Script', 'Dancing Script', cursive" }}>
                      for {recipientName}
                    </p>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Tap to open hint */}
            <motion.p
              className="text-center mt-6 text-sm text-white/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: isOpen ? 0 : 1 }}
              transition={{ delay: 1.5 }}
            >
              Opening your invitation...
            </motion.p>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-lg"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
