'use strict';
const { parseArgs } = require('node:util');
const { checkMinimised, report } = require('./lib/fuzzCheck.js');
const { generate } = require('./lib/fuzzGenerate.js');

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
