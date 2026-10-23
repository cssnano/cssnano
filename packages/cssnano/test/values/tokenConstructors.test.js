import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, NumberType, TokenType } from '@csstools/css-tokenizer';
import {
  ident,
  integer,
  percentage,
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
