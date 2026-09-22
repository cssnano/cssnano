import {
  fitCrossoverModel,
  median,
  normalQuantile,
  standardDeviation,
  studentTQuantile,
  summaryStatistics,
} from './bench-stats.mjs';
import { PROVENANCE_FIELDS, validateProvenance } from './bench-provenance.mjs';
import { createComparisonSchedule } from './comparison-schedule.mjs';

const ANALYZER_VERSION = '3.0.0';
const INTERVAL_METHOD = 'crossover-t-interval';
const SIDES = ['baseline', 'candidate'];
const SHA256 = /^[\da-f]{64}$/v;
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
  'precisionConclusion',
  'rows',
  'total',
  'verdictBasis',
]);

function metadataEquals(actual, expected) {
  if (Array.isArray(actual) || Array.isArray(expected)) {
    return JSON.stringify(actual ?? null) === JSON.stringify(expected ?? null);
  }
  return actual === expected;
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
    'interBlockCooldownMs',
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
  if (
    !Number.isInteger(configuration.interBlockCooldownMs) ||
    configuration.interBlockCooldownMs < 0
  )
    throw new RangeError(
      'comparison configuration.interBlockCooldownMs must be a non-negative integer'
    );
  if (
    configuration.minimumBlocks % 2 !== 0 ||
    configuration.requestedBlocks % 2 !== 0
  )
    throw new RangeError('comparison block counts must be even');
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
    'intervalMethod',
    'analyzerVersion',
  ])
    if (typeof configuration[field] !== 'string' || !configuration[field])
      throw new TypeError(
        `comparison configuration.${field} must be a non-empty string`
      );
  for (const field of ['case', 'corpusSelector']) {
    const value = configuration[field];
    if (value === null) continue;
    if (Array.isArray(value)) {
      if (
        !value.length ||
        value.some((entry) => typeof entry !== 'string' || !entry)
      )
        throw new TypeError(
          `comparison configuration.${field} must be non-empty strings`
        );
      continue;
    }
    if (typeof value !== 'string')
      throw new TypeError(
        `comparison configuration.${field} must be a string, an array of strings, or null`
      );
  }
  if (
    configuration.intervalMethod !== INTERVAL_METHOD ||
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
    'minimumBlocks',
    'requestedBlocks',
    'precisionTarget',
    'orderInteractionThreshold',
    'intervalMethod',
    'analyzerVersion',
  ];
  for (const field of fields) {
    if (!metadataEquals(wrapper.configuration[field], configuration[field]))
      throw new Error(`comparison ${label} configuration.${field} differs`);
  }
}

