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

type TestCandidate = {
  id: string;
  operatorId: string;
  inquiryId: string;
  routeTargetId: string;
  status: string;
  matchScore: number | null;
  matchReasons: string[] | null;
  matchedCapabilities: string[] | null;
  matchedTags: string[] | null;
};

let getDraftCandidatesHandler: Handler;
let postDraftCandidateHandler: Handler;
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
  process.env.SESSION_SECRET = "inquiry-route-candidates-owner-scope-test";
  process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/inquiry_route_candidates_owner_scope_test";
  process.env.REPL_ID = "inquiry-route-candidates-owner-scope-test";
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

  const getRoute = app.routes.find((record) => record.method === "get" && record.path === "/api/inquiries/:id/draft-route-candidates");
  assert.ok(getRoute, "GET /api/inquiries/:id/draft-route-candidates should be registered");
  getDraftCandidatesHandler = getRoute.handlers.at(-1) as Handler;

  const postRoute = app.routes.find((record) => record.method === "post" && record.path === "/api/inquiries/:id/draft-route-candidates");
  assert.ok(postRoute, "POST /api/inquiries/:id/draft-route-candidates should be registered");
  postDraftCandidateHandler = postRoute.handlers.at(-1) as Handler;
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

function stubCandidateStorage() {
  const users = new Map<string, { id: string; role: string; email: string }>([
    ["artist-a", { id: "artist-a", role: "artist", email: "artist-a@example.com" }],
    ["artist-b", { id: "artist-b", role: "artist", email: "artist-b@example.com" }],
    ["client-user", { id: "client-user", role: "client", email: "client@example.com" }],
  ]);
  const inquiries = new Map<string, { id: string; vendorId: string }>([
    ["inquiry-a", { id: "inquiry-a", vendorId: "artist-a" }],
    ["inquiry-b", { id: "inquiry-b", vendorId: "artist-b" }],
  ]);
  const routeTargets = new Map<string, { id: string; operatorId: string; roleLabel: string | null }>([
    ["target-a", { id: "target-a", operatorId: "artist-a", roleLabel: "Makeup artist" }],
    ["target-b", { id: "target-b", operatorId: "artist-b", roleLabel: "Planner" }],
  ]);
  const candidates: TestCandidate[] = [
    {
      id: "candidate-a",
      operatorId: "artist-a",
      inquiryId: "inquiry-a",
      routeTargetId: "target-a",
      status: "draft",
      matchScore: 80,
      matchReasons: ["Capability match"],
      matchedCapabilities: ["makeup"],
      matchedTags: ["wedding"],
    },
  ];
  const calls = {
    getUser: [] as string[],
    getInquiry: [] as string[],
    getRouteTarget: [] as string[],
    listDraftRouteCandidates: [] as Array<[string, string]>,
    upsertDraftRouteCandidate: [] as Array<[string, string, string]>,
    createInquiryRoute: 0,
    updateInquiryRoute: 0,
    updateInquiry: 0,
  };

  mock.method(storage, "getUser", async (userId: string) => {
    calls.getUser.push(userId);
    return users.get(userId);
  });
  mock.method(storage, "getInquiry", async (inquiryId: string) => {
    calls.getInquiry.push(inquiryId);
    return inquiries.get(inquiryId);
  });
  mock.method(storage, "getRouteTarget", async (targetId: string) => {
    calls.getRouteTarget.push(targetId);
    return routeTargets.get(targetId);
  });
  mock.method(storage, "listDraftRouteCandidates", async (operatorId: string, inquiryId: string) => {
    calls.listDraftRouteCandidates.push([operatorId, inquiryId]);
    return candidates.filter((candidate) => candidate.operatorId === operatorId && candidate.inquiryId === inquiryId);
  });
  mock.method(storage, "upsertDraftRouteCandidate", async (operatorId: string, inquiryId: string, routeTargetId: string, metadata: any) => {
    calls.upsertDraftRouteCandidate.push([operatorId, inquiryId, routeTargetId]);
    const existing = candidates.find((candidate) =>
      candidate.operatorId === operatorId &&
      candidate.inquiryId === inquiryId &&
      candidate.routeTargetId === routeTargetId
    );
    if (existing) {
      Object.assign(existing, {
        status: "draft",
        matchScore: metadata.matchScore ?? existing.matchScore,
        matchReasons: metadata.matchReasons ?? existing.matchReasons,
        matchedCapabilities: metadata.matchedCapabilities ?? existing.matchedCapabilities,
        matchedTags: metadata.matchedTags ?? existing.matchedTags,
      });
      return existing;
    }
    const created = {
      id: `candidate-${candidates.length + 1}`,
      operatorId,
      inquiryId,
      routeTargetId,
      status: "draft",
      matchScore: metadata.matchScore ?? null,
      matchReasons: metadata.matchReasons ?? null,
      matchedCapabilities: metadata.matchedCapabilities ?? null,
      matchedTags: metadata.matchedTags ?? null,
    };
    candidates.push(created);
    return created;
  });
  mock.method(storage, "createInquiryRoute", async () => {
    calls.createInquiryRoute += 1;
    throw new Error("createInquiryRoute should not be called by draft route candidate endpoints");
  });
  mock.method(storage, "updateInquiryRoute", async () => {
    calls.updateInquiryRoute += 1;
    throw new Error("updateInquiryRoute should not be called by draft route candidate endpoints");
  });
  mock.method(storage, "updateInquiry", async () => {
    calls.updateInquiry += 1;
    throw new Error("updateInquiry should not be called by draft route candidate endpoints");
  });

  return { calls, candidates };
}

