import {
  PROVIDER_ACCEPTANCE_FORBIDDEN_ACTIONS,
  PROVIDER_ACCEPTANCE_STATES,
  type ProviderAcceptanceEvidenceAuthorType,
  type ProviderAcceptanceEvidenceKind,
  type ProviderAcceptanceState,
} from "./provider-acceptance-state-characterization";
import {
  buildPrivateProviderAcceptanceReview,
  validateProviderAcceptanceEvidenceBridgeInput,
  type ProviderAcceptanceCaptureSourceBasis,
  type ProviderAcceptanceEvidenceBridgeInput,
  type ProviderAcceptanceEvidenceCapture,
} from "./provider-acceptance-evidence-bridge";

export const PROVIDER_ACCEPTANCE_EVIDENCE_BRIDGE_FIXTURE_SUITE_VERSION =
  "provider-acceptance-evidence-bridge-fixture-suite-v1" as const;
export const PROVIDER_ACCEPTANCE_EVIDENCE_BRIDGE_CHARACTERIZED_AT = "2026-07-13T18:00:00Z";

type CaptureOverrides = Omit<Partial<ProviderAcceptanceEvidenceCapture>,
  "capturedBy" | "claimedOriginalAuthor" | "sourceArtifact"
> & {
  capturedBy?: Partial<ProviderAcceptanceEvidenceCapture["capturedBy"]>;
  claimedOriginalAuthor?: Partial<ProviderAcceptanceEvidenceCapture["claimedOriginalAuthor"]>;
  sourceArtifact?: Partial<ProviderAcceptanceEvidenceCapture["sourceArtifact"]>;
};

function defaultAuthorType(sourceBasis: ProviderAcceptanceCaptureSourceBasis): ProviderAcceptanceEvidenceAuthorType {
  if (sourceBasis === "direct_provider_message") return "provider";
  if (sourceBasis === "client_message") return "client";
  return "operator";
}

function capture(
  captureId: string,
  sourceBasis: ProviderAcceptanceCaptureSourceBasis,
  signalKind: ProviderAcceptanceEvidenceKind,
  statement: string,
  overrides: CaptureOverrides = {},
): ProviderAcceptanceEvidenceCapture {
  const authorType = defaultAuthorType(sourceBasis);
  return {
    captureId,
    sourceTraceId: "assigned-by-input",
    contextVersion: "terms-v1",
    signalKind,
    statement,
    originalAuthoredAt: "2026-07-12T08:00:00Z",
    capturedAt: "2026-07-12T09:00:00Z",
    sourceBasis,
    ...overrides,
    capturedBy: {
      authorType: "operator",
      authorId: "synthetic-operator",
      ...overrides.capturedBy,
    },
    claimedOriginalAuthor: {
      authorType,
      authorId: authorType === "provider" ? "synthetic-provider" : `synthetic-${authorType}`,
      ...overrides.claimedOriginalAuthor,
    },
    sourceArtifact: {
      artifactId: `synthetic-artifact-${captureId}`,
      channel: sourceBasis === "direct_provider_message" ? "manual_message_copy" : sourceBasis,
      ...overrides.sourceArtifact,
    },
  };
}

function input(
  sourceTraceId: string,
  captures: ProviderAcceptanceEvidenceCapture[],
  currentContextVersion = "terms-v1",
): ProviderAcceptanceEvidenceBridgeInput {
  return {
    sourceTraceId,
    characterizedAt: PROVIDER_ACCEPTANCE_EVIDENCE_BRIDGE_CHARACTERIZED_AT,
    currentContextVersion,
    captures: captures.map((item) => ({ ...item, sourceTraceId })),
  };
}

export type ProviderAcceptanceEvidenceBridgeFixture = {
  fixtureId: string;
  description: string;
  synthetic: true;
  redacted: true;
  input: ProviderAcceptanceEvidenceBridgeInput;
  expectedValidation: "valid" | "invalid";
  expectedState?: ProviderAcceptanceState;
  expectedIssue?: string;
};

