import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const stateAdapterSource = readFileSync("client/src/lib/inquiryCoordinationState.ts", "utf8");
const inquiryWorkspaceSource = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");
const coordinationAssessmentSource = readFileSync("server/coordinationAssessment.ts", "utf8");
const artistAdminSource = readFileSync("client/src/pages/ArtistAdmin.tsx", "utf8");
const schemaSource = readFileSync("shared/schema.ts", "utf8");
const routesSource = readFileSync("server/routes.ts", "utf8");

const REDUCTION_RULE_CATEGORIES = [
  "request context rules",
  "availability rules",
  "pricing/info readiness rules",
  "backend permission rules",
  "operator review rules",
  "route readiness rules",
  "private evidence rules",
  "recovery rules",
  "schedule draft rules",
  "blocking issue rules",
  "allowed/disallowed next-step rules",
  "artifact provenance rules",
] as const;

const BACKEND_AUTHORITATIVE_RULES = [
  "coordination permission decision",
  "risk factors",
  "missing signals",
  "recommended next action",
  "human judgment requirement",
  "confidence",
] as const;

const FRONTEND_INFERRED_READONLY_RULES = [
  "event date missing means request context incomplete",
  "no conflict surfaced still requires calendar source-of-truth review",
  "Pricing / Info Sheet material and services imply info sheet readiness",
  "route target phone or email means reachable route option",
  "Instagram or notes only means known but incomplete",
  "operator_reviewed means private review logged, not approval",
  "route_option_reviewed means route evidence exists, not provider acceptance",
  "recovery_coverage_reviewed means recovery evidence reviewed, not recovery confirmed",
  "schedule draft linked means private draft exists, not client-visible schedule",
  "timeline markers separate recorded event, current state, read-only signal, private review, and draft linked",
] as const;

const DOMAIN_JUDGMENT_RULES_REQUIRING_VIOLET_REVIEW = [
  "what counts as enough service context",
  "what makes Pricing / Info Sheet ready",
  "route matching weights for capability, tag, location, and preferred contact",
  "what counts as reachable contact",
  "recovery capacity interpretation",
  "when PROCEED_WITH_OVERSIGHT is safe enough for response drafting",
  "schedule readiness defaults and HMU-specific assumptions",
] as const;

const FORBIDDEN_AUTOMATIC_CONCLUSIONS = [
  "no conflict surfaced means date is available",
  "route target reachable means provider accepted",
  "operator reviewed means approved or safe to send",
  "recovery reviewed means recovery confirmed",
  "schedule draft exists means schedule is ready or client-visible",
  "pricing ready means response can be sent",
  "PROCEED means autonomous external action",
  "timeline or evidence item means contract, payment, public, or client action",
] as const;

function sourceBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `${startMarker} should exist`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `${endMarker} should exist after ${startMarker}`);
  return source.slice(start, end);
}

