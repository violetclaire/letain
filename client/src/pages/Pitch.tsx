import { useState, useEffect, useRef } from "react";
import { motion, useInView, animate } from "framer-motion";

const BLUE  = "#00cfff";
const RED   = "#ff2d55";
const AMBER = "#ffaa00";
const BG    = "#050810";
const SURF  = "#090d1a";
const TEXT  = "#c8d8ff";
const FAINT = "rgba(200,216,255,0.35)";
const SLIDES = 11;

function useVw(ref: React.RefObject<HTMLDivElement | null>) {
  const inView = useInView(ref as React.RefObject<HTMLElement>, { once: true, amount: 0.3 });
  return inView;
}

function Counter({ to, duration = 1.8 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref as React.RefObject<HTMLElement>, { once: true, amount: 0.5 });
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration, ease: "easeOut", onUpdate: v => setVal(Math.round(v)) });
    return () => c.stop();
  }, [inView, to, duration]);
  return <span ref={ref}>{val}</span>;
}

/* Neon border box */
function NeonBox({ children, color = BLUE, style = {} }: { children: React.ReactNode; color?: string; style?: React.CSSProperties }) {
  return (
    <div style={{
      border: `1px solid ${color}40`,
      boxShadow: `0 0 12px ${color}20, inset 0 0 12px ${color}08`,
      background: `${SURF}cc`,
      backdropFilter: "blur(4px)",
      ...style,
    }}>
      {children}
    </div>
  );
}

/* Scanline overlay */
function Scanlines() {
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
      backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
    }} />
  );
}

/* Grid bg */
function GridBg({ color = BLUE }: { color?: string }) {
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
      backgroundImage: `linear-gradient(${color}08 1px, transparent 1px), linear-gradient(90deg, ${color}08 1px, transparent 1px)`,
      backgroundSize: "52px 52px",
    }} />
  );
}

/* Glowing corner marks */
function Corners({ color = BLUE }: { color?: string }) {
  const mk = (s: React.CSSProperties) => (
    <div style={{ position: "absolute", width: 20, height: 20, ...s }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 20, height: 1, background: color, boxShadow: `0 0 6px ${color}` }} />
      <div style={{ position: "absolute", top: 0, left: 0, width: 1, height: 20, background: color, boxShadow: `0 0 6px ${color}` }} />
    </div>
  );
  return <>
    {mk({ top: 16, left: 16 })}
    {mk({ top: 16, right: 16, transform: "scaleX(-1)" })}
    {mk({ bottom: 16, left: 16, transform: "scaleY(-1)" })}
    {mk({ bottom: 16, right: 16, transform: "scale(-1)" })}
  </>;
}

/* Slide label */
function SlideLabel({ n, label }: { n: number; label: string }) {
  return (
    <div style={{
      position: "absolute", bottom: 18, right: 24,
      fontFamily: "'Courier New', monospace", fontSize: "0.52rem",
      letterSpacing: "0.16em", textTransform: "uppercase",
      color: `${BLUE}60`, zIndex: 10,
    }}>
      BRIARWOOD · {label} · {String(n).padStart(2,"0")}/{String(SLIDES).padStart(2,"0")}
    </div>
  );
}

/* Eyebrow */
function Eye({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "'Courier New', monospace", fontSize: "0.58rem",
      letterSpacing: "0.24em", textTransform: "uppercase",
      color: BLUE, marginBottom: 16,
      textShadow: `0 0 12px ${BLUE}`,
      position: "relative", zIndex: 2,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{ display: "inline-block", width: 20, height: 1, background: BLUE, boxShadow: `0 0 6px ${BLUE}` }} />
      {children}
      <span style={{ display: "inline-block", width: 20, height: 1, background: BLUE, boxShadow: `0 0 6px ${BLUE}` }} />
    </div>
  );
}

