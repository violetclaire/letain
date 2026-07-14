# Coordination Evidence, Attestation, and Judgment Model

Status: conceptual architecture only. This document does not introduce source
types, persistence, signing, scoring, runtime authority, or product behavior.

## Purpose

Briarwood coordinates real-world work where evidence alone cannot establish
what an event meant, who had authority, or whether action is safe. The system
must preserve the distinction between a captured fact, a human account, a human
judgment, permission guidance, and the later decision to act.

The governing invariants are:

- Evidence is not judgment.
- Observation is not attestation.
- Attestation is not authority.
- Judgment is not permission to act.
- Permission guidance is not an external action decision.
- A verdict is limited by its evidence, context, issuer, audience, purpose, and
  time.
- Machine telemetry may support human judgment but cannot silently replace a
  human participant or qualified witness.
- Raw communication must not automatically become a trust score.
- Later outcomes may support or challenge a prior judgment, but they do not
  silently rewrite history.

## Conceptual Pipeline

```text
source evidence
-> non-authoritative machine annotation and organization
-> observation
-> relevant human participant or qualified witness review
-> human attestation
-> scoped coordination judgment
-> independent permission decision
-> explicit human action decision
-> action, wait, clarification, escalation, or stop
-> outcome observation
-> human outcome feedback
-> append-only correction, dispute, withdrawal, or supersession
-> context-limited scoped verdict
-> optional later reputation projection
```

No arrow in this pipeline is automatic. Each transition has its own eligibility,
visibility, and authority requirements.

## 1. EvidenceArtifact

An `EvidenceArtifact` is a durable or referential record of what occurred or
what was captured.

Examples include:

- inquiry fields and messages
- notification history
- coordination events
- route records
- schedule drafts
- provider-message captures
- contracts or payments used only as read-only observational context

An evidence artifact should preserve its source, capture time, original event
time when known, subject, visibility, and provenance. It may contain an
assertion, but the existence of the artifact does not establish that the
assertion is true.

Evidence is not attestation, judgment, permission, truth, provider acceptance,
or action authority.

## 2. MachineAnnotation

A `MachineAnnotation` is AI- or machine-produced organization of evidence.

It may:

- summarize or classify evidence
- cross-reference related artifacts
- flag contradictions
- identify missing evidence
- propose candidate interpretations
- draft a possible judgment for human review

It may never:

- sign or attest
- create an authoritative lived-corpus entry
- claim lived participation or witness capacity
- grant permission
- authorize external action

Machine annotations must remain attributable, replaceable, challengeable, and
explicitly non-authoritative. AI may prepare the record. AI may not become the
issuer of a human attestation or coordination judgment.

## 3. Observation

An `Observation` is a bounded statement describing something visible in the
evidence or workflow.

Observations may be machine-produced, system-produced, or human-recorded. An
observation can state that a message arrived, a route record changed, a date was
mentioned, or a conflict was surfaced. It does not independently prove:

- who had authority
- whether the evidence is complete
- whether a provider accepted contracted work
- whether a later action is safe

An observation becomes neither a human attestation nor a judgment merely
because a human viewed it.

## 4. HumanAttestation

A `HumanAttestation` is an accountable human statement equivalent to:

```text
I participated in, witnessed, or directly reviewed this event in this stated
capacity, and I attest to this bounded claim.
```

A future attestation artifact would need, conceptually:

- attestation id
- subject and bounded claim
- issuer identity and issuer capacity
- relationship to the event
- evidence references
- context version
- issued time
- scope and conditions
- uncertainty
- conflicts of interest
- visibility and validity
- correction, withdrawal, challenge, and supersession references

The repository does not currently contain a canonical generic
`HumanAttestation` artifact.

Operator review is not automatically attestation. Clicking a checklist or
recording `operator_reviewed` is not automatically attestation. Manually
captured claimed authorship is not authenticated authorship. Provider acceptance
characterization remains evidence-only. AI may never issue a
`HumanAttestation`.

A future signature could establish authorship and integrity. It could not prove
that the attested claim is true, complete, unbiased, or fit for every purpose.

## 5. CoordinationJudgment

A `CoordinationJudgment` is the canonical human-authored judgment artifact. It
records a bounded conclusion made from specified evidence and attestations in a
particular coordination context.

A future judgment artifact would need, conceptually:

