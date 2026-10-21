import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { BlockTable } from '../../../src/passes/ir/blockTable.js';
import { PropertyTable } from '../../../src/passes/ir/propertyTable.js';
import {
  appendToDeclarations,
  writesOf,
} from '../../../src/passes/merge/lib/rules/ruleRewrite.js';

// The read of the block caches the incoming rule's summary too, so the join
// must drop that summary for the next read to see the removed duplicate.
test('appendToDeclarations drops an equal declaration from the incoming rule, and the block that holds both reads the result', () => {
  const root = postcss.parse(
    '@media print{a{color:red}b{color:red;width:1px}}'
  );
  const media = /** @type {import('postcss').AtRule} */ (root.first);
  const [receiving, incoming] = /** @type {import('postcss').Rule[]} */ (
    media.nodes
  );
  const table = new BlockTable(root);
  assert.equal(table.declarations(media).length, 3);

  const kept = [...receiving.nodes];
  appendToDeclarations(
    receiving,
    /** @type {import('postcss').Declaration[]} */ (kept),
    writesOf(kept, new PropertyTable()),
    incoming
  );

  assert.deepEqual(
    table.declarations(media).map((d) => `${d.prop}:${d.value}`),
    ['color:red', 'width:1px']
  );
  table.detach();
});
