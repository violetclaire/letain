import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const inquiryWorkspaceSource = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");

function sliceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing source marker: ${start}`);
  const endIndex = source.indexOf(end, startIndex);
  assert.notEqual(endIndex, -1, `Missing source marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

function snippetsAround(source: string, marker: string): string {
  let snippets = "";
  let index = 0;

  while ((index = source.indexOf(marker, index)) !== -1) {
    snippets += source.slice(Math.max(0, index - 900), Math.min(source.length, index + 1300));
    index += marker.length;
  }

  assert.notEqual(snippets, "", `Missing source marker: ${marker}`);
  return snippets;
}

const decisionSummarySource = [
  sliceBetween(inquiryWorkspaceSource, "function buildOperatorReviewDetails", "function contactMetadataText"),
  sliceBetween(inquiryWorkspaceSource, "function buildInquiryDecisionSummary", "function textTokens"),
  snippetsAround(inquiryWorkspaceSource, "Can I respond yet?"),
  snippetsAround(inquiryWorkspaceSource, "operator-review-explanation"),
].join("\n");

test("Inquiry Workspace renders a read-only Can I respond yet decision summary", () => {
  assert.match(inquiryWorkspaceSource, /Can I respond yet\?/);
  assert.match(inquiryWorkspaceSource, /Nothing sends from this card/);
  assert.match(inquiryWorkspaceSource, /Briarwood checks the inquiry date, service need, availability, info sheet readiness, route options, and current coordination permission/);
  assert.match(inquiryWorkspaceSource, /Suggested next step/);
});

test("decision summary includes the v1 output states", () => {
  assert.match(inquiryWorkspaceSource, /Ready to respond/);
  assert.match(inquiryWorkspaceSource, /Needs missing info/);
  assert.match(inquiryWorkspaceSource, /Unavailable -- route options available/);
  assert.match(inquiryWorkspaceSource, /Unavailable -- route blocked by missing contact/);
  assert.match(inquiryWorkspaceSource, /Needs operator review/);
  assert.match(inquiryWorkspaceSource, /Stop -- do not respond yet/);
});

test("decision summary checks missing date, service need, and info sheet readiness", () => {
  assert.match(decisionSummarySource, /Need event date before responding/);
  assert.match(decisionSummarySource, /Need service details before responding/);
  assert.match(decisionSummarySource, /Pricing \/ Info Sheet not configured yet/);
  assert.match(decisionSummarySource, /infoSheetReady/);
  assert.match(decisionSummarySource, /inquiry\.eventDate/);
  assert.match(decisionSummarySource, /inquiry\.serviceType/);
  assert.match(decisionSummarySource, /inquiry\.eventType/);
  assert.match(decisionSummarySource, /inquiry\.message/);
});

test("decision summary uses availability, route contact readiness, and coordination permission", () => {
  assert.match(decisionSummarySource, /inquiry\.hasDateConflict/);
  assert.match(decisionSummarySource, /conflictSource/);
  assert.match(decisionSummarySource, /Reachable route option exists/);
  assert.match(decisionSummarySource, /routeTargetHasReachableContact/);
  assert.match(decisionSummarySource, /routeTargetHasKnownButIncompleteContact/);
  assert.match(decisionSummarySource, /Current coordination permission/);
  assert.match(decisionSummarySource, /permissionAssessment/);
  assert.match(decisionSummarySource, /PERMISSION_DECISION_LABELS/);
});

test("operator review state explains the loaded coordination assessment", () => {
  assert.match(decisionSummarySource, /operator-review-explanation/);
  assert.match(decisionSummarySource, /Operator review details/);
  assert.match(decisionSummarySource, /This is not a hard block/);
  assert.match(decisionSummarySource, /Review the current handoff and recovery context before outreach/);
  assert.match(decisionSummarySource, /buildOperatorReviewDetails/);
  assert.match(decisionSummarySource, /PROCEED_WITH_OVERSIGHT/);
  assert.match(decisionSummarySource, /Proceed with oversight: review handoff and recovery before outreach/);
  assert.match(decisionSummarySource, /Why review is needed/);
  assert.match(decisionSummarySource, /riskFactors/);
  assert.match(decisionSummarySource, /Missing signals/);
  assert.match(decisionSummarySource, /missingSignals/);
  assert.match(decisionSummarySource, /Human review required before outreach/);
  assert.match(decisionSummarySource, /humanJudgmentRequired/);
  assert.match(decisionSummarySource, /Recommended next action/);
  assert.match(decisionSummarySource, /recommendedNextAction/);
});

test("operator review state is explained by permission, not missing Pricing / Info Sheet", () => {
  assert.match(decisionSummarySource, /Pricing \/ Info Sheet ready/);
  assert.match(decisionSummarySource, /Permission reason/);
  assert.match(decisionSummarySource, /Coordination permission is \$\{PERMISSION_DECISION_LABELS\[permissionDecision\]\}/);
  assert.match(decisionSummarySource, /reviewDetails/);
});

test("decision summary stays read-only and does not introduce sends or mutations", () => {
  assert.doesNotMatch(decisionSummarySource, /fetch\(/);
  assert.doesNotMatch(decisionSummarySource, /method:\s*["']POST["']|method:\s*["']PATCH["']|method:\s*["']DELETE["']/);
  assert.doesNotMatch(decisionSummarySource, /\/api\/inquiry-routes\/[^"`']+\/preflight/);
  assert.doesNotMatch(decisionSummarySource, /\/api\/inquiry-responses|\/api\/inquiries\/[^"`']+\/composer/);
  assert.doesNotMatch(decisionSummarySource, /sendSMS|sendSms|sendEmail|sendInfoSheetEmail|sendProposalEmail/);
});

test("decision summary does not add schema, payment, contract, upload, auth, or score language", () => {
  assert.doesNotMatch(decisionSummarySource, /pgTable|drizzle|migration|migrations/i);
  assert.doesNotMatch(decisionSummarySource, /createPayment|Square|contract|ObjectUploader|\/api\/objects|uploadURL|getUploadParameters/);
  assert.doesNotMatch(decisionSummarySource, /isAuthenticated|getAuthUserId|session|OIDC|replitAuth/);
  assert.doesNotMatch(decisionSummarySource, /trust_score|provider_score|person_score|trustScore|providerScore|personScore/);
  assert.doesNotMatch(decisionSummarySource, /trust score|provider score|person score|reputation|ranking|paid placement/i);
});
