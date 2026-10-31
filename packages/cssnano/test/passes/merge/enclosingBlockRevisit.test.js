import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import MergeState from '../../../src/passes/merge/lib/rules/mergeState.js';
import { joinNonAdjacent } from '../../../src/passes/merge/lib/rules/nonAdjacentMerge.js';
import { writesOf } from '../../../src/passes/merge/lib/rules/ruleRewrite.js';
import { writeBack } from '../../../src/passes/merge/lib/rules/writeBack.js';
import {
  appendToDeclarations,
  buildRecords,
  removeDeclarations,
} from '../../../src/passes/merge/lib/rules/treeEdits.js';

/** @import {AtRule, Declaration, Root, Rule} from 'postcss' */

/**
 * A merge state over `root` with its run context.
 *
 * @param {Root} root
 * @return {MergeState}
 */
function mergeStateOf(root) {
  const mergeState = new MergeState(['Chrome 120'], createRunContext());
  mergeState.records = buildRecords(root, mergeState);
  return mergeState;
}

test('joinNonAdjacent: an edit reported to a nested rule makes its enclosing at-rules visit again and join', () => {
  const root = postcss.parse(
    '@media (x){@media (y){p{width:1px}q{height:2px}}}'
  );
  const mergeState = mergeStateOf(root);
  assert.equal(joinNonAdjacent(mergeState.records.root, mergeState), false);
  const inner = /** @type {AtRule} */ (
    /** @type {AtRule} */ (root.first).first
  );
  const q = /** @type {Rule} */ (inner.last);
  // The edit goes through treeEdits, which keeps the record of `q` in step with
  // its declarations.
  removeDeclarations(mergeState, mergeState.meta(q), [
    /** @type {Declaration} */ (q.first),
  ]);
  const kept = mergeState.meta(q).declarations;
  const incoming = /** @type {Rule} */ (postcss.parse('x{width:1px}').first);
  const incomingRecord = mergeState.records.recordRule(incoming);
  appendToDeclarations(
    mergeState,
    mergeState.meta(q),
    kept,
    writesOf(kept, mergeState.properties),
    incomingRecord
  );
  assert.equal(joinNonAdjacent(mergeState.records.root, mergeState), true);
  writeBack(mergeState.records.blocks());
  assert.equal(root.toString(), '@media (x){@media (y){p,q{width:1px}}}');
});
