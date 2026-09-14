import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { join, resolve } from 'node:path';
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
  MODES,
} from './bench-config.mjs';
import { createComparisonSchedule } from './comparison-schedule.mjs';

// eslint-disable-next-line complexity
function options(argv) {
  const values = {};
  for (const argument of argv.filter((value) => value !== '--')) {
    const match = argument.match(/^--([^=]+)=(.*)$/u);
    if (!match) throw new Error(`expected --name=value, received ${argument}`);
    values[match[1]] = match[2];
  }
  const positive = (name, fallback) => {
    const value = Number(values[name] ?? fallback);
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`--${name} must be a positive integer`);
    }
    return value;
  };
  const number = (name, fallback) => Number(values[name] ?? fallback);
  const result = {
    baseDir: resolve(values['base-dir']),
    candidateDir: resolve(values['candidate-dir']),
    resultsDir: resolve(values['results-dir']),
    baseRevision: values['base-revision'],
    candidateRevision: values['candidate-revision'],
    blocks: positive('blocks', REQUESTED_BLOCKS),
    minimumBlocks: positive('minimum-blocks', MINIMUM_BLOCKS),
    requestedBlocks: positive('requested-blocks', REQUESTED_BLOCKS),
    seed: values.seed ?? 'cssnano-benchmark-v3',
    bootstrapSeed: values['bootstrap-seed'] ?? BOOTSTRAP_SEED,
    preset: values.preset ?? 'default',
    case: values.case,
    only: values.only,
    mode: values.mode ?? 'stable',
    warmup: Number(values.warmup ?? MODES[values.mode ?? 'stable']?.warmup),
    iters: Number(values.iters ?? MODES[values.mode ?? 'stable']?.iters),
    bootstrapResamples: positive('bootstrap-resamples', BOOTSTRAP_RESAMPLES),
    precisionTarget: number('precision-target', PRECISION_TARGET),
    orderInteractionThreshold: number(
      'order-interaction-threshold',
      ORDER_INTERACTION_THRESHOLD
    ),
    superiorityConfidenceLevel: number(
      'superiority-confidence-level',
      SUPERIORITY_CONFIDENCE_LEVEL
    ),
    equivalenceConfidenceLevel: number(
      'equivalence-confidence-level',
      EQUIVALENCE_CONFIDENCE_LEVEL
    ),
    runtimeNonRegressionMargin: number(
      'runtime-non-regression-margin',
      RUNTIME_NON_REGRESSION_MARGIN
    ),
    practicalEquivalenceMargin: number(
      'practical-equivalence-margin',
      PRACTICAL_EQUIVALENCE_MARGIN
    ),
  };
  if (!result.baseRevision || !result.candidateRevision) {
    throw new Error('--base-revision and --candidate-revision are required');
  }
  if (result.requestedBlocks < result.minimumBlocks) {
    throw new Error('--requested-blocks must be at least --minimum-blocks');
  }
  if (result.blocks > result.requestedBlocks) {
    throw new Error('--blocks must not exceed --requested-blocks');
  }
  if (!MODES[result.mode]) throw new Error(`--mode must be quick or stable`);
  for (const [name, value] of [
    ['warmup', result.warmup],
    ['iters', result.iters],
  ]) {
    if (!Number.isInteger(value) || value < (name === 'warmup' ? 0 : 1))
      throw new Error(
        `--${name} must be a ${name === 'warmup' ? 'non-negative' : 'positive'} integer`
      );
  }
  for (const [name, value] of [
    ['precision-target', result.precisionTarget],
    ['order-interaction-threshold', result.orderInteractionThreshold],
    ['superiority-confidence-level', result.superiorityConfidenceLevel],
    ['equivalence-confidence-level', result.equivalenceConfidenceLevel],
  ]) {
    if (!Number.isFinite(value) || value <= 0 || value >= 1)
      throw new Error(`--${name} must be between 0 and 1`);
  }
  for (const [name, value] of [
    ['runtime-non-regression-margin', result.runtimeNonRegressionMargin],
    ['practical-equivalence-margin', result.practicalEquivalenceMargin],
  ]) {
    if (!Number.isFinite(value) || value < 1)
      throw new Error(`--${name} must be at least 1`);
  }
  return result;
}

