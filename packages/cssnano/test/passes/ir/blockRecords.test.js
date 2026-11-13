import { declarationsOf } from '../../../src/passes/ir/blockChildren.js';
import { selectorIdsOf } from '../merge/lib/rules/selectorIdsOf.js';
import { SelectorIds } from '../../../src/passes/ir/selectorIds.js';
import { assertRecordsMatchTree } from '../../../src/passes/ir/treeMatch.js';
import { childNodesOf, writeBack } from '../../../src/passes/ir/writeBack.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
/** @import {BlockRecord} from '../../../src/passes/ir/blockRecord.js' */
/** @import {BlockRecords} from '../../../src/passes/ir/blockRecords.js' */
/** @import {BlockLinks} from '../../../src/passes/ir/blockLinks.js' */
import MergeState from '../../../src/passes/merge/lib/rules/mergeState.js';
import { remove, takePlaceOf } from '../../../src/passes/ir/treeEdits.js';
import { assertRecordsWellFormed } from '../../../src/passes/ir/recordsCheck.js';
import { mergePass } from '../../../src/passes/merge/index.js';
import { joinNonAdjacent } from '../../../src/passes/merge/lib/rules/nonAdjacentMerge.js';
import runScan from '../../../src/passes/merge/lib/rules/scan.js';
import {
  ruleRecordOf,
  blockRecordOf,
  buildTestRecords,
  placeUnlinked,
  nodesOf,
  nodeOfEntry,
  tokenListsOf,
} from '../merge/lib/rules/liveRecords.js';
import { adopt, moveRule } from '../../../src/passes/ir/arenaEdits.js';
import { TextTable } from '../../../src/values/textTable.js';
import { RuleRecord } from '../../../src/passes/ir/ruleRecord.js';
import { nodeOf } from '../../../src/passes/ir/nodeTable.js';
import { TokenLists } from '../../../src/passes/ir/tokenLists.js';

const selectorIds = new SelectorIds();
const tokenLists = new TokenLists();

/** @import {Container, Root, Rule} from 'postcss' */

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

test('buildRecords should link the rules of a block in document order', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const media = blockRecordOf(state.records, /** @type {any} */ (root.first));
  const [a, b] = /** @type {Rule[]} */ (
    nodeOfEntry(state.records, media).nodes
  );
  const { links } = state.records;
  const first = links.firstChild(media.index);
  assert.equal(first, ruleRecordOf(state.records, a).index);
  assert.equal(links.nextSibling(first), ruleRecordOf(state.records, b).index);
});

test('buildRecords should link the children of a rule that holds a rule into the rule itself', () => {
  const { root, state } = setup('a{color:red;b{width:1px}}');
  const record = ruleRecordOf(state.records, /** @type {Rule} */ (root.first));
  const { links } = state.records;
  const declaration = links.firstChild(record.index);
  assert.equal(links.parentOf(declaration), record.index);
  assert.equal(links.firstChild(record.index), declaration);
  assert.equal(links.childCount(record.index), 2);
});

test('buildRecords should give a rule with only declarations the context -1 of a plain rule', () => {
  const { root, state } = setup('a{color:red}');
  assert.equal(ruleRecordOf(state.records, root.first).context, -1);
});

test('assertRecordsMatchTree should accept records built from a stylesheet', () => {
  const { state } = setup(
    '@media (x){@media (y){p{width:1px}q{height:2px}}}a{color:red;b{width:1px}}'
  );
  assert.doesNotThrow(() =>
    assertRecordsMatchTree(
      state.records,
      nodesOf(state.records),
      tokenListsOf(state.records)
    )
  );
});

test('assertRecordsMatchTree should throw when the chain holds the rules in another order than the tree', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const media = /** @type {BlockRecord} */ (
    blockRecordOf(state.records, /** @type {any} */ (root.first))
  );
  const [a] = /** @type {Rule[]} */ (nodeOfEntry(state.records, media).nodes);
  moveRule(state.records, media.index, ruleRecordOf(state.records, a).index);
  assert.throws(
    () =>
      assertRecordsMatchTree(
        state.records,
        nodesOf(state.records),
        tokenListsOf(state.records)
      ),
    /out of step/v
  );
});

