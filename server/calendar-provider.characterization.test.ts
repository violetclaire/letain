import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("calendar provider abstraction remains a single getCalendarClient contract", async () => {
  const providerText = await readFile(new URL("./calendar/provider.ts", import.meta.url), "utf8");

  assert.match(providerText, /export interface CalendarProvider/);
  assert.match(providerText, /getCalendarClient\(\): Promise<calendar_v3\.Calendar>/);
});

test("Replit calendar provider remains the current default provider", async () => {
  const [replitProviderText, defaultProviderText] = await Promise.all([
    readFile(new URL("./calendar/replitProvider.ts", import.meta.url), "utf8"),
    readFile(new URL("./calendar/defaultProvider.ts", import.meta.url), "utf8"),
  ]);

  assert.match(replitProviderText, /export class ReplitCalendarProvider implements CalendarProvider/);
  assert.match(replitProviderText, /const defaultCalendarProvider = new ReplitCalendarProvider\(\);/);
  assert.match(replitProviderText, /export function getDefaultReplitCalendarProvider\(\): CalendarProvider/);
  assert.match(replitProviderText, /export function getDefaultCalendarProvider\(\): CalendarProvider/);
  assert.match(replitProviderText, /return getDefaultReplitCalendarProvider\(\);/);
  assert.match(defaultProviderText, /env\.CALENDAR_PROVIDER \|\| "replit"/);
  assert.match(defaultProviderText, /createReplitProvider = getDefaultReplitCalendarProvider/);
  assert.match(defaultProviderText, /return createReplitProvider\(\);/);
});

test("calendar provider selector supports direct opt-in but keeps Replit as default", async () => {
  const defaultProviderText = await readFile(new URL("./calendar/defaultProvider.ts", import.meta.url), "utf8");

  assert.match(defaultProviderText, /export type CalendarProviderName = "replit" \| "direct"/);
  assert.match(defaultProviderText, /const configuredProvider = \(env\.CALENDAR_PROVIDER \|\| "replit"\)\.trim\(\)\.toLowerCase\(\);/);
  assert.match(defaultProviderText, /configuredProvider === "replit" \|\| configuredProvider === "direct"/);
  assert.match(defaultProviderText, /Unsupported CALENDAR_PROVIDER/);
  assert.match(defaultProviderText, /if \(providerName === "direct"\) \{[\s\S]*?validateDirectCalendarProviderEnv\(env\);[\s\S]*?return createDirectProvider\(\);/);
  assert.match(defaultProviderText, /Direct calendar provider requires token storage and OAuth runtime wiring before it can be selected/);
  assert.match(defaultProviderText, /cachedProviderName === providerName/);
});

test("direct calendar selector config fails clearly when required OAuth env is missing", async () => {
  const defaultProviderText = await readFile(new URL("./calendar/defaultProvider.ts", import.meta.url), "utf8");

  assert.match(defaultProviderText, /GOOGLE_CALENDAR_CLIENT_ID/);
  assert.match(defaultProviderText, /GOOGLE_CALENDAR_CLIENT_SECRET/);
  assert.match(defaultProviderText, /GOOGLE_CALENDAR_REDIRECT_URI/);
  assert.match(defaultProviderText, /GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY/);
  assert.match(defaultProviderText, /Direct calendar provider requires Google Calendar OAuth env config:/);
  assert.match(defaultProviderText, /missing\.join\(", "\)/);
});

test("current calendar provider still reads Google Calendar credentials from Replit connectors", async () => {
  const replitProviderText = await readFile(new URL("./calendar/replitProvider.ts", import.meta.url), "utf8");

  assert.match(replitProviderText, /process\.env\.REPLIT_CONNECTORS_HOSTNAME/);
  assert.match(replitProviderText, /process\.env\.REPL_IDENTITY/);
  assert.match(replitProviderText, /process\.env\.WEB_REPL_RENEWAL/);
  assert.match(replitProviderText, /X_REPLIT_TOKEN: xReplitToken/);
  assert.match(replitProviderText, /connector_names=google-calendar/);
  assert.match(replitProviderText, /connectionSettings\?\.settings\?\.access_token/);
  assert.match(replitProviderText, /connectionSettings\?\.settings\?\.oauth\?\.credentials\?\.access_token/);
  assert.match(replitProviderText, /throw new Error\("Google Calendar not connected"\)/);
});

test("Google Calendar service and client use the selector instead of importing direct or Replit providers directly", async () => {
  const [serviceText, clientText, defaultProviderText] = await Promise.all([
    readFile(new URL("./googleCalendarService.ts", import.meta.url), "utf8"),
    readFile(new URL("./googleCalendarClient.ts", import.meta.url), "utf8"),
    readFile(new URL("./calendar/defaultProvider.ts", import.meta.url), "utf8"),
  ]);

  assert.match(serviceText, /import \{ getDefaultCalendarProvider \} from '\.\/calendar\/defaultProvider';/);
  assert.match(clientText, /import \{ getDefaultCalendarProvider \} from '\.\/calendar\/defaultProvider';/);
  assert.match(serviceText, /return getDefaultCalendarProvider\(\)\.getCalendarClient\(\);/);
  assert.match(clientText, /return getDefaultCalendarProvider\(\)\.getCalendarClient\(\);/);
  assert.doesNotMatch(serviceText, /directProvider|replitProvider/);
  assert.doesNotMatch(clientText, /directProvider|replitProvider/);
  assert.match(defaultProviderText, /createReplitProvider = getDefaultReplitCalendarProvider/);
});

test("current availability fallback behavior stays documented in source", async () => {
  const serviceText = await readFile(new URL("./googleCalendarService.ts", import.meta.url), "utf8");

  assert.match(serviceText, /catch \(error\) \{[\s\S]*?console\.error\('\[Google Calendar\] Error fetching busy times:', error\);[\s\S]*?return \[\];/);
  assert.match(serviceText, /calendar\.freebusy\.query\(\{[\s\S]*?id: 'primary'/);
});

test("direct Google Calendar OAuth plan stays documentation-only in this PR", async () => {
  const [
    routesText,
    replitProviderText,
    serviceText,
    clientText,
    docsText,
  ] = await Promise.all([
    readFile(new URL("./routes.ts", import.meta.url), "utf8"),
    readFile(new URL("./calendar/replitProvider.ts", import.meta.url), "utf8"),
    readFile(new URL("./googleCalendarService.ts", import.meta.url), "utf8"),
    readFile(new URL("./googleCalendarClient.ts", import.meta.url), "utf8"),
    readFile(new URL("../docs/direct-google-calendar-oauth-plan.md", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(routesText, /\/api\/calendar\/google\/connect/);
  assert.doesNotMatch(routesText, /\/api\/calendar\/google\/callback/);
  assert.doesNotMatch(routesText, /GOOGLE_CALENDAR_CLIENT_ID/);
  assert.doesNotMatch(replitProviderText, /GOOGLE_CALENDAR_CLIENT_ID/);
  assert.doesNotMatch(serviceText, /GOOGLE_CALENDAR_CLIENT_ID/);
  assert.doesNotMatch(clientText, /GOOGLE_CALENDAR_CLIENT_ID/);
  assert.match(docsText, /GOOGLE_CALENDAR_CLIENT_ID/);
  assert.match(docsText, /GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY/);
  assert.match(docsText, /does not change current calendar behavior/);
});
