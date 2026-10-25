import assert from 'node:assert/strict';
import { test } from 'node:test';
import cssnanoUtils from '#utils';
import { numericSource } from '../../src/plugins/postcss-convert-values/lib/numericSource.js';

const { tokens } = cssnanoUtils;

test('numericSource reports a dimension with the index of its last token', () => {
  const input = tokens('  -0.5PX 25% 1.em');
  assert.deepEqual(numericSource(input, 1), {
    index: 1,
    raw: '-0.5PX',
    number: -0.5,
    unit: 'PX',
    hasDecimal: true,
  });
});

test('numericSource does not join a number, a dot and an identifier, so `1.em` is one number and the dot stays', () => {
  const input = tokens('  -0.5PX 25% 1.em');
  assert.deepEqual(numericSource(input, 5), {
    index: 5,
    raw: '1',
    number: 1,
    unit: '',
    hasDecimal: false,
  });
});
