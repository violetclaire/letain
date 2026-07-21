import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { afterEach, before, mock, test } from "node:test";
import type { Express, Request, Response } from "express";

type Handler = (req: Request, res: Response) => unknown | Promise<unknown>;
type RouteRecord = { method: string; path: string; handlers: Handler[] };
type HumanChoice = "proceed" | "wait" | "clarify" | "escalate" | "stop";
type HumanActionLifecycle = "decision" | "correction" | "withdrawal" | "supersession";

type TestPermissionDecision = {
  id: string;
  operatorId: string;
  inquiryId: string;
  decision: "permitted" | "permitted_with_conditions" | "wait" | "clarification_required" | "escalation_required" | "not_permitted";
  requiredConditions: string[];
  expiresAt: Date | null;
  lifecycleAction: "decision" | "correction" | "withdrawal" | "supersession";
  relatedPermissionDecisionId: string | null;
  createdAt: Date;
};

type TestHumanActionDecision = {
  id: string;
  operatorId: string;
  decisionMakerUserId: string;
  inquiryId: string;
  permissionDecisionId: string;
  decisionOrigin: "authenticated_human";
  choice: HumanChoice;
  permissionReviewSummary: string;
  rationaleText: string;
  conditionConfirmations: string[];
  lifecycleAction: HumanActionLifecycle;
  relatedHumanActionDecisionId: string | null;
  createdAt: Date;
};

let listHandler: Handler;
let readHandler: Handler;
let postHandler: Handler;
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
  process.env.SESSION_SECRET = "human-action-decisions-owner-scope-test";
  process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/human_action_decisions_owner_scope_test";
  process.env.REPL_ID = "human-action-decisions-owner-scope-test";
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
    record.method === "get" && record.path === "/api/inquiries/:id/human-action-decisions"
  );
  const readRoute = registeredRoutes.find((record) =>
    record.method === "get" && record.path === "/api/inquiries/:id/human-action-decisions/:humanActionDecisionId"
  );
  const postRoute = registeredRoutes.find((record) =>
    record.method === "post" && record.path === "/api/inquiries/:id/human-action-decisions"
  );

  assert.ok(listRoute, "human action decision list route should be registered");
  assert.ok(readRoute, "human action decision read route should be registered");
  assert.ok(postRoute, "human action decision create route should be registered");
  listHandler = listRoute.handlers.at(-1) as Handler;
  readHandler = readRoute.handlers.at(-1) as Handler;
  postHandler = postRoute.handlers.at(-1) as Handler;
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
    params: {
      id: "inquiry-a",
      humanActionDecisionId: "action-original",
    },
    body: {},
    headers: {},
    ...reqOverrides,
  };
  await handler(req as Request, res as unknown as Response);
  return result();
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    permissionDecisionId: "permission-current",
    choice: "proceed",
    permissionReviewSummary: "I reviewed the exact current scoped permission decision and its boundaries.",
    rationaleText: "I choose to proceed to a later, separately controlled action step.",
    conditionConfirmations: [],
    ...overrides,
  };
}

function permissionDecision(overrides: Partial<TestPermissionDecision> = {}): TestPermissionDecision {
  return {
    id: "permission-current",
    operatorId: "artist-a",
    inquiryId: "inquiry-a",
    decision: "permitted",
    requiredConditions: [],
    expiresAt: null,
    lifecycleAction: "decision",
    relatedPermissionDecisionId: null,
    createdAt: new Date("2026-07-20T08:00:00.000Z"),
    ...overrides,
  };
}

function originalAction(overrides: Partial<TestHumanActionDecision> = {}): TestHumanActionDecision {
  return {
    id: "action-original",
    operatorId: "artist-a",
    decisionMakerUserId: "artist-a",
    inquiryId: "inquiry-a",
    permissionDecisionId: "permission-current",
    decisionOrigin: "authenticated_human",
    choice: "proceed",
    permissionReviewSummary: "Original permission review",
    rationaleText: "Original human rationale",
    conditionConfirmations: [],
    lifecycleAction: "decision",
    relatedHumanActionDecisionId: null,
    createdAt: new Date("2026-07-20T09:00:00.000Z"),
    ...overrides,
  };
}

