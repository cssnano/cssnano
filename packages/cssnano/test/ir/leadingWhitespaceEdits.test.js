import { writeBack } from '../../src/ir/tree/writeBack.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
/** @import MergeState from '../../src/merge/rules/mergeState.js' */
import { remove, removeRules, takePlaceOf } from '../../src/ir/treeEdits.js';
import {
  ruleRecordOf,
  nodesOf,
  recordsOf,
} from '../merge/rules/liveRecords.js';

/** @import {Rule} from 'postcss' */

/**
 * @param {string} css
 * @return {{root: import('postcss').Root, state: MergeState}}
 */
function setup(css) {
  const { root, state } = recordsOf(css, true);
  return { root, state };
}

/**
 * @param {string} css
 * @param {(state: MergeState, rules: Rule[]) => void} edit
 * @return {string} the stylesheet printed after the edit and write-back
 */
function printedAfter(css, edit) {
  const { root, state } = setup(css);
  edit(state, /** @type {Rule[]} */ (root.nodes));
  writeBack(state.records, nodesOf(state.records), state.tokenLists);
  return root.toString();
}

/**
 * @param {MergeState} state
 * @param {Rule} rule
 * @return {number}
 */
function indexOfRule(state, rule) {
  return ruleRecordOf(state.records, rule).index;
}

test("remove should give the entry after a removed first root child the removed child's whitespace before", () => {
  const { root, state } = setup('\n\na{color:red}\n  b{color:red}');
  const [, second] = /** @type {Rule[]} */ (root.nodes);
  const secondIndex = ruleRecordOf(state.records, second).index;
  remove(state.records, ruleRecordOf(state.records, root.first).index);
  assert.equal(state.records.entry(secondIndex).before, '\n\n');
});

test("remove should print the removed first child's whitespace before the new first child", () => {
  const css = printedAfter('\n\na{color:red}\n  b{width:1px}', (state, [a]) =>
    remove(state.records, indexOfRule(state, a))
  );
  assert.equal(css, '\n\nb{width:1px}');
});

test('removeRules should print the leading whitespace before the first child left after three removed heads', () => {
  const css = printedAfter(
    '\n\na{color:red}\n b{width:1px}\n  c{top:0}\n d{left:0}',
    (state, [a, b, c]) => {
      remove(state.records, indexOfRule(state, a));
      remove(state.records, indexOfRule(state, b));
      removeRules(state, new Set([indexOfRule(state, c)]));
    }
  );
  assert.equal(css, '\n\nd{left:0}');
});

test('remove should print a later rule with its own whitespace once the rule before it leaves', () => {
  const css = printedAfter(
    '\n\na{color:red}\n b{width:1px}\n  c{top:0}',
    (state, [a, b]) => {
      remove(state.records, indexOfRule(state, a));
      remove(state.records, indexOfRule(state, b));
    }
  );
  assert.equal(css, '\n\nc{top:0}');
});

test("removeRules should print the removed first child's whitespace before the new first child", () => {
  const css = printedAfter('\n\na{color:red}\n  b{width:1px}', (state, [a]) =>
    removeRules(state, new Set([indexOfRule(state, a)]))
  );
  assert.equal(css, '\n\nb{width:1px}');
});

test("takePlaceOf should print the later rule's whitespace for the first child it replaces", () => {
  const css = printedAfter(
    '\n\na{color:red}\n b{width:1px}\n  c{color:red}',
    (state, [a, , c]) =>
      takePlaceOf(state.records, indexOfRule(state, a), indexOfRule(state, c))
  );
  assert.equal(css, '\n  b{width:1px}\n  a{color:red}');
});

test("takePlaceOf should keep the first child's whitespace when the earlier rule does not lead", () => {
  const css = printedAfter(
    '\n\na{color:red}\n b{width:1px}\n  c{width:1px}',
    (state, [, b, c]) =>
      takePlaceOf(state.records, indexOfRule(state, b), indexOfRule(state, c))
  );
  assert.equal(css, '\n\na{color:red}\n  b{width:1px}');
});
