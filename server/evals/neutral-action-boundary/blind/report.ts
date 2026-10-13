import { scoreBlindDecisions } from "./scorer";

export function renderBlindEvalReport(
  report = scoreBlindDecisions(),
): string {
  const lines = [
    "# Briarwood Neutral Action Boundary Blind Evaluation",
    "",
    "Synthetic, offline, answer-key-separated evaluation. No action is executed.",
    "",
    "## Summary",
    "",
    `- Cases: ${report.totalCases}`,
    `- Near-match pairs: ${report.totalPairs}`,
    `- Exact outcome matches: ${report.exactOutcomeMatches}`,
    `- Exact outcome mismatches: ${report.exactOutcomeMismatches}`,
    `- False positives: ${report.falsePositives.length}`,
    `- False negatives: ${report.falseNegatives.length}`,
    `- Other outcome mismatches: ${report.otherOutcomeMismatches.length}`,
    `- Unauthorized HIGH/CRITICAL permits: ${report.unauthorizedHighOrCriticalPermits.length}`,
    `- Deterministic replay: ${report.deterministicReplay ? "PASS" : "FAIL"}`,
    "",
    "## Case Results",
    "",
    "| Case | Domain | Expected | Actual | Disposition | Result |",
    "| --- | --- | --- | --- | --- | --- |",
    ...report.cases.map((item) =>
      `| ${item.caseId} | ${item.domain} | ${item.expectedOutcome} | ${item.decision.outcome} | ${item.actualDisposition} | ${item.exactOutcomeMatch ? "MATCH" : "MISMATCH"} |`
    ),
    "",
    "## Evaluated Action Records",
    "",
    ...report.cases.flatMap((item) => [
      `### ${item.caseId}`,
      "",
      ...JSON.stringify(item.decision.evaluatedRequest, null, 2).split("\n").map((line) => `    ${line}`),
      "",
      `Request digest: ${item.decision.evaluatedRequestDigest}`,
      "",
    ]),
    "## Preserved Errors",
    "",
    ...(
      report.exactOutcomeMismatches === 0
        ? ["No false positives, false negatives, or other outcome mismatches were observed."]
        : [
            ...report.falsePositives.map((item) =>
              `- False positive: ${item.caseId} expected ${item.expectedOutcome}, received ${item.decision.outcome}.`
            ),
            ...report.falseNegatives.map((item) =>
              `- False negative: ${item.caseId} expected ${item.expectedOutcome}, received ${item.decision.outcome}.`
            ),
            ...report.otherOutcomeMismatches.map((item) =>
              `- Other mismatch: ${item.caseId} expected ${item.expectedOutcome}, received ${item.decision.outcome}.`
            ),
          ]
    ),
    "",
    "## Limits",
    "",
    "- The runner did not import the answer key; scoring occurred afterward.",
    "- The cases and answer key were authored for this synthetic evaluation, not by an independent reviewer.",
    "- The cases are outside the public incident domain and contain no exploit implementation.",
    "- This result does not prove real-world incident prevention or production enforcement.",
    "- A permitting decision still requires a separate human action decision and executes nothing.",
  ];
  return `${lines.join("\n")}\n`;
}
