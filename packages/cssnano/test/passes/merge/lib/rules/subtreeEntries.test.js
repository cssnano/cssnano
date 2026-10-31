import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { subtreeEntries } from '../../../../../src/passes/merge/lib/rules/nonAdjacentMerge.js';
import { RuleRecord } from '../../../../../src/passes/merge/lib/rules/ruleRecord.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import {
  buildRecords,
  moveChildren,
} from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { entryOf } from './liveRecords.js';

/**
 * The entries under the first at-rule of `css`, read from its record.
 *
 * @param {string} css
 */
function entriesOf(css) {
  const root = postcss.parse(css);
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildRecords(root, state);
  const block = entryOf(
    state.records,
    /** @type {import('postcss').AtRule} */ (root.first)
  );
  return subtreeEntries(block);
}

/**
 * The property names of the declarations of `entries`, in order: a rule
 * record stands for its own declarations.
 *
 * @param {import('../../../../../src/passes/merge/lib/rules/ruleRecord.js').RuleRecord[] | import('postcss').Declaration[] | null} entries
 */
function propsOf(entries) {
  return entries?.flatMap((entry) =>
    entry instanceof RuleRecord
      ? entry.declarations.map((declaration) => declaration.prop)
      : [entry.prop]
  );
}

test('subtreeEntries should list the rule records and declarations of a block at any depth, in document order', () => {
  assert.deepEqual(
    propsOf(entriesOf('@media print{a{color:red;b{width:1px}}c{top:0}}')),
    ['color', 'width', 'top']
  );
});

test('subtreeEntries should list a rule that holds a rule as its own record, not as bare declarations', () => {
  const entries = entriesOf('@media print{a{color:red;b{width:1px}}}');
  assert.deepEqual(
    entries?.map((entry) => entry instanceof RuleRecord),
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
  assert.equal(entriesOf('@media print{@font-face{font-family:x}}'), null);
});

test('subtreeEntries should return null when a rule of the block holds an at-rule the cascade does not model', () => {
  assert.equal(
    entriesOf('@media print{a{color:red;@font-face{font-family:x}}}'),
    null
  );
});

test('subtreeEntries should see the declarations that an edit adds, since nothing is stored', () => {
  const root = postcss.parse(
    '@media print{a{color:red}}@media print{b{top:0}}'
  );
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildRecords(root, state);
  const [first, second] = /** @type {import('postcss').AtRule[]} */ (
    root.nodes
  );
  const block = entryOf(state.records, first);
  assert.equal(propsOf(subtreeEntries(block))?.length, 1);
  moveChildren(block, entryOf(state.records, second));
  assert.equal(propsOf(subtreeEntries(block))?.length, 2);
});
