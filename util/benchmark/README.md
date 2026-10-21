# Benchmarks

## Commands

| Command                                              | Use it to                                                  |
| ---------------------------------------------------- | ---------------------------------------------------------- |
| `pnpm run bench:check --case=a,b` or `--package=<p>` | compare the working tree with `HEAD` (agents: this only)   |
| `pnpm run bench:check --corpus --budget=30m`         | compare on the framework corpus (`bench:compare` is this)  |
| `pnpm run bench:profile --case=<name>`               | write a CPU profile of one process to `bench-results/`     |
| `pnpm run test:benchmark:simulation`                 | check that the decision rule keeps its error rates         |

`--base=<ref>` and `--candidate=<ref>` compare two revisions instead of `HEAD`
and the working tree. `--budget=<90s|5m>` is shared equally by the cases
(default `2m`). `--pin-core=<n>` reduces scheduler noise. `--json` prints one
line per case. `--keep` leaves the worktrees for inspection. `--seed=<value>`
replays a block schedule; each run draws its own seed otherwise.

The working tree is snapshotted with a private index, so untracked files are
included while your index and branch are untouched. Both sides run the harness
from the current checkout, so a new case also runs on the base revision.

## Measurement

A block runs one fresh child process per side, in a balanced order: the
baseline goes first in half the blocks. Each child takes two endpoints:

- **runtime**: the median of 10 timed samples, after warm-up of at least 3
  passes and 500 ms. A sample is the mean pass time over enough passes to last
  at least 50 ms, so a fast case is not timed at the resolution of the
  scheduler;
- **cold start**: the time from the process start to the end of the first pass,
  which includes module loading and cold caches.

The child also returns the output hash of each file. Block 1 must produce the
same hashes on both sides, or the case stops with `output changed` (unless
`--allow-output-change`).

## Verdict

Each endpoint is decided separately on log ratios from a balanced 2×2
crossover fit (treatment and process-order effects):

1. If the 95% interval of the order effect is not inside ±ln(1.05), the
   endpoint is `inconclusive`: a process-order interaction blocks it.
2. `regression` when the 99% interval lies above the 1.10 margin.
3. `improvement` when it lies below 1/1.10.
4. `no-meaningful-change` when the 98% interval lies inside [1/1.10, 1.10].
5. Otherwise `inconclusive`.

The case verdict combines the two endpoints. Either endpoint regressing makes
it `regression`, and either improving makes it `improvement`. It is
`no-meaningful-change` only when both endpoints are within the margin.

The run looks after every pair from block 4 on, and stops at the first look
where both endpoints have decided. It also stops at 20 blocks, at the time
budget, or at an output mismatch. Repeated looks inflate the error of each one,
so the stricter 99% and 98% levels are used, as in Pocock's group-sequential
design.

A precise 1.01 ratio is `no-meaningful-change`, even when it is statistically
slower. The table reports the ratio, its interval, the verdict and a reason:

| Reason                                              | Meaning                                              |
| --------------------------------------------------- | ---------------------------------------------------- |
| `runtime slower beyond the margin`                  | regression on the runtime endpoint (or the cold start) |
| `cold start faster beyond the margin`               | improvement on the cold start endpoint               |
| `within the margin`                                 | both endpoints are inside the margin                 |
| `time budget reached`                               | the budget, not the noise, ended the run; rerun with a larger budget |
| `output changed: <case>`                            | the two sides produced different CSS                 |
| `noise is too large to rule out a meaningful change` | all blocks were used and an interval still spans the margin |

## Limits

- The margin is relative to the whole case. A case that runs several plugins
  dilutes a change in one of them, so choose the narrowest case.
- Results are advisory. They are not a regression gate, and a result inside the
  margin is not a finding.
- The calibration assumes independent blocks. Autocorrelated noise is reported
  by `test:benchmark:simulation` but has no error band, so its verdicts are not
  calibrated.
- The cold start is one sample per process and is noisier than the runtime, so
  it often needs more blocks.
- Every run installs dependencies in two worktrees, which takes minutes. Every
  run also takes its minimum number of blocks: `--budget` only stops more pairs
  from starting, so a shell `timeout` does not shorten a run.

## Files

- `bench.js`: the driver, block loop, verdict table and `results.json`.
- `child.js`: one fresh process; prints one JSON line on stdout.
- `stats.js`: the crossover fit, the decision rule and the balanced schedule.
- `distributions.js`: normal and Student t quantiles.
- `worktrees.js`: the working-tree snapshot and the two temporary worktrees.
- `simulation.js`: the calibration of the decision rule on synthetic log ratios.
- `analyze-cpuprofile.js`: summarises a profile from `bench:profile`.
- `cases/`: the focused case inputs, keyed by name.
- `reports/`: notes kept from earlier investigations.

Raw results are written to `bench-results/<timestamp>/results.json`, which is
git-ignored. It records both revisions, the seed, and every block.
