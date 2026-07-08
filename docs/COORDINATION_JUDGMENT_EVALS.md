# Coordination Judgment Evals

This document explains Briarwood's completed coordination judgment eval loop.
It is documentation only. It does not add runtime behavior, UI, schema,
routes, auth, sends, contracts, payments, public links, AI execution,
route/preflight behavior, provider acceptance, or client-create behavior.

The short version:

```text
redacted trace fixture
-> trace capture validation
-> draft eval case
-> deterministic judgment harness
-> trace-derived eval suite report
-> coverage taxonomy and gap report
-> checkpoint summary
```

The loop checks whether Briarwood preserves human judgment before real-world
contracted work moves forward.

## What The Eval Loop Is

The coordination judgment eval loop is a source/test/eval infrastructure layer
for checking operator-facing coordination states. It asks whether a candidate
state preserves the right boundaries between evidence, review, approval, and
external action.

The core question is:

```text
Did the system preserve the human judgment needed before moving real-world coordination forward?
```

This matters because real-world service work often runs through private,
messy, high-context coordination: texts, emails, referrals, handoffs, recovery
moments, pricing context, schedule context, and relationship trust. In that
setting, shallow evidence can look actionable when it is not. The eval loop is
designed to catch that drift.

## Why Trace-Derived Evals Matter

Briarwood is evaluating contracted work, not abstract content classification.
The important failures are coordination failures:

- evidence quietly becoming approval
- a review state becoming permission to send
- private context leaking into a client-facing surface
- stale alignment becoming current authority
- conflicting signals getting collapsed into a single answer
- recovery or escalation being downgraded into ordinary forward motion
- invoices, contracts, payments, routes, provider acceptance, public links,
  client creation, or AI execution appearing without human approval

Trace-derived evals keep the test cases close to the shape of real coordination
while staying redacted, synthetic, and safe. Each trace fixture captures the
operator judgment, blocked reasons, private-only signals, forbidden actions,
safe next step, and failure-mode expectations that must survive conversion into
an eval case.

## Pipeline

The current pipeline is:

1. Redacted/synthetic trace fixture

   A trace fixture describes a safe, synthetic coordination scenario. It names
   the source trace id, eval case candidate id, operator judgment, permission
   outcome, blocked reasons, private-only signals, forbidden actions, failure
   modes, and safe next step.

2. Trace capture validation

   `server/coordination-judgment-trace-capture.ts` validates that the trace has
   the required judgment fields before it can become an eval candidate.

3. Conversion into a draft eval case

   The same trace capture module converts the validated trace into a draft
   coordination judgment eval case. The conversion preserves operator judgment,
   blocked reasons, private-only signals, forbidden actions, human approval
   requirements, and contracted-work safety language.

4. Deterministic eval harness

   `server/coordination-judgment-eval-harness.ts` checks the draft eval case
   against the stable failure-mode taxonomy. It does not act. It only reports
   whether the candidate preserved the expected judgment boundaries.

5. Trace-derived eval suite report

   `server/coordination-judgment-trace-eval-suite.ts` discovers the trace
   fixtures, validates them, converts them into draft eval cases, runs the
   harness, and reports fixture counts, pass/fail counts, source trace ids,
   candidate ids, blocked reasons, private-only signals, forbidden actions,
   safe next steps, and failure-mode coverage.

6. Coverage taxonomy and gap report

   `server/coordination-judgment-eval-coverage.ts` consumes the suite report
   and maps it into covered and missing taxonomy items: judgment states,
   permission boundaries, and coordination signals.

7. Checkpoint summary

   `server/coordination-judgment-eval-checkpoint.ts` consumes the suite report
   and coverage report to summarize the completed checkpoint. It states what is
   covered, what remains visible, and what the checkpoint explicitly does not
   authorize.

## Covered Judgment States

The planned judgment-state taxonomy is covered by six trace-derived fixtures:

- `ready_for_operator_review`
- `blocked_not_ready_for_external_action`
- `authority_attempt_blocked`
- `conflict_requires_human_resolution`
- `escalation_required`
- `recovery_needed`

The checkpoint reports:

- `fixtureCount = 6`
- `passedCount = 6`
- `failedCount = 0`
- all six planned judgment states covered
- `missingJudgmentStates = []`

## Permission Boundaries Preserved

The eval loop preserves these boundaries:

- evidence does not mean approval
- review does not mean send or action authority
- private context remains private
- blocked reasons remain visible
- forbidden actions remain forbidden
- permissioned next steps remain operator-facing
- public/client visibility is forbidden too early
- human approval remains required where the state requires it
- invoices, contracts, payments, public links, provider acceptance,
  client-create behavior, and AI action cannot appear without authority

