import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routesSource = readFileSync("server/routes.ts", "utf8");
const useAuthSource = readFileSync("client/src/hooks/useAuth.ts", "utf8");
const appSource = readFileSync("client/src/App.tsx", "utf8");
const localDevDocs = readFileSync("docs/LOCAL_DEVELOPMENT.md", "utf8");

const localDemoRouteStart = routesSource.indexOf("app.post('/api/demo/local-access'");
const localDemoRouteEnd = routesSource.indexOf("  // Password reset flow");
const localDemoRouteSource = routesSource.slice(localDemoRouteStart, localDemoRouteEnd);

test("local demo access is a production-disabled session bootstrap for the seeded demo operator", () => {
  assert.match(routesSource, /const LOCAL_DEMO_OPERATOR_ID = "demo-operator-briarwood";/);
  assert.match(routesSource, /const LOCAL_DEMO_ARTIST_SLUG = "briarwood-demo";/);
  assert.match(routesSource, /function isLocalDemoAccessEnabled\(req: Request\): boolean/);
  assert.match(routesSource, /process\.env\.NODE_ENV === "production"[\s\S]*?return false/);
  assert.match(routesSource, /process\.env\.BRIARWOOD_DEMO_MODE === "true"/);
  assert.match(routesSource, /host === "localhost"/);
  assert.match(routesSource, /host === "127\.0\.0\.1"/);
  assert.match(routesSource, /host === "::1"/);
  assert.match(localDemoRouteSource, /req\.session\.userId = user\.id/);
  assert.match(localDemoRouteSource, /req\.session\.save/);
});

test("local demo access does not create external action authority", () => {
  assert.ok(localDemoRouteStart > 0, "local demo access route should exist");
  assert.ok(localDemoRouteEnd > localDemoRouteStart, "local demo route should be isolated before password reset flow");

  for (const forbidden of [
    "sendEmail",
    "sendSms",
    "smsService",
    "createInvoice",
    "createPayment",
    "createContract",
    "createClientLink",
    "GoogleGenAI",
    "assessCoordinationPath",
    "inquiryRoutes",
  ]) {
    assert.doesNotMatch(localDemoRouteSource, new RegExp(forbidden));
  }
});

test("fresh localhost demo pages may privately bootstrap access without rendering new UI", () => {
  assert.match(useAuthSource, /LOCAL_DEMO_PATH_PREFIXES/);
  assert.match(useAuthSource, /"\/admin\/briarwood-demo"/);
  assert.match(useAuthSource, /"\/inquiry-workspace"/);
  assert.match(useAuthSource, /"\/settings"/);
  assert.match(useAuthSource, /"\/artist\/availability"/);
  assert.match(useAuthSource, /function isLocalPreviewHost\(\): boolean/);
  assert.match(useAuthSource, /window\.location\.hostname/);
  assert.match(useAuthSource, /fetch\("\/api\/demo\/local-access"/);
  assert.match(useAuthSource, /method: "POST"/);
  assert.match(useAuthSource, /credentials: "include"/);
  assert.match(useAuthSource, /queryFn: fetchAuthUser/);
  assert.match(appSource, /import \{ fetchAuthUser \} from "@\/hooks\/useAuth";/);
  assert.match(appSource, /queryFn: fetchAuthUser/);
  assert.doesNotMatch(useAuthSource, /<button|<a |<Link|sendEmail|sendSms|createInvoice|createContract|createPayment|GoogleGenAI/);
});

test("local development docs describe demo access as local-only and non-action-taking", () => {
  assert.match(localDevDocs, /POST \/api\/demo\/local-access/);
  assert.match(localDevDocs, /disabled in production/);
  assert.match(localDevDocs, /demo-operator-briarwood/);
  assert.match(localDevDocs, /does not send email\/SMS/);
  assert.match(localDevDocs, /create invoices/);
  assert.match(localDevDocs, /create contracts/);
  assert.match(localDevDocs, /create payment links/);
  assert.match(localDevDocs, /create client links/);
  assert.match(localDevDocs, /run AI/);
  assert.match(localDevDocs, /contact providers/);
});
