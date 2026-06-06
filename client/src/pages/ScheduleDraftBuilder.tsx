import { useState, useEffect, useMemo } from "react";
import { useRoute, useSearch, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, Trash2, ChevronUp, ChevronDown, Save } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type Column = { id: string; label: string; type: string };
type Row = { id: string; sortOrder: number; cells: Record<string, string> };
type ServiceDefault = { id: string; label: string; durationMinutes: number };
type Provider = { id: string; name: string };

interface Draft {
  id: string;
  title?: string | null;
  eventDate?: string | null;
  location?: string | null;
  notes?: string | null;
  columns?: Column[] | null;
  rows?: Row[] | null;
  serviceDefaults?: ServiceDefault[] | null;
  providers?: Provider[] | null;
  status?: string | null;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const SERVICE_ALIASES: Array<{ match: RegExp; label: string }> = [
  { match: /bride/i, label: "Bride Hair + Makeup" },
  { match: /hair\s*(\+|and|&|\/)\s*makeup|makeup\s*(\+|and|&|\/)\s*hair|h\s*\+?\s*m\b/i, label: "Hair + Makeup" },
  { match: /makeup|mua|\bmu\b/i, label: "Makeup" },
  { match: /hair\b/i, label: "Hair" },
];

function normalizeService(raw: string): string {
  for (const a of SERVICE_ALIASES) {
    if (a.match.test(raw)) return a.label;
  }
  return "";
}

// Forgiving parser. Handles "8 makeup, 5 hair", "Bride, MOB, MOG, 5 bridesmaids",
// "3 artists". Never throws; falls back to placeholder rows if nothing parses.
function parseInput(
  text: string,
  serviceDefaults: ServiceDefault[],
): { rows: Array<{ name: string; service: string; duration: string }>; providerCount: number } {
  const result: Array<{ name: string; service: string; duration: string }> = [];
  let providerCount = 0;
  let guestCounter = 0;

  const durationFor = (label: string): string => {
    const sd = serviceDefaults.find((s) => s.label.toLowerCase() === label.toLowerCase());
    return sd ? String(sd.durationMinutes) : "";
  };

  const tokens = text
    .split(/[,\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  for (const token of tokens) {
    // "3 artists" / "3 providers" / "3 stylists" -> provider count, not rows
    const providerMatch = token.match(/^(\d+)\s*(artists?|providers?|stylists?)$/i);
    if (providerMatch) {
      providerCount += parseInt(providerMatch[1], 10);
      continue;
    }

    // "<n> <something>" -> n entries. If <something> looks like a service, set
    // service. Otherwise treat <something> as a group name (e.g. bridesmaids).
    const countMatch = token.match(/^(\d+)\s+(.+)$/);
    if (countMatch) {
      const n = Math.min(parseInt(countMatch[1], 10), 100);
      const rest = countMatch[2].trim();
      const svc = normalizeService(rest);
      if (svc) {
        for (let i = 0; i < n; i++) {
          guestCounter += 1;
          result.push({ name: `Guest ${guestCounter}`, service: svc, duration: durationFor(svc) });
        }
      } else {
        // group name like "bridesmaids" -> "Bridesmaid 1".."Bridesmaid n"
        const singular = rest.replace(/s$/i, "");
        const labelBase = singular.charAt(0).toUpperCase() + singular.slice(1);
        for (let i = 0; i < n; i++) {
          result.push({ name: `${labelBase} ${i + 1}`, service: "", duration: "" });
        }
      }
      continue;
    }

    // Plain token: treat as a person name (Bride, MOB, MOG, a real name, etc.)
    result.push({ name: token, service: "", duration: "" });
  }

  return { rows: result, providerCount };
}

// Parse a start time into minutes-since-midnight. Tolerant of common formats:
// "9", "9am", "9:00", "9:00 AM", "14:00". Returns null if it cannot parse.
function parseClockTime(raw: string): number | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let hours = parseInt(m[1], 10);
  const minutes = m[2] ? parseInt(m[2], 10) : 0;
  const ampm = m[3];
  if (minutes > 59) return null;
  if (ampm) {
    if (hours < 1 || hours > 12) return null;
    if (ampm === "pm" && hours !== 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;
  } else {
    if (hours > 23) return null;
  }
  return hours * 60 + minutes;
}

// Parse a duration into minutes. Tolerant: "30", "45", "30 min", "1 hour",
// "2 hours", "1 hour 30 min". Returns null if it cannot parse.
function parseDurationMinutes(raw: string): number | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  let total = 0;
  let matched = false;
  const h = s.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\b/);
  if (h) {
    total += parseFloat(h[1]) * 60;
    matched = true;
  }
  const mm = s.match(/(\d+)\s*(m|min|mins|minute|minutes)\b/);
  if (mm) {
    total += parseInt(mm[1], 10);
    matched = true;
  }
  return matched ? Math.round(total) : null;
}

// Format minutes-since-midnight back into a readable "9:30 AM". Wraps past
// midnight so a late start + long duration still shows a valid clock time.
function formatClockTime(totalMinutes: number): string {
  const mins = ((totalMinutes % 1440) + 1440) % 1440;
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

// Canonical serialization of the editable schedule state. Used to detect unsaved
// changes by comparing the current form against the last-saved snapshot. Rows are
// normalized with their index as sortOrder so it matches what Save sends.
function serializeScheduleState(s: {
  title: string;
  eventDate: string;
  location: string;
  notes: string;
  columns: Column[];
  rows: Row[];
  serviceDefaults: ServiceDefault[];
  providers: Provider[];
}): string {
  return JSON.stringify({
    title: s.title,
    eventDate: s.eventDate,
    location: s.location,
    notes: s.notes,
    columns: s.columns,
    rows: s.rows.map((r, i) => ({ ...r, sortOrder: i })),
    serviceDefaults: s.serviceDefaults,
    providers: s.providers,
  });
}

export default function ScheduleDraftBuilder() {
  const [, params] = useRoute("/admin/:slug/schedules/:scheduleId");
  const slug = params?.slug ?? "";
  const scheduleId = params?.scheduleId ?? "";
  const searchString = useSearch();
  const authParam = searchString ? `?${searchString}` : "";
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [serviceDefaults, setServiceDefaults] = useState<ServiceDefault[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = `/artist-login?redirect=${encodeURIComponent(`/admin/${slug}/schedules/${scheduleId}`)}`;
    }
  }, [authLoading, isAuthenticated, slug, scheduleId]);

