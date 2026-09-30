import { parseFuzzArgs, runFuzz } from '../../../util/fuzzRunner.js';
import { check, report } from './lib/fuzzCheck.js';
import { generate } from './lib/fuzzGenerate.js';

/**
 * Differential and invariant fuzzer for postcss-svgo.
 *
 *   node script/fuzz.js --seed 1 --count 50000
 */

const { seed, count, interval } = parseFuzzArgs({ defaultCount: 10000 });

runFuzz({
  cases: generate(seed, count),
  check,
  report,
  count,
  seed,
  interval,
});
