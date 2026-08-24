import nodetest from 'node:test';
import assert from 'node:assert/strict';
import package$0 from '../package.json' with { type: 'json' };
import plugin from '../src/index.js';

const { test } = nodetest;
const { name } = package$0;
test('should use the postcss plugin api', () => {
  assert.strictEqual(plugin().postcssPlugin, name);
});
