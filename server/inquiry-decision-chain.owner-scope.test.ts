import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { afterEach, before, mock, test } from "node:test";
import type { Express, Request, Response } from "express";
import { buildInquiryDecisionChain } from "./inquiry-decision-chain";

type Handler = (req: Request, res: Response) => unknown | Promise<unknown>;
type RouteRecord = { method: string; path: string; handlers: Handler[] };

let getHandler: Handler;
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
  process.env.SESSION_SECRET = "inquiry-decision-chain-owner-scope-test";
  process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/inquiry_decision_chain_owner_scope_test";
  process.env.REPL_ID = "inquiry-decision-chain-owner-scope-test";
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
  const route = registeredRoutes.find((record) =>
    record.method === "get" && record.path === "/api/inquiries/:id/decision-chain"
  );
  assert.ok(route, "private inquiry decision-chain GET route should be registered");
  getHandler = route.handlers.at(-1) as Handler;
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

async function invoke(reqOverrides: Record<string, unknown> = {}) {
  const { res, result } = createResponse();
  const req = {
    params: { id: "inquiry-a" },
    body: {},
    headers: {},
    ...reqOverrides,
  };
  await getHandler(req as unknown as Request, res as unknown as Response);
  return result();
}

function judgment(overrides: Record<string, unknown> = {}) {
  return {
    id: "judgment-a",
    operatorId: "artist-a",
    authorUserId: "artist-a",
    inquiryId: "inquiry-a",
    subjectText: "Provider response evidence",
    scopeText: "This inquiry only",
    judgmentText: "Human review remains required",
    rationaleText: "Based on identified records",
    evidenceBasis: "Private evidence",
    lifecycleAction: "judgment",
    relatedJudgmentId: null,
    createdAt: new Date("2026-07-20T09:00:00.000Z"),
    supportingAttestationIds: ["attestation-a"],
    ...overrides,
  } as any;
}

function permissionDecision(overrides: Record<string, unknown> = {}) {
  return {
    id: "permission-a",
    operatorId: "artist-a",
    decisionMakerUserId: "artist-a",
    inquiryId: "inquiry-a",
    actorReference: "operator",
    actorDescription: "Authenticated operator",
    proposedAction: "Review a private response draft",
    taskContext: "Inquiry review",
    environmentContext: "Private workspace",
    scopeContext: "No external action",
    consequenceLevel: "low",
    demonstratedCapability: "Operator review",
    capabilityFit: "within_scope",
    authorizationSource: "Authenticated operator role",
    authorizationState: "verified",
    blockers: [],
    requiredConditions: [],
    decision: "permitted",
    permissionRationale: "Private review only",
    mandatoryReviewTrigger: null,
    expiresAt: null,
    lifecycleAction: "decision",
    relatedPermissionDecisionId: null,
    createdAt: new Date("2026-07-20T10:00:00.000Z"),
    linkedJudgmentIds: ["judgment-a"],
    ...overrides,
  } as any;
}

function humanActionDecision(overrides: Record<string, unknown> = {}) {
  return {
    id: "action-a",
    operatorId: "artist-a",
    decisionMakerUserId: "artist-a",
    inquiryId: "inquiry-a",
    permissionDecisionId: "permission-a",
    decisionOrigin: "authenticated_human",
    choice: "wait",
    permissionReviewSummary: "Reviewed the exact permission decision",
    rationaleText: "No external action is authorized",
    conditionConfirmations: [],
    lifecycleAction: "decision",
    relatedHumanActionDecisionId: null,
    createdAt: new Date("2026-07-20T11:00:00.000Z"),
    ...overrides,
  } as any;
}

