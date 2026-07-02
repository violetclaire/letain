export type InquiryCoordinationVisibility = "operator" | "admin";

export type InquiryCoordinationState = {
  inquiryIdentity: {
    inquiryId: string;
    operatorId?: string | null;
    clientDisplay?: string | null;
    source?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  };
  requestContext: {
    eventDate?: string | null;
    location?: string | null;
    serviceType?: string | null;
    eventType?: string | null;
    partySize?: number | null;
    messageSummary?: string | null;
  };
  availabilityState: {
    datePresent: boolean;
    conflictSurfaced: boolean;
    conflictSource?: string | null;
    sourceOfTruthReviewRequired: boolean;
  };
  pricingInfoState: {
    ready: boolean;
    servicesAdded: boolean;
    textAdded: boolean;
    pdfReferenceAdded: boolean;
    reusableInfoEnabled: boolean;
  };
  coordinationPermission: {
    decision?: string | null;
    confidence?: string | number | null;
    riskFactors: string[];
    missingSignals: string[];
    recommendedNextAction?: string | null;
  };
  operatorReviewState: {
    required: boolean;
    latestReview?: string | null;
    checklist: string[];
    humanJudgmentRequired: boolean;
  };
  routeReadiness: {
    optionsExist: boolean;
    reachableOptions: number;
    incompleteOptions: number;
    draftCandidates: number;
  };
  routeEvidenceState: {
    routeOptionReviewed: boolean;
    latestEvidence?: string | null;
  };
  recoveryEvidenceState: {
    recoveryReviewed: boolean;
    lowRecoveryCapacity: boolean;
    missingRecoverySignal: boolean;
  };
  timelineState: {
    recordedEvents: number;
    currentStates: number;
    privateReviews: number;
    draftLinks: number;
  };
  scheduleDraftState: {
    exists: boolean;
    draftId?: string | null;
    linkedInquiryId?: string | null;
    contextStatus?: string | null;
    readinessStatus?: string | null;
  };
  sourceArtifacts: {
    durable: string[];
    inferredReadOnly: string[];
    operatorOnly: string[];
  };
  blockingIssues: string[];
  recommendedNextStep?: string | null;
  requiresHumanApproval: boolean;
  visibleTo: InquiryCoordinationVisibility[];
  lastUpdatedFromEvents?: string | null;
};

type InquirySource = {
  id: string;
  clientName?: string | null;
  clientEmail?: string | null;
  eventDate?: string | null;
  eventType?: string | null;
  eventLocation?: string | null;
  serviceType?: string | null;
  partySize?: number | null;
  message?: string | null;
  hasDateConflict?: boolean | null;
  conflictSource?: string | null;
  metadata?: { source?: string | null } | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ArtistProfileSource = {
  infoSheetEnabled?: boolean | null;
  infoSheetContent?: string | null;
  infoSheetPdfUrl?: string | null;
  pricingInfo?: string | null;
  plannerInfoSheet?: string | null;
  plannerPricing?: string | null;
} | null;

type NetworkMatchSource = {
  target?: {
    email?: string | null;
    phone?: string | null;
    active?: boolean | null;
  } | null;
};

type DraftCandidateSource = {
  id?: string | null;
};

type PermissionAssessmentSource = {
  decision?: string | null;
  confidence?: number | string | null;
  riskFactors?: string[] | null;
  missingSignals?: string[] | null;
  recommendedNextAction?: string | null;
  humanJudgmentRequired?: boolean | null;
  createdAt?: string | null;
};

type CoordinationEventSource = {
  eventType?: string | null;
  eventSource?: string | null;
  summary?: string | null;
  createdAt?: string | null;
};

type ScheduleDraftSource = {
  id?: string | null;
  inquiryId?: string | null;
  status?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
};

type InternalNoteSource = {
  id?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
} | null;

type DecisionSummarySource = {
  label?: string | null;
  reasons?: string[] | null;
  nextStep?: string | null;
} | null;

type ChecklistRowSource = {
  label?: string | null;
  status?: string | null;
  state?: string | null;
};

type TimelineEntrySource = {
  marker?: string | null;
};

export type InquiryCoordinationStateSource = {
  inquiry: InquirySource;
  operatorId?: string | null;
  artistProfile?: ArtistProfileSource;
  artistServices?: unknown[];
  networkMatches?: NetworkMatchSource[];
  draftCandidates?: DraftCandidateSource[];
  permissionAssessment?: PermissionAssessmentSource | null;
  coordinationEvents?: CoordinationEventSource[];
  scheduleDraft?: ScheduleDraftSource | null;
  internalNote?: InternalNoteSource;
  decisionSummary?: DecisionSummarySource;
  operatorReviewChecklistRows?: ChecklistRowSource[];
  timelineEntries?: TimelineEntrySource[];
};

function hasText(value?: string | null): value is string {
  return Boolean(value && value.trim().length > 0);
}

function list(values?: string[] | null): string[] {
  return Array.isArray(values) ? values.filter(hasText) : [];
}

function textAdded(profile: ArtistProfileSource): boolean {
  return Boolean(
    profile && (
      hasText(profile.infoSheetContent) ||
      hasText(profile.pricingInfo) ||
      hasText(profile.plannerInfoSheet) ||
      hasText(profile.plannerPricing)
    ),
  );
}

function latestByType(events: CoordinationEventSource[], eventType: string): CoordinationEventSource | null {
  return [...events]
    .filter((event) => event.eventType === eventType)
    .sort((a, b) => timestamp(b.createdAt) - timestamp(a.createdAt))[0] ?? null;
}

function timestamp(value?: string | null): number {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function latestDate(values: Array<string | null | undefined>): string | null {
  return values
    .filter(hasText)
    .sort((a, b) => timestamp(b) - timestamp(a))[0] ?? null;
}

function messageSummary(message?: string | null): string | null {
  if (!hasText(message)) return null;
  return message.trim().replace(/\s+/g, " ").slice(0, 180);
}

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter(hasText)));
}

