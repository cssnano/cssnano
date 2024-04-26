'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const valueParser = require('postcss-value-parser');
const normalizeBorder = require('../src/rules/border.js');
const normalizeBoxShadow = require('../src/rules/boxShadow.js');

test('border order handles max', () => {
  assert.strictEqual(
    normalizeBorder(valueParser('red max(3em, 48px)')),
    'max(3em, 48px)  red'
  );
});

test('border order handles mixed color and width functions', () => {
  assert.strictEqual(
    normalizeBorder(
      valueParser('rgba(0, 50, 50, 0.4) solid clamp(3em, 0.5vw, 48px)')
    ),
    'clamp(3em, 0.5vw, 48px) solid rgba(0, 50, 50, 0.4)'
  );
});

test('ordering box shadows handles functions in box shadows', () => {
  assert.strictEqual(
    normalizeBoxShadow(valueParser('inset 0 min(1em, 1px) 0 1px red')),
    'inset 0 min(1em, 1px) 0 1px red'
  );
});
