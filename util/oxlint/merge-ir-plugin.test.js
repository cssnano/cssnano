import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const oxlint = join(root, 'node_modules/.bin/oxlint');
const fixtures = 'util/oxlint/fixtures/merge-ir';

/**
 * Lints one fixture with its own config, from the repository root, since the
 * fixture options name paths relative to it. Returns the merge-ir diagnostics.
 *
 * @param {string} rule the fixture directory, which is the rule's name
 * @param {string} name the file in that directory
 */
function lintFixture(rule, name) {
  const dir = `${fixtures}/${rule}`;
  const run = spawnSync(
    oxlint,
    ['-c', `${dir}/oxlintrc.json`, '--format', 'json', `${dir}/${name}`],
    { cwd: root, encoding: 'utf8' }
  );
  const { diagnostics } = JSON.parse(run.stdout);
  return diagnostics
    .filter((diagnostic) => diagnostic.code.startsWith('merge-ir('))
    .map((diagnostic) => ({
      line: diagnostic.labels[0].span.line,
      message: diagnostic.message,
    }));
}

/** Reads a JSONC file: the repository config keeps whole-line comments. */
function readConfig(path) {
  const text = readFileSync(join(root, path), 'utf8').replaceAll(
    /^\s*\/\/.*$/gmv,
    ''
  );
  return JSON.parse(text);
}

test('link-edits-through-arena reports a links edit outside blockRecords.js', () => {
  const found = lintFixture('link-edits-through-arena', 'reports.js');
  assert.deepEqual(found, [
    {
      line: 3,
      message: 'a links edit outside the arena of blockRecords.js',
    },
  ]);
});

test('link-edits-through-arena accepts the four wrappers on this.#links', () => {
  assert.deepEqual(lintFixture('link-edits-through-arena', 'wrappers.js'), []);
});

test('link-edits-through-arena reports a required wrapper that is missing', () => {
  const found = lintFixture('link-edits-through-arena', 'missing.js');
  assert.deepEqual(found, [
    {
      line: 1,
      message: `required site ${fixtures}/link-edits-through-arena/missing.js#takeLinkOf is missing`,
    },
  ]);
});

test('cache-reads reports a keysOf or receivingOf call outside the readers', () => {
  const found = lintFixture('cache-reads', 'reports.js');
  assert.deepEqual(found, [
    {
      line: 3,
      message: 'a declaration cache read outside its reader functions',
    },
  ]);
});

test('cache-reads accepts the reader functions of the declaration cache', () => {
  assert.deepEqual(lintFixture('cache-reads', 'reader.js'), []);
});

test('cache-reads reports a required reader that is missing', () => {
  const found = lintFixture('cache-reads', 'missing.js');
  assert.deepEqual(found, [
    {
      line: 1,
      message: `required site ${fixtures}/cache-reads/missing.js#declarationKeys is missing`,
    },
  ]);
});

test('no-cache-local reports a variable that holds a rule declaration cache', () => {
  const found = lintFixture('no-cache-local', 'reports.js');
  assert.deepEqual(found, [
    {
      line: 3,
      message: 'a variable holds the declaration cache of a rule',
    },
  ]);
});

test('no-cache-local reports declarationKeys called as a method', () => {
  const found = lintFixture('no-cache-local', 'method.js');
  assert.deepEqual(found, [
    { line: 4, message: 'declarationKeys is a function, not a method' },
  ]);
});

test('no-cache-local accepts a rule read through its records', () => {
  assert.deepEqual(lintFixture('no-cache-local', 'passes.js'), []);
});

test('the repository config names only files that exist', () => {
  const config = readConfig('.oxlintrc.json');
  const named = config.overrides.flatMap((override) =>
    Object.values(override.rules).flatMap((setting) => {
      const options = Array.isArray(setting) ? setting[1] : undefined;
      return [...(options?.allowed ?? []), ...(options?.required ?? [])];
    })
  );
  assert.ok(named.length > 0);
  const missing = named
    .map((entry) => entry.split('#')[0])
    .filter((file) => !existsSync(join(root, file)));
  assert.deepEqual(missing, []);
});

test('the merge pass sources pass every merge-ir rule under the repository config', () => {
  const run = spawnSync(
    oxlint,
    [
      '-c',
      '.oxlintrc.json',
      '--format',
      'json',
      'packages/cssnano/src/passes/merge',
    ],
    { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );
  const { diagnostics } = JSON.parse(run.stdout);
  const violations = diagnostics
    .filter((diagnostic) => diagnostic.code.startsWith('merge-ir('))
    .map((diagnostic) => `${diagnostic.filename}: ${diagnostic.message}`);
  assert.deepEqual(violations, []);
});

test('no-postcss-in-window reports an import of postcss and a JSDoc type import from it', () => {
  const found = lintFixture('no-postcss-in-window', 'reports.js');
  assert.deepEqual(
    found.map((diagnostic) => diagnostic.line),
    [1, 2, 3]
  );
});

test('no-postcss-in-window accepts a file that names postcss only in prose', () => {
  assert.deepEqual(lintFixture('no-postcss-in-window', 'clean.js'), []);
});

test('no-postcss-in-window accepts a file the config allows to reach postcss', () => {
  assert.deepEqual(lintFixture('no-postcss-in-window', 'allowed.js'), []);
});
