import { createRunContext } from '../../../../../src/passes/ir/runContext.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import {
  commitToNodes,
  declarationsFromNodes,
} from '../../../../../src/passes/merge/lib/longhand/nodeDeclarations.js';
import { TextTable } from '../../../../../src/values/textTable.js';

/* Committed edits must print exactly what the same sequence of PostCSS
 * `insertAfter` and `remove` calls prints, so PostCSS itself is the oracle. */

const source = 'a{a:0;b:1; c:2;&{x:y}d:3;/* e */f:4;@media print{g:5}h:6}';

/**
 * Park–Miller minimal standard generator; every product stays below 2^53.
 *
 * @param {number} seed
 * @return {(bound: number) => number} an integer in [0, bound)
 */
function createRandom(seed) {
  let state = seed;
  return (bound) => {
    state = (state * 48271) % 2147483647;
    return state % bound;
  };
}

/**
 * @param {number} seed
 * @return {[string, string]} the PostCSS and the committed serialization
 */
function runEditSequence(seed) {
  const random = createRandom(seed);
  const expected = postcss.parse(source);
  const actual = postcss.parse(source);
  const expectedRule = /** @type {import('postcss').Rule} */ (expected.first);
  const actualRule = /** @type {import('postcss').Rule} */ (actual.first);
  const block = declarationsFromNodes(
    actualRule,
    createRunContext(new TextTable())
  );
  /** Corresponding attached declarations of both rules, by list position. */
  const attached = [];
  const declarations = expectedRule.nodes.filter(
    (node) => node.type === 'decl'
  );
  for (let position = 0; position < block.list.length; position++) {
    attached.push([declarations[position], position]);
  }
  for (let step = 0; step < 12 && attached.length > 0; step++) {
    const index = random(attached.length);
    const [expectedNode, position] = attached[index];
    if (random(2) === 0) {
      expectedNode.remove();
      block.list.remove(position);
      attached.splice(index, 1);
    } else {
      const change = {
        prop: `n${step}`,
        value: String(step),
        important: false,
      };
      const expectedClone = expectedNode.clone(change);
      const clonePosition = block.list.insertClone(position, change);
      expectedRule.insertAfter(expectedNode, expectedClone);
      attached.push([expectedClone, clonePosition]);
    }
  }
  commitToNodes(block, new TextTable());
  return [actual.toString(), expected.toString()];
}

test('committed declaration edits print what the same PostCSS edits print', () => {
  for (let seed = 1; seed <= 500; seed++) {
    const [actual, expected] = runEditSequence(seed);
    assert.strictEqual(actual, expected, `seed ${seed}`);
  }
});

test('a removed declaration keeps its node out of the printed rule', () => {
  const rule = /** @type {import('postcss').Rule} */ (
    postcss.parse('a{a:0;b:1}').first
  );
  const block = declarationsFromNodes(rule, createRunContext(new TextTable()));
  block.list.remove(0);
  commitToNodes(block, new TextTable());
  assert.equal(rule.toString(), 'a{b:1}');
});

test('a committed container without edits keeps its child list', () => {
  const rule = /** @type {import('postcss').Rule} */ (
    postcss.parse('a{a:0;b:1}').first
  );
  const nodes = rule.nodes;
  commitToNodes(
    declarationsFromNodes(rule, createRunContext(new TextTable())),
    new TextTable()
  );
  assert.strictEqual(rule.nodes, nodes);
});
