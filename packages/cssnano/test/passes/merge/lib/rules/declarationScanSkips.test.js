import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postcss from 'postcss';
import { enableConsistencyChecks } from '../../../../../src/passes/ir/consistencyChecks.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import RuleSequence from '../../../../../src/passes/merge/lib/rules/ruleSequence.js';
import {
  blockRecordOf,
  ruleRecordOf,
  buildTestRecords,
} from './liveRecords.js';

/** @import {Root} from 'postcss' */

before(() => enableConsistencyChecks(true));
after(() => enableConsistencyChecks(false));

/**
 * @param {string} css
 * @return {{root: Root, state: MergeState}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildTestRecords(root, state);
  return { root, state };
}

test('a sweep should unlink an at-rule block that its move emptied', () => {
  const { root, state } = setup('p{color:red}@layer a{b{width:1px}}');
  const { records } = state;
  const [p, layer] = /** @type {any[]} */ (root.nodes);
  const block = blockRecordOf(records, layer);
  new RuleSequence(records).moveIntoParent(
    ruleRecordOf(records, p).index,
    ruleRecordOf(records, layer.first).index
  );
  assert.equal(records.liveCount(block.index), 0);
  assert.equal(records.links.parentOf(block.index), -1);
});

test('linking an entry into an at-rule block that a sweep unlinked should throw under checks', () => {
  const { root, state } = setup('p{color:red}@layer a{b{width:1px}}');
  const { records } = state;
  const [p, layer] = /** @type {any[]} */ (root.nodes);
  const block = blockRecordOf(records, layer);
  new RuleSequence(records).moveIntoParent(
    ruleRecordOf(records, p).index,
    ruleRecordOf(records, layer.first).index
  );
  const comment = records.bareEntry(postcss.comment({ text: 'x' }));
  assert.throws(
    () => records.links.linkLast(block.index, comment.index),
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
  sequence.replacePair(pIndex, { first: [pIndex], second: [qIndex] });
  assert.equal(records.liveCount(block.index), 0);
  assert.equal(records.links.parentOf(block.index), records.root.index);
});
