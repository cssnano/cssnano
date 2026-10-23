import assert from 'node:assert/strict';
import { test } from 'node:test';
import postcss from 'postcss';
import preset from '../../../src/presets/default.js';
import { repositoryFile } from '../../../../../util/testHelpers.js';

/**
 * @param {string} css
 * @return {Promise<string>}
 */
async function minify(css) {
  const result = await postcss(preset()).process(css, {
    from: repositoryFile,
  });
  return result.css;
}

test('keeps an existing charset when a top-level rule keeps non-ASCII text', async () => {
  const css = '@charset "windows-1251";a{content:"©"}';

  assert.equal(await minify(css), css);
});

test('drops an existing charset when its only non-ASCII text is in an empty rule that discardEmpty removes', async () => {
  assert.equal(
    await minify('@charset "utf-8";é{}a{color:red}'),
    'a{color:red}'
  );
});

test('discards an at-rule whose only child is a nested charset', async () => {
  assert.equal(
    await minify('@media print{@charset "utf-8";}a{color:red}'),
    'a{color:red}'
  );
});

test('discards a rule whose only child is a nested charset', async () => {
  assert.equal(
    await minify('a{@charset "utf-8";}b{color:red}'),
    'b{color:red}'
  );
});

test('moves a nested charset to the top and discards the at-rule it leaves empty', async () => {
  assert.equal(
    await minify('@media print{a{}@charset "x";}b{content:"é"}'),
    '@charset "x";b{content:"é"}'
  );
});
