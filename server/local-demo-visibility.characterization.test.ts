import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const indexSource = readFileSync("server/index.ts", "utf8");
const routesSource = readFileSync("server/routes.ts", "utf8");
const storageSource = readFileSync("server/storage.ts", "utf8");
const seedSource = readFileSync("scripts/seed-local-demo.ts", "utf8");

test("Inquiry Workspace availability lookup has a storage compatibility method", () => {
  assert.match(routesSource, /storage\.getAvailability\(userId, startOfYear, endOfNextYear\)/);
  assert.match(storageSource, /getAvailability\(userId: string, startDate: Date, endDate: Date\): Promise<Availability\[]>/);
  assert.match(storageSource, /async getAvailability\(userId: string, startDate: Date, endDate: Date\): Promise<Availability\[]>/);
  assert.match(storageSource, /return this\.getUserAvailability\(userId, startDate, endDate\)/);
});

test("startup self-healing aligns schedule_drafts engine metadata with runtime schema", () => {
  assert.match(indexSource, /name: 'schedule_drafts\.table'/);
  assert.match(indexSource, /name: 'schedule_drafts\.engine_metadata'/);
  assert.match(indexSource, /ALTER TABLE schedule_drafts ADD COLUMN IF NOT EXISTS engine_metadata jsonb DEFAULT '\{\}'::jsonb/);
});

test("guarded local demo seed includes the coordination path expected by the admin route", () => {
  assert.match(seedSource, /DEMO_COORDINATION_PATH_ID = "demo-path-fairmont"/);
  assert.match(seedSource, /async function seedCoordinationPath/);
  assert.match(seedSource, /getPublicTableColumns\(db as any, sql, "coordination_paths"\)/);
  assert.match(seedSource, /"permission_decision", "PROCEED_WITH_OVERSIGHT"/);
  assert.match(seedSource, /"UNCONFIRMED_HANDOFF"/);
  assert.match(seedSource, /"LOW_RECOVERY_CAPACITY"/);
  assert.match(seedSource, /await seedCoordinationPath\(db as any, sql, now\)/);
  assert.match(seedSource, /coordination\/demo-path-fairmont/);
});

test("local demo cleanup removes only deterministic coordination demo rows", () => {
  assert.match(seedSource, /async function cleanupCoordinationDemoRows/);
  assert.match(seedSource, /delete from coordination_assessments where path_id = \$\{DEMO_COORDINATION_PATH_ID\}/);
  assert.match(seedSource, /delete from coordination_events where path_id = \$\{DEMO_COORDINATION_PATH_ID\}/);
  assert.match(seedSource, /delete from coordination_paths where id = \$\{DEMO_COORDINATION_PATH_ID\}/);
  assert.match(seedSource, /await cleanupCoordinationDemoRows\(db as any, sql\)/);
});
