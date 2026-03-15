# Choreography Depth Index (CDI) -- Full Technical Spec

**Briarwood AI -- March 2026**

---

## What CDI Is

CDI is a behavioral trust scoring system that quantifies the "invisible labor" of coordination -- the untracked work of trust-building, timing, and emotional choreography that makes complex multi-party physical services succeed or fail.

It is not a single opaque number. It is a structured trust model composed of multiple signal families, where different product surfaces use different weightings of the same underlying signals.

**Core insight:** The highest-trust service operators do not work through structured data entry. Their business logic exists inside email threads, calendar blocks, informal referrals, ad hoc decisions, and private client relationships. CDI is designed to extract structured trust signals from that unstructured coordination behavior.

---

## The Three Dimensions (Current Implementation)

CDI currently scores across three weighted dimensions:

### 1. Emotional Fidelity (40% weight)

Preservation of tone, timing, and emotional logic throughout coordination.

**Components measured:**
- Response time consistency (not just speed -- consistency matters more)
- Tone alignment (professional vs casual, anxious vs confident)
- Emotional signal preservation across role transitions
- Timing sensitivity (recognizing when urgency matters)

**Scoring method:** Cosine similarity on embedding vectors for tone/nuance preservation.

### 2. Choreography Awareness (30% weight)

Recognition of role-specific transitions and multi-party coordination patterns.

**Components measured:**
- Role transition quality (when client needs planner intervention)
- Coordination sequence integrity (right information at right time)
- Multi-party synchronization (keeping all actors aligned)
- Escalation pattern recognition (catching issues before they cascade)
- Schedule change detection (last-minute changes are high-weight signals)
- Day-of coordination (emergencies, delays, no-shows are critical events)

**Scoring method:** Pattern matching against validated coordination sequences.

**Domain-specific signal detection:**
- Schedule changes: "need to reschedule", "change the time", "different date"
- Last-minute changes: Within 48 hours of event, any change is HIGH priority
- Day-of emergencies: "running late", "can't make it", "emergency", "disaster"
- Trial feedback: "loved it", "needs tweaks", "not quite right", "want changes"
- Response delays: Time between messages matters -- slow responses increase distress

### 3. Role-Specific Recall (30% weight)

Accurate behavioral tracking tied to specific actors over time.

**Components measured:**
- Historical reliability patterns by provider
- Commitment signal strength by client type
- Communication style consistency
- Delivery quality track record

**Scoring method:** Longitudinal behavioral analysis.

**CDI Formula:** `(Fidelity x 0.4) + (Awareness x 0.3) + (Recall x 0.3)`

---

## The Six Signal Families (Spec-Level Design)

The product spec defines CDI at a higher level as six signal families that feed the three dimensions:

### A. Responsiveness
- Time to first response
- Time to follow-up
- Consistency of communication timing
- Responsiveness under high-load periods

### B. Coordination Reliability
- Proposal turnaround speed
- Contract completion rate
- Payment conversion rate
- Schedule delivery timeliness
- Drop-off rates across booking stages

### C. Referral Behavior
- Frequency of trusted referral usage
- Quality of counterparties selected
- Referral acceptance rate
- Referral completion rate
- Repeat trusted handoffs

### D. Recovery Behavior
- Cancellation handling
- Replacement speed
- Successful reroute rate
- Conflict resolution patterns
- Performance under compressed timelines

### E. Network Validation
- Repeated trust from other providers
- Inbound referral frequency
- Reciprocal trust signals
- Strength within service-specific clusters

### F. Outcome Quality Proxies
- Confirmed completion rate
- Rebooking / repeat relationship patterns
- Recovery-adjusted success rate
- Incomplete / failed workflow frequency

---

## Behavioral Event Types (Implemented)

The system currently tracks 20+ wedding-specific event types, each mapped to a dimension with a weight:

### Communication Events
| Event | Dimension | Weight |
|-------|-----------|--------|
| message_negative | emotional_fidelity | 0.2 |
| message_positive | emotional_fidelity | -0.1 |
| response_delay | emotional_fidelity | 0.15 |
| response_fast | emotional_fidelity | -0.05 |

