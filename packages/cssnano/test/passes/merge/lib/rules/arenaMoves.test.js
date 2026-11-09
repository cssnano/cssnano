import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { TextTable } from '../../../../../src/values/textTable.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import {
  blockRecordOf,
  buildTestRecords,
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
