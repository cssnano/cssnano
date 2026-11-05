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
} from './liveRecords.js';

/**
 * @param {string} css
 */
function setup(css) {
  const root = postcss.parse(css);
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildTestRecords(root, state);
  return state;
}

/**
 * The indices of the rules of the stylesheet, in document order.
 *
 * @param {MergeState['records']} records
 * @return {number[]}
 */
function ruleIndices(records) {
  return records
    .liveEntries(records.root.index)
    .map((entry) => /** @type {{index: number}} */ (entry).index);
}

test('a sweep should link the rules of the stylesheet by index, from the head', () => {
  const { records } = setup('a{color:red}b{width:1px}c{top:0}');
  const [a, b, c] = ruleIndices(records);
  const sequence = new RuleSequence(records);
  assert.equal(sequence.head, a);
  assert.equal(sequence.nextOf(a), b);
  assert.equal(sequence.nextOf(b), c);
  assert.equal(sequence.nextOf(c), -1);
  assert.equal(sequence.prevOf(a), -1);
  assert.equal(sequence.prevOf(c), b);
});

test('a sweep over a stylesheet without rules should have no head', () => {
  const { records } = setup('@media print{}');
  assert.equal(new RuleSequence(records).head, -1);
});

test('replacePair should link a rule made mid-sweep at its own index, between its neighbors', () => {
  const state = setup('a{color:red}b{width:1px}c{top:0}');
  const { records } = state;
  const [a, , c] = ruleIndices(records);
  const sequence = new RuleSequence(records);
  // A rule made mid-sweep takes the next index, past every link the sweep made.
  const added = records.recordRule(postcss.rule({ selector: 'x' }), ['x'], 'x');
  sequence.replacePair(a, {
    first: [a],
    second: [added.index],
  });
  assert.equal(sequence.nextOf(a), added.index);
  assert.equal(sequence.prevOf(added.index), a);
  assert.equal(sequence.nextOf(added.index), c);
  assert.equal(sequence.prevOf(c), added.index);
});

test('a sweep move that empties a nested at-rule block should unlink it and then its emptied parent', () => {
  const state = setup('@layer outer{@layer inner{b{width:1px}}}p{color:red}');
  const { records } = state;
  const [outer, p] = /** @type {any[]} */ (state.records.root.node.nodes);
  const inner = outer.first;
  const innerBlock = blockRecordOf(records, inner);
  const outerBlock = blockRecordOf(records, outer);
  new RuleSequence(records).moveIntoParent(
    ruleRecordOf(records, p).index,
    ruleRecordOf(records, inner.first).index
  );
  assert.equal(records.links.parentOf(innerBlock.index), -1);
  assert.equal(records.links.parentOf(outerBlock.index), -1);
});

test('a sweep that empties an at-rule nested in a rule should unlink the at-rule and leave the rule in its chain, with a lower count', () => {
  const state = setup('a{@layer inner{b{width:1px}}}p{color:red}');
  const { records } = state;
  const [a, p] = /** @type {any[]} */ (records.root.node.nodes);
  const innerBlock = blockRecordOf(records, a.first);
  const nesting = ruleRecordOf(records, a);
  new RuleSequence(records).moveIntoParent(
    ruleRecordOf(records, p).index,
    ruleRecordOf(records, a.first.first).index
  );
  assert.equal(records.links.parentOf(innerBlock.index), -1);
  assert.equal(records.links.parentOf(nesting.index), records.root.index);
  assert.equal(nesting.count, 0);
});
