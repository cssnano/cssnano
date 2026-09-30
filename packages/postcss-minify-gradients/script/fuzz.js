import { parseFuzzArgs, runFuzz } from '../../../util/fuzzRunner.js';
import { check, report } from './lib/fuzzCheck.js';
import { generate } from './lib/fuzzGenerate.js';

// Unit tests use two 360-case seeds. Use this deterministic soak when changing
// colour stop classification, position units, or boundary handling:
//   pnpm --filter postcss-minify-gradients fuzz -- --seed 7 --count 200000
const { seed, count, interval } = parseFuzzArgs({ defaultCount: 10000 });

runFuzz({
  cases: generate(seed, count),
  check,
  report,
  count,
  seed,
  interval,
});
