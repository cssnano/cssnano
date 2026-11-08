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

test('the last stdout line states that the run is done, with every count and the results path', () => {
  assert.match(
    runner.stdout.trimEnd().split('\n').at(-1),
    /^mutation: done status=fail mutants=4 killed=1 survived=0 unchanged=0 not-reached=1 errored=2 timed-out=0 stale=0 regressions=0 results=\S+\.json$/v
  );
});

test('the lines before the done line list each mutant that was not killed', () => {
  const lines = runner.stdout.trimEnd().split('\n');
  const block = lines.slice(lines.indexOf('mutation: not killed (3):') + 1, -1);
  assert.deepStrictEqual(
    block.map((line) => line.trim().split(':')[0]),
    ['errored', 'not reached', 'errored']
  );
});

test('the results file records the status of each mutant', async () => {
  const path = /results=(\S+)$/v.exec(runner.stdout.trimEnd())[1];
  const { results } = JSON.parse(await readFile(path, 'utf8'));
  assert.deepStrictEqual(
    results.map(({ name, status }) => [name, status]),
    [
      ['fixture: change value', 'killed'],
      ['fixture: break syntax', 'errored'],
      ['fixture: unused module', 'not reached'],
      ['fixture: throw at load', 'errored'],
    ]
  );
});

async function staleCatalog() {
  const catalog = join(directory, 'stale-catalog.js');
  await writeFile(
    catalog,
    (await readFile(join(directory, 'catalog.js'), 'utf8')).replace(
      "{ name: 'change value',",
      "{ name: 'gone', find: 'text that is not there', replace: 'x' },\n  { name: 'change value',"
    )
  );
  return catalog;
}

test('a mutant whose fragment is gone is stale, and no mutant runs', async () => {
  const run = await runCatalog(await staleCatalog());
  assert.deepStrictEqual(
    [
      run.code,
      /^stale: fixture: gone \| .*was not found/mv.test(run.stdout),
      /judged/v.test(run.stdout),
      /stale=1/v.test(run.stdout.trimEnd().split('\n').at(-1)),
    ],
    [1, true, false, true]
  );
});

test('a stale mutant fails the run even with --allow-unkilled', async () => {
  const run = await runCatalog(await staleCatalog(), ['--allow-unkilled']);
  assert.strictEqual(run.code, 1);
});

test('--baseline fails the run for a mutant the baseline killed and this run did not', async () => {
  const baseline = join(directory, 'baseline.json');
  await writeFile(
    baseline,
    JSON.stringify({
      results: [{ name: 'fixture: break syntax', status: 'killed' }],
    })
  );
  const run = await runCatalog(join(directory, 'catalog.js'), [
    '--allow-unkilled',
    '--baseline',
    baseline,
    '--only',
    'break syntax',
  ]);
  assert.deepStrictEqual(
    [
      /^regression: fixture: break syntax \| killed -> errored$/mv.test(
        run.stdout
      ),
      /regressions=1/v.test(run.stdout.trimEnd().split('\n').at(-1)),
    ],
    [true, true]
  );
});

test('--out chooses where the results file goes', async () => {
  const out = join(directory, 'chosen.json');
  await runCatalog(join(directory, 'catalog.js'), [
    '--only',
    'change value',
    '--out',
    out,
  ]);
  const { results } = JSON.parse(await readFile(out, 'utf8'));
  assert.strictEqual(results[0].status, 'killed');
});

test('an unknown --group fails with the names of the groups', async () => {
  const run = await runCatalog(join(directory, 'catalog.js'), [
    '--group',
    'nonesuch',
  ]);
  assert.deepStrictEqual(
    [run.code, /Unknown --group nonesuch; use .*merge-rules/v.test(run.stderr)],
    [1, true]
  );
});

test('a run that cannot start still ends with a done line', async () => {
  const missing = join(directory, 'missing-catalog.js');
  const { stdout } = await runCatalog(missing);
  assert.strictEqual(
    stdout.trimEnd().split('\n').at(-1),
    'mutation: done status=fail'
  );
});

