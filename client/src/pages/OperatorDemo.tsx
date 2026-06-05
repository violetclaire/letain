import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  Inbox,
  CalendarClock,
  Eye,
  UserPlus,
  Send,
  Check,
  ShieldCheck,
} from "lucide-react";

/**
 * OperatorDemo — a fully self-contained, no-login walkthrough of the Briarwood
 * operator coordination loop. Everything here is local mock state. It makes NO
 * network calls, never touches the database, and never calls any send/preflight
 * endpoint. Dry run is forced ON and cannot be turned off. All names, emails and
 * phone numbers below are fake demo data.
 */

type Mode = "pricing" | "decline" | "referral" | null;
type RouteStatus = "none" | "pending" | "accepted";

interface TimelineEntry {
  key: string;
  kind: "event" | "preview";
  label: string;
  detail: string;
}

interface DemoPreview {
  action: string;
  channel: string;
  recipientName: string;
  recipientEmail?: string;
  recipientPhone?: string;
  routeTargetName?: string;
  subject?: string;
  body: string;
  recordEffect: string;
}

const DEMO = {
  client: {
    name: "Maria Chen",
    email: "maria.chen@demo-client.example",
    service: "Bridal hair and makeup",
    date: "August 8, 2026",
    location: "Stanly Ranch, Napa",
    scope: "Bride + 6 services",
    referredBy: "Taylor",
  },
  target: {
    name: "Taylor",
    role: "Hairstylist / trusted colleague",
    phone: "(555) 010-2048",
  },
};

const BODIES = {
  pricing:
    "Hi Maria,\n\nThank you so much for reaching out about your August 8 wedding at Stanly Ranch. I would love to be part of your day.\n\nFor a bride plus 6 services, my bridal collection starts at $1,850 and includes a preview session. Here is everything in one place: [your pricing link].\n\nWarmly,\n[Your name]",
  decline:
    "Hi Maria,\n\nThank you for thinking of me for August 8. I am already committed that weekend, so I am not able to take it on myself. I would still love to help you find someone wonderful from my trusted circle.\n\nWarmly,\n[Your name]",
  referral:
    "Hi Maria,\n\nI am booked on August 8, but I have someone wonderful for you. Taylor is a hairstylist I trust completely, and they have confirmed they are available for your date at Stanly Ranch.\n\nI will introduce you directly so you are in good hands.\n\nWarmly,\n[Your name]",
  preflight:
    "Hi Taylor, I have a bride (Maria Chen) for August 8 at Stanly Ranch, bride plus 6 services. Are you available and interested before I share you with her?",
};

function buildPreview(kind: "pricing" | "decline" | "referral" | "preflight", body: string): DemoPreview {
  if (kind === "preflight") {
    return {
      action: "Ask Taylor privately before the client ever sees them.",
      channel: "sms",
      recipientName: DEMO.target.name,
      recipientPhone: DEMO.target.phone,
      routeTargetName: DEMO.target.name,
      body,
      recordEffect: "The route would be marked pending and Taylor would receive this text.",
    };
  }
  if (kind === "referral") {
    return {
      action: "Send the referral introduction to the client.",
      channel: "email",
      recipientName: DEMO.client.name,
      recipientEmail: DEMO.client.email,
      subject: "An introduction for your August 8 wedding",
      body,
      recordEffect: "The response would be marked sent and Maria would receive this email.",
    };
  }
  return {
    action: kind === "pricing" ? "Send pricing and info to the client." : "Send a polite decline to the client.",
    channel: "email",
    recipientName: DEMO.client.name,
    recipientEmail: DEMO.client.email,
    subject: kind === "pricing" ? "Thanks for reaching out about August 8" : "About your August 8 date",
    body,
    recordEffect: "The response would be marked sent and the client would receive this email.",
  };
}

