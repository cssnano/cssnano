import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { join } from 'node:path';
import { MINIMUM_CROSSOVER_BLOCKS } from './bench-defaults.js';
import { resolveBenchmarkTarget } from './bench-cases.js';
import { corpusSelectionArgs } from './bench-corpus.js';
import { median } from './bench-stats.js';
import { createComparisonSchedule } from './comparison-schedule.js';
import { analyzeComparison, interimTotalAnalysis } from './compare-analysis.js';

export function blockSummary(block, totalBlocks) {
  const sampleFor = (side) =>
    block.observations?.[side]?.run?.totalSamples ?? null;
  const baseline = sampleFor('baseline');
  const candidate = sampleFor('candidate');
  if (!baseline?.length || !candidate?.length) return null;
  return `block ${block.blockId}/${totalBlocks}: baseline ${Math.round(median(baseline))} ms, candidate ${Math.round(median(candidate))} ms`;
}

export function commandFor(
  config,
  side,
  blockId,
  directory,
  revision,
  resultsDir
) {
  const args = [
    join(directory, 'util/benchmark/bench.js'),
    `--mode=${config.mode}`,
    `--runs=1`,
    `--run-index=${blockId}`,
    `--revision=${revision}`,
    `--label=block-${blockId}-${side}`,
    `--results-dir=${resultsDir}`,
    `--seed=${config.seed}`,
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
  if (config.quietChild) args.push('--quiet');
  if (config.preset) args.push(`--preset=${config.preset}`);
  args.push(...corpusSelectionArgs(config));
  if (config.warmup !== undefined) args.push(`--warmup=${config.warmup}`);
  if (config.iters !== undefined) args.push(`--iters=${config.iters}`);
  if (config.pinCore !== null && config.pinCore !== undefined) {
    args.push(`--pin-core=${config.pinCore}`);
  }
  return args;
}

function runProcess(config, side, blockId, directory, revision, resultsDir) {
  const label = `block-${blockId}-${side}`;
  const startedAt = new Date().toISOString();
  const started = performance.now();
  try {
    const benchArgs = commandFor(
      config,
      side,
      blockId,
      directory,
      revision,
      resultsDir
    );
    let executable = process.execPath;
    let args = benchArgs;
    if (config.pinCore !== null && config.pinCore !== undefined) {
      if (typeof process.setAffinity === 'function') {
        try {
          process.setAffinity([config.pinCore]);
        } catch {
          // ignore or fall back
        }
      }
      if (process.platform === 'linux') {
        try {
          execFileSync('which', ['taskset'], { stdio: 'ignore' });
          executable = 'taskset';
          args = ['-c', String(config.pinCore), process.execPath, ...benchArgs];
        } catch {
          // taskset unavailable
        }
      }
    }
    execFileSync(executable, args, {
      cwd: directory,
      env: process.env,
      // Quiet children keep stdout suppressed; stderr stays visible so
      // failures are never hidden behind the coordinator summary.
      stdio: config.quietChild ? ['ignore', 'ignore', 'inherit'] : 'inherit',
    });
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

function validateComparisonBlockCounts(config) {
  if (!config.adaptive && config.blocks > config.requestedBlocks)
    throw new RangeError('--blocks must not exceed requested blocks');
  const [plannedName, plannedBlocks] = config.adaptive
    ? ['requested blocks', config.requestedBlocks]
    : ['blocks', config.blocks];
  if (plannedBlocks < MINIMUM_CROSSOVER_BLOCKS)
    throw new RangeError(
      `${plannedName} must be at least ${MINIMUM_CROSSOVER_BLOCKS} to estimate variance`
    );
  for (const [name, value] of [
    ['blocks', config.blocks],
    ['minimumBlocks', config.minimumBlocks],
    ['requestedBlocks', config.requestedBlocks],
  ]) {
    if (value % 2 !== 0)
      throw new RangeError(`${name} must be an even number of blocks`);
  }
}

function checkOutputHashes(observations, config, approvedOutputChanges) {
  if (!observations.baseline || !observations.candidate) return false;
  const baseHashes = observations.baseline.run.outputHashes ?? {};
  const candidateHashes = observations.candidate.run.outputHashes ?? {};
  const names = new Set([
    ...Object.keys(baseHashes),
    ...Object.keys(candidateHashes),
  ]);
  for (const name of names) {
    if (baseHashes[name] !== candidateHashes[name]) {
      const approved =
        config.outputHashAllowlist?.get?.(name) ??
        config.outputHashAllowlist?.[name];
      if (
        approved &&
        approved.base === baseHashes[name] &&
        approved.candidate === candidateHashes[name]
      ) {
        approvedOutputChanges.set(name, {
          base: baseHashes[name],
          candidate: candidateHashes[name],
        });
      } else {
        return true;
      }
    }
  }
  return false;
}

function buildComparisonArtifact(
  config,
  blocks,
  schedule,
  approvedOutputChanges,
  adaptiveStop,
  cooldown
) {
  const provenanceFor = (side) =>
    blocks.find((block) => block.observations?.[side]?.provenance)
      ?.observations[side].provenance;
  const baselineProvenance = provenanceFor('baseline');
  const candidateProvenance = provenanceFor('candidate');
  const getHash = (key) => ({
    baseline: baselineProvenance?.[key] ?? null,
    candidate: candidateProvenance?.[key] ?? null,
  });
  return {
    schemaVersion: 3,
    artifactType: 'comparison',
    createdAt: new Date().toISOString(),
    command: process.argv,
    gitRevision: {
      baseline: config.baseRevision,
      candidate: config.candidateRevision,
    },
    benchmarkHarnessHash: baselineProvenance?.benchmarkHarnessHash ?? null,
    sourceTreeHash: getHash('sourceTreeHash'),
    lockfileHash: getHash('lockfileHash'),
    corpusHash:
      baselineProvenance?.corpusHash ?? candidateProvenance?.corpusHash ?? null,
    dirty: getHash('dirty'),
    provenance: {
      baseline: baselineProvenance ?? null,
      candidate: candidateProvenance ?? null,
    },
    configuration: {
      superiorityConfidenceLevel: config.superiorityConfidenceLevel,
      equivalenceConfidenceLevel: config.equivalenceConfidenceLevel,
      runtimeNonRegressionMargin: config.runtimeNonRegressionMargin,
      practicalEquivalenceMargin: config.practicalEquivalenceMargin,
      minimumBlocks: config.minimumBlocks,
      requestedBlocks: config.requestedBlocks,
      precisionTarget: config.precisionTarget,
      orderInteractionThreshold: config.orderInteractionThreshold,
      intervalMethod: 'crossover-t-interval',
      analyzerVersion: '3.0.0',
      mode: config.mode,
      warmup: config.warmup,
      iters: config.iters,
      actualBlocks: blocks.length,
      preset: config.preset,
      case: config.case ?? null,
      corpusSelector: config.only ?? null,
      target: resolveBenchmarkTarget(config.case),
      seed: config.seed,
      nodeEnv: process.env.NODE_ENV ?? 'production',
      interBlockCooldownMs: cooldown,
    },
    approvedOutputChanges: [...approvedOutputChanges.entries()],
    adaptiveStop,
    schedule: schedule.slice(0, blocks.length),
    blocks,
  };
}

function checkAdaptiveStop(blocks, config, stopAfter, plannedBlocks) {
  if (
    !config.adaptive ||
    blocks.length < stopAfter ||
    blocks.length % 2 !== 0 ||
    blocks.length >= plannedBlocks
  ) {
    return null;
  }
  const interim = interimTotalAnalysis(blocks, config);
  if (interim && interim.confidenceIntervalWidth <= config.precisionTarget) {
    return {
      atBlock: blocks.length,
      confidenceIntervalWidth: interim.confidenceIntervalWidth,
      reason: 'requested precision reached',
    };
  }
  return null;
}

export function executeComparison(config, run = runProcess) {
  validateComparisonBlockCounts(config);
  mkdirSync(config.resultsDir, { recursive: true });
  const plannedBlocks = config.adaptive
    ? config.requestedBlocks
    : config.blocks;
  const cooldown = config.cooldown ?? 0;
  const schedule = createComparisonSchedule(plannedBlocks, config.seed);
  const stopAfter = Math.max(config.pilotBlocks ?? 0, config.minimumBlocks);
  const blocks = [];
  const approvedOutputChanges = new Map();
  let adaptiveStop = null;
  for (const scheduled of schedule) {
    if (cooldown > 0 && blocks.length > 0) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, cooldown);
    }
    const startedAt = new Date().toISOString();
    const blockStarted = performance.now();
    const observations = {};
    for (const side of scheduled.processOrder) {
      const isBase = side === 'baseline';
      const directory = isBase ? config.baseDir : config.candidateDir;
      const revision = isBase ? config.baseRevision : config.candidateRevision;
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
    if (!blockFailure) {
      blockFailure = checkOutputHashes(
        observations,
        config,
        approvedOutputChanges
      );
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
    if (config.quietChild) {
      const summary = blockSummary(block, plannedBlocks);
      if (summary) console.log(summary);
      else
        console.error(
          `block ${block.blockId}/${plannedBlocks}: failed (baseline exit ${block.exitStatus.baseline}, candidate exit ${block.exitStatus.candidate})`
        );
    }
    if (blockFailure) break;
    adaptiveStop = checkAdaptiveStop(blocks, config, stopAfter, plannedBlocks);
    if (adaptiveStop) break;
  }
  const artifact = buildComparisonArtifact(
    config,
    blocks,
    schedule,
    approvedOutputChanges,
    adaptiveStop,
    cooldown
  );
  writeFileSync(
    join(config.resultsDir, 'comparison-v3.json'),
    JSON.stringify(artifact, null, 2)
  );
  return artifact;
}

export function comparisonResultFor(config, artifact) {
  const analysis = analyzeComparison(artifact);
  const side = (name, path) => ({
    label: name,
    path,
    preset: artifact.configuration?.preset ?? 'unknown',
    target: artifact.configuration?.target ?? 'cssnano',
    corpusManifest: artifact.corpusHash,
    gitRevision: artifact.gitRevision?.[name],
    seed: artifact.configuration?.seed,
  });
  return {
    ...analysis,
    blocks: artifact.blocks,
    base: side('baseline', config.baseDir),
    candidate: side('candidate', config.candidateDir),
    maxRSS: null,
    warning: analysis.structuralFailure
      ? 'correctness or process failure; no performance verdict is available'
      : null,
  };
}
