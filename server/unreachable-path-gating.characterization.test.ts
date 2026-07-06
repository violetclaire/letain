import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const flagsSource = readFileSync("client/src/lib/demoFeatureFlags.ts", "utf8");
const assistantControlSource = readFileSync("client/src/pages/AssistantControl.tsx", "utf8");
const artistSettingsSource = readFileSync("client/src/pages/ArtistSettings.tsx", "utf8");
const artistDashboardSource = readFileSync("client/src/pages/ArtistDashboard.tsx", "utf8");
const artistDashboardRenderSource = artistDashboardSource.slice(artistDashboardSource.indexOf("return ("));
const inquiryThreadSource = readFileSync("client/src/pages/InquiryThread.tsx", "utf8");
const composeEmailModalSource = readFileSync("client/src/components/ComposeEmailModal.tsx", "utf8");
const artistAdminSource = readFileSync("client/src/pages/ArtistAdmin.tsx", "utf8");
const inquiryWorkspaceSource = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sourceBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `${startMarker} should exist`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `${endMarker} should exist after ${startMarker}`);
  return source.slice(start, end);
}

function assertPrecededByFlag(source: string, label: string, flag: string, windowSize = 9000): void {
  let searchFrom = 0;
  let seen = 0;

  while (true) {
    const index = source.indexOf(label, searchFrom);
    if (index === -1) break;

    seen += 1;
    const context = source.slice(Math.max(0, index - windowSize), index);
    assert.match(
      context,
      new RegExp(`${escapeRegExp(flag)}\\s*&&\\s*\\(`),
      `${label} should be inside a ${flag} default-off gate`,
    );
    searchFrom = index + label.length;
  }

  assert.ok(seen > 0, `${label} should exist so the gate is characterized`);
}

function assertContainsAll(source: string, labels: string[], context: string): void {
  for (const label of labels) {
    assert.match(source, new RegExp(escapeRegExp(label)), `${context} should include ${label}`);
  }
}

