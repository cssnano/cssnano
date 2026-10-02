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
  usageText,
} from '../bench.js';
import { resolveBenchmarkTarget } from '../bench-cases.js';
import { selectCorpus } from '../bench-corpus.js';
import { currentGitRevision } from '../bench-provenance.js';
import { compareSnapshots } from '../compare-snapshots.js';

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
  const first = {
    gitRevision: '0123456789abcdef0123456789abcdef01234567',
    corpusManifest: 'hash',
    outputHashes: {},
  };
  const second = {
    ...first,
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
