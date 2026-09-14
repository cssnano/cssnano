import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  MODES,
  aggregateSnapshots,
  childRunArguments,
  main,
  processCorpus,
  resolveBenchmarkArgs,
  shuffleCorpus,
  summaryStatistics,
} from './bench.mjs';
import {
  bootstrapConfidenceInterval,
  clusteredTwoSampleBootstrapConfidenceInterval,
  compareSnapshots,
  loadSnapshot,
  pairedPercentChange,
  quantile,
  twoSampleBootstrapConfidenceInterval,
} from './compare-bench.mjs';
import { currentGitRevision } from './bench-provenance.mjs';

test('summary statistics and quantiles are deterministic', () => {
  assert.deepEqual(summaryStatistics([4, 1, 3, 2]), {
    n: 4,
    minMs: 1,
    medianMs: 2.5,
    meanMs: 2.5,
    p95Ms: 3.8499999999999996,
    maxMs: 4,
  });
});

test('corpus ordering is deterministic for a seed and replicate', () => {
  const corpus = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((name) => ({
    name,
  }));
  const first = shuffleCorpus(corpus, 'seed', 1).map(({ name }) => name);
  assert.deepEqual(
    shuffleCorpus(corpus, 'seed', 1).map(({ name }) => name),
    first
  );
  assert.notDeepEqual(
    shuffleCorpus(corpus, 'other', 1).map(({ name }) => name),
    first
  );
  assert.notDeepEqual(
    shuffleCorpus(corpus, 'seed', 2).map(({ name }) => name),
    first
  );
});

test('default and smoke configurations resolve to their reliability settings', () => {
  const defaults = resolveBenchmarkArgs([`--revision=${currentGitRevision()}`]);
  assert.equal(defaults.mode, 'stable');
  assert.equal(defaults.warmup, 20);
  assert.equal(defaults.iters, 100);
  assert.equal(defaults.runs, 5);
  assert.equal(resolveBenchmarkArgs(['--mode=quick', '--runs=1']).runs, 1);
  assert.deepEqual(MODES.quick, { warmup: 0, iters: 1, reliability: 'smoke' });
});

test('bootstrap intervals are deterministic', () => {
  const first = bootstrapConfidenceInterval([-12, -10, -8], 1000);
  assert.deepEqual(bootstrapConfidenceInterval([-12, -10, -8], 1000), first);
  assert.ok(first.low <= -10 && first.high >= -10);
});

test('total timing stops before output hashing', async () => {
  let clockCalls = 0;
  let hashClockCalls;
  const result = await processCorpus(
    [{ name: 'fixture', source: 'input' }],
    { process: async () => ({ css: 'output' }) },
    true,
    {
      now: () => ++clockCalls,
      hash: () => {
        hashClockCalls = clockCalls;
        return 'hash';
      },
    }
  );

  assert.equal(result.elapsed, 3);
  assert.equal(hashClockCalls, 4);
});

function snapshot(values, label = 'snapshot') {
  const frameworks = [{ name: 'fixture', bytes: 10, medianMs: values[0] }];
  return {
    schemaVersion: 2,
    label,
    preset: 'default',
    target: 'cssnano',
    gitRevision: '0123456789abcdef0123456789abcdef01234567',
    corpusManifest: 'manifest',
    seed: 'seed',
    mode: 'stable',
    warmup: 20,
    iters: 100,
    environment: {
      node: 'v24.0.0',
      v8: '13.0',
      platform: 'linux',
      arch: 'x64',
      nodeFlags: [],
      nodeEnv: 'production',
    },
    reliability: 'reliable',
    total: { medianMs: values[0] },
    frameworks,
    runs: values.map((value, index) => ({
      index: index + 1,
      outputHashes: { fixture: 'hash' },
      resourceUsage: { maxRSS: 1000 + index },
      summary: {
        total: { medianMs: value },
        frameworks: [{ name: 'fixture', bytes: 10, medianMs: value }],
      },
    })),
  };
}