test("demo feature flags exist and default off unless explicitly enabled", () => {
  assert.match(flagsSource, /const envFlag = \(value: unknown\): boolean => value === "true";/);

  for (const [exportName, envName] of [
    ["enableAssistantDelayedPromptControls", "VITE_ENABLE_ASSISTANT_DELAYED_PROMPT_CONTROLS"],
    ["enablePaymentsUi", "VITE_ENABLE_PAYMENTS_UI"],
    ["enableInvoicesUi", "VITE_ENABLE_INVOICES_UI"],
    ["enableContractsUi", "VITE_ENABLE_CONTRACTS_UI"],
    ["enableLegacyClientCreationUi", "VITE_ENABLE_LEGACY_CLIENT_CREATION_UI"],
  ]) {
    assert.match(
      flagsSource,
      new RegExp(`export const ${exportName} = envFlag\\([\\s\\S]*import\\.meta\\.env\\.${envName}`),
      `${exportName} should read only ${envName}`,
    );
  }

  assert.doesNotMatch(flagsSource, /true\s*\?\?|default.*true|VITE_ENABLE_[A-Z_]+[^;]+===\s*["']false["']/i);
});

test("quiet-hours and digest controls are hidden behind the delayed prompt feature flag", () => {
  const delayedPromptControls = sourceBetween(
    assistantControlSource,
    "{enableAssistantDelayedPromptControls && (",
    '<div className="pt-2">',
  );

  assertContainsAll(
    delayedPromptControls,
    ["Prompt timing", "Digest", "Quiet hours", "Timezone"],
    "delayed prompt controls gate",
  );
});

test("settings hides payment processing and legacy client creation behind default-off flags", () => {
  const paymentProcessingSection = sourceBetween(
    artistSettingsSource,
    "{enablePaymentsUi && (",
    "{enableLegacyClientCreationUi && (",
  );
  assertContainsAll(paymentProcessingSection, ["Payment Processing", "Connect Square"], "payment settings gate");

  const addClientSection = sourceBetween(
    artistSettingsSource,
    "{enableLegacyClientCreationUi && (",
    "Upload Your Info Sheet",
  );
  assertContainsAll(addClientSection, ["Add New Client", "Add Client"], "legacy client creation gate");

  assert.match(
    artistSettingsSource,
    /enableLegacyClientCreationUi && showAddClient && \([\s\S]{0,800}Add New Client/,
  );
});

test("artist dashboard hides contract, invoice, and payment entry points behind default-off flags", () => {
  assert.match(artistDashboardRenderSource, /enableContractsUi && \([\s\S]{0,450}href="\/artist\/contracts"[\s\S]{0,200}Contracts/);
  assert.match(artistDashboardRenderSource, /enableContractsUi && showContractCreationModal && selectedBooking && \(/);
  assert.match(artistDashboardRenderSource, /enableContractsUi && viewingContract && \(/);
  assert.match(artistDashboardRenderSource, /enableContractsUi && showDocusignModal && \(/);
  assert.match(artistDashboardRenderSource, /enableContractsUi && \([\s\S]{0,5000}Create Contract[\s\S]{0,5000}Send for E-Signature/);
  assert.match(artistDashboardRenderSource, /enableContractsUi && \([\s\S]{0,5000}Upload Contract/);
  const viewContractModal = sourceBetween(
    artistDashboardSource,
    "{enableContractsUi && viewingContract && (",
    "{/* DocuSign Contract Modal */}",
  );
  assertContainsAll(viewContractModal, ["Open Contract File"], "view contract modal gate");

  assert.match(artistDashboardRenderSource, /enableInvoicesUi && \([\s\S]{0,600}data-testid="button-send-invoice"/);
  assert.match(artistDashboardRenderSource, /enableInvoicesUi && showInvoiceModal && \(/);
  const invoiceModal = sourceBetween(
    artistDashboardSource,
    "{enableInvoicesUi && showInvoiceModal && (",
    "{/* Compose Email Modal */}",
  );
  assertContainsAll(
    invoiceModal,
    ["Payment Link Ready!", "Create Invoice", "Generate Link", "Send via Email", "Send via Text"],
    "invoice modal gate",
  );
  assert.match(artistDashboardRenderSource, /enablePaymentsUi && \([\s\S]{0,650}data-testid="button-square-connect"/);
  assert.match(artistDashboardRenderSource, /enablePaymentsUi && squareStatus\?\.connected && squareStatus\.paymentsEnabled && \(/);
});

test("inquiry thread hides invoice, payment, and contract next steps behind default-off flags", () => {
  assert.match(inquiryThreadSource, /enableInvoicesUi && \([\s\S]{0,500}Create Invoice/);
  assert.match(inquiryThreadSource, /enableInvoicesUi && showInvoiceForm && \([\s\S]*Create & Send Invoice/);
  assert.match(inquiryThreadSource, /enablePaymentsUi \? \([\s\S]{0,900}Connect Square/);
  assert.match(inquiryThreadSource, /enableContractsUi && \([\s\S]{0,900}Prepare Contract/);
  assert.match(inquiryThreadSource, /enableContractsUi && showContractForm && !showContractReview && \([\s\S]{0,9000}Review Contract/);
  assert.match(inquiryThreadSource, /enableContractsUi && showContractReview && \(/);
});

test("compose email keeps generic email reachable while gating the invoice template", () => {
  assert.match(composeEmailModalSource, /import \{ enableInvoicesUi \} from "@\/lib\/demoFeatureFlags";/);
  assert.match(composeEmailModalSource, /label: "Send Invoice"/);
  assert.match(composeEmailModalSource, /preSelectedTemplate === "invoice" \? "general" : preSelectedTemplate/);
  assert.match(
    composeEmailModalSource,
    /visibleTemplateKeys = \(Object\.keys\(EMAIL_TEMPLATES\) as Array<keyof typeof EMAIL_TEMPLATES>\)\.filter\(\s*\(key\) => enableInvoicesUi \|\| key !== "invoice",\s*\);/,
  );
  assert.match(composeEmailModalSource, /\{visibleTemplateKeys\.map\(\(key\) => \{/);
  assert.match(artistDashboardSource, /data-testid="button-compose-email"/);
  assert.match(artistDashboardSource, /data-testid="button-compose-email-mobile"/);
});

test("core demo-ready operator paths remain visible", () => {
  for (const label of [
    "Inquiry Workspace",
    "Needs attention",
    "Inquiries",
    "Schedule drafts",
    "Private network",
    "People / records",
    "Settings / Pricing Info",
    "Availability",
  ]) {
    assert.match(artistAdminSource, new RegExp(escapeRegExp(label)));
  }

  for (const label of [
    "Can I respond yet?",
    "Permissioned next step",
    "Availability readiness",
    "Operator review checklist",
    "Private review log",
    "Inquiry Event Timeline",
    "Private route/recovery evidence log",
    "Schedule draft",
  ]) {
    assert.match(inquiryWorkspaceSource, new RegExp(escapeRegExp(label)));
  }
});

test("primary command center and inquiry workspace remain free of gated legacy action labels", () => {
  const commandCenterSource = sourceBetween(
    artistAdminSource,
    'data-testid="operator-command-center"',
    "</section>",
  );

  assert.doesNotMatch(commandCenterSource, /Create Invoice|Create Contract|Payment Processing|Connect Square|Payments|Contracts|Square/);
  assert.doesNotMatch(inquiryWorkspaceSource, /Create Invoice|Create Contract|Payment summary|Contract summary|Connect Square/);
});

test("gating slice does not introduce backend, schema, auth, send, upload, AI, or public-link behavior", () => {
  assert.doesNotMatch(flagsSource, /fetch\(|apiRequest|useMutation|method:\s*["']POST["']/);
  assert.doesNotMatch(flagsSource, /pgTable|drizzle|migration|migrations|ALTER TABLE|CREATE TABLE/i);
  assert.doesNotMatch(flagsSource, /isAuthenticated|getAuthUserId|session|OIDC|openid|REPL_ID|ISSUER_URL/);
  assert.doesNotMatch(flagsSource, /ObjectUploader|\/api\/objects|uploadURL|getUploadParameters/);
  assert.doesNotMatch(flagsSource, /OpenAI|Anthropic|scheduleAI|processScheduleChat|\/api\/schedule-ai/);
  assert.doesNotMatch(flagsSource, /createClientLink|client link created|public\/client/i);
});
