import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

function defaultRunner(cmd, args, options = {}) {
  return execFileSync(cmd, args, {
    stdio: 'inherit',
    encoding: 'utf8',
    ...options,
  });
}

function findRepoRoot(startDir = import.meta.dirname, runner = defaultRunner) {
  try {
    const output = runner('git', ['rev-parse', '--show-toplevel'], {
      cwd: startDir,
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    });
    return output.trim();
  } catch {
    return resolve(startDir, '../..');
  }
}

function sanitizeRevision(revision) {
  return revision.replaceAll(/[^a-zA-Z0-9._\-]/gv, '_');
}

/**
 * Prepares a git worktree checked out to a specific revision with the current
 * benchmark harness injected and dependencies installed.
 *
 * @param {object} options
 * @param {string} options.revision - Git revision/commit/tag/branch to check out.
 * @param {string} [options.destination] - Destination directory path for worktree.
 * @param {string} [options.repoRoot] - Repository root directory.
 * @param {string} [options.harnessSourceDir] - Benchmark harness directory to inject.
 * @param {boolean} [options.copyHarness=true] - Whether to copy benchmark harness into the worktree.
 * @param {boolean} [options.installDeps=true] - Whether to run pnpm install --frozen-lockfile.
 * @param {Function} [options.runner] - Process runner for git and pnpm commands.
 * @returns {{ path: string, revision: string }}
 */
export function prepareWorktree(options) {
  if (!options || typeof options !== 'object') {
    throw new TypeError('options must be an object');
  }
  const { revision } = options;
  if (!revision || typeof revision !== 'string') {
    throw new TypeError('options.revision must be a non-empty string');
  }

  const runner = options.runner ?? defaultRunner;
  const repoRoot =
    options.repoRoot ?? findRepoRoot(import.meta.dirname, runner);
  const destination = options.destination
    ? resolve(options.destination)
    : resolve(repoRoot, '.worktrees', sanitizeRevision(revision));

  runner('git', ['worktree', 'add', '--detach', destination, revision], {
    cwd: repoRoot,
  });

  if (options.copyHarness !== false) {
    const harnessSourceDir =
      options.harnessSourceDir ?? resolve(import.meta.dirname);
    const harnessTargetDir = join(destination, 'util', 'benchmark');
    mkdirSync(harnessTargetDir, { recursive: true });
    cpSync(harnessSourceDir, harnessTargetDir, {
      recursive: true,
      force: true,
    });
  }

  if (options.installDeps !== false) {
    runner('pnpm', ['install', '--frozen-lockfile'], {
      cwd: destination,
    });
  }

  return { path: destination, revision };
}

/**
 * Cleans up a previously created git worktree.
 *
 * @param {string} targetPath - Worktree path to remove.
 * @param {object} [options]
 * @param {string} [options.repoRoot] - Repository root directory.
 * @param {Function} [options.runner] - Process runner for git commands.
 * @returns {{ removed: boolean, path: string }}
 */
export function cleanupWorktree(targetPath, options = {}) {
  if (!targetPath || typeof targetPath !== 'string') {
    throw new TypeError('targetPath must be a non-empty string');
  }

  const runner = options.runner ?? defaultRunner;
  const repoRoot =
    options.repoRoot ?? findRepoRoot(import.meta.dirname, runner);
  const resolvedPath = resolve(targetPath);

  try {
    runner('git', ['worktree', 'remove', '--force', resolvedPath], {
      cwd: repoRoot,
    });
  } catch (error) {
    if (existsSync(resolvedPath)) {
      rmSync(resolvedPath, { recursive: true, force: true });
    } else {
      throw error;
    }
  }

  if (existsSync(resolvedPath)) {
    rmSync(resolvedPath, { recursive: true, force: true });
  }

  return { removed: true, path: resolvedPath };
}

function parseArgs(argv) {
  const values = {};
  for (const arg of argv.filter((v) => v !== '--')) {
    if (arg === '--cleanup') {
      values.cleanup = true;
      continue;
    }
    if (arg === '--no-install') {
      values.installDeps = false;
      continue;
    }
    if (arg === '--no-copy-harness') {
      values.copyHarness = false;
      continue;
    }
    const match = arg.match(/^--([^=]+)=(.*)$/v);
    if (match) {
      values[match[1]] = match[2];
    }
  }
  return {
    revision: values.revision,
    destination: values.destination ?? values.path,
    cleanup: Boolean(values.cleanup),
    installDeps: values.installDeps ?? values.install !== 'false',
    copyHarness: values.copyHarness ?? values['copy-harness'] !== 'false',
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.cleanup) {
    if (!args.destination) {
      throw new Error('--cleanup requires --destination=<path>');
    }
    const result = cleanupWorktree(args.destination);
    console.log(`cleaned up worktree at ${result.path}`);
    return;
  }

  if (!args.revision) {
    throw new Error(
      'usage: node util/benchmark/prepare-worktree.mjs --revision=<rev> [--destination=<path>] [--no-install] [--no-copy-harness] or --cleanup --destination=<path>'
    );
  }

  const result = prepareWorktree(args);
  console.log(result.path);
}

const isMain =
  process.argv[1] && process.argv[1].endsWith('/prepare-worktree.mjs');
if (isMain) {
  try {
    main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
