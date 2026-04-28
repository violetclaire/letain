import { useState, useEffect, useRef } from "react";
import { motion, useInView, animate } from "framer-motion";

const BLUE  = "#00cfff";
const RED   = "#ff2d55";
const AMBER = "#ffaa00";
const GREEN = "#7CFFB2";
const BG    = "#050810";
const SURF  = "#090d1a";
const TEXT  = "#c8d8ff";
const FAINT = "rgba(200,216,255,0.35)";
const SLIDES = 13;

const isPrint = () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("print");

function useVw(ref: React.RefObject<HTMLDivElement | null>) {
  const inView = useInView(ref as React.RefObject<HTMLElement>, { once: true, amount: 0.3 });
  return isPrint() ? true : inView;
}

function Counter({ to, duration = 1.6, prefix = "", suffix = "" }: { to: number; duration?: number; prefix?: string; suffix?: string }) {
  const [val, setVal] = useState(isPrint() ? to : 0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref as React.RefObject<HTMLElement>, { once: true, amount: 0.5 });
  useEffect(() => {
    if (isPrint()) { setVal(to); return; }
    if (!inView) return;
    const c = animate(0, to, { duration, ease: "easeOut", onUpdate: v => setVal(Math.round(v)) });
    return () => c.stop();
  }, [inView, to, duration]);
  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
}

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

function Scanlines() {
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
      backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)",
    }} />
  );
}

function GridBg({ color = BLUE }: { color?: string }) {
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
      backgroundImage: `linear-gradient(${color}08 1px, transparent 1px), linear-gradient(90deg, ${color}08 1px, transparent 1px)`,
      backgroundSize: "52px 52px",
    }} />
  );
}

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

function H1({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontFamily: "'Inter', sans-serif", fontWeight: 800,
      fontSize: "clamp(2rem, 4.2vw, 3.6rem)",
      letterSpacing: "-1.5px", lineHeight: 1.05,
      color: TEXT, textAlign: "center", maxWidth: 880,
      position: "relative", zIndex: 2,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Sub({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontFamily: "'Courier New', monospace", fontSize: "clamp(0.7rem,1.1vw,0.84rem)",
      color: FAINT, maxWidth: 620, textAlign: "center",
      lineHeight: 1.8, marginTop: 14, letterSpacing: "0.04em",
      textTransform: "uppercase", position: "relative", zIndex: 2,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Body({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontFamily: "'Inter', sans-serif", fontSize: "clamp(0.88rem,1.15vw,1.02rem)",
      color: `${TEXT}cc`, maxWidth: 720, textAlign: "center",
      lineHeight: 1.65, marginTop: 18,
      position: "relative", zIndex: 2,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Cell({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ background: `${SURF}dd`, padding: "22px 24px", borderTop: `1px solid ${BLUE}18`, height: "100%" }}>
      <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.54rem",
        letterSpacing: "0.2em", textTransform: "uppercase", color: BLUE,
        marginBottom: 8, textShadow: `0 0 8px ${BLUE}80` }}>
        {k}
      </div>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.84rem",
        lineHeight: 1.65, color: FAINT }}>
        {v}
      </div>
    </div>
  );
}

function StatBlock({ value, label, color = BLUE }: { value: React.ReactNode; label: string; color?: string }) {
  return (
    <div style={{ textAlign: "center", padding: "14px 8px" }}>
      <div style={{
        fontFamily: "'Inter', sans-serif", fontWeight: 800,
        fontSize: "clamp(2.5rem,5vw,4rem)", letterSpacing: "-2px",
        color: TEXT, textShadow: `0 0 20px ${color}40`, lineHeight: 1,
      }}>{value}</div>
      <div style={{
        fontFamily: "'Courier New', monospace", fontSize: "0.6rem",
        letterSpacing: "0.16em", textTransform: "uppercase",
        color: color, marginTop: 12, textShadow: `0 0 8px ${color}50`,
      }}>{label}</div>
    </div>
  );
}

