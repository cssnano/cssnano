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
  buildRecords,
  depart,
  removeDeclarations,
  removeRules,
  takePlaceOf,
} from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import { ruleRecordOf } from './liveRecords.js';

/** @import {Container, Declaration, Rule} from 'postcss' */
/** @import {Slot} from '../../../../../src/passes/merge/lib/rules/blockRecords.js' */

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
  const context = createRunContext();
  const state = new MergeState(['chrome 120'], context);
  state.records = buildRecords(root, state);
  return { root, state };
}

test('appendToDeclarations should mark the record of the incoming rule departed', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const [media] = /** @type {Container} */ (root).nodes;
  const [receiving, incoming] = /** @type {Rule[]} */ (
    /** @type {Container} */ (media).nodes
  );
  const record = ruleRecordOf(state.records, incoming);
  const kept = [...receiving.nodes];
  appendToDeclarations(
    state,
    ruleRecordOf(state.records, receiving),
    /** @type {Declaration[]} */ (kept),
    writesOf(kept, new PropertyTable()),
    ruleRecordOf(state.records, incoming)
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
    ruleRecordOf(state.records, receiving),
    /** @type {Declaration[]} */ (kept),
    writesOf(kept, new PropertyTable()),
    ruleRecordOf(state.records, incoming)
  );
  assert.equal(ruleRecordOf(state.records, receiving).departed, false);
});

test('appendToDeclarations should keep the record of the receiving rule', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const [media] = /** @type {Container} */ (root).nodes;
  const [receiving, incoming] = /** @type {Rule[]} */ (
    /** @type {Container} */ (media).nodes
  );
  const record = ruleRecordOf(state.records, receiving);
  const kept = [...receiving.nodes];
  appendToDeclarations(
    state,
    ruleRecordOf(state.records, receiving),
    /** @type {Declaration[]} */ (kept),
    writesOf(kept, new PropertyTable()),
    ruleRecordOf(state.records, incoming)
  );
  assert.equal(ruleRecordOf(state.records, receiving), record);
});

test('appendToDeclarations should give the record of the receiving rule the kept declarations', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const [media] = /** @type {Container} */ (root).nodes;
  const [receiving, incoming] = /** @type {Rule[]} */ (
    /** @type {Container} */ (media).nodes
  );
  ruleRecordOf(state.records, receiving);
  const kept = [...receiving.nodes];
  appendToDeclarations(
    state,
    ruleRecordOf(state.records, receiving),
    /** @type {Declaration[]} */ (kept),
    writesOf(kept, new PropertyTable()),
    ruleRecordOf(state.records, incoming)
  );
  assert.equal(ruleRecordOf(state.records, receiving).declarations, kept);
  assert.deepEqual(
    ruleRecordOf(state.records, receiving).declarations.map((d) => d.prop),
    ['color', 'width']
  );
});

test('appendToDeclarations should give the record of the receiving rule keys for the kept declarations', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const [media] = /** @type {Container} */ (root).nodes;
  const [receiving, incoming] = /** @type {Rule[]} */ (
    /** @type {Container} */ (media).nodes
  );
  state.declarationKeysOf(ruleRecordOf(state.records, receiving));
  const kept = [...receiving.nodes];
  appendToDeclarations(
    state,
    ruleRecordOf(state.records, receiving),
    /** @type {Declaration[]} */ (kept),
    writesOf(kept, new PropertyTable()),
    ruleRecordOf(state.records, incoming)
  );
  assert.deepEqual(
    state.declarationKeysOf(ruleRecordOf(state.records, receiving)).keys,
    kept.map((d) => state.declarationKey(/** @type {Declaration} */ (d)))
  );
});

test('removeDeclarations should keep the record of the rule', () => {
  const { root, state } = setup('a{color:red;width:1px}');
  const rule = /** @type {Rule} */ (root.first);
  const record = ruleRecordOf(state.records, rule);
  removeDeclarations(state, ruleRecordOf(state.records, rule), [
    /** @type {Declaration} */ (rule.first),
  ]);
  assert.equal(ruleRecordOf(state.records, rule), record);
});

test('removeDeclarations should leave the record with the declarations that remain', () => {
  const { root, state } = setup('a{color:red;width:1px}');
  const rule = /** @type {Rule} */ (root.first);
  ruleRecordOf(state.records, rule);
  removeDeclarations(state, ruleRecordOf(state.records, rule), [
    /** @type {Declaration} */ (rule.first),
  ]);
  assert.deepEqual(
    ruleRecordOf(state.records, rule).declarations.map((d) => d.prop),
    ['width']
  );
});

