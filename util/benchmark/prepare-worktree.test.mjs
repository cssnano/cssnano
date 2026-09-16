import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { cleanupWorktree, prepareWorktree } from './prepare-worktree.mjs';

test('prepareWorktree validates options', () => {
  assert.throws(() => prepareWorktree(null), /options must be an object/);
  assert.throws(
    () => prepareWorktree({}),
    /options\.revision must be a non-empty string/
  );
  assert.throws(
    () => prepareWorktree({ revision: '' }),
    /options\.revision must be a non-empty string/
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
    /targetPath must be a non-empty string/
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
  } finally {
    rmSync(tempDest, { recursive: true, force: true });
  }
});
