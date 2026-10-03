import { resolve, join } from 'node:path';
import { writeFileSync } from 'node:fs';
import { MINIMUM_CROSSOVER_BLOCKS } from './bench-defaults.js';
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
} from './bench-config.js';
import { readCpuGovernor, warnUnstableGovernor } from './bench-provenance.js';
import { markdownComparison, printComparison } from './compare-report.js';
import { cleanupWorktree } from './prepare-worktree.js';
import { runPreflight } from './compare-preflight.js';
import { parseAllowOutputHash } from './compare-validation.js';
import {
  blockSummary,
  commandFor,
  comparisonResultFor,
  executeComparison,
} from './compareRevisionsCoordinator.js';

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

function parseRawArgs(argv) {
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
      parseAllowOutputHash(
        argument.slice('--allow-output-hash='.length),
        outputHashAllowlist
      );
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
  return { values, outputHashAllowlist, cleanupDirs, bare };
}

function validateComparisonBlockOptions(result) {
  if (!result.baseRevision || !result.candidateRevision) {
    throw new Error('--base-revision and --candidate-revision are required');
  }
  if (result.requestedBlocks < result.minimumBlocks) {
    throw new Error('--requested-blocks must be at least --minimum-blocks');
  }
  if (!result.adaptive && result.blocks > result.requestedBlocks) {
    throw new Error('--blocks must not exceed --requested-blocks');
  }
  const [plannedFlag, plannedBlocks] = result.adaptive
    ? ['--requested-blocks', result.requestedBlocks]
    : ['--blocks', result.blocks];
  if (plannedBlocks < MINIMUM_CROSSOVER_BLOCKS) {
    throw new Error(
      `${plannedFlag} must be at least ${MINIMUM_CROSSOVER_BLOCKS} to estimate variance`
    );
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
}

function validateComparisonThresholdOptions(result) {
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
}

function validateComparisonOptions(result) {
  validateComparisonBlockOptions(result);
  validateComparisonThresholdOptions(result);
}

function options(argv) {
  const { values, outputHashAllowlist, cleanupDirs, bare } = parseRawArgs(argv);
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
  validateComparisonOptions(result);
  return result;
}

function usageText() {
  return [
    'cssnano revision comparison harness',
    '',
    'usage:',
    '  node util/benchmark/compare-revisions.js --base-revision=<sha> \\',
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
    '  node util/benchmark/compare-revisions.js --base-revision=main --candidate-revision=HEAD \\',
    '      --base-dir=.worktrees/main --candidate-dir=.worktrees/HEAD',
    '  node util/benchmark/compare-revisions.js ... --adaptive --report',
  ].join('\n');
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
    const { benchmarkCases } = await import('./bench-cases.js');
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

if (process.argv[1]?.endsWith('/compare-revisions.js')) {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

export { blockSummary, commandFor, comparisonResultFor, executeComparison };
