import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const authSource = readFileSync("server/replitAuth.ts", "utf8");
const envExample = readFileSync(".env.example", "utf8");
const localDevDocs = readFileSync("docs/LOCAL_DEVELOPMENT.md", "utf8");

test("local auth bypass requires an explicit non-production local preview gate", () => {
  assert.match(authSource, /export function isLocalAuthBypassEnabled\(\): boolean/);
  assert.match(authSource, /process\.env\.LOCAL_AUTH_BYPASS !== "true"/);
  assert.match(authSource, /process\.env\.NODE_ENV === "production"[\s\S]*?return false/);
  assert.match(authSource, /process\.env\.PUBLIC_BASE_URL\?\.trim\(\)/);
  assert.match(authSource, /process\.env\.DEV_SERVER_HOST\?\.trim\(\)/);
  assert.match(authSource, /localhost\|127\\\.0\\\.0\\\.1/);
  assert.match(authSource, /return isLocalPublicBaseUrl \|\| isLocalDevHost/);
});

test("setupAuth still installs session and Passport before optional local bypass", () => {
  assert.match(authSource, /app\.use\(getSession\(\)\);/);
  assert.match(authSource, /app\.use\(passport\.initialize\(\)\);/);
  assert.match(authSource, /app\.use\(passport\.session\(\)\);/);
  assert.match(authSource, /passport\.serializeUser\(\(user: Express\.User, cb\) => cb\(null, user\)\);/);
  assert.match(authSource, /passport\.deserializeUser\(\(user: Express\.User, cb\) => cb\(null, user\)\);/);
  assert.match(authSource, /if \(isLocalAuthBypassEnabled\(\)\) \{/);
  assert.match(authSource, /res\.redirect\("\/artist-login"\)/);
  assert.match(authSource, /Replit OIDC callback is disabled for local preview/);
});

test("Replit OIDC discovery remains the default auth provider path", () => {
  assert.match(authSource, /const config = await getOidcConfig\(\);/);
  assert.match(authSource, /passport\.authenticate\(`replitauth:\$\{req\.hostname\}`/);
  assert.match(authSource, /client\.buildEndSessionUrl\(config/);
  assert.match(authSource, /async function refreshExpiredReplitSession\(user: any\): Promise<boolean>/);
});

test("local preview docs expose the bypass as optional and local-only", () => {
  assert.match(envExample, /# LOCAL_AUTH_BYPASS=true/);
  assert.match(localDevDocs, /LOCAL_AUTH_BYPASS=true/);
  assert.match(localDevDocs, /Replit OIDC discovery/);
  assert.match(localDevDocs, /\/artist-login/);
});
