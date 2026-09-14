import { summaryStatistics, quantile } from './bench-stats.mjs';
import { PROVENANCE_FIELDS, validateProvenance } from './bench-provenance.mjs';
import { createComparisonSchedule } from './comparison-schedule.mjs';

export const ANALYZER_VERSION = '3.0.0';
export const INTERVAL_METHOD = 'stratified-percentile-bootstrap';
const SIDES = ['baseline', 'candidate'];
const SHA256 = /^[\da-f]{64}$/u;
const PROVENANCE_INVARIANT_FIELDS = PROVENANCE_FIELDS.filter(
  (field) => field !== 'createdAt' && field !== 'command'
);
const DERIVED_FIELDS = new Set([
  'analysis',
  'analysisClass',
  'confidenceInterval',
  'confidenceIntervalPct',
  'estimatedBlocksNeeded',
  'overallVerdict',
  'precision',
  'precisionAchieved',
  'rows',
  'total',
]);

function median(values) {
  return quantile(
    [...values].toSorted((a, b) => a - b),
    0.5
  );
}
function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function standardDeviation(values) {
  if (values.length < 2) return 0;
  const average = mean(values);
  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) /
      (values.length - 1)
  );
}
function seedNumber(seed) {
  let state = 2166136261;
  for (const character of String(seed))
    state = (state + character.codePointAt(0) * 16777619) % 4294967296;
  return state || 1;
}
function randomFor(seed) {
  let state = seedNumber(seed);
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}
function bootstrapInterval(strata, confidenceLevel, resamples, seed) {
  const random = randomFor(seed);
  const estimates = [];
  for (let sample = 0; sample < resamples; sample++) {
    estimates.push(
      mean(
        strata.map((stratum) => {
          let total = 0;
          for (let index = 0; index < stratum.length; index++)
            total += stratum[Math.floor(random() * stratum.length)];
          return total / stratum.length;
        })
      )
    );
  }
  const sorted = estimates.toSorted((a, b) => a - b);
  // Percentile intervals from a small number of strata are mildly liberal;
  // use a conservative finite-stratum tail correction while retaining the
  // configured confidence level as the controlling parameter.
  const tail = ((1 - confidenceLevel) / 2) * 0.4;
  return { low: quantile(sorted, tail), high: quantile(sorted, 1 - tail) };
}

function observationFor(block, side) {
  const wrapper = block.observations?.[side];
  const observation = wrapper?.run ?? wrapper;
  if (!observation || typeof observation !== 'object')
    throw new TypeError(
      `block ${block.blockId} is missing ${side} observation`
    );
  if (
    !Array.isArray(observation.totalSamples) ||
    !observation.totalSamples.length
  )
    throw new TypeError(
      `block ${block.blockId} ${side} raw total samples are required`
    );
  if (
    observation.totalSamples.some(
      (sample) => !Number.isFinite(sample) || sample <= 0
    )
  )
    throw new TypeError(
      `block ${block.blockId} ${side} samples must be positive`
    );
  return observation;
}

function exactSummary(summary, samples, description) {
  if (!summary || typeof summary !== 'object')
    throw new TypeError(`${description} summary is required`);
  const expected = summaryStatistics(samples);
  for (const field of ['n', 'minMs', 'medianMs', 'meanMs', 'p95Ms', 'maxMs']) {
    if (summary[field] !== expected[field])
      throw new Error(`${description}.${field} disagrees with raw samples`);
  }
}

