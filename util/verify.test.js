import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  doneLine,
  failureLines,
  runTiers,
  siteRoot,
  steps,
  testRoots,
} from './verify.js';

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

const gateNames = ['types', 'lint', 'format', 'mutation-stale'];

test('the cheap checks, including the stale mutation check, form the gate tier', () => {
  assert.deepEqual(
    steps.filter(({ tier }) => tier === 'gate').map(({ name }) => name),
    gateNames
  );
});

test('the tests, site, frameworks and mutation baselines form the slow tier', () => {
  assert.deepEqual(
    steps.filter(({ tier }) => tier === 'slow').map(({ name }) => name),
    ['tests', 'site', 'frameworks', 'mutation-baselines']
  );
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
