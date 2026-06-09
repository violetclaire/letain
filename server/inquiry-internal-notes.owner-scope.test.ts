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

type TestInternalNote = {
  id: string;
  operatorId: string;
  inquiryId: string;
  body: string;
};

let getInternalNoteHandler: Handler;
let putInternalNoteHandler: Handler;
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
  process.env.SESSION_SECRET = "inquiry-internal-notes-owner-scope-test";
  process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/inquiry_internal_notes_owner_scope_test";
  process.env.REPL_ID = "inquiry-internal-notes-owner-scope-test";
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

  const getRoute = app.routes.find((record) => record.method === "get" && record.path === "/api/inquiries/:id/internal-note");
  assert.ok(getRoute, "GET /api/inquiries/:id/internal-note should be registered");
  getInternalNoteHandler = getRoute.handlers.at(-1) as Handler;

  const putRoute = app.routes.find((record) => record.method === "put" && record.path === "/api/inquiries/:id/internal-note");
  assert.ok(putRoute, "PUT /api/inquiries/:id/internal-note should be registered");
  putInternalNoteHandler = putRoute.handlers.at(-1) as Handler;
});

afterEach(() => {
  mock.restoreAll();
});

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
    params: { id: "inquiry-a" },
    body: {},
    headers: {},
    ...reqOverrides,
  };

  await handler(req as Request, res as unknown as Response);
  return result();
}

function stubInternalNoteStorage() {
  const users = new Map<string, { id: string; role: string; email: string }>([
    ["artist-a", { id: "artist-a", role: "artist", email: "artist-a@example.com" }],
    ["artist-b", { id: "artist-b", role: "artist", email: "artist-b@example.com" }],
    ["client-user", { id: "client-user", role: "client", email: "client@example.com" }],
  ]);
  const inquiries = new Map<string, { id: string; vendorId: string }>([
    ["inquiry-a", { id: "inquiry-a", vendorId: "artist-a" }],
    ["inquiry-b", { id: "inquiry-b", vendorId: "artist-b" }],
  ]);
  const notes: TestInternalNote[] = [
    {
      id: "note-a",
      operatorId: "artist-a",
      inquiryId: "inquiry-a",
      body: "Private prep note",
    },
    {
      id: "note-b",
      operatorId: "artist-b",
      inquiryId: "inquiry-b",
      body: "Another operator note",
    },
  ];
  const calls = {
    getUser: [] as string[],
    getInquiry: [] as string[],
    getInquiryInternalNote: [] as Array<[string, string]>,
    upsertInquiryInternalNote: [] as Array<[string, string, string]>,
    updateInquiry: 0,
    createInquiryRoute: 0,
    updateInquiryRoute: 0,
    createInquiryResponse: 0,
    updateInquiryResponse: 0,
    createCdiBehavioralEvent: 0,
  };

  mock.method(storage, "getUser", async (userId: string) => {
    calls.getUser.push(userId);
    return users.get(userId);
  });
  mock.method(storage, "getInquiry", async (inquiryId: string) => {
    calls.getInquiry.push(inquiryId);
    return inquiries.get(inquiryId);
  });
  mock.method(storage, "getInquiryInternalNote", async (operatorId: string, inquiryId: string) => {
    calls.getInquiryInternalNote.push([operatorId, inquiryId]);
    return notes.find((note) => note.operatorId === operatorId && note.inquiryId === inquiryId);
  });
  mock.method(storage, "upsertInquiryInternalNote", async (operatorId: string, inquiryId: string, body: string) => {
    calls.upsertInquiryInternalNote.push([operatorId, inquiryId, body]);
    const existing = notes.find((note) => note.operatorId === operatorId && note.inquiryId === inquiryId);
    if (existing) {
      existing.body = body;
      return existing;
    }
    const created = { id: `note-${notes.length + 1}`, operatorId, inquiryId, body };
    notes.push(created);
    return created;
  });
  mock.method(storage, "updateInquiry", async () => {
    calls.updateInquiry += 1;
    throw new Error("updateInquiry should not be called by internal note endpoints");
  });
  mock.method(storage, "createInquiryRoute", async () => {
    calls.createInquiryRoute += 1;
    throw new Error("createInquiryRoute should not be called by internal note endpoints");
  });
  mock.method(storage, "updateInquiryRoute", async () => {
    calls.updateInquiryRoute += 1;
    throw new Error("updateInquiryRoute should not be called by internal note endpoints");
  });
  mock.method(storage, "createInquiryResponse", async () => {
    calls.createInquiryResponse += 1;
    throw new Error("createInquiryResponse should not be called by internal note endpoints");
  });
  mock.method(storage, "updateInquiryResponse", async () => {
    calls.updateInquiryResponse += 1;
    throw new Error("updateInquiryResponse should not be called by internal note endpoints");
  });
  mock.method(storage, "createCdiBehavioralEvent", async () => {
    calls.createCdiBehavioralEvent += 1;
    throw new Error("createCdiBehavioralEvent should not be called by internal note endpoints");
  });

  return { calls, notes };
}

