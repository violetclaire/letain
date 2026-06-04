import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, ChevronDown, ChevronRight, RefreshCw, Search, Check } from "lucide-react";

interface InboundReply {
  id: string;
  messageSid: string;
  fromNumber: string;
  toNumber: string;
  body: string;
  matchStatus: string;
  matchedUserId: string | null;
  matchedContactId: string | null;
  matchedInquiryId: string | null;
  matchedReferralId: string | null;
  trustEventId: string | null;
  matchedUserName: string | null;
  matchedContactName: string | null;
  matchedInquiry: { id: string; clientName: string; status: string; eventDate: string | null } | null;
  trustEvent: {
    id: string;
    eventType: string;
    eventCategory: string;
    dimension: string;
    signalStrength: number;
    createdAt: string;
  } | null;
  receivedAt: string;
}

function formatWhen(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminInboundReplies() {
  const [, setLocation] = useLocation();
  const [expanded, setExpanded] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user");
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
  });

  const {
    data,
    isLoading: rowsLoading,
    refetch,
    isFetching,
  } = useQuery<{ count: number; messages: InboundReply[] }>({
    queryKey: ["/api/sms/inbound/recent"],
    queryFn: async () => {
      const res = await fetch("/api/sms/inbound/recent?limit=100");
      if (!res.ok) throw new Error("Failed to fetch inbound replies");
      return res.json();
    },
    enabled: user?.role === "admin",
  });

  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <div className="text-[#262329]">Loading...</div>
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#FAF9F7] flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-[#262329]">Access Denied</CardTitle>
            <CardDescription>You need admin access to view inbound replies.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const rows = data?.messages ?? [];

  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      <header className="bg-white border-b border-[#E8B4B8]/20 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/admin")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-serif text-[#262329]">Inbound Replies</h1>
            <p className="text-sm text-[#262329]/60">
              Texts people send back, and the trust events they create.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="button-refresh"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {rowsLoading ? (
          <div className="text-[#262329]/60" data-testid="text-loading">Loading replies...</div>
        ) : rows.length === 0 ? (
          <div
            className="border border-dashed border-[#E8B4B8]/40 rounded-lg p-10 text-center text-[#262329]/60"
            data-testid="text-empty"
          >
            No inbound replies yet. Send a text to your Briarwood number and it will appear here.
          </div>
        ) : (
          <div className="space-y-3" data-testid="list-replies">
            {rows.map((r) => {
              const isOpen = expanded === r.id;
              return (
                <div
                  key={r.id}
                  className="bg-white border border-[#E8B4B8]/20 rounded-lg overflow-hidden"
                  data-testid={`row-reply-${r.id}`}
                >
                  <button
                    className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-[#FAF9F7] transition-colors"
                    onClick={() => setExpanded(isOpen ? null : r.id)}
                    data-testid={`button-expand-${r.id}`}
                  >
                    <span className="mt-1 text-[#262329]/40">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-[#262329]" data-testid={`text-from-${r.id}`}>
                          {r.fromNumber}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            r.matchStatus === "matched"
                              ? "bg-[#3D5A3B]/15 text-[#3D5A3B]"
                              : "bg-[#262329]/10 text-[#262329]/60"
                          }`}
                          data-testid={`status-match-${r.id}`}
                        >
                          {r.matchStatus}
                        </span>
                        {r.trustEvent && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full bg-[#E8B4B8]/25 text-[#8a5a5e]"
                            data-testid={`badge-event-${r.id}`}
                          >
                            {r.trustEvent.eventType}
                          </span>
                        )}
                      </div>
                      <p className="text-[#262329] mt-1 truncate" data-testid={`text-body-${r.id}`}>
                        {r.body || <span className="text-[#262329]/40">(empty message)</span>}
                      </p>
                      <div className="text-sm text-[#262329]/60 mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                        <span data-testid={`text-person-${r.id}`}>
                          Person: {r.matchedUserName || r.matchedContactName || "—"}
                        </span>
                        <span data-testid={`text-inquiry-${r.id}`}>
                          Inquiry: {r.matchedInquiry ? r.matchedInquiry.clientName : "—"}
                        </span>
                        <span data-testid={`text-received-${r.id}`}>
                          {formatWhen(r.receivedAt)}
                        </span>
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div
                      className="border-t border-[#E8B4B8]/20 px-5 py-4 bg-[#FAF9F7] text-sm"
                      data-testid={`detail-${r.id}`}
                    >
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                        <Detail label="Twilio MessageSid" value={r.messageSid} testid={`detail-sid-${r.id}`} />
                        <Detail label="From" value={r.fromNumber} testid={`detail-from-${r.id}`} />
                        <Detail label="To" value={r.toNumber} testid={`detail-to-${r.id}`} />
                        <Detail
                          label="Linked person ID"
                          value={r.matchedUserId || "—"}
                          testid={`detail-userid-${r.id}`}
                        />
                        <Detail
                          label="Linked contact ID"
                          value={r.matchedContactId || "—"}
                          testid={`detail-contactid-${r.id}`}
                        />
                        <Detail
                          label="Linked inquiry ID"
                          value={r.matchedInquiryId || "—"}
                          testid={`detail-inquiryid-${r.id}`}
                        />
                        <Detail
                          label="Linked referral ID"
                          value={r.matchedReferralId || "—"}
                          testid={`detail-referralid-${r.id}`}
                        />
                        <Detail
                          label="Created a trust event?"
                          value={r.trustEvent ? "Yes" : "No"}
                          testid={`detail-created-event-${r.id}`}
                        />
                        {r.trustEvent && (
                          <>
                            <Detail
                              label="Trust event ID"
                              value={r.trustEvent.id}
                              testid={`detail-eventid-${r.id}`}
                            />
                            <Detail
                              label="Event type"
                              value={r.trustEvent.eventType}
                              testid={`detail-eventtype-${r.id}`}
                            />
                            <Detail
                              label="Event category"
                              value={r.trustEvent.eventCategory}
                              testid={`detail-eventcategory-${r.id}`}
                            />
                            <Detail
                              label="Dimension"
                              value={r.trustEvent.dimension}
                              testid={`detail-dimension-${r.id}`}
                            />
                            <Detail
                              label="Signal strength"
                              value={String(r.trustEvent.signalStrength)}
                              testid={`detail-signal-${r.id}`}
                            />
                          </>
                        )}
                        <Detail
                          label="Full message"
                          value={r.body || "(empty)"}
                          testid={`detail-fullbody-${r.id}`}
                        />
                      </dl>

                      <MatchPanel
                        reply={r}
                        onMatched={() => {
                          queryClient.invalidateQueries({ queryKey: ["/api/sms/inbound/recent"] });
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function Detail({ label, value, testid }: { label: string; value: string; testid: string }) {
  return (
    <div>
      <dt className="text-[#262329]/50 text-xs uppercase tracking-wide">{label}</dt>
      <dd className="text-[#262329] break-words font-mono text-[13px]" data-testid={testid}>
        {value}
      </dd>
    </div>
  );
}

type MatchType = "user" | "contact" | "inquiry" | "referral";

interface SearchResult {
  id: string;
  name?: string;
  email?: string | null;
  role?: string | null;
  phone?: string | null;
  clientName?: string;
  clientPhone?: string | null;
  status?: string | null;
  eventDate?: string | null;
  scopeSummary?: string | null;
}

const MATCH_TABS: { key: MatchType; label: string }[] = [
  { key: "user", label: "Person" },
  { key: "contact", label: "Contact" },
  { key: "inquiry", label: "Inquiry" },
  { key: "referral", label: "Referral" },
];

function resultLabel(type: MatchType, r: SearchResult): string {
  if (type === "user") return r.name || r.id;
  if (type === "contact") return r.name || r.id;
  if (type === "inquiry") return r.clientName || r.id;
  return r.scopeSummary || `Referral ${r.id.slice(0, 8)}`;
}

function resultSub(type: MatchType, r: SearchResult): string {
  if (type === "user") return [r.role, r.email, r.phone].filter(Boolean).join(" · ");
  if (type === "contact") return [r.email, r.phone].filter(Boolean).join(" · ");
  if (type === "inquiry") return [r.status, r.clientPhone].filter(Boolean).join(" · ");
  return r.status || "";
}

function MatchPanel({ reply, onMatched }: { reply: InboundReply; onMatched: () => void }) {
  const [type, setType] = useState<MatchType>("user");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<{ type: MatchType; id: string; label: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError(null);
    try {
      const res = await fetch(`/api/sms/inbound/match-search?type=${type}&q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Search failed");
      const json = await res.json();
      setResults(json.results || []);
    } catch (e: any) {
      setError(e?.message || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const confirmMatch = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const fieldByType: Record<MatchType, string> = {
        user: "matchedUserId",
        contact: "matchedContactId",
        inquiry: "matchedInquiryId",
        referral: "matchedReferralId",
      };
      const body = { [fieldByType[selected.type]]: selected.id };
      const res = await fetch(`/api/sms/inbound/${reply.id}/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Match failed");
      }
      setSelected(null);
      setResults([]);
      setQuery("");
      onMatched();
    } catch (e: any) {
      setError(e?.message || "Match failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 border-t border-[#E8B4B8]/20 pt-4" data-testid={`match-panel-${reply.id}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs uppercase tracking-wide text-[#262329]/50">
          {reply.matchStatus === "unmatched" ? "Match this reply" : "Re-match this reply"}
        </h4>
        {reply.trustEvent && (
          <span className="text-xs text-[#3D5A3B]" data-testid={`match-existing-event-${reply.id}`}>
            Trust event already recorded
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {MATCH_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setType(t.key);
              setResults([]);
              setSelected(null);
            }}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              type === t.key
                ? "bg-[#262329] text-[#FAF9F7] border-[#262329]"
                : "bg-white text-[#262329] border-[#E8B4B8]/40 hover:bg-[#FAF9F7]"
            }`}
            data-testid={`match-tab-${t.key}-${reply.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") runSearch();
          }}
          placeholder={`Search ${type === "user" ? "people" : type + "s"}...`}
          className="flex-1 px-3 py-2 text-sm rounded-md border border-[#E8B4B8]/40 bg-white text-[#262329] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3D2226]/70"
          data-testid={`match-search-input-${reply.id}`}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={runSearch}
          disabled={searching || !query.trim()}
          data-testid={`match-search-button-${reply.id}`}
        >
          <Search className={`h-4 w-4 mr-1 ${searching ? "animate-pulse" : ""}`} />
          Search
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-1 mb-3 max-h-56 overflow-y-auto" data-testid={`match-results-${reply.id}`}>
          {results.map((r) => {
            const label = resultLabel(type, r);
            const sub = resultSub(type, r);
            const isSel = selected?.type === type && selected?.id === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setSelected({ type, id: r.id, label })}
                className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${
                  isSel
                    ? "border-[#3D5A3B] bg-[#3D5A3B]/10"
                    : "border-[#E8B4B8]/30 bg-white hover:bg-[#FAF9F7]"
                }`}
                data-testid={`match-result-${r.id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-[#262329] truncate">{label}</span>
                  {isSel && <Check className="h-4 w-4 text-[#3D5A3B] shrink-0" />}
                </div>
                {sub && <div className="text-xs text-[#262329]/50 truncate">{sub}</div>}
              </button>
            );
          })}
        </div>
      )}

      {!searching && query.trim() && results.length === 0 && (
        <p className="text-xs text-[#262329]/50 mb-3" data-testid={`match-no-results-${reply.id}`}>
          No matches found. Try a different search.
        </p>
      )}

      {error && (
        <p className="text-xs text-[#8a2b2b] mb-3" data-testid={`match-error-${reply.id}`}>
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button
          size="sm"
          onClick={confirmMatch}
          disabled={!selected || saving}
          className="bg-[#262329] text-[#FAF9F7] hover:bg-[#262329]/90"
          data-testid={`match-confirm-${reply.id}`}
        >
          {saving ? "Saving..." : "Confirm match"}
        </Button>
        {selected && (
          <span className="text-xs text-[#262329]/60" data-testid={`match-selected-${reply.id}`}>
            Selected: {selected.label}
          </span>
        )}
      </div>
    </div>
  );
}