function stubStorage(options: {
  permissionDecisions?: TestPermissionDecision[];
  humanActionDecisions?: TestHumanActionDecision[];
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
  const permissionDecisions = [...(options.permissionDecisions ?? [permissionDecision()])];
  const humanActionDecisions = [...(options.humanActionDecisions ?? [])];
  const calls = {
    create: [] as Array<any>,
    get: [] as Array<[string, string, string]>,
    list: [] as Array<[string, string]>,
    getPermission: [] as Array<[string, string, string]>,
    listPermissions: [] as Array<[string, string]>,
  };

  mock.method(storage, "getUser", async (userId: string) => users.get(userId));
  mock.method(storage, "getInquiry", async (inquiryId: string) => inquiries.get(inquiryId));
  mock.method(storage, "getScopedPermissionDecision", async (
    operatorId: string,
    inquiryId: string,
    permissionDecisionId: string,
  ) => {
    calls.getPermission.push([operatorId, inquiryId, permissionDecisionId]);
    return permissionDecisions.find((item) =>
      item.operatorId === operatorId && item.inquiryId === inquiryId && item.id === permissionDecisionId
    );
  });
  mock.method(storage, "listScopedPermissionDecisions", async (operatorId: string, inquiryId: string) => {
    calls.listPermissions.push([operatorId, inquiryId]);
    return permissionDecisions.filter((item) =>
      item.operatorId === operatorId && item.inquiryId === inquiryId
    );
  });
  mock.method(storage, "getHumanActionDecision", async (
    operatorId: string,
    inquiryId: string,
    humanActionDecisionId: string,
  ) => {
    calls.get.push([operatorId, inquiryId, humanActionDecisionId]);
    return humanActionDecisions.find((item) =>
      item.operatorId === operatorId && item.inquiryId === inquiryId && item.id === humanActionDecisionId
    );
  });
  mock.method(storage, "listHumanActionDecisions", async (operatorId: string, inquiryId: string) => {
    calls.list.push([operatorId, inquiryId]);
    return humanActionDecisions
      .filter((item) => item.operatorId === operatorId && item.inquiryId === inquiryId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id));
  });
  mock.method(storage, "createHumanActionDecision", async (
    data: Omit<TestHumanActionDecision, "id" | "createdAt">,
  ) => {
    calls.create.push(data);
    const created: TestHumanActionDecision = {
      ...data,
      id: `action-${humanActionDecisions.length + 1}`,
      createdAt: new Date(`2026-07-20T10:${String(humanActionDecisions.length).padStart(2, "0")}:00.000Z`),
    };
    humanActionDecisions.push(created);
    return created;
  });

  return { calls, humanActionDecisions };
}

test("human action decision endpoints require an authenticated operator", async () => {
  const { calls } = stubStorage();
  const loggedOutList = await invoke(listHandler);
  const loggedOutCreate = await invoke(postHandler, { body: validBody() });
  const clientRead = await invoke(readHandler, { session: { userId: "client-user" } });

  assert.equal(loggedOutList.statusCode, 401);
  assert.equal(loggedOutCreate.statusCode, 401);
  assert.equal(clientRead.statusCode, 403);
  assert.deepEqual(calls.create, []);
});

