import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { afterEach, before, mock, test } from "node:test";
import type { Express, Request, Response } from "express";

type Handler = (req: Request, res: Response) => unknown | Promise<unknown>;
type RouteRecord = { method: string; path: string; handlers: Handler[] };
type LifecycleAction = "judgment" | "correction" | "challenge" | "withdrawal" | "supersession";

type TestAttestation = {
  id: string;
  operatorId: string;
  inquiryId: string;
};

type TestJudgment = {
  id: string;
  operatorId: string;
  authorUserId: string;
  inquiryId: string;
  subjectText: string;
  scopeText: string;
  judgmentText: string;
  rationaleText: string;
  evidenceBasis: string;
  lifecycleAction: LifecycleAction;
  relatedJudgmentId: string | null;
  createdAt: Date;
  supportingAttestationIds: string[];
};

let listJudgmentsHandler: Handler;
let readJudgmentHandler: Handler;
let postJudgmentHandler: Handler;
let registeredRoutes: RouteRecord[];
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
  process.env.SESSION_SECRET = "coordination-judgments-owner-scope-test";
  process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/coordination_judgments_owner_scope_test";
  process.env.REPL_ID = "coordination-judgments-owner-scope-test";
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
  registeredRoutes = app.routes;

  const listRoute = registeredRoutes.find((record) =>
    record.method === "get" && record.path === "/api/inquiries/:id/coordination-judgments"
  );
  const readRoute = registeredRoutes.find((record) =>
    record.method === "get" && record.path === "/api/inquiries/:id/coordination-judgments/:judgmentId"
  );
  const postRoute = registeredRoutes.find((record) =>
    record.method === "post" && record.path === "/api/inquiries/:id/coordination-judgments"
  );

  assert.ok(listRoute, "coordination judgment list route should be registered");
  assert.ok(readRoute, "coordination judgment read route should be registered");
  assert.ok(postRoute, "coordination judgment create route should be registered");
  listJudgmentsHandler = listRoute.handlers.at(-1) as Handler;
  readJudgmentHandler = readRoute.handlers.at(-1) as Handler;
  postJudgmentHandler = postRoute.handlers.at(-1) as Handler;
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
  return { res, result: () => ({ statusCode, body }) };
}

async function invoke(handler: Handler, reqOverrides: Record<string, unknown> = {}) {
  const { res, result } = createResponse();
  const req = {
    params: { id: "inquiry-a", judgmentId: "judgment-original" },
    body: {},
    headers: {},
    ...reqOverrides,
  };
  await handler(req as Request, res as unknown as Response);
  return result();
}

function validJudgmentBody(overrides: Record<string, unknown> = {}) {
  return {
    subjectText: "Whether the provider evidence is sufficient for operator review",
    scopeText: "This inquiry and the provider condition stated in the identified messages",
    judgmentText: "The evidence supports review, but not external action.",
    rationaleText: "The later message adds a condition that remains unresolved.",
    evidenceBasis: "Provider message msg-1 and follow-up msg-2 in the private inquiry record.",
    supportingAttestationIds: [],
    ...overrides,
  };
}

function originalJudgment(overrides: Partial<TestJudgment> = {}): TestJudgment {
  return {
    id: "judgment-original",
    operatorId: "artist-a",
    authorUserId: "artist-a",
    inquiryId: "inquiry-a",
    subjectText: "Original subject",
    scopeText: "Original scope",
    judgmentText: "Original judgment",
    rationaleText: "Original rationale",
    evidenceBasis: "Original evidence basis",
    lifecycleAction: "judgment",
    relatedJudgmentId: null,
    createdAt: new Date("2026-07-18T08:00:00.000Z"),
    supportingAttestationIds: [],
    ...overrides,
  };
}

