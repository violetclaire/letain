import { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar, ClipboardCheck, Clock, MessageSquare, Users, Bot,
  Plane, ArrowRight, Sparkles, Send, UserPlus, Inbox
} from "lucide-react";

type Mode = "manual" | "auto_refer" | "hawaii";

interface PipelineItem {
  id: string;
  founder: string;
  company: string;
  stage: string;
  ask: string;
  received: string;
  status: "new" | "reviewing" | "passed_to_partner" | "intro_scheduled";
  channel: "Email" | "Warm intro" | "Agent";
}

interface NetworkMember {
  id: string;
  name: string;
  role: string;
  type: "ea" | "partner" | "founder" | "agent";
  detail: string;
}

const PIPELINE: PipelineItem[] = [
  {
    id: "p1",
    founder: "Maya Okonkwo",
    company: "Lattice Bio",
    stage: "Seed",
    ask: "$2M @ $14M post",
    received: "12 min ago",
    status: "new",
    channel: "Warm intro",
  },
  {
    id: "p2",
    founder: "Jordan Reyes",
    company: "Foundry OS",
    stage: "Series A",
    ask: "$8M lead",
    received: "1 hr ago",
    status: "reviewing",
    channel: "Email",
  },
  {
    id: "p3",
    founder: "Priya Shankar",
    company: "Vellum",
    stage: "Pre-seed",
    ask: "$750k SAFE",
    received: "Yesterday",
    status: "passed_to_partner",
    channel: "Agent",
  },
  {
    id: "p4",
    founder: "Sam Holzer",
    company: "Pinecone Labs",
    stage: "Seed",
    ask: "$3M @ $18M post",
    received: "2 days ago",
    status: "intro_scheduled",
    channel: "Warm intro",
  },
];

const NETWORK: NetworkMember[] = [
  { id: "n1", name: "Lena Park", role: "Chief of Staff", type: "ea", detail: "Drafts replies, books intros" },
  { id: "n2", name: "Marcus Tan", role: "General Partner", type: "partner", detail: "Routes deep-tech deals" },
  { id: "n3", name: "Hana Cole", role: "General Partner", type: "partner", detail: "Routes consumer deals" },
  { id: "n4", name: "OpenClaw", role: "AI Sourcing Agent", type: "agent", detail: "Pre-screens cold inbound" },
  { id: "n5", name: "Wharves", role: "AI Diligence Agent", type: "agent", detail: "Pulls market & team signals" },
  { id: "n6", name: "Ana Ruiz · Helio", role: "Portfolio Founder", type: "founder", detail: "Refers seed deals in fintech" },
  { id: "n7", name: "Devon Park · Mast", role: "Portfolio Founder", type: "founder", detail: "Refers AI infra deals" },
];

const STATUS_LABEL: Record<PipelineItem["status"], string> = {
  new: "New",
  reviewing: "Reviewing",
  passed_to_partner: "Passed to partner",
  intro_scheduled: "Intro scheduled",
};

