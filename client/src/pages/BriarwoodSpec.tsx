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
              Coordination intelligence for trust-based physical services.
            </h1>
            <p className="mt-6 text-[#555] leading-relaxed">
              Briarwood sits on top of inbox and calendar workflows, reduces administrative load, and converts real coordination behavior into machine-readable trust infrastructure.
            </p>
            <p className="mt-3 text-[#555] leading-relaxed">
              This is a systems document. What exists now, what we are building next, and what becomes possible if the model works at scale.
            </p>
          </div>

          {/* Why software failed */}
          <div className="space-y-6 border-t border-[#e8e2d9] pt-12">
            <p className="text-xs tracking-[0.16em] uppercase text-[#888]">The Problem</p>
            <h2 className="text-xl tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              Why software failed the trust-based service economy.
            </h2>
            <p className="text-[#555] leading-relaxed">
              For 20 years, Silicon Valley built deterministic software -- legacy CRMs, HoneyBook, Yelp. Deterministic software forces the human to do data entry so the computer can understand what happened.
            </p>
            <p className="text-[#555] leading-relaxed">
              The quality layer of professionals who run the physical service economy -- event coordinators, estate managers, landscape architects, high-end beauty services, industrial designers -- rejected this. They don't have time to tag a 5 AM crisis recovery in a dashboard. Their excellence lives in their invisible labor: the texts, the organic email threads, the rapid calendar adjustments, and their private word-of-mouth referral networks.
            </p>
            <div className="bg-[#3d1a22] text-[#f5f3ef] rounded-lg p-6">
              <p className="text-sm leading-relaxed font-medium">
                Because the quality layer refused to use platforms, AI agents have no reliable way to navigate the physical world.
              </p>
            </div>
          </div>

          {/* The Blind Spot */}
          <div className="space-y-6">
            <p className="text-xs tracking-[0.16em] uppercase text-[#888]">The Opportunity</p>
            <h2 className="text-xl tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              The agentic blind spot.
            </h2>
            <p className="text-[#555] leading-relaxed">
              AI agents are proliferating. But when an agent needs to execute a task in the physical world -- staff an estate, coordinate a multi-vendor event, recover a broken timeline -- it cannot rely on fake Yelp reviews or SEO-optimized directories.
            </p>
            <p className="text-[#555] leading-relaxed">
              If an agent books a fake or incompetent provider, the physical outcome fails. There is no undo button in the real world.
            </p>
            <p className="text-[#555] leading-relaxed">
              Agents need a routing layer. Not a directory. A GPS.
            </p>
          </div>

          {/* Beachhead */}
          <div className="space-y-5">
            <p className="text-xs tracking-[0.16em] uppercase text-[#888]">Initial Domain</p>
            <h2 className="text-xl tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              Where we start.
            </h2>
            <p className="text-[#555] leading-relaxed">
              Not the entire physical service economy on day one. We start where trust is highest-stakes and coordination is most complex:
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "High-trust event coordination", detail: "Multi-vendor, multi-day, high-consequence events where one failure ruins the outcome" },
                { label: "Luxury personal services", detail: "High-end beauty, styling, wellness -- referral-driven, reputation-dependent" },
                { label: "Estate and household staffing", detail: "Private estate managers coordinating dozens of service providers" },
                { label: "High-consequence local networks", detail: "Tight-knit professional communities where word-of-mouth is the only discovery channel" },
              ].map((item, i) => (
                <div key={i} className="bg-white border border-[#e8e2d9] rounded-lg p-3">
                  <p className="text-xs font-medium text-[#1a1a1a] mb-0.5">{item.label}</p>
                  <p className="text-xs text-[#888] leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
            <p className="text-[#555] leading-relaxed">
              These are markets where the cost of a bad match is high, the work happens through private channels, and no existing platform has captured the coordination data.
            </p>
          </div>

          {/* Three Confidence Levels */}
          <div className="space-y-6 border-t border-[#e8e2d9] pt-12">
            <p className="text-xs tracking-[0.16em] uppercase text-[#888]">The Build</p>
            <h2 className="text-xl tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              Three layers. Three confidence levels.
            </h2>
          </div>

          {/* Layer 1: Live / Near-term */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#28692e] text-white flex items-center justify-center text-sm font-medium">1</div>
              <div>
                <p className="text-xs tracking-[0.12em] uppercase text-[#28692e] font-medium">Live / Near-Term</p>
                <h3 className="text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>Capture the invisible labor.</h3>
              </div>
            </div>
            <p className="text-[#555] leading-relaxed">
              We deploy on top of where the work already happens: inbox and calendar via OAuth. No migration. No behavior change.
            </p>
            <div className="bg-white border border-[#e8e2d9] rounded-lg p-5 space-y-4">
              <div>
                <p className="text-xs tracking-[0.1em] uppercase text-[#888] mb-2">The Mechanism</p>
                <p className="text-sm text-[#333] leading-relaxed">
                  Briarwood acts as an invisible secretary. It ingests the unstructured reality of daily coordination -- the raw email thread where they forwarded a client to a trusted peer, the calendar blocks, the rescheduling patterns.
                </p>
              </div>
              <div className="border-t border-[#e8e2d9] pt-4">
                <p className="text-xs tracking-[0.1em] uppercase text-[#888] mb-2">What Is Built</p>
                <div className="grid grid-cols-2 gap-2">
                  {["Inbox/calendar integration", "Assistant prompts", "Proposal drafting", "Contract generation", "Follow-up reminders", "Referrals with approval"].map((item, i) => (
                    <p key={i} className="text-xs text-[#333] bg-[#f5f3ef] rounded px-2.5 py-1.5">{item}</p>
                  ))}
                </div>
              </div>
              <div className="border-t border-[#e8e2d9] pt-4">
                <p className="text-xs tracking-[0.1em] uppercase text-[#888] mb-2">The UX Mandate</p>
                <p className="text-sm text-[#333] leading-relaxed">
                  The interface must feel like sovereign infrastructure, not a SaaS dashboard. The provider's brand stays front-and-center. We handle the administrative weight so they get 15 hours a week back.
                </p>
              </div>
            </div>
          </div>

          {/* Layer 2: Model-Building */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#8b6914] text-white flex items-center justify-center text-sm font-medium">2</div>
              <div>
                <p className="text-xs tracking-[0.12em] uppercase text-[#8b6914] font-medium">Model-Building</p>
                <h3 className="text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>Encode behavioral coordination signals.</h3>
              </div>
            </div>
            <p className="text-[#555] leading-relaxed">
              As Briarwood handles the daily workflow, it observes and scores coordination behavior. Not "truth" in an absolute sense -- behavioral coordination signals that correlate with reliability.
            </p>
            <div className="bg-white border border-[#e8e2d9] rounded-lg p-5 space-y-4">
              <div>
                <p className="text-xs tracking-[0.1em] uppercase text-[#888] mb-2">What Is Built</p>
                <div className="grid grid-cols-2 gap-2">
                  {["Behavioral signal extraction", "Trust graph formation", "CDI generation", "Provider network mapping"].map((item, i) => (
                    <p key={i} className="text-xs text-[#333] bg-[#f5f3ef] rounded px-2.5 py-1.5">{item}</p>
                  ))}
                </div>
              </div>
              <div className="border-t border-[#e8e2d9] pt-4">
                <p className="text-xs tracking-[0.1em] uppercase text-[#888] mb-2">What We Observe</p>
                <p className="text-sm text-[#333] leading-relaxed">
                  How fast do they respond? Who do they refer their overflow to when they are booked? When a timeline breaks at 5 AM, what is their recovery routing? How consistently do they follow through on commitments?
                </p>
              </div>
              <div className="border-t border-[#e8e2d9] pt-4">
                <p className="text-xs tracking-[0.1em] uppercase text-[#888] mb-2">Important Constraint</p>
                <p className="text-sm text-[#333] leading-relaxed">
                  Email and calendar show responsiveness, follow-through, timing, referral patterns, scheduling pressure, and rescheduling behavior. They do not always show outcome quality cleanly. Someone can respond fast and still be mediocre. Someone can have low email volume because their best business is referral-heavy or text-based. The model must account for this.
                </p>
              </div>
            </div>
          </div>

          {/* Layer 3: Long-Term Platform */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#3d1a22] text-[#f5f3ef] flex items-center justify-center text-sm font-medium">3</div>
              <div>
                <p className="text-xs tracking-[0.12em] uppercase text-[#3d1a22] font-medium">Long-Term Platform</p>
                <h3 className="text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>The routing layer for agents.</h3>
              </div>
            </div>
            <p className="text-[#555] leading-relaxed">
              If the behavioral model works at scale, Briarwood becomes the infrastructure that AI agents use to navigate the physical service economy. Not a directory. A routing layer with verified behavioral data.
            </p>
            <div className="bg-white border border-[#e8e2d9] rounded-lg p-5 space-y-4">
              <div>
                <p className="text-xs tracking-[0.1em] uppercase text-[#888] mb-2">What Is Built</p>
                <div className="grid grid-cols-2 gap-2">
                  {["External API", "Agent routing", "Query pricing", "Machine-to-machine coordination"].map((item, i) => (
                    <p key={i} className="text-xs text-[#333] bg-[#f5f3ef] rounded px-2.5 py-1.5">{item}</p>
                  ))}
                </div>
              </div>
              <div className="border-t border-[#e8e2d9] pt-4">
                <p className="text-xs tracking-[0.1em] uppercase text-[#888] mb-2">The Mechanism</p>
                <p className="text-sm text-[#333] leading-relaxed">
                  An agent queries: "I need a verified coordinator in San Francisco with strong crisis-recovery patterns." Briarwood routes the request based on behavioral data, not reviews. The professionals pay a 1.5% infrastructure fee only when coordination successfully completes. No subscriptions.
                </p>
              </div>
              <div className="border-t border-[#e8e2d9] pt-4">
                <p className="text-xs tracking-[0.1em] uppercase text-[#888] mb-2">Owning the Outcome</p>
                <p className="text-sm text-[#333] leading-relaxed">
                  Legacy platforms own the introduction and blame the user when it breaks. Briarwood owns the outcome because the routing is based on observed coordination behavior, not self-reported profiles.
                </p>
              </div>
            </div>
          </div>

          {/* CDI Deep Dive */}
          <div className="space-y-6 border-t-2 border-[#3d1a22] pt-12">
            <p className="text-xs tracking-[0.16em] uppercase text-[#888]">The Coordination Depth Index</p>
            <h2 className="text-2xl tracking-tight leading-[1.15]" style={{ fontFamily: "'Fraunces', serif" }}>
              CDI is not a single vanity score.
            </h2>
            <p className="text-[#555] leading-relaxed">
              It is a composite trust model built from observable coordination behaviors. Different queries rely on different weighted dimensions.
            </p>
          </div>

          <div className="space-y-5">
            <h3 className="text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              Signal dimensions.
            </h3>
            <div className="space-y-2">
              {[
                { dim: "Response reliability", detail: "How consistently and quickly do they respond to inquiries and client communications?" },
                { dim: "Referral trust", detail: "Who refers to them? Who do they refer to? How does the network validate their work?" },
                { dim: "Schedule integrity", detail: "How stable is their calendar? Do they overbook? Do they honor commitments?" },
                { dim: "Follow-through rate", detail: "When they say they'll do something -- send a contract, confirm a date, provide a quote -- do they?" },
                { dim: "Recovery performance", detail: "When something breaks, how do they respond? Speed, resourcefulness, network activation." },
                { dim: "Network validation", detail: "Are they embedded in a cluster of other high-performing professionals? Cross-referral density." },
                { dim: "Context-specific patterns", detail: "Performance varies by context. A great coordinator for intimate events may not be great for 300-person productions." },
              ].map((item, i) => (
                <div key={i} className="bg-white border border-[#e8e2d9] rounded-lg p-4">
                  <p className="text-xs font-medium text-[#1a1a1a] mb-0.5">{item.dim}</p>
                  <p className="text-xs text-[#888] leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <h3 className="text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              Why weighting matters.
            </h3>
            <div className="bg-white border border-[#e8e2d9] rounded-lg overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-[#e8e2d9]">
                <div className="p-5">
                  <p className="text-xs tracking-[0.12em] uppercase text-[#888] mb-2">Query A</p>
                  <p className="text-sm text-[#333] leading-relaxed">
                    "Best coordinator for a seven-person private dinner"
                  </p>
                  <p className="text-xs text-[#888] mt-2">Weights: follow-through, referral trust, context-specific patterns</p>
                </div>
                <div className="p-5">
                  <p className="text-xs tracking-[0.12em] uppercase text-[#888] mb-2">Query B</p>
                  <p className="text-sm text-[#333] leading-relaxed">
                    "Emergency replacement coordinator at 5 AM"
                  </p>
                  <p className="text-xs text-[#888] mt-2">Weights: recovery performance, response reliability, network activation</p>
                </div>
              </div>
            </div>
            <p className="text-[#555] leading-relaxed">
              Same provider pool. Different weights. Different results. That is why CDI is a model, not a leaderboard.
            </p>
          </div>

          <div className="space-y-5">
            <h3 className="text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              Open questions for the build.
            </h3>
            <div className="space-y-2">
              {[
                "How do we handle sparse data or new providers who haven't generated enough signals yet?",
                "How do we separate provider quality from client weirdness? (A great provider with difficult clients may look less reliable.)",
                "How do we prevent gaming? CDI needs to be hard to manipulate -- based on observed behavior over time, resistant to review fraud and directory manipulation.",
                "Is CDI one composite score or multiple domain-specific scores? (Likely the latter.)",
                "What is observable vs. inferred? We need to be precise about which signals are primary data vs. proxy indicators.",
              ].map((q, i) => (
                <div key={i} className="bg-[#f5f3ef] border border-[#e8e2d9] rounded-lg px-4 py-3">
                  <p className="text-sm text-[#333]">{q}</p>
                </div>
              ))}
            </div>
          </div>

          {/* GPS Analogy */}
          <div className="space-y-6 border-t border-[#e8e2d9] pt-12">
            <p className="text-xs tracking-[0.16em] uppercase text-[#888]">The GPS Framework</p>
            <h2 className="text-xl tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              Directory vs. routing layer.
            </h2>
            <p className="text-[#555] leading-relaxed">
              A GPS does three things that a Yellow Pages cannot. Briarwood does the same three things for the physical service economy.
            </p>
          </div>

          {/* GPS 1 */}
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-sm font-medium">1</div>
              <div>
                <p className="text-xs tracking-[0.12em] uppercase text-[#888] mb-1">Real-Time Positioning</p>
                <h3 className="text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>Live coordinates, not a static list.</h3>
              </div>
            </div>
            <div className="bg-white border border-[#e8e2d9] rounded-lg overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-[#e8e2d9]">
                <div className="p-5">
                  <p className="text-xs tracking-[0.12em] uppercase text-[#c44] mb-2">Directories</p>
                  <p className="text-sm text-[#555] leading-relaxed">
                    Yelp. Instagram. A list of names, a phone number, some curated photos. An AI agent using this is flying blind. It doesn't know if the coordinator is available this weekend. It doesn't know if the estate manager responds to emails.
                  </p>
                </div>
                <div className="p-5">
                  <p className="text-xs tracking-[0.12em] uppercase text-[#3d1a22] mb-2">Briarwood</p>
                  <p className="text-sm text-[#555] leading-relaxed">
                    Real-time positioning. We know who is booked, who is free, who is currently ignoring emails, and who is actively taking clients right now. Not a static directory. Live coordinates.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* GPS 2 */}
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-sm font-medium">2</div>
              <div>
                <p className="text-xs tracking-[0.12em] uppercase text-[#888] mb-1">Traffic Conditions</p>
                <h3 className="text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>The live sensor network.</h3>
              </div>
            </div>
            <div className="bg-[#f5f3ef] border border-[#e8e2d9] rounded-lg p-5">
              <p className="text-sm text-[#333] leading-relaxed">
                Because Briarwood sits on top of the provider's inbox and calendar, it acts as a live sensor network. We don't ask them to "update their availability" in a dashboard. We read the primary workflow data. We know the traffic conditions of the physical service economy in real-time.
              </p>
            </div>
          </div>

          {/* GPS 3 */}
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center text-sm font-medium">3</div>
              <div>
                <p className="text-xs tracking-[0.12em] uppercase text-[#888] mb-1">Dynamic Rerouting</p>
                <h3 className="text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>The 5 AM recovery.</h3>
              </div>
            </div>
            <p className="text-[#555] leading-relaxed">
              When a booked provider cancels at 5 AM before a high-stakes event:
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
                    The system detects the cancellation, queries the provider's trusted referral network, finds an available peer with comparable behavioral scores, and executes the handoff.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-[#555] leading-relaxed">
              A directory tells an agent who exists. A routing layer tells an agent how to get the job done safely.
            </p>
          </div>

          {/* The Moat */}
          <div className="space-y-6 border-t-2 border-[#3d1a22] pt-12">
            <p className="text-xs tracking-[0.16em] uppercase text-[#888]">The Moat</p>
            <h2 className="text-xl tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              Why this is hard for incumbents to replicate.
            </h2>
            <p className="text-[#555] leading-relaxed">
              The moat is not the UI. It is not the brand. It is not email summarization.
            </p>
            <div className="bg-[#3d1a22] text-[#f5f3ef] rounded-lg p-6">
              <p className="text-sm leading-relaxed">
                The moat is the proprietary trust graph and behavioral routing model built from long-horizon coordination data, referral flows, recovery behavior, and cross-provider network patterns that incumbents do not have the permission, context, or distribution to access.
              </p>
            </div>
            <p className="text-[#555] leading-relaxed">
              Google has email data but no coordination context. HoneyBook has some workflow data but no trust graph. Yelp has reviews but no behavioral signals. OpenAI has language models but no physical-world routing data.
            </p>
            <p className="text-[#555] leading-relaxed">
              Briarwood earns access to coordination data by providing real value (15 hours/week back). The trust graph compounds over time. Every referral, every recovery, every follow-through adds signal. The data gets better as the network grows.
            </p>
          </div>

          {/* Part II Divider */}
          <div className="border-t-2 border-[#3d1a22] pt-12">
            <p className="text-xs tracking-[0.16em] uppercase text-[#888] mb-4">Part II — The Assistant</p>
            <h2 className="text-2xl sm:text-3xl tracking-tight leading-[1.1]" style={{ fontFamily: "'Fraunces', serif" }}>
              How the two-way loop works.
            </h2>
            <p className="mt-4 text-[#555] leading-relaxed">
              The assistant is a coordination engine with a conversational interface. It reads real business context and either acts on your instruction or surfaces decisions that need your judgment.
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
            <div className="bg-[#3d1a22] text-[#f5f3ef] rounded-lg p-5">
              <p className="text-sm leading-relaxed font-medium">
                The AI does not make judgment calls. It makes your judgment calls faster to execute.
              </p>
            </div>
            <p className="text-[#555] leading-relaxed">
              Every action either comes from you or waits for your approval. Briarwood surfaces decisions. You make them. Briarwood executes them.
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
                    Contracts generated. Invoices attached. Sent to Solmaz. Calendar dates blocked. You get a copy. Done. 30 seconds of your time instead of 45 minutes.
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
              Briarwood monitors your business state and surfaces things that need your attention. It never acts without your approval on anything that matters.
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
              Plain language instructions. Briarwood understands your business context -- your pricing, your calendar, your network, your clients, your preferences.
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

          {/* The Sovereignty Moat */}
          <div className="space-y-6 border-t border-[#e8e2d9] pt-12">
            <p className="text-xs tracking-[0.16em] uppercase text-[#888]">Sovereignty Rules</p>
            <h2 className="text-xl tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              Non-negotiable rules.
            </h2>
            <p className="text-[#555] leading-relaxed">
              These are not side notes. They are core adoption logic. Professionals adopt Briarwood because of these guarantees.
            </p>
            <div className="space-y-3">
              {[
                { rule: "Zero Data Extraction", detail: "We never contact their clients. Their coordination history and client lists are never used to train outside foundation models." },
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
          </div>

          {/* Part III — Where It Lives */}
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

            <div className="bg-white border border-[#d4d4d4] rounded-lg overflow-hidden shadow-sm">
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

              <div className="flex min-h-[320px]">
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

                  <div className="absolute bottom-4 right-4">
                    <div className="relative group cursor-pointer">
                      <div className="absolute -top-2 -right-1 w-5 h-5 bg-[#c44] rounded-full flex items-center justify-center z-10">
                        <span className="text-[10px] text-white font-bold">2</span>
                      </div>
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
              The badge shows pending prompts. Click it and the assistant panel slides open alongside your inbox.
            </p>
          </div>

          {/* Briarwood Panel Open */}
          <div className="space-y-5">
            <h3 className="text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              The panel opens. Briarwood already read the email.
            </h3>

            <div className="bg-white border border-[#d4d4d4] rounded-lg overflow-hidden shadow-sm">
              <div className="flex min-h-[380px]">
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

                <div className="w-[280px] flex-shrink-0 flex flex-col"
                  style={{
                    backgroundImage: "url(/pinstripe.jpeg)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  <div className="px-4 py-3 border-b border-[#555]">
                    <p className="text-[#e8e2d9] text-sm tracking-[0.06em]" style={{ fontFamily: "'Fraunces', serif", textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>
                      Briarwood
                    </p>
                  </div>

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

                  <div className="p-3 border-t border-[#555]">
                    <div className="bg-white/90 rounded-md px-3 py-2 text-[11px] text-[#aaa] flex items-center justify-between">
                      Tell Briarwood what to do...
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile SMS Mockup */}
          <div className="space-y-5">
            <h3 className="text-lg tracking-tight" style={{ fontFamily: "'Fraunces', serif" }}>
              On your phone: it's a text message.
            </h3>
            <p className="text-sm text-[#555] leading-relaxed">
              When you're on your phone, Briarwood prompts you via SMS. Same intelligence. No app to open.
            </p>

            <div className="max-w-[300px] mx-auto">
              <div className="bg-[#000] rounded-[2rem] p-3 shadow-xl">
                <div className="bg-[#f2f2f7] rounded-[1.5rem] overflow-hidden">
                  <div className="bg-[#f2f2f7] px-6 pt-3 pb-1 flex items-center justify-between">
                    <p className="text-[10px] font-semibold text-[#1a1a1a]">9:41</p>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-2.5 border border-[#1a1a1a] rounded-sm relative">
                        <div className="absolute inset-0.5 bg-[#1a1a1a] rounded-[1px]" style={{ width: "70%" }}></div>
                      </div>
                    </div>
                  </div>

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

                  <div className="px-3 py-4 space-y-2 min-h-[280px] bg-white">
                    <div className="flex justify-start">
                      <div className="bg-[#e5e5ea] rounded-2xl rounded-bl-md px-3.5 py-2.5 max-w-[220px]">
                        <p className="text-[13px] text-[#1a1a1a] leading-relaxed">
                          New inquiry from Jessica Reyes for June 12. You're available. Want to send your info sheet?
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-[#007aff] rounded-2xl rounded-br-md px-3.5 py-2.5 max-w-[220px]">
                        <p className="text-[13px] text-white leading-relaxed">
                          Yes send it
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-[#e5e5ea] rounded-2xl rounded-bl-md px-3.5 py-2.5 max-w-[220px]">
                        <p className="text-[13px] text-[#1a1a1a] leading-relaxed">
                          Done. Info sheet and pricing sent to Jessica. I blocked June 12 as tentative.
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="bg-[#e5e5ea] rounded-2xl rounded-bl-md px-3.5 py-2.5 max-w-[220px]">
                        <p className="text-[13px] text-[#1a1a1a] leading-relaxed">
                          Solmaz sent 4 proposals to review. Want me to generate contracts with standard pricing?
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-[#007aff] rounded-2xl rounded-br-md px-3.5 py-2.5 max-w-[220px]">
                        <p className="text-[13px] text-white leading-relaxed">
                          Yes but add travel fee for Montage
                        </p>
                      </div>
                    </div>
                  </div>

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
              The machine.
            </h2>
            <div className="bg-white border-2 border-[#3d1a22] rounded-lg p-6 space-y-4">
              <p className="text-sm text-[#333] leading-relaxed">
                <span className="font-medium text-[#28692e]">Live:</span> Deploy as an invisible secretary. Capture the unstructured reality of how the best professionals actually coordinate. Give them 15 hours a week back. Earn their trust and their data.
              </p>
              <p className="text-sm text-[#333] leading-relaxed">
                <span className="font-medium text-[#8b6914]">Building:</span> Extract behavioral coordination signals. Form the trust graph. Generate the Coordination Depth Index -- a composite model that makes word-of-mouth trust machine-readable and hard to game.
              </p>
              <p className="text-sm text-[#333] leading-relaxed">
                <span className="font-medium text-[#3d1a22]">Long-term:</span> Open the API. Become the routing layer for AI agents navigating the physical world. Per-query pricing. Infrastructure fee on successful coordination.
              </p>
            </div>
            <p className="text-[#555] leading-relaxed">
              The core is: invisible workflow capture, behavior-derived trust, approval-based execution, routing layer for physical outcomes.
            </p>
            <p className="text-[#555] leading-relaxed">
              That is the company.
            </p>
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
