import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import { buildRecords } from '../../../src/passes/merge/lib/rules/buildRecords.js';
import { guardWindow } from '../../../src/passes/merge/lib/rules/windowGuard.js';
import runMerge from '../../../src/passes/merge/lib/rules/selectorMerger.js';
import { writeBack } from '../../../src/passes/merge/lib/rules/writeBack.js';
import { TextTable } from '../../../src/values/textTable.js';

/**
 * Builds the records of the stylesheet, with a run context that owns its text table.
 *
 * @param {string} css
 */
function buildOf(css) {
  const root = postcss.parse(css);
  const textTable = new TextTable();
  const context = createRunContext(textTable);
  const { records, nodes } = buildRecords(root, context);
  return { root, textTable, context, records, nodes };
}

test('the window guard throws on a read of the table tokens of a rule', () => {
  const { root, textTable } = buildOf('a{color:red}');
  const release = guardWindow(textTable);
  try {
    assert.throws(() => textTable.tokens(root.first));
  } finally {
    release();
  }
});

test('the window guard throws on a table write the window makes', () => {
  const { root, textTable } = buildOf('a{color:red}');
  const release = guardWindow(textTable);
  try {
    assert.throws(() => textTable.setText(root.first, 'b'));
  } finally {
    release();
  }
});

test('the window guard hands the table reads back on release', () => {
  const { root, textTable } = buildOf('a{color:red}');
  const release = guardWindow(textTable);
  release();
  assert.ok(textTable.tokens(root.first).length > 0);
});

test('guardWindow lets a merge of two rules through the window, where the merged rule takes its template source', () => {
  const { root, textTable, context, records, nodes } = buildOf(
    'h1{color:red}h2{color:red;text-decoration:underline}'
  );
  const release = guardWindow(textTable);
  try {
    runMerge(records, ['chrome 120'], context);
  } finally {
    release();
  }
  writeBack(records, nodes, context.tokenLists, textTable);
  assert.ok(root.nodes.some((node) => node.selector === 'h1,h2'));
});
