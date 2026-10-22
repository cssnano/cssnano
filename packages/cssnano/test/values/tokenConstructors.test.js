import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, NumberType, TokenType } from '@csstools/css-tokenizer';
import {
  dimension,
  ident,
  integer,
  number,
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

test('number gives an integer-valued number the type its text tokenizes to', () => {
  assert.equal(firstToken(number(3)[1])[4].type, number(3)[4].type);
});

test('number gives a fraction the number type', () => {
  assert.equal(number(0.5)[4].type, NumberType.Number);
});

test('number reads back as the value it was given', () => {
  assert.equal(firstToken(number(-0.25)[1])[4].value, -0.25);
});

test('number reads back exponent notation as the value it was given', () => {
  assert.equal(firstToken(number(1e21)[1])[4].value, 1e21);
});

test('number rejects a value that CSS cannot write', () => {
  assert.throws(() => number(Number.NaN), RangeError);
});

test('dimension reads back as a dimension with the unit it was given', () => {
  assert.equal(firstToken(dimension(10, 'px')[1])[4].unit, 'px');
});

test('dimension reads back as the number it was given', () => {
  assert.equal(firstToken(dimension(10, 'px')[1])[4].value, 10);
});

test('dimension escapes a unit that would read as an exponent', () => {
  assert.equal(firstToken(dimension(1, 'e5')[1])[4].unit, 'e5');
});

test('dimension leaves a unit that starts with e but no exponent unescaped', () => {
  assert.equal(dimension(1, 'em')[1], '1em');
});

test('whitespace gives a whitespace token', () => {
  assert.equal(whitespace()[0], TokenType.Whitespace);
});

test('whitespace writes a single space', () => {
  assert.equal(whitespace()[1], ' ');
});
