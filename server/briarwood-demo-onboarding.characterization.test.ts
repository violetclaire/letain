import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const demoPage = readFileSync("client/src/pages/BriarwoodDemo.tsx", "utf8");

test("Briarwood demo onboarding does not require banking after network", () => {
  assert.doesNotMatch(demoPage, /Continue to Banking/);
  assert.doesNotMatch(demoPage, /setTab\("bank"\)/);
  assert.doesNotMatch(demoPage, /useState<"profile" \| "network" \| "bank">/);
  assert.doesNotMatch(demoPage, /03 . Banking/);
});

test("Briarwood demo onboarding does not ask for bank details", () => {
  for (const forbiddenCopy of [
    "Bank Name",
    "Routing Number",
    "Account Number",
    "Briarwood routes payments directly to your bank",
    "Bank data is encrypted",
  ]) {
    assert.doesNotMatch(demoPage, new RegExp(forbiddenCopy));
  }
});

test("Briarwood demo onboarding advances from network to coordination preview", () => {
  assert.match(demoPage, /useState<"profile" \| "network" \| "preview">/);
  assert.match(demoPage, /setTab\("preview"\)/);
  assert.match(demoPage, /Preview routing behavior/);
  assert.match(demoPage, /Review demo inquiry/);
  assert.match(demoPage, /Dry-run delivery preview/);
  assert.match(demoPage, /Payment setup can be configured later/);
  assert.match(demoPage, /Open dry-run preview/);
});
