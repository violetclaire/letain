import { useState, useEffect, useRef } from "react";

const SLIDES = 11;

export default function Pitch() {
  const [current, setCurrent] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setCurrent(Number((e.target as HTMLElement).dataset.slide));
        });
      },
      { threshold: 0.55 }
    );
    el.querySelectorAll("[data-slide]").forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const go = (n: number) => {
    containerRef.current?.querySelector(`[data-slide="${n}"]`)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }

        .deck {
          font-family: 'Inter', sans-serif;
          background: #070707;
          color: #e8e8e8;
        }

        /* ── TOP BAR ── */
        .bar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 200;
          height: 48px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 36px;
          background: rgba(7,7,7,0.85);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .bar-logo {
          font-size: 0.72rem; font-weight: 600;
          letter-spacing: 0.18em; text-transform: uppercase;
          color: rgba(255,255,255,0.9);
        }
        .bar-right { display: flex; align-items: center; gap: 14px; }
        .bar-dots { display: flex; gap: 5px; }
        .bdot {
          width: 5px; height: 5px; border-radius: 50%;
          background: rgba(255,255,255,0.15); cursor: pointer;
          border: none; padding: 0; transition: background 0.2s;
        }
        .bdot.on { background: #8b2035; }
        .bar-num {
          font-size: 0.62rem; color: rgba(255,255,255,0.2);
          font-variant-numeric: tabular-nums; letter-spacing: 0.06em;
        }

        /* ── SLIDE BASE ── */
        .s {
          height: 100vh; width: 100%;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 80px 12vw 60px;
          position: relative; overflow: hidden;
        }

        /* subtle grid bg */
        .s::before {
          content: '';
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
        }

        /* ── TYPOGRAPHY ── */
        .eyebrow {
          font-size: 0.6rem; font-weight: 600;
          letter-spacing: 0.22em; text-transform: uppercase;
          color: #8b2035; margin-bottom: 20px;
          position: relative; z-index: 1;
        }

        .h1 {
          font-size: clamp(2rem, 4vw, 3.6rem);
          font-weight: 600; line-height: 1.1;
          letter-spacing: -1px;
          color: #f0f0f0; text-align: center;
          max-width: 820px;
          position: relative; z-index: 1;
        }

        .h-hero {
          font-size: clamp(3rem, 6vw, 5.5rem);
          font-weight: 700; line-height: 1;
          letter-spacing: -2px;
          color: #f0f0f0; text-align: center;
          position: relative; z-index: 1;
        }

        .h-metric {
          font-size: clamp(5rem, 13vw, 11rem);
          font-weight: 700; line-height: 1;
          letter-spacing: -4px;
          color: #f0f0f0;
          position: relative; z-index: 1;
        }

        .sub {
          font-size: clamp(0.95rem, 1.4vw, 1.15rem);
          font-weight: 300; color: rgba(255,255,255,0.4);
          max-width: 520px; text-align: center;
          line-height: 1.7; margin-top: 16px;
          position: relative; z-index: 1;
        }

        .fn {
          font-size: 0.65rem; color: rgba(255,255,255,0.18);
          max-width: 440px; text-align: center;
          line-height: 1.7; margin-top: 20px;
          position: relative; z-index: 1;
        }

        .rule {
          width: 1px; height: 40px;
          background: rgba(255,255,255,0.1);
          margin: 24px auto;
          position: relative; z-index: 1;
        }

        /* ── PANEL GRIDS ── */
        .grid {
          display: grid; gap: 1px;
          background: rgba(255,255,255,0.06);
          max-width: 780px; width: 100%;
          margin-top: 40px;
          position: relative; z-index: 1;
        }
        .g2 { grid-template-columns: 1fr 1fr; }
        .g3 { grid-template-columns: repeat(3, 1fr); }

        .cell {
          background: #0d0d0d; padding: 26px 28px; text-align: left;
        }
        .cell-k {
          font-size: 0.58rem; font-weight: 600;
          letter-spacing: 0.18em; text-transform: uppercase;
          color: #8b2035; margin-bottom: 10px;
        }
        .cell-v {
          font-size: 0.85rem; font-weight: 300;
          line-height: 1.7; color: rgba(255,255,255,0.4);
        }

        /* ── FLOW ── */
        .flow {
          display: flex; align-items: center;
          gap: 6px; flex-wrap: wrap;
          justify-content: center; margin-top: 32px;
          position: relative; z-index: 1;
          max-width: 900px;
        }
        .chip {
          padding: 7px 14px;
          border: 1px solid rgba(255,255,255,0.08);
          font-size: 0.78rem; font-weight: 400;
          color: rgba(255,255,255,0.35);
          border-radius: 4px;
          white-space: nowrap;
        }
        .chip-bad {
          padding: 7px 14px;
          border: 1px solid rgba(220,38,38,0.25);
          background: rgba(220,38,38,0.05);
          font-size: 0.78rem; font-weight: 400;
          color: rgba(220,38,38,0.6);
          border-radius: 4px; white-space: nowrap;
        }
        .chip-go {
          padding: 7px 16px;
          border: 1px solid rgba(139,32,53,0.5);
          background: rgba(139,32,53,0.12);
          font-size: 0.78rem; font-weight: 600;
          color: #c06070; border-radius: 4px; white-space: nowrap;
        }
        .arr { color: rgba(255,255,255,0.12); font-size: 0.9rem; }
        .arr-r { color: rgba(220,38,38,0.25); font-size: 0.9rem; }

        /* ── MIRROR ── */
        .mirror-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 1px; background: rgba(255,255,255,0.06);
          max-width: 640px; width: 100%; margin-top: 36px;
          position: relative; z-index: 1;
        }
        .mc { background: #0d0d0d; padding: 24px 26px; }
        .mc-bad { background: rgba(220,38,38,0.04); padding: 24px 26px; }
        .mc-k {
          font-size: 0.56rem; font-weight: 600;
          letter-spacing: 0.18em; text-transform: uppercase;
          margin-bottom: 8px;
        }
        .mc-k-good { color: #8b2035; }
        .mc-k-bad  { color: rgba(220,38,38,0.6); }
        .mc-name {
          font-size: 0.95rem; font-weight: 500;
          color: #e8e8e8; margin-bottom: 6px;
        }
        .mc-score { font-size: 0.72rem; color: #8b2035; font-weight: 400; }
        .mc-burn  { font-size: 0.72rem; color: rgba(220,38,38,0.7); font-weight: 400; }
        .burn-row {
          grid-column: 1/-1;
          background: rgba(220,38,38,0.06);
          border-top: 1px solid rgba(220,38,38,0.15);
          padding: 10px 26px;
          font-size: 0.68rem; font-weight: 500;
          color: rgba(220,38,38,0.6);
          letter-spacing: 0.08em; text-transform: uppercase;
          text-align: center;
        }

        /* ── CDI SLIDE ── */
        .cdi-hero {
          font-size: clamp(4rem, 10vw, 9rem);
          font-weight: 700; letter-spacing: -3px; line-height: 1;
          background: linear-gradient(135deg, #e8e8e8 30%, #6b2535 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
          position: relative; z-index: 1; margin-bottom: 6px;
        }
        .cdi-sub {
          font-size: 0.78rem; font-weight: 400; letter-spacing: 0.1em;
          color: rgba(255,255,255,0.25); margin-bottom: 6px;
          position: relative; z-index: 1;
        }

        /* stamp */
        .stamp {
          position: absolute; top: 28px; right: -68px;
          transform: rotate(45deg); z-index: 2;
          font-size: 0.54rem; letter-spacing: 0.14em;
          border: 1px solid rgba(255,255,255,0.06);
          padding: 4px 52px; white-space: nowrap;
          color: rgba(255,255,255,0.1);
          background: #070707;
        }

        /* ── PILL ── */
        .pill {
          display: inline-flex; align-items: center; gap: 8px;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 100px; padding: 5px 14px;
          font-size: 0.58rem; font-weight: 500;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: rgba(255,255,255,0.25);
          margin-top: 14px;
          position: relative; z-index: 1;
        }
        .pill-dot { width: 5px; height: 5px; border-radius: 50%; background: #8b2035; }

        /* ── QUOTE ── */
        .quote {
          font-size: clamp(1rem, 1.8vw, 1.35rem);
          font-weight: 300; font-style: italic;
          color: rgba(255,255,255,0.45);
          max-width: 560px; text-align: center;
          line-height: 1.65; margin-top: 24px;
          position: relative; z-index: 1;
        }

        /* ── CLOSING ── */
        .closing {
          font-size: clamp(2rem, 4.5vw, 4rem);
          font-weight: 600; line-height: 1.15;
          letter-spacing: -1.5px; text-align: center;
          color: #f0f0f0;
          position: relative; z-index: 1;
        }

        /* ── CTA ── */
        .ctas {
          display: flex; gap: 12px; flex-wrap: wrap;
          justify-content: center; margin-top: 40px;
          position: relative; z-index: 1;
        }
        .cta-p {
          background: #f0f0f0; color: #070707;
          padding: 12px 28px; font-size: 0.78rem; font-weight: 600;
          text-decoration: none; letter-spacing: 0.04em;
          border-radius: 5px;
        }
        .cta-g {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.4);
          padding: 12px 28px; font-size: 0.78rem;
          text-decoration: none; letter-spacing: 0.04em; border-radius: 5px;
        }

        /* glow accent on hero */
        .glow {
          position: absolute; width: 600px; height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(107,26,42,0.18) 0%, transparent 70%);
          pointer-events: none; z-index: 0;
        }

        @media (max-width: 640px) {
          .s { padding: 64px 8vw 48px; }
          .g2, .g3, .mirror-grid { grid-template-columns: 1fr; }
          .burn-row { grid-column: 1; }
        }
      `}</style>

      {/* top bar */}
      <div className="bar">
        <div className="bar-logo">Briarwood</div>
        <div className="bar-right">
          <div className="bar-dots">
            {Array.from({ length: SLIDES }, (_, i) => (
              <button key={i} className={`bdot${current === i + 1 ? " on" : ""}`} onClick={() => go(i + 1)} />
            ))}
          </div>
          <div className="bar-num">{String(current).padStart(2,"0")} / {String(SLIDES).padStart(2,"0")}</div>
        </div>
      </div>

      <div className="deck" ref={containerRef}>

        {/* 01 — Hero */}
        <div className="s" data-slide="1">
          <div className="glow" style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
          <div className="eyebrow">dateinquiry.com</div>
          <div className="h-hero">BRIARWOOD</div>
          <div className="sub">The Infrastructure of Integrity.</div>
          <div className="pill">
            <div className="pill-dot" />
            CDI: Choreography Depth Index™ &nbsp;·&nbsp; Patent Pending
          </div>
        </div>

        {/* 02 — Trust Tax */}
        <div className="s" data-slide="2">
          <div className="glow" style={{ bottom: "0", right: "0" }} />
          <div className="eyebrow">The Trust Tax</div>
          <div className="h-metric">64%</div>
          <div className="sub">Execution Capacity Lost.</div>
          <div className="rule" />
          <div className="sub" style={{ marginTop: 0 }}>
            The measurable cost of uncomputable human variables in the $8 trillion physical economy.
          </div>
          <div className="fn">Derived from 28 years and 900+ high-stakes coordination events.</div>
        </div>

        {/* 03 — Chaos Wall */}
        <div className="s" data-slide="3">
          <div className="eyebrow">The Problem</div>
          <div className="h1">The Manual Friction Loop.</div>
          <div className="flow">
            {["Identify Node","Verify","Search","Handshake","Underwrite","Manage Chaos"].map((n) => (
              <span key={n} style={{ display: "contents" }}>
                <div className="chip-bad">{n}</div>
                <span className="arr-r">→</span>
              </span>
            ))}
            <div className="chip-go">Execute</div>
          </div>
          <div className="sub" style={{ marginTop: 28 }}>
            Software runs on math. The physical world runs on variables. This is the Invisible Labor stalling every autonomous network.
          </div>
        </div>

        {/* 04 — Latency Gap */}
        <div className="s" data-slide="4">
          <div className="eyebrow">The Latency Gap</div>
          <div className="h1">90 Days vs. Second Zero.</div>
          <div className="grid g2">
            <div className="cell">
              <div className="cell-k">The Flaw</div>
              <div className="cell-v">30/60/90-day lag is a gift to bad actors. It creates an exploitation window for reputation laundering.</div>
            </div>
            <div className="cell">
              <div className="cell-k">The Shift</div>
              <div className="cell-v">Trust must be an Instant Behavioral Primitive — available at second zero, not retrieved from a trailing audit.</div>
            </div>
          </div>
        </div>

        {/* 05 — Identity Anchor */}
        <div className="s" data-slide="5">
          <div className="eyebrow">The Identity Anchor</div>
          <div className="h1">The SSN for Execution.</div>
          <div className="sub">You cannot reset integrity by changing a name or forming a new LLC.</div>
          <div className="grid g3">
            {[
              { k: "Anchored", v: "A CDI Identity follows every agent and entity across every coordination — permanently." },
              { k: "No Reset", v: "No history reads as Unverified Origin, not zero — triggering the Mirror Protocol automatically." },
              { k: "Immutable", v: "There is no Delete Profile button for integrity. The anchor persists across all legal structures." },
            ].map((x) => (
              <div key={x.k} className="cell">
                <div className="cell-k">{x.k}</div>
                <div className="cell-v">{x.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 06 — CDI */}
        <div className="s" data-slide="6" style={{ position: "relative", overflow: "hidden" }}>
          <div className="glow" style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
          <div className="stamp">US PATENT PENDING // REF: 28-YR GROUND TRUTH</div>
          <div className="eyebrow">The Patented Solution</div>
          <div className="cdi-hero">CDI</div>
          <div className="cdi-sub">Choreography Depth Index™</div>
          <div className="pill" style={{ marginBottom: 28 }}>
            <div className="pill-dot" />Patent Pending
          </div>
          <div className="grid g3">
            {[
              { k: "Choreography", v: "Precise sequence and timing of multi-node execution events." },
              { k: "Depth", v: "High-fidelity behavioral ground truth that pixels cannot reach." },
              { k: "Index", v: "Machine-readable standard for underwriting risk at execution time." },
            ].map((x, i) => (
              <div key={x.k} className="cell" style={{ borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <div className="cell-k">{x.k}</div>
                <div className="cell-v">{x.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 07 — Mirror Protocol */}
        <div className="s" data-slide="7">
          <div className="eyebrow">The Mirror Protocol</div>
          <div className="h1">Recursive Associative Trust.</div>
          <div className="sub">Trust is a network effect. You are the company you keep.</div>
          <div className="mirror-grid">
            <div className="mc">
              <div className="mc-k mc-k-good">Master Agent</div>
              <div className="mc-name">Principal Node</div>
              <div className="mc-score">CDI 91 — vouches for sub-agent</div>
            </div>
            <div className="mc-bad">
              <div className="mc-k mc-k-bad">Sub-Agent</div>
              <div className="mc-name">Referred Node</div>
              <div className="mc-burn">Breaks coordination → Burn reflects instantly</div>
            </div>
            <div className="burn-row">⇄ &nbsp; Burn propagates to Master Agent at second zero</div>
          </div>
          <div className="sub" style={{ marginTop: 20 }}>
            High-fidelity operators refuse to align with bad actors because the CDI Burn is too expensive. The system self-cleans.
          </div>
        </div>

        {/* 08 — Neutral Arbiter */}
        <div className="s" data-slide="8">
          <div className="glow" style={{ top: "20%", left: "50%", transform: "translateX(-50%)", background: "radial-gradient(circle, rgba(139,32,53,0.15) 0%, transparent 70%)" }} />
          <div className="eyebrow">The Moat</div>
          <div className="h1">Independence is the Moat.</div>
          <div className="quote">
            "You don't let the student grade their own paper. You don't have the bank write its own credit report."
          </div>
          <div className="sub" style={{ marginTop: 28 }}>
            Agent companies cannot underwrite their own risk. Briarwood is the Independent Standard — and cannot be replicated by any player with skin in the game.
          </div>
        </div>

        {/* 09 — Why Now */}
        <div className="s" data-slide="9">
          <div className="eyebrow">Why Now</div>
          <div className="h1">Computing the Uncomputable.</div>
          <div className="grid g2">
            <div className="cell">
              <div className="cell-k">The Screen Limit</div>
              <div className="cell-v">AI agents have reached the boundary of what can be done in pixels. The physical world requires an Action-Conditioned Ledger.</div>
            </div>
            <div className="cell">
              <div className="cell-k">The Bridge</div>
              <div className="cell-v">We provide the Choreography — behavioral truth — that LLMs and Video Models cannot learn from pixels alone. It must be lived, captured, and indexed.</div>
            </div>
          </div>
        </div>

        {/* 10 — Execution Integrity */}
        <div className="s" data-slide="10">
          <div className="eyebrow">With Briarwood</div>
          <div className="h1">Execution Integrity.</div>
          <div className="flow" style={{ marginTop: 32 }}>
            <div className="chip">Identify Node</div>
            <span className="arr">→</span>
            <div className="chip-go">Execute</div>
          </div>
          <div className="sub" style={{ marginTop: 24 }}>
            We remove the Trust Tax. By digitizing the handshake, physical networks move at the speed of software.
          </div>
          <div className="ctas">
            <a href="mailto:violet@briarwood.ai" className="cta-p">Request a Demo</a>
            <a href="/demo-landing" className="cta-g">Full Overview →</a>
          </div>
        </div>

        {/* 11 — Philosophy */}
        <div className="s" data-slide="11">
          <div className="glow" style={{ bottom: "-100px", left: "50%", transform: "translateX(-50%)" }} />
          <div className="eyebrow">The Philosophy</div>
          <div className="closing">
            Privacy Stays.<br />
            <span style={{ color: "#8b2035" }}>Reputation Runs.</span><br />
            Trust Wins.
          </div>
          <div className="rule" />
          <div className="sub">The Human Defense Layer for the High-Stakes Economy.</div>
          <div style={{ marginTop: 52, fontSize: "0.58rem", letterSpacing: "0.18em", color: "rgba(255,255,255,0.12)", textTransform: "uppercase", position: "relative", zIndex: 1 }}>
            Briarwood &nbsp;·&nbsp; Founder Led &nbsp;·&nbsp; CDI™ Patent Pending &nbsp;·&nbsp; 2026
          </div>
        </div>

      </div>
    </>
  );
}
