import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(serverDir, "..");
const inventoryDocPath = path.join(repoRoot, "docs", "replit-runtime-dependencies.md");

type InventoryEntry = {
  area: string;
  file: string;
  classification: "runtime critical" | "runtime default" | "fallback only";
  markers: RegExp[];
};

const runtimeInventory: InventoryEntry[] = [
  {
    area: "auth",
    file: "server/replitAuth.ts",
    classification: "runtime critical",
    markers: [
      /process\.env\.ISSUER_URL \?\? "https:\/\/replit\.com\/oidc"/,
      /process\.env\.REPL_ID!/,
      /replitauth:\$\{domain\}/,
      /refreshExpiredReplitSession/,
    ],
  },
  {
    area: "auth",
    file: "server/routes.ts",
    classification: "runtime critical",
    markers: [
      /import \{ setupAuth, isAuthenticated \} from "\.\/replitAuth";/,
      /await setupAuth\(app\);/,
      /Fall back to Replit OAuth/,
    ],
  },
  {
    area: "calendar",
    file: "server/calendar/defaultProvider.ts",
    classification: "runtime default",
    markers: [
      /env\.CALENDAR_PROVIDER \|\| "replit"/,
      /createReplitProvider = getDefaultReplitCalendarProvider/,
      /return createReplitProvider\(\);/,
    ],
  },
  {
    area: "calendar",
    file: "server/calendar/replitProvider.ts",
    classification: "runtime default",
    markers: [
      /process\.env\.REPLIT_CONNECTORS_HOSTNAME/,
      /process\.env\.REPL_IDENTITY/,
      /process\.env\.WEB_REPL_RENEWAL/,
      /X_REPLIT_TOKEN: xReplitToken/,
    ],
  },
  {
    area: "storage",
    file: "server/storage/defaultProvider.ts",
    classification: "runtime default",
    markers: [
      /env\.OBJECT_STORAGE_PROVIDER \|\| "replit"/,
      /createReplitProvider = getDefaultReplitObjectStorageProvider/,
      /return createReplitProvider\(\);/,
    ],
  },
  {
    area: "storage",
    file: "server/storage/replitProvider.ts",
    classification: "runtime default",
    markers: [
      /const REPLIT_SIDECAR_ENDPOINT = "http:\/\/127\.0\.0\.1:1106";/,
      /audience: "replit"/,
      /object-storage\/signed-object-url/,
      /make sure you're running on Replit/,
    ],
  },
  {
    area: "storage",
    file: "server/objectStorage.ts",
    classification: "runtime default",
    markers: [
      /from "\.\/storage\/replitProvider";/,
      /export \{ objectStorageClient \};/,
    ],
  },
  {
    area: "email fallback",
    file: "server/email/credentials.ts",
    classification: "fallback only",
    markers: [
      /source: "env" \| "replit-connector";/,
      /process\.env\.REPLIT_CONNECTORS_HOSTNAME/,
      /process\.env\.REPL_IDENTITY/,
      /process\.env\.WEB_REPL_RENEWAL/,
      /process\.env\.NODE_ENV !== "production"/,
    ],
  },
  {
    area: "payment redirect",
    file: "server/aiChat.ts",
    classification: "fallback only",
    markers: [
      /process\.env\.PUBLIC_BASE_URL \|\| process\.env\.REPLIT_DEPLOYMENT_URL \|\| 'https:\/\/dateinquiry\.com'/,
    ],
  },
];

const allowedRuntimeReferenceFiles = new Set([
  "client/index.html",
  "client/src/components/ui/badge.tsx",
  "client/src/components/ui/button.tsx",
  "server/aiChat.ts",
  "server/auth/session.ts",
  "server/calendar/defaultProvider.ts",
  "server/calendar/replitProvider.ts",
  "server/cdiAgent.ts",
  "server/db.ts",
  "server/email/credentials.ts",
  "server/index.ts",
  "server/objectStorage.ts",
  "server/replitAuth.ts",
  "server/routes.ts",
  "server/storage.ts",
  "server/storage/defaultProvider.ts",
  "server/storage/replitProvider.ts",
]);

const referenceOnlyFiles = [
  "server/cdiAgent.ts",
  "server/db.ts",
  "server/auth/session.ts",
  "server/index.ts",
  "server/storage.ts",
  "client/index.html",
  "client/src/components/ui/button.tsx",
  "client/src/components/ui/badge.tsx",
];

const testOnlyFiles = [
  "server/auth-session.characterization.test.ts",
  "server/auth-login-oidc.characterization.test.ts",
  "server/calendar-availability.characterization.test.ts",
  "server/calendar-provider.characterization.test.ts",
  "server/calendar-direct-provider.contract.test.ts",
  "server/email-credentials.characterization.test.ts",
  "server/object-storage.characterization.test.ts",
  "server/storage/directProvider.characterization.test.ts",
];

const replitRuntimePattern =
  /replit|REPLIT_|REPL_ID|REPL_IDENTITY|WEB_REPL_RENEWAL|REPLIT_CONNECTORS_HOSTNAME|ISSUER_URL|replitauth|127\.0\.0\.1:1106/i;

async function readRepoFile(relativePath: string): Promise<string> {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

async function collectSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return collectSourceFiles(fullPath);
      }

      if (!entry.isFile()) {
        return [];
      }

      if (!/\.(ts|tsx|js|jsx|json|html)$/.test(entry.name) || /\.test\.ts$/.test(entry.name)) {
        return [];
      }

      return [path.relative(repoRoot, fullPath).replaceAll(path.sep, "/")];
    }),
  );

  return files.flat();
}

test("Replit runtime dependency inventory document lists every tracked runtime dependency", async () => {
  const docText = await readFile(inventoryDocPath, "utf8");

  for (const entry of runtimeInventory) {
    assert.match(docText, new RegExp(`\\| ${entry.area} \\| \`${entry.file}\``));
    assert.match(docText, new RegExp(`\\| ${entry.classification} \\|`));
  }

  for (const file of referenceOnlyFiles) {
    assert.match(docText, new RegExp(`\`${file}\``));
  }

  for (const file of testOnlyFiles) {
    assert.match(docText, new RegExp(`\`${file}\``));
  }
});

test("tracked runtime Replit dependency files still contain their expected source markers", async () => {
  for (const entry of runtimeInventory) {
    const source = await readRepoFile(entry.file);

    for (const marker of entry.markers) {
      assert.match(source, marker, `${entry.file} drifted from the documented ${entry.area} Replit dependency`);
    }
  }
});

test("new runtime Replit source references must be added to the inventory", async () => {
  const sourceFiles = [
    ...(await collectSourceFiles(path.join(repoRoot, "server"))),
    ...(await collectSourceFiles(path.join(repoRoot, "client"))),
  ];
  const filesWithReplitReferences: string[] = [];

  for (const file of sourceFiles) {
    const source = await readRepoFile(file);

    if (replitRuntimePattern.test(source)) {
      filesWithReplitReferences.push(file);
    }
  }

  assert.deepEqual(
    filesWithReplitReferences.sort(),
    [...allowedRuntimeReferenceFiles].sort(),
  );
});
