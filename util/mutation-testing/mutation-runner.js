import { spawn } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mapWithConcurrency } from './mutation-testing.js';

const loader = fileURLToPath(new URL('./mutation-loader.js', import.meta.url));

// One process per test file is the dominant cost; in-process runs keep each
// mutant on a single core so the pool below can keep every core busy.
const testFlags = ['--test-isolation=none', '--test'];

function argumentsFor(name, args) {
  const values = [];
  for (let index = args.indexOf(name); index !== -1;) {
    if (!args[index + 1]) {
      throw new Error(`Missing value for ${name}`);
    }
    values.push(args[index + 1]);
    index = args.indexOf(name, index + 1);
  }
  return values;
}

function runNode(args, env, timeout) {
  return new Promise((resolveResult) => {
    const child = spawn(process.execPath, args, {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeout);

    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolveResult({ code, signal, stderr, stdout, timedOut });
    });
  });
}

function printFailure(label, result) {
  const detail = result.stderr.trim() || result.stdout.trim();
  console.error(
    `${label}: ${detail || `exit ${result.code ?? result.signal}`}`
  );
}

function mutationStatus(result) {
  if (result.timedOut) return 'timed out';
  if (result.code === 0) return 'survived';
  // The test runner reports a subtest's load failure on stdout, not stderr.
  if (`${result.stdout}${result.stderr}`.includes('Mutation loader error')) {
    return 'errored';
  }
  if (result.code === 1) return 'killed';
  return 'errored';
}

async function runMutation({ mutation, target, testPath, timeout }) {
  const environment = {
    ...process.env,
    CSSNANO_MUTATION_TARGET: mutation.target ?? target,
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
      status: load.timedOut ? 'timed out' : 'errored',
    };
  }
  const result = await runNode(
    ['--import', loader, ...testFlags, testPath],
    environment,
    timeout
  );
  return { mutation, result, status: mutationStatus(result) };
}

const args = process.argv.slice(2);
try {
  if (process.versions.node.split('.')[0] !== '24') {
    throw new Error('Mutation testing requires Node 24');
  }

  const catalogPaths = argumentsFor('--catalog', args).map((path) =>
    resolve(path)
  );
  const testPaths = argumentsFor('--test', args).map((path) => resolve(path));
  if (!catalogPaths.length) {
    throw new Error('Missing required argument --catalog');
  }
  if (testPaths.length > 1) {
    throw new Error('Only one legacy --test argument is supported');
  }
  const timeoutIndex = args.indexOf('--timeout');
  // Parallel runs share cores, so a single run can take several times its solo time.
  const timeout = Number(timeoutIndex === -1 ? 30000 : args[timeoutIndex + 1]);

  const entries = [];
  for (const catalogPath of catalogPaths) {
    const catalog = await import(pathToFileURL(catalogPath));
    const mutations = catalog.mutations;
    const target = catalog.target;
    const testPath = catalog.test ? fileURLToPath(catalog.test) : testPaths[0];

    if (
      !Array.isArray(mutations) ||
      typeof target !== 'string' ||
      typeof testPath !== 'string'
    ) {
      throw new TypeError(
        'Catalog must export string target and test values and a mutations array'
      );
    }

    entries.push({
      label: catalog.name ? `${catalog.name}: ` : '',
      mutations,
      target,
      testPath,
    });
  }

  // Catalogs that share a test file share one baseline run.
  const distinctTestPaths = [
    ...new Set(entries.map((entry) => entry.testPath)),
  ];
  const baselines = await mapWithConcurrency(
    distinctTestPaths,
    availableParallelism(),
    (testPath) => runNode([...testFlags, testPath], process.env, timeout)
  );
  const baselineResults = new Map(
    distinctTestPaths.map((testPath, index) => [testPath, baselines[index]])
  );

  const runnable = [];
  for (const entry of entries) {
    const baseline = baselineResults.get(entry.testPath);
    if (baseline.timedOut || baseline.code !== 0) {
      printFailure(`${entry.label}baseline failed`, baseline);
      process.exitCode = 1;
      entry.skipped = true;
      continue;
    }
    for (const mutation of entry.mutations) {
      runnable.push({ entry, mutation });
    }
  }

  const outcomes = await mapWithConcurrency(
    runnable,
    availableParallelism(),
    ({ entry, mutation }) =>
      runMutation({
        mutation,
        target: entry.target,
        testPath: entry.testPath,
        timeout,
      })
  );

  const resultsByEntry = new Map(entries.map((entry) => [entry, []]));
  for (const [index, { entry }] of runnable.entries()) {
    resultsByEntry.get(entry).push(outcomes[index]);
  }

  for (const entry of entries) {
    if (entry.skipped) continue;
    const results = resultsByEntry.get(entry);
    const { label } = entry;

    for (const { mutation, result, status } of results) {
      console.log(`${label}${status}: ${mutation.name}`);
      if (status === 'errored' || status === 'timed out') {
        printFailure(`${label}  ${status}`, result);
      }
    }

    const counts = Object.groupBy(results, ({ status }) => status);
    console.log(
      `${label}Mutation summary: ${results.length} total, ${counts.killed?.length ?? 0} killed, ${counts.survived?.length ?? 0} survived, ${counts['timed out']?.length ?? 0} timed out, ${counts.errored?.length ?? 0} errored`
    );
    if (counts.survived?.length) {
      console.error(`${label}Surviving mutations:`);
      for (const { mutation } of counts.survived)
        console.error(`${label}- ${mutation.name}`);
    }
    if (
      counts.survived?.length ||
      counts.errored?.length ||
      counts['timed out']?.length
    ) {
      process.exitCode = 1;
    }
  }
} catch (error) {
  console.error(`Mutation harness error: ${error.message}`);
  process.exitCode = 1;
}
