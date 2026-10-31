import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import MergeState from '../../../src/passes/merge/lib/rules/mergeState.js';
import { writesOf } from '../../../src/passes/merge/lib/rules/ruleRewrite.js';
import {
  appendToDeclarations,
  buildRecords,
  removeRules,
} from '../../../src/passes/merge/lib/rules/treeEdits.js';
import { writeBack } from '../../../src/passes/merge/lib/rules/writeBack.js';
import { ruleRecordOf } from './lib/rules/liveRecords.js';

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
  mergeState.records = buildRecords(root, mergeState);
  const kept = [...ruleRecordOf(mergeState.records, receiving).declarations];
  appendToDeclarations(
    mergeState,
    ruleRecordOf(mergeState.records, receiving),
    writesOf(kept),
    ruleRecordOf(mergeState.records, incoming)
  );
  removeRules(
    mergeState,
    new Set([ruleRecordOf(mergeState.records, incoming)])
  );
  writeBack(mergeState.records.blocks());

  assert.equal(root.toString(), '@media print{a{color:red;width:1px}}');
});
