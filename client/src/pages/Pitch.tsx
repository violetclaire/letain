export default function Pitch() {
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", margin: 0 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

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
        .cream  { background: #f5f3ef; color: #1a1a1a; }
        .surface{ background: #edeae4; color: #1a1a1a; }
        .oxblood{ background: #3d1a22; color: #f5f3ef; }
        .deep   { background: #2a1018; color: #f5f3ef; }
        .mid    { background: #4f2030; color: #f5f3ef; }

        .pinstripe {
          position: absolute; inset: 0;
          background-image: url('/pinstripe.jpeg');
          background-repeat: repeat; background-size: 400px;
          opacity: 0.15; pointer-events: none;
        }

        .content {
          position: relative; z-index: 1;
          width: 100%; max-width: 900px;
          margin: 0 auto;
          display: flex; flex-direction: column; align-items: center;
        }

        .eyebrow {
          font-size: 0.62rem; letter-spacing: 0.22em;
          text-transform: uppercase; opacity: 0.35; margin-bottom: 18px;
        }
        .hl {
          font-family: 'Fraunces', serif;
          font-size: clamp(2.4rem, 5.5vw, 4.8rem);
          font-weight: 700; letter-spacing: -2px; line-height: 1.02;
          margin-bottom: 20px;
        }
        .hl-xl {
          font-family: 'Fraunces', serif;
          font-size: clamp(4rem, 10vw, 9rem);
          font-weight: 700; letter-spacing: -4px; line-height: 1;
          margin-bottom: 16px;
        }
        .metric {
          font-family: 'Fraunces', serif;
          font-size: clamp(8rem, 22vw, 18rem);
          font-weight: 700; line-height: 1; letter-spacing: -8px;
        }
        .sub {
          font-size: clamp(1rem, 2vw, 1.4rem); line-height: 1.55;
          max-width: 600px; opacity: 0.55;
        }
        .body {
          font-size: clamp(0.86rem, 1.3vw, 1rem); line-height: 1.72;
          max-width: 580px; opacity: 0.5;
        }
        .fn {
          font-size: 0.66rem; line-height: 1.7;
          max-width: 500px; opacity: 0.22; margin-top: 22px;
        }
        .rule {
          width: 36px; height: 1px; background: currentColor;
          opacity: 0.18; margin: 22px auto;
        }

        .flow-row {
          display: flex; align-items: center; gap: 10px;
          flex-wrap: wrap; justify-content: center;
          margin-top: 32px; max-width: 1000px;
        }
        .node {
          padding: 10px 18px; border-radius: 2px;
          font-size: clamp(0.72rem, 1.1vw, 0.88rem);
          font-weight: 500; white-space: nowrap; letter-spacing: 0.02em;
        }
        .node-red-light {
          background: rgba(185,28,28,0.07);
          border: 1px solid rgba(185,28,28,0.22);
          color: #b91c1c;
        }
        .node-gold-light {
          background: rgba(101,78,37,0.09);
          border: 1px solid rgba(101,78,37,0.25);
          color: #92681a;
        }
        .node-red-dark {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.3);
          color: #fca5a5;
        }
        .node-goal-dark {
          background: rgba(180,155,110,0.12);
          border: 1px solid rgba(180,155,110,0.4);
          color: #d4b896;
        }
        .arr-r { color: #b91c1c; opacity: 0.5; font-size: 1rem; }
        .arr-g { color: #92681a; opacity: 0.6; font-size: 1rem; }
        .arr-d { color: #ef4444; opacity: 0.4; font-size: 1rem; }
        .arr-dk { color: #d4b896; opacity: 0.4; font-size: 1rem; }

        .shifts {
          width: 100%; max-width: 620px; margin-top: 36px;
        }
        .srow {
          display: flex; gap: 20px; padding: 18px 0; text-align: left;
          border-top: 1px solid rgba(245,243,239,0.08);
        }
        .srow-l {
          display: flex; gap: 20px; padding: 18px 0; text-align: left;
          border-top: 1px solid rgba(61,26,34,0.1);
        }
        .slabel {
          font-size: 0.6rem; letter-spacing: 0.18em; text-transform: uppercase;
          color: #b49b78; min-width: 90px; padding-top: 3px; font-weight: 600;
        }
        .slabel-ox {
          font-size: 0.6rem; letter-spacing: 0.18em; text-transform: uppercase;
          color: #8b5e3c; min-width: 90px; padding-top: 3px; font-weight: 600;
        }
        .sbody { font-size: 0.88rem; line-height: 1.65; opacity: 0.48; }

        .grid3 {
          display: grid; grid-template-columns: repeat(3, 1fr);
          width: 100%; margin-top: 40px;
          border-top: 1px solid rgba(245,243,239,0.08);
        }
        .gcell { padding: 26px 22px; text-align: left; }
        .gkey {
          font-size: 0.62rem; letter-spacing: 0.2em; text-transform: uppercase;
          color: #b49b78; margin-bottom: 10px; font-weight: 600;
        }
        .gval { font-size: 0.84rem; line-height: 1.65; opacity: 0.42; }

        .mirror-grid {
          display: grid; grid-template-columns: 1fr 40px 1fr;
          align-items: center; gap: 16px;
          max-width: 720px; width: 100%; margin-top: 40px;
        }
        .mirror-agent {
          border: 1px solid rgba(245,243,239,0.1);
          padding: 24px 20px; text-align: left;
          background: rgba(245,243,239,0.02);
        }
        .mirror-agent-bad {
          border: 1px solid rgba(239,68,68,0.25);
          padding: 24px 20px; text-align: left;
          background: rgba(239,68,68,0.04);
        }
        .agent-label {
          font-size: 0.6rem; letter-spacing: 0.18em;
          text-transform: uppercase; opacity: 0.3; margin-bottom: 8px;
        }
        .agent-name {
          font-family: 'Fraunces', serif; font-size: 1.1rem;
          margin-bottom: 6px;
        }
        .agent-score {
          font-size: 0.75rem; color: #b49b78;
        }
        .agent-score-burn {
          font-size: 0.75rem; color: #ef4444;
        }
        .mirror-arrow-col {
          display: flex; flex-direction: column;
          align-items: center; gap: 8px;
          font-size: 0.6rem; color: rgba(239,68,68,0.5);
          letter-spacing: 0.1em; text-align: center;
        }

        .patent-stamp {
          position: absolute; top: 34px; right: -72px;
          transform: rotate(45deg);
          font-family: 'Courier New', monospace;
          font-size: 0.6rem; color: #5a2833; letter-spacing: 2px;
          border: 1px solid #3d1a22; padding: 5px 52px;
          background: #2a1018; white-space: nowrap; z-index: 2;
        }

        .num {
          position: absolute; bottom: 22px; right: 32px;
          font-size: 0.6rem; letter-spacing: 0.14em; opacity: 0.15;
        }
        .fixed-footer {
          position: fixed; bottom: 18px; left: 30px;
          font-size: 0.58rem; letter-spacing: 0.2em;
          text-transform: uppercase; color: #3d1a22; opacity: 0.18;
          z-index: 100; font-family: 'Fraunces', serif;
        }

        .cta-row {
          display: flex; gap: 16px; flex-wrap: wrap;
          justify-content: center; margin-top: 48px;
        }
        .btn-ox {
          background: #3d1a22; color: #f5f3ef;
          padding: 14px 32px; font-size: 0.78rem; font-weight: 600;
          text-decoration: none; letter-spacing: 0.08em; text-transform: uppercase;
        }
        .btn-ghost-light {
          background: transparent; border: 1px solid rgba(61,26,34,0.2);
          color: rgba(61,26,34,0.4); padding: 14px 32px; font-size: 0.78rem;
          text-decoration: none; letter-spacing: 0.08em; text-transform: uppercase;
        }
        .btn-ghost-dark {
          background: transparent; border: 1px solid rgba(245,243,239,0.15);
          color: rgba(245,243,239,0.3); padding: 14px 32px; font-size: 0.78rem;
          text-decoration: none; letter-spacing: 0.08em; text-transform: uppercase;
        }

        .identity-box {
          border: 1px solid rgba(245,243,239,0.08);
          padding: 36px 40px; max-width: 560px; width: 100%;
          margin-top: 36px; text-align: left;
        }
        .id-row {
          display: flex; gap: 16px; align-items: flex-start;
          padding: 14px 0; border-top: 1px solid rgba(245,243,239,0.06);
        }
        .id-icon {
          font-size: 0.9rem; opacity: 0.3; min-width: 20px; margin-top: 1px;
        }
        .id-text { font-size: 0.86rem; line-height: 1.6; opacity: 0.45; }

        .closing-hl {
          font-family: 'Fraunces', serif;
          font-size: clamp(2.2rem, 5.5vw, 4.5rem);
          font-weight: 700; letter-spacing: -2px; line-height: 1.1;
          max-width: 16ch;
        }

        .patent-badge {
          display: inline-flex; align-items: center; gap: 10px;
          border: 1px solid rgba(245,243,239,0.1); padding: 5px 14px;
          font-size: 0.6rem; letter-spacing: 0.18em; text-transform: uppercase;
          color: rgba(245,243,239,0.28); margin-top: 10px; margin-bottom: 28px;
        }
      `}</style>

      {/* 01 — Hero */}
      <div className="slide cream">
        <div className="content">
          <div className="eyebrow">Briarwood / dateinquiry.com</div>
          <div className="hl-xl">BRIARWOOD</div>
          <div className="sub">The Infrastructure of Integrity.</div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            border: "1px solid rgba(61,26,34,0.14)", padding: "5px 14px",
            fontSize: "0.6rem", letterSpacing: "0.18em", textTransform: "uppercase",
            color: "rgba(61,26,34,0.3)", marginTop: 14
          }}>
            CDI: Choreography Depth Index™
            <span style={{ borderLeft: "1px solid rgba(61,26,34,0.14)", paddingLeft: 10 }}>Patent Pending</span>
          </div>
        </div>
        <div className="num">01 / 11</div>
      </div>

      {/* 02 — Trust Tax */}
      <div className="slide oxblood">
        <div className="pinstripe" />
        <div className="content">
          <div className="eyebrow">The Trust Tax</div>
          <div className="metric">64%</div>
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(1.1rem, 2.2vw, 1.6rem)", opacity: 0.45, marginBottom: 16 }}>
            Execution Capacity Lost.
          </div>
          <div className="rule" />
          <div className="body">
            This is the measurable cost of "uncomputable" human variables in the $8T physical economy.
          </div>
          <div className="fn">
            Derived from 28 years and 900+ high-stakes coordination events. Includes manual identity verification, history search, liability management, and coordination overhead per execution node.
          </div>
        </div>
        <div className="num">02 / 11</div>
      </div>

      {/* 03 — The Chaos Wall */}
      <div className="slide surface">
        <div className="content">
          <div className="eyebrow">The Problem</div>
          <div className="hl">The Manual Friction Loop.</div>
          <div className="flow-row">
            {["Identify Node","Verify","Search","Handshake","Underwrite","Manage Chaos"].map((n, i) => (
              <>
                <div key={n} className="node node-red-light">{n}</div>
                <span key={`a${i}`} className="arr-r">→</span>
              </>
            ))}
            <div className="node node-gold-light">Execute</div>
          </div>
          <div className="body" style={{ marginTop: 28 }}>
            Software runs on math. The physical world runs on variables. This loop is the Invisible Labor stalling autonomous networks.
          </div>
        </div>
        <div className="num">03 / 11</div>
      </div>

      {/* 04 — The Latency Gap */}
      <div className="slide deep">
        <div className="pinstripe" />
        <div className="content">
          <div className="eyebrow">The Latency Gap</div>
          <div className="hl">90 Days vs. Second Zero.</div>
          <div className="sub">Traditional trust models rely on a 30/60/90-day lag.</div>
          <div className="shifts">
            <div className="srow">
              <span className="slabel">The Flaw</span>
              <span className="sbody">Latency is a gift to bad actors. It creates an exploitation window for reputation laundering — where a bad actor resets by changing a name, forming a new LLC, or simply moving markets.</span>
            </div>
            <div className="srow">
              <span className="slabel">The Shift</span>
              <span className="sbody">In high-stakes execution, trust must be an Instant Behavioral Primitive. Available at second zero. Not retrieved from a trailing audit.</span>
            </div>
          </div>
        </div>
        <div className="num">04 / 11</div>
      </div>

      {/* 05 — The Identity Anchor */}
      <div className="slide mid">
        <div className="pinstripe" />
        <div className="content">
          <div className="eyebrow">The Identity Anchor</div>
          <div className="hl">The SSN for Execution.</div>
          <div className="sub">You cannot reset integrity by changing a name or forming a new LLC.</div>
          <div className="identity-box">
            <div className="id-row" style={{ borderTop: "none", paddingTop: 0 }}>
              <div className="id-icon">⚓</div>
              <div className="id-text">Every agent and operator is anchored to a CDI Identity. History doesn't just follow you — it anchors you.</div>
            </div>
            <div className="id-row">
              <div className="id-icon">🔗</div>
              <div className="id-text">New entity formation, name changes, and market pivots are transparent. The anchor persists across all legal structures.</div>
            </div>
            <div className="id-row">
              <div className="id-icon">◈</div>
              <div className="id-text">The result: a permanent, immutable behavioral foundation that cannot be laundered, reset, or purchased.</div>
            </div>
          </div>
        </div>
        <div className="num">05 / 11</div>
      </div>

      {/* 06 — CDI — The Patented Solution */}
      <div className="slide" style={{ background: "#2a1018", color: "#f5f3ef", padding: "80px 60px", position: "relative", overflow: "hidden" }}>
        <div className="pinstripe" />
        <div className="patent-stamp">US PATENT PENDING // REF: 28-YR GROUND TRUTH</div>
        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div className="eyebrow">The Patented Solution</div>
          <div style={{
            fontFamily: "'Fraunces', serif",
            fontSize: "clamp(6rem, 16vw, 13rem)",
            fontWeight: 700, lineHeight: 1, letterSpacing: "-6px",
            background: "linear-gradient(180deg, #f5f3ef 0%, #6b3040 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            marginBottom: 8,
          }}>
            CDI
          </div>
          <div style={{ fontSize: "clamp(0.85rem, 1.6vw, 1.2rem)", color: "rgba(245,243,239,0.4)", letterSpacing: "0.06em", marginBottom: 8 }}>
            Choreography Depth Index™
          </div>
          <div className="patent-badge">Patent Pending</div>
          <div className="body" style={{ marginBottom: 8 }}>The Missing Primitive for Real-World Coordination.</div>
          <div className="grid3">
            {[
              { k: "Choreography", v: "Captures the precise sequence and timing of multi-node execution events." },
              { k: "Depth", v: "Ingests high-fidelity behavioral ground truth that pixels and words cannot reach." },
              { k: "Index", v: "A machine-readable standard for underwriting risk in the physical economy." },
            ].map((item, i) => (
              <div key={item.k} className="gcell" style={{ borderLeft: i > 0 ? "1px solid rgba(245,243,239,0.06)" : "none" }}>
                <div className="gkey">{item.k}</div>
                <div className="gval">{item.v}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 22, left: 0, right: 0, textAlign: "center", fontSize: "0.58rem", letterSpacing: "0.22em", color: "#4a1e28", textTransform: "uppercase" }}>
          BRIARWOOD // THE INDEPENDENT STANDARD
        </div>
        <div className="num">06 / 11</div>
      </div>

      {/* 07 — The Mirror Protocol */}
      <div className="slide oxblood">
        <div className="pinstripe" />
        <div className="content">
          <div className="eyebrow">The Mirror Protocol</div>
          <div className="hl">Recursive Associative Trust.</div>
          <div className="sub">Trust is a network effect. You are the company you keep.</div>
          <div className="mirror-grid">
            <div className="mirror-agent">
              <div className="agent-label">Master Agent</div>
              <div className="agent-name">Principal Node</div>
              <div className="agent-score">CDI 91 — Vouches for sub-agent</div>
            </div>
            <div className="mirror-arrow-col">
              <span style={{ fontSize: "1.2rem", color: "rgba(239,68,68,0.6)" }}>⇄</span>
              <span>BURN</span>
            </div>
            <div className="mirror-agent-bad">
              <div className="agent-label">Sub-Agent</div>
              <div className="agent-name">Referred Node</div>
              <div className="agent-score-burn">Fails → Mirror reflects instantly</div>
            </div>
          </div>
          <div className="shifts">
            <div className="srow">
              <span className="slabel">Vouching</span>
              <span className="sbody">New agents inherit the Pedigree of their source. Your CDI is your letter of introduction.</span>
            </div>
            <div className="srow">
              <span className="slabel">The Burn</span>
              <span className="sbody">If a sub-agent fails, the Mirror reflects that failure back to the Master Agent instantly. The system self-cleans. High-fidelity players won't align with bad actors.</span>
            </div>
          </div>
        </div>
        <div className="num">07 / 11</div>
      </div>

      {/* 08 — The Neutral Arbiter */}
      <div className="slide cream">
        <div className="content">
          <div className="eyebrow">The Moat</div>
          <div className="hl">Independence is the Moat.</div>
          <div className="rule" />
          <div className="sub" style={{ fontStyle: "italic" }}>
            "You don't let the student grade their own paper. You don't have the bank write its own credit report."
          </div>
          <div className="shifts">
            <div className="srow-l">
              <span className="slabel-ox">The Barrier</span>
              <span className="sbody">Agent companies cannot underwrite their own risk. The conflict of interest disqualifies them. Briarwood is the Independent Standard the industry answers to — and cannot replicate.</span>
            </div>
          </div>
        </div>
        <div className="num">08 / 11</div>
      </div>

      {/* 09 — Why Now */}
      <div className="slide deep">
        <div className="pinstripe" />
        <div className="content">
          <div className="eyebrow">Why Now</div>
          <div className="hl">Computing the Uncomputable.</div>
          <div className="sub">AI has hit the Screen Limit. To enter the physical world, agents need an Action-Conditioned Ledger.</div>
          <div className="shifts">
            <div className="srow">
              <span className="slabel">The Bridge</span>
              <span className="sbody">We provide the Choreography — behavioral truth — required to navigate the stochastic messiness of reality. LLMs and Video Models cannot learn this from pixels alone. It must be lived, captured, and indexed.</span>
            </div>
          </div>
        </div>
        <div className="num">09 / 11</div>
      </div>

      {/* 10 — Execution Integrity */}
      <div className="slide surface">
        <div className="content">
          <div className="eyebrow">With Briarwood</div>
          <div className="hl">Execution Integrity.</div>
          <div className="flow-row">
            <div className="node node-gold-light">Identify Node</div>
            <span className="arr-g">→</span>
            <div className="node" style={{ background: "rgba(61,26,34,0.09)", border: "1px solid rgba(61,26,34,0.28)", color: "#3d1a22", fontWeight: 600 }}>Execute</div>
          </div>
          <div className="body" style={{ marginTop: 28 }}>
            We remove the Trust Tax. By digitizing the handshake, we allow physical networks to move at the speed of software.
          </div>
          <div className="cta-row">
            <a href="mailto:violet@briarwood.ai" className="btn-ox">Request a Demo</a>
            <a href="/demo-landing" className="btn-ghost-light">Full Overview</a>
          </div>
        </div>
        <div className="num">10 / 11</div>
      </div>

      {/* 11 — Philosophy */}
      <div className="slide oxblood">
        <div className="pinstripe" />
        <div className="content">
          <div className="eyebrow">The Philosophy</div>
          <div className="closing-hl">
            Privacy Stays.<br />Reputation Runs.<br />Trust Wins.
          </div>
          <div className="rule" />
          <div className="body">The Human Defense Layer for the High-Stakes Economy.</div>
          <div style={{ marginTop: 60, fontSize: "0.58rem", letterSpacing: "0.2em", opacity: 0.18, textTransform: "uppercase" }}>
            Briarwood // Founder Led // CDI™ Patent Pending // 2026
          </div>
        </div>
        <div className="num">11 / 11</div>
      </div>

      <div className="fixed-footer">Briarwood</div>
    </div>
  );
}
