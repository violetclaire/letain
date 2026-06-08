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

type TestInquiry = {
  id: string;
  vendorId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  eventDate: Date | null;
  eventLocation: string | null;
  serviceType: string | null;
  message: string | null;
  status: string;
  source: string | null;
  notes: string | null;
  ownerId: string | null;
  createdAt: Date;
};

let vendorInquiriesHandler: Handler;
let storage: any;

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

before(async () => {
  process.env.NODE_ENV = "test";
  process.env.SESSION_SECRET = "vendor-inquiries-owner-scope-test";
  process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/vendor_inquiries_owner_scope_test";
  process.env.REPL_ID = "vendor-inquiries-owner-scope-test";
  process.env.ISSUER_URL = "https://replit.com/oidc";

  mock.method(globalThis, "setInterval", () => ({ unref() {} }) as unknown as NodeJS.Timeout);
  mock.method(globalThis, "fetch", async () => new Response(JSON.stringify(oidcDiscoveryDocument()), {
    status: 200,
    headers: { "content-type": "application/json" },
  }));

  const [routesModule, storageModule] = await Promise.all([
    import("./routes"),
    import("./storage"),
  ]);

  storage = storageModule.storage;

  const app = createRecordingApp();
  await routesModule.registerRoutes(app);

  const route = app.routes.find((record) => record.method === "get" && record.path === "/api/vendor/inquiries");
  assert.ok(route, "GET /api/vendor/inquiries should be registered");

  const handler = route.handlers.at(-1);
  assert.equal(typeof handler, "function", "GET /api/vendor/inquiries should register a route handler");
  vendorInquiriesHandler = handler as Handler;
});

afterEach(() => {
  mock.restoreAll();
});

function makeInquiries(): TestInquiry[] {
  return [
    {
      id: "own-a-new",
      vendorId: "artist-a",
      clientName: "Avery Own",
      clientEmail: "avery@example.com",
      clientPhone: "555-0101",
      eventDate: new Date("2026-07-01T12:00:00.000Z"),
      eventLocation: "Briarwood Hall",
      serviceType: "Hair and makeup",
      message: "Looking for wedding day services with a small party.",
      status: "new",
      source: "inquiry-workspace-test",
      notes: "Owner scoped inquiry",
      ownerId: null,
      createdAt: new Date("2026-06-01T10:00:00.000Z"),
    },
    {
      id: "own-a-responded",
      vendorId: "artist-a",
      clientName: "Rowan Own",
      clientEmail: "rowan@example.com",
      clientPhone: null,
      eventDate: new Date("2026-08-01T12:00:00.000Z"),
      eventLocation: "Garden Room",
      serviceType: "Makeup",
      message: "Trial and wedding day makeup request.",
      status: "responded",
      source: "inquiry-workspace-test",
      notes: null,
      ownerId: null,
      createdAt: new Date("2026-05-20T10:00:00.000Z"),
    },
    {
      id: "other-b-leak-candidate",
      vendorId: "artist-b",
      clientName: "Morgan Other",
      clientEmail: "morgan@example.com",
      clientPhone: "555-0202",
      eventDate: new Date("2026-09-01T12:00:00.000Z"),
      eventLocation: "Other Venue",
      serviceType: "Hair",
      message: "This inquiry belongs to another operator.",
      status: "new",
      source: "inquiry-workspace-test",
      notes: "Should never appear for artist-a",
      ownerId: null,
      createdAt: new Date("2026-06-02T10:00:00.000Z"),
    },
  ];
}

