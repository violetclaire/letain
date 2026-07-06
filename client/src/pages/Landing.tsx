import { useEffect } from "react";
import { useLocation } from "wouter";

const PROOF = [
  "Who responded.",
  "Who followed through.",
  "Who closed the loop.",
  "Who recovered when reality changed.",
];

const NOT = ["Not a review.", "Not a profile.", "Not a guess."];

export default function Landing() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = "Briarwood AI · The FICO for Real-World Execution";
  }, []);

  const goAccess = () => setLocation("/signup");
  const goDemo = () => setLocation("/spec");

  return (
    <div className="relative min-h-screen bg-bg text-ink font-sans" data-testid="page-landing">
      {/* Pinstripe overlay (vertical suiting lines) */}
      <div className="estate-pinstripe" aria-hidden />

      {/* NAV */}
      <header className="relative z-20 border-b border-hairline bg-bg/85 backdrop-blur-sm">
        <div className="estate-container flex items-center justify-between py-6">
          <button
            onClick={() => setLocation("/")}
            data-testid="link-brand"
            className="font-serif text-[0.95rem] uppercase tracking-[0.22em] text-ink hover:text-oxblood transition-colors"
          >
            Briarwood
          </button>
          <nav className="flex items-center gap-8 text-[0.78rem] uppercase tracking-[0.18em] text-mutedink">
            <a
              href="/spec"
              data-testid="link-nav-cdi"
              onClick={(e) => {
                e.preventDefault();
                setLocation("/spec");
              }}
              className="hover:text-ink underline-offset-4 hover:underline"
            >
              CDI
            </a>
            <a
              href="/about"
              data-testid="link-nav-about"
              onClick={(e) => {
                e.preventDefault();
                setLocation("/about");
              }}
              className="hover:text-ink underline-offset-4 hover:underline"
            >
              About
            </a>
            <a
              href="/login"
              data-testid="link-nav-signin"
              onClick={(e) => {
                e.preventDefault();
                setLocation("/login");
              }}
              className="hover:text-ink underline-offset-4 hover:underline"
            >
              Sign In
            </a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="relative z-10 pt-24 pb-28 sm:pt-36 sm:pb-36">
        <div className="estate-container">
          <div className="max-w-[820px]">
            <div className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-brass mb-10">
              <span className="inline-block w-8 h-px align-middle bg-brass mr-3" />
              Trust Infrastructure · Real-World Economy
            </div>

            <h1
              className="font-serif font-light text-ink leading-[1.04] tracking-tight"
              style={{ fontSize: "clamp(2.6rem, 6.8vw, 5.4rem)" }}
              data-testid="text-hero-headline"
            >
              Briarwood AI
            </h1>

            <div
              className="font-serif italic text-mutedink mt-4"
              style={{ fontSize: "clamp(1.4rem, 3vw, 2.1rem)", lineHeight: 1.2 }}
              data-testid="text-hero-tagline"
            >
              The FICO for Real-World Execution.
            </div>

            <div className="h-px w-24 bg-ink/30 my-10" />

            <p
              className="font-serif text-ink"
              style={{ fontSize: "clamp(1.2rem, 2vw, 1.55rem)", lineHeight: 1.45 }}
              data-testid="text-hero-pull"
            >
              Trust is not a profile. Trust is the result of action.
            </p>

            <p
              className="mt-6 text-mutedink max-w-[60ch]"
              style={{ fontSize: "1.05rem", lineHeight: 1.7 }}
              data-testid="text-hero-body"
            >
              Briarwood turns real-world coordination behavior into the machine-readable
              trust signal agents need before routing work or releasing payment.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                onClick={goAccess}
                data-testid="button-request-access-hero"
                className="px-7 py-3 bg-ink text-bg text-[0.92rem] tracking-wide hover:bg-oxblood transition-colors"
              >
                Request Access
              </button>
              <button
                onClick={goDemo}
                data-testid="button-view-demo-hero"
                className="px-7 py-3 border border-hairline text-ink text-[0.92rem] tracking-wide hover:bg-surface transition-colors"
              >
                View CDI Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <Section eye="01 · The Problem">
        <Headline>Agents are trapped at search.</Headline>
        <Lead>AI agents can find options. They cannot verify who will actually execute.</Lead>
        <Body>
          Today, they rely on public signals: reviews, websites, social profiles,
          credentials, and search rankings.
        </Body>
        <Body>
          Those signals were built for discovery. They were not built for trust.
        </Body>
      </Section>

      {/* MISSING LAYER */}
      <Section eye="02 · The Missing Layer" alt>
        <Headline>The missing layer is trust.</Headline>
        <Lead>Every real-world transaction creates proof:</Lead>
        <ul className="mt-4 max-w-[60ch]">
          {PROOF.map((line, i) => (
            <li
              key={i}
              className="flex items-baseline gap-5 py-3 border-b border-hairline last:border-b-0"
              data-testid={`text-proof-${i}`}
            >
              <span className="font-mono text-[0.72rem] tracking-[0.2em] text-brass min-w-[1.5rem]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className="font-serif text-ink"
                style={{ fontSize: "1.18rem", lineHeight: 1.5 }}
              >
                {line}
              </span>
            </li>
          ))}
        </ul>
        <Body className="mt-8">
          But those signals are trapped inside private coordination. They live in DMs,
          calendars, phone calls, and follow-ups that never reach the public web.
        </Body>
        <Body>
          Briarwood captures the trust created through action and turns it into{" "}
          <span className="text-oxblood font-semibold">CDI</span>.
        </Body>
      </Section>

      {/* CDI LOOKUP */}
      <Section eye="03 · The Trust Lookup">
        <Headline>CDI is the trust score agents query before action.</Headline>
        <Lead>An agent needs to know:</Lead>
        <blockquote
          className="mt-6 mb-8 pl-6 border-l-2 border-oxblood font-serif italic text-ink max-w-[60ch]"
          style={{ fontSize: "clamp(1.25rem, 2.2vw, 1.65rem)", lineHeight: 1.4 }}
          data-testid="text-agent-question"
        >
          Can this counterparty be trusted for this transaction, in this context, right
          now?
        </blockquote>
        <Body>Briarwood answers with a machine-readable trust signal.</Body>
        <div className="mt-6 flex flex-wrap items-center gap-x-10 gap-y-3">
          {NOT.map((line, i) => (
            <span
              key={i}
              className={
                i === 2
                  ? "font-serif italic text-oxblood text-[1.15rem]"
                  : "font-serif italic text-faintink text-[1.05rem]"
              }
              data-testid={`text-not-${i}`}
            >
              {line}
            </span>
          ))}
        </div>
      </Section>

      {/* TWO SIDES */}
      <Section eye="04 · Architecture" alt>
        <Headline>Two sides. One trust substrate.</Headline>
        <div className="mt-10 grid gap-10 md:grid-cols-2 max-w-[68ch]">
          <SideCard
            tag="For Operators"
            body="Briarwood captures invisible coordination as work happens. Inquiries, handoffs, follow-through, recovery. Zero change to the existing workflow."
            testid="card-side-operators"
          />
          <SideCard
            tag="For Agents and Platforms"
            body="Briarwood makes that trust queryable before routing, handoff, or payment. One API call, one structured trust signal."
            testid="card-side-agents"
          />
        </div>
        <p
          className="mt-10 font-serif text-ink"
          style={{ fontSize: "clamp(1.1rem, 2vw, 1.4rem)" }}
          data-testid="text-side-summary"
        >
          Operators create the signal. Agents query the signal.
        </p>
      </Section>

      {/* DON'T GUESS */}
      <Section eye="05 · The Cost of Guessing">
        <Headline>Don't guess. Query.</Headline>
        <Body>The real cost is not just tokens.</Body>
        <Body>It is making agents guess trust from scratch every time.</Body>
        <p
          className="mt-8 font-serif italic text-oxblood max-w-[60ch]"
          style={{ fontSize: "clamp(1.4rem, 2.6vw, 1.9rem)", lineHeight: 1.35 }}
          data-testid="text-lookup"
        >
          Briarwood turns trust into a lookup.
        </p>
      </Section>

      {/* ORIGIN */}
      <Section eye="06 · Origin" alt>
        <Headline>Built from real-world coordination.</Headline>
        <Body>
          Briarwood begins inside a trust-gated operator network built over decades of
          high-stakes service coordination.
        </Body>
        <p
          className="mt-8 pl-6 border-l-2 border-brass font-serif italic text-ink max-w-[60ch]"
          style={{ fontSize: "clamp(1.2rem, 2.2vw, 1.55rem)", lineHeight: 1.4 }}
          data-testid="text-moat"
        >
          The labs cannot scrape what never reached the internet.
        </p>
      </Section>

      {/* CLOSE */}
      <Section eye="07 · Why Now">
        <Headline>The agentic web needs a trust substrate.</Headline>
        <Body>Money can already move at software speed.</Body>
        <p
          className="font-serif italic text-oxblood mt-1 mb-3"
          style={{ fontSize: "clamp(1.3rem, 2.4vw, 1.8rem)", lineHeight: 1.35 }}
          data-testid="text-trust-cannot"
        >
          Trust cannot.
        </p>
        <p
          className="mt-8 font-serif text-ink max-w-[68ch]"
          style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", lineHeight: 1.25, letterSpacing: "-0.02em" }}
          data-testid="text-close-line"
        >
          Briarwood makes real-world trust machine-readable.
        </p>
        <div className="mt-12 flex flex-wrap items-center gap-4">
          <button
            onClick={goAccess}
            data-testid="button-request-access-footer"
            className="px-7 py-3 bg-ink text-bg text-[0.92rem] tracking-wide hover:bg-oxblood transition-colors"
          >
            Request Access
          </button>
          <button
            onClick={goDemo}
            data-testid="button-view-demo-footer"
            className="px-7 py-3 border border-hairline text-ink text-[0.92rem] tracking-wide hover:bg-surface transition-colors"
          >
            View CDI Demo
          </button>
        </div>
      </Section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-hairline">
        <div className="estate-container py-10 flex flex-wrap items-center justify-between gap-4">
          <div className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-faintink">
            Briarwood AI · briarwood.ai
          </div>
          <div className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-faintink">
            CDI™ Patent Pending · 2026
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ----------------------- helpers ----------------------- */

function Section({
  eye,
  children,
  alt = false,
}: {
  eye: string;
  children: React.ReactNode;
  alt?: boolean;
}) {
  return (
    <section
      className={`relative z-10 border-t border-hairline ${alt ? "bg-surface/40" : ""}`}
    >
      <div className="estate-container py-24 sm:py-32">
        <div className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-brass mb-8">
          <span className="inline-block w-8 h-px align-middle bg-brass mr-3" />
          {eye}
        </div>
        {children}
      </div>
    </section>
  );
}

function Headline({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-serif font-light text-ink tracking-tight"
      style={{ fontSize: "clamp(2rem, 4.4vw, 3.4rem)", lineHeight: 1.1 }}
    >
      {children}
    </h2>
  );
}

function Lead({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mt-8 font-serif text-ink max-w-[60ch]"
      style={{ fontSize: "clamp(1.15rem, 1.8vw, 1.35rem)", lineHeight: 1.55 }}
    >
      {children}
    </p>
  );
}

function Body({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`mt-5 text-mutedink max-w-[60ch] ${className}`}
      style={{ fontSize: "1.05rem", lineHeight: 1.75 }}
    >
      {children}
    </p>
  );
}

function SideCard({
  tag,
  body,
  testid,
}: {
  tag: string;
  body: string;
  testid: string;
}) {
  return (
    <div
      className="border-t border-ink pt-6"
      data-testid={testid}
    >
      <div className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-brass mb-4">
        {tag}
      </div>
      <p
        className="font-serif text-ink"
        style={{ fontSize: "1.1rem", lineHeight: 1.6 }}
      >
        {body}
      </p>
    </div>
  );
}
