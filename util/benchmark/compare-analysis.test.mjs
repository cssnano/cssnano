import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  analyzeComparison,
  analyzeIndependentSnapshots,
  analyzePairedComparison,
} from './compare-analysis.mjs';
import { createComparisonSchedule } from './comparison-schedule.mjs';

const HASH = 'a'.repeat(64);
const BASE_REVISION = '1'.repeat(40);
const CANDIDATE_REVISION = '2'.repeat(40);
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

function observation(value) {
  const samples = [value, value, value];
  return {
    totalSamples: samples,
    perFileSamples: { fixture: samples },
    outputHashes: { fixture: HASH },
    summary: {
      total: {
        n: 3,
        minMs: value,
        medianMs: value,
        meanMs: value,
        p95Ms: value,
        maxMs: value,
      },
      frameworks: [
        {
          name: 'fixture',
          n: 3,
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

function artifact(ratios, overrides = {}) {
  const baseConfiguration = {
    superiorityConfidenceLevel: 0.95,
    equivalenceConfidenceLevel: 0.9,
    runtimeNonRegressionMargin: 1.1,
    practicalEquivalenceMargin: 1.1,
    bootstrapResamples: 100,
    bootstrapSeed: 'test-seed',
    minimumBlocks: 5,
    requestedBlocks: ratios.length,
    precisionTarget: 0.05,
    orderInteractionThreshold: 0.05,
    intervalMethod: 'stratified-percentile-bootstrap',
    analyzerVersion: '3.0.0',
    mode: 'quick',
    warmup: 1,
    iters: 3,
    actualBlocks: ratios.length,
    preset: 'default',
    target: 'cssnano',
    case: null,
    corpusSelector: null,
    seed: 'comparison-seed',
    nodeEnv: 'production',
  };
  const configuration = { ...baseConfiguration, ...overrides.configuration };
  return {
    schemaVersion: 3,
    artifactType: 'comparison',
    createdAt: new Date().toISOString(),
    command: ['node'],
    gitRevision: { baseline: BASE_REVISION, candidate: CANDIDATE_REVISION },
    benchmarkHarnessHash: HASH,
    corpusHash: HASH,
    sourceTreeHash: { baseline: HASH, candidate: HASH },
    lockfileHash: { baseline: HASH, candidate: HASH },
    dirty: { baseline: false, candidate: false },
    provenance: {
      baseline: provenance(BASE_REVISION),
      candidate: provenance(CANDIDATE_REVISION),
    },
    configuration,
    schedule: createComparisonSchedule(ratios.length, configuration.seed),
    blocks: ratios.map((ratio, index) => {
      const baseline = 100;
      const candidate = baseline * ratio;
      return {
        blockId: index + 1,
        processOrder: createComparisonSchedule(
          ratios.length,
          configuration.seed
        )[index].processOrder,
        startedAt: new Date(index * 1000).toISOString(),
        durationMs: 1,
        exitStatus: { baseline: 0, candidate: 0 },
        structuralValidity: true,
        observations: {
          baseline: {
            provenance: provenance(BASE_REVISION),
            configuration: { ...configuration },
            run: observation(baseline),
          },
          candidate: {
            provenance: provenance(CANDIDATE_REVISION),
            configuration: { ...configuration },
            run: observation(candidate),
          },
        },
      };
    }),
    ...overrides,
  };
}

function withConfiguration(source, changes) {
  const configuration = { ...source.configuration, ...changes };
  return {
    ...source,
    configuration,
    blocks: source.blocks.map((block) => ({
      ...block,
      observations: Object.fromEntries(
        Object.entries(block.observations).map(([side, wrapper]) => [
          side,
          { ...wrapper, configuration: { ...configuration } },
        ])
      ),
    })),
  };
}

test('a ratio interval spanning one is statistically inconclusive', () => {
  const result = analyzeComparison(
    artifact([0.95, 1.05, 0.98, 1.02, 1, 1.01, 0.99, 1.03, 0.97, 1])
  );
  assert.equal(result.total.statisticalDirection, 'inconclusive');
  assert.equal(result.overallVerdict, 'inconclusive');
});

test('a noisy distribution centered exactly at one remains inconclusive', () => {
  const result = analyzeComparison(
    artifact([0.8, 1.2, 0.9, 1.1, 0.95, 1.05, 0.85, 1.15, 0.98, 1.02])
  );
  assert.equal(result.total.statisticalDirection, 'inconclusive');
  assert.equal(result.overallVerdict, 'inconclusive');
});

test('a precise 1.01 ratio can be within the declared margin', () => {
  const result = analyzeComparison(artifact(Array(20).fill(1.01)));
  assert.equal(result.total.practicalConclusion, 'within-margin');
  assert.equal(result.total.statisticalDirection, 'slower');
  assert.equal(result.overallVerdict, 'inconclusive');
});

test('per-file rows are exploratory and cannot fail TOTAL', () => {
  const result = analyzeComparison(artifact(Array(20).fill(0.8)));
  assert.equal(result.total.statisticalDirection, 'faster');
  assert.equal(result.overallVerdict, 'improvement');
  assert.equal(result.rows[0].exploratory, true);
});

test('per-file summary corruption and missing corpus rows are rejected', () => {
  const valid = artifact(Array(20).fill(0.8));
  valid.blocks[0].observations.baseline.run.perFileSamples = {};
  valid.blocks[0].observations.baseline.run.summary.frameworks = [];
  assert.throws(
    () => analyzeComparison(valid),
    /selected corpus entries are required/
  );

  const corrupt = artifact(Array(20).fill(0.8));
  corrupt.blocks[0].observations.baseline.run.summary.frameworks[0].medianMs = 999;
  assert.throws(() => analyzeComparison(corrupt), /disagrees with raw samples/);
});

test('the schedule seed and block process orders are authenticated', () => {
  const scheduleTampered = artifact(Array(20).fill(0.8));
  scheduleTampered.schedule[0].processOrder.reverse();
  assert.throws(
    () => analyzeComparison(scheduleTampered),
    /schedule differs|process order differs/
  );

  const blockTampered = artifact(Array(20).fill(0.8));
  blockTampered.blocks[0].processOrder.reverse();
  assert.throws(
    () => analyzeComparison(blockTampered),
    /process order differs/
  );

  const seedTampered = artifact(Array(20).fill(0.8));
  seedTampered.configuration.seed = 'test-seed';
  assert.throws(() => analyzeComparison(seedTampered), /seed-derived schedule/);
});

test('observation provenance must match its side of top-level provenance', () => {
  const source = artifact(Array(20).fill(0.8));
  source.blocks[0].observations.baseline.provenance.cpu = 'different cpu';
  assert.throws(() => analyzeComparison(source), /provenance differs/);
});

test('observation configuration is required and must match the comparison', () => {
  const missing = artifact(Array(20).fill(0.8));
  delete missing.blocks[0].observations.candidate.configuration;
  assert.throws(() => analyzeComparison(missing), /configuration is required/);

  const different = artifact(Array(20).fill(0.8));
  different.blocks[0].observations.candidate.configuration.mode = 'stable';
  assert.throws(
    () => analyzeComparison(different),
    /configuration.mode differs/
  );
});

test('every corpus entry requires raw samples and output hashes on both sides', () => {
  const missingHash = artifact(Array(20).fill(0.8));
  delete missingHash.blocks[0].observations.baseline.run.outputHashes.fixture;
  assert.throws(() => analyzeComparison(missingHash), /output hash.*required/);

  const missingSamples = artifact(Array(20).fill(0.8));
  delete missingSamples.blocks[0].observations.candidate.run.perFileSamples
    .fixture;
  assert.throws(
    () => analyzeComparison(missingSamples),
    /do not match selected corpus/
  );
});

test('minimum blocks permit analysis but cannot produce a substantive verdict', () => {
  const source = artifact(Array(20).fill(0.8));
  const partial = {
    ...source,
    blocks: source.blocks.slice(0, 3),
    schedule: source.schedule.slice(0, 3),
    configuration: { ...source.configuration, actualBlocks: 3 },
  };
  const result = analyzeComparison(partial);
  assert.equal(result.total.statisticalDirection, 'faster');
  assert.equal(result.overallVerdict, 'inconclusive');
});

test('order interaction forces an inconclusive overall verdict', () => {
  const source = artifact(
    Array.from({ length: 20 }, (_, index) => (index % 2 ? 1.2 : 1))
  );
  const result = analyzeComparison(source);
  assert.equal(result.overallVerdict, 'inconclusive');
  assert.match(result.inconclusiveReason, /interaction/);
});

test('runtime and practical margins are independent', () => {
  const source = artifact(Array(20).fill(1.05));
  const regression = analyzeComparison(
    withConfiguration(source, { runtimeNonRegressionMargin: 1.02 })
  );
  assert.equal(regression.total.practicalConclusion, 'within-margin');
  assert.equal(regression.overallVerdict, 'regression');
  const withinRuntime = analyzeComparison(
    withConfiguration(source, { runtimeNonRegressionMargin: 1.1 })
  );
  assert.equal(withinRuntime.overallVerdict, 'inconclusive');
});

test('a structural failure prevents a performance verdict', () => {
  const source = artifact(Array(20).fill(0.8));
  const result = analyzeComparison({
    ...source,
    blocks: [
      {
        blockId: 1,
        processOrder: source.schedule[0].processOrder,
        startedAt: new Date().toISOString(),
        durationMs: 1,
        exitStatus: { baseline: 0, candidate: 1 },
        structuralValidity: false,
        observations: { baseline: source.blocks[0].observations.baseline },
      },
    ],
    configuration: { ...source.configuration, actualBlocks: 1 },
    schedule: source.schedule.slice(0, 1),
    provenance: { ...source.provenance, candidate: null },
    sourceTreeHash: { ...source.sourceTreeHash, candidate: null },
    lockfileHash: { ...source.lockfileHash, candidate: null },
    dirty: { ...source.dirty, candidate: null },
  });
  assert.equal(result.structuralFailure, true);
  assert.equal(result.overallVerdict, 'inconclusive');
});

test('analyzePairedComparison and analyzeIndependentSnapshots are separate public wrappers', () => {
  assert.equal(typeof analyzePairedComparison, 'function');
  assert.equal(typeof analyzeIndependentSnapshots, 'function');
  assert.equal(analyzeComparison, analyzePairedComparison);
});

test('exact output-hash approvals allow intentional changes in paired comparisons', () => {
  const source = artifact(Array(20).fill(1.0));
  const newHash = 'b'.repeat(64);
  for (const block of source.blocks) {
    block.observations.candidate.run.outputHashes.fixture = newHash;
    block.observations.candidate.run.summary.frameworks[0].outputHash = newHash;
  }
  const allowlist = new Map([['fixture', { base: HASH, candidate: newHash }]]);
  const approved = analyzePairedComparison(source, {
    outputHashAllowlist: allowlist,
  });
  assert.equal(approved.structuralFailure, false);
  assert.equal(approved.approvedOutputChanges?.length, 1);

  const unapproved = analyzePairedComparison(source);
  assert.equal(unapproved.structuralFailure, true);
});

test('estimatedBlocksNeeded targets precisionTarget using residual standard deviation', () => {
  const source = artifact(Array(20).fill(1.01));
  const result = analyzePairedComparison(source);
  assert.ok(result.precision.estimatedBlocksNeeded >= 1);
  assert.ok(Number.isInteger(result.precision.estimatedBlocksNeeded));
  assert.equal(
    result.precision.residualStandardDeviation,
    result.total.residualStandardDeviation
  );
});

test('order equivalence interval check conservatively flags carryover noise', () => {
  const source = artifact(
    Array.from({ length: 20 }, (_, index) => (index % 2 ? 1.2 : 1))
  );
  const result = analyzePairedComparison(source);
  assert.equal(result.total.orderIsStable, false);
  assert.equal(
    result.inconclusiveReason,
    'process-order interaction cannot be ruled out'
  );
});
