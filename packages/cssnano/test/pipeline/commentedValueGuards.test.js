import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import defaultPreset from '#presets/default';

/**
 * Runs the default preset with discardComments disabled, so comments stay in
 * the raws of the values, and returns the output.
 *
 * @param {string} css
 * @param {object} [options]
 * @returns {Promise<string>}
 */
async function minifyKeepingComments(css, options) {
  const result = await postcss(
    defaultPreset({ disable: ['discardComments'], options })
  ).process(css, { from: undefined });
  return result.css;
}

describe('a commented value under the default preset with discardComments disabled', () => {
  test('a @charset stays when a value in the stylesheet holds a non-ASCII comment', async () => {
    const css = await minifyKeepingComments(
      '@charset "utf-8";a{top:0 /*é*/;color:red}'
    );
    assert.ok(css.startsWith('@charset "utf-8";'), css);
  });

  test('normalizeCharset add gives a stylesheet with a non-ASCII comment in a !important value a @charset', async () => {
    const css = await minifyKeepingComments('a{color:red /*é*/ !important}', {
      normalizeCharset: { add: true },
    });
    assert.ok(css.startsWith('@charset "utf-8";'), css);
  });
});
