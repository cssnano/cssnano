import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// The counter must hook the tokenizer before the walk loads it.
const { counter } = await import('../../../../util/countTokenize.js');
const { default: postcss } = await import('postcss');
const { walkStylesheet } = await import('../../src/pipeline/traversal.js');
const { TextTable } = await import('../../src/values/textTable.js');
const { tokens } = await import('../../src/utils/value.js');
const { walkAfterMerge } = await import('../../src/pipeline/afterMerge.js');
const { createRunContext } = await import('../../src/passes/ir/runContext.js');
const { runDriver } = await import('../../src/passes/ir/runDriver.js');
const { discardUnusedSymbols } =
  await import('../../src/plugins/postcss-discard-unused/index.js');
const { default: minifyParams } =
  await import('../../src/plugins/postcss-minify-params/index.js');
const { default: normalizeUrl } =
  await import('../../src/plugins/postcss-normalize-url/index.js');
const { default: isAnonymousLayer } =
  await import('../../src/utils/isAnonymousLayer.js');

/** @returns {number} tokenize calls made so far */
function tokenizeTotal() {
  return [...counter.calls.values()].reduce((sum, n) => sum + n, 0);
}

const helpers = { result: { warn() {}, messages: [] } };

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

suite('the walk reads the at-rule flags that the plan stored', () => {
  test('tightenAfterName reads the flag stored for a repeated @media prelude, without tokenizing', () => {
    const stage = minifyParams.create({}, ['defaults']);
    /** @param {string} css @returns {number} tokenize calls the walk made */
    const walkCalls = (css) => {
      const before = tokenizeTotal();
      walkStylesheet(
        [stage],
        postcss.parse(css),
        helpers,
        new Map(),
        new TextTable()
      );
      return tokenizeTotal() - before;
    };
    assert.equal(
      walkCalls('@media (min-width:1px){a{}} @media (min-width:1px){a{}}'),
      walkCalls('@media (min-width:1px){a{}}')
    );
  });
});

suite('the at-rule readers read the lists stored for their at-rules', () => {
  test('discard-unused reads the @namespace list stored for the at-rule, without tokenizing', () => {
    const root = postcss.parse('@namespace svg url(x);svg|a{}');
    const table = new TextTable();
    table.write(root.first, tokens('svg url(x)'));
    table.write(root.last, tokens('svg|a'));
    const symbols = new Map([
      ['discardUnused', { transform: discardUnusedSymbols, options: {} }],
    ]);
    assert.equal(afterWalk(root, table, new Map(), symbols), 0);
  });

  test("the walk's default-namespace check reads the @namespace list stored for the at-rule, without tokenizing", () => {
    const root = postcss.parse('@namespace url(x);');
    const table = new TextTable();
    const stage = normalizeUrl.create({});
    const before = tokenizeTotal();
    walkStylesheet([stage], root, helpers, new Map(), table);
    // The prelude is tokenized once, by the stage that rewrites it.
    assert.equal(tokenizeTotal() - before, 1);
  });

  test('discard-empty reads the @layer list stored for the at-rule, without tokenizing', () => {
    const root = postcss.parse('@layer a{}');
    const table = new TextTable();
    table.write(root.first, tokens('a'));
    assert.equal(
      afterWalk(root, table, new Map([['discardEmpty', {}]]), new Map()),
      0
    );
  });

  test('isAnonymousLayer reads a @layer prelude with a name and a comment as named', () => {
    assert.equal(isAnonymousLayer(tokens('a/* c */')), false);
  });
});
