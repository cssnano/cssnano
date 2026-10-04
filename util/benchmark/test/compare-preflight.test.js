import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  approvalCommand,
  compareCorpora,
  runPreflight,
} from '../compare-preflight.js';
import {
  baseConfig,
  cleanupConfig,
  prepareCheckout,
  smokeSnapshot,
  temporaryDirectory,
} from '../preflightTestHelpers.js';

function writeCorpus(dir, names) {
  mkdirSync(dir, { recursive: true });
  for (const name of names) {
    writeFileSync(join(dir, `${name}.css`), `.${name}{}\n`);
  }
}

function mockSmokeSpawn(config, smokeArguments, overrides = {}) {
  return (args) => {
    smokeArguments.push(args);
    const label = args
      .find((argument) => argument.startsWith('--label='))
      .slice('--label='.length);
    const side = label.replace('preflight-', '');
    writeFileSync(
      join(config.resultsDir, `${label}.json`),
      smokeSnapshot(side, 'a'.repeat(64), overrides)
    );
    return 0;
  };
}

function mockSmokeWriter(config, getSnapshotData) {
  return (args) => {
    const label = args
      .find((argument) => argument.startsWith('--label='))
      .slice('--label='.length);
    const side = label.replace('preflight-', '');
    const { outputHash = 'a'.repeat(64), overrides = {} } =
      getSnapshotData(side);
    writeFileSync(
      join(config.resultsDir, `${label}.json`),
      smokeSnapshot(side, outputHash, overrides)
    );
    return 0;
  };
}

test('compareCorpora reports the common fixtures and each side-only fixtures', () => {
  const base = temporaryDirectory('cssnano-corpus-base-');
  const candidate = temporaryDirectory('cssnano-corpus-candidate-');
  writeCorpus(join(base, 'frameworks'), ['alpha', 'beta', 'gamma']);
  writeCorpus(join(candidate, 'frameworks'), ['beta', 'gamma', 'delta']);
  try {
    const comparison = compareCorpora(
      join(base, 'frameworks'),
      join(candidate, 'frameworks')
    );
    assert.deepEqual(comparison.common, ['beta', 'gamma']);
    assert.deepEqual(comparison.baseOnly, ['alpha']);
    assert.deepEqual(comparison.candidateOnly, ['delta']);
  } finally {
    rmSync(base, { recursive: true, force: true });
    rmSync(candidate, { recursive: true, force: true });
  }
});

async function runFailingPreflight(config, failureKeyword) {
  let spawned = 0;
  const result = await runPreflight(config, {
    spawn: () => {
      spawned++;
      return 0;
    },
  });
  assert.equal(result.ok, false);
  assert.equal(spawned, 0);
  const failure = result.failures.find((item) => item.includes(failureKeyword));
  return { result, failure };
}

test('runPreflight fails with a clear corpora-differ message and a common-corpus manifest', async () => {
  const config = baseConfig();
  writeCorpus(join(config.baseDir, 'frameworks'), [
    'alpha',
    'beta',
    'gamma',
    'delta',
    'echo',
  ]);
  writeCorpus(join(config.candidateDir, 'frameworks'), [
    'alpha',
    'beta',
    'gamma',
  ]);
  try {
    const { failure: corpusFailure } = await runFailingPreflight(
      config,
      'corpora differ'
    );
    assert.match(corpusFailure, /baseline has 5 fixtures/v);
    assert.match(corpusFailure, /candidate has 3 fixtures/v);
    assert.match(corpusFailure, /delta, echo/v);
    assert.match(corpusFailure, /corpus-manifest=/v);
    const manifestPath = corpusFailure.match(/--corpus-manifest=(\S+)/v)[1];
    assert.equal(existsSync(manifestPath), true);
    assert.deepEqual(readFileSync(manifestPath, 'utf8').trim().split('\n'), [
      'alpha',
      'beta',
      'gamma',
    ]);
  } finally {
    cleanupConfig(config);
  }
});

test('runPreflight fails when the fixture selector matches no corpus fixture', async () => {
  const config = baseConfig({ only: ['merge-rules'] });
  writeCorpus(join(config.baseDir, 'frameworks'), ['alpha', 'beta']);
  writeCorpus(join(config.candidateDir, 'frameworks'), ['alpha', 'beta']);
  try {
    const { failure } = await runFailingPreflight(config, 'no corpus fixture');
    assert.match(failure, /merge-rules/v);
    assert.match(failure, /alpha, beta/v);
    assert.match(failure, /--case=<name>/v);
  } finally {
    cleanupConfig(config);
  }
});

test('runPreflight rejects revisions before any expensive work', async () => {
  const config = baseConfig();
  const { result } = await runFailingPreflight(config, 'revision');
  assert.ok(
    result.failures.some(
      (failure) =>
        failure.startsWith('baseline revision:') &&
        failure.length > 'baseline revision:'.length
    )
  );
  assert.ok(
    result.failures.some((failure) => failure.startsWith('candidate revision:'))
  );
});

test('approvalCommand reproduces the exact comparison invocation with approvals', () => {
  const config = baseConfig({
    baseRevision: 'a'.repeat(40),
    candidateRevision: 'b'.repeat(40),
    only: ['selector', 'gradient'],
    outputHashAllowlist: new Map([
      ['approved', { base: 'c'.repeat(64), candidate: 'd'.repeat(64) }],
    ]),
  });
  const command = approvalCommand(config, [
    ['fixture', { base: 'e'.repeat(64), candidate: 'f'.repeat(64) }],
  ]);
  assert.match(command, /^node util\/benchmark\/compare-revisions\.js /v);
  assert.match(command, /--base-revision=a{40}/v);
  assert.match(command, /--candidate-revision=b{40}/v);
  assert.match(command, /--only=selector --only=gradient/v);
  assert.match(command, /--allow-output-hash=approved,c{64},d{64}/v);
  assert.match(command, /--allow-output-hash=fixture,e{64},f{64}/v);
});

