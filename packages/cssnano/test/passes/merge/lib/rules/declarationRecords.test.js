import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postcss from 'postcss';
import { DeclarationKeys } from '../../../../../src/passes/ir/declarationKey.js';
import {
  DeclarationRecord,
  recordDeclaration,
} from '../../../../../src/passes/ir/declarationRecord.js';
import { PropertyTable } from '../../../../../src/passes/ir/propertyTable.js';
import { enableConsistencyChecks } from '../../../../../src/passes/ir/consistencyChecks.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { writesOf } from '../../../../../src/passes/merge/lib/rules/ruleRewrite.js';
import { appendToDeclarations } from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import {
  assertRecordsMatchTree,
  writeBack,
} from '../../../../../src/passes/merge/lib/rules/writeBack.js';
import { ruleRecordOf, buildTestRecords } from './liveRecords.js';

before(() => enableConsistencyChecks(true));
after(() => enableConsistencyChecks(false));

/**
 * @param {string} css
 * @return {{root: import('postcss').Root, state: MergeState}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const state = new MergeState(['chrome 120']);
  state.records = buildTestRecords(root, state);
  return { root, state };
}

test('appendToDeclarations moves the record of an incoming declaration into the receiving rule, as the same object', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const receiving = ruleRecordOf(state.records, root.first.first);
  const incoming = ruleRecordOf(state.records, root.first.last);
  const moved = incoming.declarationsOf(state.records)[0];
  const kept = [...receiving.declarationsOf(state.records)];
  appendToDeclarations(state, receiving, kept, writesOf(kept), incoming);
  assert.equal(receiving.declarationsOf(state.records).at(-1), moved);
  state.records.links.unlink(incoming.index);
  writeBack(state.records);
  assert.equal(moved.node.parent, receiving.node);
});

test('recordDeclaration gives an important declaration an id that differs from an unset one', () => {
  const properties = new PropertyTable();
  const keys = new DeclarationKeys();
  const plain = recordDeclaration(
    postcss.decl({ prop: 'color', value: 'red' }),
    properties,
    keys
  );
  const important = recordDeclaration(
    postcss.decl({ prop: 'color', value: 'red', important: true }),
    properties,
    keys
  );
  assert.equal(important.important, true);
  assert.equal(plain.important, false);
  assert.notEqual(plain.id, important.id);
});

test('a rule record reads its declaration keys from the ids of its records', () => {
  const { root, state } = setup('a{color:red;width:1px}');
  const rule = ruleRecordOf(state.records, root.first);
  assert.deepEqual(
    rule.declarationKeys(state.records).keys,
    rule.declarationsOf(state.records).map((declaration) => declaration.id)
  );
});

test('assertRecordsMatchTree throws under consistency checks when a declaration value changed behind its record', () => {
  const { root, state } = setup('a{color:red}');
  assert.doesNotThrow(() => assertRecordsMatchTree(state.records));
  const declaration = /** @type {import('postcss').Declaration} */ (
    root.first.first
  );
  declaration.value = 'blue';
  assert.throws(
    () => assertRecordsMatchTree(state.records),
    /stale declarations/v
  );
});

test('a declaration in a rule that nests is a declaration record in its chain, and its node in the live children', () => {
  const { root, state } = setup('a{color:red;b{width:1px}}');
  const rule = ruleRecordOf(state.records, root.first);
  const [color] = state.records.liveEntries(rule.index);
  assert.ok(color instanceof DeclarationRecord);
  assert.equal(state.records.liveChildren(rule.index)[0], root.first.first);
  assert.equal(color.node, root.first.first);
});

test('declarationKeys of a rule that nests are the ids of its chain declarations', () => {
  const { root, state } = setup('a{color:red;b{width:1px}}');
  const rule = ruleRecordOf(state.records, root.first);
  const ids = state.records
    .liveEntries(rule.index)
    .filter((entry) => entry instanceof DeclarationRecord)
    .map((entry) => entry.id);
  assert.deepEqual(rule.declarationKeys(state.records).keys, ids);
});

test('canMerge should refuse a rule that holds a block against a rule it could otherwise join', () => {
  const { root, state } = setup('a{color:red;b{width:1px}}c{color:red}');
  const holder = ruleRecordOf(state.records, root.first);
  const leaf = ruleRecordOf(state.records, root.last);
  assert.equal(state.canMerge(holder, leaf), false);
  assert.equal(state.canMerge(leaf, holder), false);
});
