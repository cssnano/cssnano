import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

// The counter must hook the tokenizer before the stages load it, so both load
// after it.
const { counter } = await import('../../../../util/countTokenize.js');
const { default: postcss } = await import('postcss');
const { hostPlugin } = await import('../../src/pipeline/host.js');
const { default: minifySelectors } =
  await import('../../src/plugins/postcss-minify-selectors/index.js');
const { default: normalizeString } =
  await import('../../src/plugins/postcss-normalize-string/index.js');
const { default: calc } =
  await import('../../src/plugins/postcss-calc/index.js');

/** @returns {number} tokenize calls made so far */
function tokenizeTotal() {
  return [...counter.calls.values()].reduce((sum, n) => sum + n, 0);
}

/**
 * Wraps a stage's selector reducer so that `calls` gets the tokenize calls
 * each run of the reducer makes. The walk's own tokenization is not counted.
 *
 * @param {import('../../src/pipeline/host.js').Stage} stage
 * @param {number[]} calls
 * @returns {import('../../src/pipeline/host.js').Stage}
 */
function probed(stage, calls) {
  const reduce = /** @type {import("../../src/pipeline/host.js").Reducer} */ (
    stage.selector
  );
  return {
    selector(buffer, context) {
      const before = tokenizeTotal();
      reduce(buffer, context);
      calls.push(tokenizeTotal() - before);
    },
  };
}

/**
 * A host plugin whose members are the given stages, in order.
 * @param {...import('../../src/pipeline/host.js').Stage} stages
 */
const hostOf = (...stages) =>
  hostPlugin(
    stages.map((stage) => ({
      entry: { create: () => stage },
      options: {},
      targets: false,
    }))
  );

/** @param {string} css @param {import('../../src/pipeline/host.js').Stage[]} stages */
function processWith(css, stages) {
  return postcss([hostOf(...stages)]).process(css, { from: undefined });
}

suite('selector tokens handed between stages of the host walk', () => {
  test('a stage that tokenizes a selector is counted, as a control for the probe', async () => {
    const calls = [];
    await processWith('a , b{}', [
      probed(minifySelectors.create({}, []), calls),
    ]);
    assert.equal(calls.length, 1);
    assert.ok(calls[0] > 0);
  });

  test('normalize-string reads the selector tokens minify-selectors handed over, without tokenizing, where minify-selectors edited', async () => {
    const calls = [];
    await processWith("a , b[title='x y']{}", [
      minifySelectors.create({}, []),
      probed(normalizeString.create({}, []), calls),
    ]);
    assert.deepEqual(calls, [0]);
  });

  test('normalize-string reads the selector tokens minify-selectors handed over, without tokenizing, where minify-selectors did not edit', async () => {
    const calls = [];
    await processWith('a[title="x y"]{}', [
      minifySelectors.create({}, []),
      probed(normalizeString.create({}, []), calls),
    ]);
    assert.deepEqual(calls, [0]);
  });

  test('minify-selectors reads the shared selector tokens, without tokenizing', async () => {
    // normalize-string re-quotes the string, so its tokens are the ones minify-selectors reads.
    const calls = [];
    await processWith("a[title='x y']{}", [
      normalizeString.create({}, []),
      probed(minifySelectors.create({}, []), calls),
    ]);
    assert.deepEqual(calls, [0]);
  });

  test('minify-selectors tokenizes a selector it leaves unchanged only once, for its own read', async () => {
    // The already-minified combinator carries no tokens, so the output's text is tokenized
    // only when the text changes.
    const calls = [];
    await processWith('legend+*{}', [
      probed(minifySelectors.create({}, []), calls),
    ]);
    assert.deepEqual(calls, [1]);
  });

  test("postcss-calc's selector reducer reads the shared selector tokens, without tokenizing", async () => {
    // postcss-calc tokenizes each replacement it makes (its print, until 6.6),
    // so this selector has a calc() that it leaves as it is.
    const calls = [];
    await processWith('a:is(calc(100% - 1px)), b{}', [
      minifySelectors.create({}, []),
      probed(calc.create({ selectors: true }), calls),
    ]);
    assert.deepEqual(calls, [0]);
  });
});
