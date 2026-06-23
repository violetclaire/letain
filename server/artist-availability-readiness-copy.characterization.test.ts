import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const availabilityPageSource = readFileSync("client/src/pages/ArtistAvailability.tsx", "utf8");
const availabilityCalendarSource = readFileSync("client/src/components/AvailabilityCalendar.tsx", "utf8");
const routesSource = readFileSync("server/routes.ts", "utf8");
const schemaSource = readFileSync("shared/schema.ts", "utf8");

const touchedFrontendSource = `${availabilityPageSource}\n${availabilityCalendarSource}`;

test("artist availability setup is framed as inquiry readiness", () => {
  assert.match(availabilityPageSource, /Availability readiness/);
  assert.match(
    availabilityPageSource,
    /inquiry readiness checks can flag conflicts before you respond/,
  );
  assert.match(availabilityPageSource, /Confirmed commitment - work already occupies the date/);
  assert.match(availabilityPageSource, /Held inquiry - inquiry on hold/);
  assert.match(availabilityPageSource, /Unavailable - blocked for new inquiries/);
  assert.match(availabilityPageSource, /Feed Inquiry Readiness/);
  assert.match(
    availabilityPageSource,
    /requested date is clear before you draft a response/,
  );
});

test("availability calendar visible copy avoids booking-first framing", () => {
  assert.match(availabilityCalendarSource, /Availability readiness/);
  assert.match(availabilityCalendarSource, /Available for inquiry/);
  assert.match(availabilityCalendarSource, /Unavailable/);
  assert.match(availabilityCalendarSource, /Confirmed commitment/);
  assert.match(
    availabilityCalendarSource,
    /Click to cycle: Available, Unavailable, Confirmed commitment/,
  );
  assert.match(availabilityCalendarSource, /Click an available date to start an inquiry/);
  assert.match(availabilityCalendarSource, /confirmed commitment\. Manage the linked record before changing readiness/);
  assert.doesNotMatch(availabilityCalendarSource, /Request to Book/);
  assert.doesNotMatch(availabilityCalendarSource, /Click an available date to request booking/);
  assert.doesNotMatch(availabilityCalendarSource, /Marked as booked/);
});

test("availability readiness uses existing availability schema and routes", () => {
  assert.match(schemaSource, /export const availability = pgTable\("availability"/);
  assert.match(schemaSource, /isAvailable: boolean\("is_available"\)/);
  assert.match(schemaSource, /notes: text\("notes"\)/);

  assert.match(routesSource, /app\.post\("\/api\/availability"/);
  assert.match(routesSource, /app\.get\("\/api\/availability\/:userId"/);
  assert.match(routesSource, /app\.delete\("\/api\/availability"/);
  assert.match(routesSource, /app\.get\("\/api\/availability\/:userId\/check"/);
});

test("availability readiness copy does not introduce external-effect flows", () => {
  assert.doesNotMatch(touchedFrontendSource, /\/api\/square/i);
  assert.doesNotMatch(touchedFrontendSource, /\/api\/payments/i);
  assert.doesNotMatch(touchedFrontendSource, /\/api\/contracts/i);
  assert.doesNotMatch(touchedFrontendSource, /\/api\/inquiry-responses\/[^"`']+\/send/);
  assert.doesNotMatch(touchedFrontendSource, /sendGeneralEmail|sendSms|sendSMS/);
  assert.doesNotMatch(touchedFrontendSource, /createPayment|createContract/);
});

test("availability readiness copy avoids score, ranking, and reputation language", () => {
  assert.doesNotMatch(touchedFrontendSource, /trust_score|provider_score|trustScore|providerScore/);
  assert.doesNotMatch(
    touchedFrontendSource,
    /person score|provider score|trust score|reputation|ranking|paid placement/i,
  );
});
