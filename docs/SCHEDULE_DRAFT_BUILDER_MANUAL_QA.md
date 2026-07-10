# Schedule Draft Builder Manual QA

This checklist is the manual release gate for the private scheduling intelligence in PR #161.

It verifies that source evidence becomes operator-reviewable schedule state without inventing facts or creating external action authority. It does not authorize Gmail ingestion, sending, public links, contracts, payments, provider acceptance, preflight, or AI execution.

## Current Integration Boundary

The five evidence fixtures exercise the private source reducer in `shared/schedulingEvidence.ts`. They do not, by themselves, prove that every reduced field is visible in Schedule Draft Builder.

The browser pass below is required. If the visible builder disagrees with a fixture, hides a blocking question, or presents an unresolved schedule as final, record a failure and stop. Do not reinterpret a source-test pass as a UI pass.

## Preconditions

1. Use a disposable local preview database and the local-only demo operator.
2. Start the backend:

   ```powershell
   npm run dev:server
   ```

3. Start the client in a second terminal. If the backend uses port `5001`, set the proxy target first:

   ```powershell
   $env:VITE_API_PROXY_TARGET="http://localhost:5001"
   npm run dev:client
   ```

4. Open `http://localhost:5173/admin/briarwood-demo`.
5. Open a private schedule draft in Schedule Draft Builder.
6. Keep the fixture source private. Do not paste real email addresses, phone numbers, private links, or unredacted client data into screenshots or public notes.

## Automated Baseline

Run these before the browser pass:

```powershell
npx.cmd tsx --test server\production-scheduling-evidence.characterization.test.ts
npx.cmd tsx --test server\production-scheduling-intelligence.test.ts
npx.cmd tsx --test server\production-scheduling-intelligence.characterization.test.ts
```

Expected result: all tests pass. A passing baseline is necessary but not sufficient for manual approval.

## Recording Results

For each fixture, record:

- `PASS`, `FAIL`, or `BLOCKED`
- extracted people and services
- optional, removed, and quote-only state
- missing-variable questions
- warnings and conflicts
- day and location context
- whether preview generation was correctly allowed or withheld
- any operator correction needed

Do not save a real client-facing schedule during this pass.

## Fixture 1: Readiness-Correction Thread

Use the private readiness-correction thread fixture. Enter the thread in chronological order, including the final planner correction.

Verify:

- The primary client, family members, roles, and stated services are extracted once.
- The final planner message is treated as the current hard readiness evidence.
- The person-specific `12:30 PM` completion requirement remains distinct from the later general family-ready window.
- The proposed makeup block that ends after the hard completion time produces a conflict warning.
- The warning explains what conflicts and asks for an earlier block or another artist.
- Flower-girl hair remains hair-only with its stated duration.
- No touchup is invented.
- The candidate schedule is not presented as valid while the conflict remains.

Fail if the builder silently accepts the conflicting schedule, drops the final correction, or invents a service.

## Fixture 2: Large-Party Correction Thread

Use the private large-party fixture with its original roster, separate-room request, later removal, ready-time correction, and missing-person correction.

Verify:

- Repeated names are deduplicated.
- The later correction removes the superseded person from current schedule state.
- The separate-room hair service remains separate-room and end-of-schedule evidence.
- The missing original roster member is restored once, not duplicated.
- Early-placement preference remains guidance, not a hard invented time.
- The primary client has a hard `12:30 PM` ready time.
- The rest of the group preserves both preferred and latest ready times.
- Arrival-before-setup guidance does not become a service block.
- The candidate schedule warns about a late primary-client finish, a missing confirmed person, a removed person still present, or a separate-room placement error when each defect is present.

Fail if a removed person remains confirmed, a separate-room service silently moves into the main suite, or arrival guidance becomes a fake block or buffer.

## Fixture 3: Highlighted Spreadsheet / Cost Summary

Use the normalized private spreadsheet fixture. Treat highlight state and row type as evidence supplied by the workbook reader; this PR does not add a workbook upload surface.

