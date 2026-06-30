import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const scheduleDraftBuilder = readFileSync("client/src/pages/ScheduleDraftBuilder.tsx", "utf8");
const artistLogin = readFileSync("client/src/pages/ArtistLogin.tsx", "utf8");

test("local demo schedule copy frames the draft as coordination infrastructure", () => {
  for (const expectedCopy of [
    "Back to workspace",
    "Schedule coordination draft",
    "coordination lanes",
    "service roles",
    "coordination blocks",
    "Service roles",
  ]) {
    assert.match(scheduleDraftBuilder, new RegExp(expectedCopy));
  }

  for (const legacyCopy of [
    "Back to network",
    "Back to Rolodex",
    "Plan the day as editable provider lanes",
    "Providers / artists",
    "8 makeup, 5 hair, 3 artists",
  ]) {
    assert.doesNotMatch(scheduleDraftBuilder, new RegExp(legacyCopy));
  }
});

test("artist login copy points operators at the coordination workspace", () => {
  assert.match(artistLogin, /Access your private coordination workspace/);
  assert.doesNotMatch(artistLogin, /Access your dashboard/);
});
