import { useState, useEffect, useRef } from "react";

const STEPS = ["Onboard", "Email", "Text", "CDI Graph"];

// ── Shared ──────────────────────────────────────────────────────────────────

function StepDots({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
      {STEPS.map((label, i) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: step > i ? "#1a1814" : step === i ? "#b8963e" : "transparent",
            border: `1px solid ${step > i ? "#1a1814" : step === i ? "#b8963e" : "#d8d2c8"}`,
            transition: "all 0.3s",
            flexShrink: 0,
          }} />
          <span style={{ fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: step === i ? "#b8963e" : "#b8b2a8" }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

const NETWORKS = ["Landscape Architecture", "Civil Engineering", "General Contracting", "Interior Designer", "Architecture", "MEP Engineering", "Project Management", "Urban Planning", "Event Producer", "Stylist"];

// ── STEP 0: Onboarding ───────────────────────────────────────────────────────

function OnboardStep({ onNext }: { onNext: (data: { name: string; phone: string; email: string }) => void }) {
  const [tab, setTab] = useState<"profile" | "network" | "bank">("profile");
  const [form, setForm] = useState({ name: "", phone: "", email: "", network: [] as string[], routing: "", account: "", bank: "" });
  const [profileDone, setProfileDone] = useState(false);
  const [networkDone, setNetworkDone] = useState(false);

  function toggleNet(n: string) {
    setForm(f => ({ ...f, network: f.network.includes(n) ? f.network.filter(x => x !== n) : [...f.network, n] }));
  }

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <div style={{ fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#8a8078", marginBottom: 12 }}>Step 1 · Provider Onboarding</div>
      <h1 style={H1}>Join the Briarwood trust network.</h1>
      <p style={SUB}>Your coordination reputation is your edge. We make it machine-readable.</p>

      {/* Tab nav */}
      <div style={{ display: "flex", borderBottom: "1px solid #d8d2c8", marginBottom: 28, gap: 0 }}>
        {(["profile", "network", "bank"] as const).map((t, i) => {
          const labels = ["01 · Profile", "02 · Network", "03 · Banking"];
          const done = (t === "network" && profileDone) || (t === "bank" && networkDone);
          const locked = (t === "network" && !profileDone) || (t === "bank" && !networkDone);
          return (
            <button key={t} onClick={() => !locked && setTab(t)} style={{
              padding: "10px 20px", background: "none", border: "none",
              borderBottom: tab === t ? "2px solid #1a1814" : "2px solid transparent",
              color: tab === t ? "#1a1814" : locked ? "#c8c2b8" : "#5a5550",
              fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase",
              cursor: locked ? "not-allowed" : "pointer", fontFamily: "'Inter',sans-serif",
              transition: "all 0.2s", marginBottom: -1,
            }}>
              {labels[i]} {done && !locked ? "✓" : ""}
            </button>
          );
        })}
      </div>

      {/* Profile tab */}
      {tab === "profile" && (
        <div>
          <div style={FGROW}>
            <div style={FG}><label style={LBL}>Full Name</label><input style={INPUT} placeholder="James Meridian" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div style={FG}><label style={LBL}>Phone</label><input style={INPUT} placeholder="+1 (628) 000-0000" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <div style={{ marginBottom: 20 }}><label style={LBL}>Work Email</label><input style={{ ...INPUT, width: "100%" }} placeholder="james@meridian-la.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <button style={BTNINK} onClick={() => { setProfileDone(true); setTab("network"); }}>Continue to Network →</button>
        </div>
      )}

      {/* Network tab */}
      {tab === "network" && (
        <div>
          <p style={{ fontSize: "0.84rem", color: "#5a5550", lineHeight: 1.7, marginBottom: 20 }}>
            Select the professional categories in your trusted referral network. Briarwood routes inquiries you can't take to providers you've verified.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 28 }}>
            {NETWORKS.map(n => (
              <div key={n} onClick={() => toggleNet(n)} style={{
                padding: "8px 16px", border: `1px solid ${form.network.includes(n) ? "#1a1814" : "#d8d2c8"}`,
                background: form.network.includes(n) ? "#1a1814" : "#edeae3",
                color: form.network.includes(n) ? "#f4f1eb" : "#3a3530",
                fontSize: "0.8rem", cursor: "pointer", transition: "all 0.18s",
              }}>{n}</div>
            ))}
          </div>
          <button style={BTNINK} onClick={() => { setNetworkDone(true); setTab("bank"); }}>Continue to Banking →</button>
        </div>
      )}

      {/* Bank tab */}
      {tab === "bank" && (
        <div>
          <p style={{ fontSize: "0.84rem", color: "#5a5550", lineHeight: 1.7, marginBottom: 20 }}>
            Briarwood routes payments directly to your bank via Square. 1.5% platform fee deducted at time of transaction.
          </p>
          <div style={FGROW}>
            <div style={FG}><label style={LBL}>Bank Name</label><input style={INPUT} placeholder="First Republic Bank" value={form.bank} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))} /></div>
            <div style={FG}><label style={LBL}>Routing Number</label><input style={INPUT} placeholder="••••••••••" value={form.routing} onChange={e => setForm(f => ({ ...f, routing: e.target.value }))} /></div>
          </div>
          <div style={{ marginBottom: 24 }}><label style={LBL}>Account Number</label><input style={{ ...INPUT, width: "100%" }} placeholder="••••••••••••" value={form.account} onChange={e => setForm(f => ({ ...f, account: e.target.value }))} /></div>
          <div style={{ background: "#edeae3", border: "1px solid #d8d2c8", padding: "14px 18px", marginBottom: 24, fontSize: "0.8rem", color: "#5a5550", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span style={{ color: "#5c7a3e", fontSize: "0.9rem", marginTop: 1 }}>🔒</span>
            <span>Bank data is encrypted and handled via Square Connect. Briarwood does not store account numbers. Transactions are audited and CDI-verified.</span>
          </div>
          <button style={BTNINK} onClick={() => onNext({ name: form.name || "James Meridian", phone: form.phone || "+1 (628) 555-0142", email: form.email || "james@meridian-la.com" })}>
            Activate CDI Score →
          </button>
        </div>
      )}
    </div>
  );
}

// ── STEP 1: Email inbox ───────────────────────────────────────────────────────

function EmailStep({ name, email, onNext, onBack }: { name: string; email: string; onNext: () => void; onBack: () => void }) {
  const [open, setOpen] = useState<null | "inquiry" | "conflict">(null);
  const [choice, setChoice] = useState<null | "refer" | "waitlist">(null);
  const [emailsReady, setEmailsReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEmailsReady(true), 500);
    return () => clearTimeout(t);
  }, []);

  const emails = [
    { id: "inquiry", from: "Briarwood AI", subject: "New Inquiry — Hargrove Development Group", preview: "Riverfront Mixed-Use Phase II · $125,000 · Q3 2026", time: "9:14 AM", unread: true },
    { id: "conflict", from: "Briarwood AI", subject: "⚠ Conflict Detected — June 15", preview: "You have a project on this date. How do you want to proceed?", time: "9:15 AM", unread: true },
    { from: "Briarwood AI", subject: "Payment Received — Westfield Civic Center", preview: "$47,500 deposited. Proof-of-service hash generated.", time: "Mar 28", unread: false },
    { from: "Briarwood AI", subject: "Referral Completed — Castellan Design Group", preview: "Your referral was accepted. Coordination credit logged.", time: "Mar 24", unread: false },
  ];

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <button onClick={onBack} style={BACKBTN}>← Back</button>
      <div style={{ fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#8a8078", marginBottom: 12 }}>Step 2 · Email Notifications</div>
      <h1 style={H1}>It arrives in your inbox.</h1>
      <p style={SUB}>No dashboard to log into. No app to open. Briarwood sends everything to your existing email — inquiry details, CDI alerts, and smart prompts when something needs a decision.</p>

      {/* Email client mockup */}
      <div style={{ border: "1px solid #d8d2c8", background: "#fff", boxShadow: "0 4px 24px rgba(0,0,0,0.07)", overflow: "hidden" }}>
        {/* Chrome */}
        <div style={{ background: "#edeae3", padding: "10px 16px", borderBottom: "1px solid #d8d2c8", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {["#ff5f57", "#febc2e", "#28c840"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
          </div>
          <div style={{ flex: 1, background: "#f4f1eb", border: "1px solid #d8d2c8", borderRadius: 4, padding: "3px 12px", fontSize: "0.72rem", color: "#8a8078" }}>
            {email}
          </div>
        </div>

        <div style={{ display: "flex", minHeight: 420 }}>
          {/* Sidebar */}
          <div style={{ width: 170, borderRight: "1px solid #d8d2c8", padding: "12px 0", flexShrink: 0 }}>
            {["Inbox (2)", "Sent", "Archive", "Briarwood"].map((f, i) => (
              <div key={f} style={{ padding: "8px 16px", fontSize: "0.76rem", color: i === 0 ? "#1a1814" : "#8a8078", fontWeight: i === 0 ? 600 : 400, background: i === 0 ? "#edeae3" : "transparent" }}>
                {f}
              </div>
            ))}
          </div>

          {/* Email list + open email */}
          {!open ? (
            <div style={{ flex: 1, opacity: emailsReady ? 1 : 0, transition: "opacity 0.4s" }}>
              {emails.map((em, i) => (
                <div key={i} onClick={() => em.id && setOpen(em.id as any)} style={{
                  padding: "12px 16px", borderBottom: "1px solid #f0ede6",
                  background: em.unread ? "#fffdf8" : "#fff",
                  cursor: em.id ? "pointer" : "default",
                  transition: "background 0.15s",
                  display: "flex", gap: 12, alignItems: "flex-start",
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: em.unread ? "#b8963e" : "transparent", border: em.unread ? "none" : "1px solid #d8d2c8", marginTop: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: em.unread ? 600 : 400, color: "#1a1814", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{em.subject}</div>
                      <div style={{ fontSize: "0.68rem", color: "#8a8078", flexShrink: 0 }}>{em.time}</div>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#8a8078", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{em.preview}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : open === "inquiry" ? (
            <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto" }}>
              <button onClick={() => setOpen(null)} style={{ fontSize: "0.72rem", color: "#8a8078", background: "none", border: "none", cursor: "pointer", marginBottom: 12, fontFamily: "'Inter',sans-serif" }}>← Back</button>
              <div style={{ fontSize: "0.62rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a8078", marginBottom: 6 }}>From: noreply@briarwood.ai · Today 9:14 AM</div>
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: "1.1rem", color: "#1a1814", marginBottom: 16, fontWeight: 600 }}>New Inquiry — Hargrove Development Group</div>
              <div style={{ fontSize: "0.84rem", lineHeight: 1.8, color: "#3a3530" }}>
                <p style={{ marginBottom: 12 }}>Hi {name.split(" ")[0] || "James"},</p>
                <p style={{ marginBottom: 14 }}>A new project inquiry has arrived and your CDI score has been verified.</p>
                <div style={{ background: "#f4f1eb", border: "1px solid #d8d2c8", padding: "14px 18px", marginBottom: 16, fontSize: "0.8rem" }}>
                  {[["Client", "Hargrove Development Group"], ["Project", "Riverfront Mixed-Use Development — Phase II"], ["Budget", "$125,000"], ["Timeline", "Q3 2026"], ["Your CDI", "74 — Conditional Access"]].map(([k, v]) => (
                    <div key={k} style={{ marginBottom: 6 }}><strong>{k}:</strong> {v}</div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ background: "#1a1814", color: "#f4f1eb", padding: "10px 20px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>Open Private Thread →</div>
                  <div style={{ border: "1px solid #d8d2c8", color: "#3a3530", padding: "10px 20px", fontSize: "0.8rem", cursor: "pointer" }}>Decline</div>
                </div>
              </div>
            </div>
          ) : (
            /* Conflict email */
            <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto" }}>
              <button onClick={() => setOpen(null)} style={{ fontSize: "0.72rem", color: "#8a8078", background: "none", border: "none", cursor: "pointer", marginBottom: 12, fontFamily: "'Inter',sans-serif" }}>← Back</button>
              <div style={{ fontSize: "0.62rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a8078", marginBottom: 6 }}>From: noreply@briarwood.ai · Today 9:15 AM</div>
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: "1.1rem", color: "#1a1814", marginBottom: 16, fontWeight: 600 }}>⚠ Conflict Detected — June 15</div>
              <div style={{ fontSize: "0.84rem", lineHeight: 1.8, color: "#3a3530" }}>
                <p style={{ marginBottom: 14 }}>Hi {name.split(" ")[0] || "James"}, you have a project on <strong>June 15, 2026</strong> (Westfield Civic Center — Phase I).</p>
                <p style={{ marginBottom: 16 }}>Hargrove Development Group requested that date. <strong>How do you want to proceed?</strong></p>
                {!choice ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <button onClick={() => setChoice("refer")} style={{ ...BTNINK, width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Refer to my trusted network</span>
                      <span style={{ fontSize: "0.72rem", opacity: 0.7 }}>Briarwood routes to a verified provider</span>
                    </button>
                    <button onClick={() => setChoice("waitlist")} style={{ background: "transparent", border: "1px solid #d8d2c8", color: "#3a3530", padding: "12px 18px", width: "100%", textAlign: "left", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: "0.84rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Offer an alternate date</span>
                      <span style={{ fontSize: "0.72rem", opacity: 0.7 }}>Briarwood contacts client automatically</span>
                    </button>
                  </div>
                ) : choice === "refer" ? (
                  <div style={{ background: "#edf5e8", border: "1px solid #c4dbb4", padding: "14px 18px" }}>
                    <div style={{ fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#5c7a3e", marginBottom: 6 }}>Referral sent</div>
                    <div style={{ fontSize: "0.84rem", color: "#1a1814" }}>Briarwood has routed this inquiry to <strong>Castellan Design Group</strong> (CDI 81 — your top network match for this scope). They've been notified.</div>
                  </div>
                ) : (
                  <div style={{ background: "#edf5e8", border: "1px solid #c4dbb4", padding: "14px 18px" }}>
                    <div style={{ fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#5c7a3e", marginBottom: 6 }}>Client notified</div>
                    <div style={{ fontSize: "0.84rem", color: "#1a1814" }}>Briarwood has messaged Hargrove with your available dates (June 22, July 8). Awaiting their response.</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 24, fontSize: "0.8rem", color: "#8a8078" }}>
        Click the unread emails above to explore. Then continue when ready.
      </div>
      <div style={{ marginTop: 20 }}>
        <button style={BTNINK} onClick={onNext}>See the text message →</button>
      </div>
    </div>
  );
}

// ── STEP 2: Phone text ────────────────────────────────────────────────────────

function PhoneStep({ phone, onNext, onBack }: { phone: string; onNext: () => void; onBack: () => void }) {
  const [msgs, setMsgs] = useState(0);
  const [replied, setReplied] = useState<null | "yes" | "no">(null);

  useEffect(() => {
    setMsgs(0);
    const t1 = setTimeout(() => setMsgs(1), 500);
    const t2 = setTimeout(() => setMsgs(2), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const messages: { text: string; out: boolean; isPrompt?: boolean }[] = [
    { text: `Briarwood: New availability window open — June 22, 2026. Hargrove Development Group ($125K). Are you available and ready to send pricing?`, out: false },
    { text: replied ? (replied === "yes" ? "YES" : "NO") : "", out: true, isPrompt: !replied },
  ];

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <button onClick={onBack} style={BACKBTN}>← Back</button>
      <div style={{ fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#8a8078", marginBottom: 12 }}>Step 3 · SMS Prompt</div>
      <h1 style={H1}>A text asks one question.</h1>
      <p style={SUB}>When a clear action is needed, Briarwood sends a single text. One reply — and it handles the rest. No app, no login, no dashboard.</p>

      <div style={{ display: "flex", justifyContent: "center", padding: "16px 0 32px" }}>
        <div style={{ width: 290, background: "#1a1814", borderRadius: 36, padding: "10px 5px", boxShadow: "0 24px 64px rgba(0,0,0,0.25), 0 0 0 1px #2a2520" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <div style={{ width: 90, height: 22, background: "#0e0e0e", borderRadius: 11 }} />
          </div>
          <div style={{ background: "#f4f1eb", borderRadius: 28, overflow: "hidden" }}>
            {/* Status */}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 14px 4px", fontSize: "0.6rem", color: "#5a5550" }}>
              <span>9:15 AM</span><span>●●● ⌁</span>
            </div>
            {/* Header */}
            <div style={{ background: "#edeae3", padding: "8px 14px", borderBottom: "1px solid #d8d2c8", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1a1814", display: "flex", alignItems: "center", justifyContent: "center", color: "#f4f1eb", fontSize: "0.7rem", fontWeight: 700 }}>B</div>
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#1a1814" }}>Briarwood AI</div>
                <div style={{ fontSize: "0.56rem", color: "#8a8078" }}>{phone || "+1 (628) 555-0142"}</div>
              </div>
            </div>
            {/* Messages */}
            <div style={{ padding: "12px 10px", minHeight: 260, display: "flex", flexDirection: "column", gap: 10 }}>
              {msgs >= 1 && (
                <div style={{ animation: "fadeUp 0.35s ease" }}>
                  <div style={{ background: "#1a1814", color: "#f4f1eb", borderRadius: "12px 12px 12px 3px", padding: "9px 11px", fontSize: "0.69rem", lineHeight: 1.55, maxWidth: "90%" }}>
                    {messages[0].text}
                  </div>
                  <div style={{ fontSize: "0.54rem", color: "#b8b2a8", marginTop: 3, paddingLeft: 3 }}>9:15 AM</div>
                </div>
              )}
              {msgs >= 2 && !replied && (
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", animation: "fadeUp 0.3s ease" }}>
                  <button onClick={() => { setReplied("no"); }} style={{ background: "#edeae3", border: "1px solid #d8d2c8", color: "#3a3530", padding: "7px 14px", fontSize: "0.7rem", cursor: "pointer", borderRadius: 14, fontFamily: "'Inter',sans-serif" }}>No</button>
                  <button onClick={() => { setReplied("yes"); }} style={{ background: "#1a1814", color: "#f4f1eb", border: "none", padding: "7px 14px", fontSize: "0.7rem", cursor: "pointer", borderRadius: 14, fontFamily: "'Inter',sans-serif", fontWeight: 600 }}>Yes →</button>
                </div>
              )}
              {replied && (
                <>
                  <div style={{ display: "flex", justifyContent: "flex-end", animation: "fadeUp 0.3s ease" }}>
                    <div style={{ background: "#4a7c59", color: "#fff", borderRadius: "12px 12px 3px 12px", padding: "8px 12px", fontSize: "0.69rem" }}>
                      {replied === "yes" ? "YES" : "NO"}
                    </div>
                  </div>
                  <div style={{ animation: "fadeUp 0.35s ease" }}>
                    <div style={{ background: "#1a1814", color: "#f4f1eb", borderRadius: "12px 12px 12px 3px", padding: "9px 11px", fontSize: "0.69rem", lineHeight: 1.55, maxWidth: "90%" }}>
                      {replied === "yes"
                        ? "Pricing sent to Hargrove. CDI updated +6. Thread open at briarwood.ai/t/mrdn-7f2k"
                        : "Got it. Routing to your network. Castellan Design Group notified. CDI referral credit logged."}
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Input bar */}
            <div style={{ borderTop: "1px solid #d8d2c8", padding: "8px 10px", background: "#edeae3", display: "flex", gap: 6, alignItems: "center" }}>
              <div style={{ flex: 1, background: "#f4f1eb", border: "1px solid #d8d2c8", borderRadius: 14, padding: "6px 10px", fontSize: "0.66rem", color: "#b8b2a8" }}>Message...</div>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#1a1814", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#f4f1eb", fontSize: "0.65rem" }}>↑</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
            <div style={{ width: 70, height: 4, background: "#3a3530", borderRadius: 2 }} />
          </div>
        </div>
      </div>

      <button style={BTNINK} onClick={onNext}>See CDI in action →</button>
    </div>
  );
}

// ── STEP 3: CDI Agent Graph ───────────────────────────────────────────────────

function CDIGraphStep({ onBack }: { onBack: () => void }) {
  const [tick, setTick] = useState(0);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<null | number>(null);
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const providers = [
    { name: "Meridian LA", score: 74, tier: "Conditional", x: 560, y: 80 },
    { name: "Castellan Design", score: 81, tier: "Full Access", x: 560, y: 180 },
    { name: "Summit Civil", score: 62, tier: "Conditional", x: 560, y: 280 },
    { name: "Harlow Interiors", score: 48, tier: "Restricted", x: 560, y: 380 },
  ];

  function runQuery() {
    if (running || !query.trim()) return;
    setRunning(true);
    setActive(null);
    setLog([]);
    const steps = [
      `> Agent: "${query}"`,
      `> Briarwood API: parsing intent...`,
      `> CDI lookup: scanning trust graph...`,
      `> Matched 4 verified providers`,
      `> Filtering by CDI ≥ 50 (Conditional tier)`,
      `> Ranked by score: Castellan (81) → Meridian (74) → Summit (62)`,
      `> Harlow Interiors (48) excluded — CDI below threshold`,
      `> Returning top match: Castellan Design Group`,
      `> Agent authorized to submit inquiry`,
    ];
    steps.forEach((s, i) => {
      setTimeout(() => {
        setLog(prev => [...prev, s]);
        if (i === 2) setActive(-1); // pulse CDI node
        if (i === 3) { setActive(0); setTimeout(() => setActive(1), 300); setTimeout(() => setActive(2), 600); setTimeout(() => setActive(3), 900); }
        if (i === steps.length - 1) setRunning(false);
      }, i * 420);
    });
  }

  const tierColor = (t: string) => t === "Full Access" ? "#5c7a3e" : t === "Conditional" ? "#b8963e" : "#8b3a3a";

  return (
    <div style={{ animation: "fadeUp 0.3s ease" }}>
      <button onClick={onBack} style={BACKBTN}>← Back</button>
      <div style={{ fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#8a8078", marginBottom: 12 }}>Step 4 · CDI Agent Graph</div>
      <h1 style={H1}>When an agent asks, CDI answers.</h1>
      <p style={SUB}>Any LLM or AI agent can query the Briarwood API. Type a natural language request below and watch the trust graph route it in real time.</p>

      {/* Query input */}
      <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
        <input
          style={{ ...INPUT, flex: 1 }}
          placeholder="Find me a landscape architect in San Francisco for a $125K project"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && runQuery()}
        />
        <button style={{ ...BTNINK, whiteSpace: "nowrap" }} onClick={runQuery}>
          {running ? "Routing..." : "Run Query →"}
        </button>
      </div>

      {/* Graph */}
      <div style={{ border: "1px solid #d8d2c8", background: "#edeae3", overflow: "hidden", position: "relative" }}>
        <svg width="100%" viewBox="0 0 700 480" style={{ display: "block" }}>
          {/* LLM/Agent node */}
          <g>
            <rect x="20" y="195" width="120" height="90" rx="4" fill="#1a1814" />
            <text x="80" y="225" textAnchor="middle" fill="#f4f1eb" fontSize="9" letterSpacing="1" fontFamily="Inter,sans-serif">LLM AGENT</text>
            <text x="80" y="242" textAnchor="middle" fill="#8a8078" fontSize="8" fontFamily="Inter,sans-serif">OpenAI / Claude</text>
            <text x="80" y="258" textAnchor="middle" fill="#b8963e" fontSize="8" fontFamily="Courier Prime,monospace">GET /api/agent/</text>
            {running && <rect x="20" y="195" width="120" height="90" rx="4" fill="none" stroke="#b8963e" strokeWidth="1.5">
              <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite" />
            </rect>}
          </g>

          {/* Arrow LLM → CDI */}
          <line x1="140" y1="240" x2="260" y2="240" stroke={running ? "#b8963e" : "#d8d2c8"} strokeWidth="1.5" strokeDasharray={running ? "none" : "4 4"} style={{ transition: "stroke 0.3s" }}>
            {running && <animate attributeName="stroke-dashoffset" from="0" to="-20" dur="0.5s" repeatCount="indefinite" />}
          </line>
          <polygon points="260,235 270,240 260,245" fill={running ? "#b8963e" : "#d8d2c8"} style={{ transition: "fill 0.3s" }} />

          {/* CDI Engine node */}
          <g>
            <circle cx="330" cy="240" r="58" fill="#f4f1eb" stroke={active === -1 ? "#b8963e" : "#d8d2c8"} strokeWidth={active === -1 ? 2 : 1} style={{ transition: "stroke 0.3s" }} />
            {active === -1 && <circle cx="330" cy="240" r="58" fill="none" stroke="#b8963e" strokeWidth="2">
              <animate attributeName="r" values="58;68;58" dur="1s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
            </circle>}
            <text x="330" y="228" textAnchor="middle" fill="#1a1814" fontSize="9" letterSpacing="1.5" fontFamily="Inter,sans-serif" fontWeight="600">BRIARWOOD</text>
            <text x="330" y="243" textAnchor="middle" fill="#b8963e" fontSize="9" letterSpacing="1" fontFamily="Inter,sans-serif">CDI ENGINE</text>
            <text x="330" y="258" textAnchor="middle" fill="#8a8078" fontSize="7.5" fontFamily="Courier Prime,monospace">Patent Pending</text>
          </g>

          {/* CDI → Providers */}
          {providers.map((p, i) => {
            const isActive = active !== null && active >= 0 && active >= i;
            const cx = 390;
            const cy = 240;
            const px = p.x - 80;
            const py = p.y + 28;
            return (
              <g key={i}>
                <line x1={cx} y1={cy} x2={px} y2={py}
                  stroke={isActive ? tierColor(p.tier) : "#d8d2c8"}
                  strokeWidth={isActive ? 1.5 : 1}
                  strokeDasharray={isActive ? "none" : "4 3"}
                  style={{ transition: "stroke 0.4s" }}
                />
              </g>
            );
          })}

          {/* Provider nodes */}
          {providers.map((p, i) => {
            const isActive = active !== null && active >= 0 && active >= i;
            const color = tierColor(p.tier);
            return (
              <g key={i}>
                <rect x={p.x - 80} y={p.y} width={160} height={70} rx="3"
                  fill={isActive ? "#fff" : "#f4f1eb"}
                  stroke={isActive ? color : "#d8d2c8"}
                  strokeWidth={isActive ? 1.5 : 1}
                  style={{ transition: "all 0.3s" }}
                />
                <text x={p.x} y={p.y + 20} textAnchor="middle" fill="#1a1814" fontSize="9" fontFamily="Inter,sans-serif" fontWeight="600">{p.name}</text>
                <text x={p.x} y={p.y + 35} textAnchor="middle" fill={color} fontSize="13" fontFamily="Inter,sans-serif" fontWeight="700">{p.score}</text>
                <text x={p.x} y={p.y + 50} textAnchor="middle" fill={color} fontSize="7" letterSpacing="1" fontFamily="Inter,sans-serif">{p.tier.toUpperCase()}</text>
                {isActive && p.tier === "Full Access" && (
                  <text x={p.x} y={p.y + 64} textAnchor="middle" fill="#5c7a3e" fontSize="7" fontFamily="Inter,sans-serif">✓ TOP MATCH</text>
                )}
                {isActive && p.tier === "Restricted" && (
                  <text x={p.x} y={p.y + 64} textAnchor="middle" fill="#8b3a3a" fontSize="7" fontFamily="Inter,sans-serif">✕ EXCLUDED</text>
                )}
              </g>
            );
          })}

          {/* Legend */}
          {[["Full Access", "#5c7a3e", 80], ["Conditional", "#b8963e", 50], ["Restricted", "#8b3a3a", 0]].map(([label, color, min], i) => (
            <g key={label as string} transform={`translate(30,${420 + i * 16})`}>
              <circle cx="6" cy="5" r="5" fill={color as string} />
              <text x="16" y="9" fill="#5a5550" fontSize="8" fontFamily="Inter,sans-serif">{label} (CDI {min}+)</text>
            </g>
          ))}
        </svg>
      </div>

      {/* Terminal log */}
      {log.length > 0 && (
        <div style={{ marginTop: 16, background: "#1a1814", padding: "16px 20px", fontFamily: "'Courier Prime', monospace", fontSize: "0.76rem", lineHeight: 1.7, color: "#c8d4c0", minHeight: 80, animation: "fadeUp 0.3s ease" }}>
          {log.map((line, i) => (
            <div key={i} style={{
              color: line.startsWith("> Agent") ? "#b8963e" : line.startsWith("> Returning") || line.startsWith("> Agent authorized") ? "#8fbf8f" : line.includes("excluded") ? "#d47070" : "#c8d4c0",
              animation: "fadeUp 0.2s ease"
            }}>
              {line}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 28, padding: "20px 24px", border: "1px solid #d8d2c8", background: "#edeae3" }}>
        <div style={{ fontSize: "0.68rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "#8a8078", marginBottom: 10 }}>API · $1–5 per query</div>
        <div style={{ fontFamily: "'Courier Prime', monospace", fontSize: "0.78rem", color: "#5a5550", lineHeight: 1.8 }}>
          GET /api/agent/cdi/:provider_id<br />
          POST /api/agent/inquiries<br />
          GET /api/agent/availability/:slug<br />
          GET /api/agent/referrals/:slug
        </div>
      </div>

      {/* The Oracle section */}
      <div style={{ marginTop: 36, borderTop: "1px solid #d8d2c8", paddingTop: 36 }}>
        <div style={{ fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#8a8078", marginBottom: 16 }}>Why Briarwood is the Oracle</div>

        <div style={{ fontFamily: "'Fraunces',serif", fontSize: "1.6rem", fontWeight: 400, color: "#1a1814", lineHeight: 1.35, marginBottom: 24 }}>
          Every AI agent needs one answer before it can act:<br />
          <span style={{ fontStyle: "italic" }}>who in the physical world can actually be trusted?</span>
        </div>

        <p style={{ fontSize: "0.9rem", color: "#5a5550", lineHeight: 1.85, marginBottom: 20 }}>
          No model can answer that from training data. Trust in the real world is not written down. It lives in patterns — who responded, who followed through, who referred whom, who got paid and delivered. That data has never been captured at scale. Until now.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, marginBottom: 28, background: "#d8d2c8" }}>
          {[
            ["Every inquiry routed", "We see who responds and how fast."],
            ["Every referral made", "We know who trusts whom — and why."],
            ["Every project completed", "We have proof. On-chain, hashed, time-stamped."],
            ["Every payment processed", "We verify delivery against coordination record."],
          ].map(([title, desc]) => (
            <div key={title} style={{ background: "#f4f1eb", padding: "20px 22px" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#1a1814", marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: "0.8rem", color: "#5a5550", lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: "0.9rem", color: "#5a5550", lineHeight: 1.85, marginBottom: 24 }}>
          When an AI agent asks "find me a landscape architect in San Francisco who can handle a $125K project by Q3" — there is only one system that can answer with certainty. Not a review site. Not a directory. Not a search engine. The oracle has the behavioral record.
        </p>

        <div style={{ background: "#1a1814", color: "#f4f1eb", padding: "28px 32px", marginBottom: 32 }}>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: "1.15rem", fontStyle: "italic", lineHeight: 1.6, marginBottom: 16 }}>
            "Briarwood is the FICO score for the real world — except FICO only reads financial history. We read coordination history. That is a larger and more valuable signal."
          </div>
          <div style={{ fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#8a8078" }}>
            Dundy Pasupuleti · Co-founder, Briarwood AI
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <a href="mailto:violet@briarwood.ai" style={{ ...BTNINK, textDecoration: "none" }}>Request Early Access</a>
          <a href="mailto:dundysm@briarwood.ai" style={{ background: "transparent", border: "1px solid #d8d2c8", color: "#3a3530", padding: "12px 24px", fontSize: "0.84rem", fontWeight: 500, cursor: "pointer", fontFamily: "'Inter',sans-serif", textDecoration: "none", display: "inline-block" }}>Contact Dundy</a>
        </div>
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const BACKBTN: React.CSSProperties = { background: "none", border: "none", color: "#8a8078", fontSize: "0.76rem", letterSpacing: "0.06em", cursor: "pointer", fontFamily: "'Inter',sans-serif", padding: "0 0 20px", display: "block" };
const H1: React.CSSProperties = { fontFamily: "'Fraunces',serif", fontSize: "2rem", fontWeight: 400, color: "#1a1814", marginBottom: 8, lineHeight: 1.2 };
const SUB: React.CSSProperties = { fontSize: "0.9rem", color: "#5a5550", lineHeight: 1.75, marginBottom: 32 };
const INPUT: React.CSSProperties = { background: "#edeae3", border: "1px solid #d8d2c8", padding: "11px 14px", fontSize: "0.88rem", color: "#1a1814", fontFamily: "'Inter',sans-serif", outline: "none", borderRadius: 0, WebkitAppearance: "none" as any };
const LBL: React.CSSProperties = { fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#5a5550", display: "block", marginBottom: 5 };
const BTNINK: React.CSSProperties = { background: "#1a1814", color: "#f4f1eb", padding: "12px 24px", fontSize: "0.84rem", fontWeight: 600, letterSpacing: "0.04em", cursor: "pointer", border: "none", fontFamily: "'Inter',sans-serif", display: "inline-block", textDecoration: "none" };
const FG: React.CSSProperties = { display: "flex", flexDirection: "column", marginBottom: 16 };
const FGROW: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 0 };

// ── Main ──────────────────────────────────────────────────────────────────────

export default function BriarwoodDemo() {
  const [step, setStep] = useState(0);
  const [providerData, setProviderData] = useState({ name: "James Meridian", phone: "+1 (628) 555-0142", email: "james@meridian-la.com" });

  return (
    <div style={{ background: "#f4f1eb", minHeight: "100vh", fontFamily: "'Inter',sans-serif", color: "#1a1814" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@400;500;600&family=Courier+Prime&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        input { transition: border-color 0.2s; }
        input:focus { border-color: #1a1814 !important; outline: none; }
      `}</style>

      {/* Nav */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(244,241,235,0.95)", backdropFilter: "blur(10px)", borderBottom: "1px solid #d8d2c8", padding: "14px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontFamily: "'Fraunces',serif", fontSize: "0.88rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>Briarwood AI · Live Demo</div>
        <StepDots step={step} />
        <div style={{ fontSize: "0.68rem", color: "#8a8078", letterSpacing: "0.08em" }}>CDI™ Patent Pending</div>
      </div>

      <div style={{ maxWidth: 660, margin: "0 auto", padding: "56px 40px 80px" }}>
        {step === 0 && <OnboardStep onNext={(d) => { setProviderData(d); setStep(1); }} />}
        {step === 1 && <EmailStep name={providerData.name} email={providerData.email} onNext={() => setStep(2)} onBack={() => setStep(0)} />}
        {step === 2 && <PhoneStep phone={providerData.phone} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <CDIGraphStep onBack={() => setStep(2)} />}
      </div>

      <div style={{ borderTop: "1px solid #d8d2c8", padding: "20px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontFamily: "'Fraunces',serif", fontSize: "0.78rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#8a8078" }}>Briarwood AI</div>
        <div style={{ fontSize: "0.7rem", color: "#8a8078" }}>
          CDI™ Patent Pending · San Francisco · 2026 · <a href="mailto:violet@briarwood.ai" style={{ color: "#5a5550" }}>violet@briarwood.ai</a>
        </div>
      </div>
    </div>
  );
}