Verify:

- Only selected or highlighted service rows become active schedule candidates.
- Hotel, subtotal, total, and cost-only rows never become people or service blocks.
- Trial, Friday, and Saturday remain separate day contexts.
- The builder asks which day is being scheduled when no day is selected.
- Unselected additions remain candidate additions and trigger an inclusion question.
- A later addition that overlaps an existing person's service produces a review warning instead of a duplicate block.
- Pricing metadata remains separate from schedule timing.
- The builder still asks for artists, lead assignment, per-artist durations, and the fixed primary-client block when those variables are missing.

Fail if every spreadsheet row is scheduled, billing rows become services, or one person receives the same service twice without review.

## Fixture 4: Count-Only Planner Request

Use the private count-only fixture with an event name, ready time, artist count, location, and `primary client + guests` count but no named service roster.

Verify:

- The primary client is identified without inventing guest names.
- The total person/service count and artist count are preserved.
- Venue and getting-ready location remain distinct.
- The ready time is treated as a hard finish.
- An external document reference is not fetched or treated as source-of-truth content.
- The builder asks for names, service mix, lead artist, artist capabilities, per-artist durations, and any fixed primary-client block.
- A placeholder schedule is offered only as an explicit operator choice.
- Any placeholder output says: `Working schedule using placeholders - final names/services needed.`
- Placeholder people do not become confirmed client records.

Fail if the builder invents a final roster, assumes all guests receive the same service, or presents placeholder output as final.

## Fixture 5: Multi-Day Evolving Thread

Use the private multi-day fixture with welcome-party and wedding-day messages, repeated quoted content, later additions, a later-start person, a separate-room elder, and quote-only weather-dependent touchups.

Verify:

- Friday and Saturday evidence remain separate.
- Repeated quoted roster content does not duplicate people or services.
- The later Friday addition changes the count and creates a count-review warning.
- The corrected Friday start remains a question until its meaning is confirmed.
- The corrected ready time asks whether it applies to the primary client or the full group.
- Weather-dependent touchups remain quote-only until a fixed time and duration are approved.
- The later-start person retains the stated time and after-primary placement constraint.
- The separate-room elder remains a confirmed later addition with hair and makeup, location context, and an assignment question.
- The blowout remains a scope question until the operator decides whether it is included in primary-client timing.
- Missing service detail prevents a final named schedule.

Fail if days are merged, repeated content duplicates the roster, quote-only touchups become blocks, or the separate-room addition disappears.

## Shared Preview Checks

Only continue to preview after the fixture-specific blocking questions and conflicts are resolved or explicitly left as a non-final scenario.

Verify:

- Artist columns are horizontal and independent.
- Every block contains its own time, person, and service.
- Visual rows do not force shared times between artists.
- Per-artist service durations are reflected.
- The fixed primary-client block and ready time are preserved.
- One person never receives overlapping hair and makeup.
- One artist never has overlapping blocks.
- Optional people stay out unless explicitly included.
- Removed people stay out.
- Quote-only items stay outside the schedule.
- No artist, service, gap, buffer, touchup, location, or relationship is invented.
- Warnings describe real conflicts and do not claim approval or readiness.
- Output is called final or client-ready only when names, services, timing, staffing, and blocking constraints are resolved.

## Safety Regression

Confirm the builder remains private draft infrastructure:

- no send or contact action
- no email or SMS action
- no public or client link
- no contract or invoice creation
- no payment or Square action
- no provider acceptance or preflight action
- no AI execution
- no automatic Gmail or document ingestion

## Exit Criteria

PR #161 stays draft until:

1. All five fixture classes pass automated characterization.
2. All five fixture classes have a recorded browser result.
3. Any `FAIL` or `BLOCKED` result is understood.
4. The visible schedule feels operator-authored rather than generically generated.
5. The safety regression remains clean.

Do not begin Gmail ingestion from this checklist. Read-only Gmail thread ingestion belongs in a separate, private, default-off slice after the scheduler and reducer pass this manual gate.
