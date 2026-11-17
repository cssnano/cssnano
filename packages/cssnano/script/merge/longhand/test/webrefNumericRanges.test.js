import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  knownProperties,
  numericRangeProperties,
  validateNumericRanges,
} from '../lib/webrefNumericRanges.js';

/**
 * @param {{
 *   properties?: {name: string, syntax?: string}[],
 *   types?: {name: string, syntax?: string}[],
 *   functions?: {name: string, syntax?: string}[]
 * }} data
 */
function webref({ properties = [], types = [], functions = [] }) {
  return { properties, types, functions };
}

/** @param {string} syntax */
const onlyProperty = (syntax) =>
  numericRangeProperties(
    webref({ properties: [{ name: 'probe', syntax }] })
  ).includes('probe');

describe('numericRangeProperties', () => {
  test('reports a property whose range sits inside a named type', () => {
    const data = webref({
      properties: [{ name: 'font-weight', syntax: '<font-weight-absolute>' }],
      types: [
        {
          name: 'font-weight-absolute',
          syntax: '[ normal | bold | <number [1,1000]> ]',
        },
      ],
    });
    assert.deepEqual(numericRangeProperties(data), ['font-weight']);
  });

  test('reports a property whose number is bounded below by 1', () => {
    assert.equal(onlyProperty('<number [1,∞]>'), true);
  });

  test('ignores a number bounded by zero, since the sign class decides it', () => {
    assert.equal(onlyProperty('<number [0,∞]>'), false);
  });

  test('ignores a time bounded by zero with a unit, since the sign class decides it', () => {
    assert.equal(onlyProperty('<time [0s,∞]>'), false);
  });

  test('ignores an integer bounded by one, since zero and positive differ by sign class', () => {
    assert.equal(onlyProperty('<integer [1,∞]>'), false);
  });

  test('ignores a negative integer range, since every negative integer is valid', () => {
    assert.equal(onlyProperty('<integer [-∞,-1]>'), false);
  });

  test('ignores a number bounded above by zero, since the sign class decides it', () => {
    assert.equal(onlyProperty('<number [-∞,0]>'), false);
  });

  test('reports a number bounded below by a negative value', () => {
    assert.equal(onlyProperty('<number [-1,∞]>'), true);
  });

  test('reports an integer bounded between two finite values', () => {
    assert.equal(onlyProperty('<integer [2,4]>'), true);
  });

  test('reports an angle bounded on both sides', () => {
    assert.equal(onlyProperty('oblique <angle [-90deg,90deg]>?'), true);
  });

  test('ignores a number with no bound', () => {
    assert.equal(onlyProperty('<number>'), false);
  });

  test('ignores ranges inside a function that is not a transform', () => {
    const data = webref({
      properties: [{ name: 'probe', syntax: '<foo()>' }],
      functions: [{ name: 'foo()', syntax: 'foo( <number [1,∞]> )' }],
    });
    assert.deepEqual(numericRangeProperties(data), []);
  });

  test('reports a range inside a transform function, whose numbers may vary', () => {
    assert.equal(onlyProperty('scale( <number [1,∞]> )'), true);
  });

  test('resumes after a skipped function with nested parentheses', () => {
    assert.equal(onlyProperty('foo( bar( <number> ) ) | <number [1,∞]>'), true);
  });

  test('skips a function whose close paren is missing to the end of the grammar', () => {
    assert.equal(onlyProperty('foo( <number [1,∞]>'), false);
  });

  test('reports a range in a type that two specs define', () => {
    const data = webref({
      properties: [{ name: 'probe', syntax: '<shared>' }],
      types: [
        { name: 'shared', syntax: 'none' },
        { name: 'shared', syntax: '<number [1,∞]>' },
      ],
    });
    assert.deepEqual(numericRangeProperties(data), ['probe']);
  });

  test('ignores a type that names a grammar in prose only', () => {
    const data = webref({
      properties: [{ name: 'probe', syntax: '<prose-only>' }],
      types: [{ name: 'prose-only' }],
    });
    assert.deepEqual(numericRangeProperties(data), []);
  });

  test('reports a range reached through a property reference', () => {
    const data = webref({
      properties: [
        { name: 'shorthand', syntax: "<'longhand'>" },
        { name: 'longhand', syntax: '<number [1,∞]>' },
      ],
    });
    assert.deepEqual(numericRangeProperties(data), ['longhand', 'shorthand']);
  });

  test('terminates on a cycle of type references', () => {
    const data = webref({
      properties: [{ name: 'probe', syntax: '<cycle-a>' }],
      types: [
        { name: 'cycle-a', syntax: '<cycle-b> | none' },
        { name: 'cycle-b', syntax: '<cycle-a> | <number [1,∞]>' },
      ],
    });
    assert.deepEqual(numericRangeProperties(data), ['probe']);
  });

  test('ignores a property whose named type is unknown', () => {
    assert.equal(onlyProperty('<no-such-type>'), false);
  });
});

describe('validateNumericRanges', () => {
  test('accepts the properties whose bounds the plugin must know', () => {
    assert.doesNotThrow(() =>
      validateNumericRanges([
        'font-style',
        'initial-letter',
        'text-combine-upright',
      ])
    );
  });

  test('rejects a set that lacks a known bounded property', () => {
    assert.throws(() =>
      validateNumericRanges(['font-style', 'initial-letter'])
    );
  });
});

describe('knownProperties', () => {
  test('lists lowercased property names sorted and without duplicates', () => {
    const data = webref({
      properties: [{ name: 'Top' }, { name: 'left' }, { name: 'top' }],
    });
    assert.deepEqual(knownProperties(data), ['left', 'top']);
  });
});
