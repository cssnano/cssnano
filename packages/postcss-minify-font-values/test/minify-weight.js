'use strict';
const { test } = require('uvu');
const assert = require('uvu/assert');
const minifyWeight = require('../src/lib/minify-weight.js');

test('minify-weight', () => {
  assert.is(minifyWeight('normal'), '400');
  assert.is(minifyWeight('bold'), '700');
  assert.is(minifyWeight('lighter'), 'lighter');
  assert.is(minifyWeight('bolder'), 'bolder');
});
test.run();
