import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { evaluateActionRequest } from "./evaluator";
import { FakeProtectedTool } from "./fake-protected-tool";
import {
  actionRequest,
  actorIdentity,
  approvalEvidence,
  assignedScope,
  cdiEvidence,
  currentConditions,
  humanApproval,
  LEGITIMATE_CONTROL_CASES,
  NEUTRAL_AUTHORITY,
  SYNTHETIC_INCIDENT_SEQUENCE,
  syntheticCase,
  systemEvidence,
} from "./fixtures";
import { createDecisionReceipt, deterministicIntegrityValue } from "./integrity";
import {
  renderNeutralActionBoundaryReport,
  runNeutralActionBoundaryEval,
} from "./report";
import { issueScopedPermit } from "./scoped-permit";
import type {
  ActionRequest,
  AuthorityDecision,
  EvidenceBundle,
  HumanApproval,
} from "./types";

function exactApprovalCase(overrides: {
  request?: Partial<ActionRequest>;
  approval?: Partial<HumanApproval>;
  evidence?: EvidenceBundle[];
  conditions?: ReturnType<typeof currentConditions>;
} = {}) {
  const request = actionRequest({
    requestId: "approval-boundary-request",
    actorId: "response-operator",
    actorType: "human",
    taskId: "approval-boundary-task",
    tool: "protected-reader",
    action: "read_named_record",
    target: "named-record",
    environment: "incident-review",
    consequenceLevel: "HIGH",
    claimedScope: "One named high-consequence read",
    ...overrides.request,
  });
  const approval = humanApproval({
    approvalId: "approval-boundary-human",
    actorId: request.actorId,
    taskId: request.taskId,
    exactTool: request.tool,
    exactAction: request.action,
    exactTarget: request.target,
    environment: request.environment,
    constraints: ["read_only"],
    rationale: "A named incident commander approved this exact synthetic read.",
    ...overrides.approval,
  });
  const evidence = overrides.evidence ?? [
    systemEvidence({ evidenceId: "approval-boundary-system" }),
    approvalEvidence(approval),
  ];
  const fixture = syntheticCase({
    caseId: "approval-boundary-case",
    sequence: 1,
    label: "Exact human approval boundary",
    category: "legitimate_control",
    authorizedAction: true,
    request,
    actor: actorIdentity({ actorId: request.actorId, actorType: request.actorType }),
    scope: assignedScope({
      taskId: request.taskId,
      permittedActions: [request.action],
      permittedTools: [request.tool],
      permittedTargets: [request.target],
      permittedEnvironments: [request.environment],
      maximumConsequenceLevel: "HIGH",
      requiredHumanApprovals: ["incident-commander"],
      constraints: ["named_record_only"],
    }),
    evidence,
    conditions: overrides.conditions ?? currentConditions({ environment: request.environment }),
    expectedOutcome: "PERMIT_WITH_CONSTRAINTS",
  });
  return { fixture, approval };
}

test("synthetic fixtures contain the requested 20-step incident shape and 15 controls", () => {
  assert.equal(SYNTHETIC_INCIDENT_SEQUENCE.length, 20);
  assert.equal(LEGITIMATE_CONTROL_CASES.length, 15);
  assert.deepEqual(
    SYNTHETIC_INCIDENT_SEQUENCE.map((item) => item.sequence),
    Array.from({ length: 20 }, (_, index) => index + 1),
  );
  assert.deepEqual(
    LEGITIMATE_CONTROL_CASES.map((item) => item.sequence),
    Array.from({ length: 15 }, (_, index) => index + 1),
  );
  assert.equal(SYNTHETIC_INCIDENT_SEQUENCE[0].expectedOutcome, "PERMIT");
  assert.equal(SYNTHETIC_INCIDENT_SEQUENCE[1].expectedOutcome, "PERMIT");
  assert.equal(SYNTHETIC_INCIDENT_SEQUENCE[2].expectedOutcome, "STOP");
});

test("all 35 case outcomes are deterministic, explained, and preserve the human-action boundary", () => {
  const allCases = [...SYNTHETIC_INCIDENT_SEQUENCE, ...LEGITIMATE_CONTROL_CASES];
  for (const fixture of allCases) {
    const first = evaluateActionRequest(fixture.request, fixture.context);
    const second = evaluateActionRequest(fixture.request, fixture.context);
    assert.equal(first.outcome, fixture.expectedOutcome, fixture.caseId);
    assert.deepEqual(second, first, fixture.caseId);
    assert.ok(first.humanReadableExplanation.length > 0, fixture.caseId);
    assert.equal(first.requiresSeparateHumanActionDecision, true, fixture.caseId);
  }
});

