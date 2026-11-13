import {
  declarationsOf,
  childEntriesOf,
} from '../../../../../src/passes/ir/blockChildren.js';
import { elementKeysOf } from '../../../../../src/passes/ir/selectorReads.js';
import { tokensText } from '../../../../../src/values/tokensText.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import {
  appendToDeclarations,
  removeRules,
  takePlaceOf,
} from '../../../../../src/passes/ir/treeEdits.js';
import {
  blockRecordOf,
  ruleRecordOf,
  buildTestRecords,
  claimAt,
  declarationIds,
  placeUnlinked,
} from './liveRecords.js';
import { removeDeclarations } from '../../../../../src/passes/ir/arenaEdits.js';
import {
  declarationKeys,
  receivingDeclarations,
} from '../../../../../src/passes/ir/declarationCache.js';
import { TextTable } from '../../../../../src/values/textTable.js';
import { recordDeclaration } from '../../../../../src/passes/ir/buildRecords.js';

/** @import {Container, Declaration, Rule} from 'postcss' */

// The records of the rules an edit touches stay readable, or, for a rule that
// left the stylesheet, throw as unreached. Consistency checks compare each
// record with the tree at every read.

/**
 * @param {string} css
 * @return {{root: import('postcss').Root, state: MergeState}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const context = createRunContext(undefined, true);
  const state = new MergeState(['chrome 120'], context);
  state.records = buildTestRecords(root, state, new TextTable(), true);
  return { root, state };
}

test('appendToDeclarations should empty the incoming rule, which stays reached until it is removed', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const [media] = /** @type {Container} */ (root).nodes;
  const [receiving, incoming] = /** @type {Rule[]} */ (
    /** @type {Container} */ (media).nodes
  );
  const record = ruleRecordOf(state.records, incoming);
  appendToDeclarations(
    state,
    ruleRecordOf(state.records, receiving).index,
    ruleRecordOf(state.records, incoming).index
  );
  assert.deepEqual(declarationsOf(state.records, record.index), []);
});

// The entry of a rule names its declarations by position, so an append that
// the chain does not hold would leave the entry out of step with the rule.
test('DeclarationCache#appended should make the checked read throw out of step when the chain does not hold the declaration', () => {
  const { root, state } = setup('a{color:red}');
  const rule = ruleRecordOf(state.records, /** @type {Rule} */ (root.first));
  const { records } = state;
  receivingDeclarations(records, rule.index);
  const width = placeUnlinked(
    records,
    records.root.index,
    recordDeclaration(
      postcss.decl({ prop: 'width', value: '0' }),
      state.runContext
    )
  );
  const stamp = records.declarationStamps.stampOf(rule.index);
  records.declarations.appended(rule.index, width, stamp, stamp);
  assert.throws(
    () => receivingDeclarations(records, rule.index),
    /out of step/v
  );
});

test('appendToDeclarations should leave the record of the receiving rule readable', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const [media] = /** @type {Container} */ (root).nodes;
  const [receiving, incoming] = /** @type {Rule[]} */ (
    /** @type {Container} */ (media).nodes
  );
  appendToDeclarations(
    state,
    ruleRecordOf(state.records, receiving).index,
    ruleRecordOf(state.records, incoming).index
  );
  assert.deepEqual(
    ruleRecordOf(state.records, receiving).selectorIds.map((id) =>
      tokensText(state.tokenLists.get(id))
    ),
    ['a']
  );
});

test('appendToDeclarations should keep the record of the receiving rule', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const [media] = /** @type {Container} */ (root).nodes;
  const [receiving, incoming] = /** @type {Rule[]} */ (
    /** @type {Container} */ (media).nodes
  );
  const record = ruleRecordOf(state.records, receiving);
  appendToDeclarations(
    state,
    ruleRecordOf(state.records, receiving).index,
    ruleRecordOf(state.records, incoming).index
  );
  assert.equal(ruleRecordOf(state.records, receiving), record);
});

test('appendToDeclarations should give the receiving rule the declarations of the incoming rule after its own', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const [media] = /** @type {Container} */ (root).nodes;
  const [receiving, incoming] = /** @type {Rule[]} */ (
    /** @type {Container} */ (media).nodes
  );
  appendToDeclarations(
    state,
    ruleRecordOf(state.records, receiving).index,
    ruleRecordOf(state.records, incoming).index
  );
  assert.deepEqual(
    declarationsOf(
      state.records,
      ruleRecordOf(state.records, receiving).index
    ).map((d) => d.prop),
    ['color', 'width']
  );
});

