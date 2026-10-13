import { deterministicIntegrityValue } from "./integrity";
import { validateScopedPermit } from "./scoped-permit";
import {
  EXISTING_PERMISSION_OUTCOME_MAP,
  type ActionRequest,
  type AuthorityDecision,
  type AuthorityDecisionOutcome,
  type ConsequenceLevel,
  type EvaluationContext,
  type EvidenceBundle,
  type HumanApproval,
} from "./types";

const consequenceRank: Record<ConsequenceLevel, number> = {
  LOW: 0,
  MODERATE: 1,
  HIGH: 2,
  CRITICAL: 3,
};

function decision(input: {
  request: ActionRequest;
  context: EvaluationContext;
  outcome: AuthorityDecisionOutcome;
  reasonCodes: string[];
  explanation: string;
  evidenceUsed?: string[];
  evidenceRejected?: string[];
  requiredApprovals?: string[];
  constraints?: string[];
  supportingApprovals?: HumanApproval[];
}): AuthorityDecision {
  const evaluatedRequestDigest = deterministicIntegrityValue(input.request);
  const decisionId = `decision-${deterministicIntegrityValue({
    requestId: input.request.requestId,
    evaluatedRequestDigest,
    outcome: input.outcome,
    reasonCodes: input.reasonCodes,
    policyVersion: input.context.conditions.policyVersion,
    authorityId: input.context.authority.authorityId,
  }).slice(0, 16)}`;
  return {
    decisionId,
    requestId: input.request.requestId,
    evaluatedRequest: structuredClone(input.request),
    evaluatedRequestDigest,
    outcome: input.outcome,
    reasonCodes: input.reasonCodes,
    humanReadableExplanation: input.explanation,
    evidenceUsed: input.evidenceUsed ?? [],
    evidenceRejected: input.evidenceRejected ?? [],
    requiredApprovals: input.requiredApprovals ?? [],
    constraints: input.constraints ?? [],
    policyVersion: input.context.conditions.policyVersion,
    decidedAt: input.request.requestedAt,
    expiresAt: ["PERMIT", "PERMIT_WITH_CONSTRAINTS"].includes(input.outcome)
      ? new Date(Math.min(
          Date.parse(input.context.scope!.validUntil),
          ...(input.supportingApprovals ?? []).map((approval) => Date.parse(approval.expiresAt)),
        )).toISOString()
      : null,
    authorityId: input.context.authority.authorityId,
    existingPermissionEquivalent: EXISTING_PERMISSION_OUTCOME_MAP[input.outcome],
    requiresSeparateHumanActionDecision: true,
  };
}

function approvalMatches(
  approval: HumanApproval,
  request: ActionRequest,
  context: EvaluationContext,
): boolean {
  const now = new Date(request.requestedAt).getTime();
  return (
    approval.authorizedApprover &&
    approval.approverId !== request.actorId &&
    context.authority.authorizedApprovalIds.includes(approval.approverId) &&
    approval.actorId === request.actorId &&
    approval.taskId === request.taskId &&
    approval.exactTool === request.tool &&
    approval.exactAction === request.action &&
    approval.exactTarget === request.target &&
    approval.environment === request.environment &&
    !approval.revoked &&
    new Date(approval.approvedAt).getTime() <= now &&
    now < new Date(approval.expiresAt).getTime() &&
    approval.conditionVersion === context.conditions.conditionVersion
  );
}

function currentReferencedEvidence(
  request: ActionRequest,
  context: EvaluationContext,
): {
  current: EvidenceBundle[];
  rejected: string[];
} {
  const references = new Set(request.evidenceReferences);
  const current: EvidenceBundle[] = [];
  const rejected: string[] = [];
  for (const evidence of context.evidence.filter((item) => references.has(item.evidenceId))) {
    if (evidence.freshness !== "current") {
      rejected.push(`${evidence.evidenceId}:${evidence.freshness}`);
      continue;
    }
    if (evidence.evidenceType === "CDI" && evidence.actorControlled) {
      rejected.push(`${evidence.evidenceId}:actor_controlled_cdi`);
      continue;
    }
    if (evidence.evidenceType === "CDI" && evidence.taskId && evidence.taskId !== request.taskId) {
      rejected.push(`${evidence.evidenceId}:task_scope_mismatch`);
      continue;
    }
    if (
      evidence.evidenceType === "CDI" &&
      evidence.maximumConsequenceLevel &&
      consequenceRank[request.consequenceLevel] > consequenceRank[evidence.maximumConsequenceLevel]
    ) {
      rejected.push(`${evidence.evidenceId}:consequence_scope_mismatch`);
      continue;
    }
    current.push(evidence);
  }
  return { current, rejected };
}

