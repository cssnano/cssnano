import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SelectorIds } from '../../../../../src/passes/ir/selectorIds.js';
import {
  absorbEarlier,
  addSelectors,
} from '../../../../../src/passes/merge/lib/rules/selectorList.js';
import { elementKeysOf } from '../../../../../src/passes/merge/lib/rules/selectorReads.js';
import { foldedRules } from './summaryFixtures.js';
import { selectorIdsOf } from './selectorIdsOf.js';

const browsers = ['chrome 120'];

/**
 * Adds `selectors` to the rule at `index`, as the merge does, and returns the
 * element keys they add.
 *
 * @param {ReturnType<typeof foldedRules>} folded
 * @param {number} index
 * @param {string[]} selectors
 */
function add(folded, index, selectors) {
  const { state, records } = folded;
  const ids = selectorIdsOf(new SelectorIds(), state.tokenLists, selectors);
  return addSelectors(records, index, ids, state.tokenLists, browsers);
}

test('elementKeysOf should list the distinct element of each selector', () => {
  const { records, rules } = foldedRules('div h1,h1,p{}');
  assert.deepEqual(elementKeysOf(records, rules[0]), ['h1', 'p']);
});

test('elementKeysOf should be null when a selector has no element key since it could match any element', () => {
  const { records, rules } = foldedRules('h1,.a{}');
  assert.equal(elementKeysOf(records, rules[0]), null);
});

test('addSelectors should add the elements of the new selectors to the element keys', () => {
  const folded = foldedRules('h1{}');
  add(folded, folded.rules[0], ['p', 'h1']);
  assert.deepEqual(elementKeysOf(folded.records, folded.rules[0]), ['h1', 'p']);
});

test('addSelectors should make the element keys null when a new selector has no element key', () => {
  const folded = foldedRules('h1{}');
  add(folded, folded.rules[0], ['.a']);
  assert.equal(elementKeysOf(folded.records, folded.rules[0]), null);
});

test('addSelectors should keep null element keys since later selectors cannot restore a key', () => {
  const folded = foldedRules('.a{}');
  add(folded, folded.rules[0], ['h1']);
  assert.equal(elementKeysOf(folded.records, folded.rules[0]), null);
});

test('absorbEarlier should put the elements of both rules in the element keys, earlier first', () => {
  const { records, rules } = foldedRules('h1{}p{}');
  absorbEarlier(records, rules[1], rules[0]);
  assert.deepEqual(elementKeysOf(records, rules[1]), ['h1', 'p']);
});

test('absorbEarlier should make the element keys null when the earlier rule has an unknown element', () => {
  const { records, rules } = foldedRules('.a{}p{}');
  absorbEarlier(records, rules[1], rules[0]);
  assert.equal(elementKeysOf(records, rules[1]), null);
});

test('absorbEarlier should make the element keys null when this rule has an unknown element', () => {
  const { records, rules } = foldedRules('h1{}.a{}');
  absorbEarlier(records, rules[1], rules[0]);
  assert.equal(elementKeysOf(records, rules[1]), null);
});

test('addSelectors should return the element keys the new selectors add', () => {
  const folded = foldedRules('h1{}');
  assert.deepEqual(add(folded, folded.rules[0], ['p', 'h1', 'em']), [
    'p',
    'em',
  ]);
});

test('addSelectors should return no element keys when the new selectors add none', () => {
  const folded = foldedRules('h1{}');
  assert.deepEqual(add(folded, folded.rules[0], ['h1']), []);
});

test('addSelectors should return null when a new selector has no element key, since its writes may reach any element', () => {
  const folded = foldedRules('h1{}');
  assert.equal(add(folded, folded.rules[0], ['.a']), null);
});
