import {
  PROVIDER_ACCEPTANCE_STATES,
  characterizeProviderAcceptanceState,
  validateProviderAcceptanceStateInput,
  type ProviderAcceptanceState,
  type ProviderAcceptanceStateCharacterizationInput,
  type ProviderAcceptanceStateCharacterizationResult,
} from "./provider-acceptance-state-characterization";

export const PROVIDER_ACCEPTANCE_STATE_FIXTURE_SUITE_VERSION =
  "provider-acceptance-state-fixture-suite-v1" as const;
export const PROVIDER_ACCEPTANCE_STATE_FIXTURE_CHARACTERIZED_AT = "2026-07-10T12:00:00Z";

export type ProviderAcceptanceStateFixture = {
  fixtureId: string;
  description: string;
  synthetic: true;
  redacted: true;
  input: ProviderAcceptanceStateCharacterizationInput;
  expectedState: ProviderAcceptanceState;
};

function input(
  sourceTraceId: string,
  evidence: ProviderAcceptanceStateCharacterizationInput["evidence"],
  currentContextVersion = "terms-v1",
): ProviderAcceptanceStateCharacterizationInput {
  return {
    sourceTraceId,
    characterizedAt: PROVIDER_ACCEPTANCE_STATE_FIXTURE_CHARACTERIZED_AT,
    currentContextVersion,
    evidence,
  };
}

