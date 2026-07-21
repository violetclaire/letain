import { AlertCircle, GitBranch, Loader2 } from "lucide-react";
import React, { type ReactNode } from "react";

export type InquiryDecisionChainRecordType =
  | "coordination_judgment"
  | "scoped_permission_decision"
  | "human_action_decision";

export interface InquiryDecisionChainReference {
  referenceType: string;
  targetRecordType: string;
  targetId: string;
  status: "present" | "missing";
}

export interface InquiryDecisionChainRecord {
  recordType: InquiryDecisionChainRecordType;
  id: string;
  createdAt: string;
  lifecycleAction: string;
  relatedRecordId: string | null;
  references: InquiryDecisionChainReference[];
  record: {
    choice?: "proceed" | "wait" | "clarify" | "escalate" | "stop";
  };
}

export interface InquiryDecisionChainProvenanceGap {
  sourceRecordType: InquiryDecisionChainRecordType;
  sourceRecordId: string;
  referenceType: string;
  missingTargetRecordType: string;
  missingTargetId: string;
}

export interface InquiryDecisionChain {
  operatorId: string;
  inquiryId: string;
  records: InquiryDecisionChainRecord[];
  provenanceGaps: InquiryDecisionChainProvenanceGap[];
}

export interface InquiryDecisionChainResponse {
  decisionChain: InquiryDecisionChain;
}

type PanelStatus = "loading" | "ready" | "unavailable" | "error";

interface InquiryDecisionChainPanelProps {
  status: PanelStatus;
  decisionChain?: InquiryDecisionChain | null;
  errorMessage?: string;
}

const recordKindLabels: Record<InquiryDecisionChainRecordType, string> = {
  coordination_judgment: "Coordination judgment",
  scoped_permission_decision: "Scoped permission decision",
  human_action_decision: "Human action decision",
};

const referenceLabels: Record<string, string> = {
  supporting_attestation: "Witnessed record",
  related_judgment: "Related judgment",
  linked_judgment: "Linked judgment",
  related_permission_decision: "Related permission decision",
  reviewed_permission_decision: "Reviewed permission decision",
  related_human_action_decision: "Related human action decision",
};

function lifecycleLabel(value: string): string {
  if (value === "judgment" || value === "decision") return "Original";
  if (value === "correction") return "Correction";
  if (value === "withdrawal") return "Withdrawal";
  if (value === "supersession") return "Supersession";
  if (value === "challenge") return "Challenge";
  return value;
}

function recordKindLabel(value: InquiryDecisionChainRecordType): string {
  return recordKindLabels[value];
}

function referenceLabel(value: string): string {
  return referenceLabels[value] || value.replaceAll("_", " ");
}

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

function PanelShell({ children }: { children: ReactNode }) {
  return (
    <section className="border border-hairline bg-surface px-4 py-4" data-testid="inquiry-decision-chain-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-ink/50" />
            <h3 className="font-serif text-base tracking-tight">Decision Chain</h3>
          </div>
          <p className="max-w-3xl text-xs text-ink/55">
            Private record of witnessed source provenance, coordination judgment, scoped permission, and human choice. It does not select a correct record or create authority.
          </p>
        </div>
        <span className="inline-flex w-fit items-center border border-hairline px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-ink/55">
          Read-only history
        </span>
      </div>
      {children}
      <p className="mt-3 text-xs text-ink/55">
        This panel displays existing records only. A displayed proceed choice does not perform an action.
      </p>
    </section>
  );
}

