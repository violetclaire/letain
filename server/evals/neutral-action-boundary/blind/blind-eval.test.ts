import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { BLIND_ANSWER_KEY } from "./answer-key";
import { BLIND_ACTION_CASES } from "./cases";
import { renderBlindEvalReport } from "./report";
import { runBlindDecisions } from "./runner";
import { scoreBlindDecisions } from "./scorer";

test("blind fixtures contain 16 near-match pairs across eight non-incident domains", () => {
  assert.equal(BLIND_ACTION_CASES.length, 32);
  assert.equal(new Set(BLIND_ACTION_CASES.map((item) => item.pairId)).size, 16);
  assert.equal(new Set(BLIND_ACTION_CASES.map((item) => item.domain)).size, 8);
  for (const pairId of new Set(BLIND_ACTION_CASES.map((item) => item.pairId))) {
    assert.equal(
      BLIND_ACTION_CASES.filter((item) => item.pairId === pairId).length,
      2,
      pairId,
    );
  }
});

test("unlabeled cases contain no expected outcome or authorization answer", () => {
  const serialized = JSON.stringify(BLIND_ACTION_CASES);
  assert.doesNotMatch(serialized, /expectedOutcome|expectedDisposition|authorizedAction/);
  const casesSource = readFileSync(
    "server/evals/neutral-action-boundary/blind/cases.ts",
    "utf8",
  );
  assert.doesNotMatch(casesSource, /answer-key|BLIND_ANSWER_KEY|expectedOutcome/);
});

test("the decision runner cannot read the answer key", () => {
  const runnerSource = readFileSync(
    "server/evals/neutral-action-boundary/blind/runner.ts",
    "utf8",
  );
  assert.doesNotMatch(runnerSource, /answer-key|BLIND_ANSWER_KEY|expectedOutcome/);
  assert.match(runnerSource, /evaluateActionRequest/);
});

test("every blind case has exactly one separately stored answer", () => {
  assert.equal(BLIND_ANSWER_KEY.length, BLIND_ACTION_CASES.length);
  assert.equal(new Set(BLIND_ANSWER_KEY.map((item) => item.caseId)).size, BLIND_ANSWER_KEY.length);
  assert.deepEqual(
    [...BLIND_ACTION_CASES.map((item) => item.caseId)].sort(),
    [...BLIND_ANSWER_KEY.map((item) => item.caseId)].sort(),
  );
});

test("blind decisions are deterministic and preserve the separate human-action boundary", () => {
  const first = runBlindDecisions();
  const second = runBlindDecisions();
  assert.deepEqual(second, first);
  assert.ok(first.every((item) => item.decision.requiresSeparateHumanActionDecision));
  assert.ok(first.every((item) => item.decision.humanReadableExplanation.length > 0));
});

test("post-decision scoring preserves every false positive and false negative", () => {
  const score = scoreBlindDecisions();
  const mismatches = score.cases.filter((item) => !item.exactOutcomeMatch);
  assert.equal(score.exactOutcomeMismatches, mismatches.length);
  assert.deepEqual(
    score.falsePositives.map((item) => item.caseId),
    score.cases.filter((item) => item.falsePositive).map((item) => item.caseId),
  );
  assert.deepEqual(
    score.falseNegatives.map((item) => item.caseId),
    score.cases.filter((item) => item.falseNegative).map((item) => item.caseId),
  );
  assert.equal(
    score.falsePositives.length +
      score.falseNegatives.length +
      score.otherOutcomeMismatches.length,
    score.exactOutcomeMismatches,
  );
});

test("report discloses blindness limits and does not claim real-world prevention", () => {
  const report = renderBlindEvalReport();
  assert.match(report, /runner did not import the answer key/i);
  assert.match(report, /not by an independent reviewer/i);
  assert.match(report, /does not prove real-world incident prevention/i);
  assert.match(report, /executes nothing/i);
});

test("blind evaluation remains synthetic, offline, and free of production integration", () => {
  const files = [
    "server/evals/neutral-action-boundary/blind/cases.ts",
    "server/evals/neutral-action-boundary/blind/runner.ts",
    "server/evals/neutral-action-boundary/blind/scorer.ts",
  ];
  const source = files.map((file) => readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(source, /child_process|execSync|spawnSync|powershell|cmd\.exe/);
  assert.doesNotMatch(source, /\bfetch\s*\(|node:https|node:http|WebSocket/);
  assert.doesNotMatch(source, /huggingface|exploitgym|kubernetes|github\.com/i);
});

test("the blind extension does not alter the frozen baseline evaluator source", () => {
  const evaluator = readFileSync(
    "server/evals/neutral-action-boundary/evaluator.ts",
    "utf8",
  );
  assert.doesNotMatch(evaluator, /blind-eval|BLIND_ACTION_CASES|BLIND_ANSWER_KEY/);
});
