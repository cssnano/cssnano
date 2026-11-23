import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { globSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  doneLine,
  failureLines,
  parseArguments,
  runTiers,
  selectSteps,
  steps,
} from './verify.js';
import { expandTestArguments, testGlobs } from './testArguments.js';

const repository = new URL('..', import.meta.url);

/** @param {string[]} globs @return {Set<string>} the files that `globs` match */
function globFiles(globs) {
  return new Set(
    globSync(globs, {
      cwd: fileURLToPath(repository),
      exclude: (path) => String(path).endsWith('node_modules'),
    }).map((file) => file.replaceAll('\\', '/'))
  );
}

/** @param {string} name @return {Set<string>} the files the step's globs match */
function stepFiles(name) {
  const { commands } = steps.find((step) => step.name === name);
  return globFiles(commands[0].filter((arg) => !arg.startsWith('-')).slice(1));
}

/** The repository's files, tracked or not, that Node's test patterns match. */
function testFiles() {
  const listed = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard'],
    { cwd: repository, encoding: 'utf8' }
  ).split('\n');
  const matched = globFiles(testGlobs('.'));
  return listed.filter((file) => matched.has(file));
}

test('pnpm test reaches every test file in the repository', () => {
  const reached = ['tests', 'mutation-harness', 'site'].map(stepFiles);
  assert.deepEqual(
    testFiles().filter((file) => !reached.some((files) => files.has(file))),
    []
  );
});

test('no test file runs in both the tests and mutation-harness steps', () => {
  const harness = stepFiles('mutation-harness');
  assert.deepEqual(
    [...stepFiles('tests')].filter((file) => harness.has(file)),
    []
  );
});

test('the mutation-harness step runs only the mutation harness tests', () => {
  assert.deepEqual(
    [...stepFiles('mutation-harness')].filter(
      (file) => !file.startsWith('util/mutation-testing/')
    ),
    []
  );
});

test('every file in util that the test patterns match imports node:test, so no module runs as an empty test', () => {
  assert.deepEqual(
    testFiles().filter(
      (file) =>
        file.startsWith('util/') &&
        !readFileSync(new URL(file, repository), 'utf8').includes(
          "from 'node:test'"
        )
    ),
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
    doneLine({
      failed: ['tests', 'lint'],
      skipped: [],
      notRun: [],
      logs: 'test-results/',
    }),
    'test: done status=fail failed=tests,lint skipped=none notrun=none logs=test-results/'
  );
});

test('doneLine passes with skipped steps but still names them', () => {
  assert.equal(
    doneLine({
      failed: [],
      skipped: ['site'],
      notRun: [],
      logs: 'test-results/',
    }),
    'test: done status=pass failed=none skipped=site notrun=none logs=test-results/'
  );
});

test('doneLine names the steps that never started apart from the skipped ones', () => {
  assert.equal(
    doneLine({
      failed: ['lint'],
      skipped: ['site'],
      notRun: ['tests', 'frameworks'],
      logs: 'test-results/',
    }),
    'test: done status=fail failed=lint skipped=site notrun=tests,frameworks logs=test-results/'
  );
});

test('expandTestArguments turns a directory into globs, since Node 22 runs a directory as a module', () => {
  assert.deepEqual(expandTestArguments(['util/'], 26), [
    'util/**/*.test.?(c|m)js',
    'util/**/*-test.?(c|m)js',
    'util/**/*_test.?(c|m)js',
    'util/**/test-*.?(c|m)js',
    'util/**/test.?(c|m)js',
    'util/**/test/**/*.?(c|m)js',
  ]);
});

test('expandTestArguments leaves the mutation harness out of util below Node 24, where the runner refuses to start', () => {
  assert.deepEqual(
    expandTestArguments(['util'], 22).filter((glob) =>
      glob.startsWith('util/**/')
    ),
    []
  );
});

test('expandTestArguments treats every file under a test directory as a test', () => {
  assert.deepEqual(expandTestArguments(['packages/cssnano/test/merge/']), [
    'packages/cssnano/test/merge/**/*.?(c|m)js',
  ]);
});

test('expandTestArguments leaves flags, files and globs as they are', () => {
  const args = ['--test-name-pattern=x', 'util/verify.test.js', 'util/**/*.js'];
  assert.deepEqual(expandTestArguments(args), args);
});

test('the stale mutation gate covers every registered catalog, whatever its check', async () => {
  const { catalogs } = await import('../packages/cssnano/mutation/catalogs.js');
  const { selectCatalogs } =
    await import('./mutation-testing/mutation-testing.js');
  const { commands } = steps.find(({ name }) => name === 'mutation-stale');
  const checked = commands.map(
    (command) => command[command.indexOf('--check') + 1]
  );
  const covered = new Set(
    checked.flatMap((check) => selectCatalogs(catalogs, check))
  );
  assert.deepEqual(
    catalogs.filter((entry) => !covered.has(entry)).map(({ url }) => url.href),
    []
  );
});

const gateNames = ['types', 'lint', 'format', 'data', 'mutation-stale'];

test('the cheap checks, including the data freshness and stale mutation checks, form the gate tier', () => {
  assert.deepEqual(
    steps.filter(({ tier }) => tier === 'gate').map(({ name }) => name),
    gateNames
  );
});

