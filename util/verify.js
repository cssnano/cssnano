// `pnpm test`, the repository's one test command.
//
//   pnpm test                    every check that gates a change
//   pnpm test --keep-going       the same, without stopping after a failed gate
//   pnpm test <path>… [flags]    `node --test` on those paths, while iterating
//
// It prints a started line, a line as each step starts and ends, and a last
// line that is the verdict, which the exit code agrees with:
//
//   test: done status=pass|fail failed=<steps|none> skipped=<steps|none> notrun=<steps|none> logs=test-results/
//
// Each step's output streams to test-results/<step>.log as it runs. A step
// that cannot run here is skipped, never passed, and the last line names it.
//
// The cheap steps (the gate tier) run together first. If one fails, the slow
// steps would only have to run again after the fix, so they never start and
// the last line names them as notrun. The slow steps run to the end, so one run
// reports every failure; --keep-going also runs them after a failed gate.
import { spawn } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, rmSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(import.meta.dirname, '..');
const logDir = join(root, 'test-results');
const node = process.execPath;

/** The directories the tests step hands to `node --test`, which finds every test in them. */
export const testRoots = ['packages', 'util'];
/** The site's tests resolve `cssnano` through the site's own install. */
export const siteRoot = 'site/test';

/**
 * @typedef {(write: (text: string) => void) => Promise<number>} Run
 * @typedef {{name: string, tier: 'gate' | 'slow', commands?: string[][], run?: Run, skip?: () => string | null}} Step
 */

/**
 * @param {string[]} args paths and `node --test` flags
 * @return {string[]}
 */
function testCommand(args) {
  return [node, '--test', '--test-reporter=spec', ...args];
}

/** @return {string | null} why mutation testing cannot run here, or null */
function needsNode24() {
  return Number(process.versions.node.split('.')[0]) < 24
    ? 'mutation testing needs Node 24'
    : null;
}

/** @type {Step[]} */
export const steps = [
  {
    name: 'types',
    tier: 'gate',
    commands: [
      ['pnpm', 'exec', 'tsc', '-b'],
      ['pnpm', 'exec', 'tsc', '-p', 'packages/cssnano/test/types'],
    ],
  },
  { name: 'lint', tier: 'gate', commands: [['pnpm', 'exec', 'oxlint', '.']] },
  {
    name: 'format',
    tier: 'gate',
    commands: [['pnpm', 'exec', 'oxfmt', '--check']],
  },
  {
    // Applies every mutation in memory, so a fragment that no longer matches
    // its source fails here and not after the slow baselines.
    name: 'mutation-stale',
    tier: 'gate',
    commands: ['test', 'oracle'].map((check) => [
      node,
      'util/mutation-testing/mutation-runner.js',
      '--all',
      '--check',
      check,
      '--stale-only',
    ]),
    skip: needsNode24,
  },
  { name: 'tests', tier: 'slow', commands: [testCommand(testRoots)] },
  {
    name: 'site',
    tier: 'slow',
    commands: [testCommand([siteRoot])],
    skip: () =>
      existsSync(join(root, 'site/node_modules'))
        ? null
        : 'site dependencies are not installed',
  },
  {
    name: 'frameworks',
    tier: 'slow',
    commands: [[node, 'util/buildFrameworks.js', '--dry-run']],
  },
  {
    name: 'mutation-baselines',
    tier: 'slow',
    run: mutationBaselines,
    skip: needsNode24,
  },
];

// Failing tests, compiler errors, and linter errors in both oxlint formats.
const failure =
  /^\s*✖|error TS\d+|:\d+:\d+: error |^\s*×|^\s*(?:Error|AssertionError)\b/v;

/**
 * The lines of a failed step's output worth reading first: failing tests,
 * type and lint errors, each once. Without any, the last lines.
 *
 * @param {string} output
 * @param {number} [limit]
 * @return {string[]}
 */
export function failureLines(output, limit = 15) {
  const lines = output.split('\n').map((line) => line.trimEnd());
  const seen = new Set();
  for (const line of lines) {
    const text = line.trim();
    if (failure.test(line) && text !== '✖ failing tests:') seen.add(text);
    if (seen.size === limit) break;
  }
  if (seen.size) return [...seen];
  return lines.filter(Boolean).slice(-10);
}

/** @param {string[]} names */
const list = (names) => (names.length ? names.join(',') : 'none');

/**
 * @param {{failed: string[], skipped: string[], notRun: string[], logs: string}} outcome
 * @return {string}
 */
export function doneLine({ failed, skipped, notRun, logs }) {
  return `test: done status=${failed.length ? 'fail' : 'pass'} failed=${list(failed)} skipped=${list(skipped)} notrun=${list(notRun)} logs=${logs}`;
}

/**
 * Runs the gate steps together, then the slow steps in turn. A failed gate step
 * stops the slow tier from starting unless `keepGoing`.
 *
 * @template {{name: string, tier: string}} T
 * @param {T[]} chosen
 * @param {{keepGoing: boolean, execute: (step: T) => Promise<'pass' | 'fail' | 'skipped'>}} options
 * @return {Promise<{failed: string[], skipped: string[], notRun: string[]}>}
 */
export async function runTiers(chosen, { keepGoing, execute }) {
  const failed = [];
  const skipped = [];
  const notRun = [];
  /** @param {{name: string}} step @param {string} result */
  const record = ({ name }, result) => {
    if (result === 'fail') failed.push(name);
    if (result === 'skipped') skipped.push(name);
  };
  const gate = chosen.filter(({ tier }) => tier === 'gate');
  const gateResults = await Promise.all(gate.map((step) => execute(step)));
  for (const [i, step] of gate.entries()) record(step, gateResults[i]);
  const stop = failed.length > 0 && !keepGoing;
  for (const step of chosen.filter(({ tier }) => tier !== 'gate')) {
    if (stop) notRun.push(step.name);
    else record(step, await execute(step));
  }
  return { failed, skipped, notRun };
}

