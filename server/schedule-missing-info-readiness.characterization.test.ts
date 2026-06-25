import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const builderSource = readFileSync("client/src/pages/ScheduleDraftBuilder.tsx", "utf8");

test("Schedule Draft Builder shows a read-only schedule readiness card", () => {
  assert.match(builderSource, /Schedule readiness/);
  assert.match(builderSource, /Briarwood starts with the schedule type/);
  assert.match(builderSource, /Nothing sends from this card/);
  assert.match(builderSource, /Next schedule detail/);
  assert.match(builderSource, /getScheduleMissingInfo/);
  assert.match(builderSource, /Ready to draft/);
  assert.match(builderSource, /Needs schedule details/);
  assert.match(builderSource, /Ready with assumptions/);
  assert.match(builderSource, /Needs operator review/);
});

test("schedule readiness includes Violet missing-info prompts and assumption confirmations", () => {
  assert.match(builderSource, /Need ready time before finalizing the schedule\./);
  assert.match(builderSource, /Need event date before drafting the schedule\./);
  assert.match(builderSource, /Need end time or service window before finalizing the schedule\./);
  assert.match(builderSource, /Need number of people receiving services\./);
  assert.match(builderSource, /Need service counts before assigning provider lanes\./);
  assert.match(builderSource, /Need provider count before assigning lanes\./);
  assert.ok(
    builderSource.indexOf("Need ready time before finalizing the schedule.") <
      builderSource.indexOf("Need event date before drafting the schedule."),
    "ready time should be the first scheduling anchor when timing is missing",
  );
  assert.match(builderSource, /Bride hair \+ makeup uses Violet's 2-hour default -- confirm\./);
  assert.match(builderSource, /Bride placement follows Violet's near-end default -- confirm for this event\./);
  assert.match(builderSource, /Default makeup duration used -- confirm\./);
  assert.match(builderSource, /Default hair duration used -- confirm\./);
  assert.match(builderSource, /Single-service default duration used -- confirm this provider's timing\./);
  assert.match(builderSource, /Missing names are okay; blank\/placeholders can be confirmed later\./);
});

test("schedule readiness surfaces backward draft rules without treating defaults as universal facts", () => {
  assert.match(builderSource, /Ready time is the anchor; the final service ends there by default\./);
  assert.match(builderSource, /Optional: finish 15 minutes early for touch-ups and notes\./);
  assert.match(builderSource, /Missing names are allowed; blanks and placeholders stay editable\./);
  assert.match(builderSource, /Bride timing and placement are Violet defaults to confirm, not universal rules\./);
  assert.match(builderSource, /Violet's defaults start with 2 hours\s+for bride hair \+ makeup, 30 minutes for Violet single services, and no buffer unless\s+you add one\./);
});

test("quick add/provider lane copy keeps names flexible and provider roles explicit", () => {
  assert.match(builderSource, /What type of business or service schedule are you making\?/);
  assert.match(builderSource, /Add the schedule context first, then paste counts, services, roles, and provider count\./);
  assert.match(builderSource, /For a wedding beauty or HMU schedule, Briarwood can infer ready-time logistics, provider capabilities, missing names, and overlap checks\./);
  assert.match(builderSource, /const laneLabel = \(rec: Lane\): string => `Provider \$\{rec\.artistNum\}`/);
  assert.match(builderSource, /Missing names are allowed; everything stays editable\./);
  assert.match(builderSource, /Use Capability to mark what each provider handles for this schedule type/);
  assert.match(builderSource, /Wedding beauty or HMU schedules can use Hair, Makeup, or Hair \+ makeup capabilities\./);
  assert.match(builderSource, /Domain-specific rules apply when the schedule type is known or inferred\./);
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
