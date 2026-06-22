export default function CDIArchitecture() {
  return (
    <div style={{ background: "#f5f3ef", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@400;500;600&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .memo-wrap {
          max-width: 780px;
          margin: 0 auto;
          padding: 80px 40px 120px;
        }

        .memo-header {
          border-bottom: 1px solid #d4cec6;
          padding-bottom: 36px;
          margin-bottom: 48px;
        }

        .memo-stamp {
          display: inline-block;
          border: 1px solid #b49b78;
          color: #b49b78;
          font-size: 0.58rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          padding: 4px 12px;
          margin-bottom: 24px;
          font-family: 'Courier New', monospace;
        }

        .memo-meta {
          display: grid;
          grid-template-columns: 100px 1fr;
          gap: 8px 16px;
          font-size: 0.78rem;
          color: #999;
          margin-bottom: 28px;
          font-family: 'Courier New', monospace;
        }

        .meta-key { color: #bbb; }
        .meta-val { color: #555; }

        .memo-title {
          font-family: 'Fraunces', serif;
          font-size: clamp(1.8rem, 4vw, 3rem);
          font-weight: 700;
          letter-spacing: -1px;
          color: #1a1a1a;
          line-height: 1.1;
        }

        .section {
          margin-bottom: 56px;
        }

        .section-num {
          font-size: 0.6rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #c9b99a;
          font-weight: 600;
          margin-bottom: 8px;
          font-family: 'Courier New', monospace;
        }

        .section-title {
          font-family: 'Fraunces', serif;
          font-size: clamp(1.3rem, 2.5vw, 1.9rem);
          font-weight: 700;
          color: #1a1a1a;
          letter-spacing: -0.5px;
          margin-bottom: 20px;
          line-height: 1.15;
        }

        .section-body {
          font-size: 0.95rem;
          line-height: 1.8;
          color: #555;
          margin-bottom: 20px;
        }

        .rule {
          width: 100%;
          height: 1px;
          background: #e5e0d8;
          margin-bottom: 48px;
        }

        .bullet-list {
          list-style: none;
          margin-top: 16px;
        }

        .bullet-list li {
          display: flex;
          gap: 14px;
          align-items: flex-start;
          padding: 14px 0;
          border-top: 1px solid #ede8e0;
          font-size: 0.9rem;
          color: #555;
          line-height: 1.7;
        }

        .bullet-list li:first-child { border-top: none; }

        .bullet-key {
          font-size: 0.6rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #b49b78;
          font-weight: 600;
          min-width: 110px;
          padding-top: 3px;
          font-family: 'Courier New', monospace;
        }

        .callout {
          background: #3d1a22;
          color: #f5f3ef;
          padding: 32px 36px;
          margin: 32px 0;
          position: relative;
          overflow: hidden;
        }

        .callout::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url('/pinstripe.jpeg');
          background-repeat: repeat;
          background-size: 400px;
          opacity: 0.12;
        }

        .callout-text {
          position: relative;
          font-family: 'Fraunces', serif;
          font-size: clamp(1rem, 2vw, 1.35rem);
          font-weight: 600;
          line-height: 1.5;
          letter-spacing: -0.3px;
        }

        .mirror-diagram {
          margin: 28px 0;
          border: 1px solid #ede8e0;
          padding: 32px 28px;
          background: #faf9f7;
        }

        .mirror-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .m-node {
          padding: 10px 18px;
          border: 1px solid #d4cec6;
          font-size: 0.8rem;
          color: #555;
          background: #fff;
        }

        .m-node-bad {
          padding: 10px 18px;
          border: 1px solid rgba(185,28,28,0.3);
          font-size: 0.8rem;
          color: #b91c1c;
          background: rgba(185,28,28,0.04);
        }

        .m-node-goal {
          padding: 10px 18px;
          border: 1px solid #b49b78;
          font-size: 0.8rem;
          color: #92681a;
          background: rgba(180,155,110,0.06);
          font-weight: 600;
        }

        .m-label {
          font-size: 0.65rem;
          color: #b49b78;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 8px;
          font-family: 'Courier New', monospace;
        }

        .m-score {
          font-size: 0.7rem;
          color: #b91c1c;
          margin-top: 4px;
        }

        .m-score-good {
          font-size: 0.7rem;
          color: #92681a;
          margin-top: 4px;
        }

        .m-col { display: flex; flex-direction: column; }

        .burn-arrow {
          font-size: 1.2rem;
          color: #b91c1c;
          opacity: 0.5;
        }

        .burn-label {
          font-size: 0.58rem;
          letter-spacing: 0.14em;
          color: #b91c1c;
          text-transform: uppercase;
          opacity: 0.6;
          font-family: 'Courier New', monospace;
        }

        .burn-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .build-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px;
          margin-top: 20px;
        }

        .build-cell {
          padding: 22px 24px;
          background: #faf9f7;
          border: 1px solid #ede8e0;
        }

        .build-label {
          font-size: 0.6rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #b49b78;
          margin-bottom: 8px;
          font-weight: 600;
          font-family: 'Courier New', monospace;
        }

        .build-desc {
          font-size: 0.85rem;
          line-height: 1.65;
          color: #666;
        }

        .closing-line {
          text-align: center;
          padding: 48px 0 0;
          border-top: 1px solid #d4cec6;
          font-family: 'Fraunces', serif;
          font-size: 1.2rem;
          font-style: italic;
          color: #888;
          letter-spacing: -0.3px;
        }

        .closing-footer {
          text-align: center;
          margin-top: 16px;
          font-size: 0.62rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #c9b99a;
          font-family: 'Courier New', monospace;
        }
      `}</style>

      <div className="memo-wrap">

        {/* Header */}
        <div className="memo-header">
          <div className="memo-stamp">Proprietary / Patent Pending</div>
          <div className="memo-meta">
            <span className="meta-key">MEMO</span>
            <span className="meta-val">Briarwood Strategy — CDI Architecture</span>
            <span className="meta-key">SUBJECT</span>
            <span className="meta-val">The Mirror Protocol and Identity Anchor</span>
            <span className="meta-key">DATE</span>
            <span className="meta-val">March 21, 2026</span>
            <span className="meta-key">FOR</span>
            <span className="meta-val">Technical Architecture Review</span>
            <span className="meta-key">FROM</span>
            <span className="meta-val">Violet — Founder</span>
          </div>
          <div className="memo-title">
            CDI Architecture:<br />Mirror Protocol and Identity Anchor
          </div>
        </div>

        {/* 1. Identity Anchor */}
        <div className="section">
          <div className="section-num">01 — The Identity Anchor</div>
          <div className="section-title">The SSN for Execution.</div>
          <div className="section-body">
            Trust in the physical economy cannot be ephemeral. To eliminate Reputation Laundering, CDI must be anchored at the Identity Layer — not the profile layer.
          </div>
          <ul className="bullet-list">
            <li>
              <span className="bullet-key">The Logic</span>
              <span>Just as a Social Security Number follows a human for life, a CDI Anchor follows an agent, operator, or entity across every coordination event. The anchor persists across name changes, LLC formations, and market pivots.</span>
            </li>
            <li>
              <span className="bullet-key">The Moat</span>
              <span>You cannot reset a score by spinning up a new name or a fresh LLC. If an identity has no history, the system doesn't see "Zero" — it sees an Unverified Origin, which triggers the Mirror Protocol automatically.</span>
            </li>
            <li>
              <span className="bullet-key">Build Note</span>
              <span>There is no "Delete Profile" button for integrity. The anchor is immutable. All entity records are cross-referenced at the identity layer, not the account layer.</span>
            </li>
          </ul>
        </div>

        <div className="rule" />

        {/* 2. Mirror Protocol */}
        <div className="section">
          <div className="section-num">02 — The Mirror Protocol</div>
          <div className="section-title">Recursive Associative Trust.</div>
          <div className="section-body">
            In the human world, you are the company you keep. Briarwood digitizes this as a Mathematical Mirror. Trust is not an isolated data point — it is a Network Effect.
          </div>

          <div className="mirror-diagram">
            <div style={{ marginBottom: 20 }}>
              <div className="m-label">Vouching Flow — Cold Start Pedigree</div>
              <div className="mirror-row">
                <div className="m-col">
                  <div className="m-node">Master Agent<br /><span className="m-score-good">CDI 91</span></div>
                </div>
                <span style={{ color: "#b49b78", fontSize: "1rem" }}>→</span>
                <div style={{ fontSize: "0.7rem", color: "#b49b78" }}>Vouches for</div>
                <span style={{ color: "#b49b78", fontSize: "1rem" }}>→</span>
                <div className="m-col">
                  <div className="m-node">Sub-Agent<br /><span className="m-score-good">Inherits Pedigree</span></div>
                </div>
              </div>
            </div>
            <div style={{ borderTop: "1px solid #ede8e0", paddingTop: 20 }}>
              <div className="m-label">Burn Scenario — Failure Reflection</div>
              <div className="mirror-row">
                <div className="m-col">
                  <div className="m-node-bad">Master Agent<br /><span className="m-score">CDI penalized instantly</span></div>
                </div>
                <div className="burn-col">
                  <span className="burn-arrow">⇄</span>
                  <span className="burn-label">BURN</span>
                </div>
                <div className="m-col">
                  <div className="m-node-bad">Sub-Agent<br /><span className="m-score">Fails coordination</span></div>
                </div>
              </div>
            </div>
          </div>

          <ul className="bullet-list">
            <li>
              <span className="bullet-key">The Pedigree</span>
              <span>Every Cold Start — a new agent with no history — must be underwritten by a Source. The sub-agent inherits the Pedigree of the Master Agent or Entity that deployed them. This makes the vouching decision expensive and deliberate.</span>
            </li>
            <li>
              <span className="bullet-key">The Burn Effect</span>
              <span>If a sub-agent fails, flails, or breaks the choreography, the failure is mirrored back to the Source instantly. There is no lag, no billing cycle delay, no grace period.</span>
            </li>
            <li>
              <span className="bullet-key">Incentive Logic</span>
              <span>High-fidelity operators will refuse to align with bad actors because the Burn to their own CDI is too expensive. The system is self-cleansing. No moderator required.</span>
            </li>
          </ul>
        </div>

        <div className="callout">
          <div className="callout-text">
            "The system self-cleans. High-fidelity players won't align with bad actors because the Burn to their own CDI is too expensive."
          </div>
        </div>

        <div className="rule" />

        {/* 3. Second Zero */}
        <div className="section">
          <div className="section-num">03 — Second Zero</div>
          <div className="section-title">The End of the Latency Gap.</div>
          <div className="section-body">
            Traditional credit and background systems rely on a 30/60/90-day lag. This Latency Gap is a structural security flaw that rewards bad behavior by giving it a window to operate undetected.
          </div>
          <ul className="bullet-list">
            <li>
              <span className="bullet-key">Instant Integrity</span>
              <span>CDI is an Action-Conditioned Ledger. We don't wait for a billing cycle. We watch the Choreography as it happens. The score updates at execution time, not audit time.</span>
            </li>
            <li>
              <span className="bullet-key">Latency as History</span>
              <span>How an agent responds to the very first handshake — the timing, the sequence, and the alignment — is an immediate behavioral fingerprint. History doesn't start after a year. It starts at Second Zero.</span>
            </li>
          </ul>
        </div>

        <div className="rule" />

        {/* 4. Choreography Over Reputation */}
        <div className="section">
          <div className="section-num">04 — Choreography Over Reputation</div>
          <div className="section-title">The Real-Time Diagnostic.</div>
          <div className="section-body">
            Reputation is a trailing indicator — subjective, slow, and gameable. Choreography is a real-time diagnostic that cannot be faked, purchased, or gamed after the fact.
          </div>
          <ul className="bullet-list">
            <li>
              <span className="bullet-key">Live Measurement</span>
              <span>If the sequence of a high-stakes task breaks, the Index reflects it before the job is even finished. We are measuring the Depth of Execution, not the Review of the client.</span>
            </li>
            <li>
              <span className="bullet-key">The Arbiter</span>
              <span>This makes Briarwood the Neutral Arbiter that AI agents and Capital can actually trust. We don't ask "what did people say about you?" We ask "what did you actually do, and in what order?"</span>
            </li>
          </ul>
        </div>

        <div className="rule" />

        {/* 5. Build Instructions */}
        <div className="section">
          <div className="section-num">05 — Build Instructions</div>
          <div className="section-title">What the UI Must Reflect.</div>
          <div className="section-body">
            The front-end must make the CDI architecture legible to an operator at a glance. Three visual primitives need to be built:
          </div>
          <div className="build-grid">
            <div className="build-cell">
              <div className="build-label">Mirror Visualization</div>
              <div className="build-desc">Show the links between nodes. If Node A refers Node B, show the Trust Cord connecting them. The network must be visible, not abstract.</div>
            </div>
            <div className="build-cell">
              <div className="build-label">Burn Indicator</div>
              <div className="build-desc">Visually demonstrate how a failure at the edge of the network ripples back to the center. The propagation must be animated and immediate.</div>
            </div>
            <div className="build-cell">
              <div className="build-label">Identity Anchor</div>
              <div className="build-desc">Every entity card must show the Anchor status clearly. No Delete button. No Reset option. Make the permanence visible in the UI chrome.</div>
            </div>
            <div className="build-cell">
              <div className="build-label">Second Zero Ledger</div>
              <div className="build-desc">The CDI score update must appear in the UI as an event occurs — not after a page refresh or batch process. Real-time score reflection is the product.</div>
            </div>
          </div>
        </div>

        {/* Closing */}
        <div className="closing-line">
          "Privacy Stays. Reputation Runs. Trust Wins."
        </div>
        <div className="closing-footer">
          Briarwood // Founder Led // CDI™ Patent Pending // 2026
        </div>

      </div>
    </div>
  );
}
