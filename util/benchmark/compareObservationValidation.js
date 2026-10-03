import { summaryStatistics } from './bench-stats.js';
import { isOptionalStringOrStringList } from './bench-defaults.js';
import { validateProvenance } from './bench-provenance.js';

export const ANALYZER_VERSION = '3.0.0';
export const INTERVAL_METHOD = 'crossover-t-interval';
export const SIDES = ['baseline', 'candidate'];
export const SHA256 = /^[\da-f]{64}$/v;

export function metadataEquals(actual, expected) {
  if (Array.isArray(actual) || Array.isArray(expected)) {
    return JSON.stringify(actual ?? null) === JSON.stringify(expected ?? null);
  }
  return actual === expected;
}

export function observationFor(block, side) {
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

function getObservationSummaries(observation, block, side) {
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
  return summaries;
}

function validatePerFileSamples(observation, block, side, summaries) {
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
}

function validateObservationHashes(observation, block, side, summaries) {
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
}

export function validateObservation(wrapper, block, side) {
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
  const summaries = getObservationSummaries(observation, block, side);
  validatePerFileSamples(observation, block, side, summaries);
  validateObservationHashes(observation, block, side, summaries);
  return observation;
}

function validateConfigurationBlockCounts(configuration) {
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
}

function validateConfigurationThresholds(configuration) {
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
}

function validateConfigurationStrings(configuration) {
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
    if (isOptionalStringOrStringList(configuration[field])) continue;
    if (Array.isArray(configuration[field]))
      throw new TypeError(
        `comparison configuration.${field} must be non-empty strings`
      );
    throw new TypeError(
      `comparison configuration.${field} must be a string, an array of strings, or null`
    );
  }
  if (
    configuration.intervalMethod !== INTERVAL_METHOD ||
    configuration.analyzerVersion !== ANALYZER_VERSION
  )
    throw new Error('comparison analyzer or interval method is unsupported');
}

export function validateConfiguration(configuration) {
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
  validateConfigurationBlockCounts(configuration);
  validateConfigurationThresholds(configuration);
  validateConfigurationStrings(configuration);
  return configuration;
}
