import { colordx as colord, extend } from '@colordx/core';
import hwbPlugin from '@colordx/core/plugins/hwb';
import namesPlugin from '@colordx/core/plugins/names';
import minifierPlugin from '@colordx/core/plugins/minify';

extend(/** @type {any[]} */ ([hwbPlugin, namesPlugin, minifierPlugin]));

/**
 * Performs color value minification
 *
 * @param {string} input - CSS value
 * @param {import('./index.js').MinifyColorOptions} options - object with colordx.minify() options
 * @return {string}
 */
function minifyColor(input, options = {}) {
  const instance = colord(input);

  if (instance.isValid()) {
    // Try to shorten the string if it is a valid CSS color value
    const minified = instance.minify(options);

    // Fall back to the original input if it's smaller or has equal length
    return minified.length < input.length ? minified : input.toLowerCase();
  } else {
    // Possibly malformed, so pass through
    return input;
  }
}

export default minifyColor;