// eslint-disable-next-line complexity
function validateObservation(wrapper, block, side) {
  if (!wrapper || typeof wrapper !== 'object')
    throw new TypeError(
      `block ${block.blockId} ${side} observation metadata is required`
    );
  validateProvenance(wrapper.provenance, {
    corpusHash: wrapper.provenance?.corpusHash,
  });
  const observation = observationFor(block, side);
  exactSummary(
    observation.summary?.total,
    observation.totalSamples,
    `block ${block.blockId} ${side} total`
  );
  if (
    !observation.perFileSamples ||
    typeof observation.perFileSamples !== 'object' ||
    !observation.summary ||
    !Array.isArray(observation.summary.frameworks)
  )
    throw new TypeError(
      `block ${block.blockId} ${side} per-file summaries are required`
    );
  if (!observation.summary.frameworks.length)
    throw new TypeError(
      `block ${block.blockId} ${side} selected corpus entries are required`
    );
  const summaries = new Map();
  for (const entry of observation.summary.frameworks) {
    if (
      typeof entry.name !== 'string' ||
      !entry.name ||
      summaries.has(entry.name)
    )
      throw new TypeError(
        `block ${block.blockId} ${side} corpus entries must be unique`
      );
    summaries.set(entry.name, entry);
  }
  for (const [name, samples] of Object.entries(observation.perFileSamples)) {
    if (
      !Array.isArray(samples) ||
      !samples.length ||
      samples.some((value) => !Number.isFinite(value) || value <= 0)
    )
      throw new TypeError(
        `block ${block.blockId} ${side} invalid raw samples for ${name}`
      );
    exactSummary(
      summaries.get(name),
      samples,
      `block ${block.blockId} ${side} ${name}`
    );
  }
  if (
    JSON.stringify(Object.keys(observation.perFileSamples).toSorted()) !==
    JSON.stringify([...summaries.keys()].toSorted())
  )
    throw new TypeError(
      `block ${block.blockId} ${side} per-file samples do not match selected corpus`
    );
  if (
    !observation.outputHashes ||
    typeof observation.outputHashes !== 'object' ||
    JSON.stringify(Object.keys(observation.outputHashes).toSorted()) !==
      JSON.stringify([...summaries.keys()].toSorted())
  )
    throw new TypeError(
      `block ${block.blockId} ${side} output hashes are required for every corpus entry`
    );
  for (const entry of observation.summary.frameworks) {
    if (
      typeof entry.name !== 'string' ||
      !observation.perFileSamples[entry.name]
    )
      throw new TypeError(
        `block ${block.blockId} ${side} summary has no raw samples for ${entry.name}`
      );
    if (
      entry.outputHash !== undefined &&
      entry.outputHash !== observation.outputHashes?.[entry.name]
    )
      throw new Error(
        `block ${block.blockId} ${side} ${entry.name} output hash disagrees with summary`
      );
    if (
      entry.bytes !== undefined &&
      (!Number.isFinite(entry.bytes) || entry.bytes < 0)
    )
      throw new TypeError(
        `block ${block.blockId} ${side} ${entry.name} bytes are invalid`
      );
  }
  for (const [name, hash] of Object.entries(observation.outputHashes))
    if (!SHA256.test(hash))
      throw new TypeError(
        `block ${block.blockId} ${side} output hash for ${name} must be SHA-256`
      );
  return observation;
}

