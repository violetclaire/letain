import { useLocation } from "wouter";

export default function About() {
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
          text-decoration: none;
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

        .bw-meta {
          display: flex;
          gap: 48px;
          margin-bottom: 56px;
          flex-wrap: wrap;
        }

        .bw-meta-label {
          font-size: 0.66rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #3a5068;
          margin-bottom: 8px;
        }

        .bw-meta-val {
          font-size: 0.82rem;
          color: #6a8098;
          line-height: 1.7;
        }

        .bw-headline {
          font-family: 'Fraunces', serif;
          font-size: clamp(1.8rem, 4vw, 2.8rem);
          font-weight: 400;
          line-height: 1.2;
          color: #e8eef8;
          margin-bottom: 48px;
          letter-spacing: -0.3px;
        }

        .bw-prose p {
          font-size: 0.95rem;
          line-height: 1.85;
          color: #6a8098;
          margin-bottom: 24px;
        }

        .bw-prose h2 {
          font-family: 'Fraunces', serif;
          font-size: 1.15rem;
          font-weight: 400;
          color: #c8d4e8;
          margin: 48px 0 16px;
        }

        .bw-prose ul {
          margin: 0 0 24px 0;
          padding: 0;
          list-style: none;
        }

        .bw-prose ul li {
          font-size: 0.92rem;
          line-height: 1.8;
          color: #6a8098;
          padding-left: 20px;
          position: relative;
          margin-bottom: 10px;
        }

        .bw-prose ul li::before {
          content: "—";
          position: absolute;
          left: 0;
          color: #2a3848;
        }

        .bw-cta-wrap {
          margin-top: 64px;
          padding-top: 48px;
          border-top: 1px solid rgba(255,255,255,0.06);
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

        <div className="bw-meta">
          <div>
            <div className="bw-meta-label">Date</div>
            <div className="bw-meta-val">Mar 2026</div>
          </div>
          <div>
            <div className="bw-meta-label">Authors</div>
            <div className="bw-meta-val">Violet Herod<br />Dundy Pasupuleti</div>
          </div>
          <div>
            <div className="bw-meta-label">Role</div>
            <div className="bw-meta-val">Founder & CEO<br />Co-Founder & CTO</div>
          </div>
        </div>

        <h1 className="bw-headline">
          Introducing Briarwood AI — The first behavioral trust API for the physical service economy
        </h1>

        <div className="bw-prose">
          <p>
            The best professionals in the physical service economy have built something over years and decades that's impossible to replicate: a reputation earned through thousands of real interactions. It lives in referral networks, text threads, repeat bookings, and the memory of every client who saw them show up and deliver under pressure. That accumulated trust is their edge.
          </p>
          <p>
            The problem is, it's invisible. It's not captured anywhere. It's not scored, not indexed, not queryable. And the systems that claim to measure reputation — followers, likes, star ratings — measure performance for an algorithm, not performance on the job. The physical service economy is a $20T market running on mimetic reputation signals with no behavioral ground truth.
          </p>
          <p>
            Meanwhile, agents are making every other economic decision. They select software products, route payments, underwrite risk. But the moment they need to select a human service provider, they go blind. There is no API to call. The endpoint returns a 404. The data was never captured because no one who understood the problem was in a position to build the solution.
          </p>
          <p>
            That's the challenge we're taking on at Briarwood AI.
          </p>
          <p>
            We're building CDI — a real-time behavioral trust score and API for the physical service economy. Not a review. Not a rating. Behavioral ground truth. We're launching with early traction across live provider networks, 100% organic growth, and a patent-pending scoring framework. We believe this is the missing infrastructure layer for the agentic economy.
          </p>
          <p>
            We set out on this mission knowing we'd need to do three things. First, capture behavioral signals from real coordination events — response speed, follow-through, handoff quality, execution under pressure — without changing how providers work. Second, turn those signals into a machine-readable trust score that compounds with every interaction. And third, make that score queryable by any agent, platform, or system that needs to operate in the physical world.
          </p>
          <p>
            Trust in the physical economy has never been formalized. It's always been word of mouth. That worked when humans were making every decision. It doesn't work when agents need to act autonomously in the real world. Someone has to build the infrastructure that makes trust legible to machines. That's what CDI does.
          </p>

          <h2>How CDI drives better decisions</h2>
          <p>
            We're working with providers who have built their reputations over decades. With Briarwood, their behavioral track record becomes a compounding asset instead of something that fades with every algorithm change.
          </p>
          <p>
            Inquiry routing captures the first trust signal the moment a new client reaches out. How fast does the provider respond? Do they follow through on what they said they'd do? CDI starts scoring before any contract is signed.
          </p>
          <p>
            Multi-provider coordination measures the hardest thing to fake: how well someone hands off to another professional under pressure. Complex jobs require seamless transitions between providers. CDI scores the quality of that coordination in real time.
          </p>
          <p>
            Referral networks map who trusts whom and who actually delivers. This is the private graph that cannot be scraped — the trust relationships built over years of working together. Every referral that leads to a successful outcome deepens the graph.
          </p>
          <p>
            Deposit and execution closes the loop. Money is on the line. CDI tracks whether providers do what they committed to when it actually counts. The score reflects reality, not intentions.
          </p>

          <h2>How Briarwood works</h2>
          <ul>
            <li>We capture signals from existing workflows: Gmail, SMS, phone. Zero change to how providers work. No new apps. No onboarding friction. Work happens, and CDI listens.</li>
            <li>We score behavior in real time. Every coordination event updates the score. Response integrity, commitment depth, handoff quality, and outcome signals are weighted and compounded. The score gets more accurate with every interaction.</li>
            <li>We make trust queryable. Integrate the CDI API into your platform, agent system, or coordination software. Pass a provider ID, get back a behavioral trust score. Real-time, per decision.</li>
            <li>The network compounds organically. One provider brings 3–5 from their trusted network. No paid acquisition. The trust graph grows the same way reputation has always grown — through earned relationships. Except now it's infrastructure.</li>
          </ul>

          <h2>Why we're building this</h2>
          <p>
            We've both spent time in environments where getting it right matters more than getting it fast — and seen what happens when the data layer doesn't exist.
          </p>
          <p>
            Violet spent her entire adult life operating inside the physical service economy, coordinating high-stakes events where trust was the only currency. She built her reputation the way every great professional does: by showing up and delivering, thousands of times, with no system ever capturing that proof. She taught herself to code to solve the coordination problems she experienced firsthand. The CDI framework originated as a manual system she ran for years before encoding it into software.
          </p>
          <p>
            Dundy brings deep expertise in AI/ML infrastructure at scale. As an AI Ops Engineer at Apple, he builds the ML workflows, GPU-optimized inference pipelines, and Kubernetes platforms that make AI systems reliable in production. He's architected secure, compliant systems across healthcare, privacy, and network infrastructure. At Briarwood, he's building the engine that turns behavioral signals into a machine-readable trust score that agents can query in real time.
          </p>
          <p>
            We are the team with both the operational ground truth and the technical architecture to digitize coordination. We believe we're building the infrastructure layer that makes the physical world legible to AI for the first time. And we believe the window to build it is right now.
          </p>
        </div>

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
          <a href="/privacy" onClick={(e) => { e.preventDefault(); setLocation("/privacy"); }}>Privacy</a>
        </div>
      </footer>
    </div>
  );
}
