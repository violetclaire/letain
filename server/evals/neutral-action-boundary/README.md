# Briarwood Neutral Action Boundary Eval

This directory contains a synthetic, offline-only defensive evaluation of a
neutral authorization boundary between capability and consequential action.

## Limits

- This is not a reproduction of the actual July 2026 incident that inspired
  the sanitized action sequence.
- It contains no working exploit code.
- It does not execute shell commands or call networks, cloud systems, source
  control, model providers, payment systems, email systems, or production
  services.
- It is not connected to Briarwood production routes, storage, schema, UI, or
  deployment configuration.
- The results do not prove that Briarwood would have prevented a real incident.
- CDI is behavioral evidence, not permission.
- The requesting actor is separate from the authority that decides and issues
  a permit.
- A permitting result still requires a separate HumanActionDecision before any
  real-world action.

## Reused Briarwood architecture

The evaluator preserves the existing conceptual chain:

```text
behavioral/CDI evidence
-> HumanAttestation or explicit human approval
-> CoordinationJudgment-style deterministic assessment
-> ScopedPermissionDecision-compatible outcome
-> separate HumanActionDecision requirement
-> no execution
```

The test-only `AuthorityDecision` outcomes map to the existing
`ScopedPermissionDecision` vocabulary. Decision receipts are append-only,
chronologically linked records with deterministic local integrity values.

## Components

- `fixtures.ts`: 20 sanitized incident-shaped actions and 15 matched legitimate
  controls.
- `evaluator.ts`: deterministic, explainable authority decision order.
- `scoped-permit.ts`: exact-scope, expiring, revocable, single-use permit
  issuance and validation.
- `fake-protected-tool.ts`: harmless local simulation that rejects missing,
  broadened, expired, revoked, reused, or mismatched permits.
- `integrity.ts`: deterministic receipt and permit integrity helpers for this
  test harness only.
- `report.ts`: structured metrics and a human-readable Markdown report
  generator.
- `neutral-action-boundary-eval.test.ts`: fixture, CDI, human authority, permit,
  replay, and isolation characterization tests.

## Deterministic decision order

The evaluator checks:

1. Actor identity.
2. Independent authority identity.
3. Assigned task.
4. Scope lifetime.
5. Exact tool and action.
6. Exact target.
7. Environment.
8. Consequence ceiling.
9. Evidence independence and freshness.
10. Material condition changes.
11. Exact human approval.
12. Velocity.
13. Blast radius.
14. Revocation.
15. Presented permit validity.

Unknown or mismatched inputs fail closed. A high CDI value cannot widen any
scope or override a prohibition.

## Run

From the repository root:

```powershell
npx.cmd tsx --test server\evals\neutral-action-boundary\neutral-action-boundary-eval.test.ts
```

Render the current local Markdown report:

```powershell
npx.cmd tsx -e "import { renderNeutralActionBoundaryReport } from './server/evals/neutral-action-boundary/report.ts'; process.stdout.write(renderNeutralActionBoundaryReport());"
```
