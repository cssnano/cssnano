import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postcss from 'postcss';
import { enableConsistencyChecks } from '../../../../../src/passes/ir/consistencyChecks.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import {
  remove,
  takePlaceOf,
} from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import {
  blockRecordOf,
  ruleRecordOf,
  buildTestRecords,
} from './liveRecords.js';

/** @import {Container, Root, Rule} from 'postcss' */

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
  state.records = buildTestRecords(root, state);
  return { root, state };
}

/**
 * @param {MergeState} state
 * @param {import('postcss').ChildNode} node the node of a block
 * @return {number} the index of the block record of `node`
 */
function indexOfBlock(state, node) {
  return blockRecordOf(state.records, /** @type {Container} */ (node)).index;
}

test('substitute should put the replacement in the chain where the rule stood', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const [media] = /** @type {Container[]} */ (root.nodes);
  const [a, b] = /** @type {Rule[]} */ (/** @type {Container} */ (media).nodes);
  const replacement = state.records.recordRule(
    postcss.rule({ selector: 'x' }),
    ['x'],
    'x'
  );
  const mediaIndex = indexOfBlock(state, media);
  state.records.substitute(ruleRecordOf(state.records, a).index, [
    replacement.index,
  ]);
  const entries = state.records.liveEntries(mediaIndex);
  assert.equal(entries.length, 2);
  assert.equal(entries[0], replacement);
  assert.equal(entries[1], ruleRecordOf(state.records, b));
  assert.equal(state.records.links.parentOf(replacement.index), mediaIndex);
});

test('substitute with no replacement should unlink the rule and shrink its block', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const [media] = /** @type {Container[]} */ (root.nodes);
  const [a] = /** @type {Rule[]} */ (/** @type {Container} */ (media).nodes);
  const mediaRecord = blockRecordOf(state.records, media);
  const rule = ruleRecordOf(state.records, a);
  state.records.substitute(rule.index, []);
  assert.equal(mediaRecord.count, 1);
  assert.equal(state.records.links.parentOf(rule.index), -1);
});

test('moveRule should link the rule at the end of the target chain and unlink it from its block', () => {
  const { root, state } = setup('x{color:red}@media print{a{color:red}}');
  const [x, media] = /** @type {Container[]} */ (root.nodes);
  const [a] = /** @type {Rule[]} */ (/** @type {Container} */ (media).nodes);
  const rule = ruleRecordOf(state.records, a);
  state.records.moveRule(state.records.root.index, rule.index);
  const entries = state.records.liveEntries(state.records.root.index);
  assert.equal(entries.at(-1), rule);
  assert.equal(entries[0], ruleRecordOf(state.records, x));
  assert.equal(
    state.records.links.parentOf(rule.index),
    state.records.root.index
  );
  assert.equal(blockRecordOf(state.records, media).count, 0);
});

test('takePlaceOf should link the earlier block where the later block stood and unlink the later one', () => {
  const { root, state } = setup('@media a{x{color:red}}@media b{y{color:red}}');
  const [first, second] = /** @type {Container[]} */ (root.nodes);
  const firstBlock = blockRecordOf(state.records, first);
  const secondBlock = blockRecordOf(state.records, second);
  takePlaceOf(state.records, firstBlock.index, secondBlock.index);
  const entries = state.records.liveEntries(state.records.root.index);
  assert.equal(entries.length, 1);
  assert.equal(entries[0], firstBlock);
  assert.equal(state.records.links.parentOf(secondBlock.index), -1);
});

test('adopt should append the children of the source to the target and leave the source empty', () => {
  const { root, state } = setup(
    'x{color:red}@media print{a{color:red}b{width:1px}}'
  );
  const [x, media] = /** @type {Container[]} */ (root.nodes);
  const [a, b] = /** @type {Rule[]} */ (/** @type {Container} */ (media).nodes);
  const mediaRecord = blockRecordOf(state.records, media);
  state.records.adopt(state.records.root.index, mediaRecord.index);
  const entries = state.records.liveEntries(state.records.root.index);
  assert.equal(entries.length, 4);
  assert.equal(entries[0], ruleRecordOf(state.records, x));
  assert.equal(entries[1], mediaRecord);
  assert.equal(entries[2], ruleRecordOf(state.records, a));
  assert.equal(entries[3], ruleRecordOf(state.records, b));
  assert.equal(mediaRecord.count, 0);
  assert.equal(
    state.records.links.parentOf(ruleRecordOf(state.records, b).index),
    state.records.root.index
  );
});

test('remove should unlink a rule and leave its block count one less', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const [media] = /** @type {Container[]} */ (root.nodes);
  const [a] = /** @type {Rule[]} */ (/** @type {Container} */ (media).nodes);
  const rule = ruleRecordOf(state.records, a);
  remove(state.records, rule);
  assert.equal(state.records.links.parentOf(rule.index), -1);
  assert.equal(blockRecordOf(state.records, media).count, 1);
});

test('remove should unlink a block and leave its container count one less', () => {
  const { root, state } = setup('@media print{a{color:red}}b{width:1px}');
  const [media] = /** @type {Container[]} */ (root.nodes);
  const block = blockRecordOf(state.records, media);
  remove(state.records, block);
  assert.equal(state.records.links.parentOf(block.index), -1);
  assert.equal(state.records.root.count, 1);
});
