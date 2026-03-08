import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="estate-pinstripe" />
      <div className="max-w-[680px] mx-auto px-6 py-16 md:py-24">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-faintink hover:text-ink mb-12 transition-colors text-sm"
          data-testid="button-back-home"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <p className="text-xs tracking-[0.16em] uppercase text-faintink mb-8">Privacy</p>

          <div className="space-y-6 text-mutedink leading-relaxed">
            <h2 className="font-serif text-2xl sm:text-3xl tracking-tight text-ink leading-snug">
              What you have built over decades belongs to you.
            </h2>

            <p>
              The way you handle a difficult client. The judgment call that kept a job from falling apart. The recovery behavior that nobody saw but you. The referral you made because you knew exactly who to trust.
            </p>

            <p>
              That is not operational data. That is not metadata. That is behavioral truth — inseparable from the specific professional who generated it. It took years to build. It cannot be replicated. It cannot be transferred.
            </p>

            <p className="font-serif text-xl text-ink tracking-tight">
              It is yours.
            </p>
          </div>

          <div className="border-t border-hairline mt-12 pt-12 space-y-6 text-mutedink leading-relaxed">
            <h2 className="font-serif text-xl sm:text-2xl tracking-tight text-ink leading-snug">
              Briarwood exists to make that truth legible — not to own it.
            </h2>

            <p>
              We capture behavioral excellence so it can work for the professional who built it. We do not sell it. We do not share it. We do not use it to train anyone else's model. We do not contact your clients. We do not put our name where yours belongs.
            </p>

            <p className="text-ink">
              Your coordination history. Your referral network. Your client relationships. Your standards.
            </p>

            <p className="font-serif text-xl text-ink tracking-tight">
              Yours. Always.
            </p>
          </div>

          <div className="border-t border-hairline mt-12 pt-12 space-y-6 text-mutedink leading-relaxed">
            <h2 className="font-serif text-xl sm:text-2xl tracking-tight text-ink leading-snug">
              Why this matters.
            </h2>

            <p>
              The behavioral data generated inside a word of mouth business is the most valuable and most unprotected data in the professional world. It has never had infrastructure built to hold it — which means it has always been vulnerable to being lost, stolen, or simply forgotten.
            </p>

            <p className="font-serif text-lg text-ink tracking-tight">
              Briarwood is the first infrastructure built to protect it as seriously as it deserves.
            </p>
          </div>

          <div className="border-t border-hairline mt-16 pt-8">
            <p className="text-sm text-faintink">&copy; 2026 Briarwood AI</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