test('removeDeclarations should give the record keys for the declarations that remain', () => {
  const { root, state } = setup('a{color:red;width:1px}');
  const rule = /** @type {Rule} */ (root.first);
  state.declarationKeysOf(ruleRecordOf(state.records, rule));
  removeDeclarations(state, ruleRecordOf(state.records, rule), [
    /** @type {Declaration} */ (rule.first),
  ]);
  assert.deepEqual(
    state.declarationKeysOf(ruleRecordOf(state.records, rule)).keys,
    [state.declarationKey(/** @type {Declaration} */ (rule.first))]
  );
});

test('removeDeclarations should keep the element keys of the record', () => {
  const { root, state } = setup('a,b{color:red;width:1px}');
  const rule = /** @type {Rule} */ (root.first);
  state.elementKeysOf(ruleRecordOf(state.records, rule));
  removeDeclarations(state, ruleRecordOf(state.records, rule), [
    /** @type {Declaration} */ (rule.first),
  ]);
  assert.deepEqual(state.elementKeysOf(ruleRecordOf(state.records, rule)), [
    'a',
    'b',
  ]);
});

test('removeRules should mark the record of each rule it removes departed', () => {
  const { root, state } = setup('a{color:red}b{color:red}c{color:red}');
  const [, removed] = /** @type {Rule[]} */ (root.nodes);
  const record = ruleRecordOf(state.records, removed);
  removeRules(state, new Set([ruleRecordOf(state.records, removed)]));
  assert.throws(() => record.declarations, /departed/v);
});

test('removeRules should leave the record of a rule it keeps readable', () => {
  const { root, state } = setup('a{color:red}b{color:red}c{color:red}');
  const [kept, removed] = /** @type {Rule[]} */ (root.nodes);
  ruleRecordOf(state.records, kept);
  removeRules(state, new Set([ruleRecordOf(state.records, removed)]));
  assert.equal(ruleRecordOf(state.records, kept).departed, false);
});

test('depart should mark the record of the rule departed', () => {
  const { root, state } = setup('a{color:red}');
  const rule = /** @type {Rule} */ (root.first);
  const record = ruleRecordOf(state.records, rule);
  depart(state, ruleRecordOf(state.records, rule));
  assert.throws(() => record.selectors, /departed/v);
});

test('depart should leave the rule in the tree', () => {
  const { root, state } = setup('a{color:red}');
  const rule = /** @type {Rule} */ (root.first);
  depart(state, ruleRecordOf(state.records, rule));
  assert.equal(rule.parent, root);
});

test('takePlaceOf should move the record of the earlier rule into the slot of the later one', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const [media] = /** @type {Container} */ (root).nodes;
  const [earlier, later] = /** @type {Rule[]} */ (
    /** @type {Container} */ (media).nodes
  );
  const laterSlot = ruleRecordOf(state.records, later).slot;
  takePlaceOf(
    state,
    /** @type {Container} */ (media),
    ruleRecordOf(state.records, earlier),
    ruleRecordOf(state.records, later)
  );
  assert.equal(ruleRecordOf(state.records, earlier).slot, laterSlot);
});

test('appendToDeclarations should throw when the receiving rule holds a block', () => {
  const { root, state } = setup('a{color:red;b{width:1px}}c{width:2px}');
  const [receiving, incoming] = /** @type {Rule[]} */ (
    /** @type {Container} */ (root).nodes
  );
  const kept = /** @type {Declaration[]} */ ([receiving.first]);
  assert.throws(
    () =>
      appendToDeclarations(
        state,
        ruleRecordOf(state.records, receiving),
        kept,
        writesOf(kept, new PropertyTable()),
        ruleRecordOf(state.records, incoming)
      ),
    /holds a block/v
  );
});

test('removeDeclarations should throw when the rule holds a block', () => {
  const { root, state } = setup('a{color:red;b{width:1px}}');
  const [rule] = /** @type {Rule[]} */ (/** @type {Container} */ (root).nodes);
  assert.throws(
    () =>
      removeDeclarations(state, ruleRecordOf(state.records, rule), [
        /** @type {Declaration} */ (rule.first),
      ]),
    /holds a block/v
  );
});

test('buildRecords should give each slot the record of its rule, which names the slot', () => {
  const { root, state } = setup('a{color:red}b{width:1px}');
  const [first] = /** @type {Slot[]} */ (state.records.root.children);
  assert.equal(
    first.rules[0],
    ruleRecordOf(state.records, /** @type {Rule} */ (root.first))
  );
  assert.equal(first.rules[0].slot, first);
});
