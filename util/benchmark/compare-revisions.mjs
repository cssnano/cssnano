import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { join, resolve } from 'node:path';
import {
  EQUIVALENCE_CONFIDENCE_LEVEL,
  INTER_BLOCK_COOLDOWN_MS,
  MINIMUM_BLOCKS,
  ORDER_INTERACTION_THRESHOLD,
  PRECISION_TARGET,
  PRACTICAL_EQUIVALENCE_MARGIN,
  REQUESTED_BLOCKS,
  RUNTIME_NON_REGRESSION_MARGIN,
  SUPERIORITY_CONFIDENCE_LEVEL,
  MODES,
} from './bench-config.mjs';
import { resolveBenchmarkTarget } from './bench-cases.mjs';
import { readCpuGovernor, warnUnstableGovernor } from './bench-provenance.mjs';
import { median } from './bench-stats.mjs';
import { createComparisonSchedule } from './comparison-schedule.mjs';
import {
  analyzeComparison,
  interimTotalAnalysis,
} from './compare-analysis.mjs';
import { markdownComparison, printComparison } from './compare-report.mjs';
import { cleanupWorktree } from './prepare-worktree.mjs';
import { runPreflight } from './compare-preflight.mjs';

const BARE_FLAGS = new Set([
  '--adaptive',
  '--no-adaptive',
  '--preflight',
  '--no-preflight',
  '--quiet-child',
  '--verbose-child',
  '--report',
  '--no-report',
]);

// eslint-disable-next-line complexity
function options(argv) {
  const values = {};
  const outputHashAllowlist = new Map();
  const cleanupDirs = [];
  const bare = new Set();
  for (const argument of argv.filter((value) => value !== '--')) {
    if (BARE_FLAGS.has(argument)) {
      bare.add(argument);
      continue;
    }
    if (argument.startsWith('--cleanup=')) {
      cleanupDirs.push(resolve(argument.slice('--cleanup='.length)));
      continue;
    }
    if (argument.startsWith('--allow-output-hash=')) {
      const value = argument.slice('--allow-output-hash='.length);
      const [name, base, candidate, extra] = value.split(',');
      if (!name || !base || !candidate || extra !== undefined) {
        throw new Error(
          '--allow-output-hash must be fixture,base-hash,candidate-hash'
        );
      }
      if (outputHashAllowlist.has(name)) {
        throw new Error(`duplicate output hash allowlist entry for "${name}"`);
      }
      outputHashAllowlist.set(name, { base, candidate });
      continue;
    }
    if (argument === '--only') {
      throw new Error('--only requires a value: --only=<substring>');
    }
    if (argument.startsWith('--only=')) {
      values.only ??= [];
      values.only.push(argument.slice('--only='.length));
      continue;
    }
    const match = argument.match(/^--([^=]+)=(.*)$/v);
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
  const nonNegative = (name, fallback) => {
    const value = Number(values[name] ?? fallback);
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`--${name} must be a non-negative integer`);
    }
    return value;
  };
  const number = (name, fallback) => Number(values[name] ?? fallback);
  const mode = values.mode ?? 'stable';
  const cooldownRaw =
    values['cooldown-ms'] ?? values.cooldown ?? values['inter-block-cooldown'];
  const cooldownName =
    values['cooldown-ms'] !== undefined ? 'cooldown-ms' : 'cooldown';
  const cooldown =
    cooldownRaw !== undefined
      ? nonNegative(cooldownName, 0)
      : INTER_BLOCK_COOLDOWN_MS;
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
    preset: values.preset ?? 'default',
    case: values.case,
    only: values.only ?? null,
    corpusManifest: values['corpus-manifest']
      ? resolve(values['corpus-manifest'])
      : null,
    mode,
    warmup: Number(values.warmup ?? MODES[mode]?.warmup),
    iters: Number(values.iters ?? MODES[mode]?.iters),
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
    pinCore:
      values['pin-core'] !== undefined ? Number(values['pin-core']) : null,
    outputHashAllowlist,
    adaptive:
      bare.has('--adaptive') ||
      (!bare.has('--no-adaptive') && mode === 'stable'),
    pilotBlocks: positive('pilot-blocks', 6),
    cooldown,
    preflight:
      bare.has('--preflight') ||
      (!bare.has('--no-preflight') && mode === 'stable'),
    quietChild: !bare.has('--verbose-child'),
    report: !bare.has('--no-report'),
    markdown: values.markdown ?? null,
    cleanupDirs,
  };
  if (!result.baseRevision || !result.candidateRevision) {
    throw new Error('--base-revision and --candidate-revision are required');
  }
  if (result.requestedBlocks < result.minimumBlocks) {
    throw new Error('--requested-blocks must be at least --minimum-blocks');
  }
  if (!result.adaptive && result.blocks > result.requestedBlocks) {
    throw new Error('--blocks must not exceed --requested-blocks');
  }
  if (result.pilotBlocks < result.minimumBlocks) {
    throw new Error('--pilot-blocks must be at least --minimum-blocks');
  }
  for (const [name, value] of [
    ['blocks', result.blocks],
    ['minimum-blocks', result.minimumBlocks],
    ['requested-blocks', result.requestedBlocks],
    ['pilot-blocks', result.pilotBlocks],
  ]) {
    if (value % 2 !== 0)
      throw new Error(`--${name} must be an even number of blocks`);
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
  if (
    result.pinCore !== null &&
    (!Number.isInteger(result.pinCore) || result.pinCore < 0)
  ) {
    throw new Error('--pin-core must be a non-negative integer');
  }
  return result;
}