test("internal note endpoints return 401 for logged-out requests", async () => {
  const { calls } = stubInternalNoteStorage();

  const getResult = await invoke(getInternalNoteHandler);
  const putResult = await invoke(putInternalNoteHandler, { body: { body: "Private note" } });

  assert.equal(getResult.statusCode, 401);
  assert.equal(putResult.statusCode, 401);
  assert.deepEqual(calls.getUser, []);
  assert.deepEqual(calls.getInquiry, []);
  assert.deepEqual(calls.getInquiryInternalNote, []);
  assert.deepEqual(calls.upsertInquiryInternalNote, []);
});

test("internal note endpoints return 403 for authenticated non-artist users", async () => {
  const { calls } = stubInternalNoteStorage();

  const getResult = await invoke(getInternalNoteHandler, { session: { userId: "client-user" } });
  const putResult = await invoke(putInternalNoteHandler, {
    session: { userId: "client-user" },
    body: { body: "Private note" },
  });

  assert.equal(getResult.statusCode, 403);
  assert.equal(putResult.statusCode, 403);
  assert.deepEqual(getResult.body, { error: "Operator access required" });
  assert.deepEqual(putResult.body, { error: "Operator access required" });
  assert.deepEqual(calls.getInquiry, []);
  assert.deepEqual(calls.getInquiryInternalNote, []);
  assert.deepEqual(calls.upsertInquiryInternalNote, []);
});

test("internal note can be read for the owning operator's inquiry", async () => {
  const { calls } = stubInternalNoteStorage();

  const result = await invoke(getInternalNoteHandler, {
    session: { userId: "artist-a" },
    params: { id: "inquiry-a" },
  });

  assert.equal(result.statusCode, 200);
  assert.equal((result.body as any).note.body, "Private prep note");
  assert.deepEqual(calls.getInquiryInternalNote, [["artist-a", "inquiry-a"]]);
});

test("internal notes cannot be read for another operator's inquiry", async () => {
  const { calls } = stubInternalNoteStorage();

  const result = await invoke(getInternalNoteHandler, {
    session: { userId: "artist-a" },
    params: { id: "inquiry-b" },
  });

  assert.equal(result.statusCode, 403);
  assert.deepEqual(result.body, { error: "Access denied" });
  assert.deepEqual(calls.getInquiryInternalNote, []);
});

test("internal notes cannot be written for another operator's inquiry", async () => {
  const { calls } = stubInternalNoteStorage();

  const result = await invoke(putInternalNoteHandler, {
    session: { userId: "artist-a" },
    params: { id: "inquiry-b" },
    body: { body: "Should not save" },
  });

  assert.equal(result.statusCode, 403);
  assert.deepEqual(result.body, { error: "Access denied" });
  assert.deepEqual(calls.upsertInquiryInternalNote, []);
});