function routeTargetIsReachable(match: NetworkMatchSource): boolean {
  const target = match.target;
  if (!target || target.active === false) return false;
  return hasText(target.email) || hasText(target.phone);
}

function routeTargetIsIncomplete(match: NetworkMatchSource): boolean {
  const target = match.target;
  if (!target || target.active === false) return false;
  return !hasText(target.email) && !hasText(target.phone);
}

function hasSignal(values: string[], expected: string): boolean {
  return values.some((value) => value.toLowerCase() === expected.toLowerCase());
}

function pricingReady(profile: ArtistProfileSource, services: unknown[]): boolean {
  if (!profile) return services.length > 0;
  return textAdded(profile) || hasText(profile.infoSheetPdfUrl) || services.length > 0;
}

export function buildInquiryCoordinationState({
  inquiry,
  operatorId,
  artistProfile = null,
  artistServices = [],
  networkMatches = [],
  draftCandidates = [],
  permissionAssessment = null,
  coordinationEvents = [],
  scheduleDraft = null,
  internalNote = null,
  decisionSummary = null,
  operatorReviewChecklistRows = [],
  timelineEntries = [],
}: InquiryCoordinationStateSource): InquiryCoordinationState {
  const servicesAdded = artistServices.length > 0;
  const pricingTextAdded = textAdded(artistProfile);
  const pdfReferenceAdded = Boolean(artistProfile && hasText(artistProfile.infoSheetPdfUrl));
  const reusableInfoEnabled = Boolean(artistProfile && artistProfile.infoSheetEnabled !== false);
  const riskFactors = list(permissionAssessment?.riskFactors);
  const missingSignals = list(permissionAssessment?.missingSignals);
  const routeReviewEvent = latestByType(coordinationEvents, "route_option_reviewed");
  const recoveryReviewEvent = latestByType(coordinationEvents, "recovery_coverage_reviewed");
  const operatorReviewEvent = latestByType(coordinationEvents, "operator_reviewed");
  const activeNetworkMatches = networkMatches.filter((match) => match.target?.active !== false);
  const reachableOptions = activeNetworkMatches.filter(routeTargetIsReachable).length;
  const incompleteOptions = activeNetworkMatches.filter(routeTargetIsIncomplete).length;
  const checklist = operatorReviewChecklistRows
    .map((row) => [row.label, row.status].filter(hasText).join(": "))
    .filter(hasText);
  const humanJudgmentRequired = Boolean(permissionAssessment?.humanJudgmentRequired);
  const decisionRequiresReview = decisionSummary?.label === "Needs operator review";
  const permissionRequiresReview = ["CLARIFY", "ESCALATE", "PROCEED_WITH_OVERSIGHT", "REROUTE", "STOP"]
    .includes(permissionAssessment?.decision ?? "");
  const requiresHumanApproval = humanJudgmentRequired || decisionRequiresReview || permissionRequiresReview;
  const routeOptionReviewed = Boolean(routeReviewEvent);
  const recoveryReviewed = Boolean(recoveryReviewEvent);
  const lowRecoveryCapacity = hasSignal(riskFactors, "LOW_RECOVERY_CAPACITY");
  const missingRecoverySignal = hasSignal(missingSignals, "Recovery provider confirmation");

  const blockingIssues = unique([
    hasText(inquiry.eventDate) ? null : "Event date missing",
    hasText(inquiry.serviceType) || hasText(inquiry.eventType) || hasText(inquiry.message) ? null : "Service context missing",
    inquiry.hasDateConflict ? inquiry.conflictSource || "Date conflict surfaced" : null,
    pricingReady(artistProfile, artistServices) ? null : "Pricing / Info Sheet not ready",
    ...riskFactors.map((risk) => `Risk factor: ${risk}`),
    ...missingSignals.map((signal) => `Missing signal: ${signal}`),
    ...operatorReviewChecklistRows
      .filter((row) => row.state === "needs-review")
      .map((row) => [row.label, row.status].filter(hasText).join(": ")),
  ]);

  return {
    inquiryIdentity: {
      inquiryId: inquiry.id,
      operatorId,
      clientDisplay: inquiry.clientName || inquiry.clientEmail || null,
      source: inquiry.metadata?.source ?? null,
      createdAt: inquiry.createdAt ?? null,
      updatedAt: inquiry.updatedAt ?? null,
    },
    requestContext: {
      eventDate: inquiry.eventDate ?? null,
      location: inquiry.eventLocation ?? null,
      serviceType: inquiry.serviceType ?? null,
      eventType: inquiry.eventType ?? null,
      partySize: inquiry.partySize ?? null,
      messageSummary: messageSummary(inquiry.message),
    },
    availabilityState: {
      datePresent: hasText(inquiry.eventDate),
      conflictSurfaced: Boolean(inquiry.hasDateConflict),
      conflictSource: inquiry.conflictSource ?? null,
      sourceOfTruthReviewRequired: true,
    },
    pricingInfoState: {
      ready: pricingReady(artistProfile, artistServices),
      servicesAdded,
      textAdded: pricingTextAdded,
      pdfReferenceAdded,
      reusableInfoEnabled,
    },
    coordinationPermission: {
      decision: permissionAssessment?.decision ?? null,
      confidence: permissionAssessment?.confidence ?? null,
      riskFactors,
      missingSignals,
      recommendedNextAction: permissionAssessment?.recommendedNextAction ?? null,
    },
    operatorReviewState: {
      required: requiresHumanApproval,
      latestReview: operatorReviewEvent?.summary ?? null,
      checklist,
      humanJudgmentRequired,
    },
    routeReadiness: {
      optionsExist: activeNetworkMatches.length > 0,
      reachableOptions,
      incompleteOptions,
      draftCandidates: draftCandidates.length,
    },
    routeEvidenceState: {
      routeOptionReviewed,
      latestEvidence: routeReviewEvent?.summary ?? null,
    },
    recoveryEvidenceState: {
      recoveryReviewed,
      lowRecoveryCapacity,
      missingRecoverySignal,
    },
    timelineState: {
      recordedEvents: timelineEntries.filter((entry) => entry.marker === "Recorded event").length,
      currentStates: timelineEntries.filter((entry) => entry.marker === "Current state").length,
      privateReviews: timelineEntries.filter((entry) => entry.marker === "Private review").length,
      draftLinks: timelineEntries.filter((entry) => entry.marker === "Draft linked").length,
    },
    scheduleDraftState: {
      exists: Boolean(scheduleDraft?.id),
      draftId: scheduleDraft?.id ?? null,
      linkedInquiryId: scheduleDraft?.inquiryId ?? null,
      contextStatus: scheduleDraft?.inquiryId ? "linked inquiry context" : scheduleDraft?.id ? "private draft without inquiry link" : null,
      readinessStatus: scheduleDraft?.status ?? null,
    },
    sourceArtifacts: {
      durable: unique([
        "inquiries",
        permissionAssessment ? "coordination_assessments" : null,
        coordinationEvents.length > 0 ? "coordination_events" : null,
        scheduleDraft?.id ? "schedule_drafts" : null,
        internalNote?.id ? "inquiry_internal_notes" : null,
      ]),
      inferredReadOnly: unique([
        "availabilityState from inquiry date/conflict fields",
        "pricingInfoState from loaded profile/services",
        "routeReadiness from loaded network matches",
        "timelineState from loaded private timeline entries",
        "blockingIssues from current read-only workspace state",
      ]),
      operatorOnly: unique([
        "operator review checklist",
        "private review log",
        "private route/recovery evidence log",
      ]),
    },
    blockingIssues,
    recommendedNextStep: permissionAssessment?.recommendedNextAction || decisionSummary?.nextStep || null,
    requiresHumanApproval,
    visibleTo: ["operator", "admin"],
    lastUpdatedFromEvents: latestDate([
      inquiry.updatedAt,
      inquiry.createdAt,
      permissionAssessment?.createdAt,
      ...coordinationEvents.map((event) => event.createdAt),
      scheduleDraft?.updatedAt,
      scheduleDraft?.createdAt,
      internalNote?.updatedAt,
      internalNote?.createdAt,
    ]),
  };
}
