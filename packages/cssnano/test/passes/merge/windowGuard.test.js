import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import { buildRecords } from '../../../src/passes/merge/lib/rules/treeEdits.js';
import { guardWindow } from '../../../src/passes/merge/lib/rules/windowGuard.js';
import { TextTable } from '../../../src/values/textTable.js';

/**
 * Builds the records of the stylesheet, with a run context that owns its text table.
 *
 * @param {string} css
 */
function buildOf(css) {
  const root = postcss.parse(css);
  const textTable = new TextTable();
  const records = buildRecords(root, createRunContext(textTable));
  return { root, textTable, records };
}

test('the window guard throws on a read of a rule selector the build reached', () => {
  const { root, textTable, records } = buildOf('a{color:red}');
  const release = guardWindow(records, textTable);
  try {
    assert.throws(() => root.first.selector);
  } finally {
    release();
  }
});

test('the window guard throws on a read of a declaration value the build reached', () => {
  const { root, textTable, records } = buildOf('a{color:red}');
  const release = guardWindow(records, textTable);
  try {
    assert.throws(() => root.first.first.value);
  } finally {
    release();
  }
});

test('the window guard throws on a read of the table tokens of a rule', () => {
  const { root, textTable, records } = buildOf('a{color:red}');
  const release = guardWindow(records, textTable);
  try {
    assert.throws(() => textTable.tokens(root.first));
  } finally {
    release();
  }
});

test('the window guard leaves the node type readable while installed', () => {
  const { root, textTable, records } = buildOf('a{color:red}');
  const release = guardWindow(records, textTable);
  try {
    assert.equal(root.first.type, 'rule');
  } finally {
    release();
  }
});

test('the window guard gives back the selector after release', () => {
  const { root, textTable, records } = buildOf('a{color:red}');
  const release = guardWindow(records, textTable);
  release();
  assert.equal(root.first.selector, 'a');
  assert.equal(root.first.first.value, 'red');
  assert.ok(textTable.tokens(root.first).length > 0);
});
