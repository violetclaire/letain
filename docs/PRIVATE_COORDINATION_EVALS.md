# Private Coordination Evals

This document names Briarwood's private coordination eval layer without adding
runtime schema, tables, replay execution, admin UI, or product behavior.

Agent loops are only as good as their verifiers. Verifiers are only as good as
the human workflow knowledge encoded inside them. Briarwood's strategic IP is a
private eval suite for real-world coordination: cases that check whether the
coordination verifier and future agents make safe, explainable decisions from
operator-private workflow evidence.

## Scope

Private coordination evals evaluate coordination paths, not people. They are
operator-scoped and private by default. They should test whether Briarwood made
the right permission decision for a specific path state, evidence set, and human
workflow context.

The existing coordination assessment layer is the first verifier foundation:

| Eval concept | Current Briarwood foundation | First implementation form |
| --- | --- | --- |
| CoordinationEvalCase | Synthetic/redacted source fixture | Source-only test fixture |
| CoordinationRubric | Permission decisions, risk factors, missing signals, and human review flags | Source-only expected assertions |
| VerificationRun | `coordination_assessments` row | Already covered by existing result/run snapshot |
| EvalRun | Missing | Do not persist yet |
| EvalResult | Missing | Source-only expected output first |
| EvidenceArtifact | `coordination_events` plus `signalProvenance` | Existing provenance layer |
| VerificationSubject | `coordination_paths` | Existing path-based subject |

`coordination_paths` remain the subject. `coordination_events` and
`signalProvenance` remain the evidence/provenance foundation.
`evaluateCoordinationPath()` remains the deterministic permission engine.
`coordination_assessments` currently covers the result/run snapshot.

## Guardrails

Private evals must preserve these boundaries:

- Evaluate coordination paths, not people.
- Keep cases private and operator-scoped.
- Redact real cases by default.
- Prefer redacted summaries and content hashes over raw content.
- Missing or low signal means `CLARIFY`, `REROUTE`, `ESCALATE`,
  `PROCEED_WITH_OVERSIGHT`, `STOP`, or human review. It never means "bad
  person."
- Payment must not improve verification or eval outcomes.
- Do not create public trust scores, provider scores, person scores, rankings,
  reputation, paid placement, or pay-to-play routing.
- Do not use an LLM for core verification decisions.
- Do not create a parallel verifier next to the existing coordination
  assessment layer.

## Source Fixtures First

The first implementation should be source-only fixtures and characterization
tests. Fixture cases should be synthetic or redacted. If a real workflow later
becomes an eval case, store only the minimum needed summary and a content hash
unless raw content is explicitly required and reviewed.

The first fixture set should cover the existing deterministic permission
decisions:

- `CLARIFY`
- `REROUTE`
- `ESCALATE`
- `STOP`
- `PROCEED_WITH_OVERSIGHT`
- `PROCEED`

These cases are regression expectations for the verifier. They are not product
analytics, public ratings, or marketplace reputation.

## Schema Threshold

New eval persistence should wait until there is a concrete need that source
fixtures cannot satisfy. Examples that may justify future persistence are:

- Persisted eval runs that must be compared over time.
- Independently versioned checks.
- Immutable input snapshots for audit or legal review.
- Non-inquiry-rooted subjects that cannot be represented as coordination paths.

Until then, Briarwood should extend and protect the existing coordination path
assessment foundation instead of creating new eval tables.
