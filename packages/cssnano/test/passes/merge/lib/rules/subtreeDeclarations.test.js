import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { subtreeDeclarations } from '../../../../../src/passes/merge/lib/rules/nonAdjacentMerge.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import {
  buildRecords,
  moveChildren,
} from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';

/**
 * The declarations under the first at-rule of `css`, read from its record.
 *
 * @param {string} css
 */
function declarationsOf(css) {
  const root = postcss.parse(css);
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildRecords(root, state);
  const block = state.records.blockOf(
    /** @type {import('postcss').AtRule} */ (root.first)
  );
  return subtreeDeclarations(block, state.records);
}

test('subtreeDeclarations should list the declarations of a block at any depth, in document order', () => {
  const props = declarationsOf(
    '@media print{a{color:red;b{width:1px}}c{top:0}}'
  )?.map((declaration) => declaration.prop);
  assert.deepEqual(props, ['color', 'width', 'top']);
});

test('subtreeDeclarations should give an empty list for a block with no declarations', () => {
  assert.deepEqual(declarationsOf('@media print{a{}}'), []);
});

test('subtreeDeclarations should keep the declarations of a conditional at-rule inside the block', () => {
  const props = declarationsOf(
    '@media print{@supports (x:y){a{color:red}}}'
  )?.map((declaration) => declaration.prop);
  assert.deepEqual(props, ['color']);
});

test('subtreeDeclarations should return null when the block directly holds an at-rule the cascade does not model', () => {
  assert.equal(declarationsOf('@media print{@font-face{font-family:x}}'), null);
});

test('subtreeDeclarations should return null when a rule of the block holds an at-rule the cascade does not model', () => {
  assert.equal(
    declarationsOf('@media print{a{color:red;@font-face{font-family:x}}}'),
    null
  );
});

test('subtreeDeclarations should see the declarations that an edit adds, since nothing is stored', () => {
  const root = postcss.parse(
    '@media print{a{color:red}}@media print{b{top:0}}'
  );
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildRecords(root, state);
  const [first, second] = /** @type {import('postcss').AtRule[]} */ (
    root.nodes
  );
  const block = state.records.blockOf(first);
  assert.equal(subtreeDeclarations(block, state.records)?.length, 1);
  moveChildren(state, first, second);
  assert.equal(subtreeDeclarations(block, state.records)?.length, 2);
});
