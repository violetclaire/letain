import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const builderSource = readFileSync("client/src/pages/ScheduleDraftBuilder.tsx", "utf8");

test("Schedule Draft Builder shows a read-only schedule readiness card", () => {
  assert.match(builderSource, /Schedule readiness/);
  assert.match(builderSource, /Nothing sends from this card/);
  assert.match(builderSource, /getScheduleMissingInfo/);
  assert.match(builderSource, /Ready to draft/);
  assert.match(builderSource, /Needs schedule details/);
  assert.match(builderSource, /Ready with assumptions/);
  assert.match(builderSource, /Needs operator review/);
});

test("schedule readiness includes Violet missing-info prompts and assumption confirmations", () => {
  assert.match(builderSource, /Need event date before drafting the schedule\./);
  assert.match(builderSource, /Need ready time before finalizing the schedule\./);
  assert.match(builderSource, /Need end time or service window before finalizing the schedule\./);
  assert.match(builderSource, /Need number of people receiving services\./);
  assert.match(builderSource, /Need service counts before assigning provider lanes\./);
  assert.match(builderSource, /Need provider count before assigning lanes\./);
  assert.match(builderSource, /Bride block assumed 2 hours -- confirm\./);
  assert.match(builderSource, /Default makeup duration used -- confirm\./);
  assert.match(builderSource, /Default hair duration used -- confirm\./);
  assert.match(builderSource, /Placeholder names used -- confirm when names are available\./);
});

test("schedule readiness stays read-only and does not wire AI scheduling or sends", () => {
  assert.doesNotMatch(builderSource, /scheduleAI|processScheduleChat|aiChat|\/api\/schedule-ai/);
  assert.doesNotMatch(builderSource, /sendEmail|sendSMS|sendInfoSheetEmail|sendGeneralEmail|\/api\/sms|\/api\/emails?/);
  assert.doesNotMatch(builderSource, /\/api\/inquiry-responses|\/api\/inquiries\/[^"`']+\/responses/);
  assert.doesNotMatch(builderSource, /ObjectUploader|\/api\/objects|upload/);
});

test("schedule readiness does not introduce schema, migration, contract, payment, or client-login behavior", () => {
  assert.doesNotMatch(builderSource, /drizzle|pgTable|migrations?|ALTER TABLE|CREATE TABLE/);
  assert.doesNotMatch(builderSource, /\/api\/contracts|\/api\/square|\/api\/payments?|Square|payment/i);
  assert.doesNotMatch(builderSource, /client-login|planner-login|client login|planner login/i);
});
