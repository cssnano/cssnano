import test from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { random } from '../../../util/fuzzRng.js';
import oldPlugin from '../script/lib/oldPlugin.js';
import plugin from '../src/index.js';
import { edgeCases, randRule } from '../script/lib/fuzzGenerate.js';

test('preserves output against the legacy params parser', () => {
  for (const seed of [1, 2, 3]) {
    const rng = random(seed);
    const old = postcss([oldPlugin({ overrideBrowserslist: 'Chrome 58' })]);
    const current = postcss([plugin({ overrideBrowserslist: 'Chrome 58' })]);
    for (const css of [
      ...edgeCases,
      ...Array.from({ length: 250 }, () => randRule(rng)),
    ]) {
      const options = { from: undefined, overrideBrowserslist: 'Chrome 58' };
      assert.equal(
        current.process(css, options).css,
        old.process(css, options).css,
        `seed ${seed}, input: ${css}`
      );
    }
  }
});
