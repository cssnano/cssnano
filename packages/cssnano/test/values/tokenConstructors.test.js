import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, NumberType, TokenType } from '@csstools/css-tokenizer';
import {
  ident,
  integer,
  numeric,
  percentage,
  stringToken,
  whitespace,
} from '../../src/values/tokenConstructors.js';

/**
 * The first token that the tokenizer reads from `text`.
 *
 * @param {string} text
 */
function firstToken(text) {
  return tokenize({ css: text })[0];
}

test('ident gives an identifier token', () => {
  assert.equal(ident('red')[0], TokenType.Ident);
});

test('ident keeps the value it was given', () => {
  assert.equal(ident('red')[4].value, 'red');
});

test('ident writes a plain identifier as its own text', () => {
  assert.equal(ident('red')[1], 'red');
});

test('ident escapes a leading digit so the text reads back as one identifier', () => {
  assert.equal(firstToken(ident('1a')[1])[4].value, '1a');
});

test('ident escapes a space so the text reads back as one identifier', () => {
  assert.equal(firstToken(ident('a b')[1])[4].value, 'a b');
});

test('ident escapes a hyphen followed by a digit so the text reads back as one identifier', () => {
  assert.equal(firstToken(ident('-1')[1])[4].value, '-1');
});

test('ident writes a non-ASCII character unescaped', () => {
  assert.equal(ident('é')[1], 'é');
});

test('ident rejects an empty value, which no identifier token can have', () => {
  assert.throws(() => ident(''), RangeError);
});

test('integer gives a number token with the integer type', () => {
  assert.equal(integer(3)[4].type, NumberType.Integer);
});

test('integer rejects a value that is not an integer', () => {
  assert.throws(() => integer(1.5), RangeError);
});

test('integer rejects an integer beyond the safe range', () => {
  assert.throws(() => integer(2 ** 53), RangeError);
});

test('percentage gives a percentage token', () => {
  assert.equal(percentage(50)[0], TokenType.Percentage);
});

test('percentage writes the number followed by a percent sign', () => {
  assert.equal(percentage(50)[1], '50%');
});

test('percentage reads back as one percentage token with the value it was given', () => {
  const token = firstToken(percentage(-12.5)[1]);
  assert.equal(token[0], TokenType.Percentage);
  assert.equal(token[4].value, -12.5);
  assert.equal(token[1], '-12.5%');
});

test('percentage reads back an integer-valued percentage as the value it was given', () => {
  assert.equal(firstToken(percentage(100)[1])[4].value, 100);
});

test('percentage rejects a value that CSS cannot write', () => {
  assert.throws(() => percentage(Number.POSITIVE_INFINITY), RangeError);
});

/**
 * The tokenizer writes `signCharacter` even when it is undefined; constructors
 * leave the key out instead.
 *
 * @param {object} data
 */
function withoutUndefined(data) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );
}

test('numeric reads back as the token the tokenizer reads from its text', () => {
  const spellings = [
    '1',
    '-0',
    '+1',
    '.5',
    '-.5e2',
    '1e3',
    '1E-3',
    '+1e+3',
    '1.0',
  ];
  const units = ['', '%', 'px', 'PX', 'e3', '-', '--'];
  for (const spelling of spellings) {
    for (const unit of units) {
      const token = numeric(spelling, unit);
      const read = firstToken(token[1]);
      assert.equal(read[0], token[0], `${spelling}${unit}: type`);
      assert.equal(read[1], token[1], `${spelling}${unit}: text`);
      assert.deepEqual(
        withoutUndefined(read[4]),
        token[4],
        `${spelling}${unit}: data`
      );
    }
  }
});

test("numeric keeps the representation it was given as the number's text", () => {
  const token = numeric('+1.50e1');
  assert.equal(token[1], '+1.50e1');
  assert.equal(token[4].value, 15);
  assert.equal(token[4].type, NumberType.Number);
});

test('numeric escapes a unit the tokenizer would read as an exponent', () => {
  assert.equal(numeric('1', 'e3')[1], '1\\65 3');
  assert.equal(numeric('1', 'E-3')[1], '1\\45 -3');
  assert.equal(firstToken(numeric('1', 'e3')[1])[4].unit, 'e3');
});

test('numeric rejects a representation that is not a CSS number', () => {
  for (const representation of [
    '',
    '1.',
    'e3',
    '1e',
    'Infinity',
    '.',
    '+',
    '1e+',
    '1.e3',
  ]) {
    assert.throws(() => numeric(representation), RangeError, representation);
  }
});

test('integer sets the sign character of a negative value, as the tokenizer does', () => {
  assert.equal(integer(-3)[1], '-3');
  assert.equal(firstToken(integer(-3)[1])[4].signCharacter, '-');
  assert.equal(integer(3)[4].signCharacter, undefined);
});

test('stringToken reads back as the string token the tokenizer reads from its text', () => {
  const cases = [
    ['"abc"', 'abc'],
    ["'a\\'b'", "a'b"],
    ['"a\\"b"', 'a"b'],
    ['"\\61 "', 'a'],
  ];
  for (const [text, value] of cases) {
    const read = firstToken(text);
    const built = stringToken(text, value);
    assert.deepEqual(
      [built[0], built[1], built[4]],
      [read[0], read[1], read[4]],
      text
    );
  }
});

test('stringToken rejects text that is not a quoted CSS string', () => {
  for (const text of ['abc', '"abc', '\'abc"', '', '"']) {
    assert.throws(() => stringToken(text, ''), RangeError, text);
  }
});

test('whitespace reads back as the whitespace token the tokenizer reads from its text', () => {
  const token = firstToken(whitespace()[1]);
  assert.deepEqual(
    [token[0], token[1], token[4]],
    [TokenType.Whitespace, ' ', undefined]
  );
});
