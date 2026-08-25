import test from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import { random } from '../../../util/fuzzRng.js';
import oldPlugin from '../script/lib/oldPlugin.js';
import plugin from '../src/index.js';
import { edgeCases, randRule } from '../script/lib/fuzzGenerate.js';

const run = (factory, css) =>
  postcss([factory()]).process(css, { from: undefined }).css;

test('preserves output across every reducible identifier grammar branch', () => {
  const branches = new Set(),
    generated = new Set();
  for (const seed of [1, 2, 3]) {
    const rng = random(seed);
    for (const css of edgeCases) {
      assert.equal(
        run(plugin, css),
        run(oldPlugin, css),
        `seed ${seed}, input: ${css}`
      );
    }
    for (let index = 0; index < 300; index++) {
      const { branch, css } = randRule(rng, index + (seed - 1) * 300);
      branches.add(branch);
      generated.add(css);
      assert.equal(
        run(plugin, css),
        run(oldPlugin, css),
        `seed ${seed}, input: ${css}`
      );
    }
  }
  assert.equal(
    generated.size,
    900,
    'the deterministic sweep must not replay inputs'
  );
  assert.deepEqual([...branches].toSorted(), [
    'counter-style',
    'counters',
    'grid',
    'keyframes',
  ]);
});
