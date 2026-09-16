import { analyzeComparison } from './compare-analysis.mjs';
import { summaryStatistics } from './bench-stats.mjs';

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

const SCENARIOS = [
  { name: 'no-candidate-effect', effect: 0, sd: 0.02 },
  {
    name: 'exact-equivalence-boundary',
    truth: 'equivalence-boundary',
    effect: Math.log(1 / 1.1),
    sd: 0.01,
  },
  {
    name: 'regression-boundary',
    truth: 'regression-boundary',
    effect: Math.log(1.1),
    sd: 0.02,
  },
  { name: 'beyond-margin', effect: Math.log(1.2), sd: 0.02 },
  { name: 'low-variance', effect: 0.01, sd: 0.005 },
  { name: 'high-variance', effect: 0.01, sd: 0.12 },
  { name: 'skewed-outliers', effect: 0.01, sd: 0.04, skew: 0.25 },
  {
    name: 'correlated-endpoints',
    effect: 0.01,
    sd: 0.03,
    endpointNoise: 0.006,
  },
  { name: 'temporal-drift', effect: 0.01, sd: 0.02, drift: 0.003 },
  {
    name: 'sub-threshold-order-interaction',
    effect: 0.01,
    sd: 0.02,
    orderEffect: 0.02,
  },
  { name: 'baseline-first-penalty', effect: 0.01, sd: 0.02, orderEffect: 0.08 },
  {
    name: 'candidate-first-penalty',
    effect: 0.01,
    sd: 0.02,
    orderEffect: -0.08,
  },
  { name: 'large-order-interaction', effect: 0.01, sd: 0.02, orderEffect: 0.2 },
];