### Payment Events
| Event | Dimension | Weight |
|-------|-----------|--------|
| payment_late | role_specific_recall | 0.25 |
| payment_failed | role_specific_recall | 0.3 |
| payment_on_time | role_specific_recall | -0.1 |
| deposit_missed | role_specific_recall | 0.35 |

### Booking / Scheduling Events
| Event | Dimension | Weight |
|-------|-----------|--------|
| schedule_change | choreography_awareness | 0.15 |
| schedule_change_last_minute | choreography_awareness | 0.4 |
| cancellation_request | choreography_awareness | 0.35 |

### Day-Of Events (High Urgency)
| Event | Dimension | Weight |
|-------|-----------|--------|
| day_of_emergency | choreography_awareness | 0.5 |
| day_of_delay | choreography_awareness | 0.3 |
| day_of_no_show | choreography_awareness | 0.8 |
| day_of_success | choreography_awareness | -0.2 |

### Trial / Preview Events
| Event | Dimension | Weight |
|-------|-----------|--------|
| trial_feedback_negative | emotional_fidelity | 0.2 |
| trial_feedback_positive | emotional_fidelity | -0.15 |
| trial_changes_requested | choreography_awareness | 0.1 |
| trial_changes_major | choreography_awareness | 0.25 |

### Escalation Events
| Event | Dimension | Weight |
|-------|-----------|--------|
| escalation | emotional_fidelity | 0.4 |
| support_case | emotional_fidelity | 0.35 |
| planner_intervention | choreography_awareness | 0.25 |

**Urgency amplification:** Events within 48 hours of the event date get 1.5x weight multiplier.

---

## HACO Decision Framework

CDI uses a Human-AI Complementarity Optimization (HACO) framework for each scoring decision:

- **intuition_aligned:** AI confirms human judgment (high confidence, >= delta threshold)
- **complementarity_activated:** AI adds insight humans missed (medium confidence)
- **observation_only:** Low confidence, just observing (below delta - epsilon)

Default thresholds:
- epsilon (error tolerance): 0.1
- delta (confidence threshold): 0.8

The overall HACO decision is:
- If all dimensions are `intuition_aligned` -> overall `intuition_aligned`
- If any dimension is `observation_only` -> overall `observation_only`
- Mixed case -> `complementarity_activated`

---

## Trust Levels

| Score Range | Trust Level |
|-------------|-------------|
| 90-100 | Exceptional |
| 70-89 | High |
| 50-69 | Moderate |
| 30-49 | Low |
| 0-29 | At Risk |

---

## Autonomy Gating (Agent API)

CDI scores gate what autonomous agents can do:

| CDI Range | Autonomy Level | Capabilities |
|-----------|---------------|-------------|
| 80-100 | Full | All actions including contracts and invoices |
| 50-79 | Conditional | Read + Write -- submit inquiries, place holds, read schedules |
| 0-49 | Restricted | Read-only -- availability, pricing, CDI lookup, artist discovery |

Complexity adjustments:
- Simple transactions: thresholds x 0.95 (slightly lower bar)
- Medium: thresholds x 1.0 (standard)
- Complex: thresholds x 1.05 (higher bar for high-stakes)

---

## The Four Scoring Components (Agent-Facing CDI)

The agent-facing scoring system uses four equally-weighted components (25% each):

### Responsiveness (25%)
Input: array of response times in minutes.
- <= 5 min avg = 100
- <= 15 min = 90 - (time - 5)
- <= 60 min = 80 - (time - 15) x 0.5
- <= 240 min = 55 - (time - 60) x 0.15
- Consistency bonus: std dev <= 5 = +10, <= 15 = +5, > 30 = -10

### Adaptability (25%)
Input: iterations to alignment + complexity level.
Expected iterations: simple=1, medium=2, complex=3.
- At or below expected = 100
- +1 over = 85
- +2 over = 70
- +3 over = 55
- Beyond = 40 - 5 per extra iteration

