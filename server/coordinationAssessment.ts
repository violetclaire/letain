import { storage } from "./storage";
import type {
  CoordinationAssessment,
  CoordinationAssessmentSnapshot,
  CoordinationEvent,
  CoordinationPath,
  EscalationReason,
  Inquiry,
  OutcomeVerification,
  PermissionDecision,
  RiskFactor,
  RouteTarget,
  SignalProvenance,
} from "@shared/schema";

export interface CoordinationAssessmentInput {
  path: CoordinationPath;
  inquiry?: Inquiry | null;
  routeTarget?: RouteTarget | null;
  events?: CoordinationEvent[];
}

function hasContext(path: CoordinationPath, inquiry?: Inquiry | null): boolean {
  if (path.contextCaptured) return true;
  if (!inquiry) return false;
  return Boolean(inquiry.clientName && inquiry.clientEmail && inquiry.eventDate && inquiry.serviceType);
}

function addUnique<T>(items: T[], item: T): void {
  if (!items.includes(item)) items.push(item);
}

function addRisk(riskFactors: RiskFactor[], risk: RiskFactor): void {
  addUnique(riskFactors, risk);
}

function hasPriorOpenLoop(events: CoordinationEvent[]): boolean {
  return events.some((event) => event.eventType === "prior_open_loop_failure");
}

function hasAttributionAmbiguity(events: CoordinationEvent[]): boolean {
  return events.some((event) => event.eventType === "attribution_ambiguous");
}

function normalizedOutcomeVerification(path: CoordinationPath): OutcomeVerification {
  switch (path.outcomeVerificationState) {
    case "verified":
      return "VERIFIED";
    case "failed":
      return "FAILED";
    case "pending":
      return "PENDING";
    default:
      return "NOT_READY";
  }
}

function decide(riskFactors: RiskFactor[], path: CoordinationPath): PermissionDecision {
  const risks = new Set(riskFactors);

  if (risks.has("MISSING_CONTEXT")) return "CLARIFY";
  if (risks.has("UNCLEAR_AUTHORITY")) {
    return path.authorityState === "denied" ? "ESCALATE" : "CLARIFY";
  }
  if (risks.has("UNAVAILABLE_ROUTE_TARGET")) return "REROUTE";
  if (risks.has("INSUFFICIENT_TIME_BUFFER")) {
    return path.recoveryCapacity === "low" || path.recoveryCapacity === "none" ? "STOP" : "REROUTE";
  }
  if (risks.has("ESCALATION_OVERDUE")) return "ESCALATE";
  if (risks.has("UNCONFIRMED_HANDOFF")) {
    return path.handoffState === "stalled" ? "ESCALATE" : "PROCEED_WITH_OVERSIGHT";
  }
  if (
    risks.has("LOW_RECOVERY_CAPACITY") ||
    risks.has("PRIOR_OPEN_LOOP_FAILURE") ||
    risks.has("ATTRIBUTION_AMBIGUOUS")
  ) {
    return "PROCEED_WITH_OVERSIGHT";
  }
  return "PROCEED";
}

function recommendedNextAction(decision: PermissionDecision): string {
  switch (decision) {
    case "PROCEED":
      return "Proceed with the next coordination action and keep the path event log current.";
    case "PROCEED_WITH_OVERSIGHT":
      return "Proceed only with operator oversight and confirm the next handoff before external action.";
    case "CLARIFY":
      return "Clarify missing context or authority before taking action.";
    case "REROUTE":
      return "Choose a safer route target or recovery path before continuing.";
    case "ESCALATE":
      return "Escalate to the operator or responsible human for judgment.";
    case "STOP":
      return "Stop this path until timing, recovery, or commitment risk is resolved.";
  }
}

function confidenceFor(decision: PermissionDecision, riskFactors: RiskFactor[]): number {
  if (decision === "PROCEED" && riskFactors.length === 0) return 92;
  if (decision === "PROCEED_WITH_OVERSIGHT") return 72;
  if (decision === "CLARIFY") return 68;
  if (decision === "REROUTE") return 74;
  if (decision === "ESCALATE") return 78;
  if (decision === "STOP") return 82;
  return 65;
}

function isCriticalRisk(risk: RiskFactor): boolean {
  return [
    "MISSING_CONTEXT",
    "UNCLEAR_AUTHORITY",
    "INSUFFICIENT_TIME_BUFFER",
    "UNAVAILABLE_ROUTE_TARGET",
    "ESCALATION_OVERDUE",
  ].includes(risk);
}

function eventSignal(event: CoordinationEvent): SignalProvenance {
  return `coordination_event:${event.id}:${event.eventType}`;
}

