import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, TokenType } from '@csstools/css-tokenizer';
import { comma } from '../../src/values/listSeparators.js';

test('comma reads back as the comma token', () => {
  const built = comma();
  const [read] = tokenize({ css: built[1] });
  assert.deepEqual([built[0], built[1]], [read[0], read[1]]);
  assert.equal(built[0], TokenType.Comma);
});
