import { parseFuzzArgs, runFuzz } from '../../../util/fuzzRunner.js';
import { check, report } from './lib/fuzzCheck.js';
import { generate } from './lib/fuzzGenerate.js';

// Unit tests run two short seeds. Use this deterministic soak when changing
// token boundaries or position grammar handling:
//   pnpm --filter postcss-normalize-positions fuzz -- --seed 7 --count 200000
const { seed, count, interval } = parseFuzzArgs({ defaultCount: 10000 });

runFuzz({
  cases: generate(seed, count),
  check,
  report,
  count,
  seed,
  interval,
});
