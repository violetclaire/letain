import type { HumanActionDecision } from "@shared/schema";
import type {
  CoordinationJudgmentWithSources,
  ScopedPermissionDecisionWithJudgments,
} from "./storage";

export type InquiryDecisionChainRecordType =
  | "coordination_judgment"
  | "scoped_permission_decision"
  | "human_action_decision";

export type InquiryDecisionChainReferenceType =
  | "supporting_attestation"
  | "related_judgment"
  | "linked_judgment"
  | "related_permission_decision"
  | "reviewed_permission_decision"
  | "related_human_action_decision";

export type InquiryDecisionChainReference = {
  referenceType: InquiryDecisionChainReferenceType;
  targetRecordType: "human_attestation" | InquiryDecisionChainRecordType;
  targetId: string;
  status: "present" | "missing";
};

type InquiryDecisionChainRecordBase = {
  recordType: InquiryDecisionChainRecordType;
  id: string;
  createdAt: Date;
  lifecycleAction: string;
  relatedRecordId: string | null;
  references: InquiryDecisionChainReference[];
};

export type InquiryDecisionChainRecord =
  | (InquiryDecisionChainRecordBase & {
      recordType: "coordination_judgment";
      record: CoordinationJudgmentWithSources;
    })
  | (InquiryDecisionChainRecordBase & {
      recordType: "scoped_permission_decision";
      record: ScopedPermissionDecisionWithJudgments;
    })
  | (InquiryDecisionChainRecordBase & {
      recordType: "human_action_decision";
      record: HumanActionDecision;
      // Approved scope beside the recorded action, so a receipt reader can
      // see at a glance what the permission covered and what the human
      // recorded, plus whether the approval is still live.
      actionScope: InquiryDecisionChainActionScope;
    });

export type InquiryDecisionChainActionScope = {
  reviewedPermissionDecisionId: string;
  approvedProposedAction: string | null;
  approvedScopeText: string | null;
  actualAction: string | null;
  actualScopeText: string | null;
  expiresAt: Date | null;
  withdrawnAt: Date | null;
};

export type InquiryDecisionChainProvenanceGap = {
  sourceRecordType: InquiryDecisionChainRecordType;
  sourceRecordId: string;
  referenceType: InquiryDecisionChainReferenceType;
  missingTargetRecordType: "human_attestation" | InquiryDecisionChainRecordType;
  missingTargetId: string;
};

export type InquiryDecisionChain = {
  operatorId: string;
  inquiryId: string;
  records: InquiryDecisionChainRecord[];
  provenanceGaps: InquiryDecisionChainProvenanceGap[];
};

export type BuildInquiryDecisionChainInput = {
  operatorId: string;
  inquiryId: string;
  knownAttestationIds: readonly string[];
  judgments: readonly CoordinationJudgmentWithSources[];
  permissionDecisions: readonly ScopedPermissionDecisionWithJudgments[];
  humanActionDecisions: readonly HumanActionDecision[];
};

const recordTypeOrder: Record<InquiryDecisionChainRecordType, number> = {
  coordination_judgment: 0,
  scoped_permission_decision: 1,
  human_action_decision: 2,
};

function assertRecordScope(
  operatorId: string,
  inquiryId: string,
  record: { operatorId: string; inquiryId: string; id: string },
) {
  if (record.operatorId !== operatorId || record.inquiryId !== inquiryId) {
    throw new Error(`Decision-chain record ${record.id} is outside the requested operator and inquiry scope`);
  }
}

function reference(
  referenceType: InquiryDecisionChainReferenceType,
  targetRecordType: InquiryDecisionChainReference["targetRecordType"],
  targetId: string,
  present: boolean,
): InquiryDecisionChainReference {
  return {
    referenceType,
    targetRecordType,
    targetId,
    status: present ? "present" : "missing",
  };
}

