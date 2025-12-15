import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Menu, X, Play, Calendar, Send, Users } from "lucide-react";

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
    secondaryCta: "Watch how it works",
    proof: "Built for artists and their clients."
  },
  video: {
    overlay: "Imagine less stress.",
    src: "/assets/beauvette-loop.mp4",
    poster: "/assets/beauvette-poster.jpg"
  },
  howItWorks: {
    title: "How it works",
    steps: [
      {
        title: "Set availability once",
        body: "Click the dates you're booked. Share your link in bio."
      },
      {
        title: "Clients request a date",
        body: "They tap your link and request their wedding/event date."
      },
      {
        title: "Beauvette handles the rest",
        body: "If you're available, pricing + details send automatically. If not, it checks your trusted referrals."
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
    secondaryCta: "See an example"
  },
  clients: {
    title: "For Clients",
    copy: "Find artists by date. Get answers instantly. No waiting on DMs.",
    cta: "Join the client waitlist"
  },
  testimonial: {
    quote: "This saved me hours of back-and-forth.",
    name: "— Makeup Artist, Santa Barbara"
  },
  footer: {
    links: ["Instagram", "Contact", "Privacy", "Terms"],
    copyright: "© Beauvette"
  }
};

export default function Landing() {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [videoError, setVideoError] = useState(false);

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
    <div className="min-h-screen bg-[#5A1F2B] text-[#F7F2EA] font-sans antialiased">
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
      <section className="px-6 pt-20 pb-24 md:pt-32 md:pb-36">
        <div className="max-w-[680px] mx-auto text-center">
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
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setLocation("/onboarding")}
              className="w-full sm:w-auto px-8 py-4 bg-[#F7F2EA] text-[#5A1F2B] text-base font-medium hover:bg-[#EDE8E0] transition-colors"
              data-testid="button-hero-primary"
            >
              {CONTENT.hero.primaryCta}
            </button>
            <button
              onClick={() => scrollToSection("video")}
              className="flex items-center gap-2 text-[#F7F2EA] hover:text-[#F7F2EA]/80 transition-colors"
              data-testid="button-hero-secondary"
            >
              <Play size={18} />
              <span className="text-base">{CONTENT.hero.secondaryCta}</span>
            </button>
          </div>

          <p className="mt-12 text-sm text-[#F7F2EA]/50">
            {CONTENT.hero.proof}
          </p>
        </div>
      </section>

      {/* Video Section */}
      <section id="video" className="py-16 md:py-24">
        <div className="relative w-full aspect-video max-w-5xl mx-auto overflow-hidden">
          {!videoError ? (
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={CONTENT.video.poster}
              onError={() => setVideoError(true)}
              className="w-full h-full object-cover"
            >
              <source src={CONTENT.video.src} type="video/mp4" />
            </video>
          ) : (
            <div className="w-full h-full bg-[#4A1823] flex items-center justify-center">
              <div className="text-center">
                <Play size={48} className="mx-auto mb-4 text-[#F7F2EA]/40" />
                <p className="text-[#F7F2EA]/50">Video coming soon</p>
              </div>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="font-serif text-2xl md:text-4xl text-[#F7F2EA] drop-shadow-lg">
              {CONTENT.video.overlay}
            </p>
          </div>
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
                  {index === 0 && <Calendar size={20} className="text-[#5A1F2B]" />}
                  {index === 1 && <Send size={20} className="text-[#5A1F2B]" />}
                  {index === 2 && <Users size={20} className="text-[#5A1F2B]" />}
                </div>
                <h3 className="font-serif text-xl md:text-2xl text-[#5A1F2B] mb-3">
                  {step.title}
                </h3>
                <p className="text-[#5A1F2B]/70 leading-relaxed">
                  {step.body}
                </p>
                {index < 2 && (
                  <div className="hidden md:block mt-8 border-b border-[#5A1F2B]/10" />
                )}
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

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setLocation("/onboarding")}
              className="w-full sm:w-auto px-8 py-4 bg-[#F7F2EA] text-[#5A1F2B] text-base font-medium hover:bg-[#EDE8E0] transition-colors"
              data-testid="button-artists-primary"
            >
              {CONTENT.artists.primaryCta}
            </button>
            <button
              onClick={() => setLocation("/sarah")}
              className="text-[#F7F2EA] hover:text-[#F7F2EA]/80 underline underline-offset-4 transition-colors"
              data-testid="button-artists-secondary"
            >
              {CONTENT.artists.secondaryCta}
            </button>
          </div>
        </div>
      </section>

      {/* For Clients */}
      <section id="for-clients" className="px-6 py-20 md:py-32 bg-[#F7F2EA]">
        <div className="max-w-[680px] mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl text-[#5A1F2B] mb-6">
            {CONTENT.clients.title}
          </h2>
          <p className="text-lg text-[#5A1F2B]/70 mb-10">
            {CONTENT.clients.copy}
          </p>
          <button
            onClick={() => setLocation("/waitlist")}
            className="px-8 py-4 border border-[#5A1F2B] text-[#5A1F2B] text-base font-medium hover:bg-[#5A1F2B] hover:text-[#F7F2EA] transition-colors"
            data-testid="button-clients-cta"
          >
            {CONTENT.clients.cta}
          </button>
        </div>
      </section>

      {/* Testimonial */}
      <section className="px-6 py-20 md:py-32 bg-[#5A1F2B]">
        <div className="max-w-[680px] mx-auto text-center">
          <blockquote className="font-serif text-2xl md:text-3xl text-[#F7F2EA] italic mb-6">
            "{CONTENT.testimonial.quote}"
          </blockquote>
          <p className="text-[#F7F2EA]/60">
            {CONTENT.testimonial.name}
          </p>
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
