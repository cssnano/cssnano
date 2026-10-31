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
import {
  appendToDeclarations,
  buildRecords,
} from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import { assertRecordsMatchTree } from '../../../../../src/passes/merge/lib/rules/writeBack.js';
import { ruleRecordOf } from './liveRecords.js';

before(() => enableConsistencyChecks(true));
after(() => enableConsistencyChecks(false));

/**
 * @param {string} css
 * @return {{root: import('postcss').Root, state: MergeState}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const state = new MergeState(['chrome 120']);
  state.records = buildRecords(root, state);
  return { root, state };
}

test('appendToDeclarations moves the record of an incoming declaration into the receiving rule, as the same object', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const receiving = ruleRecordOf(state.records, root.first.first);
  const incoming = ruleRecordOf(state.records, root.first.last);
  const moved = incoming.declarations[0];
  const kept = [...receiving.declarations];
  appendToDeclarations(
    state,
    receiving,
    kept,
    writesOf(kept, new PropertyTable()),
    incoming
  );
  assert.equal(receiving.declarations.at(-1), moved);
  assert.equal(moved.node.parent, receiving.node);
});

test('a declaration record copy keeps the id and keys of its source and takes the node it is given', () => {
  const properties = new PropertyTable();
  const node = postcss.decl({ prop: 'color', value: 'red' });
  const source = recordDeclaration(node, properties, new DeclarationKeys());
  const clone = postcss.decl({ prop: 'color', value: 'red' });
  const copy = source.copy(clone);
  assert.ok(copy instanceof DeclarationRecord);
  assert.notEqual(copy, source);
  assert.equal(copy.node, clone);
  assert.equal(copy.id, source.id);
  assert.equal(copy.keys, source.keys);
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
    rule.declarationKeys().keys,
    rule.declarations.map((declaration) => declaration.id)
  );
});

test('assertRecordsMatchTree throws under consistency checks when a declaration value changed behind its record', () => {
  const { root, state } = setup('a{color:red}');
  assert.doesNotThrow(() => assertRecordsMatchTree(state));
  const declaration = /** @type {import('postcss').Declaration} */ (
    root.first.first
  );
  declaration.value = 'blue';
  assert.throws(() => assertRecordsMatchTree(state), /stale declarations/v);
});

test('a declaration in a rule that holds a block is a declaration record in its block entries, and its node in the live children', () => {
  const { root, state } = setup('a{color:red;b{width:1px}}');
  const rule = ruleRecordOf(state.records, root.first);
  const block =
    /** @type {import('../../../../../src/passes/merge/lib/rules/blockRecords.js').BlockRecord} */ (
      rule.block
    );
  const [color] = block.liveEntries();
  assert.ok(color instanceof DeclarationRecord);
  assert.equal(block.liveChildren()[0], root.first.first);
  assert.equal(color.node, root.first.first);
});
