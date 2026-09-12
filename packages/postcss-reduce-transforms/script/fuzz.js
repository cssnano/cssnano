import nodeutil from 'node:util';
import { runFuzz } from '../../../util/fuzzRunner.js';
import { checkMinimised, report } from './lib/fuzzCheck.js';
import { generate } from './lib/fuzzGenerate.js';

const { parseArgs } = nodeutil;
/**
 * Long differential fuzz runs, for reaching past what the seeded sweep in
 * `test/fuzz.js` covers. Point this at a change before accepting it.
 *
 *   node script/fuzz.js --seed 7 --count 200000
 */

const { values } = parseArgs({
  options: {
    seed: { type: 'string', default: '1' },
    count: { type: 'string', default: '100000' },
  },
});

const seed = Number(values.seed);
const count = Number(values.count);

if (!Number.isFinite(seed) || !Number.isFinite(count) || count < 1) {
  console.error('--seed and --count take numbers, and --count at least 1');
  process.exit(2);
}

runFuzz({
  cases: generate(seed, count),
  check: (css) => checkMinimised(css),
  report: (failure) => report(failure, seed),
  count,
  seed,
  unit: 'rules',
});