/* Wedge funnel: 700 → 40 / 660 */
function WedgeFunnel() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useVw(ref);
  return (
    <div ref={ref} style={{ width: "100%", maxWidth: 720, marginTop: 32, position: "relative", zIndex: 2 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontFamily: "'Courier New', monospace", fontSize: "0.62rem", color: FAINT, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          700 inbound inquiries / yr
        </span>
      </div>
      <div style={{ height: 14, background: `${BLUE}10`, border: `1px solid ${BLUE}30`, position: "relative", overflow: "hidden", boxShadow: `0 0 12px ${BLUE}10` }}>
        <motion.div initial={{ width: 0 }} animate={inView ? { width: "100%" } : {}} transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ height: "100%", background: BLUE, boxShadow: `0 0 12px ${BLUE}80` }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "94fr 6fr", marginTop: 10, gap: 6 }}>
        <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.8 }}>
          <div style={{ height: 44, background: `${RED}10`, border: `1px solid ${RED}50`, position: "relative", boxShadow: `0 0 12px ${RED}20`, padding: "8px 14px", display: "flex", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "1.1rem", color: TEXT, lineHeight: 1, textShadow: `0 0 10px ${RED}40` }}>660</div>
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.5rem", color: RED, letterSpacing: "0.14em", textTransform: "uppercase", marginTop: 3, textShadow: `0 0 6px ${RED}` }}>Abandoned · leaks out</div>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 1.0 }}>
          <div style={{ height: 44, background: `${GREEN}15`, border: `1px solid ${GREEN}80`, position: "relative", boxShadow: `0 0 12px ${GREEN}30`, padding: "8px 8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "1.1rem", color: TEXT, lineHeight: 1 }}>40</div>
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.42rem", color: GREEN, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 3 }}>Exec</div>
            </div>
          </div>
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 1.4 }}
        style={{ marginTop: 18, fontFamily: "'Courier New', monospace", fontSize: "0.6rem", color: FAINT, textAlign: "center", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Briarwood captures the abandoned 660 as verified, CDI-routed handoffs.
      </motion.div>
    </div>
  );
}

/* Flywheel: 4 steps in a circle */
function Flywheel() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useVw(ref);
  const steps = [
    { t: "Overflow", d: "Trusted operator routes demand they cannot fulfill." },
    { t: "Telemetry", d: "Every handoff yields behavioral data." },
    { t: "Trust Update", d: "CDI updates with each transaction." },
    { t: "Compounding", d: "More demand attracts more verified supply." },
  ];
  return (
    <div ref={ref} style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 760, marginTop: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: `${BLUE}18`, border: `1px solid ${BLUE}18`, boxShadow: `0 0 20px ${BLUE}08` }}>
        {steps.map((s, i) => (
          <motion.div key={s.t}
            initial={{ opacity: 0, y: 12 }} animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: i * 0.15 }}
            style={{ background: `${SURF}dd`, padding: "20px 18px" }}>
            <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.5rem", letterSpacing: "0.2em", color: BLUE, textShadow: `0 0 6px ${BLUE}`, marginBottom: 8 }}>0{i+1}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "0.95rem", color: TEXT, marginBottom: 6, letterSpacing: "-0.3px" }}>{s.t}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.78rem", color: FAINT, lineHeight: 1.55 }}>{s.d}</div>
          </motion.div>
        ))}
      </div>
      <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.9 }}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 18 }}>
        <div style={{ height: 1, width: 28, background: `${BLUE}40` }} />
        <span style={{ fontFamily: "'Courier New', monospace", fontSize: "0.52rem", color: `${BLUE}90`, letterSpacing: "0.14em", textTransform: "uppercase", textShadow: `0 0 8px ${BLUE}` }}>
          The flywheel compounds with every transaction
        </span>
        <div style={{ height: 1, width: 28, background: `${BLUE}40` }} />
      </motion.div>
    </div>
  );
}

