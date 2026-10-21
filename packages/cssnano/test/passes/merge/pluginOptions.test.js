import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import mergePlugin from '../../../src/passes/merge/index.js';

test('the cssnano-merge plugin rejects a rules option that is not a boolean', () => {
  assert.throws(
    () => mergePlugin({ rules: 'false' }),
    /Option "rules" must be a boolean\./v
  );
});

test('the cssnano-merge plugin accepts an absent rules option as true', () => {
  const css = '.a{color:red}.b{color:red}';
  assert.equal(
    postcss([mergePlugin({})]).process(css, { from: undefined }).css,
    '.a,.b{color:red}'
  );
});