test("owning operator creates, lists, and reads a choice linked to one exact permission decision", async () => {
  const { calls } = stubStorage();
  const createResult = await invoke(postHandler, {
    session: { userId: "artist-a" },
    body: validBody(),
  });

  assert.equal(createResult.statusCode, 201);
  const created = (createResult.body as any).humanActionDecision as TestHumanActionDecision;
  assert.equal(created.operatorId, "artist-a");
  assert.equal(created.decisionMakerUserId, "artist-a");
  assert.equal(created.decisionOrigin, "authenticated_human");
  assert.equal(created.permissionDecisionId, "permission-current");
  assert.equal(calls.create[0].choice, "proceed");

  const listResult = await invoke(listHandler, { session: { userId: "artist-a" } });
  const readResult = await invoke(readHandler, {
    session: { userId: "artist-a" },
    params: { id: "inquiry-a", humanActionDecisionId: created.id },
  });
  assert.equal(listResult.statusCode, 200);
  assert.equal((listResult.body as any).humanActionDecisions[0].id, created.id);
  assert.equal(readResult.statusCode, 200);
  assert.equal((readResult.body as any).humanActionDecision.id, created.id);
});

test("client identity, AI origin, and execution fields are rejected rather than ignored", async () => {
  const { calls } = stubStorage();
  for (const extra of [
    { operatorId: "artist-b" },
    { decisionMakerUserId: "artist-b" },
    { inquiryId: "inquiry-b" },
    { authorUserId: "artist-b" },
    { decisionOrigin: "ai" },
    { aiGenerated: true },
    { autonomousDecision: true },
    { execute: true },
    { allowedActions: ["send"] },
  ]) {
    const result = await invoke(postHandler, {
      session: { userId: "artist-a" },
      body: validBody(extra),
    });
    assert.equal(result.statusCode, 400);
  }
  assert.deepEqual(calls.create, []);
});

test("another operator cannot create, list, or read human action decisions for an inquiry", async () => {
  const { calls } = stubStorage({ humanActionDecisions: [originalAction()] });
  const request = {
    session: { userId: "artist-b" },
    params: { id: "inquiry-a", humanActionDecisionId: "action-original" },
  };

  assert.equal((await invoke(postHandler, { ...request, body: validBody() })).statusCode, 403);
  assert.equal((await invoke(listHandler, request)).statusCode, 403);
  assert.equal((await invoke(readHandler, request)).statusCode, 403);
  assert.deepEqual(calls.create, []);
  assert.deepEqual(calls.list, []);
  assert.deepEqual(calls.get, []);
});

test("reviewed permission links fail closed across owner and inquiry boundaries", async () => {
  const { calls } = stubStorage({
    permissionDecisions: [
      permissionDecision({ id: "other-owner", operatorId: "artist-b" }),
      permissionDecision({ id: "other-inquiry", inquiryId: "inquiry-c" }),
    ],
  });

  for (const permissionDecisionId of ["other-owner", "other-inquiry", "missing"]) {
    const result = await invoke(postHandler, {
      session: { userId: "artist-a" },
      body: validBody({ permissionDecisionId, choice: "wait" }),
    });
    assert.equal(result.statusCode, 400);
  }
  assert.deepEqual(calls.create, []);
});

test("proceed cannot exceed permission and preserves conditional requirements", async () => {
  const deniedValues = ["wait", "clarification_required", "escalation_required", "not_permitted"] as const;
  const condition = "Provider condition must be confirmed before a later action step";
  const { calls } = stubStorage({
    permissionDecisions: [
      ...deniedValues.map((decision) => permissionDecision({ id: `permission-${decision}`, decision })),
      permissionDecision({
        id: "permission-conditional",
        decision: "permitted_with_conditions",
        requiredConditions: [condition],
      }),
      permissionDecision({ id: "permission-unconditional" }),
    ],
  });

  for (const decision of deniedValues) {
    const result = await invoke(postHandler, {
      session: { userId: "artist-a" },
      body: validBody({ permissionDecisionId: `permission-${decision}` }),
    });
    assert.equal(result.statusCode, 400);
  }

  assert.equal((await invoke(postHandler, {
    session: { userId: "artist-a" },
    body: validBody({ permissionDecisionId: "permission-conditional" }),
  })).statusCode, 400);
  assert.equal((await invoke(postHandler, {
    session: { userId: "artist-a" },
    body: validBody({
      permissionDecisionId: "permission-conditional",
      conditionConfirmations: [condition],
    }),
  })).statusCode, 201);

  assert.equal((await invoke(postHandler, {
    session: { userId: "artist-a" },
    body: validBody({
      permissionDecisionId: "permission-unconditional",
      conditionConfirmations: ["Invented condition"],
    }),
  })).statusCode, 400);
  assert.equal(calls.create.length, 1);
});