test("internal note upsert updates one note and does not duplicate", async () => {
  const { calls, notes } = stubInternalNoteStorage();

  const first = await invoke(putInternalNoteHandler, {
    session: { userId: "artist-a" },
    params: { id: "inquiry-a" },
    body: { body: "First version" },
  });
  const second = await invoke(putInternalNoteHandler, {
    session: { userId: "artist-a" },
    params: { id: "inquiry-a" },
    body: { body: "Updated version" },
  });

  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 200);
  assert.equal((second.body as any).note.body, "Updated version");
  assert.equal(notes.filter((note) => note.operatorId === "artist-a" && note.inquiryId === "inquiry-a").length, 1);
  assert.deepEqual(calls.upsertInquiryInternalNote, [
    ["artist-a", "inquiry-a", "First version"],
    ["artist-a", "inquiry-a", "Updated version"],
  ]);
});

test("internal note can be explicitly cleared to an empty body", async () => {
  const { calls, notes } = stubInternalNoteStorage();

  const result = await invoke(putInternalNoteHandler, {
    session: { userId: "artist-a" },
    params: { id: "inquiry-a" },
    body: { body: "" },
  });

  assert.equal(result.statusCode, 200);
  assert.equal((result.body as any).note.body, "");
  assert.equal(notes.find((note) => note.operatorId === "artist-a" && note.inquiryId === "inquiry-a")?.body, "");
  assert.deepEqual(calls.upsertInquiryInternalNote, [["artist-a", "inquiry-a", ""]]);
});

test("internal note PUT requires an explicit string body", async () => {
  stubInternalNoteStorage();

  const result = await invoke(putInternalNoteHandler, {
    session: { userId: "artist-a" },
    params: { id: "inquiry-a" },
    body: {},
  });

  assert.equal(result.statusCode, 400);
  assert.deepEqual(result.body, { error: "Required" });
});

test("internal note endpoints do not touch status, routing, composer, sends, schedules, payments, contracts, or scoring", async () => {
  const { calls } = stubInternalNoteStorage();

  const getResult = await invoke(getInternalNoteHandler, {
    session: { userId: "artist-a" },
    params: { id: "inquiry-a" },
  });
  const putResult = await invoke(putInternalNoteHandler, {
    session: { userId: "artist-a" },
    params: { id: "inquiry-a" },
    body: { body: "Internal only" },
  });

  assert.equal(getResult.statusCode, 200);
  assert.equal(putResult.statusCode, 200);
  assert.equal(calls.updateInquiry, 0);
  assert.equal(calls.createInquiryRoute, 0);
  assert.equal(calls.updateInquiryRoute, 0);
  assert.equal(calls.createInquiryResponse, 0);
  assert.equal(calls.updateInquiryResponse, 0);
  assert.equal(calls.createCdiBehavioralEvent, 0);
});

test("internal note source stays separate from public routes and side-effect code", async () => {
  const routesText = await readFile(new URL("./routes.ts", import.meta.url), "utf8");
  const section = routesText.match(/\/\/ --- Inquiry Workspace: private internal notes[\s\S]*?\/\/ --- Composer:/)?.[0];

  assert.ok(section, "internal note endpoint section should exist");
  assert.doesNotMatch(section, /storage\.updateInquiry\(/);
  assert.doesNotMatch(section, /storage\.createInquiryRoute\(/);
  assert.doesNotMatch(section, /storage\.updateInquiryRoute\(/);
  assert.doesNotMatch(section, /storage\.createInquiryResponse\(/);
  assert.doesNotMatch(section, /storage\.updateInquiryResponse\(/);
  assert.doesNotMatch(section, /recordRoutingEvent\(/);
  assert.doesNotMatch(section, /preflight/i);
  assert.doesNotMatch(section, /sendGeneralEmail|sendEmail|sendSms|sendSMS/);
  assert.doesNotMatch(section, /contract|payment|schedule/i);
  assert.doesNotMatch(section, /cdi|trust/i);
  assert.doesNotMatch(section, /public\/inquiry/);
});
