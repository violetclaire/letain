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

export class DirectObjectStorageProvider implements ObjectStorageProvider {
  private readonly storage: StorageClientLike;
  private readonly now: () => number;

  constructor({
    storage = new Storage(),
    now = () => Date.now(),
  }: DirectObjectStorageProviderOptions = {}) {
    this.storage = storage;
    this.now = now;
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