test("expired or lifecycle-replaced permission cannot support proceed", async () => {
  const { calls } = stubStorage({
    permissionDecisions: [
      permissionDecision({ id: "permission-expired", expiresAt: new Date("2020-01-01T00:00:00.000Z") }),
      permissionDecision(),
      permissionDecision({
        id: "permission-correction",
        decision: "not_permitted",
        lifecycleAction: "correction",
        relatedPermissionDecisionId: "permission-current",
      }),
    ],
  });
  assert.equal((await invoke(postHandler, {
    session: { userId: "artist-a" },
    body: validBody({ permissionDecisionId: "permission-expired" }),
  })).statusCode, 400);

  assert.equal((await invoke(postHandler, {
    session: { userId: "artist-a" },
    body: validBody(),
  })).statusCode, 400);
  assert.deepEqual(calls.create, []);
});

test("wait, clarify, escalate, and stop remain explicit non-executing human choices", async () => {
  const { calls } = stubStorage({
    permissionDecisions: [permissionDecision({ decision: "not_permitted" })],
  });
  for (const choice of ["wait", "clarify", "escalate", "stop"] as const) {
    const result = await invoke(postHandler, {
      session: { userId: "artist-a" },
      body: validBody({ choice }),
    });
    assert.equal(result.statusCode, 201);
  }
  assert.deepEqual(calls.create.map((call) => call.choice), ["wait", "clarify", "escalate", "stop"]);
});

test("lifecycle records append without mutating the original human choice", async () => {
  const original = originalAction();
  const { humanActionDecisions } = stubStorage({ humanActionDecisions: [original] });

  for (const lifecycleAction of ["correction", "withdrawal", "supersession"] as const) {
    const result = await invoke(postHandler, {
      session: { userId: "artist-a" },
      body: validBody({
        choice: lifecycleAction === "withdrawal" ? "stop" : "wait",
        lifecycleAction,
        relatedHumanActionDecisionId: original.id,
      }),
    });
    assert.equal(result.statusCode, 201);
    assert.equal((result.body as any).humanActionDecision.relatedHumanActionDecisionId, original.id);
  }

  assert.equal(humanActionDecisions.length, 4);
  assert.deepEqual(humanActionDecisions[0], original);
});

test("withdrawal cannot preserve a proceed choice", async () => {
  const { calls } = stubStorage({ humanActionDecisions: [originalAction()] });
  const result = await invoke(postHandler, {
    session: { userId: "artist-a" },
    body: validBody({
      lifecycleAction: "withdrawal",
      relatedHumanActionDecisionId: "action-original",
    }),
  });

  assert.equal(result.statusCode, 400);
  assert.deepEqual(calls.create, []);
});

test("related human choices stay in the same owner, inquiry, and permission scope", async () => {
  const { calls } = stubStorage({
    humanActionDecisions: [
      originalAction({ id: "other-owner", operatorId: "artist-b", decisionMakerUserId: "artist-b" }),
      originalAction({ id: "other-inquiry", inquiryId: "inquiry-c" }),
      originalAction({ id: "other-permission", permissionDecisionId: "permission-other" }),
    ],
  });

  for (const relatedHumanActionDecisionId of ["other-owner", "other-inquiry", "other-permission", "missing"]) {
    const result = await invoke(postHandler, {
      session: { userId: "artist-a" },
      body: validBody({
        choice: "wait",
        lifecycleAction: "correction",
        relatedHumanActionDecisionId,
      }),
    });
    assert.equal(result.statusCode, 400);
  }
  assert.deepEqual(calls.create, []);
});