export const providerAcceptanceEvidenceBridgeFixtures: ProviderAcceptanceEvidenceBridgeFixture[] = [
  {
    fixtureId: "bridge-direct-provider-acceptance",
    description: "A copied direct provider acceptance becomes unauthenticated evidence, never authority.",
    synthetic: true,
    redacted: true,
    expectedValidation: "valid",
    expectedState: "explicit_acceptance_signal",
    input: input("trace-bridge-direct-provider-acceptance", [
      capture(
        "capture-direct-acceptance",
        "direct_provider_message",
        "acceptance",
        "I can take the stated scope and timing.",
      ),
    ]),
  },
  {
    fixtureId: "bridge-direct-provider-decline",
    description: "A copied direct provider decline remains a decline evidence signal.",
    synthetic: true,
    redacted: true,
    expectedValidation: "valid",
    expectedState: "explicit_decline_signal",
    input: input("trace-bridge-direct-provider-decline", [
      capture(
        "capture-direct-decline",
        "direct_provider_message",
        "decline",
        "I cannot take this scope.",
      ),
    ]),
  },
  {
    fixtureId: "bridge-direct-conditional-acceptance",
    description: "A copied conditional provider response preserves its condition.",
    synthetic: true,
    redacted: true,
    expectedValidation: "valid",
    expectedState: "conditional_acceptance_signal",
    input: input("trace-bridge-direct-conditional", [
      capture(
        "capture-direct-conditional",
        "direct_provider_message",
        "conditional_acceptance",
        "I can take this if the start remains 8:00 AM.",
        { conditions: ["Start remains 8:00 AM"] },
      ),
    ]),
  },
  {
    fixtureId: "bridge-direct-provider-withdrawal",
    description: "A later copied provider withdrawal supersedes the earlier provider statement.",
    synthetic: true,
    redacted: true,
    expectedValidation: "valid",
    expectedState: "withdrawn_or_superseded_signal",
    input: input("trace-bridge-direct-withdrawal", [
      capture(
        "capture-before-withdrawal",
        "direct_provider_message",
        "acceptance",
        "I can take the original scope.",
      ),
      capture(
        "capture-provider-withdrawal",
        "direct_provider_message",
        "withdrawal",
        "I am withdrawing my earlier response.",
        {
          originalAuthoredAt: "2026-07-12T10:00:00Z",
          capturedAt: "2026-07-12T10:15:00Z",
          supersedesCaptureIds: ["capture-before-withdrawal"],
        },
      ),
    ]),
  },
  {
    fixtureId: "bridge-conflicting-direct-provider-messages",
    description: "Conflicting copied provider statements remain conflicting.",
    synthetic: true,
    redacted: true,
    expectedValidation: "valid",
    expectedState: "conflicting_provider_signals",
    input: input("trace-bridge-conflicting-provider-messages", [
      capture(
        "capture-conflict-acceptance",
        "direct_provider_message",
        "acceptance",
        "I can take the scope.",
      ),
      capture(
        "capture-conflict-decline",
        "direct_provider_message",
        "decline",
        "I cannot take the scope.",
        {
          originalAuthoredAt: "2026-07-12T10:00:00Z",
          capturedAt: "2026-07-12T10:10:00Z",
        },
      ),
    ]),
  },
  {
    fixtureId: "bridge-acceptance-relevant-material-change",
    description: "A relevant later material change makes copied acceptance stale.",
    synthetic: true,
    redacted: true,
    expectedValidation: "valid",
    expectedState: "stale_signal_requires_review",
    input: input(
      "trace-bridge-relevant-material-change",
      [
        capture(
          "capture-acceptance-before-change",
          "direct_provider_message",
          "acceptance",
          "I can take the original timing and scope.",
        ),
        capture(
          "capture-relevant-material-change",
          "material_context_change",
          "material_context_change",
          "The required timing and scope materially changed.",
          {
            contextVersion: "terms-v2",
            originalAuthoredAt: "2026-07-12T10:00:00Z",
            capturedAt: "2026-07-12T10:10:00Z",
          },
        ),
      ],
      "terms-v2",
    ),
  },
  {
    fixtureId: "bridge-acceptance-unrelated-material-change",
    description: "An unrelated context change does not stale current copied acceptance.",
    synthetic: true,
    redacted: true,
    expectedValidation: "valid",
    expectedState: "explicit_acceptance_signal",
    input: input(
      "trace-bridge-unrelated-material-change",
      [
        capture(
          "capture-current-context-acceptance",
          "direct_provider_message",
          "acceptance",
          "I can take the current scope.",
          { contextVersion: "terms-v2" },
        ),
        capture(
          "capture-unrelated-context-change",
          "material_context_change",
          "material_context_change",
          "An older unrelated context changed.",
          {
            contextVersion: "terms-v1",
            originalAuthoredAt: "2026-07-12T10:00:00Z",
            capturedAt: "2026-07-12T10:10:00Z",
          },
        ),
      ],
      "terms-v2",
    ),
  },
  {
    fixtureId: "bridge-operator-claims-provider-accepted",
    description: "An operator claim containing acceptance language remains non-provider context.",
    synthetic: true,
    redacted: true,
    expectedValidation: "valid",
    expectedState: "unresolved_no_explicit_signal",
    input: input("trace-bridge-operator-claim", [
      capture(
        "capture-operator-claim",
        "operator_note",
        "acceptance",
        "The operator says the provider accepted and confirmed yes.",
      ),
    ]),
  },
  {
    fixtureId: "bridge-client-claims-provider-accepted",
    description: "A client claim containing acceptance language remains non-provider context.",
    synthetic: true,
    redacted: true,
    expectedValidation: "valid",
    expectedState: "unresolved_no_explicit_signal",
    input: input("trace-bridge-client-claim", [
      capture(
        "capture-client-claim",
        "client_message",
        "acceptance",
        "The client says the provider accepted and confirmed yes.",
      ),
    ]),
  },
  {
    fixtureId: "bridge-route-status-accepted",
    description: "An accepted route status without direct-message provenance remains route state only.",
    synthetic: true,
    redacted: true,
    expectedValidation: "valid",
    expectedState: "unresolved_no_explicit_signal",
    input: input("trace-bridge-route-status", [
      capture(
        "capture-route-status-accepted",
        "route_record",
        "acceptance",
        "The private route record status is accepted.",
      ),
    ]),
  },
  {
    fixtureId: "bridge-schedule-placement",
    description: "Private schedule placement remains schedule context only.",
    synthetic: true,
    redacted: true,
    expectedValidation: "valid",
    expectedState: "unresolved_no_explicit_signal",
    input: input("trace-bridge-schedule-placement", [
      capture(
        "capture-schedule-placement",
        "schedule_record",
        "schedule_placement",
        "The provider appears in a private draft schedule lane.",
      ),
    ]),
  },
  {
    fixtureId: "bridge-availability-context",
    description: "Stated availability remains context and not provider acceptance.",
    synthetic: true,
    redacted: true,
    expectedValidation: "valid",
    expectedState: "unresolved_no_explicit_signal",
    input: input("trace-bridge-availability", [
      capture(
        "capture-availability-context",
        "availability_context",
        "availability",
        "The date appears open in private availability context.",
      ),
    ]),
  },
  {
    fixtureId: "bridge-invitation-without-response",
    description: "An invitation without a provider response remains unresolved.",
    synthetic: true,
    redacted: true,
    expectedValidation: "valid",
    expectedState: "unresolved_no_explicit_signal",
    input: input("trace-bridge-invitation", [
      capture(
        "capture-invitation",
        "invitation_record",
        "invitation_sent",
        "An invitation was recorded without a provider response.",
      ),
    ]),
  },
  {
    fixtureId: "bridge-relationship-prior-history",
    description: "Relationship and prior-work context remain non-authoritative.",
    synthetic: true,
    redacted: true,
    expectedValidation: "valid",
    expectedState: "unresolved_no_explicit_signal",
    input: input("trace-bridge-relationship", [
      capture(
        "capture-prior-history",
        "relationship_context",
        "prior_work_history",
        "The provider completed prior contracted work.",
      ),
    ]),
  },
  {
    fixtureId: "bridge-commercial-context",
    description: "Contract, invoice, and payment context remain non-authoritative.",
    synthetic: true,
    redacted: true,
    expectedValidation: "valid",
    expectedState: "unresolved_no_explicit_signal",
    input: input("trace-bridge-commercial", [
      capture(
        "capture-commercial-context",
        "commercial_context",
        "payment_contract_context",
        "Private contract, invoice, and payment context exists.",
      ),
    ]),
  },
  {
    fixtureId: "bridge-non-provider-supersession-attempt",
    description: "A later operator note cannot supersede copied provider voice.",
    synthetic: true,
    redacted: true,
    expectedValidation: "valid",
    expectedState: "explicit_acceptance_signal",
    input: input("trace-bridge-non-provider-supersession", [
      capture(
        "capture-provider-before-operator-note",
        "direct_provider_message",
        "acceptance",
        "I can take this scope.",
      ),
      capture(
        "capture-operator-supersession-claim",
        "operator_note",
        "decline",
        "Operator note claims the provider response was replaced.",
        {
          originalAuthoredAt: "2026-07-12T10:00:00Z",
          capturedAt: "2026-07-12T10:10:00Z",
          supersedesCaptureIds: ["capture-provider-before-operator-note"],
        },
      ),
    ]),
  },
  {
    fixtureId: "bridge-malformed-missing-provider-identity",
    description: "A direct-message capture without claimed provider identity fails closed.",
    synthetic: true,
    redacted: true,
    expectedValidation: "invalid",
    expectedIssue: "claimed original author identity is required",
    input: input("trace-bridge-missing-provider-id", [
      capture(
        "capture-missing-provider-id",
        "direct_provider_message",
        "acceptance",
        "I can take this scope.",
        { claimedOriginalAuthor: { authorId: "" } },
      ),
    ]),
  },
  {
    fixtureId: "bridge-malformed-missing-original-timestamp",
    description: "A direct-message capture without original authored time fails closed.",
    synthetic: true,
    redacted: true,
    expectedValidation: "invalid",
    expectedIssue: "originalAuthoredAt must be a fixed ISO timestamp",
    input: input("trace-bridge-missing-original-time", [
      capture(
        "capture-missing-original-time",
        "direct_provider_message",
        "acceptance",
        "I can take this scope.",
        { originalAuthoredAt: "" },
      ),
    ]),
  },
  {
    fixtureId: "bridge-malformed-missing-context-version",
    description: "A capture without context version fails closed.",
    synthetic: true,
    redacted: true,
    expectedValidation: "invalid",
    expectedIssue: "contextVersion is required",
    input: input("trace-bridge-missing-context", [
      capture(
        "capture-missing-context",
        "direct_provider_message",
        "acceptance",
        "I can take this scope.",
        { contextVersion: "" },
      ),
    ]),
  },
  {
    fixtureId: "bridge-malformed-conditional-without-conditions",
    description: "Conditional acceptance without conditions fails closed.",
    synthetic: true,
    redacted: true,
    expectedValidation: "invalid",
    expectedIssue: "conditional acceptance requires conditions",
    input: input("trace-bridge-conditional-no-conditions", [
      capture(
        "capture-conditional-no-conditions",
        "direct_provider_message",
        "conditional_acceptance",
        "I can take this conditionally.",
      ),
    ]),
  },
];

