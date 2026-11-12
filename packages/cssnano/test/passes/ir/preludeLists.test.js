import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import { containerId } from '../../../src/passes/merge/lib/duplicates/structuralIds.js';
import MergeState from '../../../src/passes/merge/lib/rules/mergeState.js';
import { transformPlugin } from '../../../src/passes/merge/index.js';
import { TextTable } from '../../../src/values/textTable.js';
import {
  blockRecordOf,
  buildTestRecords,
} from '../merge/lib/rules/liveRecords.js';

/**
 * @param {string} css
 * @return {{root: import('postcss').Root, state: MergeState, records: import('../../../src/passes/ir/blockRecords.js').BlockRecords}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const state = new MergeState(
    ['chrome 120'],
    createRunContext(undefined, true)
  );
  const records = buildTestRecords(root, state, new TextTable(), true);
  return { root, state, records };
}

test('equal preludes share the list id their text has in the run', () => {
  const { root, state, records } = setup(
    '@media print{a{color:red}}@media print{b{color:blue}}'
  );
  const { valueIds, tokenLists } = state.runContext;
  const id = valueIds.idOf(tokenLists, undefined, 'print');
  const [first, second] = root.nodes;
  assert.equal(blockRecordOf(records, first).preludeId, id);
  assert.equal(blockRecordOf(records, second).preludeId, id);
});

test('an at-rule block record holds its prelude as a list, not as text', () => {
  const { root, records } = setup('@media print{a{color:red}}');
  assert.equal('params' in blockRecordOf(records, root.first), false);
});

test('two at-rules that differ only in the comment after their name have different structural ids', () => {
  const { root, state, records } = setup(
    '@media/*x*/print{a{color:red}}@media print{a{color:red}}'
  );
  const [commented, plain] = root.nodes;
  const layered = new Set();
  const { declarations } = state.runContext;
  assert.notEqual(
    containerId(declarations, layered, blockRecordOf(records, commented), []),
    containerId(declarations, layered, blockRecordOf(records, plain), [])
  );
});

test('discarding duplicates removes an at-rule whose name differs only in case', async () => {
  const result = await postcss([
    transformPlugin('discardDuplicates', true)(),
  ]).process('@MEDIA print{a{color:red}}@media print{a{color:red}}', {
    from: undefined,
  });
  assert.equal(result.css, '@media print{a{color:red}}');
});
