import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// The counter must hook the tokenizer before the walk loads it.
const { counter } = await import('../../../../util/countTokenize.js');
const { createRunContext } = await import('../../src/passes/ir/runContext.js');
const { default: postcss } = await import('postcss');
const { walkStylesheet } = await import('../../src/pipeline/traversal.js');
const { mergePass } = await import('../../src/passes/merge/index.js');
const { TextTable } = await import('../../src/values/textTable.js');
const { ident, integer } =
  await import('../../src/values/tokenConstructors.js');
const { tokens } = await import('../../src/utils/value.js');
const { ValueBuffer } = await import('../../src/values/valueBuffer.js');
const { tokensText } = await import('../../src/values/tokensText.js');
const { default: minifyParams } =
  await import('../../src/plugins/postcss-minify-params/index.js');
const { default: normalizeString } =
  await import('../../src/plugins/postcss-normalize-string/index.js');
const { default: normalizeUrl } =
  await import('../../src/plugins/postcss-normalize-url/index.js');
const { walkAfterMerge } = await import('../../src/pipeline/afterMerge.js');
const { runDriver } = await import('../../src/passes/ir/runDriver.js');
const { discardUnusedSymbols } =
  await import('../../src/plugins/postcss-discard-unused/index.js');
const { foldShorthandDeclaration } =
  await import('../../src/passes/merge/lib/longhand/minifyShorthand.js');
const { readBlock } =
  await import('../passes/merge/lib/longhand/helpers/declarationItems.js');
const { reduceBlock, itemTokensSpellText } =
  await import('../passes/merge/lib/longhand/helpers/declarationItems.js');
const { longstandingFeatures } =
  await import('../../src/passes/ir/syntaxFeatures.js');
const { discardOverriddenInList } =
  await import('../../src/passes/merge/lib/longhand/decl/overriddenDeclarations.js');

/** @returns {number} tokenize calls made so far */
function tokenizeTotal() {
  return [...counter.calls.values()].reduce((sum, n) => sum + n, 0);
}

