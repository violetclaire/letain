import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { TopNav } from "@/components/TopNav";

const CONTENT = {
  nav: {
    brand: "Beauvette",
    cta: "Get your private link"
  },
  hero: {
    h1: "Beauvette",
    subtitle: "The private operating layer for independent beauty businesses.",
    notList: [
      "Not a booking app.",
      "Not a marketplace.",
      "Not software your clients ever see."
    ],
    body: "Beauvette handles inquiries, decisions, and follow-through—so artists can work with intention instead of urgency.",
    tagline: "Built by an artist. Designed for independence.",
    primaryCta: "Get your private link",
  },
  problem: {
    headline: "Independence was sold as freedom.",
    subhead: "In practice, it became constant availability.",
    body: "Independent artists don't lack talent. They lack infrastructure built for how they actually work.",
    painPoints: [
      "Inquiries arrive everywhere.",
      "Every response is manual.",
      "Boundaries feel rude instead of professional.",
      "Saying no costs relationships."
    ],
    resolution: "Beauvette was built to solve that exact tension."
  },
  role: {
    headline: "Beauvette is not a tool.",
    subhead: "It's a role.",
    body: "Think of Beauvette as your secretary.",
    description: "A calm, consistent presence that receives inquiries, organizes conversations, enforces your rules, and carries decisions forward.",
    clientNote: "All without asking your clients to download anything, create accounts, or learn a system."
  },
  invisible: {
    headline: "The best systems disappear.",
    lines: [
      "Your clients never see Beauvette.",
      "They see you—organized, responsive, and intentional.",
      "Your brand stays intact.",
      "Your website stays the same.",
      "Your voice stays yours."
    ],
    tagline: "Beauvette lives quietly underneath, doing the work."
  },
  howItWorks: {
    title: "How Beauvette fits into your business",
    steps: [
      {
        title: "One private entry point",
        body: "Add your Beauvette link to your site, email, or replies.",
        subBody: "Every inquiry starts in the same place."
      },
      {
        title: "Everything stays together",
        body: "Messages, details, and decisions—organized automatically.",
        subBody: ""
      },
      {
        title: "You decide once",
        body: "Accept, refer, or decline.",
        subBody: "Beauvette handles the follow-through."
      }
    ],
    footer: "No back-and-forth. No emotional labor disguised as politeness."
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
  forIndependents: {
    headline: "Independent artists power the beauty economy.",
    subhead: "Until now, they've been treated like an afterthought.",
    body: "Most platforms are built for salons, agencies, or mass consumer flow.",
    resolution: "Beauvette was built for solo operators, small teams, high-touch services, and reputation-based work.",
    tagline: "This is infrastructure for the modern independent."
  },
  privacy: {
    headline: "Your data stays yours.",
    points: [
      "No client accounts.",
      "No resale of data.",
      "No cross-pollination of clients."
    ],
    body: "Beauvette is scoped, private, and consent-based by design.",
    tagline: "Because independence only works if ownership is real."
  },
  pricing: {
    headline: "Start free.",
    body: "Beauvette earns when you do.",
    description: "A small percentage, only when transactions happen.",
    tagline: "No subscription required to begin."
  },
  finalCta: {
    headline: "You don't need to work harder.",
    subhead: "You need the right structure.",
    cta: "Get your private Beauvette link"
  },
  footer: {
    links: ["Instagram", "Contact", "Privacy", "Terms"],
    copyright: "© 2025 Beauvette"
  }
};

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.15
    }
  }
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
    <div className="min-h-screen bg-[#F9F8F6] text-[#2D2D2D] font-sans antialiased">
      {/* Chateau Marmont Double Frame Border */}
      <div className="fixed inset-4 md:inset-8 pointer-events-none z-30 border border-[#5A1F2B]/20" />
      <div className="fixed inset-6 md:inset-10 pointer-events-none z-30 border border-[#5A1F2B]/20" />
      
      {/* Top Navigation */}
      <TopNav />

      {/* Minimal Nav */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#F9F8F6]/95 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-8 lg:px-16">
          <div className="flex items-center justify-between h-16">
            <a href="/" className="font-script text-2xl text-[#5A1F2B]">
              Beauvette
            </a>
            <button
              onClick={() => setLocation("/secretary")}
              className="hidden md:block text-xs uppercase tracking-[0.15em] text-[#5A1F2B] hover:text-[#5A1F2B]/70 transition-colors"
              data-testid="button-nav-cta"
            >
              {CONTENT.nav.cta}
            </button>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 -mr-2 text-[#5A1F2B]"
              aria-label="Toggle menu"
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              className="md:hidden fixed inset-0 top-16 bg-[#F9F8F6] z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex flex-col items-center justify-center h-full gap-8">
                <button
                  onClick={() => { setMobileMenuOpen(false); setLocation("/secretary"); }}
                  className="text-lg text-[#5A1F2B]"
                >
                  Get your private link
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); setLocation("/login"); }}
                  className="text-lg text-[#5A1F2B]/60"
                >
                  Sign in
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center pt-16 px-8">
        <div className="max-w-2xl mx-auto text-center">
          <motion.h1 
            className="font-script text-6xl md:text-7xl text-[#5A1F2B] mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {CONTENT.hero.h1}
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-[#2D2D2D] mb-8 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            {CONTENT.hero.subtitle}
          </motion.p>

          <motion.div 
            className="space-y-2 mb-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            {CONTENT.hero.notList.map((line, i) => (
              <p key={i} className="text-[#2D2D2D]/60 text-sm">{line}</p>
            ))}
          </motion.div>

          <motion.p
            className="text-base text-[#2D2D2D]/80 mb-6 max-w-lg mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            {CONTENT.hero.body}
          </motion.p>

          <motion.p
            className="text-sm text-[#5A1F2B]/70 italic mb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            {CONTENT.hero.tagline}
          </motion.p>
          
          <motion.button
            onClick={() => setLocation("/secretary")}
            className="px-8 py-4 bg-[#5A1F2B] text-[#F9F8F6] text-xs uppercase tracking-[0.2em] hover:bg-[#4a1923] transition-all duration-300"
            data-testid="button-hero-primary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            {CONTENT.hero.primaryCta}
          </motion.button>
        </div>
      </section>

      {/* Problem Section */}
      <section className="px-8 py-24 md:py-32 bg-[#F9F8F6]">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-serif text-3xl md:text-4xl text-[#2D2D2D] mb-4">
              {CONTENT.problem.headline}
            </h2>
            <p className="text-lg text-[#2D2D2D]/70 mb-8">
              {CONTENT.problem.subhead}
            </p>
            <p className="text-base text-[#2D2D2D]/80 mb-8 leading-relaxed">
              {CONTENT.problem.body}
            </p>
            <div className="space-y-3 mb-8">
              {CONTENT.problem.painPoints.map((point, i) => (
                <p key={i} className="text-[#2D2D2D]/60">{point}</p>
              ))}
            </div>
            <p className="text-base text-[#5A1F2B] font-medium">
              {CONTENT.problem.resolution}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Role Section */}
      <section className="px-8 py-24 md:py-32 bg-[#5A1F2B]">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-serif text-3xl md:text-4xl text-[#F9F8F6] mb-2">
              {CONTENT.role.headline}
            </h2>
            <p className="text-xl text-[#F9F8F6]/80 mb-8">
              {CONTENT.role.subhead}
            </p>
            <p className="text-2xl md:text-3xl text-[#F9F8F6] font-serif italic mb-8">
              {CONTENT.role.body}
            </p>
            <p className="text-base text-[#F9F8F6]/70 mb-6 leading-relaxed max-w-lg mx-auto">
              {CONTENT.role.description}
            </p>
            <p className="text-sm text-[#F9F8F6]/50">
              {CONTENT.role.clientNote}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Invisible Section */}
      <section className="px-8 py-24 md:py-32 bg-[#F9F8F6]">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-serif text-3xl md:text-4xl text-[#2D2D2D] mb-10">
              {CONTENT.invisible.headline}
            </h2>
            <div className="space-y-4 mb-10">
              {CONTENT.invisible.lines.map((line, i) => (
                <p key={i} className="text-[#2D2D2D]/70">{line}</p>
              ))}
            </div>
            <p className="text-base text-[#5A1F2B] italic">
              {CONTENT.invisible.tagline}
            </p>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-8 py-24 md:py-32 bg-[#F4F2EC]">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-serif text-3xl md:text-4xl text-[#2D2D2D] mb-12 text-center">
              {CONTENT.howItWorks.title}
            </h2>
            
            <div className="space-y-12">
              {CONTENT.howItWorks.steps.map((step, index) => (
                <div key={index}>
                  <h3 className="text-lg font-medium text-[#2D2D2D] mb-2">
                    {step.title}
                  </h3>
                  <p className="text-[#2D2D2D]/70 mb-1">{step.body}</p>
                  {step.subBody && (
                    <p className="text-[#2D2D2D]/50 text-sm">{step.subBody}</p>
                  )}
                </div>
              ))}
            </div>

            <p className="text-center text-[#5A1F2B]/70 mt-12 italic">
              {CONTENT.howItWorks.footer}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Network Section */}
      <section className="px-8 py-24 md:py-32 bg-[#F9F8F6]">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-serif text-3xl md:text-4xl text-[#2D2D2D] mb-6">
              {CONTENT.network.headline}
            </h2>
            <p className="text-base text-[#2D2D2D]/80 mb-6 leading-relaxed">
              {CONTENT.network.body}
            </p>
            <p className="text-base text-[#2D2D2D]/70 mb-8 leading-relaxed">
              {CONTENT.network.description}
            </p>
            <div className="space-y-2">
              {CONTENT.network.notList.map((line, i) => (
                <p key={i} className="text-[#2D2D2D]/50 text-sm">{line}</p>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* For Independents Section */}
      <section className="px-8 py-24 md:py-32 bg-[#5A1F2B]">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-serif text-3xl md:text-4xl text-[#F9F8F6] mb-4">
              {CONTENT.forIndependents.headline}
            </h2>
            <p className="text-lg text-[#F9F8F6]/70 mb-8">
              {CONTENT.forIndependents.subhead}
            </p>
            <p className="text-base text-[#F9F8F6]/60 mb-6">
              {CONTENT.forIndependents.body}
            </p>
            <p className="text-base text-[#F9F8F6]/80 mb-8">
              {CONTENT.forIndependents.resolution}
            </p>
            <p className="text-lg text-[#F9F8F6] italic">
              {CONTENT.forIndependents.tagline}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Privacy Section */}
      <section className="px-8 py-24 md:py-32 bg-[#F9F8F6]">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-serif text-3xl md:text-4xl text-[#2D2D2D] mb-8">
              {CONTENT.privacy.headline}
            </h2>
            <div className="space-y-3 mb-8">
              {CONTENT.privacy.points.map((point, i) => (
                <p key={i} className="text-[#2D2D2D]/60">{point}</p>
              ))}
            </div>
            <p className="text-base text-[#2D2D2D]/70 mb-6">
              {CONTENT.privacy.body}
            </p>
            <p className="text-base text-[#5A1F2B] italic">
              {CONTENT.privacy.tagline}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-8 py-24 md:py-32 bg-[#F4F2EC]">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-serif text-3xl md:text-4xl text-[#2D2D2D] mb-4">
              {CONTENT.pricing.headline}
            </h2>
            <p className="text-lg text-[#2D2D2D]/70 mb-4">
              {CONTENT.pricing.body}
            </p>
            <p className="text-base text-[#2D2D2D]/60 mb-6">
              {CONTENT.pricing.description}
            </p>
            <p className="text-sm text-[#5A1F2B]">
              {CONTENT.pricing.tagline}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-8 py-24 md:py-32 bg-[#F9F8F6]">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-serif text-3xl md:text-4xl text-[#2D2D2D] mb-4">
              {CONTENT.finalCta.headline}
            </h2>
            <p className="text-lg text-[#2D2D2D]/70 mb-10">
              {CONTENT.finalCta.subhead}
            </p>
            <button
              onClick={() => setLocation("/secretary")}
              className="px-8 py-4 bg-[#5A1F2B] text-[#F9F8F6] text-xs uppercase tracking-[0.2em] hover:bg-[#4a1923] transition-all duration-300"
              data-testid="button-final-cta"
            >
              {CONTENT.finalCta.cta}
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-12 bg-[#5A1F2B]">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <a href="/" className="font-script text-xl text-[#F9F8F6]/80">
              Beauvette
            </a>
            <div className="flex items-center gap-6">
              <a
                href="https://www.instagram.com/beauvetteapp"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs uppercase tracking-[0.15em] text-[#F9F8F6]/40 hover:text-[#F9F8F6] transition-colors"
                data-testid="link-footer-instagram"
              >
                Instagram
              </a>
              <a
                href="mailto:violet@beauvette.com"
                className="text-xs uppercase tracking-[0.15em] text-[#F9F8F6]/40 hover:text-[#F9F8F6] transition-colors"
                data-testid="link-footer-contact"
              >
                Contact
              </a>
              <button
                onClick={() => setLocation("/privacy")}
                className="text-xs uppercase tracking-[0.15em] text-[#F9F8F6]/40 hover:text-[#F9F8F6] transition-colors"
                data-testid="link-footer-privacy"
              >
                Privacy
              </button>
            </div>
          </div>

          <div className="h-[1px] bg-[#F9F8F6]/10 mb-6" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[#F9F8F6]/30">
              {CONTENT.footer.copyright}
            </p>
            <button
              onClick={() => setLocation("/login")}
              className="text-xs text-[#F9F8F6]/30 hover:text-[#F9F8F6] transition-colors"
              data-testid="button-sign-in"
            >
              Sign in
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
