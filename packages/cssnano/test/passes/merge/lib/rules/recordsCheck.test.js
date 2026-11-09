import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { assertRecordsWellFormed } from '../../../../../src/passes/merge/lib/rules/recordsCheck.js';
import {
  BlockRecord,
  COMMENT,
  NO_PRELUDE,
  NodeEntry,
} from '../../../../../src/passes/merge/lib/rules/blockRecord.js';
import { remove } from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import {
  blockRecordOf,
  ruleRecordOf,
  buildTestRecords,
  withCorruptedLinks,
  placeUnlinked,
} from './liveRecords.js';
import { moveRule } from '../../../../../src/passes/merge/lib/rules/arenaEdits.js';
import { TextTable } from '../../../../../src/values/textTable.js';

/** @import {BlockRecord} from '../../../../../src/passes/merge/lib/rules/blockRecord.js' */
/** @import {BlockLinks} from '../../../../../src/passes/merge/lib/rules/blockLinks.js' */
/** @import {Root, Rule} from 'postcss' */

/**
 * @param {string} css
 * @return {{root: Root, state: MergeState}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const context = createRunContext(undefined, true);
  const state = new MergeState(['chrome 120'], context);
  state.records = buildTestRecords(root, state, new TextTable(), true);
  return { root, state };
}

test('assertRecordsWellFormed should accept records built from a stylesheet', () => {
  const { state } = setup(
    '@media (x){@media (y){p{width:1px}q{height:2px}}}a{color:red;b{width:1px}}'
  );
  assert.doesNotThrow(() => assertRecordsWellFormed(state));
});

test('assertRecordsWellFormed should accept a block removed with its declarations, as dedupe removes a duplicate @font-face', () => {
  const { root, state } = setup(
    '@font-face{font-family:x}@font-face{font-family:x}'
  );
  const earlier = /** @type {BlockRecord} */ (
    blockRecordOf(state.records, /** @type {any} */ (root.first))
  );
  remove(state.records, earlier.index);
  assert.doesNotThrow(() => assertRecordsWellFormed(state));
});

// The arena's edits never build a chain that holds an entry twice, so these
// tests corrupt the raw links table, as a bug inside it would.
test('assertRecordsWellFormed should throw when a child of a rule is linked into another rule, which leaves it in both chains', () => {
  const { root, state } = setup('a{color:red;b{width:1px}}c{top:0}');
  const [a, c] = /** @type {Rule[]} */ (root.nodes);
  const holder = ruleRecordOf(state.records, a);
  const other = ruleRecordOf(state.records, c);
  const child = state.records.links.firstChild(holder.index);
  /** @type {BlockLinks} */ (state.records.links).linkLast(other.index, child);
  assert.throws(() => assertRecordsWellFormed(state), /out of step/v);
});

test('assertRecordsWellFormed should throw when the root is linked into its own subtree, so the walk reaches it twice', () => {
  const { root, state } = setup('a{color:red;b{width:1px}}');
  const holder = ruleRecordOf(state.records, /** @type {Rule} */ (root.first));
  /** @type {BlockLinks} */ (state.records.links).linkLast(
    holder.index,
    state.records.root.index
  );
  assert.throws(() => assertRecordsWellFormed(state), /reached twice/v);
});

test('moveLast should throw under checks when the root is moved into a chain', () => {
  const { state } = setup('a{color:red;b{width:1px}}');
  const holder = ruleRecordOf(
    state.records,
    /** @type {Rule} */ (state.records.root.node.first)
  );
  assert.throws(
    () => state.records.moveLast(holder.index, state.records.root.index),
    /root is moved/v
  );
});

test('assertRecordsWellFormed should throw when a block whose chain does not start at its first live child', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const media = /** @type {BlockRecord} */ (
    blockRecordOf(state.records, /** @type {any} */ (root.first))
  );
  const records = withCorruptedLinks(state.records, media.index, {
    firstChild: () => -1,
  });
  assert.throws(() => assertRecordsWellFormed({ records }), /out of step/v);
});

test('assertRecordsWellFormed should throw when a block whose chain ends before its last live child', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const media = /** @type {BlockRecord} */ (
    blockRecordOf(state.records, /** @type {any} */ (root.first))
  );
  const records = withCorruptedLinks(state.records, media.index, {
    lastChild: (real, index) => real.firstChild(index),
  });
  assert.throws(() => assertRecordsWellFormed({ records }), /out of step/v);
});

test('assertRecordsWellFormed should accept the chains after a rule moves out of an at-rule and a block is removed', () => {
  const { root, state } = setup(
    '@media print{a{color:red}}@layer b{}d{height:2px}'
  );
  const [media, layer] = /** @type {any[]} */ (root.nodes);
  const rule = ruleRecordOf(state.records, media.first);
  moveRule(state.records, state.records.root.index, rule.index);
  remove(state.records, blockRecordOf(state.records, layer).index);
  assert.doesNotThrow(() => assertRecordsWellFormed(state));
});

test('moveLast should throw under checks when the block is outside the tree', () => {
  const { state } = setup('a{color:red}');
  const detached = new BlockRecord(postcss.atRule({ name: 'media' }), false);
  placeUnlinked(state.records, state.records.root.index, detached);
  const comment = placeUnlinked(
    state.records,
    state.records.root.index,
    new NodeEntry(
      postcss.comment({ text: 'x' }),
      COMMENT,
      '',
      '',
      false,
      NO_PRELUDE
    )
  );
  assert.throws(
    () => state.records.moveLast(detached.index, comment.index),
    /outside the tree/v
  );
});

test('assertRecordsWellFormed should accept a declaration that moveLast moves into another rule', () => {
  const { root, state } = setup('a{color:red}c{top:0}');
  const [a, c] = /** @type {Rule[]} */ (root.nodes);
  const color = state.records.links.firstChild(
    ruleRecordOf(state.records, a).index
  );
  state.records.moveLast(ruleRecordOf(state.records, c).index, color);
  assert.doesNotThrow(() => assertRecordsWellFormed(state));
});