function pairedSnapshot(benchmarkSnapshot) {
  return {
    ...benchmarkSnapshot,
    configuration: {
      ...benchmarkSnapshot.configuration,
      bootstrapResamples: 10,
      minimumBlocks: 2,
      requestedBlocks: 2,
    },
    runs: [
      benchmarkSnapshot.runs[0],
      { ...benchmarkSnapshot.runs[0], index: 2 },
    ],
  };
}

test('comparison verdicts distinguish improvement, regression, and noise', () => {
  assert.equal(
    compareSnapshots(
      snapshot([100, 100, 100, 100, 100]),
      snapshot([80, 80, 80, 80, 80])
    ).total.verdict,
    'improvement'
  );
  assert.equal(
    compareSnapshots(
      snapshot([100, 100, 100, 100, 100]),
      snapshot([120, 120, 120, 120, 120])
    ).total.verdict,
    'regression'
  );
  assert.equal(
    compareSnapshots(
      snapshot([100, 100, 100, 100, 100]),
      snapshot([80, 120, 90, 110, 100])
    ).total.verdict,
    'inconclusive'
  );
});

test('comparison results expose only report fields', () => {
  const result = compareSnapshots(
    snapshot([100, 100, 100, 100, 100]),
    snapshot([90, 90, 90, 90, 90])
  );
  assert.deepEqual(Object.keys(result.total).toSorted(), [
    'baseMedianMs',
    'baseReplicateCount',
    'baseSampleCount',
    'candidateMedianMs',
    'candidateReplicateCount',
    'candidateSampleCount',
    'confidenceIntervalPct',
    'medianDeltaPct',
    'replicateCount',
    'spreadPct',
    'verdict',
  ]);
  assert.deepEqual(Object.keys(result.rows[0]).toSorted(), [
    'baseMedianMs',
    'baseReplicateCount',
    'baseSampleCount',
    'bytes',
    'candidateMedianMs',
    'candidateReplicateCount',
    'candidateSampleCount',
    'confidenceIntervalPct',
    'medianDeltaPct',
    'name',
    'replicateCount',
    'spreadPct',
    'verdict',
  ]);
});

test('comparison rejects mismatched metadata and corpus', () => {
  const base = snapshot([100, 100, 100, 100, 100]);
  const differentSeed = { ...snapshot([90, 90, 90, 90, 90]), seed: 'other' };
  assert.throws(() => compareSnapshots(base, differentSeed), /seed differs/);
  const differentCorpus = {
    ...snapshot([90, 90, 90, 90, 90]),
    corpusManifest: 'other',
  };
  assert.throws(
    () => compareSnapshots(base, differentCorpus),
    /corpusManifest/
  );
});

test('comparison rejects output changes and compares maximum RSS', () => {
  const base = snapshot([100, 100, 100, 100, 100]);
  const candidate = snapshot([90, 90, 90, 90, 90]);
  for (const run of candidate.runs) run.outputHashes.fixture = 'different-hash';
  assert.throws(
    () => compareSnapshots(base, candidate),
    /output hash differs for "fixture"/
  );

  const result = compareSnapshots(base, snapshot([90, 90, 90, 90, 90]));
  assert.equal(result.maxRSS.baseMedian, 1002);
  assert.equal(result.maxRSS.candidateMedian, 1002);
  assert.equal(result.maxRSS.medianDeltaPct, 0);
});

