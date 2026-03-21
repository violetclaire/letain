export default function Pitch() {
  return (
    <div style={{ background: "#0b0b0b", color: "#fff", fontFamily: "'Helvetica Neue', Arial, sans-serif", margin: 0 }}>

      <style>{`
        .slide {
          height: 100vh;
          width: 100vw;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 60px 40px;
          box-sizing: border-box;
          border-bottom: 1px solid #181818;
          position: relative;
        }
        .hero-text {
          font-size: clamp(3.5rem, 10vw, 7rem);
          font-weight: 800;
          letter-spacing: -4px;
          margin-bottom: 20px;
          line-height: 1;
        }
        .sub-hero {
          font-size: clamp(1rem, 2.2vw, 1.6rem);
          color: #666;
          max-width: 680px;
          line-height: 1.45;
        }
        .metric {
          font-size: clamp(7rem, 20vw, 16rem);
          font-weight: 800;
          color: #fff;
          line-height: 1;
          letter-spacing: -8px;
        }
        .metric-label {
          font-size: clamp(1.2rem, 3vw, 2.2rem);
          color: #555;
          margin-top: 8px;
          letter-spacing: -0.5px;
          font-weight: 600;
        }
        .slide-headline {
          font-size: clamp(2rem, 5vw, 4rem);
          font-weight: 700;
          letter-spacing: -2px;
          margin-bottom: 20px;
          line-height: 1.05;
        }
        .dream-text {
          font-family: 'Courier New', Courier, monospace;
          font-size: clamp(2.5rem, 6vw, 5rem);
          color: #00ff41;
          letter-spacing: -1px;
        }
        .flow-container {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 36px;
          flex-wrap: wrap;
          justify-content: center;
          max-width: 1100px;
        }
        .flow-box {
          border: 1px solid #2a2a2a;
          padding: 12px 20px;
          border-radius: 3px;
          color: #555;
          font-size: clamp(0.78rem, 1.3vw, 1rem);
          white-space: nowrap;
        }
        .flow-box.friction {
          border-color: #7f1d1d;
          color: #ef4444;
          background: rgba(239, 68, 68, 0.05);
        }
        .flow-box.clean {
          border-color: #14532d;
          color: #4ade80;
          background: rgba(74, 222, 128, 0.05);
        }
        .flow-box.active {
          border-color: #00ff41;
          color: #fff;
          background: rgba(0, 255, 65, 0.08);
        }
        .arrow { color: #2a2a2a; font-size: 1.2rem; }
        .arrow.red { color: #7f1d1d; }
        .arrow.green { color: #14532d; }
        .label-sm {
          font-size: 0.7rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #333;
          margin-bottom: 20px;
        }
        .footnote {
          font-size: 0.68rem;
          color: #2a2a2a;
          max-width: 520px;
          line-height: 1.7;
          margin-top: 28px;
        }
        .caption {
          font-size: 0.8rem;
          color: #333;
          max-width: 600px;
          line-height: 1.65;
          margin-top: 28px;
        }
        .cdi-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #2a2a2a;
          padding: 6px 14px;
          border-radius: 2px;
          font-size: 0.7rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #444;
          margin-top: 12px;
        }
        .cdi-pill .patent {
          color: #2a2a2a;
          font-size: 0.6rem;
          letter-spacing: 0.08em;
          border-left: 1px solid #222;
          padding-left: 8px;
        }
        .logic-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          max-width: 860px;
          width: 100%;
          margin-top: 40px;
          text-align: left;
        }
        .logic-block {
          border-top: 1px solid #1e1e1e;
          padding-top: 20px;
        }
        .logic-key {
          font-size: 0.68rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #00ff41;
          margin-bottom: 10px;
        }
        .logic-val {
          font-size: 0.85rem;
          color: #444;
          line-height: 1.6;
        }
        .footer-fixed {
          position: fixed;
          bottom: 22px;
          left: 36px;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.16em;
          color: #1e1e1e;
          z-index: 100;
          text-transform: uppercase;
        }
        .slide-number {
          position: absolute;
          bottom: 28px;
          right: 36px;
          font-size: 0.65rem;
          color: #1e1e1e;
          letter-spacing: 0.12em;
        }
        .pull-quote {
          font-size: clamp(1.1rem, 2.5vw, 1.8rem);
          color: #888;
          max-width: 640px;
          line-height: 1.5;
          font-style: italic;
          margin-top: 20px;
        }
        .shift-row {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          max-width: 700px;
          text-align: left;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #1a1a1a;
        }
        .shift-label {
          font-size: 0.68rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #00ff41;
          white-space: nowrap;
          padding-top: 2px;
          min-width: 80px;
        }
        .shift-body {
          font-size: 0.9rem;
          color: #555;
          line-height: 1.6;
        }
      `}</style>

      {/* Slide 1: Hero */}
      <div className="slide">
        <div className="label-sm">Briarwood / dateinquiry.com</div>
        <div className="hero-text">BRIARWOOD</div>
        <div className="sub-hero">The Trust Layer for the Physical Economy.</div>
        <div className="cdi-pill">
          CDI: Choreography Depth Index™
          <span className="patent">Patent Pending</span>
        </div>
        <div className="slide-number">01 / 09</div>
      </div>

      {/* Slide 2: Trust Tax */}
      <div className="slide">
        <div className="label-sm">The Trust Tax</div>
        <div className="metric">64%</div>
        <div className="metric-label">Execution Capacity Lost.</div>
        <div className="sub-hero" style={{ marginTop: 20 }}>
          This is the cost of trying to coordinate physical reality without a behavioral primitive.
        </div>
        <div className="footnote">
          Derived from 28 years and 900+ high-stakes physical economy events. Includes manual identity verification, history search, liability management, and coordination overhead per execution node.
        </div>
        <div className="slide-number">02 / 09</div>
      </div>

      {/* Slide 3: The Chaos Wall */}
      <div className="slide">
        <div className="label-sm">The Problem</div>
        <div className="slide-headline">The Chaos Wall.</div>
        <div className="flow-container">
          <div className="flow-box friction">Identify Node</div>
          <div className="arrow red">→</div>
          <div className="flow-box friction">Verify</div>
          <div className="arrow red">→</div>
          <div className="flow-box friction">Search</div>
          <div className="arrow red">→</div>
          <div className="flow-box friction">Handshake</div>
          <div className="arrow red">→</div>
          <div className="flow-box friction">Underwrite</div>
          <div className="arrow red">→</div>
          <div className="flow-box friction">Manage Chaos</div>
          <div className="arrow red">→</div>
          <div className="flow-box active">Execute</div>
        </div>
        <div className="caption">
          Software runs on math. The physical world runs on variables. This 6-step loop is "Invisible Labor" that prevents autonomous networks from scaling.
        </div>
        <div className="slide-number">03 / 09</div>
      </div>

      {/* Slide 4: System Failure */}
      <div className="slide">
        <div className="label-sm">The System Failure</div>
        <div className="slide-headline">90 Days vs. Second Zero.</div>
        <div className="sub-hero" style={{ marginTop: 8 }}>
          Traditional credit scores rely on a 30/60/90-day lag. In the high-stakes physical economy, latency is a failure.
        </div>
        <div style={{ maxWidth: 640, width: "100%", marginTop: 40 }}>
          <div className="shift-row">
            <span className="shift-label">The Problem</span>
            <span className="shift-body">Trust cannot be a trailing historical record. Every second of latency is a lost execution window — a job misrouted, a handoff dropped, a network stalled.</span>
          </div>
          <div className="shift-row">
            <span className="shift-label">The Shift</span>
            <span className="shift-body">Trust must be an Instant Behavioral Primitive. Machine-readable at the moment of decision. Not retrieved from a 90-day audit. Available at second zero.</span>
          </div>
        </div>
        <div className="slide-number">04 / 09</div>
      </div>

      {/* Slide 5: The Patented Primitive */}
      <div className="slide">
        <div className="label-sm">The Patented Primitive</div>
        <div className="slide-headline" style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)" }}>CDI — Choreography Depth Index™</div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid #1e1e1e", padding: "5px 12px", marginBottom: 32, marginTop: 4 }}>
          <span style={{ fontSize: "0.65rem", letterSpacing: "0.14em", color: "#333", textTransform: "uppercase" }}>Patent Pending</span>
        </div>
        <div className="sub-hero" style={{ marginBottom: 8 }}>The Missing Primitive for Real-World Execution.</div>
        <div className="logic-grid">
          <div className="logic-block">
            <div className="logic-key">Choreography</div>
            <div className="logic-val">Captures the sequence, timing, and multi-node synchronization of high-stakes tasks.</div>
          </div>
          <div className="logic-block">
            <div className="logic-key">Depth</div>
            <div className="logic-val">Ingests the high-fidelity behavioral ground truth that pixels and words cannot reach.</div>
          </div>
          <div className="logic-block">
            <div className="logic-key">Index</div>
            <div className="logic-val">A machine-readable standard for autonomous agent deployment in the physical economy.</div>
          </div>
        </div>
        <div className="slide-number">05 / 09</div>
      </div>

      {/* Slide 6: Neutral Arbiter */}
      <div className="slide">
        <div className="label-sm">The Moat</div>
        <div className="slide-headline">Independence is the Moat.</div>
        <div className="pull-quote">
          "You don't let the student grade their own paper. You don't have the bank write its own credit report."
        </div>
        <div style={{ maxWidth: 620, width: "100%", marginTop: 40 }}>
          <div className="shift-row">
            <span className="shift-label">The Barrier</span>
            <span className="shift-body">Agent companies cannot build their own trust layer. The conflict of interest disqualifies them. Briarwood is the Independent Standard the industry answers to.</span>
          </div>
        </div>
        <div className="slide-number">06 / 09</div>
      </div>

      {/* Slide 7: Why Now */}
      <div className="slide">
        <div className="label-sm">Why Now</div>
        <div className="slide-headline">Computing the Uncomputable.</div>
        <div className="sub-hero" style={{ marginTop: 8 }}>
          AI agents have hit the screen limit. To move into the physical world, they need an Action-Conditioned Ledger.
        </div>
        <div style={{ maxWidth: 640, width: "100%", marginTop: 40 }}>
          <div className="shift-row">
            <span className="shift-label">The Bridge</span>
            <span className="shift-body">We provide the Choreography — behavioral truth — that LLMs and Video Models cannot learn from pixels alone. Real-world execution requires a primitive that was never captured. Until now.</span>
          </div>
        </div>
        <div className="slide-number">07 / 09</div>
      </div>

      {/* Slide 8: With Briarwood */}
      <div className="slide">
        <div className="label-sm">With Briarwood</div>
        <div className="slide-headline" style={{ marginBottom: 12 }}>The Goal.</div>
        <div className="flow-container">
          <div className="flow-box clean">Identify Node</div>
          <div className="arrow green">→</div>
          <div className="flow-box active">Execute</div>
        </div>
        <div className="caption">
          By digitizing high-stakes choreography, we remove the Trust Tax and let networks move at the speed of software.
        </div>
        <div style={{ marginTop: 48, display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
          <a
            href="mailto:violet@briarwood.ai"
            style={{ background: "#fff", color: "#0b0b0b", padding: "14px 32px", fontSize: "0.85rem", fontWeight: 700, textDecoration: "none", letterSpacing: "0.06em", textTransform: "uppercase" }}
          >
            Request a Demo
          </a>
          <a
            href="/demo-landing"
            style={{ border: "1px solid #222", color: "#555", padding: "14px 32px", fontSize: "0.85rem", textDecoration: "none", letterSpacing: "0.06em", textTransform: "uppercase" }}
          >
            Full Overview
          </a>
        </div>
        <div className="slide-number">08 / 09</div>
      </div>

      {/* Slide 9: Philosophy */}
      <div className="slide">
        <div className="label-sm">The Philosophy</div>
        <div className="slide-headline" style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", maxWidth: 700 }}>
          Privacy Stays.<br />Reputation Runs.<br />Trust Wins.
        </div>
        <div className="sub-hero" style={{ marginTop: 24 }}>
          The human defense layer for the physical economy.
        </div>
        <div style={{ marginTop: 64, fontSize: "0.68rem", letterSpacing: "0.18em", color: "#222", textTransform: "uppercase" }}>
          Briarwood // Founder Led // CDI: Choreography Depth Index™ (Patent Pending) // 2026
        </div>
        <div className="slide-number">09 / 09</div>
      </div>

      <div className="footer-fixed">Briarwood</div>

    </div>
  );
}
