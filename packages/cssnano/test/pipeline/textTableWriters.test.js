import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// The counter must hook the tokenizer before the walk loads it.
const { counter } = await import('../../../../util/countTokenize.js');
const { default: postcss } = await import('postcss');
const { walkStylesheet } = await import('../../src/pipeline/traversal.js');
const { TextTable } = await import('../../src/values/textTable.js');
const { ident } = await import('../../src/values/tokenConstructors.js');

/** @returns {number} tokenize calls made so far */
function tokenizeTotal() {
  return [...counter.calls.values()].reduce((sum, n) => sum + n, 0);
}

const helpers = { result: { warn() {} } };

suite('the text table reads the text the host walk wrote', () => {
  test('the table reads the selector the host walk wrote, without tokenizing', () => {
    const root = postcss.parse('a, b {}');
    const table = new TextTable();
    const stage = {
      selector: (buffer) => buffer.replace(0, 1, [ident('z')]),
    };
    walkStylesheet([stage], root, helpers, new Map(), table);
    const rule = root.first;
    assert.equal(rule.selector, 'z, b');
    const before = tokenizeTotal();
    const list = table.tokens(rule);
    assert.equal(tokenizeTotal() - before, 0);
    assert.equal(list.map((token) => token[1]).join(''), 'z, b');
  });
  test('the table reads the selector the host walk left unchanged, without tokenizing', () => {
    const root = postcss.parse('a, b {}');
    const table = new TextTable();
    const stage = { selector: (buffer) => buffer.tokens() };
    walkStylesheet([stage], root, helpers, new Map(), table);
    const rule = root.first;
    assert.equal(rule.selector, 'a, b');
    const before = tokenizeTotal();
    assert.equal(table.tokens(rule).length, 4);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test('the table reads the selector the memo served to the host walk, without tokenizing', () => {
    const root = postcss.parse('a, b {} a, b {}');
    const table = new TextTable();
    const stage = {
      selector: (buffer) => buffer.replace(0, 1, [ident('z')]),
    };
    walkStylesheet([stage], root, helpers, new Map(), table);
    const second = root.nodes[1];
    assert.equal(second.selector, 'z, b');
    const before = tokenizeTotal();
    assert.equal(table.tokens(second).length, 4);
    assert.equal(tokenizeTotal() - before, 0);
  });
});
