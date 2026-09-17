import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { analyzeComparison } from './compare-analysis.mjs';
import { executeComparison } from './compare-revisions.mjs';

const HASH = 'a'.repeat(64);
function provenance(revision) {
  return {
    createdAt: new Date(0).toISOString(),
    command: ['node'],
    gitRevision: revision,
    benchmarkHarnessHash: HASH,
    sourceTreeHash: HASH,
    lockfileHash: HASH,
    corpusHash: HASH,
    dirty: false,
    dirtyPaths: [],
    node: 'v24.0.0',
    v8: '1',
    platform: 'linux',
    arch: 'x64',
    osRelease: 'test',
    cpu: 'test',
    cpuCount: 1,
    governor: null,
    pinnedCore: null,
  };
}

function config(overrides = {}) {
  return {
    baseDir: process.cwd(),
    candidateDir: process.cwd(),
    resultsDir: mkdtempSync(join(tmpdir(), 'cssnano-coordinator-')),
    baseRevision: '1'.repeat(40),
    candidateRevision: '2'.repeat(40),
    blocks: 6,
    minimumBlocks: 4,
    requestedBlocks: 6,
    seed: 'test-seed',
    bootstrapSeed: 'test-bootstrap',
    preset: 'default',
    mode: 'quick',
    warmup: 0,
    iters: 2,
    bootstrapResamples: 50,
    precisionTarget: 0.05,
    orderInteractionThreshold: 0.05,
    superiorityConfidenceLevel: 0.95,
    equivalenceConfidenceLevel: 0.9,
    runtimeNonRegressionMargin: 1.1,
    practicalEquivalenceMargin: 1.1,
    ...overrides,
  };
}

function observation(value, hash = 'same') {
  const outputHash = hash === 'same' ? HASH : 'b'.repeat(64);
  return {
    totalSamples: [value, value],
    perFileSamples: { fixture: [value, value] },
    outputHashes: { fixture: outputHash },
    summary: {
      total: {
        n: 2,
        minMs: value,
        medianMs: value,
        meanMs: value,
        p95Ms: value,
        maxMs: value,
      },
      frameworks: [
        {
          name: 'fixture',
          n: 2,
          minMs: value,
          medianMs: value,
          meanMs: value,
          p95Ms: value,
          maxMs: value,
        },
      ],
    },
  };
}

function childConfiguration(values) {
  return {
    runs: 1,
    seed: values.seed,
    target: values.case ?? 'cssnano',
    reliability: 'smoke',
    superiorityConfidenceLevel: values.superiorityConfidenceLevel,
    equivalenceConfidenceLevel: values.equivalenceConfidenceLevel,
    runtimeNonRegressionMargin: values.runtimeNonRegressionMargin,
    practicalEquivalenceMargin: values.practicalEquivalenceMargin,
    bootstrapResamples: values.bootstrapResamples,
    bootstrapSeed: values.bootstrapSeed,
    minimumBlocks: values.minimumBlocks,
    requestedBlocks: values.requestedBlocks,
    precisionTarget: values.precisionTarget,
    orderInteractionThreshold: values.orderInteractionThreshold,
    intervalMethod: 'crossover-t-interval',
    analyzerVersion: '3.0.0',
    mode: values.mode,
    warmup: values.warmup,
    iters: values.iters,
    preset: values.preset,
    case: values.case ?? null,
    corpusSelector: values.only ?? null,
    nodeEnv: 'production',
  };
}

test('coordinator starts a fresh observation for each side of each block', () => {
  let calls = 0;
  const processIds = [];
  const artifact = executeComparison(
    config({ blocks: 4, requestedBlocks: 4 }),
    (...args) => {
      calls++;
      processIds.push(
        Number(
          spawnSync(
            process.execPath,
            ['-e', 'process.stdout.write(String(process.pid))'],
            { encoding: 'utf8' }
          ).stdout
        )
      );
      const side = args[1];
      const blockId = args[2];
      let value;
      if (side === 'baseline') value = blockId % 2 ? 120 : 100;
      else value = blockId % 2 ? 100 : 120;
      return {
        exitStatus: 0,
        structuralValidity: true,
        provenance: provenance(
          side === 'baseline'
            ? config().baseRevision
            : config().candidateRevision
        ),
        configuration: childConfiguration(args[0]),
        run: observation(value),
      };
    }
  );
  assert.equal(calls, 8);
  assert.equal(processIds.length, 8);
  assert.ok(processIds.every((processId) => processId !== process.pid));
  const result = analyzeComparison(artifact);
  assert.equal(result.total.statisticalDirection, 'inconclusive');
});

test('output mismatch is a structural failure before performance analysis', () => {
  const artifact = executeComparison(
    config({ blocks: 5, requestedBlocks: 5 }),
    (...args) => ({
      exitStatus: 0,
      structuralValidity: true,
      provenance: provenance(
        args[1] === 'baseline'
          ? config().baseRevision
          : config().candidateRevision
      ),
      configuration: childConfiguration(args[0]),
      run: observation(100, args[1] === 'candidate' ? 'different' : 'same'),
    })
  );
  const result = analyzeComparison(artifact);
  assert.equal(result.structuralFailure, true);
  assert.equal(result.overallVerdict, 'inconclusive');
});

test('coordinator records both exit statuses when the first process fails', () => {
  const values = config({ blocks: 1, requestedBlocks: 5 });
  const artifact = executeComparison(values, (_config, side) => {
    if (side === 'candidate') {
      return {
        exitStatus: 17,
        structuralValidity: false,
        error: 'child failed',
      };
    }
    return {
      exitStatus: 0,
      structuralValidity: true,
      provenance: provenance(values.baseRevision),
      configuration: childConfiguration(values),
      run: observation(100),
    };
  });

  assert.deepEqual(Object.keys(artifact.blocks[0].exitStatus).toSorted(), [
    'baseline',
    'candidate',
  ]);
  assert.equal(artifact.blocks[0].exitStatus.candidate, 17);
  assert.equal(artifact.blocks[0].exitStatus.baseline, 0);
  const result = analyzeComparison(artifact);
  assert.equal(result.structuralFailure, true);
  assert.equal(result.overallVerdict, 'inconclusive');
});

test('coordinator rejects more executed blocks than requested', () => {
  assert.throws(
    () => executeComparison(config({ blocks: 6, requestedBlocks: 5 })),
    /blocks must not exceed requested blocks/v
  );
});
