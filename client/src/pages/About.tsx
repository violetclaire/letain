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
            <h2 className="font-serif text-2xl sm:text-3xl tracking-tight text-ink leading-snug max-w-[20ch]">
              Built by a professional, for professionals.
            </h2>

            <p>
              Briarwood was built by someone who spent 16 years inside the work — coordinating high-stakes events, managing client relationships, making referrals, and carrying the invisible labor that holds a word of mouth business together.
            </p>

            <p>
              Over $1M coordinated the old way. Manually. Across calendars, inboxes, contracts, and phone calls. The kind of work that makes everything look effortless from the outside — while the professional carrying it knows exactly what it costs.
            </p>

            <p>
              Briarwood exists because that cost was never necessary. The standard was. The weight of holding it together alone was not.
            </p>
          </div>

          <div className="border-t border-hairline mt-12 pt-12 space-y-6 text-mutedink leading-relaxed">
            <h2 className="font-serif text-xl sm:text-2xl tracking-tight text-ink leading-snug">
              What Briarwood is.
            </h2>

            <p>
              Infrastructure for the most trusted independent professionals in the physical service economy. The ones whose reputations were built on word of mouth, sustained through relationships, and earned through years of judgment that no platform can replicate.
            </p>

            <p>
              Briarwood doesn't replace that judgment. It gives it infrastructure. It makes the invisible labor — the coordination, the follow up, the contracts, the referrals — run with the precision and permanence the work has always deserved.
            </p>

            <p className="font-serif text-lg text-ink tracking-tight">
              Your reputation. Your network. Your standard. Now with infrastructure underneath it.
            </p>
          </div>

          <div className="border-t border-hairline mt-12 pt-12 space-y-6 text-mutedink leading-relaxed">
            <h2 className="font-serif text-xl sm:text-2xl tracking-tight text-ink leading-snug">
              What Briarwood is not.
            </h2>

            <p>
              Not a marketplace. Not a lead generator. Not a platform that puts its name where yours belongs. Not a system that teaches you how to work or tells you what to charge.
            </p>

            <p>
              Briarwood is invisible to your clients. They see your brand. Your contracts. Your invoices. Your name. That's the point.
            </p>
          </div>

          <div className="border-t border-hairline mt-12 pt-12">
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setLocation("/secretary")}
                className="bg-ink text-bg px-5 py-3 text-sm font-medium hover:bg-ink/90 transition-colors"
                data-testid="button-about-waitlist"
              >
                Join the waitlist
              </button>
              <button
                onClick={() => setLocation("/privacy")}
                className="text-sm underline text-mutedink hover:text-ink transition-colors self-center"
                data-testid="button-about-privacy"
              >
                Privacy
              </button>
            </div>
          </div>

          <div className="border-t border-hairline mt-16 pt-8">
            <p className="text-sm text-faintink">&copy; 2026 Briarwood AI</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
