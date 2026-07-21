import React, { useMemo, useState, type FormEvent } from "react";
import { AlertCircle, Loader2, Scale } from "lucide-react";

export interface HumanAttestationSummary {
  id: string;
  operatorId: string;
  authorUserId: string;
  inquiryId: string;
  claimText: string;
  authorCapacity: string;
  knowledgeBasis: "firsthand" | "relayed" | "evidence_review";
  lifecycleAction: "attestation" | "correction" | "withdrawal" | "challenge" | "supersession";
  relatedAttestationId: string | null;
  createdAt: string;
}

export interface CoordinationJudgmentSubmission {
  inquiryId: string;
  subjectText: string;
  scopeText: string;
  judgmentText: string;
  rationaleText: string;
  evidenceBasis: string;
  lifecycleAction: "judgment";
  relatedJudgmentId: null;
  supportingAttestationIds: string[];
}

type SourceStatus = "loading" | "ready" | "unavailable" | "error";

interface CoordinationJudgmentEntryPanelProps {
  inquiryId: string | null;
  sourceStatus: SourceStatus;
  attestations: HumanAttestationSummary[];
  isSubmitting: boolean;
  onSubmit: (submission: CoordinationJudgmentSubmission) => Promise<void>;
}

interface JudgmentFormState {
  subjectText: string;
  scopeText: string;
  judgmentText: string;
  rationaleText: string;
  evidenceBasis: string;
  selectedAttestationIds: string[];
}

const emptyFormState: JudgmentFormState = {
  subjectText: "",
  scopeText: "",
  judgmentText: "",
  rationaleText: "",
  evidenceBasis: "",
  selectedAttestationIds: [],
};

const knowledgeBasisLabels: Record<HumanAttestationSummary["knowledgeBasis"], string> = {
  firsthand: "Firsthand",
  relayed: "Relayed",
  evidence_review: "Evidence review",
};

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "Time unavailable";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function hasRequiredText(form: JudgmentFormState): boolean {
  return Boolean(
    form.subjectText.trim()
      && form.scopeText.trim()
      && form.judgmentText.trim()
      && form.rationaleText.trim()
      && form.evidenceBasis.trim(),
  );
}