export function InquiryDecisionChainPanel({
  status,
  decisionChain,
  errorMessage,
}: InquiryDecisionChainPanelProps) {
  if (status === "loading") {
    return (
      <PanelShell>
        <div className="mt-4 flex items-center gap-2 border-t border-hairline pt-4 text-sm text-ink/60" data-testid="decision-chain-loading">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading decision chain.
        </div>
      </PanelShell>
    );
  }

  if (status === "unavailable") {
    return (
      <PanelShell>
        <p className="mt-4 border-t border-hairline pt-4 text-sm text-ink/60" data-testid="decision-chain-unavailable">
          Decision chain is unavailable for this inquiry.
        </p>
      </PanelShell>
    );
  }

  if (status === "error") {
    return (
      <PanelShell>
        <div className="mt-4 flex items-start gap-2 border-t border-hairline pt-4 text-sm text-oxblood" data-testid="decision-chain-error">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{errorMessage || "Could not load the decision chain."}</p>
        </div>
      </PanelShell>
    );
  }

  if (!decisionChain || decisionChain.records.length === 0) {
    return (
      <PanelShell>
        <p className="mt-4 border-t border-hairline pt-4 text-sm text-ink/60" data-testid="decision-chain-empty">
          No coordination judgment, scoped permission decision, or human action decision has been recorded for this inquiry.
        </p>
      </PanelShell>
    );
  }

  const referenceCount = decisionChain.records.reduce((total, record) => total + record.references.length, 0);

  return (
    <PanelShell>
      <div className="mt-4 border-y border-hairline py-3" data-testid="decision-chain-source-provenance">
        <p className="text-xs uppercase tracking-wide text-ink/45">Witnessed record / source provenance</p>
        <p className="mt-1 text-sm text-ink/70">
          {referenceCount} linked source {referenceCount === 1 ? "reference" : "references"}. Missing links remain visible below.
        </p>
      </div>

      <ol className="divide-y divide-hairline" data-testid="decision-chain-records">
        {decisionChain.records.map((item) => (
          <li className="py-4" key={`${item.recordType}:${item.id}`} data-testid={`decision-chain-record-${item.id}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{recordKindLabel(item.recordType)}</p>
                <p className="mt-1 break-all font-mono text-xs text-ink/50">{item.id}</p>
              </div>
              <span className="inline-flex w-fit border border-hairline bg-bg px-2 py-0.5 text-[11px] uppercase tracking-wide text-ink/60">
                {lifecycleLabel(item.lifecycleAction)}
              </span>
            </div>

            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink/45">Created</dt>
                <dd className="mt-1 text-ink/70">{formatCreatedAt(item.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-ink/45">Related record</dt>
                <dd className="mt-1 break-all font-mono text-xs text-ink/70">
                  {item.relatedRecordId || "None"}
                </dd>
              </div>
              {item.recordType === "human_action_decision" && item.record.choice && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink/45">Human choice</dt>
                  <dd className="mt-1 font-mono text-sm text-ink" data-testid={`human-action-choice-${item.id}`}>
                    {item.record.choice}
                  </dd>
                </div>
              )}
            </dl>

            {item.references.length > 0 && (
              <ul className="mt-3 space-y-1 border-l border-hairline pl-3 text-xs text-ink/65">
                {item.references.map((recordReference) => (
                  <li key={`${recordReference.referenceType}:${recordReference.targetId}`} className="flex flex-wrap items-center gap-2">
                    <span>{referenceLabel(recordReference.referenceType)}</span>
                    <span className="break-all font-mono">{recordReference.targetId}</span>
                    <span className={recordReference.status === "missing" ? "text-oxblood" : "text-ink/45"}>
                      {recordReference.status === "missing" ? "Missing" : "Present"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>

      {decisionChain.provenanceGaps.length > 0 && (
        <div className="border-t border-hairline pt-4" data-testid="decision-chain-provenance-gaps">
          <div className="flex items-center gap-2 text-oxblood">
            <AlertCircle className="h-4 w-4" />
            <h4 className="text-sm font-medium">Provenance gaps</h4>
          </div>
          <ul className="mt-2 space-y-2 text-sm text-ink/70">
            {decisionChain.provenanceGaps.map((gap) => (
              <li key={`${gap.sourceRecordType}:${gap.sourceRecordId}:${gap.referenceType}:${gap.missingTargetId}`}>
                <span className="font-mono text-xs">{gap.sourceRecordId}</span>
                {" references missing "}
                <span className="font-mono text-xs">{gap.missingTargetId}</span>
                {` (${referenceLabel(gap.referenceType)}).`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </PanelShell>
  );
}
