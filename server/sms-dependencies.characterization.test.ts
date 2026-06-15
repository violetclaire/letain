import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const serverDir = path.dirname(fileURLToPath(import.meta.url));

function readServerFile(relativePath: string): string {
  return readFileSync(path.join(serverDir, relativePath), "utf8");
}

function collectServerSourceFiles(dir = serverDir): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return collectServerSourceFiles(fullPath);
    }

    if (!entry.isFile() || !/\.(ts|js)$/.test(entry.name) || /\.test\.ts$/.test(entry.name)) {
      return [];
    }

    return [path.relative(serverDir, fullPath).replaceAll(path.sep, "/")];
  });

  return files;
}

test("server/smsService.ts centralizes current Twilio config and client construction", () => {
  const source = readServerFile("smsService.ts");

  assert.ok(source.includes("import twilio from 'twilio';"));
  assert.ok(source.includes("interface TwilioConfig"));
  assert.ok(source.includes("const accountSid = process.env.TWILIO_ACCOUNT_SID;"));
  assert.ok(source.includes("const authToken = process.env.TWILIO_AUTH_TOKEN;"));
  assert.ok(source.includes("const phoneNumber = process.env.TWILIO_PHONE_NUMBER;"));
  assert.ok(source.includes("return { accountSid, authToken, phoneNumber };"));

  const clientConstructionSites = source.match(/twilio\(config\.accountSid, config\.authToken\)/g) ?? [];
  assert.equal(clientConstructionSites.length, 1);
  assert.doesNotMatch(source, /TWILIO_MESSAGING_SERVICE|MESSAGING_SERVICE|messagingService/i);
});

test("missing Twilio config fails closed at the service boundary", () => {
  const source = readServerFile("smsService.ts");

  assert.match(
    source,
    /if \(!accountSid \|\| !authToken \|\| !phoneNumber\) \{\s*console\.warn\('\[SMS\] Twilio not configured - missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER'\);\s*return null;/,
  );
  assert.ok(source.includes("export function isSmsConfigured(): boolean"));
  assert.ok(source.includes("return getTwilioConfig() !== null;"));
  assert.ok(source.includes("success: false"));
  assert.ok(source.includes("SMS service not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables."));
});

test("Twilio send and webhook validation use the centralized config", () => {
  const source = readServerFile("smsService.ts");

  assert.ok(source.includes("export function validateTwilioRequest("));
  assert.ok(source.includes("return twilio.validateRequest(config.authToken, signature, url, params || {});"));
  assert.ok(source.includes("export async function sendSms("));
  assert.ok(source.includes("const client = getTwilioClient();"));
  assert.ok(source.includes("const normalizedPhone = normalizePhoneNumber(to);"));
  assert.ok(source.includes("const message = await client.messages.create({"));
  assert.ok(source.includes("from: config.phoneNumber"));
  assert.ok(source.includes("to: normalizedPhone"));
});

test("server routes keep SMS sends, inbound webhook, and simulator references behind existing service paths", () => {
  const source = readServerFile("routes.ts");

  assert.ok(source.includes('import * as smsService from "./smsService";'));
  assert.ok(source.includes('const { sendSms } = await import("./smsService");'));
  assert.ok(source.includes('app.get("/api/sms/status", isAuthenticated'));
  assert.ok(source.includes('app.post("/api/sms/inbound"'));
  assert.ok(source.includes("smsService.validateTwilioRequest(signature, fullUrl, body)"));
  assert.ok(source.includes('app.post("/api/sms/send", isAuthenticated'));
  assert.ok(source.includes("const result = await smsService.sendSms(to, message);"));
  assert.ok(source.includes('app.post("/api/invoice/send-sms", isAuthenticated'));
  assert.ok(source.includes('app.post("/api/event-schedules/send-sms", isAuthenticated'));
});

test("admin SMS simulator remains separately gated and uses the current dev fallback number", () => {
  const source = readServerFile("routes.ts");

  assert.ok(source.includes('const smsTestToolsEnabled = () => process.env.ENABLE_SMS_TEST_TOOLS === "true";'));
  assert.ok(source.includes('app.get("/api/admin/sms-test/status", isAuthenticated'));
  assert.ok(source.includes('app.post("/api/admin/sms-test/simulate", isAuthenticated'));
  assert.ok(source.includes('return res.status(404).json({ error: "Not found" });'));
  assert.ok(source.includes('const toNumber = to ? String(to) : (process.env.TWILIO_PHONE_NUMBER || "+10000000000");'));
  assert.ok(source.includes("rawPayload: { From: String(from), To: toNumber, Body: body ? String(body) : \"\", MessageSid: sid, _simulated: true }"));
});

test("current SMS runtime env usage stays inventoried", () => {
  const envReferences = new Set<string>();

  for (const file of collectServerSourceFiles()) {
    const source = readServerFile(file);
    const matches = source.matchAll(/process\.env\.(TWILIO_[A-Z_]+|ENABLE_SMS_TEST_TOOLS)/g);

    for (const match of matches) {
      envReferences.add(`${file}:${match[1]}`);
    }
  }

  assert.deepEqual(
    [...envReferences].sort(),
    [
      "routes.ts:ENABLE_SMS_TEST_TOOLS",
      "routes.ts:TWILIO_PHONE_NUMBER",
      "smsService.ts:TWILIO_ACCOUNT_SID",
      "smsService.ts:TWILIO_AUTH_TOKEN",
      "smsService.ts:TWILIO_PHONE_NUMBER",
    ],
  );
});

test("SMS dependency characterization stays source-only", () => {
  const testSource = readServerFile("sms-dependencies.characterization.test.ts");
  const importLines = testSource
    .split(/\r?\n/)
    .filter((line) => line.startsWith("import "))
    .join("\n");
  const executableLines = testSource
    .split(/\r?\n/)
    .filter((line) => !line.includes("doesNotMatch"))
    .join("\n");

  assert.ok(testSource.includes("readFileSync"));
  assert.doesNotMatch(importLines, /from\s+["']\.\/smsService["']/);
  assert.doesNotMatch(importLines, /from\s+["']\.\/routes["']/);
  assert.doesNotMatch(importLines, /from\s+["']twilio["']/);
  assert.doesNotMatch(executableLines, /process\.env\.[A-Z_]+\s*=(?!=)/);
});
