import { test } from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../../src/plugins/postcss-merge-longhand/index.js';

const name = 'postcss-merge-longhand';
test('should use the postcss plugin api', () => {
  assert.strictEqual(plugin().postcssPlugin, name);
});
