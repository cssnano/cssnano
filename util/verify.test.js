import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { doneLine, failureLines, siteRoot, testRoots } from './verify.js';

const repository = new URL('..', import.meta.url);

test('pnpm test reaches every test file in the repository', () => {
  const files = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '*.test.js'],
    { cwd: repository, encoding: 'utf8' }
  )
    .split('\n')
    .filter(Boolean);
  const roots = [...testRoots, siteRoot].map((root) => `${root}/`);
  assert.deepEqual(
    files.filter((file) => !roots.some((root) => file.startsWith(root))),
    []
  );
});

test('the root manifest offers one test command', () => {
  const { scripts } = JSON.parse(
    readFileSync(new URL('package.json', repository), 'utf8')
  );
  assert.deepEqual(
    Object.keys(scripts).filter((name) =>
      /^test\b|^verify$|^lint$|^types$/v.test(name)
    ),
    ['test']
  );
});

test('failureLines lists a failing test once, though the summary repeats it', () => {
  const output = [
    '✔ a passes (1ms)',
    '✖ b fails (2ms)',
    'ℹ fail 1',
    '✖ failing tests:',
    '✖ b fails (2ms)',
  ].join('\n');
  assert.deepEqual(failureLines(output), ['✖ b fails (2ms)']);
});

test('failureLines picks type errors out of the compiler output', () => {
  const output = 'src/a.js(3,1): error TS2322: Type mismatch.\nFound 1 error.';
  assert.deepEqual(failureLines(output), [
    'src/a.js(3,1): error TS2322: Type mismatch.',
  ]);
});

test('failureLines picks lint errors out of the linter output', () => {
  const output = [
    '$ pnpm exec oxlint .',
    'util/a.js:2:3: error eslint(no-console): Unexpected console statement.',
    'Found 1 error.',
  ].join('\n');
  assert.deepEqual(failureLines(output), [
    'util/a.js:2:3: error eslint(no-console): Unexpected console statement.',
  ]);
});

test('failureLines falls back to the last lines when no line reads as a failure', () => {
  const output = Array.from({ length: 12 }, (_, i) => `line ${i}`).join('\n');
  assert.deepEqual(failureLines(output), output.split('\n').slice(-10));
});

test('doneLine fails and names the failed steps', () => {
  assert.equal(
    doneLine({ failed: ['tests', 'lint'], skipped: [], logs: 'test-results/' }),
    'test: done status=fail failed=tests,lint skipped=none logs=test-results/'
  );
});

test('doneLine passes with skipped steps but still names them', () => {
  assert.equal(
    doneLine({ failed: [], skipped: ['site'], logs: 'test-results/' }),
    'test: done status=pass failed=none skipped=site logs=test-results/'
  );
});
