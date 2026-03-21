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
          padding: 40px;
          box-sizing: border-box;
          border-bottom: 1px solid #222;
        }
        .hero-text {
          font-size: clamp(3rem, 8vw, 6rem);
          font-weight: 700;
          letter-spacing: -3px;
          margin-bottom: 16px;
          line-height: 1;
        }
        .sub-hero {
          font-size: clamp(1.1rem, 2.5vw, 1.8rem);
          color: #888;
          max-width: 700px;
          line-height: 1.4;
        }
        .metric {
          font-size: clamp(6rem, 18vw, 14rem);
          font-weight: 800;
          color: #fff;
          line-height: 1;
          letter-spacing: -6px;
        }
        .metric-label {
          font-size: clamp(1.2rem, 3vw, 2.5rem);
          color: #888;
          margin-top: 12px;
          letter-spacing: -0.5px;
        }
        .dream-text {
          font-family: 'Courier New', Courier, monospace;
          font-size: clamp(2.5rem, 6vw, 4.5rem);
          color: #00ff41;
          letter-spacing: -1px;
        }
        .flow-container {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 40px;
          flex-wrap: wrap;
          justify-content: center;
          max-width: 1100px;
        }
        .flow-box {
          border: 1px solid #333;
          padding: 14px 22px;
          border-radius: 4px;
          color: #666;
          font-size: clamp(0.85rem, 1.5vw, 1.1rem);
          white-space: nowrap;
        }
        .flow-box.active {
          border-color: #00ff41;
          color: #fff;
          background: rgba(0, 255, 65, 0.08);
        }
        .arrow {
          color: #333;
          font-size: 1.4rem;
        }
        .label-sm {
          font-size: 0.75rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #444;
          margin-bottom: 24px;
        }
        .section-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-top: 40px;
          max-width: 900px;
          width: 100%;
        }
        .section-card {
          border: 1px solid #222;
          border-radius: 4px;
          padding: 28px 20px;
        }
        .section-card-title {
          font-size: 0.75rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #444;
          margin-bottom: 16px;
        }
        .section-card-body {
          color: #555;
          font-size: 0.85rem;
          line-height: 1.6;
        }
        .section-card-body .wall {
          color: #fff;
          font-size: 0.9rem;
          font-weight: 600;
          margin-top: 12px;
        }
        .footer {
          position: fixed;
          bottom: 24px;
          left: 36px;
          color: #2a2a2a;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          z-index: 100;
        }
      `}</style>

      <div className="slide">
        <div className="hero-text">Briarwood</div>
        <div className="sub-hero">Empowers agents to execute where it matters.</div>
        <div style={{ marginTop: 32, fontSize: "0.8rem", color: "#333", letterSpacing: "0.14em", textTransform: "uppercase" }}>
          dateinquiry.com
        </div>
      </div>

      <div className="slide">
        <div className="label-sm">The Trust Tax</div>
        <div className="metric">64%</div>
        <div className="metric-label">Execution Capacity Lost</div>
        <div className="sub-hero" style={{ marginTop: 24 }}>
          The time and resources spent manually underwriting human variables before a single task can be started.
        </div>
      </div>

      <div className="slide">
        <div className="label-sm">The dream</div>
        <div className="dream-text">Start executing_</div>
      </div>

      <div className="slide">
        <div className="label-sm">The reality</div>
        <div className="flow-container">
          <div className="flow-box">Identify Node</div>
          <div className="arrow">→</div>
          <div className="flow-box">Verify Identity</div>
          <div className="arrow">→</div>
          <div className="flow-box">Search History</div>
          <div className="arrow">→</div>
          <div className="flow-box">Manual Handshake</div>
          <div className="arrow">→</div>
          <div className="flow-box">Underwrite Liability</div>
          <div className="arrow">→</div>
          <div className="flow-box">Manage Chaos</div>
          <div className="arrow">→</div>
          <div className="flow-box active">Start executing</div>
        </div>
        <div style={{ marginTop: 36, fontSize: "0.8rem", color: "#444", maxWidth: 600, lineHeight: 1.6 }}>
          The "Trust Gap" makes physical coordination a manual, high-friction process.
        </div>
      </div>

      <div className="slide">
        <div className="label-sm">Multiples across operations</div>
        <div className="section-grid">
          {["Operation A", "Operation B", "Operation C"].map((op) => (
            <div className="section-card" key={op}>
              <div className="section-card-title">{op}</div>
              <div className="section-card-body">
                Identify → Verify → Search → Handshake → Underwrite →
                <div className="wall">Execution Wall</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 32, fontSize: "0.8rem", color: "#444", maxWidth: 600, lineHeight: 1.6 }}>
          Every operation hits the same wall. The loop repeats because trust doesn't transfer.
        </div>
      </div>

      <div className="slide">
        <div className="label-sm">Multiples across nodes</div>
        <div className="section-grid">
          {["Agent A", "Agent B", "Agent C"].map((agent) => (
            <div className="section-card" key={agent}>
              <div className="section-card-title">{agent}</div>
              <div className="section-card-body">
                Every time an agent needs to touch the physical world, it hits
                <div className="wall">The Execution Wall</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 32, fontSize: "0.8rem", color: "#444", maxWidth: 600, lineHeight: 1.6 }}>
          The system doesn't scale because trust doesn't scale.
        </div>
      </div>

      <div className="slide">
        <div className="label-sm">The solution</div>
        <div className="hero-text" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", letterSpacing: "-1px", marginBottom: 24 }}>
          Briarwood provides the missing primitive.
        </div>
        <div className="sub-hero" style={{ marginBottom: 32 }}>
          CDI — the Behavioral Execution History. We turn the real world into a machine-readable trust environment.
        </div>
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center", marginTop: 16 }}>
          {[
            ["Coordination Capture", "Informal workflows become measurable"],
            ["Behavioral Trust Data", "Private execution history, not public reviews"],
            ["CDI Score", "Coordination reliability, legible and queryable"],
          ].map(([title, desc]) => (
            <div key={title} style={{ borderTop: "1px solid #222", paddingTop: 20, width: 200, textAlign: "left" }}>
              <div style={{ fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#444", marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: "0.85rem", color: "#555", lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="slide">
        <div className="label-sm">With Briarwood</div>
        <div className="flow-container" style={{ marginBottom: 48 }}>
          <div className="flow-box">Identify Node</div>
          <div className="arrow">→</div>
          <div className="flow-box active">Start executing</div>
        </div>
        <div className="sub-hero">
          By digitizing high-stakes behavioral history, we remove the Trust Tax and let networks move at the speed of software.
        </div>
        <div style={{ marginTop: 48, display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
          <a
            href="mailto:violet@briarwood.ai"
            style={{ background: "#fff", color: "#0b0b0b", padding: "14px 32px", fontSize: "0.9rem", fontWeight: 600, textDecoration: "none", letterSpacing: "0.04em" }}
          >
            Request a Demo
          </a>
          <a
            href="/demo-landing"
            style={{ border: "1px solid #333", color: "#888", padding: "14px 32px", fontSize: "0.9rem", textDecoration: "none", letterSpacing: "0.04em" }}
          >
            Full Overview
          </a>
        </div>
      </div>

      <div className="footer">BRIARWOOD // 2026</div>

    </div>
  );
}
