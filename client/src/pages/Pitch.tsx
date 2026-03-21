import { useState, useEffect, useRef } from "react";
import { motion, useInView, animate } from "framer-motion";

const INK = "#1c1814";
const RED = "#6b1a2a";
const CREAM = "#f0ead8";
const SURFACE = "#e8e0cc";
const FAINT = "rgba(28,24,20,0.08)";
const SLIDES = 11;

/* ── helpers ── */
function useSlideView() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  return { ref, inView };
}

function Counter({ to, duration = 1.8 }: { to: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const { ref, inView } = useSlideView();
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration, ease: "easeOut", onUpdate: (v) => setVal(Math.round(v)) });
    return () => c.stop();
  }, [inView, to, duration]);
  return <span ref={ref}>{val}</span>;
}

/* Architectural title block — bottom right of every slide */
function TitleBlock({ sheet, title }: { sheet: string; title: string }) {
  return (
    <div style={{
      position: "absolute", bottom: 0, right: 0,
      border: `1px solid ${INK}`, borderTop: `2px solid ${INK}`, borderLeft: `2px solid ${INK}`,
      display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "auto auto",
      fontFamily: "'Courier New', monospace", fontSize: "0.54rem",
      letterSpacing: "0.1em", textTransform: "uppercase",
      background: CREAM, color: INK, minWidth: 220,
    }}>
      <div style={{ gridColumn: "1/-1", padding: "4px 8px", borderBottom: `1px solid ${INK}`, fontWeight: 700, color: RED }}>
        BRIARWOOD // CDI ARCHITECTURE
      </div>
      <div style={{ padding: "4px 8px", borderRight: `1px solid ${INK}`, opacity: 0.5 }}>{title}</div>
      <div style={{ padding: "4px 8px", color: RED, fontWeight: 700 }}>SHEET {sheet}</div>
      <div style={{ padding: "4px 8px", borderRight: `1px solid ${INK}`, opacity: 0.5 }}>DATE: MAR 2026</div>
      <div style={{ padding: "4px 8px", opacity: 0.5 }}>PATENT PENDING</div>
    </div>
  );
}

/* Corner registration marks */
function RegMarks() {
  const mk = (style: React.CSSProperties) => (
    <div style={{ position: "absolute", width: 16, height: 16, ...style }}>
      <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: INK, opacity: 0.35 }} />
      <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: INK, opacity: 0.35 }} />
    </div>
  );
  return <>
    {mk({ top: 12, left: 12 })}
    {mk({ top: 12, right: 12 })}
    {mk({ bottom: 44, left: 12 })}
    {mk({ bottom: 44, right: 12 })}
  </>;
}

/* Double-line frame */
function Frame() {
  return (
    <>
      <div style={{ position: "absolute", inset: 8, border: `1px solid ${INK}`, opacity: 0.18, pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 12, border: `0.5px solid ${INK}`, opacity: 0.1, pointerEvents: "none" }} />
    </>
  );
}

/* Drafting grid */
function Grid() {
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none",
      backgroundImage: `linear-gradient(${FAINT} 1px, transparent 1px), linear-gradient(90deg, ${FAINT} 1px, transparent 1px)`,
      backgroundSize: "48px 48px",
    }} />
  );
}

/* Annotation label */
function Ann({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <div style={{
      fontFamily: "'Courier New', monospace", fontSize: "0.56rem",
      letterSpacing: "0.16em", textTransform: "uppercase", color: RED,
      display: "flex", alignItems: "center", gap: 6,
      justifyContent: right ? "flex-end" : "flex-start",
    }}>
      <span style={{ display: "inline-block", width: 16, height: 1, background: RED, opacity: 0.5 }} />
      {children}
    </div>
  );
}

/* Gauge arc */
function Gauge({ pct }: { pct: number }) {
  const { ref, inView } = useSlideView();
  const r = 90, cx = 120, cy = 110;
  const arc = Math.PI * r;
  return (
    <div ref={ref} style={{ position: "relative", width: 240, height: 130 }}>
      <svg width={240} height={130} viewBox="0 0 240 130">
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
          fill="none" stroke={`${INK}18`} strokeWidth={10} strokeLinecap="round" />
        <motion.path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
          fill="none" stroke={RED} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={arc}
          initial={{ strokeDashoffset: arc }}
          animate={inView ? { strokeDashoffset: arc - (pct/100)*arc } : {}}
          transition={{ duration: 1.8, ease: "easeOut", delay: 0.4 }} />
        <circle cx={cx-r} cy={cy} r={4} fill={`${INK}40`} />
        <motion.circle cx={cx+r} cy={cy} r={4} fill={RED}
          initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 1.6 }} />
        <text x={cx} y={cy-8} textAnchor="middle" fill={INK} fontSize={11}
          fontFamily="'Courier New', monospace" opacity={0.35}>CAPACITY LOST</text>
      </svg>
    </div>
  );
}

