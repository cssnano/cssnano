import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// The counter must hook the tokenizer before the walk loads it.
const { counter } = await import('../../../../util/countTokenize.js');
const { default: postcss } = await import('postcss');
const { createReducers, reduceIdentsSymbols } =
  await import('../../src/plugins/postcss-reduce-idents/index.js');
const { tokensText } = await import('../../src/values/tokensText.js');
const { zindexSymbols } =
  await import('../../src/plugins/postcss-zindex/index.js');
const { mergeIdentsSymbols } =
  await import('../../src/plugins/postcss-merge-idents/index.js');
const { preludeTokens } =
  await import('../../src/plugins/postcss-merge-idents/lib/trailingEscape.js');
const { declaredValue, rawAfterValue } =
  await import('../../src/passes/ir/declaredText.js');
const { createRunContext } = await import('../../src/passes/ir/runContext.js');
const { runDriver } = await import('../../src/passes/ir/runDriver.js');
const { visitEntriesInOrder } =
  await import('../../src/passes/ir/visitEntries.js');
const { createRecordSymbolLists, recordSymbolVisit } =
  await import('../../src/pipeline/symbolLists.js');

/** @returns {number} tokenize calls made so far */
function tokenizeTotal() {
  return [...counter.calls.values()].reduce((sum, n) => sum + n, 0);
}

// Only the counter reducer, so no other reducer reads or stores the lists.
const counterOnly = {
  counterStyle: false,
  keyframes: false,
  gridTemplate: false,
};
const gridOnly = { counter: false, counterStyle: false, keyframes: false };

/**
 * The records of a stylesheet, built in a fresh run.
 *
 * @param {string} css
 * @returns {{ records: import('../../src/passes/ir/blockRecords.js').BlockRecords, context: import('../../src/passes/ir/runContext.js').RunContext }}
 */
function buildRecords(css) {
  const context = createRunContext();
  const state = runDriver.build(postcss.parse(css), context);
  return { records: state.records, context };
}

/**
 * The symbol lists of a built stylesheet, as the walk up collects them.
 *
 * @param {import('../../src/passes/ir/blockRecords.js').BlockRecords} records
 * @param {import('../../src/passes/ir/runContext.js').RunContext} context
 */
function symbolListsOf(records, context) {
  const lists = createRecordSymbolLists();
  visitEntriesInOrder(records, records.root.index, (index) =>
    recordSymbolVisit(records, context.tokenLists, lists, index)
  );
  return lists;
}

/**
 * Two identical string-named keyframes rules, the first of which the merge
 * drops, and a string reference to that first name, with the records and lists
 * the walk would collect for them. A string kept name needs no probe of its
 * spelling, which an identifier kept name does.
 *
 * @returns {ReturnType<typeof buildRecords> & { lists: ReturnType<typeof createRecordSymbolLists> }}
 */
function mergeableKeyframes() {
  const built = buildRecords(
    '@keyframes "a" { from { top: 0 } } @keyframes "b" { from { top: 0 } } div { animation: "a" 1s }'
  );
  return {
    ...built,
    lists: symbolListsOf(built.records, built.context),
  };
}

