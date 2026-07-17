# Coordination Judgment Evals

This document is internal category and evaluation framing. It does not
introduce runtime behavior or customer-facing verification features.

Briarwood believes coordination judgment is a missing eval layer for real-world
agent action. Before software or agents can safely help route, recommend,
coordinate, verify, or trigger real-world work, they need a way to preserve the
human judgment that determines whether action is actually allowed.

This document defines internal language and evaluation concepts only. It does
not claim that customer-facing trust scoring, verification behavior,
automated agent action, or scoring systems are shipped product features.

## Current State

The current repository includes source/test/eval infrastructure for checking
coordination judgment boundaries. It does not add runtime behavior, UI, schema,
routes, auth, sends, contracts, payments, public links, AI execution,
route/preflight behavior, provider acceptance, or client-create behavior.

The short version:

```text
redacted coordination traces -> trace-derived eval suite report
synthetic provider evidence -> evidence-only acceptance characterization
both deterministic reports -> coverage taxonomy -> checkpoint summary
```

The implemented eval layer checks whether internal eval candidates preserve
human judgment before real-world contracted work would be allowed to move
forward. It does not move that work forward.

## Thesis

Briarwood's thesis is that real-world agent action needs an evaluation layer
for coordination judgment, not just answer quality.

In contracted work, the hard question is often not "what is the answer?" It is
"what can safely happen next, and who has the authority to make that happen?"
The coordination judgment eval framing exists to keep that question explicit.

## Implemented

The core question is:

```text
Did the system preserve the human judgment needed before moving real-world coordination forward?
```

The implemented source/test/eval layer checks candidate coordination states
against that question. It treats evidence, review, approval, and external
action as separate concepts.

In this eval layer, `operatorJudgment` is a synthetic expected judgment used to
test boundaries. It is not a lived, durable `CoordinationJudgment` and cannot
enter an authoritative production corpus. See
`docs/COORDINATION_EVIDENCE_ATTESTATION_JUDGMENT_MODEL.md` for the canonical
conceptual separation between evidence, attestation, judgment, permission,
outcome feedback, and scoped verdict.

This matters because real-world service work often runs through private,
messy, high-context coordination: texts, emails, referrals, handoffs, recovery
moments, pricing context, schedule context, and relationship trust. In that
setting, shallow evidence can look actionable when it is not. The eval framing
is designed to catch that drift before any product behavior relies on it.

## Why Trace-Derived Evals Matter

Briarwood is developing eval language for contracted work, not abstract content
classification.
The important failures are coordination failures:

- evidence quietly becoming approval
- a review state becoming permission to send
- private context leaking into a client-facing surface
- stale alignment becoming current authority
- conflicting signals getting collapsed into a single answer
- recovery or escalation being downgraded into ordinary forward motion
- invoices, contracts, payments, routes, provider acceptance, public links,
  client creation, or AI execution appearing without human approval

Trace-derived evals keep internal test cases close to the shape of real
coordination while staying redacted, synthetic, and safe. Each fixture captures
the judgment boundary that must survive conversion into an eval case.

## Pipeline

The current source/test/eval pipeline is:

1. Redacted/synthetic trace fixture

   A trace fixture describes a safe, synthetic coordination scenario. It names
   the source trace id, eval case candidate id, operator judgment, permission
   outcome, blocked reasons, private-only signals, forbidden actions, failure
   modes, and safe next step. Its operator judgment is an eval expectation, not
   a human-authored production judgment.

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

6. Provider acceptance evidence characterization

   `server/provider-acceptance-state-characterization.ts` reduces synthetic,
   chronological evidence into an evidence-only state. Explicit acceptance or
   decline requires an explicit provider-authored statement. Route assignment,
   schedule placement, availability, silence, operator or client claims,
   referral history, and commercial context do not become acceptance.

7. Coverage taxonomy and gap report

   `server/coordination-judgment-eval-coverage.ts` consumes the suite report
   and the separate provider acceptance fixture report. It maps them into
   covered and missing taxonomy items: judgment states, permission boundaries,
   and coordination signals. It only marks `provider_acceptance_state` covered
   when all required evidence states pass and the authority boundary remains
   intact.

