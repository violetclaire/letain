import { useLocation } from "wouter";

const SECTIONS = [
  {
    title: "Opt-in from day one",
    body: "Providers choose to be scored. Every data capture is consent-based. No scraping. No surveillance. No behavioral data is collected without the provider knowing and agreeing.",
  },
  {
    title: "Your data stays yours",
    body: "Behavioral signals are captured from existing workflows — Gmail, SMS, phone — but providers control what enters the trust graph. Nothing is harvested. Nothing is sold. Your coordination data is never used to train anyone else's model.",
  },
  {
    title: "Privacy by design",
    body: "Briarwood does not store raw communications. We extract behavioral signals — response speed, follow-through, coordination quality — and discard the content. The score reflects patterns, not conversations.",
  },
  {
    title: "Compliant from day one",
    body: "Built to meet GDPR, CCPA, and SOC 2 standards. Role-based access management, encryption at rest and in transit, full audit logging, and incident response. CDI was designed with compliance as a foundation, not an afterthought.",
  },
  {
    title: "The trust graph is earned, not extracted",
    body: "Every edge in the trust graph represents a real relationship between real professionals. Referrals are verified. Scores are built from actual coordination events. The graph grows through earned trust — the same way reputation has always worked. Except now it's infrastructure that compounds.",
  },
];

export default function Privacy() {
  const [, setLocation] = useLocation();

  return (
    <div style={{ background: "#06070d", color: "#c8d4e8", minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .bw-back {
          display: inline-block;
          font-size: 0.76rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #3a5068;
          cursor: pointer;
          padding: 40px 40px 0;
          transition: color 0.2s;
          background: none;
          border: none;
        }
        .bw-back:hover { color: #8898b0; }

        .bw-article {
          max-width: 680px;
          margin: 0 auto;
          padding: 64px 40px 120px;
        }

        .bw-eyebrow {
          font-size: 0.68rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #3a5068;
          margin-bottom: 32px;
        }

        .bw-headline {
          font-family: 'Fraunces', serif;
          font-size: clamp(1.8rem, 4vw, 2.6rem);
          font-weight: 400;
          line-height: 1.2;
          color: #e8eef8;
          margin-bottom: 32px;
        }

        .bw-lede {
          font-size: 0.95rem;
          line-height: 1.85;
          color: #5a7490;
          margin-bottom: 56px;
          padding-bottom: 56px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .bw-section {
          padding: 40px 0;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .bw-section-title {
          font-family: 'Fraunces', serif;
          font-size: 1.05rem;
          font-weight: 400;
          color: #c8d4e8;
          margin-bottom: 12px;
        }

        .bw-section-body {
          font-size: 0.92rem;
          line-height: 1.82;
          color: #5a7490;
        }

        .bw-cta-wrap {
          margin-top: 64px;
          padding-top: 48px;
        }

        .bw-cta {
          display: inline-block;
          background: #e8eef8;
          color: #06070d;
          padding: 13px 28px;
          font-size: 0.84rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          cursor: pointer;
          border: none;
          transition: background 0.2s;
        }
        .bw-cta:hover { background: #ffffff; }

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
        }

        .bw-footer-meta a {
          color: #4a6480;
          text-decoration: none;
        }
        .bw-footer-meta a:hover { color: #8898b0; }

        @media (max-width: 600px) {
          .bw-back { padding: 24px 20px 0; }
          .bw-article { padding: 48px 20px 80px; }
          .bw-footer { padding: 32px 20px; flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      <button className="bw-back" onClick={() => setLocation("/")}>← Back</button>

      <article className="bw-article">

        <p className="bw-eyebrow">Privacy · Trust Architecture</p>

        <h1 className="bw-headline">Built for an economy that runs on trust</h1>

        <p className="bw-lede">
          Before Briarwood, our founders spent decades inside the physical service economy and building production AI systems for the most demanding environments. We know what trust requires because we've had to earn it — repeatedly. In the field and in the infrastructure.
          <br /><br />
          CDI captures the most sensitive behavioral data in the physical service economy — how people coordinate, communicate, and deliver. That's only possible because privacy and consent are built into our architecture.
        </p>

        {SECTIONS.map((s) => (
          <div className="bw-section" key={s.title}>
            <div className="bw-section-title">{s.title}</div>
            <div className="bw-section-body">{s.body}</div>
          </div>
        ))}

        <div className="bw-cta-wrap">
          <p style={{ fontSize: "1.05rem", fontFamily: "'Fraunces', serif", fontStyle: "italic", color: "#8898b0", marginBottom: "28px" }}>
            The first API for a world that doesn't have one.
          </p>
          <button className="bw-cta" onClick={() => setLocation("/waitlist")}>
            Request Early Access
          </button>
        </div>

      </article>

      <footer className="bw-footer">
        <div className="bw-footer-brand">Briarwood AI</div>
        <div className="bw-footer-meta">
          San Francisco · 2026 · CDI™ Patent Pending ·{" "}
          <a href="mailto:violet@briarwood.ai">violet@briarwood.ai</a> ·{" "}
          <a href="/about" onClick={(e) => { e.preventDefault(); setLocation("/about"); }}>About</a>
        </div>
      </footer>
    </div>
  );
}
