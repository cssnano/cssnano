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
test('preserves output across every timing-function grammar branch', () => {
  const branches = new Set(),
    generated = new Set();
  for (const seed of [1, 2, 3]) {
    const rng = random(seed);
    for (const css of edgeCases)
      assert.equal(run(current, css), run(old, css), css);
    for (let index = 0; index < 300; index++) {
      const { branch, css } = randRule(rng, index + (seed - 1) * 300);
      branches.add(branch);
      generated.add(css);
      assert.equal(
        run(current, css),
        run(old, css),
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
    'cubic-bezier',
    'malformed-whitespace',
    'nested-function',
    'steps-default',
    'steps-position',
  ]);
});
