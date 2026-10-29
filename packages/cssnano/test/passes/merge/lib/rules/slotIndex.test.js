import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postcss from 'postcss';
import { enableConsistencyChecks } from '../../../../../src/passes/ir/consistencyChecks.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import SlotIndex from '../../../../../src/passes/merge/lib/rules/slotIndex.js';
import { buildRecords } from '../../../../../src/passes/merge/lib/rules/treeEdits.js';

/** @import {Root, Rule} from 'postcss' */
/** @import {Slot} from '../../../../../src/passes/merge/lib/rules/blockRecords.js' */

before(() => enableConsistencyChecks(true));
after(() => enableConsistencyChecks(false));

/**
 * @param {string} css
 * @return {{root: Root, state: MergeState}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const context = createRunContext(root);
  const state = new MergeState(['chrome 120'], context);
  state.records = buildRecords(root, state);
  return { root, state };
}

test('moveRule should place the record of the moved rule in a new slot at the end of the target', () => {
  const { root, state } = setup('@media print{a{color:red}}b{width:1px}');
  const [media] = /** @type {Root} */ (root).nodes;
  const rule = /** @type {Rule} */ (/** @type {any} */ (media).first);
  const from = /** @type {Slot} */ (state.meta(rule).slot);
  const target = state.records.root;
  const index = new SlotIndex(state.records);
  const slot = index.moveRule(rule, from, target);
  assert.equal(state.meta(rule).slot, slot);
  assert.equal(slot.block, target);
  assert.equal(target.children.at(-1), slot);
});

test('moveRule should leave the rule out of the slot it came from', () => {
  const { root, state } = setup('@media print{a{color:red}}');
  const [media] = /** @type {Root} */ (root).nodes;
  const rule = /** @type {Rule} */ (/** @type {any} */ (media).first);
  const from = /** @type {Slot} */ (state.meta(rule).slot);
  new SlotIndex(state.records).moveRule(rule, from, state.records.root);
  assert.deepEqual(from.rules, []);
});
