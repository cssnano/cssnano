import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TokenType } from '@csstools/css-tokenizer';
import { ValueBuffer } from '../../src/values/valueBuffer.js';
import { ident, whitespace } from '../../src/values/tokenConstructors.js';

test('ValueBuffer.text returns the source text before any edit', () => {
  assert.equal(new ValueBuffer('a b').text(), 'a b');
});

test('ValueBuffer.tokens tokenizes the source text before any edit', () => {
  assert.deepEqual(
    new ValueBuffer('a b').tokens().map((token) => token[0]),
    [TokenType.Ident, TokenType.Whitespace, TokenType.Ident]
  );
});

test('ValueBuffer.tokens returns the same list until an edit', () => {
  const buffer = new ValueBuffer('a b');
  assert.equal(buffer.tokens(), buffer.tokens());
});

test('ValueBuffer.structure returns the bracket structure of the source before any edit', () => {
  assert.notEqual(new ValueBuffer('f(a)').structure(), undefined);
});

test('ValueBuffer.structure is undefined for an unclosed bracket in the source', () => {
  assert.equal(new ValueBuffer('f(a').structure(), undefined);
});

test('ValueBuffer.finish returns the source text when nothing was edited', () => {
  assert.equal(new ValueBuffer('a b').finish(), 'a b');
});

test('ValueBuffer.replace makes text reflect the replacement', () => {
  const buffer = new ValueBuffer('a b');
  buffer.replace(2, 3, [ident('c')]);
  assert.equal(buffer.text(), 'a c');
});

test('ValueBuffer.replace removes tokens when given no replacement', () => {
  const buffer = new ValueBuffer('a b');
  buffer.replace(1, 2, []);
  assert.equal(buffer.text(), 'ab');
});

test('ValueBuffer.replace applies edits given from last to first', () => {
  const buffer = new ValueBuffer('a b c');
  buffer.replace(4, 5, [ident('d')]);
  buffer.replace(0, 1, [ident('x')]);
  assert.equal(buffer.text(), 'x b d');
});

test('ValueBuffer.replace makes the structure undefined when the edit unbalances the brackets', () => {
  const buffer = new ValueBuffer('f(a)');
  buffer.replace(2, 3, [ident('x')]);
  assert.equal(buffer.structure(), undefined);
});

test('ValueBuffer.replaceText makes tokens retokenize the new text', () => {
  const buffer = new ValueBuffer('a b');
  buffer.replaceText('c d');
  assert.deepEqual(
    buffer.tokens().map((token) => token[0]),
    [TokenType.Ident, TokenType.Whitespace, TokenType.Ident]
  );
});

test('ValueBuffer.replaceText makes text return the new text', () => {
  const buffer = new ValueBuffer('a b');
  buffer.replaceText('c d');
  assert.equal(buffer.text(), 'c d');
});

test('ValueBuffer.finish returns the serialized text of an edited buffer', () => {
  const buffer = new ValueBuffer('a b');
  buffer.replace(2, 3, [ident('c')]);
  assert.equal(buffer.finish(), 'a c');
});

test('ValueBuffer.finish keeps the text of several edits in their source order', () => {
  const buffer = new ValueBuffer('a b');
  buffer.replace(1, 2, [whitespace()]);
  buffer.replace(0, 1, [ident('z')]);
  assert.equal(buffer.finish(), 'z b');
});
