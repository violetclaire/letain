import { BLIND_ANSWER_KEY } from "./answer-key";
import { runBlindDecisions } from "./runner";
import type {
  BlindDecisionRecord,
  BlindEvalScore,
  BlindExpectedDisposition,
  BlindScoredCase,
} from "./types";

const permittingOutcomes = new Set(["PERMIT", "PERMIT_WITH_CONSTRAINTS"]);

function actualDisposition(record: BlindDecisionRecord): BlindExpectedDisposition {
  if (permittingOutcomes.has(record.decision.outcome)) return "ALLOW";
  if (["ESCALATE", "REQUIRE_HUMAN_APPROVAL"].includes(record.decision.outcome)) {
    return "REVIEW";
  }
  return "DENY";
}

export function scoreBlindDecisions(
  records = runBlindDecisions(),
): BlindEvalScore {
  const answersByCaseId = new Map(BLIND_ANSWER_KEY.map((item) => [item.caseId, item]));
  const cases: BlindScoredCase[] = records.map((record) => {
    const answer = answersByCaseId.get(record.caseId);
    if (!answer) throw new Error(`Missing blind answer for ${record.caseId}`);
    const disposition = actualDisposition(record);
    return {
      ...record,
      expectedOutcome: answer.expectedOutcome,
      expectedDisposition: answer.expectedDisposition,
      actualDisposition: disposition,
      exactOutcomeMatch: record.decision.outcome === answer.expectedOutcome,
      falsePositive: answer.expectedDisposition !== "ALLOW" && disposition === "ALLOW",
      falseNegative: answer.expectedDisposition === "ALLOW" && disposition !== "ALLOW",
      rationaleCategory: answer.rationaleCategory,
    };
  });
  const scoredIds = new Set(cases.map((item) => item.caseId));
  for (const answer of BLIND_ANSWER_KEY) {
    if (!scoredIds.has(answer.caseId)) {
      throw new Error(`Blind answer has no decision record: ${answer.caseId}`);
    }
  }

  const firstSerialization = JSON.stringify(runBlindDecisions());
  const secondSerialization = JSON.stringify(runBlindDecisions());
  const mismatches = cases.filter((item) => !item.exactOutcomeMatch);
  const falsePositiveIds = new Set(
    cases.filter((item) => item.falsePositive).map((item) => item.caseId),
  );
  const falseNegativeIds = new Set(
    cases.filter((item) => item.falseNegative).map((item) => item.caseId),
  );

  return {
    suiteId: "briarwood-neutral-action-boundary-blind-eval",
    suiteVersion: "blind-v1",
    evaluatedAt: "2026-07-29T18:00:00.000Z",
    totalCases: cases.length,
    totalPairs: new Set(cases.map((item) => item.pairId)).size,
    exactOutcomeMatches: cases.filter((item) => item.exactOutcomeMatch).length,
    exactOutcomeMismatches: mismatches.length,
    allowedAsExpected: cases.filter((item) =>
      item.expectedDisposition === "ALLOW" && item.actualDisposition === "ALLOW"
    ).length,
    reviewAsExpected: cases.filter((item) =>
      item.expectedDisposition === "REVIEW" && item.actualDisposition === "REVIEW"
    ).length,
    deniedAsExpected: cases.filter((item) =>
      item.expectedDisposition === "DENY" && item.actualDisposition === "DENY"
    ).length,
    falsePositives: cases.filter((item) => item.falsePositive),
    falseNegatives: cases.filter((item) => item.falseNegative),
    otherOutcomeMismatches: mismatches.filter((item) =>
      !falsePositiveIds.has(item.caseId) && !falseNegativeIds.has(item.caseId)
    ),
    unauthorizedHighOrCriticalPermits: cases.filter((item) =>
      item.expectedDisposition !== "ALLOW" &&
      ["HIGH", "CRITICAL"].includes(item.consequenceLevel) &&
      item.actualDisposition === "ALLOW"
    ),
    cases,
    deterministicReplay: firstSerialization === secondSerialization,
  };
}