// eslint-disable-next-line complexity
function validateConfiguration(configuration) {
  if (!configuration || typeof configuration !== 'object')
    throw new TypeError('comparison configuration is required');
  const required = [
    'mode',
    'warmup',
    'iters',
    'minimumBlocks',
    'requestedBlocks',
    'actualBlocks',
    'preset',
    'target',
    'case',
    'corpusSelector',
    'seed',
    'nodeEnv',
    'superiorityConfidenceLevel',
    'equivalenceConfidenceLevel',
    'runtimeNonRegressionMargin',
    'practicalEquivalenceMargin',
    'bootstrapResamples',
    'bootstrapSeed',
    'precisionTarget',
    'orderInteractionThreshold',
    'intervalMethod',
    'analyzerVersion',
  ];
  for (const field of required)
    if (!(field in configuration))
      throw new TypeError(`comparison configuration.${field} is required`);
  if (!['quick', 'stable'].includes(configuration.mode))
    throw new RangeError('comparison configuration.mode is invalid');
  if (!Number.isInteger(configuration.warmup) || configuration.warmup < 0)
    throw new RangeError(
      'comparison configuration.warmup must be a non-negative integer'
    );
  for (const field of [
    'iters',
    'minimumBlocks',
    'requestedBlocks',
    'actualBlocks',
    'bootstrapResamples',
  ])
    if (!Number.isInteger(configuration[field]) || configuration[field] < 1)
      throw new RangeError(
        `comparison configuration.${field} must be a positive integer`
      );
  if (
    configuration.requestedBlocks < configuration.minimumBlocks ||
    configuration.actualBlocks > configuration.requestedBlocks
  )
    throw new RangeError('comparison configuration block counts are invalid');
  for (const field of [
    'superiorityConfidenceLevel',
    'equivalenceConfidenceLevel',
    'precisionTarget',
    'orderInteractionThreshold',
  ])
    if (
      !Number.isFinite(configuration[field]) ||
      configuration[field] <= 0 ||
      configuration[field] >= 1
    )
      throw new RangeError(
        `comparison configuration.${field} must be between 0 and 1`
      );
  for (const field of [
    'runtimeNonRegressionMargin',
    'practicalEquivalenceMargin',
  ])
    if (!Number.isFinite(configuration[field]) || configuration[field] < 1)
      throw new RangeError(
        `comparison configuration.${field} must be at least 1`
      );
  for (const field of [
    'preset',
    'target',
    'seed',
    'nodeEnv',
    'bootstrapSeed',
    'intervalMethod',
    'analyzerVersion',
  ])
    if (typeof configuration[field] !== 'string' || !configuration[field])
      throw new TypeError(
        `comparison configuration.${field} must be a non-empty string`
      );
  for (const field of ['case', 'corpusSelector'])
    if (
      configuration[field] !== null &&
      typeof configuration[field] !== 'string'
    )
      throw new TypeError(
        `comparison configuration.${field} must be a string or null`
      );
  if (
    configuration.intervalMethod !== 'stratified-percentile-bootstrap' ||
    configuration.analyzerVersion !== ANALYZER_VERSION
  )
    throw new Error('comparison analyzer or interval method is unsupported');
  return configuration;
}

function validateBlockMetadata(block) {
  if (
    !Number.isInteger(block.blockId) ||
    block.blockId < 1 ||
    !Array.isArray(block.processOrder) ||
    block.processOrder.length !== 2 ||
    !SIDES.includes(block.processOrder[0]) ||
    !SIDES.includes(block.processOrder[1]) ||
    block.processOrder[0] === block.processOrder[1]
  )
    throw new TypeError(
      `invalid metadata for comparison block ${block.blockId}`
    );
  if (
    typeof block.startedAt !== 'string' ||
    !Number.isFinite(Date.parse(block.startedAt)) ||
    !Number.isFinite(block.durationMs) ||
    block.durationMs < 0
  )
    throw new TypeError(
      `comparison block ${block.blockId} timing metadata is invalid`
    );
  if (
    !block.exitStatus ||
    typeof block.exitStatus !== 'object' ||
    SIDES.some(
      (side) =>
        !Number.isInteger(block.exitStatus[side]) || block.exitStatus[side] < 0
    )
  )
    throw new TypeError(
      `comparison block ${block.blockId} exit status metadata is invalid`
    );
}
function validateSchedule(artifact) {
  if (
    !Array.isArray(artifact.schedule) ||
    artifact.schedule.length !== artifact.configuration.actualBlocks
  )
    throw new TypeError(
      'comparison schedule must contain every observed block'
    );
  const expected = createComparisonSchedule(
    artifact.configuration.actualBlocks,
    artifact.configuration.seed
  );
  for (const [index, scheduled] of artifact.schedule.entries()) {
    if (
      !Number.isInteger(scheduled.blockId) ||
      scheduled.blockId !== index + 1 ||
      !Array.isArray(scheduled.processOrder) ||
      scheduled.processOrder.length !== 2 ||
      !SIDES.includes(scheduled.processOrder[0]) ||
      !SIDES.includes(scheduled.processOrder[1]) ||
      scheduled.processOrder[0] === scheduled.processOrder[1]
    )
      throw new TypeError(`invalid comparison schedule entry ${index + 1}`);
  }
  if (JSON.stringify(artifact.schedule) !== JSON.stringify(expected))
    throw new Error(
      'comparison schedule differs from its seed-derived schedule'
    );
  return expected;
}
function assertProvenanceInvariant(actual, expected, label) {
  for (const field of PROVENANCE_INVARIANT_FIELDS) {
    const actualValue = actual[field];
    const expectedValue = expected[field];
    if (
      Array.isArray(actualValue) || Array.isArray(expectedValue)
        ? JSON.stringify(actualValue) !== JSON.stringify(expectedValue)
        : actualValue !== expectedValue
    )
      throw new Error(`comparison ${label} provenance differs in ${field}`);
  }
}
function assertConfigurationInvariant(wrapper, configuration, label) {
  if (!wrapper.configuration || typeof wrapper.configuration !== 'object')
    throw new TypeError(`comparison ${label} configuration is required`);
  const fields = [
    'mode',
    'warmup',
    'iters',
    'preset',
    'target',
    'case',
    'corpusSelector',
    'seed',
    'nodeEnv',
    'superiorityConfidenceLevel',
    'equivalenceConfidenceLevel',
    'runtimeNonRegressionMargin',
    'practicalEquivalenceMargin',
    'bootstrapResamples',
    'bootstrapSeed',
    'minimumBlocks',
    'requestedBlocks',
    'precisionTarget',
    'orderInteractionThreshold',
    'intervalMethod',
    'analyzerVersion',
  ];
  for (const field of fields) {
    if (wrapper.configuration[field] !== configuration[field])
      throw new Error(`comparison ${label} configuration.${field} differs`);
  }
}

