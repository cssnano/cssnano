// Quick, bounded benchmark check of the current working tree against a base
// revision for focused plugin cases. It is directional evidence: use
// compare-revisions.js for the full statistical comparison.

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { formatSeconds, parseDuration } from './bench-defaults.js';
import { resolveRevision } from './bench-provenance.js';
import { cleanupWorktree, prepareWorktree } from './prepare-worktree.js';

export { resolveRevision };

const OPTIONS = new Set([
  'package',
  'case',
  'base',
  'candidate',
  'pin-core',
  'keep',
  'budget',
]);

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
    const match = argument.match(/^--([^=]+)=(.*)$/v);
    if (!match) throw new Error(`expected --name=value, received ${argument}`);
    if (!OPTIONS.has(match[1])) throw new Error(`unknown option --${match[1]}`);
    values[match[1]] = match[2];
  }
  values.budgetMs = parseDuration(values.budget ?? '2m');
  if (values.budgetMs === null) {
    throw new Error('--budget must be a duration such as 90s or 5m');
  }
  if (!values.package && !values.case) {
    throw new Error(
      'name what to benchmark: --package=<name> or --case=<name>'
    );
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

export function summaryFor(caseName, result) {
  const { total } = result;
  if (!total) {
    return {
      case: caseName,
      verdict: 'unavailable',
      blocks: result.blocks?.length ?? 0,
    };
  }
  const { low, high } = total.confidenceIntervalPct;
  return {
    case: caseName,
    verdict: result.overallVerdict,
    direction: total.statisticalDirection,
    practical: total.practicalConclusion,
    ratio: total.ratio,
    intervalPct: [low, high],
    blocks: result.blocks.length,
  };
}

function compareArgs(args, caseName, dirs, revisions, resultsDir, budgetMs) {
  const out = [
    join(import.meta.dirname, 'compare-revisions.js'),
    `--base-dir=${dirs.base}`,
    `--candidate-dir=${dirs.candidate}`,
    `--base-revision=${revisions.base}`,
    `--candidate-revision=${revisions.candidate}`,
    `--results-dir=${resultsDir}`,
    `--case=${caseName}`,
    ...fastProfileFlags(budgetMs),
  ];
  if (args['pin-core'] !== undefined)
    out.push(`--pin-core=${args['pin-core']}`);
  return out;
}

async function main() {
  const args = parseCheckArgs(process.argv.slice(2));
  const { benchmarkCases } = await import('./bench-cases.js');
  const names = args.case
    ? [args.case]
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
  try {
    console.error(
      `bench-check: ${names.length} case(s), ${formatSeconds(args.budgetMs)} budget in total; preparing worktrees`
    );
    for (const side of ['base', 'candidate']) {
      prepareWorktree({
        revision: revisions[side],
        destination: dirs[side],
        repoRoot,
      });
    }
    let failed = false;
    for (const name of names) {
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
      let summary;
      try {
        const report = JSON.parse(
          readFileSync(join(resultsDir, 'comparison-report.json'), 'utf8')
        );
        summary = summaryFor(name, report);
      } catch {
        summary = { case: name, verdict: 'failed', exitStatus: run.status };
        failed = true;
      }
      console.log(JSON.stringify(summary));
    }
    if (failed) process.exitCode = 1;
  } finally {
    if (args.keep === undefined) {
      for (const directory of Object.values(dirs)) {
        cleanupWorktree(directory, { repoRoot });
      }
      rmSync(root, { recursive: true, force: true });
    }
  }
}

if (process.argv[1]?.endsWith('/bench-check.js')) {
  try {
    await main();
  } catch (error) {
    console.error(`bench-check: ${error.message}`);
    process.exit(1);
  }
}