test('each judged mutant prints a progress line with its position', () => {
  assert.match(runner.stdout, /^mutation: 4\/4 judged$/mv);
});

test('--group rejects flags that would change what the group runs', async () => {
  for (const flag of [['--allow-unkilled'], ['--check', 'oracle'], ['--all']]) {
    const run = await runCatalog(join(directory, 'catalog.js'), [
      '--group',
      'merge-rules',
      ...flag,
    ]);
    assert.match(run.stderr, /cannot be combined with --group/v, flag[0]);
  }
});

test('the results file is written even when the baseline cannot be read', async () => {
  const out = join(directory, 'kept.json');
  const run = await runCatalog(join(directory, 'catalog.js'), [
    '--only',
    'change value',
    '--out',
    out,
    '--baseline',
    join(directory, 'missing-baseline.json'),
  ]);
  const { results } = JSON.parse(await readFile(out, 'utf8'));
  assert.deepStrictEqual([run.code, results[0].status], [1, 'killed']);
});

test('the mutants of a catalog whose baseline fails are reported as errored', async () => {
  const failing = join(directory, 'failing.test.js');
  await writeFile(
    failing,
    "import { test } from 'node:test';\ntest('fails', () => { throw new Error('no'); });\n"
  );
  const catalog = join(directory, 'failing-catalog.js');
  await writeFile(
    catalog,
    (await readFile(join(directory, 'catalog.js'), 'utf8')).replace(
      /export const test = .*;/v,
      `export const test = ${JSON.stringify(pathToFileURL(failing).href)};`
    )
  );
  const out = join(directory, 'failing.json');
  await runCatalog(catalog, ['--out', out]);
  const { results } = JSON.parse(await readFile(out, 'utf8'));
  assert.deepStrictEqual(
    results.map(({ status }) => status),
    ['errored', 'errored', 'errored', 'errored']
  );
});

test('a stale run does not compare with the baseline, so stale mutants are not regressions', async () => {
  const baseline = join(directory, 'stale-baseline.json');
  await writeFile(
    baseline,
    JSON.stringify({ results: [{ name: 'fixture: gone', status: 'killed' }] })
  );
  const run = await runCatalog(await staleCatalog(), ['--baseline', baseline]);
  assert.deepStrictEqual(
    [/^regression:/mv.test(run.stdout), /regressions=0/v.test(run.stdout)],
    [false, true]
  );
});

test('a failing baseline names its exit code and first output line in the results file', async () => {
  const failing = join(directory, 'cause.test.js');
  await writeFile(
    failing,
    "import { test } from 'node:test';\ntest('fails', () => { throw new Error('boom'); });\n"
  );
  const catalog = join(directory, 'cause-catalog.js');
  await writeFile(
    catalog,
    (await readFile(join(directory, 'catalog.js'), 'utf8')).replace(
      /export const test = .*;/v,
      `export const test = ${JSON.stringify(pathToFileURL(failing).href)};`
    )
  );
  const out = join(directory, 'cause.json');
  await runCatalog(catalog, ['--out', out]);
  const { results } = JSON.parse(await readFile(out, 'utf8'));
  assert.match(results[0].detail, /^baseline failed \(exit 1\): \S/v);
});

test('--out refuses a results file that exists, so a concurrent run cannot overwrite it', async () => {
  const out = join(directory, 'taken.json');
  await writeFile(out, '{"keep":true}');
  const run = await runCatalog(join(directory, 'catalog.js'), [
    '--only',
    'change value',
    '--out',
    out,
  ]);
  assert.deepStrictEqual(
    [
      run.code,
      /already exists/v.test(run.stderr),
      await readFile(out, 'utf8'),
      run.stdout.trimEnd().split('\n').at(-1),
    ],
    [1, true, '{"keep":true}', 'mutation: done status=fail']
  );
});

test('a run announces its process id and results file before judging', async () => {
  const out = join(directory, 'announced.json');
  const run = await runCatalog(join(directory, 'catalog.js'), [
    '--only',
    'change value',
    '--out',
    out,
  ]);
  assert.match(
    run.stdout,
    /^mutation: started pid=\d+ out=\S+announced\.json$/mv
  );
});
