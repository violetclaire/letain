# Direct Object Storage Provider Prep

This document defines the safe migration target for replacing the Replit object-storage sidecar. It does not switch the active provider.

## Current State

- `ObjectStorageService` still defaults to `getDefaultObjectStorageProvider()` from `server/storage/replitProvider.ts`.
- `ReplitObjectStorageProvider` still depends on the Replit sidecar at `http://127.0.0.1:1106`.
- `server/storage/directProvider.ts` is a non-default skeleton that implements the existing `ObjectStorageProvider` contract.
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

Before switching the default provider, production needs:

- `PRIVATE_OBJECT_DIR`, using the existing `/bucket/path` format expected by `ObjectStorageService`
- `PUBLIC_OBJECT_SEARCH_PATHS`, comma-separated and using the existing `/bucket/path` format
- Google Cloud authentication available to the runtime through one of:
  - workload identity / service account attachment provided by the host
  - `GOOGLE_APPLICATION_CREDENTIALS` pointing to a local credential file outside Git
  - another host-managed ADC mechanism
- permission to read objects from public search buckets
- permission to create/update/read/delete private objects as required by current routes
- permission to create signed URLs, including service-account signing permissions when the runtime auth method requires them

Do not commit credential files, service-account JSON, private keys, certificates, or provisioning material.

## Required Safety Checks Before Provider Switch

- PR #44 object storage characterization tests stay green.
- Direct provider contract tests stay green.
- `/api/objects/upload` still returns the same `{ uploadURL }` shape.
- `/objects/:objectPath(*)` keeps the same public/private ACL behavior.
- Profile image normalization keeps returning `/objects/...` paths.
- Contract uploads, client photos, schedule assets, and agent assets are manually checked with test objects.
- No object buckets are made broadly public as a replacement for ACL metadata.

## What Not To Change In The Provider Switch PR

- Auth/session behavior.
- Object ACL policy format.
- Route names or response shapes.
- Profile image, contract asset, client photo, schedule asset, or agent asset model fields.
- Calendar, email, SMS, payments, contracts, CDI/trust scoring, or iOS/native code.
