import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText, DollarSign, Calendar, MessageSquare, Users, Bot,
  Plane, ArrowRight, Sparkles, Send, UserPlus, Inbox, Pencil, Check
} from "lucide-react";

type Mode = "manual" | "auto_refer" | "hawaii";

interface MatterItem {
  id: string;
  client: string;
  company: string;
  matter: string;
  scope: string;
  received: string;
  status: "new" | "intake" | "passed_to_partner" | "engaged";
  channel: "Email" | "Referral" | "Agent";
}

interface NetworkMember {
  id: string;
  name: string;
  role: string;
  type: "associate" | "partner" | "paralegal" | "referrer" | "agent";
  detail: string;
}

const MATTERS: MatterItem[] = [
  { id: "m1", client: "Helena Cortez", company: "Mast Foods", matter: "M&A advisory", scope: "$25k retainer · 3 mo", received: "20 min ago", status: "new", channel: "Referral" },
  { id: "m2", client: "Dev Patel", company: "Linden Capital", matter: "Fund formation", scope: "$60k flat", received: "2 hrs ago", status: "intake", channel: "Email" },
  { id: "m3", client: "Sara Lim", company: "Northpoint Studio", matter: "IP licensing", scope: "$8k retainer", received: "Yesterday", status: "passed_to_partner", channel: "Agent" },
  { id: "m4", client: "Tomas Reyes", company: "Foundry OS", matter: "Series A diligence", scope: "$40k milestone", received: "2 days ago", status: "engaged", channel: "Referral" },
];

const NETWORK: NetworkMember[] = [
  { id: "n1", name: "Iris Chen", role: "Senior Associate", type: "associate", detail: "Drafts engagement letters" },
  { id: "n2", name: "James Holloway", role: "Partner", type: "partner", detail: "Handles M&A intake" },
  { id: "n3", name: "Nora Vance", role: "Paralegal", type: "paralegal", detail: "Conflict checks, intake" },
  { id: "n4", name: "Your Agent", role: "AI Intake Agent", type: "agent", detail: "Pre-screens new matters" },
  { id: "n5", name: "Beth Aoki · Aoki LLP", role: "Referring Counsel", type: "referrer", detail: "Refers tax matters" },
  { id: "n6", name: "Marc Ruiz · Ruiz Tax", role: "Referring Counsel", type: "referrer", detail: "Refers cross-border IP" },
];

const STATUS_LABEL: Record<MatterItem["status"], string> = {
  new: "New",
  intake: "In intake",
  passed_to_partner: "Passed to partner",
  engaged: "Engaged",
};

