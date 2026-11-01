import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postcss from 'postcss';
import { enableConsistencyChecks } from '../../../../../src/passes/ir/consistencyChecks.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { Slot } from '../../../../../src/passes/merge/lib/rules/blockRecords.js';
import { BlockRecord } from '../../../../../src/passes/merge/lib/rules/blockRecord.js';
/** @import {BlockRecords} from '../../../../../src/passes/merge/lib/rules/blockRecords.js' */
import {
  assertSweepLowers,
  sweepPotential,
} from '../../../../../src/passes/merge/lib/rules/sweepPotential.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import {
  buildRecords,
  remove,
  takePlaceOf,
} from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import {
  assertRecordsMatchTree,
  writeBack,
} from '../../../../../src/passes/merge/lib/rules/writeBack.js';
import { assertRecordsWellFormed } from '../../../../../src/passes/merge/lib/rules/recordsCheck.js';
import { assertNoOverDuplication } from '../../../../../src/passes/merge/lib/rules/overDuplication.js';
import { mergePass } from '../../../../../src/passes/merge/index.js';
import { joinNonAdjacent } from '../../../../../src/passes/merge/lib/rules/nonAdjacentMerge.js';
import runScan from '../../../../../src/passes/merge/lib/rules/scan.js';
import RuleSequence from '../../../../../src/passes/merge/lib/rules/ruleSequence.js';
import { ruleRecordOf, blockRecordOf } from './liveRecords.js';

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
    blockRecordOf(state.records, /** @type {any} */ (root.first))
  );
  const [first, second] = media.children;
  assert.ok(first instanceof Slot);
  assert.ok(second instanceof Slot);
  assert.equal(state.records.rule(first.rules[0]).node.selector, 'a');
  assert.equal(state.records.rule(second.rules[0]).node.selector, 'b');
  assert.equal(state.records.slotOf(state.records.rule(first.rules[0])), first);
});

test('buildRecords should give a rule that holds a rule a block record for its children', () => {
  const { root, state } = setup('a{color:red;b{width:1px}}');
  const rule = /** @type {Rule} */ (root.first);
  const block = state.records.block(ruleRecordOf(state.records, rule).block);
  assert.ok(block instanceof BlockRecord);
  assert.equal(block.node, rule);
  assert.equal(block.parent, state.records.root.index);
});

test('buildRecords should leave a rule with only declarations without a block record', () => {
  const { root, state } = setup('a{color:red}');
  assert.equal(ruleRecordOf(state.records, root.first).block, -1);
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
    blockRecordOf(state.records, /** @type {any} */ (root.first))
  );
  const [first, second] = /** @type {Slot[]} */ (media.children);
  state.records.rule(first.rules[0]).place(second.block, second.position);
  assert.throws(() => assertRecordsMatchTree(state), /out of step/v);
});

test('assertRecordsMatchTree should throw when a block chain lacks a child the tree holds', () => {
  const { root, state } = setup('@media print{a{color:red}}');
  const media = /** @type {BlockRecord} */ (
    blockRecordOf(state.records, /** @type {any} */ (root.first))
  );
  state.records.links.unlink(
    ruleRecordOf(state.records, /** @type {Rule} */ (media.node.first)).index
  );
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
  writeBack(state.records, state.records.blocks());
  assert.deepEqual(
    state.records.liveChildren(state.records.root.index),
    root.nodes
  );
});

test('liveChildren should equal the children of the stylesheet after a join moves a block', () => {
  const { root, state } = setup(
    '@media print{a{color:red}}@media print{b{width:1px}}'
  );
  joinNonAdjacent(state.records.root, state);
  writeBack(state.records, state.records.blocks());
  assert.deepEqual(
    state.records.liveChildren(state.records.root.index),
    root.nodes
  );
});

test('liveChildren should equal the children of the stylesheet after a join removes a rule', () => {
  const { root, state } = setup('a{color:red}b{color:red}');
  joinNonAdjacent(state.records.root, state);
  writeBack(state.records, state.records.blocks());
  assert.deepEqual(
    state.records.liveChildren(state.records.root.index),
    root.nodes
  );
});

/**
 * The live child count of the stylesheet before and after one `joinNonAdjacent`.
 *
 * @param {string} css
 * @return {{was: number, now: number}}
 */
function liveCountAround(css) {
  const { state } = setup(css);
  const was = state.records.liveChildren(state.records.root.index).length;
  joinNonAdjacent(state.records.root, state);
  return {
    was,
    now: state.records.liveChildren(state.records.root.index).length,
  };
}

test('joinNonAdjacent should leave fewer live children when a rule joins the rule before it', () => {
  const { was, now } = liveCountAround('a{color:red}a{width:1px}');
  assert.ok(now < was);
});

test('joinNonAdjacent should leave fewer live children when a rule moves down onto a later rule', () => {
  const { was, now } = liveCountAround('a{color:red}b{width:2px}a{width:3px}');
  assert.ok(now < was);
});

test('joinNonAdjacent should leave fewer live children when a block joins the block before it', () => {
  const { was, now } = liveCountAround(
    '@media print{a{color:red}}@media print{b{width:1px}}'
  );
  assert.ok(now < was);
});

test('joinNonAdjacent should leave fewer live children when a block moves down onto a later block', () => {
  const { was, now } = liveCountAround(
    '@media print{a{color:red}}b{width:2px}@media print{c{width:3px}}'
  );
  assert.ok(now < was);
});