- judgment id and subject
- issuer identity and issuer capacity
- evidence references
- attestation references
- context version
- conclusion and rationale
- scope and conditions
- uncertainty and conflicting evidence
- conflicts of interest
- issued time and validity period
- visibility
- challenge state
- correction, withdrawal, and supersession references
- outcome references

A coordination judgment is not evidence, provider acceptance, permission,
action authorization, or a universal statement about a person. It remains
context-limited. Later outcomes can support, challenge, narrow, or supersede the
judgment through new linked records, but cannot silently rewrite it.

## 6. PermissionDecision

A `PermissionDecision` is a deterministic, bounded answer to:

```text
What can safely happen next in the current coordination state?
```

Current Briarwood artifacts in this category include coordination assessments,
`PermissionedNextStepQuery`, risk factors, missing signals, human-review
requirements, and forbidden actions.

`PROCEED` is not execution authority. A permission decision does not send,
contact, route, schedule, publish, contract, invoice, collect payment, create a
client link, run preflight, or mark a provider accepted. Permission remains
separate from judgment. Explicit human action approval remains required where
the product's existing boundaries require it.

## 7. HumanActionDecision

A `HumanActionDecision` is the operational human decision made after permission
guidance. It determines whether the operator will act, wait, clarify, escalate,
recover, or stop.

It is separate from evidence, attestation, judgment, and permission guidance. A
judgment or permission result must never silently stand in for the human
decision to perform an external action.

This document does not define an action-execution system.

## 8. OutcomeObservation

An `OutcomeObservation` records what occurred after a judgment, permission
decision, or action.

Examples include:

- completed
- declined
- failed
- recovered
- rerouted
- disputed
- unresolved

Outcome observations are evidence. They do not automatically validate,
invalidate, or overturn a judgment.

## 9. OutcomeFeedback

`OutcomeFeedback` is a human interpretation linking a later outcome to an
earlier judgment.

It may support, challenge, narrow, correct, withdraw, or supersede the earlier
judgment. It must be a new linked record. It must not mutate the prior evidence,
attestation, or judgment.

The repository currently contains outcome fragments, but it does not contain a
canonical generic outcome-feedback link to a durable coordination judgment.

## 10. ScopedVerdict

A `ScopedVerdict` is a context-limited projection of one canonical
`CoordinationJudgment` for a defined audience and purpose.

The relationship is non-negotiable:

```text
CoordinationJudgment
-> filtered by scope, audience, purpose, visibility, and validity
-> ScopedVerdict
```

A scoped verdict:

- must reference its underlying coordination judgment
- must not be independently authored as a second truth
- must not broaden the original judgment
- must preserve conditions, uncertainty, challenge state, expiry, and
  supersession status where omission would mislead
- must not automatically become public or portable
- must not grant permission or action authority

If multiple judgments need synthesis, the synthesis requires a separate,
explicitly governed aggregation process. Multiple judgments must never be
silently combined into a verdict.

The repository does not currently contain a canonical `ScopedVerdict` artifact.

## 11. ReputationProjection

A `ReputationProjection` is a deferred, optional derived layer across multiple
valid scoped judgments and linked outcomes.

It must never:

- become a universal person score
- collapse context-specific judgments into one global truth
- treat payment as credibility
- treat telemetry as human judgment
- treat missing data as negative reputation
- reuse CDI, `trustLevel`, route status, or `trustedCircle` as a verdict

CDI remains behavioral telemetry and coordination-depth measurement. It is not
attestation, judgment, verdict, or reputation authority.

## Current Repository Mapping

