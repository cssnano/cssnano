import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import litePreset from '../../src/presets/lite.js';
import defaultPreset from '../../src/presets/default.js';
import { testTargets } from '../../../../util/testHelpers.js';

/**
 * @param {string} css
 * @return {Promise<string>}
 */
async function minify(css) {
  const result = await postcss(
    litePreset({ browserslist: { query: testTargets } })
  ).process(css, {
    from: undefined,
  });
  return result.css;
}

// The space after a trailing backslash belongs to the identifier; PostCSS
// stores it in the raws, so whitespace normalization must not trim it.
const cases = [
  ['a selector', 'a\\ {b:c}'],
  ['a keyframes name', '@keyframes fade\\ {from{top:0}}'],
  ['a media prelude', '@media a\\ {a{b:c}}'],
  ['a layer statement name', '@layer a\\ ;'],
  ['a value before !important', 'a{animation:fade\\ !important}'],
];

for (const [name, css] of cases) {
  test(`keeps the space that an escape takes at the end of ${name}`, async () => {
    assert.equal(await minify(css), css);
  });
}

test('trims the whitespace after an escaped backslash, which escapes nothing', async () => {
  assert.equal(await minify('a\\\\ {b:c}'), 'a\\\\{b:c}');
});

test('the lite preset leaves an escaped-space rule in its parsed form', async () => {
  const result = await postcss(
    litePreset({ browserslist: { query: testTargets } })
  ).process('.a\\ {top:0}', { from: undefined });
  assert.equal(result.root.first.selector, '.a\\');
  assert.equal(result.root.first.raws.between, ' ');
});

test('a merged rule with an escaped space has the shape PostCSS parses from its output', async () => {
  const result = await postcss(
    defaultPreset({ browserslist: { query: testTargets } })
  ).process('.a\\ {top:0}.a\\ {color:red}', { from: undefined });
  const reparsed = postcss.parse(result.css).first;
  assert.equal(result.root.first.selector, reparsed.selector);
  assert.equal(result.root.first.raws.between, reparsed.raws.between);
});

test('keeps an escaped tab after a final backslash in lite', async () => {
  const css = '.a\\\t{top:0}';
  assert.equal(await minify(css), css);
});

test('keeps an escaped tab after a final backslash in default', async () => {
  const css = '.a\\\t{top:0}';
  const result = await postcss(
    defaultPreset({ browserslist: { query: testTargets } })
  ).process(css, { from: undefined });
  assert.equal(result.css, css);
});

test('keeps a comment in a selector whose escaped space it also has, with the selector free of it', async () => {
  const result = await postcss(
    litePreset({
      disable: ['discardComments'],
      browserslist: { query: testTargets },
    })
  ).process('.a /*c*/ .b\\ {top:0}', { from: undefined });
  assert.equal(result.css, '.a /*c*/ .b\\ {top:0}');
  assert.equal(result.root.first.selector, '.a  .b\\');
});
