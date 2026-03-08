import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Inbox, CalendarCheck, Users, FileText, ArrowRight, ArrowLeft } from "lucide-react";

type Page = "landing" | "about" | "privacy";

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

function LandingPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <>
      <header className="bg-bg/95 backdrop-blur-sm border-b border-hairline">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-10 flex items-center justify-between py-4 md:py-6">
          <div className="font-serif text-lg md:text-xl tracking-tight">Briarwood</div>
          <nav className="flex items-center gap-6">
            <span className="text-sm text-[#888]">Sign in</span>
            <button className="bg-ink text-bg px-4 py-2 text-sm hover:bg-ink/90 transition-colors">
              Join the waitlist
            </button>
          </nav>
        </div>
      </header>

      <section className="relative min-h-[90vh] flex flex-col justify-center bg-[#3d1a22] text-[#f5f3ef]">
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
        <div className="max-w-[70ch] mx-auto px-6 sm:px-10 relative z-10 py-32 md:py-40">
          <motion.p
            className="text-xs tracking-[0.16em] uppercase text-[#f5f3ef]/40"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            Briarwood AI
          </motion.p>
          <motion.p
            className="mt-6 text-sm tracking-[0.12em] uppercase text-[#f5f3ef]/50"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.3 }}
          >
            Built by a professional, for professionals
          </motion.p>
          <motion.h1
            className="mt-6 text-3xl sm:text-4xl md:text-5xl leading-[1.1] tracking-tight text-[#f5f3ef] max-w-[18ch]"
            style={{ fontFamily: "'Fraunces', serif" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            You built your reputation on word of mouth. Compound it with Briarwood.
          </motion.h1>
          <motion.p
            className="mt-6 text-lg leading-relaxed text-[#f5f3ef]/70 max-w-[52ch]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
          >
            The most trusted independent professionals in the physical service economy use Briarwood to operate with the precision and permanence their reputation deserves — transforming decades of relationships, referrals, and hard-earned judgment into infrastructure that scales their business and keeps their network compounding.
          </motion.p>
          <motion.div
            className="mt-10 flex flex-col sm:flex-row gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.3 }}
          >
            <button className="bg-[#f5f3ef] px-5 py-3 text-sm font-medium text-[#0a0a0a] hover:bg-[#f5f3ef]/90 transition-colors">
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

      <section className="max-w-[70ch] mx-auto px-6 sm:px-10 py-20 md:py-28">
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl sm:text-3xl tracking-tight leading-snug max-w-[22ch]" style={{ fontFamily: "'Fraunces', serif" }}>
            Invisible labor is the engine underneath every great business built on word of mouth.
          </h2>
          <div className="space-y-5 text-[#3a3a3a] leading-relaxed">
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
          <p className="text-xl tracking-tight text-[#1a1a1a] pt-2" style={{ fontFamily: "'Fraunces', serif" }}>
            Briarwood automates the invisible labor. Your standard stays exactly what it is. The weight of holding it together alone — finally — lifts.
          </p>
        </motion.div>
      </section>

      <section id="demo" className="bg-[#f9f7f4] py-20 md:py-28">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-10">
          <motion.h2
            className="text-2xl sm:text-3xl tracking-tight text-center mb-4"
            style={{ fontFamily: "'Fraunces', serif" }}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Briarwood in action.
          </motion.h2>
          <motion.p
            className="text-center text-[#888] text-sm mb-12"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
          >
            You have a new inquiry.
          </motion.p>

          <InquiryCard />

          <div className="mt-16 space-y-20">
            <motion.div
              className="flex flex-col md:flex-row gap-8 md:gap-16 items-start"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#3d1a22] flex items-center justify-center">
                    <Inbox size={16} className="text-[#f5f3ef]" />
                  </div>
                  <span className="text-xs tracking-[0.16em] uppercase text-[#888]">01</span>
                </div>
                <h3 className="text-xl tracking-tight mb-3" style={{ fontFamily: "'Fraunces', serif" }}>Inquiry received.</h3>
                <p className="text-[#3a3a3a] leading-relaxed">
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

            <motion.div
              className="flex flex-col md:flex-row gap-8 md:gap-16 items-start"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#3d1a22] flex items-center justify-center">
                    <CalendarCheck size={16} className="text-[#f5f3ef]" />
                  </div>
                  <span className="text-xs tracking-[0.16em] uppercase text-[#888]">02</span>
                </div>
                <h3 className="text-xl tracking-tight mb-3" style={{ fontFamily: "'Fraunces', serif" }}>Calendar checked.</h3>
                <p className="text-[#3a3a3a] leading-relaxed">
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

            <motion.div
              className="flex flex-col md:flex-row gap-8 md:gap-16 items-start"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#3d1a22] flex items-center justify-center">
                    <Users size={16} className="text-[#f5f3ef]" />
                  </div>
                  <span className="text-xs tracking-[0.16em] uppercase text-[#888]">03</span>
                </div>
                <h3 className="text-xl tracking-tight mb-3" style={{ fontFamily: "'Fraunces', serif" }}>Referral activated.</h3>
                <p className="text-[#3a3a3a] leading-relaxed">
                  You're unavailable. Briarwood checks your trusted network and finds who is. One tap to refer. The introduction goes out with your name attached.
                </p>
              </div>
              <div className="flex-shrink-0 w-full md:w-auto">
                <div className="bg-white border border-[#e8e2d9] rounded-lg p-4 max-w-xs space-y-2">
                  <div className="flex items-center gap-2 text-xs text-[#1a1a1a] font-medium">
                    <Users size={12} className="text-[#3d1a22]" />
                    <span>Refer to your network</span>
                  </div>
                  <div className="text-xs text-[#888]">or</div>
                  <div className="flex items-center gap-2 text-xs text-[#1a1a1a] font-medium">
                    <Users size={12} className="text-[#3d1a22]" />
                    <span>Delegate to your team</span>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="flex flex-col md:flex-row gap-8 md:gap-16 items-start"
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#3d1a22] flex items-center justify-center">
                    <FileText size={16} className="text-[#f5f3ef]" />
                  </div>
                  <span className="text-xs tracking-[0.16em] uppercase text-[#888]">04</span>
                </div>
                <h3 className="text-xl tracking-tight mb-3" style={{ fontFamily: "'Fraunces', serif" }}>Contract and retainer sent.</h3>
                <p className="text-[#3a3a3a] leading-relaxed">
                  You're available. Client is ready. Briarwood generates the contract and invoice — $8,000, work begins in two weeks — and sends it. Done.
                </p>
              </div>
              <div className="flex-shrink-0 w-full md:w-auto">
                <motion.div
                  className="bg-white border border-[#e8e2d9] rounded-lg overflow-hidden shadow-sm max-w-sm"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2, duration: 0.4 }}
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
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <footer className="max-w-[70ch] mx-auto px-6 sm:px-10 py-12 text-sm text-[#888]">
        <div className="border-t border-[#e8e2d9] pt-8 mb-8">
          <p className="text-[#1a1a1a] text-base mb-4">Join the waitlist.</p>
          <div className="flex flex-col sm:flex-row gap-2.5 max-w-md">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 h-10 px-3 bg-[#f0ede8] border border-[#e8e2d9] text-[#1a1a1a] placeholder:text-[#999] focus:outline-none focus:border-[#1a1a1a]/40 transition-colors text-sm"
            />
            <button className="h-10 px-5 bg-[#1a1a1a] text-[#f5f3ef] text-sm font-medium hover:bg-[#1a1a1a]/90 transition-colors flex-shrink-0">
              Join
            </button>
          </div>
        </div>
        <div className="flex gap-6">
          <button onClick={() => onNavigate("about")} className="underline hover:text-[#1a1a1a] transition-colors">About</button>
          <button onClick={() => onNavigate("privacy")} className="underline hover:text-[#1a1a1a] transition-colors">Privacy</button>
          <span className="underline">Instagram</span>
          <span className="underline">Contact</span>
        </div>
        <div className="mt-6">
          <span>&copy; 2026 Briarwood AI</span>
        </div>
      </footer>
    </>
  );
}

function AboutPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <div className="max-w-[680px] mx-auto px-6 py-16 md:py-24">
      <button
        onClick={() => onNavigate("landing")}
        className="flex items-center gap-2 text-[#888] hover:text-[#1a1a1a] mb-12 transition-colors text-sm"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-xs tracking-[0.16em] uppercase text-[#888] mb-8">About</p>

        <div className="space-y-6 text-[#3a3a3a] leading-relaxed">
          <h2 className="text-2xl sm:text-3xl tracking-tight text-[#1a1a1a] leading-snug" style={{ fontFamily: "'Fraunces', serif" }}>
            Briarwood was built by someone who did this manually.
          </h2>
          <p className="text-[#1a1a1a] font-medium">
            Not as a case study. Not as a research project.<br />
            For 28 years.
          </p>
          <p>
            Violet Herod started her career at Nordstrom, where personal service is not a policy — it's a culture. That standard never left her. What she built over the next 28 years was not a business in the conventional sense. It was a reputation so precise, so reliable, that clients never needed to look anywhere else. Vendors requested to work with her by name. Referrals moved through private networks that no platform could see or touch.
          </p>
          <p>
            That didn't happen by accident. It happened because of something that has never had a name — the professional intuition to read a room, manage a vendor relationship under pressure, know exactly what a client needed before they said it, and execute without a single visible seam.
          </p>
          <p className="text-[#1a1a1a] font-medium">
            That behavioral excellence is the most valuable thing in the physical service economy.
          </p>
          <p>It has never been captured anywhere before.</p>
          <p className="text-xl text-[#1a1a1a] tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
            Briarwood captures it.
          </p>
        </div>

        <div className="border-t border-[#e8e2d9] mt-12 pt-12 space-y-6 text-[#3a3a3a] leading-relaxed">
          <h2 className="text-xl sm:text-2xl tracking-tight text-[#1a1a1a] leading-snug" style={{ fontFamily: "'Fraunces', serif" }}>
            Why we built this.
          </h2>
          <p>
            The trust networks already exist. They have existed for decades — in the relationships, the referrals, the invisible labor of the best independent professionals in the physical world.
          </p>
          <p>
            The problem was never the trust. The problem was that it lived nowhere a machine could reach. Nowhere permanent. Nowhere queryable. Nowhere that survived the professional who built it.
          </p>
          <p>
            Every other system built for this economy captures what providers claim or what clients say after the fact. Briarwood captures what actually happened — in the moment it mattered, under pressure, at stakes.
          </p>
          <p>
            That data has never existed anywhere before. We are the first to build the infrastructure to hold it. And because we built it from the inside — from 28 years of doing this work ourselves — we own the outcome in a way nobody else can.
          </p>
          <p className="text-lg text-[#1a1a1a] tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
            The networks were always there. Briarwood makes them legible for the first time.
          </p>
        </div>

        <div className="border-t border-[#e8e2d9] mt-12 pt-12 space-y-6 text-[#3a3a3a] leading-relaxed">
          <p>Dundy Pasupuleti is Briarwood's co-founder and CTO.</p>
        </div>

        <div className="border-t border-[#e8e2d9] mt-12 pt-12 space-y-3">
          <p className="text-xl text-[#1a1a1a] tracking-tight leading-snug" style={{ fontFamily: "'Fraunces', serif" }}>
            Independence. Sovereignty. Trust that travels.
          </p>
          <p className="text-[#3a3a3a] leading-relaxed">
            That is what we built our careers on.
          </p>
          <p className="text-[#1a1a1a] font-medium">
            That is what Briarwood protects.
          </p>
        </div>

        <div className="border-t border-[#e8e2d9] mt-16 pt-8">
          <p className="text-sm text-[#888]">&copy; 2026 Briarwood AI</p>
        </div>
      </motion.div>
    </div>
  );
}

function PrivacyPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <div className="max-w-[680px] mx-auto px-6 py-16 md:py-24">
      <button
        onClick={() => onNavigate("landing")}
        className="flex items-center gap-2 text-[#888] hover:text-[#1a1a1a] mb-12 transition-colors text-sm"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-xs tracking-[0.16em] uppercase text-[#888] mb-8">Privacy</p>

        <div className="space-y-6 text-[#3a3a3a] leading-relaxed">
          <h2 className="text-2xl sm:text-3xl tracking-tight text-[#1a1a1a] leading-snug" style={{ fontFamily: "'Fraunces', serif" }}>
            What you have built over decades belongs to you.
          </h2>
          <p>
            The way you handle a difficult client. The judgment call that kept a job from falling apart. The recovery behavior that nobody saw but you. The referral you made because you knew exactly who to trust.
          </p>
          <p>
            That is not operational data. That is not metadata. That is behavioral truth — inseparable from the specific professional who generated it. It took years to build. It cannot be replicated. It cannot be transferred.
          </p>
          <p className="text-xl text-[#1a1a1a] tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
            It is yours.
          </p>
        </div>

        <div className="border-t border-[#e8e2d9] mt-12 pt-12 space-y-6 text-[#3a3a3a] leading-relaxed">
          <h2 className="text-xl sm:text-2xl tracking-tight text-[#1a1a1a] leading-snug" style={{ fontFamily: "'Fraunces', serif" }}>
            Briarwood exists to make that truth legible — not to own it.
          </h2>
          <p>
            We capture behavioral excellence so it can work for the professional who built it. We do not sell it. We do not share it. We do not use it to train anyone else's model. We do not contact your clients. We do not put our name where yours belongs.
          </p>
          <p className="text-[#1a1a1a]">
            Your coordination history. Your referral network. Your client relationships. Your standards.
          </p>
          <p className="text-xl text-[#1a1a1a] tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
            Yours. Always.
          </p>
        </div>

        <div className="border-t border-[#e8e2d9] mt-12 pt-12 space-y-6 text-[#3a3a3a] leading-relaxed">
          <h2 className="text-xl sm:text-2xl tracking-tight text-[#1a1a1a] leading-snug" style={{ fontFamily: "'Fraunces', serif" }}>
            Why this matters.
          </h2>
          <p>
            The behavioral data generated inside a word of mouth business is the most valuable and most unprotected data in the professional world. It has never had infrastructure built to hold it — which means it has always been vulnerable to being lost, stolen, or simply forgotten.
          </p>
          <p className="text-lg text-[#1a1a1a] tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
            Briarwood is the first infrastructure built to protect it as seriously as it deserves.
          </p>
        </div>

        <div className="border-t border-[#e8e2d9] mt-16 pt-8">
          <p className="text-sm text-[#888]">&copy; 2026 Briarwood AI</p>
        </div>
      </motion.div>
    </div>
  );
}

