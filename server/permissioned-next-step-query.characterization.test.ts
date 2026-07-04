import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const adapterSource = readFileSync("client/src/lib/inquiryCoordinationState.ts", "utf8");
const queryAdapterSource = readFileSync("client/src/lib/permissionedNextStepQuery.ts", "utf8");
const inquiryWorkspaceSource = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");
const artistAdminSource = readFileSync("client/src/pages/ArtistAdmin.tsx", "utf8");
const coordinationAssessmentSource = readFileSync("server/coordinationAssessment.ts", "utf8");
const reductionRulesSource = readFileSync("server/coordination-reduction-rules.characterization.test.ts", "utf8");
const routesSource = readFileSync("server/routes.ts", "utf8");
const schemaSource = readFileSync("shared/schema.ts", "utf8");

const SAFE_QUERY_TYPES = [
  "can_operator_draft_response",
  "what_blocks_response_readiness",
  "what_must_be_reviewed_before_outreach",
  "what_human_approval_is_required",
  "is_this_private_evidence_only",
  "is_schedule_draft_private_context_only",
  "what_safe_next_step_label_can_be_shown",
] as const;

const FORBIDDEN_QUERY_OR_ACTION_TYPES = [
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
] as const;

const AUTHORITATIVE_INPUTS = [
  "coordination permission decision",
  "backend risk factors",
  "backend missing signals",
  "recommended next action",
  "human judgment requirement",
  "confidence/provenance from coordination assessment",
] as const;

const INFERRED_READONLY_INPUTS = [
  "availability readiness",
  "pricing/info readiness",
  "route contact readiness",
  "reachable route option label",
  "private evidence/timeline markers",
  "operator review log presence",
  "schedule draft linked/private status",
  "command-center status snapshots",
] as const;

const VIOLET_REVIEW_NEEDED_AREAS = [
  "what counts as enough service context",
  "when drafting a response is safe",
  'what "availability reviewed" means',
  "what counts as reachable route option",
  "recovery capacity interpretation",
  "HMU schedule assumptions",
  "when a soft yes remains unresolved",
] as const;

const PROTECTED_BOUNDARIES = [
  "review is not approval",
  "evidence is not acceptance",
  "route reachable is not provider accepted",
  "no conflict surfaced is not date available",
  "pricing ready is not safe to send",
  "schedule draft exists is not client-visible schedule",
  "PROCEED is not autonomous action",
  "next-step query is not external action",
] as const;

const EXAMPLE_PERMISSIONED_NEXT_STEP_QUERY_RESULT = {
  queryType: "what_must_be_reviewed_before_outreach",
  allowed: true,
  visibility: ["operator", "admin"],
  requiresHumanApproval: true,
  blockingIssues: ["Missing signal: Route target acceptance"],
  sourceArtifacts: {
    durable: ["coordination_assessments", "coordination_events"],
    inferredReadOnly: ["operator review checklist", "availability readiness"],
    operatorOnly: ["private evidence log"],
  },
  authoritativeSignals: ["PROCEED_WITH_OVERSIGHT", "humanJudgmentRequired"],
  nonAuthoritativeSignals: ["reachable route option label"],
  recommendedOperatorReview: ["Review handoff and recovery before outreach."],
  forbiddenActions: ["send response", "mark provider accepted"],
  safeNextStepLabel: "Review before outreach",
} as const;

function sourceBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `${startMarker} should exist`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `${endMarker} should exist after ${startMarker}`);
  return source.slice(start, end);
}

const decisionSummarySource = sourceBetween(
  inquiryWorkspaceSource,
  "function buildInquiryDecisionSummary",
  "function textTokens",
);
const availabilitySource = sourceBetween(
  inquiryWorkspaceSource,
  "function buildAvailabilityReadinessRows",
  "function detailList",
);
const operatorReviewSource = sourceBetween(
  inquiryWorkspaceSource,
  "function buildOperatorReviewChecklist",
  "function buildAvailabilityReadinessRows",
);
const routeEvidenceLogSource = sourceBetween(
  inquiryWorkspaceSource,
  'data-testid="route-recovery-evidence-log"',
  'data-testid="inquiry-event-timeline-card"',
);
const runtimeSources = [
  adapterSource,
  inquiryWorkspaceSource,
  artistAdminSource,
  coordinationAssessmentSource,
  routesSource,
  schemaSource,
].join("\n");

