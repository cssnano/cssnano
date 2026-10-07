import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import cssnanoUtils from 'cssnano-utils';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';
import { isLengthValue, parseDimension } from '../src/lib/lengthGrammar.js';

const { numeric, tokens } = cssnanoUtils;
const { passthroughCSS } = processCSSFactory(plugin);

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