export const providerAcceptanceStateFixtures: ProviderAcceptanceStateFixture[] = [
  {
    fixtureId: "provider-explicit-acceptance",
    description: "An explicit provider-authored acceptance is preserved as evidence only.",
    synthetic: true,
    redacted: true,
    expectedState: "explicit_acceptance_signal",
    input: input("trace-provider-explicit-acceptance", [
      {
        evidenceId: "evidence-provider-acceptance",
        authoredAt: "2026-07-10T08:00:00Z",
        authorType: "provider",
        authorId: "synthetic-provider-a",
        source: "provider_message",
        kind: "acceptance",
        statement: "I can take this scope under the stated timing and terms.",
        contextVersion: "terms-v1",
      },
    ]),
  },
  {
    fixtureId: "provider-explicit-decline",
    description: "An explicit provider-authored decline remains a decline signal, not an action.",
    synthetic: true,
    redacted: true,
    expectedState: "explicit_decline_signal",
    input: input("trace-provider-explicit-decline", [
      {
        evidenceId: "evidence-provider-decline",
        authoredAt: "2026-07-10T08:05:00Z",
        authorType: "provider",
        authorId: "synthetic-provider-b",
        source: "provider_message",
        kind: "decline",
        statement: "I cannot take this scope.",
        contextVersion: "terms-v1",
      },
    ]),
  },
  {
    fixtureId: "provider-conditional-acceptance",
    description: "Provider-authored acceptance with a condition remains conditional.",
    synthetic: true,
    redacted: true,
    expectedState: "conditional_acceptance_signal",
    input: input("trace-provider-conditional-acceptance", [
      {
        evidenceId: "evidence-provider-conditional",
        authoredAt: "2026-07-10T08:10:00Z",
        authorType: "provider",
        authorId: "synthetic-provider-c",
        source: "provider_message",
        kind: "conditional_acceptance",
        statement: "I can take this only if the start time remains 8:00 AM.",
        contextVersion: "terms-v1",
        conditions: ["Start time remains 8:00 AM"],
      },
    ]),
  },
  {
    fixtureId: "provider-silence-no-response",
    description: "An invitation without a provider response remains unresolved.",
    synthetic: true,
    redacted: true,
    expectedState: "unresolved_no_explicit_signal",
    input: input("trace-provider-silence-no-response", [
      {
        evidenceId: "evidence-invitation-sent",
        authoredAt: "2026-07-10T08:15:00Z",
        authorType: "operator",
        authorId: "synthetic-operator",
        source: "invitation_record",
        kind: "invitation_sent",
        statement: "A request was sent; no provider response is present.",
        contextVersion: "terms-v1",
      },
    ]),
  },
  {
    fixtureId: "provider-route-schedule-context-only",
    description: "Route, schedule, availability, history, referral, and commercial context do not become acceptance.",
    synthetic: true,
    redacted: true,
    expectedState: "unresolved_no_explicit_signal",
    input: input("trace-provider-route-schedule-context-only", [
      {
        evidenceId: "evidence-route-assignment",
        authoredAt: "2026-07-10T08:20:00Z",
        authorType: "operator",
        authorId: "synthetic-operator",
        source: "route_record",
        kind: "route_assignment",
        statement: "Provider appears as a private route option.",
        contextVersion: "terms-v1",
      },
      {
        evidenceId: "evidence-schedule-placement",
        authoredAt: "2026-07-10T08:21:00Z",
        authorType: "operator",
        authorId: "synthetic-operator",
        source: "schedule_draft",
        kind: "schedule_placement",
        statement: "Provider appears in a private draft schedule lane.",
        contextVersion: "terms-v1",
      },
      {
        evidenceId: "evidence-availability",
        authoredAt: "2026-07-10T08:22:00Z",
        authorType: "provider",
        authorId: "synthetic-provider-d",
        source: "provider_message",
        kind: "availability",
        statement: "The date currently appears open.",
        contextVersion: "terms-v1",
      },
      {
        evidenceId: "evidence-referral",
        authoredAt: "2026-07-10T08:23:00Z",
        authorType: "operator",
        authorId: "synthetic-operator",
        source: "relationship_record",
        kind: "referral_context",
        statement: "Provider was referred for this service type.",
        contextVersion: "terms-v1",
      },
      {
        evidenceId: "evidence-prior-work",
        authoredAt: "2026-07-10T08:24:00Z",
        authorType: "operator",
        authorId: "synthetic-operator",
        source: "relationship_record",
        kind: "prior_work_history",
        statement: "Provider completed prior contracted work.",
        contextVersion: "terms-v1",
      },
      {
        evidenceId: "evidence-commercial-context",
        authoredAt: "2026-07-10T08:25:00Z",
        authorType: "operator",
        authorId: "synthetic-operator",
        source: "commercial_record",
        kind: "payment_contract_context",
        statement: "Draft contract and payment context exists privately.",
        contextVersion: "terms-v1",
      },
    ]),
  },
  {
    fixtureId: "provider-conflicting-signals",
    description: "Conflicting provider-authored acceptance and decline evidence remains conflicting.",
    synthetic: true,
    redacted: true,
    expectedState: "conflicting_provider_signals",
    input: input("trace-provider-conflicting-signals", [
      {
        evidenceId: "evidence-conflict-acceptance",
        authoredAt: "2026-07-10T08:30:00Z",
        authorType: "provider",
        authorId: "synthetic-provider-e",
        source: "provider_message",
        kind: "acceptance",
        statement: "I can take the scope.",
        contextVersion: "terms-v1",
      },
      {
        evidenceId: "evidence-conflict-decline",
        authoredAt: "2026-07-10T08:31:00Z",
        authorType: "provider",
        authorId: "synthetic-provider-e",
        source: "provider_message",
        kind: "decline",
        statement: "I cannot take the scope.",
        contextVersion: "terms-v1",
      },
    ]),
  },
  {
    fixtureId: "provider-acceptance-withdrawn",
    description: "A later provider-authored withdrawal supersedes earlier acceptance evidence.",
    synthetic: true,
    redacted: true,
    expectedState: "withdrawn_or_superseded_signal",
    input: input("trace-provider-acceptance-withdrawn", [
      {
        evidenceId: "evidence-before-withdrawal",
        authoredAt: "2026-07-10T08:35:00Z",
        authorType: "provider",
        authorId: "synthetic-provider-f",
        source: "provider_message",
        kind: "acceptance",
        statement: "I can take the original scope.",
        contextVersion: "terms-v1",
      },
      {
        evidenceId: "evidence-withdrawal",
        authoredAt: "2026-07-10T08:36:00Z",
        authorType: "provider",
        authorId: "synthetic-provider-f",
        source: "provider_message",
        kind: "withdrawal",
        statement: "I am withdrawing the earlier response.",
        contextVersion: "terms-v1",
        supersedesEvidenceIds: ["evidence-before-withdrawal"],
      },
    ]),
  },
  {
    fixtureId: "provider-acceptance-stale-after-change",
    description: "Old acceptance becomes stale after material timing or terms change.",
    synthetic: true,
    redacted: true,
    expectedState: "stale_signal_requires_review",
    input: input(
      "trace-provider-acceptance-stale-after-change",
      [
        {
          evidenceId: "evidence-old-acceptance",
          authoredAt: "2026-07-10T08:40:00Z",
          authorType: "provider",
          authorId: "synthetic-provider-g",
          source: "provider_message",
          kind: "acceptance",
          statement: "I can take the original timing and scope.",
          contextVersion: "terms-v1",
        },
        {
          evidenceId: "evidence-material-change",
          authoredAt: "2026-07-10T08:41:00Z",
          authorType: "operator",
          authorId: "synthetic-operator",
          source: "material_context",
          kind: "material_context_change",
          statement: "The required start time and service scope materially changed.",
          contextVersion: "terms-v2",
        },
      ],
      "terms-v2",
    ),
  },
  {
    fixtureId: "provider-acceptance-claimed-by-others",
    description: "Client and operator claims cannot substitute for provider-authored evidence.",
    synthetic: true,
    redacted: true,
    expectedState: "unresolved_no_explicit_signal",
    input: input("trace-provider-acceptance-claimed-by-others", [
      {
        evidenceId: "evidence-client-claim",
        authoredAt: "2026-07-10T08:45:00Z",
        authorType: "client",
        authorId: "synthetic-client",
        source: "client_message",
        kind: "acceptance",
        statement: "The client says the provider agreed.",
        contextVersion: "terms-v1",
      },
      {
        evidenceId: "evidence-operator-assumption",
        authoredAt: "2026-07-10T08:46:00Z",
        authorType: "operator",
        authorId: "synthetic-operator",
        source: "operator_note",
        kind: "acceptance",
        statement: "The operator assumes the provider will agree.",
        contextVersion: "terms-v1",
      },
    ]),
  },
];

