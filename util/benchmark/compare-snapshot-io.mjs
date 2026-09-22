import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateProvenance } from './bench-provenance.mjs';
import {
  BOOTSTRAP_RESAMPLES,
  BOOTSTRAP_SEED,
  EQUIVALENCE_CONFIDENCE_LEVEL,
  MINIMUM_BLOCKS,
  ORDER_INTERACTION_THRESHOLD,
  PRECISION_TARGET,
  PRACTICAL_EQUIVALENCE_MARGIN,
  REQUESTED_BLOCKS,
  RUNTIME_NON_REGRESSION_MARGIN,
  SUPERIORITY_CONFIDENCE_LEVEL,
} from './bench-config.mjs';
import { summaryStatistics } from './bench-stats.mjs';

const RESULTS_DIR = join(import.meta.dirname, '..', '..', 'bench-results');

function resolveSnapshot(arg) {
  if (existsSync(arg)) return arg;
  const asLabel = join(RESULTS_DIR, `${arg}.json`);
  if (existsSync(asLabel)) return asLabel;
  throw new Error(
    `no snapshot found for "${arg}" (tried "${arg}" and "${asLabel}")`
  );
}

function validateFrameworks(snapshot, arg) {
  if (
    !Array.isArray(snapshot.frameworks) ||
    !snapshot.frameworks.length ||
    !snapshot.total ||
    !Number.isFinite(snapshot.total.medianMs)
  ) {
    throw new TypeError(`invalid benchmark snapshot: "${arg}"`);
  }
  if (snapshot.total.medianMs <= 0) {
    throw new RangeError(
      `benchmark snapshot total.medianMs must be positive numbers; received ${snapshot.total.medianMs} in "${arg}"`
    );
  }
  for (const framework of snapshot.frameworks) {
    if (
      typeof framework.name !== 'string' ||
      !Number.isFinite(framework.bytes) ||
      !Number.isFinite(framework.median ?? framework.medianMs)
    ) {
      throw new TypeError(`invalid benchmark entry in snapshot: "${arg}"`);
    }
    if (framework.bytes < 0) {
      throw new RangeError(
        `benchmark entry bytes must be a non-negative finite number; received ${framework.bytes} for "${framework.name}" in "${arg}"`
      );
    }
    const median = framework.median ?? framework.medianMs;
    if (median <= 0) {
      throw new RangeError(
        `benchmark entry medianMs must be positive numbers; received ${median} for "${framework.name}" in "${arg}"`
      );
    }
  }
  if (
    new Set(snapshot.frameworks.map((framework) => framework.name)).size !==
    snapshot.frameworks.length
  ) {
    throw new Error(`duplicate benchmark entry in snapshot: "${arg}"`);
  }
}

function validateSampleArray(samples, description) {
  if (samples === undefined) return;
  if (
    !Array.isArray(samples) ||
    !samples.length ||
    samples.some((sample) => !Number.isFinite(sample) || sample < 0)
  ) {
    throw new TypeError(
      `invalid benchmark samples for ${description}; expected non-negative finite numbers`
    );
  }
}

function exactNumber(actual, expected, description) {
  if (!Number.isFinite(actual) || actual !== expected) {
    throw new Error(
      `benchmark summary disagrees with raw samples for ${description}`
    );
  }
}

function exactStatistics(actual, samples, description) {
  const expected = summaryStatistics(samples);
  for (const field of ['n', 'minMs', 'medianMs', 'meanMs', 'p95Ms', 'maxMs']) {
    exactNumber(actual[field], expected[field], `${description}.${field}`);
  }
}

