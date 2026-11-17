import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../src/run/runContext.js';
import { runDriver } from '../../src/run/runDriver.js';
import { discardEmptyRecords } from '../../src/plugins/postcss-discard-empty/discardRecords.js';
import { nodeOf } from '../../src/ir/tree/nodeTable.js';
import { walkUp } from '../../src/run/walkUp.js';
import { hostPlan } from '../../src/run/hostPlan.js';

/** @param {import('postcss').AnyNode} node */
function label(node) {
  if (node.type === 'rule') return node.selector;
  if (node.type === 'decl') return node.prop;
  if (node.type === 'atrule') return `@${node.name}`;
  return node.type;
}

/**
 * @param {string} css
 * @param {((node: import('postcss').AnyNode) => void)} [visit]
 * @returns {{ output: string, visited: string[] }}
 */
function discardWithVisit(css, visit) {
  const root = postcss.parse(css);
  const context = createRunContext(true);
  const state = runDriver.build(root, context);
  /** @type {string[]} */
  const visited = [];
  discardEmptyRecords(
    state.records,
    context,
    visit && {
      enter() {},
      visit(index) {
        const node = nodeOf(state.nodes, index);
        visited.push(label(node));
        visit(node);
      },
    }
  );
  runDriver.end(state, { browsers: [], folded: false });
  return { output: root.toString(), visited };
}

/**
 * The plan of a run with the named transforms on, each with empty options.
 *
 * @param {string[]} names the transforms on, by entry name
 * @returns {import('../../src/run/hostPlan.js').RunPlan}
 */
function planWith(names) {
  return hostPlan(
    /** @type {Partial<import('../../src/run/hostPlan.js').RunPlan>} */ (
      Object.fromEntries(names.map((name) => [name, {}]))
    )
  );
}

/**
 * The output of the walk up over `css` with the named transforms on.
 *
 * @param {string} css
 * @param {string[]} names the transforms on, by entry name
 * @returns {string}
 */
function walkUpOutput(css, names) {
  const root = postcss.parse(css);
  const context = createRunContext(undefined);
  const state = runDriver.build(root, context);
  walkUp(state, planWith(names));
  runDriver.end(state, { browsers: [], folded: false });
  return root.toString();
}

describe('discardEmptyRecords visitor', () => {
  test('calls visit on each kept node and not on a removed node', () => {
    const { visited } = discardWithVisit('a{color:red}b{}', () => {});
    assert.deepEqual(visited, ['color', 'a']);
  });

  test('calls visit on kept children before their kept parent', () => {
    const { visited } = discardWithVisit(
      '@media print{a{color:red}}',
      () => {}
    );
    assert.deepEqual(visited, ['color', 'a', '@media']);
  });

  test('leaves the output unchanged when no visitor is given', () => {
    const { output } = discardWithVisit('a{color:red}b{}');
    assert.equal(output, 'a{color:red}');
  });
});

describe('walkUp', () => {
  test('with discardEmpty on, removes an empty rule and keeps the rest', () => {
    assert.equal(
      walkUpOutput('a{color:red}b{}', ['discardEmpty']),
      'a{color:red}'
    );
  });

  test('with normalizeWhitespace on and no discardEmpty, visits every entry in pre-order', () => {
    assert.equal(
      walkUpOutput('a { color : red }', ['normalizeWhitespace']),
      'a{color:red}'
    );
  });

  test('with no transform on, leaves the output unchanged', () => {
    assert.equal(walkUpOutput('a { color : red }', []), 'a { color : red }');
  });
});