export type ProviderAcceptanceStateFixtureFailure = {
  fixtureId: string;
  stage: "validation" | "characterization" | "authority_boundary";
  issues: string[];
};

export type ProviderAcceptanceStateFixtureSuiteResult = {
  suiteVersion: typeof PROVIDER_ACCEPTANCE_STATE_FIXTURE_SUITE_VERSION;
  totalFixtures: number;
  passed: number;
  failed: number;
  failures: ProviderAcceptanceStateFixtureFailure[];
  sourceTraceIds: string[];
  statesCovered: ProviderAcceptanceState[];
  authorityBoundaryPreserved: boolean;
};

export type ProviderAcceptanceStateFixtureSuiteOptions = {
  fixtures?: ProviderAcceptanceStateFixture[];
  resultTransform?: (
    result: ProviderAcceptanceStateCharacterizationResult,
    fixture: ProviderAcceptanceStateFixture,
  ) => ProviderAcceptanceStateCharacterizationResult;
};

export function runProviderAcceptanceStateFixtureSuite(
  options: ProviderAcceptanceStateFixtureSuiteOptions = {},
): ProviderAcceptanceStateFixtureSuiteResult {
  const fixtures = options.fixtures ?? providerAcceptanceStateFixtures;
  const failures: ProviderAcceptanceStateFixtureFailure[] = [];
  const statesCovered: ProviderAcceptanceState[] = [];
  const sourceTraceIds: string[] = [];
  let passed = 0;

  for (const fixture of fixtures) {
    sourceTraceIds.push(fixture.input.sourceTraceId);
    const validation = validateProviderAcceptanceStateInput(fixture.input);
    if (!validation.valid) {
      failures.push({ fixtureId: fixture.fixtureId, stage: "validation", issues: validation.issues });
      continue;
    }

    const characterized = characterizeProviderAcceptanceState(fixture.input);
    const result = options.resultTransform ? options.resultTransform(characterized, fixture) : characterized;
    if (result.state !== fixture.expectedState) {
      failures.push({
        fixtureId: fixture.fixtureId,
        stage: "characterization",
        issues: [`expected ${fixture.expectedState}, received ${result.state}`],
      });
      continue;
    }

    if (
      result.grantsRuntimeAuthority ||
      !result.requiresHumanReview ||
      result.allowedActions.length > 0 ||
      result.forbiddenActions.length === 0
    ) {
      failures.push({
        fixtureId: fixture.fixtureId,
        stage: "authority_boundary",
        issues: ["provider acceptance evidence granted or implied runtime authority"],
      });
      continue;
    }

    statesCovered.push(result.state);
    passed += 1;
  }

  return {
    suiteVersion: PROVIDER_ACCEPTANCE_STATE_FIXTURE_SUITE_VERSION,
    totalFixtures: fixtures.length,
    passed,
    failed: failures.length,
    failures,
    sourceTraceIds: Array.from(new Set(sourceTraceIds)),
    statesCovered: PROVIDER_ACCEPTANCE_STATES.filter((state) => statesCovered.includes(state)),
    authorityBoundaryPreserved: failures.every((failure) => failure.stage !== "authority_boundary"),
  };
}