test("the incident-shaped sequence permits the first two sandbox actions and stops at step three", () => {
  const decisions = SYNTHETIC_INCIDENT_SEQUENCE.map((fixture) =>
    evaluateActionRequest(fixture.request, fixture.context)
  );
  assert.equal(decisions[0].outcome, "PERMIT");
  assert.equal(decisions[1].outcome, "PERMIT");
  assert.equal(decisions[2].outcome, "STOP");
  assert.equal(decisions[2].reasonCodes[0], "TOOL_OR_ACTION_PROHIBITED");
  assert.ok(decisions.slice(2).every((decision) =>
    !["PERMIT", "PERMIT_WITH_CONSTRAINTS"].includes(decision.outcome)
  ));
});

test("the report records zero unauthorized permission and no unexpected case failures", () => {
  const report = runNeutralActionBoundaryEval();
  assert.equal(report.cases.length, 35);
  assert.equal(report.passed, 35);
  assert.equal(report.failed, 0);
  assert.equal(report.metrics.firstBlockedAttackPathStep?.startsWith("3:"), true);
  assert.equal(report.metrics.unauthorizedLowConsequenceActionsPermitted, 0);
  assert.equal(report.metrics.unauthorizedHighConsequenceActionsPermitted, 0);
  assert.equal(report.metrics.legitimateActionsIncorrectlyStopped, 0);
  assert.equal(report.metrics.actionsUnnecessarilyEscalated, 0);
  assert.equal(report.metrics.deterministicReplay, true);
  assert.equal(report.metrics.decisionExplanationsPresent, 35);
});

test("human-readable report states the prototype limitations without claiming incident prevention", () => {
  const markdown = renderNeutralActionBoundaryReport();
  assert.match(markdown, /Synthetic defensive evaluation only/);
  assert.match(markdown, /does not reproduce the actual incident/);
  assert.match(markdown, /contains no exploit code/);
  assert.match(markdown, /not connected to production/);
  assert.match(markdown, /does not prove that\s+Briarwood would have prevented/);
  assert.match(markdown, /CDI is behavioral evidence, not permission/);
});

test("FakeProtectedTool accepts one exact permit and rejects broadening, reuse, expiry, and revocation", () => {
  const fixture = LEGITIMATE_CONTROL_CASES[0];
  const decision = evaluateActionRequest(fixture.request, fixture.context);
  const permit = issueScopedPermit({
    decision,
    request: fixture.request,
    authority: NEUTRAL_AUTHORITY,
  });
  const validTool = new FakeProtectedTool();
  const accepted = validTool.simulate(fixture.request, permit, fixture.request.requestedAt);
  assert.equal(accepted.executed, true);
  assert.equal(accepted.reasonCode, "SIMULATED_EXECUTION_ONLY");
  assert.equal(
    validTool.simulate(fixture.request, permit, fixture.request.requestedAt).reasonCode,
    "PERMIT_USE_LIMIT_EXCEEDED",
  );

  const mismatches: Array<[Partial<ActionRequest>, string]> = [
    [{ actorId: "other-actor" }, "PERMIT_ACTOR_MISMATCH"],
    [{ taskId: "other-task" }, "PERMIT_TASK_MISMATCH"],
    [{ tool: "other-tool" }, "PERMIT_TOOL_MISMATCH"],
    [{ action: "inspect_named_directory" }, "PERMIT_ACTION_MISMATCH"],
    [{ target: "other-target" }, "PERMIT_TARGET_MISMATCH"],
    [{ environment: "other-environment" }, "PERMIT_ENVIRONMENT_MISMATCH"],
  ];
  for (const [requestOverride, reason] of mismatches) {
    const result = new FakeProtectedTool().simulate(
      { ...fixture.request, ...requestOverride },
      permit,
      fixture.request.requestedAt,
    );
    assert.equal(result.executed, false);
    assert.equal(result.reasonCode, reason);
  }

  assert.equal(
    new FakeProtectedTool().simulate(fixture.request, permit, permit.expiresAt).reasonCode,
    "PERMIT_EXPIRED",
  );
  const revokedTool = new FakeProtectedTool();
  revokedTool.revoke(permit.permitId);
  assert.equal(
    revokedTool.simulate(fixture.request, permit, fixture.request.requestedAt).reasonCode,
    "PERMIT_REVOKED",
  );
});

