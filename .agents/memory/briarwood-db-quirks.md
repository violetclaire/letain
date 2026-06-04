---
name: Briarwood DB quirks
description: Non-obvious facts about the users schema and DB driver capabilities in the Briarwood (dateinquiry.com) codebase
---

# users table has no businessName / displayName
The `users` pgTable (shared/schema.ts) only has `username`, `email`, `firstName`,
`lastName`, `role`, `phone`. `businessName` lives on `artistIntakes` and
`artistProfiles`, NOT on `users`. Selecting `users.businessName` typecks/fails and
breaks the Drizzle query at runtime. For a display name off a user row, use
`[firstName,lastName].join(" ") || username || email`.

**Why:** several older queries referenced `users.businessName` and were latent bugs
(only never triggered because the relevant code path had zero rows).

# DB driver supports transactions
server/db.ts uses `@neondatabase/serverless` Pool over WebSocket with
`drizzle-orm/neon-serverless`. This DOES support `db.transaction(...)` and row
locks via `.for("update")` — use them for atomic read-check-write (e.g. idempotent
event creation under concurrency). (The neon-http driver would NOT support tx, but
this project does not use it.)

# Codebase-wide tsc noise
The repo has ~1000 pre-existing tsc errors (tsx runs without typechecking). A common
benign pattern: `storage.getUser(getAuthUserId(req))` flags `string | null` not
assignable to `string`. Match the existing pattern; do not "fix" it in isolation.

## executeSql tool vs the app's database
The `executeSql` code-execution tool connects to `DATABASE_URL` (Replit's built-in
Postgres), but the running app connects to `NEON_DATABASE_URL` (see server/db.ts —
NEON is preferred, DATABASE_URL is only a fallback). They are DIFFERENT databases
with different rows and different schema. Do NOT use executeSql to verify app data
or migrations — it will show a stale/empty picture (e.g. new tables appear missing).
To verify against the real app DB, run a one-off `npx tsx` script that imports
`server/db` so it uses the same NEON connection.