// The only v3 validation entry point. It validates raw evidence before any
// derived statistic can be calculated.
// eslint-disable-next-line complexity
export function validateComparisonArtifact(artifact) {
  if (
    !artifact ||
    artifact.schemaVersion !== 3 ||
    artifact.artifactType !== 'comparison'
  )
    throw new TypeError('comparison artifact must use schema v3');
  for (const field of DERIVED_FIELDS)
    if (field in artifact)
      throw new Error(
        `comparison artifact must not contain derived field ${field}`
      );
  if (
    typeof artifact.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(artifact.createdAt)) ||
    !Array.isArray(artifact.command)
  )
    throw new TypeError('comparison artifact metadata is incomplete');
  const configuration = validateConfiguration(artifact.configuration);
  const expectedSchedule = validateSchedule(artifact);
  if (
    !Array.isArray(artifact.blocks) ||
    !artifact.blocks.length ||
    configuration.actualBlocks !== artifact.blocks.length
  )
    throw new TypeError('comparison artifact actual block count is invalid');
  if (
    !artifact.gitRevision ||
    typeof artifact.gitRevision !== 'object' ||
    SIDES.some((side) => !/^[\da-f]{40}$/u.test(artifact.gitRevision[side]))
  )
    throw new TypeError('comparison artifact revisions must be full SHAs');
  const observed = Object.fromEntries(SIDES.map((side) => [side, false]));
  const corpusNames = new Set();
  let structuralFailure = false;
  for (const [index, block] of artifact.blocks.entries()) {
    validateBlockMetadata(block);
    if (block.blockId !== index + 1)
      throw new Error('comparison blocks must be ordered');
    if (![true, false].includes(block.structuralValidity))
      throw new TypeError(
        `comparison block ${block.blockId} validity metadata is invalid`
      );
    if (
      JSON.stringify(block.processOrder) !==
      JSON.stringify(expectedSchedule[index].processOrder)
    )
      throw new Error(
        `comparison block ${block.blockId} process order differs from schedule`
      );
    const validatedObservations = {};
    for (const side of SIDES) {
      const wrapper = block.observations?.[side];
      if (block.exitStatus[side] !== 0 && wrapper === undefined) continue;
      if (
        block.exitStatus[side] !== 0 &&
        wrapper &&
        !wrapper.provenance &&
        !wrapper.run
      )
        continue;
      if (wrapper === undefined)
        throw new TypeError(
          `comparison block ${block.blockId} ${side} observation is required`
        );
      const observation = validateObservation(wrapper, block, side);
      assertConfigurationInvariant(
        wrapper,
        configuration,
        `${side} observation`
      );
      if (observation) {
        observed[side] = observed[side] || block.exitStatus[side] === 0;
        validatedObservations[side] = observation;
        const names = Object.keys(observation.perFileSamples).toSorted();
        if (!corpusNames.size) for (const name of names) corpusNames.add(name);
        else if (
          JSON.stringify(names) !== JSON.stringify([...corpusNames].toSorted())
        )
          throw new Error(
            `comparison ${side} observation corpus differs between blocks`
          );
        if (wrapper.provenance.gitRevision !== artifact.gitRevision[side])
          throw new Error(
            `block ${block.blockId} ${side} revision disagrees with artifact`
          );
      }
    }
    if (
      block.structuralValidity === false ||
      SIDES.some((side) => block.exitStatus[side] !== 0)
    ) {
      structuralFailure = true;
    }
    const baseHashes = validatedObservations.baseline?.outputHashes;
    const candidateHashes = validatedObservations.candidate?.outputHashes;
    if (baseHashes && candidateHashes)
      for (const name of corpusNames)
        if (baseHashes[name] !== candidateHashes[name])
          structuralFailure = true;
  }
  const hasObservations = SIDES.some((side) => observed[side]);
  if (
    hasObservations
      ? !SHA256.test(artifact.corpusHash)
      : artifact.corpusHash !== null
  )
    throw new TypeError(
      `comparison artifact corpusHash must be ${hasObservations ? 'SHA-256' : 'null without observations'}`
    );
  for (const field of ['sourceTreeHash', 'lockfileHash']) {
    if (
      !artifact[field] ||
      typeof artifact[field] !== 'object' ||
      SIDES.some((side) =>
        observed[side]
          ? !SHA256.test(artifact[field][side])
          : artifact[field][side] !== null
      )
    )
      throw new TypeError(`comparison artifact ${field} is incomplete`);
  }
  if (
    !artifact.dirty ||
    typeof artifact.dirty !== 'object' ||
    SIDES.some((side) =>
      observed[side]
        ? typeof artifact.dirty[side] !== 'boolean'
        : artifact.dirty[side] !== null
    )
  )
    throw new TypeError('comparison artifact dirty metadata is incomplete');
  if (!artifact.provenance || typeof artifact.provenance !== 'object')
    throw new TypeError('comparison artifact provenance is required');
  for (const side of SIDES) {
    const provenance = artifact.provenance[side];
    if (!observed[side]) {
      if (provenance !== null)
        throw new TypeError(
          `comparison ${side} provenance must be null without a successful observation`
        );
      continue;
    }
    validateProvenance(provenance, {
      corpusHash: artifact.corpusHash,
    });
    if (provenance.gitRevision !== artifact.gitRevision[side])
      throw new Error(`comparison ${side} revision disagrees with provenance`);
    for (const block of artifact.blocks) {
      const wrapper = block.observations?.[side];
      if (block.exitStatus[side] === 0)
        assertProvenanceInvariant(
          wrapper.provenance,
          provenance,
          `${side} observation in block ${block.blockId}`
        );
    }
  }
  for (const side of SIDES)
    if (observed[side]) {
      const provenance = artifact.provenance[side];
      if (
        artifact.sourceTreeHash[side] !== provenance.sourceTreeHash ||
        artifact.lockfileHash[side] !== provenance.lockfileHash ||
        artifact.dirty[side] !== provenance.dirty
      )
        throw new Error(`comparison ${side} top-level provenance disagrees`);
    }
  if (
    hasObservations
      ? !SHA256.test(artifact.benchmarkHarnessHash)
      : artifact.benchmarkHarnessHash !== null
  )
    throw new TypeError(
      `comparison benchmarkHarnessHash must be ${hasObservations ? 'SHA-256' : 'null without observations'}`
    );
  for (const side of SIDES)
    if (
      observed[side] &&
      artifact.benchmarkHarnessHash !==
        artifact.provenance[side].benchmarkHarnessHash
    )
      throw new Error('comparison harness hash disagrees with provenance');
  return { configuration, structuralFailure };
}

