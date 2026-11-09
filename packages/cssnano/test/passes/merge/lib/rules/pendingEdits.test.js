import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import {
  applyChildEdits,
  detach,
} from '../../../../../src/passes/merge/lib/deferredChildEdits.js';
import { buildRecords } from '../../../../../src/passes/merge/lib/rules/treeEdits.js';

test('buildRecords should throw under consistency checks when the stylesheet holds a detached child that is not applied', () => {
  const root = postcss.parse('a{color:red}b{color:red}');
  detach(root.first);
  assert.throws(
    () => buildRecords(root, createRunContext(undefined, true)),
    /edits its child list/v
  );
});

test('buildRecords should throw under consistency checks when a rule holds a detached declaration that is not applied', () => {
  const root = postcss.parse('a{color:red;margin:0}');
  detach(root.first.first);
  assert.throws(
    () => buildRecords(root, createRunContext(undefined, true)),
    /edits its child list/v
  );
});

test('buildRecords should build a stylesheet whose detached children were applied first', () => {
  const root = postcss.parse('a{color:red;margin:0}b{color:red}');
  detach(root.first.first);
  applyChildEdits(root.first);
  assert.doesNotThrow(() =>
    buildRecords(root, createRunContext(undefined, true))
  );
});
