import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  firstListedSet,
  pairListTextLength,
} from '../../../src/merge/rules/sharedRuleGroup.js';

// A selector's text length is its id, so any id list has a known length.
const tokenLists = /** @type {any} */ ({
  textLength: (/** @type {number} */ id) => id,
});

/**
 * @param {number[]} first
 * @param {number[]} second
 * @return {number}
 */
function lengthOf(first, second) {
  const firstRule = /** @type {any} */ ({ selectorIds: first });
  return pairListTextLength(
    tokenLists,
    firstRule,
    /** @type {any} */ ({ selectorIds: second }),
    firstListedSet(firstRule)
  );
}

const range = (/** @type {number} */ from, /** @type {number} */ count) =>
  Array.from({ length: count }, (_, i) => from + i);

// Expected lengths are the ids summed plus one comma between selectors:
// shared selector once is `3,4,5` (12 + 2 commas).

test('pairListTextLength should count a selector both rules list once', () => {
  assert.equal(lengthOf([3, 4], [4, 5]), 14);
});

test('pairListTextLength should count disjoint rules in full', () => {
  assert.equal(lengthOf([3], [4]), 8);
});

test('pairListTextLength should keep a selector the second rule repeats when the first lacks it', () => {
  assert.equal(lengthOf([3], [4, 4]), 13);
});

test('pairListTextLength should drop every copy of a selector the first rule lists', () => {
  assert.equal(lengthOf([3, 3], [3, 5]), 13);
});

test('pairListTextLength should agree on long lists that overlap', () => {
  assert.equal(lengthOf(range(1, 200), range(150, 200)), 61423);
});
