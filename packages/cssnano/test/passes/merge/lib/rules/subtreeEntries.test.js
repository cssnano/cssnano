import { declarationsOf } from '../../../../../src/passes/ir/blockChildren.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { subtreeEntries } from '../../../../../src/passes/merge/lib/rules/nonAdjacentMerge.js';
/** @import {BlockRecord} from '../../../../../src/passes/ir/blockRecord.js' */
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { entryOf, buildTestRecords } from './liveRecords.js';
import { adopt } from '../../../../../src/passes/ir/arenaEdits.js';
import { DECLARATION, RULE } from '../../../../../src/passes/ir/blockRecord.js';

/**
 * The entries under the first at-rule of `css`, read from its record.
 *
 * @param {string} css
 */
function entriesOf(css) {
  const root = postcss.parse(css);
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildTestRecords(root, state);
  const block = entryOf(
    state.records,
    /** @type {import('postcss').AtRule} */ (root.first)
  );
  return {
    records: state.records,
    entries: subtreeEntries(state.records, block),
  };
}

/**
 * The property names of the declarations a block chain links, in order.
 *
 * @param {import('../../../../../src/passes/ir/blockRecords.js').BlockRecords} records
 * @param {number} block the index of the block
 * @return {string[]}
 */
function chainProps(records, block) {
  /** @type {string[]} */
  const props = [];
  for (
    let index = records.links.firstChild(block);
    index !== -1;
    index = records.links.nextSibling(index)
  ) {
    const item = records.entry(index);
    if (item.kind === DECLARATION) props.push(item.prop);
  }
  return props;
}

/**
 * The property names of the declarations of `entries`, in order: a rule
 * record stands for its own declarations.
 *
 * @param {import('../../../../../src/passes/ir/ruleRecord.js').RuleRecord[] | import('postcss').Declaration[] | null} entries
 */
function propsOf({ records, entries }) {
  return entries?.flatMap((entry) => {
    if (!(entry.kind === RULE)) return [entry.prop];
    if (entry.context === -1) {
      return declarationsOf(records, entry.index).map(
        (declaration) => declaration.prop
      );
    }
    return chainProps(records, entry.index);
  });
}

test('subtreeEntries should list the rule records and declarations of a block at any depth, in document order', () => {
  assert.deepEqual(
    propsOf(entriesOf('@media print{a{color:red;b{width:1px}}c{top:0}}')),
    ['color', 'width', 'top']
  );
});

test('subtreeEntries should list a rule that holds a rule as its own record, not as bare declarations', () => {
  const { entries } = entriesOf('@media print{a{color:red;b{width:1px}}}');
  assert.deepEqual(
    entries?.map((entry) => entry.kind === RULE),
    [true, true]
  );
});

test('subtreeEntries should give an empty list of declarations for a block with no declarations', () => {
  assert.deepEqual(propsOf(entriesOf('@media print{a{}}')), []);
});

test('subtreeEntries should keep the declarations of a conditional at-rule inside the block', () => {
  assert.deepEqual(
    propsOf(entriesOf('@media print{@supports (x:y){a{color:red}}}')),
    ['color']
  );
});

test('subtreeEntries should return null when the block directly holds an at-rule the cascade does not model', () => {
  assert.equal(
    entriesOf('@media print{@font-face{font-family:x}}').entries,
    null
  );
});

test('subtreeEntries should return null when a rule of the block holds an at-rule the cascade does not model', () => {
  assert.equal(
    entriesOf('@media print{a{color:red;@font-face{font-family:x}}}').entries,
    null
  );
});

test('subtreeEntries should see the declarations that an edit adds, since nothing is stored', () => {
  const root = postcss.parse(
    '@media print{a{color:red}}@media print{b{top:0}}'
  );
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildTestRecords(root, state);
  const [first, second] = /** @type {import('postcss').AtRule[]} */ (
    root.nodes
  );
  const block = entryOf(state.records, first);
  const propsNow = () =>
    propsOf({
      records: state.records,
      entries: subtreeEntries(state.records, block),
    });
  assert.equal(propsNow()?.length, 1);
  adopt(
    state.records,
    block.index,
    /** @type {BlockRecord} */ (entryOf(state.records, second)).index
  );
  assert.equal(propsNow()?.length, 2);
});
