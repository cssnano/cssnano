import test from 'node:test';
import assert from 'node:assert/strict';
import { rewrite, tokens, TokenType } from '../src/lib/value.js';

test('rewrite serializes supplied tokenizer edits in source order', () => {
  const parsed = tokens('a b');
  const result = rewrite(
    'a b',
    (token) =>
      token[0] === TokenType.Ident ? token[4].value.toUpperCase() : undefined,
    undefined,
    parsed
  );
  assert.equal(result, 'A B');
});
