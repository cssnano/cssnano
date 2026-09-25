import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import plugin from '../src/index.js';

/**
 * Builds a one-declaration processor where an upstream plugin marks
 * decl.raws.value as authoritative before postcss-svgo runs, mirroring how
 * earlier cssnano plugins leave raw metadata behind.
 * @param {import('postcss').Plugin} upstream
 * @param {string} css
 * @return {Promise<{decl: import('postcss').Declaration, css: string, warnings: import('postcss').Warning[]}>}
 */
async function processWithUpstreamRaws(upstream, css) {
  /** @type {import('postcss').Declaration | undefined} */
  let seen;
  const result = await postcss([upstream, plugin()]).process(css, {
    from: undefined,
  });
  result.root.walkDecls((decl) => {
    seen ??= decl;
  });
  return {
    decl: /** @type {import('postcss').Declaration} */ (seen),
    css: result.css,
    warnings: result.warnings(),
  };
}

/** @return {import('postcss').Plugin} */
const markRawsAuthoritative = () => ({
  postcssPlugin: 'mark-raws-authoritative',
  Declaration(decl) {
    decl.raws.value = { raw: decl.value, value: decl.value };
  },
});

describe('PostCSS raw value metadata', () => {
  test('should synchronize raws.value when the value is rewritten', async () => {
    const css =
      "h1{background:url(\"data:image/svg+xml,<svg><circle cx='5' cy='5' r='5' fill='yellow'/></svg>\")}";
    const {
      decl,
      css: output,
      warnings,
    } = await processWithUpstreamRaws(markRawsAuthoritative(), css);
    assert.deepEqual(warnings, []);
    assert.match(output, /charset=utf-8/v);
    assert.ok(decl?.raws.value);
    assert.equal(decl.raws.value.raw, decl.value);
    assert.equal(decl.raws.value.value, decl.value);
  });

  test('should leave raws.value untouched when the value is unchanged', async () => {
    const css = 'h1{background:url(unicorn.svg)}';
    const {
      decl,
      css: output,
      warnings,
    } = await processWithUpstreamRaws(markRawsAuthoritative(), css);
    assert.deepEqual(warnings, []);
    assert.equal(output, css);
    assert.equal(decl?.raws.value?.raw, decl.value);
    assert.equal(decl?.raws.value?.value, decl.value);
  });
});
