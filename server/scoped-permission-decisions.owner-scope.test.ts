import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { afterEach, before, mock, test } from "node:test";
import type { Express, Request, Response } from "express";

type Handler = (req: Request, res: Response) => unknown | Promise<unknown>;
type RouteRecord = { method: string; path: string; handlers: Handler[] };
type PermissionValue =
  | "permitted"
  | "permitted_with_conditions"
  | "wait"
  | "clarification_required"
  | "escalation_required"
  | "not_permitted";
type PermissionLifecycle = "decision" | "correction" | "withdrawal" | "supersession";

type TestJudgment = {
  id: string;
  operatorId: string;
  inquiryId: string;
};

type TestPermissionDecision = {
  id: string;
  operatorId: string;
  decisionMakerUserId: string;
  inquiryId: string;
  actorReference: string;
  actorDescription: string;
  proposedAction: string;
  taskContext: string;
  environmentContext: string;
  scopeText: string;
  consequenceLevel: string;
  demonstratedCapability: string;
  capabilityEvidenceBasis: string;
  capabilityScopeAssessment: string;
  capabilityFit: "within_scope" | "partial_or_lower_scope" | "not_demonstrated" | "uncertain";
  authorizationSource: string;
  authorizationState: "established" | "conditional" | "missing" | "unclear";
  judgmentCurrencyBasis: string;
  blockers: string[];
  requiredConditions: string[];
  decision: PermissionValue;
  requiredApproverUserIds: string[];
  expiresAt: Date | null;
  mandatoryReviewTrigger: string | null;
  lifecycleAction: PermissionLifecycle;
  relatedPermissionDecisionId: string | null;
  createdAt: Date;
  linkedJudgmentIds: string[];
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
  process.env.SESSION_SECRET = "scoped-permission-decisions-owner-scope-test";
  process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/scoped_permission_decisions_owner_scope_test";
  process.env.REPL_ID = "scoped-permission-decisions-owner-scope-test";
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
    record.method === "get" && record.path === "/api/inquiries/:id/scoped-permission-decisions"
  );
  const readRoute = registeredRoutes.find((record) =>
    record.method === "get" && record.path === "/api/inquiries/:id/scoped-permission-decisions/:permissionDecisionId"
  );
  const postRoute = registeredRoutes.find((record) =>
    record.method === "post" && record.path === "/api/inquiries/:id/scoped-permission-decisions"
  );

  assert.ok(listRoute, "scoped permission decision list route should be registered");
  assert.ok(readRoute, "scoped permission decision read route should be registered");
  assert.ok(postRoute, "scoped permission decision create route should be registered");
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
    params: { id: "inquiry-a", permissionDecisionId: "permission-original" },
    body: {},
    headers: {},
    ...reqOverrides,
  };
  await handler(req as Request, res as unknown as Response);
  return result();
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    actorReference: "provider-a",
    actorDescription: "The provider proposed to perform the identified bridal HMU work",
    proposedAction: "Prepare the private provider outreach draft for operator review",
    taskContext: "Bridal hair and makeup inquiry with named services",
    environmentContext: "Private operator workspace; no external action",
    scopeText: "This inquiry, provider, date, services, and proposed draft only",
    consequenceLevel: "External outreach could create a real-world coordination commitment",
    demonstratedCapability: "Prior delivery of the same named services under operator oversight",
    capabilityEvidenceBasis: "Private outcome records identified by the operator",
    capabilityScopeAssessment: "Capability is demonstrated only for this task and does not widen authorization",
    capabilityFit: "within_scope",
    authorizationSource: "Operator-reviewed provider and inquiry records",
    authorizationState: "established",
    judgmentCurrencyBasis: "The operator reviewed judgment-1 against the current inquiry context",
    blockers: [],
    requiredConditions: [],
    decision: "permitted",
    decisionMakerUserId: "artist-b",
    requiredApproverUserIds: ["artist-b"],
    mandatoryReviewTrigger: "Review again if provider, date, scope, conditions, or consequence level changes",
    linkedJudgmentIds: ["judgment-1"],
    ...overrides,
  };
}

