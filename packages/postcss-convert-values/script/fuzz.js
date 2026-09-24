import { parseArgs } from 'node:util';
import { runFuzz } from '../../../util/fuzzRunner.js';
import { check, report } from './lib/fuzzCheck.js';
import { edgeCases, generate } from './lib/fuzzGenerate.js';

const { values } = parseArgs({
  args: process.argv.slice(2).filter((arg) => arg !== '--'),
  options: {
    seed: { type: 'string', default: '1' },
    count: { type: 'string', default: '10000' },
  },
});

const seed = Number(values.seed);
const count = Number(values.count);

if (!Number.isFinite(seed) || !Number.isInteger(count) || count < 1) {
  console.error('--seed and --count take numbers, and --count at least 1');
  process.exit(2);
}

runFuzz({
  cases: (function* () {
    for (const edge of edgeCases) {
      yield { css: edge.css, branch: edge.branch };
    }
    yield* generate(seed, count);
  })(),
  check: (item) => check(item.css, item.branch),
  report: (failure, s, idx) => report(failure, s, idx),
  count: edgeCases.length + count,
  seed,
});
