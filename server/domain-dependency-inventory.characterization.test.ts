import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const serverDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(serverDir, "..");
const inventoryDocPath = path.join(repoRoot, "docs", "domain-dependency-inventory.md");

type InventoryEntry = {
  file: string;
  classifications: string[];
  markers: RegExp[];
};

const trackedRuntimeReferences: InventoryEntry[] = [
  {
    file: "server/emailService.ts",
    classifications: [
      "sender/from-domain sensitive",
      "contract/token-link sensitive",
      "legacy bridge context",
    ],
    markers: [
      /const WHITELABEL_EMAIL_DOMAIN = 'dateinquiry\.com';/,
      /const WHITELABEL_FROM_EMAIL = 'notifications@dateinquiry\.com';/,
      /import \{ getLegacyDateInquiryPublicBaseUrl \} from '\.\/config\/publicUrl';/,
      /process\.env\.PUBLIC_BASE_URL \|\| 'https:\/\/dateinquiry\.com'/,
    ],
  },
  {
    file: "server/aiChat.ts",
    classifications: [
      "sender/from-domain sensitive",
      "payment-link sensitive",
      "contract/token-link sensitive",
    ],
    markers: [
      /const WHITELABEL_FROM_EMAIL = "notifications@dateinquiry\.com";/,
      /from: fromEmail \|\| "Your Secretary <notifications@dateinquiry\.com>"/,
      /process\.env\.PUBLIC_BASE_URL \|\| process\.env\.REPLIT_DEPLOYMENT_URL \|\| 'https:\/\/dateinquiry\.com'/,
    ],
  },
  {
    file: "server/squareRoutes.ts",
    classifications: ["Square OAuth/callback sensitive"],
    markers: [
      /const callbackBaseUrl = 'https:\/\/dateinquiry\.com';/,
      /const callbackUrl = 'https:\/\/dateinquiry\.com\/api\/square\/connect\/callback';/,
      /const errorRedirect = 'https:\/\/dateinquiry\.com\/artist\?square=error&message=';/,
      /const productionDomain = 'https:\/\/dateinquiry\.com';/,
    ],
  },
  {
    file: "server/routes.ts",
    classifications: [
      "sender/from-domain sensitive",
      "contract/token-link sensitive",
      "client-visible branding",
      "legacy bridge context",
    ],
    markers: [
      /from: 'Your Secretary <notifications@dateinquiry\.com>'/,
      /const clientThreadLink = `https:\/\/dateinquiry\.com\/thread\/\$\{inquiry\.clientThreadToken\}`;/,
      /const adminThreadLink = `https:\/\/dateinquiry\.com\/inquiry\/\$\{inquiry\.threadToken\}`;/,
      /const baseUrl = process\.env\.PUBLIC_BASE_URL \|\| 'https:\/\/dateinquiry\.com';/,
      /const baseUrl = process\.env\.PUBLIC_BASE_URL \|\| 'https:\/\/briarwood\.ai';/,
    ],
  },
  {
    file: "server/agentRoutes.ts",
    classifications: ["contract/token-link sensitive", "legacy bridge context"],
    markers: [
      /getBriarwoodPublicBaseUrl,[\s\S]*?getLegacyDateInquiryPublicBaseUrl,[\s\S]*?from "\.\/config\/publicUrl";/,
      /const publicBaseUrl = getBriarwoodPublicBaseUrl\(\);/,
      /baseUrl: getBriarwoodPublicBaseUrl\(\)/,
      /const baseUrl = getLegacyDateInquiryPublicBaseUrl\(\);/,
      /url: publicBaseUrl/,
    ],
  },
  {
    file: "server/acpHandler.ts",
    classifications: ["contract/token-link sensitive", "legacy bridge context"],
    markers: [/process\.env\.PUBLIC_BASE_URL \|\| "https:\/\/dateinquiry\.com"/],
  },
  {
    file: "server/config/publicUrl.ts",
    classifications: ["public metadata / SEO / branding", "legacy bridge context"],
    markers: [
      /export const BRIARWOOD_PUBLIC_BASE_URL = "https:\/\/briarwood\.ai";/,
      /export const LEGACY_DATEINQUIRY_PUBLIC_BASE_URL = "https:\/\/dateinquiry\.com";/,
      /export function getLegacyDateInquiryPublicBaseUrl\(\): string/,
    ],
  },
  {
    file: "server/replitAuth.ts",
    classifications: ["legacy bridge context", "client-visible branding"],
    markers: [/const isDateInquiry = req\.hostname\.includes\('dateinquiry'\);/],
  },
  {
    file: "server/index.ts",
    classifications: ["public metadata / SEO / branding"],
    markers: [/'briarwood\.ai'/, /'www\.briarwood\.ai'/],
  },
  {
    file: "capacitor.config.ts",
    classifications: ["public metadata / SEO / branding"],
    markers: [/url: 'https:\/\/briarwood\.ai'/],
  },
  {
    file: "client/src/pages/ArtistSettings.tsx",
    classifications: ["client-visible branding", "contract/token-link sensitive", "legacy bridge context"],
    markers: [
      /const embedApiUrl = 'https:\/\/dateinquiry\.com';/,
      /<iframe src="https:\/\/dateinquiry\.com\/inquire\/\$\{settings\.artistSlug\}"/,
      /briarwood\.ai\/\{settings\.artistSlug\}/,
    ],
  },
  {
    file: "client/src/pages/Login.tsx",
    classifications: ["client-visible branding", "legacy bridge context"],
    markers: [/window\.location\.href = `https:\/\/dateinquiry\.com\/admin\/\$\{data\.artistSlug\}`;/],
  },
  {
    file: "client/src/pages/intake/ArtistIntake.tsx",
    classifications: ["client-visible branding", "legacy bridge context"],
    markers: [/window\.location\.href = `https:\/\/dateinquiry\.com\/setup\/\$\{data\.artistSlug\}\/square`;/],
  },
  {
    file: "client/src/hooks/useDashboard.ts",
    classifications: ["client-visible branding", "legacy bridge context"],
    markers: [/window\.location\.hostname\.includes\('dateinquiry'\)/],
  },
  {
    file: "client/src/components/AIChatPanel.tsx",
    classifications: ["client-visible branding", "legacy bridge context"],
    markers: [/window\.location\.hostname\.includes\('dateinquiry'\)/],
  },
  {
    file: "server/cdiService.ts",
    classifications: ["legacy bridge context"],
    markers: [/Based on 16 years of high-stakes coordination patterns from The Makeup Dolls\./],
  },
  {
    file: "server/timelineParser.ts",
    classifications: ["legacy bridge context"],
    markers: [/"Hair and Makeup", "Makeup Dolls", "glam", "styling"/],
  },
  {
    file: "client/src/pages/Proposals.tsx",
    classifications: ["client-visible branding", "legacy bridge context"],
    markers: [/Violet \/ The Makeup Dolls/],
  },
];

