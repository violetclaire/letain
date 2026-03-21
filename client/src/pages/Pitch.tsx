const B = "#6b1a2a";

export default function Pitch() {
  return (
    <div style={{ background: "#fff", color: "#0f0f0f", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .s {
          min-height: 100vh; width: 100%;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center; padding: 80px 48px;
          position: relative; overflow: hidden;
        }
        .s-white  { background: #ffffff; }
        .s-off    { background: #f9f9f9; }
        .s-black  { background: #0f0f0f; color: #fff; }
        .s-burg   { background: ${B}; color: #fff; }

        .eye {
          font-size: 0.6rem; letter-spacing: 0.22em;
          text-transform: uppercase; opacity: 0.35; margin-bottom: 18px;
        }

        .hn {
          font-family: 'Fraunces', serif;
          font-size: clamp(2.6rem, 6vw, 5.5rem);
          font-weight: 700; letter-spacing: -2px;
          line-height: 1.0; margin-bottom: 20px;
        }
        .hn-xl {
          font-family: 'Fraunces', serif;
          font-size: clamp(5rem, 13vw, 11rem);
          font-weight: 700; letter-spacing: -6px;
          line-height: 1; margin-bottom: 16px;
        }
        .hn-metric {
          font-family: 'Fraunces', serif;
          font-size: clamp(9rem, 25vw, 20rem);
          font-weight: 700; line-height: 1; letter-spacing: -10px;
        }

        .sub {
          font-size: clamp(1rem, 2vw, 1.35rem);
          max-width: 580px; opacity: 0.55; line-height: 1.55;
        }
        .bod {
          font-size: clamp(0.88rem, 1.3vw, 1rem);
          max-width: 560px; opacity: 0.5; line-height: 1.75;
        }
        .fn {
          font-size: 0.65rem; max-width: 480px;
          opacity: 0.25; line-height: 1.7; margin-top: 20px;
        }

        .rule { width: 32px; height: 2px; margin: 22px auto; }
        .rule-black { background: #0f0f0f; }
        .rule-white { background: #fff; }
        .rule-burg  { background: ${B}; }

        .pill {
          display: inline-flex; align-items: center; gap: 10px;
          border: 1px solid currentColor; padding: 5px 14px;
          font-size: 0.6rem; letter-spacing: 0.18em;
          text-transform: uppercase; opacity: 0.3;
          margin-top: 12px; margin-bottom: 4px;
        }

        .flow-row {
          display: flex; align-items: center; gap: 8px;
          flex-wrap: wrap; justify-content: center; margin-top: 32px;
        }
        .fn-red {
          padding: 10px 18px; border-radius: 2px;
          font-size: 0.82rem; font-weight: 500;
          background: #fef2f2; border: 1px solid #fecaca;
          color: #991b1b; white-space: nowrap;
        }
        .fn-burg {
          padding: 10px 18px; border-radius: 2px;
          font-size: 0.82rem; font-weight: 600;
          background: ${B}; border: 1px solid ${B};
          color: #fff; white-space: nowrap;
        }
        .fn-gray {
          padding: 10px 18px; border-radius: 2px;
          font-size: 0.82rem; font-weight: 500;
          background: #f4f4f4; border: 1px solid #e0e0e0;
          color: #555; white-space: nowrap;
        }
        .arr { opacity: 0.3; font-size: 1rem; }
        .arr-red { color: #dc2626; opacity: 0.5; font-size: 1rem; }

        .stack {
          width: 100%; max-width: 600px; margin-top: 36px;
          text-align: left;
        }
        .srow {
          display: flex; gap: 20px; padding: 18px 0;
          border-top: 1px solid #f0f0f0;
        }
        .srow-w {
          display: flex; gap: 20px; padding: 18px 0;
          border-top: 1px solid rgba(255,255,255,0.08);
        }
        .slbl {
          font-size: 0.6rem; letter-spacing: 0.18em;
          text-transform: uppercase; color: ${B};
          min-width: 90px; padding-top: 3px; font-weight: 600;
        }
        .slbl-w {
          font-size: 0.6rem; letter-spacing: 0.18em;
          text-transform: uppercase; color: rgba(255,255,255,0.4);
          min-width: 90px; padding-top: 3px; font-weight: 600;
        }
        .sbody { font-size: 0.88rem; line-height: 1.7; opacity: 0.48; }

        .g3 {
          display: grid; grid-template-columns: repeat(3,1fr);
          width: 100%; margin-top: 40px;
        }
        .gc {
          padding: 28px 24px; text-align: left;
          border-top: 1px solid #f0f0f0;
        }
        .gk {
          font-size: 0.6rem; letter-spacing: 0.18em;
          text-transform: uppercase; color: ${B};
          margin-bottom: 10px; font-weight: 600;
        }
        .gv { font-size: 0.85rem; line-height: 1.65; opacity: 0.45; }

        .mirror-wrap {
          max-width: 680px; width: 100%; margin-top: 36px;
          border: 1px solid #f0f0f0; padding: 32px;
        }
        .m-row {
          display: flex; align-items: center;
          gap: 16px; flex-wrap: wrap; margin-bottom: 24px;
        }
        .m-node {
          padding: 12px 20px; border: 1px solid #e5e5e5;
          font-size: 0.82rem; text-align: left;
          background: #fafafa; flex: 1; min-width: 160px;
        }
        .m-node-bad {
          padding: 12px 20px;
          border: 1px solid #fecaca;
          font-size: 0.82rem; text-align: left;
          background: #fef2f2; flex: 1; min-width: 160px;
        }
        .m-name { font-weight: 600; margin-bottom: 4px; }
        .m-score { font-size: 0.7rem; color: ${B}; }
        .m-burn { font-size: 0.7rem; color: #dc2626; }
        .m-mid {
          display: flex; flex-direction: column;
          align-items: center; gap: 4px;
          font-size: 0.58rem; letter-spacing: 0.12em;
          text-transform: uppercase; color: #dc2626;
          opacity: 0.6;
        }

        .id-box {
          border: 1px solid #f0f0f0;
          max-width: 520px; width: 100%;
          margin-top: 28px; text-align: left;
        }
        .id-row {
          display: flex; gap: 16px; align-items: flex-start;
          padding: 16px 24px; border-top: 1px solid #f0f0f0;
          font-size: 0.88rem; line-height: 1.65; opacity: 0.5;
        }
        .id-row:first-child { border-top: none; }
        .id-icon { min-width: 20px; opacity: 0.35; margin-top: 2px; }

        .build-g {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 1px; background: #f0f0f0;
          margin-top: 24px; width: 100%; max-width: 680px;
        }
        .bc {
          background: #fff; padding: 24px;
          text-align: left;
        }
        .bk {
          font-size: 0.6rem; letter-spacing: 0.18em;
          text-transform: uppercase; color: ${B};
          margin-bottom: 8px; font-weight: 600;
        }
        .bv { font-size: 0.85rem; line-height: 1.65; opacity: 0.5; }

        .num {
          position: absolute; bottom: 22px; right: 32px;
          font-size: 0.6rem; letter-spacing: 0.12em; opacity: 0.18;
        }

        .cdi-giant {
          font-family: 'Fraunces', serif;
          font-size: clamp(6rem, 18vw, 14rem);
          font-weight: 700; line-height: 1;
          letter-spacing: -6px;
          color: ${B};
          margin-bottom: 8px;
        }

        .stamp {
          position: absolute; top: 32px; right: -68px;
          transform: rotate(45deg);
          font-family: 'Courier New', monospace;
          font-size: 0.58rem; letter-spacing: 2px;
          border: 1px solid #e5e5e5; padding: 4px 52px;
          background: #fff; color: #ccc;
          white-space: nowrap; z-index: 2;
        }

        .closing {
          font-family: 'Fraunces', serif;
          font-size: clamp(2rem, 5vw, 4.5rem);
          font-weight: 700; letter-spacing: -2px;
          line-height: 1.1; max-width: 16ch;
        }

        .cta-row {
          display: flex; gap: 14px; flex-wrap: wrap;
          justify-content: center; margin-top: 44px;
        }
        .btn-dark {
          background: #0f0f0f; color: #fff;
          padding: 14px 32px; font-size: 0.78rem;
          font-weight: 600; text-decoration: none;
          letter-spacing: 0.06em; text-transform: uppercase;
        }
        .btn-burg {
          background: ${B}; color: #fff;
          padding: 14px 32px; font-size: 0.78rem;
          font-weight: 600; text-decoration: none;
          letter-spacing: 0.06em; text-transform: uppercase;
        }
        .btn-out {
          background: transparent; border: 1px solid #e0e0e0;
          color: #999; padding: 14px 32px; font-size: 0.78rem;
          text-decoration: none; letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .ft {
          position: fixed; bottom: 18px; left: 28px;
          font-size: 0.58rem; letter-spacing: 0.2em;
          text-transform: uppercase; color: #ccc; z-index: 100;
        }
      `}</style>

      {/* 01 — Hero */}
      <div className="s s-white">
        <div className="eye">Briarwood — dateinquiry.com</div>
        <div className="hn-xl">BRIARWOOD</div>
        <div className="sub">The Infrastructure of Integrity.</div>
        <div className="pill">
          CDI: Choreography Depth Index™
          <span style={{ borderLeft: "1px solid currentColor", paddingLeft: 10 }}>Patent Pending</span>
        </div>
        <div className="num">01 / 11</div>
      </div>

      {/* 02 — Trust Tax */}
      <div className="s s-black">
        <div className="eye">The Trust Tax</div>
        <div className="hn-metric" style={{ color: "#fff" }}>64%</div>
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(1.1rem,2vw,1.5rem)", opacity: 0.4, marginBottom: 16 }}>
          Execution Capacity Lost.
        </div>
        <div className="rule rule-white" />
        <div className="bod" style={{ color: "#fff" }}>
          This is the measurable cost of uncomputable human variables in the $8T physical economy.
        </div>
        <div className="fn" style={{ color: "#fff" }}>
          Derived from 28 years and 900+ high-stakes coordination events. Includes manual identity verification, history search, liability management, and coordination overhead per execution node.
        </div>
        <div className="num">02 / 11</div>
      </div>

      {/* 03 — Chaos Wall */}
      <div className="s s-off">
        <div className="eye">The Problem</div>
        <div className="hn">The Manual Friction Loop.</div>
        <div className="flow-row">
          {["Identify Node","Verify","Search","Handshake","Underwrite","Manage Chaos"].map((n, i) => (
            <span key={n} style={{ display: "contents" }}>
              <div className="fn-red">{n}</div>
              <span className="arr-red">→</span>
            </span>
          ))}
          <div className="fn-burg">Execute</div>
        </div>
        <div className="bod" style={{ marginTop: 28 }}>
          Software runs on math. The physical world runs on variables. This loop is the Invisible Labor stalling autonomous networks.
        </div>
        <div className="num">03 / 11</div>
      </div>

      {/* 04 — Latency Gap */}
      <div className="s s-white">
        <div className="eye">The Latency Gap</div>
        <div className="hn">90 Days vs. Second Zero.</div>
        <div className="sub">Traditional trust models rely on a 30/60/90-day lag.</div>
        <div className="stack">
          <div className="srow">
            <span className="slbl">The Flaw</span>
            <span className="sbody">Latency is a gift to bad actors. It creates an exploitation window for reputation laundering — where a bad actor resets by changing a name or forming a new LLC.</span>
          </div>
          <div className="srow">
            <span className="slbl">The Shift</span>
            <span className="sbody">In high-stakes execution, trust must be an Instant Behavioral Primitive. Available at second zero. Not retrieved from a trailing audit.</span>
          </div>
        </div>
        <div className="num">04 / 11</div>
      </div>

      {/* 05 — Identity Anchor */}
      <div className="s s-off">
        <div className="eye">The Identity Anchor</div>
        <div className="hn">The SSN for Execution.</div>
        <div className="sub">You cannot reset integrity by changing a name or forming a new LLC.</div>
        <div className="id-box">
          <div className="id-row">
            <div className="id-icon">⚓</div>
            <div>Every agent and operator is anchored to a CDI Identity. History doesn't just follow you — it anchors you. The anchor persists across all legal structures.</div>
          </div>
          <div className="id-row">
            <div className="id-icon">🔗</div>
            <div>New entity formation, name changes, and market pivots are transparent. The system doesn't see Zero — it sees an Unverified Origin, which triggers the Mirror Protocol.</div>
          </div>
          <div className="id-row">
            <div className="id-icon">◈</div>
            <div>The result: a permanent, immutable behavioral foundation. There is no Delete Profile button for integrity.</div>
          </div>
        </div>
        <div className="num">05 / 11</div>
      </div>

      {/* 06 — CDI */}
      <div className="s s-white" style={{ position: "relative", overflow: "hidden" }}>
        <div className="stamp">US PATENT PENDING // REF: 28-YR GROUND TRUTH</div>
        <div className="eye">The Patented Solution</div>
        <div className="cdi-giant">CDI</div>
        <div style={{ fontSize: "clamp(0.9rem,1.6vw,1.2rem)", opacity: 0.4, letterSpacing: "0.06em", marginBottom: 8 }}>
          Choreography Depth Index™
        </div>
        <div className="pill" style={{ marginBottom: 28 }}>Patent Pending</div>
        <div className="bod">The Missing Primitive for Real-World Coordination.</div>
        <div className="g3">
          {[
            { k: "Choreography", v: "Captures the precise sequence and timing of multi-node execution events." },
            { k: "Depth", v: "Ingests high-fidelity behavioral ground truth that pixels and words cannot reach." },
            { k: "Index", v: "A machine-readable standard for underwriting risk in the physical economy." },
          ].map((item, i) => (
            <div key={item.k} className="gc" style={{ borderLeft: i > 0 ? "1px solid #f0f0f0" : "none" }}>
              <div className="gk">{item.k}</div>
              <div className="gv">{item.v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16, fontSize: "0.6rem", letterSpacing: "0.2em", opacity: 0.2, textTransform: "uppercase" }}>
          Briarwood // The Independent Standard
        </div>
        <div className="num">06 / 11</div>
      </div>

      {/* 07 — Mirror Protocol */}
      <div className="s s-off">
        <div className="eye">The Mirror Protocol</div>
        <div className="hn">Recursive Associative Trust.</div>
        <div className="sub">Trust is a network effect. You are the company you keep.</div>
        <div className="mirror-wrap">
          <div style={{ fontSize: "0.6rem", letterSpacing: "0.16em", textTransform: "uppercase", color: B, marginBottom: 12, textAlign: "left" }}>
            Vouching — Cold Start Pedigree
          </div>
          <div className="m-row" style={{ marginBottom: 24 }}>
            <div className="m-node">
              <div className="m-name">Master Agent</div>
              <div className="m-score">CDI 91 — vouches for sub-agent</div>
            </div>
            <span style={{ color: "#ccc", fontSize: "1.1rem" }}>→</span>
            <div className="m-node">
              <div className="m-name">Sub-Agent</div>
              <div className="m-score">Inherits pedigree at deployment</div>
            </div>
          </div>
          <div style={{ fontSize: "0.6rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "#dc2626", marginBottom: 12, textAlign: "left", borderTop: "1px solid #f0f0f0", paddingTop: 20 }}>
            Burn — Failure Reflection
          </div>
          <div className="m-row">
            <div className="m-node-bad">
              <div className="m-name">Master Agent</div>
              <div className="m-burn">CDI penalized instantly</div>
            </div>
            <div className="m-mid">
              <span style={{ fontSize: "1.2rem" }}>⇄</span>
              <span>BURN</span>
            </div>
            <div className="m-node-bad">
              <div className="m-name">Sub-Agent</div>
              <div className="m-burn">Breaks coordination</div>
            </div>
          </div>
        </div>
        <div className="bod" style={{ marginTop: 24 }}>
          High-fidelity operators will refuse to align with bad actors because the Burn to their own CDI is too expensive. The system self-cleans.
        </div>
        <div className="num">07 / 11</div>
      </div>

      {/* 08 — Neutral Arbiter */}
      <div className="s s-burg">
        <div className="eye">The Moat</div>
        <div className="hn">Independence is the Moat.</div>
        <div className="rule rule-white" />
        <div className="sub" style={{ fontStyle: "italic" }}>
          "You don't let the student grade their own paper. You don't have the bank write its own credit report."
        </div>
        <div className="stack">
          <div className="srow-w">
            <span className="slbl-w">The Barrier</span>
            <span className="sbody" style={{ color: "#fff" }}>Agent companies cannot underwrite their own risk. The conflict of interest disqualifies them. Briarwood is the Independent Standard the industry answers to — and cannot replicate.</span>
          </div>
        </div>
        <div className="num">08 / 11</div>
      </div>

      {/* 09 — Why Now */}
      <div className="s s-white">
        <div className="eye">Why Now</div>
        <div className="hn">Computing the Uncomputable.</div>
        <div className="sub">AI has hit the Screen Limit. To enter the physical world, agents need an Action-Conditioned Ledger.</div>
        <div className="stack">
          <div className="srow">
            <span className="slbl">The Bridge</span>
            <span className="sbody">We provide the Choreography — behavioral truth — required to navigate the stochastic messiness of reality. LLMs and Video Models cannot learn this from pixels alone. It must be lived, captured, and indexed.</span>
          </div>
        </div>
        <div className="num">09 / 11</div>
      </div>

      {/* 10 — Execution Integrity */}
      <div className="s s-off">
        <div className="eye">With Briarwood</div>
        <div className="hn">Execution Integrity.</div>
        <div className="flow-row">
          <div className="fn-gray">Identify Node</div>
          <span className="arr" style={{ color: B }}>→</span>
          <div className="fn-burg">Execute</div>
        </div>
        <div className="bod" style={{ marginTop: 28 }}>
          We remove the Trust Tax. By digitizing the handshake, we allow physical networks to move at the speed of software.
        </div>
        <div className="cta-row">
          <a href="mailto:violet@briarwood.ai" className="btn-dark">Request a Demo</a>
          <a href="/demo-landing" className="btn-out">Full Overview</a>
        </div>
        <div className="num">10 / 11</div>
      </div>

      {/* 11 — Philosophy */}
      <div className="s s-black">
        <div className="eye">The Philosophy</div>
        <div className="closing" style={{ color: "#fff" }}>
          Privacy Stays.<br />
          <span style={{ color: B }}>Reputation Runs.</span><br />
          Trust Wins.
        </div>
        <div className="rule rule-white" style={{ marginTop: 28 }} />
        <div className="bod" style={{ color: "#fff" }}>The Human Defense Layer for the High-Stakes Economy.</div>
        <div style={{ marginTop: 56, fontSize: "0.58rem", letterSpacing: "0.2em", opacity: 0.2, textTransform: "uppercase", color: "#fff" }}>
          Briarwood // Founder Led // CDI™ Patent Pending // 2026
        </div>
        <div className="num">11 / 11</div>
      </div>

      <div className="ft">Briarwood</div>
    </div>
  );
}
