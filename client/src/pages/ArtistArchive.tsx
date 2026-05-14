import { useQuery } from "@tanstack/react-query";
import { useRoute, useSearch, Link } from "wouter";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { Loader2, ArrowLeft, FileText, Users, Search, Download, Clock, Mail } from "lucide-react";

type Inquiry = {
  id: string;
  threadToken: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  eventDate: string | null;
  eventLocation?: string | null;
  eventType?: string | null;
  message?: string | null;
  status: string;
  createdAt: string;
  depositPaidAt?: string | null;
  infoSheetSentAt?: string | null;
};

type Contract = {
  id: string;
  inquiryId?: string | null;
  bookingId?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  totalAmount: number;
  depositAmount?: number | null;
  status: string;
  eventDates?: string | null;
  eventLocation?: string | null;
  sentForSigningAt?: string | null;
  signedAt?: string | null;
  artistSignedAt?: string | null;
  hasSigningLink?: boolean;
  fileUrl?: string | null;
  openSignCertificateUrl?: string | null;
  createdAt: string;
};

type ArchiveData = {
  artist: { id: string; businessName: string; artistSlug: string };
  inquiries: Inquiry[];
  contracts: Contract[];
};

const STATUS_LABELS: Record<string, string> = {
  pending: "New",
  auto_responded: "Replied",
  accepted: "Accepted",
  declined: "Declined",
  referred: "Referred",
  contract_sent: "Contract Sent",
  deposit_paid: "Booked",
  completed: "Completed",
  expired: "Expired",
  draft: "Draft",
  sent: "Sent",
  signed: "Signed",
  cancelled: "Cancelled",
};

