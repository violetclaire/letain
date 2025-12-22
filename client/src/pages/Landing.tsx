import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const CONTENT = {
  nav: {
    brand: "Beauvette",
    cta: "Get your private link"
  },
  hero: {
    label: "Private operating layer",
    h1: "Beauvette is the operating layer for independent beauty businesses.",
    notList: [
      "Not a booking app.",
      "Not a marketplace.",
      "Not software your clients ever see."
    ],
    primaryCta: "Get your private link",
    secondaryCta: "How it works"
  },
  howItWorks: {
    title: "How Beauvette fits into your business",
    steps: [
      {
        num: "01",
        title: "One private entry point",
        body: "Add your Beauvette link to your site, email, or replies. Every inquiry starts in the same place."
      },
      {
        num: "02",
        title: "Everything stays together",
        body: "Messages, details, and decisions—organized automatically."
      },
      {
        num: "03",
        title: "You decide once",
        body: "Accept, refer, or decline. Beauvette handles the follow-through."
      }
    ]
  },
  network: {
    headline: "Independence doesn't mean isolation.",
    body: "When you're booked, Beauvette lets you refer clients to artists you trust—without losing the relationship.",
    description: "A private, artist-led network designed around reputation, reciprocity, and long-term independence.",
    notList: [
      "Not rankings.",
      "Not bidding.",
      "Not a race to the bottom."
    ]
  },
  privacy: {
    headline: "Your data stays yours.",
    points: [
      "No client accounts.",
      "No resale of data.",
      "No cross-pollination of clients."
    ]
  },
  pricing: {
    headline: "Start free. Earns when you do.",
    body: "1% only when transactions happen."
  },
  footer: {
    links: ["Instagram", "Contact", "Privacy"],
    copyright: "© 2025 Beauvette Secretary"
  }
};

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: [0, 0, 0.2, 1] as const }
};

