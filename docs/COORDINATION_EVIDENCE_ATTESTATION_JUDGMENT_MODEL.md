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

## Conceptual Pipeline: Dependency and Lifecycle Model

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

This is a dependency and lifecycle model, not a mandatory linear workflow. Not
every workflow traverses every stage, and no arrow implies an automatic
transition. Each transition has its own eligibility, visibility, and authority
requirements.

Outcome feedback is not required before every `ScopedVerdict` can exist. A
scoped verdict may project the current effective state of one canonical
`CoordinationJudgment` for a defined audience and purpose. Later outcomes,
disputes, corrections, withdrawals, or supersessions add linked history and may
change the current projection. They never mutate the original judgment.

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

A `HumanAttestation` is an accountable human statement that adopts an exact,
bounded claim within the issuer's stated capacity. It is equivalent to:

```text
I issue this exact bounded claim from this stated capacity and relationship to
the event, subject to the stated evidence, scope, conditions, and uncertainty.
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

### Attestation Capacity and Claim Limits

Issuer capacity and relationship to the event constrain the permitted claim:

- A participant may attest only to their own actions, communications,
  decisions, and directly experienced coordination.
- A direct witness may attest only to events or statements they directly
  observed.
- An evidence reviewer may attest that they reviewed specified artifacts,
  describe what those artifacts contain, and identify contradictions,
  omissions, or limitations in the record. Reviewing artifacts does not allow
  them to claim that the underlying event occurred as represented, turn claimed
  provider authorship into authenticated identity, or attest that a provider
  accepted contracted work unless they are independently eligible under a
  future reviewed policy.
- A recipient of a relayed statement may attest that they directly received a
  statement attributed to a particular person. They may not automatically
  attest that the attributed identity was authenticated or that the statement
  was true.

A claim broader than the issuer's capacity supports must fail closed.
"Qualified witness" status cannot be established by self-assertion alone;
witness eligibility remains an unresolved governance policy.

An operator clicking approve, checking a review box, copying an AI summary, or
reviewing evidence does not automatically create lived attestation. Machine
annotation does not become human attestation because a human accepted or copied
it. The human issuer, and any future human signer, must understand and adopt the
exact bounded claim they issue.

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

### Operator Synthesis and Judgment

Capacity limits `HumanAttestation`, not the human ability to reason. An
experienced operator may form a broader `CoordinationJudgment` from multiple
`EvidenceArtifact` records and bounded `HumanAttestation` records. The operator
may not broaden their own attestation beyond what they personally participated
in, directly witnessed, directly received, or reviewed. Broader synthesis
belongs in `CoordinationJudgment`.

Every coordination judgment must identify the evidence and attestations on
which it relies. Direct, relayed, inferred, disputed, and unauthenticated
information must remain distinguishable. Conflicting or unauthenticated
evidence must remain visible and must not be silently resolved into certainty.

Provider acceptance requires explicit provider-authored evidence. Operator
experience may inform interpretation, but it must be disclosed as judgment
rationale rather than presented as witnessed fact. Qualified-witness
eligibility must come from reviewed policy, not self-assertion. Neither
`HumanAttestation` nor `CoordinationJudgment` grants permission or authority to
act.

For example:

```text
Attestation:
"I reviewed these messages. One says the provider accepted, and a later message
adds a condition."

CoordinationJudgment:
"The acceptance appears conditional and requires human review before
coordination proceeds."
```

The attestation describes the issuer's actual review capacity. The coordination
judgment is a scoped interpretation based on identified evidence. It must not
be represented as:

```text
"I witnessed the provider accept."
```

That statement would falsely claim firsthand witness capacity.

### Judgment Materiality, Staleness, and State Transitions

A judgment remains effective only while the facts, conditions, assumptions, and
context on which it depends remain materially unchanged. Staleness applies only
to the `CoordinationJudgment` whose supporting context changed. A material
change must not invalidate unrelated judgments for the same inquiry, provider,
or contracted work. For example, a location change may stale a
travel-feasibility judgment without invalidating an unrelated judgment about
whether pricing information was received.

Every judgment must identify the context, conditions, assumptions, evidence,
and scope on which it depends.

#### Materiality Test

The reviewed rule is:

```text
A change is material when a reasonable provider could use it as a reason to
accept, decline, reprice, add conditions, change staffing, or reconsider
feasibility.
```

Materiality is evaluated relative to the particular judgment and its scope. A
change that appears cosmetic must still be treated as material when it affects
travel, access, setup, timing, duration, breaks, staffing, responsibility,
cost, safety, or feasibility.

- A room change may be operationally neutral, or material if it changes access
  or setup.
- A schedule edit may be operationally neutral, or material if it changes call
  time, duration, travel, breaks, or responsibility.

#### Distinct Lifecycle States

The following are conceptual lifecycle states only. They do not define source
types or runtime enums:

```text
Material supporting context changed
-> stale_requires_review

