import { Storage } from "@google-cloud/storage";
import type { File } from "@google-cloud/storage";
import type {
  ObjectStorageProvider,
  SignObjectUrlOptions,
  SignedObjectUrlMethod,
} from "./provider";

type SignedUrlAction = "read" | "write" | "delete";

interface StorageClientLike {
  bucket(name: string): {
    file(name: string): File;
  };
}

interface DirectObjectStorageProviderOptions {
  storage?: StorageClientLike;
  now?: () => number;
}

export interface DirectObjectStorageEnvConfig {
  projectId?: string;
  keyFilename?: string;
}

function signedUrlActionForMethod(method: SignedObjectUrlMethod): SignedUrlAction {
  switch (method) {
    case "PUT":
      return "write";
    case "DELETE":
      return "delete";
    case "GET":
    case "HEAD":
      return "read";
  }
}

export function validateDirectObjectStorageEnv(
  env: NodeJS.ProcessEnv = process.env,
): DirectObjectStorageEnvConfig {
  const projectId =
    env.DIRECT_OBJECT_STORAGE_PROJECT_ID ||
    env.GOOGLE_CLOUD_PROJECT ||
    env.GCLOUD_PROJECT ||
    env.GCP_PROJECT;
  const keyFilename =
    env.DIRECT_OBJECT_STORAGE_KEY_FILE ||
    env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!projectId && !keyFilename) {
    throw new Error(
      "Direct object storage provider requires direct Google Cloud config. " +
        "Set GOOGLE_APPLICATION_CREDENTIALS or DIRECT_OBJECT_STORAGE_PROJECT_ID/GOOGLE_CLOUD_PROJECT.",
    );
  }

  return {
    projectId,
    keyFilename,
  };
}

function createStorageFromEnv(env: NodeJS.ProcessEnv): Storage {
  const { projectId, keyFilename } = validateDirectObjectStorageEnv(env);
  const storageOptions: {
    projectId?: string;
    keyFilename?: string;
  } = {};

  if (projectId) {
    storageOptions.projectId = projectId;
  }
  if (keyFilename) {
    storageOptions.keyFilename = keyFilename;
  }

  return new Storage(storageOptions);
}

export class DirectObjectStorageProvider implements ObjectStorageProvider {
  private readonly storage: StorageClientLike;
  private readonly now: () => number;

  constructor({
    storage,
    now = () => Date.now(),
  }: DirectObjectStorageProviderOptions = {}) {
    if (!storage) {
      throw new Error(
        "DirectObjectStorageProvider requires an explicit storage client. " +
          "Use DirectObjectStorageProvider.fromEnv() after setting direct storage env config.",
      );
    }

    this.storage = storage;
    this.now = now;
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env): DirectObjectStorageProvider {
    return new DirectObjectStorageProvider({
      storage: createStorageFromEnv(env),
    });
  }

  getFile(bucketName: string, objectName: string): File {
    return this.storage.bucket(bucketName).file(objectName);
  }

  async signObjectURL({
    bucketName,
    objectName,
    method,
    ttlSec,
  }: SignObjectUrlOptions): Promise<string> {
    const file = this.getFile(bucketName, objectName);
    const [signedURL] = await file.getSignedUrl({
      version: "v4",
      action: signedUrlActionForMethod(method),
      expires: new Date(this.now() + ttlSec * 1000),
    });

    return signedURL;
  }
}
