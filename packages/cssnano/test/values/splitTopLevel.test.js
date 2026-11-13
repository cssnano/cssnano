import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitComma, splitSpace } from '../../src/values/splitTopLevel.js';

test('splitSpace splits a value at whitespace outside parentheses', () => {
  assert.deepEqual(splitSpace('1px  calc(1px + 2px)\t3px'), [
    '1px',
    'calc(1px + 2px)',
    '3px',
  ]);
});

test('splitSpace treats a carriage return and a form feed as whitespace', () => {
  assert.deepEqual(splitSpace('a\rb\fc'), ['a', 'b', 'c']);
});

test('splitSpace keeps whitespace inside a string in one component', () => {
  assert.deepEqual(splitSpace('"a b" c'), ['"a b"', 'c']);
});

test('splitSpace keeps an escaped space in the identifier it belongs to', () => {
  assert.deepEqual(splitSpace(String.raw`a\ b c`), [String.raw`a\ b`, 'c']);
});

test('splitSpace keeps whitespace inside a comment in one component', () => {
  assert.deepEqual(splitSpace('a /* b c */ d'), ['a', '/* b c */', 'd']);
});

test('splitSpace does not open a negative depth on a stray close parenthesis', () => {
  assert.deepEqual(splitSpace(') a b'), [')', 'a', 'b']);
});

test('splitSpace returns no component for blank text', () => {
  assert.deepEqual(splitSpace(' \n '), []);
});

test('splitComma splits at commas outside parentheses and trims each part', () => {
  assert.deepEqual(splitComma('a , rgb(1,2,3),b'), ['a', 'rgb(1,2,3)', 'b']);
});

test('splitComma keeps a comma inside a string', () => {
  assert.deepEqual(splitComma('"a,b", c'), ['"a,b"', 'c']);
});

test('splitComma keeps an escaped comma in its identifier', () => {
  assert.deepEqual(splitComma(String.raw`a\,b, c`), [String.raw`a\,b`, 'c']);
});

test('splitComma keeps a space-separated part whole', () => {
  assert.deepEqual(splitComma('a b, c d'), ['a b', 'c d']);
});

test('splitComma drops empty parts', () => {
  assert.deepEqual(splitComma('a,,b,'), ['a', 'b']);
});

test('splitSpace and splitComma split text without strings, escapes, comments or functions as the tokens would', () => {
  for (const text of ['a b,c', ' a ,, b c ', 'a\tb\nc', ',', '']) {
    assert.deepEqual(splitSpace(`${text}/**/`.slice(0, -4)), splitSpace(text));
  }
  assert.deepEqual(splitComma(' a ,, b c '), ['a', 'b c']);
});
