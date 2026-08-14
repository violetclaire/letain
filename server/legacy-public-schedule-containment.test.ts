import assert from "node:assert/strict";
import { afterEach, before, mock, test } from "node:test";
import type { Express, Request, Response } from "express";

import {
  canReadLegacySharedSchedule,
  getLegacyScheduleQuarantinePolicy,
} from "./legacy-schedule-quarantine";

type Handler = (req: Request, res: Response) => unknown | Promise<unknown>;
type RouteRecord = {
  method: string;
  path: string;
  handlers: Handler[];
};

let routes: RouteRecord[];
let storage: any;

const quarantineEnvironmentVariables = [
  "ENABLE_LEGACY_PUBLIC_DRAFT_SCHEDULE_READ",
  "ENABLE_LEGACY_PUBLIC_SCHEDULE_MUTATIONS",
  "ENABLE_LEGACY_PUBLIC_SCHEDULE_AI_CHAT",
  "ENABLE_LEGACY_PUBLIC_SCHEDULE_EMAIL_NOTIFICATIONS",
  "ENABLE_LEGACY_GLOBAL_SCHEDULE_COLLAB_APIS",
] as const;

function createRecordingApp(): Express & { routes: RouteRecord[] } {
  const registeredRoutes: RouteRecord[] = [];
  const app = (() => undefined) as any;

  app.routes = registeredRoutes;
  app.set = () => app;
  app.use = () => app;

  for (const method of ["get", "post", "put", "patch", "delete", "options", "all"]) {
    app[method] = (path: string, ...handlers: Handler[]) => {
      registeredRoutes.push({ method, path, handlers });
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
  process.env.SESSION_SECRET = "legacy-public-schedule-containment-test";
  process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/legacy_public_schedule_containment_test";
  process.env.REPL_ID = "legacy-public-schedule-containment-test";
  process.env.ISSUER_URL = "https://replit.com/oidc";

  mock.method(globalThis, "setInterval", () => ({ unref() {} }) as unknown as NodeJS.Timeout);
  mock.method(
    globalThis,
    "fetch",
    async () =>
      new Response(JSON.stringify(oidcDiscoveryDocument()), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  );

  const [routesModule, storageModule] = await Promise.all([
    import("./routes"),
    import("./storage"),
  ]);

  storage = storageModule.storage;
  const app = createRecordingApp();
  await routesModule.registerRoutes(app);
  routes = app.routes;
});

afterEach(() => {
  for (const variable of quarantineEnvironmentVariables) {
    delete process.env[variable];
  }
  mock.restoreAll();
});

function routeHandler(method: string, path: string, useLastRegistration = false) {
  const matches = routes.filter((record) => record.method === method && record.path === path);
  const route = useLastRegistration ? matches.at(-1) : matches[0];
  assert.ok(route, `${method.toUpperCase()} ${path} should be registered`);
  return route.handlers.at(-1) as Handler;
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

async function invoke(
  handler: Handler,
  {
    params = {},
    body = {},
  }: {
    params?: Record<string, string>;
    body?: Record<string, unknown>;
  } = {},
) {
  const { res, result } = createResponse();
  await handler(
    {
      params,
      body,
      headers: {},
    } as unknown as Request,
    res as unknown as Response,
  );
  return result();
}

function stubSharedSchedule(status: string = "finalized") {
  const schedule = {
    id: "schedule-a",
    artistId: "artist-a",
    eventName: "Private event",
    status,
  };
  const appointments = new Map([
    ["appointment-a", { id: "appointment-a", scheduleId: "schedule-a", notes: null }],
    ["appointment-b", { id: "appointment-b", scheduleId: "schedule-b", notes: null }],
  ]);
  const calls = {
    getSchedule: 0,
    getAppointments: 0,
    updateAppointments: [] as Array<[string, unknown]>,
    createMessages: [] as unknown[],
    getPhotos: 0,
  };

  mock.method(storage, "getEventDayScheduleByShareToken", async () => {
    calls.getSchedule += 1;
    return schedule;
  });
  mock.method(storage, "getScheduleTeamMembers", async () => []);
  mock.method(storage, "getScheduleAppointments", async () => {
    calls.getAppointments += 1;
    return [...appointments.values()];
  });
  mock.method(storage, "getScheduleAppointment", async (id: string) => appointments.get(id));
  mock.method(storage, "updateScheduleAppointment", async (id: string, update: unknown) => {
    calls.updateAppointments.push([id, update]);
    return { ...appointments.get(id), ...(update as object) };
  });
  mock.method(storage, "createScheduleChatMessage", async (message: unknown) => {
    calls.createMessages.push(message);
    return { id: `message-${calls.createMessages.length}`, ...(message as object) };
  });
  mock.method(storage, "getScheduleChatMessages", async () => calls.createMessages);
  mock.method(storage, "getSimplePhotos", async () => {
    calls.getPhotos += 1;
    return [];
  });

  return { calls };
}

test("legacy schedule quarantine defaults every compatibility control off", () => {
  assert.deepEqual(getLegacyScheduleQuarantinePolicy(), {
    allowDraftReads: false,
    allowGuestMutations: false,
    allowAiChat: false,
    allowAutomaticEmailNotifications: false,
    allowGlobalCollaborationApis: false,
  });
});

test("only finalized or sent schedules are readable without explicit compatibility enablement", () => {
  assert.equal(canReadLegacySharedSchedule("draft"), false);
  assert.equal(canReadLegacySharedSchedule("finalized"), true);
  assert.equal(canReadLegacySharedSchedule("sent"), true);
  assert.equal(canReadLegacySharedSchedule("unknown"), false);

  process.env.ENABLE_LEGACY_PUBLIC_DRAFT_SCHEDULE_READ = "true";
  assert.equal(canReadLegacySharedSchedule("draft"), true);
});

test("public read denies a draft schedule by default", async () => {
  const { calls } = stubSharedSchedule("draft");
  const result = await invoke(
    routeHandler("get", "/api/event-schedules/share/:shareToken"),
    { params: { shareToken: "draft-token" } },
  );

  assert.equal(result.statusCode, 404);
  assert.equal(calls.getAppointments, 0);
});

test("public read preserves finalized schedule display", async () => {
  const { calls } = stubSharedSchedule("finalized");
  const result = await invoke(
    routeHandler("get", "/api/event-schedules/share/:shareToken"),
    { params: { shareToken: "published-token" } },
  );

  assert.equal(result.statusCode, 200);
  assert.equal(calls.getAppointments, 1);
});

test("explicit compatibility enablement can preserve a required draft display", async () => {
  process.env.ENABLE_LEGACY_PUBLIC_DRAFT_SCHEDULE_READ = "true";
  const { calls } = stubSharedSchedule("draft");
  const result = await invoke(
    routeHandler("get", "/api/event-schedules/share/:shareToken"),
    { params: { shareToken: "draft-token" } },
  );

  assert.equal(result.statusCode, 200);
  assert.equal(calls.getAppointments, 1);
});

test("every legacy guest mutation route is quarantined by default", async () => {
  const { calls } = stubSharedSchedule();
  const routesToCheck = [
    ["post", "/api/event-schedules/share/:shareToken/guest-note"],
    ["post", "/api/event-schedules/share/:shareToken/appointment/:appointmentId/notes"],
    ["post", "/api/event-schedules/share/:shareToken/appointment/:appointmentId/time"],
    ["post", "/api/event-schedules/share/:shareToken/appointment/:appointmentId/name"],
    ["post", "/api/event-schedules/share/:shareToken/appointment/:appointmentId/photos"],
    ["delete", "/api/event-schedules/share/:shareToken/appointment/:appointmentId/photos"],
    ["post", "/api/event-schedules/share/:shareToken/appointment"],
    ["delete", "/api/event-schedules/share/:shareToken/appointment/:appointmentId"],
    ["post", "/api/event-schedules/share/:shareToken/chat"],
  ] as const;

  for (const [method, path] of routesToCheck) {
    const result = await invoke(routeHandler(method, path, path === "/api/messages"), {
      params: { shareToken: "published-token", appointmentId: "appointment-a" },
      body: {
        notes: "Please update this",
        guestNote: "Please update this",
        senderName: "Client",
        content: "Please update this",
      },
    });
    assert.equal(
      result.statusCode,
      404,
      `${method.toUpperCase()} ${path} should be quarantined: ${JSON.stringify(result.body)}`,
    );
  }

  assert.equal(calls.getSchedule, 0);
  assert.deepEqual(calls.updateAppointments, []);
  assert.deepEqual(calls.createMessages, []);
});

test("a valid token can never mutate an appointment from another schedule", async () => {
  process.env.ENABLE_LEGACY_PUBLIC_SCHEDULE_MUTATIONS = "true";
  const { calls } = stubSharedSchedule();
  const result = await invoke(
    routeHandler("post", "/api/event-schedules/share/:shareToken/appointment/:appointmentId/notes"),
    {
      params: { shareToken: "published-token", appointmentId: "appointment-b" },
      body: { notes: "Cross-event mutation" },
    },
  );

  assert.equal(result.statusCode, 404);
  assert.deepEqual(calls.updateAppointments, []);
});

test("temporary compatibility enablement still permits only same-schedule appointment notes", async () => {
  process.env.ENABLE_LEGACY_PUBLIC_SCHEDULE_MUTATIONS = "true";
  const { calls } = stubSharedSchedule();
  const result = await invoke(
    routeHandler("post", "/api/event-schedules/share/:shareToken/appointment/:appointmentId/notes"),
    {
      params: { shareToken: "published-token", appointmentId: "appointment-a" },
      body: { notes: "Same event note" },
    },
  );

  assert.equal(result.statusCode, 200);
  assert.deepEqual(calls.updateAppointments, [["appointment-a", { notes: "Same event note" }]]);
});

test("legacy global photo and message APIs are unavailable by default", async () => {
  const { calls } = stubSharedSchedule();
  const routesToCheck = [
    ["get", "/api/photos"],
    ["post", "/api/photos"],
    ["get", "/api/messages"],
    ["post", "/api/messages"],
  ] as const;

  for (const [method, path] of routesToCheck) {
    const result = await invoke(routeHandler(method, path, path === "/api/messages"), {
      body: {
        personName: "Client",
        imageUrl: "https://example.invalid/private.jpg",
        senderName: "Client",
        message: "Private event detail",
      },
    });
    assert.equal(
      result.statusCode,
      404,
      `${method.toUpperCase()} ${path} should be quarantined: ${JSON.stringify(result.body)}`,
    );
  }

  assert.equal(calls.getPhotos, 0);
});

test("guest chat can be compatibility-enabled without enabling AI or automatic email", async () => {
  process.env.ENABLE_LEGACY_PUBLIC_SCHEDULE_MUTATIONS = "true";
  const { calls } = stubSharedSchedule();
  const result = await invoke(
    routeHandler("post", "/api/event-schedules/share/:shareToken/chat"),
    {
      params: { shareToken: "published-token" },
      body: { senderName: "Client", content: "A private event detail" },
    },
  );

  assert.equal(result.statusCode, 200);
  assert.equal(calls.createMessages.length, 1);
  assert.equal((calls.createMessages[0] as any).senderType, "guest");
});

test("authenticated operator and private schedule-draft routes remain registered", () => {
  assert.ok(routes.some((record) => record.method === "get" && record.path === "/api/event-schedules"));
  assert.ok(routes.some((record) => record.method === "post" && record.path === "/api/event-schedules"));
  assert.ok(routes.some((record) => record.method === "post" && record.path === "/api/schedule-drafts"));
  assert.ok(routes.some((record) => record.method === "patch" && record.path === "/api/schedule-drafts/:id"));
  const messagePostRoutes = routes.filter(
    (record) => record.method === "post" && record.path === "/api/messages",
  );
  assert.equal(messagePostRoutes.length, 2);
  assert.equal(messagePostRoutes[0].handlers.length, 2, "the existing authenticated message route remains first");
});
