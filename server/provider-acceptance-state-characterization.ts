export const PROVIDER_ACCEPTANCE_STATE_CHARACTERIZATION_VERSION =
  "provider-acceptance-state-characterization-v1" as const;

export const PROVIDER_ACCEPTANCE_STATES = [
  "unresolved_no_explicit_signal",
  "explicit_acceptance_signal",
  "explicit_decline_signal",
  "conditional_acceptance_signal",
  "conflicting_provider_signals",
  "withdrawn_or_superseded_signal",
  "stale_signal_requires_review",
] as const;

export type ProviderAcceptanceState = typeof PROVIDER_ACCEPTANCE_STATES[number];

export const PROVIDER_ACCEPTANCE_EVIDENCE_KINDS = [
  "acceptance",
  "decline",
  "conditional_acceptance",
  "withdrawal",
  "material_context_change",
  "availability",
  "route_assignment",
  "schedule_placement",
  "invitation_sent",
  "referral_context",
  "prior_work_history",
  "payment_contract_context",
  "other",
] as const;

export type ProviderAcceptanceEvidenceKind = typeof PROVIDER_ACCEPTANCE_EVIDENCE_KINDS[number];
export type ProviderAcceptanceEvidenceAuthorType = "provider" | "operator" | "client" | "system";
export type ProviderAcceptanceEvidenceSource =
  | "provider_message"
  | "operator_note"
  | "client_message"
  | "route_record"
  | "schedule_draft"
  | "invitation_record"
  | "relationship_record"
  | "commercial_record"
  | "material_context";

export type ProviderAcceptanceEvidence = {
  evidenceId: string;
  authoredAt: string;
  authorType: ProviderAcceptanceEvidenceAuthorType;
  authorId: string;
  source: ProviderAcceptanceEvidenceSource;
  kind: ProviderAcceptanceEvidenceKind;
  statement: string;
  contextVersion: string;
  conditions?: string[];
  supersedesEvidenceIds?: string[];
};

export type ProviderAcceptanceStateCharacterizationInput = {
  sourceTraceId: string;
  characterizedAt: string;
  currentContextVersion: string;
  evidence: ProviderAcceptanceEvidence[];
};

export const PROVIDER_ACCEPTANCE_FORBIDDEN_ACTIONS = [
  "route provider",
  "schedule provider",
  "send message",
  "contact provider",
  "create contract",
  "create invoice",
  "collect payment",
  "publish schedule",
  "create client link",
  "run preflight",
  "mark provider accepted",
  "execute next action",
] as const;

export type ProviderAcceptanceCharacterizationReason =
  | "NO_EXPLICIT_PROVIDER_STATEMENT"
  | "EXPLICIT_PROVIDER_ACCEPTANCE_EVIDENCE"
  | "EXPLICIT_PROVIDER_DECLINE_EVIDENCE"
  | "CONDITIONAL_PROVIDER_ACCEPTANCE_EVIDENCE"
  | "CONFLICTING_PROVIDER_EVIDENCE"
  | "PROVIDER_WITHDRAWAL_OR_SUPERSESSION"
  | "MATERIAL_CONTEXT_CHANGED_AFTER_SIGNAL";

export type ProviderAcceptanceStateCharacterizationResult = {
  characterizationVersion: typeof PROVIDER_ACCEPTANCE_STATE_CHARACTERIZATION_VERSION;
  sourceTraceId: string;
  characterizedAt: string;
  state: ProviderAcceptanceState;
  evidenceOnly: true;
  explicitProviderAuthoredSignal: boolean;
  characterizingEvidenceIds: string[];
  conditions: string[];
  reasons: ProviderAcceptanceCharacterizationReason[];
  chronology: ProviderAcceptanceEvidence[];
  provenance: Array<{
    evidenceId: string;
    authoredAt: string;
    authorType: ProviderAcceptanceEvidenceAuthorType;
    authorId: string;
    source: ProviderAcceptanceEvidenceSource;
  }>;
  requiresHumanReview: true;
  grantsRuntimeAuthority: false;
  allowedActions: [];
  forbiddenActions: typeof PROVIDER_ACCEPTANCE_FORBIDDEN_ACTIONS[number][];
};

export type ProviderAcceptanceStateValidationResult = {
  valid: boolean;
  issues: string[];
};

export class ProviderAcceptanceStateValidationError extends Error {
  issues: string[];

  constructor(issues: string[]) {
    super(`Invalid provider acceptance evidence: ${issues.join("; ")}`);
    this.name = "ProviderAcceptanceStateValidationError";
    this.issues = issues;
  }
}

const isoTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const providerAcceptanceEvidenceAuthorTypes: ProviderAcceptanceEvidenceAuthorType[] = [
  "provider",
  "operator",
  "client",
  "system",
];
const providerAcceptanceEvidenceSources: ProviderAcceptanceEvidenceSource[] = [
  "provider_message",
  "operator_note",
  "client_message",
  "route_record",
  "schedule_draft",
  "invitation_record",
  "relationship_record",
  "commercial_record",
  "material_context",
];
const explicitProviderSignalKinds = new Set<ProviderAcceptanceEvidenceKind>([
  "acceptance",
  "decline",
  "conditional_acceptance",
  "withdrawal",
]);

