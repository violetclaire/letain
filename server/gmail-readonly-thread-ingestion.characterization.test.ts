import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  fetchGmailThreadEvidence,
  gmailThreadIdFromReference,
  gmailThreadToEvidence,
  GMAIL_READONLY_SCOPE,
  type GmailThreadResource,
} from "../client/src/lib/gmailReadonlyThreadEvidence";
import { reduceScheduleEvidence, scheduleEvidenceInputFromText } from "../shared/schedulingEvidence";

const adapterSource = readFileSync("client/src/lib/gmailReadonlyThreadEvidence.ts", "utf8");
const flagsSource = readFileSync("client/src/lib/demoFeatureFlags.ts", "utf8");
const builderSource = readFileSync("client/src/pages/ScheduleDraftBuilder.tsx", "utf8");
const serverSource = readFileSync("server/index.ts", "utf8");
const routesSource = readFileSync("server/routes.ts", "utf8");
const envExampleSource = readFileSync(".env.example", "utf8");
const localDocsSource = readFileSync("docs/LOCAL_DEVELOPMENT.md", "utf8");

function base64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sourceBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `${startMarker} should exist`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `${endMarker} should exist after ${startMarker}`);
  return source.slice(start, end);
}

function header(name: string, value: string): { name: string; value: string } {
  return { name, value };
}

const gmailThreadFixture: GmailThreadResource = {
  id: "18f0abc123def456",
  messages: [
    {
      id: "later-correction",
      internalDate: "2000",
      snippet: "Remove Ellen and restore Phoebe.",
      payload: {
        mimeType: "multipart/alternative",
        headers: [
          header("Subject", "Kelly + Mateo wedding schedule"),
          header("From", "Planner <planner@example.test>"),
          header("To", "Briarwood <operator@example.test>"),
          header("Date", "Tue, 2 Jun 2026 10:00:00 -0700"),
        ],
        parts: [
          {
            mimeType: "text/plain",
            body: {
              data: base64Url(`Correction
Actually just Lisa. Remove Ellen.
Restore Phoebe for hair only. Phoebe is missing from the hair schedule and should go early.
No schedule should be sent.

On Mon, 1 Jun 2026, Planner wrote:
> - Ellen (Mom's friend) Hair only
> Earlier quoted roster`),
            },
          },
        ],
      },
    },
    {
      id: "initial-roster",
      internalDate: "1000",
      snippet: "Initial wedding roster.",
      payload: {
        mimeType: "text/plain",
        headers: [
          header("Subject", "Kelly + Mateo wedding schedule"),
          header("From", "Planner <planner@example.test>"),
          header("To", "Briarwood <operator@example.test>"),
          header("Date", "Mon, 1 Jun 2026 09:00:00 -0700"),
        ],
        body: {
          data: base64Url(`Saturday / Wedding Day
- Kelly (Bride) Hair + Makeup
- Phoebe Hair only
- Lisa (Mom's friend) Hair only
- Ellen (Mom's friend) Hair only
Kelly needs to be ready by 12:30 PM.`),
        },
      },
    },
  ],
};

test("Gmail thread references accept a raw ID or mail.google.com URL only", () => {
  assert.equal(gmailThreadIdFromReference("18f0abc123def456"), "18f0abc123def456");
  assert.equal(
    gmailThreadIdFromReference("https://mail.google.com/mail/u/0/#inbox/18f0abc123def456"),
    "18f0abc123def456",
  );
  assert.equal(gmailThreadIdFromReference("https://example.com/#inbox/18f0abc123def456"), null);
  assert.equal(gmailThreadIdFromReference("not a thread"), null);
});

test("Gmail MIME text becomes chronological private evidence without repeated quoted history", () => {
  const evidence = gmailThreadToEvidence(gmailThreadFixture);

  assert.equal(evidence.threadId, "18f0abc123def456");
  assert.equal(evidence.subject, "Kelly + Mateo wedding schedule");
  assert.equal(evidence.messageCount, 2);
  assert.ok(evidence.evidenceText.indexOf("Saturday / Wedding Day") < evidence.evidenceText.indexOf("Remove Ellen"));
  assert.match(evidence.evidenceText, /Source: Gmail thread \(private read-only\)/);
  assert.match(evidence.evidenceText, /Remove Ellen/);
  assert.match(evidence.evidenceText, /Restore Phoebe/);
  assert.doesNotMatch(evidence.evidenceText, /Earlier quoted roster/);
  assert.doesNotMatch(evidence.evidenceText, /^\s*>/m);
});

