import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  PERMISSIONED_NEXT_STEP_FORBIDDEN_ACTIONS,
  PERMISSIONED_NEXT_STEP_PROTECTED_BOUNDARIES,
  PERMISSIONED_NEXT_STEP_QUERY_TYPES,
  PERMISSIONED_NEXT_STEP_VIOLET_REVIEW_NEEDED_AREAS,
  answerPermissionedNextStepQuery,
} from "../client/src/lib/permissionedNextStepQuery";
import type { InquiryCoordinationState } from "../client/src/lib/inquiryCoordinationState";

const queryAdapterSource = readFileSync("client/src/lib/permissionedNextStepQuery.ts", "utf8");
const inquiryWorkspaceSource = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");
const artistAdminSource = readFileSync("client/src/pages/ArtistAdmin.tsx", "utf8");
const routesSource = readFileSync("server/routes.ts", "utf8");
const schemaSource = readFileSync("shared/schema.ts", "utf8");

const sampleState: InquiryCoordinationState = {
  inquiryIdentity: {
    inquiryId: "demo-inquiry",
    operatorId: "demo-operator",
    clientDisplay: "Demo Client",
    source: "demo",
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:10:00.000Z",
  },
  requestContext: {
    eventDate: "2026-10-10",
    location: "Demo venue",
    serviceType: "bridal hair and makeup",
    eventType: "wedding",
    partySize: 6,
    messageSummary: "Demo inquiry summary",
  },
  availabilityState: {
    datePresent: true,
    conflictSurfaced: false,
    conflictSource: null,
    sourceOfTruthReviewRequired: true,
  },
  pricingInfoState: {
    ready: true,
    servicesAdded: true,
    textAdded: true,
    pdfReferenceAdded: false,
    reusableInfoEnabled: true,
  },
  coordinationPermission: {
    decision: "PROCEED_WITH_OVERSIGHT",
    confidence: 72,
    riskFactors: ["UNCONFIRMED_HANDOFF", "LOW_RECOVERY_CAPACITY"],
    missingSignals: ["Route target acceptance", "Recovery provider confirmation"],
    recommendedNextAction: "Review handoff and recovery before outreach.",
  },
  operatorReviewState: {
    required: true,
    latestReview: "Operator reviewed the handoff privately.",
    checklist: [
      "Route target acceptance: Not confirmed yet",
      "Recovery coverage: Needs confirmation",
      "Handoff review: Review handoff",
    ],
    humanJudgmentRequired: true,
  },
  routeReadiness: {
    optionsExist: true,
    reachableOptions: 1,
    incompleteOptions: 0,
    draftCandidates: 1,
  },
  routeEvidenceState: {
    routeOptionReviewed: true,
    latestEvidence: "Route option reviewed privately.",
  },
  recoveryEvidenceState: {
    recoveryReviewed: true,
    lowRecoveryCapacity: true,
    missingRecoverySignal: true,
  },
  timelineState: {
    recordedEvents: 2,
    currentStates: 3,
    privateReviews: 2,
    draftLinks: 1,
  },
  scheduleDraftState: {
    exists: true,
    draftId: "demo-schedule",
    linkedInquiryId: "demo-inquiry",
    contextStatus: "linked inquiry context",
    readinessStatus: "draft",
  },
  sourceArtifacts: {
    durable: ["inquiries", "coordination_assessments", "coordination_events", "schedule_drafts"],
    inferredReadOnly: [
      "availabilityState from inquiry date/conflict fields",
      "pricingInfoState from loaded profile/services",
      "routeReadiness from loaded network matches",
    ],
    operatorOnly: ["operator review checklist", "private review log", "private route/recovery evidence log"],
  },
  blockingIssues: [
    "Risk factor: UNCONFIRMED_HANDOFF",
    "Missing signal: Route target acceptance",
  ],
  recommendedNextStep: "Review handoff and recovery before outreach.",
  requiresHumanApproval: true,
  visibleTo: ["operator", "admin"],
  lastUpdatedFromEvents: "2026-07-01T12:10:00.000Z",
};

