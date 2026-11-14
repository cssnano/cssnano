import { suite, test } from 'node:test';
import assert from 'node:assert/strict';

// The counter must hook the tokenizer before the walk loads it.
const { counter } = await import('../../../../util/countTokenize.js');
const { default: postcss } = await import('postcss');
const { buildRecords } = await import('../../src/passes/ir/buildRecords.js');
const { walkDown } = await import('../../src/pipeline/walkDown.js');
const { declarationPlansOf } =
  await import('../../src/pipeline/declarationWalk.js');
const { tokens } = await import('../../src/utils/value.js');
const { walkUp } = await import('../../src/pipeline/walkUp.js');
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
 * The walk up of `root`, as the host runs it.
 * @param {import('postcss').Root} root
 * @param {Map<string, Record<PropertyKey, unknown>>} transforms
 * @param {Map<string, {transform: Function, options: Record<PropertyKey, unknown>}>} symbols
 * @return {number} the tokenize calls of the walk and the end, which read the lists the build made
 */
function afterWalk(root, transforms, symbols) {
  const context = createRunContext(undefined);
  const state = runDriver.build(root, context);
  const before = tokenizeTotal();
  walkUp(state, transforms, symbols);
  runDriver.end(state, {
    browsers: [],
    folded: false,
    result: helpers.result,
  });
  return tokenizeTotal() - before;
}

suite('the record walk folds the at-rule preludes it reads', () => {
  test('a repeated @media prelude is tightened without tokenizing it again', () => {
    const stage = minifyParams.create({}, ['defaults']);
    /** @param {string} css @returns {number} tokenize calls the record walk made */
    const walkCalls = (css) => {
      const context = createRunContext(undefined);
      const { records } = buildRecords(postcss.parse(css), context);
      const before = tokenizeTotal();
      walkDown(records, context, declarationPlansOf([stage], false, null));
      return tokenizeTotal() - before;
    };
    assert.equal(
      walkCalls('@media (min-width:1px){a{}} @media (min-width:1px){a{}}'),
      walkCalls('@media (min-width:1px){a{}}')
    );
  });
});

suite(
  'the at-rule readers read the lists the build made for their at-rules',
  () => {
    test('discard-unused reads the @namespace list the build made for the at-rule, without tokenizing', () => {
      const root = postcss.parse('@namespace svg url(x);svg|a{}');
      const symbols = new Map([
        ['discardUnused', { transform: discardUnusedSymbols, options: {} }],
      ]);
      assert.equal(afterWalk(root, new Map(), symbols), 0);
    });

    test("the record walk's default-namespace check reads the @namespace list the build tokenized, without tokenizing", () => {
      const context = createRunContext(undefined);
      const { records } = buildRecords(
        postcss.parse('@namespace url(x);'),
        context
      );
      const stage = normalizeUrl.create({});
      const before = tokenizeTotal();
      walkDown(records, context, declarationPlansOf([stage], false, null));
      assert.equal(tokenizeTotal() - before, 0);
    });

    test('discard-empty reads the @layer list the build made for the at-rule, without tokenizing', () => {
      const root = postcss.parse('@layer a{}');
      assert.equal(
        afterWalk(root, new Map([['discardEmpty', {}]]), new Map()),
        0
      );
    });

    test('isAnonymousLayer reads a @layer prelude with a name and a comment as named', () => {
      assert.equal(isAnonymousLayer(tokens('a/* c */')), false);
    });
  }
);
