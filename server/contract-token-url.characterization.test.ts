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

const BRIARWOOD_BASE_URL_FALLBACK =
  "const baseUrl = process.env.PUBLIC_BASE_URL || 'https://briarwood.ai';";
const DATEINQUIRY_BASE_URL_FALLBACK =
  "const baseUrl = process.env.PUBLIC_BASE_URL || 'https://dateinquiry.com';";
const SIGNING_URL_FROM_TOKEN = "const signingUrl = `${baseUrl}/sign/${signingToken}`;";

function contractSections(source: string): Record<string, string> {
  return {
    uploadContract: sectionBetween(
      source,
      'app.post("/api/bookings/:bookingId/upload-contract"',
      'app.get("/api/contracts/artist/:artistId"',
    ),
    bookingCreateContract: sectionBetween(
      source,
      'app.post("/api/bookings/:bookingId/create-contract"',
      'app.post("/api/bookings/:bookingId/send-for-signing"',
    ),
    bookingSendForSigning: sectionBetween(
      source,
      'app.post("/api/bookings/:bookingId/send-for-signing"',
      'app.get("/api/contracts/:id/signing-status"',
    ),
    publicSigningAndCountersign: sectionBetween(
      source,
      'app.get("/api/contracts/sign/:token"',
      'app.post("/api/contracts/:id/cancel"',
    ),
    authenticatedContractSend: sectionBetween(
      source,
      'app.post("/api/contracts/:id/send-for-signing"',
      '// ========== PAYMENTS ==========',
    ),
    publicInquiryContract: sectionBetween(
      source,
      'app.post("/api/public/inquiry/:threadToken/create-contract"',
      'app.post("/api/public/standalone-contract"',
    ),
  };
}

test("contract upload keeps the current relative signing URL response shape", () => {
  const source = readRepoFile("server/routes.ts");
  const section = contractSections(source).uploadContract;

  assert.ok(section.includes("const signingToken = randomUUID();"));
  assert.ok(section.includes("signingToken,"));
  assert.ok(section.includes("signingUrl: `/sign/${signingToken}`"));
  assert.doesNotMatch(section, /PUBLIC_BASE_URL|briarwood\.ai|dateinquiry\.com/);
});

test("authenticated booking contract send paths build Briarwood signing links from signingToken", () => {
  const source = readRepoFile("server/routes.ts");
  const { bookingCreateContract, bookingSendForSigning } = contractSections(source);

  for (const section of [bookingCreateContract, bookingSendForSigning]) {
    assert.ok(section.includes("const signingToken = randomUUID();"));
    assert.ok(section.includes(BRIARWOOD_BASE_URL_FALLBACK));
    assert.ok(section.includes(SIGNING_URL_FROM_TOKEN));
    assert.ok(section.includes("sendContractSigningEmail"));
    assert.ok(section.includes("signingUrl,"));
  }
});

test("public signing and countersign routes use the signing token as the public access contract", () => {
  const source = readRepoFile("server/routes.ts");
  const section = contractSections(source).publicSigningAndCountersign;

  assert.ok(section.includes('app.get("/api/contracts/sign/:token"'));
  assert.ok(section.includes('app.post("/api/contracts/sign/:token"'));
  assert.ok(section.includes('app.get("/api/contracts/countersign/:token"'));
  assert.ok(section.includes('app.post("/api/contracts/countersign/:token"'));
  assert.equal(
    (section.match(/const contract = await storage\.getContractBySigningToken\(token\);/g) ?? [])
      .length,
    4,
  );
  assert.ok(section.includes(BRIARWOOD_BASE_URL_FALLBACK));
  assert.ok(section.includes("const countersignUrl = `${baseUrl}/countersign/${token}`;"));
  assert.ok(section.includes("sendContractSignedNotification"));
  assert.ok(section.includes('status: "fully_executed"'));
});

test("authenticated contract send-for-signing preserves existing signing token and Briarwood fallback", () => {
  const source = readRepoFile("server/routes.ts");
  const section = contractSections(source).authenticatedContractSend;

  assert.ok(section.includes("const signingToken = contract.signingToken || randomUUID();"));
  assert.ok(section.includes("signingToken,"));
  assert.ok(section.includes(BRIARWOOD_BASE_URL_FALLBACK));
  assert.ok(section.includes(SIGNING_URL_FROM_TOKEN));
  assert.ok(section.includes("sendContractSigningEmail"));
  assert.ok(section.includes("signingUrl,"));
});

test("public inquiry contract creation keeps DateInquiry signing fallback and tokenized thread link behavior", () => {
  const source = readRepoFile("server/routes.ts");
  const section = contractSections(source).publicInquiryContract;

  assert.ok(section.includes("const signingToken = randomBytes(32).toString('hex');"));
  assert.ok(section.includes("signingToken: signingToken,"));
  assert.ok(section.includes(DATEINQUIRY_BASE_URL_FALLBACK));
  assert.ok(section.includes(SIGNING_URL_FROM_TOKEN));
  assert.ok(section.includes("sendContractAndPaymentEmail"));
  assert.ok(section.includes("redirectUrl: `${baseUrl}/payment-success?bookingId=${inquiry.bookingId || inquiry.id}`"));
  assert.ok(section.includes(BRIARWOOD_BASE_URL_FALLBACK));
  assert.ok(section.includes("const threadUrl = `${baseUrl}/inquiry/${inquiry.threadToken}`;"));
});

test("contract token URL construction remains excluded from public URL helper migration", () => {
  const [routesSource, publicUrlTestSource, domainInventorySource, architectureSource] = [
    readRepoFile("server/routes.ts"),
    readRepoFile("server/public-url.characterization.test.ts"),
    readRepoFile("server/domain-dependency-inventory.characterization.test.ts"),
    readRepoFile("docs/ARCHITECTURE.md"),
  ];
  const sections = Object.values(contractSections(routesSource)).join("\n");

  assert.doesNotMatch(
    sections,
    /getPublicBaseUrl|getBriarwoodPublicBaseUrl|getLegacyDateInquiryPublicBaseUrl/,
  );
  assert.ok(
    publicUrlTestSource.includes(
      "/process\\.env\\.PUBLIC_BASE_URL \\|\\| 'https:\\/\\/briarwood\\.ai'/",
    ),
  );
  assert.ok(
    domainInventorySource.includes('"contract/token-link sensitive"'),
  );
  assert.ok(
    architectureSource.includes(
      "Contract signing, countersign, vault, and tokenized contract links.",
    ),
  );
  assert.ok(
    architectureSource.includes(
      "Public-token links for inquiry threads, client threads, schedule shares, quotes, chat invites, and invitations.",
    ),
  );
});

test("contract token URL characterization stays source-only and behavior-preserving", () => {
  const testSource = readRepoFile("server/contract-token-url.characterization.test.ts");
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
  assert.doesNotMatch(importLines, /from\s+["']\.\/config\/publicUrl["']/);
  assert.doesNotMatch(importLines, /from\s+["']resend["']/);
  assert.doesNotMatch(executableLines, /process\.env\.[A-Z_]+\s*=(?!=)/);
});
