import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const inquiryWorkspaceSource = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");
const queryAdapterSource = readFileSync("client/src/lib/permissionedNextStepQuery.ts", "utf8");
const routesSource = readFileSync("server/routes.ts", "utf8");
const schemaSource = readFileSync("shared/schema.ts", "utf8");

function sourceBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `${startMarker} should exist`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `${endMarker} should exist after ${startMarker}`);
  return source.slice(start, end);
}

const decisionSummaryIndex = inquiryWorkspaceSource.indexOf('data-testid="inquiry-decision-summary-card"');
const permissionedSurfaceIndex = inquiryWorkspaceSource.indexOf('data-testid="permissioned-next-step-card"');
const availabilityIndex = inquiryWorkspaceSource.indexOf('data-testid="availability-readiness-card"');
const permissionedSurfaceSource = sourceBetween(
  inquiryWorkspaceSource,
  'data-testid="permissioned-next-step-card"',
  'data-testid="availability-readiness-card"',
);

test("Permissioned next step surface is placed between response decision and availability readiness", () => {
  assert.notEqual(decisionSummaryIndex, -1, "Can I respond yet? card should exist");
  assert.notEqual(permissionedSurfaceIndex, -1, "Permissioned next step card should exist");
  assert.notEqual(availabilityIndex, -1, "Availability readiness card should exist");
  assert.ok(
    decisionSummaryIndex < permissionedSurfaceIndex && permissionedSurfaceIndex < availabilityIndex,
    "Permissioned next step should appear immediately after Can I respond yet? and before Availability readiness",
  );
  assert.match(permissionedSurfaceSource, /Permissioned next step/);
  assert.match(permissionedSurfaceSource, /Private read-only query/);
});

test("surface uses the already-assembled private query answers and preferred query types", () => {
  assert.match(inquiryWorkspaceSource, /const permissionedNextStepQueryAnswers = useMemo/);
  assert.match(permissionedSurfaceSource, /safeNextStepAnswer/);
  assert.match(permissionedSurfaceSource, /blockingIssuesAnswer/);
  assert.match(permissionedSurfaceSource, /operatorReviewAnswer/);
  assert.match(permissionedSurfaceSource, /humanApprovalAnswer/);
  assert.match(inquiryWorkspaceSource, /queryType === "what_safe_next_step_label_can_be_shown"/);
  assert.match(inquiryWorkspaceSource, /queryType === "what_blocks_response_readiness"/);
  assert.match(inquiryWorkspaceSource, /queryType === "what_must_be_reviewed_before_outreach"/);
  assert.match(inquiryWorkspaceSource, /queryType === "what_human_approval_is_required"/);
});

test("surface renders only allowed operator-visible fields", () => {
  for (const allowedField of [
    "safeNextStepLabel",
    "requiresHumanApproval",
    "blockingIssues",
    "recommendedOperatorReview",
    "authoritativeSignals",
    "nonAuthoritativeSignals",
  ]) {
    assert.match(permissionedSurfaceSource, new RegExp(allowedField));
  }

  assert.doesNotMatch(permissionedSurfaceSource, /sourceArtifacts/);
  assert.doesNotMatch(permissionedSurfaceSource, /forbiddenActions/);
  assert.doesNotMatch(permissionedSurfaceSource, /PERMISSIONED_NEXT_STEP_FORBIDDEN_ACTIONS/);
  assert.doesNotMatch(permissionedSurfaceSource, /JSON\.stringify/);
});

test("surface includes exact safety and boundary copy", () => {
  assert.match(
    permissionedSurfaceSource,
    /Private and read-only\. This query surfaces what the current coordination state allows the operator to review next\. It does not send, approve, route, run preflight, contact anyone, create a client link, contract, payment, public schedule, or AI decision\./,
  );
  assert.match(permissionedSurfaceSource, /Review is not approval\. Evidence is not acceptance\./);
});

test("surface does not introduce buttons, forms, CTAs, action links, or forbidden authority language", () => {
  assert.doesNotMatch(permissionedSurfaceSource, /<button|\bButton\b|<form|<textarea|onClick=|href=|<Link\b|useMutation|mutate\(/);
  assert.doesNotMatch(permissionedSurfaceSource, /Ready to send|Approved|Accepted|Confirmed|Available|Provider accepted|Route approved|Send now|Book|Publish|AI recommends/);
  assert.doesNotMatch(permissionedSurfaceSource, /client-visible|ready to send|route accepted|provider accepted/i);
});

test("operator surface does not add backend, schema, assess, AI, send, upload, contract, payment, public, or client-link behavior", () => {
  assert.doesNotMatch(routesSource, /permissioned-next-step|PermissionedNextStepQuery|next-step-query/);
  assert.doesNotMatch(schemaSource, /permissioned_next_step|PermissionedNextStepQuery|nextStepQuery/);
  assert.doesNotMatch(queryAdapterSource, /\/assess|assessCoordinationPath|createCoordinationAssessment/);
  assert.doesNotMatch(inquiryWorkspaceSource, /\/assess|assessCoordinationPath|createCoordinationAssessment/);
  assert.doesNotMatch(permissionedSurfaceSource, /OpenAI|Anthropic|scheduleAI|processScheduleChat|\/api\/schedule-ai/);
  assert.doesNotMatch(permissionedSurfaceSource, /sendEmail|sendSMS|sendInfoSheetEmail|sendGeneralEmail|\/api\/sms|\/api\/emails?/);
  assert.doesNotMatch(permissionedSurfaceSource, /ObjectUploader|\/api\/objects|uploadURL|getUploadParameters/);
  assert.doesNotMatch(permissionedSurfaceSource, /\/api\/contracts|\/api\/square|\/api\/payments?|Square/i);
  assert.doesNotMatch(permissionedSurfaceSource, /createClientLink|clientLink|client link created|public\/client/i);
});
