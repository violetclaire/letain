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
    h2: "Works like you. For you.",
    subhead: "Behind the scenes, so you don't have to be.",
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
  const [isOpen, setIsOpen] = useState(false);

  const openElevator = () => {
    setIsOpen(true);
  };

  useEffect(() => {
    if (mobileMenuOpen || !isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen, isOpen]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F4F2EC] text-[#1A1A1A] font-sans antialiased relative">
      {/* Top Navigation with Login/Logout */}
      <TopNav />
      {/* Subtle Gingham Background */}
      <div className="fixed inset-0 gingham-check opacity-[0.08] pointer-events-none z-0" />
      {/* Gingham Elevator Doors */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div 
            className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
            onClick={openElevator}
            exit={{ opacity: 0, pointerEvents: "none" }}
            transition={{ duration: 0.5, delay: 1 }}
          >
            {/* Left Door */}
            <motion.div
              className="absolute left-0 top-0 w-1/2 h-full border-r border-[#5A1F2B]/20 overflow-hidden gingham-check"
              initial={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            />
            {/* Right Door */}
            <motion.div
              className="absolute right-0 top-0 w-1/2 h-full border-l border-[#5A1F2B]/20 overflow-hidden gingham-check"
              initial={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            />
            {/* Center Logo Card */}
            <motion.div 
              className="relative z-10 flex flex-col items-center justify-center text-center pointer-events-none"
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-[#FCF9F4] p-1 border border-[#5A1F2B]">
                <div className="border border-[#5A1F2B] px-12 py-8">
                  <h1 className="font-script text-4xl md:text-5xl text-[#5A1F2B]">
                    Beauvette
                  </h1>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation - Minimal & Refined */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#F4F2EC]/95 backdrop-blur-md border-b border-[#5A1F2B]/5">
        <div className="max-w-7xl mx-auto px-8 lg:px-16">
          <div className="flex items-center justify-between h-20">
            <a 
              href="/" 
              className="font-script text-2xl tracking-wide text-[#5A1F2B]"
              data-testid="link-brand"
            >
              {CONTENT.nav.brand}
            </a>

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

      {/* Hero Section - Full Height, Cinematic */}
      <section 
        className="relative min-h-screen flex items-center justify-center"
      >
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/attached_assets/hero-flatlay.png')" }}
        />
        {/* Garnet gradient at top */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#5A1F2B] via-[#5A1F2B]/50 to-transparent" style={{ height: '40%' }} />
        <div className="absolute inset-0 bg-[#1c1a18]/10" />
        
        {/* Beauvette at top */}
        <motion.h1 
          className="absolute top-28 left-1/2 -translate-x-1/2 z-10 font-script text-7xl md:text-8xl lg:text-9xl text-[#FAF9F6]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {CONTENT.hero.h1}
        </motion.h1>

        {/* CTA section at bottom with "Are you available?" above button */}
        <motion.div 
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-[#FAF9F6] font-light tracking-wide mb-3">
            {CONTENT.hero.h2}
          </h2>
          
          <p className="font-serif text-lg md:text-xl text-[#FAF9F6]/80 italic mb-6">
            {CONTENT.hero.subhead}
          </p>
          
          <button
            onClick={() => setLocation("/secretary")}
            className="group relative px-6 py-3 bg-[#5A1F2B] text-[#FAF9F6] text-xs uppercase tracking-[0.15em] font-medium overflow-hidden transition-all duration-500 hover:bg-[#FAF9F6] hover:text-[#5A1F2B] border border-[#5A1F2B]"
            data-testid="button-hero-primary"
          >
            {CONTENT.hero.primaryCta}
          </button>
        </motion.div>
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
