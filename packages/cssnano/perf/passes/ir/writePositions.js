import assert from 'node:assert/strict';
import { test } from 'node:test';
import data from '../../../script/passes/ir/lib/propertyGroups.json' with { type: 'json' };
import { isConflictingProp } from '../../../script/passes/ir/lib/propertyRelations.js';
import {
  Claims,
  WritePositions,
} from '../../../src/passes/ir/writePositions.js';
import { keysOfName } from '../../../src/passes/ir/propertyTable.js';

const names = [
  ...new Set([
    ...data.properties,
    ...Object.keys(data.aliases),
    ...Object.keys(data.shorthands),
    '--x',
    '--X',
    '-foo-x',
    '-foo-y-z',
    'place-content',
    'align-content',
  ]),
].filter((name) => name !== 'all');

/**
 * @param {string[]} writes
 * @return {WritePositions}
 */
function indexOf(writes) {
  const index = new WritePositions();
  for (const [position, prop] of writes.entries()) {
    index.record(keysOfName(prop), position);
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
// index of its own. Every pair of names is checked, which is why this sweep
// lives in perf/ rather than test/.
test('write positions find the earliest unclaimed write that conflicts, as isConflictingProp defines it', () => {
  for (const written of [...names, 'all']) {
    const writes = [written, written];
    const unclaimed = indexOf(writes);
    const firstClaimed = indexOf(writes);
    for (const queried of names) {
      assert.strictEqual(
        unclaimed.firstUnclaimed(keysOfName(queried), claimsOf([])),
        isConflictingProp(queried, written) ? 0 : -1,
        `${queried} against ${written}`
      );
      assert.strictEqual(
        firstClaimed.firstUnclaimed(keysOfName(queried), claimsOf([0])),
        isConflictingProp(queried, written) ? 1 : -1,
        `${queried} against ${written}, with the first write claimed`
      );
    }
  }
});
