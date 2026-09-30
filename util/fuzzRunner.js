import { parseArgs } from 'node:util';

const usage =
  '--seed takes a non-negative integer, --count a positive integer, and --interval a non-negative integer';

/**
 * @param {string} message
 * @param {boolean} exitOnError
 * @return {never}
 */
function invalid(message, exitOnError) {
  if (exitOnError) {
    console.error(message);
    process.exit(2);
  }
  throw new TypeError(message);
}

/**
 * Blank strings would otherwise coerce to 0.
 *
 * @param {string} value
 * @param {number} min
 * @return {number | undefined}
 */
function parseInteger(value, min) {
  const number = value.trim() === '' ? Number.NaN : Number(value);
  return Number.isSafeInteger(number) && number >= min ? number : undefined;
}

/**
 * Shared CLI argument parser for fuzzer scripts.
 *
 * The seed must be a non-negative integer because the PRNG truncates and
 * drops the sign, so `1.5` or `-1` would silently replay the stream of `1`.
 *
 * @param {object} [options]
 * @param {number} [options.defaultCount=10000] Default cases count
 * @param {number} [options.defaultSeed=1] Default PRNG seed
 * @param {number} [options.defaultInterval=10000] Default progress interval
 * @param {string[]} [options.args] Override CLI args (defaults to process.argv.slice(2))
 * @param {boolean} [options.exitOnError=true] Whether to exit with code 2 on invalid arguments
 * @return {{ seed: number, count: number, interval: number }}
 */
export function parseFuzzArgs({
  defaultCount = 10000,
  defaultSeed = 1,
  defaultInterval = 10000,
  args = process.argv.slice(2),
  exitOnError = true,
} = {}) {
  let values;
  try {
    ({ values } = parseArgs({
      args: args.filter((argument) => argument !== '--'),
      options: {
        seed: { type: 'string', default: String(defaultSeed) },
        count: { type: 'string', default: String(defaultCount) },
        interval: { type: 'string', default: String(defaultInterval) },
      },
    }));
  } catch (error) {
    return invalid(
      `${/** @type {Error} */ (error).message}\n${usage}`,
      exitOnError
    );
  }

  const seed = parseInteger(values.seed, 0);
  const count = parseInteger(values.count, 1);
  const interval = parseInteger(values.interval, 0);

  if (seed === undefined || count === undefined || interval === undefined) {
    return invalid(usage, exitOnError);
  }

  return { seed, count, interval };
}

/**
 * Shared fuzz iteration runner handling timing, progress intervals,
 * and error reporting.
 *
 * Package-specific generators, oracles, and formatters remain owned by
 * each package. Lazy corpora are never advanced past `count`.
 *
 * @template T, F
 * @param {object} options
 * @param {Iterable<T>} options.cases Iterable producing test cases
 * @param {(item: T, index: number) => F | undefined | void} options.check Semantic oracle
 * @param {(failure: F, seed?: number, index?: number) => string} [options.report] Failure formatter
 * @param {number} options.count Total cases to evaluate, at least 1
 * @param {number} [options.seed] PRNG seed
 * @param {number} [options.interval=10000] Progress reporting interval
 * @param {string} [options.unit='cases'] Units label ('cases', 'rules', etc.)
 * @param {boolean} [options.exitOnFailure=true] Whether to exit with code 1 on failure
 * @return {{ passed: number, elapsed: string }}
 */
export function runFuzz({
  cases,
  check,
  report = (failure) => String(failure),
  count,
  seed,
  interval = 10000,
  unit = 'cases',
  exitOnFailure = true,
}) {
  const started = Date.now();
  let checked = 0;

  for (const item of cases) {
    const failure = check(item, checked);
    checked++;

    if (failure) {
      console.error(report(failure, seed, checked - 1));
      console.error(`\nfound after ${checked} of ${count} ${unit}`);
      if (exitOnFailure) {
        process.exit(1);
      }
      throw new Error(`Fuzzing failure after ${checked} ${unit}`);
    }

    if (interval > 0 && checked % interval === 0) {
      console.log(`${checked}/${count}`);
    }

    if (checked >= count) {
      break;
    }
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  const total = checked < count ? `${checked} of ${count}` : `${checked}`;
  const seedMsg = seed !== undefined ? `, seed ${seed}` : '';
  console.log(`${total} ${unit}${seedMsg}, clean in ${elapsed}s`);

  return { passed: checked, elapsed };
}
