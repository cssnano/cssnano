import assert from 'node:assert/strict';
import test from 'node:test';
import postcss from 'postcss';
import { random } from '../../../util/fuzzRng.js';
import oldPlugin from '../script/lib/oldPlugin.js';
import plugin from '../src/index.js';
import {
  edgeCases,
  intentionalDifferences,
  options,
  properties,
  randRule,
} from '../script/lib/fuzzGenerate.js';

test('preserves output across font family, weight, and shorthand grammars', () => {
  const branches = new Set(),
    generated = new Set(),
    values = new Set(),
    optionBranches = new Set();
  for (const seed of [1, 2, 3]) {
    const rng = random(seed);
    for (const css of edgeCases) {
      assert.equal(
        postcss([plugin({})]).process(css, { from: undefined }).css,
        postcss([oldPlugin({})]).process(css, { from: undefined }).css,
        `seed ${seed}, input: ${css}`
      );
    }
    for (const css of intentionalDifferences) {
      assert.notEqual(
        postcss([plugin({})]).process(css, { from: undefined }).css,
        postcss([oldPlugin({})]).process(css, { from: undefined }).css,
        `named intentional difference must remain isolated: ${css}`
      );
    }
    for (let index = 0; index < 300; index++) {
      const sample = randRule(rng, index + (seed - 1) * 300);
      const { branch, css, option, options: opts, value } = sample;
      branches.add(branch);
      generated.add(css);
      values.add(`${branch}:${value}`);
      optionBranches.add(option);
      assert.equal(
        postcss([plugin(opts)]).process(css, { from: undefined }).css,
        postcss([oldPlugin(opts)]).process(css, { from: undefined }).css,
        `seed ${seed}, input: ${css}`
      );
    }
  }
  assert.deepEqual([...branches].toSorted(), properties.toSorted());
  assert.equal(
    generated.size,
    900,
    'the deterministic sweep must not replay inputs'
  );
  assert.ok(
    values.size >= 500,
    'the declaration values must cover varied grammars'
  );
  assert.deepEqual(
    [...optionBranches].toSorted(),
    options.map((option) => Object.keys(option)[0] || 'defaults').toSorted()
  );
});
