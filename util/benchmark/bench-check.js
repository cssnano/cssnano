// Quick, bounded benchmark check of the current working tree against a base
// revision for focused plugin cases. It is directional evidence: use
// compare-revisions.js for the full statistical comparison.

import { execFileSync, spawnSync } from 'node:child_process';
import {
  closeSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { formatSeconds, parseDuration } from './bench-defaults.js';
import { resolveRevision, warnUnstableGovernor } from './bench-provenance.js';
import {
  classifyOverall,
  followUpCommands,
  formatHeader,
  formatTable,
  progressLine,
  summaryFor,
} from './bench-check-report.js';
import { cleanupWorktree, prepareWorktree } from './prepare-worktree.js';

export {
  classifyOverall,
  followUpCommands,
  formatHeader,
  formatTable,
  progressLine,
  summaryFor,
} from './bench-check-report.js';
export { resolveRevision };

// Single source of truth for parsing and --help, so a new flag cannot go
// undocumented.
export const OPTIONS = new Map([
  [
    'package',
    {
      value: '<name>',
      help: 'benchmark every focused case of a plugin package',
    },
  ],
  [
    'case',
    { value: '<a,b>', help: 'benchmark these focused cases (comma-separated)' },
  ],
  ['base', { value: '<ref>', help: 'base revision', fallback: 'HEAD' }],
  [
    'candidate',
    {
      value: '<ref>',
      help: 'candidate revision; "worktree" snapshots uncommitted work',
      fallback: 'worktree',
    },
  ],
  [
    'budget',
    {
      value: '<90s|5m>',
      help: 'total time for all cases, shared equally',
      fallback: '2m',
    },
  ],
  [
    'pin-core',
    {
      value: '<n>',
      help: 'pin both sides to one CPU core to reduce scheduler noise',
    },
  ],
  ['keep', { bare: true, help: 'keep the temporary worktrees for inspection' }],
  ['json', { bare: true, help: 'print only one JSON line per case on stdout' }],
  ['help', { bare: true, help: 'show this message (also -h)' }],
]);

class UsageError extends Error {}

function optionsText() {
  const rows = [...OPTIONS].map(([name, { value, help, fallback }]) => [
    value ? `--${name}=${value}` : `--${name}`,
    fallback ? `${help} (default: ${fallback})` : help,
  ]);
  const width = Math.max(...rows.map(([flag]) => flag.length));
  return rows
    .map(([flag, text]) => `  ${flag.padEnd(width)}  ${text}`)
    .join('\n');
}

export function helpText() {
  return [
    'bench-check: quick benchmark of the working tree against a base revision',
    '',
    'usage:',
    '  node util/benchmark/bench-check.js --package=<name> | --case=<a,b> [options]',
    '',
    'options:',
    optionsText(),
    '',
    'examples:',
    '  node util/benchmark/bench-check.js --package=postcss-merge-rules --budget=90s',
    '  node util/benchmark/bench-check.js --case=columns-height-guard --budget=1m',
  ].join('\n');
}

/** @return {string} */
function gitRunner(command, args, options) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    ...options,
  });
}

export function casesForPackage(packageName, cases) {
  const names = Object.keys(cases)
    .filter((name) => cases[name].plugin === packageName)
    .toSorted();
  if (names.length) return names;
  const known = [...new Set(Object.values(cases).map((c) => c.plugin))]
    .toSorted()
    .join(', ');
  throw new Error(
    `no focused benchmark case for "${packageName}"; known packages: ${known}`
  );
}

export function casesForNames(names, cases) {
  for (const name of names) {
    if (!Object.hasOwn(cases, name)) {
      throw new Error(
        `unknown case "${name}"; known cases: ${Object.keys(cases).toSorted().join(', ')}`
      );
    }
  }
  return names;
}

// Four blocks are the fewest that leave the crossover model a degree of
// freedom to estimate variance; the time budget then decides how many more
// balanced pairs fit, and precision may stop the run sooner.
export function fastProfileFlags(budgetMs) {
  return [
    '--mode=stable',
    '--warmup=3',
    '--iters=20',
    '--adaptive',
    '--minimum-blocks=4',
    '--pilot-blocks=4',
    `--time-budget=${formatSeconds(budgetMs)}`,
    '--cooldown-ms=0',
  ];
}

export function parseCheckArgs(argv) {
  const values = { base: 'HEAD', candidate: 'worktree' };
  for (const argument of argv.filter((value) => value !== '--')) {
    if (argument === '-h') {
      values.help = true;
      continue;
    }
    const match = argument.match(/^--([^=]+)(?:=(.*))?$/v);
    if (!match) {
      throw new UsageError(`expected --name=value, received ${argument}`);
    }
    const [, name, value] = match;
    if (!OPTIONS.has(name)) throw new UsageError(`unknown option --${name}`);
    if (value === undefined && !OPTIONS.get(name).bare) {
      throw new UsageError(`expected --name=value, received ${argument}`);
    }
    values[name] = value ?? true;
  }
  if (values.help) return values;
  values.budgetMs = parseDuration(values.budget ?? '2m');
  if (values.budgetMs === null) {
    throw new UsageError('--budget must be a duration such as 90s or 5m');
  }
  if (!values.package && !values.case) {
    throw new UsageError(
      'name what to benchmark: --package=<name> or --case=<name>'
    );
  }
  if (values.case) {
    values.caseNames = values.case.split(',').filter(Boolean);
  }
  return values;
}