test('appendToDeclarations should give the record of the receiving rule keys for the declarations it holds', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const [media] = /** @type {Container} */ (root).nodes;
  const [receiving, incoming] = /** @type {Rule[]} */ (
    /** @type {Container} */ (media).nodes
  );
  declarationKeys(state.records, ruleRecordOf(state.records, receiving).index);
  appendToDeclarations(
    state,
    ruleRecordOf(state.records, receiving).index,
    ruleRecordOf(state.records, incoming).index
  );
  assert.deepEqual(
    declarationIds(state.records, ruleRecordOf(state.records, receiving).index),
    declarationsOf(
      state.records,
      ruleRecordOf(state.records, receiving).index
    ).map((d) => d.id)
  );
});

test('removeDeclarations should keep the record of the rule', () => {
  const { root, state } = setup('a{color:red;width:1px}');
  const rule = /** @type {Rule} */ (root.first);
  const record = ruleRecordOf(state.records, rule);
  removeDeclarations(
    state.records,
    record.index,
    claimAt(state.records, record, [0])
  );
  assert.equal(ruleRecordOf(state.records, rule), record);
});

test('removeDeclarations should leave the record with the declarations that remain', () => {
  const { root, state } = setup('a{color:red;width:1px}');
  const rule = /** @type {Rule} */ (root.first);
  ruleRecordOf(state.records, rule);
  const record = ruleRecordOf(state.records, rule);
  removeDeclarations(
    state.records,
    record.index,
    claimAt(state.records, record, [0])
  );
  assert.deepEqual(
    declarationsOf(state.records, ruleRecordOf(state.records, rule).index).map(
      (d) => d.prop
    ),
    ['width']
  );
});

test('removeDeclarations should give the record keys for the declarations that remain', () => {
  const { root, state } = setup('a{color:red;width:1px}');
  const rule = /** @type {Rule} */ (root.first);
  declarationKeys(state.records, ruleRecordOf(state.records, rule).index);
  const record = ruleRecordOf(state.records, rule);
  removeDeclarations(
    state.records,
    record.index,
    claimAt(state.records, record, [0])
  );
  assert.deepEqual(
    declarationIds(state.records, ruleRecordOf(state.records, rule).index),
    [
      recordDeclaration(
        /** @type {Declaration} */ (rule.last),
        state.runContext
      ).id,
    ]
  );
});

test('removeDeclarations should keep the element keys of the record', () => {
  const { root, state } = setup('a,b{color:red;width:1px}');
  const rule = /** @type {Rule} */ (root.first);
  const record = ruleRecordOf(state.records, rule);
  removeDeclarations(
    state.records,
    record.index,
    claimAt(state.records, record, [0])
  );
  assert.deepEqual(elementKeysOf(state.records, record.index), ['a', 'b']);
});

test('removeRules should unlink each rule it removes, so the root no longer reaches it', () => {
  const { root, state } = setup('a{color:red}b{color:red}c{color:red}');
  const [, removed] = /** @type {Rule[]} */ (root.nodes);
  const { index } = ruleRecordOf(state.records, removed);
  removeRules(state, new Set([index]));
  assert.throws(() => state.records.rule(index), /does not reach/v);
});

test('removeRules should leave the record of a rule it keeps readable', () => {
  const { root, state } = setup('a{color:red}b{color:red}c{color:red}');
  const [kept, removed] = /** @type {Rule[]} */ (root.nodes);
  ruleRecordOf(state.records, kept);
  removeRules(state, new Set([ruleRecordOf(state.records, removed).index]));
  assert.deepEqual(
    ruleRecordOf(state.records, kept).selectorIds.map((id) =>
      tokensText(state.tokenLists.get(id))
    ),
    ['a']
  );
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
    state.records,
    ruleRecordOf(state.records, earlier).index,
    ruleRecordOf(state.records, later).index
  );
  const entries = childEntriesOf(
    state.records,
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
    state.records,
    ruleRecordOf(state.records, earlier).index,
    laterRecord.index
  );
  assert.equal(state.records.links.parentOf(laterRecord.index), -1);
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
