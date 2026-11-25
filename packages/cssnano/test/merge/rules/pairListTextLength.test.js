import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  firstListedSet,
  pairListTextLength,
  pairSelectorIds,
} from '../../../src/merge/rules/sharedRuleGroup.js';
import { listTextLength } from '../../../src/ir/selectorReads.js';

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

/**
 * @param {number[]} first
 * @param {number[]} second
 * @return {number}
 */
function expectedOf(first, second) {
  const firstRule = /** @type {any} */ ({ selectorIds: first });
  const ids = pairSelectorIds(
    firstRule,
    /** @type {any} */ ({ selectorIds: second }),
    firstListedSet(firstRule)
  );
  return listTextLength(tokenLists, ids);
}

const range = (/** @type {number} */ from, /** @type {number} */ count) =>
  Array.from({ length: count }, (_, i) => from + i);

test('pairListTextLength should count a selector both rules list once', () => {
  assert.equal(lengthOf([3, 4], [4, 5]), expectedOf([3, 4], [4, 5]));
});

test('pairListTextLength should count disjoint rules in full', () => {
  assert.equal(lengthOf([3], [4]), expectedOf([3], [4]));
});

test('pairListTextLength should keep a selector the second rule repeats when the first lacks it', () => {
  assert.equal(lengthOf([3], [4, 4]), expectedOf([3], [4, 4]));
});

test('pairListTextLength should drop every copy of a selector the first rule lists', () => {
  assert.equal(lengthOf([3, 3], [3, 5]), expectedOf([3, 3], [3, 5]));
});

test('pairListTextLength should agree on long lists that overlap', () => {
  const first = range(1, 200);
  const second = range(150, 200);
  assert.equal(lengthOf(first, second), expectedOf(first, second));
});
