import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import MergeState from '../../../../../src/passes/merge/lib/rules/mergeState.js';
import RuleSequence from '../../../../../src/passes/merge/lib/rules/ruleSequence.js';
import { buildRecords } from '../../../../../src/passes/merge/lib/rules/treeEdits.js';

/**
 * @param {string} css
 */
function setup(css) {
  const root = postcss.parse(css);
  const state = new MergeState(['chrome 120'], createRunContext());
  state.records = buildRecords(root, state);
  return state;
}

test('a sweep should link the rules of the stylesheet by index, from the head', () => {
  const { records } = setup('a{color:red}b{width:1px}c{top:0}');
  const sequence = new RuleSequence(records);
  assert.equal(sequence.head, 0);
  assert.equal(sequence.nextOf(0), 1);
  assert.equal(sequence.nextOf(1), 2);
  assert.equal(sequence.nextOf(2), -1);
  assert.equal(sequence.prevOf(0), -1);
  assert.equal(sequence.prevOf(2), 1);
});

test('a sweep over a stylesheet without rules should have no head', () => {
  const { records } = setup('@media print{}');
  assert.equal(new RuleSequence(records).head, -1);
});

test('replacePair should link a rule made mid-sweep at its own index, between its neighbors', () => {
  const state = setup('a{color:red}b{width:1px}c{top:0}');
  const { records } = state;
  const sequence = new RuleSequence(records);
  // A rule made mid-sweep takes the next index, past every link the sweep made.
  const added = records.recordRule(
    postcss.rule({ selector: 'x' }),
    state.properties,
    state.declarationIds
  );
  sequence.replacePair(0, {
    first: [records.rule(0)],
    second: [added],
  });
  assert.equal(sequence.nextOf(0), added.index);
  assert.equal(sequence.prevOf(added.index), 0);
  assert.equal(sequence.nextOf(added.index), 2);
  assert.equal(sequence.prevOf(2), added.index);
});
