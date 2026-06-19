import { useState } from "react";
import { Link, useRoute } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type PermissionDecision =
  | "PROCEED"
  | "PROCEED_WITH_OVERSIGHT"
  | "CLARIFY"
  | "REROUTE"
  | "ESCALATE"
  | "STOP";

type RiskFactor =
  | "MISSING_CONTEXT"
  | "UNCLEAR_AUTHORITY"
  | "INSUFFICIENT_TIME_BUFFER"
  | "UNAVAILABLE_ROUTE_TARGET"
  | "UNCONFIRMED_HANDOFF"
  | "LOW_RECOVERY_CAPACITY"
  | "PRIOR_OPEN_LOOP_FAILURE"
  | "ESCALATION_OVERDUE"
  | "ATTRIBUTION_AMBIGUOUS";

interface CoordinationPath {
  id: string;
  inquiryId: string;
  routeTargetId: string | null;
  status: string;
  contextCaptured: boolean;
  timingConstraints: { bufferMinutes?: number; hardStopAt?: string; readyByAt?: string; notes?: string } | null;
  authorityState: string;
  availabilityState: string;
  handoffState: string;
  escalationState: string;
  recoveryCapacity: string;
  commitmentState: string;
  outcomeVerificationState: string;
  pathRisk: RiskFactor[] | null;
  signalProvenance: string[] | null;
  updatedAt: string | null;
}

interface CoordinationAssessment {
  id: string;
  pathId: string;
  decision: PermissionDecision;
  confidence: number;
  riskFactors: RiskFactor[] | null;
  missingSignals: string[] | null;
  recommendedNextAction: string;
  humanJudgmentRequired: boolean;
  explanation: string;
  signalProvenance: string[] | null;
  createdAt: string;
}

interface CoordinationEvent {
  id: string;
  eventType: string;
  eventSource: string;
  summary: string;
  signalProvenance: string[] | null;
  createdAt: string;
}

interface Inquiry {
  id: string;
  clientName: string | null;
  eventDate: string | null;
  serviceType: string | null;
  status: string | null;
}

interface CoordinationPathResponse {
  path: CoordinationPath;
  inquiry: Inquiry;
  events: CoordinationEvent[];
  latestAssessment: CoordinationAssessment | null;
}

const DECISION_TONE: Record<PermissionDecision, string> = {
  PROCEED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  PROCEED_WITH_OVERSIGHT: "bg-blue-50 text-blue-800 border-blue-200",
  CLARIFY: "bg-amber-50 text-amber-800 border-amber-200",
  REROUTE: "bg-orange-50 text-orange-800 border-orange-200",
  ESCALATE: "bg-rose-50 text-rose-800 border-rose-200",
  STOP: "bg-red-50 text-red-800 border-red-200",
};

function humanize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function AuthRequired({ slug, pathId }: { slug: string; pathId: string }) {
  return (
    <div className="min-h-screen bg-bg text-ink flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-2xl tracking-tight mb-3">Please sign in</h1>
        <p className="text-ink/70 mb-6">
          Coordination paths are private operator state.
        </p>
        <Link
          href={`/artist-login?redirect=${encodeURIComponent(`/admin/${slug}/coordination/${pathId}`)}`}
          className="underline text-ink"
        >
          Go to sign in
        </Link>
      </div>
    </div>
  );
}

