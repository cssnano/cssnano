import { test } from 'node:test';
import assert from 'node:assert/strict';
import { check, report } from '../script/lib/fuzzCheck.js';
import { generate } from '../script/lib/fuzzGenerate.js';

/* Tuned to keep this test fast in the regular test runner. */
const casesPerSeed = 100;

for (const seed of [1, 2, 3, 4]) {
  test(`optimizes SVG URLs predictably and idempotently, seed ${seed}`, () => {
    let index = 0;
    for (const testCase of generate(seed, casesPerSeed)) {
      const failure = check(testCase);
      assert.equal(failure, undefined, failure && report(failure, seed, index));
      index++;
    }
  });
}
