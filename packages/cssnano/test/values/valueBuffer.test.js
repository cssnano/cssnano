import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TokenType } from '@csstools/css-tokenizer';
import { ValueBuffer } from '../../src/values/valueBuffer.js';
import { ident } from '../../src/values/tokenConstructors.js';

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

test('ValueBuffer.replace accepts a replacement longer than the argument limit', () => {
  const count = 200_000;
  const buffer = new ValueBuffer('a');
  buffer.replace(
    0,
    1,
    Array.from({ length: count }, () => ident('b'))
  );
  assert.equal(buffer.tokens().length, count);
  assert.equal(buffer.text(), 'b'.repeat(count));
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

test('ValueBuffer.text returns the serialized text of an edited buffer', () => {
  const buffer = new ValueBuffer('a b');
  buffer.replace(2, 3, [ident('c')]);
  assert.equal(buffer.text(), 'a c');
});

test('ValueBuffer.text keeps the text of several edits in their source order', () => {
  const buffer = new ValueBuffer('a b');
  buffer.replace(1, 2, [ident('y')]);
  buffer.replace(0, 1, [ident('z')]);
  assert.equal(buffer.text(), 'zyb');
});

test('ValueBuffer.isEdited is false until an edit', () => {
  const buffer = new ValueBuffer('a b');
  buffer.tokens();
  assert.equal(buffer.isEdited(), false);
  buffer.replace(0, 1, [ident('x')]);
  assert.equal(buffer.isEdited(), true);
});

test('ValueBuffer.tokens reads a unicode-range value in the mode it was given', () => {
  const unicodeRangesAllowed = { unicodeRangesAllowed: true };
  assert.equal(
    new ValueBuffer('U+0-7F', unicodeRangesAllowed).tokens()[0][0],
    TokenType.UnicodeRange
  );
  assert.notEqual(
    new ValueBuffer('U+0-7F').tokens()[0][0],
    TokenType.UnicodeRange
  );
});

/**
 * @param {string} source
 * @param {{start: number, end: number, tokens: import('@csstools/css-tokenizer').CSSToken[]}[]} edits
 * @return {string}
 */
function textAfterSuccessiveReplaces(source, edits) {
  const buffer = new ValueBuffer(source);
  for (const edit of edits.toReversed()) {
    buffer.replace(edit.start, edit.end, edit.tokens);
  }
  return buffer.text();
}

test('ValueBuffer.replaceRanges applies ascending edits as successive replace calls from last to first would', () => {
  const source = 'a b c d';
  const cases = {
    'an empty edit list': [],
    'adjacent edits': [
      { start: 0, end: 1, tokens: [ident('x')] },
      { start: 1, end: 2, tokens: [ident('y')] },
    ],
    'edits at both ends': [
      { start: 0, end: 1, tokens: [ident('x')] },
      { start: 6, end: 7, tokens: [ident('y')] },
    ],
    'a deletion': [{ start: 1, end: 2, tokens: [] }],
    'an insertion between tokens': [{ start: 2, end: 2, tokens: [ident('z')] }],
  };
  for (const [name, edits] of Object.entries(cases)) {
    const buffer = new ValueBuffer(source);
    buffer.replaceRanges(edits);
    assert.equal(
      buffer.text(),
      textAfterSuccessiveReplaces(source, edits),
      name
    );
  }
});

test('ValueBuffer.replaceRanges gives the tokens after an edit their positions in the new text', () => {
  const buffer = new ValueBuffer('a bc d');
  buffer.replaceRanges([{ start: 0, end: 1, tokens: [ident('xyz')] }]);
  const last = buffer.tokens().at(-1);
  assert.equal(buffer.text().slice(last[2], last[3] + 1), 'd');
});

test('ValueBuffer.replace gives the tokens after an edit their positions in the new text', () => {
  const buffer = new ValueBuffer('a bc d');
  buffer.replace(0, 1, [ident('xyz')]);
  const last = buffer.tokens().at(-1);
  assert.equal(buffer.text().slice(last[2], last[3] + 1), 'd');
});
