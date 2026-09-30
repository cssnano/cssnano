import { parseFuzzArgs, runFuzz } from '../../../util/fuzzRunner.js';
import { check, report } from './lib/fuzzCheck.js';
import { edgeCases, generate } from './lib/fuzzGenerate.js';

const { seed, count, interval } = parseFuzzArgs({ defaultCount: 10000 });

runFuzz({
  cases: (function* () {
    yield* edgeCases;
    yield* generate(seed, count);
  })(),
  check: (item) => check(item.css, item.branch),
  report,
  count: edgeCases.length + count,
  seed,
  interval,
});
