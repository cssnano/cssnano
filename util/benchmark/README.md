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
  95% stratified bootstrap interval for the runtime ratio.
- `practicalConclusion` is `within-margin`, `outside-margin`, or
  `inconclusive`, based on a 90% interval and the declared practical margin.
- `overallVerdict` is conservatively derived from those fields, structural
  validity, order interaction, and the requested precision check.

An interval spanning a ratio of 1 is statistically inconclusive. A precise
ratio such as 1.01 may be within the declared 10% margin; a noisy ratio of
1.00 remains inconclusive. Reports say “within the declared 10% margin,” never
“the same.”

The conservative verdict matrix is:

| Structural/process validity | Blocks | Precision | Order interaction | TOTAL direction | Runtime margin | Overall verdict |
| --- | --- | --- | --- | --- | --- | --- |
| invalid | any | any | any | any | any | `inconclusive` |
| valid | below `minimumBlocks` | any | any | any | any | `inconclusive` |
| valid | below `requestedBlocks` | any | any | any | any | `inconclusive` |
| valid | requested or more | not achieved | any | any | any | `inconclusive` |
| valid | requested or more | achieved | above threshold | any | any | `inconclusive` |
| valid | requested or more | achieved | stable | `faster` | any | `improvement` |
| valid | requested or more | achieved | stable | `slower` | lower bound above margin | `regression` |
| valid | requested or more | achieved | stable | `slower` | otherwise | `inconclusive` |

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

The v3 artifact also records raw samples, the complete balanced schedule,
decision parameters, analyzer version, resampling seed, source and harness
hashes, lockfile and corpus hashes, runtime details, and dirty paths. Old v1
and v2 snapshots remain readable for legacy analysis only; missing v3
parameters are never supplied from analyzer defaults.

Every successful block observation must include the declared acquisition
configuration, side-specific provenance, raw samples for every selected corpus
entry, and its SHA-256 output hash. If a child process fails, the coordinator
still records both exit statuses; the failed side may have null provenance and
no observation, and the analyzer reports a structural failure.

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

The CLI exits 0 when it writes a report, including an inconclusive report. It
exits nonzero for an invalid artifact, execution failure, or correctness
mismatch. Performance conclusions never cause a nonzero exit; a future
`--policy=gate` mode must be explicitly introduced before changing that rule.

Rollout is intentionally staged: land provenance first; then land balanced
orchestration; then land the pure analyzer and simulation suite; compare old
and new analyses side by side for several performance changes; keep CI
advisory until calibration targets are met; and only then consider a separate
`--policy=gate` mode with documented exit codes.
