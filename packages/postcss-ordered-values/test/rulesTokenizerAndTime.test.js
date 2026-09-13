import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import classifyTime from '../src/lib/isTime.js';
import { isPercentage, isString, tokenizeValue } from '../src/lib/tokenize.js';

describe('Tokenization', () => {
  test('tokenization preserves escaped names and nested separators as one term', () => {
    const parsed = tokenizeValue('opacity 1s v\\61r(--x, min(1s, 2s))');

    assert.deepEqual(
      parsed.arguments.map((argument) => argument.map((term) => term.raw)),
      [['opacity', '1s', 'v\\61r(--x, min(1s, 2s))']]
    );
    assert.strictEqual(parsed.abort, true);
  });

  test('tokenization keeps bracketed names and quoted URLs atomic', () => {
    const parsed = tokenizeValue('[line name] url("a,b") 1fr');

    assert.deepEqual(
      parsed.terms.map((term) => term.raw),
      ['[line name]', 'url("a,b")', '1fr']
    );
  });

  test('tokenization aborts on mismatched or unclosed delimiters', () => {
    for (const value of ['a (b]', 'a [b)', 'a {b', 'a (b']) {
      assert.equal(tokenizeValue(value).abort, true, value);
    }
  });

  test('tokenization classifies string terms', () => {
    const parsed = tokenizeValue('"fade" ident 1s 2');
    assert.strictEqual(isString(parsed.terms[0]), true);
    assert.strictEqual(isString(parsed.terms[1]), false);
    assert.strictEqual(isString(parsed.terms[2]), false);
    assert.strictEqual(isString(parsed.terms[3]), false);
  });

  test('tokenization classifies percentage terms', () => {
    const parsed = tokenizeValue('50% ident 1s 2');
    assert.strictEqual(isPercentage(parsed.terms[0]), true);
    assert.strictEqual(isPercentage(parsed.terms[1]), false);
    assert.strictEqual(isPercentage(parsed.terms[2]), false);
    assert.strictEqual(isPercentage(parsed.terms[3]), false);
  });
});

