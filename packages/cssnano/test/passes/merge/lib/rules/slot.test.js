import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postcss from 'postcss';
import { enableConsistencyChecks } from '../../../../../src/passes/ir/consistencyChecks.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { buildRecords } from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import { ruleRecordOf } from './liveRecords.js';

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
  const context = createRunContext();
  const state = new MergeState(['chrome 120'], context);
  state.records = buildRecords(root, state);
  return { root, state };
}

test('Slot#substitute should replace the rule in its slot and place the replacements there', () => {
  const { root, state } = setup('@media print{a{color:red}}');
  const [media] = /** @type {Root} */ (root).nodes;
  const rule = /** @type {Rule} */ (/** @type {any} */ (media).first);
  const slot = /** @type {Slot} */ (ruleRecordOf(state.records, rule).slot);
  const replacement = postcss.rule({ selector: 'b' });
  media.append(replacement);
  // A replacement comes with the record that `ruleRewrite` builds for a clone.
  const record = state.records.recordRule(replacement);
  slot.substitute(ruleRecordOf(state.records, rule), [record]);
  assert.deepEqual(slot.rules, [record]);
  assert.equal(record.slot, slot);
});

test('moveRule should place the record of the moved rule in a new slot at the end of the target', () => {
  const { root, state } = setup('@media print{a{color:red}}b{width:1px}');
  const [media] = /** @type {Root} */ (root).nodes;
  const rule = /** @type {Rule} */ (/** @type {any} */ (media).first);
  const from = /** @type {Slot} */ (ruleRecordOf(state.records, rule).slot);
  const target = state.records.root;
  const slot = target.moveRule(ruleRecordOf(state.records, rule), from);
  assert.equal(ruleRecordOf(state.records, rule).slot, slot);
  assert.equal(slot.block, target);
  assert.equal(target.children.at(-1), slot);
});

test('moveRule should leave the rule out of the slot it came from', () => {
  const { root, state } = setup('@media print{a{color:red}}');
  const [media] = /** @type {Root} */ (root).nodes;
  const rule = /** @type {Rule} */ (/** @type {any} */ (media).first);
  const from = /** @type {Slot} */ (ruleRecordOf(state.records, rule).slot);
  state.records.root.moveRule(ruleRecordOf(state.records, rule), from);
  assert.deepEqual(from.rules, []);
});
