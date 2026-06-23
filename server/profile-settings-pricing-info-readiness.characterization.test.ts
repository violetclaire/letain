import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const profileSettingsSource = readFileSync("client/src/pages/ProfileSettings.tsx", "utf8");

test("profile settings frames pricing info sheet setup as private reusable readiness", () => {
  assert.match(profileSettingsSource, /Pricing \/ Info Sheet/);
  assert.match(profileSettingsSource, /Nothing sends from this setup screen/);
  assert.match(profileSettingsSource, /reusable pricing\/details information you can use later when drafting inquiry responses/);
  assert.match(profileSettingsSource, /Private readiness/);
  assert.match(profileSettingsSource, /Ready for composer later/);
  assert.match(profileSettingsSource, /Services added/);
  assert.match(profileSettingsSource, /Pricing\/details text added/);
  assert.match(profileSettingsSource, /PDF reference added/);
  assert.match(profileSettingsSource, /Logo added/);
});

test("profile settings pricing info setup does not add send, payment, contract, or Square behavior", () => {
  assert.doesNotMatch(profileSettingsSource, /\/api\/inquiries\/[^"`']+\/respond/);
  assert.doesNotMatch(profileSettingsSource, /\/api\/inquiry-responses\/[^"`']+\/send/);
  assert.doesNotMatch(profileSettingsSource, /\/api\/proposals\/[^"`']+\/send/);
  assert.doesNotMatch(profileSettingsSource, /\/api\/contracts/);
  assert.doesNotMatch(profileSettingsSource, /\/api\/payments/);
  assert.doesNotMatch(profileSettingsSource, /\/api\/square/i);
  assert.doesNotMatch(profileSettingsSource, /sendInfoSheetEmail/);
  assert.doesNotMatch(profileSettingsSource, /sendProposalEmail/);
});

test("profile settings pricing info setup avoids score language", () => {
  assert.doesNotMatch(profileSettingsSource, /trust_score|provider_score|trustScore|providerScore/);
});
