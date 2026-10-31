import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import merge, { transformPlugin } from '#passes/merge';
import MergeState from '../../../src/passes/merge/lib/rules/mergeState.js';
import { mergeSharedDeclarations } from '../../../src/passes/merge/lib/rules/merge.js';
import RuleSequence from '../../../src/passes/merge/lib/rules/ruleSequence.js';
import { buildRecords } from '../../../src/passes/merge/lib/rules/treeEdits.js';

const plugin = transformPlugin('mergeRules');

/**
 * Runs the rule merge over a parsed stylesheet, so the test keeps the nodes it
 * parsed and can tell whether the merge kept them.
 *
 * @param {string} css
 * @return {Promise<{ root: import('postcss').Root, nodes: import('postcss').ChildNode[] }>} the root and the rules it parsed, in order
 */
async function merged(css) {
  const root = postcss.parse(css);
  const nodes = [...root.nodes];
  await postcss([plugin]).process(root, { from: undefined });
  return { root, nodes };
}

test('the earlier rule of a partial merge keeps its node as its leftover', async () => {
  const { root, nodes } = await merged(
    'a{color:red;margin:0}b{color:red;padding:0}'
  );
  assert.ok(root.nodes.includes(nodes[0]));
});

test('the later rule of a partial merge keeps its node as its leftover', async () => {
  const { root, nodes } = await merged(
    'a{color:red;margin:0}b{color:red;padding:0}'
  );
  assert.ok(root.nodes.includes(nodes[1]));
});

test('a rule whose declarations all merge away leaves the stylesheet', async () => {
  const { root, nodes } = await merged('a{color:red}b{color:red;padding:0}');
  assert.ok(!root.nodes.includes(nodes[0]));
});

test('a leftover holding only a comment keeps its node', async () => {
  const { root, nodes } = await merged(
    'a{color:red;/*c*/}b{color:red;margin:0}'
  );
  assert.ok(root.nodes.includes(nodes[0]));
});

test('a comment between two claimed declarations stays in the leftover of the earlier rule', async () => {
  const { nodes } = await merged(
    'a{margin:0;/*c*/color:red;padding:0}b{color:red;width:1px}'
  );
  assert.ok(nodes[0].nodes.some((node) => node.type === 'comment'));
});

test('a follower that keeps a declaration keeps its node as its leftover', async () => {
  const { root, nodes } = await merged(
    'a{color:red;margin:0}b{color:red;padding:0}c{margin:0;padding:0;width:1px}'
  );
  assert.ok(root.nodes.includes(nodes[2]));
});

test('a leftover that a join gave longhands is canonicalized in the second round', async () => {
  const result = await postcss([merge()]).process(
    'a{}a{margin-top:1px;margin-right:1px;color:red}a{margin-bottom:1px;margin-left:1px;padding:0}b{color:red;width:1px}',
    { from: undefined }
  );
  assert.equal(result.css, 'a{margin:1px;padding:0}a,b{color:red}b{width:1px}');
});

test('the record of a rule whose declarations all merge away is marked departed', () => {
  const root = postcss.parse('a{color:red}b{color:red;padding:0}');
  const mergeState = new MergeState(['Chrome 120']);
  mergeState.records = buildRecords(root, mergeState);
  const sequence = new RuleSequence(mergeState.records);
  const first = sequence.head;
  const second = sequence.nextOf(first);
  mergeSharedDeclarations(
    mergeState.records.rule(first),
    mergeState.records.rule(second),
    mergeState,
    second,
    sequence,
    new WeakMap()
  );
  assert.throws(() => mergeState.records.rule(first).declarations, /departed/v);
});