test("draft route candidate endpoints return 401 for logged-out requests", async () => {
  const { calls } = stubCandidateStorage();

  const getResult = await invoke(getDraftCandidatesHandler);
  const postResult = await invoke(postDraftCandidateHandler, { body: { routeTargetId: "target-a" } });

  assert.equal(getResult.statusCode, 401);
  assert.equal(postResult.statusCode, 401);
  assert.deepEqual(calls.getUser, []);
  assert.deepEqual(calls.getInquiry, []);
  assert.deepEqual(calls.listDraftRouteCandidates, []);
  assert.deepEqual(calls.upsertDraftRouteCandidate, []);
});

test("draft route candidate endpoints return 403 for authenticated non-artist users", async () => {
  const { calls } = stubCandidateStorage();

  const getResult = await invoke(getDraftCandidatesHandler, { session: { userId: "client-user" } });
  const postResult = await invoke(postDraftCandidateHandler, {
    session: { userId: "client-user" },
    body: { routeTargetId: "target-a" },
  });

  assert.equal(getResult.statusCode, 403);
  assert.equal(postResult.statusCode, 403);
  assert.deepEqual(getResult.body, { error: "Operator access required" });
  assert.deepEqual(postResult.body, { error: "Operator access required" });
  assert.deepEqual(calls.getInquiry, []);
  assert.deepEqual(calls.listDraftRouteCandidates, []);
  assert.deepEqual(calls.upsertDraftRouteCandidate, []);
});

test("draft route candidates cannot be read for another operator's inquiry", async () => {
  const { calls } = stubCandidateStorage();

  const result = await invoke(getDraftCandidatesHandler, {
    session: { userId: "artist-a" },
    params: { id: "inquiry-b" },
  });

  assert.equal(result.statusCode, 403);
  assert.deepEqual(result.body, { error: "Access denied" });
  assert.deepEqual(calls.listDraftRouteCandidates, []);
});

test("draft route candidates cannot be written for another operator's inquiry", async () => {
  const { calls } = stubCandidateStorage();

  const result = await invoke(postDraftCandidateHandler, {
    session: { userId: "artist-a" },
    params: { id: "inquiry-b" },
    body: { routeTargetId: "target-a", status: "draft" },
  });

  assert.equal(result.statusCode, 403);
  assert.deepEqual(result.body, { error: "Access denied" });
  assert.deepEqual(calls.getRouteTarget, []);
  assert.deepEqual(calls.upsertDraftRouteCandidate, []);
});

test("draft route candidates cannot use another operator's route target", async () => {
  const { calls } = stubCandidateStorage();

  const result = await invoke(postDraftCandidateHandler, {
    session: { userId: "artist-a" },
    params: { id: "inquiry-a" },
    body: { routeTargetId: "target-b", status: "draft" },
  });

  assert.equal(result.statusCode, 400);
  assert.deepEqual(result.body, { error: "Invalid route target" });
  assert.deepEqual(calls.upsertDraftRouteCandidate, []);
});

test("draft route candidate POST is idempotent and stays draft", async () => {
  const { calls, candidates } = stubCandidateStorage();

  const first = await invoke(postDraftCandidateHandler, {
    session: { userId: "artist-a" },
    params: { id: "inquiry-a" },
    body: {
      routeTargetId: "target-a",
      status: "draft",
      matchScore: 90,
      matchReasons: ["Capability match"],
      matchedCapabilities: ["makeup"],
      matchedTags: ["wedding"],
    },
  });
  const second = await invoke(postDraftCandidateHandler, {
    session: { userId: "artist-a" },
    params: { id: "inquiry-a" },
    body: {
      routeTargetId: "target-a",
      status: "draft",
      matchScore: 90,
      matchReasons: ["Capability match"],
      matchedCapabilities: ["makeup"],
      matchedTags: ["wedding"],
    },
  });

  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 200);
  assert.equal((first.body as any).candidate.status, "draft");
  assert.equal((second.body as any).candidate.status, "draft");
  assert.equal(candidates.filter((candidate) => candidate.operatorId === "artist-a" && candidate.inquiryId === "inquiry-a" && candidate.routeTargetId === "target-a").length, 1);
  assert.deepEqual(calls.upsertDraftRouteCandidate, [
    ["artist-a", "inquiry-a", "target-a"],
    ["artist-a", "inquiry-a", "target-a"],
  ]);
});

test("draft route candidate endpoints do not create routes, preflight, send, or change inquiry status", async () => {
  const { calls } = stubCandidateStorage();

  const result = await invoke(postDraftCandidateHandler, {
    session: { userId: "artist-a" },
    params: { id: "inquiry-a" },
    body: { routeTargetId: "target-a", status: "draft" },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(calls.createInquiryRoute, 0);
  assert.equal(calls.updateInquiryRoute, 0);
  assert.equal(calls.updateInquiry, 0);
});

test("draft route candidate source stays separate from routing, preflight, send, and status code", async () => {
  const routesText = await readFile(new URL("./routes.ts", import.meta.url), "utf8");
  const section = routesText.match(/\/\/ --- Inquiry Workspace: internal draft route candidates[\s\S]*?\/\/ --- Composer:/)?.[0];

  assert.ok(section, "draft route candidate endpoint section should exist");
  assert.doesNotMatch(section, /storage\.createInquiryRoute\(/);
  assert.doesNotMatch(section, /storage\.updateInquiryRoute\(/);
  assert.doesNotMatch(section, /storage\.updateInquiry\(/);
  assert.doesNotMatch(section, /recordRoutingEvent\(/);
  assert.doesNotMatch(section, /preflight/i);
  assert.doesNotMatch(section, /sendEmail|sendSms|sendSMS/);
});
