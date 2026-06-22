import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const demoCopyFiles = [
  "client/public/briarwood.html",
  "client/src/pages/About.tsx",
  "client/src/pages/AgentBrief.tsx",
  "client/src/pages/BriarwoodDemo.tsx",
  "client/src/pages/CDIArchitecture.tsx",
  "client/src/pages/DemoLandingPreview.tsx",
  "client/src/pages/Memo.tsx",
  "client/src/pages/Pitch.tsx",
  "client/src/pages/Sandbox.tsx",
];

const demoCopy = demoCopyFiles
  .map((file) => `${file}\n${readFileSync(file, "utf8")}`)
  .join("\n\n");

test("Briarwood demo UI copy no longer names the removed technical contact", () => {
  const removedName = ["Dun", "dy"].join("");
  for (const removedReference of [
    removedName,
    "dund" + "ysm@briarwood.ai",
    `Contact ${removedName}`,
    `Reach ${removedName}`,
    `Build Instructions for ${removedName}`,
  ]) {
    assert.doesNotMatch(demoCopy, new RegExp(removedReference));
  }
});

test("Briarwood demo UI copy uses role-based technical framing", () => {
  for (const genericReference of [
    "Coordination Infrastructure",
    "Technical Architecture",
    "Coordination Engine",
    "Request Technical Review",
  ]) {
    assert.match(demoCopy, new RegExp(genericReference));
  }
});
