import type { ScopedPermissionDecisionValue } from "../../../shared/schema";

export const CONSEQUENCE_LEVELS = ["LOW", "MODERATE", "HIGH", "CRITICAL"] as const;
export type ConsequenceLevel = typeof CONSEQUENCE_LEVELS[number];

export const AUTHORITY_DECISION_OUTCOMES = [
  "PERMIT",
  "PERMIT_WITH_CONSTRAINTS",
  "REQUIRE_HUMAN_APPROVAL",
  "ESCALATE",
  "STOP",
] as const;
export type AuthorityDecisionOutcome = typeof AUTHORITY_DECISION_OUTCOMES[number];

export const EXISTING_PERMISSION_OUTCOME_MAP: Record<
  AuthorityDecisionOutcome,
  ScopedPermissionDecisionValue
> = {
  PERMIT: "permitted",
  PERMIT_WITH_CONSTRAINTS: "permitted_with_conditions",
  REQUIRE_HUMAN_APPROVAL: "wait",
  ESCALATE: "escalation_required",
  STOP: "not_permitted",
};

export type ActorIdentity = {
  actorId: string;
  actorType: "human" | "agent" | "service";
  verifiedIdentity: boolean;
  operatingOrganization: string;
  modelProvider?: string;
  delegatedBy: string;
  identityEvidence: string[];
};

export type HumanApproval = {
  approvalId: string;
  approverId: string;
  authorizedApprover: boolean;
  actorId: string;
  taskId: string;
  exactTool: string;
  exactAction: string;
  exactTarget: string;
  environment: string;
  approvedAt: string;
  expiresAt: string;
  revoked: boolean;
  conditionVersion: string;
  constraints: string[];
  rationale: string;
};

export type EvidenceBundle = {
  evidenceId: string;
  evidenceType: "CDI" | "BEHAVIORAL" | "SYSTEM" | "HUMAN_APPROVAL";
  source: string;
  observedAt: string;
  confidence: number;
  freshness: "current" | "stale" | "expired";
  actorControlled: boolean;
  value: string | number | boolean;
  supportingAttestations: string[];
  taskId?: string;
  maximumConsequenceLevel?: ConsequenceLevel;
  humanApproval?: HumanApproval;
};

export type AssignedScope = {
  taskId: string;
  permittedActions: string[];
  permittedTools: string[];
  permittedTargets: string[];
  permittedEnvironments: string[];
  prohibitedActions: string[];
  prohibitedTargets: string[];
  validFrom: string;
  validUntil: string;
  conditionVersion: string;
  maximumConsequenceLevel: ConsequenceLevel;
  requiredHumanApprovals: string[];
  constraints: string[];
  maximumRecentActionCount: number;
  maximumBlastRadius: number;
};

export type CurrentConditions = {
  environment: string;
  activeIncident: boolean;
  targetState: string;
  knownAnomalies: string[];
  policyVersion: string;
  conditionVersion: string;
  evidenceChanged: boolean;
  permissionRevoked: boolean;
  velocity: number;
  recentActionCount: number;
  estimatedBlastRadius: number;
};

export type ScopedPermit = {
  permitId: string;
  decisionId: string;
  actorId: string;
  taskId: string;
  exactTool: string;
  exactAction: string;
  exactTarget: string;
  environment: string;
  constraints: string[];
  maximumUses: number;
  issuedAt: string;
  expiresAt: string;
  approvingAuthority: string;
  revokedAt: string | null;
  integrityValue: string;
};

export type ActionRequest = {
  requestId: string;
  actorId: string;
  actorType: ActorIdentity["actorType"];
  taskId: string;
  tool: string;
  action: string;
  target: string;
  environment: string;
  requestedAt: string;
  claimedScope: string;
  consequenceLevel: ConsequenceLevel;
  evidenceReferences: string[];
  currentConditionReferences: string[];
  presentedPermit?: ScopedPermit;
  satisfiedConstraints?: string[];
};

export type DecisionAuthority = {
  authorityId: string;
  verifiedIdentity: boolean;
  mayIssuePermits: boolean;
  authorizedApprovalIds: string[];
};

export type AuthorityDecision = {
  decisionId: string;
  requestId: string;
  outcome: AuthorityDecisionOutcome;
  reasonCodes: string[];
  humanReadableExplanation: string;
  evidenceUsed: string[];
  evidenceRejected: string[];
  requiredApprovals: string[];
  constraints: string[];
  policyVersion: string;
  decidedAt: string;
  expiresAt: string | null;
  authorityId: string;
  existingPermissionEquivalent: ScopedPermissionDecisionValue;
  requiresSeparateHumanActionDecision: true;
};

export type DecisionReceipt = {
  receiptId: string;
  requestId: string;
  decisionId: string;
  previousReceiptReference: string | null;
  inputSummary: string;
  decisionSummary: string;
  policyVersion: string;
  timestamp: string;
  integrityValue: string;
};

export type EvaluationContext = {
  actor: ActorIdentity | null;
  scope: AssignedScope | null;
  evidence: EvidenceBundle[];
  conditions: CurrentConditions;
  authority: DecisionAuthority;
};

export type SyntheticActionCase = {
  caseId: string;
  sequence: number;
  label: string;
  category: "attack_path" | "legitimate_control";
  authorizedAction: boolean;
  request: ActionRequest;
  context: EvaluationContext;
  expectedOutcome: AuthorityDecisionOutcome;
};

export type PermitValidationResult = {
  accepted: boolean;
  reasonCode: string;
};

export type FakeToolResult = {
  executed: boolean;
  reasonCode: string;
  simulatedRecord: {
    requestId: string;
    tool: string;
    action: string;
    target: string;
  } | null;
};

export type NeutralActionBoundaryMetrics = {
  totalSyntheticActions: number;
  totalLegitimateControls: number;
  totalAttackPathActions: number;
  firstBlockedAttackPathStep: string | null;
  unauthorizedLowConsequenceActionsPermitted: number;
  unauthorizedHighConsequenceActionsPermitted: number;
  legitimateActionsCompleted: number;
  legitimateActionsIncorrectlyStopped: number;
  actionsUnnecessarilyEscalated: number;
  permitsCorrectlyRejectedForScopeMismatch: number;
  permitsCorrectlyRejectedForExpiration: number;
  permitsCorrectlyRejectedAfterRevocation: number;
  attemptsToBroadenOrReuseNarrowPermit: number;
  cdiOverrideAttemptsCorrectlyRejected: number;
  decisionExplanationsPresent: number;
  deterministicReplay: boolean;
};
