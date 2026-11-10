import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RuleRecord } from '../../../../../src/passes/merge/lib/rules/ruleRecord.js';
import { SelectorIds } from '../../../../../src/passes/ir/selectorIds.js';
import { elementKeyOfIds, selectorIdsOf } from './selectorIdsOf.js';

// The element keys of a rule, as its selector list adds and absorbs them.
const selectorIds = new SelectorIds();
const keyOf = elementKeyOfIds(selectorIds);
const lookup = () => ({});

/** A record of `selectors`, with the ids of this file's interner. */
const ruleOf = (selectors, selector) =>
  new RuleRecord(selectors, selector, selectorIdsOf(selectorIds, selectors));

test('elementKeys should list the distinct element of each selector', () => {
  const record = ruleOf(['div h1', 'h1', 'p']);
  assert.deepEqual(record.elementKeys(keyOf), ['h1', 'p']);
});

test('elementKeys should be null when a selector has no element key since it could match any element', () => {
  const record = ruleOf(['h1', '.a']);
  assert.equal(record.elementKeys(keyOf), null);
});

test('elementKeys should be null for a rule without selectors since an empty key list would claim the rule writes to no element', () => {
  const record = ruleOf([]);
  assert.equal(record.elementKeys(keyOf), null);
});

test('addSelectors should add the elements of the new selectors to the element keys', () => {
  const record = ruleOf(['h1']);
  record.elementKeys(keyOf);
  record.addSelectors(
    ['p', 'h1'],
    selectorIdsOf(selectorIds, ['p', 'h1']),
    lookup,
    keyOf
  );
  assert.deepEqual(record.elementKeys(keyOf), ['h1', 'p']);
});

test('addSelectors should make the element keys null when a new selector has no element key', () => {
  const record = ruleOf(['h1']);
  record.elementKeys(keyOf);
  record.addSelectors(
    ['.a'],
    selectorIdsOf(selectorIds, ['.a']),
    lookup,
    keyOf
  );
  assert.equal(record.elementKeys(keyOf), null);
});

test('addSelectors should keep null element keys since later selectors cannot restore a key', () => {
  const record = ruleOf(['.a']);
  record.elementKeys(keyOf);
  record.addSelectors(
    ['h1'],
    selectorIdsOf(selectorIds, ['h1']),
    lookup,
    keyOf
  );
  assert.equal(record.elementKeys(keyOf), null);
});

test('addSelectors should leave element keys derivable when they were never read', () => {
  const record = ruleOf(['h1']);
  record.addSelectors(['p'], selectorIdsOf(selectorIds, ['p']), lookup, keyOf);
  assert.deepEqual(record.elementKeys(keyOf), ['h1', 'p']);
});

test('absorbEarlier should put the elements of both rules in the element keys', () => {
  const record = ruleOf(['p']);
  const earlier = ruleOf(['h1']);
  record.elementKeys(keyOf);
  earlier.elementKeys(keyOf);
  record.absorbEarlier(earlier, lookup, keyOf);
  assert.deepEqual(record.elementKeys(keyOf)?.toSorted(), ['h1', 'p']);
});

test('absorbEarlier should make the element keys null when the earlier rule has an unknown element', () => {
  const record = ruleOf(['p']);
  const earlier = ruleOf(['.a']);
  earlier.elementKeys(keyOf);
  record.absorbEarlier(earlier, lookup, keyOf);
  assert.equal(record.elementKeys(keyOf), null);
});

test('absorbEarlier should make the element keys null when this rule has an unknown element', () => {
  const record = ruleOf(['.a']);
  const earlier = ruleOf(['h1']);
  earlier.elementKeys(keyOf);
  record.absorbEarlier(earlier, lookup, keyOf);
  assert.equal(record.elementKeys(keyOf), null);
});

test('addSelectors should return the element keys the new selectors add', () => {
  const record = ruleOf(['h1']);
  record.elementKeys(keyOf);
  assert.deepEqual(
    record.addSelectors(
      ['p', 'h1', 'em'],
      selectorIdsOf(selectorIds, ['p', 'h1', 'em']),
      lookup,
      keyOf
    ),
    ['p', 'em']
  );
});

test('addSelectors should return no element keys when the new selectors add none', () => {
  const record = ruleOf(['h1']);
  record.elementKeys(keyOf);
  assert.deepEqual(
    record.addSelectors(
      ['h1'],
      selectorIdsOf(selectorIds, ['h1']),
      lookup,
      keyOf
    ),
    []
  );
});

test('addSelectors should return null when a new selector has no element key, since its writes may reach any element', () => {
  const record = ruleOf(['h1']);
  record.elementKeys(keyOf);
  assert.equal(
    record.addSelectors(
      ['.a'],
      selectorIdsOf(selectorIds, ['.a']),
      lookup,
      keyOf
    ),
    null
  );
});

test('addSelectors should return null when the element keys were never read, since none are listed to extend', () => {
  const record = ruleOf(['h1']);
  assert.equal(
    record.addSelectors(
      ['p'],
      selectorIdsOf(selectorIds, ['p']),
      lookup,
      keyOf
    ),
    null
  );
});
