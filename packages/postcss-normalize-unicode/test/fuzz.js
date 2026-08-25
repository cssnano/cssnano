import test from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { random } from '../../../util/fuzzRng.js';
import oldPlugin from '../script/lib/oldPlugin.js';
import plugin from '../src/index.js';
import { edgeCases, randRule } from '../script/lib/fuzzGenerate.js';
const oldProcessor = postcss([oldPlugin()]);
const newProcessor = postcss([plugin()]);
function compare(css) {
  return [
    oldProcessor.process(css, {
      from: undefined,
      overrideBrowserslist: ['defaults', 'not ie <=11'],
    }).css,
    newProcessor.process(css, {
      from: undefined,
      overrideBrowserslist: ['defaults', 'not ie <=11'],
    }).css,
  ];
}
test('preserves output across every legacy-compatible unicode grammar branch', () => {
  const branches = new Set(),
    generated = new Set();
  for (const css of edgeCases)
    assert.deepEqual(compare(css)[1], compare(css)[0], css);
  for (const seed of [1, 2, 3]) {
    const rng = random(seed);
    for (let index = 0; index < 300; index++) {
      const { branch, css } = randRule(rng, index + (seed - 1) * 300);
      branches.add(branch);
      generated.add(css);
      const [oldOut, newOut] = compare(css);
      assert.equal(
        newOut,
        oldOut,
        `seed ${seed}, input: ${css}\nold: ${oldOut}\nnew: ${newOut}`
      );
    }
  }
  assert.equal(
    generated.size,
    900,
    'the deterministic sweep must not replay inputs'
  );
  assert.deepEqual([...branches].toSorted(), [
    'comma-separated-ranges',
    'mergeable-range',
    'single-range',
    'unmergeable-range',
    'wildcard-range',
  ]);
});
