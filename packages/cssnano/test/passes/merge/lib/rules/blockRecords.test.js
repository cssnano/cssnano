import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postcss from 'postcss';
import { enableConsistencyChecks } from '../../../../../src/passes/ir/consistencyChecks.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import {
  BlockRecord,
  Slot,
} from '../../../../../src/passes/merge/lib/rules/blockRecords.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import {
  assertRecordsMatchTree,
  buildRecords,
} from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import { mergePass } from '../../../../../src/passes/merge/index.js';

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

test('buildRecords should hold each rule of a block in its own slot, in order', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const media = /** @type {BlockRecord} */ (
    state.records.blockOf(/** @type {any} */ (root.first))
  );
  const [first, second] = media.children;
  assert.ok(first instanceof Slot);
  assert.ok(second instanceof Slot);
  assert.equal(first.rules[0].selector, 'a');
  assert.equal(second.rules[0].selector, 'b');
  assert.equal(state.meta(first.rules[0]).slot, first);
});

test('buildRecords should give a rule that holds a rule a block record for its children', () => {
  const { root, state } = setup('a{color:red;b{width:1px}}');
  const rule = /** @type {Rule} */ (root.first);
  const block = state.meta(rule).block;
  assert.ok(block instanceof BlockRecord);
  assert.equal(block.node, rule);
  assert.equal(block.parent, state.records.root);
});

test('buildRecords should leave a rule with only declarations without a block record', () => {
  const { root, state } = setup('a{color:red}');
  assert.equal(state.meta(/** @type {Rule} */ (root.first)).block, null);
});

test('assertRecordsMatchTree should accept records built from a stylesheet', () => {
  const { state } = setup(
    '@media (x){@media (y){p{width:1px}q{height:2px}}}a{color:red;b{width:1px}}'
  );
  assert.doesNotThrow(() => assertRecordsMatchTree(state));
});

test('assertRecordsMatchTree should throw when a rule record names a slot the rule is not in', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const media = /** @type {BlockRecord} */ (
    state.records.blockOf(/** @type {any} */ (root.first))
  );
  const [first, second] = /** @type {Slot[]} */ (media.children);
  state.meta(first.rules[0]).place(second);
  assert.throws(() => assertRecordsMatchTree(state), /out of step/v);
});

test('assertRecordsMatchTree should throw when a block record holds a child the tree lacks', () => {
  const { root, state } = setup('@media print{a{color:red}}');
  const media = /** @type {BlockRecord} */ (
    state.records.blockOf(/** @type {any} */ (root.first))
  );
  const [slot] = /** @type {Slot[]} */ (media.children);
  slot.rules.length = 0;
  assert.throws(() => assertRecordsMatchTree(state), /out of step/v);
});

test('the merge pass should keep the records in step with the tree through its joins', () => {
  // Nested at-rules whose blocks join, and rules that join across them, each
  // visit a sweep and a join that edit records.
  const css =
    '@media (x){a{color:red}@media (y){b{width:1px}}c{color:blue}}@media (x){d{height:2px}@media (y){e{width:3px}}}';
  const root = postcss.parse(css);
  assert.doesNotThrow(() => mergePass(root, ['chrome 120']));
});
