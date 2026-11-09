import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import { buildRecords } from '../../../src/passes/merge/lib/rules/treeEdits.js';
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

test('the window guard throws on a read of an at-rule name the build reached', () => {
  const { root, textTable, records } = buildOf('@media print{a{color:red}}');
  const release = guardWindow(records, textTable);
  try {
    assert.throws(() => root.first.name);
  } finally {
    release();
  }
});

test('the window guard throws on a read of an at-rule prelude the build reached', () => {
  const { root, textTable, records } = buildOf('@media print{a{color:red}}');
  const release = guardWindow(records, textTable);
  try {
    assert.throws(() => root.first.params);
  } finally {
    release();
  }
});

test('the window guard throws on a table write the window makes', () => {
  const { root, textTable, records } = buildOf('a{color:red}');
  const release = guardWindow(records, textTable);
  try {
    assert.throws(() => textTable.setText(root.first, 'b'));
  } finally {
    release();
  }
});

test('the window guard throws on a read of a node type the build reached', () => {
  const { root, textTable, records } = buildOf('a{color:red}');
  const release = guardWindow(records, textTable);
  try {
    assert.throws(() => root.first.type);
  } finally {
    release();
  }
});

test("guardWindow should throw on a read of a comment's text in the window", () => {
  const { root, textTable, records } = buildOf('/*! keep */a{color:red}');
  const release = guardWindow(records, textTable);
  try {
    assert.throws(() => root.first.text);
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

/**
 * Every property name a node has, own or inherited, short of `Object.prototype`.
 *
 * @param {object} node
 * @return {string[]}
 */
function propertyNamesOf(node) {
  /** @type {string[]} */
  const names = [];
  for (
    let owner = node;
    owner && owner !== Object.prototype;
    owner = Object.getPrototypeOf(owner)
  ) {
    names.push(...Object.getOwnPropertyNames(owner));
  }
  return names;
}

test('guardWindow should throw on any property read of a node in the window', () => {
  const { root, textTable, records } = buildOf('a{color:red}');
  const rule = root.first;
  const release = guardWindow(records, textTable);
  try {
    for (const name of propertyNamesOf(rule)) {
      assert.throws(() => rule[name], undefined, name);
    }
  } finally {
    release();
  }
});

test('guardWindow lets a merge of two rules through the window, where the merged rule takes its template source', () => {
  const { root, textTable, records } = buildOf(
    'h1{color:red}h2{color:red;text-decoration:underline}'
  );
  const release = guardWindow(records, textTable);
  try {
    runMerge(records, ['chrome 120'], createRunContext(textTable));
  } finally {
    release();
  }
  writeBack(records, textTable);
  assert.ok(root.nodes.some((node) => node.selector === 'h1,h2'));
});
