# Approval stays with the work reviewed

A permission decision now retains a server-generated snapshot of the inquiry, linked booking, and associated contracts. Its SHA-256 digest identifies that snapshot; it does not grant authority or prove payment.

Before recording a human `proceed`, the API compares the current records with that snapshot. Missing historical snapshots or changed terms return HTTP 409 and require a newly reviewed permission decision. Storage repeats the comparison in the transaction that inserts the decision, locking the existing inquiry, booking, contract, and permission rows. Permission creation takes the inquiry lock too, serializing it with this decision path.

## Revised work

1. Preserve the original permission and its snapshot.
2. Record the changed work and use the existing linked permission lifecycle to document renewed review (`relatedPermissionDecisionId`, correction/supersession as appropriate). A pending decision can use `wait` or `clarification_required` and retain explicit blockers.
3. Review scope, resources, affected participants, schedule and funding. If additional payment is required, record that as a required condition; do not treat the original deposit as evidence that the increase is funded.
4. A subsequent human decision must refer to the newly reviewed permission and confirm its conditions. Old records stay readable. There is no automatic contract rewrite, charge, client message, artist commitment or task execution.

The regression fixture uses an illustrative original total of $1,600 with an $800 deposit, then expands to $5,500. The original total is synthetic, not a verified client record. Increasing work does not change the recorded deposit and cannot reuse the original snapshot. Tests also cover dates, service details, funding terms, missing legacy evidence, expiry and withdrawal.

## Deployment and limits

The required, idempotent startup migration adds nullable `agreement_snapshot` to `scoped_permission_decisions`. Historical records are deliberately not backfilled: a newly recorded review is needed before they can support another `proceed`. Take the normal database backup and deploy through the existing application process. This branch does not deploy or modify production.

This protects the private CDI human-decision record, not an autonomous execution endpoint. Existing execution, contract and payment routes do not gain enforcement merely because the record is protected. A future executor must bind the proposed action to the reviewed terms and recheck at its own commit boundary.

Only fields listed in `server/agreementSnapshot.ts` are bound. Unrecorded changes, external document contents behind an unchanged URL, external payments, separate team-assignment records and private conversations cannot be detected by this snapshot. Funding conditions are human attestations, not independently verified payment evidence. Unknown information is not automatically promoted to approval. This does not interpret cancellation clauses or impose a deposit percentage.

Row locking covers existing records through insertion of the human-decision record. It is not evidence of universal race freedom, protection against all concurrent inserts, or protection of a later external effect. Database test doubles exercise decision rejection and persistence calls; live database concurrency and migration testing remain deployment checks.

## Checks

```sh
node --import tsx --test server/agreement-snapshot.test.ts server/agreement-snapshot-storage.test.ts server/human-action-decisions.owner-scope.test.ts server/scoped-permission-decisions.owner-scope.test.ts
npm run check
npm run build
```

Validation on this branch: all 48 targeted checks pass. Full TypeScript checking exits 2 on both the original base 1cabdfb and the initial implementation: 194 unique diagnostics after normalizing source line numbers, with no additions or removals. The production build cannot load the Vite configuration because local Windows directory traversal is denied; no build success is claimed. Database migration and production execution have not been performed.
