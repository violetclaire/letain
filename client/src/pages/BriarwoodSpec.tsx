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
              The quality layer of professionals who run the $20 trillion physical service economy -- event coordinators, estate managers, landscape architects, industrial designers -- rejected this. They don't have time to "tag" a 5 AM crisis recovery in a dashboard. Their excellence lives in their invisible labor: the texts, the organic email threads, the rapid calendar adjustments, and their private word-of-mouth referral networks.
            </p>
            <div className="bg-[#3d1a22] text-[#f5f3ef] rounded-lg p-6">
              <p className="text-sm leading-relaxed font-medium">
                Because the quality layer refused to use platforms, AI agents are currently blind to the physical world.
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
              The tech world is obsessed with building AI agents and humanoid robots. But digital agents have no hands. When an AI agent needs to execute a task in the physical world -- staff an estate, coordinate a multi-vendor event, recover a broken timeline -- it cannot rely on fake Yelp reviews or SEO-optimized directories.
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
              We do not ask 582 million independent professionals to migrate to a new platform. We deploy seamlessly on top of where the work already happens: their existing inbox and calendar via OAuth.
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

          {/* GPS Analogy */}
          <div className="space-y-6 border-t-2 border-[#3d1a22] pt-12">
            <p className="text-xs tracking-[0.16em] uppercase text-[#888]">The GPS Analogy</p>
            <h2 className="text-2xl tracking-tight leading-[1.15]" style={{ fontFamily: "'Fraunces', serif" }}>
              Why "GPS for agents" is not a metaphor. It's the architecture.
            </h2>
            <p className="text-[#555] leading-relaxed">
              When we say Briarwood is the GPS for agents, we mean it literally. A GPS does three things. Briarwood does the same three things for the physical service economy.
            </p>
          </div>

          {/* GPS 1: Real-time positioning */}
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-sm font-medium">1</div>
              <div>
                <p className="text-xs tracking-[0.12em] uppercase text-[#888] mb-1">Yellow Pages vs. GPS</p>
                <h3 className="text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>Real-time positioning, not a static list.</h3>
              </div>
            </div>
            <div className="bg-white border border-[#e8e2d9] rounded-lg overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-[#e8e2d9]">
                <div className="p-5">
                  <p className="text-xs tracking-[0.12em] uppercase text-[#c44] mb-2">The Old Internet</p>
                  <p className="text-sm text-[#555] leading-relaxed">
                    Yelp. Instagram. A list of names, a phone number, some curated photos. An AI agent using this is flying blind. It doesn't know if the coordinator is available this weekend. It doesn't know if the estate manager responds to emails.
                  </p>
                </div>
                <div className="p-5">
                  <p className="text-xs tracking-[0.12em] uppercase text-[#3d1a22] mb-2">Briarwood</p>
                  <p className="text-sm text-[#555] leading-relaxed">
                    Real-time positioning and dynamic routing. We know exactly who is booked, who is free, who is currently ignoring emails, and who is actively taking clients right now. No static directory. Live coordinates.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* GPS 2: Traffic conditions */}
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-sm font-medium">2</div>
              <div>
                <p className="text-xs tracking-[0.12em] uppercase text-[#888] mb-1">The Live Sensor Network</p>
                <h3 className="text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>Mapping real-time traffic.</h3>
              </div>
            </div>
            <p className="text-[#555] leading-relaxed">
              For a GPS to work, it has to know where the traffic jams are and what roads are closed.
            </p>
            <div className="bg-[#f5f3ef] border border-[#e8e2d9] rounded-lg p-5">
              <p className="text-sm text-[#333] leading-relaxed">
                Because Briarwood sits invisibly on top of the provider's Gmail and Google Calendar, it acts as a live sensor network. We know exactly who is booked, who is free, who is currently ignoring emails, and who is actively taking clients right now.
              </p>
              <p className="text-sm text-[#333] leading-relaxed mt-3">
                We don't ask the provider to "update their availability" in a dashboard (which they never do). We read the raw, non-deterministic data. We know the exact traffic conditions of the physical service economy in real-time.
              </p>
            </div>
          </div>

          {/* GPS 3: Routing algorithm */}
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-sm font-medium">3</div>
              <div>
                <p className="text-xs tracking-[0.12em] uppercase text-[#888] mb-1">The Routing Algorithm</p>
                <h3 className="text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>The CDI is the turn-by-turn directions.</h3>
              </div>
            </div>
            <p className="text-[#555] leading-relaxed">
              When you type a destination into a GPS, it doesn't send you down a dirt road because it's technically shorter. It analyzes the roads to find the most reliable route.
            </p>
            <p className="text-[#555] leading-relaxed">
              When an AI agent says, "I need a verified event coordinator in San Francisco for a 200-person dinner on Saturday," Briarwood doesn't spit out a random name. It runs the query through the Coordination Depth Index:
            </p>
            <div className="space-y-2">
              {[
                "Does this coordinator respond within 10 minutes?",
                "Do they have a 99% success rate on high-stakes events?",
                "Are they vetted by the private networks of other quality professionals?",
              ].map((q, i) => (
                <div key={i} className="bg-white border border-[#e8e2d9] rounded-lg px-4 py-3">
                  <p className="text-sm text-[#333]">{q}</p>
                </div>
              ))}
            </div>
            <p className="text-[#555] leading-relaxed">
              We aren't just giving the agent a name. We are calculating the exact behavioral route that guarantees the physical outcome.
            </p>
          </div>

          {/* GPS 4: Dynamic rerouting */}
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-sm font-medium">4</div>
              <div>
                <p className="text-xs tracking-[0.12em] uppercase text-[#888] mb-1">The Superpower</p>
                <h3 className="text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>Dynamic rerouting. The 5 AM recovery.</h3>
              </div>
            </div>
            <p className="text-[#555] leading-relaxed">
              What happens when you're driving and a tree falls across the highway? The GPS instantly recalculates and routes you around the disaster so you still reach your destination.
            </p>
            <p className="text-[#555] leading-relaxed">
              What happens when a digital agent books an event coordinator for a high-stakes private dinner, and the coordinator gets violently ill at 5 AM?
            </p>
            <div className="bg-white border border-[#e8e2d9] rounded-lg overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-[#e8e2d9]">
                <div className="p-5 bg-[#fdf5f5]">
                  <p className="text-xs tracking-[0.12em] uppercase text-[#c44] mb-2">Without Briarwood</p>
                  <p className="text-sm text-[#555] leading-relaxed">
                    The agent fails. The physical event is ruined.
                  </p>
                </div>
                <div className="p-5">
                  <p className="text-xs tracking-[0.12em] uppercase text-[#3d1a22] mb-2">With Briarwood</p>
                  <p className="text-sm text-[#555] leading-relaxed">
                    The system detects the cancellation, instantly queries the provider's trusted referral network, finds an available peer with an equal CDI score, and executes the handoff.
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-[#3d1a22] text-[#f5f3ef] rounded-lg p-6">
              <p className="text-sm leading-relaxed">
                Briarwood dynamically reroutes the physical economy to save the outcome. A digital directory just tells an agent who exists. A GPS tells an agent how to get the job done safely.
              </p>
            </div>
          </div>

          {/* Divider to Part II */}
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
                    You can say "yes" and all four go out. Or you can say "make October 4 one combined contract instead of two" or "use the event day rate for April 25, not the standard rate" or "add a travel fee for Montage." Briarwood adjusts and regenerates.
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

          {/* The Interface — Where It Lives */}
          <div className="space-y-6 border-t-2 border-[#3d1a22] pt-12">
            <p className="text-xs tracking-[0.16em] uppercase text-[#888]">Part III — Where It Lives</p>
            <h2 className="text-2xl sm:text-3xl tracking-tight leading-[1.1]" style={{ fontFamily: "'Fraunces', serif" }}>
              The interface meets you where you already are.
            </h2>
            <p className="text-[#555] leading-relaxed">
              Briarwood doesn't ask you to open a new app. It surfaces inside the tools you already use -- Gmail on your laptop, text messages on your phone.
            </p>
          </div>

          {/* Gmail Mockup */}
          <div className="space-y-5">
            <h3 className="text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              On your laptop: the Briarwood button in Gmail.
            </h3>
            <p className="text-sm text-[#555] leading-relaxed">
              A small button lives in the corner of your Gmail. Pinstripe texture. The word Briarwood. You click it and the assistant opens right there -- no new tab, no new app.
            </p>

            {/* Gmail UI Mockup */}
            <div className="bg-white border border-[#d4d4d4] rounded-lg overflow-hidden shadow-sm">
              {/* Gmail top bar */}
              <div className="bg-[#f6f8fc] border-b border-[#e0e0e0] px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f57]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#febc2e]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#28c840]"></div>
                  </div>
                  <div className="flex items-center gap-2 bg-white border border-[#ddd] rounded-full px-4 py-1.5 text-xs text-[#888] w-64">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    Search mail
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#e0e0e0]"></div>
                </div>
              </div>

              {/* Gmail body */}
              <div className="flex min-h-[320px]">
                {/* Sidebar */}
                <div className="w-16 md:w-48 border-r border-[#e0e0e0] p-3 flex-shrink-0">
                  <div className="bg-[#c2e7ff] rounded-2xl px-3 py-2 text-xs font-medium text-[#001d35] mb-1 hidden md:block">Compose</div>
                  <div className="bg-[#c2e7ff] rounded-full w-10 h-10 flex items-center justify-center md:hidden mb-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#001d35" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </div>
                  <div className="space-y-0.5 mt-2 hidden md:block">
                    <div className="text-xs py-1.5 px-3 bg-[#d3e3fd] rounded-r-full font-medium text-[#001d35]">Inbox</div>
                    <div className="text-xs py-1.5 px-3 text-[#444]">Starred</div>
                    <div className="text-xs py-1.5 px-3 text-[#444]">Sent</div>
                    <div className="text-xs py-1.5 px-3 text-[#444]">Drafts</div>
                  </div>
                </div>

                {/* Email list */}
                <div className="flex-1 relative">
                  <div className="border-b border-[#e8e8e8] px-4 py-3 hover:bg-[#f8f8f8] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#e8d5c4] flex items-center justify-center text-xs font-medium text-[#5a3e2b]">SB</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[#1a1a1a] truncate">Solmaz Burke</p>
                        <p className="text-[10px] text-[#888]">10:14 AM</p>
                      </div>
                      <p className="text-xs text-[#333] font-medium truncate">Proposals for Stanly Ranch & Montage</p>
                      <p className="text-[11px] text-[#888] truncate">Hi Violet, Could you please send over proposals based on our conversation...</p>
                    </div>
                  </div>
                  <div className="border-b border-[#e8e8e8] px-4 py-3 hover:bg-[#f8f8f8] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#d4e4d4] flex items-center justify-center text-xs font-medium text-[#2e4a2e]">EM</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-[#1a1a1a] truncate">Erin McNulty</p>
                        <p className="text-[10px] text-[#888]">9:41 AM</p>
                      </div>
                      <p className="text-xs text-[#333] truncate">Re: Contract for October 18</p>
                      <p className="text-[11px] text-[#888] truncate">Looking forward to it! I'll get the deposit sent over...</p>
                    </div>
                  </div>
                  <div className="border-b border-[#e8e8e8] px-4 py-3 hover:bg-[#f8f8f8] flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#e0d4e8] flex items-center justify-center text-xs font-medium text-[#4a2e5a]">JR</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-[#1a1a1a] truncate">Jessica Reyes</p>
                        <p className="text-[10px] text-[#888]">Yesterday</p>
                      </div>
                      <p className="text-xs text-[#333] truncate">Inquiry: June 12 Event</p>
                      <p className="text-[11px] text-[#888] truncate">Hi! I found you through Kim and would love to chat about...</p>
                    </div>
                  </div>
                  <div className="border-b border-[#e8e8e8] px-4 py-3 hover:bg-[#f8f8f8] flex items-center gap-3 opacity-50">
                    <div className="w-8 h-8 rounded-full bg-[#e0e0e0] flex items-center justify-center text-xs font-medium text-[#666]">FS</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-[#1a1a1a] truncate">Four Seasons Napa</p>
                        <p className="text-[10px] text-[#888]">Mar 7</p>
                      </div>
                      <p className="text-xs text-[#333] truncate">Vendor parking update for March events</p>
                    </div>
                  </div>

                  {/* The Briarwood Button — floating in bottom right */}
                  <div className="absolute bottom-4 right-4">
                    <div className="relative group cursor-pointer">
                      {/* Notification badge */}
                      <div className="absolute -top-2 -right-1 w-5 h-5 bg-[#c44] rounded-full flex items-center justify-center z-10">
                        <span className="text-[10px] text-white font-bold">2</span>
                      </div>
                      {/* The button */}
                      <div
                        className="rounded-lg shadow-lg overflow-hidden border border-[#555] flex items-center gap-2 px-4 py-2.5"
                        style={{
                          backgroundImage: "url(/pinstripe.jpeg)",
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }}
                      >
                        <span
                          className="text-[#e8e2d9] text-sm tracking-[0.08em]"
                          style={{ fontFamily: "'Fraunces', serif", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
                        >
                          Briarwood
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-[#888] leading-relaxed">
              The badge shows pending prompts. Click it and the assistant panel slides open alongside your inbox. You can read Solmaz's email on the left and tell Briarwood what to do on the right.
            </p>
          </div>

          {/* Briarwood Panel Open State */}
          <div className="space-y-5">
            <h3 className="text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              The panel opens. Briarwood already read the email.
            </h3>

            <div className="bg-white border border-[#d4d4d4] rounded-lg overflow-hidden shadow-sm">
              <div className="flex min-h-[380px]">
                {/* Collapsed email preview */}
                <div className="flex-1 border-r border-[#e0e0e0] p-4 bg-[#fafafa]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-[#e8d5c4] flex items-center justify-center text-xs font-medium text-[#5a3e2b]">SB</div>
                    <div>
                      <p className="text-xs font-semibold text-[#1a1a1a]">Solmaz Burke</p>
                      <p className="text-[10px] text-[#888]">to me, 10:14 AM</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#555] leading-relaxed">
                    Hi Violet, Could you please send over proposals based on our conversation this morning?
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-[#555]">
                    <li>April 24 -- Bride hair & makeup, Stanly Ranch</li>
                    <li>April 25 -- Guest hair & makeup, Stanly Ranch</li>
                    <li>Oct 4 -- Bride + 3 (Vanessa), Montage</li>
                    <li>Oct 4 -- 3 guests, Montage</li>
                  </ul>
                </div>

                {/* Briarwood Panel */}
                <div className="w-[280px] flex-shrink-0 flex flex-col"
                  style={{
                    backgroundImage: "url(/pinstripe.jpeg)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {/* Panel header */}
                  <div className="px-4 py-3 border-b border-[#555]">
                    <p className="text-[#e8e2d9] text-sm tracking-[0.06em]" style={{ fontFamily: "'Fraunces', serif", textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>
                      Briarwood
                    </p>
                  </div>

                  {/* Chat area */}
                  <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                    <div className="bg-[#f5f3ef]/95 rounded-lg p-3 shadow-sm">
                      <p className="text-xs text-[#333] leading-relaxed">
                        I see Solmaz's email. 4 proposals needed:
                      </p>
                      <ul className="mt-1.5 space-y-1 text-[11px] text-[#555]">
                        <li>Apr 24 -- Bride, rehearsal, Stanly Ranch</li>
                        <li>Apr 25 -- Guest, wedding, Stanly Ranch</li>
                        <li>Oct 4 -- Bride + 3 (Vanessa), Montage</li>
                        <li>Oct 4 -- 3 guests, Montage</li>
                      </ul>
                      <p className="mt-2 text-xs text-[#333]">
                        Standard pricing? Or adjustments?
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="bg-white/90 rounded-md px-2.5 py-1.5 text-[11px] text-[#1a1a1a] font-medium shadow-sm cursor-pointer hover:bg-white">
                        Send all 4
                      </div>
                      <div className="bg-white/70 rounded-md px-2.5 py-1.5 text-[11px] text-[#555] shadow-sm cursor-pointer hover:bg-white/90">
                        Let me adjust
                      </div>
                    </div>

                    <div className="bg-[#f5f3ef]/95 rounded-lg p-3 shadow-sm mt-2">
                      <p className="text-xs text-[#333] leading-relaxed">
                        Also -- Jessica Reyes inquired about June 12. You're available. Want to send your info sheet?
                      </p>
                      <div className="flex gap-1.5 mt-2">
                        <div className="bg-white/90 rounded-md px-2.5 py-1.5 text-[11px] text-[#1a1a1a] font-medium shadow-sm">
                          Yes, send it
                        </div>
                        <div className="bg-white/70 rounded-md px-2.5 py-1.5 text-[11px] text-[#555] shadow-sm">
                          Not yet
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Input */}
                  <div className="p-3 border-t border-[#555]">
                    <div className="bg-white/90 rounded-md px-3 py-2 text-[11px] text-[#aaa] flex items-center justify-between">
                      Tell Briarwood what to do...
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-[#888] leading-relaxed">
              Briarwood has already parsed the email and is waiting for your instruction. Two prompts queued: Solmaz's proposals and Jessica's new inquiry. One tap each.
            </p>
          </div>

          {/* Mobile / SMS Mockup */}
          <div className="space-y-5">
            <h3 className="text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              On your phone: it's a text message.
            </h3>
            <p className="text-sm text-[#555] leading-relaxed">
              When you're on your phone, Briarwood prompts you via SMS. Same intelligence. No app to open.
            </p>

            {/* iPhone text mockup */}
            <div className="max-w-[300px] mx-auto">
              <div className="bg-[#000] rounded-[2rem] p-3 shadow-xl">
                <div className="bg-[#f2f2f7] rounded-[1.5rem] overflow-hidden">
                  {/* Status bar */}
                  <div className="bg-[#f2f2f7] px-6 pt-3 pb-1 flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-[#1a1a1a]">9:41</p>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-2.5 border border-[#1a1a1a] rounded-sm relative">
                        <div className="absolute inset-0.5 bg-[#1a1a1a] rounded-[1px]" style={{ width: "70%" }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Messages header */}
                  <div className="px-4 py-2 flex items-center justify-center border-b border-[#d1d1d6]">
                    <div className="text-center">
                      <div
                        className="w-10 h-10 rounded-full mx-auto mb-1 border border-[#555] overflow-hidden"
                        style={{
                          backgroundImage: "url(/pinstripe.jpeg)",
                          backgroundSize: "cover",
                        }}
                      ></div>
                      <p className="text-xs font-semibold text-[#1a1a1a]">Briarwood</p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="px-3 py-4 space-y-2 min-h-[280px] bg-white">
                    {/* Briarwood message */}
                    <div className="flex justify-start">
                      <div className="bg-[#e5e5ea] rounded-2xl rounded-bl-md px-3.5 py-2.5 max-w-[220px]">
                        <p className="text-[13px] text-[#1a1a1a] leading-relaxed">
                          New inquiry from Jessica Reyes for June 12. You're available. Want to send your info sheet?
                        </p>
                      </div>
                    </div>
                    {/* User reply */}
                    <div className="flex justify-end">
                      <div className="bg-[#007aff] rounded-2xl rounded-br-md px-3.5 py-2.5 max-w-[220px]">
                        <p className="text-[13px] text-white leading-relaxed">
                          Yes send it
                        </p>
                      </div>
                    </div>
                    {/* Briarwood confirmation */}
                    <div className="flex justify-start">
                      <div className="bg-[#e5e5ea] rounded-2xl rounded-bl-md px-3.5 py-2.5 max-w-[220px]">
                        <p className="text-[13px] text-[#1a1a1a] leading-relaxed">
                          Done. Info sheet and pricing sent to Jessica. I blocked June 12 as tentative.
                        </p>
                      </div>
                    </div>
                    {/* Another prompt */}
                    <div className="flex justify-start">
                      <div className="bg-[#e5e5ea] rounded-2xl rounded-bl-md px-3.5 py-2.5 max-w-[220px]">
                        <p className="text-[13px] text-[#1a1a1a] leading-relaxed">
                          Solmaz sent 4 proposals to review. Want me to generate contracts with standard pricing?
                        </p>
                      </div>
                    </div>
                    {/* User reply */}
                    <div className="flex justify-end">
                      <div className="bg-[#007aff] rounded-2xl rounded-br-md px-3.5 py-2.5 max-w-[220px]">
                        <p className="text-[13px] text-white leading-relaxed">
                          Yes but add travel fee for Montage
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Input bar */}
                  <div className="px-3 py-2 border-t border-[#d1d1d6] bg-[#f2f2f7] flex items-center gap-2">
                    <div className="flex-1 bg-white border border-[#d1d1d6] rounded-full px-3 py-1.5 text-xs text-[#aaa]">
                      iMessage
                    </div>
                    <div className="w-7 h-7 rounded-full bg-[#007aff] flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-[#888] leading-relaxed text-center">
              Same conversation. Same intelligence. The channel adapts. The coordination engine underneath is identical.
            </p>
          </div>

          {/* How it's facilitated */}
          <div className="space-y-5">
            <h3 className="text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              How it's facilitated.
            </h3>
            <div className="space-y-3">
              <div className="bg-white border border-[#e8e2d9] rounded-lg p-4">
                <p className="text-xs tracking-[0.1em] uppercase text-[#888] mb-1">Gmail / Desktop</p>
                <p className="text-sm text-[#333] leading-relaxed">
                  Chrome extension or Google Workspace Add-on. Briarwood appears as a side panel in Gmail. OAuth gives us read access to the inbox. The assistant parses incoming emails and queues prompts. You respond in the panel.
                </p>
              </div>
              <div className="bg-white border border-[#e8e2d9] rounded-lg p-4">
                <p className="text-xs tracking-[0.1em] uppercase text-[#888] mb-1">SMS / Mobile</p>
                <p className="text-sm text-[#333] leading-relaxed">
                  Twilio or similar. Briarwood sends you a text when it has a prompt. You reply in plain language. "Yes send it." "Add travel fee for Montage." The system parses your intent and executes.
                </p>
              </div>
              <div className="bg-white border border-[#e8e2d9] rounded-lg p-4">
                <p className="text-xs tracking-[0.1em] uppercase text-[#888] mb-1">Web Dashboard</p>
                <p className="text-sm text-[#333] leading-relaxed">
                  The existing Briarwood dashboard has the same conversational thread built in. All three channels sync to one conversation. What you said via text shows up in the panel. What you approved in Gmail shows on mobile.
                </p>
              </div>
            </div>
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
