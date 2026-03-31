import { useLocation } from "wouter";

const NAV = [
  { label: "About", href: "/about" },
  { label: "Sign In", href: "/login" },
];

const HOW_IT_WORKS = [
  {
    index: "01",
    title: "Inquiry routing",
    body: "A new inquiry arrives. CDI captures the first trust signal immediately — response speed, follow-through on quotes, commitment to next steps. The score starts building before any contract is signed.",
  },
  {
    index: "02",
    title: "Multi-provider coordination",
    body: "Complex jobs require handoffs between providers. CDI measures how cleanly one provider transitions to the next — the signal that separates professionals from participants.",
  },
  {
    index: "03",
    title: "Referral networks",
    body: "Who trusts whom and who actually delivers. CDI maps the private graph that cannot be scraped — the trust relationships that took decades to build.",
  },
  {
    index: "04",
    title: "Deposit and execution",
    body: "Money is on the line. CDI tracks whether providers do what they committed to when it actually counts. The loop closes. The score reflects reality, not intentions.",
  },
];

const THREE_ACTS = [
  {
    heading: "Behavior becomes score",
    body: "CDI captures coordination behavior from existing workflows — Gmail, SMS, phone. Zero change to how providers work. Every action updates the score in real time. Trust is earned through behavior, not profiles.",
  },
  {
    heading: "Score becomes search",
    body: "Integrate the CDI API into your platform, agent system, or coordination software. Pass a provider ID, get back a behavioral trust score. Real-time, per decision.",
  },
  {
    heading: "Search makes action safer",
    body: "Agents act with confidence. Platforms verify before they pay. The physical economy becomes accessible for the first time.",
  },
];