const allowedRuntimeReferenceFiles = new Set([
  "client/src/App.tsx",
  "client/src/components/AIChatPanel.tsx",
  "client/src/hooks/useDashboard.ts",
  "client/src/pages/ArtistDashboard.tsx",
  "client/src/pages/ArtistSettings.tsx",
  "client/src/pages/Login.tsx",
  "client/src/pages/Proposals.tsx",
  "client/src/pages/Sandbox.tsx",
  "client/src/pages/SecretaryOnboarding.tsx",
  "client/src/pages/intake/ArtistIntake.tsx",
  "server/acpHandler.ts",
  "server/agentRoutes.ts",
  "server/aiChat.ts",
  "server/assistantService.ts",
  "server/cdiService.ts",
  "server/config/publicUrl.ts",
  "server/cronJobs.ts",
  "server/emailService.ts",
  "server/replitAuth.ts",
  "server/routes.ts",
  "server/routingService.ts",
  "server/squareRoutes.ts",
  "server/storage.ts",
  "server/timelineParser.ts",
  "shared/schema.ts",
]);

const trackedRuntimePattern =
  /dateinquiry\.com|DateInquiry|The Makeup Dolls|Makeup Dolls/i;

async function readRepoFile(relativePath: string): Promise<string> {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

async function collectSourceFiles(dir: string): Promise<string[]> {
  if (!existsSync(dir)) {
    return [];
  }

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

test("domain dependency inventory document lists every tracked runtime source file", async () => {
  const docText = await readFile(inventoryDocPath, "utf8");

  for (const file of allowedRuntimeReferenceFiles) {
    assert.match(docText, new RegExp(`\`${file}\``));
  }
});

test("tracked sensitive domain references still contain their documented source markers", async () => {
  for (const entry of trackedRuntimeReferences) {
    const source = await readRepoFile(entry.file);

    for (const classification of entry.classifications) {
      assert.match(
        await readFile(inventoryDocPath, "utf8"),
        new RegExp(classification.replaceAll("/", "\\/")),
        `${entry.file} is missing the ${classification} classification`,
      );
    }

    for (const marker of entry.markers) {
      assert.match(source, marker, `${entry.file} drifted from the documented domain inventory`);
    }
  }
});

test("new runtime DateInquiry/domain references must be added to the inventory", async () => {
  const sourceFiles = [
    ...(await collectSourceFiles(path.join(repoRoot, "server"))),
    ...(await collectSourceFiles(path.join(repoRoot, "client"))),
    ...(await collectSourceFiles(path.join(repoRoot, "shared"))),
    ...(await collectSourceFiles(path.join(repoRoot, "script"))),
    "capacitor.config.ts",
    "package.json",
    "vite-plugin-meta-images.ts",
  ];
  const filesWithTrackedReferences: string[] = [];

  for (const file of sourceFiles) {
    if (!existsSync(path.join(repoRoot, file))) {
      continue;
    }

    const source = await readRepoFile(file);

    if (trackedRuntimePattern.test(source)) {
      filesWithTrackedReferences.push(file);
    }
  }

  assert.deepEqual(
    filesWithTrackedReferences.sort(),
    [...allowedRuntimeReferenceFiles].sort(),
  );
});

test("sensitive DateInquiry migration categories are explicitly classified", async () => {
  const docText = await readFile(inventoryDocPath, "utf8");

  const requiredClassifications = [
    ["server/emailService.ts", "sender/from-domain sensitive"],
    ["server/squareRoutes.ts", "Square OAuth/callback sensitive"],
    ["server/aiChat.ts", "payment-link sensitive"],
    ["server/routes.ts", "contract/token-link sensitive"],
    ["client/src/pages/ArtistSettings.tsx", "client-visible branding"],
    ["server/config/publicUrl.ts", "legacy bridge context"],
  ];

  for (const [file, classification] of requiredClassifications) {
    assert.match(docText, new RegExp(`\`${file}\``));
    assert.match(docText, new RegExp(classification.replaceAll("/", "\\/")));
  }
});
