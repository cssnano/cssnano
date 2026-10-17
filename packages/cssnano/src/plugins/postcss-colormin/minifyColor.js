import { colordx as colord, extend } from '@colordx/core';
import hwbPlugin from '@colordx/core/plugins/hwb';
import namesPlugin from '@colordx/core/plugins/names';
import minifierPlugin from '@colordx/core/plugins/minify';
import cssnanoUtils from '#utils';

const { isCSSWhitespace } = cssnanoUtils;

extend(/** @type {any[]} */ ([hwbPlugin, namesPlugin, minifierPlugin]));

/**
 * Performs color value minification if input is a valid CSS color
 *
 * @param {string} input - CSS value
 * @param {import('./index.js').MinifyColorOptions} [options] - object with colordx.minify() options
 * @return {string | undefined}
 */
export function tryMinifyColor(input, options = {}) {
  // The color parser trims whitespace, but at the edge of a decoded token it
  // comes from an escape such as the `\9` hack, so the token is no color.
  if (
    isCSSWhitespace(input.charCodeAt(0)) ||
    isCSSWhitespace(input.charCodeAt(input.length - 1))
  ) {
    return undefined;
  }
  const instance = colord(input);

  if (instance.isValid()) {
    // Try to shorten the string if it is a valid CSS color value
    const minified = instance.minify(options);

    // Fall back to the original input if it's smaller or has equal length
    return minified.length < input.length ? minified : input.toLowerCase();
  }
}

/**
 * Performs color value minification
 *
 * @param {string} input - CSS value
 * @param {import('./index.js').MinifyColorOptions} [options] - object with colordx.minify() options
 * @return {string}
 */
function minifyColor(input, options = {}) {
  return tryMinifyColor(input, options) ?? input;
}

export default minifyColor;
