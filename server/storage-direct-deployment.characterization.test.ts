import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("direct object storage selector keeps Replit default and validates direct config first", async () => {
  const [defaultProviderText, directProviderText, replitProviderText] = await Promise.all([
    readFile(new URL("./storage/defaultProvider.ts", import.meta.url), "utf8"),
    readFile(new URL("./storage/directProvider.ts", import.meta.url), "utf8"),
    readFile(new URL("./storage/replitProvider.ts", import.meta.url), "utf8"),
  ]);

  assert.match(defaultProviderText, /env\.OBJECT_STORAGE_PROVIDER \|\| "replit"/);
  assert.match(defaultProviderText, /configuredProvider === "replit" \|\| configuredProvider === "direct"/);
  assert.match(defaultProviderText, /Unsupported OBJECT_STORAGE_PROVIDER/);
  assert.match(defaultProviderText, /createDirectProvider = \(\) => DirectObjectStorageProvider\.fromEnv\(env\)/);
  assert.match(
    defaultProviderText,
    /if \(providerName === "direct"\) \{[\s\S]*?validateDirectObjectStorageEnv\(env\);[\s\S]*?return createDirectProvider\(\);[\s\S]*?\}/,
  );
  assert.match(defaultProviderText, /return createReplitProvider\(\);/);

  assert.match(replitProviderText, /const defaultObjectStorageProvider = new ReplitObjectStorageProvider\(\);/);
  assert.match(directProviderText, /export function validateDirectObjectStorageEnv/);
  assert.match(directProviderText, /DIRECT_OBJECT_STORAGE_PROJECT_ID/);
  assert.match(directProviderText, /GOOGLE_CLOUD_PROJECT/);
  assert.match(directProviderText, /DIRECT_OBJECT_STORAGE_KEY_FILE/);
  assert.match(directProviderText, /GOOGLE_APPLICATION_CREDENTIALS/);
  assert.match(directProviderText, /Direct object storage provider requires direct Google Cloud config/);
});

test("objectStorage compatibility export remains Replit-backed while service uses selector", async () => {
  const [objectStorageText, replitProviderText] = await Promise.all([
    readFile(new URL("./objectStorage.ts", import.meta.url), "utf8"),
    readFile(new URL("./storage/replitProvider.ts", import.meta.url), "utf8"),
  ]);

  assert.match(objectStorageText, /import \{ getDefaultObjectStorageProvider \} from "\.\/storage\/defaultProvider";/);
  assert.match(objectStorageText, /import \{ objectStorageClient \} from "\.\/storage\/replitProvider";/);
  assert.match(objectStorageText, /export \{ objectStorageClient \};/);
  assert.match(
    objectStorageText,
    /private readonly provider: ObjectStorageProvider = getDefaultObjectStorageProvider\(\)/,
  );
  assert.doesNotMatch(objectStorageText, /from "\.\/storage\/directProvider"/);

  assert.match(replitProviderText, /export const objectStorageClient = new Storage\(\{[\s\S]*?audience: "replit"/);
  assert.match(replitProviderText, /const REPLIT_SIDECAR_ENDPOINT = "http:\/\/127\.0\.0\.1:1106";/);
});

test("direct object storage rollout checklist stays explicit and non-production", async () => {
  const docsText = await readFile(new URL("../docs/direct-object-storage-provider.md", import.meta.url), "utf8");

  assert.match(docsText, /OBJECT_STORAGE_PROVIDER=direct/);
  assert.match(docsText, /PRIVATE_OBJECT_DIR/);
  assert.match(docsText, /PUBLIC_OBJECT_SEARCH_PATHS/);
  assert.match(docsText, /DIRECT_OBJECT_STORAGE_PROJECT_ID/);
  assert.match(docsText, /GOOGLE_APPLICATION_CREDENTIALS/);
  assert.match(docsText, /staging-only/i);
  assert.match(docsText, /rollback/i);
  assert.match(docsText, /\/api\/objects\/upload/);
  assert.match(docsText, /\/objects\//);
  assert.match(docsText, /No production switch happens in this PR/);
});
