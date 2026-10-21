import assert from 'node:assert/strict';
import { test } from 'node:test';
import data from '../../../../../script/passes/ir/lib/propertyGroups.json' with { type: 'json' };
import { isConflictingProp } from '../../../../../script/passes/ir/lib/propertyRelations.js';
import { WritePositions } from '../../../../../src/passes/merge/lib/rules/writePositions.js';
import { PropertyTable } from '../../../../../src/passes/ir/propertyTable.js';

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
  const index = new WritePositions(new PropertyTable());
  for (const [position, prop] of writes.entries()) {
    index.record({ prop }, position);
  }
  return index;
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
        unclaimed.firstUnclaimed({ prop: queried }, new Set()),
        isConflictingProp(queried, written) ? 0 : -1,
        `${queried} against ${written}`
      );
      assert.strictEqual(
        firstClaimed.firstUnclaimed({ prop: queried }, new Set([0])),
        isConflictingProp(queried, written) ? 1 : -1,
        `${queried} against ${written}, with the first write claimed`
      );
    }
  }
});
