import {} from '../../../../../src/passes/merge/lib/rules/blockChildren.js';
import {
  COMMENT,
  NO_AT_RULE,
  NO_PRELUDE,
  NodeEntry,
} from '../../../../../src/passes/ir/blockRecord.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import RuleSequence from '../../../../../src/passes/merge/lib/rules/ruleSequence.js';
import {
  blockRecordOf,
  ruleRecordOf,
  buildTestRecords,
  placeUnlinked,
} from './liveRecords.js';
import { TextTable } from '../../../../../src/values/textTable.js';

/** @import {Root} from 'postcss' */

/**
 * @param {string} css
 * @return {{root: Root, state: MergeState}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const state = new MergeState(
    ['chrome 120'],
    createRunContext(undefined, true)
  );
  state.records = buildTestRecords(root, state, new TextTable(), true);
  return { root, state };
}

test('a sweep should unlink an at-rule block that its move emptied', () => {
  const { root, state } = setup('p{color:red}@layer a{b{width:1px}}');
  const { records } = state;
  const [p, layer] = /** @type {any[]} */ (root.nodes);
  const block = blockRecordOf(records, layer);
  new RuleSequence(records).moveIntoParent(
    records,
    ruleRecordOf(records, p).index,
    ruleRecordOf(records, layer.first).index
  );
  assert.equal(records.links.childCount(block.index), 0);
  assert.equal(records.links.parentOf(block.index), -1);
});

test('linking an entry into an at-rule block that a sweep unlinked should throw under checks', () => {
  const { root, state } = setup('p{color:red}@layer a{b{width:1px}}');
  const { records } = state;
  const [p, layer] = /** @type {any[]} */ (root.nodes);
  const block = blockRecordOf(records, layer);
  new RuleSequence(records).moveIntoParent(
    records,
    ruleRecordOf(records, p).index,
    ruleRecordOf(records, layer.first).index
  );
  const comment = placeUnlinked(
    records,
    records.root.index,
    new NodeEntry(COMMENT, '', NO_AT_RULE, '', '', false, NO_PRELUDE)
  );
  assert.throws(
    () => records.moveLast(block.index, comment.index),
    /outside the tree/v
  );
});

test('a sweep should leave an at-rule block that was empty when the sweep started in the tree', () => {
  const { root, state } = setup('@layer a{}p{color:red}q{width:1px}');
  const { records } = state;
  const [layer, p, q] = /** @type {any[]} */ (root.nodes);
  const block = blockRecordOf(records, layer);
  const sequence = new RuleSequence(records);
  const pIndex = ruleRecordOf(records, p).index;
  const qIndex = ruleRecordOf(records, q).index;
  sequence.replacePair(records, pIndex, { first: [pIndex], second: [qIndex] });
  assert.equal(records.links.childCount(block.index), 0);
  assert.equal(records.links.parentOf(block.index), records.root.index);
});
