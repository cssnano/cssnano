import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import { runDriver } from '../../../src/passes/ir/runDriver.js';
import {
  discardEmptyRecords,
  removeAndDiscardEmptiedRecords,
} from '../../../src/passes/ir/discardRecords.js';
import { DECLARATION, RULE } from '../../../src/passes/ir/blockRecord.js';

/**
 * Builds `css` under checks, with its run state.
 *
 * @param {string} css
 */
function buildOf(css) {
  const root = postcss.parse(css);
  const context = createRunContext(undefined, true);
  const state = runDriver.build(root, context);
  return { root, context, state };
}

/**
 * Ends the run and returns the stylesheet text and the messages it pushed.
 *
 * @param {{root: import('postcss').Root, state: import('../../../src/passes/ir/runDriver.js').RunState}} built
 */
function endOf({ root, state }) {
  const result = /** @type {import('postcss').Result} */ (
    /** @type {unknown} */ ({ messages: [] })
  );
  runDriver.end(state, { browsers: [], folded: false, result });
  return { css: root.toString(), messages: result.messages };
}

describe('the discard over the records', () => {
  test('the visit of a kept entry runs after the entry children, in post-order', () => {
    const built = buildOf('a{b:c}');
    const { state, context } = built;
    /** @type {number[]} */
    const seen = [];
    discardEmptyRecords(state.records, context, (index) => seen.push(index));
    assert.deepEqual(
      seen.map((index) => state.records.entry(index).kind),
      [DECLARATION, RULE]
    );
  });
});

describe('removing an entry on the records', () => {
  test('a removal stops at the first ancestor that keeps a child', () => {
    const built = buildOf('@media print{@supports (top:0){@keyframes a{}}b{}}');
    const keyframes = /** @type {import('postcss').AtRule} */ (
      /** @type {import('postcss').AtRule} */ (
        /** @type {import('postcss').AtRule} */ (built.root.first).first
      ).first
    );
    removeAndDiscardEmptiedRecords(
      built.state.records,
      built.context,
      built.state.nodes.indexOf(keyframes)
    );
    assert.equal(endOf(built).css, '@media print{b{}}');
  });

  test('a removal that empties a rule removes the rule too, and reports the rule', () => {
    const built = buildOf('a{b:c}d{e:f}');
    const decl = /** @type {import('postcss').Declaration} */ (
      built.root.first?.first
    );
    const index = built.state.nodes.indexOf(decl);
    removeAndDiscardEmptiedRecords(built.state.records, built.context, index);
    const { css, messages } = endOf(built);
    assert.equal(css, 'd{e:f}');
    assert.deepEqual(
      messages.map((message) => message.node.selector),
      ['a']
    );
  });

  test('a removal that empties a named layer leaves the layer, since it may fix an order', () => {
    const built = buildOf('@layer x{a{b:c}}');
    const decl = /** @type {import('postcss').Declaration} */ (
      /** @type {import('postcss').AtRule} */ (built.root.first).first?.first
    );
    const index = built.state.nodes.indexOf(decl);
    removeAndDiscardEmptiedRecords(built.state.records, built.context, index);
    assert.equal(endOf(built).css, '@layer x{}');
  });

  test('a removal that empties a media query removes the query with its rule, reporting both', () => {
    const built = buildOf('@media x{a{b:c}}');
    const decl = /** @type {import('postcss').Declaration} */ (
      /** @type {import('postcss').AtRule} */ (built.root.first).first?.first
    );
    const index = built.state.nodes.indexOf(decl);
    removeAndDiscardEmptiedRecords(built.state.records, built.context, index);
    const { css, messages } = endOf(built);
    assert.equal(css, '');
    assert.deepEqual(
      messages.map((message) => message.node.type),
      ['rule', 'atrule']
    );
  });
});
