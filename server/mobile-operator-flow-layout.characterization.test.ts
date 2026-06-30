import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const inquiryWorkspaceSource = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");
const scheduleDraftBuilderSource = readFileSync("client/src/pages/ScheduleDraftBuilder.tsx", "utf8");

function sliceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing source marker: ${start}`);
  const endIndex = source.indexOf(end, startIndex);
  assert.notEqual(endIndex, -1, `Missing source end marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

const inquiryListShell = sliceBetween(
  inquiryWorkspaceSource,
  'data-testid="workspace-populated"',
  'data-testid="inquiry-detail-shell"',
);

const scheduleHeader = sliceBetween(
  scheduleDraftBuilderSource,
  'data-testid="link-back-workspace"',
  '{draftQuery.isLoading &&',
);

const scheduleLaneSection = sliceBetween(
  scheduleDraftBuilderSource,
  'data-testid="section-lanes"',
  "{/* datalists offer service + provider suggestions while editing cells */}",
);

const scheduleDefaultsSection = sliceBetween(
  scheduleDraftBuilderSource,
  'data-testid="section-service-defaults"',
  "{/* Providers */}",
);

test("Inquiry Workspace mobile inquiry list and filters use overflow-safe layout classes", () => {
  assert.match(inquiryWorkspaceSource, /grid min-w-0 gap-5 lg:grid-cols-\[360px_minmax\(0,1fr\)\]/);
  assert.match(inquiryListShell, /min-w-0 w-full max-w-full overflow-hidden border border-hairline bg-surface h-fit/);
  assert.match(inquiryListShell, /flex flex-wrap items-center justify-between gap-3/);
  assert.match(inquiryListShell, /relative block min-w-0/);
  assert.match(inquiryListShell, /w-full max-w-full border border-hairline bg-bg/);
  assert.match(inquiryListShell, /grid min-w-0 gap-2 sm:grid-cols-2/);
  assert.match(inquiryListShell, /min-w-0 sm:col-span-2/);
});

test("Schedule Draft Builder mobile header actions wrap instead of widening the viewport", () => {
  assert.match(scheduleHeader, /Back to workspace/);
  assert.doesNotMatch(scheduleDraftBuilderSource, /Back to network/);
  assert.match(scheduleHeader, /flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between/);
  assert.match(scheduleHeader, /flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end sm:shrink-0/);
  assert.match(scheduleHeader, /flex flex-wrap items-center gap-2 sm:flex-nowrap/);
  assert.match(scheduleHeader, /inline-flex flex-1 items-center justify-center gap-2 border border-hairline/);
  assert.match(scheduleHeader, /inline-flex flex-1 items-center justify-center gap-2 bg-ink text-bg/);
  assert.match(scheduleHeader, /sm:text-right/);
});

test("editable schedule rows use mobile-safe grids and wrapped controls", () => {
  assert.match(scheduleLaneSection, /grid min-w-0 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3/);
  assert.match(scheduleLaneSection, /min-w-0 border border-hairline bg-surface/);
  assert.match(scheduleLaneSection, /min-w-0 rounded-sm p-3 bg-bg border/);
  assert.match(scheduleLaneSection, /grid min-w-0 grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2/);
  assert.match(scheduleLaneSection, /flex flex-col gap-2 mt-3 pt-2 border-t border-hairline\/60 sm:flex-row/);
  assert.match(scheduleLaneSection, /flex min-w-0 flex-col gap-1 text-\[10px\]/);
  assert.match(scheduleLaneSection, /w-full min-w-0 bg-transparent border border-hairline/);
});

test("service default editor controls stack safely on mobile", () => {
  assert.match(scheduleDefaultsSection, /flex flex-col gap-3 sm:flex-row sm:items-center/);
  assert.match(scheduleDefaultsSection, /w-full min-w-0 flex-1 bg-bg border border-hairline/);
  assert.match(scheduleDefaultsSection, /w-24 bg-bg border border-hairline/);
  assert.match(scheduleDefaultsSection, /w-fit text-ink\/40 hover:text-oxblood/);
});

test("mobile layout tightening does not add risky behavior or new systems", () => {
  const touchedLayoutSource = [
    inquiryListShell,
    scheduleHeader,
    scheduleLaneSection,
    scheduleDefaultsSection,
  ].join("\n");

  assert.doesNotMatch(touchedLayoutSource, /fetch\(|apiRequest|method:\s*["']POST["']|method:\s*["']PATCH["']|method:\s*["']DELETE["']/);
  assert.doesNotMatch(touchedLayoutSource, /pgTable|drizzle|migration|migrations|ALTER TABLE|CREATE TABLE/i);
  assert.doesNotMatch(touchedLayoutSource, /server\/routes|server\/storage|storage\.|isAuthenticated|getAuthUserId|session|OIDC|replitAuth/);
  assert.doesNotMatch(touchedLayoutSource, /ObjectUploader|\/api\/objects|uploadURL|getUploadParameters/);
  assert.doesNotMatch(touchedLayoutSource, /\/api\/contracts|\/api\/square|\/api\/payments?|Square/);
  assert.doesNotMatch(touchedLayoutSource, /OpenAI|Anthropic|scheduleAI|processScheduleChat|\/api\/schedule-ai/);
  assert.doesNotMatch(touchedLayoutSource, /public schedule|client link created|create client link/i);
  assert.doesNotMatch(touchedLayoutSource, /AssistantControl|auto-send|autonomous/i);
});