| Current repository artifact | Conceptual category | Boundary |
| --- | --- | --- |
| Inquiries, messages, notifications, and coordination events | Evidence and observation fragments | They record context or activity; they do not establish judgment or authority. |
| `signalProvenance` | Provenance strings | It is not a typed attestation, issuer credential, or evidence commitment. |
| `operator_reviewed` and route/recovery review events | Review markers | They show that inspection occurred; they are not attestations or judgments. |
| Provider acceptance characterization | Evidence normalization and characterization | It distinguishes evidence states without accepting a provider or granting authority. |
| Provider acceptance evidence bridge merged in PR #164 | Private manual/pasted evidence normalization | `authorshipAuthenticated=false`; claimed authorship remains unauthenticated and human review remains required. |
| `coordination_assessments` | PermissionDecision | They are deterministic permission results, not authoritative human testimony. |
| `PermissionedNextStepQuery` | Private permission guidance | It surfaces bounded operator guidance and cannot execute an action. |
| Trace fixture `operatorJudgment` | Eval-only expected judgment | It belongs to synthetic source/test infrastructure, not the lived production corpus. |
| Route status `accepted` | Operational route state | It is not necessarily explicit provider-authored acceptance. |
| Thread referral assertions | Adjacent attestation-like behavior | They are not a canonical generic attestation artifact. |
| Route completion, referral outcomes, and CDI feedback | Outcome fragments | They are not generically linked outcome feedback for a prior judgment. |
| `HumanAttestation` | Absent | No canonical durable artifact exists. |
| Durable `CoordinationJudgment` | Absent | The eval vocabulary does not create a production judgment corpus. |
| `ScopedVerdict` | Absent | No context-limited projection artifact exists. |
| Generic `OutcomeFeedback` linkage | Absent | Later outcomes do not yet link generically to a durable judgment. |
| `ReputationProjection` | Absent | No projection should be inferred from legacy scores or telemetry. |

## Corpus Boundary

### Synthetic/redacted eval corpus

This domain includes:

- test fixtures
- simulations
- adversarial cases
- generated examples
- machine-produced annotations

These materials may test architecture and safety boundaries. They must never be
represented as lived production evidence, attestation, judgment, or outcome.

### Lived coordination corpus

This domain grows only from real coordination. Attestation or judgment writes
require accountable human participation or qualified witness capacity under a
future reviewed policy. The lived corpus cannot be bootstrapped with synthetic
events and cannot accept AI-generated authoritative writes.

The invariant is:

```text
AI may annotate.
Humans attest and judge.
The authoritative write path must remain lived.
```

## Append-Only Integrity

Future issued judgments must never be silently edited:

- corrections are new linked records
- withdrawals are new linked records
- disputes are new linked records
- supersessions are new linked records
- outcome feedback is a new linked record
- the full history remains inspectable

A future cryptographic signature could preserve authorship and integrity. It
would not prove truth, completeness, neutrality, or fitness for a later purpose.

This document defines the append-only requirement but does not select or
implement a signing or storage mechanism.

## Authority Boundaries

No artifact in this model automatically authorizes or performs:

- sending messages
- contacting providers
- routing providers
- scheduling providers
- marking providers accepted
- publishing schedules
- creating contracts
- creating invoices
- collecting payment
- creating public or client links
- running preflight
- executing a next action

Evidence, annotation, observation, attestation, judgment, permission, outcome,
verdict, and reputation remain separate from external action authority.

## Terminology Hazards

- `authoritativeSignals` means backend-selected inputs, not authoritative human
  testimony.
- `operator_reviewed` means inspected, not attested.
- Route status `accepted` is not necessarily provider-authored acceptance.
- Verification may mean deterministic consistency checking, not truth.
- A human override is not automatically a signed or canonical judgment.
- An eval verdict is a test result, not a lived coordination verdict.
- CDI `trustLevel` and composite scores are telemetry, not judgment.
- `trustedCircle` is a relationship list, not a verdict.
- PR #164's `authorshipAuthenticated=false` boundary must remain explicit.

## Policy Questions Before Implementation

The following remain unresolved for Violet's review:

- Who qualifies as a lived participant?
- Who qualifies as a relevant witness?
- When is independent review required?
- May an operator attest to a relayed provider statement, and under what scope?
- How are conflicts of interest disclosed?
- What determines judgment validity and expiry?
- Who may challenge an attestation, judgment, or verdict?
- What is the correction and withdrawal policy?
- How must outcomes link to prior judgments?
- What are the audience and portability rules?
- What privacy and minimum-evidence disclosure rules apply?
- Does any judgment require countersigning?
- When may a verdict contribute to a future reputation projection?

## Deferred Engineering

This model explicitly defers:

- schema and migrations
- production persistence
- source-only types
- cryptographic signing
- WebAuthn and passkeys
- Verifiable Credentials
- evidence hashes and Merkle roots
- timestamping
- transparency logs
- threshold signatures
- public verdict exchange
- reputation weighting
- staking and slashing
- challenger bonds
- customer-facing trust scores
- automatic permission or action from a signed judgment

No implementation should begin until the vocabulary and unresolved policy
questions have been reviewed independently.
