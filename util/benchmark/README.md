# Benchmark comparisons

cssnano benchmark comparisons are comparative-reporting evidence. They are
advisory and are not regression gates. The primary estimand is the
candidate/base runtime ratio for one complete pass over the fixed selected
corpus. `TOTAL` is the sole primary endpoint; per-file timings and memory are
exploratory and cannot fail the primary conclusion.

The independent unit is a paired fresh-process block. Each block runs one
baseline process and one candidate process, with process order balanced across
blocks. Warmup is outside measurement. A measured sample is one complete pass
over the selected corpus, and output hashing happens after the timing interval.

The report has separate decisions:

- `statisticalDirection` is `faster`, `slower`, or `inconclusive`, based on a
  95% Student's t interval from the balanced 2x2 crossover model on log runtime
  ratios.
- `practicalConclusion` is `within-margin`, `outside-margin`, or
  `inconclusive`, based on a 90% interval and the declared practical margin.
- `overallVerdict` is conservatively derived from those fields, structural
  validity, order interaction, and the requested precision check.

The report also records a verdict basis that separates the observed signal
from readiness criteria: `direction`, `precision` (`achieved` or
`not-achieved`), `order` (`stable` or above threshold), and whether enough
blocks were measured. An inconclusive verdict with a clear direction is
therefore reported as inconclusive-with-signal, not as absence of signal.

An interval spanning a ratio of 1 is statistically inconclusive. A precise
ratio such as 1.01 may be within the declared 10% margin; a noisy ratio of
1.00 remains inconclusive. Reports say “within the declared 10% margin,” never
“the same.”

The conservative verdict matrix is:

| Structural/process validity | Blocks | Precision | Order interaction | TOTAL direction | Runtime margin | Overall verdict |
| --- | --- | --- | --- | --- | --- | --- |
| invalid | any | any | any | any | any | `inconclusive` |
| valid | below `minimumBlocks` | any | any | any | any | `inconclusive` |
| valid | `minimumBlocks` or more | not achieved | any | any | any | `inconclusive` |
| valid | `minimumBlocks` or more | achieved | above threshold | any | any | `inconclusive` |
| valid | `minimumBlocks` or more | achieved | stable | `faster` | any | `improvement` |
| valid | `minimumBlocks` or more | achieved | stable | `slower` | lower bound above margin | `regression` |
| valid | `minimumBlocks` or more | achieved | stable | `slower` | otherwise | `inconclusive` |

`requestedBlocks` is an upper bound on the scheduled blocks, not a readiness
requirement: an adaptive comparison may stop earlier once the requested
precision is met, and the verdict stays substantive as long as at least
`minimumBlocks` blocks were measured and the precision target was reached.

The practical interval is reported independently: entirely inside the
practical margin is `within-margin`, entirely outside is `outside-margin`, and
all other intervals are `inconclusive`. Thus a precise 1.01 ratio can be
within margin without being an improvement or regression, while a noisy
distribution centered at 1.00 remains inconclusive.

The defaults are named and recorded in every schema-v3 artifact:

```js
SUPERIORITY_CONFIDENCE_LEVEL = 0.95;
EQUIVALENCE_CONFIDENCE_LEVEL = 0.90;
RUNTIME_NON_REGRESSION_MARGIN = 1.1;
PRACTICAL_EQUIVALENCE_MARGIN = 1.1;
```

The reported order interaction is the estimated per-process period effect
`π`. The difference between the two sequence means is `2π`, so the configured
5% threshold is applied to `π`, not to the unscaled sequence difference.

The v3 artifact also records raw samples, the complete balanced schedule,
decision parameters, analyzer version, source and harness hashes, lockfile and
corpus hashes, runtime details, and dirty paths. The paired analyzer does not
resample blocks; legacy bootstrap options are retained only for the independent
snapshot comparison path. All snapshots and comparisons must use schema v3;
legacy v1 and v2 formats are not supported.

Every successful block observation must include the declared acquisition
configuration, side-specific provenance, raw samples for every selected corpus
entry, and its SHA-256 output hash. If a child process fails, the coordinator
still records both exit statuses; the failed side may have null provenance and
no observation, and the analyzer reports a structural failure.

