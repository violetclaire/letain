import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const inquiryWorkspaceSource = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");

function sliceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing source marker: ${start}`);
  const endIndex = source.indexOf(end, startIndex);
  assert.notEqual(endIndex, -1, `Missing source end marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

function snippetsAround(source: string, marker: string): string {
  let snippets = "";
  let index = 0;

  while ((index = source.indexOf(marker, index)) !== -1) {
    snippets += source.slice(Math.max(0, index - 1200), Math.min(source.length, index + 1800));
    index += marker.length;
  }

  assert.notEqual(snippets, "", `Missing source marker: ${marker}`);
  return snippets;
}

const checklistHelper = sliceBetween(
  inquiryWorkspaceSource,
  "function buildOperatorReviewChecklist",
  "function detailList",
);

const checklistRender = snippetsAround(inquiryWorkspaceSource, "operator-review-checklist");
const checklistSource = `${checklistHelper}\n${checklistRender}`;

test("Inquiry Workspace renders an Operator review checklist only for review-needed decisions", () => {
  assert.match(checklistSource, /Operator review checklist/);
  assert.match(checklistSource, /operator-review-checklist/);
  assert.match(inquiryWorkspaceSource, /inquiryDecisionSummary\?\.label === "Needs operator review"/);
  assert.match(inquiryWorkspaceSource, /buildOperatorReviewChecklist/);
});

test("operator review checklist maps route target acceptance from existing missing signals", () => {
  assert.match(checklistHelper, /Route target acceptance/);
  assert.match(checklistHelper, /routeTargetAcceptanceMissing/);
  assert.match(checklistHelper, /assessmentIncludes\(assessment\?\.missingSignals, "Route target acceptance"\)/);
  assert.match(checklistHelper, /Not confirmed yet/);
  assert.match(checklistHelper, /Route target acceptance is still a missing signal before outreach/);
});

test("operator review checklist maps recovery coverage and handoff review from existing assessment fields", () => {
  assert.match(checklistHelper, /Recovery coverage/);
  assert.match(checklistHelper, /assessmentIncludes\(assessment\?\.missingSignals, "Recovery provider confirmation"\)/);
  assert.match(checklistHelper, /assessmentIncludes\(assessment\?\.riskFactors, "LOW_RECOVERY_CAPACITY"\)/);
  assert.match(checklistHelper, /Confirm recovery coverage before outreach/);
  assert.match(checklistHelper, /Handoff review/);
  assert.match(checklistHelper, /assessmentIncludes\(assessment\?\.riskFactors, "UNCONFIRMED_HANDOFF"\)/);
  assert.match(checklistHelper, /The handoff is drafted but not confirmed from current coordination evidence/);
});

test("operator review checklist uses already-loaded route contact readiness", () => {
  assert.match(checklistHelper, /Reachable route option/);
  assert.match(checklistHelper, /routeTargetHasReachableContact/);
  assert.match(checklistHelper, /routeTargetHasKnownButIncompleteContact/);
  assert.match(checklistHelper, /Reachable option exists/);
  assert.match(checklistHelper, /Known option needs contact review/);
  assert.match(checklistHelper, /Contact method missing/);
  assert.match(checklistHelper, /No route option from existing network data/);
});

test("operator review checklist shows the loaded recommended next action", () => {
  assert.match(checklistHelper, /Recommended next action/);
  assert.match(checklistHelper, /recommendedNextAction/);
  assert.match(checklistHelper, /Review before outreach/);
  assert.match(checklistHelper, /Review the current coordination permission before outreach/);
});

test("operator review checklist is explicitly private and read-only", () => {
  assert.match(checklistRender, /Private and read-only/);
  assert.match(checklistRender, /does not send, create a route, run preflight, contact anyone, create a client link, contract, or payment/);
  assert.match(checklistRender, /Before outreach/);
});

test("operator review checklist does not use AssistantControl or mutation endpoints", () => {
  assert.doesNotMatch(checklistSource, /AssistantControl/);
  assert.doesNotMatch(checklistSource, /apiRequest\(/);
  assert.doesNotMatch(checklistSource, /fetch\(/);
  assert.doesNotMatch(checklistSource, /method:\s*["']POST["']|method:\s*["']PATCH["']|method:\s*["']DELETE["']/);
  assert.doesNotMatch(checklistSource, /\/api\/inquiries\/[^"`']+\/routes|\/api\/inquiry-routes/);
  assert.doesNotMatch(checklistSource, /preflight\/preview|\/preflight/);
  assert.doesNotMatch(checklistSource, /sendSMS|sendSms|sendEmail|sendInfoSheetEmail|sendGeneralEmail/);
});

test("operator review checklist does not add schema, storage, auth, upload, contract, payment, AI, or public visibility behavior", () => {
  assert.doesNotMatch(checklistSource, /pgTable|drizzle|migration|migrations|ALTER TABLE|CREATE TABLE/i);
  assert.doesNotMatch(checklistSource, /server\/routes|server\/storage|storage\.|isAuthenticated|getAuthUserId|session|OIDC|replitAuth/);
  assert.doesNotMatch(checklistSource, /ObjectUploader|\/api\/objects|uploadURL|getUploadParameters/);
  assert.doesNotMatch(checklistSource, /\/api\/contracts|\/api\/square|\/api\/payments?|Square/);
  assert.doesNotMatch(checklistSource, /scheduleAI|processScheduleChat|aiChat|\/api\/schedule-ai|OpenAI|Anthropic/);
  assert.doesNotMatch(checklistSource, /public schedule|client link created|create client link/i);
  assert.doesNotMatch(checklistSource, /trust_score|provider_score|person_score|trustScore|providerScore|personScore/);
});
