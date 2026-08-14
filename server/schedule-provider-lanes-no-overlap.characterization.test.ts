import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const builderSource = readFileSync("client/src/pages/ScheduleDraftBuilder.tsx", "utf8");

test("Quick Add provider count creates provider lanes with explicit capabilities", () => {
  assert.match(builderSource, /What type of business or service schedule are you making\?/);
  assert.match(builderSource, /const laneLabel = \(rec: Lane\): string => `Provider \$\{rec\.artistNum\}`/);
  assert.match(builderSource, /Wedding beauty or HMU schedules can use Hair, Makeup, or Hair \+ makeup capabilities\./);
  assert.match(builderSource, /function buildLanes/);
  assert.match(builderSource, /laneCapability/);
  assert.match(builderSource, /capability: laneCapability\(rec\)/);
  assert.match(builderSource, /capability: l\.capability \?\? ""/);
  assert.match(builderSource, /Hair \+ makeup/);
  assert.match(builderSource, /Hair/);
  assert.match(builderSource, /Makeup/);
  assert.match(builderSource, /Unknown \/ needs operator confirmation/);
});

test("missing names stay editable and do not block lane drafting", () => {
  assert.match(builderSource, /Missing names are allowed; everything stays editable\./);
  assert.match(builderSource, /Missing names are allowed; blanks and placeholders stay editable\./);
  assert.match(builderSource, /Missing names are okay; blank\/placeholders can be confirmed later\./);
  assert.match(builderSource, /isPlaceholderName/);
});

test("first draft preview sequences same-person blocks instead of allowing silent overlaps", () => {
  assert.match(builderSource, /sequenceSamePersonPreviewBlocks/);
  assert.match(builderSource, /previewServiceSequenceRank/);
  assert.match(builderSource, /same person is not overlapping across providers/);
  assert.match(builderSource, /Same-person service blocks are checked so they do not overlap\./);
  assert.match(builderSource, /Domain-specific rules apply when the schedule type is known or inferred\./);
  assert.match(builderSource, /a\.start - b\.start/);
  assert.match(builderSource, /previewIntervalsOverlap/);
});

test("schedule assumptions remain surfaced for operator confirmation", () => {
  assert.match(builderSource, /Bride placement follows the near-end draft rule -- confirm for this event\./);
  assert.match(builderSource, /Bride timing comes only from your entries; placement is a draft rule to confirm, not a universal rule\./);
  assert.match(builderSource, /Ready time is the anchor; the final service ends there by default\./);
  assert.match(builderSource, /Unknown provider capability means operator confirmation is still needed\./);
});

test("provider lane rules do not add risky systems or public scheduling behavior", () => {
  assert.doesNotMatch(builderSource, /scheduleAI|processScheduleChat|aiChat|\/api\/schedule-ai/);
  assert.doesNotMatch(builderSource, /sendEmail|sendSMS|sendInfoSheetEmail|sendGeneralEmail|\/api\/sms|\/api\/emails?/);
  assert.doesNotMatch(builderSource, /ObjectUploader|\/api\/objects|upload/);
  assert.doesNotMatch(builderSource, /drizzle|pgTable|migrations?|ALTER TABLE|CREATE TABLE/);
  assert.doesNotMatch(builderSource, /\/api\/contracts|\/api\/square|\/api\/payments?|Square|payment/i);
  assert.doesNotMatch(builderSource, /client-login|planner-login|client login|planner login/i);
});
