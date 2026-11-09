import assert from 'node:assert/strict';
import { test } from 'node:test';
import { suites } from '../../../../../script/passes/merge/duplicates/mutationSuites.js';

// The longer sweep of the duplicate oracles: 200 seeds of 60 stylesheets each.
const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
const CASES_PER_SEED = 60;

for (const suite of suites) {
  test(`${suite.name} suite agrees with its oracle on 200 seeds of generated stylesheets`, () => {
    for (const seed of SEEDS) {
      for (const input of suite.generate(seed, CASES_PER_SEED)) {
        const output = suite.run(input);
        const failure =
          suite.check(input, output) ??
          suite.checkRun?.(input, output, suite.run);
        assert.equal(
          failure,
          undefined,
          `seed ${seed}: ${JSON.stringify(input)}`
        );
      }
    }
  });
}
