import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const script = readFileSync("scripts/seed-local-demo.ts", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts?: Record<string, string>;
};

test("local demo seed command points at the guarded script", () => {
  assert.equal(packageJson.scripts?.["seed:local-demo"], "tsx scripts/seed-local-demo.ts");
});

test("local demo seed has explicit safety gates and no production send/payment credentials", () => {
  for (const requiredGate of [
    "ALLOW_LOCAL_DEMO_SEED",
    "LOCAL_DEMO_DB_CONFIRM",
    "PUBLIC_BASE_URL",
    "DEMO_OPERATOR_PASSWORD",
    "NODE_ENV",
    "prod|production|live",
  ]) {
    assert.match(script, new RegExp(requiredGate));
  }

  for (const forbiddenEnv of [
    "RESEND_API_KEY",
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_PHONE_NUMBER",
    "TWILIO_MESSAGING_SERVICE_SID",
    "SQUARE_ACCESS_TOKEN",
    "SQUARE_APPLICATION_ID",
    "SQUARE_APPLICATION_SECRET",
  ]) {
    assert.match(script, new RegExp(forbiddenEnv));
  }
});

test("local demo seed uses deterministic Briarwood demo IDs", () => {
  for (const deterministicId of [
    "demo-operator-briarwood",
    "demo-artist-profile-briarwood",
    "demo-inquiry-fairmont-2026",
    "demo-route-target-hair",
    "demo-route-target-makeup",
    "demo-route-target-scheduler",
    "demo-schedule-fairmont",
  ]) {
    assert.match(script, new RegExp(deterministicId));
  }
});

test("local demo seed does not import runtime route or delivery modules", () => {
  assert.doesNotMatch(script, /server\/index|server\/routes|emailService|smsService|squareRoutes/);
  assert.doesNotMatch(script, /fetch\(|apiRequest|sendInfoSheet|sendSms|createPayment/);
  assert.doesNotMatch(script, /server\/seed/);
});
