// Benchmark the working tree (or any revision) against a base revision.
// Each block runs one fresh child per side in a balanced order, and the
// verdict comes from the paired log ratios.

import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { performance } from 'node:perf_hooks';
import { benchmarkCases } from './cases/index.js';
import { createComparisonSchedule, decide } from './stats.js';
import { prepareComparison, snapshotWorkingTree } from './worktrees.js';

const MINIMUM_BLOCKS = 4;
const REQUESTED_BLOCKS = 20;
const COOLDOWN_MS = 100;
const DURATION_UNITS = { s: 1000, m: 60_000 };
const RESULTS_DIR = join(import.meta.dirname, '..', '..', 'bench-results');
const CORPUS_DIR = join(import.meta.dirname, '..', '..', 'frameworks');
const GOVERNOR_PATH = '/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor';
const UNSTABLE_GOVERNORS = new Set(['powersave', 'ondemand']);

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * @param {string} text a duration such as `90s` or `5m`
 * @return {number | null} milliseconds, or null when the text is not a duration
 */
export function parseDuration(text) {
  const match = /^(\d+(?:\.\d+)?)([sm])$/v.exec(text ?? '');
  const ms = match ? Number(match[1]) * DURATION_UNITS[match[2]] : 0;
  return ms > 0 ? ms : null;
}

/**
 * Turns a ref such as HEAD or a branch name into the full commit hash.
 * @param {string} ref
 * @return {string}
 */
export function resolveRevision(ref) {
  try {
    const sha = execFileSync(
      'git',
      ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();
    if (sha) return sha;
  } catch {
    // reported below
  }
  throw new Error(`cannot resolve "${ref}" to a commit`);
}

// Frequency scaling makes timings jittery, so the user is told once, up front.
function warnUnstableGovernor() {
  let governor = null;
  try {
    governor = readFileSync(GOVERNOR_PATH, 'utf8').trim();
  } catch {
    // no scaling governor on this platform
  }
  if (UNSTABLE_GOVERNORS.has(governor)) {
    console.warn(
      `Warning: CPU scaling governor is "${governor}". Frequency scaling induces timing jitter; use --pin-core (or the "performance" governor) for stable measurements.`
    );
  }
}

function casesFor(values) {
  if (values.case) {
    return values.case
      .split(',')
      .filter(Boolean)
      .map((name) => {
        if (!Object.hasOwn(benchmarkCases, name)) {
          throw new Error(`unknown case "${name}"`);
        }
        return name;
      });
  }
  const names = Object.keys(benchmarkCases)
    .filter((name) => benchmarkCases[name].plugin === values.package)
    .toSorted();
  if (!names.length) {
    throw new Error(`no focused benchmark case for "${values.package}"`);
  }
  return names;
}

function childArgs(name, dir) {
  const target =
    name === 'corpus' ? [`--dir=${CORPUS_DIR}`] : [`--case=${name}`];
  return [join(dir, 'util', 'benchmark', 'child.js'), ...target];
}

// Runs one fresh process. The last stdout line is the child's JSON result.
function runChild(name, dir, pinCore) {
  let executable = process.execPath;
  let args = childArgs(name, dir);
  if (pinCore !== undefined) {
    executable = 'taskset';
    args = ['-c', String(pinCore), process.execPath, ...args];
  }
  const stdout = execFileSync(executable, args, {
    cwd: dir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return JSON.parse(stdout.trim().split('\n').at(-1));
}

function outputsMatch(baseline, candidate) {
  return Object.keys(baseline).filter(
    (file) => baseline[file] !== candidate[file]
  );
}

const ENDPOINTS = { runtime: 'medianMs', coldStart: 'coldStartMs' };
const ENDPOINT_LABELS = { runtime: 'runtime', coldStart: 'cold start' };
const DIRECTIONS = {
  regression: 'slower beyond the margin',
  improvement: 'faster beyond the margin',
};

// Each block is a pair of children run in the scheduled order, so a process
// that starts first does not always lose to the other on warm caches.
export function runCase(
  name,
  comparison,
  {
    budgetMs,
    allowOutputChange,
    pinCore,
    seed,
    run = runChild,
    pause = sleep,
    now = () => performance.now(),
  }
) {
  const schedule = createComparisonSchedule(REQUESTED_BLOCKS, seed);
  const started = now();
  const blocks = [];
  let stopReason = null;
  for (const entry of schedule) {
    const elapsed = now() - started;
    const pairs = Math.floor(blocks.length / 2);
    const averagePair = pairs ? elapsed / pairs : 0;
    if (
      blocks.length >= MINIMUM_BLOCKS &&
      blocks.length % 2 === 0 &&
      elapsed + averagePair > budgetMs
    ) {
      stopReason = 'time budget reached';
      break;
    }
    const blockStarted = now();
    const observations = {};
    for (const [index, side] of entry.processOrder.entries()) {
      if (index > 0) pause(COOLDOWN_MS);
      observations[side] = run(name, comparison.dirs[side], pinCore);
    }
    blocks.push({
      blockId: entry.blockId,
      processOrder: entry.processOrder,
      durationMs: now() - blockStarted,
      observations,
    });
    const changed = outputsMatch(
      observations.baseline.outputHashes,
      observations.candidate.outputHashes
    );
    if (entry.blockId === 1 && changed.length && !allowOutputChange) {
      stopReason = `output changed: ${changed.join(', ')}`;
      break;
    }
    if (
      blocks.length >= MINIMUM_BLOCKS &&
      blocks.length % 2 === 0 &&
      endpointsDecided(blocks)
    ) {
      break;
    }
  }
  return summarize(name, blocks, stopReason);
}

// Adaptive stopping waits until both endpoints have a verdict.
function endpointsDecided(blocks) {
  return Object.values(ENDPOINTS).every(
    (field) => decide(logRatios(blocks, field)).verdict !== 'inconclusive'
  );
}

function logRatios(blocks, field) {
  return blocks.map((block) => ({
    logRatio: Math.log(
      block.observations.candidate[field] / block.observations.baseline[field]
    ),
    baselineFirst: block.processOrder[0] === 'baseline',
  }));
}

// Either endpoint regressing flags the case; no change needs both to be
// within the margin.
function combineVerdicts(verdicts) {
  if (verdicts.includes('regression')) return 'regression';
  if (verdicts.includes('improvement')) return 'improvement';
  if (verdicts.every((verdict) => verdict === 'no-meaningful-change')) {
    return 'no-meaningful-change';
  }
  return 'inconclusive';
}

function verdictReason(verdict, decisions, stopReason) {
  if (verdict === 'no-meaningful-change') return 'within the margin';
  if (DIRECTIONS[verdict]) {
    const endpoints = Object.keys(decisions)
      .filter((key) => decisions[key].verdict === verdict)
      .map((key) => ENDPOINT_LABELS[key]);
    return `${endpoints.join(' and ')} ${DIRECTIONS[verdict]}`;
  }
  return stopReason ?? 'noise is too large to rule out a meaningful change';
}

function summarize(name, blocks, stopReason) {
  if (blocks.length < MINIMUM_BLOCKS) {
    return { case: name, verdict: 'inconclusive', reason: stopReason, blocks };
  }
  const decisions = Object.fromEntries(
    Object.entries(ENDPOINTS).map(([key, field]) => [
      key,
      decide(logRatios(blocks, field)),
    ])
  );
  const { runtime, coldStart } = decisions;
  const verdict = combineVerdicts(
    Object.values(decisions).map((decision) => decision.verdict)
  );
  return {
    case: name,
    verdict,
    reason: verdictReason(verdict, decisions, stopReason),
    ratio: runtime.ratio,
    interval: runtime.interval,
    orderEffect: runtime.orderEffect,
    orderStable: runtime.orderStable,
    coldStart: {
      ratio: coldStart.ratio,
      interval: coldStart.interval,
      verdict: coldStart.verdict,
    },
    blocks,
  };
}

const pct = (value) => `${((value - 1) * 100).toFixed(1)}%`;

function formatRow(result) {
  if (!result.interval) {
    return `${result.case}: ${result.verdict} (${result.reason})`;
  }
  const interval = `[${pct(result.interval.low)}, ${pct(result.interval.high)}]`;
  return `${result.case}: ${pct(result.ratio)} ${interval} ${result.verdict} (${result.reason})`;
}

export function parseOptions(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      case: { type: 'string' },
      package: { type: 'string' },
      corpus: { type: 'boolean', default: false },
      base: { type: 'string', default: 'HEAD' },
      candidate: { type: 'string', default: 'worktree' },
      budget: { type: 'string', default: '2m' },
      'pin-core': { type: 'string' },
      'allow-output-change': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      keep: { type: 'boolean', default: false },
      seed: { type: 'string' },
    },
  });
  const budgetMs = parseDuration(values.budget);
  if (budgetMs === null) {
    throw new Error('--budget must be a duration such as 90s or 5m');
  }
  if (values.seed === '') throw new Error('--seed must be a non-empty string');
  // Each run draws its own schedule; --seed replays an earlier one.
  const seed = values.seed ?? randomUUID();
  return { ...values, budgetMs, seed };
}

