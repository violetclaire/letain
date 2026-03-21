import { useState, useEffect, useRef } from "react";
import { motion, useInView, animate } from "framer-motion";

const R = "#8b2035";
const SLIDES = 11;

function useSlideInView(once = true) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, amount: 0.4 });
  return { ref, inView };
}

function Counter({ to, duration = 1.8 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const { ref, inView } = useSlideInView();
  useEffect(() => {
    if (!inView) return;
    const ctrl = animate(0, to, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setVal(Math.round(v)),
    });
    return () => ctrl.stop();
  }, [inView, to, duration]);
  return <span ref={ref}>{val}</span>;
}

function GaugeChart({ pct }: { pct: number }) {
  const { ref, inView } = useSlideInView();
  const r = 110, cx = 140, cy = 140;
  const circumference = Math.PI * r;
  const dash = (pct / 100) * circumference;

  return (
    <div ref={ref} style={{ position: "relative", width: 280, height: 160, margin: "0 auto" }}>
      <svg width={280} height={160} viewBox="0 0 280 160">
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={14}
          strokeLinecap="round"
        />
        <motion.path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={R} strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          initial={{ strokeDashoffset: circumference }}
          animate={inView ? { strokeDashoffset: circumference - dash } : {}}
          transition={{ duration: 1.8, ease: "easeOut", delay: 0.3 }}
        />
        <circle cx={cx - r} cy={cy} r={5} fill="rgba(255,255,255,0.15)" />
        <circle cx={cx + r} cy={cy} r={5} fill={R} />
      </svg>
      <div style={{
        position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: "0.6rem", letterSpacing: "0.16em", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 4 }}>
          execution capacity lost
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", fontSize: "0.72rem" }}>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>0%</span>
          <span style={{ color: R }}>▪ Lost</span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>100%</span>
        </div>
      </div>
    </div>
  );
}

function FlowDiagram() {
  const { ref, inView } = useSlideInView();
  const steps = ["Identify Node", "Verify", "Search", "Handshake", "Underwrite", "Manage Chaos"];
  return (
    <div ref={ref} style={{ position: "relative", zIndex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center", margin: "32px 0 16px" }}>
        {steps.map((s, i) => (
          <motion.span key={s} style={{ display: "contents" }}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.18, duration: 0.4 }}
              style={{
                padding: "9px 14px", borderRadius: 6,
                border: "1px solid rgba(220,38,38,0.3)",
                background: "rgba(220,38,38,0.06)",
                color: "rgba(255,120,120,0.8)",
                fontSize: "0.8rem", whiteSpace: "nowrap",
              }}
            >
              {s}
            </motion.div>
            <motion.span
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: i * 0.18 + 0.1 }}
              style={{ color: "rgba(220,38,38,0.25)", fontSize: "0.85rem" }}
            >→</motion.span>
          </motion.span>
        ))}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: steps.length * 0.18 + 0.1, duration: 0.5, type: "spring" }}
          style={{
            padding: "9px 18px", borderRadius: 6,
            background: R, color: "#fff",
            fontSize: "0.82rem", fontWeight: 600,
          }}
        >
          Execute
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 1.5 }}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 8, marginTop: 8,
        }}
      >
        <div style={{ height: 1, width: 40, background: "rgba(220,38,38,0.2)" }} />
        <span style={{ fontSize: "0.62rem", color: "rgba(220,38,38,0.5)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          6 steps of invisible labor before a single task begins
        </span>
        <div style={{ height: 1, width: 40, background: "rgba(220,38,38,0.2)" }} />
      </motion.div>
    </div>
  );
}

