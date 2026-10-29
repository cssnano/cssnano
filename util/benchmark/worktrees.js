// Git side of a comparison: snapshot the working tree, check out the two
// revisions as detached worktrees that carry the current harness, and remove
// them afterwards.

import { execFileSync } from 'node:child_process';
import {
  closeSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

function git(args, options = {}) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    ...options,
  }).trim();
}

// A commit of the working tree, untracked files included, built in a private
// index so the user's index and branch stay untouched.
export function snapshotWorkingTree(repoRoot) {
  const scratch = mkdtempSync(join(tmpdir(), 'cssnano-snapshot-'));
  try {
    const env = { ...process.env, GIT_INDEX_FILE: join(scratch, 'index') };
    const run = (...args) => git(args, { cwd: repoRoot, env });
    run('read-tree', 'HEAD');
    run('add', '--all');
    const tree = run('write-tree');
    return run(
      'commit-tree',
      tree,
      '-p',
      'HEAD',
      '-m',
      'bench working tree snapshot'
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

// Both sides run the harness of the current checkout, so a new case also runs
// against the base revision.
function addWorktree(repoRoot, revision, destination, runner) {
  runner('git', ['worktree', 'add', '--detach', destination, revision], {
    cwd: repoRoot,
  });
  const harness = join(destination, 'util', 'benchmark');
  mkdirSync(harness, { recursive: true });
  cpSync(resolve(import.meta.dirname), harness, {
    recursive: true,
    force: true,
  });
  // The local postcss-calc override lives in the working tree, not in HEAD.
  cpSync(
    join(repoRoot, 'pnpm-workspace.yaml'),
    join(destination, 'pnpm-workspace.yaml')
  );
  runner('pnpm', ['install'], { cwd: destination });
}

// Git may refuse to remove a worktree it considers dirty, so the directory is
// deleted directly and the stale administrative entry is pruned afterwards.
// A failure returns the commands that finish the job by hand, so a leftover
// worktree is reported rather than hiding the result or error of the run.
/** @returns {string | undefined} */
export function removeWorktree(repoRoot, destination) {
  try {
    git(['worktree', 'remove', '--force', destination], { cwd: repoRoot });
  } catch {
    // the directory removal below still runs
  }
  try {
    rmSync(destination, { recursive: true, force: true });
    git(['worktree', 'prune'], { cwd: repoRoot });
    return undefined;
  } catch (error) {
    return (
      `failed to remove the worktree at ${destination}: ${error.message}\n` +
      `recover with:\n  chmod -R u+w ${destination}; rm -rf ${destination}; ` +
      `git -C ${repoRoot} worktree prune`
    );
  }
}

/**
 * Prepare both sides of a comparison in one temporary root. Install output
 * goes to a log whose path is reported only when preparation fails.
 * `cleanup` returns the recovery messages of the worktrees it could not remove.
 * @returns {{ root: string, dirs: { baseline: string, candidate: string }, cleanup: () => string[] }}
 */
export function prepareComparison(revisions, repoRoot) {
  const root = mkdtempSync(join(tmpdir(), 'cssnano-bench-'));
  const dirs = {
    baseline: join(root, 'baseline'),
    candidate: join(root, 'candidate'),
  };
  const logPath = join(root, 'install.log');
  const log = openSync(logPath, 'a');
  const runner = (command, args, options = {}) =>
    execFileSync(command, args, { stdio: ['ignore', log, log], ...options });
  const removeWorktrees = () => {
    closeSync(log);
    const failures = [];
    for (const directory of Object.values(dirs)) {
      const failure = removeWorktree(repoRoot, directory);
      if (failure) failures.push(failure);
    }
    return failures;
  };
  try {
    for (const side of Object.keys(dirs)) {
      addWorktree(repoRoot, revisions[side], dirs[side], runner);
    }
  } catch (error) {
    // The log is the only evidence of the failure, so the root stays.
    const failures = removeWorktrees();
    error.message += ['', `see ${logPath}`, ...failures].join('\n');
    throw error;
  }
  return {
    root,
    dirs,
    cleanup: () => {
      const failures = removeWorktrees();
      // A leftover worktree keeps the root, which its recovery command names.
      if (failures.length === 0) rmSync(root, { recursive: true, force: true });
      return failures;
    },
  };
}