function stubJudgmentStorage(options: {
  attestations?: TestAttestation[];
  judgments?: TestJudgment[];
} = {}) {
  const users = new Map([
    ["artist-a", { id: "artist-a", role: "artist", email: "a@example.com" }],
    ["artist-b", { id: "artist-b", role: "artist", email: "b@example.com" }],
    ["client-user", { id: "client-user", role: "client", email: "client@example.com" }],
  ]);
  const inquiries = new Map([
    ["inquiry-a", { id: "inquiry-a", vendorId: "artist-a" }],
    ["inquiry-b", { id: "inquiry-b", vendorId: "artist-b" }],
    ["inquiry-c", { id: "inquiry-c", vendorId: "artist-a" }],
  ]);
  const attestations = [...(options.attestations ?? [])];
  const judgments = [...(options.judgments ?? [])];
  const calls = {
    createCoordinationJudgment: [] as Array<{ data: any; supportingAttestationIds: string[] }>,
    getCoordinationJudgment: [] as Array<[string, string, string]>,
    listCoordinationJudgments: [] as Array<[string, string]>,
    getHumanAttestation: [] as Array<[string, string, string]>,
  };

  mock.method(storage, "getUser", async (userId: string) => users.get(userId));
  mock.method(storage, "getInquiry", async (inquiryId: string) => inquiries.get(inquiryId));
  mock.method(storage, "getHumanAttestation", async (
    operatorId: string,
    inquiryId: string,
    attestationId: string,
  ) => {
    calls.getHumanAttestation.push([operatorId, inquiryId, attestationId]);
    return attestations.find((item) =>
      item.operatorId === operatorId && item.inquiryId === inquiryId && item.id === attestationId
    );
  });
  mock.method(storage, "getCoordinationJudgment", async (
    operatorId: string,
    inquiryId: string,
    judgmentId: string,
  ) => {
    calls.getCoordinationJudgment.push([operatorId, inquiryId, judgmentId]);
    return judgments.find((item) =>
      item.operatorId === operatorId && item.inquiryId === inquiryId && item.id === judgmentId
    );
  });
  mock.method(storage, "listCoordinationJudgments", async (operatorId: string, inquiryId: string) => {
    calls.listCoordinationJudgments.push([operatorId, inquiryId]);
    return judgments
      .filter((item) => item.operatorId === operatorId && item.inquiryId === inquiryId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id));
  });
  mock.method(storage, "createCoordinationJudgment", async (
    data: Omit<TestJudgment, "id" | "createdAt" | "supportingAttestationIds">,
    supportingAttestationIds: string[],
  ) => {
    calls.createCoordinationJudgment.push({ data, supportingAttestationIds });
    const created: TestJudgment = {
      ...data,
      id: `judgment-${judgments.length + 1}`,
      createdAt: new Date(`2026-07-18T09:${String(judgments.length).padStart(2, "0")}:00.000Z`),
      supportingAttestationIds: [...supportingAttestationIds],
    };
    judgments.push(created);
    return created;
  });

  return { calls, judgments };
}

test("coordination judgment endpoints require an authenticated operator", async () => {
  const { calls } = stubJudgmentStorage();
  const loggedOutList = await invoke(listJudgmentsHandler);
  const loggedOutCreate = await invoke(postJudgmentHandler, { body: validJudgmentBody() });
  const clientRead = await invoke(readJudgmentHandler, { session: { userId: "client-user" } });

  assert.equal(loggedOutList.statusCode, 401);
  assert.equal(loggedOutCreate.statusCode, 401);
  assert.equal(clientRead.statusCode, 403);
  assert.deepEqual(calls.createCoordinationJudgment, []);
});

test("owning operator can create, list, and read a judgment with ordered attestation provenance", async () => {
  const { calls } = stubJudgmentStorage({
    attestations: [
      { id: "attestation-1", operatorId: "artist-a", inquiryId: "inquiry-a" },
      { id: "attestation-2", operatorId: "artist-a", inquiryId: "inquiry-a" },
    ],
  });
  const createResult = await invoke(postJudgmentHandler, {
    session: { userId: "artist-a" },
    body: validJudgmentBody({ supportingAttestationIds: ["attestation-2", "attestation-1"] }),
  });

  assert.equal(createResult.statusCode, 201);
  const created = (createResult.body as any).judgment as TestJudgment;
  assert.equal(created.operatorId, "artist-a");
  assert.equal(created.authorUserId, "artist-a");
  assert.deepEqual(created.supportingAttestationIds, ["attestation-2", "attestation-1"]);
  assert.deepEqual(calls.createCoordinationJudgment[0].supportingAttestationIds, ["attestation-2", "attestation-1"]);

  const listResult = await invoke(listJudgmentsHandler, { session: { userId: "artist-a" } });
  const readResult = await invoke(readJudgmentHandler, {
    session: { userId: "artist-a" },
    params: { id: "inquiry-a", judgmentId: created.id },
  });
  assert.equal(listResult.statusCode, 200);
  assert.equal((listResult.body as any).judgments[0].id, created.id);
  assert.equal(readResult.statusCode, 200);
  assert.equal((readResult.body as any).judgment.id, created.id);
});

test("judgments may identify other evidence without requiring an attestation", async () => {
  const { calls } = stubJudgmentStorage();
  const result = await invoke(postJudgmentHandler, {
    session: { userId: "artist-a" },
    body: validJudgmentBody(),
  });

  assert.equal(result.statusCode, 201);
  assert.equal(calls.createCoordinationJudgment[0].data.evidenceBasis.includes("msg-1"), true);
  assert.deepEqual(calls.createCoordinationJudgment[0].supportingAttestationIds, []);
});

