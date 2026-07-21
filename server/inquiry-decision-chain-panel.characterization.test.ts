import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  InquiryDecisionChainPanel,
  type InquiryDecisionChain,
  type InquiryDecisionChainRecord,
} from "../client/src/components/InquiryDecisionChainPanel";

const inquiryWorkspaceSource = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");
const panelSource = readFileSync("client/src/components/InquiryDecisionChainPanel.tsx", "utf8");
const routesSource = readFileSync("server/routes.ts", "utf8");
const schemaSource = readFileSync("shared/schema.ts", "utf8");
const storageSource = readFileSync("server/storage.ts", "utf8");

function sourceBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `${startMarker} should exist`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `${endMarker} should exist after ${startMarker}`);
  return source.slice(start, end);
}

function record(overrides: Partial<InquiryDecisionChainRecord> = {}): InquiryDecisionChainRecord {
  return {
    recordType: "coordination_judgment",
    id: "judgment-a",
    createdAt: "2026-07-20T09:00:00.000Z",
    lifecycleAction: "judgment",
    relatedRecordId: null,
    references: [],
    record: {},
    ...overrides,
  } as InquiryDecisionChainRecord;
}

function chain(overrides: Partial<InquiryDecisionChain> = {}): InquiryDecisionChain {
  return {
    operatorId: "artist-a",
    inquiryId: "inquiry-a",
    records: [record()],
    provenanceGaps: [],
    ...overrides,
  };
}

function renderPanel(props: Parameters<typeof InquiryDecisionChainPanel>[0]): string {
  return renderToStaticMarkup(createElement(InquiryDecisionChainPanel, props));
}

test("panel is fetched only for the authenticated operator and selected inquiry", () => {
  const querySource = sourceBetween(
    inquiryWorkspaceSource,
    "const decisionChainQuery = useQuery<InquiryDecisionChainResponse>",
    "const draftCandidatesQuery = useQuery<DraftRouteCandidatesResponse>",
  );
  assert.match(querySource, /queryKey: inquiryDecisionChainQueryKey\(selectedInquiryId\)/);
  assert.match(querySource, /enabled: isAuthenticated && isOperator && Boolean\(selectedInquiryId\)/);
  assert.match(querySource, /\/api\/inquiries\/\$\{encodeURIComponent\(selectedInquiryId\)\}\/decision-chain/);
  assert.match(querySource, /credentials: "include"/);
  assert.match(querySource, /payload\.decisionChain\.inquiryId !== selectedInquiryId/);

  const authGuardIndex = inquiryWorkspaceSource.indexOf("if (!isAuthenticated)");
  const operatorGuardIndex = inquiryWorkspaceSource.indexOf("if (!isOperator)");
  const panelIndex = inquiryWorkspaceSource.indexOf("<InquiryDecisionChainPanel");
  assert.ok(authGuardIndex !== -1 && operatorGuardIndex !== -1 && panelIndex !== -1);
  assert.ok(authGuardIndex < panelIndex && operatorGuardIndex < panelIndex);
});

test("switching inquiries cannot render records from the previous inquiry", () => {
  assert.match(
    inquiryWorkspaceSource,
    /const selectedDecisionChain = decisionChainQuery\.data\?\.decisionChain\.inquiryId === selectedInquiryId/,
  );
  assert.match(inquiryWorkspaceSource, /inquiryDecisionChainQueryKey\(selectedInquiryId\)/);
  assert.doesNotMatch(inquiryWorkspaceSource, /inquiryDecisionChainQueryKey[\s\S]*?placeholderData:/);
  assert.doesNotMatch(inquiryWorkspaceSource, /inquiryDecisionChainQueryKey[\s\S]*?keepPreviousData/);
});

test("panel preserves the server-provided deterministic record order", () => {
  const html = renderPanel({
    status: "ready",
    decisionChain: chain({
      records: [
        record({ id: "judgment-first" }),
        record({
          recordType: "scoped_permission_decision",
          id: "permission-second",
          createdAt: "2026-07-20T10:00:00.000Z",
        }),
        record({
          recordType: "human_action_decision",
          id: "action-third",
          createdAt: "2026-07-20T11:00:00.000Z",
          record: { choice: "wait" },
        }),
      ],
    }),
  });
  assert.ok(html.indexOf("judgment-first") < html.indexOf("permission-second"));
  assert.ok(html.indexOf("permission-second") < html.indexOf("action-third"));
});

test("all lifecycle records and related-record links remain visible", () => {
  const html = renderPanel({
    status: "ready",
    decisionChain: chain({
      records: [
        record({ id: "original", lifecycleAction: "judgment" }),
        record({ id: "correction", lifecycleAction: "correction", relatedRecordId: "original" }),
        record({ id: "withdrawal", lifecycleAction: "withdrawal", relatedRecordId: "correction" }),
        record({ id: "supersession", lifecycleAction: "supersession", relatedRecordId: "withdrawal" }),
      ],
    }),
  });
  for (const visibleValue of [
    "Original",
    "Correction",
    "Withdrawal",
    "Supersession",
    "original",
    "correction",
    "withdrawal",
  ]) {
    assert.match(html, new RegExp(`>${visibleValue}<`));
  }
});

