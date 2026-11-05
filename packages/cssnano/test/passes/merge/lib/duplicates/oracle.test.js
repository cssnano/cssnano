import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { enableConsistencyChecks } from '../../../../../src/passes/ir/consistencyChecks.js';
import {
  duplicateSiblingViolation,
  suites,
} from '../../../../../script/passes/merge/duplicates/mutationSuites.js';
import { generateDuplicateCases } from '../../../../../script/passes/merge/duplicates/generate.js';

before(() => enableConsistencyChecks(true));
after(() => enableConsistencyChecks(false));

const SEEDS = Array.from({ length: 20 }, (_, i) => i + 1);
const CASES_PER_SEED = 40;

test('duplicate case generator repeats the same stylesheets for one seed', () => {
  assert.deepEqual(
    generateDuplicateCases(7, CASES_PER_SEED),
    generateDuplicateCases(7, CASES_PER_SEED)
  );
});

test('duplicate case generator gives different stylesheets for different seeds', () => {
  assert.notDeepEqual(
    generateDuplicateCases(7, CASES_PER_SEED),
    generateDuplicateCases(8, CASES_PER_SEED)
  );
});

test('duplicate sibling check reports two equal conditional groups without a layer', () => {
  assert.notEqual(
    duplicateSiblingViolation(
      '@media print{a{color:red}}@media print{a{color:red}}'
    ),
    undefined
  );
});

test('duplicate sibling check accepts two equal conditional groups that each hold a layer', () => {
  assert.equal(
    duplicateSiblingViolation(
      '@media print{@layer a{b{color:red}}}@media print{@layer a{b{color:red}}}'
    ),
    undefined
  );
});

for (const suite of suites) {
  test(`${suite.name} suite agrees with its oracle on 20 seeds of generated stylesheets`, () => {
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
