import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("startup self-healing creates the Square OAuth state table used by storage", async () => {
  const [indexSource, schemaSource, storageSource] = await Promise.all([
    readFile(new URL("./index.ts", import.meta.url), "utf8"),
    readFile(new URL("../shared/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("./storage.ts", import.meta.url), "utf8"),
  ]);

  assert.match(schemaSource, /export const oauthStates = pgTable\("oauth_states"/);
  assert.match(storageSource, /cleanupExpiredOAuthStates\(\): Promise<void>/);
  assert.match(storageSource, /db\.delete\(oauthStates\)\.where\(lt\(oauthStates\.expiresAt, new Date\(\)\)\)/);

  assert.match(indexSource, /name: 'oauth_states\.table'/);
  assert.match(indexSource, /CREATE TABLE IF NOT EXISTS oauth_states/);
  assert.match(indexSource, /state varchar UNIQUE NOT NULL/);
  assert.match(indexSource, /provider text NOT NULL DEFAULT 'square'/);
  assert.match(indexSource, /expires_at timestamp NOT NULL/);
});