function stubVendorInquiryStorage() {
  const inquiries = makeInquiries();
  const users = new Map<string, { id: string; role: string; email: string }>([
    ["artist-a", { id: "artist-a", role: "artist", email: "artist-a@example.com" }],
    ["artist-b", { id: "artist-b", role: "artist", email: "artist-b@example.com" }],
    ["client-user", { id: "client-user", role: "client", email: "client@example.com" }],
  ]);

  const calls = {
    getArtistProfileByEditToken: [] as string[],
    getUser: [] as string[],
    getInquiriesByVendor: [] as string[],
    getVendorMetrics: [] as string[],
    getBookingsByArtist: [] as string[],
    getAvailability: [] as string[],
  };

  mock.method(storage, "getArtistProfileByEditToken", async (token: string) => {
    calls.getArtistProfileByEditToken.push(token);
    return undefined;
  });

  mock.method(storage, "getUser", async (userId: string) => {
    calls.getUser.push(userId);
    return users.get(userId);
  });

  mock.method(storage, "getInquiriesByVendor", async (vendorId: string) => {
    calls.getInquiriesByVendor.push(vendorId);
    return inquiries.filter((inquiry) => inquiry.vendorId === vendorId);
  });

  mock.method(storage, "getVendorMetrics", async (vendorId: string) => {
    calls.getVendorMetrics.push(vendorId);
    return {
      vendorId,
      avgTimeToFirstResponseMinutes: null,
      terminalStateUnder24hPercent: 0,
      holdExpiryRate: 0,
      confirmSuccessCount: 0,
      confirmFailedCount: 0,
      totalInquiries: 0,
    };
  });

  mock.method(storage, "getBookingsByArtist", async (artistId: string) => {
    calls.getBookingsByArtist.push(artistId);
    return [];
  });

  mock.method(storage, "getAvailability", async (artistId: string) => {
    calls.getAvailability.push(artistId);
    return [];
  });

  return { calls, inquiries };
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

async function invokeVendorInquiries(reqOverrides: Record<string, unknown> = {}) {
  const { res, result } = createResponse();
  const req = {
    query: {},
    headers: {},
    ...reqOverrides,
  };

  await vendorInquiriesHandler(req as Request, res as unknown as Response);
  return result();
}

test("GET /api/vendor/inquiries source keeps no-token requests owner-scoped", async () => {
  const [routesText, storageText] = await Promise.all([
    readFile(new URL("./routes.ts", import.meta.url), "utf8"),
    readFile(new URL("./storage.ts", import.meta.url), "utf8"),
  ]);

  assert.match(routesText, /app\.get\("\/api\/vendor\/inquiries", async \(req: Request, res: Response\) => \{/);
  assert.match(routesText, /userId = getAuthUserId\(req\);[\s\S]*?return res\.status\(401\)\.json\(\{ error: "Not authenticated" \}\);/);
  assert.match(routesText, /const user = await storage\.getUser\(userId\);[\s\S]*?user\.role !== 'artist'[\s\S]*?return res\.status\(403\)\.json\(\{ error: "Vendor access required" \}\);/);
  assert.match(routesText, /const inquiries = await storage\.getInquiriesByVendor\(userId\);/);
  assert.match(storageText, /async getInquiriesByVendor\(vendorId: string\): Promise<Inquiry\[\]> \{[\s\S]*?where\(eq\(inquiries\.vendorId, vendorId\)\)/);
});

test("GET /api/vendor/inquiries returns 401 for logged-out requests", async () => {
  const { calls } = stubVendorInquiryStorage();

  const result = await invokeVendorInquiries();

  assert.equal(result.statusCode, 401);
  assert.deepEqual(result.body, { error: "Not authenticated" });
  assert.deepEqual(calls.getArtistProfileByEditToken, []);
  assert.deepEqual(calls.getUser, []);
  assert.deepEqual(calls.getInquiriesByVendor, []);
});

test("GET /api/vendor/inquiries returns 403 for authenticated non-artist users", async () => {
  const { calls } = stubVendorInquiryStorage();

  const result = await invokeVendorInquiries({ session: { userId: "client-user" } });

  assert.equal(result.statusCode, 403);
  assert.deepEqual(result.body, { error: "Vendor access required" });
  assert.deepEqual(calls.getArtistProfileByEditToken, []);
  assert.deepEqual(calls.getUser, ["client-user"]);
  assert.deepEqual(calls.getInquiriesByVendor, []);
});

test("GET /api/vendor/inquiries returns only inquiries owned by the authenticated artist session", async () => {
  const { calls } = stubVendorInquiryStorage();

  const result = await invokeVendorInquiries({ session: { userId: "artist-a" } });

  assert.equal(result.statusCode, 200);
  assert.ok(Array.isArray(result.body));
  assert.ok(result.body.every((inquiry: TestInquiry) => inquiry.vendorId === "artist-a"));

  const inquiryIds = result.body.map((inquiry: TestInquiry) => inquiry.id);
  assert.deepEqual(new Set(inquiryIds), new Set(["own-a-new", "own-a-responded"]));
  assert.equal(inquiryIds.includes("other-b-leak-candidate"), false);

  assert.deepEqual(calls.getArtistProfileByEditToken, []);
  assert.deepEqual(calls.getUser, ["artist-a"]);
  assert.deepEqual(calls.getInquiriesByVendor, ["artist-a"]);
  assert.deepEqual(calls.getVendorMetrics, ["artist-a"]);
  assert.deepEqual(calls.getBookingsByArtist, ["artist-a"]);
  assert.deepEqual(calls.getAvailability, ["artist-a"]);
});

test("GET /api/vendor/inquiries prefers the session user identity when no token is provided", async () => {
  const { calls } = stubVendorInquiryStorage();

  const result = await invokeVendorInquiries({
    session: { userId: "artist-a" },
    user: { claims: { sub: "artist-b" } },
  });

  assert.equal(result.statusCode, 200);
  assert.ok(Array.isArray(result.body));
  assert.ok(result.body.every((inquiry: TestInquiry) => inquiry.vendorId === "artist-a"));
  assert.deepEqual(calls.getArtistProfileByEditToken, []);
  assert.deepEqual(calls.getUser, ["artist-a"]);
  assert.deepEqual(calls.getInquiriesByVendor, ["artist-a"]);
});

test("GET /api/vendor/inquiries uses OIDC subject identity when there is no session and no token", async () => {
  const { calls } = stubVendorInquiryStorage();

  const result = await invokeVendorInquiries({ user: { claims: { sub: "artist-b" } } });

  assert.equal(result.statusCode, 200);
  assert.ok(Array.isArray(result.body));
  assert.deepEqual(result.body.map((inquiry: TestInquiry) => inquiry.id), ["other-b-leak-candidate"]);
  assert.ok(result.body.every((inquiry: TestInquiry) => inquiry.vendorId === "artist-b"));
  assert.deepEqual(calls.getArtistProfileByEditToken, []);
  assert.deepEqual(calls.getUser, ["artist-b"]);
  assert.deepEqual(calls.getInquiriesByVendor, ["artist-b"]);
});