/* Headline */
function H1({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontFamily: "'Inter', sans-serif", fontWeight: 800,
      fontSize: "clamp(2rem, 4.5vw, 4rem)",
      letterSpacing: "-1.5px", lineHeight: 1.05,
      color: TEXT, textAlign: "center", maxWidth: 820,
      position: "relative", zIndex: 2,
      ...style,
    }}>
      {children}
    </div>
  );
}

/* Sub */
function Sub({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "'Courier New', monospace", fontSize: "clamp(0.72rem,1.1vw,0.88rem)",
      color: FAINT, maxWidth: 520, textAlign: "center",
      lineHeight: 1.8, marginTop: 14, letterSpacing: "0.04em",
      textTransform: "uppercase", position: "relative", zIndex: 2,
    }}>
      {children}
    </div>
  );
}

/* Data cell */
function Cell({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ background: `${SURF}dd`, padding: "22px 24px", borderTop: `1px solid ${BLUE}18` }}>
      <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.54rem",
        letterSpacing: "0.2em", textTransform: "uppercase", color: BLUE,
        marginBottom: 8, textShadow: `0 0 8px ${BLUE}80` }}>
        {k}
      </div>
      <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.76rem",
        lineHeight: 1.7, color: FAINT }}>
        {v}
      </div>
    </div>
  );
}

/* Gauge */
function Gauge({ pct }: { pct: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useVw(ref);
  const r = 88, cx = 110, cy = 106, arc = Math.PI * r;
  return (
    <div ref={ref} style={{ position: "relative", width: 220, height: 120 }}>
      <svg width={220} height={120} viewBox="0 0 220 120">
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
          fill="none" stroke={`${BLUE}15`} strokeWidth={8} strokeLinecap="round" />
        <motion.path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
          fill="none" stroke={RED} strokeWidth={8} strokeLinecap="round"
          strokeDasharray={arc} initial={{ strokeDashoffset: arc }}
          animate={inView ? { strokeDashoffset: arc - (pct/100)*arc } : {}}
          transition={{ duration: 1.8, ease: "easeOut", delay: 0.4 }}
          style={{ filter: `drop-shadow(0 0 6px ${RED})` }} />
        <motion.circle cx={cx} cy={cy} r={3} fill={RED}
          initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 2 }}
          style={{ filter: `drop-shadow(0 0 8px ${RED})` }} />
        <text x={cx} y={cy-6} textAnchor="middle" fill={`${TEXT}40`}
          fontSize={8} fontFamily="'Courier New', monospace" letterSpacing={2}>CAPACITY LOST</text>
      </svg>
    </div>
  );
}

/* Score ring */
function Ring({ score, label, delay = 0, color = BLUE }: { score: number; label: string; delay?: number; color?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useVw(ref);
  const r = 32, c = 2 * Math.PI * r;
  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative", width: 76, height: 76 }}>
        <svg width={76} height={76} viewBox="0 0 76 76">
          <circle cx={38} cy={38} r={r} fill="none" stroke={`${color}15`} strokeWidth={5} />
          <motion.circle cx={38} cy={38} r={r} fill="none" stroke={color} strokeWidth={5}
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c}
            animate={inView ? { strokeDashoffset: c - (score/100)*c } : {}}
            transition={{ duration: 1.4, delay, ease: "easeOut" }}
            transform="rotate(-90 38 38)"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "'Courier New', monospace", fontSize: "1rem", fontWeight: 700,
          color: TEXT, textShadow: `0 0 10px ${color}` }}>
          {score}
        </div>
      </div>
      <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.5rem",
        letterSpacing: "0.12em", textTransform: "uppercase", color: `${TEXT}40`, textAlign: "center", maxWidth: 70 }}>
        {label}
      </div>
    </div>
  );
}

