import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { PropertyTable } from '../../../../../src/passes/ir/propertyTable.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { writesOf } from '../../../../../src/passes/merge/lib/rules/ruleRewrite.js';
import {
  appendToDeclarations,
  removeDeclarations,
} from '../../../../../src/passes/merge/lib/rules/treeEdits.js';

/** @import {Container, Declaration, Rule} from 'postcss' */

// The record of a rule that an edit keeps stays the same object and follows

// the edit, rather than being rebuilt from the tree.
/**
 * @param {string} css
 * @return {{root: import('postcss').Root, state: MergeState}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const context = createRunContext(root);
  return { root, state: new MergeState(['chrome 120'], context) };
}

test('appendToDeclarations should keep the record of the receiving rule', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const [media] = /** @type {Container} */ (root).nodes;
  const [receiving, incoming] = /** @type {Rule[]} */ (
    /** @type {Container} */ (media).nodes
  );
  const record = state.meta(receiving);
  const kept = [...receiving.nodes];
  appendToDeclarations(
    state,
    receiving,
    /** @type {Declaration[]} */ (kept),
    writesOf(kept, new PropertyTable()),
    incoming
  );
  assert.equal(state.meta(receiving), record);
});

test('appendToDeclarations should give the record of the receiving rule the kept declarations', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const [media] = /** @type {Container} */ (root).nodes;
  const [receiving, incoming] = /** @type {Rule[]} */ (
    /** @type {Container} */ (media).nodes
  );
  state.meta(receiving);
  const kept = [...receiving.nodes];
  appendToDeclarations(
    state,
    receiving,
    /** @type {Declaration[]} */ (kept),
    writesOf(kept, new PropertyTable()),
    incoming
  );
  assert.equal(state.meta(receiving).declarations, kept);
  assert.deepEqual(
    state.meta(receiving).declarations.map((d) => d.prop),
    ['color', 'width']
  );
});

test('appendToDeclarations should give the record of the receiving rule keys for the kept declarations', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const [media] = /** @type {Container} */ (root).nodes;
  const [receiving, incoming] = /** @type {Rule[]} */ (
    /** @type {Container} */ (media).nodes
  );
  state.declarationKeysOf(receiving);
  const kept = [...receiving.nodes];
  appendToDeclarations(
    state,
    receiving,
    /** @type {Declaration[]} */ (kept),
    writesOf(kept, new PropertyTable()),
    incoming
  );
  assert.deepEqual(
    state.declarationKeysOf(receiving).keys,
    kept.map((d) => state.declarationKey(/** @type {Declaration} */ (d)))
  );
});

test('removeDeclarations should keep the record of the rule', () => {
  const { root, state } = setup('a{color:red;width:1px}');
  const rule = /** @type {Rule} */ (root.first);
  const record = state.meta(rule);
  removeDeclarations(state, rule, [/** @type {Declaration} */ (rule.first)]);
  assert.equal(state.meta(rule), record);
});

test('removeDeclarations should leave the record with the declarations that remain', () => {
  const { root, state } = setup('a{color:red;width:1px}');
  const rule = /** @type {Rule} */ (root.first);
  state.meta(rule);
  removeDeclarations(state, rule, [/** @type {Declaration} */ (rule.first)]);
  assert.deepEqual(
    state.meta(rule).declarations.map((d) => d.prop),
    ['width']
  );
});

test('removeDeclarations should give the record keys for the declarations that remain', () => {
  const { root, state } = setup('a{color:red;width:1px}');
  const rule = /** @type {Rule} */ (root.first);
  state.declarationKeysOf(rule);
  removeDeclarations(state, rule, [/** @type {Declaration} */ (rule.first)]);
  assert.deepEqual(state.declarationKeysOf(rule).keys, [
    state.declarationKey(/** @type {Declaration} */ (rule.first)),
  ]);
});

test('removeDeclarations should keep the element keys of the record', () => {
  const { root, state } = setup('a,b{color:red;width:1px}');
  const rule = /** @type {Rule} */ (root.first);
  state.elementKeysOf(rule);
  removeDeclarations(state, rule, [/** @type {Declaration} */ (rule.first)]);
  assert.deepEqual(state.elementKeysOf(rule), ['a', 'b']);
});