function S({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <div data-slide={n} className="slide" style={{
      minHeight: "100vh", width: "100%",
      background: BG, color: TEXT,
      position: "relative", overflow: "hidden",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "80px 8vw 64px",
    }}>
      <GridBg />
      <Scanlines />
      <Corners />
      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 980 }}>
        {children}
      </div>
      <SlideLabel n={n} label={label} />
    </div>
  );
}

export default function Pitch() {
  const [cur, setCur] = useState(1);
  const [printMode, setPrintMode] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPrintMode(isPrint());
  }, []);

  useEffect(() => {
    if (printMode) return;
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(
      es => es.forEach(e => { if (e.isIntersecting) setCur(Number((e.target as HTMLElement).dataset.slide)); }),
      { threshold: 0.5 }
    );
    el.querySelectorAll("[data-slide]").forEach(s => obs.observe(s));
    return () => obs.disconnect();
  }, [printMode]);

  const go = (n: number) => ref.current?.querySelector(`[data-slide="${n}"]`)?.scrollIntoView({ behavior: "smooth" });

  const fd = printMode
    ? { initial: false, animate: { opacity: 1, y: 0 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 22 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.3 },
        transition: { duration: 0.55 },
      } as any;

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
        .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: ${BLUE}18; max-width: 760px; width: 100%; margin-top: 28px; border: 1px solid ${BLUE}18; box-shadow: 0 0 20px ${BLUE}08; }
        .g3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 1px; background: ${BLUE}18; max-width: 880px; width: 100%; margin-top: 28px; border: 1px solid ${BLUE}18; box-shadow: 0 0 20px ${BLUE}08; }
        .g4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 1px; background: ${BLUE}18; max-width: 880px; width: 100%; margin-top: 28px; border: 1px solid ${BLUE}18; box-shadow: 0 0 20px ${BLUE}08; }
        @media (max-width: 640px) { .g2, .g3, .g4 { grid-template-columns: 1fr; } }

        ${printMode ? `
          .bar { display: none !important; }
          html, body { background: ${BG} !important; margin: 0 !important; padding: 0 !important; }
          html, body { width: 1280px !important; }
          .slide {
            width: 1280px !important;
            height: 720px !important;
            min-height: 720px !important;
            max-height: 720px !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            padding: 56px 80px !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .slide:last-child { page-break-after: auto !important; break-after: auto !important; }
          @page { size: 1280px 720px; margin: 0; }
        ` : ""}
      `}</style>

      {!printMode && (
        <div className="bar">
          <div className="bar-logo">BRIARWOOD // TRUST SUBSTRATE</div>
          <div className="bar-r">
            <div className="bdots">
              {Array.from({ length: SLIDES }, (_, i) => (
                <button key={i} className={`bd${cur === i+1 ? " on" : ""}`} onClick={() => go(i+1)} />
              ))}
            </div>
            <div className="bnum">{String(cur).padStart(2,"0")}/{String(SLIDES).padStart(2,"0")}</div>
          </div>
        </div>
      )}

      <div ref={ref}>

        {/* 01 — MISSION */}
        <S n={1} label="MISSION">
          <motion.div {...fd} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Eye>Trust Infrastructure / Real-World Economy</Eye>
            <div style={{
              fontFamily: "'Inter', sans-serif", fontWeight: 800,
              fontSize: "clamp(3rem, 7vw, 6rem)",
              letterSpacing: "-3px", lineHeight: 1, color: TEXT,
              textAlign: "center", marginBottom: 18,
              textShadow: `0 0 40px ${BLUE}30`,
            }}>BRIARWOOD AI</div>
            <div style={{
              fontFamily: "'Inter', sans-serif", fontWeight: 600,
              fontSize: "clamp(1.05rem, 2vw, 1.55rem)",
              color: TEXT, textAlign: "center", maxWidth: 720, lineHeight: 1.3,
              letterSpacing: "-0.5px",
            }}>The Trust Substrate for the Real-World Service Economy</div>
            <Body style={{ marginTop: 28, maxWidth: 760 }}>
              Briarwood is the trust substrate that lets agents move from search to execution in the real-world economy. We turn 28 years of real-world coordination behavior into the behavioral trust signal agents need to safely hire, route, and pay independent service providers.
            </Body>
            <div style={{ marginTop: 36, display: "flex", alignItems: "center", gap: 10,
              fontFamily: "'Courier New', monospace", fontSize: "0.54rem",
              letterSpacing: "0.18em", textTransform: "uppercase",
              color: `${BLUE}70`, textShadow: `0 0 8px ${BLUE}` }}>
              <span style={{ display: "inline-block", width: 16, height: 1, background: BLUE, boxShadow: `0 0 6px ${BLUE}` }} />
              CDI · Patent Pending · dateinquiry.com
              <span style={{ display: "inline-block", width: 16, height: 1, background: BLUE, boxShadow: `0 0 6px ${BLUE}` }} />
            </div>
          </motion.div>
        </S>

        {/* 02 — PROBLEM */}
        <S n={2} label="PROBLEM">
          <motion.div {...fd}>
            <Eye>02 / Problem</Eye>
            <H1>Agents are street blind.</H1>
            <Body>
              AI agents can search, reason, and recommend services, but real-world service search is still an expensive dead end. They rely on noisy public signals: reviews, SEO, websites, and social profiles. Those signals do not prove who follows through, handles pressure, or recovers when things change.
            </Body>
          </motion.div>
          <div className="g2">
            <Cell k="The Token Tax" v="Agents waste tokens trying to infer trust they cannot verify." />
            <Cell k="The Hard Stop" v="Without a real trust signal, the agentic web stops at the screen." />
          </div>
        </S>

        {/* 03 — SOLUTION */}
        <S n={3} label="SOLUTION">
          <motion.div {...fd}>
            <Eye>03 / Solution</Eye>
            <H1>The Trust Substrate.</H1>
            <Sub>CDI: a reliability metric based on real coordination behavior.</Sub>
            <Body>
              Briarwood captures how providers actually coordinate in real jobs: timing, responsiveness, follow-through, handoffs, and recovery. From that, we generate CDI, a behavioral trust metric agents can query before routing work or releasing payment.
            </Body>
          </motion.div>
          <div className="g3">
            <Cell k="The Model Sees the Profile" v="Public signals: reviews, SEO, social presence, website." />
            <Cell k="Briarwood Sees the Behavior" v="Private signals: latency, follow-through, handoffs, and recovery under pressure." />
            <Cell k="Query Before Routing" v="The model should not spend tokens guessing who to trust. It should query Briarwood." />
          </div>
        </S>

        {/* 04 — PRODUCT */}
        <S n={4} label="PRODUCT">
          <motion.div {...fd}>
            <Eye>04 / Product</Eye>
            <H1>The coordination layer that creates the trust data.</H1>
            <Sub>Briarwood starts as free coordination software for high-trust service operators.</Sub>
          </motion.div>
          <div className="g3" style={{ marginTop: 24 }}>
            <Cell k="For Operators" v="A private coordination workspace to manage inquiries, availability, referrals, handoffs, and payments." />
            <Cell k="For the Network" v="A verified routing layer that turns unavailable inquiries into trusted handoffs." />
            <Cell k="For Agents / Platforms" v="A CDI trust lookup API: who can be trusted to execute this job, in this context, right now?" />
          </div>
          <motion.div {...fd} transition={{ delay: 0.3 } as any}
            style={{ marginTop: 24, padding: "14px 28px", border: `1px solid ${BLUE}30`, background: `${SURF}cc`, fontFamily: "'Courier New', monospace", fontSize: "0.66rem", letterSpacing: "0.08em", color: FAINT, textAlign: "center", textTransform: "uppercase" }}>
            Coordinate work → route overflow → verify handoff → capture behavior → update CDI → expose trust signal
          </motion.div>
        </S>

        {/* 05 — WEDGE */}
        <S n={5} label="WEDGE">
          <motion.div {...fd}>
            <Eye>05 / Wedge · Network Recapture</Eye>
            <H1>High-intent demand is leaking out of the service economy.</H1>
            <Sub>Briarwood turns a dead end into a verified handoff.</Sub>
          </motion.div>
          <WedgeFunnel />
          <div className="g3" style={{ marginTop: 28 }}>
            <Cell k="01 The Dead End" v="Demand does not disappear when an operator is full. It fragments into DMs, unverified referrals, and manual searching." />
            <Cell k="02 The Capture" v="Briarwood captures abandoned demand at the moment of overflow." />
            <Cell k="03 The Handoff" v="Converts lost inquiries into verified, CDI-routed transactions, keeping demand inside the trusted network." />
          </div>
        </S>

        {/* 06 — FLYWHEEL */}
        <S n={6} label="FLYWHEEL">
          <motion.div {...fd}>
            <Eye>06 / Flywheel</Eye>
            <H1>Every verified handoff makes the network smarter.</H1>
          </motion.div>
          <Flywheel />
          <Body style={{ marginTop: 28, maxWidth: 720 }}>
            The flywheel compounds with every transaction. No single competitor can replicate a network built on 28 years of real coordination history.
          </Body>
        </S>

        {/* 07 — DATA MOAT */}
        <S n={7} label="DATA MOAT">
          <motion.div {...fd}>
            <Eye>07 / Data Moat</Eye>
            <H1>28 years of ground-truth coordination behavior.</H1>
            <Sub>The labs cannot scrape what never reached the internet.</Sub>
          </motion.div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: `${BLUE}18`, border: `1px solid ${BLUE}18`, marginTop: 32, width: "100%", maxWidth: 760, boxShadow: `0 0 20px ${BLUE}08` }}>
            <div style={{ background: `${SURF}dd` }}><StatBlock value={<><Counter to={28} /></>} label="Years coordination records" /></div>
            <div style={{ background: `${SURF}dd` }}><StatBlock value={<Counter to={222} />} label="Behavioral signals extracted" color={AMBER} /></div>
            <div style={{ background: `${SURF}dd` }}><StatBlock value={<Counter to={27} />} label="Real actors scored" color={GREEN} /></div>
          </div>
          <div className="g2" style={{ marginTop: 28, maxWidth: 760 }}>
            <Cell k="The Dataset" v="28 years of high-stakes service coordination from a trust-gated network. Private behavioral data: latency, follow-through, handoffs, and recovery under pressure." />
            <Cell k="The Barrier" v="This signal cannot be scraped, synthesized, or bought from the public web." />
          </div>
        </S>

        {/* 08 — BUSINESS MODEL */}
        <S n={8} label="BUSINESS MODEL">
          <motion.div {...fd}>
            <Eye>08 / Business Model</Eye>
            <H1>Free software creates the data. CDI monetizes the trust layer.</H1>
            <Sub>We give operators coordination software because adoption creates the behavioral substrate.</Sub>
          </motion.div>
          <div className="g4" style={{ marginTop: 24 }}>
            <Cell k="01 Transaction Fee" v="1.5% on verified routed work through the Briarwood trust layer." />
            <Cell k="02 CDI API Pricing" v="Agents and platforms pay per lookup or subscription to query trust before routing work or releasing payment." />
            <Cell k="03 Platform Licensing" v="Private service networks, hospitality groups, marketplaces, and agent fleets license Briarwood trust infrastructure." />
            <Cell k="04 Settlement Layer" v="Future: payment release, underwriting, risk pricing, and verified execution rails." />
          </div>
          <NeonBox color={BLUE} style={{ marginTop: 24, padding: "16px 26px", maxWidth: 720 }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.92rem", color: TEXT, textAlign: "center", lineHeight: 1.55 }}>
              The transaction fee monetizes the wedge. The CDI API monetizes the infrastructure. We sell the trust outcome, not raw data.
            </div>
          </NeonBox>
        </S>

        {/* 09 — COMPETITIVE LANDSCAPE */}
        <S n={9} label="LANDSCAPE">
          <motion.div {...fd}>
            <Eye>09 / Competitive Landscape</Eye>
            <H1>Profiles are not trust. Reviews are not execution.</H1>
          </motion.div>
          <div className="g4" style={{ marginTop: 24 }}>
            <Cell k="Marketplaces" v="Help people find supply." />
            <Cell k="CRMs" v="Help providers manage workflow." />
            <Cell k="Review Platforms" v="Summarize past sentiment." />
            <Cell k="Credential Systems" v="Verify identity or authorization." />
          </div>
          <NeonBox color={BLUE} style={{ marginTop: 28, padding: "20px 32px", maxWidth: 720, borderLeft: `3px solid ${BLUE}` }}>
            <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.6rem", letterSpacing: "0.2em", color: BLUE, textTransform: "uppercase", marginBottom: 8, textShadow: `0 0 8px ${BLUE}` }}>
              Briarwood
            </div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "1.05rem", color: TEXT, lineHeight: 1.55 }}>
              Measures behavior <em>inside</em> execution. No existing system captures behavioral trust from inside a live service job: the moment of execution, pressure, and recovery. That is the missing primitive.
            </div>
          </NeonBox>
        </S>

        {/* 10 — WHY IT MATTERS */}
        <S n={10} label="WHY IT MATTERS">
          <motion.div {...fd}>
            <Eye>10 / Why It Matters</Eye>
            <H1>Recovering lost economic energy.</H1>
          </motion.div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: `${BLUE}18`, border: `1px solid ${BLUE}18`, marginTop: 32, width: "100%", maxWidth: 600, boxShadow: `0 0 20px ${BLUE}08` }}>
            <div style={{ background: `${SURF}dd` }}><StatBlock value={<>$<Counter to={4} />T</>} label="Service economy" color={BLUE} /></div>
            <div style={{ background: `${SURF}dd` }}><StatBlock value={<><Counter to={85} />%</>} label="Demand abandoned" color={RED} /></div>
          </div>
          <div className="g3" style={{ marginTop: 28 }}>
            <Cell k="The Supply Exists" v="The real-world economy already has demand and trusted operators." />
            <Cell k="The Layer Is Missing" v="What it lacks is a machine-readable layer that keeps demand from evaporating when one node hits capacity." />
            <Cell k="The Opportunity" v="Briarwood turns lost demand into verified transactions and creates the behavioral trust data AI agents need to move work and money." />
          </div>
        </S>

        {/* 11 — TEAM */}
        <S n={11} label="TEAM">
          <motion.div {...fd}>
            <Eye>11 / Team</Eye>
            <H1>Built by the operator who lived the problem.</H1>
          </motion.div>
          <div className="g2" style={{ marginTop: 32 }}>
            <div style={{ background: `${SURF}dd`, padding: "26px 28px", borderTop: `1px solid ${BLUE}18` }}>
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.56rem", letterSpacing: "0.2em", textTransform: "uppercase", color: BLUE, marginBottom: 8, textShadow: `0 0 8px ${BLUE}80` }}>Founder & CEO</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "1.5rem", color: TEXT, marginBottom: 12, letterSpacing: "-0.5px" }}>Violet Herod</div>
              <ul style={{ listStyle: "none", padding: 0, fontFamily: "'Inter', sans-serif", fontSize: "0.84rem", color: FAINT, lineHeight: 1.7 }}>
                <li>· 28 years in a fragmented, trust-gated service market</li>
                <li>· $1M+ lifetime operator revenue, zero paid acquisition</li>
                <li>· Originated the behavioral trust thesis from real transaction data</li>
                <li>· Built the coordination network where Briarwood begins</li>
              </ul>
            </div>
            <div style={{ background: `${SURF}dd`, padding: "26px 28px", borderTop: `1px solid ${BLUE}18` }}>
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.56rem", letterSpacing: "0.2em", textTransform: "uppercase", color: BLUE, marginBottom: 8, textShadow: `0 0 8px ${BLUE}80` }}>Co-founder & CTO</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "1.5rem", color: TEXT, marginBottom: 12, letterSpacing: "-0.5px" }}>Dundy Pasupuleti</div>
              <ul style={{ listStyle: "none", padding: 0, fontFamily: "'Inter', sans-serif", fontSize: "0.84rem", color: FAINT, lineHeight: 1.7 }}>
                <li>· Computer Science, Santa Clara University</li>
                <li>· AI infrastructure and backend systems</li>
                <li>· Inference pipelines, Kubernetes, GCP, GPU optimization</li>
                <li>· Raised by SMB owners — direct context for the operator economy</li>
              </ul>
            </div>
          </div>
        </S>

        {/* 12 — THE ASK */}
        <S n={12} label="THE ASK">
          <motion.div {...fd}>
            <Eye>12 / The Ask</Eye>
            <div style={{
              fontFamily: "'Inter', sans-serif", fontWeight: 800,
              fontSize: "clamp(3rem, 7vw, 5.5rem)", letterSpacing: "-3px",
              color: TEXT, textShadow: `0 0 40px ${BLUE}40`, textAlign: "center", marginTop: 8,
            }}>$750K Pre-Seed</div>
            <Sub>12 months to scale the trust substrate.</Sub>
            <Body>
              Briarwood is the infrastructure that lets AI agents transact reliably in the real-world economy. Coordination workflow and CDI proof-of-concept are live. The round scales the operator network, hardens CDI, and launches the agent-facing API.
            </Body>
          </motion.div>
          <div className="g3" style={{ marginTop: 28 }}>
            <Cell k="Engineering" v="CDI scoring engine, production API, infrastructure." />
            <Cell k="Operator Network" v="Onboard 250 verified service operators across target coordination markets." />
            <Cell k="Partnerships" v="Agent platform integrations, SOC 2 readiness, GTM." />
          </div>
        </S>

        {/* 13 — CLOSE */}
        <S n={13} label="CLOSE">
          <motion.div {...fd} style={{ textAlign: "center" }}>
            <Eye>13 / Close</Eye>
            <div style={{
              fontFamily: "'Inter', sans-serif", fontWeight: 800,
              fontSize: "clamp(2rem, 4.8vw, 4rem)", letterSpacing: "-1.5px", lineHeight: 1.15,
              color: TEXT, marginTop: 16, maxWidth: 880,
            }}>
              Without a trust substrate,<br />
              <span style={{ color: RED, textShadow: `0 0 30px ${RED}, 0 0 60px ${RED}40` }}>agents are trapped in the browser.</span>
            </div>
            <div style={{ margin: "32px auto", width: 1, height: 40, background: `${BLUE}40`, boxShadow: `0 0 8px ${BLUE}` }} />
            <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "1.15rem", color: TEXT, letterSpacing: "-0.3px" }}>
              Briarwood makes real-world trust machine-readable.
            </div>
            <div style={{ marginTop: 36,
              fontFamily: "'Inter', sans-serif", fontWeight: 800,
              fontSize: "clamp(2.2rem, 5.5vw, 4rem)", letterSpacing: "-2px",
              color: TEXT, textShadow: `0 0 30px ${BLUE}40`,
            }}>BRIARWOOD AI</div>
            <Sub style={{ marginTop: 12 }}>The Trust Substrate for the Real-World Service Economy</Sub>
            <div style={{ marginTop: 48, fontFamily: "'Courier New', monospace", fontSize: "0.52rem",
              letterSpacing: "0.2em", color: `${TEXT}25`, textTransform: "uppercase",
              position: "relative", zIndex: 2 }}>
              violet@briarwood.ai · CDI™ Patent Pending · 2026
            </div>
          </motion.div>
        </S>

      </div>
    </>
  );
}
