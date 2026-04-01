import { useState, useEffect, useRef } from "react";

const NETWORKS = ["Hair", "Makeup", "Photography", "Florals", "Catering", "Event Planning", "DJ / Music", "Videography"];
const SERVICE_TYPES = ["Wedding", "Corporate Events", "Private Parties", "Editorial", "Fashion", "Commercial"];

const INQUIRIES = [
  { client: "Sarah M.", event: "Wedding — June 14", service: "Bridal Hair + Makeup", budget: "$2,400", location: "San Francisco, CA" },
  { client: "Maya K.", event: "Corporate Retreat — May 3", service: "Group Hair Styling (12 guests)", budget: "$1,800", location: "Napa, CA" },
  { client: "Priya R.", event: "Engagement Shoot — April 22", service: "Makeup Artistry", budget: "$450", location: "Oakland, CA" },
];

const CDI_EVENTS = [
  { label: "Profile created", delta: +8, time: "just now", icon: "○" },
  { label: "Inquiry received", delta: +3, time: "0s ago", icon: "◎" },
  { label: "Response sent in 4 min", delta: +14, time: "4 min ago", icon: "●" },
  { label: "Quote delivered on time", delta: +11, time: "18 min ago", icon: "●" },
  { label: "Referral confirmed — BreezyLee", delta: +9, time: "2 days ago", icon: "◈" },
  { label: "Deposit collected", delta: +16, time: "3 days ago", icon: "●" },
  { label: "Contract signed", delta: +7, time: "3 days ago", icon: "●" },
];

const AGENT_STEPS = [
  { role: "agent", text: "GET /api/agent/cdi/violet-herod", delay: 0 },
  { role: "system", text: `{\n  "provider": "violet-herod",\n  "cdi_score": 74,\n  "tier": "CONDITIONAL",\n  "trust_verified": true,\n  "capabilities": [\n    "submit_inquiry",\n    "place_hold",\n    "read_schedule"\n  ],\n  "signals": {\n    "responsiveness": 0.91,\n    "follow_through": 0.87,\n    "handoff_quality": 0.82\n  },\n  "patent_pending": "CDI™"\n}`, delay: 900 },
  { role: "agent", text: "POST /api/agent/inquiries", delay: 1800 },
  { role: "system", text: `{\n  "inquiry_id": "inq_9fk2m",\n  "status": "submitted",\n  "hold_placed": true,\n  "hold_expires": "48h",\n  "cdi_at_submission": 74\n}`, delay: 2700 },
  { role: "agent", text: "Agent decision: APPROVE BOOKING (CDI ≥ 50)", delay: 3600 },
];

