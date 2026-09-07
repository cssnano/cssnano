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
  compareSnapshots,
  loadSnapshot,
} from './compare-bench.mjs';

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
  const defaults = resolveBenchmarkArgs([
    '--revision=0123456789abcdef0123456789abcdef01234567',
  ]);
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
    'candidateMedianMs',
    'confidenceIntervalPct',
    'medianDeltaPct',
    'replicateCount',
    'spreadPct',
    'verdict',
  ]);
  assert.deepEqual(Object.keys(result.rows[0]).toSorted(), [
    'baseMedianMs',
    'bytes',
    'candidateMedianMs',
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
  candidate.runs[0].outputHashes.fixture = 'different-hash';
  assert.throws(
    () => compareSnapshots(base, candidate),
    /output hash differs for "fixture" in replicate 1/
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
  candidate.runs[0].outputHashes.fixture = candidateHash;
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
  const revision = '0123456789abcdef0123456789abcdef01234567';
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
    '--revision=0123456789abcdef0123456789abcdef01234567',
  ]);
  await main([
    '--mode=quick',
    '--runs=1',
    '--dir=' + corpusDirectory,
    '--results-dir=' + resultsDirectory,
    '--label=smoke-repeat',
    '--summary',
    '--revision=0123456789abcdef0123456789abcdef01234567',
  ]);
  const result = JSON.parse(
    readFileSync(join(resultsDirectory, 'smoke.json'), 'utf8')
  );
  const repeat = JSON.parse(
    readFileSync(join(resultsDirectory, 'smoke-repeat.json'), 'utf8')
  );
  assert.equal(result.schemaVersion, 2);
  assert.equal(result.gitRevision, '0123456789abcdef0123456789abcdef01234567');
  assert.equal(result.runs.length, 1);
  assert.equal(result.outputHashes.fixture, repeat.outputHashes.fixture);
});
