'use strict';
const { suite } = require('uvu');
const assert = require('uvu/assert');
const valueParser = require('postcss-value-parser');
const normalizeBorder = require('../src/rules/border.js');
const normalizeBoxShadow = require('../src/rules/boxShadow.js');

const borderOrder = suite('orders borders');
borderOrder('handles max', () => {
  assert.is(
    normalizeBorder(valueParser('red max(3em, 48px)')),
    'max(3em, 48px)  red'
  );
});

borderOrder('handles mixed color and width functions', () => {
  assert.is(
    normalizeBorder(
      valueParser('rgba(0, 50, 50, 0.4) solid clamp(3em, 0.5vw, 48px)')
    ),
    'clamp(3em, 0.5vw, 48px) solid rgba(0, 50, 50, 0.4)'
  );
});

borderOrder.run();

const boxShadowOrder = suite('orders box shadows');
boxShadowOrder('handles functions in box shadows', () => {
  assert.is(
    normalizeBoxShadow(valueParser('inset 0 min(1em, 1px) 0 1px red')),
    'inset 0 min(1em, 1px) 0 1px red'
  );
});
boxShadowOrder.run();
