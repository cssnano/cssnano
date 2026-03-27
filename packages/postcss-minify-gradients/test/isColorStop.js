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

test('should recognise all valid CSS color formats as color stops', () => {
  // hex
  assert.strictEqual(isColorStop('#fff'), true);
  assert.strictEqual(isColorStop('#ff0000'), true);
  assert.strictEqual(isColorStop('#ff000080'), true);
  // legacy functional
  assert.strictEqual(isColorStop('rgb(255,0,0)'), true);
  assert.strictEqual(isColorStop('rgba(255,0,0,0.5)'), true);
  assert.strictEqual(isColorStop('hsl(0,100%,50%)'), true);
  assert.strictEqual(isColorStop('hsla(0,100%,50%,0.5)'), true);
  // modern space-separated syntax
  assert.strictEqual(isColorStop('rgb(255 0 0)'), true);
  assert.strictEqual(isColorStop('rgb(255 0 0 / 0.5)'), true);
  // modern color spaces (previously broken with colord)
  assert.strictEqual(isColorStop('oklch(0.5 0.2 240)'), true);
  assert.strictEqual(isColorStop('oklab(0.5 0.1 -0.2)'), true);
  assert.strictEqual(isColorStop('hwb(120 0% 0%)'), true);
  // named + transparent
  assert.strictEqual(isColorStop('red'), true);
  assert.strictEqual(isColorStop('transparent'), true);
});

test('should not recognise non-color keywords as color stops', () => {
  assert.strictEqual(isColorStop('inherit'), false);
  assert.strictEqual(isColorStop('currentColor'), false);
  assert.strictEqual(isColorStop('none'), false);
  assert.strictEqual(isColorStop('notacolor'), false);
  assert.strictEqual(isColorStop(''), false);
});
