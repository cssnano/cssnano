import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { benchmarkCases } from './bench-cases.mjs';
import './bench-environment.mjs';
import { assertRevision } from './bench-provenance.mjs';

const require = createRequire(import.meta.url);
const cssnano = require('../../packages/cssnano/src/index.js');

const DEFAULT_RESULTS_DIR = join(
  import.meta.dirname,
  '..',
  '..',
  'bench-results'
);

export const MODES = {
  quick: { warmup: 0, iters: 1, reliability: 'smoke' },
  stable: { warmup: 20, iters: 100, reliability: 'reliable' },
};

export const SUPERIORITY_CONFIDENCE_LEVEL = 0.95;
export const EQUIVALENCE_CONFIDENCE_LEVEL = 0.9;
export const RUNTIME_NON_REGRESSION_MARGIN = 1.1;
export const PRACTICAL_EQUIVALENCE_MARGIN = 1.1;
export const MINIMUM_BLOCKS = 5;
export const REQUESTED_BLOCKS = 20;
export const PRECISION_TARGET = 0.05;
export const ORDER_INTERACTION_THRESHOLD = 0.05;
export const BOOTSTRAP_SEED = 'cssnano-benchmark-v3';
export const BOOTSTRAP_RESAMPLES = 10_000;

function positiveInteger(value, name, allowZero = false) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || (!allowZero && number === 0)) {
    throw new Error(
      `${name} must be a ${allowZero ? 'non-negative' : 'positive'} integer`
    );
  }
  return number;
}

function validateArgs(args) {
  if (!args.label || /[\\\/]/v.test(args.label)) {
    throw new Error('--label must be a non-empty filename component');
  }
  if (!['default', 'advanced', 'lite'].includes(args.preset)) {
    throw new Error(
      `unknown preset "${args.preset}"; expected default, advanced, or lite`
    );
  }
  if (args.case && !benchmarkCases[args.case]) {
    throw new Error(`unknown benchmark case "${args.case}"`);
  }
  if (args.case && args.dir) {
    throw new Error('--case and --dir cannot be used together');
  }
  if (args.mode && !MODES[args.mode]) {
    throw new Error(`unknown mode "${args.mode}"; expected quick or stable`);
  }
  if (args.runs < 1) throw new Error('--runs must be a positive integer');
  if (args.profile && args.runs !== 1) {
    throw new Error('--profile requires exactly one process run');
  }
  if (!args.seed) throw new Error('--seed must be a non-empty string');
  if (args.revision !== null && !/^[\da-f]{40}$/v.test(args.revision)) {
    throw new Error('--revision must be a validated full commit SHA');
  }
  if (args.revision !== null) assertRevision(args.revision);
  if (args.mode === 'stable' && args.revision === null) {
    throw new Error('--revision is required for stable benchmarks');
  }
}

export function createBenchmarkProcessor(args) {
  const benchmarkCase = args.case ? benchmarkCases[args.case] : null;
  return benchmarkCase?.createProcessor
    ? () => benchmarkCase.createProcessor()
    : () => cssnano({ preset: args.preset });
}