function usageText() {
  return [
    'cssnano revision comparison harness',
    '',
    'usage:',
    '  node util/benchmark/compare-revisions.mjs --base-revision=<sha> \\',
    '      --candidate-revision=<sha> [options]',
    '',
    'phases (all run by default for stable mode):',
    '  preflight   verify revisions, corpora, metadata, and one smoke run per side',
    '  benchmark   paired fresh-process blocks with a balanced schedule',
    '  report      analyze the artifact and print the verdict',
    '',
    'key options:',
    '  --base-dir=<path>          worktree of the baseline revision',
    '  --candidate-dir=<path>     worktree of the candidate revision',
    '  --results-dir=<path>       where artifacts are written',
    '  --mode=<quick|stable>      benchmark mode (default: stable)',
    '  --adaptive                 stop once the requested precision is reached',
    '  --no-adaptive              run exactly --blocks balanced blocks',
    '  --pilot-blocks=<n>         minimum blocks before adaptive stopping (default: 6)',
    '  --cooldown-ms=<n>          idle time between blocks (default: 100)',
    '  --only=<substring>         select corpus fixtures; repeatable',
    '  --corpus-manifest=<path>   select corpus fixtures by exact name, one per line',
    '  --allow-output-hash=<fixture,base,candidate>   approve an output change',
    '  --markdown=<path>          also write the report as Markdown',
    '  --no-preflight             skip the preflight phase',
    '  --verbose-child            show child benchmark output',
    '  --no-report                skip analysis and verdict printing',
    '  --cleanup=<path>           remove a worktree after the run; repeatable',
    '  --pin-core=<n>             pin both sides to one CPU core',
    '  --list-cases               list the focused benchmark cases',
    '  --help                     show this message',
    '',
    'examples:',
    '  node util/benchmark/compare-revisions.mjs --base-revision=main --candidate-revision=HEAD \\',
    '      --base-dir=.worktrees/main --candidate-dir=.worktrees/HEAD',
    '  node util/benchmark/compare-revisions.mjs ... --adaptive --report',
  ].join('\n');
}

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
    join(directory, 'util/benchmark/bench.mjs'),
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
  if (config.case) args.push(`--case=${config.case}`);
  for (const selector of config.only ?? []) args.push(`--only=${selector}`);
  if (config.corpusManifest)
    args.push(`--corpus-manifest=${config.corpusManifest}`);
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

