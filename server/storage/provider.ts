import type { File } from "@google-cloud/storage";

export type SignedObjectUrlMethod = "GET" | "PUT" | "DELETE" | "HEAD";

export interface SignObjectUrlOptions {
  bucketName: string;
  objectName: string;
  method: SignedObjectUrlMethod;
  ttlSec: number;
}

export interface ObjectStorageProvider {
  getFile(bucketName: string, objectName: string): File;
  signObjectURL(options: SignObjectUrlOptions): Promise<string>;
}