test("private source adapter exports only the v1 safe query vocabulary", () => {
  assert.deepEqual([...PERMISSIONED_NEXT_STEP_QUERY_TYPES], [
    "can_operator_draft_response",
    "what_blocks_response_readiness",
    "what_must_be_reviewed_before_outreach",
    "what_human_approval_is_required",
    "is_this_private_evidence_only",
    "is_schedule_draft_private_context_only",
    "what_safe_next_step_label_can_be_shown",
  ]);

  assert.match(queryAdapterSource, /export type PermissionedNextStepQueryType/);
  assert.match(queryAdapterSource, /export function answerPermissionedNextStepQuery/);
  assert.doesNotMatch(queryAdapterSource, /send_response|confirm_availability|create_contract|collect_payment|execute_next_action/);
});

test("query answers match the allowed private answer shape", () => {
  const answer = answerPermissionedNextStepQuery(sampleState, "what_must_be_reviewed_before_outreach");

  assert.deepEqual(Object.keys(answer), [
    "queryType",
    "allowed",
    "visibility",
    "requiresHumanApproval",
    "blockingIssues",
    "sourceArtifacts",
    "authoritativeSignals",
    "nonAuthoritativeSignals",
    "recommendedOperatorReview",
    "forbiddenActions",
    "safeNextStepLabel",
  ]);
  assert.equal(answer.queryType, "what_must_be_reviewed_before_outreach");
  assert.equal(answer.allowed, true);
  assert.deepEqual(answer.visibility, ["operator", "admin"]);
  assert.equal(answer.requiresHumanApproval, true);
  assert.deepEqual(Object.keys(answer.sourceArtifacts), ["durable", "inferredReadOnly", "operatorOnly"]);
});

test("answers carry backend-authoritative assessment signals separately from inferred read-only signals", () => {
  const answer = answerPermissionedNextStepQuery(sampleState, "what_human_approval_is_required");

  assert.ok(answer.authoritativeSignals.includes("permission decision: PROCEED_WITH_OVERSIGHT"));
  assert.ok(answer.authoritativeSignals.includes("confidence: 72"));
  assert.ok(answer.authoritativeSignals.includes("backend risk factor: UNCONFIRMED_HANDOFF"));
  assert.ok(answer.authoritativeSignals.includes("backend missing signal: Route target acceptance"));
  assert.ok(answer.authoritativeSignals.includes("recommended next action: Review handoff and recovery before outreach."));
  assert.ok(answer.authoritativeSignals.includes("human judgment required"));

  assert.ok(answer.nonAuthoritativeSignals.includes("date signal: present"));
  assert.ok(answer.nonAuthoritativeSignals.includes("conflict signal: no conflict surfaced"));
  assert.ok(answer.nonAuthoritativeSignals.includes("calendar/source-of-truth review required"));
  assert.ok(answer.nonAuthoritativeSignals.includes("pricing/info readiness: ready"));
  assert.ok(answer.nonAuthoritativeSignals.includes("route contact readiness: 1 reachable option(s)"));
  assert.ok(answer.nonAuthoritativeSignals.includes("private route evidence exists"));
  assert.ok(answer.nonAuthoritativeSignals.includes("private recovery evidence exists"));
  assert.ok(answer.nonAuthoritativeSignals.includes("operator review log present"));
  assert.ok(answer.nonAuthoritativeSignals.includes("schedule draft linked/private status present"));
});

test("all query answers include forbidden actions and protected boundaries remain explicit", () => {
  assert.deepEqual([...PERMISSIONED_NEXT_STEP_FORBIDDEN_ACTIONS], [
    "send response",
    "confirm availability",
    "create hold",
    "create contracted work",
    "approve provider route",
    "mark provider accepted",
    "run preflight",
    "contact anyone",
    "create contract",
    "collect/take payment",
    "publish schedule",
    "create client link",
    "autonomously decide next action",
    "execute next action",
  ]);
  assert.deepEqual([...PERMISSIONED_NEXT_STEP_PROTECTED_BOUNDARIES], [
    "review is not approval",
    "evidence is not acceptance",
    "route reachable is not provider accepted",
    "no conflict surfaced is not date available",
    "pricing ready is not safe to send",
    "schedule draft exists is not client-visible schedule",
    "PROCEED is not autonomous action",
    "next-step query is not external action",
  ]);

  for (const queryType of PERMISSIONED_NEXT_STEP_QUERY_TYPES) {
    const answer = answerPermissionedNextStepQuery(sampleState, queryType);
    assert.deepEqual(answer.forbiddenActions, [...PERMISSIONED_NEXT_STEP_FORBIDDEN_ACTIONS]);
  }
});