// eslint-disable-next-line complexity
export function resolveBenchmarkArgs(argv = process.argv.slice(2)) {
  const { values } = parseArgs({
    args: argv.filter((arg) => arg !== '--'),
    options: {
      label: { type: 'string', default: 'baseline' },
      iters: { type: 'string' },
      warmup: { type: 'string' },
      only: { type: 'string' },
      dir: { type: 'string' },
      'results-dir': { type: 'string', default: DEFAULT_RESULTS_DIR },
      profile: { type: 'boolean', default: false },
      preset: { type: 'string', default: 'default' },
      case: { type: 'string' },
      mode: { type: 'string' },
      compare: { type: 'string' },
      markdown: { type: 'string' },
      seed: { type: 'string', default: 'cssnano-benchmark-v3' },
      'bootstrap-seed': { type: 'string', default: BOOTSTRAP_SEED },
      'bootstrap-resamples': {
        type: 'string',
        default: String(BOOTSTRAP_RESAMPLES),
      },
      'minimum-blocks': { type: 'string', default: String(MINIMUM_BLOCKS) },
      'requested-blocks': {
        type: 'string',
        default: String(REQUESTED_BLOCKS),
      },
      'precision-target': {
        type: 'string',
        default: String(PRECISION_TARGET),
      },
      'order-interaction-threshold': {
        type: 'string',
        default: String(ORDER_INTERACTION_THRESHOLD),
      },
      'superiority-confidence-level': {
        type: 'string',
        default: String(SUPERIORITY_CONFIDENCE_LEVEL),
      },
      'equivalence-confidence-level': {
        type: 'string',
        default: String(EQUIVALENCE_CONFIDENCE_LEVEL),
      },
      'runtime-non-regression-margin': {
        type: 'string',
        default: String(RUNTIME_NON_REGRESSION_MARGIN),
      },
      'practical-equivalence-margin': {
        type: 'string',
        default: String(PRACTICAL_EQUIVALENCE_MARGIN),
      },
      summary: { type: 'boolean', default: false },
      runs: { type: 'string', default: '5' },
      'child-run': { type: 'boolean', default: false },
      'run-index': { type: 'string', default: '1' },
      revision: { type: 'string' },
      'pin-core': { type: 'string' },
    },
  });
  const mode = values.mode ?? 'stable';
  const modeDefaults = MODES[mode] ?? MODES.stable;
  const args = {
    label: values.label,
    iters: positiveInteger(
      values.iters ?? String(modeDefaults.iters),
      '--iters'
    ),
    warmup: positiveInteger(
      values.warmup ?? String(modeDefaults.warmup),
      '--warmup',
      true
    ),
    only: values.only ?? null,
    dir: values.dir ?? null,
    resultsDir: resolve(values['results-dir']),
    profile: values.profile,
    preset: values.preset,
    case: values.case ?? null,
    mode,
    compare: values.compare ?? null,
    markdown: values.markdown ?? null,
    seed: values.seed,
    bootstrapSeed: values['bootstrap-seed'],
    bootstrapResamples: positiveInteger(
      values['bootstrap-resamples'],
      '--bootstrap-resamples'
    ),
    minimumBlocks: positiveInteger(
      values['minimum-blocks'],
      '--minimum-blocks'
    ),
    requestedBlocks: positiveInteger(
      values['requested-blocks'],
      '--requested-blocks'
    ),
    precisionTarget: Number(values['precision-target']),
    orderInteractionThreshold: Number(values['order-interaction-threshold']),
    superiorityConfidenceLevel: Number(values['superiority-confidence-level']),
    equivalenceConfidenceLevel: Number(values['equivalence-confidence-level']),
    runtimeNonRegressionMargin: Number(values['runtime-non-regression-margin']),
    practicalEquivalenceMargin: Number(values['practical-equivalence-margin']),
    summary: values.summary,
    runs: positiveInteger(values.runs, '--runs'),
    childRun: values['child-run'],
    runIndex: positiveInteger(values['run-index'], '--run-index'),
    revision: values.revision ?? null,
    pinCore:
      values['pin-core'] !== undefined
        ? positiveInteger(values['pin-core'], '--pin-core', true)
        : null,
  };
  for (const [name, value] of [
    ['--precision-target', args.precisionTarget],
    ['--order-interaction-threshold', args.orderInteractionThreshold],
    ['--superiority-confidence-level', args.superiorityConfidenceLevel],
    ['--equivalence-confidence-level', args.equivalenceConfidenceLevel],
  ]) {
    if (!Number.isFinite(value) || value <= 0 || value >= 1) {
      throw new Error(`${name} must be a number between 0 and 1`);
    }
  }
  for (const [name, value] of [
    ['--runtime-non-regression-margin', args.runtimeNonRegressionMargin],
    ['--practical-equivalence-margin', args.practicalEquivalenceMargin],
  ]) {
    if (!Number.isFinite(value) || value < 1) {
      throw new Error(`${name} must be a finite number of at least 1`);
    }
  }
  if (args.requestedBlocks < args.minimumBlocks) {
    throw new Error('--requested-blocks must be at least --minimum-blocks');
  }
  validateArgs(args);
  return args;
}
