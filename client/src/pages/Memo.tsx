import { useEffect, useState } from "react";

const BLUE  = "#00cfff";
const RED   = "#ff2d55";
const BG    = "#050810";
const SURF  = "#090d1a";
const TEXT  = "#c8d8ff";
const FAINT = "rgba(200,216,255,0.55)";
const DIM   = "rgba(200,216,255,0.32)";

const isPrint = () =>
  typeof window !== "undefined" && new URLSearchParams(window.location.search).has("print");

function GridBg() {
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
      backgroundImage: `linear-gradient(${BLUE}08 1px, transparent 1px), linear-gradient(90deg, ${BLUE}08 1px, transparent 1px)`,
      backgroundSize: "44px 44px",
    }} />
  );
}

function Corners() {
  const mk = (s: React.CSSProperties) => (
    <div style={{ position: "absolute", width: 18, height: 18, ...s }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 18, height: 1, background: BLUE, boxShadow: `0 0 6px ${BLUE}` }} />
      <div style={{ position: "absolute", top: 0, left: 0, width: 1, height: 18, background: BLUE, boxShadow: `0 0 6px ${BLUE}` }} />
    </div>
  );
  return <>
    {mk({ top: 14, left: 14 })}
    {mk({ top: 14, right: 14, transform: "scaleX(-1)" })}
    {mk({ bottom: 14, left: 14, transform: "scaleY(-1)" })}
    {mk({ bottom: 14, right: 14, transform: "scale(-1)" })}
  </>;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{
        fontFamily: "'Courier New', monospace", fontSize: "8px",
        letterSpacing: "0.22em", textTransform: "uppercase",
        color: BLUE, textShadow: `0 0 6px ${BLUE}`,
        borderTop: `1px solid ${BLUE}30`, paddingTop: 6, marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: "'Inter', sans-serif", fontSize: "9.5px",
        color: TEXT, lineHeight: 1.55,
      }}>
        {children}
      </div>
    </div>
  );
}