### Attention (25%)
Input: proactive ratio (0-1), attention signals (0-1), communication frequency.
- Base = proactiveRatio x 80
- Attention bonus = attentionSignals x 15
- Optimal comm frequency (2-4/hr) = +5
- Over-communicating (>6/hr) = -5 (may indicate stress)

### Reliability (25%)
Input: historical completion rate (0-100), stress indicators (0-1).
- Base = completion rate
- Stress penalty if > 0.5: -(stressIndicators - 0.5) x 20

**Temporal weighting:** Recent behavior (last 7 days) gets 5% bonus. Stale data gets 5% penalty.

---

## Data Schema

### Core Tables

**cdi_behavioral_events** -- every coordination signal
- userId, actorRole (client/artist/planner), targetUserId, targetRole
- eventCategory (communication/payment/booking/coordination/delivery)
- eventType (specific event within category)
- dimension (emotional_fidelity/choreography_awareness/role_specific_recall)
- signalStrength (-100 to +100, negative = trust erosion)
- responseLatencyMs (for timing-sensitive events)
- toneVector (embedding vector for emotional tone)
- metadata: evidenceText, contextualFactors, roleTransition, sequencePosition, expectedPattern, actualPattern

**cdi_dimension_scores** -- per-dimension scores
- dimension, score (0-100), confidence (0-100), hacoDecision
- components (sub-scores for each measured property)
- evidencePayload (array of contributing events)

**cdi_composite_scores** -- the final weighted score
- compositeScore (0-100), trustLevel, all three dimension scores, all three weights
- hacoOverallDecision, predictedSuccess, interventionRecommended, interventionReason

**cdi_feedback_events** -- evolutionary learning loop
- compositeScoreId, feedbackType (outcome/admin_override/planner_note/client_satisfaction)
- feedbackSource, outcomeSuccess, satisfactionScore
- originalPrediction, actualOutcome, learningSignal (-100 to +100)
- processed (boolean for learning run tracking)

**cdi_learning_runs** -- iteration tracking
- runType (scheduled/triggered/manual), dimension
- feedbackEventsProcessed, thresholdAdjustments (before/after for epsilon and delta)
- patternLibraryUpdates, accuracy (before/after/improvement), auditTrail

**cdi_pattern_library** -- validated coordination patterns
- patternName, patternCategory (role_transition/escalation/coordination_sequence)
- dimension, patternSequence, strength, validatedAt

**cdi_thresholds** -- admin-configurable policy
- epsilon, delta, dimension weights (emotionalFidelity/choreographyAwareness/roleSpecificRecall)
- isActive flag for A/B testing different threshold configurations

**cdi_admin_overrides** -- human correction loop
- insightId, originalDecision, overrideDecision, reason

---

## Context-Dependent Weighting

Different queries should use different signal weights. The system should not assume one universal score is always appropriate.

**Example:**
- "Best provider for routine overflow bridal makeup" emphasizes: coordination reliability, referral acceptance rate, historical completion
- "Best alternate for emergency same-day coordinator replacement" emphasizes: recovery behavior, responsiveness under high-load, crisis-use frequency, replacement speed

The weights are stored in cdi_thresholds and can be switched per query context. Current implementation supports dynamic weights fetched from storage with fallback to 40/30/30 defaults.

---

## Why Context-Dependent Scoring Is Architecturally Important

From Briarwood product spec Section 16:

> The system's long-term objective is not: "who exists?"
> It is: "who is most likely to preserve the outcome under current conditions?"

CDI is not a leaderboard. It is a routing optimization function where the optimization target changes based on the coordination context.

---

## Current Implementation Status

### Built and Running
- Three-dimension scoring engine (Emotional Fidelity, Choreography Awareness, Role-Specific Recall)
- Gemini AI-powered message analysis for real-time CDI scoring
- HACO decision framework per dimension
- 20+ wedding-specific behavioral event types with weighted signals
- Urgency amplification for last-minute events
- Dynamic weight configuration via admin thresholds
- Agent-facing CDI with four-component scoring (Responsiveness, Adaptability, Attention, Reliability)
- Autonomy gating for agent API access (Restricted/Conditional/Full)
- Temporal weighting (recency bonus/penalty)
- Complete PostgreSQL schema for events, scores, feedback, learning runs, pattern library

