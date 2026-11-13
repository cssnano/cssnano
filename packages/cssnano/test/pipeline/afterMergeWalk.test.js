import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { createRunContext } from '../../src/passes/ir/runContext.js';
import { runDriver } from '../../src/passes/ir/runDriver.js';
import { discardEmptyRecords } from '../../src/passes/ir/discardRecords.js';
import { nodeOf } from '../../src/passes/ir/nodeTable.js';

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
  const context = createRunContext(undefined, true);
  const state = runDriver.build(root, context);
  /** @type {string[]} */
  const visited = [];
  discardEmptyRecords(
    state.records,
    context,
    visit &&
      ((index) => {
        const node = nodeOf(state.nodes, index);
        visited.push(label(node));
        visit(node);
      })
  );
  runDriver.end(state, { browsers: [], folded: false });
  return { output: root.toString(), visited };
}

describe('discardEmptyRecords visit', () => {
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

  test('leaves the output unchanged when no visit is given', () => {
    const { output } = discardWithVisit('a{color:red}b{}');
    assert.equal(output, 'a{color:red}');
  });
});