function randomFor(seed) {
  let state = seed % 4294967296;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function normal(random) {
  const u = Math.max(random(), Number.MIN_VALUE);
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function configuration(resamples, seed = 1) {
  return {
    superiorityConfidenceLevel: 0.95,
    equivalenceConfidenceLevel: 0.9,
    runtimeNonRegressionMargin: 1.1,
    practicalEquivalenceMargin: 1.1,
    bootstrapResamples: resamples,
    bootstrapSeed: `simulation-fixed-seed-${seed}`,
    minimumBlocks: 5,
    requestedBlocks: 80,
    precisionTarget: 0.05,
    orderInteractionThreshold: 0.05,
    intervalMethod: 'crossover-t-interval',
    analyzerVersion: '3.0.0',
    mode: 'stable',
    warmup: 20,
    iters: 3,
    actualBlocks: 80,
    preset: 'default',
    target: 'cssnano',
    case: null,
    corpusSelector: null,
    nodeEnv: 'production',
    seed: 'simulation-seed',
  };
}

export function simulatedArtifact(scenario, seed = 1, resamples = 500) {
  const random = randomFor(seed);
  const blocks = [];
  for (let index = 0; index < 80; index++) {
    const baselineFirst = index % 2 === 0;
    const drift = (index - 39.5) * (scenario.drift ?? 0);
    const outlierProbability = scenario.skew ?? 0;
    const outlierMagnitude = 0.25;
    const outlier = random() < outlierProbability ? outlierMagnitude : 0;
    // Center the mixture on the declared effect instead of moving its truth.
    const centeredOutlier = outlier - outlierProbability * outlierMagnitude;
    const noise = normal(random) * scenario.sd + centeredOutlier;
    const order = baselineFirst
      ? (scenario.orderEffect ?? 0)
      : -(scenario.orderEffect ?? 0);
    const logRatio = scenario.effect + drift + noise + order;
    const baseline = 100;
    const candidate = baseline * Math.exp(logRatio);
    blocks.push({
      blockId: index + 1,
      processOrder: baselineFirst
        ? ['baseline', 'candidate']
        : ['candidate', 'baseline'],
      startedAt: new Date(index * 1000).toISOString(),
      durationMs: 1,
      exitStatus: { baseline: 0, candidate: 0 },
      structuralValidity: true,
      observations: {
        baseline: {
          totalSamples: [baseline, baseline, baseline],
          perFileSamples: {
            fixture: [baseline, baseline, baseline],
            correlated: [baseline, baseline, baseline],
          },
          outputHashes: { fixture: HASH, correlated: HASH },
          summary: {
            total: {
              n: 3,
              minMs: baseline,
              medianMs: baseline,
              meanMs: baseline,
              p95Ms: baseline,
              maxMs: baseline,
            },
            frameworks: [{ name: 'fixture' }, { name: 'correlated' }],
          },
        },
        candidate: {
          totalSamples: [candidate, candidate, candidate],
          perFileSamples: {
            fixture: [candidate, candidate, candidate],
            correlated: [
              candidate *
                Math.exp(normal(random) * (scenario.endpointNoise ?? 0)),
              candidate *
                Math.exp(normal(random) * (scenario.endpointNoise ?? 0)),
              candidate *
                Math.exp(normal(random) * (scenario.endpointNoise ?? 0)),
            ],
          },
          outputHashes: { fixture: HASH, correlated: HASH },
          summary: {
            total: {
              n: 3,
              minMs: candidate,
              medianMs: candidate,
              meanMs: candidate,
              p95Ms: candidate,
              maxMs: candidate,
            },
            frameworks: [{ name: 'fixture' }, { name: 'correlated' }],
          },
        },
      },
    });
  }
  for (const block of blocks) {
    for (const side of ['baseline', 'candidate']) {
      const run = block.observations[side];
      run.summary = {
        total: summaryStatistics(run.totalSamples),
        frameworks: Object.entries(run.perFileSamples).map(
          ([name, samples]) => ({
            name,
            ...summaryStatistics(samples),
          })
        ),
      };
    }
    block.observations.baseline = {
      provenance: provenance(BASE_REVISION),
      configuration: configuration(resamples, seed),
      run: block.observations.baseline,
    };
    block.observations.candidate = {
      provenance: provenance(CANDIDATE_REVISION),
      configuration: configuration(resamples, seed),
      run: block.observations.candidate,
    };
  }
  return {
    schemaVersion: 3,
    artifactType: 'comparison',
    configuration: configuration(resamples, seed),
    createdAt: new Date(0).toISOString(),
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
    schedule: blocks.map((block) => ({
      blockId: block.blockId,
      processOrder: block.processOrder,
    })),
    blocks,
  };
}

// eslint-disable-next-line complexity
export function runCalibration({ replicates = 2_000, resamples = 100 } = {}) {
  const results = [];
  for (const scenario of SCENARIOS) {
    let regressions = 0;
    let withinMargin = 0;
    let inconclusive = 0;
    let covered = 0;
    let interactionDetected = 0;
    for (let replicate = 0; replicate < replicates; replicate++) {
      const analysis = analyzeComparison(
        simulatedArtifact(scenario, 0x9e3779b9 + replicate, resamples)
      );
      if (analysis.overallVerdict === 'regression') regressions++;
      if (analysis.total?.practicalConclusion === 'within-margin')
        withinMargin++;
      if (analysis.overallVerdict === 'inconclusive') inconclusive++;
      if (
        analysis.total &&
        analysis.total.confidenceInterval.low <= Math.exp(scenario.effect) &&
        analysis.total.confidenceInterval.high >= Math.exp(scenario.effect)
      ) {
        covered++;
      }
      if (
        analysis.total &&
        (!analysis.total.orderIsStable ||
          Math.abs(analysis.total.orderInteraction) >
            configuration(resamples).orderInteractionThreshold)
      )
        interactionDetected++;
    }
    results.push({
      scenario: scenario.name,
      falseRegressionRate:
        scenario.effect === 0 ? regressions / replicates : null,
      falseWithinMarginRate:
        scenario.effect > Math.log(1.1) ? withinMargin / replicates : null,
      inconclusiveRate: inconclusive / replicates,
      primaryIntervalCoverage:
        scenario.drift === undefined && scenario.orderEffect === undefined
          ? covered / replicates
          : null,
      orderInteractionDetection:
        scenario.orderEffect === undefined
          ? null
          : interactionDetected / replicates,
    });
  }
  return { seed: 0x9e3779b9, replicates, resamples, results };
}

if (process.argv[1]?.endsWith('/statistical-simulation.mjs')) {
  const calibration = runCalibration();
  const bands = {
    falseRegressionRate: { target: 0.05, low: 0, high: 0.065 },
    falseWithinMarginRate: { target: 0, low: 0, high: 0.065 },
    primaryIntervalCoverage: { target: 0.95, low: 0.935, high: 0.965 },
    orderInteractionDetection: { target: 1, low: 0.935, high: 1 },
  };
  let failed = false;
  for (const row of calibration.results) {
    for (const [metric, band] of Object.entries(bands)) {
      if (
        row[metric] === null ||
        (metric === 'orderInteractionDetection' &&
          row.scenario === 'sub-threshold-order-interaction')
      )
        continue;
      const pass = row[metric] >= band.low && row[metric] <= band.high;
      console.log(
        `${row.scenario} ${metric}: observed=${row[metric].toFixed(4)} target=${band.target} band=[${band.low}, ${band.high}] ${pass ? 'pass' : 'FAIL'}`
      );
      if (!pass) failed = true;
    }
  }
  console.log(JSON.stringify(calibration, null, 2));
  if (failed) process.exitCode = 1;
}
