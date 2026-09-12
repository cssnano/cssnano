'use strict';

/**
 * Shared fuzz iteration runner handling timing, progress intervals,
 * and error reporting.
 *
 * Package-specific generators, oracles, formatters, and CLI argument parsing
 * remain owned by each package.
 *
 * @template T, F
 * @param {object} options
 * @param {Iterable<T>} options.cases Iterable producing test cases
 * @param {(item: T, index: number) => F | undefined | void} options.check Semantic oracle
 * @param {(failure: F, seed?: number, index?: number) => string} options.report Failure formatter
 * @param {number} options.count Total cases to evaluate
 * @param {number} [options.seed] PRNG seed
 * @param {number} [options.interval=10000] Progress reporting interval
 * @param {string} [options.unit='cases'] Units label ('cases', 'rules', etc.)
 * @param {boolean} [options.exitOnFailure=true] Whether to exit with code 1 on failure
 * @return {{ passed: number, elapsed: string }}
 */
function runFuzz({
  cases,
  check,
  report,
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
  }

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  const seedMsg = seed !== undefined ? `, seed ${seed}` : '';
  console.log(`${count} ${unit}${seedMsg}, clean in ${elapsed}s`);

  return { passed: checked, elapsed };
}

module.exports = { runFuzz };
