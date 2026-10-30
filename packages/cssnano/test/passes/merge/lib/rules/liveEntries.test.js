import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { buildRecords } from '../../../../../src/passes/merge/lib/rules/treeEdits.js';

/** @import {Container, Rule} from 'postcss' */

test('liveEntries should yield the rule record, the at-rule block record and the comment, in order', () => {
  const root = postcss.parse('a{color:red}@media print{b{width:1px}}/* c */');
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildRecords(root, state);
  const [rule, media, comment] = root.nodes;
  const entries = state.records.root.liveEntries();
  assert.equal(entries.length, 3);
  assert.equal(entries[0], state.records.metaOf(/** @type {Rule} */ (rule)));
  assert.equal(
    entries[1],
    state.records.blockOf(/** @type {Container} */ (media))
  );
  assert.equal(entries[2], comment);
});
