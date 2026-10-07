import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkBox, reportBox } from '../script/lib/fuzzBoxCheck.js';
import { generateBoxRules } from '../script/lib/fuzzBoxGenerate.js';

/**
 * A seeded sweep of the box differential oracle at a volume that is too slow
 * for the regular suite. `node script/fuzzBox.js --seed 7 --count 200000`
 * runs the same generator for as long as you like.
 */

const seeds = 20;
const casesPerSeed = 2000;

test('keeps every physical side computing the same in every writing mode', () => {
  for (let seed = 1; seed <= seeds; seed++) {
    for (const css of generateBoxRules(seed, casesPerSeed)) {
      const failure = checkBox(css);
      assert.equal(failure, undefined, failure && reportBox(failure));
    }
  }
});