function TimelineBars() {
  const { ref, inView } = useSlideInView();
  return (
    <div ref={ref} style={{ maxWidth: 620, width: "100%", marginTop: 40, position: "relative", zIndex: 1 }}>
      {[
        { label: "Traditional (FICO / Background Check)", days: "30–90 day lag", pct: 100, color: "rgba(220,38,38,0.5)", bad: true },
        { label: "Briarwood CDI — Instant Behavioral Primitive", days: "Second Zero", pct: 2, color: R, bad: false },
      ].map((row, i) => (
        <div key={row.label} style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "baseline" }}>
            <span style={{ fontSize: "0.78rem", color: row.bad ? "rgba(255,255,255,0.3)" : "#e8e8e8", fontWeight: row.bad ? 400 : 600 }}>{row.label}</span>
            <span style={{ fontSize: "0.7rem", color: row.bad ? "rgba(220,38,38,0.6)" : R, fontWeight: 600 }}>{row.days}</span>
          </div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={inView ? { width: `${row.pct}%` } : {}}
              transition={{ duration: 1.2, delay: i * 0.3 + 0.3, ease: "easeOut" }}
              style={{ height: "100%", background: row.color, borderRadius: 3 }}
            />
          </div>
        </div>
      ))}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 20, marginTop: 8 }}>
        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.7 }}>
          Latency is a gift to bad actors. Every day of lag is a window for reputation laundering — reset by changing a name or forming a new LLC.
        </p>
      </div>
    </div>
  );
}

function ScoreRing({ score, label, delay = 0 }: { score: number; label: string; delay?: number }) {
  const { ref, inView } = useSlideInView();
  const r = 38, c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: 96, height: 96 }}>
        <svg width={96} height={96} viewBox="0 0 96 96">
          <circle cx={48} cy={48} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={8} />
          <motion.circle
            cx={48} cy={48} r={r}
            fill="none" stroke={R} strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c}
            animate={inView ? { strokeDashoffset: c - dash } : {}}
            transition={{ duration: 1.4, delay, ease: "easeOut" }}
            transform="rotate(-90 48 48)"
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f0f0f0" }}>{score}</span>
        </div>
      </div>
      <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", textAlign: "center", maxWidth: 80 }}>{label}</span>
    </div>
  );
}

