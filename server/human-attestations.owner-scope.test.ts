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

type TestAttestation = {
  id: string;
  operatorId: string;
  authorUserId: string;
  inquiryId: string;
  claimText: string;
  authorCapacity: string;
  knowledgeBasis: "firsthand" | "relayed" | "evidence_review";
  lifecycleAction: "attestation" | "correction" | "withdrawal" | "challenge" | "supersession";
  relatedAttestationId: string | null;
  createdAt: Date;
};

let getAttestationsHandler: Handler;
let postAttestationHandler: Handler;
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
  process.env.SESSION_SECRET = "human-attestations-owner-scope-test";
  process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/human_attestations_owner_scope_test";
  process.env.REPL_ID = "human-attestations-owner-scope-test";
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

  const getRoute = registeredRoutes.find(
    (record) => record.method === "get" && record.path === "/api/inquiries/:id/human-attestations",
  );
  assert.ok(getRoute, "GET /api/inquiries/:id/human-attestations should be registered");
  getAttestationsHandler = getRoute.handlers.at(-1) as Handler;

  const postRoute = registeredRoutes.find(
    (record) => record.method === "post" && record.path === "/api/inquiries/:id/human-attestations",
  );
  assert.ok(postRoute, "POST /api/inquiries/:id/human-attestations should be registered");
  postAttestationHandler = postRoute.handlers.at(-1) as Handler;
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

function validAttestationBody(overrides: Record<string, unknown> = {}) {
  return {
    claimText: "I reviewed the provider's message and it includes a condition.",
    authorCapacity: "Operator reviewing the inquiry record",
    knowledgeBasis: "evidence_review",
    ...overrides,
  };
}

function stubAttestationStorage(initialAttestations: TestAttestation[] = []) {
  const users = new Map<string, { id: string; role: string; email: string }>([
    ["artist-a", { id: "artist-a", role: "artist", email: "artist-a@example.com" }],
    ["artist-b", { id: "artist-b", role: "artist", email: "artist-b@example.com" }],
    ["client-user", { id: "client-user", role: "client", email: "client@example.com" }],
  ]);
  const inquiries = new Map<string, { id: string; vendorId: string }>([
    ["inquiry-a", { id: "inquiry-a", vendorId: "artist-a" }],
    ["inquiry-b", { id: "inquiry-b", vendorId: "artist-b" }],
    ["inquiry-c", { id: "inquiry-c", vendorId: "artist-a" }],
  ]);
  const attestations = [...initialAttestations];
  const calls = {
    getUser: [] as string[],
    getInquiry: [] as string[],
    createHumanAttestation: [] as any[],
    getHumanAttestation: [] as Array<[string, string, string]>,
    listHumanAttestations: [] as Array<[string, string]>,
  };

  mock.method(storage, "getUser", async (userId: string) => {
    calls.getUser.push(userId);
    return users.get(userId);
  });
  mock.method(storage, "getInquiry", async (inquiryId: string) => {
    calls.getInquiry.push(inquiryId);
    return inquiries.get(inquiryId);
  });
  mock.method(storage, "createHumanAttestation", async (data: Omit<TestAttestation, "id" | "createdAt">) => {
    calls.createHumanAttestation.push(data);
    const created: TestAttestation = {
      ...data,
      id: `attestation-${attestations.length + 1}`,
      createdAt: new Date(`2026-07-16T12:${String(attestations.length).padStart(2, "0")}:00.000Z`),
    };
    attestations.push(created);
    return created;
  });
  mock.method(storage, "getHumanAttestation", async (
    operatorId: string,
    inquiryId: string,
    attestationId: string,
  ) => {
    calls.getHumanAttestation.push([operatorId, inquiryId, attestationId]);
    return attestations.find((attestation) =>
      attestation.operatorId === operatorId
      && attestation.inquiryId === inquiryId
      && attestation.id === attestationId
    );
  });
  mock.method(storage, "listHumanAttestations", async (operatorId: string, inquiryId: string) => {
    calls.listHumanAttestations.push([operatorId, inquiryId]);
    return attestations
      .filter((attestation) => attestation.operatorId === operatorId && attestation.inquiryId === inquiryId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id));
  });

  return { attestations, calls };
}

test("human attestation endpoints require an authenticated operator", async () => {
  const { calls } = stubAttestationStorage();

  const loggedOutGet = await invoke(getAttestationsHandler);
  const loggedOutPost = await invoke(postAttestationHandler, { body: validAttestationBody() });
  const clientGet = await invoke(getAttestationsHandler, { session: { userId: "client-user" } });

  assert.equal(loggedOutGet.statusCode, 401);
  assert.equal(loggedOutPost.statusCode, 401);
  assert.equal(clientGet.statusCode, 403);
  assert.deepEqual(calls.createHumanAttestation, []);
  assert.deepEqual(calls.listHumanAttestations, []);
});

