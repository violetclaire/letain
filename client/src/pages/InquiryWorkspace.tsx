import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  PlusCircle,
  Save,
  Search,
  StickyNote,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface InquiryWorkspaceInquiry {
  id: string;
  threadToken?: string | null;
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
  statusReason?: string | null;
  nextAction?: string | null;
  nextActionDueAt?: string | null;
  ownerName?: string | null;
  hold?: {
    placedAt?: string | null;
    expiresAt?: string | null;
    reason?: string | null;
  } | null;
  holdPlacedAt?: string | null;
  holdExpiresAt?: string | null;
  holdReason?: string | null;
  firstResponseAt?: string | null;
  lastActionAt?: string | null;
  nextSlaDue?: string | null;
  breachFlags?: string[] | null;
  proposedDates?: string[] | null;
  infoSheetSentAt?: string | null;
  chatInviteSentAt?: string | null;
  referralSentAt?: string | null;
  depositPaidAt?: string | null;
  bookingId?: string | null;
  convertedToBookingId?: string | null;
  convertedToContractId?: string | null;
  proposalId?: string | null;
  hasDateConflict?: boolean | null;
  conflictSource?: string | null;
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

interface RouteTarget {
  id: string;
  name: string;
  roleLabel: string | null;
  tags: string[] | null;
  capabilities: string[] | null;
  isInternal: boolean | null;
  isAgent: boolean | null;
  active: boolean | null;
  preferred: boolean | null;
  availabilitySource?: string | null;
  notes?: string | null;
}

interface RouteTargetsResponse {
  targets: RouteTarget[];
}

interface DraftRouteCandidate {
  id: string;
  inquiryId: string;
  routeTargetId: string;
  status: string;
  matchScore: number | null;
  matchReasons: string[] | null;
  matchedCapabilities: string[] | null;
  matchedTags: string[] | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface DraftRouteCandidatesResponse {
  candidates: DraftRouteCandidate[];
}

interface InternalNote {
  id: string;
  inquiryId: string;
  body: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface InternalNoteResponse {
  note: InternalNote | null;
}

interface ScheduleDraft {
  id: string;
  inquiryId?: string | null;
  contractId?: string | null;
  bookingId?: string | null;
  title?: string | null;
  status?: string | null;
  eventDate?: string | null;
  location?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}

interface ComposerResponseDraft {
  id: string;
  inquiryId: string;
  responseType: string;
  channel?: string | null;
  personalNote?: string | null;
  body: string;
  status: string;
  sentAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface ComposerResponse {
  responses: ComposerResponseDraft[];
}

interface ContractSummary {
  id: string;
  clientName?: string | null;
  eventDates?: string | null;
  eventLocation?: string | null;
  packageDetails?: string | null;
  status?: string | null;
  contractSource?: string | null;
  contractUrl?: string | null;
  fileUrl?: string | null;
  bookingId?: string | null;
  inquiryId?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
}

interface ContractSummaryResponse {
  contract: ContractSummary;
}

interface TrustTimelineEntry {
  id: string;
  eventType: string;
  eventCategory?: string | null;
  dimension?: string | null;
  signalStrength?: number | null;
  createdAt?: string | null;
  source?: string | null;
  personName?: string | null;
  personType?: string | null;
  matchStatus?: string | null;
  matchConfidence?: number | null;
  matchReason?: string | null;
  evidenceText?: string | null;
  status?: string | null;
  routeTargetId?: string | null;
  routeTargetName?: string | null;
  responseId?: string | null;
  responseType?: string | null;
}

interface TrustTimelineResponse {
  timeline: TrustTimelineEntry[];
}

type SortMode = "newest" | "oldest" | "requestedDateAsc" | "requestedDateDesc";

interface NetworkMatch {
  target: RouteTarget;
  reasons: string[];
  score: number;
  matchedCapabilities: string[];
  matchedTags: string[];
}

interface TimelineEntry {
  id: string;
  label: string;
  description?: string;
  at?: string | null;
}

const OPERATOR_ROLES = new Set(["artist"]);

const MODULE_PLACEHOLDERS = [
  { title: "Payment state", description: "Read-only placeholder for payment-state metadata.", icon: CreditCard },
];

function draftRouteCandidatesQueryKey(inquiryId?: string | null) {
  return ["/api/inquiries", inquiryId, "draft-route-candidates"] as const;
}

function internalNoteQueryKey(inquiryId?: string | null) {
  return ["/api/inquiries", inquiryId, "internal-note"] as const;
}

function scheduleDraftQueryKey(inquiryId?: string | null) {
  return ["/api/schedule-drafts/by-inquiry", inquiryId] as const;
}

function composerQueryKey(inquiryId?: string | null) {
  return ["/api/inquiries", inquiryId, "composer"] as const;
}

function contractSummaryQueryKey(contractId?: string | null) {
  return ["/api/vault/contracts", contractId] as const;
}

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

function formatDateTime(value?: string | null): string {
  if (!value) return "Date not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function valueLabel(value?: string | null): string {
  if (!value || typeof value !== "string") return "";
  return value.replace(/[_-]/g, " ");
}

function sentenceLabel(value?: string | null): string {
  const label = valueLabel(value).trim();
  if (!label) return "Timeline event";
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

function sourceValueLabel(source?: string | null): string {
  if (!source || typeof source !== "string") return "Existing inquiry";
  return valueLabel(source);
}

function sourceLabel(inquiry: InquiryWorkspaceInquiry): string {
  return sourceValueLabel(inquiry.metadata?.source);
}

function statusLabel(status?: string | null): string {
  if (!status) return "Unknown";
  return valueLabel(status);
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

function responseTimestamp(response: ComposerResponseDraft): number {
  return timestamp(response.updatedAt) ?? timestamp(response.createdAt) ?? 0;
}

function bodyExcerpt(value?: string | null): string {
  if (!value || !value.trim()) return "";
  const compact = value.trim().replace(/\s+/g, " ");
  return compact.length > 220 ? `${compact.slice(0, 217)}...` : compact;
}

function textList(values?: string[] | null): string[] {
  return Array.isArray(values) ? values.filter((value): value is string => typeof value === "string" && value.trim().length > 0) : [];
}

function textTokens(value?: string | null): string[] {
  return valueLabel(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
}

function matchesToken(value: string | null | undefined, tokens: string[]): boolean {
  if (!value || tokens.length === 0) return false;
  const normalized = valueLabel(value).toLowerCase();
  return tokens.some((token) => normalized.includes(token));
}

function buildNetworkMatches(targets: RouteTarget[], inquiry: InquiryWorkspaceInquiry): NetworkMatch[] {
  const serviceTokens = Array.from(new Set([...textTokens(inquiry.serviceType), ...textTokens(inquiry.eventType)]));
  const locationTokens = Array.from(new Set(textTokens(inquiry.eventLocation)));

  return targets
    .filter((target) => target.active !== false)
    .map((target) => {
      const capabilities = textList(target.capabilities);
      const tags = textList(target.tags);
      const reasons: string[] = [];
      let score = 0;

      const capabilityMatches = capabilities.filter((capability) => matchesToken(capability, serviceTokens));
      if (capabilityMatches.length > 0) {
        score += 40;
        reasons.push(`Capability match: ${capabilityMatches.slice(0, 2).join(", ")}`);
      }

      const serviceTagMatches = tags.filter((tag) => matchesToken(tag, serviceTokens));
      if (serviceTagMatches.length > 0) {
        score += 25;
        reasons.push(`Service tag match: ${serviceTagMatches.slice(0, 2).join(", ")}`);
      }

      if (matchesToken(target.roleLabel, serviceTokens)) {
        score += 20;
        reasons.push(`Role matches ${valueLabel(inquiry.serviceType || inquiry.eventType)}`);
      }

      const locationTagMatches = tags.filter((tag) => matchesToken(tag, locationTokens));
      const locationMatches = [...locationTagMatches, target.notes || ""].filter((value) => matchesToken(value, locationTokens));
      if (locationMatches.length > 0) {
        score += 15;
        reasons.push(`Location cue matches ${inquiry.eventLocation}`);
      }

      if (inquiry.eventDate && target.availabilitySource) {
        score += 5;
        reasons.push(`${valueLabel(target.availabilitySource)} availability source listed for date review`);
      }

      if (target.preferred) {
        score += 10;
        reasons.unshift("Preferred contact");
      }

      return {
        target,
        reasons,
        score: Math.min(score, 100),
        matchedCapabilities: capabilityMatches,
        matchedTags: Array.from(new Set([...serviceTagMatches, ...locationTagMatches])),
      };
    })
    .filter((match) => match.reasons.length > 0)
    .sort((a, b) => b.score - a.score || a.target.name.localeCompare(b.target.name));
}

function detailList(parts: Array<string | null | undefined>): string | undefined {
  const details = parts.filter((part): part is string => Boolean(part && part.trim().length > 0));
  return details.length > 0 ? details.join(" / ") : undefined;
}

function addTimelineEntry(entries: TimelineEntry[], entry: TimelineEntry) {
  if (entries.some((existing) => existing.id === entry.id)) return;
  entries.push(entry);
}

function buildTrustTimelineEntries(entries: TrustTimelineEntry[]): TimelineEntry[] {
  return entries
    .map((entry, index) => ({
      id: `trust-${entry.id || index}`,
      label: sentenceLabel(entry.eventType),
      description: detailList([
        entry.routeTargetName ? `Target: ${entry.routeTargetName}` : null,
        entry.personName ? `${sentenceLabel(entry.personType || "person")}: ${entry.personName}` : null,
        entry.responseType ? `Response: ${valueLabel(entry.responseType)}` : null,
        entry.status ? `Status: ${valueLabel(entry.status)}` : null,
        entry.matchStatus ? `Match: ${valueLabel(entry.matchStatus)}${typeof entry.matchConfidence === "number" ? ` (${entry.matchConfidence}%)` : ""}` : null,
        entry.matchReason,
        entry.evidenceText,
        entry.source ? `Source: ${valueLabel(entry.source)}` : null,
      ]),
      at: entry.createdAt,
    }))
    .sort((a, b) => {
      const timeA = timestamp(a.at);
      const timeB = timestamp(b.at);
      if (timeA === null && timeB === null) return 0;
      if (timeA === null) return 1;
      if (timeB === null) return -1;
      return timeA - timeB;
    });
}

function buildTimelineEntries(inquiry: InquiryWorkspaceInquiry): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const holdPlacedAt = inquiry.hold?.placedAt || inquiry.holdPlacedAt;
  const holdExpiresAt = inquiry.hold?.expiresAt || inquiry.holdExpiresAt;
  const holdReason = inquiry.hold?.reason || inquiry.holdReason;

  addTimelineEntry(entries, {
    id: "created",
    label: "Inquiry received",
    description: detailList([sourceLabel(inquiry), requestSummary(inquiry)]),
    at: inquiry.createdAt,
  });

  if (inquiry.infoSheetSentAt) {
    addTimelineEntry(entries, {
      id: "info-sheet",
      label: "Info sheet recorded as sent",
      at: inquiry.infoSheetSentAt,
    });
  }

  if (inquiry.chatInviteSentAt) {
    addTimelineEntry(entries, {
      id: "chat-invite",
      label: "Chat invite recorded as sent",
      at: inquiry.chatInviteSentAt,
    });
  }

  if (inquiry.firstResponseAt) {
    addTimelineEntry(entries, {
      id: "first-response",
      label: "First response recorded",
      at: inquiry.firstResponseAt,
    });
  }

  if (holdPlacedAt) {
    addTimelineEntry(entries, {
      id: "hold-placed",
      label: "Hold placed",
      description: holdReason || undefined,
      at: holdPlacedAt,
    });
  }

  if (holdExpiresAt) {
    addTimelineEntry(entries, {
      id: "hold-expires",
      label: "Hold expiry recorded",
      description: holdReason || undefined,
      at: holdExpiresAt,
    });
  }

  if (inquiry.referralSentAt) {
    addTimelineEntry(entries, {
      id: "referral",
      label: "Referral recorded",
      at: inquiry.referralSentAt,
    });
  }

  if (Array.isArray(inquiry.proposedDates) && inquiry.proposedDates.length > 0) {
    addTimelineEntry(entries, {
      id: "proposed-dates",
      label: "Alternative dates recorded",
      description: `${inquiry.proposedDates.length} date${inquiry.proposedDates.length === 1 ? "" : "s"} proposed`,
      at: inquiry.lastActionAt || inquiry.updatedAt,
    });
  }

  if (inquiry.depositPaidAt) {
    addTimelineEntry(entries, {
      id: "deposit",
      label: "Deposit status recorded",
      at: inquiry.depositPaidAt,
    });
  }

  if (inquiry.bookingId || inquiry.convertedToBookingId) {
    addTimelineEntry(entries, {
      id: "booking-reference",
      label: "Booking reference present",
      at: inquiry.updatedAt,
    });
  }

  if (inquiry.convertedToContractId) {
    addTimelineEntry(entries, {
      id: "contract-reference",
      label: "Contract reference present",
      at: inquiry.updatedAt,
    });
  }

  if (inquiry.proposalId) {
    addTimelineEntry(entries, {
      id: "proposal-reference",
      label: "Proposal reference present",
      at: inquiry.updatedAt,
    });
  }

  if (inquiry.status) {
    addTimelineEntry(entries, {
      id: "status",
      label: `Current status: ${statusLabel(inquiry.status)}`,
      description: inquiry.statusReason || undefined,
      at: inquiry.updatedAt || inquiry.createdAt,
    });
  }

  if (inquiry.nextAction || inquiry.nextActionDueAt) {
    addTimelineEntry(entries, {
      id: "next-action",
      label: "Next action tracked",
      description: detailList([valueLabel(inquiry.nextAction), inquiry.ownerName ? `Owner: ${inquiry.ownerName}` : null]),
      at: inquiry.nextActionDueAt || inquiry.nextSlaDue,
    });
  }

  if (Array.isArray(inquiry.breachFlags) && inquiry.breachFlags.length > 0) {
    addTimelineEntry(entries, {
      id: "breach-flags",
      label: "SLA flags recorded",
      description: inquiry.breachFlags.map(valueLabel).join(", "),
      at: inquiry.nextSlaDue || inquiry.updatedAt,
    });
  }

  if (inquiry.hasDateConflict) {
    addTimelineEntry(entries, {
      id: "date-conflict",
      label: "Date conflict detected",
      description: inquiry.conflictSource || undefined,
      at: inquiry.updatedAt,
    });
  }

  return entries.sort((a, b) => {
    const timeA = timestamp(a.at);
    const timeB = timestamp(b.at);
    if (timeA === null && timeB === null) return 0;
    if (timeA === null) return 1;
    if (timeB === null) return -1;
    return timeA - timeB;
  });
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

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center border border-hairline px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-ink/55">
      {children}
    </span>
  );
}

export default function InquiryWorkspace() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [internalNoteBody, setInternalNoteBody] = useState("");
  const isOperator = typeof user?.role === "string" && OPERATOR_ROLES.has(user.role);
  const artistSlug = typeof (user as { artistSlug?: unknown } | undefined)?.artistSlug === "string"
    ? (user as { artistSlug?: string }).artistSlug || ""
    : "";

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
  const routeTargetsQuery = useQuery<RouteTargetsResponse>({
    queryKey: ["/api/route-targets"],
    queryFn: async () => {
      const res = await fetch("/api/route-targets", { credentials: "include" });
      if (res.status === 401) throw new Error("401");
      if (!res.ok) throw new Error("Failed to load route targets");
      const payload = await res.json();
      return {
        targets: Array.isArray(payload?.targets) ? payload.targets : [],
      };
    },
    enabled: isAuthenticated && isOperator && inquiries.length > 0,
    retry: false,
  });
  const routeTargets = routeTargetsQuery.data?.targets ?? [];
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
  const selectedInquiryId = selectedInquiry?.id ?? null;
  const selectedThreadToken = selectedInquiry?.threadToken ?? null;
  const selectedContractId = selectedInquiry?.convertedToContractId ?? null;
  const draftCandidatesQuery = useQuery<DraftRouteCandidatesResponse>({
    queryKey: draftRouteCandidatesQueryKey(selectedInquiryId),
    queryFn: async () => {
      if (!selectedInquiryId) return { candidates: [] };
      const res = await fetch(`/api/inquiries/${selectedInquiryId}/draft-route-candidates`, { credentials: "include" });
      if (res.status === 401) throw new Error("401");
      if (!res.ok) throw new Error("Failed to load draft route candidates");
      const payload = await res.json();
      return {
        candidates: Array.isArray(payload?.candidates) ? payload.candidates : [],
      };
    },
    enabled: isAuthenticated && isOperator && Boolean(selectedInquiryId),
    retry: false,
  });
  const draftCandidates = draftCandidatesQuery.data?.candidates ?? [];
  const internalNoteQuery = useQuery<InternalNoteResponse>({
    queryKey: internalNoteQueryKey(selectedInquiryId),
    queryFn: async () => {
      if (!selectedInquiryId) return { note: null };
      const res = await fetch(`/api/inquiries/${encodeURIComponent(selectedInquiryId)}/internal-note`, { credentials: "include" });
      if (res.status === 401) throw new Error("401");
      if (!res.ok) throw new Error("Failed to load internal note");
      const payload = await res.json();
      return {
        note: payload?.note && typeof payload.note.body === "string" ? payload.note : null,
      };
    },
    enabled: isAuthenticated && isOperator && Boolean(selectedInquiryId),
    retry: false,
  });
  const scheduleDraftQuery = useQuery<ScheduleDraft | null>({
    queryKey: scheduleDraftQueryKey(selectedInquiryId),
    queryFn: async () => {
      if (!selectedInquiryId) return null;
      const res = await fetch(`/api/schedule-drafts/by-inquiry/${encodeURIComponent(selectedInquiryId)}`, { credentials: "include" });
      if (res.status === 404) return null;
      if (res.status === 401) throw new Error("401");
      if (!res.ok) throw new Error("Failed to load schedule draft");
      return res.json() as Promise<ScheduleDraft>;
    },
    enabled: isAuthenticated && isOperator && Boolean(selectedInquiryId),
    retry: false,
  });
  const composerQuery = useQuery<ComposerResponse>({
    queryKey: composerQueryKey(selectedInquiryId),
    queryFn: async () => {
      if (!selectedInquiryId) return { responses: [] };
      const res = await fetch(`/api/inquiries/${encodeURIComponent(selectedInquiryId)}/composer`, { credentials: "include" });
      if (res.status === 401) throw new Error("401");
      if (!res.ok) throw new Error("Failed to load response drafts");
      const payload = await res.json();
      return {
        responses: Array.isArray(payload?.responses) ? payload.responses : [],
      };
    },
    enabled: isAuthenticated && isOperator && Boolean(selectedInquiryId),
    retry: false,
  });
  const contractSummaryQuery = useQuery<ContractSummaryResponse | null>({
    queryKey: contractSummaryQueryKey(selectedContractId),
    queryFn: async () => {
      if (!selectedContractId) return null;
      const res = await fetch(`/api/vault/contracts/${encodeURIComponent(selectedContractId)}`, { credentials: "include" });
      if (res.status === 404) return null;
      if (res.status === 401) throw new Error("401");
      if (!res.ok) throw new Error("Failed to load linked contract");
      return res.json() as Promise<ContractSummaryResponse>;
    },
    enabled: isAuthenticated && isOperator && Boolean(selectedContractId),
    retry: false,
  });
  const trustTimelineQuery = useQuery<TrustTimelineResponse>({
    queryKey: ["/api/inquiries", selectedThreadToken, "trust-timeline"],
    queryFn: async () => {
      if (!selectedThreadToken) return { timeline: [] };
      const res = await fetch(`/api/inquiries/${encodeURIComponent(selectedThreadToken)}/trust-timeline`, { credentials: "include" });
      if (res.status === 401) throw new Error("401");
      if (!res.ok) throw new Error("Failed to load trust timeline");
      const payload = await res.json();
      return {
        timeline: Array.isArray(payload?.timeline) ? payload.timeline : [],
      };
    },
    enabled: isAuthenticated && isOperator && Boolean(selectedThreadToken),
    retry: false,
  });
  const savedDraftTargetIds = useMemo(
    () => new Set(draftCandidates.map((candidate) => candidate.routeTargetId)),
    [draftCandidates],
  );
  const localTimelineEntries = useMemo(
    () => (selectedInquiry ? buildTimelineEntries(selectedInquiry) : []),
    [selectedInquiry],
  );
  const trustTimelineEntries = useMemo(
    () => buildTrustTimelineEntries(trustTimelineQuery.data?.timeline ?? []),
    [trustTimelineQuery.data?.timeline],
  );
  const timelineEntries = trustTimelineEntries.length > 0 ? trustTimelineEntries : localTimelineEntries;
  const networkMatches = useMemo(
    () => (selectedInquiry ? buildNetworkMatches(routeTargets, selectedInquiry) : []),
    [routeTargets, selectedInquiry],
  );
  const saveDraftCandidate = useMutation({
    mutationFn: async ({ inquiryId, match }: { inquiryId: string; match: NetworkMatch }) => {
      const res = await fetch(`/api/inquiries/${inquiryId}/draft-route-candidates`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeTargetId: match.target.id,
          status: "draft",
          matchScore: match.score,
          matchReasons: match.reasons,
          matchedCapabilities: match.matchedCapabilities,
          matchedTags: match.matchedTags,
        }),
      });
      if (res.status === 401) throw new Error("401");
      if (!res.ok) throw new Error("Failed to save draft route candidate");
      return res.json() as Promise<{ candidate: DraftRouteCandidate }>;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: draftRouteCandidatesQueryKey(variables.inquiryId) });
    },
  });
  const removeDraftCandidate = useMutation({
    mutationFn: async ({ inquiryId, routeTargetId }: { inquiryId: string; routeTargetId: string }) => {
      const res = await fetch(`/api/inquiries/${inquiryId}/draft-route-candidates/${routeTargetId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.status === 401) throw new Error("401");
      if (!res.ok) throw new Error("Failed to remove draft route candidate");
      return res.json() as Promise<{ success: boolean }>;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: draftRouteCandidatesQueryKey(variables.inquiryId) });
    },
  });
  const saveInternalNote = useMutation({
    mutationFn: async ({ inquiryId, body }: { inquiryId: string; body: string }) => {
      const res = await fetch(`/api/inquiries/${encodeURIComponent(inquiryId)}/internal-note`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.status === 401) throw new Error("401");
      if (!res.ok) throw new Error("Failed to save internal note");
      return res.json() as Promise<InternalNoteResponse>;
    },
    onSuccess: (data, variables) => {
      setInternalNoteBody(data.note?.body ?? variables.body);
      queryClient.invalidateQueries({ queryKey: internalNoteQueryKey(variables.inquiryId) });
    },
  });
  const savedInternalNoteBody = internalNoteQuery.data?.note?.body ?? "";
  const internalNoteIsDirty = internalNoteBody !== savedInternalNoteBody;
  const selectedScheduleDraft = scheduleDraftQuery.data ?? null;
  const scheduleDraftHref = selectedScheduleDraft?.id && artistSlug
    ? `/admin/${artistSlug}/schedules/${selectedScheduleDraft.id}`
    : null;
  const latestComposerResponse = useMemo(
    () => [...(composerQuery.data?.responses ?? [])].sort((a, b) => responseTimestamp(b) - responseTimestamp(a))[0] ?? null,
    [composerQuery.data?.responses],
  );
  const latestComposerExcerpt = bodyExcerpt(latestComposerResponse?.body);
  const selectedContract = contractSummaryQuery.data?.contract ?? null;
  const contractHref = selectedContract?.id && artistSlug
    ? `/admin/${artistSlug}/contracts/${selectedContract.id}`
    : null;

  useEffect(() => {
    if (filteredInquiries.length === 0) {
      if (selectedId) setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredInquiries.some((inquiry) => inquiry.id === selectedId)) {
      setSelectedId(filteredInquiries[0].id);
    }
  }, [filteredInquiries, selectedId]);

  useEffect(() => {
    setInternalNoteBody(internalNoteQuery.data?.note?.body ?? "");
  }, [selectedInquiryId, internalNoteQuery.data?.note?.body]);

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
                  <div className="border border-hairline bg-surface px-4 py-4 sm:col-span-2" data-testid="trusted-network-card">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-ink/50" />
                        <h3 className="font-serif text-base tracking-tight">Trusted network</h3>
                      </div>
                      {!routeTargetsQuery.isLoading && !routeTargetsQuery.isError && (
                        <span className="text-xs text-ink/50">
                          {networkMatches.length} match{networkMatches.length === 1 ? "" : "es"}
                        </span>
                      )}
                    </div>

                    {routeTargetsQuery.isLoading && (
                      <div className="flex items-center gap-2 text-sm text-ink/60">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading network
                      </div>
                    )}

                    {routeTargetsQuery.isError && (
                      <p className="text-sm text-ink/60">
                        Could not load the read-only network lookup.
                      </p>
                    )}

                    {!routeTargetsQuery.isLoading && !routeTargetsQuery.isError && routeTargets.length === 0 && (
                      <p className="text-sm text-ink/60">
                        No route targets are available in this operator network yet.
                      </p>
                    )}

                    {!routeTargetsQuery.isLoading && !routeTargetsQuery.isError && routeTargets.length > 0 && networkMatches.length === 0 && (
                      <p className="text-sm text-ink/60">
                        No active contacts match this inquiry's service, location, or date cues from existing network metadata.
                      </p>
                    )}

                    {!routeTargetsQuery.isLoading && !routeTargetsQuery.isError && networkMatches.length > 0 && (
                      <div className="space-y-3">
                        {networkMatches.slice(0, 5).map(({ target, reasons }) => {
                          const capabilities = textList(target.capabilities);
                          const tags = textList(target.tags);

                          return (
                            <div key={target.id} className="border-t border-hairline pt-3 first:border-t-0 first:pt-0">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-ink break-words">{target.name}</p>
                                  <p className="text-xs text-ink/55 mt-0.5">{target.roleLabel || "Network contact"}</p>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {target.preferred && <Pill>Preferred</Pill>}
                                  {target.isInternal === true && <Pill>Internal</Pill>}
                                  {target.isInternal === false && <Pill>External</Pill>}
                                  {target.isAgent === true && <Pill>Agent/system</Pill>}
                                </div>
                              </div>

                              {capabilities.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {capabilities.slice(0, 4).map((capability) => (
                                    <Pill key={`${target.id}-cap-${capability}`}>{capability}</Pill>
                                  ))}
                                </div>
                              )}

                              {tags.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {tags.slice(0, 4).map((tag) => (
                                    <span key={`${target.id}-tag-${tag}`} className="text-xs text-ink/55">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <ul className="mt-2 space-y-1 text-xs text-ink/60">
                                {reasons.map((reason) => (
                                  <li key={`${target.id}-${reason}`}>{reason}</li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="border border-hairline bg-surface px-4 py-4 sm:col-span-2" data-testid="internal-notes-card">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <StickyNote className="w-4 h-4 text-ink/50" />
                        <h3 className="font-serif text-base tracking-tight">Internal notes</h3>
                      </div>
                      <Pill>Private/internal only</Pill>
                    </div>

                    {internalNoteQuery.isLoading ? (
                      <div className="flex items-center gap-2 text-sm text-ink/60">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading internal note
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <textarea
                          value={internalNoteBody}
                          onChange={(event) => setInternalNoteBody(event.target.value)}
                          placeholder="Add a private operator note"
                          rows={5}
                          className="w-full resize-y border border-hairline bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink/35 focus:outline-none focus:border-ink/40"
                          data-testid="textarea-internal-note"
                        />
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs text-ink/50">
                            {internalNoteQuery.data?.note?.updatedAt ? `Last saved ${formatDateTime(internalNoteQuery.data.note.updatedAt)}` : "Not saved yet"}
                          </p>
                          <button
                            type="button"
                            className="inline-flex h-8 w-fit items-center gap-1.5 border border-hairline px-3 text-xs text-ink/70 transition hover:bg-bg disabled:cursor-not-allowed disabled:text-ink/35 disabled:hover:bg-transparent"
                            disabled={!selectedInquiryId || !internalNoteIsDirty || saveInternalNote.isPending}
                            onClick={() => {
                              if (selectedInquiryId) {
                                saveInternalNote.mutate({ inquiryId: selectedInquiryId, body: internalNoteBody });
                              }
                            }}
                            data-testid="button-save-internal-note"
                          >
                            {saveInternalNote.isPending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                            {saveInternalNote.isPending ? "Saving" : "Save note"}
                          </button>
                        </div>
                      </div>
                    )}

                    {internalNoteQuery.isError && (
                      <p className="mt-3 text-sm text-ink/60">
                        Could not load this internal note.
                      </p>
                    )}

                    {saveInternalNote.isError && (
                      <p className="mt-3 text-sm text-ink/60">
                        Could not save this internal note. Please try again.
                      </p>
                    )}
                  </div>
                  <div className="border border-hairline bg-surface px-4 py-4 sm:col-span-2" data-testid="composer-response-card">
                    <div className="flex items-center gap-2 mb-3">
                      <Mail className="w-4 h-4 text-ink/50" />
                      <h3 className="font-serif text-base tracking-tight">Response draft</h3>
                    </div>

                    {composerQuery.isLoading && (
                      <div className="flex items-center gap-2 text-sm text-ink/60">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading response drafts
                      </div>
                    )}

                    {composerQuery.isError && (
                      <p className="text-sm text-ink/60">
                        Could not load composer response drafts.
                      </p>
                    )}

                    {!composerQuery.isLoading && !composerQuery.isError && !latestComposerResponse && (
                      <p className="text-sm text-ink/60">
                        No saved response draft exists for this inquiry yet.
                      </p>
                    )}

                    {!composerQuery.isLoading && !composerQuery.isError && latestComposerResponse && (
                      <div className="space-y-3">
                        <dl className="grid gap-x-5 gap-y-2 text-sm sm:grid-cols-2">
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-ink/45">Response type</dt>
                            <dd className="text-ink break-words">{sentenceLabel(latestComposerResponse.responseType)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-ink/45">Status</dt>
                            <dd className="text-ink break-words">{statusLabel(latestComposerResponse.status)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-ink/45">Channel</dt>
                            <dd className="text-ink break-words">{sentenceLabel(latestComposerResponse.channel || "email")}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-ink/45">Updated</dt>
                            <dd className="text-ink break-words">{formatDateTime(latestComposerResponse.updatedAt || latestComposerResponse.createdAt)}</dd>
                          </div>
                        </dl>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-ink/45 mb-1">Body excerpt</p>
                          <p className="border border-hairline bg-bg px-3 py-2 text-sm text-ink/70 break-words">
                            <EmptyValue>{latestComposerExcerpt}</EmptyValue>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="border border-hairline bg-surface px-4 py-4" data-testid="contract-summary-card">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-ink/50" />
                      <h3 className="font-serif text-base tracking-tight">Contract</h3>
                    </div>

                    {!selectedContractId && (
                      <p className="text-sm text-ink/60">
                        No contract is linked to this inquiry yet.
                      </p>
                    )}

                    {selectedContractId && contractSummaryQuery.isLoading && (
                      <div className="flex items-center gap-2 text-sm text-ink/60">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading linked contract
                      </div>
                    )}

                    {selectedContractId && contractSummaryQuery.isError && (
                      <p className="text-sm text-ink/60">
                        Could not load the linked contract.
                      </p>
                    )}

                    {selectedContractId && !contractSummaryQuery.isLoading && !contractSummaryQuery.isError && !selectedContract && (
                      <p className="text-sm text-ink/60">
                        No accessible contract record was found for this inquiry.
                      </p>
                    )}

                    {selectedContractId && !contractSummaryQuery.isLoading && !contractSummaryQuery.isError && selectedContract && (
                      <div className="space-y-3">
                        <dl className="space-y-2 text-sm">
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-ink/45">Package / type</dt>
                            <dd className="text-ink break-words">
                              <EmptyValue>{selectedContract.packageDetails}</EmptyValue>
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-ink/45">Status</dt>
                            <dd className="text-ink break-words">{statusLabel(selectedContract.status)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-ink/45">Source</dt>
                            <dd className="text-ink break-words">
                              <EmptyValue>{selectedContract.contractSource}</EmptyValue>
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-ink/45">Updated</dt>
                            <dd className="text-ink break-words">{formatDateTime(selectedContract.updatedAt || selectedContract.createdAt)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-ink/45">Contract ID</dt>
                            <dd className="text-ink break-all">{selectedContract.id}</dd>
                          </div>
                        </dl>
                        {contractHref && (
                          <Link
                            href={contractHref}
                            className="inline-flex h-8 w-fit items-center border border-hairline px-3 text-xs text-ink/70 transition hover:bg-bg"
                            data-testid="link-open-contract"
                          >
                            Open contract
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="border border-hairline bg-surface px-4 py-4" data-testid="schedule-draft-card">
                    <div className="flex items-center gap-2 mb-3">
                      <CalendarDays className="w-4 h-4 text-ink/50" />
                      <h3 className="font-serif text-base tracking-tight">Schedule draft</h3>
                    </div>

                    {scheduleDraftQuery.isLoading && (
                      <div className="flex items-center gap-2 text-sm text-ink/60">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading schedule draft
                      </div>
                    )}

                    {scheduleDraftQuery.isError && (
                      <p className="text-sm text-ink/60">
                        Could not load the linked schedule draft.
                      </p>
                    )}

                    {!scheduleDraftQuery.isLoading && !scheduleDraftQuery.isError && !selectedScheduleDraft && (
                      <p className="text-sm text-ink/60">
                        No private schedule draft is linked to this inquiry yet.
                      </p>
                    )}

                    {!scheduleDraftQuery.isLoading && !scheduleDraftQuery.isError && selectedScheduleDraft && (
                      <div className="space-y-3">
                        <dl className="space-y-2 text-sm">
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-ink/45">Title</dt>
                            <dd className="text-ink break-words">
                              <EmptyValue>{selectedScheduleDraft.title}</EmptyValue>
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-ink/45">Status</dt>
                            <dd className="text-ink break-words">{statusLabel(selectedScheduleDraft.status)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-ink/45">Updated</dt>
                            <dd className="text-ink break-words">{formatDateTime(selectedScheduleDraft.updatedAt || selectedScheduleDraft.createdAt)}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-wide text-ink/45">Draft ID</dt>
                            <dd className="text-ink break-all">{selectedScheduleDraft.id}</dd>
                          </div>
                        </dl>
                        {scheduleDraftHref && (
                          <Link
                            href={scheduleDraftHref}
                            className="inline-flex h-8 w-fit items-center border border-hairline px-3 text-xs text-ink/70 transition hover:bg-bg"
                            data-testid="link-open-schedule-draft"
                          >
                            Open schedule draft
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="border border-hairline bg-surface px-4 py-4 sm:col-span-2" data-testid="draft-routing-candidates-card">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-ink/50" />
                        <h3 className="font-serif text-base tracking-tight">Draft routing candidates</h3>
                      </div>
                      {!routeTargetsQuery.isLoading && !routeTargetsQuery.isError && (
                        <span className="text-xs text-ink/50">
                          {draftCandidatesQuery.isLoading ? "Loading saved state" : `${draftCandidates.length} saved`}
                        </span>
                      )}
                    </div>

                    {(routeTargetsQuery.isLoading || draftCandidatesQuery.isLoading) && (
                      <div className="flex items-center gap-2 text-sm text-ink/60">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading candidates
                      </div>
                    )}

                    {routeTargetsQuery.isError && (
                      <p className="text-sm text-ink/60">
                        Could not load draft candidates from the operator network.
                      </p>
                    )}

                    {draftCandidatesQuery.isError && (
                      <p className="text-sm text-ink/60">
                        Could not load saved draft candidate state.
                      </p>
                    )}

                    {saveDraftCandidate.isError && (
                      <p className="text-sm text-ink/60">
                        Could not save this draft candidate. Please try again.
                      </p>
                    )}

                    {removeDraftCandidate.isError && (
                      <p className="text-sm text-ink/60">
                        Could not remove this draft candidate. Please try again.
                      </p>
                    )}

                    {!routeTargetsQuery.isLoading && !routeTargetsQuery.isError && routeTargets.length === 0 && (
                      <p className="text-sm text-ink/60">
                        No route targets are available for draft candidates yet.
                      </p>
                    )}

                    {!routeTargetsQuery.isLoading && !routeTargetsQuery.isError && routeTargets.length > 0 && networkMatches.length === 0 && (
                      <p className="text-sm text-ink/60">
                        No draft candidates match this inquiry from existing route-target metadata.
                      </p>
                    )}

                    {!routeTargetsQuery.isLoading && !routeTargetsQuery.isError && networkMatches.length > 0 && (
                      <div className="space-y-3">
                        {networkMatches.slice(0, 3).map((match) => {
                          const { target, reasons, score, matchedCapabilities, matchedTags } = match;
                          const isSaved = savedDraftTargetIds.has(target.id);
                          const isSaving =
                            saveDraftCandidate.isPending &&
                            saveDraftCandidate.variables?.inquiryId === selectedInquiryId &&
                            saveDraftCandidate.variables?.match.target.id === target.id;
                          const isRemoving =
                            removeDraftCandidate.isPending &&
                            removeDraftCandidate.variables?.inquiryId === selectedInquiryId &&
                            removeDraftCandidate.variables?.routeTargetId === target.id;
                          const saveDisabled = !selectedInquiryId || isSaved || isSaving || isRemoving || draftCandidatesQuery.isLoading;
                          const removeDisabled = !selectedInquiryId || isSaving || isRemoving || draftCandidatesQuery.isLoading;

                          return (
                            <div key={`draft-${target.id}`} className="border-t border-hairline pt-3 first:border-t-0 first:pt-0">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-medium text-ink break-words">{target.name}</p>
                                    <Pill>{isSaved ? "Saved draft" : "Draft Candidate"}</Pill>
                                  </div>
                                  <p className="text-xs text-ink/55 mt-0.5">{target.roleLabel || "Network contact"}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                  <div className="text-xs text-ink/60 border border-hairline px-2 py-1 whitespace-nowrap">
                                    {score}/100
                                  </div>
                                  {isSaved ? (
                                    <button
                                      type="button"
                                      className="inline-flex h-7 items-center gap-1 border border-hairline px-2 text-xs text-ink/70 transition hover:bg-bg disabled:cursor-not-allowed disabled:text-ink/35 disabled:hover:bg-transparent"
                                      disabled={removeDisabled}
                                      onClick={() => {
                                        if (selectedInquiryId) {
                                          removeDraftCandidate.mutate({ inquiryId: selectedInquiryId, routeTargetId: target.id });
                                        }
                                      }}
                                      data-testid={`button-remove-draft-candidate-${target.id}`}
                                      aria-label={`Remove ${target.name} from draft candidates`}
                                    >
                                      {isRemoving ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <XCircle className="w-3.5 h-3.5" />
                                      )}
                                      {isRemoving ? "Removing" : "Remove"}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="inline-flex h-7 items-center gap-1 border border-hairline px-2 text-xs text-ink/70 transition hover:bg-bg disabled:cursor-not-allowed disabled:text-ink/35 disabled:hover:bg-transparent"
                                      disabled={saveDisabled}
                                      onClick={() => {
                                        if (selectedInquiryId) {
                                          saveDraftCandidate.mutate({ inquiryId: selectedInquiryId, match });
                                        }
                                      }}
                                      data-testid={`button-save-draft-candidate-${target.id}`}
                                      aria-label={`Save ${target.name} as draft candidate`}
                                    >
                                      {isSaving ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <PlusCircle className="w-3.5 h-3.5" />
                                      )}
                                      {isSaving ? "Saving" : "Save draft"}
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="mt-2 flex flex-wrap gap-1">
                                {target.preferred && <Pill>Preferred</Pill>}
                                {target.isInternal === true && <Pill>Internal</Pill>}
                                {target.isInternal === false && <Pill>External</Pill>}
                                {target.isAgent === true && <Pill>Agent/system</Pill>}
                              </div>

                              {matchedCapabilities.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-[11px] uppercase tracking-wide text-ink/45 mb-1">Matching capabilities</p>
                                  <div className="flex flex-wrap gap-1">
                                    {matchedCapabilities.slice(0, 4).map((capability) => (
                                      <Pill key={`draft-${target.id}-cap-${capability}`}>{capability}</Pill>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {matchedTags.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-[11px] uppercase tracking-wide text-ink/45 mb-1">Matching tags</p>
                                  <div className="flex flex-wrap gap-1">
                                    {matchedTags.slice(0, 4).map((tag) => (
                                      <span key={`draft-${target.id}-tag-${tag}`} className="text-xs text-ink/55">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <ul className="mt-2 space-y-1 text-xs text-ink/60">
                                {reasons.map((reason) => (
                                  <li key={`draft-${target.id}-${reason}`}>{reason}</li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="border border-hairline bg-surface px-4 py-4 sm:col-span-2" data-testid="coordination-timeline-card">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock3 className="w-4 h-4 text-ink/50" />
                      <h3 className="font-serif text-base tracking-tight">Coordination timeline</h3>
                    </div>
                    {timelineEntries.length > 0 ? (
                      <ol className="space-y-3">
                        {timelineEntries.map((entry) => (
                          <li key={entry.id} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 text-sm">
                            <time className="text-xs text-ink/50 leading-5">{formatDateTime(entry.at)}</time>
                            <div className="border-l border-hairline pl-3">
                              <p className="text-ink font-medium">{entry.label}</p>
                              {entry.description && (
                                <p className="text-ink/60 mt-0.5 break-words">{entry.description}</p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-sm text-ink/60">
                        No timeline activity is available from the loaded inquiry record yet.
                      </p>
                    )}
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
