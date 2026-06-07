import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Trace {
  inquiryId: string;
  surrogateIdentity: {
    clientName: string;
    eventType: string;
    eventDate: string;
    eventLocation: string;
    serviceType: string;
    partySize: number;
  };
  decisionTrace: string[];
  behavioralSignals: {
    responseLatencyMinutes: number | null;
    sentiment: string | null;
    sentimentScore: number | null;
    sentimentAnalysis: any;
    nextAction: string | null;
  };
  groundTruth: {
    finalStatus: string;
    depositPaid: boolean;
    holdPlaced: boolean;
    declinedReason: string | null;
  };
  timestamps: {
    created: string | null;
    firstResponse: string | null;
    lastAction: string | null;
    updated: string | null;
  };
}

interface ExportData {
  exportDate: string;
  platform: string;
  description: string;
  summary: {
    totalInquiries: number;
    statusBreakdown: Record<string, number>;
    avgResponseLatencyMin: number;
    depositsCollected: number;
    holdsPlaced: number;
    sentimentDistribution: Record<string, number>;
  };
  traces: Trace[];
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: "bg-amber-50", text: "text-amber-800", dot: "#d97706" },
  accepted: { bg: "bg-emerald-50", text: "text-emerald-800", dot: "#059669" },
  auto_responded: { bg: "bg-blue-50", text: "text-blue-800", dot: "#2563eb" },
  declined: { bg: "bg-red-50", text: "text-red-800", dot: "#dc2626" },
  deposit_paid: { bg: "bg-emerald-100", text: "text-emerald-900", dot: "#047857" },
  referred: { bg: "bg-violet-50", text: "text-violet-800", dot: "#7c3aed" },
  responded: { bg: "bg-sky-50", text: "text-sky-800", dot: "#0284c7" },
  contract_sent: { bg: "bg-indigo-50", text: "text-indigo-800", dot: "#4f46e5" },
  invoice_sent: { bg: "bg-teal-50", text: "text-teal-800", dot: "#0d9488" },
  replied: { bg: "bg-slate-50", text: "text-slate-700", dot: "#475569" },
};

function getStatusStyle(status: string) {
  return statusColors[status] || { bg: "bg-gray-50", text: "text-gray-700", dot: "#6b7280" };
}

const stepLabels: Record<string, { label: string; icon: string }> = {
  inquiry_created: { label: "Inquiry received", icon: "+" },
  auto_response_sent: { label: "Auto-response sent", icon: "⚡" },
  first_response: { label: "Artist responded", icon: "↩" },
  info_sheet_sent: { label: "Info sheet sent", icon: "📋" },
  chat_invite_sent: { label: "Chat invite sent", icon: "💬" },
  hold_placed: { label: "Hold placed", icon: "🔒" },
  deposit_paid: { label: "Deposit collected", icon: "💰" },
  current_status: { label: "Current state", icon: "●" },
  status_reason: { label: "Reason", icon: "→" },
};

