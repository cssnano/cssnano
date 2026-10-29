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
  moveChildren,
  remove,
  takePlaceOf,
} from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import { mergePass } from '../../../../../src/passes/merge/index.js';
import { joinNonAdjacent } from '../../../../../src/passes/merge/lib/rules/nonAdjacentMerge.js';
import runScan from '../../../../../src/passes/merge/lib/rules/scan.js';
import RuleSequence from '../../../../../src/passes/merge/lib/rules/ruleSequence.js';

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

test('liveChildren should equal the children of the stylesheet after a sweep drops a block', () => {
  const { root, state } = setup(
    '@media print{a{color:red}}@media print{a{color:red}}'
  );
  runScan(state);
  assert.deepEqual(state.records.root.liveChildren(), root.nodes);
});

test('liveChildren should equal the children of the stylesheet after a join moves a block', () => {
  const { root, state } = setup(
    '@media print{a{color:red}}@media print{b{width:1px}}'
  );
  joinNonAdjacent(root, state);
  assert.deepEqual(state.records.root.liveChildren(), root.nodes);
});

test('liveChildren should equal the children of the stylesheet after a join removes a rule', () => {
  const { root, state } = setup('a{color:red}b{color:red}');
  joinNonAdjacent(root, state);
  assert.deepEqual(state.records.root.liveChildren(), root.nodes);
});

test('liveChildren should return a fresh array of the children, not the entries', () => {
  const { state } = setup('a{color:red}');
  const children = state.records.root.liveChildren();
  children.length = 0;
  assert.equal(state.records.root.liveChildren().length, 1);
});

test('Slot#substitute should replace the rule in its slot and place the replacements there', () => {
  const { root, state } = setup('@media print{a{color:red}}');
  const [media] = /** @type {Root} */ (root).nodes;
  const rule = /** @type {Rule} */ (/** @type {any} */ (media).first);
  const slot = /** @type {Slot} */ (state.meta(rule).slot);
  const replacement = postcss.rule({ selector: 'b' });
  media.append(replacement);
  slot.substitute(rule, [replacement], state.records);
  assert.deepEqual(slot.rules, [replacement]);
  assert.equal(state.meta(replacement).slot, slot);
});

test('moveRule should place the record of the moved rule in a new slot at the end of the target', () => {
  const { root, state } = setup('@media print{a{color:red}}b{width:1px}');
  const [media] = /** @type {Root} */ (root).nodes;
  const rule = /** @type {Rule} */ (/** @type {any} */ (media).first);
  const from = /** @type {Slot} */ (state.meta(rule).slot);
  const target = state.records.root;
  const slot = target.moveRule(rule, from, state.records);
  assert.equal(state.meta(rule).slot, slot);
  assert.equal(slot.block, target);
  assert.equal(target.children.at(-1), slot);
});

test('moveRule should leave the rule out of the slot it came from', () => {
  const { root, state } = setup('@media print{a{color:red}}');
  const [media] = /** @type {Root} */ (root).nodes;
  const rule = /** @type {Rule} */ (/** @type {any} */ (media).first);
  const from = /** @type {Slot} */ (state.meta(rule).slot);
  state.records.root.moveRule(rule, from, state.records);
  assert.deepEqual(from.rules, []);
});

/**
 * Whether each slot and nested record of a block holds its index among the
 * entries as position. A raw node has no position.
 *
 * @param {BlockRecord} block
 * @return {boolean}
 */
function positionsMatchIndex(block) {
  return block.children.every(
    (entry, index) =>
      !(entry instanceof Slot || entry instanceof BlockRecord) ||
      entry.position === index
  );
}

test('an entry should hold its index as position after a move of children', () => {
  const { root, state } = setup(
    '@media print{a{color:red}}@media print{b{width:1px}}'
  );
  const [first, second] = /** @type {Container} */ (root).nodes;
  moveChildren(state, first, second);
  assert.equal(positionsMatchIndex(state.records.blockOf(first)), true);
});

test('an entry should hold its index as position after a join takes the place of a block', () => {
  const { root, state } = setup(
    'a{color:red}@media print{b{width:1px}}@media print{c{height:1px}}'
  );
  const [, earlier, later] = /** @type {Container} */ (root).nodes;
  takePlaceOf(state, root, earlier, later);
  assert.equal(positionsMatchIndex(state.records.root), true);
});

test('an entry should hold its index as position after a removal of a block', () => {
  const { root, state } = setup(
    'a{color:red}@media print{b{width:1px}}c{height:1px}'
  );
  const [, media] = /** @type {Container} */ (root).nodes;
  remove(state, media);
  assert.equal(positionsMatchIndex(state.records.root), true);
});

test('an entry should hold its index as position after a rule moves to the end of a block', () => {
  const { root, state } = setup('@media print{a{color:red}}b{width:1px}');
  const [media] = /** @type {Container} */ (root).nodes;
  const rule = /** @type {Rule} */ (/** @type {any} */ (media).first);
  const from = /** @type {Slot} */ (state.meta(rule).slot);
  state.records.root.moveRule(rule, from, state.records);
  assert.equal(positionsMatchIndex(state.records.root), true);
});

test('assertRecordsMatchTree should throw when an entry holds a position other than its index', () => {
  const { state } = setup('a{color:red}b{width:1px}');
  state.records.root.children[1].position = 5;
  assert.throws(() => assertRecordsMatchTree(state), /out of step/v);
});

test('a sweep should keep the positions the records hold rather than resetting them', () => {
  const { state } = setup('a{color:red}b{width:1px}');
  state.records.root.children[1].position = 5;
  new RuleSequence(state.records);
  assert.throws(() => assertRecordsMatchTree(state), /out of step/v);
});
