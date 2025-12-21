import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { TopNav } from "@/components/TopNav";

const CONTENT = {
  nav: {
    brand: "Beauvette",
    links: ["How it works", "For Artists", "For Clients"],
    cta: "Get your secretary"
  },
  hero: {
    h1: "Beauvette",
    h2: "Think of Beauvette as your secretary.",
    h3: "",
    subhead: "We were taught to do it all ourselves. That was never independence, it was exhaustion. We deserve an assistant. Now you can have one.",
    supporting: "A smart link that takes bookings, sends contracts, and collects deposits — so you don't have to.",
    primaryCta: "Get your secretary link",
  },
  howItWorks: {
    title: "How it works",
    steps: [
      {
        number: "01",
        title: "Create your secretary link in 60 seconds",
        body: "Enter your business name, connect Square, and get a custom link like beauvette.app/inquire/your-name.",
        subBody: "Share it in your Instagram bio, website, or DMs."
      },
      {
        number: "02",
        title: "Clients inquire, you approve",
        body: "When someone wants to book, they fill out a simple form. You get notified and can accept, decline, or refer with one tap.",
        subBody: "No more back-and-forth DMs asking about availability."
      },
      {
        number: "03",
        title: "Contracts and deposits on autopilot",
        body: "Once you accept, your secretary sends the contract for e-signature and collects the deposit via Square.",
        subBody: "You get paid while focusing on your craft."
      }
    ]
  },
  artists: {
    title: "For Beauty Artists",
    bullets: [
      "One link for all your bookings",
      "Contracts sent automatically",
      "Deposits collected via Square",
      "Refer trusted artists when you're booked"
    ],
    primaryCta: "Get your secretary",
  },
  clients: {
    title: "For Clients",
    tagline: "Book your artist with confidence.",
    bullets: [
      "Simple inquiry form — no DM chaos.",
      "Clear pricing and contracts upfront."
    ],
    cta: "Find an artist"
  },
  footer: {
    links: ["Instagram", "Contact", "Privacy", "Terms"],
    copyright: "© 2025 Beauvette Secretary"
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

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#2D2D2D] font-sans antialiased relative">
      {/* Chateau Marmont Double Frame Border */}
      <div className="fixed inset-4 md:inset-8 pointer-events-none z-30 border border-[#5A1F2B]/20" />
      <div className="fixed inset-6 md:inset-10 pointer-events-none z-30 border border-[#5A1F2B]/15" />
      
      {/* Top Navigation with Login/Logout */}
      <TopNav />

      {/* Navigation - Minimal & Refined */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#F9F8F6]/95 backdrop-blur-md border-b border-[#2D2D2D]/5">
        <div className="max-w-7xl mx-auto px-8 lg:px-16">
          <div className="flex items-center justify-between h-20">
            <div className="w-24" />

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-12">
              <button 
                onClick={() => scrollToSection("how-it-works")}
                className="text-xs uppercase tracking-[0.2em] text-[#1A1A1A]/60 hover:text-[#5A1F2B] transition-colors duration-300"
                data-testid="link-how-it-works"
              >
                How it works
              </button>
              <button 
                onClick={() => scrollToSection("for-artists")}
                className="text-xs uppercase tracking-[0.2em] text-[#1A1A1A]/60 hover:text-[#5A1F2B] transition-colors duration-300"
                data-testid="link-for-artists"
              >
                For Artists
              </button>
              <button 
                onClick={() => scrollToSection("for-clients")}
                className="text-xs uppercase tracking-[0.2em] text-[#1A1A1A]/60 hover:text-[#5A1F2B] transition-colors duration-300"
                data-testid="link-for-clients"
              >
                For Clients
              </button>
              <button
                onClick={() => setLocation("/secretary")}
                className="px-6 py-3 bg-[#5A1F2B] text-[#FAF9F6] text-xs uppercase tracking-[0.15em] hover:bg-[#4a1923] transition-all duration-300"
                data-testid="button-nav-cta"
              >
                {CONTENT.nav.cta}
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 -mr-2 text-[#1A1A1A]"
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
              className="md:hidden fixed inset-0 top-20 bg-[#F4F2EC] z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex flex-col items-center justify-center h-full gap-6">
                <p className="text-xs uppercase tracking-[0.2em] text-[#1A1A1A]/50 mb-2">Login as</p>
                <button
                  onClick={() => { setMobileMenuOpen(false); setLocation("/login?role=artist"); }}
                  className="px-8 py-3 bg-[#5A1F2B] text-[#FAF9F6] text-sm uppercase tracking-[0.15em] w-48 text-center"
                  data-testid="mobile-login-artist"
                >
                  Artist
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); setLocation("/login?role=client"); }}
                  className="px-8 py-3 bg-[#5A1F2B] text-[#FAF9F6] text-sm uppercase tracking-[0.15em] w-48 text-center"
                  data-testid="mobile-login-client"
                >
                  Client
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); setLocation("/login?role=planner"); }}
                  className="px-8 py-3 bg-[#5A1F2B] text-[#FAF9F6] text-sm uppercase tracking-[0.15em] w-48 text-center"
                  data-testid="mobile-login-planner"
                >
                  Planner
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section - Clean, Editorial */}
      <section className="min-h-screen flex items-center justify-center bg-[#F9F8F6] pt-20">
        <div className="max-w-3xl mx-auto px-8 text-center">
          <motion.h1 
            className="font-script text-6xl md:text-7xl lg:text-8xl text-[#5A1F2B] tracking-wide mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {CONTENT.hero.h1}
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <h2 className="text-xl md:text-2xl text-[#5A1F2B]/80 font-light tracking-wide mb-12" style={{ fontFamily: "'Playfair Display', serif" }}>
              {CONTENT.hero.h2}
            </h2>
          </motion.div>
          
          <motion.p 
            className="text-base md:text-lg text-[#5A1F2B]/70 leading-relaxed max-w-xl mx-auto mb-6"
            style={{ fontFamily: "'Inter', sans-serif" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            {CONTENT.hero.subhead}
          </motion.p>

          <motion.p 
            className="text-xs tracking-[0.2em] uppercase text-[#5A1F2B]/50 mb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            Built by an artist, for artists and their clients.
          </motion.p>
          
          <motion.button
            onClick={() => setLocation("/secretary")}
            className="px-10 py-5 border border-[#5A1F2B] text-[#5A1F2B] text-xs uppercase tracking-[0.2em] hover:bg-[#5A1F2B] hover:text-[#F9F8F6] transition-all duration-500"
            data-testid="button-hero-primary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
          >
            {CONTENT.hero.primaryCta}
          </motion.button>
        </div>
      </section>

      {/* How It Works - Generous Whitespace */}
      <section id="how-it-works" className="px-8 lg:px-16 py-32 md:py-48 bg-[#F4F2EC] relative z-10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="text-center mb-24"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-[#5A1F2B]/60 mb-4 block">
              The Experience
            </span>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[#1A1A1A] font-light">
              {CONTENT.howItWorks.title}
            </h2>
          </motion.div>
          
          <div className="space-y-24 md:space-y-32">
            {CONTENT.howItWorks.steps.map((step, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                className="grid md:grid-cols-12 gap-8 items-start"
              >
                <div className="md:col-span-2">
                  <span className="font-serif text-6xl md:text-7xl text-[#5A1F2B]/20">
                    {step.number}
                  </span>
                </div>
                <div className="md:col-span-10 md:pt-4">
                  <h3 className="font-serif text-2xl md:text-3xl text-[#1A1A1A] mb-6 font-light">
                    {step.title}
                  </h3>
                  <p className="text-[#1A1A1A]/70 text-lg leading-relaxed mb-4 max-w-2xl">
                    {step.body}
                  </p>
                  <p className="text-[#1A1A1A]/50 text-base leading-relaxed max-w-2xl">
                    {step.subBody}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto px-8 relative z-10 bg-[#F4F2EC]">
        <div className="h-[1px] bg-gradient-to-r from-transparent via-[#5A1F2B]/20 to-transparent" />
      </div>

      {/* For Artists - Dark, Atmospheric */}
      <section id="for-artists" className="px-8 lg:px-16 py-32 md:py-48 bg-[#5A1F2B] relative z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-[#FAF9F6]/40 mb-4 block">
              For Professionals
            </span>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[#FAF9F6] font-light">
              {CONTENT.artists.title}
            </h2>
          </motion.div>
          
          <motion.ul 
            className="space-y-8 mb-16 max-w-xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {CONTENT.artists.bullets.map((bullet, index) => (
              <li key={index} className="flex items-center gap-6">
                <span className="w-12 h-[1px] bg-[#FAF9F6]/30 flex-shrink-0" />
                <span className="text-[#FAF9F6]/80 text-lg tracking-wide">{bullet}</span>
              </li>
            ))}
          </motion.ul>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center"
          >
            <button
              onClick={() => setLocation("/secretary")}
              className="px-10 py-5 bg-[#FAF9F6] text-[#5A1F2B] text-xs uppercase tracking-[0.2em] font-medium hover:bg-transparent hover:text-[#FAF9F6] border border-[#FAF9F6] transition-all duration-500"
              data-testid="button-artists-primary"
            >
              {CONTENT.artists.primaryCta}
            </button>
          </motion.div>
        </div>
      </section>

      {/* For Clients - Light, Elegant */}
      <section id="for-clients" className="px-8 lg:px-16 py-32 md:py-48 bg-[#F4F2EC] relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-xs uppercase tracking-[0.3em] text-[#5A1F2B]/60 mb-4 block">
              For Those Seeking Excellence
            </span>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[#1A1A1A] font-light mb-8">
              {CONTENT.clients.title}
            </h2>
          </motion.div>

          <motion.p 
            className="font-serif text-xl md:text-2xl text-[#1A1A1A]/70 mb-10 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {CONTENT.clients.tagline}
          </motion.p>

          <motion.div 
            className="space-y-4 mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {CONTENT.clients.bullets.map((bullet, index) => (
              <p key={index} className="text-lg text-[#1A1A1A]/60 tracking-wide">
                {bullet}
              </p>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <button
              onClick={() => setLocation("/waitlist")}
              className="px-10 py-5 border border-[#5A1F2B] text-[#5A1F2B] text-xs uppercase tracking-[0.2em] font-medium hover:bg-[#5A1F2B] hover:text-[#FAF9F6] transition-all duration-500"
              data-testid="button-clients-cta"
            >
              {CONTENT.clients.cta}
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer - Minimal & Refined */}
      <footer className="px-8 lg:px-16 py-16 bg-[#5A1F2B] relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
            <a href="/" className="font-script text-2xl text-[#F4F2EC]/80">
              Beauvette
            </a>
            <div className="flex items-center gap-8">
              <a
                href="https://www.instagram.com/beauvetteapp?igsh=NTc4MTIwNjQ2YQ%3D%3D&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs uppercase tracking-[0.15em] text-[#F4F2EC]/40 hover:text-[#F4F2EC] transition-colors duration-300"
                data-testid="link-footer-instagram"
              >
                Instagram
              </a>
              <a
                href="mailto:violet@beauvette.com"
                className="text-xs uppercase tracking-[0.15em] text-[#F4F2EC]/40 hover:text-[#F4F2EC] transition-colors duration-300"
                data-testid="link-footer-contact"
              >
                Contact
              </a>
              <button
                onClick={() => setLocation("/privacy")}
                className="text-xs uppercase tracking-[0.15em] text-[#F4F2EC]/40 hover:text-[#F4F2EC] transition-colors duration-300"
                data-testid="link-footer-privacy"
              >
                Privacy
              </button>
            </div>
          </div>

          <div className="h-[1px] bg-[#F4F2EC]/10 mb-8" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[#F4F2EC]/30 tracking-wide">
              {CONTENT.footer.copyright}
            </p>
            <button
              onClick={() => setLocation("/login")}
              className="text-xs text-[#F4F2EC]/30 hover:text-[#F4F2EC] transition-colors duration-300"
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
