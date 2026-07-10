# Schedule Draft Builder Manual QA Result

Date: 2026-07-09

PR: #161

Environment: local private demo, `demo-schedule-fairmont`

No draft was saved. No external action was taken.

## Fixture 1: Readiness-Correction Thread

Result: `PASS`

- Core roster extracted as five people.
- Seven proposed time blocks remained candidate blocks and did not become people.
- Person-specific hard readiness and group preferred/latest readiness remained distinct.
- Elizabeth's proposed makeup ending after the `12:30 PM` hard requirement produced a conflict warning with corrective guidance.
- Preview application remained blocked while the conflict was unresolved.
- No touchup was invented.

## Fixture 2: Large-Party Correction Thread

Result: `PASS`

- Ellen was removed from current people after the later correction.
- Phoebe remained present once and retained early-placement guidance.
- Lisa retained separate-room and end-placement evidence.
- Candidate schedule warnings surfaced the late primary-client finish, missing Phoebe, removed Ellen, Lisa's room mismatch, and Lisa's placement mismatch.
- Room evidence stayed scoped to Lisa and did not leak to other people in the correction message.

## Fixture 3: Highlighted Spreadsheet / Cost Summary

Result: `PASS`

- Browser verification used the documented normalized pipe-delimited spreadsheet contract.
- Highlighted service rows became active schedule candidates.
- Hotel and subtotal rows were ignored as non-service rows.
- Trial, Friday, and Saturday remained separate day options.
- Unselected additions remained behind an explicit include/exclude decision.
- Dana's overlapping addition produced a review warning instead of a duplicate service block.
- No workbook was uploaded or fetched.

## Fixture 4: Count-Only Planner Request

Result: `PASS`

- Hannah was identified as the bride without inventing guest names.
- Source count `9`, artist count `3`, ready time, venue, and getting-ready location were visible as structured state.
- The external reference remained evidence-only and was not fetched.
- Missing roster, services, lead, timings, and primary block remained explicit questions.
- Placeholders appeared only after the operator selected that option.
- Placeholder mode displayed `Working schedule using placeholders - final names/services needed.` and remained non-final.

## Fixture 5: Multi-Day Evolving Thread

Result: `PASS`

- Repeated Saturday roster content deduplicated to one person each.
- Friday welcome-party and Saturday wedding-day contexts remained distinct and selectable.
- Grandma remained a later confirmed hair-and-makeup addition with separate-room evidence.
- Kira retained later/after-bride placement and the `1:30 PM` start signal.
- Friday count change and Saturday count inconsistency remained visible warnings.
- Corrected-start, ready-time scope, separate-room assignment, blowout scope, and missing-service questions remained visible.
- Weather-dependent touchups remained quote-only.

## Shared Preview Checks

Result: `PASS`

- A clean fully specified roster produced three independent artist columns.
- Each block displayed its own person, service, start/end time, and duration.
- The primary client remained on the lead lane for a protected two-hour block.
- Hanan and Gehan remained adjacent by service and neither person was double-booked.
- No artist lane overlapped.
- No gap, buffer, touchup, or extra artist was invented.
- Applying the preview stayed disabled because the demo draft already contained manual rows.

## Safety Regression

Result: `PASS`

- Private draft and evidence-only language remained visible.
- No send, email, SMS, public/client link, contract, invoice, payment, Square, preflight, provider-acceptance, or AI action appeared.
- No request intake or preview state was saved.

## Decision

Manual browser QA passes. PR #161 can proceed to independent review, but remains draft until Violet explicitly changes its state.