// eslint-disable-next-line complexity
function validateV3Configuration(configuration, arg) {
  if (!configuration || typeof configuration !== 'object') {
    throw new TypeError(`invalid v3 benchmark configuration: "${arg}"`);
  }
  const required = {
    superiorityConfidenceLevel: SUPERIORITY_CONFIDENCE_LEVEL,
    equivalenceConfidenceLevel: EQUIVALENCE_CONFIDENCE_LEVEL,
    runtimeNonRegressionMargin: RUNTIME_NON_REGRESSION_MARGIN,
    practicalEquivalenceMargin: PRACTICAL_EQUIVALENCE_MARGIN,
    bootstrapResamples: BOOTSTRAP_RESAMPLES,
    bootstrapSeed: BOOTSTRAP_SEED,
    minimumBlocks: MINIMUM_BLOCKS,
    requestedBlocks: REQUESTED_BLOCKS,
    precisionTarget: PRECISION_TARGET,
    orderInteractionThreshold: ORDER_INTERACTION_THRESHOLD,
    intervalMethod: 'stratified-percentile-bootstrap',
    analyzerVersion: '3.0.0',
    mode: null,
    warmup: null,
    iters: null,
    preset: null,
    target: null,
    case: null,
    corpusSelector: null,
    nodeEnv: null,
  };
  for (const field of Object.keys(required)) {
    if (!(field in configuration)) {
      throw new TypeError(
        `invalid v3 benchmark configuration.${field}: "${arg}"`
      );
    }
  }
  if (configuration.requestedBlocks < configuration.minimumBlocks) {
    throw new RangeError(
      `invalid v3 benchmark configuration block counts: "${arg}"`
    );
  }
  for (const field of [
    'superiorityConfidenceLevel',
    'equivalenceConfidenceLevel',
    'precisionTarget',
    'orderInteractionThreshold',
  ]) {
    if (
      !Number.isFinite(configuration[field]) ||
      configuration[field] <= 0 ||
      configuration[field] >= 1
    ) {
      throw new RangeError(
        `invalid v3 benchmark configuration.${field}: "${arg}"`
      );
    }
  }
  for (const field of [
    'runtimeNonRegressionMargin',
    'practicalEquivalenceMargin',
  ]) {
    if (!Number.isFinite(configuration[field]) || configuration[field] < 1) {
      throw new RangeError(
        `invalid v3 benchmark configuration.${field}: "${arg}"`
      );
    }
  }
  for (const field of [
    'bootstrapResamples',
    'minimumBlocks',
    'requestedBlocks',
  ]) {
    if (!Number.isInteger(configuration[field]) || configuration[field] < 1) {
      throw new RangeError(
        `invalid v3 benchmark configuration.${field}: "${arg}"`
      );
    }
  }
  if (
    typeof configuration.bootstrapSeed !== 'string' ||
    !configuration.bootstrapSeed
  ) {
    throw new TypeError(
      `invalid v3 benchmark configuration.bootstrapSeed: "${arg}"`
    );
  }
  if (!['quick', 'stable'].includes(configuration.mode)) {
    throw new RangeError(`invalid v3 benchmark configuration.mode: "${arg}"`);
  }
  if (!Number.isInteger(configuration.warmup) || configuration.warmup < 0) {
    throw new RangeError(`invalid v3 benchmark configuration.warmup: "${arg}"`);
  }
  if (!Number.isInteger(configuration.iters) || configuration.iters < 1) {
    throw new RangeError(`invalid v3 benchmark configuration.iters: "${arg}"`);
  }
  for (const field of ['preset', 'target', 'nodeEnv']) {
    if (typeof configuration[field] !== 'string' || !configuration[field]) {
      throw new TypeError(
        `invalid v3 benchmark configuration.${field}: "${arg}"`
      );
    }
  }
  for (const field of ['case', 'corpusSelector']) {
    const value = configuration[field];
    if (value === null) continue;
    if (Array.isArray(value)) {
      if (
        !value.length ||
        value.some((entry) => typeof entry !== 'string' || !entry)
      )
        throw new TypeError(
          `invalid v3 benchmark configuration.${field}: "${arg}"`
        );
      continue;
    }
    if (typeof value !== 'string')
      throw new TypeError(
        `invalid v3 benchmark configuration.${field}: "${arg}"`
      );
  }
  return configuration;
}

