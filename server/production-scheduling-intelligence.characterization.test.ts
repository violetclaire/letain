import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const intelligenceSource = readFileSync("shared/schedulingIntelligence.ts", "utf8");
const builderSource = readFileSync("client/src/pages/ScheduleDraftBuilder.tsx", "utf8");
const routesSource = readFileSync("server/routes.ts", "utf8");
const schemaSource = readFileSync("shared/schema.ts", "utf8");

test("pasted request intake extracts production-relevant people, services, constraints, and quote-only requests", () => {
  assert.match(intelligenceSource, /export function parseScheduleRequest/);
  assert.match(intelligenceSource, /confirmedPeople/);
  assert.match(intelligenceSource, /optionalPeople/);
  assert.match(intelligenceSource, /language_support/);
  assert.match(intelligenceSource, /stay_near/);
  assert.match(intelligenceSource, /quoteOnlyRequests/);
  assert.match(intelligenceSource, /timingRequiredBeforeScheduling: true/);
  assert.match(builderSource, /data-testid="section-request-intake"/);
  assert.match(builderSource, /data-testid="list-confirmed-people"/);
  assert.match(builderSource, /data-testid="list-optional-people"/);
  assert.match(builderSource, /data-testid="section-quote-only-scenarios"/);
});

test("missing production variables are questions and are not silently guessed", () => {
  for (const prompt of [
    "What is the ready time?",
    "How many artists are needed for this event?",
    "Who is the lead artist?",
    "Is the bride or primary client assigned to the lead artist?",
    "Are any service blocks fixed at a specific artist and time?",
    "Should optional people stay as quote add-ons or be included in this schedule?",
    "Should touchups remain quote-only, or is there a fixed time and duration to schedule?",
  ]) {
    assert.match(intelligenceSource, new RegExp(prompt.replace(/[?]/g, "\\?")));
  }
  assert.match(intelligenceSource, /Answer the production questions before generating a schedule\. Briarwood will not guess missing timing or authority\./);
  assert.match(builderSource, /data-testid="section-production-questions"/);
});

test("artist-specific timings and reusable defaults remain editable per event", () => {
  assert.match(intelligenceSource, /export type ProviderServiceDurations/);
  assert.match(intelligenceSource, /primaryClient/);
  assert.match(intelligenceSource, /durationForProvider/);
  assert.match(builderSource, /Durations belong to each artist, not to the service globally\./);
  assert.match(builderSource, /data-testid={`input-provider-\$\{p\.id\}-\$\{field\.id\}-minutes`}/);
  assert.match(builderSource, /data-testid="button-save-schedule-defaults"/);
  assert.match(builderSource, /data-testid="button-load-schedule-defaults"/);
  assert.match(routesSource, /app\.get\("\/api\/vendor\/schedule-defaults", isAuthenticated/);
  assert.match(routesSource, /app\.patch\("\/api\/vendor\/schedule-defaults", isAuthenticated/);
  assert.match(schemaSource, /scheduleDefaults\?: ScheduleOperatorDefaults/);
  assert.match(schemaSource, /serviceDurations\?: ProviderServiceDurations/);
});

test("production output is independent horizontal artist lanes without invented staff, gaps, or buffers", () => {
  assert.match(intelligenceSource, /export function generateProductionSchedule/);
  assert.match(intelligenceSource, /providerCursor/);
  assert.match(intelligenceSource, /personCursor/);
  assert.match(intelligenceSource, /fixedBlocks/);
  assert.match(builderSource, /Each artist column is an independent timeline/);
  assert.match(builderSource, /grid-flow-col auto-cols-\[minmax\(270px,1fr\)\]/);
  assert.match(builderSource, /data-testid="preview-artist-columns"/);
  assert.match(builderSource, /it never adds staff automatically/);
  assert.match(intelligenceSource, /allowUnrequestedBuffers: false/);
  assert.match(builderSource, /if \(!usesProductionRequest\) \{\s+for \(const provider of providerNames\)/);
  assert.match(builderSource, /setupBlocks\.length === 0 && !usesProductionRequest/);
});

test("touchups, optional people, and fixed blocks remain operator decisions", () => {
  assert.match(builderSource, /data-testid="select-optional-people-mode"/);
  assert.match(builderSource, /data-testid="select-touchup-mode"/);
  assert.match(builderSource, /data-testid="checkbox-fixed-blocks-reviewed"/);
  assert.match(builderSource, /data-testid={`checkbox-fixed-row-\$\{row\.id\}`}/);
  assert.match(builderSource, /Not placed on the schedule without a fixed time and duration\./);
  assert.match(intelligenceSource, /Touchups remain outside the schedule until a fixed touchup time and duration are entered\./);
});

test("the scheduling intelligence layer stays private and does not introduce action systems", () => {
  const scopedSource = intelligenceSource + builderSource;
  assert.doesNotMatch(scopedSource, /GoogleGenAI|OpenAI|chat\.completions|responses\.create|\/assess/);
  assert.doesNotMatch(scopedSource, /\/api\/schedule\/parse-clients|\/api\/schedule\/voice-command|scheduleAI/);
  assert.doesNotMatch(scopedSource, /sendEmail|sendSMS|sendInfoSheetEmail|\/api\/emails?|\/api\/sms/);
  assert.doesNotMatch(scopedSource, /\/api\/contracts|\/api\/square|\/api\/payments?|createClientLink/);
  assert.match(builderSource, /It does not send, contact anyone, create contracted work, or publish a schedule\./);
  assert.match(routesSource, /status limited to 'draft'/);
});