test("owning operator can create an attestation anchored to the inquiry", async () => {
  const { calls } = stubAttestationStorage();

  const result = await invoke(postAttestationHandler, {
    session: { userId: "artist-a" },
    params: { id: "inquiry-a" },
    body: validAttestationBody(),
  });

  assert.equal(result.statusCode, 201);
  assert.equal((result.body as any).attestation.inquiryId, "inquiry-a");
  assert.equal((result.body as any).attestation.authorUserId, "artist-a");
  assert.deepEqual(calls.createHumanAttestation[0], {
    operatorId: "artist-a",
    authorUserId: "artist-a",
    inquiryId: "inquiry-a",
    claimText: "I reviewed the provider's message and it includes a condition.",
    authorCapacity: "Operator reviewing the inquiry record",
    knowledgeBasis: "evidence_review",
    lifecycleAction: "attestation",
    relatedAttestationId: null,
  });

  const readBack = await invoke(getAttestationsHandler, {
    session: { userId: "artist-a" },
    params: { id: "inquiry-a" },
  });
  assert.equal(readBack.statusCode, 200);
  assert.equal((readBack.body as any).attestations[0].inquiryId, "inquiry-a");
  assert.equal((readBack.body as any).attestations[0].id, (result.body as any).attestation.id);
});

test("author and owner identity cannot be supplied by the client", async () => {
  const { calls } = stubAttestationStorage();

  const result = await invoke(postAttestationHandler, {
    session: { userId: "artist-a" },
    body: validAttestationBody({
      authorUserId: "artist-b",
      operatorId: "artist-b",
    }),
  });

  assert.equal(result.statusCode, 400);
  assert.deepEqual(calls.createHumanAttestation, []);
});

test("an operator cannot create or list attestations for another operator's inquiry", async () => {
  const { calls } = stubAttestationStorage();

  const postResult = await invoke(postAttestationHandler, {
    session: { userId: "artist-a" },
    params: { id: "inquiry-b" },
    body: validAttestationBody(),
  });
  const getResult = await invoke(getAttestationsHandler, {
    session: { userId: "artist-a" },
    params: { id: "inquiry-b" },
  });

  assert.equal(postResult.statusCode, 403);
  assert.equal(getResult.statusCode, 403);
  assert.deepEqual(calls.createHumanAttestation, []);
  assert.deepEqual(calls.listHumanAttestations, []);
});

test("attestations are listed in deterministic chronological order", async () => {
  const later: TestAttestation = {
    id: "attestation-z",
    operatorId: "artist-a",
    authorUserId: "artist-a",
    inquiryId: "inquiry-a",
    claimText: "Later claim",
    authorCapacity: "Participant",
    knowledgeBasis: "firsthand",
    lifecycleAction: "attestation",
    relatedAttestationId: null,
    createdAt: new Date("2026-07-16T14:00:00.000Z"),
  };
  const earlier = { ...later, id: "attestation-a", claimText: "Earlier claim", createdAt: new Date("2026-07-16T13:00:00.000Z") };
  stubAttestationStorage([later, earlier]);

  const result = await invoke(getAttestationsHandler, {
    session: { userId: "artist-a" },
  });

  assert.equal(result.statusCode, 200);
  assert.deepEqual((result.body as any).attestations.map((item: TestAttestation) => item.id), [
    "attestation-a",
    "attestation-z",
  ]);
});

test("correction, withdrawal, challenge, and supersession append linked records", async () => {
  const original: TestAttestation = {
    id: "attestation-original",
    operatorId: "artist-a",
    authorUserId: "artist-a",
    inquiryId: "inquiry-a",
    claimText: "Original claim",
    authorCapacity: "Participant",
    knowledgeBasis: "firsthand",
    lifecycleAction: "attestation",
    relatedAttestationId: null,
    createdAt: new Date("2026-07-16T11:00:00.000Z"),
  };
  const { attestations } = stubAttestationStorage([original]);

  for (const lifecycleAction of ["correction", "withdrawal", "challenge", "supersession"] as const) {
    const result = await invoke(postAttestationHandler, {
      session: { userId: "artist-a" },
      body: validAttestationBody({
        claimText: `${lifecycleAction} record`,
        lifecycleAction,
        relatedAttestationId: original.id,
      }),
    });
    assert.equal(result.statusCode, 201);
    assert.equal((result.body as any).attestation.relatedAttestationId, original.id);
  }

  assert.equal(attestations.length, 5);
  assert.deepEqual(attestations[0], original, "the original attestation must remain unchanged");
});