function commandFor(config, side, blockId, directory, revision, resultsDir) {
  const args = [
    join(directory, 'util/benchmark/bench.mjs'),
    `--mode=${config.mode}`,
    `--runs=1`,
    `--revision=${revision}`,
    `--label=block-${blockId}-${side}`,
    `--results-dir=${resultsDir}`,
    `--seed=${config.seed}`,
    `--bootstrap-seed=${config.bootstrapSeed}`,
    `--bootstrap-resamples=${config.bootstrapResamples}`,
    `--minimum-blocks=${config.minimumBlocks}`,
    `--requested-blocks=${config.requestedBlocks}`,
    `--precision-target=${config.precisionTarget}`,
    `--order-interaction-threshold=${config.orderInteractionThreshold}`,
    `--superiority-confidence-level=${config.superiorityConfidenceLevel}`,
    `--equivalence-confidence-level=${config.equivalenceConfidenceLevel}`,
    `--runtime-non-regression-margin=${config.runtimeNonRegressionMargin}`,
    `--practical-equivalence-margin=${config.practicalEquivalenceMargin}`,
    '--summary',
  ];
  if (config.preset) args.push(`--preset=${config.preset}`);
  if (config.case) args.push(`--case=${config.case}`);
  if (config.only) args.push(`--only=${config.only}`);
  if (config.warmup !== undefined) args.push(`--warmup=${config.warmup}`);
  if (config.iters !== undefined) args.push(`--iters=${config.iters}`);
  return args;
}

function runProcess(config, side, blockId, directory, revision, resultsDir) {
  const label = `block-${blockId}-${side}`;
  const startedAt = new Date().toISOString();
  const started = performance.now();
  try {
    execFileSync(
      process.execPath,
      commandFor(config, side, blockId, directory, revision, resultsDir),
      { cwd: directory, env: process.env, stdio: 'inherit' }
    );
    const snapshot = JSON.parse(
      readFileSync(join(resultsDir, `${label}.json`), 'utf8')
    );
    return {
      startedAt,
      durationMs: performance.now() - started,
      exitStatus: 0,
      structuralValidity: true,
      provenance: snapshot.provenance,
      configuration: snapshot.configuration,
      run: snapshot.runs[0],
    };
  } catch (error) {
    return {
      startedAt,
      durationMs: performance.now() - started,
      exitStatus: error.status ?? 1,
      structuralValidity: false,
      error: String(error.message ?? error),
    };
  }
}

