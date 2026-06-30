import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const artistAdminSource = readFileSync("client/src/pages/ArtistAdmin.tsx", "utf8");

function sliceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing source marker: ${start}`);
  const endIndex = source.indexOf(end, startIndex);
  assert.notEqual(endIndex, -1, `Missing source end marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

const commandCenterSource = sliceBetween(
  artistAdminSource,
  'data-testid="operator-command-center"',
  "</section>",
);

const menuSource = sliceBetween(
  artistAdminSource,
  "{menuOpen && (",
  "{useSessionAuth && (",
);

test("/admin/:slug presents a Briarwood operator command center", () => {
  assert.match(artistAdminSource, /Private coordination command center/);
  assert.match(commandCenterSource, /Operator Command Center/);
  assert.match(commandCenterSource, /Briarwood is a private coordination system made of bounded service states/);
  assert.match(commandCenterSource, /External action stays operator-approved/);
  assert.match(commandCenterSource, /Nothing here decides, sends, schedules,\s*contracts, or collects payment end-to-end/);
});

test("command center makes Inquiry Workspace prominent", () => {
  assert.match(commandCenterSource, /command-center-inquiry-workspace/);
  assert.match(commandCenterSource, /Inquiry Workspace/);
  assert.match(commandCenterSource, /Review live inquiries and decide what can happen next/);
  assert.match(commandCenterSource, /href="\/inquiry-workspace"/);
  assert.match(commandCenterSource, /response readiness, operator review,\s*route candidates, pricing info, and schedule handoff/);
});

test("command center exposes the intended operator IA groups", () => {
  for (const label of [
    "Needs attention",
    "Inquiries",
    "Schedule drafts",
    "Private network",
    "People / records",
    "Settings / Pricing Info",
    "Availability",
  ]) {
    assert.match(commandCenterSource, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const testId of [
    "command-center-needs-attention",
    "command-center-inquiries",
    "command-center-schedule-drafts",
    "command-center-private-network",
    "command-center-people-records",
    "command-center-settings-pricing",
    "command-center-availability",
  ]) {
    assert.match(commandCenterSource, new RegExp(testId));
  }
});

test("primary command center avoids booking, marketplace, contract, payment, and assistant framing", () => {
  assert.doesNotMatch(commandCenterSource, /Create Invoice|Create Contract|Payment|Payments|Square/);
  assert.doesNotMatch(commandCenterSource, /Proposal|Proposals|Contract summary|Payment summary/);
  assert.doesNotMatch(commandCenterSource, /clients can book|booking dashboard|marketplace|search\/browse/i);
  assert.doesNotMatch(commandCenterSource, /AI assistant|AssistantControl|Your Secretary|autonomous|auto-send/i);
  assert.doesNotMatch(commandCenterSource, /send email|send sms|send info/i);
});

test("operator menu uses Briarwood IA labels and keeps assistant/payment surfaces out of primary nav", () => {
  assert.match(menuSource, /nav-inquiry-workspace/);
  assert.match(menuSource, /Inquiry Workspace/);
  assert.match(menuSource, /Availability/);
  assert.match(menuSource, /Private network/);
  assert.match(menuSource, /People \/ records/);
  assert.match(menuSource, /Schedule drafts/);
  assert.match(menuSource, /Settings \/ Pricing Info/);

  assert.doesNotMatch(menuSource, /nav-assistant|Assistant/);
  assert.doesNotMatch(menuSource, /nav-revenue|Revenue/);
  assert.doesNotMatch(menuSource, /Clients & Contracts|Contracts/);
  assert.doesNotMatch(menuSource, /Payment|Square/);
});

test("command center links recent inquiry intake back to Inquiry Workspace", () => {
  assert.match(artistAdminSource, /Recent inquiry intake/);
  assert.match(artistAdminSource, /link-open-inquiry-workspace-from-intake/);
  assert.match(artistAdminSource, /New inquiry intake will appear here for private review/);
  assert.match(artistAdminSource, /Use intentionally for inbound inquiries/);
  assert.match(artistAdminSource, /Review live requests in Inquiry Workspace before outreach/);
});

test("ArtistAdmin does not mount the broad secretary chatbox on the command center home", () => {
  assert.doesNotMatch(artistAdminSource, /SecretaryChatbox/);
  assert.doesNotMatch(artistAdminSource, /secretaryChatOpen/);
  assert.doesNotMatch(artistAdminSource, /nav-assistant/);
});

test("operator command center slice does not add backend, schema, delivery, payment, upload, or AI behavior", () => {
  assert.doesNotMatch(commandCenterSource, /pgTable|drizzle|migration|migrations|ALTER TABLE|CREATE TABLE/i);
  assert.doesNotMatch(commandCenterSource, /server\/routes|server\/storage|storage\.|isAuthenticated|getAuthUserId|session|OIDC|replitAuth/);
  assert.doesNotMatch(commandCenterSource, /ObjectUploader|\/api\/objects|uploadURL|getUploadParameters/);
  assert.doesNotMatch(commandCenterSource, /\/api\/contracts|\/api\/square|\/api\/payments?|Square/);
  assert.doesNotMatch(commandCenterSource, /fetch\(|apiRequest\(|method:\s*["']POST["']|method:\s*["']PATCH["']|method:\s*["']DELETE["']/);
  assert.doesNotMatch(commandCenterSource, /OpenAI|Anthropic|scheduleAI|processScheduleChat|\/api\/schedule-ai/);
  assert.doesNotMatch(commandCenterSource, /public schedule|client link created|create client link/i);
});