// The only v3 validation entry point. It validates raw evidence before any
// derived statistic can be calculated.
// eslint-disable-next-line complexity
export function validateComparisonArtifact(artifact, options = {}) {
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
  const approvedOutputChanges = new Map();
  if (
    !Array.isArray(artifact.blocks) ||
    !artifact.blocks.length ||
    configuration.actualBlocks !== artifact.blocks.length
  )
    throw new TypeError('comparison artifact actual block count is invalid');
  if (
    !artifact.gitRevision ||
    typeof artifact.gitRevision !== 'object' ||
    SIDES.some((side) => !/^[\da-f]{40}$/v.test(artifact.gitRevision[side]))
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
      for (const name of corpusNames) {
        if (baseHashes[name] !== candidateHashes[name]) {
          const approved =
            options?.outputHashAllowlist?.get?.(name) ??
            options?.outputHashAllowlist?.[name] ??
            artifact.approvedOutputChanges?.find?.(
              (entry) => (entry.name ?? entry[0]) === name
            );
          const approvedBase = approved?.base ?? approved?.[1]?.base;
          const approvedCandidate =
            approved?.candidate ?? approved?.[1]?.candidate;
          if (
            approved &&
            approvedBase === baseHashes[name] &&
            approvedCandidate === candidateHashes[name]
          ) {
            approvedOutputChanges.set(name, {
              base: baseHashes[name],
              candidate: candidateHashes[name],
            });
          } else {
            structuralFailure = true;
          }
        }
      }
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
  return {
    configuration,
    structuralFailure,
    approvedOutputChanges: [...approvedOutputChanges.entries()],
  };
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
  const model = fitCrossoverModel({
    baselineFirstLogs: baselineFirst,
    candidateFirstLogs: candidateFirst,
    superiorityConfidenceLevel: configuration.superiorityConfidenceLevel,
    equivalenceConfidenceLevel: configuration.equivalenceConfidenceLevel,
    orderInteractionThreshold: configuration.orderInteractionThreshold,
  });
  const baseValues = valuesFor(blocks, 'baseline', endpoint);
  const candidateValues = valuesFor(blocks, 'candidate', endpoint);
  const logRatio = model.treatmentEffect;
  const ratio = Math.exp(logRatio);
  return {
    endpoint: endpoint ?? 'TOTAL',
    exploratory: endpoint !== null,
    baseMedianMs: median(baseValues),
    candidateMedianMs: median(candidateValues),
    ratio,
    medianDeltaPct: (ratio - 1) * 100,
    logRatio,
    confidenceInterval: model.confidenceInterval,
    equivalenceConfidenceInterval: model.equivalenceConfidenceInterval,
    confidenceIntervalPct: {
      low: (model.confidenceInterval.low - 1) * 100,
      high: (model.confidenceInterval.high - 1) * 100,
    },
    confidenceIntervalWidth:
      model.confidenceInterval.high - model.confidenceInterval.low,
    stratumEstimates: model.stratumEstimates,
    orderInteraction: model.orderEffect,
    orderConfidenceInterval: model.orderConfidenceInterval,
    orderIsStable: model.orderIsStable,
    residualStandardDeviation: model.residualStandardDeviation,
    degreesOfFreedom: model.degreesOfFreedom,
    runtimeNonRegressionExceeded:
      model.confidenceInterval.low > configuration.runtimeNonRegressionMargin,
    statisticalDirection: directionForInterval(model.confidenceInterval),
    practicalConclusion: practicalForInterval(
      model.equivalenceConfidenceInterval,
      1 / configuration.practicalEquivalenceMargin,
      configuration.practicalEquivalenceMargin
    ),
  };
}

// Precision is a property of the interval, not of the requested block count:
// adaptive scheduling stops once the interval is tight enough.
function precisionAchievedFor(total, configuration) {
  return total.confidenceIntervalWidth <= configuration.precisionTarget;
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

// eslint-disable-next-line complexity
export function analyzePairedComparison(artifact, options = {}) {
  const { configuration, structuralFailure, approvedOutputChanges } =
    validateComparisonArtifact(artifact, options);
  if (structuralFailure)
    return {
      schemaVersion: 3,
      analyzerVersion: ANALYZER_VERSION,
      analysisClass: 'v3-analysis',
      intervalMethod: configuration.intervalMethod ?? INTERVAL_METHOD,
      configuration,
      total: null,
      rows: [],
      precision: null,
      precisionConclusion: 'not-achieved',
      verdictBasis: {
        direction: 'inconclusive',
        precision: 'not-achieved',
        order: 'unknown',
        blocks: 'unknown',
      },
      overallVerdict: 'inconclusive',
      structuralFailure: true,
      inconclusiveReason: 'correctness or process failure',
      approvedOutputChanges,
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
  const ratioHat = total.ratio;
  const deltaLog = 0.5 * Math.log(1 + configuration.precisionTarget / ratioHat);
  const tAlpha =
    total.degreesOfFreedom > 0
      ? studentTQuantile(
          1 - (1 - configuration.superiorityConfidenceLevel) / 2,
          total.degreesOfFreedom
        )
      : normalQuantile((1 + configuration.superiorityConfidenceLevel) / 2);
  const estimatedBlocksNeeded =
    deltaLog > 0 && total.residualStandardDeviation > 0
      ? Math.max(
          1,
          Math.ceil(
            ((tAlpha * total.residualStandardDeviation) / deltaLog) ** 2
          )
        )
      : 1;
  const precision = {
    observedLogRatioSd,
    residualStandardDeviation: total.residualStandardDeviation,
    confidenceIntervalWidth: total.confidenceIntervalWidth,
    estimatedBlocksNeeded,
    minimumBlocks: configuration.minimumBlocks,
    requestedBlocks: configuration.requestedBlocks,
    precisionTarget: configuration.precisionTarget,
    precisionAchieved: precisionAchievedFor(total, configuration),
  };
  const enoughBlocks = blocks.length >= configuration.minimumBlocks;
  const orderIsStable = total.orderIsStable;
  const substantive =
    enoughBlocks && precision.precisionAchieved && orderIsStable;
  // The verdict taxonomy separates signal (direction) from readiness
  // (precision, blocks, order) so a precise "faster" is never called noise.
  const verdictBasis = {
    direction: total.statisticalDirection,
    precision: precision.precisionAchieved ? 'achieved' : 'not-achieved',
    order: orderIsStable ? 'stable' : 'interaction',
    blocks: enoughBlocks ? 'sufficient' : 'insufficient',
  };
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
    intervalMethod: configuration.intervalMethod ?? INTERVAL_METHOD,
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
    precisionConclusion: precision.precisionAchieved
      ? 'achieved'
      : 'not-achieved',
    verdictBasis,
    overallVerdict: overallVerdictFor(total, substantive),
    orderInteractionThreshold: configuration.orderInteractionThreshold,
    approvedOutputChanges,
  };
  if (!enoughBlocks) result.inconclusiveReason = 'fewer than minimumBlocks';
  else if (!precision.precisionAchieved)
    result.inconclusiveReason = 'requested precision was not achieved';
  else if (!orderIsStable)
    result.inconclusiveReason = 'process-order interaction cannot be ruled out';
  return result;
}

// Unvalidated interim view of the TOTAL endpoint, used by adaptive scheduling
// to decide whether further blocks can still change the conclusion.
export function interimTotalAnalysis(blocks, configuration) {
  if (
    !Array.isArray(blocks) ||
    blocks.length < 2 ||
    !blocks.every(
      (block) => block.observations?.baseline && block.observations?.candidate
    )
  ) {
    return null;
  }
  try {
    return endpointAnalysis(blocks, configuration);
  } catch {
    // An incomplete or unbalanced interim schedule carries no precision signal.
    return null;
  }
}

export const analyzeComparison = analyzePairedComparison;
export { analyzeIndependentSnapshots } from './compare-snapshots.mjs';
