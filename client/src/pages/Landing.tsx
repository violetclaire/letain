import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, CheckCircle, Inbox, CalendarCheck, Users, FileText, ArrowRight } from "lucide-react";

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: [0, 0, 0.2, 1] as const }
};

function InquiryCard() {
  return (
    <motion.div
      className="bg-white border border-[#e8e2d9] rounded-lg p-5 shadow-sm max-w-lg"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-[#f5f3ef] flex items-center justify-center">
          <Inbox size={14} className="text-[#3d1a22]" />
        </div>
        <span className="text-xs tracking-[0.1em] uppercase text-[#888]">New Inquiry</span>
      </div>
      <p className="text-[#1a1a1a] text-sm leading-relaxed italic">
        "Hi, my colleague worked with you last year and had nothing but great things to say. I'd love to know if you have any information and pricing you could share. Looking forward to chatting."
      </p>
    </motion.div>
  );
}

function ReferralBubble() {
  return (
    <motion.div
      className="bg-[#3d1a22] text-[#f5f3ef] rounded-lg px-4 py-3 max-w-xs shadow-md inline-block"
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0.3, duration: 0.35, ease: "easeOut" }}
    >
      <p className="text-sm italic">"Sarah referred me to you."</p>
    </motion.div>
  );
}

function ContractCard() {
  return (
    <motion.div
      className="bg-white border border-[#e8e2d9] rounded-lg overflow-hidden shadow-sm max-w-sm"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }}
    >
      <div className="bg-[#f9f7f4] px-5 py-3 border-b border-[#e8e2d9]">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-[#3d1a22]" />
          <span className="text-xs tracking-[0.1em] uppercase text-[#888]">Contract Ready</span>
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-[#888]">Service</span>
          <span className="text-[#1a1a1a] font-medium">Full Day</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#888]">Total</span>
          <span className="text-[#1a1a1a] font-medium">$8,000</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-[#888]">Starts in</span>
          <span className="text-[#1a1a1a] font-medium">2 weeks</span>
        </div>
        <div className="pt-2 border-t border-[#e8e2d9]">
          <div className="flex items-center gap-2 text-xs text-green-700">
            <CheckCircle size={12} />
            <span>Sent to client</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Landing() {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);

  const joinWaitlist = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: 'landing_page' }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to join");
      }
      return res.json();
    },
    onSuccess: () => {
      setWaitlistSubmitted(true);
      setWaitlistEmail("");
    },
  });

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="estate-pinstripe" />

      <header className="fixed top-0 left-0 right-0 z-40 bg-bg/95 backdrop-blur-sm">
        <div className="estate-container flex items-center justify-between py-4 md:py-8">
          <div className="font-serif text-lg md:text-xl tracking-tight flex-shrink-0">Briarwood</div>
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => window.location.href = "https://dateinquiry.com/artist-login"}
              className="text-sm text-muted-ink hover:text-ink transition-colors"
              data-testid="button-nav-login"
            >
              Sign in
            </button>
            <button
              onClick={() => setLocation("/secretary")}
              className="bg-ink text-bg px-4 py-2 text-sm hover:bg-ink/90 transition-colors"
              data-testid="button-nav-cta"
            >
              Join the waitlist
            </button>
          </nav>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 -mr-2 flex-shrink-0"
            aria-label="Toggle menu"
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="md:hidden fixed inset-0 bg-bg z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center justify-between px-6 py-4">
              <div className="font-serif text-lg tracking-tight">Briarwood</div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 -mr-2"
                aria-label="Close menu"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex flex-col items-center justify-center h-[calc(100%-80px)] gap-8">
              <button
                onClick={() => { setMobileMenuOpen(false); window.location.href = "https://dateinquiry.com/artist-login"; }}
                className="text-lg"
                data-testid="button-mobile-login"
              >
                Sign in
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); setLocation("/secretary"); }}
                className="text-lg font-medium"
                data-testid="button-mobile-get-started"
              >
                Join the waitlist
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <section className="relative min-h-screen flex flex-col justify-center bg-[#3d1a22] text-[#f5f3ef] -mx-6 md:-mx-12 px-6 md:px-12">
        <div
          className="absolute inset-0 pointer-events-none opacity-35"
          style={{
            backgroundImage: 'url(/attached_assets/u4728191363_seamless_repeating_pinstripe_suiting_fabric_textu__1766382482762.png)',
            backgroundRepeat: 'repeat',
            backgroundSize: '500px'
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-60 mix-blend-overlay"
          style={{
            backgroundImage: 'url(/attached_assets/u4728191363_seamless_film_grain_texture_velvet_like_monochrom__1766382482759.png)',
            backgroundRepeat: 'repeat',
            backgroundSize: '300px'
          }}
        />
        <div className="estate-prose relative z-10 py-32 md:py-40">
          <motion.p
            className="text-xs tracking-[0.16em] uppercase text-[#f5f3ef]/40"
            {...fadeIn}
          >
            Briarwood AI
          </motion.p>
          <motion.p
            className="mt-6 text-sm tracking-[0.12em] uppercase text-[#f5f3ef]/50"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.3, ease: "easeOut" }}
          >
            Built by a professional, for professionals
          </motion.p>
          <motion.h1
            className="mt-6 text-3xl sm:text-4xl md:text-5xl leading-[1.1] tracking-tight text-[#f5f3ef] max-w-[18ch]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
          >
            You built your reputation on word of mouth. Compound it with Briarwood.
          </motion.h1>
          <motion.p
            className="mt-6 text-lg leading-relaxed text-[#f5f3ef]/70 max-w-[52ch]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3, ease: "easeOut" }}
          >
            The most trusted independent professionals in the physical service economy use Briarwood to operate with the precision and permanence their reputation deserves — transforming decades of relationships, referrals, and hard-earned judgment into infrastructure that scales their business and keeps their network compounding.
          </motion.p>
          <motion.div
            className="mt-10 flex flex-col sm:flex-row gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.3, ease: "easeOut" }}
          >
            <button
              onClick={() => setLocation("/secretary")}
              className="bg-[#f5f3ef] px-5 py-3 text-sm font-medium text-[#0a0a0a] hover:bg-[#f5f3ef]/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass transition-colors"
              data-testid="button-hero-primary"
            >
              Join the waitlist
            </button>
            <a
              href="#demo"
              className="self-center flex items-center gap-1.5 text-sm text-[#f5f3ef]/70 hover:text-[#f5f3ef] transition-colors group"
            >
              Request a demo <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* Invisible Labor */}
      <section className="estate-prose py-20 md:py-28">
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <h2 className="text-2xl sm:text-3xl tracking-tight leading-snug max-w-[22ch]">
            Invisible labor is the engine underneath every great business built on word of mouth.
          </h2>
          <div className="space-y-5 text-mutedink leading-relaxed">
            <p>
              The coordination that happens before the client arrives. The follow up that keeps the relationship alive. The communication, the contracts, the calendar — the layer of work that makes every job look effortless from the outside.
            </p>
            <p>
              It is not a burden. It is the standard. It is what separates the best from everyone else.
            </p>
            <p>
              But it was never designed to be carried manually forever. The toll of doing it alone — on top of the actual work — is what keeps the best professionals from scaling what they built.
            </p>
          </div>
          <motion.p
            className="font-serif text-xl tracking-tight text-ink pt-2"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
          >
            Briarwood automates the invisible labor. Your standard stays exactly what it is. The weight of holding it together alone — finally — lifts.
          </motion.p>
        </motion.div>
      </section>

      {/* Briarwood in Action */}
      <section id="demo" className="bg-[#f9f7f4] -mx-6 md:-mx-12 px-6 md:px-12 py-20 md:py-28">
        <div className="max-w-[1100px] mx-auto">
          <motion.h2
            className="font-serif text-2xl sm:text-3xl tracking-tight text-center mb-4"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            Briarwood in action.
          </motion.h2>
          <motion.p
            className="text-center text-mutedink text-sm mb-12"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05, duration: 0.3, ease: "easeOut" }}
          >
            You have a new inquiry.
          </motion.p>

          <InquiryCard />

          <div className="mt-16 space-y-20">
            {/* Step 01 */}
            <motion.div
              className="flex flex-col md:flex-row gap-8 md:gap-16 items-start"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#3d1a22] flex items-center justify-center">
                    <Inbox size={16} className="text-[#f5f3ef]" />
                  </div>
                  <span className="text-xs tracking-[0.16em] uppercase text-[#888]">01</span>
                </div>
                <h3 className="font-serif text-xl tracking-tight mb-3">Inquiry received.</h3>
                <p className="text-mutedink leading-relaxed">
                  A new inquiry just arrived. Briarwood reads it, identifies the request, and prepares your response instantly. Your pricing, your information, your voice.
                </p>
              </div>
              <div className="flex-shrink-0 w-full md:w-auto">
                <div className="bg-white border border-[#e8e2d9] rounded-lg p-4 max-w-xs">
                  <div className="flex items-center gap-2 text-xs text-green-700 mb-2">
                    <CheckCircle size={12} />
                    <span>Auto-response ready</span>
                  </div>
                  <div className="text-xs text-[#888]">Pricing sheet attached</div>
                  <div className="text-xs text-[#888]">Info packet included</div>
                  <div className="text-xs text-[#888]">Sent in your voice</div>
                </div>
              </div>
            </motion.div>

            {/* Step 02 */}
            <motion.div
              className="flex flex-col md:flex-row gap-8 md:gap-16 items-start"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#3d1a22] flex items-center justify-center">
                    <CalendarCheck size={16} className="text-[#f5f3ef]" />
                  </div>
                  <span className="text-xs tracking-[0.16em] uppercase text-[#888]">02</span>
                </div>
                <h3 className="font-serif text-xl tracking-tight mb-3">Calendar checked.</h3>
                <p className="text-mutedink leading-relaxed">
                  Briarwood checks your calendar in real time. You have an event at The Four Seasons that day. You're covered. No double booking. No missed dates. Ever.
                </p>
              </div>
              <div className="flex-shrink-0 w-full md:w-auto">
                <div className="bg-white border border-[#e8e2d9] rounded-lg p-4 max-w-xs">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#3d1a22]"></div>
                      <span className="text-xs text-[#1a1a1a]">Oct 17 — The Four Seasons</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#e8e2d9]"></div>
                      <span className="text-xs text-[#888]">Oct 18 — Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#e8e2d9]"></div>
                      <span className="text-xs text-[#888]">Oct 19 — Available</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Step 03 */}
            <motion.div
              className="flex flex-col md:flex-row gap-8 md:gap-16 items-start"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#3d1a22] flex items-center justify-center">
                    <Users size={16} className="text-[#f5f3ef]" />
                  </div>
                  <span className="text-xs tracking-[0.16em] uppercase text-[#888]">03</span>
                </div>
                <h3 className="font-serif text-xl tracking-tight mb-3">Referral activated.</h3>
                <p className="text-mutedink leading-relaxed">
                  You're unavailable. Briarwood checks your trusted network and finds who is. One tap to refer. The introduction goes out with your name attached.
                </p>
              </div>
              <div className="flex-shrink-0 w-full md:w-auto">
                <ReferralBubble />
              </div>
            </motion.div>

            {/* Step 04 */}
            <motion.div
              className="flex flex-col md:flex-row gap-8 md:gap-16 items-start"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#3d1a22] flex items-center justify-center">
                    <FileText size={16} className="text-[#f5f3ef]" />
                  </div>
                  <span className="text-xs tracking-[0.16em] uppercase text-[#888]">04</span>
                </div>
                <h3 className="font-serif text-xl tracking-tight mb-3">Contract and retainer sent.</h3>
                <p className="text-mutedink leading-relaxed">
                  You're available. Client is ready. Briarwood generates the contract and invoice — $8,000, work begins in two weeks — and sends it. Done.
                </p>
              </div>
              <div className="flex-shrink-0 w-full md:w-auto">
                <ContractCard />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="estate-prose py-12 pb-20 md:pb-16 text-sm text-mutedink">
        <div className="border-t border-hairline pt-8 mb-8">
          {!waitlistSubmitted ? (
            <div>
              <p className="text-ink text-base">
                Join the waitlist.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (waitlistEmail) joinWaitlist.mutate(waitlistEmail);
                }}
                className="mt-4 flex flex-col sm:flex-row gap-2.5 max-w-md"
              >
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  required
                  className="flex-1 h-10 px-3 bg-surface border border-hairline text-ink placeholder:text-faintink focus:outline-none focus:border-ink/40 transition-colors text-sm"
                  data-testid="input-landing-waitlist-email"
                />
                <button
                  type="submit"
                  disabled={joinWaitlist.isPending}
                  className="h-10 px-5 bg-ink text-bg text-sm font-medium hover:bg-ink/90 transition-colors disabled:opacity-50 flex-shrink-0"
                  data-testid="button-landing-join-waitlist"
                >
                  {joinWaitlist.isPending ? "Joining..." : "Join"}
                </button>
              </form>
              {joinWaitlist.isError && (
                <p className="mt-2 text-xs text-red-600">
                  {joinWaitlist.error?.message || "Something went wrong. Please try again."}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-ink flex-shrink-0" />
              <p className="text-ink" data-testid="text-waitlist-success">
                Thank you. We'll be in touch.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-6">
          <button
            onClick={() => setLocation("/about")}
            className="underline hover:text-ink transition-colors"
            data-testid="link-footer-about"
          >
            About
          </button>
          <button
            onClick={() => setLocation("/privacy")}
            className="underline hover:text-ink transition-colors"
            data-testid="link-footer-privacy"
          >
            Privacy
          </button>
          <a
            href="https://www.instagram.com/dateinquiry"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-ink transition-colors"
            data-testid="link-footer-instagram"
          >
            Instagram
          </a>
          <a
            href="mailto:violet@beauvette.com"
            className="underline hover:text-ink transition-colors"
            data-testid="link-footer-contact"
          >
            Contact
          </a>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <span>&copy; 2025 Briarwood</span>
          <button
            onClick={() => setLocation("/login")}
            className="underline hover:text-ink transition-colors"
            data-testid="button-sign-in"
          >
            Sign in
          </button>
        </div>
      </footer>
    </div>
  );
}
