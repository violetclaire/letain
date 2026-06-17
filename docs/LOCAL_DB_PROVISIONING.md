# Local DB Provisioning Plan

This document describes how to provision a disposable or staging database for local Briarwood preview. It is a plan only. Do not run these commands against production.

## Current Schema Inventory

- `drizzle.config.ts` is the Drizzle tooling entrypoint. It reads `shared/schema.ts`, writes migrations to `./migrations`, and currently requires `DATABASE_URL`.
- App runtime uses `server/db.ts`, which prefers `NEON_DATABASE_URL` and falls back to `DATABASE_URL`.
- Session storage in `server/auth/session.ts` also prefers `NEON_DATABASE_URL` and falls back to `DATABASE_URL`.
- `migrations/0000_massive_dragon_man.sql` contains the legacy/base schema, including base tables such as `users`, `artist_profiles`, `inquiries`, `contracts`, `thread_referrals`, `trusted_circle`, `schedule_appointments`, and `sessions`.
- `migrations/0001_handy_celestials.sql` adds inquiry sentiment columns.
- `migrations/0002_chemical_quicksilver.sql` adds direct chat tables and later contract/inquiry/thread-token changes.
- Startup `ensureDatabaseSchema()` in `server/index.ts` is additive and incomplete. It creates or updates newer Briarwood tables, but it does not create all legacy/base tables.
- `server/seed.ts` is stale Beauvette sample data. Do not use it for Briarwood local preview.

## Safety Gates

Before applying schema to any database:

1. Confirm the database is disposable or staging only.
2. Confirm `.env.local` points to that disposable/staging database.
3. Confirm `.env.local` uses separate `KEY=value` lines.
4. Confirm `NEON_DATABASE_URL` parses without printing the value.
5. Confirm `SESSION_SECRET` is present without printing the value.
6. Confirm `PUBLIC_BASE_URL=http://localhost:5173` for local preview.
7. Confirm no production send/payment credentials are present in the process:
   - `RESEND_API_KEY`
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
   - `TWILIO_MESSAGING_SERVICE_SID`
   - `SQUARE_ACCESS_TOKEN`
   - `SQUARE_APPLICATION_ID`
   - `SQUARE_APPLICATION_SECRET`
8. Confirm the target database is empty or contains only known local-preview test objects.
9. Do not use `npm run db:push` for this step. It can target the wrong environment and may propose broad schema changes.
10. Do not run `server/seed.ts`.

## Provisioning Sequence

Run this only after the safety gates pass and only against a disposable/staging database.

```powershell
# Load .env.local into this PowerShell process without printing values.
Get-Content .env.local | ForEach-Object {
  if ($_ -match '^[A-Za-z_][A-Za-z0-9_]*=') {
    $key, $value = $_ -split '=', 2
    [Environment]::SetEnvironmentVariable($key, $value, 'Process')
  }
}

# Drizzle tooling currently requires DATABASE_URL.
# Keep this process-only so app runtime behavior is not changed.
$env:DATABASE_URL = $env:NEON_DATABASE_URL

# Apply committed migrations to the disposable/staging DB.
npx.cmd drizzle-kit migrate
```

After committed migrations complete:

```powershell
npm run dev:server
```

Then check only the health endpoint:

```powershell
Invoke-WebRequest -Uri http://localhost:5000/api/health -UseBasicParsing
```

The first backend start after migration may still run additive startup setup from `ensureDatabaseSchema()`. That is expected for local preview. Do not open product flows until health is green and the database inventory looks sane.

## Rollback / Cleanup

Because this process is for disposable/staging databases only, the safest rollback is to delete the Neon branch/database and create a fresh one.

If a reusable staging database was used:

1. Stop the local backend.
2. Export any data you need to keep.
3. Drop and recreate the staging database or Neon branch from the provider console.
4. Re-run the provisioning sequence from a clean database.

Do not attempt manual table-by-table cleanup unless a software engineer has reviewed the target database and the SQL. Do not run destructive SQL against production.

## Out of Scope

- No production database provisioning.
- No schema changes in this repository.
- No seed/demo data.
- No `server/seed.ts`.
- No email, SMS, payments, contracts, Square, or public-token testing.
- No auth migration or provider replacement.
- No product-flow testing.
