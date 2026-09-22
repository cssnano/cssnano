import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import cssnanoUtils from 'cssnano-utils';
import { parseAnPlusB } from '../src/lib/argumentParsers.js';

const { tokens } = cssnanoUtils;

/** @param {string} value */
function parse(value) {
  const input = tokens(value);
  return parseAnPlusB(input, 0, input.length);
}

/** @param {string} value @param {boolean} [isTwoNPlusOne] */
function assertValid(value, isTwoNPlusOne = false) {
  assert.deepEqual(parse(value), { isTwoNPlusOne }, value);
}

describe('parseAnPlusB', () => {
  test('parses every keyword and integer production', () => {
    assertValid('odd', true);
    assertValid('EVEN');
    assertValid('-90071992547409931234567890');
  });

  test('parses n dimension and ident productions', () => {
    for (const value of ['2n', '+n', 'n', '-n']) {
      assertValid(value);
    }
    assertValid('90071992547409931234567890n');
  });

  test('parses embedded negative offset productions', () => {
    for (const value of ['2n-3', 'n-3', '+n-3', '-n-3']) assertValid(value);
  });

  test('parses separate signed integer productions', () => {
    for (const value of ['2n +3', 'n -3', '+n/**/+3', '+/**/n+3', '-n -3']) {
      assertValid(value);
    }
  });

  test('parses separate signless integer productions', () => {
    for (const value of [
      '2n- 3',
      'n- 3',
      '+n-/**/3',
      '-n- 3',
      '2n + 3',
      'n - 3',
      '+n + 3',
      '-n + 3',
    ]) {
      assertValid(value);
    }
  });

  test('uses decoded escaped units, identifiers, hyphens, and digits', () => {
    for (const value of ['2\\6e ', '\\6e ', '2n\\-3', '\\6e-\\33 ', '-\\6e-3'])
      assertValid(value);
  });

  test('ignores comments and surrounding whitespace', () => {
    assertValid(' /**/ 2n /*! keep */ + /**/ 1 ', true);
  });

  test('validates long integer coefficients and offsets without numeric accumulation', () => {
    const digits = '9'.repeat(300_000);
    assertValid(`${digits}n+${digits}`);
    assertValid(`2n+${'0'.repeat(299_999)}1`, true);
  });

  test('rejects non-integers and incorrect token types', () => {
    for (const value of ['1.0', '1e2', '1.0n', '1e2n', '10%', '#n']) {
      assert.equal(parse(value), undefined, value);
    }
  });

  test('rejects whitespace after a leading plus before n', () => {
    for (const value of ['+ n', '+ /**/ n']) {
      assert.equal(parse(value), undefined, value);
    }
  });

  test('rejects separated components, double signs, and unknown units', () => {
    for (const value of [
      '2 n',
      'n 2',
      '+-n',
      '+/**/-n-2',
      'n + +2',
      'n - -2',
      '2nx',
      'n-x',
    ]) {
      assert.equal(parse(value), undefined, value);
    }
  });

  test('requires complete span consumption', () => {
    for (const value of ['n trailing', '2n + 1 trailing']) {
      assert.equal(parse(value), undefined, value);
    }
  });

  test('rejects empty spans and invalid bounds', () => {
    const input = tokens('n');
    for (const [start, end] of [
      [0, 0],
      [-1, 1],
      [0, 2],
      [1, 0],
      [0.5, 1],
    ]) {
      assert.equal(parseAnPlusB(input, start, end), undefined);
    }
    assert.equal(parse(' /**/ '), undefined);
  });
});