test('comparison accepts only explicitly allowlisted output changes', () => {
  const base = snapshot([100, 100, 100, 100, 100]);
  const candidate = snapshot([90, 90, 90, 90, 90]);
  const baseHash = base.runs[0].outputHashes.fixture;
  const candidateHash = 'different-hash';
  for (const run of candidate.runs) run.outputHashes.fixture = candidateHash;
  candidate.outputHashes = { fixture: candidateHash };
  base.outputHashes = { fixture: baseHash };

  assert.doesNotThrow(() =>
    compareSnapshots(base, candidate, {
      outputHashAllowlist: new Map([
        ['fixture', { base: baseHash, candidate: candidateHash }],
      ]),
    })
  );
  assert.throws(
    () =>
      compareSnapshots(base, candidate, {
        outputHashAllowlist: new Map([
          ['fixture', { base: 'wrong', candidate: candidateHash }],
        ]),
      }),
    /hash differs.*base hash "hash".*candidate hash "different-hash"/
  );
});

test('stable benchmarks require a validated explicit revision', () => {
  assert.throws(
    () => resolveBenchmarkArgs(['--mode=stable']),
    /--revision is required for stable benchmarks/
  );
  assert.throws(
    () => resolveBenchmarkArgs(['--mode=stable', '--revision=short']),
    /full commit SHA/
  );
  const revision = currentGitRevision();
  assert.equal(
    resolveBenchmarkArgs(['--mode=stable', `--revision=${revision}`]).revision,
    revision
  );
});

test('fresh child runs preserve revision provenance unchanged', () => {
  const revision = '0123456789abcdef0123456789abcdef01234567';
  assert.deepEqual(
    childRunArguments([
      '--',
      '--mode=stable',
      `--revision=${revision}`,
      '--runs=5',
      '--label=candidate',
      '--run-index=4',
      '--child-run',
    ]),
    ['--mode=stable', `--revision=${revision}`]
  );
});

test('aggregate snapshots reject revision provenance changes', () => {
  const first = snapshot([100]);
  const second = {
    ...snapshot([100]),
    gitRevision: 'fedcba9876543210fedcba9876543210fedcba98',
  };
  assert.throws(
    () =>
      aggregateSnapshots([first, second], 'aggregate', {
        runs: 2,
        resultsDir: mkdtempSync(join(tmpdir(), 'cssnano-benchmark-')),
      }),
    /revision changed/
  );
});

test('legacy snapshots are loaded with an uncertainty warning', () => {
  const directory = mkdtempSync(join(tmpdir(), 'cssnano-benchmark-'));
  const path = join(directory, 'legacy.json');
  writeFileSync(
    path,
    JSON.stringify({
      label: 'legacy',
      preset: 'default',
      target: 'cssnano',
      corpusManifest: 'manifest',
      node: process.version,
      finalizationMode: 'production',
      platform: process.platform,
      arch: process.arch,
      warmup: 20,
      iters: 100,
      total: { medianMs: 10 },
      frameworks: [{ name: 'fixture', bytes: 10, median: 10 }],
    })
  );
  const loaded = loadSnapshot(path);
  const result = compareSnapshots(loaded, loaded);
  assert.equal(
    result.warning,
    'legacy single-run snapshot: uncertainty evidence is unavailable'
  );
  assert.equal(result.total.verdict, 'inconclusive');
  assert.equal(result.analysisClass, 'legacy-analysis');
  assert.equal(result.overallVerdict, 'inconclusive');
});

test('smoke benchmark writes a versioned snapshot with stable output hashes', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'cssnano-benchmark-'));
  const corpusDirectory = join(directory, 'corpus');
  const resultsDirectory = join(directory, 'results');
  mkdirSync(corpusDirectory);
  writeFileSync(join(corpusDirectory, 'fixture.css'), '.a { color: red }');
  await main([
    '--mode=quick',
    '--runs=1',
    '--dir=' + corpusDirectory,
    '--results-dir=' + resultsDirectory,
    '--label=smoke',
    '--summary',
  ]);
  await main([
    '--mode=quick',
    '--runs=1',
    '--dir=' + corpusDirectory,
    '--results-dir=' + resultsDirectory,
    '--label=smoke-repeat',
    '--summary',
    `--revision=${currentGitRevision()}`,
  ]);
  const result = JSON.parse(
    readFileSync(join(resultsDirectory, 'smoke.json'), 'utf8')
  );
  const repeat = JSON.parse(
    readFileSync(join(resultsDirectory, 'smoke-repeat.json'), 'utf8')
  );
  assert.equal(result.schemaVersion, 3);
  assert.match(result.gitRevision, /^[\da-f]{40}$/u);
  assert.equal(result.runs.length, 1);
  assert.equal(result.outputHashes.fixture, repeat.outputHashes.fixture);
  assert.doesNotThrow(() => compareSnapshots(result, repeat));

  const analyzed = compareSnapshots(
    pairedSnapshot(result),
    pairedSnapshot(repeat)
  );
  assert.equal(analyzed.total.endpoint, 'TOTAL');
});

