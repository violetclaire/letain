import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function About() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="estate-pinstripe" />
      <div className="max-w-[680px] mx-auto px-6 py-16 md:py-24">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-faintink hover:text-ink mb-12 transition-colors text-sm"
          data-testid="button-back-about"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <p className="text-xs tracking-[0.16em] uppercase text-faintink mb-8">About</p>

          <div className="space-y-6 text-mutedink leading-relaxed">
            <h2 className="font-serif text-2xl sm:text-3xl tracking-tight text-ink leading-snug">
              Briarwood was built by someone who did this manually.
            </h2>
            <p className="text-ink font-medium">
              Not as a case study. Not as a research project.<br />
              For 28 years.
            </p>

            <p>
              Violet Herod started her career at Nordstrom, where personal service is not a policy — it's a culture. That standard never left her. What she built over the next 28 years was not a business in the conventional sense. It was a reputation so precise, so reliable, that clients never needed to look anywhere else. Vendors requested to work with her by name. Referrals moved through private networks that no platform could see or touch.
            </p>

            <p>
              That didn't happen by accident. It happened because of something that has never had a name — the professional intuition to read a room, manage a vendor relationship under pressure, know exactly what a client needed before they said it, and execute without a single visible seam.
            </p>

            <p className="text-ink font-medium">
              That behavioral excellence is the most valuable thing in the physical service economy.
            </p>

            <p>
              It has never been captured anywhere before.
            </p>

            <p className="font-serif text-xl text-ink tracking-tight">
              Briarwood captures it.
            </p>
          </div>

          <div className="border-t border-hairline mt-12 pt-12 space-y-6 text-mutedink leading-relaxed">
            <h2 className="font-serif text-xl sm:text-2xl tracking-tight text-ink leading-snug">
              Why we built this.
            </h2>

            <p>
              The trust networks already exist. They have existed for decades — in the relationships, the referrals, the invisible labor of the best independent professionals in the physical world.
            </p>

            <p>
              The problem was never the trust. The problem was that it lived nowhere a machine could reach. Nowhere permanent. Nowhere queryable. Nowhere that survived the professional who built it.
            </p>

            <p>
              Every other system built for this economy captures what providers claim or what clients say after the fact. Briarwood captures what actually happened — in the moment it mattered, under pressure, at stakes.
            </p>

            <p>
              That data has never existed anywhere before. We are the first to build the infrastructure to hold it. And because we built it from the inside — from 28 years of doing this work ourselves — we own the outcome in a way nobody else can.
            </p>

            <p className="font-serif text-lg text-ink tracking-tight">
              The networks were always there. Briarwood makes them legible for the first time.
            </p>
          </div>

          <div className="border-t border-hairline mt-12 pt-12 space-y-6 text-mutedink leading-relaxed">
            <p>
              Dundy Pasupuleti is Briarwood's co-founder and CTO.
            </p>
          </div>

          <div className="border-t border-hairline mt-12 pt-12 space-y-3">
            <p className="font-serif text-xl text-ink tracking-tight leading-snug">
              Independence. Sovereignty. Trust that travels.
            </p>
            <p className="text-mutedink leading-relaxed">
              That is what we built our careers on.
            </p>
            <p className="text-ink font-medium">
              That is what Briarwood protects.
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