test('liveChildren should return a fresh array of the children, not the entries', () => {
  const { state } = setup('a{color:red}');
  const children = state.records.liveChildren(state.records.root.index);
  children.length = 0;
  assert.equal(state.records.liveChildren(state.records.root.index).length, 1);
});

/**
 * Whether each slot and nested record of a block holds its index among the
 * entries as position. A raw node has no position.
 *
 * @param {BlockRecords} records
 * @param {BlockRecord} block
 * @return {boolean}
 */
function positionsMatchIndex(records, block) {
  return block.children.every((entry, index) => {
    if (entry instanceof Slot) return entry.position === index;
    if (typeof entry === 'number') {
      return (
        /** @type {BlockRecord} */ (records.block(entry)).position === index
      );
    }
    return true;
  });
}

test('an entry should hold its index as position after a move of children', () => {
  const { root, state } = setup(
    '@media print{a{color:red}}@media print{b{width:1px}}'
  );
  const [first, second] = /** @type {Container} */ (root).nodes;
  state.records.adopt(
    blockRecordOf(state.records, first).index,
    blockRecordOf(state.records, second).index
  );
  assert.equal(
    positionsMatchIndex(state.records, blockRecordOf(state.records, first)),
    true
  );
});

test('an entry should hold its index as position after a join takes the place of a block', () => {
  const { root, state } = setup(
    'a{color:red}@media print{b{width:1px}}@media print{c{height:1px}}'
  );
  const [, earlier, later] = /** @type {Container} */ (root).nodes;
  takePlaceOf(
    state,
    root,
    blockRecordOf(state.records, earlier),
    blockRecordOf(state.records, later)
  );
  assert.equal(positionsMatchIndex(state.records, state.records.root), true);
});

test('an entry should hold its index as position after a removal of a block', () => {
  const { root, state } = setup(
    'a{color:red}@media print{b{width:1px}}c{height:1px}'
  );
  const [, media] = /** @type {Container} */ (root).nodes;
  remove(state.records, blockRecordOf(state.records, media));
  assert.equal(positionsMatchIndex(state.records, state.records.root), true);
});

test('an entry should hold its index as position after a rule moves to the end of a block', () => {
  const { root, state } = setup('@media print{a{color:red}}b{width:1px}');
  const [media] = /** @type {Container} */ (root).nodes;
  const rule = /** @type {Rule} */ (/** @type {any} */ (media).first);
  state.records.moveRule(
    state.records.root.index,
    ruleRecordOf(state.records, rule).index
  );
  assert.equal(positionsMatchIndex(state.records, state.records.root), true);
});

test('assertRecordsWellFormed should throw when an entry holds a position other than its index', () => {
  const { state } = setup('a{color:red}b{width:1px}');
  state.records.root.children[1].position = 5;
  assert.throws(() => assertRecordsWellFormed(state), /out of step/v);
});

test('a sweep should keep the positions the records hold rather than resetting them', () => {
  const { state } = setup('a{color:red}b{width:1px}');
  state.records.root.children[1].position = 5;
  new RuleSequence(state.records);
  assert.throws(() => assertRecordsWellFormed(state), /out of step/v);
});

test('assertSweepLowers should throw when a sweep moved a rule and the potential stayed equal', () => {
  assert.throws(
    () => assertSweepLowers([2, 2, 3], [2, 2, 3], true),
    /potential/v
  );
});

test('assertSweepLowers should throw when a sweep raised the potential', () => {
  assert.throws(
    () => assertSweepLowers([2, 2, 3], [2, 3, 2], false),
    /potential/v
  );
});

test('assertSweepLowers should accept a move that lowers the parent count alone', () => {
  assert.doesNotThrow(() => assertSweepLowers([2, 2, 3], [2, 2, 2], true));
});

test('runScan should keep the declaration and rule counts and lower the parent count of a pure move', () => {
  const { state } = setup(
    '@media print{.a{color:red}}@media print{.b{color:blue}}'
  );
  const potentialBefore = sweepPotential(state.records);
  runScan(state);
  const potentialAfter = sweepPotential(state.records);
  assert.deepEqual(potentialBefore, [2, 2, 3]);
  assert.deepEqual(potentialAfter, [2, 2, 2]);
});

test('assertNoOverDuplication should accept records built from a stylesheet that repeats a declaration', () => {
  const { state } = setup('a{color:red}b{color:red}');
  assert.doesNotThrow(() => assertNoOverDuplication(state.records));
});

test('assertNoOverDuplication should throw when a declaration is written more often than the input wrote it', () => {
  const { root, state } = setup('a{color:red}');
  const rule = /** @type {Rule} */ (root.first);
  const record = ruleRecordOf(state.records, rule);
  const added = postcss.decl({ prop: 'color', value: 'red' });
  record.append(
    state.records.declarationRecord(
      added,
      state.properties,
      state.declarationIds
    )
  );
  assert.throws(
    () => assertNoOverDuplication(state.records),
    /more often than the input/v
  );
});

test('firstLiveChild should give the node after the first rule once that rule is unlinked', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const media = blockRecordOf(state.records, /** @type {any} */ (root.first));
  const first = ruleRecordOf(
    state.records,
    /** @type {Rule} */ (media.node.first)
  );
  state.records.links.unlink(first.index);
  assert.equal(state.records.firstLiveChild(media.index), media.node.nodes[1]);
});