// A parent test runner's context or forced colour would change the reports
// the steps print, which the failure lines read.
const {
  NODE_TEST_CONTEXT: _context,
  FORCE_COLOR: _color,
  ...inherited
} = process.env;
const environment = { ...inherited, NO_COLOR: '1' };

/**
 * @param {string[]} command
 * @param {(text: string) => void} write
 * @return {Promise<number>} the exit code
 */
function runCommand([file, ...args], write) {
  return new Promise((resolveRun) => {
    const child = spawn(file, args, {
      cwd: root,
      env: environment,
      // pnpm is a .cmd shim on Windows, which only a shell runs.
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (chunk) => write(String(chunk)));
    child.stderr.on('data', (chunk) => write(String(chunk)));
    child.on('error', (error) => {
      write(`${error}\n`);
      resolveRun(1);
    });
    child.on('close', (code, signal) => {
      if (signal) write(`killed by ${signal}\n`);
      resolveRun(code ?? 1);
    });
  });
}

/**
 * @param {boolean} timedOut
 * @param {number | null} exit
 * @param {number | undefined} ran the tests the run reported
 * @return {string | null} why the baseline cannot judge mutants, or null
 */
function baselineFailure(timedOut, exit, ran) {
  if (timedOut) return 'timed out';
  if (exit !== 0) return `exit ${exit}`;
  if (!ran) return 'ran no tests';
  return null;
}

/**
 * Runs each test file a test-checked catalog names, as the mutation runner
 * runs its baseline, so a baseline that fails or runs no test fails here
 * instead of leaving its mutants unjudged.
 *
 * @type {Run}
 */
async function mutationBaselines(write) {
  const { catalogs } = await import(
    pathToFileURL(join(root, 'packages/cssnano/mutation/catalogs.js')).href
  );
  const { countTests, loadCatalogs, mapWithConcurrency, selectCatalogs } =
    await import('./mutation-testing/mutation-testing.js');
  const { defaultTimeout, runBaseline } =
    await import('./mutation-testing/test-check.js');
  const loaded = await loadCatalogs(
    selectCatalogs(catalogs, 'test').map(({ url }) => url)
  );
  const paths = [...new Set(loaded.map(({ test }) => test))];
  let code = 0;
  await mapWithConcurrency(paths, availableParallelism(), async (path) => {
    const {
      code: exit,
      timedOut,
      stdout,
      stderr,
    } = await runBaseline(path, defaultTimeout);
    const why = baselineFailure(timedOut, exit, countTests(stdout, path));
    if (why === null) {
      write(`✔ baseline ${relative(root, path)}\n`);
      return;
    }
    code = 1;
    write(`✖ baseline ${relative(root, path)} (${why})\n${stdout}${stderr}\n`);
  });
  return code;
}

/**
 * Runs a step's commands in turn, stopping at the first that fails.
 *
 * @param {Step} step
 * @param {(text: string) => void} write
 * @return {Promise<number>}
 */
async function runStep(step, write) {
  if (step.run) return step.run(write);
  for (const command of step.commands ?? []) {
    write(`$ ${command.join(' ')}\n`);
    const code = await runCommand(command, write);
    if (code !== 0) return code;
  }
  return 0;
}

/**
 * @param {Step} step
 * @param {string} log
 * @return {Promise<{passed: boolean, output: string}>}
 */
async function runLogged(step, log) {
  const stream = createWriteStream(log);
  let output = '';
  const code = await runStep(step, (text) => {
    output += text;
    stream.write(text);
  });
  await new Promise((resolveEnd) => {
    stream.end(resolveEnd);
  });
  return { passed: code === 0, output };
}

/**
 * @param {Step} step
 * @return {Promise<'pass' | 'fail' | 'skipped'>}
 */
async function executeStep(step) {
  const reason = step.skip?.() ?? null;
  if (reason !== null) {
    console.log(`test: ${step.name} skipped (${reason})`);
    return 'skipped';
  }
  const log = join(logDir, `${step.name}.log`);
  console.log(`test: ${step.name} running, log=${relative(root, log)}`);
  const start = performance.now();
  const { passed, output } = await runLogged(step, log);
  const seconds = ((performance.now() - start) / 1000).toFixed(1);
  console.log(`test: ${step.name} ${passed ? 'pass' : 'fail'} (${seconds}s)`);
  if (passed) return 'pass';
  for (const line of failureLines(output)) console.log(`  ${line}`);
  return 'fail';
}

/**
 * @param {Step[]} chosen
 * @param {boolean} keepGoing
 * @return {Promise<void>}
 */
async function main(chosen, keepGoing) {
  rmSync(logDir, { recursive: true, force: true });
  mkdirSync(logDir, { recursive: true });
  const logs = `${relative(root, logDir)}/`;
  console.log(
    `test: started pid=${process.pid} steps=${list(chosen.map(({ name }) => name))} logs=${logs}`
  );
  const { failed, skipped, notRun } = await runTiers(chosen, {
    keepGoing,
    execute: executeStep,
  });
  if (failed.length) process.exitCode = 1;
  console.log(doneLine({ failed, skipped, notRun, logs }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2).filter((arg) => arg !== '--keep-going');
  const keepGoing = args.length < process.argv.length - 2;
  await main(
    args.length
      ? [{ name: 'tests', tier: 'slow', commands: [testCommand(args)] }]
      : steps,
    keepGoing
  );
}