/* Score ring */
function Ring({ score, label, delay=0 }: { score:number; label:string; delay?:number }) {
  const { ref, inView } = useSlideView();
  const r=34, c=2*Math.PI*r;
  return (
    <div ref={ref} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
      <div style={{ position:"relative", width:80, height:80 }}>
        <svg width={80} height={80} viewBox="0 0 80 80">
          <circle cx={40} cy={40} r={r} fill="none" stroke={`${INK}12`} strokeWidth={6} />
          <motion.circle cx={40} cy={40} r={r} fill="none" stroke={RED} strokeWidth={6}
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c}
            animate={inView ? { strokeDashoffset: c-(score/100)*c } : {}}
            transition={{ duration:1.4, delay, ease:"easeOut" }}
            transform="rotate(-90 40 40)" />
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
          fontFamily:"'Courier New', monospace", fontSize:"0.9rem", fontWeight:700, color:INK }}>
          {score}
        </div>
      </div>
      <div style={{ fontFamily:"'Courier New', monospace", fontSize:"0.54rem", letterSpacing:"0.12em",
        textTransform:"uppercase", color:INK, opacity:0.5, textAlign:"center", maxWidth:72 }}>
        {label}
      </div>
    </div>
  );
}

/* Mirror SVG network */
function MirrorNet() {
  const { ref, inView } = useSlideView();
  const nodes = [
    { x:340, y:70, label:"MASTER", score:"CDI 91", bad:false },
    { x:160, y:195, label:"NODE A", score:"CDI 88", bad:false },
    { x:270, y:195, label:"NODE B", score:"CDI 74", bad:false },
    { x:410, y:195, label:"NODE C", score:"BURN ↯", bad:true },
    { x:520, y:195, label:"NODE D", score:"CDI 91", bad:false },
  ];
  return (
    <div ref={ref} style={{ position:"relative", zIndex:1, width:"100%", maxWidth:680 }}>
      <svg width="100%" viewBox="0 0 680 280" style={{ overflow:"visible" }}>
        {nodes.slice(1).map((n,i) => (
          <motion.line key={i} x1={340} y1={70} x2={n.x} y2={n.y}
            stroke={n.bad ? RED : `${INK}25`}
            strokeWidth={n.bad ? 1 : 0.8}
            strokeDasharray={n.bad ? "3 3" : "4 4"}
            initial={{ pathLength:0, opacity:0 }}
            animate={inView ? { pathLength:1, opacity:1 } : {}}
            transition={{ duration:0.8, delay:0.3+i*0.15 }} />
        ))}
        {nodes.map((n,i) => (
          <motion.g key={n.label}
            initial={{ opacity:0, scale:0 }} animate={inView ? { opacity:1, scale:1 } : {}}
            transition={{ duration:0.4, delay:i*0.12 }}>
            <rect x={n.x-30} y={n.y-22} width={60} height={44}
              fill={CREAM} stroke={n.bad ? RED : INK}
              strokeWidth={n.bad ? 1.5 : 0.8} rx={1} />
            <text x={n.x} y={n.y-6} textAnchor="middle"
              fill={n.bad ? RED : INK} fontSize={7.5}
              fontFamily="'Courier New', monospace" fontWeight={700}>
              {n.label}
            </text>
            <text x={n.x} y={n.y+8} textAnchor="middle"
              fill={n.bad ? RED : `${INK}60`} fontSize={6.5}
              fontFamily="'Courier New', monospace">
              {n.score}
            </text>
          </motion.g>
        ))}
        {inView && <>
          <motion.rect x={380} y={48} width={60} height={44} rx={1}
            fill="none" stroke={RED} strokeWidth={0.8}
            initial={{ opacity:0.6, scale:1 }} animate={{ opacity:0, scale:1.6 }}
            style={{ transformOrigin:"410px 195px" }}
            transition={{ duration:1.6, delay:1.2, repeat:Infinity, repeatDelay:2 }} />
        </>}
      </svg>
      <div style={{ display:"flex", justifyContent:"center", gap:24, marginTop:4 }}>
        {[["▪ Standard node",false],["▪ Burn propagating",true]].map(([l,bad]) => (
          <span key={String(l)} style={{ fontFamily:"'Courier New', monospace", fontSize:"0.52rem",
            letterSpacing:"0.1em", color:bad ? RED : `${INK}60`, textTransform:"uppercase" }}>
            {l as string}
          </span>
        ))}
      </div>
    </div>
  );
}