export default function Landing() {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      {/* Pinstripe texture overlay */}
      <div className="estate-pinstripe" />
      {/* Brass frame border - letterhead style */}
      <div className="fixed inset-6 pointer-events-none z-40 border border-brass/50" />
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-bg/95 backdrop-blur-sm">
        <div className="estate-container flex items-center justify-between py-8">
          <div className="font-serif text-xl tracking-tight">Beauvette</div>
          <button
            onClick={() => setLocation("/secretary")}
            className="hidden md:block border border-hairline px-3 py-1.5 text-sm hover:bg-surface focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70 transition-colors"
            data-testid="button-nav-cta"
          >
            {CONTENT.nav.cta}
          </button>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 -mr-2"
            aria-label="Toggle menu"
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              className="md:hidden fixed inset-0 top-[72px] bg-bg z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex flex-col items-center justify-center h-full gap-8">
                <button
                  onClick={() => { setMobileMenuOpen(false); setLocation("/secretary"); }}
                  className="text-lg"
                  data-testid="button-mobile-get-link"
                >
                  Get your private link
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); setLocation("/login"); }}
                  className="text-lg text-mutedink"
                  data-testid="button-mobile-sign-in"
                >
                  Sign in
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section - Dark Pinstripe */}
      <section className="relative min-h-screen flex flex-col justify-center bg-[#0a0a0a] text-[#f5f3ef] -mx-6 md:-mx-12 px-6 md:px-12">
        {/* Pinstripe fabric texture */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-35"
          style={{
            backgroundImage: 'url(/attached_assets/u4728191363_seamless_repeating_pinstripe_suiting_fabric_textu__1766382482762.png)',
            backgroundRepeat: 'repeat',
            backgroundSize: '500px'
          }} 
        />
        {/* Film grain overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
          style={{
            backgroundImage: 'url(/attached_assets/u4728191363_seamless_film_grain_texture_velvet_like_monochrom__1766382482759.png)',
            backgroundRepeat: 'repeat',
            backgroundSize: '300px'
          }} 
        />
        <div className="estate-prose relative z-10 py-32 md:py-40">
        <motion.p 
          className="text-sm tracking-[0.12em] uppercase text-[#f5f3ef]/50"
          {...fadeIn}
        >
          {CONTENT.hero.label}
        </motion.p>
        <motion.h1 
          className="mt-6 text-4xl sm:text-5xl leading-[1.05] tracking-tight text-[#f5f3ef]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
        >
          {CONTENT.hero.h1}
        </motion.h1>
        <motion.p 
          className="mt-6 text-lg leading-relaxed text-[#f5f3ef]/60"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
        >
          {CONTENT.hero.notList.join(" ")}
        </motion.p>
        <motion.div 
          className="mt-10 flex flex-col sm:flex-row gap-3"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3, ease: "easeOut" }}
        >
          <button
            onClick={() => setLocation("/secretary")}
            className="bg-[#f5f3ef] px-4 py-2.5 text-sm font-medium text-[#0a0a0a] hover:bg-[#f5f3ef]/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass transition-colors"
            data-testid="button-hero-primary"
          >
            {CONTENT.hero.primaryCta}
          </button>
          <a 
            href="#how" 
            className="self-center text-sm underline text-[#f5f3ef]/70 hover:text-[#f5f3ef] transition-colors"
          >
            {CONTENT.hero.secondaryCta}
          </a>
        </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="estate-prose py-16 md:py-20">
        <motion.h2 
          className="text-2xl sm:text-3xl tracking-tight"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {CONTENT.howItWorks.title}
        </motion.h2>
        
        <div className="mt-10 space-y-10">
          {CONTENT.howItWorks.steps.map((step, index) => (
            <motion.div 
              key={index}
              className="border-t border-hairline pt-8"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.3, ease: "easeOut" }}
            >
              <div className="text-xs tracking-[0.16em] uppercase text-mutedink">{step.num}</div>
              <div className="mt-2 font-serif text-xl tracking-tight">{step.title}</div>
              <p className="mt-3 text-mutedink leading-relaxed">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Network Section */}
      <section className="estate-prose py-16 md:py-20">
        <motion.h2 
          className="text-2xl sm:text-3xl tracking-tight"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {CONTENT.network.headline}
        </motion.h2>
        <motion.p 
          className="mt-6 text-mutedink leading-relaxed"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
        >
          {CONTENT.network.body}
        </motion.p>
        <motion.p 
          className="mt-4 text-mutedink leading-relaxed"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.3, ease: "easeOut" }}
        >
          {CONTENT.network.description}
        </motion.p>
        <motion.ul 
          className="mt-6 space-y-2 text-mutedink"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
        >
          {CONTENT.network.notList.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </motion.ul>
      </section>

      {/* Privacy Section */}
      <section className="estate-prose py-16 md:py-20 border-t border-hairline">
        <motion.h2 
          className="text-2xl sm:text-3xl tracking-tight"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {CONTENT.privacy.headline}
        </motion.h2>
        <motion.ul 
          className="mt-6 space-y-2 text-mutedink"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
        >
          {CONTENT.privacy.points.map((point, i) => (
            <li key={i}>{point}</li>
          ))}
        </motion.ul>
      </section>

      {/* Pricing Section */}
      <section className="estate-prose py-16 md:py-20 border-t border-hairline">
        <motion.h2 
          className="text-2xl sm:text-3xl tracking-tight"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {CONTENT.pricing.headline}
        </motion.h2>
        <motion.p 
          className="mt-4 text-mutedink"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
        >
          {CONTENT.pricing.body}
        </motion.p>
      </section>

      {/* Footer */}
      <footer className="estate-prose py-12 pb-20 md:pb-16 text-sm text-mutedink">
        <div className="flex gap-6">
          <a 
            href="https://www.instagram.com/beauvetteapp" 
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
          <button 
            onClick={() => setLocation("/privacy")}
            className="underline hover:text-ink transition-colors"
            data-testid="link-footer-privacy"
          >
            Privacy
          </button>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <span>{CONTENT.footer.copyright}</span>
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
