// Kills a mutant by rerunning the catalog's test file: a failing test run
// means the tests noticed the change.
import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  countTests,
  mapWithConcurrency,
  withProgress,
  notReachedMarker,
  outcome,
  report,
  runNode,
} from './mutation-testing.js';

const loader = fileURLToPath(new URL('./mutation-loader.js', import.meta.url));

// One process per test file is the dominant cost; in-process runs keep each
// mutant on a single core so the pool below can keep every core busy.
// The tokenize counter must load before anything imports the tokenizer, or the
// tests that assert "without tokenizing" count nothing and pass vacuously.
const counter = fileURLToPath(new URL('../countTokenize.js', import.meta.url));
const testFlags = ['--import', counter, '--test-isolation=none', '--test'];

// A parent `node --test` sets NODE_TEST_CONTEXT, which switches child runs to a
// binary reporter whose summary countTests cannot read. FORCE_COLOR makes the
// reporter wrap the summary in escape codes, which countTests cannot read either.
const {
  NODE_TEST_CONTEXT: _context,
  FORCE_COLOR: _color,
  ...inheritedEnvironment
} = process.env;
const cleanEnvironment = { ...inheritedEnvironment, NO_COLOR: '1' };

export const harnessError = 'Mutation harness error';

// Parallel runs share cores, so a single run can take several times its solo time.
export const defaultTimeout = 30000;

function printFailure(label, result) {
  const detail = result.stderr.trim() || result.stdout.trim();
  console.error(
    `${label}: ${detail || `exit ${result.code ?? result.signal}`}`
  );
}

function mutationStatus(result) {
  if (result.timedOut) return outcome.timedOut;
  if (result.stderr.includes(notReachedMarker)) return outcome.notReached;
  if (result.code === 0) return outcome.survived;
  // The test runner reports a subtest's load failure on stdout, not stderr.
  if (`${result.stdout}${result.stderr}`.includes('Mutation loader error')) {
    return outcome.errored;
  }
  if (result.code === 1) return outcome.killed;
  return outcome.errored;
}

async function runMutation({ mutation, target, testPath, timeout }) {
  const environment = {
    ...cleanEnvironment,
    CSSNANO_MUTATION_TARGET: target,
    CSSNANO_MUTATION: JSON.stringify(mutation),
  };

  // Importing the mutated module alone separates a module that fails to load
  // (syntax or top-level errors) from a behavior change that tests should catch.
  const load = await runNode(
    [
      '--import',
      loader,
      '--input-type=module',
      '--eval',
      'await import(process.env.CSSNANO_MUTATION_TARGET);',
    ],
    environment,
    timeout
  );
  if (load.timedOut || load.code !== 0) {
    return {
      mutation,
      result: load,
      status: load.timedOut ? outcome.timedOut : outcome.errored,
    };
  }
  const result = await runNode(
    ['--import', loader, ...testFlags, testPath],
    environment,
    timeout
  );
  return { mutation, result, status: mutationStatus(result) };
}

/**
 * @param {Array<{label: string, test?: string, mutations: Array<{mutation: {name: string}, target: string}>}>} catalogs
 * @param {{timeout: number, allowUnkilled: boolean}} options
 */
export async function run(catalogs, { timeout, allowUnkilled }) {
  const entries = catalogs.map((catalog) => {
    if (typeof catalog.test !== 'string') {
      throw new TypeError(`${catalog.label}catalog must export a test value`);
    }
    return catalog;
  });

  // Catalogs that share a test file share one baseline run.
  const distinctTestPaths = [...new Set(entries.map(({ test }) => test))];
  const baselines = await mapWithConcurrency(
    distinctTestPaths,
    availableParallelism(),
    (testPath) => runNode([...testFlags, testPath], cleanEnvironment, timeout)
  );
  const baselineResults = new Map(
    distinctTestPaths.map((testPath, index) => [testPath, baselines[index]])
  );

  const runnable = [];
  // A catalog that cannot be judged still lists its mutants, as errored, so
  // that no result file silently lacks them.
  const skipped = [];
  const skip = (entry, diagnostic) => {
    process.exitCode = 1;
    for (const { mutation } of entry.mutations) {
      skipped.push({
        name: `${entry.label}${mutation.name}`,
        status: outcome.errored,
        diagnostic,
      });
    }
  };
  for (const entry of entries) {
    const baseline = baselineResults.get(entry.test);
    if (baseline.timedOut || baseline.code !== 0) {
      printFailure(`${entry.label}baseline failed`, baseline);
      // The first line of a test report is usually a passing test.
      const lines = (baseline.stderr.trim() || baseline.stdout.trim()).split(
        '\n'
      );
      const cause = lines.find((line) => /^\s*✖|Error/v.test(line)) ?? lines[0];
      skip(
        entry,
        `baseline failed (${baseline.timedOut ? 'timed out' : `exit ${baseline.code ?? baseline.signal}`})${cause ? `: ${cause}` : ''}`
      );
      continue;
    }
    // A file that registers no test passes, so every mutant would survive.
    if (!countTests(baseline.stdout, entry.test)) {
      console.error(`${entry.label}baseline ran no tests: ${entry.test}`);
      skip(entry, 'baseline ran no tests');
      continue;
    }
    for (const mutation of entry.mutations) {
      runnable.push({ label: entry.label, testPath: entry.test, ...mutation });
    }
  }

  // Hyperthreads and the shared cache make a full pool several times slower
  // per mutant, which turns healthy runs into false timeouts.
  const outcomes = await mapWithConcurrency(
    runnable,
    Math.max(1, Math.floor(availableParallelism() / 2)),
    withProgress(runnable.length, ({ mutation, target, testPath }) =>
      runMutation({ mutation, target, testPath, timeout })
    )
  );

  const results = [
    ...skipped,
    ...outcomes.map(({ mutation, result, status }, index) => ({
      name: `${runnable[index].label}${mutation.name}`,
      status,
      diagnostic: result.stderr.trim() || result.stdout.trim(),
    })),
  ];
  if (report(results, { allowUnkilled })) process.exitCode = 1;
  return results;
}
