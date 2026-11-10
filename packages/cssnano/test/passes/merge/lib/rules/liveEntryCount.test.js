import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { liveEntryCount } from '../../../../../src/passes/merge/lib/rules/liveEntryCount.js';
import { declarationsOf } from '../../../../../src/passes/merge/lib/rules/blockChildren.js';
import { buildTestRecords, ruleRecordOf } from './liveRecords.js';

/** @import {Rule} from 'postcss' */

/**
 * @param {string} css
 * @return {{root: import('postcss').Root, state: MergeState}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildTestRecords(root, state);
  return { root, state };
}

test('liveEntryCount should count the rules, at-rules and declarations, not the comments', () => {
  // Four rules and at-rules (a, @media, b, @import) and three declarations.
  const { state } = setup(
    'a{color:red}/* c */@media x{b{c:d;e:f}}@import "y";'
  );
  assert.equal(liveEntryCount(state.records), 7);
});

test('liveEntryCount should drop by one when a detach takes a declaration out of its rule', () => {
  const { root, state } = setup('a{color:red;width:1px}');
  const record = ruleRecordOf(state.records, /** @type {Rule} */ (root.first));
  const [declaration] = declarationsOf(state.records, record.index);
  assert.equal(liveEntryCount(state.records), 3);
  state.records.detach(declaration.index);
  assert.equal(liveEntryCount(state.records), 2);
});

test('liveEntryCount should not count the entries of a block that a detach took out of the stylesheet', () => {
  const { root, state } = setup('a{color:red}b{width:1px}');
  const record = ruleRecordOf(state.records, /** @type {Rule} */ (root.first));
  state.records.detach(record.index);
  // Only b and its declaration stay on the chains.
  assert.equal(liveEntryCount(state.records), 2);
});