function main(argv = process.argv.slice(2)) {
  const options = parseOptions(argv);
  const names = options.corpus ? ['corpus'] : casesFor(options);
  const repoRoot = git(['rev-parse', '--show-toplevel']);
  const revisions = {
    baseline: resolveRevision(options.base),
    candidate:
      options.candidate === 'worktree'
        ? snapshotWorkingTree(repoRoot)
        : resolveRevision(options.candidate),
  };
  const comparison = prepareComparison(revisions, repoRoot);
  try {
    warnUnstableGovernor();
    const pinCore = options['pin-core'];
    const perCase = options.budgetMs / names.length;
    const results = names.map((name) => {
      const result = runCase(name, comparison, {
        budgetMs: perCase,
        allowOutputChange: options['allow-output-change'],
        pinCore,
        seed: options.seed,
      });
      if (options.json) console.log(JSON.stringify(result));
      else console.log(formatRow(result));
      return result;
    });
    const stamp = new Date().toISOString().replaceAll(':', '-');
    mkdirSync(join(RESULTS_DIR, stamp), { recursive: true });
    writeFileSync(
      join(RESULTS_DIR, stamp, 'results.json'),
      JSON.stringify({ revisions, seed: options.seed, results }, null, 2)
    );
  } finally {
    const failures = options.keep ? [] : comparison.cleanup();
    for (const failure of failures) console.error(`bench: ${failure}`);
    if (failures.length > 0) process.exitCode = 1;
  }
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

if (process.argv[1] === import.meta.filename) {
  try {
    main();
  } catch (error) {
    console.error(`bench: ${error.message}`);
    process.exit(1);
  }
}
