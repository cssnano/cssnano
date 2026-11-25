import assert from 'node:assert/strict';
import { test } from 'node:test';
// The counter must hook the tokenizer before any module below loads it.
const { tokenizedBy } = await import('../../../../../util/countTokenize.js');
const { declarationsOf } = await import('../../../src/ir/blockChildren.js');
const { commitDeclarations } = await import('../../../src/ir/arenaEdits.js');
const { declarationsFromRecords } =
  await import('../../../src/merge/longhand/recordDeclarations.js');
/** @import MergeState from '../../../src/merge/rules/mergeState.js' */
const { recordsOf, ruleRecordOf } = await import('./liveRecords.js');

/** @import {Container, Root} from 'postcss' */
/** @import {ArenaIndex} from '../../../src/ir/blockRecord.js' */

/**
 * The records of `css`, built with the checks on, and the run's state.
 *
 * @param {string} css
 * @return {{root: Root, state: MergeState, records: import('../../../src/ir/blockRecords.js').BlockRecords}}
 */
function setup(css) {
  const { root, state } = recordsOf(css, true);
  return { root, state, records: state.records };
}

/**
 * The arena index of the rule that is the `n`th child of the stylesheet.
 *
 * @param {Root} root
 * @param {import('../../../src/ir/blockRecords.js').BlockRecords} records
 * @param {number} n
 * @return {ArenaIndex}
 */
function containerOf(root, records, n) {
  return ruleRecordOf(records, /** @type {Container} */ (root.nodes[n])).index;
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
