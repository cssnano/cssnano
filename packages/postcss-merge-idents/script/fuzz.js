import { parseFuzzArgs, runFuzz } from '../../../util/fuzzRunner.js';
import { check, report } from './lib/fuzzCheck.js';
import { generate } from './lib/fuzzGenerate.js';

const { seed, count, interval } = parseFuzzArgs({ defaultCount: 10000 });

runFuzz({
  cases: generate(seed, count),
  check,
  report,
  count,
  seed,
  interval,
});
