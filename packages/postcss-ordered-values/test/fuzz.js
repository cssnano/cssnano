import assert from 'node:assert/strict';
import test from 'node:test';
import postcss from 'postcss';
import { random } from '../../../util/fuzzRng.js';
import oldPlugin from '../script/lib/oldPlugin.js';
import plugin from '../src/index.js';
import {
  edgeCases,
  intentionalDifferences,
  properties,
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

test('preserves output across every ordered-value grammar branch', () => {
  const branches = new Set(),
    values = new Set();
  for (const seed of [1, 2, 3]) {
    const rng = random(seed);
    const old = postcss([oldPlugin()]);
    const current = postcss([plugin()]);
    for (const css of edgeCases) {
      if (intentionalDifferences.has(css)) continue;
      assertSameOutput(
        old.process(css, { from: undefined }).css,
        current.process(css, { from: undefined }).css,
        `seed ${seed}, case: fixed, branch: fixed, input: ${css}`
      );
    }
    for (let index = 0; index < 500; index++) {
      const sample = randRule(rng, index + (seed - 1) * 500);
      const { branch, css, value } = sample;
      if (intentionalDifferences.has(css)) continue;
      branches.add(branch);
      values.add(value);
      assertSameOutput(
        old.process(css, { from: undefined }).css,
        current.process(css, { from: undefined }).css,
        `seed ${seed}, case: ${index}, branch: ${branch}, input: ${css}`
      );
    }
  }
  assert.ok(
    values.size >= 100,
    'the deterministic sweep must cover varied ordered-value grammars'
  );
  assert.deepEqual(
    [...branches].toSorted(),
    properties.map(([property]) => property).toSorted()
  );
});

test('documents the property-scoped cache difference', () => {
  const css = [...intentionalDifferences][0];
  const old = postcss([oldPlugin()]).process(css, { from: undefined }).css;
  const current = postcss([plugin()]).process(css, { from: undefined }).css;
  assert.notStrictEqual(old, current);
  assert.strictEqual(old, 'a{grid-row-gap:normal 1px;border:normal 1px}');
  assert.strictEqual(current, 'a{grid-row-gap:normal 1px;border:1px  normal}');
});