export default function DemoLandingPreview() {
  const [currentPage, setCurrentPage] = useState<Page>("landing");

  return (
    <div className="min-h-screen bg-[#f5f1eb] text-[#1a1a1a]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="fixed top-0 left-0 right-0 z-[100] bg-[#1a1a1a] text-[#f5f3ef] text-xs text-center py-1.5 px-4">
        Preview Mode — 
        <button onClick={() => setCurrentPage("landing")} className={`mx-2 underline ${currentPage === 'landing' ? 'text-white font-medium' : 'text-[#999]'}`}>Landing</button>
        <button onClick={() => setCurrentPage("about")} className={`mx-2 underline ${currentPage === 'about' ? 'text-white font-medium' : 'text-[#999]'}`}>About</button>
        <button onClick={() => setCurrentPage("privacy")} className={`mx-2 underline ${currentPage === 'privacy' ? 'text-white font-medium' : 'text-[#999]'}`}>Privacy</button>
      </div>
      <div className="pt-8">
        {currentPage === "landing" && <LandingPage onNavigate={setCurrentPage} />}
        {currentPage === "about" && <AboutPage onNavigate={setCurrentPage} />}
        {currentPage === "privacy" && <PrivacyPage onNavigate={setCurrentPage} />}
      </div>
    </div>
  );
}
