import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import cssnanoUtils from '#utils';
import { processCSSFactory } from '../../../../../util/testHelpers.js';
const plugin = onlyTransform(['mergeLonghand']);
import {
  hasExponent,
  isLengthValue,
  parseDimension,
  scanNumber,
} from '../../../src/merge/longhand/lengthGrammar.js';
import { onlyTransform } from '../onlyTransform.js';

const { numeric, tokens } = cssnanoUtils;
const { passthroughCSS } = processCSSFactory(plugin);

describe('scanNumber', () => {
  test('ends the number before a unit that follows an exponent', () => {
    assert.equal(scanNumber('1e3px'), 3);
  });

  test('leaves the e of a unit as the unit', () => {
    assert.equal(scanNumber('1em'), 1);
  });

  test('accepts an uppercase exponent marker', () => {
    assert.equal(scanNumber('2E-2'), 4);
  });

  test('finds no number in text without a digit', () => {
    assert.equal(scanNumber('.e3'), -1);
  });

  test('returns an index rather than an object, so scanning allocates nothing', () => {
    assert.equal(typeof scanNumber('1px'), 'number');
  });
});

describe('hasExponent', () => {
  test('reports an exponent only where e is followed by a digit', () => {
    assert.equal(hasExponent('1e3px'), true);
  });

  test('leaves the e of a unit as the unit', () => {
    assert.equal(hasExponent('1em'), false);
  });

  test('accepts an uppercase exponent marker', () => {
    assert.equal(hasExponent('2E-2'), true);
  });

  test('reports no exponent in a number without one', () => {
    assert.equal(hasExponent('.5'), false);
  });
});

describe('parseDimension', () => {
  const spellings = [
    '0',
    '-0',
    '+5',
    '.5',
    '-.5em',
    '10px',
    '1.5rem',
    '1e3',
    '1e+3px',
    '1e-3%',
    '10%',
    '1em',
    '1ex',
    '1e',
  ];

  for (const spelling of spellings) {
    test(`agrees with the CSS tokenizer on ${spelling}`, () => {
      const [token] = tokens(spelling);
      const expected = numeric(token);
      assert.deepEqual(parseDimension(spelling), expected || undefined);
    });
  }

  for (const spelling of [
    '',
    'px',
    '%',
    '5.',
    '1.5.5',
    '--5',
    '5px5',
    '5-',
    '+',
  ]) {
    test(`rejects ${JSON.stringify(spelling)}, which is no single numeric token`, () => {
      assert.equal(parseDimension(spelling), undefined);
    });
  }

  test('keeps the sign of zero', () => {
    assert.ok(Object.is(parseDimension('-0px')?.number, -0));
  });
});

describe('isLengthValue', () => {
  test('accepts a unitless zero only', () => {
    assert.equal(isLengthValue(0, '', false, false), true);
    assert.equal(isLengthValue(5, '', false, false), false);
  });

  test('accepts a percentage only where the grammar allows it', () => {
    assert.equal(isLengthValue(5, '%', true, false), true);
    assert.equal(isLengthValue(5, '%', false, false), false);
  });

  test('rejects a unit that is not a length unit', () => {
    assert.equal(isLengthValue(5, 'deg', true, false), false);
    assert.equal(isLengthValue(5, 'PX', true, false), true);
  });

  test('rejects a negative length only where the range is non-negative', () => {
    assert.equal(isLengthValue(-5, 'px', false, false), true);
    assert.equal(isLengthValue(-5, 'px', false, true), false);
  });

  test('rejects negative zero in a non-negative range, which keeps its spelling', () => {
    assert.equal(isLengthValue(-0, 'px', false, true), false);
    assert.equal(isLengthValue(-0, 'px', false, false), true);
  });
});

describe('length grammars share one rule', () => {
  test(
    'keeps gap with a negative zero unchanged, because a non-negative range treats -0 as negative',
    passthroughCSS('a{gap:-0px -0px}')
  );
});
