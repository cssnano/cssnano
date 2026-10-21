import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const runnerPath = new URL('./mutation-runner.js', import.meta.url).pathname;

let directory;
let fast;
let full;
let broken;
let strict;

/**
 * @param {string[]} args
 * @return {Promise<{code: number | null, stdout: string, stderr: string}>}
 */
function runRunner(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [runnerPath, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

/**
 * The report line of one mutation.
 *
 * @param {{stdout: string}} run
 * @param {string} mutation
 * @return {string}
 */
function lineOf(run, mutation) {
  return (
    run.stdout
      .split('\n')
      .find(
        (line) =>
          line.endsWith(`: ${mutation}`) || line.includes(`: ${mutation} |`)
      ) ?? ''
  );
}

before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'oracle-mutation-runner-'));
  const target = join(directory, 'target.js');
  const unused = join(directory, 'unused.js');
  await writeFile(
    target,
    [
      'export function double(value) {',
      '  if (value > 100) {',
      '    return value + value;',
      '  }',
      '  return value * 2;',
      '}',
      'export function sign(value) {',
      '  return Math.sign(value);',
      '}',
      'export function magnitude(value) {',
      '  return Math.abs(value);',
      '}',
      '',
    ].join('\n')
  );
  await writeFile(unused, 'export const unused = 1;\n');
  // `double` is checked on its output alone; `magnitude` also on a second
  // pass, which the output of the first pass cannot settle. `sign` accepts
  // any sign, so a wrong one passes its check.
  await writeFile(
    join(directory, 'suites.js'),
    `import { double, magnitude, sign } from './target.js';
const inputs = (sign) => (seed, count) =>
  Array.from({ length: count }, (_, index) => String(sign * (seed + index)));
export const suites = [
  {
    name: 'double',
    generate: inputs(1),
    run: (input) => String(double(Number(input))),
    check: (input, output) =>
      output === String(Number(input) * 2) ? undefined : 'not doubled',
  },
  {
    name: 'magnitude',
    generate: inputs(-1),
    run: (input) => String(magnitude(Number(input))),
    check: (input, output) =>
      output === String(-Number(input)) ? undefined : 'wrong magnitude',
    checkRun: (input, output, run) =>
      run(output) === output ? undefined : 'second pass changed the output',
  },
  {
    name: 'sign',
    generate: inputs(1),
    run: (input) => String(sign(Number(input))),
    check: (input, output) =>
      ['-1', '0', '1'].includes(output) ? undefined : 'not a sign',
  },
];
`
  );
  await writeFile(
    join(directory, 'broken.js'),
    `export const suites = [
  {
    name: 'broken',
    generate: (seed, count) => Array.from({ length: count }, () => 'x'),
    run: (input) => input,
    check: () => 'always wrong',
  },
];
`
  );
  await writeFile(
    join(directory, 'catalog.js'),
    `export const name = 'fixture';
export const target = ${JSON.stringify(pathToFileURL(target).href)};
export const mutations = [
  { name: 'add one', find: 'value * 2;', replace: 'value * 2 + 1;' },
  { name: 'add instead', find: 'value * 2;', replace: 'value + value;' },
  {
    name: 'double small values only',
    find: 'return value * 2;',
    replace: 'return value < 3 ? value * 2 : value;',
  },
  {
    name: 'negate positive values',
    find: 'Math.abs(value)',
    replace: '-Math.abs(value) * Math.sign(value)',
  },
  {
    name: 'halve large values',
    find: 'return value + value;',
    replace: 'return value;',
  },
  { name: 'flip the sign', find: 'Math.sign(value)', replace: '-Math.sign(value)' },
  { name: 'missing fragment', find: 'value * 3;', replace: 'value;' },
  {
    name: 'unused module',
    target: ${JSON.stringify(pathToFileURL(unused).href)},
    find: 'unused = 1',
    replace: 'unused = 2',
  },
  { name: 'never return', find: 'return value * 2;', replace: 'for (;;);' },
];
`
  );
  const common = [
    '--check',
    'oracle',
    '--catalog',
    join(directory, 'catalog.js'),
    '--seeds',
    '1',
    '--count',
    '4',
    '--timeout',
    '3000',
  ];
  const lenient = [...common, '--allow-unkilled'];
  [fast, full, broken, strict] = await Promise.all([
    runRunner(['--suites', join(directory, 'suites.js'), ...lenient]),
    runRunner(['--suites', join(directory, 'suites.js'), ...lenient, '--full']),
    runRunner(['--suites', join(directory, 'broken.js'), ...lenient]),
    runRunner([
      '--suites',
      join(directory, 'suites.js'),
      ...common,
      '--only',
      '^fixture: (add instead|unused module)$',
    ]),
  ]);
});