/* Mirror network */
function MirrorNet() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useVw(ref);
  const nodes = [
    { x: 330, y: 72, label: "MASTER", score: "CDI 91", bad: false },
    { x: 140, y: 205, label: "NODE A", score: "CDI 88", bad: false },
    { x: 255, y: 205, label: "NODE B", score: "CDI 74", bad: false },
    { x: 405, y: 205, label: "NODE C", score: "BURN", bad: true },
    { x: 520, y: 205, label: "NODE D", score: "CDI 91", bad: false },
  ];
  return (
    <div ref={ref} style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 680 }}>
      <svg width="100%" viewBox="0 0 660 280" style={{ overflow: "visible" }}>
        {nodes.slice(1).map((n, i) => (
          <motion.line key={i} x1={330} y1={72} x2={n.x} y2={n.y}
            stroke={n.bad ? RED : `${BLUE}35`}
            strokeWidth={n.bad ? 1.5 : 0.8} strokeDasharray="4 4"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={inView ? { pathLength: 1, opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.3 + i * 0.15 }}
            style={n.bad ? { filter: `drop-shadow(0 0 4px ${RED})` } : {}} />
        ))}
        {nodes.map((n, i) => (
          <motion.g key={n.label}
            initial={{ opacity: 0, scale: 0 }} animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.4, delay: i * 0.12 }}>
            <rect x={n.x-32} y={n.y-24} width={64} height={48}
              fill={SURF} stroke={n.bad ? RED : BLUE}
              strokeWidth={n.bad ? 1.5 : 0.8} rx={2}
              style={{ filter: n.bad ? `drop-shadow(0 0 6px ${RED})` : `drop-shadow(0 0 4px ${BLUE}40)` }} />
            <text x={n.x} y={n.y-5} textAnchor="middle"
              fill={n.bad ? RED : TEXT} fontSize={7.5}
              fontFamily="'Courier New', monospace" fontWeight={700}
              style={n.bad ? { filter: `drop-shadow(0 0 4px ${RED})` } : {}}>
              {n.label}
            </text>
            <text x={n.x} y={n.y+9} textAnchor="middle"
              fill={n.bad ? RED : BLUE} fontSize={7}
              fontFamily="'Courier New', monospace">
              {n.score}
            </text>
          </motion.g>
        ))}
        {inView && (
          <motion.rect x={373} y={181} width={64} height={48} rx={2}
            fill="none" stroke={RED} strokeWidth={1}
            initial={{ opacity: 0.8, scale: 1, transformOrigin: "405px 205px" }}
            animate={{ opacity: 0, scale: 2 }}
            transition={{ duration: 1.5, delay: 1.2, repeat: Infinity, repeatDelay: 2 }} />
        )}
      </svg>
      <div style={{ display: "flex", justifyContent: "center", gap: 28, marginTop: 4 }}>
        {[[BLUE,"Node in good standing"],[RED,"Burn propagating"]].map(([c,l]) => (
          <span key={l} style={{ fontFamily: "'Courier New', monospace", fontSize: "0.5rem",
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: c, display: "flex", alignItems: "center", gap: 6,
            textShadow: `0 0 8px ${c}` }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: c,
              boxShadow: `0 0 8px ${c}`, display: "inline-block" }} />{l}
          </span>
        ))}
      </div>
    </div>
  );
}