// eslint-disable-next-line complexity
export function executeComparison(config, run = runProcess) {
  if (!config.adaptive && config.blocks > config.requestedBlocks)
    throw new RangeError('--blocks must not exceed requested blocks');
  for (const [name, value] of [
    ['blocks', config.blocks],
    ['minimumBlocks', config.minimumBlocks],
    ['requestedBlocks', config.requestedBlocks],
  ]) {
    if (value % 2 !== 0)
      throw new RangeError(`${name} must be an even number of blocks`);
  }
  mkdirSync(config.resultsDir, { recursive: true });
  const adaptive = Boolean(config.adaptive);
  const plannedBlocks = adaptive ? config.requestedBlocks : config.blocks;
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
            blockFailure = true;
          }
        }
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
    if (config.quietChild) {
      const summary = blockSummary(block, plannedBlocks);
      if (summary) console.log(summary);
      else
        console.error(
          `block ${block.blockId}/${plannedBlocks}: failed (baseline exit ${block.exitStatus.baseline}, candidate exit ${block.exitStatus.candidate})`
        );
    }
    if (blockFailure) break;
    if (
      adaptive &&
      blocks.length >= stopAfter &&
      blocks.length % 2 === 0 &&
      blocks.length < plannedBlocks
    ) {
      const interim = interimTotalAnalysis(blocks, config);
      if (
        interim &&
        interim.confidenceIntervalWidth <= config.precisionTarget
      ) {
        adaptiveStop = {
          atBlock: blocks.length,
          confidenceIntervalWidth: interim.confidenceIntervalWidth,
          reason: 'requested precision reached',
        };
        break;
      }
    }
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

function cleanupDirectories(config) {
  for (const directory of config.cleanupDirs ?? []) {
    let result;
    try {
      result = cleanupWorktree(directory);
    } catch (error) {
      result = {
        removed: false,
        path: directory,
        error: String(error.message ?? error),
        recoveryCommand: `git worktree remove --force ${directory}; git worktree prune`,
      };
    }
    if (result.removed) {
      console.log(`cleaned up worktree at ${result.path}`);
    } else {
      console.error(
        `failed to clean up worktree at ${result.path}: ${result.error ?? 'unknown error'}; recover manually with:\n  ${result.recoveryCommand}`
      );
      process.exitCode = 1;
    }
  }
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(usageText());
    return;
  }
  if (argv.includes('--list-cases')) {
    const { benchmarkCases } = await import('./bench-cases.mjs');
    console.log(Object.keys(benchmarkCases).toSorted().join('\n'));
    return;
  }
  const config = options(argv);

  try {
    // CPU environment setup is a coordinator concern: detect once, warn once,
    // and recommend pinning instead of repeating the warning in every child.
    const governor = readCpuGovernor();
    if (
      warnUnstableGovernor(config.mode, governor) &&
      config.pinCore === null
    ) {
      console.warn(
        'Recommendation: rerun with --pin-core=<idle-core> to reduce scheduler noise, or set the governor to "performance".'
      );
    }

    if (config.preflight) {
      const preflight = await runPreflight(config);
      for (const line of preflight.log) console.log(line);
      if (!preflight.ok) {
        for (const failure of preflight.failures)
          console.error(`preflight: ${failure}`);
        console.error('preflight failed; the comparison was not started');
        process.exitCode = 1;
        return;
      }
    }

    const artifact = executeComparison(config);
    console.log(`wrote ${join(config.resultsDir, 'comparison-v3.json')}`);
    if (artifact.blocks.some((block) => !block.structuralValidity)) {
      process.exitCode = 1;
      return;
    }

    if (config.report) {
      const result = comparisonResultFor(config, artifact);
      const reportPath = join(config.resultsDir, 'comparison-report.json');
      writeFileSync(reportPath, JSON.stringify(result, null, 2));
      console.log(`wrote ${reportPath}`);
      printComparison(result);
      if (config.markdown) {
        writeFileSync(config.markdown, markdownComparison(result));
        console.log(`wrote ${config.markdown}`);
      }
    }
  } finally {
    // Worktrees created for the run are cleaned up on every path, including
    // preflight failures and exceptions during benchmarking or reporting.
    cleanupDirectories(config);
  }
}

if (process.argv[1]?.endsWith('/compare-revisions.mjs')) {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
