import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { PropertyTable } from '../../../src/passes/ir/propertyTable.js';
import MergeState from '../../../src/passes/merge/lib/rules/mergeState.js';
import { writesOf } from '../../../src/passes/merge/lib/rules/ruleRewrite.js';
import {
  appendToDeclarations,
  buildRecords,
} from '../../../src/passes/merge/lib/rules/treeEdits.js';
import { ruleRecordOf } from './lib/rules/liveRecords.js';

// The incoming rule keeps its emptied block `b{}` until a later sweep drops it,
// so the tree reads the joined declarations on `a` alone.
test('appendToDeclarations drops an equal declaration from the incoming rule and moves the rest to the receiving rule', () => {
  const root = postcss.parse(
    '@media print{a{color:red}b{color:red;width:1px}}'
  );
  const media = /** @type {import('postcss').AtRule} */ (root.first);
  const [receiving, incoming] = /** @type {import('postcss').Rule[]} */ (
    media.nodes
  );
  const kept = [...receiving.nodes];
  const mergeState = new MergeState(['chrome 120']);
  mergeState.records = buildRecords(root, mergeState);
  appendToDeclarations(
    mergeState,
    ruleRecordOf(mergeState.records, receiving),
    /** @type {import('postcss').Declaration[]} */ (kept),
    writesOf(kept, new PropertyTable()),
    ruleRecordOf(mergeState.records, incoming)
  );

  assert.equal(root.toString(), '@media print{a{color:red;width:1px}b{}}');
});
