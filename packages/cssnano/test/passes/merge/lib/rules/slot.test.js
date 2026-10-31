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
  const slot = state.records.slotOf(ruleRecordOf(state.records, rule));
  const replacement = postcss.rule({ selector: 'b' });
  media.append(replacement);
  // A replacement comes with the record that `ruleRewrite` builds for a clone.
  const record = state.records.recordRule(
    replacement,
    state.properties,
    state.declarationIds
  );
  state.records.substitute(slot, ruleRecordOf(state.records, rule).index, [
    record.index,
  ]);
  assert.deepEqual(slot.rules, [record.index]);
  assert.equal(state.records.slotOf(record), slot);
});

test('moveRule should place the record of the moved rule in a new slot at the end of the target', () => {
  const { root, state } = setup('@media print{a{color:red}}b{width:1px}');
  const [media] = /** @type {Root} */ (root).nodes;
  const rule = /** @type {Rule} */ (/** @type {any} */ (media).first);
  const target = state.records.root;
  const slot = state.records.moveRule(
    target.index,
    ruleRecordOf(state.records, rule).index
  );
  assert.equal(state.records.slotOf(ruleRecordOf(state.records, rule)), slot);
  assert.equal(slot.block, target.index);
  assert.equal(target.children.at(-1), slot);
});

test('moveRule should leave the rule out of the slot it came from', () => {
  const { root, state } = setup('@media print{a{color:red}}');
  const [media] = /** @type {Root} */ (root).nodes;
  const rule = /** @type {Rule} */ (/** @type {any} */ (media).first);
  const from = state.records.slotOf(ruleRecordOf(state.records, rule));
  state.records.moveRule(
    state.records.root.index,
    ruleRecordOf(state.records, rule).index
  );
  assert.deepEqual(from.rules, []);
});
