# Replit Runtime Dependency Inventory

This is the source of truth for remaining Replit dependencies after the provider abstraction work. It records current behavior only. Do not use this document to justify removing a dependency without a separate, scoped PR and tests.

## Classification Key

- `runtime critical`: required by a current runtime path and likely to break startup, auth, or a live feature if removed without replacement.
- `runtime default`: selected by default at runtime, even if a direct replacement path exists behind explicit configuration.
- `fallback only`: used only when primary direct configuration is unavailable or when a legacy fallback branch is reached.
- `test only`: exists only in characterization tests.
- `docs/reference only`: historical notes, comments, or static metadata references with no active runtime dependency.

## Runtime Dependencies

| Area | File | Dependency type | Classification | Env vars / service | Removal difficulty | Replacement path |
| --- | --- | --- | --- | --- | --- | --- |
| auth | `server/replitAuth.ts` | Replit OIDC provider, Passport strategy names, token refresh | runtime critical | `REPL_ID`, `ISSUER_URL` with default `https://replit.com/oidc` | high | Add a new auth provider behind tests, preserve sessions/cookies, then move login/callback/logout away from Replit OIDC. |
| auth | `server/auth/current.ts` | Current authenticated-route guard facade re-exports the Replit-backed guard | runtime critical | indirectly `REPL_ID`, `ISSUER_URL` through `server/replitAuth.ts` | medium | Point this facade at the future auth provider guard after auth migration tests cover the boundary. |
| auth | `server/routes.ts` | Imports `setupAuth` from `server/replitAuth.ts` and `isAuthenticated` from `server/auth/current.ts` | runtime critical | indirectly `REPL_ID`, `ISSUER_URL` | medium | Keep `setupAuth` until auth provider migration. Keep route guards behind the neutral current-auth facade. |
| calendar | `server/calendar/defaultProvider.ts` | Calendar provider selector defaults to Replit | runtime default | `CALENDAR_PROVIDER`, default `replit` | medium | Keep default `replit` until direct Google OAuth token storage exists and passes provider/availability tests. |
| calendar | `server/calendar/replitProvider.ts` | Google Calendar access through Replit connector token exchange | runtime default | `REPLIT_CONNECTORS_HOSTNAME`, `REPL_IDENTITY`, `WEB_REPL_RENEWAL` | medium-high | Use direct Google Calendar OAuth credentials, encrypted refresh-token storage, and the direct provider contract. |
| storage | `server/storage/defaultProvider.ts` | Object storage provider selector defaults to Replit | runtime default | `OBJECT_STORAGE_PROVIDER`, default `replit` | medium | Roll out `OBJECT_STORAGE_PROVIDER=direct` only after direct GCS config and object ACL checks pass. |
| storage | `server/storage/replitProvider.ts` | Replit object-storage sidecar and GCS credential sidecar | runtime default | Replit sidecar at `http://127.0.0.1:1106` | medium | Use `DirectObjectStorageProvider` with explicit Google Cloud config and preserve URL/ACL behavior. |
| storage | `server/objectStorage.ts` | Compatibility export of `objectStorageClient` from Replit provider | runtime default | Replit sidecar indirectly | medium | Remove compatibility export after all object access routes use the provider abstraction only. |
| email fallback | `server/email/credentials.ts` | Shared Resend credential resolver and client factory with non-production Replit connector fallback | fallback only | `REPLIT_CONNECTORS_HOSTNAME`, `REPL_IDENTITY`, `WEB_REPL_RENEWAL`; direct path is `RESEND_API_KEY` | low | Keep direct `RESEND_API_KEY` as production path, then remove fallback after local/dev envs stop needing it. |
| payment redirect | `server/aiChat.ts` | AI Square payment redirect URL fallback | fallback only | `REPLIT_DEPLOYMENT_URL` | medium | Replace with public URL helper only after Square/domain payment redirect tests are updated and reviewed. |

## Reference-Only Replit Mentions

These are not active Replit runtime dependencies, but they are intentionally listed so searches do not cause confusion.

| File or group | Dependency type | Classification | Notes |
| --- | --- | --- | --- |
| `server/cdiAgent.ts` | comment | docs/reference only | Comment about old Replit AI integrations. |
| `server/db.ts` | comment | docs/reference only | Notes why `NEON_DATABASE_URL` wins over Replit Postgres. |
| `server/auth/session.ts` | comment | docs/reference only | Same `NEON_DATABASE_URL` note. |
| `server/index.ts` | comment | docs/reference only | Trust-proxy comment still says Replit deployment. |
| `server/storage.ts` | comment | docs/reference only | User-section comments mention Replit Auth. |
| `client/index.html` | static metadata | docs/reference only | Replit Open Graph/Twitter metadata remains but is not an application runtime dependency. |
| `client/src/components/ui/button.tsx` | comment | docs/reference only | UI comments from scaffold/customization history. |
| `client/src/components/ui/badge.tsx` | comment | docs/reference only | UI comments from scaffold/customization history. |
| `docs/*.md` | historical/docs | docs/reference only | Architecture, handoff, provider plans, and migration docs intentionally mention Replit. |

## Test-Only Replit Mentions

Characterization tests intentionally include Replit strings to lock current behavior. These are not runtime dependencies.

- `server/auth-session.characterization.test.ts`
- `server/auth-login-oidc.characterization.test.ts`
- `server/calendar-availability.characterization.test.ts`
- `server/calendar-provider.characterization.test.ts`
- `server/calendar-direct-provider.contract.test.ts`
- `server/email-credentials.characterization.test.ts`
- `server/object-storage.characterization.test.ts`
- `server/storage-direct-deployment.characterization.test.ts`
- `server/storage/directProvider.characterization.test.ts`
- owner-scope tests that stub current OIDC/session behavior

## Removal Order

1. Keep inventory current with every provider/auth/domain PR.
2. Remove or migrate fallback-only dependencies first.
3. Switch storage only after direct provider rollout validation.
4. Switch calendar only after token storage, OAuth callbacks, and availability checks are tested.
5. Replace auth last, after login/logout/callback/session characterization covers the migration.

## Current Email Boundary

- `server/emailService.ts` and `server/aiChat.ts` now use the shared Resend client factory in `server/email/credentials.ts`.
- Production email credentials still come from direct `RESEND_API_KEY`.
- The Replit Resend connector remains a non-production legacy fallback only.
- Contract-related direct Resend construction in `server/routes.ts` remains intentionally excluded from the shared factory until contract/email paths are reviewed separately.

## Do Not Remove Yet

- `server/replitAuth.ts` login/logout/callback behavior.
- Replit calendar connector variables while `CALENDAR_PROVIDER` defaults to `replit`.
- Replit object-storage sidecar while `OBJECT_STORAGE_PROVIDER` defaults to `replit`.
- The AI/Square `REPLIT_DEPLOYMENT_URL` fallback until Square/domain redirect behavior is migrated under tests.
