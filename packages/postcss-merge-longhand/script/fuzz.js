import { parseFuzzArgs, runFuzz } from '../../../util/fuzzRunner.js';
import { checkMinimised, report } from './lib/fuzzCheck.js';
import { generate } from './lib/fuzzGenerate.js';

/**
 * Long differential fuzz runs, for reaching past a validity or support check
 * in `src/lib/decl/borderReducer.js`. `perf/fuzz.js` runs a small seeded sweep of
 * the same generator with the rest of the suite; point this at a
 * change before accepting it, since tightening a check and loosening it again
 * are both easy to overshoot.
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
