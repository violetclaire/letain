import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { afterEach, before, mock, test } from "node:test";
import type { Express, Request, Response } from "express";

type Handler = (req: Request, res: Response) => unknown | Promise<unknown>;
type RouteRecord = {
  method: string;
  path: string;
  handlers: Handler[];
};

let postAvailabilityHandler: Handler;
let deleteAvailabilityHandler: Handler;
let checkAvailabilityHandler: Handler;
let analyzeInquiryAvailability: (
  operatorId: string,
  eventDate: Date | null | undefined,
  currentInquiryId?: string | null,
) => Promise<any>;
let getVendorBusyTimes: (
  userId: string,
  startDate: Date,
  endDate: Date,
) => Promise<{ start: Date; end: Date }[]>;
let storage: any;

function oidcDiscoveryDocument() {
  return {
    issuer: "https://replit.com/oidc",
    authorization_endpoint: "https://replit.com/oidc/auth",
    token_endpoint: "https://replit.com/oidc/token",
    jwks_uri: "https://replit.com/oidc/jwks",
    userinfo_endpoint: "https://replit.com/oidc/userinfo",
    end_session_endpoint: "https://replit.com/oidc/logout",
    response_types_supported: ["code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "email", "profile", "offline_access"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post", "none"],
    claims_supported: ["sub", "email", "first_name", "last_name", "profile_image_url"],
    code_challenge_methods_supported: ["S256"],
  };
}

function createRecordingApp(): Express & { routes: RouteRecord[] } {
  const routes: RouteRecord[] = [];
  const app = (() => undefined) as any;

  app.routes = routes;
  app.set = () => app;
  app.use = () => app;

  for (const method of ["get", "post", "put", "patch", "delete", "options", "all"]) {
    app[method] = (path: string, ...handlers: Handler[]) => {
      routes.push({ method, path, handlers });
      return app;
    };
  }

  return app;
}

function createResponse() {
  let statusCode = 200;
  let body: unknown;

  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(payload: unknown) {
      body = payload;
      return res;
    },
  };

  return {
    res,
    result() {
      return { statusCode, body };
    },
  };
}

async function invoke(handler: Handler, reqOverrides: Record<string, unknown> = {}) {
  const { res, result } = createResponse();
  const req = {
    body: {},
    headers: {},
    params: {},
    query: {},
    session: {},
    user: undefined,
    ...reqOverrides,
  };

  await handler(req as Request, res as unknown as Response);
  return result();
}

before(async () => {
  process.env.NODE_ENV = "test";
  process.env.SESSION_SECRET = "calendar-availability-characterization-test";
  process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/calendar_availability_characterization_test";
  process.env.REPL_ID = "calendar-availability-characterization-test";
  process.env.ISSUER_URL = "https://replit.com/oidc";

  mock.method(globalThis, "setInterval", () => ({ unref() {} }) as unknown as NodeJS.Timeout);
  mock.method(globalThis, "fetch", async () => new Response(JSON.stringify(oidcDiscoveryDocument()), {
    status: 200,
    headers: { "content-type": "application/json" },
  }));

  const [routesModule, storageModule, assistantModule, googleCalendarModule] = await Promise.all([
    import("./routes"),
    import("./storage"),
    import("./assistantService"),
    import("./googleCalendarService"),
  ]);

  storage = storageModule.storage;
  analyzeInquiryAvailability = assistantModule.analyzeInquiryAvailability;
  getVendorBusyTimes = googleCalendarModule.getVendorBusyTimes;

  const app = createRecordingApp();
  await routesModule.registerRoutes(app);

  const postRoute = app.routes.find((record) => record.method === "post" && record.path === "/api/availability");
  assert.ok(postRoute, "POST /api/availability should be registered");
  postAvailabilityHandler = postRoute.handlers.at(-1) as Handler;

  const deleteRoute = app.routes.find((record) => record.method === "delete" && record.path === "/api/availability");
  assert.ok(deleteRoute, "DELETE /api/availability should be registered");
  deleteAvailabilityHandler = deleteRoute.handlers.at(-1) as Handler;

  const checkRoute = app.routes.find((record) => record.method === "get" && record.path === "/api/availability/:userId/check");
  assert.ok(checkRoute, "GET /api/availability/:userId/check should be registered");
  checkAvailabilityHandler = checkRoute.handlers.at(-1) as Handler;
});