export function CoordinationJudgmentEntryPanel({
  inquiryId,
  sourceStatus,
  attestations,
  isSubmitting,
  onSubmit,
}: CoordinationJudgmentEntryPanelProps) {
  const [form, setForm] = useState<JudgmentFormState>(emptyFormState);
  const [showValidation, setShowValidation] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const selectedAttestationIds = useMemo(() => new Set(form.selectedAttestationIds), [form.selectedAttestationIds]);
  const canSubmit = Boolean(inquiryId) && sourceStatus === "ready" && hasRequiredText(form) && !isSubmitting;

  const updateText = (field: keyof Omit<JudgmentFormState, "selectedAttestationIds">, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFeedback(null);
  };

  const toggleAttestation = (attestationId: string) => {
    setForm((current) => ({
      ...current,
      selectedAttestationIds: current.selectedAttestationIds.includes(attestationId)
        ? current.selectedAttestationIds.filter((id) => id !== attestationId)
        : [...current.selectedAttestationIds, attestationId],
    }));
    setFeedback(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowValidation(true);
    setFeedback(null);
    if (!inquiryId || sourceStatus !== "ready" || !hasRequiredText(form) || isSubmitting) return;

    const supportingAttestationIds = attestations
      .filter((attestation) => selectedAttestationIds.has(attestation.id))
      .map((attestation) => attestation.id);

    try {
      await onSubmit({
        inquiryId,
        subjectText: form.subjectText.trim(),
        scopeText: form.scopeText.trim(),
        judgmentText: form.judgmentText.trim(),
        rationaleText: form.rationaleText.trim(),
        evidenceBasis: form.evidenceBasis.trim(),
        lifecycleAction: "judgment",
        relatedJudgmentId: null,
        supportingAttestationIds,
      });
      setForm(emptyFormState);
      setShowValidation(false);
      setFeedback({
        kind: "success",
        message: "Judgment recorded. The private Decision Chain now includes this record.",
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not record the coordination judgment.",
      });
    }
  };

  return (
    <section className="border border-hairline bg-surface px-4 py-4" data-testid="coordination-judgment-entry-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <Scale className="h-4 w-4 text-ink/50" />
            <h3 className="font-serif text-base tracking-tight">Record coordination judgment</h3>
          </div>
          <p className="max-w-3xl text-xs text-ink/55">
            Review the private witnessed records, then record your bounded conclusion and rationale. Nothing is selected or submitted automatically.
          </p>
        </div>
        <span className="inline-flex w-fit items-center border border-hairline px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-ink/55">
          Human-authored
        </span>
      </div>

      <div className="mt-4 border-y border-hairline py-3" data-testid="coordination-judgment-source-records">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <p className="text-xs uppercase tracking-wide text-ink/45">Witnessed source records</p>
          <p className="text-xs text-ink/50">Selected records are linked in the order shown.</p>
        </div>

        {sourceStatus === "loading" && (
          <div className="mt-3 flex items-center gap-2 text-sm text-ink/60" data-testid="coordination-judgment-sources-loading">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading witnessed records.
          </div>
        )}
        {sourceStatus === "unavailable" && (
          <p className="mt-3 text-sm text-ink/60" data-testid="coordination-judgment-sources-unavailable">
            Select an inquiry to review its witnessed records.
          </p>
        )}
        {sourceStatus === "error" && (
          <div className="mt-3 flex items-start gap-2 text-sm text-oxblood" data-testid="coordination-judgment-sources-error">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Could not load the private witnessed records. No judgment can be submitted.</p>
          </div>
        )}
        {sourceStatus === "ready" && attestations.length === 0 && (
          <p className="mt-3 text-sm text-ink/60" data-testid="coordination-judgment-sources-empty">
            No witnessed attestation records have been recorded for this inquiry. Identify any other evidence in the evidence basis below.
          </p>
        )}
        {sourceStatus === "ready" && attestations.length > 0 && (
          <ul className="mt-3 divide-y divide-hairline" data-testid="coordination-judgment-source-list">
            {attestations.map((attestation) => (
              <li key={attestation.id} className="py-3">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedAttestationIds.has(attestation.id)}
                    onChange={() => toggleAttestation(attestation.id)}
                    className="mt-1 h-4 w-4 shrink-0 accent-ink"
                    data-testid={`coordination-judgment-source-${attestation.id}`}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm text-ink">{attestation.claimText}</span>
                    <span className="mt-1 block text-xs text-ink/50">
                      {knowledgeBasisLabels[attestation.knowledgeBasis]} / {attestation.authorCapacity} / {attestation.lifecycleAction} / {formatCreatedAt(attestation.createdAt)}
                    </span>
                    <span className="mt-1 block break-all font-mono text-[11px] text-ink/40">{attestation.id}</span>
                    {attestation.relatedAttestationId && (
                      <span className="mt-1 block break-all font-mono text-[11px] text-ink/50">
                        Related record: {attestation.relatedAttestationId}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit} data-testid="coordination-judgment-form">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-ink/45">Subject</span>
            <input
              type="text"
              value={form.subjectText}
              onChange={(event) => updateText("subjectText", event.target.value)}
              maxLength={1000}
              className="mt-1 h-9 w-full border border-hairline bg-bg px-3 text-sm text-ink focus:border-ink/40 focus:outline-none"
              data-testid="input-coordination-judgment-subject"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-ink/45">Scope</span>
            <input
              type="text"
              value={form.scopeText}
              onChange={(event) => updateText("scopeText", event.target.value)}
              maxLength={5000}
              className="mt-1 h-9 w-full border border-hairline bg-bg px-3 text-sm text-ink focus:border-ink/40 focus:outline-none"
              data-testid="input-coordination-judgment-scope"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-ink/45">Judgment</span>
          <textarea
            value={form.judgmentText}
            onChange={(event) => updateText("judgmentText", event.target.value)}
            rows={3}
            maxLength={20000}
            className="mt-1 w-full resize-y border border-hairline bg-bg px-3 py-2 text-sm text-ink focus:border-ink/40 focus:outline-none"
            data-testid="textarea-coordination-judgment"
          />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-ink/45">Rationale</span>
          <textarea
            value={form.rationaleText}
            onChange={(event) => updateText("rationaleText", event.target.value)}
            rows={3}
            maxLength={20000}
            className="mt-1 w-full resize-y border border-hairline bg-bg px-3 py-2 text-sm text-ink focus:border-ink/40 focus:outline-none"
            data-testid="textarea-coordination-judgment-rationale"
          />
          <span className="mt-1 block text-xs text-ink/50">
            Explain your interpretation here. Do not present reviewed, relayed, or inferred information as firsthand testimony.
          </span>
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-ink/45">Evidence basis</span>
          <textarea
            value={form.evidenceBasis}
            onChange={(event) => updateText("evidenceBasis", event.target.value)}
            rows={3}
            maxLength={20000}
            className="mt-1 w-full resize-y border border-hairline bg-bg px-3 py-2 text-sm text-ink focus:border-ink/40 focus:outline-none"
            data-testid="textarea-coordination-judgment-evidence-basis"
          />
          <span className="mt-1 block text-xs text-ink/50">
            Identify the records and context this judgment relies on, including evidence not represented by an attestation link.
          </span>
        </label>

        {showValidation && !hasRequiredText(form) && (
          <p className="text-sm text-oxblood" data-testid="coordination-judgment-validation-error">
            Subject, scope, judgment, rationale, and evidence basis are required.
          </p>
        )}
        {feedback && (
          <p
            className={feedback.kind === "success" ? "text-sm text-ink/70" : "text-sm text-oxblood"}
            data-testid={`coordination-judgment-${feedback.kind}`}
          >
            {feedback.message}
          </p>
        )}

        <div className="flex flex-col gap-3 border-t border-hairline pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-xs text-ink/55">
            This creates one original append-only judgment. It grants no permission and performs no action. AI does not originate or sign this record.
          </p>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-9 w-fit items-center gap-2 border border-ink bg-ink px-3 text-xs text-bg transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:border-hairline disabled:bg-bg disabled:text-ink/35"
            data-testid="button-record-coordination-judgment"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
            {isSubmitting ? "Recording" : "Record judgment"}
          </button>
        </div>
      </form>
    </section>
  );
}
