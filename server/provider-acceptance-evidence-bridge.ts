import {
  PROVIDER_ACCEPTANCE_EVIDENCE_KINDS,
  PROVIDER_ACCEPTANCE_FORBIDDEN_ACTIONS,
  characterizeProviderAcceptanceState,
  type ProviderAcceptanceEvidence,
  type ProviderAcceptanceEvidenceAuthorType,
  type ProviderAcceptanceEvidenceKind,
  type ProviderAcceptanceEvidenceSource,
  type ProviderAcceptanceStateCharacterizationInput,
  type ProviderAcceptanceStateCharacterizationResult,
} from "./provider-acceptance-state-characterization";

export const PROVIDER_ACCEPTANCE_EVIDENCE_BRIDGE_VERSION =
  "provider-acceptance-evidence-bridge-v1" as const;

export const PROVIDER_ACCEPTANCE_CAPTURE_SOURCE_BASES = [
  "direct_provider_message",
  "operator_note",
  "client_message",
  "route_record",
  "schedule_record",
  "invitation_record",
  "availability_context",
  "relationship_context",
  "commercial_context",
  "material_context_change",
] as const;

export type ProviderAcceptanceCaptureSourceBasis =
  typeof PROVIDER_ACCEPTANCE_CAPTURE_SOURCE_BASES[number];

export type ProviderAcceptanceEvidenceCapture = {
  captureId: string;
  sourceTraceId: string;
  contextVersion: string;
  signalKind: ProviderAcceptanceEvidenceKind;
  statement: string;
  originalAuthoredAt: string;
  capturedAt: string;
  capturedBy: {
    authorType: "operator";
    authorId: string;
  };
  claimedOriginalAuthor: {
    authorType: ProviderAcceptanceEvidenceAuthorType;
    authorId: string;
  };
  sourceArtifact: {
    artifactId: string;
    channel: string;
  };
  sourceBasis: ProviderAcceptanceCaptureSourceBasis;
  conditions?: string[];
  supersedesCaptureIds?: string[];
};

export type ProviderAcceptanceEvidenceBridgeInput = {
  sourceTraceId: string;
  subjectProviderId: string;
  characterizedAt: string;
  currentContextVersion: string;
  captures: ProviderAcceptanceEvidenceCapture[];
};

export type ProviderAcceptanceEvidenceBridgeValidationResult = {
  valid: boolean;
  issues: string[];
};

export class ProviderAcceptanceEvidenceBridgeValidationError extends Error {
  issues: string[];

  constructor(issues: string[]) {
    super(`Invalid private provider evidence capture: ${issues.join("; ")}`);
    this.name = "ProviderAcceptanceEvidenceBridgeValidationError";
    this.issues = issues;
  }
}

export type ProviderAcceptanceEvidenceBridgeReasonCode =
  | "DIRECT_PROVIDER_MESSAGE_CAPTURED_WITH_UNAUTHENTICATED_AUTHORSHIP"
  | "NON_PROVIDER_CONTEXT_PRESERVED"
  | "MATERIAL_CONTEXT_CHANGE_PRESERVED";

export type ProviderAcceptanceEvidenceBridgeReason = {
  captureId: string;
  code: ProviderAcceptanceEvidenceBridgeReasonCode;
  detail: string;
};

export type ProviderAcceptanceCaptureProvenance = {
  captureId: string;
  subjectProviderId: string;
  originalAuthoredAt: string;
  capturedAt: string;
  capturedByOperatorId: string;
  claimedOriginalAuthor: ProviderAcceptanceEvidenceCapture["claimedOriginalAuthor"];
  sourceArtifact: ProviderAcceptanceEvidenceCapture["sourceArtifact"];
  sourceBasis: ProviderAcceptanceCaptureSourceBasis;
  authorshipAuthenticated: false;
};

export type PrivateProviderAcceptanceReviewResult = {
  bridgeVersion: typeof PROVIDER_ACCEPTANCE_EVIDENCE_BRIDGE_VERSION;
  sourceTraceId: string;
  subjectProviderId: string;
  normalizedCharacterizationInput: ProviderAcceptanceStateCharacterizationInput;
  characterization: ProviderAcceptanceStateCharacterizationResult;
  captureChronology: ProviderAcceptanceEvidenceCapture[];
  captureProvenance: ProviderAcceptanceCaptureProvenance[];
  normalizationReasons: ProviderAcceptanceEvidenceBridgeReason[];
  visibleTo: ["operator", "admin"];
  evidenceOnly: true;
  requiresHumanReview: true;
  provenanceRequiresHumanReview: true;
  authorshipAuthenticated: false;
  grantsRuntimeAuthority: false;
  allowedActions: [];
  forbiddenActions: typeof PROVIDER_ACCEPTANCE_FORBIDDEN_ACTIONS[number][];
};

const isoTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const evidenceAuthorTypes: ProviderAcceptanceEvidenceAuthorType[] = [
  "provider",
  "operator",
  "client",
  "system",
];

const sourceForBasis: Record<ProviderAcceptanceCaptureSourceBasis, ProviderAcceptanceEvidenceSource> = {
  direct_provider_message: "provider_message",
  operator_note: "operator_note",
  client_message: "client_message",
  route_record: "route_record",
  schedule_record: "schedule_draft",
  invitation_record: "invitation_record",
  availability_context: "route_record",
  relationship_context: "relationship_record",
  commercial_context: "commercial_record",
  material_context_change: "material_context",
};

function hasText(value: string | null | undefined): value is string {
  return Boolean(value && value.trim().length > 0);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(hasText)));
}

function cloneCapture(capture: ProviderAcceptanceEvidenceCapture): ProviderAcceptanceEvidenceCapture {
  return {
    ...capture,
    capturedBy: { ...capture.capturedBy },
    claimedOriginalAuthor: { ...capture.claimedOriginalAuthor },
    sourceArtifact: { ...capture.sourceArtifact },
    ...(capture.conditions ? { conditions: [...capture.conditions] } : {}),
    ...(capture.supersedesCaptureIds
      ? { supersedesCaptureIds: [...capture.supersedesCaptureIds] }
      : {}),
  };
}

function sortByCapturedAt(captures: ProviderAcceptanceEvidenceCapture[]): ProviderAcceptanceEvidenceCapture[] {
  return [...captures].sort(
    (left, right) =>
      left.capturedAt.localeCompare(right.capturedAt) || left.captureId.localeCompare(right.captureId),
  );
}

function sortByOriginalAuthoredAt(
  captures: ProviderAcceptanceEvidenceCapture[],
): ProviderAcceptanceEvidenceCapture[] {
  return [...captures].sort(
    (left, right) =>
      left.originalAuthoredAt.localeCompare(right.originalAuthoredAt) ||
      left.captureId.localeCompare(right.captureId),
  );
}

function validateBasisAuthor(capture: ProviderAcceptanceEvidenceCapture, issues: string[]): void {
  const captureId = capture.captureId || "unknown";
  if (
    capture.sourceBasis === "direct_provider_message" &&
    capture.claimedOriginalAuthor?.authorType !== "provider"
  ) {
    issues.push(`direct provider message requires claimed provider authorship: ${captureId}`);
  }
  if (
    capture.sourceBasis === "operator_note" &&
    capture.claimedOriginalAuthor?.authorType !== "operator"
  ) {
    issues.push(`operator note requires claimed operator authorship: ${captureId}`);
  }
  if (
    capture.sourceBasis === "client_message" &&
    capture.claimedOriginalAuthor?.authorType !== "client"
  ) {
    issues.push(`client message requires claimed client authorship: ${captureId}`);
  }
}

