import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const inquiryWorkspaceSource = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");
const routesSource = readFileSync("server/routes.ts", "utf8");
const schemaSource = readFileSync("shared/schema.ts", "utf8");

function sourceAfter(marker: string, length = 6000): string {
  const start = inquiryWorkspaceSource.indexOf(marker);
  assert.notEqual(start, -1, `${marker} should exist`);
  return inquiryWorkspaceSource.slice(start, start + length);
}

function sourceBetween(startMarker: string, endMarker: string): string {
  const start = inquiryWorkspaceSource.indexOf(startMarker);
  assert.notEqual(start, -1, `${startMarker} should exist`);
  const end = inquiryWorkspaceSource.indexOf(endMarker, start);
  assert.notEqual(end, -1, `${endMarker} should exist after ${startMarker}`);
  return inquiryWorkspaceSource.slice(start, end);
}

const evidenceActionsSource = sourceBetween(
  "const ROUTE_RECOVERY_EVIDENCE_ACTIONS",
  "const ROUTE_RECOVERY_EVIDENCE_EVENT_TYPES",
);
const evidenceLogSource = sourceAfter('data-testid="route-recovery-evidence-log"', 7500);
const evidenceMutationSource = sourceAfter("const recordRouteRecoveryEvidence = useMutation", 4500);
const timelineBuilderSource = sourceAfter("function buildInquiryEventTimeline", 6500);
const decisionSummarySource = sourceAfter("function buildInquiryDecisionSummary", 6500);

test("Inquiry Workspace renders private route and recovery evidence log controls", () => {
  assert.match(evidenceLogSource, /Private route \/ recovery evidence log/);
  assert.match(evidenceLogSource, /Evidence only/);
  assert.match(evidenceLogSource, /Latest private route\/recovery evidence/);
  assert.match(evidenceLogSource, /ROUTE_RECOVERY_EVIDENCE_ACTIONS\.map/);
  assert.match(evidenceLogSource, /data-testid=\{`button-\$\{action\.eventType\}`\}/);
  assert.match(evidenceActionsSource, /Log route option review/);
  assert.match(evidenceActionsSource, /Log recovery coverage review/);
  assert.match(evidenceActionsSource, /Log handoff review/);
});

test("neutral evidence event types are limited to route, recovery, and handoff review", () => {
  assert.match(evidenceActionsSource, /eventType: "route_option_reviewed"/);
  assert.match(evidenceActionsSource, /eventType: "recovery_coverage_reviewed"/);
  assert.match(evidenceActionsSource, /eventType: "handoff_reviewed"/);
  assert.match(inquiryWorkspaceSource, /type RouteRecoveryEvidenceEventType =/);
  assert.match(inquiryWorkspaceSource, /isRouteRecoveryEvidenceEventType/);
  assert.doesNotMatch(evidenceActionsSource, /accepted|committed|confirmed|approved|sent|client-visible|ready to send/i);
});

test("evidence log writes only neutral operator coordination events through the existing owner-scoped endpoint", () => {
  assert.match(evidenceMutationSource, /\/api\/coordination-paths\/\$\{encodeURIComponent\(selectedCoordinationPathId\)\}\/events/);
  assert.match(evidenceMutationSource, /method: "POST"/);
  assert.match(evidenceMutationSource, /eventType: action\.eventType/);
  assert.match(evidenceMutationSource, /eventSource: "operator"/);
  assert.match(evidenceMutationSource, /signalProvenance: \[`coordination_path:\$\{selectedCoordinationPathId\}`\]/);
  assert.match(evidenceMutationSource, /privateEvidenceLog: true/);
  assert.match(evidenceMutationSource, /evidenceType: action\.eventType/);

  assert.match(routesSource, /app\.post\("\/api\/coordination-paths\/:pathId\/events", isAuthenticated/);
  assert.match(routesSource, /loadCoordinationPathContext\(req, res\)/);
  assert.match(routesSource, /operatorId: context\.userId/);
  assert.match(routesSource, /inquiryId: context\.inquiry\.id/);
});

test("private route and recovery evidence events appear in the private Inquiry Event Timeline", () => {
  assert.match(timelineBuilderSource, /isRouteRecoveryEvidenceEventType\(event\.eventType\)/);
  assert.match(timelineBuilderSource, /marker: "Private review"/);
  assert.match(timelineBuilderSource, /label: "Private route\/recovery evidence logged"/);
  assert.match(timelineBuilderSource, /sentenceLabel\(event\.eventType\)/);
  assert.match(timelineBuilderSource, /event\.summary/);
});

test("copy keeps private evidence separate from acceptance, route creation, preflight, and external action", () => {
  assert.match(evidenceLogSource, /Operator-only evidence/);
  assert.match(evidenceLogSource, /do not confirm provider acceptance/);
  assert.match(evidenceLogSource, /create a route/);
  assert.match(evidenceLogSource, /run preflight/);
  assert.match(evidenceLogSource, /contact anyone/);
  assert.match(evidenceLogSource, /send anything/);
  assert.match(evidenceLogSource, /create a client link/);
  assert.match(evidenceLogSource, /approve contracts or payments/);
  assert.doesNotMatch(evidenceLogSource, /route accepted|provider accepted|accepted|committed|confirmed|approved|sent|client-visible|ready to send/i);
});

test("evidence log does not mutate inquiry routes or create route/preflight behavior", () => {
  assert.doesNotMatch(evidenceMutationSource, /\/api\/inquiries\/[^"`']+\/routes|\/api\/inquiry-routes/);
  assert.doesNotMatch(evidenceMutationSource, /inquiry_routes|inquiryRoutes|updateInquiryRoute|createInquiryRoute/);
  assert.doesNotMatch(evidenceMutationSource, /status:\s*"(accepted|declined|pending|sent_to_client|completed)"/);
  assert.doesNotMatch(evidenceMutationSource, /preflight|route_preflight|sendSms|sendGeneralEmail/);
});

test("evidence log does not assess paths or change permission decision logic", () => {
  assert.doesNotMatch(inquiryWorkspaceSource, /\/assess`|\/assess"/);
  assert.doesNotMatch(inquiryWorkspaceSource, /assessCoordinationPath|createCoordinationAssessment/);
  assert.doesNotMatch(decisionSummarySource, /route_option_reviewed|recovery_coverage_reviewed|handoff_reviewed|recordRouteRecoveryEvidence/);
});

test("evidence log introduces no schema, backend route, storage, auth, sends, uploads, contracts, payments, AI, or public changes", () => {
  assert.match(schemaSource, /export const coordinationEvents = pgTable\(\s*"coordination_events"/);
  assert.doesNotMatch(evidenceMutationSource, /pgTable|drizzle|migration|migrations|ALTER TABLE|CREATE TABLE/i);
  assert.doesNotMatch(evidenceMutationSource, /ObjectUploader|\/api\/objects|uploadURL|getUploadParameters/);
  assert.doesNotMatch(evidenceMutationSource, /\/api\/contracts|\/api\/square|\/api\/payments?|Square/i);
  assert.doesNotMatch(evidenceMutationSource, /scheduleAI|processScheduleChat|aiChat|\/api\/schedule-ai|OpenAI|Anthropic/);
  assert.doesNotMatch(evidenceMutationSource, /public schedule|public\/client|client link created|create client link/i);
});
