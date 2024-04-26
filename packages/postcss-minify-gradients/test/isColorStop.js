'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const isColorStop = require('../src/isColorStop.js');

test('should recognise color stops', () => {
  assert.strictEqual(isColorStop('yellow'), true);
  assert.strictEqual(isColorStop('yellow', '12px'), true);
  assert.strictEqual(isColorStop('yellow', 'px'), false);
  assert.strictEqual(isColorStop('yellow', 'calc(100%)'), true);
  assert.strictEqual(isColorStop(undefined), false);
  assert.strictEqual(isColorStop('yellow', '0'), true);
});
