import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postcss from 'postcss';
import { enableConsistencyChecks } from '../../../../../src/passes/ir/consistencyChecks.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { assertRecordsWellFormed } from '../../../../../src/passes/merge/lib/rules/recordsCheck.js';
import { BlockRecord } from '../../../../../src/passes/merge/lib/rules/blockRecord.js';
import {
  buildRecords,
  remove,
} from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import { assertRecordsMatchTree } from '../../../../../src/passes/merge/lib/rules/writeBack.js';
import { blockRecordOf, ruleRecordOf } from './liveRecords.js';

/** @import {BlockRecord} from '../../../../../src/passes/merge/lib/rules/blockRecord.js' */
/** @import {Root, Rule} from 'postcss' */

before(() => enableConsistencyChecks(true));
after(() => enableConsistencyChecks(false));

/**
 * @param {string} css
 * @return {{root: Root, state: MergeState}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const context = createRunContext();
  const state = new MergeState(['chrome 120'], context);
  state.records = buildRecords(root, state);
  return { root, state };
}

test('assertRecordsWellFormed should accept records built from a stylesheet', () => {
  const { state } = setup(
    '@media (x){@media (y){p{width:1px}q{height:2px}}}a{color:red;b{width:1px}}'
  );
  assert.doesNotThrow(() => assertRecordsWellFormed(state));
});

test('assertRecordsWellFormed should throw when a dropped block still holds a live child, which the tree check does not see', () => {
  const { root, state } = setup('@layer a{p{color:red}}');
  const layer = /** @type {BlockRecord} */ (
    blockRecordOf(state.records, /** @type {any} */ (root.first))
  );
  // A sweep takes a dropped block out of the tree, so the tree lacks it too.
  state.records.links.unlink(layer.index);
  root.first?.remove();
  assert.doesNotThrow(() => assertRecordsMatchTree(state));
  assert.throws(() => assertRecordsWellFormed(state), /out of step/v);
});

test('assertRecordsWellFormed should throw when a nested block is owned by a rule other than the one holding it', () => {
  const { root, state } = setup('a{color:red;b{width:1px}}c{top:0}');
  const [a, c] = /** @type {Rule[]} */ (root.nodes);
  const holder = ruleRecordOf(state.records, a);
  const other = ruleRecordOf(state.records, c);
  state.records.links.ownBlock(other.index, holder.block);
  assert.throws(() => assertRecordsWellFormed(state), /out of step/v);
});

test('assertRecordsWellFormed should throw when the root is linked into its own subtree, so the walk reaches it twice', () => {
  const { state } = setup('a{color:red;b{width:1px}}');
  const holder = ruleRecordOf(
    state.records,
    /** @type {Rule} */ (state.records.root.node.first)
  );
  state.records.links.linkLast(holder.block, state.records.root.index);
  assert.throws(() => assertRecordsWellFormed(state), /reached twice/v);
});

test('assertRecordsWellFormed should throw when a block whose chain does not start at its first live child', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const media = /** @type {BlockRecord} */ (
    blockRecordOf(state.records, /** @type {any} */ (root.first))
  );
  media.first = -1;
  assert.throws(() => assertRecordsWellFormed(state), /out of step/v);
});

test('assertRecordsWellFormed should throw when a block whose chain ends before its last live child', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const media = /** @type {BlockRecord} */ (
    blockRecordOf(state.records, /** @type {any} */ (root.first))
  );
  media.last = media.first;
  assert.throws(() => assertRecordsWellFormed(state), /out of step/v);
});

test('assertRecordsWellFormed should accept the chains after a rule moves out of an at-rule and a block is removed', () => {
  const { root, state } = setup(
    '@media print{a{color:red}}@layer b{}d{height:2px}'
  );
  const [media, layer] = /** @type {any[]} */ (root.nodes);
  const rule = ruleRecordOf(state.records, media.first);
  state.records.moveRule(state.records.root.index, rule.index);
  remove(state.records, blockRecordOf(state.records, layer));
  assert.doesNotThrow(() => assertRecordsWellFormed(state));
});

test('linkLast should throw under checks when the block is outside the tree', () => {
  const { state } = setup('a{color:red}');
  const detached = new BlockRecord(postcss.atRule({ name: 'media' }), false);
  state.records.add(detached);
  const comment = state.records.bareEntry(postcss.comment({ text: 'x' }));
  assert.throws(
    () => state.records.links.linkLast(detached.index, comment.index),
    /outside the tree/v
  );
});
