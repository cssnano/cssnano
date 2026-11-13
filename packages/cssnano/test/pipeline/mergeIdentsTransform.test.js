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

test('the advanced preset runs mergeIdents in its host plugin, not as a plugin of its own', () => {
  const names = advancedPreset().map((plugin) => plugin.postcssPlugin);
  assert.ok(!names.includes('postcss-merge-idents'));
});

test('mergeIdents removes the repeat definition that empties an unnamed @layer when discardEmpty is on', async () => {
  assert.equal(
    await minify(
      '@layer{@keyframes a{0%{top:0}}}@layer b{@keyframes a{0%{top:0}}}div{animation:a 1s}'
    ),
    '@layer b{@keyframes a{0%{top:0}}}div{animation:a 1s}'
  );
});

test('mergeIdents leaves the emptied unnamed @layer when discardEmpty is disabled', async () => {
  assert.equal(
    await minify(
      '@layer{@keyframes a{0%{top:0}}}@layer b{@keyframes a{0%{top:0}}}div{animation:a 1s}',
      { disable: ['discardEmpty'] }
    ),
    '@layer{}@layer b{@keyframes a{0%{top:0}}}div{animation:a 1s}'
  );
});

test('mergeIdents keeps an emptied named @layer, which may fix the layer order', async () => {
  assert.equal(
    await minify(
      '@layer c{@keyframes a{0%{top:0}}}@layer c{@keyframes a{0%{top:0}}}div{animation:a 1s}'
    ),
    '@layer c{}@layer c{@keyframes a{0%{top:0}}}div{animation:a 1s}'
  );
});

test('mergeIdents drops the @charset when its merge removed the only non-ASCII name', async () => {
  assert.equal(
    await minify(
      '@charset "utf-8";@keyframes é{0%{top:0}}@keyframes a{0%{top:0}}div{animation:é 1s,a 1s}'
    ),
    '@keyframes a{0%{top:0}}div{animation:a 1s,a 1s}'
  );
});

test('mergeIdents keeps the @charset when non-ASCII text remains after the merge', async () => {
  assert.equal(
    await minify(
      '@charset "utf-8";@keyframes é{0%{top:0}}@keyframes a{0%{top:0}}div{animation:é 1s,a 1s}b{content:"é"}'
    ),
    '@charset "utf-8";@keyframes a{0%{top:0}}div{animation:a 1s,a 1s}b{content:"é"}'
  );
});

test('mergeIdents keeps a name that a custom property spells, so the definition stays', async () => {
  assert.equal(
    await minify(
      '@keyframes a{0%{top:0}}@keyframes b{0%{top:0}}:root{--n:a}div{animation:b 1s}'
    ),
    '@keyframes a{0%{top:0}}:root{--n:a}div{animation:a 1s}'
  );
});

// Both names are referenced, so the unused-name pass does not decide the outcome.
const bothReferenced = 'x{animation:a}y{animation:b}';

test('mergeIdents merges two keyframes whose bodies hold the same important comment', async () => {
  assert.equal(
    await minify(
      `@keyframes a{from{top:0/*!c*/}}@keyframes b{from{top:0/*!c*/}}${bothReferenced}`
    ),
    '@keyframes a{0%{top:0/*!c*/}}x{animation:a}y{animation:a}'
  );
});

test('mergeIdents keeps two keyframes apart when their important comments differ in text', async () => {
  assert.equal(
    await minify(
      `@keyframes a{from{top:0/*!x*/}}@keyframes b{from{top:0/*!y*/}}${bothReferenced}`
    ),
    '@keyframes a{0%{top:0/*!x*/}}@keyframes b{0%{top:0/*!y*/}}x{animation:a}y{animation:b}'
  );
});

test('mergeIdents keeps two keyframes apart when only one body holds an important comment', async () => {
  assert.equal(
    await minify(
      `@keyframes a{from{top:0/*!c*/}}@keyframes b{from{top:0}}${bothReferenced}`
    ),
    '@keyframes a{0%{top:0/*!c*/}}@keyframes b{0%{top:0}}x{animation:a}y{animation:b}'
  );
});

test('mergeIdents merges two keyframes whose important spellings differ in case', async () => {
  assert.equal(
    await minify(
      `@keyframes a{from{top:0!important}}@keyframes b{from{top:0!IMPORTANT}}${bothReferenced}`
    ),
    '@keyframes a{0%{top:0!important}}x{animation:a}y{animation:a}'
  );
});

test('mergeIdents merges two keyframes whose bodies differ only in whitespace', async () => {
  assert.equal(
    await minify(
      `@keyframes a{from{top:0}}@keyframes b{from {top:0}}${bothReferenced}`
    ),
    '@keyframes a{0%{top:0}}x{animation:a}y{animation:a}'
  );
});

test('mergeIdents keeps the important comment of a reference that renaming respells', async () => {
  assert.equal(
    await minify(
      '@keyframes a{from{top:0}}@keyframes b{from{top:0}}x{animation:a}y{animation-name:/*!x*/b}'
    ),
    '@keyframes a{0%{top:0}}x{animation:a}y{animation-name:/*!x*/a}'
  );
});

// With normalizeWhitespace off, the bodies keep their raws, so the text differs.
test('mergeIdents keeps two keyframes apart when normalizeWhitespace is disabled and the value spacing differs', async () => {
  assert.equal(
    await minify(
      `@keyframes a{from{top:0}}@keyframes b{from{top: 0}}${bothReferenced}`,
      { disable: ['normalizeWhitespace'] }
    ),
    '@keyframes a{0%{top:0}}@keyframes b{0%{top: 0}}x{animation:a}y{animation:b}'
  );
});

test('mergeIdents keeps two keyframes apart when normalizeWhitespace is disabled and the important spellings differ in case', async () => {
  assert.equal(
    await minify(
      `@keyframes a{from{top:0!important}}@keyframes b{from{top:0!IMPORTANT}}${bothReferenced}`,
      { disable: ['normalizeWhitespace'] }
    ),
    '@keyframes a{0%{top:0!important}}@keyframes b{0%{top:0!IMPORTANT}}x{animation:a}y{animation:b}'
  );
});

test('mergeIdents keeps two keyframes apart when discardComments is disabled and the plain comments differ', async () => {
  assert.equal(
    await minify(
      `@keyframes a{from{top:0/*a*/}}@keyframes b{from{top:0/*b*/}}${bothReferenced}`,
      { disable: ['discardComments'] }
    ),
    '@keyframes a{0%{top:0/*a*/}}@keyframes b{0%{top:0/*b*/}}x{animation:a}y{animation:b}'
  );
});
