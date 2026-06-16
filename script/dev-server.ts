import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

process.env.NODE_ENV = "development";

function unquoteEnvValue(value: string): string {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if (
    trimmed.length >= 2 &&
    (quote === `"` || quote === "'" || quote === "`") &&
    trimmed[trimmed.length - 1] === quote
  ) {
    const inner = trimmed.slice(1, -1);
    return quote === `"`
      ? inner.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t")
      : inner;
  }
  return trimmed;
}

function loadLocalEnvFile(filePath: string): boolean {
  if (!existsSync(filePath)) {
    return false;
  }

  const contents = readFileSync(filePath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const normalized = line.startsWith("export ") ? line.slice("export ".length).trim() : line;
    const equalsIndex = normalized.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }

    const key = normalized.slice(0, equalsIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = unquoteEnvValue(normalized.slice(equalsIndex + 1));
  }

  return true;
}

const envFile = [".env.local", ".env"]
  .map((fileName) => path.resolve(process.cwd(), fileName))
  .find((filePath) => existsSync(filePath));

if (envFile && loadLocalEnvFile(envFile)) {
  console.log(`[dev-env] Loaded ${path.basename(envFile)} for local dev server`);
}

await import("../server/index.ts");
