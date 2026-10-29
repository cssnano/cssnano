import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// The counter must hook the tokenizer before the walk loads it.
const { counter } = await import('../../../../util/countTokenize.js');
const { default: postcss } = await import('postcss');
const { walkStylesheet } = await import('../../src/pipeline/traversal.js');
const { createSymbolLists, symbolVisit } =
  await import('../../src/pipeline/symbolLists.js');
const { createReducers, reduceIdentsSymbols } =
  await import('../../src/plugins/postcss-reduce-idents/index.js');
const { TextTable } = await import('../../src/values/textTable.js');
const { tokensText } = await import('../../src/values/tokensText.js');
const { zindexSymbols } =
  await import('../../src/plugins/postcss-zindex/index.js');
const { mergeIdentsSymbols } =
  await import('../../src/plugins/postcss-merge-idents/index.js');
const { preludeTokens } =
  await import('../../src/plugins/postcss-merge-idents/lib/grammar.js');
const { tokens } = await import('../../src/utils/value.js');

/** @returns {number} tokenize calls made so far */
function tokenizeTotal() {
  return [...counter.calls.values()].reduce((sum, n) => sum + n, 0);
}

const helpers = { result: { warn() {} } };

// Only the counter reducer, so no other reducer reads or stores the lists.
const counterOnly = {
  counterStyle: false,
  keyframes: false,
  gridTemplate: false,
};
const gridOnly = { counter: false, counterStyle: false, keyframes: false };

/**
 * Two identical string-named keyframes rules, the first of which the merge
 * drops, and a string reference to that first name, with the lists the walk
 * would store for them. A string kept name needs no probe of its spelling,
 * which an identifier kept name does.
 *
 * @returns {{ root: import('postcss').Root, table: TextTable, lists: ReturnType<typeof createSymbolLists> }}
 */
function mergeableKeyframes() {
  const root = postcss.parse(
    '@keyframes "a" { from { top: 0 } } @keyframes "b" { from { top: 0 } } div { animation: "a" 1s }'
  );
  const [first, second] = root.nodes;
  const table = new TextTable();
  table.write(first, tokens('"a"'));
  table.write(second, tokens('"b"'));
  table.write(root.last.first, tokens('"a" 1s'));
  const lists = createSymbolLists();
  root.walk(symbolVisit(lists));
  return { root, table, lists };
}

