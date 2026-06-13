import { Storage } from "@google-cloud/storage";
import type { ObjectStorageProvider, SignObjectUrlOptions } from "./provider";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ReplitObjectStorageProvider implements ObjectStorageProvider {
  getFile(bucketName: string, objectName: string) {
    return objectStorageClient.bucket(bucketName).file(objectName);
  }

  async signObjectURL({
    bucketName,
    objectName,
    method,
    ttlSec,
  }: SignObjectUrlOptions): Promise<string> {
    const request = {
      bucket_name: bucketName,
      object_name: objectName,
      method,
      expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
    };
    const response = await fetch(
      `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );
    if (!response.ok) {
      throw new Error(
        `Failed to sign object URL, errorcode: ${response.status}, ` +
          `make sure you're running on Replit`
      );
    }

    const { signed_url: signedURL } = await response.json();
    return signedURL;
  }
}

const defaultObjectStorageProvider = new ReplitObjectStorageProvider();

export function getDefaultReplitObjectStorageProvider(): ObjectStorageProvider {
  return defaultObjectStorageProvider;
}

export function getDefaultObjectStorageProvider(): ObjectStorageProvider {
  return getDefaultReplitObjectStorageProvider();
}
