import { quantile, summaryStatistics } from './bench-stats.js';

export const HASH = 'a'.repeat(64);
export const REVISION = '0123456789abcdef0123456789abcdef01234567';
export const BASE_REVISION = '1'.repeat(40);
export const CANDIDATE_REVISION = '2'.repeat(40);

export function mockProvenance(revision = REVISION) {
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

export function mockConfiguration(runs = 5, overrides = {}) {
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
    ...overrides,
  };
}

export function comparisonProvenance({
  baseRevision = BASE_REVISION,
  candidateRevision = CANDIDATE_REVISION,
} = {}) {
  return {
    createdAt: new Date(0).toISOString(),
    command: ['node'],
    gitRevision: { baseline: baseRevision, candidate: candidateRevision },
    benchmarkHarnessHash: HASH,
    corpusHash: HASH,
    sourceTreeHash: { baseline: HASH, candidate: HASH },
    lockfileHash: { baseline: HASH, candidate: HASH },
    dirty: { baseline: false, candidate: false },
    provenance: {
      baseline: mockProvenance(baseRevision),
      candidate: mockProvenance(candidateRevision),
    },
  };
}

export function snapshot(values, label = 'snapshot') {
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
