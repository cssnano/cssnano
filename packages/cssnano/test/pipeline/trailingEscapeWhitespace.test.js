import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import litePreset from '../../src/presets/lite.js';
import { repositoryFile } from '../../../../util/testHelpers.js';

/**
 * @param {string} css
 * @return {Promise<string>}
 */
async function minify(css) {
  const result = await postcss(litePreset()).process(css, {
    from: repositoryFile,
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
