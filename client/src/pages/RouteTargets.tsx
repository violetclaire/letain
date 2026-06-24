import { useState } from "react";
import { useRoute, useSearch, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface RouteTarget {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  roleLabel: string | null;
  tags: string[] | null;
  capabilities: string[] | null;
  isInternal: boolean | null;
  isAgent: boolean | null;
  active: boolean | null;
  preferred: boolean | null;
  notes: string | null;
}

const SUGGESTED_LABELS = [
  "Makeup Artist",
  "Hairstylist",
  "Assistant",
  "Scheduler",
  "Planner",
  "Vendor",
  "Travel",
  "Agent",
  "Bookkeeping",
  "Trusted colleague",
];

interface FormState {
  name: string;
  email: string;
  phone: string;
  roleLabel: string;
  tags: string;
  capabilities: string;
  isInternal: boolean;
  isAgent: boolean;
  active: boolean;
  preferred: boolean;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  roleLabel: "",
  tags: "",
  capabilities: "",
  isInternal: false,
  isAgent: false,
  active: true,
  preferred: false,
  notes: "",
};

function toForm(t: RouteTarget): FormState {
  return {
    name: t.name ?? "",
    email: t.email ?? "",
    phone: t.phone ?? "",
    roleLabel: t.roleLabel ?? "",
    tags: (t.tags ?? []).join(", "),
    capabilities: (t.capabilities ?? []).join(", "),
    isInternal: !!t.isInternal,
    isAgent: !!t.isAgent,
    active: t.active !== false,
    preferred: !!t.preferred,
    notes: t.notes ?? "",
  };
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function contactMetadataText(t: Pick<RouteTarget, "notes" | "tags" | "capabilities">): string {
  return [t.notes, ...(t.tags ?? []), ...(t.capabilities ?? [])]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" ")
    .toLowerCase();
}

function preferredContactMethod(t: Pick<RouteTarget, "notes" | "tags" | "capabilities">): "phone" | "email" | null {
  const text = contactMetadataText(t);
  if (/(prefer|preferred|best|reach|contact).{0,24}(phone|text|sms|call)|\b(phone|text|sms|call).{0,24}(prefer|preferred|best)/.test(text)) {
    return "phone";
  }
  if (/(prefer|preferred|best|reach|contact).{0,24}(email|e-mail)|\b(email|e-mail).{0,24}(prefer|preferred|best)/.test(text)) {
    return "email";
  }
  return null;
}

function hasInstagramCue(t: Pick<RouteTarget, "notes" | "tags" | "capabilities">): boolean {
  const text = contactMetadataText(t);
  return /\b(instagram|insta|ig)\b|@[a-z0-9._-]{2,}/i.test(text);
}

function contactReadinessFor(t: Pick<RouteTarget, "email" | "phone" | "notes" | "tags" | "capabilities">): {
  label: "Ready to contact" | "Phone ready" | "Email ready" | "Instagram/notes only" | "Contact method missing";
  details: string[];
} {
  const hasPhone = Boolean(t.phone?.trim());
  const hasEmail = Boolean(t.email?.trim());
  const preferred = preferredContactMethod(t);
  const instagramOnly = !hasPhone && !hasEmail && hasInstagramCue(t);

  const label = hasPhone && hasEmail
    ? "Ready to contact"
    : hasPhone
      ? "Phone ready"
      : hasEmail
        ? "Email ready"
        : instagramOnly
          ? "Instagram/notes only"
          : "Contact method missing";

  const details: string[] = [];
  if ((preferred === "phone" && !hasPhone) || (preferred === "email" && !hasEmail)) {
    details.push("Preferred channel missing");
  } else if ((hasPhone || hasEmail) && !preferred) {
    details.push("Preferred channel unknown");
  }

  if (!hasPhone && !hasEmail) {
    details.push(instagramOnly ? "Known, but not safely reachable yet" : "Add phone or email before preflight");
  }

  return { label, details };
}

function toPayload(f: FormState) {
  return {
    name: f.name.trim(),
    email: f.email.trim() || null,
    phone: f.phone.trim() || null,
    roleLabel: f.roleLabel.trim() || null,
    tags: splitList(f.tags),
    capabilities: splitList(f.capabilities),
    isInternal: f.isInternal,
    isAgent: f.isAgent,
    active: f.active,
    preferred: f.preferred,
    notes: f.notes.trim() || null,
  };
}

export default function RouteTargets() {
  const [, params] = useRoute("/admin/:slug/network");
  const slug = params?.slug;
  const searchString = useSearch();
  const authParam = searchString ? `?${searchString}` : "";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // null = no form open; "new" = creating; otherwise an id being edited.
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const targetsQuery = useQuery<{ targets: RouteTarget[] }>({
    queryKey: ["/api/route-targets"],
    queryFn: async () => {
      const res = await fetch("/api/route-targets", { credentials: "include" });
      if (res.status === 401) throw new Error("401");
      if (!res.ok) throw new Error("Failed to load route targets");
      return res.json();
    },
    retry: false,
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/route-targets"] });

  const createTarget = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/route-targets", toPayload(form));
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Route target added" });
      setEditing(null);
      setForm(EMPTY_FORM);
      refresh();
    },
    onError: (err: Error) => {
      toast({ title: "Could not add", description: err.message, variant: "destructive" });
    },
  });

  const updateTarget = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/route-targets/${id}`, toPayload(form));
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Route target saved" });
      setEditing(null);
      setForm(EMPTY_FORM);
      refresh();
    },
    onError: (err: Error) => {
      toast({ title: "Could not save", description: err.message, variant: "destructive" });
    },
  });

  const toggleField = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<RouteTarget> }) => {
      const res = await apiRequest("PATCH", `/api/route-targets/${id}`, patch);
      return res.json();
    },
    onSuccess: () => refresh(),
    onError: (err: Error) => {
      toast({ title: "Could not update", description: err.message, variant: "destructive" });
    },
  });

  const startNew = () => {
    setForm(EMPTY_FORM);
    setEditing("new");
  };
  const startEdit = (t: RouteTarget) => {
    setForm(toForm(t));
    setEditing(t.id);
  };
  const cancel = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
  };
  const submit = () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (editing === "new") createTarget.mutate();
    else if (editing) updateTarget.mutate(editing);
  };

  const isAuthError = (targetsQuery.error as Error)?.message === "401";

  if (isAuthError) {
    return (
      <div className="min-h-screen bg-bg text-ink flex items-center justify-center px-6">
        <div className="max-w-md text-center" data-testid="text-auth-required">
          <h1 className="font-serif text-2xl tracking-tight mb-3">Please sign in</h1>
          <p className="text-ink/70 mb-6">
            Your routing network is private. Sign in to manage the people and systems
            you route work to.
          </p>
          <Link
            href={`/artist-login?redirect=${encodeURIComponent(`/admin/${slug ?? ""}/network`)}`}
            className="underline text-ink"
            data-testid="link-sign-in"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  const targets = targetsQuery.data?.targets ?? [];
  const saving = createTarget.isPending || updateTarget.isPending;

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

        <header className="mb-8">
          <h1 className="font-serif text-3xl tracking-tight mb-2" data-testid="text-page-title">
            Routing network
          </h1>
          <p className="text-ink/70 max-w-[70ch]">
            The people and systems you route work to. Add who you trust, label what
            they do, and mark your preferred contacts. These are the targets you choose
            from when you route or delegate an inquiry. This is your private network,
            not a public directory.
          </p>
        </header>

        <div className="mb-6">
          <button
            onClick={startNew}
            className="inline-flex items-center gap-2 text-sm bg-ink text-bg px-4 py-2"
            data-testid="button-add-target"
          >
            <Plus className="w-4 h-4" />
            Add route target
          </button>
        </div>

        {/* ADD / EDIT FORM */}
        {editing && (
          <div
            className="border border-hairline bg-surface p-5 mb-8"
            data-testid="form-route-target"
          >
            <h2 className="font-medium mb-4">
              {editing === "new" ? "Add route target" : "Edit route target"}
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-ink/55 mb-1">Name (required)</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-bg border border-hairline text-sm"
                  data-testid="input-name"
                />
              </div>
              <div>
                <label className="block text-xs text-ink/55 mb-1">Role / label</label>
                <input
                  value={form.roleLabel}
                  onChange={(e) => setForm({ ...form, roleLabel: e.target.value })}
                  list="role-label-options"
                  placeholder="Pick one or type your own"
                  className="w-full px-3 py-2 bg-bg border border-hairline text-sm"
                  data-testid="input-role-label"
                />
                <datalist id="role-label-options">
                  {SUGGESTED_LABELS.map((l) => (
                    <option key={l} value={l} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs text-ink/55 mb-1">Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 bg-bg border border-hairline text-sm"
                  data-testid="input-email"
                />
              </div>
              <div>
                <label className="block text-xs text-ink/55 mb-1">Phone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-bg border border-hairline text-sm"
                  data-testid="input-phone"
                />
              </div>
              <div>
                <label className="block text-xs text-ink/55 mb-1">
                  Tags (comma separated)
                </label>
                <input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="e.g. local, weekends, premium"
                  className="w-full px-3 py-2 bg-bg border border-hairline text-sm"
                  data-testid="input-tags"
                />
              </div>
              <div>
                <label className="block text-xs text-ink/55 mb-1">
                  Capabilities / services (comma separated)
                </label>
                <input
                  value={form.capabilities}
                  onChange={(e) => setForm({ ...form, capabilities: e.target.value })}
                  placeholder="e.g. bridal makeup, airbrush, lashes"
                  className="w-full px-3 py-2 bg-bg border border-hairline text-sm"
                  data-testid="input-capabilities"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <label className="flex items-center justify-between border border-hairline px-3 py-2">
                <span className="text-sm">
                  {form.isInternal ? "Internal (your team)" : "External"}
                </span>
                <Switch
                  checked={form.isInternal}
                  onCheckedChange={(v) => setForm({ ...form, isInternal: v })}
                  data-testid="switch-internal"
                />
              </label>
              <label className="flex items-center justify-between border border-hairline px-3 py-2">
                <span className="text-sm">
                  {form.isAgent ? "Agent / system" : "Person"}
                </span>
                <Switch
                  checked={form.isAgent}
                  onCheckedChange={(v) => setForm({ ...form, isAgent: v })}
                  data-testid="switch-agent"
                />
              </label>
              <label className="flex items-center justify-between border border-hairline px-3 py-2">
                <span className="text-sm">{form.active ? "Active" : "Inactive"}</span>
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm({ ...form, active: v })}
                  data-testid="switch-active"
                />
              </label>
              <label className="flex items-center justify-between border border-hairline px-3 py-2">
                <span className="text-sm">
                  {form.preferred ? "Preferred" : "Not preferred"}
                </span>
                <Switch
                  checked={form.preferred}
                  onCheckedChange={(v) => setForm({ ...form, preferred: v })}
                  data-testid="switch-preferred"
                />
              </label>
            </div>

            <div className="mt-4">
              <label className="block text-xs text-ink/55 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-bg border border-hairline text-sm"
                data-testid="input-notes"
              />
            </div>

            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={submit}
                disabled={saving}
                className="text-sm bg-ink text-bg px-4 py-2 disabled:opacity-50"
                data-testid="button-save-target"
              >
                {saving && <Loader2 className="w-3 h-3 animate-spin inline mr-1" />}
                {editing === "new" ? "Add to network" : "Save changes"}
              </button>
              <button
                onClick={cancel}
                className="text-sm underline text-ink/70"
                data-testid="button-cancel-target"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* LIST */}
        {targetsQuery.isLoading ? (
          <div className="flex items-center gap-2 text-ink/60" data-testid="status-loading">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading network
          </div>
        ) : targetsQuery.isError ? (
          <p className="text-oxblood text-sm" data-testid="text-load-error">
            Could not load your routing network. Please refresh and try again.
          </p>
        ) : targets.length === 0 ? (
          <p className="text-ink/60 text-sm" data-testid="text-empty">
            No route targets yet. Add the first person or system you route work to.
          </p>
        ) : (
          <div className="space-y-3" data-testid="list-targets">
            {targets.map((t) => {
              const readiness = contactReadinessFor(t);

              return (
                <article
                  key={t.id}
                  className="border border-hairline bg-surface p-5"
                  data-testid={`card-target-${t.id}`}
                >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h3 className="font-medium" data-testid={`text-target-name-${t.id}`}>
                      {t.name}
                      {t.roleLabel && (
                        <span className="text-ink/50 font-normal"> · {t.roleLabel}</span>
                      )}
                    </h3>
                    <div className="text-sm text-ink/70 mt-1">
                      {t.email && <span className="mr-4">{t.email}</span>}
                      {t.phone && <span>{t.phone}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => startEdit(t)}
                    className="text-sm underline text-ink shrink-0"
                    data-testid={`button-edit-${t.id}`}
                  >
                    Edit
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {t.isInternal ? "Internal" : "External"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {t.isAgent ? "Agent / system" : "Person"}
                  </Badge>
                  {t.preferred && (
                    <Badge variant="outline" className="text-xs bg-brass/15 border-brass/40">
                      Preferred
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={`text-xs ${t.active === false ? "opacity-60" : ""}`}
                  >
                    {t.active === false ? "Inactive" : "Active"}
                  </Badge>
                  {(t.tags ?? []).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 border border-hairline text-ink/70"
                      data-testid={`tag-${t.id}-${tag}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div
                  className="mt-3 border border-hairline bg-bg px-3 py-2 text-xs text-ink/65"
                  data-testid={`contact-readiness-${t.id}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="uppercase tracking-wide text-ink/45">Contact readiness</span>
                    <Badge variant="outline" className="text-xs bg-surface">
                      {readiness.label}
                    </Badge>
                  </div>
                  {readiness.details.length > 0 && (
                    <p className="mt-1">{readiness.details.join(" / ")}</p>
                  )}
                </div>

                {(t.capabilities ?? []).length > 0 && (
                  <div className="text-sm text-ink/70 mt-2">
                    Services: {(t.capabilities ?? []).join(", ")}
                  </div>
                )}
                {t.notes && (
                  <p className="text-sm text-ink/60 mt-2 whitespace-pre-wrap">{t.notes}</p>
                )}

                <div className="flex flex-wrap gap-4 mt-3 text-xs text-ink/60">
                  <button
                    onClick={() =>
                      toggleField.mutate({ id: t.id, patch: { preferred: !t.preferred } })
                    }
                    className="underline"
                    data-testid={`button-toggle-preferred-${t.id}`}
                  >
                    {t.preferred ? "Remove preferred" : "Mark preferred"}
                  </button>
                  <button
                    onClick={() =>
                      toggleField.mutate({ id: t.id, patch: { active: t.active === false } })
                    }
                    className="underline"
                    data-testid={`button-toggle-active-${t.id}`}
                  >
                    {t.active === false ? "Set active" : "Set inactive"}
                  </button>
                </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
