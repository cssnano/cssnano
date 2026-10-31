import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import LastWriteIndex from '../../../../../src/passes/merge/lib/rules/lastWriteIndex.js';
import { PropertyTable } from '../../../../../src/passes/ir/propertyTable.js';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import { buildRecords } from '../../../../../src/passes/merge/lib/rules/treeEdits.js';
import { entryOf } from './liveRecords.js';

/** @param {string} prop */
const decl = (prop) => ({ prop });

// Element keys for writes that may reach any element.
const unknownElements = () => null;

/**
 * The first node of `css`, with the records of its stylesheet.
 *
 * @param {string} css
 * @return {{node: any, records: import('../../../../../src/passes/merge/lib/rules/blockRecords.js').BlockRecords}}
 */
function firstNodeWithRecords(css) {
  const root = postcss.parse(css);
  const mergeState = new MergeState(['chrome 120'], createRunContext());
  mergeState.records = buildRecords(root, mergeState);
  return { node: root.first, records: mergeState.records };
}

test('last-write index ignores a write to another known element', () => {
  const index = new LastWriteIndex(new PropertyTable());
  index.record(decl('color'), 1, ['h2']);
  assert.equal(index.conflictsSince([decl('color')], 0, ['h1']), false);
});

test('last-write index reports a write to the same known element', () => {
  const index = new LastWriteIndex(new PropertyTable());
  index.record(decl('color'), 1, ['h1']);
  assert.equal(index.conflictsSince([decl('color')], 0, ['h1']), true);
});

test('last-write index reports a write to any element on one of several target elements', () => {
  const index = new LastWriteIndex(new PropertyTable());
  index.record(decl('color'), 1, ['p']);
  assert.equal(index.conflictsSince([decl('color')], 0, ['h1', 'p']), true);
});

test('last-write index reports a write whose element is unknown for any target element', () => {
  const index = new LastWriteIndex(new PropertyTable());
  index.record(decl('color'), 1, null);
  assert.equal(index.conflictsSince([decl('color')], 0, ['h1']), true);
});

test('last-write index with an unknown target element counts writes to every element', () => {
  const index = new LastWriteIndex(new PropertyTable());
  index.record(decl('color'), 1, ['h2']);
  assert.equal(index.conflictsSince([decl('color')], 0, null), true);
});

test('last-write index reports a barrier for any target element', () => {
  const index = new LastWriteIndex(new PropertyTable());
  const { node, records } = firstNodeWithRecords('@layer x{}');
  index.recordNode(entryOf(records, node), 1, unknownElements);
  assert.equal(index.conflictsSince([], 0, ['h1']), true);
});

test('last-write index reports a known-element write to a different property as no conflict', () => {
  const index = new LastWriteIndex(new PropertyTable());
  index.record(decl('top'), 1, ['h1']);
  assert.equal(index.conflictsSince([decl('color')], 0, ['h1']), false);
});

test('last-write index with a known element still applies a later all to that element', () => {
  const index = new LastWriteIndex(new PropertyTable());
  index.record(decl('all'), 1, ['h2']);
  assert.equal(index.conflictsSince([decl('color')], 0, ['h2']), true);
  assert.equal(index.conflictsSince([decl('color')], 0, ['h1']), false);
});

test('last-write index keeps a write at the queried position out of the answer for a known element', () => {
  const index = new LastWriteIndex(new PropertyTable());
  index.record(decl('color'), 1, ['h1']);
  assert.equal(index.conflictsSince([decl('color')], 1, ['h1']), false);
});

test('last-write index recordNode records each rule declaration under its element keys', () => {
  const index = new LastWriteIndex(new PropertyTable());
  const { node, records } = firstNodeWithRecords('h2{color:red}');
  index.recordNode(entryOf(records, node), 1, () => ['h2']);
  assert.equal(index.conflictsSince([decl('color')], 0, ['h1']), false);
  assert.equal(index.conflictsSince([decl('color')], 0, ['h2']), true);
});

/**
 * The element keys of a rule record: its selectors, or null for `*`, whose
 * element is unknown.
 *
 * @param {import('../../../../../src/passes/merge/lib/rules/ruleRecord.js').RuleRecord} record
 * @return {string[] | null}
 */
const keysOfRule = (record) =>
  record.selectors.includes('*') ? null : record.selectors;

/**
 * The live entries of the stylesheet of `css`.
 *
 * @param {string} css
 */
function entriesOf(css) {
  const root = postcss.parse(css);
  const mergeState = new MergeState(['chrome 120'], createRunContext());
  mergeState.records = buildRecords(root, mergeState);
  return mergeState.records.root.liveEntries();
}

test('last-write index conflictsSinceIn ignores a write to an element other than the rule of the declaration', () => {
  const index = new LastWriteIndex(new PropertyTable());
  index.record(decl('color'), 1, ['h2']);
  assert.equal(
    index.conflictsSinceIn(entriesOf('h1{color:red}'), 0, keysOfRule),
    false
  );
});

test('last-write index conflictsSinceIn reports a write to the element of the rule of the declaration', () => {
  const index = new LastWriteIndex(new PropertyTable());
  index.record(decl('color'), 1, ['h1']);
  assert.equal(
    index.conflictsSinceIn(entriesOf('h1{color:red}'), 0, keysOfRule),
    true
  );
});

test('last-write index conflictsSinceIn reports a write to the element of any rule among the entries', () => {
  const index = new LastWriteIndex(new PropertyTable());
  index.record(decl('color'), 1, ['p']);
  const entries = entriesOf('h1{top:0}p{color:red}');
  assert.equal(index.conflictsSinceIn(entries, 0, keysOfRule), true);
});

test('last-write index conflictsSinceIn counts every write when a rule among the entries has an unknown element', () => {
  const index = new LastWriteIndex(new PropertyTable());
  index.record(decl('color'), 1, ['h2']);
  const entries = entriesOf('h1{color:red}*{top:0}');
  assert.equal(index.conflictsSinceIn(entries, 0, keysOfRule), true);
});

test('last-write index conflictsSinceIn counts every write for a bare declaration of a conditional block', () => {
  const index = new LastWriteIndex(new PropertyTable());
  index.record(decl('color'), 1, ['h2']);
  const { node, records } = firstNodeWithRecords('@media print{color:red}');
  const entries = entryOf(records, node).liveEntries();
  assert.equal(index.conflictsSinceIn(entries, 0, keysOfRule), true);
});
