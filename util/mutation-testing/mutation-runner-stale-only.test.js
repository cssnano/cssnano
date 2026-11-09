import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const runnerPath = new URL('./mutation-runner.js', import.meta.url).pathname;

let directory;
let catalog;
let staleCatalog;

before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'mutation-stale-only-'));
  const target = join(directory, 'target.js');
  const testFile = join(directory, 'target.test.js');
  await writeFile(target, 'export const value = 1;\n');
  await writeFile(testFile, "import './target.js';\n");
  const header = [
    "export const name = 'fixture';",
    `export const target = ${JSON.stringify(pathToFileURL(target).href)};`,
    `export const test = ${JSON.stringify(pathToFileURL(testFile).href)};`,
  ].join('\n');
  const mutation =
    "{ name: 'change value', find: 'value = 1', replace: 'value = 2' }";
  catalog = join(directory, 'catalog.js');
  staleCatalog = join(directory, 'stale-catalog.js');
  await writeFile(
    catalog,
    `${header}\nexport const mutations = [${mutation}];\n`
  );
  await writeFile(
    staleCatalog,
    `${header}\nexport const mutations = [\n  { name: 'gone', find: 'not there', replace: 'x' },\n  ${mutation},\n];\n`
  );
});

after(() => rm(directory, { recursive: true, force: true }));

function runStaleOnly(path, extra = []) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [runnerPath, '--catalog', path, '--stale-only', ...extra],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

const judged = /^(killed|survived|unchanged|not reached|errored): |judged/mv;

test('the stale-only check fails on a stale fragment and runs no mutant', async () => {
  const run = await runStaleOnly(staleCatalog);
  assert.deepStrictEqual(
    [
      run.code,
      /^stale: fixture: gone \| /mv.test(run.stdout),
      judged.test(run.stdout),
    ],
    [1, true, false]
  );
});

test('the stale-only check passes when every fragment applies, and runs no mutant', async () => {
  const run = await runStaleOnly(catalog);
  assert.deepStrictEqual([run.code, judged.test(run.stdout)], [0, false]);
});

test('the stale-only check refuses --out, --baseline and --only', async () => {
  const runs = await Promise.all(
    [
      ['--out', 'never.json'],
      ['--baseline', 'missing.json'],
      ['--only', 'x'],
    ].map((flag) => runStaleOnly(catalog, flag))
  );
  assert.deepStrictEqual(
    runs.map((run) => [
      run.code,
      /--stale-only cannot be combined/v.test(run.stderr),
    ]),
    [
      [1, true],
      [1, true],
      [1, true],
    ]
  );
});

function runAll(extra) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [runnerPath, '--all', '--stale-only', ...extra],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    let stdout = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.on('close', () => resolve(stdout));
  });
}

const count = /^Running \d+ mutants of \d+ catalogs/mv;

// Without the plan line both runs would compare equal while selecting nothing.
test('--all without --check selects the catalogs the test check runs', async () => {
  const [implicit, explicit] = await Promise.all([
    runAll([]),
    runAll(['--check', 'test']),
  ]);
  const [plan] = explicit.match(count) ?? assert.fail(explicit);
  assert.equal(implicit.match(count)?.[0], plan);
});
