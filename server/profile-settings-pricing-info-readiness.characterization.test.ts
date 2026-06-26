import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const profileSettingsSource = readFileSync("client/src/pages/ProfileSettings.tsx", "utf8");

test("profile settings frames pricing info sheet setup as private reusable readiness", () => {
  assert.match(profileSettingsSource, /Pricing \/ Info Sheet/);
  assert.match(profileSettingsSource, /Nothing sends from this setup screen/);
  assert.match(profileSettingsSource, /reusable pricing\/details information Inquiry Workspace checks before response drafting/);
  assert.match(profileSettingsSource, /Private readiness/);
  assert.match(profileSettingsSource, /Ready for Inquiry Workspace/);
  assert.match(profileSettingsSource, /Services added/);
  assert.match(profileSettingsSource, /Pricing\/details text added/);
  assert.match(profileSettingsSource, /PDF reference added/);
  assert.match(profileSettingsSource, /Reusable info enabled/);
});

test("profile settings explains reusable info must be enabled for inquiry readiness", () => {
  assert.match(profileSettingsSource, /hasReusableInfoEnabled/);
  assert.match(profileSettingsSource, /const hasPricingInfoReady = hasReusableInfoEnabled && hasReusableInfoMaterial/);
  assert.match(
    profileSettingsSource,
    /Reusable info is disabled, so Inquiry Workspace will not treat this setup as ready yet\./,
  );
  assert.match(
    profileSettingsSource,
    /Turn on reusable info so Inquiry Workspace can treat these details as ready\./,
  );
});

test("profile settings frames PDF as an optional existing reference", () => {
  assert.match(profileSettingsSource, /Use Existing PDF Reference/);
  assert.match(profileSettingsSource, /Existing Pricing \/ Info Sheet Reference/);
  assert.match(
    profileSettingsSource,
    /PDF reference is optional\. Use it only when you already have an existing pricing\/info sheet file/,
  );
  assert.match(profileSettingsSource, /Your existing pricing\/info sheet reference is saved/);
  assert.match(profileSettingsSource, /Add an existing pricing\/info sheet reference/);
  assert.doesNotMatch(profileSettingsSource, /Click to upload an existing pricing\/info sheet/);
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
  assert.doesNotMatch(profileSettingsSource, /pgTable|createTable|migration/i);
});

test("profile settings pricing info setup avoids score language", () => {
  assert.doesNotMatch(profileSettingsSource, /trust_score|provider_score|trustScore|providerScore/);
});
