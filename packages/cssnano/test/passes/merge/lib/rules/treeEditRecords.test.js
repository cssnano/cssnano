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
import { blockRecordOf, ruleRecordOf } from './liveRecords.js';

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
  removeRules(state, new Set([ruleRecordOf(state.records, removed).index]));
  assert.throws(() => record.declarations, /departed/v);
});

test('removeRules should leave the record of a rule it keeps readable', () => {
  const { root, state } = setup('a{color:red}b{color:red}c{color:red}');
  const [kept, removed] = /** @type {Rule[]} */ (root.nodes);
  ruleRecordOf(state.records, kept);
  removeRules(state, new Set([ruleRecordOf(state.records, removed).index]));
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

test('takePlaceOf should link the earlier rule where the later one stood', () => {
  const { root, state } = setup(
    '@media print{x{color:red}a{color:red}b{width:1px}}'
  );
  const [media] = /** @type {Container} */ (root).nodes;
  const [x, earlier, later] = /** @type {Rule[]} */ (
    /** @type {Container} */ (media).nodes
  );
  takePlaceOf(
    state,
    /** @type {Container} */ (media),
    ruleRecordOf(state.records, earlier),
    ruleRecordOf(state.records, later)
  );
  const entries = state.records.liveEntries(
    blockRecordOf(state.records, media).index
  );
  assert.equal(entries.length, 2);
  assert.equal(entries[0], ruleRecordOf(state.records, x));
  assert.equal(entries[1], ruleRecordOf(state.records, earlier));
});

test('takePlaceOf should unlink the later rule once the earlier one takes its place', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const [media] = /** @type {Container} */ (root).nodes;
  const [earlier, later] = /** @type {Rule[]} */ (
    /** @type {Container} */ (media).nodes
  );
  const laterRecord = ruleRecordOf(state.records, later);
  takePlaceOf(
    state,
    /** @type {Container} */ (media),
    ruleRecordOf(state.records, earlier),
    laterRecord
  );
  assert.equal(state.records.links.parentOf(laterRecord.index), -1);
});

test('appendToDeclarations should throw when the receiving rule nests', () => {
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
    /nests/v
  );
});

test('removeDeclarationsAt should throw when the rule nests', () => {
  const { root, state } = setup('a{color:red;b{width:1px}}');
  const [rule] = /** @type {Rule[]} */ (/** @type {Container} */ (root).nodes);
  assert.throws(
    () => ruleRecordOf(state.records, rule).removeDeclarationsAt(new Set([0])),
    /nests/v
  );
});

test('buildRecords should link each rule into the chain of the stylesheet, in document order', () => {
  const { root, state } = setup('a{color:red}b{width:1px}');
  const [a, b] = /** @type {Rule[]} */ (root.nodes);
  const { links, root: block } = state.records;
  const first = links.firstChild(block.index);
  assert.equal(first, ruleRecordOf(state.records, a).index);
  assert.equal(links.nextSibling(first), ruleRecordOf(state.records, b).index);
});

test('buildRecords should name the stylesheet as the container of each of its rules', () => {
  const { root, state } = setup('a{color:red}');
  const [a] = /** @type {Rule[]} */ (root.nodes);
  assert.equal(
    state.records.links.parentOf(ruleRecordOf(state.records, a).index),
    state.records.root.index
  );
});
