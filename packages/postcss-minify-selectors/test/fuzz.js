import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generate } from '../script/lib/fuzzGenerate.js';
import { checkMinimised, report } from '../script/lib/fuzzCheck.js';

test('differential selector matching: no regressions', () => {
  const seeds = [1, 2];
  const casesPerSeed = 100;

  for (const seed of seeds) {
    const corpus = generate(seed, casesPerSeed);

    for (let i = 0; i < corpus.length; i++) {
      const { rule, tree } = corpus[i];
      const { failure } = checkMinimised(rule, tree, seed);

      if (failure) {
        assert.fail(
          `Fuzzer failure (seed ${seed}, case ${i}):\n${report(failure, seed)}`
        );
      }
    }
  }
});
