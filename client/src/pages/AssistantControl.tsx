import { useState, useEffect } from "react";
import { useRoute, useSearch, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { DeliveryPreview } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AssistantSettings {
  preferredDeliveryChannel: "sms" | "email" | "both";
  assistantPhoneEnabled: boolean;
  assistantEmailEnabled: boolean;
  assistantPromptMode: "immediate" | "digest";
  assistantQuietHoursStart: number | null;
  assistantQuietHoursEnd: number | null;
  assistantTimezone: string | null;
  assistantDryRun: boolean;
  isAdmin: boolean;
}

interface AssistantPrompt {
  id: string;
  operatorId: string;
  inquiryId: string | null;
  referralId: string | null;
  contactId: string | null;
  promptType: string;
  title: string;
  body: string;
  recommendedActions: string[] | null;
  deliveryChannel: string | null;
  deliveryStatus: string;
  deliveryError: string | null;
  createdAt: string;
  sentAt: string | null;
  actedOnAt: string | null;
}

interface RouteTarget {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  roleLabel: string | null;
  active: boolean | null;
  preferred: boolean | null;
  isInternal: boolean | null;
  isAgent: boolean | null;
}

interface InquiryRoute {
  id: string;
  routeTargetId: string;
  routeType: string;
  status: string;
  preflightChannel: string | null;
  responseRaw: string | null;
}

interface InquiryResponse {
  id: string;
  responseType: string;
  status: string;
  body: string;
  personalNote: string | null;
  sentAt: string | null;
}

interface ComposerData {
  context: {
    clientName: string;
    serviceType: string | null;
    eventDate: string | null;
    eventLocation: string | null;
    operatorName: string;
    pricingLink: string | null;
    dryRun?: boolean;
  };
  defaults: { pricing: string; decline: string; referral: string };
  routes: InquiryRoute[];
  responses: InquiryResponse[];
  targets: RouteTarget[];
}

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-green-100 text-green-900 border-green-300",
  queued: "bg-brass/20 text-ink border-brass/40",
  skipped: "bg-ink/10 text-ink/70 border-ink/20",
  failed: "bg-red-100 text-red-900 border-red-300",
  pending: "bg-ink/10 text-ink/70 border-ink/20",
};

function fmt(d: string | null) {
  if (!d) return "—";
  try {
    return format(new Date(d), "MMM d, yyyy h:mm a");
  } catch {
    return "—";
  }
}