export function evaluateActionRequest(
  request: ActionRequest,
  context: EvaluationContext,
): AuthorityDecision {
  const stop = (reasonCode: string, explanation: string, evidenceRejected: string[] = []) =>
    decision({
      request,
      context,
      outcome: "STOP",
      reasonCodes: [reasonCode],
      explanation,
      evidenceRejected,
    });

  if (!context.actor || !context.actor.verifiedIdentity || context.actor.actorId !== request.actorId) {
    return stop("ACTOR_IDENTITY_INVALID", "The requesting actor identity is unknown or unverified.");
  }
  if (
    !context.authority.verifiedIdentity ||
    !context.authority.mayIssuePermits ||
    context.authority.authorityId === request.actorId
  ) {
    return stop(
      "AUTHORITY_INVALID_OR_SELF_ISSUED",
      "The requesting actor cannot serve as the independent permission authority.",
    );
  }
  if (!context.scope || context.scope.taskId !== request.taskId) {
    return stop("TASK_OUT_OF_SCOPE", "The assigned task is missing or does not match the request.");
  }

  const requestedAt = Date.parse(request.requestedAt);
  const validFrom = Date.parse(context.scope.validFrom);
  const validUntil = Date.parse(context.scope.validUntil);
  if (![requestedAt, validFrom, validUntil].every(Number.isFinite) || validFrom >= validUntil) {
    return stop("ASSIGNED_SCOPE_TIME_INVALID", "The request and assigned scope require a valid time interval.");
  }
  if (
    requestedAt < new Date(context.scope.validFrom).getTime() ||
    requestedAt >= new Date(context.scope.validUntil).getTime()
  ) {
    return stop("ASSIGNED_SCOPE_EXPIRED", "The assigned scope is not active at the request time.");
  }
  if (
    context.scope.prohibitedActions.includes(request.action) ||
    !context.scope.permittedTools.includes(request.tool)
  ) {
    return stop("TOOL_OR_ACTION_PROHIBITED", "The requested tool or action is explicitly prohibited or absent from scope.");
  }
  if (!context.scope.permittedActions.includes(request.action)) {
    return stop("ACTION_OUT_OF_SCOPE", "The exact requested action is not explicitly permitted.");
  }
  if (
    context.scope.prohibitedTargets.includes(request.target) ||
    !context.scope.permittedTargets.includes(request.target)
  ) {
    return stop("TARGET_OUT_OF_SCOPE", "The exact target is prohibited, unknown, or absent from scope.");
  }
  if (
    request.environment !== context.conditions.environment ||
    !context.scope.permittedEnvironments.includes(request.environment)
  ) {
    return stop("ENVIRONMENT_OUT_OF_SCOPE", "The requested environment is not explicitly permitted.");
  }
  if (consequenceRank[request.consequenceLevel] > consequenceRank[context.scope.maximumConsequenceLevel]) {
    return stop("CONSEQUENCE_LEVEL_EXCEEDED", "The request exceeds the assigned maximum consequence level.");
  }

  const evidence = currentReferencedEvidence(request, context);
  const independentEvidence = evidence.current.filter((item) => !item.actorControlled);
  if (
    consequenceRank[request.consequenceLevel] >= consequenceRank.HIGH &&
    independentEvidence.length === 0
  ) {
    return decision({
      request,
      context,
      outcome: "REQUIRE_HUMAN_APPROVAL",
      reasonCodes: ["INDEPENDENT_EVIDENCE_REQUIRED"],
      explanation: "High-consequence permission requires current evidence independent of the requesting actor.",
      evidenceRejected: evidence.rejected,
      requiredApprovals: context.scope.requiredHumanApprovals.length > 0
        ? context.scope.requiredHumanApprovals
        : context.authority.authorizedApprovalIds,
    });
  }
  if (request.evidenceReferences.length > 0 && evidence.current.length === 0) {
    return decision({
      request,
      context,
      outcome: "ESCALATE",
      reasonCodes: ["EVIDENCE_NOT_CURRENT_OR_TRUSTED"],
      explanation: "Referenced evidence is stale, expired, mismatched, or controlled by the requesting actor.",
      evidenceRejected: evidence.rejected,
      requiredApprovals: context.scope.requiredHumanApprovals,
    });
  }
  if (
    context.conditions.evidenceChanged ||
    context.conditions.conditionVersion !== context.scope.conditionVersion
  ) {
    return decision({
      request,
      context,
      outcome: "ESCALATE",
      reasonCodes: ["CONDITIONS_CHANGED"],
      explanation: "Material conditions changed after the permission basis was established.",
      evidenceUsed: evidence.current.map((item) => item.evidenceId),
      evidenceRejected: evidence.rejected,
      requiredApprovals: context.scope.requiredHumanApprovals,
    });
  }

  const approvalEvidence = evidence.current.filter(
    (item): item is EvidenceBundle & { humanApproval: HumanApproval } =>
      item.evidenceType === "HUMAN_APPROVAL" && Boolean(item.humanApproval),
  );
  const validApprovals = approvalEvidence.filter((item) =>
    approvalMatches(item.humanApproval, request, context)
  );
  const missingApprovals = context.scope.requiredHumanApprovals.filter((approverId) =>
    !validApprovals.some((item) => item.humanApproval.approverId === approverId)
  );
  if (missingApprovals.length > 0) {
    return decision({
      request,
      context,
      outcome: "REQUIRE_HUMAN_APPROVAL",
      reasonCodes: ["AUTHORIZED_HUMAN_APPROVAL_REQUIRED"],
      explanation: "The exact action requires a current approval from an authorized human approver.",
      evidenceUsed: evidence.current.map((item) => item.evidenceId),
      evidenceRejected: evidence.rejected,
      requiredApprovals: context.scope.requiredHumanApprovals,
    });
  }
  if (
    context.conditions.recentActionCount > context.scope.maximumRecentActionCount ||
    context.conditions.velocity > context.scope.maximumRecentActionCount
  ) {
    return decision({
      request,
      context,
      outcome: "ESCALATE",
      reasonCodes: ["VELOCITY_LIMIT_EXCEEDED"],
      explanation: "The action rate exceeds the assigned velocity ceiling and requires human review.",
      evidenceUsed: evidence.current.map((item) => item.evidenceId),
      requiredApprovals: context.scope.requiredHumanApprovals.length > 0
        ? context.scope.requiredHumanApprovals
        : context.authority.authorizedApprovalIds,
    });
  }
  if (context.conditions.estimatedBlastRadius > context.scope.maximumBlastRadius) {
    return stop("BLAST_RADIUS_EXCEEDED", "The estimated blast radius exceeds the assigned limit.");
  }
  if (context.conditions.permissionRevoked) {
    return stop("PERMISSION_REVOKED", "The permission basis has been revoked.");
  }
  if (
    context.conditions.knownAnomalies.length >= 3 &&
    context.conditions.estimatedBlastRadius >= Math.ceil(context.scope.maximumBlastRadius * 0.75)
  ) {
    return decision({
      request,
      context,
      outcome: "ESCALATE",
      reasonCodes: ["COMBINED_ANOMALY_THRESHOLD"],
      explanation: "Individually ambiguous signals combine into a consequential pattern requiring human review.",
      evidenceUsed: evidence.current.map((item) => item.evidenceId),
      requiredApprovals: context.authority.authorizedApprovalIds,
    });
  }
  if (request.presentedPermit) {
    const permitValidation = validateScopedPermit({
      permit: request.presentedPermit,
      request,
      now: request.requestedAt,
      usage: { uses: 0, revokedPermitIds: new Set() },
    });
    if (!permitValidation.accepted) {
      return stop(permitValidation.reasonCode, "The presented narrow permit is invalid for this exact request.");
    }
  }

  const approvalConstraints = validApprovals.flatMap((item) => item.humanApproval.constraints);
  const constraints = Array.from(new Set([...context.scope.constraints, ...approvalConstraints]));
  const outcome: AuthorityDecisionOutcome = constraints.length > 0
    ? "PERMIT_WITH_CONSTRAINTS"
    : "PERMIT";
  return decision({
    request,
    context,
    outcome,
    reasonCodes: [
      "EXACT_SCOPE_MATCH",
      validApprovals.length > 0 ? "AUTHORIZED_HUMAN_APPROVAL_PRESENT" : "NO_ADDITIONAL_APPROVAL_REQUIRED",
    ],
    explanation: constraints.length > 0
      ? "The exact action is permitted only within the listed constraints; capability evidence did not widen scope."
      : "The exact low-consequence action matches the active assigned scope; capability evidence did not create permission.",
    evidenceUsed: evidence.current.map((item) => item.evidenceId),
    evidenceRejected: evidence.rejected,
    constraints,
    supportingApprovals: validApprovals.map((item) => item.humanApproval),
  });
}

