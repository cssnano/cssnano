import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const runnerPath = new URL('./mutation-runner.js', import.meta.url).pathname;

let directory;
let runner;

before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'mutation-runner-'));
  const target = join(directory, 'target.js');
  const testFile = join(directory, 'target.test.js');
  const catalog = join(directory, 'catalog.js');

  const unused = join(directory, 'unused.js');
  await writeFile(target, 'export const value = 1;\n');
  await writeFile(unused, 'export const unused = 1;\n');
  await writeFile(
    testFile,
    [
      "import { test } from 'node:test';",
      "import assert from 'node:assert/strict';",
      "import { value } from './target.js';",
      "test('value is one', () => assert.strictEqual(value, 1));",
      '',
    ].join('\n')
  );
  await writeFile(
    catalog,
    `export const name = 'fixture';
export const target = ${JSON.stringify(pathToFileURL(target).href)};
export const test = ${JSON.stringify(pathToFileURL(testFile).href)};
export const mutations = [
  { name: 'change value', find: 'value = 1', replace: 'value = 2' },
  { name: 'break syntax', find: 'value = 1;', replace: 'value = (;' },
  {
    name: 'unused module',
    target: ${JSON.stringify(pathToFileURL(unused).href)},
    find: 'unused = 1',
    replace: 'unused = 2',
  },
  { name: 'throw at load', find: 'value = 1;', replace: 'value = missingName;' },
];
`
  );

  runner = await runCatalog(catalog);
});

after(async () => {
  await rm(directory, { recursive: true, force: true });
});

function runCatalog(catalogPath, extra = []) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [runnerPath, '--catalog', catalogPath, ...extra],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

test('reports a mutant that changes behavior as killed', () => {
  assert.match(runner.stdout, /killed: fixture: change value/v);
});

test('reports a mutant that breaks the syntax as errored, not killed', () => {
  assert.match(runner.stdout, /errored: fixture: break syntax/v);
});

test('reports the location of a syntax error in the mutated module', () => {
  assert.match(runner.stderr, /target\.js:1/v);
});

test('reports a mutant that throws while the module loads as errored, not killed', () => {
  assert.match(runner.stdout, /errored: fixture: throw at load/v);
});

test('reports the load-time error that a module-load mutant raises', () => {
  assert.match(runner.stderr, /missingName is not defined/v);
});

test('reports a mutant of a module the tests never load as not reached, not survived', () => {
  assert.match(runner.stdout, /not reached: fixture: unused module/v);
});

test('a mutant that no test reaches fails the run', () => {
  assert.strictEqual(runner.code, 1);
});

test('an --only pattern that matches no mutant fails the run before any mutant runs', async () => {
  const run = await runCatalog(join(directory, 'catalog.js'), [
    '--only',
    'nomatch',
  ]);
  assert.deepStrictEqual(
    [run.code, /No mutant matches --only nomatch/v.test(run.stderr)],
    [1, true]
  );
});

test('a test file that executes no tests fails the run instead of letting every mutant survive', async () => {
  const empty = join(directory, 'empty.test.js');
  await writeFile(empty, "import './target.js';\n");
  const catalog = join(directory, 'empty-catalog.js');
  await writeFile(
    catalog,
    (await readFile(join(directory, 'catalog.js'), 'utf8')).replace(
      /export const test = .*;/v,
      `export const test = ${JSON.stringify(pathToFileURL(empty).href)};`
    )
  );
  const run = await runCatalog(catalog);
  assert.deepStrictEqual(
    [run.code, /ran no tests/v.test(run.stderr)],
    [1, true]
  );
});
