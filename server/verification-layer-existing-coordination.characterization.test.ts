import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readRepoFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function readCoordinationSchemaSlice(): string {
  const source = readRepoFile("shared/schema.ts");
  const start = source.indexOf("export const permissionDecisionValues");
  const end = source.indexOf("// Private operator-only note for an inquiry");

  assert.notEqual(start, -1, "coordination schema slice should start at permission decisions");
  assert.notEqual(end, -1, "coordination schema slice should end before inquiry notes");

  return source.slice(start, end);
}

test("coordination assessment stays deterministic and does not import LLM clients", () => {
  const source = readRepoFile("server/coordinationAssessment.ts");

  assert.doesNotMatch(source, /from ["']openai["']/i);
  assert.doesNotMatch(source, /from ["']@anthropic-ai\//i);
  assert.doesNotMatch(source, /GoogleGenAI|OpenAI|Anthropic|generateContent|chat\.completions/i);
  assert.match(source, /export function evaluateCoordinationPath/);
  assert.match(source, /export async function assessCoordinationPath/);
});

test("coordination assessment uses the existing permission decision set", () => {
  const schema = readCoordinationSchemaSlice();
  const assessment = readRepoFile("server/coordinationAssessment.ts");
  const expectedDecisions = [
    "PROCEED",
    "PROCEED_WITH_OVERSIGHT",
    "CLARIFY",
    "REROUTE",
    "ESCALATE",
    "STOP",
  ];

  for (const decision of expectedDecisions) {
    assert.match(schema, new RegExp(`"${decision}"`));
    assert.match(assessment, new RegExp(`"${decision}"`));
  }
});

test("coordination layer remains path-based and score-neutral", () => {
  const sources = [
    readCoordinationSchemaSlice(),
    readRepoFile("server/coordinationAssessment.ts"),
    readRepoFile("client/src/pages/CoordinationPathAdmin.tsx"),
  ].join("\n");

  assert.match(sources, /coordination path/i);
  assert.match(sources, /Permission Decision/);
  assert.doesNotMatch(sources, /trust_score|provider_score|trustScore|providerScore/);
});

test("schema keeps coordination path, event, assessment, and provenance foundations", () => {
  const schema = readCoordinationSchemaSlice();

  assert.match(schema, /export const coordinationPaths = pgTable\(\s*"coordination_paths"/);
  assert.match(schema, /export const coordinationEvents = pgTable\(\s*"coordination_events"/);
  assert.match(schema, /export const coordinationAssessments = pgTable\(\s*"coordination_assessments"/);
  assert.match(schema, /signalProvenance/);
  assert.match(schema, /signal_provenance/);
  assert.match(schema, /humanJudgmentRequired/);
  assert.match(schema, /human_judgment_required/);
});

test("verification layer audit documents extension instead of duplication", () => {
  const audit = readRepoFile("docs/VERIFICATION_LAYER_AUDIT.md");

  assert.match(audit, /path-based, not person-based/i);
  assert.match(audit, /coordination_paths/);
  assert.match(audit, /coordination_assessments/);
  assert.match(audit, /coordination_events/);
  assert.match(audit, /signalProvenance/);
  assert.match(audit, /Do not build a parallel verification system/i);
  assert.match(audit, /Do not add:[\s\S]*Trust scores/i);
  assert.match(audit, /LLM-based core verification decisions/i);
});

test("verification layer characterization remains source-only", () => {
  const testSource = readRepoFile("server/verification-layer-existing-coordination.characterization.test.ts");

  assert.match(testSource, /readFileSync/);
  assert.doesNotMatch(testSource, /from ["']\.\/coordinationAssessment["']/);
  assert.doesNotMatch(testSource, /from ["']@shared\/schema["']/);
  assert.doesNotMatch(testSource, /process\.env\.[A-Z_]+\s*=/);
});
