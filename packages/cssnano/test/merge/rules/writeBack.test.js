import { childEntriesOf } from '../../../src/ir/blockChildren.js';
import assert from 'node:assert/strict';
import { nodesOf, tokenListsOf, recordsOf } from './liveRecords.js';
import { test } from 'node:test';
/** @import MergeState from '../../../src/merge/rules/mergeState.js' */
import RuleSequence from '../../../src/merge/rules/ruleSequence.js';
import { assertRecordsMatchTree } from '../../../src/ir/tree/treeMatch.js';
import { writeBack } from '../../../src/ir/tree/writeBack.js';

/** @import {Container, Root} from 'postcss' */

/**
 * @param {string} css
 * @return {{root: Root, state: MergeState}}
 */
function setup(css) {
  const { root, state } = recordsOf(css, true);
  return { root, state };
}

test('a second write-back should print the same CSS as the first, and the records should still match the tree', () => {
  const { root, state } = setup(
    '@media (x){a{color:red}}@media (y){b{width:1px}}'
  );
  const sequence = new RuleSequence(state.records);
  const first = sequence.head;
  sequence.moveIntoParent(state.records, first, sequence.nextOf(first));
  writeBack(state.records, nodesOf(state.records), state.tokenLists);
  const printed = String(root);
  writeBack(state.records, nodesOf(state.records), state.tokenLists);
  assert.equal(String(root), printed);
  assert.doesNotThrow(() =>
    assertRecordsMatchTree(
      state.records,
      nodesOf(state.records),
      tokenListsOf(state.records)
    )
  );
});

test('assertRecordsMatchTree should throw when a child of the stylesheet prints other whitespace than its record holds', () => {
  const { root, state } = setup('a{color:red}\nb{width:1px}');
  writeBack(state.records, nodesOf(state.records), state.tokenLists);
  root.nodes[1].raws.before = ' ';
  assert.throws(() =>
    assertRecordsMatchTree(
      state.records,
      nodesOf(state.records),
      tokenListsOf(state.records)
    )
  );
});

test('assertRecordsMatchTree should throw when a declaration prints other whitespace than its record holds', () => {
  const { root, state } = setup('a{\n  color:red}');
  writeBack(state.records, nodesOf(state.records), state.tokenLists);
  const rule = /** @type {Container} */ (root.first);
  /** @type {import('postcss').ChildNode} */ (rule.first).raws.before = '';
  assert.throws(() =>
    assertRecordsMatchTree(
      state.records,
      nodesOf(state.records),
      tokenListsOf(state.records)
    )
  );
});

test('assertRecordsMatchTree should accept a node whose record leaves its whitespace to the printer', () => {
  const { root, state } = setup('a{color:red}\nb{width:1px}');
  writeBack(state.records, nodesOf(state.records), state.tokenLists);
  const [, second] = childEntriesOf(state.records, state.records.root.index);
  second.before = null;
  root.nodes[1].raws.before = ' ';
  assert.doesNotThrow(() =>
    assertRecordsMatchTree(
      state.records,
      nodesOf(state.records),
      tokenListsOf(state.records)
    )
  );
});
