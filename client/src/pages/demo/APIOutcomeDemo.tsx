import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, ShieldCheck, Store, Play, RotateCcw } from "lucide-react";

type Stage = "idle" | "agent_to_oracle" | "toll" | "oracle_to_firm" | "complete";

interface Firm {
  id: string;
  name: string;
  category: string;
  cdi: number;
  active?: boolean;
}

const FIRMS: Firm[] = [
  { id: "heritage", name: "Heritage Floral Studio", category: "Bespoke florals", cdi: 9.7, active: true },
  { id: "bespoke", name: "Bespoke Lighting Group", category: "Architectural lighting", cdi: 9.4 },
  { id: "marlowe", name: "Marlowe & Co. Advisory", category: "Boutique advisory", cdi: 9.8 },
  { id: "violet", name: "Atelier Violet", category: "Couture atelier", cdi: 9.2 },
];

const LOG_LINES = [
  { tag: "AGENT", color: "text-[#c8d8ff]", text: "Initiating coordination for High-End Boutique Firm..." },
  { tag: "ECONOMY", color: "text-[#ffb84d]", text: "LLM Reasoning Estimate: 14k tokens (~$2.10)" },
  { tag: "DECISION", color: "text-[#ffb84d]", text: "Redirecting to Briarwood CDI Oracle for O(1) Verification." },
  { tag: "API CALL", color: "text-[#00cfff]", text: "GET /cdi/heritage-floral-studio..." },
  { tag: "RESPONSE", color: "text-[#7CFFB2]", text: "CDI: 9.8 (High Trust). Transaction Tax Collected: $0.50." },
  { tag: "RESULT", color: "text-[#7CFFB2]", text: "Execution complete. Total Compute Savings: 82%." },
];

