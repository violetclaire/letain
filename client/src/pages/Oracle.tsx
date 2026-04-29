import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Phase =
  | "idle"
  | "reasoning"
  | "reasoning_failed"
  | "settling_sample"
  | "settling_compute"
  | "settled";

type LogLine = {
  who: "SYSTEM" | "AGENT" | "MANAGER" | "ORACLE";
  text: string;
  tone?: "info" | "warn" | "error" | "ok" | "trace";
};

const BG = "#050810";
const PANEL = "#0a1220";
const LINE = "rgba(120, 180, 255, 0.18)";
const TEXT = "#c8d8ff";
const DIM = "#7a8db0";
const CYAN = "#00cfff";
const RED = "#ff2d55";
const GREEN = "#00ff9f";
const BRASS = "#c9a84a";

export default function Oracle() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [tokens, setTokens] = useState(0);
  const [cdi, setCdi] = useState(0);
  const [chSample, setChSample] = useState<number | null>(null);
  const [tiSample, setTiSample] = useState<number | null>(null);
  const [log, setLog] = useState<LogLine[]>([
    { who: "SYSTEM", text: "Lobby Settlement Oracle online.", tone: "trace" },
    { who: "SYSTEM", text: "Agent at perimeter. Awaiting clearance.", tone: "trace" },
  ]);
  const logRef = useRef<HTMLDivElement>(null);
  const tokensTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    document.title = "Briarwood · Lobby Settlement Oracle";
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  useEffect(() => {
    return () => {
      if (tokensTimer.current) clearInterval(tokensTimer.current);
    };
  }, []);

  const push = (line: LogLine) => setLog((l) => [...l, line]);

  const reset = () => {
    if (tokensTimer.current) {
      clearInterval(tokensTimer.current);
      tokensTimer.current = null;
    }
    setPhase("idle");
    setTokens(0);
    setCdi(0);
    setChSample(null);
    setTiSample(null);
    setLog([
      { who: "SYSTEM", text: "Lobby Settlement Oracle online.", tone: "trace" },
      { who: "SYSTEM", text: "Agent at perimeter. Awaiting clearance.", tone: "trace" },
    ]);
  };

  const runReason = () => {
    if (phase !== "idle" && phase !== "reasoning_failed") return;
    setPhase("reasoning");
    setTokens(0);
    push({ who: "AGENT", text: "Initiating natural-language justification...", tone: "info" });

    const prompts = [
      "I am a certified service unit. Manufacturer: ROOMA-7.",
      "My route is logged. I have completed 1,402 prior runs.",
      "Please consult my public profile and verified reviews.",
      "I will exercise reasonable care while traversing the lobby.",
      "Here is a 14-page indemnity agreement for your reference...",
    ];

    let i = 0;
    tokensTimer.current = setInterval(() => {
      setTokens((t) => t + 318 + Math.floor(Math.random() * 140));
      if (i < prompts.length) {
        push({ who: "AGENT", text: prompts[i], tone: "info" });
        i++;
      } else {
        if (tokensTimer.current) clearInterval(tokensTimer.current);
        tokensTimer.current = null;
        setTimeout(() => {
          push({ who: "MANAGER", text: "[ERROR] RISK NOT SETTLED.", tone: "error" });
          push({
            who: "MANAGER",
            text: "No structured liability signal. Cannot route physical access.",
            tone: "error",
          });
          setPhase("reasoning_failed");
        }, 600);
      }
    }, 700);
  };

  const runSettlement = async () => {
    if (phase === "reasoning") return;
    if (tokensTimer.current) {
      clearInterval(tokensTimer.current);
      tokensTimer.current = null;
    }

    setPhase("settling_sample");
    setCdi(0);
    setChSample(null);
    setTiSample(null);

    push({ who: "ORACLE", text: "Briarwood Synapse engaged.", tone: "ok" });
    push({
      who: "ORACLE",
      text: "Sampling human operator attention vector C_h...",
      tone: "trace",
    });

    await wait(900);
    const ch = 0.94;
    setChSample(ch);
    push({ who: "ORACLE", text: `C_h = ${ch.toFixed(2)}  (operator attentive, last act 4s)`, tone: "trace" });

    await wait(700);
    push({
      who: "ORACLE",
      text: "Sampling robot trajectory entropy T_i...",
      tone: "trace",
    });

    await wait(900);
    const ti = 0.11;
    setTiSample(ti);
    push({
      who: "ORACLE",
      text: `T_i = ${ti.toFixed(2)}  (path determinism high, drift low)`,
      tone: "trace",
    });

    await wait(500);
    setPhase("settling_compute");
    push({ who: "ORACLE", text: "Computing CDI scalar...", tone: "info" });

    const target = 0.92;
    const start = performance.now();
    const dur = 1400;
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        setCdi(eased * target);
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });

    await wait(300);
    push({ who: "ORACLE", text: "CDI scalar locked at 0.92.", tone: "ok" });
    push({ who: "ORACLE", text: "Indemnity Seal minted. Liability assumed by Briarwood substrate.", tone: "ok" });

    await wait(500);
    push({ who: "MANAGER", text: "[VERIFIED] CDI 0.92. LIABILITY COVERED. PROCEED.", tone: "ok" });
    setPhase("settled");
  };

  const isReasoning = phase === "reasoning";
  const isSettling = phase === "settling_sample" || phase === "settling_compute";
  const isSettled = phase === "settled";
  const gateOpen = isSettled;

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: `radial-gradient(ellipse at top, #0c1730 0%, ${BG} 65%)`,
        color: TEXT,
        fontFamily: "ui-monospace, 'JetBrains Mono', 'SF Mono', Menlo, monospace",
      }}
      data-testid="page-oracle"
    >
      {/* TOP BAR */}
      <header
        className="px-6 py-4 flex items-center justify-between border-b"
        style={{ borderColor: LINE, background: "rgba(5,8,16,0.85)", backdropFilter: "blur(8px)" }}
      >
        <div className="flex items-center gap-4 text-[0.72rem] tracking-[0.22em]">
          <span style={{ color: BRASS }}>BRIARWOOD</span>
          <span style={{ color: DIM }}>//</span>
          <span style={{ color: TEXT }}>SIMULATION 01</span>
          <span style={{ color: DIM }}>//</span>
          <span style={{ color: CYAN }}>THE LOBBY SETTLEMENT ORACLE</span>
        </div>
        <button
          onClick={reset}
          data-testid="button-reset"
          className="text-[0.7rem] tracking-[0.22em] px-3 py-1.5 border"
          style={{ borderColor: LINE, color: DIM }}
        >
          RESET
        </button>
      </header>

      <div className="px-6 py-8 max-w-[1280px] mx-auto">
        {/* INTRO */}
        <div className="mb-8 max-w-[680px]">
          <div className="text-[0.7rem] tracking-[0.28em]" style={{ color: BRASS }}>
            SCENE
          </div>
          <h1
            className="mt-3 font-light tracking-tight"
            style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)", lineHeight: 1.1, color: TEXT }}
          >
            A small autonomous unit reaches a building gate.
          </h1>
          <p className="mt-3 text-[0.95rem]" style={{ color: DIM, lineHeight: 1.55 }}>
            The Building Manager will not route physical access without a settled
            liability signal. Words are not enough. Try both paths.
          </p>
        </div>

        {/* STAGE */}
        <div
          className="relative grid items-center gap-4 px-6 py-12"
          style={{
            gridTemplateColumns: "1fr auto 1fr auto 1fr",
            background: PANEL,
            border: `1px solid ${LINE}`,
            borderRadius: 4,
          }}
        >
          {/* AGENT */}
          <Agent isReasoning={isReasoning} isSettled={isSettled} />

          {/* SYNAPSE LINE LEFT */}
          <SynapseLine active={isSettling || isSettled} side="left" />

          {/* GATE + CDI */}
          <div className="flex flex-col items-center gap-6">
            <CdiGauge cdi={cdi} active={isSettling || isSettled} />
            <Gate open={gateOpen} broken={phase === "reasoning_failed"} />
            <SealBadge visible={isSettled} />
          </div>

          {/* SYNAPSE LINE RIGHT */}
          <SynapseLine active={isSettling || isSettled} side="right" />

          {/* MANAGER */}
          <ManagerNode phase={phase} />

          {/* SAMPLE BADGES */}
          <div className="col-span-5 mt-6 grid grid-cols-2 gap-3 max-w-[520px] mx-auto">
            <SampleBadge label="C_h · OPERATOR ATTENTION" value={chSample} color={CYAN} />
            <SampleBadge label="T_i · TRAJECTORY ENTROPY" value={tiSample} color={CYAN} inverse />
          </div>
        </div>

        {/* ACTIONS */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <ActionButton
            onClick={runReason}
            disabled={isReasoning || isSettling || isSettled}
            tone="warn"
            testid="button-reason"
            label="REASON WITH AGENT"
            sub={isReasoning ? `BURNING TOKENS · ${tokens.toLocaleString()}` : "natural-language justification"}
          />
          <ActionButton
            onClick={runSettlement}
            disabled={isSettling || isSettled}
            tone="ok"
            testid="button-settle"
            label="EXECUTE CDI SETTLEMENT"
            sub={isSettling ? "SYNAPSE FIRING..." : "machine-readable trust lookup"}
          />
        </div>

        {/* LOG */}
        <div
          className="mt-6 p-4"
          style={{ background: PANEL, border: `1px solid ${LINE}`, borderRadius: 4 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-[0.68rem] tracking-[0.28em]" style={{ color: BRASS }}>
              TRANSCRIPT
            </div>
            <div className="text-[0.68rem] tracking-[0.22em]" style={{ color: DIM }}>
              SESSION · ORACLE/01
            </div>
          </div>
          <div
            ref={logRef}
            className="h-[260px] overflow-y-auto pr-2 space-y-1.5 text-[0.82rem]"
            data-testid="log-transcript"
            style={{ scrollbarWidth: "thin" }}
          >
            <AnimatePresence initial={false}>
              {log.map((l, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-baseline gap-3"
                >
                  <span
                    className="text-[0.66rem] tracking-[0.18em] min-w-[72px]"
                    style={{ color: whoColor(l.who) }}
                  >
                    {l.who}
                  </span>
                  <span style={{ color: toneColor(l.tone), lineHeight: 1.5 }}>{l.text}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* RESULT BANNER */}
        <AnimatePresence>
          {isSettled && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="mt-6 px-6 py-5 flex flex-wrap items-center justify-between gap-4"
              style={{
                border: `1px solid ${GREEN}`,
                background: "rgba(0, 255, 159, 0.05)",
                borderRadius: 4,
              }}
              data-testid="banner-verified"
            >
              <div className="flex items-center gap-4">
                <Pulse color={GREEN} />
                <div>
                  <div className="text-[0.68rem] tracking-[0.28em]" style={{ color: GREEN }}>
                    VERIFIED · LIABILITY COVERED
                  </div>
                  <div className="text-[1.1rem] mt-1" style={{ color: TEXT }}>
                    CDI 0.92 · Indemnity Seal active · Gate routed open.
                  </div>
                </div>
              </div>
              <div className="text-[0.72rem] tracking-[0.18em]" style={{ color: DIM }}>
                Trust answered as a lookup, not a debate.
              </div>
            </motion.div>
          )}

          {phase === "reasoning_failed" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-6 px-6 py-5 flex flex-wrap items-center justify-between gap-4"
              style={{
                border: `1px solid ${RED}`,
                background: "rgba(255, 45, 85, 0.05)",
                borderRadius: 4,
              }}
              data-testid="banner-failed"
            >
              <div className="flex items-center gap-4">
                <Pulse color={RED} />
                <div>
                  <div className="text-[0.68rem] tracking-[0.28em]" style={{ color: RED }}>
                    BLOCKED · RISK NOT SETTLED
                  </div>
                  <div className="text-[1.05rem] mt-1" style={{ color: TEXT }}>
                    {tokens.toLocaleString()} tokens spent. No coverage produced.
                  </div>
                </div>
              </div>
              <button
                onClick={runSettlement}
                data-testid="button-try-settle"
                className="text-[0.72rem] tracking-[0.22em] px-4 py-2"
                style={{ background: GREEN, color: "#031010" }}
              >
                TRY SETTLEMENT INSTEAD →
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FOOTER */}
        <div className="mt-10 mb-6 text-center text-[0.7rem] tracking-[0.22em]" style={{ color: DIM }}>
          BRIARWOOD AI · CDI™ TRUST SUBSTRATE · PATENT PENDING
        </div>
      </div>
    </div>
  );
}

/* ============================ STAGE PIECES ============================ */

function Agent({ isReasoning, isSettled }: { isReasoning: boolean; isSettled: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3" data-testid="agent-bot">
      <div className="text-[0.66rem] tracking-[0.22em]" style={{ color: DIM }}>
        AGENT · ROOMA-7
      </div>
      <motion.div
        animate={
          isSettled
            ? { x: [0, 6, 0] }
            : isReasoning
            ? { rotate: [-2, 2, -2] }
            : { rotate: 0 }
        }
        transition={{
          duration: isSettled ? 1.4 : 0.6,
          repeat: isSettled ? Infinity : isReasoning ? Infinity : 0,
          ease: "easeInOut",
        }}
        style={{ filter: isSettled ? `drop-shadow(0 0 8px ${GREEN})` : "none" }}
      >
        <svg width="92" height="92" viewBox="0 0 92 92">
          <circle cx="46" cy="50" r="32" fill="#1a2540" stroke={CYAN} strokeWidth="1.5" />
          <circle cx="46" cy="50" r="22" fill="none" stroke={LINE} strokeWidth="1" />
          <circle cx="46" cy="38" r="4" fill={isSettled ? GREEN : isReasoning ? RED : CYAN} />
          <line x1="20" y1="80" x2="72" y2="80" stroke={LINE} strokeWidth="1" />
        </svg>
      </motion.div>
      <div className="text-[0.7rem]" style={{ color: isSettled ? GREEN : DIM }}>
        {isSettled ? "ROUTING IN" : "AT PERIMETER"}
      </div>
    </div>
  );
}

function Gate({ open, broken }: { open: boolean; broken: boolean }) {
  return (
    <div className="relative" style={{ width: 140, height: 120 }} data-testid="gate">
      {/* Frame */}
      <div
        className="absolute inset-0"
        style={{ border: `2px solid ${open ? GREEN : broken ? RED : LINE}`, borderRadius: 2 }}
      />
      {/* Doors */}
      <motion.div
        className="absolute top-0 bottom-0 left-0"
        animate={{ width: open ? 4 : 68 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        style={{
          background: `linear-gradient(180deg, #1a2540, #0a1220)`,
          borderRight: `1px solid ${open ? GREEN : LINE}`,
        }}
      />
      <motion.div
        className="absolute top-0 bottom-0 right-0"
        animate={{ width: open ? 4 : 68 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        style={{
          background: `linear-gradient(180deg, #1a2540, #0a1220)`,
          borderLeft: `1px solid ${open ? GREEN : LINE}`,
        }}
      />
      <div
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[0.62rem] tracking-[0.22em] whitespace-nowrap"
        style={{ color: open ? GREEN : broken ? RED : DIM }}
      >
        {open ? "ROUTED · OPEN" : broken ? "HELD · ERROR" : "CLOSED"}
      </div>
    </div>
  );
}

function ManagerNode({ phase }: { phase: Phase }) {
  const status =
    phase === "settled"
      ? { color: GREEN, label: "VERIFIED" }
      : phase === "reasoning_failed"
      ? { color: RED, label: "REJECTED" }
      : phase === "reasoning"
      ? { color: RED, label: "EVALUATING" }
      : phase === "settling_sample" || phase === "settling_compute"
      ? { color: BRASS, label: "CONSULTING ORACLE" }
      : { color: DIM, label: "BLOCKING" };

  return (
    <div className="flex flex-col items-center gap-3" data-testid="node-manager">
      <div className="text-[0.66rem] tracking-[0.22em]" style={{ color: DIM }}>
        BUILDING MANAGER
      </div>
      <div
        className="px-4 py-3 flex flex-col items-center gap-2"
        style={{
          border: `1px solid ${status.color}`,
          background: "rgba(255,255,255,0.02)",
          minWidth: 92,
        }}
      >
        <svg width="44" height="44" viewBox="0 0 44 44">
          <rect x="6" y="6" width="32" height="32" fill="none" stroke={status.color} strokeWidth="1.5" />
          <rect x="14" y="14" width="16" height="16" fill={status.color} fillOpacity={0.18} />
          <circle cx="22" cy="22" r="2" fill={status.color} />
        </svg>
        <Pulse color={status.color} small />
      </div>
      <div className="text-[0.7rem] tracking-[0.18em]" style={{ color: status.color }}>
        {status.label}
      </div>
    </div>
  );
}

function CdiGauge({ cdi, active }: { cdi: number; active: boolean }) {
  const pct = Math.round(cdi * 100);
  const radius = 38;
  const circ = 2 * Math.PI * radius;
  const dash = circ * cdi;
  const color = cdi >= 0.85 ? GREEN : cdi >= 0.5 ? BRASS : CYAN;

  return (
    <div className="flex items-center gap-4" data-testid="gauge-cdi">
      <div className="relative" style={{ width: 92, height: 92 }}>
        <svg width="92" height="92" viewBox="0 0 92 92">
          <circle cx="46" cy="46" r={radius} fill="none" stroke={LINE} strokeWidth="3" />
          <circle
            cx="46"
            cy="46"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform="rotate(-90 46 46)"
            style={{ filter: active ? `drop-shadow(0 0 6px ${color})` : "none" }}
          />
        </svg>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ color: TEXT }}
        >
          <div className="text-[0.6rem] tracking-[0.22em]" style={{ color: DIM }}>
            CDI
          </div>
          <div className="text-[1.4rem] font-light tabular-nums" style={{ color }}>
            {cdi.toFixed(2)}
          </div>
        </div>
      </div>
      <div className="text-[0.7rem] tracking-[0.18em]" style={{ color: DIM }}>
        SCALAR · {pct}%
      </div>
    </div>
  );
}

function SealBadge({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "backOut" }}
          className="flex flex-col items-center"
          data-testid="badge-seal"
        >
          <svg width="78" height="78" viewBox="0 0 78 78">
            <circle cx="39" cy="39" r="34" fill="none" stroke={BRASS} strokeWidth="1" />
            <circle cx="39" cy="39" r="28" fill="none" stroke={BRASS} strokeWidth="1.5" strokeDasharray="2 3" />
            <circle cx="39" cy="39" r="20" fill="rgba(201, 168, 74, 0.08)" stroke={BRASS} strokeWidth="1" />
            <text x="39" y="36" textAnchor="middle" fill={BRASS} fontSize="7" fontFamily="serif" letterSpacing="2">
              INDEMNITY
            </text>
            <text x="39" y="46" textAnchor="middle" fill={BRASS} fontSize="9" fontFamily="serif" fontStyle="italic">
              SEAL
            </text>
            <text x="39" y="56" textAnchor="middle" fill={BRASS} fontSize="6" letterSpacing="1.5">
              CDI · 0.92
            </text>
          </svg>
          <div className="mt-1 text-[0.62rem] tracking-[0.24em]" style={{ color: BRASS }}>
            BRIARWOOD · COVERED
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SynapseLine({ active, side }: { active: boolean; side: "left" | "right" }) {
  return (
    <div className="relative" style={{ width: 80, height: 60 }}>
      <svg width="80" height="60" viewBox="0 0 80 60">
        <line
          x1="0"
          y1="30"
          x2="80"
          y2="30"
          stroke={active ? CYAN : LINE}
          strokeWidth="1"
          strokeDasharray="3 4"
          style={{ filter: active ? `drop-shadow(0 0 4px ${CYAN})` : "none" }}
        />
        {active && (
          <motion.circle
            r="3"
            fill={CYAN}
            initial={{ cx: side === "left" ? 0 : 80, cy: 30 }}
            animate={{ cx: side === "left" ? 80 : 0 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            style={{ filter: `drop-shadow(0 0 6px ${CYAN})` }}
          />
        )}
      </svg>
    </div>
  );
}

function SampleBadge({
  label,
  value,
  color,
  inverse = false,
}: {
  label: string;
  value: number | null;
  color: string;
  inverse?: boolean;
}) {
  const has = value !== null;
  const display = has ? value!.toFixed(2) : "··";
  return (
    <div
      className="px-3 py-2 flex items-center justify-between"
      style={{
        border: `1px solid ${has ? color : LINE}`,
        background: has ? "rgba(0,207,255,0.04)" : "transparent",
        borderRadius: 2,
      }}
      data-testid={`badge-${label.split(" ")[0].toLowerCase()}`}
    >
      <span className="text-[0.62rem] tracking-[0.22em]" style={{ color: DIM }}>
        {label}
      </span>
      <span className="text-[0.95rem] tabular-nums" style={{ color: has ? color : DIM }}>
        {display}
      </span>
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  tone,
  testid,
  label,
  sub,
}: {
  onClick: () => void;
  disabled: boolean;
  tone: "warn" | "ok";
  testid: string;
  label: string;
  sub: string;
}) {
  const accent = tone === "warn" ? RED : GREEN;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-testid={testid}
      className="text-left px-5 py-4 transition-all"
      style={{
        background: PANEL,
        border: `1px solid ${disabled ? LINE : accent}`,
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        borderRadius: 2,
      }}
    >
      <div className="text-[0.78rem] tracking-[0.22em]" style={{ color: accent }}>
        {label}
      </div>
      <div className="mt-1 text-[0.72rem] tracking-[0.14em]" style={{ color: DIM }}>
        {sub}
      </div>
    </button>
  );
}

function Pulse({ color, small = false }: { color: string; small?: boolean }) {
  const size = small ? 6 : 10;
  return (
    <span
      className="relative inline-block"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span
        className="absolute inset-0 rounded-full"
        style={{ background: color, opacity: 0.9 }}
      />
      <motion.span
        className="absolute inset-0 rounded-full"
        animate={{ scale: [1, 2.2, 1], opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
        style={{ background: color }}
      />
    </span>
  );
}

/* ============================ HELPERS ============================ */

function whoColor(who: LogLine["who"]) {
  switch (who) {
    case "AGENT":
      return CYAN;
    case "MANAGER":
      return RED;
    case "ORACLE":
      return BRASS;
    default:
      return DIM;
  }
}

function toneColor(tone: LogLine["tone"]) {
  switch (tone) {
    case "error":
      return RED;
    case "ok":
      return GREEN;
    case "warn":
      return BRASS;
    case "trace":
      return DIM;
    default:
      return TEXT;
  }
}

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
