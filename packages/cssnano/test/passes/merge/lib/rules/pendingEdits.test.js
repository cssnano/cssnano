import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { readBlock, writeBlock } from '../longhand/helpers/declarationItems.js';
import { buildRecords } from '../../../../../src/passes/ir/buildRecords.js';

test('buildRecords builds a stylesheet whose removed declaration a committed block dropped', () => {
  const root = postcss.parse('a{color:red;margin:0}b{color:red}');
  const run = createRunContext();
  const block = readBlock(root.first, run);
  block.list.remove(0);
  writeBlock(block, run);
  assert.doesNotThrow(() => buildRecords(root, createRunContext(true)));
  assert.equal(root.first.toString(), 'a{margin:0}');
});
