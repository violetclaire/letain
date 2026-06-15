import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function readRepoFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("server/db.ts prefers NEON_DATABASE_URL, falls back to DATABASE_URL, and cleans the selected URL", () => {
  const source = readRepoFile("server/db.ts");

  assert.ok(source.includes("function cleanDatabaseUrl(url: string): string"));
  assert.ok(source.includes("replace(/^psql\\s*/, '')"));
  assert.ok(source.includes("replace(/^['\"\\s]+/, '')"));
  assert.ok(source.includes("replace(/['\"\\s]+$/, '')"));
  assert.ok(source.includes(".trim();"));

  assert.match(
    source,
    /if \(process\.env\.NEON_DATABASE_URL\) \{\s*return cleanDatabaseUrl\(process\.env\.NEON_DATABASE_URL\);\s*\}\s*if \(process\.env\.DATABASE_URL\) \{\s*return cleanDatabaseUrl\(process\.env\.DATABASE_URL\);/,
  );
  assert.ok(source.includes("NEON_DATABASE_URL or DATABASE_URL must be set"));
  assert.ok(source.includes("const connectionString = getDatabaseUrl();"));
  assert.ok(source.includes("_pool = new Pool({ connectionString });"));
});

test("server/auth/session.ts uses NEON_DATABASE_URL or DATABASE_URL directly for the session store", () => {
  const source = readRepoFile("server/auth/session.ts");

  assert.ok(source.includes("const dbUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;"));
  assert.ok(source.includes("conString: dbUrl"));
  assert.ok(source.includes("connectPg(session)"));
  assert.ok(source.includes("tableName: \"sessions\""));
  assert.doesNotMatch(source, /cleanDatabaseUrl|getDatabaseUrl/);
});

test("drizzle.config.ts currently requires DATABASE_URL directly", () => {
  const source = readRepoFile("drizzle.config.ts");

  assert.ok(source.includes("if (!process.env.DATABASE_URL) {"));
  assert.ok(source.includes("url: process.env.DATABASE_URL"));
  assert.ok(source.includes('dialect: "postgresql"'));
  assert.doesNotMatch(source, /NEON_DATABASE_URL|cleanDatabaseUrl|getDatabaseUrl/);
});

test("runtime, session, and Drizzle database URL handling are intentionally characterized as mismatched", () => {
  const dbSource = readRepoFile("server/db.ts");
  const sessionSource = readRepoFile("server/auth/session.ts");
  const drizzleSource = readRepoFile("drizzle.config.ts");

  assert.ok(dbSource.includes("return cleanDatabaseUrl(process.env.NEON_DATABASE_URL);"));
  assert.ok(dbSource.includes("return cleanDatabaseUrl(process.env.DATABASE_URL);"));

  assert.ok(sessionSource.includes("const dbUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;"));
  assert.doesNotMatch(sessionSource, /cleanDatabaseUrl|getDatabaseUrl/);

  assert.ok(drizzleSource.includes("url: process.env.DATABASE_URL"));
  assert.doesNotMatch(drizzleSource, /NEON_DATABASE_URL/);
});

test("database URL dependency characterization stays source-only", () => {
  const testSource = readRepoFile("server/database-url.characterization.test.ts");

  assert.ok(testSource.includes("readFileSync"));
  assert.doesNotMatch(testSource, /from\s+["']\.\/db["']/);
  assert.doesNotMatch(testSource, /from\s+["']\.\/auth\/session["']/);
  assert.doesNotMatch(testSource, /from\s+["']\.\.\/drizzle\.config["']/);
  assert.doesNotMatch(testSource, /process\.env\.[A-Z_]+\s*=/);
});