test("lifecycle links fail closed across owner and inquiry boundaries", async () => {
  const otherOwnerSameInquiry: TestAttestation = {
    id: "attestation-other-owner",
    operatorId: "artist-b",
    authorUserId: "artist-b",
    inquiryId: "inquiry-a",
    claimText: "Other operator claim",
    authorCapacity: "Participant",
    knowledgeBasis: "firsthand",
    lifecycleAction: "attestation",
    relatedAttestationId: null,
    createdAt: new Date("2026-07-16T11:00:00.000Z"),
  };
  const sameOwnerOtherInquiry: TestAttestation = {
    ...otherOwnerSameInquiry,
    id: "attestation-other-inquiry",
    operatorId: "artist-a",
    authorUserId: "artist-a",
    inquiryId: "inquiry-c",
    claimText: "Other inquiry claim",
  };
  const { calls } = stubAttestationStorage([otherOwnerSameInquiry, sameOwnerOtherInquiry]);

  for (const relatedAttestationId of [otherOwnerSameInquiry.id, sameOwnerOtherInquiry.id]) {
    const result = await invoke(postAttestationHandler, {
      session: { userId: "artist-a" },
      body: validAttestationBody({
        lifecycleAction: "challenge",
        relatedAttestationId,
      }),
    });

    assert.equal(result.statusCode, 400);
  }
  assert.deepEqual(calls.getHumanAttestation, [
    ["artist-a", "inquiry-a", "attestation-other-owner"],
    ["artist-a", "inquiry-a", "attestation-other-inquiry"],
  ]);
  assert.deepEqual(calls.createHumanAttestation, []);
});

test("knowledge basis is required and relayed or reviewed claims stay non-firsthand", async () => {
  const { calls } = stubAttestationStorage();

  for (const knowledgeBasis of ["relayed", "evidence_review"] as const) {
    const result = await invoke(postAttestationHandler, {
      session: { userId: "artist-a" },
      body: validAttestationBody({ knowledgeBasis }),
    });
    assert.equal(result.statusCode, 201);
    assert.equal((result.body as any).attestation.knowledgeBasis, knowledgeBasis);
  }

  const missingBasis = await invoke(postAttestationHandler, {
    session: { userId: "artist-a" },
    body: {
      claimText: "Claim without a basis",
      authorCapacity: "Operator",
    },
  });
  assert.equal(missingBasis.statusCode, 400);
  assert.deepEqual(calls.createHumanAttestation.map((item) => item.knowledgeBasis), ["relayed", "evidence_review"]);
});

test("invalid lifecycle linkage is rejected before persistence", async () => {
  const { calls } = stubAttestationStorage();

  const linkedOriginal = await invoke(postAttestationHandler, {
    session: { userId: "artist-a" },
    body: validAttestationBody({ relatedAttestationId: "attestation-1" }),
  });
  const unlinkedCorrection = await invoke(postAttestationHandler, {
    session: { userId: "artist-a" },
    body: validAttestationBody({ lifecycleAction: "correction" }),
  });

  assert.equal(linkedOriginal.statusCode, 400);
  assert.equal(unlinkedCorrection.statusCode, 400);
  assert.deepEqual(calls.createHumanAttestation, []);
});