test('assertRecordsMatchTree should throw when a block chain lacks a child the tree holds', () => {
  const { root, state } = setup('@media print{a{color:red}}');
  const media = /** @type {BlockRecord} */ (
    blockRecordOf(state.records, /** @type {any} */ (root.first))
  );
  state.records.detach(
    ruleRecordOf(
      state.records,
      /** @type {Rule} */ (nodeOfEntry(state.records, media).first)
    ).index
  );
  assert.throws(
    () =>
      assertRecordsMatchTree(
        state.records,
        nodesOf(state.records),
        tokenListsOf(state.records)
      ),
    /out of step/v
  );
});

test('the tree check throws when a built entry has no node', () => {
  const { root, state } = setup('@media print{a{color:red}}');
  const media = blockRecordOf(state.records, /** @type {any} */ (root.first));
  const rule = ruleRecordOf(
    state.records,
    /** @type {Rule} */ (nodeOfEntry(state.records, media).first)
  );
  const declaration = state.records.links.firstChild(rule.index);
  for (const index of [media.index, declaration]) {
    const nodes = nodesOf(state.records);
    const saved = nodes[index];
    nodes[index] = undefined;
    assert.throws(
      () =>
        assertRecordsMatchTree(
          state.records,
          nodes,
          tokenListsOf(state.records)
        ),
      /out of step|stale/v
    );
    nodes[index] = saved;
  }
});

test('the merge pass should keep the records in step with the tree through its joins', () => {
  // Nested at-rules whose blocks join, and rules that join across them, each
  // visit a sweep and a join that edit records.
  const css =
    '@media (x){a{color:red}@media (y){b{width:1px}}c{color:blue}}@media (x){d{height:2px}@media (y){e{width:3px}}}';
  const root = postcss.parse(css);
  assert.doesNotThrow(() => mergePass(root, ['chrome 120']));
});

test('childNodesOf should equal the children of the stylesheet after a sweep drops a block', () => {
  const { root, state } = setup(
    '@media print{a{color:red}}@media print{a{color:red}}'
  );
  runScan(state);
  writeBack(state.records, nodesOf(state.records), state.tokenLists);
  assert.deepEqual(
    childNodesOf(
      state.records,
      nodesOf(state.records),
      state.records.root.index
    ),
    root.nodes
  );
});

test('childNodesOf should equal the children of the stylesheet after a join moves a block', () => {
  const { root, state } = setup(
    '@media print{a{color:red}}@media print{b{width:1px}}'
  );
  joinNonAdjacent(state.records.root, state);
  writeBack(state.records, nodesOf(state.records), state.tokenLists);
  assert.deepEqual(
    childNodesOf(
      state.records,
      nodesOf(state.records),
      state.records.root.index
    ),
    root.nodes
  );
});

test('childNodesOf should equal the children of the stylesheet after a join removes a rule', () => {
  const { root, state } = setup('a{color:red}b{color:red}');
  joinNonAdjacent(state.records.root, state);
  writeBack(state.records, nodesOf(state.records), state.tokenLists);
  assert.deepEqual(
    childNodesOf(
      state.records,
      nodesOf(state.records),
      state.records.root.index
    ),
    root.nodes
  );
});

/**
 * The live child count of the stylesheet before and after one `joinNonAdjacent`.
 *
 * @param {string} css
 * @return {{was: number, now: number}}
 */
function childCountAround(css) {
  const { state } = setup(css);
  const was = childNodesOf(
    state.records,
    nodesOf(state.records),
    state.records.root.index
  ).length;
  joinNonAdjacent(state.records.root, state);
  return {
    was,
    now: childNodesOf(
      state.records,
      nodesOf(state.records),
      state.records.root.index
    ).length,
  };
}

test('joinNonAdjacent should leave fewer live children when a rule joins the rule before it', () => {
  const { was, now } = childCountAround('a{color:red}a{width:1px}');
  assert.ok(now < was);
});

test('joinNonAdjacent should leave fewer live children when a rule moves down onto a later rule', () => {
  const { was, now } = childCountAround('a{color:red}b{width:2px}a{width:3px}');
  assert.ok(now < was);
});

test('joinNonAdjacent should leave fewer live children when a block joins the block before it', () => {
  const { was, now } = childCountAround(
    '@media print{a{color:red}}@media print{b{width:1px}}'
  );
  assert.ok(now < was);
});

test('joinNonAdjacent should leave fewer live children when a block moves down onto a later block', () => {
  const { was, now } = childCountAround(
    '@media print{a{color:red}}b{width:2px}@media print{c{width:3px}}'
  );
  assert.ok(now < was);
});

