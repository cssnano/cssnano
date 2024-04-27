'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { name } = require('../package.json');
const plugin = require('../src/index.js');

test('should use the postcss plugin api', () => {
  assert.strictEqual(plugin().postcssPlugin, name);
});
