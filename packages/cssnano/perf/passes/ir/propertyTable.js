import assert from 'node:assert/strict';
import { test } from 'node:test';
import data from '../../../src/passes/ir/data/properties.json' with { type: 'json' };
import { conflicts } from '../../../script/passes/ir/lib/tableConflicts.js';
import { isConflictingProp } from '../../../script/passes/ir/lib/propertyRelations.js';

// Every known name, each with the vendor prefixes and an escaped spelling, plus
// `all` in both spellings, names no table lists, and custom properties that
// differ in case or only by an escape. About 4,000 names, so the every-pair
// sweep takes seconds and lives here rather than in test/.
const names = new Set();
for (const name of Object.keys(data.properties)) {
  names.add(name);
  for (const prefix of ['-webkit-', '-moz-', '-ms-']) {
    names.add(prefix + name);
  }
  names.add(`\\${name.charCodeAt(0).toString(16)} ${name.slice(1)}`);
}
for (const name of [
  'all',
  '\\61 ll',
  'place-foo',
  'place-items-x',
  '-webkit-box-foo',
  'foo-bar',
  'foo-baz',
  'foo',
  'COLOR',
  'coloſ',
  '--Foo',
  '--foo',
  '--\\66 oo',
]) {
  names.add(name);
}
const universe = [...names];

// Pairs the shipped relation makes conflicting that the current relation does
// not. Empty: the table's writes add no conflict across this universe.
const lostSavings = [];

test('the shipped relation keeps every conflict the current relation has across the widened universe', () => {
  for (let i = 0; i < universe.length; i++) {
    for (let j = i; j < universe.length; j++) {
      if (isConflictingProp(universe[i], universe[j])) {
        assert.strictEqual(
          conflicts(universe[i], universe[j]),
          true,
          `${universe[i]} / ${universe[j]}`
        );
      }
    }
  }
});

test('the shipped relation adds no conflict across the widened universe beyond the lost-savings ledger', () => {
  const added = [];
  for (let i = 0; i < universe.length; i++) {
    for (let j = i; j < universe.length; j++) {
      if (
        conflicts(universe[i], universe[j]) &&
        !isConflictingProp(universe[i], universe[j])
      ) {
        added.push([universe[i], universe[j]]);
      }
    }
  }
  assert.deepStrictEqual(added, lostSavings);
});
