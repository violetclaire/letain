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

test("command center cards include conservative read-only status snapshots", () => {
  for (const variableName of [
    "needsAttentionSnapshot",
    "inquiriesSnapshot",
    "scheduleDraftsSnapshot",
    "privateNetworkSnapshot",
    "settingsSnapshot",
    "availabilitySnapshot",
  ]) {
    assert.match(commandCenterSource, new RegExp(`\\{${variableName}\\}`));
  }

  assert.match(commandCenterSource, /Open records when you need context/);
});

test("needs attention and inquiries derive bounded counts from existing admin data", () => {
  assert.match(artistAdminSource, /const pendingCount = inquiries\.filter/);
  assert.match(artistAdminSource, /const activeInquiryCount = inquiries\.filter/);
  assert.match(artistAdminSource, /const dateConflictCount = inquiries\.filter/);
  assert.match(artistAdminSource, /const todayAttentionCount = pendingCount \+ directChats\.length \+ dateConflictCount/);
  assert.match(artistAdminSource, /bounded review signal/);
  assert.match(artistAdminSource, /active inquiry/);
  assert.match(artistAdminSource, /pending inquiry/);
  assert.match(artistAdminSource, /date conflict/);
});

test("snapshot uses existing read-only endpoints without adding backend routes", () => {
  assert.match(artistAdminSource, /fetch\("\/api\/schedule-drafts"/);
  assert.match(artistAdminSource, /fetch\("\/api\/route-targets"/);
  assert.match(artistAdminSource, /fetch\(`\/api\/artist-profiles\/\$\{encodeURIComponent\(user\.id\)\}`/);
  assert.match(artistAdminSource, /fetch\(`\/api\/artist-services\/\$\{encodeURIComponent\(user\.id\)\}`/);

  assert.doesNotMatch(artistAdminSource, /app\.get\(|app\.post\(|server\/routes|server\/storage/);
});

test("schedule drafts, private network, pricing info, and availability stay conservative", () => {
  assert.match(artistAdminSource, /Open schedules to review private drafts/);
  assert.match(artistAdminSource, /Checking private draft count/);
  assert.match(artistAdminSource, /reachable route option/);
  assert.match(artistAdminSource, /missing phone or email/);
  assert.match(artistAdminSource, /Review setup: add reusable info and enable it before relying on readiness/);
  assert.match(artistAdminSource, /No inquiry date conflicts surfaced; open Availability to review setup/);
});

test("settings readiness only shows ready when existing reusable info supports it", () => {
  assert.match(artistAdminSource, /const reusableInfoEnabled = profileReadiness\?\.infoSheetEnabled === true/);
  assert.match(artistAdminSource, /const pricingInfoReady = reusableInfoEnabled && hasReusableInfoMaterial/);
  assert.match(artistAdminSource, /Pricing \/ Info Sheet ready from enabled reusable info/);
});

test("status snapshot avoids autonomous action, marketplace, payment, contract, and assistant framing", () => {
  assert.doesNotMatch(commandCenterSource, /Create Invoice|Create Contract|Payment|Payments|Square/);
  assert.doesNotMatch(commandCenterSource, /Proposal|Proposals|Contract summary|Payment summary/);
  assert.doesNotMatch(commandCenterSource, /clients can book|booking dashboard|marketplace|search\/browse/i);
  assert.doesNotMatch(commandCenterSource, /AI assistant|AssistantControl|Your Secretary|autonomous|auto-send/i);
  assert.doesNotMatch(commandCenterSource, /send email|send sms|send info/i);
  assert.match(commandCenterSource, /External action stays operator-approved/);
});

test("status snapshot does not add risky systems", () => {
  assert.doesNotMatch(artistAdminSource, /pgTable|drizzle|migration|migrations|ALTER TABLE|CREATE TABLE/i);
  assert.doesNotMatch(commandCenterSource, /ObjectUploader|\/api\/objects|uploadURL|getUploadParameters/);
  assert.doesNotMatch(commandCenterSource, /\/api\/contracts|\/api\/square|\/api\/payments?|Square/);
  assert.doesNotMatch(commandCenterSource, /OpenAI|Anthropic|scheduleAI|processScheduleChat|\/api\/schedule-ai/);
  assert.doesNotMatch(commandCenterSource, /public schedule|client link created|create client link/i);
});
