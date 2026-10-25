import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tokenize,
  HashType,
  NumberType,
  TokenType,
} from '@csstools/css-tokenizer';
import {
  func,
  hash,
  hashWithText,
  ident,
  identifierWithText,
  integer,
  numeric,
  percentage,
  stringToken,
  url,
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

test('func gives a function token whose text opens the name', () => {
  assert.equal(func('steps')[1], 'steps(');
});

test('func reads back as the function token the tokenizer reads from its text', () => {
  const token = firstToken(func('steps')[1]);
  assert.equal(token[0], TokenType.Function);
  assert.equal(token[4].value, 'steps');
});

test('func escapes its name as an identifier does, so the name reads back', () => {
  assert.equal(firstToken(func('1a')[1])[4].value, '1a');
});

test('func rejects an empty name, which no function token can have', () => {
  assert.throws(() => func(''), RangeError);
});

test('hash gives a hash token whose text opens with the hash sign', () => {
  assert.equal(hash('abc')[1], '#abc');
});

test('hash reads back as the hash token the tokenizer reads from its text', () => {
  const token = firstToken(hash('ff0080')[1]);
  assert.equal(token[0], TokenType.Hash);
  assert.equal(token[4].value, 'ff0080');
});

test('hash flags a name that starts with a letter as an id', () => {
  assert.equal(firstToken(hash('abc')[1])[4].type, HashType.ID);
  assert.equal(hash('abc')[4].type, HashType.ID);
});

test('hash flags a name that starts with a digit as unrestricted', () => {
  assert.equal(firstToken(hash('123')[1])[4].type, HashType.Unrestricted);
  assert.equal(hash('123')[4].type, HashType.Unrestricted);
});

test('hash flags a hyphen before a digit as unrestricted', () => {
  assert.equal(firstToken(hash('-1')[1])[4].type, HashType.Unrestricted);
  assert.equal(hash('-1')[4].type, HashType.Unrestricted);
});

test('hash rejects an empty name, which no hash token can have', () => {
  assert.throws(() => hash(''), RangeError);
});

test('url reads back as the URL token the tokenizer reads from its text', () => {
  const built = url('x.png');
  const read = firstToken(built[1]);
  assert.deepEqual([built[0], built[1], built[4]], [read[0], read[1], read[4]]);
});

test('url escapes whitespace, quotes and parentheses in its value so the value reads back', () => {
  assert.equal(firstToken(url('a b(")\n')[1])[4].value, 'a b(")\n');
});

test('url writes the function name it is given, such as an upper-case URL', () => {
  assert.equal(url('x.png', 'URL')[1], 'URL(x.png)');
});

test('identifierWithText reads back as one identifier with the text and value it was given', () => {
  for (const [text, value] of [
    ['a\\ 1st', 'a 1st'],
    ['\\31 st', '1st'],
    ['\\ \\ lead', '  lead'],
    ['x\\3a ', 'x:'],
  ]) {
    const read = tokenize({ css: text });
    assert.equal(read.length, 2, `${text} reads as one token and EOF`);
    assert.equal(read[0][0], TokenType.Ident);
    assert.equal(read[0][1], text);
    assert.equal(read[0][4].value, value);
  }
});

test('hashWithText reads back as the hash token the tokenizer reads from its text', () => {
  for (const [text, value, type] of [
    ['#\\31x', '1x', 'id'],
    ['#a\\ b', 'a b', 'id'],
    ['#1x', '1x', 'unrestricted'],
  ]) {
    const token = hashWithText(text, value, type);
    const read = tokenize({ css: text });
    assert.equal(read.length, 2, `${text} reads as one token and EOF`);
    assert.deepEqual(
      [read[0][0], read[0][1], read[0][4]],
      [token[0], token[1], token[4]]
    );
  }
});

test('identifierWithText keeps the text it is given rather than rewriting it from the value', () => {
  assert.equal(identifierWithText('a\\ b', 'a b')[1], 'a\\ b');
});