export default function APIOutcomeDemo() {
  const [stage, setStage] = useState<Stage>("idle");
  const [logIndex, setLogIndex] = useState(0);
  const [selectedFirm, setSelectedFirm] = useState<string>("heritage");
  const timerRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = () => {
    timerRef.current.forEach((t) => clearTimeout(t));
    timerRef.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  const execute = () => {
    clearTimers();
    setLogIndex(0);
    setStage("idle");

    // Stream log lines
    LOG_LINES.forEach((_, i) => {
      timerRef.current.push(setTimeout(() => setLogIndex(i + 1), 400 + i * 700));
    });

    // Stage transitions
    timerRef.current.push(setTimeout(() => setStage("agent_to_oracle"), 200));
    timerRef.current.push(setTimeout(() => setStage("toll"), 1700));
    timerRef.current.push(setTimeout(() => setStage("oracle_to_firm"), 3000));
    timerRef.current.push(setTimeout(() => setStage("complete"), 4400));
  };

  const reset = () => {
    clearTimers();
    setStage("idle");
    setLogIndex(0);
  };

  const activeFirm = FIRMS.find((f) => f.id === selectedFirm) ?? FIRMS[0];

  return (
    <div className="min-h-screen bg-[#f4f1eb] text-[#1a1814]" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="bg-[#1a1814] text-[#f4f1eb] text-center py-2 text-[11px] tracking-[0.15em] uppercase" data-testid="text-banner">
        Briarwood CDI · The toll on the agentic web
      </div>

      <header className="border-b border-[#d8d2c8]">
        <div className="max-w-[1300px] mx-auto px-6 sm:px-10 py-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#5a5550]">Agentic Commerce · CDI Oracle</p>
          <h1
            className="text-3xl sm:text-4xl mt-2 tracking-tight"
            style={{ fontFamily: "'Fraunces', serif" }}
            data-testid="text-headline"
          >
            We sell certainty. Agents pay the toll.
          </h1>
          <p className="text-sm text-[#5a5550] mt-2 max-w-[68ch]">
            An AI agent could burn $2.10 in tokens reasoning about whether a boutique firm is reliable. Or it can hit Briarwood for $0.50 and get an O(1) answer. We've already done the work. We just collect the toll on the way to execution.
          </p>
        </div>
      </header>

      <main className="max-w-[1300px] mx-auto px-6 sm:px-10 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">

          {/* REGISTRY SIDEBAR */}
          <aside data-testid="panel-registry">
            <div className="border border-[#d8d2c8] bg-[#ece7dc]">
              <div className="px-4 py-3 border-b border-[#d8d2c8] flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#5a5550]">Boutique Firm Registry</p>
                <span className="text-[9px] tracking-[0.15em] text-[#5a5550]">LIVE</span>
              </div>
              <ul className="divide-y divide-[#d8d2c8]">
                {FIRMS.map((firm) => {
                  const isActive = firm.id === selectedFirm;
                  return (
                    <li key={firm.id}>
                      <button
                        onClick={() => { setSelectedFirm(firm.id); reset(); }}
                        className={`w-full text-left px-4 py-3 transition-colors ${isActive ? "bg-[#f5f0e8]" : "hover:bg-[#f5f0e8]"}`}
                        data-testid={`button-firm-${firm.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm truncate">{firm.name}</p>
                            <p className="text-[10px] text-[#5a5550] mt-0.5">{firm.category}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="relative flex w-2 h-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#b8963e] opacity-60" />
                              <span className="relative inline-flex w-2 h-2 rounded-full bg-[#b8963e]" />
                            </span>
                            <span
                              className="text-sm tabular-nums"
                              style={{ fontFamily: "'JetBrains Mono', monospace" }}
                              data-testid={`text-cdi-${firm.id}`}
                            >
                              {firm.cdi.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="px-4 py-3 border-t border-[#d8d2c8] text-[10px] text-[#5a5550]">
                Each score updates as firms coordinate. The answer is already stored. We sell access.
              </div>
            </div>
          </aside>

          {/* MAIN: HANDSHAKE + TERMINAL */}
          <div className="space-y-6">

            {/* HANDSHAKE VISUAL */}
            <section className="border border-[#d8d2c8] bg-[#ece7dc] p-8" data-testid="panel-handshake">
              <div className="flex items-center justify-between mb-6">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#5a5550]">The Handshake</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={execute}
                    disabled={stage !== "idle" && stage !== "complete"}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1814] text-[#f4f1eb] text-xs hover:opacity-90 disabled:opacity-40 transition-opacity"
                    data-testid="button-execute"
                  >
                    <Play className="w-3 h-3" />
                    Execute
                  </button>
                  <button
                    onClick={reset}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-[#d8d2c8] text-xs hover:bg-[#f5f0e8] transition-colors"
                    data-testid="button-reset"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>
              </div>

              <div className="relative h-[200px] sm:h-[220px]">
                {/* Connecting line */}
                <div className="absolute top-1/2 left-[12%] right-[12%] h-px bg-[#d8d2c8] -translate-y-1/2" />
                {/* Active line segments */}
                <motion.div
                  className="absolute top-1/2 left-[12%] h-px -translate-y-1/2 origin-left"
                  style={{ width: "38%", background: stage === "complete" || stage === "oracle_to_firm" ? "#7C9F6B" : "#b8963e" }}
                  animate={{ scaleX: stage === "idle" ? 0 : 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
                <motion.div
                  className="absolute top-1/2 left-[50%] h-px -translate-y-1/2 origin-left"
                  style={{ width: "38%", background: "#7C9F6B" }}
                  animate={{ scaleX: stage === "oracle_to_firm" || stage === "complete" ? 1 : 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />

                {/* Pulse traveling agent → oracle */}
                <AnimatePresence>
                  {stage === "agent_to_oracle" && (
                    <motion.div
                      className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#b8963e]"
                      style={{ boxShadow: "0 0 12px #b8963e" }}
                      initial={{ left: "12%" }}
                      animate={{ left: "50%" }}
                      transition={{ duration: 1.4, ease: "easeInOut" }}
                    />
                  )}
                </AnimatePresence>

                {/* Pulse traveling oracle → firm */}
                <AnimatePresence>
                  {stage === "oracle_to_firm" && (
                    <motion.div
                      className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#7C9F6B]"
                      style={{ boxShadow: "0 0 12px #7C9F6B" }}
                      initial={{ left: "50%" }}
                      animate={{ left: "88%" }}
                      transition={{ duration: 1.2, ease: "easeInOut" }}
                    />
                  )}
                </AnimatePresence>

                {/* Three Nodes */}
                <Node position="left" label="3rd-Party Agent" sub="OpenClaw" icon={<Bot className="w-5 h-5" />} dim={stage !== "idle" && stage !== "agent_to_oracle"} />
                <CenterNode stage={stage} />
                <Node position="right" label="Boutique Firm" sub={activeFirm.name} icon={<Store className="w-5 h-5" />} unlocked={stage === "complete"} />

                {/* +$0.50 toll popup */}
                <AnimatePresence>
                  {(stage === "toll" || stage === "oracle_to_firm" || stage === "complete") && (
                    <motion.div
                      className="absolute left-1/2 -translate-x-1/2"
                      style={{ top: "8%" }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                      data-testid="text-toll"
                    >
                      <span className="text-sm font-medium text-[#1a1814] bg-[#f5f0e8] border border-[#b8963e] px-2 py-0.5">
                        +$0.50 toll
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {stage === "complete" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 pt-4 border-t border-[#d8d2c8] flex items-center justify-between text-xs"
                >
                  <span className="text-[#5a5550]">Compute path</span>
                  <span className="text-[#1a1814]"><strong>$0.50</strong> via Briarwood vs <span className="line-through text-[#5a5550]">$2.10</span> via raw reasoning · <strong className="text-[#7C9F6B]">76% saved</strong></span>
                </motion.div>
              )}
            </section>

            {/* TERMINAL */}
            <section data-testid="panel-terminal">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#5a5550]">System Execution Log</p>
                <span className="text-[9px] tracking-[0.15em] text-[#5a5550]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>briarwood@oracle</span>
              </div>
              <div
                className="bg-[#0d1116] text-[#c8d8ff] p-5 min-h-[220px] text-[12px] leading-relaxed"
                style={{ fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace" }}
              >
                {logIndex === 0 && (
                  <p className="text-[#5a5550]">$ awaiting execute...</p>
                )}
                {LOG_LINES.slice(0, logIndex).map((line, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="break-words"
                  >
                    <span className={`${line.color} mr-2`}>[{line.tag}]</span>
                    <span>{line.text}</span>
                  </motion.p>
                ))}
                {logIndex > 0 && logIndex < LOG_LINES.length && (
                  <span className="inline-block w-2 h-3.5 bg-[#c8d8ff] animate-pulse mt-1" />
                )}
              </div>
            </section>
          </div>
        </div>

        <div className="border-t border-[#d8d2c8] mt-10 pt-6 text-[11px] text-[#5a5550] flex justify-between">
          <span>Briarwood · invisible infrastructure for the agentic web</span>
          <span>CDI Oracle · O(1) verification · Patent Pending</span>
        </div>
      </main>
    </div>
  );
}

function Node({ position, label, sub, icon, dim = false, unlocked = false }: { position: "left" | "right"; label: string; sub: string; icon: React.ReactNode; dim?: boolean; unlocked?: boolean }) {
  const posClass = position === "left" ? "left-0" : "right-0";
  const align = position === "left" ? "items-start text-left" : "items-end text-right";
  return (
    <div className={`absolute top-1/2 -translate-y-1/2 ${posClass} flex flex-col ${align} gap-2 w-[24%]`} data-testid={`node-${position}`}>
      <motion.div
        className={`w-14 h-14 flex items-center justify-center border bg-[#f5f0e8] ${unlocked ? "border-[#7C9F6B] text-[#7C9F6B]" : "border-[#1a1814] text-[#1a1814]"}`}
        animate={{ opacity: dim ? 0.5 : 1, scale: unlocked ? [1, 1.08, 1] : 1 }}
        transition={{ duration: unlocked ? 0.5 : 0.3 }}
        style={unlocked ? { boxShadow: "0 0 0 3px rgba(124,159,107,0.2)" } : undefined}
      >
        {icon}
      </motion.div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.15em] text-[#5a5550]">{label}</p>
        <p className="text-sm">{sub}</p>
      </div>
    </div>
  );
}

function CenterNode({ stage }: { stage: Stage }) {
  const glowing = stage === "toll" || stage === "agent_to_oracle";
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 w-[24%]" data-testid="node-center">
      <motion.div
        className="w-16 h-16 flex items-center justify-center border-2 border-[#b8963e] bg-[#f5f0e8] text-[#b8963e] relative"
        animate={glowing ? { boxShadow: ["0 0 0 0 rgba(184,150,62,0.5)", "0 0 0 14px rgba(184,150,62,0)"] } : { boxShadow: "0 0 0 2px rgba(184,150,62,0.25)" }}
        transition={glowing ? { duration: 1.2, repeat: Infinity, ease: "easeOut" } : { duration: 0.3 }}
      >
        <ShieldCheck className="w-6 h-6" />
      </motion.div>
      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.15em] text-[#5a5550]">Briarwood</p>
        <p className="text-sm">CDI Oracle</p>
      </div>
    </div>
  );
}