test("Violet-review areas stay named instead of hardened into authority", () => {
  assert.deepEqual([...PERMISSIONED_NEXT_STEP_VIOLET_REVIEW_NEEDED_AREAS], [
    "what counts as enough service context",
    "when drafting a response is safe",
    'what "availability reviewed" means',
    "what counts as reachable route option",
    "recovery capacity interpretation",
    "HMU schedule assumptions",
    "when a soft yes remains unresolved",
  ]);
  assert.match(queryAdapterSource, /PERMISSIONED_NEXT_STEP_VIOLET_REVIEW_NEEDED_AREAS/);
});

test("private evidence and schedule draft queries remain non-actionable", () => {
  const evidenceAnswer = answerPermissionedNextStepQuery(sampleState, "is_this_private_evidence_only");
  const scheduleAnswer = answerPermissionedNextStepQuery(sampleState, "is_schedule_draft_private_context_only");

  assert.equal(evidenceAnswer.safeNextStepLabel, "Evidence only");
  assert.match(evidenceAnswer.recommendedOperatorReview.join(" "), /does not create approval or acceptance/);
  assert.equal(scheduleAnswer.safeNextStepLabel, "Private draft context only");
  assert.match(scheduleAnswer.recommendedOperatorReview.join(" "), /does not create a client-visible schedule/);
  assert.ok(evidenceAnswer.forbiddenActions.includes("mark provider accepted"));
  assert.ok(scheduleAnswer.forbiddenActions.includes("publish schedule"));
});

test("Inquiry Workspace assembles private query answers without rendering them", () => {
  assert.match(queryAdapterSource, /import type \{ InquiryCoordinationState, InquiryCoordinationVisibility \}/);
  assert.doesNotMatch(queryAdapterSource, /from "react"|useMemo|useQuery|useMutation|fetch\(/);
  assert.doesNotMatch(queryAdapterSource, /method: "POST"|method: "PATCH"|method: "PUT"|method: "DELETE"/);
  assert.match(inquiryWorkspaceSource, /PERMISSIONED_NEXT_STEP_QUERY_TYPES/);
  assert.match(inquiryWorkspaceSource, /answerPermissionedNextStepQuery/);
  assert.match(inquiryWorkspaceSource, /const permissionedNextStepQueryAnswers = useMemo/);
  assert.match(inquiryWorkspaceSource, /PERMISSIONED_NEXT_STEP_QUERY_TYPES\.map/);
  assert.match(inquiryWorkspaceSource, /answerPermissionedNextStepQuery\(inquiryCoordinationState, queryType\)/);
  assert.match(inquiryWorkspaceSource, /void permissionedNextStepQueryAnswers/);
  assert.doesNotMatch(inquiryWorkspaceSource, /data-testid="permissioned-next-step-query/);
  assert.doesNotMatch(inquiryWorkspaceSource, /\{permissionedNextStepQueryAnswers/);
  assert.doesNotMatch(artistAdminSource, /permissionedNextStepQuery|answerPermissionedNextStepQuery|PermissionedNextStepQuery/);
});

test("adapter introduces no schema, endpoint, assess call, AI, send, upload, contract, payment, public, or client-link behavior", () => {
  assert.doesNotMatch(routesSource, /permissioned-next-step|PermissionedNextStepQuery|next-step-query/);
  assert.doesNotMatch(schemaSource, /permissioned_next_step|PermissionedNextStepQuery|nextStepQuery/);
  assert.doesNotMatch(queryAdapterSource, /\/assess|assessCoordinationPath|createCoordinationAssessment/);
  assert.doesNotMatch(queryAdapterSource, /OpenAI|Anthropic|scheduleAI|processScheduleChat|\/api\/schedule-ai/);
  assert.doesNotMatch(queryAdapterSource, /sendEmail|sendSMS|sendInfoSheetEmail|sendGeneralEmail|\/api\/sms|\/api\/emails?/);
  assert.doesNotMatch(queryAdapterSource, /ObjectUploader|\/api\/objects|uploadURL|getUploadParameters/);
  assert.doesNotMatch(queryAdapterSource, /\/api\/contracts|\/api\/square|\/api\/payments?|Square/i);
  assert.doesNotMatch(queryAdapterSource, /createClientLink|clientLink|client link created|public\/client/i);
});