test("PermissionedNextStepQuery v1 is characterized as a bounded read-only question, not an action", () => {
  assert.match(adapterSource, /export type InquiryCoordinationState =/);
  assert.match(adapterSource, /export function buildInquiryCoordinationState/);
  assert.match(queryAdapterSource, /export function answerPermissionedNextStepQuery/);
  assert.match(reductionRulesSource, /allowed\/disallowed next-step rules/);
  assert.deepEqual([...SAFE_QUERY_TYPES], [
    "can_operator_draft_response",
    "what_blocks_response_readiness",
    "what_must_be_reviewed_before_outreach",
    "what_human_approval_is_required",
    "is_this_private_evidence_only",
    "is_schedule_draft_private_context_only",
    "what_safe_next_step_label_can_be_shown",
  ]);
  assert.doesNotMatch(routesSource, /PermissionedNextStepQuery|permissionedNextStepQuery/);
  assert.doesNotMatch(schemaSource, /PermissionedNextStepQuery|permissionedNextStepQuery/);
});

test("v1 forbids action-taking queries and external authority", () => {
  assert.deepEqual([...FORBIDDEN_QUERY_OR_ACTION_TYPES], [
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

  for (const forbidden of FORBIDDEN_QUERY_OR_ACTION_TYPES) {
    assert.ok(!SAFE_QUERY_TYPES.includes(forbidden as (typeof SAFE_QUERY_TYPES)[number]));
  }

  assert.match(decisionSummarySource, /Nothing sends automatically/);
  assert.match(availabilitySource, /No hold created/);
  assert.match(availabilitySource, /No contracted work is created/);
  assert.match(routeEvidenceLogSource, /do not confirm provider acceptance, create a route, run preflight, contact anyone, send anything/);
});

test("allowed answer shape keeps visibility, source artifacts, and forbidden actions explicit", () => {
  assert.deepEqual(Object.keys(EXAMPLE_PERMISSIONED_NEXT_STEP_QUERY_RESULT), [
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
  assert.deepEqual(EXAMPLE_PERMISSIONED_NEXT_STEP_QUERY_RESULT.visibility, ["operator", "admin"]);
  assert.deepEqual(Object.keys(EXAMPLE_PERMISSIONED_NEXT_STEP_QUERY_RESULT.sourceArtifacts), [
    "durable",
    "inferredReadOnly",
    "operatorOnly",
  ]);
  assert.equal(typeof EXAMPLE_PERMISSIONED_NEXT_STEP_QUERY_RESULT.allowed, "boolean");
  assert.equal(typeof EXAMPLE_PERMISSIONED_NEXT_STEP_QUERY_RESULT.requiresHumanApproval, "boolean");
  assert.ok(EXAMPLE_PERMISSIONED_NEXT_STEP_QUERY_RESULT.forbiddenActions.includes("send response"));
});

test("authoritative query inputs stay anchored to backend coordination assessment signals", () => {
  assert.deepEqual([...AUTHORITATIVE_INPUTS], [
    "coordination permission decision",
    "backend risk factors",
    "backend missing signals",
    "recommended next action",
    "human judgment requirement",
    "confidence/provenance from coordination assessment",
  ]);

  assert.match(coordinationAssessmentSource, /function decide\(riskFactors: RiskFactor\[\], path: CoordinationPath\): PermissionDecision/);
  assert.match(coordinationAssessmentSource, /riskFactors/);
  assert.match(coordinationAssessmentSource, /missingSignals/);
  assert.match(coordinationAssessmentSource, /recommendedNextAction/);
  assert.match(coordinationAssessmentSource, /humanJudgmentRequired/);
  assert.match(coordinationAssessmentSource, /confidence/);
  assert.match(schemaSource, /export const coordinationAssessments = pgTable/);
  assert.match(reductionRulesSource, /backend-authoritative rules stay in the coordination assessment engine/);
});

test("inferred inputs remain read-only and non-authoritative", () => {
  assert.deepEqual([...INFERRED_READONLY_INPUTS], [
    "availability readiness",
    "pricing/info readiness",
    "route contact readiness",
    "reachable route option label",
    "private evidence/timeline markers",
    "operator review log presence",
    "schedule draft linked/private status",
    "command-center status snapshots",
  ]);

  assert.match(adapterSource, /sourceArtifacts/);
  assert.match(adapterSource, /inferredReadOnly/);
  assert.match(adapterSource, /"availabilityState from inquiry date\/conflict fields"/);
  assert.match(adapterSource, /"pricingInfoState from loaded profile\/services"/);
  assert.match(adapterSource, /"routeReadiness from loaded network matches"/);
  assert.match(adapterSource, /"timelineState from loaded private timeline entries"/);
  assert.match(adapterSource, /scheduleDraftState/);
  assert.match(artistAdminSource, /needsAttentionSnapshot/);
  assert.match(artistAdminSource, /settingsSnapshot/);
  assert.match(artistAdminSource, /availabilitySnapshot/);
});

test("Violet-review areas are named before any hardening", () => {
  assert.deepEqual([...VIOLET_REVIEW_NEEDED_AREAS], [
    "what counts as enough service context",
    "when drafting a response is safe",
    'what "availability reviewed" means',
    "what counts as reachable route option",
    "recovery capacity interpretation",
    "HMU schedule assumptions",
    "when a soft yes remains unresolved",
  ]);
});

test("protected boundaries keep query answers separate from approval, acceptance, and external action", () => {
  assert.deepEqual([...PROTECTED_BOUNDARIES], [
    "review is not approval",
    "evidence is not acceptance",
    "route reachable is not provider accepted",
    "no conflict surfaced is not date available",
    "pricing ready is not safe to send",
    "schedule draft exists is not client-visible schedule",
    "PROCEED is not autonomous action",
    "next-step query is not external action",
  ]);

  assert.match(reductionRulesSource, /operator reviewed means approved or safe to send/);
  assert.match(reductionRulesSource, /route target reachable means provider accepted/);
  assert.match(reductionRulesSource, /no conflict surfaced means date is available/);
  assert.match(reductionRulesSource, /pricing ready means response can be sent/);
  assert.match(reductionRulesSource, /PROCEED means autonomous external action/);
  assert.match(reductionRulesSource, /schedule draft exists means schedule is ready or client-visible/);
});

test("source characterization adds no runtime query engine, endpoint, schema, assess call, AI, send, upload, contract, payment, or public behavior", () => {
  assert.doesNotMatch(routesSource, /permissioned-next-step|PermissionedNextStepQuery|next-step-query/);
  assert.doesNotMatch(schemaSource, /permissioned_next_step|PermissionedNextStepQuery|nextStepQuery/);
  assert.match(queryAdapterSource, /export type PermissionedNextStepQueryAnswer/);
  assert.doesNotMatch(adapterSource, /PermissionedNextStepQuery|permissionedNextStepQuery/);
  assert.doesNotMatch(inquiryWorkspaceSource, /data-testid="permissioned-next-step-query/);
  assert.doesNotMatch(inquiryWorkspaceSource, /\{permissionedNextStepQueryAnswers/);
  assert.doesNotMatch(artistAdminSource, /PermissionedNextStepQuery|permissionedNextStepQuery/);
  assert.doesNotMatch(adapterSource, /\/assess|assessCoordinationPath|createCoordinationAssessment/);
  assert.doesNotMatch(inquiryWorkspaceSource, /PermissionedNextStepQuery.*\/assess|permissionedNextStepQuery.*\/assess/);
  assert.doesNotMatch(adapterSource, /OpenAI|Anthropic|scheduleAI|processScheduleChat|\/api\/schedule-ai/);
  assert.doesNotMatch(adapterSource, /fetch\(|useQuery|useMutation|method: "POST"|method: "PATCH"|method: "PUT"|method: "DELETE"/);
  assert.doesNotMatch(adapterSource, /sendEmail|sendSMS|sendInfoSheetEmail|sendGeneralEmail|\/api\/sms|\/api\/emails?/);
  assert.doesNotMatch(adapterSource, /ObjectUploader|\/api\/objects|uploadURL|getUploadParameters/);
  assert.doesNotMatch(adapterSource, /\/api\/contracts|\/api\/square|\/api\/payments?|Square/i);
  assert.doesNotMatch(adapterSource, /public schedule|public\/client|client link created|create client link/i);
});
