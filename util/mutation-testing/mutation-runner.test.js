import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
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

  await writeFile(target, 'export const value = 1;\n');
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
  { name: 'throw at load', find: 'value = 1;', replace: 'value = missingName;' },
];
`
  );

  runner = await runCatalog(catalog);
});

after(async () => {
  await rm(directory, { recursive: true, force: true });
});

function runCatalog(catalogPath) {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [runnerPath, '--catalog', catalogPath],
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
  assert.match(runner.stdout, /fixture: killed: change value/v);
});

test('reports a mutant that breaks the syntax as errored, not killed', () => {
  assert.match(runner.stdout, /fixture: errored: break syntax/v);
});

test('reports the location of a syntax error in the mutated module', () => {
  assert.match(runner.stderr, /target\.js:1/v);
});

test('reports a mutant that throws while the module loads as errored, not killed', () => {
  assert.match(runner.stdout, /fixture: errored: throw at load/v);
});

test('reports the load-time error that a module-load mutant raises', () => {
  assert.match(runner.stderr, /missingName is not defined/v);
});