afterEach(() => {
  mock.restoreAll();
});

function stubAvailabilityRouteStorage() {
  const calls = {
    getArtistProfileByEditToken: [] as string[],
    setAvailability: [] as any[],
    deleteAvailability: [] as Array<[string, string]>,
    checkAvailability: [] as Array<[string, string]>,
  };

  mock.method(storage, "getArtistProfileByEditToken", async (token: string) => {
    calls.getArtistProfileByEditToken.push(token);
    if (token === "valid-edit-token") {
      return { userId: "artist-from-token", artistSlug: "violet" };
    }
    return undefined;
  });

  mock.method(storage, "setAvailability", async (availability: any) => {
    calls.setAvailability.push(availability);
    return { id: "availability-row", ...availability };
  });

  mock.method(storage, "deleteAvailability", async (userId: string, date: Date) => {
    calls.deleteAvailability.push([userId, date.toISOString()]);
  });

  mock.method(storage, "checkAvailability", async (userId: string, date: Date) => {
    calls.checkAvailability.push([userId, date.toISOString()]);
    return userId !== "blocked-artist";
  });

  return calls;
}

function stubAssistantAvailabilityStorage(overrides: {
  blocked?: any;
  contracts?: any[];
  bookings?: any[];
  inquiries?: any[];
  checkAvailability?: boolean;
  throwContracts?: boolean;
} = {}) {
  const calls = {
    getBlockedDateForArtist: [] as Array<[string, string]>,
    getContractsByArtist: [] as string[],
    getBookingsByArtist: [] as string[],
    getInquiriesByVendor: [] as string[],
    checkAvailability: [] as Array<[string, string]>,
  };

  mock.method(storage, "getBlockedDateForArtist", async (operatorId: string, dateStr: string) => {
    calls.getBlockedDateForArtist.push([operatorId, dateStr]);
    return overrides.blocked ?? undefined;
  });

  mock.method(storage, "getContractsByArtist", async (operatorId: string) => {
    calls.getContractsByArtist.push(operatorId);
    if (overrides.throwContracts) {
      throw new Error("contracts unavailable");
    }
    return overrides.contracts ?? [];
  });

  mock.method(storage, "getBookingsByArtist", async (operatorId: string) => {
    calls.getBookingsByArtist.push(operatorId);
    return overrides.bookings ?? [];
  });

  mock.method(storage, "getInquiriesByVendor", async (operatorId: string) => {
    calls.getInquiriesByVendor.push(operatorId);
    return overrides.inquiries ?? [];
  });

  mock.method(storage, "checkAvailability", async (operatorId: string, date: Date) => {
    calls.checkAvailability.push([operatorId, date.toISOString()]);
    return overrides.checkAvailability ?? true;
  });

  return calls;
}