test('runPreflight fails when fixture names match but contents differ', async () => {
  const config = baseConfig();
  writeCorpus(join(config.baseDir, 'frameworks'), ['alpha', 'beta']);
  writeCorpus(join(config.candidateDir, 'frameworks'), ['alpha', 'beta']);
  writeFileSync(
    join(config.candidateDir, 'frameworks', 'beta.css'),
    '.changed{}\n'
  );
  try {
    const { failure: corpusFailure } = await runFailingPreflight(
      config,
      'corpus contents differ'
    );
    assert.match(corpusFailure, /\bbeta\b/v);
  } finally {
    cleanupConfig(config);
  }
});

test('runPreflight forwards the corpus selection to both smoke runs', async () => {
  const config = baseConfig({ only: ['gradient'] });
  config.baseRevision = prepareCheckout(config.baseDir);
  config.candidateRevision = prepareCheckout(config.candidateDir);
  writeCorpus(join(config.baseDir, 'frameworks'), ['gradient-stop']);
  writeCorpus(join(config.candidateDir, 'frameworks'), ['gradient-stop']);
  const smokeArguments = [];
  try {
    const result = await runPreflight(config, {
      spawn: mockSmokeSpawn(config, smokeArguments),
    });
    assert.equal(result.ok, true);
    assert.equal(smokeArguments.length, 2);
    for (const args of smokeArguments) {
      assert.ok(args.includes('--only=gradient'));
      assert.ok(!args.includes('--corpus-manifest='));
    }
  } finally {
    cleanupConfig(config);
  }
});

test('runPreflight forwards a focused case to both smoke runs', async () => {
  const config = baseConfig({ case: 'selector-fixed-point' });
  config.baseRevision = prepareCheckout(config.baseDir);
  config.candidateRevision = prepareCheckout(config.candidateDir);
  const smokeArguments = [];
  try {
    const result = await runPreflight(config, {
      spawn: mockSmokeSpawn(config, smokeArguments, {
        target: 'postcss-minify-selectors',
      }),
    });
    assert.equal(result.ok, true);
    for (const args of smokeArguments) {
      assert.ok(args.includes('--case=selector-fixed-point'));
      assert.ok(!args.some((argument) => argument.startsWith('--only=')));
    }
  } finally {
    cleanupConfig(config);
  }
});

test('runPreflight rejects smoke runs with different corpus hashes', async () => {
  const config = baseConfig();
  config.baseRevision = prepareCheckout(config.baseDir);
  config.candidateRevision = prepareCheckout(config.candidateDir);
  writeCorpus(join(config.baseDir, 'frameworks'), ['fixture']);
  writeCorpus(join(config.candidateDir, 'frameworks'), ['fixture']);
  const hashes = {
    baseline: 'a'.repeat(64),
    candidate: 'b'.repeat(64),
  };
  try {
    const result = await runPreflight(config, {
      spawn: mockSmokeWriter(config, (side) => ({
        overrides: { corpusHash: hashes[side] },
      })),
    });
    assert.equal(result.ok, false);
    assert.match(result.failures.join('\n'), /corpusHash: a{64} vs b{64}/v);
  } finally {
    cleanupConfig(config);
  }
});

test('approvalCommand reproduces every configurable benchmark setting', () => {
  const config = baseConfig({
    blocks: 8,
    minimumBlocks: 4,
    requestedBlocks: 12,
    pilotBlocks: 3,
    bootstrapSeed: 'bootstrap-seed',
    bootstrapResamples: 500,
    warmup: 20,
    iters: 100,
    precisionTarget: 0.05,
    orderInteractionThreshold: 0.05,
    superiorityConfidenceLevel: 0.95,
    equivalenceConfidenceLevel: 0.9,
    runtimeNonRegressionMargin: 1.1,
    practicalEquivalenceMargin: 1.1,
    pinCore: 2,
    adaptive: true,
  });
  const command = approvalCommand(config);
  const tokens = command.split(' ');
  for (const expected of [
    '--mode=stable',
    '--blocks=8',
    '--minimum-blocks=4',
    '--requested-blocks=12',
    '--pilot-blocks=3',
    '--seed=test-seed',
    '--warmup=20',
    '--iters=100',
    '--precision-target=0.05',
    '--order-interaction-threshold=0.05',
    '--superiority-confidence-level=0.95',
    '--equivalence-confidence-level=0.9',
    '--runtime-non-regression-margin=1.1',
    '--practical-equivalence-margin=1.1',
    '--pin-core=2',
    '--adaptive',
  ]) {
    assert.ok(tokens.includes(expected), `missing ${expected}`);
  }
});

test('runPreflight compares smoke output hashes and prints the approval command', async () => {
  const config = baseConfig();

  config.baseRevision = prepareCheckout(config.baseDir, 'fixture.css');
  config.candidateRevision = prepareCheckout(
    config.candidateDir,
    'fixture.css'
  );

  const smokeHashes = {
    baseline: 'a'.repeat(64),
    candidate: 'b'.repeat(64),
  };
  try {
    const result = await runPreflight(config, {
      spawn: mockSmokeWriter(config, (side) => ({
        outputHash: smokeHashes[side],
      })),
    });
    assert.equal(result.ok, false);
    assert.match(
      result.failures.join('\n'),
      /smoke outputs differ for: fixture/v
    );
    const suggestion = result.log.find((line) =>
      line.includes('--allow-output-hash=')
    );
    assert.match(suggestion, /--allow-output-hash=fixture,a{64},b{64}/v);
  } finally {
    cleanupConfig(config);
  }
});
