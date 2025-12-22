import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-powder-blue font-sans flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md"
      >
        <div className="bg-cream p-6 rounded-sm shadow-lg border border-black/20">
          <div className="border-2 border-powder-blue/40 p-6">
            <div className="flex flex-col items-center text-center">
              
              {/* Gingham Envelope */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
                className="mb-6"
              >
                <svg
                  width="180"
                  height="140"
                  viewBox="0 0 180 140"
                  className="drop-shadow-lg"
                >
                  {/* Gingham Pattern Definition */}
                  <defs>
                    <pattern
                      id="gingham"
                      width="20"
                      height="20"
                      patternUnits="userSpaceOnUse"
                    >
                      {/* Base - cream */}
                      <rect width="20" height="20" fill="#F5F1E8" />
                      {/* Vertical stripe - powder blue */}
                      <rect x="0" y="0" width="10" height="20" fill="#A7C7E7" opacity="0.6" />
                      {/* Horizontal stripe - powder blue */}
                      <rect x="0" y="0" width="20" height="10" fill="#A7C7E7" opacity="0.6" />
                      {/* Overlap creates darker square */}
                      <rect x="0" y="0" width="10" height="10" fill="#A7C7E7" opacity="0.8" />
                    </pattern>
                    
                    {/* Shadow filter */}
                    <filter id="envelope-shadow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.15" />
                    </filter>
                  </defs>
                  
                  {/* Envelope Body */}
                  <g filter="url(#envelope-shadow)">
                    {/* Back of envelope */}
                    <rect
                      x="10"
                      y="30"
                      width="160"
                      height="100"
                      rx="4"
                      fill="url(#gingham)"
                      stroke="#262329"
                      strokeWidth="1.5"
                    />
                    
                    {/* Envelope flap (triangular top) */}
                    <path
                      d="M10 34 L90 85 L170 34 L170 30 C170 28 168 26 166 26 L14 26 C12 26 10 28 10 30 Z"
                      fill="url(#gingham)"
                      stroke="#262329"
                      strokeWidth="1.5"
                    />
                    
                    {/* Inner flap line for depth */}
                    <path
                      d="M15 32 L90 80 L165 32"
                      fill="none"
                      stroke="#262329"
                      strokeWidth="0.5"
                      opacity="0.3"
                    />
                    
                    {/* Gold seal/heart at center of flap */}
                    <circle
                      cx="90"
                      cy="75"
                      r="12"
                      fill="#C9A961"
                      stroke="#262329"
                      strokeWidth="1"
                    />
                    
                    {/* Heart inside seal */}
                    <path
                      d="M90 80 C85 75 82 72 82 69.5 C82 67 84 65 86.5 65 C88 65 89.5 66 90 67.5 C90.5 66 92 65 93.5 65 C96 65 98 67 98 69.5 C98 72 95 75 90 80 Z"
                      fill="#F5F1E8"
                    />
                  </g>
                </svg>
              </motion.div>

              {/* Thank You Text */}
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="font-script text-5xl text-black mb-3"
              >
                Thank You
              </motion.h1>

              {/* Confirmation Message */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="space-y-3"
              >
                <p className="text-sm text-black/80 leading-relaxed">
                  Your payment has been received successfully.
                </p>
                
                <div className="border-t border-powder-blue/40 pt-4 mt-4">
                  <p className="text-xs text-black/60 uppercase tracking-wider">
                    A confirmation has been sent to your email
                  </p>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1, duration: 0.5 }}
                  className="pt-4"
                >
                  <Button
                    onClick={() => setLocation("/")}
                    className="bg-powder-blue hover:bg-powder-blue/90 text-black border border-black/20"
                    data-testid="button-go-home"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Return Home
                  </Button>
                </motion.div>
              </motion.div>

              {/* Footer tagline */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.5 }}
                className="text-[0.65rem] uppercase tracking-[0.15em] text-black/50 mt-6 pt-4 border-t border-powder-blue/30"
              >
                Beauvette | Your Private Secretary
              </motion.p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
