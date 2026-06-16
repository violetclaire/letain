import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readRepoFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("server/replitAuth.ts still owns concrete Replit OIDC provider setup", () => {
  const source = readRepoFile("server/replitAuth.ts");

  assert.ok(source.includes('import * as client from "openid-client";'));
  assert.ok(source.includes('import { Strategy, type VerifyFunction } from "openid-client/passport";'));
  assert.ok(source.includes('import passport from "passport";'));
  assert.ok(source.includes('new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc")'));
  assert.ok(source.includes("process.env.REPL_ID!"));
  assert.ok(source.includes("const strategyName = `replitauth:${domain}`;"));
  assert.ok(source.includes('scope: "openid email profile offline_access"'));
  assert.ok(source.includes("callbackURL: `https://${domain}/api/callback`"));
  assert.ok(source.includes("passport.use(strategy);"));
});

test("setupAuth remains the Replit-backed login/logout/callback owner", () => {
  const source = readRepoFile("server/replitAuth.ts");

  assert.ok(source.includes("export async function setupAuth(app: Express)"));
  assert.ok(source.includes("app.use(getSession());"));
  assert.ok(source.includes("app.use(passport.initialize());"));
  assert.ok(source.includes("app.use(passport.session());"));
  assert.ok(source.includes('app.get("/api/login", (req, res, next) =>'));
  assert.ok(source.includes("passport.authenticate(`replitauth:${req.hostname}`, {"));
  assert.ok(source.includes('app.get("/api/callback", (req, res, next) =>'));
  assert.ok(source.includes("passport.authenticate(`replitauth:${req.hostname}`, async (err: any, user: any) =>"));
  assert.ok(source.includes('return res.redirect("/api/login");'));
  assert.ok(source.includes('app.get("/api/logout", (req, res) =>'));
  assert.ok(source.includes("client.buildEndSessionUrl(config, {"));
  assert.ok(source.includes("client_id: process.env.REPL_ID!"));
  assert.ok(source.includes("post_logout_redirect_uri: `${req.protocol}://${req.hostname}`"));
});

test("active auth guard facade still points at the Replit-backed guard", () => {
  const currentSource = readRepoFile("server/auth/current.ts");
  const replitSource = readRepoFile("server/replitAuth.ts");
  const guardsSource = readRepoFile("server/auth/guards.ts");

  assert.equal(currentSource.trim(), 'export { isAuthenticated } from "../replitAuth";');
  assert.ok(replitSource.includes("async function refreshExpiredReplitSession(user: any): Promise<boolean>"));
  assert.ok(replitSource.includes("const config = await getOidcConfig();"));
  assert.ok(replitSource.includes("const tokenResponse = await client.refreshTokenGrant(config, user.refresh_token);"));
  assert.ok(replitSource.includes("export const isAuthenticated: RequestHandler = createIsAuthenticated(refreshExpiredReplitSession);"));
  assert.ok(guardsSource.includes("export function createIsAuthenticated(refreshExpiredOidcSession: RefreshExpiredOidcSession): RequestHandler"));
  assert.ok(guardsSource.includes("if ((req.session as any)?.userId)"));
  assert.ok(guardsSource.includes("if (!req.isAuthenticated() || !user?.expires_at)"));
});

test("routes use neutral guard and identity helpers but keep setupAuth in replitAuth", () => {
  const routesSource = readRepoFile("server/routes.ts");

  assert.ok(routesSource.includes('import { setupAuth } from "./replitAuth";'));
  assert.ok(routesSource.includes('import { isAuthenticated } from "./auth/current";'));
  assert.ok(routesSource.includes('import { getAuthUserId } from "./auth/identity";'));
  assert.ok(routesSource.includes("await setupAuth(app);"));
  assert.ok(routesSource.includes("registerSquareRoutes(app, isAuthenticated, getAuthUserId);"));
  assert.ok(routesSource.includes("export { getAuthUserId };"));
  assert.doesNotMatch(routesSource, /import \{ isAuthenticated \} from "\.\/replitAuth";/);
});