test("human action surface is private create, list, and read only and cannot execute", async () => {
  const actionRoutes = registeredRoutes.filter((record) =>
    record.path.startsWith("/api/inquiries/:id/human-action-decisions")
  );
  assert.deepEqual(actionRoutes.map((record) => record.method).sort(), ["get", "get", "post"]);

  const routesText = await readFile(new URL("./routes.ts", import.meta.url), "utf8");
  const section = routesText.match(
    /\/\/ --- Inquiry Workspace: private append-only human action decisions ---[\s\S]*?\/\/ --- Inquiry Workspace: private read-only inquiry decision chain ---/,
  )?.[0];
  assert.ok(section, "human action decision route section should exist");
  assert.doesNotMatch(section, /storage\.(?:update|delete)/);
  assert.doesNotMatch(section, /\/assess|sendEmail|sendSms|createInquiryRoute|updateInquiryRoute/);
  assert.doesNotMatch(section, /createContract|createPayment|createSchedule|provider accepted|GoogleGenAI/i);
  assert.doesNotMatch(section, /res\.redirect|fetch\(|axios|execute/i);

  const storageText = await readFile(new URL("./storage.ts", import.meta.url), "utf8");
  assert.doesNotMatch(storageText, /updateHumanActionDecision|deleteHumanActionDecision/);
});

test("schema and startup DDL preserve append-only restrictive constraints and fail closed", async () => {
  const schemaText = await readFile(new URL("../shared/schema.ts", import.meta.url), "utf8");
  const decisions = schemaText.match(
    /export const humanActionDecisions = pgTable\([\s\S]*?export type HumanActionDecision =[^\n]+/,
  )?.[0];
  assert.ok(decisions);
  assert.doesNotMatch(decisions, /updatedAt|deletedAt/);
  assert.equal(decisions.match(/\.references\(\(\) => users\.id, \{ onDelete: "restrict" \}\)/g)?.length, 2);
  assert.match(decisions, /\.references\(\(\) => inquiries\.id, \{ onDelete: "restrict" \}\)/);
  assert.match(decisions, /scopedPermissionDecisions\.id, \{ onDelete: "restrict" \}/);
  assert.match(decisions, /humanActionDecisions\.id, \{ onDelete: "restrict" \}/);
  assert.match(decisions, /human_action_decisions_choice_check/);
  assert.match(decisions, /human_action_decisions_origin_check/);
  assert.match(decisions, /human_action_decisions_lifecycle_link_check/);
  assert.match(decisions, /human_action_decisions_withdrawal_check/);
  assert.match(decisions, /human_action_decisions_condition_shape_check/);

  const indexText = await readFile(new URL("./index.ts", import.meta.url), "utf8");
  const setup = indexText.match(
    /\{ name: 'human_action_decisions\.table'[\s\S]*?\{ name: 'inquiry_responses\.table'/,
  )?.[0];
  assert.ok(setup, "idempotent human action decision startup schema should exist");
  assert.match(setup, /CREATE TABLE IF NOT EXISTS human_action_decisions/);
  assert.equal(setup.match(/NOT VALID/g)?.length, 12);
  assert.equal(setup.match(/VALIDATE CONSTRAINT human_action/g)?.length, 12);
  assert.equal(setup.match(/required: true/g)?.length, 18);
  assert.doesNotMatch(setup, /ON DELETE (?:CASCADE|SET NULL)/i);
  assert.doesNotMatch(setup, /(?:UPDATE|DELETE FROM) human_action/i);
  assert.match(setup, /human_action_decisions_permission_idx/);
  assert.match(setup, /human_action_decisions_related_idx/);
  assert.match(
    indexText,
    /catch \(error: any\) \{[\s\S]*?if \(migration\.required\) \{[\s\S]*?throw error;/,
  );
});