suite('the symbol transforms read the text the host walk stored', () => {
  test("reduce-idents' at-rule symbols read the list stored for the at-rule, without tokenizing", () => {
    const { records, context } = buildRecords('@keyframes foo { from {} }');
    const lists = symbolListsOf(records, context);
    const before = tokenizeTotal();
    reduceIdentsSymbols(lists, createReducers({}), () => {}, records, context);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test("reduce-idents' at-rule symbols' edited value list spells the renamed value", () => {
    const { records, context } = buildRecords(
      '@keyframes foo { from {} } a { animation: foo 1s }'
    );
    reduceIdentsSymbols(
      symbolListsOf(records, context),
      createReducers({}),
      () => {},
      records,
      context
    );
    const rule = records.links.lastChild(records.root.index);
    const decl = records.links.firstChild(rule);
    assert.equal(
      tokensText(context.tokenLists.get(records.entry(decl).valueList)),
      'a 1s'
    );
  });

  test("reduce-idents' at-rule symbols' renamed prelude spells the renamed name", () => {
    const { records, context } = buildRecords(
      '@keyframes foo { from {} } a { animation: foo 1s }'
    );
    reduceIdentsSymbols(
      symbolListsOf(records, context),
      createReducers({}),
      () => {},
      records,
      context
    );
    const atRule = records.links.firstChild(records.root.index);
    assert.equal(
      tokensText(context.tokenLists.get(records.entry(atRule).preludeId)),
      'a'
    );
  });

  test("reduce-idents' counter symbols read the list stored for the declaration, without tokenizing", () => {
    const { records, context } = buildRecords(
      'a { counter-reset: x } b { content: counter(x) }'
    );
    const lists = symbolListsOf(records, context);
    const before = tokenizeTotal();
    reduceIdentsSymbols(
      lists,
      createReducers(counterOnly),
      () => {},
      records,
      context
    );
    assert.equal(tokenizeTotal() - before, 0);
  });

  test("reduce-idents' counter symbols' edited use value list spells the renamed counter", () => {
    const { records, context } = buildRecords(
      'a { counter-reset: x } b { content: counter(x) }'
    );
    reduceIdentsSymbols(
      symbolListsOf(records, context),
      createReducers(counterOnly),
      () => {},
      records,
      context
    );
    const rule = records.links.lastChild(records.root.index);
    const use = records.links.firstChild(rule);
    assert.equal(
      tokensText(context.tokenLists.get(records.entry(use).valueList)),
      'counter(a)'
    );
  });

  test("reduce-idents' counter symbols' edited definition value list spells the renamed counter", () => {
    const { records, context } = buildRecords(
      'a { counter-reset: x } b { content: counter(x) }'
    );
    reduceIdentsSymbols(
      symbolListsOf(records, context),
      createReducers(counterOnly),
      () => {},
      records,
      context
    );
    const rule = records.links.firstChild(records.root.index);
    const definition = records.links.firstChild(rule);
    assert.equal(
      tokensText(context.tokenLists.get(records.entry(definition).valueList)),
      'a'
    );
  });

  test("reduce-idents' grid-template symbols read the list stored for the declaration, without tokenizing", () => {
    const { records, context } = buildRecords(
      'a { grid-template-areas: "a b" } b { grid-area: a }'
    );
    const lists = symbolListsOf(records, context);
    const before = tokenizeTotal();
    reduceIdentsSymbols(
      lists,
      createReducers(gridOnly),
      () => {},
      records,
      context
    );
    assert.equal(tokenizeTotal() - before, 0);
  });

  test("reduce-idents' grid-template symbols' edited use value list spells the renamed area", () => {
    // The area `a` is the second name, so it encodes to `b` and the use changes.
    const { records, context } = buildRecords(
      'a { grid-template-areas: "x a" } b { grid-area: a }'
    );
    reduceIdentsSymbols(
      symbolListsOf(records, context),
      createReducers(gridOnly),
      () => {},
      records,
      context
    );
    const rule = records.links.lastChild(records.root.index);
    const use = records.links.firstChild(rule);
    assert.equal(
      tokensText(context.tokenLists.get(records.entry(use).valueList)),
      'b'
    );
  });

  test("reduce-idents' grid-template symbols' edited definition value list spells the normalized template", () => {
    // The double space in the string is normalized, and the area `a` is renamed.
    const { records, context } = buildRecords(
      'a { grid-template-areas: "x  a" } b { grid-area: a }'
    );
    reduceIdentsSymbols(
      symbolListsOf(records, context),
      createReducers(gridOnly),
      () => {},
      records,
      context
    );
    const rule = records.links.firstChild(records.root.index);
    const definition = records.links.firstChild(rule);
    assert.equal(
      tokensText(context.tokenLists.get(records.entry(definition).valueList)),
      '"x b"'
    );
  });

  test('zindex rewrites the value', () => {
    const { records, context } = buildRecords(
      'a { z-index: 10 } b { z-index: 20 }'
    );
    zindexSymbols(
      symbolListsOf(records, context),
      {},
      () => {},
      records,
      context
    );
    const rule = records.links.lastChild(records.root.index);
    const decl = records.links.firstChild(rule);
    assert.equal(
      tokensText(context.tokenLists.get(records.entry(decl).valueList)),
      '2'
    );
  });

  test("zindex's rewrite drops raws.value", () => {
    const { records, context } = buildRecords(
      'a { z-index: 10 /* c */ ; } b { z-index: 20 }'
    );
    zindexSymbols(
      symbolListsOf(records, context),
      {},
      () => {},
      records,
      context
    );
    const rule = records.links.firstChild(records.root.index);
    const decl = records.links.firstChild(rule);
    const entry = records.entry(decl);
    assert.equal(entry.marked, true);
    assert.equal(
      rawAfterValue(
        context.tokenLists,
        entry,
        declaredValue(context.tokenLists, entry)
      ),
      null
    );
  });

  test("merge-idents' at-rule symbols read the list stored for the at-rule, without tokenizing", () => {
    const { records, context } = buildRecords('@keyframes foo {}');
    const lists = symbolListsOf(records, context);
    const before = tokenizeTotal();
    mergeIdentsSymbols(lists, {}, () => {}, records, context);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test("merge-idents' references read the list stored for the declaration, without tokenizing", () => {
    const { records, context, lists } = mergeableKeyframes();
    const before = tokenizeTotal();
    mergeIdentsSymbols(lists, {}, () => {}, records, context);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test("merge-idents' edited references' value list spells the rewritten value", () => {
    const { records, context, lists } = mergeableKeyframes();
    mergeIdentsSymbols(lists, {}, () => {}, records, context);
    const rule = records.links.lastChild(records.root.index);
    const reference = records.links.firstChild(rule);
    assert.equal(
      tokensText(context.tokenLists.get(records.entry(reference).valueList)),
      '"b" 1s'
    );
  });

  test('merge-idents removes the repeat keyframes definition that it renames away', () => {
    const { records, context, lists } = mergeableKeyframes();
    const removed = [];
    mergeIdentsSymbols(
      lists,
      {},
      (index) => removed.push(index),
      records,
      context
    );
    assert.deepEqual(removed, [records.links.firstChild(records.root.index)]);
  });

  test('PostCSS keeps in params every comment between two tokens of a prelude', () => {
    const root = postcss.parse('@keyframes a/*x*/b {}');
    assert.equal(root.first.params, 'a/*x*/b');
  });

  test('`preludeTokens` reads the list stored for an at-rule with a trailing comment, without tokenizing', () => {
    const { records, context } = buildRecords('@keyframes foo /*x*/ {}');
    const index = records.links.firstChild(records.root.index);
    const before = tokenizeTotal();
    preludeTokens(records, context.tokenLists, index);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test('`preludeTokens` tokenizes a dangling escape with the space PostCSS keeps after it', () => {
    const { records, context } = buildRecords('@keyframes a\\ {}');
    const index = records.links.firstChild(records.root.index);
    assert.equal(
      tokensText(preludeTokens(records, context.tokenLists, index)),
      'a\\ '
    );
  });

  test('`preludeTokens` reads the list stored for an at-rule whose backslash precedes a newline, without tokenizing', () => {
    const { records, context } = buildRecords('@keyframes a\\\n{}');
    const index = records.links.firstChild(records.root.index);
    const before = tokenizeTotal();
    preludeTokens(records, context.tokenLists, index);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test('`preludeTokens` reads the list stored for an at-rule whose backslashes are an even run, without tokenizing', () => {
    const { records, context } = buildRecords('@keyframes a\\\\ {}');
    const index = records.links.firstChild(records.root.index);
    const before = tokenizeTotal();
    preludeTokens(records, context.tokenLists, index);
    assert.equal(tokenizeTotal() - before, 0);
  });
});