function fmtMoney(cents: number | null | undefined) {
  if (cents == null) return "—";
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null | undefined, withTime = false) {
  if (!d) return "—";
  try {
    return format(new Date(d), withTime ? "MMM d, yyyy 'at' h:mma" : "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export default function ArtistArchive() {
  const [, params] = useRoute("/admin/:slug/archive");
  const slug = params?.slug;
  const searchString = useSearch();
  const token = useMemo(() => new URLSearchParams(searchString).get("token") || "", [searchString]);

  const [tab, setTab] = useState<"clients" | "contracts">("clients");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading, error } = useQuery<ArchiveData>({
    queryKey: [`/api/public/artist-archive/${slug}`, token],
    queryFn: async () => {
      const url = token
        ? `/api/public/artist-archive/${slug}?token=${encodeURIComponent(token)}`
        : `/api/public/artist-archive/${slug}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed to load (${res.status})`);
      }
      return res.json();
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink/40" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="text-sm text-ink/70 mb-2">Couldn't load your archive.</p>
          <p className="text-xs text-ink/50 mb-6">{error instanceof Error ? error.message : "Unknown error"}</p>
          <Link
            href={`/admin/${slug}${token ? `?token=${token}` : ""}`}
            className="text-sm underline text-ink"
            data-testid="link-back-admin"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { artist, inquiries, contracts } = data;
  const authParam = token ? `?token=${encodeURIComponent(token)}` : "";

  const inquiryStatuses = Array.from(new Set(inquiries.map((i) => i.status))).sort();
  const contractStatuses = Array.from(new Set(contracts.map((c) => c.status))).sort();

  const filteredInquiries = inquiries.filter((i) => {
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (i.clientName || "").toLowerCase().includes(q) ||
      (i.clientEmail || "").toLowerCase().includes(q) ||
      (i.eventLocation || "").toLowerCase().includes(q) ||
      (i.message || "").toLowerCase().includes(q)
    );
  });

  const filteredContracts = contracts.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (c.clientName || "").toLowerCase().includes(q) ||
      (c.clientEmail || "").toLowerCase().includes(q) ||
      (c.eventLocation || "").toLowerCase().includes(q)
    );
  });

  const activeStatuses = tab === "clients" ? inquiryStatuses : contractStatuses;

  return (
    <div className="min-h-screen bg-bg text-ink" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="px-6 sm:px-10 py-8 border-b border-hairline">
        <div className="max-w-[1100px] mx-auto">
          <Link
            href={`/admin/${slug}${authParam}`}
            className="inline-flex items-center gap-2 text-xs text-ink/50 hover:text-ink mb-4"
            data-testid="link-back-dashboard"
          >
            <ArrowLeft className="w-3 h-3" /> Dashboard
          </Link>
          <p className="text-[10px] uppercase tracking-[0.2em] text-ink/40 mb-1">Archive</p>
          <h1 className="text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
            {artist.businessName}
          </h1>
          <p className="text-sm text-ink/50">
            All clients and contracts, in one place.
          </p>
        </div>
      </header>

      <main className="px-6 sm:px-10 py-8">
        <div className="max-w-[1100px] mx-auto">
          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-hairline mb-6">
            <button
              onClick={() => { setTab("clients"); setStatusFilter("all"); }}
              className={`px-4 py-2 text-sm flex items-center gap-2 border-b-2 -mb-px transition-colors ${
                tab === "clients" ? "border-ink text-ink" : "border-transparent text-ink/50 hover:text-ink/80"
              }`}
              data-testid="tab-clients"
            >
              <Users className="w-4 h-4" />
              Clients <span className="text-ink/40">({inquiries.length})</span>
            </button>
            <button
              onClick={() => { setTab("contracts"); setStatusFilter("all"); }}
              className={`px-4 py-2 text-sm flex items-center gap-2 border-b-2 -mb-px transition-colors ${
                tab === "contracts" ? "border-ink text-ink" : "border-transparent text-ink/50 hover:text-ink/80"
              }`}
              data-testid="tab-contracts"
            >
              <FileText className="w-4 h-4" />
              Contracts <span className="text-ink/40">({contracts.length})</span>
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/30" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tab === "clients" ? "Search by name, email, location..." : "Search by name, email, location..."}
                className="w-full pl-9 pr-3 py-2 bg-surface border border-hairline text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                data-testid="input-search-archive"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-surface border border-hairline text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
              data-testid="select-status-filter"
            >
              <option value="all">All statuses</option>
              {activeStatuses.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
              ))}
            </select>
          </div>

          {/* Clients tab */}
          {tab === "clients" && (
            <div className="space-y-3">
              {filteredInquiries.length === 0 ? (
                <div className="p-12 text-center text-sm text-ink/50 border border-dashed border-hairline">
                  No clients match your filters.
                </div>
              ) : (
                filteredInquiries.map((i) => {
                  const href = `/inquiry/${i.threadToken}`;
                  return (
                    <a
                      key={i.id}
                      href={href}
                      className="block p-5 border border-hairline bg-surface hover:border-ink/30 transition-colors"
                      data-testid={`archive-client-${i.id}`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0">
                          <h3 className="text-base mb-0.5" style={{ fontFamily: "'Fraunces', serif" }}>
                            {i.clientName || "Unnamed"}
                          </h3>
                          <p className="text-xs text-ink/50 truncate">{i.clientEmail}</p>
                          {i.eventLocation && (
                            <p className="text-xs text-ink/40 mt-1 truncate">{i.eventLocation}</p>
                          )}
                          {i.message && (
                            <p className="text-xs text-ink/50 mt-2 line-clamp-2">{i.message}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm" style={{ fontFamily: "'Fraunces', serif" }}>
                            {fmtDate(i.eventDate)}
                          </p>
                          <span className={`inline-block mt-2 px-2 py-1 text-[10px] tracking-[0.1em] uppercase border border-hairline text-ink/70`}>
                            {STATUS_LABELS[i.status] || i.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-ink/5 text-xs text-ink/40">
                        <span>Received {fmtDate(i.createdAt, true)}</span>
                        {i.depositPaidAt && (
                          <span className="text-ink/60">Deposit {fmtDate(i.depositPaidAt)}</span>
                        )}
                      </div>
                    </a>
                  );
                })
              )}
            </div>
          )}

          {/* Contracts tab */}
          {tab === "contracts" && (
            <div className="space-y-3">
              {filteredContracts.length === 0 ? (
                <div className="p-12 text-center text-sm text-ink/50 border border-dashed border-hairline">
                  {contracts.length === 0 ? "No contracts sent yet." : "No contracts match your filters."}
                </div>
              ) : (
                filteredContracts.map((c) => {
                  const downloadUrl = c.openSignCertificateUrl || c.fileUrl;
                  return (
                    <div
                      key={c.id}
                      className="p-5 border border-hairline bg-surface"
                      data-testid={`archive-contract-${c.id}`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0">
                          <h3 className="text-base mb-0.5" style={{ fontFamily: "'Fraunces', serif" }}>
                            {c.clientName || "Unnamed client"}
                          </h3>
                          {c.clientEmail && (
                            <p className="text-xs text-ink/50 truncate">{c.clientEmail}</p>
                          )}
                          {c.eventLocation && (
                            <p className="text-xs text-ink/40 mt-1 truncate">{c.eventLocation}</p>
                          )}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-ink/60">
                            <span>Total <strong className="text-ink">{fmtMoney(c.totalAmount)}</strong></span>
                            {c.depositAmount != null && (
                              <span>Deposit <strong className="text-ink">{fmtMoney(c.depositAmount)}</strong></span>
                            )}
                            {c.eventDates && <span>Event {c.eventDates}</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`inline-block px-2 py-1 text-[10px] tracking-[0.1em] uppercase border border-hairline text-ink/70`}>
                            {STATUS_LABELS[c.status] || c.status}
                          </span>
                          <p className="text-[10px] text-ink/40 mt-2">
                            Created {fmtDate(c.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-ink/5 text-xs">
                        {c.sentForSigningAt && (
                          <span className="text-ink/50">Sent {fmtDate(c.sentForSigningAt, true)}</span>
                        )}
                        {c.signedAt && (
                          <span className="text-ink/70">Client signed {fmtDate(c.signedAt, true)}</span>
                        )}
                        {c.artistSignedAt && (
                          <span className="text-ink/70">You signed {fmtDate(c.artistSignedAt, true)}</span>
                        )}
                        <div className="flex-1" />
                        {downloadUrl && (
                          <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-ink underline hover:no-underline"
                            data-testid={`link-download-contract-${c.id}`}
                          >
                            <Download className="w-3 h-3" /> Download
                          </a>
                        )}
                        {c.hasSigningLink && !c.signedAt && (
                          <span
                            className="inline-flex items-center gap-1 text-ink/50"
                            data-testid={`status-awaiting-signature-${c.id}`}
                          >
                            <Clock className="w-3 h-3" /> Awaiting signature
                          </span>
                        )}
                        {c.clientEmail && (
                          <a
                            href={`mailto:${c.clientEmail}`}
                            className="inline-flex items-center gap-1 text-ink/60 hover:text-ink"
                            data-testid={`link-email-client-${c.id}`}
                          >
                            <Mail className="w-3 h-3" /> Email
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