/* Friction flow */
function FrictionFlow() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useVw(ref);
  const steps = ["Identify Node","Verify","Search","Handshake","Underwrite","Manage Chaos"];
  return (
    <div ref={ref} style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center", margin: "28px 0 16px" }}>
        {steps.map((s, i) => (
          <span key={s} style={{ display: "contents" }}>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15, duration: 0.35 }}
              style={{ padding: "8px 14px", border: `1px solid ${RED}50`,
                background: `${RED}08`, color: `${RED}cc`,
                fontFamily: "'Courier New', monospace", fontSize: "0.72rem",
                letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap",
                boxShadow: `0 0 8px ${RED}15`, textShadow: `0 0 8px ${RED}60` }}>
              {s}
            </motion.div>
            <motion.span initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: i * 0.15 + 0.1 }}
              style={{ color: `${RED}40`, fontSize: "0.9rem" }}>→</motion.span>
          </span>
        ))}
        <motion.div initial={{ opacity: 0, scale: 0.85 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: steps.length * 0.15 + 0.1, type: "spring" }}
          style={{ padding: "8px 16px", background: BLUE, color: BG,
            fontFamily: "'Courier New', monospace", fontSize: "0.72rem",
            letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700,
            boxShadow: `0 0 16px ${BLUE}60, 0 0 32px ${BLUE}20` }}>
          EXECUTE
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 1.4 }}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <div style={{ height: 1, width: 28, background: `${RED}40` }} />
        <span style={{ fontFamily: "'Courier New', monospace", fontSize: "0.5rem",
          color: `${RED}70`, letterSpacing: "0.14em", textTransform: "uppercase",
          textShadow: `0 0 8px ${RED}` }}>
          6 steps of invisible labor before a single task begins
        </span>
        <div style={{ height: 1, width: 28, background: `${RED}40` }} />
      </motion.div>
    </div>
  );
}

