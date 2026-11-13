import assert from 'node:assert/strict';
import { suite, test } from 'node:test';

// The counter must hook the tokenizer before the plugin loads it, so both load
// after it.
const { counter } = await import('../../../../util/countTokenize.js');
const { default: postcss } = await import('postcss');
const { normalizeWhitespacePlugins } =
  await import('../../../../util/testHelpers.js');

/** @param {string} css @returns {Promise<number>} tokenize calls the plugin makes */
async function tokenizeCalls(css) {
  counter.calls.clear();
  await postcss(normalizeWhitespacePlugins()).process(css, { from: undefined });
  return [...counter.calls.values()].reduce((sum, n) => sum + n, 0);
}

suite('the whitespace of a declaration value', () => {
  test('a value with whitespace is tokenized, as a control for the counter', async () => {
    assert.ok((await tokenizeCalls('a{color:red blue}')) > 0);
  });

  // The records are built for any run with a transform after merge, and the
  // build tokenizes each value (two calls). The whitespace stage adds none for
  // a value with no whitespace, so the count is the build's alone.
  test('a value without whitespace is tokenized only by the build', async () => {
    assert.equal(await tokenizeCalls('a{color:red}'), 2);
  });
});

/** The default preset with merge off, so the output shows the value alone. */
async function presetOutput(css) {
  const { default: defaultPreset } = await import('#presets/default');
  const result = await postcss(defaultPreset({ disable: ['merge'] })).process(
    css,
    { from: undefined }
  );
  return result.css;
}

suite('the whitespace of a value that a hack or a grid row keeps', () => {
  test('removes the whitespace around the IE 9 hack', async () => {
    assert.equal(await presetOutput('a{width:1px \\9}'), 'a{width:1px\\9}');
  });

  test('removes the whitespace around the IE 9 hack before a semicolon', async () => {
    assert.equal(
      await presetOutput('a{width:1px  \\9  ;color:red}'),
      'a{width:1px\\9;color:red}'
    );
  });

  test('collapses the spaces between the names of a grid row, one row per string', async () => {
    assert.equal(
      await presetOutput('a{grid-template-areas:"a  b"   "c   d"}'),
      'a{grid-template-areas:"a b" "c d"}'
    );
  });

  test('trims the whitespace of a grid track list', async () => {
    assert.equal(
      await presetOutput('a{grid-template-columns:  1fr   2fr }'),
      'a{grid-template-columns:1fr 2fr}'
    );
  });

  test('leaves the inner whitespace of a custom property value as written', async () => {
    assert.equal(
      await presetOutput('a{--x:  1px   2px }'),
      'a{--x:1px   2px }'
    );
  });
});
