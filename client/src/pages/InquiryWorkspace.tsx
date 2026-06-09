import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarDays,
  Clock3,
  CreditCard,
  FileText,
  Inbox,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  StickyNote,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface InquiryWorkspaceInquiry {
  id: string;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  eventDate: string | null;
  eventType: string | null;
  eventLocation: string | null;
  serviceType: string | null;
  partySize: number | null;
  message: string | null;
  budget: string | null;
  status: string | null;
  metadata?: {
    source?: string;
    [key: string]: unknown;
  } | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface InquiryWorkspaceResponse {
  inquiries: InquiryWorkspaceInquiry[];
}

type SortMode = "newest" | "oldest" | "requestedDateAsc" | "requestedDateDesc";

const OPERATOR_ROLES = new Set(["artist"]);

const MODULE_PLACEHOLDERS = [
  { title: "Trusted network/routing", description: "Read-only placeholder for future routing candidates.", icon: Users },
  { title: "Contract", description: "Read-only placeholder for linked contract records.", icon: FileText },
  { title: "Payment state", description: "Read-only placeholder for payment-state metadata.", icon: CreditCard },
  { title: "Schedule draft", description: "Read-only placeholder for private schedule drafts.", icon: CalendarDays },
  { title: "Coordination timeline", description: "Read-only placeholder for future inquiry activity.", icon: Clock3 },
];

function formatDate(value?: string | null): string {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function sourceValueLabel(source?: string | null): string {
  if (!source || typeof source !== "string") return "Existing inquiry";
  return source.replace(/_/g, " ");
}

function sourceLabel(inquiry: InquiryWorkspaceInquiry): string {
  return sourceValueLabel(inquiry.metadata?.source);
}

function statusLabel(status?: string | null): string {
  if (!status) return "Unknown";
  return status.replace(/_/g, " ");
}

function requestSummary(inquiry: InquiryWorkspaceInquiry): string {
  const parts = [
    inquiry.serviceType,
    inquiry.eventType,
    inquiry.partySize ? `${inquiry.partySize} people` : null,
    inquiry.budget ? `Budget: ${inquiry.budget}` : null,
  ].filter(Boolean);
  return parts.join(" / ") || "No request summary available";
}

function searchableText(inquiry: InquiryWorkspaceInquiry): string {
  return [
    inquiry.clientName,
    inquiry.clientEmail,
    inquiry.clientPhone,
    inquiry.eventLocation,
    inquiry.message,
    requestSummary(inquiry),
    sourceLabel(inquiry),
    statusLabel(inquiry.status),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function timestamp(value?: string | null): number | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function EmptyValue({ children }: { children?: string | null }) {
  return <span className={children ? "text-ink" : "text-ink/40"}>{children || "Not provided"}</span>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-t border-hairline py-3 first:border-t-0">
      <dt className="text-xs uppercase tracking-wide text-ink/45 mb-1">{label}</dt>
      <dd className="text-sm text-ink break-words">{children}</dd>
    </div>
  );
}

export default function InquiryWorkspace() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const isOperator = typeof user?.role === "string" && OPERATOR_ROLES.has(user.role);

  const inquiriesQuery = useQuery<InquiryWorkspaceResponse>({
    queryKey: ["/api/vendor/inquiries"],
    queryFn: async () => {
      const res = await fetch("/api/vendor/inquiries", { credentials: "include" });
      if (res.status === 401) throw new Error("401");
      if (!res.ok) throw new Error("Failed to load inquiries");
      const payload = await res.json();
      return {
        inquiries: Array.isArray(payload) ? payload : Array.isArray(payload?.inquiries) ? payload.inquiries : [],
      };
    },
    enabled: isAuthenticated && isOperator,
    retry: false,
  });

  const inquiries = inquiriesQuery.data?.inquiries ?? [];
  const statusOptions = useMemo(
    () => Array.from(new Set(inquiries.map((inquiry) => inquiry.status).filter((status): status is string => Boolean(status)))).sort(),
    [inquiries],
  );
  const sourceOptions = useMemo(
    () => Array.from(new Set(inquiries.map((inquiry) => inquiry.metadata?.source).filter((source): source is string => typeof source === "string" && source.trim().length > 0))).sort(),
    [inquiries],
  );
  const filteredInquiries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return inquiries
      .filter((inquiry) => {
        if (query && !searchableText(inquiry).includes(query)) return false;
        if (statusFilter !== "all" && inquiry.status !== statusFilter) return false;
        if (sourceFilter !== "all" && inquiry.metadata?.source !== sourceFilter) return false;
        return true;
      })
      .map((inquiry, index) => ({ inquiry, index }))
      .sort((a, b) => {
        const createdA = timestamp(a.inquiry.createdAt) ?? timestamp(a.inquiry.updatedAt) ?? 0;
        const createdB = timestamp(b.inquiry.createdAt) ?? timestamp(b.inquiry.updatedAt) ?? 0;
        const eventA = timestamp(a.inquiry.eventDate);
        const eventB = timestamp(b.inquiry.eventDate);

        if (sortMode === "oldest") return createdA - createdB || a.index - b.index;
        if (sortMode === "requestedDateAsc") return (eventA ?? Number.MAX_SAFE_INTEGER) - (eventB ?? Number.MAX_SAFE_INTEGER) || a.index - b.index;
        if (sortMode === "requestedDateDesc") return (eventB ?? -1) - (eventA ?? -1) || a.index - b.index;
        return createdB - createdA || a.index - b.index;
      })
      .map(({ inquiry }) => inquiry);
  }, [inquiries, searchTerm, sortMode, sourceFilter, statusFilter]);
  const selectedInquiry = useMemo(
    () => filteredInquiries.find((inquiry) => inquiry.id === selectedId) ?? filteredInquiries[0] ?? null,
    [filteredInquiries, selectedId],
  );

  useEffect(() => {
    if (filteredInquiries.length === 0) {
      if (selectedId) setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredInquiries.some((inquiry) => inquiry.id === selectedId)) {
      setSelectedId(filteredInquiries[0].id);
    }
  }, [filteredInquiries, selectedId]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg text-ink flex items-center justify-center px-6">
        <div className="flex items-center gap-2 text-ink/60" data-testid="status-auth-loading">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-bg text-ink flex items-center justify-center px-6">
        <div className="max-w-md text-center" data-testid="text-auth-required">
          <Inbox className="w-8 h-8 mx-auto mb-4 text-ink/45" />
          <h1 className="font-serif text-2xl tracking-tight mb-3">Please sign in</h1>
          <p className="text-ink/70 mb-6">
            Inquiry Workspace data is private operator data. Sign in to view your inquiries.
          </p>
          <Link
            href={`/artist-login?redirect=${encodeURIComponent("/inquiry-workspace")}`}
            className="underline text-ink"
            data-testid="link-sign-in"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  if (!isOperator) {
    return (
      <div className="min-h-screen bg-bg text-ink flex items-center justify-center px-6">
        <div className="max-w-md text-center" data-testid="text-operator-required">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-ink/45" />
          <h1 className="font-serif text-2xl tracking-tight mb-3">Operator access required</h1>
          <p className="text-ink/70">
            Inquiry Workspace is limited to owner-scoped operator accounts.
          </p>
        </div>
      </div>
    );
  }

  const isAuthError = (inquiriesQuery.error as Error)?.message === "401";

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="max-w-[1180px] mx-auto px-5 sm:px-8 py-8 sm:py-10">
        <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink/45 mb-2">Briarwood</p>
            <h1 className="font-serif text-3xl tracking-tight" data-testid="text-page-title">
              Inquiry Workspace
            </h1>
          </div>
          <p className="text-sm text-ink/60">Read-only operator view</p>
        </header>

        {inquiriesQuery.isLoading && (
          <div className="border border-hairline bg-surface px-4 py-4 flex items-center gap-2 text-ink/60" data-testid="status-loading">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading inquiries
          </div>
        )}

        {(inquiriesQuery.isError || isAuthError) && !inquiriesQuery.isLoading && (
          <div className="border border-hairline bg-surface px-4 py-4 flex items-start gap-3" data-testid="status-error">
            <AlertCircle className="w-5 h-5 text-oxblood shrink-0 mt-0.5" />
            <div>
              <h2 className="font-serif text-lg tracking-tight mb-1">Could not load inquiries</h2>
              <p className="text-sm text-ink/70">
                {isAuthError ? "Your session is not authorized to view this workspace." : (inquiriesQuery.error as Error)?.message}
              </p>
            </div>
          </div>
        )}

        {!inquiriesQuery.isLoading && !inquiriesQuery.isError && inquiries.length === 0 && (
          <div className="border border-hairline bg-surface px-5 py-8 text-center" data-testid="text-empty-state">
            <Inbox className="w-8 h-8 mx-auto mb-4 text-ink/40" />
            <h2 className="font-serif text-xl tracking-tight mb-2">No inquiries yet</h2>
            <p className="text-sm text-ink/65 max-w-lg mx-auto">
              When owner-scoped inquiries exist for your operator account, they will appear here without changing any routing, contract, payment, schedule, or sending behavior.
            </p>
          </div>
        )}

        {!inquiriesQuery.isLoading && !inquiriesQuery.isError && inquiries.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]" data-testid="workspace-populated">
            <section className="border border-hairline bg-surface h-fit">
              <div className="px-4 py-3 border-b border-hairline flex items-center justify-between gap-3">
                <h2 className="font-serif text-lg tracking-tight">Inquiries</h2>
                <span className="text-xs text-ink/50">
                  {filteredInquiries.length} / {inquiries.length}
                </span>
              </div>
              <div className="px-4 py-3 border-b border-hairline space-y-3">
                <label className="relative block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink/35" />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search inquiries"
                    className="w-full border border-hairline bg-bg pl-9 pr-3 py-2 text-sm text-ink placeholder:text-ink/35 focus:outline-none focus:border-ink/40"
                    data-testid="input-inquiry-search"
                  />
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {statusOptions.length > 0 && (
                    <label>
                      <span className="block text-[11px] uppercase tracking-wide text-ink/45 mb-1">Status</span>
                      <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="w-full border border-hairline bg-bg px-2 py-2 text-sm text-ink focus:outline-none focus:border-ink/40"
                        data-testid="select-status-filter"
                      >
                        <option value="all">All statuses</option>
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>{statusLabel(status)}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  {sourceOptions.length > 0 && (
                    <label>
                      <span className="block text-[11px] uppercase tracking-wide text-ink/45 mb-1">Source</span>
                      <select
                        value={sourceFilter}
                        onChange={(event) => setSourceFilter(event.target.value)}
                        className="w-full border border-hairline bg-bg px-2 py-2 text-sm text-ink focus:outline-none focus:border-ink/40"
                        data-testid="select-source-filter"
                      >
                        <option value="all">All sources</option>
                        {sourceOptions.map((source) => (
                          <option key={source} value={source}>{sourceValueLabel(source)}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label className={statusOptions.length > 0 && sourceOptions.length > 0 ? "sm:col-span-2" : undefined}>
                    <span className="block text-[11px] uppercase tracking-wide text-ink/45 mb-1">Sort</span>
                    <select
                      value={sortMode}
                      onChange={(event) => setSortMode(event.target.value as SortMode)}
                      className="w-full border border-hairline bg-bg px-2 py-2 text-sm text-ink focus:outline-none focus:border-ink/40"
                      data-testid="select-inquiry-sort"
                    >
                      <option value="newest">Newest created</option>
                      <option value="oldest">Oldest created</option>
                      <option value="requestedDateAsc">Requested date: soonest</option>
                      <option value="requestedDateDesc">Requested date: latest</option>
                    </select>
                  </label>
                </div>
              </div>
              <div className="divide-y divide-hairline max-h-[70vh] overflow-auto">
                {filteredInquiries.length === 0 && (
                  <div className="px-4 py-8 text-center" data-testid="text-filter-empty-state">
                    <Inbox className="w-7 h-7 mx-auto mb-3 text-ink/35" />
                    <h3 className="font-serif text-lg tracking-tight mb-1">No matching inquiries</h3>
                    <p className="text-sm text-ink/60">Try a different search, filter, or sort option.</p>
                  </div>
                )}
                {filteredInquiries.map((inquiry) => {
                  const active = selectedInquiry?.id === inquiry.id;
                  return (
                    <button
                      key={inquiry.id}
                      type="button"
                      onClick={() => setSelectedId(inquiry.id)}
                      className={`w-full text-left px-4 py-3 transition-colors ${active ? "bg-bg" : "hover:bg-bg/60"}`}
                      data-testid={`button-inquiry-${inquiry.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{inquiry.clientName || "Unnamed client"}</p>
                          <p className="text-xs text-ink/55 truncate mt-0.5">{requestSummary(inquiry)}</p>
                        </div>
                        <span className="text-[11px] uppercase tracking-wide text-ink/55 border border-hairline px-1.5 py-0.5 whitespace-nowrap">
                          {statusLabel(inquiry.status)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink/55">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {formatDate(inquiry.eventDate)}
                        </span>
                        {inquiry.eventLocation && (
                          <span className="inline-flex items-center gap-1 min-w-0">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{inquiry.eventLocation}</span>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {selectedInquiry && (
              <section className="space-y-5" data-testid="inquiry-detail-shell">
                <div className="border border-hairline bg-surface">
                  <div className="px-5 py-4 border-b border-hairline flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="font-serif text-2xl tracking-tight break-words" data-testid="text-client-name">
                        {selectedInquiry.clientName || "Unnamed client"}
                      </h2>
                      <p className="text-sm text-ink/60 mt-1">{requestSummary(selectedInquiry)}</p>
                    </div>
                    <span className="text-xs uppercase tracking-wide text-ink/60 border border-hairline px-2 py-1 w-fit">
                      {statusLabel(selectedInquiry.status)}
                    </span>
                  </div>

                  <dl className="px-5 py-2 grid gap-x-8 sm:grid-cols-2">
                    <Field label="Client email">
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <Mail className="w-4 h-4 text-ink/45 shrink-0" />
                        <EmptyValue>{selectedInquiry.clientEmail}</EmptyValue>
                      </span>
                    </Field>
                    <Field label="Client phone">
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <Phone className="w-4 h-4 text-ink/45 shrink-0" />
                        <EmptyValue>{selectedInquiry.clientPhone}</EmptyValue>
                      </span>
                    </Field>
                    <Field label="Requested date">
                      <span className="inline-flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-ink/45 shrink-0" />
                        {formatDate(selectedInquiry.eventDate)}
                      </span>
                    </Field>
                    <Field label="Location / venue">
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <MapPin className="w-4 h-4 text-ink/45 shrink-0" />
                        <EmptyValue>{selectedInquiry.eventLocation}</EmptyValue>
                      </span>
                    </Field>
                    <Field label="Request details">
                      <EmptyValue>{requestSummary(selectedInquiry)}</EmptyValue>
                    </Field>
                    <Field label="Source">
                      <EmptyValue>{sourceLabel(selectedInquiry)}</EmptyValue>
                    </Field>
                    <Field label="Status">
                      <EmptyValue>{statusLabel(selectedInquiry.status)}</EmptyValue>
                    </Field>
                    <Field label="Notes">
                      <span className="inline-flex items-start gap-2 min-w-0">
                        <StickyNote className="w-4 h-4 text-ink/45 shrink-0 mt-0.5" />
                        <EmptyValue>{selectedInquiry.message}</EmptyValue>
                      </span>
                    </Field>
                  </dl>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="border border-hairline bg-surface px-4 py-4" data-testid="contact-card">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-4 h-4 text-ink/50" />
                      <h3 className="font-serif text-base tracking-tight">Client/contact</h3>
                    </div>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-ink/45">Client name</dt>
                        <dd className="text-ink break-words">
                          <EmptyValue>{selectedInquiry.clientName}</EmptyValue>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-ink/45">Email</dt>
                        <dd className="text-ink break-words">
                          <EmptyValue>{selectedInquiry.clientEmail}</EmptyValue>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-ink/45">Phone</dt>
                        <dd className="text-ink break-words">
                          <EmptyValue>{selectedInquiry.clientPhone}</EmptyValue>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-ink/45">Requested date</dt>
                        <dd className="text-ink break-words">{formatDate(selectedInquiry.eventDate)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-ink/45">Location</dt>
                        <dd className="text-ink break-words">
                          <EmptyValue>{selectedInquiry.eventLocation}</EmptyValue>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-wide text-ink/45">Source / status</dt>
                        <dd className="text-ink break-words">
                          {sourceLabel(selectedInquiry)} / {statusLabel(selectedInquiry.status)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  {MODULE_PLACEHOLDERS.map(({ title, description, icon: Icon }) => (
                    <div key={title} className="border border-hairline bg-surface px-4 py-4" data-testid={`placeholder-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4 text-ink/50" />
                        <h3 className="font-serif text-base tracking-tight">{title}</h3>
                      </div>
                      <p className="text-sm text-ink/60">{description}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