function originalDecision(overrides: Partial<TestPermissionDecision> = {}): TestPermissionDecision {
  return {
    id: "permission-original",
    operatorId: "artist-a",
    decisionMakerUserId: "artist-a",
    inquiryId: "inquiry-a",
    actorReference: "provider-a",
    actorDescription: "Provider A",
    proposedAction: "Prepare a private draft",
    taskContext: "Task A",
    environmentContext: "Private operator workspace",
    scopeText: "Inquiry A only",
    consequenceLevel: "External commitment risk",
    demonstratedCapability: "Same task evidence",
    capabilityEvidenceBasis: "Outcome record",
    capabilityScopeAssessment: "Within this exact scope",
    capabilityFit: "within_scope",
    authorizationSource: "Operator-reviewed record",
    authorizationState: "established",
    judgmentCurrencyBasis: "Current context reviewed",
    blockers: [],
    requiredConditions: [],
    decision: "permitted",
    requiredApproverUserIds: ["artist-b"],
    expiresAt: null,
    mandatoryReviewTrigger: "Any material context change",
    lifecycleAction: "decision",
    relatedPermissionDecisionId: null,
    createdAt: new Date("2026-07-19T08:00:00.000Z"),
    linkedJudgmentIds: ["judgment-1"],
    ...overrides,
  };
}

function stubStorage(options: {
  judgments?: TestJudgment[];
  permissionDecisions?: TestPermissionDecision[];
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
  const judgments = [...(options.judgments ?? [
    { id: "judgment-1", operatorId: "artist-a", inquiryId: "inquiry-a" },
  ])];
  const permissionDecisions = [...(options.permissionDecisions ?? [])];
  const calls = {
    create: [] as Array<{ data: any; linkedJudgmentIds: string[] }>,
    get: [] as Array<[string, string, string]>,
    list: [] as Array<[string, string]>,
    getJudgment: [] as Array<[string, string, string]>,
  };

  mock.method(storage, "getUser", async (userId: string) => users.get(userId));
  mock.method(storage, "getInquiry", async (inquiryId: string) => inquiries.get(inquiryId));
  mock.method(storage, "getCoordinationJudgment", async (
    operatorId: string,
    inquiryId: string,
    judgmentId: string,
  ) => {
    calls.getJudgment.push([operatorId, inquiryId, judgmentId]);
    return judgments.find((item) =>
      item.operatorId === operatorId && item.inquiryId === inquiryId && item.id === judgmentId
    );
  });
  mock.method(storage, "getScopedPermissionDecision", async (
    operatorId: string,
    inquiryId: string,
    permissionDecisionId: string,
  ) => {
    calls.get.push([operatorId, inquiryId, permissionDecisionId]);
    return permissionDecisions.find((item) =>
      item.operatorId === operatorId && item.inquiryId === inquiryId && item.id === permissionDecisionId
    );
  });
  mock.method(storage, "listScopedPermissionDecisions", async (operatorId: string, inquiryId: string) => {
    calls.list.push([operatorId, inquiryId]);
    return permissionDecisions
      .filter((item) => item.operatorId === operatorId && item.inquiryId === inquiryId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id));
  });
  mock.method(storage, "createScopedPermissionDecision", async (
    data: Omit<TestPermissionDecision, "id" | "createdAt" | "linkedJudgmentIds">,
    linkedJudgmentIds: string[],
  ) => {
    calls.create.push({ data, linkedJudgmentIds });
    const created: TestPermissionDecision = {
      ...data,
      id: `permission-${permissionDecisions.length + 1}`,
      createdAt: new Date(`2026-07-19T09:${String(permissionDecisions.length).padStart(2, "0")}:00.000Z`),
      linkedJudgmentIds: [...linkedJudgmentIds],
    };
    permissionDecisions.push(created);
    return created;
  });

  return { calls, permissionDecisions };
}

test("scoped permission decision endpoints require an authenticated operator", async () => {
  const { calls } = stubStorage();
  const loggedOutList = await invoke(listHandler);
  const loggedOutCreate = await invoke(postHandler, { body: validBody() });
  const clientRead = await invoke(readHandler, { session: { userId: "client-user" } });

  assert.equal(loggedOutList.statusCode, 401);
  assert.equal(loggedOutCreate.statusCode, 401);
  assert.equal(clientRead.statusCode, 403);
  assert.deepEqual(calls.create, []);
});

test("the requesting operator can never satisfy their own approval", async () => {
  const { calls } = stubStorage();
  // Self-approval: the decision maker is the requesting operator.
  assert.equal((await invoke(postHandler, {
    session: { userId: "artist-a" },
    body: validBody({ decisionMakerUserId: "artist-a", requiredApproverUserIds: ["artist-a", "artist-b"] }),
  })).statusCode, 403);
  // Decision maker is not one of the required approvers.
  assert.equal((await invoke(postHandler, {
    session: { userId: "artist-a" },
    body: validBody({ decisionMakerUserId: "artist-c", requiredApproverUserIds: ["artist-b"] }),
  })).statusCode, 403);
  assert.deepEqual(calls.create, []);
});

