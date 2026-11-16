import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
// The counter must hook the tokenizer before any module below loads it.
const { counter } = await import('../../../../../../../util/countTokenize.js');
const { createRunContext } =
  await import('../../../../../src/passes/ir/runContext.js');
const { declarationsOf } =
  await import('../../../../../src/passes/ir/blockChildren.js');
const { commitDeclarations } =
  await import('../../../../../src/passes/ir/arenaEdits.js');
const { declarationsFromRecords } =
  await import('../../../../../src/passes/merge/lib/longhand/recordDeclarations.js');
const { default: MergeState } =
  await import('../../../../../src/passes/merge/lib/rules/mergeState.js');
const { buildTestRecords, ruleRecordOf } = await import('./liveRecords.js');

/** @import {Container, Root} from 'postcss' */
/** @import {ArenaIndex} from '../../../../../src/passes/ir/blockRecord.js' */

/**
 * The records of `css`, built with the checks on, and the run's state.
 *
 * @param {string} css
 * @return {{root: Root, state: MergeState, records: import('../../../../../src/passes/ir/blockRecords.js').BlockRecords}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const context = createRunContext(true);
  const state = new MergeState(['chrome 120'], context);
  state.records = buildTestRecords(root, state, true);
  return { root, state, records: state.records };
}

/**
 * The arena index of the rule that is the `n`th child of the stylesheet.
 *
 * @param {Root} root
 * @param {import('../../../../../src/passes/ir/blockRecords.js').BlockRecords} records
 * @param {number} n
 * @return {ArenaIndex}
 */
function containerOf(root, records, n) {
  return ruleRecordOf(records, /** @type {Container} */ (root.nodes[n])).index;
}

/**
 * Runs `commit` and returns the text of each tokenize call it made.
 *
 * @param {() => void} commit
 * @return {string[]}
 */
function tokenizedBy(commit) {
  const texts = [];
  const record = counter.record;
  counter.record = (input) => {
    texts.push(input.css);
    record.call(counter, input);
  };
  try {
    commit();
  } finally {
    counter.record = record;
  }
  return texts;
}

test('a commit whose rewrites all equal their items moves no declaration stamp and marks no record', () => {
  const setupped = setup('a{color:red}');
  const { records, state } = setupped;
  const container = containerOf(setupped.root, records, 0);
  const [color] = declarationsOf(records, container);
  const stamp = records.declarationStamps.stampOf(container);
  const list = declarationsFromRecords(records, state.runContext, container);
  list.rewrite(0, 'color', 'red');
  commitDeclarations(records, state.runContext, container, list);
  assert.equal(records.declarationStamps.stampOf(container), stamp);
  assert.equal(color.marked, false);
});

test('a commit that holds an equal rewrite and a real one moves the stamp and marks only the real one', () => {
  const setupped = setup('a{color:red;width:1px}');
  const { records, state } = setupped;
  const container = containerOf(setupped.root, records, 0);
  const [color, width] = declarationsOf(records, container);
  const stamp = records.declarationStamps.stampOf(container);
  const list = declarationsFromRecords(records, state.runContext, container);
  list.rewrite(0, 'color', 'red');
  list.rewrite(1, 'width', '2px');
  commitDeclarations(records, state.runContext, container, list);
  assert.notEqual(records.declarationStamps.stampOf(container), stamp);
  assert.equal(color.marked, false);
  assert.equal(width.marked, true);
});

test('a commit of an equal rewrite tokenizes no text', () => {
  const setupped = setup('a{color:red}');
  const { records, state } = setupped;
  const container = containerOf(setupped.root, records, 0);
  const list = declarationsFromRecords(records, state.runContext, container);
  list.rewrite(0, 'color', 'red');
  const texts = tokenizedBy(() =>
    commitDeclarations(records, state.runContext, container, list)
  );
  assert.deepEqual(texts, []);
});
