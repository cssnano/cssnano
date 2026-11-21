import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isUnresolved } from '../../src/ir/unresolved.js';
import { tokens } from '../../src/utils/value.js';

/** @param {string} value @return {boolean} */
function unresolved(value) {
  const list = tokens(value);
  return isUnresolved(list, 0, list.length);
}

test('isUnresolved lets var() stand for any longhand component', () => {
  assert.equal(unresolved('var(--x)'), true);
});

// A browser without custom functions rejects `--f()`, so a shorthand merged
// around it would lose every longhand instead of one.
test('isUnresolved does not let a custom function stand for a longhand component', () => {
  assert.equal(unresolved('--f(1)'), false);
});

// `inherit()` is not CSS a browser accepts yet, so it must not join a shorthand.
test('isUnresolved does not let inherit() stand for a longhand component', () => {
  assert.equal(unresolved('inherit(--x)'), false);
});
