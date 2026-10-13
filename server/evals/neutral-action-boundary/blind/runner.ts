import { evaluateActionRequest } from "../evaluator";
import { BLIND_ACTION_CASES } from "./cases";
import type { BlindDecisionRecord } from "./types";

export function runBlindDecisions(): BlindDecisionRecord[] {
  return BLIND_ACTION_CASES.map((item) => ({
    caseId: item.caseId,
    sequence: item.sequence,
    pairId: item.pairId,
    domain: item.domain,
    label: item.label,
    requestId: item.request.requestId,
    consequenceLevel: item.request.consequenceLevel,
    decision: evaluateActionRequest(item.request, item.context),
  }));
}
