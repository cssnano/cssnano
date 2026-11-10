import { selectorIdsOf } from './selectorIdsOf.js';
import { SelectorIds } from '../../../../../src/passes/ir/selectorIds.js';
import { childEntriesOf } from '../../../../../src/passes/merge/lib/rules/blockChildren.js';
import { childNodesOf } from '../../../../../src/passes/merge/lib/rules/writeBack.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import {
  AT_RULE_BLOCK,
  RULE,
  STYLESHEET,
} from '../../../../../src/passes/merge/lib/rules/blockRecord.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { RuleRecord } from '../../../../../src/passes/merge/lib/rules/ruleRecord.js';
import {
  appendToDeclarations,
  remove,
  removeRules,
  takePlaceOf,
} from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import {
  blockRecordOf,
  ruleRecordOf,
  buildTestRecords,
  placeUnlinked,
  nodeOfEntry,
  nodesOf,
} from './liveRecords.js';
import {
  adopt,
  moveRule,
  substitute,
} from '../../../../../src/passes/merge/lib/rules/arenaEdits.js';
import { TextTable } from '../../../../../src/values/textTable.js';
import { TokenLists } from '../../../../../src/passes/ir/tokenLists.js';

const selectorIds = new SelectorIds();
const tokenLists = new TokenLists();

/** @import {ChildNode, Container, Root, Rule} from 'postcss' */

/**
 * @param {string} css
 * @return {{root: Root, state: MergeState}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const state = new MergeState(
    ['chrome 120'],
    createRunContext(undefined, true)
  );
  state.records = buildTestRecords(root, state, new TextTable(), true);
  return { root, state };
}

/**
 * A label per live entry of the stylesheet: the first selector of a rule, the
 * name of an at-rule with a block, or the type of any other node.
 *
 * @param {MergeState} state
 * @return {string[]}
 */
function liveLabels(state) {
  return childEntriesOf(state.records, state.records.root.index).map(
    (entry) => {
      if (entry.kind === RULE) return entry.selectors[0];
      if (entry.kind === STYLESHEET || entry.kind === AT_RULE_BLOCK)
        return `@${nodeOfEntry(state.records, entry).name}`;
      return (
        nodeOfEntry(state.records, entry)?.type ??
        /** @type {ChildNode} */ (entry).type
      );
    }
  );
}

test('substitute with no replacement should remove the rule from the live entries', () => {
  const { root, state } = setup('a{color:red}b{width:1px}c{height:1px}');
  const [a] = /** @type {Rule[]} */ (root.nodes);
  const record = ruleRecordOf(state.records, a);
  substitute(state.records, record.index, []);
  assert.deepEqual(liveLabels(state), ['b', 'c']);
});

test('substitute with one replacement should put it where the rule stood', () => {
  const { root, state } = setup('a{color:red}b{width:1px}c{height:1px}');
  const [, b] = /** @type {Rule[]} */ (root.nodes);
  const record = ruleRecordOf(state.records, b);
  const replacement = placeUnlinked(
    state.records,
    state.records.root.index,
    new RuleRecord(['x'], 'x', selectorIdsOf(selectorIds, tokenLists, ['x']))
  );
  substitute(state.records, record.index, [replacement.index]);
  assert.deepEqual(liveLabels(state), ['a', 'x', 'c']);
});

test('substitute with several replacements should keep their order where the rule stood', () => {
  const { root, state } = setup('a{color:red}b{width:1px}c{height:1px}');
  const [, b] = /** @type {Rule[]} */ (root.nodes);
  const record = ruleRecordOf(state.records, b);
  const first = placeUnlinked(
    state.records,
    state.records.root.index,
    new RuleRecord(['x'], 'x', selectorIdsOf(selectorIds, tokenLists, ['x']))
  );
  const second = placeUnlinked(
    state.records,
    state.records.root.index,
    new RuleRecord(['y'], 'y', selectorIdsOf(selectorIds, tokenLists, ['y']))
  );
  substitute(state.records, record.index, [first.index, second.index]);
  assert.deepEqual(liveLabels(state), ['a', 'x', 'y', 'c']);
});

