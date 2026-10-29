import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { subtreeDeclarations } from '../../../../../src/passes/merge/lib/rules/nonAdjacentMerge.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { buildRecords } from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';

/**
 * The block record of the first at-rule of `css`, and the stylesheet's state.
 *
 * @param {string} css
 */
function blockOf(css) {
  const root = postcss.parse(css);
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildRecords(root, state);
  return state.records.blockOf(
    /** @type {import('postcss').AtRule} */ (root.first)
  );
}

test('subtreeDeclarations should list the declarations of a block at any depth, in document order', () => {
  const block = blockOf('@media print{a{color:red;b{width:1px}}c{top:0}}');
  const props = subtreeDeclarations(block)?.map(
    (declaration) => declaration.prop
  );
  assert.deepEqual(props, ['color', 'width', 'top']);
});

test('subtreeDeclarations should give an empty list for a block with no declarations', () => {
  const block = blockOf('@media print{a{}}');
  assert.deepEqual(subtreeDeclarations(block), []);
});

test('subtreeDeclarations should keep the declarations of a conditional at-rule inside the block', () => {
  const block = blockOf('@media print{@supports (x:y){a{color:red}}}');
  const props = subtreeDeclarations(block)?.map(
    (declaration) => declaration.prop
  );
  assert.deepEqual(props, ['color']);
});

test('subtreeDeclarations should return null when the block directly holds an at-rule the cascade does not model', () => {
  const block = blockOf('@media print{@font-face{font-family:x}}');
  assert.equal(subtreeDeclarations(block), null);
});

test('subtreeDeclarations should return null when a rule of the block holds an at-rule the cascade does not model', () => {
  const block = blockOf('@media print{a{color:red;@font-face{font-family:x}}}');
  assert.equal(subtreeDeclarations(block), null);
});

test('subtreeDeclarations should see the declarations that an edit adds, since nothing is stored', () => {
  const root = postcss.parse('@media print{a{color:red}}');
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildRecords(root, state);
  const block = state.records.blockOf(
    /** @type {import('postcss').AtRule} */ (root.first)
  );
  assert.equal(subtreeDeclarations(block)?.length, 1);
  root.first.first.append(postcss.decl({ prop: 'width', value: '1px' }));
  assert.equal(subtreeDeclarations(block)?.length, 2);
});