function parseStep(raw: string): { key: string; value: string; label: string; icon: string; time: string | null } {
  const colonIdx = raw.indexOf(":");
  if (colonIdx === -1) {
    const info = stepLabels[raw] || { label: raw, icon: "·" };
    return { key: raw, value: "", label: info.label, icon: info.icon, time: null };
  }
  const key = raw.substring(0, colonIdx).trim();
  const value = raw.substring(colonIdx + 1).trim();
  const info = stepLabels[key] || { label: key.replace(/_/g, " "), icon: "·" };

  let time: string | null = null;
  if (value.match(/^\d{4}-\d{2}-\d{2}T/)) {
    const d = new Date(value);
    time = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " +
           d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  return { key, value, label: info.label, icon: info.icon, time };
}

function TraceFlowVisual({ trace }: { trace: Trace }) {
  const steps = trace.decisionTrace.map(parseStep);
  const style = getStatusStyle(trace.groundTruth.finalStatus);

  return (
    <div className="relative pl-8 pb-2">
      <div className="absolute left-[13px] top-3 bottom-3 w-px bg-gradient-to-b from-[#3d1a22]/40 via-[#3d1a22]/20 to-transparent" />

      {steps.map((step, i) => {
        const isFirst = i === 0;
        const isLast = step.key === "current_status";
        const isReason = step.key === "status_reason";

        if (isReason) {
          return (
            <div key={i} className="relative ml-6 mb-1">
              <p className="text-[11px] text-[#888] italic">{step.value}</p>
            </div>
          );
        }

        return (
          <div key={i} className="relative flex items-start gap-3 mb-3">
            <div
              className="absolute -left-8 top-1 w-[11px] h-[11px] rounded-full border-2 z-10"
              style={{
                borderColor: isLast ? style.dot : isFirst ? "#3d1a22" : "#bbb",
                backgroundColor: isLast ? style.dot : isFirst ? "#3d1a22" : "transparent",
              }}
            />
            <div className="flex-1 min-w-0">
              <p className={`text-[12px] font-medium ${isLast ? style.text : "text-[#1a1a1a]"}`}>
                {isLast ? trace.groundTruth.finalStatus.replace(/_/g, " ").toUpperCase() : step.label}
              </p>
              {step.time && (
                <p className="text-[10px] text-[#aaa]">{step.time}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FlowDiagram({ data }: { data: ExportData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 1000;
    const h = 500;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "#faf8f5";
    ctx.fillRect(0, 0, w, h);

    const stages = [
      { key: "inquiry", label: "Inquiry", x: 80 },
      { key: "auto_response", label: "Auto-Response", x: 230 },
      { key: "first_response", label: "Artist Response", x: 400 },
      { key: "info_sheet", label: "Info Sheet", x: 560 },
      { key: "contract", label: "Contract", x: 700 },
      { key: "deposit", label: "Deposit", x: 840 },
    ];

    const stageY = 60;
    ctx.font = "500 11px Inter, sans-serif";
    ctx.textAlign = "center";

    stages.forEach((stage, i) => {
      ctx.fillStyle = "#3d1a22";
      ctx.beginPath();
      ctx.arc(stage.x, stageY, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f5f3ef";
      ctx.font = "700 10px Inter, sans-serif";
      ctx.fillText(String(i + 1), stage.x, stageY + 4);

      ctx.fillStyle = "#1a1a1a";
      ctx.font = "500 10px Inter, sans-serif";
      ctx.fillText(stage.label, stage.x, stageY + 36);

      if (i < stages.length - 1) {
        ctx.strokeStyle = "#ddd";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(stage.x + 18, stageY);
        ctx.lineTo(stages[i + 1].x - 18, stageY);
        ctx.stroke();
      }
    });

    const s = data.summary;
    const total = s.totalInquiries;

    const outcomeColors: Record<string, string> = {
      accepted: "#059669",
      deposit_paid: "#047857",
      contract_sent: "#4f46e5",
      invoice_sent: "#0d9488",
      referred: "#7c3aed",
      responded: "#0284c7",
      auto_responded: "#2563eb",
      pending: "#d97706",
      declined: "#dc2626",
      replied: "#475569",
    };

    const outcomes = Object.entries(s.statusBreakdown).sort((a, b) => b[1] - a[1]);
    const centerX = w / 2;
    const funnelTop = 140;
    const funnelBottom = 380;

    ctx.fillStyle = "#1a1a1a";
    ctx.font = "600 13px Fraunces, serif";
    ctx.textAlign = "center";
    ctx.fillText(`${total} Inquiries`, centerX, funnelTop - 12);

    ctx.fillStyle = "rgba(61,26,34,0.06)";
    ctx.beginPath();
    ctx.moveTo(centerX - 200, funnelTop);
    ctx.lineTo(centerX + 200, funnelTop);
    ctx.lineTo(centerX + 60, funnelBottom);
    ctx.lineTo(centerX - 60, funnelBottom);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(61,26,34,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - 200, funnelTop);
    ctx.lineTo(centerX + 200, funnelTop);
    ctx.lineTo(centerX + 60, funnelBottom);
    ctx.lineTo(centerX - 60, funnelBottom);
    ctx.closePath();
    ctx.stroke();

    let yOffset = funnelTop + 20;
    const barHeight = 18;
    const maxBarWidth = 340;

    outcomes.forEach(([status, count]) => {
      const barW = (count / total) * maxBarWidth;
      const color = outcomeColors[status] || "#6b7280";

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      const r = 3;
      ctx.moveTo(centerX - barW / 2 + r, yOffset);
      ctx.lineTo(centerX + barW / 2 - r, yOffset);
      ctx.quadraticCurveTo(centerX + barW / 2, yOffset, centerX + barW / 2, yOffset + r);
      ctx.lineTo(centerX + barW / 2, yOffset + barHeight - r);
      ctx.quadraticCurveTo(centerX + barW / 2, yOffset + barHeight, centerX + barW / 2 - r, yOffset + barHeight);
      ctx.lineTo(centerX - barW / 2 + r, yOffset + barHeight);
      ctx.quadraticCurveTo(centerX - barW / 2, yOffset + barHeight, centerX - barW / 2, yOffset + barHeight - r);
      ctx.lineTo(centerX - barW / 2, yOffset + r);
      ctx.quadraticCurveTo(centerX - barW / 2, yOffset, centerX - barW / 2 + r, yOffset);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#1a1a1a";
      ctx.font = "500 10px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(
        `${status.replace(/_/g, " ")} (${count})`,
        centerX + maxBarWidth / 2 + 12,
        yOffset + 13
      );

      yOffset += barHeight + 6;
    });

    ctx.fillStyle = "#888";
    ctx.font = "400 9px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Each bar = a decision outcome. The journey from inquiry to outcome is the decision trace.", centerX, h - 30);
    ctx.fillText("Briarwood captures every step, not just the final result.", centerX, h - 16);

  }, [data]);

  return (
    <div className="bg-white border border-[#e8e2d9] p-6 mb-12 overflow-x-auto">
      <p className="text-xs tracking-[0.12em] uppercase text-[#888] mb-4">The Context Graph: How Decisions Flow</p>
      <canvas ref={canvasRef} className="mx-auto block" style={{ maxWidth: "100%" }} />
    </div>
  );
}

function ExplainerSection() {
  return (
    <div className="bg-[#3d1a22] text-[#f5f3ef] p-8 mb-12">
      <h2 className="text-xl mb-4" style={{ fontFamily: "'Fraunces', serif" }}>
        What is a Context Graph?
      </h2>
      <div className="space-y-4 text-sm leading-relaxed opacity-90 max-w-[70ch]">
        <p>
          Most software stores the receipt: "Client X booked." End of story.
        </p>
        <p>
          A context graph stores the <span className="underline">journey</span>. Not just what happened, but every step that led there:
        </p>
        <div className="flex items-start gap-3 pl-2 border-l-2 border-[#f5f3ef]/20 ml-2">
          <div className="space-y-2 text-[13px]">
            <p>1. A client inquired at 3pm on a Tuesday</p>
            <p>2. The system auto-responded in under a second</p>
            <p>3. The artist personally responded 7 minutes later</p>
            <p>4. Info sheet was sent with pricing</p>
            <p>5. Artist sent a contract</p>
            <p>6. Client signed and paid a deposit</p>
          </div>
        </div>
        <p>
          Each step is a <strong>decision trace</strong>. Connect all those traces across all clients, and you get the context graph: a searchable record of how and why every booking happened (or didn't).
        </p>
        <p className="text-[#f5f3ef]/60 text-xs">
          Foundation Capital calls this "the single most valuable asset for companies in the era of AI."
        </p>
      </div>
    </div>
  );
}

export default function ContextGraph() {
  const [data, setData] = useState<ExportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);
  const [view, setView] = useState<"visual" | "traces">("visual");

  useEffect(() => {
    fetch("/api/context-graph/export")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const downloadJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.download = `briarwood-context-graph-${new Date().toISOString().split("T")[0]}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  if (loading) {
    return (
      <div className="bg-[#FAF8F5] min-h-screen flex items-center justify-center" style={{ fontFamily: "'Inter', sans-serif" }}>
        <p className="text-[#888] text-sm">Loading context graph...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-[#FAF8F5] min-h-screen flex items-center justify-center" style={{ fontFamily: "'Inter', sans-serif" }}>
        <p className="text-red-700 text-sm">Failed to load data.</p>
      </div>
    );
  }

  const s = data.summary;

  const bestTraces = data.traces
    .filter(t => t.decisionTrace.length >= 3)
    .sort((a, b) => b.decisionTrace.length - a.decisionTrace.length)
    .slice(0, 12);

  const simpleTraces = data.traces
    .filter(t => t.decisionTrace.length < 3)
    .slice(0, 6);

  return (
    <div className="bg-[#FAF8F5] min-h-screen text-[#1a1a1a]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-[1100px] mx-auto px-6 sm:px-10 py-16">

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-xs tracking-[0.16em] uppercase text-[#888] mb-2">Briarwood / atbriarwood.com</p>
            <h1
              className="text-2xl sm:text-3xl tracking-tight"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Context Graph
            </h1>
            <p className="text-sm text-[#888] mt-1">
              {s.totalInquiries} decision traces from a live booking platform
            </p>
          </div>
          <button
            onClick={downloadJSON}
            className="bg-[#1a1a1a] text-[#f5f3ef] px-5 py-2.5 text-sm font-medium hover:bg-[#333] transition-colors shrink-0"
            data-testid="button-download-export"
          >
            Download Full Export
          </button>
        </div>

        <ExplainerSection />

        <FlowDiagram data={data} />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          <div className="bg-white border border-[#e8e2d9] p-4">
            <p className="text-2xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>{s.totalInquiries}</p>
            <p className="text-[11px] text-[#888] mt-1">Decision Traces Captured</p>
          </div>
          <div className="bg-white border border-[#e8e2d9] p-4">
            <p className="text-2xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>{Object.keys(s.statusBreakdown).length}</p>
            <p className="text-[11px] text-[#888] mt-1">Distinct Outcomes</p>
          </div>
          <div className="bg-white border border-[#e8e2d9] p-4">
            <p className="text-2xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>{s.depositsCollected}</p>
            <p className="text-[11px] text-[#888] mt-1">Deposits Collected</p>
          </div>
          <div className="bg-white border border-[#e8e2d9] p-4">
            <p className="text-2xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>{(s.statusBreakdown["referred"] || 0)}</p>
            <p className="text-[11px] text-[#888] mt-1">Network Referrals</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setView("visual")}
            className={`text-xs px-4 py-2 transition-colors ${view === "visual" ? "bg-[#1a1a1a] text-[#f5f3ef]" : "bg-white border border-[#e8e2d9] text-[#888] hover:text-[#1a1a1a]"}`}
            data-testid="button-view-visual"
          >
            Visual Traces
          </button>
          <button
            onClick={() => setView("traces")}
            className={`text-xs px-4 py-2 transition-colors ${view === "traces" ? "bg-[#1a1a1a] text-[#f5f3ef]" : "bg-white border border-[#e8e2d9] text-[#888] hover:text-[#1a1a1a]"}`}
            data-testid="button-view-traces"
          >
            Raw Traces
          </button>
        </div>

        <AnimatePresence mode="wait">
          {view === "visual" ? (
            <motion.div
              key="visual"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-xs tracking-[0.12em] uppercase text-[#888] mb-2">Rich Decision Traces (multi-step journeys)</p>
              <p className="text-[11px] text-[#888] mb-6">These inquiries have 3+ captured steps, showing the full decision journey.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
                {bestTraces.map((trace) => {
                  const style = getStatusStyle(trace.groundTruth.finalStatus);
                  return (
                    <div key={trace.inquiryId} className="bg-white border border-[#e8e2d9] p-5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium truncate flex-1 mr-2">{trace.surrogateIdentity.clientName}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                          {trace.groundTruth.finalStatus.replace(/_/g, " ")}
                        </span>
                      </div>
                      <TraceFlowVisual trace={trace} />
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#f0ece6]">
                        <span className="text-[10px] text-[#aaa]">{trace.inquiryId}</span>
                        <span className="text-[10px] text-[#aaa]">{trace.decisionTrace.length} steps</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {simpleTraces.length > 0 && (
                <>
                  <p className="text-xs tracking-[0.12em] uppercase text-[#888] mb-2">Simple Traces (1-2 steps)</p>
                  <p className="text-[11px] text-[#888] mb-4">These are newer or simpler inquiries still early in their journey.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-12">
                    {simpleTraces.map((trace) => {
                      const style = getStatusStyle(trace.groundTruth.finalStatus);
                      return (
                        <div key={trace.inquiryId} className="bg-white border border-[#e8e2d9] p-3 text-center">
                          <div
                            className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center"
                            style={{ backgroundColor: style.dot + "15" }}
                          >
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: style.dot }} />
                          </div>
                          <p className="text-[11px] font-medium truncate">{trace.surrogateIdentity.clientName}</p>
                          <p className="text-[9px] text-[#aaa] mt-1">{trace.groundTruth.finalStatus.replace(/_/g, " ")}</p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="traces"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-xs tracking-[0.12em] uppercase text-[#888] mb-4">All Decision Traces ({data.traces.length})</p>
              <div className="space-y-2">
                {data.traces.map((trace) => {
                  const style = getStatusStyle(trace.groundTruth.finalStatus);
                  return (
                    <div key={trace.inquiryId} className="bg-white border border-[#e8e2d9] overflow-hidden">
                      <button
                        onClick={() => setExpandedTrace(expandedTrace === trace.inquiryId ? null : trace.inquiryId)}
                        className="w-full px-5 py-3.5 flex items-center gap-4 text-left hover:bg-[#faf8f5] transition-colors"
                        data-testid={`trace-${trace.inquiryId}`}
                      >
                        <span className="text-xs font-mono text-[#3d1a22] font-medium w-16 shrink-0">{trace.inquiryId}</span>
                        <span className="text-sm text-[#1a1a1a] flex-1 truncate">
                          {trace.surrogateIdentity.clientName}
                          {trace.surrogateIdentity.eventType && <span className="text-[#888]"> / {trace.surrogateIdentity.eventType}</span>}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                          {trace.groundTruth.finalStatus.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] text-[#aaa]">{trace.decisionTrace.length} steps</span>
                        <span className="text-[#ccc] text-xs">{expandedTrace === trace.inquiryId ? "−" : "+"}</span>
                      </button>

                      {expandedTrace === trace.inquiryId && (
                        <div className="px-5 pb-4 border-t border-[#f0ece6]">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                            <div>
                              <p className="text-[10px] tracking-wider uppercase text-[#888] mb-3">Decision Trace</p>
                              <TraceFlowVisual trace={trace} />
                            </div>
                            <div>
                              <p className="text-[10px] tracking-wider uppercase text-[#888] mb-2">Context</p>
                              <div className="space-y-1 text-xs text-[#555]">
                                <p>Client: {trace.surrogateIdentity.clientName}</p>
                                {trace.surrogateIdentity.eventType && <p>Event: {trace.surrogateIdentity.eventType}</p>}
                                {trace.surrogateIdentity.eventDate && <p>Date: {trace.surrogateIdentity.eventDate}</p>}
                                {trace.surrogateIdentity.eventLocation && <p>Location: {trace.surrogateIdentity.eventLocation}</p>}
                              </div>
                              <p className="text-[10px] tracking-wider uppercase text-[#888] mb-2 mt-4">Ground Truth</p>
                              <div className="space-y-1 text-xs text-[#555]">
                                <p>Deposit: {trace.groundTruth.depositPaid ? "Collected" : "Not yet"}</p>
                                <p>Hold: {trace.groundTruth.holdPlaced ? "Placed" : "None"}</p>
                                {trace.groundTruth.declinedReason && <p>Declined: {trace.groundTruth.declinedReason}</p>}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
