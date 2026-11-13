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

// The value spells the important comment, which the name the keyframes list
// matches leaves out, so the keyframes stays and is renamed with the value.
test('discardUnused keeps a @keyframes that a value references beside an important comment', async () => {
  assert.equal(
    await minify(
      '@keyframes fade{from{opacity:0}to{opacity:1}}a{animation-name:/*!x*/fade}'
    ),
    '@keyframes a{0%{opacity:0}to{opacity:1}}a{animation-name:/*!x*/a}'
  );
});

// A reference inside a removed keyframes body still keeps the keyframes it names.
test('discardUnused keeps a @keyframes that an unused @keyframes inside an emptied @media references', async () => {
  assert.equal(
    await minify(
      '@keyframes b{from{top:0}}@media print{@keyframes a{from{animation:b 1s}}}'
    ),
    '@keyframes b{0%{top:0}}'
  );
});

// PostCSS strips a comment from a name without adding a space, so `fade/*c*/x` names `fadex`.
test('discardUnused treats a comment inside a keyframes name as removed without a space', async () => {
  assert.equal(
    await minify('@keyframes fade/*c*/x{from{top:0}}a{animation-name:fade}'),
    'a{animation-name:fade}'
  );
});

// PostCSS trims the name it compares, so the comments and spaces around it do not stop the match.
test('discardUnused matches a keyframes name written with spaces and comments around it', async () => {
  assert.equal(
    await minify(
      '@keyframes  fade /*c*/ {from{top:0}}a{animation-name: /*c*/fade}'
    ),
    '@keyframes a{0%{top:0}}a{animation-name:a}'
  );
});

test('discardUnused removes each emptied @media, reporting one removal for each', async () => {
  const result = await postcss(advancedPreset()).process(
    'a{top:0}@media print{@keyframes a{0%{top:0}}}@media print{@keyframes b{0%{top:0}}}',
    { from: undefined }
  );
  assert.equal(result.css, 'a{top:0}');
  assert.deepEqual(
    result.messages.map((message) => [message.type, message.plugin]),
    [
      ['removal', 'postcss-discard-empty'],
      ['removal', 'postcss-discard-empty'],
    ]
  );
  assert.ok(result.messages.every(({ node }) => node.name === 'media'));
});

test('discardUnused reports no removal when discardEmpty is disabled', async () => {
  const result = await postcss(
    advancedPreset({ disable: ['discardEmpty'] })
  ).process('@media print{@keyframes a{0%{top:0}}}', { from: undefined });
  assert.equal(result.css, '@media print{}');
  assert.deepEqual(result.messages, []);
});
