import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import {
  assertSweepLowers,
  sweepPotential,
} from '../../../../../src/passes/merge/lib/rules/sweepPotential.js';
import runScan from '../../../../../src/passes/merge/lib/rules/scan.js';
import {
  assertNoOverDuplication,
  tallyDeclarations,
} from '../../../../../src/passes/merge/lib/rules/overDuplication.js';
import { TextTable } from '../../../../../src/values/textTable.js';
import {
  buildTestRecords,
  placeUnlinked,
  ruleRecordOf,
} from './liveRecords.js';
import { recordDeclaration } from '../../../../../src/passes/merge/lib/rules/buildRecords.js';
import { appendChild } from '../../../../../src/passes/merge/lib/rules/arenaEdits.js';

/** @import {Root, Rule} from 'postcss' */

/**
 * @param {string} css
 * @return {{root: Root, state: MergeState}}
 */
function setup(css) {
  const root = postcss.parse(css);
  const context = createRunContext(undefined, true);
  const state = new MergeState(['chrome 120'], context);
  state.records = buildTestRecords(root, state, new TextTable(), true);
  return { root, state };
}

test('assertSweepLowers should throw when a sweep moved a rule and the potential stayed equal', () => {
  assert.throws(
    () => assertSweepLowers([2, 2, 3], [2, 2, 3], true),
    /potential/v
  );
});

test('assertSweepLowers should throw when a sweep raised the potential', () => {
  assert.throws(
    () => assertSweepLowers([2, 2, 3], [2, 3, 2], false),
    /potential/v
  );
});

test('assertSweepLowers should accept a move that lowers the parent count alone', () => {
  assert.doesNotThrow(() => assertSweepLowers([2, 2, 3], [2, 2, 2], true));
});

test('runScan should keep the declaration and rule counts and lower the parent count of a pure move', () => {
  const { state } = setup(
    '@media print{.a{color:red}}@media print{.b{color:blue}}'
  );
  const start = sweepPotential(state.records, null);
  runScan(state);
  const end = sweepPotential(state.records, start.numbers);
  assert.deepEqual(start.potential, [2, 2, 3]);
  assert.deepEqual(end.potential, [2, 2, 2]);
});

test('sweepPotential should number nested blocks in document order, each before the blocks it holds', () => {
  // Numbers: the stylesheet 0, @media m 1, @supports s 2, @media n 3, so the
  // rules stand in blocks 0, 2 and 3.
  const { state } = setup(
    'a{x:1}@media m{@supports s{b{y:1;z:2}}}@media n{c{w:1}}'
  );
  assert.deepEqual(sweepPotential(state.records, null).potential, [4, 3, 5]);
});

test('assertNoOverDuplication should accept records built from a stylesheet that repeats a declaration', () => {
  const { state } = setup('a{color:red}b{color:red}');
  assert.doesNotThrow(() => assertNoOverDuplication(state.records, null));
});

test('assertNoOverDuplication should throw when a declaration is written more often than the input wrote it', () => {
  const { root, state } = setup('a{color:red}');
  // runMerge takes this tally when it starts, after dedupe.
  const input = tallyDeclarations(state.records);
  const rule = /** @type {Rule} */ (root.first);
  const record = ruleRecordOf(state.records, rule);
  const added = postcss.decl({ prop: 'color', value: 'red' });
  appendChild(
    state.records,
    record.index,
    placeUnlinked(
      state.records,
      state.records.root.index,
      recordDeclaration(added, state.declarationIds)
    ).index
  );
  assert.throws(
    () => assertNoOverDuplication(state.records, input),
    /more often than the input/v
  );
});

test('assertNoOverDuplication should throw when a chain reaches a rule that a second chain also reaches', () => {
  const { root, state } = setup('r{a{width:1px}}b{color:red}');
  const [outer, second] = /** @type {Rule[]} */ (root.nodes);
  const nestedIndex = ruleRecordOf(state.records, outer).index;
  // Linking `b` into the nested chain through the raw links table, as a bug
  // inside it would, leaves its sibling link in the root chain, so the walk
  // reaches `b` from both chains.
  /** @type {BlockLinks} */ (state.records.links).linkLast(
    nestedIndex,
    ruleRecordOf(state.records, second).index
  );
  assert.throws(
    () => assertNoOverDuplication(state.records, null),
    /reach a node twice/v
  );
});
