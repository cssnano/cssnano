import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postcss from 'postcss';
import { enableConsistencyChecks } from '../../../../../src/passes/ir/consistencyChecks.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { BlockRecord } from '../../../../../src/passes/merge/lib/rules/blockRecord.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { RuleRecord } from '../../../../../src/passes/merge/lib/rules/ruleRecord.js';
import {
  remove,
  removeRules,
  takePlaceOf,
} from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import {
  blockRecordOf,
  ruleRecordOf,
  buildTestRecords,
} from './liveRecords.js';

/** @import {ChildNode, Container, Root, Rule} from 'postcss' */

before(() => enableConsistencyChecks(true));
after(() => enableConsistencyChecks(false));

/**
 * @param {string} css
 * @return {{root: Root, state: MergeState}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildTestRecords(root, state);
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
  return state.records.liveEntries(state.records.root.index).map((entry) => {
    if (entry instanceof RuleRecord) return entry.selectors[0];
    if (entry instanceof BlockRecord) return `@${entry.node.name}`;
    return entry.node?.type ?? /** @type {ChildNode} */ (entry).type;
  });
}

test('substitute with no replacement should remove the rule from the live entries', () => {
  const { root, state } = setup('a{color:red}b{width:1px}c{height:1px}');
  const [a] = /** @type {Rule[]} */ (root.nodes);
  const record = ruleRecordOf(state.records, a);
  state.records.substitute(record.index, []);
  assert.deepEqual(liveLabels(state), ['b', 'c']);
});

test('substitute with one replacement should put it where the rule stood', () => {
  const { root, state } = setup('a{color:red}b{width:1px}c{height:1px}');
  const [, b] = /** @type {Rule[]} */ (root.nodes);
  const record = ruleRecordOf(state.records, b);
  const replacement = state.records.recordRule(
    postcss.rule({ selector: 'x' }),
    state.properties,
    state.declarationIds
  );
  state.records.substitute(record.index, [replacement.index]);
  assert.deepEqual(liveLabels(state), ['a', 'x', 'c']);
});

test('substitute with several replacements should keep their order where the rule stood', () => {
  const { root, state } = setup('a{color:red}b{width:1px}c{height:1px}');
  const [, b] = /** @type {Rule[]} */ (root.nodes);
  const record = ruleRecordOf(state.records, b);
  const first = state.records.recordRule(
    postcss.rule({ selector: 'x' }),
    state.properties,
    state.declarationIds
  );
  const second = state.records.recordRule(
    postcss.rule({ selector: 'y' }),
    state.properties,
    state.declarationIds
  );
  state.records.substitute(record.index, [first.index, second.index]);
  assert.deepEqual(liveLabels(state), ['a', 'x', 'y', 'c']);
});

test('moveRule should move a rule out of an at-rule to the end of the stylesheet', () => {
  const { root, state } = setup(
    '@media print{a{color:red}b{width:1px}}c{height:1px}'
  );
  const [media] = /** @type {Container[]} */ (root.nodes);
  const rule = ruleRecordOf(state.records, /** @type {Rule} */ (media.first));
  state.records.moveRule(state.records.root.index, rule.index);
  assert.deepEqual(liveLabels(state), ['@media', 'c', 'a']);
});

test('adopt should splice the source children after the target, keeping a rule that holds a block', () => {
  const { root, state } = setup(
    '@media print{a{color:red}}@media print{x{y{width:1px}}}'
  );
  const [target, source] = /** @type {Container[]} */ (root.nodes);
  const targetBlock = blockRecordOf(state.records, target);
  const sourceBlock = blockRecordOf(state.records, source);
  state.records.adopt(targetBlock.index, sourceBlock.index);
  const entries = state.records.liveEntries(targetBlock.index);
  assert.equal(entries.length, 2);
  assert.equal(
    entries[1],
    ruleRecordOf(state.records, /** @type {Rule} */ (source.first))
  );
  assert.notEqual(/** @type {RuleRecord} */ (entries[1]).context, -1);
  assert.deepEqual(
    state.records.liveChildren(targetBlock.index).map((node) => node.type),
    ['rule', 'rule']
  );
});

test('takePlaceOf should put the earlier rule where the later rule stood', () => {
  const { root, state } = setup('a{color:red}b{width:1px}c{height:1px}');
  const [a, , c] = /** @type {Rule[]} */ (root.nodes);
  takePlaceOf(
    state,
    root,
    ruleRecordOf(state.records, a),
    ruleRecordOf(state.records, c)
  );
  assert.deepEqual(liveLabels(state), ['b', 'a']);
});

test('takePlaceOf should put the earlier at-rule block where the later block stood', () => {
  const { root, state } = setup(
    '@media print{a{color:red}}b{width:1px}@media print{c{height:1px}}'
  );
  const [first, , second] = /** @type {Container[]} */ (root.nodes);
  takePlaceOf(
    state,
    root,
    blockRecordOf(state.records, first),
    blockRecordOf(state.records, second)
  );
  assert.deepEqual(liveLabels(state), ['b', '@media']);
  assert.equal(
    state.records.liveEntries(state.records.root.index).at(-1),
    blockRecordOf(state.records, first)
  );
});

test('remove should take a rule out of the live entries', () => {
  const { root, state } = setup('a{color:red}b{width:1px}c{height:1px}');
  const [, b] = /** @type {Rule[]} */ (root.nodes);
  remove(state.records, ruleRecordOf(state.records, b));
  assert.deepEqual(liveLabels(state), ['a', 'c']);
});

test('remove should take an at-rule block out of the live entries', () => {
  const { root, state } = setup(
    'a{color:red}@media print{b{width:1px}}c{height:1px}'
  );
  const [, media] = /** @type {Container[]} */ (root.nodes);
  remove(state.records, blockRecordOf(state.records, media));
  assert.deepEqual(liveLabels(state), ['a', 'c']);
});

test('removeRules of the first child should leave the rest as the live entries of the stylesheet', () => {
  const { root, state } = setup('a{color:red}b{width:1px}');
  const [a] = /** @type {Rule[]} */ (root.nodes);
  removeRules(state, new Set([ruleRecordOf(state.records, a).index]));
  assert.deepEqual(liveLabels(state), ['b']);
  assert.deepEqual(
    state.records
      .liveChildren(state.records.root.index)
      .map((node) => node.type),
    ['rule']
  );
});