export default function Memo() {
  const [printMode, setPrintMode] = useState(false);
  useEffect(() => { setPrintMode(isPrint()); }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: ${printMode ? BG : "#1a1d28"}; }

        .memo-page {
          width: 8.5in; min-height: 11in; max-height: 11in;
          background: ${BG}; color: ${TEXT};
          padding: 0.55in 0.6in;
          position: relative; overflow: hidden;
          margin: ${printMode ? "0" : "32px auto"};
          box-shadow: ${printMode ? "none" : "0 8px 40px rgba(0,0,0,0.6)"};
        }

        .memo-h1 {
          font-family: 'Inter', sans-serif; font-weight: 800;
          font-size: 28px; letter-spacing: -1.2px; line-height: 1;
          color: ${TEXT}; text-shadow: 0 0 18px ${BLUE}40;
        }
        .memo-sub {
          font-family: 'Inter', sans-serif; font-weight: 600;
          font-size: 12px; color: ${TEXT}; letter-spacing: -0.2px;
          margin-top: 6px;
        }
        .memo-eye {
          font-family: 'Courier New', monospace; font-size: 8px;
          letter-spacing: 0.22em; text-transform: uppercase;
          color: ${BLUE}; text-shadow: 0 0 8px ${BLUE};
          display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
        }
        .memo-eye::before, .memo-eye::after {
          content: ""; flex: 0 0 14px; height: 1px;
          background: ${BLUE}; box-shadow: 0 0 4px ${BLUE};
        }
        .memo-lede {
          font-family: 'Inter', sans-serif; font-size: 11px;
          color: ${TEXT}; line-height: 1.55; margin-top: 14px;
          padding: 12px 14px; border: 1px solid ${BLUE}30;
          background: ${SURF}cc; box-shadow: 0 0 12px ${BLUE}10;
        }

        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .grid-2 > div { background: ${SURF}cc; padding: 10px 12px; border-top: 1px solid ${BLUE}30; }

        .memo-foot {
          position: absolute; left: 0.6in; right: 0.6in; bottom: 0.42in;
          display: flex; justify-content: space-between; align-items: center;
          font-family: 'Courier New', monospace; font-size: 7.5px;
          letter-spacing: 0.18em; text-transform: uppercase;
          color: ${BLUE}80; text-shadow: 0 0 6px ${BLUE}40;
          padding-top: 8px; border-top: 1px solid ${BLUE}25;
        }

        ${printMode ? `
          @page { size: 8.5in 11in; margin: 0; }
          .memo-page { margin: 0 !important; box-shadow: none !important; }
        ` : ""}
      `}</style>

      <div className="memo-page">
        <GridBg />
        <Corners />

        <div style={{ position: "relative", zIndex: 2 }}>
          <div className="memo-eye">
            Investor Memo · Pre-Seed · 2026
          </div>
          <div className="memo-h1">BRIARWOOD AI</div>
          <div className="memo-sub">The FICO score for real-world execution.</div>

          <div className="memo-lede">
            Today, trust verification is manual: DMs, referrals, reviews, gut checks. Briarwood replaces it with a machine-readable CDI score agents query before routing work or releasing payment. The workflow is the wedge. The behavioral data flywheel is the moat. The CDI API is the infrastructure layer.
          </div>

          <div style={{ marginTop: 12, fontFamily: "'Inter', sans-serif", fontSize: "9.5px", color: FAINT, lineHeight: 1.55 }}>
            Trust verification in the real-world service economy is still manual labor: DMs, screenshots, backchannel calls, gut checks. AI agents inherit the same broken process. Public signals like reviews, SEO, websites, and social profiles do not prove execution, reliability, recovery, or trust under pressure. <span style={{ color: TEXT, fontWeight: 600 }}>That is why the agentic web stops at the screen.</span>
            <br /><br />
            Briarwood solves this by capturing the trust signals that already exist inside real service transactions: responsiveness, timing, handoffs, follow-through, recovery, payment behavior, execution outcomes. From those signals, we generate the <span style={{ color: BLUE, fontWeight: 700, textShadow: `0 0 6px ${BLUE}` }}>Coordination Depth Index, or CDI</span>: a structured trust signal with reason codes, risk flags, and routing recommendations agents and platforms can query before routing work or releasing payment.
          </div>

          <Section label="The Wedge · Network Recapture">
            The real-world service economy already has demand and trusted operators. What it lacks is a machine-readable coordination layer. A single high-trust operator can receive <span style={{ color: TEXT, fontWeight: 700 }}>700+ inbound inquiries per year</span> but execute only a fraction. The rest leaks into DMs, unverified referrals, and word of mouth. Briarwood gives operators free coordination software to manage inquiries, availability, referrals, handoffs, and payments. Every verified handoff creates behavioral data. Every transaction updates CDI. The network gets smarter with every job.
          </Section>

          <Section label="Why Now">
            Agent commerce is moving from search and recommendation toward execution. Agents cannot safely transact in the real-world economy without a trust layer. <span style={{ color: TEXT, fontWeight: 600 }}>The model should not spend tokens guessing who to trust. It should query Briarwood.</span>
          </Section>

          <Section label="Business Model · Sell the Outcome, Not the Tool">
            <div style={{ marginBottom: 6, fontSize: "9px", color: FAINT, lineHeight: 1.5 }}>
              Operators get free coordination software because the workflow captures invisible labor. Agents and platforms pay for the trust outcome: CDI lookup, routing confidence, payment guidance.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 4 }}>
              {[
                ["1.5%", "Transaction fee on verified routed work"],
                ["API", "CDI lookups for agents and platforms"],
                ["License", "Private networks and agent fleets"],
                ["Settlement", "Payment release, underwriting, risk pricing"],
              ].map(([k, v]) => (
                <div key={k} style={{ background: `${SURF}cc`, padding: "8px 10px", borderTop: `1px solid ${BLUE}30` }}>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: "13px", color: TEXT, textShadow: `0 0 6px ${BLUE}40` }}>{k}</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", color: DIM, marginTop: 2, lineHeight: 1.4 }}>{v}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section label="Distribution · Founder Network">
            Briarwood does not start with paid ads or cold outbound. It starts inside a 28-year trust-gated operator network across Bay Area and Napa service markets. The first 250 providers are not cold-start customers. They are <span style={{ color: TEXT, fontWeight: 600 }}>referral-graph expansion</span> from relationships where trust already moves. Distribution is a prerequisite, not an afterthought.
          </Section>

          <Section label="Moat">
            <span style={{ color: TEXT, fontWeight: 600 }}>The labs cannot scrape what never reached the internet.</span> Briarwood is built on 28 years of high-stakes coordination from a trust-gated service network. Recent internal analysis of 15 years of records produced <span style={{ color: BLUE, fontWeight: 700 }}>222 behavioral signals</span> and scored <span style={{ color: BLUE, fontWeight: 700 }}>27 real actors</span>. This is private behavioral data: latency, follow-through, handoffs, recovery under pressure, execution integrity. It cannot be scraped, synthesized, or bought from the public web.
          </Section>

          <Section label="Team · I Lived the Manual Trust Layer">
            <div className="grid-2" style={{ marginTop: 4 }}>
              <div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "10.5px", color: TEXT, letterSpacing: "-0.2px" }}>Violet Herod</div>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: "7.5px", letterSpacing: "0.14em", textTransform: "uppercase", color: BLUE, marginTop: 2, marginBottom: 4 }}>Founder & CEO</div>
                <div style={{ fontSize: "8.5px", color: FAINT, lineHeight: 1.5 }}>
                  For 28 years, manually verified who could execute, who could be trusted, who could recover under pressure, and who deserved the next handoff. Briarwood turns that lived operating system into CDI. $1M+ lifetime operator revenue. Zero paid acquisition.
                </div>
              </div>
              <div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "10.5px", color: TEXT, letterSpacing: "-0.2px" }}>Technical Architecture</div>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: "7.5px", letterSpacing: "0.14em", textTransform: "uppercase", color: BLUE, marginTop: 2, marginBottom: 4 }}>Coordination Engine</div>
                <div style={{ fontSize: "8.5px", color: FAINT, lineHeight: 1.5 }}>
                  Deterministic coordination assessment, signal provenance, operator oversight, and safe handoff review for real-world service networks.
                </div>
              </div>
            </div>
          </Section>

          <Section label="Raise · $750K Pre-Seed · 12 Months">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5, marginTop: 4 }}>
              {[
                "Harden CDI scoring engine and production API",
                "Onboard 250 verified service operators",
                "Launch first agent / platform pilots",
                "Prepare SOC 2 readiness",
                "Scale the SF / Napa high-trust services wedge",
              ].map((t, i) => (
                <div key={i} style={{ border: `1px solid ${BLUE}25`, padding: "6px 8px", background: `${SURF}80` }}>
                  <div style={{ fontFamily: "'Courier New', monospace", fontSize: "7px", letterSpacing: "0.16em", color: BLUE, textShadow: `0 0 4px ${BLUE}`, marginBottom: 3 }}>0{i + 1}</div>
                  <div style={{ fontSize: "8px", color: FAINT, lineHeight: 1.4 }}>{t}</div>
                </div>
              ))}
            </div>
          </Section>

          <div style={{
            marginTop: 14, padding: "10px 14px",
            border: `1px solid ${BLUE}50`, borderLeft: `3px solid ${BLUE}`,
            background: `${SURF}cc`, boxShadow: `0 0 12px ${BLUE}15`,
            fontFamily: "'Inter', sans-serif", fontSize: "10px",
            color: TEXT, fontStyle: "italic", lineHeight: 1.5,
          }}>
            The first agent that can safely hire and pay humans in the real world will need a trust substrate. Briarwood is building it. <span style={{ color: BLUE, fontWeight: 600, fontStyle: "normal", textShadow: `0 0 6px ${BLUE}` }}>It is the trust layer that lets agents leave the browser.</span>
          </div>
        </div>

        <div className="memo-foot">
          <span>Briarwood AI · briarwood.ai</span>
          <span>violet@briarwood.ai</span>
          <span>CDI™ Patent Pending</span>
        </div>
      </div>
    </>
  );
}
