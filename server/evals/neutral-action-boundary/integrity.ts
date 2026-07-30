import { createHash } from "node:crypto";
import type { AuthorityDecision, DecisionReceipt, HumanApproval } from "./types";

export function deterministicIntegrityValue(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function createDecisionReceipt(input: {
  decision: AuthorityDecision;
  previousReceiptReference?: string | null;
  approvals?: HumanApproval[];
}): DecisionReceipt {
  const approvals = input.approvals ?? [];
  const approvalSummary = approvals.length === 0
    ? "No human approval supplied."
    : approvals
        .map((approval) =>
          [
            `Approval ${approval.approvalId}`,
            `by ${approval.approverId}`,
            `for ${approval.exactAction}`,
            `on ${approval.exactTarget}`,
            `because ${approval.rationale}`,
          ].join(" ")
        )
        .join(" | ");
  const receiptWithoutIntegrity = {
    receiptId: `receipt-${input.decision.decisionId}`,
    requestId: input.decision.requestId,
    decisionId: input.decision.decisionId,
    previousReceiptReference: input.previousReceiptReference ?? null,
    inputSummary: `Action request ${input.decision.requestId}. ${approvalSummary}`,
    decisionSummary: `${input.decision.outcome}: ${input.decision.humanReadableExplanation}`,
    policyVersion: input.decision.policyVersion,
    timestamp: input.decision.decidedAt,
  };
  return {
    ...receiptWithoutIntegrity,
    integrityValue: deterministicIntegrityValue(receiptWithoutIntegrity),
  };
}
