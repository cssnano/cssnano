import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isConflictingProp } from '../../../../../script/passes/ir/lib/propertyRelations.js';
import {
  Claims,
  WritePositions,
} from '../../../../../src/passes/merge/lib/rules/writePositions.js';
import { keysOfName } from '../../../../../src/passes/ir/propertyTable.js';

/** The keys of a property name, as a write index takes them. */
const keys = (prop) => keysOfName(prop);

/**
 * An index holding one write per entry of `writes`, at that entry's position.
 *
 * @param {string[]} writes
 * @return {WritePositions}
 */
function indexOf(writes) {
  const index = new WritePositions();
  for (const [position, prop] of writes.entries()) {
    index.record(keys(prop), position);
  }
  return index;
}

/**
 * A claimer that has claimed the positions of `claimed`.
 *
 * @param {Iterable<number>} claimed
 * @return {Claims}
 */
function claimsOf(claimed) {
  const claims = new Claims();
  for (const position of claimed) claims.claimed.add(position);
  return claims;
}

// Claims only grow over the life of an index, so each claimed set below has an
// index of its own, shared by every query that uses it.

test('write positions give the earliest of several conflicting writes, skipping claimed ones', () => {
  const writes = ['margin-top', 'color', 'margin', 'width', 'margin-left'];
  const queries = ['margin-left', 'margin-inline-start', 'color', 'width'];
  for (const claimed of [new Set(), new Set([0]), new Set([0, 2])]) {
    const index = indexOf(writes);
    for (const queried of queries) {
      const expected = writes.findIndex(
        (written, position) =>
          !claimed.has(position) && isConflictingProp(queried, written)
      );
      assert.strictEqual(
        index.firstUnclaimed(keys(queried), claimsOf(claimed)),
        expected,
        `${queried}, claimed ${[...claimed]}`
      );
    }
  }
});

test('write positions give the position of a custom property write only when its name matches exactly', () => {
  const index = indexOf(['--Foo', '--foo']);
  assert.strictEqual(index.firstUnclaimed(keys('--foo'), claimsOf([])), 1);
  assert.strictEqual(index.firstUnclaimed(keys('--Foo'), claimsOf([])), 0);
  assert.strictEqual(index.firstUnclaimed(keys('--Foo'), claimsOf([0])), -1);
});

test('write positions skip claimed writes and report none once every conflicting write is claimed', () => {
  // margin-top sets a different physical side from margin-left, so it is not
  // a conflict and the answer is the margin-left write at position 2.
  const writes = ['margin', 'margin-top', 'margin-left'];
  assert.strictEqual(
    indexOf(writes).firstUnclaimed(keys('margin-left'), claimsOf([0])),
    2
  );
  assert.strictEqual(
    indexOf(writes).firstUnclaimed(keys('margin-left'), claimsOf([0, 2])),
    -1
  );
});

test('write positions refuse to answer for all, which the caller rejects first', () => {
  assert.throws(
    () => new WritePositions().firstUnclaimed(keys('all'), claimsOf([])),
    RangeError
  );
});

test('firstUnclaimed should restart its cursor when a new claimer reads the same lists', () => {
  const index = indexOf(['color', 'color', 'color']);
  assert.strictEqual(index.firstUnclaimed(keys('color'), claimsOf([0, 1])), 2);
  assert.strictEqual(index.firstUnclaimed(keys('color'), claimsOf([])), 0);
});
