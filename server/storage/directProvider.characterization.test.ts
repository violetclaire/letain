import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { DirectObjectStorageProvider } from "./directProvider";

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

test("direct provider remains a non-default skeleton until the provider switch PR", async () => {
  const [objectStorageText, replitProviderText, directProviderText] = await Promise.all([
    readFile(new URL("../objectStorage.ts", import.meta.url), "utf8"),
    readFile(new URL("./replitProvider.ts", import.meta.url), "utf8"),
    readFile(new URL("./directProvider.ts", import.meta.url), "utf8"),
  ]);

  assert.match(objectStorageText, /from "\.\/storage\/replitProvider"/);
  assert.doesNotMatch(objectStorageText, /directProvider/);
  assert.match(replitProviderText, /const defaultObjectStorageProvider = new ReplitObjectStorageProvider\(\);/);
  assert.match(replitProviderText, /export function getDefaultObjectStorageProvider\(\): ObjectStorageProvider/);
  assert.doesNotMatch(directProviderText, /getDefaultObjectStorageProvider/);
});
