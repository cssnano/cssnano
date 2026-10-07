import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import {
  applyChildEdits,
  detach,
  insertAfter,
} from '../src/lib/deferredChildEdits.js';

/* Deferred edits must print exactly what the same sequence of PostCSS
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
 * @return {[string, string]} the PostCSS and the deferred serialization
 */
function runEditSequence(seed) {
  const random = createRandom(seed);
  const expected = postcss.parse(source);
  const actual = postcss.parse(source);
  const expectedRule = /** @type {import('postcss').Rule} */ (expected.first);
  const actualRule = /** @type {import('postcss').Rule} */ (actual.first);
  /** Corresponding attached children of both rules, in no particular order. */
  const attached = expectedRule.nodes.map((node, i) => [
    node,
    actualRule.nodes[i],
  ]);
  for (let step = 0; step < 12 && attached.length > 0; step++) {
    const index = random(attached.length);
    const [expectedNode, actualNode] = attached[index];
    if (random(2) === 0) {
      expectedNode.remove();
      detach(actualNode);
      attached.splice(index, 1);
    } else {
      const props = { prop: `n${step}`, value: String(step) };
      const expectedClone = expectedNode.clone(props);
      const actualClone = actualNode.clone(props);
      expectedRule.insertAfter(expectedNode, expectedClone);
      insertAfter(actualRule, actualNode, actualClone);
      attached.push([expectedClone, actualClone]);
    }
  }
  applyChildEdits(actualRule);
  return [actual.toString(), expected.toString()];
}

test('deferred child edits print what the same PostCSS edits print', () => {
  for (let seed = 1; seed <= 500; seed++) {
    const [actual, expected] = runEditSequence(seed);
    assert.strictEqual(actual, expected, `seed ${seed}`);
  }
});

test('a detached node reports no parent before the edits are applied', () => {
  const rule = /** @type {import('postcss').Rule} */ (
    postcss.parse('a{a:0;b:1}').first
  );
  const node = rule.nodes[0];
  detach(node);
  assert.strictEqual(node.parent, undefined);
});

test('an inserted node reports its container before the edits are applied', () => {
  const rule = /** @type {import('postcss').Rule} */ (
    postcss.parse('a{a:0;b:1}').first
  );
  const node = rule.nodes[0].clone({ prop: 'c' });
  insertAfter(rule, rule.nodes[0], node);
  assert.strictEqual(node.parent, rule);
});

test('a container without edits keeps its child list', () => {
  const rule = /** @type {import('postcss').Rule} */ (
    postcss.parse('a{a:0;b:1}').first
  );
  const nodes = rule.nodes;
  applyChildEdits(rule);
  assert.strictEqual(rule.nodes, nodes);
});
