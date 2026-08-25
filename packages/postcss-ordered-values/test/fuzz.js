import assert from 'node:assert/strict';
import test from 'node:test';
import postcss from 'postcss';
import { random } from '../../../util/fuzzRng.js';
import oldPlugin from '../script/lib/oldPlugin.js';
import plugin from '../src/index.js';
import { edgeCases, randRule } from '../script/lib/fuzzGenerate.js';

test('preserves output against the legacy ordered-values parser', () => {
  for (const seed of [1, 2, 3]) {
    const rng = random(seed);
    const old = postcss([oldPlugin()]);
    const current = postcss([plugin()]);
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
  }
});