export function validateProviderAcceptanceEvidenceBridgeInput(
  input: ProviderAcceptanceEvidenceBridgeInput,
): ProviderAcceptanceEvidenceBridgeValidationResult {
  const issues: string[] = [];
  const capturesById = new Map<string, ProviderAcceptanceEvidenceCapture>();

  if (!hasText(input.sourceTraceId)) issues.push("sourceTraceId is required");
  if (!hasText(input.subjectProviderId)) issues.push("subjectProviderId is required");
  if (!isoTimestampPattern.test(input.characterizedAt)) {
    issues.push("characterizedAt must be a fixed ISO timestamp");
  }
  if (!hasText(input.currentContextVersion)) issues.push("currentContextVersion is required");
  if (!Array.isArray(input.captures) || input.captures.length === 0) issues.push("captures are required");

  for (const capture of input.captures ?? []) {
    const captureId = capture.captureId || "unknown";
    if (!hasText(capture.captureId)) {
      issues.push("captureId is required");
    } else if (capturesById.has(capture.captureId)) {
      issues.push(`duplicate captureId: ${capture.captureId}`);
    } else {
      capturesById.set(capture.captureId, capture);
    }

    if (!hasText(capture.sourceTraceId)) {
      issues.push(`capture sourceTraceId is required: ${captureId}`);
    } else if (capture.sourceTraceId !== input.sourceTraceId) {
      issues.push(`capture sourceTraceId must match bridge sourceTraceId: ${captureId}`);
    }
    if (!hasText(capture.contextVersion)) issues.push(`contextVersion is required: ${captureId}`);
    if (!hasText(capture.statement)) issues.push(`statement is required: ${captureId}`);
    if (!PROVIDER_ACCEPTANCE_EVIDENCE_KINDS.includes(capture.signalKind)) {
      issues.push(`signalKind is invalid: ${captureId}`);
    }
    if (!isoTimestampPattern.test(capture.originalAuthoredAt)) {
      issues.push(`originalAuthoredAt must be a fixed ISO timestamp: ${captureId}`);
    }
    if (!isoTimestampPattern.test(capture.capturedAt)) {
      issues.push(`capturedAt must be a fixed ISO timestamp: ${captureId}`);
    }
    if (
      isoTimestampPattern.test(capture.originalAuthoredAt) &&
      isoTimestampPattern.test(capture.capturedAt) &&
      capture.capturedAt < capture.originalAuthoredAt
    ) {
      issues.push(`capturedAt cannot precede originalAuthoredAt: ${captureId}`);
    }
    if (
      isoTimestampPattern.test(input.characterizedAt) &&
      isoTimestampPattern.test(capture.originalAuthoredAt) &&
      capture.originalAuthoredAt > input.characterizedAt
    ) {
      issues.push(`originalAuthoredAt cannot occur after characterizedAt: ${captureId}`);
    }
    if (
      isoTimestampPattern.test(input.characterizedAt) &&
      isoTimestampPattern.test(capture.capturedAt) &&
      capture.capturedAt > input.characterizedAt
    ) {
      issues.push(`capturedAt cannot occur after characterizedAt: ${captureId}`);
    }
    if (capture.capturedBy?.authorType !== "operator") {
      issues.push(`capturedBy authorType must be operator: ${captureId}`);
    }
    if (!hasText(capture.capturedBy?.authorId)) {
      issues.push(`capturedBy operator identity is required: ${captureId}`);
    }
    if (!hasText(capture.claimedOriginalAuthor?.authorType)) {
      issues.push(`claimed original author type is required: ${captureId}`);
    } else if (!evidenceAuthorTypes.includes(capture.claimedOriginalAuthor.authorType)) {
      issues.push(`claimed original author type is invalid: ${captureId}`);
    }
    if (!hasText(capture.claimedOriginalAuthor?.authorId)) {
      issues.push(`claimed original author identity is required: ${captureId}`);
    }
    if (
      capture.sourceBasis === "direct_provider_message" &&
      hasText(input.subjectProviderId) &&
      hasText(capture.claimedOriginalAuthor?.authorId) &&
      capture.claimedOriginalAuthor.authorId !== input.subjectProviderId
    ) {
      issues.push(`direct provider author must match subjectProviderId: ${captureId}`);
    }
    if (!PROVIDER_ACCEPTANCE_CAPTURE_SOURCE_BASES.includes(capture.sourceBasis)) {
      issues.push(`sourceBasis is invalid: ${captureId}`);
    }
    if (!hasText(capture.sourceArtifact?.artifactId)) {
      issues.push(`source artifact is required: ${captureId}`);
    }
    if (!hasText(capture.sourceArtifact?.channel)) {
      issues.push(`source channel is required: ${captureId}`);
    }
    const nonEmptyConditions = unique(capture.conditions ?? []);
    if ((capture.conditions ?? []).some((condition) => !hasText(condition))) {
      issues.push(`conditions must contain non-empty values: ${captureId}`);
    }
    if (capture.signalKind === "conditional_acceptance" && nonEmptyConditions.length === 0) {
      issues.push(`conditional acceptance requires conditions: ${captureId}`);
    }
    if (capture.signalKind === "acceptance" && nonEmptyConditions.length > 0) {
      issues.push(`acceptance with conditions must be labeled conditional_acceptance: ${captureId}`);
    }
    if ((capture.supersedesCaptureIds ?? []).includes(capture.captureId)) {
      issues.push(`capture cannot supersede itself: ${captureId}`);
    }
    validateBasisAuthor(capture, issues);
  }

  for (const capture of input.captures ?? []) {
    for (const supersededId of capture.supersedesCaptureIds ?? []) {
      const superseded = capturesById.get(supersededId);
      if (!superseded) {
        issues.push(`unknown superseded captureId: ${supersededId}`);
      } else if (capture.originalAuthoredAt <= superseded.originalAuthoredAt) {
        issues.push(`superseding capture must be authored later: ${capture.captureId} -> ${supersededId}`);
      }
    }
  }

  return { valid: issues.length === 0, issues };
}

