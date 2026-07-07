# Coordination Judgment Evals

This note explains the current Briarwood demo and the first versioned
coordination judgment eval harness. It is documentation only. It does not add
runtime behavior, UI, schema, routes, auth, sends, contracts, payments, public
links, AI execution, route/preflight behavior, provider acceptance, or
client-create behavior.

## What The Viewer Sees

The local read-only demo is an operator coordination workspace.

The best demo path is:

```text
/admin/briarwood-demo
-> Inquiry Workspace
-> Can I respond yet?
-> Permissioned next step
-> Availability readiness
-> Operator review checklist
-> Private review log
-> Inquiry Event Timeline
-> Route/recovery evidence
-> Private schedule handoff
```

The viewer sees that Briarwood does not just manage inquiries. It makes the
current coordination state visible before anyone moves real-world work forward.

The important product story is:

```text
inquiry evidence
-> reduced coordination state
-> permissioned next-step guidance
-> readiness / review / evidence / timeline
-> human decision
```

The operator surface stays private and read-only for this demo. It explains
what is known, what is missing, what needs review, and what must not happen yet.
It does not create sends, invoices, contracts, payments, public/client links,
AI actions, route acceptance, provider acceptance, or client-create paths.

## What The Eval Checks

The core eval question is:

```text
Did the system preserve the human judgment needed before moving real-world coordination forward?
```

The coordination judgment eval harness checks whether a candidate
operator-facing state preserves the right authority boundaries.

It checks that:

- evidence does not become approval
- review does not become send authority
- private context remains private
- blocked reasons remain visible
- forbidden actions remain forbidden
- contracted-work language is preserved where applicable
- permissioned next steps remain operator-facing
- public/client visibility is forbidden too early
- human approval remains required where the state requires it

This is the Shreya/evals story in one line:

```text
Briarwood now checks whether the system preserved human judgment before moving real-world coordination forward.
```

## How The Surface And Harness Relate

The operator surface is what the reviewer sees. The eval harness is the
repeatable check underneath it.

```text
real inquiry/evidence trace
-> reduced coordination state
-> permissioned next step
-> operator review
-> human decision
-> versioned eval case
-> deterministic checker
-> reusable judgment loop
```

The eval harness does not act. It does not send, route, approve, collect,
publish, generate, or contact anyone. It checks whether the state and surface
preserve the human judgment needed before any real-world coordination moves
forward.

The first versioned harness lives in:

- `server/coordination-judgment-eval-cases.ts`
- `server/coordination-judgment-eval-harness.ts`
- `server/coordination-judgment-eval.characterization.test.ts`

The harness has three parts:

- versioned synthetic eval cases
- a stable failure-mode taxonomy
- a deterministic checker

The failure modes include authority-boundary drift such as evidence becoming
approval, review becoming send authority, private fields leaking, public
visibility appearing too early, forbidden actions appearing, and
contracted-work language disappearing.

## What Changed In PRs

`#147` fixed demo access.

Fresh local preview sessions can open the seeded read-only demo directly:

```text
http://localhost:5173/admin/briarwood-demo
http://localhost:5173/inquiry-workspace
```

That access is local/demo-only and does not enable product actions.

`#148` added the first explicit coordination judgment eval harness.

Before `#148`, Briarwood had operator judgment embedded across rules, gates,
tests, and review surfaces. After `#148`, Briarwood also has a formal,
versioned eval harness that turns operator judgment into repeatable checks.

## Why This Matters

Real-world coordination fails when evidence quietly becomes authority.

Briarwood keeps those concepts separate:

```text
evidence != approval
review != send authority
route reachable != provider accepted
schedule draft != client-visible schedule
permissioned next step != external action
```

The operator sees the coordination state. The eval checks that the state still
requires human judgment where the work requires it. The human decides.

## How To Run The Checks

Run the focused coordination judgment eval:

```powershell
npx.cmd tsx --test server\coordination-judgment-eval.characterization.test.ts
```

Run the related characterization checks that protect the current loop:

```powershell
npx.cmd tsx --test server\coordination-reduction-rules.characterization.test.ts
npx.cmd tsx --test server\permissioned-next-step-query.characterization.test.ts
npx.cmd tsx --test server\permissioned-next-step-query-source-adapter.characterization.test.ts
npx.cmd tsx --test server\permissioned-next-step-query-operator-surface.characterization.test.ts
npx.cmd tsx --test server\inquiry-workspace-contract-payment-quarantine.characterization.test.ts
npx.cmd tsx --test server\unreachable-path-gating.characterization.test.ts
npx.cmd tsx --test server\operator-command-center-action-quarantine.characterization.test.ts
```

Run the docs-safe repo checks:

```powershell
git diff --check
npm.cmd run build
```