test("a permission decision expiration must be in the future", async () => {
  const { calls } = stubStorage();
  assert.equal((await invoke(postHandler, {
    session: { userId: "artist-a" },
    body: validBody({ expiresAt: new Date("2020-01-01T00:00:00.000Z").toISOString() }),
  })).statusCode, 400);
  assert.equal((await invoke(postHandler, {
    session: { userId: "artist-a" },
    body: validBody({ expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }),
  })).statusCode, 201);
  assert.equal(calls.create.length, 1);
});

test("owning operator creates, lists, and reads an ordered judgment-linked decision", async () => {
  const { calls } = stubStorage({
    judgments: [
      { id: "judgment-1", operatorId: "artist-a", inquiryId: "inquiry-a" },
      { id: "judgment-2", operatorId: "artist-a", inquiryId: "inquiry-a" },
    ],
  });
  const createResult = await invoke(postHandler, {
    session: { userId: "artist-a" },
    body: validBody({ linkedJudgmentIds: ["judgment-2", "judgment-1"] }),
  });

  assert.equal(createResult.statusCode, 201);
  const created = (createResult.body as any).permissionDecision as TestPermissionDecision;
  assert.equal(created.operatorId, "artist-a");
  assert.equal(created.decisionMakerUserId, "artist-b");
  assert.deepEqual(created.requiredApproverUserIds, ["artist-b"]);
  assert.deepEqual(created.linkedJudgmentIds, ["judgment-2", "judgment-1"]);
  assert.deepEqual(calls.create[0].linkedJudgmentIds, ["judgment-2", "judgment-1"]);

  const listResult = await invoke(listHandler, { session: { userId: "artist-a" } });
  const readResult = await invoke(readHandler, {
    session: { userId: "artist-a" },
    params: { id: "inquiry-a", permissionDecisionId: created.id },
  });
  assert.equal(listResult.statusCode, 200);
  assert.equal((listResult.body as any).permissionDecisions[0].id, created.id);
  assert.equal(readResult.statusCode, 200);
  assert.equal((readResult.body as any).permissionDecision.id, created.id);
});

test("client identity and execution fields are rejected rather than ignored", async () => {
  const { calls } = stubStorage();
  for (const extra of [
    { operatorId: "artist-b" },
    { inquiryId: "inquiry-b" },
    { authorUserId: "artist-b" },
    { allowedActions: ["send"] },
    { humanActionDecision: "proceed" },
    { execute: true },
    { requiredApproverUserIds: [] },
    { requiredApproverUserIds: ["artist-a"] },
    { requiredApproverUserIds: ["artist-b", "artist-b"] },
  ]) {
    const result = await invoke(postHandler, {
      session: { userId: "artist-a" },
      body: validBody(extra),
    });
    assert.equal(result.statusCode, 400);
  }
  assert.deepEqual(calls.create, []);
});

test("another operator cannot create, list, or read permission decisions for an inquiry", async () => {
  const { calls } = stubStorage({ permissionDecisions: [originalDecision()] });
  const request = {
    session: { userId: "artist-b" },
    params: { id: "inquiry-a", permissionDecisionId: "permission-original" },
  };

  assert.equal((await invoke(postHandler, { ...request, body: validBody() })).statusCode, 403);
  assert.equal((await invoke(listHandler, request)).statusCode, 403);
  assert.equal((await invoke(readHandler, request)).statusCode, 403);
  assert.deepEqual(calls.create, []);
  assert.deepEqual(calls.list, []);
  assert.deepEqual(calls.get, []);
});

test("linked judgments fail closed across owner and inquiry boundaries", async () => {
  const { calls } = stubStorage({
    judgments: [
      { id: "other-owner", operatorId: "artist-b", inquiryId: "inquiry-a" },
      { id: "other-inquiry", operatorId: "artist-a", inquiryId: "inquiry-c" },
    ],
  });

  for (const judgmentId of ["other-owner", "other-inquiry", "missing"]) {
    const result = await invoke(postHandler, {
      session: { userId: "artist-a" },
      body: validBody({ linkedJudgmentIds: [judgmentId] }),
    });
    assert.equal(result.statusCode, 400);
  }
  assert.deepEqual(calls.create, []);
});

