'use strict';
const { colordx: colord, extend } = require('@colordx/core');
const namesPlugin = require('@colordx/core/plugins/names');
const minifierPlugin = require('@colordx/core/plugins/minify');

extend(/** @type {any[]} */ ([namesPlugin, minifierPlugin]));

/**
 * Performs color value minification
 *
 * @param {string} input - CSS value
 * @param {import('./index.js').MinifyColorOptions} options - object with colordx.minify() options
 * @return {string}
 */
module.exports = function minifyColor(input, options = {}) {
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
};
