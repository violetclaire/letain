import assert from "node:assert/strict";
import { afterEach, before, mock, test } from "node:test";
import type { Express, Request, Response } from "express";

type Handler = (req: Request, res: Response) => unknown | Promise<unknown>;
type RouteRecord = {
  method: string;
  path: string;
  handlers: Handler[];
};

type TestScheduleDraft = {
  id: string;
  artistId: string;
  title: string | null;
  updatedAt?: Date | string | null;
  providers: Array<{
    id: string;
    name: string;
    capability?: "ALL" | "HAIR_ONLY" | "MAKEUP_ONLY";
    isPrimary?: boolean;
    serviceDurations?: Record<string, number>;
  }>;
  engineMetadata?: Record<string, string>;
};

let postScheduleDraftHandler: Handler;
let patchScheduleDraftHandler: Handler;
let getScheduleDefaultsHandler: Handler;
let patchScheduleDefaultsHandler: Handler;
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
  process.env.SESSION_SECRET = "schedule-drafts-provider-metadata-test";
  process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/schedule_drafts_provider_metadata_test";
  process.env.REPL_ID = "schedule-drafts-provider-metadata-test";
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

  const postRoute = app.routes.find((record) => record.method === "post" && record.path === "/api/schedule-drafts");
  assert.ok(postRoute, "POST /api/schedule-drafts should be registered");
  postScheduleDraftHandler = postRoute.handlers.at(-1) as Handler;

  const patchRoute = app.routes.find((record) => record.method === "patch" && record.path === "/api/schedule-drafts/:id");
  assert.ok(patchRoute, "PATCH /api/schedule-drafts/:id should be registered");
  patchScheduleDraftHandler = patchRoute.handlers.at(-1) as Handler;

  const getDefaultsRoute = app.routes.find((record) => record.method === "get" && record.path === "/api/vendor/schedule-defaults");
  assert.ok(getDefaultsRoute, "GET /api/vendor/schedule-defaults should be registered");
  getScheduleDefaultsHandler = getDefaultsRoute.handlers.at(-1) as Handler;

  const patchDefaultsRoute = app.routes.find((record) => record.method === "patch" && record.path === "/api/vendor/schedule-defaults");
  assert.ok(patchDefaultsRoute, "PATCH /api/vendor/schedule-defaults should be registered");
  patchScheduleDefaultsHandler = patchDefaultsRoute.handlers.at(-1) as Handler;
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
    params: { id: "draft-a" },
    body: {},
    headers: {},
    ...reqOverrides,
  };

  await handler(req as Request, res as unknown as Response);
  return result();
}

