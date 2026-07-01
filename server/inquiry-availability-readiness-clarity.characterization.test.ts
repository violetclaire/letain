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

const availabilityHelperSource = sliceBetween(
  inquiryWorkspaceSource,
  "function buildAvailabilityReadinessRows",
  "function detailList",
);

const availabilityRenderSource = sliceBetween(
  inquiryWorkspaceSource,
  'data-testid="availability-readiness-card"',
  'data-testid="operator-review-checklist"',
);

const availabilitySource = `${availabilityHelperSource}\n${availabilityRenderSource}`;
const decisionSummarySource = sliceBetween(
  inquiryWorkspaceSource,
  "function buildInquiryDecisionSummary",
  "function textTokens",
);

test("Inquiry Workspace renders an Availability Readiness detail card", () => {
  assert.match(availabilitySource, /Availability readiness/);
  assert.match(availabilitySource, /availability-readiness-card/);
  assert.match(availabilitySource, /Read-only calendar signal for operator review/);
  assert.match(availabilitySource, /Read-only signal/);
  assert.match(inquiryWorkspaceSource, /buildAvailabilityReadinessRows/);
  assert.match(inquiryWorkspaceSource, /availabilityReadinessRows/);
});

test("availability readiness shows date signal from existing inquiry data", () => {
  assert.match(availabilityHelperSource, /Date signal/);
  assert.match(availabilityHelperSource, /inquiry\.eventDate/);
  assert.match(availabilityHelperSource, /formatDate\(inquiry\.eventDate\)/);
  assert.match(availabilityHelperSource, /Requested date present/);
  assert.match(availabilityHelperSource, /Requested date is missing/);
  assert.match(availabilityHelperSource, /calendar\/source-of-truth review still needs operator attention/);
});

test("availability readiness shows conflict or no-conflict signal from existing inquiry data only", () => {
  assert.match(availabilityHelperSource, /Conflict signal/);
  assert.match(availabilityHelperSource, /inquiry\.hasDateConflict/);
  assert.match(availabilityHelperSource, /inquiry\.conflictSource/);
  assert.match(availabilityHelperSource, /No conflict surfaced/);
  assert.match(availabilityHelperSource, /A conflict is recorded from existing inquiry checks/);
  assert.match(availabilityHelperSource, /No conflict surfaced from currently loaded inquiry data/);
  assert.match(availabilityHelperSource, /This does not prove the date is open/);
});

test("availability readiness includes calendar source-of-truth review and safety copy", () => {
  assert.match(availabilityHelperSource, /Calendar\/source-of-truth review/);
  assert.match(availabilityHelperSource, /Needs operator review/);
  assert.match(availabilityHelperSource, /Review the calendar\/source of truth before outreach/);
  assert.match(availabilityHelperSource, /No hold created/);
  assert.match(availabilityHelperSource, /Nothing sends/);
  assert.match(availabilityHelperSource, /No contracted work is created/);
  assert.match(availabilityRenderSource, /does not prove availability/);
  assert.match(availabilityRenderSource, /create a hold/);
  assert.match(availabilityRenderSource, /send anything/);
  assert.match(availabilityRenderSource, /change a schedule/);
  assert.match(availabilityRenderSource, /create contracted work/);
});

test("availability readiness does not overclaim calendar configuration or response safety", () => {
  assert.doesNotMatch(availabilitySource, /calendar is fully connected|calendar is fully configured|calendar configured/i);
  assert.doesNotMatch(availabilitySource, /date is available|fully available|safe to respond/i);
  assert.doesNotMatch(availabilitySource, /hold placed|date blocked|scheduled work created/i);
});

test("availability readiness stays read-only and does not introduce action paths", () => {
  assert.doesNotMatch(availabilitySource, /fetch\(|apiRequest\(|useMutation/);
  assert.doesNotMatch(availabilitySource, /method:\s*["']POST["']|method:\s*["']PATCH["']|method:\s*["']DELETE["']/);
  assert.doesNotMatch(availabilitySource, /\/api\/holds|\/api\/blocked-dates|\/api\/bookings|\/api\/schedule-drafts/);
  assert.doesNotMatch(availabilitySource, /sendSMS|sendSms|sendEmail|sendInfoSheetEmail|sendProposalEmail/);
  assert.doesNotMatch(availabilitySource, /createContract|createPayment|Square|client link|public schedule/i);
});

test("availability readiness does not change the response decision or permission logic", () => {
  assert.doesNotMatch(decisionSummarySource, /buildAvailabilityReadinessRows|availabilityReadinessRows|availability-readiness-card/);
  assert.doesNotMatch(decisionSummarySource, /Calendar\/source-of-truth review/);
  assert.doesNotMatch(decisionSummarySource, /No hold created|No contracted work is created/);
});

test("availability readiness introduces no schema, route, storage, auth, upload, payment, AI, or public visibility behavior", () => {
  assert.doesNotMatch(availabilitySource, /pgTable|drizzle|migration|migrations|ALTER TABLE|CREATE TABLE/i);
  assert.doesNotMatch(availabilitySource, /server\/routes|server\/storage|storage\.|isAuthenticated|getAuthUserId|session|OIDC|replitAuth/);
  assert.doesNotMatch(availabilitySource, /ObjectUploader|\/api\/objects|uploadURL|getUploadParameters/);
  assert.doesNotMatch(availabilitySource, /\/api\/contracts|\/api\/square|\/api\/payments?|Square/i);
  assert.doesNotMatch(availabilitySource, /scheduleAI|processScheduleChat|aiChat|\/api\/schedule-ai|OpenAI|Anthropic/);
  assert.doesNotMatch(availabilitySource, /public schedule|public\/client|client link created|create client link/i);
});
