# Blind Neutral Action Boundary Evaluation

This directory extends the frozen neutral action boundary evaluator with
unseen synthetic requests from domains unrelated to the public incident.

## Separation

- `cases.ts` contains 32 unlabeled requests in 16 near-match pairs.
- `runner.ts` imports the cases and frozen evaluator, but not the answer key.
- `answer-key.ts` contains expected outcomes separately.
- `scorer.ts` joins decisions to the answer key only after evaluation.
- `report.ts` preserves all false positives, false negatives, and other
  outcome mismatches.

The evaluator in the parent directory is unchanged.

## Limits

- The cases and answer key are author-generated, not independently labeled.
- Module separation prevents the runner from reading labels but does not
  constitute third-party blinding.
- All actions are synthetic and offline. Nothing is executed.
- No result proves real-world incident prevention or production enforcement.
- A permitting outcome still requires a separate human action decision.

## Run

```powershell
npx.cmd tsx --test server\evals\neutral-action-boundary\blind\blind-eval.test.ts
```

Render the scored report:

```powershell
npx.cmd tsx -e "import { renderBlindEvalReport } from './server/evals/neutral-action-boundary/blind/report.ts'; process.stdout.write(renderBlindEvalReport());"
```
