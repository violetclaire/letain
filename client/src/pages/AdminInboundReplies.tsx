import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";

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
