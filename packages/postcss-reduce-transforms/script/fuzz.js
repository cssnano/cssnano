import { parseFuzzArgs, runFuzz } from '../../../util/fuzzRunner.js';
import { checkMinimised, report } from './lib/fuzzCheck.js';
import { generate } from './lib/fuzzGenerate.js';

/**
 * Long differential fuzz runs, for reaching past what the seeded sweep in
 * `test/fuzz.js` covers. Point this at a change before accepting it.
 *
 *   node script/fuzz.js --seed 7 --count 200000
 */

const { seed, count, interval } = parseFuzzArgs({ defaultCount: 100000 });

runFuzz({
  cases: generate(seed, count),
  check: checkMinimised,
  report,
  count,
  seed,
  interval,
  unit: 'rules',
});