function CDIMeter({ score, prev }: { score: number; prev: number }) {
  const angle = (score / 100) * 180 - 90;
  const color = score >= 80 ? "#5c7a3e" : score >= 50 ? "#b8963e" : "#8b3a3a";
  const label = score >= 80 ? "FULL ACCESS" : score >= 50 ? "CONDITIONAL" : "RESTRICTED";
  const labelColor = score >= 80 ? "#5c7a3e" : score >= 50 ? "#b8963e" : "#8b3a3a";

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", width: 220, height: 120, margin: "0 auto" }}>
        <svg width="220" height="120" viewBox="0 0 220 120">
          <path d="M 20 110 A 90 90 0 0 1 200 110" fill="none" stroke="#d8d2c8" strokeWidth="12" strokeLinecap="round" />
          <path
            d="M 20 110 A 90 90 0 0 1 200 110"
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 283} 283`}
            style={{ transition: "stroke-dasharray 1s ease, stroke 0.5s" }}
          />
          <g transform={`translate(110,110) rotate(${angle})`} style={{ transition: "transform 1s ease" }}>
            <line x1="0" y1="0" x2="0" y2="-70" stroke={color} strokeWidth="2.5" strokeLinecap="round" style={{ transition: "stroke 0.5s" }} />
            <circle cx="0" cy="0" r="5" fill={color} style={{ transition: "fill 0.5s" }} />
          </g>
        </svg>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, textAlign: "center" }}>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: "2.8rem", fontWeight: 600, color: "#1a1814", lineHeight: 1, transition: "all 0.5s" }}>
            {score}
          </div>
          {prev !== score && (
            <div style={{ fontSize: "0.72rem", color: score > prev ? "#5c7a3e" : "#8b3a3a", letterSpacing: "0.1em" }}>
              {score > prev ? `+${score - prev}` : score - prev}
            </div>
          )}
        </div>
      </div>
      <div style={{ marginTop: 12, display: "inline-block", padding: "4px 12px", border: `1px solid ${labelColor}`, borderRadius: 2, fontSize: "0.68rem", letterSpacing: "0.18em", textTransform: "uppercase", color: labelColor, fontWeight: 600 }}>
        {label}
      </div>
    </div>
  );
}

function TypedText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [shown, setShown] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const iv = setInterval(() => {
      setShown(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(iv);
    }, 12);
    return () => clearInterval(iv);
  }, [started, text]);

  return <span>{shown}</span>;
}

export default function BriarwoodDemo() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", email: "", phone: "", network: [] as string[], service: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cdiScore, setCdiScore] = useState(50);
  const [prevScore, setPrevScore] = useState(50);
  const [eventLog, setEventLog] = useState<typeof CDI_EVENTS>([]);
  const [selectedInquiry, setSelectedInquiry] = useState<number | null>(null);
  const [responded, setResponded] = useState(false);
  const [agentVisible, setAgentVisible] = useState(0);
  const [paymentDone, setPaymentDone] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step === 2) {
      let i = 0;
      const iv = setInterval(() => {
        if (i >= CDI_EVENTS.length) { clearInterval(iv); return; }
        const ev = CDI_EVENTS[i];
        setEventLog(prev => [ev, ...prev]);
        setPrevScore(s => s);
        setCdiScore(s => Math.min(100, s + ev.delta));
        i++;
      }, 700);
      return () => clearInterval(iv);
    }
  }, [step]);

  useEffect(() => {
    if (step === 3 && agentVisible < AGENT_STEPS.length) {
      AGENT_STEPS.forEach((s, idx) => {
        setTimeout(() => setAgentVisible(idx + 1), s.delay);
      });
    }
  }, [step]);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.email.trim() || !form.email.includes("@")) e.email = "Valid email required";
    if (!form.phone.trim()) e.phone = "Required";
    if (form.network.length === 0) e.network = "Select at least one";
    if (!form.service) e.service = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNetwork(n: string) {
    setForm(f => ({
      ...f,
      network: f.network.includes(n) ? f.network.filter(x => x !== n) : [...f.network, n],
    }));
  }

  function handleRespond() {
    setResponded(true);
    setPrevScore(cdiScore);
    setCdiScore(s => Math.min(100, s + 14));
    setEventLog(prev => [{ label: "Inquiry responded in < 5 min", delta: 14, time: "just now", icon: "●" }, ...prev]);
    setTimeout(() => setStep(3), 1800);
  }

  const bookingAmount = 1000;
  const platformFee = Math.round(bookingAmount * 0.015);
  const providerReceives = bookingAmount - platformFee;

  return (
    <div style={{ background: "#f4f1eb", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#1a1814" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@400;500;600&family=Courier+Prime:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .demo-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 40px; border-bottom: 1px solid #d8d2c8;
          background: rgba(244,241,235,0.95); backdrop-filter: blur(10px);
          position: sticky; top: 0; z-index: 40;
        }
        .demo-logo { font-family:'Fraunces',serif; font-size:0.9rem; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; }
        .demo-steps { display:flex; gap:8px; align-items:center; }
        .demo-step-dot {
          width:8px; height:8px; border-radius:50%; border:1px solid #d8d2c8;
          background: #edeae3; transition: all 0.3s;
        }
        .demo-step-dot.done { background:#1a1814; border-color:#1a1814; }
        .demo-step-dot.active { background:#b8963e; border-color:#b8963e; }

        .demo-body { max-width:720px; margin:0 auto; padding:64px 40px 80px; }
        .demo-eyebrow { font-size:0.68rem; letter-spacing:0.2em; text-transform:uppercase; color:#8a8078; margin-bottom:16px; }
        .demo-h1 { font-family:'Fraunces',serif; font-size:2rem; font-weight:400; line-height:1.25; color:#1a1814; margin-bottom:10px; }
        .demo-sub { font-size:0.92rem; line-height:1.75; color:#5a5550; margin-bottom:40px; }

        .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
        .form-group { display:flex; flex-direction:column; gap:6px; }
        .form-group.full { grid-column:1/-1; }
        label { font-size:0.72rem; letter-spacing:0.14em; text-transform:uppercase; color:#5a5550; }
        input, select {
          background:#edeae3; border:1px solid #d8d2c8; padding:12px 14px;
          font-size:0.9rem; color:#1a1814; font-family:'Inter',sans-serif;
          outline:none; transition:border-color 0.2s; border-radius:0;
          -webkit-appearance:none;
        }
        input:focus, select:focus { border-color:#1a1814; }
        .error-msg { font-size:0.72rem; color:#8b3a3a; }

        .network-grid { display:flex; flex-wrap:wrap; gap:8px; }
        .network-pill {
          padding:7px 14px; border:1px solid #d8d2c8; background:#edeae3;
          font-size:0.8rem; cursor:pointer; transition:all 0.2s; user-select:none;
        }
        .network-pill.selected { background:#1a1814; color:#f4f1eb; border-color:#1a1814; }

        .btn {
          display:inline-block; padding:13px 28px; font-size:0.84rem; font-weight:600;
          letter-spacing:0.04em; cursor:pointer; border:none; transition:opacity 0.2s; font-family:'Inter',sans-serif;
        }
        .btn-ink { background:#1a1814; color:#f4f1eb; }
        .btn-ink:hover { opacity:0.82; }
        .btn-ghost { background:transparent; border:1px solid #d8d2c8; color:#3a3530; }
        .btn-ghost:hover { border-color:#1a1814; }
        .btn-brass { background:#b8963e; color:#fff; }
        .btn-brass:hover { opacity:0.88; }
        .btn-green { background:#5c7a3e; color:#fff; }
        .btn-green:hover { opacity:0.88; }

        .hairline { border:none; border-top:1px solid #d8d2c8; margin:40px 0; }

        /* CDI panel */
        .cdi-panel {
          border:1px solid #d8d2c8; background:#edeae3; padding:32px;
          display:flex; gap:48px; align-items:flex-start; flex-wrap:wrap;
        }
        .event-log { flex:1; min-width:220px; }
        .event-item {
          display:flex; justify-content:space-between; align-items:flex-start;
          padding:10px 0; border-bottom:1px solid #d8d2c8; gap:12px;
          animation: fadeIn 0.4s ease;
        }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        .event-label { font-size:0.82rem; color:#3a3530; flex:1; }
        .event-delta { font-size:0.78rem; font-weight:600; color:#5c7a3e; white-space:nowrap; }
        .event-time { font-size:0.68rem; color:#8a8078; white-space:nowrap; }

        /* Inquiry cards */
        .inquiry-card {
          border:1px solid #d8d2c8; padding:24px; background:#edeae3; cursor:pointer;
          transition:border-color 0.2s, background 0.2s; margin-bottom:12px;
        }
        .inquiry-card:hover { border-color:#b8963e; background:#e8e4db; }
        .inquiry-card.selected { border-color:#1a1814; background:#e2dfd6; }
        .inquiry-name { font-family:'Fraunces',serif; font-size:1rem; color:#1a1814; margin-bottom:4px; }
        .inquiry-detail { font-size:0.82rem; color:#5a5550; line-height:1.6; }
        .inquiry-budget { font-weight:600; color:#1a1814; font-size:0.9rem; }

        /* Agent terminal */
        .terminal {
          background:#1a1814; border-radius:0; padding:24px; font-family:'Courier Prime',monospace;
          font-size:0.8rem; line-height:1.7; color:#c8d4c0; min-height:300px;
        }
        .terminal-line { animation:fadeIn 0.3s ease; }
        .terminal-agent { color:#b8963e; }
        .terminal-system { color:#8fbf8f; white-space:pre; }
        .terminal-decision { color:#f4f1eb; font-weight:700; margin-top:8px; border-top:1px solid #3a4030; padding-top:8px; }

        /* Payment */
        .payment-row {
          display:flex; justify-content:space-between; align-items:center;
          padding:14px 0; border-bottom:1px solid #d8d2c8; font-size:0.9rem;
        }
        .payment-label { color:#5a5550; }
        .payment-val { font-weight:600; color:#1a1814; }
        .payment-fee { color:#b8963e; font-size:0.82rem; }
        .payment-total { font-family:'Fraunces',serif; font-size:1.3rem; color:#1a1814; font-weight:400; }

        .success-badge {
          display:inline-flex; align-items:center; gap:8px;
          padding:8px 16px; background:#edf5e8; border:1px solid #c4dbb4;
          color:#5c7a3e; font-size:0.8rem; letter-spacing:0.1em; text-transform:uppercase;
        }

        @media(max-width:600px) {
          .demo-nav { padding:14px 20px; }
          .demo-body { padding:48px 20px 64px; }
          .form-grid { grid-template-columns:1fr; }
          .cdi-panel { gap:24px; }
        }
      `}</style>

      {/* Nav */}
      <nav className="demo-nav">
        <div className="demo-logo">Briarwood AI · Live Demo</div>
        <div className="demo-steps">
          {["Onboard", "CDI", "Inquiry", "Agent", "Payment"].map((label, i) => (
            <div
              key={label}
              className={`demo-step-dot ${step > i ? "done" : step === i ? "active" : ""}`}
              title={label}
            />
          ))}
        </div>
        <div style={{ fontSize: "0.76rem", color: "#8a8078", letterSpacing: "0.08em" }}>
          CDI™ Patent Pending
        </div>
      </nav>

      <div className="demo-body">

        {/* ── STEP 0: Provider Onboarding ── */}
        {step === 0 && (
          <>
            <p className="demo-eyebrow">Step 1 of 5 · Provider Onboarding</p>
            <h1 className="demo-h1">Join the behavioral trust network.</h1>
            <p className="demo-sub">Your coordination data is already valuable. Briarwood makes it machine-readable.</p>

            <div className="form-grid">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Violet Herod"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
                {errors.name && <span className="error-msg">{errors.name}</span>}
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="violet@studio.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
                {errors.email && <span className="error-msg">{errors.email}</span>}
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  placeholder="+1 (415) 000-0000"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                />
                {errors.phone && <span className="error-msg">{errors.phone}</span>}
              </div>
              <div className="form-group">
                <label>Primary Service Type</label>
                <select value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))}>
                  <option value="">Select...</option>
                  {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
                </select>
                {errors.service && <span className="error-msg">{errors.service}</span>}
              </div>
              <div className="form-group full">
                <label>Preferred Network (select all that apply)</label>
                <div className="network-grid" style={{ marginTop: 4 }}>
                  {NETWORKS.map(n => (
                    <div
                      key={n}
                      className={`network-pill ${form.network.includes(n) ? "selected" : ""}`}
                      onClick={() => handleNetwork(n)}
                    >
                      {n}
                    </div>
                  ))}
                </div>
                {errors.network && <span className="error-msg" style={{ marginTop: 4, display: "block" }}>{errors.network}</span>}
              </div>
            </div>

            <div style={{ marginTop: 32, display: "flex", gap: 12 }}>
              <button className="btn btn-ink" onClick={() => { if (validate()) setStep(1); }}>
                Activate CDI Score →
              </button>
            </div>
          </>
        )}

        {/* ── STEP 1: CDI Activation ── */}
        {step === 1 && (
          <>
            <p className="demo-eyebrow">Step 2 of 5 · CDI Initialization</p>
            <h1 className="demo-h1">Your behavioral trust score is live.</h1>
            <p className="demo-sub">Every action you take — responding to inquiries, delivering on quotes, coordinating handoffs — updates your score in real time.</p>

            <div style={{ display: "flex", gap: 12, marginBottom: 32, padding: "16px 20px", background: "#edeae3", border: "1px solid #d8d2c8", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a8078", marginBottom: 4 }}>Provider</div>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: "1rem", color: "#1a1814" }}>{form.name || "Violet Herod"}</div>
                <div style={{ fontSize: "0.8rem", color: "#5a5550" }}>{form.email || "violet@studio.com"}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a8078", marginBottom: 4 }}>Network</div>
                <div style={{ fontSize: "0.82rem", color: "#3a3530" }}>{form.network.length > 0 ? form.network.join(", ") : "Hair, Makeup"}</div>
              </div>
            </div>

            <CDIMeter score={50} prev={50} />

            <hr className="hairline" />

            <div style={{ background: "#edeae3", border: "1px solid #d8d2c8", padding: "24px 28px" }}>
              <div style={{ fontSize: "0.72rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a8078", marginBottom: 16 }}>CDI Formula · Patent Pending</div>
              <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: "1rem", color: "#1a1814", letterSpacing: "0.04em", marginBottom: 12 }}>
                CDI = (α·R<sub>v</sub> + β·A<sub>m</sub> + γ·H<sub>f</sub>) × (1 − S<sub>p</sub>)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px 24px", marginTop: 12 }}>
                {[["α = 0.35", "Responsiveness (R_v)"], ["β = 0.40", "Follow-Through (A_m)"], ["γ = 0.25", "Handoff Quality (H_f)"], ["S_p", "Slash Penalty (non-delivery)"]].map(([k, v]) => (
                  <div key={k} style={{ fontSize: "0.8rem", color: "#5a5550" }}>
                    <span style={{ fontFamily: "'Courier Prime', monospace", color: "#1a1814", fontWeight: 700 }}>{k}</span> — {v}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 32 }}>
              <button className="btn btn-ink" onClick={() => setStep(2)}>See CDI in Action →</button>
            </div>
          </>
        )}

        {/* ── STEP 2: Live Inquiry + CDI Learning ── */}
        {step === 2 && (
          <>
            <p className="demo-eyebrow">Step 3 of 5 · Live Inquiry + CDI Learning</p>
            <h1 className="demo-h1">An inquiry arrives. CDI is watching.</h1>
            <p className="demo-sub">Every coordination event — responding, quoting, confirming — updates your score. Select an inquiry and respond.</p>

            <div className="cdi-panel">
              <div style={{ minWidth: 220 }}>
                <CDIMeter score={cdiScore} prev={prevScore} />
                <div style={{ marginTop: 20, fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#8a8078", marginBottom: 10 }}>Signal log</div>
                <div ref={logRef}>
                  {eventLog.map((ev, i) => (
                    <div className="event-item" key={i}>
                      <div>
                        <div className="event-label">{ev.label}</div>
                        <div className="event-time">{ev.time}</div>
                      </div>
                      <div className="event-delta">+{ev.delta}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a8078", marginBottom: 12 }}>
                  Incoming inquiries
                </div>
                {INQUIRIES.map((inq, i) => (
                  <div
                    key={i}
                    className={`inquiry-card ${selectedInquiry === i ? "selected" : ""}`}
                    onClick={() => !responded && setSelectedInquiry(i)}
                  >
                    <div className="inquiry-name">{inq.client}</div>
                    <div className="inquiry-detail">{inq.event}<br />{inq.service}<br />{inq.location}</div>
                    <div className="inquiry-budget" style={{ marginTop: 8 }}>{inq.budget}</div>
                  </div>
                ))}
                {selectedInquiry !== null && !responded && (
                  <button className="btn btn-brass" onClick={handleRespond} style={{ marginTop: 8, width: "100%" }}>
                    Respond Now (within SLA window) →
                  </button>
                )}
                {responded && (
                  <div style={{ marginTop: 12 }}>
                    <div className="success-badge">
                      <span>✓</span> Response sent · CDI +14 · Routing to agent verification
                    </div>
                  </div>
                )}
              </div>
            </div>

            {responded && (
              <div style={{ marginTop: 28 }}>
                <button className="btn btn-ink" onClick={() => setStep(3)}>View Agent Verification →</button>
              </div>
            )}
          </>
        )}

        {/* ── STEP 3: Agent Verification ── */}
        {step === 3 && (
          <>
            <p className="demo-eyebrow">Step 4 of 5 · Agent Verification</p>
            <h1 className="demo-h1">The agent queries CDI before it acts.</h1>
            <p className="demo-sub">Any AI agent — scheduling software, booking platform, autonomous coordinator — calls the CDI API to verify trust before making a decision. This is what they see.</p>

            <div style={{ marginBottom: 20 }}>
              <CDIMeter score={cdiScore} prev={prevScore} />
            </div>

            <div className="terminal">
              {AGENT_STEPS.slice(0, agentVisible).map((s, i) => (
                <div key={i} className="terminal-line">
                  {s.role === "agent" && (
                    <div className="terminal-agent">
                      <span style={{ color: "#5a7490" }}>agent@briarwood $</span>{" "}
                      <TypedText text={s.text} />
                    </div>
                  )}
                  {s.role === "system" && (
                    <div className="terminal-system" style={{ marginLeft: 16, color: "#8fbf8f", marginBottom: 8 }}>
                      {s.text}
                    </div>
                  )}
                  {s.role === "agent" && s.text.startsWith("Agent") && (
                    <div className="terminal-decision">
                      <TypedText text={s.text} />
                    </div>
                  )}
                </div>
              ))}
              {agentVisible === 0 && <span style={{ color: "#5a7490" }}>Initializing agent session...</span>}
            </div>

            <hr className="hairline" />

            <div style={{ background: "#edeae3", border: "1px solid #d8d2c8", padding: "24px 28px" }}>
              <div style={{ fontSize: "0.72rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a8078", marginBottom: 14 }}>CDI Trust Tiers</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
                {[
                  { tier: "Restricted", range: "0–49", color: "#8b3a3a", cap: "Read-only access" },
                  { tier: "Conditional", range: "50–79", color: "#b8963e", cap: "Submit inquiries, place holds" },
                  { tier: "Full Access", range: "80–100", color: "#5c7a3e", cap: "Contracts, invoices, automation" },
                ].map(t => (
                  <div key={t.tier} style={{ padding: "16px", border: `1px solid ${t.color}22`, background: `${t.color}08` }}>
                    <div style={{ fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: t.color, marginBottom: 4, fontWeight: 600 }}>{t.tier}</div>
                    <div style={{ fontFamily: "'Fraunces', serif", fontSize: "1rem", color: "#1a1814", marginBottom: 6 }}>{t.range}</div>
                    <div style={{ fontSize: "0.78rem", color: "#5a5550", lineHeight: 1.5 }}>{t.cap}</div>
                  </div>
                ))}
              </div>
            </div>

            {agentVisible >= AGENT_STEPS.length && (
              <div style={{ marginTop: 28 }}>
                <button className="btn btn-ink" onClick={() => setStep(4)}>View Payment Layer →</button>
              </div>
            )}
          </>
        )}

        {/* ── STEP 4: Payment ── */}
        {step === 4 && (
          <>
            <p className="demo-eyebrow">Step 5 of 5 · Payment Infrastructure</p>
            <h1 className="demo-h1">1.5% on every transaction through the layer.</h1>
            <p className="demo-sub">Briarwood processes payments as the infrastructure layer. The provider keeps the relationship. We take 1.5% for verification, coordination, and trust scoring.</p>

            <div style={{ border: "1px solid #d8d2c8", background: "#edeae3", padding: "32px" }}>
              <div style={{ fontSize: "0.72rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a8078", marginBottom: 24 }}>
                Booking: {INQUIRIES[selectedInquiry ?? 0]?.client ?? "Sarah M."} · {INQUIRIES[selectedInquiry ?? 0]?.service ?? "Bridal Hair + Makeup"}
              </div>

              <div className="payment-row">
                <span className="payment-label">Booking total</span>
                <span className="payment-val">${bookingAmount.toLocaleString()}.00</span>
              </div>
              <div className="payment-row">
                <span className="payment-label">
                  Briarwood platform fee{" "}
                  <span className="payment-fee">(1.5% · coordination + CDI + verification)</span>
                </span>
                <span className="payment-val" style={{ color: "#b8963e" }}>−${platformFee}.00</span>
              </div>
              <div className="payment-row" style={{ borderBottom: "none", paddingTop: 20 }}>
                <span style={{ fontFamily: "'Fraunces', serif", fontSize: "1rem", color: "#1a1814" }}>Provider receives</span>
                <span className="payment-total">${providerReceives.toLocaleString()}.00</span>
              </div>
            </div>

            <div style={{ marginTop: 20, padding: "20px 24px", border: "1px solid #d8d2c8", background: "#f0ede6" }}>
              <div style={{ fontSize: "0.72rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a8078", marginBottom: 10 }}>What 1.5% pays for</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
                {["Real-time CDI scoring", "Agent verification layer", "Coordination proof escrow", "Trust graph indexing", "SLA monitoring", "Fraud & slash protection"].map(f => (
                  <div key={f} style={{ fontSize: "0.82rem", color: "#3a3530", display: "flex", gap: 8 }}>
                    <span style={{ color: "#5c7a3e" }}>✓</span> {f}
                  </div>
                ))}
              </div>
            </div>

            {!paymentDone ? (
              <div style={{ marginTop: 28 }}>
                <button className="btn btn-green" onClick={() => setPaymentDone(true)}>
                  Process Payment via Square →
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginTop: 28, padding: "24px 28px", border: "1px solid #c4dbb4", background: "#edf5e8" }}>
                  <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.72rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "#5c7a3e", marginBottom: 8 }}>Payment complete</div>
                      <div style={{ fontFamily: "'Fraunces', serif", fontSize: "1.1rem", color: "#1a1814", marginBottom: 4 }}>
                        ${providerReceives.toLocaleString()}.00 routed to {form.name || "Violet Herod"}
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "#5a7a50" }}>CDI score updated · Proof-of-service hash generated · Escrow released</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: "0.72rem", color: "#8a8078" }}>
                        txn_{Math.random().toString(36).slice(2, 10).toUpperCase()}<br />
                        via Square · Briarwood layer
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="hairline" />

                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: "1.4rem", fontStyle: "italic", color: "#5a5550", marginBottom: 24, lineHeight: 1.4 }}>
                    Behavior becomes score.<br />Score becomes search.<br />Search makes action safer.
                  </div>
                  <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                    <button className="btn btn-ink" onClick={() => { setStep(0); setForm({ name: "", email: "", phone: "", network: [], service: "" }); setCdiScore(50); setPrevScore(50); setEventLog([]); setSelectedInquiry(null); setResponded(false); setAgentVisible(0); setPaymentDone(false); }}>
                      Restart Demo
                    </button>
                    <a className="btn btn-ghost" href="mailto:violet@briarwood.ai" style={{ textDecoration: "none" }}>
                      Request Early Access
                    </a>
                  </div>
                </div>
              </>
            )}
          </>
        )}

      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #d8d2c8", padding: "24px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#8a8078" }}>Briarwood AI</div>
        <div style={{ fontSize: "0.72rem", color: "#8a8078" }}>
          CDI™ Patent Pending · San Francisco · 2026 · <a href="mailto:violet@briarwood.ai" style={{ color: "#5a5550" }}>violet@briarwood.ai</a>
        </div>
      </div>
    </div>
  );
}
