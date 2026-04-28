import { Bot, ArrowRight, ArrowDown, ShieldCheck, Lock, Search, Calendar, Wallet, CheckCircle2, FileSignature } from "lucide-react";

export default function APIOutcomeDemo() {
  return (
    <div className="min-h-screen bg-[#f4f1eb] text-[#1a1814]" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="bg-[#1a1814] text-[#f4f1eb] text-center py-2 text-[11px] tracking-[0.15em] uppercase" data-testid="text-banner">
        Briarwood sells the outcome, not the lead
      </div>

      <header className="border-b border-[#d8d2c8]">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-10 py-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#5a5550]">Agentic Commerce · API</p>
          <h1
            className="text-3xl sm:text-4xl mt-2 tracking-tight"
            style={{ fontFamily: "'Fraunces', serif" }}
            data-testid="text-headline"
          >
            One call. One confirmed booking.
          </h1>
          <p className="text-sm text-[#5a5550] mt-2 max-w-[60ch]">
            An AI agent doesn't get a "lead" or a contact form back. It gets a confirmed, scheduled, paid booking with money already held in escrow.
          </p>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 sm:px-10 py-14">
        {/* Three-column flow: Agent → Briarwood → Outcome */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1.4fr_auto_1.3fr] gap-6 items-stretch">

          {/* AGENT */}
          <div className="flex flex-col" data-testid="panel-agent">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#5a5550] mb-3">The Agent</p>
            <div className="flex-1 border border-[#d8d2c8] bg-[#ece7dc] p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 border border-[#b8963e] text-[#b8963e] flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">OpenClaw</p>
                  <p className="text-[11px] text-[#5a5550]">CDI tier · Full autonomy</p>
                </div>
              </div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#5a5550] mb-2">Request payload</p>
              <ul className="text-[12px] space-y-1.5">
                <PayloadRow k="service" v="bridal_makeup" />
                <PayloadRow k="event_date" v="Sep 12, 2026 · 2:00 PM" />
                <PayloadRow k="location" v="Carmel, CA" />
                <PayloadRow k="party_size" v="6" />
                <PayloadRow k="budget" v="$4,500 max" />
              </ul>
              <div className="mt-4 pt-4 border-t border-[#d8d2c8]">
                <p className="text-[10px] uppercase tracking-[0.15em] text-[#5a5550]">Endpoint</p>
                <p className="text-[12px] mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>POST /v1/bookings</p>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <Arrow label="POST" />

          {/* BRIARWOOD */}
          <div className="flex flex-col" data-testid="panel-briarwood">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#5a5550] mb-3">Briarwood resolves it</p>
            <div className="flex-1 border border-[#1a1814] bg-[#1a1814] text-[#f4f1eb] p-5">
              <p className="text-[11px] tracking-[0.2em] uppercase text-[#b8963e] mb-4">Coordination engine</p>
              <div className="space-y-3">
                <PipelineStep
                  n="01"
                  icon={<Search className="w-3.5 h-3.5" />}
                  title="Match"
                  detail="Filter by service, date, location, budget, CDI."
                />
                <PipelineStep
                  n="02"
                  icon={<Calendar className="w-3.5 h-3.5" />}
                  title="Hold"
                  detail="Soft-hold the provider's calendar in real time."
                />
                <PipelineStep
                  n="03"
                  icon={<Wallet className="w-3.5 h-3.5" />}
                  title="Escrow"
                  detail="Capture payment. Release on proof_of_service."
                />
                <PipelineStep
                  n="04"
                  icon={<FileSignature className="w-3.5 h-3.5" />}
                  title="Sign"
                  detail="Auto-issue contract under provider's brand."
                />
              </div>
              <div className="mt-5 pt-4 border-t border-[#3a3530] flex items-center justify-between text-[11px] text-[#a8a098]">
                <span>Latency</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>~ 1.4s</span>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <Arrow label="201" />

          {/* OUTCOME RECEIPT */}
          <div className="flex flex-col" data-testid="panel-outcome">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#5a5550] mb-3">The Outcome</p>
            <div className="flex-1 bg-[#f5f0e8] border border-[#d8d2c8] relative overflow-hidden">
              {/* Perforated edge */}
              <div
                className="absolute inset-x-0 top-12 h-px"
                style={{
                  backgroundImage: "linear-gradient(to right, #5a5550 50%, transparent 50%)",
                  backgroundSize: "6px 1px",
                  backgroundRepeat: "repeat-x"
                }}
              />
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#1a1814]" />
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#1a1814]">Confirmed</p>
                  </div>
                  <p className="text-[11px] text-[#5a5550]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>bk_8f3a2c91</p>
                </div>
              </div>
              <div className="px-5 pt-6 pb-5 space-y-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#5a5550]">Provider</p>
                  <p className="text-base mt-0.5" style={{ fontFamily: "'Fraunces', serif" }}>Violet Atelier</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] px-1.5 py-0.5 bg-[#1a1814] text-[#f4f1eb] tracking-[0.1em]">CDI 87</span>
                    <span className="text-[11px] text-[#5a5550]">Full autonomy</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#d8d2c8]">
                  <Field label="Scheduled" value="Sep 12, 2026" sub="2:00 PM PT" />
                  <Field label="Total" value="$4,200" sub="Fee $63 (1.5%)" />
                </div>

                <div className="border border-[#d8d2c8] bg-[#ece7dc] p-3 flex items-start gap-2">
                  <Lock className="w-3.5 h-3.5 text-[#b8963e] mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[11px] font-medium">Funds held in escrow</p>
                    <p className="text-[10px] text-[#5a5550] mt-0.5">
                      Releases on proof_of_service hash, Sep 13.
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#5a5550]">Proof URL</p>
                  <p className="text-[11px] mt-0.5 break-all" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    api.briarwood.ai/v1/proof/bk_8f3a2c91
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vertical hint for mobile */}
        <div className="lg:hidden flex justify-center my-6 text-[#5a5550]">
          <ArrowDown className="w-5 h-5" />
        </div>

        {/* Why this matters */}
        <section className="border-t border-[#d8d2c8] mt-16 pt-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
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

function PayloadRow({ k, v }: { k: string; v: string }) {
  return (
    <li className="flex items-baseline justify-between gap-2 border-b border-dashed border-[#d8d2c8] pb-1">
      <span className="text-[#5a5550]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{k}</span>
      <span className="text-right">{v}</span>
    </li>
  );
}

function PipelineStep({ n, icon, title, detail }: { n: string; icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="flex items-start gap-3 border-l border-[#b8963e]/40 pl-3">
      <span className="text-[10px] tracking-[0.2em] text-[#b8963e] mt-0.5">{n}</span>
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[#b8963e]">{icon}</span>
          <p className="text-sm font-medium">{title}</p>
        </div>
        <p className="text-[11px] text-[#a8a098] mt-0.5">{detail}</p>
      </div>
    </div>
  );
}

function Field({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.15em] text-[#5a5550]">{label}</p>
      <p className="text-sm mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-[#5a5550]">{sub}</p>}
    </div>
  );
}

function Arrow({ label }: { label: string }) {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center self-center">
      <span className="text-[9px] tracking-[0.25em] uppercase text-[#5a5550] mb-1">{label}</span>
      <ArrowRight className="w-5 h-5 text-[#5a5550]" />
    </div>
  );
}
