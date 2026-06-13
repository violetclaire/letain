# Direct Object Storage Provider Prep

This document defines the safe migration target for replacing the Replit object-storage sidecar. Replit remains the default provider.

## Current State

- `ObjectStorageService` gets its default provider from `server/storage/defaultProvider.ts`.
- If `OBJECT_STORAGE_PROVIDER` is unset, empty, or `replit`, the default provider remains the Replit sidecar provider.
- If `OBJECT_STORAGE_PROVIDER=direct`, the direct provider is selected only after direct Google Cloud config is present.
- `ReplitObjectStorageProvider` still depends on the Replit sidecar at `http://127.0.0.1:1106`.
- `server/storage/directProvider.ts` implements the existing `ObjectStorageProvider` contract, but is opt-in only.
- Existing object URL shape, ACL metadata, upload/read routes, and profile/contract/client/agent asset behavior must stay unchanged until a separate provider switch PR.

## Direct Provider Contract

The direct provider must preserve the existing storage interface:

- `getFile(bucketName, objectName)` returns the Google Cloud Storage file object.
- `signObjectURL({ bucketName, objectName, method, ttlSec })` returns a signed URL string.
- `PUT` maps to a signed write URL.
- `GET` and `HEAD` map to signed read URLs.
- `DELETE` maps to a signed delete URL.
- Expiration must be derived from `ttlSec`.

The application-level object paths remain owned by `ObjectStorageService`, not the provider:

- public search roots still come from `PUBLIC_OBJECT_SEARCH_PATHS`
- private upload roots still come from `PRIVATE_OBJECT_DIR`
- private objects are still served through `/objects/...`
- ACL policy remains stored in custom object metadata

## Environment Checklist For Direct Storage

Before opting into direct storage, production needs:

- `OBJECT_STORAGE_PROVIDER=direct`
- `PRIVATE_OBJECT_DIR`, using the existing `/bucket/path` format expected by `ObjectStorageService`
- `PUBLIC_OBJECT_SEARCH_PATHS`, comma-separated and using the existing `/bucket/path` format
- Google Cloud authentication available to the runtime through one of:
  - `DIRECT_OBJECT_STORAGE_PROJECT_ID`, `GOOGLE_CLOUD_PROJECT`, `GCLOUD_PROJECT`, or `GCP_PROJECT` for host-managed ADC/workload identity
  - `DIRECT_OBJECT_STORAGE_KEY_FILE` or `GOOGLE_APPLICATION_CREDENTIALS` pointing to a local credential file outside Git
- permission to read objects from public search buckets
- permission to create/update/read/delete private objects as required by current routes
- permission to create signed URLs, including service-account signing permissions when the runtime auth method requires them

Do not commit credential files, service-account JSON, private keys, certificates, or provisioning material.

## Required Safety Checks Before Direct Provider Rollout

- PR #44 object storage characterization tests stay green.
- Direct provider contract tests stay green.
- `/api/objects/upload` still returns the same `{ uploadURL }` shape.
- `/objects/:objectPath(*)` keeps the same public/private ACL behavior.
- Profile image normalization keeps returning `/objects/...` paths.
- Contract uploads, client photos, schedule assets, and agent assets are manually checked with test objects.
- No object buckets are made broadly public as a replacement for ACL metadata.

Rollout should set `OBJECT_STORAGE_PROVIDER=direct` only in a controlled environment first. Removing the Replit provider entirely is a later migration step.

## What Not To Change In The Provider Switch PR

- Auth/session behavior.
- Object ACL policy format.
- Route names or response shapes.
- Profile image, contract asset, client photo, schedule asset, or agent asset model fields.
- Calendar, email, SMS, payments, contracts, CDI/trust scoring, or iOS/native code.
