import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// The counter must hook the tokenizer before the walk loads it.
const { counter } = await import('../../../../util/countTokenize.js');
const { default: postcss } = await import('postcss');
const { walkStylesheet } = await import('../../src/pipeline/traversal.js');
const { TextTable } = await import('../../src/values/textTable.js');
const { ident, integer } =
  await import('../../src/values/tokenConstructors.js');
const { tokens } = await import('../../src/utils/value.js');
const { walkAfterMerge } = await import('../../src/pipeline/afterMerge.js');
const { discardUnusedSymbols } =
  await import('../../src/plugins/postcss-discard-unused/index.js');

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

suite('the text table reads the value the host walk stored', () => {
  test("a reader takes the value list the host walk's stages read, without tokenizing", () => {
    const root = postcss.parse('a { margin: 0 1px }');
    const table = new TextTable();
    const stage = {
      forProperty: () => (buffer) => buffer.replace(0, 1, [integer(1)]),
    };
    walkStylesheet([stage], root, helpers, new Map(), table);
    const decl = root.first.first;
    assert.equal(decl.value, '1 1px');
    const before = tokenizeTotal();
    assert.equal(table.tokens(decl).length, 3);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test('two declarations of one property in one context that spell one value share one table entry', () => {
    const root = postcss.parse('a { margin: 0 1px } b { margin: 0 1px }');
    const table = new TextTable();
    const stage = {
      forProperty: () => (buffer) => buffer.replace(0, 1, [integer(1)]),
    };
    walkStylesheet([stage], root, helpers, new Map(), table);
    const [first, second] = [root.first.first, root.last.first];
    const list = table.stored(first);
    assert.notEqual(list, undefined);
    assert.equal(table.stored(second), list);
  });
});

suite('the text table reads the text the afterMerge walk wrote', () => {
  test('uniqueSelectors reads the selector tokens merge wrote, without tokenizing', () => {
    const root = postcss.parse('a, b {}');
    const table = new TextTable();
    const rule = root.first;
    table.write(rule, tokens('b, a, b'));
    const before = tokenizeTotal();
    walkAfterMerge(
      root,
      helpers.result,
      new Map([['uniqueSelectors', {}]]),
      new Map(),
      table
    );
    assert.equal(tokenizeTotal() - before, 0);
    assert.equal(rule.selector, ' a,b');
  });

  test("discard-unused's namespace prefixes read the selector uniqueSelectors wrote, without tokenizing", () => {
    const root = postcss.parse('ns|a, b, ns|a {}');
    const table = new TextTable();
    const rule = root.first;
    table.write(rule, tokens('ns|a, b, ns|a'));
    const symbols = new Map([
      ['discardUnused', { transform: discardUnusedSymbols, options: {} }],
    ]);
    const before = tokenizeTotal();
    walkAfterMerge(
      root,
      helpers.result,
      new Map([['uniqueSelectors', {}]]),
      symbols,
      table
    );
    assert.equal(tokenizeTotal() - before, 0);
    assert.equal(rule.selector, ' b,ns|a');
  });
});
