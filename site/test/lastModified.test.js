import { after, test } from 'node:test';
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getLastModified } from '../src/utils/lastModified.js';

const temporaryDirectories = [];
after(() => {
  for (const directory of temporaryDirectories) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function createTemporaryDirectory(prefix) {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

function commit(cwd, file, isoDate) {
  writeFileSync(join(cwd, file), `${isoDate}\n`);
  git(cwd, 'add', file);
  execFileSync('git', ['commit', '-m', file], {
    cwd,
    env: {
      ...process.env,
      GIT_AUTHOR_DATE: isoDate,
      GIT_COMMITTER_DATE: isoDate,
    },
  });
}

function createRepository() {
  const cwd = createTemporaryDirectory('last-modified-');
  git(cwd, 'init', '-q');
  git(cwd, 'config', 'user.email', 'test@example.com');
  git(cwd, 'config', 'user.name', 'Test');
  git(cwd, 'config', 'commit.gpgsign', 'false');
  return cwd;
}

test('last modified date is the date of the last commit touching the file', () => {
  const cwd = createRepository();
  commit(cwd, 'a.md', '2024-01-02T03:04:05Z');
  commit(cwd, 'b.md', '2025-06-07T08:09:10Z');

  assert.strictEqual(
    getLastModified('a.md', cwd).toISOString(),
    '2024-01-02T03:04:05.000Z'
  );
});

test('last modified date is undefined for a file git does not track', () => {
  const cwd = createRepository();
  commit(cwd, 'a.md', '2024-01-02T03:04:05Z');

  assert.strictEqual(getLastModified('missing.md', cwd), undefined);
});

test('last modified date without a directory is read from the site repository, not the working directory', () => {
  const elsewhere = createRepository();
  commit(elsewhere, 'a.md', '2024-01-02T03:04:05Z');
  const previous = process.cwd();
  process.chdir(elsewhere);
  try {
    assert.strictEqual(getLastModified('a.md'), undefined);
  } finally {
    process.chdir(previous);
  }
});

test('last modified date is undefined outside a git repository', () => {
  const cwd = createTemporaryDirectory('last-modified-none-');

  assert.strictEqual(getLastModified('a.md', cwd), undefined);
});

test('last modified date is undefined in a shallow clone, where every file shows the tip commit', () => {
  const source = createRepository();
  commit(source, 'a.md', '2024-01-02T03:04:05Z');
  commit(source, 'b.md', '2025-06-07T08:09:10Z');
  const clone = createTemporaryDirectory('last-modified-shallow-');
  git(clone, 'clone', '-q', '--depth=1', `file://${source}`, '.');

  assert.strictEqual(getLastModified('a.md', clone), undefined);
});