test("client-supplied owner, author, inquiry, or authority fields are rejected", async () => {
  const { calls } = stubJudgmentStorage();
  for (const extra of [
    { operatorId: "artist-b" },
    { authorUserId: "artist-b" },
    { inquiryId: "inquiry-b" },
    { allowedActions: ["send"] },
    { permissionDecision: "PROCEED" },
  ]) {
    const result = await invoke(postJudgmentHandler, {
      session: { userId: "artist-a" },
      body: validJudgmentBody(extra),
    });
    assert.equal(result.statusCode, 400);
  }
  assert.deepEqual(calls.createCoordinationJudgment, []);
});

test("another operator cannot create, list, or read judgments for an inquiry", async () => {
  const { calls } = stubJudgmentStorage({ judgments: [originalJudgment()] });
  const request = { session: { userId: "artist-b" }, params: { id: "inquiry-a", judgmentId: "judgment-original" } };

  assert.equal((await invoke(postJudgmentHandler, { ...request, body: validJudgmentBody() })).statusCode, 403);
  assert.equal((await invoke(listJudgmentsHandler, request)).statusCode, 403);
  assert.equal((await invoke(readJudgmentHandler, request)).statusCode, 403);
  assert.deepEqual(calls.createCoordinationJudgment, []);
  assert.deepEqual(calls.listCoordinationJudgments, []);
  assert.deepEqual(calls.getCoordinationJudgment, []);
});

test("supporting attestation links fail closed across owner and inquiry boundaries", async () => {
  const { calls } = stubJudgmentStorage({
    attestations: [
      { id: "other-owner", operatorId: "artist-b", inquiryId: "inquiry-a" },
      { id: "other-inquiry", operatorId: "artist-a", inquiryId: "inquiry-c" },
    ],
  });

  for (const attestationId of ["other-owner", "other-inquiry", "missing"]) {
    const result = await invoke(postJudgmentHandler, {
      session: { userId: "artist-a" },
      body: validJudgmentBody({ supportingAttestationIds: [attestationId] }),
    });
    assert.equal(result.statusCode, 400);
  }
  assert.deepEqual(calls.getHumanAttestation, [
    ["artist-a", "inquiry-a", "other-owner"],
    ["artist-a", "inquiry-a", "other-inquiry"],
    ["artist-a", "inquiry-a", "missing"],
  ]);
  assert.deepEqual(calls.createCoordinationJudgment, []);
});

test("lifecycle records append without mutating the original judgment", async () => {
  const original = originalJudgment();
  const { judgments } = stubJudgmentStorage({ judgments: [original] });

  for (const lifecycleAction of ["correction", "challenge", "withdrawal", "supersession"] as const) {
    const result = await invoke(postJudgmentHandler, {
      session: { userId: "artist-a" },
      body: validJudgmentBody({ lifecycleAction, relatedJudgmentId: original.id }),
    });
    assert.equal(result.statusCode, 201);
    assert.equal((result.body as any).judgment.relatedJudgmentId, original.id);
  }

  assert.equal(judgments.length, 5);
  assert.deepEqual(judgments[0], original);
});

test("prior-judgment links fail closed across owner and inquiry boundaries", async () => {
  const otherOwner = originalJudgment({ id: "other-owner", operatorId: "artist-b", authorUserId: "artist-b" });
  const otherInquiry = originalJudgment({ id: "other-inquiry", inquiryId: "inquiry-c" });
  const { calls } = stubJudgmentStorage({ judgments: [otherOwner, otherInquiry] });

  for (const relatedJudgmentId of [otherOwner.id, otherInquiry.id, "missing"]) {
    const result = await invoke(postJudgmentHandler, {
      session: { userId: "artist-a" },
      body: validJudgmentBody({ lifecycleAction: "challenge", relatedJudgmentId }),
    });
    assert.equal(result.statusCode, 400);
  }
  assert.deepEqual(calls.createCoordinationJudgment, []);
});

test("invalid lifecycle combinations and duplicate source links are rejected", async () => {
  const { calls } = stubJudgmentStorage();
  const linkedOriginal = await invoke(postJudgmentHandler, {
    session: { userId: "artist-a" },
    body: validJudgmentBody({ relatedJudgmentId: "judgment-original" }),
  });
  const unlinkedCorrection = await invoke(postJudgmentHandler, {
    session: { userId: "artist-a" },
    body: validJudgmentBody({ lifecycleAction: "correction" }),
  });
  const duplicateSources = await invoke(postJudgmentHandler, {
    session: { userId: "artist-a" },
    body: validJudgmentBody({ supportingAttestationIds: ["same", "same"] }),
  });

  assert.equal(linkedOriginal.statusCode, 400);
  assert.equal(unlinkedCorrection.statusCode, 400);
  assert.equal(duplicateSources.statusCode, 400);
  assert.deepEqual(calls.createCoordinationJudgment, []);
});

