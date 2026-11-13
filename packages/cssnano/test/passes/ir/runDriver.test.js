import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../../src/passes/ir/runContext.js';
import { runDriver } from '../../../src/passes/ir/runDriver.js';
import { assertRecordsMatchTree } from '../../../src/passes/ir/treeMatch.js';
import { buildRecords } from '../../../src/passes/ir/buildRecords.js';
import { fillSummaries } from '../../../src/passes/ir/selectorList.js';

const BROWSERS = ['defaults'];

/**
 * A build of `css` under checks, with its run context.
 *
 * @param {string} css
 * @param {boolean} [checks]
 */
function buildOf(css, checks = true) {
  const root = postcss.parse(css);
  const context = createRunContext(undefined, checks);
  const state = runDriver.build(root, context);
  return { context, state };
}

/** @return {import('postcss').Result} a result with an empty message list */
function resultOf() {
  return /** @type {import('postcss').Result} */ (
    /** @type {unknown} */ ({ messages: [] })
  );
}

describe('the run driver', () => {
  test('the end of a run pushes its messages in the order they were appended', () => {
    const { context, state } = buildOf('a{color:red}b{color:blue}');
    const { links, root } = state.records;
    const first = links.firstChild(root.index);
    const second = links.nextSibling(first);
    context.messages.push(
      { index: second, type: 'removal', plugin: 'first-plugin' },
      { index: first, type: 'removal', plugin: 'second-plugin' }
    );
    const result = resultOf();
    runDriver.end(state, { browsers: BROWSERS, folded: false, result });
    assert.deepStrictEqual(
      result.messages.map((message) => message.plugin),
      ['first-plugin', 'second-plugin']
    );
  });

  test('the end of a run gives a warning message to the result as a warning, with its text and node', () => {
    const { context, state } = buildOf('a{color:red}');
    const rule = state.records.links.firstChild(state.records.root.index);
    /** @type {{text: string, options: {node: unknown, plugin: string}}[]} */
    const warnings = [];
    const result = /** @type {import('postcss').Result} */ (
      /** @type {unknown} */ ({
        messages: [],
        warn(text, options) {
          warnings.push({ text, options });
        },
      })
    );
    context.messages.push({
      index: rule,
      type: 'warning',
      plugin: 'warning-plugin',
      text: 'careful',
    });
    runDriver.end(state, { browsers: BROWSERS, folded: false, result });
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].text, 'careful');
    assert.equal(warnings[0].options.plugin, 'warning-plugin');
    assert.equal(
      /** @type {{type: string}} */ (warnings[0].options.node).type,
      'rule'
    );
    assert.deepStrictEqual(result.messages, []);
  });

  test('the end of a run gives a message whose entry has no node a node made from its record', () => {
    const { context, state } = buildOf('a{color:red}', false);
    const { links, root } = state.records;
    const rule = links.firstChild(root.index);
    const declaration = links.firstChild(rule);
    // The template of a declaration the transforms made is a node of the tree;
    // the entry itself has none yet.
    state.records.entry(declaration).template = rule;
    state.nodes[declaration] = undefined;
    context.messages.push({ index: declaration, type: 'removal', plugin: 'p' });
    const result = resultOf();
    runDriver.end(state, { browsers: BROWSERS, folded: false, result });
    const [message] = result.messages;
    assert.equal(message.node.type, 'decl');
    assert.equal(message.node.prop, 'color');
    assert.equal(message.node.value, 'red');
  });

  test('the tree check reads the summaries of the rules only when the run folded them', () => {
    const root = postcss.parse('a{color:red}');
    const context = createRunContext(undefined, true);
    const { records, nodes } = buildRecords(root, context);
    assert.doesNotThrow(() =>
      assertRecordsMatchTree(
        records,
        nodes,
        context.tokenLists,
        BROWSERS,
        false
      )
    );
    fillSummaries(records, context.tokenLists, BROWSERS);
    assert.doesNotThrow(() =>
      assertRecordsMatchTree(records, nodes, context.tokenLists, BROWSERS, true)
    );
  });
});
