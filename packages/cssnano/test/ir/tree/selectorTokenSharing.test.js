import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

// The counter must hook the tokenizer before the build loads it.
const { counter } = await import('../../../../../util/countTokenize.js');
const postcss = (await import('postcss')).default;
const { createRunContext } = await import('../../../src/run/runContext.js');
const { buildRecords } = await import('../../../src/ir/tree/buildRecords.js');

/** @returns {number} tokenize calls made so far */
function tokenizeTotal() {
  return [...counter.calls.values()].reduce((sum, n) => sum + n, 0);
}

/**
 * The text each token list id spells, so a test reads the ids' contents.
 *
 * @param {ReturnType<typeof createRunContext>} run
 * @param {readonly number[]} ids
 * @return {string[]}
 */
function spelledIds(run, ids) {
  return ids.map((id) =>
    run.tokenLists
      .get(id)
      .map((t) => t[1])
      .join('')
  );
}

/**
 * Builds the records of a parsed stylesheet and reports the tokenize calls the
 * build made, the selector ids of each top-level rule, and the run.
 *
 * @param {import('postcss').Root} root
 */
function buildOf(root) {
  const run = createRunContext();
  const before = tokenizeTotal();
  const { records, nodes } = buildRecords(root, run);
  const calls = tokenizeTotal() - before;
  const rules = [];
  for (const node of root.nodes) {
    if (node.type === 'rule') {
      rules.push(records.rule(nodes.indexOf(node)).selectorIds);
    }
  }
  return { calls, rules, run };
}

suite(
  'a rule selector is tokenized once per build, as one item or a list',
  () => {
    test('a lone selector without comments is tokenized once', () => {
      assert.equal(buildOf(postcss.parse('a{}')).calls, 1);
    });

    test('two rules with equal lone selectors share one id and one tokenization', () => {
      const { calls, rules } = buildOf(postcss.parse('a{}a{}'));
      assert.equal(calls, 1);
      assert.equal(rules[0][0], rules[1][0]);
    });

    test('a lone selector whose comment is in its text is tokenized once, as its item equals it', () => {
      const { calls, rules, run } = buildOf(postcss.parse('a/* x */b{}'));
      assert.equal(calls, 1);
      assert.deepEqual(spelledIds(run, rules[0]), ['a/* x */b']);
    });

    test('a selector with a comma is tokenized once, as written', () => {
      assert.equal(buildOf(postcss.parse('a,b{}')).calls, 1);
    });

    test('each item of a selector list spells its text', () => {
      const { rules, run } = buildOf(postcss.parse('a,b{}'));
      assert.deepEqual(spelledIds(run, rules[0]), ['a', 'b']);
    });

    test('each item of a selector list has token positions that start at 0', () => {
      const { rules, run } = buildOf(postcss.parse('a, bc{}'));
      const second = run.tokenLists.get(rules[0][1]);
      assert.equal(second[0][2], 0);
      assert.equal(second[0][3], 1);
    });

    test('a written selector that differs from its lone item keeps its own list', () => {
      // A plugin may set a raw whose spacing differs from the selector, so the
      // written text ` a ` is not the item `a` it spells.
      const root = postcss.parse('a{}');
      root.first.raws.selector = { value: 'a', raw: ' a ' };
      const { calls, rules, run } = buildOf(root);
      assert.equal(calls, 1);
      assert.deepEqual(spelledIds(run, rules[0]), ['a']);
    });
  }
);
