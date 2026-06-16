import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readRepoFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function sectionBetween(source: string, startMarker: string, endMarker: string): string {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `Missing start marker: ${startMarker}`);

  const end = source.indexOf(endMarker, start);
  assert.ok(end > start, `Missing end marker after ${startMarker}: ${endMarker}`);

  return source.slice(start, end);
}

test("routes.ts keeps exactly two direct contract-related Resend construction paths", () => {
  const source = readRepoFile("server/routes.ts");

  assert.deepEqual(source.match(/await import\("resend"\)/g) ?? [], [
    'await import("resend")',
    'await import("resend")',
  ]);
  assert.deepEqual(source.match(/new Resend\(process\.env\.RESEND_API_KEY\)/g) ?? [], [
    "new Resend(process.env.RESEND_API_KEY)",
    "new Resend(process.env.RESEND_API_KEY)",
  ]);
  assert.deepEqual(source.match(/await resend\.emails\.send\(\{/g) ?? [], [
    "await resend.emails.send({",
    "await resend.emails.send({",
  ]);

  assert.ok(source.includes('const result = await resendClient.emails.send({'));
  assert.ok(source.includes('const { client: resendClient } = await emailService.getResendClient();'));
});

test("artist countersign route sends the fully executed contract copy through direct Resend", () => {
  const source = readRepoFile("server/routes.ts");
  const section = sectionBetween(
    source,
    'app.post("/api/contracts/countersign/:token"',
    'app.post("/api/contracts/:id/cancel"',
  );

  assert.ok(section.includes('const { Resend } = await import("resend");'));
  assert.ok(section.includes("const resend = new Resend(process.env.RESEND_API_KEY);"));
  assert.ok(section.includes("await resend.emails.send({"));
  assert.ok(section.includes("from: `${artistName} <notifications@dateinquiry.com>`"));
  assert.ok(section.includes("to: artist.email"));
  assert.ok(section.includes("subject: `Fully Executed Contract - ${contract.clientName || 'Client'} - ${contract.eventDates || ''}`"));
  assert.ok(section.includes("html: signedBanner + (contract.contractHtml || '')"));
  assert.ok(section.includes('console.log("[Countersign] Sent fully executed contract to artist:", artist.email);'));
  assert.doesNotMatch(section, /createResolvedResendClient|resolveEmailCredentials|getResendClient|sendGeneralEmail/);
});

test("public inquiry contract creation route sends the artist copy through direct Resend", () => {
  const source = readRepoFile("server/routes.ts");
  const section = sectionBetween(
    source,
    'app.post("/api/public/inquiry/:threadToken/create-contract"',
    'app.post("/api/public/standalone-contract"',
  );

  assert.ok(section.includes("sendContractAndPaymentEmail"));
  assert.ok(section.includes('const { Resend } = await import("resend");'));
  assert.ok(section.includes("const resend = new Resend(process.env.RESEND_API_KEY);"));
  assert.ok(section.includes("await resend.emails.send({"));
  assert.ok(section.includes("from: `Your Secretary <notifications@dateinquiry.com>`"));
  assert.ok(section.includes("to: artistUser.email"));
  assert.ok(section.includes("subject: `Contract Sent to ${inquiry.clientName}`"));
  assert.ok(section.includes("const threadUrl = `${baseUrl}/inquiry/${inquiry.threadToken}`;"));
  assert.ok(section.includes("console.log(`[Contract] Artist copy sent to ${artistUser.email}`);"));
  assert.doesNotMatch(section, /createResolvedResendClient|resolveEmailCredentials|getResendClient|sendGeneralEmail/);
});

test("contract direct Resend paths are intentionally separate from the shared email factory for now", () => {
  const [routesSource, credentialsSource, emailCredentialTestSource, architectureSource] = [
    readRepoFile("server/routes.ts"),
    readRepoFile("server/email/credentials.ts"),
    readRepoFile("server/email-credentials.characterization.test.ts"),
    readRepoFile("docs/ARCHITECTURE.md"),
  ];

  assert.ok(credentialsSource.includes("export async function createResolvedResendClient"));
  assert.ok(emailCredentialTestSource.includes("assert.doesNotMatch(emailText, /new Resend\\(/);"));
  assert.ok(emailCredentialTestSource.includes("assert.doesNotMatch(aiChatText, /new Resend\\(/);"));
  assert.doesNotMatch(routesSource, /createResolvedResendClient|resolveEmailCredentials/);
  assert.ok(architectureSource.includes("Contract notification direct Resend paths in `server/routes.ts` are intentionally untouched"));
  assert.ok(architectureSource.includes("Existing direct Resend construction in `server/routes.ts` remains"));
});

test("contract Resend characterization stays source-only and behavior-preserving", () => {
  const testSource = readRepoFile("server/contract-resend.characterization.test.ts");
  const importLines = testSource
    .split(/\r?\n/)
    .filter((line) => line.startsWith("import "))
    .join("\n");
  const executableLines = testSource
    .split(/\r?\n/)
    .filter((line) => !line.includes("doesNotMatch"))
    .join("\n");

  assert.ok(testSource.includes("readFileSync"));
  assert.doesNotMatch(importLines, /from\s+["']\.\/routes["']/);
  assert.doesNotMatch(importLines, /from\s+["']\.\/email\/credentials["']/);
  assert.doesNotMatch(importLines, /from\s+["']resend["']/);
  assert.doesNotMatch(executableLines, /process\.env\.[A-Z_]+\s*=(?!=)/);
});
