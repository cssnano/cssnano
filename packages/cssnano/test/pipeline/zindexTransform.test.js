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

test('the advanced preset runs zindex in its host plugin, not as a plugin of its own', () => {
  const names = advancedPreset().map((plugin) => plugin.postcssPlugin);
  assert.ok(!names.includes('postcss-zindex'));
});

test('zindex ignores a negative z-index in a @keyframes that discardUnused removed', async () => {
  assert.equal(
    await minify('@keyframes u{0%{z-index:-5}}div{z-index:100}p{z-index:200}'),
    'div{z-index:1}p{z-index:2}'
  );
});

test('zindex keeps every z-index when one of them is negative, since rebasing would reorder them', async () => {
  assert.equal(
    await minify('div{z-index:-1}p{z-index:100}'),
    'div{z-index:-1}p{z-index:100}'
  );
});
