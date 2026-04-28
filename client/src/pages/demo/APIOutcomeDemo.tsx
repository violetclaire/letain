import { Bot, ArrowRight, ArrowDown, ShieldCheck, Activity, History, AlertTriangle, Target, Sparkles } from "lucide-react";

export default function APIOutcomeDemo() {
  return (
    <div className="min-h-screen bg-[#f4f1eb] text-[#1a1814]" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="bg-[#1a1814] text-[#f4f1eb] text-center py-2 text-[11px] tracking-[0.15em] uppercase" data-testid="text-banner">
        CDI · The FICO for the agentic web
      </div>

      <header className="border-b border-[#d8d2c8]">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-10 py-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#5a5550]">Agentic Commerce · Trust API</p>
          <h1
            className="text-3xl sm:text-4xl mt-2 tracking-tight"
            style={{ fontFamily: "'Fraunces', serif" }}
            data-testid="text-headline"
          >
            One call. One trust score.
          </h1>
          <p className="text-sm text-[#5a5550] mt-2 max-w-[60ch]">
            Before any agentic web transaction, an AI agent asks Briarwood the same question a lender asks Equifax: can I trust this counterparty? CDI is the answer in a single number, with the signals behind it.
          </p>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 sm:px-10 py-14">
        {/* Three-column flow: Agent → Briarwood → CDI Score */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1.2fr_auto_1.3fr] gap-6 items-stretch">

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
                  <p className="text-[11px] text-[#5a5550]">Asking before transacting</p>
                </div>
              </div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#5a5550] mb-2">Query</p>
              <ul className="text-[12px] space-y-1.5">
                <PayloadRow k="lookup" v="violet-atelier" />
                <PayloadRow k="context" v="bridal_makeup" />
                <PayloadRow k="value_at_risk" v="$4,200" />
                <PayloadRow k="depth" v="full_signals" />
              </ul>
              <div className="mt-4 pt-4 border-t border-[#d8d2c8]">
                <p className="text-[10px] uppercase tracking-[0.15em] text-[#5a5550]">Endpoint</p>
                <p className="text-[12px] mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>GET /v1/cdi/violet-atelier</p>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <Arrow label="GET" />

          {/* BRIARWOOD CDI ENGINE */}
          <div className="flex flex-col" data-testid="panel-briarwood">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#5a5550] mb-3">Briarwood scores it</p>
            <div className="flex-1 border border-[#1a1814] bg-[#1a1814] text-[#f4f1eb] p-5">
              <p className="text-[11px] tracking-[0.2em] uppercase text-[#b8963e] mb-4">CDI Engine</p>
              <div className="space-y-3">
                <SignalLine icon={<ShieldCheck className="w-3.5 h-3.5" />} label="R_v · Reliability" weight="35%" />
                <SignalLine icon={<Target className="w-3.5 h-3.5" />} label="A_m · Accuracy" weight="40%" />
                <SignalLine icon={<History className="w-3.5 h-3.5" />} label="H_f · History" weight="25%" />
                <SignalLine icon={<AlertTriangle className="w-3.5 h-3.5" />} label="S_p · Spam penalty" weight="multiplier" />
              </div>
              <div className="mt-5 pt-4 border-t border-[#3a3530]">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#a8a098] mb-2">Formula</p>
                <p
                  className="text-[11px] text-[#f4f1eb] leading-relaxed"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  CDI = (0.35·R<sub>v</sub> + 0.40·A<sub>m</sub> + 0.25·H<sub>f</sub>) × (1 − S<sub>p</sub>)
                </p>
                <p className="text-[10px] text-[#a8a098] mt-2 italic">Patent Pending</p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#3a3530] flex items-center justify-between text-[11px] text-[#a8a098]">
                <span>Latency</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>~ 180ms</span>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <Arrow label="200" />

          {/* CDI SCORE REPORT */}
          <div className="flex flex-col" data-testid="panel-score">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#5a5550] mb-3">The Trust Report</p>
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
                    <Sparkles className="w-4 h-4 text-[#1a1814]" />
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#1a1814]">CDI Report</p>
                  </div>
                  <p className="text-[11px] text-[#5a5550]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>violet-atelier</p>
                </div>
              </div>
              <div className="px-5 pt-6 pb-5">
                {/* Big score */}
                <div className="flex items-end justify-between border-b border-[#d8d2c8] pb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#5a5550]">Score</p>
                    <p
                      className="text-6xl leading-none mt-1"
                      style={{ fontFamily: "'Fraunces', serif" }}
                      data-testid="text-cdi-score"
                    >
                      87
                    </p>
                    <p className="text-[11px] text-[#5a5550] mt-1">of 100</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] px-1.5 py-0.5 bg-[#1a1814] text-[#f4f1eb] tracking-[0.1em]">FULL AUTONOMY</span>
                    <p className="text-[11px] text-[#5a5550] mt-2">Tier 3 · Conditional → Full at 80</p>
                  </div>
                </div>

                {/* Score gauge */}
                <div className="mt-4">
                  <div className="relative h-2 bg-[#ece7dc] border border-[#d8d2c8]">
                    <div className="absolute left-0 top-0 h-full bg-[#1a1814]" style={{ width: "87%" }} />
                    <div className="absolute top-0 h-full w-px bg-[#5a5550]" style={{ left: "50%" }} />
                    <div className="absolute top-0 h-full w-px bg-[#5a5550]" style={{ left: "80%" }} />
                  </div>
                  <div className="flex justify-between text-[9px] text-[#5a5550] mt-1 tracking-[0.1em]">
                    <span>0</span>
                    <span>50 · COND</span>
                    <span>80 · FULL</span>
                    <span>100</span>
                  </div>
                </div>

                {/* Signal breakdown */}
                <div className="mt-5 space-y-2.5">
                  <SignalBar label="Reliability" value={92} />
                  <SignalBar label="Accuracy" value={88} />
                  <SignalBar label="History" value={79} />
                  <SignalBar label="Spam penalty" value={2} dim />
                </div>

                <div className="mt-5 pt-4 border-t border-[#d8d2c8]">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-[#5a5550]">Verifiable at</p>
                  <p className="text-[11px] mt-0.5 break-all" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    api.briarwood.ai/v1/cdi/violet-atelier/proof
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
          <div className="flex items-start gap-3" data-testid="callout-fico">
            <ShieldCheck className="w-5 h-5 text-[#b8963e] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">FICO for the agentic web</p>
              <p className="text-xs text-[#5a5550] mt-1">
                Lenders rely on FICO to extend credit. AI agents need the same primitive to extend trust. CDI is one number, behaviorally derived, comparable across providers and across agents.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3" data-testid="callout-gated">
            <Activity className="w-5 h-5 text-[#b8963e] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Autonomy is gated by score</p>
              <p className="text-xs text-[#5a5550] mt-1">
                Below 50: read-only. 50 to 79: conditional writes. 80 plus: full autonomy. Counterparties earn capability through coordination quality, not through paid placements.
              </p>
            </div>
          </div>
        </section>

        <div className="border-t border-[#d8d2c8] mt-10 pt-6 text-[11px] text-[#5a5550] flex justify-between">
          <span>Briarwood · invisible infrastructure for the agentic web</span>
          <span>CDI · Patent Pending</span>
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

function SignalLine({ icon, label, weight }: { icon: React.ReactNode; label: string; weight: string }) {
  return (
    <div className="flex items-center justify-between border-l border-[#b8963e]/40 pl-3">
      <div className="flex items-center gap-2">
        <span className="text-[#b8963e]">{icon}</span>
        <p className="text-[12px]">{label}</p>
      </div>
      <span className="text-[10px] tracking-[0.15em] text-[#a8a098]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{weight}</span>
    </div>
  );
}

function SignalBar({ label, value, dim = false }: { label: string; value: number; dim?: boolean }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className={dim ? "text-[#5a5550]" : ""}>{label}</span>
        <span className="text-[#5a5550]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{value}{dim ? "%" : "/100"}</span>
      </div>
      <div className="h-1.5 bg-[#ece7dc] border border-[#d8d2c8] relative">
        <div
          className={dim ? "absolute left-0 top-0 h-full bg-[#b8963e]" : "absolute left-0 top-0 h-full bg-[#1a1814]"}
          style={{ width: `${value}%` }}
        />
      </div>
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
