export default function Pitch() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", margin: 0 }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600&display=swap');

        * { box-sizing: border-box; }

        .slide {
          min-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 80px 48px;
          position: relative;
          overflow: hidden;
        }

        .slide-cream {
          background: #f5f3ef;
          color: #1a1a1a;
        }
        .slide-surface {
          background: #edeae4;
          color: #1a1a1a;
        }
        .slide-oxblood {
          background: #3d1a22;
          color: #f5f3ef;
        }
        .slide-deep {
          background: #2a1018;
          color: #f5f3ef;
        }
        .slide-mid {
          background: #4f2030;
          color: #f5f3ef;
        }

        .pinstripe {
          position: absolute;
          inset: 0;
          background-image: url('/pinstripe.jpeg');
          background-repeat: repeat;
          background-size: 400px;
          opacity: 0.18;
          pointer-events: none;
        }

        .content {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .eyebrow {
          font-size: 0.65rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          opacity: 0.4;
          margin-bottom: 20px;
        }

        .headline {
          font-family: 'Fraunces', serif;
          font-size: clamp(2.8rem, 7vw, 6rem);
          font-weight: 700;
          letter-spacing: -2px;
          line-height: 1.0;
          margin-bottom: 20px;
        }

        .headline-lg {
          font-family: 'Fraunces', serif;
          font-size: clamp(4rem, 10vw, 9rem);
          font-weight: 700;
          letter-spacing: -4px;
          line-height: 1.0;
          margin-bottom: 16px;
        }

        .metric-num {
          font-family: 'Fraunces', serif;
          font-size: clamp(8rem, 22vw, 18rem);
          font-weight: 700;
          line-height: 1;
          letter-spacing: -8px;
        }

        .subhead {
          font-size: clamp(1rem, 2vw, 1.4rem);
          line-height: 1.55;
          max-width: 600px;
          opacity: 0.6;
          font-weight: 400;
        }

        .body-text {
          font-size: clamp(0.88rem, 1.4vw, 1.05rem);
          line-height: 1.7;
          max-width: 580px;
          opacity: 0.55;
        }

        .footnote {
          font-size: 0.68rem;
          line-height: 1.7;
          max-width: 500px;
          opacity: 0.25;
          margin-top: 24px;
        }

        .divider {
          width: 40px;
          height: 1px;
          background: currentColor;
          opacity: 0.2;
          margin: 24px auto;
        }

        .flow-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 36px;
          max-width: 1000px;
        }

        .flow-node {
          padding: 10px 18px;
          border-radius: 2px;
          font-size: clamp(0.75rem, 1.2vw, 0.9rem);
          font-weight: 500;
          white-space: nowrap;
          letter-spacing: 0.02em;
        }

        .node-friction {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #fca5a5;
        }

        .node-clean {
          background: rgba(245, 243, 239, 0.1);
          border: 1px solid rgba(245, 243, 239, 0.3);
          color: #f5f3ef;
        }

        .node-goal {
          background: rgba(180, 155, 110, 0.15);
          border: 1px solid rgba(180, 155, 110, 0.5);
          color: #d4b896;
        }

        .node-friction-light {
          background: rgba(185, 28, 28, 0.08);
          border: 1px solid rgba(185, 28, 28, 0.25);
          color: #dc2626;
        }

        .node-goal-light {
          background: rgba(101, 78, 37, 0.1);
          border: 1px solid rgba(101, 78, 37, 0.3);
          color: #92681a;
        }

        .arr { opacity: 0.3; font-size: 1rem; }
        .arr-red { color: #ef4444; opacity: 0.5; font-size: 1rem; }
        .arr-gold { color: #a08650; opacity: 0.6; font-size: 1rem; }

        .logic-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
          max-width: 820px;
          width: 100%;
          margin-top: 40px;
        }

        .logic-cell {
          padding: 28px 24px;
          text-align: left;
        }

        .logic-key {
          font-size: 0.65rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #b49b78;
          margin-bottom: 12px;
          font-weight: 600;
        }

        .logic-val {
          font-size: 0.85rem;
          line-height: 1.65;
          opacity: 0.55;
        }

        .patent-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(245, 243, 239, 0.12);
          padding: 5px 14px 5px 14px;
          font-size: 0.62rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(245, 243, 239, 0.3);
          margin-top: 12px;
          margin-bottom: 28px;
        }

        .patent-badge-light {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(61, 26, 34, 0.15);
          padding: 5px 14px;
          font-size: 0.62rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(61, 26, 34, 0.3);
          margin-top: 10px;
          margin-bottom: 24px;
        }

        .shift-stack {
          width: 100%;
          max-width: 620px;
          margin-top: 36px;
        }

        .shift-row {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          padding: 18px 0;
          border-top: 1px solid rgba(245, 243, 239, 0.08);
          text-align: left;
        }

        .shift-row-light {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          padding: 18px 0;
          border-top: 1px solid rgba(61, 26, 34, 0.1);
          text-align: left;
        }

        .shift-label {
          font-size: 0.6rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #b49b78;
          min-width: 90px;
          padding-top: 3px;
          font-weight: 600;
        }

        .shift-label-ox {
          font-size: 0.6rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #8b5e3c;
          min-width: 90px;
          padding-top: 3px;
          font-weight: 600;
        }

        .shift-body {
          font-size: 0.88rem;
          line-height: 1.65;
          opacity: 0.5;
        }

        .cta-row {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 48px;
        }

        .btn-primary {
          background: #f5f3ef;
          color: #1a1a1a;
          padding: 14px 32px;
          font-size: 0.8rem;
          font-weight: 600;
          text-decoration: none;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          border: none;
        }

        .btn-secondary {
          background: transparent;
          border: 1px solid rgba(245, 243, 239, 0.2);
          color: rgba(245, 243, 239, 0.4);
          padding: 14px 32px;
          font-size: 0.8rem;
          text-decoration: none;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .slide-num {
          position: absolute;
          bottom: 24px;
          right: 36px;
          font-size: 0.6rem;
          letter-spacing: 0.14em;
          opacity: 0.15;
        }

        .footer-fixed {
          position: fixed;
          bottom: 20px;
          left: 32px;
          font-size: 0.6rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #3d1a22;
          opacity: 0.2;
          z-index: 100;
          font-family: 'Fraunces', serif;
        }

        .closing-headline {
          font-family: 'Fraunces', serif;
          font-size: clamp(2.5rem, 6vw, 5rem);
          font-weight: 700;
          line-height: 1.1;
          letter-spacing: -2px;
          max-width: 14ch;
        }
      `}</style>

      {/* 01 — Hero */}
      <div className="slide slide-cream">
        <div className="content">
          <div className="eyebrow">Briarwood / dateinquiry.com</div>
          <div className="headline-lg">BRIARWOOD</div>
          <div className="subhead">The Trust Layer for the Physical Economy.</div>
          <div className="patent-badge-light">
            CDI: Choreography Depth Index™
            <span style={{ borderLeft: "1px solid rgba(61,26,34,0.15)", paddingLeft: 10 }}>Patent Pending</span>
          </div>
        </div>
        <div className="slide-num">01 / 09</div>
      </div>

      {/* 02 — Trust Tax */}
      <div className="slide slide-oxblood">
        <div className="pinstripe" />
        <div className="content">
          <div className="eyebrow">The Trust Tax</div>
          <div className="metric-num">64%</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(1.2rem, 2.5vw, 1.8rem)", opacity: 0.5, marginBottom: 16 }}>
            Execution Capacity Lost.
          </div>
          <div className="divider" />
          <div className="body-text">
            This is the cost of trying to coordinate physical reality without a behavioral primitive.
          </div>
          <div className="footnote">
            Derived from 28 years and 900+ high-stakes physical economy events. Includes manual identity verification, history search, liability management, and coordination overhead per execution node.
          </div>
        </div>
        <div className="slide-num">02 / 09</div>
      </div>

      {/* 03 — The Chaos Wall */}
      <div className="slide slide-surface">
        <div className="content">
          <div className="eyebrow">The Problem</div>
          <div className="headline">The Chaos Wall.</div>
          <div className="flow-row">
            <div className="flow-node node-friction-light">Identify Node</div>
            <span className="arr-red">→</span>
            <div className="flow-node node-friction-light">Verify</div>
            <span className="arr-red">→</span>
            <div className="flow-node node-friction-light">Search</div>
            <span className="arr-red">→</span>
            <div className="flow-node node-friction-light">Handshake</div>
            <span className="arr-red">→</span>
            <div className="flow-node node-friction-light">Underwrite</div>
            <span className="arr-red">→</span>
            <div className="flow-node node-friction-light">Manage Chaos</div>
            <span className="arr-red">→</span>
            <div className="flow-node node-goal-light">Execute</div>
          </div>
          <div className="body-text" style={{ marginTop: 28 }}>
            Software runs on math. The physical world runs on variables. This 6-step loop is Invisible Labor that prevents autonomous networks from scaling.
          </div>
        </div>
        <div className="slide-num">03 / 09</div>
      </div>

      {/* 04 — System Failure */}
      <div className="slide slide-deep">
        <div className="pinstripe" />
        <div className="content">
          <div className="eyebrow">The System Failure</div>
          <div className="headline">90 Days vs. Second Zero.</div>
          <div className="subhead" style={{ marginBottom: 8 }}>
            Traditional credit scores rely on a 30/60/90-day lag. In the high-stakes physical economy, latency is a failure.
          </div>
          <div className="shift-stack">
            <div className="shift-row">
              <span className="shift-label">The Problem</span>
              <span className="shift-body">Trust cannot be a trailing historical record. Every second of latency is a lost execution window — a job misrouted, a handoff dropped, a network stalled.</span>
            </div>
            <div className="shift-row">
              <span className="shift-label">The Shift</span>
              <span className="shift-body">Trust must be an Instant Behavioral Primitive. Machine-readable at the moment of decision. Not retrieved from a 90-day audit. Available at second zero.</span>
            </div>
          </div>
        </div>
        <div className="slide-num">04 / 09</div>
      </div>

      {/* 05 — CDI */}
      <div className="slide" style={{ background: "#2a1018", color: "#f5f3ef", padding: "80px 60px", position: "relative", overflow: "hidden" }}>
        <div className="pinstripe" />

        <div style={{
          position: "absolute", top: 36, right: -72, transform: "rotate(45deg)",
          fontFamily: "'Courier New', monospace", fontSize: "0.62rem", color: "#5a2833",
          letterSpacing: "2px", border: "1px solid #3d1a22", padding: "5px 48px",
          background: "#2a1018", whiteSpace: "nowrap", zIndex: 2
        }}>
          US PATENT PENDING // REF: 28-YR GROUND TRUTH
        </div>

        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div className="eyebrow">The Missing Primitive</div>

          <div style={{
            fontFamily: "'Fraunces', serif",
            fontSize: "clamp(7rem, 18vw, 14rem)",
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-6px",
            background: "linear-gradient(180deg, #f5f3ef 0%, #6b3040 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: 8,
          }}>
            CDI
          </div>

          <div style={{ fontSize: "clamp(0.9rem, 1.8vw, 1.3rem)", color: "rgba(245,243,239,0.45)", letterSpacing: "0.06em", marginBottom: 48 }}>
            Choreography Depth Index™
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0, width: "100%", borderTop: "1px solid rgba(245,243,239,0.08)" }}>
            {[
              { key: "Choreography", val: "Captures the sequence, timing, and multi-node synchronization of high-stakes physical execution." },
              { key: "Depth", val: "Ingests the high-fidelity behavioral ground truth that pixels, words, and video cannot reach." },
              { key: "Index", val: "A machine-readable standard for autonomous agent deployment in the physical economy." },
            ].map((item, i) => (
              <div key={item.key} style={{
                padding: "28px 24px",
                textAlign: "left",
                borderLeft: i > 0 ? "1px solid rgba(245,243,239,0.06)" : "none",
              }}>
                <div style={{ fontSize: "0.62rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#b49b78", marginBottom: 12, fontWeight: 600 }}>
                  {item.key}
                </div>
                <div style={{ fontSize: "0.85rem", lineHeight: 1.65, color: "rgba(245,243,239,0.4)" }}>
                  {item.val}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          position: "absolute", bottom: 24, left: 0, right: 0, textAlign: "center",
          fontSize: "0.6rem", letterSpacing: "0.24em", color: "#4a1e28", textTransform: "uppercase"
        }}>
          BRIARWOOD // THE INDEPENDENT STANDARD
        </div>

        <div className="slide-num">05 / 09</div>
      </div>

      {/* 06 — Neutral Arbiter */}
      <div className="slide slide-cream">
        <div className="content">
          <div className="eyebrow">The Moat</div>
          <div className="headline">Independence is the Moat.</div>
          <div className="divider" />
          <div className="subhead" style={{ fontStyle: "italic", opacity: 0.5 }}>
            "You don't let the student grade their own paper. You don't have the bank write its own credit report."
          </div>
          <div className="shift-stack">
            <div className="shift-row-light">
              <span className="shift-label-ox">The Barrier</span>
              <span className="shift-body" style={{ opacity: 0.5 }}>Agent companies cannot build their own trust layer. The conflict of interest disqualifies them. Briarwood is the Independent Standard the industry answers to.</span>
            </div>
          </div>
        </div>
        <div className="slide-num">06 / 09</div>
      </div>

      {/* 07 — Why Now */}
      <div className="slide slide-mid">
        <div className="pinstripe" />
        <div className="content">
          <div className="eyebrow">Why Now</div>
          <div className="headline">Computing the Uncomputable.</div>
          <div className="subhead">
            AI agents have hit the screen limit. To move into the physical world, they need an Action-Conditioned Ledger.
          </div>
          <div className="shift-stack">
            <div className="shift-row">
              <span className="shift-label">The Bridge</span>
              <span className="shift-body">We provide the Choreography — behavioral truth — that LLMs and Video Models cannot learn from pixels alone. Real-world execution requires a primitive that was never captured. Until now.</span>
            </div>
          </div>
        </div>
        <div className="slide-num">07 / 09</div>
      </div>

      {/* 08 — With Briarwood */}
      <div className="slide slide-surface">
        <div className="content">
          <div className="eyebrow">With Briarwood</div>
          <div className="headline">The Goal.</div>
          <div className="flow-row">
            <div className="flow-node node-goal-light">Identify Node</div>
            <span className="arr-gold">→</span>
            <div className="flow-node" style={{ background: "rgba(61,26,34,0.1)", border: "1px solid rgba(61,26,34,0.3)", color: "#3d1a22", fontWeight: 600 }}>Execute</div>
          </div>
          <div className="body-text" style={{ marginTop: 28 }}>
            By digitizing high-stakes choreography, we remove the Trust Tax and let networks move at the speed of software.
          </div>
          <div className="cta-row">
            <a href="mailto:violet@briarwood.ai" className="btn-primary" style={{ background: "#3d1a22", color: "#f5f3ef" }}>
              Request a Demo
            </a>
            <a href="/demo-landing" className="btn-secondary" style={{ borderColor: "rgba(61,26,34,0.2)", color: "rgba(61,26,34,0.4)" }}>
              Full Overview
            </a>
          </div>
        </div>
        <div className="slide-num">08 / 09</div>
      </div>

      {/* 09 — Philosophy */}
      <div className="slide slide-oxblood">
        <div className="pinstripe" />
        <div className="content">
          <div className="eyebrow">The Philosophy</div>
          <div className="closing-headline">
            Privacy Stays.<br />Reputation Runs.<br />Trust Wins.
          </div>
          <div className="divider" />
          <div className="body-text">The human defense layer for the physical economy.</div>
          <div style={{ marginTop: 64, fontSize: "0.6rem", letterSpacing: "0.2em", opacity: 0.2, textTransform: "uppercase" }}>
            Briarwood // Founder Led // CDI™ Patent Pending // 2026
          </div>
        </div>
        <div className="slide-num">09 / 09</div>
      </div>

      <div className="footer-fixed">Briarwood</div>

    </div>
  );
}
