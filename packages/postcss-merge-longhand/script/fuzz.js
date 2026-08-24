import nodeutil from 'node:util';
import { checkMinimised, report } from './lib/fuzzCheck.js';
import { generate } from './lib/fuzzGenerate.js';

const { parseArgs } = nodeutil;
/**
 * Long differential fuzz runs, for reaching past a validity or support check
 * in `src/lib/decl/borders.js`. `test/fuzz.js` runs a small seeded sweep of
 * the same generator with the rest of the suite; point this at a
 * change before accepting it, since tightening a check and loosening it again
 * are both easy to overshoot.
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

const started = Date.now();
let checked = 0;

for (const css of generate(seed, count)) {
  const failure = checkMinimised(css);
  checked++;

  if (failure) {
    console.error(report(failure, seed));
    console.error(`\nfound after ${checked} of ${count} rules`);
    process.exit(1);
  }

  if (checked % 10000 === 0) {
    console.log(`${checked}/${count}`);
  }
}

const elapsed = ((Date.now() - started) / 1000).toFixed(1);
console.log(`${count} rules, seed ${seed}, clean in ${elapsed}s`);
