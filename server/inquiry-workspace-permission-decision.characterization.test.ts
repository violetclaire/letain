import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const inquiryWorkspace = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");
const routesSource = readFileSync("server/routes.ts", "utf8");

test("Inquiry Workspace reads current permission decision from existing coordination path route", () => {
  assert.match(
    inquiryWorkspace,
    /fetch\(`\/api\/inquiries\/\$\{encodeURIComponent\(selectedInquiryId\)\}\/coordination-paths`, \{ credentials: "include" \}\)/,
  );
  assert.match(inquiryWorkspace, /queryKey: coordinationPathsQueryKey\(selectedInquiryId\)/);
  assert.match(inquiryWorkspace, /const selectedCoordinationPath = coordinationPathsQuery\.data\?\.paths\[0\] \?\? null/);
  assert.match(inquiryWorkspace, /const selectedPermissionAssessment = selectedCoordinationPath\?\.latestAssessment \?\? null/);
});

test("Inquiry Workspace renders a compact read-only inquiry readiness card", () => {
  assert.match(inquiryWorkspace, /data-testid="inquiry-readiness-card"/);
  assert.match(inquiryWorkspace, /Inquiry readiness/);
  assert.match(inquiryWorkspace, /Availability context first, then the current coordination permission\./);
  assert.match(inquiryWorkspace, /Availability check/);
  assert.match(inquiryWorkspace, /selectedInquiry\.hasDateConflict/);
  assert.match(inquiryWorkspace, /selectedInquiry\.conflictSource/);
  assert.match(inquiryWorkspace, /No date conflict recorded from current inquiry checks\./);
  assert.match(inquiryWorkspace, /Requested date is not available yet; review availability manually\./);
  assert.match(inquiryWorkspace, /Loading inquiry readiness/);
  assert.match(inquiryWorkspace, /No coordination path has been recorded for this inquiry yet\./);
  assert.match(inquiryWorkspace, /Coordination path exists, but no permission decision has been recorded yet\./);
  assert.match(inquiryWorkspace, /Could not load inquiry readiness\./);
  assert.match(inquiryWorkspace, /Coordination permission/);
  assert.match(inquiryWorkspace, /Recommended next action/);
  assert.match(inquiryWorkspace, /Risk factors/);
  assert.match(inquiryWorkspace, /Missing signals/);
  assert.match(inquiryWorkspace, /Human review required/);
});

test("Inquiry Workspace links to the full coordination path panel", () => {
  assert.match(
    inquiryWorkspace,
    /`\/admin\/\$\{artistSlug\}\/coordination\/\$\{selectedCoordinationPath\.path\.id\}`/,
  );
  assert.match(inquiryWorkspace, /data-testid="link-open-coordination-path"/);
  assert.match(inquiryWorkspace, /Open full path/);
});

test("Inquiry Workspace permission summary stays read-only", () => {
  assert.doesNotMatch(inquiryWorkspace, /\/api\/coordination-paths\/\$\{[^}]+\}\/assess/);
  assert.doesNotMatch(inquiryWorkspace, /\/assess`/);
  assert.doesNotMatch(inquiryWorkspace, /fetch\(`\/api\/inquiries\/\$\{[^}]+\}\/coordination-paths`,\s*\{\s*method: "POST"/);
  assert.doesNotMatch(inquiryWorkspace, /apiRequest\("POST",\s*`\/api\/coordination-paths/);
  assert.doesNotMatch(inquiryWorkspace, /createCoordinationPath|createCoordinationAssessment|assessCoordinationPath/);
});

test("Inquiry Workspace permission summary does not introduce score or ranking language", () => {
  assert.doesNotMatch(inquiryWorkspace, /trust_score|provider_score|trustScore|providerScore/);
  assert.doesNotMatch(inquiryWorkspace, /person score|provider score|trust score|reputation|ranking|paid placement/i);
});

test("coordination path list route still returns latestAssessment", () => {
  assert.match(routesSource, /app\.get\("\/api\/inquiries\/:id\/coordination-paths", isAuthenticated/);
  assert.match(routesSource, /const latestAssessments = await Promise\.all/);
  assert.match(routesSource, /latestAssessment: latestAssessments\[index\] \?\? null/);
});

test("permission decision characterization remains source-only", () => {
  const testSource = readFileSync("server/inquiry-workspace-permission-decision.characterization.test.ts", "utf8");

  assert.match(testSource, /readFileSync/);
  assert.doesNotMatch(testSource, /from ["']@shared\/schema["']/);
  assert.doesNotMatch(testSource, /from ["']\.\/routes["']/);
  assert.doesNotMatch(testSource, /process\.env\.[A-Z_]+\s*=/);
});