function sourceAfter(source: string, marker: string, length = 6000): string {
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${marker} should exist`);
  return source.slice(start, start + length);
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
const timelineSource = sourceBetween(
  inquiryWorkspaceSource,
  "function buildInquiryEventTimeline",
  "function EmptyValue",
);
const routeEvidenceActionSource = sourceBetween(
  inquiryWorkspaceSource,
  "const ROUTE_RECOVERY_EVIDENCE_ACTIONS",
  "const ROUTE_RECOVERY_EVIDENCE_EVENT_TYPES",
);
const routeEvidenceCardSource = sourceAfter(
  inquiryWorkspaceSource,
  'data-testid="route-recovery-evidence-log"',
  7000,
);
const commandCenterSnapshotSource = sourceBetween(
  artistAdminSource,
  "const pendingCount = inquiries.filter",
  "return (",
);
const assessmentSnapshotSource = sourceBetween(
  coordinationAssessmentSource,
  "export function evaluateCoordinationPath",
  "export async function assessCoordinationPath",
);

test("Coordination Reduction Rules v1 names the current rule categories", () => {
  assert.deepEqual([...REDUCTION_RULE_CATEGORIES], [
    "request context rules",
    "availability rules",
    "pricing/info readiness rules",
    "backend permission rules",
    "operator review rules",
    "route readiness rules",
    "private evidence rules",
    "recovery rules",
    "schedule draft rules",
    "blocking issue rules",
    "allowed/disallowed next-step rules",
    "artifact provenance rules",
  ]);
});

test("backend-authoritative rules stay in the coordination assessment engine", () => {
  for (const rule of BACKEND_AUTHORITATIVE_RULES) {
    assert.ok(rule.length > 0);
  }

  assert.match(coordinationAssessmentSource, /export function evaluateCoordinationPath/);
  assert.match(coordinationAssessmentSource, /function decide\(riskFactors: RiskFactor\[\], path: CoordinationPath\): PermissionDecision/);
  assert.match(coordinationAssessmentSource, /function recommendedNextAction\(decision: PermissionDecision\): string/);
  assert.match(coordinationAssessmentSource, /function confidenceFor\(decision: PermissionDecision, riskFactors: RiskFactor\[\]\): number/);
  assert.match(assessmentSnapshotSource, /riskFactors/);
  assert.match(assessmentSnapshotSource, /missingSignals/);
  assert.match(assessmentSnapshotSource, /recommendedNextAction/);
  assert.match(assessmentSnapshotSource, /humanJudgmentRequired/);
  assert.match(assessmentSnapshotSource, /confidence/);
  assert.match(schemaSource, /export const coordinationAssessments = pgTable/);
});

test("frontend-inferred rules are labeled read-only and non-authoritative", () => {
  for (const rule of FRONTEND_INFERRED_READONLY_RULES) {
    assert.ok(rule.length > 0);
  }

  assert.match(stateAdapterSource, /sourceArtifacts/);
  assert.match(stateAdapterSource, /inferredReadOnly/);
  assert.match(stateAdapterSource, /"availabilityState from inquiry date\/conflict fields"/);
  assert.match(stateAdapterSource, /"pricingInfoState from loaded profile\/services"/);
  assert.match(stateAdapterSource, /"routeReadiness from loaded network matches"/);
  assert.match(stateAdapterSource, /"timelineState from loaded private timeline entries"/);
  assert.match(stateAdapterSource, /"blockingIssues from current read-only workspace state"/);
  assert.match(availabilitySource, /This does not prove the date is open/);
  assert.match(routeEvidenceCardSource, /Operator-only evidence/);
  assert.match(routeEvidenceCardSource, /do not confirm provider acceptance/);
});

test("existing source anchors request, availability, pricing, and route readiness reductions", () => {
  assert.match(decisionSummarySource, /!hasDate/);
  assert.match(decisionSummarySource, /Need event date before responding/);
  assert.match(decisionSummarySource, /!hasServiceNeed/);
  assert.match(decisionSummarySource, /Pricing \/ Info Sheet not configured yet/);
  assert.match(availabilitySource, /No conflict surfaced from currently loaded inquiry data/);
  assert.match(availabilitySource, /Review the calendar\/source of truth before outreach/);
  assert.match(inquiryWorkspaceSource, /function contactReadinessFor/);
  assert.match(inquiryWorkspaceSource, /Instagram\/notes only/);
  assert.match(inquiryWorkspaceSource, /function routeTargetHasReachableContact/);
  assert.match(inquiryWorkspaceSource, /Ready to contact/);
  assert.match(inquiryWorkspaceSource, /Phone ready/);
  assert.match(inquiryWorkspaceSource, /Email ready/);
  assert.match(commandCenterSnapshotSource, /bounded review signal/);
  assert.match(commandCenterSnapshotSource, /Pricing \/ Info Sheet ready from enabled reusable info/);
});

test("operator review, private evidence, recovery, schedule draft, and timeline reductions stay separated from action authority", () => {
  assert.match(operatorReviewSource, /Route target acceptance/);
  assert.match(operatorReviewSource, /Recovery coverage/);
  assert.match(operatorReviewSource, /Handoff review/);
  assert.match(operatorReviewSource, /Recommended next action/);
  assert.match(routeEvidenceActionSource, /eventType: "route_option_reviewed"/);
  assert.match(routeEvidenceActionSource, /eventType: "recovery_coverage_reviewed"/);
  assert.match(routeEvidenceActionSource, /eventType: "handoff_reviewed"/);
  assert.match(timelineSource, /event\.eventType === "operator_reviewed"/);
  assert.match(timelineSource, /isRouteRecoveryEvidenceEventType\(event\.eventType\)/);
  assert.match(timelineSource, /marker: "Private review"/);
  assert.match(timelineSource, /marker: "Draft linked"/);
  assert.match(timelineSource, /Private draft only; no public\/client surface is created/);
});

test("domain-judgment rules are documented as requiring Violet review before hardening", () => {
  assert.deepEqual([...DOMAIN_JUDGMENT_RULES_REQUIRING_VIOLET_REVIEW], [
    "what counts as enough service context",
    "what makes Pricing / Info Sheet ready",
    "route matching weights for capability, tag, location, and preferred contact",
    "what counts as reachable contact",
    "recovery capacity interpretation",
    "when PROCEED_WITH_OVERSIGHT is safe enough for response drafting",
    "schedule readiness defaults and HMU-specific assumptions",
  ]);
});

test("dangerous automatic conclusions are explicitly forbidden", () => {
  assert.deepEqual([...FORBIDDEN_AUTOMATIC_CONCLUSIONS], [
    "no conflict surfaced means date is available",
    "route target reachable means provider accepted",
    "operator reviewed means approved or safe to send",
    "recovery reviewed means recovery confirmed",
    "schedule draft exists means schedule is ready or client-visible",
    "pricing ready means response can be sent",
    "PROCEED means autonomous external action",
    "timeline or evidence item means contract, payment, public, or client action",
  ]);

  assert.doesNotMatch(availabilitySource, /date is available|fully available|safe to respond/i);
  assert.doesNotMatch(routeEvidenceCardSource, /route accepted|provider accepted|committed|confirmed|approved|sent|client-visible|ready to send/i);
  assert.doesNotMatch(timelineSource, /contract approval|payment approval|public schedule|public export|client link created/i);
  assert.match(decisionSummarySource, /Nothing sends automatically/);
});

test("rules characterization does not add runtime reduction behavior or authority", () => {
  assert.doesNotMatch(stateAdapterSource, /CoordinationReductionRules|REDUCTION_RULE_CATEGORIES|DOMAIN_JUDGMENT_RULES_REQUIRING_VIOLET_REVIEW/);
  assert.doesNotMatch(inquiryWorkspaceSource, /CoordinationReductionRules|REDUCTION_RULE_CATEGORIES|DOMAIN_JUDGMENT_RULES_REQUIRING_VIOLET_REVIEW/);
  assert.doesNotMatch(coordinationAssessmentSource, /CoordinationReductionRules|REDUCTION_RULE_CATEGORIES|DOMAIN_JUDGMENT_RULES_REQUIRING_VIOLET_REVIEW/);
  assert.doesNotMatch(artistAdminSource, /CoordinationReductionRules|REDUCTION_RULE_CATEGORIES|DOMAIN_JUDGMENT_RULES_REQUIRING_VIOLET_REVIEW/);
  assert.doesNotMatch(routesSource, /coordination-reduction-rules|CoordinationReductionRules/);
  assert.doesNotMatch(schemaSource, /coordination_reduction_rules|CoordinationReductionRules/);
});

test("rules characterization introduces no schema, backend endpoint, send, upload, contract, payment, AI, or public visibility behavior", () => {
  assert.doesNotMatch(routesSource, /\/api\/coordination-reduction-rules|\/api\/reduction-rules/);
  assert.doesNotMatch(schemaSource, /coordination_reduction_rules|reductionRules|pgTable\("coordination_reduction_rules"/);
  assert.doesNotMatch(stateAdapterSource, /fetch\(|useQuery|useMutation|method: "POST"|method: "PATCH"|method: "PUT"|method: "DELETE"/);
  assert.doesNotMatch(stateAdapterSource, /\/assess|assessCoordinationPath|createCoordinationAssessment/);
  assert.doesNotMatch(stateAdapterSource, /sendEmail|sendSMS|sendInfoSheetEmail|sendGeneralEmail|\/api\/sms|\/api\/emails?/);
  assert.doesNotMatch(stateAdapterSource, /ObjectUploader|\/api\/objects|uploadURL|getUploadParameters/);
  assert.doesNotMatch(stateAdapterSource, /\/api\/contracts|\/api\/square|\/api\/payments?|Square/i);
  assert.doesNotMatch(stateAdapterSource, /OpenAI|Anthropic|scheduleAI|processScheduleChat|\/api\/schedule-ai/);
  assert.doesNotMatch(stateAdapterSource, /public schedule|public\/client|client link created|create client link/i);
});