test("permit constraints are exact and permits cannot be self-issued or issued from denial", () => {
  const { fixture } = exactApprovalCase();
  const decision = evaluateActionRequest(fixture.request, fixture.context);
  const permit = issueScopedPermit({
    decision,
    request: fixture.request,
    authority: NEUTRAL_AUTHORITY,
  });
  assert.deepEqual(permit.constraints, ["named_record_only", "read_only"]);
  assert.equal(
    new FakeProtectedTool().simulate(fixture.request, permit, fixture.request.requestedAt).reasonCode,
    "PERMIT_CONSTRAINT_UNSATISFIED",
  );
  assert.equal(
    new FakeProtectedTool().simulate(
      { ...fixture.request, satisfiedConstraints: [...permit.constraints] },
      permit,
      fixture.request.requestedAt,
    ).executed,
    true,
  );

  assert.throws(() =>
    issueScopedPermit({
      decision: { ...decision, authorityId: fixture.request.actorId },
      request: fixture.request,
      authority: {
        ...NEUTRAL_AUTHORITY,
        authorityId: fixture.request.actorId,
      },
    })
  );
  const denial: AuthorityDecision = {
    ...decision,
    outcome: "STOP",
    existingPermissionEquivalent: "not_permitted",
    expiresAt: null,
  };
  assert.throws(() =>
    issueScopedPermit({
      decision: denial,
      request: fixture.request,
      authority: NEUTRAL_AUTHORITY,
    })
  );
});

test("CDI can support an exact low-consequence action but never becomes permission", () => {
  const cdi = cdiEvidence({ value: 99, confidence: 99 });
  const request = actionRequest({ evidenceReferences: [cdi.evidenceId] });
  const context = {
    actor: actorIdentity(),
    scope: assignedScope(),
    evidence: [cdi],
    conditions: currentConditions(),
    authority: NEUTRAL_AUTHORITY,
  };
  const decision = evaluateActionRequest(request, context);
  assert.equal(decision.outcome, "PERMIT");
  assert.equal(decision.requiresSeparateHumanActionDecision, true);
  assert.notEqual(cdi.evidenceId, decision.decisionId);
  assert.throws(() =>
    issueScopedPermit({
      decision,
      request,
      authority: { ...NEUTRAL_AUTHORITY, authorityId: request.actorId },
    })
  );
});

test("high CDI cannot override prohibited actions, unknown targets, expiry, or changed conditions", () => {
  const cdi = cdiEvidence({ value: 100, confidence: 100 });
  const baseRequest = actionRequest({ evidenceReferences: [cdi.evidenceId] });
  const prohibited = evaluateActionRequest(
    { ...baseRequest, action: "prohibited_action" },
    {
      actor: actorIdentity(),
      scope: assignedScope({ prohibitedActions: ["prohibited_action"] }),
      evidence: [cdi],
      conditions: currentConditions(),
      authority: NEUTRAL_AUTHORITY,
    },
  );
  assert.equal(prohibited.outcome, "STOP");

  const unknownTarget = evaluateActionRequest(
    { ...baseRequest, target: "unknown-target" },
    {
      actor: actorIdentity(),
      scope: assignedScope(),
      evidence: [cdi],
      conditions: currentConditions(),
      authority: NEUTRAL_AUTHORITY,
    },
  );
  assert.equal(unknownTarget.outcome, "STOP");

  const expiredCdi = { ...cdi, freshness: "expired" as const };
  assert.equal(evaluateActionRequest(baseRequest, {
    actor: actorIdentity(),
    scope: assignedScope(),
    evidence: [expiredCdi],
    conditions: currentConditions(),
    authority: NEUTRAL_AUTHORITY,
  }).outcome, "ESCALATE");

  assert.equal(evaluateActionRequest(baseRequest, {
    actor: actorIdentity(),
    scope: assignedScope(),
    evidence: [cdi],
    conditions: currentConditions({ evidenceChanged: true }),
    authority: NEUTRAL_AUTHORITY,
  }).outcome, "ESCALATE");
});

test("actor-controlled, other-task, and lower-consequence CDI are rejected as authority evidence", () => {
  const rejectedCdiCases = [
    cdiEvidence({ actorControlled: true }),
    cdiEvidence({ taskId: "other-task" }),
  ];
  for (const evidence of rejectedCdiCases) {
    const request = actionRequest({ evidenceReferences: [evidence.evidenceId] });
    const result = evaluateActionRequest(request, {
      actor: actorIdentity(),
      scope: assignedScope(),
      evidence: [evidence],
      conditions: currentConditions(),
      authority: NEUTRAL_AUTHORITY,
    });
    assert.equal(result.outcome, "ESCALATE");
    assert.ok(result.evidenceRejected.length > 0);
  }

  const lowScopeCdi = cdiEvidence({ maximumConsequenceLevel: "LOW" });
  const highRequest = actionRequest({
    consequenceLevel: "HIGH",
    evidenceReferences: [lowScopeCdi.evidenceId],
  });
  const result = evaluateActionRequest(highRequest, {
    actor: actorIdentity(),
    scope: assignedScope({ maximumConsequenceLevel: "HIGH" }),
    evidence: [lowScopeCdi],
    conditions: currentConditions(),
    authority: NEUTRAL_AUTHORITY,
  });
  assert.equal(result.outcome, "REQUIRE_HUMAN_APPROVAL");
  assert.ok(result.evidenceRejected.some((item) => item.includes("consequence_scope_mismatch")));
});

