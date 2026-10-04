import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveBenchmarkTarget } from './bench-cases.js';
import { HASH } from './benchTestHelpers.js';

export function config(overrides = {}) {
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

export function observation(value, hash = 'same') {
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

export function childConfiguration(values) {
  return {
    runs: 1,
    seed: values.seed,
    target: resolveBenchmarkTarget(values.case),
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
