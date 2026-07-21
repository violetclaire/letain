import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CoordinationJudgmentEntryPanel,
  type HumanAttestationSummary,
} from "../client/src/components/CoordinationJudgmentEntryPanel";
import {
  InquiryDecisionChainPanel,
  type InquiryDecisionChain,
} from "../client/src/components/InquiryDecisionChainPanel";

const entryPanelSource = readFileSync("client/src/components/CoordinationJudgmentEntryPanel.tsx", "utf8");
const inquiryWorkspaceSource = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");
const decisionChainPanelSource = readFileSync("client/src/components/InquiryDecisionChainPanel.tsx", "utf8");
const routesSource = readFileSync("server/routes.ts", "utf8");
const storageSource = readFileSync("server/storage.ts", "utf8");
const schemaSource = readFileSync("shared/schema.ts", "utf8");

function sourceBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `${startMarker} should exist`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `${endMarker} should exist after ${startMarker}`);
  return source.slice(start, end);
}

function attestation(overrides: Partial<HumanAttestationSummary> = {}): HumanAttestationSummary {
  return {
    id: "attestation-a",
    operatorId: "artist-a",
    authorUserId: "artist-a",
    inquiryId: "inquiry-a",
    claimText: "I reviewed the provider message and it includes a condition.",
    authorCapacity: "Operator reviewing the inquiry record",
    knowledgeBasis: "evidence_review",
    lifecycleAction: "attestation",
    relatedAttestationId: null,
    createdAt: "2026-07-21T09:00:00.000Z",
    ...overrides,
  };
}

function renderEntry(overrides: Partial<Parameters<typeof CoordinationJudgmentEntryPanel>[0]> = {}): string {
  return renderToStaticMarkup(createElement(CoordinationJudgmentEntryPanel, {
    inquiryId: "inquiry-a",
    sourceStatus: "ready",
    attestations: [attestation()],
    isSubmitting: false,
    onSubmit: async () => undefined,
    ...overrides,
  }));
}