Material conflicting new evidence appeared
-> conflicting_requires_review

The relevant human issuer or provider withdrew the prior position
-> withdrawn

A later statement or judgment explicitly replaced prior terms or conclusions
-> superseded

An explicit validity period ended without reaffirmation
-> expired

The judgment remains materially supported and in scope
-> effective
```

All transitions are append-only. The original judgment remains inspectable. A
transition changes the current effective state, not the historical contents of
the original judgment. No lifecycle state automatically grants, removes, or
executes external action authority. Human review is required where the current
evidence does not deterministically establish the applicable state.

#### Provider-Acceptance Material Changes

For a judgment concerning provider acceptance, the following always require
fresh review when materially changed:

- provider identity
- date
- start time, ready time, duration, or hard deadline
- services, deliverables, quantities, or headcount
- provider responsibilities
- compensation, expenses, or payment timing
- cancellation terms or other commercial terms
- explicit conditions, dependencies, or assumptions
- location where it affects travel, access, setup, timing, staffing, cost, or
  feasibility
- staffing expectations or required collaborators
- contract version or scope version
- provider obligations

Fresh review is also required when new provider-authored evidence withdraws,
conditions, contradicts, or replaces earlier acceptance or terms, or when new
credible evidence creates a material conflict about what the provider accepted.

The governing boundary is:

```text
Fresh operator review does not itself renew provider acceptance.
```

When accepted terms materially change, current acceptance requires new explicit
provider-authored evidence. An operator may identify that prior acceptance is
stale, conflicting, withdrawn, or superseded and may issue a scoped
`CoordinationJudgment` explaining what review is required. An operator may not
create renewed provider acceptance through interpretation, experience, review,
or approval.

Briarwood may flag the need for clarification or fresh evidence. It must not
infer renewed agreement or contact the provider automatically.
Provider-acceptance characterization remains evidence-only and grants no action
authority.

#### ScopedVerdict Effects

A `ScopedVerdict` must expose the current lifecycle state of its underlying
`CoordinationJudgment`. A stale, conflicting, withdrawn, superseded, or expired
judgment must never be projected as presently effective. A verdict may explain
historical judgment state, but it must not hide that the judgment no longer
supports a current conclusion. Unrelated material changes must not contaminate
verdicts based on unaffected judgments.

These lifecycle rules preserve the existing separations between evidence,
attestation, judgment, permission, and explicit human action. Operator
experience may inform judgment rationale but cannot manufacture
provider-authored evidence. Direct, relayed, inferred, conflicting, disputed,
and unauthenticated information remain distinguishable. PR #164 authorship
remains unauthenticated, synthetic fixtures cannot enter the lived corpus, and
no artifact automatically sends, contacts, routes, schedules, contracts,
invoices, collects payment, publishes, or marks a provider accepted.

### Pre-Execution Confirmation and Operational Readiness

In contracted event work, execution does not ordinarily occur after months of
complete silence. Before performance, some form of coordination or confirmation
occurs: an operator, customer, or planner checks in; a schedule is prepared and
distributed; details are reviewed; questions or corrections are raised; and
providers or collaborating workers request or acknowledge the current schedule.

#### Accepted Terms

Provider acceptance concerns the particular terms the provider explicitly
accepted. Time passing alone does not automatically erase historical
acceptance. Accepted terms remain tied to the provider, date, scope, commercial
terms, conditions, responsibilities, and version that were accepted. Material
changes still require fresh explicit provider-authored evidence under the
existing policy.

#### Active Coordination

Active coordination means there is recent evidence that the contracted work is
still being prepared for execution. Evidence may include schedule distribution,
logistical questions, corrections, acknowledgments, requests for the current
schedule, staffing discussion, access instructions, or other event-specific
preparation.

Each artifact must retain its actual author and provenance. Customer or planner
activity must not be relabeled as provider-authored confirmation.

#### Execution Readiness

Execution readiness is a current judgment about whether the provider has the
necessary information and appears prepared to perform under the current terms.
A months-old contract or acceptance record is not sufficient by itself to
establish current execution readiness. Event-bound work requires a
pre-execution coordination checkpoint. Silence before execution must not be
treated as current readiness.

#### Missing Checkpoint Evidence

When the required pre-execution checkpoint has not been satisfied, the
conceptual result is:

```text
readiness_unconfirmed_requires_review
```

This is conceptual vocabulary only. It does not define a runtime enum or source
type. `readiness_unconfirmed_requires_review` does not mean withdrawn, declined,
cancelled, breached, or unavailable. It means there is insufficient current
evidence to rely on readiness without human review or fresh coordination
evidence.

#### Source-Specific Meaning

- A planner or customer sending a schedule proves that schedule coordination
  occurred.
- A planner or customer reporting that a provider is confirmed is relayed
  evidence unless provider-authored evidence supports it.
- A provider requesting the current schedule is provider-authored evidence of
  active participation.
- A provider acknowledging the schedule is provider-authored evidence that it
  was received.
- Receipt or acknowledgment alone does not automatically prove full readiness
  if material questions remain.
- Other workers requesting schedules may show active coordination for those
  workers, but must not silently confirm another provider.

#### Checkpoint Timing

This model does not define arbitrary universal expiry periods. Checkpoint timing
depends on the judgment class, event type, lead time, operational risk, and
execution date. Exact checkpoint windows remain a beta and policy-validation
question. A future system should support judgment-specific or workflow-specific
checkpoints rather than one universal number of days.

Historical records do not expire as history. Current readiness may require
reaffirmation even when no material change has been reported.

#### Authority Boundary

Briarwood may identify that confirmation is due or readiness remains
unconfirmed and may organize the relevant evidence for operator review. It must
not infer provider readiness from silence or infer renewed provider acceptance.
It must not automatically contact, message, remind, schedule, route, or mark
anyone confirmed.

Fresh operator review does not manufacture provider-authored confirmation.
Neither active coordination nor execution readiness grants external action
authority.

### Cumulative Scope Changes and Qualified Service Capacity

#### Cumulative Changes

A series of individually small service additions may cumulatively create a
material change. Briarwood must evaluate the resulting full scope rather than
treat every addition as operationally independent. Cumulative additions may
materially affect staffing, timing, workload, travel, cost, responsibility,
safety, quality, or feasibility. When a professional capacity threshold is
crossed, the affected terms require fresh review.

#### Requested Additions and Agreement

A customer or planner requesting added services does not automatically
establish provider acceptance of every resulting staffing, timing, travel, or
commercial consequence. The requested services, the provider's feasibility
judgment, and the customer's acceptance of revised terms must remain
distinguishable.

A provider updating a proposal, contract, invoice, schedule, or staffing plan
does not by itself prove that the other party accepted the revised terms.
Briarwood must preserve which party requested, proposed, questioned, accepted,
declined, or replaced each affected term.

#### Scope-Specific Accommodations

A concession, courtesy, discount, complimentary person, or unusual staffing
accommodation remains tied to the scope, purpose, timing, and conditions under
which it was offered. It must not automatically survive material expansion of
the work, silently become an unlimited or permanent promise, or establish the
provider's normal practice for later contracted work.

Failure to identify the exact threshold immediately may create ambiguity. It
does not automatically waive the provider's ability to restaff, reprice, change
timing, reduce scope, or decline the expanded work.

#### Qualified Artists and Assistants

In Violet's normal contracted beauty-work model, independent services are
normally performed by qualified artists. The assistant arrangement under
discussion was a rare, scope-specific accommodation, not the normal staffing
model. Other providers and industries may use assistants differently, so this
practice must not be generalized into a universal prohibition.

The governing invariant is:

```text
People present, qualified service capacity, and independently executable
service lanes are not interchangeable.
```

- A qualified artist may independently perform the contracted service they are
  qualified and assigned to provide.
- An assistant may perform preparation, support, organization, cleanup, or
  other specifically assigned duties.
- An assistant must not automatically be counted as another independent
  service lane.
- A trainee, observer, coordinator, or support person must not silently become
  qualified production capacity.
- Capacity depends on role, qualifications, assigned duties, service type,
  timing, and the actual execution plan.
- Headcount alone does not establish feasibility.

#### Professional Feasibility Judgment

A provider may determine that a revised scope requires another qualified
artist, an earlier start, reduced services, a longer execution window, or
another feasible plan. That professional judgment may be grounded in service
duration, quality requirements, workload, ready time, travel, staffing, and
safety. It does not itself prove that the customer accepted any resulting price
or commercial change.

Briarwood must preserve the difference between:

```text
services requested
services accepted
staffing required
staffing accepted
timing required
timing accepted
commercial terms proposed
commercial terms accepted
```

#### Term-Level Disagreement

A disagreement about one affected term must not automatically make the entire
contracted relationship disputed. Briarwood should represent term-level states
separately. For example:

- added services accepted
- prices for those services accepted
- prior assistant accommodation no longer sufficient
- additional qualified staffing required by provider judgment
- additional staffing charge questioned or not accepted
- fallback timing or scope requires confirmation

Neither party should be characterized as dishonest merely because the
operational consequences were not mutually understood.

#### Authority Boundary

Briarwood may identify cumulative material changes and organize the evidence
for review. It may not infer customer acceptance of revised charges or provider
acceptance of expanded work. It may not automatically revise staffing, pricing,
schedules, contracts, invoices, or service obligations. No staffing or
feasibility judgment grants external action authority.

### Versioned Amendments and Current Agreed Terms

#### Original Signed Agreement as Baseline

The original signed contract establishes the initial agreed terms. Later
additions, reductions, timing changes, staffing changes, price changes, or other
amendments must remain linked to that original agreement. The original signed
version must remain inspectable and must never be silently overwritten.

#### Confirmation Without Mandatory Re-Signing

The reviewed domain rule is:

```text
In Violet's normal contracted-work process, the customer does not always
re-sign the full contract after every agreed update.
```

The parties may agree to a change through attributable written communication.
The provider may then revise the already signed contract and send the updated
version as the current record. The revised document may memorialize an
agreement already reached through messages or other attributable communication.

This practice must not be generalized into a universal legal rule for every
provider, contract, jurisdiction, or industry.

#### Sending a Revision Does Not Create Agreement

The governing boundary is:

```text
An updated contract records agreed changes; merely sending it does not prove
that every newly written term was accepted.
```

The following stages must remain distinguishable:

```text
customer requested change
provider reviewed change
provider accepted or declined feasibility
revised price, staffing, timing, or conditions were proposed
affected terms were agreed
provider issued updated document
updated document was delivered
```

A provider-issued revision may evidence the provider's position. It must not
automatically prove customer acceptance of terms the customer had not already
agreed to. Receipt, silence, or failure to object must not automatically become
acceptance. A requested service addition must not automatically prove
acceptance of every resulting operational or commercial consequence.

#### Current Agreed Version

The current agreed terms may be established by the original signed agreement
plus later supported amendments:

```text
original signed contract
+ attributable evidence of an agreed amendment
+ provider-issued revised version memorializing that amendment
= current agreed version
```

This is a conceptual relationship only. It does not define runtime logic or
contract types. Unchanged terms from the original agreement continue to carry
forward. Only affected terms are amended or superseded. A revision must not
silently replace unrelated terms. The current version must show which terms
came from the original agreement and which were later amended.

#### Source-Specific Agreement Evidence

Depending on context, agreement evidence may include:

- a clear customer request followed by explicit provider acceptance of the
  workable change
- a clear written acknowledgment that the revised scope, timing, staffing, or
  price is correct
- attributable messages agreeing to specific amended terms
- a later signed amendment when the parties choose to use one

Payment, receipt, silence, document delivery, or performance alone must not be
declared universally sufficient acceptance. Where evidence is incomplete,
conflicting, or only shows that a revision was sent, the affected terms remain
pending or require review.

#### Version History

Briarwood must preserve:

- the original signed version
- requested changes
- messages or evidence supporting agreement
- the provider's revised version
- the exact terms changed
- the exact terms carried forward
- the author and time of each artifact
- the current effective version
- any later correction, withdrawal, or supersession

No version may be silently mutated or erased.

#### Authority Boundary

Briarwood may compare versions, identify changed terms, organize evidence
showing how a revision was reached, and indicate that affected terms still
require confirmation. It must not infer agreement merely because an updated
document was sent. It must not require a new signature when the applicable
provider workflow and evidence do not require one, and it must not decide legal
enforceability.

Briarwood must not automatically send, sign, amend, accept, invoice, collect
payment, schedule, or execute contracted work. A current agreed version does
not itself grant external action authority.

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

A scoped verdict may exist before outcome feedback when it accurately projects
the current effective state of its underlying judgment. The projection must
expose the judgment's current challenge, expiry, withdrawal, and supersession
state. Later linked outcomes, disputes, corrections, withdrawals, or
supersessions may change the current projection, but they never mutate the
original judgment.

If multiple judgments need synthesis, the synthesis requires a separate,
explicitly governed aggregation process. Multiple judgments must never be
silently combined into a verdict.

The repository does not currently contain a canonical `ScopedVerdict` artifact.

## 11. ReputationProjection

A `ReputationProjection` is a deferred, optional derived layer across multiple
eligible, currently effective, in-scope, non-expired, non-withdrawn, and
context-compatible scoped judgments and linked outcomes. "Eligible" and
"effective" describe governed status for a particular use; they do not mean
objectively true.

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
Humans may attest only within their actual capacity.
The authoritative write path must remain grounded in real coordination.
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
- What exact pre-execution checkpoint timing should apply by judgment class and
  workflow?
- Which checkpoints and lead times match real operational practice must be
  determined through beta policy validation.
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
