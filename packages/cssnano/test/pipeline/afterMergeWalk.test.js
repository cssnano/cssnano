import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import { discardAndReport } from '#postcss-discard-empty';
import { TextTable } from '../../src/values/textTable.js';

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
  /** @type {string[]} */
  const visited = [];
  discardAndReport(
    root,
    /** @type {import('postcss').Result} */ ({ messages: [] }),
    visit &&
      ((node) => {
        visited.push(label(node));
        visit(node);
      }),
    new TextTable()
  );
  return { output: root.toString(), visited };
}

describe('discardAndReport visit', () => {
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
