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

test('zindex keeps an important comment in a value it rewrites', async () => {
  assert.equal(
    await minify('div{z-index:/*!keep*/ 100}p{z-index:200}'),
    'div{z-index:/*!keep*/1}p{z-index:2}'
  );
});

test('zindex drops a plain comment in a value it rewrites', async () => {
  assert.equal(
    await minify('div{z-index:/*drop*/ 100}p{z-index:200}'),
    'div{z-index:1}p{z-index:2}'
  );
});

for (const [name, value] of [
  ['two integers', '100 200'],
  ['an integer and an identifier', '5 a'],
  ['two integers split by an important comment', '1/*!keep*/2'],
]) {
  test(`zindex leaves ${name} as written, since the declaration is invalid and rewriting would make it valid`, async () => {
    assert.equal(
      await minify(`div{z-index:${value}}p{z-index:200}`),
      `div{z-index:${value}}p{z-index:1}`
    );
  });
}