test("identity and session boundaries remain split from the OIDC provider", () => {
  const identitySource = readRepoFile("server/auth/identity.ts");
  const sessionSource = readRepoFile("server/auth/session.ts");
  const replitSource = readRepoFile("server/replitAuth.ts");

  assert.ok(identitySource.includes("if (req.session?.userId)"));
  assert.ok(identitySource.includes("return req.session.userId;"));
  assert.ok(identitySource.includes("if (req.user?.claims?.sub)"));
  assert.ok(identitySource.includes("return req.user.claims.sub;"));

  assert.ok(sessionSource.includes("const dbUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;"));
  assert.ok(sessionSource.includes("secret: process.env.SESSION_SECRET!"));
  assert.ok(sessionSource.includes("secure: isProduction"));
  assert.ok(sessionSource.includes('sameSite: "lax"'));
  assert.ok(sessionSource.includes("maxAge: sessionTtl"));

  assert.doesNotMatch(identitySource, /replitAuth|openid-client|passport|REPL_ID|ISSUER_URL/);
  assert.doesNotMatch(sessionSource, /replitAuth|openid-client|passport|REPL_ID|ISSUER_URL/);
  assert.ok(replitSource.includes('import { getSession } from "./auth/session";'));
});

test("Replit runtime dependency inventory still classifies auth as runtime critical", () => {
  const inventorySource = readRepoFile("docs/replit-runtime-dependencies.md");
  const inventoryTestSource = readRepoFile("server/replit-runtime-dependencies.characterization.test.ts");

  assert.ok(
    inventorySource.includes(
      "| auth | `server/replitAuth.ts` | Replit OIDC provider, Passport strategy names, token refresh | runtime critical | `REPL_ID`, `ISSUER_URL` with default `https://replit.com/oidc` | high |",
    ),
  );
  assert.ok(
    inventorySource.includes(
      "| auth | `server/auth/current.ts` | Current authenticated-route guard facade re-exports the Replit-backed guard | runtime critical | indirectly `REPL_ID`, `ISSUER_URL` through `server/replitAuth.ts` | medium |",
    ),
  );
  assert.ok(
    inventorySource.includes(
      "| auth | `server/routes.ts` | Imports `setupAuth` from `server/replitAuth.ts` and `isAuthenticated` from `server/auth/current.ts` | runtime critical | indirectly `REPL_ID`, `ISSUER_URL` | medium |",
    ),
  );
  assert.ok(inventoryTestSource.includes('file: "server/replitAuth.ts"'));
  assert.ok(inventoryTestSource.includes('file: "server/auth/current.ts"'));
  assert.ok(inventoryTestSource.includes('file: "server/routes.ts"'));
  assert.ok(inventoryTestSource.includes('/process\\.env\\.ISSUER_URL \\?\\? "https:\\/\\/replit\\.com\\/oidc"/'));
  assert.ok(inventoryTestSource.includes('/process\\.env\\.REPL_ID!/'));
});

test("auth OIDC boundary characterization stays source-only and behavior-preserving", () => {
  const testSource = readRepoFile("server/auth-oidc-boundary.characterization.test.ts");
  const importLines = testSource
    .split(/\r?\n/)
    .filter((line) => line.startsWith("import "))
    .join("\n");
  const executableLines = testSource
    .split(/\r?\n/)
    .filter((line) => !line.includes("doesNotMatch"))
    .join("\n");

  assert.ok(testSource.includes("readFileSync"));
  assert.doesNotMatch(importLines, /from\s+["']\.\/replitAuth["']/);
  assert.doesNotMatch(importLines, /from\s+["']\.\/auth\/current["']/);
  assert.doesNotMatch(importLines, /from\s+["']\.\/auth\/session["']/);
  assert.doesNotMatch(importLines, /from\s+["']\.\/routes["']/);
  assert.doesNotMatch(importLines, /from\s+["']openid-client["']/);
  assert.doesNotMatch(importLines, /from\s+["']passport["']/);
  assert.doesNotMatch(executableLines, /process\.env\.[A-Z_]+\s*=(?!=)/);
});
