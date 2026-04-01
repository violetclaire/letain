import { useState, useEffect } from "react";

const STEPS = ["Inquiry", "Text", "Email", "Thread", "Payment"];

const FIRM = "Meridian Landscape Architecture";
const CLIENT = "Hargrove Development Group";
const PROJECT = "Riverfront Mixed-Use Development — Phase II";
const AMOUNT = 125000;
const FEE = Math.round(AMOUNT * 0.015);
const PAYOUT = AMOUNT - FEE;

function StepDots({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {STEPS.map((label, i) => (
        <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: step > i ? "#1a1814" : step === i ? "#b8963e" : "transparent",
            border: step > i ? "1px solid #1a1814" : step === i ? "1px solid #b8963e" : "1px solid #d8d2c8",
            transition: "all 0.3s"
          }} />
          <span style={{ fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase", color: step === i ? "#b8963e" : "#b8b2a8" }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Mock phone SMS ──
function PhoneMockup({ visible }: { visible: boolean }) {
  const [msgs, setMsgs] = useState<number>(0);

  useEffect(() => {
    if (!visible) return;
    setMsgs(0);
    const timers = [
      setTimeout(() => setMsgs(1), 400),
      setTimeout(() => setMsgs(2), 1800),
      setTimeout(() => setMsgs(3), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [visible]);

  const messages = [
    { from: "Briarwood", text: `New inquiry from ${CLIENT}.\n\nProject: ${PROJECT}\nBudget: $125,000\nTimeline: Q3 2026`, time: "9:14 AM", out: false },
    { from: "Briarwood", text: "Your CDI score has been verified (74 — Conditional). The client has been notified you've been matched.", time: "9:14 AM", out: false },
    { from: "Briarwood", text: "Reply via your private thread: briarwood.ai/t/mrdn-7f2k\n\nLink expires in 48h.", time: "9:15 AM", out: false },
  ];

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
      <div style={{
        width: 300, background: "#1a1814", borderRadius: 36, padding: "10px 6px",
        boxShadow: "0 32px 80px rgba(0,0,0,0.28), 0 0 0 1px #3a3530"
      }}>
        {/* Notch */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <div style={{ width: 100, height: 24, background: "#0e0e0e", borderRadius: 12 }} />
        </div>
        {/* Screen */}
        <div style={{ background: "#f4f1eb", borderRadius: 28, padding: "12px 0", minHeight: 440, overflow: "hidden" }}>
          {/* Status bar */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "0 16px 8px", fontSize: "0.65rem", color: "#5a5550" }}>
            <span>9:14 AM</span>
            <span>●●●</span>
          </div>
          {/* Header */}
          <div style={{ background: "#edeae3", padding: "10px 16px", borderBottom: "1px solid #d8d2c8", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1a1814", display: "flex", alignItems: "center", justifyContent: "center", color: "#f4f1eb", fontSize: "0.78rem", fontWeight: 700 }}>B</div>
            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#1a1814" }}>Briarwood AI</div>
              <div style={{ fontSize: "0.62rem", color: "#8a8078" }}>Trust Infrastructure</div>
            </div>
          </div>
          {/* Messages */}
          <div style={{ padding: "12px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.slice(0, msgs).map((m, i) => (
              <div key={i} style={{ animation: "fadeUp 0.35s ease" }}>
                <div style={{
                  background: "#1a1814", color: "#f4f1eb",
                  borderRadius: "14px 14px 14px 4px",
                  padding: "10px 12px", fontSize: "0.72rem", lineHeight: 1.55,
                  maxWidth: "88%", whiteSpace: "pre-wrap"
                }}>
                  {m.text}
                </div>
                <div style={{ fontSize: "0.58rem", color: "#b8b2a8", marginTop: 3, paddingLeft: 4 }}>{m.time}</div>
              </div>
            ))}
            {msgs === 0 && (
              <div style={{ textAlign: "center", color: "#b8b2a8", fontSize: "0.72rem", marginTop: 40 }}>
                Incoming message...
              </div>
            )}
          </div>
        </div>
        {/* Home bar */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
          <div style={{ width: 80, height: 4, background: "#3a3530", borderRadius: 2 }} />
        </div>
      </div>
    </div>
  );
}

// ── Mock email ──
function EmailMockup({ visible }: { visible: boolean }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setShow(true), 300);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <div style={{ border: "1px solid #d8d2c8", background: "#fff", borderRadius: 2, overflow: "hidden", maxWidth: 580, margin: "0 auto", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>
      {/* Email chrome */}
      <div style={{ background: "#edeae3", padding: "10px 16px", borderBottom: "1px solid #d8d2c8", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["#ff5f57","#febc2e","#28c840"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
        </div>
        <div style={{ flex: 1, background: "#f4f1eb", border: "1px solid #d8d2c8", borderRadius: 4, padding: "3px 10px", fontSize: "0.72rem", color: "#8a8078" }}>
          mail.briarwood.ai
        </div>
      </div>
      {/* Email list sidebar + main */}
      <div style={{ display: "flex", minHeight: 360 }}>
        {/* Sidebar */}
        <div style={{ width: 180, borderRight: "1px solid #d8d2c8", padding: "12px 0" }}>
          {["Inbox (1)", "Sent", "Archive", "Spam"].map((f, i) => (
            <div key={f} style={{ padding: "7px 16px", fontSize: "0.76rem", color: i === 0 ? "#1a1814" : "#8a8078", fontWeight: i === 0 ? 600 : 400, background: i === 0 ? "#edeae3" : "transparent", cursor: "pointer" }}>
              {f}
            </div>
          ))}
        </div>
        {/* Email body */}
        <div style={{ flex: 1, padding: "20px 24px", opacity: show ? 1 : 0, transition: "opacity 0.5s ease" }}>
          <div style={{ fontSize: "0.62rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a8078", marginBottom: 8 }}>From: noreply@briarwood.ai</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: "1.1rem", color: "#1a1814", marginBottom: 4, fontWeight: 600 }}>
            New Inquiry — {CLIENT}
          </div>
          <div style={{ fontSize: "0.72rem", color: "#8a8078", marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid #d8d2c8" }}>
            To: james@meridian-la.com · Today at 9:14 AM
          </div>
          <div style={{ fontSize: "0.84rem", lineHeight: 1.8, color: "#3a3530" }}>
            <p style={{ marginBottom: 12 }}>Hi James,</p>
            <p style={{ marginBottom: 12 }}>A new project inquiry has arrived through Briarwood.</p>
            <div style={{ background: "#f4f1eb", border: "1px solid #d8d2c8", padding: "14px 18px", marginBottom: 16, fontSize: "0.8rem" }}>
              <div style={{ marginBottom: 6 }}><strong>Client:</strong> {CLIENT}</div>
              <div style={{ marginBottom: 6 }}><strong>Project:</strong> {PROJECT}</div>
              <div style={{ marginBottom: 6 }}><strong>Budget:</strong> $125,000</div>
              <div><strong>Timeline:</strong> Q3 2026</div>
            </div>
            <p style={{ marginBottom: 16 }}>
              Your CDI score of <strong>74</strong> has been verified. You are authorized to submit a proposal and place a hold.
            </p>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ display: "inline-block", background: "#1a1814", color: "#f4f1eb", padding: "11px 24px", fontSize: "0.82rem", fontWeight: 600, letterSpacing: "0.04em", cursor: "pointer" }}>
                Open Private Thread →
              </div>
            </div>
            <p style={{ fontSize: "0.72rem", color: "#8a8078" }}>
              briarwood.ai/t/mrdn-7f2k · Link expires in 48 hours · CDI™ Patent Pending
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mock thread view ──
function ThreadMockup() {
  return (
    <div style={{ border: "1px solid #d8d2c8", background: "#f4f1eb", maxWidth: 580, margin: "0 auto" }}>
      {/* Thread header */}
      <div style={{ background: "#1a1814", color: "#f4f1eb", padding: "16px 20px" }}>
        <div style={{ fontSize: "0.62rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a8078", marginBottom: 4 }}>Private Thread · briarwood.ai/t/mrdn-7f2k</div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: "1.1rem", marginBottom: 2 }}>{CLIENT}</div>
        <div style={{ fontSize: "0.78rem", color: "#8a8078" }}>{PROJECT}</div>
      </div>

      {/* CDI badge */}
      <div style={{ background: "#edeae3", borderBottom: "1px solid #d8d2c8", padding: "10px 20px", display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a8078" }}>
          CDI Verified
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {[["Score", "74"], ["Tier", "Conditional"], ["Responsiveness", "91%"], ["Follow-through", "87%"]].map(([k, v]) => (
            <div key={k} style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.68rem", color: "#8a8078", letterSpacing: "0.08em" }}>{k}</div>
              <div style={{ fontSize: "0.84rem", fontWeight: 600, color: "#1a1814" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Thread messages */}
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
        {[
          { from: CLIENT, text: "We're finalizing the master plan for the Riverfront project. Looking for a full landscape architecture scope including grading, irrigation, planting, and hardscape. Budget is firm at $125K.", time: "9:08 AM", role: "client" },
          { from: "Briarwood AI", text: "Inquiry received and routed to Meridian Landscape Architecture. CDI verification complete. Response expected within 4 hours.", time: "9:09 AM", role: "system" },
          { from: "Meridian LA", text: "Thank you — we've worked on three comparable Riverfront projects. Happy to schedule a site walk and send a formal proposal within 48 hours.", time: "9:22 AM", role: "provider" },
        ].map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.role === "provider" ? "flex-end" : "flex-start" }}>
            <div style={{ fontSize: "0.66rem", color: "#8a8078", marginBottom: 3, paddingLeft: m.role === "provider" ? 0 : 4, paddingRight: m.role === "provider" ? 4 : 0 }}>{m.from} · {m.time}</div>
            <div style={{
              background: m.role === "provider" ? "#1a1814" : m.role === "system" ? "#edeae3" : "#ffffff",
              color: m.role === "provider" ? "#f4f1eb" : "#1a1814",
              border: m.role === "system" ? "1px solid #d8d2c8" : "none",
              padding: "10px 14px",
              maxWidth: "82%",
              fontSize: "0.82rem",
              lineHeight: 1.65,
              borderRadius: m.role === "provider" ? "12px 12px 4px 12px" : m.role === "system" ? "2px" : "12px 12px 12px 4px",
              fontStyle: m.role === "system" ? "italic" : "normal",
              color: m.role === "system" ? "#8a8078" : m.role === "provider" ? "#f4f1eb" : "#1a1814",
            }}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Reply bar */}
      <div style={{ borderTop: "1px solid #d8d2c8", padding: "12px 16px", background: "#edeae3", display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{ flex: 1, background: "#f4f1eb", border: "1px solid #d8d2c8", padding: "9px 12px", fontSize: "0.8rem", color: "#8a8078", borderRadius: 2 }}>
          Reply to thread...
        </div>
        <div style={{ background: "#1a1814", color: "#f4f1eb", padding: "9px 16px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>Send</div>
      </div>
    </div>
  );
}

export default function BriarwoodDemo() {
  const [step, setStep] = useState(0);
  const [paymentDone, setPaymentDone] = useState(false);

  const [form, setForm] = useState({
    company: "", contact: "", email: "", phone: "", project: "", budget: "$125,000", timeline: ""
  });

  function next() { setStep(s => Math.min(s + 1, 4)); }

  return (
    <div style={{ background: "#f4f1eb", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#1a1814" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@400;500;600&family=Courier+Prime&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        input, select, textarea {
          background: #edeae3; border: 1px solid #d8d2c8;
          padding: 11px 14px; font-size: 0.88rem; color: #1a1814;
          font-family: 'Inter', sans-serif; outline: none;
          transition: border-color 0.2s; width: 100%; border-radius: 0;
          -webkit-appearance: none;
        }
        input:focus, select:focus, textarea:focus { border-color: #1a1814; }
        label { font-size: 0.68rem; letter-spacing: 0.14em; text-transform: uppercase; color: #5a5550; display: block; margin-bottom: 5px; }
        .fg { display: flex; flex-direction: column; margin-bottom: 16px; }
        .fg-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .btn { display: inline-block; padding: 12px 26px; font-size: 0.84rem; font-weight: 600; letter-spacing: 0.04em; cursor: pointer; border: none; font-family: 'Inter', sans-serif; transition: opacity 0.2s; }
        .btn-ink { background: #1a1814; color: #f4f1eb; }
        .btn-ink:hover { opacity: 0.82; }
        .btn-ghost { background: transparent; border: 1px solid #d8d2c8; color: #3a3530; }
        .btn-ghost:hover { border-color: #1a1814; }
        @media (max-width:600px) {
          .fg-row { grid-template-columns: 1fr; }
          .demo-body { padding: 40px 20px 60px !important; }
        }
      `}</style>

      {/* Nav */}
      <div style={{
        position: "sticky", top: 0, zIndex: 40,
        background: "rgba(244,241,235,0.95)", backdropFilter: "blur(10px)",
        borderBottom: "1px solid #d8d2c8", padding: "16px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12
      }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: "0.9rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Briarwood AI · Live Demo
        </div>
        <StepDots step={step} />
        <div style={{ fontSize: "0.7rem", color: "#8a8078", letterSpacing: "0.08em" }}>CDI™ Patent Pending</div>
      </div>

      <div className="demo-body" style={{ maxWidth: 680, margin: "0 auto", padding: "60px 40px 80px" }}>

        {/* ── STEP 0: Inquiry Form ── */}
        {step === 0 && (
          <div style={{ animation: "fadeUp 0.35s ease" }}>
            <div style={{ fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#8a8078", marginBottom: 12 }}>Step 1 · Client Inquiry</div>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "2rem", fontWeight: 400, color: "#1a1814", marginBottom: 8, lineHeight: 1.2 }}>
              Submit a project inquiry.
            </h1>
            <p style={{ fontSize: "0.9rem", color: "#5a5550", lineHeight: 1.75, marginBottom: 36 }}>
              This is what a client sees when they reach out to a Briarwood-verified provider. CDI begins scoring the moment the inquiry is submitted.
            </p>

            <div style={{ background: "#edeae3", border: "1px solid #d8d2c8", padding: "28px 28px 20px" }}>
              <div style={{ fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a8078", marginBottom: 20 }}>
                Meridian Landscape Architecture · Inquiry Form
              </div>

              <div className="fg-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div className="fg">
                  <label>Company Name</label>
                  <input placeholder="Hargrove Development Group" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
                </div>
                <div className="fg">
                  <label>Primary Contact</label>
                  <input placeholder="Daniel Hargrove" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
                </div>
                <div className="fg">
                  <label>Email</label>
                  <input placeholder="d.hargrove@hargrovedev.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="fg">
                  <label>Phone</label>
                  <input placeholder="+1 (628) 000-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div className="fg">
                <label>Project Description</label>
                <textarea rows={3} placeholder="Riverfront Mixed-Use Development — Phase II. Full landscape architecture scope including grading, irrigation, planting plan, and hardscape." value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))} style={{ resize: "vertical" }} />
              </div>
              <div className="fg-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="fg">
                  <label>Budget</label>
                  <input value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
                </div>
                <div className="fg">
                  <label>Desired Timeline</label>
                  <input placeholder="Q3 2026" value={form.timeline} onChange={e => setForm(f => ({ ...f, timeline: e.target.value }))} />
                </div>
              </div>
              <button className="btn btn-ink" onClick={next} style={{ width: "100%", marginTop: 8 }}>
                Submit Inquiry →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 1: Text message ── */}
        {step === 1 && (
          <div style={{ animation: "fadeUp 0.35s ease" }}>
            <div style={{ fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#8a8078", marginBottom: 12 }}>Step 2 · Provider Notification</div>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "2rem", fontWeight: 400, color: "#1a1814", marginBottom: 8, lineHeight: 1.2 }}>
              The provider gets a text.
            </h1>
            <p style={{ fontSize: "0.9rem", color: "#5a5550", lineHeight: 1.75, marginBottom: 32 }}>
              The moment an inquiry is submitted, Briarwood sends an SMS to the provider. No app to open. No dashboard to check. It arrives in their existing messages — exactly where they already work.
            </p>
            <PhoneMockup visible={step === 1} />
            <div style={{ marginTop: 28, textAlign: "center" }}>
              <button className="btn btn-ink" onClick={next}>See the email →</button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Email ── */}
        {step === 2 && (
          <div style={{ animation: "fadeUp 0.35s ease" }}>
            <div style={{ fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#8a8078", marginBottom: 12 }}>Step 3 · Email Notification</div>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "2rem", fontWeight: 400, color: "#1a1814", marginBottom: 8, lineHeight: 1.2 }}>
              And an email — with context.
            </h1>
            <p style={{ fontSize: "0.9rem", color: "#5a5550", lineHeight: 1.75, marginBottom: 32 }}>
              The email delivers the full inquiry with CDI verification status, project details, and a private magic link. No login. One click.
            </p>
            <EmailMockup visible={step === 2} />
            <div style={{ marginTop: 28, textAlign: "center" }}>
              <button className="btn btn-ink" onClick={next}>Open the private thread →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Thread ── */}
        {step === 3 && (
          <div style={{ animation: "fadeUp 0.35s ease" }}>
            <div style={{ fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#8a8078", marginBottom: 12 }}>Step 4 · Private Thread</div>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "2rem", fontWeight: 400, color: "#1a1814", marginBottom: 8, lineHeight: 1.2 }}>
              The private thread — with CDI live.
            </h1>
            <p style={{ fontSize: "0.9rem", color: "#5a5550", lineHeight: 1.75, marginBottom: 32 }}>
              Both parties communicate through a magic-link thread. No accounts. No passwords. CDI scores every interaction — response speed, follow-through, coordination quality — in real time.
            </p>
            <ThreadMockup />
            <div style={{ marginTop: 28, textAlign: "center" }}>
              <button className="btn btn-ink" onClick={next}>See the payment layer →</button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Payment ── */}
        {step === 4 && (
          <div style={{ animation: "fadeUp 0.35s ease" }}>
            <div style={{ fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#8a8078", marginBottom: 12 }}>Step 5 · Payment Infrastructure</div>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "2rem", fontWeight: 400, color: "#1a1814", marginBottom: 8, lineHeight: 1.2 }}>
              1.5% on every transaction through the layer.
            </h1>
            <p style={{ fontSize: "0.9rem", color: "#5a5550", lineHeight: 1.75, marginBottom: 36 }}>
              Briarwood processes the payment as the infrastructure layer. The provider keeps the client relationship. The platform takes 1.5% for CDI verification, coordination proof, and escrow.
            </p>

            <div style={{ border: "1px solid #d8d2c8", background: "#edeae3", padding: "28px 32px", marginBottom: 16 }}>
              <div style={{ fontSize: "0.68rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "#8a8078", marginBottom: 20 }}>
                {FIRM} · {CLIENT}
              </div>
              {[
                ["Project", PROJECT],
                ["Contract value", `$${AMOUNT.toLocaleString()}.00`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #d8d2c8", fontSize: "0.88rem" }}>
                  <span style={{ color: "#5a5550" }}>{k}</span>
                  <span style={{ color: "#1a1814", fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #d8d2c8", fontSize: "0.88rem" }}>
                <span style={{ color: "#5a5550" }}>
                  Briarwood platform fee{" "}
                  <span style={{ fontSize: "0.76rem", color: "#b8963e" }}>(1.5% — CDI + coordination + escrow)</span>
                </span>
                <span style={{ color: "#b8963e", fontWeight: 600 }}>−${FEE.toLocaleString()}.00</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "18px 0 4px", alignItems: "baseline" }}>
                <span style={{ fontFamily: "'Fraunces', serif", fontSize: "1rem", color: "#1a1814" }}>Provider receives</span>
                <span style={{ fontFamily: "'Fraunces', serif", fontSize: "1.6rem", color: "#1a1814", letterSpacing: "-0.5px" }}>${PAYOUT.toLocaleString()}.00</span>
              </div>
            </div>

            <div style={{ border: "1px solid #d8d2c8", background: "#f0ede6", padding: "18px 24px", marginBottom: 28 }}>
              <div style={{ fontSize: "0.68rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "#8a8078", marginBottom: 10 }}>What 1.5% covers</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px" }}>
                {["Real-time CDI scoring", "Agent verification layer", "Coordination proof escrow", "Trust graph indexing", "SLA monitoring", "Proof-of-service hash"].map(f => (
                  <div key={f} style={{ fontSize: "0.8rem", color: "#3a3530", display: "flex", gap: 8 }}>
                    <span style={{ color: "#5c7a3e" }}>✓</span> {f}
                  </div>
                ))}
              </div>
            </div>

            {!paymentDone ? (
              <button className="btn btn-ink" style={{ width: "100%" }} onClick={() => setPaymentDone(true)}>
                Process via Square →
              </button>
            ) : (
              <>
                <div style={{ border: "1px solid #c4dbb4", background: "#edf5e8", padding: "20px 24px", marginBottom: 32 }}>
                  <div style={{ fontSize: "0.68rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "#5c7a3e", marginBottom: 6 }}>Payment complete</div>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: "1.1rem", color: "#1a1814", marginBottom: 4 }}>
                    ${PAYOUT.toLocaleString()}.00 routed to {FIRM}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#5a7a50" }}>
                    CDI updated · Proof-of-service hash generated · Escrow released · Trust graph deepened
                  </div>
                </div>

                <hr style={{ border: "none", borderTop: "1px solid #d8d2c8", margin: "0 0 32px" }} />

                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: "1.3rem", fontStyle: "italic", color: "#5a5550", marginBottom: 24, lineHeight: 1.5 }}>
                    Behavior becomes score.<br />Score becomes search.<br />Search makes action safer.
                  </div>
                  <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                    <button className="btn btn-ink" onClick={() => { setStep(0); setPaymentDone(false); }}>
                      Restart Demo
                    </button>
                    <a className="btn btn-ghost" href="mailto:violet@briarwood.ai" style={{ textDecoration: "none" }}>
                      Request Early Access
                    </a>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

      </div>

      <div style={{ borderTop: "1px solid #d8d2c8", padding: "24px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: "0.8rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#8a8078" }}>Briarwood AI</div>
        <div style={{ fontSize: "0.72rem", color: "#8a8078" }}>
          CDI™ Patent Pending · San Francisco · 2026 ·{" "}
          <a href="mailto:violet@briarwood.ai" style={{ color: "#5a5550" }}>violet@briarwood.ai</a>
        </div>
      </div>
    </div>
  );
}
