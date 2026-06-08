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

const OPERATOR_ROLES = new Set(["artist"]);

const MODULE_PLACEHOLDERS = [
  { title: "Client/contact", description: "Read-only placeholder for linked client records.", icon: User },
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

function sourceLabel(inquiry: InquiryWorkspaceInquiry): string {
  const source = inquiry.metadata?.source;
  if (!source || typeof source !== "string") return "Existing inquiry";
  return source.replace(/_/g, " ");
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
  const isOperator = typeof user?.role === "string" && OPERATOR_ROLES.has(user.role);

  const inquiriesQuery = useQuery<InquiryWorkspaceResponse>({
    queryKey: ["/api/artist/inquiries"],
    queryFn: async () => {
      const res = await fetch("/api/artist/inquiries", { credentials: "include" });
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
  const selectedInquiry = useMemo(
    () => inquiries.find((inquiry) => inquiry.id === selectedId) ?? inquiries[0] ?? null,
    [inquiries, selectedId],
  );

  useEffect(() => {
    if (!selectedId && inquiries.length > 0) {
      setSelectedId(inquiries[0].id);
    }
  }, [inquiries, selectedId]);

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
                <span className="text-xs text-ink/50">{inquiries.length}</span>
              </div>
              <div className="divide-y divide-hairline max-h-[70vh] overflow-auto">
                {inquiries.map((inquiry) => {
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
