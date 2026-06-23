import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readRepoFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("CDI scope doc distinguishes product scope from research autonomy scope", () => {
  const doc = readRepoFile("docs/CDI_PRODUCT_AND_RESEARCH_SCOPES.md");

  assert.match(doc, /Product CDI is the near-term Briarwood implementation/);
  assert.match(doc, /Research CDI is the broader future standards\/autonomy thesis/);
  assert.match(doc, /human-robot and multi-agent coordination sharing/);
  assert.match(doc, /must not be implemented in Briarwood product code yet/);
  assert.match(doc, /Do not\s+add robotics\/autonomy control code/);
});

test("CDI scope doc keeps CDI private and rejects public person or provider scoring", () => {
  const doc = readRepoFile("docs/CDI_PRODUCT_AND_RESEARCH_SCOPES.md");

  assert.match(doc, /private behavioral reliability signal/);
  assert.match(doc, /operator-scoped/);
  assert.match(doc, /Product CDI must not become:/);
  assert.match(doc, /A public provider score/);
  assert.match(doc, /A person score/);
  assert.match(doc, /A marketplace ranking/);
  assert.match(doc, /paid-placement or pay-to-play/);
  assert.doesNotMatch(doc, /rank providers by CDI/i);
  assert.doesNotMatch(doc, /public CDI leaderboard/i);
});

test("CDI scope doc connects CDI to existing coordination assessment foundation", () => {
  const doc = readRepoFile("docs/CDI_PRODUCT_AND_RESEARCH_SCOPES.md");
  const verificationAudit = readRepoFile("docs/VERIFICATION_LAYER_AUDIT.md");

  assert.match(doc, /CDI is the measurement layer/);
  assert.match(doc, /Coordination assessment is the operational permission layer/);
  assert.match(doc, /coordination_paths/);
  assert.match(doc, /coordination_events/);
  assert.match(doc, /evaluateCoordinationPath\(\)/);
  assert.match(doc, /coordination_assessments/);

  assert.match(verificationAudit, /CDI is a related measurement layer/);
  assert.match(verificationAudit, /docs\/CDI_PRODUCT_AND_RESEARCH_SCOPES\.md/);
});

test("CDI scope doc preserves safe missing-signal interpretation", () => {
  const doc = readRepoFile("docs/CDI_PRODUCT_AND_RESEARCH_SCOPES.md");

  assert.match(doc, /Missing or low signal should lead to safer coordination decisions/);
  assert.match(doc, /CLARIFY/);
  assert.match(doc, /REROUTE/);
  assert.match(doc, /ESCALATE/);
  assert.match(doc, /PROCEED_WITH_OVERSIGHT/);
  assert.match(doc, /must not mean\s+"bad person\."/);
});

test("CDI scope characterization remains docs-only and source-only", () => {
  const testSource = readRepoFile("server/cdi-product-research-scopes.characterization.test.ts");

  assert.match(testSource, /readFileSync/);
  assert.doesNotMatch(testSource, /from ["']@shared\/schema["']/);
  assert.doesNotMatch(testSource, /from ["']\.\/cdi/);
  assert.doesNotMatch(testSource, /process\.env\.[A-Z_]+\s*=/);
});
