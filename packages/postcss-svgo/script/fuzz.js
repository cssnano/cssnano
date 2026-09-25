import { parseArgs } from 'node:util';
import { runFuzz } from '../../../util/fuzzRunner.js';
import { check, report } from './lib/fuzzCheck.js';
import { generate } from './lib/fuzzGenerate.js';

/**
 * Differential and invariant fuzzer for postcss-svgo.
 *
 *   node script/fuzz.js --seed 1 --count 50000
 */

const { values } = parseArgs({
  options: {
    seed: { type: 'string', default: '1' },
    count: { type: 'string', default: '10000' },
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
  check,
  report: (failure, s, index) => report(failure, s, index),
  count,
  seed,
});
