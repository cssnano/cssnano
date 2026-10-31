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
