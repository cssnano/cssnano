'use strict';
const { test } = require('uvu');
const assert = require('uvu/assert');
const isColorStop = require('../src/isColorStop.js');

test('should recognise color stops', () => {
  assert.is(isColorStop('yellow'), true);
  assert.is(isColorStop('yellow', '12px'), true);
  assert.is(isColorStop('yellow', 'px'), false);
  assert.is(isColorStop('yellow', 'calc(100%)'), true);
  assert.is(isColorStop(undefined), false);
  assert.is(isColorStop('yellow', '0'), true);
});
test.run();