## Running a comparison

`compare-revisions.mjs` drives the whole flow: preflight, smoke, matched
benchmarking, analysis, report writing, and cleanup.

```sh
node util/benchmark/compare-revisions.mjs \
  --base-revision=<sha> --candidate-revision=<sha> \
  --base-dir=<worktree> --candidate-dir=<worktree>
```

The coordinator defaults to a quiet child mode: each side's bench process is
suppressed to a single line per block, such as
`block 3/10: baseline 173 ms, candidate 129 ms`, and one final report. Pass
`--verbose-child` to stream full child output.

Phases and flags:

- **Preflight** (on by default; disable with `--no-preflight`) verifies that
  both revisions match their checkouts, that dependencies are installed, and
  that both sides share the same corpus. When corpora differ, it writes a
  common-corpus manifest into the results directory and prints the exact
  `--corpus-manifest=` command to rerun with. It then runs one quick smoke
  process per side, checks metadata compatibility (schema, target, seed,
  Node version, runtime flags), and compares output hashes. Intentional
  output changes are approved explicitly with
  `--allow-output-hash=<fixture,base,candidate>`; unapproved changes stop the
  comparison and the preflight prints the exact command to approve and rerun.
- **Adaptive benchmarking** is the stable-mode default and runs a pilot of
  `--pilot-blocks`; pass `--adaptive` explicitly for clarity or
  `--no-adaptive` to run a fixed block count. It keeps adding blocks only
  until the requested precision target is reached or the block cap is hit.
  Stopping is checked only after complete two-block pairs, and the artifact
  records `adaptiveStop`. Fixed comparisons also require an even `--blocks`
  count. Each pair contains one baseline-first and one candidate-first block,
  with a seed-derived randomized pair orientation.
- **Reports** are written by default as `comparison-report.json`, and the
  verdict with its basis is printed to the terminal. Pass `--markdown=<path>`
  to also write the report as Markdown; disable the report entirely with
  `--no-report`.
- **Cleanup** removes worktrees created for the comparison when possible. If
  removal fails (for example, read-only Git metadata), the coordinator prints
  the exact recovery command instead of claiming success, and
  `prepare-worktree.mjs --cleanup --destination=<path>` reports the
  same recovery command.

Corpus selection is shared with `bench.mjs`: `--only=<selector>` may be
repeated (each selector broadens the selection), and `--corpus-manifest=<path>`
pins an exact fixture list, which is how a preflight-detected corpus mismatch
is resolved. `bench.mjs` supports `--help` and `--list-cases`, and `--quiet`
suppresses its own progress output for coordinator-invoked runs.

The harness provenance hash covers only the injected benchmark harness files
under `util/benchmark/`. Workflow definitions and package scripts are
intentionally excluded from that hash, so changing them does not invalidate a
comparison.

Interpretation has practical limits: results describe this fixed corpus and
runtime environment, not every stylesheet or machine. Controlled runs should
use an idle AC-powered machine, a stable CPU governor, no concurrent builds,
and the same Node version. Rerun a surprising or inconclusive comparison with
those conditions and retain both raw artifacts.

Correctness or output mismatches are structural failures and stop performance
analysis. Fewer than the minimum number of blocks permits no conclusion, and
only the requested precision check permits a substantive verdict. The CI
workflow remains advisory while the procedure is calibrated; any future gate
must be a separately documented policy and exit-code mode.

The default inter-block cooldown is 100 ms; use `--cooldown-ms=0` only when a
deliberately back-to-back schedule is required. The child benchmark receives
the block index as `--run-index`, so corpus shuffling differs across blocks
while remaining identical between the two sides of each block.

The CLI exits 0 when it writes a report, including an inconclusive report. It
exits nonzero for an invalid artifact, execution failure, or correctness
mismatch. Performance conclusions never cause a nonzero exit; a future
`--policy=gate` mode must be explicitly introduced before changing that rule.

`statistical-simulation.mjs` reports both fixed-sample and adaptive-stopping
coverage. The adaptive result is a calibration diagnostic rather than an
assumption that optional stopping is harmless: skewed stress cases can show
under-coverage even when the fixed-sample t interval is well calibrated.
