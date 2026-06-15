import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("Square OAuth source keeps the current DateInquiry callback and redirect domains", async () => {
  const squareRoutesText = await readFile(new URL("./squareRoutes.ts", import.meta.url), "utf8");

  assert.match(squareRoutesText, /const SQUARE_OAUTH_BASE = 'https:\/\/connect\.squareup\.com';/);
  assert.match(squareRoutesText, /const callbackBaseUrl = 'https:\/\/dateinquiry\.com';/);
  assert.match(squareRoutesText, /const callbackUrl = `\$\{callbackBaseUrl\}\/api\/square\/connect\/callback`;/);
  assert.match(squareRoutesText, /const callbackUrl = 'https:\/\/dateinquiry\.com\/api\/square\/connect\/callback';/);
  assert.match(squareRoutesText, /const errorRedirect = 'https:\/\/dateinquiry\.com\/artist\?square=error&message=';/);
  assert.match(squareRoutesText, /const productionDomain = 'https:\/\/dateinquiry\.com';/);
  assert.match(squareRoutesText, /redirect_uri: callbackUrl/);
  assert.match(squareRoutesText, /redirectUrl: `\$\{baseUrl\}\/payment-success\?bookingId=\$\{bookingId \|\| 'invoice'\}`/);
});

test("Square OAuth source does not use PUBLIC_BASE_URL or the public URL helper yet", async () => {
  const squareRoutesText = await readFile(new URL("./squareRoutes.ts", import.meta.url), "utf8");

  assert.doesNotMatch(squareRoutesText, /PUBLIC_BASE_URL/);
  assert.doesNotMatch(squareRoutesText, /getPublicBaseUrl/);
  assert.doesNotMatch(squareRoutesText, /getBriarwoodPublicBaseUrl/);
  assert.doesNotMatch(squareRoutesText, /getLegacyDateInquiryPublicBaseUrl/);
});

test("AI Square payment redirect keeps current PUBLIC_BASE_URL, Replit deployment, DateInquiry fallback order", async () => {
  const aiChatText = await readFile(new URL("./aiChat.ts", import.meta.url), "utf8");

  const paymentFunctionStart = aiChatText.indexOf("export async function sendPaymentLinkFromAI");
  assert.ok(paymentFunctionStart >= 0, "sendPaymentLinkFromAI should exist");
  const paymentFunctionEnd = aiChatText.indexOf("export async function forwardCommunicationToArtist", paymentFunctionStart);
  assert.ok(paymentFunctionEnd > paymentFunctionStart, "sendPaymentLinkFromAI should be before forwardCommunicationToArtist");
  const paymentSection = aiChatText.slice(paymentFunctionStart, paymentFunctionEnd);

  assert.match(paymentSection, /const \{ getMerchantSquare \} = await import\('\.\/squareClient'\);/);
  assert.match(paymentSection, /const baseUrl = process\.env\.PUBLIC_BASE_URL \|\| process\.env\.REPLIT_DEPLOYMENT_URL \|\| 'https:\/\/dateinquiry\.com';/);
  assert.match(paymentSection, /redirectUrl: `\$\{baseUrl\}\/payment-success\?bookingId=\$\{payment\.bookingId \|\| 'invoice'\}`/);
  assert.match(paymentSection, /await sendInvoiceEmail\(/);
  assert.doesNotMatch(paymentSection, /getPublicBaseUrl/);
  assert.doesNotMatch(paymentSection, /getLegacyDateInquiryPublicBaseUrl/);
});

test("Square domain characterization does not involve email sender/from domain or public-token validation", async () => {
  const [squareRoutesText, aiChatText, publicUrlText] = await Promise.all([
    readFile(new URL("./squareRoutes.ts", import.meta.url), "utf8"),
    readFile(new URL("./aiChat.ts", import.meta.url), "utf8"),
    readFile(new URL("./config/publicUrl.ts", import.meta.url), "utf8"),
  ]);

  assert.match(aiChatText, /from: fromEmail \|\| "Your Secretary <notifications@dateinquiry\.com>"/);
  assert.doesNotMatch(squareRoutesText, /notifications@dateinquiry\.com/);
  assert.doesNotMatch(squareRoutesText, /threadPublicToken|clientThreadToken|signingToken|shareToken/);
  assert.match(publicUrlText, /export const LEGACY_DATEINQUIRY_PUBLIC_BASE_URL = "https:\/\/dateinquiry\.com";/);
});
