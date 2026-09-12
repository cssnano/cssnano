# postcss-merge-longhand Refactoring Ledger

**Date**: September 12, 2026
**Baseline revision**: `fa2bae2ba1164208742fe6533d7e4e72c51d0d95`
**Candidate revision**: `9a8f785834a0184fb80ce11953f924af4600ba47` plus the dirty worktree under test
**Corpus**: 21 files in `frameworks/*.css`
**Preset**: `default`

## Source and fixture records

The source LOC gate counts production JavaScript under
`packages/postcss-merge-longhand/src`. The final count is 4,421 lines,
12 lines below the 4,433-line baseline. The standalone 100-line
`borderSpacingReducer.js` is included in that total. The unified border
reducer itself is 921 lines (`19f02373c4740debbd556e815784f12b5bf0d8a7d8ffe3fc8457a8c6afe97c9c`).

There are 21 framework inputs and 21 default-preset integration fixtures.
Nine generated fixtures changed: three advanced-preset files and six
default-preset files. The aggregate SHA-256 of all default fixtures is
`d6f3c7992bbdb47f297da40487b30c8dd9aa9bda1c255754865fb0db7151a456` at the
baseline and `8e4591c7dc84849a0b1e293d57fad26f0e0dda6decfbd631a8a8804d59fce586`
for the final candidate.

The intentional fixture changes are canonical physical-border reductions:
shortest non-crossing side/component forms, lower-cased generated
shorthands, and preserved cascade barriers. No fixture change is treated as
generated noise.

## Benchmark evidence

Both sides used Node v24.18.1, `NODE_ENV=production`, the same 21-file
corpus, default preset, benchmark seed `cssnano-benchmark-v2`, stable mode,
two warmup samples, five measured samples, and five independent process
runs. The repository stable default of 100 measured samples was impractical
for this full corpus in the available execution window, so the explicit
2/5 settings are part of the recorded command and are identical for both
sides.

| Result | Median total |
| --- | ---: |
| Baseline | 1,935.80 ms |
| Candidate | 1,921.78 ms |
| Delta | -0.4% |
| 95% bootstrap interval | -3.7% to +0.7% |

The comparison is inconclusive: it does not establish a repeatable
performance change. The JSON snapshots and final comparison report are kept
in `bench-results/unified-border/`. Every stable run emitted both `TOTAL` and
`wrote` lines. A quick smoke run also completed successfully.

Reducer counters remain diagnostics only. Deleted-pass zeroes and
schema-mismatched counter comparisons are intentionally absent from this
ledger.

## Verification

- Focused border suite: 299 tests passed across 10 suites; all 14 package test files passed.
- Independent planner oracle: all 15 side masks and 7 component masks in
  normal and important lanes passed, including minimum serialized cost,
  deterministic tie order, and non-crossing footprint checks.
- Differential soak: 200,000 cases with seed 7 passed with no oracle mismatch.
- Preset integration fixtures were regenerated and reviewed.
- Generated declarations were checked with `pnpm run types`.
- Final lint, format, integration, and `git diff --check` results are recorded
  at handoff.
