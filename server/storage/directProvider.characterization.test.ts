import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  createConfiguredObjectStorageProvider,
  getConfiguredObjectStorageProviderName,
} from "./defaultProvider";
import {
  DirectObjectStorageProvider,
  validateDirectObjectStorageEnv,
} from "./directProvider";

function createMockStorage() {
  const fileCalls: Array<{ bucketName: string; objectName: string }> = [];
  const signedUrlCalls: Array<Record<string, unknown>> = [];
  const file = {
    async getSignedUrl(options: Record<string, unknown>) {
      signedUrlCalls.push(options);
      return ["https://storage.example.test/signed-url"];
    },
  };

  const storage = {
    bucket(bucketName: string) {
      return {
        file(objectName: string) {
          fileCalls.push({ bucketName, objectName });
          return file as any;
        },
      };
    },
  };

  return { storage, fileCalls, signedUrlCalls };
}

test("direct object storage provider delegates getFile to the injected storage client", () => {
  const { storage, fileCalls } = createMockStorage();
  const provider = new DirectObjectStorageProvider({ storage: storage as any });

  const file = provider.getFile("briarwood-private", "uploads/file.png");

  assert.ok(file);
  assert.deepEqual(fileCalls, [
    { bucketName: "briarwood-private", objectName: "uploads/file.png" },
  ]);
});

test("direct object storage provider requires explicit env creation or injected storage", () => {
  assert.throws(
    () => new DirectObjectStorageProvider(),
    /requires an explicit storage client/,
  );
  assert.throws(
    () => validateDirectObjectStorageEnv({}),
    /Direct object storage provider requires direct Google Cloud config/,
  );
  assert.deepEqual(
    validateDirectObjectStorageEnv({
      DIRECT_OBJECT_STORAGE_PROJECT_ID: "briarwood-prod",
      DIRECT_OBJECT_STORAGE_KEY_FILE: "C:/secrets/service-account.json",
    }),
    {
      projectId: "briarwood-prod",
      keyFilename: "C:/secrets/service-account.json",
    },
  );
  assert.deepEqual(
    validateDirectObjectStorageEnv({
      GOOGLE_CLOUD_PROJECT: "briarwood-adc",
    }),
    {
      projectId: "briarwood-adc",
      keyFilename: undefined,
    },
  );
});

test("direct object storage provider signs PUT URLs with v4 write action and ttl", async () => {
  const { storage, fileCalls, signedUrlCalls } = createMockStorage();
  const provider = new DirectObjectStorageProvider({
    storage: storage as any,
    now: () => Date.parse("2026-01-01T00:00:00.000Z"),
  });

  const signedUrl = await provider.signObjectURL({
    bucketName: "briarwood-private",
    objectName: "uploads/file.png",
    method: "PUT",
    ttlSec: 900,
  });

  assert.equal(signedUrl, "https://storage.example.test/signed-url");
  assert.deepEqual(fileCalls, [
    { bucketName: "briarwood-private", objectName: "uploads/file.png" },
  ]);
  assert.deepEqual(signedUrlCalls, [
    {
      version: "v4",
      action: "write",
      expires: new Date("2026-01-01T00:15:00.000Z"),
    },
  ]);
});

test("direct object storage provider maps read and delete methods without changing the provider interface", async () => {
  const { storage, signedUrlCalls } = createMockStorage();
  const provider = new DirectObjectStorageProvider({
    storage: storage as any,
    now: () => Date.parse("2026-01-01T00:00:00.000Z"),
  });

  await provider.signObjectURL({
    bucketName: "briarwood-public",
    objectName: "portfolio/image.jpg",
    method: "GET",
    ttlSec: 60,
  });
  await provider.signObjectURL({
    bucketName: "briarwood-public",
    objectName: "portfolio/image.jpg",
    method: "HEAD",
    ttlSec: 60,
  });
  await provider.signObjectURL({
    bucketName: "briarwood-private",
    objectName: "uploads/old.pdf",
    method: "DELETE",
    ttlSec: 60,
  });

  assert.deepEqual(
    signedUrlCalls.map((call) => call.action),
    ["read", "read", "delete"],
  );
});

test("object storage provider selection defaults to Replit and requires direct opt-in", () => {
  const replitProvider = { name: "replit-provider" } as any;
  const directProvider = { name: "direct-provider" } as any;

  assert.equal(getConfiguredObjectStorageProviderName({}), "replit");
  assert.equal(
    createConfiguredObjectStorageProvider({
      env: {},
      createReplitProvider: () => replitProvider,
      createDirectProvider: () => directProvider,
    }),
    replitProvider,
  );
  assert.equal(getConfiguredObjectStorageProviderName({ OBJECT_STORAGE_PROVIDER: "direct" }), "direct");
  assert.equal(
    createConfiguredObjectStorageProvider({
      env: {
        OBJECT_STORAGE_PROVIDER: "direct",
        DIRECT_OBJECT_STORAGE_PROJECT_ID: "briarwood-prod",
      },
      createReplitProvider: () => replitProvider,
      createDirectProvider: () => directProvider,
    }),
    directProvider,
  );
  assert.throws(
    () => createConfiguredObjectStorageProvider({
      env: { OBJECT_STORAGE_PROVIDER: "direct" },
      createReplitProvider: () => replitProvider,
      createDirectProvider: () => directProvider,
    }),
    /Direct object storage provider requires direct Google Cloud config/,
  );
  assert.throws(
    () => getConfiguredObjectStorageProviderName({ OBJECT_STORAGE_PROVIDER: "gcs" }),
    /Unsupported OBJECT_STORAGE_PROVIDER/,
  );
});

test("Replit remains the default provider in ObjectStorageService until a provider switch PR", async () => {
  const [objectStorageText, replitProviderText, defaultProviderText, directProviderText] = await Promise.all([
    readFile(new URL("../objectStorage.ts", import.meta.url), "utf8"),
    readFile(new URL("./replitProvider.ts", import.meta.url), "utf8"),
    readFile(new URL("./defaultProvider.ts", import.meta.url), "utf8"),
    readFile(new URL("./directProvider.ts", import.meta.url), "utf8"),
  ]);

  assert.match(objectStorageText, /from "\.\/storage\/defaultProvider"/);
  assert.doesNotMatch(objectStorageText, /directProvider/);
  assert.match(replitProviderText, /const defaultObjectStorageProvider = new ReplitObjectStorageProvider\(\);/);
  assert.match(defaultProviderText, /env\.OBJECT_STORAGE_PROVIDER \|\| "replit"/);
  assert.match(defaultProviderText, /providerName === "direct"/);
  assert.match(defaultProviderText, /validateDirectObjectStorageEnv\(env\)/);
  assert.match(defaultProviderText, /return createReplitProvider\(\);/);
  assert.doesNotMatch(directProviderText, /getDefaultObjectStorageProvider/);
});
