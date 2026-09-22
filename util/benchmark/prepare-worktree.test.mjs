import assert from 'node:assert/strict';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { cleanupWorktree, prepareWorktree } from './prepare-worktree.mjs';

test('prepareWorktree validates options', () => {
  assert.throws(() => prepareWorktree(null), /options must be an object/v);
  assert.throws(
    () => prepareWorktree({}),
    /options\.revision must be a non-empty string/v
  );
  assert.throws(
    () => prepareWorktree({ revision: '' }),
    /options\.revision must be a non-empty string/v
  );
});

test('prepareWorktree invokes git worktree add and pnpm install with correct arguments', () => {
  const commands = [];
  const mockRunner = (cmd, args, options) => {
    commands.push({ cmd, args, options });
    if (cmd === 'git' && args[0] === 'rev-parse') {
      return '/mock/repo/root\n';
    }
    return '';
  };

  const tempHarness = mkdtempSync(join(tmpdir(), 'harness-source-'));
  const tempDest = mkdtempSync(join(tmpdir(), 'worktree-dest-'));
  try {
    writeFileSync(
      join(tempHarness, 'mock-harness.js'),
      'console.log("harness");'
    );

    const result = prepareWorktree({
      revision: 'v5.1.0',
      destination: tempDest,
      repoRoot: '/mock/repo/root',
      harnessSourceDir: tempHarness,
      copyHarness: true,
      installDeps: true,
      runner: mockRunner,
    });

    assert.equal(result.path, tempDest);
    assert.equal(result.revision, 'v5.1.0');

    // Check git worktree add
    assert.deepEqual(commands[0], {
      cmd: 'git',
      args: ['worktree', 'add', '--detach', tempDest, 'v5.1.0'],
      options: { cwd: '/mock/repo/root' },
    });

    // Check harness was copied
    const copiedContent = readFileSync(
      join(tempDest, 'util', 'benchmark', 'mock-harness.js'),
      'utf8'
    );
    assert.equal(copiedContent, 'console.log("harness");');

    // Check pnpm install
    assert.deepEqual(commands[1], {
      cmd: 'pnpm',
      args: ['install', '--frozen-lockfile'],
      options: { cwd: tempDest },
    });
  } finally {
    rmSync(tempHarness, { recursive: true, force: true });
    rmSync(tempDest, { recursive: true, force: true });
  }
});

test('prepareWorktree respects installDeps: false and copyHarness: false', () => {
  const commands = [];
  const mockRunner = (cmd, args, options) => {
    commands.push({ cmd, args, options });
    return '';
  };

  const result = prepareWorktree({
    revision: 'feature-branch',
    destination: '/custom/dest',
    repoRoot: '/mock/root',
    copyHarness: false,
    installDeps: false,
    runner: mockRunner,
  });

  assert.equal(result.path, '/custom/dest');
  assert.equal(commands.length, 1);
  assert.equal(commands[0].cmd, 'git');
  assert.deepEqual(commands[0].args, [
    'worktree',
    'add',
    '--detach',
    '/custom/dest',
    'feature-branch',
  ]);
});

test('cleanupWorktree validates targetPath and invokes git worktree remove', () => {
  assert.throws(
    () => cleanupWorktree(null),
    /targetPath must be a non-empty string/v
  );

  const commands = [];
  const mockRunner = (cmd, args, options) => {
    commands.push({ cmd, args, options });
    return '';
  };

  const tempDest = mkdtempSync(join(tmpdir(), 'worktree-clean-'));
  try {
    const res = cleanupWorktree(tempDest, {
      repoRoot: '/mock/root',
      runner: mockRunner,
    });
    assert.equal(res.removed, true);
    assert.deepEqual(commands[0], {
      cmd: 'git',
      args: ['worktree', 'remove', '--force', tempDest],
      options: { cwd: '/mock/root' },
    });
    // Stale administrative metadata is pruned after the directory is gone.
    assert.deepEqual(commands.at(-1), {
      cmd: 'git',
      args: ['worktree', 'prune'],
      options: { cwd: '/mock/root' },
    });
  } finally {
    rmSync(tempDest, { recursive: true, force: true });
  }
});

function failingRunner(cmd, args) {
  if (cmd === 'git' && args[0] === 'worktree' && args[1] === 'prune') {
    throw new Error('prune failed');
  }
  throw new Error('git worktree remove failed: permission denied');
}

test('cleanupWorktree reports prune failure as incomplete cleanup', () => {
  const tempDest = mkdtempSync(join(tmpdir(), 'worktree-prune-'));
  try {
    const result = cleanupWorktree(tempDest, {
      repoRoot: '/mock/root',
      runner: failingRunner,
    });
    assert.equal(result.removed, false);
    assert.match(result.error, /prune failed/v);
    assert.match(result.recoveryCommand, /worktree prune/v);
  } finally {
    rmSync(tempDest, { recursive: true, force: true });
  }
});

test('cleanupWorktree reports failure with a recovery command instead of claiming success', () => {
  const tempDest = mkdtempSync(join(tmpdir(), 'worktree-stuck-'));
  const nested = join(tempDest, 'nested');
  mkdirSync(nested);
  writeFileSync(join(nested, 'file.txt'), 'locked');
  // A read-only directory makes recursive removal fail, as with read-only
  // Git metadata in a worktree.
  chmodSync(tempDest, 0o500);
  try {
    const result = cleanupWorktree(tempDest, {
      repoRoot: '/mock/root',
      runner: failingRunner,
    });
    assert.equal(result.removed, false);
    assert.equal(existsSync(tempDest), true);
    assert.match(result.error, /permission denied|EACCES|EPERM/iv);
    assert.match(result.recoveryCommand, /rm -rf/v);
    assert.match(result.recoveryCommand, /worktree prune/v);
  } finally {
    chmodSync(tempDest, 0o700);
    rmSync(tempDest, { recursive: true, force: true });
  }
});

test('cleanupWorktree prunes stale metadata when the directory already disappeared', () => {
  const commands = [];
  const mockRunner = (cmd, args, options) => {
    commands.push({ cmd, args, options });
    if (args[0] === 'worktree' && args[1] === 'prune') return '';
    throw new Error('not a working tree');
  };
  const result = cleanupWorktree('/nonexistent/worktree', {
    repoRoot: '/mock/root',
    runner: mockRunner,
  });
  assert.equal(result.removed, true);
  assert.deepEqual(commands.at(-1).args, ['worktree', 'prune']);
});
