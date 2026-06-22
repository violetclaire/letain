import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";

type Page = "landing" | "about" | "privacy";

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.35, ease: "easeOut" },
});

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0, y: 8 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { delay, duration: 0.35, ease: "easeOut" },
});

function LandingPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <div className="bg-[#FAF8F5] text-[#1a1a1a]" style={{ fontFamily: "'Inter', sans-serif" }}>

      <header className="fixed top-0 left-0 right-0 z-50 bg-[#FAF8F5]/95 backdrop-blur-sm border-b border-[#e8e2d9]">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-10 flex items-center justify-between py-4">
          <div className="text-base tracking-tight font-medium" style={{ fontFamily: "'Fraunces', serif" }}>Briarwood</div>
          <nav className="flex items-center gap-6">
            <button onClick={() => onNavigate("about")} className="text-sm text-[#888] hover:text-[#1a1a1a] transition-colors">About</button>
            <a href="mailto:violet@briarwood.ai" className="text-sm bg-[#1a1a1a] text-[#f5f3ef] px-4 py-2 hover:bg-[#333] transition-colors">Request a Demo</a>
          </nav>
        </div>
      </header>

      <section className="relative min-h-screen flex flex-col justify-center bg-[#3d1a22] text-[#f5f3ef] pt-16">
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: "url(/pinstripe.jpeg)",
            backgroundRepeat: "repeat",
            backgroundSize: "400px",
          }}
        />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-[#3d1a22]/60" />

        <div className="max-w-[1100px] mx-auto px-6 sm:px-10 relative z-10 py-32 md:py-40">
          <div className="max-w-[60ch]">
            <motion.p
              className="text-xs tracking-[0.18em] uppercase text-[#f5f3ef]/40 mb-6"
              {...fade(0)}
            >
              Briarwood / atbriarwood.com
            </motion.p>
            <motion.h1
              className="text-4xl sm:text-5xl md:text-6xl leading-[1.05] tracking-tight text-[#f5f3ef] mb-8"
              style={{ fontFamily: "'Fraunces', serif" }}
              {...fade(0.08)}
            >
              The trust layer for real-world coordination.
            </motion.h1>
            <motion.p
              className="text-lg sm:text-xl leading-relaxed text-[#f5f3ef]/65 mb-10 max-w-[48ch]"
              {...fade(0.16)}
            >
              Briarwood is building trust verification and coordination infrastructure for the physical economy. AI-native. Behaviorally grounded. Defensible by design.
            </motion.p>
            <motion.div className="flex flex-col sm:flex-row gap-3" {...fade(0.24)}>
              <a
                href="mailto:violet@briarwood.ai"
                className="inline-flex items-center gap-2 bg-[#f5f3ef] text-[#1a1a1a] px-6 py-3 text-sm font-medium hover:bg-white transition-colors group"
              >
                Request a Demo
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </a>
              <button
                onClick={() => onNavigate("about")}
                className="inline-flex items-center gap-2 text-sm text-[#f5f3ef]/60 hover:text-[#f5f3ef] transition-colors"
              >
                About Briarwood
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="max-w-[70ch] mx-auto px-6 sm:px-10 py-24 md:py-32">
        <motion.p className="text-xs tracking-[0.16em] uppercase text-[#888] mb-8" {...fadeIn()}>
          The problem
        </motion.p>
        <motion.div className="space-y-6 text-[#3a3a3a] leading-relaxed" {...fadeIn(0.05)}>
          <h2 className="text-2xl sm:text-3xl tracking-tight text-[#1a1a1a] leading-snug max-w-[28ch]" style={{ fontFamily: "'Fraunces', serif" }}>
            Large parts of the physical economy operate like decentralized enterprise. No software was ever built to match that reality.
          </h2>
          <p>
            Multi-party, high-stakes, outcome-driven work coordinated across private relationships, informal channels, and off-platform decisions. That is how the physical economy actually runs.
          </p>
          <p>
            The software built for these markets was designed around transactions, scheduling, and listings. Not around the thing that actually determines outcomes: trusted coordination under real constraints.
          </p>
          <p>
            As a result, the most valuable data in these markets was never captured. Not because it did not exist, but because no one built the infrastructure to record it.
          </p>
          <p className="text-[#1a1a1a] font-medium text-lg leading-snug" style={{ fontFamily: "'Fraunces', serif" }}>
            Who followed through. Who handled pressure. Who could be trusted to carry the outcome. Who was repeatedly chosen by other credible operators.
          </p>
          <p>
            That behavioral record stayed buried inside calls, texts, referrals, private chats, and exception handling. Invisible to every system ever built for this economy.
          </p>
          <p className="text-[#1a1a1a] font-medium">
            Briarwood is building the system to capture, structure, and verify that missing layer.
          </p>
        </motion.div>
      </section>

      <section className="bg-[#3d1a22] text-[#f5f3ef] py-24 md:py-32">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-10">
          <motion.div {...fadeIn()} className="mb-16">
            <p className="text-xs tracking-[0.16em] uppercase text-[#f5f3ef]/40 mb-8">Core insight</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
              <div>
                <h2 className="text-2xl sm:text-3xl tracking-tight leading-snug mb-6" style={{ fontFamily: "'Fraunces', serif" }}>
                  If FICO made creditworthiness legible for finance, CDI makes coordination reliability legible for the physical economy.
                </h2>
                <p className="text-[#f5f3ef]/65 leading-relaxed">
                  CDI, the Choreography Depth Index, is Briarwood's framework for converting repeated coordination behavior into a trust signal. Not a review. Not a rating. A private, context-sensitive metric derived from observed execution.
                </p>
              </div>
              <div className="space-y-5">
                {[
                  ["What CDI is not", "A public reputation score. A vanity ranking. A review average."],
                  ["What CDI measures", "Follow-through, repeat selection, referral quality, coordination depth, exception handling, recovery behavior, and consistency under constraint."],
                  ["What CDI answers", "Can this actor be trusted to participate in a real-world choreography — whether human, team, vendor, AI agent, or robot?"],
                ].map(([label, desc]) => (
                  <div key={label} className="border-t border-[#f5f3ef]/10 pt-5">
                    <p className="text-xs tracking-[0.12em] uppercase text-[#f5f3ef]/40 mb-2">{label}</p>
                    <p className="text-sm text-[#f5f3ef]/70 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-10">
          <motion.p className="text-xs tracking-[0.16em] uppercase text-[#888] mb-4" {...fadeIn()}>
            Product architecture
          </motion.p>
          <motion.h2
            className="text-2xl sm:text-3xl tracking-tight mb-16 max-w-[32ch]"
            style={{ fontFamily: "'Fraunces', serif" }}
            {...fadeIn(0.05)}
          >
            Five layers. Each one builds on the last.
          </motion.h2>

          <div className="space-y-0">
            {[
              {
                num: "01",
                title: "Coordination Capture",
                body: "Informal real-world coordination — referrals, handoffs, exception handling, plan changes — disappears from software the moment it happens. Briarwood is designed to capture the coordination layer beneath the transaction, so the system can observe not just that work happened, but how trust and execution actually moved.",
                tag: "Turn fragmented workflow behavior into measurable coordination data.",
              },
              {
                num: "02",
                title: "Behavioral Trust Data",
                body: "The important signals are not generic business metadata. They are behavioral: who gets chosen repeatedly, who is referred by trusted operators, who performs reliably under pressure, who adapts when conditions change. This is the layer where invisible labor stops disappearing and becomes structured information.",
                tag: "A private dataset of execution reliability and coordination behavior.",
              },
              {
                num: "03",
                title: "Trust Verification",
                body: "CDI converts raw behavioral data into trust primitives. Just as FICO gave financial systems a way to assess borrower risk, CDI gives physical-world systems a way to assess execution trust — reliability, coordination depth, recovery behavior, and trustworthiness in context.",
                tag: "Verified trust signals that other systems, agents, and workflows can use.",
              },
              {
                num: "04",
                title: "Routing and Orchestration",
                body: "Once trust is legible, systems can make better decisions. Who should do this job, in what sequence, under what conditions, with what level of confidence, and based on what history of trusted execution. This is where intelligence becomes operational — and where AI agents enter the physical economy with credibility.",
                tag: "Route work based on verified trust, execution fit, and context.",
              },
              {
                num: "05",
                title: "Proof of Execution",
                body: "In the physical economy, action is not enough. Outcomes have to be verified. Briarwood is building toward a system where completion can be confirmed, not merely claimed — through workflow evidence, completion signals, and coordination artifacts. Trust systems break if they rely on claims alone.",
                tag: "Verify that the real-world outcome occurred as expected.",
              },
            ].map((layer, i) => (
              <motion.div
                key={layer.num}
                className="grid grid-cols-1 md:grid-cols-[100px_1fr] gap-6 md:gap-12 py-10 border-t border-[#e8e2d9]"
                {...fadeIn(i * 0.04)}
              >
                <div>
                  <span className="text-xs font-mono text-[#3d1a22] font-medium">{layer.num}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_280px] gap-8">
                  <div>
                    <h3 className="text-lg tracking-tight mb-3 font-medium" style={{ fontFamily: "'Fraunces', serif" }}>{layer.title}</h3>
                    <p className="text-[#3a3a3a] leading-relaxed text-sm">{layer.body}</p>
                  </div>
                  <div className="sm:border-l sm:border-[#e8e2d9] sm:pl-8">
                    <p className="text-xs text-[#888] leading-relaxed italic">{layer.tag}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#f0ece6] py-24 md:py-32">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-10">
          <motion.p className="text-xs tracking-[0.16em] uppercase text-[#888] mb-8" {...fadeIn()}>
            Why this is defensible
          </motion.p>
          <motion.div className="grid grid-cols-1 md:grid-cols-2 gap-16" {...fadeIn(0.05)}>
            <div>
              <h2 className="text-2xl sm:text-3xl tracking-tight leading-snug mb-6" style={{ fontFamily: "'Fraunces', serif" }}>
                The moat is not a model. The moat is the dataset and the system design required to produce it.
              </h2>
              <p className="text-[#3a3a3a] leading-relaxed mb-6">
                Public reviews do not create this data. Transaction logs do not create this data. Scheduling tools do not create this data. A large language model alone does not create this data.
              </p>
              <p className="text-[#3a3a3a] leading-relaxed">
                This data only becomes available when software is built with the right understanding of how real-world coordination actually works. That makes Briarwood's advantage structural.
              </p>
            </div>
            <div className="space-y-4">
              {[
                "Private",
                "Behavioral",
                "Embedded in coordination",
                "Difficult to scrape",
                "Difficult to synthesize",
                "Historically uncaptured",
              ].map((trait) => (
                <div key={trait} className="flex items-center gap-3 py-3 border-b border-[#e8e2d9]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3d1a22] shrink-0" />
                  <span className="text-sm text-[#1a1a1a]">{trait}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="max-w-[70ch] mx-auto px-6 sm:px-10">
          <motion.p className="text-xs tracking-[0.16em] uppercase text-[#888] mb-8" {...fadeIn()}>
            Why now
          </motion.p>
          <motion.div className="space-y-10" {...fadeIn(0.05)}>
            <h2 className="text-2xl sm:text-3xl tracking-tight leading-snug" style={{ fontFamily: "'Fraunces', serif" }}>
              Three shifts are making this problem urgent.
            </h2>
            <div className="space-y-8">
              {[
                {
                  label: "AI is moving from content generation to action.",
                  body: "As software begins to coordinate workflows, make recommendations, and initiate tasks on behalf of humans, it runs directly into the trust problem. In the physical world, bad routing has real consequences. Systems need a credible way to know whom to trust and when.",
                },
                {
                  label: "The physical economy is coming online without a native trust layer.",
                  body: "Large parts of real-world work are still managed through fragmented tools, memory, reputation, and manual oversight. That makes these markets hard to automate and hard to scale intelligently.",
                },
                {
                  label: "Software is being rebuilt around agents, APIs, and orchestration.",
                  body: "As specialized models, agent-first tools, and headless software stacks emerge, the missing piece is not only intelligence. It is the layer that routes correctly, understands context, and verifies outcomes. In the physical economy, that layer must be grounded in real execution behavior.",
                },
              ].map((item, i) => (
                <div key={i} className="border-l-2 border-[#3d1a22]/20 pl-6">
                  <p className="text-[#1a1a1a] font-medium mb-2 text-sm">{item.label}</p>
                  <p className="text-[#3a3a3a] leading-relaxed text-sm">{item.body}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-[#3d1a22] text-[#f5f3ef] py-24 md:py-32">
        <div className="max-w-[70ch] mx-auto px-6 sm:px-10">
          <motion.p className="text-xs tracking-[0.16em] uppercase text-[#f5f3ef]/40 mb-8" {...fadeIn()}>
            Long-term vision
          </motion.p>
          <motion.div className="space-y-6" {...fadeIn(0.05)}>
            <h2 className="text-2xl sm:text-3xl tracking-tight leading-snug" style={{ fontFamily: "'Fraunces', serif" }}>
              In finance, systems scaled when credit became legible. In the physical economy, machine-mediated work will scale when trust becomes legible.
            </h2>
            <p className="text-[#f5f3ef]/65 leading-relaxed">
              If trusted execution can be made legible, then the physical economy gains a missing primitive. That primitive can support better matching and routing, service guarantees, dynamic pricing based on reliability, underwriting and insurance, machine-mediated negotiations, autonomous service coordination, and entirely new forms of economic participation built on verified real-world trust.
            </p>
            <p className="text-[#f5f3ef]/65 leading-relaxed">
              In the same way that credit scores, payments infrastructure, and APIs unlocked financial systems, trust verification infrastructure can unlock a new generation of systems for real-world coordination.
            </p>
            <p className="text-[#f5f3ef] font-medium text-lg" style={{ fontFamily: "'Fraunces', serif" }}>
              Briarwood's ambition is to become that foundational layer.
            </p>
          </motion.div>

          <motion.div className="mt-16 pt-12 border-t border-[#f5f3ef]/10" {...fadeIn(0.1)}>
            <p className="text-[#f5f3ef]/50 text-sm mb-6">Ready to learn more?</p>
            <a
              href="mailto:violet@briarwood.ai"
              className="inline-flex items-center gap-2 bg-[#f5f3ef] text-[#1a1a1a] px-6 py-3 text-sm font-medium hover:bg-white transition-colors group"
            >
              Request a Demo
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </a>
          </motion.div>
        </div>
      </section>

      <footer className="max-w-[1100px] mx-auto px-6 sm:px-10 py-10 border-t border-[#e8e2d9]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <span className="text-sm text-[#888]">&copy; 2026 Briarwood AI</span>
          <div className="flex gap-6">
            <button onClick={() => onNavigate("about")} className="text-sm text-[#888] underline hover:text-[#1a1a1a] transition-colors">About</button>
            <button onClick={() => onNavigate("privacy")} className="text-sm text-[#888] underline hover:text-[#1a1a1a] transition-colors">Privacy</button>
            <a href="mailto:violet@briarwood.ai" className="text-sm text-[#888] underline hover:text-[#1a1a1a] transition-colors">Contact</a>
          </div>
        </div>
      </footer>

    </div>
  );
}

function AboutPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <div className="bg-[#FAF8F5] min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-[680px] mx-auto px-6 py-16 md:py-24">
        <button
          onClick={() => onNavigate("landing")}
          className="flex items-center gap-2 text-[#888] hover:text-[#1a1a1a] mb-12 transition-colors text-sm"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <p className="text-xs tracking-[0.16em] uppercase text-[#888] mb-8">About</p>
          <div className="space-y-6 text-[#3a3a3a] leading-relaxed">
            <h2 className="text-2xl sm:text-3xl tracking-tight text-[#1a1a1a] leading-snug" style={{ fontFamily: "'Fraunces', serif" }}>
              Briarwood was built from lived operational knowledge of high-stakes, multi-party coordination in the physical economy.
            </h2>
            <p>
              Not from abstract theory. Not from a case study. From 28 years of doing this work — building a reputation so precise, so reliable, that clients never needed to look anywhere else. Vendors requested to work with her by name. Referrals moved through private networks that no platform could see or touch.
            </p>
            <p>
              That didn't happen by accident. It happened because of something that has never had a name — the professional intuition to read a room, manage a vendor relationship under pressure, know exactly what a client needed before they said it, and execute without a single visible seam.
            </p>
            <p className="text-[#1a1a1a] font-medium">
              That behavioral excellence is the most valuable thing in the physical service economy. It has never been captured anywhere before.
            </p>
            <p className="text-xl text-[#1a1a1a] tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              Briarwood captures it.
            </p>
          </div>
          <div className="border-t border-[#e8e2d9] mt-12 pt-12 space-y-6 text-[#3a3a3a] leading-relaxed">
            <h2 className="text-xl sm:text-2xl tracking-tight text-[#1a1a1a] leading-snug" style={{ fontFamily: "'Fraunces', serif" }}>
              Founder-market fit matters here.
            </h2>
            <p>
              This category cannot be understood from surface-level software patterns alone. The hard part is not building another tool. The hard part is correctly identifying the missing primitive.
            </p>
            <p>
              We understand this category from the inside: how outcomes are actually delivered, where trust is earned, how failure propagates, how informal referrals carry more signal than public reputation, and why existing software missed the real work.
            </p>
            <p>
              Briarwood's technical work centers on coordination assessment, signal provenance, and safe handoff review.
            </p>
          </div>
          <div className="border-t border-[#e8e2d9] mt-12 pt-12 space-y-3">
            <p className="text-xl text-[#1a1a1a] tracking-tight leading-snug" style={{ fontFamily: "'Fraunces', serif" }}>
              The physical economy does not need more generic software layered on top of broken trust assumptions.
            </p>
            <p className="text-[#3a3a3a] leading-relaxed">
              It needs a new system for making trust legible, verifiable, and usable.
            </p>
            <p className="text-[#1a1a1a] font-medium">
              That is what Briarwood is building.
            </p>
          </div>
          <div className="border-t border-[#e8e2d9] mt-16 pt-8">
            <p className="text-sm text-[#888]">&copy; 2026 Briarwood AI</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function PrivacyPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <div className="bg-[#FAF8F5] min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-[680px] mx-auto px-6 py-16 md:py-24">
        <button
          onClick={() => onNavigate("landing")}
          className="flex items-center gap-2 text-[#888] hover:text-[#1a1a1a] mb-12 transition-colors text-sm"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <p className="text-xs tracking-[0.16em] uppercase text-[#888] mb-8">Privacy</p>
          <div className="space-y-6 text-[#3a3a3a] leading-relaxed">
            <h2 className="text-2xl sm:text-3xl tracking-tight text-[#1a1a1a] leading-snug" style={{ fontFamily: "'Fraunces', serif" }}>
              What you have built over decades belongs to you.
            </h2>
            <p>
              The coordination data Briarwood captures belongs to the operators who generate it. We are building infrastructure, not a data marketplace. The signals that make trust legible are held privately, not exposed publicly.
            </p>
            <p>
              Briarwood is designed around the principle that behavioral trust data is the most sensitive asset in a professional's career. It will be treated accordingly.
            </p>
            <p>
              We do not sell data. We do not surface individual behavioral records publicly. We do not expose operator or client data to third parties without explicit consent.
            </p>
            <p className="text-[#1a1a1a] font-medium">
              Trust infrastructure that cannot be trusted with your data is not trust infrastructure.
            </p>
          </div>
          <div className="border-t border-[#e8e2d9] mt-16 pt-8">
            <p className="text-sm text-[#888]">&copy; 2026 Briarwood AI</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function DemoLandingPreview() {
  const [page, setPage] = useState<Page>("landing");

  return (
    <>
      {page === "landing" && <LandingPage onNavigate={setPage} />}
      {page === "about" && <AboutPage onNavigate={setPage} />}
      {page === "privacy" && <PrivacyPage onNavigate={setPage} />}
    </>
  );
}
