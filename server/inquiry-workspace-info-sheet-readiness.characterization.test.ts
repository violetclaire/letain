import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const inquiryWorkspaceSource = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");

function infoSheetReadinessCardSource(): string {
  const startMarker = 'data-testid="info-sheet-readiness-card"';
  const start = inquiryWorkspaceSource.indexOf(startMarker);
  assert.notEqual(start, -1, "expected Inquiry Workspace to render an info sheet readiness card");

  const nextCard = inquiryWorkspaceSource.indexOf('data-testid="contact-card"', start);
  assert.notEqual(nextCard, -1, "expected info sheet readiness card to render before the detail card grid");

  return inquiryWorkspaceSource.slice(start, nextCard);
}

test("Inquiry Workspace reads Pricing / Info Sheet readiness from existing settings endpoints", () => {
  assert.match(
    inquiryWorkspaceSource,
    /fetch\(`\/api\/artist-profiles\/\$\{encodeURIComponent\(user\.id\)\}`, \{ credentials: "include" \}\)/,
  );
  assert.match(
    inquiryWorkspaceSource,
    /fetch\(`\/api\/artist-services\/\$\{encodeURIComponent\(user\.id\)\}`, \{ credentials: "include" \}\)/,
  );
  assert.match(inquiryWorkspaceSource, /queryKey: \["artistProfile", user\?\.id\]/);
  assert.match(inquiryWorkspaceSource, /queryKey: \["artistServices", user\?\.id\]/);
});

test("Inquiry Workspace uses conservative existing-field readiness logic", () => {
  assert.match(inquiryWorkspaceSource, /infoSheetEnabled !== false/);
  assert.match(inquiryWorkspaceSource, /hasText\(artistProfile\.infoSheetContent\)/);
  assert.match(inquiryWorkspaceSource, /hasText\(artistProfile\.infoSheetPdfUrl\)/);
  assert.match(inquiryWorkspaceSource, /hasText\(artistProfile\.pricingInfo\)/);
  assert.match(inquiryWorkspaceSource, /hasText\(artistProfile\.plannerInfoSheet\)/);
  assert.match(inquiryWorkspaceSource, /hasText\(artistProfile\.plannerPricing\)/);
  assert.match(inquiryWorkspaceSource, /artistServices\.length > 0/);
});

test("Inquiry Workspace renders compact Pricing / Info Sheet readiness copy", () => {
  const cardSource = infoSheetReadinessCardSource();

  assert.match(inquiryWorkspaceSource, /Pricing \/ Info Sheet ready/);
  assert.match(inquiryWorkspaceSource, /Pricing \/ Info Sheet not configured yet/);
  assert.match(inquiryWorkspaceSource, /Pricing \/ Info Sheet readiness unavailable/);
  assert.match(cardSource, /Pricing \/ Info Sheet/);
  assert.match(
    cardSource,
    /Set this up in Settings so Briarwood can help draft inquiry responses later\. Nothing sends from this workspace card\./,
  );
  assert.match(cardSource, /Reusable response material/);
  assert.match(inquiryWorkspaceSource, /Ready from:/);
  assert.match(
    inquiryWorkspaceSource,
    /Add reusable services, pricing\/details text, policies, or an existing PDF in Settings\. Nothing sends from this card\./,
  );
  assert.match(cardSource, /infoSheetReadinessDetail/);
  assert.match(cardSource, /Open Pricing \/ Info Sheet setup/);
  assert.match(cardSource, /href="\/settings"/);
  assert.match(cardSource, /data-testid="link-open-info-sheet-settings"/);
});

test("Inquiry Workspace shows a read-only Pricing / Info Sheet readiness checklist", () => {
  const cardSource = infoSheetReadinessCardSource();

  assert.match(inquiryWorkspaceSource, /Services added/);
  assert.match(inquiryWorkspaceSource, /Pricing\/details text added/);
  assert.match(inquiryWorkspaceSource, /PDF reference added/);
  assert.match(inquiryWorkspaceSource, /Reusable info enabled/);
  assert.match(cardSource, /Checking/);
  assert.match(cardSource, /Unable to verify/);
  assert.match(cardSource, /Ready/);
  assert.match(cardSource, /Missing/);
  assert.match(cardSource, /infoSheetReadinessChecklist\.map/);
  assert.match(inquiryWorkspaceSource, /hasServiceRows/);
  assert.match(inquiryWorkspaceSource, /hasInfoSheetText/);
  assert.match(inquiryWorkspaceSource, /hasInfoSheetPdf/);
  assert.match(inquiryWorkspaceSource, /hasReusableInfoEnabled/);
});

test("Missing Pricing / Info Sheet still blocks response readiness", () => {
  assert.match(inquiryWorkspaceSource, /if \(!infoSheetReady\) \{/);
  assert.match(inquiryWorkspaceSource, /Pricing \/ Info Sheet not configured yet\./);
  assert.match(
    inquiryWorkspaceSource,
    /Open Settings and add pricing, services, policies, or an existing PDF before drafting\./,
  );
});

test("Pricing / Info Sheet readiness card is read-only and does not send, upload, or compose", () => {
  const cardSource = infoSheetReadinessCardSource();

  assert.doesNotMatch(cardSource, /fetch\(/);
  assert.doesNotMatch(cardSource, /apiRequest/);
  assert.doesNotMatch(cardSource, /method:\s*"(POST|PUT|PATCH|DELETE)"/);
  assert.doesNotMatch(cardSource, /\/api\/objects|ObjectUploader|uploadURL|getUploadParameters/);
  assert.doesNotMatch(cardSource, /\/api\/inquiries\/[^"`']+\/respond/);
  assert.doesNotMatch(cardSource, /\/api\/inquiry-responses\/[^"`']+\/send/);
  assert.doesNotMatch(cardSource, /\/composer/);
});

test("Pricing / Info Sheet readiness does not introduce score, ranking, schema, or product-flow language", () => {
  const cardSource = infoSheetReadinessCardSource();

  assert.doesNotMatch(inquiryWorkspaceSource, /trust_score|provider_score|trustScore|providerScore/);
  assert.doesNotMatch(
    inquiryWorkspaceSource,
    /person score|provider score|trust score|reputation|ranking|paid placement/i,
  );
  assert.doesNotMatch(cardSource, /drizzle|pgTable|createTable|migration/i);
  assert.doesNotMatch(cardSource, /createContract|createPayment|Square|sendInfoSheetEmail|sendProposalEmail/);
});
