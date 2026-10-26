import assert from 'node:assert/strict';
import { test } from 'node:test';
import { joinRanges } from '../../src/values/joinRanges.js';
import { selectorRanges } from '../../src/values/selectorRanges.js';
import { tokensText } from '../../src/values/tokensText.js';
import { comma } from '../../src/values/punctuationTokens.js';
import { tokens } from '../../src/utils/value.js';

/** The whole list of a text as one piece. */
function pieceOf(text) {
  const list = tokens(text);
  return { list, start: 0, end: list.length };
}

test('joinRanges keeps a token whose position is unchanged and copies one whose position moved', () => {
  const first = pieceOf('a');
  const second = pieceOf('b');
  const joined = joinRanges([first, second], [comma()]);
  assert.equal(tokensText(joined), 'a,b');
  assert.equal(joined[0], first.list[0]);
  assert.notEqual(joined[2], second.list[0]);
  assert.equal(joined[2][2], 2);
  assert.equal(second.list[0][2], 0);
});

test('joinRanges spells the pieces it is given in order, with the separator between them', () => {
  const pieces = [pieceOf('.a'), pieceOf('.b .c'), pieceOf('d')];
  const joined = joinRanges(pieces, [comma()]);
  assert.equal(tokensText(joined), '.a,.b .c,d');
});

test('joinRanges joins only the tokens within each piece range', () => {
  const list = tokens('x, .a, y');
  const [, middle] = selectorRanges(list);
  const joined = joinRanges([{ list, ...middle }], [comma()]);
  assert.equal(tokensText(joined), '.a');
});
