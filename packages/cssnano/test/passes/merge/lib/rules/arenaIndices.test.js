import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { DeclarationRecord } from '../../../../../src/passes/ir/declarationRecord.js';
import {
  BlockRecord,
  NodeEntry,
} from '../../../../../src/passes/merge/lib/rules/blockRecord.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { buildRecords } from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import { blockRecordOf } from './liveRecords.js';

/** @import {Container} from 'postcss' */

/**
 * @param {string} css
 * @return {{root: import('postcss').Root, state: MergeState}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildRecords(root, state);
  return { root, state };
}

test('every index below the entry count of a fresh build names the entry that holds it', () => {
  const { state } = setup(
    'a{color:red}@media print{b{width:1px}/* c */}@font-face{src:x}'
  );
  const { records } = state;
  for (let index = 0; index < records.entryCount(); index++) {
    assert.equal(records.entry(index)?.index, index);
  }
});

test('a declaration of a block is an arena entry that the block chain links', () => {
  const { root, state } = setup('@font-face{src:x;font-family:y}');
  const block = blockRecordOf(
    state.records,
    /** @type {Container} */ (root.nodes[0])
  );
  assert.equal(block.count, 2);
  const { links } = state.records;
  for (
    let index = links.firstChild(block.index);
    index !== -1;
    index = links.nextSibling(index)
  ) {
    const entry = state.records.entry(index);
    assert.ok(entry instanceof DeclarationRecord);
    assert.equal(entry.index, index);
  }
});

test('a comment of a block is a bare arena entry that the block chain links', () => {
  const { root, state } = setup('@media print{/* note */}');
  const block = blockRecordOf(
    state.records,
    /** @type {Container} */ (root.nodes[0])
  );
  const index = state.records.links.firstChild(block.index);
  const entry = state.records.entry(index);
  assert.ok(entry instanceof NodeEntry);
  assert.equal(entry.node.type, 'comment');
  assert.equal(entry.index, index);
});

test('every entry of a block chain names that block as its container', () => {
  const { state } = setup(
    'a{color:red}@media print{b{width:1px}/* c */}@font-face{src:x}'
  );
  const { links } = state.records;
  for (const block of state.records.blocks()) {
    assert.ok(block instanceof BlockRecord);
    for (
      let index = links.firstChild(block.index);
      index !== -1;
      index = links.nextSibling(index)
    ) {
      assert.equal(links.parentOf(index), block.index);
    }
  }
});
