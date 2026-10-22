import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TokenType } from '@csstools/css-tokenizer';
import { ValueTable } from '../../src/values/value.js';
import { ValueBuffer } from '../../src/values/valueBuffer.js';
import { ident, whitespace } from '../../src/values/tokenConstructors.js';

/**
 * A buffer over `text`, with the table that interns its results.
 *
 * @param {string} text
 */
function bufferOf(text) {
  const table = new ValueTable();
  const value = table.intern(text);
  return { table, value, buffer: new ValueBuffer(value, table) };
}

test('ValueBuffer.text returns the source text before any edit', () => {
  assert.equal(bufferOf('a b').buffer.text(), 'a b');
});

test('ValueBuffer.tokens returns the source Value tokens before any edit', () => {
  const { buffer, value } = bufferOf('a b');
  assert.equal(buffer.tokens(), value.tokens());
});

test('ValueBuffer.structure returns the source Value structure before any edit', () => {
  const { buffer, value } = bufferOf('f(a)');
  assert.equal(buffer.structure(), value.structure());
});

test('ValueBuffer.finish returns the input Value when nothing was edited', () => {
  const { buffer, value } = bufferOf('a b');
  assert.equal(buffer.finish(), value);
});

test('ValueBuffer.replace makes text reflect the replacement', () => {
  const { buffer } = bufferOf('a b');
  buffer.replace(2, 3, [ident('c')]);
  assert.equal(buffer.text(), 'a c');
});

test('ValueBuffer.replace leaves the input Value unchanged', () => {
  const { buffer, value } = bufferOf('a b');
  buffer.replace(2, 3, [ident('c')]);
  assert.equal(value.text, 'a b');
});

test('ValueBuffer.replace leaves the input Value tokens unchanged', () => {
  const { buffer, value } = bufferOf('a b');
  const before = value.tokens().length;
  buffer.replace(2, 3, [ident('c')]);
  assert.equal(value.tokens().length, before);
});

test('ValueBuffer.replace removes tokens when given no replacement', () => {
  const { buffer } = bufferOf('a b');
  buffer.replace(1, 2, []);
  assert.equal(buffer.text(), 'ab');
});

test('ValueBuffer.replace applies edits given from last to first', () => {
  const { buffer } = bufferOf('a b c');
  buffer.replace(4, 5, [ident('d')]);
  buffer.replace(0, 1, [ident('x')]);
  assert.equal(buffer.text(), 'x b d');
});

test('ValueBuffer.replace makes the structure undefined when the edit unbalances the brackets', () => {
  const { buffer } = bufferOf('f(a)');
  buffer.replace(2, 3, [ident('x')]);
  assert.equal(buffer.structure(), undefined);
});

test('ValueBuffer.replaceText makes tokens retokenize the new text', () => {
  const { buffer } = bufferOf('a b');
  buffer.replaceText('c d');
  assert.deepEqual(
    buffer.tokens().map((token) => token[0]),
    [TokenType.Ident, TokenType.Whitespace, TokenType.Ident]
  );
});

test('ValueBuffer.replaceText makes text return the new text', () => {
  const { buffer } = bufferOf('a b');
  buffer.replaceText('c d');
  assert.equal(buffer.text(), 'c d');
});

test('ValueBuffer.finish interns the serialized text of an edited buffer', () => {
  const { buffer, table } = bufferOf('a b');
  buffer.replace(2, 3, [ident('c')]);
  assert.equal(buffer.finish(), table.intern('a c'));
});

test('ValueBuffer.finish gives the input Value when edits leave the text unchanged', () => {
  const { buffer, value } = bufferOf('a b');
  buffer.replace(2, 3, [ident('b')]);
  assert.equal(buffer.finish(), value);
});

test('ValueBuffer.finish keeps the text of several edits in their source order', () => {
  const { buffer } = bufferOf('a b');
  buffer.replace(1, 2, [whitespace()]);
  buffer.replace(0, 1, [ident('z')]);
  assert.equal(buffer.finish().text, 'z b');
});
