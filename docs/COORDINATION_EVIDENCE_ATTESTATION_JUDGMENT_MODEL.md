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

Activ×};¶Ëkºwµçu¹Ð°¹Ñ¡ÕÍÑ½µÈÌÁÑ¹½ÉÙ¥ÍÑÉµÌµÕÍÐÉµ¥¸)¥ÍÑ¥¹Õ¥Í¡±¸()ÁÉ½Ù¥ÈÕÁÑ¥¹ÁÉ½Á½Í°°½¹ÑÉÐ°¥¹Ù½¥°Í¡Õ±°½ÈÍÑ¥¹Á±¸)½Ì¹½Ðä¥ÑÍ±ÁÉ½ÙÑ¡ÐÑ¡½Ñ¡ÈÁÉÑäÁÑÑ¡ÉÙ¥ÍÑÉµÌ¸)	É¥ÉÝ½½µÕÍÐÁÉÍÉÙÝ¡¥ ÁÉÑäÉÅÕÍÑ°ÁÉ½Á½Í°ÅÕÍÑ¥½¹°ÁÑ°)±¥¹°½ÈÉÁ± ÑÑÉ´¸((M½ÁµMÁ¥¥½µµ½Ñ¥½¹Ì()½¹ÍÍ¥½¸°½ÕÉÑÍä°¥Í½Õ¹Ð°½µÁ±¥µ¹ÑÉäÁÉÍ½¸°½ÈÕ¹ÕÍÕ°ÍÑ¥¹)½µµ½Ñ¥½¸Éµ¥¹ÌÑ¥Ñ¼Ñ¡Í½Á°ÁÕÉÁ½Í°Ñ¥µ¥¹°¹½¹¥Ñ¥½¹ÌÕ¹È)Ý¡¥ ¥ÐÝÌ½É¸%ÐµÕÍÐ¹½ÐÕÑ½µÑ¥±±äÍÕÉÙ¥ÙµÑÉ¥°áÁ¹Í¥½¸½)Ñ¡Ý½É¬°Í¥±¹Ñ±ä½µ¸Õ¹±¥µ¥Ñ½ÈÁÉµ¹¹ÐÁÉ½µ¥Í°½ÈÍÑ±¥Í Ñ¡)ÁÉ½Ù¥ÈÌ¹½Éµ°ÁÉÑ¥½È±ÑÈ½¹ÑÉÑÝ½É¬¸()¥±ÕÉÑ¼¥¹Ñ¥äÑ¡áÐÑ¡ÉÍ¡½±¥µµ¥Ñ±äµäÉÑµ¥Õ¥Ñä¸%Ð)½Ì¹½ÐÕÑ½µÑ¥±±äÝ¥ÙÑ¡ÁÉ½Ù¥ÈÌ¥±¥ÑäÑ¼ÉÍÑ°ÉÁÉ¥°¡¹)Ñ¥µ¥¹°ÉÕÍ½Á°½È±¥¹Ñ¡áÁ¹Ý½É¬¸((EÕ±¥¥ÉÑ¥ÍÑÌ¹ÍÍ¥ÍÑ¹ÑÌ()%¸Y¥½±ÐÌ¹½Éµ°½¹ÑÉÑÕÑäµÝ½É¬µ½°°¥¹Á¹¹ÐÍÉÙ¥ÌÉ)¹½Éµ±±äÁÉ½ÉµäÅÕ±¥¥ÉÑ¥ÍÑÌ¸Q¡ÍÍ¥ÍÑ¹ÐÉÉ¹µ¹ÐÕ¹È)¥ÍÕÍÍ¥½¸ÝÌÉÉ°Í½ÁµÍÁ¥¥½µµ½Ñ¥½¸°¹½ÐÑ¡¹½Éµ°ÍÑ¥¹)µ½°¸=Ñ¡ÈÁÉ½Ù¥ÉÌ¹¥¹ÕÍÑÉ¥ÌµäÕÍÍÍ¥ÍÑ¹ÑÌ¥É¹Ñ±ä°Í¼Ñ¡¥Ì)ÁÉÑ¥µÕÍÐ¹½Ð¹É±¥é¥¹Ñ¼Õ¹¥ÙÉÍ°ÁÉ½¡¥¥Ñ¥½¸¸()Q¡½ÙÉ¹¥¹¥¹ÙÉ¥¹Ð¥Ìè()ÑáÐ)A½Á±ÁÉÍ¹Ð°ÅÕ±¥¥ÍÉÙ¥Á¥Ñä°¹¥¹Á¹¹Ñ±äáÕÑ±)ÍÉÙ¥±¹ÌÉ¹½Ð¥¹ÑÉ¡¹±¸)((´ÅÕ±¥¥ÉÑ¥ÍÐµä¥¹Á¹¹Ñ±äÁÉ½É´Ñ¡½¹ÑÉÑÍÉÙ¥Ñ¡äÉ(ÅÕ±¥¥¹ÍÍ¥¹Ñ¼ÁÉ½Ù¥¸(´¸ÍÍ¥ÍÑ¹ÐµäÁÉ½É´ÁÉÁÉÑ¥½¸°ÍÕÁÁ½ÉÐ°½É¹¥éÑ¥½¸°±¹ÕÀ°½È(½Ñ¡ÈÍÁ¥¥±±äÍÍ¥¹ÕÑ¥Ì¸(´¸ÍÍ¥ÍÑ¹ÐµÕÍÐ¹½ÐÕÑ½µÑ¥±±ä½Õ¹ÑÌ¹½Ñ¡È¥¹Á¹¹Ð(ÍÉÙ¥±¹¸(´ÑÉ¥¹°½ÍÉÙÈ°½½É¥¹Ñ½È°½ÈÍÕÁÁ½ÉÐÁÉÍ½¸µÕÍÐ¹½ÐÍ¥±¹Ñ±ä½µ(ÅÕ±¥¥ÁÉ½ÕÑ¥½¸Á¥Ñä¸(´
Á¥ÑäÁ¹Ì½¸É½±°ÅÕ±¥¥Ñ¥½¹Ì°ÍÍ¥¹ÕÑ¥Ì°ÍÉÙ¥ÑåÁ°(Ñ¥µ¥¹°¹Ñ¡ÑÕ°áÕÑ¥½¸Á±¸¸(´!½Õ¹Ð±½¹½Ì¹½ÐÍÑ±¥Í Í¥¥±¥Ñä¸((AÉ½ÍÍ¥½¹°Í¥¥±¥Ñä)Õµ¹Ð()ÁÉ½Ù¥ÈµäÑÉµ¥¹Ñ¡ÐÉÙ¥ÍÍ½ÁÉÅÕ¥ÉÌ¹½Ñ¡ÈÅÕ±¥¥)ÉÑ¥ÍÐ°¸É±¥ÈÍÑÉÐ°ÉÕÍÉÙ¥Ì°±½¹ÈáÕÑ¥½¸Ý¥¹½Ü°½È)¹½Ñ¡ÈÍ¥±Á±¸¸Q¡ÐÁÉ½ÍÍ¥½¹°©Õµ¹ÐµäÉ½Õ¹¥¸ÍÉÙ¥)ÕÉÑ¥½¸°ÅÕ±¥ÑäÉÅÕ¥Éµ¹ÑÌ°Ý½É­±½°ÉäÑ¥µ°ÑÉÙ°°ÍÑ¥¹°¹)ÍÑä¸%Ð½Ì¹½Ð¥ÑÍ±ÁÉ½ÙÑ¡ÐÑ¡ÕÍÑ½µÈÁÑ¹äÉÍÕ±Ñ¥¹ÁÉ¥)½È½µµÉ¥°¡¹¸()	É¥ÉÝ½½µÕÍÐÁÉÍÉÙÑ¡¥É¹ÑÝ¸è()ÑáÐ)ÍÉÙ¥ÌÉÅÕÍÑ)ÍÉÙ¥ÌÁÑ)ÍÑ¥¹ÉÅÕ¥É)ÍÑ¥¹ÁÑ)Ñ¥µ¥¹ÉÅÕ¥É)Ñ¥µ¥¹ÁÑ)½µµÉ¥°ÑÉµÌÁÉ½Á½Í)½µµÉ¥°ÑÉµÌÁÑ)((QÉ´µ1Ù°¥ÍÉµ¹Ð()¥ÍÉµ¹Ð½ÕÐ½¹ÑÑÉ´µÕÍÐ¹½ÐÕÑ½µÑ¥±±äµ­Ñ¡¹Ñ¥É)½¹ÑÉÑÉ±Ñ¥½¹Í¡¥À¥ÍÁÕÑ¸	É¥ÉÝ½½Í¡½Õ±ÉÁÉÍ¹ÐÑÉ´µ±Ù°ÍÑÑÌ)ÍÁÉÑ±ä¸½ÈáµÁ±è((´ÍÉÙ¥ÌÁÑ(´ÁÉ¥Ì½ÈÑ¡½ÍÍÉÙ¥ÌÁÑ(´ÁÉ¥½ÈÍÍ¥ÍÑ¹Ð½µµ½Ñ¥½¸¹¼±½¹ÈÍÕ¥¥¹Ð(´¥Ñ¥½¹°ÅÕ±¥¥ÍÑ¥¹ÉÅÕ¥ÉäÁÉ½Ù¥È©Õµ¹Ð(´¥Ñ¥½¹°ÍÑ¥¹¡ÉÅÕÍÑ¥½¹½È¹½ÐÁÑ(´±±¬Ñ¥µ¥¹½ÈÍ½ÁÉÅÕ¥ÉÌ½¹¥ÉµÑ¥½¸()9¥Ñ¡ÈÁÉÑäÍ¡½Õ±¡ÉÑÉ¥éÌ¥Í¡½¹ÍÐµÉ±äÕÍÑ¡)½ÁÉÑ¥½¹°½¹ÍÅÕ¹ÌÝÉ¹½ÐµÕÑÕ±±äÕ¹ÉÍÑ½½¸((ÕÑ¡½É¥Ñä	½Õ¹Éä()	É¥ÉÝ½½µä¥¹Ñ¥äÕµÕ±Ñ¥ÙµÑÉ¥°¡¹Ì¹½É¹¥éÑ¡Ù¥¹)½ÈÉÙ¥Ü¸%Ðµä¹½Ð¥¹ÈÕÍÑ½µÈÁÑ¹½ÉÙ¥Í¡ÉÌ½ÈÁÉ½Ù¥È)ÁÑ¹½áÁ¹Ý½É¬¸%Ðµä¹½ÐÕÑ½µÑ¥±±äÉÙ¥ÍÍÑ¥¹°ÁÉ¥¥¹°)Í¡Õ±Ì°½¹ÑÉÑÌ°¥¹Ù½¥Ì°½ÈÍÉÙ¥½±¥Ñ¥½¹Ì¸9¼ÍÑ¥¹½È)Í¥¥±¥Ñä©Õµ¹ÐÉ¹ÑÌáÑÉ¹°Ñ¥½¸ÕÑ¡½É¥Ñä¸()ÕÑÕÉ©Õµ¹ÐÉÑ¥ÐÝ½Õ±¹°½¹ÁÑÕ±±äè((´©Õµ¹Ð¥¹ÍÕ©Ð(´¥ÍÍÕÈ¥¹Ñ¥Ñä¹¥ÍÍÕÈÁ¥Ñä(´Ù¥¹ÉÉ¹Ì(´ÑÑÍÑÑ¥½¸ÉÉ¹Ì(´½¹ÑáÐÙÉÍ¥½¸(´½¹±ÕÍ¥½¸¹ÉÑ¥½¹±(´Í½Á¹½¹¥Ñ¥½¹Ì(´Õ¹ÉÑ¥¹Ñä¹½¹±¥Ñ¥¹Ù¥¹(´½¹±¥ÑÌ½¥¹ÑÉÍÐ(´¥ÍÍÕÑ¥µ¹Ù±¥¥ÑäÁÉ¥½(´Ù¥Í¥¥±¥Ñä(´¡±±¹ÍÑÑ(´½ÉÉÑ¥½¸°Ý¥Ñ¡ÉÝ°°¹ÍÕÁÉÍÍÍ¥½¸ÉÉ¹Ì(´½ÕÑ½µÉÉ¹Ì()½½É¥¹Ñ¥½¸©Õµ¹Ð¥Ì¹½ÐÙ¥¹°ÁÉ½Ù¥ÈÁÑ¹°ÁÉµ¥ÍÍ¥½¸°)Ñ¥½¸ÕÑ¡½É¥éÑ¥½¸°½ÈÕ¹¥ÙÉÍ°ÍÑÑµ¹Ð½ÕÐÁÉÍ½¸¸%ÐÉµ¥¹Ì)½¹ÑáÐµ±¥µ¥Ñ¸1ÑÈ½ÕÑ½µÌ¸ÍÕÁÁ½ÉÐ°¡±±¹°¹ÉÉ½Ü°½ÈÍÕÁÉÍÑ¡)©Õµ¹ÐÑ¡É½Õ ¹Ü±¥¹­É½ÉÌ°ÕÐ¹¹½ÐÍ¥±¹Ñ±äÉÝÉ¥Ñ¥Ð¸((Ø¸AÉµ¥ÍÍ¥½¹¥Í¥½¸()AÉµ¥ÍÍ¥½¹¥Í¥½¹¥ÌÑÉµ¥¹¥ÍÑ¥°½Õ¹¹ÍÝÈÑ¼è()ÑáÐ)]¡Ð¸Í±ä¡ÁÁ¸¹áÐ¥¸Ñ¡ÕÉÉ¹Ð½½É¥¹Ñ¥½¸ÍÑÑü)()
ÕÉÉ¹Ð	É¥ÉÝ½½ÉÑ¥ÑÌ¥¸Ñ¡¥ÌÑ½Éä¥¹±Õ½½É¥¹Ñ¥½¸ÍÍÍÍµ¹ÑÌ°)AÉµ¥ÍÍ¥½¹9áÑMÑÁEÕÉå°É¥Í¬Ñ½ÉÌ°µ¥ÍÍ¥¹Í¥¹±Ì°¡Õµ¸µÉÙ¥Ü)ÉÅÕ¥Éµ¹ÑÌ°¹½É¥¸Ñ¥½¹Ì¸()AI=
¥Ì¹½ÐáÕÑ¥½¸ÕÑ¡½É¥Ñä¸ÁÉµ¥ÍÍ¥½¸¥Í¥½¸½Ì¹½ÐÍ¹°)½¹ÑÐ°É½ÕÑ°Í¡Õ±°ÁÕ±¥Í °½¹ÑÉÐ°¥¹Ù½¥°½±±ÐÁåµ¹Ð°ÉÑ)±¥¹Ð±¥¹¬°ÉÕ¸ÁÉ±¥¡Ð°½ÈµÉ¬ÁÉ½Ù¥ÈÁÑ¸AÉµ¥ÍÍ¥½¸Éµ¥¹Ì)ÍÁÉÑÉ½´©Õµ¹Ð¸áÁ±¥¥Ð¡Õµ¸Ñ¥½¸ÁÁÉ½Ù°Éµ¥¹ÌÉÅÕ¥ÉÝ¡É)Ñ¡ÁÉ½ÕÐÌá¥ÍÑ¥¹½Õ¹É¥ÌÉÅÕ¥É¥Ð¸((Ü¸!Õµ¹Ñ¥½¹¥Í¥½¸()!Õµ¹Ñ¥½¹¥Í¥½¹¥ÌÑ¡½ÁÉÑ¥½¹°¡Õµ¸¥Í¥½¸µÑÈÁÉµ¥ÍÍ¥½¸)Õ¥¹¸%ÐÑÉµ¥¹ÌÝ¡Ñ¡ÈÑ¡½ÁÉÑ½ÈÝ¥±°Ð°Ý¥Ð°±É¥ä°Í±Ñ°)É½ÙÈ°½ÈÍÑ½À¸()%Ð¥ÌÍÁÉÑÉ½´Ù¥¹°ÑÑÍÑÑ¥½¸°©Õµ¹Ð°¹ÁÉµ¥ÍÍ¥½¸Õ¥¹¸)©Õµ¹Ð½ÈÁÉµ¥ÍÍ¥½¸ÉÍÕ±ÐµÕÍÐ¹ÙÈÍ¥±¹Ñ±äÍÑ¹¥¸½ÈÑ¡¡Õµ¸)¥Í¥½¸Ñ¼ÁÉ½É´¸áÑÉ¹°Ñ¥½¸¸()Q¡¥Ì½Õµ¹Ð½Ì¹½Ð¥¹¸Ñ¥½¸µáÕÑ¥½¸ÍåÍÑ´¸((à¸=ÕÑ½µ=ÍÉÙÑ¥½¸()¸=ÕÑ½µ=ÍÉÙÑ¥½¹É½ÉÌÝ¡Ð½ÕÉÉÑÈ©Õµ¹Ð°ÁÉµ¥ÍÍ¥½¸)¥Í¥½¸°½ÈÑ¥½¸¸()áµÁ±Ì¥¹±Õè((´½µÁ±Ñ(´±¥¹(´¥±(´É½ÙÉ(´ÉÉ½ÕÑ(´¥ÍÁÕÑ(´Õ¹ÉÍ½±Ù()=ÕÑ½µ½ÍÉÙÑ¥½¹ÌÉÙ¥¹¸Q¡ä¼¹½ÐÕÑ½µÑ¥±±äÙ±¥Ñ°)¥¹Ù±¥Ñ°½È½ÙÉÑÕÉ¸©Õµ¹Ð¸((ä¸=ÕÑ½µ¬()=ÕÑ½µ­¥Ì¡Õµ¸¥¹ÑÉÁÉÑÑ¥½¸±¥¹­¥¹±ÑÈ½ÕÑ½µÑ¼¸)É±¥È©Õµ¹Ð¸()%ÐµäÍÕÁÁ½ÉÐ°¡±±¹°¹ÉÉ½Ü°½ÉÉÐ°Ý¥Ñ¡ÉÜ°½ÈÍÕÁÉÍÑ¡É±¥È)©Õµ¹Ð¸%ÐµÕÍÐ¹Ü±¥¹­É½É¸%ÐµÕÍÐ¹½ÐµÕÑÑÑ¡ÁÉ¥½ÈÙ¥¹°)ÑÑÍÑÑ¥½¸°½È©Õµ¹Ð¸()Q¡ÉÁ½Í¥Ñ½ÉäÕÉÉ¹Ñ±ä½¹Ñ¥¹Ì½ÕÑ½µÉµ¹ÑÌ°ÕÐ¥Ð½Ì¹½Ð½¹Ñ¥¸)¹½¹¥°¹É¥½ÕÑ½µµ¬±¥¹¬Ñ¼ÕÉ±½½É¥¹Ñ¥½¸©Õµ¹Ð¸((ÄÀ¸M½ÁYÉ¥Ð()M½ÁYÉ¥Ñ¥Ì½¹ÑáÐµ±¥µ¥ÑÁÉ½©Ñ¥½¸½½¹¹½¹¥°)
½½É¥¹Ñ¥½¹)Õµ¹Ñ½È¥¹Õ¥¹¹ÁÕÉÁ½Í¸()Q¡É±Ñ¥½¹Í¡¥À¥Ì¹½¸µ¹½Ñ¥±è()ÑáÐ)
½½É¥¹Ñ¥½¹)Õµ¹Ð(´ø¥±ÑÉäÍ½Á°Õ¥¹°ÁÕÉÁ½Í°Ù¥Í¥¥±¥Ñä°¹Ù±¥¥Ñä(´øM½ÁYÉ¥Ð)()Í½ÁÙÉ¥Ðè((´µÕÍÐÉÉ¹¥ÑÌÕ¹É±å¥¹½½É¥¹Ñ¥½¸©Õµ¹Ð(´µÕÍÐ¹½Ð¥¹Á¹¹Ñ±äÕÑ¡½ÉÌÍ½¹ÑÉÕÑ (´µÕÍÐ¹½ÐÉ½¸Ñ¡½É¥¥¹°©Õµ¹Ð(´µÕÍÐÁÉÍÉÙ½¹¥Ñ¥½¹Ì°Õ¹ÉÑ¥¹Ñä°¡±±¹ÍÑÑ°áÁ¥Éä°¹(ÍÕÁÉÍÍÍ¥½¸ÍÑÑÕÌÝ¡É½µ¥ÍÍ¥½¸Ý½Õ±µ¥Í±(´µÕÍÐ¹½ÐÕÑ½µÑ¥±±ä½µÁÕ±¥½ÈÁ½ÉÑ±(´µÕÍÐ¹½ÐÉ¹ÐÁÉµ¥ÍÍ¥½¸½ÈÑ¥½¸ÕÑ¡½É¥Ñä()Í½ÁÙÉ¥Ðµäá¥ÍÐ½É½ÕÑ½µ¬Ý¡¸¥ÐÕÉÑ±äÁÉ½©ÑÌ)Ñ¡ÕÉÉ¹ÐÑ¥ÙÍÑÑ½¥ÑÌÕ¹É±å¥¹©Õµ¹Ð¸Q¡ÁÉ½©Ñ¥½¸µÕÍÐ)áÁ½ÍÑ¡©Õµ¹ÐÌÕÉÉ¹Ð¡±±¹°áÁ¥Éä°Ý¥Ñ¡ÉÝ°°¹ÍÕÁÉÍÍÍ¥½¸)ÍÑÑ¸1ÑÈ±¥¹­½ÕÑ½µÌ°¥ÍÁÕÑÌ°½ÉÉÑ¥½¹Ì°Ý¥Ñ¡ÉÝ±Ì°½È)ÍÕÁÉÍÍÍ¥½¹Ìµä¡¹Ñ¡ÕÉÉ¹ÐÁÉ½©Ñ¥½¸°ÕÐÑ¡ä¹ÙÈµÕÑÑÑ¡)½É¥¥¹°©Õµ¹Ð¸()%µÕ±Ñ¥Á±©Õµ¹ÑÌ¹Íå¹Ñ¡Í¥Ì°Ñ¡Íå¹Ñ¡Í¥ÌÉÅÕ¥ÉÌÍÁÉÑ°)áÁ±¥¥Ñ±ä½ÙÉ¹ÉÑ¥½¸ÁÉ½ÍÌ¸5Õ±Ñ¥Á±©Õµ¹ÑÌµÕÍÐ¹ÙÈ)Í¥±¹Ñ±ä½µ¥¹¥¹Ñ¼ÙÉ¥Ð¸()Q¡ÉÁ½Í¥Ñ½Éä½Ì¹½ÐÕÉÉ¹Ñ±ä½¹Ñ¥¸¹½¹¥°M½ÁYÉ¥ÑÉÑ¥Ð¸((ÄÄ¸IÁÕÑÑ¥½¹AÉ½©Ñ¥½¸()IÁÕÑÑ¥½¹AÉ½©Ñ¥½¹¥ÌÉÉ°½ÁÑ¥½¹°É¥Ù±åÈÉ½ÍÌµÕ±Ñ¥Á±)±¥¥±°ÕÉÉ¹Ñ±äÑ¥Ù°¥¸µÍ½Á°¹½¸µáÁ¥É°¹½¸µÝ¥Ñ¡ÉÝ¸°¹)½¹ÑáÐµ½µÁÑ¥±Í½Á©Õµ¹ÑÌ¹±¥¹­½ÕÑ½µÌ¸±¥¥±¹(Ñ¥ÙÍÉ¥½ÙÉ¹ÍÑÑÕÌ½ÈÁÉÑ¥Õ±ÈÕÍìÑ¡ä¼¹½Ðµ¸)½©Ñ¥Ù±äÑÉÕ¸()%ÐµÕÍÐ¹ÙÈè((´½µÕ¹¥ÙÉÍ°ÁÉÍ½¸Í½É(´½±±ÁÍ½¹ÑáÐµÍÁ¥¥©Õµ¹ÑÌ¥¹Ñ¼½¹±½°ÑÉÕÑ (´ÑÉÐÁåµ¹ÐÌÉ¥¥±¥Ñä(´ÑÉÐÑ±µÑÉäÌ¡Õµ¸©Õµ¹Ð(´ÑÉÐµ¥ÍÍ¥¹ÑÌ¹Ñ¥ÙÉÁÕÑÑ¥½¸(´ÉÕÍ
$°ÑÉÕÍÑ1Ù±°É½ÕÑÍÑÑÕÌ°½ÈÑÉÕÍÑ
¥É±ÌÙÉ¥Ð()
$Éµ¥¹Ì¡Ù¥½É°Ñ±µÑÉä¹½½É¥¹Ñ¥½¸µÁÑ µÍÕÉµ¹Ð¸%Ð¥Ì¹½Ð)ÑÑÍÑÑ¥½¸°©Õµ¹Ð°ÙÉ¥Ð°½ÈÉÁÕÑÑ¥½¸ÕÑ¡½É¥Ñä¸((
ÕÉÉ¹ÐIÁ½Í¥Ñ½Éä5ÁÁ¥¹()ð
ÕÉÉ¹ÐÉÁ½Í¥Ñ½ÉäÉÑ¥Ðð
½¹ÁÑÕ°Ñ½Éäð	½Õ¹Éäð)ð´´´ð´´´ð´´´ð)ð%¹ÅÕ¥É¥Ì°µÍÍÌ°¹½Ñ¥¥Ñ¥½¹Ì°¹½½É¥¹Ñ¥½¸Ù¹ÑÌðÙ¥¹¹½ÍÉÙÑ¥½¸Éµ¹ÑÌðQ¡äÉ½É½¹ÑáÐ½ÈÑ¥Ù¥ÑäìÑ¡ä¼¹½ÐÍÑ±¥Í ©Õµ¹Ð½ÈÕÑ¡½É¥Ñä¸ð)ðÍ¥¹±AÉ½Ù¹¹ðAÉ½Ù¹¹ÍÑÉ¥¹Ìð%Ð¥Ì¹½ÐÑåÁÑÑÍÑÑ¥½¸°¥ÍÍÕÈÉ¹Ñ¥°°½ÈÙ¥¹½µµ¥Ñµ¹Ð¸ð)ð½ÁÉÑ½É}ÉÙ¥Ý¹É½ÕÑ½É½ÙÉäÉÙ¥ÜÙ¹ÑÌðIÙ¥ÜµÉ­ÉÌðQ¡äÍ¡½ÜÑ¡Ð¥¹ÍÁÑ¥½¸½ÕÉÉìÑ¡äÉ¹½ÐÑÑÍÑÑ¥½¹Ì½È©Õµ¹ÑÌ¸ð)ðAÉ½Ù¥ÈÁÑ¹¡ÉÑÉ¥éÑ¥½¸ðÙ¥¹¹½Éµ±¥éÑ¥½¸¹¡ÉÑÉ¥éÑ¥½¸ð%Ð¥ÍÑ¥¹Õ¥Í¡ÌÙ¥¹ÍÑÑÌÝ¥Ñ¡½ÕÐÁÑ¥¹ÁÉ½Ù¥È½ÈÉ¹Ñ¥¹ÕÑ¡½É¥Ñä¸ð)ðAÉ½Ù¥ÈÁÑ¹Ù¥¹É¥µÉ¥¸AHÄØÐðAÉ¥ÙÑµ¹Õ°½ÁÍÑÙ¥¹¹½Éµ±¥éÑ¥½¸ðÕÑ¡½ÉÍ¡¥ÁÕÑ¡¹Ñ¥Ñõ±Íì±¥µÕÑ¡½ÉÍ¡¥ÀÉµ¥¹ÌÕ¹ÕÑ¡¹Ñ¥Ñ¹¡Õµ¸ÉÙ¥ÜÉµ¥¹ÌÉÅÕ¥É¸ð)ð½½É¥¹Ñ¥½¹}ÍÍÍÍµ¹ÑÍðAÉµ¥ÍÍ¥½¹¥Í¥½¸ðQ¡äÉÑÉµ¥¹¥ÍÑ¥ÁÉµ¥ÍÍ¥½¸ÉÍÕ±ÑÌ°¹½ÐÕÑ¡½É¥ÑÑ¥Ù¡Õµ¸ÑÍÑ¥µ½¹ä¸ð)ðAÉµ¥ÍÍ¥½¹9áÑMÑÁEÕÉåðAÉ¥ÙÑÁÉµ¥ÍÍ¥½¸Õ¥¹ð%ÐÍÕÉÌ½Õ¹½ÁÉÑ½ÈÕ¥¹¹¹¹½ÐáÕÑ¸Ñ¥½¸¸ð)ðQÉ¥áÑÕÉ½ÁÉÑ½É)Õµ¹ÑðÙ°µ½¹±äáÁÑ©Õµ¹Ðð%Ð±½¹ÌÑ¼Íå¹Ñ¡Ñ¥Í½ÕÉ½ÑÍÐ¥¹ÉÍÑÉÕÑÕÉ°¹½ÐÑ¡±¥ÙÁÉ½ÕÑ¥½¸½ÉÁÕÌ¸ð)ðI½ÕÑÍÑÑÕÌÁÑð=ÁÉÑ¥½¹°É½ÕÑÍÑÑð%Ð¥Ì¹½Ð¹ÍÍÉ¥±äáÁ±¥¥ÐÁÉ½Ù¥ÈµÕÑ¡½ÉÁÑ¹¸ð)ðQ¡ÉÉÉÉ°ÍÍÉÑ¥½¹Ìð©¹ÐÑÑÍÑÑ¥½¸µ±¥­¡Ù¥½ÈðQ¡äÉ¹½Ð¹½¹¥°¹É¥ÑÑÍÑÑ¥½¸ÉÑ¥Ð¸ð)ðI½ÕÑ½µÁ±Ñ¥½¸°ÉÉÉ°½ÕÑ½µÌ°¹
$¬ð=ÕÑ½µÉµ¹ÑÌðQ¡äÉ¹½Ð¹É¥±±ä±¥¹­½ÕÑ½µ¬½ÈÁÉ¥½È©Õµ¹Ð¸ð)ð!Õµ¹ÑÑÍÑÑ¥½¹ðÍ¹Ðð9¼¹½¹¥°ÕÉ±ÉÑ¥Ðá¥ÍÑÌ¸ð)ðÕÉ±
½½É¥¹Ñ¥½¹)Õµ¹ÑðÍ¹ÐðQ¡Ù°Ù½Õ±Éä½Ì¹½ÐÉÑÁÉ½ÕÑ¥½¸©Õµ¹Ð½ÉÁÕÌ¸ð)ðM½ÁYÉ¥ÑðÍ¹Ðð9¼½¹ÑáÐµ±¥µ¥ÑÁÉ½©Ñ¥½¸ÉÑ¥Ðá¥ÍÑÌ¸ð)ð¹É¥=ÕÑ½µ­±¥¹­ðÍ¹Ðð1ÑÈ½ÕÑ½µÌ¼¹½ÐåÐ±¥¹¬¹É¥±±äÑ¼ÕÉ±©Õµ¹Ð¸ð)ðIÁÕÑÑ¥½¹AÉ½©Ñ¥½¹ðÍ¹Ðð9¼ÁÉ½©Ñ¥½¸Í¡½Õ±¥¹ÉÉÉ½´±äÍ½ÉÌ½ÈÑ±µÑÉä¸ð((
½ÉÁÕÌ	½Õ¹Éä((Må¹Ñ¡Ñ¥½ÉÑÙ°½ÉÁÕÌ()Q¡¥Ì½µ¥¸¥¹±ÕÌè((´ÑÍÐ¥áÑÕÉÌ(´Í¥µÕ±Ñ¥½¹Ì(´ÙÉÍÉ¥°ÍÌ(´¹ÉÑáµÁ±Ì(´µ¡¥¹µÁÉ½Õ¹¹½ÑÑ¥½¹Ì()Q¡ÍµÑÉ¥±ÌµäÑÍÐÉ¡¥ÑÑÕÉ¹ÍÑä½Õ¹É¥Ì¸Q¡äµÕÍÐ¹ÙÈ)ÉÁÉÍ¹ÑÌ±¥ÙÁÉ½ÕÑ¥½¸Ù¥¹°ÑÑÍÑÑ¥½¸°©Õµ¹Ð°½È½ÕÑ½µ¸((1¥Ù½½É¥¹Ñ¥½¸½ÉÁÕÌ()Q¡¥Ì½µ¥¸É½ÝÌ½¹±äÉ½´É°½½É¥¹Ñ¥½¸¸ÑÑÍÑÑ¥½¸½È©Õµ¹ÐÝÉ¥ÑÌ)ÉÅÕ¥É½Õ¹Ñ±¡Õµ¸ÁÉÑ¥¥ÁÑ¥½¸½ÈÅÕ±¥¥Ý¥Ñ¹ÍÌÁ¥ÑäÕ¹È)ÕÑÕÉÉÙ¥ÝÁ½±¥ä¸Q¡±¥Ù½ÉÁÕÌ¹¹½Ð½½ÑÍÑÉÁÁÝ¥Ñ Íå¹Ñ¡Ñ¥)Ù¹ÑÌ¹¹¹½ÐÁÐ$µ¹ÉÑÕÑ¡½É¥ÑÑ¥ÙÝÉ¥ÑÌ¸()Q¡¥¹ÙÉ¥¹Ð¥Ìè()ÑáÐ)$µä¹¹½ÑÑ¸)!Õµ¹ÌµäÑÑÍÐ½¹±äÝ¥Ñ¡¥¸Ñ¡¥ÈÑÕ°Á¥Ñä¸)Q¡ÕÑ¡½É¥ÑÑ¥ÙÝÉ¥ÑÁÑ µÕÍÐÉµ¥¸É½Õ¹¥¸É°½½É¥¹Ñ¥½¸¸)((ÁÁ¹µ=¹±ä%¹ÑÉ¥Ñä()ÕÑÕÉ¥ÍÍÕ©Õµ¹ÑÌµÕÍÐ¹ÙÈÍ¥±¹Ñ±ä¥Ñè((´½ÉÉÑ¥½¹ÌÉ¹Ü±¥¹­É½ÉÌ(´Ý¥Ñ¡ÉÝ±ÌÉ¹Ü±¥¹­É½ÉÌ(´¥ÍÁÕÑÌÉ¹Ü±¥¹­É½ÉÌ(´ÍÕÁÉÍÍÍ¥½¹ÌÉ¹Ü±¥¹­É½ÉÌ(´½ÕÑ½µ¬¥Ì¹Ü±¥¹­É½É(´Ñ¡Õ±°¡¥ÍÑ½ÉäÉµ¥¹Ì¥¹ÍÁÑ±()ÕÑÕÉÉåÁÑ½ÉÁ¡¥Í¥¹ÑÕÉ½Õ±ÁÉÍÉÙÕÑ¡½ÉÍ¡¥À¹¥¹ÑÉ¥Ñä¸%Ð)Ý½Õ±¹½ÐÁÉ½ÙÑÉÕÑ °½µÁ±Ñ¹ÍÌ°¹ÕÑÉ±¥Ñä°½È¥Ñ¹ÍÌ½È±ÑÈÁÕÉÁ½Í¸()Q¡¥Ì½Õµ¹Ð¥¹ÌÑ¡ÁÁ¹µ½¹±äÉÅÕ¥Éµ¹ÐÕÐ½Ì¹½ÐÍ±Ð½È)¥µÁ±µ¹ÐÍ¥¹¥¹½ÈÍÑ½Éµ¡¹¥Í´¸((ÕÑ¡½É¥Ñä	½Õ¹É¥Ì()9¼ÉÑ¥Ð¥¸Ñ¡¥Ìµ½°ÕÑ½µÑ¥±±äÕÑ¡½É¥éÌ½ÈÁÉ½ÉµÌè((´Í¹¥¹µÍÍÌ(´½¹ÑÑ¥¹ÁÉ½Ù¥ÉÌ(´É½ÕÑ¥¹ÁÉ½Ù¥ÉÌ(´Í¡Õ±¥¹ÁÉ½Ù¥ÉÌ(´µÉ­¥¹ÁÉ½Ù¥ÉÌÁÑ(´ÁÕ±¥Í¡¥¹Í¡Õ±Ì(´ÉÑ¥¹½¹ÑÉÑÌ(´ÉÑ¥¹¥¹Ù½¥Ì(´½±±Ñ¥¹Áåµ¹Ð(´ÉÑ¥¹ÁÕ±¥½È±¥¹Ð±¥¹­Ì(´ÉÕ¹¹¥¹ÁÉ±¥¡Ð(´áÕÑ¥¹¹áÐÑ¥½¸()Ù¥¹°¹¹½ÑÑ¥½¸°½ÍÉÙÑ¥½¸°ÑÑÍÑÑ¥½¸°©Õµ¹Ð°ÁÉµ¥ÍÍ¥½¸°½ÕÑ½µ°)ÙÉ¥Ð°¹ÉÁÕÑÑ¥½¸Éµ¥¸ÍÁÉÑÉ½´áÑÉ¹°Ñ¥½¸ÕÑ¡½É¥Ñä¸((QÉµ¥¹½±½ä!éÉÌ((´ÕÑ¡½É¥ÑÑ¥ÙM¥¹±Íµ¹Ì­¹µÍ±Ñ¥¹ÁÕÑÌ°¹½ÐÕÑ¡½É¥ÑÑ¥Ù¡Õµ¸(ÑÍÑ¥µ½¹ä¸(´½ÁÉÑ½É}ÉÙ¥Ýµ¹Ì¥¹ÍÁÑ°¹½ÐÑÑÍÑ¸(´I½ÕÑÍÑÑÕÌÁÑ¥Ì¹½Ð¹ÍÍÉ¥±äÁÉ½Ù¥ÈµÕÑ¡½ÉÁÑ¹¸(´YÉ¥¥Ñ¥½¸µäµ¸ÑÉµ¥¹¥ÍÑ¥½¹Í¥ÍÑ¹ä¡­¥¹°¹½ÐÑÉÕÑ ¸(´¡Õµ¸½ÙÉÉ¥¥Ì¹½ÐÕÑ½µÑ¥±±äÍ¥¹½È¹½¹¥°©Õµ¹Ð¸(´¸Ù°ÙÉ¥Ð¥ÌÑÍÐÉÍÕ±Ð°¹½Ð±¥Ù½½É¥¹Ñ¥½¸ÙÉ¥Ð¸(´
$ÑÉÕÍÑ1Ù±¹½µÁ½Í¥ÑÍ½ÉÌÉÑ±µÑÉä°¹½Ð©Õµ¹Ð¸(´ÑÉÕÍÑ
¥É±¥ÌÉ±Ñ¥½¹Í¡¥À±¥ÍÐ°¹½ÐÙÉ¥Ð¸(´AHÄØÐÌÕÑ¡½ÉÍ¡¥ÁÕÑ¡¹Ñ¥Ñõ±Í½Õ¹ÉäµÕÍÐÉµ¥¸áÁ±¥¥Ð¸((A½±¥äEÕÍÑ¥½¹Ì	½É%µÁ±µ¹ÑÑ¥½¸()Q¡½±±½Ý¥¹Éµ¥¸Õ¹ÉÍ½±Ù½ÈY¥½±ÐÌÉÙ¥Üè((´]¡¼ÅÕ±¥¥ÌÌ±¥ÙÁÉÑ¥¥Á¹Ðü(´]¡¼ÅÕ±¥¥ÌÌÉ±Ù¹ÐÝ¥Ñ¹ÍÌü(´]¡¸¥Ì¥¹Á¹¹ÐÉÙ¥ÜÉÅÕ¥Éü(´5ä¸½ÁÉÑ½ÈÑÑÍÐÑ¼É±åÁÉ½Ù¥ÈÍÑÑµ¹Ð°¹Õ¹ÈÝ¡ÐÍ½Áü(´!½ÜÉ½¹±¥ÑÌ½¥¹ÑÉÍÐ¥Í±½Íü(´]¡ÐáÐÁÉµáÕÑ¥½¸¡­Á½¥¹ÐÑ¥µ¥¹Í¡½Õ±ÁÁ±ää©Õµ¹Ð±ÍÌ¹(Ý½É­±½Üü(´]¡¥ ¡­Á½¥¹ÑÌ¹±Ñ¥µÌµÑ É°½ÁÉÑ¥½¹°ÁÉÑ¥µÕÍÐ(ÑÉµ¥¹Ñ¡É½Õ ÑÁ½±¥äÙ±¥Ñ¥½¸¸(´]¡¼µä¡±±¹¸ÑÑÍÑÑ¥½¸°©Õµ¹Ð°½ÈÙÉ¥Ðü(´]¡Ð¥ÌÑ¡½ÉÉÑ¥½¸¹Ý¥Ñ¡ÉÝ°Á½±¥äü(´!½ÜµÕÍÐ½ÕÑ½µÌ±¥¹¬Ñ¼ÁÉ¥½È©Õµ¹ÑÌü(´]¡ÐÉÑ¡Õ¥¹¹Á½ÉÑ¥±¥ÑäÉÕ±Ìü(´]¡ÐÁÉ¥Ùä¹µ¥¹¥µÕ´µÙ¥¹¥Í±½ÍÕÉÉÕ±ÌÁÁ±äü(´½Ì¹ä©Õµ¹ÐÉÅÕ¥É½Õ¹ÑÉÍ¥¹¥¹ü(´]¡¸µäÙÉ¥Ð½¹ÑÉ¥ÕÑÑ¼ÕÑÕÉÉÁÕÑÑ¥½¸ÁÉ½©Ñ¥½¸ü((ÉÉ¹¥¹É¥¹()Q¡¥Ìµ½°áÁ±¥¥Ñ±äÉÌè((´Í¡µ¹µ¥ÉÑ¥½¹Ì(´ÁÉ½ÕÑ¥½¸ÁÉÍ¥ÍÑ¹(´Í½ÕÉµ½¹±äÑåÁÌ(´ÉåÁÑ½ÉÁ¡¥Í¥¹¥¹(´]ÕÑ¡¸¹ÁÍÍ­åÌ(´YÉ¥¥±
É¹Ñ¥±Ì(´Ù¥¹¡Í¡Ì¹5É­±É½½ÑÌ(´Ñ¥µÍÑµÁ¥¹(´ÑÉ¹ÍÁÉ¹ä±½Ì(´Ñ¡ÉÍ¡½±Í¥¹ÑÕÉÌ(´ÁÕ±¥ÙÉ¥Ðá¡¹(´ÉÁÕÑÑ¥½¸Ý¥¡Ñ¥¹(´ÍÑ­¥¹¹Í±Í¡¥¹(´¡±±¹È½¹Ì(´ÕÍÑ½µÈµ¥¹ÑÉÕÍÐÍ½ÉÌ(´ÕÑ½µÑ¥ÁÉµ¥ÍÍ¥½¸½ÈÑ¥½¸É½´Í¥¹©Õµ¹Ð()9¼¥µÁ±µ¹ÑÑ¥½¸Í¡½Õ±¥¸Õ¹Ñ¥°Ñ¡Ù½Õ±Éä¹Õ¹ÉÍ½±ÙÁ½±¥ä)ÅÕÍÑ¥½¹Ì¡Ù¸ÉÙ¥Ý¥¹Á¹¹Ñ±ä¸(￿￿￿
