import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readRepoFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Vite dev proxy keeps the default backend target unless explicitly overridden", () => {
  const source = readRepoFile("vite.config.ts");

  assert.match(source, /target: process\.env\.VITE_API_PROXY_TARGET \|\| "http:\/\/localhost:5000"/);
  assert.match(source, /proxy:\s*\{[\s\S]*"\/api"[\s\S]*changeOrigin: true/);
});

test("local preview env and docs document the optional 5001 backend/proxy override", () => {
  const envExample = readRepoFile(".env.example");
  const localDocs = readRepoFile("docs/LOCAL_DEVELOPMENT.md");

  assert.match(envExample, /PORT=5001/);
  assert.match(envExample, /VITE_API_PROXY_TARGET=http:\/\/localhost:5001/);
  assert.match(localDocs, /PORT=5001/);
  assert.match(localDocs, /VITE_API_PROXY_TARGET=http:\/\/localhost:5001/);
  assert.match(localDocs, /backend should bind to `127\.0\.0\.1:5001`/);
  assert.match(localDocs, /Vite dev proxy should forward `\/api` calls to `http:\/\/localhost:5001`/);
});

test("Vite proxy characterization stays source-only", () => {
  const testSource = readRepoFile("server/vite-proxy-port.characterization.test.ts");

  assert.ok(testSource.includes("readFileSync"));
  assert.doesNotMatch(testSource, /from\s+["']\.\.\/vite\.config["']/);
  assert.doesNotMatch(testSource, /process\.env\.[A-Z_]+\s*=(?!=)/);
});
