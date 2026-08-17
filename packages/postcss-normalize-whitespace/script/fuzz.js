'use strict';
const { parseArgs } = require('node:util');
const { check, report } = require('./lib/fuzzCheck.js');
const { generate } = require('./lib/fuzzGenerate.js');

/**
 * Long differential fuzz runs, for reaching past a change to the trailing-
 * escape handling in the rule/at-rule branch of src/index.js. `test/fuzz.js`
 * runs a small seeded sweep of the same generator with the rest of the
 * suite; point this at a change before accepting it.
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

for (const testCase of generate(seed, count)) {
  const failure = check(testCase);
  checked++;

  if (failure) {
    console.error(report(failure, seed));
    console.error(`\nfound after ${checked} of ${count} cases`);
    process.exit(1);
  }

  if (checked % 10000 === 0) {
    console.log(`${checked}/${count}`);
  }
}

const elapsed = ((Date.now() - started) / 1000).toFixed(1);
console.log(`${count} cases, seed ${seed}, clean in ${elapsed}s`);
