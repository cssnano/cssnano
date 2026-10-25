import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, TokenType } from '@csstools/css-tokenizer';
import {
  closeParen,
  closeSquare,
  colon,
  comma,
  delim,
  openSquare,
  whitespace,
} from '../../src/values/punctuationTokens.js';

/**
 * The first token that the tokenizer reads from `text`.
 *
 * @param {string} text
 */
function firstToken(text) {
  return tokenize({ css: text })[0];
}

test('colon reads back as the colon token the tokenizer reads from its text', () => {
  const token = firstToken(colon()[1]);
  assert.deepEqual(
    [token[0], token[1], token[4]],
    [TokenType.Colon, ':', undefined]
  );
});

test('openSquare reads back as the open-square token the tokenizer reads from its text', () => {
  const token = firstToken(openSquare()[1]);
  assert.deepEqual(
    [token[0], token[1], token[4]],
    [TokenType.OpenSquare, '[', undefined]
  );
});

test('closeSquare reads back as the close-square token the tokenizer reads from its text', () => {
  const token = firstToken(closeSquare()[1]);
  assert.deepEqual(
    [token[0], token[1], token[4]],
    [TokenType.CloseSquare, ']', undefined]
  );
});

test('whitespace reads back as the whitespace token the tokenizer reads from its text', () => {
  const token = firstToken(whitespace()[1]);
  assert.deepEqual(
    [token[0], token[1], token[4]],
    [TokenType.Whitespace, ' ', undefined]
  );
});

test('closeParen reads back as the close-parenthesis token', () => {
  assert.equal(firstToken(closeParen()[1])[0], TokenType.CloseParen);
  assert.equal(closeParen()[1], ')');
});

test('comma reads back as the comma token', () => {
  const built = comma();
  const [read] = tokenize({ css: built[1] });
  assert.deepEqual([built[0], built[1]], [read[0], read[1]]);
  assert.equal(built[0], TokenType.Comma);
});

test('delim reads back as the delim token of the character it is given', () => {
  const built = delim('/');
  const [read] = tokenize({ css: built[1] });
  assert.deepEqual([built[0], built[1]], [read[0], read[1]]);
  assert.equal(built[0], TokenType.Delim);
});

test('delim rejects text that is not one character, which no delim token has', () => {
  assert.throws(() => delim('//'), RangeError);
  assert.throws(() => delim(''), RangeError);
});
