import { ArrowDown, ShieldCheck, Lock } from "lucide-react";

const REQUEST = `POST https://api.briarwood.ai/v1/bookings
Authorization: Bearer ag_TOILE_VERIFIED_8f3a2c91
Content-Type: application/json

{
  "service": "bridal_makeup",
  "event_date": "2026-09-12T14:00:00-07:00",
  "location": "Carmel, CA",
  "party_size": 6,
  "client_email": "client@northpoint.co",
  "max_budget_usd": 4500
}`;

const RESPONSE = `201 Created

{
  "booking_id": "bk_8f3a2c91",
  "status": "confirmed",
  "scheduled_for": "2026-09-12T14:00:00-07:00",
  "provider": {
    "name": "Violet Atelier",
    "cdi_score": 87,
    "tier": "full_autonomy"
  },
  "outcome": {
    "type": "confirmed_booking",
    "total_usd": 4200,
    "platform_fee_usd": 63.00,
    "escrow": {
      "held_until": "2026-09-13T00:00:00-07:00",
      "release_condition": "proof_of_service_hash"
    },
    "proof_url": "https://api.briarwood.ai/v1/proof/bk_8f3a2c91"
  }
}`;

export default function APIOutcomeDemo() {
  return (
    <div className="min-h-screen bg-[#f4f1eb] text-[#1a1814]" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="bg-[#1a1814] text-[#f4f1eb] text-center py-2 text-[11px] tracking-[0.15em] uppercase" data-testid="text-banner">
        Briarwood sells the outcome, not the lead
      </div>

      <header className="border-b border-[#d8d2c8]">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-10 py-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#5a5550]">Agentic Commerce · API</p>
          <h1
            className="text-3xl sm:text-4xl mt-2 tracking-tight"
            style={{ fontFamily: "'Fraunces', serif" }}
            data-testid="text-headline"
          >
            One call. One confirmed booking.
          </h1>
          <p className="text-sm text-[#5a5550] mt-2 max-w-[60ch]">
            An AI agent doesn't get a "lead" or a contact form back. It gets a confirmed, scheduled, paid booking with money already held in escrow, plus a verifiable proof URL it can hash against later.
          </p>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-6 sm:px-10 py-12">
        {/* Step 1: Request */}
        <section className="mb-6" data-testid="section-request">
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#5a5550]">Step 1</span>
            <h2 className="text-base">Agent makes the call</h2>
          </div>
          <pre
            className="bg-[#0d1116] text-[#c8d8ff] text-[12px] leading-relaxed p-5 overflow-x-auto border border-[#1a1814]/30"
            style={{ fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace" }}
            data-testid="code-request"
          >
{REQUEST}
          </pre>
        </section>

        <div className="flex justify-center my-6 text-[#5a5550]">
          <ArrowDown className="w-5 h-5" />
        </div>

        {/* Step 2: Briarwood matches + holds */}
        <section className="mb-6" data-testid="section-match">
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#5a5550]">Step 2</span>
            <h2 className="text-base">Briarwood resolves it</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ResolveCard
              n="01"
              title="Match"
              detail="Filters providers by service, location, date, budget, and CDI tier."
            />
            <ResolveCard
              n="02"
              title="Hold"
              detail="Places a soft hold on the provider's calendar in real time."
            />
            <ResolveCard
              n="03"
              title="Escrow"
              detail="Captures payment to escrow. Funds release on proof of service."
            />
          </div>
        </section>

        <div className="flex justify-center my-6 text-[#5a5550]">
          <ArrowDown className="w-5 h-5" />
        </div>

        {/* Step 3: Response */}
        <section className="mb-10" data-testid="section-response">
          <div className="flex items-baseline gap-3 mb-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#5a5550]">Step 3</span>
            <h2 className="text-base">Agent gets back the outcome</h2>
          </div>
          <pre
            className="bg-[#0d1116] text-[#c8d8ff] text-[12px] leading-relaxed p-5 overflow-x-auto border border-[#1a1814]/30"
            style={{ fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace" }}
            data-testid="code-response"
          >
{RESPONSE}
          </pre>
        </section>

        {/* Why this matters */}
        <section className="border-t border-[#d8d2c8] pt-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex items-start gap-3" data-testid="callout-trust">
            <ShieldCheck className="w-5 h-5 text-[#b8963e] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Trust is in the response</p>
              <p className="text-xs text-[#5a5550] mt-1">
                Every booking carries the provider's CDI score and tier. Agents pay for verified outcomes, not for a list of names to chase.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3" data-testid="callout-escrow">
            <Lock className="w-5 h-5 text-[#b8963e] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Money is already held</p>
              <p className="text-xs text-[#5a5550] mt-1">
                Funds sit in escrow against the proof_of_service hash. No invoicing dance, no chasing a deposit. The booking is real the moment 201 returns.
              </p>
            </div>
          </div>
        </section>

        <div className="border-t border-[#d8d2c8] mt-10 pt-6 text-[11px] text-[#5a5550] flex justify-between">
          <span>Briarwood · invisible infrastructure for inbound</span>
          <span>1.5% of GMV. Outcome priced.</span>
        </div>
      </main>
    </div>
  );
}

function ResolveCard({ n, title, detail }: { n: string; title: string; detail: string }) {
  return (
    <div className="p-4 border border-[#d8d2c8] bg-[#ece7dc]">
      <p className="text-[10px] tracking-[0.2em] text-[#5a5550]">{n}</p>
      <p className="text-sm font-medium mt-1">{title}</p>
      <p className="text-xs text-[#5a5550] mt-1">{detail}</p>
    </div>
  );
}
