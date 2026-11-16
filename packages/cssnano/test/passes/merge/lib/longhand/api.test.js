import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onlyTransform } from '../../../onlyTransform.js';
const plugin = onlyTransform(['mergeLonghand']);

const name = 'cssnano-host';
test('should use the postcss plugin api', () => {
  assert.strictEqual(plugin().postcssPlugin, name);
});
