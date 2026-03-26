import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BG     = "#000000";
const SURF   = "#0a0a0a";
const BORDER = "#1a1a1a";
const WHITE  = "#f0f0f0";
const DIM    = "#666666";
const GREEN  = "#00ff41";
const RED    = "#ff2020";
const ORANGE = "#ff8c00";
const BLUE   = "#00aaff";

/* CDI formula */
function calcCDI(rv: number, hf: number, am: number[], slashed: boolean): number {
  if (slashed) return 0;
  const rvScore  = rv;
  const hfScore  = hf;
  const amScore  = (am.length / 3) * 100;
  const alpha = 0.35, beta = 0.40, gamma = 0.25;
  return Math.round(alpha * rvScore + beta * hfScore + gamma * amScore);
}

function tier(score: number): { label: string; color: string; sub: string } {
  if (score >= 80) return { label: "ESCROW APPROVED",        color: GREEN,  sub: "CDI threshold met — capital routing authorized" };
  if (score >= 25) return { label: "PROBATIONARY ROUTING",   color: ORANGE, sub: "Restricted routing — high-stakes escrow blocked" };
  return             { label: "ROUTING HALTED / SLASHED",    color: RED,    sub: "Node removed from agentic routing pool" };
}

/* Log line builder */
function buildLog(rv: number, hf: number, am: number[], slashed: boolean, score: number, ts: string) {
  return JSON.stringify({
    timestamp: ts,
    method: "GET",
    endpoint: "/v1/cdi/verify/node_mk89xp",
    response: {
      node_id: "node_mk89xp",
      cdi_score: score,
      tier: score >= 80 ? "HIGH_TRUST" : score >= 25 ? "CONDITIONAL" : "SLASHED",
      routing_eligible: score >= 25 && !slashed,
      probation: slashed,
      inputs: {
        response_velocity: rv,
        historical_followthrough: hf,
        attestation: {
          venue_verified: am.includes(0),
          client_verified: am.includes(1),
          vendor_verified: am.includes(2),
          consensus: `${am.length}/3`,
        },
        slashing_applied: slashed,
      },
      attestation_hash: slashed ? "INVALIDATED" : `sha256:${Math.random().toString(16).slice(2, 14)}`,
    },
  }, null, 2);
}

/* Slider */
function Slider({ label, sub, value, onChange, color = WHITE }: {
  label: string; sub: string; value: number;
  onChange: (v: number) => void; color?: string;
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <div>
          <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.68rem",
            letterSpacing: "0.16em", textTransform: "uppercase", color: WHITE }}>{label}</div>
          <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.58rem",
            color: DIM, marginTop: 2 }}>{sub}</div>
        </div>
        <div style={{ fontFamily: "'Courier New', monospace", fontSize: "1.4rem",
          fontWeight: 700, color, minWidth: 48, textAlign: "right" }}>{value}</div>
      </div>
      <div style={{ position: "relative", height: 6, background: BORDER, cursor: "pointer" }}
        onClick={(e) => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          onChange(Math.round(pct * 100));
        }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0,
          width: `${value}%`, background: color, transition: "width 0.1s" }} />
        <input type="range" min={0} max={100} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position: "absolute", inset: 0, opacity: 0, width: "100%",
            cursor: "pointer", margin: 0 }} />
      </div>
    </div>
  );
}

