import assert from 'node:assert/strict';
import test from 'node:test';
import postcss from 'postcss';
import { random } from '../../../util/fuzzRng.js';
import oldPlugin from '../script/lib/oldPlugin.js';
import plugin from '../src/index.js';
import {
  edgeCases,
  intentionalDifferences,
  randRule,
} from '../script/lib/fuzzGenerate.js';

test('preserves output against the legacy gradients parser', () => {
  const old = postcss([oldPlugin()]);
  const current = postcss([plugin()]);
  for (const seed of [1, 2, 3]) {
    const rng = random(seed);
    for (const css of [
      ...edgeCases,
      ...Array.from({ length: 500 }, () => randRule(rng)),
    ]) {
      assert.equal(
        current.process(css, { from: undefined }).css,
        old.process(css, { from: undefined }).css,
        `seed ${seed}, input: ${css}`
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
});
