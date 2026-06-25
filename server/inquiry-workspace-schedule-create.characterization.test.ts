import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const inquiryWorkspace = readFileSync("client/src/pages/InquiryWorkspace.tsx", "utf8");
const routesSource = readFileSync("server/routes.ts", "utf8");

test("Inquiry Workspace can create a private schedule draft for the selected inquiry", () => {
  assert.match(inquiryWorkspace, /fetch\("\/api\/schedule-drafts", \{/);
  assert.match(inquiryWorkspace, /method: "POST"/);
  assert.match(inquiryWorkspace, /inquiryId: inquiry\.id/);
  assert.doesNotMatch(inquiryWorkspace, /contractId: hasText\(inquiry\.convertedToContractId\)/);
  assert.doesNotMatch(inquiryWorkspace, /bookingId: hasText\(inquiry\.convertedToBookingId\)/);
  assert.match(inquiryWorkspace, /title: `\$\{titleParts\.join\(" - "\)\} schedule coordination draft`/);
  assert.match(inquiryWorkspace, /eventDate: inquiry\.eventDate/);
  assert.match(inquiryWorkspace, /location: inquiry\.eventLocation/);
  assert.match(inquiryWorkspace, /notes: buildScheduleDraftHandoffNotes\(inquiry\)/);
  assert.match(inquiryWorkspace, /data-testid="button-create-schedule-draft"/);
  assert.match(inquiryWorkspace, /Create schedule draft/);
});

test("Inquiry Workspace opens an existing linked draft instead of creating another one", () => {
  assert.match(inquiryWorkspace, /fetch\(`\/api\/schedule-drafts\/by-inquiry\/\$\{encodeURIComponent\(selectedInquiryId\)\}`/);
  assert.match(inquiryWorkspace, /const selectedScheduleDraft = scheduleDraftQuery\.data \?\? null/);
  assert.match(inquiryWorkspace, /const scheduleDraftHref = selectedScheduleDraft\?\.id && artistSlug/);
  assert.match(inquiryWorkspace, /data-testid="link-open-schedule-draft"/);
  assert.match(inquiryWorkspace, /Open schedule draft/);
});

test("schedule draft creation remains owner-scoped for linked inquiries", () => {
  assert.match(routesSource, /app\.post\("\/api\/schedule-drafts", isAuthenticated/);
  assert.match(routesSource, /const inquiry = await storage\.getInquiry\(inquiryId\);/);
  assert.match(routesSource, /inquiry\.vendorId !== userId && !isAdmin/);
  assert.match(routesSource, /return res\.status\(403\)\.json\(\{ error: "You can only link your own inquiries" \}\);/);
});
