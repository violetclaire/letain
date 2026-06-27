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
    "demo-service-bridal-hair-makeup",
    "demo-service-attendant-hair",
    "demo-service-attendant-makeup",
    "demo-inquiry-fairmont-2026",
    "demo-route-target-hair",
    "demo-route-target-makeup",
    "demo-route-target-scheduler",
    "demo-schedule-fairmont",
    "demo-path-fairmont",
  ]) {
    assert.match(script, new RegExp(deterministicId));
  }
});

test("local demo profile seeds Pricing / Info Sheet configured state without a PDF requirement", () => {
  assert.match(script, /infoSheetEnabled: true/);
  assert.match(script, /infoSheetType: "custom"/);
  assert.match(script, /infoSheetContent: DEMO_INFO_SHEET_CONTENT/);
  assert.match(script, /pricingInfo: DEMO_PRICING_INFO/);
  assert.match(script, /plannerInfoSheet: DEMO_PLANNER_INFO_SHEET/);
  assert.match(script, /plannerPricing: DEMO_PRICING_INFO/);
  assert.match(script, /infoSheetPdfUrl: null/);
  assert.match(script, /Local demo Pricing \/ Info Sheet/);
  assert.match(script, /nothing sends automatically/i);
});

test("local demo services are seeded for reusable Pricing / Info Sheet readiness", () => {
  assert.match(script, /artistServices/);

  for (const serviceSeed of [
    "demo-service-bridal-hair-makeup",
    "demo-service-attendant-hair",
    "demo-service-attendant-makeup",
    "Demo bridal hair and makeup coordination",
    "Demo attendant hair",
    "Demo attendant makeup",
  ]) {
    assert.match(script, new RegExp(serviceSeed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(script, /await db\.insert\(artistServices\)\.values\(row\)\.onConflictDoUpdate/);
  assert.match(script, /delete\(artistServices\)\.where\(eq\(artistServices\.artistId, DEMO_OPERATOR_ID\)\)/);
});

test("local demo Pricing / Info Sheet seed does not introduce upload or delivery behavior", () => {
  assert.doesNotMatch(script, /uploadObject|objectStorage|ObjectStorage|createObject|infoSheetPdfUrl: "[^"]+"/);
  assert.doesNotMatch(script, /sendInfoSheet|sendEmail|sendSms|createPayment|createContract/);
});

test("local demo seed uses generic role-based demo labels", () => {
  for (const genericLabel of [
    "Briarwood Local Demo Operator",
    "Private Client",
    "Private Venue Ballroom",
    "Primary Beauty Lead",
    "Preferred Hair Artist",
    "Preferred Makeup Artist",
    "Backup Beauty Coordinator",
    "Private venue bridal beauty handoff",
  ]) {
    assert.match(script, new RegExp(genericLabel));
  }
});

test("local demo schedule stores service details outside the lane source", () => {
  assert.match(script, /id: "provider", label: "Provider \/ lane", type: "provider"/);
  assert.match(script, /id: "role", label: "Role \/ person", type: "text"/);
  assert.match(script, /id: "service", label: "Service", type: "text"/);

  for (const laneProvider of [
    'provider: "Primary Beauty Lead"',
    'provider: "Preferred Hair Artist"',
    'provider: "Preferred Makeup Artist"',
  ]) {
    assert.match(script, new RegExp(laneProvider.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const serviceLikeLaneValue of [
    'provider: "Setup"',
    'provider: "Bridesmaid Makeup"',
    'provider: "Mother Makeup"',
    'provider: "Bride Hair + Makeup"',
    'provider: "Touch-Ups"',
  ]) {
    assert.doesNotMatch(script, new RegExp(serviceLikeLaneValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(script, /service: "Touch-ups"/);
  assert.match(script, /role: "Flower girl"/);
  assert.match(script, /provider: "", role: "Flower girl", service: "Service pending"/);
});

test("local demo seed does not depend on named demo people or providers", () => {
  for (const legacyName of [
    "Dun" + "dy",
    "Briarwood Scheduler " + "Demo",
    "Demo " + "Hair Artist",
    "Demo " + "Makeup Artist",
    "Maya " + "Demo",
    "Primary Artist " + "Demo",
    "Fairmont " + "Demo Ballroom",
    "Fairmont " + "Demo Wedding Schedule",
    "Fairmont " + "bridal",
  ]) {
    assert.doesNotMatch(script, new RegExp(legacyName));
  }
});

test("local demo seed does not import runtime route or delivery modules", () => {
  assert.doesNotMatch(script, /server\/index|server\/routes|emailService|smsService|squareRoutes/);
  assert.doesNotMatch(script, /fetch\(|apiRequest|sendInfoSheet|sendSms|createPayment/);
  assert.doesNotMatch(script, /server\/seed/);
});

test("local demo seed treats contract metadata as optional and schema-aware", () => {
  assert.match(script, /seedOptionalContractMetadata/);
  assert.match(script, /information_schema\.columns/);
  assert.match(script, /requiredContractColumns/);
  assert.match(script, /Skipping optional contract metadata/);
  assert.match(script, /return false/);
});

test("local demo schedule can seed without a linked contract", () => {
  assert.match(script, /const contractSeeded = await seedOptionalContractMetadata/);
  assert.match(script, /const scheduleContractId = contractSeeded \? DEMO_CONTRACT_ID : null/);
  assert.match(script, /convertedToContractId: scheduleContractId/);
  assert.match(script, /"contract_id", scheduleContractId/);
});

test("local demo schedule draft insert is schema-aware and treats engine metadata as optional", () => {
  assert.match(script, /async function seedScheduleDraft/);
  assert.match(script, /getPublicTableColumns\(db as any, sql, "schedule_drafts"\)/);
  assert.match(script, /requiredScheduleColumns/);
  assert.match(script, /"engine_metadata"/);
  assert.match(script, /omittedOptionalColumns/);
  assert.match(script, /Seeded schedule draft without unsupported optional columns/);
  assert.match(script, /await seedScheduleDraft\(db as any, sql, now, scheduleContractId\)/);
  assert.doesNotMatch(script, /db\.insert\(scheduleDrafts\)\.values/);
});

test("local demo coordination path is seeded and cleaned up deterministically", () => {
  assert.match(script, /async function seedCoordinationPath/);
  assert.match(script, /DEMO_COORDINATION_PATH_ID/);
  assert.match(script, /"permission_decision", "PROCEED_WITH_OVERSIGHT"/);
  assert.match(script, /"UNCONFIRMED_HANDOFF"/);
  assert.match(script, /"LOW_RECOVERY_CAPACITY"/);
  assert.match(script, /await seedCoordinationPath\(db as any, sql, now\)/);
  assert.match(script, /async function cleanupCoordinationDemoRows/);
  assert.match(script, /await cleanupCoordinationDemoRows\(db as any, sql\)/);
});

test("local demo cleanup targets deterministic demo rows only", () => {
  for (const cleanupAnchor of [
    "DEMO_INQUIRY_ID",
    "DEMO_SCHEDULE_ID",
    "DEMO_CONTRACT_ID",
    "DEMO_COORDINATION_PATH_ID",
    "DEMO_OPERATOR_ID",
    "DEMO_CLIENT_ID",
    "DEMO_PROFILE_ID",
    "DEMO_SERVICE_BRIDAL_HM_ID",
    "DEMO_SERVICE_ATTENDANT_HAIR_ID",
    "DEMO_SERVICE_ATTENDANT_MAKEUP_ID",
  ]) {
    assert.match(script, new RegExp(cleanupAnchor));
  }

  assert.match(script, /delete\(inquiryRouteCandidates\)\.where\(eq\(inquiryRouteCandidates\.inquiryId, DEMO_INQUIRY_ID\)\)/);
  assert.match(script, /delete\(scheduleDrafts\)\.where\(eq\(scheduleDrafts\.id, DEMO_SCHEDULE_ID\)\)/);
  assert.match(script, /delete\(routeTargets\)\.where\(eq\(routeTargets\.operatorId, DEMO_OPERATOR_ID\)\)/);
  assert.match(script, /delete from contracts where id = \$\{DEMO_CONTRACT_ID\}/);
});