export default function CoordinationPathAdmin() {
  const [, params] = useRoute("/admin/:slug/coordination/:pathId");
  const slug = params?.slug ?? "";
  const pathId = params?.pathId ?? "";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [overrideSummary, setOverrideSummary] = useState("");

  const pathQuery = useQuery<CoordinationPathResponse>({
    queryKey: [`/api/coordination-paths/${pathId}`],
    queryFn: async () => {
      const res = await fetch(`/api/coordination-paths/${pathId}`, { credentials: "include" });
      if (res.status === 401) throw new Error("401");
      if (!res.ok) throw new Error("Failed to load coordination path");
      return res.json();
    },
    enabled: Boolean(pathId),
    retry: false,
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: [`/api/coordination-paths/${pathId}`] });

  const assess = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/coordination-paths/${pathId}/assess`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Assessment refreshed" });
      refresh();
    },
    onError: (err: Error) => {
      toast({ title: "Could not assess path", description: err.message, variant: "destructive" });
    },
  });

  const addOverride = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/coordination-paths/${pathId}/events`, {
        eventType: "human_override",
        eventSource: "operator",
        summary: overrideSummary.trim(),
        signalProvenance: [`coordination_path:${pathId}`],
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Override recorded" });
      setOverrideSummary("");
      refresh();
    },
    onError: (err: Error) => {
      toast({ title: "Could not record override", description: err.message, variant: "destructive" });
    },
  });

  if ((pathQuery.error as Error)?.message === "401") {
    return <AuthRequired slug={slug} pathId={pathId} />;
  }

  if (pathQuery.isLoading) {
    return (
      <div className="min-h-screen bg-bg text-ink flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (pathQuery.isError || !pathQuery.data) {
    return (
      <div className="min-h-screen bg-bg text-ink flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-amber-600" />
          <h1 className="font-serif text-2xl tracking-tight mb-3">Path unavailable</h1>
          <p className="text-ink/70">{(pathQuery.error as Error)?.message ?? "The coordination path could not be loaded."}</p>
        </div>
      </div>
    );
  }

  const { path, inquiry, events, latestAssessment } = pathQuery.data;
  const risks = latestAssessment?.riskFactors ?? [];
  const missingSignals = latestAssessment?.missingSignals ?? [];
  const decision = latestAssessment?.decision;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <main className="mx-auto max-w-6xl px-5 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href={`/inquiry-workspace`}
              className="inline-flex items-center gap-2 text-sm text-ink/70 hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" />
              Inquiry workspace
            </Link>
            <h1 className="mt-3 font-serif text-3xl tracking-tight">Coordination Path</h1>
            <p className="text-sm text-ink/60">{inquiry.clientName ?? "Unknown client"} · {inquiry.serviceType ?? "No service type"}</p>
          </div>
          <Button onClick={() => assess.mutate()} disabled={assess.isPending}>
            {assess.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Assess path
          </Button>
        </div>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Permission Decision</h2>
                {decision ? (
                  <div className={`mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${DECISION_TONE[decision]}`}>
                    {decision === "PROCEED" ? <CheckCircle2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                    {humanize(decision)}
                  </div>
                ) : (
                  <Badge variant="outline" className="mt-3">Not assessed</Badge>
                )}
              </div>
              {latestAssessment && (
                <div className="text-right text-sm text-ink/60">
                  <div>{latestAssessment.confidence}% confidence</div>
                  <div>{formatDate(latestAssessment.createdAt)}</div>
                </div>
              )}
            </div>

            {latestAssessment ? (
              <div className="mt-5 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold">Recommended next action</h3>
                  <p className="mt-1 text-sm leading-6 text-ink/75">{latestAssessment.recommendedNextAction}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Explanation</h3>
                  <p className="mt-1 text-sm leading-6 text-ink/75">{latestAssessment.explanation}</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-semibold">Risk factors</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {risks.length > 0 ? risks.map((risk) => (
                        <Badge key={risk} variant="outline">{humanize(risk)}</Badge>
                      )) : <span className="text-sm text-ink/55">None</span>}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Missing signals</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {missingSignals.length > 0 ? missingSignals.map((signal) => (
                        <Badge key={signal} variant="outline">{humanize(signal)}</Badge>
                      )) : <span className="text-sm text-ink/55">None</span>}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Signal provenance</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(latestAssessment.signalProvenance ?? []).map((signal) => (
                      <Badge key={signal} variant="outline">{signal}</Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded-md border border-ink/10 bg-ink/[0.03] px-3 py-2 text-sm">
                  Human judgment: {latestAssessment.humanJudgmentRequired ? "Required" : "Not required by current rules"}
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm text-ink/65">Run an assessment to create the first permission decision for this path.</p>
            )}
          </div>

          <div className="border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Current Path State</h2>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-ink/50">Status</dt><dd>{humanize(path.status)}</dd></div>
              <div><dt className="text-ink/50">Context</dt><dd>{path.contextCaptured ? "Captured" : "Missing"}</dd></div>
              <div><dt className="text-ink/50">Authority</dt><dd>{humanize(path.authorityState)}</dd></div>
              <div><dt className="text-ink/50">Availability</dt><dd>{humanize(path.availabilityState)}</dd></div>
              <div><dt className="text-ink/50">Handoff</dt><dd>{humanize(path.handoffState)}</dd></div>
              <div><dt className="text-ink/50">Escalation</dt><dd>{humanize(path.escalationState)}</dd></div>
              <div><dt className="text-ink/50">Recovery</dt><dd>{humanize(path.recoveryCapacity)}</dd></div>
              <div><dt className="text-ink/50">Commitment</dt><dd>{humanize(path.commitmentState)}</dd></div>
              <div><dt className="text-ink/50">Buffer</dt><dd>{path.timingConstraints?.bufferMinutes ?? "Not set"} min</dd></div>
              <div><dt className="text-ink/50">Outcome</dt><dd>{humanize(path.outcomeVerificationState)}</dd></div>
            </dl>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Human Override</h2>
            <Textarea
              className="mt-3 min-h-28"
              value={overrideSummary}
              onChange={(event) => setOverrideSummary(event.target.value)}
              placeholder="Record operator judgment or override reason"
            />
            <Button
              className="mt-3"
              onClick={() => addOverride.mutate()}
              disabled={addOverride.isPending || !overrideSummary.trim()}
            >
              {addOverride.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
              Record override
            </Button>
          </div>

          <div className="border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Event History</h2>
            <div className="mt-4 divide-y">
              {events.length > 0 ? events.map((event) => (
                <article key={event.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="outline">{humanize(event.eventType)}</Badge>
                    <span className="text-xs text-ink/50">{formatDate(event.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-ink/75">{event.summary}</p>
                  <p className="mt-1 text-xs text-ink/50">Source: {event.eventSource}</p>
                </article>
              )) : (
                <p className="text-sm text-ink/55">No events recorded.</p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
