import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generate, generateMalformed } from '../script/lib/fuzzGenerate.js';
import { checkMinimised, report } from '../script/lib/fuzzCheck.js';
import { normalizeList } from '../src/lib/selectorScanner.js';

test('differential selector matching: no regressions', () => {
  const seeds = [1, 2];
  const casesPerSeed = 100;

  for (const seed of seeds) {
    for (const [i, { rule, tree }] of [
      ...generate(seed, casesPerSeed),
    ].entries()) {
      const failure = checkMinimised(rule, tree);

      if (failure) {
        assert.fail(
          `Fuzzer failure (seed ${seed}, case ${i}):\n${report(failure, seed)}`
        );
      }
    }
  }
});

test('malformed selector fuzzer corpus is fail-closed without a DOM oracle', () => {
  for (const selector of generateMalformed(1, 100)) {
    assert.doesNotThrow(() => normalizeList(selector, false, false), selector);
    assert.equal(normalizeList(selector, false, false), selector, selector);
  }
});