export function buildInquiryDecisionChain(input: BuildInquiryDecisionChainInput): InquiryDecisionChain {
  const attestationIds = new Set(input.knownAttestationIds);
  const judgmentIds = new Set(input.judgments.map((record) => record.id));
  const permissionDecisionIds = new Set(input.permissionDecisions.map((record) => record.id));
  const permissionDecisionById = new Map(input.permissionDecisions.map((record) => [record.id, record]));
  const humanActionDecisionIds = new Set(input.humanActionDecisions.map((record) => record.id));

  for (const record of input.judgments) {
    assertRecordScope(input.operatorId, input.inquiryId, record);
  }
  for (const record of input.permissionDecisions) {
    assertRecordScope(input.operatorId, input.inquiryId, record);
  }
  for (const record of input.humanActionDecisions) {
    assertRecordScope(input.operatorId, input.inquiryId, record);
  }

  const records: InquiryDecisionChainRecord[] = [
    ...input.judgments.map((record): InquiryDecisionChainRecord => {
      const references = record.supportingAttestationIds.map((attestationId) =>
        reference("supporting_attestation", "human_attestation", attestationId, attestationIds.has(attestationId))
      );
      if (record.relatedJudgmentId) {
        references.push(reference(
          "related_judgment",
          "coordination_judgment",
          record.relatedJudgmentId,
          judgmentIds.has(record.relatedJudgmentId),
        ));
      }
      return {
        recordType: "coordination_judgment",
        id: record.id,
        createdAt: record.createdAt,
        lifecycleAction: record.lifecycleAction,
        relatedRecordId: record.relatedJudgmentId,
        references,
        record,
      };
    }),
    ...input.permissionDecisions.map((record): InquiryDecisionChainRecord => {
      const references = record.linkedJudgmentIds.map((judgmentId) =>
        reference("linked_judgment", "coordination_judgment", judgmentId, judgmentIds.has(judgmentId))
      );
      if (record.relatedPermissionDecisionId) {
        references.push(reference(
          "related_permission_decision",
          "scoped_permission_decision",
          record.relatedPermissionDecisionId,
          permissionDecisionIds.has(record.relatedPermissionDecisionId),
        ));
      }
      return {
        recordType: "scoped_permission_decision",
        id: record.id,
        createdAt: record.createdAt,
        lifecycleAction: record.lifecycleAction,
        relatedRecordId: record.relatedPermissionDecisionId,
        references,
        record,
      };
    }),
    ...input.humanActionDecisions.map((record): InquiryDecisionChainRecord => {
      const reviewed = permissionDecisionById.get(record.permissionDecisionId);
      const references = [reference(
        "reviewed_permission_decision",
        "scoped_permission_decision",
        record.permissionDecisionId,
        permissionDecisionIds.has(record.permissionDecisionId),
      )];
      if (record.relatedHumanActionDecisionId) {
        references.push(reference(
          "related_human_action_decision",
          "human_action_decision",
          record.relatedHumanActionDecisionId,
          humanActionDecisionIds.has(record.relatedHumanActionDecisionId),
        ));
      }
      return {
        recordType: "human_action_decision",
        id: record.id,
        createdAt: record.createdAt,
        lifecycleAction: record.lifecycleAction,
        relatedRecordId: record.relatedHumanActionDecisionId,
        references,
        actionScope: {
          reviewedPermissionDecisionId: record.permissionDecisionId,
          approvedProposedAction: reviewed?.proposedAction ?? null,
          approvedScopeText: reviewed?.scopeText ?? null,
          actualAction: record.actualAction ?? null,
          actualScopeText: record.actualScopeText ?? null,
          expiresAt: record.expiresAt ?? null,
          withdrawnAt: record.withdrawnAt ?? null,
        },
        record,
      };
    }),
  ].sort((left, right) =>
    left.createdAt.getTime() - right.createdAt.getTime()
      || recordTypeOrder[left.recordType] - recordTypeOrder[right.recordType]
      || left.id.localeCompare(right.id)
  );

  const provenanceGaps = records.flatMap((record) =>
    record.references
      .filter((item) => item.status === "missing")
      .map((item): InquiryDecisionChainProvenanceGap => ({
        sourceRecordType: record.recordType,
        sourceRecordId: record.id,
        referenceType: item.referenceType,
        missingTargetRecordType: item.targetRecordType,
        missingTargetId: item.targetId,
      }))
  );

  return {
    operatorId: input.operatorId,
    inquiryId: input.inquiryId,
    records,
    provenanceGaps,
  };
}
