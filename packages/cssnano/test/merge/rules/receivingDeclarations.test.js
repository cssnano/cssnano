import { declarationsOf } from '../../../src/ir/blockChildren.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
/** @import MergeState from '../../../src/merge/rules/mergeState.js' */
import { PropertyWrites } from '../../../src/ir/propertyWrites.js';
import { appendChild } from '../../../src/ir/arenaEdits.js';
import {
  declarationKeys,
  receivingDeclarations,
} from '../../../src/ir/declarationCache.js';
import { ruleRecordOf, placeUnlinked, recordsOf } from './liveRecords.js';
import { recordDeclaration } from '../../../src/ir/tree/buildRecords.js';

/** @import {BlockRecords} from '../../../src/ir/blockRecords.js' */
/** @import {RuleRecord} from '../../../src/ir/ruleRecord.js' */

/**
 * The records of `css`, built as the run builds them, with the record of its
 * first rule.
 *
 * @param {string} css
 * @return {{state: MergeState, records: BlockRecords, record: RuleRecord}}
 */
const arenaOf = (css, consistencyChecks = false) => {
  const { root, state, records } = recordsOf(css, consistencyChecks);
  return { state, records, record: ruleRecordOf(records, root.first) };
};

/**
 * A declaration that no rule holds yet.
 *
 * @param {{state: MergeState, records: BlockRecords}} arena
 * @param {string} prop
 * @return {import('../../../src/ir/declarationRecord.js').DeclarationRecord}
 */
const freshDeclaration = ({ state, records }, prop) =>
  placeUnlinked(
    records,
    records.root.index,
    recordDeclaration(postcss.decl({ prop, value: '0' }), state.runContext)
  );

test('receivingDeclarations should return the same entry after appendChild, with the appended declaration last in kept and its write at its position', () => {
  const arena = arenaOf('a{color:red}');
  const { records, record } = arena;
  const before = receivingDeclarations(records, record.index);
  const width = freshDeclaration(arena, 'width');
  appendChild(records, record.index, width.index);
  const after = receivingDeclarations(records, record.index);
  assert.equal(after, before);
  assert.equal(after.kept.at(-1), width.index);
  assert.equal(after.writes?.lastConflict(width.keys), after.kept.length - 1);
});

test('receivingDeclarations should return a new entry with new writes after a declaration leaves the rule', () => {
  const { records, record } = arenaOf('a{color:red;width:1px}');
  const [color] = declarationsOf(records, record.index);
  const before = receivingDeclarations(records, record.index);
  records.detach(color.index);
  const after = receivingDeclarations(records, record.index);
  assert.notEqual(after, before);
  assert.equal(after.kept.includes(color.index), false);
  assert.notEqual(after.writes, before.writes);
  assert.equal(after.writes?.lastConflict(color.keys), -1);
});

test('receivingDeclarations should build the writes of an entry that declarationKeys read, with every declaration', () => {
  const arena = arenaOf('a{color:red}');
  const { records, record } = arena;
  const [color] = declarationsOf(records, record.index);
  const keys = declarationKeys(records, record.index);
  const width = freshDeclaration(arena, 'width');
  appendChild(records, record.index, width.index);
  assert.equal(keys.writes, undefined);
  const after = receivingDeclarations(records, record.index);
  assert.equal(after, keys);
  assert.equal(after.writes?.lastConflict(color.keys), 0);
  assert.equal(after.writes?.lastConflict(width.keys), 1);
});

test('receivingDeclarations should throw out of step under checks when the writes miss a declaration of the rule', () => {
  const { records, record } = arenaOf('a{color:red;width:1px}', true);
  const [color] = declarationsOf(records, record.index);
  const entry = receivingDeclarations(records, record.index);
  // The writes name only `color`, as if the append of `width` missed them.
  entry.writes = new PropertyWrites();
  entry.writes.record(color.keys, 0);
  assert.throws(
    () => receivingDeclarations(records, record.index),
    /out of step/v
  );
});
