import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TokenLists } from '../../../src/passes/ir/tokenLists.js';
import { tokens as tokenize } from '../../../src/utils/value.js';
import { tokensText } from '../../../src/values/tokensText.js';

// Values with a comment, a string, an escape, a CRLF and a NUL, where the
// token text is the most likely to differ from the value's length.
const texts = ['1px /* c */ 2px', '"a\\"b"', 'a\\31 b', 'x\r\ny', 'a\u0000b'];

test('textLength of a pushed list is the length of the text its tokens spell', () => {
  const lists = new TokenLists();
  for (const text of texts) {
    const id = lists.push(tokenize(text));
    assert.strictEqual(
      lists.textLength(id),
      tokensText(lists.get(id)).length,
      `textLength for ${JSON.stringify(text)}`
    );
  }
});

test('textLength of an earlier list is unchanged by a later push', () => {
  const lists = new TokenLists();
  const first = lists.push(tokenize('10px'));
  lists.push(tokenize('a longer value'));
  assert.strictEqual(lists.textLength(first), '10px'.length);
});
