import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import MergeState from '../../../src/passes/merge/lib/rules/mergeState.js';
import {
  appendToDeclarations,
  removeRules,
} from '../../../src/passes/merge/lib/rules/treeEdits.js';
import { writeBack } from '../../../src/passes/merge/lib/rules/writeBack.js';
import { ruleRecordOf, buildTestRecords } from './lib/rules/liveRecords.js';

// The incoming rule leaves the tree once the placement drops it, so the tree
// reads the joined declarations on `a` alone.
test('appendToDeclarations drops an equal declaration from the incoming rule and moves the rest to the receiving rule', () => {
  const root = postcss.parse(
    '@media print{a{color:red}b{color:red;width:1px}}'
  );
  const media = /** @type {import('postcss').AtRule} */ (root.first);
  const [receiving, incoming] = /** @type {import('postcss').Rule[]} */ (
    media.nodes
  );
  const mergeState = new MergeState(['chrome 120']);
  mergeState.records = buildTestRecords(root, mergeState);
  appendToDeclarations(
    mergeState,
    ruleRecordOf(mergeState.records, receiving).index,
    ruleRecordOf(mergeState.records, incoming).index
  );
  removeRules(
    mergeState,
    new Set([ruleRecordOf(mergeState.records, incoming).index])
  );
  writeBack(mergeState.records);

  assert.equal(root.toString(), '@media print{a{color:red;width:1px}}');
});

test('appendToDeclarations sees each declaration it appended, so a repeat of it is dropped', () => {
  const root = postcss.parse('a{}b{width:1px;width:1px}');
  const [receiving, incoming] = /** @type {import('postcss').Rule[]} */ (
    root.nodes
  );
  const mergeState = new MergeState(['chrome 120']);
  mergeState.records = buildTestRecords(root, mergeState);
  const to = ruleRecordOf(mergeState.records, receiving);
  const from = ruleRecordOf(mergeState.records, incoming);
  appendToDeclarations(mergeState, to.index, from.index);
  assert.equal(to.declarationsOf(mergeState.records).length, 1);
});