function MirrorNetwork() {
  const { ref, inView } = useSlideInView();
  return (
    <div ref={ref} style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 700 }}>
      <svg width="100%" viewBox="0 0 700 260" style={{ overflow: "visible" }}>
        {/* Connection lines */}
        {[[350,80],[180,200],[280,200],[420,200],[520,200]].slice(1).map(([x,y], i) => (
          <motion.line
            key={i} x1={350} y1={80} x2={x} y2={y}
            stroke={i === 2 ? "rgba(220,38,38,0.4)" : "rgba(255,255,255,0.1)"}
            strokeWidth={i === 2 ? 1.5 : 1}
            strokeDasharray="4 3"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={inView ? { pathLength: 1, opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.3 + i * 0.15 }}
          />
        ))}

        {/* Master node */}
        <motion.g initial={{ scale: 0, opacity: 0 }} animate={inView ? { scale: 1, opacity: 1 } : {}} transition={{ duration: 0.5 }}>
          <circle cx={350} cy={80} r={28} fill="#0d0d0d" stroke={R} strokeWidth={1.5} />
          <text x={350} y={75} textAnchor="middle" fill="#e8e8e8" fontSize={9} fontFamily="Inter" fontWeight={600}>MASTER</text>
          <text x={350} y={87} textAnchor="middle" fill={R} fontSize={8} fontFamily="Inter">CDI 91</text>
        </motion.g>

        {/* Sub-nodes */}
        {[
          { x: 180, y: 200, label: "Node A", score: "CDI 88", bad: false, delay: 0.5 },
          { x: 280, y: 200, label: "Node B", score: "CDI 74", bad: false, delay: 0.65 },
          { x: 420, y: 200, label: "Node C", score: "BURN", bad: true, delay: 0.8 },
          { x: 520, y: 200, label: "Node D", score: "CDI 91", bad: false, delay: 0.95 },
        ].map((n) => (
          <motion.g key={n.label}
            initial={{ scale: 0, opacity: 0 }}
            animate={inView ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 0.4, delay: n.delay }}
          >
            <circle cx={n.x} cy={n.y} r={24}
              fill={n.bad ? "rgba(220,38,38,0.08)" : "#0d0d0d"}
              stroke={n.bad ? "rgba(220,38,38,0.5)" : "rgba(255,255,255,0.1)"}
              strokeWidth={n.bad ? 1.5 : 1}
            />
            <text x={n.x} y={n.y - 5} textAnchor="middle" fill={n.bad ? "rgba(220,38,38,0.7)" : "rgba(255,255,255,0.5)"} fontSize={8} fontFamily="Inter" fontWeight={500}>{n.label}</text>
            <text x={n.x} y={n.y + 7} textAnchor="middle" fill={n.bad ? "rgba(220,38,38,0.9)" : R} fontSize={7} fontFamily="Inter" fontWeight={600}>{n.score}</text>
          </motion.g>
        ))}

        {/* Burn ripple */}
        {inView && (
          <>
            <motion.circle cx={420} cy={200} r={24}
              fill="none" stroke="rgba(220,38,38,0.4)" strokeWidth={1}
              initial={{ r: 24, opacity: 0.6 }}
              animate={{ r: 50, opacity: 0 }}
              transition={{ duration: 1.5, delay: 1.2, repeat: Infinity, repeatDelay: 2 }}
            />
            <motion.circle cx={350} cy={80} r={28}
              fill="none" stroke="rgba(220,38,38,0.3)" strokeWidth={1}
              initial={{ r: 28, opacity: 0 }}
              animate={{ r: 52, opacity: 0 }}
              transition={{ duration: 1.5, delay: 2, repeat: Infinity, repeatDelay: 2 }}
            />
          </>
        )}
      </svg>
      <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 8 }}>
        <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: R, display: "inline-block" }} />Node in good standing
        </span>
        <span style={{ fontSize: "0.62rem", color: "rgba(220,38,38,0.5)", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(220,38,38,0.5)", display: "inline-block" }} />Burn propagating to master
        </span>
      </div>
    </div>
  );
}

