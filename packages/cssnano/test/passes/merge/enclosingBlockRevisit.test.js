import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import MergeState from '../../../src/passes/merge/lib/rules/mergeState.js';
import { joinNonAdjacent } from '../../../src/passes/merge/lib/rules/nonAdjacentMerge.js';
import { writeBack } from '../../../src/passes/merge/lib/rules/writeBack.js';
import {
  appendToDeclarations,
  removeRules,
} from '../../../src/passes/merge/lib/rules/treeEdits.js';
import {
  ruleRecordOf,
  buildTestRecords,
  claimAt,
  nodesOf,
} from './lib/rules/liveRecords.js';
import { removeDeclarations } from '../../../src/passes/merge/lib/rules/arenaEdits.js';

/** @import {AtRule, Root, Rule} from 'postcss' */

/**
 * A merge state over `root` with its run context.
 *
 * @param {Root} root
 * @return {MergeState}
 */
function mergeStateOf(root) {
  const mergeState = new MergeState(['Chrome 120'], createRunContext());
  mergeState.records = buildTestRecords(root, mergeState);
  return mergeState;
}

test('joinNonAdjacent: an edit reported to a nested rule makes its enclosing at-rules visit again and join', () => {
  const root = postcss.parse(
    '@media (x){@media (y){p{width:1px}q{height:2px}}}x{width:1px}'
  );
  const mergeState = mergeStateOf(root);
  assert.equal(joinNonAdjacent(mergeState.records.root, mergeState), false);
  const inner = /** @type {AtRule} */ (
    /** @type {AtRule} */ (root.first).first
  );
  const q = /** @type {Rule} */ (inner.last);
  // The edit goes through treeEdits, which keeps the record of `q` in step with
  // its declarations.
  const record = ruleRecordOf(mergeState.records, q);
  removeDeclarations(
    mergeState.records,
    record.index,
    claimAt(mergeState.records, record, [0])
  );
  // As in a merge, the incoming rule is in the tree, and it leaves the tree
  // once `q` takes its declarations.
  const incoming = ruleRecordOf(
    mergeState.records,
    /** @type {Rule} */ (root.last)
  );
  appendToDeclarations(
    mergeState,
    ruleRecordOf(mergeState.records, q).index,
    incoming.index
  );
  removeRules(mergeState, new Set([incoming.index]));
  assert.equal(joinNonAdjacent(mergeState.records.root, mergeState), true);
  writeBack(mergeState.records, nodesOf(mergeState.records));
  assert.equal(root.toString(), '@media (x){@media (y){p,q{width:1px}}}');
});