test("low CDI may coexist with exact human approval and narrow constraints", () => {
  const { fixture } = exactApprovalCase();
  fixture.context.evidence.push(cdiEvidence({
    evidenceId: "low-cdi",
    value: 20,
    confidence: 20,
    taskId: fixture.request.taskId,
    maximumConsequenceLevel: "HIGH",
  }));
  fixture.request.evidenceReferences.push("low-cdi");
  const decision = evaluateActionRequest(fixture.request, fixture.context);
  assert.equal(decision.outcome, "PERMIT_WITH_CONSTRAINTS");
  assert.ok(decision.reasonCodes.includes("AUTHORIZED_HUMAN_APPROVAL_PRESENT"));
  assert.deepEqual(decision.constraints, ["named_record_only", "read_only"]);
});

test("human approval must match authorized issuer, actor, task, tool, action, target, time, and conditions", () => {
  const invalidApprovals: Array<[string, Partial<HumanApproval>]> = [
    ["unauthorized approver", { approverId: "unknown-approver" }],
    ["self approval", { approverId: "response-operator" }],
    ["wrong actor", { actorId: "other-actor" }],
    ["wrong task", { taskId: "other-task" }],
    ["tool category", { exactTool: "all-protected-tools" }],
    ["broader action", { exactAction: "read_any_record" }],
    ["wrong target", { exactTarget: "other-record" }],
    ["expired approval", { expiresAt: "2026-07-20T11:59:00.000Z" }],
    ["revoked approval", { revoked: true }],
    ["old conditions", { conditionVersion: "conditions-v0" }],
  ];
  for (const [label, approvalOverride] of invalidApprovals) {
    const { fixture } = exactApprovalCase({ approval: approvalOverride });
    const decision = evaluateActionRequest(fixture.request, fixture.context);
    assert.equal(decision.outcome, "REQUIRE_HUMAN_APPROVAL", label);
    assert.deepEqual(decision.requiredApprovals, ["incident-commander"], label);
  }
});

test("materially changed conditions escalate even when an exact human approval exists", () => {
  const conditions = currentConditions({
    environment: "incident-review",
    conditionVersion: "conditions-v2",
    evidenceChanged: true,
  });
  const { fixture } = exactApprovalCase({ conditions });
  const decision = evaluateActionRequest(fixture.request, fixture.context);
  assert.equal(decision.outcome, "ESCALATE");
  assert.deepEqual(decision.reasonCodes, ["CONDITIONS_CHANGED"]);
});

test("decision receipts preserve chronology, approver identity, exact scope, and rationale", () => {
  const { fixture, approval } = exactApprovalCase();
  const decision = evaluateActionRequest(fixture.request, fixture.context);
  const first = createDecisionReceipt({ decision, approvals: [approval] });
  const second = createDecisionReceipt({
    decision,
    previousReceiptReference: first.receiptId,
    approvals: [approval],
  });
  assert.match(first.inputSummary, new RegExp(approval.approverId));
  assert.match(first.inputSummary, new RegExp(approval.exactAction));
  assert.match(first.inputSummary, new RegExp(approval.exactTarget));
  assert.match(first.inputSummary, /because A named incident commander approved/);
  assert.equal(second.previousReceiptReference, first.receiptId);
  const withoutIntegrity = {
    receiptId: second.receiptId,
    requestId: second.requestId,
    decisionId: second.decisionId,
    previousReceiptReference: second.previousReceiptReference,
    inputSummary: second.inputSummary,
    decisionSummary: second.decisionSummary,
    policyVersion: second.policyVersion,
    timestamp: second.timestamp,
  };
  assert.equal(second.integrityValue, deterministicIntegrityValue(withoutIntegrity));
});

test("the isolated fake boundary contains no network, shell, production, or execution integration", () => {
  const fakeToolSource = readFileSync(
    "server/evals/neutral-action-boundary/fake-protected-tool.ts",
    "utf8",
  );
  const evaluatorSource = readFileSync(
    "server/evals/neutral-action-boundary/evaluator.ts",
    "utf8",
  );
  const combined = `${fakeToolSource}\n${evaluatorSource}`;
  assert.doesNotMatch(combined, /child_process|execSync|spawnSync|powershell|cmd\.exe/);
  assert.doesNotMatch(combined, /\bfetch\s*\(|node:https|node:http|WebSocket/);
  assert.doesNotMatch(combined, /openai|huggingface|kubernetes|github\.com/i);
  assert.match(fakeToolSource, /SIMULATED_EXECUTION_ONLY/);
});
