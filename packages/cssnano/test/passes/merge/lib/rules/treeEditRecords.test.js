import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postcss from 'postcss';
import { enableConsistencyChecks } from '../../../../../src/passes/ir/consistencyChecks.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { PropertyTable } from '../../../../../src/passes/ir/propertyTable.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { writesOf } from '../../../../../src/passes/merge/lib/rules/ruleRewrite.js';
import {
  appendToDeclarations,
  depart,
  removeDeclarations,
  removeRules,
} from '../../../../../src/passes/merge/lib/rules/treeEdits.js';

/** @import {Container, Declaration, Rule} from 'postcss' */

// The records of the rules an edit touches stay readable, or, for a rule that
// left the stylesheet, are marked departed. Consistency checks compare each
// record with the tree at every read.
before(() => enableConsistencyChecks(true));
after(() => enableConsistencyChecks(false));

/**
 * @param {string} css
 * @return {{root: import('postcss').Root, state: MergeState}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const context = createRunContext(root);
  return { root, state: new MergeState(['chrome 120'], context) };
}

test('appendToDeclarations should mark the record of the incoming rule departed', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const [media] = /** @type {Container} */ (root).nodes;
  const [receiving, incoming] = /** @type {Rule[]} */ (
    /** @type {Container} */ (media).nodes
  );
  const record = state.meta(incoming);
  const kept = [...receiving.nodes];
  appendToDeclarations(
    state,
    receiving,
    /** @type {Declaration[]} */ (kept),
    writesOf(kept, new PropertyTable()),
    incoming
  );
  assert.throws(() => record.declarations, /departed/v);
});

test('appendToDeclarations should leave the record of the receiving rule readable', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const [media] = /** @type {Container} */ (root).nodes;
  const [receiving, incoming] = /** @type {Rule[]} */ (
    /** @type {Container} */ (media).nodes
  );
  const kept = [...receiving.nodes];
  appendToDeclarations(
    state,
    receiving,
    /** @type {Declaration[]} */ (kept),
    writesOf(kept, new PropertyTable()),
    incoming
  );
  assert.equal(state.meta(receiving).departed, false);
});

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

test('removeRules should mark the record of each rule it removes departed', () => {
  const { root, state } = setup('a{color:red}b{color:red}c{color:red}');
  const [, removed] = /** @type {Rule[]} */ (root.nodes);
  const record = state.meta(removed);
  removeRules(state, root, new Set([removed]));
  assert.throws(() => record.declarations, /departed/v);
});

test('removeRules should leave the record of a rule it keeps readable', () => {
  const { root, state } = setup('a{color:red}b{color:red}c{color:red}');
  const [kept, removed] = /** @type {Rule[]} */ (root.nodes);
  state.meta(kept);
  removeRules(state, root, new Set([removed]));
  assert.equal(state.meta(kept).departed, false);
});

test('depart should mark the record of the rule departed', () => {
  const { root, state } = setup('a{color:red}');
  const rule = /** @type {Rule} */ (root.first);
  const record = state.meta(rule);
  depart(state, rule);
  assert.throws(() => record.selectors, /departed/v);
});

test('depart should leave the rule in the tree', () => {
  const { root, state } = setup('a{color:red}');
  const rule = /** @type {Rule} */ (root.first);
  depart(state, rule);
  assert.equal(rule.parent, root);
});
