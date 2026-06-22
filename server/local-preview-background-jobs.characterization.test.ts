import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readRepoFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const backgroundJobsSource = readRepoFile("server/backgroundJobs.ts");
const indexSource = readRepoFile("server/index.ts");
const squareRoutesSource = readRepoFile("server/squareRoutes.ts");
const envExample = readRepoFile(".env.example");
const localDevDocs = readRepoFile("docs/LOCAL_DEVELOPMENT.md");

test("background jobs remain enabled unless local preview explicitly opts out", () => {
  assert.match(backgroundJobsSource, /process\.env\.LOCAL_PREVIEW_DISABLE_JOBS === "true"/);
  assert.match(backgroundJobsSource, /process\.env\.NODE_ENV !== "production"/);
  assert.match(backgroundJobsSource, /PUBLIC_BASE_URL/);
  assert.match(backgroundJobsSource, /DEV_SERVER_HOST/);
  assert.match(backgroundJobsSource, /LOCAL_AUTH_BYPASS/);
  assert.doesNotMatch(backgroundJobsSource, /process\.env\.NODE_ENV === "production"[\s\S]*LOCAL_PREVIEW_DISABLE_JOBS/);
});

test("local preview disable flag skips only background job registration at startup", () => {
  assert.match(indexSource, /isLocalPreviewBackgroundJobsDisabled\(\)/);
  assert.match(indexSource, /logLocalPreviewBackgroundJobsDisabled\(\);[\s\S]*return;/);
  assert.match(indexSource, /startScheduledEmailJob\(\);/);
  assert.match(indexSource, /startCronJobs\(\);/);
  assert.match(backgroundJobsSource, /\[Local Preview\] Background jobs disabled\./);
});

test("Square OAuth cleanup interval is also treated as background registration", () => {
  assert.match(squareRoutesSource, /import \{ isLocalPreviewBackgroundJobsDisabled \} from "\.\/backgroundJobs";/);
  assert.match(squareRoutesSource, /if \(!isLocalPreviewBackgroundJobsDisabled\(\)\) \{[\s\S]*setInterval/);
  assert.match(squareRoutesSource, /storage\.cleanupExpiredOAuthStates\(\)/);
});

test("local preview docs and env example document the job opt-out as local-only", () => {
  assert.match(envExample, /# LOCAL_PREVIEW_DISABLE_JOBS=true/);
  assert.match(envExample, /Do not set in production/);
  assert.match(localDevDocs, /LOCAL_PREVIEW_DISABLE_JOBS=true/);
  assert.match(localDevDocs, /Do not set this flag in production/);
});

test("local preview background-job characterization stays source-only", () => {
  const testSource = readRepoFile("server/local-preview-background-jobs.characterization.test.ts");

  assert.ok(testSource.includes("readFileSync"));
  assert.doesNotMatch(testSource, /from\s+["']\.\/index["']/);
  assert.doesNotMatch(testSource, /from\s+["']\.\/squareRoutes["']/);
  assert.doesNotMatch(testSource, /process\.env\.[A-Z_]+\s*=(?!=)/);
});
