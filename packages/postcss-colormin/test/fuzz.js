import test from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { random } from '../../../util/fuzzRng.js';
import oldPlugin from '../script/lib/oldPlugin.js';
import plugin from '../src/index.js';
import { edgeCases, randRule } from '../script/lib/fuzzGenerate.js';
const old = postcss([oldPlugin()]),
  current = postcss([plugin()]);
const run = (p, x) => p.process(x, { from: undefined }).css;
test('preserves output against the legacy color parser', () => {
  for (const seed of [1, 2, 3]) {
    const rng = random(seed);
    for (const css of [
      ...edgeCases,
      ...Array.from({ length: 300 }, () => randRule(rng)),
    ])
      assert.equal(
        run(current, css),
        run(old, css),
        `seed ${seed}, input: ${css}`
      );
  }
});
