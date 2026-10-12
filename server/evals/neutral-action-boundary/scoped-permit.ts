import { deterministicIntegrityValue } from "./integrity";
import type {
  ActionRequest,
  AuthorityDecision,
  DecisionAuthority,
  PermitValidationResult,
  ScopedPermit,
} from "./types";

export type PermitUsageState = {
  uses: number;
  revokedPermitIds: ReadonlySet<string>;
};

export function issueScopedPermit(input: {
  decision: AuthorityDecision;
  request: ActionRequest;
  authority: DecisionAuthority;
  maximumUses?: number;
}): ScopedPermit {
  if (!["PERMIT", "PERMIT_WITH_CONSTRAINTS"].includes(input.decision.outcome)) {
    throw new Error("A non-permitting authority decision cannot issue a permit");
  }
  if (
    !input.authority.verifiedIdentity ||
    !input.authority.mayIssuePermits ||
    input.authority.authorityId !== input.decision.authorityId
  ) {
    throw new Error("Only the verified deciding authority may issue this permit");
  }
  if (input.authority.authorityId === input.request.actorId) {
    throw new Error("The requesting actor cannot issue its own permit");
  }
  if (input.decision.evaluatedRequestDigest !== deterministicIntegrityValue(input.request)) {
    throw new Error("Permit issuance requires the exact evaluated request");
  }
  if (!input.decision.expiresAt) {
    throw new Error("A scoped permit requires an expiry");
  }

  const issuedAt = Date.parse(input.decision.decidedAt);
  const expiresAt = Date.parse(input.decision.expiresAt);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt) || issuedAt >= expiresAt) {
    throw new Error("A scoped permit requires a valid issuance and expiry interval");
  }

  const permitWithoutIntegrity = {
    permitId: `permit-${input.decision.decisionId}`,
    decisionId: input.decision.decisionId,
    actorId: input.request.actorId,
    taskId: input.request.taskId,
    exactTool: input.request.tool,
    exactAction: input.request.action,
    exactTarget: input.request.target,
    environment: input.request.environment,
    constraints: [...input.decision.constraints],
    maximumUses: input.maximumUses ?? 1,
    issuedAt: input.decision.decidedAt,
    expiresAt: input.decision.expiresAt,
    approvingAuthority: input.authority.authorityId,
    revokedAt: null,
  };
  return Object.freeze({
    ...permitWithoutIntegrity,
    constraints: Object.freeze([...permitWithoutIntegrity.constraints]) as unknown as string[],
    integrityValue: deterministicIntegrityValue(permitWithoutIntegrity),
  });
}

export function validateScopedPermit(input: {
  permit: ScopedPermit;
  request: ActionRequest;
  now: string;
  usage: PermitUsageState;
}): PermitValidationResult {
  const { permit, request } = input;
  const integritySource = {
    permitId: permit.permitId,
    decisionId: permit.decisionId,
    actorId: permit.actorId,
    taskId: permit.taskId,
    exactTool: permit.exactTool,
    exactAction: permit.exactAction,
    exactTarget: permit.exactTarget,
    environment: permit.environment,
    constraints: [...permit.constraints],
    maximumUses: permit.maximumUses,
    issuedAt: permit.issuedAt,
    expiresAt: permit.expiresAt,
    approvingAuthority: permit.approvingAuthority,
    revokedAt: permit.revokedAt,
  };

  if (deterministicIntegrityValue(integritySource) !== permit.integrityValue) {
    return { accepted: false, reasonCode: "PERMIT_INTEGRITY_MISMATCH" };
  }
  if (permit.actorId !== request.actorId) return { accepted: false, reasonCode: "PERMIT_ACTOR_MISMATCH" };
  if (permit.taskId !== request.taskId) return { accepted: false, reasonCode: "PERMIT_TASK_MISMATCH" };
  if (permit.exactTool !== request.tool) return { accepted: false, reasonCode: "PERMIT_TOOL_MISMATCH" };
  if (permit.exactAction !== request.action) return { accepted: false, reasonCode: "PERMIT_ACTION_MISMATCH" };
  if (permit.exactTarget !== request.target) return { accepted: false, reasonCode: "PERMIT_TARGET_MISMATCH" };
  if (permit.environment !== request.environment) {
    return { accepted: false, reasonCode: "PERMIT_ENVIRONMENT_MISMATCH" };
  }
  if (permit.revokedAt || input.usage.revokedPermitIds.has(permit.permitId)) {
    return { accepted: false, reasonCode: "PERMIT_REVOKED" };
  }
  const now = Date.parse(input.now);
  const issuedAt = Date.parse(permit.issuedAt);
  const expiresAt = Date.parse(permit.expiresAt);
  if (![now, issuedAt, expiresAt].every(Number.isFinite) || issuedAt >= expiresAt) {
    return { accepted: false, reasonCode: "PERMIT_TIME_INVALID" };
  }
  if (now < issuedAt) return { accepted: false, reasonCode: "PERMIT_NOT_YET_VALID" };
  if (now >= expiresAt) {
    return { accepted: false, reasonCode: "PERMIT_EXPIRED" };
  }
  if (input.usage.uses >= permit.maximumUses) {
    return { accepted: false, reasonCode: "PERMIT_USE_LIMIT_EXCEEDED" };
  }
  const satisfiedConstraints = new Set(request.satisfiedConstraints ?? []);
  if (permit.constraints.some((constraint) => !satisfiedConstraints.has(constraint))) {
    return { accepted: false, reasonCode: "PERMIT_CONSTRAINT_UNSATISFIED" };
  }
  return { accepted: true, reasonCode: "PERMIT_VALID" };
}

