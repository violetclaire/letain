import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  DirectGoogleCalendarProvider,
  validateDirectGoogleCalendarCredentials,
} from "./calendar/directProvider.ts";

function credentials(overrides = {}) {
  return {
    operatorId: "operator-a",
    accessToken: "access-token-a",
    refreshToken: "refresh-token-a",
    expiryDate: Date.parse("2026-10-25T12:00:00.000Z"),
    calendarId: "primary",
    ...overrides,
  };
}

function createMockCalendar() {
  const freebusyCalls = [];
  const eventInsertCalls = [];
  const calendar = {
    freebusy: {
      async query(request) {
        freebusyCalls.push(request);
        return {
          data: {
            calendars: {
              primary: {
                busy: [
                  {
                    start: "2026-10-25T16:00:00.000Z",
                    end: "2026-10-25T17:30:00.000Z",
                  },
                ],
              },
              team: {
                busy: [
                  {
                    start: "2026-10-25T18:00:00.000Z",
                    end: "2026-10-25T19:00:00.000Z",
                  },
                ],
              },
            },
          },
        };
      },
    },
    events: {
      async insert(request) {
        eventInsertCalls.push(request);
        return {
          data: {
            id: "event-123",
            htmlLink: "https://calendar.google.com/calendar/event?eid=event-123",
          },
        };
      },
    },
  };

  return {
    calendar,
    freebusyCalls,
    eventInsertCalls,
  };
}

test("direct Google Calendar provider requires owner-scoped credentials", () => {
  assert.throws(
    () => new DirectGoogleCalendarProvider(),
    /must be scoped to an operator/,
  );
  assert.throws(
    () => validateDirectGoogleCalendarCredentials({
      accessToken: "access-token-a",
      refreshToken: "refresh-token-a",
    }),
    /must be scoped to an operator/,
  );
  assert.throws(
    () => validateDirectGoogleCalendarCredentials({
      operatorId: "operator-a",
    }),
    /require an access token or refresh token/,
  );
});

test("direct Google Calendar provider refreshes expired credentials before creating a client", async () => {
  const refreshCalls = [];
  const createCalendarClientCalls = [];
  const { calendar } = createMockCalendar();
  const provider = new DirectGoogleCalendarProvider({
    credentials: credentials({
      accessToken: "expired-access-token",
      expiryDate: Date.parse("2026-10-25T09:59:00.000Z"),
    }),
    now: () => Date.parse("2026-10-25T09:59:30.000Z"),
    async refreshCredentials(currentCredentials) {
      refreshCalls.push(currentCredentials);
      return {
        ...currentCredentials,
        accessToken: "fresh-access-token",
        expiryDate: Date.parse("2026-10-25T11:00:00.000Z"),
      };
    },
    createCalendarClient(currentCredentials) {
      createCalendarClientCalls.push(currentCredentials);
      return calendar;
    },
  });

  await provider.getCalendarClient();

  assert.equal(refreshCalls.length, 1);
  assert.equal(refreshCalls[0].operatorId, "operator-a");
  assert.equal(refreshCalls[0].refreshToken, "refresh-token-a");
  assert.equal(createCalendarClientCalls.length, 1);
  assert.equal(createCalendarClientCalls[0].accessToken, "fresh-access-token");
});

test("direct Google Calendar provider fails clearly when credentials cannot produce a usable client", async () => {
  const provider = new DirectGoogleCalendarProvider({
    credentials: credentials({
      accessToken: null,
      refreshToken: "refresh-token-a",
    }),
  });

  await assert.rejects(
    provider.getCalendarClient(),
    /missing a usable access token/,
  );
});

test("direct Google Calendar provider fetches busy slots through the injected calendar client", async () => {
  const { calendar, freebusyCalls } = createMockCalendar();
  const provider = new DirectGoogleCalendarProvider({
    credentials: credentials({ calendarId: "team" }),
    createCalendarClient: () => calendar,
  });

  const busySlots = await provider.getBusySlots(
    new Date("2026-10-25T15:00:00.000Z"),
    new Date("2026-10-25T21:00:00.000Z"),
  );

  assert.deepEqual(freebusyCalls, [
    {
      requestBody: {
        timeMin: "2026-10-25T15:00:00.000Z",
        timeMax: "2026-10-25T21:00:00.000Z",
        items: [{ id: "team" }],
      },
    },
  ]);
  assert.deepEqual(busySlots, [
    {
      start: new Date("2026-10-25T18:00:00.000Z"),
      end: new Date("2026-10-25T19:00:00.000Z"),
    },
  ]);
});

test("direct Google Calendar provider can create events through the injected calendar client", async () => {
  const { calendar, eventInsertCalls } = createMockCalendar();
  const provider = new DirectGoogleCalendarProvider({
    credentials: credentials(),
    createCalendarClient: () => calendar,
  });

  const result = await provider.createEvent({
    title: "Briarwood Trial",
    description: "Internal calendar provider contract test",
    location: "Studio",
    startTime: new Date("2026-10-25T16:00:00.000Z"),
    endTime: new Date("2026-10-25T17:00:00.000Z"),
    attendeeEmail: "client@example.com",
  });

  assert.deepEqual(result, {
    eventId: "event-123",
    eventLink: "https://calendar.google.com/calendar/event?eid=event-123",
  });
  assert.deepEqual(eventInsertCalls, [
    {
      calendarId: "primary",
      requestBody: {
        summary: "Briarwood Trial",
        description: "Internal calendar provider contract test",
        location: "Studio",
        start: {
          dateTime: "2026-10-25T16:00:00.000Z",
          timeZone: "America/Los_Angeles",
        },
        end: {
          dateTime: "2026-10-25T17:00:00.000Z",
          timeZone: "America/Los_Angeles",
        },
        attendees: [{ email: "client@example.com" }],
      },
    },
  ]);
});

test("direct Google Calendar provider remains a non-default skeleton in this PR", async () => {
  const [
    replitProviderText,
    serviceText,
    clientText,
    routesText,
    directProviderText,
    docsText,
  ] = await Promise.all([
    readFile(new URL("./calendar/replitProvider.ts", import.meta.url), "utf8"),
    readFile(new URL("./googleCalendarService.ts", import.meta.url), "utf8"),
    readFile(new URL("./googleCalendarClient.ts", import.meta.url), "utf8"),
    readFile(new URL("./routes.ts", import.meta.url), "utf8"),
    readFile(new URL("./calendar/directProvider.ts", import.meta.url), "utf8"),
    readFile(new URL("../docs/direct-google-calendar-oauth-plan.md", import.meta.url), "utf8"),
  ]);

  assert.match(replitProviderText, /const defaultCalendarProvider = new ReplitCalendarProvider\(\);/);
  assert.match(serviceText, /from '\.\/calendar\/replitProvider';/);
  assert.match(clientText, /from '\.\/calendar\/replitProvider';/);
  assert.doesNotMatch(serviceText, /directProvider/);
  assert.doesNotMatch(clientText, /directProvider/);
  assert.doesNotMatch(routesText, /\/api\/calendar\/google\/connect/);
  assert.doesNotMatch(routesText, /\/api\/calendar\/google\/callback/);
  assert.match(directProviderText, /export class DirectGoogleCalendarProvider implements CalendarProvider/);
  assert.doesNotMatch(directProviderText, /getDefaultCalendarProvider/);
  assert.match(docsText, /Tokens must be owner-scoped by `operatorId`/);
  assert.match(docsText, /Verify expired access tokens refresh through the stored refresh token/);
});
