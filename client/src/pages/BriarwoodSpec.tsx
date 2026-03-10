import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function BriarwoodSpec() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1a1a1a]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-[720px] mx-auto px-6 py-12 md:py-20">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-[#888] hover:text-[#1a1a1a] mb-10 transition-colors text-sm"
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-16"
        >
          {/* Header */}
          <div>
            <p className="text-xs tracking-[0.16em] uppercase text-[#888] mb-4">Briarwood AI — Master Architecture</p>
            <h1 className="text-3xl sm:text-4xl tracking-tight leading-[1.1]" style={{ fontFamily: "'Fraunces', serif" }}>
              The Trust Verification Layer & GPS for the Agentic Economy
            </h1>
            <p className="mt-6 text-[#555] leading-relaxed">
              This is the complete system specification. Not a pitch deck. Not a feature list. This is what we are building, why it matters, and how it works -- from the assistant interface to the trillion-dollar endgame.
            </p>
          </div>

          {/* The Core Paradigm Shift */}
          <div className="space-y-6 border-t border-[#e8e2d9] pt-12">
            <p className="text-xs tracking-[0.16em] uppercase text-[#888]">The Core Paradigm Shift</p>
            <h2 className="text-xl tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              Why the physical service economy rejected software.
            </h2>
            <p className="text-[#555] leading-relaxed">
              For 20 years, Silicon Valley built "deterministic" software -- legacy CRMs, HoneyBook, Yelp. Deterministic software forces the human to do data entry so the computer can understand what happened.
            </p>
            <p className="text-[#555] leading-relaxed">
              The elite professionals who run the $20 trillion physical service economy -- event producers, private estate managers, elite chefs -- rejected this. They don't have time to "tag" a 5 AM crisis recovery in a dashboard. Their excellence lives in their invisible labor: the texts, the organic email threads, the rapid calendar adjustments, and their private word-of-mouth referral networks.
            </p>
            <div className="bg-[#3d1a22] text-[#f5f3ef] rounded-lg p-6">
              <p className="text-sm leading-relaxed font-medium">
                Because elite professionals refused to use platforms, AI agents are currently blind to the physical world.
              </p>
            </div>
          </div>

          {/* The Agentic Blind Spot */}
          <div className="space-y-6">
            <p className="text-xs tracking-[0.16em] uppercase text-[#888]">The Agentic Blind Spot</p>
            <h2 className="text-xl tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              Why we win.
            </h2>
            <p className="text-[#555] leading-relaxed">
              The tech world is obsessed with building AI agents and humanoid robots. But digital agents have no hands. When an AI agent needs to execute a task in the physical world -- book a caterer, staff a private estate, recover a broken timeline -- it cannot rely on fake Yelp reviews or SEO-optimized directories.
            </p>
            <p className="text-[#555] leading-relaxed">
              If an agent books a fake or incompetent provider, the physical outcome fails catastrophically.
            </p>
            <p className="text-[#1a1a1a] font-medium leading-relaxed">
              Agents need a map. Briarwood is the GPS for agents in the physical world.
            </p>
          </div>

          {/* 3-Phase Architecture */}
          <div className="space-y-6 border-t border-[#e8e2d9] pt-12">
            <p className="text-xs tracking-[0.16em] uppercase text-[#888]">The 3-Phase Architecture</p>
            <h2 className="text-xl tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              What we are building.
            </h2>
          </div>

          {/* Phase 1 */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#3d1a22] text-[#f5f3ef] flex items-center justify-center text-sm font-medium">1</div>
              <div>
                <p className="text-xs tracking-[0.12em] uppercase text-[#888]">Phase 1</p>
                <h3 className="text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>The Trojan Horse: Capture the Invisible Labor</h3>
              </div>
            </div>
            <p className="text-[#555] leading-relaxed">
              We do not ask the 582 million independent professionals to migrate to a new platform. We deploy seamlessly on top of where the work already happens: their existing inbox and calendar via OAuth.
            </p>
            <div className="bg-white border border-[#e8e2d9] rounded-lg p-5 space-y-4">
              <div>
                <p className="text-xs tracking-[0.1em] uppercase text-[#888] mb-2">The Mechanism</p>
                <p className="text-sm text-[#333] leading-relaxed">
                  Briarwood acts as an invisible secretary. It ingests the messy, unstructured reality of their daily coordination. It reads the raw email thread where they forwarded a client to a trusted peer. It reads the calendar blocks.
                </p>
              </div>
              <div className="border-t border-[#e8e2d9] pt-4">
                <p className="text-xs tracking-[0.1em] uppercase text-[#888] mb-2">The UX Mandate</p>
                <p className="text-sm text-[#333] leading-relaxed">
                  The interface must be invisible. It should feel like sovereign infrastructure, not a SaaS dashboard. The provider's brand stays front-and-center. We do the administrative heavy lifting (contracts, overflow routing) so they get 15 hours a week back, completely friction-free.
                </p>
              </div>
            </div>
          </div>

          {/* Phase 2 */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#3d1a22] text-[#f5f3ef] flex items-center justify-center text-sm font-medium">2</div>
              <div>
                <p className="text-xs tracking-[0.12em] uppercase text-[#888]">Phase 2</p>
                <h3 className="text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>The Math Equation: Encode Behavioral Truth</h3>
              </div>
            </div>
            <p className="text-[#555] leading-relaxed">
              As Briarwood handles the daily workflow, it is quietly watching and scoring the ground truth of human intuition.
            </p>
            <div className="bg-white border border-[#e8e2d9] rounded-lg p-5 space-y-4">
              <div>
                <p className="text-xs tracking-[0.1em] uppercase text-[#888] mb-2">The Mechanism</p>
                <p className="text-sm text-[#333] leading-relaxed">
                  We are mathematically scoring behavior. How fast do they respond? Who do they refer their overflow to when they are booked? When a timeline breaks at 5 AM, what is their recovery routing?
                </p>
              </div>
              <div className="border-t border-[#e8e2d9] pt-4">
                <p className="text-xs tracking-[0.1em] uppercase text-[#888] mb-2">The Output</p>
                <p className="text-sm text-[#333] leading-relaxed">
                  This generates the Coordination Depth Index (CDI). For the first time in history, the private, unwritten rules of word-of-mouth trust are converted into a machine-readable, un-fakeable score.
                </p>
              </div>
              <div className="border-t border-[#e8e2d9] pt-4">
                <p className="text-xs tracking-[0.1em] uppercase text-[#888] mb-2">The UX Mandate</p>
                <p className="text-sm text-[#333] leading-relaxed">
                  Visualizing the CDI should look like deep-tech infrastructure. Think node-and-edge data graphs. Show weighted decision trees that trace "Response Velocity" and "Crisis Recovery" into a single, quantified trust metric.
                </p>
              </div>
            </div>
          </div>

          {/* Phase 3 */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#3d1a22] text-[#f5f3ef] flex items-center justify-center text-sm font-medium">3</div>
              <div>
                <p className="text-xs tracking-[0.12em] uppercase text-[#888]">Phase 3</p>
                <h3 className="text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>The GPS for Agents: The API Endpoint</h3>
              </div>
            </div>
            <p className="text-[#555] leading-relaxed">
              This is the trillion-dollar endgame. When the agentic economy scales, every enterprise system, personal AI, and humanoid robot will need a way to navigate the physical service economy without catastrophic failure.
            </p>
            <div className="bg-white border border-[#e8e2d9] rounded-lg p-5 space-y-4">
              <div>
                <p className="text-xs tracking-[0.1em] uppercase text-[#888] mb-2">The Mechanism</p>
                <p className="text-sm text-[#333] leading-relaxed">
                  AI agents will hit the Briarwood API. The agent queries: "I need a verified coordinator in San Francisco who has a 99% crisis-recovery score." Briarwood routes the request directly to the exact right human.
                </p>
              </div>
              <div className="border-t border-[#e8e2d9] pt-4">
                <p className="text-xs tracking-[0.1em] uppercase text-[#888] mb-2">Owning the Outcome</p>
                <p className="text-sm text-[#333] leading-relaxed">
                  Legacy platforms own the introduction (and blame the user when it breaks). Briarwood owns the outcome because the CDI guarantees the provider's behavioral reliability.
                </p>
              </div>
              <div className="border-t border-[#e8e2d9] pt-4">
                <p className="text-xs tracking-[0.1em] uppercase text-[#888] mb-2">The Economics</p>
                <p className="text-sm text-[#333] leading-relaxed">
                  We are the mandatory toll bridge. Agents pay $0.50 per query to access the physical world's coordinates. The professionals pay a 1.5% infrastructure fee only when coordination successfully completes. No subscriptions.
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-[#3d1a22] pt-12">
            <p className="text-xs tracking-[0.16em] uppercase text-[#888] mb-4">Part II — The Assistant</p>
            <h2 className="text-2xl sm:text-3xl tracking-tight leading-[1.1]" style={{ fontFamily: "'Fraunces', serif" }}>
              How the two-way loop works.
            </h2>
            <p className="mt-4 text-[#555] leading-relaxed">
              Phase 1 is a coordination engine with a conversational interface. Not a chatbot. Not a dashboard. A private secretary that reads, prompts, acts, and learns.
            </p>
          </div>

          {/* Two-Way Loop */}
          <div className="space-y-6">
            <div className="bg-white border border-[#e8e2d9] rounded-lg overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-[#e8e2d9]">
                <div className="p-5">
                  <p className="text-xs tracking-[0.12em] uppercase text-[#888] mb-2">Direction 1</p>
                  <p className="font-medium text-sm mb-2">You tell Briarwood what to do</p>
                  <p className="text-xs text-[#666] leading-relaxed">
                    "Send proposals for these four dates. Use my standard pricing. Stanly Ranch and Montage."
                  </p>
                </div>
                <div className="p-5">
                  <p className="text-xs tracking-[0.12em] uppercase text-[#888] mb-2">Direction 2</p>
                  <p className="font-medium text-sm mb-2">Briarwood prompts you</p>
                  <p className="text-xs text-[#666] leading-relaxed">
                    "You got an inquiry for October 4th. You're already booked at Montage. Refer to your network or decline?"
                  </p>
                </div>
              </div>
            </div>
            <p className="text-[#555] leading-relaxed">
              Both directions use the same interface. The professional can initiate actions ("send this contract," "block these dates," "refer this client to Sarah") or respond to prompts from Briarwood ("new inquiry came in," "client hasn't signed yet," "you have a gap next Thursday").
            </p>
            <p className="text-[#555] leading-relaxed">
              The AI does not make judgment calls. It makes your judgment calls faster to execute. Every action either comes from you or waits for your approval. Briarwood surfaces decisions. You make them. Briarwood executes them.
            </p>
          </div>

          {/* Real Example */}
          <div className="space-y-6">
            <h2 className="text-xl tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              Real example: Solmaz's email.
            </h2>
            <div className="bg-white border border-[#e8e2d9] rounded-lg p-5">
              <p className="text-xs tracking-[0.1em] uppercase text-[#888] mb-3">Incoming email</p>
              <p className="text-sm text-[#333] leading-relaxed italic">
                "Hi Violet, Could you please send over proposals based on our conversation this morning?
              </p>
              <ul className="mt-2 space-y-1 text-sm text-[#333] italic">
                <li>April 24 — Bride hair & makeup for the rehearsal dinner (getting ready at Stanly Ranch)</li>
                <li>April 25 — Guest hair & makeup for the wedding (getting ready at Stanly Ranch)</li>
                <li>October 4 — Bride hair & makeup (by Vanessa), plus three additional people (getting ready at Montage)</li>
                <li>October 4 — Hair & makeup for three additional guests (getting ready at Montage)"</li>
              </ul>
              <p className="text-xs text-[#888] mt-3">— Solmaz Burke, Creative Designer, Burk Events</p>
            </div>

            <p className="text-sm font-medium text-[#1a1a1a]">Here's exactly what happens:</p>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#3d1a22] text-[#f5f3ef] flex items-center justify-center text-xs font-medium">1</div>
                <div>
                  <p className="font-medium text-sm">Briarwood reads and parses the email.</p>
                  <p className="text-sm text-[#555] mt-1 leading-relaxed">
                    It identifies 4 separate service line items across 3 dates. It pulls the venues (Stanly Ranch, Montage). It recognizes Vanessa as a team member on the October 4 event. It flags that October 4 has two separate service blocks at the same venue.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#3d1a22] text-[#f5f3ef] flex items-center justify-center text-xs font-medium">2</div>
                <div>
                  <p className="font-medium text-sm">Briarwood prompts you.</p>
                  <div className="bg-[#f5f3ef] border border-[#e8e2d9] rounded-lg p-4 mt-2">
                    <p className="text-sm text-[#333] leading-relaxed">
                      "I see 4 proposals needed from Solmaz at Burk Events:"
                    </p>
                    <ul className="mt-2 space-y-1.5 text-sm text-[#555]">
                      <li>Apr 24 — Bride hair & makeup, rehearsal dinner, Stanly Ranch</li>
                      <li>Apr 25 — Guest hair & makeup, wedding, Stanly Ranch</li>
                      <li>Oct 4 — Bride hair + makeup (Vanessa) + 3 guests, Montage</li>
                      <li>Oct 4 — Hair & makeup for 3 additional guests, Montage</li>
                    </ul>
                    <p className="mt-3 text-sm text-[#333]">
                      Generate contracts with your standard pricing?
                    </p>
                    <div className="mt-3 flex gap-2">
                      <span className="px-3 py-1.5 bg-[#1a1a1a] text-white text-xs rounded">Yes, send all 4</span>
                      <span className="px-3 py-1.5 border border-[#ccc] text-xs rounded text-[#555]">Let me adjust</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#3d1a22] text-[#f5f3ef] flex items-center justify-center text-xs font-medium">3</div>
                <div>
                  <p className="font-medium text-sm">You approve (or adjust).</p>
                  <p className="text-sm text-[#555] mt-1 leading-relaxed">
                    You can say "yes" and all four go out. Or you can say "make October 4 one combined contract instead of two" or "use the wedding day rate for April 25, not the standard rate" or "add a travel fee for Montage." Briarwood adjusts and regenerates.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#3d1a22] text-[#f5f3ef] flex items-center justify-center text-xs font-medium">4</div>
                <div>
                  <p className="font-medium text-sm">Briarwood executes.</p>
                  <p className="text-sm text-[#555] mt-1 leading-relaxed">
                    Contracts generated. Invoices attached. Sent to Solmaz. Calendar dates blocked. You get a copy. Done. The whole thing took 30 seconds of your time instead of 45 minutes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* What Briarwood Can Initiate */}
          <div className="space-y-6">
            <h2 className="text-xl tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              What Briarwood initiates on its own.
            </h2>
            <p className="text-[#555] leading-relaxed">
              Briarwood doesn't just wait for instructions. It monitors your business state and surfaces things that need your attention -- but it never acts without your approval on anything that matters.
            </p>
            <div className="space-y-3">
              {[
                { trigger: "New inquiry arrives", prompt: "\"New inquiry from Jessica for June 12. You're available. Want to send your info sheet and pricing?\"" },
                { trigger: "Calendar conflict detected", prompt: "\"Inquiry for October 4 but you're booked at Montage. Refer to your network? I see Sarah and Kim are available.\"" },
                { trigger: "Client hasn't signed", prompt: "\"Contract sent to Erin 3 days ago. No signature yet. Send a gentle follow-up?\"" },
                { trigger: "Deposit not paid", prompt: "\"Erin signed the contract but hasn't paid the retainer. It's been 5 days. Send a reminder?\"" },
                { trigger: "Upcoming event prep", prompt: "\"You have an event at The Four Seasons in 48 hours. Day-of schedule hasn't been sent to the client yet. Want me to generate it?\"" },
                { trigger: "Referral opportunity", prompt: "\"You declined an inquiry from Maria last week. Kim in your network is available for that date. Want to make the introduction?\"" },
                { trigger: "Gap in schedule", prompt: "\"You have no bookings for the week of March 10. Want to open availability for trial sessions?\"" },
              ].map((item, i) => (
                <div key={i} className="bg-white border border-[#e8e2d9] rounded-lg p-4">
                  <p className="text-xs tracking-[0.1em] uppercase text-[#888] mb-1">{item.trigger}</p>
                  <p className="text-sm text-[#333] italic">{item.prompt}</p>
                </div>
              ))}
            </div>
          </div>

          {/* What You Can Tell Briarwood */}
          <div className="space-y-6">
            <h2 className="text-xl tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              What you can tell Briarwood to do.
            </h2>
            <p className="text-[#555] leading-relaxed">
              You can instruct Briarwood in plain language. It understands your business context -- your pricing, your calendar, your network, your clients, your preferences.
            </p>
            <div className="space-y-3">
              {[
                "\"Send Solmaz 4 proposals for the dates she listed. Standard pricing.\"",
                "\"Block April 24 and 25 for Stanly Ranch.\"",
                "\"Refer Maria to Kim. Tell her I recommended Kim personally.\"",
                "\"Send Erin a follow-up on her contract. Keep it friendly.\"",
                "\"Generate a day-of schedule for the Four Seasons event. Hair starts at 6am, bride at 8am.\"",
                "\"What's my October looking like?\"",
                "\"How much have I booked this quarter?\"",
                "\"Remind me to follow up with Jessica next Monday.\"",
              ].map((cmd, i) => (
                <div key={i} className="bg-[#f5f3ef] border border-[#e8e2d9] rounded-lg px-4 py-3">
                  <p className="text-sm text-[#333] italic">{cmd}</p>
                </div>
              ))}
            </div>
          </div>

          {/* What the System Sees */}
          <div className="space-y-6">
            <h2 className="text-xl tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              What the system sees.
            </h2>
            <p className="text-[#555] leading-relaxed">
              Briarwood isn't guessing. Every prompt and action is grounded in real data:
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Calendar", detail: "Real-time availability, blocked dates, event locations" },
                { label: "Client history", detail: "Every inquiry, contract, payment, communication" },
                { label: "Pricing", detail: "Your rates, packages, travel fees, team rates" },
                { label: "Network", detail: "Your trusted circle -- who's available, who you refer to" },
                { label: "Contracts", detail: "Templates, terms, service items, signature status" },
                { label: "Payments", detail: "Invoices sent, deposits received, outstanding balances" },
                { label: "Communication log", detail: "Every message, follow-up, response time" },
                { label: "Behavioral patterns", detail: "Response velocity, booking rate, crisis recovery (CDI)" },
              ].map((item, i) => (
                <div key={i} className="bg-white border border-[#e8e2d9] rounded-lg p-3">
                  <p className="text-xs font-medium text-[#1a1a1a] mb-0.5">{item.label}</p>
                  <p className="text-xs text-[#888] leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* The Sovereignty Moat */}
          <div className="space-y-6 border-t border-[#e8e2d9] pt-12">
            <p className="text-xs tracking-[0.16em] uppercase text-[#888]">The Sovereignty Moat</p>
            <h2 className="text-xl tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              The non-negotiable rules.
            </h2>
            <p className="text-[#555] leading-relaxed">
              We are unifying the physical economy's coordination data, but we never compromise the professionals who generate it.
            </p>
            <div className="space-y-3">
              {[
                { rule: "Zero Data Extraction", detail: "We never contact their clients. Their proprietary coordination history and client lists are never used to train outside foundation models." },
                { rule: "Trust That Travels", detail: "Their behavioral history belongs to them. It is not locked into a marketplace ranking." },
                { rule: "No Forced Tagging", detail: "We use non-deterministic AI to understand unstructured reality. We never force the provider to do data entry." },
                { rule: "Approval Required", detail: "Briarwood never sends, signs, charges, or introduces without explicit approval. It drafts. It suggests. It prepares. But it executes nothing until you say go." },
              ].map((item, i) => (
                <div key={i} className="bg-[#3d1a22] text-[#f5f3ef] rounded-lg p-5">
                  <p className="text-xs tracking-[0.1em] uppercase text-[#f5f3ef]/50 mb-1">{item.rule}</p>
                  <p className="text-sm leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
            <p className="text-[#555] leading-relaxed">
              The only exception: auto-responses you've pre-approved (info sheets, pricing packets). Everything else waits for you. This is not a limitation. This is the product.
            </p>
          </div>

          {/* The Interface */}
          <div className="space-y-6">
            <h2 className="text-xl tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              The interface.
            </h2>
            <p className="text-[#555] leading-relaxed">
              One conversational thread per professional. Not a dashboard with 15 tabs. Not a CRM with a learning curve. A single place where Briarwood talks to you and you talk to Briarwood.
            </p>
            <p className="text-[#555] leading-relaxed">
              Think of it like texting your most competent assistant -- one who already has your calendar open, knows your pricing by heart, has every client's history at hand, and never forgets a follow-up.
            </p>
            <p className="text-[#555] leading-relaxed">
              The thread can live inside the existing dashboard. It can work over SMS. It can work through email forwarding. The channel is flexible. The intelligence underneath is the same.
            </p>
          </div>

          {/* Summary */}
          <div className="space-y-6 border-t-2 border-[#3d1a22] pt-12">
            <p className="text-xs tracking-[0.16em] uppercase text-[#888]">Summary</p>
            <h2 className="text-xl tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              What we are building.
            </h2>
            <p className="text-[#555] leading-relaxed">
              We are not building a booking app. We are taking the $20 trillion word-of-mouth economy, digitizing its behavioral truth, and making it programmable. We are building the exact mathematical equation that translates human intuition into machine-readable infrastructure.
            </p>
            <div className="bg-white border-2 border-[#3d1a22] rounded-lg p-6 space-y-3">
              <p className="text-sm text-[#333] leading-relaxed">
                <span className="font-medium">Phase 1:</span> Deploy as an invisible secretary. Capture the unstructured reality of how the best professionals actually coordinate. Give them 15 hours a week back.
              </p>
              <p className="text-sm text-[#333] leading-relaxed">
                <span className="font-medium">Phase 2:</span> Encode what we observe into the Coordination Depth Index. For the first time, make word-of-mouth trust machine-readable and un-fakeable.
              </p>
              <p className="text-sm text-[#333] leading-relaxed">
                <span className="font-medium">Phase 3:</span> Open the API. Become the mandatory toll bridge for every AI agent that needs to navigate the physical world. $0.50 per query. 1.5% on successful coordination. The GPS for the agentic economy.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-[#e8e2d9] pt-8">
            <p className="text-xs text-[#888]">Briarwood AI — Master Architecture</p>
            <p className="text-xs text-[#888] mt-1">&copy; 2026 Briarwood AI</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