// A commit of the working tree, untracked files included, built in a private
// index so the user's index and branch stay untouched.
function snapshotWorkingTree(repoRoot) {
  const scratch = mkdtempSync(join(tmpdir(), 'cssnano-snapshot-'));
  try {
    const env = { ...process.env, GIT_INDEX_FILE: join(scratch, 'index') };
    const git = (...args) =>
      gitRunner('git', args, { cwd: repoRoot, env }).trim();
    git('read-tree', 'HEAD');
    git('add', '--all');
    const tree = git('write-tree');
    return git(
      'commit-tree',
      tree,
      '-p',
      'HEAD',
      '-m',
      'bench-check working tree snapshot'
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

export function compareArgs(
  args,
  caseName,
  dirs,
  revisions,
  resultsDir,
  budgetMs
) {
  const out = [
    join(import.meta.dirname, 'compare-revisions.js'),
    `--base-dir=${dirs.base}`,
    `--candidate-dir=${dirs.candidate}`,
    `--base-revision=${revisions.base}`,
    `--candidate-revision=${revisions.candidate}`,
    `--results-dir=${resultsDir}`,
    `--case=${caseName}`,
    ...fastProfileFlags(budgetMs),
    // bench-check prints the CPU governor warning once for the whole run.
    '--no-environment-warning',
  ];
  if (args['pin-core'] !== undefined)
    out.push(`--pin-core=${args['pin-core']}`);
  return out;
}

// Install output is long and rarely useful; it goes to a log whose path is
// shown only when preparation fails.
function loggedRunner(logPath) {
  const log = openSync(logPath, 'a');
  const runner = (command, args, options = {}) =>
    execFileSync(command, args, { stdio: ['ignore', log, log], ...options });
  return { runner, close: () => closeSync(log) };
}

function warnOnceAboutEnvironment(args) {
  if (warnUnstableGovernor('stable') && args['pin-core'] === undefined) {
    console.warn(
      'Recommendation: rerun with --pin-core=<idle-core> to reduce scheduler noise, or set the governor to "performance".'
    );
  }
}

function readSummary(name, resultsDir, run) {
  try {
    return summaryFor(
      name,
      JSON.parse(
        readFileSync(join(resultsDir, 'comparison-report.json'), 'utf8')
      )
    );
  } catch {
    return { case: name, verdict: 'failed', exitStatus: run.status };
  }
}

function reportSummaries(summaries, args) {
  if (args.json) {
    for (const summary of summaries) console.log(JSON.stringify(summary));
    return;
  }
  console.log(formatTable(summaries));
  console.log(`\n${classifyOverall(summaries).line}`);
  const commands = followUpCommands(summaries, args);
  if (commands.length) {
    console.log('\nTo confirm, run:');
    for (const command of commands) console.log(`  ${command}`);
  }
}

async function main() {
  const args = parseCheckArgs(process.argv.slice(2));
  if (args.help) {
    console.log(helpText());
    return;
  }
  const { benchmarkCases } = await import('./bench-cases.js');
  const names = args.caseNames
    ? casesForNames(args.caseNames, benchmarkCases)
    : casesForPackage(args.package, benchmarkCases);
  const repoRoot = gitRunner('git', ['rev-parse', '--show-toplevel']).trim();
  const revisions = {
    base: resolveRevision(args.base),
    candidate:
      args.candidate === 'worktree'
        ? snapshotWorkingTree(repoRoot)
        : resolveRevision(args.candidate),
  };
  const root = mkdtempSync(join(tmpdir(), 'cssnano-bench-check-'));
  const dirs = { base: join(root, 'base'), candidate: join(root, 'candidate') };
  let installFailed = false;
  try {
    console.error(
      `bench-check: ${formatHeader(names.length, args.budgetMs)}; preparing worktrees`
    );
    const installLog = join(root, 'install.log');
    const install = loggedRunner(installLog);
    try {
      for (const side of ['base', 'candidate']) {
        prepareWorktree({
          revision: revisions[side],
          destination: dirs[side],
          repoRoot,
          runner: install.runner,
        });
      }
    } catch (error) {
      installFailed = true;
      error.message += `\nsee ${installLog}`;
      throw error;
    } finally {
      install.close();
    }
    warnOnceAboutEnvironment(args);
    const summaries = [];
    const started = performance.now();
    for (const [index, name] of names.entries()) {
      const resultsDir = join(root, 'results', name);
      mkdirSync(resultsDir, { recursive: true });
      const run = spawnSync(
        process.execPath,
        compareArgs(
          args,
          name,
          dirs,
          revisions,
          resultsDir,
          args.budgetMs / names.length
        ),
        { stdio: ['ignore', 'ignore', 'inherit'] }
      );
      summaries.push(readSummary(name, resultsDir, run));
      console.error(
        progressLine(
          index + 1,
          names.length,
          name,
          performance.now() - started,
          args.budgetMs
        )
      );
    }
    reportSummaries(summaries, args);
    if (summaries.some((summary) => summary.verdict === 'failed')) {
      process.exitCode = 1;
    }
  } finally {
    if (args.keep === undefined) {
      for (const directory of Object.values(dirs)) {
        cleanupWorktree(directory, { repoRoot });
      }
      // The install log is the only evidence of a failed preparation.
      if (!installFailed) rmSync(root, { recursive: true, force: true });
    }
  }
}

if (process.argv[1]?.endsWith('/bench-check.js')) {
  try {
    await main();
  } catch (error) {
    console.error(`bench-check: ${error.message}`);
    if (error instanceof UsageError) console.error(`\n${optionsText()}`);
    process.exit(1);
  }
}
