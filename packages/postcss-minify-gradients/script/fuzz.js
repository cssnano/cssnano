import { parseArgs } from 'node:util';
import { runFuzz } from '../../../util/fuzzRunner.js';
import { check, report } from './lib/fuzzCheck.js';
import { generate } from './lib/fuzzGenerate.js';

// Unit tests use two 360-case seeds. Use this deterministic soak when changing
// colour stop classification, position units, or boundary handling:
//   pnpm --filter postcss-minify-gradients fuzz -- --seed 7 --count 200000
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    seed: { type: 'string', default: '1' },
    count: { type: 'string', default: '10000' },
  },
});
const seed = Number(values.seed);
const count = Number(values.count);
if (!Number.isInteger(seed) || !Number.isInteger(count) || count < 1)
  throw new Error('--seed and --count take numbers');

runFuzz({
  cases: generate(seed, count),
  check: (sample) => check(sample),
  report: (failure, s, index) => report(failure, s, index),
  count,
  seed,
});
