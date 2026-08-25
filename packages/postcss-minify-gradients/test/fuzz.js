import assert from 'node:assert/strict';
import test from 'node:test';
import postcss from 'postcss';
import { random } from '../../../util/fuzzRng.js';
import oldPlugin from '../script/lib/oldPlugin.js';
import plugin from '../src/index.js';
import {
  edgeCases,
  gradientNames,
  intentionalDifferences,
  randRule,
} from '../script/lib/fuzzGenerate.js';

/** @param {string} oldOutput @param {string} currentOutput @param {string} details */
function assertSameOutput(oldOutput, currentOutput, details) {
  if (currentOutput === oldOutput) return;

  let firstDifferingByte = 0;
  while (
    firstDifferingByte < oldOutput.length &&
    oldOutput[firstDifferingByte] === currentOutput[firstDifferingByte]
  ) {
    firstDifferingByte++;
  }
  assert.fail(
    `classification: unclassified\n${details}\nold: ${oldOutput}\nnew: ${currentOutput}\nfirst differing byte: ${firstDifferingByte}`
  );
}

test('preserves output across every gradient grammar branch', () => {
  const branches = new Set();
  const values = new Set();
  for (const seed of [1, 2, 3]) {
    const rng = random(seed);
    const old = postcss([oldPlugin()]);
    const current = postcss([plugin()]);
    for (const css of edgeCases) {
      assertSameOutput(
        old.process(css, { from: undefined }).css,
        current.process(css, { from: undefined }).css,
        `seed ${seed}, case: fixed, input: ${css}`
      );
    }
    for (let index = 0; index < 500; index++) {
      const sample = randRule(rng, index + (seed - 1) * 500);
      branches.add(sample.branch);
      values.add(sample.value);
      assertSameOutput(
        old.process(sample.css, { from: undefined }).css,
        current.process(sample.css, { from: undefined }).css,
        `seed ${seed}, case: ${index}, branch: ${sample.branch}, input: ${sample.css}`
      );
    }
    for (const css of intentionalDifferences) {
      assert.notEqual(
        current.process(css, { from: undefined }).css,
        old.process(css, { from: undefined }).css,
        `named intentional difference must remain isolated: ${css}`
      );
    }
  }
  assert.deepEqual([...branches].toSorted(), gradientNames.toSorted());
  assert.ok(
    values.size >= 500,
    'the deterministic sweep must cover varied gradient values'
  );
});
