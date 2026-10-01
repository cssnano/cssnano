import assert from 'node:assert/strict';
import { test } from 'node:test';
import { check, report } from '../script/lib/fuzzCheck.js';
import { generate } from '../script/lib/fuzzGenerate.js';

const casesPerSeed = 5000;

for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
  test(`fuzzing merge-idents invariants and idempotency, seed ${seed}`, () => {
    for (const testCase of generate(seed, casesPerSeed)) {
      const failure = check(testCase);
      assert.equal(failure, undefined, failure && report(failure, seed));
    }
  });
}
