import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Link, Send, MessageCircle } from "lucide-react";

function GinghamPattern() {
  return (
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="gingham" patternUnits="userSpaceOnUse" width="40" height="40">
          <rect width="40" height="40" fill="#F7F2EA"/>
          <rect width="20" height="20" fill="#5A1F2B" opacity="0.3"/>
          <rect x="20" y="20" width="20" height="20" fill="#5A1F2B" opacity="0.3"/>
          <rect width="20" height="20" fill="#5A1F2B" opacity="0.3"/>
          <rect x="20" y="20" width="20" height="20" fill="#5A1F2B" opacity="0.3"/>
          <rect x="10" y="0" width="20" height="20" fill="#5A1F2B" opacity="0.15"/>
          <rect x="0" y="10" width="20" height="20" fill="#5A1F2B" opacity="0.15"/>
          <rect x="30" y="10" width="10" height="20" fill="#5A1F2B" opacity="0.15"/>
          <rect x="10" y="30" width="20" height="10" fill="#5A1F2B" opacity="0.15"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#gingham)"/>
    </svg>
  );
}

const CONTENT = {
  nav: {
    brand: "Beauvette",
    links: ["How it works", "For Artists", "For Clients"],
    cta: "Get started (Artists)"
  },
  hero: {
    h1: "Beauvette",
    h2: "Are you available?",
    subhead: "If not, who do you trust?",
    supporting: "Your operational assistant for availability and inquiries.",
    primaryCta: "Create your availability link",
    proof: "Built for artists and their clients."
  },
  howItWorks: {
    title: "How it works",
    steps: [
      {
        title: "Share your Beauvette availability link",
        body: "Artists create a custom Beauvette link and share it on their social media.",
        subBody: "Clients can view availability and request information in one place."
      },
      {
        title: "Requests and pricing are sent clearly",
        body: "When a client requests a date, they receive your pricing and details without repeated back-and-forth.",
        subBody: "Everything starts in one structured inquiry."
      },
      {
        title: "Continue the conversation if needed",
        body: "If the client wants to move forward or ask questions, they can chat with you directly inside Beauvette.",
        subBody: "Bookings, messages, referrals, and client details stay organized in one place."
      }
    ]
  },
  artists: {
    title: "For Artists",
    bullets: [
      "Availability link for your bio",
      "Auto-send pricing & details",
      "Smart referrals when you're booked",
      "One place for clients, photos, and chat (coming soon)"
    ],
    primaryCta: "Get started",
  },
  clients: {
    title: "For Clients",
    tagline: "Discover artists by date, availability, and trust.",
    bullets: [
      "Request information clearly.",
      "Move forward with confidence."
    ],
    cta: "Join the client waitlist"
  },
  footer: {
    links: ["Instagram", "Contact", "Privacy", "Terms"],
    copyright: "© Beauvette"
  }
};

