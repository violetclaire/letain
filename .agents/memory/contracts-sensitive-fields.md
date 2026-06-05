---
name: Contract endpoints must sanitize output and guard status
description: Why new contract-facing APIs need a DTO and a restricted status whitelist
---

The `contracts` table mixes display metadata with auth-bearing and flow-control
fields: `signingToken`, `clientSignature`, `artistSignature`, `openSignDocumentId`,
`openSignSigningUrl`, `openSignCertificateUrl`, `contractHtml`, plus payment handles.

**Rule:** Any operator/agent-facing contract endpoint must return an explicit
display DTO (allow-list of safe fields), never the raw row. Returning the row leaks
signing tokens/signatures.

**Rule:** Metadata-edit endpoints must not let callers set flow statuses
(`sent`/`signed`/`completed`) - those belong to the real send/signing flows. The
Contract Vault edit endpoint only accepts `draft`/`cancelled`.

**Why:** The existing `GET/PATCH /api/contracts/:id` are unscoped (no artistId
ownership check) and PATCH writes raw `req.body` (mass-assignment). They are relied
on by other flows, so do NOT reuse or "fix" them for new operator features - add a
new scoped endpoint (e.g. `/api/vault/contracts/:id`) with ownership check
(`contract.artistId === authed userId`, admin via `user.role === "admin"`) + DTO +
field whitelist.

**How to apply:** When building any new contract read/write surface, copy the
`toVaultContractDto` + whitelist pattern in server/routes.ts.
