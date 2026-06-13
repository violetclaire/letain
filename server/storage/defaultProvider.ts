import type { ObjectStorageProvider } from "./provider";
import {
  DirectObjectStorageProvider,
  validateDirectObjectStorageEnv,
} from "./directProvider";
import { getDefaultReplitObjectStorageProvider } from "./replitProvider";

export type ObjectStorageProviderName = "replit" | "direct";

interface CreateConfiguredObjectStorageProviderOptions {
  env?: NodeJS.ProcessEnv;
  createReplitProvider?: () => ObjectStorageProvider;
  createDirectProvider?: () => ObjectStorageProvider;
}

let cachedProviderName: ObjectStorageProviderName | null = null;
let cachedProvider: ObjectStorageProvider | null = null;

export function getConfiguredObjectStorageProviderName(
  env: NodeJS.ProcessEnv = process.env,
): ObjectStorageProviderName {
  const configuredProvider = (env.OBJECT_STORAGE_PROVIDER || "replit").trim().toLowerCase();

  if (configuredProvider === "replit" || configuredProvider === "direct") {
    return configuredProvider;
  }

  throw new Error(
    `Unsupported OBJECT_STORAGE_PROVIDER "${env.OBJECT_STORAGE_PROVIDER}". ` +
      'Expected "replit" or "direct".',
  );
}

export function createConfiguredObjectStorageProvider({
  env = process.env,
  createReplitProvider = getDefaultReplitObjectStorageProvider,
  createDirectProvider = () => DirectObjectStorageProvider.fromEnv(env),
}: CreateConfiguredObjectStorageProviderOptions = {}): ObjectStorageProvider {
  const providerName = getConfiguredObjectStorageProviderName(env);

  if (providerName === "direct") {
    validateDirectObjectStorageEnv(env);
    return createDirectProvider();
  }

  return createReplitProvider();
}

export function getDefaultObjectStorageProvider(): ObjectStorageProvider {
  const providerName = getConfiguredObjectStorageProviderName();

  if (cachedProvider && cachedProviderName === providerName) {
    return cachedProvider;
  }

  cachedProvider = createConfiguredObjectStorageProvider();
  cachedProviderName = providerName;
  return cachedProvider;
}