const BUILT_FOR = [
  {
    label: "Platforms that coordinate human services",
    body: "Marketplaces, staffing platforms, home services apps — anywhere you match a client with a provider and need to know the job will actually get done.",
  },
  {
    label: "Operators managing distributed workforces",
    body: "General contractors, franchise operators, field service companies — teams where trust and reliability vary and the cost of a bad hire is real.",
  },
  {
    label: "AI systems entering the physical economy",
    body: "Agent platforms and coordination software that need a structured, machine-readable signal to operate in the real world — not just the digital one.",
  },
];

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div style={{ background: "#06070d", color: "#c8d4e8", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=Inter:wght@400;500;600&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .bw-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 40px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(6,7,13,0.85);
          backdrop-filter: blur(12px);
        }

        .bw-logo {
          font-family: 'Fraunces', serif;
          font-size: 1rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #e8eef8;
        }

        .bw-nav-links {
          display: flex;
          gap: 32px;
          list-style: none;
        }

        .bw-nav-links a {
          color: #8898b0;
          text-decoration: none;
          font-size: 0.82rem;
          letter-spacing: 0.06em;
          transition: color 0.2s;
        }
        .bw-nav-links a:hover { color: #c8d4e8; }

        .bw-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 0 40px;
        }

        /* Hero */
        .bw-hero {
          padding: 180px 40px 120px;
          max-width: 800px;
          margin: 0 auto;
        }

        .bw-hero-label {
          font-size: 0.72rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #4a6480;
          margin-bottom: 32px;
        }

        .bw-hero h1 {
          font-family: 'Fraunces', serif;
          font-size: clamp(2.4rem, 5vw, 4rem);
          font-weight: 400;
          line-height: 1.15;
          color: #e8eef8;
          margin-bottom: 28px;
          letter-spacing: -0.5px;
        }

        .bw-hero-sub {
          font-size: 1.05rem;
          line-height: 1.75;
          color: #7a90a8;
          max-width: 560px;
          margin-bottom: 48px;
        }

        .bw-cta {
          display: inline-block;
          background: #e8eef8;
          color: #06070d;
          padding: 13px 28px;
          font-size: 0.84rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-decoration: none;
          cursor: pointer;
          border: none;
          transition: background 0.2s, opacity 0.2s;
        }
        .bw-cta:hover { background: #ffffff; }

        .bw-cta-ghost {
          display: inline-block;
          border: 1px solid rgba(200,212,232,0.2);
          color: #c8d4e8;
          padding: 13px 28px;
          font-size: 0.84rem;
          font-weight: 500;
          letter-spacing: 0.04em;
          text-decoration: none;
          cursor: pointer;
          background: transparent;
          transition: border-color 0.2s, color 0.2s;
          margin-left: 12px;
        }
        .bw-cta-ghost:hover { border-color: rgba(200,212,232,0.5); color: #e8eef8; }

        /* Divider */
        .bw-divider {
          border: none;
          border-top: 1px solid rgba(255,255,255,0.06);
          margin: 0;
        }

        /* Sections */
        .bw-section {
          padding: 100px 40px;
          max-width: 800px;
          margin: 0 auto;
        }

        .bw-section-label {
          font-size: 0.68rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #3a5068;
          margin-bottom: 56px;
        }

        /* How CDI works */
        .bw-how-grid {
          display: grid;
          gap: 48px;
        }

        .bw-how-item {
          display: grid;
          grid-template-columns: 36px 1fr;
          gap: 24px;
        }

        .bw-how-index {
          font-size: 0.65rem;
          letter-spacing: 0.14em;
          color: #3a5068;
          padding-top: 4px;
        }

        .bw-how-title {
          font-family: 'Fraunces', serif;
          font-size: 1.1rem;
          font-weight: 400;
          color: #e8eef8;
          margin-bottom: 10px;
        }

        .bw-how-body {
          font-size: 0.9rem;
          line-height: 1.75;
          color: #6a8098;
        }

        /* Three acts */
        .bw-acts {
          display: grid;
          gap: 0;
        }

        .bw-act {
          padding: 40px 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          align-items: start;
        }

        .bw-act:first-child { border-top: 1px solid rgba(255,255,255,0.06); }

        .bw-act-heading {
          font-family: 'Fraunces', serif;
          font-size: 1.15rem;
          font-weight: 400;
          color: #c8d4e8;
          line-height: 1.3;
        }

        .bw-act-body {
          font-size: 0.88rem;
          line-height: 1.8;
          color: #5a7490;
        }

        /* Built for */
        .bw-built-grid {
          display: grid;
          gap: 32px;
        }

        .bw-built-item {
          padding: 28px 32px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.015);
        }

        .bw-built-label {
          font-family: 'Fraunces', serif;
          font-size: 1rem;
          font-weight: 400;
          color: #c8d4e8;
          margin-bottom: 10px;
        }

        .bw-built-body {
          font-size: 0.86rem;
          line-height: 1.75;
          color: #5a7490;
        }

        /* Team */
        .bw-team-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
        }

        .bw-team-name {
          font-family: 'Fraunces', serif;
          font-size: 1rem;
          font-weight: 400;
          color: #c8d4e8;
          margin-bottom: 4px;
        }

        .bw-team-role {
          font-size: 0.72rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #3a5068;
          margin-bottom: 14px;
        }

        .bw-team-bio {
          font-size: 0.86rem;
          line-height: 1.75;
          color: #5a7490;
        }

        /* Closing */
        .bw-close {
          padding: 120px 40px;
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
        }

        .bw-close-headline {
          font-family: 'Fraunces', serif;
          font-size: clamp(1.6rem, 3vw, 2.4rem);
          font-weight: 300;
          font-style: italic;
          color: #8898b0;
          margin-bottom: 48px;
          line-height: 1.4;
        }

        /* Footer */
        .bw-footer {
          border-top: 1px solid rgba(255,255,255,0.06);
          padding: 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .bw-footer-brand {
          font-family: 'Fraunces', serif;
          font-size: 0.82rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #3a5068;
        }

        .bw-footer-meta {
          font-size: 0.74rem;
          color: #3a5068;
          letter-spacing: 0.04em;
        }

        .bw-footer-meta a {
          color: #4a6480;
          text-decoration: none;
        }
        .bw-footer-meta a:hover { color: #8898b0; }

        @media (max-width: 600px) {
          .bw-nav { padding: 16px 20px; }
          .bw-hero { padding: 140px 20px 80px; }
          .bw-section { padding: 72px 20px; }
          .bw-act { grid-template-columns: 1fr; gap: 16px; }
          .bw-team-grid { grid-template-columns: 1fr; }
          .bw-close { padding: 80px 20px; }
          .bw-footer { padding: 32px 20px; flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      {/* Nav */}
      <nav className="bw-nav">
        <div className="bw-logo">Briarwood AI</div>
        <ul className="bw-nav-links">
          {NAV.map((n) => (
            <li key={n.href}>
              <a href={n.href} onClick={(e) => { e.preventDefault(); setLocation(n.href); }}>
                {n.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Hero */}
      <div className="bw-hero">
        <p className="bw-hero-label">CDI · Patent Pending · Pre-Seed 2026</p>
        <h1>The behavioral trust layer for the physical service economy.</h1>
        <p className="bw-hero-sub">
          The $20T physical economy has no API for trust. Agents can make every other economic decision — but go blind the moment they need to select a human service provider. CDI is the missing endpoint. A machine-readable behavioral trust score built from real coordination, not reviews, not ratings, not followers.
        </p>
        <button className="bw-cta" onClick={() => setLocation("/waitlist")}>
          Request Early Access
        </button>
        <a className="bw-cta-ghost" href="/about" onClick={(e) => { e.preventDefault(); setLocation("/about"); }}>
          Read about CDI
        </a>
      </div>

      <hr className="bw-divider" />

      {/* How CDI is already live */}
      <div className="bw-section">
        <p className="bw-section-label">Briarwood in action · Where CDI is already live</p>
        <div className="bw-how-grid">
          {HOW_IT_WORKS.map((item) => (
            <div className="bw-how-item" key={item.index}>
              <div className="bw-how-index">{item.index}</div>
              <div>
                <div className="bw-how-title">{item.title}</div>
                <div className="bw-how-body">{item.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <hr className="bw-divider" />

      {/* Three acts */}
      <div className="bw-section">
        <p className="bw-section-label">How it works</p>
        <div className="bw-acts">
          {THREE_ACTS.map((act) => (
            <div className="bw-act" key={act.heading}>
              <div className="bw-act-heading">{act.heading}</div>
              <div className="bw-act-body">{act.body}</div>
            </div>
          ))}
        </div>
      </div>

      <hr className="bw-divider" />

      {/* Built for */}
      <div className="bw-section">
        <p className="bw-section-label">Built for</p>
        <div className="bw-built-grid">
          {BUILT_FOR.map((item) => (
            <div className="bw-built-item" key={item.label}>
              <div className="bw-built-label">{item.label}</div>
              <div className="bw-built-body">{item.body}</div>
            </div>
          ))}
        </div>
      </div>

      <hr className="bw-divider" />

      {/* Team */}
      <div className="bw-section">
        <p className="bw-section-label">The team</p>
        <div className="bw-team-grid">
          <div>
            <div className="bw-team-name">Violet Herod</div>
            <div className="bw-team-role">Founder & CEO</div>
            <div className="bw-team-bio">Built the wedge. Owns the network. Designed the scoring framework. Filed the patent.</div>
          </div>
          <div>
            <div className="bw-team-name">Dundy Pasupuleti</div>
            <div className="bw-team-role">Co-Founder & CTO</div>
            <div className="bw-team-bio">AI Ops Engineer at Apple. Building ML infrastructure at scale. Architecting the engine that turns behavior into a machine-readable signal.</div>
          </div>
        </div>
      </div>

      <hr className="bw-divider" />

      {/* Closing CTA */}
      <div className="bw-close">
        <p className="bw-close-headline">The first API for a world that doesn't have one.</p>
        <button className="bw-cta" onClick={() => setLocation("/waitlist")}>
          Request Early Access
        </button>
      </div>

      {/* Footer */}
      <footer className="bw-footer">
        <div className="bw-footer-brand">Briarwood AI</div>
        <div className="bw-footer-meta">
          San Francisco · 2026 · CDI™ Patent Pending ·{" "}
          <a href="mailto:violet@briarwood.ai">violet@briarwood.ai</a> ·{" "}
          <a href="/privacy" onClick={(e) => { e.preventDefault(); setLocation("/privacy"); }}>Privacy</a> ·{" "}
          <a href="/about" onClick={(e) => { e.preventDefault(); setLocation("/about"); }}>About</a>
        </div>
      </footer>
    </div>
  );
}