test("entry surface stays behind the existing authenticated operator boundary", () => {
  const querySource = sourceBetween(
    inquiryWorkspaceSource,
    "const humanAttestationsQuery = useQuery<SelectedInquiryAttestations>",
    "const decisionChainQuery = useQuery<InquiryDecisionChainResponse>",
  );
  assert.match(querySource, /enabled: isAuthenticated && isOperator/);
  assert.match(querySource, /credentials: "include"/);

  const authGuardIndex = inquiryWorkspaceSource.indexOf("if (!isAuthenticated)");
  const operatorGuardIndex = inquiryWorkspaceSource.indexOf("if (!isOperator)");
  const panelIndex = inquiryWorkspaceSource.indexOf("<CoordinationJudgmentEntryPanel");
  assert.ok(authGuardIndex !== -1 && operatorGuardIndex !== -1 && panelIndex !== -1);
  assert.ok(authGuardIndex < panelIndex && operatorGuardIndex < panelIndex);

  const routeSection = sourceBetween(
    routesSource,
    "// --- Inquiry Workspace: private append-only coordination judgments ---",
    "// --- Inquiry Workspace: private append-only scoped permission decisions ---",
  );
  assert.match(routeSection, /app\.post\("\/api\/inquiries\/:id\/coordination-judgments", isAuthenticated/);
  assert.match(routeSection, /loadPrivateInquiryContext\(req, res\)/);
});

test("selected inquiry and operator scope the witnessed records query", () => {
  const querySource = sourceBetween(
    inquiryWorkspaceSource,
    "const humanAttestationsQuery = useQuery<SelectedInquiryAttestations>",
    "const decisionChainQuery = useQuery<InquiryDecisionChainResponse>",
  );
  assert.match(querySource, /humanAttestationsQueryKey\(selectedInquiryId, user\?\.id\)/);
  assert.match(querySource, /\/api\/inquiries\/\$\{encodeURIComponent\(selectedInquiryId\)\}\/human-attestations/);
  assert.match(querySource, /attestation\.inquiryId !== selectedInquiryId \|\| attestation\.operatorId !== user\.id/);
  assert.match(querySource, /Witnessed records did not match the selected inquiry and operator/);
});

test("cross-owner and cross-inquiry evidence fail closed before selection and persistence", () => {
  const routeSection = sourceBetween(
    routesSource,
    "// --- Inquiry Workspace: private append-only coordination judgments ---",
    "// --- Inquiry Workspace: private append-only scoped permission decisions ---",
  );
  assert.match(routeSection, /storage\.getHumanAttestation\([\s\S]*?context\.userId,[\s\S]*?context\.inquiry\.id,[\s\S]*?attestationId/);
  assert.match(routeSection, /Supporting attestations must belong to this inquiry/);
  assert.match(inquiryWorkspaceSource, /availableAttestationIds\.has\(attestationId\)/);
  assert.match(inquiryWorkspaceSource, /A selected witnessed record is no longer available for this inquiry/);
});

test("server session supplies author and owner identity while client identity fields remain absent", () => {
  const routeSection = sourceBetween(
    routesSource,
    "// --- Inquiry Workspace: private append-only coordination judgments ---",
    "// --- Inquiry Workspace: private append-only scoped permission decisions ---",
  );
  assert.match(routeSection, /operatorId: context\.userId/);
  assert.match(routeSection, /authorUserId: context\.userId/);
  assert.match(routeSection, /inquiryId: context\.inquiry\.id/);

  const mutationSource = sourceBetween(
    inquiryWorkspaceSource,
    "const createCoordinationJudgment = useMutation",
    "const decisionChainQuery = useQuery<InquiryDecisionChainResponse>",
  );
  assert.match(mutationSource, /const \{ inquiryId, \.\.\.body \} = submission/);
  assert.match(mutationSource, /body: JSON\.stringify\(body\)/);
  const submissionContract = sourceBetween(
    entryPanelSource,
    "export interface CoordinationJudgmentSubmission",
    "type SourceStatus",
  );
  assert.doesNotMatch(submissionContract, /authorUserId|operatorId/);
});

test("form starts blank with no selected evidence, favorable default, or automatic submission", () => {
  assert.match(entryPanelSource, /subjectText: ""/);
  assert.match(entryPanelSource, /scopeText: ""/);
  assert.match(entryPanelSource, /judgmentText: ""/);
  assert.match(entryPanelSource, /rationaleText: ""/);
  assert.match(entryPanelSource, /evidenceBasis: ""/);
  assert.match(entryPanelSource, /selectedAttestationIds: \[\]/);
  assert.equal(entryPanelSource.match(/await onSubmit\(/g)?.length, 1);
  assert.match(entryPanelSource, /<form[\s\S]*?onSubmit=\{handleSubmit\}/);
  assert.doesNotMatch(entryPanelSource, /useEffect[\s\S]*?onSubmit|defaultChecked|autoSubmit|autoFocus/);

  const html = renderEntry();
  assert.doesNotMatch(html, /checked=""/);
  assert.match(html, /Nothing is selected or submitted automatically\./);
});

test("all witnessed lifecycle records remain visible and selectable without hidden filtering", () => {
  const html = renderEntry({
    attestations: [
      attestation({ id: "original", lifecycleAction: "attestation" }),
      attestation({ id: "correction", lifecycleAction: "correction", relatedAttestationId: "original" }),
      attestation({ id: "withdrawal", lifecycleAction: "withdrawal", relatedAttestationId: "correction" }),
      attestation({ id: "challenge", lifecycleAction: "challenge", relatedAttestationId: "original" }),
      attestation({ id: "supersession", lifecycleAction: "supersession", relatedAttestationId: "withdrawal" }),
    ],
  });
  for (const id of ["original", "correction", "withdrawal", "challenge", "supersession"]) {
    assert.match(html, new RegExp(`coordination-judgment-source-${id}`));
  }
  assert.match(html, /Related record: original/);
  assert.match(html, /Selected records are linked in the order shown\./);
});

test("validation fails before submission and creates no record", () => {
  const handler = sourceBetween(entryPanelSource, "const handleSubmit", "return (");
  assert.match(handler, /if \(!inquiryId \|\| sourceStatus !== "ready" \|\| !hasRequiredText\(form\) \|\| isSubmitting\) return/);
  assert.ok(handler.indexOf("if (!inquiryId") < handler.indexOf("await onSubmit"));
  assert.match(entryPanelSource, /Subject, scope, judgment, rationale, and evidence basis are required\./);
});

test("submission creates one original existing CoordinationJudgment and mutates no prior record", () => {
  const mutationSource = sourceBetween(
    inquiryWorkspaceSource,
    "const createCoordinationJudgment = useMutation",
    "const decisionChainQuery = useQuery<InquiryDecisionChainResponse>",
  );
  assert.equal(mutationSource.match(/fetch\(`/g)?.length, 1);
  assert.match(mutationSource, /\/coordination-judgments`/);
  assert.match(mutationSource, /method: "POST"/);
  assert.match(entryPanelSource, /lifecycleAction: "judgment"/);
  assert.match(entryPanelSource, /relatedJudgmentId: null/);
  const handler = sourceBetween(entryPanelSource, "const handleSubmit", "return (");
  assert.doesNotMatch(handler, /\b(?:correction|withdrawal|challenge|supersession)\b/);
  assert.doesNotMatch(entryPanelSource, /select[^\n]*lifecycle|lifecycle[^\n]*select/i);
  assert.doesNotMatch(mutationSource, /method: "(?:PUT|PATCH|DELETE)"/);
  assert.doesNotMatch(storageSource, /updateCoordinationJudgment|deleteCoordinationJudgment/);
});

test("switching inquiries clears form state and rejects stale source state", () => {
  assert.match(inquiryWorkspaceSource, /key=\{`coordination-judgment-entry-\$\{selectedInquiryId \?\? "none"\}`\}/);
  assert.match(inquiryWorkspaceSource, /submission\.inquiryId !== selectedInquiryId/);
  assert.match(inquiryWorkspaceSource, /sourceSet\.inquiryId !== submission\.inquiryId \|\| sourceSet\.operatorId !== user\.id/);
  assert.match(inquiryWorkspaceSource, /The selected inquiry changed\. Review its witnessed records before submitting\./);
});

test("successful creation refreshes and visibly renders the persisted Decision Chain judgment", () => {
  const mutationSource = sourceBetween(
    inquiryWorkspaceSource,
    "const createCoordinationJudgment = useMutation",
    "const decisionChainQuery = useQuery<InquiryDecisionChainResponse>",
  );
  assert.match(mutationSource, /invalidateQueries\(\{ queryKey: inquiryDecisionChainQueryKey\(submission\.inquiryId\) \}\)/);
  assert.match(entryPanelSource, /Judgment recorded\. The private Decision Chain now includes this record\./);

  const chain: InquiryDecisionChain = {
    operatorId: "artist-a",
    inquiryId: "inquiry-a",
    provenanceGaps: [],
    records: [{
      recordType: "coordination_judgment",
      id: "judgment-a",
      createdAt: "2026-07-21T10:00:00.000Z",
      lifecycleAction: "judgment",
      relatedRecordId: null,
      references: [],
      record: {
        subjectText: "Provider response state",
        scopeText: "This inquiry and current terms",
        judgmentText: "Acceptance appears conditional and requires review.",
        rationaleText: "A later message adds a condition.",
        evidenceBasis: "Attestation A and message B.",
      },
    }],
  };
  const html = renderToStaticMarkup(createElement(InquiryDecisionChainPanel, {
    status: "ready",
    decisionChain: chain,
  }));
  assert.match(html, /Provider response state/);
  assert.match(html, /Acceptance appears conditional and requires review\./);
  assert.match(html, /A later message adds a condition\./);
  assert.match(html, /Attestation A and message B\./);
});

test("loading, empty, unavailable, error, success, and failure language is explicit", () => {
  assert.match(renderEntry({ sourceStatus: "loading", attestations: [] }), /Loading witnessed records\./);
  assert.match(renderEntry({ sourceStatus: "ready", attestations: [] }), /No witnessed attestation records/);
  assert.match(renderEntry({ sourceStatus: "unavailable", inquiryId: null, attestations: [] }), /Select an inquiry/);
  assert.match(renderEntry({ sourceStatus: "error", attestations: [] }), /No judgment can be submitted\./);
  assert.match(entryPanelSource, /data-testid=\{`coordination-judgment-\$\{feedback\.kind\}`\}/);
  assert.match(entryPanelSource, /kind: "success"/);
  assert.match(entryPanelSource, /kind: "error"/);
});

test("entry surface adds no permission, human-choice, AI, or execution behavior", () => {
  assert.match(entryPanelSource, /AI does not originate or sign this record\./);
  assert.match(entryPanelSource, /It grants no permission and performs no action\./);
  assert.doesNotMatch(entryPanelSource, /\b(?:proceed|wait|clarify|escalate|stop)\b/);
  assert.doesNotMatch(entryPanelSource, /sendEmail|sendSMS|createInquiryRoute|createSchedule|createContract|createPayment|provider accepted/i);
  assert.doesNotMatch(entryPanelSource, /GoogleGenAI|\/assess|OpenAI|generateContent|public link/i);
  assert.doesNotMatch(inquiryWorkspaceSource, /CoordinationJudgmentEntryPanel[\s\S]*?ScopedPermissionDecisionEntry|CoordinationJudgmentEntryPanel[\s\S]*?HumanActionDecisionEntry/);
  assert.doesNotMatch(schemaSource, /coordination_judgment_operator_entry/);
  assert.doesNotMatch(decisionChainPanelSource, /onClick=|useMutation|method: "POST"/);
});
