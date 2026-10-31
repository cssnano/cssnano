import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postcss from 'postcss';
import { enableConsistencyChecks } from '../../../../../src/passes/ir/consistencyChecks.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { writesOf } from '../../../../../src/passes/merge/lib/rules/ruleRewrite.js';
import {
  appendToDeclarations,
  buildRecords,
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
  const kept = [...ruleRecordOf(state.records, receiving).declarations];
  appendToDeclarations(
    state,
    ruleRecordOf(state.records, receiving),
    writesOf(kept),
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
  const kept = [...ruleRecordOf(state.records, receiving).declarations];
  appendToDeclarations(
    state,
    ruleRecordOf(state.records, receiving),
    writesOf(kept),
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
  const kept = [...ruleRecordOf(state.records, receiving).declarations];
  appendToDeclarations(
    state,
    ruleRecordOf(state.records, receiving),
    writesOf(kept),
    ruleRecordOf(state.records, incoming)
  );
  assert.equal(ruleRecordOf(state.records, receiving), record);
});

test('appendToDeclarations should extend the declarations list the receiving record holds', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const [media] = /** @type {Container} */ (root).nodes;
  const [receiving, incoming] = /** @type {Rule[]} */ (
    /** @type {Container} */ (media).nodes
  );
  const list = ruleRecordOf(state.records, receiving).declarations;
  appendToDeclarations(
    state,
    ruleRecordOf(state.records, receiving),
    writesOf(list),
    ruleRecordOf(state.records, incoming)
  );
  assert.equal(ruleRecordOf(state.records, receiving).declarations, list);
  assert.deepEqual(
    ruleRecordOf(state.records, receiving).declarations.map((d) => d.prop),
    ['color', 'width']
  );
});

test('appendToDeclarations should give the record of the receiving rule keys for the declarations it holds', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const [media] = /** @type {Container} */ (root).nodes;
  const [receiving, incoming] = /** @type {Rule[]} */ (
    /** @type {Container} */ (media).nodes
  );
  ruleRecordOf(state.records, receiving).declarationKeys(state.records);
  const kept = [...ruleRecordOf(state.records, receiving).declarations];
  appendToDeclarations(
    state,
    ruleRecordOf(state.records, receiving),
    writesOf(kept),
    ruleRecordOf(state.records, incoming)
  );
  assert.deepEqual(
    ruleRecordOf(state.records, receiving).declarationKeys(state.records).keys,
    ruleRecordOf(state.records, receiving).declarations.map((d) => d.id)
  );
});

test('removeDeclarationsAt should keep the record of the rule', () => {
  const { root, state } = setup('a{color:red;width:1px}');
  const rule = /** @type {Rule} */ (root.first);
  const record = ruleRecordOf(state.records, rule);
  ruleRecordOf(state.records, rule).removeDeclarationsAt(new Set([0]));
  assert.equal(ruleRecordOf(state.records, rule), record);
});

test('removeDeclarationsAt should leave the record with the declarations that remain', () => {
  const { root, state } = setup('a{color:red;width:1px}');
  const rule = /** @type {Rule} */ (root.first);
  ruleRecordOf(state.records, rule);
  ruleRecordOf(state.records, rule).removeDeclarationsAt(new Set([0]));
  assert.deepEqual(
    ruleRecordOf(state.records, rule).declarations.map((d) => d.prop),
    ['width']
  );
});

test('removeDeclarationsAt should give the record keys for the declarations that remain', () => {
  const { root, state } = setup('a{color:red;width:1px}');
  const rule = /** @type {Rule} */ (root.first);
  ruleRecordOf(state.records, rule).declarationKeys(state.records);
  ruleRecordOf(state.records, rule).removeDeclarationsAt(new Set([0]));
  assert.deepEqual(
    ruleRecordOf(state.records, rule).declarationKeys(state.records).keys,
    [state.declarationIds.keyOf(/** @type {Declaration} */ (rule.last))]
  );
});

test('removeDeclarationsAt should keep the element keys of the record', () => {
  const { root, state } = setup('a,b{color:red;width:1px}');
  const rule = /** @type {Rule} */ (root.first);
  state.elementKeysOf(ruleRecordOf(state.records, rule));
  ruleRecordOf(state.records, rule).removeDeclarationsAt(new Set([0]));
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
  ruleRecordOf(state.records, rule).depart();
  assert.throws(() => record.selectors, /departed/v);
});

test('depart should leave the rule in the tree', () => {
  const { root, state } = setup('a{color:red}');
  const rule = /** @type {Rule} */ (root.first);
  ruleRecordOf(state.records, rule).depart();
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
  // The receiving rule holds no declarations of its own, so `kept` is empty.
  const kept = [];
  assert.throws(
    () =>
      appendToDeclarations(
        state,
        ruleRecordOf(state.records, receiving),
        writesOf(kept),
        ruleRecordOf(state.records, incoming)
      ),
    /holds a block/v
  );
});

test('removeDeclarationsAt should throw when the rule holds a block', () => {
  const { root, state } = setup('a{color:red;b{width:1px}}');
  const [rule] = /** @type {Rule[]} */ (/** @type {Container} */ (root).nodes);
  assert.throws(
    () => ruleRecordOf(state.records, rule).removeDeclarationsAt(new Set([0])),
    /holds a block/v
  );
});

test('buildRecords should give each slot the record of its rule, which names the slot', () => {
  const { root, state } = setup('a{color:red}b{width:1px}');
  const [first] = /** @type {Slot[]} */ (state.records.root.children);
  assert.equal(
    state.records.rule(first.rules[0]),
    ruleRecordOf(state.records, /** @type {Rule} */ (root.first))
  );
  assert.equal(state.records.slotOf(state.records.rule(first.rules[0])), first);
});
