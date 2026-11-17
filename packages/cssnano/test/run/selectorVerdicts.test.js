import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SelectorVerdicts } from '../../src/run/selectorVerdicts.js';
import { TokenLists } from '../../src/ir/tokenLists.js';
import { tokens as tokenize } from '../../src/utils/value.js';

/**
 * @param {string} selector
 * @return {{tokenLists: TokenLists, id: number}} the list that spells the selector, and its id
 */
function listOf(selector) {
  const tokenLists = new TokenLists();
  return { tokenLists, id: tokenLists.push(tokenize(selector)) };
}

test('isValid should reject a selector the parser rejects', () => {
  const { tokenLists, id } = listOf('.a>');
  assert.equal(new SelectorVerdicts().isValid(tokenLists, id), false);
});

test('isValid should accept a selector the parser accepts', () => {
  const { tokenLists, id } = listOf('.a');
  assert.equal(new SelectorVerdicts().isValid(tokenLists, id), true);
});

test('isValid should give the same verdict when asked again about an id', () => {
  const { tokenLists, id } = listOf('.a>');
  const verdicts = new SelectorVerdicts();
  assert.equal(verdicts.isValid(tokenLists, id), false);
  assert.equal(verdicts.isValid(tokenLists, id), false);
});