export default function Terminal() {
  const [rv,      setRv]      = useState(72);
  const [hf,      setHf]      = useState(85);
  const [am,      setAm]      = useState<number[]>([0, 1]);
  const [slashed, setSlashed] = useState(false);
  const [logs,    setLogs]    = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const score   = calcCDI(rv, hf, am, slashed);
  const status  = tier(score);

  const toggleAm = (i: number) => setAm(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

  useEffect(() => {
    const ts = new Date().toISOString();
    const entry = buildLog(rv, hf, am, slashed, score, ts);
    setLogs(prev => [...prev.slice(-6), entry]);
  }, [rv, hf, am, slashed]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: ${BG}; color: ${WHITE}; min-height: 100vh; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${BG}; }
        ::-webkit-scrollbar-thumb { background: ${BORDER}; }
        input[type=range] { -webkit-appearance: none; }

        .shell {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          font-family: 'Courier New', monospace;
        }

        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 28px;
          border-bottom: 1px solid ${BORDER};
          background: ${SURF};
          flex-shrink: 0;
        }

        .split {
          flex: 1;
          display: grid;
          grid-template-columns: 420px 1fr;
          min-height: 0;
        }

        @media (max-width: 900px) {
          .split { grid-template-columns: 1fr; }
        }

        .panel-l {
          border-right: 1px solid ${BORDER};
          padding: 28px 28px;
          overflow-y: auto;
          background: ${SURF};
        }

        .panel-r {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: ${BG};
        }

        .panel-section {
          padding: 24px 28px;
          border-bottom: 1px solid ${BORDER};
        }

        .log-area {
          flex: 1;
          overflow-y: auto;
          padding: 0;
          background: ${BG};
        }

        .sec-label {
          font-size: 0.52rem;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: ${DIM};
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sec-label::after {
          content: '';
          flex: 1;
          height: 1px;
          background: ${BORDER};
        }
      `}</style>

      <div className="shell">

        {/* Top bar */}
        <div className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {[RED, ORANGE, GREEN].map(c => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
              ))}
            </div>
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: "0.62rem",
              letterSpacing: "0.14em", color: DIM }}>
              BRIARWOOD AI — EXECUTION ORACLE · AGENT SANDBOX v1.0
            </span>
          </div>
          <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
            <span style={{ fontSize: "0.58rem", letterSpacing: "0.1em", color: GREEN }}>
              ● LIVE
            </span>
            <a href="/sandbox" style={{ fontSize: "0.58rem", letterSpacing: "0.12em",
              textTransform: "uppercase", color: DIM, textDecoration: "none" }}>
              Docs →
            </a>
            <a href="/pitch" style={{ fontSize: "0.58rem", letterSpacing: "0.12em",
              textTransform: "uppercase", color: DIM, textDecoration: "none" }}>
              Pitch →
            </a>
          </div>
        </div>

        <div className="split">

          {/* LEFT — Dark Matter Ingestion */}
          <div className="panel-l">
            <div className="sec-label">Dark Matter Ingestion</div>

            <Slider label="Response Velocity (R_v)" sub="Time-to-action under pressure · 0–100"
              value={rv} onChange={setRv} color={BLUE} />

            <Slider label="Historical Follow-through (H_f)" sub="Verified off-chain completion rate · 0–100%"
              value={hf} onChange={setHf} color={BLUE} />

            {/* Attestation */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.68rem",
                letterSpacing: "0.16em", textTransform: "uppercase", color: WHITE, marginBottom: 4 }}>
                Multi-Party Attestation (A_m)
              </div>
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.58rem",
                color: DIM, marginBottom: 14 }}>
                Consensus: {am.length}/3 parties verified
              </div>
              {["Venue Verified", "Client Verified", "Adjacent Vendor Verified"].map((label, i) => (
                <label key={i} style={{ display: "flex", alignItems: "center", gap: 12,
                  marginBottom: 10, cursor: "pointer" }}>
                  <div onClick={() => toggleAm(i)} style={{
                    width: 18, height: 18, border: `1px solid ${am.includes(i) ? GREEN : BORDER}`,
                    background: am.includes(i) ? GREEN : "transparent",
                    cursor: "pointer", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s",
                  }}>
                    {am.includes(i) && <span style={{ color: BG, fontSize: "0.7rem", fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ fontFamily: "'Courier New', monospace", fontSize: "0.7rem",
                    color: am.includes(i) ? WHITE : DIM, transition: "color 0.15s" }}>
                    {label}
                  </span>
                  {am.includes(i) && (
                    <span style={{ fontFamily: "'Courier New', monospace", fontSize: "0.52rem",
                      color: GREEN, letterSpacing: "0.1em" }}>VERIFIED</span>
                  )}
                </label>
              ))}
            </div>

            {/* Slash switch */}
            <div style={{ padding: "16px 18px", border: `1px solid ${slashed ? RED : BORDER}`,
              background: slashed ? `${RED}10` : "transparent",
              transition: "all 0.2s", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div>
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.68rem",
                    letterSpacing: "0.16em", textTransform: "uppercase",
                    color: slashed ? RED : WHITE }}>
                    Programmatic Slashing (S_p)
                  </div>
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.58rem",
                    color: slashed ? `${RED}aa` : DIM, marginTop: 3 }}>
                    {slashed ? "CONFIRMED FAILURE · CDI → 0 · ROUTING HALTED" : "Simulate confirmed counterparty failure"}
                  </div>
                </div>
                <button onClick={() => setSlashed(!slashed)} style={{
                  width: 52, height: 28, borderRadius: 14,
                  background: slashed ? RED : BORDER,
                  border: "none", cursor: "pointer", position: "relative",
                  transition: "background 0.2s", flexShrink: 0,
                  boxShadow: slashed ? `0 0 12px ${RED}60` : "none",
                }}>
                  <div style={{
                    position: "absolute", top: 4, width: 20, height: 20, borderRadius: "50%",
                    background: WHITE, transition: "left 0.2s",
                    left: slashed ? 28 : 4,
                  }} />
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT — Agentic Settlement Terminal */}
          <div className="panel-r">

            {/* CDI Score */}
            <div className="panel-section">
              <div className="sec-label">Agentic Settlement Terminal</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 8 }}>
                <AnimatePresence mode="wait">
                  <motion.div key={score}
                    initial={{ opacity: 0.4, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800,
                      fontSize: "clamp(4rem, 10vw, 7rem)", lineHeight: 1,
                      color: slashed ? RED : score >= 80 ? GREEN : score >= 25 ? ORANGE : RED,
                      letterSpacing: "-3px",
                      textShadow: `0 0 40px ${slashed ? RED : score >= 80 ? GREEN : score >= 25 ? ORANGE : RED}40`,
                      transition: "color 0.3s",
                    }}>
                    {score}
                  </motion.div>
                </AnimatePresence>
                <div style={{ paddingBottom: "0.6rem" }}>
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.58rem",
                    color: DIM, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    CDI Score
                  </div>
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.58rem",
                    color: DIM }}>
                    (α·R_v + β·H_f + γ·A_m) × (1−S_p)
                  </div>
                </div>
              </div>
              {/* Score bar */}
              <div style={{ height: 3, background: BORDER, position: "relative", marginBottom: 4 }}>
                <motion.div animate={{ width: `${score}%` }} transition={{ duration: 0.25 }}
                  style={{ position: "absolute", left: 0, top: 0, bottom: 0,
                    background: slashed ? RED : score >= 80 ? GREEN : score >= 25 ? ORANGE : RED,
                    transition: "background 0.3s" }} />
                {[25, 80].map(t => (
                  <div key={t} style={{ position: "absolute", top: -4, bottom: -4, left: `${t}%`,
                    width: 1, background: BORDER }} />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between",
                fontFamily: "'Courier New', monospace", fontSize: "0.5rem", color: BORDER }}>
                <span>0</span><span>25</span><span>80</span><span>100</span>
              </div>
            </div>

            {/* Settlement Status */}
            <div className="panel-section">
              <div className="sec-label">Settlement Status</div>
              <AnimatePresence mode="wait">
                <motion.div key={status.label}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}>
                  <div style={{
                    display: "inline-block", padding: "8px 18px",
                    border: `1px solid ${status.color}`,
                    background: `${status.color}12`,
                    fontFamily: "'Courier New', monospace", fontSize: "0.8rem",
                    fontWeight: 700, letterSpacing: "0.1em", color: status.color,
                    textShadow: `0 0 10px ${status.color}60`,
                    boxShadow: `0 0 20px ${status.color}15`,
                    marginBottom: 10,
                  }}>
                    {status.label}
                  </div>
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.64rem",
                    color: DIM }}>{status.sub}</div>
                </motion.div>
              </AnimatePresence>

              {/* Weight breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                gap: 1, background: BORDER, marginTop: 16 }}>
                {[
                  { k: "R_v × 0.35", v: Math.round(rv * 0.35) },
                  { k: "H_f × 0.40", v: Math.round(hf * 0.40) },
                  { k: "A_m × 0.25", v: Math.round((am.length/3)*100*0.25) },
                ].map(x => (
                  <div key={x.k} style={{ background: SURF, padding: "10px 12px" }}>
                    <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.5rem",
                      color: DIM, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
                      {x.k}
                    </div>
                    <div style={{ fontFamily: "'Courier New', monospace", fontSize: "1.1rem",
                      fontWeight: 700, color: slashed ? RED : WHITE }}>{slashed ? "0" : x.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live API Log */}
            <div className="panel-section" style={{ paddingBottom: 12 }}>
              <div className="sec-label">Live API Log</div>
            </div>
            <div ref={logRef} className="log-area" style={{ padding: "0 28px 24px" }}>
              {logs.map((log, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.52rem",
                    color: DIM, marginBottom: 4, letterSpacing: "0.08em" }}>
                    {i < logs.length - 1 ? "// previous call" : "// latest · GET /v1/cdi/verify/node_mk89xp"}
                  </div>
                  <pre style={{
                    fontFamily: "'Courier New', monospace",
                    fontSize: "0.68rem", lineHeight: 1.65,
                    color: i < logs.length - 1 ? BORDER : WHITE,
                    whiteSpace: "pre-wrap", wordBreak: "break-all",
                    borderLeft: `2px solid ${i < logs.length - 1 ? BORDER : (slashed ? RED : score >= 80 ? GREEN : ORANGE)}`,
                    paddingLeft: 12,
                    transition: "color 0.2s, border-color 0.2s",
                  }}>
                    {log}
                  </pre>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
