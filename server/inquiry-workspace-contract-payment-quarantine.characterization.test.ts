import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const inquiryWorkspaceSource = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");
const inquiryWorkspaceActionSource = inquiryWorkspaceSource.replace(
  /It does not send, approve, route, run preflight, contact anyone, create a client link, contract, payment, public schedule, or AI decision\./g,
  "",
);

test("Inquiry Workspace quarantines passive contract and payment panels", () => {
  assert.doesNotMatch(inquiryWorkspaceSource, /data-testid="contract-summary-card"/);
  assert.doesNotMatch(inquiryWorkspaceSource, /data-testid="payment-summary-card"/);
  assert.doesNotMatch(inquiryWorkspaceSource, /Payment summary/);
  assert.doesNotMatch(inquiryWorkspaceSource, /Open contract/);
  assert.doesNotMatch(inquiryWorkspaceSource, /data-testid="link-open-contract"/);
});

test("Inquiry Workspace does not fetch vault contracts for hidden panels", () => {
  assert.doesNotMatch(inquiryWorkspaceSource, /\/api\/vault\/contracts/);
  assert.doesNotMatch(inquiryWorkspaceSource, /contractSummaryQuery/);
  assert.doesNotMatch(inquiryWorkspaceSource, /contractSummaryQueryKey/);
  assert.doesNotMatch(inquiryWorkspaceSource, /ContractSummaryResponse/);
});

test("active inquiry readiness spine remains visible", () => {
  assert.match(inquiryWorkspaceSource, /Can I respond yet\?/);
  assert.match(inquiryWorkspaceSource, /data-testid="info-sheet-readiness-card"/);
  assert.match(inquiryWorkspaceSource, /Operator review checklist/);
  assert.match(inquiryWorkspaceSource, /data-testid="schedule-draft-card"/);
  assert.match(inquiryWorkspaceSource, /Open schedule draft/);
  assert.match(inquiryWorkspaceSource, /Nothing sends and no client link exists/);
});

test("contract and payment quarantine does not add risky systems", () => {
  assert.doesNotMatch(inquiryWorkspaceSource, /pgTable|drizzle|migration|migrations|ALTER TABLE|CREATE TABLE/i);
  assert.doesNotMatch(inquiryWorkspaceSource, /server\/routes|server\/storage|storage\.|getAuthUserId|OIDC|replitAuth/);
  assert.doesNotMatch(inquiryWorkspaceSource, /ObjectUploader|\/api\/objects|uploadURL|getUploadParameters/);
  assert.doesNotMatch(inquiryWorkspaceSource, /createPayment|Square|squarePaymentLink|sendPaymentLink/);
  assert.doesNotMatch(inquiryWorkspaceSource, /scheduleAI|processScheduleChat|\/api\/schedule-ai|OpenAI|Anthropic/);
  assert.doesNotMatch(inquiryWorkspaceActionSource, /create public schedule|publish schedule|public schedule button|public schedule link/i);
  assert.doesNotMatch(inquiryWorkspaceActionSource, /client link created|create client link|client link action/i);
  assert.doesNotMatch(inquiryWorkspaceActionSource, /create\s+(?:a\s+)?contract\b|open contract|contract action/i);
  assert.doesNotMatch(inquiryWorkspaceActionSource, /create payment|collect payment|payment action|payment link action/i);
  assert.doesNotMatch(inquiryWorkspaceActionSource, /create invoice|send invoice|invoice action/i);
  assert.doesNotMatch(inquiryWorkspaceActionSource, /send action|send now/i);
});