### Built But Not Yet Producing Data at Scale
- Feedback loop (cdi_feedback_events -> cdi_learning_runs)
- Pattern library matching
- Admin override learning

### Not Yet Built
- Cross-provider trust graph CDI (network-level scoring)
- Outcome-verified CDI (connecting CDI predictions to actual event outcomes)
- Learned model replacing hand-coded weights (see Engineering Note below)

---

## Engineering Note: CDI as Learned Model

**Reference:** Cheng Lou (@_chenglou), March 13 2026 -- replacing if-else heuristics with tiny neural nets trained on example traces.

### The argument

CDI currently uses hand-coded signal families with explicit weights. Responsiveness = time_to_first_response x weight + consistency x weight. This is the right starting architecture. But it should not stay as hand-weighted scores forever.

The behavioral judgment events and outcome records are training data for a learned trust model:
- When a provider chooses Kim over Sarah for a 5 AM recovery, that is a labeled example of trust-under-pressure
- When a referral leads to a completed event, that is a positive outcome trace
- When an admin overrides a CDI decision, that is a correction signal

### The Cheng Lou insight applied to CDI

1. **Offline verification:** Traces from the learned model can be verified against actual outcomes (did the event succeed? did the referral complete?). The outcome capture system does double duty as a verification layer.

2. **Emergent patterns:** The model may reveal trust signals you would never think to hand-code. Example: providers who reschedule within 20 minutes of a conflict may have 3x better recovery outcomes than those who wait an hour. That is not in any hand-coded heuristic.

3. **Optimization, not theorem proving:** CDI is routing optimization, not strict correctness. You need a good enough solution. An optimization problem is at least as hard as a SAT problem.

4. **Fallback strategy:** Fast pass with the learned model, fall back to structured signal families when data is sparse. Same as quicksort + heapsort -- use the fast path, detect pathological behavior, switch to guaranteed-runtime fallback.

### Architecture implication for Phase 1.5

The judgment events, outcome records, and behavioral signals should be stored in a format directly usable as training data. Not just logged for dashboards. The schema should support:
- Triggering context vector
- Selected action label
- Outcome label
- Confidence
- Timestamp
- Provider cluster tag

This is the dataset that eventually replaces the hand-coded weights.

---

## Open Questions

These should be resolved with engineering, not hand-waved:

1. **Data density:** What is the minimum number of behavioral events before CDI scoring becomes reliable for a given provider?

2. **Cold start:** How should new or low-activity providers be handled? Current default is 50 (neutral). Is that the right assumption?

3. **Gaming prevention:** How should the system prevent providers from artificially inflating behavioral signals? (e.g., sending fast but empty responses to boost responsiveness)

4. **Provider vs client quality:** How should provider coordination quality be separated from client behavior or external factors? A provider's CDI should not drop because they had a difficult client.

5. **One score vs many:** Should CDI ever be exposed as a single number, or should it always be presented as dimension-specific scores with context? The spec says different queries should use different weights -- but users and agents may want a simple number.

6. **Referral edge trust decay:** How should trust edges degrade over time if not reinforced? A provider you referred to 3 years ago but never since -- how much trust remains?

7. **Mutual vs one-way trust:** How should the system handle asymmetric trust relationships? Provider A refers to B frequently but B never refers back.

8. **When does the learned model take over?** At what data density (events per provider? providers in network? completed outcomes?) is it safe to start training a small model on the behavioral traces?

---

## Source Files

- `server/cdiEngine.ts` -- Three-dimension analysis engine, Gemini integration, behavioral event recording, HACO framework
- `server/cdiService.ts` -- Agent-facing CDI scoring (four components), autonomy gating, sample calculations
- `shared/schema.ts` -- All CDI database tables (behavioral_events, dimension_scores, composite_scores, feedback_events, learning_runs, pattern_library, thresholds, admin_overrides)
- `server/agentRoutes.ts` -- Agent API endpoints including CDI trust verification