test("capability remains an input and cannot widen or replace authorization", async () => {
  const { calls } = stubStorage();
  for (const body of [
    validBody({ capabilityFit: "partial_or_lower_scope" }),
    validBody({ capabilityFit: "not_demonstrated" }),
    validBody({ capabilityFit: "uncertain" }),
    validBody({ authorizationState: "missing" }),
    validBody({ authorizationState: "unclear" }),
    validBody({ authorizationState: "conditional" }),
  ]) {
    const result = await invoke(postHandler, { session: { userId: "artist-a" }, body });
    assert.equal(result.statusCode, 400);
  }

  const missingDecision = validBody();
  delete (missingDecision as any).decision;
  assert.equal((await invoke(postHandler, {
    session: { userId: "artist-a" },
    body: missingDecision,
  })).statusCode, 400);
  assert.deepEqual(calls.create, []);
});

test("permission shape preserves conditions, blockers, and mandatory review", async () => {
  const { calls } = stubStorage();
  const invalidBodies = [
    validBody({ blockers: ["Provider condition unresolved"] }),
    validBody({ requiredConditions: ["Operator rechecks date"] }),
    validBody({ decision: "permitted_with_conditions", requiredConditions: [] }),
    validBody({ decision: "wait", authorizationState: "unclear", capabilityFit: "uncertain", blockers: [] }),
    validBody({ mandatoryReviewTrigger: null, expiresAt: null }),
    validBody({ linkedJudgmentIds: [] }),
    validBody({ linkedJudgmentIds: ["judgment-1", "judgment-1"] }),
  ];
  for (const body of invalidBodies) {
    const result = await invoke(postHandler, { session: { userId: "artist-a" }, body });
    assert.equal(result.statusCode, 400);
  }

  const conditional = await invoke(postHandler, {
    session: { userId: "artist-a" },
    body: validBody({
      decision: "permitted_with_conditions",
      authorizationState: "conditional",
      requiredConditions: ["Operator confirms the provider condition before any later action decision"],
    }),
  });
  assert.equal(conditional.statusCode, 201);
  assert.equal(calls.create.length, 1);
});

test("non-permission decisions remain explicit and preserve their blockers", async () => {
  const { calls } = stubStorage();
  for (const decision of ["wait", "clarification_required", "escalation_required", "not_permitted"] as const) {
    const result = await invoke(postHandler, {
      session: { userId: "artist-a" },
      body: validBody({
        decision,
        capabilityFit: "uncertain",
        authorizationState: "unclear",
        blockers: [`${decision} blocker`],
      }),
    });
    assert.equal(result.statusCode, 201);
  }
  assert.deepEqual(calls.create.map((call) => call.data.decision), [
    "wait",
    "clarification_required",
    "escalation_required",
    "not_permitted",
  ]);
});

test("lifecycle records append without mutating the original permission decision", async () => {
  const original = originalDecision();
  const { permissionDecisions } = stubStorage({ permissionDecisions: [original] });

  for (const lifecycleAction of ["correction", "withdrawal", "supersession"] as const) {
    const withdrawalState = lifecycleAction === "withdrawal"
      ? { decision: "not_permitted", blockers: ["The prior permission was withdrawn"] }
      : {};
    const result = await invoke(postHandler, {
      session: { userId: "artist-a" },
      body: validBody({ lifecycleAction, relatedPermissionDecisionId: original.id, ...withdrawalState }),
    });
    assert.equal(result.statusCode, 201);
    assert.equal((result.body as any).permissionDecision.relatedPermissionDecisionId, original.id);
  }

  assert.equal(permissionDecisions.length, 4);
  assert.deepEqual(permissionDecisions[0], original);
});

test("withdrawal cannot preserve or recreate permission", async () => {
  const { calls } = stubStorage({ permissionDecisions: [originalDecision()] });
  const result = await invoke(postHandler, {
    session: { userId: "artist-a" },
    body: validBody({
      lifecycleAction: "withdrawal",
      relatedPermissionDecisionId: "permission-original",
    }),
  });

  assert.equal(result.statusCode, 400);
  assert.deepEqual(calls.create, []);
});

test("prior permission links fail closed across owner and inquiry boundaries", async () => {
  const otherOwner = originalDecision({ id: "other-owner", operatorId: "artist-b", decisionMakerUserId: "artist-b" });
  const otherInquiry = originalDecision({ id: "other-inquiry", inquiryId: "inquiry-c" });
  const { calls } = stubStorage({ permissionDecisions: [otherOwner, otherInquiry] });

  for (const relatedPermissionDecisionId of [otherOwner.id, otherInquiry.id, "missing"]) {
    const result = await invoke(postHandler, {
      session: { userId: "artist-a" },
      body: validBody({ lifecycleAction: "withdrawal", relatedPermissionDecisionId }),
    });
    assert.equal(result.statusCode, 400);
  }
  assert.deepEqual(calls.create, []);
});

