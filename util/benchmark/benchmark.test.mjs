import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  MODES,
  aggregateSnapshots,
  childRunArguments,
  listCasesText,
  main,
  processCorpus,
  resolveBenchmarkArgs,
  shuffleCorpus,
  summaryStatistics,
  usageText,
} from './bench.mjs';
import { resolveBenchmarkTarget } from './bench-cases.mjs';
import { selectCorpus } from './bench-corpus.mjs';
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

test('--help and --list-cases document modes, options, and cases', () => {
  assert.match(usageText(), /--mode=<quick\|stable>/v);
  assert.match(usageText(), /--corpus-manifest=<path>/v);
  assert.match(usageText(), /examples:/v);
  const cases = listCasesText().split('\n');
  assert.ok(cases.includes('selector-fixed-point'));
  assert.ok(cases.length > 5);
});

test('repeated --only selectors broaden corpus selection instead of overwriting', () => {
  const args = resolveBenchmarkArgs([
    '--mode=quick',
    '--only=selector',
    '--only=gradient',
  ]);
  assert.deepEqual(args.only, ['selector', 'gradient']);
  assert.equal(resolveBenchmarkArgs(['--mode=quick']).only, null);

  const directory = mkdtempSync(join(tmpdir(), 'cssnano-corpus-'));
  try {
    for (const name of [
      'selector-fixed',
      'gradient-stop',
      'merge-box',
      'gradient-colour',
    ]) {
      writeFileSync(join(directory, `${name}.css`), '.a{}\n');
    }
    const selected = selectCorpus(
      { case: null, only: ['selector', 'merge'], corpusManifest: null },
      directory
    );
    assert.deepEqual(
      selected.map((fixture) => fixture.name),
      ['merge-box', 'selector-fixed']
    );

    const manifestPath = join(directory, 'manifest.txt');
    writeFileSync(manifestPath, 'gradient-stop\ngradient-colour\n');
    const fromManifest = selectCorpus(
      { case: null, only: null, corpusManifest: manifestPath },
      directory
    );
    assert.deepEqual(
      fromManifest.map((fixture) => fixture.name),
      ['gradient-colour', 'gradient-stop']
    );

    writeFileSync(manifestPath, 'gradient-stop\nmissing-fixture\n');
    assert.throws(
      () =>
        selectCorpus(
          { case: null, only: null, corpusManifest: manifestPath },
          directory
        ),
      /missing from the corpus.*missing-fixture/v
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('--quiet suppresses child progress output but still writes the snapshot', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'cssnano-quiet-'));
  const corpusDirectory = join(directory, 'corpus');
  const resultsDirectory = join(directory, 'results');
  mkdirSync(corpusDirectory);
  writeFileSync(join(corpusDirectory, 'fixture.css'), '.a { color: red }');
  const logs = [];
  const originalLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  try {
    await main([
      '--mode=quick',
      '--runs=1',
      `--dir=${corpusDirectory}`,
      `--results-dir=${resultsDirectory}`,
      '--label=quiet-smoke',
      '--summary',
      '--quiet',
    ]);
  } finally {
    console.log = originalLog;
  }
  assert.deepEqual(logs, []);
  const smokeRun = JSON.parse(
    readFileSync(join(resultsDirectory, 'quiet-smoke.json'), 'utf8')
  );
  assert.equal(smokeRun.schemaVersion, 3);
});

test('the benchmark target resolver is shared by snapshots and comparisons', () => {
  assert.equal(
    resolveBenchmarkTarget('selector-fixed-point'),
    'postcss-minify-selectors'
  );
  assert.equal(resolveBenchmarkTarget(null), 'cssnano');
  assert.throws(
    () => resolveBenchmarkTarget('nope'),
    /unknown benchmark case/v
  );
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

const HASH = 'a'.repeat(64);
const REVISION = '0123456789abcdef0123456789abcdef01234567';

function mockProvenance(revision = REVISION) {
  return {
    createdAt: new Date(0).toISOString(),
    command: ['node'],
    gitRevision: revision,
    benchmarkHarnessHash: HASH,
    benchmarkConfigHash: HASH,
    sourceTreeHash: HASH,
    lockfileHash: HASH,
    corpusHash: HASH,
    dirty: false,
    dirtyPaths: [],
    node: 'v24.0.0',
    v8: '13.0',
    platform: 'linux',
    arch: 'x64',
    osRelease: 'test',
    cpu: 'test',
    cpuCount: 1,
    governor: null,
    pinnedCore: null,
  };
}

function mockConfiguration(runs = 5) {
  return {
    superiorityConfidenceLevel: 0.95,
    equivalenceConfidenceLevel: 0.9,
    runtimeNonRegressionMargin: 1.1,
    practicalEquivalenceMargin: 1.1,
    bootstrapResamples: 100,
    bootstrapSeed: 'test-seed',
    minimumBlocks: 1,
    requestedBlocks: Math.max(runs, 1),
    precisionTarget: 0.05,
    orderInteractionThreshold: 0.05,
    intervalMethod: 'stratified-percentile-bootstrap',
    analyzerVersion: '3.0.0',
    mode: 'stable',
    warmup: 20,
    iters: 100,
    preset: 'default',
    target: 'cssnano',
    case: null,
    corpusSelector: null,
    nodeEnv: 'production',
  };
}

function snapshot(values, label = 'snapshot') {
  const sortedValues = values.toSorted((a, b) => a - b);
  const medianMs = quantile(sortedValues, 0.5);
  const frameworks = [{ name: 'fixture', bytes: 10, medianMs }];
  const prov = mockProvenance();
  return {
    schemaVersion: 3,
    label,
    preset: 'default',
    target: 'cssnano',
    gitRevision: REVISION,
    corpusManifest: HASH,
    corpusHash: HASH,
    corpus: [{ name: 'fixture', bytes: 10 }],
    seed: 'seed',
    mode: 'stable',
    warmup: 20,
    iters: 100,
    finalizationMode: 'production',
    environment: {
      node: 'v24.0.0',
      v8: '13.0',
      platform: 'linux',
      arch: 'x64',
      nodeFlags: [],
      nodeEnv: 'production',
      finalizationMode: 'production',
    },
    provenance: prov,
    configuration: mockConfiguration(values.length),
    reliability: 'reliable',
    total: { medianMs },
    frameworks,
    outputHashes: { fixture: 'hash' },
    runs: values.map((value, index) => {
      const stats = summaryStatistics([value]);
      return {
        index: index + 1,
        totalSamples: [value],
        perFileSamples: { fixture: [value] },
        outputHashes: { fixture: 'hash' },
        resourceUsage: { maxRSS: 1000 + index },
        summary: {
          total: { ...stats },
          frameworks: [{ name: 'fixture', bytes: 10, ...stats }],
        },
      };
    }),
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
    'endpoint',
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
  assert.throws(() => compareSnapshots(base, differentSeed), /seed differs/v);
  const differentCorpus = {
    ...snapshot([90, 90, 90, 90, 90]),
    corpusManifest: 'other',
  };
  assert.throws(
    () => compareSnapshots(base, differentCorpus),
    /corpusManifest/v
  );
  assert.throws(
    () => compareSnapshots({ ...base, schemaVersion: 2 }, base),
    /benchmark snapshot must use schema v3/v
  );
  assert.throws(
    () => compareSnapshots(base, { ...base, schemaVersion: 1 }),
    /benchmark snapshot must use schema v3/v
  );
});

test('comparison rejects output changes and compares maximum RSS', () => {
  const base = snapshot([100, 100, 100, 100, 100]);
  const candidate = snapshot([90, 90, 90, 90, 90]);
  for (const run of candidate.runs) run.outputHashes.fixture = 'different-hash';
  assert.throws(
    () => compareSnapshots(base, candidate),
    /output hash differs for "fixture"/v
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
    /hash differs.*base hash "hash".*candidate hash "different-hash"/v
  );
});

test('stable benchmarks require a validated explicit revision', () => {
  assert.throws(
    () => resolveBenchmarkArgs(['--mode=stable']),
    /--revision is required for stable benchmarks/v
  );
  assert.throws(
    () => resolveBenchmarkArgs(['--mode=stable', '--revision=short']),
    /full commit SHA/v
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
    /revision changed/v
  );
});

test('legacy v1 and v2 snapshots are rejected by the snapshot loader', () => {
  const directory = mkdtempSync(join(tmpdir(), 'cssnano-benchmark-'));
  const v1Path = join(directory, 'legacy-v1.json');
  writeFileSync(
    v1Path,
    JSON.stringify({
      label: 'legacy-v1',
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
  assert.throws(
    () => loadSnapshot(v1Path),
    /benchmark snapshot must use schema v3/v
  );

  const v2Path = join(directory, 'legacy-v2.json');
  writeFileSync(
    v2Path,
    JSON.stringify({
      schemaVersion: 2,
      label: 'legacy-v2',
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
      runs: [],
    })
  );
  assert.throws(
    () => loadSnapshot(v2Path),
    /benchmark snapshot must use schema v3/v
  );
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
  assert.match(result.gitRevision, /^[\da-f]{40}$/v);
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
  assert.throws(() => quantile([1, 2, 3], -0.1), /between 0 and 1/v);
  assert.throws(() => quantile([1, 2, 3], 1.1), /between 0 and 1/v);
  assert.throws(() => quantile([1, 2, 3], Number.NaN), /between 0 and 1/v);
  assert.throws(
    () => quantile([], 0.5),
    /cannot calculate a quantile of no samples/v
  );
  assert.throws(
    () => quantile([1, Number.NaN, 3], 0.5),
    /must be finite numbers/v
  );
  assert.throws(() => summaryStatistics([]), /cannot be empty/v);
  assert.throws(
    () => summaryStatistics([-1, 2, 3]),
    /must be non-negative finite numbers/v
  );
  assert.throws(
    () => summaryStatistics([1, Number.NaN, 3]),
    /must be non-negative finite numbers/v
  );
  assert.throws(
    () => summaryStatistics([1, Infinity, 3]),
    /must be non-negative finite numbers/v
  );
});

test('paired percent change rejects negative and non-finite timings', () => {
  assert.throws(
    () => pairedPercentChange(-1, 2),
    /must be non-negative finite numbers/v
  );
  assert.throws(
    () => pairedPercentChange(2, -1),
    /must be non-negative finite numbers/v
  );
  assert.throws(
    () => pairedPercentChange(Number.NaN, 2),
    /must be non-negative finite numbers/v
  );
  assert.throws(
    () => pairedPercentChange(2, Infinity),
    /must be non-negative finite numbers/v
  );
  assert.equal(pairedPercentChange(0, 0), 0);
  assert.equal(pairedPercentChange(0, 5), Infinity);
  assert.equal(pairedPercentChange(100, 90), -10);
});

test('confidence intervals reject non-finite values and non-positive resamples', () => {
  assert.throws(() => bootstrapConfidenceInterval([]), /cannot be empty/v);
  assert.throws(
    () => bootstrapConfidenceInterval([1, Number.NaN, 3]),
    /must be finite numbers/v
  );
  assert.throws(
    () => bootstrapConfidenceInterval([1, 2, 3], 0),
    /must be a positive integer/v
  );
  assert.throws(
    () => bootstrapConfidenceInterval([1, 2, 3], -5),
    /must be a positive integer/v
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
    /elapsed timing must be a non-negative finite number/v
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
    /must be positive numbers/v
  );
  assert.throws(
    () => loadSnapshot(createTestSnapshot({ total: { medianMs: 0 } })),
    /must be positive numbers/v
  );
  assert.throws(
    () =>
      loadSnapshot(
        createTestSnapshot({
          frameworks: [{ name: 'fixture', bytes: -1, medianMs: 10 }],
        })
      ),
    /bytes must be a non-negative finite number/v
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
  assert.match(result.warning, /fewer than three independent replicates/iv);
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
    /environment\.nodeFlags differs/v
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
    /cannot be empty/v
  );
  assert.throws(
    () => twoSampleBootstrapConfidenceInterval([1, 2, 3], []),
    /cannot be empty/v
  );
  assert.throws(
    () => twoSampleBootstrapConfidenceInterval([-1, 2, 3], [1, 2, 3]),
    /non-negative finite numbers/v
  );
  assert.throws(
    () => twoSampleBootstrapConfidenceInterval([1, 2, 3], [1, Number.NaN, 3]),
    /non-negative finite numbers/v
  );
  assert.throws(
    () => twoSampleBootstrapConfidenceInterval([1, 2, 3], [1, 2, 3], 0),
    /must be a positive integer/v
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
    /sample groups cannot be empty/v
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
    run.perFileSamples.fixture = [2.0];
  }
  for (const run of candidate.runs) {
    run.summary.frameworks[0].medianMs = 1.5;
    run.perFileSamples.fixture = [1.5];
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