test('summary statistics and quantiles reject nonsensical values (negative, NaN, out-of-bounds q)', () => {
  assert.throws(() => quantile([1, 2, 3], -0.1), /between 0 and 1/);
  assert.throws(() => quantile([1, 2, 3], 1.1), /between 0 and 1/);
  assert.throws(() => quantile([1, 2, 3], Number.NaN), /between 0 and 1/);
  assert.throws(
    () => quantile([], 0.5),
    /cannot calculate a quantile of no samples/
  );
  assert.throws(
    () => quantile([1, Number.NaN, 3], 0.5),
    /must be finite numbers/
  );
  assert.throws(() => summaryStatistics([]), /cannot be empty/);
  assert.throws(
    () => summaryStatistics([-1, 2, 3]),
    /must be non-negative finite numbers/
  );
  assert.throws(
    () => summaryStatistics([1, Number.NaN, 3]),
    /must be non-negative finite numbers/
  );
  assert.throws(
    () => summaryStatistics([1, Infinity, 3]),
    /must be non-negative finite numbers/
  );
});

test('paired percent change rejects negative and non-finite timings', () => {
  assert.throws(
    () => pairedPercentChange(-1, 2),
    /must be non-negative finite numbers/
  );
  assert.throws(
    () => pairedPercentChange(2, -1),
    /must be non-negative finite numbers/
  );
  assert.throws(
    () => pairedPercentChange(Number.NaN, 2),
    /must be non-negative finite numbers/
  );
  assert.throws(
    () => pairedPercentChange(2, Infinity),
    /must be non-negative finite numbers/
  );
  assert.equal(pairedPercentChange(0, 0), 0);
  assert.equal(pairedPercentChange(0, 5), Infinity);
  assert.equal(pairedPercentChange(100, 90), -10);
});

test('confidence intervals reject non-finite values and non-positive resamples', () => {
  assert.throws(() => bootstrapConfidenceInterval([]), /cannot be empty/);
  assert.throws(
    () => bootstrapConfidenceInterval([1, Number.NaN, 3]),
    /must be finite numbers/
  );
  assert.throws(
    () => bootstrapConfidenceInterval([1, 2, 3], 0),
    /must be a positive integer/
  );
  assert.throws(
    () => bootstrapConfidenceInterval([1, 2, 3], -5),
    /must be a positive integer/
  );
});

test('processCorpus rejects negative elapsed timings', async () => {
  let time = 100;
  await assert.rejects(
    async () =>
      processCorpus(
        [{ name: 'fixture', source: 'input' }],
        { process: async () => ({ css: 'output' }) },
        true,
        {
          now: () => {
            time -= 10;
            return time;
          },
        }
      ),
    /elapsed timing must be a non-negative finite number/
  );
});

