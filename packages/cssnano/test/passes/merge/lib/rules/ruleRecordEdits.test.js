import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import {
  appendToDeclarations,
  removeRules,
} from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import { assertRecordsMatchTree } from '../../../../../src/passes/merge/lib/rules/treeMatch.js';
import {
  replaceChildren,
  writeBack,
} from '../../../../../src/passes/merge/lib/rules/writeBack.js';
import {
  ruleRecordOf,
  buildTestRecords,
  claimAt,
  nodesOf,
  tokenListsOf,
} from './liveRecords.js';
import {
  moveDeclarations,
  removeDeclarations,
} from '../../../../../src/passes/merge/lib/rules/arenaEdits.js';
import { TextTable } from '../../../../../src/values/textTable.js';

/** @import {ChildNode, Declaration, Rule} from 'postcss' */

/**
 * @param {string} css
 * @return {{root: import('postcss').Root, state: MergeState}}
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
 * The rules of a stylesheet made of two rules, typed for the checks.
 *
 * @param {import('postcss').Root} root
 * @return {[Rule, Rule]}
 */
function twoRules(root) {
  return /** @type {[Rule, Rule]} */ (/** @type {unknown} */ (root.nodes));
}

test('a rule that its declarations left keeps its node array until write-back', () => {
  const { root, state } = setup('a{color:red}b{width:1px}');
  const [, b] = twoRules(root);
  const kept = b.nodes;
  const record = ruleRecordOf(state.records, b);
  removeDeclarations(
    state.records,
    record.index,
    claimAt(state.records, record, [0])
  );
  assert.equal(b.nodes, kept);
  assert.equal(b.nodes.length, 1);
});

test('an unedited rule keeps its node array through a write-back of another rule', () => {
  // A rule with no edit must not be rebuilt, so its child array stays as it was.
  const { root, state } = setup('a{color:red}b{width:1px}');
  const [a, b] = twoRules(root);
  const kept = a.nodes;
  const record = ruleRecordOf(state.records, b);
  removeDeclarations(
    state.records,
    record.index,
    claimAt(state.records, record, [0])
  );
  writeBack(state.records, nodesOf(state.records));
  assert.equal(a.nodes, kept);
});

test('a rule record reports itself unedited before any child edit', () => {
  const { root, state } = setup('a{color:red}');
  const [a] = twoRules(root);
  const record = ruleRecordOf(state.records, a);
  assert.equal(state.records.links.isEdited(record.index), false);
});

test('a rule record reports itself edited after it removes a declaration', () => {
  const { root, state } = setup('a{color:red}b{width:1px}');
  const [a] = twoRules(root);
  const record = ruleRecordOf(state.records, a);
  removeDeclarations(
    state.records,
    record.index,
    claimAt(state.records, record, [0])
  );
  assert.equal(state.records.links.isEdited(record.index), true);
});

test('a receiving rule keeps its node unchanged until write-back', () => {
  const { root, state } = setup('a{color:red}b{width:1px}');
  const [a, b] = twoRules(root);
  const from = ruleRecordOf(state.records, a);
  const to = ruleRecordOf(state.records, b);
  moveDeclarations(state.records, from.index, to.index, [
    ...claimAt(state.records, from, [0]),
  ]);
  assert.equal(b.nodes.length, 1);
  writeBack(state.records, nodesOf(state.records));
  assert.equal(b.nodes.length, 2);
});

test('a declaration handed to another rule has that rule as parent after write-back', () => {
  const { root, state } = setup('a{color:red}b{width:1px}');
  const [a, b] = twoRules(root);
  const from = ruleRecordOf(state.records, a);
  const to = ruleRecordOf(state.records, b);
  moveDeclarations(state.records, from.index, to.index, [
    ...claimAt(state.records, from, [0]),
  ]);
  writeBack(state.records, nodesOf(state.records));
  assert.equal(/** @type {Declaration} */ (b.last).prop, 'color');
  assert.equal(b.last.parent, b);
});

/**
 * Builds the batch that exchanges the declarations of two rules, in the order
 * given.
 *
 * @param {boolean} reversed whether the receiving rule that is rebuilt first is the second one
 * @return {{a: Rule, b: Rule, color: ChildNode, width: ChildNode}}
 */
function exchange(reversed) {
  const root = postcss.parse('a{color:red}b{width:1px}');
  const [a, b] = twoRules(root);
  const color = /** @type {ChildNode} */ (a.first);
  const width = /** @type {ChildNode} */ (b.first);
  const batch = [
    { container: a, children: [width], leading: null },
    { container: b, children: [color], leading: null },
  ];
  replaceChildren(reversed ? batch.toReversed() : batch);
  return { a, b, color, width };
}

test('an exchanged declaration ends with the receiving rule as parent when that rule is rebuilt first', () => {
  const { a, b, color, width } = exchange(false);
  assert.equal(width.parent, a);
  assert.equal(color.parent, b);
});

test('an exchanged declaration ends with the receiving rule as parent when that rule is rebuilt last', () => {
  const { a, b, color, width } = exchange(true);
  assert.equal(width.parent, a);
  assert.equal(color.parent, b);
});

test('a removed rule leaves the tree at write-back', () => {
  const { root, state } = setup('a{color:red}b{width:1px}');
  const [a, b] = twoRules(root);
  const incoming = ruleRecordOf(state.records, a);
  const receiving = ruleRecordOf(state.records, b);
  appendToDeclarations(state, receiving.index, incoming.index);
  removeRules(state, new Set([incoming.index]));
  writeBack(state.records, nodesOf(state.records));
  assert.deepEqual(root.nodes, [b]);
  assert.equal(a.parent, undefined);
});

test('a removed rule keeps its child array, since write-back does not empty it', () => {
  const { root, state } = setup('a{color:red}b{width:1px}');
  const [a, b] = twoRules(root);
  const receiving = ruleRecordOf(state.records, b);
  const incoming = ruleRecordOf(state.records, a);
  appendToDeclarations(state, receiving.index, incoming.index);
  removeRules(state, new Set([incoming.index]));
  writeBack(state.records, nodesOf(state.records));
  assert.equal(a.nodes.length, 1);
});

test('a rule whose child points to another container fails the consistency check', () => {
  const { root, state } = setup('a{color:red}b{width:1px}');
  const [a, b] = twoRules(root);
  writeBack(state.records, nodesOf(state.records));
  /** @type {ChildNode} */ (a.first).parent = b;
  assert.throws(() =>
    assertRecordsMatchTree(
      state.records,
      nodesOf(state.records),
      tokenListsOf(state.records)
    )
  );
});