test("availability source keeps current no-record means available storage behavior", async () => {
  const [
    routesText,
    storageText,
    assistantText,
    googleCalendarText,
    googleCalendarClientText,
    replitProviderText,
    schemaText,
  ] = await Promise.all([
    readFile(new URL("./routes.ts", import.meta.url), "utf8"),
    readFile(new URL("./storage.ts", import.meta.url), "utf8"),
    readFile(new URL("./assistantService.ts", import.meta.url), "utf8"),
    readFile(new URL("./googleCalendarService.ts", import.meta.url), "utf8"),
    readFile(new URL("./googleCalendarClient.ts", import.meta.url), "utf8"),
    readFile(new URL("./calendar/replitProvider.ts", import.meta.url), "utf8"),
    readFile(new URL("../shared/schema.ts", import.meta.url), "utf8"),
  ]);

  assert.match(routesText, /app\.get\("\/api\/availability\/:userId\/check", async \(req, res\) => \{[\s\S]*?storage\.checkAvailability\(req\.params\.userId, checkDate\)/);
  assert.match(routesText, /app\.post\("\/api\/availability", async \(req: Request, res: Response\) => \{[\s\S]*?userId = getAuthUserId\(req\);[\s\S]*?date: new Date\(req\.body\.date\)[\s\S]*?storage\.setAvailability\(data\)/);
  assert.match(routesText, /app\.delete\("\/api\/availability", async \(req: Request, res: Response\) => \{[\s\S]*?userId = getAuthUserId\(req\);[\s\S]*?storage\.deleteAvailability\(userId, new Date\(date\)\)/);
  assert.match(storageText, /async checkAvailability\(userId: string, date: Date\): Promise<boolean> \{[\s\S]*?if \(result\.length === 0\) return true;[\s\S]*?return result\[0\]\.isAvailable;/);
  assert.match(storageText, /async setAvailability\(avail: InsertAvailability\): Promise<Availability> \{[\s\S]*?eq\(availability\.userId, avail\.userId\)[\s\S]*?gte\(availability\.date, startOfDay\)[\s\S]*?lte\(availability\.date, endOfDay\)/);
  assert.match(assistantText, /const signedContract = contractMatches\.find[\s\S]*?"booked_by_contract"[\s\S]*?const activeBooking = sameDayBookings\.find[\s\S]*?"operator_unavailable"[\s\S]*?blocked_on_calendar[\s\S]*?const available = await storage\.checkAvailability\(operatorId, eventDate\)/);
  assert.match(googleCalendarText, /import \{ getDefaultCalendarProvider \} from '\.\/calendar\/defaultProvider';/);
  assert.match(googleCalendarText, /return getDefaultCalendarProvider\(\)\.getCalendarClient\(\);/);
  assert.match(googleCalendarText, /catch \(error\) \{[\s\S]*?console\.error\('\[Google Calendar\] Error fetching busy times:', error\);[\s\S]*?return \[\];/);
  assert.match(googleCalendarClientText, /import \{ getDefaultCalendarProvider \} from '\.\/calendar\/defaultProvider';/);
  assert.match(googleCalendarClientText, /return getDefaultCalendarProvider\(\)\.getCalendarClient\(\);/);
  assert.match(replitProviderText, /export class ReplitCalendarProvider/);
  assert.match(replitProviderText, /connector_names=google-calendar/);
  assert.match(replitProviderText, /X_REPLIT_TOKEN: xReplitToken/);
  assert.match(schemaText, /export const blockedDates = pgTable\("blocked_dates"[\s\S]*?blockedDate: text\("blocked_date"\)\.notNull\(\)[\s\S]*?reason: text\("reason"\)\.default\("Pending"\)/);
  assert.match(schemaText, /export const contracts = pgTable\("contracts"[\s\S]*?eventDates: text\("event_dates"\)/);
  assert.match(schemaText, /export const availability = pgTable\("availability"[\s\S]*?userId: varchar\("user_id"\)\.notNull\(\)[\s\S]*?date: timestamp\("date"\)\.notNull\(\)[\s\S]*?isAvailable: boolean\("is_available"\)\.notNull\(\)\.default\(true\)/);
});

test("GET /api/availability/:userId/check reports available when storage says available", async () => {
  const calls = stubAvailabilityRouteStorage();

  const result = await invoke(checkAvailabilityHandler, {
    params: { userId: "open-artist" },
    query: { date: "2026-10-25T12:00:00.000Z" },
  });

  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, {
    isAvailable: true,
    date: "2026-10-25T12:00:00.000Z",
  });
  assert.deepEqual(calls.checkAvailability, [["open-artist", "2026-10-25T12:00:00.000Z"]]);
});

test("GET /api/availability/:userId/check reports unavailable when storage says unavailable", async () => {
  const calls = stubAvailabilityRouteStorage();

  const result = await invoke(checkAvailabilityHandler, {
    params: { userId: "blocked-artist" },
    query: { date: "2026-10-25T12:00:00.000Z" },
  });

  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.body, {
    isAvailable: false,
    date: "2026-10-25T12:00:00.000Z",
  });
  assert.deepEqual(calls.checkAvailability, [["blocked-artist", "2026-10-25T12:00:00.000Z"]]);
});

test("POST /api/availability requires session or edit token and scopes writes to that operator", async () => {
  const calls = stubAvailabilityRouteStorage();

  const loggedOut = await invoke(postAvailabilityHandler, {
    body: { date: "2026-10-25", isAvailable: false, notes: "Booked" },
  });
  const sessionResult = await invoke(postAvailabilityHandler, {
    session: { userId: "artist-from-session" },
    body: { date: "2026-10-25", isAvailable: false, notes: "Booked" },
  });
  const tokenResult = await invoke(postAvailabilityHandler, {
    query: { token: "valid-edit-token" },
    body: { date: "2026-10-26", isAvailable: true, notes: "Open" },
  });

  assert.equal(loggedOut.statusCode, 401);
  assert.deepEqual(loggedOut.body, { error: "Not authenticated" });
  assert.equal(sessionResult.statusCode, 200);
  assert.equal(tokenResult.statusCode, 200);
  assert.deepEqual(calls.getArtistProfileByEditToken, ["valid-edit-token"]);
  assert.equal(calls.setAvailability.length, 2);
  assert.equal(calls.setAvailability[0].userId, "artist-from-session");
  assert.equal(calls.setAvailability[0].date.toISOString(), "2026-10-25T00:00:00.000Z");
  assert.equal(calls.setAvailability[0].isAvailable, false);
  assert.equal(calls.setAvailability[1].userId, "artist-from-token");
  assert.equal(calls.setAvailability[1].date.toISOString(), "2026-10-26T00:00:00.000Z");
});

test("DELETE /api/availability requires session or edit token and scopes deletes to that operator", async () => {
  const calls = stubAvailabilityRouteStorage();

  const loggedOut = await invoke(deleteAvailabilityHandler, {
    body: { date: "2026-10-25" },
  });
  const sessionResult = await invoke(deleteAvailabilityHandler, {
    session: { userId: "artist-from-session" },
    body: { date: "2026-10-25" },
  });
  const tokenResult = await invoke(deleteAvailabilityHandler, {
    query: { token: "valid-edit-token" },
    body: { date: "2026-10-26" },
  });

  assert.equal(loggedOut.statusCode, 401);
  assert.deepEqual(loggedOut.body, { error: "Not authenticated" });
  assert.equal(sessionResult.statusCode, 200);
  assert.deepEqual(sessionResult.body, { success: true });
  assert.equal(tokenResult.statusCode, 200);
  assert.deepEqual(tokenResult.body, { success: true });
  assert.deepEqual(calls.getArtistProfileByEditToken, ["valid-edit-token"]);
  assert.deepEqual(calls.deleteAvailability, [
    ["artist-from-session", "2026-10-25T00:00:00.000Z"],
    ["artist-from-token", "2026-10-26T00:00:00.000Z"],
  ]);
});

test("assistant availability analysis reports available when no conflict records exist and calendar check is open", async () => {
  const calls = stubAssistantAvailabilityStorage({ checkAvailability: true });

  const result = await analyzeInquiryAvailability("artist-a", new Date("2026-10-25T12:00:00.000Z"), "current-inquiry");

  assert.equal(result.status, "operator_available");
  assert.equal(result.reason, "No contract, booking, or calendar block found for this date");
  assert.equal(result.evidenceSource, "calendar");
  assert.equal(result.confidence, "high");
  assert.deepEqual(result.suggestedNextActions, ["ACCEPT"]);
  assert.deepEqual(calls.checkAvailability, [["artist-a", "2026-10-25T12:00:00.000Z"]]);
});

test("assistant availability analysis reports unavailable when calendar check is closed", async () => {
  const calls = stubAssistantAvailabilityStorage({ checkAvailability: false });

  const result = await analyzeInquiryAvailability("artist-a", new Date("2026-10-25T12:00:00.000Z"));

  assert.equal(result.status, "operator_unavailable");
  assert.equal(result.reason, "Your calendar shows this date as unavailable");
  assert.equal(result.evidenceSource, "calendar");
  assert.equal(result.confidence, "medium");
  assert.deepEqual(result.suggestedNextActions, ["ROUTE"]);
  assert.deepEqual(calls.checkAvailability, [["artist-a", "2026-10-25T12:00:00.000Z"]]);
});

test("assistant availability analysis gives signed contracts precedence over calendar fallback", async () => {
  const calls = stubAssistantAvailabilityStorage({
    checkAvailability: true,
    contracts: [{ id: "contract-signed", status: "signed", eventDates: "2026-10-25" }],
  });

  const result = await analyzeInquiryAvailability("artist-a", new Date("2026-10-25T12:00:00.000Z"));

  assert.equal(result.status, "booked_by_contract");
  assert.equal(result.reason, "A signed contract already covers this date");
  assert.equal(result.evidenceSource, "contract");
  assert.deepEqual(result.conflictingRecordIds, ["contract-signed"]);
  assert.deepEqual(result.suggestedNextActions, ["ROUTE"]);
  assert.deepEqual(calls.checkAvailability, []);
});

test("assistant availability analysis gives booked blocked dates precedence over calendar fallback", async () => {
  const calls = stubAssistantAvailabilityStorage({
    checkAvailability: true,
    blocked: { id: "blocked-booked", artistId: "artist-a", blockedDate: "2026-10-25", reason: "Booked" },
  });

  const result = await analyzeInquiryAvailability("artist-a", new Date("2026-10-25T12:00:00.000Z"));

  assert.equal(result.status, "blocked_on_calendar");
  assert.equal(result.reason, "This date is marked booked on your calendar");
  assert.equal(result.evidenceSource, "calendar");
  assert.deepEqual(result.conflictingRecordIds, ["blocked-booked"]);
  assert.deepEqual(result.suggestedNextActions, ["ROUTE"]);
  assert.deepEqual(calls.checkAvailability, []);
});

test("assistant availability analysis returns unknown instead of available when evidence sources fail", async () => {
  const calls = stubAssistantAvailabilityStorage({ checkAvailability: true, throwContracts: true });

  const result = await analyzeInquiryAvailability("artist-a", new Date("2026-10-25T12:00:00.000Z"));

  assert.equal(result.status, "unknown");
  assert.equal(result.reason, "Some records could not be checked, so availability is unconfirmed");
  assert.equal(result.evidenceSource, "unknown");
  assert.equal(result.confidence, "low");
  assert.deepEqual(result.suggestedNextActions, ["REVIEW"]);
  assert.deepEqual(calls.checkAvailability, [["artist-a", "2026-10-25T12:00:00.000Z"]]);
});

test("Google Calendar busy lookup returns empty busy list when Replit connector token is unavailable", async () => {
  const previousIdentity = process.env.REPL_IDENTITY;
  const previousRenewal = process.env.WEB_REPL_RENEWAL;
  const previousHostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  delete process.env.REPL_IDENTITY;
  delete process.env.WEB_REPL_RENEWAL;
  delete process.env.REPLIT_CONNECTORS_HOSTNAME;

  try {
    const busyTimes = await getVendorBusyTimes(
      "artist-a",
      new Date("2026-10-25T09:00:00.000Z"),
      new Date("2026-10-25T17:00:00.000Z"),
    );

    assert.deepEqual(busyTimes, []);
  } finally {
    if (previousIdentity === undefined) {
      delete process.env.REPL_IDENTITY;
    } else {
      process.env.REPL_IDENTITY = previousIdentity;
    }
    if (previousRenewal === undefined) {
      delete process.env.WEB_REPL_RENEWAL;
    } else {
      process.env.WEB_REPL_RENEWAL = previousRenewal;
    }
    if (previousHostname === undefined) {
      delete process.env.REPLIT_CONNECTORS_HOSTNAME;
    } else {
      process.env.REPLIT_CONNECTORS_HOSTNAME = previousHostname;
    }
  }
});