function stubScheduleDraftStorage() {
  const users = new Map<string, { id: string; role: string; email: string }>([
    ["artist-a", { id: "artist-a", role: "artist", email: "artist-a@example.com" }],
    ["artist-b", { id: "artist-b", role: "artist", email: "artist-b@example.com" }],
    ["admin-user", { id: "admin-user", role: "admin", email: "admin@example.com" }],
  ]);
  const drafts = new Map<string, TestScheduleDraft>([
    [
      "draft-a",
      {
        id: "draft-a",
        artistId: "artist-a",
        title: "Artist A schedule",
        updatedAt: new Date("2026-06-22T10:00:00.000Z"),
        providers: [],
      },
    ],
    [
      "draft-b",
      {
        id: "draft-b",
        artistId: "artist-b",
        title: "Artist B schedule",
        updatedAt: new Date("2026-06-22T10:00:00.000Z"),
        providers: [],
      },
    ],
  ]);
  const calls = {
    getUser: [] as string[],
    getScheduleDraft: [] as string[],
    createScheduleDraft: [] as any[],
    updateScheduleDraft: [] as Array<[string, any]>,
    updateArtistProfile: [] as Array<[string, any]>,
  };
  const profiles = new Map<string, any>([
    ["artist-a", { userId: "artist-a", onboardingPreferences: { calendarConnected: false, keepMe: "preserved" } }],
  ]);

  mock.method(storage, "getUser", async (userId: string) => {
    calls.getUser.push(userId);
    return users.get(userId);
  });
  mock.method(storage, "getScheduleDraft", async (draftId: string) => {
    calls.getScheduleDraft.push(draftId);
    return drafts.get(draftId);
  });
  mock.method(storage, "createScheduleDraft", async (draft: any) => {
    calls.createScheduleDraft.push(draft);
    const created = { id: "created-draft", ...draft };
    drafts.set(created.id, created);
    return created;
  });
  mock.method(storage, "updateScheduleDraft", async (draftId: string, update: any) => {
    calls.updateScheduleDraft.push([draftId, update]);
    const existing = drafts.get(draftId);
    if (!existing) return undefined;
    const updated = { ...existing, ...update };
    drafts.set(draftId, updated);
    return updated;
  });
  mock.method(storage, "getArtistProfile", async (userId: string) => profiles.get(userId));
  mock.method(storage, "updateArtistProfile", async (userId: string, update: any) => {
    calls.updateArtistProfile.push([userId, update]);
    const updated = { ...(profiles.get(userId) ?? { userId }), ...update };
    profiles.set(userId, updated);
    return updated;
  });
  mock.method(storage, "createArtistProfile", async (profile: any) => {
    profiles.set(profile.userId, profile);
    return profile;
  });

  return { calls, drafts, profiles };
}

