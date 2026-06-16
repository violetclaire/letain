import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readRepoFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("API server keeps the default 0.0.0.0 bind host unless DEV_SERVER_HOST is set", () => {
  const source = readRepoFile("server/index.ts");

  assert.ok(source.includes('const host = process.env.DEV_SERVER_HOST?.trim() || "0.0.0.0";'));
  assert.match(source, /httpServer\.listen\(\s*\{\s*port,\s*host,\s*reusePort: true,/);
  assert.doesNotMatch(source, /host:\s*"0\.0\.0\.0"/);
});

test("local preview docs and env example document 127.0.0.1 host override", () => {
  const envExample = readRepoFile(".env.example");
  const localDocs = readRepoFile("docs/LOCAL_DEVELOPMENT.md");

  assert.ok(envExample.includes("DEV_SERVER_HOST=127.0.0.1"));
  assert.ok(localDocs.includes("DEV_SERVER_HOST=127.0.0.1"));
  assert.ok(localDocs.includes("bind to `127.0.0.1:5000`"));
});

test("local server host characterization stays source-only", () => {
  const testSource = readRepoFile("server/local-server-host.characterization.test.ts");

  assert.ok(testSource.includes("readFileSync"));
  assert.doesNotMatch(testSource, /from\s+["']\.\/index["']/);
  assert.doesNotMatch(testSource, /process\.env\.[A-Z_]+\s*=/);
});
