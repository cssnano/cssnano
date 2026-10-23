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

test('the advanced preset runs reduceIdents in its host plugin, not as a plugin of its own', () => {
  const names = advancedPreset().map((plugin) => plugin.postcssPlugin);
  assert.ok(!names.includes('postcss-reduce-idents'));
});

test('reduceIdents numbers a name by the kept at-rules, not by the at-rules discardUnused removed', async () => {
  assert.equal(
    await minify(
      '@media print{@keyframes unusedName{0%{top:0}}}@keyframes fadeIn{0%{top:0}}div{animation:fadeIn 1s}'
    ),
    '@keyframes a{0%{top:0}}div{animation:a 1s}'
  );
});

test('the @charset is dropped when reduceIdents renamed the only non-ASCII name', async () => {
  assert.equal(
    await minify('@charset "utf-8";@keyframes é{0%{top:0}}div{animation:é 1s}'),
    '@keyframes a{0%{top:0}}div{animation:a 1s}'
  );
});

test('the @charset stays when non-ASCII text remains after reduceIdents', async () => {
  assert.equal(
    await minify(
      '@charset "utf-8";@keyframes é{0%{top:0}}div{animation:é 1s}b{content:"é"}'
    ),
    '@charset "utf-8";@keyframes a{0%{top:0}}div{animation:a 1s}b{content:"é"}'
  );
});
