import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readRepoFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("API server keeps the default 0.0.0.0 bind host unless DEV_SERVER_HOST is set", () => {
  const source = readRepoFile("server/index.ts");

  assert.ok(source.includes("const devServerHost = process.env.DEV_SERVER_HOST?.trim();"));
  assert.ok(source.includes('const host = devServerHost || "0.0.0.0";'));
  assert.match(source, /httpServer\.listen\(\s*listenOptions,/);
  assert.doesNotMatch(source, /host:\s*"0\.0\.0\.0"/);
});

test("local preview omits reusePort when DEV_SERVER_HOST is set unless explicitly opted in", () => {
  const source = readRepoFile("server/index.ts");

  assert.ok(source.includes('const reusePort = process.env.DEV_SERVER_REUSE_PORT === "true" || !devServerHost;'));
  assert.ok(source.includes("...(reusePort ? { reusePort: true } : {}),"));
  assert.doesNotMatch(source, /\n\s*reusePort:\s*true,\s*\n/);
});

test("local preview docs and env example document 127.0.0.1 host override without requiring reusePort", () => {
  const envExample = readRepoFile(".env.example");
  const localDocs = readRepoFile("docs/LOCAL_DEVELOPMENT.md");

  assert.ok(envExample.includes("DEV_SERVER_HOST=127.0.0.1"));
  assert.ok(envExample.includes("# DEV_SERVER_REUSE_PORT=true"));
  assert.ok(localDocs.includes("DEV_SERVER_HOST=127.0.0.1"));
  assert.ok(localDocs.includes("bind to `127.0.0.1:5000`"));
  assert.ok(localDocs.includes("Leave `DEV_SERVER_REUSE_PORT` unset for normal local preview"));
});

test("local server host characterization stays source-only", () => {
  const testSource = readRepoFile("server/local-server-host.characterization.test.ts");

  assert.ok(testSource.includes("readFileSync"));
  assert.doesNotMatch(testSource, /from\s+["']\.\/index["']/);
  assert.doesNotMatch(testSource, /process\.env\.[A-Z_]+\s*=(?!=)/);
});
