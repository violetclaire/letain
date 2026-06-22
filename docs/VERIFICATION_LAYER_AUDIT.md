# Briarwood Verification Layer Audit

This audit formalizes the existing coordination assessment layer as the
foundation for Briarwood's Verification Layer. It is documentation only: no
schema, migration, route, UI, or runtime behavior change is implied.

## Core Principle

Briarwood verification is path-based, not person-based. The system evaluates
whether a specific coordination path is safe to continue right now. It must not
rank people, publish reputation, create provider scores, sell placement, or
turn missing data into a judgment about a person.

Missing or weak signals should produce one of the existing coordination
decisions:

- `CLARIFY`
- `REROUTE`
- `ESCALATE`
- `PROCEED_WITH_OVERSIGHT`

Missing data must not mean "bad person."

## Current Foundation

The current verification foundation already exists in the coordination path
layer:

| Verification concept | Current Briarwood foundation | Notes |
| --- | --- | --- |
| VerificationSubject | `coordination_paths` | First subject type. Inquiry-rooted, operator-scoped, and path-based. |
| VerifiableClaim | Coordination path state fields | Examples: context captured, authority state, availability state, handoff state, recovery capacity, commitment state, and outcome verification state. |
| EvidenceArtifact | `coordination_events` and `signalProvenance` | Current evidence/provenance layer. Adjacent inquiry, route, schedule, contract, payment, and trust timeline records can be referenced as evidence later. |
| VerificationCheck | `evaluateCoordinationPath()` | Current deterministic rule engine. No LLM should make core permission decisions. |
| VerificationResult | `coordination_assessments` | Current persisted permission decision result. |
| VerificationRun | `coordination_assessments` row | Current run snapshot. Future work may add explicit check version/input snapshot metadata if needed. |

The operator-facing panel already exists in `CoordinationPathAdmin`. It displays
the current permission decision, confidence, risk factors, missing signals,
recommended next action, explanation, signal provenance, event history, and
human judgment state.

## Existing Decisions

The current permission decision set is:

- `PROCEED`
- `PROCEED_WITH_OVERSIGHT`
- `CLARIFY`
- `REROUTE`
- `ESCALATE`
- `STOP`

These decisions are coordination permissions, not trust scores.

## Evidence Sources

Current and near-future evidence should be treated as operator-private,
path-scoped support for a permission decision:

- Inquiry context and missing context.
- Route target and route candidate state.
- Coordination events and human override notes.
- Inquiry response/composer draft state.
- Private schedule draft state.
- Contract/payment state as read-only observational evidence only.
- Trust timeline observations as provenance, not as the verifier itself.

Sensitive surfaces such as contract signing, payment links, Square, sender
domains, public tokens, and client-facing sends require focused review before
they become verification inputs.

## What Not To Build

Do not build a parallel verification system before extending the coordination
path layer.

Do not add:

- `VerificationSubject` or `VerificationResult` tables that duplicate
  `coordination_paths` or `coordination_assessments`.
- LLM-based core verification decisions.
- Trust scores.
- Provider scores.
- Person rankings.
- Public reputation.
- Paid placement or pay-to-play routing.
- Public/client share links as part of core verification.

LLMs may later help summarize or draft operator-facing explanations, but the
core permission decision should remain deterministic and inspectable.

## Future Schema Threshold

New verification schema should only be considered when at least one of these is
true:

- Checks need independent names, versions, and per-check result history.
- Evidence artifacts need durable source references independent from
  coordination events and `signalProvenance`.
- Verification subjects expand beyond inquiry-rooted coordination paths.
- A legal, audit, or operations requirement demands immutable input snapshots
  separate from `coordination_assessments`.

Until then, future work should extend the existing coordination path,
coordination event, and coordination assessment model.

## Recommended Next Layer

The next implementation step should be small and behavior-guarded:

1. Keep `coordination_paths` as the subject.
2. Keep `coordination_assessments` as the result/run snapshot.
3. Add structured metadata only if needed, for example a check version or
   evidence source list inside existing JSON metadata.
4. Surface summaries inside the existing coordination panel or Inquiry
   Workspace before adding a new verification UI.

This preserves the current Briarwood framing: coordination permission for a
specific path, with human judgment where the system cannot safely decide.