export default function ServicesDemo() {
  const [mode, setMode] = useState<Mode>("manual");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [firmName, setFirmName] = useState("Marlowe & Co.");
  const [editingFirm, setEditingFirm] = useState(false);
  const [network, setNetwork] = useState<NetworkMember[]>(NETWORK);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  const updateMember = (id: string, name: string) => {
    setNetwork((prev) => prev.map((m) => (m.id === id ? { ...m, name } : m)));
  };

  return (
    <div className="min-h-screen bg-[#f4f1eb] text-[#1a1814]" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="bg-[#1a1814] text-[#f4f1eb] text-center py-2 text-[11px] tracking-[0.15em] uppercase" data-testid="text-demo-banner">
        This is what your inbox looks like with Briarwood
      </div>
      <header className="border-b border-[#d8d2c8]">
        <div className="max-w-[1100px] mx-auto px-6 sm:px-10 py-6 flex items-baseline justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#5a5550]">Briarwood · Inbound for Advisory</p>
            {editingFirm ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  autoFocus
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  onBlur={() => setEditingFirm(false)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setEditingFirm(false); }}
                  className="text-3xl sm:text-4xl tracking-tight bg-transparent border-b border-[#1a1814] outline-none px-1"
                  style={{ fontFamily: "'Fraunces', serif" }}
                  data-testid="input-firm-name"
                />
                <button
                  onClick={() => setEditingFirm(false)}
                  className="text-[#5a5550] hover:text-[#1a1814]"
                  data-testid="button-save-firm-name"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingFirm(true)}
                className="group flex items-center gap-2 mt-1"
                data-testid="button-edit-firm-name"
              >
                <h1
                  className="text-3xl sm:text-4xl tracking-tight"
                  style={{ fontFamily: "'Fraunces', serif" }}
                  data-testid="text-firm-name"
                >
                  {firmName}
                </h1>
                <Pencil className="w-3.5 h-3.5 text-[#5a5550] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[11px] text-[#5a5550]">Today</p>
            <p className="text-sm" data-testid="text-pipeline-count">{MATTERS.length} new matters</p>
          </div>
        </div>
      </header>

      <main className="max-w-[1100px] mx-auto px-6 sm:px-10 py-12">
        <div className="mb-12">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#5a5550] mb-4">Quick Actions</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button className="flex items-center justify-center gap-2 p-4 border border-[#d8d2c8] bg-[#ece7dc] hover:border-[#1a1814]/40 transition-colors text-sm" data-testid="action-engagement">
              <FileText className="w-4 h-4 text-[#5a5550]" />
              <span>Send Engagement Letter</span>
            </button>
            <button className="flex items-center justify-center gap-2 p-4 border border-[#d8d2c8] bg-[#ece7dc] hover:border-[#1a1814]/40 transition-colors text-sm" data-testid="action-invoice">
              <DollarSign className="w-4 h-4 text-[#5a5550]" />
              <span>Send Invoice</span>
            </button>
            <button className="flex items-center justify-center gap-2 p-4 border border-[#d8d2c8] bg-[#ece7dc] hover:border-[#1a1814]/40 transition-colors text-sm" data-testid="action-consult">
              <Calendar className="w-4 h-4 text-[#5a5550]" />
              <span>Book Consultation</span>
            </button>
          </div>
        </div>

        <div className="mb-12">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#5a5550] mb-4">Response Mode</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ModeCard active={mode === "manual"} onSelect={() => setMode("manual")} testId="mode-manual" title="Manual" detail="Review each inquiry" />
            <ModeCard active={mode === "auto_refer"} onSelect={() => setMode("auto_refer")} testId="mode-auto-refer" title="Auto-Refer" detail="Route to associate or referral counsel" />
            <ModeCard active={mode === "hawaii"} onSelect={() => setMode("hawaii")} testId="mode-hawaii" title="Hawaii" detail="Auto-pass with a thank you" icon={<Plane className="w-3.5 h-3.5 text-[#5a5550]" />} />
          </div>
          {mode === "hawaii" && (
            <p className="text-xs text-[#5a5550] mt-3 italic" data-testid="text-hawaii-detail">
              Every inbound gets a polite pass: "Thank you so much, this is a pass for us." You still get the notification email.
            </p>
          )}
          {mode === "auto_refer" && (
            <p className="text-xs text-[#5a5550] mt-3 italic" data-testid="text-auto-refer-detail">
              New matters are auto-routed by area to the right associate. You see the digest in the morning.
            </p>
          )}
        </div>

        <section className="mb-14">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm text-[#5a5550]">Your Matters</h2>
            <div className="flex gap-4 text-xs">
              <button className="text-[#b8963e] hover:opacity-80 flex items-center gap-1" data-testid="button-quick-reply">
                <MessageSquare className="w-3 h-3" />
                Quick Reply
              </button>
              <button className="text-[#b8963e] hover:opacity-80 flex items-center gap-1" data-testid="button-add-matter">
                <Inbox className="w-3 h-3" />
                Add Matter
              </button>
            </div>
          </div>
          <div className="border border-[#d8d2c8] bg-[#ece7dc] divide-y divide-[#d8d2c8]">
            {MATTERS.map((m) => (
              <MatterRow key={m.id} item={m} expanded={activeId === m.id} onToggle={() => setActiveId(activeId === m.id ? null : m.id)} />
            ))}
          </div>
        </section>

        <section className="mb-14">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm text-[#5a5550]">Your Network</h2>
            <button className="text-xs text-[#b8963e] hover:opacity-80 flex items-center gap-1" data-testid="button-invite">
              <UserPlus className="w-3 h-3" />
              Invite member
            </button>
          </div>
          <p className="text-xs text-[#5a5550] mb-4 max-w-[60ch]">
            Anyone here can be looped in to draft responses, route matters, or take over inbound. Add your associates, partners, paralegals, referring counsel, or your AI agent.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {network.map((m) => (
              <NetworkCard
                key={m.id}
                member={m}
                editing={editingMemberId === m.id}
                onEdit={() => setEditingMemberId(m.id)}
                onSave={(name) => { updateMember(m.id, name); setEditingMemberId(null); }}
              />
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

function ModeCard({ active, onSelect, title, detail, testId, icon }: { active: boolean; onSelect: () => void; title: string; detail: string; testId: string; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onSelect}
      className={`text-left p-4 border transition-colors ${active ? "bg-[#f5f0e8] border-[#1a1814]" : "bg-[#ece7dc] border-[#d8d2c8] hover:border-[#1a1814]/40"}`}
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

function MatterRow({ item, expanded, onToggle }: { item: MatterItem; expanded: boolean; onToggle: () => void }) {
  return (
    <div data-testid={`row-matter-${item.id}`}>
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`panel-matter-${item.id}`}
        className="w-full text-left p-4 hover:bg-[#f5f0e8] transition-colors flex items-center gap-4"
        data-testid={`button-toggle-matter-${item.id}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="font-medium text-sm truncate" data-testid={`text-client-${item.id}`}>{item.client}</p>
            <span className="text-[#5a5550] text-xs">·</span>
            <p className="text-sm text-[#5a5550] truncate" data-testid={`text-company-${item.id}`}>{item.company}</p>
          </div>
          <p className="text-xs text-[#5a5550] mt-0.5" data-testid={`text-meta-${item.id}`}>
            {item.matter} · {item.scope} · {item.channel}
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
          id={`panel-matter-${item.id}`}
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
              Refer to Counsel
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function NetworkCard({ member, editing, onEdit, onSave }: { member: NetworkMember; editing: boolean; onEdit: () => void; onSave: (name: string) => void }) {
  const Icon = member.type === "agent" ? Bot : Users;
  const tag =
    member.type === "agent" ? "Agent" :
    member.type === "associate" ? "Associate" :
    member.type === "partner" ? "Partner" :
    member.type === "paralegal" ? "Paralegal" : "Referrer";
  const [draft, setDraft] = useState(member.name);
  return (
    <div className="p-4 border border-[#d8d2c8] bg-[#ece7dc] flex items-start gap-3" data-testid={`card-network-${member.id}`}>
      <div className={`mt-0.5 w-8 h-8 flex items-center justify-center border ${member.type === "agent" ? "border-[#b8963e] text-[#b8963e]" : "border-[#d8d2c8] text-[#5a5550]"}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => onSave(draft.trim() || member.name)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSave(draft.trim() || member.name);
                if (e.key === "Escape") { setDraft(member.name); onSave(member.name); }
              }}
              className="text-sm font-medium bg-transparent border-b border-[#1a1814] outline-none flex-1 min-w-0"
              data-testid={`input-network-name-${member.id}`}
            />
          ) : (
            <button
              onClick={onEdit}
              className="group flex items-center gap-1.5 min-w-0 text-left"
              data-testid={`button-edit-network-${member.id}`}
            >
              <p className="text-sm font-medium truncate">{member.name}</p>
              <Pencil className="w-3 h-3 text-[#5a5550] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          )}
          <span className="text-[10px] uppercase tracking-[0.15em] text-[#5a5550] shrink-0">{tag}</span>
        </div>
        <p className="text-xs text-[#5a5550] mt-0.5">{member.role}</p>
        <p className="text-xs text-[#5a5550] mt-1 italic">{member.detail}</p>
      </div>
    </div>
  );
}
