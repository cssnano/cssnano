import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { invalidate } from '../../../src/passes/ir/blockTable.js';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import MergeState from '../../../src/passes/merge/lib/rules/mergeState.js';
import { joinNonAdjacent } from '../../../src/passes/merge/lib/rules/nonAdjacentMerge.js';

/** @import {AtRule, ChildNode, Declaration, Root, Rule} from 'postcss' */

/**
 * A merge state over `root` that shares the block table of its run context.
 *
 * @param {Root} root
 * @return {MergeState}
 */
function mergeStateOf(root) {
  const context = createRunContext(root);
  return new MergeState(['Chrome 120'], context);
}

/**
 * Counts the reads of `block.nodes`, which a visit of the block makes.
 *
 * @param {AtRule} container
 * @return {{count: number}}
 */
function countNodeReads(container) {
  let value = /** @type {ChildNode[]} */ (container.nodes);
  const reads = { count: 0 };
  Object.defineProperty(container, 'nodes', {
    configurable: true,
    get() {
      reads.count++;
      return value;
    },
    set(next) {
      value = next;
    },
  });
  return reads;
}

test('joinNonAdjacent: an at-rule that joined nothing is not visited again in a later round', () => {
  const root = postcss.parse(
    'a{color:red}b{color:red}@media (x){p{width:1px}q{height:1px}}'
  );
  const mergeState = mergeStateOf(root);
  const media = /** @type {AtRule} */ (root.last);
  assert.equal(joinNonAdjacent(root, mergeState), true);
  const reads = countNodeReads(media);
  assert.equal(joinNonAdjacent(root, mergeState), false);
  // The root reads the at-rule's nodes twice, for its join keys and its child
  // loop; a visit of the at-rule would add three more reads.
  assert.equal(reads.count, 2);
});

test('joinNonAdjacent: an edit reported to a nested rule makes its enclosing at-rules visit again and join', () => {
  const root = postcss.parse(
    '@media (x){@media (y){p{width:1px}q{height:2px}}}'
  );
  const mergeState = mergeStateOf(root);
  assert.equal(joinNonAdjacent(root, mergeState), false);
  const inner = /** @type {AtRule} */ (
    /** @type {AtRule} */ (root.first).first
  );
  const q = /** @type {Rule} */ (inner.last);
  invalidate(q);
  const declaration = /** @type {Declaration} */ (q.first);
  declaration.prop = 'width';
  declaration.value = '1px';
  // The merge state caches a rule's declaration keys, so an edit forgets them.
  mergeState.forget(q);
  assert.equal(joinNonAdjacent(root, mergeState), true);
  assert.equal(root.toString(), '@media (x){@media (y){p,q{width:1px}}}');
});