/* Timeline bars */
function TimeBars() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useVw(ref);
  return (
    <div ref={ref} style={{ maxWidth: 560, width: "100%", marginTop: 36, position: "relative", zIndex: 2 }}>
      {[
        { label: "Traditional (FICO / Background Check)", note: "30–90 DAY LAG", pct: 100, color: RED },
        { label: "Briarwood CDI", note: "SECOND ZERO", pct: 2, color: BLUE },
      ].map((row, i) => (
        <div key={row.label} style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: "0.62rem",
              color: FAINT, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {row.label}
            </span>
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: "0.6rem",
              color: row.color, fontWeight: 700, letterSpacing: "0.06em",
              textShadow: `0 0 8px ${row.color}` }}>
              {row.note}
            </span>
          </div>
          <div style={{ height: 4, background: `${TEXT}08`, position: "relative" }}>
            <motion.div initial={{ width: 0 }}
              animate={inView ? { width: `${row.pct}%` } : {}}
              transition={{ duration: 1.2, delay: i * 0.35 + 0.3, ease: "easeOut" }}
              style={{ height: "100%", background: row.color,
                boxShadow: `0 0 10px ${row.color}60` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── SLIDE WRAPPER ── */
function S({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <div data-slide={n} style={{
      minHeight: "100vh", width: "100%",
      background: BG, color: TEXT,
      position: "relative", overflow: "hidden",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "80px 10vw 64px",
    }}>
      <GridBg />
      <Scanlines />
      <Corners />
      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 900 }}>
        {children}
      </div>
      <SlideLabel n={n} label={label} />
    </div>
  );
}

/* ── MAIN ── */
export default function Pitch() {
  const [cur, setCur] = useState(1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(
      es => es.forEach(e => { if (e.isIntersecting) setCur(Number((e.target as HTMLElement).dataset.slide)); }),
      { threshold: 0.5 }
    );
    el.querySelectorAll("[data-slide]").forEach(s => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  const go = (n: number) => ref.current?.querySelector(`[data-slide="${n}"]`)?.scrollIntoView({ behavior: "smooth" });

  const fd = {
    initial: { opacity: 0, y: 22 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration: 0.55 },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; background: ${BG}; }

        .bar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 400;
          height: 46px; display: flex; align-items: center; justify-content: space-between;
          padding: 0 32px;
          background: ${BG}e8; backdrop-filter: blur(16px);
          border-bottom: 1px solid ${BLUE}25;
          box-shadow: 0 1px 0 ${BLUE}10, 0 2px 20px ${BG};
        }
        .bar-logo {
          font-family: 'Courier New', monospace; font-size: 0.68rem;
          font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;
          color: ${BLUE}; text-shadow: 0 0 12px ${BLUE};
        }
        .bar-r { display: flex; align-items: center; gap: 14px; }
        .bdots { display: flex; gap: 5px; }
        .bd {
          width: 6px; height: 6px; border-radius: 50%;
          background: ${TEXT}18; cursor: pointer; border: none; padding: 0;
          transition: background 0.2s, box-shadow 0.2s;
        }
        .bd.on { background: ${BLUE}; box-shadow: 0 0 8px ${BLUE}; }
        .bnum {
          font-family: 'Courier New', monospace; font-size: 0.58rem;
          color: ${TEXT}30; font-variant-numeric: tabular-nums; letter-spacing: 0.08em;
        }
        .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: ${BLUE}18; max-width: 720px; width: 100%; margin-top: 36px; border: 1px solid ${BLUE}18; box-shadow: 0 0 20px ${BLUE}08; }
        .g3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; background: ${BLUE}18; max-width: 820px; width: 100%; margin-top: 36px; border: 1px solid ${BLUE}18; box-shadow: 0 0 20px ${BLUE}08; }
        @media (max-width: 640px) { .g2, .g3 { grid-template-columns: 1fr; } }
      `}</style>

      {/* Nav */}
      <div className="bar">
        <div className="bar-logo">BRIARWOOD // CDI ARCHITECTURE</div>
        <div className="bar-r">
          <div className="bdots">
            {Array.from({ length: SLIDES }, (_, i) => (
              <button key={i} className={`bd${cur === i+1 ? " on" : ""}`} onClick={() => go(i+1)} />
            ))}
          </div>
          <div className="bnum">{String(cur).padStart(2,"0")}/{String(SLIDES).padStart(2,"0")}</div>
        </div>
      </div>

      <div ref={ref}>

        {/* 01 HERO */}
        <S n={1} label="OVERVIEW">
          <motion.div {...fd} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Eye>dateinquiry.com</Eye>
            <div style={{
              fontFamily: "'Inter', sans-serif", fontWeight: 800,
              fontSize: "clamp(3.5rem, 8vw, 7.5rem)",
              letterSpacing: "-4px", lineHeight: 1, color: TEXT,
              textAlign: "center", marginBottom: 20,
              textShadow: `0 0 40px ${BLUE}30`,
            }}>BRIARWOOD</div>
            <div style={{ fontFamily: "'Courier New', monospace", fontSize: "clamp(0.8rem,1.3vw,0.96rem)",
              color: FAINT, textTransform: "uppercase", letterSpacing: "0.12em", textAlign: "center", maxWidth: 440, lineHeight: 1.8 }}>
              The Infrastructure of Integrity.
            </div>
            <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 10,
              fontFamily: "'Courier New', monospace", fontSize: "0.54rem",
              letterSpacing: "0.18em", textTransform: "uppercase",
              color: `${BLUE}70`, textShadow: `0 0 8px ${BLUE}` }}>
              <span style={{ display: "inline-block", width: 16, height: 1, background: BLUE, boxShadow: `0 0 6px ${BLUE}` }} />
              CDI: Choreography Depth Index™ · Patent Pending
              <span style={{ display: "inline-block", width: 16, height: 1, background: BLUE, boxShadow: `0 0 6px ${BLUE}` }} />
            </div>
          </motion.div>
        </S>

        {/* 02 TRUST TAX */}
        <S n={2} label="TRUST TAX">
          <motion.div {...fd} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Eye>Primary Metric</Eye>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, lineHeight: 1, marginTop: 8 }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800,
                fontSize: "clamp(6rem,16vw,13rem)", letterSpacing: "-6px",
                color: TEXT, textShadow: `0 0 60px ${RED}20` }}>
                <Counter to={64} />
              </span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800,
                fontSize: "clamp(3rem,8vw,6.5rem)", letterSpacing: "-3px",
                color: RED, marginBottom: "0.1em",
                textShadow: `0 0 20px ${RED}, 0 0 40px ${RED}60` }}>%</span>
            </div>
            <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.72rem",
              letterSpacing: "0.16em", textTransform: "uppercase", color: `${TEXT}40`, marginBottom: 24 }}>
              Execution Capacity Lost
            </div>
          </motion.div>
          <Gauge pct={64} />
          <motion.div {...fd} transition={{ delay: 0.4 }}
            style={{ fontFamily: "'Courier New', monospace", fontSize: "0.56rem",
              color: `${TEXT}25`, letterSpacing: "0.1em", textAlign: "center",
              lineHeight: 1.9, maxWidth: 400, position: "relative", zIndex: 2,
              textTransform: "uppercase", marginTop: 16 }}>
            Derived from 28 years and 900+ high-stakes coordination events.
          </motion.div>
        </S>

        {/* 03 CHAOS WALL */}
        <S n={3} label="THE PROBLEM">
          <motion.div {...fd} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Eye>Problem Statement</Eye>
            <H1 style={{ marginTop: 8 }}>The Manual Friction Loop.</H1>
          </motion.div>
          <FrictionFlow />
          <motion.div {...fd} transition={{ delay: 0.5 }}>
            <Sub>Software runs on math. The physical world runs on variables.<br/>This is the invisible labor stalling every autonomous network.</Sub>
          </motion.div>
        </S>

        {/* 04 LATENCY GAP */}
        <S n={4} label="LATENCY GAP">
          <motion.div {...fd} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Eye>System Failure Analysis</Eye>
            <H1 style={{ marginTop: 8 }}>90 Days vs. Second Zero.</H1>
            <Sub>Traditional trust models rely on a 30/60/90-day lag.<br/>In high-stakes execution, latency is a structural failure.</Sub>
          </motion.div>
          <TimeBars />
        </S>

        {/* 05 IDENTITY ANCHOR */}
        <S n={5} label="IDENTITY ANCHOR">
          <motion.div {...fd} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Eye>Security Layer</Eye>
            <H1 style={{ marginTop: 8 }}>The SSN for Execution.</H1>
            <Sub>You cannot reset integrity by changing a name or forming a new LLC.</Sub>
          </motion.div>
          <div className="g3">
            {[
              { k: "Anchored", v: "A CDI Identity follows every agent across every coordination event — permanently, across all legal structures." },
              { k: "No Reset", v: "No history reads as Unverified Origin, not zero — triggering the Mirror Protocol automatically." },
              { k: "Immutable", v: "There is no Delete Profile button for integrity. The anchor persists across all legal structures." },
            ].map((x, i) => (
              <motion.div key={x.k} {...fd} transition={{ delay: i * 0.15 }}>
                <Cell k={x.k} v={x.v} />
              </motion.div>
            ))}
          </div>
        </S>

        {/* 06 CDI */}
        <S n={6} label="CDI SPEC">
          <div style={{ position: "absolute", top: 24, right: -72, transform: "rotate(45deg)", zIndex: 3,
            fontFamily: "'Courier New', monospace", fontSize: "0.5rem", letterSpacing: "0.14em",
            border: `1px solid ${BLUE}20`, padding: "4px 56px",
            background: BG, color: `${BLUE}30`, whiteSpace: "nowrap" }}>
            US PATENT PENDING // REF: 28-YR GROUND TRUTH
          </div>
          <motion.div {...fd} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Eye>Patented Solution</Eye>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800,
              fontSize: "clamp(5rem,13vw,11rem)", letterSpacing: "-5px", lineHeight: 1,
              background: `linear-gradient(135deg, ${TEXT} 20%, ${BLUE} 60%, ${RED} 100%)`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              marginBottom: 4 }}>
              CDI
            </div>
            <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.78rem",
              letterSpacing: "0.1em", color: `${BLUE}60`, textTransform: "uppercase",
              textShadow: `0 0 8px ${BLUE}40`, marginBottom: 8 }}>
              Choreography Depth Index™ · Patent Pending
            </div>
          </motion.div>
          <div style={{ display: "flex", gap: 36, justifyContent: "center", flexWrap: "wrap", margin: "12px 0 28px", position: "relative", zIndex: 2 }}>
            <Ring score={91} label="Master Agent" delay={0.3} color={BLUE} />
            <Ring score={74} label="Sub-Agent" delay={0.5} color={AMBER} />
            <Ring score={23} label="Unverified Origin" delay={0.7} color={RED} />
          </div>
          <div className="g3" style={{ maxWidth: 680 }}>
            {[
              { k: "Choreography", v: "Precise sequence and timing of multi-node execution events." },
              { k: "Depth", v: "High-fidelity behavioral ground truth that pixels cannot reach." },
              { k: "Index", v: "Machine-readable standard for underwriting risk at execution time." },
            ].map((x, i) => (
              <motion.div key={x.k} {...fd} transition={{ delay: 0.2 + i * 0.12 }}>
                <Cell k={x.k} v={x.v} />
              </motion.div>
            ))}
          </div>
        </S>

        {/* 07 MIRROR PROTOCOL */}
        <S n={7} label="MIRROR PROTOCOL">
          <motion.div {...fd} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Eye>Network Security Layer</Eye>
            <H1 style={{ marginTop: 8 }}>Recursive Associative Trust.</H1>
            <Sub>Trust is a network effect. You are the company you keep.</Sub>
          </motion.div>
          <div style={{ marginTop: 32, width: "100%" }}>
            <MirrorNet />
          </div>
          <motion.div {...fd} transition={{ delay: 0.6 }}>
            <Sub style={{ marginTop: 16 } as any}>
              High-fidelity operators refuse to align with bad actors.<br/>The CDI burn is too expensive. The system self-cleans.
            </Sub>
          </motion.div>
        </S>

        {/* 08 NEUTRAL ARBITER */}
        <S n={8} label="THE MOAT">
          <motion.div {...fd} style={{ display: "flex", flexDirection: "column", alignItems: "center", maxWidth: 680 }}>
            <Eye>Competitive Moat</Eye>
            <H1 style={{ marginTop: 8 }}>Independence is the Moat.</H1>
            <NeonBox color={BLUE} style={{ margin: "32px 0 24px", padding: "28px 36px", maxWidth: 520, borderLeft: `3px solid ${BLUE}` }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "clamp(0.9rem,1.6vw,1.2rem)",
                fontStyle: "italic", color: FAINT, lineHeight: 1.65, textAlign: "center" }}>
                "You don't let the student grade their own paper.<br/>
                You don't have the bank write its own credit report."
              </div>
            </NeonBox>
            <Sub>Agent companies cannot underwrite their own risk.<br/>
              Briarwood is the independent standard the industry answers to.</Sub>
          </motion.div>
        </S>

        {/* 09 WHY NOW */}
        <S n={9} label="MARKET TIMING">
          <motion.div {...fd} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Eye>Why Now</Eye>
            <H1 style={{ marginTop: 8 }}>Computing the Uncomputable.</H1>
            <Sub>AI has hit the screen limit. The physical world requires an action-conditioned ledger.</Sub>
          </motion.div>
          <div className="g2">
            {[
              { k: "The Screen Limit", v: "Every major model company is trying to enter the physical world — and hitting the same wall. Pixels alone cannot underwrite execution." },
              { k: "The Bridge", v: "We provide the Choreography — behavioral truth — that LLMs and Video Models cannot learn from pixels alone. It must be lived, captured, and indexed." },
            ].map((x, i) => (
              <motion.div key={x.k} {...fd} transition={{ delay: i * 0.2 }}>
                <Cell k={x.k} v={x.v} />
              </motion.div>
            ))}
          </div>
        </S>

        {/* 10 EXECUTION */}
        <S n={10} label="LIVE METRICS">
          <motion.div {...fd} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Eye>With Briarwood — Production</Eye>
            <H1 style={{ marginTop: 8 }}>Execution Integrity.</H1>
          </motion.div>
          <div className="g3" style={{ maxWidth: 680 }}>
            {[
              { n: "169", k: "Inquiries Processed", v: "Real bookings routed through the CDI layer" },
              { n: "37",  k: "Referrals Routed",    v: "Network choreography working in production" },
              { n: "15",  k: "Deposits Collected",   v: "Square payments with 1.5% platform fee" },
            ].map((m, i) => (
              <motion.div key={m.k} {...fd} transition={{ delay: i * 0.15 }}
                style={{ background: `${SURF}dd`, padding: "22px 20px", borderTop: `1px solid ${BLUE}18` }}>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "2.4rem",
                  fontWeight: 800, letterSpacing: "-1px", color: TEXT,
                  textShadow: `0 0 20px ${BLUE}30`, marginBottom: 4 }}>{m.n}</div>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.54rem",
                  letterSpacing: "0.18em", textTransform: "uppercase", color: BLUE,
                  textShadow: `0 0 8px ${BLUE}`, marginBottom: 8 }}>{m.k}</div>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.72rem",
                  color: FAINT, lineHeight: 1.6 }}>{m.v}</div>
              </motion.div>
            ))}
          </div>
          <motion.div {...fd} transition={{ delay: 0.5 }}
            style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 28, position: "relative", zIndex: 2 }}>
            <div style={{ padding: "9px 18px", border: `1px solid ${TEXT}15`,
              fontFamily: "'Courier New', monospace", fontSize: "0.72rem",
              color: `${TEXT}35`, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Identify Node
            </div>
            <span style={{ color: BLUE, fontSize: "1.2rem", textShadow: `0 0 10px ${BLUE}` }}>→</span>
            <div style={{ padding: "9px 20px", background: BLUE, color: BG,
              fontFamily: "'Courier New', monospace", fontSize: "0.72rem",
              fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
              boxShadow: `0 0 20px ${BLUE}60` }}>
              Execute
            </div>
          </motion.div>
          <motion.div {...fd} transition={{ delay: 0.7 }}
            style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24, position: "relative", zIndex: 2 }}>
            <a href="mailto:violet@briarwood.ai" style={{
              background: BLUE, color: BG, padding: "11px 28px",
              fontFamily: "'Courier New', monospace", fontSize: "0.68rem", fontWeight: 700,
              textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase",
              boxShadow: `0 0 20px ${BLUE}50` }}>
              Request a Demo
            </a>
            <a href="/demo-landing" style={{
              background: "transparent", border: `1px solid ${TEXT}15`,
              color: `${TEXT}35`, padding: "11px 28px",
              fontFamily: "'Courier New', monospace", fontSize: "0.68rem",
              textDecoration: "none", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Full Overview →
            </a>
          </motion.div>
        </S>

        {/* 11 PHILOSOPHY */}
        <S n={11} label="PHILOSOPHY">
          <motion.div {...fd} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <Eye>The Philosophy</Eye>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800,
              fontSize: "clamp(2rem,5vw,4.5rem)", letterSpacing: "-2px", lineHeight: 1.1,
              marginTop: 16, color: TEXT }}>
              Privacy Stays.<br />
              <span style={{ color: RED, textShadow: `0 0 30px ${RED}, 0 0 60px ${RED}40` }}>
                Reputation Runs.
              </span><br />
              Trust Wins.
            </div>
            <div style={{ margin: "28px 0", width: 1, height: 40, background: `${BLUE}40`, boxShadow: `0 0 8px ${BLUE}` }} />
            <Sub>The Human Defense Layer for the High-Stakes Economy.</Sub>
            <div style={{ marginTop: 52, fontFamily: "'Courier New', monospace", fontSize: "0.52rem",
              letterSpacing: "0.2em", color: `${TEXT}18`, textTransform: "uppercase",
              position: "relative", zIndex: 2 }}>
              Briarwood · Founder Led · CDI™ Patent Pending · 2026
            </div>
          </motion.div>
        </S>

      </div>
    </>
  );
}