function stubStorage(options: {
  attestations?: Array<{ id: string }>;
  judgments?: any[];
  permissionDecisions?: any[];
  humanActionDecisions?: any[];
} = {}) {
  const calls = {
    attestations: [] as Array<[string, string]>,
    judgments: [] as Array<[string, string]>,
    permissions: [] as Array<[string, string]>,
    actions: [] as Array<[string, string]>,
  };
  const users = new Map([
    ["artist-a", { id: "artist-a", role: "artist" }],
    ["artist-b", { id: "artist-b", role: "artist" }],
  ]);
  const inquiries = new Map([
    ["inquiry-a", { id: "inquiry-a", vendorId: "artist-a" }],
    ["inquiry-b", { id: "inquiry-b", vendorId: "artist-b" }],
  ]);

  mock.method(storage, "getUser", async (id: string) => users.get(id));
  mock.method(storage, "getInquiry", async (id: string) => inquiries.get(id));
  mock.method(storage, "listHumanAttestations", async (operatorId: string, inquiryId: string) => {
    calls.attestations.push([operatorId, inquiryId]);
    return options.attestations ?? [{ id: "attestation-a" }];
  });
  mock.method(storage, "listCoordinationJudgments", async (operatorId: string, inquiryId: string) => {
    calls.judgments.push([operatorId, inquiryId]);
    return options.judgments ?? [judgment()];
  });
  mock.method(storage, "listScopedPermissionDecisions", async (operatorId: string, inquiryId: string) => {
    calls.permissions.push([operatorId, inquiryId]);
    return options.permissionDecisions ?? [permissionDecision()];
  });
  mock.method(storage, "listHumanActionDecisions", async (operatorId: string, inquiryId: string) => {
    calls.actions.push([operatorId, inquiryId]);
    return options.humanActionDecisions ?? [humanActionDecision()];
  });

  return calls;
}

test("inquiry decision chain requires an authenticated operator", async () => {
  const calls = stubStorage();
  const result = await invoke();
  assert.equal(result.statusCode, 401);
  assert.deepEqual(calls.judgments, []);
});

test("owning operator reads the inquiry-scoped decision chain", async () => {
  const calls = stubStorage();
  const result = await invoke({ session: { userId: "artist-a" } });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(calls.attestations, [["artist-a", "inquiry-a"]]);
  assert.deepEqual(calls.judgments, [["artist-a", "inquiry-a"]]);
  assert.deepEqual(calls.permissions, [["artist-a", "inquiry-a"]]);
  assert.deepEqual(calls.actions, [["artist-a", "inquiry-a"]]);
  const decisionChain = (result.body as any).decisionChain;
  assert.deepEqual(decisionChain.records.map((record: any) => record.id), [
    "judgment-a",
    "permission-a",
    "action-a",
  ]);
  assert.deepEqual(decisionChain.provenanceGaps, []);
});

test("another operator cannot read an inquiry decision chain", async () => {
  const calls = stubStorage();
  const result = await invoke({ session: { userId: "artist-b" } });
  assert.equal(result.statusCode, 403);
  assert.deepEqual(calls.permissions, []);
});

test("an operator cannot read a decision chain for another inquiry", async () => {
  const calls = stubStorage();
  const result = await invoke({
    session: { userId: "artist-a" },
    params: { id: "inquiry-b" },
  });
  assert.equal(result.statusCode, 403);
  assert.deepEqual(calls.actions, []);
});

test("decision-chain ordering is deterministic across record kinds", () => {
  const sameTime = new Date("2026-07-20T12:00:00.000Z");
  const input = {
    operatorId: "artist-a",
    inquiryId: "inquiry-a",
    knownAttestationIds: ["attestation-a"],
    judgments: [judgment({ createdAt: sameTime })],
    permissionDecisions: [permissionDecision({ createdAt: sameTime })],
    humanActionDecisions: [humanActionDecision({ createdAt: sameTime })],
  };
  const first = buildInquiryDecisionChain(input);
  const second = buildInquiryDecisionChain(input);
  assert.deepEqual(first, second);
  assert.deepEqual(first.records.map((record) => record.recordType), [
    "coordination_judgment",
    "scoped_permission_decision",
    "human_action_decision",
  ]);
});

