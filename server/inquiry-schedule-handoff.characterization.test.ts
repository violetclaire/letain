import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const inquiryWorkspace = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");
const scheduleBuilder = readFileSync("client/src/pages/ScheduleDraftBuilder.tsx", "utf8");
const routesSource = readFileSync("server/routes.ts", "utf8");

function between(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing start marker: ${start}`);
  const endIndex = source.indexOf(end, startIndex);
  assert.notEqual(endIndex, -1, `Missing end marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

function around(source: string, marker: string, radius = 1800): string {
  const index = source.indexOf(marker);
  assert.notEqual(index, -1, `Missing marker: ${marker}`);
  return source.slice(Math.max(0, index - radius), index + marker.length + radius);
}

const handoffNotesSnippet = between(
  inquiryWorkspace,
  "function buildScheduleDraftHandoffNotes",
  "function searchableText",
);
const scheduleCardSnippet = between(
  inquiryWorkspace,
  'data-testid="schedule-draft-card"',
  'data-testid="draft-routing-candidates-card"',
);
const builderHandoffSnippet = around(scheduleBuilder, 'data-testid="section-inquiry-schedule-handoff"', 2600);
const handoffSources = [handoffNotesSnippet, scheduleCardSnippet, builderHandoffSnippet].join("\n");

test("Inquiry Workspace carries safe inquiry context into a private schedule draft", () => {
  assert.match(inquiryWorkspace, /function buildScheduleDraftHandoffNotes\(inquiry: InquiryWorkspaceInquiry\)/);
  assert.match(inquiryWorkspace, /Inquiry handoff context \(private draft\):/);
  assert.match(inquiryWorkspace, /eventDate: inquiry\.eventDate/);
  assert.match(inquiryWorkspace, /location: inquiry\.eventLocation/);
  assert.match(inquiryWorkspace, /Schedule context:/);
  assert.match(inquiryWorkspace, /Treat inquiry details as draft context to confirm, not final schedule truth\./);
  assert.match(inquiryWorkspace, /Next schedule detail: ready time is usually the first missing schedule anchor\./);
  assert.match(inquiryWorkspace, /Nothing sends from this schedule draft and no client link exists\./);
  assert.match(inquiryWorkspace, /notes: buildScheduleDraftHandoffNotes\(inquiry\)/);
});

test("Inquiry Workspace frames create/open schedule as a private handoff, not a final schedule", () => {
  assert.match(inquiryWorkspace, /No private schedule coordination draft is linked to this inquiry yet\./);
  assert.match(inquiryWorkspace, /Create a private draft with the inquiry date, venue, service context, and notes carried over as context to confirm\./);
  assert.match(inquiryWorkspace, /Missing schedule details are still expected; ready time is usually the next anchor\./);
  assert.match(inquiryWorkspace, /Nothing sends and no client link exists\./);
  assert.match(inquiryWorkspace, /Confirm inquiry context in the schedule builder before treating it as final\./);
});

test("Schedule Draft Builder shows inquiry handoff context as private draft context", () => {
  assert.match(scheduleBuilder, /inquiryId\?: string \| null/);
  assert.match(scheduleBuilder, /const isInquiryHandoffDraft = Boolean\(draftQuery\.data\?\.inquiryId\)/);
  assert.match(scheduleBuilder, /data-testid="section-inquiry-schedule-handoff"/);
  assert.match(scheduleBuilder, /Inquiry schedule handoff/);
  assert.match(scheduleBuilder, /This private draft was opened from an inquiry\./);
  assert.match(scheduleBuilder, /draft context to confirm, not final schedule truth/);
  assert.match(scheduleBuilder, /Private draft/);
  assert.match(scheduleBuilder, /ready time is usually the next key schedule detail/);
  assert.match(scheduleBuilder, /Nothing sends from this draft and no client link exists\./);
});

test("handoff stays on existing owner-scoped schedule draft routes", () => {
  assert.match(routesSource, /app\.post\("\/api\/schedule-drafts", isAuthenticated/);
  assert.match(routesSource, /const inquiry = await storage\.getInquiry\(inquiryId\);/);
  assert.match(routesSource, /inquiry\.vendorId !== userId && !isAdmin/);
  assert.doesNotMatch(inquiryWorkspace + scheduleBuilder, /\/api\/schedule-drafts\/handoff|\/api\/inquiries\/[^"`']+\/schedule-handoff/);
  assert.doesNotMatch(inquiryWorkspace + scheduleBuilder, /drizzle|pgTable|migrations?|ALTER TABLE|CREATE TABLE/);
});

test("handoff does not add sends, client links, contracts, payments, uploads, or AI scheduling", () => {
  assert.doesNotMatch(handoffSources, /sendEmail|sendSMS|sendInfoSheetEmail|sendGeneralEmail|\/api\/sms|\/api\/emails?/);
  assert.doesNotMatch(handoffSources, /\/api\/inquiry-responses|\/api\/inquiries\/[^"`']+\/responses|composer mutation/i);
  assert.doesNotMatch(handoffSources, /ObjectUploader|\/api\/objects|upload/);
  assert.doesNotMatch(handoffSources, /\/api\/contracts|\/api\/square|\/api\/payments?|Square|payment/i);
  assert.doesNotMatch(handoffSources, /scheduleAI|processScheduleChat|aiChat|\/api\/schedule-ai/);
  assert.doesNotMatch(handoffSources, /public schedule|client link created|create client link/i);
});
