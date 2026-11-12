import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { TextTable } from '../../../../../src/values/textTable.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { assertCanLink } from '../../../../../src/passes/merge/lib/rules/linkChecks.js';
import {
  blockRecordOf,
  buildTestRecords,
  declarationIds,
  ruleRecordOf,
} from './liveRecords.js';

/** @import {BlockRecords} from '../../../../../src/passes/merge/lib/rules/blockRecords.js' */
/** @import {Container, Root, Rule} from 'postcss' */

/**
 * @param {string} css
 * @return {{root: Root, records: BlockRecords}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const state = new MergeState(
    ['chrome 120'],
    createRunContext(undefined, true)
  );
  state.records = buildTestRecords(root, state, new TextTable(), true);
  return { root, records: state.records };
}

test('moveLast should leave a linked entry in the chain of its new block alone', () => {
  const { root, records } = setup(
    '@media print{a{color:red}}@media screen{b{width:1px}}'
  );
  const [print, screen] = /** @type {Container[]} */ (root.nodes);
  const printIndex = blockRecordOf(records, print).index;
  const screenIndex = blockRecordOf(records, screen).index;
  const rule = ruleRecordOf(records, /** @type {Rule} */ (print.first)).index;
  records.moveLast(screenIndex, rule);
  assert.equal(records.links.parentOf(rule), screenIndex);
  assert.equal(records.links.firstChild(printIndex), -1);
  assert.equal(records.links.childCount(printIndex), 0);
  assert.equal(records.links.childCount(screenIndex), 2);
});

test('moveLast under checks should throw when the block would move into its own subtree', () => {
  const { root, records } = setup('@media print{@media screen{a{color:red}}}');
  const outer = blockRecordOf(records, /** @type {Container} */ (root.first));
  const inner = blockRecordOf(
    records,
    /** @type {Container} */ (/** @type {Container} */ (root.first).first)
  );
  assert.throws(
    () => records.moveLast(inner.index, outer.index),
    /outside the tree/v
  );
});

test('moveLast should refresh the declaration keys of the rule it moves a declaration into', () => {
  const { root, records } = setup('a{color:red}b{top:0}');
  const [a, b] = /** @type {Rule[]} */ (root.nodes);
  const holder = ruleRecordOf(records, a).index;
  const receiver = ruleRecordOf(records, b).index;
  const color = records.links.firstChild(holder);
  const top = records.links.firstChild(receiver);
  const colorId = records.entry(color).id;
  const topId = records.entry(top).id;
  assert.deepEqual(declarationIds(records, receiver), [topId]);
  records.moveLast(receiver, color);
  assert.deepEqual(declarationIds(records, receiver), [topId, colorId]);
});

test('moveLast should move the declaration stamp of the rule a declaration joins', () => {
  const { root, records } = setup('a{color:red}b{top:0}');
  const [a, b] = /** @type {Rule[]} */ (root.nodes);
  const receiver = ruleRecordOf(records, b).index;
  const color = records.links.firstChild(ruleRecordOf(records, a).index);
  const before = records.declarationStamps.stampOf(receiver);
  records.moveLast(receiver, color);
  assert.ok(records.declarationStamps.stampOf(receiver) > before);
});

test('assertCanLink under checks should throw for an entry that stands in a chain, which a second link would leave in two', () => {
  const { root, records } = setup('a{color:red}b{top:0}');
  const [a, b] = /** @type {Rule[]} */ (root.nodes);
  const receiver = ruleRecordOf(records, b).index;
  const color = records.links.firstChild(ruleRecordOf(records, a).index);
  assert.throws(
    () => assertCanLink(records, receiver, color),
    /stands in a chain/v
  );
});