export default function VCDemo() {
  const [mode, setMode] = useState<Mode>("manual");
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#f4f1eb] text-[#1a1814]" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="bg-[#1a1814] text-[#f4f1eb] text-center py-2 text-[11px] tracking-[0.15em] uppercase" data-testid="text-demo-banner">
        This is what your inbox looks like with Briarwood
      </div>
      <header className="border-b border-[#d8d2c8]">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-10 py-6 flex items-baseline justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#5a5550]">Briarwood · Inbound for Investors</p>
            <h1
              className="text-3xl sm:text-4xl mt-1 tracking-tight"
              style={{ fontFamily: "'Fraunces', serif" }}
              data-testid="text-firm-name"
            >
              Northwood Capital
            </h1>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[11px] text-[#5a5550]">Today</p>
            <p className="text-sm" data-testid="text-pipeline-count">{PIPELINE.length} in pipeline</p>
          </div>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-6 sm:px-10 py-12">
        {/* Quick Actions */}
        <div className="mb-12">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#5a5550] mb-4">Quick Actions</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              className="flex items-center justify-center gap-2 p-4 border border-[#d8d2c8] bg-[#ece7dc] hover:border-[#1a1814]/40 transition-colors text-sm"
              data-testid="action-calendar-link"
            >
              <Calendar className="w-4 h-4 text-[#5a5550]" />
              <span>Send Calendar Link</span>
            </button>
            <button
              className="flex items-center justify-center gap-2 p-4 border border-[#d8d2c8] bg-[#ece7dc] hover:border-[#1a1814]/40 transition-colors text-sm"
              data-testid="action-checkin"
            >
              <ClipboardCheck className="w-4 h-4 text-[#5a5550]" />
              <span>Log Check-in</span>
            </button>
            <button
              className="flex items-center justify-center gap-2 p-4 border border-[#d8d2c8] bg-[#ece7dc] hover:border-[#1a1814]/40 transition-colors text-sm"
              data-testid="action-timesheet"
            >
              <Clock className="w-4 h-4 text-[#5a5550]" />
              <span>Update Timesheet</span>
            </button>
          </div>
        </div>

        {/* Response Mode */}
        <div className="mb-12">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#5a5550] mb-4">Response Mode</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ModeCard
              active={mode === "manual"}
              onSelect={() => setMode("manual")}
              testId="mode-manual"
              title="Manual"
              detail="Review each pitch"
            />
            <ModeCard
              active={mode === "auto_refer"}
              onSelect={() => setMode("auto_refer")}
              testId="mode-auto-refer"
              title="Auto-Refer"
              detail="Route to partners or co-investors"
            />
            <ModeCard
              active={mode === "hawaii"}
              onSelect={() => setMode("hawaii")}
              testId="mode-hawaii"
              title="Hawaii"
              detail="Delegate to network while away"
              icon={<Plane className="w-3.5 h-3.5 text-[#5a5550]" />}
            />
          </div>
          {mode === "hawaii" && (
            <p className="text-xs text-[#5a5550] mt-3 italic" data-testid="text-hawaii-detail">
              While you're away, inbound is delegated to your trusted network. Partners, EA, or your AI agent take over.
            </p>
          )}
          {mode === "auto_refer" && (
            <p className="text-xs text-[#5a5550] mt-3 italic" data-testid="text-auto-refer-detail">
              New deals are auto-routed by sector to the right partner. You see the digest in the morning.
            </p>
          )}
        </div>

        {/* Pipeline */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm text-[#5a5550]">Your Pipeline</h2>
            <div className="flex gap-4 text-xs">
              <button className="text-[#b8963e] hover:opacity-80 flex items-center gap-1" data-testid="button-quick-reply">
                <MessageSquare className="w-3 h-3" />
                Quick Reply
              </button>
              <button className="text-[#b8963e] hover:opacity-80 flex items-center gap-1" data-testid="button-add-deal">
                <Inbox className="w-3 h-3" />
                Add Deal
              </button>
            </div>
          </div>
          <div className="border border-[#d8d2c8] bg-[#ece7dc] divide-y divide-[#d8d2c8]">
            {PIPELINE.map((p) => (
              <PipelineRow
                key={p.id}
                item={p}
                expanded={activeId === p.id}
                onToggle={() => setActiveId(activeId === p.id ? null : p.id)}
              />
            ))}
          </div>
        </section>

        {/* Network */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm text-[#5a5550]">Your Network</h2>
            <button className="text-xs text-[#b8963e] hover:opacity-80 flex items-center gap-1" data-testid="button-invite">
              <UserPlus className="w-3 h-3" />
              Invite member
            </button>
          </div>
          <p className="text-xs text-[#5a5550] mb-4 max-w-[60ch]">
            Anyone here can be looped in to draft responses, route deals, or take over inbound. Add your EA, partners, portfolio founders, or your AI agent.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {NETWORK.map((m) => (
              <NetworkCard key={m.id} member={m} />
            ))}
          </div>
        </section>

        <div className="border-t border-[#d8d2c8] pt-6 text-[11px] text-[#5a5550] flex justify-between">
          <span>Briarwood · invisible infrastructure for inbound</span>
          <span>Customizable per firm</span>
        </div>
      </main>
    </div>
  );
}

function ModeCard({
  active, onSelect, title, detail, testId, icon,
}: {
  active: boolean; onSelect: () => void; title: string; detail: string; testId: string; icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onSelect}
      className={`text-left p-4 border transition-colors ${
        active
          ? "bg-[#f5f0e8] border-[#1a1814]"
          : "bg-[#ece7dc] border-[#d8d2c8] hover:border-[#1a1814]/40"
      }`}
      data-testid={testId}
    >
      <div className="flex items-center gap-2">
        <p className="font-medium text-sm">{title}</p>
        {icon}
      </div>
      <p className="text-xs mt-1 text-[#5a5550]">{detail}</p>
    </button>
  );
}

function PipelineRow({
  item, expanded, onToggle,
}: {
  item: PipelineItem; expanded: boolean; onToggle: () => void;
}) {
  return (
    <div data-testid={`row-deal-${item.id}`}>
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`panel-deal-${item.id}`}
        className="w-full text-left p-4 hover:bg-[#f5f0e8] transition-colors flex items-center gap-4"
        data-testid={`button-toggle-deal-${item.id}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="font-medium text-sm truncate" data-testid={`text-founder-${item.id}`}>{item.founder}</p>
            <span className="text-[#5a5550] text-xs">·</span>
            <p className="text-sm text-[#5a5550] truncate" data-testid={`text-company-${item.id}`}>{item.company}</p>
          </div>
          <p className="text-xs text-[#5a5550] mt-0.5" data-testid={`text-meta-${item.id}`}>
            {item.stage} · {item.ask} · {item.channel}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-[#5a5550]" data-testid={`text-received-${item.id}`}>{item.received}</p>
          <p className="text-[11px] text-[#1a1814] mt-0.5" data-testid={`text-status-${item.id}`}>{STATUS_LABEL[item.status]}</p>
        </div>
        <ArrowRight className={`w-4 h-4 text-[#5a5550] transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>
      {expanded && (
        <motion.div
          id={`panel-deal-${item.id}`}
          role="region"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="px-4 pb-4 border-t border-[#d8d2c8] bg-[#f5f0e8]"
        >
          <div className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button className="flex items-center justify-center gap-2 p-2.5 border border-[#d8d2c8] bg-[#ece7dc] hover:border-[#1a1814]/40 text-xs" data-testid={`action-respond-${item.id}`}>
              <Send className="w-3 h-3" />
              Send Response
            </button>
            <button className="flex items-center justify-center gap-2 p-2.5 border border-[#d8d2c8] bg-[#ece7dc] hover:border-[#1a1814]/40 text-xs" data-testid={`action-loop-${item.id}`}>
              <Users className="w-3 h-3" />
              Loop in Team
            </button>
            <button className="flex items-center justify-center gap-2 p-2.5 border border-[#d8d2c8] bg-[#ece7dc] hover:border-[#1a1814]/40 text-xs" data-testid={`action-refer-${item.id}`}>
              <Sparkles className="w-3 h-3" />
              Refer to Co-Investor
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function NetworkCard({ member }: { member: NetworkMember }) {
  const Icon = member.type === "agent" ? Bot : Users;
  const tag =
    member.type === "agent" ? "Agent" :
    member.type === "ea" ? "Team" :
    member.type === "partner" ? "Partner" : "Portfolio";
  return (
    <div className="p-4 border border-[#d8d2c8] bg-[#ece7dc] flex items-start gap-3" data-testid={`card-network-${member.id}`}>
      <div className={`mt-0.5 w-8 h-8 flex items-center justify-center border ${member.type === "agent" ? "border-[#b8963e] text-[#b8963e]" : "border-[#d8d2c8] text-[#5a5550]"}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium truncate">{member.name}</p>
          <span className="text-[10px] uppercase tracking-[0.15em] text-[#5a5550] shrink-0">{tag}</span>
        </div>
        <p className="text-xs text-[#5a5550] mt-0.5">{member.role}</p>
        <p className="text-xs text-[#5a5550] mt-1 italic">{member.detail}</p>
      </div>
    </div>
  );
}