test("scoped permission surface is private create/list/read only and cannot execute", async () => {
  const permissionRoutes = registeredRoutes.filter((record) =>
    record.path.startsWith("/api/inquiries/:id/scoped-permission-decisions")
  );
  assert.deepEqual(permissionRoutes.map((record) => record.method).sort(), ["get", "get", "post"]);

  const routesText = await readFile(new URL("./routes.ts", import.meta.url), "utf8");
  const section = routesText.match(
    /\/\/ --- Inquiry Workspace: private append-only scoped permission decisions ---[\s\S]*?\/\/ --- Inquiry Workspace: private append-only human action decisions ---/,
  )?.[0];
  assert.ok(section, "scoped permission decision route section should exist");
  assert.doesNotMatch(section, /storage\.(?:update|delete)/);
  assert.doesNotMatch(section, /\/assess|sendEmail|sendSms|createInquiryRoute|updateInquiryRoute/);
  assert.doesNotMatch(section, /createContract|createPayment|createSchedule|provider accepted|humanActionDecision/i);

  const storageText = await readFile(new URL("./storage.ts", import.meta.url), "utf8");
  assert.doesNotMatch(storageText, /updateScopedPermissionDecision|deleteScopedPermissionDecision/);
  assert.match(storageText, /db\.transaction[\s\S]*?scopedPermissionDecisionJudgments/);
  assert.match(storageText, /orderBy\(asc\(scopedPermissionDecisionJudgments\.position\)\)/);
});

test("schema and startup DDL preserve append-only constraints and fail closed", async () => {
  const schemaText = await readFile(new URL("../shared/schema.ts", import.meta.url), "utf8");
  const decisions = schemaText.match(
    /export const scopedPermissionDecisions = pgTable\([\s\S]*?export type ScopedPermissionDecision =[^\n]+/,
  )?.[0];
  const links = schemaText.match(
    /export const scopedPermissionDecisionJudgments = pgTable\([\s\S]*?export type ScopedPermissionDecisionJudgment =[^;]+;/,
  )?.[0];
  assert.ok(decisions);
  assert.ok(links);
  assert.doesNotMatch(decisions, /updatedAt|deletedAt/);
  assert.equal(decisions.match(/\.references\(\(\) => users\.id, \{ onDelete: "restrict" \}\)/g)?.length, 2);
  assert.match(decisions, /\.references\(\(\) => inquiries\.id, \{ onDelete: "restrict" \}\)/);
  assert.match(decisions, /scopedPermissionDecisions\.id, \{ onDelete: "restrict" \}/);
  assert.match(decisions, /scoped_permission_decisions_permission_inputs_check/);
  assert.match(decisions, /scoped_permission_decisions_permission_shape_check/);
  assert.match(decisions, /scoped_permission_decisions_review_trigger_check/);
  assert.match(decisions, /scoped_permission_decisions_withdrawal_check/);
  assert.match(links, /scopedPermissionDecisions\.id, \{ onDelete: "restrict" \}/);
  assert.match(links, /coordinationJudgments\.id, \{ onDelete: "restrict" \}/);
  assert.match(links, /scoped_permission_decision_judgments_position_check/);

  const indexText = await readFile(new URL("./index.ts", import.meta.url), "utf8");
  const setup = indexText.match(
    /\{ name: 'scoped_permission_decisions\.table'[\s\S]*?\{ name: 'human_action_decisions\.table'/,
  )?.[0];
  assert.ok(setup, "idempotent scoped permission decision startup schema should exist");
  assert.match(setup, /CREATE TABLE IF NOT EXISTS scoped_permission_decisions/);
  assert.match(setup, /CREATE TABLE IF NOT EXISTS scoped_permission_decision_judgments/);
  assert.equal(setup.match(/NOT VALID/g)?.length, 17);
  assert.equal(setup.match(/VALIDATE CONSTRAINT scoped_permission/g)?.length, 17);
  assert.equal(setup.match(/required: true/g)?.length, 28);
  assert.doesNotMatch(setup, /ON DELETE (?:CASCADE|SET NULL)/i);
  assert.doesNotMatch(setup, /(?:UPDATE|DELETE FROM) scoped_permission/i);
  assert.match(setup, /scoped_permission_decision_judgments_unique/);
  assert.match(setup, /scoped_permission_decision_judgments_position_unique/);
  assert.match(
    indexText,
    /catch \(error: any\) \{[\s\S]*?if \(migration\.required\) \{[\s\S]*?throw error;/,
  );
});
