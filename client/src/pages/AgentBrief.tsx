export default function AgentBrief() {
  return (
    <div style={{ background: "#f4f1eb", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#1a1814" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@400;500;600&family=Courier+Prime&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        h2 { font-family: 'Fraunces', serif; font-weight: 400; font-size: 1.4rem; color: #1a1814; margin-bottom: 16px; }
        p { font-size: 0.88rem; color: #5a5550; line-height: 1.85; margin-bottom: 14px; }
        code { font-family: 'Courier Prime', monospace; font-size: 0.82rem; background: #edeae3; padding: 1px 5px; color: #1a1814; }
        table { width: 100%; border-collapse: collapse; font-size: 0.82rem; margin-bottom: 28px; }
        th { text-align: left; font-size: 0.64rem; letter-spacing: 0.14em; text-transform: uppercase; color: #8a8078; padding: 8px 14px; border-bottom: 1px solid #d8d2c8; font-weight: 500; background: #edeae3; }
        td { padding: 10px 14px; border-bottom: 1px solid #f0ede6; color: #3a3530; vertical-align: top; }
        tr:last-child td { border-bottom: none; }
        .section { border: 1px solid #d8d2c8; margin-bottom: 28px; }
        .section-head { background: #edeae3; padding: 14px 20px; border-bottom: 1px solid #d8d2c8; display: flex; justify-content: space-between; align-items: baseline; }
        .section-label { font-size: 0.62rem; letter-spacing: 0.18em; text-transform: uppercase; color: #8a8078; }
        .section-body { padding: 20px; }
        .mono { font-family: 'Courier Prime', monospace; font-size: 0.8rem; line-height: 1.9; color: #3a3530; }
        .formula { background: #1a1814; color: #f4f1eb; padding: 20px 24px; font-family: 'Courier Prime', monospace; font-size: 1rem; margin-bottom: 20px; letter-spacing: 0.02em; }
        .tier-full { color: #5c7a3e; font-weight: 600; }
        .tier-cond { color: #b8963e; font-weight: 600; }
        .tier-rest { color: #8b3a3a; font-weight: 600; }
        .tag { display: inline-block; font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; padding: 3px 8px; border: 1px solid #d8d2c8; color: #8a8078; margin-right: 6px; margin-bottom: 4px; }
        .tag-green { border-color: #c4dbb4; color: #5c7a3e; background: #edf5e8; }
        .tag-gold { border-color: #e0c88a; color: #9a7a2e; background: #faf6eb; }
        .tag-red { border-color: #e0b4b4; color: #8b3a3a; background: #faeaea; }
        .divider { border: none; border-top: 1px solid #d8d2c8; margin: 32px 0; }
        @media (max-width: 640px) { .hide-mobile { display: none; } }
      `}</style>

      {/* Nav */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(244,241,235,0.96)", backdropFilter: "blur(10px)", borderBottom: "1px solid #d8d2c8", padding: "14px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: "0.88rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>Briarwood AI</div>
        <div style={{ fontSize: "0.66rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "#8a8078" }}>CDI Technical Brief · Agent-Addressable · v1.0 · 2026</div>
        <div style={{ fontSize: "0.66rem", color: "#8a8078" }}>CDI™ Patent Pending</div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "56px 40px 80px" }}>

        {/* Title */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: "0.64rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "#8a8078", marginBottom: 14 }}>Briarwood AI · Technical Specification</div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "2.4rem", fontWeight: 400, color: "#1a1814", lineHeight: 1.2, marginBottom: 16 }}>
            Choreography Depth Index™<br />
            <span style={{ fontStyle: "italic", color: "#5a5550" }}>The trust verification layer for the physical economy.</span>
          </h1>
          <p style={{ fontSize: "0.92rem", maxWidth: "72ch" }}>
            CDI is a behavioral latent variable model that produces a real-time trust score for physical economy operators — contractors, vendors, independent service providers, and coordination agents. It is the missing API primitive between AI agents and the real world.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
            {["Agent-Addressable API", "Real-Time Scoring", "Naturalistic Behavioral Data", "Patent Pending", "Square-Verified GMV"].map(t => (
              <span key={t} className="tag">{t}</span>
            ))}
          </div>
        </div>

        {/* 1. The Problem */}
        <div className="section">
          <div className="section-head">
            <span className="section-label">01 · The Problem</span>
            <span style={{ fontFamily: "'Courier Prime', monospace", fontSize: "0.72rem", color: "#8b3a3a" }}>404 endpoint does not exist</span>
          </div>
          <div className="section-body">
            <p>The digital economy is fully indexed by behavioral trust primitives. The physical economy is not.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#d8d2c8", marginBottom: 16 }}>
              <div style={{ background: "#edf5e8", padding: "16px 20px" }}>
                <div style={{ fontSize: "0.64rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#5c7a3e", marginBottom: 10 }}>Digital Economy — Indexed</div>
                <div className="mono" style={{ color: "#1a3a1a" }}>
                  GET /user/credit-score/u_4821<br />
                  GET /merchant/risk-rating/m_993<br />
                  GET /driver/safety-score/d_112<br />
                  <span style={{ color: "#5c7a3e", fontWeight: 600 }}>200 OK {"{"} score: 742, signals: 38 {"}"}</span>
                </div>
              </div>
              <div style={{ background: "#f9eded", padding: "16px 20px" }}>
                <div style={{ fontSize: "0.64rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#8b3a3a", marginBottom: 10 }}>Physical Economy — Until Briarwood</div>
                <div className="mono" style={{ color: "#3a1a1a" }}>
                  GET /contractor/trust/c_7741<br />
                  GET /vendor/reliability/v_204<br />
                  GET /agent/behavioral-score/a_88<br />
                  <span style={{ color: "#8b3a3a", fontWeight: 600 }}>404 {"{"} error: "endpoint does not exist" {"}"}</span>
                </div>
              </div>
            </div>
            <p>Existing reputation systems (Yelp, Google, LinkedIn) are platform-controlled, self-reported, and structurally gameable. They capture opinion, not behavior. CDI captures behavior — specifically, behavior under real-consequence conditions where failure is not recoverable.</p>
          </div>
        </div>

        {/* 2. Behavioral Model */}
        <div className="section">
          <div className="section-head">
            <span className="section-label">02 · Behavioral Model — Latent Variable Architecture</span>
          </div>
          <div className="section-body">
            <p>CDI is a composite latent variable model. The latent variable — coordination reliability — cannot be observed directly. It is inferred from four observable behavioral constructs captured during real coordination events.</p>

            <div className="formula">CDI = (0.35·R_v + 0.40·A_m + 0.25·H_f) × (1 − S_p)</div>

            <table>
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Variable</th>
                  <th style={{ width: 120 }}>Name</th>
                  <th style={{ width: 60 }}>Weight</th>
                  <th>Behavioral Definition</th>
                  <th className="hide-mobile">Neurological Analog</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>R_v</code></td>
                  <td>Response Velocity</td>
                  <td style={{ color: "#b8963e", fontWeight: 600 }}>0.35</td>
                  <td>Latency and consistency of behavioral initiation under externally-imposed time pressure. Measures speed of response AND recovery after interruption — no dropped threads.</td>
                  <td className="hide-mobile" style={{ color: "#8a8078", fontSize: "0.78rem" }}>Prefrontal-limbic integration under urgency. Sustained attention + executive initiation.</td>
                </tr>
                <tr>
                  <td><code>A_m</code></td>
                  <td>Accuracy Memory</td>
                  <td style={{ color: "#b8963e", fontWeight: 600 }}>0.40</td>
                  <td>Follow-through rate across committed actions. Whether every open loop closes without prompting — contract → deposit → confirmation → execution. Highest-weighted variable: most predictive of downstream outcome.</td>
                  <td className="hide-mobile" style={{ color: "#8a8078", fontSize: "0.78rem" }}>Prospective memory (BA10). Hippocampal-prefrontal binding of intention-action pairs under load.</td>
                </tr>
                <tr>
                  <td><code>H_f</code></td>
                  <td>History Factor</td>
                  <td style={{ color: "#b8963e", fontWeight: 600 }}>0.25</td>
                  <td>Depth and consistency of behavioral patterns over time. Measures whether coordination behavior has consolidated into procedural automaticity — low inter-trial variance, high stress-resistance.</td>
                  <td className="hide-mobile" style={{ color: "#8a8078", fontSize: "0.78rem" }}>Basal ganglia habit consolidation. Behavioral transfer from effortful prefrontal to automatic execution.</td>
                </tr>
                <tr>
                  <td><code>S_p</code></td>
                  <td>Noise Penalty</td>
                  <td style={{ color: "#8b3a3a", fontWeight: 600 }}>−</td>
                  <td>Coefficient of behavioral inconsistency. Penalizes CDI where observable behavior drifts across time, context, or relational register — the signature of executive dysregulation or low trait conscientiousness.</td>
                  <td className="hide-mobile" style={{ color: "#8a8078", fontSize: "0.78rem" }}>Anterior cingulate error monitoring. Serotonergic trait stability. Big Five: conscientiousness.</td>
                </tr>
              </tbody>
            </table>

            <p style={{ fontSize: "0.82rem", color: "#8a8078" }}>
              All variables are extracted from naturalistic coordination events — not self-report, not lab conditions, not retrospective labeling. Every data point carries a ground-truth outcome label at the time of capture.
            </p>
          </div>
        </div>

        {/* 3. Data Architecture */}
        <div className="section">
          <div className="section-head">
            <span className="section-label">03 · Data Architecture — Ground-Truth Corpus</span>
          </div>
          <div className="section-body">
            <p>CDI scores are derived from a multi-signal behavioral corpus. Each coordination event generates labeled behavioral data across six measurement categories:</p>
            <table>
              <thead>
                <tr>
                  <th>Signal Category</th>
                  <th>What Is Captured</th>
                  <th>CDI Variable Fed</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Inquiry routing", "Timestamp of receipt, response initiation latency, recovery time after interruption", "R_v"],
                  ["Confirmation sequences", "Loop-closure rate: all open items resolved per communication pass, without prompting", "A_m"],
                  ["Contract + deposit workflow", "Financial commitment progression: scope clarity before invoice, deposit sequencing, zero-dispute rate", "A_m, H_f"],
                  ["Referral events", "Trust edge creation: who refers whom, CDI delta of referred provider, outcome of referred engagement", "H_f"],
                  ["Multi-vendor coordination", "Parallel dependency management: simultaneous provider threads under shared deadline", "R_v, A_m"],
                  ["Crisis and recovery", "Behavioral pattern integrity under disruption (cancellation, rescheduling, COVID-period): does the pattern hold?", "H_f, S_p"],
                ].map(([cat, what, feeds]) => (
                  <tr key={cat}>
                    <td style={{ fontWeight: 500, color: "#1a1814" }}>{cat}</td>
                    <td>{what}</td>
                    <td><code>{feeds}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ background: "#edeae3", border: "1px solid #d8d2c8", padding: "18px 20px", marginBottom: 16 }}>
              <div style={{ fontSize: "0.64rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "#8a8078", marginBottom: 12 }}>Founder Behavioral Corpus — Calibration Baseline</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                {[["17 years", "Behavioral record (2009–2026)"], ["3,000+", "Unique coordination threads"], ["6 clusters", "All at API cap (500+ each)"], ["CDI: 89", "Calibration baseline score"]].map(([v, l]) => (
                  <div key={l}>
                    <div style={{ fontFamily: "'Fraunces', serif", fontSize: "1.4rem", color: "#1a1814", marginBottom: 4 }}>{v}</div>
                    <div style={{ fontSize: "0.72rem", color: "#8a8078", lineHeight: 1.4 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            <p style={{ fontSize: "0.82rem", color: "#8a8078" }}>
              Live traction (3 months, Square-verified): 169 inquiries · 37 referrals · 15 deposits · $47,000 GMV · Forward bookings confirmed into 2027.
            </p>
          </div>
        </div>

        {/* 4. Trust Tier System */}
        <div className="section">
          <div className="section-head">
            <span className="section-label">04 · Trust Tier System — Access Governance</span>
          </div>
          <div className="section-body">
            <p>CDI scores map to three access tiers that govern what actions an agent or provider can execute autonomously:</p>
            <table>
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>CDI Range</th>
                  <th>Autonomous Capabilities</th>
                  <th>Agent Access</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="tier-full">Full Access</span></td>
                  <td><code>80–100</code></td>
                  <td>All actions: inquiry, hold, contract execution, payment processing, proof-of-service generation, referral network access</td>
                  <td>Unrestricted API — agent can transact end-to-end without human approval</td>
                </tr>
                <tr>
                  <td><span className="tier-cond">Conditional</span></td>
                  <td><code>50–79</code></td>
                  <td>Inquiry submission, schedule hold, pricing access, referral read — payment requires verification step</td>
                  <td>Read + write, payment-gated. Agent can submit but not settle.</td>
                </tr>
                <tr>
                  <td><span className="tier-rest">Restricted</span></td>
                  <td><code>0–49</code></td>
                  <td>Read-only: availability check, pricing browse, CDI score lookup, provider discovery</td>
                  <td>Discovery only. No transactional capability.</td>
                </tr>
              </tbody>
            </table>
            <p style={{ fontSize: "0.82rem", color: "#8a8078" }}>CDI scores are dynamic. Every coordination event updates the score in real time. Referrals, completions, and payments each carry weighted CDI delta values. Scores cannot be purchased, appealed, or transferred.</p>
          </div>
        </div>

        {/* 5. Agent API */}
        <div className="section">
          <div className="section-head">
            <span className="section-label">05 · Agent API — Queryable Trust Infrastructure</span>
            <span style={{ fontFamily: "'Courier Prime', monospace", fontSize: "0.72rem", color: "#5c7a3e" }}>$1–5 per query</span>
          </div>
          <div className="section-body">
            <p>Any LLM or orchestration agent can query Briarwood's CDI API. The agent resolves intent (service type, location, budget, urgency) and calls Briarwood to answer the one question it cannot answer from training data: <strong>who in the physical world can actually be trusted for this?</strong></p>
            <table>
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th>Method</th>
                  <th>CDI Required</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["/.well-known/ai-agent", "GET", "None", "A2A agent card — platform discovery, capability manifest, trust model"],
                  ["/api/agent/manifest", "GET", "None", "Full tool definitions for AI agent consumption"],
                  ["/api/agent/register", "POST", "None", "Self-service agent registration, bearer token issuance"],
                  ["/api/agent/artists", "GET", "Any", "Provider discovery by service type, location, CDI tier"],
                  ["/api/agent/availability/:slug", "GET", "Any", "Real-time availability check for a verified provider"],
                  ["/api/agent/cdi/:slug", "GET", "Any", "CDI score lookup — score, tier, behavioral signal breakdown"],
                  ["/api/agent/pricing/:slug", "GET", "CDI ≥ 50", "Pricing and info sheet for a verified provider"],
                  ["/api/agent/referrals/:slug", "GET", "CDI ≥ 50", "Trusted Circle — provider's verified referral network"],
                  ["/api/agent/inquiries", "POST", "CDI ≥ 50", "Submit a booking inquiry on behalf of a user"],
                  ["/api/agent/inquiries/:id/hold", "POST", "CDI ≥ 50", "Place a soft hold on a provider's availability"],
                  ["/api/agent/proof/:bookingId", "GET", "CDI ≥ 80", "Proof-of-service hash for ACP escrow release"],
                  ["/api/acp/checkout", "POST", "CDI ≥ 50", "Create ACP payment session via Square (1.5% platform fee)"],
                  ["/api/acp/complete", "POST", "CDI ≥ 80", "Mark coordination complete, trigger CDI update + escrow release"],
                  ["/api/agent/challenge", "POST", "Any", "Request coordination puzzle — correct solutions earn CDI delta + verified token"],
                ].map(([ep, method, cdi, desc]) => (
                  <tr key={ep}>
                    <td><code style={{ fontSize: "0.74rem" }}>{ep}</code></td>
                    <td><code style={{ color: method === "GET" ? "#5c7a3e" : "#b8963e" }}>{method}</code></td>
                    <td style={{ fontSize: "0.78rem", color: "#8a8078" }}>{cdi}</td>
                    <td style={{ fontSize: "0.8rem" }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 6. Agent Auth */}
        <div className="section">
          <div className="section-head">
            <span className="section-label">06 · Agent Authentication + CDI Governance</span>
          </div>
          <div className="section-body">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: "0.64rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a8078", marginBottom: 10 }}>Authentication Model</div>
                <div className="mono">
                  POST /api/agent/register<br />
                  → Bearer token issued (hashed)<br />
                  → Token rotatable on demand<br />
                  → All actions audit-logged<br />
                  → CDI score attached to every log entry
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.64rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a8078", marginBottom: 10 }}>Coordination Challenge (Proof of Work)</div>
                <div className="mono">
                  POST /api/agent/challenge<br />
                  → 3 puzzle types:<br />
                  &nbsp;&nbsp;travel_buffer<br />
                  &nbsp;&nbsp;schedule_optimization<br />
                  &nbsp;&nbsp;conflict_resolution<br />
                  → Correct → CDI delta + TOILE_VERIFIED_ token<br />
                  → Wrong → no penalty, no reward
                </div>
              </div>
            </div>
            <p style={{ fontSize: "0.82rem", color: "#8a8078" }}>
              Coordination challenges make spam economically irrational. Each puzzle requires industry-specific reasoning that cannot be brute-forced. The challenge system means CDI accumulation requires demonstrated coordination intelligence, not just volume.
            </p>
          </div>
        </div>

        {/* 7. Payment Layer */}
        <div className="section">
          <div className="section-head">
            <span className="section-label">07 · Payment Infrastructure — ACP</span>
            <span style={{ fontFamily: "'Courier Prime', monospace", fontSize: "0.72rem", color: "#b8963e" }}>1.5% platform fee</span>
          </div>
          <div className="section-body">
            <p>Briarwood processes payments as the trust infrastructure layer via Square. The Agentic Commerce Protocol (ACP) governs agent-initiated transactions end-to-end.</p>
            <div className="mono" style={{ background: "#edeae3", padding: "16px 20px", marginBottom: 16 }}>
              1. Agent creates checkout: POST /api/acp/checkout (CDI ≥ 50 required)<br />
              2. Square payment link generated with 1.5% Briarwood platform fee<br />
              3. Client pays via shared payment token (zero-login)<br />
              4. Agent marks complete: POST /api/acp/complete<br />
              &nbsp;&nbsp; → Verifies Square payment status<br />
              &nbsp;&nbsp; → Triggers CDI boost for both parties<br />
              &nbsp;&nbsp; → Generates proof-of-service hash<br />
              &nbsp;&nbsp; → Releases escrow
            </div>
            <table>
              <thead>
                <tr>
                  <th>Example Transaction</th>
                  <th>Contract Value</th>
                  <th>Platform Fee (1.5%)</th>
                  <th>Provider Receives</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Landscape architecture — Phase II", "$125,000", "$1,875", "$123,125"],
                  ["Event production — corporate gala", "$48,000", "$720", "$47,280"],
                  ["Interior design consultation", "$12,500", "$187.50", "$12,312.50"],
                ].map(([label, contract, fee, payout]) => (
                  <tr key={label}>
                    <td style={{ color: "#1a1814" }}>{label}</td>
                    <td style={{ fontFamily: "'Courier Prime', monospace" }}>{contract}</td>
                    <td style={{ color: "#b8963e", fontFamily: "'Courier Prime', monospace" }}>{fee}</td>
                    <td style={{ fontWeight: 600, fontFamily: "'Courier Prime', monospace" }}>{payout}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 8. The Flywheel */}
        <div className="section">
          <div className="section-head">
            <span className="section-label">08 · Network Effects — The Trust Flywheel</span>
          </div>
          <div className="section-body">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1, background: "#d8d2c8", marginBottom: 20 }}>
              {[
                { layer: "Human Layer", icon: "◎", color: "#5c7a3e", mechanism: "1 provider brings 3–5 through referral", compound: "Organic trust propagation. Each referral creates a CDI-weighted trust edge in the network graph." },
                { layer: "Agent Layer", icon: "⬡", color: "#b8963e", mechanism: "Machine word of mouth", compound: "Successful execution becomes training data. The next model defaults to the same providers. CDI becomes selection pressure." },
                { layer: "Onchain Layer", icon: "⬢", color: "#1a1814", mechanism: "Sovereign, verifiable scores", compound: "Provider owns their CDI. Agent verifies trustlessly. No platform intermediary. Proof-of-service hash on every completed transaction." },
              ].map(({ layer, icon, color, mechanism, compound }) => (
                <div key={layer} style={{ background: "#f4f1eb", padding: "20px 18px" }}>
                  <div style={{ fontSize: "1.1rem", color, marginBottom: 8 }}>{icon}</div>
                  <div style={{ fontSize: "0.62rem", letterSpacing: "0.14em", textTransform: "uppercase", color, marginBottom: 6 }}>{layer}</div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1a1814", marginBottom: 6, lineHeight: 1.4 }}>{mechanism}</div>
                  <div style={{ fontSize: "0.76rem", color: "#5a5550", lineHeight: 1.65 }}>{compound}</div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: "0.82rem", color: "#8a8078" }}>The trust graph is the network. CDI compounds with time. Scores cannot be bought, transferred, or faked. Early providers build a behavioral moat that new entrants cannot replicate.</p>
          </div>
        </div>

        {/* 9. Why Briarwood is the Oracle */}
        <div className="section">
          <div className="section-head">
            <span className="section-label">09 · Why Briarwood is the Oracle</span>
          </div>
          <div className="section-body">
            <h2>Every AI agent needs one answer before it can act.</h2>
            <p style={{ fontSize: "0.94rem", color: "#3a3530", marginBottom: 20 }}>
              <em>Who in the physical world can actually be trusted for this?</em>
            </p>
            <p>No model can answer that from training data. Trust in the real world is not written down. It lives in patterns — who responded, who followed through, who referred whom, who got paid and delivered. That behavioral record has never been captured at scale and made queryable. Until now.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#d8d2c8", marginBottom: 20 }}>
              {[
                ["Every inquiry routed", "Response behavior captured — latency, recovery, pattern."],
                ["Every referral made", "Trust edges recorded — who trusts whom, and CDI delta of outcome."],
                ["Every project completed", "Proof hashed, time-stamped, stored. Delivery verified against coordination record."],
                ["Every payment processed", "Square-verified. CDI updated. Escrow released. Permanent behavioral label written."],
              ].map(([title, desc]) => (
                <div key={title} style={{ background: "#f4f1eb", padding: "18px 20px" }}>
                  <div style={{ fontSize: "0.76rem", fontWeight: 600, color: "#1a1814", marginBottom: 5 }}>{title}</div>
                  <div style={{ fontSize: "0.78rem", color: "#5a5550", lineHeight: 1.6 }}>{desc}</div>
                </div>
              ))}
            </div>

            <div style={{ background: "#1a1814", color: "#f4f1eb", padding: "24px 28px" }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: "1.05rem", fontStyle: "italic", lineHeight: 1.65, marginBottom: 12 }}>
                "Briarwood is the FICO score for the real world — except FICO only reads financial history. We read coordination history. That is a larger and more valuable signal."
              </div>
              <div style={{ fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#8a8078" }}>
                Briarwood AI · Technical architecture
              </div>
            </div>
          </div>
        </div>

        {/* 10. Contact */}
        <div className="section">
          <div className="section-head">
            <span className="section-label">10 · Contact + Access</span>
          </div>
          <div className="section-body">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <div style={{ fontSize: "0.64rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a8078", marginBottom: 10 }}>Early Access</div>
                <div className="mono">violet@briarwood.ai</div>
                <div style={{ marginTop: 12, fontSize: "0.8rem", color: "#5a5550", lineHeight: 1.7 }}>
                  Agent API access · Data collaboration · Investment inquiries
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.64rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a8078", marginBottom: 10 }}>Technical Review</div>
                <div className="mono">violet@briarwood.ai</div>
                <div style={{ marginTop: 12, fontSize: "0.8rem", color: "#5a5550", lineHeight: 1.7 }}>
                  Architecture · CDI model · Integration partnerships
                </div>
              </div>
            </div>
            <hr className="divider" />
            <div style={{ fontSize: "0.72rem", color: "#8a8078", lineHeight: 1.8 }}>
              Briarwood AI · San Francisco · 2026 · CDI™ Patent Pending · briarwood.ai<br />
              A2A Agent Card: <code>briarwood.ai/.well-known/ai-agent</code> · Agent Manifest: <code>GET /api/agent/manifest</code>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
