import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transformPlugin } from '#passes/merge';
const plugin = transformPlugin('mergeLonghand');

const name = 'cssnano-merge';
test('should use the postcss plugin api', () => {
  assert.strictEqual(plugin().postcssPlugin, name);
});
