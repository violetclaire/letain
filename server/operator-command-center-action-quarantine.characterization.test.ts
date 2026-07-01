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

test("command center core links remain visible", () => {
  for (const label of [
    "Inquiry Workspace",
    "Needs attention",
    "Inquiries",
    "Schedule drafts",
    "Private network",
    "People / records",
    "Settings / Pricing Info",
    "Availability",
  ]) {
    assert.match(artistAdminSource, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const testId of [
    "command-center-inquiry-workspace",
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

test("primary command-center path does not surface standalone invoice or contract creation", () => {
  assert.doesNotMatch(artistAdminSource, /Create Invoice|Create Contract/);
  assert.doesNotMatch(artistAdminSource, /showStandaloneInvoice|showStandaloneContract|creatingStandalone/);
  assert.doesNotMatch(artistAdminSource, /button-create-standalone-invoice|button-create-standalone-contract/);
  assert.doesNotMatch(artistAdminSource, /\/api\/artist\/standalone-invoice|\/api\/artist\/standalone-contract/);
  assert.doesNotMatch(artistAdminSource, /\/api\/public\/standalone-invoice|\/api\/public\/standalone-contract/);
});

test("quick chat and client creation are not primary command-center actions", () => {
  assert.doesNotMatch(artistAdminSource, /Quick Chat|Quick Chats|Start Chat|Add New Client|Add Client/);
  assert.doesNotMatch(artistAdminSource, /showQuickChat|quickChatData|quickChatLink|creatingQuickChat/);
  assert.doesNotMatch(artistAdminSource, /showAddClient|newClientData|createClient/);
  assert.doesNotMatch(artistAdminSource, /button-create-quick-chat|button-create-client/);
  assert.doesNotMatch(artistAdminSource, /\/api\/artist\/create-client/);
});

test("payment, contract, proposal, public booking, and assistant framing stay out of first-screen IA", () => {
  assert.doesNotMatch(commandCenterSource, /Payment|Payments|Square|Invoice|Contract|Proposal|Proposals/);
  assert.doesNotMatch(commandCenterSource, /public booking|booking dashboard|public profile|client booking/i);
  assert.doesNotMatch(commandCenterSource, /AI assistant|AssistantControl|autonomous|auto-send/i);
  assert.doesNotMatch(menuSource, /Assistant|Revenue|Contracts|Payments|Proposals|Square/);
});

test("stale payment or contract selection branch is quarantined from inquiry rows", () => {
  assert.doesNotMatch(artistAdminSource, /pendingAction|setPendingAction/);
  assert.doesNotMatch(artistAdminSource, /Select a client to/);
  assert.doesNotMatch(artistAdminSource, /tab=\$\{tab\}/);
});

test("action quarantine does not add risky systems", () => {
  assert.doesNotMatch(artistAdminSource, /pgTable|drizzle|migration|migrations|ALTER TABLE|CREATE TABLE/i);
  assert.doesNotMatch(artistAdminSource, /ObjectUploader|\/api\/objects|uploadURL|getUploadParameters/);
  assert.doesNotMatch(commandCenterSource, /\/api\/contracts|\/api\/square|\/api\/payments?|Square/);
  assert.doesNotMatch(commandCenterSource, /OpenAI|Anthropic|scheduleAI|processScheduleChat|\/api\/schedule-ai/);
  assert.doesNotMatch(commandCenterSource, /public schedule|client link created|create client link/i);
});
