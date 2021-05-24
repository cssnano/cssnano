import { process } from './lib/color';
import getShortestString from './lib/getShortestString';

/**
 * Performs color value minification
 *
 * @param {string} input - CSS value
 * @param {boolean} options.supportsAlphaHex - Does the browser support 4 & 8 character hex notation
 * @param {boolean} options.supportsTransparent – Does the browser support "transparent" value properly
 */
export default (input, options = {}) => {
  const instance = process(input);

  if (instance.isValid()) {
    // Try to shorten the string if it is a valid CSS color value.
    // Fall back to the original input if it's smaller or has equal length/
    return getShortestString([input, instance.toShortString(options)]);
  } else {
    // Possibly malformed, so pass through
    return input;
  }
};
