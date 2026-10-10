import assert from 'node:assert/strict';
import { test } from 'node:test';
import cssnanoUtils from 'cssnano-utils';
import { numericSource } from '../src/lib/numericSource.js';

const { tokens } = cssnanoUtils;

test('numericSource reports a dimension with exclusive source bounds', () => {
  const input = tokens('  -0.5PX 25% 1.em');
  assert.deepEqual(numericSource(input, 1), {
    index: 1,
    start: 2,
    end: 8,
    raw: '-0.5PX',
    number: -0.5,
    unit: 'PX',
    hasDecimal: true,
  });
});

test('numericSource joins the historic `1.em` token shape into one spelling', () => {
  const input = tokens('  -0.5PX 25% 1.em');
  const malformed = numericSource(input, 5);
  assert.equal(malformed?.raw, '1.em');
  assert.equal(malformed?.end, 17);
});