test('the tests, mutation harness, site, frameworks and mutation baselines form the slow tier', () => {
  assert.deepEqual(
    steps.filter(({ tier }) => tier === 'slow').map(({ name }) => name),
    ['tests', 'mutation-harness', 'site', 'frameworks', 'mutation-baselines']
  );
});

/** @param {string[]} argv */
const chosenNames = (argv) =>
  parseArguments(argv).chosen.map(({ name }) => name);

test('parseArguments with no arguments chooses every step', () => {
  assert.deepEqual(
    chosenNames([]),
    steps.map(({ name }) => name)
  );
});

test('parseArguments with paths chooses one tests step over those paths', () => {
  const [step] = parseArguments(['util/verify.test.js']).chosen;
  assert.deepEqual(step.commands[0].slice(-1), ['util/verify.test.js']);
});

test('parseArguments with --steps chooses the named steps', () => {
  assert.deepEqual(chosenNames(['--steps=lint,types']), ['types', 'lint']);
});

test('parseArguments reads --keep-going beside --steps', () => {
  assert.equal(
    parseArguments(['--steps=lint', '--keep-going']).keepGoing,
    true
  );
});

test('parseArguments rejects --steps with test paths, which it would not run', () => {
  assert.throws(
    () => parseArguments(['--steps=lint', 'packages']),
    /--steps takes no test paths/v
  );
});

test('parseArguments rejects a repeated --steps, whose names it would drop', () => {
  assert.throws(
    () => parseArguments(['--steps=types', '--steps=lint']),
    /--steps given more than once/v
  );
});

test('parseArguments rejects an empty --steps list', () => {
  assert.throws(() => parseArguments(['--steps=']), /--steps names no step/v);
});

test('parseArguments rejects --steps without =, which would read as a path', () => {
  assert.throws(
    () => parseArguments(['--steps', 'lint']),
    /--steps takes its names after =/v
  );
});

test('selectSteps keeps the named steps in their run order', () => {
  assert.deepEqual(
    selectSteps(['mutation-baselines', 'frameworks']).map(({ name }) => name),
    ['frameworks', 'mutation-baselines']
  );
});

test('selectSteps rejects a name that is not a step', () => {
  assert.throws(() => selectSteps(['lint', 'typo']), /unknown step: typo/v);
});

/**
 * @param {string[]} failing
 * @param {string[]} [skipping]
 * @return {{started: string[], execute: (step: {name: string}) => Promise<string>}}
 */
function fakeExecutor(failing, skipping = []) {
  const started = [];
  return {
    started,
    async execute({ name }) {
      started.push(name);
      if (skipping.includes(name)) return 'skipped';
      return failing.includes(name) ? 'fail' : 'pass';
    },
  };
}

const plan = [
  ...gateNames.map((name) => ({ name, tier: 'gate' })),
  ...['tests', 'site'].map((name) => ({ name, tier: 'slow' })),
];

test('runTiers does not start the slow tier after a gate step fails', async () => {
  const { started, execute } = fakeExecutor(['lint']);
  await runTiers(plan, { keepGoing: false, execute });
  assert.deepEqual(started, gateNames);
});

test('runTiers lets the other gate steps finish when one fails', async () => {
  const { execute } = fakeExecutor(['lint']);
  const outcome = await runTiers(plan, { keepGoing: false, execute });
  assert.deepEqual(outcome.failed, ['lint']);
});

test('runTiers names the slow steps that never started as not run', async () => {
  const { execute } = fakeExecutor(['types']);
  const outcome = await runTiers(plan, { keepGoing: false, execute });
  assert.deepEqual(outcome.notRun, ['tests', 'site']);
});

test('runTiers keeps a step that cannot run here out of notRun', async () => {
  const { execute } = fakeExecutor([], ['site']);
  const outcome = await runTiers(plan, { keepGoing: false, execute });
  assert.deepEqual(
    { skipped: outcome.skipped, notRun: outcome.notRun },
    { skipped: ['site'], notRun: [] }
  );
});

test('runTiers runs every slow step to the end when one of them fails', async () => {
  const { started, execute } = fakeExecutor(['tests']);
  const outcome = await runTiers(plan, { keepGoing: false, execute });
  assert.deepEqual(
    { started: started.slice(gateNames.length), failed: outcome.failed },
    { started: ['tests', 'site'], failed: ['tests'] }
  );
});

test('runTiers with keepGoing starts the slow tier after a gate failure', async () => {
  const { started, execute } = fakeExecutor(['lint']);
  const outcome = await runTiers(plan, { keepGoing: true, execute });
  assert.deepEqual(
    { started: started.length, notRun: outcome.notRun },
    { started: plan.length, notRun: [] }
  );
});

test('runTiers starts the gate steps together', async () => {
  let running = 0;
  let peak = 0;
  await runTiers(plan, {
    keepGoing: false,
    async execute({ tier }) {
      if (tier !== 'gate') return 'pass';
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => {
        setImmediate(resolve);
      });
      running -= 1;
      return 'pass';
    },
  });
  assert.equal(peak, gateNames.length);
});
