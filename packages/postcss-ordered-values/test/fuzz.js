import assert from 'node:assert/strict';
import test from 'node:test';
import postcss from 'postcss';
import { random } from '../../../util/fuzzRng.js';
import oldPlugin from '../script/lib/oldPlugin.js';
import plugin from '../src/index.js';
import { edgeCases, properties, randRule } from '../script/lib/fuzzGenerate.js';

test('preserves output across every ordered-value grammar branch', () => {
  const branches = new Set(),
    generated = new Set();
  for (const seed of [1, 2, 3]) {
    const rng = random(seed);
    const old = postcss([oldPlugin()]);
    const current = postcss([plugin()]);
    for (const css of edgeCases) {
      assert.equal(
        current.process(css, { from: undefined }).css,
        old.process(css, { from: undefined }).css,
        `seed ${seed}, input: ${css}`
      );
    }
    for (let index = 0; index < 500; index++) {
      const { branch, css } = randRule(rng, index + (seed - 1) * 500);
      branches.add(branch);
      generated.add(css);
      assert.equal(
        current.process(css, { from: undefined }).css,
        old.process(css, { from: undefined }).css,
        `seed ${seed}, input: ${css}`
      );
    }
  }
  assert.equal(
    generated.size,
    1500,
    'the deterministic sweep must not replay inputs'
  );
  assert.deepEqual(
    [...branches].toSorted(),
    properties.map(([property]) => property).toSorted()
  );
});
