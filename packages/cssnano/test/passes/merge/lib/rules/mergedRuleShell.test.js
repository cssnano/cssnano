import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { transformPlugin } from '#passes/merge';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import runMerge from '../../../../../src/passes/merge/lib/rules/selectorMerger.js';
import { buildRecords } from '../../../../../src/passes/merge/lib/rules/buildRecords.js';
import { nodeOf } from '../../../../../src/passes/merge/lib/rules/nodeTable.js';
import { TextTable } from '../../../../../src/values/textTable.js';
import { RULE } from '../../../../../src/passes/merge/lib/rules/blockRecord.js';

/** @import {BlockRecords} from '../../../../../src/passes/merge/lib/rules/blockRecords.js' */

const plugin = transformPlugin('mergeRules');

/**
 * The arena index of the live rule record with the selectors, or -1.
 *
 * @param {BlockRecords} records
 * @param {string} selectors
 * @return {number}
 */
function mergedIndexOf(records, selectors) {
  for (let index = 0; index < records.entryCount(); index++) {
    const entry = records.entry(index);
    if (
      entry.kind === RULE &&
      !entry.departed &&
      entry.selectors.join() === selectors &&
      records.links.parentOf(index) !== -1
    ) {
      return index;
    }
  }
  return -1;
}

/**
 * @param {string} css
 * @return {Promise<import('postcss').Root>}
 */
function run(css) {
  return postcss([plugin])
    .process(css, { from: undefined })
    .then((result) => result.root);
}

test('a merged rule keeps the source position of the later rule it replaces', async () => {
  const css = 'h1{color:red}\nh2{color:red;text-decoration:underline}';
  const root = await run(css);
  const merged = root.nodes.find((node) => node.selector === 'h1,h2');
  assert.ok(merged, 'the pair merges into h1,h2');
  assert.deepEqual(
    { line: merged.source.start.line, column: merged.source.start.column },
    { line: 2, column: 1 }
  );
});

test('a merged rule holds none of the later rule unclaimed declarations', async () => {
  const root = await run(
    'h1{color:red}h2{color:red;text-decoration:underline;font-weight:bold}'
  );
  const merged = root.nodes.find((node) => node.selector === 'h1,h2');
  assert.deepEqual(
    merged.nodes.map((node) => node.prop),
    ['color']
  );
});

/**
 * Merges a stylesheet parsed here, so the nodes it held can be compared.
 *
 * @param {string} css
 * @return {Promise<{ nodes: Map<string, import('postcss').ChildNode[]>, after: import('postcss').Root }>}
 */
async function runKeepingSource(css) {
  const before = postcss.parse(css);
  const nodes = new Map(
    before.nodes.map((rule) => [rule.selector, [...rule.nodes]])
  );
  const { root } = await postcss([plugin]).process(before, { from: undefined });
  return { nodes, after: root };
}

test('a merged rule holds the declaration nodes of the earlier rule it takes', async () => {
  const { nodes, after } = await runKeepingSource(
    'h1{color:red;margin:0}h2{color:red;padding:0}'
  );
  const merged = after.nodes.find((node) => node.selector === 'h1,h2');
  assert.equal(merged.nodes[0], nodes.get('h1')[0]);
});

test('a merged rule keeps the whitespace of the earlier rule declaration when the two rules are indented differently', async () => {
  const { after } = await runKeepingSource(
    'h1{\n    color:red;\n    margin:0\n}\nh2{\n\tcolor:red;\n\tpadding:0\n}'
  );
  const merged = after.nodes.find((node) => node.selector === 'h1,h2');
  assert.equal(merged.nodes[0].raws.before, '\n    ');
});

test('a merged rule takes the earlier declarations in the order the earlier rule had them', async () => {
  const { nodes, after } = await runKeepingSource(
    'h1{color:red;margin:0;width:1px}h2{width:1px;margin:0;color:red}'
  );
  const merged = after.nodes.find((node) => node.selector === 'h1,h2');
  assert.deepEqual(
    merged.nodes.map((node) => node.prop),
    nodes.get('h1').map((node) => node.prop)
  );
});

test('a merged rule should have no node until write-back', () => {
  const root = postcss.parse(
    'h1{color:red}h2{color:red;text-decoration:underline}'
  );
  const textTable = new TextTable();
  const context = createRunContext(textTable);
  const { records, nodes } = buildRecords(root, context);
  runMerge(records, ['chrome 120'], context);
  const index = mergedIndexOf(records, 'h1,h2');
  assert.notEqual(index, -1, 'the pair merges into h1,h2');
  assert.equal(nodeOf(nodes, index), undefined);
});
