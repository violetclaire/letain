import { useState, useEffect } from "react";
import { useRoute, useSearch, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
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

export default function AssistantControl() {
  const [, params] = useRoute("/admin/:slug/assistant");
  const slug = params?.slug;
  const searchString = useSearch();
  const authParam = searchString ? `?${searchString}` : "";
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
