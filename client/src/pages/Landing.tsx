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
    label: "Built by an artist, for artists",
    h1: "The invisible layer behind your business.",
    manifesto: "We were taught to do it all ourselves.\nThat was never independence—it was exhaustion.",
    thesis: "Your clients only see your brand. Never ours.\nThat's the point.",
    primaryCta: "Get your private link",
    secondaryCta: "How it works"
  },
  howItWorks: {
    title: "How it fits into your business",
    steps: [
      {
        num: "01",
        title: "Your link, your brand",
        lines: [
          "Embed our form on your contact page—clients fill it out without leaving your site.",
          "Or share your link when someone emails or DMs you.",
          "Either way: clients see your name, your form—never ours."
        ]
      },
      {
        num: "02",
        title: "Everything stays together",
        lines: [
          "Inquiries, contracts, payments, organized automatically.",
          "You respond from your inbox. We handle execution."
        ]
      },
      {
        num: "03",
        title: "You decide once",
        lines: [
          "<strong>Accept</strong> → Contract and invoice sent automatically",
          "<strong>Refer</strong> → Client introduced to artist you trust",
          "<strong>Decline</strong> → Professional response handled for you"
        ]
      }
    ]
  },
  independence: {
    title: "Independence doesn't mean isolation.",
    intro: "When you're booked, refer clients to artists you trust—without losing the relationship. When others are booked, they do the same for you.",
    tagline: "A private, artist-led network built on reputation and reciprocity.",
    principles: [
      "Not rankings.",
      "Not bidding.",
      "Not a race to the bottom."
    ]
  },
  dataSovereignty: {
    title: "Your clients. Your data.",
    guarantees: [
      "No client accounts to create.",
      "No resale of data.",
      "No competing brand in their inbox.",
      "Export anytime. Leave anytime."
    ]
  },
  pricing: {
    title: "Start free. Earn when you do.",
    rate: "1% of transactions processed through Beauvette.",
    example: "You book a $3,000 package—keep $2,970.",
    comparison: "For context: The other platforms take 20–30%."
  },
  footer: {
    links: ["Instagram", "Contact", "Privacy"],
    copyright: "© 2025 Beauvette"
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
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-hairline">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 flex items-center justify-between py-5">
          <a href="/" className="font-serif text-xl tracking-tight text-ink no-underline">
            Beauvette
          </a>
          <button
            onClick={() => setLocation("/secretary")}
            className="hidden md:block bg-ink text-bg px-5 py-2.5 text-sm font-medium rounded hover:bg-ink/90 transition-colors"
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
              className="md:hidden fixed inset-0 top-[65px] bg-white z-40"
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

      {/* Hero Section */}
      <section 
        className="relative pt-[73px] text-center"
        style={{
          background: 'linear-gradient(180deg, #6B1C23 0%, #4a1419 100%)',
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(255,255,255,0.03) 2px,
              rgba(255,255,255,0.03) 4px
            )
          `
        }}
      >
        <div className="max-w-[900px] mx-auto px-6 md:px-8 py-32 md:py-36">
          <motion.p 
            className="text-xs tracking-[0.15em] uppercase text-[#f5f1e8]/70"
            {...fadeIn}
          >
            {CONTENT.hero.label}
          </motion.p>
          <motion.h1 
            className="mt-8 font-serif text-4xl sm:text-5xl md:text-[3.5rem] leading-tight text-[#f5f1e8]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
          >
            {CONTENT.hero.h1}
          </motion.h1>
          <motion.p 
            className="mt-8 text-lg md:text-xl leading-relaxed text-[#f5f1e8]/90 whitespace-pre-line"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3, ease: "easeOut" }}
          >
            {CONTENT.hero.manifesto}
          </motion.p>
          <motion.p 
            className="mt-5 text-base md:text-lg leading-relaxed text-[#f5f1e8]/90 whitespace-pre-line"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
          >
            {CONTENT.hero.thesis}
          </motion.p>
          <motion.div 
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.3, ease: "easeOut" }}
          >
            <button
              onClick={() => setLocation("/secretary")}
              className="bg-[#f5f1e8] text-[#6B1C23] px-6 py-3.5 text-sm font-semibold rounded hover:translate-y-[-2px] transition-transform"
              data-testid="button-hero-primary"
            >
              {CONTENT.hero.primaryCta}
            </button>
            <a 
              href="#how-it-works" 
              className="px-6 py-3.5 text-sm font-medium text-[#f5f1e8] border border-[#f5f1e8]/30 rounded hover:border-[#f5f1e8] transition-colors"
            >
              {CONTENT.hero.secondaryCta}
            </a>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-[#f5f1e8] py-20 md:py-24">
        <div className="max-w-[1200px] mx-auto px-6 md:px-8">
          <motion.h2 
            className="font-serif text-3xl md:text-[2.5rem] text-center mb-12"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {CONTENT.howItWorks.title}
          </motion.h2>
          
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            <div className="space-y-10 md:space-y-12">
              {CONTENT.howItWorks.steps.map((step, index) => (
                <motion.div 
                  key={index}
                  className="pl-6 border-l-2 border-[#6B1C23]"
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.3, ease: "easeOut" }}
                >
                  <span className="text-sm text-[#6B1C23] font-semibold">{step.num}</span>
                  <h3 className="font-serif text-xl md:text-2xl mt-2 mb-4">{step.title}</h3>
                  {step.lines.map((line, i) => (
                    <p 
                      key={i} 
                      className="text-[#666] leading-relaxed mt-3"
                      dangerouslySetInnerHTML={{ __html: line }}
                    />
                  ))}
                </motion.div>
              ))}
            </div>
            
            <motion.div 
              className="bg-[#d4c5b9] rounded-lg aspect-[9/16] md:aspect-[9/16] flex items-center justify-center shadow-xl"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
            >
              <span className="text-[#666] italic text-center px-8">Video placeholder - Add your demo video here</span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Independence Section */}
      <section className="bg-white py-20 md:py-24">
        <div className="max-w-[1200px] mx-auto px-6 md:px-8 text-center">
          <motion.h2 
            className="font-serif text-3xl md:text-[2.5rem]"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {CONTENT.independence.title}
          </motion.h2>
          <motion.p 
            className="mt-6 text-lg md:text-xl max-w-[800px] mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
          >
            {CONTENT.independence.intro}
          </motion.p>
          <motion.p 
            className="mt-4 text-base md:text-lg text-[#666]"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.3, ease: "easeOut" }}
          >
            {CONTENT.independence.tagline}
          </motion.p>
          <motion.ul 
            className="mt-8 flex flex-col md:flex-row justify-center gap-4 md:gap-10"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
          >
            {CONTENT.independence.principles.map((principle, i) => (
              <li key={i} className="text-[#6B1C23] font-medium">{principle}</li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* Data Sovereignty Section */}
      <section className="bg-[#f5f1e8] py-20 md:py-24">
        <div className="max-w-[1200px] mx-auto px-6 md:px-8">
          <motion.h2 
            className="font-serif text-3xl md:text-[2.5rem] text-center"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {CONTENT.dataSovereignty.title}
          </motion.h2>
          <motion.ul 
            className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
          >
            {CONTENT.dataSovereignty.guarantees.map((item, i) => (
              <li key={i} className="bg-white p-5 rounded border-l-[3px] border-[#6B1C23]">
                {item}
              </li>
            ))}
          </motion.ul>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-white py-20 md:py-24">
        <div className="max-w-[1200px] mx-auto px-6 md:px-8 text-center">
          <motion.h2 
            className="font-serif text-3xl md:text-[2.5rem]"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {CONTENT.pricing.title}
          </motion.h2>
          <motion.p 
            className="mt-6 text-lg md:text-xl leading-relaxed"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
          >
            {CONTENT.pricing.rate}
          </motion.p>
          <motion.p 
            className="mt-4 text-base md:text-lg text-[#666] leading-relaxed"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.3, ease: "easeOut" }}
          >
            {CONTENT.pricing.example}
          </motion.p>
          <motion.p 
            className="mt-3 text-sm text-[#999]"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
          >
            {CONTENT.pricing.comparison}
          </motion.p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#2C2C2C] text-white py-10 md:py-12">
        <div className="max-w-[1200px] mx-auto px-6 md:px-8 text-center">
          <nav className="flex flex-wrap justify-center gap-6 md:gap-8 mb-8">
            <a 
              href="https://www.instagram.com/beauvetteapp" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-white/70 hover:text-white transition-colors no-underline"
              data-testid="link-footer-instagram"
            >
              Instagram
            </a>
            <a 
              href="mailto:violet@beauvette.com" 
              className="text-white/70 hover:text-white transition-colors no-underline"
              data-testid="link-footer-contact"
            >
              Contact
            </a>
            <button 
              onClick={() => setLocation("/privacy")}
              className="text-white/70 hover:text-white transition-colors"
              data-testid="link-footer-privacy"
            >
              Privacy
            </button>
            <button 
              onClick={() => setLocation("/login")}
              className="text-white/70 hover:text-white transition-colors"
              data-testid="button-sign-in"
            >
              Sign in
            </button>
          </nav>
          <p className="text-white/50 text-sm">{CONTENT.footer.copyright}</p>
        </div>
      </footer>
    </div>
  );
}
