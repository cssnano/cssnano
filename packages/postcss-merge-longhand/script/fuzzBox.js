import { parseFuzzArgs, runFuzz } from '../../../util/fuzzRunner.js';
import { checkBox, reportBox } from './lib/fuzzBoxCheck.js';
import { generateBoxRules } from './lib/fuzzBoxGenerate.js';

/**
 * Long differential fuzz runs for the box groups (margin, padding, inset,
 * scroll-margin and scroll-padding). A rule is judged by the value each
 * physical side computes to in every `writing-mode` and `direction`, before
 * and after the plugin. `perf/boxDifferentialSweep.js` runs a seeded sweep of
 * the same generator.
 *
 *   node script/fuzzBox.js --seed 7 --count 200000
 */

const { seed, count, interval } = parseFuzzArgs({ defaultCount: 100000 });

runFuzz({
  cases: generateBoxRules(seed, count),
  check: checkBox,
  report: reportBox,
  count,
  seed,
  interval,
  unit: 'rules',
});
