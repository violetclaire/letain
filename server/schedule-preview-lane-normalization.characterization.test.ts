import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const builderSource = readFileSync("client/src/pages/ScheduleDraftBuilder.tsx", "utf8");

test("schedule preview normalizes lane headers away from role/person service labels", () => {
  assert.match(builderSource, /function normalizeScheduleLaneLabel/);
  assert.match(builderSource, /function isServiceLikeLaneHeader/);
  assert.match(builderSource, /function serviceCapabilityLaneLabel/);
  assert.match(builderSource, /normalizeScheduleLaneLabel\(name, providersByName\.get\(name\)\?\.capability, index \+ 1\)/);
  assert.match(builderSource, /label: normalizeScheduleLaneLabel\(name, provider\.capability, lanes\.size \+ 1\)/);
  assert.doesNotMatch(builderSource, /return `Artist \$\{rec\.artistNum\} -/);
});

test("provider and service lane headers stay explicit while details remain inside blocks", () => {
  assert.match(builderSource, /const laneLabel = \(rec: Lane\): string => `Artist \$\{rec\.artistNum\}`/);
  assert.match(builderSource, /Needs provider assignment/);
  assert.match(builderSource, /Hair \+ Makeup/);
  assert.match(builderSource, /Touch-ups/);
  assert.match(builderSource, /Lane headers use provider\/service-lane metadata; role, person, and service details stay inside timed blocks\./);
  assert.match(builderSource, /<h3 className="font-serif text-lg tracking-tight">\{lane\.label\}<\/h3>/);
  assert.match(builderSource, /\{service && <div className="text-sm text-ink\/70 mt-0\.5">\{service\}<\/div>\}/);
});

test("missing names and overlap warnings remain supported", () => {
  assert.match(builderSource, /Missing names are allowed; everything stays editable\./);
  assert.match(builderSource, /Missing names are allowed; blanks and placeholders stay editable\./);
  assert.match(builderSource, /sequenceSamePersonPreviewBlocks/);
  assert.match(builderSource, /same-person hair\/makeup blocks are sequenced to avoid overlap/);
  assert.match(builderSource, /same person is not overlapping across providers/);
});

test("preview lane normalization does not add risky systems or public behavior", () => {
  assert.doesNotMatch(builderSource, /scheduleAI|processScheduleChat|aiChat|\/api\/schedule-ai/);
  assert.doesNotMatch(builderSource, /sendEmail|sendSMS|sendInfoSheetEmail|sendGeneralEmail|\/api\/sms|\/api\/emails?/);
  assert.doesNotMatch(builderSource, /ObjectUploader|\/api\/objects|upload/);
  assert.doesNotMatch(builderSource, /drizzle|pgTable|migrations?|ALTER TABLE|CREATE TABLE/);
  assert.doesNotMatch(builderSource, /\/api\/contracts|\/api\/square|\/api\/payments?|Square|payment/i);
  assert.doesNotMatch(builderSource, /client-login|planner-login|client login|planner login|createClientLink|shareToken|publicSchedule/i);
  assert.doesNotMatch(builderSource, /coordinationAssessment|coordination_assessments|CDI|trust_score|provider_score/);
});
