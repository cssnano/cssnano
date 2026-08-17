'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { check, report } = require('../script/lib/fuzzCheck.js');
const { generate } = require('../script/lib/fuzzGenerate.js');

/**
 * A differential sweep over declarations ending in a backslash escape,
 * generated as the last declaration of a rule or at-rule — the shape
 * that made the plugin drop or misplace the escaped character (see
 * `test/index.js`'s "escaped … character" tests for the named cases
 * this generalises).
 *
 * `node script/fuzz.js --seed 7 --count 200000` runs the same generator
 * for as long as you like, and is what to reach for after touching the
 * rule/at-rule branch in src/index.js.
 */

/* Tuned to keep this file well under a second; the soak run is where volume lives. */
const casesPerSeed = 2000;

for (const seed of [1, 2, 3, 4]) {
  test(`preserves a trailing backslash escape, seed ${seed}`, () => {
    for (const testCase of generate(seed, casesPerSeed)) {
      const failure = check(testCase);

      assert.equal(failure, undefined, failure && report(failure, seed));
    }
  });
}