export default function Landing() {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIntroComplete(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen || !introComplete) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen, introComplete]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#5A1F2B] text-[#F7F2EA] font-sans antialiased">
      {/* Gingham Elevator Doors */}
      <AnimatePresence>
        {!introComplete && (
          <>
            {/* Left Door */}
            <motion.div
              className="fixed inset-y-0 left-0 w-1/2 z-[100]"
              initial={{ x: 0 }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            >
              <GinghamPattern />
            </motion.div>
            {/* Right Door */}
            <motion.div
              className="fixed inset-y-0 right-0 w-1/2 z-[100]"
              initial={{ x: 0 }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
            >
              <GinghamPattern />
            </motion.div>
            {/* Center Logo */}
            <motion.div
              className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <h1 className="font-script text-6xl md:text-8xl text-[#5A1F2B]">Beauvette</h1>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#5A1F2B]/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a 
            href="/" 
            className="font-script text-3xl text-[#F7F2EA]"
            data-testid="link-brand"
          >
            {CONTENT.nav.brand}
          </a>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => scrollToSection("how-it-works")}
              className="text-sm text-[#F7F2EA]/70 hover:text-[#F7F2EA] transition-colors"
              data-testid="link-how-it-works"
            >
              How it works
            </button>
            <button 
              onClick={() => scrollToSection("for-artists")}
              className="text-sm text-[#F7F2EA]/70 hover:text-[#F7F2EA] transition-colors"
              data-testid="link-for-artists"
            >
              For Artists
            </button>
            <button 
              onClick={() => scrollToSection("for-clients")}
              className="text-sm text-[#F7F2EA]/70 hover:text-[#F7F2EA] transition-colors"
              data-testid="link-for-clients"
            >
              For Clients
            </button>
            <button
              onClick={() => setLocation("/onboarding")}
              className="px-5 py-2.5 bg-[#F7F2EA] text-[#5A1F2B] text-sm hover:bg-[#EDE8E0] transition-colors"
              data-testid="button-nav-cta"
            >
              {CONTENT.nav.cta}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 -mr-2 text-[#F7F2EA]"
            aria-label="Toggle menu"
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 top-[60px] bg-[#5A1F2B] z-40 px-6 py-8">
            <div className="flex flex-col gap-6">
              <button 
                onClick={() => scrollToSection("how-it-works")}
                className="text-lg text-left text-[#F7F2EA]/80 hover:text-[#F7F2EA]"
              >
                How it works
              </button>
              <button 
                onClick={() => scrollToSection("for-artists")}
                className="text-lg text-left text-[#F7F2EA]/80 hover:text-[#F7F2EA]"
              >
                For Artists
              </button>
              <button 
                onClick={() => scrollToSection("for-clients")}
                className="text-lg text-left text-[#F7F2EA]/80 hover:text-[#F7F2EA]"
              >
                For Clients
              </button>
              <button
                onClick={() => setLocation("/onboarding")}
                className="mt-4 px-6 py-3 bg-[#F7F2EA] text-[#5A1F2B] hover:bg-[#EDE8E0] transition-colors"
              >
                {CONTENT.nav.cta}
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section 
        className="px-6 pt-20 pb-24 md:pt-32 md:pb-36 relative bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/attached_assets/XjA9B4QkebdhWmwGiKohIZOvTAQ_1765779780557.avif')" }}
      >
        <div className="absolute inset-0 bg-[#5A1F2B]/60" />
        <div className="max-w-[680px] mx-auto text-center relative z-10">
          <h1 className="font-script text-6xl md:text-7xl lg:text-8xl text-[#F7F2EA] mb-6">
            {CONTENT.hero.h1}
          </h1>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-[#F7F2EA] mb-4">
            {CONTENT.hero.h2}
          </h2>
          <p className="font-serif text-xl md:text-2xl text-[#F7F2EA]/60 italic mb-6">
            {CONTENT.hero.subhead}
          </p>
          <p className="text-base md:text-lg text-[#F7F2EA]/70 mb-10 max-w-md mx-auto">
            {CONTENT.hero.supporting}
          </p>
          
          <button
            onClick={() => setLocation("/onboarding")}
            className="w-full sm:w-auto px-8 py-4 bg-[#F7F2EA] text-[#5A1F2B] text-base font-medium hover:bg-[#EDE8E0] transition-colors"
            data-testid="button-hero-primary"
          >
            {CONTENT.hero.primaryCta}
          </button>

          <p className="mt-12 text-sm text-[#F7F2EA]/50">
            {CONTENT.hero.proof}
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-6 py-20 md:py-32 bg-[#F7F2EA]">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-center text-[#5A1F2B] mb-16">
            {CONTENT.howItWorks.title}
          </h2>
          
          <div className="grid md:grid-cols-3 gap-12 md:gap-8">
            {CONTENT.howItWorks.steps.map((step, index) => (
              <div key={index} className="text-center md:text-left">
                <div className="w-12 h-12 mx-auto md:mx-0 mb-6 rounded-full bg-[#5A1F2B]/10 flex items-center justify-center">
                  {index === 0 && <Link size={20} className="text-[#5A1F2B]" />}
                  {index === 1 && <Send size={20} className="text-[#5A1F2B]" />}
                  {index === 2 && <MessageCircle size={20} className="text-[#5A1F2B]" />}
                </div>
                <h3 className="font-serif text-xl md:text-2xl text-[#5A1F2B] mb-3">
                  {step.title}
                </h3>
                <p className="text-[#5A1F2B]/70 leading-relaxed mb-3">
                  {step.body}
                </p>
                <p className="text-[#5A1F2B]/60 leading-relaxed text-sm">
                  {step.subBody}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Artists */}
      <section id="for-artists" className="px-6 py-20 md:py-32 bg-[#5A1F2B]">
        <div className="max-w-[680px] mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-[#F7F2EA] mb-10">
            {CONTENT.artists.title}
          </h2>
          
          <ul className="space-y-4 mb-12 text-left max-w-sm mx-auto">
            {CONTENT.artists.bullets.map((bullet, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 mt-2.5 rounded-full bg-[#F7F2EA] flex-shrink-0" />
                <span className="text-[#F7F2EA]/80">{bullet}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => setLocation("/onboarding")}
            className="w-full sm:w-auto px-8 py-4 bg-[#F7F2EA] text-[#5A1F2B] text-base font-medium hover:bg-[#EDE8E0] transition-colors"
            data-testid="button-artists-primary"
          >
            {CONTENT.artists.primaryCta}
          </button>
        </div>
      </section>

      {/* For Clients */}
      <section id="for-clients" className="px-6 py-20 md:py-32 bg-[#F7F2EA]">
        <div className="max-w-[680px] mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-[#5A1F2B] mb-6">
            {CONTENT.clients.title}
          </h2>
          <p className="text-xl md:text-2xl text-[#5A1F2B]/80 mb-8">
            {CONTENT.clients.tagline}
          </p>
          <div className="space-y-2 mb-12">
            {CONTENT.clients.bullets.map((bullet, index) => (
              <p key={index} className="text-lg text-[#5A1F2B]/70">
                {bullet}
              </p>
            ))}
          </div>
          <button
            onClick={() => setLocation("/waitlist")}
            className="px-8 py-4 border border-[#5A1F2B] text-[#5A1F2B] text-base font-medium hover:bg-[#5A1F2B] hover:text-[#F7F2EA] transition-colors"
            data-testid="button-clients-cta"
          >
            {CONTENT.clients.cta}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-[#F7F2EA]/10 bg-[#5A1F2B]">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              {CONTENT.footer.links.map((link, index) => (
                <a
                  key={index}
                  href={link === "Instagram" ? "https://instagram.com" : "#"}
                  className="text-sm text-[#F7F2EA]/60 hover:text-[#F7F2EA] transition-colors"
                  data-testid={`link-footer-${link.toLowerCase()}`}
                >
                  {link}
                </a>
              ))}
            </div>
            <p className="text-sm text-[#F7F2EA]/50">
              {CONTENT.footer.copyright}
            </p>
          </div>
          <div className="mt-8 text-center">
            <button
              onClick={() => setLocation("/login")}
              className="text-sm text-[#F7F2EA]/50 hover:text-[#F7F2EA] transition-colors"
              data-testid="button-sign-in"
            >
              Already using Beauvette? Sign in
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
