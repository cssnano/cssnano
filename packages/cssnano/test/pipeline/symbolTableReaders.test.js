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

/** @returns {number} tokenize calls made so far */
function tokenizeTotal() {
  return [...counter.calls.values()].reduce((sum, n) => sum + n, 0);
}

const helpers = { result: { warn() {} } };

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
});