// eslint-disable-next-line complexity
export function executeComparison(config, run = runProcess) {
  if (config.blocks > config.requestedBlocks)
    throw new RangeError('--blocks must not exceed requested blocks');
  mkdirSync(config.resultsDir, { recursive: true });
  const schedule = createComparisonSchedule(config.blocks, config.seed);
  const blocks = [];
  for (const scheduled of schedule) {
    const startedAt = new Date().toISOString();
    const blockStarted = performance.now();
    const observations = {};
    for (const side of scheduled.processOrder) {
      const directory =
        side === 'baseline' ? config.baseDir : config.candidateDir;
      const revision =
        side === 'baseline' ? config.baseRevision : config.candidateRevision;
      observations[side] = run(
        config,
        side,
        scheduled.blockId,
        directory,
        revision,
        config.resultsDir
      );
    }
    let blockFailure = Object.values(observations).some(
      (observation) => !observation.structuralValidity
    );
    if (!blockFailure && observations.baseline && observations.candidate) {
      const baseHashes = observations.baseline.run.outputHashes ?? {};
      const candidateHashes = observations.candidate.run.outputHashes ?? {};
      const names = new Set([
        ...Object.keys(baseHashes),
        ...Object.keys(candidateHashes),
      ]);
      if (
        [...names].some((name) => baseHashes[name] !== candidateHashes[name])
      ) {
        blockFailure = true;
      }
    }
    const block = {
      blockId: scheduled.blockId,
      processOrder: scheduled.processOrder,
      startedAt,
      durationMs: performance.now() - blockStarted,
      exitStatus: Object.fromEntries(
        Object.entries(observations).map(([side, value]) => [
          side,
          value.exitStatus,
        ])
      ),
      structuralValidity:
        !blockFailure &&
        Object.values(observations).every((value) => value.structuralValidity),
      observations,
    };
    blocks.push(block);
    if (blockFailure) break;
  }
  const provenanceFor = (side) =>
    blocks.find((block) => block.observations?.[side]?.provenance)
      ?.observations[side].provenance;
  const baselineProvenance = provenanceFor('baseline');
  const candidateProvenance = provenanceFor('candidate');
  const artifact = {
    schemaVersion: 3,
    artifactType: 'comparison',
    createdAt: new Date().toISOString(),
    command: process.argv,
    gitRevision: {
      baseline: config.baseRevision,
      candidate: config.candidateRevision,
    },
    benchmarkHarnessHash: baselineProvenance?.benchmarkHarnessHash ?? null,
    sourceTreeHash: {
      baseline: baselineProvenance?.sourceTreeHash ?? null,
      candidate: candidateProvenance?.sourceTreeHash ?? null,
    },
    lockfileHash: {
      baseline: baselineProvenance?.lockfileHash ?? null,
      candidate: candidateProvenance?.lockfileHash ?? null,
    },
    corpusHash:
      baselineProvenance?.corpusHash ?? candidateProvenance?.corpusHash ?? null,
    dirty: {
      baseline: baselineProvenance?.dirty ?? null,
      candidate: candidateProvenance?.dirty ?? null,
    },
    provenance: {
      baseline: baselineProvenance ?? null,
      candidate: candidateProvenance ?? null,
    },
    configuration: {
      superiorityConfidenceLevel: config.superiorityConfidenceLevel,
      equivalenceConfidenceLevel: config.equivalenceConfidenceLevel,
      runtimeNonRegressionMargin: config.runtimeNonRegressionMargin,
      practicalEquivalenceMargin: config.practicalEquivalenceMargin,
      bootstrapResamples: config.bootstrapResamples,
      bootstrapSeed: config.bootstrapSeed,
      minimumBlocks: config.minimumBlocks,
      requestedBlocks: config.requestedBlocks,
      precisionTarget: config.precisionTarget,
      orderInteractionThreshold: config.orderInteractionThreshold,
      intervalMethod: 'stratified-percentile-bootstrap',
      analyzerVersion: '3.0.0',
      mode: config.mode,
      warmup: config.warmup,
      iters: config.iters,
      actualBlocks: blocks.length,
      preset: config.preset,
      case: config.case ?? null,
      corpusSelector: config.only ?? null,
      target: config.case ?? 'cssnano',
      seed: config.seed,
      nodeEnv: process.env.NODE_ENV ?? 'production',
    },
    schedule: schedule.slice(0, blocks.length),
    blocks,
  };
  writeFileSync(
    join(config.resultsDir, 'comparison-v3.json'),
    JSON.stringify(artifact, null, 2)
  );
  return artifact;
}

async function main() {
  const config = options(process.argv.slice(2));
  const artifact = executeComparison(config);
  console.log(`wrote ${join(config.resultsDir, 'comparison-v3.json')}`);
  if (artifact.blocks.some((block) => !block.structuralValidity))
    process.exitCode = 1;
}

if (process.argv[1]?.endsWith('/compare-revisions.mjs')) {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