test("human attestation surface is create/list only and grants no action authority", async () => {
  const attestationRoutes = registeredRoutes.filter((record) =>
    record.path === "/api/inquiries/:id/human-attestations"
  );
  assert.deepEqual(attestationRoutes.map((record) => record.method).sort(), ["get", "post"]);

  const routesText = await readFile(new URL("./routes.ts", import.meta.url), "utf8");
  const section = routesText.match(
    /\/\/ --- Inquiry Workspace: private append-only human attestations ---[\s\S]*?\/\/ --- Composer:/,
  )?.[0];
  assert.ok(section, "human attestation route section should exist");
  assert.doesNotMatch(section, /storage\.update/);
  assert.doesNotMatch(section, /storage\.delete/);
  assert.doesNotMatch(section, /\/assess|sendEmail|sendSms|createInquiryRoute|updateInquiryRoute/);
  assert.doesNotMatch(section, /createContract|createPayment|createSchedule|provider accepted/i);

  const storageText = await readFile(new URL("./storage.ts", import.meta.url), "utf8");
  assert.doesNotMatch(storageText, /updateHumanAttestation|deleteHumanAttestation/);
  const listMethod = storageText.match(
    /async listHumanAttestations\([\s\S]*?\.orderBy\([^;]+;/,
  )?.[0];
  assert.ok(listMethod, "human attestation list storage method should exist");
  assert.match(
    listMethod,
    /asc\(humanAttestations\.createdAt\), asc\(humanAttestations\.id\)/,
    "storage must make chronological ties deterministic",
  );

  const schemaText = await readFile(new URL("../shared/schema.ts", import.meta.url), "utf8");
  const table = schemaText.match(/export const humanAttestations = pgTable\([\s\S]*?export type HumanAttestation =[^\n]+/)?.[0];
  assert.ok(table, "human attestations schema should exist");
  assert.doesNotMatch(table, /updatedAt|deletedAt/);
  assert.match(table, /human_attestations_lifecycle_link_check/);
  assert.equal(
    table.match(/\.references\(\(\) => users\.id, \{ onDelete: "restrict" \}\)/g)?.length,
    2,
    "operator and authenticated author should reference users",
  );
  assert.match(table, /\.references\(\(\) => inquiries\.id, \{ onDelete: "restrict" \}\)/);
  assert.match(
    table,
    /\.references\(\(\): AnyPgColumn => humanAttestations\.id, \{ onDelete: "restrict" \}\)/,
  );
});

test("startup schema setup is additive, constrained, and indexed", async () => {
  const indexText = await readFile(new URL("./index.ts", import.meta.url), "utf8");
  const setup = indexText.match(
    /\{ name: 'human_attestations\.table'[\s\S]*?\{ name: 'inquiry_responses\.table'/,
  )?.[0];

  assert.ok(setup, "idempotent human_attestations startup schema should exist");
  assert.match(setup, /CREATE TABLE IF NOT EXISTS human_attestations/);
  assert.match(setup, /human_attestations_knowledge_basis_check/);
  assert.match(setup, /human_attestations_lifecycle_action_check/);
  assert.match(setup, /human_attestations_lifecycle_link_check/);
  assert.match(setup, /human_attestations_operator_fk[\s\S]*?FOREIGN KEY \(operator_id\) REFERENCES users\(id\) ON DELETE RESTRICT/);
  assert.match(setup, /human_attestations_author_fk[\s\S]*?FOREIGN KEY \(author_user_id\) REFERENCES users\(id\) ON DELETE RESTRICT/);
  assert.match(setup, /human_attestations_inquiry_fk[\s\S]*?FOREIGN KEY \(inquiry_id\) REFERENCES inquiries\(id\) ON DELETE RESTRICT/);
  assert.match(setup, /human_attestations_related_fk[\s\S]*?FOREIGN KEY \(related_attestation_id\) REFERENCES human_attestations\(id\) ON DELETE RESTRICT/);
  assert.match(setup, /pg_constraint/);
  assert.match(
    setup,
    /human_attestations_knowledge_basis_check[\s\S]*?CHECK \(knowledge_basis IN \('firsthand', 'relayed', 'evidence_review'\)\) NOT VALID/,
  );
  assert.match(
    setup,
    /human_attestations_lifecycle_action_check[\s\S]*?CHECK \(lifecycle_action IN \('attestation', 'correction', 'withdrawal', 'challenge', 'supersession'\)\) NOT VALID/,
  );
  assert.match(
    setup,
    /human_attestations_lifecycle_link_check[\s\S]*?CHECK \([\s\S]*?lifecycle_action = 'attestation'[\s\S]*?\) NOT VALID/,
  );
  assert.equal(
    setup.match(/NOT VALID/g)?.length,
    7,
    "existing-table foreign keys and check constraints should protect new writes before validation",
  );
  assert.equal(setup.match(/VALIDATE CONSTRAINT human_attestations_/g)?.length, 7);
  assert.equal(
    setup.match(/required: true/g)?.length,
    10,
    "table creation, foreign-key/check installation, and all validation steps must fail startup closed",
  );
  assert.doesNotMatch(setup, /ON DELETE (?:CASCADE|SET NULL)/i);
  assert.match(setup, /human_attestations_operator_inquiry_created_idx/);
  assert.match(setup, /human_attestations_related_idx/);
  assert.match(
    indexText,
    /catch \(error: any\) \{[\s\S]*?if \(migration\.required\) \{[\s\S]*?throw error;/,
    "required attestation persistence migrations must stop startup on failure",
  );
});
