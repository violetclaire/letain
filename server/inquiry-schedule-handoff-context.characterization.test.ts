import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const builderSource = readFileSync("client/src/pages/ScheduleDraftBuilder.tsx", "utf8");
const routesSource = readFileSync("server/routes.ts", "utf8");

function around(source: string, marker: string, radius = 2800): string {
  const index = source.indexOf(marker);
  assert.notEqual(index, -1, `Missing marker: ${marker}`);
  return source.slice(Math.max(0, index - radius), index + marker.length + radius);
}

const handoffPanel = around(builderSource, 'data-testid="section-inquiry-schedule-handoff"');
const handoffHelpers = around(builderSource, "function buildInquiryHandoffContext", 2200);
const handoffSources = `${handoffHelpers}\n${handoffPanel}`;

test("Schedule Draft Builder handoff panel shows structured inquiry context rows", () => {
  assert.match(builderSource, /function buildInquiryHandoffContext/);
  assert.match(handoffPanel, />Date</);
  assert.match(handoffPanel, />Location</);
  assert.match(handoffPanel, />Schedule context</);
  assert.match(handoffPanel, />Notes</);
  assert.match(handoffPanel, /inquiryHandoffContext\.date/);
  assert.match(handoffPanel, /inquiryHandoffContext\.location/);
  assert.match(handoffPanel, /inquiryHandoffContext\.scheduleContext/);
  assert.match(handoffPanel, /inquiryHandoffContext\.notes/);
});

test("handoff context is parsed from existing draft notes without inventing missing context", () => {
  assert.match(handoffHelpers, /readHandoffField\(notes, "Event date"\)/);
  assert.match(handoffHelpers, /readHandoffField\(notes, "Location \/ venue"\)/);
  assert.match(handoffHelpers, /readHandoffField\(notes, "Schedule context"\)/);
  assert.match(handoffHelpers, /readHandoffNotes\(notes\)/);
  assert.match(handoffHelpers, /scheduleContext: readHandoffField\(notes, "Schedule context"\) \|\| "Confirm from inquiry"/);
  assert.match(handoffHelpers, /date: readHandoffField\(notes, "Event date"\) \|\| input\.eventDate\.trim\(\) \|\| "Not captured yet"/);
  assert.match(handoffHelpers, /location: readHandoffField\(notes, "Location \/ venue"\) \|\| input\.location\.trim\(\) \|\| "Not captured yet"/);
  assert.match(handoffHelpers, /notes: inquiryNotes \|\| notes \|\| "No inquiry notes captured yet"/);
});

test("handoff panel frames structured context as draft context to confirm", () => {
  assert.match(handoffPanel, /Treat carried context as draft context to confirm, not final schedule truth\./);
  assert.match(handoffPanel, /Missing schedule details are still expected; ready time is usually the next key schedule detail\./);
  assert.match(handoffPanel, /Nothing sends from this draft and no client link exists\./);
});

test("handoff context polish does not add routes, schema, sends, uploads, contracts, payments, AI, or public visibility", () => {
  assert.match(routesSource, /app\.post\("\/api\/schedule-drafts", isAuthenticated/);
  assert.doesNotMatch(builderSource, /\/api\/schedule-drafts\/handoff|\/api\/inquiries\/[^"`']+\/schedule-handoff/);
  assert.doesNotMatch(handoffSources, /drizzle|pgTable|migrations?|ALTER TABLE|CREATE TABLE/);
  assert.doesNotMatch(handoffSources, /sendEmail|sendSMS|sendInfoSheetEmail|sendGeneralEmail|\/api\/sms|\/api\/emails?/);
  assert.doesNotMatch(handoffSources, /ObjectUploader|\/api\/objects|upload/);
  assert.doesNotMatch(handoffSources, /\/api\/contracts|\/api\/square|\/api\/payments?|Square|payment/i);
  assert.doesNotMatch(handoffSources, /scheduleAI|processScheduleChat|aiChat|\/api\/schedule-ai/);
  assert.doesNotMatch(handoffSources, /public schedule|client link created|create client link/i);
});
