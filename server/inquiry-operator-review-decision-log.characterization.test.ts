import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const inquiryWorkspaceSource = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");
const routesSource = readFileSync("server/routes.ts", "utf8");
const schemaSource = readFileSync("shared/schema.ts", "utf8");

function sourceAfter(marker: string, length = 5000): string {
  const start = inquiryWorkspaceSource.indexOf(marker);
  assert.notEqual(start, -1, `${marker} should exist`);
  return inquiryWorkspaceSource.slice(start, start + length);
}

const reviewLogSource = sourceAfter('data-testid="operator-review-decision-log"');
const reviewMutationSource = sourceAfter("const recordOperatorReview = useMutation", 4500);
const decisionSummarySource = sourceAfter("function buildInquiryDecisionSummary", 6500);

test("Operator review checklist renders a private review-log affordance", () => {
  assert.match(inquiryWorkspaceSource, /Operator review checklist/);
  assert.match(reviewLogSource, /Private review log/);
  assert.match(reviewLogSource, /Private review note/);
  assert.match(reviewLogSource, /operator-review-decision-log/);
  assert.match(reviewLogSource, /textarea-operator-review-note/);
  assert.match(reviewLogSource, /button-record-operator-review/);
  assert.match(reviewLogSource, /Record private review log/);
});

test("review log records neutral operator_reviewed coordination events through the existing owner-scoped endpoint", () => {
  assert.match(reviewMutationSource, /\/api\/coordination-paths\/\$\{encodeURIComponent\(selectedCoordinationPathId\)\}\/events/);
  assert.match(reviewMutationSource, /method: "POST"/);
  assert.match(reviewMutationSource, /eventType: "operator_reviewed"/);
  assert.match(reviewMutationSource, /eventSource: "operator"/);
  assert.match(reviewMutationSource, /signalProvenance: \[`coordination_path:\$\{selectedCoordinationPathId\}`\]/);
  assert.match(reviewMutationSource, /privateReviewLog: true/);
  assert.match(reviewMutationSource, /operatorReviewChecklistRows\.map/);

  assert.match(routesSource, /app\.post\("\/api\/coordination-paths\/:pathId\/events", isAuthenticated/);
  assert.match(routesSource, /loadCoordinationPathContext\(req, res\)/);
  assert.match(routesSource, /operatorId: context\.userId/);
  assert.match(routesSource, /inquiryId: context\.inquiry\.id/);
});

test("latest recorded review event can be displayed from the existing coordination path detail read", () => {
  assert.match(inquiryWorkspaceSource, /coordinationPathDetailQueryKey/);
  assert.match(inquiryWorkspaceSource, /fetch\(`\/api\/coordination-paths\/\$\{encodeURIComponent\(selectedCoordinationPathId\)\}`/);
  assert.match(inquiryWorkspaceSource, /events: Array\.isArray\(payload\?\.events\) \? payload\.events : \[\]/);
  assert.match(inquiryWorkspaceSource, /latestOperatorReviewEvent/);
  assert.match(inquiryWorkspaceSource, /event\.eventType === "operator_reviewed"/);
  assert.match(reviewLogSource, /Latest private review note/);
  assert.match(reviewLogSource, /formatDateTime\(latestOperatorReviewEvent\.createdAt\)/);
  assert.match(reviewLogSource, /latestOperatorReviewEvent\.summary/);
});

test("review log copy stays private and does not imply acceptance, approval, or external action", () => {
  assert.match(reviewLogSource, /Record a private review note for this coordination state/);
  assert.match(reviewLogSource, /This does not send, create a route, run preflight, contact anyone, create a client link, contract, or payment/);
  assert.match(reviewLogSource, /Operator-only artifact/);
  assert.doesNotMatch(reviewLogSource, /approval|approved|accepted|route approved|provider accepted|ready to send|send approval|contract approved|payment approved|client-visible/i);
});

test("review log does not assess paths or change permission decision logic", () => {
  assert.doesNotMatch(inquiryWorkspaceSource, /\/assess`|\/assess"/);
  assert.doesNotMatch(inquiryWorkspaceSource, /assessCoordinationPath|createCoordinationAssessment/);
  assert.doesNotMatch(decisionSummarySource, /operator_reviewed|recordOperatorReview|coordinationPathDetailQuery/);
});

test("review log does not introduce schema, backend route changes, sends, uploads, contracts, payments, AI, or public visibility", () => {
  assert.match(schemaSource, /export const coordinationEvents = pgTable\(\s*"coordination_events"/);
  assert.doesNotMatch(reviewMutationSource, /pgTable|drizzle|migration|migrations|ALTER TABLE|CREATE TABLE/i);
  assert.doesNotMatch(reviewMutationSource, /\/api\/inquiries\/[^"`']+\/routes|\/api\/inquiry-routes/);
  assert.doesNotMatch(reviewMutationSource, /preflight/);
  assert.doesNotMatch(reviewMutationSource, /sendEmail|sendSMS|sendInfoSheetEmail|sendGeneralEmail|\/api\/sms|\/api\/emails?/);
  assert.doesNotMatch(reviewMutationSource, /ObjectUploader|\/api\/objects|uploadURL|getUploadParameters/);
  assert.doesNotMatch(reviewMutationSource, /\/api\/contracts|\/api\/square|\/api\/payments?|Square/i);
  assert.doesNotMatch(reviewMutationSource, /scheduleAI|processScheduleChat|aiChat|\/api\/schedule-ai|OpenAI|Anthropic/);
  assert.doesNotMatch(reviewMutationSource, /public schedule|client link created|create client link/i);
});