export default function OperatorDemo() {
  const [mode, setMode] = useState<Mode>(null);
  const [note, setNote] = useState("");
  const [body, setBody] = useState("");
  const [targetSelected, setTargetSelected] = useState(false);
  const [routeStatus, setRouteStatus] = useState<RouteStatus>("none");
  const [preflightDone, setPreflightDone] = useState(false);
  const [preview, setPreview] = useState<DemoPreview | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([
    {
      key: "inquiry_received",
      kind: "event",
      label: "Inquiry received",
      detail: "Maria Chen asked about August 8 at Stanly Ranch (referred by Taylor).",
    },
    {
      key: "availability_checked",
      kind: "event",
      label: "Availability checked",
      detail: "Possible conflict: August 8 is held by an existing contract.",
    },
  ]);

  const addEntry = (entry: TimelineEntry) =>
    setTimeline((prev) => (prev.some((e) => e.key === entry.key) ? prev : [...prev, entry]));

  const startMode = (m: Exclude<Mode, null>) => {
    setMode(m);
    setNote("");
    setBody(BODIES[m]);
    setPreview(null);
  };

  const previewResponse = () => {
    if (!mode) return;
    const p = buildPreview(mode, (note ? note + "\n\n" : "") + body);
    setPreview(p);
    if (mode === "pricing")
      addEntry({ key: "pricing_previewed", kind: "preview", label: "Pricing previewed", detail: "Pricing and info drafted for Maria. Preview only." });
    if (mode === "decline")
      addEntry({ key: "decline_previewed", kind: "preview", label: "Decline previewed", detail: "Polite decline drafted for Maria. Preview only." });
    if (mode === "referral")
      addEntry({ key: "referral_previewed", kind: "preview", label: "Referral previewed", detail: "Referral introducing Taylor drafted for Maria. Preview only." });
  };

  const addToRouting = () => {
    if (!targetSelected) return;
    setRouteStatus("pending");
    addEntry({ key: "route_selected", kind: "event", label: "Route target selected", detail: "Taylor added to routing for this inquiry." });
  };

  const previewPreflight = () => {
    setPreview(buildPreview("preflight", BODIES.preflight));
    setPreflightDone(true);
    addEntry({ key: "preflight_previewed", kind: "preview", label: "Preflight previewed", detail: "Private ask to Taylor drafted. Preview only." });
  };

  const acceptRoute = () => {
    setRouteStatus("accepted");
    addEntry({ key: "route_accepted", kind: "event", label: "Route target accepted", detail: "Taylor accepted and is available for August 8." });
  };

  const referralReady = mode === "referral" && routeStatus === "accepted";

  return (
    <div className="min-h-screen bg-bg text-ink font-sans">
      {/* HEADER */}
      <header className="border-b border-hairline">
        <div className="estate-container py-5 flex items-center justify-between">
          <div>
            <Link href="/" className="inline-flex items-center gap-1 text-xs text-ink/60 underline mb-2" data-testid="link-back-home">
              <ArrowLeft className="w-3 h-3" /> Back
            </Link>
            <div className="font-serif text-xl tracking-tight" data-testid="text-demo-wordmark">Briarwood</div>
            <div className="text-xs text-ink/55">Operator Demo</div>
          </div>
          <div className="flex items-center gap-2 text-xs border border-brass/50 bg-brass/10 text-ink px-3 py-1.5" data-testid="pill-dry-run-forced">
            <ShieldCheck className="w-3.5 h-3.5 text-brass" />
            Dry run forced ON
          </div>
        </div>
      </header>

      {/* DEMO BANNER */}
      <div className="bg-oxblood text-bg" data-testid="banner-demo-mode">
        <div className="estate-container py-2.5 text-sm text-center">
          Demo Mode: fake data only. Nothing will be sent.
        </div>
      </div>

      <main className="estate-container py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT: ASSISTANT + COMPOSER */}
        <section className="lg:col-span-2">
          {/* ASSISTANT PROMPT */}
          <div className="border border-hairline bg-surface p-5" data-testid="assistant-prompt">
            <div className="text-xs uppercase tracking-wide text-brass mb-1">Assistant</div>
            <h1 className="font-serif text-2xl tracking-tight mb-2">New inquiry from {DEMO.client.name}</h1>
            <p className="text-sm text-ink/70 estate-prose">
              {DEMO.client.name} asked about {DEMO.client.service.toLowerCase()} for {DEMO.client.date} at{" "}
              {DEMO.client.location} ({DEMO.client.scope}). Heads up: your calendar shows a possible
              conflict on that date. You can still send pricing, politely decline, or route this to
              someone in your trusted circle.
            </p>
            <div className="mt-3 text-xs text-ink/55">
              Suggested: confirm availability, then either send pricing or refer Taylor.
            </div>
          </div>

          {/* INQUIRY CONTEXT */}
          <div className="mt-5 border-t border-hairline pt-5">
            <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-ink/70" data-testid="composer-context">
              <div><span className="text-ink/50">Client:</span> {DEMO.client.name}</div>
              <div><span className="text-ink/50">Service:</span> {DEMO.client.service}</div>
              <div><span className="text-ink/50">Date:</span> {DEMO.client.date}</div>
              <div><span className="text-ink/50">Location:</span> {DEMO.client.location}</div>
              <div><span className="text-ink/50">Scope:</span> {DEMO.client.scope}</div>
              <div><span className="text-ink/50">Referred by:</span> {DEMO.client.referredBy}</div>
            </div>

            {/* DRY-RUN INDICATOR (locked) */}
            <div className="mb-4 flex items-center justify-between gap-3 border border-hairline bg-bg px-3 py-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked readOnly disabled data-testid="switch-dry-run-locked" />
                <span className="font-medium">Dry run</span>
              </label>
              <span className="text-xs text-ink/55">Locked on for this demo. Nothing will be sent.</span>
            </div>

            {/* ACTION PICKER */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={() => startMode("pricing")} className="text-sm border border-hairline px-3 py-1.5 hover:bg-surface-2" data-testid="button-mode-pricing">
                Send pricing / info
              </button>
              <button onClick={() => startMode("decline")} className="text-sm border border-hairline px-3 py-1.5 hover:bg-surface-2" data-testid="button-mode-decline">
                Decline (no routing)
              </button>
              <button onClick={() => startMode("referral")} className="text-sm border border-hairline px-3 py-1.5 hover:bg-surface-2" data-testid="button-mode-referral">
                Refer / route / delegate
              </button>
            </div>

            {/* COMPOSER PANEL */}
            {mode && (
              <div className="border border-hairline bg-bg p-4 mb-4" data-testid="composer-panel">
                {mode === "referral" && (
                  <div className="mb-4">
                    <div className="font-medium text-sm mb-2">1. Route to your network</div>
                    <p className="text-xs text-ink/55 mb-3">
                      Ask each person before the client ever sees them. Only people who accept will be
                      included in the referral message.
                    </p>
                    <label className="flex items-center gap-2 text-sm mb-3" data-testid="target-option-taylor">
                      <input
                        type="checkbox"
                        checked={targetSelected}
                        onChange={(e) => setTargetSelected(e.target.checked)}
                        disabled={routeStatus !== "none"}
                        data-testid="checkbox-target-taylor"
                      />
                      <span>{DEMO.target.name}</span>
                      <span className="text-xs text-ink/50">({DEMO.target.role})</span>
                    </label>

                    {routeStatus === "none" ? (
                      <button
                        onClick={addToRouting}
                        disabled={!targetSelected}
                        className="text-sm bg-ink text-bg px-3 py-1.5 disabled:opacity-50"
                        data-testid="button-create-routes"
                      >
                        Add selected to routing
                      </button>
                    ) : (
                      <div className="mt-2 space-y-2" data-testid="routes-list">
                        <div className="flex flex-wrap items-center gap-2 text-sm border border-hairline px-3 py-2" data-testid="route-row-taylor">
                          <span className="font-medium">{DEMO.target.name}</span>
                          <span className="text-xs text-ink/50">referral</span>
                          <span className="text-xs border border-hairline px-1.5 py-0.5 rounded">{routeStatus}</span>
                          {routeStatus === "pending" && (
                            <>
                              <button onClick={previewPreflight} className="text-xs underline text-ink" data-testid="button-preflight">
                                Preview preflight
                              </button>
                              <button
                                onClick={acceptRoute}
                                disabled={!preflightDone}
                                className="text-xs underline text-green-800 disabled:opacity-40 disabled:no-underline"
                                title={preflightDone ? undefined : "Preview the preflight ask first"}
                                data-testid="button-route-accept"
                              >
                                Mark accepted
                              </button>
                            </>
                          )}
                          {routeStatus === "accepted" && (
                            <span className="text-xs text-green-800 inline-flex items-center gap-1">
                              <Check className="w-3 h-3" /> accepted
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="font-medium text-sm mt-5 mb-2">2. Message the client</div>
                    <p className="text-xs text-ink/55 mb-3">
                      {routeStatus === "accepted"
                        ? "Taylor accepted. They will appear in the referral introduction below."
                        : "No one has accepted yet. The referral unlocks once someone accepts."}
                    </p>
                  </div>
                )}

                <label className="block text-xs text-ink/55 mb-1">Personal note (optional, goes on top)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Add a warm personal line, for example mentioning the venue or who referred them."
                  className="w-full px-3 py-2 bg-bg border border-hairline text-sm mb-3"
                  data-testid="input-note"
                />
                <label className="block text-xs text-ink/55 mb-1">Message</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 bg-bg border border-hairline text-sm mb-3 font-sans"
                  data-testid="input-body"
                />

                <div className="border border-hairline bg-surface-2 p-3 mb-3" data-testid="preview-inline">
                  <div className="text-xs text-ink/50 mb-1">Preview</div>
                  <div className="text-sm whitespace-pre-wrap">{(note ? note + "\n\n" : "") + body}</div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={previewResponse}
                    disabled={!body.trim() || (mode === "referral" && !referralReady)}
                    className="text-sm bg-ink text-bg px-4 py-2 disabled:opacity-50"
                    data-testid="button-preview-send"
                  >
                    Preview (dry run)
                  </button>
                  <button onClick={() => { setMode(null); setPreview(null); }} className="text-sm underline text-ink/70" data-testid="button-cancel">
                    Cancel
                  </button>
                  {mode === "referral" && !referralReady && (
                    <span className="text-xs text-ink/50">Need at least one accepted route to preview a referral.</span>
                  )}
                </div>
              </div>
            )}

            {/* DRY-RUN DELIVERY PREVIEW */}
            {preview && (
              <div className="mt-5 border border-oxblood/40 bg-bg p-4 text-sm" data-testid="delivery-preview">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-oxblood">Dry run: nothing will be sent.</div>
                  <button onClick={() => setPreview(null)} className="text-xs underline text-ink/60" data-testid="button-close-preview">
                    Close
                  </button>
                </div>
                <div className="text-xs text-ink/55 mb-3">{preview.action}</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-ink/80">
                  <div><span className="text-ink/50">Channel:</span> {preview.channel}</div>
                  <div><span className="text-ink/50">To:</span> {preview.recipientName}</div>
                  {preview.recipientEmail && <div><span className="text-ink/50">Email:</span> {preview.recipientEmail}</div>}
                  {preview.recipientPhone && <div><span className="text-ink/50">Phone:</span> {preview.recipientPhone}</div>}
                  {preview.routeTargetName && <div><span className="text-ink/50">Route target:</span> {preview.routeTargetName}</div>}
                </div>
                {preview.subject && <div className="mt-3"><span className="text-ink/50">Subject:</span> {preview.subject}</div>}
                <div className="mt-3">
                  <div className="text-ink/50 mb-1">Body</div>
                  <div className="border border-hairline bg-surface-2 p-3 whitespace-pre-wrap" data-testid="preview-body">{preview.body}</div>
                </div>
                <div className="mt-3 text-xs text-ink/55">
                  <span className="text-ink/50">If sent for real:</span> {preview.recordEffect}
                </div>
                <div className="mt-2 text-xs text-oxblood" data-testid="preview-blocked">
                  Dry run is on for this demo. Nothing was sent and no record was changed.
                </div>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT: COORDINATION TIMELINE */}
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-6">
            <h2 className="font-serif text-lg tracking-tight mb-3">Coordination Timeline</h2>
            <p className="text-xs text-ink/55 mb-4">
              Demo interactions only. Previews are clearly labeled and never recorded as sent.
            </p>
            <ol className="space-y-3" data-testid="coordination-timeline">
              {timeline.map((e) => {
                const Icon =
                  e.key === "inquiry_received" ? Inbox
                  : e.key === "availability_checked" ? CalendarClock
                  : e.key === "route_selected" ? UserPlus
                  : e.key === "route_accepted" ? Check
                  : e.kind === "preview" ? Eye
                  : Send;
                return (
                  <li key={e.key} className="border border-hairline bg-surface p-3" data-testid={`timeline-${e.key}`}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-brass" />
                      <span className="text-sm font-medium">{e.label}</span>
                      {e.kind === "preview" && (
                        <span className="ml-auto text-[10px] uppercase tracking-wide border border-hairline px-1.5 py-0.5 text-ink/60">
                          Preview
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-ink/60">{e.detail}</p>
                  </li>
                );
              })}
            </ol>
            <div className="mt-4 text-[11px] text-ink/45">
              No trust score changes in demo mode. Coordination events here are illustrative.
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
