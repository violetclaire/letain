import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const inquiryWorkspaceSource = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");

function sourceAfter(marker: string, length = 6000): string {
  const start = inquiryWorkspaceSource.indexOf(marker);
  assert.notEqual(start, -1, `${marker} should exist`);
  return inquiryWorkspaceSource.slice(start, start + length);
}

const timelineBuilderSource = sourceAfter("function buildInquiryEventTimeline", 4300);
const timelineCardSource = sourceAfter('data-testid="inquiry-event-timeline-card"', 5000);
const decisionSummarySource = sourceAfter("function buildInquiryDecisionSummary", 6500);

test("Inquiry Workspace renders a private read-only Inquiry Event Timeline v1", () => {
  assert.match(timelineCardSource, /Inquiry Event Timeline/);
  assert.match(timelineCardSource, /Private timeline v1/);
  assert.match(timelineCardSource, /Private and read-only/);
  assert.match(timelineCardSource, /separates recorded events from current read-only states/);
  assert.match(timelineCardSource, /does not send, create routes, contact anyone, create a client link, contract, or payment/);
});

test("timeline uses already-loaded inquiry, readiness, assessment, event, draft, and note data", () => {
  assert.match(timelineBuilderSource, /inquiry: InquiryWorkspaceInquiry/);
  assert.match(timelineBuilderSource, /infoSheetReadinessLabel: string/);
  assert.match(timelineBuilderSource, /routeContactReadinessLabel: string/);
  assert.match(timelineBuilderSource, /permissionAssessment: CoordinationAssessmentSummary \| null/);
  assert.match(timelineBuilderSource, /coordinationEvents: CoordinationEventSummary\[\]/);
  assert.match(timelineBuilderSource, /scheduleDraft: ScheduleDraft \| null/);
  assert.match(timelineBuilderSource, /internalNote: InternalNote \| null/);
  assert.match(inquiryWorkspaceSource, /coordinationPathDetailQuery\.data\?\.events \?\? \[\]/);
  assert.match(inquiryWorkspaceSource, /scheduleDraft: selectedScheduleDraft/);
  assert.match(inquiryWorkspaceSource, /internalNote: internalNoteQuery\.data\?\.note \?\? null/);
});

test("durable events are distinguished from current read-only states", () => {
  assert.match(inquiryWorkspaceSource, /type InquiryEventTimelineMarker =/);
  for (const marker of ["Recorded event", "Current state", "Read-only signal", "Private review", "Draft linked"]) {
    assert.match(inquiryWorkspaceSource, new RegExp(marker));
  }
  assert.match(timelineBuilderSource, /label: "Inquiry received"/);
  assert.match(timelineBuilderSource, /label: infoSheetReadinessLabel/);
  assert.match(timelineBuilderSource, /label: "Route\/contact readiness surfaced"/);
  assert.match(timelineBuilderSource, /label: "Coordination permission assessed"/);
  assert.match(timelineBuilderSource, /label: "Operator review needed"/);
});

test("operator_reviewed appears only as a private review event", () => {
  assert.match(timelineBuilderSource, /event\.eventType === "operator_reviewed"/);
  assert.match(timelineBuilderSource, /marker: "Private review"/);
  assert.match(timelineBuilderSource, /label: "Private operator review recorded"/);
});

test("schedule draft presence appears only as a private draft-linked item", () => {
  assert.match(timelineBuilderSource, /if \(scheduleDraft\)/);
  assert.match(timelineBuilderSource, /marker: "Draft linked"/);
  assert.match(timelineBuilderSource, /label: "Private schedule draft linked"/);
  assert.match(timelineBuilderSource, /Private draft only; no public\/client surface is created/);
});

test("legacy booking, contract, payment, deposit, proposal, and trust scoring timeline language is not the v1 spine", () => {
  assert.doesNotMatch(inquiryWorkspaceSource, /data-testid="coordination-timeline-card"/);
  assert.doesNotMatch(inquiryWorkspaceSource, /function buildTimelineEntries/);
  assert.doesNotMatch(inquiryWorkspaceSource, /function buildTrustTimelineEntries/);
  assert.doesNotMatch(inquiryWorkspaceSource, /\/trust-timeline/);
  assert.doesNotMatch(timelineBuilderSource, /Deposit status recorded|Booking reference present|Contract reference present|Proposal reference present/);
  assert.doesNotMatch(timelineBuilderSource, /CDI|trust score|signalStrength|cdi_behavioral_events/i);
});

test("timeline does not imply approval, route/provider acceptance, sends, contracts, payments, public visibility, or client action", () => {
  assert.doesNotMatch(timelineCardSource, /approval|approved|accepted|route accepted|provider accepted|send approval|contract approval|payment approval/i);
  assert.doesNotMatch(timelineBuilderSource, /route_preflight_accepted|route_preflight_declined|pricing_sent|response_sent|sent response/i);
  assert.doesNotMatch(timelineBuilderSource, /createClientLink|client link created|public schedule|public export/i);
});

test("timeline introduces no backend, assessment, schema, send, upload, contract, payment, AI, or public changes", () => {
  assert.doesNotMatch(inquiryWorkspaceSource, /\/assess`|\/assess"/);
  assert.doesNotMatch(decisionSummarySource, /Inquiry Event Timeline|buildInquiryEventTimeline|inquiryEventTimelineEntries/);
  assert.doesNotMatch(timelineBuilderSource, /fetch\(|useMutation|method: "POST"|method: "PATCH"|method: "PUT"|method: "DELETE"/);
  assert.doesNotMatch(timelineBuilderSource, /pgTable|drizzle|migration|migrations|ALTER TABLE|CREATE TABLE/i);
  assert.doesNotMatch(timelineBuilderSource, /sendEmail|sendSMS|sendInfoSheetEmail|sendGeneralEmail|\/api\/sms|\/api\/emails?/);
  assert.doesNotMatch(timelineBuilderSource, /ObjectUploader|\/api\/objects|uploadURL|getUploadParameters/);
  assert.doesNotMatch(timelineBuilderSource, /\/api\/contracts|\/api\/square|\/api\/payments?|Square/i);
  assert.doesNotMatch(timelineBuilderSource, /scheduleAI|processScheduleChat|aiChat|\/api\/schedule-ai|OpenAI|Anthropic/);
});