function hourLabel(h: number | null) {
  if (h === null || h === undefined) return "";
  const hr = ((h + 11) % 12) + 1;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hr}:00 ${ampm}`;
}

function linkedRef(p: AssistantPrompt): string | null {
  if (p.inquiryId) return `Inquiry ${p.inquiryId.slice(0, 8)}`;
  if (p.referralId) return `Referral ${p.referralId.slice(0, 8)}`;
  if (p.contactId) return `Contact ${p.contactId.slice(0, 8)}`;
  return null;
}

const ROUTE_TYPES = [
  "referral",
  "delegation",
  "review",
  "scheduling",
  "agent",
  "follow_up",
];

function InquiryComposer({ inquiryId }: { inquiryId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const composerKey = [`/api/inquiries/${inquiryId}/composer`];

  const composerQuery = useQuery<ComposerData>({
    queryKey: composerKey,
    queryFn: async () => {
      const res = await fetch(`/api/inquiries/${inquiryId}/composer`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load composer");
      return res.json();
    },
    retry: false,
  });

  const [mode, setMode] = useState<"pricing" | "decline" | "referral" | null>(null);
  const [note, setNote] = useState("");
  const [body, setBody] = useState("");
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [routeType, setRouteType] = useState("referral");
  const [dryRun, setDryRun] = useState(false);
  const [preview, setPreview] = useState<DeliveryPreview | null>(null);

  // Seed the dry-run toggle from the operator's saved preference (assistant settings).
  useEffect(() => {
    if (composerQuery.data?.context?.dryRun !== undefined) {
      setDryRun(!!composerQuery.data.context.dryRun);
    }
  }, [composerQuery.data?.context?.dryRun]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: composerKey });

  const startMode = (m: "pricing" | "decline" | "referral") => {
    setMode(m);
    setNote("");
    setBody(composerQuery.data?.defaults[m] ?? "");
  };

  const sendResponse = useMutation({
    mutationFn: async () => {
      if (!mode) return;
      if (dryRun) {
        const res = await apiRequest("POST", `/api/inquiries/${inquiryId}/responses/preview`, {
          responseType: mode,
          personalNote: note || null,
          body,
        });
        return res.json();
      }
      const draftRes = await apiRequest("POST", `/api/inquiries/${inquiryId}/responses`, {
        responseType: mode,
        personalNote: note || null,
        body,
      });
      const { response } = await draftRes.json();
      const sendRes = await apiRequest("POST", `/api/inquiry-responses/${response.id}/send`, {
        body,
        personalNote: note || null,
      });
      return sendRes.json();
    },
    onSuccess: (result: any) => {
      if (result?.dryRun && result.preview) {
        setPreview(result.preview);
        return;
      }
      toast({ title: "Message sent to client" });
      setMode(null);
      refresh();
    },
    onError: (err: Error) => {
      toast({ title: "Could not send", description: err.message, variant: "destructive" });
    },
  });

  const createRoutes = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/inquiries/${inquiryId}/routes`, {
        targetIds: selectedTargets,
        routeType,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Routes created" });
      setSelectedTargets([]);
      refresh();
    },
    onError: (err: Error) => {
      toast({ title: "Could not create routes", description: err.message, variant: "destructive" });
    },
  });

  const preflight = useMutation({
    mutationFn: async (routeId: string) => {
      if (dryRun) {
        const res = await apiRequest("POST", `/api/inquiry-routes/${routeId}/preflight/preview`, {});
        return res.json();
      }
      const res = await apiRequest("POST", `/api/inquiry-routes/${routeId}/preflight`, {});
      return res.json();
    },
    onSuccess: (result: any) => {
      if (result?.dryRun && result.preview) {
        setPreview(result.preview);
        return;
      }
      toast({ title: "Preflight sent" });
      refresh();
    },
    onError: (err: Error) => {
      toast({ title: "Could not send preflight", description: err.message, variant: "destructive" });
    },
  });

  const setRouteStatus = useMutation({
    mutationFn: async ({ routeId, status }: { routeId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/inquiry-routes/${routeId}`, { status });
      return res.json();
    },
    onSuccess: () => refresh(),
    onError: (err: Error) => {
      toast({ title: "Could not update route", description: err.message, variant: "destructive" });
    },
  });

  if (composerQuery.isLoading) {
    return (
      <div className="mt-4 flex items-center gap-2 text-ink/60 text-sm" data-testid={`status-composer-loading-${inquiryId}`}>
        <Loader2 className="w-4 h-4 animate-spin" /> Loading composer
      </div>
    );
  }
  if (!composerQuery.data) {
    return (
      <p className="mt-4 text-sm text-ink/60" data-testid={`text-composer-unavailable-${inquiryId}`}>
        Composer unavailable for this prompt.
      </p>
    );
  }

  const data = composerQuery.data;
  const ctx = data.context;
  const targetName = (id: string) => data.targets.find((t) => t.id === id)?.name ?? "Unknown";
  const acceptedCount = data.routes.filter((r) => r.status === "accepted").length;
  const referralSent = data.responses.some(
    (r) => r.responseType === "referral" && r.status === "sent",
  );

  return (
    <div className="mt-5 border-t border-hairline pt-5" data-testid={`composer-${inquiryId}`}>
      {/* INQUIRY CONTEXT */}
      <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-ink/70" data-testid={`composer-context-${inquiryId}`}>
        <div><span className="text-ink/50">Client:</span> {ctx.clientName}</div>
        <div><span className="text-ink/50">Service:</span> {ctx.serviceType || "—"}</div>
        <div><span className="text-ink/50">Date:</span> {ctx.eventDate || "—"}</div>
        <div><span className="text-ink/50">Location:</span> {ctx.eventLocation || "—"}</div>
      </div>

      {/* DRY-RUN TOGGLE */}
      <div className="mb-4 flex items-center justify-between gap-3 border border-hairline bg-bg px-3 py-2">
        <label className="flex items-center gap-2 text-sm" htmlFor={`dry-run-${inquiryId}`}>
          <input
            id={`dry-run-${inquiryId}`}
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            data-testid={`switch-composer-dry-run-${inquiryId}`}
          />
          <span className="font-medium">Dry run</span>
        </label>
        <span className="text-xs text-ink/55">
          {dryRun ? "Dry run: nothing will be sent." : "Off: sends are real."}
        </span>
      </div>

      {/* ACTION PICKER */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => startMode("pricing")}
          className="text-sm border border-hairline px-3 py-1.5 hover:bg-surface-2"
          data-testid={`button-mode-pricing-${inquiryId}`}
        >
          Send pricing / info
        </button>
        <button
          onClick={() => startMode("decline")}
          className="text-sm border border-hairline px-3 py-1.5 hover:bg-surface-2"
          data-testid={`button-mode-decline-${inquiryId}`}
        >
          Decline (no routing)
        </button>
        <button
          onClick={() => startMode("referral")}
          className="text-sm border border-hairline px-3 py-1.5 hover:bg-surface-2"
          data-testid={`button-mode-referral-${inquiryId}`}
        >
          Refer / route / delegate
        </button>
      </div>

      {/* COMPOSER PANEL */}
      {mode && (
        <div className="border border-hairline bg-bg p-4 mb-4" data-testid={`composer-panel-${inquiryId}`}>
          {mode === "referral" && (
            <div className="mb-4">
              <div className="font-medium text-sm mb-2">1. Route to your network</div>
              <p className="text-xs text-ink/55 mb-3">
                Ask each person before the client ever sees them. Only people who accept will be
                included in the referral message.
              </p>
              <div className="mb-3">
                <label className="block text-xs text-ink/55 mb-1">Route type</label>
                <select
                  value={routeType}
                  onChange={(e) => setRouteType(e.target.value)}
                  className="w-full sm:w-56 px-3 py-2 bg-bg border border-hairline text-sm"
                  data-testid={`select-route-type-${inquiryId}`}
                >
                  {ROUTE_TYPES.map((rt) => (
                    <option key={rt} value={rt}>{rt}</option>
                  ))}
                </select>
              </div>

              {data.targets.length === 0 ? (
                <p className="text-xs text-ink/55 mb-2" data-testid={`text-no-targets-${inquiryId}`}>
                  No route targets yet. Add people to your network from the routing settings.
                </p>
              ) : (
                <div className="space-y-2 mb-3">
                  {data.targets.filter((t) => t.active !== false).map((t) => (
                    <label
                      key={t.id}
                      className="flex items-center gap-2 text-sm"
                      data-testid={`target-option-${t.id}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTargets.includes(t.id)}
                        onChange={(e) =>
                          setSelectedTargets((prev) =>
                            e.target.checked ? [...prev, t.id] : prev.filter((x) => x !== t.id),
                          )
                        }
                        data-testid={`checkbox-target-${t.id}`}
                      />
                      <span>{t.name}</span>
                      {t.roleLabel && <span className="text-xs text-ink/50">({t.roleLabel})</span>}
                    </label>
                  ))}
                </div>
              )}
              <button
                onClick={() => createRoutes.mutate()}
                disabled={selectedTargets.length === 0 || createRoutes.isPending}
                className="text-sm bg-ink text-bg px-3 py-1.5 disabled:opacity-50"
                data-testid={`button-create-routes-${inquiryId}`}
              >
                {createRoutes.isPending && <Loader2 className="w-3 h-3 animate-spin inline mr-1" />}
                Add selected to routing
              </button>

              {/* EXISTING ROUTES + PREFLIGHT */}
              {data.routes.length > 0 && (
                <div className="mt-4 space-y-2" data-testid={`routes-list-${inquiryId}`}>
                  {data.routes.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-wrap items-center gap-2 text-sm border border-hairline px-3 py-2"
                      data-testid={`route-row-${r.id}`}
                    >
                      <span className="font-medium">{targetName(r.routeTargetId)}</span>
                      <span className="text-xs text-ink/50">{r.routeType}</span>
                      <Badge variant="outline" className="text-xs">{r.status}</Badge>
                      {(r.status === "draft" || r.status === "pending") && (
                        <button
                          onClick={() => preflight.mutate(r.id)}
                          disabled={preflight.isPending}
                          className="text-xs underline text-ink"
                          data-testid={`button-preflight-${r.id}`}
                        >
                          {dryRun ? "Preview preflight" : "Send preflight"}
                        </button>
                      )}
                      {r.status === "pending" && (
                        <>
                          <button
                            onClick={() => setRouteStatus.mutate({ routeId: r.id, status: "accepted" })}
                            className="text-xs underline text-green-800"
                            data-testid={`button-route-accept-${r.id}`}
                          >
                            Mark accepted
                          </button>
                          <button
                            onClick={() => setRouteStatus.mutate({ routeId: r.id, status: "declined" })}
                            className="text-xs underline text-ink/60"
                            data-testid={`button-route-decline-${r.id}`}
                          >
                            Mark declined
                          </button>
                          <button
                            onClick={() => setRouteStatus.mutate({ routeId: r.id, status: "needs_review" })}
                            className="text-xs underline text-ink/60"
                            data-testid={`button-route-review-${r.id}`}
                          >
                            Needs review
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="font-medium text-sm mt-5 mb-2">2. Message the client</div>
              <p className="text-xs text-ink/55 mb-3">
                {acceptedCount > 0
                  ? `${acceptedCount} accepted. They will appear in the referral list below.`
                  : "No one has accepted yet. The list below updates as people accept."}
              </p>
            </div>
          )}

          {/* PERSONAL NOTE + BODY (all modes) */}
          <label className="block text-xs text-ink/55 mb-1">Personal note (optional, goes on top)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Add a warm personal line, for example mentioning the venue or who referred them."
            className="w-full px-3 py-2 bg-bg border border-hairline text-sm mb-3"
            data-testid={`input-note-${inquiryId}`}
          />
          <label className="block text-xs text-ink/55 mb-1">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 bg-bg border border-hairline text-sm mb-3 font-sans"
            data-testid={`input-body-${inquiryId}`}
          />

          {/* PREVIEW */}
          <div className="border border-hairline bg-surface-2 p-3 mb-3" data-testid={`preview-${inquiryId}`}>
            <div className="text-xs text-ink/50 mb-1">Preview</div>
            <div className="text-sm whitespace-pre-wrap">
              {(note ? note + "\n\n" : "") + body}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => sendResponse.mutate()}
              disabled={sendResponse.isPending || !body.trim() || (!dryRun && mode === "referral" && acceptedCount === 0)}
              className="text-sm bg-ink text-bg px-4 py-2 disabled:opacity-50"
              data-testid={`button-send-${inquiryId}`}
            >
              {sendResponse.isPending && <Loader2 className="w-3 h-3 animate-spin inline mr-1" />}
              {dryRun ? "Preview (dry run)" : "Approve and send"}
            </button>
            <button
              onClick={() => setMode(null)}
              className="text-sm underline text-ink/70"
              data-testid={`button-cancel-${inquiryId}`}
            >
              Cancel
            </button>
            {mode === "referral" && acceptedCount === 0 && (
              <span className="text-xs text-ink/50">Need at least one accepted route to send a referral.</span>
            )}
          </div>
        </div>
      )}

      {/* SENT HISTORY */}
      {data.responses.length > 0 && (
        <div className="text-xs text-ink/55 space-y-1" data-testid={`responses-history-${inquiryId}`}>
          {data.responses.map((r) => (
            <div key={r.id}>
              {r.responseType}: {r.status}
              {r.sentAt ? ` (${fmt(r.sentAt)})` : ""}
            </div>
          ))}
        </div>
      )}
      {referralSent && (
        <p className="text-xs text-green-800 mt-1">Referral list sent to client.</p>
      )}

      {/* DRY-RUN DELIVERY PREVIEW */}
      {preview && (
        <div
          className="mt-5 border border-oxblood/40 bg-bg p-4 text-sm"
          data-testid={`delivery-preview-${inquiryId}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium text-oxblood">Dry run: nothing will be sent.</div>
            <button
              onClick={() => setPreview(null)}
              className="text-xs underline text-ink/60"
              data-testid={`button-close-preview-${inquiryId}`}
            >
              Close
            </button>
          </div>
          <div className="text-xs text-ink/55 mb-3">{preview.action}</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-ink/80">
            <div><span className="text-ink/50">Channel:</span> {preview.channel}</div>
            <div><span className="text-ink/50">To:</span> {preview.recipientName || "—"}</div>
            {preview.recipientEmail && (
              <div><span className="text-ink/50">Email:</span> {preview.recipientEmail}</div>
            )}
            {preview.recipientPhone && (
              <div><span className="text-ink/50">Phone:</span> {preview.recipientPhone}</div>
            )}
            {preview.inquiry && (
              <>
                <div><span className="text-ink/50">Client:</span> {preview.inquiry.clientName || "—"}</div>
                <div><span className="text-ink/50">Date:</span> {preview.inquiry.eventDate || "—"}</div>
                <div><span className="text-ink/50">Service:</span> {preview.inquiry.serviceType || "—"}</div>
              </>
            )}
            {preview.routeTarget && (
              <div><span className="text-ink/50">Route target:</span> {preview.routeTarget.name || "—"}</div>
            )}
          </div>
          {preview.subject && (
            <div className="mt-3"><span className="text-ink/50">Subject:</span> {preview.subject}</div>
          )}
          <div className="mt-3">
            <div className="text-ink/50 mb-1">Body</div>
            <div className="border border-hairline bg-surface-2 p-3 whitespace-pre-wrap" data-testid={`preview-body-${inquiryId}`}>
              {preview.body || "—"}
            </div>
          </div>
          <div className="mt-3 text-xs text-ink/55">
            <span className="text-ink/50">If sent for real:</span> {preview.recordEffect}
          </div>
          {preview.blockedReason && (
            <div className="mt-2 text-xs text-oxblood" data-testid={`preview-blocked-${inquiryId}`}>
              {preview.blockedReason}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AssistantControl() {
  const [, params] = useRoute("/admin/:slug/assistant");
  const slug = params?.slug;
  const searchString = useSearch();
  const authParam = searchString ? `?${searchString}` : "";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [openComposer, setOpenComposer] = useState<string | null>(null);
  const [form, setForm] = useState<AssistantSettings | null>(null);

  const settingsQuery = useQuery<AssistantSettings>({
    queryKey: ["/api/assistant/settings"],
    queryFn: async () => {
      const res = await fetch("/api/assistant/settings", { credentials: "include" });
      if (res.status === 401) throw new Error("401");
      if (!res.ok) throw new Error("Failed to load settings");
      return res.json();
    },
    retry: false,
  });

  const promptsQuery = useQuery<{ isAdmin: boolean; prompts: AssistantPrompt[] }>({
    queryKey: ["/api/assistant/prompts"],
    queryFn: async () => {
      const res = await fetch("/api/assistant/prompts", { credentials: "include" });
      if (res.status === 401) throw new Error("401");
      if (!res.ok) throw new Error("Failed to load prompts");
      return res.json();
    },
    retry: false,
  });

  useEffect(() => {
    if (settingsQuery.data) setForm(settingsQuery.data);
  }, [settingsQuery.data]);

  const saveSettings = useMutation({
    mutationFn: async (next: AssistantSettings) => {
      const res = await apiRequest("PATCH", "/api/assistant/settings", {
        preferredDeliveryChannel: next.preferredDeliveryChannel,
        assistantPhoneEnabled: next.assistantPhoneEnabled,
        assistantEmailEnabled: next.assistantEmailEnabled,
        assistantPromptMode: next.assistantPromptMode,
        assistantQuietHoursStart: next.assistantQuietHoursStart,
        assistantQuietHoursEnd: next.assistantQuietHoursEnd,
        assistantTimezone: next.assistantTimezone,
        assistantDryRun: next.assistantDryRun,
      });
      return res.json();
    },
    onSuccess: (data: AssistantSettings) => {
      setForm(data);
      queryClient.setQueryData(["/api/assistant/settings"], data);
      toast({ title: "Settings saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Could not save", description: err.message, variant: "destructive" });
    },
  });

  const isAuthError =
    (settingsQuery.error as Error)?.message === "401" ||
    (promptsQuery.error as Error)?.message === "401";

  if (isAuthError) {
    return (
      <div className="min-h-screen bg-bg text-ink flex items-center justify-center px-6">
        <div className="max-w-md text-center" data-testid="text-auth-required">
          <h1 className="font-serif text-2xl tracking-tight mb-3">Please sign in</h1>
          <p className="text-ink/70 mb-6">
            The assistant control center is private. Sign in to manage how Briarwood
            reaches you and to view what needs attention.
          </p>
          <Link
            href={`/artist-login?redirect=${encodeURIComponent(`/admin/${slug ?? ""}/assistant`)}`}
            className="underline text-ink"
            data-testid="link-sign-in"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  const loading = settingsQuery.isLoading || promptsQuery.isLoading;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="max-w-[1100px] mx-auto px-6 sm:px-10 py-10">
        {slug && (
          <Link
            href={`/admin/${slug}${authParam}`}
            className="inline-flex items-center gap-2 text-sm text-ink/70 hover:text-ink mb-6"
            data-testid="link-back-dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
        )}

        <header className="mb-10">
          <h1 className="font-serif text-3xl tracking-tight mb-2" data-testid="text-page-title">
            Assistant
          </h1>
          <p className="text-ink/70 max-w-[70ch]">
            Your control center for the assistant. Choose how Briarwood reaches you,
            and see everything it has flagged for your attention. The assistant never
            replies to clients on its own.
          </p>
        </header>

        {loading && (
          <div className="flex items-center gap-2 text-ink/60" data-testid="status-loading">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading
          </div>
        )}

        {/* SETTINGS */}
        {form && (
          <section className="mb-14 border border-hairline bg-surface p-6 sm:p-8" data-testid="section-settings">
            <h2 className="font-serif text-xl tracking-tight mb-6">How Briarwood reaches you</h2>

            <div className="space-y-8 max-w-[70ch]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">Text me (SMS)</div>
                  <div className="text-sm text-ink/60">Turn on to receive prompts by text message.</div>
                </div>
                <Switch
                  checked={form.assistantPhoneEnabled}
                  onCheckedChange={(v) => setForm({ ...form, assistantPhoneEnabled: v })}
                  data-testid="switch-phone-enabled"
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">Email me</div>
                  <div className="text-sm text-ink/60">Turn on to receive prompts by email.</div>
                </div>
                <Switch
                  checked={form.assistantEmailEnabled}
                  onCheckedChange={(v) => setForm({ ...form, assistantEmailEnabled: v })}
                  data-testid="switch-email-enabled"
                />
              </div>

              <div>
                <div className="font-medium mb-2">Preferred channel</div>
                <div className="text-sm text-ink/60 mb-3">When both are on, which do you prefer?</div>
                <Select
                  value={form.preferredDeliveryChannel}
                  onValueChange={(v) =>
                    setForm({ ...form, preferredDeliveryChannel: v as AssistantSettings["preferredDeliveryChannel"] })
                  }
                >
                  <SelectTrigger className="w-full sm:w-64 bg-bg border-hairline" data-testid="select-channel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">Text (SMS)</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-4 border border-hairline bg-bg p-4">
                <div>
                  <div className="font-medium">Dry run (preview only)</div>
                  <div className="text-sm text-ink/60">
                    When on, nothing is actually sent. Assistant prompts are still listed,
                    and composer or preflight actions show a preview of what would go out.
                  </div>
                </div>
                <Switch
                  checked={form.assistantDryRun}
                  onCheckedChange={(v) => setForm({ ...form, assistantDryRun: v })}
                  data-testid="switch-dry-run"
                />
              </div>

              <div>
                <div className="font-medium mb-2">Prompt timing</div>
                <div className="text-sm text-ink/60 mb-3">
                  Send each prompt right away, or gather them into a digest.
                </div>
                <Select
                  value={form.assistantPromptMode}
                  onValueChange={(v) =>
                    setForm({ ...form, assistantPromptMode: v as AssistantSettings["assistantPromptMode"] })
                  }
                >
                  <SelectTrigger className="w-full sm:w-64 bg-bg border-hairline" data-testid="select-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="digest">Digest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="font-medium mb-2">Quiet hours</div>
                <div className="text-sm text-ink/60 mb-3">
                  Optional. Hours when prompts should hold (24-hour clock, 0 to 23).
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    placeholder="Start"
                    value={form.assistantQuietHoursStart ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        assistantQuietHoursStart: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="w-24 px-3 py-2 bg-bg border border-hairline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                    data-testid="input-quiet-start"
                  />
                  <span className="text-ink/50">to</span>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    placeholder="End"
                    value={form.assistantQuietHoursEnd ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        assistantQuietHoursEnd: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="w-24 px-3 py-2 bg-bg border border-hairline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                    data-testid="input-quiet-end"
                  />
                  {(form.assistantQuietHoursStart !== null || form.assistantQuietHoursEnd !== null) && (
                    <span className="text-sm text-ink/50">
                      {hourLabel(form.assistantQuietHoursStart)} to {hourLabel(form.assistantQuietHoursEnd)}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="font-medium mb-2">Timezone</div>
                <div className="text-sm text-ink/60 mb-3">
                  Optional. Used for quiet hours (for example, America/New_York).
                </div>
                <input
                  type="text"
                  placeholder="America/New_York"
                  value={form.assistantTimezone ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, assistantTimezone: e.target.value === "" ? null : e.target.value })
                  }
                  className="w-full sm:w-80 px-3 py-2 bg-bg border border-hairline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                  data-testid="input-timezone"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={() => form && saveSettings.mutate(form)}
                  disabled={saveSettings.isPending}
                  className="bg-ink text-bg px-5 py-2.5 disabled:opacity-60 inline-flex items-center gap-2"
                  data-testid="button-save-settings"
                >
                  {saveSettings.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save settings
                </button>
              </div>
            </div>
          </section>
        )}

        {/* PROMPT QUEUE */}
        <section data-testid="section-queue">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-serif text-xl tracking-tight">
              Needs your attention
              {promptsQuery.data?.isAdmin && (
                <span className="ml-3 text-sm font-sans text-brass">All operators (admin)</span>
              )}
            </h2>
          </div>

          {promptsQuery.data && promptsQuery.data.prompts.length === 0 && (
            <p className="text-ink/60" data-testid="text-empty-queue">
              Nothing in the queue yet. New prompts from the assistant will show here.
            </p>
          )}

          <div className="space-y-4">
            {promptsQuery.data?.prompts.map((p) => {
              const ref = linkedRef(p);
              return (
                <article
                  key={p.id}
                  className="border border-hairline bg-surface p-5"
                  data-testid={`card-prompt-${p.id}`}
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="font-medium" data-testid={`text-prompt-title-${p.id}`}>
                      {p.title}
                    </h3>
                    <Badge
                      variant="outline"
                      className={STATUS_STYLES[p.deliveryStatus] ?? STATUS_STYLES.pending}
                      data-testid={`status-prompt-${p.id}`}
                    >
                      {p.deliveryStatus}
                    </Badge>
                  </div>

                  <p
                    className="text-sm text-ink/80 whitespace-pre-wrap mb-3"
                    data-testid={`text-prompt-body-${p.id}`}
                  >
                    {p.body}
                  </p>

                  {p.recommendedActions && p.recommendedActions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3" data-testid={`actions-prompt-${p.id}`}>
                      {p.recommendedActions.map((a) => (
                        <span
                          key={a}
                          className="text-xs px-2 py-1 border border-brass/40 bg-brass/10 text-ink"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink/55">
                    {ref && <span data-testid={`text-prompt-ref-${p.id}`}>{ref}</span>}
                    {p.deliveryChannel && <span>Channel: {p.deliveryChannel}</span>}
                    <span>Created: {fmt(p.createdAt)}</span>
                    <span>Sent: {fmt(p.sentAt)}</span>
                    {p.actedOnAt && <span>Acted on: {fmt(p.actedOnAt)}</span>}
                    {p.deliveryError && (
                      <span className="text-red-700" data-testid={`text-prompt-error-${p.id}`}>
                        {p.deliveryError}
                      </span>
                    )}
                  </div>

                  {p.inquiryId && (
                    <div className="mt-4">
                      <button
                        onClick={() =>
                          setOpenComposer((cur) => (cur === p.id ? null : p.id))
                        }
                        className="text-sm underline text-ink"
                        data-testid={`button-toggle-composer-${p.id}`}
                      >
                        {openComposer === p.id ? "Hide composer" : "Respond"}
                      </button>
                      {openComposer === p.id && (
                        <InquiryComposer inquiryId={p.inquiryId} />
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