test("schedule draft PATCH preserves valid provider capability metadata", async () => {
  const { calls } = stubScheduleDraftStorage();

  const result = await invoke(patchScheduleDraftHandler, {
    session: { userId: "artist-a" },
    params: { id: "draft-a" },
    body: {
      providers: [
        {
          id: "prov-violet",
          name: "Violet",
          capability: "ALL",
          isPrimary: true,
          serviceDurations: { hair: 30, makeup: 30, primaryClient: 120, touchup: 15, invalid: 999 },
        },
        { id: "prov-marta", name: "Marta", capability: "HAIR_ONLY" },
        { id: "prov-erika", name: "Erika", capability: "MAKEUP_ONLY", isPrimary: false },
      ],
    },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(calls.updateScheduleDraft.length, 1);
  assert.deepEqual(calls.updateScheduleDraft[0]?.[1].providers, [
    {
      id: "prov-violet",
      name: "Violet",
      capability: "ALL",
      isPrimary: true,
      serviceDurations: { hair: 30, makeup: 30, primaryClient: 120, touchup: 15 },
    },
    { id: "prov-marta", name: "Marta", capability: "HAIR_ONLY", isPrimary: false },
    { id: "prov-erika", name: "Erika", capability: "MAKEUP_ONLY", isPrimary: false },
  ]);
});

test("schedule draft PATCH drops invalid provider capability and coerces primary safely", async () => {
  const { calls } = stubScheduleDraftStorage();

  const result = await invoke(patchScheduleDraftHandler, {
    session: { userId: "artist-a" },
    params: { id: "draft-a" },
    body: {
      providers: [
        { id: "prov-unknown", name: "Unknown", capability: "HAIR_AND_MAKEUP", isPrimary: "true" },
      ],
    },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(calls.updateScheduleDraft.length, 1);
  assert.deepEqual(calls.updateScheduleDraft[0]?.[1].providers, [
    { id: "prov-unknown", name: "Unknown", isPrimary: false },
  ]);
});

test("schedule draft PATCH remains owner scoped", async () => {
  const { calls } = stubScheduleDraftStorage();

  const result = await invoke(patchScheduleDraftHandler, {
    session: { userId: "artist-b" },
    params: { id: "draft-a" },
    body: {
      providers: [{ id: "prov-b", name: "Other Artist", capability: "ALL", isPrimary: true }],
    },
  });

  assert.equal(result.statusCode, 403);
  assert.deepEqual(result.body, { error: "You can only access your own schedules" });
  assert.equal(calls.updateScheduleDraft.length, 0);
});

test("schedule draft PATCH still allows admin access through the existing guard", async () => {
  const { calls } = stubScheduleDraftStorage();

  const result = await invoke(patchScheduleDraftHandler, {
    session: { userId: "admin-user" },
    params: { id: "draft-a" },
    body: {
      providers: [{ id: "prov-admin", name: "Admin Edited", capability: "MAKEUP_ONLY", isPrimary: true }],
    },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(calls.updateScheduleDraft.length, 1);
  assert.deepEqual(calls.updateScheduleDraft[0]?.[1].providers, [
    { id: "prov-admin", name: "Admin Edited", capability: "MAKEUP_ONLY", isPrimary: true },
  ]);
});

test("schedule draft PATCH accepts a save when expected version matches", async () => {
  const { calls } = stubScheduleDraftStorage();

  const result = await invoke(patchScheduleDraftHandler, {
    session: { userId: "artist-a" },
    params: { id: "draft-a" },
    body: {
      expectedUpdatedAt: "2026-06-22T10:00:00.000Z",
      title: "Updated private schedule",
    },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(calls.updateScheduleDraft.length, 1);
  assert.equal(calls.updateScheduleDraft[0]?.[1].title, "Updated private schedule");
});

test("schedule draft PATCH rejects stale expected version without overwriting", async () => {
  const { calls } = stubScheduleDraftStorage();

  const result = await invoke(patchScheduleDraftHandler, {
    session: { userId: "artist-a" },
    params: { id: "draft-a" },
    body: {
      expectedUpdatedAt: "2026-06-22T09:59:59.000Z",
      title: "Stale overwrite attempt",
    },
  });

  assert.equal(result.statusCode, 409);
  assert.deepEqual(result.body, {
    error: "This schedule draft changed elsewhere. Refresh before saving.",
  });
  assert.equal(calls.updateScheduleDraft.length, 0);
});

test("schedule draft PATCH preserves sanitized schedule engine metadata", async () => {
  const { calls } = stubScheduleDraftStorage();

  const result = await invoke(patchScheduleDraftHandler, {
    session: { userId: "artist-a" },
    params: { id: "draft-a" },
    body: {
      engineMetadata: {
        venueAccessTime: " 12:00 PM ",
        photographerArrivalTime: 1245,
        readyByTime: null,
        ceremonyTime: "4".repeat(80),
        firstLookTime: "2:00 PM",
        sourceRequest: "Bride Hair + Makeup\nAssistant timing to confirm",
        optionalPeopleMode: "exclude",
        touchupMode: "quote_only",
        assignPrimaryToLead: true,
        protectLeadBeforePrimary: true,
        preferMinimumStaff: true,
        fixedBlocksReviewed: false,
        evidenceDay: " saturday_wedding_day ",
        useEvidencePlaceholders: true,
        evidenceAdditionsMode: "exclude",
        ignoredField: "not stored",
      },
    },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(calls.updateScheduleDraft.length, 1);
  assert.deepEqual(calls.updateScheduleDraft[0]?.[1].engineMetadata, {
    venueAccessTime: "12:00 PM",
    readyByTime: "",
    ceremonyTime: "4".repeat(40),
    firstLookTime: "2:00 PM",
    sourceRequest: "Bride Hair + Makeup\nAssistant timing to confirm",
    optionalPeopleMode: "exclude",
    touchupMode: "quote_only",
    assignPrimaryToLead: true,
    protectLeadBeforePrimary: true,
    fixedBlocksReviewed: false,
    evidenceDay: "saturday_wedding_day",
    useEvidencePlaceholders: true,
    evidenceAdditionsMode: "exclude",
  });
});

test("schedule draft PATCH can clear schedule engine metadata", async () => {
  const { calls } = stubScheduleDraftStorage();

  const result = await invoke(patchScheduleDraftHandler, {
    session: { userId: "artist-a" },
    params: { id: "draft-a" },
    body: {
      engineMetadata: null,
    },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(calls.updateScheduleDraft.length, 1);
  assert.deepEqual(calls.updateScheduleDraft[0]?.[1].engineMetadata, {});
});

test("operator schedule defaults preserve per-artist timing and merge with existing private preferences", async () => {
  const { calls } = stubScheduleDraftStorage();

  const patchResult = await invoke(patchScheduleDefaultsHandler, {
    session: { userId: "artist-a" },
    body: {
      providers: [
        {
          id: "violet",
          name: "Violet",
          capability: "ALL",
          isLead: true,
          serviceDurations: { hair: 30, makeup: 30, hairMakeup: 60, primaryClient: 120, touchup: 15 },
        },
      ],
      preferMinimumStaff: true,
      protectLeadBeforePrimary: true,
      assignPrimaryToLead: true,
      preferredLayout: "anything-else-is-rejected",
      allowUnrequestedBuffers: true,
    },
  });

  assert.equal(patchResult.statusCode, 200);
  assert.equal(calls.updateArtistProfile.length, 1);
  const savedPreferences = calls.updateArtistProfile[0][1].onboardingPreferences;
  assert.equal(savedPreferences.keepMe, "preserved");
  assert.equal(savedPreferences.scheduleDefaults.preferredLayout, "artist_columns");
  assert.equal(savedPreferences.scheduleDefaults.allowUnrequestedBuffers, false);
  assert.equal("preferMinimumStaff" in savedPreferences.scheduleDefaults, false);
  assert.equal(savedPreferences.scheduleDefaults.providers[0].serviceDurations.primaryClient, 120);

  const getResult = await invoke(getScheduleDefaultsHandler, { session: { userId: "artist-a" } });
  assert.equal(getResult.statusCode, 200);
  assert.deepEqual((getResult.body as any).providers[0].serviceDurations, {
    hair: 30,
    makeup: 30,
    hairMakeup: 60,
    primaryClient: 120,
    touchup: 15,
  });
});

test("schedule draft POST accepts sanitized provider metadata for the creating operator", async () => {
  const { calls } = stubScheduleDraftStorage();

  const result = await invoke(postScheduleDraftHandler, {
    session: { userId: "artist-a" },
    body: {
      title: "Wedding schedule",
      providers: [
        { id: "prov-violet", name: "Violet", capability: "ALL", isPrimary: true },
        { id: "prov-bad", name: "Bad Capability", capability: "INVALID", isPrimary: true },
      ],
    },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(calls.createScheduleDraft.length, 1);
  assert.equal(calls.createScheduleDraft[0]?.artistId, "artist-a");
  assert.deepEqual(calls.createScheduleDraft[0]?.providers, [
    { id: "prov-violet", name: "Violet", capability: "ALL", isPrimary: true },
    { id: "prov-bad", name: "Bad Capability", isPrimary: true },
  ]);
});

test("schedule draft POST accepts sanitized schedule engine metadata for the creating operator", async () => {
  const { calls } = stubScheduleDraftStorage();

  const result = await invoke(postScheduleDraftHandler, {
    session: { userId: "artist-a" },
    body: {
      title: "Wedding schedule",
      engineMetadata: {
        venueAccessTime: "12:00 PM",
        photographerArrivalTime: "12:45 PM",
        readyByTime: "1:20 PM",
        ceremonyTime: "4:00 PM",
        firstLookTime: "2:00 PM",
        extraTiming: "not stored",
      },
    },
  });

  assert.equal(result.statusCode, 200);
  assert.equal(calls.createScheduleDraft.length, 1);
  assert.equal(calls.createScheduleDraft[0]?.artistId, "artist-a");
  assert.deepEqual(calls.createScheduleDraft[0]?.engineMetadata, {
    venueAccessTime: "12:00 PM",
    photographerArrivalTime: "12:45 PM",
    readyByTime: "1:20 PM",
    ceremonyTime: "4:00 PM",
    firstLookTime: "2:00 PM",
  });
});