  const draftQuery = useQuery<Draft>({
    queryKey: ["/api/schedule-drafts", scheduleId],
    queryFn: async () => {
      const res = await fetch(`/api/schedule-drafts/${scheduleId}`, { credentials: "include" });
      if (res.status === 401) throw new Error("401");
      if (res.status === 403) throw new Error("403");
      if (res.status === 404) throw new Error("404");
      if (!res.ok) throw new Error("Failed to load schedule");
      return res.json();
    },
    enabled: !!scheduleId && isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    const d = draftQuery.data;
    if (d && !loaded) {
      const sortedRows = [...(d.rows ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
      setTitle(d.title ?? "");
      setEventDate(d.eventDate ?? "");
      setLocation(d.location ?? "");
      setNotes(d.notes ?? "");
      setColumns(d.columns ?? []);
      setRows(sortedRows);
      setServiceDefaults(d.serviceDefaults ?? []);
      setProviders(d.providers ?? []);
      // Capture the baseline so we can detect unsaved edits from here on.
      setSavedSnapshot(
        serializeScheduleState({
          title: d.title ?? "",
          eventDate: d.eventDate ?? "",
          location: d.location ?? "",
          notes: d.notes ?? "",
          columns: d.columns ?? [],
          rows: sortedRows,
          serviceDefaults: d.serviceDefaults ?? [],
          providers: d.providers ?? [],
        }),
      );
      setLoaded(true);
    }
  }, [draftQuery.data, loaded]);

  // Current editable state, serialized. Compared against savedSnapshot for dirty.
  const currentSnapshot = useMemo(
    () => serializeScheduleState({ title, eventDate, location, notes, columns, rows, serviceDefaults, providers }),
    [title, eventDate, location, notes, columns, rows, serviceDefaults, providers],
  );

  const isDirty = loaded && savedSnapshot !== null && currentSnapshot !== savedSnapshot;

  // Warn on browser refresh / tab close / external navigation while there are
  // unsaved edits. The browser shows its own generic confirmation dialog.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Confirm before following an in-app link while there are unsaved edits.
  const confirmLeaveIfDirty = (e: React.MouseEvent) => {
    if (isDirty && !window.confirm("You have unsaved changes. Leave without saving?")) {
      e.preventDefault();
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        eventDate,
        location,
        notes,
        columns,
        rows: rows.map((r, i) => ({ ...r, sortOrder: i })),
        serviceDefaults,
        providers,
      };
      // Snapshot exactly what we are sending so the dirty baseline matches.
      const snapshot = serializeScheduleState({ title, eventDate, location, notes, columns, rows, serviceDefaults, providers });
      const res = await fetch(`/api/schedule-drafts/${scheduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      const data = await res.json();
      return { data, snapshot };
    },
    onSuccess: ({ snapshot }) => {
      setSavedSnapshot(snapshot);
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-drafts", scheduleId] });
      toast({ title: "Schedule saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Could not save", description: err.message, variant: "destructive" });
    },
  });

  // --- Table editing helpers ---
  const emptyCells = useMemo(() => {
    const c: Record<string, string> = {};
    for (const col of columns) c[col.id] = "";
    return c;
  }, [columns]);

  const addRow = () => {
    setRows((prev) => [...prev, { id: uid("row"), sortOrder: prev.length, cells: { ...emptyCells } }]);
  };

  const deleteRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const moveRow = (index: number, dir: -1 | 1) => {
    setRows((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const hasEndColumn = useMemo(() => columns.some((c) => c.id === "end"), [columns]);

  const setCell = (rowId: string, colId: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const cells = { ...r.cells, [colId]: value };
        // Auto-fill End from Start + Duration. Only when Start or Duration was the
        // edited field, both parse cleanly, and an End column exists. If parsing
        // fails we leave End untouched (no error, no blocking). End stays editable.
        if ((colId === "start" || colId === "duration") && hasEndColumn) {
          const startMin = parseClockTime(cells["start"] ?? "");
          const durMin = parseDurationMinutes(cells["duration"] ?? "");
          if (startMin !== null && durMin !== null) {
            cells["end"] = formatClockTime(startMin + durMin);
          }
        }
        return { ...r, cells };
      }),
    );
  };

  const addColumn = () => {
    const id = uid("col");
    setColumns((prev) => [...prev, { id, label: "New column", type: "text" }]);
    setRows((prev) => prev.map((r) => ({ ...r, cells: { ...r.cells, [id]: "" } })));
  };

  const renameColumn = (id: string, label: string) =>
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)));

  const deleteColumn = (id: string) => {
    setColumns((prev) => prev.filter((c) => c.id !== id));
    setRows((prev) =>
      prev.map((r) => {
        const cells = { ...r.cells };
        delete cells[id];
        return { ...r, cells };
      }),
    );
  };

  const applyPaste = () => {
    const { rows: parsed, providerCount } = parseInput(pasteText, serviceDefaults);
    if (parsed.length === 0 && providerCount === 0) {
      toast({ title: "Nothing to add", description: "Try something like: 8 makeup, 5 hair" });
      return;
    }
    if (parsed.length > 0) {
      const newRows: Row[] = parsed.map((p, i) => {
        const cells: Record<string, string> = { ...emptyCells };
        cells["name"] = p.name;
        cells["service"] = p.service;
        cells["duration"] = p.duration;
        return { id: uid("row"), sortOrder: rows.length + i, cells };
      });
      setRows((prev) => [...prev, ...newRows]);
    }
    if (providerCount > 0) {
      const existing = providers.length;
      const newProviders: Provider[] = [];
      for (let i = 0; i < providerCount; i++) {
        newProviders.push({ id: uid("prov"), name: `Artist ${existing + i + 1}` });
      }
      setProviders((prev) => [...prev, ...newProviders]);
    }
    setPasteText("");
    toast({ title: "Added to table", description: "Edit names, times, and providers as needed." });
  };

  // Service defaults editing
  const addServiceDefault = () =>
    setServiceDefaults((prev) => [...prev, { id: uid("svc"), label: "Custom service", durationMinutes: 30 }]);
  const updateServiceDefault = (id: string, patch: Partial<ServiceDefault>) =>
    setServiceDefaults((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const deleteServiceDefault = (id: string) =>
    setServiceDefaults((prev) => prev.filter((s) => s.id !== id));

  // Providers editing
  const addProvider = () =>
    setProviders((prev) => [...prev, { id: uid("prov"), name: `Artist ${prev.length + 1}` }]);
  const updateProvider = (id: string, name: string) =>
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  const deleteProvider = (id: string) => setProviders((prev) => prev.filter((p) => p.id !== id));

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-bg text-ink flex items-center justify-center px-6">
        <div className="flex items-center gap-2 text-ink/60" data-testid="status-auth-loading">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading
        </div>
      </div>
    );
  }

  const errMsg = (draftQuery.error as Error)?.message;
  if (errMsg === "403" || errMsg === "404" || errMsg === "401") {
    return (
      <div className="min-h-screen bg-bg text-ink flex items-center justify-center px-6">
        <div className="max-w-md text-center" data-testid="text-not-available">
          <h1 className="font-serif text-2xl tracking-tight mb-3">Schedule not available</h1>
          <p className="text-ink/70 mb-6">This schedule does not exist or is not one of yours.</p>
          <Link href={`/admin/${slug}/rolodex${authParam}`} className="underline text-ink" data-testid="link-back-rolodex">
            Back to Rolodex
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="max-w-[1100px] mx-auto px-6 sm:px-10 py-10">
        <Link
          href={`/admin/${slug}/rolodex${authParam}`}
          onClick={confirmLeaveIfDirty}
          className="inline-flex items-center gap-2 text-sm text-ink/70 hover:text-ink mb-6"
          data-testid="link-back-rolodex"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Rolodex
        </Link>

        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl tracking-tight mb-2" data-testid="text-page-title">
              Schedule builder
            </h1>
            <p className="text-ink/70 max-w-[70ch]">
              Plan the day as an editable table, like a document. Nothing is sent and there
              is no client link. Add rows, edit names and times, and save when ready.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 bg-ink text-bg px-4 py-2 disabled:opacity-60"
              data-testid="button-save"
            >
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save draft
            </button>
            {isDirty ? (
              <span className="text-xs text-oxblood" data-testid="status-unsaved">
                Unsaved changes
              </span>
            ) : (
              <span className="text-xs text-ink/45" data-testid="status-saved">
                All changes saved
              </span>
            )}
          </div>
        </header>

        {draftQuery.isLoading && (
          <div className="flex items-center gap-2 text-ink/60" data-testid="status-loading">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading
          </div>
        )}

        {loaded && (
          <div className="space-y-10">
            {/* Schedule meta */}
            <section className="border border-hairline bg-surface p-6 sm:p-8" data-testid="section-meta">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <label className="block">
                  <span className="text-xs uppercase tracking-wide text-ink/50">Title</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 w-full border border-hairline bg-bg px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                    data-testid="input-title"
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-wide text-ink/50">Event date</span>
                  <input
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    placeholder="e.g. Saturday, June 14"
                    className="mt-1 w-full border border-hairline bg-bg px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                    data-testid="input-event-date"
                  />
                </label>
                <label className="block">
                  <span className="text-xs uppercase tracking-wide text-ink/50">Location</span>
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Getting-ready location, venue"
                    className="mt-1 w-full border border-hairline bg-bg px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                    data-testid="input-location"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs uppercase tracking-wide text-ink/50">Notes (parking, playlist link, etc.)</span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="mt-1 w-full border border-hairline bg-bg px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                    data-testid="input-notes"
                  />
                </label>
              </div>
            </section>

            {/* Quick add from list */}
            <section data-testid="section-paste">
              <h2 className="font-serif text-xl tracking-tight mb-3">Quick add</h2>
              <div className="border border-hairline bg-surface p-6">
                <p className="text-ink/70 text-sm mb-3 max-w-[70ch]">
                  Paste names or counts and we will create rows. Examples: "8 makeup, 5 hair"
                  or "Bride, MOB, MOG, 5 bridesmaids". Missing names become placeholders you
                  can rename. "3 artists" adds providers.
                </p>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={3}
                  placeholder="8 makeup, 5 hair, 3 artists"
                  className="w-full border border-hairline bg-bg px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                  data-testid="input-paste"
                />
                <button
                  onClick={applyPaste}
                  className="mt-3 inline-flex items-center gap-2 border border-hairline px-3 py-2 hover:bg-surface-2"
                  data-testid="button-apply-paste"
                >
                  <Plus className="w-4 h-4" />
                  Add rows from list
                </button>
              </div>
            </section>

            {/* The table */}
            <section data-testid="section-table">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-xl tracking-tight">Schedule table</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={addColumn}
                    className="inline-flex items-center gap-1 text-sm border border-hairline px-2.5 py-1.5 hover:bg-surface"
                    data-testid="button-add-column"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Column
                  </button>
                  <button
                    onClick={addRow}
                    className="inline-flex items-center gap-1 text-sm border border-hairline px-2.5 py-1.5 hover:bg-surface"
                    data-testid="button-add-row"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Row
                  </button>
                </div>
              </div>

              <p className="text-xs text-ink/50 mb-2" data-testid="text-end-time-hint">
                Tip: enter a start time and duration to auto-fill the end time. You can still edit it manually.
              </p>

              <div className="border border-hairline bg-surface overflow-x-auto">
                <table className="w-full text-sm border-collapse" data-testid="table-schedule">
                  <thead>
                    <tr className="border-b border-hairline">
                      <th className="w-8 px-2 py-2"></th>
                      {columns.map((col) => (
                        <th key={col.id} className="px-2 py-2 text-left align-bottom min-w-[120px]">
                          <input
                            value={col.label}
                            onChange={(e) => renameColumn(col.id, e.target.value)}
                            className="w-full bg-transparent font-medium text-ink/80 border-b border-transparent focus:border-hairline focus-visible:outline-none"
                            data-testid={`input-column-${col.id}`}
                          />
                          <button
                            onClick={() => deleteColumn(col.id)}
                            className="text-ink/40 hover:text-oxblood text-xs mt-1"
                            data-testid={`button-delete-column-${col.id}`}
                          >
                            remove
                          </button>
                        </th>
                      ))}
                      <th className="w-10 px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={columns.length + 2} className="px-3 py-6 text-center text-ink/40" data-testid="text-empty">
                          No rows yet. Use "Quick add" or the Row button.
                        </td>
                      </tr>
                    )}
                    {rows.map((row, index) => (
                      <tr key={row.id} className="border-b border-hairline last:border-0" data-testid={`row-${row.id}`}>
                        <td className="px-1 py-1 align-top">
                          <div className="flex flex-col">
                            <button
                              onClick={() => moveRow(index, -1)}
                              disabled={index === 0}
                              className="text-ink/40 hover:text-ink disabled:opacity-30"
                              data-testid={`button-up-${row.id}`}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => moveRow(index, 1)}
                              disabled={index === rows.length - 1}
                              className="text-ink/40 hover:text-ink disabled:opacity-30"
                              data-testid={`button-down-${row.id}`}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        {columns.map((col) => (
                          <td key={col.id} className="px-1 py-1 align-top">
                            <input
                              value={row.cells[col.id] ?? ""}
                              onChange={(e) => setCell(row.id, col.id, e.target.value)}
                              list={col.type === "service" ? "service-options" : col.type === "provider" ? "provider-options" : undefined}
                              className="w-full bg-bg border border-hairline px-2 py-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                              data-testid={`input-cell-${row.id}-${col.id}`}
                            />
                          </td>
                        ))}
                        <td className="px-1 py-1 align-top">
                          <button
                            onClick={() => deleteRow(row.id)}
                            className="text-ink/40 hover:text-oxblood"
                            data-testid={`button-delete-row-${row.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* datalists offer service + provider suggestions while editing cells */}
              <datalist id="service-options">
                {serviceDefaults.map((s) => (
                  <option key={s.id} value={s.label} />
                ))}
              </datalist>
              <datalist id="provider-options">
                {providers.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </section>

            {/* Service defaults */}
            <section data-testid="section-service-defaults">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-xl tracking-tight">Default durations</h2>
                <button
                  onClick={addServiceDefault}
                  className="inline-flex items-center gap-1 text-sm border border-hairline px-2.5 py-1.5 hover:bg-surface"
                  data-testid="button-add-service"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Service
                </button>
              </div>
              <div className="border border-hairline bg-surface divide-y divide-hairline">
                {serviceDefaults.length === 0 && (
                  <div className="px-4 py-4 text-ink/40 text-sm">No services yet.</div>
                )}
                {serviceDefaults.map((s) => (
                  <div key={s.id} className="px-4 py-3 flex items-center gap-3" data-testid={`row-service-${s.id}`}>
                    <input
                      value={s.label}
                      onChange={(e) => updateServiceDefault(s.id, { label: e.target.value })}
                      className="flex-1 bg-bg border border-hairline px-2 py-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                      data-testid={`input-service-label-${s.id}`}
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        value={s.durationMinutes}
                        onChange={(e) => updateServiceDefault(s.id, { durationMinutes: parseInt(e.target.value || "0", 10) })}
                        className="w-20 bg-bg border border-hairline px-2 py-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                        data-testid={`input-service-minutes-${s.id}`}
                      />
                      <span className="text-ink/50 text-sm">min</span>
                    </div>
                    <button
                      onClick={() => deleteServiceDefault(s.id)}
                      className="text-ink/40 hover:text-oxblood"
                      data-testid={`button-delete-service-${s.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-ink/50 mt-2">
                These are starting durations only. Edit them anytime. They fill the Duration
                column when you quick-add a matching service.
              </p>
            </section>

            {/* Providers */}
            <section data-testid="section-providers">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-serif text-xl tracking-tight">Providers / artists</h2>
                <button
                  onClick={addProvider}
                  className="inline-flex items-center gap-1 text-sm border border-hairline px-2.5 py-1.5 hover:bg-surface"
                  data-testid="button-add-provider"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Provider
                </button>
              </div>
              <div className="border border-hairline bg-surface divide-y divide-hairline">
                {providers.length === 0 && (
                  <div className="px-4 py-4 text-ink/40 text-sm">No providers yet.</div>
                )}
                {providers.map((p) => (
                  <div key={p.id} className="px-4 py-3 flex items-center gap-3" data-testid={`row-provider-${p.id}`}>
                    <input
                      value={p.name}
                      onChange={(e) => updateProvider(p.id, e.target.value)}
                      className="flex-1 bg-bg border border-hairline px-2 py-1.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-oxblood/70"
                      data-testid={`input-provider-${p.id}`}
                    />
                    <button
                      onClick={() => deleteProvider(p.id)}
                      className="text-ink/40 hover:text-oxblood"
                      data-testid={`button-delete-provider-${p.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-ink/50 mt-2">
                Add the people working the day. Assign them in the Provider column per row.
              </p>
            </section>

            <div className="pt-2">
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="inline-flex items-center gap-2 bg-ink text-bg px-4 py-2 disabled:opacity-60"
                data-testid="button-save-bottom"
              >
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save draft
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
