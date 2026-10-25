import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, TokenType } from '@csstools/css-tokenizer';
import { delim } from '../../src/values/delimToken.js';
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
