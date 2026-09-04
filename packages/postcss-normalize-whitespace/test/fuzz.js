import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check, report } from '../script/lib/fuzzCheck.js';
import { generate } from '../script/lib/fuzzGenerate.js';

/**
 * A differential sweep over declarations ending in a backslash escape,
 * plus fixed-output regression cases for value normalization. The
 * normalization cases are repeated in varying containers and sibling
 * contexts; the named tests in `test/index.js` cover them directly too.
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
