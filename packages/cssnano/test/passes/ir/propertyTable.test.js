import { test } from 'node:test';
import assert from 'node:assert/strict';
import data from '../../../script/passes/ir/lib/propertyGroups.json' with { type: 'json' };
import { isConflictingProp } from '../../../script/passes/ir/lib/propertyRelations.js';
import { conflicts } from '../../../script/passes/ir/lib/tableConflicts.js';
import { setsLonghands } from '../../../src/passes/merge/lib/longhand/spec.js';
import { PropertyTable } from '../../../src/passes/ir/propertyTable.js';

// Every property the webref data names, plus its aliases.
const known = [
  ...new Set([...data.properties, ...Object.keys(data.aliases)]),
].toSorted();

// The family tables' own answer: two names conflict when the longhands they
// set intersect. Independent of the group and alias data the relation uses.
function familyConflicts(a, b) {
  const longhandsA = setsLonghands(a);
  const longhandsB = setsLonghands(b);
  for (const longhand of longhandsA) {
    if (longhandsB.has(longhand)) return true;
  }
  return false;
}

// Pairs of known names the shipped relation makes conflicting while the current
// relation does not. Each needs a specification reason here, or the entry it
// comes from is removed; an empty list means no saving is lost.
const lostSavings = [];

test('the shipped relation keeps every conflict the current relation has on every known pair', () => {
  for (let i = 0; i < known.length; i++) {
    for (let j = i; j < known.length; j++) {
      if (isConflictingProp(known[i], known[j])) {
        assert.strictEqual(
          conflicts(known[i], known[j]),
          true,
          `${known[i]} / ${known[j]}`
        );
      }
    }
  }
});

test('the shipped relation adds no conflict on known pairs beyond the lost-savings ledger', () => {
  const added = [];
  for (let i = 0; i < known.length; i++) {
    for (let j = i; j < known.length; j++) {
      if (
        conflicts(known[i], known[j]) &&
        !isConflictingProp(known[i], known[j])
      ) {
        added.push([known[i], known[j]]);
      }
    }
  }
  assert.deepStrictEqual(added, lostSavings);
});

test('the shipped relation keeps every conflict the family tables claim', () => {
  for (let i = 0; i < known.length; i++) {
    for (let j = i; j < known.length; j++) {
      if (familyConflicts(known[i], known[j])) {
        assert.strictEqual(
          conflicts(known[i], known[j]),
          true,
          `${known[i]} / ${known[j]}`
        );
      }
    }
  }
});

test('the shipped relation treats names that differ only by ASCII case as one property', () => {
  assert.strictEqual(conflicts('COLOR', 'color'), true);
  assert.strictEqual(conflicts('Margin-Top', 'margin-top'), true);
});

test('the shipped relation keeps custom properties case-sensitive', () => {
  assert.strictEqual(conflicts('--Foo', '--foo'), false);
  assert.strictEqual(conflicts('--Foo', '--Foo'), true);
});

test('the shipped relation matches the current relation for a name that is not a property', () => {
  assert.strictEqual(
    conflicts('coloſ', 'color'),
    isConflictingProp('coloſ', 'color')
  );
});

test('a property table keys custom properties by their exact, case-sensitive name', () => {
  const table = new PropertyTable();
  assert.strictEqual(table.keysOf('--Foo').key, '--Foo');
  assert.strictEqual(table.keysOf('--\\66 oo').key, '--foo');
  assert.notStrictEqual(table.keysOf('--Foo').key, table.keysOf('--foo').key);
});

test('a property table keys a known name to its longhands and their group sides', () => {
  const keys = new PropertyTable().keysOf('margin-inline-start');
  assert.strictEqual(keys.custom, false);
  assert.strictEqual(keys.known, true);
  assert.deepStrictEqual(keys.longhands, [
    {
      name: 'margin-inline-start',
      side: 'margin:true',
      opposite: 'margin:false',
    },
  ]);
});

test('a property table keys all as all, which no other key is compared against', () => {
  const table = new PropertyTable();
  assert.deepStrictEqual(table.keysOf('all'), { custom: false, all: true });
  assert.deepStrictEqual(table.keysOf('\\61 ll'), { custom: false, all: true });
});
