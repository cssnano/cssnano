import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import advancedPreset from '../../src/presets/advanced.js';

/**
 * @param {string} css
 * @param {Record<string, unknown>} [options]
 */
async function minify(css, options) {
  const result = await postcss(advancedPreset(options)).process(css, {
    from: undefined,
  });
  return result.css;
}

test('the advanced preset runs discardUnused in its host plugin, not as a plugin of its own', () => {
  const names = advancedPreset().map((plugin) => plugin.postcssPlugin);
  assert.ok(!names.includes('postcss-discard-unused'));
});

test('discardUnused removes the @media that held only an unused @keyframes when discardEmpty is on', async () => {
  assert.equal(await minify('@media print{@keyframes a{0%{top:0}}}'), '');
});

test('discardUnused leaves the emptied @media when discardEmpty is disabled', async () => {
  assert.equal(
    await minify('@media print{@keyframes a{0%{top:0}}}', {
      disable: ['discardEmpty'],
    }),
    '@media print{}'
  );
});

test('discardUnused keeps an emptied named @layer, which may fix the layer order', async () => {
  assert.equal(
    await minify('@layer a{@keyframes b{0%{top:0}}}@layer c{d{top:0}}'),
    '@layer a{}@layer c{d{top:0}}'
  );
});

test('discardUnused removes the ancestors it empties up to the first that keeps a child', async () => {
  assert.equal(
    await minify(
      '@media print{@supports (top:0){@keyframes a{0%{top:0}}}b{top:0}}'
    ),
    '@media print{b{top:0}}'
  );
});

test('the @charset is dropped when discardUnused removed the only non-ASCII text', async () => {
  assert.equal(
    await minify(
      '@charset "utf-8";@font-face{font-family:"é";src:url(a)}a{top:0}'
    ),
    'a{top:0}'
  );
});

test('the @charset stays when non-ASCII text remains after discardUnused', async () => {
  assert.equal(
    await minify(
      '@charset "utf-8";@font-face{font-family:"é";src:url(a)}a{content:"é"}'
    ),
    '@charset "utf-8";a{content:"é"}'
  );
});