test("copied Gmail text enters the existing evidence reducer without creating a schedule", () => {
  const imported = gmailThreadToEvidence(gmailThreadFixture);
  const input = scheduleEvidenceInputFromText(imported.evidenceText);
  assert.ok(input);

  const state = reduceScheduleEvidence(input);
  assert.ok(state.removedPeople.some((person) => person.name === "Ellen"));
  assert.ok(state.confirmedPeople.some((person) => person.name === "Phoebe"));
  assert.ok(state.questions.length > 0 || state.warnings.length > 0);
  assert.equal(state.sourceKind, "thread");
});

test("thread retrieval is one no-cache GET with a short-lived bearer token", async () => {
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ input: String(input), init });
    return new Response(JSON.stringify(gmailThreadFixture), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  const result = await fetchGmailThreadEvidence(
    "https://mail.google.com/mail/u/0/#inbox/18f0abc123def456",
    "short-lived-test-token",
    fetcher,
  );

  assert.equal(result.messageCount, 2);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.input, "https://gmail.googleapis.com/gmail/v1/users/me/threads/18f0abc123def456?format=full");
  assert.equal(calls[0]?.init?.method, "GET");
  assert.equal(calls[0]?.init?.cache, "no-store");
  assert.equal((calls[0]?.init?.headers as Record<string, string>).Authorization, "Bearer short-lived-test-token");
});

test("Gmail ingestion is default-off and copies into the existing private source adapter only", () => {
  assert.match(
    flagsSource,
    /export const enableGmailReadonlyIngestion = envFlag\(\s*import\.meta\.env\.VITE_ENABLE_GMAIL_READONLY_INGESTION,\s*\);/,
  );
  const gatedUi = sourceBetween(
    builderSource,
    "{enableGmailReadonlyIngestion && (",
    "<textarea\n                value={requestText}",
  );
  assert.match(gatedUi, /Gmail thread evidence/);
  assert.match(gatedUi, /Private read-only/);
  assert.match(gatedUi, /Copy thread evidence/);
  assert.match(gatedUi, /does not send or modify email, contact anyone, save the draft, generate or apply a schedule/);

  const importHandler = sourceBetween(
    builderSource,
    "const copyGmailThreadIntoEvidenceReview = async () => {",
    "const applyPaste = () => {",
  );
  assert.match(importHandler, /importGmailThreadEvidence\(gmailThreadReference, clientId\)/);
  assert.match(importHandler, /updateRequestText\(imported\.evidenceText\)/);
  assert.doesNotMatch(importHandler, /setRows|setShowFirstDraftPreview|applyFirstDraftPreviewToRows|saveMutation|apiRequest|fetch\(/);
});

test("OAuth and API source request Gmail read-only authority and no broader mailbox action", () => {
  assert.equal(GMAIL_READONLY_SCOPE, "https://www.googleapis.com/auth/gmail.readonly");
  assert.match(adapterSource, /scope: GMAIL_READONLY_SCOPE/);
  assert.match(adapterSource, /include_granted_scopes: false/);
  assert.match(adapterSource, /hasGrantedAllScopes\(response, GMAIL_READONLY_SCOPE\)/);
  assert.match(adapterSource, /method: "GET"/);
  assert.doesNotMatch(adapterSource, /gmail\.(?:send|compose|modify|insert)|https:\/\/mail\.google\.com\//);
  assert.doesNotMatch(adapterSource, /method:\s*"(?:POST|PUT|PATCH|DELETE)"/);
  assert.doesNotMatch(adapterSource, /localStorage|sessionStorage|document\.cookie|indexedDB/);
  assert.doesNotMatch(adapterSource, /\/api\//);
  assert.doesNotMatch(adapterSource, /generateProductionSchedule|applyFirstDraftPreview|saveMutation|OpenAI|scheduleAI|\/assess/);
});

test("the browser-only reader adds no backend route and documents its private boundary", () => {
  assert.doesNotMatch(routesSource, /\/api\/(?:private\/)?gmail/i);
  assert.match(serverSource, /scriptSrc: \[[^\]]+"https:\/\/accounts\.google\.com"/);
  assert.match(serverSource, /frameSrc: \[[^\]]+"https:\/\/accounts\.google\.com"/);
  assert.match(envExampleSource, /VITE_ENABLE_GMAIL_READONLY_INGESTION=true/);
  assert.match(envExampleSource, /VITE_GOOGLE_GMAIL_CLIENT_ID=/);
  assert.match(localDocsSource, /short-lived access token stays in browser memory/);
  assert.match(localDocsSource, /does not save a draft, generate or apply a schedule preview, send or modify email, contact anyone/);
});
