import assert from "node:assert/strict";
import { after, before, mock, test } from "node:test";
import type { Express, NextFunction, Request, Response } from "express";
import { getAuthUserId } from "./auth/identity";

type Handler = (req: Request, res: Response, next?: NextFunction) => unknown | Promise<unknown>;
type RouteRecord = {
  method: string;
  path: string;
  handlers: Handler[];
};

let isAuthenticated: Handler;
let registerRoutes: (app: Express) => Promise<unknown>;
let storage: any;

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

function createResponse() {
  let statusCode = 200;
  let body: unknown;
  let redirectUrl: string | undefined;

  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(payload: unknown) {
      body = payload;
      return res;
    },
    redirect(url: string) {
      redirectUrl = url;
      return res;
    },
  };

  return {
    res,
    result() {
      return { statusCode, body, redirectUrl };
    },
  };
}

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

async function invokeIsAuthenticated(reqOverrides: Record<string, unknown> = {}) {
  const { res, result } = createResponse();
  let nextCalled = false;
  const req = {
    session: {},
    user: undefined,
    isAuthenticated: () => false,
    ...reqOverrides,
  } as unknown as Request;

  await isAuthenticated(req, res as unknown as Response, () => {
    nextCalled = true;
  });

  return { ...result(), nextCalled };
}

before(async () => {
  process.env.NODE_ENV = "test";
  process.env.SESSION_SECRET = "auth-session-characterization-test";
  process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/auth_session_characterization_test";
  process.env.REPL_ID = "auth-session-characterization-test";
  process.env.ISSUER_URL = "https://replit.com/oidc";

  mock.method(globalThis, "setInterval", () => ({ unref() {} }) as unknown as NodeJS.Timeout);
  mock.method(globalThis, "fetch", async () => new Response(JSON.stringify(oidcDiscoveryDocument()), {
    status: 200,
    headers: { "content-type": "application/json" },
  }));

  const [routesModule, authModule, storageModule] = await Promise.all([
    import("./routes"),
    import("./replitAuth"),
    import("./storage"),
  ]);

  registerRoutes = routesModule.registerRoutes;
  isAuthenticated = authModule.isAuthenticated;
  storage = storageModule.storage;
});

after(() => {
  mock.restoreAll();
});

test("getAuthUserId returns req.session.userId", () => {
  const req = {
    session: { userId: "session-user" },
  } as unknown as Request;

  assert.equal(getAuthUserId(req), "session-user");
});

test("getAuthUserId falls back to req.user.claims.sub", () => {
  const req = {
    session: {},
    user: { claims: { sub: "oidc-user" } },
  } as unknown as Request;

  assert.equal(getAuthUserId(req), "oidc-user");
});

test("getAuthUserId prefers req.session.userId when both identities exist", () => {
  const req = {
    session: { userId: "session-user" },
    user: { claims: { sub: "oidc-user" } },
  } as unknown as Request;

  assert.equal(getAuthUserId(req), "session-user");
});

test("isAuthenticated calls next for session users", async () => {
  const result = await invokeIsAuthenticated({
    session: { userId: "session-user" },
    isAuthenticated: () => false,
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, 200);
});

test("isAuthenticated rejects unauthenticated requests", async () => {
  const result = await invokeIsAuthenticated({
    session: {},
    isAuthenticated: () => false,
  });

  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 401);
  assert.deepEqual(result.body, { message: "Unauthorized" });
});

test("isAuthenticated calls next for unexpired OIDC users", async () => {
  const result = await invokeIsAuthenticated({
    session: {},
    user: { expires_at: Math.floor(Date.now() / 1000) + 60 },
    isAuthenticated: () => true,
  });

  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, 200);
});

test("/api/auth/user remains logged-out-safe and session-aware", async (t) => {
  const app = createRecordingApp();
  await registerRoutes(app);

  const route = app.routes.find((record) => record.method === "get" && record.path === "/api/auth/user");
  assert.ok(route, "GET /api/auth/user should be registered");
  const handler = route.handlers.at(-1);
  assert.equal(typeof handler, "function", "GET /api/auth/user should register a route handler");

  const loggedOutResponse = createResponse();
  await handler!(
    { headers: {}, session: {}, user: undefined } as unknown as Request,
    loggedOutResponse.res as unknown as Response,
  );
  assert.equal(loggedOutResponse.result().statusCode, 200);
  assert.equal(loggedOutResponse.result().body, null);

  t.mock.method(storage, "getUser", async (id: string) => ({
    id,
    email: "artist@example.com",
    role: "artist",
  }));
  t.mock.method(storage, "getArtistProfile", async (id: string) => ({
    userId: id,
    artistSlug: "violet",
  }));

  const sessionResponse = createResponse();
  await handler!(
    {
      headers: { cookie: "connect.sid=test" },
      session: { userId: "artist-user" },
      user: undefined,
    } as unknown as Request,
    sessionResponse.res as unknown as Response,
  );

  assert.equal(sessionResponse.result().statusCode, 200);
  assert.deepEqual(sessionResponse.result().body, {
    id: "artist-user",
    email: "artist@example.com",
    role: "artist",
    artistSlug: "violet",
  });
});
