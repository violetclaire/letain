import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCoordinationPath } from "./coordinationAssessment";
import type { CoordinationEvent, CoordinationPath, Inquiry, RouteTarget } from "@shared/schema";

function path(overrides: Partial<CoordinationPath> = {}): CoordinationPath {
  return {
    id: "path-1",
    operatorId: "operator-1",
    inquiryId: "inquiry-1",
    routeTargetId: null,
    candidateRouteId: null,
    status: "active",
    contextCaptured: true,
    timingConstraints: { bufferMinutes: 180 },
    authorityState: "operator_approved",
    availabilityState: "available",
    handoffState: "confirmed",
    escalationState: "none",
    recoveryCapacity: "high",
    commitmentState: "uncommitted",
    outcomeVerificationState: "not_ready",
    pathRisk: [],
    signalProvenance: [],
    metadata: {},
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  } as CoordinationPath;
}

function inquiry(overrides: Partial<Inquiry> = {}): Inquiry {
  return {
    id: "inquiry-1",
    threadToken: "thread-1",
    clientThreadToken: "client-thread-1",
    vendorId: "operator-1",
    clientId: null,
    clientEmail: "client@example.test",
    clientName: "Client Demo",
    clientPhone: null,
    eventDate: new Date("2026-10-25T00:00:00.000Z"),
    eventType: "wedding",
    eventLocation: "Demo Venue",
    serviceType: "bridal beauty",
    partySize: 6,
    message: "Demo message",
    budget: null,
    status: "pending",
    responseMode: "manual",
    depositPaidAt: null,
    infoSheetSentAt: null,
    chatInviteSentAt: null,
    bookingId: null,
    convertedToBookingId: null,
    convertedToContractId: null,
    declinedReason: null,
    referralSourceInquiryId: null,
    referralSourceVendorId: null,
    referralSentAt: null,
    statusReason: null,
    nextAction: null,
    nextActionDueAt: null,
    ownerId: "operator-1",
    hold: null,
    holdPlacedAt: null,
    holdExpiresAt: null,
    holdOwnerId: null,
    holdReason: null,
    firstResponseAt: null,
    lastActionAt: null,
    nextSlaDue: null,
    escalationState: "none",
    breachFlags: null,
    proposalId: null,
    proposedDates: null,
    metadata: {},
    sentiment: null,
    sentimentScore: null,
    sentimentAnalysis: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  } as Inquiry;
}

function target(overrides: Partial<RouteTarget> = {}): RouteTarget {
  return {
    id: "target-1",
    operatorId: "operator-1",
    name: "Route Target",
    email: "target@example.test",
    phone: null,
    roleLabel: "Coordinator",
    tags: [],
    capabilities: [],
    isInternal: false,
    isAgent: false,
    active: true,
    preferred: false,
    availabilitySource: null,
    trustedCircleId: null,
    linkedUserId: null,
    notes: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  } as RouteTarget;
}

test("returns CLARIFY when context is missing", () => {
  const result = evaluateCoordinationPath({ path: path({ contextCaptured: false }), inquiry: null });
  assert.equal(result.decision, "CLARIFY");
  assert.ok(result.riskFactors.includes("MISSING_CONTEXT"));
  assert.ok(result.missingSignals.includes("inquiry"));
  assert.ok(result.missingSignals.includes("context_captured"));
  assert.equal(result.humanJudgmentRequired, true);
});

test("returns ESCALATE when authority is denied", () => {
  const result = evaluateCoordinationPath({ path: path({ authorityState: "denied" }), inquiry: inquiry() });
  assert.equal(result.decision, "ESCALATE");
  assert.ok(result.riskFactors.includes("UNCLEAR_AUTHORITY"));
  assert.ok(result.missingSignals.includes("authority_state"));
});

test("returns REROUTE when route target is unavailable", () => {
  const result = evaluateCoordinationPath({
    path: path({ routeTargetId: "target-1", availabilityState: "unavailable", handoffState: "confirmed" }),
    inquiry: inquiry(),
    routeTarget: target(),
  });
  assert.equal(result.decision, "REROUTE");
  assert.ok(result.riskFactors.includes("UNAVAILABLE_ROUTE_TARGET"));
});

test("returns STOP when timing buffer is low and recovery capacity is low", () => {
  const result = evaluateCoordinationPath({
    path: path({ timingConstraints: { bufferMinutes: 20 }, recoveryCapacity: "low" }),
    inquiry: inquiry(),
  });
  assert.equal(result.decision, "STOP");
  assert.ok(result.riskFactors.includes("INSUFFICIENT_TIME_BUFFER"));
  assert.ok(result.riskFactors.includes("LOW_RECOVERY_CAPACITY"));
});

test("returns PROCEED_WITH_OVERSIGHT when handoff is not confirmed", () => {
  const result = evaluateCoordinationPath({
    path: path({ routeTargetId: "target-1", handoffState: "pending" }),
    inquiry: inquiry(),
    routeTarget: target(),
  });
  assert.equal(result.decision, "PROCEED_WITH_OVERSIGHT");
  assert.ok(result.riskFactors.includes("UNCONFIRMED_HANDOFF"));
  assert.equal(result.humanJudgmentRequired, true);
});

test("returns PROCEED when required state is present and risk is low", () => {
  const result = evaluateCoordinationPath({ path: path(), inquiry: inquiry() });
  assert.equal(result.decision, "PROCEED");
  assert.deepEqual(result.riskFactors, []);
  assert.equal(result.humanJudgmentRequired, false);
});

test("uses path events as signal provenance and risk evidence", () => {
  const event = {
    id: "event-1",
    pathId: "path-1",
    operatorId: "operator-1",
    inquiryId: "inquiry-1",
    eventType: "attribution_ambiguous",
    eventSource: "manual",
    summary: "The responsible handoff owner is ambiguous.",
    signalProvenance: [],
    metadata: {},
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
  } as CoordinationEvent;

  const result = evaluateCoordinationPath({ path: path(), inquiry: inquiry(), events: [event] });
  assert.equal(result.decision, "PROCEED_WITH_OVERSIGHT");
  assert.ok(result.riskFactors.includes("ATTRIBUTION_AMBIGUOUS"));
  assert.ok(result.signalProvenance.includes("coordination_event:event-1:attribution_ambiguous"));
});