test("coordination judgment surface is private create/list/read only and grants no action authority", async () => {
  const judgmentRoutes = registeredRoutes.filter((record) =>
    record.path.startsWith("/api/inquiries/:id/coordination-judgments")
  );
  assert.deepEqual(judgmentRoutes.map((record) => record.method).sort(), ["get", "get", "post"]);

  const routesText = await readFile(new URL("./routes.ts", import.meta.url), "utf8");
  const section = routesText.match(
    /\/\/ --- Inquiry Workspace: private append-only coordination judgments ---[\s\S]*?\/\/ --- Inquiry Workspace: private append-only scoped permission decisions ---/,
  )?.[0];
  assert.ok(section, "coordination judgment route section should exist");
  assert.doesNotMatch(section, /storage\.(?:update|delete)/);
  assert.doesNotMatch(section, /\/assess|sendEmail|sendSms|createInquiryRoute|updateInquiryRoute/);
  assert.doesNotMatch(section, /createContract|createPayment|createSchedule|provider accepted/i);

  const storageText = await readFile(new URL("./storage.ts", import.meta.url), "utf8");
  assert.doesNotMatch(storageText, /updateCoordinationJudgment|deleteCoordinationJudgment/);
  assert.match(storageText, /db\.transaction[\s\S]*?coordinationJudgmentAttestations/);
  assert.match(storageText, /orderBy\(asc\(coordinationJudgmentAttestations\.position\)\)/);
});

test("schema and startup DDL preserve append-only referential integrity and fail closed", async () => {
  const schemaText = await readFile(new URL("../shared/schema.ts", import.meta.url), "utf8");
  const judgments = schemaText.match(
    /export const coordinationJudgments = pgTable\([\s\S]*?export type CoordinationJudgment =[^\n]+/,
  )?.[0];
  const links = schemaText.match(
    /export const coordinationJudgmentAttestations = pgTable\([\s\S]*?export type CoordinationJudgmentAttestation =[^;]+;/,
  )?.[0];
  assert.ok(judgments);
  assert.ok(links);
  assert.doesNotMatch(judgments, /updatedAt|deletedAt/);
  assert.match(judgments, /coordination_judgments_lifecycle_action_check/);
  assert.match(judgments, /coordination_judgments_lifecycle_link_check/);
  assert.equal(judgments.match(/\.references\(\(\) => users\.id, \{ onDelete: "restrict" \}\)/g)?.length, 2);
  assert.match(judgments, /\.references\(\(\) => inquiries\.id, \{ onDelete: "restrict" \}\)/);
  assert.match(judgments, /coordinationJudgments\.id, \{ onDelete: "restrict" \}/);
  assert.match(links, /coordinationJudgments\.id, \{ onDelete: "restrict" \}/);
  assert.match(links, /humanAttestations\.id, \{ onDelete: "restrict" \}/);
  assert.match(links, /coordination_judgment_attestations_position_check/);

  const indexText = await readFile(new URL("./index.ts", import.meta.url), "utf8");
  const setup = indexText.match(
    /\{ name: 'coordination_judgments\.table'[\s\S]*?\{ name: 'scoped_permission_decisions\.table'/,
  )?.[0];
  assert.ok(setup, "idempotent coordination judgment startup schema should exist");
  assert.match(setup, /CREATE TABLE IF NOT EXISTS coordination_judgments/);
  assert.match(setup, /CREATE TABLE IF NOT EXISTS coordination_judgment_attestations/);
  assert.equal(setup.match(/NOT VALID/g)?.length, 9);
  assert.equal(setup.match(/VALIDATE CONSTRAINT coordination_judgment/g)?.length, 9);
  assert.equal(setup.match(/required: true/g)?.length, 20);
  assert.doesNotMatch(setup, /ON DELETE (?:CASCADE|SET NULL)/i);
  assert.doesNotMatch(setup, /(?:UPDATE|DELETE FROM) coordination_judgment/i);
  assert.match(setup, /coordination_judgment_attestations_unique/);
  assert.match(setup, /coordination_judgment_attestations_position_unique/);
  assert.match(
    indexText,
    /catch \(error: any\) \{[\s\S]*?if \(migration\.required\) \{[\s\S]*?throw error;/,
  );
});
