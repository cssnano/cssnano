import { childEntriesOf } from '../../../../../src/passes/merge/lib/rules/blockChildren.js';
import assert from 'node:assert/strict';
import { buildTestRecords, nodesOf, tokenListsOf } from './liveRecords.js';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import RuleSequence from '../../../../../src/passes/merge/lib/rules/ruleSequence.js';
import { assertRecordsMatchTree } from '../../../../../src/passes/merge/lib/rules/treeMatch.js';
import { writeBack } from '../../../../../src/passes/merge/lib/rules/writeBack.js';
import { TextTable } from '../../../../../src/values/textTable.js';

/** @import {Container, Root} from 'postcss' */

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

test('a second write-back should leave the child array of a block that already matches as it is', () => {
  const { root, state } = setup(
    '@media (x){a{color:red}}@media (y){b{width:1px}}'
  );
  const sequence = new RuleSequence(state.records);
  const first = sequence.head;
  sequence.moveIntoParent(state.records, first, sequence.nextOf(first));
  writeBack(state.records, nodesOf(state.records));
  const media = /** @type {Container} */ (root.first);
  const kept = media.nodes;
  writeBack(state.records, nodesOf(state.records));
  assert.equal(media.nodes, kept);
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
  writeBack(state.records, nodesOf(state.records));
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
  writeBack(state.records, nodesOf(state.records));
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
  writeBack(state.records, nodesOf(state.records));
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
