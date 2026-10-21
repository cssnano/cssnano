import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { removeWorktree, snapshotWorkingTree } from '../worktrees.js';

function createRepository() {
  const dir = mkdtempSync(join(tmpdir(), 'worktrees-test-'));
  const run = (...args) =>
    execFileSync('git', args, {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  run('init', '-q');
  run('config', 'user.email', 'test@example.com');
  run('config', 'user.name', 'test');
  writeFileSync(join(dir, 'tracked.css'), 'a{}');
  run('add', 'tracked.css');
  run('commit', '-q', '-m', 'init');
  return {
    dir,
    run,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

// A directory without write permission cannot have its entries deleted, so
// removing the worktree that contains it fails.
function createUndeletableWorktree(repositoryDir) {
  const destination = join(repositoryDir, 'worktree');
  const locked = join(destination, 'locked');
  mkdirSync(locked, { recursive: true });
  writeFileSync(join(locked, 'file.css'), 'a{}');
  chmodSync(locked, 0o555);
  return destination;
}

test('worktree removal that fails returns a recovery command instead of throwing', () => {
  const repository = createRepository();
  try {
    const destination = createUndeletableWorktree(repository.dir);
    assert.match(
      removeWorktree(repository.dir, destination),
      /recover with:\n {2}chmod -R u\+w .*worktree; rm -rf .*worktree; git -C .* worktree prune$/v
    );
  } finally {
    chmodSync(join(repository.dir, 'worktree', 'locked'), 0o755);
    repository.cleanup();
  }
});

test('worktree removal that succeeds reports no recovery command', () => {
  const repository = createRepository();
  try {
    const destination = join(repository.dir, 'worktree');
    mkdirSync(destination);
    assert.equal(removeWorktree(repository.dir, destination), undefined);
  } finally {
    repository.cleanup();
  }
});

test('working tree snapshot includes untracked files', () => {
  const repository = createRepository();
  try {
    writeFileSync(join(repository.dir, 'untracked.css'), 'b{}');
    const snapshot = snapshotWorkingTree(repository.dir);
    const files = repository.run('ls-tree', '--name-only', '-r', snapshot);
    assert.ok(files.split('\n').includes('untracked.css'));
  } finally {
    repository.cleanup();
  }
});

test('working tree snapshot leaves the index and HEAD untouched', () => {
  const repository = createRepository();
  try {
    writeFileSync(join(repository.dir, 'untracked.css'), 'b{}');
    const head = repository.run('rev-parse', 'HEAD');
    snapshotWorkingTree(repository.dir);
    assert.equal(repository.run('rev-parse', 'HEAD'), head);
    assert.equal(repository.run('status', '--porcelain'), '?? untracked.css');
  } finally {
    repository.cleanup();
  }
});
