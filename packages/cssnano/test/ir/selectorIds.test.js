import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TokenLists } from '../../src/ir/tokenLists.js';
import { SelectorIds } from '../../src/ir/selectorIds.js';
import { tokens as tokenize } from '../../src/utils/value.js';

// A list item that ends in a backslash before a newline is tokenized with that
// newline, as the rule's source has it.
function listTokensEndingInBackslash(text) {
  const tokens = tokenize(text + '\n');
  tokens.pop();
  return tokens;
}

test('a selector whose text ends in a newline does not take the id of a list item ending in a backslash', () => {
  const lists = new TokenLists();
  const ids = new SelectorIds();
  const selectorId = ids.idOf(lists, '.a\\\n', tokenize('.b'));
  const [itemId] = ids.idsOfList(lists, listTokensEndingInBackslash('.a\\'));
  assert.notEqual(itemId, selectorId);
});

test('the same list item ending in a backslash gets one id on its second use', () => {
  const lists = new TokenLists();
  const ids = new SelectorIds();
  const [first] = ids.idsOfList(lists, listTokensEndingInBackslash('.a\\'));
  const [second] = ids.idsOfList(lists, listTokensEndingInBackslash('.a\\'));
  assert.equal(second, first);
});
