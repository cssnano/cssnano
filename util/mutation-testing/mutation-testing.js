import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/** What a check concludes about one mutant. */
export const outcome = {
  killed: 'killed',
  survived: 'survived',
  errored: 'errored',
  timedOut: 'timed out',
  notReached: 'not reached',
  // The mutated code ran, but every output equals the unmutated one.
  unchanged: 'unchanged',
};

/** Written to stderr by a run that never loaded the module it should mutate. */
export const notReachedMarker = 'Mutation target was not loaded';

/**
 * Run `node` with a deadline. SIGKILL cannot be ignored, so a mutant that
 * loops forever cannot outlive its timeout.
 *
 * @param {string[]} args
 * @param {NodeJS.ProcessEnv} env
 * @param {number} timeout
 * @returns {Promise<{code: number | null, signal: NodeJS.Signals | null, stdout: string, stderr: string, timedOut: boolean}>}
 */
export function runNode(args, env, timeout) {
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
      child.kill('SIGKILL');
    }, timeout);
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolveResult({ code, signal, stdout, stderr, timedOut });
    });
  });
}

/**
 * Import catalogs and resolve the module each mutation edits: the
 * mutation's own `target`, else the catalog's.
 *
 * @param {Array<string | URL>} locations
 * @returns {Promise<Array<{label: string, test?: string, mutations: Array<{mutation: {name: string, find: string, replace: string}, target: string}>}>>}
 */
export async function loadCatalogs(locations) {
  return Promise.all(
    locations.map(async (location) => {
      const catalog = await import(String(location));
      if (
        !Array.isArray(catalog.mutations) ||
        typeof catalog.target !== 'string'
      ) {
        throw new TypeError(
          'Catalog must export a string target and a mutations array'
        );
      }
      return {
        label: catalog.name ? `${catalog.name}: ` : '',
        test: catalog.test ? fileURLToPath(catalog.test) : undefined,
        mutations: catalog.mutations.map((mutation) => ({
          mutation,
          target: mutation.target ?? catalog.target,
        })),
      };
    })
  );
}

/**
 * Apply one curated source mutation without touching the source file.
 *
 * @param {string} source
 * @param {{ find: string, replace: string }} mutation
 * @returns {string}
 */
export function applyMutation(source, mutation) {
  const first = source.indexOf(mutation.find);
  if (first === -1) {
    throw new Error(`Mutation fragment was not found: ${mutation.find}`);
  }

  if (source.lastIndexOf(mutation.find) !== first) {
    throw new Error(
      `Mutation fragment matched more than once: ${mutation.find}`
    );
  }

  return `${source.slice(0, first)}${mutation.replace}${source.slice(
    first + mutation.find.length
  )}`;
}

/**
 * Map items with at most `limit` workers in flight; results keep input order.
 *
 * @template T, R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T, index: number) => Promise<R>} worker
 * @returns {Promise<R[]>}
 */
export async function mapWithConcurrency(items, limit, worker) {
  const results = Array.from({ length: items.length });
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, lane)
  );
  return results;
}

/**
 * The registry entries that a check runs: `test` entries rerun their test
 * file; entries that declare `suites` are judged by the fuzz oracles.
 *
 * @template {{test?: boolean, suites?: URL}} T
 * @param {T[]} registry
 * @param {'test' | 'oracle'} check
 * @returns {T[]}
 */
export function selectCatalogs(registry, check) {
  return registry.filter((entry) =>
    check === 'test' ? entry.test === true : entry.suites !== undefined
  );
}

/**
 * Keep the mutants whose labelled name matches `only`. Throws when nothing is
 * left, so a mistyped pattern cannot produce a run that judges nothing.
 *
 * @template {{label: string, mutations: Array<{mutation: {name: string}}>}} T
 * @param {T[]} catalogs
 * @param {string} [only] regular expression source
 * @returns {T[]}
 */
export function selectMutants(catalogs, only) {
  const filter = only === undefined ? undefined : new RegExp(only, 'v');
  const selected = catalogs.map((catalog) => ({
    ...catalog,
    mutations: catalog.mutations.filter(
      ({ mutation }) =>
        !filter || filter.test(`${catalog.label}${mutation.name}`)
    ),
  }));
  if (!selected.some(({ mutations }) => mutations.length)) {
    throw new Error(
      filter ? `No mutant matches --only ${only}` : 'No mutants to run'
    );
  }
  return selected;
}

/**
 * The number of tests a `node --test` run executed, from its summary. A file
 * that registers no test is reported as one test named after the file, which
 * does not count.
 *
 * @param {string} output
 * @param {string} testPath the test file path as given to the runner
 * @returns {number | undefined} undefined when the output has no summary
 */
export function countTests(output, testPath) {
  const match = /^ℹ tests (\d+)$/mv.exec(output);
  if (!match) return undefined;
  const count = Number(match[1]);
  return count === 1 && output.startsWith(`✔ ${testPath} (`) ? 0 : count;
}

/**
 * Print one line per mutant, the diagnostics of mutants that could not be
 * judged, and a summary. A mutant that no check killed fails the report
 * unless `allowUnkilled`; an error or timeout always does.
 *
 * @param {Array<{name: string, status: string, detail?: string, diagnostic?: string}>} results
 * @param {{allowUnkilled: boolean, suffix?: string, out?: (line: string) => void, err?: (line: string) => void}} options
 * @returns {boolean} whether the run failed
 */
export function report(results, options) {
  const {
    allowUnkilled,
    suffix = '',
    out = console.log,
    err = console.error,
  } = options;
  /** @type {Record<string, number>} */
  const counts = {};
  for (const { name, status, detail, diagnostic } of results) {
    counts[status] = (counts[status] ?? 0) + 1;
    out(`${status}: ${name}${detail ? ` | ${detail}` : ''}`);
    if (
      diagnostic &&
      (status === outcome.errored || status === outcome.timedOut)
    ) {
      err(`${name}: ${diagnostic}`);
    }
  }
  const summary = Object.entries(counts)
    .map(([status, n]) => `${n} ${status}`)
    .join(', ');
  out(`${results.length} mutants: ${summary}${suffix}`);
  return Boolean(
    !results.length ||
    counts[outcome.errored] ||
    counts[outcome.timedOut] ||
    (!allowUnkilled &&
      (counts[outcome.survived] ||
        counts[outcome.notReached] ||
        counts[outcome.unchanged]))
  );
}