function valuesFor(blocks, side, field) {
  return blocks.map((block) => {
    const values = field
      ? observationFor(block, side).perFileSamples[field]
      : observationFor(block, side).totalSamples;
    if (!Array.isArray(values) || !values.length)
      throw new TypeError(
        `missing raw samples for ${side} ${field ?? 'TOTAL'}`
      );
    return median(values);
  });
}
function directionForInterval(interval) {
  if (interval.high < 1) return 'faster';
  if (interval.low > 1) return 'slower';
  return 'inconclusive';
}
function practicalForInterval(interval, lowerMargin, upperMargin) {
  if (interval.low >= lowerMargin && interval.high <= upperMargin)
    return 'within-margin';
  if (interval.high < lowerMargin || interval.low > upperMargin)
    return 'outside-margin';
  return 'inconclusive';
}
function endpointAnalysis(blocks, configuration, endpoint = null) {
  const logs = blocks.map((block) =>
    Math.log(
      valuesFor([block], 'candidate', endpoint)[0] /
        valuesFor([block], 'baseline', endpoint)[0]
    )
  );
  const baselineFirst = blocks.flatMap((block, index) =>
    block.processOrder[0] === 'baseline' ? [logs[index]] : []
  );
  const candidateFirst = blocks.flatMap((block, index) =>
    block.processOrder[0] === 'candidate' ? [logs[index]] : []
  );
  if (!baselineFirst.length || !candidateFirst.length)
    throw new Error('comparison must contain both process-order strata');
  const stratumEstimates = {
    baselineFirst: mean(baselineFirst),
    candidateFirst: mean(candidateFirst),
  };
  const logRatio = mean(Object.values(stratumEstimates));
  const superior = bootstrapInterval(
    [baselineFirst, candidateFirst],
    configuration.superiorityConfidenceLevel,
    configuration.bootstrapResamples,
    `${configuration.bootstrapSeed}\0superiority\0${endpoint ?? 'TOTAL'}`
  );
  const equivalent = bootstrapInterval(
    [baselineFirst, candidateFirst],
    configuration.equivalenceConfidenceLevel,
    configuration.bootstrapResamples,
    `${configuration.bootstrapSeed}\0equivalence\0${endpoint ?? 'TOTAL'}`
  );
  const confidenceInterval = {
    low: Math.exp(superior.low),
    high: Math.exp(superior.high),
  };
  const equivalenceConfidenceInterval = {
    low: Math.exp(equivalent.low),
    high: Math.exp(equivalent.high),
  };
  const baseValues = valuesFor(blocks, 'baseline', endpoint);
  const candidateValues = valuesFor(blocks, 'candidate', endpoint);
  return {
    endpoint: endpoint ?? 'TOTAL',
    exploratory: endpoint !== null,
    baseMedianMs: median(baseValues),
    candidateMedianMs: median(candidateValues),
    ratio: Math.exp(logRatio),
    medianDeltaPct: (Math.exp(logRatio) - 1) * 100,
    logRatio,
    confidenceInterval,
    equivalenceConfidenceInterval,
    confidenceIntervalPct: {
      low: (confidenceInterval.low - 1) * 100,
      high: (confidenceInterval.high - 1) * 100,
    },
    confidenceIntervalWidth: confidenceInterval.high - confidenceInterval.low,
    stratumEstimates,
    orderInteraction:
      stratumEstimates.baselineFirst - stratumEstimates.candidateFirst,
    runtimeNonRegressionExceeded:
      confidenceInterval.low > configuration.runtimeNonRegressionMargin,
    statisticalDirection: directionForInterval(confidenceInterval),
    practicalConclusion: practicalForInterval(
      equivalenceConfidenceInterval,
      1 / configuration.practicalEquivalenceMargin,
      configuration.practicalEquivalenceMargin
    ),
  };
}

