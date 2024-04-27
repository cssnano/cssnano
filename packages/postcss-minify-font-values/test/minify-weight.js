'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const minifyWeight = require('../src/lib/minify-weight.js');

test('minify-weight', () => {
  assert.strictEqual(minifyWeight('normal'), '400');
  assert.strictEqual(minifyWeight('bold'), '700');
  assert.strictEqual(minifyWeight('lighter'), 'lighter');
  assert.strictEqual(minifyWeight('bolder'), 'bolder');
});
