# CDI Product and Research Scopes

CDI stands for Choreography Depth Index. It is Briarwood's core
behavioral-reliability and coordination-depth measurement thesis: turning
observed real-world coordination behavior into machine-readable reliability
signals.

This document separates the current product scope from broader future research
applications. It is documentation only. It does not add schema, scoring code,
LLM scoring, robotics/autonomy implementation, public reputation, or UI.

## Core Thesis

Briarwood AI is behavioral measurement and prediction for real-time physical
coordination. CDI is not generic workflow analytics and it is not simulated
human behavior. It should be derived from observed coordination events under
real-world stakes.

CDI should be treated as a private behavioral reliability signal and
coordination-depth metric. It can support coordination assessment and
verification decisions, but it is not the same thing as the permission decision.

- CDI asks: How much behavioral reliability and coordination depth does this
  path or context show?
- The Verification Layer asks: Given the evidence, what is safe to do next?

## Product CDI

Product CDI is the near-term Briarwood implementation. It should remain:

- Private.
- Operator-scoped.
- Path/context-aware.
- Derived from actual coordination behavior.
- Used internally to support coordination assessment and permission decisions.
- Explainable and human-contestable.

Product CDI must not become:

- A public provider score.
- A person score.
- A marketplace ranking.
- A public trust badge.
- A paid-placement or pay-to-play mechanism.
- A public reputation system.

Missing or low signal should lead to safer coordination decisions such as
`CLARIFY`, `REROUTE`, `ESCALATE`, or `PROCEED_WITH_OVERSIGHT`. It must not mean
"bad person."

## Product CDI Observable Constructs

The product-facing CDI thesis can be described through these constructs:

- Response Velocity (Rv): how fast and consistently an operator or route target
  acts under real conditions.
- Accuracy Memory (Am): follow-through across commitments, open loops,
  scheduling, deposits, contracts, routing, handoffs, and completed
  engagements.
- History Factor (Hf): depth and persistence of the coordination record over
  time.
- Noise Penalty (Sp): behavioral inconsistency, drift, contradiction, dropped
  threads, unresolved loops, stale states, or unstable handoffs.

Reference formula:

```text
CDI = ((0.35 x Rv) + (0.40 x Am) + (0.25 x Hf)) x (1 - Sp)
```

This formula is a product/research framing artifact. It is not an instruction
to add public scores, rankings, or a new scoring UI.

## Relationship To The Verification Layer

The existing coordination assessment layer is the current Verification Layer
foundation. See `docs/VERIFICATION_LAYER_AUDIT.md`.

CDI is the measurement layer. It describes behavioral reliability and
coordination depth signals that may support a path assessment.

Coordination assessment is the operational permission layer. It decides what is
safe to do next for a specific coordination path using deterministic,
inspectable rules.

The current product should extend existing coordination primitives before
creating any new scoring system:

- `coordination_paths` as the path-based subject.
- `coordination_events` and `signalProvenance` as evidence/provenance.
- `evaluateCoordinationPath()` as deterministic permission logic.
- `coordination_assessments` as the current result/run snapshot.

CDI may later supply structured evidence into that existing layer. It should not
replace the permission decision or create a parallel public ranking system.

## Research CDI

Research CDI is the broader future standards/autonomy thesis. It may later
generalize CDI into human-robot and multi-agent coordination sharing, including:

- Human coordination capacity.
- Robot operational reliability.
- Network coordination state.
- Autonomy allocation.
- Cross-vendor trust settlement.

This future scope must not be implemented in Briarwood product code yet. Do not
add robotics/autonomy control code, biosignal or wearable implementation, ROS
integration, network-consensus mechanics, or cross-vendor settlement logic as
part of current product CDI.

## Guardrails

Future CDI work should preserve these boundaries:

1. Keep CDI private and operator-scoped until there is a reviewed product and
   privacy model.
2. Keep core permission decisions deterministic and inspectable.
3. Do not use LLMs to produce core CDI or verification decisions.
4. Do not expose CDI as a public trust badge, provider score, person score, or
   marketplace ranking.
5. Do not make CDI pay-to-play.
6. Treat contract, payment, sender, token, Square, SMS, email, and public-link
   surfaces as review-only evidence sources.
7. Extend the existing coordination path layer before adding new CDI or
   verification schema.

## Future Schema Threshold

New CDI or verification schema should only be considered when the existing
coordination path primitives cannot safely express the needed behavior. Examples
that may justify future schema include:

- Independently versioned CDI measurement runs.
- Durable evidence artifacts with source table, source id, and evidence type.
- Non-inquiry-rooted subjects that cannot reasonably be represented as
  coordination paths.
- Auditable input snapshots required for legal, operational, or research
  reproducibility.

Until those thresholds are met, CDI should remain an internal measurement thesis
that informs the existing coordination assessment foundation rather than a new
parallel scoring system.
