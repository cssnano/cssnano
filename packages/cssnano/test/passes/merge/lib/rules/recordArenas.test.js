import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import postcss from 'postcss';
import { enableConsistencyChecks } from '../../../../../src/passes/ir/consistencyChecks.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import {
  BlockRecord,
  Slot,
} from '../../../../../src/passes/merge/lib/rules/blockRecords.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import RuleSequence from '../../../../../src/passes/merge/lib/rules/ruleSequence.js';
import { buildRecords } from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import { ruleRecordOf } from './liveRecords.js';

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

/**
 * Every block record reached from `block` through its slots and nested blocks.
 *
 * @param {BlockRecord} block
 * @param {BlockRecord[]} found
 * @return {BlockRecord[]}
 */
function reachedBlocks(block, found = [block]) {
  for (const entry of block.children) {
    if (entry instanceof Slot) {
      for (const record of entry.rules) {
        if (record.block) {
          found.push(record.block);
          reachedBlocks(record.block, found);
        }
      }
    } else if (entry instanceof BlockRecord) {
      found.push(entry);
      reachedBlocks(entry, found);
    }
  }
  return found;
}

test('buildRecords should index the stylesheet as block 0 and each rule from 0 in order', () => {
  const { state } = setup('a{color:red}b{width:1px}');
  const { records } = state;
  assert.equal(records.root.index, 0);
  assert.equal(records.rule(0).node.selector, 'a');
  assert.equal(records.rule(1).node.selector, 'b');
  assert.equal(records.rule(2), undefined);
});

test('a rule should keep its index and stay readable through rule(i) after it departs', () => {
  const { root, state } = setup('a{color:red}b{width:1px}');
  const record = ruleRecordOf(state.records, /** @type {Rule} */ (root.first));
  const { index } = record;
  record.depart();
  assert.equal(record.index, index);
  assert.equal(state.records.rule(index), record);
  assert.equal(record.departed, true);
});

test('a rule recorded mid-run should take the next index after the rules already recorded', () => {
  const { state } = setup('a{color:red}b{width:1px}');
  const { records } = state;
  const previous = records.rule(1).index;
  const added = records.recordRule(
    postcss.rule({ selector: 'c' }),
    state.properties,
    state.declarationIds
  );
  assert.equal(added.index, previous + 1);
  assert.equal(records.rule(added.index), added);
});

test('blocks() should hold every block reached from the stylesheet record, each at its index', () => {
  const { state } = setup(
    '@media (x){@media (y){p{width:1px}q{height:2px}}}a{color:red;b{width:1px}}'
  );
  const { records } = state;
  const reached = reachedBlocks(records.root);
  const indexed = [...records.blocks()];
  assert.equal(reached.length, indexed.length);
  for (const block of reached) {
    assert.ok(indexed.includes(block));
    assert.equal(records.block(block.index), block);
  }
});

/**
 * Whether `holder` holds the entry of `block`: the block itself, or a rule
 * whose nested block it is.
 *
 * @param {BlockRecord} holder
 * @param {BlockRecord} block
 * @return {boolean}
 */
function holds(holder, block) {
  return holder.children.some(
    (entry) =>
      entry === block ||
      (entry instanceof Slot &&
        entry.rules.some((rule) => rule.block === block))
  );
}

test('a block should name the block that holds its entry by index, -1 for the stylesheet', () => {
  const { state } = setup(
    '@media (x){@media (y){p{width:1px}}}a{color:red;b{width:1px}}'
  );
  const { records } = state;
  assert.equal(records.root.parent, -1);
  for (const block of reachedBlocks(records.root)) {
    if (block !== records.root) {
      assert.ok(holds(records.block(block.parent), block));
    }
  }
});

test('a slot should name its block by index and stand at its position in that block', () => {
  const { state } = setup('@media (x){p{width:1px}q{height:2px}}a{color:red}');
  const { records } = state;
  for (const block of reachedBlocks(records.root)) {
    for (const [position, entry] of block.children.entries()) {
      if (entry instanceof Slot) {
        assert.equal(records.block(entry.block), block);
        assert.equal(entry.position, position);
      }
    }
  }
});

test('changed should tell the parent by index once a droppable block goes empty', () => {
  const { state } = setup('@layer outer{@layer inner{a{color:red}}}');
  const { records } = state;
  // The stylesheet is block 0, so the outer and inner at-rules are 1 and 2.
  const outer = /** @type {BlockRecord} */ (records.block(1));
  const inner = /** @type {BlockRecord} */ (records.block(2));
  new RuleSequence(records);
  records.changed(inner.index, -1);
  assert.equal(inner.remaining, 0);
  assert.equal(outer.remaining, 0);
});
