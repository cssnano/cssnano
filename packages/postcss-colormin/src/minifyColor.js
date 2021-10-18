import { colord, extend } from 'colord';
import namesPlugin from 'colord/plugins/names';
import minifierPlugin from 'colord/plugins/minify';

extend([namesPlugin, minifierPlugin]);

/**
 * Performs color value minification
 *
 * @param {string} input - CSS value
 * @param {boolean} options.supportsAlphaHex - Does the browser support 4 & 8 character hex notation
 * @param {boolean} options.supportsTransparent – Does the browser support "transparent" value properly
 */
export default function minifyColor(input, options = {}) {
  const settings = {
    supportsAlphaHex: false,
    supportsTransparent: true,
    ...options,
  };

  const instance = colord(input);

  if (instance.isValid()) {
    // Try to shorten the string if it is a valid CSS color value.
    const minified = instance.minify({
      alphaHex: settings.supportsAlphaHex,
      transparent: settings.supportsTransparent,
      name: true,
    });

    // Fall back to the original input if it's smaller or has equal length/
    return minified.length < input.length ? minified : input;
  } else {
    // Possibly malformed, so pass through
    return input;
  }
}
