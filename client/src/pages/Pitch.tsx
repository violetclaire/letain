import { useState, useEffect, useRef } from "react";

const BURG = "#6b1a2a";
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
          if (e.isIntersecting) {
            setCurrent(Number((e.target as HTMLElement).dataset.slide));
          }
        });
      },
      { threshold: 0.5 }
    );
    el.querySelectorAll("[data-slide]").forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const go = (n: number) => {
    const el = containerRef.current?.querySelector(`[data-slide="${n}"]`);
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { overflow-x: hidden; }

        .deck { font-family: 'Inter', sans-serif; scroll-behavior: smooth; }

        /* Top bar */
        .topbar {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          height: 52px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 40px;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #f0f0f0;
        }
        .topbar-logo {
          font-size: 0.78rem; font-weight: 800; letter-spacing: 0.12em;
          text-transform: uppercase; color: #0f0f0f;
        }
        .topbar-nav {
          display: flex; align-items: center; gap: 6px;
        }
        .dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #e0e0e0; cursor: pointer; transition: background 0.2s;
          border: none; padding: 0;
        }
        .dot.active { background: ${BURG}; }
        .topbar-count {
          font-size: 0.68rem; color: #bbb; margin-left: 12px;
          font-variant-numeric: tabular-nums;
        }

        /* Slides */
        .slide {
          height: 100vh; width: 100%;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 52px 10vw 40px;
          position: relative; overflow: hidden;
        }
        .slide-white  { background: #ffffff; }
        .slide-near   { background: #fafafa; }
        .slide-dark   { background: #0a0a0a; color: #fff; }
        .slide-burg   { background: ${BURG}; color: #fff; }

        /* Typography */
        .kicker {
          font-size: 0.65rem; font-weight: 600;
          letter-spacing: 0.2em; text-transform: uppercase;
          color: ${BURG}; margin-bottom: 20px;
        }
        .kicker-w {
          font-size: 0.65rem; font-weight: 600;
          letter-spacing: 0.2em; text-transform: uppercase;
          color: rgba(255,255,255,0.4); margin-bottom: 20px;
        }

        .title {
          font-size: clamp(3rem, 6vw, 6rem);
          font-weight: 800; line-height: 1.0;
          letter-spacing: -3px; text-align: center;
          max-width: 900px;
        }
        .title-xl {
          font-size: clamp(5rem, 11vw, 10rem);
          font-weight: 900; line-height: 1;
          letter-spacing: -5px; text-align: center;
        }
        .title-metric {
          font-size: clamp(10rem, 28vw, 22rem);
          font-weight: 900; line-height: 1;
          letter-spacing: -12px;
        }

        .desc {
          font-size: clamp(1rem, 1.6vw, 1.25rem);
          font-weight: 400; line-height: 1.6;
          max-width: 520px; text-align: center;
          color: #666; margin-top: 20px;
        }
        .desc-w {
          font-size: clamp(1rem, 1.6vw, 1.25rem);
          font-weight: 400; line-height: 1.6;
          max-width: 520px; text-align: center;
          color: rgba(255,255,255,0.5); margin-top: 20px;
        }

        .eyeline {
          font-size: 0.68rem; color: #bbb; margin-top: 10px;
          font-variant-numeric: tabular-nums;
        }

        /* Flow */
        .flow {
          display: flex; align-items: center; gap: 8px;
          flex-wrap: wrap; justify-content: center; margin-top: 36px;
        }
        .chip-red {
          padding: 9px 16px; border-radius: 6px;
          font-size: 0.82rem; font-weight: 500;
          background: #fff0f0; border: 1px solid #fcc; color: #c00;
        }
        .chip-muted {
          padding: 9px 16px; border-radius: 6px;
          font-size: 0.82rem; font-weight: 500;
          background: #f5f5f5; border: 1px solid #e8e8e8; color: #555;
        }
        .chip-burg {
          padding: 9px 16px; border-radius: 6px;
          font-size: 0.82rem; font-weight: 700;
          background: ${BURG}; color: #fff;
        }
        .arr { color: #d0d0d0; font-size: 1rem; }
        .arr-r { color: #fcc; font-size: 1rem; }

        /* Two-col */
        .two-col {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 1px; background: #f0f0f0;
          max-width: 720px; width: 100%; margin-top: 40px;
        }
        .tc {
          background: #fff; padding: 28px 32px; text-align: left;
        }
        .tc-label {
          font-size: 0.6rem; font-weight: 700;
          letter-spacing: 0.16em; text-transform: uppercase;
          color: ${BURG}; margin-bottom: 10px;
        }
        .tc-body {
          font-size: 0.88rem; line-height: 1.7; color: #666;
        }

        /* Three-col */
        .three-col {
          display: grid; grid-template-columns: repeat(3,1fr);
          gap: 1px; background: #f0f0f0;
          max-width: 820px; width: 100%; margin-top: 40px;
        }
        .thc {
          background: #fff; padding: 28px 24px; text-align: left;
        }
        .thc-label {
          font-size: 0.6rem; font-weight: 700;
          letter-spacing: 0.16em; text-transform: uppercase;
          color: ${BURG}; margin-bottom: 10px;
        }
        .thc-body { font-size: 0.85rem; line-height: 1.7; color: #666; }

        /* Mirror */
        .mirror-box {
          max-width: 680px; width: 100%;
          margin-top: 36px; display: grid;
          grid-template-columns: 1fr 1fr; gap: 1px;
          background: #f0f0f0;
        }
        .mb-good { background: #fff; padding: 24px; }
        .mb-bad  { background: #fff8f8; padding: 24px; }
        .mb-label {
          font-size: 0.58rem; font-weight: 700; letter-spacing: 0.16em;
          text-transform: uppercase; margin-bottom: 8px;
        }
        .mb-good .mb-label { color: ${BURG}; }
        .mb-bad  .mb-label { color: #dc2626; }
        .mb-name { font-size: 1rem; font-weight: 700; margin-bottom: 4px; color: #0f0f0f; }
        .mb-score { font-size: 0.75rem; color: ${BURG}; }
        .mb-burn  { font-size: 0.75rem; color: #dc2626; }
        .burn-banner {
          grid-column: 1/-1; background: #fff0f0;
          border-top: 1px solid #fcc; padding: 12px 24px;
          font-size: 0.72rem; font-weight: 600;
          color: #dc2626; text-align: center;
          letter-spacing: 0.08em; text-transform: uppercase;
        }

        /* CDI big */
        .cdi-letter {
          font-size: clamp(9rem, 24vw, 18rem);
          font-weight: 900; line-height: 1; letter-spacing: -8px;
          color: ${BURG}; margin-bottom: 0;
        }

        /* Stamp */
        .stamp {
          position: absolute; top: 30px; right: -72px;
          transform: rotate(45deg);
          font-size: 0.56rem; letter-spacing: 0.18em;
          text-transform: uppercase;
          border: 1px solid #e8e8e8; padding: 4px 56px;
          background: #fff; color: #ccc; white-space: nowrap; z-index: 2;
        }

        /* Quote */
        .quote {
          font-size: clamp(1.1rem, 2.2vw, 1.6rem);
          font-weight: 500; font-style: italic;
          color: rgba(255,255,255,0.7);
          max-width: 580px; text-align: center;
          line-height: 1.55; margin-top: 24px;
        }

        /* Closing */
        .closing {
          font-size: clamp(2.5rem, 6vw, 5.5rem);
          font-weight: 800; line-height: 1.05;
          letter-spacing: -3px; text-align: center;
        }

        /* CTA */
        .ctas { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 44px; }
        .cta-primary {
          background: #0a0a0a; color: #fff;
          padding: 14px 32px; font-size: 0.8rem; font-weight: 600;
          text-decoration: none; letter-spacing: 0.04em;
          border-radius: 6px;
        }
        .cta-ghost {
          background: transparent; border: 1px solid #e0e0e0;
          color: #888; padding: 14px 32px; font-size: 0.8rem;
          text-decoration: none; letter-spacing: 0.04em; border-radius: 6px;
        }

        /* Patent pill */
        .pat-pill {
          display: inline-flex; align-items: center; gap: 8px;
          border: 1px solid #e8e8e8; border-radius: 100px;
          padding: 4px 14px; font-size: 0.6rem; font-weight: 600;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: #bbb; margin-top: 12px; margin-bottom: 4px;
        }
        .pat-dot { width: 5px; height: 5px; border-radius: 50%; background: ${BURG}; }

        @media (max-width: 640px) {
          .topbar { padding: 0 20px; }
          .slide { padding: 52px 6vw 32px; }
          .two-col, .three-col, .mirror-box { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Top bar */}
      <div className="topbar">
        <div className="topbar-logo">Briarwood</div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div className="topbar-nav">
            {Array.from({ length: SLIDES }, (_, i) => (
              <button
                key={i}
                className={`dot${current === i + 1 ? " active" : ""}`}
                onClick={() => go(i + 1)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
          <div className="topbar-count">{String(current).padStart(2, "0")} / {String(SLIDES).padStart(2, "0")}</div>
        </div>
      </div>

      <div className="deck" ref={containerRef}>

        {/* 01 — Hero */}
        <div className="slide slide-white" data-slide="1">
          <div className="kicker">dateinquiry.com</div>
          <div className="title-xl">BRIARWOOD</div>
          <div className="desc">The Infrastructure of Integrity.</div>
          <div className="pat-pill">
            <div className="pat-dot" />
            CDI: Choreography Depth Index™ — Patent Pending
          </div>
        </div>

        {/* 02 — Trust Tax */}
        <div className="slide slide-dark" data-slide="2">
          <div className="kicker-w">The Trust Tax</div>
          <div className="title-metric" style={{ color: "#fff" }}>64%</div>
          <div style={{ fontSize: "clamp(1.1rem,2vw,1.5rem)", fontWeight: 700, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>
            Execution Capacity Lost
          </div>
          <div className="desc-w">
            The measurable cost of uncomputable human variables in the $8 trillion physical economy.
          </div>
          <div className="eyeline">* 28 years · 900+ high-stakes coordination events</div>
        </div>

        {/* 03 — Chaos Wall */}
        <div className="slide slide-near" data-slide="3">
          <div className="kicker">The Problem</div>
          <div className="title">The Manual Friction Loop.</div>
          <div className="flow">
            <div className="chip-red">Identify Node</div><span className="arr-r">→</span>
            <div className="chip-red">Verify</div><span className="arr-r">→</span>
            <div className="chip-red">Search</div><span className="arr-r">→</span>
            <div className="chip-red">Handshake</div><span className="arr-r">→</span>
            <div className="chip-red">Underwrite</div><span className="arr-r">→</span>
            <div className="chip-red">Manage Chaos</div><span className="arr-r">→</span>
            <div className="chip-burg">Execute</div>
          </div>
          <div className="desc">
            Software runs on math. The physical world runs on variables. This is the Invisible Labor stalling every autonomous network.
          </div>
        </div>

        {/* 04 — Latency Gap */}
        <div className="slide slide-white" data-slide="4">
          <div className="kicker">The Latency Gap</div>
          <div className="title">90 Days vs. Second Zero.</div>
          <div className="two-col">
            <div className="tc">
              <div className="tc-label">The Flaw</div>
              <div className="tc-body">30/60/90-day lag is a gift to bad actors. It creates an exploitation window for reputation laundering — reset by changing a name or filing a new LLC.</div>
            </div>
            <div className="tc">
              <div className="tc-label">The Shift</div>
              <div className="tc-body">Trust must be an Instant Behavioral Primitive. Available at second zero — not retrieved from a trailing audit.</div>
            </div>
          </div>
        </div>

        {/* 05 — Identity Anchor */}
        <div className="slide slide-near" data-slide="5">
          <div className="kicker">The Identity Anchor</div>
          <div className="title">The SSN for Execution.</div>
          <div className="desc">You cannot reset integrity by changing a name or forming a new LLC.</div>
          <div className="two-col" style={{ gridTemplateColumns: "1fr 1fr 1fr", maxWidth: 820 }}>
            <div className="tc">
              <div className="tc-label">Anchored</div>
              <div className="tc-body">A CDI Identity follows every agent, operator, and entity across every coordination — permanently.</div>
            </div>
            <div className="tc">
              <div className="tc-label">No Reset</div>
              <div className="tc-body">If an identity has no history, the system sees Unverified Origin — not zero. This triggers the Mirror Protocol.</div>
            </div>
            <div className="tc">
              <div className="tc-label">Immutable</div>
              <div className="tc-body">There is no Delete Profile button for integrity. The anchor persists across all legal structures.</div>
            </div>
          </div>
        </div>

        {/* 06 — CDI */}
        <div className="slide slide-white" data-slide="6" style={{ position: "relative", overflow: "hidden" }}>
          <div className="stamp">US PATENT PENDING // REF: 28-YR GROUND TRUTH</div>
          <div className="kicker">The Patented Solution</div>
          <div className="cdi-letter">CDI</div>
          <div style={{ fontSize: "clamp(0.9rem,1.5vw,1.1rem)", fontWeight: 500, color: "#bbb", letterSpacing: "0.04em", marginBottom: 8 }}>
            Choreography Depth Index™
          </div>
          <div className="pat-pill" style={{ marginBottom: 24 }}>
            <div className="pat-dot" />
            Patent Pending
          </div>
          <div className="three-col">
            {[
              { k: "Choreography", v: "Precise sequence and timing of multi-node execution events." },
              { k: "Depth", v: "High-fidelity behavioral ground truth that pixels cannot reach." },
              { k: "Index", v: "Machine-readable standard for underwriting risk at execution time." },
            ].map((x, i) => (
              <div key={x.k} className="thc" style={{ borderLeft: i > 0 ? "1px solid #f0f0f0" : "none" }}>
                <div className="thc-label">{x.k}</div>
                <div className="thc-body">{x.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 07 — Mirror Protocol */}
        <div className="slide slide-near" data-slide="7">
          <div className="kicker">The Mirror Protocol</div>
          <div className="title">Recursive Associative Trust.</div>
          <div className="desc">Trust is a network effect. You are the company you keep.</div>
          <div className="mirror-box">
            <div className="mb-good">
              <div className="mb-label">Master Agent</div>
              <div className="mb-name">Principal Node</div>
              <div className="mb-score">CDI 91 — vouches for sub-agent</div>
            </div>
            <div className="mb-bad">
              <div className="mb-label">Sub-Agent</div>
              <div className="mb-name">Referred Node</div>
              <div className="mb-burn">Breaks coordination → Burn reflects instantly</div>
            </div>
            <div className="burn-banner">
              ⇄ Burn propagates back to Master Agent at second zero
            </div>
          </div>
          <div className="desc" style={{ marginTop: 20 }}>
            High-fidelity operators refuse to align with bad actors because the CDI Burn is too expensive. The system self-cleans.
          </div>
        </div>

        {/* 08 — Neutral Arbiter */}
        <div className="slide slide-burg" data-slide="8">
          <div className="kicker-w">The Moat</div>
          <div className="title" style={{ color: "#fff" }}>Independence is the Moat.</div>
          <div className="quote">
            "You don't let the student grade their own paper. You don't have the bank write its own credit report."
          </div>
          <div className="desc-w" style={{ marginTop: 32 }}>
            Agent companies cannot underwrite their own risk. Briarwood is the Independent Standard — and it cannot be replicated by any player with skin in the game.
          </div>
        </div>

        {/* 09 — Why Now */}
        <div className="slide slide-white" data-slide="9">
          <div className="kicker">Why Now</div>
          <div className="title">Computing the Uncomputable.</div>
          <div className="two-col">
            <div className="tc">
              <div className="tc-label">The Screen Limit</div>
              <div className="tc-body">AI agents have reached the boundary of what can be done in pixels. Entering the physical world requires an Action-Conditioned Ledger.</div>
            </div>
            <div className="tc">
              <div className="tc-label">The Bridge</div>
              <div className="tc-body">We provide the Choreography — behavioral truth — that LLMs and Video Models cannot learn from pixels alone. It must be lived, captured, and indexed.</div>
            </div>
          </div>
        </div>

        {/* 10 — Execution Integrity */}
        <div className="slide slide-near" data-slide="10">
          <div className="kicker">With Briarwood</div>
          <div className="title">Execution Integrity.</div>
          <div className="flow" style={{ marginTop: 36 }}>
            <div className="chip-muted">Identify Node</div>
            <span className="arr">→</span>
            <div className="chip-burg">Execute</div>
          </div>
          <div className="desc">
            We remove the Trust Tax. By digitizing the handshake, physical networks move at the speed of software.
          </div>
          <div className="ctas">
            <a href="mailto:violet@briarwood.ai" className="cta-primary">Request a Demo</a>
            <a href="/demo-landing" className="cta-ghost">Full Overview →</a>
          </div>
        </div>

        {/* 11 — Philosophy */}
        <div className="slide slide-dark" data-slide="11">
          <div className="kicker-w">The Philosophy</div>
          <div className="closing" style={{ color: "#fff" }}>
            Privacy Stays.<br />
            <span style={{ color: BURG }}>Reputation Runs.</span><br />
            Trust Wins.
          </div>
          <div className="desc-w" style={{ marginTop: 28 }}>
            The Human Defense Layer for the High-Stakes Economy.
          </div>
          <div style={{ marginTop: 56, fontSize: "0.6rem", letterSpacing: "0.18em", opacity: 0.2, color: "#fff", textTransform: "uppercase" }}>
            Briarwood · Founder Led · CDI™ Patent Pending · 2026
          </div>
        </div>

      </div>
    </>
  );
}