export function evaluateCoordinationPath(input: CoordinationAssessmentInput): CoordinationAssessmentSnapshot {
  const { path, inquiry, routeTarget } = input;
  const events = input.events ?? [];
  const riskFactors: RiskFactor[] = [...(path.pathRisk ?? [])];
  const missingSignals: string[] = [];
  const signalProvenance: SignalProvenance[] = [`coordination_path:${path.id}`];
  const escalationReasons: EscalationReason[] = [];

  if (inquiry) {
    signalProvenance.push(`inquiry:${inquiry.id}`);
  } else {
    addUnique(missingSignals, "inquiry");
  }

  if (!hasContext(path, inquiry)) {
    addRisk(riskFactors, "MISSING_CONTEXT");
    addUnique(missingSignals, "context_captured");
  }

  if (!["operator_approved", "authorized", "approved"].includes(path.authorityState)) {
    addRisk(riskFactors, "UNCLEAR_AUTHORITY");
    addUnique(missingSignals, "authority_state");
    addUnique(escalationReasons, "AUTHORITY_REQUIRED");
  }

  const bufferMinutes = typeof path.timingConstraints?.bufferMinutes === "number"
    ? path.timingConstraints.bufferMinutes
    : null;
  if (bufferMinutes !== null && bufferMinutes < 60) {
    addRisk(riskFactors, "INSUFFICIENT_TIME_BUFFER");
    addUnique(escalationReasons, "TIME_CRITICAL");
  }

  if (path.routeTargetId) {
    signalProvenance.push(`route_target:${path.routeTargetId}`);
    if (path.availabilityState === "unavailable" || routeTarget?.active === false) {
      addRisk(riskFactors, "UNAVAILABLE_ROUTE_TARGET");
      addUnique(escalationReasons, "ROUTE_UNAVAILABLE");
    }
  }

  if (path.routeTargetId && !["accepted", "completed", "confirmed"].includes(path.handoffState)) {
    addRisk(riskFactors, "UNCONFIRMED_HANDOFF");
    if (path.handoffState === "stalled") {
      addUnique(escalationReasons, "HANDOFF_STALLED");
    }
  }

  if (path.recoveryCapacity === "low" || path.recoveryCapacity === "none") {
    addRisk(riskFactors, "LOW_RECOVERY_CAPACITY");
  }

  if (path.escalationState === "overdue") {
    addRisk(riskFactors, "ESCALATION_OVERDUE");
    addUnique(escalationReasons, "MANUAL_REVIEW");
  }

  if (hasPriorOpenLoop(events)) {
    addRisk(riskFactors, "PRIOR_OPEN_LOOP_FAILURE");
  }

  if (hasAttributionAmbiguity(events)) {
    addRisk(riskFactors, "ATTRIBUTION_AMBIGUOUS");
  }

  for (const event of events.slice(0, 5)) {
    signalProvenance.push(eventSignal(event));
  }

  const decision = decide(riskFactors, path);
  const humanJudgmentRequired =
    riskFactors.some(isCriticalRisk) ||
    decision === "ESCALATE" ||
    decision === "STOP" ||
    decision === "PROCEED_WITH_OVERSIGHT";

  return {
    decision,
    confidence: confidenceFor(decision, riskFactors),
    riskFactors,
    missingSignals,
    recommendedNextAction: recommendedNextAction(decision),
    humanJudgmentRequired,
    explanation: `Decision ${decision} was produced by deterministic coordination-path rules using current path state, inquiry context, route target state, and path events.`,
    signalProvenance,
    escalationReasons,
    outcomeVerification: normalizedOutcomeVerification(path),
  };
}

export async function assessCoordinationPath(pathId: string): Promise<CoordinationAssessment> {
  const path = await storage.getCoordinationPath(pathId);
  if (!path) {
    throw new Error("Coordination path not found");
  }

  const [inquiry, routeTarget, events] = await Promise.all([
    storage.getInquiry(path.inquiryId),
    path.routeTargetId ? storage.getRouteTarget(path.routeTargetId) : Promise.resolve(null),
    storage.listCoordinationEvents(path.id),
  ]);

  const snapshot = evaluateCoordinationPath({ path, inquiry, routeTarget, events });
  const assessment = await storage.createCoordinationAssessment({
    pathId: path.id,
    operatorId: path.operatorId,
    inquiryId: path.inquiryId,
    decision: snapshot.decision,
    confidence: snapshot.confidence,
    riskFactors: snapshot.riskFactors,
    missingSignals: snapshot.missingSignals,
    recommendedNextAction: snapshot.recommendedNextAction,
    explanation: snapshot.explanation,
    signalProvenance: snapshot.signalProvenance,
    humanJudgmentRequired: snapshot.humanJudgmentRequired,
    escalationReasons: snapshot.escalationReasons,
    outcomeVerification: snapshot.outcomeVerification,
  });

  return {
    id: assessment.id,
    pathId: assessment.pathId,
    decision: assessment.decision,
    confidence: assessment.confidence,
    riskFactors: assessment.riskFactors ?? [],
    missingSignals: assessment.missingSignals ?? [],
    recommendedNextAction: assessment.recommendedNextAction,
    humanJudgmentRequired: assessment.humanJudgmentRequired,
    explanation: assessment.explanation,
    signalProvenance: assessment.signalProvenance ?? [],
    createdAt: assessment.createdAt.toISOString(),
  };
}
