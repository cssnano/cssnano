import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postcss from 'postcss';
import { enableConsistencyChecks } from '../../../../../src/passes/ir/consistencyChecks.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { mergeMatchingDeclarations } from '../../../../../src/passes/merge/lib/rules/merge.js';
import { writesOf } from '../../../../../src/passes/merge/lib/rules/ruleRewrite.js';
import {
  appendToDeclarations,
  buildRecords,
  removeRules,
} from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import {
  assertRecordsMatchTree,
  replaceChildren,
  writeBack,
} from '../../../../../src/passes/merge/lib/rules/writeBack.js';
import { ruleRecordOf } from './liveRecords.js';

/** @import {ChildNode, Declaration, Rule} from 'postcss' */

before(() => enableConsistencyChecks(true));
after(() => enableConsistencyChecks(false));

/**
 * @param {string} css
 * @return {{root: import('postcss').Root, state: MergeState}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildRecords(root, state);
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
  ruleRecordOf(state.records, b).removeDeclarationsAt(new Set([0]));
  assert.equal(b.nodes, kept);
  assert.equal(b.nodes.length, 1);
});

test('an unedited rule keeps its node array through a write-back of another rule', () => {
  // A rule with no edit must not be rebuilt, so its child array stays as it was.
  const { root, state } = setup('a{color:red}b{width:1px}');
  const [a, b] = twoRules(root);
  const kept = a.nodes;
  ruleRecordOf(state.records, b).removeDeclarationsAt(new Set([0]));
  writeBack(state.records, state.records.blocks());
  assert.equal(a.nodes, kept);
});

test('a rule record reports itself unedited before any child edit', () => {
  const { root, state } = setup('a{color:red}');
  const [a] = twoRules(root);
  assert.equal(ruleRecordOf(state.records, a).edited, false);
});

test('a rule record reports itself edited after it removes a declaration', () => {
  const { root, state } = setup('a{color:red}b{width:1px}');
  const [a] = twoRules(root);
  const record = ruleRecordOf(state.records, a);
  record.removeDeclarationsAt(new Set([0]));
  assert.equal(record.edited, true);
});

test('a receiving rule keeps its node unchanged until write-back', () => {
  const { root, state } = setup('a{color:red}b{width:1px}');
  const [a, b] = twoRules(root);
  const from = ruleRecordOf(state.records, a);
  const to = ruleRecordOf(state.records, b);
  for (const child of from.takeDeclarationsAt(new Set([0]))) to.append(child);
  assert.equal(b.nodes.length, 1);
  writeBack(state.records, state.records.blocks());
  assert.equal(b.nodes.length, 2);
});

test('a declaration handed to another rule has that rule as parent after write-back', () => {
  const { root, state } = setup('a{color:red}b{width:1px}');
  const [a, b] = twoRules(root);
  const from = ruleRecordOf(state.records, a);
  const to = ruleRecordOf(state.records, b);
  for (const child of from.takeDeclarationsAt(new Set([0]))) to.append(child);
  writeBack(state.records, state.records.blocks());
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
    { container: a, children: [width], leading: undefined },
    { container: b, children: [color], leading: undefined },
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

test('a departed rule leaves the tree at write-back', () => {
  const { root, state } = setup('a{color:red}b{width:1px}');
  const [a, b] = twoRules(root);
  const incoming = ruleRecordOf(state.records, a);
  const receiving = ruleRecordOf(state.records, b);
  appendToDeclarations(
    state,
    receiving,
    writesOf(receiving.declarations),
    incoming
  );
  removeRules(state, new Set([incoming]));
  writeBack(state.records, state.records.blocks());
  assert.deepEqual(root.nodes, [b]);
  assert.equal(a.parent, undefined);
});

test('a departed rule keeps its child array, since write-back does not empty it', () => {
  const { root, state } = setup('a{color:red}b{width:1px}');
  const [a, b] = twoRules(root);
  const receiving = ruleRecordOf(state.records, b);
  const incoming = ruleRecordOf(state.records, a);
  appendToDeclarations(
    state,
    receiving,
    writesOf(receiving.declarations),
    incoming
  );
  removeRules(state, new Set([incoming]));
  writeBack(state.records, state.records.blocks());
  assert.equal(a.nodes.length, 1);
});

test('a rule whose child points to another container fails the consistency check', () => {
  const { root, state } = setup('a{color:red}b{width:1px}');
  const [a, b] = twoRules(root);
  writeBack(state.records, state.records.blocks());
  /** @type {ChildNode} */ (a.first).parent = b;
  assert.throws(() => assertRecordsMatchTree(state));
});

test('a merge of rules with one selector departs the later rule', () => {
  const { root, state } = setup('a{color:red}a{color:red}');
  const [a, b] = twoRules(root);
  const first = ruleRecordOf(state.records, a);
  const second = ruleRecordOf(state.records, b);
  mergeMatchingDeclarations(first, second, state);
  assert.equal(second.departed, true);
  assert.equal(first.departed, false);
});

test('a merge of rules with different selectors departs the earlier rule', () => {
  const { root, state } = setup('a{color:red}b{color:red}');
  const [a, b] = twoRules(root);
  const first = ruleRecordOf(state.records, a);
  const second = ruleRecordOf(state.records, b);
  mergeMatchingDeclarations(first, second, state);
  assert.equal(first.departed, true);
  assert.equal(second.departed, false);
});