test('snapshot loader rejects negative or zero timings and negative bytes', () => {
  const directory = mkdtempSync(join(tmpdir(), 'cssnano-benchmark-'));
  const createTestSnapshot = (overrides) => {
    const path = join(directory, `snap-${Math.random()}.json`);
    writeFileSync(path, JSON.stringify({ ...snapshot([100]), ...overrides }));
    return path;
  };

  assert.throws(
    () => loadSnapshot(createTestSnapshot({ total: { medianMs: -5 } })),
    /must be positive numbers/
  );
  assert.throws(
    () => loadSnapshot(createTestSnapshot({ total: { medianMs: 0 } })),
    /must be positive numbers/
  );
  assert.throws(
    () =>
      loadSnapshot(
        createTestSnapshot({
          frameworks: [{ name: 'fixture', bytes: -1, medianMs: 10 }],
        })
      ),
    /bytes must be a non-negative finite number/
  );
});

test('comparison does not apply a point-estimate minimum detectable effect', () => {
  // A precise small effect is no longer filtered by a point-estimate threshold.
  const base = snapshot([100, 100, 100, 100, 100]);
  const candidate = snapshot([99.8, 99.8, 99.8, 99.8, 99.8]);
  assert.equal(compareSnapshots(base, candidate).total.verdict, 'improvement');

  // The same applies to a precise small regression.
  const candidateReg = snapshot([100.2, 100.2, 100.2, 100.2, 100.2]);
  assert.equal(
    compareSnapshots(base, candidateReg).total.verdict,
    'regression'
  );
});

test('comparison marks runs with fewer than three replicates as inconclusive', () => {
  // Delta of -20% would be an improvement, but with only 2 runs it lacks statistical degrees of freedom
  const base = snapshot([100, 100]);
  const candidate = snapshot([80, 80]);
  const result = compareSnapshots(base, candidate);
  assert.equal(result.total.verdict, 'inconclusive');
  assert.match(result.warning, /fewer than three independent replicates/i);
});

test('environment validation checks required runtime fields while ignoring volatile hardware stats', () => {
  const base = snapshot([100, 100, 100, 100, 100]);
  const candWithMemoryFluctuation = {
    ...snapshot([90, 90, 90, 90, 90]),
    environment: {
      ...base.environment,
      totalMemory: 32000000000,
      osRelease: '6.1.0-other',
      cpuModel: 'Different Core String',
    },
  };
  // Should NOT throw on volatile hardware stats
  assert.doesNotThrow(() => compareSnapshots(base, candWithMemoryFluctuation));

  // Should throw on different Node runtime flags or environment
  const candWithDifferentNodeFlags = {
    ...snapshot([90, 90, 90, 90, 90]),
    environment: {
      ...base.environment,
      nodeFlags: ['--expose-gc'],
    },
  };
  assert.throws(
    () => compareSnapshots(base, candWithDifferentNodeFlags),
    /environment\.nodeFlags differs/
  );
});

test('two-sample bootstrap intervals are deterministic and reject invalid inputs', () => {
  const first = twoSampleBootstrapConfidenceInterval(
    [100, 102, 98, 101, 99],
    [90, 92, 88, 91, 89],
    1000
  );
  assert.deepEqual(
    twoSampleBootstrapConfidenceInterval(
      [100, 102, 98, 101, 99],
      [90, 92, 88, 91, 89],
      1000
    ),
    first
  );
  assert.ok(first.high < 0);
  assert.throws(
    () => twoSampleBootstrapConfidenceInterval([], [1, 2, 3]),
    /cannot be empty/
  );
  assert.throws(
    () => twoSampleBootstrapConfidenceInterval([1, 2, 3], []),
    /cannot be empty/
  );
  assert.throws(
    () => twoSampleBootstrapConfidenceInterval([-1, 2, 3], [1, 2, 3]),
    /non-negative finite numbers/
  );
  assert.throws(
    () => twoSampleBootstrapConfidenceInterval([1, 2, 3], [1, Number.NaN, 3]),
    /non-negative finite numbers/
  );
  assert.throws(
    () => twoSampleBootstrapConfidenceInterval([1, 2, 3], [1, 2, 3], 0),
    /must be a positive integer/
  );
  const clustered = clusteredTwoSampleBootstrapConfidenceInterval(
    [
      [100, 101, 99],
      [102, 100, 101],
      [99, 100, 98],
    ],
    [
      [90, 91, 89],
      [92, 90, 91],
      [89, 90, 88],
    ],
    1000
  );
  assert.deepEqual(
    clusteredTwoSampleBootstrapConfidenceInterval(
      [
        [100, 101, 99],
        [102, 100, 101],
        [99, 100, 98],
      ],
      [
        [90, 91, 89],
        [92, 90, 91],
        [89, 90, 88],
      ],
      1000
    ),
    clustered
  );
  assert.throws(
    () => clusteredTwoSampleBootstrapConfidenceInterval([[]], [[1, 2, 3]]),
    /sample groups cannot be empty/
  );
});

