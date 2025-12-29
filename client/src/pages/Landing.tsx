import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const CONTENT = {
  nav: {
    brand: "Your Private Secretary",
    cta: "Get your private link"
  },
  hero: {
    label: "Built by a professional, for professionals",
    h1: "The invisible layer behind your business.",
    subline: "This is how we've worked for decades. Now it's programmable infrastructure for the modern era.",
    notList: [
      "Your clients only see your brand.",
      "Never ours.",
      "That's the point."
    ],
    primaryCta: "Get your private link",
    secondaryCta: "How it works"
  },
  howItWorks: {
    title: "How it fits into your business",
    steps: [
      {
        num: "01",
        title: "Your link, your brand",
        body: "Add our invisible code to your website's contact page. Clients fill out inquiries on your site and see your confirmation. Never leave your domain, never see our name. Share your own website link on Instagram, in emails, anywhere. Your brand only."
      },
      {
        num: "02",
        title: "Your availability, answered",
        body: "Block the dates you're booked. The rest stay open for inquiries. No instant booking. That's not how we run our business. We work on the most important days of people's lives. Auto-reply with your info sheet? One click."
      },
      {
        num: "03",
        title: "You decide once. We execute.",
        decisions: [
          { action: "Accept", result: "Contract generated (your terms), invoice sent, calendar blocked, client notified" },
          { action: "Refer", result: "Client introduced to trusted artist, you stay copied, referral tracked" },
          { action: "Decline", result: "Professional response sent, inquiry archived, relationship maintained" }
        ]
      }
    ],
    tagline: "High-stakes coordination executed flawlessly. Every time."
  },
  network: {
    headline: "Independence doesn't mean isolation.",
    body: "When you're booked, refer clients to artists you trust. Without losing the relationship.",
    description: "A private, artist-led network built on reputation and reciprocity.",
    tagline: "Real independence.",
    notList: [
      "Not rankings",
      "Not bidding",
      "Not a race to the bottom"
    ]
  },
  privacy: {
    headline: "Your clients. Your data.",
    points: [
      "We never contact your clients",
      "Your business name on every contract and invoice",
      "No competing brand in their inbox",
      "Infrastructure that disappears"
    ]
  },
  pricing: {
    headline: "We earn when you do.",
    fee: "1.5% infrastructure fee on top of what we already pay to process payments.",
    noSubscription: "No subscriptions. No monthly charges.",
    example: "$500 booking = $7.50 platform fee",
    keepLine: "",
    comparison: ""
  },
  proof: {
    headline: "Volume I: Live in production",
    stat: "$6,000 processed last week.",
    details: "2 contracts signed. 2 invoices paid. Zero client logins required.",
    narrative: [
      "This is how trusted professionals have coordinated for decades. Inquiry, assessment, response, execution.",
      "Now it's programmable infrastructure.",
      "Built by a professional who did this manually for 16 years in the beauty industry. $1M+ coordinated the old way. Now deployed as infrastructure for the modern era."
    ],
    volExplainer: "Volume I is for artists. You're the foundation, the trusted professionals clients are looking for. Volume II brings client search to you. But first, we build the network that deserves them.",
    cta: "Get your private link"
  },
  footer: {
    links: ["Instagram", "Contact", "Privacy"],
    copyright: "© 2025 Your Private Secretary"
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
      {/* Top Bar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-bg/95 backdrop-blur-sm">
        <div className="estate-container flex items-center justify-between py-8">
          <div className="font-serif text-xl tracking-tight">Your Private Secretary</div>
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => window.location.href = "https://dateinquiry.com/artist-login"}
              className="text-sm text-muted-ink hover:text-ink transition-colors"
              data-testid="button-nav-login"
            >
              Artist Login
            </button>
            <button
              onClick={() => setLocation("/secretary")}
              className="bg-ink text-bg px-4 py-2 text-sm hover:bg-ink/90 transition-colors"
              data-testid="button-nav-cta"
            >
              Get started
            </button>
          </nav>
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
                  onClick={() => { setMobileMenuOpen(false); window.location.href = "https://dateinquiry.com/artist-login"; }}
                  className="text-lg"
                  data-testid="button-mobile-login"
                >
                  Artist Login
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); setLocation("/secretary"); }}
                  className="text-lg font-medium"
                  data-testid="button-mobile-get-started"
                >
                  Get started
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section - Dark Pinstripe */}
      <section className="relative min-h-screen flex flex-col justify-center bg-[#3d1a22] text-[#f5f3ef] -mx-6 md:-mx-12 px-6 md:px-12">
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
          className="absolute inset-0 pointer-events-none opacity-60 mix-blend-overlay"
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
          className="mt-6 text-xl leading-relaxed text-[#f5f3ef]/80 italic"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3, ease: "easeOut" }}
        >
          {CONTENT.hero.subline}
        </motion.p>
        <motion.p 
          className="mt-4 text-lg leading-relaxed text-[#f5f3ef]/60"
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
              {'body' in step && <p className="mt-3 text-mutedink leading-relaxed">{step.body}</p>}
              {'decisions' in step && step.decisions && (
                <div className="mt-4 space-y-2">
                  {step.decisions.map((decision: { action: string; result: string }, i: number) => (
                    <div key={i} className="flex items-start gap-3 text-mutedink">
                      <span className="font-medium text-ink min-w-[70px]">{decision.action}</span>
                      <span className="text-faintink">→</span>
                      <span>{decision.result}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
        
        {CONTENT.howItWorks.tagline && (
          <motion.p 
            className="mt-12 font-serif text-xl text-ink tracking-tight"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.3, ease: "easeOut" }}
          >
            {CONTENT.howItWorks.tagline}
          </motion.p>
        )}
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
        <motion.p 
          className="mt-4 font-serif text-xl tracking-tight"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
        >
          {CONTENT.network.tagline}
        </motion.p>
        <motion.ul 
          className="mt-8 space-y-1 text-mutedink"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25, duration: 0.3, ease: "easeOut" }}
        >
          {CONTENT.network.notList.map((line, i) => (
            <li key={i} className="text-faintink">{line}</li>
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
          className="mt-4 text-lg text-ink"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
        >
          {CONTENT.pricing.fee}
        </motion.p>
        <motion.p 
          className="mt-2 text-mutedink"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.3, ease: "easeOut" }}
        >
          {CONTENT.pricing.noSubscription}
        </motion.p>
        <motion.p 
          className="mt-6 font-serif text-xl text-ink"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
        >
          {CONTENT.pricing.example}
        </motion.p>
        <motion.p 
          className="mt-4 text-mutedink leading-relaxed"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25, duration: 0.3, ease: "easeOut" }}
        >
          {CONTENT.pricing.keepLine}
        </motion.p>
        {CONTENT.pricing.comparison && (
          <motion.p 
            className="mt-6 text-faintink text-sm"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.3, ease: "easeOut" }}
          >
            {CONTENT.pricing.comparison}
          </motion.p>
        )}
      </section>

      {/* Proof Section */}
      <section className="estate-prose py-16 md:py-20 border-t border-hairline">
        <motion.h2 
          className="text-2xl sm:text-3xl tracking-tight"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {CONTENT.proof.headline}
        </motion.h2>
        <motion.p 
          className="mt-6 font-serif text-2xl text-ink"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1, duration: 0.3, ease: "easeOut" }}
        >
          {CONTENT.proof.stat}
        </motion.p>
        <motion.p 
          className="mt-2 text-mutedink"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.3, ease: "easeOut" }}
        >
          {CONTENT.proof.details}
        </motion.p>
        <div className="mt-8 space-y-4">
          {CONTENT.proof.narrative.map((line, i) => (
            <motion.p 
              key={i}
              className="text-mutedink leading-relaxed"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + i * 0.05, duration: 0.3, ease: "easeOut" }}
            >
              {line}
            </motion.p>
          ))}
        </div>
        <motion.p 
          className="mt-8 text-ink font-medium leading-relaxed"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.3, ease: "easeOut" }}
        >
          {CONTENT.proof.volExplainer}
        </motion.p>
        <motion.div 
          className="mt-8"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.3, ease: "easeOut" }}
        >
          <button
            onClick={() => setLocation("/secretary")}
            className="bg-ink text-bg px-5 py-3 text-sm font-medium hover:bg-ink/90 transition-colors"
            data-testid="button-proof-cta"
          >
            {CONTENT.proof.cta}
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="estate-prose py-12 pb-20 md:pb-16 text-sm text-mutedink">
        <div className="flex gap-6">
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
            href="mailto:support@dateinquiry.com" 
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
