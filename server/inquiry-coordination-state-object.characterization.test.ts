import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const adapterSource = readFileSync("client/src/lib/inquiryCoordinationState.ts", "utf8");
const inquiryWorkspaceSource = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");
const routesSource = readFileSync("server/routes.ts", "utf8");
const schemaSource = readFileSync("shared/schema.ts", "utf8");

function sourceAfter(source: string, marker: string, length = 5000): string {
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${marker} should exist`);
  return source.slice(start, start + length);
}

const adapterCallSource = sourceAfter(inquiryWorkspaceSource, "buildInquiryCoordinationState({", 2600);
const stateTypeSource = sourceAfter(adapterSource, "export type InquiryCoordinationState =", 5200);
const builderSource = sourceAfter(adapterSource, "export function buildInquiryCoordinationState", 9000);

test("a typed InquiryCoordinationState adapter exists", () => {
  assert.match(adapterSource, /export type InquiryCoordinationState =/);
  assert.match(adapterSource, /export type InquiryCoordinationStateSource =/);
  assert.match(adapterSource, /export function buildInquiryCoordinationState/);

  for (const field of [
    "inquiryIdentity",
    "requestContext",
    "availabilityState",
    "pricingInfoState",
    "coordinationPermission",
    "operatorReviewState",
    "routeReadiness",
    "routeEvidenceState",
    "recoveryEvidenceState",
    "timelineState",
    "scheduleDraftState",
    "blockingIssues",
    "recommendedNextStep",
    "requiresHumanApproval",
    "visibleTo",
    "lastUpdatedFromEvents",
  ]) {
    assert.match(stateTypeSource, new RegExp(field));
  }
});

test("Inquiry Workspace assembles the state object from already-loaded sources only", () => {
  assert.match(inquiryWorkspaceSource, /import \{ buildInquiryCoordinationState \} from "@\/lib\/inquiryCoordinationState"/);
  assert.match(inquiryWorkspaceSource, /const inquiryCoordinationState = useMemo/);
  assert.match(adapterCallSource, /inquiry: selectedInquiry/);
  assert.match(adapterCallSource, /operatorId: user\?\.id \?\? null/);
  assert.match(adapterCallSource, /artistProfile/);
  assert.match(adapterCallSource, /artistServices/);
  assert.match(adapterCallSource, /networkMatches/);
  assert.match(adapterCallSource, /draftCandidates/);
  assert.match(adapterCallSource, /permissionAssessment: selectedPermissionAssessment/);
  assert.match(adapterCallSource, /coordinationEvents: coordinationPathDetailQuery\.data\?\.events \?\? \[\]/);
  assert.match(adapterCallSource, /scheduleDraft: selectedScheduleDraft/);
  assert.match(adapterCallSource, /internalNote: internalNoteQuery\.data\?\.note \?\? null/);
  assert.match(adapterCallSource, /decisionSummary: inquiryDecisionSummary/);
  assert.match(adapterCallSource, /operatorReviewChecklistRows/);
  assert.match(adapterCallSource, /timelineEntries: inquiryEventTimelineEntries/);
});

test("adapter distinguishes durable artifacts from inferred read-only workspace state", () => {
  assert.match(stateTypeSource, /sourceArtifacts/);
  assert.match(stateTypeSource, /durable: string\[\]/);
  assert.match(stateTypeSource, /inferredReadOnly: string\[\]/);
  assert.match(stateTypeSource, /operatorOnly: string\[\]/);
  assert.match(builderSource, /"inquiries"/);
  assert.match(builderSource, /"coordination_assessments"/);
  assert.match(builderSource, /"coordination_events"/);
  assert.match(builderSource, /"schedule_drafts"/);
  assert.match(builderSource, /"inquiry_internal_notes"/);
  assert.match(builderSource, /"availabilityState from inquiry date\/conflict fields"/);
  assert.match(builderSource, /"pricingInfoState from loaded profile\/services"/);
  assert.match(builderSource, /"routeReadiness from loaded network matches"/);
  assert.match(builderSource, /"blockingIssues from current read-only workspace state"/);
});

test("state includes private visibility and human-review permission framing", () => {
  assert.match(builderSource, /requiresHumanApproval/);
  assert.match(builderSource, /humanJudgmentRequired/);
  assert.match(builderSource, /decisionSummary\?\.label === "Needs operator review"/);
  assert.match(builderSource, /"PROCEED_WITH_OVERSIGHT"/);
  assert.match(builderSource, /visibleTo: \["operator", "admin"\]/);
  assert.match(builderSource, /recommendedNextStep: permissionAssessment\?\.recommendedNextAction \|\| decisionSummary\?\.nextStep \|\| null/);
});

test("state is query-ready without changing assessment or permission logic", () => {
  assert.match(builderSource, /blockingIssues/);
  assert.match(builderSource, /"Event date missing"/);
  assert.match(builderSource, /"Service context missing"/);
  assert.match(builderSource, /"Pricing \/ Info Sheet not ready"/);
  assert.match(builderSource, /`Risk factor: \$\{risk\}`/);
  assert.match(builderSource, /`Missing signal: \$\{signal\}`/);
  assert.doesNotMatch(sourceAfter(inquiryWorkspaceSource, "function buildInquiryDecisionSummary", 7000), /inquiryCoordinationState|buildInquiryCoordinationState/);
  assert.doesNotMatch(builderSource, /createCoordinationAssessment|assessCoordinationPath|coordination_assessments.*insert|coordinationAssessments.*insert/);
});

test("adapter does not introduce fetching, persistence, assessment calls, or broad history replay", () => {
  assert.doesNotMatch(adapterSource, /fetch\(|useQuery|useMutation|method: "POST"|method: "PUT"|method: "PATCH"|method: "DELETE"/);
  assert.doesNotMatch(adapterSource, /\/assess|assessCoordinationPath|createCoordinationAssessment/);
  assert.doesNotMatch(adapterSource, /conversationHistory|chatHistory|messageThread|messages\.map|rawTranscript/i);
  assert.doesNotMatch(adapterSource, /OpenAI|Anthropic|generate|aiChat|scheduleAI|processScheduleChat/i);
});

test("adapter does not imply route acceptance, sends, contracts, payments, public visibility, or client action", () => {
  assert.doesNotMatch(adapterSource, /provider accepted|route accepted|accepted route|provider commitment|send approval|contract approval|payment approval/i);
  assert.doesNotMatch(adapterSource, /createClientLink|client link|public schedule|public export|client-visible/i);
  assert.doesNotMatch(adapterSource, /sendEmail|sendSMS|sendInfoSheetEmail|sendGeneralEmail|\/api\/sms|\/api\/emails?/);
  assert.doesNotMatch(adapterSource, /\/api\/contracts|\/api\/square|\/api\/payments?|Square/i);
});

test("no backend, schema, storage, auth, send, upload, contract, payment, AI, or public state object was introduced", () => {
  assert.doesNotMatch(routesSource, /InquiryCoordinationState|inquiry-coordination-state|coordination-state/);
  assert.doesNotMatch(schemaSource, /InquiryCoordinationState|inquiryCoordinationState|inquiry_coordination_state/);
  assert.doesNotMatch(adapterSource, /pgTable|drizzle|migration|migrations|ALTER TABLE|CREATE TABLE/i);
  assert.doesNotMatch(adapterSource, /ObjectUploader|\/api\/objects|uploadURL|getUploadParameters/);
  assert.doesNotMatch(adapterSource, /passport|session|requireAuth|isAuthenticated/);
});