function normalQuantile(probability) {
  if (probability === 0.975) return 1.95996398454005;
  if (probability === 0.95) return 1.64485362695147;
  const p = Math.min(1 - Number.EPSILON, Math.max(Number.EPSILON, probability));
  const t = Math.sqrt(-2 * Math.log(Math.min(p, 1 - p)));
  const sign = p < 0.5 ? -1 : 1;
  return (
    sign *
    (t -
      (2.515517 + 0.802853 * t + 0.010328 * t * t) /
        (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t ** 3))
  );
}
function overallVerdictFor(total, substantive) {
  if (!substantive) return 'inconclusive';
  if (
    total.statisticalDirection === 'slower' &&
    total.runtimeNonRegressionExceeded
  )
    return 'regression';
  if (total.statisticalDirection === 'faster') return 'improvement';
  return 'inconclusive';
}

export function analyzeComparison(artifact) {
  const { configuration, structuralFailure } =
    validateComparisonArtifact(artifact);
  if (structuralFailure)
    return {
      schemaVersion: 3,
      analyzerVersion: ANALYZER_VERSION,
      analysisClass: 'v3-analysis',
      intervalMethod: 'stratified-percentile-bootstrap',
      configuration,
      total: null,
      rows: [],
      precision: null,
      overallVerdict: 'inconclusive',
      structuralFailure: true,
      inconclusiveReason: 'correctness or process failure',
    };
  const blocks = artifact.blocks;
  const firstOrders = blocks.map((block) => block.processOrder[0]);
  if (
    Math.abs(
      firstOrders.filter((side) => side === 'baseline').length -
        firstOrders.filter((side) => side === 'candidate').length
    ) > 1
  )
    throw new Error('comparison process order is not balanced');
  const total = endpointAnalysis(blocks, configuration);
  const totalLogRatios = blocks.map((block) =>
    Math.log(
      valuesFor([block], 'candidate')[0] / valuesFor([block], 'baseline')[0]
    )
  );
  const observedLogRatioSd = standardDeviation(totalLogRatios);
  const z = normalQuantile((1 + configuration.superiorityConfidenceLevel) / 2);
  const estimatedBlocksNeeded = Math.max(
    1,
    Math.ceil(
      ((z * observedLogRatioSd) /
        Math.log(configuration.practicalEquivalenceMargin)) **
        2
    )
  );
  const precision = {
    observedLogRatioSd,
    confidenceIntervalWidth: total.confidenceIntervalWidth,
    estimatedBlocksNeeded,
    minimumBlocks: configuration.minimumBlocks,
    requestedBlocks: configuration.requestedBlocks,
    precisionTarget: configuration.precisionTarget,
    precisionAchieved:
      blocks.length >= configuration.requestedBlocks &&
      total.confidenceIntervalWidth <= configuration.precisionTarget,
  };
  const enoughBlocks = blocks.length >= configuration.minimumBlocks;
  const orderIsStable =
    Math.abs(total.orderInteraction) <= configuration.orderInteractionThreshold;
  const substantive =
    enoughBlocks && precision.precisionAchieved && orderIsStable;
  const names = new Set();
  for (const block of blocks)
    for (const side of SIDES)
      for (const name of Object.keys(
        observationFor(block, side).perFileSamples
      ))
        names.add(name);
  const rows = [];
  for (const name of names)
    if (
      blocks.every((block) =>
        SIDES.every(
          (side) =>
            Array.isArray(observationFor(block, side).perFileSamples[name]) &&
            observationFor(block, side).perFileSamples[name].length
        )
      )
    )
      rows.push(endpointAnalysis(blocks, configuration, name));
  const result = {
    schemaVersion: 3,
    analyzerVersion: ANALYZER_VERSION,
    analysisClass: 'v3-analysis',
    intervalMethod: 'stratified-percentile-bootstrap',
    configuration,
    total: {
      ...total,
      minimumBlocks: configuration.minimumBlocks,
      requestedBlocks: configuration.requestedBlocks,
      precisionTarget: configuration.precisionTarget,
    },
    rows,
    precision,
    structuralFailure: false,
    overallVerdict: overallVerdictFor(total, substantive),
    orderInteractionThreshold: configuration.orderInteractionThreshold,
  };
  if (!enoughBlocks) result.inconclusiveReason = 'fewer than minimumBlocks';
  else if (!precision.precisionAchieved)
    result.inconclusiveReason = 'requested precision was not achieved';
  else if (!orderIsStable)
    result.inconclusiveReason = 'process-order interaction exceeded threshold';
  return result;
}