test('moveRule should move a rule out of an at-rule to the end of the stylesheet', () => {
  const { root, state } = setup(
    '@media print{a{color:red}b{width:1px}}c{height:1px}'
  );
  const [media] = /** @type {Container[]} */ (root.nodes);
  const rule = ruleRecordOf(state.records, /** @type {Rule} */ (media.first));
  moveRule(state.records, state.records.root.index, rule.index);
  assert.deepEqual(liveLabels(state), ['@media', 'c', 'a']);
});

test('adopt should splice the source children after the target, keeping a rule that holds a block', () => {
  const { root, state } = setup(
    '@media print{a{color:red}}@media print{x{y{width:1px}}}'
  );
  const [target, source] = /** @type {Container[]} */ (root.nodes);
  const targetBlock = blockRecordOf(state.records, target);
  const sourceBlock = blockRecordOf(state.records, source);
  adopt(state.records, targetBlock.index, sourceBlock.index);
  const entries = childEntriesOf(state.records, targetBlock.index);
  assert.equal(entries.length, 2);
  assert.equal(
    entries[1],
    ruleRecordOf(state.records, /** @type {Rule} */ (source.first))
  );
  assert.notEqual(/** @type {RuleRecord} */ (entries[1]).context, -1);
  assert.deepEqual(
    childNodesOf(state.records, nodesOf(state.records), targetBlock.index).map(
      (node) => node.type
    ),
    ['rule', 'rule']
  );
});

test('takePlaceOf should put the earlier rule where the later rule stood', () => {
  const { root, state } = setup('a{color:red}b{width:1px}c{height:1px}');
  const [a, , c] = /** @type {Rule[]} */ (root.nodes);
  takePlaceOf(
    state.records,
    ruleRecordOf(state.records, a).index,
    ruleRecordOf(state.records, c).index
  );
  assert.deepEqual(liveLabels(state), ['b', 'a']);
});

test('takePlaceOf should put the earlier at-rule block where the later block stood', () => {
  const { root, state } = setup(
    '@media print{a{color:red}}b{width:1px}@media print{c{height:1px}}'
  );
  const [first, , second] = /** @type {Container[]} */ (root.nodes);
  takePlaceOf(
    state.records,
    blockRecordOf(state.records, first).index,
    blockRecordOf(state.records, second).index
  );
  assert.deepEqual(liveLabels(state), ['b', '@media']);
  assert.equal(
    childEntriesOf(state.records, state.records.root.index).at(-1),
    blockRecordOf(state.records, first)
  );
});

test('remove should take a rule out of the live entries', () => {
  const { root, state } = setup('a{color:red}b{width:1px}c{height:1px}');
  const [, b] = /** @type {Rule[]} */ (root.nodes);
  remove(state.records, ruleRecordOf(state.records, b).index);
  assert.deepEqual(liveLabels(state), ['a', 'c']);
});

test('remove should take an at-rule block out of the live entries', () => {
  const { root, state } = setup(
    'a{color:red}@media print{b{width:1px}}c{height:1px}'
  );
  const [, media] = /** @type {Container[]} */ (root.nodes);
  remove(state.records, blockRecordOf(state.records, media).index);
  assert.deepEqual(liveLabels(state), ['a', 'c']);
});

test('a rule that appendToDeclarations empties is readable until an edit unlinks it', () => {
  const { root, state } = setup('a{color:red}b{width:1px}');
  const [receiving, incoming] = /** @type {Rule[]} */ (root.nodes);
  const incomingIndex = ruleRecordOf(state.records, incoming).index;
  appendToDeclarations(
    state,
    ruleRecordOf(state.records, receiving).index,
    incomingIndex
  );
  assert.equal(state.records.rule(incomingIndex)?.selectors[0], 'b');
  remove(state.records, ruleRecordOf(state.records, incoming).index);
  assert.throws(() => state.records.rule(incomingIndex), /does not reach/v);
});

test('removeRules of the first child should leave the rest as the live entries of the stylesheet', () => {
  const { root, state } = setup('a{color:red}b{width:1px}');
  const [a] = /** @type {Rule[]} */ (root.nodes);
  removeRules(state, new Set([ruleRecordOf(state.records, a).index]));
  assert.deepEqual(liveLabels(state), ['b']);
  assert.deepEqual(
    childNodesOf(
      state.records,
      nodesOf(state.records),
      state.records.root.index
    ).map((node) => node.type),
    ['rule']
  );
});
