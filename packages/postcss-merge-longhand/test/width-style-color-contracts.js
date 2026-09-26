import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import parseWidthStyleColor, { toLower } from '../src/lib/parseWsc.js';
import minifyWidthStyleColor from '../src/lib/minifyWsc.js';

describe('parseWsc component classification', () => {
  test('classifies each component wherever it appears, lower-casing grammar terms', () => {
    assert.deepEqual(parseWidthStyleColor('SOLID 1px RED'), {
      width: '1px',
      style: 'solid',
      color: 'red',
    });
  });

  test('leaves a component the value does not specify unnamed', () => {
    assert.deepEqual(parseWidthStyleColor('solid red'), {
      width: undefined,
      style: 'solid',
      color: 'red',
    });
  });

  test('reads a value that resets every component as the initial triple', () => {
    assert.deepEqual(parseWidthStyleColor('NONE'), {
      width: 'medium',
      style: 'none',
      color: 'currentcolor',
    });
  });

  test('reads a width and style reset with an omitted color as the initial triple', () => {
    assert.deepEqual(parseWidthStyleColor('medium none'), {
      width: 'medium',
      style: 'none',
      color: 'currentcolor',
    });
  });
});

describe('parseWsc substitution slots', () => {
  test('reserves the open component for a lone substitution between specified components', () => {
    assert.deepEqual(parseWidthStyleColor('var(--w) solid red'), {
      width: 'var(--w)',
      style: 'solid',
      color: 'red',
    });
  });

  test('fills the open component with the substituted token wherever it appears, keeping its spelling', () => {
    assert.deepEqual(parseWidthStyleColor('SOLID red VAR(--Sub)'), {
      width: 'VAR(--Sub)',
      style: 'solid',
      color: 'red',
    });
  });

  test('reserves the open style for a lone substitution between width and color', () => {
    assert.deepEqual(parseWidthStyleColor('1px red VAR(--Sub)'), {
      width: '1px',
      style: 'VAR(--Sub)',
      color: 'red',
    });
  });

  test('reserves the open color for a lone substitution between width and style', () => {
    assert.deepEqual(parseWidthStyleColor('1px SOLID var(--Sub)'), {
      width: '1px',
      style: 'solid',
      color: 'var(--Sub)',
    });
  });

  test('does not guess a component for a substitution when two components are unspecified', () => {
    assert.deepEqual(parseWidthStyleColor('VAR(--Sub) red'), {
      width: undefined,
      style: undefined,
      color: 'red',
    });
  });
});

describe('parseWsc values the browser ignores', () => {
  test('rejects a value that specifies a component twice', () => {
    assert.strictEqual(parseWidthStyleColor('1px 1px'), null);
  });

  test('rejects a token that is no width, style or color', () => {
    assert.strictEqual(parseWidthStyleColor('1px solid 50%'), null);
  });

  test('rejects a value with more tokens than the grammar accepts', () => {
    assert.strictEqual(parseWidthStyleColor('1px solid red green'), null);
    assert.strictEqual(parseWidthStyleColor('var() var() var() var()'), null);
  });

  test('rejects a substitution in style and color when the width repeats', () => {
    assert.strictEqual(parseWidthStyleColor('1px 1px var()'), null);
  });
});

describe('parseWsc lower-casing', () => {
  test('preserves custom property spelling while lower-casing grammar terms', () => {
    assert.strictEqual(toLower('VAR(--Foo) SOLID red'), 'var(--Foo) solid red');
  });

  test('returns an empty value unchanged', () => {
    assert.strictEqual(toLower(''), '');
  });
});

describe('minifyWsc output contract', () => {
  test('elides trailing initial components', () => {
    assert.strictEqual(minifyWidthStyleColor('medium none'), 'none');
    assert.strictEqual(
      minifyWidthStyleColor('medium none currentcolor'),
      'none'
    );
  });

  test('keeps a substituted width as written while lower-casing the specified components', () => {
    assert.strictEqual(
      minifyWidthStyleColor('var(--X) SOLID red'),
      'var(--X) solid red'
    );
  });

  test('returns a value the browser ignores for specifying a component twice unchanged', () => {
    assert.strictEqual(minifyWidthStyleColor('1px 1px'), '1px 1px');
  });

  test('returns a value the browser ignores for a token that is no component unchanged', () => {
    assert.strictEqual(minifyWidthStyleColor('1px solid 50%'), '1px solid 50%');
  });

  test('returns an incomplete specification unchanged, including its substitution', () => {
    assert.strictEqual(minifyWidthStyleColor('1px'), '1px');
    assert.strictEqual(minifyWidthStyleColor('1px var(--x)'), '1px var(--x)');
  });

  test('keeps an unassigned substitution whose slot is ambiguous as written', () => {
    assert.strictEqual(
      minifyWidthStyleColor('VAR(--Width) var(--Style)'),
      'VAR(--Width) var(--Style)'
    );
  });
});