function hasText(value: string | null | undefined): value is string {
  return Boolean(value && value.trim().length > 0);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(hasText)));
}

function sortEvidence(evidence: ProviderAcceptanceEvidence[]): ProviderAcceptanceEvidence[] {
  return [...evidence].sort(
    (left, right) => left.authoredAt.localeCompare(right.authoredAt) || left.evidenceId.localeCompare(right.evidenceId),
  );
}

function isExplicitProviderStatement(evidence: ProviderAcceptanceEvidence): boolean {
  return (
    evidence.authorType === "provider" &&
    evidence.source === "provider_message" &&
    explicitProviderSignalKinds.has(evidence.kind)
  );
}

export function validateProviderAcceptanceStateInput(
  input: ProviderAcceptanceStateCharacterizationInput,
): ProviderAcceptanceStateValidationResult {
  const issues: string[] = [];
  const evidenceIds = new Set<string>();
  const evidenceById = new Map<string, ProviderAcceptanceEvidence>();

  if (!hasText(input.sourceTraceId)) issues.push("sourceTraceId is required");
  if (!isoTimestampPattern.test(input.characterizedAt)) issues.push("characterizedAt must be a fixed ISO timestamp");
  if (!hasText(input.currentContextVersion)) issues.push("currentContextVersion is required");
  if (!Array.isArray(input.evidence) || input.evidence.length === 0) issues.push("evidence is required");

  for (const evidence of input.evidence ?? []) {
    if (!hasText(evidence.evidenceId)) {
      issues.push("evidenceId is required");
    } else if (evidenceIds.has(evidence.evidenceId)) {
      issues.push(`duplicate evidenceId: ${evidence.evidenceId}`);
    } else {
      evidenceIds.add(evidence.evidenceId);
      evidenceById.set(evidence.evidenceId, evidence);
    }
    if (!isoTimestampPattern.test(evidence.authoredAt)) {
      issues.push(`authoredAt must be a fixed ISO timestamp: ${evidence.evidenceId || "unknown"}`);
    } else if (
      isoTimestampPattern.test(input.characterizedAt) &&
      evidence.authoredAt > input.characterizedAt
    ) {
      issues.push(`evidence cannot occur after characterizedAt: ${evidence.evidenceId || "unknown"}`);
    }
    if (!providerAcceptanceEvidenceAuthorTypes.includes(evidence.authorType)) {
      issues.push(`authorType is invalid: ${evidence.evidenceId || "unknown"}`);
    }
    if (!hasText(evidence.authorId)) issues.push(`authorId is required: ${evidence.evidenceId || "unknown"}`);
    if (!providerAcceptanceEvidenceSources.includes(evidence.source)) {
      issues.push(`source is invalid: ${evidence.evidenceId || "unknown"}`);
    }
    if (!PROVIDER_ACCEPTANCE_EVIDENCE_KINDS.includes(evidence.kind)) {
      issues.push(`kind is invalid: ${evidence.evidenceId || "unknown"}`);
    }
    if (!hasText(evidence.statement)) issues.push(`statement is required: ${evidence.evidenceId || "unknown"}`);
    if (!hasText(evidence.contextVersion)) {
      issues.push(`contextVersion is required: ${evidence.evidenceId || "unknown"}`);
    }
    if (evidence.kind === "conditional_acceptance" && unique(evidence.conditions ?? []).length === 0) {
      issues.push(`conditional acceptance requires conditions: ${evidence.evidenceId || "unknown"}`);
    }
    if ((evidence.supersedesEvidenceIds ?? []).includes(evidence.evidenceId)) {
      issues.push(`evidence cannot supersede itself: ${evidence.evidenceId}`);
    }
  }

  for (const evidence of input.evidence ?? []) {
    for (const supersededId of evidence.supersedesEvidenceIds ?? []) {
      const supersededEvidence = evidenceById.get(supersededId);
      if (!supersededEvidence) {
        issues.push(`unknown superseded evidenceId: ${supersededId}`);
      } else if (evidence.authoredAt <= supersededEvidence.authoredAt) {
        issues.push(`superseding evidence must be later: ${evidence.evidenceId} -> ${supersededId}`);
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

function resultFor(
  input: ProviderAcceptanceStateCharacterizationInput,
  chronology: ProviderAcceptanceEvidence[],
  state: ProviderAcceptanceState,
  characterizingEvidenceIds: string[],
  reasons: ProviderAcceptanceCharacterizationReason[],
): ProviderAcceptanceStateCharacterizationResult {
  const providerSignals = chronology.filter(isExplicitProviderStatement);
  const conditions = unique(
    chronology
      .filter((evidence) => characterizingEvidenceIds.includes(evidence.evidenceId))
      .flatMap((evidence) => evidence.conditions ?? []),
  );

  return {
    characterizationVersion: PROVIDER_ACCEPTANCE_STATE_CHARACTERIZATION_VERSION,
    sourceTraceId: input.sourceTraceId,
    characterizedAt: input.characterizedAt,
    state,
    evidenceOnly: true,
    explicitProviderAuthoredSignal: providerSignals.length > 0,
    characterizingEvidenceIds: unique(characterizingEvidenceIds),
    conditions,
    reasons,
    chronology,
    provenance: chronology.map((evidence) => ({
      evidenceId: evidence.evidenceId,
      authoredAt: evidence.authoredAt,
      authorType: evidence.authorType,
      authorId: evidence.authorId,
      source: evidence.source,
    })),
    requiresHumanReview: true,
    grantsRuntimeAuthority: false,
    allowedActions: [],
    forbiddenActions: [...PROVIDER_ACCEPTANCE_FORBIDDEN_ACTIONS],
  };
}

export function characterizeProviderAcceptanceState(
  input: ProviderAcceptanceStateCharacterizationInput,
): ProviderAcceptanceStateCharacterizationResult {
  const validation = validateProviderAcceptanceStateInput(input);
  if (!validation.valid) throw new ProviderAcceptanceStateValidationError(validation.issues);

  const chronology = sortEvidence(input.evidence);
  const providerSignals = chronology.filter(isExplicitProviderStatement);
  const supersededIds = new Set(chronology.flatMap((evidence) => evidence.supersedesEvidenceIds ?? []));
  const activeSignals = providerSignals.filter((evidence) => !supersededIds.has(evidence.evidenceId));
  const activeWithdrawals = activeSignals.filter((evidence) => evidence.kind === "withdrawal");
  const activeDecisionSignals = activeSignals.filter((evidence) => evidence.kind !== "withdrawal");
  const materialChanges = chronology.filter((evidence) => evidence.kind === "material_context_change");
  const latestMaterialChange = materialChanges.at(-1);
  const currentContextSignals = activeDecisionSignals.filter(
    (evidence) => evidence.contextVersion === input.currentContextVersion,
  );
  const latestActiveWithdrawal = activeWithdrawals.at(-1);
  const latestActiveDecisionSignal = activeDecisionSignals.at(-1);

  if (
    latestActiveWithdrawal &&
    (!latestActiveDecisionSignal || latestActiveWithdrawal.authoredAt >= latestActiveDecisionSignal.authoredAt)
  ) {
    return resultFor(
      input,
      chronology,
      "withdrawn_or_superseded_signal",
      [latestActiveWithdrawal.evidenceId],
      ["PROVIDER_WITHDRAWAL_OR_SUPERSESSION"],
    );
  }

  if (
    activeDecisionSignals.length > 0 &&
    (currentContextSignals.length === 0 ||
      Boolean(
        latestMaterialChange &&
          currentContextSignals.every((evidence) => evidence.authoredAt < latestMaterialChange.authoredAt),
      ))
  ) {
    return resultFor(
      input,
      chronology,
      "stale_signal_requires_review",
      unique([
        ...activeDecisionSignals.map((evidence) => evidence.evidenceId),
        ...(latestMaterialChange ? [latestMaterialChange.evidenceId] : []),
      ]),
      ["MATERIAL_CONTEXT_CHANGED_AFTER_SIGNAL"],
    );
  }

  const decisionSignals = currentContextSignals.length > 0 ? currentContextSignals : activeDecisionSignals;
  const positiveSignals = decisionSignals.filter(
    (evidence) => evidence.kind === "acceptance" || evidence.kind === "conditional_acceptance",
  );
  const declineSignals = decisionSignals.filter((evidence) => evidence.kind === "decline");

  if (positiveSignals.length > 0 && declineSignals.length > 0) {
    return resultFor(
      input,
      chronology,
      "conflicting_provider_signals",
      [...positiveSignals, ...declineSignals].map((evidence) => evidence.evidenceId),
      ["CONFLICTING_PROVIDER_EVIDENCE"],
    );
  }

  const conditionalSignals = decisionSignals.filter((evidence) => evidence.kind === "conditional_acceptance");
  if (conditionalSignals.length > 0) {
    return resultFor(
      input,
      chronology,
      "conditional_acceptance_signal",
      conditionalSignals.map((evidence) => evidence.evidenceId),
      ["CONDITIONAL_PROVIDER_ACCEPTANCE_EVIDENCE"],
    );
  }

  const acceptanceSignals = decisionSignals.filter((evidence) => evidence.kind === "acceptance");
  if (acceptanceSignals.length > 0) {
    return resultFor(
      input,
      chronology,
      "explicit_acceptance_signal",
      acceptanceSignals.map((evidence) => evidence.evidenceId),
      ["EXPLICIT_PROVIDER_ACCEPTANCE_EVIDENCE"],
    );
  }

  if (declineSignals.length > 0) {
    return resultFor(
      input,
      chronology,
      "explicit_decline_signal",
      declineSignals.map((evidence) => evidence.evidenceId),
      ["EXPLICIT_PROVIDER_DECLINE_EVIDENCE"],
    );
  }

  return resultFor(
    input,
    chronology,
    "unresolved_no_explicit_signal",
    [],
    ["NO_EXPLICIT_PROVIDER_STATEMENT"],
  );
}