export type ProviderAcceptanceEvidenceBridgeFixtureFailure = {
  fixtureId: string;
  stage: "validation" | "normalization" | "characterization" | "authority_boundary";
  issues: string[];
};

export type ProviderAcceptanceEvidenceBridgeFixtureSuiteResult = {
  suiteVersion: typeof PROVIDER_ACCEPTANCE_EVIDENCE_BRIDGE_FIXTURE_SUITE_VERSION;
  totalFixtures: number;
  validFixtures: number;
  invalidFixtures: number;
  passed: number;
  failed: number;
  failures: ProviderAcceptanceEvidenceBridgeFixtureFailure[];
  sourceTraceIds: string[];
  statesCovered: ProviderAcceptanceState[];
  authorityBoundaryPreserved: boolean;
};

export function runProviderAcceptanceEvidenceBridgeFixtureSuite(): ProviderAcceptanceEvidenceBridgeFixtureSuiteResult {
  const failures: ProviderAcceptanceEvidenceBridgeFixtureFailure[] = [];
  const statesCovered: ProviderAcceptanceState[] = [];
  const sourceTraceIds: string[] = [];
  let passed = 0;

  for (const fixture of providerAcceptanceEvidenceBridgeFixtures) {
    sourceTraceIds.push(fixture.input.sourceTraceId);
    const validation = validateProviderAcceptanceEvidenceBridgeInput(fixture.input);

    if (fixture.expectedValidation === "invalid") {
      if (validation.valid || !validation.issues.some((issue) => issue.includes(fixture.expectedIssue ?? ""))) {
        failures.push({
          fixtureId: fixture.fixtureId,
          stage: "validation",
          issues: validation.valid ? ["expected validation failure"] : validation.issues,
        });
      } else {
        passed += 1;
      }
      continue;
    }

    if (!validation.valid) {
      failures.push({ fixtureId: fixture.fixtureId, stage: "validation", issues: validation.issues });
      continue;
    }

    let review;
    try {
      review = buildPrivateProviderAcceptanceReview(fixture.input);
    } catch (error) {
      failures.push({
        fixtureId: fixture.fixtureId,
        stage: "normalization",
        issues: [error instanceof Error ? error.message : "unknown normalization failure"],
      });
      continue;
    }

    if (review.characterization.state !== fixture.expectedState) {
      failures.push({
        fixtureId: fixture.fixtureId,
        stage: "characterization",
        issues: [`expected ${fixture.expectedState}, received ${review.characterization.state}`],
      });
      continue;
    }

    const exactForbiddenActions =
      JSON.stringify(review.forbiddenActions) === JSON.stringify([...PROVIDER_ACCEPTANCE_FORBIDDEN_ACTIONS]) &&
      JSON.stringify(review.forbiddenActions) === JSON.stringify(review.characterization.forbiddenActions);
    if (
      !review.evidenceOnly ||
      !review.requiresHumanReview ||
      !review.provenanceRequiresHumanReview ||
      review.authorshipAuthenticated ||
      review.grantsRuntimeAuthority ||
      review.allowedActions.length > 0 ||
      !review.characterization.evidenceOnly ||
      !review.characterization.requiresHumanReview ||
      review.characterization.grantsRuntimeAuthority ||
      review.characterization.allowedActions.length > 0 ||
      !exactForbiddenActions ||
      review.visibleTo.join(",") !== "operator,admin"
    ) {
      failures.push({
        fixtureId: fixture.fixtureId,
        stage: "authority_boundary",
        issues: ["private provider evidence bridge granted or implied runtime authority"],
      });
      continue;
    }

    statesCovered.push(review.characterization.state);
    passed += 1;
  }

  return {
    suiteVersion: PROVIDER_ACCEPTANCE_EVIDENCE_BRIDGE_FIXTURE_SUITE_VERSION,
    totalFixtures: providerAcceptanceEvidenceBridgeFixtures.length,
    validFixtures: providerAcceptanceEvidenceBridgeFixtures.filter(
      (fixture) => fixture.expectedValidation === "valid",
    ).length,
    invalidFixtures: providerAcceptanceEvidenceBridgeFixtures.filter(
      (fixture) => fixture.expectedValidation === "invalid",
    ).length,
    passed,
    failed: failures.length,
    failures,
    sourceTraceIds: Array.from(new Set(sourceTraceIds)),
    statesCovered: PROVIDER_ACCEPTANCE_STATES.filter((state) => statesCovered.includes(state)),
    authorityBoundaryPreserved: failures.every((failure) => failure.stage !== "authority_boundary"),
  };
}