test("human choices render exactly as stored and remain non-executing", () => {
  const choices = ["proceed", "wait", "clarify", "escalate", "stop"] as const;
  const html = renderPanel({
    status: "ready",
    decisionChain: chain({
      records: choices.map((choice, index) => record({
        recordType: "human_action_decision",
        id: `action-${choice}`,
        createdAt: `2026-07-20T1${index}:00:00.000Z`,
        record: { choice },
      })),
    }),
  });
  for (const choice of choices) {
    assert.match(html, new RegExp(`>${choice}<`));
  }
  assert.match(html, /A displayed proceed choice does not perform an action\./);
});

test("missing provenance and broken references are visibly explicit", () => {
  const html = renderPanel({
    status: "ready",
    decisionChain: chain({
      records: [record({
        references: [{
          referenceType: "supporting_attestation",
          targetRecordType: "human_attestation",
          targetId: "missing-attestation",
          status: "missing",
        }],
      })],
      provenanceGaps: [{
        sourceRecordType: "coordination_judgment",
        sourceRecordId: "judgment-a",
        referenceType: "supporting_attestation",
        missingTargetRecordType: "human_attestation",
        missingTargetId: "missing-attestation",
      }],
    }),
  });
  assert.match(html, /Witnessed record \/ source provenance/);
  assert.match(html, /Provenance gaps/);
  assert.match(html, /missing-attestation/);
  assert.match(html, />Missing</);
});

test("loading, empty, unavailable, and error states are explicit", () => {
  assert.match(renderPanel({ status: "loading" }), /Loading decision chain\./);
  assert.match(renderPanel({ status: "ready", decisionChain: chain({ records: [] }) }), /No coordination judgment/);
  assert.match(renderPanel({ status: "unavailable" }), /Decision chain is unavailable for this inquiry\./);
  assert.match(renderPanel({ status: "error", errorMessage: "Private chain failed." }), /Private chain failed\./);
});

test("panel is placed in inquiry detail without replacing existing operator surfaces", () => {
  const permissionedIndex = inquiryWorkspaceSource.indexOf('data-testid="permissioned-next-step-card"');
  const panelIndex = inquiryWorkspaceSource.indexOf("<InquiryDecisionChainPanel");
  const availabilityIndex = inquiryWorkspaceSource.indexOf('data-testid="availability-readiness-card"');
  assert.ok(permissionedIndex !== -1 && panelIndex !== -1 && availabilityIndex !== -1);
  assert.ok(permissionedIndex < panelIndex && panelIndex < availabilityIndex);
  assert.match(inquiryWorkspaceSource, /data-testid="inquiry-decision-summary-card"/);
  assert.match(inquiryWorkspaceSource, /data-testid="inquiry-event-timeline-card"/);
  assert.match(inquiryWorkspaceSource, /data-testid="operator-review-checklist"/);
});

test("Decision Chain query and component use GET-only read behavior", () => {
  const querySource = sourceBetween(
    inquiryWorkspaceSource,
    "const decisionChainQuery = useQuery<InquiryDecisionChainResponse>",
    "const draftCandidatesQuery = useQuery<DraftRouteCandidatesResponse>",
  );
  assert.match(querySource, /fetch\(/);
  assert.doesNotMatch(querySource, /method:|useMutation|mutate\(|queryClient\.|invalidateQueries/);
  assert.doesNotMatch(panelSource, /<button|<form|<input|<textarea|onClick=|href=|<Link\b|useMutation|mutate\(/);
});

test("panel introduces no action, mutation, execution, or new authority surface", () => {
  assert.doesNotMatch(panelSource, /sendEmail|sendSMS|createInquiryRoute|createContract|createPayment|createSchedule/);
  assert.doesNotMatch(panelSource, /GoogleGenAI|\/assess|fetch\(|axios|res\.redirect|execute\w*\(/i);
  assert.doesNotMatch(panelSource, /Approved|Provider accepted|Route approved|Send now|Publish now|AI recommends/);
  assert.doesNotMatch(schemaSource, /inquiry_decision_chain|InquiryDecisionChain/);
  assert.doesNotMatch(storageSource, /createInquiryDecisionChain|updateInquiryDecisionChain|deleteInquiryDecisionChain/);
  assert.match(routesSource, /app\.get\("\/api\/inquiries\/:id\/decision-chain"/);
  assert.doesNotMatch(routesSource, /app\.(?:post|put|patch|delete)\("\/api\/inquiries\/:id\/decision-chain"/);
});
