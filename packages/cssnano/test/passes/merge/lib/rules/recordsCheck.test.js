import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postcss from 'postcss';
import { enableConsistencyChecks } from '../../../../../src/passes/ir/consistencyChecks.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { assertRecordsWellFormed } from '../../../../../src/passes/merge/lib/rules/recordsCheck.js';
import { buildRecords } from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import { assertRecordsMatchTree } from '../../../../../src/passes/merge/lib/rules/writeBack.js';
import { blockRecordOf } from './liveRecords.js';

/** @import {BlockRecord, Slot} from '../../../../../src/passes/merge/lib/rules/blockRecords.js' */
/** @import {Root} from 'postcss' */

before(() => enableConsistencyChecks(true));
after(() => enableConsistencyChecks(false));

/**
 * @param {string} css
 * @return {{root: Root, state: MergeState}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const context = createRunContext();
  const state = new MergeState(['chrome 120'], context);
  state.records = buildRecords(root, state);
  return { root, state };
}

test('assertRecordsWellFormed should accept records built from a stylesheet', () => {
  const { state } = setup(
    '@media (x){@media (y){p{width:1px}q{height:2px}}}a{color:red;b{width:1px}}'
  );
  assert.doesNotThrow(() => assertRecordsWellFormed(state));
});

test('assertRecordsWellFormed should throw when a dropped block still holds a live child, which the tree check does not see', () => {
  const { root, state } = setup('@layer a{p{color:red}}');
  const layer = /** @type {BlockRecord} */ (
    blockRecordOf(state.records, /** @type {any} */ (root.first))
  );
  // A sweep takes a dropped block out of the tree, so the tree lacks it too.
  layer.dropped = true;
  root.first?.remove();
  assert.doesNotThrow(() => assertRecordsMatchTree(state));
  assert.throws(() => assertRecordsWellFormed(state), /out of step/v);
});

test('assertRecordsWellFormed should throw when a slot names a block other than the one holding it', () => {
  const { root, state } = setup('@media print{a{color:red}b{width:1px}}');
  const media = /** @type {BlockRecord} */ (
    blockRecordOf(state.records, /** @type {any} */ (root.first))
  );
  const [first] = /** @type {Slot[]} */ (media.children);
  first.block = state.records.root;
  assert.throws(() => assertRecordsWellFormed(state), /out of step/v);
});
