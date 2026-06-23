import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readRepoFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const docs = readRepoFile("docs/PRIVATE_COORDINATION_EVALS.md");
const fixtures = readRepoFile("server/fixtures/coordination-eval-cases.ts");
const coordinationAssessment = readRepoFile("server/coordinationAssessment.ts");
const verificationAudit = readRepoFile("docs/VERIFICATION_LAYER_AUDIT.md");

test("private coordination eval documentation exists and maps to existing architecture", () => {
  assert.match(docs, /# Private Coordination Evals/);
  assert.match(docs, /coordination_paths/);
  assert.match(docs, /coordination_events/);
  assert.match(docs, /signalProvenance/);
  assert.match(docs, /evaluateCoordinationPath\(\)/);
  assert.match(docs, /coordination_assessments/);
  assert.match(docs, /VerificationRun/);
  assert.match(docs, /CoordinationEvalCase/);
  assert.match(docs, /CoordinationRubric/);
  assert.match(docs, /EvalRun/);
  assert.match(docs, /EvalResult/);
});

test("private coordination eval docs preserve path-based score-neutral guardrails", () => {
  assert.match(docs, /evaluate coordination paths, not people/i);
  assert.match(docs, /operator-scoped/i);
  assert.match(docs, /Redact real cases by default/i);
  assert.match(docs, /content hashes over raw content/i);
  assert.match(docs, /Payment must not improve verification or eval outcomes/i);
  assert.match(docs, /It never means "bad\s+person\."/i);
  assert.match(docs, /Do not create public trust scores, provider scores, person scores, rankings/);
});

test("source-only fixtures are synthetic, redacted, and private", () => {
  assert.match(fixtures, /redacted: true/g);
  assert.match(fixtures, /synthetic: true/g);
  assert.match(fixtures, /rawContentIncluded: false/g);
  assert.match(fixtures, /operatorScope: "private"/g);
  assert.match(fixtures, /subject: "coordination_path"/g);
  assert.match(fixtures, /contentHash: "sha256:/g);
  assert.doesNotMatch(fixtures, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  assert.doesNotMatch(fixtures, /\b\d{3}[-.)\s]?\d{3}[-.\s]?\d{4}\b/);
});

test("source-only fixtures cover the current permission decision set", () => {
  for (const decision of [
    "CLARIFY",
    "REROUTE",
    "ESCALATE",
    "STOP",
    "PROCEED_WITH_OVERSIGHT",
    "PROCEED",
  ]) {
    assert.match(fixtures, new RegExp(`expectedDecision: "${decision}"`));
    assert.match(docs, new RegExp(`\\\`${decision}\\\``));
  }
});

test("private eval foundation does not introduce LLM scoring or runtime generation hooks", () => {
  const sources = [docs, fixtures, coordinationAssessment].join("\n");

  assert.doesNotMatch(sources, /from ["']openai["']/i);
  assert.doesNotMatch(sources, /from ["']@anthropic-ai\//i);
  assert.doesNotMatch(sources, /GoogleGenAI|OpenAI|Anthropic|generateContent|chat\.completions/i);
  assert.doesNotMatch(sources, /CREATE TABLE|pgTable\(|drizzle-kit|db:push|server\/seed\.ts|migrations\//i);
});

test("private eval foundation does not introduce implementation score fields", () => {
  const sources = [docs, fixtures, verificationAudit].join("\n");

  assert.doesNotMatch(sources, /trust_score|provider_score|trustScore|providerScore|personScore|providerScore/);
  assert.doesNotMatch(fixtures, /paid placement|pay-to-play|ranking|reputation/i);
});

test("existing coordination assessment remains the deterministic verifier foundation", () => {
  assert.match(coordinationAssessment, /export function evaluateCoordinationPath/);
  assert.match(coordinationAssessment, /export async function assessCoordinationPath/);
  assert.doesNotMatch(coordinationAssessment, /CoordinationEvalCase|EvalRun|EvalResult/);
  assert.match(verificationAudit, /VerificationRun \| `coordination_assessments` row/);
});

test("private coordination eval characterization remains source-only", () => {
  const testSource = readRepoFile("server/coordination-eval-fixtures.characterization.test.ts");

  assert.match(testSource, /readFileSync/);
  assert.doesNotMatch(testSource, /from ["']\.\/coordinationAssessment["']/);
  assert.doesNotMatch(testSource, /from ["']@shared\/schema["']/);
  assert.doesNotMatch(testSource, /process\.env\.[A-Z_]+\s*=/);
});
