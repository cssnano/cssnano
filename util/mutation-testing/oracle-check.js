// Kills a mutant with the fuzz oracles. Each suite module exports `suites`: a
// generator, the code under test and an oracle check. The unmutated code runs
// every case once; a mutant then needs the oracle only for the cases whose
// output it changed.
import { availableParallelism, tmpdir } from 'node:os';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  mapWithConcurrency,
  notReachedMarker,
  outcome,
  report,
  runNode,
} from './mutation-testing.js';

const child = fileURLToPath(
  new URL('./oracle-mutation-child.js', import.meta.url)
);
const loader = fileURLToPath(new URL('./mutation-loader.js', import.meta.url));
const workers = availableParallelism();

export const harnessError = 'Oracle mutation harness error';

// A mutant reruns every fuzz case, which takes far longer than a test file.
export const defaultTimeout = 120000;

/**
 * @param {string[]} args
 * @param {NodeJS.ProcessEnv} env
 * @param {number} timeout
 * @param {boolean} [mutated] whether the shared mutation hook applies
 */
function runChild(args, env, timeout, mutated = false) {
  return runNode(
    [...(mutated ? ['--import', loader] : []), child, ...args],
    env,
    timeout
  );
}

/**
 * Checks every case on the unmutated code, split across the workers, and
 * returns each suite's inputs and outputs.
 *
 * @param {string} suitesUrl
 * @param {number[]} seeds
 * @param {number} count
 * @param {number} timeout
 */
async function recordBaseline(suitesUrl, seeds, count, timeout) {
  const { suites } = await import(suitesUrl);
  const recorded = suites.map(
    (
      /** @type {{generate: (seed: number, count: number) => string[]}} */ suite
    ) => ({
      seeds,
      count,
      inputs: seeds.flatMap((seed) => suite.generate(seed, count)),
    })
  );
  const slices = recorded.flatMap(
    (/** @type {{inputs: string[]}} */ { inputs }, suite) => {
      const size = Math.ceil(inputs.length / workers);
      return Array.from(
        { length: Math.ceil(inputs.length / size) },
        (_, i) => ({
          suite,
          start: i * size,
          end: Math.min(inputs.length, (i + 1) * size),
        })
      );
    }
  );
  const results = await mapWithConcurrency(
    slices,
    workers,
    ({ suite, start, end }) =>
      runChild(
        [
          'baseline',
          suitesUrl,
          String(suite),
          String(start),
          String(end),
          seeds.join(','),
          String(count),
        ],
        process.env,
        timeout * 10
      )
  );
  for (const [i, result] of results.entries()) {
    if (result.code !== 0) {
      throw new Error(
        `baseline worker failed: ${result.stderr.trim() || 'timed out'}`
      );
    }
    const parsed = JSON.parse(result.stdout);
    if (parsed.failure) throw new Error(`baseline fails: ${parsed.failure}`);
    const { suite } = slices[i];
    recorded[suite].outputs = [
      ...(recorded[suite].outputs ?? []),
      ...parsed.outputs,
    ];
  }
  return recorded;
}

/**
 * @param {{code: number | null, stdout: string, stderr: string, timedOut: boolean}} result
 * @return {{status: string, detail: string}}
 */
function verdict(result) {
  if (result.timedOut) return { status: outcome.timedOut, detail: '' };
  if (result.stderr.includes(notReachedMarker)) {
    return { status: outcome.notReached, detail: '' };
  }
  if (result.code !== 0) {
    const error = result.stderr
      .split('\n')
      .find((line) => /^\w*Error: /v.test(line));
    return { status: outcome.errored, detail: error ?? result.stderr.trim() };
  }
  /** @type {{suites: Array<{name: string, first: string, caught: number, total: number, reached: number, changed: number, checks: number}>}} */
  const { suites } = JSON.parse(result.stdout);
  const detail = suites
    .map(
      (s) =>
        `${s.name} first=${s.first} caught=${s.caught}/${s.total} reached=${s.reached} changed=${s.changed} checks=${s.checks}`
    )
    .join(' | ');
  // Only a changed output can show whether the oracle sees the fault; a
  // mutant that never runs or never changes an output needs another corpus.
  let status = outcome.survived;
  if (suites.some((s) => s.caught > 0)) status = outcome.killed;
  else if (suites.every((s) => s.reached === 0)) status = outcome.notReached;
  else if (suites.every((s) => s.changed === 0)) status = outcome.unchanged;
  return { status, detail };
}

/**
 * Runs the mutants of the catalogs against one suites module.
 *
 * @param {string} suitesUrl
 * @param {Array<{label: string, mutations: Array<{mutation: {name: string}, target: string}>}>} catalogs
 * @param {{seeds: string, count: string, full: boolean, timeout: number}} options
 */
async function judgeMutants(suitesUrl, catalogs, options) {
  const { timeout } = options;
  const entries = catalogs.flatMap(({ label, mutations }) =>
    mutations.map(({ mutation, target }) => ({
      name: `${label}${mutation.name}`,
      mutation,
      target,
    }))
  );
  const directory = await mkdtemp(join(tmpdir(), 'oracle-mutation-'));
  try {
    const started = Date.now();
    const recorded = await recordBaseline(
      suitesUrl,
      options.seeds.split(',').map(Number),
      Number(options.count),
      timeout
    );
    const baselinePath = join(directory, 'baseline.json');
    await writeFile(baselinePath, JSON.stringify(recorded));
    const baselineSeconds = (Date.now() - started) / 1000;
    const results = await mapWithConcurrency(
      entries,
      workers,
      ({ mutation, target }) =>
        runChild(
          ['mutant', suitesUrl, baselinePath, options.full ? 'full' : 'skip'],
          {
            ...process.env,
            CSSNANO_MUTATION_TARGET: target,
            CSSNANO_MUTATION: JSON.stringify(mutation),
          },
          timeout,
          true
        )
    );
    return {
      baselineSeconds,
      verdicts: results.map((result, i) => ({
        name: entries[i].name,
        ...verdict(result),
      })),
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

/**
 * @param {Array<{label: string, suites?: URL, mutations: Array<{mutation: {name: string}, target: string}>}>} catalogs
 * @param {{suites?: string, seeds: string, count: string, full: boolean, timeout: number, allowUnkilled: boolean}} options
 */
export async function run(catalogs, options) {
  // Catalogs that share a suites module share one baseline.
  const groups = Map.groupBy(
    catalogs,
    (catalog) =>
      (options.suites && pathToFileURL(resolve(options.suites))) ||
      catalog.suites
  );
  if (groups.has(undefined)) {
    throw new Error('Missing --suites: the catalog declares no oracle suites');
  }
  const started = Date.now();
  let baselineSeconds = 0;
  const results = [];
  for (const [suitesUrl, group] of groups) {
    const judged = await judgeMutants(suitesUrl.href, group, options);
    baselineSeconds += judged.baselineSeconds;
    results.push(...judged.verdicts);
  }
  const failed = report(results, {
    allowUnkilled: options.allowUnkilled,
    suffix: `; baseline ${baselineSeconds.toFixed(1)}s, total ${((Date.now() - started) / 1000).toFixed(1)}s`,
  });
  if (failed) process.exitCode = 1;
}