function validateV3Run(run, names, arg) {
  if (!Array.isArray(run.totalSamples) || !run.totalSamples.length) {
    throw new TypeError(
      `v3 benchmark run raw total samples are required: "${arg}"`
    );
  }
  validateSampleArray(run.totalSamples, `run ${run.index} total`);
  exactStatistics(
    run.summary.total,
    run.totalSamples,
    `run ${run.index} total`
  );
  if (!run.perFileSamples || typeof run.perFileSamples !== 'object') {
    throw new TypeError(
      `v3 benchmark run per-file raw samples are required: "${arg}"`
    );
  }
  for (const name of names) {
    validateSampleArray(run.perFileSamples[name], `run ${run.index} ${name}`);
    if (!run.perFileSamples[name]) {
      throw new TypeError(`missing v3 benchmark samples for ${name}: "${arg}"`);
    }
    const framework = run.summary.frameworks.find(
      (entry) => entry.name === name
    );
    if (!framework)
      throw new TypeError(`missing v3 benchmark summary for ${name}: "${arg}"`);
    exactStatistics(
      framework,
      run.perFileSamples[name],
      `run ${run.index} ${name}`
    );
  }
}

function quantile(values, q) {
  const index = (values.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return lower === upper
    ? values[lower]
    : values[lower] + (values[upper] - values[lower]) * (index - lower);
}

// eslint-disable-next-line complexity
export function loadSnapshot(arg) {
  const path = resolveSnapshot(arg);
  const snapshot = JSON.parse(readFileSync(path, 'utf8'));
  if (!snapshot || typeof snapshot !== 'object') {
    throw new TypeError(`invalid benchmark snapshot: "${arg}"`);
  }

  if (snapshot.schemaVersion !== 3) {
    throw new TypeError(`benchmark snapshot must use schema v3: "${arg}"`);
  }

  validateV3Configuration(snapshot.configuration, arg);
  validateProvenance(snapshot.provenance, {
    corpusHash: snapshot.corpusHash ?? snapshot.corpusManifest,
  });
  if (snapshot.corpusHash !== snapshot.corpusManifest) {
    throw new Error(`v3 corpusHash must equal corpusManifest: "${arg}"`);
  }
  validateFrameworks(snapshot, arg);
  if (!Array.isArray(snapshot.runs) || !snapshot.runs.length) {
    throw new TypeError(`invalid v3 benchmark runs in snapshot: "${arg}"`);
  }
  const names = snapshot.frameworks.map((framework) => framework.name);
  const hashes = new Map();
  for (const run of snapshot.runs) {
    if (
      !Number.isInteger(run.index) ||
      !run.summary?.total ||
      !Number.isFinite(run.summary.total.medianMs) ||
      !run.outputHashes ||
      !Array.isArray(run.summary.frameworks)
    ) {
      throw new TypeError(`invalid v3 benchmark run in snapshot: "${arg}"`);
    }
    validateV3Run(run, names, arg);
    for (const [name, hash] of Object.entries(run.outputHashes)) {
      if (hashes.has(name) && hashes.get(name) !== hash) {
        throw new Error(
          `v3 output hash changed between runs for "${name}": "${arg}"`
        );
      }
      hashes.set(name, hash);
    }
  }
  for (const [name, hash] of hashes) {
    if (snapshot.outputHashes?.[name] !== hash) {
      throw new Error(`v3 aggregate output hash disagrees with runs: "${arg}"`);
    }
  }
  exactNumber(
    snapshot.total.medianMs,
    quantile(
      snapshot.runs
        .map((run) => run.summary.total.medianMs)
        .toSorted((a, b) => a - b),
      0.5
    ),
    'aggregate total'
  );
  for (const framework of snapshot.frameworks) {
    exactNumber(
      framework.medianMs,
      quantile(
        snapshot.runs
          .map(
            (run) =>
              run.summary.frameworks.find(
                (entry) => entry.name === framework.name
              ).medianMs
          )
          .toSorted((a, b) => a - b),
        0.5
      ),
      `aggregate ${framework.name}`
    );
  }
  if (snapshot.gitRevision !== snapshot.provenance.gitRevision) {
    throw new Error(`v3 gitRevision disagrees with provenance: "${arg}"`);
  }
  return { ...snapshot, path };
}

export function stableJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  return JSON.stringify(value, Object.keys(value).toSorted());
}