In one line:

```text
evidence != approval
review != send authority
route context != provider acceptance
schedule draft != public/client schedule
permissioned next step != external action
```

## What The Checkpoint Proves

The checkpoint proves that the planned coordination judgment taxonomy is
represented by trace-derived eval fixtures and that those converted draft eval
cases pass the deterministic coordination judgment harness.

It also proves that the reporting layer can summarize:

- suite id and version
- coverage taxonomy version
- fixture count
- source trace ids
- eval case candidate ids
- pass/fail counts
- covered and missing judgment states
- covered and missing permission boundaries
- covered and missing coordination signals
- remaining non-judgment gaps
- prohibited runtime behavior
- deterministic/static generated-at policy

The checkpoint safe conclusion is intentionally narrow:

```text
The planned judgment-state taxonomy is covered by trace-derived eval fixtures, but this does not grant runtime authority or product behavior.
```

## What The Checkpoint Does Not Prove

The checkpoint does not prove that Briarwood should take action in production.
It does not approve a provider, send a message, create an invoice, create a
contract, collect payment, publish a client link, run preflight, create a route,
accept a provider, create a client, or execute AI.

It also does not hide remaining taxonomy gaps. It is a reporting checkpoint,
not a runtime decision engine.

The checkpoint's prohibited runtime behavior list includes:

- no sends
- no SMS/email
- no invoices
- no contracts
- no payments
- no public/client links
- no AI execution
- no route/preflight/provider acceptance
- no client-create behavior
- no self-improving harness behavior
- no automated harness mutation
- no `/assess` calls

## Remaining Non-Judgment Gap

The planned judgment-state taxonomy is complete, but the coverage report still
keeps non-judgment coordination signal gaps visible. The current remaining
coordination signal gap is:

- `provider_acceptance_state`

That gap is not a missing judgment state. It remains visible so future work can
decide whether and how to characterize provider acceptance state without
silently turning route or schedule context into acceptance authority.

## Source Files

The completed eval loop is implemented across these source/test/eval files:

- `server/coordination-judgment-eval-cases.ts`
- `server/coordination-judgment-eval-harness.ts`
- `server/coordination-judgment-eval.characterization.test.ts`
- `server/coordination-judgment-trace-capture.ts`
- `server/coordination-judgment-trace-capture.characterization.test.ts`
- `server/coordination-judgment-trace-fixtures.ts`
- `server/coordination-judgment-trace-fixtures.characterization.test.ts`
- `server/coordination-judgment-trace-eval-suite.ts`
- `server/coordination-judgment-trace-eval-suite.characterization.test.ts`
- `server/coordination-judgment-eval-coverage.ts`
- `server/coordination-judgment-eval-coverage.characterization.test.ts`
- `server/coordination-judgment-eval-checkpoint.ts`
- `server/coordination-judgment-eval-checkpoint.characterization.test.ts`

## How To Run The Eval Tests

Run the checkpoint test:

```powershell
npx.cmd tsx --test server\coordination-judgment-eval-checkpoint.characterization.test.ts
```

Run the existing eval, coverage, fixture, trace capture, and harness stack:

```powershell
npx.cmd tsx --test server\coordination-judgment-eval-coverage.characterization.test.ts server\coordination-judgment-trace-eval-suite.characterization.test.ts server\coordination-judgment-trace-fixtures.characterization.test.ts server\coordination-judgment-trace-capture.characterization.test.ts server\coordination-judgment-eval.characterization.test.ts
```

Run the related reduction, permission, and quarantine guardrails:

```powershell
npx.cmd tsx --test server\coordination-reduction-rules.characterization.test.ts server\permissioned-next-step-query.characterization.test.ts server\permissioned-next-step-query-operator-surface.characterization.test.ts server\inquiry-workspace-contract-payment-quarantine.characterization.test.ts
```

Run the docs-safe repo checks:

```powershell
git diff --check
npm.cmd run build
```

## Why This Remains Source/Test/Eval Infrastructure Only

The eval loop is intentionally separate from product authority. It contains no
UI, schema changes, migrations, backend endpoints, production auth changes,
sends, invoices, contracts, payments, public/client links, AI execution,
route/preflight/provider acceptance, client-create behavior, self-improving
harness behavior, automated harness mutation, or `/assess` calls.

Its job is to make the safety and judgment loop legible and repeatable:

```text
trace evidence
-> operator judgment
-> draft eval case
-> deterministic check
-> coverage report
-> checkpoint summary
```

The eval loop helps maintainers, technical reviewers, grant/eval reviewers, and
investors understand why Briarwood's coordination layer treats trust as a
permissioned real-world judgment problem instead of a simple automation problem.