function normalizeCapture(capture: ProviderAcceptanceEvidenceCapture): ProviderAcceptanceEvidence {
  return {
    evidenceId: capture.captureId,
    authoredAt: capture.originalAuthoredAt,
    authorType: capture.claimedOriginalAuthor.authorType,
    authorId: capture.claimedOriginalAuthor.authorId,
    source: sourceForBasis[capture.sourceBasis],
    kind: capture.signalKind,
    statement: capture.statement,
    contextVersion: capture.contextVersion,
    ...(capture.conditions ? { conditions: [...capture.conditions] } : {}),
    ...(capture.supersedesCaptureIds
      ? { supersedesEvidenceIds: [...capture.supersedesCaptureIds] }
      : {}),
  };
}

function reasonForCapture(capture: ProviderAcceptanceEvidenceCapture): ProviderAcceptanceEvidenceBridgeReason {
  if (capture.sourceBasis === "direct_provider_message") {
    return {
      captureId: capture.captureId,
      code: "DIRECT_PROVIDER_MESSAGE_CAPTURED_WITH_UNAUTHENTICATED_AUTHORSHIP",
      detail:
        "The operator preserved this as a direct provider message, but the claimed authorship is not independently authenticated.",
    };
  }
  if (capture.sourceBasis === "material_context_change") {
    return {
      captureId: capture.captureId,
      code: "MATERIAL_CONTEXT_CHANGE_PRESERVED",
      detail: "The material context record is preserved for staleness review and does not become provider voice.",
    };
  }
  return {
    captureId: capture.captureId,
    code: "NON_PROVIDER_CONTEXT_PRESERVED",
    detail: "The capture is preserved as private context and cannot become provider-authored acceptance evidence.",
  };
}

export function buildPrivateProviderAcceptanceReview(
  input: ProviderAcceptanceEvidenceBridgeInput,
): PrivateProviderAcceptanceReviewResult {
  const validation = validateProviderAcceptanceEvidenceBridgeInput(input);
  if (!validation.valid) throw new ProviderAcceptanceEvidenceBridgeValidationError(validation.issues);

  const authoredChronology = sortByOriginalAuthoredAt(input.captures);
  const normalizedCharacterizationInput: ProviderAcceptanceStateCharacterizationInput = {
    sourceTraceId: input.sourceTraceId,
    characterizedAt: input.characterizedAt,
    currentContextVersion: input.currentContextVersion,
    evidence: authoredChronology.map(normalizeCapture),
  };
  const characterization = characterizeProviderAcceptanceState(normalizedCharacterizationInput);
  const captureChronology = sortByCapturedAt(input.captures).map(cloneCapture);

  return {
    bridgeVersion: PROVIDER_ACCEPTANCE_EVIDENCE_BRIDGE_VERSION,
    sourceTraceId: input.sourceTraceId,
    subjectProviderId: input.subjectProviderId,
    normalizedCharacterizationInput,
    characterization,
    captureChronology,
    captureProvenance: captureChronology.map((capture) => ({
      captureId: capture.captureId,
      subjectProviderId: input.subjectProviderId,
      originalAuthoredAt: capture.originalAuthoredAt,
      capturedAt: capture.capturedAt,
      capturedByOperatorId: capture.capturedBy.authorId,
      claimedOriginalAuthor: { ...capture.claimedOriginalAuthor },
      sourceArtifact: { ...capture.sourceArtifact },
      sourceBasis: capture.sourceBasis,
      authorshipAuthenticated: false,
    })),
    normalizationReasons: authoredChronology.map(reasonForCapture),
    visibleTo: ["operator", "admin"],
    evidenceOnly: characterization.evidenceOnly,
    requiresHumanReview: characterization.requiresHumanReview,
    provenanceRequiresHumanReview: true,
    authorshipAuthenticated: false,
    grantsRuntimeAuthority: characterization.grantsRuntimeAuthority,
    allowedActions: characterization.allowedActions,
    forbiddenActions: [...characterization.forbiddenActions],
  };
}
