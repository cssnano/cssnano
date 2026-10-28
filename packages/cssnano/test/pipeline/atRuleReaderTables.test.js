import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// The counter must hook the tokenizer before the walk loads it.
const { counter } = await import('../../../../util/countTokenize.js');
const { default: postcss } = await import('postcss');
const { walkStylesheet } = await import('../../src/pipeline/traversal.js');
const { TextTable } = await import('../../src/values/textTable.js');
const { tokens } = await import('../../src/utils/value.js');
const { walkAfterMerge } = await import('../../src/pipeline/afterMerge.js');
const { discardUnusedSymbols } =
  await import('../../src/plugins/postcss-discard-unused/index.js');
const { default: minifyParams } =
  await import('../../src/plugins/postcss-minify-params/index.js');
const { default: normalizeUrl } =
  await import('../../src/plugins/postcss-normalize-url/index.js');
const { discardAndReport } = await import('#postcss-discard-empty');
const { default: isAnonymousLayer } =
  await import('../../src/utils/isAnonymousLayer.js');

/** @returns {number} tokenize calls made so far */
function tokenizeTotal() {
  return [...counter.calls.values()].reduce((sum, n) => sum + n, 0);
}

const helpers = { result: { warn() {} } };

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
    const before = tokenizeTotal();
    walkAfterMerge(root, helpers.result, new Map(), symbols, table);
    assert.equal(tokenizeTotal() - before, 0);
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
    const before = tokenizeTotal();
    discardAndReport(root, helpers.result, undefined, table);
    assert.equal(tokenizeTotal() - before, 0);
  });

  test('isAnonymousLayer reads the @layer list stored for the at-rule, without tokenizing', () => {
    const root = postcss.parse('@layer a/* c */{}');
    const table = new TextTable();
    table.write(root.first, tokens('a/* c */'));
    const before = tokenizeTotal();
    assert.equal(isAnonymousLayer(root.first, table), false);
    assert.equal(tokenizeTotal() - before, 0);
  });
});
