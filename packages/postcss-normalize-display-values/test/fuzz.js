import test from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { random } from '../../../util/fuzzRng.js';
import oldPlugin from '../script/lib/oldPlugin.js';
import plugin from '../src/index.js';
import { edgeCases, randRule } from '../script/lib/fuzzGenerate.js';
const oldProcessor = postcss([oldPlugin()]),
  newProcessor = postcss([plugin()]);
const run = (p, css) => p.process(css, { from: undefined }).css;
test('preserves output against the legacy display parser', () => {
  for (const seed of [1, 2, 3]) {
    const rng = random(seed);
    for (const css of [
      ...edgeCases,
      ...Array.from({ length: 300 }, () => randRule(rng)),
    ])
      assert.equal(
        run(newProcessor, css),
        run(oldProcessor, css),
        `seed ${seed}, input: ${css}`
      );
  }
});
