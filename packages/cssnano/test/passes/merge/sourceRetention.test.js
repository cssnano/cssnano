// Nothing else in the merge tests turns on source maps or reads `node.source`,
// so a node that lost its source would pass every byte-comparing oracle.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import { mergePass } from '../../../src/passes/merge/index.js';

/**
 * @param {string} css
 * @returns {import('postcss').Root}
 */
function merge(css) {
  const root = postcss.parse(css, { from: 'in.css' });
  mergePass(root, ['chrome 120'], { rules: true });
  return root;
}

/**
 * @param {import('postcss').Root} root
 * @returns {import('postcss').Node[]}
 */
function nodesOf(root) {
  /** @type {import('postcss').Node[]} */
  const nodes = [];
  root.walk((node) => {
    nodes.push(node);
  });
  return nodes;
}

test('merge keeps source.start and source.input on every rule and declaration of a partial merge', () => {
  const root = merge('a{color:red;margin:0}b{color:red;padding:0}');
  assert.equal(root.toString(), 'a{margin:0}a,b{color:red}b{padding:0}');
  for (const node of nodesOf(root)) {
    assert.ok(node.source?.start, `${node.toString()} has source.start`);
    assert.ok(node.source?.input, `${node.toString()} has source.input`);
  }
});

test('merge keeps source.start and source.input on a rule that joins two rules with the same declarations', () => {
  const root = merge('a{color:red}b{color:red}');
  assert.equal(root.toString(), 'a,b{color:red}');
  for (const node of nodesOf(root)) {
    assert.ok(node.source?.start, `${node.toString()} has source.start`);
    assert.ok(node.source?.input, `${node.toString()} has source.input`);
  }
});