function MetricCard({ value, label, sub, delay = 0 }: { value: string; label: string; sub: string; delay?: number }) {
  const { ref, inView } = useSlideInView();
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      style={{
        background: "#0d0d0d", border: "1px solid rgba(255,255,255,0.06)",
        padding: "24px 28px", borderRadius: 8, textAlign: "left",
      }}
    >
      <div style={{ fontSize: "2rem", fontWeight: 700, color: "#f0f0f0", letterSpacing: "-1px", marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: "0.78rem", fontWeight: 600, color: R, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>{sub}</div>
    </motion.div>
  );
}

export default function Pitch() {
  const [current, setCurrent] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) setCurrent(Number((e.target as HTMLElement).dataset.slide));
      }),
      { threshold: 0.5 }
    );
    el.querySelectorAll("[data-slide]").forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  const go = (n: number) =>
    containerRef.current?.querySelector(`[data-slide="${n}"]`)?.scrollIntoView({ behavior: "smooth" });

  const fade = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.4 } };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        .deck { font-family: 'Inter', sans-serif; background: #050505; color: #e8e8e8; }
        .bar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 300;
          height: 48px; display: flex; align-items: center; justify-content: space-between;
          padding: 0 36px;
          background: rgba(5,5,5,0.88); backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .bar-logo { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; }
        .bar-r { display: flex; align-items: center; gap: 14px; }
        .bdots { display: flex; gap: 5px; }
        .bd {
          width: 5px; height: 5px; border-radius: 50%;
          background: rgba(255,255,255,0.12); cursor: pointer; border: none; padding: 0;
          transition: background 0.2s;
        }
        .bd.on { background: ${R}; }
        .bnum { font-size: 0.6rem; color: rgba(255,255,255,0.18); font-variant-numeric: tabular-nums; letter-spacing: 0.06em; }
        .sl {
          min-height: 100vh; width: 100%;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 80px 10vw 60px; position: relative; overflow: hidden;
        }
        .grid-bg::before {
          content: '';
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 56px 56px;
        }
        .eyebrow { font-size: 0.6rem; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: ${R}; margin-bottom: 18px; position: relative; z-index: 1; }
        .h1 { font-size: clamp(2.2rem, 4.5vw, 4rem); font-weight: 700; line-height: 1.05; letter-spacing: -1.5px; text-align: center; max-width: 840px; color: #f2f2f2; position: relative; z-index: 1; }
        .h-hero { font-size: clamp(3.5rem, 7vw, 6.5rem); font-weight: 800; line-height: 1; letter-spacing: -3px; text-align: center; color: #f2f2f2; position: relative; z-index: 1; }
        .sub { font-size: clamp(0.92rem, 1.4vw, 1.1rem); font-weight: 300; color: rgba(255,255,255,0.38); max-width: 500px; text-align: center; line-height: 1.7; margin-top: 14px; position: relative; z-index: 1; }
        .fn { font-size: 0.64rem; color: rgba(255,255,255,0.16); max-width: 420px; text-align: center; line-height: 1.7; margin-top: 16px; position: relative; z-index: 1; }
        .rule { width: 1px; height: 32px; background: rgba(255,255,255,0.08); margin: 20px auto; position: relative; z-index: 1; }
        .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: rgba(255,255,255,0.05); max-width: 760px; width: 100%; margin-top: 36px; position: relative; z-index: 1; border-radius: 10px; overflow: hidden; }
        .g3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; background: rgba(255,255,255,0.05); max-width: 820px; width: 100%; margin-top: 36px; position: relative; z-index: 1; border-radius: 10px; overflow: hidden; }
        .gc { background: #0c0c0c; padding: 26px 26px; }
        .gc-k { font-size: 0.58rem; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: ${R}; margin-bottom: 10px; }
        .gc-v { font-size: 0.84rem; font-weight: 300; line-height: 1.7; color: rgba(255,255,255,0.38); }
        .pill { display: inline-flex; align-items: center; gap: 8px; border: 1px solid rgba(255,255,255,0.07); border-radius: 100px; padding: 5px 14px; font-size: 0.58rem; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.22); margin-top: 12px; position: relative; z-index: 1; }
        .pdot { width: 5px; height: 5px; border-radius: 50%; background: ${R}; }
        .glow { position: absolute; border-radius: 50%; pointer-events: none; z-index: 0; }
        .cdi-big { font-size: clamp(5rem,13vw,11rem); font-weight: 800; letter-spacing: -4px; line-height: 1; background: linear-gradient(135deg, #f0f0f0 20%, #6b2535 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; position: relative; z-index: 1; }
        .cdi-sub { font-size: 0.8rem; font-weight: 400; letter-spacing: 0.08em; color: rgba(255,255,255,0.22); margin-top: 2px; margin-bottom: 6px; position: relative; z-index: 1; }
        .stamp { position: absolute; top: 26px; right: -72px; transform: rotate(45deg); z-index: 2; font-size: 0.54rem; letter-spacing: 0.14em; border: 1px solid rgba(255,255,255,0.05); padding: 4px 56px; white-space: nowrap; color: rgba(255,255,255,0.08); background: #050505; }
        .quote { font-size: clamp(1rem, 1.7vw, 1.3rem); font-weight: 300; font-style: italic; color: rgba(255,255,255,0.38); max-width: 540px; text-align: center; line-height: 1.7; margin-top: 24px; position: relative; z-index: 1; }
        .closing { font-size: clamp(2rem, 4.5vw, 4rem); font-weight: 700; line-height: 1.15; letter-spacing: -1.5px; text-align: center; color: #f0f0f0; position: relative; z-index: 1; }
        .ctas { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 40px; position: relative; z-index: 1; }
        .cta-p { background: #f0f0f0; color: #050505; padding: 12px 28px; font-size: 0.78rem; font-weight: 600; text-decoration: none; border-radius: 6px; letter-spacing: 0.02em; }
        .cta-g { background: transparent; border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.35); padding: 12px 28px; font-size: 0.78rem; text-decoration: none; border-radius: 6px; letter-spacing: 0.02em; }
        @media (max-width: 640px) { .sl { padding: 64px 7vw 48px; } .g2, .g3 { grid-template-columns: 1fr; } }
      `}</style>

      {/* Bar */}
      <div className="bar">
        <div className="bar-logo">Briarwood</div>
        <div className="bar-r">
          <div className="bdots">
            {Array.from({ length: SLIDES }, (_, i) => (
              <button key={i} className={`bd${current === i + 1 ? " on" : ""}`} onClick={() => go(i + 1)} />
            ))}
          </div>
          <div className="bnum">{String(current).padStart(2,"0")} / {String(SLIDES).padStart(2,"0")}</div>
        </div>
      </div>

      <div className="deck" ref={containerRef}>

        {/* 01 — Hero */}
        <div className="sl grid-bg" data-slide="1">
          <div className="glow" style={{ width: 700, height: 700, top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(139,32,53,0.14) 0%, transparent 65%)" }} />
          <motion.div {...fade} transition={{ duration: 0.6 }}>
            <div className="eyebrow" style={{ textAlign: "center" }}>dateinquiry.com</div>
            <div className="h-hero">BRIARWOOD</div>
            <div className="sub" style={{ margin: "14px auto 0" }}>The Infrastructure of Integrity.</div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div className="pill">
                <div className="pdot" />
                CDI: Choreography Depth Index™ &nbsp;·&nbsp; Patent Pending
              </div>
            </div>
          </motion.div>
        </div>

        {/* 02 — Trust Tax */}
        <div className="sl grid-bg" data-slide="2">
          <div className="glow" style={{ width: 500, height: 500, bottom: "-100px", right: "-100px", background: "radial-gradient(circle, rgba(139,32,53,0.12) 0%, transparent 65%)" }} />
          <motion.div {...fade} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, position: "relative", zIndex: 1 }}>
            <div className="eyebrow">The Trust Tax</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, lineHeight: 1 }}>
              <span style={{ fontSize: "clamp(6rem,16vw,13rem)", fontWeight: 800, letterSpacing: "-6px", color: "#f2f2f2" }}>
                <Counter to={64} duration={1.8} />
              </span>
              <span style={{ fontSize: "clamp(3rem,8vw,7rem)", fontWeight: 800, letterSpacing: "-3px", color: R, marginBottom: "0.1em" }}>%</span>
            </div>
            <div style={{ fontSize: "clamp(0.9rem,1.5vw,1.1rem)", color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", marginBottom: 20 }}>
              Execution Capacity Lost
            </div>
          </motion.div>
          <GaugeChart pct={64} />
          <div className="fn" style={{ marginTop: 24 }}>Derived from 28 years and 900+ high-stakes coordination events.</div>
        </div>

        {/* 03 — Chaos Wall */}
        <div className="sl grid-bg" data-slide="3">
          <motion.div {...fade} style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 1 }}>
            <div className="eyebrow">The Problem</div>
            <div className="h1">The Manual Friction Loop.</div>
          </motion.div>
          <FlowDiagram />
          <motion.div {...fade} transition={{ delay: 0.4 }}>
            <div className="sub" style={{ marginTop: 24 }}>
              Software runs on math. The physical world runs on variables. This is the Invisible Labor stalling every autonomous network.
            </div>
          </motion.div>
        </div>

        {/* 04 — Latency Gap */}
        <div className="sl grid-bg" data-slide="4">
          <motion.div {...fade} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div className="eyebrow">The Latency Gap</div>
            <div className="h1">90 Days vs. Second Zero.</div>
            <div className="sub">Traditional trust models rely on a 30/60/90-day lag. In high-stakes execution, that latency is a structural failure.</div>
          </motion.div>
          <TimelineBars />
        </div>

        {/* 05 — Identity Anchor */}
        <div className="sl grid-bg" data-slide="5">
          <motion.div {...fade} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div className="eyebrow">The Identity Anchor</div>
            <div className="h1">The SSN for Execution.</div>
            <div className="sub">You cannot reset integrity by changing a name or forming a new LLC.</div>
          </motion.div>
          <div className="g3">
            {[
              { k: "Anchored", v: "A CDI Identity follows every agent across every coordination event — permanently, across all legal structures." },
              { k: "No Reset", v: "An identity with no history reads as Unverified Origin — not zero — and triggers the Mirror Protocol automatically." },
              { k: "Immutable", v: "There is no Delete Profile button for integrity. The anchor is permanent and immutable." },
            ].map((x, i) => (
              <motion.div key={x.k} className="gc" {...fade} transition={{ delay: i * 0.15 }}>
                <div className="gc-k">{x.k}</div>
                <div className="gc-v">{x.v}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 06 — CDI */}
        <div className="sl grid-bg" data-slide="6" style={{ position: "relative", overflow: "hidden" }}>
          <div className="glow" style={{ width: 800, height: 800, top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(139,32,53,0.18) 0%, transparent 60%)" }} />
          <div className="stamp">US PATENT PENDING // REF: 28-YR GROUND TRUTH</div>
          <motion.div {...fade} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div className="eyebrow">The Patented Solution</div>
            <div className="cdi-big">CDI</div>
            <div className="cdi-sub">Choreography Depth Index™</div>
            <div className="pill" style={{ marginBottom: 28 }}><div className="pdot" />Patent Pending</div>
          </motion.div>
          <div style={{ display: "flex", gap: 40, justifyContent: "center", flexWrap: "wrap", margin: "8px 0 32px", position: "relative", zIndex: 1 }}>
            <ScoreRing score={91} label="Master Agent" delay={0.3} />
            <ScoreRing score={74} label="Sub-Agent" delay={0.5} />
            <ScoreRing score={23} label="Unverified Origin" delay={0.7} />
          </div>
          <div className="g3" style={{ maxWidth: 720 }}>
            {[
              { k: "Choreography", v: "Precise sequence and timing of multi-node execution events." },
              { k: "Depth", v: "High-fidelity behavioral ground truth that pixels cannot reach." },
              { k: "Index", v: "Machine-readable standard for underwriting risk at execution time." },
            ].map((x, i) => (
              <motion.div key={x.k} className="gc" {...fade} transition={{ delay: 0.2 + i * 0.12 }}
                style={{ borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <div className="gc-k">{x.k}</div>
                <div className="gc-v">{x.v}</div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 07 — Mirror Protocol */}
        <div className="sl grid-bg" data-slide="7">
          <motion.div {...fade} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div className="eyebrow">The Mirror Protocol</div>
            <div className="h1">Recursive Associative Trust.</div>
            <div className="sub">Trust is a network effect. You are the company you keep.</div>
          </motion.div>
          <MirrorNetwork />
          <motion.div {...fade} transition={{ delay: 0.5 }}>
            <div className="sub" style={{ marginTop: 16 }}>
              High-fidelity operators refuse to align with bad actors because the CDI Burn is too expensive. The system self-cleans.
            </div>
          </motion.div>
        </div>

        {/* 08 — Neutral Arbiter */}
        <div className="sl grid-bg" data-slide="8">
          <div className="glow" style={{ width: 600, height: 600, top: "30%", left: "50%", transform: "translateX(-50%)", background: "radial-gradient(circle, rgba(139,32,53,0.14) 0%, transparent 65%)" }} />
          <motion.div {...fade} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div className="eyebrow">The Moat</div>
            <div className="h1">Independence is the Moat.</div>
            <div className="quote">
              "You don't let the student grade their own paper.<br />You don't have the bank write its own credit report."
            </div>
            <div className="sub" style={{ marginTop: 28 }}>
              Agent companies cannot underwrite their own risk. Briarwood is the Independent Standard — it cannot be replicated by any player with skin in the game.
            </div>
          </motion.div>
        </div>

        {/* 09 — Why Now */}
        <div className="sl grid-bg" data-slide="9">
          <motion.div {...fade} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div className="eyebrow">Why Now</div>
            <div className="h1">Computing the Uncomputable.</div>
            <div className="sub">AI has hit the Screen Limit. Entering the physical world requires an Action-Conditioned Ledger.</div>
          </motion.div>
          <div className="g2" style={{ maxWidth: 680 }}>
            <motion.div className="gc" {...fade} transition={{ delay: 0.2 }}>
              <div className="gc-k">The Screen Limit</div>
              <div className="gc-v">AI agents have reached the boundary of what can be done in pixels. Every major model company is trying to enter the physical world — and hitting the same wall.</div>
            </motion.div>
            <motion.div className="gc" {...fade} transition={{ delay: 0.35 }}>
              <div className="gc-k">The Bridge</div>
              <div className="gc-v">We provide the Choreography — behavioral truth — that LLMs and Video Models cannot learn from pixels alone. It must be lived, captured, and indexed.</div>
            </motion.div>
          </div>
        </div>

        {/* 10 — Execution Integrity */}
        <div className="sl grid-bg" data-slide="10">
          <motion.div {...fade} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div className="eyebrow">With Briarwood</div>
            <div className="h1">Execution Integrity.</div>
          </motion.div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, maxWidth: 720, width: "100%", marginTop: 36, position: "relative", zIndex: 1 }}>
            <MetricCard value="169" label="Inquiries Processed" sub="Real bookings routed through the CDI layer" delay={0.1} />
            <MetricCard value="37" label="Referrals Routed" sub="Network choreography working in production" delay={0.25} />
            <MetricCard value="15" label="Deposits Collected" sub="Square payments with 1.5% platform fee" delay={0.4} />
          </div>
          <motion.div {...fade} transition={{ delay: 0.5 }} style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 32, position: "relative", zIndex: 1 }}>
            <div style={{ padding: "9px 16px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, fontSize: "0.82rem", color: "rgba(255,255,255,0.3)" }}>Identify Node</div>
            <span style={{ color: R, fontSize: "1.2rem" }}>→</span>
            <div style={{ padding: "9px 18px", borderRadius: 6, background: R, color: "#fff", fontSize: "0.82rem", fontWeight: 600 }}>Execute</div>
          </motion.div>
          <div className="ctas">
            <a href="mailto:violet@briarwood.ai" className="cta-p">Request a Demo</a>
            <a href="/demo-landing" className="cta-g">Full Overview →</a>
          </div>
        </div>

        {/* 11 — Philosophy */}
        <div className="sl grid-bg" data-slide="11">
          <div className="glow" style={{ width: 700, height: 700, bottom: "-200px", left: "50%", transform: "translateX(-50%)", background: "radial-gradient(circle, rgba(139,32,53,0.15) 0%, transparent 65%)" }} />
          <motion.div {...fade} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div className="eyebrow">The Philosophy</div>
            <div className="closing">
              Privacy Stays.<br />
              <span style={{ color: R }}>Reputation Runs.</span><br />
              Trust Wins.
            </div>
            <div className="rule" />
            <div className="sub">The Human Defense Layer for the High-Stakes Economy.</div>
            <div style={{ marginTop: 52, fontSize: "0.58rem", letterSpacing: "0.18em", color: "rgba(255,255,255,0.1)", textTransform: "uppercase", position: "relative", zIndex: 1 }}>
              Briarwood &nbsp;·&nbsp; Founder Led &nbsp;·&nbsp; CDI™ Patent Pending &nbsp;·&nbsp; 2026
            </div>
          </motion.div>
        </div>

      </div>
    </>
  );
}
