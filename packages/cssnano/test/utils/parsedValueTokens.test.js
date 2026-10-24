import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsedValueTokens } from '../../src/utils/parsedValueText.js';
import { tokens } from '../../src/utils/value.js';

/** @param {string} css the value as PostCSS gives it */
function parsedText(css) {
  return parsedValueTokens(tokens(css))
    .map((token) => token[1])
    .join('');
}

test('parsedValueTokens keeps a comment between two tokens, which PostCSS keeps', () => {
  assert.equal(parsedText('a/*x*/b'), 'a/*x*/b');
});

test('parsedValueTokens drops a comment after a space', () => {
  assert.equal(parsedText('a /*x*/b'), 'a b');
});

test('parsedValueTokens drops a comment before a space', () => {
  assert.equal(parsedText('a/*x*/ b'), 'a b');
});

test('parsedValueTokens drops a comment that follows a comma', () => {
  assert.equal(parsedText('a,/*x*/b'), 'a,b');
});

test('parsedValueTokens returns the tokens it keeps as a list the caller can edit', () => {
  const input = tokens('a b');
  assert.deepEqual(parsedValueTokens(input), input);
});
