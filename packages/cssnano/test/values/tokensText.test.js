import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokensText } from '../../src/values/tokensText.js';
import { tokens } from '../../src/utils/value.js';

test('tokensText spells the text of a token list with escapes, strings and comments', () => {
  const text = String.raw`a\ b "c\"d" /* e */ f`;
  assert.equal(tokensText(tokens(text)), text);
});