8. Checkpoint summary

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

## Provider Acceptance Signal Coverage

Provider acceptance is characterized as evidence, not authority. Nine
redacted/synthetic fixtures cover:

- unresolved or no explicit provider signal
- explicit provider-authored acceptance
- explicit provider-authored decline
- conditional provider-authored acceptance
- conflicting provider-authored signals
- withdrawn or superseded evidence
- stale evidence after materially changed context

The fixtures also prove that silence, invitations, route assignment, schedule
placement, stated availability, operator assumptions, client assertions,
referral context, prior work history, and contract or payment context do not
count as provider acceptance.

Every result preserves chronology and source provenance, requires human review,
allows no runtime action, and keeps routing, scheduling, sending, contracts,
invoices, payments, publishing, client links, preflight, and provider acceptance
actions forbidden.

The private provider acceptance evidence bridge merged in PR #164 normalizes
manual or pasted captures into this evidence-only characterization. It keeps
claimed authorship unauthenticated, requires human review, and creates neither
attestation nor provider acceptance authority.

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
represented by internal trace-derived eval fixtures and that the separate
provider acceptance evidence taxonomy is represented by deterministic synthetic
fixtures. Both reports pass their source-level checks without granting runtime
authority.

It also proves that the reporting layer can summarize:

- suite id and version
- coverage taxonomy version
- fixture count
- provider acceptance fixture count and source trace ids
- provider acceptance evidence states and authority-boundary result
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
The planned judgment-state taxonomy and provider acceptance evidence signal are covered by deterministic source-level fixtures, but this does not grant runtime authority or product behavior.
```

## What The Checkpoint Does Not Prove

The checkpoint does not prove that Briarwood should take action in production.
It does not approve a provider, send a message, create an invoice, create a
contract, collect payment, publish a client link, run preflight, create a route,
accept a provider, create a client, or execute AI.

It is a reporting checkpoint, not a runtime decision engine. Complete coverage
of the current taxonomy is not permission to use the characterization as a
provider acceptance action or production decision.

It does not ship scoring systems, automated agent action, customer-facing
verification behavior, public trust scores, or autonomous fulfillment
decisions.

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

## Coordination Signal Coverage

The current internal coverage report now includes `provider_acceptance_state`.
That means the source/test/eval layer characterizes the required evidence states
and protects their authority boundary. It does not mean Briarwood accepts a
provider, changes a route, schedules work, contacts anyone, or exposes the state
to a client or the public.

## Future Direction

These concepts may inform future eval infrastructure and product development.
Future product work should keep the full separation: evidence and machine
annotation may inform human attestation and a scoped human judgment, but none
should silently become permission or authority to act.

Future work may expand the taxonomy, add more synthetic traces, harden
coordination-signal coverage, or connect these ideas to product surfaces only
after the authority boundaries are explicit and reviewed.

## Maintainer References

For maintainers, the current source/test/eval implementation is grouped around:

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
- `server/provider-acceptance-state-characterization.ts`
- `server/provider-acceptance-state-characterization.fixtures.ts`
- `server/provider-acceptance-state-characterization.characterization.test.ts`

These are implementation references, not product entry points.

## How To Run The Eval Tests

Run the checkpoint test:

```powershell
npx.cmd tsx --test server\coordination-judgment-eval-checkpoint.characterization.test.ts
```

Run the provider acceptance evidence characterization test:

```powershell
npx.cmd tsx --test server\provider-acceptance-state-characterization.characterization.test.ts
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

## Non-Goals

This document does not ship:

- scoring systems
- automated agent action
- customer-facing verification behavior
- public/client trust labels
- runtime trust decisions
- sends, invoices, contracts, payments, public links, provider acceptance,
  client creation, route/preflight behavior, or AI execution

The eval loop remains intentionally separate from product authority. It
contains no UI, schema changes, migrations, backend endpoints, production auth
changes, sends, invoices, contracts, payments, public/client links, AI
execution, route/preflight/provider acceptance, client-create behavior,
self-improving harness behavior, automated harness mutation, or `/assess`
calls.

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