describe('Time classification', () => {
  test('classifies direct terms without math parsing', () => {
    for (const [value, expected] of [
      ['1s', { isMath: false, dimension: 'time', isNonNegative: true }],
      ['-1s', { isMath: false, dimension: 'time', isNonNegative: false }],
      ['-0s', { isMath: false, dimension: 'time', isNonNegative: false }],
      ['1deg', { isMath: false, dimension: 'angle', isNonNegative: false }],
      [
        '1px',
        { isMath: false, dimension: 'dimension:px', isNonNegative: false },
      ],
      ['1', { isMath: false, dimension: 'number', isNonNegative: false }],
      ['fade', { isMath: false, dimension: null, isNonNegative: false }],
    ]) {
      assert.deepEqual(classifyTime(tokenizeValue(value).terms[0]), expected);
    }
  });

  for (const value of ['1s', '1ms']) {
    test(`${value} is a time`, () => {
      assert.equal(
        classifyTime(tokenizeValue(value).terms[0]).dimension,
        'time'
      );
    });
  }

  for (const value of [
    '1px',
    '1%',
    '1deg',
    '1',
    'calc(1s / 1s)',
    'calc(1s * sin(0, 1))',
    'calc(1s * sin(1s))',
    'calc(1s * sin(10px))',
    'calc(1s * asin(0.5))',
    'calc(1s * sqrt(4s))',
    'calc(1s * pow(2s, 3))',
    'calc(1s * pow(2))',
    'calc(1s * sqrt(4, 2))',
    'calc(1s * log(10, 2, 3))',
    'calc(1s * exp())',
    'calc(1s + sin(0))',
    'calc(sin(0))',
    'calc(asin(0.5))',
    'calc(1s)*2',
    'sign(50px)',
    'atan2(1s, 2s)',
    'sqrt(4)',
    'pow(2, 3)',
    'log(10)',
    'exp(1)',
    'cos(0deg)',
    'tan(0deg)',
    'calc(1s + calc(1s)*2)',
    'calc(1 / 1s)',
    'round(1s)',
    'calc(1s * round(1s))',
    'calc(1s * round(1s, 200ms))',
    'calc(max(1s, 10px))',
    'calc(1s (2s))',
    'calc(1s + + 2s)',
    'calc((1s, 2s))',
    'min(, 1s)',
    'calc(1s]',
    'calc(1s',
    'mod(10s, 3px)',
    'hypot(3s, 4px)',
    'calc(1s + 1px)',
    'calc(1s * 1px)',
  ]) {
    test(`${value} is not a time`, () => {
      assert.notEqual(
        classifyTime(tokenizeValue(value).terms[0]).dimension,
        'time'
      );
    });
  }

  for (const value of ['calc(1s +)']) {
    test(`${value} is not classified as a direct time`, () => {
      assert.deepEqual(classifyTime(tokenizeValue(value).terms[0]), {
        isMath: true,
        dimension: null,
        isNonNegative: false,
      });
    });
  }

  for (const value of [
    'calc(1s + 2s)',
    'calc(1s * 2)',
    'min(1s)',
    'max(100ms)',
    'min(1s, 2s)',
    'clamp(1ms, calc(1s + 1s), 3s)',
    'calc(1s * sin(0))',
    'calc(1s * cos(0))',
    'calc(1s * tan(0))',
    'calc(1s * sin(30deg))',
    'calc(1s * cos(45deg))',
    'calc(1s * tan(0.25turn))',
    'calc(1s * sin(1rad))',
    'calc(1s * sin(100grad))',
    'calc(1s * sqrt(4))',
    'calc(1s * pow(2, 3))',
    'calc(1s * log(10))',
    'calc(1s * log(10, 2))',
    'calc(1s * exp(1))',
    'calc(1s * sign(50px))',
    'calc(1s * sign(-5s))',
    'calc(1s * sin(asin(0.5)))',
    'calc(1s * sin(acos(0.5)))',
    'calc(1s * sin(atan(1)))',
    'calc(1s * sin(atan2(1s, 2s)))',
    'abs(1s)',
    'calc(abs(-5s))',
    'hypot(3s, 4s)',
    'mod(10s, 3s)',
    'rem(10s, 3s)',
    'round(1s, 200ms)',
    'calc(1s * round(2))',
    'calc(1s + round(1s, 200ms))',
    'calc(2 * round(1s, 200ms))',
    'calc((1s + 2s) * 2)',
    'calc(1s * (2 + 3))',
    'calc(10s / 2)',
    'calc(1s * 2 + 3s)',
  ]) {
    test(`${value} is a validated time`, () => {
      assert.deepEqual(classifyTime(tokenizeValue(value).terms[0]), {
        isMath: true,
        dimension: 'time',
        isNonNegative: true,
      });
    });
  }
});

describe('Tokenizer boundary invariants', () => {
  test('aborts on unexpected closing delimiters at top level', () => {
    for (const value of ['1px solid red )', '10px ]', '} 10px']) {
      assert.equal(tokenizeValue(value).abort, true, value);
    }
  });

  test('handles empty or whitespace-only inputs without crashing', () => {
    for (const value of ['', '   ', '\t\n']) {
      const result = tokenizeValue(value);
      assert.equal(result.terms.length, 0);
      assert.equal(result.abort, false);
    }
  });

  test('splits consecutive and leading/trailing top-level slashes cleanly', () => {
    const parsed = tokenizeValue('10px / / 20px');
    assert.deepEqual(
      parsed.terms.map((term) => term.raw),
      ['10px', '/', '/', '20px']
    );
  });

  test('preserves inner function whitespace and nested separators byte-for-byte', () => {
    const parsed = tokenizeValue('calc( 10px  +  20px ) rgb(0 0 0 / 50%)');
    assert.deepEqual(
      parsed.terms.map((term) => term.raw),
      ['calc( 10px  +  20px )', 'rgb(0 0 0 / 50%)']
    );
  });
});
