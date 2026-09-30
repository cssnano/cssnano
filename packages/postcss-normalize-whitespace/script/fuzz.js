import { parseFuzzArgs, runFuzz } from '../../../util/fuzzRunner.js';
import { check, report } from './lib/fuzzCheck.js';
import { generate } from './lib/fuzzGenerate.js';

/**
 * Long differential fuzz runs, for reaching past a change to the trailing-
 * escape handling in the rule/at-rule branch of src/index.js. `test/fuzz.js`
 * runs a small seeded sweep of the same generator with the rest of the
 * suite; point this at a change before accepting it.
 *
 *   node script/fuzz.js --seed 7 --count 200000
 */

const { seed, count, interval } = parseFuzzArgs({ defaultCount: 100000 });

runFuzz({
  cases: generate(seed, count),
  check,
  report,
  count,
  seed,
  interval,
});