test("lifecycle records and their original links remain visible", () => {
  const result = buildInquiryDecisionChain({
    operatorId: "artist-a",
    inquiryId: "inquiry-a",
    knownAttestationIds: ["attestation-a"],
    judgments: [
      judgment(),
      judgment({
        id: "judgment-correction",
        lifecycleAction: "correction",
        relatedJudgmentId: "judgment-a",
        createdAt: new Date("2026-07-20T12:00:00.000Z"),
      }),
    ],
    permissionDecisions: [
      permissionDecision(),
      permissionDecision({
        id: "permission-withdrawal",
        lifecycleAction: "withdrawal",
        relatedPermissionDecisionId: "permission-a",
        decision: "not_permitted",
        createdAt: new Date("2026-07-20T13:00:00.000Z"),
      }),
    ],
    humanActionDecisions: [
      humanActionDecision(),
      humanActionDecision({
        id: "action-supersession",
        lifecycleAction: "supersession",
        relatedHumanActionDecisionId: "action-a",
        createdAt: new Date("2026-07-20T14:00:00.000Z"),
      }),
    ],
  });
  assert.equal(result.records.length, 6);
  assert.deepEqual(
    result.records.filter((record) => record.relatedRecordId).map((record) => ({
      id: record.id,
      lifecycleAction: record.lifecycleAction,
      relatedRecordId: record.relatedRecordId,
    })),
    [
      { id: "judgment-correction", lifecycleAction: "correction", relatedRecordId: "judgment-a" },
      { id: "permission-withdrawal", lifecycleAction: "withdrawal", relatedRecordId: "permission-a" },
      { id: "action-supersession", lifecycleAction: "supersession", relatedRecordId: "action-a" },
    ],
  );
});

test("missing provenance is reported without manufacturing replacement records", () => {
  const result = buildInquiryDecisionChain({
    operatorId: "artist-a",
    inquiryId: "inquiry-a",
    knownAttestationIds: [],
    judgments: [judgment({ relatedJudgmentId: "missing-judgment" })],
    permissionDecisions: [permissionDecision({
      linkedJudgmentIds: ["missing-linked-judgment"],
      relatedPermissionDecisionId: "missing-permission",
    })],
    humanActionDecisions: [humanActionDecision({
      permissionDecisionId: "missing-reviewed-permission",
      relatedHumanActionDecisionId: "missing-action",
    })],
  });
  assert.deepEqual(result.provenanceGaps.map((gap) => gap.referenceType), [
    "supporting_attestation",
    "related_judgment",
    "linked_judgment",
    "related_permission_decision",
    "reviewed_permission_decision",
    "related_human_action_decision",
  ]);
  assert.equal(result.records.length, 3);
});

test("projection fails closed when storage returns an out-of-scope record", () => {
  assert.throws(() => buildInquiryDecisionChain({
    operatorId: "artist-a",
    inquiryId: "inquiry-a",
    knownAttestationIds: [],
    judgments: [judgment({ operatorId: "artist-b" })],
    permissionDecisions: [],
    humanActionDecisions: [],
  }), /outside the requested operator and inquiry scope/);
});

test("decision chain is GET-only and introduces no mutation or executor surface", async () => {
  const chainRoutes = registeredRoutes.filter((record) =>
    record.path === "/api/inquiries/:id/decision-chain"
  );
  assert.deepEqual(chainRoutes.map((record) => record.method), ["get"]);

  const routesText = await readFile(new URL("./routes.ts", import.meta.url), "utf8");
  const section = routesText.match(
    /\/\/ --- Inquiry Workspace: private read-only inquiry decision chain ---[\s\S]*?\/\/ --- Composer:/,
  )?.[0];
  assert.ok(section, "private read-only decision-chain route section should exist");
  assert.doesNotMatch(section, /app\.(?:post|put|patch|delete)/);
  assert.doesNotMatch(section, /storage\.(?:create|update|delete)/);
  assert.doesNotMatch(section, /sendEmail|sendSms|createInquiryRoute|createContract|createPayment|createSchedule/);
  assert.doesNotMatch(section, /GoogleGenAI|\/assess|fetch\(|axios|res\.redirect|execute/i);
});

test("read model adds no table and no storage mutation method", async () => {
  const sourceText = await readFile(new URL("./inquiry-decision-chain.ts", import.meta.url), "utf8");
  assert.doesNotMatch(sourceText, /pgTable|insert|update|delete|transaction|db\./i);
  assert.doesNotMatch(sourceText, /verdict|score|policy engine|attestationText|judgmentText\s*=/i);

  const storageText = await readFile(new URL("./storage.ts", import.meta.url), "utf8");
  assert.doesNotMatch(storageText, /createInquiryDecisionChain|updateInquiryDecisionChain|deleteInquiryDecisionChain/);
});
