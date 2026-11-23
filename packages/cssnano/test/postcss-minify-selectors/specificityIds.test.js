import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseVerified } from './checkedArena.js';

/**
 * @param {string} selector
 * @return {number[]} the specificity ids of the compounds, in document order
 */
function compoundIdsOf(selector) {
  return parseVerified(selector)
    .nodes.filter(({ kind }) => kind === 'compound')
    .map((node) => node.specificityId);
}

test('the zero specificity interns as id 0', () => {
  assert.deepEqual(compoundIdsOf('*'), [0]);
});

test('specificity ids are dense and numbered in first-seen order', () => {
  // `.a` is 0,1,0 first, `#id` 1,0,0 second, and `*` is 0,0,0, which keeps id 0.
  assert.deepEqual(compoundIdsOf('.a,#id,.b,*,div'), [1, 2, 1, 0, 3]);
});
