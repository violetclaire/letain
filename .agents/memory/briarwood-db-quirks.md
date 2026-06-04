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
