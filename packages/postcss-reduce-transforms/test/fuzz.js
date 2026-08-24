import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkMinimised, report } from '../script/lib/fuzzCheck.js';
import { generate } from '../script/lib/fuzzGenerate.js';

/**
 * A differential sweep: random `transform` declarations, each compared
 * against what `script/lib/fuzzEvaluate.js` independently says the
 * declaration's functions mean as 4x4 matrices.
 *
 * `node script/fuzz.js --seed 7 --count 200000` runs the same generator for
 * as long as you like, and is what to reach for after touching a reducer in
 * `src/index.js`.
 */

/* Tuned to keep this file near a second; the soak run is where volume lives. */
const casesPerSeed = 2000;

for (const seed of [1, 2, 3, 4]) {
  test(`preserves what the transform means, seed ${seed}`, () => {
    for (const css of generate(seed, casesPerSeed)) {
      const failure = checkMinimised(css);

      assert.equal(failure, undefined, failure && report(failure, seed));
    }
  });
}