test('comparison medianDeltaPct is consistent with reported base and candidate medians', () => {
  const base = snapshot([100, 105, 95, 102, 98]); // base median = 100
  const candidate = snapshot([95, 90, 98, 92, 95]); // candidate median = 95
  const result = compareSnapshots(base, candidate);
  assert.equal(result.total.baseMedianMs, 100);
  assert.equal(result.total.candidateMedianMs, 95);
  assert.equal(result.total.medianDeltaPct, -5);
});

test('comparison verdict is invariant to replicate index permutation', () => {
  const base = snapshot([100, 105, 95, 102, 98]);
  // Candidate values in original order vs permuted order
  const candA = snapshot([90, 95, 96, 92, 90]);
  const candB = snapshot([95, 90, 90, 96, 92]);
  const resultA = compareSnapshots(base, candA);
  const resultB = compareSnapshots(base, candB);
  assert.equal(resultA.total.verdict, resultB.total.verdict);
  assert.equal(resultA.total.medianDeltaPct, resultB.total.medianDeltaPct);
});

test('per-framework rows with sub-threshold timing (< 5ms) are inconclusive due to low signal', () => {
  const base = snapshot([100, 100, 100, 100, 100]);
  const candidate = snapshot([80, 80, 80, 80, 80]);
  // Set framework timing below MIN_USEFUL_SAMPLE_MS (5ms)
  for (const run of base.runs) {
    run.summary.frameworks[0].medianMs = 2.0;
  }
  for (const run of candidate.runs) {
    run.summary.frameworks[0].medianMs = 1.5;
  }
  const result = compareSnapshots(base, candidate);
  assert.equal(result.total.verdict, 'improvement');
  assert.equal(result.rows[0].verdict, 'inconclusive');
});

test('comparison uses retained measured samples instead of only run summaries', () => {
  const base = snapshot([100, 100, 100]);
  const candidate = snapshot([90, 90, 90]);
  for (const run of base.runs) {
    run.totalSamples = [100, 101, 99, 100, 100];
    run.perFileSamples = { fixture: [100, 101, 99, 100, 100] };
  }
  for (const run of candidate.runs) {
    run.totalSamples = [90, 91, 89, 90, 90];
    run.perFileSamples = { fixture: [90, 91, 89, 90, 90] };
  }
  const result = compareSnapshots(base, candidate);
  assert.equal(result.total.baseMedianMs, 100);
  assert.equal(result.total.candidateMedianMs, 90);
  assert.equal(result.total.baseSampleCount, 15);
  assert.equal(result.total.candidateSampleCount, 15);
  assert.equal(result.total.replicateCount, 3);
});

test('independent comparisons do not require matching run indexes or counts', () => {
  const base = snapshot([100, 100, 100]);
  const candidate = snapshot([90, 90, 90, 90]);
  candidate.runs = candidate.runs.map((run, index) => ({
    ...run,
    index: (index + 1) * 10,
  }));
  const result = compareSnapshots(base, candidate);
  assert.equal(result.total.verdict, 'improvement');
  assert.equal(result.total.replicateCount, 3);
  assert.equal(result.total.candidateSampleCount, 4);
});
