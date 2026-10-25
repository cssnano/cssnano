import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, TokenType } from '@csstools/css-tokenizer';
import {
  closeSquare,
  colon,
  openSquare,
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