/* Friction flow */
function FrictionFlow() {
  const { ref, inView } = useSlideView();
  const steps = ["Identify Node","Verify","Search","Handshake","Underwrite","Manage Chaos"];
  return (
    <div ref={ref} style={{ position:"relative", zIndex:1, width:"100%", maxWidth:860 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", justifyContent:"center", margin:"28px 0 12px" }}>
        {steps.map((s,i) => (
          <span key={s} style={{ display:"contents" }}>
            <motion.div initial={{ opacity:0, y:8 }}
              animate={inView ? { opacity:1, y:0 } : {}}
              transition={{ delay:i*0.15, duration:0.35 }}
              style={{
                padding:"8px 14px", border:`1px solid ${RED}60`,
                background:`${RED}08`, color:`${RED}cc`,
                fontFamily:"'Courier New', monospace", fontSize:"0.72rem",
                letterSpacing:"0.06em", whiteSpace:"nowrap",
              }}>
              {s}
            </motion.div>
            <motion.span initial={{ opacity:0 }} animate={inView ? { opacity:1 } : {}}
              transition={{ delay:i*0.15+0.1 }}
              style={{ color:`${RED}40`, fontSize:"0.8rem" }}>→</motion.span>
          </span>
        ))}
        <motion.div initial={{ opacity:0, scale:0.9 }}
          animate={inView ? { opacity:1, scale:1 } : {}}
          transition={{ delay:steps.length*0.15+0.1, type:"spring" }}
          style={{
            padding:"8px 16px", border:`1px solid ${INK}`, background:INK, color:CREAM,
            fontFamily:"'Courier New', monospace", fontSize:"0.72rem",
            letterSpacing:"0.06em", fontWeight:700,
          }}>
          EXECUTE
        </motion.div>
      </div>
      <motion.div initial={{ opacity:0 }} animate={inView ? { opacity:1 } : {}} transition={{ delay:1.4 }}
        style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
        <div style={{ height:1, width:32, background:`${RED}40` }} />
        <span style={{ fontFamily:"'Courier New', monospace", fontSize:"0.52rem",
          color:`${RED}80`, letterSpacing:"0.12em", textTransform:"uppercase" }}>
          6 steps of invisible labor before a single task begins
        </span>
        <div style={{ height:1, width:32, background:`${RED}40` }} />
      </motion.div>
    </div>
  );
}

/* Timeline bars */
function TimelineBars() {
  const { ref, inView } = useSlideView();
  return (
    <div ref={ref} style={{ maxWidth:580, width:"100%", marginTop:36, position:"relative", zIndex:1 }}>
      {[
        { label:"Traditional (FICO / Background)", note:"30–90 DAY LAG", pct:100, bad:true },
        { label:"Briarwood CDI", note:"SECOND ZERO", pct:2, bad:false },
      ].map((row,i) => (
        <div key={row.label} style={{ marginBottom:28 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, alignItems:"baseline" }}>
            <span style={{ fontFamily:"'Courier New', monospace", fontSize:"0.68rem",
              color:row.bad ? `${INK}50` : INK, letterSpacing:"0.08em", textTransform:"uppercase" }}>
              {row.label}
            </span>
            <span style={{ fontFamily:"'Courier New', monospace", fontSize:"0.65rem",
              color:row.bad ? RED : RED, fontWeight:700, letterSpacing:"0.06em" }}>
              {row.note}
            </span>
          </div>
          <div style={{ height:5, background:`${INK}10`, position:"relative" }}>
            <motion.div initial={{ width:0 }}
              animate={inView ? { width:`${row.pct}%` } : {}}
              transition={{ duration:1.2, delay:i*0.3+0.3, ease:"easeOut" }}
              style={{ height:"100%", background:row.bad ? `${RED}60` : INK }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── SLIDE WRAPPER ── */
function Slide({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div data-slide={n} style={{
      height:"100vh", minHeight:600, width:"100%",
      background:CREAM, color:INK,
      position:"relative", overflow:"hidden",
      display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      padding:"80px 10vw 60px",
      borderBottom:`1px solid ${INK}18`,
    }}>
      <Grid />
      <Frame />
      <RegMarks />
      {children}
      <TitleBlock sheet={String(n).padStart(2,"0")} title={title} />
    </div>
  );
}

/* ── TOP BAR ── */
export default function Pitch() {
  const [current, setCurrent] = useState(1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(
      (es) => es.forEach(e => { if (e.isIntersecting) setCurrent(Number((e.target as HTMLElement).dataset.slide)); }),
      { threshold:0.5 }
    );
    el.querySelectorAll("[data-slide]").forEach(s => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  const go = (n:number) => ref.current?.querySelector(`[data-slide="${n}"]`)?.scrollIntoView({ behavior:"smooth" });

  const fade = {
    initial:{ opacity:0, y:20 },
    whileInView:{ opacity:1, y:0 },
    viewport:{ once:true, amount:0.3 },
    transition:{ duration:0.55 },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=Inter:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html { scroll-behavior:smooth; }

        .bar {
          position:fixed; top:0; left:0; right:0; z-index:400;
          height:44px; display:flex; align-items:center; justify-content:space-between;
          padding:0 32px;
          background:${CREAM}ee; backdrop-filter:blur(12px);
          border-bottom:1px solid ${INK}30;
        }
        .bar-logo {
          font-family:'Courier New', monospace; font-size:0.7rem;
          font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:${INK};
        }
        .bar-r { display:flex; align-items:center; gap:12px; }
        .bdots { display:flex; gap:5px; }
        .bd {
          width:6px; height:6px; border-radius:50%;
          background:${INK}20; cursor:pointer; border:none; padding:0;
          transition:background 0.2s;
        }
        .bd.on { background:${RED}; }
        .bnum {
          font-family:'Courier New', monospace; font-size:0.58rem;
          color:${INK}40; font-variant-numeric:tabular-nums; letter-spacing:0.08em;
        }
      `}</style>

      {/* nav bar */}
      <div className="bar">
        <div className="bar-logo">Briarwood — CDI Deck</div>
        <div className="bar-r">
          <div className="bdots">
            {Array.from({length:SLIDES},(_,i) => (
              <button key={i} className={`bd${current===i+1?" on":""}`} onClick={()=>go(i+1)} />
            ))}
          </div>
          <div className="bnum">{String(current).padStart(2,"0")}/{String(SLIDES).padStart(2,"0")}</div>
        </div>
      </div>

      <div ref={ref}>

        {/* 01 — HERO */}
        <Slide n={1} title="HERO">
          <motion.div {...fade} style={{ display:"flex", flexDirection:"column", alignItems:"center", position:"relative", zIndex:1 }}>
            <Ann>Project Overview</Ann>
            <div style={{ marginTop:16, marginBottom:16 }}>
              <div style={{ fontFamily:"'Fraunces', serif", fontSize:"clamp(3rem,7vw,6.5rem)",
                fontWeight:700, letterSpacing:"-3px", lineHeight:1, color:INK, textAlign:"center" }}>
                BRIARWOOD
              </div>
            </div>
            <div style={{ fontFamily:"'Courier New', monospace", fontSize:"clamp(0.8rem,1.4vw,1rem)",
              color:`${INK}60`, letterSpacing:"0.1em", textAlign:"center", textTransform:"uppercase", maxWidth:440, lineHeight:1.7 }}>
              The Infrastructure of Integrity.
            </div>
            <div style={{ margin:"24px 0 8px", display:"flex", gap:24, alignItems:"center", opacity:0.4 }}>
              <div style={{ height:1, width:40, background:INK }} />
              <span style={{ fontFamily:"'Courier New', monospace", fontSize:"0.56rem",
                letterSpacing:"0.2em", textTransform:"uppercase", color:INK }}>
                CDI: Choreography Depth Index™ · Patent Pending
              </span>
              <div style={{ height:1, width:40, background:INK }} />
            </div>
          </motion.div>
        </Slide>

        {/* 02 — TRUST TAX */}
        <Slide n={2} title="THE TRUST TAX">
          <motion.div {...fade} style={{ display:"flex", flexDirection:"column", alignItems:"center", position:"relative", zIndex:1, gap:4 }}>
            <Ann>Primary Metric</Ann>
            <div style={{ display:"flex", alignItems:"flex-end", gap:4, lineHeight:1, marginTop:8 }}>
              <span style={{ fontFamily:"'Fraunces', serif", fontSize:"clamp(5rem,14vw,11rem)",
                fontWeight:700, letterSpacing:"-5px", color:INK }}>
                <Counter to={64} />
              </span>
              <span style={{ fontFamily:"'Fraunces', serif", fontSize:"clamp(2.5rem,7vw,5.5rem)",
                fontWeight:700, letterSpacing:"-2px", color:RED, marginBottom:"0.1em" }}>%</span>
            </div>
            <div style={{ fontFamily:"'Courier New', monospace", fontSize:"0.72rem",
              letterSpacing:"0.14em", textTransform:"uppercase", color:`${INK}50`, marginBottom:24 }}>
              Execution Capacity Lost
            </div>
          </motion.div>
          <Gauge pct={64} />
          <motion.div {...fade} transition={{ delay:0.4 }}
            style={{ marginTop:20, fontFamily:"'Courier New', monospace", fontSize:"0.58rem",
              color:`${INK}35`, letterSpacing:"0.1em", textAlign:"center", lineHeight:1.8, maxWidth:400,
              position:"relative", zIndex:1 }}>
            DERIVED FROM 28 YEARS AND 900+ HIGH-STAKES COORDINATION EVENTS.<br/>
            INCLUDES IDENTITY VERIFICATION, HISTORY SEARCH, AND COORDINATION OVERHEAD.
          </motion.div>
        </Slide>

        {/* 03 — CHAOS WALL */}
        <Slide n={3} title="THE CHAOS WALL">
          <motion.div {...fade} style={{ display:"flex", flexDirection:"column", alignItems:"center", position:"relative", zIndex:1 }}>
            <Ann>Problem Statement</Ann>
            <div style={{ fontFamily:"'Fraunces', serif", fontSize:"clamp(2rem,4.5vw,3.8rem)",
              fontWeight:700, letterSpacing:"-1.5px", color:INK, textAlign:"center", marginTop:12, maxWidth:700, lineHeight:1.1 }}>
              The Manual Friction Loop.
            </div>
          </motion.div>
          <FrictionFlow />
          <motion.div {...fade} transition={{ delay:0.5 }}
            style={{ marginTop:20, fontFamily:"'Courier New', monospace", fontSize:"0.64rem",
              color:`${INK}50`, letterSpacing:"0.08em", textAlign:"center", lineHeight:1.8,
              maxWidth:480, position:"relative", zIndex:1, textTransform:"uppercase" }}>
            Software runs on math. The physical world runs on variables.<br/>
            This is the invisible labor stalling every autonomous network.
          </motion.div>
        </Slide>

        {/* 04 — LATENCY GAP */}
        <Slide n={4} title="THE LATENCY GAP">
          <motion.div {...fade} style={{ display:"flex", flexDirection:"column", alignItems:"center", position:"relative", zIndex:1 }}>
            <Ann>System Failure Analysis</Ann>
            <div style={{ fontFamily:"'Fraunces', serif", fontSize:"clamp(2rem,4.5vw,3.8rem)",
              fontWeight:700, letterSpacing:"-1.5px", color:INK, textAlign:"center", marginTop:12, lineHeight:1.1 }}>
              90 Days vs. Second Zero.
            </div>
            <div style={{ fontFamily:"'Courier New', monospace", fontSize:"0.68rem",
              color:`${INK}50`, letterSpacing:"0.08em", textAlign:"center", marginTop:12, maxWidth:460,
              lineHeight:1.8, textTransform:"uppercase" }}>
              Traditional trust models rely on a 30/60/90-day lag.<br/>In high-stakes execution, latency is a structural failure.
            </div>
          </motion.div>
          <TimelineBars />
        </Slide>

        {/* 05 — IDENTITY ANCHOR */}
        <Slide n={5} title="THE IDENTITY ANCHOR">
          <motion.div {...fade} style={{ display:"flex", flexDirection:"column", alignItems:"center", position:"relative", zIndex:1 }}>
            <Ann>Security Layer</Ann>
            <div style={{ fontFamily:"'Fraunces', serif", fontSize:"clamp(2rem,4.5vw,3.8rem)",
              fontWeight:700, letterSpacing:"-1.5px", color:INK, textAlign:"center", marginTop:12, lineHeight:1.1 }}>
              The SSN for Execution.
            </div>
            <div style={{ fontFamily:"'Courier New', monospace", fontSize:"0.68rem",
              color:`${INK}50`, letterSpacing:"0.08em", textAlign:"center", marginTop:10,
              textTransform:"uppercase", lineHeight:1.8 }}>
              You cannot reset integrity by changing a name or forming a new LLC.
            </div>
          </motion.div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:1,
            background:`${INK}15`, maxWidth:720, width:"100%", marginTop:36,
            position:"relative", zIndex:1 }}>
            {[
              { k:"Anchored", v:"A CDI Identity follows every agent across every coordination event — permanently, across all legal structures." },
              { k:"No Reset", v:"No history reads as Unverified Origin, not zero — triggering the Mirror Protocol automatically." },
              { k:"Immutable", v:"There is no Delete Profile button for integrity. The anchor persists across all legal structures." },
            ].map((x,i) => (
              <motion.div key={x.k} {...fade} transition={{ delay:i*0.15 }}
                style={{ background:CREAM, padding:"24px 22px" }}>
                <div style={{ fontFamily:"'Courier New', monospace", fontSize:"0.56rem",
                  letterSpacing:"0.2em", textTransform:"uppercase", color:RED, marginBottom:10, fontWeight:700 }}>
                  {x.k}
                </div>
                <div style={{ fontFamily:"'Courier New', monospace", fontSize:"0.74rem",
                  lineHeight:1.75, color:`${INK}55`, letterSpacing:"0.02em" }}>
                  {x.v}
                </div>
              </motion.div>
            ))}
          </div>
        </Slide>

        {/* 06 — CDI */}
        <Slide n={6} title="CDI SPECIFICATION">
          <div style={{ position:"absolute", top:24, right:-68, transform:"rotate(45deg)", zIndex:2,
            fontFamily:"'Courier New', monospace", fontSize:"0.5rem", letterSpacing:"0.14em",
            border:`1px solid ${INK}30`, padding:"4px 56px",
            background:CREAM, color:`${INK}35`, whiteSpace:"nowrap" }}>
            US PATENT PENDING // REF: 28-YR GROUND TRUTH
          </div>
          <motion.div {...fade} style={{ display:"flex", flexDirection:"column", alignItems:"center", position:"relative", zIndex:1 }}>
            <Ann>Patented Solution</Ann>
            <div style={{ fontFamily:"'Fraunces', serif", fontSize:"clamp(4rem,10vw,9rem)",
              fontWeight:700, letterSpacing:"-4px", lineHeight:1, color:INK, marginTop:8 }}>
              CDI
            </div>
            <div style={{ fontFamily:"'Courier New', monospace", fontSize:"0.74rem",
              letterSpacing:"0.12em", color:`${INK}45`, marginBottom:20, textTransform:"uppercase" }}>
              Choreography Depth Index™ · Patent Pending
            </div>
          </motion.div>
          <div style={{ display:"flex", gap:32, justifyContent:"center", flexWrap:"wrap",
            margin:"0 0 28px", position:"relative", zIndex:1 }}>
            <Ring score={91} label="Master Agent" delay={0.3} />
            <Ring score={74} label="Sub-Agent" delay={0.5} />
            <Ring score={23} label="Unverified Origin" delay={0.7} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:1,
            background:`${INK}15`, maxWidth:660, width:"100%", position:"relative", zIndex:1 }}>
            {[
              { k:"Choreography", v:"Precise sequence and timing of multi-node execution events." },
              { k:"Depth", v:"High-fidelity behavioral ground truth that pixels cannot reach." },
              { k:"Index", v:"Machine-readable standard for underwriting risk at execution time." },
            ].map((x,i) => (
              <motion.div key={x.k} {...fade} transition={{ delay:0.2+i*0.12 }}
                style={{ background:CREAM, padding:"20px 20px" }}>
                <div style={{ fontFamily:"'Courier New', monospace", fontSize:"0.54rem",
                  letterSpacing:"0.18em", textTransform:"uppercase", color:RED, marginBottom:8, fontWeight:700 }}>
                  {x.k}
                </div>
                <div style={{ fontFamily:"'Courier New', monospace", fontSize:"0.72rem",
                  lineHeight:1.7, color:`${INK}50` }}>{x.v}</div>
              </motion.div>
            ))}
          </div>
        </Slide>

        {/* 07 — MIRROR PROTOCOL */}
        <Slide n={7} title="MIRROR PROTOCOL">
          <motion.div {...fade} style={{ display:"flex", flexDirection:"column", alignItems:"center", position:"relative", zIndex:1 }}>
            <Ann>Network Security Layer</Ann>
            <div style={{ fontFamily:"'Fraunces', serif", fontSize:"clamp(2rem,4.5vw,3.8rem)",
              fontWeight:700, letterSpacing:"-1.5px", color:INK, textAlign:"center", marginTop:12, lineHeight:1.1 }}>
              Recursive Associative Trust.
            </div>
            <div style={{ fontFamily:"'Courier New', monospace", fontSize:"0.66rem",
              color:`${INK}50`, letterSpacing:"0.08em", marginTop:10, textTransform:"uppercase" }}>
              Trust is a network effect. You are the company you keep.
            </div>
          </motion.div>
          <MirrorNet />
          <motion.div {...fade} transition={{ delay:0.6 }}
            style={{ marginTop:16, fontFamily:"'Courier New', monospace", fontSize:"0.62rem",
              color:`${INK}45`, letterSpacing:"0.08em", textAlign:"center", lineHeight:1.8,
              maxWidth:500, position:"relative", zIndex:1, textTransform:"uppercase" }}>
            High-fidelity operators refuse to align with bad actors.<br/>
            The CDI burn is too expensive. The system self-cleans.
          </motion.div>
        </Slide>

        {/* 08 — NEUTRAL ARBITER */}
        <Slide n={8} title="THE NEUTRAL ARBITER">
          <motion.div {...fade} style={{ display:"flex", flexDirection:"column", alignItems:"center", position:"relative", zIndex:1, maxWidth:680 }}>
            <Ann>Competitive Moat</Ann>
            <div style={{ fontFamily:"'Fraunces', serif", fontSize:"clamp(2rem,4.5vw,3.8rem)",
              fontWeight:700, letterSpacing:"-1.5px", color:INK, textAlign:"center", marginTop:12, lineHeight:1.1 }}>
              Independence is the Moat.
            </div>
            <div style={{ margin:"28px 0 24px", padding:"24px 32px",
              border:`1px solid ${INK}25`, borderLeft:`3px solid ${RED}`,
              background:`${INK}04`, maxWidth:520 }}>
              <div style={{ fontFamily:"'Fraunces', serif", fontSize:"clamp(0.9rem,1.6vw,1.2rem)",
                fontStyle:"italic", color:`${INK}70`, lineHeight:1.65, textAlign:"center" }}>
                "You don't let the student grade their own paper.<br/>
                You don't have the bank write its own credit report."
              </div>
            </div>
            <div style={{ fontFamily:"'Courier New', monospace", fontSize:"0.66rem",
              color:`${INK}50`, letterSpacing:"0.08em", textAlign:"center", lineHeight:1.8, textTransform:"uppercase" }}>
              Agent companies cannot underwrite their own risk.<br/>
              Briarwood is the independent standard — and cannot be replicated<br/>
              by any player with skin in the game.
            </div>
          </motion.div>
        </Slide>

        {/* 09 — WHY NOW */}
        <Slide n={9} title="MARKET TIMING">
          <motion.div {...fade} style={{ display:"flex", flexDirection:"column", alignItems:"center", position:"relative", zIndex:1 }}>
            <Ann>Why Now</Ann>
            <div style={{ fontFamily:"'Fraunces', serif", fontSize:"clamp(2rem,4.5vw,3.8rem)",
              fontWeight:700, letterSpacing:"-1.5px", color:INK, textAlign:"center", marginTop:12, lineHeight:1.1 }}>
              Computing the Uncomputable.
            </div>
            <div style={{ fontFamily:"'Courier New', monospace", fontSize:"0.66rem",
              color:`${INK}50`, letterSpacing:"0.08em", textAlign:"center", marginTop:10,
              textTransform:"uppercase", lineHeight:1.8 }}>
              AI has hit the screen limit. The physical world requires an action-conditioned ledger.
            </div>
          </motion.div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1,
            background:`${INK}15`, maxWidth:660, width:"100%", marginTop:36,
            position:"relative", zIndex:1 }}>
            {[
              { k:"The Screen Limit", v:"Every major model company is trying to enter the physical world — and hitting the same wall. Pixels alone cannot underwrite execution." },
              { k:"The Bridge", v:"We provide the Choreography — behavioral truth — that LLMs and Video Models cannot learn from pixels alone. It must be lived, captured, and indexed." },
            ].map((x,i) => (
              <motion.div key={x.k} {...fade} transition={{ delay:i*0.2 }}
                style={{ background:CREAM, padding:"26px 24px" }}>
                <div style={{ fontFamily:"'Courier New', monospace", fontSize:"0.56rem",
                  letterSpacing:"0.18em", textTransform:"uppercase", color:RED, marginBottom:10, fontWeight:700 }}>
                  {x.k}
                </div>
                <div style={{ fontFamily:"'Courier New', monospace", fontSize:"0.74rem",
                  lineHeight:1.75, color:`${INK}55` }}>{x.v}</div>
              </motion.div>
            ))}
          </div>
        </Slide>

        {/* 10 — EXECUTION INTEGRITY */}
        <Slide n={10} title="EXECUTION INTEGRITY">
          <motion.div {...fade} style={{ display:"flex", flexDirection:"column", alignItems:"center", position:"relative", zIndex:1 }}>
            <Ann>Live Metrics — Production</Ann>
            <div style={{ fontFamily:"'Fraunces', serif", fontSize:"clamp(2rem,4.5vw,3.8rem)",
              fontWeight:700, letterSpacing:"-1.5px", color:INK, textAlign:"center", marginTop:12, lineHeight:1.1 }}>
              With Briarwood.
            </div>
          </motion.div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:1,
            background:`${INK}15`, maxWidth:680, width:"100%", marginTop:32,
            position:"relative", zIndex:1 }}>
            {[
              { n:"169", l:"Inquiries Processed", s:"Real bookings routed through the CDI layer" },
              { n:"37", l:"Referrals Routed", s:"Network choreography working in production" },
              { n:"15", l:"Deposits Collected", s:"Square payments with 1.5% platform fee" },
            ].map((m,i) => (
              <motion.div key={m.l} {...fade} transition={{ delay:i*0.15 }}
                style={{ background:CREAM, padding:"22px 20px" }}>
                <div style={{ fontFamily:"'Fraunces', serif", fontSize:"2.2rem",
                  fontWeight:700, letterSpacing:"-1px", color:INK, marginBottom:4 }}>{m.n}</div>
                <div style={{ fontFamily:"'Courier New', monospace", fontSize:"0.56rem",
                  letterSpacing:"0.14em", textTransform:"uppercase", color:RED, marginBottom:6 }}>{m.l}</div>
                <div style={{ fontFamily:"'Courier New', monospace", fontSize:"0.66rem",
                  color:`${INK}45`, lineHeight:1.6 }}>{m.s}</div>
              </motion.div>
            ))}
          </div>
          <motion.div {...fade} transition={{ delay:0.5 }}
            style={{ display:"flex", alignItems:"center", gap:12, marginTop:28,
              position:"relative", zIndex:1 }}>
            <div style={{ padding:"9px 16px", border:`1px solid ${INK}30`,
              fontFamily:"'Courier New', monospace", fontSize:"0.72rem",
              color:`${INK}50`, letterSpacing:"0.06em", textTransform:"uppercase" }}>
              Identify Node
            </div>
            <span style={{ color:RED, fontSize:"1.2rem" }}>→</span>
            <div style={{ padding:"9px 18px", background:INK, color:CREAM,
              fontFamily:"'Courier New', monospace", fontSize:"0.72rem",
              letterSpacing:"0.08em", textTransform:"uppercase", fontWeight:700 }}>
              Execute
            </div>
          </motion.div>
          <motion.div {...fade} transition={{ delay:0.7 }}
            style={{ display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center",
              marginTop:28, position:"relative", zIndex:1 }}>
            <a href="mailto:violet@briarwood.ai" style={{
              background:INK, color:CREAM, padding:"11px 28px",
              fontFamily:"'Courier New', monospace", fontSize:"0.68rem", fontWeight:700,
              textDecoration:"none", letterSpacing:"0.1em", textTransform:"uppercase" }}>
              Request a Demo
            </a>
            <a href="/demo-landing" style={{
              background:"transparent", border:`1px solid ${INK}40`, color:`${INK}60`,
              padding:"11px 28px", fontFamily:"'Courier New', monospace", fontSize:"0.68rem",
              textDecoration:"none", letterSpacing:"0.1em", textTransform:"uppercase" }}>
              Full Overview →
            </a>
          </motion.div>
        </Slide>

        {/* 11 — PHILOSOPHY */}
        <Slide n={11} title="FOUNDING PHILOSOPHY">
          <motion.div {...fade} style={{ display:"flex", flexDirection:"column", alignItems:"center",
            position:"relative", zIndex:1, textAlign:"center" }}>
            <Ann>The Philosophy</Ann>
            <div style={{ fontFamily:"'Fraunces', serif",
              fontSize:"clamp(2rem,5vw,4.5rem)",
              fontWeight:700, letterSpacing:"-2px", lineHeight:1.1, marginTop:16, color:INK }}>
              Privacy Stays.<br />
              <span style={{ color:RED }}>Reputation Runs.</span><br />
              Trust Wins.
            </div>
            <div style={{ margin:"28px 0", height:1, width:48, background:`${INK}25` }} />
            <div style={{ fontFamily:"'Courier New', monospace", fontSize:"0.7rem",
              color:`${INK}50`, letterSpacing:"0.1em", textTransform:"uppercase", lineHeight:1.8 }}>
              The Human Defense Layer for the High-Stakes Economy.
            </div>
            <div style={{ marginTop:48, fontFamily:"'Courier New', monospace", fontSize:"0.54rem",
              letterSpacing:"0.18em", color:`${INK}25`, textTransform:"uppercase" }}>
              Briarwood · Founder Led · CDI™ Patent Pending · 2026
            </div>
          </motion.div>
        </Slide>

      </div>
    </>
  );
}
