import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import {
  blockRecordOf,
  ruleRecordOf,
  buildTestRecords,
} from './liveRecords.js';

/** @import {BlockRecords} from '../../../../../src/passes/merge/lib/rules/blockRecords.js' */

/**
 * @param {string} css
 * @return {{root: import('postcss').Root, records: BlockRecords}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildTestRecords(root, state);
  return { root, records: state.records };
}

/**
 * The edit stamp of every entry, by index.
 *
 * @param {BlockRecords} records
 * @return {number[]}
 */
function stampsOf(records) {
  return Array.from({ length: records.entryCount() }, (_, index) =>
    records.links.editedAt(index)
  );
}

/**
 * @param {BlockRecords} records
 * @param {number[]} before the stamps before the call
 * @param {number} container
 * @return {void}
 */
function assertStampedAbove(records, before, container) {
  assert.ok(records.links.editedAt(container) > Math.max(...before));
}

test('moveBefore should stamp the rule it links an entry into at its head', () => {
  const { root, records } = setup('a{color:red}b{width:1px}');
  const [a, b] = /** @type {import('postcss').Rule[]} */ (root.nodes);
  const colour = records.links.firstChild(ruleRecordOf(records, a).index);
  records.detach(colour);
  const before = stampsOf(records);
  const bIndex = ruleRecordOf(records, b).index;
  records.moveBefore(records.links.firstChild(bIndex), colour);
  assertStampedAbove(records, before, bIndex);
});

test('moveLast should stamp the rule it links an entry into', () => {
  const { root, records } = setup('a{color:red}b{width:1px}');
  const [a, b] = /** @type {import('postcss').Rule[]} */ (root.nodes);
  const colour = records.links.firstChild(ruleRecordOf(records, a).index);
  records.detach(colour);
  const before = stampsOf(records);
  records.moveLast(ruleRecordOf(records, b).index, colour);
  assertStampedAbove(records, before, ruleRecordOf(records, b).index);
});

test('unlink should stamp the rule it unlinks an entry from', () => {
  const { root, records } = setup('a{color:red}b{width:1px}');
  const [a] = /** @type {import('postcss').Rule[]} */ (root.nodes);
  const holder = ruleRecordOf(records, a).index;
  const colour = records.links.firstChild(holder);
  const before = stampsOf(records);
  records.detach(colour);
  assertStampedAbove(records, before, holder);
});

test('unlink should change no stamp when the entry is linked nowhere', () => {
  const { root, records } = setup('a{color:red}b{width:1px}');
  const [a] = /** @type {import('postcss').Rule[]} */ (root.nodes);
  const colour = records.links.firstChild(ruleRecordOf(records, a).index);
  records.detach(colour);
  const before = stampsOf(records);
  records.detach(colour);
  assert.deepEqual(stampsOf(records), before);
});

test('moveLast should stamp a block the way it stamps a rule', () => {
  const { root, records } = setup('@media print{c{top:0}}d{width:1px}');
  const [media, d] = /** @type {import('postcss').Rule[]} */ (root.nodes);
  const block = blockRecordOf(records, /** @type {any} */ (media)).index;
  const rule = ruleRecordOf(records, d).index;
  records.detach(rule);
  const before = stampsOf(records);
  records.moveLast(block, rule);
  assertStampedAbove(records, before, block);
});

test('moveBefore should stamp the container of later and the old container of an earlier entry that was linked', () => {
  const { root, records } = setup('a{color:red}b{width:1px}');
  const [a, b] = /** @type {import('postcss').Rule[]} */ (root.nodes);
  const holderA = ruleRecordOf(records, a).index;
  const holderB = ruleRecordOf(records, b).index;
  const colour = records.links.firstChild(holderA);
  const width = records.links.firstChild(holderB);
  const before = stampsOf(records);
  records.moveBefore(width, colour);
  records.detach(width);
  assertStampedAbove(records, before, holderB);
  assertStampedAbove(records, before, holderA);
});

test('moveBefore should change only the stamp of later container when the earlier entry was linked nowhere', () => {
  const { root, records } = setup('a{color:red}b{width:1px}');
  const [a, b] = /** @type {import('postcss').Rule[]} */ (root.nodes);
  const holderB = ruleRecordOf(records, b).index;
  const colour = records.links.firstChild(ruleRecordOf(records, a).index);
  const width = records.links.firstChild(holderB);
  records.detach(colour);
  const before = stampsOf(records);
  records.moveBefore(width, colour);
  records.detach(width);
  const after = stampsOf(records);
  assertStampedAbove(records, before, holderB);
  for (const [index, stamp] of after.entries()) {
    if (index !== holderB) assert.equal(stamp, before[index], `entry ${index}`);
  }
});
