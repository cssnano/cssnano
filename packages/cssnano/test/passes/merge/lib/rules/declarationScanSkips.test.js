import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postcss from 'postcss';
import { enableConsistencyChecks } from '../../../../../src/passes/ir/consistencyChecks.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { Slot } from '../../../../../src/passes/merge/lib/rules/blockRecords.js';
import DeclarationScan from '../../../../../src/passes/merge/lib/rules/declarationScan.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import {
  buildRecords,
  removeRules,
} from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import { ruleRecordOf } from './liveRecords.js';

/** @import {Container, Rule} from 'postcss' */

before(() => enableConsistencyChecks(true));
after(() => enableConsistencyChecks(false));

test('declarationBetween should throw under consistency checks when an emptied run it jumped over is refilled', () => {
  const root = postcss.parse('p{color:red;a{}b{}c{}d{}}');
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildRecords(root, state);
  const { records } = state;
  const [, a, b, c, d] = /** @type {Container} */ (root.first).nodes;
  const rule = (/** @type {Rule} */ node) => ruleRecordOf(records, node);
  const [recordA, recordB, recordC, recordD] = [a, b, c, d].map((node) =>
    rule(/** @type {Rule} */ (node))
  );
  // Removing `b` and `c` leaves two adjacent emptied slots, which one walk jumps.
  removeRules(state, new Set([recordB.index, recordC.index]));
  const scan = new DeclarationScan(records);
  const outside = new Map();
  assert.equal(scan.declarationBetween(recordA, recordD, outside), false);
  // Refill the slot of `c` mid-scan, so the jump over it no longer skips an emptied entry.
  const holder = records.block(rule(/** @type {Rule} */ (root.first)).block);
  const position = recordC.slotPosition;
  const live = records.recordRule(
    postcss.rule({ selector: 'x' }),
    state.properties,
    state.declarationIds
  );
  live.place(holder.index, position);
  holder.children[position] = new Slot(holder.index, position, [live.index]);
  assert.throws(
    () => scan.declarationBetween(recordA, recordD, outside),
    /no longer emptied/v
  );
});
