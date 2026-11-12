import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import { buildRecords } from '../../../src/passes/ir/buildRecords.js';
import { writeBack } from '../../../src/passes/ir/writeBack.js';
import { TextTable } from '../../../src/values/textTable.js';

test('the node table has one slot per entry the build made', () => {
  const { records, nodes } = buildRecords(
    postcss.parse('a{color:red}@media print{b{top:0}/*! c */}'),
    createRunContext(new TextTable())
  );
  assert.equal(nodes.length, records.builtCount);
  assert.equal(nodes.length, records.entryCount());
});

test('write-back throws under checks when the node table lacks a slot for an entry the build made', () => {
  const context = createRunContext(new TextTable(), true);
  const { records, nodes } = buildRecords(
    postcss.parse('a{color:red}'),
    context
  );
  nodes.pop();
  assert.throws(() => writeBack(records, nodes, context.tokenLists));
});
