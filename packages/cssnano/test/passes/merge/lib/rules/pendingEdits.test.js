import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { TextTable } from '../../../../../src/values/textTable.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import {
  commitToNodes,
  declarationsFromNodes,
} from '../../../../../src/passes/merge/lib/longhand/nodeDeclarations.js';
import { buildRecords } from '../../../../../src/passes/merge/lib/rules/buildRecords.js';

test('buildRecords builds a stylesheet whose removed declaration a committed block dropped', () => {
  const root = postcss.parse('a{color:red;margin:0}b{color:red}');
  const textTable = new TextTable();
  const block = declarationsFromNodes(root.first, createRunContext(textTable));
  block.list.remove(0);
  commitToNodes(block, textTable);
  assert.doesNotThrow(() =>
    buildRecords(root, createRunContext(undefined, true))
  );
  assert.equal(root.first.toString(), 'a{margin:0}');
});
