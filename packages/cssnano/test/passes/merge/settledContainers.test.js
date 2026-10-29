import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import MergeState from '../../../src/passes/merge/lib/rules/mergeState.js';
import { joinNonAdjacent } from '../../../src/passes/merge/lib/rules/nonAdjacentMerge.js';
import { writesOf } from '../../../src/passes/merge/lib/rules/ruleRewrite.js';
import {
  appendToDeclarations,
  buildRecords,
  removeDeclarations,
} from '../../../src/passes/merge/lib/rules/treeEdits.js';

/** @import {AtRule, Declaration, Root, Rule} from 'postcss' */

/**
 * A merge state over `root` that shares the block table of its run context.
 *
 * @param {Root} root
 * @return {MergeState}
 */
function mergeStateOf(root) {
  const context = createRunContext(root);
  const mergeState = new MergeState(['Chrome 120'], context);
  mergeState.records = buildRecords(root, mergeState);
  return mergeState;
}

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
  // The edits go through treeEdits, which invalidate the enclosing blocks and
  // keep the record of `q` in step with its declarations.
  removeDeclarations(mergeState, q, [/** @type {Declaration} */ (q.first)]);
  const kept = mergeState.meta(q).declarations;
  appendToDeclarations(
    mergeState,
    q,
    kept,
    writesOf(kept, mergeState.properties),
    /** @type {Rule} */ (postcss.parse('x{width:1px}').first)
  );
  assert.equal(joinNonAdjacent(root, mergeState), true);
  assert.equal(root.toString(), '@media (x){@media (y){p,q{width:1px}}}');
});