after(async () => {
  await rm(directory, { recursive: true, force: true });
});

test('a mutant that every case catches is killed with every case counted', () => {
  assert.match(
    lineOf(fast, 'add one'),
    /^killed: .* double first=1:0 caught=4\/4/v
  );
});

test('a mutant is reported with the seed and index of the first case that catches it', () => {
  assert.match(
    lineOf(fast, 'double small values only'),
    /double first=1:2 caught=2\/4/v
  );
});

test('a mutant whose code runs but whose outputs all equal the baseline is unchanged, without one oracle check', () => {
  assert.match(
    lineOf(fast, 'add instead'),
    /^unchanged: .* double first=- caught=0\/4 reached=4 changed=0 checks=0/v
  );
});

test('a suite that never calls the mutated code counts no reached case', () => {
  assert.match(
    lineOf(fast, 'add instead'),
    /magnitude first=- caught=0\/4 reached=0 changed=0/v
  );
});

test('a mutant in a loaded module whose code no case executes is not reached, so its survival says nothing about the oracle', () => {
  assert.match(
    lineOf(fast, 'halve large values'),
    /^not reached: .* double first=- caught=0\/4 reached=0 changed=0/v
  );
});

test('a mutant that changes outputs the oracle accepts survives', () => {
  assert.match(
    lineOf(fast, 'flip the sign'),
    /^survived: .* sign first=- caught=0\/4 reached=4 changed=4/v
  );
});

test('with --full every case is checked, whatever its output', () => {
  assert.match(
    lineOf(full, 'add instead'),
    /double first=- caught=0\/4 reached=4 changed=0 checks=4/v
  );
});

test('a second-pass check catches a mutant whose first outputs equal the baseline', () => {
  assert.match(
    lineOf(fast, 'negate positive values'),
    /^killed: .* magnitude first=1:0 caught=4\/4 reached=4 changed=0 checks=0/v
  );
});

test('a mutation whose fragment is missing is reported as errored with the error message', () => {
  assert.match(
    lineOf(fast, 'missing fragment'),
    /^errored: .*\| Error: Mutation loader error: Mutation fragment was not found: value \* 3;$/v
  );
});

test('a mutation of a module the suites never load is reported as not reached', () => {
  assert.match(lineOf(fast, 'unused module'), /^not reached: /v);
});

test('a mutant that never returns is reported as timed out', () => {
  assert.match(lineOf(fast, 'never return'), /^timed out: /v);
});

test('errored or timed-out mutants fail the run', () => {
  assert.equal(fast.code, 1);
});

test('a suite that fails on the unmutated code stops the run before any mutant', () => {
  assert.match(broken.stderr, /baseline fails: broken case 1:0: always wrong/v);
});

test('a failing baseline fails the run', () => {
  assert.equal(broken.code, 1);
});

test('survivors and unreached mutants fail the run unless --allow-unkilled is given', () => {
  assert.equal(strict.code, 1);
});

test('the oracle check without a suites module stops the run', async () => {
  const run = await runRunner([
    '--check',
    'oracle',
    '--catalog',
    join(directory, 'catalog.js'),
  ]);
  assert.match(run.stderr, /--suites/v);
});
