import { useState, useEffect } from "react";
import { motion } from "framer-motion";

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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    accepted: "bg-emerald-100 text-emerald-800",
    auto_responded: "bg-blue-100 text-blue-800",
    declined: "bg-red-100 text-red-800",
    deposit_paid: "bg-emerald-200 text-emerald-900",
    referred: "bg-purple-100 text-purple-800",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors[status] || "bg-gray-100 text-gray-700"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return <span className="text-[10px] text-[#aaa]">unscored</span>;
  const colors: Record<string, string> = {
    positive: "text-emerald-700",
    neutral: "text-[#888]",
    negative: "text-orange-700",
    distressed: "text-red-700",
  };
  return <span className={`text-[10px] font-medium ${colors[sentiment] || "text-[#888]"}`}>{sentiment}</span>;
}

export default function ContextGraph() {
  const [data, setData] = useState<ExportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);

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

  return (
    <div className="bg-[#FAF8F5] min-h-screen text-[#1a1a1a]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-[1100px] mx-auto px-6 sm:px-10 py-16">

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-12">
          <div>
            <p className="text-xs tracking-[0.16em] uppercase text-[#888] mb-2">Briarwood / CDI Context Graph</p>
            <h1
              className="text-2xl sm:text-3xl tracking-tight"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Decision Trace Export
            </h1>
            <p className="text-sm text-[#888] mt-1">
              {s.totalInquiries} inquiries from {data.platform}
            </p>
          </div>
          <button
            onClick={downloadJSON}
            className="bg-[#1a1a1a] text-[#f5f3ef] px-5 py-2.5 text-sm font-medium hover:bg-[#333] transition-colors shrink-0"
            data-testid="button-download-export"
          >
            Download JSON Export
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          <div className="bg-white border border-[#e8e2d9] p-4">
            <p className="text-2xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>{s.totalInquiries}</p>
            <p className="text-[11px] text-[#888] mt-1">Total Inquiries</p>
          </div>
          <div className="bg-white border border-[#e8e2d9] p-4">
            <p className="text-2xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>{Object.keys(s.statusBreakdown).length}</p>
            <p className="text-[11px] text-[#888] mt-1">State Transitions Tracked</p>
          </div>
          <div className="bg-white border border-[#e8e2d9] p-4">
            <p className="text-2xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>{s.depositsCollected}</p>
            <p className="text-[11px] text-[#888] mt-1">Deposits Collected</p>
          </div>
          <div className="bg-white border border-[#e8e2d9] p-4">
            <p className="text-2xl font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>{s.holdsPlaced}</p>
            <p className="text-[11px] text-[#888] mt-1">Holds Placed</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          <div className="bg-white border border-[#e8e2d9] p-5">
            <p className="text-xs tracking-[0.12em] uppercase text-[#888] mb-3">Status Breakdown</p>
            <div className="space-y-2">
              {Object.entries(s.statusBreakdown).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <StatusBadge status={status} />
                  <div className="flex items-center gap-2 flex-1 ml-3">
                    <div className="flex-1 h-1.5 bg-[#f0ece6] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#3d1a22] rounded-full"
                        style={{ width: `${(count / s.totalInquiries) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#888] w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-[#e8e2d9] p-5">
            <p className="text-xs tracking-[0.12em] uppercase text-[#888] mb-3">Sentiment Distribution</p>
            <div className="space-y-2">
              {Object.entries(s.sentimentDistribution).map(([sentiment, count]) => (
                <div key={sentiment} className="flex items-center justify-between">
                  <SentimentBadge sentiment={sentiment === "unscored" ? null : sentiment} />
                  <div className="flex items-center gap-2 flex-1 ml-3">
                    <div className="flex-1 h-1.5 bg-[#f0ece6] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#3d1a22]/60 rounded-full"
                        style={{ width: `${(count / s.totalInquiries) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#888] w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs tracking-[0.12em] uppercase text-[#888] mb-4">Decision Traces</p>
          <div className="space-y-2">
            {data.traces.map((trace) => (
              <motion.div
                key={trace.inquiryId}
                className="bg-white border border-[#e8e2d9] overflow-hidden"
                initial={false}
              >
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
                  <StatusBadge status={trace.groundTruth.finalStatus} />
                  {trace.behavioralSignals.responseLatencyMinutes != null && (
                    <span className="text-[10px] text-[#888] w-16 text-right shrink-0">{trace.behavioralSignals.responseLatencyMinutes}m latency</span>
                  )}
                  <span className="text-[#ccc] text-xs">{expandedTrace === trace.inquiryId ? "−" : "+"}</span>
                </button>

                {expandedTrace === trace.inquiryId && (
                  <motion.div
                    className="px-5 pb-4 border-t border-[#f0ece6]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
                      <div>
                        <p className="text-[10px] tracking-wider uppercase text-[#888] mb-2">Surrogate Identity</p>
                        <div className="space-y-1 text-xs text-[#555]">
                          <p>Event: {trace.surrogateIdentity.eventType || "--"}</p>
                          <p>Date: {trace.surrogateIdentity.eventDate || "--"}</p>
                          <p>Location: {trace.surrogateIdentity.eventLocation || "--"}</p>
                          <p>Service: {trace.surrogateIdentity.serviceType || "--"}</p>
                          <p>Party: {trace.surrogateIdentity.partySize || "--"}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] tracking-wider uppercase text-[#888] mb-2">Decision Trace</p>
                        <div className="space-y-1">
                          {trace.decisionTrace.map((step, i) => (
                            <p key={i} className="text-[11px] font-mono text-[#555]">
                              <span className="text-[#ccc] mr-1">{String(i + 1).padStart(2, "0")}</span> {step}
                            </p>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] tracking-wider uppercase text-[#888] mb-2">Behavioral Signals</p>
                        <div className="space-y-1 text-xs text-[#555]">
                          <p>Sentiment: <SentimentBadge sentiment={trace.behavioralSignals.sentiment} /></p>
                          <p>Score: {trace.behavioralSignals.sentimentScore ?? "--"}/100</p>
                          <p>Latency: {trace.behavioralSignals.responseLatencyMinutes ?? "--"} min</p>
                          <p>Next Action: {trace.behavioralSignals.nextAction || "--"}</p>
                        </div>
                        <p className="text-[10px] tracking-wider uppercase text-[#888] mb-2 mt-4">Ground Truth</p>
                        <div className="space-y-1 text-xs text-[#555]">
                          <p>Final: <StatusBadge status={trace.groundTruth.finalStatus} /></p>
                          <p>Deposit: {trace.groundTruth.depositPaid ? "Yes" : "No"}</p>
                          <p>Hold: {trace.groundTruth.holdPlaced ? "Yes" : "No"}</p>
                          {trace.groundTruth.declinedReason && <p>Declined: {trace.groundTruth.declinedReason}</p>}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