suite('the symbol transforms read the text the host walk stored', () => {
  test("reduce-idents' at-rule symbols read the list stored for the at-rule, without tokenizing", () => {
    const root = postcss.parse('@keyframes foo { from {} }');
    const table = new TextTable();
    const stage = {
      forAtRule: () => ({ buffer: (buffer) => buffer.tokens() }),
    };
    walkStylesheet([stage], root, helpers, new Map(), table);
    const lists = createSymbolLists();
    root.walk(symbolVisit(lists));
    const before = tokenizeTotal();
    reduceIdentsSymbols(lists, createReducers({}), () => {}, table);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test("reduce-idents' at-rule symbols' edited tokens spell text()", () => {
    const root = postcss.parse(
      '@keyframes foo { from {} } a { animation: foo 1s }'
    );
    const table = new TextTable();
    walkStylesheet([], root, helpers, new Map(), table);
    const lists = createSymbolLists();
    root.walk(symbolVisit(lists));
    reduceIdentsSymbols(lists, createReducers({}), () => {}, table);
    const decl = root.last.first;
    assert.equal(tokensText(table.stored(decl)), decl.value);
  });

  test("reduce-idents' at-rule symbols' renamed prelude spells text()", () => {
    const root = postcss.parse(
      '@keyframes foo { from {} } a { animation: foo 1s }'
    );
    const table = new TextTable();
    walkStylesheet([], root, helpers, new Map(), table);
    const lists = createSymbolLists();
    root.walk(symbolVisit(lists));
    reduceIdentsSymbols(lists, createReducers({}), () => {}, table);
    const atRule = root.first;
    assert.equal(tokensText(table.stored(atRule)), atRule.params);
  });

  test("reduce-idents' counter symbols read the list stored for the declaration, without tokenizing", () => {
    const root = postcss.parse(
      'a { counter-reset: x } b { content: counter(x) }'
    );
    const table = new TextTable();
    const stage = {
      forProperty: () => (buffer) => buffer.tokens(),
    };
    walkStylesheet([stage], root, helpers, new Map(), table);
    const lists = createSymbolLists();
    root.walk(symbolVisit(lists));
    const before = tokenizeTotal();
    reduceIdentsSymbols(lists, createReducers(counterOnly), () => {}, table);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test("reduce-idents' counter symbols' edited use tokens spell text()", () => {
    const root = postcss.parse(
      'a { counter-reset: x } b { content: counter(x) }'
    );
    const table = new TextTable();
    walkStylesheet([], root, helpers, new Map(), table);
    const lists = createSymbolLists();
    root.walk(symbolVisit(lists));
    reduceIdentsSymbols(lists, createReducers(counterOnly), () => {}, table);
    const use = root.last.first;
    assert.equal(tokensText(table.stored(use)), use.value);
  });

  test("reduce-idents' counter symbols' edited definition tokens spell text()", () => {
    const root = postcss.parse(
      'a { counter-reset: x } b { content: counter(x) }'
    );
    const table = new TextTable();
    walkStylesheet([], root, helpers, new Map(), table);
    const lists = createSymbolLists();
    root.walk(symbolVisit(lists));
    reduceIdentsSymbols(lists, createReducers(counterOnly), () => {}, table);
    const definition = root.first.first;
    assert.equal(tokensText(table.stored(definition)), definition.value);
  });

  test("reduce-idents' grid-template symbols read the list stored for the declaration, without tokenizing", () => {
    const root = postcss.parse(
      'a { grid-template-areas: "a b" } b { grid-area: a }'
    );
    const table = new TextTable();
    const stage = {
      forProperty: () => (buffer) => buffer.tokens(),
    };
    walkStylesheet([stage], root, helpers, new Map(), table);
    const lists = createSymbolLists();
    root.walk(symbolVisit(lists));
    const before = tokenizeTotal();
    reduceIdentsSymbols(lists, createReducers(gridOnly), () => {}, table);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test("reduce-idents' grid-template symbols' edited use tokens spell text()", () => {
    // The area `a` is the second name, so it encodes to `b` and the use changes.
    const root = postcss.parse(
      'a { grid-template-areas: "x a" } b { grid-area: a }'
    );
    const table = new TextTable();
    walkStylesheet([], root, helpers, new Map(), table);
    const lists = createSymbolLists();
    root.walk(symbolVisit(lists));
    reduceIdentsSymbols(lists, createReducers(gridOnly), () => {}, table);
    const use = root.last.first;
    assert.equal(tokensText(table.stored(use)), use.value);
  });

  test('zindex rewrites the value', () => {
    const root = postcss.parse('a { z-index: 10 } b { z-index: 20 }');
    const lists = createSymbolLists();
    root.walk(symbolVisit(lists));
    zindexSymbols(lists, {}, () => {}, new TextTable());
    assert.equal(root.last.first.value, '2');
  });

  test("zindex's rewrite drops raws.value", () => {
    const root = postcss.parse('a { z-index: 10 /* c */ ; } b { z-index: 20 }');
    const lists = createSymbolLists();
    root.walk(symbolVisit(lists));
    zindexSymbols(lists, {}, () => {}, new TextTable());
    assert.equal(root.first.first.raws.value, undefined);
  });

  test("reduce-idents' grid-template symbols' edited definition tokens spell text()", () => {
    const root = postcss.parse(
      'a { grid-template-areas: "a  b" } b { grid-area: a }'
    );
    const table = new TextTable();
    walkStylesheet([], root, helpers, new Map(), table);
    const lists = createSymbolLists();
    root.walk(symbolVisit(lists));
    reduceIdentsSymbols(lists, createReducers(gridOnly), () => {}, table);
    const definition = root.first.first;
    assert.equal(tokensText(table.stored(definition)), definition.value);
  });

  test("merge-idents' at-rule symbols read the list stored for the at-rule, without tokenizing", () => {
    const root = postcss.parse('@keyframes foo {}');
    const table = new TextTable();
    table.write(root.first, tokens('foo'));
    const lists = createSymbolLists();
    root.walk(symbolVisit(lists));
    const before = tokenizeTotal();
    mergeIdentsSymbols(lists, {}, () => {}, table);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test("merge-idents' references read the list stored for the declaration, without tokenizing", () => {
    const { table, lists } = mergeableKeyframes();
    const before = tokenizeTotal();
    mergeIdentsSymbols(lists, {}, () => {}, table);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test("merge-idents' edited references' tokens spell text()", () => {
    const { root, table, lists } = mergeableKeyframes();
    mergeIdentsSymbols(lists, {}, () => {}, table);
    const reference = root.last.first;
    assert.equal(tokensText(table.stored(reference)), reference.value);
  });

  test('merge-idents renames a reference to the keyframes name it keeps', () => {
    const { root, table, lists } = mergeableKeyframes();
    mergeIdentsSymbols(lists, {}, () => {}, table);
    assert.equal(root.last.first.value, '"b" 1s');
  });

  test('PostCSS keeps in params every comment between two tokens of a prelude', () => {
    const root = postcss.parse('@keyframes a/*x*/b {}');
    assert.equal(root.first.params, 'a/*x*/b');
  });

  test('`preludeTokens` reads the list stored for an at-rule with a trailing comment, without tokenizing', () => {
    const root = postcss.parse('@keyframes foo /*x*/ {}');
    const table = new TextTable();
    table.write(root.first, tokens('foo'));
    const before = tokenizeTotal();
    preludeTokens(root.first, table);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test('`preludeTokens` tokenizes a dangling escape with the space PostCSS keeps after it', () => {
    const root = postcss.parse('@keyframes a\\ {}');
    const table = new TextTable();
    assert.equal(tokensText(preludeTokens(root.first, table)), 'a\\ ');
  });

  test('`preludeTokens` reads the list stored for an at-rule whose backslash precedes a newline, without tokenizing', () => {
    const root = postcss.parse('@keyframes a\\\n{}');
    const table = new TextTable();
    table.write(root.first, tokens('a\\'));
    const before = tokenizeTotal();
    preludeTokens(root.first, table);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test('`preludeTokens` reads the list stored for an at-rule whose backslashes are an even run, without tokenizing', () => {
    const root = postcss.parse('@keyframes a\\\\ {}');
    const table = new TextTable();
    table.write(root.first, tokens('a\\\\'));
    const before = tokenizeTotal();
    preludeTokens(root.first, table);
    assert.equal(tokenizeTotal() - before, 0);
  });
});