test('childNodesOf should return a fresh array of the children, not the entries', () => {
  const { state } = setup('a{color:red}');
  const children = childNodesOf(
    state.records,
    nodesOf(state.records),
    state.records.root.index
  );
  children.length = 0;
  assert.equal(
    childNodesOf(
      state.records,
      nodesOf(state.records),
      state.records.root.index
    ).length,
    1
  );
});

test('the chains should stay well formed after a move of children', () => {
  const { root, state } = setup(
    '@media print{a{color:red}}@media print{b{width:1px}}'
  );
  const [first, second] = /** @type {Container} */ (root).nodes;
  adopt(
    state.records,
    blockRecordOf(state.records, first).index,
    blockRecordOf(state.records, second).index
  );
  assertRecordsWellFormed(state);
});

test('the chains should stay well formed after a join takes the place of a block', () => {
  const { root, state } = setup(
    'a{color:red}@media print{b{width:1px}}@media print{}'
  );
  const [, earlier, later] = /** @type {Container} */ (root).nodes;
  takePlaceOf(
    state.records,
    blockRecordOf(state.records, earlier).index,
    blockRecordOf(state.records, later).index
  );
  assertRecordsWellFormed(state);
});

test('the chains should stay well formed after a removal of a block', () => {
  const { root, state } = setup('a{color:red}@media print{}c{height:1px}');
  const [, media] = /** @type {Container} */ (root).nodes;
  remove(state.records, blockRecordOf(state.records, media).index);
  assertRecordsWellFormed(state);
});

test('records.rule should throw under consistency checks for a rule inside a block that a removal dropped', () => {
  const { root, state } = setup('@media print{a{color:red}}b{width:1px}');
  const [media] = /** @type {Container} */ (root).nodes;
  const rule = /** @type {Rule} */ (/** @type {any} */ (media).first);
  const { index } = ruleRecordOf(state.records, rule);
  remove(state.records, blockRecordOf(state.records, media).index);
  assert.throws(() => state.records.rule(index), /does not reach/v);
});

test('records.rule should throw under consistency checks for a plain rule unlinked without departing', () => {
  const { root, state } = setup('a{color:red}');
  const rule = ruleRecordOf(state.records, /** @type {Rule} */ (root.first));
  state.records.detach(rule.index);
  assert.throws(() => state.records.rule(rule.index), /does not reach/v);
});

test('moveLast into a plain rule that is linked nowhere should throw under consistency checks', () => {
  const { root, state } = setup('a{color:red}');
  const rule = ruleRecordOf(state.records, /** @type {Rule} */ (root.first));
  const [declaration] = declarationsOf(state.records, rule.index);
  const orphan = placeUnlinked(
    state.records,
    state.records.root.index,
    new RuleRecord('', selectorIdsOf(selectorIds, tokenLists, ['b']))
  );
  state.records.detach(declaration.index);
  assert.throws(
    () => state.records.moveLast(orphan.index, declaration.index),
    /outside the tree/v
  );
});

test('the chains should stay well formed after a rule moves to the end of a block', () => {
  const { root, state } = setup('@media print{a{color:red}}b{width:1px}');
  const [media] = /** @type {Container} */ (root).nodes;
  const rule = /** @type {Rule} */ (/** @type {any} */ (media).first);
  moveRule(
    state.records,
    state.records.root.index,
    ruleRecordOf(state.records, rule).index
  );
  assertRecordsWellFormed(state);
});

test('links.firstChild should give the entry after the first rule once that rule is unlinked', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const media = blockRecordOf(state.records, /** @type {any} */ (root.first));
  const first = ruleRecordOf(
    state.records,
    /** @type {Rule} */ (nodeOfEntry(state.records, media).first)
  );
  state.records.detach(first.index);
  assert.equal(
    nodeOf(nodesOf(state.records), state.records.links.firstChild(media.index)),
    nodeOfEntry(state.records, media).nodes[1]
  );
});

test('parentOf should give the outer rule for a rule nested in a rule that holds rules', () => {
  const { root, state } = setup('a{color:red;b{width:1px}}');
  const outer = ruleRecordOf(state.records, /** @type {Rule} */ (root.first));
  const inner = ruleRecordOf(
    state.records,
    /** @type {Rule} */ (root.first.nodes[1])
  );
  assert.equal(state.records.links.parentOf(inner.index), outer.index);
});