const helpers = { result: { warn() {}, messages: [] } };

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
  test("the table reads the prelude the host walk's stages read, without tokenizing", () => {
    const root = postcss.parse('@media screen and (x) {}');
    const table = new TextTable();
    const stage = {
      forAtRule: () => ({
        buffer: (buffer) => buffer.replace(0, 1, [ident('z')]),
      }),
    };
    walkStylesheet([stage], root, helpers, new Map(), table);
    const atRule = root.first;
    assert.equal(atRule.params, 'z and (x)');
    const before = tokenizeTotal();
    const list = table.tokens(atRule);
    assert.equal(tokenizeTotal() - before, 0);
    assert.equal(list.map((token) => token[1]).join(''), 'z and (x)');
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

suite('the host walk shares one token list per text', () => {
  test('two properties that spell one value share one token list', () => {
    const root = postcss.parse('a { margin: 0 1px } b { padding: 0 1px }');
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

  test("a value's stages read the list another property's value left, without tokenizing", () => {
    const root = postcss.parse('a { margin: 0 1px } b { padding: 0 1px }');
    const table = new TextTable();
    const stage = {
      forProperty: () => (buffer) => buffer.tokens(),
    };
    const before = tokenizeTotal();
    walkStylesheet([stage], root, helpers, new Map(), table);
    assert.equal(tokenizeTotal() - before, 1);
  });

  test('a unicode-range value does not take a list read in the default mode', () => {
    const root = postcss.parse(
      'a { color: u+0-7f } b { unicode-range: u+0-7f }'
    );
    const table = new TextTable();
    const seen = [];
    const stage = {
      forProperty: () => (buffer) => {
        seen.push(buffer.tokens().length);
      },
    };
    walkStylesheet([stage], root, helpers, new Map(), table);
    assert.equal(seen[1], 1);
  });

  test('the walk stores no unicode-range list for the declaration', () => {
    const root = postcss.parse('a { unicode-range: u+0-7f }');
    const table = new TextTable();
    const stage = {
      forProperty: () => (buffer) => {
        buffer.tokens();
      },
    };
    walkStylesheet([stage], root, helpers, new Map(), table);
    assert.equal(table.stored(root.first.first), undefined);
  });
});

suite('the at-rule reducers write tokens that spell their text', () => {
  test("minify-params' edited tokens spell text()", () => {
    const { buffer: reduce } = minifyParams
      .create({}, ['defaults'])
      .forAtRule('media');
    const buffer = new ValueBuffer('screen  and (min-width: 1px), print');
    reduce(buffer, 0);
    assert.equal(tokensText(buffer.tokens()), buffer.text());
  });

  test("normalize-string's prelude reducer's edited tokens spell text()", () => {
    const { buffer: reduce } = normalizeString.create({}).forAtRule('import');
    const buffer = new ValueBuffer("'a' screen");
    reduce(buffer, 0);
    assert.equal(tokensText(buffer.tokens()), buffer.text());
  });

  test("normalize-url's @import reducer's edited tokens spell text()", () => {
    const { buffer: reduce } = normalizeUrl.create({}).forAtRule('import');
    const buffer = new ValueBuffer("url('a.css') screen");
    reduce(buffer, 0);
    assert.equal(tokensText(buffer.tokens()), buffer.text());
  });
});

/**
 * The walk after merge of `root` through a run over `table`, as the host runs it.
 * @param {import('postcss').Root} root
 * @param {TextTable} table
 * @param {Map<string, Record<PropertyKey, unknown>>} transforms
 * @param {Map<string, {transform: Function, options: Record<PropertyKey, unknown>}>} symbols
 * @return {number} the tokenize calls of the walk and the end, which read the stored text
 */
function afterWalk(root, table, transforms, symbols) {
  const context = createRunContext(table, undefined);
  const state = runDriver.build(root, context);
  const before = tokenizeTotal();
  walkAfterMerge(state, transforms, symbols);
  runDriver.end(state, {
    browsers: [],
    folded: false,
    result: helpers.result,
  });
  return tokenizeTotal() - before;
}

suite('the text table reads the text the afterMerge walk wrote', () => {
  test('uniqueSelectors reads the selector tokens merge wrote, without tokenizing', () => {
    const root = postcss.parse('a, b {}');
    const table = new TextTable();
    const rule = root.first;
    table.write(rule, tokens('b, a, b'));
    assert.equal(
      afterWalk(root, table, new Map([['uniqueSelectors', {}]]), new Map()),
      0
    );
    assert.equal(rule.selector, 'a,b');
  });

  test("discard-unused's namespace prefixes read the selector uniqueSelectors wrote, without tokenizing", () => {
    const root = postcss.parse('ns|a, b, ns|a {}');
    const table = new TextTable();
    const rule = root.first;
    table.write(rule, tokens('ns|a, b, ns|a'));
    const symbols = new Map([
      ['discardUnused', { transform: discardUnusedSymbols, options: {} }],
    ]);
    assert.equal(
      afterWalk(root, table, new Map([['uniqueSelectors', {}]]), symbols),
      0
    );
    assert.equal(rule.selector, 'b,ns|a');
  });
});

suite('the text table reads the text the merge longhand writers wrote', () => {
  test('overriddenDeclarations reads the text minifyShorthand wrote, without tokenizing', () => {
    const root = postcss.parse('a { gap: 1px 1px; gap: 2px }');
    const table = new TextTable();
    const block = readBlock(root.first, createRunContext(table));
    foldShorthandDeclaration(block.list, 0, 'gap');
    const before = tokenizeTotal();
    discardOverriddenInList(block.list, block.list.chain, longstandingFeatures);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test("minifyShorthand's edited tokens spell text()", () => {
    const root = postcss.parse('a { gap: 1px 1px }');
    const table = new TextTable();
    const reduced = reduceBlock(root.first, table, (list) =>
      foldShorthandDeclaration(list, 0, 'gap')
    );
    assert.ok(itemTokensSpellText(reduced));
  });

  test('foldShorthandDeclaration reads the text it wrote, without tokenizing', () => {
    const root = postcss.parse('a { gap: 1px 1px }');
    const table = new TextTable();
    const block = readBlock(root.first, createRunContext(table));
    foldShorthandDeclaration(block.list, 0, 'gap');
    const before = tokenizeTotal();
    foldShorthandDeclaration(block.list, 0, 'gap');
    assert.equal(tokenizeTotal() - before, 0);
  });
});

suite('the merge longhand writers no traced reader reads', () => {
  test("borderReducer's singleton write drops raws.value", () => {
    const root = postcss.parse(
      'a{border-color:red /*x*/ red;border-top-style:solid!important}'
    );
    mergePass(root, ['defaults']);
    assert.equal(root.first.first.raws.value, undefined);
  });

  test("boxReducer's singleton write drops raws.value", () => {
    const root = postcss.parse('a{margin:1px /*x*/ 2px}');
    mergePass(root, ['defaults']);
    assert.equal(root.first.first.raws.value, undefined);
  });

  test("slotSolver's shorthand write drops raws.value", () => {
    const root = postcss.parse(
      'a{margin:1px 2px 1px 2px /*x*/;margin-left:5px}'
    );
    mergePass(root, ['defaults']);
    assert.equal(root.first.first.raws.value, undefined);
  });

  test("columns' singleton write drops raws.value", () => {
    const root = postcss.parse('a{columns:2 /*x*/ auto}');
    mergePass(root, ['defaults']);
    assert.equal(root.first.first.raws.value, undefined);
  });
});
